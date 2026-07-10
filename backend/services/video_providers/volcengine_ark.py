"""火山方舟 (Volcengine Ark) 视频生成 Provider — Seedance API

API 文档:
- 创建任务: POST /api/v3/contents/generations/tasks
- 查询任务: GET /api/v3/contents/generations/tasks/{id}
- 取消/删除: DELETE /api/v3/contents/generations/tasks/{id}
- 列表: GET /api/v3/contents/generations/tasks?filter.status=running

鉴权: Authorization: Bearer {api_key}

支持的模型:
- doubao-seedance-2-0-260128 / doubao-seedance-2-0-fast-260128
- doubao-seedance-1-5-pro-251215
"""
import asyncio
import base64
import logging
import mimetypes
import os
from typing import Optional, List, Dict, Any

import aiohttp
from utils.ssl_helper import get_aiohttp_connector
from services.trusted_providers import require_trusted_model_url

from .base import VideoProviderBase, ProviderType, SubmitResult, QueryResult
from utils.paths import resolve_db_path

logger = logging.getLogger(__name__)


# ==================== 默认基址 / 模型常量 ====================
DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"

# 模型大致能力(用于 UI 过滤、参数校验)
MODEL_CAPS = {
    "doubao-seedance-2-0-260128": {
        "duration_range": (4, 15),
        "resolutions": ["480p", "720p", "1080p"],
        "supports_audio": True,
        "supports_multimodal": True,
    },
    "doubao-seedance-2-0-fast-260128": {
        "duration_range": (4, 15),
        "resolutions": ["480p", "720p"],  # Fast 不支持 1080p
        "supports_audio": True,
        "supports_multimodal": True,
    },
    "doubao-seedance-1-5-pro-251215": {
        "duration_range": (4, 12),
        "resolutions": ["480p", "720p", "1080p"],
        "supports_audio": True,
        "supports_multimodal": False,
    },
}


