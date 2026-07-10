"""全局视频生成队列 - HTTP API

设计文档: docs/全局视频队列_技术设计.md
"""
import asyncio
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

from services import queue_service
from services.queue_service import (
    STATUS_QUEUED, STATUS_GENERATING, STATUS_DONE, STATUS_FAILED, STATUS_ABORTED,
    MODE_SERIAL, MODE_PARALLEL, ACTIVE_STATUSES,
)
from services.queue_worker import get_worker, event_bus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/queue", tags=["queue"])


# ===================== 请求模型 =====================
class EnqueueRequest(BaseModel):
    novel_id: int
    script_id: int
    storyboard_ids: List[int] = Field(default_factory=list)
    mode: str = MODE_PARALLEL  # 'serial' | 'parallel'
    use_chain_frame: bool = False
    chain_frame_desc: Optional[str] = None
    video_config_id: Optional[int] = None
    params: Optional[Dict[str, Any]] = None
    priority: int = 100
    provider: str = "jimeng"  # v3.61.0: 'jimeng' | 'volcengine_ark'


class AbortRequest(BaseModel):
    item_ids: List[int] = Field(default_factory=list)
    reason: Optional[str] = "用户中断"


class ClearRequest(BaseModel):
    novel_id: Optional[int] = None
    target: str = "queued"  # 'queued' | 'failed' | 'finished' | 'all'


class RetryRequest(BaseModel):
    item_ids: List[int] = Field(default_factory=list)


