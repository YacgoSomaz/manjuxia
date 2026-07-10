"""团队版剧本同步(C2)— 单向:云端 → 本地。

v3.61.224。契约见 docs(隔壁 manju-team-script-sync-handoff.md):
- GET  /tools/web/team-script/assigned-chapters            分配给我的章节清单(meta)
- GET  /tools/web/team-script/assigned-chapters/{id}       单集正文(+content+version)
- POST /tools/web/team-script/assigned-chapters/{id}/ack   {version} 落库成功后回执
鉴权复用全局 cloud_token(团队席位登录后即当前云身份);teamId 后端自动解析,不用传。

本地落库沿用 short_drama_sync 的 source_type/remote_* 列(_ensure_sync_columns 已建):
  novels.source_type='team_script' + remote_project_id=projectId,mode='team_script_sync'
  chapters.remote_chapter_id=chapterId;scripts.remote_version=云端 version(diff/ack 用)
"""
import logging
from typing import Any, Dict, List, Optional

import asyncio

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.db import get_db
from services import cloud_token_service as cloud_token
from services import team_context_service as team_ctx
from api.short_drama_sync import _ensure_sync_columns
from services.novel_service import NovelService
from utils.timezone import now_beijing_str

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/team/script", tags=["team-script"])

# v3.61.227: 串行化团队剧本落库,杜绝并发同步同一剧时 novel "check-then-insert" 竞态(出多本)
_land_lock = asyncio.Lock()


def _safe_int(v, default: int = 0) -> int:
    """容错转 int(云端字段异常时不打崩接口)。"""
    try:
        return int(v)
    except (TypeError, ValueError):
        return default

_BASE = "/tools/web/team-script"


async def _cloud_get(path: str, timeout: float = 30.0) -> Any:
    await cloud_token.get_access_token()  # 确保 token 不过期(过期会自动 refresh)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(f"{cloud_token.QIANSHAN_API_BASE}{path}", headers=cloud_token.headers(include_team=True))
    except httpx.HTTPError as exc:
        logger.warning("[team-script] cloud GET 失败 %s: %s", path, exc)
        raise HTTPException(status_code=502, detail="无法连接团队服务器,请稍后重试")
    return _unwrap(resp, path)


async def _cloud_post(path: str, body: dict, timeout: float = 30.0) -> Any:
    await cloud_token.get_access_token()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{cloud_token.QIANSHAN_API_BASE}{path}", json=body, headers=cloud_token.headers(include_team=True)
            )
    except httpx.HTTPError as exc:
        logger.warning("[team-script] cloud POST 失败 %s: %s", path, exc)
        raise HTTPException(status_code=502, detail="无法连接团队服务器,请稍后重试")
    return _unwrap(resp, path)


# 只透传这些"前端要据此分支"的 HTTP 状态;其余归一(防把业务码当非法 HTTP status)
_PASSTHROUGH_STATUS = {400, 401, 403, 404, 409, 429}


def _unwrap(resp: httpx.Response, path: str) -> Any:
    """解 Result 封装;非 200 透传可读错误(401/404/409 等)。"""
    try:
        body = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail=f"团队服务器响应异常({resp.status_code})")
    code = body.get("code")
    if resp.status_code == 200 and code == 200:
        return body.get("data")
    msg = body.get("message") or f"团队服务器错误({resp.status_code})"
    logger.warning("[team-script] %s 业务失败 http=%s code=%s msg=%s", path, resp.status_code, code, msg)
    # 状态码白名单:HTTP 状态在白名单内则透传;否则按业务 code 是否在白名单,再不行统一 502
    if resp.status_code in _PASSTHROUGH_STATUS:
        raise HTTPException(status_code=resp.status_code, detail=msg)
    if isinstance(code, int) and code in _PASSTHROUGH_STATUS:
        raise HTTPException(status_code=code, detail=msg)
    raise HTTPException(status_code=502, detail=msg)


