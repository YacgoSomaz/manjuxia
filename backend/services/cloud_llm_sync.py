"""云端 LLM 配置访问(qianshanai.cn 个人中心)。

v3.59.60 引入。功能划分:
  - sync_from_local() : 登录后调一次,把本地 llm_configs 推到云端
  - list_configs()    : 业务读取前调,拉云端配置列表(30s 内存缓存)
  - get_active_config(): 拿到一条带明文 key 的完整配置(供 LLM 调用)
  - invalidate_cache(): 退出登录 / 切账号时清缓存

设计要点:
  - 本地 llm_configs 表里没 provider_code 字段,JOIN llm_config_presets 拿
  - extra_params 字段直接当 JSON 字符串透传(不在 C 端 parse,云端原样存)
  - apiKey 从 /decrypt-key 接口按需拉,不落本地
"""
import json
import time
import logging
import asyncio
from typing import Optional, Dict, Any, List

import httpx

from database.db import get_db
from utils.timezone import now_beijing_str
from services import cloud_token_service as _cts
from services.offline_guard import cloud_enabled, require_cloud

logger = logging.getLogger(__name__)

QIANSHAN_API_BASE = "https://api.qianshanai.cn/api"

# v3.61.235:防批量任务雪崩。
# 早期 TTL=0 导致批量生图同时发起 N 组 for-client/decrypt-key;席位账号还会按 X-Team-Id
# 重试,云端直接返回"并发过高"。这里改成短 TTL + in-flight 合并:
# - 列表 10s:只用于吸收同一批任务的并发读取
# - 明文 key 60s:只在内存,退出/刷新配置会清;换 web 配置最多延迟 1 分钟
_list_cache: Dict[str, Any] = {}
_LIST_TTL = 10
_list_inflight: Dict[str, asyncio.Task] = {}
_key_cache: Dict[tuple, tuple] = {}
_KEY_TTL = 60
_key_inflight: Dict[tuple, asyncio.Task] = {}


def _task_type_for_config_type(config_type: str) -> str:
    """云端团队模式 key 解密要求的业务类型。

    千山云端目前只接受: llm_call / image_gen / video_gen。
    本地 config_type 则是 llm / image / video,集中映射避免业务层散落。
    """
    ct = (config_type or "llm").lower()
    if ct == "image":
        return "image_gen"
    if ct == "video":
        return "video_gen"
    return "llm_call"


def _needs_team_header(message: str) -> bool:
    """云端明确要求 X-Team-Id 时才按团队身份重试。

    默认不带团队头,避免个人小说/个人模型配置被当前团队上下文污染。
    """
    m = (message or "").lower()
    return ("x-team-id" in m) or ("team-id" in m) or (("必须带" in message) and ("团队" in message))


