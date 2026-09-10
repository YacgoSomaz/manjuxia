"""Create and reuse the optional 2-second black reference video for Jimeng CLI.

The campaign switch is transport-only: callers append the cached MP4 to the
``--video`` inputs without adding any description to the generation prompt.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Any, Iterable, List

from utils.paths import get_data_dir


logger = logging.getLogger(__name__)

BLACK_VIDEO_DURATION_SECONDS = 2.0
_BLACK_VIDEO_PREFIX = "jimeng_black_2s_"
_CREATE_LOCK = threading.Lock()

_RATIO_SIZES = {
    "16:9": (640, 360),
    "9:16": (360, 640),
    "1:1": (512, 512),
    "4:3": (640, 480),
    "3:4": (480, 640),
    "21:9": (672, 288),
}


def jimeng_black_video_enabled(value: Any) -> bool:
    """Accept real booleans and common persisted truthy spellings safely."""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _normalize_ratio(ratio: Any) -> str:
    value = str(ratio or "16:9").strip().replace("：", ":")
    return value if value in _RATIO_SIZES else "16:9"


def _cache_path(ratio: Any) -> Path:
    normalized = _normalize_ratio(ratio)
    cache_dir = Path(get_data_dir()) / "cache" / "jimeng"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir / f"{_BLACK_VIDEO_PREFIX}{normalized.replace(':', 'x')}.mp4"


def is_jimeng_black_reference_video(path: Any) -> bool:
    """Identify our cache asset so duration probing can use the known 2 seconds."""
    name = Path(str(path or "")).name.lower()
    return name.startswith(_BLACK_VIDEO_PREFIX) and name.endswith(".mp4")


def _is_valid_cached_mp4(path: Path) -> bool:
    try:
        if not path.is_file() or path.stat().st_size < 1024:
            return False
        with path.open("rb") as source:
            return b"ftyp" in source.read(64)
    except OSError:
        return False


def _resolve_ffmpeg_path() -> str:
    from services.video_service import VideoService

    candidate = VideoService()._get_ffmpeg_path()
    if candidate and (os.path.isfile(candidate) or shutil.which(candidate)):
        return candidate

    # Development builds keep ffmpeg under <repo>/build; packaged builds are
    # already handled by VideoService._get_ffmpeg_path().
    repo_candidate = Path(__file__).resolve().parents[2] / "build" / "ffmpeg.exe"
    if repo_candidate.is_file():
        return str(repo_candidate)
    raise RuntimeError("未找到 FFmpeg，无法准备即梦活动用的2秒黑屏视频")


def _create_black_video(target: Path, ratio: str) -> None:
    width, height = _RATIO_SIZES[ratio]
    ffmpeg = _resolve_ffmpeg_path()
    temp_path = target.with_name(
        f".{target.stem}.{os.getpid()}.{threading.get_ident()}.tmp.mp4"
    )
    command = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c=black:s={width}x{height}:r=24:d=2",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(temp_path),
    ]
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if completed.returncode != 0 or not _is_valid_cached_mp4(temp_path):
            detail = (completed.stderr or b"").decode("utf-8", errors="replace")[-500:]
            raise RuntimeError(f"FFmpeg 生成失败（code={completed.returncode}）{': ' + detail if detail else ''}")
        os.replace(temp_path, target)
    finally:
        try:
            if temp_path.exists():
                temp_path.unlink()
        except OSError:
            pass


def ensure_jimeng_black_reference_video_sync(ratio: Any = "16:9") -> str:
    """Return a valid cached MP4, creating it atomically at most once per ratio."""
    normalized_ratio = _normalize_ratio(ratio)
    target = _cache_path(normalized_ratio)
    if _is_valid_cached_mp4(target):
        return str(target)

    with _CREATE_LOCK:
        if _is_valid_cached_mp4(target):
            return str(target)
        try:
            if target.exists():
                target.unlink()
        except OSError:
            pass
        try:
            _create_black_video(target, normalized_ratio)
        except Exception as exc:
            logger.error("[jimeng-black-video] create failed ratio=%s: %s", normalized_ratio, exc)
            raise RuntimeError(f"已开启2秒黑屏视频，但缓存素材准备失败：{exc}") from exc

    if not _is_valid_cached_mp4(target):
        raise RuntimeError("已开启2秒黑屏视频，但生成后的缓存素材无效")
    logger.info("[jimeng-black-video] cached ratio=%s path=%s", normalized_ratio, target)
    return str(target)


async def ensure_jimeng_black_reference_video(ratio: Any = "16:9") -> str:
    return await asyncio.to_thread(ensure_jimeng_black_reference_video_sync, ratio)


async def prepare_jimeng_reference_videos(
    videos: Iterable[str] | None,
    include_black_video: Any,
    ratio: Any,
) -> List[str]:
    """Append exactly one campaign black video while preserving user video order."""
    raw_videos = [videos] if isinstance(videos, (str, os.PathLike)) else (videos or [])
    prepared = [str(item) for item in raw_videos if str(item or "").strip()]
    if not jimeng_black_video_enabled(include_black_video):
        return prepared

    black_path = await ensure_jimeng_black_reference_video(ratio)
    black_norm = os.path.normcase(os.path.abspath(black_path))
    if not any(os.path.normcase(os.path.abspath(item)) == black_norm for item in prepared):
        prepared.append(black_path)
    return prepared
