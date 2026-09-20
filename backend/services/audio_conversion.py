"""Local audio normalization for video-reference assets.

Video providers do not share a consistent M4A/AAC support matrix.  The client
ships FFmpeg, so normalize M4A references to MP3 before they enter any provider
adapter.  The source M4A is deliberately retained next to the converted file.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import uuid
from pathlib import Path

from utils.paths import resolve_db_path


class AudioTranscodeError(RuntimeError):
    """Raised when a local M4A reference cannot be converted safely."""


def _ffmpeg_path() -> str:
    """Locate the FFmpeg bundled with the desktop application first."""
    from services.video_service import VideoService

    candidate = VideoService()._get_ffmpeg_path()
    if os.path.isfile(candidate) or shutil.which(candidate):
        return candidate

    # Development builds are not frozen, therefore VideoService normally only
    # checks PATH.  Keep the packaged layout's bundled binary available here.
    repo_candidate = Path(__file__).resolve().parents[2] / "build" / "ffmpeg.exe"
    if repo_candidate.is_file():
        return str(repo_candidate)
    raise AudioTranscodeError("未找到随软件安装的 FFmpeg，无法把 M4A 转为 MP3。")


def transcode_m4a_to_mp3(source_path: str, output_path: str | None = None) -> str:
    """Convert one M4A file to MP3 atomically and return the output path.

    Non-M4A paths are returned unchanged.  The original M4A is never removed.
    """
    source = os.path.abspath(str(source_path or ""))
    if os.path.splitext(source)[1].lower() != ".m4a":
        return source_path
    if not os.path.isfile(source):
        raise AudioTranscodeError("待转换的 M4A 音频文件不存在。")

    target = os.path.abspath(output_path or f"{os.path.splitext(source)[0]}.mp3")
    os.makedirs(os.path.dirname(target), exist_ok=True)
    temporary = f"{os.path.splitext(target)[0]}.tmp-{uuid.uuid4().hex}.mp3"
    command = [
        _ffmpeg_path(),
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", source,
        "-map", "0:a:0", "-vn",
        "-codec:a", "libmp3lame", "-q:a", "2",
        temporary,
    ]
    try:
        completed = subprocess.run(command, capture_output=True, timeout=120)
    except subprocess.TimeoutExpired as exc:
        raise AudioTranscodeError("M4A 转 MP3 超时，请使用更短的参考音频后重试。") from exc
    except FileNotFoundError as exc:
        raise AudioTranscodeError("未找到随软件安装的 FFmpeg，无法把 M4A 转为 MP3。") from exc

    if completed.returncode != 0 or not os.path.isfile(temporary) or os.path.getsize(temporary) == 0:
        try:
            os.remove(temporary)
        except OSError:
            pass
        detail = completed.stderr.decode("utf-8", errors="replace").strip()[-300:]
        raise AudioTranscodeError(f"M4A 转 MP3 失败：{detail or 'FFmpeg 未生成有效音频'}")

    os.replace(temporary, target)
    return target


def normalize_video_reference_audio(value: str) -> str:
    """Return a provider-safe path for a local video reference audio.

    Remote URLs and data URIs are already owned by an upstream provider and are
    not downloaded locally.  DB media paths retain their DB-path form.
    """
    text = str(value or "").strip()
    if not text or text.startswith(("http://", "https://", "data:", "asset://", "mm_file://")):
        return value

    db_path = text.startswith("/data/") or text.startswith("data/")
    source = resolve_db_path(text) if db_path else text
    if os.path.splitext(source)[1].lower() != ".m4a":
        return value
    target = transcode_m4a_to_mp3(source)
    if not db_path:
        return target
    prefix = "/data/" if text.startswith("/data/") else "data/"
    relative = text[len(prefix):]
    return prefix + f"{os.path.splitext(relative)[0]}.mp3"