# ============================================================
#  一、登录后:推本地 llm_configs 到云端
# ============================================================
async def sync_from_local(tool_code: str = "comic") -> Dict[str, Any]:
    """登录(verify)成功后调一次,把本地 llm_configs 全量推到云端合并。失败仅记日志。

    v3.59.67:加 "首次迁移完成" 检查
    - 已迁移(标志位=1):跳过本函数,直接信任云端为唯一数据源
        → 用户在 web 删配置后,C 端不会再把它推回去
    - 未迁移:走老逻辑推上去;**全部成功后清空本地表 + 落标志位**
        → 之后再启动会走"已迁移"分支
    """
    require_cloud("云端模型配置迁移")
    from services.settings_service import SettingsService, KEY_CLOUD_LLM_SYNCED_ONCE

    if await SettingsService.get_bool(KEY_CLOUD_LLM_SYNCED_ONCE):
        logger.info("[CLOUD-SYNC] 已完成首次迁移,跳过本地推送(云端为唯一权威源)")
        return {"skipped": True, "reason": "already_migrated"}

    try:
        access_token = await _cts.get_access_token()
    except RuntimeError as e:
        logger.warning(f"[CLOUD-SYNC] 没 token,跳过同步: {e}")
        return {"skipped": True, "reason": "no_token"}

    db = await get_db()
    try:
        # JOIN llm_config_presets 拿 provider_code(本地配置里 preset_id 关联预设表)
        # 同时拉 api_style 字段(老用户在 admin 后台手动选的 gemini_native / wuyinkeji_chat 等)
        # v3.61.166 codex 复审:加拉 max_tokens / context_window / temperature
        #   云端 schema 没这三个字段 → 合并进 extraParams 推上去,
        #   防止回读时 _cloud_to_legacy_dict 走 fallback 把老厂商配置(GPT-4 Turbo 4K 等)误拉满
        cur = await db.execute(
            """SELECT c.id, c.name, c.base_url, c.api_key, c.model_name, c.config_type,
                      c.extra_params, c.api_style, c.updated_at,
                      c.max_tokens, c.context_window, c.temperature,
                      p.provider_code
               FROM llm_configs c
               LEFT JOIN llm_config_presets p ON c.preset_id = p.id"""
        )
        rows = await cur.fetchall()
    finally:
        await db.close()

    items = []
    for r in rows:
        if not (r["base_url"] and r["api_key"] and r["model_name"]):
            continue  # 缺关键字段的不推

        # ★ v3.59.65 关键修复:云端 schema 没 api_style 字段,
        # 把本地 api_style 合并进 extra_params 一起推上去,
        # 这样 for-client 拉回来时 _cloud_to_legacy_dict 能从 extra 里读到
        existing_extra = {}
        if r["extra_params"]:
            try:
                existing_extra = json.loads(r["extra_params"]) or {}
                if not isinstance(existing_extra, dict):
                    existing_extra = {}
            except Exception:
                existing_extra = {}
        # 用户在 admin 后台显式选了 api_style(非 auto)→ 并入 extra
        if r["api_style"] and r["api_style"] != "auto" and "api_style" not in existing_extra:
            existing_extra["api_style"] = r["api_style"]
        # v3.61.166 codex 复审:把 max_tokens / context_window / temperature 合并进 extraParams,
        #   防回读时 fallback 误拉满 (GPT-4 Turbo 4K 等模型的真实值被冲掉)
        #   只在本地有具体值 且 extra 中没显式设过(保护用户在 admin 手动覆盖)时写
        if r["max_tokens"] is not None and "max_tokens" not in existing_extra:
            existing_extra["max_tokens"] = int(r["max_tokens"])
        if r["context_window"] is not None and "context_window" not in existing_extra:
            existing_extra["context_window"] = int(r["context_window"])
        if r["temperature"] is not None and "temperature" not in existing_extra:
            existing_extra["temperature"] = float(r["temperature"])
        merged_extra_str = json.dumps(existing_extra, ensure_ascii=False) if existing_extra else ""

        # ★ v3.59.65:provider_code 兜底 — 老数据 preset_id=NULL 拿不到 → 按 base_url 推断
        provider = r["provider_code"] or ""
        if not provider:
            bl = (r["base_url"] or "").lower()
            ct = (r["config_type"] or "llm").lower()
            if "lingyaai" in bl:
                provider = "lingya"
            elif "bltcy" in bl:
                provider = "bltcy"
            elif "wuyinkeji" in bl:
                provider = "wuyinkeji_llm" if ct == "llm" else "wuyinkeji"
            elif "deepseek" in bl:
                provider = "deepseek"
            elif "volces" in bl or "ark" in bl:
                provider = "volcengine"
            elif "geek" in bl or "geeknow" in bl:
                provider = "geek"
            elif "openai.com" in bl:
                provider = "openai"
            elif "googleapis" in bl or "aistudio" in bl:
                provider = "google"
            else:
                provider = "openai_compat"

        items.append({
            "localId": str(r["id"]),
            "configType": r["config_type"] or "llm",
            "providerCode": provider,
            "name": r["name"] or f"配置#{r['id']}",
            "baseUrl": r["base_url"],
            "apiKey": r["api_key"],
            "modelName": r["model_name"],
            "extraParams": merged_extra_str,
            "updateTime": str(r["updated_at"]) if r["updated_at"] else now_beijing_str(),
        })

    if not items:
        # v3.59.67:本地空 → 直接落首次迁移完成标志位(避免每次启动都进 sync 流程)
        logger.info("[CLOUD-SYNC] 本地无可同步配置,直接标记首次迁移完成")
        await SettingsService.set(KEY_CLOUD_LLM_SYNCED_ONCE, "1")
        return {"skipped": True, "reason": "empty", "migrated": True}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{QIANSHAN_API_BASE}/user/llm-configs/sync-from-client",
                headers=_cts.headers(),
                json={"toolCode": tool_code, "items": items},
            )
        if resp.status_code != 200:
            logger.warning(f"[CLOUD-SYNC] HTTP {resp.status_code}: {resp.text[:300]}")
            return {"error": f"http_{resp.status_code}"}
        body = resp.json()
        if body.get("code") != 200:
            logger.warning(f"[CLOUD-SYNC] 业务错: code={body.get('code')} msg={body.get('message')}")
            return {"error": body.get("message")}
        result = body.get("data") or {}
        logger.info(
            f"[CLOUD-SYNC] OK: total={result.get('total',0)} "
            f"created={result.get('created',0)} updated={result.get('updated',0)} "
            f"skipped={result.get('skipped',0)}"
        )

        # ★ v3.59.67:全部成功(无 error 项)→ 清空本地表 + 落首次迁移完成标志位
        # 之后用户在 web 改/删配置 C 端立刻反映,本地不再有"残留"
        details = result.get("details") or []
        has_err = any((d.get("action") == "error") for d in details)
        if not has_err:
            try:
                _db = await get_db()
                try:
                    await _db.execute("DELETE FROM llm_configs")
                    await _db.commit()
                finally:
                    await _db.close()
                await SettingsService.set(KEY_CLOUD_LLM_SYNCED_ONCE, "1")
                logger.info(
                    f"[CLOUD-SYNC] 首次迁移完成,已清空本地 llm_configs 表 + 落标志位 — "
                    f"以后用户在 web 改/删配置 C 端立刻反映"
                )
                result["local_cleared"] = True
            except Exception as _err:
                logger.warning(f"[CLOUD-SYNC] 清本地表失败(忽略,下次启动会重试): {_err}")
        else:
            err_count = sum(1 for d in details if d.get("action") == "error")
            logger.warning(
                f"[CLOUD-SYNC] 部分失败({err_count} 项 error),保留本地表等下次重试,不落迁移完成标志"
            )

        return result
    except Exception as e:
        logger.warning(f"[CLOUD-SYNC] 失败(已忽略): {type(e).__name__}: {e}")
        return {"error": str(e)}


