"""MiniMax H3 多模态参考生视频 Provider。

官方 V2 接口：
- POST /v2/video_generation
- GET  /v2/query/video_generation/{task_id}

本适配器只负责供应商差异：素材转 data URI、H3 参数校验、提交和查询。
分镜素材排序、提示词投影、队列、下载与尾帧抽取继续复用项目统一链路。
"""

import asyncio
import base64
import json
import logging
import mimetypes
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import aiohttp

from utils.paths import resolve_db_path
from utils.ssl_helper import get_aiohttp_connector

from .base import QueryResult, SubmitResult, VideoProviderBase


logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.minimaxi.com"
MODEL_NAME = "MiniMax-H3"
DEFAULT_RESOLUTION = "2K"
ALLOWED_RESOLUTIONS = {"768P", "2K"}
ALLOWED_RATIOS = {"adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov"}

MAX_PROMPT_CHARS = 7000
MAX_IMAGES = 9
MAX_AUDIOS = 3
MAX_VIDEOS = 3
MAX_IMAGE_BYTES = 30 * 1024 * 1024
MAX_AUDIO_BYTES = 15 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024
MAX_REQUEST_BYTES = 64 * 1024 * 1024
MIN_MEDIA_DIMENSION = 256
MAX_MEDIA_DIMENSION = 5760
MIN_ASPECT_RATIO = 0.4
MAX_ASPECT_RATIO = 2.5
MIN_REFERENCE_DURATION = 2.0
MAX_REFERENCE_DURATION = 15.0
MAX_TOTAL_REFERENCE_DURATION = 15.0


