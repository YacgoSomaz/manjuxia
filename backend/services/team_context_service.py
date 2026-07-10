"""团队版团队身份(上下文)管理。

v3.61.224 引入;v3.61.226 改为 **verify 派生**,删除 app 内 TS- login-by-code 路径。

桌面端团队身份的唯一来源:`/tools/verify` 成功后响应里的 `data.team`。
  - 席位账号:toolCode='seat-xxx' 走激活页 /tools/verify,响应 data.team(source=team_seat)。
  - 受邀成员:个人号登录后被拉进团队,verify 响应也带 data.team(source!=team_seat)。
electron 在 verify 成功后通过 /api/license/context/set-cloud-token 把 token + team 一起推来,
backend 据此 apply_team_from_verify 设团队上下文。团队接口由云端按当前 userId 自动解析单团队,
复用全局 cloud_token 即可。不在 app 内单独登录团队、不持久化席位码。
"""
import logging
from typing import Optional, Dict, Any

from services import cloud_token_service as cloud_token

logger = logging.getLogger(__name__)

# 进程内团队上下文(不落盘;退出/切账号时清空,重启靠 license.dat 重新 verify 再推 team)
_team_ctx: Dict[str, Any] = {
    "teamId": None,
    "teamName": None,
    "seatId": None,
    "seatName": None,
    "role": None,
}


def _clear_ctx() -> None:
    for k in _team_ctx:
        _team_ctx[k] = None


def clear_context() -> None:
    """清空团队上下文(退出登录 / 切账号 / clear-license 时调)。"""
    _clear_ctx()
    cloud_token.set_team_id(None)
    logger.info("[TEAM] 团队上下文已清空")


def _apply_team(team: Dict[str, Any]) -> None:
    _team_ctx["teamId"] = team.get("teamId")
    _team_ctx["teamName"] = team.get("teamName")
    _team_ctx["seatId"] = team.get("seatId")
    _team_ctx["seatName"] = team.get("seatName")
    _team_ctx["role"] = team.get("role") or "member"


def get_team_id() -> Optional[int]:
    """当前团队 id(无团队返 None)。团队接口的本地守卫用它。"""
    return _team_ctx.get("teamId")


def get_context() -> Dict[str, Any]:
    """供前端查询团队登录态。loggedIn = 有云 token 且有 teamId。"""
    return {
        "loggedIn": bool(cloud_token.is_logged_in() and _team_ctx.get("teamId") is not None),
        "teamId": _team_ctx.get("teamId"),
        "teamName": _team_ctx.get("teamName"),
        "seatId": _team_ctx.get("seatId"),
        "seatName": _team_ctx.get("seatName"),
        "role": _team_ctx.get("role"),
    }


def apply_team_from_verify(team: Optional[Dict[str, Any]]) -> None:
    """桌面端 /tools/verify 成功后,用响应里的 data.team 设置团队上下文。★唯一入口。

    team 为空(纯个人用户)→ 清空团队态。
    """
    if team and team.get("teamId"):
        _apply_team(team)
        # 记录当前 teamId。普通云端请求不默认带 X-Team-Id;团队接口显式带,
        # LLM 配置接口仅在云端明确要求时按团队头重试,避免个人小说被团队权限污染。
        cloud_token.set_team_id(team.get("teamId"))
        logger.info(
            f"[TEAM] verify 团队上下文就绪 teamId={team.get('teamId')} "
            f"teamName={team.get('teamName')} seat={team.get('seatName')} seatId={team.get('seatId')}"
        )
    else:
        _clear_ctx()
        cloud_token.set_team_id(None)