# ============================================================
#  二、拉云端配置列表
# ============================================================
async def list_configs(config_type: str = "llm", force: bool = False) -> List[dict]:
    """30s 内存缓存,force=True 强刷。
    返回:[{ id, configType, providerCode, name, baseUrl, modelName,
              isDefault, enabled, updateTime, extraParams }]
    没 token / 调用失败 → 抛异常,业务侧 catch 后引导用户重新登录
    """
    require_cloud("云端模型配置列表")
    now = time.time()
    cached = _list_cache.get(config_type)
    if cached and not force and (now - cached["loaded_at"]) < _LIST_TTL:
        return cached["items"]

    if not force:
        inflight = _list_inflight.get(config_type)
        if inflight and not inflight.done():
            return await inflight

    async def _load() -> List[dict]:
        access_token = await _cts.get_access_token()  # 没 token 会抛 RuntimeError

        params = {"type": config_type, "taskType": _task_type_for_config_type(config_type)}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{QIANSHAN_API_BASE}/user/llm-configs/for-client",
                headers=_cts.headers(),
                params=params,
            )
            body = resp.json() if resp.headers.get("content-type", "").lower().startswith("application/json") else {}
            msg = (body.get("message") or "") if isinstance(body, dict) else ""
            if resp.status_code == 200 and isinstance(body, dict) and body.get("code") != 200 and _needs_team_header(msg):
                logger.info("[CLOUD-CFG] for-client 要求 X-Team-Id,按团队上下文重试 type=%s", config_type)
                resp = await client.get(
                    f"{QIANSHAN_API_BASE}/user/llm-configs/for-client",
                    headers=_cts.headers(include_team=True),
                    params=params,
                )
        resp.raise_for_status()
        body = resp.json()
        if body.get("code") != 200:
            raise RuntimeError(f"云端拉配置失败: {body.get('message')}")
        data = body.get("data") or {}
        items = data.get("items") or []
        _list_cache[config_type] = {
            "items": items,
            "default_id": data.get("defaultId"),
            "loaded_at": time.time(),
        }
        return items

    task = asyncio.create_task(_load())
    if not force:
        _list_inflight[config_type] = task
    try:
        return await task
    finally:
        if _list_inflight.get(config_type) is task:
            _list_inflight.pop(config_type, None)


# ============================================================
#  三、拉单条明文 Key
# ============================================================
async def _get_decrypted_key(config_id: int, config_type: str = "llm") -> str:
    require_cloud("云端模型密钥解密")
    now = time.time()
    task_type = _task_type_for_config_type(config_type)
    try:
        from services import team_context_service as _team_ctx
        _team_id = _team_ctx.get_team_id()
    except Exception:
        _team_id = None
    cache_key = (int(config_id), task_type, str(_team_id or ""))
    cached = _key_cache.get(cache_key)
    if cached and now < cached[1]:
        return cached[0]

    inflight = _key_inflight.get(cache_key)
    if inflight and not inflight.done():
        return await inflight

    async def _load() -> str:
        access_token = await _cts.get_access_token()

        params = {"taskType": task_type}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{QIANSHAN_API_BASE}/user/llm-configs/{config_id}/decrypt-key",
                headers=_cts.headers(),
                params=params,
            )
            body = resp.json() if resp.headers.get("content-type", "").lower().startswith("application/json") else {}
            msg = (body.get("message") or "") if isinstance(body, dict) else ""
            if resp.status_code == 200 and isinstance(body, dict) and body.get("code") != 200 and _needs_team_header(msg):
                logger.info("[CLOUD-CFG] decrypt-key 要求 X-Team-Id,按团队上下文重试 id=%s taskType=%s", config_id, task_type)
                resp = await client.get(
                    f"{QIANSHAN_API_BASE}/user/llm-configs/{config_id}/decrypt-key",
                    headers=_cts.headers(include_team=True),
                    params=params,
                )
        resp.raise_for_status()
        body = resp.json()
        if body.get("code") != 200:
            raise RuntimeError(f"云端拉 key 失败: {body.get('message')}")
        api_key = (body.get("data") or {}).get("apiKey", "")
        _key_cache[cache_key] = (api_key, time.time() + _KEY_TTL)
        return api_key

    task = asyncio.create_task(_load())
    _key_inflight[cache_key] = task
    try:
        return await task
    finally:
        if _key_inflight.get(cache_key) is task:
            _key_inflight.pop(cache_key, None)


