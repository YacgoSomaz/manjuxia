"""全局视频生成队列 - 数据访问层

设计文档: docs/全局视频队列_技术设计.md

核心职责:
1. 队列项的 CRUD
2. 跨小说互斥锁状态查询
3. 标签生成 (chapter-section-sub)
4. 状态转换的合法性校验
"""
import json
import logging
import sqlite3
from typing import Optional, List, Dict, Any, Tuple

from database.db import get_db
from utils.timezone import now_beijing_str

logger = logging.getLogger(__name__)


# ===================== 状态常量 =====================
STATUS_QUEUED = "queued"
STATUS_GENERATING = "generating"
STATUS_DONE = "done"
STATUS_FAILED = "failed"
STATUS_ABORTED = "aborted"

ACTIVE_STATUSES = (STATUS_QUEUED, STATUS_GENERATING)
TERMINAL_STATUSES = (STATUS_DONE, STATUS_FAILED, STATUS_ABORTED)

MODE_SERIAL = "serial"
MODE_PARALLEL = "parallel"

# 错误码
ERR_NETWORK = "NETWORK_ERROR"
ERR_TIMEOUT = "TIMEOUT"
ERR_TRUNCATED = "FILE_TRUNCATED"
ERR_BALANCE = "INSUFFICIENT_BALANCE"
ERR_REVIEW = "CONTENT_REJECTED"
ERR_UNKNOWN = "UNKNOWN"

# 自动重试一次的错误码
RETRYABLE_ERRORS = (ERR_NETWORK, ERR_TIMEOUT, ERR_TRUNCATED)


