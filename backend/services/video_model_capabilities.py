"""Central capability routing for storyboard/video model families.

Model limits and video-submission availability are separate concerns.  A model
family can be used by storyboard templates before every video provider supports
it, so availability is resolved with both the family and provider type.
"""

import math
from typing import Any, Dict, Iterable


VIDEO_MODEL_CAPABILITIES: Dict[str, Dict[str, Any]] = {
    "seedance_2_0": {
        "label": "Seedance 2.0",
        "min_duration_seconds": 4,
        "max_duration_seconds": 15,
        "min_reference_duration_seconds": 2,
        "max_reference_duration_seconds": 15,
        "max_total_audio_duration_seconds": 15,
        "max_total_video_duration_seconds": 15,
        "audio_only_multimodal": False,
        "max_images": 9,
        "max_audios": 3,
        "max_videos": 3,
        "max_total_materials": 12,
        "available_video_providers": ("*",),
    },
    "seedance_2_5": {
        "label": "Seedance 2.5",
        "min_duration_seconds": 4,
        "max_duration_seconds": 30,
        # Upstream UI describes the user-facing range as 2-30s. The actual
        # validator intentionally accepts the documented 0.2s probe tolerance.
        "min_reference_duration_seconds": 1.8,
        "max_reference_duration_seconds": 30.2,
        "max_total_audio_duration_seconds": 30.2,
        "max_total_video_duration_seconds": 30.2,
        "audio_only_multimodal": True,
        "max_images": 30,
        "max_audios": 10,
        "max_videos": 10,
        "max_total_materials": 50,
        # These are quality recommendations, not submission limits. The UI
        # warns and lets the user decide whether to continue.
        "recommended_max_subject_images": 8,
        "recommended_max_subject_videos": 5,
        # Confirmed upstream identifiers:
        # - XiaoYunque/Pippit CLI v1.0.17: Seedance_2.5
        # - Jimeng/Dreamina CLI v1.4.15: seedance2.5
        "available_video_providers": ("pippit_cli", "jimeng"),
    },
}


def normalize_video_model_family(value: Any) -> str:
    raw = str(value or "").strip().lower()
    if "2.5" in raw or "2_5" in raw or "25" == raw:
        return "seedance_2_5"
    return "seedance_2_0"


def normalize_video_provider_type(value: Any) -> str:
    raw = str(value or "").strip().lower()
    if raw in ("pippit", "pippit_cli", "xiaoyunque") or "pippit" in raw or "小云雀" in raw:
        return "pippit_cli"
    if raw in ("jimeng", "dreamina", "jimeng_cli") or "jimeng" in raw or "即梦" in raw:
        return "jimeng"
    if raw in ("ark", "volcengine", "volcengine_ark"):
        return "volcengine_ark"
    return raw


def is_video_generation_available(value: Any, provider_type: Any = None) -> bool:
    family = normalize_video_model_family(value)
    allowed = VIDEO_MODEL_CAPABILITIES[family]["available_video_providers"]
    if "*" in allowed:
        return True
    if provider_type is None:
        # No provider means "universally available". Provider-specific model
        # families intentionally remain false in this compatibility mode.
        return False
    return normalize_video_provider_type(provider_type) in allowed


def canonical_video_model_name(value: Any, provider_type: Any = None) -> str:
    """Return the exact upstream identifier where a provider requires one."""
    raw = str(value or "").strip()
    if normalize_video_model_family(raw) == "seedance_2_5":
        provider = normalize_video_provider_type(provider_type)
        if provider == "pippit_cli":
            return "Seedance_2.5"
        if provider == "jimeng":
            return "seedance2.5"
    return raw


def get_video_model_capabilities(value: Any, provider_type: Any = None) -> Dict[str, Any]:
    family = normalize_video_model_family(value)
    capabilities = {"family": family, **VIDEO_MODEL_CAPABILITIES[family]}
    capabilities["video_generation_available"] = is_video_generation_available(
        value,
        provider_type,
    )
    return capabilities


def reference_media_duration_error(
    value: Any,
    durations: Iterable[Any],
    media_label: str,
) -> str:
    """Return a friendly model-specific reference-media duration error."""
    capabilities = get_video_model_capabilities(value)
    minimum = float(capabilities.get("min_reference_duration_seconds") or 2)
    maximum = float(capabilities.get("max_reference_duration_seconds") or 15)
    total_limit_key = (
        "max_total_video_duration_seconds"
        if media_label == "视频"
        else "max_total_audio_duration_seconds"
    )
    total_maximum = float(capabilities.get(total_limit_key) or maximum)
    valid_durations = []
    for raw in durations or []:
        try:
            duration = float(raw)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(duration):
            continue
        if duration < minimum or duration > maximum:
            if capabilities["family"] == "seedance_2_5":
                return (
                    f"Seedance 2.5 单条参考{media_label}需为 2-30 秒"
                    f"（实际容差 {minimum:g}-{maximum:g} 秒），当前 {duration:.2f} 秒"
                )
            return (
                f"{capabilities['label']} 单条参考{media_label}需为 "
                f"{minimum:g}-{maximum:g} 秒，当前 {duration:.2f} 秒"
            )
        valid_durations.append(duration)

    total = sum(valid_durations)
    if total > total_maximum:
        display_limit = 30 if capabilities["family"] == "seedance_2_5" else total_maximum
        tolerance_note = (
            f"（实际容差 ≤{total_maximum:g} 秒）"
            if capabilities["family"] == "seedance_2_5"
            else ""
        )
        return (
            f"{capabilities['label']} 所有参考{media_label}总时长需 ≤{display_limit:g} 秒"
            f"{tolerance_note}，当前合计 {total:.2f} 秒"
        )
    return ""


def reference_audio_duration_error(value: Any, durations: Iterable[Any]) -> str:
    return reference_media_duration_error(value, durations, "音频")


def reference_video_duration_error(value: Any, durations: Iterable[Any]) -> str:
    return reference_media_duration_error(value, durations, "视频")