def _sanitize_for_log(value: Any) -> Any:
    """移除日志中的 Base64 正文和签名 URL 查询参数。"""
    if isinstance(value, dict):
        return {key: _sanitize_for_log(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_for_log(item) for item in value]
    if isinstance(value, str):
        if value.startswith("data:"):
            mime = value[5:value.find(";")] if ";" in value else "media"
            body_len = len(value.split(",", 1)[1]) if "," in value else len(value)
            return f"<data:{mime};base64 len={body_len}>"
        if value.startswith(("http://", "https://")):
            return value.split("?", 1)[0]
    return value


class MiniMaxH3Provider(VideoProviderBase):
    provider_type = "minimax_h3"

    def __init__(self, config: dict):
        super().__init__(config)
        self.api_key = str(config.get("api_key") or config.get("access_key") or "").strip()
        self.base_url = self._normalize_base_url(config.get("base_url"))
        self.model_name = MODEL_NAME
        extra = config.get("extra_params") or {}
        if isinstance(extra, str):
            try:
                extra = json.loads(extra)
            except Exception:
                extra = {}
        self.default_params = extra if isinstance(extra, dict) else {}

    @staticmethod
    def _normalize_base_url(raw: Optional[str]) -> str:
        value = str(raw or DEFAULT_BASE_URL).strip().rstrip("/")
        for suffix in ("/v2/video_generation", "/v2"):
            if value.endswith(suffix):
                value = value[: -len(suffix)]
                break
        return value or DEFAULT_BASE_URL

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _post(self, path: str, payload: Dict[str, Any], timeout: int = 180) -> Dict[str, Any]:
        async with aiohttp.ClientSession(
            connector=get_aiohttp_connector(),
            timeout=aiohttp.ClientTimeout(total=timeout),
        ) as session:
            async with session.post(
                f"{self.base_url}{path}",
                headers=self._headers(),
                json=payload,
            ) as response:
                text = await response.text()
                try:
                    body = json.loads(text) if text else {}
                except Exception:
                    body = {"raw_text": text[:1000]}
                return {"status_code": response.status, "body": body}

    async def _get(self, path: str, timeout: int = 60) -> Dict[str, Any]:
        async with aiohttp.ClientSession(
            connector=get_aiohttp_connector(),
            timeout=aiohttp.ClientTimeout(total=timeout),
        ) as session:
            async with session.get(
                f"{self.base_url}{path}",
                headers=self._headers(),
            ) as response:
                text = await response.text()
                try:
                    body = json.loads(text) if text else {}
                except Exception:
                    body = {"raw_text": text[:1000]}
                return {"status_code": response.status, "body": body}

    @staticmethod
    def _local_path(path_or_url: str) -> Optional[str]:
        if not path_or_url or path_or_url.startswith(("http://", "https://", "data:", "mm_file://")):
            return None
        if path_or_url.startswith("asset://"):
            return None
        if re.match(r"^[A-Za-z]:[/\\]", path_or_url):
            return os.path.abspath(path_or_url)
        return resolve_db_path(path_or_url)

    @staticmethod
    def _data_uri_size(value: str) -> Optional[int]:
        if not value.startswith("data:") or "," not in value:
            return None
        encoded = value.split(",", 1)[1]
        try:
            return max(0, (len(encoded) * 3) // 4 - encoded.count("="))
        except Exception:
            return None

    @staticmethod
    def _mime_for(ext: str, kind: str) -> str:
        ext = ext.lower()
        if kind == "image":
            return {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
                ".heic": "image/heic",
                ".heif": "image/heif",
            }.get(ext, mimetypes.guess_type(f"x{ext}")[0] or "application/octet-stream")
        if kind == "audio":
            return ".mp3" == ext and "audio/mp3" or "audio/wav"
        return "video/mp4" if ext == ".mp4" else "video/quicktime"

    @staticmethod
    def _image_dimension_error(path: str) -> Optional[str]:
        try:
            from PIL import Image

            with Image.open(path) as image:
                width, height = image.size
        except Exception as exc:
            return f"无法读取图片尺寸({type(exc).__name__})"
        if not (MIN_MEDIA_DIMENSION <= width <= MAX_MEDIA_DIMENSION):
            return f"图片宽度 {width}px 超出 {MIN_MEDIA_DIMENSION}-{MAX_MEDIA_DIMENSION}px"
        if not (MIN_MEDIA_DIMENSION <= height <= MAX_MEDIA_DIMENSION):
            return f"图片高度 {height}px 超出 {MIN_MEDIA_DIMENSION}-{MAX_MEDIA_DIMENSION}px"
        ratio = width / max(1, height)
        if ratio < MIN_ASPECT_RATIO or ratio > MAX_ASPECT_RATIO:
            return f"图片宽高比 {ratio:.3f} 超出 {MIN_ASPECT_RATIO}-{MAX_ASPECT_RATIO}"
        return None

    @staticmethod
    def _probe_duration(path: str) -> Optional[float]:
        try:
            from api.extraction import _probe_audio_duration_seconds

            return _probe_audio_duration_seconds(path)
        except Exception:
            return None

    @classmethod
    def _encode_local_media_sync(
        cls,
        path_or_url: str,
        *,
        kind: str,
        allowed_extensions: set,
        max_bytes: int,
    ) -> Tuple[Optional[str], Optional[Dict[str, Any]], Optional[str]]:
        value = str(path_or_url or "").strip()
        if not value:
            return None, None, "素材路径为空"
        if value.startswith(("http://", "https://", "mm_file://")):
            return value, {"source": "remote", "url": value.split("?", 1)[0]}, None
        if value.startswith("data:"):
            raw_size = cls._data_uri_size(value)
            if raw_size is not None and raw_size > max_bytes:
                return None, None, f"Base64 素材 {raw_size / 1024 / 1024:.1f}MB 超过单文件上限"
            return value, {"source": "data_uri", "bytes": raw_size}, None
        if value.startswith("asset://"):
            return None, None, "MiniMax 不支持火山私域 asset:// 素材"

        path = cls._local_path(value)
        if not path or not os.path.isfile(path):
            return None, None, f"本地素材不存在: {value}"
        ext = os.path.splitext(path)[1].lower()
        if ext not in allowed_extensions:
            return None, None, f"{kind}格式 {ext or '未知'} 不受 MiniMax H3 支持"
        size = os.path.getsize(path)
        if size > max_bytes:
            return None, None, f"{os.path.basename(path)} 为 {size / 1024 / 1024:.1f}MB，超过上限 {max_bytes // 1024 // 1024}MB"
        if kind == "image":
            dimension_error = cls._image_dimension_error(path)
            if dimension_error:
                return None, None, f"{os.path.basename(path)}: {dimension_error}"

        try:
            with open(path, "rb") as file_obj:
                raw = file_obj.read()
        except Exception as exc:
            return None, None, f"读取素材失败: {type(exc).__name__}: {exc}"
        mime = cls._mime_for(ext, kind)
        encoded = base64.b64encode(raw).decode("ascii")
        return (
            f"data:{mime};base64,{encoded}",
            {
                "source": "local",
                "name": os.path.basename(path),
                "bytes": size,
                "mime": mime,
            },
            None,
        )

    async def _encode_many(
        self,
        values: List[str],
        *,
        kind: str,
        allowed_extensions: set,
        max_bytes: int,
    ) -> Tuple[List[str], List[Dict[str, Any]], Optional[str]]:
        urls: List[str] = []
        summaries: List[Dict[str, Any]] = []
        for index, value in enumerate(values, start=1):
            url, summary, error = await asyncio.to_thread(
                self._encode_local_media_sync,
                value,
                kind=kind,
                allowed_extensions=allowed_extensions,
                max_bytes=max_bytes,
            )
            if error:
                return [], [], f"第 {index} 个{ {'image': '图片', 'audio': '音频', 'video': '视频'}[kind] }不可用: {error}"
            if url and summary:
                urls.append(url)
                summaries.append(summary)
        return urls, summaries, None

    @staticmethod
    def _extract_error(body: Any) -> Tuple[str, str]:
        if not isinstance(body, dict):
            return str(body or "未知错误")[:500], ""
        error = body.get("error")
        if isinstance(error, dict):
            return str(error.get("message") or body.get("message") or "未知错误"), str(error.get("type") or error.get("code") or "")
        if error:
            return str(error), ""
        return str(body.get("message") or body.get("raw_text") or body)[:500], ""

    @classmethod
    def _translate_http_error(cls, status_code: int, body: Any) -> Tuple[str, str]:
        message, upstream_type = cls._extract_error(body)
        if status_code == 400:
            return f"MiniMax H3 参数错误: {message}", "INVALID_PARAM"
        if status_code == 401:
            return "MiniMax API Key 无效或已失效，请重新保存 Key", "AUTH"
        if status_code == 402:
            return "MiniMax 账户余额或额度不足，请充值后重试", "BALANCE"
        if status_code == 422:
            return f"MiniMax H3 内容审核未通过: {message}", "REVIEW"
        if status_code == 429:
            return f"MiniMax H3 请求过于频繁: {message}", "RATE_LIMIT"
        if status_code in (500, 502, 503, 504, 529):
            return f"MiniMax H3 服务繁忙: {message}", "NETWORK"
        return f"MiniMax H3 HTTP {status_code}: {message or upstream_type}", "UNKNOWN"

    async def submit(
        self,
        prompt: str,
        images: Optional[List[str]] = None,
        audios: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> SubmitResult:
        if not self.api_key:
            return SubmitResult(False, fail_reason="未配置 MiniMax API Key", error_code="AUTH")

        final_prompt = str(prompt or "").strip()
        if not final_prompt:
            return SubmitResult(False, fail_reason="MiniMax H3 提示词不能为空", error_code="INVALID_PARAM")
        if len(final_prompt) > MAX_PROMPT_CHARS:
            return SubmitResult(
                False,
                fail_reason=f"MiniMax H3 提示词最多 {MAX_PROMPT_CHARS} 字符，当前 {len(final_prompt)} 字符",
                error_code="INVALID_PARAM",
            )

        params = {**self.default_params, **(params or {})}
        images = [str(item).strip() for item in (images or []) if str(item or "").strip()]
        audios = [str(item).strip() for item in (audios or []) if str(item or "").strip()]
        reference_videos = [
            str(item).strip()
            for item in (params.get("reference_videos") or [])
            if str(item or "").strip()
        ]

        if len(images) > MAX_IMAGES:
            return SubmitResult(False, fail_reason=f"MiniMax H3 参考图最多 {MAX_IMAGES} 张，当前 {len(images)} 张", error_code="INVALID_PARAM")
        if len(audios) > MAX_AUDIOS:
            return SubmitResult(False, fail_reason=f"MiniMax H3 参考音频最多 {MAX_AUDIOS} 段，当前 {len(audios)} 段", error_code="INVALID_PARAM")
        if len(reference_videos) > MAX_VIDEOS:
            return SubmitResult(False, fail_reason=f"MiniMax H3 参考视频最多 {MAX_VIDEOS} 段，当前 {len(reference_videos)} 段", error_code="INVALID_PARAM")
        if audios and not (images or reference_videos):
            return SubmitResult(
                False,
                fail_reason="MiniMax H3 多模态模式不可只传音频；请至少启用 1 张参考图或 1 段参考视频",
                error_code="INVALID_PARAM",
            )

        raw_duration = params.get("duration", 5)
        try:
            duration_number = float(raw_duration)
        except (TypeError, ValueError):
            duration_number = -1.0
        if not duration_number.is_integer():
            return SubmitResult(False, fail_reason=f"MiniMax H3 时长必须为整数秒，当前 {raw_duration}", error_code="INVALID_PARAM")
        duration = int(duration_number)
        if duration < 4 or duration > 15:
            return SubmitResult(False, fail_reason=f"MiniMax H3 生成时长仅支持 4-15 秒，当前 {duration} 秒", error_code="INVALID_PARAM")

        resolution = str(params.get("resolution") or DEFAULT_RESOLUTION).upper()
        if resolution not in ALLOWED_RESOLUTIONS:
            return SubmitResult(
                False,
                fail_reason=f"MiniMax H3 不支持 {resolution}，可选: 768P、2K",
                error_code="INVALID_PARAM",
            )

        ratio = str(params.get("ratio") or "9:16").strip()
        if ratio not in ALLOWED_RATIOS:
            return SubmitResult(False, fail_reason=f"MiniMax H3 不支持画面比例 {ratio}", error_code="INVALID_PARAM")
        if not (images or audios or reference_videos) and ratio == "adaptive":
            return SubmitResult(False, fail_reason="MiniMax H3 文生视频必须选择明确比例，不能使用 adaptive", error_code="INVALID_PARAM")

        image_urls, image_summaries, error = await self._encode_many(
            images,
            kind="image",
            allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
            max_bytes=MAX_IMAGE_BYTES,
        )
        if error:
            return SubmitResult(False, fail_reason=error, error_code="INVALID_PARAM")

        audio_urls, audio_summaries, error = await self._encode_many(
            audios,
            kind="audio",
            allowed_extensions=ALLOWED_AUDIO_EXTENSIONS,
            max_bytes=MAX_AUDIO_BYTES,
        )
        if error:
            return SubmitResult(False, fail_reason=error, error_code="INVALID_PARAM")

        video_urls, video_summaries, error = await self._encode_many(
            reference_videos,
            kind="video",
            allowed_extensions=ALLOWED_VIDEO_EXTENSIONS,
            max_bytes=MAX_VIDEO_BYTES,
        )
        if error:
            return SubmitResult(False, fail_reason=error, error_code="INVALID_PARAM")

        local_audio_durations: List[float] = []
        for original in audios:
            local_path = self._local_path(original)
            if not local_path or not os.path.isfile(local_path):
                continue
            measured = await asyncio.to_thread(self._probe_duration, local_path)
            if measured is None:
                continue
            if measured < MIN_REFERENCE_DURATION or measured > MAX_REFERENCE_DURATION:
                return SubmitResult(
                    False,
                    fail_reason=(
                        f"MiniMax H3 单条参考音频需为 2-15 秒；"
                        f"{os.path.basename(local_path)} 当前 {measured:.2f} 秒"
                    ),
                    error_code="INVALID_PARAM",
                )
            local_audio_durations.append(float(measured))
        if sum(local_audio_durations) > MAX_TOTAL_REFERENCE_DURATION:
            return SubmitResult(
                False,
                fail_reason=f"MiniMax H3 所有参考音频总时长需 ≤15 秒，当前 {sum(local_audio_durations):.2f} 秒",
                error_code="INVALID_PARAM",
            )

        content: List[Dict[str, Any]] = [{"type": "text", "text": final_prompt}]
        content.extend(
            {"type": "image_url", "image_url": {"url": url}, "role": "reference_image"}
            for url in image_urls
        )
        content.extend(
            {"type": "video_url", "video_url": {"url": url}, "role": "reference_video"}
            for url in video_urls
        )
        content.extend(
            {"type": "audio_url", "audio_url": {"url": url}, "role": "reference_audio"}
            for url in audio_urls
        )
        payload: Dict[str, Any] = {
            "model": MODEL_NAME,
            "content": content,
            "resolution": resolution,
            "duration": duration,
            "ratio": ratio,
            "aigc_watermark": bool(params.get("aigc_watermark", False)),
        }
        request_bytes = len(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        sanitized_payload = {
            "provider": self.provider_type,
            "model": MODEL_NAME,
            "resolution": resolution,
            "duration": duration,
            "ratio": ratio,
            "aigc_watermark": payload["aigc_watermark"],
            "prompt": final_prompt,
            "content": _sanitize_for_log(content),
            "_stats": {
                "image_count": len(image_urls),
                "video_count": len(video_urls),
                "audio_count": len(audio_urls),
                "request_bytes": request_bytes,
                "images": image_summaries,
                "videos": video_summaries,
                "audios": audio_summaries,
            },
        }
        if request_bytes > MAX_REQUEST_BYTES:
            return SubmitResult(
                False,
                fail_reason=(
                    f"MiniMax H3 请求体约 {request_bytes / 1024 / 1024:.1f}MB，超过 64MB。"
                    "请减少本地参考素材或改用公网 URL"
                ),
                error_code="INVALID_PARAM",
                sanitized_payload=sanitized_payload,
            )

        logger.info(
            "[minimax_h3] submit resolution=%s duration=%ss ratio=%s images=%s videos=%s audios=%s request=%.2fMB",
            resolution,
            duration,
            ratio,
            len(image_urls),
            len(video_urls),
            len(audio_urls),
            request_bytes / 1024 / 1024,
        )
        try:
            response = await self._post("/v2/video_generation", payload, timeout=180)
        except asyncio.TimeoutError:
            return SubmitResult(
                False,
                fail_reason="MiniMax H3 提交等待 180 秒仍未返回 task_id；为避免重复扣费，请先到 MiniMax 控制台核对任务",
                error_code="SUBMIT_TIMEOUT_UNCONFIRMED",
                sanitized_payload=sanitized_payload,
            )
        except Exception as exc:
            return SubmitResult(
                False,
                fail_reason=f"MiniMax H3 提交网络异常: {type(exc).__name__}: {exc}",
                error_code="NETWORK",
                sanitized_payload=sanitized_payload,
            )

        status_code = int(response.get("status_code") or 0)
        body = response.get("body") or {}
        if status_code in (200, 201):
            task_id = body.get("task_id") if isinstance(body, dict) else None
            if task_id:
                return SubmitResult(
                    True,
                    submit_id=str(task_id),
                    raw=body,
                    sanitized_payload=sanitized_payload,
                )
            return SubmitResult(
                False,
                fail_reason=f"MiniMax H3 返回成功但缺少 task_id: {_sanitize_for_log(body)}",
                error_code="UNKNOWN",
                raw=body if isinstance(body, dict) else {},
                sanitized_payload=sanitized_payload,
            )

        friendly, error_code = self._translate_http_error(status_code, body)
        return SubmitResult(
            False,
            fail_reason=friendly,
            error_code=error_code,
            raw=body if isinstance(body, dict) else {},
            sanitized_payload=sanitized_payload,
        )

    async def query(self, submit_id: str) -> QueryResult:
        task_id = str(submit_id or "").strip()
        if not task_id:
            return QueryResult(status="fail", fail_reason="MiniMax H3 task_id 为空", error_code="INVALID_PARAM")
        if not self.api_key:
            return QueryResult(status="fail", fail_reason="未配置 MiniMax API Key", error_code="AUTH")

        try:
            response = await self._get(f"/v2/query/video_generation/{task_id}", timeout=60)
        except asyncio.TimeoutError:
            return QueryResult(status="running", fail_reason="MiniMax H3 查询超时，稍后自动重试", error_code="NETWORK")
        except Exception as exc:
            return QueryResult(status="running", fail_reason=f"MiniMax H3 查询网络异常: {exc}", error_code="NETWORK")

        status_code = int(response.get("status_code") or 0)
        body = response.get("body") or {}
        if status_code != 200:
            friendly, error_code = self._translate_http_error(status_code, body)
            if status_code in (429, 500, 502, 503, 504, 529):
                return QueryResult(status="running", fail_reason=friendly, error_code=error_code, raw=body)
            return QueryResult(status="fail", fail_reason=friendly, error_code=error_code, raw=body)

        task = body.get("task") if isinstance(body, dict) else None
        if not isinstance(task, dict):
            return QueryResult(status="running", fail_reason="MiniMax H3 查询响应暂缺 task 字段", raw=body)

        raw_status = str(task.get("status") or "").strip().lower()
        status_map = {
            "queued": "queued",
            "running": "running",
            "succeeded": "success",
            "failed": "fail",
            "cancelled": "cancelled",
            "expired": "expired",
        }
        status = status_map.get(raw_status, "running")
        content = task.get("content") if isinstance(task.get("content"), dict) else {}
        error = task.get("error") if isinstance(task.get("error"), dict) else {}
        try:
            duration = float(task.get("duration") or 0)
        except (TypeError, ValueError):
            duration = 0.0
        return QueryResult(
            status=status,
            video_url=str(content.get("url")) if content.get("url") else None,
            duration=duration,
            fail_reason=str(error.get("message")) if status in ("fail", "expired", "cancelled") and error.get("message") else None,
            error_code=str(error.get("code")) if error.get("code") else None,
            raw=body,
        )

    async def cancel(self, submit_id: str) -> bool:
        logger.info("[minimax_h3] 官方文档未提供取消接口 task_id=%s", submit_id)
        return False

    async def list_active(self) -> List[Dict[str, Any]]:
        return []

    async def check_login(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "success": False,
                "logged_in": False,
                "message": "未配置 MiniMax API Key",
            }
        return {
            "success": True,
            "logged_in": True,
            "message": "MiniMax API Key 已配置（未创建付费任务）",
        }
