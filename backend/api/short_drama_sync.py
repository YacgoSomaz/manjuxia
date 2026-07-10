import json
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.db import get_db
from services import cloud_token_service as cloud_token
from services.novel_service import NovelService
from utils.timezone import now_beijing_str

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/short-drama-sync", tags=["short-drama-sync"])


class ImportShortDramaRequest(BaseModel):
    project_id: int
    include_assets: bool = True
    # v3.61.140: 删除 replace_existing — 用户决定每次同步都新建,不动本地已生成的分镜/视频;
    # 兼容老前端字段:声明在这里但同步逻辑里不读它
    replace_existing: bool = False


async def _cloud_get(path: str, timeout: float = 30.0) -> Any:
    try:
        await cloud_token.get_access_token()
    except RuntimeError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(
                f"{cloud_token.QIANSHAN_API_BASE}{path}",
                headers=cloud_token.headers(),
            )
    except httpx.HTTPError as exc:
        logger.warning("[short-drama-sync] cloud request failed %s: %s", path, exc)
        raise HTTPException(status_code=502, detail=f"云端请求失败: {exc}")

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="登录已失效,请重新打开工具完成授权")
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    body = resp.json()
    if isinstance(body, dict) and body.get("code") not in (None, 200):
        raise HTTPException(status_code=400, detail=body.get("message") or "云端接口返回失败")
    return body.get("data") if isinstance(body, dict) and "data" in body else body


async def _ensure_sync_columns(db) -> None:
    columns = {
        "novels": [
            ("source_type", "TEXT DEFAULT ''"),
            ("remote_project_id", "TEXT DEFAULT NULL"),
            ("remote_team_id", "TEXT DEFAULT NULL"),
            ("remote_synced_at", "TIMESTAMP DEFAULT NULL"),
        ],
        "chapters": [("remote_chapter_id", "TEXT DEFAULT NULL")],
        "scripts": [
            ("remote_chapter_id", "TEXT DEFAULT NULL"),
            ("remote_version", "INTEGER DEFAULT 0"),
        ],
        "extracted_elements": [
            ("remote_source", "TEXT DEFAULT NULL"),
            ("remote_id", "TEXT DEFAULT NULL"),
        ],
    }
    for table, defs in columns.items():
        cur = await db.execute(f"PRAGMA table_info({table})")
        existing = {row[1] for row in await cur.fetchall()}
        for name, spec in defs:
            if name not in existing:
                await db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {spec}")


def _as_list(value: Any) -> List[dict]:
    if isinstance(value, list):
        return [x for x in value if isinstance(x, dict)]
    if isinstance(value, dict):
        for key in ("items", "projects", "list", "records"):
            if isinstance(value.get(key), list):
                return [x for x in value[key] if isinstance(x, dict)]
    return []


def _project_name(project: Dict[str, Any]) -> str:
    return str(project.get("name") or project.get("title") or "短剧工坊项目").strip()


def _episode_no(chapter: Dict[str, Any], fallback: int) -> int:
    try:
        return int(chapter.get("episodeNo") or chapter.get("episode_no") or fallback + 1)
    except Exception:
        return fallback + 1


def _chapter_title(chapter: Dict[str, Any], index: int) -> str:
    title = str(chapter.get("title") or "").strip()
    return title or f"第 {_episode_no(chapter, index)} 集"


def _chapter_content(chapter: Dict[str, Any]) -> str:
    return str(chapter.get("content") or chapter.get("summary") or "").strip()


def _build_raw_content(chapters: List[Dict[str, Any]]) -> str:
    parts = []
    for idx, ch in enumerate(chapters):
        content = _chapter_content(ch)
        if content:
            parts.append(f"{_chapter_title(ch, idx)}\n\n{content}")
    return "\n\n".join(parts)


async def _resolve_unique_name(db, base_name: str) -> str:
    """v3.61.140: 同名小说自动加 01/02 后缀。

    原名      → "清道夫"  (第一次同步)
    重名 1 次 → "清道夫01"
    重名 2 次 → "清道夫02"
    ...

    扫 novels.name 找形如 "{base}NN" 的最大编号,+1 后返回(NN 两位 0 填充)。
    """
    base = (base_name or "").strip() or "短剧工坊项目"
    cur = await db.execute("SELECT 1 FROM novels WHERE name = ? LIMIT 1", (base,))
    if not await cur.fetchone():
        return base
    # 已有同名,扫所有 "{base}NN" 找最大编号
    cur = await db.execute(
        "SELECT name FROM novels WHERE name LIKE ? OR name = ?",
        (f"{base}%", base),
    )
    import re as _re
    pattern = _re.compile(rf"^{_re.escape(base)}(\d{{2}})$")
    max_n = 0
    for row in await cur.fetchall():
        m = pattern.match(row["name"])
        if m:
            try:
                max_n = max(max_n, int(m.group(1)))
            except Exception:
                pass
    return f"{base}{max_n + 1:02d}"


