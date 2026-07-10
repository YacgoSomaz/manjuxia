"""Offline-first guardrails for WanShan.

Cloud-facing legacy modules must opt in through WANSHAN_ENABLE_CLOUD.
The rebuilt app defaults to local-only behavior for data safety.
"""
import os


_TRUE_VALUES = {"1", "true", "yes", "on"}


def cloud_enabled() -> bool:
    return os.getenv("WANSHAN_ENABLE_CLOUD", "").strip().lower() in _TRUE_VALUES


def require_cloud(feature: str) -> None:
    if not cloud_enabled():
        raise RuntimeError(
            f"{feature} 已被万山离线策略禁用。"
            "如确需启用外联, 请先设置 WANSHAN_ENABLE_CLOUD=1。"
        )
