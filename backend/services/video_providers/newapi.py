"""OpenAI/New API compatible MiniMax H3 relay provider.

The relay differs from MiniMax's native V2 API in two important ways:
it receives flat ``images``/``videos``/``audios`` URL arrays and it polls
``/v1/videos/{task_id}``.  It deliberately never serializes local media or
data URLs: callers must publish private assets through the short-lived OSS
upload bridge first.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import aiohttp

from utils.ssl_helper import get_aiohttp_connector

from .base import QueryResult, SubmitResult, VideoProviderBase


logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "http://120.209.70.196:8118"
ALLOWED_RATIOS = {"21:9", "16:9", "4:3", "1:1", "3:4", "9:16", "2:3", "3:2"}
MAX_IMAGES = 9
MAX_VIDEOS = 3
MAX_AUDIOS = 3
MAX_REFERENCES = 12


def _safe_url(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        parsed = urlparse(text)
    except Exception:
        return "<invalid-url>"
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return "<non-public-url>"
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"


def _public_url(value: str) -> bool:
    try:
        parsed = urlparse(str(value or "").strip())
    except Exception:
        return False
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc) and not parsed.username and not parsed.password


class NewApiVideoProvider(VideoProviderBase):
    provider_type = "newapi"

    def __init__(self, config: dict):
        super().__init__(config)
        self.api_key = str(config.get("api_key") or config.get("access_key") or "").strip()
        self.base_url = self._normalize_base_url(config.get("base_url"))
        self.model_name = str(config.get("model_name") or "minimax-H3-768p-IR").strip()
        extra = config.get("extra_params") or {}
        if isinstance(extra, str):
            try:
                extra = json.loads(extra)
            except Exception:
                extra = {}
        self.default_params = extra if isinstance(extra, dict) else {}

    @staticmethod
    def _normalize_base_url(raw: Any) -> str:
        value = str(raw or DEFAULT_BASE_URL).strip().rstrip("/")
        for suffix in ("/v1/video/generations", "/v1/videos", "/v1"):
            if value.endswith(suffix):
                value = value[: -len(suffix)]
                break
        return value or DEFAULT_BASE_URL

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    async def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None, timeout: int = 60) -> Dict[str, Any]:
        async with aiohttp.ClientSession(
            connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=timeout)
        ) as session:
            async with session.request(
                method, f"{self.base_url}{path}", headers=self._headers(), json=payload
            ) as response:
                text = await response.text()
                try:
                    body = json.loads(text) if text else {}
                except Exception:
                    body = {"raw_text": text[:1000]}
                return {"status_code": response.status, "body": body}

    @staticmethod
    def _error_message(body: Any) -> str:
        if isinstance(body, dict):
            err = body.get("error")
            if isinstance(err, dict):
                return str(err.get("message") or err.get("code") or "未知错误")
            return str(err or body.get("message") or body.get("detail") or body.get("raw_text") or "未知错误")[:500]
        return str(body or "未知错误")[:500]

    @classmethod
    def _http_error(cls, status: int, body: Any) -> Tuple[str, str]:
        message = cls._error_message(body)
        if status in (400, 422):
            return f"New API 参数或素材不符合要求: {message}", "INVALID_PARAM"
        if status in (401, 403):
            return "New API Key 无效、过期或没有该模型权限", "AUTH"
        if status == 402:
            return "New API 账户余额或额度不足", "BALANCE"
        if status == 429:
            return f"New API 请求过于频繁: {message}", "RATE_LIMIT"
        if status in (500, 502, 503, 504):
            return f"New API 服务暂时不可用: {message}", "NETWORK"
        return f"New API HTTP {status}: {message}", "UNKNOWN"

    @staticmethod
    def _urls(values: Any) -> List[str]:
        return [str(item).strip() for item in (values or []) if str(item or "").strip()]

    @classmethod
    def _validate_public_urls(cls, label: str, values: List[str]) -> Optional[str]:
        invalid = [_safe_url(item) for item in values if not _public_url(item)]
        if invalid:
            return (
                f"New API 只接受可从公网下载的 URL；{label}中有 {len(invalid)} 个本地路径或 Base64 数据。"
                "请先通过 OSS 临时素材上传后再提交。"
            )
        return None

    async def submit(
        self,
        prompt: str,
        images: Optional[List[str]] = None,
        audios: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> SubmitResult:
        if not self.api_key:
            return SubmitResult(False, fail_reason="未配置 New API Key", error_code="AUTH")
        text = str(prompt or "").strip()
        if not text:
            return SubmitResult(False, fail_reason="New API 视频提示词不能为空", error_code="INVALID_PARAM")
        merged = {**self.default_params, **(params or {})}
        image_urls = self._urls(images)
        audio_urls = self._urls(audios)
        video_urls = self._urls(merged.get("reference_videos"))
        first_frame = str(merged.get("first_frame_url") or "").strip()
        last_frame = str(merged.get("last_frame_url") or "").strip()
        if len(image_urls) > MAX_IMAGES or len(video_urls) > MAX_VIDEOS or len(audio_urls) > MAX_AUDIOS:
            return SubmitResult(False, fail_reason="New API 最多 9 张图、3 段参考视频、3 段参考音频", error_code="INVALID_PARAM")
        if len(image_urls) + len(video_urls) + len(audio_urls) > MAX_REFERENCES:
            return SubmitResult(False, fail_reason=f"New API 参考素材总数最多 {MAX_REFERENCES} 个", error_code="INVALID_PARAM")
        if (first_frame or last_frame) and (image_urls or video_urls or audio_urls):
            return SubmitResult(False, fail_reason="New API 的首尾帧模式不能与参考图、参考视频或参考音频混用", error_code="INVALID_PARAM")
        if audio_urls and not (image_urls or video_urls):
            return SubmitResult(False, fail_reason="New API 不能只传参考音频，至少需要一张参考图或一段参考视频", error_code="INVALID_PARAM")
        for label, values in (("参考图", image_urls), ("参考视频", video_urls), ("参考音频", audio_urls), ("首尾帧", [first_frame, last_frame])):
            error = self._validate_public_urls(label, [item for item in values if item])
            if error:
                return SubmitResult(False, fail_reason=error, error_code="INVALID_PARAM")
        try:
            duration = int(float(merged.get("duration") or 5))
        except (TypeError, ValueError):
            duration = 0
        if not 4 <= duration <= 15:
            return SubmitResult(False, fail_reason=f"New API 视频时长仅支持 4-15 秒，当前 {merged.get('duration')} 秒", error_code="INVALID_PARAM")
        ratio = str(merged.get("ratio") or merged.get("aspect_ratio") or "9:16").strip()
        if ratio not in ALLOWED_RATIOS:
            return SubmitResult(False, fail_reason=f"New API 不支持画面比例 {ratio}", error_code="INVALID_PARAM")
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "prompt": text,
            "duration": duration,
            "aspect_ratio": ratio,
        }
        if first_frame:
            payload["first_frame_url"] = first_frame
        if last_frame:
            payload["last_frame_url"] = last_frame
        if image_urls:
            payload["images"] = image_urls
        if video_urls:
            payload["videos"] = video_urls
        if audio_urls:
            payload["audios"] = audio_urls
        sanitized = {
            "provider": self.provider_type,
            "model": self.model_name,
            "duration": duration,
            "aspect_ratio": ratio,
            "prompt": text,
            "images": [_safe_url(item) for item in image_urls],
            "videos": [_safe_url(item) for item in video_urls],
            "audios": [_safe_url(item) for item in audio_urls],
            "first_frame_url": _safe_url(first_frame) if first_frame else None,
            "last_frame_url": _safe_url(last_frame) if last_frame else None,
        }
        try:
            response = await self._request("POST", "/v1/video/generations", payload, timeout=180)
        except asyncio.TimeoutError:
            return SubmitResult(False, fail_reason="New API 提交 180 秒未返回任务编号，请在供应商后台核对后再重试", error_code="SUBMIT_TIMEOUT_UNCONFIRMED", sanitized_payload=sanitized)
        except Exception as exc:
            return SubmitResult(False, fail_reason=f"New API 提交网络异常: {type(exc).__name__}: {exc}", error_code="NETWORK", sanitized_payload=sanitized)
        status = int(response["status_code"])
        body = response["body"]
        if status in (200, 201, 202):
            data = body.get("data") if isinstance(body, dict) else {}
            task_id = (body.get("task_id") if isinstance(body, dict) else None) or (data.get("task_id") if isinstance(data, dict) else None)
            if task_id:
                return SubmitResult(True, submit_id=str(task_id), raw=body if isinstance(body, dict) else {}, sanitized_payload=sanitized)
            return SubmitResult(False, fail_reason="New API 已响应成功但未返回 task_id", error_code="UNKNOWN", raw=body if isinstance(body, dict) else {}, sanitized_payload=sanitized)
        message, code = self._http_error(status, body)
        return SubmitResult(False, fail_reason=message, error_code=code, raw=body if isinstance(body, dict) else {}, sanitized_payload=sanitized)

    @staticmethod
    def _first_url(value: Any) -> Optional[str]:
        if isinstance(value, str) and _public_url(value):
            return value
        if isinstance(value, list):
            for item in value:
                candidate = NewApiVideoProvider._first_url(item)
                if candidate:
                    return candidate
        if isinstance(value, dict):
            for key in ("url", "video_url", "download_url"):
                candidate = NewApiVideoProvider._first_url(value.get(key))
                if candidate:
                    return candidate
        return None

    async def query(self, submit_id: str) -> QueryResult:
        task_id = str(submit_id or "").strip()
        if not task_id:
            return QueryResult(status="fail", fail_reason="New API task_id 为空", error_code="INVALID_PARAM")
        try:
            response = await self._request("GET", f"/v1/videos/{task_id}", timeout=60)
        except asyncio.TimeoutError:
            return QueryResult(status="running", fail_reason="New API 查询超时，稍后自动重试", error_code="NETWORK")
        except Exception as exc:
            return QueryResult(status="running", fail_reason=f"New API 查询网络异常: {exc}", error_code="NETWORK")
        status = int(response["status_code"])
        body = response["body"]
        if status != 200:
            message, code = self._http_error(status, body)
            return QueryResult(status="running" if status >= 500 or status == 429 else "fail", fail_reason=message, error_code=code, raw=body if isinstance(body, dict) else {})
        data = body.get("data") if isinstance(body, dict) and isinstance(body.get("data"), dict) else {}
        state = str((body.get("status") if isinstance(body, dict) else "") or data.get("status") or "").lower()
        if state in {"queued", "pending", "running", "in_progress", "processing"}:
            return QueryResult(status="running", raw=body if isinstance(body, dict) else {})
        if state in {"succeeded", "completed", "success"}:
            url = self._first_url((body.get("url") if isinstance(body, dict) else None) or (body.get("video_url") if isinstance(body, dict) else None) or (body.get("outputs") if isinstance(body, dict) else None) or data.get("url") or data.get("video_url") or data.get("outputs"))
            if url:
                return QueryResult(status="success", video_url=url, raw=body if isinstance(body, dict) else {})
            return QueryResult(status="running", fail_reason="New API 已完成但视频地址尚未返回", raw=body if isinstance(body, dict) else {})
        if state in {"failed", "error", "cancelled", "canceled", "expired"}:
            return QueryResult(status="fail", fail_reason=self._error_message(body), raw=body if isinstance(body, dict) else {})
        return QueryResult(status="running", raw=body if isinstance(body, dict) else {})

    async def cancel(self, submit_id: str) -> bool:
        return False

    async def list_active(self) -> List[Dict[str, Any]]:
        return []

    async def check_login(self) -> Dict[str, Any]:
        if not self.api_key:
            return {"success": False, "logged_in": False, "balance": 0, "message": "未配置 New API Key"}
        try:
            response = await self._request("GET", "/v1/models", timeout=30)
        except Exception as exc:
            return {"success": False, "logged_in": False, "balance": 0, "message": f"New API 连接失败: {exc}"}
        if int(response["status_code"]) == 200:
            return {"success": True, "logged_in": True, "balance": 0, "message": "New API 连接成功"}
        message, _ = self._http_error(int(response["status_code"]), response["body"])
        return {"success": False, "logged_in": False, "balance": 0, "message": message}