# ============================================================
#  四、业务调用入口:拿一条完整可用配置(含明文 key)
# ============================================================
async def get_active_config(
    config_id: Optional[int] = None,
    config_type: str = "llm",
) -> Optional[dict]:
    """业务调 LLM/图片生成 前调这个。
    config_id=None → 用默认配置(isDefault=1,没有则第一条)
    返回 None 表示用户未配置(在 qianshanai.cn 个人中心还没添加)。

    返回字段:
        {
            "id": int,
            "name": str,
            "baseUrl": str,
            "modelName": str,
            "apiKey": str,            # 明文,只在内存
            "configType": str,
            "providerCode": str,      # ⭐ 路由判定关键字段(lingya/bltcy/wuyinkeji/...)
            "extraParams": dict,      # ⭐ 已 parse 的 dict,业务侧 merge 进调用 body
        }
    """
    # 万山离线模式仍允许用户显式配置的可信模型出网调用,但不依赖千山
    # 登录态/配置中心。这里复用本地 DPAPI 解密后的内存配置,不落明文。
    if not cloud_enabled():
        from services.llm_service import LLMService
        local = await LLMService._get_local_by_id(config_id) if config_id else None
        if not local or (config_type and local.get("config_type") != config_type):
            return None
        raw_extra = local.get("extra_params") or "{}"
        try:
            extra = json.loads(raw_extra) if isinstance(raw_extra, str) else (raw_extra or {})
        except Exception:
            extra = {}
        base_url = local.get("base_url") or ""
        provider = local.get("provider_code") or ""
        if not provider and ("ark" in base_url.lower() or "volces" in base_url.lower()):
            provider = "volcengine"
        return {
            "id": local.get("id"),
            "name": local.get("name") or f"配置#{local.get('id')}",
            "baseUrl": base_url,
            "modelName": local.get("model_name") or "",
            "apiKey": local.get("api_key") or "",
            "configType": local.get("config_type") or config_type,
            "providerCode": provider,
            "extraParams": extra if isinstance(extra, dict) else {},
        }

    items = await list_configs(config_type)
    if not items:
        return None

    if config_id:
        chosen = next((x for x in items if x.get("id") == config_id), None)
    else:
        chosen = next((x for x in items if x.get("isDefault") == 1), items[0])
    if not chosen:
        return None

    api_key = await _get_decrypted_key(chosen["id"], config_type=config_type)

    # ⭐ extraParams 是 JSON 字符串,parse 成 dict 给业务直接 merge 进 body
    raw_extra = chosen.get("extraParams") or ""
    extra: dict = {}
    if isinstance(raw_extra, str) and raw_extra.strip():
        try:
            parsed = json.loads(raw_extra)
            if isinstance(parsed, dict):
                extra = parsed
            else:
                logger.warning(f"[CLOUD-CFG] extraParams 不是 JSON 对象 id={chosen['id']}: {raw_extra[:80]}")
        except Exception as e:
            logger.warning(f"[CLOUD-CFG] extraParams 解析失败 id={chosen['id']}: {e}")
    elif isinstance(raw_extra, dict):
        extra = raw_extra

    return {
        "id": chosen["id"],
        "name": chosen.get("name") or f"配置#{chosen['id']}",
        "baseUrl": chosen.get("baseUrl") or "",
        "modelName": chosen.get("modelName") or "",
        "apiKey": api_key,
        "configType": chosen.get("configType") or "llm",
        "providerCode": chosen.get("providerCode") or "",
        "extraParams": extra,
    }


# ============================================================
#  五、退出登录 / 切账号
# ============================================================
def invalidate_cache() -> None:
    _list_cache.clear()
    _key_cache.clear()
    _list_inflight.clear()
    _key_inflight.clear()
    logger.info("[CLOUD-CFG] 缓存已清空")
