"""Outbound model endpoint policy for WanShan.

The app ships with trusted first-party presets, but users also need to connect
OpenAI-compatible relay providers. Relay URLs are allowed only when they are
basic HTTPS public endpoints, so users can work while we still block obvious
credential leaks and local-network probes.
"""

import ipaddress
from urllib.parse import urlparse


TRUSTED_MODEL_HOSTS = {
    "api.deepseek.com",
    "api.openai.com",
    "ark.cn-beijing.volces.com",
    "dashscope.aliyuncs.com",
    "api.siliconflow.cn",
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


def _is_blocked_ip_literal(hostname: str) -> bool:
    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        return False
    return any(
        (
            ip.is_private,
            ip.is_link_local,
            ip.is_multicast,
            ip.is_reserved,
            ip.is_unspecified,
        )
    )


def require_trusted_model_url(value: str) -> str:
    """Validate a model endpoint before any request leaves the application."""
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
        raise ValueError("模型地址必须使用 HTTPS")
    if _is_blocked_ip_literal(hostname):
        raise ValueError("模型地址不能指向内网或保留地址")

    # Built-in providers still pass by exact host, while custom relay providers
    # pass as public HTTPS domains. This keeps relay support usable without
    # allowing plaintext, embedded credentials, fragments, or private IPs.
    return raw
