"""云端 access_token 状态管理(配合 qianshanai.cn 个人中心 API)。

v3.59.60 引入。背景:
- C 端从 v3.59.60 起,LLM 配置存储 + 调用密钥都迁移到 qianshanai.cn 云端
- 所有云端接口需 Header `Authorization: Bearer <accessToken>`
- accessToken 2 小时过期,refreshToken 7 天过期

3 个易错点(对照后端文档 §1.0.1):
  1. ⭐ 每次 refresh 都换发新 refreshToken,旧的立即失效 → 必须把 data.refreshToken 也存回去
  2. ⭐ refresh 接口 **不要带 Authorization header**(用 body 里的 refreshToken 鉴权)
  3. ⭐ 并发要加锁 — 多个业务接口同时发现 access 过期会同时调 refresh,
        第二个会拿到 "refreshToken 已被换发" 的 401 → 必须 asyncio.Lock 串行化
"""
import time
import asyncio
import logging
from typing import Optional

import httpx
from services.offline_guard import require_cloud

logger = logging.getLogger(__name__)

QIANSHAN_API_BASE = "https://api.qianshanai.cn/api"

# 全局 token 状态(进程内存,不落盘 — 关闭工具下次启动重新走 verify)
_token_state = {
    "access_token": "",
    "refresh_token": "",
    "expires_at": 0.0,   # access_token 过期时间戳(秒)
    "user_id": None,
    # 当前团队 id。注意: 不再默认给所有云端请求带 X-Team-Id。
    # 个人小说/个人模型配置必须按个人身份解 key;团队资产/团队剧本等接口显式传 include_team=True。
    "team_id": None,
}


def set_team_id(team_id) -> None:
    """设置当前团队 id;非团队身份传 None 清除。"""
    _token_state["team_id"] = team_id
    logger.info(f"[CLOUD-TOKEN] X-Team-Id 设为 {team_id}")

# v3.59.60:并发锁 — 防止多个业务接口同时发现 access 过期同时调 refresh
# 第二个会拿到 "refreshToken 已被换发" 的 401 错误
_refresh_lock = asyncio.Lock()


def on_verify_success(verify_data: dict) -> None:
    """C 端 /tools/verify 成功后调一次。verify_data 是 response.data 整段。"""
    access = verify_data.get("accessToken") or ""
    refresh = verify_data.get("refreshToken") or ""
    expires_in = verify_data.get("expiresIn") or 7200
    user_id = verify_data.get("userId")

    if not access:
        logger.warning("[CLOUD-TOKEN] verify 响应里没有 accessToken,云端功能将不可用")
        return

    _token_state["access_token"] = access
    # v3.59.71 修复:只在新值非空时覆盖 refresh_token
    # 老 bug:某些 verify 响应只回 accessToken 不回 refreshToken(续 license 走的轻量校验),
    #         无条件覆盖会把已有的 refresh_token 抹成空 → 2 小时后 access 过期就续不了 → 整个云端不可用
    if refresh:
        _token_state["refresh_token"] = refresh
    # 提前 60 秒续签,避免临界点 401
    _token_state["expires_at"] = time.time() + max(60, expires_in - 60)
    _token_state["user_id"] = user_id
    logger.info(
        f"[CLOUD-TOKEN] verify 成功,token 已就绪 user_id={user_id} expires_in={expires_in}s "
        f"refresh_set={'yes' if refresh else 'kept-old'}"
    )


def on_logout() -> None:
    """退出登录 / 切账号时清空 token 状态。"""
    _token_state["access_token"] = ""
    _token_state["refresh_token"] = ""
    _token_state["expires_at"] = 0.0
    _token_state["user_id"] = None
    _token_state["team_id"] = None
    logger.info("[CLOUD-TOKEN] 已清空 token 状态")


def is_logged_in() -> bool:
    """是否当前持有有效的 access 或 refresh token。"""
    return bool(_token_state.get("access_token") or _token_state.get("refresh_token"))