# ===================== 入队 =====================
@router.post("/enqueue")
async def enqueue(req: EnqueueRequest):
    """批量入队 - 关键: 校验跨小说锁"""
    if not req.storyboard_ids:
        return {"success": False, "message": "storyboard_ids 为空"}

    # 跨小说互斥校验
    locked, occupied_by = await queue_service.is_locked_by_other_novel(req.novel_id)
    if locked:
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "code": "QUEUE_LOCKED_BY_ANOTHER_NOVEL",
                "occupied_by": occupied_by,
                "message": (
                    f"《{occupied_by['novel_title']}》正在生成视频"
                    f"(等待中 {occupied_by['queued']} / 生成中 {occupied_by['generating']}),"
                    "请等待完成或清空其队列后再操作"
                ),
            },
        )

    if req.mode not in (MODE_SERIAL, MODE_PARALLEL):
        return {"success": False, "message": f"非法 mode: {req.mode}"}

    try:
        result = await queue_service.enqueue_batch(
            novel_id=req.novel_id,
            script_id=req.script_id,
            storyboard_ids=req.storyboard_ids,
            mode=req.mode,
            use_chain_frame=req.use_chain_frame,
            chain_frame_desc=req.chain_frame_desc,
            video_config_id=req.video_config_id,
            params=req.params,
            priority=req.priority,
            provider=req.provider,
        )
    except Exception as e:
        logger.error(f"[queue.enqueue] 失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    # 把入队的 storyboard 标记为 queued(让前端立即看到状态)
    if result["enqueued"]:
        from database.db import get_db
        db = await get_db()
        try:
            placeholders = ",".join("?" * len(result["enqueued"]))
            cur = await db.execute(
                f"SELECT storyboard_id, provider, video_config_id FROM video_task_queue WHERE id IN ({placeholders})",
                result["enqueued"],
            )
            sb_rows = await cur.fetchall()
            for r in sb_rows:
                await db.execute(
                    "UPDATE storyboards SET "
                    "video_status = 'queued', video_provider = ?, video_config_id = ?, "
                    "submit_id = NULL, video_submit_time = NULL, video_fail_reason = NULL "
                    "WHERE id = ?",
                    (
                        r["provider"] or req.provider or "jimeng",
                        r["video_config_id"],
                        r["storyboard_id"],
                    ),
                )
            await db.commit()
        finally:
            await db.close()

    # 唤醒 worker(同时解除冻结,因为用户主动入队就是要工作了)
    _w = get_worker()
    _w.unfreeze()
    _w.notify()

    # 推送 summary
    summary = await queue_service.get_summary()
    await event_bus.publish("queue.summary", summary)
    lock = await queue_service.get_lock_status()
    await event_bus.publish("queue.lock", lock)

    return {
        "success": True,
        "enqueued_count": len(result["enqueued"]),
        "skipped_count": len(result["skipped"]),
        "enqueued": result["enqueued"],
        "skipped": result["skipped"],
    }


# ===================== 查询 =====================
@router.get("/list")
async def list_queue(
    novel_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 500,
):
    """列出队列项"""
    statuses = None
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
    items = await queue_service.list_items(
        novel_id=novel_id, statuses=statuses, limit=limit
    )
    summary = await queue_service.get_summary(novel_id=novel_id)
    return {
        "success": True,
        "items": items,
        "summary": summary,
    }


@router.get("/lock-status")
async def get_lock_status():
    """查询全局锁状态"""
    return await queue_service.get_lock_status()


@router.get("/busy-storyboards")
async def get_busy_storyboards(novel_id: Optional[int] = None):
    """获取所有处于 queued/generating 的 storyboard_id 列表(给前端做按钮置灰)"""
    ids = await queue_service.get_busy_storyboard_ids(novel_id=novel_id)
    return {"success": True, "ids": ids}


# ===================== 中断 / 清空 / 重试 =====================
@router.post("/abort")
async def abort(req: AbortRequest):
    if not req.item_ids:
        return {"success": False, "message": "item_ids 为空"}
    worker = get_worker()
    aborted = 0
    for iid in req.item_ids:
        if await worker.abort(iid, req.reason or "用户中断"):
            aborted += 1
    summary = await queue_service.get_summary()
    await event_bus.publish("queue.summary", summary)
    lock = await queue_service.get_lock_status()
    await event_bus.publish("queue.lock", lock)
    return {"success": True, "aborted_count": aborted}


@router.post("/clear")
async def clear(req: ClearRequest):
    """按状态清空

    target:
    - 'queued' / 'failed' / 'finished': 软清(只删特定状态)
    - 'all_hard' (v3.60.4 新增): 一刀切 — 中止生成中的 worker 循环 + 删除该小说所有队列行
                              + 回退 storyboard 状态。彻底干净,DB 不留任何记录。
    """
    target = req.target

    # v3.60.4 新增: 一刀切清空
    if target == "all_hard":
        worker = get_worker()
        # v3.60.25: 立即冻结派单 30 秒,防 race condition 让 worker 误派残留 queued 项
        worker.freeze(30.0)

        # 1. abort 所有 active 任务的 abort_event
        active_items = await queue_service.list_items(
            novel_id=req.novel_id,
            statuses=[STATUS_QUEUED, STATUS_GENERATING],
        )
        for item in active_items:
            try:
                ev = worker._abort_events.get(item["id"])
                if ev:
                    ev.set()
            except Exception:
                pass

        # 2. 一刀清表
        try:
            result = await queue_service.clear_all_hard(req.novel_id)
        except Exception as e:
            return {"success": False, "message": str(e)}

        summary = await queue_service.get_summary()
        await event_bus.publish("queue.summary", summary)
        lock = await queue_service.get_lock_status()
        await event_bus.publish("queue.lock", lock)
        return {
            "success": True,
            "deleted_count": result["deleted"],
            "reset_storyboards": result["reset_storyboards"],
            "message": f"已清空全部({result['deleted']} 条)。即梦那边可能仍在跑(扣点),请检查",
        }

    # 软清(老逻辑)
    if target == "queued":
        statuses = [STATUS_QUEUED]
    elif target == "failed":
        statuses = [STATUS_FAILED]
    elif target == "finished":
        statuses = [STATUS_DONE, STATUS_FAILED, STATUS_ABORTED]
    elif target == "all":
        # all 包含 queued + 终态,但不动 generating
        statuses = [STATUS_QUEUED, STATUS_DONE, STATUS_FAILED, STATUS_ABORTED]
    else:
        return {"success": False, "message": f"未知 target: {target}"}

    try:
        deleted = await queue_service.clear_by_status(req.novel_id, statuses)
    except ValueError as e:
        return {"success": False, "message": str(e)}

    summary = await queue_service.get_summary()
    await event_bus.publish("queue.summary", summary)
    lock = await queue_service.get_lock_status()
    await event_bus.publish("queue.lock", lock)
    return {"success": True, "deleted_count": deleted}


@router.post("/retry")
async def retry(req: RetryRequest):
    """重试 failed/aborted 项"""
    if not req.item_ids:
        return {"success": False, "message": "item_ids 为空"}

    # 锁校验:重试也算入队
    if req.item_ids:
        first = await queue_service.get_by_id(req.item_ids[0])
        if first:
            locked, occupied_by = await queue_service.is_locked_by_other_novel(first["novel_id"])
            if locked:
                return JSONResponse(
                    status_code=409,
                    content={
                        "success": False,
                        "code": "QUEUE_LOCKED_BY_ANOTHER_NOVEL",
                        "occupied_by": occupied_by,
                    },
                )

    retried = 0
    for iid in req.item_ids:
        rc = await queue_service.increment_retry(iid)
        if rc >= 0:
            retried += 1
    get_worker().notify()
    summary = await queue_service.get_summary()
    await event_bus.publish("queue.summary", summary)
    return {"success": True, "retried_count": retried}


# ===================== SSE 推送 =====================
@router.get("/stream")
async def stream(request: Request, novel_id: Optional[int] = None):
    """SSE 长连接,推送 queue.update / queue.summary / queue.lock / queue.alert 事件"""
    queue: asyncio.Queue = await event_bus.subscribe()

    async def event_gen():
        # 连接建立时,先推一次当前快照
        try:
            snapshot_summary = await queue_service.get_summary(novel_id=novel_id)
            yield _format_event("queue.summary", snapshot_summary)
            snapshot_lock = await queue_service.get_lock_status()
            yield _format_event("queue.lock", snapshot_lock)

            heartbeat_interval = 25  # 秒
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                except asyncio.TimeoutError:
                    # 心跳
                    yield ": ping\n\n"
                    continue

                event = msg.get("event", "message")
                data = msg.get("data", {})

                # 按 novel_id 过滤(只推同一本小说的 update 事件;summary/lock/alert 全推)
                if event == "queue.update" and novel_id is not None:
                    if data.get("novel_id") != novel_id:
                        continue

                yield _format_event(event, data)
        except asyncio.CancelledError:
            pass
        finally:
            await event_bus.unsubscribe(queue)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


def _format_event(event: str, data: Any) -> str:
    """SSE 帧格式"""
    payload = json.dumps(data, ensure_ascii=False, default=str)
    return f"event: {event}\ndata: {payload}\n\n"
