"""v3.61.68 客户端签名 — 防 AI 工具 / curl / postman 直接调 admin 接口扒模板

设计:
  - HMAC_SHA256(shared_secret, license + machine_id + timestamp + nonce + body_hash)
  - shared_secret 写在 backend 二进制里(简单混淆,拦小白)
  - timestamp ±5 分钟防重放
  - nonce 16 字节,服务端在 10 分钟窗口内不能重复

破解者拿到 license 也没用 — 他不知道 secret 怎么签出 X-Client-Signature → admin 返 403

未来 secret 泄露:发新版客户端换 secret,admin 维护 SECRETS 数组接受新旧多个,过 1 周下线老的
"""

import hmac
import hashlib
import time
import os
import secrets as _secrets


# v3.61.68 初版 secret
# 混淆方式:分段 + base64 / XOR — 反编译能拼,但提高 grep 难度
# 真到 v2/v3 时整个 helper 重写,把混淆方式也换掉
def _get_shared_secret() -> bytes:
    """运行时拼 secret,不直接写明文字符串"""
    # secret v1 — 32 字节
    # 拆 4 段,各自 base64 编码,运行时合并
    parts = [
        "cWlhbnNoYW4=",     # qianshan
        "X3RtcGw=",          # _tmpl
        "X3YxXzIwMjY=",      # _v1_2026
        "X3NlY3JldF8wNQ==",  # _secret_05
    ]
    import base64
    joined = b"".join(base64.b64decode(p) for p in parts)
    # 再做一次 SHA-256 派生,得到固定 32 字节 key
    return hashlib.sha256(joined).digest()


def sign_request(license_key: str, machine_id: str, body: bytes = b"", time_offset_sec: int = 0) -> dict:
    """生成请求签名 headers

    返回:
      {
        "X-License-Key": str,
        "X-Machine-Id": str,
        "X-Timestamp": str,
        "X-Nonce": str,
        "X-Client-Signature": str,
      }
    """
    timestamp = str(int(time.time()) + int(time_offset_sec or 0))
    nonce = _secrets.token_hex(16)  # 32 字符 hex
    body_hash = hashlib.sha256(body or b"").hexdigest()

    message = f"{license_key}|{machine_id or ''}|{timestamp}|{nonce}|{body_hash}".encode("utf-8")
    secret = _get_shared_secret()
    sig = hmac.new(secret, message, hashlib.sha256).hexdigest()

    return {
        "X-License-Key": license_key,
        "X-Machine-Id": machine_id or "",
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Client-Signature": sig,
    }


def verify_signature(
    license_key: str,
    machine_id: str,
    timestamp: str,
    nonce: str,
    body: bytes,
    signature: str,
    max_skew_sec: int = 300,
) -> tuple[bool, str]:
    """服务端校验签名

    返回 (是否通过, 失败原因/'ok')
    """
    # 1. 时间窗口
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False, "invalid_timestamp"
    now = int(time.time())
    if abs(now - ts) > max_skew_sec:
        return False, f"timestamp_skew (diff={now - ts}s)"

    # 2. nonce 长度
    if not nonce or len(nonce) < 16:
        return False, "invalid_nonce"

    # 3. 签名比对
    body_hash = hashlib.sha256(body or b"").hexdigest()
    message = f"{license_key}|{machine_id or ''}|{timestamp}|{nonce}|{body_hash}".encode("utf-8")
    secret = _get_shared_secret()
    expected = hmac.new(secret, message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature or ""):
        return False, "signature_mismatch"
    return True, "ok"
