"""Local API access checks shared by the FastAPI middleware and tests."""
from fastapi import Request

from utils.commercial_guard import require_active_commercial_context, requires_membership
from utils.local_signature import require_local_signature


PUBLIC_LOCAL_PATHS = {"/api/health"}
BRIDGE_PATH_PREFIX = "/api/license/context/"


def is_business_api_path(path: str) -> bool:
    return str(path or "").startswith("/api/") and str(path or "") not in PUBLIC_LOCAL_PATHS


async def require_local_business_access(request: Request) -> None:
    """Require per-request local HMAC plus an active account entitlement."""
    if not is_business_api_path(request.url.path):
        return
    if request.url.path.startswith(BRIDGE_PATH_PREFIX):
        return
    await require_local_signature(request)
    if requires_membership(request.method, request.url.path):
        require_active_commercial_context()