@router.get("/projects")
async def list_short_drama_projects():
    data = await _cloud_get("/tools/web/short-drama-studio/projects")
    return {"items": _as_list(data)}


@router.post("/import")
async def import_short_drama_project(req: ImportShortDramaRequest):
    detail = await _cloud_get(f"/tools/web/short-drama-studio/projects/{req.project_id}", timeout=60.0)
    if not isinstance(detail, dict):
        raise HTTPException(status_code=400, detail="云端项目详情格式异常")

    project = detail.get("project") or detail
    chapters = _as_list(detail.get("chapters"))
    chapters.sort(key=lambda ch: _episode_no(ch, 0))
    if not chapters:
        raise HTTPException(status_code=400, detail="该短剧项目还没有可同步的章节")

    assets: Dict[str, Any] = {}
    if req.include_assets:
        try:
            export_data = await _cloud_get(
                f"/tools/web/short-drama-studio/projects/{req.project_id}/comic-export",
                timeout=60.0,
            )
            if isinstance(export_data, dict):
                assets = export_data
        except HTTPException as exc:
            logger.warning("[short-drama-sync] comic-export skipped: %s", exc.detail)

    now = now_beijing_str()
    outline = {
        "source": "short_drama_studio",
        "remoteProjectId": req.project_id,
        "name": _project_name(project),
        "mainStoryline": project.get("mainStoryline"),
        "genre": project.get("genre"),
        "audience": project.get("audience"),
        "platform": project.get("platform"),
        "totalEpisodes": project.get("totalEpisodes"),
        "syncedAt": now,
    }

    db = await get_db()
    try:
        await _ensure_sync_columns(db)
        await NovelService.ensure_owner_columns(db)
        owner_user_id, owner_team_id, owner_seat_id = NovelService.current_owner_values()

        # v3.61.141:回到方案 A — 增量 merge,按 remote_project_id 找已有 novel
        #   存在 → 更新 novels 元信息;章节按 remote_chapter_id 定位,有则 UPDATE 章节 +
        #          保留已有 scripts 的本地编辑(只在 scripts 缺失时初始 INSERT);
        #          远端新章节才 INSERT chapters + scripts
        #   不动 storyboards / video_task_queue(用户本地已生成的分镜和视频保留)
        #   不存在 → 整套 INSERT 新建
        cur = await db.execute(
            """SELECT id FROM novels
               WHERE source_type=? AND remote_project_id=? AND owner_user_id=?
               ORDER BY id DESC LIMIT 1""",
            ("short_drama", str(req.project_id), owner_user_id),
        )
        existing_novel = await cur.fetchone()
        novel_name = _project_name(project)

        if existing_novel:
            novel_id = existing_novel["id"]
            await db.execute(
                """
                UPDATE novels
                SET name=?, raw_content=?, outline=?, remote_synced_at=?, updated_at=?,
                    owner_user_id=?, owner_team_id=?, owner_seat_id=?
                WHERE id=?
                """,
                (
                    novel_name,
                    _build_raw_content(chapters),
                    json.dumps(outline, ensure_ascii=False),
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
                """
                INSERT INTO novels
                    (name, raw_content, mode, outline, source_type, remote_project_id,
                     remote_synced_at, created_at, updated_at, owner_user_id, owner_team_id, owner_seat_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    novel_name,
                    _build_raw_content(chapters),
                    "short_drama_sync",
                    json.dumps(outline, ensure_ascii=False),
                    "short_drama",
                    str(req.project_id),
                    now,
                    now,
                    now,
                    owner_user_id,
                    owner_team_id,
                    owner_seat_id,
                ),
            )
            novel_id = cur.lastrowid

        # 拉本地已有章节做两套映射(增量定位):
        #   主键:remote_chapter_id(主站给的章节 id,大多数情况都有)
        #   v3.61.142 fallback:sort_order — **只收纳本地 remote_chapter_id 为空的旧章节**
        #   语义:fallback 只用于"远端没给 id"的 corner case,**不允许**远端新 id 把同位旧章节覆盖
        cur = await db.execute(
            "SELECT id, remote_chapter_id, sort_order FROM chapters WHERE novel_id=?",
            (novel_id,),
        )
        existing_chapter_map: Dict[str, int] = {}
        existing_chapter_by_sort_unmatched: Dict[int, int] = {}  # 只放 remote_id 为空的章节
        for row in await cur.fetchall():
            rcid = row["remote_chapter_id"]
            if rcid:
                existing_chapter_map[str(rcid)] = row["id"]
            elif row["sort_order"] is not None:
                # 本地 remote_chapter_id 为空 → 可被远端"无 id"项 fallback 匹配
                existing_chapter_by_sort_unmatched[row["sort_order"]] = row["id"]

        chapter_new = 0
        chapter_update = 0
        script_new = 0
        script_update = 0
        script_skipped_dirty = 0
        episode_to_local_chapter: Dict[int, int] = {}
        for idx, ch in enumerate(chapters):
            remote_cid = str(ch.get("id") or "")
            content = _chapter_content(ch)
            summary = str(ch.get("summary") or "")
            title = _chapter_title(ch, idx)
            episode_no = _episode_no(ch, idx)
            sort_order = max(0, episode_no - 1)

            # v3.61.142:匹配规则收紧
            #   远端有 id 且本地有该 id → UPDATE 已有
            #   远端有 id 但本地没该 id → 视为新章节(不 fallback,避免远端新 id 覆盖同位旧章节)
            #   远端无 id → fallback 到本地"remote_id 为空"的同 sort_order 章节
            matched_local_id: Optional[int] = None
            if remote_cid:
                if remote_cid in existing_chapter_map:
                    matched_local_id = existing_chapter_map[remote_cid]
                # else: 远端新 id,走下面新增分支
            elif sort_order in existing_chapter_by_sort_unmatched:
                matched_local_id = existing_chapter_by_sort_unmatched[sort_order]
                logger.info(
                    f"[short-drama-sync] novel={novel_id} 章节按 sort_order={sort_order} fallback 匹配 "
                    f"(远端无 id,本地该位置 remote_chapter_id 为空)"
                )

            if matched_local_id is not None:
                # 已有 → 只 UPDATE 章节正文 / 标题 / 排序
                local_chapter_id = matched_local_id
                # 若本来缺 remote_chapter_id,顺手补上,下次匹配更稳
                if not remote_cid:
                    pass  # 远端没给 id 也补不了
                else:
                    await db.execute(
                        "UPDATE chapters SET remote_chapter_id=? WHERE id=? AND (remote_chapter_id IS NULL OR remote_chapter_id='')",
                        (remote_cid, local_chapter_id),
                    )
                await db.execute(
                    """
                    UPDATE chapters
                    SET title=?, content=?, summary=?, sort_order=?, updated_at=?
                    WHERE id=?
                    """,
                    (title, content, summary, sort_order, now, local_chapter_id),
                )
                chapter_update += 1
                # v3.61.142:scripts 智能判断
                # remote_version = -1 → 用户手动编辑过(脏标记) → 不动
                # 其他值 → 未编辑过 → 跟随远端更新 content + remote_version
                # 不存在 scripts → 初始 INSERT
                cur = await db.execute(
                    "SELECT id, remote_version FROM scripts WHERE chapter_id=? LIMIT 1",
                    (local_chapter_id,),
                )
                existing_script = await cur.fetchone()
                if existing_script and content:
                    if existing_script["remote_version"] != -1:
                        # 未编辑过 → 跟随远端
                        await db.execute(
                            "UPDATE scripts SET content=?, remote_version=?, remote_chapter_id=? WHERE id=?",
                            (
                                content,
                                int(ch.get("version") or 0),
                                remote_cid,
                                existing_script["id"],
                            ),
                        )
                        script_update += 1
                    else:
                        # dirty 标记,保留本地编辑,不动
                        script_skipped_dirty += 1
                elif not existing_script and content:
                    await db.execute(
                        """
                        INSERT INTO scripts
                            (novel_id, chapter_id, content, scene_meta, remote_chapter_id, remote_version, created_at)
                        VALUES (?, ?, ?, '{}', ?, ?, ?)
                        """,
                        (
                            novel_id,
                            local_chapter_id,
                            content,
                            remote_cid,
                            int(ch.get("version") or 0),
                            now,
                        ),
                    )
                    script_new += 1
            else:
                # 远端新章节 → INSERT chapters + scripts
                cur = await db.execute(
                    """
                    INSERT INTO chapters
                        (novel_id, title, content, summary, sort_order, remote_chapter_id, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (novel_id, title, content, summary, sort_order, remote_cid, now),
                )
                local_chapter_id = cur.lastrowid
                chapter_new += 1
                if content:
                    await db.execute(
                        """
                        INSERT INTO scripts
                            (novel_id, chapter_id, content, scene_meta, remote_chapter_id, remote_version, created_at)
                        VALUES (?, ?, ?, '{}', ?, ?, ?)
                        """,
                        (
                            novel_id,
                            local_chapter_id,
                            content,
                            remote_cid,
                            int(ch.get("version") or 0),
                            now,
                        ),
                    )
                    script_new += 1
            episode_to_local_chapter[episode_no] = local_chapter_id

        # 信息提取元素:按 remote_id 增量
        # 主站 comic-export 返回 firstSeenEpisode(后续补,缺失时降级 chapter_ids=[])
        # v3.61.142 fallback: 主键 remote_id;**fallback 池只收纳本地 remote_id 为空的元素**
        # 语义:fallback 只用于"远端没给 id"的 corner case,**不允许**远端新 id 把同名同类型旧元素合并
        cur = await db.execute(
            "SELECT id, element_type, name, remote_id FROM extracted_elements WHERE novel_id=? AND remote_source=?",
            (novel_id, "short_drama"),
        )
        existing_element_map: Dict[str, int] = {}
        existing_element_by_typename_unmatched: Dict[tuple, int] = {}  # 只放 remote_id 为空的元素
        for row in await cur.fetchall():
            rid = row["remote_id"]
            if rid:
                existing_element_map[str(rid)] = row["id"]
            else:
                etype = row["element_type"]
                nm = (row["name"] or "").strip().lower()
                if etype and nm:
                    existing_element_by_typename_unmatched[(etype, nm)] = row["id"]

        element_new = 0
        element_update = 0
        for group_key, element_type in (
            ("characters", "character"),
            ("scenes", "scene"),
            ("props", "prop"),
        ):
            for item in _as_list(assets.get(group_key)):
                name = str(item.get("name") or "").strip()
                if not name:
                    continue
                desc = str(item.get("description") or item.get("appearance") or "").strip()
                first_ep = item.get("firstSeenEpisode") or item.get("first_seen_episode")
                chapter_ids_list: List[int] = []
                if first_ep is not None:
                    try:
                        local_cid = episode_to_local_chapter.get(int(first_ep))
                        if local_cid:
                            chapter_ids_list = [local_cid]
                    except (TypeError, ValueError):
                        pass

                remote_id_str = str(item.get("id") or "")
                # v3.61.142:匹配规则收紧
                #   远端有 id 且本地有该 id → UPDATE 已有
                #   远端有 id 但本地没该 id → 视为新元素(不 fallback,避免同名同类型旧元素被合并)
                #   远端无 id → fallback 到本地"remote_id 为空"的同 (element_type, name) 元素
                matched_element_id: Optional[int] = None
                if remote_id_str:
                    if remote_id_str in existing_element_map:
                        matched_element_id = existing_element_map[remote_id_str]
                    # else: 远端新 id,走下面新增分支
                else:
                    fb_key = (element_type, name.strip().lower())
                    if fb_key in existing_element_by_typename_unmatched:
                        matched_element_id = existing_element_by_typename_unmatched[fb_key]
                        logger.info(
                            f"[short-drama-sync] novel={novel_id} 元素按 (type={element_type}, name={name!r}) "
                            f"fallback 匹配 (远端无 id,本地该名 remote_id 为空)"
                        )
                if matched_element_id is not None:
                    # 已有 → UPDATE;若本来缺 remote_id,顺手补上
                    update_remote_id_clause = ""
                    update_params: tuple = (
                        name,
                        desc,
                        json.dumps(item, ensure_ascii=False),
                        json.dumps(chapter_ids_list),
                        now,
                        matched_element_id,
                    )
                    if remote_id_str:
                        update_remote_id_clause = ", remote_id=?"
                        update_params = (
                            name,
                            desc,
                            json.dumps(item, ensure_ascii=False),
                            json.dumps(chapter_ids_list),
                            now,
                            remote_id_str,
                            matched_element_id,
                        )
                    await db.execute(
                        f"""
                        UPDATE extracted_elements
                        SET name=?, description=?, attributes=?, chapter_ids=?, updated_at=?{update_remote_id_clause}
                        WHERE id=?
                        """,
                        update_params,
                    )
                    element_update += 1
                else:
                    # 新 → INSERT
                    await db.execute(
                        """
                        INSERT INTO extracted_elements
                            (novel_id, element_type, name, description, attributes, chapter_ids,
                             aliases, remote_source, remote_id, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)
                        """,
                        (
                            novel_id,
                            element_type,
                            name,
                            desc,
                            json.dumps(item, ensure_ascii=False),
                            json.dumps(chapter_ids_list),
                            "short_drama",
                            remote_id_str,
                            now,
                            now,
                        ),
                    )
                    element_new += 1

        await db.commit()
        return {
            "success": True,
            "novel_id": novel_id,
            "novel_name": novel_name,
            "chapter_new": chapter_new,
            "chapter_update": chapter_update,
            "script_new": script_new,
            "script_update": script_update,
            "script_skipped_dirty": script_skipped_dirty,
            "element_new": element_new,
            "element_update": element_update,
            "message": (
                f"同步完成:章节 +{chapter_new} 改{chapter_update},"
                f"剧本 +{script_new} 改{script_update} 保留{script_skipped_dirty},"
                f"素材 +{element_new} 改{element_update}"
            ),
        }
    finally:
        await db.close()
