import json
import asyncio
import httpx
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI, Timeout
from database.db import get_db


# v3.61.170: 统一的 AsyncOpenAI 工厂 — 强制 trust_env=False,
#   防 OpenAI SDK 内部 httpx client 读 HTTP_PROXY/HTTPS_PROXY 环境变量被代理软件污染
#   跟 _call_gemini_native / probe-models / image_service 路径同源
# v3.61.170 codex 复审:返回的是裸 AsyncOpenAI(内含自定义 httpx.AsyncClient),
#   ★ 调用方必须 try/finally 调 await client.close()(SDK 默认有 __del__ 兜底,
#   但自定义 httpx 没;高频调用会泄漏连接池)
def _make_openai_client(base_url: str, api_key: str, timeout, **kwargs) -> AsyncOpenAI:
    base_url = require_trusted_model_url(base_url)
    http_client = httpx.AsyncClient(
        timeout=timeout,
        trust_env=False,
    )
    return AsyncOpenAI(
        base_url=base_url,
        api_key=api_key,
        timeout=timeout,
        http_client=http_client,
        **kwargs,
    )
from models.llm_configs import LLMConfigCreate, LLMConfigUpdate
from services.model_presets import get_model_preset
from services.log_service import LogService
from services.offline_guard import cloud_enabled
from services.trusted_providers import require_trusted_model_url
from services.secure_secrets import decrypt_secret, encrypt_secret, is_encrypted_secret
from utils.timezone import now_beijing_str
from utils.ssl_helper import get_aiohttp_connector

import os as _os
import time as _time
import uuid as _uuid
import logging as _logging

# ============================================================
# v3.61.x: 分镜 LLM 走 admin 自建中转(轻代理)。
# 原直连逻辑完全保留;仅 storyboard_generate + admin 云端开关开 时旁路走代理,
# 代理任何失败都自动回退原直连(详见 call_llm 内分叉)。
# ============================================================
_ADMIN_PROXY_URL = _os.getenv("ADMIN_SERVER_URL") or "https://xiaoshuo.qianshanai.cn"
# admin 开关缓存:避免每次分镜都打 admin
_proxy_enabled_cache = {"value": False, "exp": 0.0}
_PROXY_ENABLED_TTL = 60  # 秒
_proxy_logger = _logging.getLogger(__name__)

# 分镜通常需要一次返回多个场景小节。旧配置的 4096 会在长剧本上稳定截断，
# 但不能把这个上限套到小上下文模型上；仅对上下文足够大的分镜配置做保守提升。
_STORYBOARD_OUTPUT_TOKEN_FLOOR = 24576


def _effective_storyboard_max_tokens(config: dict, task_type: str,
                                     requested: Optional[int]) -> Optional[int]:
    """给长分镜调用补足过低的历史默认值，显式参数优先。"""
    configured = config.get("max_tokens")
    if requested is not None:
        return requested
    if task_type != "storyboard_generate":
        return configured
    if configured is None:
        configured = _STORYBOARD_OUTPUT_TOKEN_FLOOR
    try:
        configured = int(configured)
    except (TypeError, ValueError):
        return configured
    try:
        context_window = int(config.get("context_window") or 0)
    except (TypeError, ValueError):
        context_window = 0
    if configured >= _STORYBOARD_OUTPUT_TOKEN_FLOOR or context_window < 32768:
        return configured
    # 留出输入上下文，避免把小于 32K 的模型推到边界；DeepSeek 的本地配置
    # 是 131K 上下文，因此这里会从历史 4096 自动提升到 24576。
    return min(_STORYBOARD_OUTPUT_TOKEN_FLOOR, max(256, context_window - 8192))


class _ProxyHardError(Exception):
    """代理任何失败都用它:报错让用户重试,绝不回退直连。
    原因:① 护模板(直连会把分镜 prompt 模板从客户端裸发上游)
          ② 已提交后回退还会双调用双计费。"""
    pass


async def _is_llm_proxy_enabled() -> bool:
    """拉 admin 云端开关(带 60s 缓存)。任何异常 → 视为关(走直连)。"""
    now = _time.time()
    if _proxy_enabled_cache["exp"] > now:
        return _proxy_enabled_cache["value"]
    enabled = False
    try:
        async with httpx.AsyncClient(timeout=5.0, trust_env=False) as client:
            resp = await client.get(f"{_ADMIN_PROXY_URL.rstrip('/')}/api/llm-proxy/enabled")
        if resp.status_code == 200:
            enabled = bool(resp.json().get("enabled"))
    except Exception:
        enabled = False
    _proxy_enabled_cache["value"] = enabled
    _proxy_enabled_cache["exp"] = now + _PROXY_ENABLED_TTL
    return enabled


async def _call_llm_via_admin_proxy(config: dict, messages: list,
                                    temperature, max_tokens, task_type: str,
                                    assemble_payload: dict = None):
    """经 admin 代理调上游。成功返回 (content, input_tokens, output_tokens, total_tokens)。
    ⚠️ 模板 IP 保护:代理开启时一律不回退直连(直连会把分镜 prompt 模板从客户端裸发上游)。
    任何失败都抛 _ProxyHardError,由调用方报错让用户重试,绝不直连。
    assemble_payload: 预置分镜模板服务端拼装模式 — 传它则不发 messages(模板明文不出客户端),
                      由 admin 用 template_admin_id 读模板拼 prompt。
    """
    from services import cloud_token_service as _cts
    # 鉴权:用隔壁登录态 token。没 token 也不直连(护模板)→ 报错。
    try:
        access_token = await _cts.get_access_token()
    except Exception as e:
        raise _ProxyHardError(f"无登录 token,代理不可用且不回退直连(护模板): {e}")

    api_style = (config.get("api_style") or "").lower()
    proxy_style = "gemini_native" if api_style == "gemini_native" else "openai"

    # extra_params 与直连同源(thinking/top_p/top_k/safety/reasoning 等)
    try:
        extra_params = json.loads(config.get("extra_params", "{}")) or {}
    except Exception:
        extra_params = {}

    # 当前登录用户 id(给 admin 监控按用户定位问题;拿不到则 None)
    try:
        _uid = _cts.get_user_id()
    except Exception:
        _uid = None

    submit_body = {
        "access_token": access_token,
        "client_task_id": f"xiaoshuotool:{_uuid.uuid4().hex}",
        "user_id": _uid,
        "api_key": config.get("api_key") or "",
        "base_url": config.get("base_url") or "",
        "model": config.get("model_name") or "",
        "provider_code": config.get("provider_code") or "",
        "api_style": proxy_style,
        "task_type": task_type,
        "extra_params": extra_params,
    }
    # 预置分镜模板:服务端拼装(模板明文不出客户端);否则旧模式发整包 messages
    if assemble_payload:
        submit_body["assemble"] = assemble_payload
    else:
        submit_body["messages"] = messages
    # 参数解析与直连路径对齐:
    #  - openai 分支:temperature/max_tokens 缺省取 config(直连 OpenAI 主分支行为)
    #  - gemini 分支:保持 None,由 admin 复刻 _call_gemini_native 默认(temp 0.7 / maxToken floor)
    if proxy_style == "openai":
        _temp = temperature if temperature is not None else config.get("temperature")
        _mt = max_tokens if max_tokens is not None else config.get("max_tokens")
    else:
        _temp = temperature
        _mt = max_tokens
    if _temp is not None:
        submit_body["temperature"] = _temp
    if _mt is not None:
        submit_body["max_tokens"] = _mt

    base = _ADMIN_PROXY_URL.rstrip("/")
    auth_headers = {"Authorization": f"Bearer {access_token}"}

    # ---- 提交阶段 ----
    # ⚠️ 模板 IP 保护:代理开启时绝不回退直连(直连会把分镜 prompt 模板从客户端裸发上游中转,
    #    正是走云端要避免的)。提交失败 → 重试几次,仍失败 → _ProxyHardError 报错让用户重试,
    #    宁可本次生成失败,也不让模板泄露。
    task_id = None
    _submit_err = ""
    for _attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
                r = await client.post(f"{base}/api/llm-tasks", json=submit_body)
            if r.status_code == 200:
                task_id = (r.json().get("data") or {}).get("taskId")
                if task_id:
                    break
                _submit_err = "提交无 taskId"
            else:
                _submit_err = f"提交 HTTP {r.status_code}: {r.text[:200]}"
        except Exception as e:
            _submit_err = f"提交请求失败: {e}"
        if _attempt < 2:
            await asyncio.sleep(3)
    if not task_id:
        raise _ProxyHardError(f"代理提交失败(已重试),为保护模板不回退直连: {_submit_err}")

    # ---- 轮询阶段(已拿 taskId → 任何失败都不回退直连,防双调用)----
    # 时限要比 admin→上游超时(LLM_PROXY_UPSTREAM_TIMEOUT=600s)大,留 60s 余量,
    # 否则上游跑满 600s 时桌面端可能在 admin 落库前一刻先判超时 → 成功被误判失败+白计费。
    deadline = _time.time() + 660
    poll_http_fail = 0
    await asyncio.sleep(2)
    async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
        while _time.time() < deadline:
            try:
                pr = await client.get(f"{base}/api/llm-tasks/{task_id}", headers=auth_headers)
            except Exception as e:
                # 网络抖动:重试几次,绝不回退直连(任务可能正在跑)
                poll_http_fail += 1
                if poll_http_fail > 5:
                    raise _ProxyHardError(f"轮询网络持续失败: {e}")
                await asyncio.sleep(3)
                continue
            if pr.status_code != 200:
                poll_http_fail += 1
                if poll_http_fail > 5:
                    raise _ProxyHardError(f"轮询 HTTP {pr.status_code} 持续失败")
                await asyncio.sleep(3)
                continue
            poll_http_fail = 0
            d = pr.json().get("data") or {}
            status = d.get("status")
            if status == "success":
                usage = d.get("usage") or {}
                return (d.get("content") or "",
                        int(usage.get("inputTokens") or 0),
                        int(usage.get("outputTokens") or 0),
                        int(usage.get("totalTokens") or 0))
            if status in ("failed", "cancelled"):
                raise _ProxyHardError(
                    f"任务{status}: {d.get('errorCode')} {d.get('errorMessage')}")
            await asyncio.sleep(3)
    raise _ProxyHardError("轮询超时(660s)")


