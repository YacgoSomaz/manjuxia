"""Pippit / 小云雀 CLI video provider.

The CLI contract is intentionally isolated here. The app stores one
submit_id string, while pippit returns thread_id + run_id, so this provider
packs both ids into a reversible, delimiter-safe token.
"""
import asyncio
import base64
import json
import logging
import mimetypes
import os
import re
import shutil
import sys
import tempfile
from typing import Any, Dict, List, Optional, Tuple

import aiohttp

from .base import VideoProviderBase, SubmitResult, QueryResult
from utils.ssl_helper import get_aiohttp_connector
from utils.paths import is_frozen, resolve_db_path
from utils.unicode_utils import sanitize_unicode

logger = logging.getLogger(__name__)
_VIDEO_EXTS = (".mp4", ".mov", ".webm", ".m4v")
_PIPPIT_BASE_URL = "https://xyq.jianying.com"
_PIPPIT_SUBMIT_RUN_PATH = "/api/biz/v1/skill/submit_run"
_PIPPIT_GET_THREAD_PATH = "/api/biz/v1/skill/get_thread"
_PIPPIT_UPLOAD_FILE_PATH = "/api/biz/v1/skill/upload_file"
_PIPPIT_VIDEO_AGENT = "pippit_video_part_agent"
_PIPPIT_SUCCESS_STATE = 3
_PIPPIT_FAILED_STATE = 4


def _b64_pack(value: str) -> str:
    raw = (value or "").encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64_unpack(value: str) -> str:
    pad = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + pad).encode("ascii")).decode("utf-8")


def pack_pippit_task_id(thread_id: str, run_id: str) -> str:
    return f"pippit|{_b64_pack(thread_id)}|{_b64_pack(run_id)}"


def unpack_pippit_task_id(submit_id: str) -> Tuple[str, str]:
    text = (submit_id or "").strip()
    parts = text.split("|")
    if len(parts) == 3 and parts[0] == "pippit":
        return _b64_unpack(parts[1]), _b64_unpack(parts[2])

    # Accept raw JSON for manual repair/debug cases.
    if text.startswith("{"):
        data = json.loads(text)
        return str(data.get("thread_id") or ""), str(data.get("run_id") or "")

    # Friendly fallback for "thread_id:run_id" copied from logs.
    if ":" in text:
        left, right = text.split(":", 1)
        return left.strip(), right.strip()

    raise ValueError("invalid pippit submit_id; expected packed thread_id/run_id")


def _walk_dicts(value: Any):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from _walk_dicts(item)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_dicts(item)


def _first_non_empty(*values: Any) -> str:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _safe_video_filename(video: Dict[str, Any], index: int) -> str:
    name = _first_non_empty(
        video.get("vid"),
        video.get("title"),
        video.get("asset_id"),
        video.get("assetId"),
    )
    if not name:
        name = f"result_{index}"
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]+', "_", name).strip(" .")
    if not name:
        name = f"result_{index}"
    if os.path.splitext(name)[1].lower() not in _VIDEO_EXTS:
        name += ".mp4"
    return name


def _unique_path(directory: str, filename: str) -> str:
    base, ext = os.path.splitext(filename)
    candidate = os.path.join(directory, filename)
    if not os.path.exists(candidate):
        return candidate
    idx = 2
    while True:
        candidate = os.path.join(directory, f"{base}-{idx}{ext}")
        if not os.path.exists(candidate):
            return candidate
        idx += 1


