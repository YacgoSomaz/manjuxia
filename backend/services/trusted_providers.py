"""Trusted outbound model provider policy for WanShan."""

import ipaddress
from urllib.parse import urlparse


TRUSTED_MODEL_HOSTS = {
    "api.deepseek.com",
    "api.openai.com",
    "ark.cn-beijing.volces.com",
    "api.lingyaai.cn",
    "api.wuyinkeji.com",
    "api.bltcy.cn",
    "api.mjapi.cc.cd",
    "www.vjimeng.vip",
    "generativelanguage.googleapis.com",
}


def _is_loopback(hostname: str) -> bool:
    if hostname.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(hostname).is_loopback
    except ValueError:
        return False


def require_trusted_model_url(value: str) -> str:
    """Validate an LLM endpoint before any request leaves the application."""
    raw = (value or "").strip().rstrip("/")
    parsed = urlparse(raw)
    hostname = (parsed.hostname or "").lower()

    if not parsed.scheme or not hostname:
        raise ValueError("模型地址无效")
    if parsed.username or parsed.password or parsed.fragment:
        raise ValueError("模型地址不能包含凭据或片段")
    if _is_loopback(hostname):
        if parsed.scheme not in {"http", "https"}:
            raise ValueError("本机模型地址必须使用 HTTP 或 HTTPS")
        return raw
    if parsed.scheme != "https":
        raise ValueError("受信任服务商必须使用 HTTPS")
    if hostname not in TRUSTED_MODEL_HOSTS:
        raise ValueError("模型地址不在受信任服务商白名单中")
    return raw