@router.get("/assigned-projects")
async def assigned_projects():
    """把"分配给我的章节"按剧(projectId)聚合,返回剧清单(给同步弹窗展示)。

    每剧:剧名 / 集数(我被分配的) / 总字数(各集 wordCount 求和) / 资产数(绑定组汇总)/ 最新更新时间。
    """
    if team_ctx.get_team_id() is None:
        raise HTTPException(status_code=401, detail="未登录团队席位")
    data = await _cloud_get(f"{_BASE}/assigned-chapters") or []
    projs: Dict[Any, Dict[str, Any]] = {}
    for ch in data:
        pid = ch.get("projectId")
        if pid is None:
            continue
        p = projs.get(pid)
        if not p:
            p = {
                "projectId": pid,
                "projectName": ch.get("projectName") or f"剧{pid}",
                "projectStatus": ch.get("projectStatus"),
                "episodeCount": 0,
                "totalWordCount": 0,
                "updateTime": ch.get("updateTime") or "",
            }
            projs[pid] = p
        p["episodeCount"] += 1
        p["totalWordCount"] += _safe_int(ch.get("wordCount"))
        ut = ch.get("updateTime") or ""
        if ut > p["updateTime"]:
            p["updateTime"] = ut
    # 资产数:每剧调 asset-groups 汇总绑定组的 assetCount(云端绑定资产总数)。失败该剧置 None(前端显 —)
    for p in projs.values():
        try:
            groups = await _cloud_get(f"{_BASE}/projects/{p['projectId']}/asset-groups") or []
            p["assetCount"] = sum(_safe_int(g.get("assetCount")) for g in groups)
        except Exception as e:
            logger.warning("[team-script] 取剧 %s 资产数失败(忽略): %s", p.get("projectId"), e)
            p["assetCount"] = None

    team_name = team_ctx.get_context().get("teamName")
    return {
        "teamName": team_name,
        "projects": sorted(projs.values(), key=lambda x: x["projectId"]),
    }


class SyncProjectReq(BaseModel):
    projectId: int


@router.post("/sync-project")
async def sync_project(req: SyncProjectReq):
    """按剧同步:拉该剧分配给我的【全部集】→ 落成【1 本】novel → 各集 ack。可反复拉取覆盖。

    单请求内顺序处理该剧所有集,_land_chapter 复用同一 novel(按 projectId 定位),
    再叠加 _land_lock 串行化,彻底杜绝"1 剧出多本"的竞态。
    """
    if team_ctx.get_team_id() is None:
        raise HTTPException(status_code=401, detail="未登录团队席位")

    data = await _cloud_get(f"{_BASE}/assigned-chapters") or []
    # P1: projectId 云端可能是字符串/数字,统一 str 比较,避免类型不一致筛成空 → 404
    pid_want = str(req.projectId)
    chapters = [c for c in data if str(c.get("projectId")) == pid_want]
    if not chapters:
        raise HTTPException(status_code=404, detail="该剧没有分配给你的章节")
    chapters.sort(key=lambda c: _safe_int(c.get("episodeNo")))

    novel_id = None
    synced = 0
    acked = 0
    ack_failed = 0
    skipped_dirty = 0
    for ch in chapters:
        cid = ch.get("chapterId")
        detail = await _cloud_get(f"{_BASE}/assigned-chapters/{cid}", timeout=60.0)
        if not isinstance(detail, dict):
            continue
        r = await _land_chapter(detail)
        novel_id = r.get("novelId")
        if r.get("skippedDirty"):
            skipped_dirty += 1
            continue
        synced += 1
        ver = _safe_int(detail.get("version"))
        try:
            await _cloud_post(f"{_BASE}/assigned-chapters/{cid}/ack", {"version": ver})
            acked += 1
        except HTTPException as exc:
            if exc.status_code == 409:
                # 云端版本已变 → 重拉重落;★P1:重落后若 dirty 也不能 ack
                d2 = await _cloud_get(f"{_BASE}/assigned-chapters/{cid}", timeout=60.0)
                if isinstance(d2, dict):
                    r2 = await _land_chapter(d2)
                    novel_id = r2.get("novelId")
                    if r2.get("skippedDirty"):
                        skipped_dirty += 1
                        synced -= 1  # 这集实际没覆盖,从 synced 回退
                    else:
                        try:
                            await _cloud_post(f"{_BASE}/assigned-chapters/{cid}/ack", {"version": _safe_int(d2.get("version"))})
                            acked += 1
                        except HTTPException:
                            ack_failed += 1
                else:
                    ack_failed += 1
            else:
                # 本地已落但云端回执失败
                ack_failed += 1

    return {
        "novelId": novel_id,
        "projectId": req.projectId,
        "projectName": chapters[0].get("projectName"),
        "episodeCount": len(chapters),
        "synced": synced,
        "acked": acked,
        "ackFailed": ack_failed,
        "skippedDirty": skipped_dirty,
    }


async def _land_chapter(detail: Dict[str, Any]) -> Dict[str, Any]:
    """把单集正文落到本地 novels/chapters/scripts(team_script 源,增量 upsert)。"""
    project_id = str(detail.get("projectId") or "")
    project_name = str(detail.get("projectName") or f"团队剧本{project_id}")
    chapter_id = str(detail.get("chapterId") or "")
    episode_no = int(detail.get("episodeNo") or 1)
    title = str(detail.get("title") or f"第{episode_no}集")
    content = str(detail.get("content") or "")
    version = int(detail.get("version") or 0)
    sort_order = max(0, episode_no - 1)
    now = now_beijing_str()

    if not chapter_id:
        raise HTTPException(status_code=502, detail="团队章节缺少 chapterId")

    # v3.61.227: 串行化落库,杜绝并发同步同剧时 novel check-then-insert 竞态(出多本)
    async with _land_lock:
        return await _land_chapter_locked(
            project_id, project_name, chapter_id, episode_no, title, content, version, sort_order, now
        )