# ===================== 标签生成 =====================
async def build_label(storyboard_id: int) -> str:
    """生成 '章节-#场景-小节' 标签,与主表显示完全一致

    例: 第17章, scene_index=2, section_number=4 → '17-#3-4'
    (主表显示是 '#3-4',队列加上章节前缀避免跨章节歧义)
    """
    db = await get_db()
    try:
        # 取 storyboard 自身信息(scene_index + section_number)
        cur = await db.execute(
            "SELECT id, novel_id, script_id, scene_index, section_number "
            "FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        sb = await cur.fetchone()
        if not sb:
            return f"?-#?-? (id={storyboard_id})"

        section_number = sb["section_number"] or 1
        scene_index = sb["scene_index"]

        # 取 chapter_number
        chapter_number = None
        if sb["script_id"]:
            cur = await db.execute(
                """SELECT c.sort_order
                FROM scripts s LEFT JOIN chapters c ON c.id = s.chapter_id
                WHERE s.id = ?""",
                (sb["script_id"],),
            )
            row = await cur.fetchone()
            if row and row["sort_order"] is not None:
                chapter_number = int(row["sort_order"]) + 1
        if chapter_number is None:
            chapter_number = sb["script_id"] or 0

        # 主表格式: 有 scene_index 用 #场景-小节,无则只用小节
        if scene_index is not None:
            return f"{chapter_number}-#{scene_index + 1}-{section_number}"
        return f"{chapter_number}-#{section_number}"
    finally:
        await db.close()


# ===================== 锁状态查询(关键) =====================
async def get_lock_status() -> Dict[str, Any]:
    """查询全局锁状态

    返回:
    {
        "locked": True/False,
        "occupied_by": {
            "novel_id": 5,
            "novel_title": "...",
            "queued": 3,
            "generating": 1
        } | None
    }

    业务规则: 队列里只要有任何 novel_id 存在 generating/queued 状态的任务,
    就视为该 novel 占用了视频生成。其他小说被锁。
    """
    db = await get_db()
    try:
        cur = await db.execute(
            """SELECT q.novel_id, n.name AS novel_title,
                   SUM(CASE WHEN q.status='queued' THEN 1 ELSE 0 END) AS queued_cnt,
                   SUM(CASE WHEN q.status='generating' THEN 1 ELSE 0 END) AS generating_cnt
            FROM video_task_queue q
            LEFT JOIN novels n ON n.id = q.novel_id
            WHERE q.status IN ('queued','generating')
            GROUP BY q.novel_id, n.name
            ORDER BY MIN(q.created_at) ASC
            LIMIT 1""",
        )
        row = await cur.fetchone()
        if not row:
            return {"locked": False, "occupied_by": None}
        return {
            "locked": True,
            "occupied_by": {
                "novel_id": row["novel_id"],
                "novel_title": row["novel_title"] or f"小说#{row['novel_id']}",
                "queued": int(row["queued_cnt"] or 0),
                "generating": int(row["generating_cnt"] or 0),
            },
        }
    finally:
        await db.close()


async def is_locked_by_other_novel(novel_id: int) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """判断给定小说是否被其他小说占用

    返回 (是否被锁, 占用方信息)
    - (False, None): 队列空闲 / 占用方就是自己
    - (True, {...}): 被其他小说占用
    """
    status = await get_lock_status()
    if not status["locked"]:
        return False, None
    occupied_by = status["occupied_by"]
    if occupied_by["novel_id"] == novel_id:
        return False, None
    return True, occupied_by


# ===================== 入队 =====================
async def enqueue_batch(
    novel_id: int,
    script_id: int,
    storyboard_ids: List[int],
    mode: str = MODE_PARALLEL,
    use_chain_frame: bool = False,
    chain_frame_desc: Optional[str] = None,
    video_config_id: Optional[int] = None,
    params: Optional[Dict[str, Any]] = None,
    priority: int = 100,
    provider: str = "jimeng",
) -> Dict[str, Any]:
    """批量入队

    返回: {"enqueued": [...], "skipped": [...]}
    skipped 的项是因为 storyboard 已在 queued/generating 状态被去重的。

    调用前应先在外层校验跨小说锁,本函数不再校验(避免循环依赖)。
    """
    if mode not in (MODE_SERIAL, MODE_PARALLEL):
        raise ValueError(f"非法 mode: {mode}")

    enqueued: List[int] = []
    skipped: List[Dict[str, Any]] = []

    db = await get_db()
    try:
        params_json = json.dumps(params) if params else None
        # Serialize enqueue writes so two fast clicks cannot interleave and leave
        # duplicate active rows for the same storyboard.
        await db.execute("BEGIN IMMEDIATE")

        for sb_id in storyboard_ids:
            # 取 prompt 快照(便于事后排查;实际生成时 worker 还是读最新的)
            cur = await db.execute(
                "SELECT prompt FROM storyboards WHERE id = ?", (sb_id,)
            )
            sb_row = await cur.fetchone()
            if not sb_row:
                skipped.append({
                    "storyboard_id": sb_id,
                    "reason": "分镜不存在",
                })
                continue
            prompt_snapshot = sb_row["prompt"] or ""

            # 生成标签
            label = await build_label(sb_id)
            now_str = now_beijing_str()

            # v3.61.296: 活跃态幂等必须先查 queued/generating,不能只查最新历史行。
            # 否则“旧一点还有 queued,最新一条是 done/failed”的脏状态会被误复用,
            # 最终留下同一个 storyboard 两条活跃队列行。
            cur = await db.execute(
                "SELECT id, status, label, provider FROM video_task_queue "
                "WHERE storyboard_id = ? AND status IN ('queued','generating') "
                "ORDER BY CASE WHEN status='generating' THEN 0 ELSE 1 END, id DESC LIMIT 1",
                (sb_id,),
            )
            active = await cur.fetchone()

            if active:
                active_provider = (active["provider"] if "provider" in active.keys() else None) or "jimeng"
                if active_provider == provider:
                    skipped.append({
                        "storyboard_id": sb_id,
                        "reason": f"已在队列({active['status']})",
                        "queue_id": active["id"],
                        "label": active["label"],
                    })
                    continue
                if active["status"] == STATUS_GENERATING:
                    skipped.append({
                        "storyboard_id": sb_id,
                        "reason": f"该分镜正用 {active_provider} 生成中,完成或清队列后再换 {provider}",
                        "queue_id": active["id"],
                        "label": active["label"],
                    })
                    continue
                logger.info(
                    f"[queue] sb={sb_id} 换渠道 {active_provider}->{provider},"
                    f"抢占重置旧 queued 任务 queue_id={active['id']}"
                )
                await db.execute(
                    """UPDATE video_task_queue SET
                        novel_id = ?,
                        script_id = ?,
                        mode = ?,
                        use_chain_frame = ?,
                        chain_frame_desc = ?,
                        video_config_id = ?,
                        params_json = ?,
                        prompt_snapshot = ?,
                        priority = ?,
                        status = ?,
                        label = ?,
                        provider = ?,
                        retry_count = 0,
                        error_code = NULL,
                        error_message = NULL,
                        jimeng_task_id = NULL,
                        video_url = NULL,
                        last_frame_url = NULL,
                        created_at = ?,
                        started_at = NULL,
                        finished_at = NULL
                    WHERE id = ?""",
                    (
                        novel_id, script_id, mode,
                        1 if use_chain_frame else 0,
                        chain_frame_desc, video_config_id, params_json,
                        prompt_snapshot, priority, STATUS_QUEUED, label,
                        provider,
                        now_str, active["id"],
                    ),
                )
                await db.execute(
                    "UPDATE storyboards SET video_provider = ? WHERE id = ?",
                    (provider, sb_id),
                )
                enqueued.append(active["id"])
                continue

            # 没有活跃行时,优先复用最新终态历史行；没有历史再 insert。
            cur = await db.execute(
                "SELECT id, status, label, provider FROM video_task_queue "
                "WHERE storyboard_id = ? ORDER BY id DESC LIMIT 1",
                (sb_id,),
            )
            existing = await cur.fetchone()

            try:
                if existing:
                    await db.execute(
                        """UPDATE video_task_queue SET
                            novel_id = ?,
                            script_id = ?,
                            mode = ?,
                            use_chain_frame = ?,
                            chain_frame_desc = ?,
                            video_config_id = ?,
                            params_json = ?,
                            prompt_snapshot = ?,
                            priority = ?,
                            status = ?,
                            label = ?,
                            provider = ?,
                            retry_count = 0,
                            error_code = NULL,
                            error_message = NULL,
                            jimeng_task_id = NULL,
                            video_url = NULL,
                            last_frame_url = NULL,
                            created_at = ?,
                            started_at = NULL,
                            finished_at = NULL
                        WHERE id = ?""",
                        (
                            novel_id, script_id, mode,
                            1 if use_chain_frame else 0,
                            chain_frame_desc, video_config_id, params_json,
                            prompt_snapshot, priority, STATUS_QUEUED, label,
                            provider,
                            now_str, existing["id"],
                        ),
                    )
                    qid = existing["id"]
                else:
                    cur = await db.execute(
                        """INSERT INTO video_task_queue
                        (novel_id, script_id, storyboard_id, mode, use_chain_frame,
                         chain_frame_desc, video_config_id, params_json, prompt_snapshot,
                         priority, status, label, provider, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            novel_id, script_id, sb_id, mode,
                            1 if use_chain_frame else 0,
                            chain_frame_desc, video_config_id, params_json,
                            prompt_snapshot, priority, STATUS_QUEUED, label,
                            provider,
                            now_str,
                        ),
                    )
                    qid = cur.lastrowid
            except sqlite3.IntegrityError:
                cur = await db.execute(
                    "SELECT id, status, label FROM video_task_queue "
                    "WHERE storyboard_id = ? AND status IN ('queued','generating') "
                    "ORDER BY CASE WHEN status='generating' THEN 0 ELSE 1 END, id DESC LIMIT 1",
                    (sb_id,),
                )
                row = await cur.fetchone()
                skipped.append({
                    "storyboard_id": sb_id,
                    "reason": f"已在队列({row['status'] if row else 'active'})",
                    "queue_id": row["id"] if row else None,
                    "label": row["label"] if row else label,
                })
                continue

            await db.execute(
                "UPDATE storyboards SET video_provider = ? WHERE id = ?",
                (provider, sb_id),
            )
            enqueued.append(qid)

        await db.commit()
        logger.info(
            f"[queue] 入队完成: novel_id={novel_id} script_id={script_id} "
            f"enqueued={len(enqueued)} skipped={len(skipped)}"
        )
        return {"enqueued": enqueued, "skipped": skipped}
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass
        raise
    finally:
        await db.close()


# ===================== 查询 =====================
async def list_items(
    novel_id: Optional[int] = None,
    statuses: Optional[List[str]] = None,
    limit: int = 500,
) -> List[Dict[str, Any]]:
    """列出队列项

    v3.60.6 排序: 章节 → 场景 → 小节 → 入队时间
    跟主表显示顺序完全一致(同章节内 17-#1-1, 17-#1-2, 17-#2-1 这种)
    """
    db = await get_db()
    try:
        sql = """
            SELECT q.*,
                   sb.scene_index AS sb_scene_index,
                   sb.section_number AS sb_section_number,
                   c.sort_order AS chapter_sort
            FROM video_task_queue q
            LEFT JOIN storyboards sb ON sb.id = q.storyboard_id
            LEFT JOIN scripts s ON s.id = q.script_id
            LEFT JOIN chapters c ON c.id = s.chapter_id
            WHERE 1=1
        """
        args: list = []
        if novel_id is not None:
            sql += " AND q.novel_id = ?"
            args.append(novel_id)
        if statuses:
            placeholders = ",".join("?" * len(statuses))
            sql += f" AND q.status IN ({placeholders})"
            args.extend(statuses)
        # 排序: 章节(NULL 在最后) → scene_index → section_number → sub_index(用 q.id)
        sql += """
            ORDER BY
                CASE WHEN c.sort_order IS NULL THEN 1 ELSE 0 END ASC,
                c.sort_order ASC,
                CASE WHEN sb.scene_index IS NULL THEN 1 ELSE 0 END ASC,
                sb.scene_index ASC,
                sb.section_number ASC,
                q.id ASC
            LIMIT ?
        """
        args.append(limit)

        cur = await db.execute(sql, args)
        rows = await cur.fetchall()
        return [_row_to_dict(r) for r in rows]
    finally:
        await db.close()


async def get_summary(novel_id: Optional[int] = None) -> Dict[str, int]:
    """统计各状态数量"""
    db = await get_db()
    try:
        sql = "SELECT status, COUNT(*) AS c FROM video_task_queue"
        args: list = []
        if novel_id is not None:
            sql += " WHERE novel_id = ?"
            args.append(novel_id)
        sql += " GROUP BY status"
        cur = await db.execute(sql, args)
        rows = await cur.fetchall()
        out = {STATUS_QUEUED: 0, STATUS_GENERATING: 0, STATUS_DONE: 0,
               STATUS_FAILED: 0, STATUS_ABORTED: 0}
        for r in rows:
            out[r["status"]] = int(r["c"])
        return out
    finally:
        await db.close()


async def get_by_id(item_id: int) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM video_task_queue WHERE id = ?", (item_id,))
        row = await cur.fetchone()
        return _row_to_dict(row) if row else None
    finally:
        await db.close()


async def get_active_by_storyboard(storyboard_id: int) -> Optional[Dict[str, Any]]:
    """查某 storyboard 是否在队列里(queued/generating),返回最新一条"""
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT * FROM video_task_queue "
            "WHERE storyboard_id = ? AND status IN ('queued','generating') "
            "ORDER BY id DESC LIMIT 1",
            (storyboard_id,),
        )
        row = await cur.fetchone()
        return _row_to_dict(row) if row else None
    finally:
        await db.close()


async def get_busy_storyboard_ids(novel_id: Optional[int] = None) -> List[int]:
    """获取所有处于 queued/generating 的 storyboard_id 列表(给前端做按钮置灰用)"""
    db = await get_db()
    try:
        sql = ("SELECT DISTINCT storyboard_id FROM video_task_queue "
               "WHERE status IN ('queued','generating')")
        args: list = []
        if novel_id is not None:
            sql += " AND novel_id = ?"
            args.append(novel_id)
        cur = await db.execute(sql, args)
        rows = await cur.fetchall()
        return [int(r["storyboard_id"]) for r in rows]
    finally:
        await db.close()


# ===================== 状态转换 =====================
async def mark_generating(item_id: int, jimeng_task_id: Optional[str] = None) -> bool:
    """queued → generating"""
    db = await get_db()
    try:
        cur = await db.execute(
            """UPDATE video_task_queue
            SET status = 'generating',
                started_at = ?,
                jimeng_task_id = COALESCE(?, jimeng_task_id)
            WHERE id = ? AND status = 'queued'""",
            (now_beijing_str(), jimeng_task_id, item_id),
        )
        await db.commit()
        return (cur.rowcount or 0) > 0
    finally:
        await db.close()


async def mark_done(item_id: int, video_url: str, last_frame_url: Optional[str] = None) -> bool:
    """generating → done,并写回 storyboards 表

    v3.61.153 codex review 修复:
      之前直接 UPDATE storyboards 绕过 StoryboardService.update_video_status,
      导致 done 状态写入但**尾帧抽取 hook 没触发** + 没走队列同步 hook。
      改成只更队列状态字段,storyboards 表通过 StoryboardService.update_video_status 走标准流程,
      自动触发尾帧抽取 + 队列同步。
    """
    db = await get_db()
    try:
        # 先更队列自己
        cur = await db.execute(
            """UPDATE video_task_queue
            SET status = 'done',
                finished_at = ?,
                video_url = ?,
                last_frame_url = ?,
                error_code = NULL,
                error_message = NULL
            WHERE id = ?""",
            (now_beijing_str(), video_url, last_frame_url, item_id),
        )
        if (cur.rowcount or 0) == 0:
            return False
        # 拿 storyboard_id
        cur = await db.execute(
            "SELECT storyboard_id FROM video_task_queue WHERE id = ?", (item_id,)
        )
        row = await cur.fetchone()
        sb_id = row["storyboard_id"] if row else None
        await db.commit()
    finally:
        await db.close()

    # 走标准 update_video_status 路径,触发尾帧 hook + 队列同步 hook
    if sb_id:
        try:
            from services.storyboard_service import StoryboardService as _SBS
            await _SBS.update_video_status(sb_id, "done", video_url)
            # 如果 last_frame_url 是队列侧已经抽好的,直接补写(避免重复抽帧)
            if last_frame_url:
                _db2 = await get_db()
                try:
                    await _db2.execute(
                        "UPDATE storyboards SET last_frame_path = COALESCE(last_frame_path, ?) WHERE id = ?",
                        (last_frame_url, sb_id),
                    )
                    await _db2.commit()
                finally:
                    await _db2.close()
        except Exception as e:
            import logging as _lg
            _lg.getLogger(__name__).exception(f"[queue.mark_done] 走 update_video_status 失败 sb={sb_id}: {e}")
    return True


async def mark_download_failed(item_id: int, remote_url: str, fail_reason: str) -> bool:
    """v3.61.153 codex P2 修复:崩溃恢复 / 队列下载失败 时调本函数,
    不再 mark_done 假装成功。状态写 download_failed,保留远程 URL 给 retry-download 用。
    """
    db = await get_db()
    try:
        cur = await db.execute(
            """UPDATE video_task_queue
            SET status = 'failed',
                finished_at = ?,
                video_url = ?,
                error_code = 'DOWNLOAD_FAILED',
                error_message = ?
            WHERE id = ?""",
            (now_beijing_str(), remote_url, fail_reason[:500], item_id),
        )
        if (cur.rowcount or 0) == 0:
            return False
        # 拿 storyboard_id
        cur = await db.execute(
            "SELECT storyboard_id FROM video_task_queue WHERE id = ?", (item_id,),
        )
        row = await cur.fetchone()
        sb_id = row["storyboard_id"] if row else None
        await db.commit()
    finally:
        await db.close()

    # 走标准 update_video_status('download_failed') 路径,自动写 video_fail_reason
    if sb_id:
        try:
            from services.storyboard_service import StoryboardService as _SBS
            await _SBS.update_video_status(
                sb_id, "download_failed", remote_url or None, fail_reason=fail_reason,
            )
        except Exception as e:
            import logging as _lg
            _lg.getLogger(__name__).exception(f"[queue.mark_download_failed] update_video_status 失败 sb={sb_id}: {e}")
    return True


async def mark_failed(
    item_id: int,
    error_code: str,
    error_message: str,
    fail_storyboard: bool = True,
) -> bool:
    """generating → failed"""
    db = await get_db()
    try:
        cur = await db.execute(
            """UPDATE video_task_queue
            SET status = 'failed',
                finished_at = ?,
                error_code = ?,
                error_message = ?
            WHERE id = ?""",
            (now_beijing_str(), error_code, error_message, item_id),
        )
        if (cur.rowcount or 0) == 0:
            return False
        if fail_storyboard:
            cur = await db.execute(
                "SELECT storyboard_id FROM video_task_queue WHERE id = ?", (item_id,)
            )
            row = await cur.fetchone()
            if row:
                await db.execute(
                    """UPDATE storyboards SET video_status = 'failed',
                        video_fail_reason = ? WHERE id = ?""",
                    (error_message, row["storyboard_id"]),
                )
        await db.commit()
        return True
    finally:
        await db.close()


async def mark_aborted(item_id: int, reason: str = "用户中断") -> bool:
    """queued/generating → aborted

    aborted 时也要把 storyboard 的 video_status 回退到 pending(等待中)
    或 chain_aborted(生成中被打断的)
    """
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT storyboard_id, status FROM video_task_queue WHERE id = ?",
            (item_id,),
        )
        row = await cur.fetchone()
        if not row:
            return False
        old_status = row["status"]
        sb_id = row["storyboard_id"]

        if old_status not in ACTIVE_STATUSES:
            return False  # 已经 done/failed/aborted 了不动

        await db.execute(
            """UPDATE video_task_queue
            SET status = 'aborted',
                finished_at = ?,
                error_code = 'USER_ABORTED',
                error_message = ?
            WHERE id = ?""",
            (now_beijing_str(), reason, item_id),
        )
        # 回写 storyboard:从 queued 来的回 pending,从 generating 来的标 chain_aborted
        new_sb_status = "pending" if old_status == STATUS_QUEUED else "chain_aborted"
        await db.execute(
            "UPDATE storyboards SET video_status = ? WHERE id = ?",
            (new_sb_status, sb_id),
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def increment_retry(item_id: int) -> int:
    """重试: 把 failed 项重新入队 + retry_count+1"""
    db = await get_db()
    try:
        cur = await db.execute(
            """UPDATE video_task_queue
            SET status = 'queued',
                started_at = NULL,
                finished_at = NULL,
                retry_count = retry_count + 1,
                error_code = NULL,
                error_message = NULL,
                jimeng_task_id = NULL
            WHERE id = ? AND status IN ('failed','aborted')
            RETURNING retry_count""",
            (item_id,),
        )
        row = await cur.fetchone()
        await db.commit()
        if not row:
            return -1
        return int(row["retry_count"])
    finally:
        await db.close()


async def clear_by_status(
    novel_id: Optional[int],
    statuses: List[str],
) -> int:
    """按状态批量清空(只删除终态/queued,不动 generating)

    返回删除的行数。
    清空 queued 时,把 storyboard 回退到 pending 状态。
    """
    if any(s == STATUS_GENERATING for s in statuses):
        raise ValueError("clear_by_status 不允许直接清 generating,请用 abort 或 clear_all_hard")

    db = await get_db()
    try:
        # 先把要清的 queued 项对应 storyboard 回退
        if STATUS_QUEUED in statuses:
            sql = ("SELECT storyboard_id FROM video_task_queue "
                   "WHERE status = 'queued'")
            args: list = []
            if novel_id is not None:
                sql += " AND novel_id = ?"
                args.append(novel_id)
            cur = await db.execute(sql, args)
            rows = await cur.fetchall()
            for r in rows:
                await db.execute(
                    "UPDATE storyboards SET video_status = 'pending' "
                    "WHERE id = ? AND video_status = 'queued'",
                    (r["storyboard_id"],),
                )

        placeholders = ",".join("?" * len(statuses))
        sql = f"DELETE FROM video_task_queue WHERE status IN ({placeholders})"
        args = list(statuses)
        if novel_id is not None:
            sql += " AND novel_id = ?"
            args.append(novel_id)
        cur = await db.execute(sql, args)
        deleted = cur.rowcount or 0
        await db.commit()
        logger.info(f"[queue] clear_by_status: statuses={statuses} novel_id={novel_id} deleted={deleted}")
        return deleted
    finally:
        await db.close()


async def clear_all_hard(novel_id: Optional[int] = None) -> Dict[str, int]:
    """v3.60.4 新增 / v3.60.9 最终版: 真清空所有队列行,但不动主表 storyboards.done 视频

    业务规则(用户最终要求):
    - 队列表: 全部删除(不管什么状态),用户期望"清空"就是干净
    - 主表 storyboards 的 done 状态 + video_url + 磁盘视频文件: 完全不动(成果保留)
    - 主表 storyboards 的 generating/queued 状态: 回退 pending + 清 submit_id
                                              (避免下次启动前端轮询偷查即梦)
    - 主表 storyboards 的 failed 状态: 不动(保留失败原因)

    返回: {"deleted": N, "reset_storyboards": M, "cleared_submits": K}
    """
    db = await get_db()
    try:
        # 1. 删除队列里所有行(包括 done/failed,真清空)
        sql = "DELETE FROM video_task_queue WHERE 1=1"
        args: list = []
        if novel_id is not None:
            sql += " AND novel_id = ?"
            args.append(novel_id)
        cur = await db.execute(sql, args)
        deleted = cur.rowcount or 0

        # 2. 把 generating/queued 的 storyboard 回退到 pending(done/failed 不动)
        sql_reset = (
            "UPDATE storyboards SET video_status = 'pending' "
            "WHERE video_status IN ('queued','generating')"
        )
        args_reset: list = []
        if novel_id is not None:
            sql_reset += " AND novel_id = ?"
            args_reset.append(novel_id)
        cur = await db.execute(sql_reset, args_reset)
        reset = cur.rowcount or 0

        # 3. 清 submit_id 只针对**非 done/failed**的 storyboard
        #    done 保留(成果),failed 保留(失败原因展示)
        sql_clear = (
            "UPDATE storyboards SET submit_id = NULL, video_submit_time = NULL "
            "WHERE submit_id IS NOT NULL "
            "AND (video_status IS NULL OR video_status NOT IN ('done','failed'))"
        )
        args_clear: list = []
        if novel_id is not None:
            sql_clear += " AND novel_id = ?"
            args_clear.append(novel_id)
        cur = await db.execute(sql_clear, args_clear)
        cleared_submits = cur.rowcount or 0

        await db.commit()
        logger.info(
            f"[queue] clear_all_hard: novel_id={novel_id} "
            f"deleted={deleted} reset_storyboards={reset} cleared_submits={cleared_submits} "
            f"(done/failed 完全保留 1:1 对应主表)"
        )
        return {
            "deleted": deleted,
            "reset_storyboards": reset,
            "cleared_submits": cleared_submits,
        }
    finally:
        await db.close()


# ===================== 启动恢复 =====================
async def list_recoverable() -> Dict[str, List[Dict[str, Any]]]:
    """启动时查需要恢复的任务

    - generating: 工具崩溃前正在跑,需查即梦最新状态
    - queued: 直接重新入内存队列继续推
    """
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT * FROM video_task_queue "
            "WHERE status IN ('queued','generating') "
            "ORDER BY priority ASC, created_at ASC"
        )
        rows = await cur.fetchall()
        items = [_row_to_dict(r) for r in rows]
        return {
            STATUS_GENERATING: [i for i in items if i["status"] == STATUS_GENERATING],
            STATUS_QUEUED: [i for i in items if i["status"] == STATUS_QUEUED],
        }
    finally:
        await db.close()


# ===================== 串行尾帧匹配 =====================
async def find_chain_prev_frame(item_id: int) -> Optional[Dict[str, Any]]:
    """查找串行尾帧的前一帧来源(同 script_id 内)

    返回:
    - {"video_url": "...", "last_frame_url": "..."} 当找到上一镜
    - None 当本镜是 section 第一镜
    """
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT script_id, storyboard_id FROM video_task_queue WHERE id = ?",
            (item_id,),
        )
        q = await cur.fetchone()
        if not q:
            return None

        cur = await db.execute(
            "SELECT script_id, section_number, sort_order, id "
            "FROM storyboards WHERE id = ?",
            (q["storyboard_id"],),
        )
        sb = await cur.fetchone()
        if not sb:
            return None

        # 同 script_id 内,sort_order 最大的且小于本镜的
        cur = await db.execute(
            """SELECT id, video_url, last_frame_path
            FROM storyboards
            WHERE script_id IS ? AND sort_order < ? AND video_status = 'done'
            ORDER BY sort_order DESC LIMIT 1""",
            (sb["script_id"], sb["sort_order"] or 0),
        )
        prev = await cur.fetchone()
        if not prev:
            return None
        return {
            "video_url": prev["video_url"],
            "last_frame_url": prev["last_frame_path"],
            "prev_storyboard_id": prev["id"],
        }
    finally:
        await db.close()


# ===================== 工具函数 =====================
def _row_to_dict(row) -> Dict[str, Any]:
    if row is None:
        return None
    d = dict(row)
    # use_chain_frame 转 bool
    if "use_chain_frame" in d:
        d["use_chain_frame"] = bool(d["use_chain_frame"])
    # params_json 反序列化
    if d.get("params_json"):
        try:
            d["params"] = json.loads(d["params_json"])
        except Exception:
            d["params"] = None
    return d
