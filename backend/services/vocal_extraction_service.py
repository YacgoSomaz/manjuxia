"""Local speech extraction from a short video segment.

The actual background removal is done by the public Kim Vocal 2 MDX ONNX
model.  Only NumPy and ONNX Runtime are needed at runtime; the much larger
PyTorch/audio-separator stack is deliberately not bundled with the desktop
application.
"""

from __future__ import annotations

import hashlib
import logging
import os
import shutil
import subprocess
import sys
import threading
import urllib.request
import wave
from typing import Optional

from utils.paths import get_data_dir

logger = logging.getLogger(__name__)


MODEL_FILENAME = "Kim_Vocal_2.onnx"
MODEL_URL = (
    "https://github.com/TRvlvr/model_repo/releases/download/"
    "all_public_uvr_models/Kim_Vocal_2.onnx"
)
MODEL_SIZE = 66_759_214
MODEL_SHA256 = "ce74ef3b6a6024ce44211a07be9cf8bc6d87728cc852a68ab34eb8e58cde9c8b"

SAMPLE_RATE = 44_100
N_FFT = 7_680
HOP_LENGTH = 1_024
DIM_F = 3_072
SEGMENT_SIZE = 256
OVERLAP = 0.25
COMPENSATE = 1.009

_MODEL_LOCK = threading.Lock()
_INFERENCE_LOCK = threading.Lock()
_SESSION = None
_SESSION_MODEL_PATH = ""
_VALIDATED_MODEL_PATH = ""


class VocalExtractionError(RuntimeError):
    pass


def _resolve_ffmpeg_path(ffmpeg_path: Optional[str] = None) -> str:
    if not ffmpeg_path:
        from services.video_service import VideoService

        ffmpeg_path = VideoService()._get_ffmpeg_path()
    if not os.path.isfile(ffmpeg_path) and not shutil.which(ffmpeg_path):
        repo_ffmpeg = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "build",
            "ffmpeg.exe",
        )
        if os.path.isfile(repo_ffmpeg):
            ffmpeg_path = repo_ffmpeg
    if not os.path.isfile(ffmpeg_path) and not shutil.which(ffmpeg_path):
        raise VocalExtractionError("未找到本地 FFmpeg 组件，请更新或重新安装客户端。")
    return ffmpeg_path


def analyze_audio_waveform(
    video_path: str,
    *,
    bins: int = 320,
    ffmpeg_path: Optional[str] = None,
) -> dict:
    """Decode a lightweight mono track and return normalized waveform peaks."""
    import numpy as np

    if not os.path.isfile(video_path):
        raise VocalExtractionError("待分析的视频文件不存在。")
    ffmpeg_path = _resolve_ffmpeg_path(ffmpeg_path)
    analysis_rate = 800
    command = [
        ffmpeg_path,
        "-hide_banner",
        "-loglevel", "error",
        "-i", video_path,
        "-map", "0:a:0?",
        "-vn",
        "-ac", "1",
        "-ar", str(analysis_rate),
        "-f", "s16le",
        "pipe:1",
    ]
    try:
        completed = subprocess.run(command, capture_output=True, timeout=300)
    except subprocess.TimeoutExpired as exc:
        raise VocalExtractionError("视频音轨分析超时，请先裁短视频后重试。") from exc
    if completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", errors="replace").strip()
        raise VocalExtractionError(f"读取视频音轨失败: {detail[-300:] or 'FFmpeg 未返回音频'}")
    samples = np.frombuffer(completed.stdout, dtype="<i2").astype(np.float32)
    if samples.size < analysis_rate:
        raise VocalExtractionError("视频没有可用音轨，或音轨时长不足 1 秒。")
    samples = np.abs(samples) / 32768.0
    duration = samples.size / analysis_rate
    target_bins = max(80, min(int(bins), 600, samples.size))
    edges = np.linspace(0, samples.size, target_bins + 1, dtype=np.int64)
    peaks = np.empty(target_bins, dtype=np.float32)
    for index in range(target_bins):
        part = samples[edges[index]:edges[index + 1]]
        peaks[index] = float(np.percentile(part, 95)) if part.size else 0.0
    scale = float(np.percentile(peaks, 98)) if peaks.size else 0.0
    if scale > 1e-6:
        peaks = np.clip(peaks / scale, 0.0, 1.0)
    return {
        "duration": round(float(duration), 3),
        "peaks": [round(float(value), 4) for value in peaks],
    }


def _sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().lower()


