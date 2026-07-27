"""Commercial account gate for local business APIs.

This is intentionally a local enforcement layer. It prevents ordinary callers
from using the loopback backend before Electron has verified the short-lived,
server-signed account entitlement. Remote/cloud capabilities must still check
the anyq.site session and user_products themselves.
"""
import os
import time
from datetime import datetime, timezone

from fastapi import HTTPException

from services import license_context


def commercial_auth_enabled() -> bool:
    return os.environ.get("WANSHAN_REQUIRE_ACCOUNT_AUTH", "0").strip() == "1"


def _is_basic_novel_operation(method: str, path: str) -> bool:
    """Keep importing and parsing a novel available before membership purchase.

    The request still passes the loopback HMAC middleware. This exemption only
    removes the commercial entitlement gate from the low-risk local import
    workflow; paid generation, export, and other business operations remain
    protected by the normal membership check.
    """
    if str(method or "GET").upper() != "POST":
        return False
    normalized_path = str(path or "").rstrip("/") or "/"
    return normalized_path in {
        "/api/novels",
        "/api/novels/upload",
    } or normalized_path.endswith((
        "/parse-chapters",
        "/incremental-import",
        "/incremental-upload",
    ))


def requires_membership(method: str, path: str) -> bool:
    """Regular users can browse the workspace; creation/export remains paid."""
    if not commercial_auth_enabled():
        return False
    normalized_method = str(method or "GET").upper()
    normalized_path = str(path or "")
    if _is_basic_novel_operation(normalized_method, normalized_path):
        return False
    if normalized_method in {"GET", "HEAD", "OPTIONS"}:
        return any(segment in normalized_path for segment in ("/export", "/download", "/full-prompt"))
    return True


def _expires_at_is_active(value: str | None) -> bool:
    if not value:
        return False
    try:
        normalized = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).astimezone(timezone.utc).timestamp() > time.time()
    except (TypeError, ValueError):
        return False


def require_active_commercial_context() -> None:
    """Reject local business requests unless the verified product is active."""
    if not commercial_auth_enabled():
        return

    context = license_context.get_context()
    if not context.get("authorized") or not context.get("verified_envelope"):
        raise HTTPException(status_code=401, detail="account_required")

    expected_product = os.environ.get("WANSHAN_REQUIRED_PRODUCT_ID", "comic_shrimp")
    expected_entitlement = os.environ.get("WANSHAN_REQUIRED_ENTITLEMENT", "comic_course")
    if context.get("product_id") != expected_product or context.get("entitlement") != expected_entitlement:
        raise HTTPException(status_code=403, detail="product_entitlement_required")

    try:
        signed_until = int(context.get("signed_until") or 0)
    except (TypeError, ValueError):
        signed_until = 0
    if signed_until <= int(time.time()):
        raise HTTPException(status_code=401, detail="account_signature_expired")

    if not _expires_at_is_active(context.get("expires_at")):
        raise HTTPException(status_code=403, detail="product_expired")