def get_user_id() -> Optional[int]:
    """当前已登录用户的 千山 user_id(没登录返 None)。"""
    return _token_state.get("user_id")


async def _refresh_access_token() -> bool:
    """续签。成功返回 True;失败返回 False(C 端应清状态、提示用户重启工具重新激活)。

    必须在 _refresh_lock 锁内调用。
    """
    rt = _token_state.get("refresh_token")
    if not rt:
        logger.warning("[CLOUD-TOKEN] refresh_token 为空,无法续签")
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # ⭐ 只用 body 里的 refreshToken 鉴权,不要带 Authorization header
            resp = await client.post(
                f"{QIANSHAN_API_BASE}/auth/refresh",
                json={"refreshToken": rt},
                headers={"Content-Type": "application/json"},
            )
        body = resp.json()

        if body.get("code") == 200:
            d = body.get("data") or {}
            new_access = d.get("accessToken") or ""
            new_refresh = d.get("refreshToken") or ""
            expires_in = d.get("expiresIn") or 7200
            if not new_access:
                logger.warning(f"[CLOUD-TOKEN] refresh 响应缺 accessToken: {body}")
                return False
            _token_state["access_token"] = new_access
            # ⭐ 必须更新 refreshToken — 旧的已失效
            if new_refresh:
                _token_state["refresh_token"] = new_refresh
            _token_state["expires_at"] = time.time() + max(60, expires_in - 60)
            # 同步用户信息(memberLevel 等可能变化)
            user_info = d.get("userInfo") or {}
            uid = user_info.get("id")
            if uid:
                _token_state["user_id"] = uid
            logger.info(f"[CLOUD-TOKEN] refresh 成功 user_id={_token_state['user_id']}")
            return True

        elif body.get("code") == 401:
            # refreshToken 失效(过期 / 已被换发过 / 格式错)
            logger.warning(
                f"[CLOUD-TOKEN] refresh_token 已失效,需重新登录: {body.get('message')}"
            )
            on_logout()
            return False

        else:
            logger.warning(
                f"[CLOUD-TOKEN] refresh 失败 code={body.get('code')} msg={body.get('message')}"
            )
            return False

    except httpx.HTTPError as e:
        logger.warning(f"[CLOUD-TOKEN] refresh 网络异常: {e}")
        return False
    except Exception as e:
        logger.warning(f"[CLOUD-TOKEN] refresh 未知异常: {type(e).__name__}: {e}")
        return False


async def get_access_token() -> str:
    """所有调云端接口前调它,确保 token 不过期。

    没 token / 续签失败 → 抛 RuntimeError("登录已失效,请重启工具重新激活")
    业务侧应 catch 这个异常,把消息直接展示给用户。
    """
    require_cloud("云端 access_token")
    # 先快速路径 — 没过期直接返
    if _token_state.get("access_token") and time.time() < _token_state.get("expires_at", 0):
        return _token_state["access_token"]

    # 慢路径 — 进锁刷
    async with _refresh_lock:
        # 双检 — 锁内可能已被其他协程刷过了
        if _token_state.get("access_token") and time.time() < _token_state.get("expires_at", 0):
            return _token_state["access_token"]

        # 真去 refresh
        ok = await _refresh_access_token()
        if not ok:
            raise RuntimeError("登录已失效,请重启工具重新激活")
        return _token_state["access_token"]


def headers(include_team: bool = False) -> dict:
    """工具方法:返回标准的 Bearer 头。
    注意:调用方应先 await get_access_token() 确保 token 不过期再调本方法。
    """
    h = {
        "Authorization": f"Bearer {_token_state.get('access_token', '')}",
        "Content-Type": "application/json",
    }
    tid = _token_state.get("team_id")
    if include_team and tid is not None:
        h["X-Team-Id"] = str(tid)
    return h


def has_team_id() -> bool:
    return _token_state.get("team_id") is not None
