"""团队版 C 端本地接口 — 团队上下文查询。

v3.61.224 引入;v3.61.226 团队身份改为 verify 派生(set-cloud-token 时由 license_context
调 team_context_service.apply_team_from_verify),不再有 app 内 TS- 登录,故只保留 /context。
后续 C3(资产正向)/ C4(资产反向)在独立模块按需追加。
"""
import logging

from fastapi import APIRouter

from services import team_context_service as team_ctx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/team", tags=["team"])


@router.get("/context")
async def team_context():
    """查询当前团队登录态(前端据此决定是否显示团队功能)。"""
    return team_ctx.get_context()