class PippitCliProvider(VideoProviderBase):
    provider_type = "pippit_cli"

    _cli_lock = None
    _cached_cli_path: Optional[str] = None

    @classmethod
    def _get_cli_lock(cls):
        if cls._cli_lock is None:
            cls._cli_lock = asyncio.Lock()
        return cls._cli_lock

    def _get_cli_path(self) -> str:
        if self.__class__._cached_cli_path:
            return self.__class__._cached_cli_path

        configured = (
            self.config.get("cli_path")
            or self.config.get("pippit_cli_path")
            or os.environ.get("PIPPIT_CLI_PATH")
        )
        candidates: List[str] = []
        if configured:
            candidates.append(configured)

        if is_frozen():
            exe_dir = os.path.dirname(sys.executable)
            backend_dist_dir = os.path.dirname(exe_dir)
            candidates.extend([
                os.path.join(backend_dist_dir, "pippit", "pippit-tool-cli.exe"),
                os.path.join(backend_dist_dir, "pippit", "pippit-tool-cli.cmd"),
                os.path.join(backend_dist_dir, "pippit", "pippit-tool-cli"),
            ])

        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        candidates.extend([
            os.path.join(project_root, "backend-dist", "pippit", "pippit-tool-cli.exe"),
            os.path.join(project_root, "backend-dist", "pippit", "pippit-tool-cli.cmd"),
            os.path.join(project_root, "backend-dist", "pippit", "pippit-tool-cli"),
        ])

        found = shutil.which("pippit-tool-cli")
        if found:
            candidates.append(found)

        home = os.path.expanduser("~")
        candidates.extend([
            os.path.join(home, "bin", "pippit-tool-cli.exe"),
            os.path.join(home, "bin", "pippit-tool-cli.cmd"),
            os.path.join(home, "AppData", "Roaming", "npm", "pippit-tool-cli.cmd"),
            os.path.join(home, "AppData", "Roaming", "npm", "pippit-tool-cli.exe"),
        ])

        for path in candidates:
            if path and os.path.exists(path):
                self.__class__._cached_cli_path = path
                return path

        # Let subprocess raise a clear FileNotFoundError if nothing exists.
        self.__class__._cached_cli_path = configured or "pippit-tool-cli"
        return self.__class__._cached_cli_path

    def _get_access_key(self) -> str:
        for key in (
            self.config.get("access_key"),
            self.config.get("api_key"),
            os.environ.get("XYQ_ACCESS_KEY"),
            os.environ.get("PIPPIT_ACCESS_KEY"),
            os.environ.get("PIPPIT_API_KEY"),
            os.environ.get("PIPPIT_TOOL_ACCESS_KEY"),
            os.environ.get("XIAOYUNQUE_ACCESS_KEY"),
            os.environ.get("XIAOYUNQUE_API_KEY"),
        ):
            if isinstance(key, str) and key.strip():
                return key.strip()
        return ""

    def _command_env(self) -> Dict[str, str]:
        env = os.environ.copy()
        access_key = self._get_access_key()
        if access_key:
            for name in (
                "XYQ_ACCESS_KEY",
                "PIPPIT_ACCESS_KEY",
                "PIPPIT_API_KEY",
                "PIPPIT_TOOL_ACCESS_KEY",
                "XIAOYUNQUE_ACCESS_KEY",
                "XIAOYUNQUE_API_KEY",
            ):
                env[name] = access_key
        return env

    def _api_base_url(self) -> str:
        return (
            self.config.get("base_url")
            or self.config.get("pippit_base_url")
            or _PIPPIT_BASE_URL
        ).rstrip("/")

    def _api_headers(self, *, json_body: bool = False) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._get_access_key()}",
            "Accept": "application/json",
            "User-Agent": "Pippit-CLI/1.0",
        }
        if json_body:
            headers["Content-Type"] = "application/json"
        return headers

    @staticmethod
    def _api_error_message(action: str, status_code: Optional[int], body: Any) -> str:
        message = ""
        log_id = ""
        ret = ""
        if isinstance(body, dict):
            ret = str(body.get("ret") or "").strip()
            log_id = str(body.get("log_id") or "").strip()
            message = _first_non_empty(
                body.get("errmsg"),
                body.get("message"),
                body.get("error_message"),
                body.get("error"),
                body.get("raw_text"),
            )
        elif body is not None:
            message = str(body).strip()

        parts = [f"小云雀 {action}失败"]
        if status_code:
            parts.append(f"HTTP {status_code}")
        if ret and ret != "0":
            parts.append(f"ret={ret}")
        if message:
            parts.append(message[:500])
        if log_id:
            parts.append(f"log_id={log_id}")
        return ": ".join(parts)

    async def _post_json(self, path: str, payload: Dict[str, Any], *, timeout: int, action: str) -> Dict[str, Any]:
        if not self._get_access_key():
            return {"success": False, "error": "小云雀 Access Key 未配置"}

        url = f"{self._api_base_url()}{path}"
        try:
            async with aiohttp.ClientSession(
                connector=get_aiohttp_connector(),
                timeout=aiohttp.ClientTimeout(total=timeout, connect=20),
            ) as session:
                async with session.post(url, headers=self._api_headers(json_body=True), json=payload) as resp:
                    text = await resp.text()
                    try:
                        body = json.loads(text) if text else {}
                    except Exception:
                        body = {"raw_text": text}
                    if resp.status >= 400:
                        return {
                            "success": False,
                            "status_code": resp.status,
                            "data": body,
                            "error": self._api_error_message(action, resp.status, body),
                        }
                    if isinstance(body, dict) and str(body.get("ret") or "0") != "0":
                        return {
                            "success": False,
                            "status_code": resp.status,
                            "data": body,
                            "error": self._api_error_message(action, resp.status, body),
                        }
                    return {"success": True, "status_code": resp.status, "data": body}
        except asyncio.TimeoutError:
            return {"success": False, "error": f"小云雀 {action}超时({timeout}s)"}
        except Exception as e:
            logger.error(f"[pippit-api] {action} exception: {type(e).__name__}: {e}", exc_info=True)
            return {"success": False, "error": f"小云雀 {action}异常: {e}"}

    async def _upload_file_api(self, path: str, *, label: str) -> Dict[str, Any]:
        if not self._get_access_key():
            return {"success": False, "error": "小云雀 Access Key 未配置"}

        mime, _ = mimetypes.guess_type(path)
        if not mime:
            ext = os.path.splitext(path)[1].lower()
            if ext == ".mp3":
                mime = "audio/mpeg"
            elif ext == ".wav":
                mime = "audio/wav"
            else:
                mime = "application/octet-stream"

        url = f"{self._api_base_url()}{_PIPPIT_UPLOAD_FILE_PATH}"
        headers = self._api_headers(json_body=False)
        try:
            with open(path, "rb") as file_obj:
                form = aiohttp.FormData()
                form.add_field(
                    "file",
                    file_obj,
                    filename=os.path.basename(path),
                    content_type=mime,
                )
                async with aiohttp.ClientSession(
                    connector=get_aiohttp_connector(),
                    timeout=aiohttp.ClientTimeout(total=180, connect=20),
                ) as session:
                    async with session.post(url, headers=headers, data=form) as resp:
                        text = await resp.text()
                        try:
                            body = json.loads(text) if text else {}
                        except Exception:
                            body = {"raw_text": text}
                        if resp.status >= 400:
                            return {
                                "success": False,
                                "status_code": resp.status,
                                "data": body,
                                "error": self._api_error_message(f"上传{label}", resp.status, body),
                            }
                        if isinstance(body, dict) and str(body.get("ret") or "0") != "0":
                            return {
                                "success": False,
                                "status_code": resp.status,
                                "data": body,
                                "error": self._api_error_message(f"上传{label}", resp.status, body),
                            }
                        data = body.get("data") if isinstance(body, dict) else {}
                        asset_id = ""
                        if isinstance(data, dict):
                            asset_id = _first_non_empty(data.get("pippit_asset_id"), data.get("asset_id"))
                        if not asset_id:
                            return {
                                "success": False,
                                "status_code": resp.status,
                                "data": body,
                                "error": f"小云雀 上传{label}失败: 响应缺少 pippit_asset_id",
                            }
                        return {"success": True, "asset_id": asset_id, "data": body}
        except Exception as e:
            logger.error(f"[pippit-api] upload {label} exception path={path}: {type(e).__name__}: {e}", exc_info=True)
            return {"success": False, "error": f"小云雀 上传{label}异常: {e}"}

    async def _upload_media_list_api(self, paths: List[str], *, label: str) -> Tuple[List[str], Optional[str], List[Any]]:
        asset_ids: List[str] = []
        raw_results: List[Any] = []
        for path in paths:
            result = await self._upload_file_api(path, label=label)
            raw_results.append(result.get("data") or {"error": result.get("error")})
            if not result.get("success"):
                return [], str(result.get("error") or f"小云雀 上传{label}失败"), raw_results
            asset_ids.append(str(result.get("asset_id") or ""))
        return asset_ids, None, raw_results

    @staticmethod
    def _build_submit_payload(
        *,
        prompt: str,
        image_asset_ids: List[str],
        audio_asset_ids: List[str],
        model: str,
        ratio: str,
        resolution: str,
        duration: int,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {
            "prompt": prompt,
            "duration_sec": duration,
            "ratio": str(ratio).strip(),
            "model": str(model).strip(),
            "resolution": str(resolution).strip(),
        }
        if image_asset_ids:
            params["images"] = [{"pippit_asset_id": asset_id} for asset_id in image_asset_ids if asset_id]
        if audio_asset_ids:
            params["audios"] = [{"pippit_asset_id": asset_id} for asset_id in audio_asset_ids if asset_id]

        return {
            "agent_name": _PIPPIT_VIDEO_AGENT,
            "message": prompt,
            "video_part_tool_param": params,
        }

    @staticmethod
    def _normalize_run_state(value: Any) -> Optional[int]:
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            text = value.strip().lower()
            if text.isdigit():
                return int(text)
            if text in ("success", "succeeded", "completed", "complete", "done", "finished", "finish"):
                return _PIPPIT_SUCCESS_STATE
            if text in ("fail", "failed", "error", "cancelled", "canceled", "expired"):
                return _PIPPIT_FAILED_STATE
        return None

    @staticmethod
    def _extract_thread_run(data: Any, run_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        root = data.get("data") if isinstance(data, dict) else data
        thread = None
        if isinstance(root, dict):
            candidate = root.get("thread")
            if isinstance(candidate, dict):
                thread = candidate
            elif isinstance(root.get("run_list"), list):
                thread = root

        if thread is None:
            for obj in _walk_dicts(root):
                if isinstance(obj.get("run_list"), list):
                    thread = obj
                    break

        if not isinstance(thread, dict):
            return None, None

        runs = thread.get("run_list") or []
        if not isinstance(runs, list):
            return thread, None
        for run in runs:
            if isinstance(run, dict) and str(run.get("run_id") or "") == str(run_id):
                return thread, run
        return thread, None

    @staticmethod
    def _decode_content_data(value: Any) -> Dict[str, Any]:
        if isinstance(value, dict):
            return value
        if isinstance(value, str) and value.strip().startswith("{"):
            try:
                decoded = json.loads(value)
                return decoded if isinstance(decoded, dict) else {}
            except Exception:
                return {}
        return {}

    @classmethod
    def _extract_query_videos(cls, run: Dict[str, Any]) -> List[Dict[str, Any]]:
        videos: List[Dict[str, Any]] = []
        entries = run.get("entry_list") or []
        if not isinstance(entries, list):
            return videos
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            artifact = entry.get("artifact") or {}
            contents = artifact.get("content") or []
            if not isinstance(contents, list):
                continue
            for content in contents:
                if not isinstance(content, dict):
                    continue
                if content.get("sub_type") != "biz/x_data_video":
                    continue
                content_data = cls._decode_content_data(content.get("data"))
                video = content_data.get("video")
                if isinstance(video, dict):
                    videos.append(video)
        return videos

    @classmethod
    def _extract_query_error(cls, run: Dict[str, Any]) -> str:
        message = _first_non_empty(
            run.get("error_message"),
            run.get("error_msg"),
            run.get("errmsg"),
            run.get("fail_reason"),
        )
        if message:
            return message
        entries = run.get("entry_list") or []
        if not isinstance(entries, list):
            return ""
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            for content in ((entry.get("artifact") or {}).get("content") or []):
                if not isinstance(content, dict):
                    continue
                content_data = cls._decode_content_data(content.get("data"))
                message = _first_non_empty(
                    content_data.get("error_message"),
                    content_data.get("error_msg"),
                    content_data.get("errmsg"),
                )
                if message:
                    code = content_data.get("error_code")
                    return f"{message} (error_code={code})" if code else message
        return ""

    async def _download_video_api(self, url: str, download_dir: str, filename: str) -> Tuple[Optional[str], Optional[str]]:
        if not url:
            return None, "小云雀 下载失败: download_url 为空"
        target_path = _unique_path(download_dir, filename)
        tmp_path = target_path + ".tmp"
        try:
            async with aiohttp.ClientSession(
                connector=get_aiohttp_connector(),
                timeout=aiohttp.ClientTimeout(total=300, connect=20),
            ) as session:
                async with session.get(url, headers=self._api_headers(json_body=False)) as resp:
                    if resp.status >= 400:
                        text = await resp.text()
                        return None, f"小云雀 下载失败: HTTP {resp.status}: {text[:300]}"
                    with open(tmp_path, "wb") as out:
                        async for chunk in resp.content.iter_chunked(1024 * 512):
                            if chunk:
                                out.write(chunk)
            os.replace(tmp_path, target_path)
            return os.path.abspath(target_path), None
        except Exception as e:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass
            logger.error(f"[pippit-api] download exception: {type(e).__name__}: {e}", exc_info=True)
            return None, f"小云雀 下载异常: {e}"

    @staticmethod
    def _resolve_local_media_path(path: str) -> str:
        text = (path or "").strip()
        if not text:
            return ""
        lower = text.lower()
        if lower.startswith(("http://", "https://", "data:", "asset://")):
            return text
        normalized_rel = re.sub(r"/+", "/", text.lstrip("/\\").replace("\\", "/"))
        if normalized_rel.startswith("data/"):
            return resolve_db_path("/" + normalized_rel)
        if os.path.isabs(text):
            return os.path.normpath(text)
        return os.path.abspath(text)

    @classmethod
    def _resolve_media_paths(cls, paths: List[str], *, label: str, limit: int) -> Tuple[List[str], Optional[str]]:
        resolved: List[str] = []
        for path in (paths or [])[:limit]:
            local_path = cls._resolve_local_media_path(str(path))
            if not local_path:
                continue
            if local_path.lower().startswith(("http://", "https://", "data:", "asset://")):
                return [], f"小云雀 CLI 仅支持本地{label}文件，当前路径不可上传: {path}"
            if not os.path.exists(local_path):
                return [], f"小云雀 CLI 上传{label}失败: 文件不存在: {path} -> {local_path}"
            resolved.append(local_path)
        return resolved, None

    @staticmethod
    def _extract_json_object(text: str):
        if not text:
            return None
        clean = re.sub(r"\x1b\[[0-9;]*m", "", text)
        decoder = json.JSONDecoder()
        candidates = []
        idx = 0
        while True:
            start = clean.find("{", idx)
            if start < 0:
                break
            try:
                obj, end = decoder.raw_decode(clean[start:])
                if isinstance(obj, dict):
                    candidates.append(obj)
                idx = start + max(end, 1)
            except Exception:
                idx = start + 1

        if not candidates:
            return None

        business_keys = {"thread_id", "run_id", "status", "video_url", "result"}
        for obj in reversed(candidates):
            if any(k in obj for k in business_keys):
                return obj
        return candidates[-1]

    @staticmethod
    def _extract_ids(data: Any, raw_text: str = "") -> Tuple[Optional[str], Optional[str]]:
        for obj in _walk_dicts(data):
            thread_id = obj.get("thread_id") or obj.get("threadId") or obj.get("thread")
            run_id = obj.get("run_id") or obj.get("runId") or obj.get("run")
            if thread_id and run_id:
                return str(thread_id), str(run_id)

        text = raw_text or ""
        thread_match = re.search(r"thread[_ -]?id\s*[:=]\s*([A-Za-z0-9_.:\-]+)", text, re.I)
        run_match = re.search(r"run[_ -]?id\s*[:=]\s*([A-Za-z0-9_.:\-]+)", text, re.I)
        if thread_match and run_match:
            return thread_match.group(1), run_match.group(1)
        return None, None

    @staticmethod
    def _extract_video_url(data: Any) -> Optional[str]:
        preferred = (
            "video_url", "videoUrl", "download_url", "downloadUrl",
            "url", "output_url", "outputUrl",
        )
        for obj in _walk_dicts(data):
            for key in preferred:
                val = obj.get(key)
                if isinstance(val, str) and val.startswith(("http://", "https://")):
                    return val
            videos = obj.get("videos")
            if isinstance(videos, list):
                for video in videos:
                    if isinstance(video, dict):
                        for key in preferred:
                            val = video.get(key)
                            if isinstance(val, str) and val.startswith(("http://", "https://")):
                                return val
        return None

    @staticmethod
    def _snapshot_videos(download_dir: str) -> set:
        try:
            if not download_dir or not os.path.isdir(download_dir):
                return set()
            found = set()
            for root, _dirs, files in os.walk(download_dir):
                for name in files:
                    if os.path.splitext(name)[1].lower() in _VIDEO_EXTS:
                        found.add(os.path.abspath(os.path.join(root, name)))
            return found
        except Exception:
            return set()

    @classmethod
    def _extract_local_video_path(cls, data: Any, download_dir: str, before: Optional[set] = None) -> Optional[str]:
        preferred = (
            "local_path", "localPath", "file_path", "filePath",
            "download_path", "downloadPath", "output_path", "outputPath", "path",
        )
        candidates: List[str] = []
        for obj in _walk_dicts(data):
            for key in preferred:
                val = obj.get(key)
                if isinstance(val, str) and val.strip():
                    candidates.append(val.strip())
            for val in obj.values():
                if isinstance(val, str) and os.path.splitext(val.strip())[1].lower() in _VIDEO_EXTS:
                    candidates.append(val.strip())

        for candidate in candidates:
            path = os.path.expanduser(candidate)
            if not os.path.isabs(path):
                path = os.path.join(download_dir, path)
            if os.path.isfile(path) and os.path.splitext(path)[1].lower() in _VIDEO_EXTS:
                return os.path.abspath(path)

        before = before or set()
        after = cls._snapshot_videos(download_dir)
        new_files = [p for p in (after - before) if os.path.isfile(p)]
        if new_files:
            return max(new_files, key=lambda p: os.path.getmtime(p))
        return None

    @staticmethod
    def _extract_fail_reason(data: Any) -> Optional[str]:
        keys = ("fail_reason", "failReason", "error_message", "errorMessage", "error", "message", "reason", "msg")
        for obj in _walk_dicts(data):
            for key in keys:
                val = obj.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip()
        return None

    async def _run_command(self, *args, timeout: int = 180) -> Dict[str, Any]:
        lock = self._get_cli_lock()
        async with lock:
            return await self._run_command_unlocked(*args, timeout=timeout)

    async def _run_command_unlocked(self, *args, timeout: int = 180) -> Dict[str, Any]:
        cmd = self._get_cli_path()
        safe_cmd = " ".join([cmd, *[str(a) for a in args[:2]], "..."])
        logger.info(f"[pippit-cli] run: {safe_cmd}")
        try:
            process = await asyncio.create_subprocess_exec(
                cmd, *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._command_env(),
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
            output = (stdout or b"").decode("utf-8", errors="replace").strip()
            err_text = (stderr or b"").decode("utf-8", errors="replace").strip()
            parsed = None
            try:
                parsed = json.loads(output) if output else None
            except json.JSONDecodeError:
                parsed = self._extract_json_object(output)

            if process.returncode != 0:
                logger.error(
                    f"[pippit-cli] returncode={process.returncode} cmd={args[0] if args else ''}\n"
                    f"stderr: {err_text[:1000]}\nstdout: {output[:1000]}"
                )
                # Some CLIs return non-zero while still printing accepted ids.
                thread_id, run_id = self._extract_ids(parsed, output)
                if thread_id and run_id:
                    return {"success": True, "data": parsed or {}, "raw_output": output}
                return {"success": False, "error": err_text or output or "pippit CLI failed"}

            if parsed is None:
                parsed = {"raw_output": output}
            return {"success": True, "data": parsed, "raw_output": output}
        except asyncio.TimeoutError:
            logger.error(f"[pippit-cli] timeout({timeout}s): {args[0] if args else ''}")
            return {"success": False, "error": f"小云雀 CLI 命令超时({timeout}s)"}
        except FileNotFoundError:
            return {
                "success": False,
                "error": "未找到 pippit-tool-cli。请先按小云雀官网 CLI 文档安装并完成 Access Key 配置。",
            }
        except Exception as e:
            logger.error(f"[pippit-cli] exception: {type(e).__name__}: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    async def submit(
        self,
        prompt: str,
        images: Optional[List[str]] = None,
        audios: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> SubmitResult:
        params = params or {}
        images = images or []
        audios = audios or []

        model = params.get("model") or params.get("model_version") or "seedance2.0_fast_direct"
        ratio = params.get("ratio") or "9:16"
        resolution = params.get("resolution") or "720p"
        duration = int(params.get("duration") or 5)

        resolved_images, image_error = self._resolve_media_paths(images, label="图片", limit=9)
        if image_error:
            return SubmitResult(success=False, fail_reason=image_error, error_code="INVALID_PARAM")
        resolved_audios, audio_error = self._resolve_media_paths(audios, label="音频", limit=3)
        if audio_error:
            return SubmitResult(success=False, fail_reason=audio_error, error_code="INVALID_PARAM")

        image_asset_ids, upload_error, upload_raw = await self._upload_media_list_api(resolved_images, label="图片")
        if upload_error:
            return SubmitResult(
                success=False,
                fail_reason=upload_error,
                error_code="UNKNOWN",
                raw={"uploads": upload_raw},
            )
        audio_asset_ids, audio_upload_error, audio_upload_raw = await self._upload_media_list_api(resolved_audios, label="音频")
        if audio_upload_error:
            return SubmitResult(
                success=False,
                fail_reason=audio_upload_error,
                error_code="UNKNOWN",
                raw={"uploads": upload_raw + audio_upload_raw},
            )

        prompt = sanitize_unicode(prompt or "")
        payload = self._build_submit_payload(
            prompt=prompt,
            image_asset_ids=image_asset_ids,
            audio_asset_ids=audio_asset_ids,
            model=str(model),
            ratio=str(ratio),
            resolution=str(resolution),
            duration=duration,
        )
        result = await self._post_json(
            _PIPPIT_SUBMIT_RUN_PATH,
            payload,
            timeout=180,
            action="提交任务",
        )
        if not result.get("success"):
            err_text = str(result.get("error") or "小云雀 提交失败")
            err_code = (
                "INVALID_PARAM"
                if "Access Key" in err_text
                else ("NETWORK" if result.get("status_code") is None else "UNKNOWN")
            )
            return SubmitResult(
                success=False,
                fail_reason=err_text,
                error_code=err_code,
                raw=result,
            )

        data = result.get("data") or {}
        thread_id, run_id = self._extract_ids(data, result.get("raw_output") or "")
        if not thread_id or not run_id:
            raw_summary = json.dumps(data, ensure_ascii=False)[:300] if data else result.get("raw_output", "")[:300]
            return SubmitResult(
                success=False,
                fail_reason=f"小云雀 CLI 已返回但缺少 thread_id/run_id: {raw_summary}",
                error_code="UNKNOWN",
                raw=data,
            )

        return SubmitResult(
            success=True,
            submit_id=pack_pippit_task_id(thread_id, run_id),
            raw=data,
            sanitized_payload={
                "provider": "pippit_cli",
                "transport": "api",
                "model": model,
                "ratio": ratio,
                "resolution": resolution,
                "duration": duration,
                "images_count": len(resolved_images),
                "audios_count": len(resolved_audios),
            },
        )

    async def query(self, submit_id: str) -> QueryResult:
        try:
            thread_id, run_id = unpack_pippit_task_id(submit_id)
        except Exception as e:
            return QueryResult(status="fail", fail_reason=str(e), error_code="UNKNOWN")

        download_dir = (
            self.config.get("download_dir")
            or os.path.join(tempfile.gettempdir(), "xiaoshuotool-pippit")
        )
        try:
            os.makedirs(download_dir, exist_ok=True)
        except Exception:
            pass
        before_files = self._snapshot_videos(download_dir)

        result = await self._post_json(
            _PIPPIT_GET_THREAD_PATH,
            {"thread_id": thread_id, "run_id": run_id},
            timeout=120,
            action="查询任务",
        )
        if not result.get("success"):
            return QueryResult(
                status="running",
                fail_reason=str(result.get("error") or "小云雀查询失败"),
                error_code="NETWORK",
                raw=result,
            )

        data = result.get("data") or {}
        _thread, run = self._extract_thread_run(data, run_id)
        if not run:
            raw = data if isinstance(data, dict) else {"data": data}
            return QueryResult(
                status="running",
                fail_reason="小云雀查询响应中暂未找到对应 run",
                error_code=None,
                raw=raw,
            )

        run_state = self._normalize_run_state(run.get("state") or run.get("status") or run.get("run_status"))
        fail_reason = self._extract_query_error(run) or self._extract_fail_reason(data)
        local_video_path = None
        video_url = None

        if run_state == _PIPPIT_SUCCESS_STATE:
            videos = self._extract_query_videos(run)
            if videos:
                video_url = _first_non_empty(
                    videos[0].get("download_url"),
                    videos[0].get("downloadUrl"),
                    videos[0].get("url"),
                )
            else:
                video_url = self._extract_video_url(data)

            if video_url:
                filename = _safe_video_filename(videos[0] if videos else {}, 1)
                local_video_path, download_error = await self._download_video_api(video_url, download_dir, filename)
                if download_error:
                    fail_reason = download_error
                    status = "running"
                else:
                    status = "success"
            else:
                status = "running"
                fail_reason = fail_reason or "小云雀任务已完成，但暂未拿到可下载视频"
        elif run_state == _PIPPIT_FAILED_STATE:
            status = "fail"
            fail_reason = fail_reason or "小云雀任务失败"
        else:
            status = "running"

        raw = data if isinstance(data, dict) else {"data": data}
        if local_video_path:
            raw["_local_video_path"] = local_video_path
            raw["_download_dir"] = download_dir

        return QueryResult(
            status=status,
            video_url=video_url or local_video_path,
            last_frame_url=None,
            duration=float(data.get("duration") or 0) if isinstance(data, dict) else 0,
            fail_reason=fail_reason if status == "fail" else None,
            raw=raw,
        )

    async def cancel(self, submit_id: str) -> bool:
        logger.info(f"[pippit-cli] cancel unsupported: {submit_id}")
        return False

    async def list_active(self) -> List[Dict[str, Any]]:
        # Not present in the supplied v1.0.7 docs.
        return []

    async def check_login(self) -> Dict[str, Any]:
        path = self._get_cli_path()
        exists = os.path.exists(path) or shutil.which(path) is not None
        has_key = bool(self._get_access_key())
        if has_key and exists:
            message = "小云雀 Access Key 已配置，HTTP 生成通道可用（CLI 已内置）"
        elif has_key:
            message = "小云雀 Access Key 已配置，HTTP 生成通道可用（未找到 CLI，不影响生成）"
        elif exists:
            message = "小云雀 CLI 已安装，但 Access Key 未配置"
        else:
            message = "小云雀 Access Key 未配置"
        return {
            "success": has_key,
            "logged_in": has_key,
            "has_access_key": has_key,
            "cli_found": exists,
            "balance": 0,
            "message": message,
            "cli_path": path,
        }
