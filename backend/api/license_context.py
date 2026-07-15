"""License 凭证上下文 API:electron 激活/验证成功后推送给 backend,
template_service 等需要向 admin 拉取受保护资源时用。

v3.59.60 新增 cloud_token 相关 endpoints — verify 成功后 Electron 把云端 token 推给 backend,
backend 拿来调 qianshanai.cn 的 LLM 配置接口。
"""
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Any

from services import license_context as _lc
from services import cloud_token_service as _cts
from utils.local_signature import require_local_signature

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/license/context",
    tags=["license-context"],
    dependencies=[Depends(require_local_signature)],
)


class SetContextRequest(BaseModel):
    license_key: str
    machine_id: str
    source: Optional[str] = None  # 'qianshan' / 'thirdparty'
    product_id: str
    entitlement: str
    expires_at: str
    signed_until: int


@router.post("/set")
async def set_license_context(req: SetContextRequest):
    _lc.set_context(
        req.license_key,
        req.machine_id,
        req.source,
        req.product_id,
        req.entitlement,
        req.expires_at,
        req.signed_until,
    )
    return {"success": True}


@router.get("/status")
async def get_license_context_status():
    ctx = _lc.get_context()
    return {
        "is_set": _lc.is_set(),
        "source": ctx.get("source"),
        # 不回显完整 license_key,只给末 4 位给前端调试用
        "license_key_tail": (ctx.get("license_key") or "")[-4:] if ctx.get("license_key") else None,
    }


@router.post("/clear")
async def clear_license_context():
    _lc.clear_context()
    # v3.59.60:同步清云端 token,避免切账号时还用着旧 token
    _cts.on_logout()
    # v3.61.226:同步清团队上下文,避免切账号后 teamId 残留(守卫放行 → 用旧 token 调团队接口报错)
    try:
        from services import team_context_service as _team_ctx
        _team_ctx.clear_context()
    except Exception:
        pass
    # v3.59.68:同步清云端 LLM 配置缓存,避免切账号拿到上个用户的 list
    try:
        from services.cloud_llm_sync import invalidate_cache
        invalidate_cache()
    except Exception:
        pass
    return {"success": True}


# ============================================================
# v3.59.60:云端 token (qianshanai.cn 个人中心 API 鉴权用)
# ============================================================

class SetCloudTokenRequest(BaseModel):
    """Electron 调 /tools/verify 成功后,把响应里的 4 个 token 字段推给 backend。
    backend 持有 token 后,后续调 https://api.qianshanai.cn/api/* 都带 Bearer。
    """
    accessToken: str
    refreshToken: Optional[str] = ""
    expiresIn: Optional[int] = 7200
    userId: Optional[Any] = None
    # v3.61.226: verify 响应里的 data.team(席位/受邀成员都可能有),用于设团队上下文
    team: Optional[Any] = None


@router.post("/set-cloud-token")
async def set_cloud_token(req: SetCloudTokenRequest):
    if not req.accessToken:
        return {"success": False, "message": "accessToken 必填"}
    _cts.on_verify_success({
        "accessToken": req.accessToken,
        "refreshToken": req.refreshToken or "",
        "expiresIn": req.expiresIn or 7200,
        "userId": req.userId,
    })
    # v3.61.226: 团队上下文来自 verify 的 data.team(team 为空=个人用户,会清空团队态)
    try:
        from services import team_context_service as _team_ctx
        _team_ctx.apply_team_from_verify(req.team if isinstance(req.team, dict) else None)
    except Exception as e:
        logger.warning(f"[set-cloud-token] 应用团队上下文失败(忽略): {e}")

    # v3.59.60:token 就绪后立即异步触发一次 sync_from_local
    # 把本地 llm_configs 推到云端;失败已在 sync 内部静默,不影响响应
    try:
        import asyncio
        from services.cloud_llm_sync import sync_from_local
        asyncio.create_task(sync_from_local("comic"))
    except Exception as e:
        logger.warning(f"[set-cloud-token] 触发 sync_from_local 失败(忽略): {e}")

    # v3.61.240: token/team context is ready; retry durable usage reports.
    try:
        import asyncio
        from services.usage_report_service import UsageReportService
        asyncio.create_task(UsageReportService.process_pending(limit=50))
    except Exception as e:
        logger.warning(f"[set-cloud-token] trigger usage report flush failed(ignore): {e}")

    return {"success": True, "user_id": _cts.get_user_id()}


@router.get("/cloud-token-status")
async def cloud_token_status():
    return {
        "logged_in": _cts.is_logged_in(),
        "user_id": _cts.get_user_id(),
    }