async def _land_chapter_locked(project_id, project_name, chapter_id, episode_no, title, content, version, sort_order, now) -> Dict[str, Any]:
    db = await get_db()
    try:
        await _ensure_sync_columns(db)
        cur_cols = await db.execute("PRAGMA table_info(novels)")
        novel_cols = {row[1] for row in await cur_cols.fetchall()}
        if "remote_team_id" not in novel_cols:
            await db.execute("ALTER TABLE novels ADD COLUMN remote_team_id TEXT DEFAULT NULL")
            novel_cols.add("remote_team_id")
        await NovelService.ensure_owner_columns(db)
        current_team_id = team_ctx.get_team_id()
        owner_user_id, owner_team_id, owner_seat_id = NovelService.current_owner_values()

        # novel:按 source_type+remote_project_id 定位,没有则建
        cur = await db.execute(
            """SELECT id FROM novels
               WHERE source_type=? AND remote_project_id=? AND owner_user_id=?
               ORDER BY id DESC LIMIT 1""",
            ("team_script", project_id, owner_user_id),
        )
        row = await cur.fetchone()
        if row:
            novel_id = row["id"]
            await db.execute(
                """UPDATE novels
                   SET name=?, remote_team_id=?, remote_synced_at=?, updated_at=?,
                       owner_user_id=?, owner_team_id=?, owner_seat_id=?
                   WHERE id=?""",
                (
                    project_name,
                    str(current_team_id) if current_team_id is not None else None,
                    now,
                    now,
                    owner_user_id,
                    owner_team_id,
                    owner_seat_id,
                    novel_id,
                ),
            )
        else:
            cur = await db.execute(
                """INSERT INTO novels
                       (name, raw_content, mode, outline, source_type, remote_project_id,
                        remote_team_id, remote_synced_at, created_at, updated_at,
                        owner_user_id, owner_team_id, owner_seat_id)
                   VALUES (?, '', ?, '{}', ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    project_name,
                    "team_script_sync",
                    "team_script",
                    project_id,
                    str(current_team_id) if current_team_id is not None else None,
                    now,
                    now,
                    now,
                    owner_user_id,
                    owner_team_id,
                    owner_seat_id,
                ),
            )
            novel_id = cur.lastrowid

        # chapter:按 remote_chapter_id 定位,upsert
        cur = await db.execute(
            "SELECT id FROM chapters WHERE novel_id=? AND remote_chapter_id=? LIMIT 1",
            (novel_id, chapter_id),
        )
        row = await cur.fetchone()
        if row:
            local_chapter_id = row["id"]
            await db.execute(
                "UPDATE chapters SET title=?, content=?, sort_order=?, updated_at=? WHERE id=?",
                (title, content, sort_order, now, local_chapter_id),
            )
        else:
            cur = await db.execute(
                """INSERT INTO chapters
                       (novel_id, title, content, summary, sort_order, remote_chapter_id, updated_at)
                   VALUES (?, ?, ?, '', ?, ?, ?)""",
                (novel_id, title, content, sort_order, chapter_id, now),
            )
            local_chapter_id = cur.lastrowid

        # script:按 chapter_id 定位,存正文 + remote_version(diff 用);
        #   remote_version=-1 表示用户本地改过(脏标记),不被云端覆盖。
        cur = await db.execute(
            "SELECT id, remote_version FROM scripts WHERE chapter_id=? LIMIT 1",
            (local_chapter_id,),
        )
        existing = await cur.fetchone()
        # remote_version=-1 = 用户本地改过(脏标记):保留本地、不覆盖,也不应 ack(否则云端误以为已落地最新版)
        skipped_dirty = bool(existing and existing["remote_version"] == -1)
        if existing:
            if not skipped_dirty and content:
                await db.execute(
                    "UPDATE scripts SET content=?, remote_version=?, remote_chapter_id=? WHERE id=?",
                    (content, version, chapter_id, existing["id"]),
                )
        elif content:
            await db.execute(
                """INSERT INTO scripts
                       (novel_id, chapter_id, content, scene_meta, remote_chapter_id, remote_version, created_at)
                   VALUES (?, ?, ?, '{}', ?, ?, ?)""",
                (novel_id, local_chapter_id, content, chapter_id, version, now),
            )

        await db.commit()
    finally:
        await db.close()

    return {
        "novelId": novel_id,
        "chapterId": int(chapter_id) if chapter_id.isdigit() else chapter_id,
        "localChapterId": local_chapter_id,
        "episodeNo": episode_no,
        "title": title,
        "version": version,
        "skippedDirty": skipped_dirty,
    }
