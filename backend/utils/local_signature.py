"""v3.61.70 本机 API 签名校验
防 curl localhost:8000 直接调 backend 拿模板 content

机制:
  前端 fetch 时加 header:
    X-Session-License: <license_key 或 anonymous>
    X-Session-Nonce: <32 hex random>
    X-Session-Timestamp: <unix sec>
    X-Session-Token: HMAC_SHA256(session_secret, license + path + timestamp + nonce + body_hash)

  backend FastAPI dependency 校验:
    1. session_secret 跟 backend 启动时生成的对
    2. timestamp ±5min
    3. body 摘要对
    4. nonce 5min 不可重用

curl localhost:8000 拿不到 session_secret(在文件里,而且每次 backend 重启都换)→ token 算不出 → 403
"""
import hmac
import hashlib
import time
import logging
from fastapi import Request, HTTPException


logger = logging.getLogger(__name__)

# 同 admin 端那种,内存 nonce 去重
_nonce_seen: dict[str, float] = {}
_nonce_last_gc: float = 0.0
NONCE_TTL_SEC = 300  # 5 分钟


def _gc():
    global _nonce_last_gc
    now = time.time()
    if now - _nonce_last_gc < 60:
        return
    _nonce_last_gc = now
    expired = [k for k, v in _nonce_seen.items() if v < now]
    for k in expired:
        _nonce_seen.pop(k, None)


def _compute_token(secret: bytes, license_key: str, path: str, timestamp: str, nonce: str, body_hash: str) -> str:
    msg = f"{license_key}|{path}|{timestamp}|{nonce}|{body_hash}".encode("utf-8")
    return hmac.new(secret, msg, hashlib.sha256).hexdigest()


async def require_local_signature(request: Request):
    """FastAPI 依赖式校验.挂在 endpoint 上即可"""
    license_key = request.headers.get("X-Session-License", "")
    nonce = request.headers.get("X-Session-Nonce", "")
    timestamp = request.headers.get("X-Session-Timestamp", "")
    token = request.headers.get("X-Session-Token", "")

    if not token or not nonce or not timestamp:
        raise HTTPException(status_code=403, detail="missing session token")

    # 时间窗口
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        raise HTTPException(status_code=403, detail="invalid timestamp")
    now = int(time.time())
    if abs(now - ts) > 300:
        raise HTTPException(status_code=403, detail=f"timestamp_skew(diff={now - ts}s)")

    # nonce 去重
    _gc()
    if nonce in _nonce_seen:
        raise HTTPException(status_code=403, detail="nonce_reused")

    # 读 body bytes(GET 一般空)
    body = await request.body()
    body_hash = hashlib.sha256(body or b"").hexdigest()

    # 比签名
    from utils.local_secret import get_or_create_session_secret
    secret = get_or_create_session_secret()
    expected = _compute_token(secret, license_key, request.url.path, timestamp, nonce, body_hash)
    if not hmac.compare_digest(expected, token):
        raise HTTPException(status_code=403, detail="bad session token")

    _nonce_seen[nonce] = now + NONCE_TTL_SEC
    return {"license_key": license_key}