class VolcengineArkProvider(VideoProviderBase):
    provider_type = ProviderType.VOLCENGINE_ARK

    def __init__(self, config: dict):
        super().__init__(config)
        self.base_url = require_trusted_model_url(config.get("base_url") or DEFAULT_BASE_URL)
        self.api_key = config.get("api_key") or ""
        self.model_id = config.get("model_name") or "doubao-seedance-2-0-260128"
        # 默认参数
        extra = config.get("extra_params") or {}
        if isinstance(extra, str):
            try:
                import json as _json
                extra = _json.loads(extra)
            except Exception:
                extra = {}
        self.default_params = extra if isinstance(extra, dict) else {}

    # ==================== HTTP 工具 ====================
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _post(self, path: str, payload: dict, timeout: int = 60) -> dict:
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=timeout)) as sess:
            async with sess.post(url, headers=self._headers(), json=payload) as resp:
                text = await resp.text()
                try:
                    body = await resp.json(content_type=None) if text else {}
                except Exception:
                    body = {"raw_text": text}
                return {"status_code": resp.status, "body": body}

    async def _get(self, path: str, timeout: int = 30) -> dict:
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=timeout)) as sess:
            async with sess.get(url, headers=self._headers()) as resp:
                text = await resp.text()
                try:
                    body = await resp.json(content_type=None) if text else {}
                except Exception:
                    body = {"raw_text": text}
                return {"status_code": resp.status, "body": body}

    async def _delete(self, path: str, timeout: int = 30) -> dict:
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=timeout)) as sess:
            async with sess.delete(url, headers=self._headers()) as resp:
                text = await resp.text()
                try:
                    body = await resp.json(content_type=None) if text else {}
                except Exception:
                    body = {"raw_text": text}
                return {"status_code": resp.status, "body": body}

    # ==================== 图片本地路径 → base64 ====================
    @staticmethod
    def _image_to_data_url(path_or_url: str) -> Optional[str]:
        """把本地路径或 URL 转成火山方舟接受的形式
        - URL 开头 http:// / https:// → 直接返回
        - asset:// 开头(火山私域素材库,v3.61.99 加白入库) → 直接返回(火山原生支持)
        - 本地路径 → base64 data URL
        """
        if not path_or_url:
            return None
        if path_or_url.startswith(("http://", "https://", "data:", "asset://")):
            return path_or_url

        # 解析本地路径
        abs_path = resolve_db_path(path_or_url)
        if not abs_path or not os.path.exists(abs_path):
            logger.warning(f"[ark] 图片不存在: {path_or_url} -> {abs_path}")
            return None

        # 检查大小(火山方舟单图上限 30MB,base64 后约 40MB,逼近 64MB 请求体上限)
        size = os.path.getsize(abs_path)
        if size > 25 * 1024 * 1024:
            logger.warning(f"[ark] 图片过大({size/1024/1024:.1f}MB),跳过: {abs_path}")
            return None

        try:
            with open(abs_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            mime, _ = mimetypes.guess_type(abs_path)
            mime = (mime or "image/jpeg").lower()
            # 火山方舟要求小写
            mime = mime.replace("image/jpg", "image/jpeg")
            return f"data:{mime};base64,{b64}"
        except Exception as e:
            logger.error(f"[ark] 编码图片失败 {abs_path}: {e}")
            return None

    @staticmethod
    def _audio_to_data_url(path_or_url: str) -> Optional[str]:
        if not path_or_url:
            return None
        if path_or_url.startswith(("http://", "https://", "data:")):
            return path_or_url
        abs_path = resolve_db_path(path_or_url)
        if not abs_path or not os.path.exists(abs_path):
            logger.warning(f"[ark] 音频不存在: {path_or_url}")
            return None
        size = os.path.getsize(abs_path)
        if size > 12 * 1024 * 1024:
            logger.warning(f"[ark] 音频过大({size/1024/1024:.1f}MB),跳过")
            return None
        try:
            with open(abs_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            ext = os.path.splitext(abs_path)[1].lower().lstrip(".")
            if ext == "mp3":
                mime = "audio/mp3"
            elif ext == "wav":
                mime = "audio/wav"
            else:
                mime = "audio/mp3"
            return f"data:{mime};base64,{b64}"
        except Exception as e:
            logger.error(f"[ark] 编码音频失败 {abs_path}: {e}")
            return None

    # ==================== 接口实现 ====================
    async def submit(
        self,
        prompt: str,
        images: Optional[List[str]] = None,
        audios: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> SubmitResult:
        if not self.api_key:
            return SubmitResult(
                success=False,
                fail_reason="未配置火山方舟 API Key,请到千山AI个人中心补全",
                error_code="UNKNOWN",
            )

        params = params or {}
        images = [i for i in (images or []) if i]
        audios = [a for a in (audios or []) if a]

        # 构建 content 数组
        content: List[dict] = []

        # 1. 文本(必填)
        if prompt:
            content.append({"type": "text", "text": prompt})

        # 2. 图片(0~9 张)
        # v3.61.9: 火山方舟规则 — first_frame/last_frame 模式不能跟 reference_* 混搭
        # 工具的常见场景是"多张参考图(角色/场景/道具)+ 角色音频"→ 统一用 reference_image
        # 只有用户明确选 image2video / first_last_frame 模式时才用 first_frame
        gen_mode = (params.get("generation_mode") or "").lower()
        has_audio = bool(audios)
        explicit_first_frame = (gen_mode == "image2video" and len(images) == 1 and not has_audio)
        explicit_first_last = (gen_mode == "first_last_frame" and len(images) == 2 and not has_audio)

        if explicit_first_frame:
            roles = ["first_frame"]
        elif explicit_first_last:
            roles = ["first_frame", "last_frame"]
        else:
            # 默认全部当 reference_image(可与 reference_audio 共存)
            roles = ["reference_image"] * len(images)

        for img, role in zip(images[:9], roles):
            data_url = self._image_to_data_url(img)
            if not data_url:
                continue
            item = {
                "type": "image_url",
                "image_url": {"url": data_url},
            }
            if role:
                item["role"] = role
            content.append(item)

        # 3. 音频(0~3 段,Seedance 2.0 系列才支持)
        caps = MODEL_CAPS.get(self.model_id, {})
        if caps.get("supports_audio"):
            for au in audios[:3]:
                data_url = self._audio_to_data_url(au)
                if not data_url:
                    continue
                content.append({
                    "type": "audio_url",
                    "audio_url": {"url": data_url},
                    "role": "reference_audio",
                })

        # v3.61.73 关键修复:防 HTTP 413 "Request Entity Too Large"
        # 火山方舟整体请求体上限约 30-40MB,多张参考图 + 多段音频堆叠很容易超
        # 实测 images=5 audios=3 base64 后能达 30MB+,触发 413
        # 策略:计算总 base64 大小,超 25MB 时按"反向"丢弃 — 末尾的次要资源(音频→道具图→场景图)先丢
        # 文本 + first_frame/last_frame + 前 2 张 reference_image 必保
        MAX_TOTAL_BYTES = 25 * 1024 * 1024  # 25MB,留出 5MB 给 JSON 包装 / 头部

        def _estimate_size(item: dict) -> int:
            """估算单个 content item 的字节占用(base64 长度)"""
            if not isinstance(item, dict):
                return 0
            for k in ("image_url", "audio_url"):
                v = item.get(k)
                if isinstance(v, dict):
                    url = v.get("url") or ""
                    return len(url)
            txt = item.get("text") or ""
            return len(txt.encode("utf-8"))

        total = sum(_estimate_size(c) for c in content)
        if total > MAX_TOTAL_BYTES:
            logger.warning(
                f"[ark] payload 总大小 {total/1024/1024:.1f}MB 超 25MB 阈值,开始按优先级丢弃次要资源"
            )
            # 优先级倒序丢:
            # 1. reference_audio 末尾的(保留前 1 段最重要的)
            # 2. reference_image 末尾的(保留前 2 张 — 通常前 2 张是上一镜尾帧/主角色)
            # 3. 实在不行,极端情况只保留文本(应该不会发生,前置已限单图 25MB)
            def _drop_lowest_priority(_content: List[dict]) -> bool:
                """从末尾找一个能丢的非必需资源 → 丢 → 返回是否成功"""
                # 倒序找最后一个 audio
                for idx in range(len(_content) - 1, -1, -1):
                    if _content[idx].get("type") == "audio_url":
                        dropped = _content.pop(idx)
                        logger.warning(f"[ark] 丢弃音频 #{idx}: {_estimate_size(dropped)/1024:.0f}KB")
                        return True
                # 数 image 数量
                img_indices = [i for i, c in enumerate(_content) if c.get("type") == "image_url"]
                if len(img_indices) > 2:
                    # 丢最后一张(末尾的多半是道具/场景图,前几张是尾帧/角色)
                    idx = img_indices[-1]
                    dropped = _content.pop(idx)
                    logger.warning(f"[ark] 丢弃图片 #{idx}: {_estimate_size(dropped)/1024:.0f}KB")
                    return True
                return False  # 不能再丢了

            while sum(_estimate_size(c) for c in content) > MAX_TOTAL_BYTES:
                if not _drop_lowest_priority(content):
                    break  # 兜底:已经丢到只剩必需资源,还超就只能让上游报错
            final_total = sum(_estimate_size(c) for c in content)
            logger.warning(f"[ark] 精简后 payload {final_total/1024/1024:.1f}MB")
            if final_total > MAX_TOTAL_BYTES:
                return SubmitResult(
                    success=False,
                    fail_reason=f"参考资料过大({final_total/1024/1024:.1f}MB)无法精简到 25MB 以内,请减少参考图/音频或压缩文件",
                    error_code="PAYLOAD_TOO_LARGE",
                )

        # 4. 顶层参数
        payload: Dict[str, Any] = {
            "model": self.model_id,
            "content": content,
        }

        # duration / ratio / resolution / watermark / generate_audio / return_last_frame
        duration = params.get("duration", self.default_params.get("duration", 5))
        if duration is not None:
            try:
                payload["duration"] = int(duration)
            except Exception:
                pass

        ratio = params.get("ratio") or self.default_params.get("ratio")
        if ratio:
            payload["ratio"] = ratio

        resolution = params.get("resolution") or self.default_params.get("resolution")
        if resolution:
            payload["resolution"] = str(resolution).lower()  # 火山方舟要求小写

        if "watermark" in params:
            payload["watermark"] = bool(params["watermark"])
        elif "watermark" in self.default_params:
            payload["watermark"] = bool(self.default_params["watermark"])

        if "generate_audio" in params:
            payload["generate_audio"] = bool(params["generate_audio"])
        elif "generate_audio" in self.default_params:
            payload["generate_audio"] = bool(self.default_params["generate_audio"])

        # 串行尾帧:用户开启时自动 return_last_frame=true
        if params.get("use_chain_frame") or params.get("return_last_frame"):
            payload["return_last_frame"] = True

        if "seed" in params:
            payload["seed"] = int(params["seed"])

        # service_tier — v3.61.8: 火山方舟限制
        # Seedance 2.0/2.0fast 在多模态参考(r2v)模式下不支持 service_tier,必须为空
        # 实测错误: "service_tier is not supported for model doubao-seedance-2-0 in r2v"
        # 安全做法: 只有用户传了非默认值且模型不是 seedance 2.0 时才加
        _has_image_or_audio = any(
            isinstance(c, dict) and c.get("type") in ("image_url", "audio_url")
            for c in content
        )
        _is_seedance_2 = "seedance-2-0" in self.model_id.lower() or "seedance2.0" in self.model_id.lower()
        # 多模态参考模式 + Seedance 2.0 系列 → 不传 service_tier
        if not (_has_image_or_audio and _is_seedance_2):
            if params.get("service_tier"):
                payload["service_tier"] = params["service_tier"]
            elif self.default_params.get("service_tier"):
                payload["service_tier"] = self.default_params["service_tier"]

        # v3.61.183: 给 SubmitResult.sanitized_payload 拼摘要 — 上层入 llm_logs 用
        #   ARK payload content 含 image_url(asset:// 或 https://火山私域 URI),不含 base64,可原样存
        #   不复用 xinglian 的 _sanitize_payload_for_log(那是为 base64 设计的),这里 ARK 不需要
        sanitized_payload_full: Dict[str, Any] = {
            "provider": "volcengine_ark",
            "model": self.model_id,
            "prompt_text_only": next(
                (c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"),
                "",
            ),
            "duration": payload.get("duration"),
            "ratio": payload.get("ratio"),
            "resolution": payload.get("resolution"),
            "watermark": payload.get("watermark"),
            "generate_audio": payload.get("generate_audio"),
            "return_last_frame": payload.get("return_last_frame"),
            "service_tier": payload.get("service_tier"),
            "content_summary": [
                {
                    "type": c.get("type"),
                    "role": c.get("role"),
                    "url": (c.get("image_url") or c.get("audio_url") or {}).get("url", "")[:200]
                            if isinstance(c, dict) and isinstance(c.get("image_url") or c.get("audio_url"), dict)
                            else None,
                }
                for c in content
                if isinstance(c, dict) and c.get("type") in ("image_url", "audio_url")
            ],
            "_stats": {
                "image_count": sum(1 for c in content if isinstance(c, dict) and c.get("type") == "image_url"),
                "audio_count": sum(1 for c in content if isinstance(c, dict) and c.get("type") == "audio_url"),
            },
        }

        # 调接口
        try:
            resp = await self._post("/contents/generations/tasks", payload, timeout=60)
        except Exception as e:
            logger.error(f"[ark] submit 网络异常: {e}", exc_info=True)
            return SubmitResult(
                success=False,
                fail_reason=f"网络异常: {e}",
                error_code="NETWORK",
                sanitized_payload=sanitized_payload_full,
            )

        sc = resp.get("status_code", 0)
        body = resp.get("body") or {}

        if sc == 200 or sc == 201:
            task_id = body.get("id")
            if task_id:
                logger.info(f"[ark] 提交成功 task_id={task_id} model={self.model_id}")
                return SubmitResult(
                    success=True, submit_id=task_id, raw=body,
                    sanitized_payload=sanitized_payload_full,
                )
            return SubmitResult(
                success=False,
                fail_reason=f"火山方舟返回成功但缺 id: {body}",
                error_code="UNKNOWN",
                raw=body,
                sanitized_payload=sanitized_payload_full,
            )

        # 失败处理
        err = (body or {}).get("error") or {}
        err_code = err.get("code") or str(sc)
        err_msg = err.get("message") or str(body)[:300]
        friendly, classified = self._translate_ark_error(sc, err_code, err_msg)
        logger.warning(f"[ark] 提交失败 sc={sc} code={err_code} msg={err_msg}")
        return SubmitResult(
            success=False,
            fail_reason=friendly,
            error_code=classified,
            raw=body,
            sanitized_payload=sanitized_payload_full,
        )

    async def query(self, submit_id: str) -> QueryResult:
        try:
            resp = await self._get(f"/contents/generations/tasks/{submit_id}", timeout=30)
        except Exception as e:
            logger.warning(f"[ark] query 网络异常: {e}")
            return QueryResult(status="running", fail_reason=str(e), error_code="NETWORK")

        sc = resp.get("status_code", 0)
        body = resp.get("body") or {}

        if sc != 200:
            err = (body or {}).get("error") or {}
            return QueryResult(
                status="fail",
                fail_reason=err.get("message") or f"查询失败 HTTP {sc}",
                error_code=str(err.get("code") or sc),
                raw=body,
            )

        # 火山方舟状态: queued / running / succeeded / failed / cancelled / expired
        status_raw = (body.get("status") or "").lower()
        # 映射到统一 4 态
        if status_raw == "succeeded":
            status = "success"
        elif status_raw in ("failed", "expired", "cancelled"):
            status = "fail"
        elif status_raw in ("queued", "running"):
            status = "running"
        else:
            status = "running"  # 未知状态当 running 处理

        content = body.get("content") or {}
        video_url = content.get("video_url") if isinstance(content, dict) else None
        last_frame_url = content.get("last_frame_url") if isinstance(content, dict) else None
        duration = float(body.get("duration") or 0)

        fail_reason = None
        err_code = None
        if status == "fail":
            err = body.get("error") or {}
            fail_reason = err.get("message") or f"任务{status_raw}"
            err_code = err.get("code")
            # 翻译
            friendly, _ = self._translate_ark_error(0, err_code or "", fail_reason)
            fail_reason = friendly

        return QueryResult(
            status=status,
            video_url=video_url,
            last_frame_url=last_frame_url,
            duration=duration,
            fail_reason=fail_reason,
            error_code=err_code,
            raw=body,
        )

    async def cancel(self, submit_id: str) -> bool:
        try:
            resp = await self._delete(f"/contents/generations/tasks/{submit_id}", timeout=30)
            return resp.get("status_code", 0) in (200, 204)
        except Exception as e:
            logger.warning(f"[ark] cancel 失败: {e}")
            return False

    async def list_active(self) -> List[Dict[str, Any]]:
        """列出 running 状态的任务,用于并发控制"""
        try:
            resp = await self._get(
                "/contents/generations/tasks?filter.status=running&page_size=50",
                timeout=15,
            )
            if resp.get("status_code") != 200:
                return []
            body = resp.get("body") or {}
            items = body.get("items") or []
            return [
                {
                    "submit_id": it.get("id"),
                    "status": "running",
                    "created_at": it.get("created_at"),
                }
                for it in items
                if isinstance(it, dict)
            ]
        except Exception as e:
            logger.warning(f"[ark] list_active 失败: {e}")
            return []

    async def check_login(self) -> Dict[str, Any]:
        """火山方舟没有"登录"概念,用 list_tasks 探活验证 API Key 有效"""
        if not self.api_key:
            return {
                "success": False,
                "logged_in": False,
                "balance": 0,
                "message": "未配置 API Key",
            }
        try:
            resp = await self._get(
                "/contents/generations/tasks?page_size=1",
                timeout=10,
            )
            sc = resp.get("status_code", 0)
            if sc == 200:
                return {
                    "success": True,
                    "logged_in": True,
                    "balance": -1,  # 火山方舟按 token 后付费,无余额概念
                    "message": "API Key 有效",
                }
            err = (resp.get("body") or {}).get("error") or {}
            return {
                "success": False,
                "logged_in": False,
                "balance": 0,
                "message": err.get("message") or f"HTTP {sc}",
            }
        except Exception as e:
            return {
                "success": False,
                "logged_in": False,
                "balance": 0,
                "message": str(e),
            }

    # ==================== 错误翻译 ====================
    @staticmethod
    def _translate_ark_error(http_status: int, code: str, message: str) -> tuple:
        """返回 (友好中文, 归一化错误码)"""
        code_str = (code or "").lower()
        msg_low = (message or "").lower()

        # 鉴权
        if http_status == 401 or "unauthorized" in msg_low or "invalid api key" in msg_low:
            return ("火山方舟 API Key 无效或已过期,请到千山AI个人中心检查", "AUTH")

        # 限速
        if http_status == 429 or "rate" in code_str or "限速" in message or "too many" in msg_low:
            return ("火山方舟 RPM 限速,稍候再试", "RATE_LIMIT")

        # 余额 / 配额
        if "insufficient" in msg_low or "quota" in msg_low or "余额" in message:
            return ("火山方舟账户余额不足,请到火山控制台充值", "BALANCE")

        # v3.61.13: 真人脸专项识别 — Seedance 2.0 系列禁用真人参考图
        if "real person" in msg_low or "real_person" in msg_low or "human face" in msg_low:
            return (
                "参考图被识别为含真人人脸 — Seedance 2.0 系列不允许真人参考图。\n"
                "解决方法:\n"
                "  1) 换成漫画/卡通/Q版风格的角色图\n"
                "  2) 切回即梦CLI模式生成\n"
                "  3) 换 Seedance 1.5 Pro 模型(允许真人)",
                "REVIEW"
            )

        # 内容审核
        if (
            "content" in code_str and ("policy" in code_str or "violation" in code_str or "rejected" in msg_low)
        ) or "审核" in message or "敏感" in message or "compliance" in msg_low:
            return ("内容审核未通过(可能含敏感内容/真人人脸),请修改提示词或参考图后重试", "REVIEW")

        # v3.61.41: 参考音频总时长超限(火山方舟 r2v 模式要求音频总时长 ≤ 视频时长)
        if (
            "audio total duration" in msg_low
            or ("audio" in msg_low and "must be less than" in msg_low)
            or ("audio" in msg_low and "duration" in msg_low and ("seconds" in msg_low or "total" in msg_low))
        ):
            # 尝试从消息里提取限制值,如 "must be less than or equal to 15.2"
            import re as _re
            m = _re.search(r"less than or equal to ([\d.]+)", message or "")
            limit_str = m.group(1) if m else "视频时长"
            return (
                f"参考音频总时长超限 — 火山方舟要求所有参考音频加起来 ≤ {limit_str} 秒(对齐视频时长)。\n"
                "解决方法:\n"
                "  1) 缩短或删除该分镜的参考音频\n"
                "  2) 把音频拆成多段更短的\n"
                "  3) 增大视频时长(在顶部秒数那边改)\n"
                "  4) 不需要语音同步可关掉「合同步音频」选项",
                "INVALID_PARAM"
            )

        # 模型不支持的参数
        if "invalid" in msg_low and ("ratio" in msg_low or "resolution" in msg_low or "duration" in msg_low):
            return (f"参数不被当前模型支持: {message}", "INVALID_PARAM")

        # 任务超时(火山方舟侧)
        if "expired" in msg_low or "timeout" in msg_low:
            return ("任务在火山方舟侧超时,可重新提交", "TIMEOUT")

        # 服务端错误
        if http_status >= 500:
            return (f"火山方舟服务异常 (HTTP {http_status}),稍后重试", "NETWORK")

        # 默认
        return (f"火山方舟错误: {message}", "UNKNOWN")