def _model_candidates() -> list[str]:
    candidates: list[str] = []
    frozen_root = getattr(sys, "_MEIPASS", "")
    if frozen_root:
        candidates.append(os.path.join(frozen_root, "ml_models", MODEL_FILENAME))
    candidates.append(
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_models", MODEL_FILENAME)
    )
    candidates.append(os.path.join(get_data_dir(), "ml_models", MODEL_FILENAME))
    unique: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = os.path.abspath(candidate)
        if key not in seen:
            seen.add(key)
            unique.append(candidate)
    return unique


def _is_valid_model(path: str, *, verify_hash: bool = True) -> bool:
    if not path or not os.path.isfile(path) or os.path.getsize(path) != MODEL_SIZE:
        return False
    return not verify_hash or _sha256(path) == MODEL_SHA256


def _download_model(target: str) -> None:
    os.makedirs(os.path.dirname(target), exist_ok=True)
    partial = target + ".part"
    for attempt in range(1, 4):
        existing = os.path.getsize(partial) if os.path.exists(partial) else 0
        if existing > MODEL_SIZE:
            os.remove(partial)
            existing = 0
        headers = {"User-Agent": "QianshanAI-VocalExtractor/1.0"}
        if existing:
            headers["Range"] = f"bytes={existing}-"
        request = urllib.request.Request(MODEL_URL, headers=headers)
        try:
            logger.info(
                "[人声提取] 准备分离模型 attempt=%s resume=%s/%s",
                attempt,
                existing,
                MODEL_SIZE,
            )
            with urllib.request.urlopen(request, timeout=90) as response:
                status = int(getattr(response, "status", 200) or 200)
                mode = "ab" if existing and status == 206 else "wb"
                with open(partial, mode) as output:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        output.write(chunk)
            if _is_valid_model(partial):
                os.replace(partial, target)
                return
            logger.warning(
                "[人声提取] 模型校验失败 size=%s expected=%s",
                os.path.getsize(partial) if os.path.exists(partial) else 0,
                MODEL_SIZE,
            )
        except Exception as exc:
            logger.warning("[人声提取] 模型下载第 %s 次失败: %s", attempt, exc)
        if attempt == 3:
            break
    raise VocalExtractionError(
        "人声分离模型下载或校验失败。请检查网络后重试；已下载的不完整文件不会参与处理。"
    )


def ensure_vocal_model() -> str:
    global _VALIDATED_MODEL_PATH
    if _VALIDATED_MODEL_PATH and _is_valid_model(_VALIDATED_MODEL_PATH, verify_hash=False):
        return _VALIDATED_MODEL_PATH
    with _MODEL_LOCK:
        if _VALIDATED_MODEL_PATH and _is_valid_model(_VALIDATED_MODEL_PATH, verify_hash=False):
            return _VALIDATED_MODEL_PATH
        for candidate in _model_candidates():
            if _is_valid_model(candidate):
                _VALIDATED_MODEL_PATH = candidate
                return candidate
        target = os.path.join(get_data_dir(), "ml_models", MODEL_FILENAME)
        _download_model(target)
        _VALIDATED_MODEL_PATH = target
        return target