class LLMService:

    @staticmethod
    def _local_row_to_config(row, *, mask_key: bool = False) -> Dict[str, Any]:
        """Adapt a local llm_configs SQLite row to the legacy service shape."""
        config = dict(row)
        config["api_key"] = decrypt_secret(config.get("api_key") or "")
        config["extra_params"] = config.get("extra_params") or "{}"
        config["api_style"] = "auto"
        config["provider_code"] = "deepseek" if "deepseek" in (config.get("base_url") or "").lower() else "openai_compat"
        if mask_key:
            key = config.get("api_key") or ""
            config["api_key"] = f"{key[:4]}****{key[-4:]}" if len(key) > 8 else "********"
        return config

    @staticmethod
    def to_public_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Return a UI-safe config shape without a reusable provider key."""
        public = dict(config)
        key = public.get("api_key") or ""
        public["api_key"] = f"{key[:4]}****{key[-4:]}" if len(key) > 8 else "********"
        return public

    @staticmethod
    async def migrate_local_api_keys() -> int:
        """Upgrade legacy plaintext provider keys in place using Windows DPAPI."""
        db = await get_db()
        changed = 0
        try:
            cursor = await db.execute("SELECT id, api_key FROM llm_configs")
            for row in await cursor.fetchall():
                key = row["api_key"] or ""
                if key and not is_encrypted_secret(key):
                    await db.execute(
                        "UPDATE llm_configs SET api_key = ? WHERE id = ?",
                        (encrypt_secret(key), row["id"]),
                    )
                    changed += 1
            if changed:
                await db.commit()
            return changed
        finally:
            await db.close()

    @staticmethod
    async def _get_local_by_id(config_id: int) -> Optional[Dict[str, Any]]:
        db = await get_db()
        try:
            cursor = await db.execute("SELECT * FROM llm_configs WHERE id = ?", (config_id,))
            row = await cursor.fetchone()
            return LLMService._local_row_to_config(row) if row else None
        finally:
            await db.close()

    @staticmethod
    async def _get_local_all(config_type: Optional[str]) -> List[Dict[str, Any]]:
        db = await get_db()
        try:
            if config_type:
                cursor = await db.execute(
                    "SELECT * FROM llm_configs WHERE config_type = ? ORDER BY id DESC",
                    (config_type,),
                )
            else:
                cursor = await db.execute("SELECT * FROM llm_configs ORDER BY id DESC")
            rows = await cursor.fetchall()
            return [LLMService._local_row_to_config(row, mask_key=True) for row in rows]
        finally:
            await db.close()

    # ==================== 错误友好翻译(各分支共用) ====================
    @staticmethod
    def _friendly_llm_error(e) -> str:
        """把 LLM 服务/中转的异常翻译成友好中文提示。
        v3.59.59 重构:从 OpenAI 分支抽出来,Gemini 原生分支也用同一套翻译,
        避免之前 Gemini 原生 403 报错直接抛 RuntimeError 给用户(不友好)。
        """
        raw = f"{type(e).__name__}: {str(e)}"
        lower = raw.lower()
        if 'prohibited_content' in lower or 'prompt_blocked' in lower:
            return ("Gemini 内容安全过滤拒绝了本次请求(PROHIBITED_CONTENT)。"
                    "可能触发:血腥/暴力/情色/未成年/敏感政治词。请修改输入内容"
                    "(小说原文或模板提示词),替换相关词汇后重试。")
        if 'insufficient_user_quota' in lower or 'new_api_error' in lower:
            # new-api 中转特有:可能是分组配额耗尽 / 渠道权限受限,主账号余额未必真没了
            return (f"中转拒绝调用:{str(e)[:300]}\n"
                    "说明:这是中转的提示,常见原因:1) 分组配额耗尽(主账户有钱,但当前分组没了)"
                    "2) 渠道权限受限 / 模型路由问题 3) 中转账户切换/计费 bug。"
                    "请到中转后台(如灵芽 / new-api 控制台)查看分组余额和渠道路由,或联系中转客服。")
        if 'insufficient_quota' in lower or 'insufficient balance' in lower or 'billing' in lower or '402' in lower:
            return "API 账户余额不足或额度已用完,请充值后重试。"
        if '401' in lower or 'unauthorized' in lower or 'invalid api key' in lower:
            return 'API Key 无效或已失效,请到"模型API配置"检查密钥是否正确。'
        if '429' in lower or 'rate limit' in lower or 'too many requests' in lower:
            return "调用过于频繁触发服务商限流,请稍候 1-2 分钟再试。"
        if '404' in lower or 'model not found' in lower:
            return "模型不存在或接口地址错误,请检查配置中的 model_name 和 base_url。"
        if '502' in lower or '503' in lower or 'bad gateway' in lower:
            return "服务商网关临时故障(502/503),请稍后重试。"
        if 'connection' in lower or 'network' in lower:
            return "网络连接异常,请检查网络或 API 地址。"
        return raw  # 没匹配到 → 用原始

    # ==================== 速创 API (wuyinkeji) 文本对话 ====================
    @staticmethod
    def _flatten_messages_to_content(messages: List[Dict[str, str]]) -> str:
        """把 OpenAI 风格 messages 数组拍平成单个 content 字符串(速创接口只接单字段)。
        系统消息用 [系统] 前缀,用户消息直接拼,助手消息用 [助手] 前缀,保留多轮上下文。
        """
        parts = []
        for m in messages:
            role = (m.get("role") or "user").lower()
            content = m.get("content") or ""
            if isinstance(content, list):
                # 多模态消息(有 image_url 等),提取其中的 text 部分
                text_parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
                content = "\n".join(text_parts)
            content = str(content).strip()
            if not content:
                continue
            if role == "system":
                parts.append(f"[系统]\n{content}")
            elif role == "assistant":
                parts.append(f"[助手]\n{content}")
            else:
                parts.append(content)
        return "\n\n".join(parts)

    @staticmethod
    async def _call_wuyinkeji_chat(
        base_url: str,
        api_key: str,
        model: str,
        messages: List[Dict[str, str]],
        timeout: float = 180.0,
    ) -> tuple[str, int, int]:
        """速创 API(/api/chat/index) 文本对话调用。
        特点:
        - form-urlencoded 请求体
        - 不支持 messages 数组,只支持单个 content 字符串(我们自己拍平)
        - 响应 {code:0, msg, data:'...'} 不标准 OpenAI
        - token 使用量不返回,返回 (0, 0)
        """
        import aiohttp

        base_url = require_trusted_model_url(base_url or "https://api.wuyinkeji.com")
        url = f"{base_url}/api/chat/index"

        content_str = LLMService._flatten_messages_to_content(messages)

        # 从 messages 里找是否有 image_url(多模态支持)
        image_url = None
        for m in messages:
            c = m.get("content")
            if isinstance(c, list):
                for item in c:
                    if isinstance(item, dict) and item.get("type") == "image_url":
                        u = item.get("image_url")
                        if isinstance(u, dict):
                            image_url = u.get("url")
                        else:
                            image_url = u
                        break
            if image_url:
                break

        form_data = {
            "content": content_str,
            "model": model or "gemini-2.5-flash",
            "stream": "false",
        }
        if image_url:
            form_data["image_url"] = image_url

        headers = {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "Authorization": api_key,
        }

        timeout_cfg = aiohttp.ClientTimeout(total=timeout, connect=30)
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=timeout_cfg) as session:
            async with session.post(url, data=form_data, headers=headers) as resp:
                resp_text = await resp.text()
                if resp.status != 200:
                    raise RuntimeError(f"速创 LLM HTTP {resp.status}: {resp_text[:500]}")
                try:
                    data = json.loads(resp_text)
                except Exception:
                    raise RuntimeError(f"速创 LLM 响应非 JSON: {resp_text[:500]}")
                code = data.get("code")
                if code not in (0, 200):
                    msg = data.get("msg") or data.get("message") or "未知错误"
                    raise RuntimeError(f"速创 LLM 失败: code={code} msg={msg}")
                # data 字段可能是两种格式:
                # 1) 字符串:简单响应(Gemini 2.5 系列)
                # 2) 对象:OpenAI 兼容格式 {choices:[{message:{content:'...'}}], usage:{...}} (Gemini 3 Pro)
                raw_data = data.get("data")
                response_text = ""
                input_tokens = 0
                output_tokens = 0
                if isinstance(raw_data, str):
                    response_text = raw_data
                elif isinstance(raw_data, dict):
                    # OpenAI 格式:从 choices 里取 content
                    choices = raw_data.get("choices") or []
                    if choices and isinstance(choices, list):
                        msg_obj = choices[0].get("message") or {}
                        response_text = msg_obj.get("content") or ""
                        # 去掉 <think>...</think> 思考块(某些推理模型会包裹)
                        # 但如果剥离后为空(模型 max_tokens 被思考吃光),保留原始内容作为 fallback
                        if response_text and "<think>" in response_text:
                            import re as _re
                            stripped = _re.sub(r'<think>.*?</think>', '', response_text, flags=_re.DOTALL).strip()
                            # 如果有完整闭合 think 且剥离后还有内容,用剥离后的
                            if stripped:
                                response_text = stripped
                            else:
                                # 剥离后空 → 可能是未闭合 think 或全是思考没答案
                                # 保留原文,至少能看到出了什么
                                # 同时把 <think> 标签去掉让输出更干净
                                response_text = _re.sub(r'</?think>', '', response_text).strip()
                    # token 使用量(如果有)
                    usage = raw_data.get("usage") or {}
                    input_tokens = usage.get("prompt_tokens", 0) or 0
                    output_tokens = usage.get("completion_tokens", 0) or 0
                else:
                    response_text = str(raw_data) if raw_data else ""
                return response_text, input_tokens, output_tokens

    @staticmethod
    async def _call_gemini_native(
        base_url: str,
        api_key: str,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        extra_params: Dict[str, Any],
        timeout: float = 300.0,
    ):
        """调用 Gemini 原生 generateContent 端点。
        关键作用:thinkingConfig.thinkingBudget=0 禁用思考 token,让 output 能吐满。

        base_url: 如 https://api.lingyaai.cn/v1 (会自动兼容尾部 /v1 和不带)
        model: 如 gemini-3.1-pro-preview
        messages: OpenAI 格式 [{"role":"user","content":"..."}]
        extra_params: 其中可覆盖 thinking_budget / top_k / top_p / safety_settings
        返回: (content, input_tokens, output_tokens)
        """
        import httpx

        # 规范化 base_url:去掉末尾 /v1 /v1beta /
        url_base = require_trusted_model_url(base_url)
        for suffix in ("/v1beta", "/v1"):
            if url_base.endswith(suffix):
                url_base = url_base[: -len(suffix)]
                break

        # Gemini 原生严格按 Google 协议:鉴权用 ?key=API_KEY query,不用 header
        from urllib.parse import quote as _urlquote
        url = f"{url_base}/v1beta/models/{model}:generateContent?key={_urlquote(api_key, safe='')}"

        # OpenAI messages → Gemini contents
        # system role 合并为第 1 条 user 前置(Gemini 支持 systemInstruction,但兼容中转的最稳做法)
        # ★ 修复(v3.59.44):content 可能是 OpenAI 多模态 list 形式
        # [{"type":"text","text":"..."},{"type":"image_url",...}]
        # 之前直接把整个 list 塞到 parts[0].text → 灵芽/new-api 网关返
        # `json: cannot unmarshal array into Go struct field ***.text of type string` HTTP 500
        # 这里只取 type=="text" 拼字符串(image_url 暂不支持,需要的话以后走 Gemini inlineData)
        def _content_to_text(c) -> str:
            if isinstance(c, list):
                parts_text = [
                    str(item.get("text", "") or "")
                    for item in c
                    if isinstance(item, dict) and item.get("type") == "text"
                ]
                return "\n".join(p for p in parts_text if p)
            return str(c) if c is not None else ""

        contents = []
        system_texts = []
        for m in messages:
            role = m.get("role", "user")
            text = _content_to_text(m.get("content", ""))
            if role == "system":
                system_texts.append(text)
                continue
            # assistant → model
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({"role": gemini_role, "parts": [{"text": text}]})

        # 从 extra_params 读覆盖项(都是可选)
        # Gemini 3 系列(gemini-3/3.1):只支持 thinkingLevel (low/medium/high),不能完全禁用
        # Gemini 2.5 系列:支持 thinkingBudget 整数(0=禁用)
        # 默认 3.1 用 low(约 1024 thinking token,给可见输出留最多空间)
        thinking_level = extra_params.get("thinking_level") or extra_params.get("thinkingLevel")
        thinking_budget = extra_params.get("thinking_budget") or extra_params.get("thinkingBudget")
        top_p = extra_params.get("top_p")
        top_k = extra_params.get("top_k")
        safety = extra_params.get("safety_settings")

        # max_tokens 从配置或默认 60000(给 Gemini 3 思考+输出留足空间)
        effective_max_tokens = int(max_tokens) if max_tokens else 60000
        if effective_max_tokens < 10000:
            # Gemini 3 思考至少占 1-8K,如果用户只设 4K 输出,强制拉到 30K 避免截断
            effective_max_tokens = 30000

        # thinkingConfig:自动按模型选字段
        model_lower = model.lower()
        is_gemini3 = "gemini-3" in model_lower
        thinking_config = {}
        if thinking_level:
            thinking_config["thinkingLevel"] = str(thinking_level).lower()
        elif thinking_budget is not None:
            thinking_config["thinkingBudget"] = int(thinking_budget)
        else:
            # 默认:Gemini 3 用 low,Gemini 2.5 用 0
            if is_gemini3:
                thinking_config["thinkingLevel"] = "low"
            else:
                thinking_config["thinkingBudget"] = 0

        generation_config = {
            "maxOutputTokens": effective_max_tokens,
            "temperature": float(temperature if temperature is not None else 0.7),
            "thinkingConfig": thinking_config,
        }
        if top_p is not None:
            generation_config["topP"] = float(top_p)
        if top_k is not None:
            generation_config["topK"] = int(top_k)

        payload = {
            "contents": contents,
            "generationConfig": generation_config,
        }
        if system_texts:
            payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_texts)}]}
        if safety:
            payload["safetySettings"] = safety

        # key 走 ?key= query,header 只需 Content-Type
        headers = {
            "Content-Type": "application/json",
        }

        print(f"[DEBUG gemini-native] POST {url}", flush=True)
        print(f"[DEBUG gemini-native] maxOutputTokens={generation_config['maxOutputTokens']}, thinkingConfig={thinking_config}", flush=True)

        # 多层超时保护:httpx 各阶段超时 + 外层 asyncio.wait_for 硬总时长
        # 避免网关 keep-alive 慢吐响应 / 卡在 thinking 阶段导致 log 永远停在 running
        total_hard_timeout = timeout + 60.0  # 总时长上限
        httpx_to = httpx.Timeout(
            connect=15.0,
            read=timeout,
            write=30.0,
            pool=10.0,
        )
        # v3.61.170:trust_env=False 强制不读 HTTP_PROXY/HTTPS_PROXY 环境变量 + Windows 系统代理
        # 历史撞过 — image_service.py 早就全部 trust_env=False(commit 见 grep);
        # 这条 llm_service Gemini 原生路径漏了 → 用户开 Clash/V2Ray 全局代理且没把
        # gemini.googleapis.com / lingyaai.cn / openai.com 加白名单时,httpx 会经过代理
        # 失败抛 ConnectError → 前端报"网络连接异常,请检查网络或 API 地址"
        # 网页能通 = 浏览器有智能 PAC 规则,工具的 httpx 没有 → 一刀切走代理炸
        async with httpx.AsyncClient(timeout=httpx_to, trust_env=False) as client:
            try:
                resp = await asyncio.wait_for(
                    client.post(url, headers=headers, json=payload),
                    timeout=total_hard_timeout,
                )
            except asyncio.TimeoutError:
                raise TimeoutError(f"Gemini 原生接口调用超时(超过 {total_hard_timeout}s 无响应)")
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini 原生接口 HTTP {resp.status_code}: {resp.text[:500]}")
            data = resp.json()

        # 解析响应
        candidates = data.get("candidates") or []
        if not candidates:
            # 可能被 promptFeedback 拦截
            pf = data.get("promptFeedback") or {}
            if pf.get("blockReason"):
                raise RuntimeError(f"Gemini 拒绝请求: {pf.get('blockReason')}")
            raise RuntimeError(f"Gemini 原生接口返回无 candidates: {json.dumps(data, ensure_ascii=False)[:500]}")

        cand0 = candidates[0]
        finish_reason = cand0.get("finishReason", "")
        parts = (cand0.get("content") or {}).get("parts") or []
        content = "".join(p.get("text", "") for p in parts if isinstance(p, dict))

        # 空响应 + SAFETY 报错
        if (not content or not content.strip()) and finish_reason in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"):
            raise RuntimeError(f"Gemini 内容安全过滤(finishReason={finish_reason})")

        usage = data.get("usageMetadata") or {}
        input_tokens = usage.get("promptTokenCount", 0)
        output_tokens = usage.get("candidatesTokenCount", 0)

        print(f"[DEBUG gemini-native] finish={finish_reason}, in={input_tokens}, out={output_tokens}, content_len={len(content)}", flush=True)
        return content, input_tokens, output_tokens

    @staticmethod
    async def get_all(config_type: str = None):
        """获取所有配置,按类型筛选。
        v3.59.60:云端化 — 直接拉云端;不再读本地 sqlite。
        v3.59.60 修补:catch 任何异常都返空列表 + 记日志,不让 API 5xx 冒泡。
        v3.59.75:登录失效类异常向上抛(API 层兜成 401 业务码,前端弹提示让用户重启工具)。
                 其它网络抖动 / JSON 解析错继续吞掉返空,避免误打扰。
        """
        if not cloud_enabled():
            return await LLMService._get_local_all(config_type)

        from services import cloud_llm_sync
        import logging
        try:
            items = await cloud_llm_sync.list_configs(config_type or "llm")
        except RuntimeError as e:
            # 登录失效是用户能 fix 的异常,必须暴露出来
            msg = str(e)
            if "登录已失效" in msg or "登录已" in msg:
                logging.getLogger(__name__).warning(
                    f"[LLMService.get_all] 云端登录失效 type={config_type}: {e}"
                )
                raise
            # 其它 RuntimeError(业务码非 200 等)继续吞
            logging.getLogger(__name__).warning(
                f"[LLMService.get_all] 云端业务错 type={config_type}: {e}"
            )
            return []
        except Exception as e:
            # 网络抖动 / JSON 解析错 / HTTP 4xx 5xx → 静默返空,不打扰用户
            logging.getLogger(__name__).warning(
                f"[LLMService.get_all] 云端拉配置失败 type={config_type} ({type(e).__name__}): {e}"
            )
            return []

        # 云端 dict (camelCase) → 老业务字段 dict (snake_case)
        # 注意:get_all 是只读用途(配置页展示用),不需要明文 apiKey
        try:
            return [_cloud_to_legacy_dict(it, with_api_key=False) for it in items]
        except Exception as e:
            logging.getLogger(__name__).warning(
                f"[LLMService.get_all] 适配字段失败 ({type(e).__name__}): {e}"
            )
            return []

    @staticmethod
    async def get_by_id(config_id: int) -> Optional[Dict[str, Any]]:
        """获取单个配置(含明文 api_key,供 LLM 调用)。
        v3.59.60:云端化 — 走 cloud_llm_sync.get_active_config(),不再读本地 sqlite。
        """
        if not cloud_enabled():
            return await LLMService._get_local_by_id(config_id)

        from services import cloud_llm_sync
        import logging
        try:
            cfg = await cloud_llm_sync.get_active_config(config_id=config_id, config_type="llm")
            if not cfg:
                # 兜底:如果在 llm 类型下找不到,试试 image / video(老调用方传任意 config_id)
                for ct in ("image", "video"):
                    cfg = await cloud_llm_sync.get_active_config(config_id=config_id, config_type=ct)
                    if cfg:
                        break
            if not cfg:
                return None
            return _cloud_to_legacy_dict(cfg, with_api_key=True)
        except Exception as e:
            logging.getLogger(__name__).warning(
                f"[LLMService.get_by_id] 云端拉配置失败 id={config_id} ({type(e).__name__}): {e}"
            )
            raise RuntimeError(f"云端配置获取失败,请重启工具或检查网络: {e}")


    @staticmethod
    async def create(config: LLMConfigCreate) -> Dict[str, Any]:
        """创建配置"""
        db = await get_db()
        try:
            extra_params_json = json.dumps(config.extra_params) if config.extra_params else '{}'
            now = now_beijing_str()
            cursor = await db.execute(
                """
                INSERT INTO llm_configs (name, base_url, api_key, model_name, temperature, max_tokens, context_window, extra_params,
                                         config_type, image_ratio, request_timeout, download_timeout, retry_count,
                                         generation_mode, duration, browser_path, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (config.name, config.base_url, encrypt_secret(config.api_key), config.model_name,
                 config.temperature, config.max_tokens, config.context_window, extra_params_json,
                 config.config_type, config.image_ratio, config.request_timeout, config.download_timeout, config.retry_count,
                 config.generation_mode, config.duration, config.browser_path, now, now)
            )
            await db.commit()
            config_id = cursor.lastrowid
            return await LLMService.get_by_id(config_id)
        finally:
            await db.close()

    @staticmethod
    async def update(config_id: int, config: LLMConfigUpdate) -> Optional[Dict[str, Any]]:
        """更新配置"""
        db = await get_db()
        try:
            # 构建动态更新语句
            updates = []
            params = []
            
            if config.name is not None:
                updates.append("name = ?")
                params.append(config.name)
            if config.base_url is not None:
                updates.append("base_url = ?")
                params.append(config.base_url)
            if config.api_key is not None:
                updates.append("api_key = ?")
                params.append(encrypt_secret(config.api_key))
            if config.model_name is not None:
                updates.append("model_name = ?")
                params.append(config.model_name)
            if config.temperature is not None:
                updates.append("temperature = ?")
                params.append(config.temperature)
            if config.max_tokens is not None:
                updates.append("max_tokens = ?")
                params.append(config.max_tokens)
            if config.context_window is not None:
                updates.append("context_window = ?")
                params.append(config.context_window)
            if config.extra_params is not None:
                updates.append("extra_params = ?")
                params.append(json.dumps(config.extra_params))
            if config.config_type is not None:
                updates.append("config_type = ?")
                params.append(config.config_type)
            if config.image_ratio is not None:
                updates.append("image_ratio = ?")
                params.append(config.image_ratio)
            if config.request_timeout is not None:
                updates.append("request_timeout = ?")
                params.append(config.request_timeout)
            if config.download_timeout is not None:
                updates.append("download_timeout = ?")
                params.append(config.download_timeout)
            if config.retry_count is not None:
                updates.append("retry_count = ?")
                params.append(config.retry_count)
            if config.generation_mode is not None:
                updates.append("generation_mode = ?")
                params.append(config.generation_mode)
            if config.duration is not None:
                updates.append("duration = ?")
                params.append(config.duration)
            if config.browser_path is not None:
                updates.append("browser_path = ?")
                params.append(config.browser_path)
            
            if not updates:
                return await LLMService.get_by_id(config_id)
            
            updates.append("updated_at = (datetime('now', '+8 hours'))")
            params.append(config_id)
            
            await db.execute(
                f"UPDATE llm_configs SET {', '.join(updates)} WHERE id = ?",
                params
            )
            await db.commit()
            return await LLMService.get_by_id(config_id)
        finally:
            await db.close()

    @staticmethod
    async def delete(config_id: int) -> bool:
        """删除配置"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM llm_configs WHERE id = ?", (config_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    @staticmethod
    async def test_connection(config_id: int) -> Dict[str, Any]:
        """测试API连通性,LLM 发文本,图像模型真实生图"""
        config = await LLMService.get_by_id(config_id)
        if not config:
            return {"success": False, "message": "配置不存在"}

        # 图像模型:调 ImageService.generate_image 用固定 prompt 真实生图
        if config.get("config_type") == "image":
            from services.image_service import ImageService
            try:
                result = await ImageService.generate_image(
                    config_id=config_id,
                    prompt="一只可爱的橘色小猫,坐在阳光明媚的窗台上,卡通风格",
                    element_id=None,
                    element_type=None,
                    novel_id=None,
                )
                if result.get("success"):
                    return {
                        "success": True,
                        "message": "图像模型调用成功",
                        "image_url": result.get("image_url"),
                        "response": "测试 prompt:一只可爱的橘色小猫,坐在阳光明媚的窗台上,卡通风格",
                    }
                return {
                    "success": False,
                    "message": result.get("message") or "图像生成失败",
                }
            except Exception as e:
                return {
                    "success": False,
                    "message": f"图像生成异常:{type(e).__name__}: {e}",
                }

        # 速创 / 特殊 api_style 的 LLM 不兼容 OpenAI,需要走 call_llm 分支
        # (基于 base_url 或 api_style 判断)
        _api_style_l = (config.get("api_style") or "").lower()
        _base_url_l = (config.get("base_url") or "").lower()
        _model_l = (config.get("model_name") or "").lower()
        _provider_l = (config.get("provider_code") or "").lower()
        # 防御:如果 api_style=gemini_native 但模型不是 Gemini,视为普通 OpenAI 兼容
        # (老配置切预设没改干净的常见情况)
        if _api_style_l == "gemini_native" and "gemini" not in _model_l:
            print(f"[WARN] test: api_style=gemini_native 但 model={_model_l!r} 不像 Gemini,按 OpenAI 兼容测试")
            _api_style_l = "auto"
        # v3.59.66:provider_code 优先,base_url 字符串 fallback
        _non_openai = (
            _api_style_l in ("wuyinkeji_chat", "gemini_native")
            or _provider_l in ("wuyinkeji", "wuyinkeji_llm")
            or "wuyinkeji" in _base_url_l
        )
        if _non_openai:
            try:
                # 速创/Gemini-native 首次连接有时较慢(gemini-3-pro 思考模式可能 20-60s)
                # 给 180s 让真正慢的请求有机会完成
                response_content = await LLMService.call_llm(
                    config_id=config_id,
                    messages=[{"role": "user", "content": "请说你好"}],
                    max_tokens=50,
                    temperature=0.7,
                    timeout=180,
                    task_type="test",
                )
                return {
                    "success": True,
                    "message": "连接成功",
                    "response": response_content or "无响应内容"
                }
            except Exception as e:
                error_str = str(e)
                return {
                    "success": False,
                    "message": f"连接失败: {error_str[:500]}"
                }

        # v3.61.170 codex 复审:自定义 http_client 必须 close,否则连接池泄漏
        client = _make_openai_client(
            base_url=config["base_url"],
            api_key=config["api_key"],
            timeout=Timeout(30.0, connect=10.0, read=20.0),
        )
        try:
            response = await client.chat.completions.create(
                model=config["model_name"],
                messages=[{"role": "user", "content": "请说你好"}],
                max_tokens=50,
                temperature=0.7
            )

            # 记录测试连接日志
            input_tokens = 0
            output_tokens = 0
            total_tokens = 0
            if response.usage:
                input_tokens = response.usage.prompt_tokens or 0
                output_tokens = response.usage.completion_tokens or 0
                total_tokens = response.usage.total_tokens or 0

            log_id = await LogService.create_log(
                task_type="test",
                model=config.get("model_name", ""),
                config_name=config.get("name", ""),
                provider_code=config.get("provider_code", ""),
                base_url=config.get("base_url", ""),
                input_prompt=[{"role": "user", "content": "请说你好"}]
            )
            await LogService.update_log_success(
                log_id=log_id,
                output_content=response.choices[0].message.content if response.choices else "",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens
            )

            return {
                "success": True,
                "message": "连接成功",
                "response": response.choices[0].message.content if response.choices else "无响应内容"
            }
        except asyncio.TimeoutError:
            return {
                "success": False,
                "message": "连接超时，请检查API地址和密钥是否正确，或网络是否通畅"
            }
        except Exception as e:
            import logging, traceback
            logger = logging.getLogger(__name__)
            logger.error(f"[test_connection 失败] model={config.get('model_name')}, base_url={config.get('base_url')}")
            logger.error(f"[test_connection 异常] {type(e).__name__}: {e}")
            # 尝试取出 OpenAI SDK 的 response body
            body = getattr(e, 'response', None)
            if body is not None:
                try:
                    logger.error(f"[test_connection response body] {body.text if hasattr(body, 'text') else body}")
                except Exception:
                    pass
            logger.error(f"[test_connection traceback]\n{traceback.format_exc()}")
            return {
                "success": False,
                "message": f"连接失败: {str(e)}"
            }
        finally:
            # v3.61.170: 关闭自定义 http_client(防连接池泄漏)
            try:
                await client.close()
            except Exception:
                pass

    @staticmethod
    async def call_llm_with_retry(
        *args,
        max_retries: int = 2,
        retry_delay: float = 5.0,
        **kwargs
    ) -> str:
        """call_llm 的自动重试版本, 针对上游瞬时错误(HTTP 500/upstream error/do_request_failed)自动重试。

        Args:
            max_retries: 最大重试次数(首次失败后再试 max_retries 次, 总共 max_retries+1 次尝试)
            retry_delay: 重试间隔(秒)
            其他参数同 call_llm

        每次重试在底层都会创建独立的日志记录, 方便追溯。
        只有判定为"上游瞬时错误"的异常才重试, 其他错误(超时/鉴权/参数错误)直接抛出。
        """
        import asyncio
        last_err: Optional[Exception] = None
        for attempt in range(max_retries + 1):
            try:
                return await LLMService.call_llm(*args, **kwargs)
            except Exception as e:
                last_err = e
                msg = str(e).lower()
                is_upstream_transient = (
                    'http 500' in msg
                    or 'upstream' in msg
                    or 'do_request_failed' in msg
                    or 'new_api_error' in msg
                    or 'bad gateway' in msg
                    or 'http 502' in msg
                    or 'http 503' in msg
                    or 'http 504' in msg
                )
                # 非瞬时错误 / 已用尽重试 -> 抛出
                if not is_upstream_transient or attempt >= max_retries:
                    raise
                logger.warning(
                    f"[llm-retry] 上游瞬时错误(第 {attempt + 1}/{max_retries + 1} 次尝试): "
                    f"{str(e)[:200]}, 延迟 {retry_delay}s 后重试..."
                )
                await asyncio.sleep(retry_delay)
        # 理论上不会到这里, 防御性抛出
        if last_err:
            raise last_err
        raise RuntimeError("call_llm_with_retry 未知错误")

    @staticmethod
    async def call_llm(
        config_id: int,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        timeout: float = 300.0,
        task_type: str = "other",
        novel_id: Optional[int] = None,
        chapter_title: Optional[str] = None,
        source_id: Optional[int] = None,
        source_type: Optional[str] = None,
        source_scene_index: Optional[int] = None,
        skip_auto_log_update: bool = False,
        assemble_payload: Optional[dict] = None,
        allow_direct_storyboard: bool = False,
    ) -> str:
        """统一的大模型调用方法，默认300秒（5分钟）超时
        
        Args:
            config_id: LLM配置ID
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            timeout: 超时时间（秒）
            task_type: 任务类型（script_convert/storyboard_generate/extraction/test/other）
            novel_id: 关联小说ID（可选）
            chapter_title: 关联章节标题（可选）
            skip_auto_log_update: 如果为True，不自动更新日志状态，返回时会抛出包含log_id的异常
                                   调用者需要自己调用 LogService.update_log_success/error
        """
        print(f"[DEBUG] call_llm 被调用: config_id={config_id}, messages_count={len(messages)}, timeout={timeout}, task_type={task_type}", flush=True)
        config = await LLMService.get_by_id(config_id)
        print(f"[DEBUG] 获取配置结果: {config is not None}", flush=True)
        if not config:
            raise ValueError(f"配置ID {config_id} 不存在")

        # 长分镜不能沿用旧的 4096 默认值，否则模型通常在返回半截 JSON/半截小节时
        # 被服务端判为成功；大上下文配置自动补足，显式 max_tokens 仍由调用方控制。
        max_tokens = _effective_storyboard_max_tokens(config, task_type, max_tokens)
        if task_type == "storyboard_generate":
            print(f"[DEBUG] 分镜有效 max_tokens={max_tokens}", flush=True)
        
        # 创建日志记录
        log_id = await LogService.create_log(
            task_type=task_type,
            model=config.get("model_name", ""),
            config_name=config.get("name", ""),
            provider_code=config.get("provider_code", ""),
            base_url=config.get("base_url", ""),
            input_prompt=messages,
            novel_id=novel_id,
            chapter_title=chapter_title,
            source_id=source_id,
            source_type=source_type,
            source_scene_index=source_scene_index
        )

        # ============ admin 代理旁路(仅分镜 + 云端开关开) ============
        # 原直连逻辑在下方保留,但仅用于"代理开关关闭"时。
        # ⚠️ 模板 IP 保护:代理开关开着时,分镜一律走代理,任何失败都报错让用户重试,
        #    绝不回退直连(直连会把模板 prompt 从客户端裸发上游中转,正是走云端要避免的)。
        # 速创(wuyinkeji)用 form 协议,代理 Phase1 不支持 → 不走代理。
        _pc = (config.get("provider_code") or "").lower()
        _bu = (config.get("base_url") or "").lower()
        _is_wuyinkeji_cfg = (_pc in ("wuyinkeji", "wuyinkeji_llm")) or ("wuyinkeji" in _bu)
        if task_type == "storyboard_generate" and not _is_wuyinkeji_cfg and not allow_direct_storyboard:
            _proxy_on = False
            try:
                _proxy_on = await _is_llm_proxy_enabled()
            except Exception:
                _proxy_on = False
            # ⚠️ 预置模板(assemble_payload 非空)本地无模板正文(meta_only),只能走代理。
            #    代理没开 → 直接报错,绝不用无模板的本地 messages 直连(否则出空壳分镜 + 也不护模板)。
            if assemble_payload and not _proxy_on:
                _emsg = "预置分镜模板需经云端代理生成(模板不下发客户端),但代理未开启。请联系管理员在后台开启「分镜 LLM 中转代理」。"
                await LogService.update_log_error(log_id=log_id, error_message=_emsg)
                raise RuntimeError(_emsg)
            if _proxy_on:
                try:
                    _content, _it, _ot, _tt = await _call_llm_via_admin_proxy(
                        config=config, messages=messages,
                        temperature=temperature, max_tokens=max_tokens, task_type=task_type,
                        assemble_payload=assemble_payload,
                    )
                    if not _content or not _content.strip():
                        # 已提交,空内容当真实失败,不回退
                        raise _ProxyHardError("代理返回空内容")
                    _proxy_logger.info(f"[llm-proxy] 分镜走代理成功 log_id={log_id} tokens={_tt}")
                    if skip_auto_log_update:
                        return _content, log_id, {
                            "input_tokens": _it, "output_tokens": _ot, "total_tokens": _tt}
                    await LogService.update_log_success(
                        log_id=log_id, output_content=_content,
                        input_tokens=_it, output_tokens=_ot, total_tokens=_tt)
                    return _content
                except _ProxyHardError as _e:
                    # 代理任何失败都不回退直连(护模板),当真实失败上报让用户重试
                    _emsg = f"分镜代理调用失败:{_e}"
                    _proxy_logger.warning(f"[llm-proxy] 代理失败,不回退直连 log_id={log_id}: {_e}")
                    # ⚠️ Codex P2:这里无条件写 error。本分支是 raise 而非 return,
                    #    调用方(分镜 skip_auto_log_update=True)拿不到 log_id 自己更新,
                    #    不写就会把 llm_logs 永久卡在 running(对齐直连超时/异常分支口径)。
                    await LogService.update_log_error(log_id=log_id, error_message=_emsg)
                    raise RuntimeError(_emsg) from _e

        # v3.61.170 codex round2:client 创建延迟到真正用的 OpenAI 主分支前,
        #   wuyinkeji / gemini-native 分支走自己路径,不创建 client → 无连接池泄漏
        # 解析额外参数
        extra_params = json.loads(config.get("extra_params", "{}"))

        # ============ 速创 API 文本对话分支 (wuyinkeji_chat) ============
        # 速创 /api/chat/index 不兼容 OpenAI,需要特殊处理:
        # - form-urlencoded + 单个 content 字段(messages 扁平化)
        # - 响应 {code, data:'...'} 特殊格式
        # v3.59.66:provider_code 优先,base_url 兜底
        api_style_lower = (config.get("api_style") or "").lower()
        _base_url_lower = (config.get("base_url") or "").lower()
        _provider_lower = (config.get("provider_code") or "").lower()
        _is_wuyinkeji = (
            _provider_lower in ("wuyinkeji", "wuyinkeji_llm")
            or "wuyinkeji" in _base_url_lower
        )
        if api_style_lower != "wuyinkeji_chat" and _is_wuyinkeji:
            print(f"[INFO] 识别为速创 LLM(provider={_provider_lower or 'fallback-from-url'}),强制 api_style=wuyinkeji_chat (原值={api_style_lower})")
            api_style_lower = "wuyinkeji_chat"

        if api_style_lower == "wuyinkeji_chat":
            try:
                response_text, input_tokens, output_tokens = await asyncio.wait_for(
                    LLMService._call_wuyinkeji_chat(
                        base_url=config["base_url"],
                        api_key=config["api_key"],
                        model=config["model_name"],
                        messages=messages,
                        timeout=timeout,
                    ),
                    timeout=timeout + 60.0,
                )
                total_tokens = input_tokens + output_tokens
                if not response_text or not response_text.strip():
                    error_msg = "速创 LLM 返回空响应"
                    if not skip_auto_log_update:
                        await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                    raise RuntimeError(error_msg)

                if skip_auto_log_update:
                    return response_text, log_id, {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "total_tokens": total_tokens,
                    }
                await LogService.update_log_success(
                    log_id=log_id,
                    output_content=response_text,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                )
                return response_text
            except asyncio.TimeoutError:
                error_msg = f"速创 LLM 调用超时(超过 {timeout + 60}s)"
                await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                raise TimeoutError(error_msg)
            except Exception as e:
                error_msg = f"速创 LLM 调用失败: {type(e).__name__}: {e}"
                await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                raise

        # ============ 防御性检查:api_style 与 model 不一致时自动降级 ============
        # 用户场景:用 Gemini 预设建了配置 → 后来手动改 model_name 为 deepseek-v4-pro
        # 但忘了切预设(api_style 仍是 gemini_native) → 调用时 deepseek 网关返 401
        if api_style_lower == "gemini_native":
            _model_lower = (config.get("model_name") or "").lower()
            _base_url_lower = (config.get("base_url") or "").lower()
            # 真正的 Gemini 模型 model_name 必含 'gemini'
            # 如果 model_name 不像 Gemini 系列,降级到 auto 走 OpenAI 兼容
            if "gemini" not in _model_lower:
                print(f"[WARN] api_style=gemini_native 但 model={_model_lower!r} 不像 Gemini,"
                      f"base_url={_base_url_lower!r},降级到 openai_chat 兼容模式")
                api_style_lower = "auto"

        # ============ Gemini 原生格式分支 ============
        # 适用于灵芽等中转网关的 /v1beta/models/{model}:generateContent 端点
        # 解决 Gemini 3.1 Pro thinking 吃掉 output tokens 导致 8K 截断的问题
        if api_style_lower == "gemini_native":
            try:
                # 再加一层外围硬超时保护(timeout + 120s),任何情况下不会永远 running
                content, input_tokens, output_tokens = await asyncio.wait_for(
                    LLMService._call_gemini_native(
                        base_url=config["base_url"],
                        api_key=config["api_key"],
                        model=config["model_name"],
                        messages=messages,
                        temperature=temperature if temperature is not None else config["temperature"],
                        max_tokens=max_tokens if max_tokens is not None else config.get("max_tokens") or 60000,
                        extra_params=extra_params,
                        timeout=timeout,
                    ),
                    timeout=timeout + 120.0,
                )
                total_tokens = (input_tokens or 0) + (output_tokens or 0)

                if not content or not content.strip():
                    error_msg = "Gemini 原生接口返回空响应(可能触发内容安全过滤)。"
                    if not skip_auto_log_update:
                        await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                    raise RuntimeError(error_msg)

                if skip_auto_log_update:
                    return content, log_id, {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "total_tokens": total_tokens,
                    }

                await LogService.update_log_success(
                    log_id=log_id,
                    output_content=content,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                )
                return content
            except asyncio.TimeoutError:
                error_msg = f"Gemini 原生接口调用超时(超过 {timeout + 120}s)。建议:1) 缩短输入 2) 换 gemini-2.5-flash 3) 关闭 thinking"
                # 即使 skip_auto_log_update=True 也要写 error:调用方拿不到 log_id 无法自己更新
                await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                raise TimeoutError(error_msg)
            except Exception as e:
                # ★ v3.59.59:走友好翻译,跟 OpenAI 分支一致
                # 之前直接 raise RuntimeError 原文给用户,看到 403 + insufficient_user_quota 会以为余额不足
                # 实际可能只是中转的分组配额或路由问题
                friendly = LLMService._friendly_llm_error(e)
                await LogService.update_log_error(log_id=log_id, error_message=friendly)
                raise RuntimeError(friendly) from e
        # ============ / Gemini 原生分支结束 ============

        # ============ OpenAI 主分支(含 OpenAI 原生 / 各种 OpenAI 兼容中转)============
        # v3.61.170 codex round2:client 创建延迟到这里 — wuyinkeji/gemini-native 用不到不创建
        # v3.61.170: 统一工厂 — trust_env=False 防代理污染
        print(f"[DEBUG] 创建 OpenAI 客户端: base_url={config.get('base_url')}, model={config.get('model_name')}", flush=True)
        client = _make_openai_client(
            base_url=config["base_url"],
            api_key=config["api_key"],
            timeout=Timeout(timeout + 30.0, connect=15.0, read=timeout),
        )

        # OpenAI SDK 已知顶层字段;其它未知字段统一走 extra_body 透传,避免 SDK 版本不兼容报错
        # (如 reasoning_effort / thinking_config / safety_settings 等厂商扩展字段)
        KNOWN_TOP_LEVEL = {"temperature", "max_tokens", "top_p", "top_k", "frequency_penalty",
                           "presence_penalty", "stop", "stream", "n", "user", "seed",
                           "response_format", "tool_choice", "tools"}
        top_extras = {k: v for k, v in extra_params.items() if k in KNOWN_TOP_LEVEL}
        pass_through = {k: v for k, v in extra_params.items() if k not in KNOWN_TOP_LEVEL}

        # 构建请求参数
        request_params = {
            "model": config["model_name"],
            "messages": messages,
            "temperature": temperature if temperature is not None else config["temperature"],
            "max_tokens": max_tokens if max_tokens is not None else config.get("max_tokens"),
            **top_extras
        }
        if pass_through:
            request_params["extra_body"] = pass_through
            print(f"[DEBUG] extra_body 透传: {list(pass_through.keys())}", flush=True)
        print(f"[DEBUG] 发送 API 请求: model={request_params['model']}, max_tokens={request_params['max_tokens']}", flush=True)

        try:
            # 启用 SSE 流式响应:解决长输出(GPT-5.5/Gemini-3-Pro 12K+ tokens)在非流模式下
            # 单次大 response 被中间网络层(代理/防火墙/CDN)静默 RST,导致 backend 等满 30 分钟超时
            # 流式下:
            #   1) 模型 thinking 时连接保活
            #   2) 输出按 chunk 边到边收,断连立即抛 ChunkReadError 而不是傻等
            #   3) 总耗时和 token 计费完全一致(stream_options.include_usage=True 后能拿到 usage)
            #
            # 三级降级策略(防中转兼容性问题导致 INVALID_ARGUMENT):
            #   level 1: stream + stream_options.include_usage   (最优)
            #   level 2: stream(不带 stream_options)              (中转不认 options 时)
            #   level 3: 非流                                     (中转不支持 stream 时)
            stream = None
            for level in (1, 2, 3):
                try:
                    if level == 1:
                        request_params["stream"] = True
                        request_params["stream_options"] = {"include_usage": True}
                    elif level == 2:
                        request_params["stream"] = True
                        request_params.pop("stream_options", None)
                    else:  # level 3
                        request_params.pop("stream", None)
                        request_params.pop("stream_options", None)

                    print(f"[DEBUG] 尝试 stream 等级 {level}: stream={request_params.get('stream')}, has_options={'stream_options' in request_params}", flush=True)
                    stream = await client.chat.completions.create(**request_params)
                    print(f"[DEBUG] level={level} API 启动成功", flush=True)
                    break
                except Exception as level_err:
                    err_lower = str(level_err).lower()
                    is_arg_err = (
                        'invalid_argument' in err_lower
                        or 'bad request' in err_lower
                        or 'badrequest' in err_lower
                        or '400' in err_lower
                        or 'stream_options' in err_lower
                    )
                    if not is_arg_err or level == 3:
                        # 不是参数错误,或最后一级也失败 → 抛出
                        raise
                    print(f"[DEBUG] level={level} 失败({type(level_err).__name__}: {str(level_err)[:200]}),降级", flush=True)
                    continue

            # 如果 level 3 (非流式) 启动成功,stream 实际是 ChatCompletion 对象 → 包成单 chunk 处理
            current_stream_mode = request_params.get("stream", False)

            # 累积 chunks 还原成完整 response 形态
            content = ""
            finish_reason = None
            input_tokens = 0
            output_tokens = 0
            total_tokens = 0
            chunk_count = 0

            if current_stream_mode:
                # stream 模式(level 1/2): 异步迭代 chunks
                async for chunk in stream:
                    chunk_count += 1
                    if chunk.choices:
                        delta = chunk.choices[0].delta
                        if delta and delta.content:
                            content += delta.content
                        fr = chunk.choices[0].finish_reason
                        if fr:
                            finish_reason = fr
                    # usage 会在最后一个 chunk 出现(stream_options.include_usage=True)
                    if hasattr(chunk, 'usage') and chunk.usage:
                        input_tokens = chunk.usage.prompt_tokens or 0
                        output_tokens = chunk.usage.completion_tokens or 0
                        total_tokens = chunk.usage.total_tokens or 0
                print(f"[DEBUG] stream 完成: {chunk_count} chunks, content {len(content)} 字符, finish={finish_reason}", flush=True)
            else:
                # level 3 非流降级: stream 实际是完整 ChatCompletion 对象
                response_obj = stream
                if response_obj.choices and response_obj.choices[0].message:
                    content = response_obj.choices[0].message.content or ""
                    finish_reason = getattr(response_obj.choices[0], 'finish_reason', None)
                if hasattr(response_obj, 'usage') and response_obj.usage:
                    input_tokens = response_obj.usage.prompt_tokens or 0
                    output_tokens = response_obj.usage.completion_tokens or 0
                    total_tokens = response_obj.usage.total_tokens or 0
                print(f"[DEBUG] 非流模式完成: content {len(content)} 字符, finish={finish_reason}", flush=True)

            # 兜底:如果服务端没回 usage(部分老中转),按字符数粗估
            if total_tokens == 0 and content:
                output_tokens = len(content) // 2  # 中文约 2 字 1 token
                total_tokens = output_tokens

            # 兼容下游处理:构造个伪 response.choices[0].message.content 不再需要,直接用 content 变量
            if content is not None:

                # 检测 Gemini 的"软屏蔽"空响应:HTTP 200 + 输入 token 正常消耗 + 输出 0 + content 空
                # 或 finish_reason 指示 SAFETY/content_filter
                is_safety_block = str(finish_reason or '').lower() in ('safety', 'content_filter', 'content_filtered', 'prohibited_content')
                is_empty_output = (not content or not content.strip()) and output_tokens == 0

                if is_safety_block or is_empty_output:
                    if is_safety_block:
                        error_msg = f"模型拒绝生成(finish_reason={finish_reason})。可能触发内容安全过滤,请修改输入或换用其他模型。"
                    else:
                        error_msg = f"模型返回空响应(输入 {input_tokens} tokens 已消耗,输出 0 tokens)。常见原因:Gemini 的软性内容过滤。建议换用 DeepSeek/GPT-4 重试。"
                    print(f"[WARN] {error_msg}", flush=True)
                    if not skip_auto_log_update:
                        await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                    # 抛出异常让上层 UI 看到错误提示
                    raise RuntimeError(error_msg)

                # 如果 skip_auto_log_update=True，不更新日志状态，返回 (content, log_id, token_info)
                if skip_auto_log_update:
                    return content, log_id, {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "total_tokens": total_tokens
                    }

                # 更新日志为成功状态
                await LogService.update_log_success(
                    log_id=log_id,
                    output_content=content,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens
                )

                return content

            print("[DEBUG] API 响应无 choices", flush=True)
            # 无 choices 一律视为失败
            error_msg = "模型未返回任何响应(response.choices 为空)"
            if not skip_auto_log_update:
                await LogService.update_log_error(log_id=log_id, error_message=error_msg)
            raise RuntimeError(error_msg)
            
        except asyncio.TimeoutError:
            error_msg = f"LLM调用超时（{timeout}秒），请检查API地址和密钥是否正确，或稍后重试"
            await LogService.update_log_error(log_id=log_id, error_message=error_msg)
            raise TimeoutError(error_msg)
        except Exception as e:
            raw = f"{type(e).__name__}: {str(e)}"
            # 常见错误友好化翻译
            lower = raw.lower()
            if 'prohibited_content' in lower or 'prompt_blocked' in lower:
                error_msg = "Gemini 内容安全过滤拒绝了本次请求(PROHIBITED_CONTENT)。可能触发:血腥/暴力/情色/未成年/敏感政治词。请修改输入内容(小说原文或模板提示词),替换相关词汇后重试。"
            elif 'insufficient_user_quota' in lower or 'new_api_error' in lower:
                # new-api 中转特有:可能是分组配额耗尽 / 渠道权限受限,主账号余额未必真没了
                # 不翻译成"余额不足",原样把服务端文本透传给用户看
                # 中转 message 通常带 "用户[xxx]额度不足,剩余额度: -X.XX (request id: yyy)"
                error_msg = f"中转拒绝调用:{str(e)[:300]}\n说明:这是中转的提示,可能是分组配额、模型权限或渠道路由问题。请到中转后台查看,或联系中转客服。"
            elif 'insufficient_quota' in lower or 'insufficient balance' in lower or 'billing' in lower or '402' in lower:
                error_msg = "API 账户余额不足或额度已用完,请充值后重试。"
            elif '401' in lower or 'unauthorized' in lower or 'invalid api key' in lower:
                error_msg = 'API Key 无效或已失效,请到"模型API配置"检查密钥是否正确。'
            elif '429' in lower or 'rate limit' in lower or 'too many requests' in lower:
                error_msg = "调用过于频繁触发服务商限流,请稍候 1-2 分钟再试。"
            elif '404' in lower or 'model not found' in lower:
                error_msg = "模型不存在或接口地址错误,请检查配置中的 model_name 和 base_url。"
            elif '502' in lower or '503' in lower or 'bad gateway' in lower:
                error_msg = "服务商网关临时故障(502/503),请稍后重试。"
            elif 'connection' in lower or 'network' in lower:
                error_msg = "网络连接异常,请检查网络或 API 地址。"
            else:
                # 兜底:未识别的中转/服务商错误,统一友好文案
                # 之前直接展示英文 raw 用户看不懂,现在给统一的"换中转/分组"建议 + 附原文
                error_msg = (
                    "中转 API 调用异常,请稍后再试,"
                    "或尝试切换该中转的【高级分组】、或切换为【其他中转】。\n"
                    f"(技术信息:{raw[:300]})"
                )

            print(f"[ERROR] call_llm API请求失败: {raw}", flush=True)
            import traceback
            traceback.print_exc()
            await LogService.update_log_error(log_id=log_id, error_message=error_msg)
            # 把友好消息包进去重新抛出,让上层前端 UI 能直接显示
            # ⚠️ 不要用 type(e)(error_msg):openai>=1.50.0 的 APIStatusError/APIError 把
            # response/body 改成了 keyword-only 必填,直接 TypeError("missing 2 required
            # keyword-only arguments: 'response' and 'body'")。统一抛 RuntimeError 即可,
            # 上层只关心 .args[0] 文本,不关心异常类型。
            raise RuntimeError(error_msg) from e
        finally:
            # v3.61.170 codex round2:自定义 http_client 必须关 — SDK 默认有 __del__ 兜底
            #   但自定义 httpx 没,高频调用会泄漏连接池
            try:
                await client.close()
            except Exception:
                pass


# ============================================================
# v3.59.60 模块级辅助:云端 dict (camelCase) → 老业务字段 dict (snake_case)
# ============================================================
# ⚠️ 此函数必须在 class LLMService 之外(模块级),不能放进 class 体中间 —
# 之前误放进 class 里(顶级 def 0 缩进)会被 Python 当作 class 体结束标记,
# 导致后面的 call_llm / create / update 等方法全部丢失。
# v3.61.170: 按 model_name 智能选 max_tokens/context_window fallback
#   云端配置缺 max_tokens 时,L1196 fallback 不再一刀切 4096(那会让现代模型输出被截断)
#   按模型族选合理上限 — 已知主流模型用真上限,未知/老 4K 模型走保守值
_MODEL_TOKEN_HINTS = [
    # (匹配关键字, max_tokens, context_window)
    # ↓ 主流大模型 — 输出上限按官方文档
    ("gemini-3",          65536, 1048576),
    ("gemini-2.5-pro",    65536, 1048576),
    ("gemini-2.5-flash",  65536, 1048576),
    ("gemini-pro",        65536, 1048576),
    ("claude-opus-4",     16000, 200000),
    ("claude-sonnet-4",   16000, 200000),
    ("claude-3-5",        8192,  200000),
    ("claude-3",          8192,  200000),
    ("claude-4",          16000, 200000),
    ("gpt-5",             16384, 200000),
    ("gpt-4o",            16384, 128000),
    ("gpt-4-turbo",       4096,  128000),   # 真 4K 上限
    ("deepseek-v4-pro",   32768, 131072),
    ("deepseek-v4",       16384, 131072),
    ("deepseek-reasoner", 16384, 65536),
    ("deepseek-chat",     8192,  65536),
    ("qwen-max",          8192,  32768),
    ("qwen-plus",         8192,  131072),
    ("qwen",              8192,  131072),
    ("doubao-pro-32k",    4096,  32768),
    ("doubao-seed",       16384, 131072),
    ("glm-4-plus",        4096,  128000),
    ("glm-4",             8192,  128000),
]


def _smart_fallback_max_tokens(model_lower: str, extra: Dict[str, Any]) -> int:
    # extra 显式带的优先
    v = extra.get("max_tokens")
    if v:
        try:
            return int(v)
        except Exception:
            pass
    for kw, mt, _ in _MODEL_TOKEN_HINTS:
        if kw in model_lower:
            return mt
    # v3.61.170 codex round2:未知模型回 4096 保守(原 16384 会让严格限 4K/8K 的老模型 400)
    # 仅 _MODEL_TOKEN_HINTS 里明确命中的现代模型才拿高值
    return 4096


def _smart_fallback_context_window(model_lower: str, extra: Dict[str, Any]) -> int:
    v = extra.get("context_window")
    if v:
        try:
            return int(v)
        except Exception:
            pass
    for kw, _, cw in _MODEL_TOKEN_HINTS:
        if kw in model_lower:
            return cw
    # v3.61.170 codex round2:未知模型回 4096 保守(原 65536 会污染严格上下文检查的老模型)
    return 4096


def _cloud_to_legacy_dict(c: Dict[str, Any], with_api_key: bool = True, mask_key: bool = False) -> Dict[str, Any]:
    """云端 list/active 返回的 dict (camelCase) → 老业务侧期望的 dict (snake_case + 扩展字段)。

    云端不下发的字段(temperature / max_tokens / image_ratio 等)用合理默认填,
    extra_params 优先使用云端 extraParams(已经 parse 成 dict),
    api_style 从 providerCode 智能推断(gemini_native / wuyinkeji_chat / auto)。
    """
    extra = c.get("extraParams") or {}
    if isinstance(extra, str):
        try:
            extra = json.loads(extra) if extra.strip() else {}
        except Exception:
            extra = {}
    if not isinstance(extra, dict):
        extra = {}

    provider = (c.get("providerCode") or "").lower()
    base_url = c.get("baseUrl") or ""
    model_lower = (c.get("modelName") or "").lower()

    # ★ v3.59.65 关键修复:provider_code 空时按 base_url 兜底推断
    # 老用户的 llm_configs 大多 preset_id=NULL → JOIN 不出 provider_code → 推上云端是空字符串
    # 没这层兜底,api_style 推断会全部 fallback "auto" → 灵芽 gemini-3 走 OpenAI 兼容 → APITimeoutError
    if not provider:
        bl = base_url.lower()
        if "lingyaai" in bl:
            provider = "lingya"
        elif "bltcy" in bl:
            provider = "bltcy"
        elif "wuyinkeji" in bl:
            # wuyinkeji 同域名既有 LLM 也有 image,按 config_type 区分
            ct = (c.get("configType") or "llm").lower()
            provider = "wuyinkeji_llm" if ct == "llm" else "wuyinkeji"
        elif "deepseek" in bl:
            provider = "deepseek"
        elif "volces" in bl or "ark" in bl:
            provider = "volcengine"
        elif "geek" in bl or "geeknow" in bl:
            provider = "geek"
        elif "mjapi.cc.cd" in bl:
            provider = "cool"
        elif "openai.com" in bl:
            provider = "openai"
        elif "googleapis" in bl or "aistudio" in bl:
            provider = "google"
        else:
            provider = "openai_compat"  # 通用 OpenAI 兼容兜底

    # api_style 推断 — 跟老的字符串匹配等价,但优先以 provider_code + model_name 双重判定
    # ⚠️ 关键修复(v3.59.63):灵芽 base_url 是 /v1 不是 /v1beta,但 gemini-3 模型必须走
    # gemini_native 分支(thinkingConfig / safety_settings 等私有字段)。
    # 改成"灵芽 + model 含 gemini" → gemini_native,跟老用户在 admin 后台配置的等价。
    is_gemini_model = (
        "gemini-2.5" in model_lower
        or "gemini-3" in model_lower
        or "gemini-pro" in model_lower
    )
    if provider == "lingya" and is_gemini_model:
        api_style = "gemini_native"
    elif provider == "lingya" and "/v1beta" in base_url.lower():
        api_style = "gemini_native"   # 直连 Google AI Studio 路径(罕见)
    elif provider == "wuyinkeji_llm":
        api_style = "wuyinkeji_chat"
    else:
        api_style = "auto"

    # extra_params 里的覆盖优先(用户在 web 显式配过 api_style 就尊重)
    if isinstance(extra.get("api_style"), str) and extra["api_style"]:
        api_style = extra["api_style"]

    out = {
        "id": c.get("id"),
        "name": c.get("name") or "",
        "base_url": base_url,
        "model_name": c.get("modelName") or "",
        "config_type": c.get("configType") or "llm",
        # ★ v3.59.66:返回的是兜底后的 provider(可能是云端原始,也可能是 base_url 推断)
        # 业务侧路由判定要拿这个,不能拿原始 c.get("providerCode")
        "provider_code": provider,
        # 云端没下发的字段:用合理默认 + extra_params 里也可能覆盖
        "temperature": float(extra.get("temperature", 0.7) or 0.7),
        # v3.61.166 codex 复审:云端 fallback 保守用 4096(原值)
        # v3.61.170: 用户反馈仍被截断 — 根因:云端配置(直接在千山官网建的)extraParams 里没
        #   max_tokens/context_window,L1196 fallback 4096 → 调用时 max_tokens=4096 输出截断
        #   修法:按 model_name 智能 fallback —
        #     主流大模型(gemini-3/2.5-pro/claude-4/deepseek-v3/qwen-max 等)→ 用各自真实上限
        #     老 4K 模型(gpt-4-turbo/豆包-pro-32k)→ 仍保守 4096
        # v3.61.170 codex round2:未知模型回 4096 保守(避免严格限 4K 的老 OpenAI 兼容模型 400)
        #   完整真值表见 _smart_fallback_max_tokens / _smart_fallback_context_window
        "max_tokens": _smart_fallback_max_tokens(model_lower, extra),
        "context_window": _smart_fallback_context_window(model_lower, extra),
        "image_ratio": extra.get("image_ratio") or "16:9",
        "request_timeout": int(extra.get("request_timeout", 60) or 60),
        "download_timeout": int(extra.get("download_timeout", 60) or 60),
        "retry_count": int(extra.get("retry_count", 0) or 0),
        "generation_mode": extra.get("generation_mode") or "",
        "duration": int(extra.get("duration", 15) or 15),
        "browser_path": extra.get("browser_path") or "",
        "extra_params": json.dumps(extra, ensure_ascii=False),  # 老业务里 extra_params 是 JSON 字符串
        "api_style": api_style,
        "preset_id": None,
        # Pydantic LLMConfigResponse 要求 datetime 字段非空且可 parse
        # 云端 updateTime 是 "yyyy-MM-dd HH:mm:ss" 字符串;空时给 now 兜底
        "created_at": c.get("updateTime") or now_beijing_str(),
        "updated_at": c.get("updateTime") or now_beijing_str(),
    }
    # Pydantic LLMConfigResponse 模型要求 api_key 必填,
    # 列表展示场景(get_all)不返明文,但仍要把字段塞上才能通过校验
    if with_api_key:
        out["api_key"] = c.get("apiKey") or ""
    else:
        # 列表展示用 mask 字符串(后端 mask),前端 UI 显示也合理
        masked = (c.get("apiKey") or "")
        if masked and len(masked) > 8:
            out["api_key"] = masked[:4] + "****" + masked[-4:]
        else:
            out["api_key"] = "********"  # 没拿到明文(get_all 不会拿)→ 纯占位
    return out