def _get_session(model_path: str):
    global _SESSION, _SESSION_MODEL_PATH
    if _SESSION is not None and _SESSION_MODEL_PATH == model_path:
        return _SESSION
    try:
        import onnxruntime as ort
    except Exception as exc:
        raise VocalExtractionError("本地人声分离组件缺失，请更新或重新安装客户端。") from exc
    options = ort.SessionOptions()
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    options.intra_op_num_threads = max(1, min(4, (os.cpu_count() or 2) // 2))
    options.inter_op_num_threads = 1
    options.log_severity_level = 3
    _SESSION = ort.InferenceSession(
        model_path,
        sess_options=options,
        providers=["CPUExecutionProvider"],
    )
    _SESSION_MODEL_PATH = model_path
    return _SESSION


def _periodic_hann(size: int):
    import numpy as np

    return np.hanning(size + 1)[:-1].astype(np.float32)


def _stft(waveform):
    import numpy as np

    pad = N_FFT // 2
    padded = np.pad(waveform, ((0, 0), (0, 0), (pad, pad)), mode="reflect")
    frames = np.lib.stride_tricks.sliding_window_view(padded, N_FFT, axis=-1)
    frames = frames[..., ::HOP_LENGTH, :]
    frames = frames * _periodic_hann(N_FFT)[None, None, None, :]
    spectrum = np.fft.rfft(frames, n=N_FFT, axis=-1)
    spectrum = np.transpose(spectrum, (0, 1, 3, 2))
    result = np.stack((spectrum.real, spectrum.imag), axis=2)
    batch, channels, complex_parts, bins, frame_count = result.shape
    return result.reshape(batch, channels * complex_parts, bins, frame_count)[..., :DIM_F, :].astype(np.float32)


def _istft(spectrum):
    import numpy as np

    batch, packed_channels, bins, frame_count = spectrum.shape
    channels = packed_channels // 2
    full_bins = N_FFT // 2 + 1
    if bins < full_bins:
        spectrum = np.pad(spectrum, ((0, 0), (0, 0), (0, full_bins - bins), (0, 0)))
    unpacked = spectrum.reshape(batch, channels, 2, full_bins, frame_count)
    complex_spec = unpacked[:, :, 0] + 1j * unpacked[:, :, 1]
    frames = np.fft.irfft(np.transpose(complex_spec, (0, 1, 3, 2)), n=N_FFT, axis=-1)
    window = _periodic_hann(N_FFT)
    output_size = N_FFT + HOP_LENGTH * (frame_count - 1)
    output = np.zeros((batch, channels, output_size), dtype=np.float32)
    divider = np.zeros(output_size, dtype=np.float32)
    for idx in range(frame_count):
        start = idx * HOP_LENGTH
        output[..., start:start + N_FFT] += frames[..., idx, :] * window
        divider[start:start + N_FFT] += window * window
    valid = divider > 1e-8
    output[..., valid] /= divider[valid]
    center = N_FFT // 2
    return output[..., center:-center]


def _run_model(session, chunk):
    spectrum = _stft(chunk)
    spectrum[:, :, :3, :] = 0
    input_name = session.get_inputs()[0].name
    prediction = session.run(None, {input_name: spectrum})[0]
    return _istft(prediction)


def _separate_vocals(mix):
    import numpy as np

    if mix.ndim != 2 or mix.shape[0] != 2:
        raise VocalExtractionError("视频音轨无法转换为双声道，不能执行人声分离。")
    trim = N_FFT // 2
    chunk_size = HOP_LENGTH * (SEGMENT_SIZE - 1)
    gen_size = chunk_size - 2 * trim
    pad = gen_size + trim - (mix.shape[-1] % gen_size)
    mixture = np.concatenate(
        (np.zeros((2, trim), dtype=np.float32), mix, np.zeros((2, pad), dtype=np.float32)),
        axis=1,
    )
    step = int((1.0 - OVERLAP) * chunk_size)
    result = np.zeros((1, 2, mixture.shape[-1]), dtype=np.float32)
    divider = np.zeros((1, 2, mixture.shape[-1]), dtype=np.float32)
    model_path = ensure_vocal_model()
    session = _get_session(model_path)
    for start in range(0, mixture.shape[-1], step):
        end = min(start + chunk_size, mixture.shape[-1])
        actual = end - start
        part = mixture[:, start:end]
        if actual < chunk_size:
            part = np.pad(part, ((0, 0), (0, chunk_size - actual)))
        window = np.hanning(actual).astype(np.float32)[None, None, :]
        predicted = _run_model(session, part[None, ...])
        result[..., start:end] += predicted[..., :actual] * window
        divider[..., start:end] += window
    np.divide(result, divider, out=result, where=divider > 1e-8)
    vocals = result[:, :, trim:-trim][0, :, :mix.shape[-1]] * COMPENSATE
    return np.clip(vocals, -1.0, 1.0).astype(np.float32)


def _decode_segment(ffmpeg_path: str, video_path: str, start_time: float, duration: float):
    import numpy as np

    command = [
        ffmpeg_path,
        "-hide_banner",
        "-loglevel", "error",
        "-ss", f"{start_time:.3f}",
        "-i", video_path,
        "-t", f"{duration:.3f}",
        "-map", "0:a:0?",
        "-vn",
        "-ac", "2",
        "-ar", str(SAMPLE_RATE),
        "-f", "f32le",
        "pipe:1",
    ]
    completed = subprocess.run(command, capture_output=True, timeout=120)
    if completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", errors="replace").strip()
        raise VocalExtractionError(f"读取视频音轨失败: {detail[-300:] or 'FFmpeg 未返回音频'}")
    audio = np.frombuffer(completed.stdout, dtype="<f4")
    if audio.size < SAMPLE_RATE * 2:
        raise VocalExtractionError("选中片段没有可用人声或视频本身没有音轨。")
    audio = audio[: audio.size - (audio.size % 2)].reshape(-1, 2).T.copy()
    return audio


def _write_processed_wav(ffmpeg_path: str, vocals, output_path: str) -> None:
    raw_path = output_path + ".f32.tmp"
    wav_tmp = output_path + ".tmp.wav"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    try:
        vocals.T.astype("<f4", copy=False).tofile(raw_path)
        command = [
            ffmpeg_path,
            "-hide_banner",
            "-loglevel", "error",
            "-y",
            "-f", "f32le",
            "-ar", str(SAMPLE_RATE),
            "-ac", "2",
            "-i", raw_path,
            "-af", "highpass=f=70,lowpass=f=14000,loudnorm=I=-18:TP=-1.5:LRA=9",
            "-ar", str(SAMPLE_RATE),
            "-ac", "1",
            "-c:a", "pcm_s16le",
            wav_tmp,
        ]
        completed = subprocess.run(command, capture_output=True, timeout=120)
        if completed.returncode != 0 or not os.path.exists(wav_tmp):
            detail = completed.stderr.decode("utf-8", errors="replace").strip()
            raise VocalExtractionError(f"保存人声音频失败: {detail[-300:] or 'FFmpeg 输出为空'}")
        os.replace(wav_tmp, output_path)
    finally:
        for path in (raw_path, wav_tmp):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass


def _quality_report(wav_path: str) -> dict:
    import numpy as np

    with wave.open(wav_path, "rb") as reader:
        frame_rate = reader.getframerate()
        frame_count = reader.getnframes()
        channels = reader.getnchannels()
        width = reader.getsampwidth()
        raw = reader.readframes(frame_count)
    if width != 2 or not raw:
        raise VocalExtractionError("提取结果格式异常，请重新选择片段。")
    samples = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    duration = len(samples) / max(frame_rate, 1)
    rms = float(np.sqrt(np.mean(samples * samples))) if samples.size else 0.0
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    block = max(1, int(frame_rate * 0.02))
    usable = samples[: (len(samples) // block) * block]
    if usable.size:
        block_rms = np.sqrt(np.mean(usable.reshape(-1, block) ** 2, axis=1))
        speech_ratio = float(np.mean(block_rms > 0.006))
    else:
        speech_ratio = 0.0
    if duration < 1.8 or rms < 0.003 or peak < 0.02 or speech_ratio < 0.12:
        raise VocalExtractionError(
            "分离后有效人声过少。请换到单人连续说话、音乐较弱的 5 秒片段重试。"
        )
    return {
        "duration": round(duration, 3),
        "rms": round(rms, 5),
        "peak": round(peak, 5),
        "speech_ratio": round(speech_ratio, 3),
    }


def _repeat_audio_to_duration(vocals, target_duration: float):
    """Loop a selected voice clip with a short crossfade to reduce seam clicks."""
    import numpy as np

    target_samples = max(1, int(round(target_duration * SAMPLE_RATE)))
    if vocals.shape[-1] >= target_samples:
        return vocals[..., :target_samples]
    fade = min(int(SAMPLE_RATE * 0.01), max(1, vocals.shape[-1] // 8))
    result = vocals.copy()
    while result.shape[-1] < target_samples:
        overlap = min(fade, result.shape[-1], vocals.shape[-1])
        if overlap <= 0:
            result = np.concatenate((result, vocals), axis=-1)
            continue
        blend = np.linspace(0.0, 1.0, overlap, dtype=np.float32)[None, :]
        seam = result[..., -overlap:] * (1.0 - blend) + vocals[..., :overlap] * blend
        result = np.concatenate((result[..., :-overlap], seam, vocals[..., overlap:]), axis=-1)
    return result[..., :target_samples]


def extract_vocals_from_video(
    video_path: str,
    output_path: str,
    *,
    start_time: float,
    duration: float,
    repeat_to_seconds: Optional[float] = None,
    ffmpeg_path: Optional[str] = None,
) -> dict:
    """Extract and isolate the vocal stem from one video segment."""
    if not 0 <= start_time:
        raise VocalExtractionError("起始时间不能小于 0 秒。")
    if not 2.0 <= duration <= 15.0:
        raise VocalExtractionError("人声片段必须在 2–15 秒之间。")
    if not os.path.isfile(video_path):
        raise VocalExtractionError("待提取的视频文件不存在。")
    ffmpeg_path = _resolve_ffmpeg_path(ffmpeg_path)
    repeat_target = float(repeat_to_seconds or 0)
    if repeat_target and not duration < repeat_target <= 15.0:
        raise VocalExtractionError("循环补足时长必须大于当前选区且不超过 15 秒。")
    with _INFERENCE_LOCK:
        mix = _decode_segment(ffmpeg_path, video_path, start_time, duration)
        vocals = _separate_vocals(mix)
        if repeat_target:
            vocals = _repeat_audio_to_duration(vocals, repeat_target)
        _write_processed_wav(ffmpeg_path, vocals, output_path)
    report = _quality_report(output_path)
    report.update({
        "selected_duration": round(float(duration), 3),
        "repeated": bool(repeat_target),
        "repeat_to_seconds": round(repeat_target, 3) if repeat_target else None,
    })
    logger.info(
        "[人声提取] 完成 start=%.3f duration=%.3f output=%s report=%s",
        start_time,
        duration,
        output_path,
        report,
    )
    return report
