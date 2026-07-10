"""全局视频生成队列 - 消费者 Worker

设计文档: docs/全局视频队列_技术设计.md

职责:
1. FastAPI 启动时拉起单例 worker
2. 启动恢复:扫描 generating(查即梦) + queued(重新入队)
3. 信号量并发控制(并行) + per-novel 锁(串行)
4. 调用现有 video_service 完成生成
5. 失败重试(网络类自动 1 次)
6. 状态变更通过 EventBus 推 SSE
"""
import asyncio
import logging
from typing import Optional, Dict, Any, Set, List


def _now_str() -> str:
    from utils.timezone import now_beijing_str
    return now_beijing_str()

from services import queue_service
from services.queue_service import (
    STATUS_QUEUED, STATUS_GENERATING, STATUS_DONE, STATUS_FAILED, STATUS_ABORTED,
    MODE_SERIAL, MODE_PARALLEL,
    ERR_NETWORK, ERR_TIMEOUT, ERR_TRUNCATED, ERR_BALANCE, ERR_REVIEW, ERR_UNKNOWN,
    RETRYABLE_ERRORS,
)

logger = logging.getLogger(__name__)


# ===================== 事件总线(SSE 用) =====================
class _EventBus:
    """简单的进程内事件总线,所有 SSE 订阅者从这里取事件。"""
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        async with self._lock:
            self._subscribers.add(q)
        return q

    async def unsubscribe(self, q: asyncio.Queue):
        async with self._lock:
            self._subscribers.discard(q)

    async def publish(self, event: str, data: Dict[str, Any]):
        msg = {"event": event, "data": data}
        # 复制一份订阅者集合以减少锁持有时间
        async with self._lock:
            subs = list(self._subscribers)
        for q in subs:
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                # 慢消费者:丢弃最老的
                try:
                    q.get_nowait()
                    q.put_nowait(msg)
                except Exception:
                    pass


event_bus = _EventBus()


# ===================== Worker 主体 =====================
class QueueWorker:
    """单例 worker,负责从 DB 拉任务并并发推送到生成服务。"""

    def __init__(self, max_concurrent: int = 3):
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)
        # per-novel 串行锁(serial 模式同小说独占)
        self._serial_locks: Dict[int, asyncio.Lock] = {}
        # 中断信号(item_id → asyncio.Event)
        self._abort_events: Dict[int, asyncio.Event] = {}
        # 主循环 task
        self._main_task: Optional[asyncio.Task] = None
        # 当前在跑的 item id 集合
        self._running: Set[int] = set()
        self._wakeup = asyncio.Event()
        self._stop = asyncio.Event()
        # v3.60.25: 冻结时间戳(asyncio loop time);< 当前时间则正常工作,> 当前时间则不派任何新任务
        self._freeze_until: float = 0.0

    def freeze(self, seconds: float = 30.0):
        """v3.60.25: 冻结派单循环 N 秒,期间不派任何新任务

        用于清空全部后保险,防止 race condition 让 worker 误派残留 queued 项
        """
        loop = asyncio.get_event_loop()
        self._freeze_until = loop.time() + seconds
        logger.info(f"[queue_worker] 已冻结派单 {seconds}s,期间不派任何新任务")

    def unfreeze(self):
        """提前解除冻结(下次有人入队时调用)"""
        self._freeze_until = 0.0

    # ------------- 生命周期 -------------
    async def start(self):
        """启动 worker,先做恢复再开主循环"""
        logger.info(f"[queue_worker] 启动, max_concurrent={self.max_concurrent}")
        await self._recover_on_startup()
        self._main_task = asyncio.create_task(self._main_loop(), name="queue_worker_main")

    async def stop(self):
        logger.info("[queue_worker] 停止中...")
        self._stop.set()
        self._wakeup.set()
        if self._main_task:
            try:
                await asyncio.wait_for(self._main_task, timeout=5)
            except Exception:
                self._main_task.cancel()
        logger.info("[queue_worker] 已停止")

    def notify(self):
        """外部入队 / 状态变化后调一次,唤醒主循环"""
        self._wakeup.set()

    # ------------- 启动恢复(保守策略 v3.60.4) -------------
    async def _recover_on_startup(self):
        """v3.60.4 改为保守策略:
        - 应用重启后,不自动恢复任何 queued/generating 任务
        - generating 的: 查即梦实际状态,如果已成功就标 done(避免漏视频),其它一律 aborted
        - queued 的: 一律 aborted("应用重启,需手动重新加入队列")
        - 这样避免使用旧的 params 快照(版本/时长/VIP 等可能已过期),也避免用户重启后突然冒出
          一堆任务跑掉钱
        """
        try:
            data = await queue_service.list_recoverable()
        except Exception as e:
            logger.error(f"[queue_worker] 恢复扫描失败: {e}", exc_info=True)
            return

        gen_items = data.get(STATUS_GENERATING, [])
        q_items = data.get(STATUS_QUEUED, [])
        logger.info(
            f"[queue_worker] 启动恢复(保守模式): generating={len(gen_items)} queued={len(q_items)} 一律标 aborted"
        )

        # generating 项: 先查即梦,如果已成功就保住(避免漏掉视频)
        for item in gen_items:
            try:
                await self._reconcile_generating_conservative(item)
            except Exception as e:
                logger.error(f"[queue_worker] 恢复 generating 项 {item['id']} 失败: {e}", exc_info=True)
                await queue_service.mark_aborted(
                    item["id"], "应用重启 - 任务状态未知,已停止;如即梦那边已生成请到主表点刷新"
                )
                await self._publish_update(item["id"])

        # queued 项: 全部 aborted
        for item in q_items:
            try:
                await queue_service.mark_aborted(
                    item["id"], "应用重启 - 等待项已重置,如需继续请重新加入队列"
                )
                await self._publish_update(item["id"])
            except Exception as e:
                logger.warning(f"[queue_worker] 标记 queued 项 {item['id']} aborted 失败: {e}")

    async def _reconcile_generating_conservative(self, item: Dict[str, Any]):
        """generating 项: 只看是否已成功,成功就保住 done(避免漏视频),其它一律 aborted"""
        task_id = item.get("jimeng_task_id")
        if not task_id:
            await queue_service.mark_aborted(
                item["id"], "应用重启 - 无即梦任务ID,无法核对状态"
            )
            await self._publish_update(item["id"])
            return

        try:
            from services.video_service import VideoService
            vs = VideoService()
            result = await vs.query_result(task_id)
        except Exception as e:
            logger.warning(f"[queue_worker] 查即梦 task_id={task_id} 失败: {e}")
            await queue_service.mark_aborted(
                item["id"], f"应用重启 - 即梦查询失败({str(e)[:100]})"
            )
            await self._publish_update(item["id"])
            return

        status = (result or {}).get("status", "")
        if status == "success":
            # v3.61.153 codex P2:崩溃恢复时拿到的 video_url 是即梦远程 URL,
            # 本地还没下载过 → 不能 mark_done 假装成功(尾帧/接帧/视频文件都没有)
            # 标 download_failed,远程 URL 留着供 retry-download 重下
            video_url = (result.get("data") or {}).get("video_url") or ""
            if video_url and video_url.startswith(("http://", "https://")):
                await queue_service.mark_download_failed(
                    item["id"], video_url,
                    "应用重启时即梦已生成完成,但本地未下载。请到视频生成页点重试下载。",
                )
                logger.info(f"[queue_worker] 重启后发现 task_id={task_id} 已成功,标 download_failed 待重下")
            elif video_url and video_url.startswith("/data/"):
                # 罕见情况:崩溃前已下载过(异常退出但写盘成功),直接 mark_done
                await queue_service.mark_done(item["id"], video_url, None)
                logger.info(f"[queue_worker] 重启后发现 task_id={task_id} 已 done + 本地有文件")
            else:
                # 既不是远程也不是本地路径 → 视为下载失败
                await queue_service.mark_download_failed(
                    item["id"], video_url,
                    "应用重启 - 即梦返回的 video_url 格式异常",
                )
        else:
            await queue_service.mark_aborted(
                item["id"], "应用重启 - 任务中断;如已扣点请到主表手动刷新核对"
            )
        await self._publish_update(item["id"])

    async def _reconcile_generating(self, item: Dict[str, Any]):
        """对崩溃前 generating 的任务做对账"""
        task_id = item.get("jimeng_task_id")
        if not task_id:
            # 没记录 task_id,无法恢复 → 标 failed
            await queue_service.mark_failed(
                item["id"], ERR_UNKNOWN,
                "崩溃前未记录即梦任务ID,无法恢复",
            )
            await self._publish_update(item["id"])
            return

        # 查即梦最新状态
        try:
            from services.video_service import VideoService
            vs = VideoService()
            result = await vs.query_result(task_id)
        except Exception as e:
            logger.warning(f"[queue_worker] 查即梦 task_id={task_id} 失败: {e},保留 generating 状态等下次轮询")
            return

        # 简化处理:成功就标 done(只在 video_url 是本地路径时),失败就标 failed,中间态保留
        # v3.61.153 codex P2:跟 reconcile_dispatched 同样,远程 URL 不能直接 mark_done
        status = (result or {}).get("status", "")
        if status == "success":
            video_url = (result.get("data") or {}).get("video_url") or ""
            if video_url and video_url.startswith("/data/"):
                await queue_service.mark_done(item["id"], video_url, None)
            elif video_url and video_url.startswith(("http://", "https://")):
                await queue_service.mark_download_failed(
                    item["id"], video_url,
                    "队列对账时发现即梦已完成,但本地未下载。请到视频生成页点重试下载。",
                )
            else:
                await queue_service.mark_download_failed(
                    item["id"], video_url,
                    "队列对账时 video_url 为空或格式异常",
                )
        elif status in ("fail", "failed", "error"):
            msg = (result or {}).get("message", "即梦返回失败")
            await queue_service.mark_failed(item["id"], ERR_UNKNOWN, str(msg)[:500])
        else:
            # 还在跑 → 主循环会接管
            logger.info(f"[queue_worker] 任务 {item['id']} 即梦仍在跑,接管轮询")
        await self._publish_update(item["id"])

    # ------------- 主循环 -------------
    async def _main_loop(self):
        while not self._stop.is_set():
            try:
                picked = await self._pick_and_dispatch()
                if not picked:
                    # 没活干,等 1.5s 或被唤醒
                    try:
                        await asyncio.wait_for(self._wakeup.wait(), timeout=1.5)
                    except asyncio.TimeoutError:
                        pass
                    self._wakeup.clear()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[queue_worker] 主循环异常: {e}", exc_info=True)
                await asyncio.sleep(2)

    async def _pick_and_dispatch(self) -> bool:
        """从 DB 取一条 queued 项推到生成器。返回 True 表示派单成功。

        v3.60.26 严格修法: 改用内存 `_running` 集合 + 内存维护的 per-novel 派单计数,
        不依赖 storyboards.video_status(那个有 5-30 秒滞后,SQL 查不到 _wait_for_jimeng_capacity
        阶段的任务)。asyncio 单线程,内存计数完全可靠。
        """
        # v3.60.25 保险: 冻结期间一律不派
        loop = asyncio.get_event_loop()
        if loop.time() < self._freeze_until:
            return False

        items = await queue_service.list_items(statuses=[STATUS_QUEUED], limit=20)
        if not items:
            return False

        # 通过 _running 集合 + DB 反查每条 task 的 novel_id,统计当前每个 novel 已派但未完成数
        # _running 在 _run_one finally 里 discard,所以是真实的"未完成"集合
        running_per_novel: Dict[int, int] = {}
        if self._running:
            # 取 _running 里的 task 详情,看每条 novel
            for it in items:
                pass  # 用一个反查
            # 更准确做法:遍历 _running 里所有 id 反查 novel_id
            running_ids = list(self._running)
            placeholders = ",".join("?" * len(running_ids))
            try:
                from database.db import get_db as _gdb
                db = await _gdb()
                try:
                    cur = await db.execute(
                        f"SELECT id, novel_id FROM video_task_queue WHERE id IN ({placeholders})",
                        running_ids,
                    )
                    rows = await cur.fetchall()
                    for r in rows:
                        nid = int(r["novel_id"])
                        running_per_novel[nid] = running_per_novel.get(nid, 0) + 1
                finally:
                    await db.close()
            except Exception as e:
                logger.warning(f"[queue_worker] 查 _running 详情失败: {e}")

        MAX_ACTIVE_PER_NOVEL = 1

        for item in items:
            if item["id"] in self._running:
                continue
            novel_id = item["novel_id"]
            if running_per_novel.get(novel_id, 0) >= MAX_ACTIVE_PER_NOVEL:
                continue
            # 派单
            asyncio.create_task(self._run_one(item), name=f"queue_run_{item['id']}")
            self._running.add(item["id"])
            # 立即更新内存计数,下一轮看得到
            running_per_novel[novel_id] = running_per_novel.get(novel_id, 0) + 1
            logger.info(
                f"[queue_worker] 派单 item_id={item['id']} novel={novel_id} "
                f"label={item.get('label', '')} mode={item['mode']} "
                f"(novel 已派 {running_per_novel[novel_id]}/{MAX_ACTIVE_PER_NOVEL})"
            )
            # 派单后等 3s 缓冲(让 _execute 至少进入 lock 阶段)
            await asyncio.sleep(3)
            return True
        return False

    # ------------- 单条任务执行 -------------
    async def _run_one(self, item: Dict[str, Any]):
        item_id = item["id"]
        try:
            # 同小说串行模式独占
            if item["mode"] == MODE_SERIAL:
                lock = self._serial_locks.setdefault(item["novel_id"], asyncio.Lock())
                async with lock:
                    async with self._semaphore:
                        await self._execute(item)
            else:
                async with self._semaphore:
                    await self._execute(item)
        except Exception as e:
            logger.error(f"[queue_worker] 任务 {item_id} 异常: {e}", exc_info=True)
            try:
                await queue_service.mark_failed(item_id, ERR_UNKNOWN, str(e)[:500])
            except Exception:
                pass
            await self._publish_update(item_id)
        finally:
            self._running.discard(item_id)
            self._abort_events.pop(item_id, None)
            self.notify()

    async def _execute(self, item: Dict[str, Any]):
        """实际执行视频生成的核心"""
        item_id = item["id"]
        sb_id = item["storyboard_id"]

        # 入队后被中断了
        if self._abort_events.get(item_id) and self._abort_events[item_id].is_set():
            await queue_service.mark_aborted(item_id, "派单前已被中断")
            await self._publish_update(item_id)
            return

        # 生成 abort event
        abort_event = asyncio.Event()
        self._abort_events[item_id] = abort_event

        # v3.60.17 / v3.61.0: 即梦 provider 才需要等容量(火山方舟没并发上限,RPM 自然限流)
        if (item.get("provider") or "jimeng") == "jimeng":
            await self._wait_for_jimeng_capacity(item, abort_event)
            if abort_event.is_set():
                await queue_service.mark_aborted(item_id, "等待即梦容量时被中断")
                await self._publish_update(item_id)
                return

        # 标 generating
        # codex P1:必须检查返回值。容量等待期间 DB 行仍是 queued,用户若清空队列(行被删)
        #   或中断,mark_generating 会因 status!='queued'/行不存在返回 False。此时绝不能继续提交,
        #   否则会向即梦发出一个无队列行追踪的新幽灵任务。
        ok = await queue_service.mark_generating(item_id)
        if not ok:
            logger.info(
                f"[queue_worker] 任务 {item_id} mark_generating 失败(队列行已被清空/中断),放弃提交"
            )
            self._abort_events.pop(item_id, None)
            await self._publish_update(item_id)
            return
        await self._publish_update(item_id)

        # 实时读最新 storyboard prompt(允许用户改了道具图后等待项使用新参考)
        prompt, params, video_config_id = await self._load_runtime_params(item)

        # v3.60.23: 每条分镜按自己 prompt 里的 "📏 本小节总时长" 覆盖 duration
        # 跟老路径 _process_batch_generation 一致 — 否则全队列都用入队时的顶部 duration,
        # 实际每条分镜的剧本时长不一样会错配
        try:
            from api.video import _extract_section_duration as _esd
            sec_dur = _esd(prompt)
            if sec_dur is not None:
                if params is None:
                    params = {}
                else:
                    params = dict(params)  # 不污染 item 的快照
                old_dur = params.get("duration")
                if old_dur != sec_dur:
                    logger.info(
                        f"[queue_worker] 分镜 {sb_id} 按小节时长自动调整 duration: "
                        f"{old_dur} -> {sec_dur}"
                    )
                params["duration"] = sec_dur
        except Exception as _dur_e:
            logger.debug(f"[queue_worker] 提取小节时长失败(用原 duration): {_dur_e}")

        # 串行尾帧:从同章前序拿 last_frame
        chain_prev = None
        if item["use_chain_frame"]:
            try:
                chain_prev = await queue_service.find_chain_prev_frame(item_id)
            except Exception as e:
                logger.warning(f"[queue_worker] 查尾帧失败 item_id={item_id}: {e}")

        # v3.61.0: 按 provider 路由
        # v3.61.168: cool 跟 volcengine_ark 都走 _submit_via_ark(内部已按 _infer_cloud_provider 分流到 CoolVideoProvider)
        # v3.61.173: 加 xinglian(星链云 SD2 系列),同样走云端 HTTP 路径
        provider_type = (item.get("provider") or "jimeng").lower()
        if provider_type in ("volcengine_ark", "cool", "xinglian"):
            # 云端 HTTP API 路径(ark / cool / xinglian)
            ok = await self._submit_via_ark(item, sb_id, prompt, params, abort_event)
            if not ok:
                return  # 已在内部标过状态
        else:
            # 即梦 CLI 老路径(保留全部 1310 重试逻辑,行为不变)
            from api.video import _process_video_generation
            from database.db import get_db as _gdb
            _max_concurrency_retries = 3
            for _attempt in range(_max_concurrency_retries + 1):
                if abort_event.is_set():
                    await queue_service.mark_aborted(item_id, "提交期间被中断")
                    await self._publish_update(item_id)
                    return
                try:
                    await _process_video_generation(
                        sb_id, prompt, video_config_id, params,
                        bool(item["use_chain_frame"]),
                        item.get("chain_frame_desc"),
                    )
                except Exception as e:
                    err_code, err_msg = _classify_error(str(e))
                    await self._handle_failure(item, err_code, err_msg)
                    await self._publish_update(item_id)
                    return
                try:
                    _db = await _gdb()
                    try:
                        _cur = await _db.execute(
                            "SELECT video_status, video_fail_reason, submit_id FROM storyboards WHERE id = ?",
                            (sb_id,),
                        )
                        _row = await _cur.fetchone()
                    finally:
                        await _db.close()
                except Exception:
                    _row = None
                if not _row:
                    break
                _vs = (_row["video_status"] or "").lower()
                _fr = (_row["video_fail_reason"] or "")
                # v3.61.254 修复③:重试前先看有没有 submit_id。
                #   修复②已让"fail+submit_id"走 generating,正常不会到这;但 1310 重试是"重新提交",
                #   只要本镜已经拿到过 submit_id(任务已受理),绝不能再提交一次 —— 那会撞自己刚建的任务。
                #   有 submit_id 直接跳出重试循环,交给下面的 _wait_storyboard_settled 轮询判终态。
                _submit_id = (_row["submit_id"] if "submit_id" in _row.keys() else None) or ""
                if _submit_id:
                    logger.info(
                        f"[queue_worker] 任务 {item_id} 已有 submit_id={_submit_id},不重复提交,直接进轮询"
                    )
                    break
                _is_1310 = (
                    _vs == "failed"
                    and ("1310" in _fr or "并发上限" in _fr or "concurrency" in _fr.lower())
                )
                if not _is_1310:
                    break
                if _attempt >= _max_concurrency_retries:
                    logger.warning(
                        f"[queue_worker] 任务 {item_id} 已重试 {_attempt} 次仍 1310,放弃"
                    )
                    break
                logger.warning(
                    f"[queue_worker] 任务 {item_id} 撞 1310 并发上限,"
                    f"等 60s 后第 {_attempt + 1} 次重试..."
                )
                try:
                    from services.storyboard_service import StoryboardService
                    await StoryboardService.update_video_status(sb_id, "generating")
                except Exception:
                    pass
                try:
                    await asyncio.wait_for(abort_event.wait(), timeout=60)
                    await queue_service.mark_aborted(item_id, "等待 1310 重试时被中断")
                    await self._publish_update(item_id)
                    return
                except asyncio.TimeoutError:
                    pass

        # v3.60.2 关键修复:_process_video_generation 只提交不等待,
        # 必须轮询 storyboard 状态等其真正进终态(done/failed/chain_aborted),
        # 否则 worker 立刻读到 generating 会被误标 failed
        settled_status = await self._wait_storyboard_settled(
            sb_id, abort_event, timeout_seconds=5 * 60 * 60  # v3.61.88: 60 分钟 → 5 小时兜底(普通账号即梦排队 3 小时常见)
        )

        if settled_status is None:
            # 超时
            await self._handle_failure(item, ERR_TIMEOUT, "等待生成超时(>5小时)")
            await self._publish_update(item_id)
            return

        if settled_status == "aborted":
            # 用户中断了
            await queue_service.mark_aborted(item_id, "用户中断")
            await self._publish_update(item_id)
            return

        # 终态 = done / failed / chain_aborted → 同步回写队列
        await self._sync_storyboard_to_queue(item)
        await self._publish_update(item_id)

        # v3.60.17: 完成后强制等 5 秒,给即梦释放配额时间,避免下一条秒发撞 1310
        # 模拟老路径"前端轮询到 done 后,JS 跑到下一个 await 也要 1-2 秒"的天然节奏
        try:
            await asyncio.wait_for(abort_event.wait(), timeout=5.0)
        except asyncio.TimeoutError:
            pass

    # ==================== v3.61.0 火山方舟提交路径 ====================
    async def _submit_via_ark(
        self,
        item: Dict[str, Any],
        sb_id: int,
        prompt: str,
        params: Dict[str, Any],
        abort_event: asyncio.Event,
    ) -> bool:
        """火山方舟 HTTP API 提交分支
        返回 True 表示已成功提交并写入 storyboard.submit_id, 后续走 _wait_storyboard_settled
        返回 False 表示已标失败,worker 应直接 return
        """
        from services.video_providers import get_provider
        from services.storyboard_service import StoryboardService
        from services.cloud_llm_sync import get_active_config
        from database.db import get_db as _gdb

        if abort_event.is_set():
            await queue_service.mark_aborted(item["id"], "提交前被中断")
            await self._publish_update(item["id"])
            return False

        # 1. 取云端视频配置(火山方舟 / Cool 中转)
        # v3.61.169: 文案 generic 化(此时 cloud_cfg 还没拿到,无法判断真 provider)
        try:
            cloud_cfg = await get_active_config(
                config_id=item.get("video_config_id"),
                config_type="video",
            )
        except Exception as e:
            await self._handle_failure(
                item, "AUTH",
                f"无法获取云端视频配置: {e}"[:300],
            )
            await self._publish_update(item["id"])
            return False

        if not cloud_cfg:
            await self._handle_failure(
                item, "AUTH",
                "未配置云端视频模型(火山方舟 / Cool 中转),请到千山AI个人中心添加",
            )
            await self._publish_update(item["id"])
            return False

        provider_cfg = {
            "id": cloud_cfg.get("id"),
            "name": cloud_cfg.get("name"),
            "base_url": cloud_cfg.get("baseUrl"),
            "api_key": cloud_cfg.get("apiKey"),
            "model_name": cloud_cfg.get("modelName"),
            "extra_params": cloud_cfg.get("extraParams") or {},
        }

        # v3.61.168 + 169 + 170: 按 cloud config 推断真 provider type — 提到 collect 之前
        # 这样 collect 才能按 provider 分流 asset:// URI(cool 不认 asset://,得降级用原图)
        from api.video import (
            _infer_cloud_provider, _collect_storyboard_assets_for_ark,
            _build_final_video_prompt, _log_video_submit_start, _log_video_submit_end,
            _log_video_submitted,
        )
        _resolved_provider_type = _infer_cloud_provider(cloud_cfg)
        _provider_friendly = {"cool": "Cool 中转", "volcengine_ark": "火山方舟", "xinglian": "星链云"}.get(_resolved_provider_type, _resolved_provider_type)

        # 2. 准备图片/音频列表 — v3.61.12 复用 video.py 的统一函数(含尾帧 + 自定义参考图 + 三级匹配)
        # v3.61.134: 修 4-tuple unpack + 传 prompt 给 collect(让"种菜模式"在队列路径也生效)
        # v3.61.170: 传 provider_type 让 cool 路径跳过 asset:// URI
        images, audios, _image_labels, _audio_labels = await _collect_storyboard_assets_for_ark(
            sb_id,
            use_chain_frame=bool(item.get("use_chain_frame")),
            prompt_for_speakers=prompt or "",
            provider_type=_resolved_provider_type,
        )

        # 3. 透传 use_chain_frame → return_last_frame
        ark_params = dict(params or {})
        if item.get("use_chain_frame"):
            ark_params["use_chain_frame"] = True

        # v3.61.181: 队列路径以前直接透传 raw prompt → cool / xinglian / ark 收到没拼装的 prompt
        #            ★ 缺 style_prefix / start_state / file_refs,还残留 🔗 + 📏 元数据
        #            现在改用统一 helper,跟即梦 CLI / ark_submit 完全对齐
        final_prompt = await _build_final_video_prompt(
            storyboard_id=sb_id,
            raw_prompt=prompt or "",
            image_items=_image_labels[:9],
            audio_items=_audio_labels[:3],
            with_file_refs=True,
            log_prefix=f"queue/{_resolved_provider_type}",
            ref_at=(_resolved_provider_type == "cool"),  # v3.61.214: 仅 cool 用 @图片N / @音频N
        )

        # v3.61.183: 视频提交日志(create_log)— 进上游前记一条 running
        _video_log_id = await _log_video_submit_start(
            storyboard_id=sb_id,
            provider=_resolved_provider_type,
            # v3.61.241: 写真实 providerCode(云端按 providerCode+model 匹配价格);
            # 缺省回退到 _resolved_provider_type 保持旧行为
            provider_code=cloud_cfg.get("providerCode") or _resolved_provider_type,
            model=cloud_cfg.get("modelName") or "",
            config_name=cloud_cfg.get("name") or "",
            base_url=cloud_cfg.get("baseUrl") or "",
            final_prompt=final_prompt,
            images=images,
            audios=audios,
            params=ark_params,
        )

        # 4. 提交(provider 实例已经在上面 _resolved_provider_type 算好)
        # v3.61.183 codex P1:provider.submit() 抛异常时,上层 _run_one 只标队列 failed,
        #   拿不到 _video_log_id → llm_logs 残留 running。这里 wrap 一层 try/except 兜底
        provider = get_provider(_resolved_provider_type, provider_cfg)
        try:
            sub_res = await provider.submit(
                prompt=final_prompt,
                images=images,
                audios=audios,
                params=ark_params,
            )
        except Exception as _submit_exc:
            # 标 llm_logs error 后让异常继续冒泡(保持原行为,上层处理队列 failed)
            try:
                await _log_video_submit_end(
                    _video_log_id, success=False,
                    fail_reason=f"{type(_submit_exc).__name__}: {_submit_exc}",
                )
            except Exception:
                pass
            raise

        if not sub_res.success:
            await _log_video_submit_end(
                _video_log_id, success=False, fail_reason=sub_res.fail_reason,
                sanitized_payload=sub_res.sanitized_payload,
            )
            err_code = sub_res.error_code or "UNKNOWN"
            err_msg = sub_res.fail_reason or f"{_provider_friendly} 提交失败"
            # 写到 storyboard 让前端看到
            try:
                await StoryboardService.update_video_status(
                    sb_id, "failed", fail_reason=err_msg
                )
            except Exception:
                pass
            await self._handle_failure(item, err_code, err_msg)
            await self._publish_update(item["id"])
            return False

        # v3.61.183: 提交成功 → 更新 video_generation log 为 success(带 sanitized_payload)
        await _log_video_submitted(
            _video_log_id, provider=_resolved_provider_type, submit_id=sub_res.submit_id,
        )

        # 5. 写 submit_id 到 storyboard 让 poll-status 能跟踪
        # v3.61.168: video_provider 也写,让 poll-status / force-sync 能正确分流
        # v3.61.171: video_config_id 同步写,poll-status 用它精准定位配置
        # v3.61.172: 重新提交时清旧 video_url / last_frame_path — 防老任务残留导致 UI 错乱
        try:
            db = await _gdb()
            try:
                await db.execute(
                    "UPDATE storyboards SET submit_id = ?, video_status = 'generating', "
                    "video_submit_time = ?, video_provider = ?, video_config_id = ?, "
                    "video_url = NULL, last_frame_path = NULL, last_frame_orig_path = NULL, "
                    "video_fail_reason = NULL WHERE id = ?",
                    (sub_res.submit_id, _now_str(), _resolved_provider_type, cloud_cfg.get("id"), sb_id),
                )
                await db.commit()
            finally:
                await db.close()
        except Exception as e:
            logger.warning(f"[queue_worker.cloud] 写 submit_id 失败: {e}")

        logger.info(
            f"[queue_worker.ark] 提交成功 item_id={item['id']} sb={sb_id} "
            f"task_id={sub_res.submit_id}"
        )
        return True

    async def _collect_storyboard_assets(
        self,
        sb_id: int,
        params: Dict[str, Any],
    ) -> tuple:
        """从 storyboard 关联元素收集图片/音频(给火山方舟用)

        返回 (images, audios) 都是路径字符串列表
        """
        from database.db import get_db as _gdb
        import json as _json

        images: List[str] = []
        audios: List[str] = []

        db = await _gdb()
        try:
            # 取分镜 + 关联 characters/scenes/props
            cur = await db.execute(
                """SELECT novel_id, characters, scenes, props,
                       extra_reference_image, last_frame_path
                FROM storyboards WHERE id = ?""",
                (sb_id,),
            )
            row = await cur.fetchone()
            if not row:
                return [], []

            novel_id = row["novel_id"]
            try:
                char_names = _json.loads(row["characters"] or "[]")
            except Exception:
                char_names = []
            try:
                scene_names = _json.loads(row["scenes"] or "[]")
            except Exception:
                scene_names = []
            try:
                prop_names = _json.loads(row["props"] or "[]")
            except Exception:
                prop_names = []

            # 拉对应元素的图/音频
            for name_list, etype in [
                (char_names, "character"),
                (scene_names, "scene"),
                (prop_names, "prop"),
            ]:
                for name in name_list:
                    if not name:
                        continue
                    # v3.61.158:加 id / element_type / active_variant_id,给 helper 用
                    cur = await db.execute(
                        """SELECT id, element_type, finished_image, image_url, grid_image,
                               reference_image, audio_file, description,
                               image_prompt, image_status,
                               volc_asset_id, volc_asset_uri, volc_asset_status, volc_asset_group_id,
                               active_variant_id
                        FROM extracted_elements
                        WHERE novel_id = ? AND element_type = ? AND name = ?
                        LIMIT 1""",
                        (novel_id, etype, name),
                    )
                    el = await cur.fetchone()
                    if not el:
                        continue
                    # v3.61.158:人物走 active variant fallback(字段级 merge)
                    el_dict = dict(el)
                    if etype == "character":
                        from services.extraction_service import ExtractionService as _ES
                        el_dict = await _ES.resolve_active_character_asset(el_dict)
                    img = (
                        el_dict.get("finished_image")
                        or el_dict.get("image_url")
                        or el_dict.get("grid_image")
                        or el_dict.get("reference_image")
                    )
                    if img and img not in images:
                        images.append(img)
                    if etype == "character" and el_dict.get("audio_file"):
                        if el_dict["audio_file"] not in audios:
                            audios.append(el_dict["audio_file"])

            # extra_reference_image / 串行尾帧
            if row["extra_reference_image"]:
                if row["extra_reference_image"] not in images:
                    images.append(row["extra_reference_image"])
        finally:
            await db.close()

        # 上限:9 图 + 3 音频
        return images[:9], audios[:3]

    async def _wait_for_jimeng_capacity(
        self,
        item: Dict[str, Any],
        abort_event: asyncio.Event,
        check_interval: float = 5.0,
    ):
        """v3.60.17: 提交前主动等即梦那边有空位

        调 dreamina list_tasks,看当前 status='processing' 任务数;
        如果 >= max_concurrent 就等,直到有空位再返回。
        v3.61.257(codex P1):取消"最多等 10 分钟后硬放行"——硬放行会突破即梦并发、白扣额度。
          现在只在以下情况返回:有空位 / abort_event 触发 / list_tasks 查询失败(兜底)。
          幽灵任务即梦无法取消但会自然跑完,届时释放配额。
        """
        from services.video_service import VideoService
        vs = VideoService()
        # 普通账号严格 1, VIP 可放宽到 2 (后续可从 params 读)
        max_concurrent = 1
        warned = False
        waited = 0.0
        # v3.61.257 codex P1:即梦确认仍满额时**不再**等够固定时长后硬放行 —— 硬放行会突破
        #   即梦并发(尤其是已中断但即梦无法取消的幽灵任务仍在 processing 时),白扣 VIP 额度。
        #   改为:即梦确认满额就持续等(abort 可随时跳出;幽灵任务即梦会自然跑完届时释放配额);
        #   只有 list_tasks **查询失败**时才兜底放行(交给后续 1310 重试)。
        while True:
            if abort_event.is_set():
                return
            try:
                res = await vs.list_tasks(status="processing")
                tasks = (res.get("data") or {}).get("tasks") or []
                raw_count = len(tasks) if isinstance(tasks, list) else 0
                # v3.61.80: 本地终态兜底
                # 即梦的 list_tasks 偶尔会有 stale entry(我们这边 storyboard 已 done/失败,
                # 但即梦那边几十秒~几分钟没把它移出 processing),导致下一个 sb 一直拿不到空位
                # 解决:拿 list_tasks 里的 submit_id 去 storyboards 表对一遍,本地终态的直接扣掉
                active_count = await self._discount_stale_jimeng_tasks(tasks, raw_count)
            except Exception as e:
                # 查询失败才兜底放行(让后续 1310 重试兜住),否则会卡死整条小说队列
                logger.debug(f"[queue_worker] list_tasks 查容量失败,兜底放行: {e}")
                return
            if active_count < max_concurrent:
                if warned:
                    logger.info(
                        f"[queue_worker] 任务 {item['id']} 即梦释放配额,继续提交"
                    )
                return
            if not warned:
                logger.info(
                    f"[queue_worker] 任务 {item['id']} 即梦端有 {active_count} 个任务在跑,"
                    f"等待空位(含可能的已中断幽灵任务,即梦无法取消、会自然跑完)..."
                )
                warned = True
            try:
                await asyncio.wait_for(abort_event.wait(), timeout=check_interval)
                return  # abort
            except asyncio.TimeoutError:
                waited += check_interval
                # 每 ~2 分钟提醒一次仍在等(不放行)
                if waited % 120 < check_interval:
                    logger.warning(
                        f"[queue_worker] 任务 {item['id']} 已等即梦释放配额 {int(waited)}s,"
                        f"即梦端仍有 {active_count} 个在跑,继续等(不硬放行以免并发突破)"
                    )

    async def _discount_stale_jimeng_tasks(self, tasks, raw_count: int) -> int:
        """v3.61.80: 用本地 storyboards 终态扣减即梦 stale 的 processing 计数

        - 即梦 list_tasks 返回 processing 列表
        - 拿这些 submit_id 去 storyboards 表查 video_status
        - 只有"能证明即梦远端已经完成"的本地状态才扣减(done/completed/success/download_failed)
        - 返回真正还在跑的数量
        """
        if not isinstance(tasks, list) or raw_count == 0:
            return 0
        submit_ids = []
        for t in tasks:
            if not isinstance(t, dict):
                continue
            sid = t.get("submit_id") or t.get("id")
            if sid:
                submit_ids.append(str(sid))
        if not submit_ids:
            return raw_count
        try:
            from database.db import get_db
            placeholders = ",".join("?" * len(submit_ids))
            db = await get_db()
            try:
                cur = await db.execute(
                    f"SELECT submit_id, video_status FROM storyboards "
                    f"WHERE submit_id IN ({placeholders})",
                    submit_ids,
                )
                rows = await cur.fetchall()
            finally:
                await db.close()
        except Exception as e:
            logger.debug(f"[queue_worker] 本地 storyboards 终态扣减查询失败,按即梦原始计数: {e}")
            return raw_count
        # v3.61.257 codex P1:扣减集合只能含"远端确实已完成"的状态。
        #   download_failed = 即梦上游成功、仅本地下载失败 → 远端已释放,可扣。
        #   ⛔ chain_aborted(本地中断,即梦无法取消、后台仍在跑)和 failed(可能是本地超时/本地失败,
        #      即梦远端可能仍在 processing)都不能扣 —— 否则幽灵任务不占槽,会放行下一个导致即梦并发突破、白扣额度。
        terminal = {"done", "completed", "success", "download_failed"}
        stale = 0
        for r in rows:
            try:
                st = (r["video_status"] or "").lower()
            except Exception:
                st = ""
            if st in terminal:
                stale += 1
        if stale > 0:
            logger.info(
                f"[queue_worker] 即梦 list_tasks 返回 {raw_count} 个 processing,"
                f"其中 {stale} 个本地已终态(stale),实际占用 {raw_count - stale}"
            )
        return max(0, raw_count - stale)

    async def _wait_storyboard_settled(
        self,
        storyboard_id: int,
        abort_event: asyncio.Event,
        timeout_seconds: int = 3600,
        poll_interval: float = 8.0,
    ) -> Optional[str]:
        """轮询 storyboard.video_status 直到进入终态

        关键: 每轮主动调 poll_video_status 推进生成状态(查即梦 + 下载)
              否则 storyboard 会一直卡在 generating

        终态: done / failed / chain_aborted

        返回:
        - 'done' / 'failed' / 'chain_aborted': 终态字符串
        - 'aborted': abort_event 被触发
        - None: 超时
        """
        from database.db import get_db
        import time

        deadline = time.time() + timeout_seconds
        # v3.61.153 codex P1:download_failed 是终态,worker 应当返回不再继续等
        # 否则上游已生成成功(只下载失败)的镜会被卡到 5h 超时再覆盖成 failed
        terminal = ("done", "failed", "chain_aborted", "download_failed")

        # 延迟 import 避免循环依赖
        from api.video import poll_video_status as _poll_endpoint
        from api.video import PollStatusRequest as _PollReq

        while time.time() < deadline:
            if abort_event.is_set():
                return "aborted"

            # 1. 先读当前状态
            try:
                db = await get_db()
                try:
                    cur = await db.execute(
                        "SELECT video_status FROM storyboards WHERE id = ?",
                        (storyboard_id,),
                    )
                    row = await cur.fetchone()
                finally:
                    await db.close()
            except Exception as e:
                logger.warning(f"[queue_worker] 查 storyboard 状态失败 sb_id={storyboard_id}: {e}")
                await asyncio.sleep(poll_interval)
                continue

            if not row:
                return "failed"

            status = (row["video_status"] or "").lower()
            if status in terminal:
                return status

            # 2. 调 poll_video_status 推进生成 (查即梦 + 下载已完成的视频)
            try:
                await _poll_endpoint(_PollReq(storyboard_ids=[storyboard_id]))
            except Exception as e:
                logger.warning(f"[queue_worker] poll-status 推进失败 sb_id={storyboard_id}: {e}")

            # 3. 等下一轮 (期间能被 abort 立刻打断)
            try:
                await asyncio.wait_for(abort_event.wait(), timeout=poll_interval)
                return "aborted"
            except asyncio.TimeoutError:
                pass

        # 超时
        return None

    async def _load_runtime_params(self, item: Dict[str, Any]):
        """实时读最新 prompt + params(允许用户在等待中修改)"""
        from database.db import get_db
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT prompt FROM storyboards WHERE id = ?",
                (item["storyboard_id"],),
            )
            row = await cur.fetchone()
            prompt = (row["prompt"] if row else "") or item.get("prompt_snapshot") or ""
        finally:
            await db.close()
        return prompt, item.get("params"), item.get("video_config_id")

    async def _sync_storyboard_to_queue(self, item: Dict[str, Any]):
        """generation 完成后,从 storyboards 把结果同步回 queue 行"""
        from database.db import get_db
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT video_status, video_url, last_frame_path, video_fail_reason "
                "FROM storyboards WHERE id = ?",
                (item["storyboard_id"],),
            )
            row = await cur.fetchone()
            if not row:
                await queue_service.mark_failed(
                    item["id"], ERR_UNKNOWN, "storyboard 已被删除"
                )
                return
        finally:
            await db.close()

        sb_status = (row["video_status"] or "").lower()
        if sb_status == "done":
            await queue_service.mark_done(
                item["id"],
                row["video_url"] or "",
                row["last_frame_path"],
            )
        elif sb_status == "download_failed":
            # v3.61.153 codex P1:download_failed 单独分流,保留 DOWNLOAD_FAILED 错误码,
            # 不能走 _handle_failure 进自动重试(那是给生成失败的);
            # 用户在 UI 上手动点重试下载即可
            err_msg = row["video_fail_reason"] or "本地下载失败,请重试下载"
            await queue_service.mark_download_failed(
                item["id"], row["video_url"] or "", err_msg,
            )
        elif sb_status in ("failed", "chain_aborted"):
            err_msg = row["video_fail_reason"] or "生成失败"
            err_code, _ = _classify_error(err_msg)
            await self._handle_failure(item, err_code, err_msg)
        else:
            # 不期望:storyboard 没进终态,标 failed 兜底
            await queue_service.mark_failed(
                item["id"], ERR_UNKNOWN,
                f"未知 storyboard 状态: {sb_status}"
            )

    # v3.61.x: 按错误码分级的自动重试上限(即梦上传/网络抖动需要多试几次)
    _RETRY_LIMITS = {ERR_NETWORK: 3, ERR_TIMEOUT: 2, ERR_TRUNCATED: 1}
    _RETRY_BACKOFF = (5, 15, 30)  # 第 1/2/3 次重试前的退避秒数

    async def _handle_failure(self, item: Dict[str, Any], err_code: str, err_msg: str):
        """失败时:可重试(按错误码分级 + 退避)就重新入队,否则标 failed"""
        max_retries = self._RETRY_LIMITS.get(err_code, 0)
        retry_count = item.get("retry_count", 0)  # 本次失败前已重试的次数
        if max_retries and retry_count < max_retries:
            delay = self._RETRY_BACKOFF[min(retry_count, len(self._RETRY_BACKOFF) - 1)]
            logger.info(
                f"[queue_worker] 自动重试 上传/网络瞬时失败 item={item['id']} "
                f"retry={retry_count + 1}/{max_retries} code={err_code} "
                f"reason={(err_msg or '')[:80]} 退避{delay}s"
            )
            try:
                await asyncio.sleep(delay)
            except Exception:
                pass
            # increment_retry 只认 failed/aborted;此刻队列项还是 generating,
            # 必须先 mark_failed 再 increment_retry 才能真正重新入队
            await queue_service.mark_failed(item["id"], err_code, err_msg)
            new_count = await queue_service.increment_retry(item["id"])
            if new_count < 0:
                logger.warning(
                    f"[queue_worker] item={item['id']} 重新入队失败"
                    f"(状态非 failed/aborted),已留在 failed"
                )
        else:
            await queue_service.mark_failed(item["id"], err_code, err_msg)
            # 余额不足:全队停摆并告警
            if err_code == ERR_BALANCE:
                logger.error("[queue_worker] 即梦余额不足,需用户处理")
                await event_bus.publish(
                    "queue.alert",
                    {"code": ERR_BALANCE, "message": "即梦余额不足,队列已暂停"},
                )

    # ------------- 中断 -------------
    async def abort(self, item_id: int, reason: str = "用户中断"):
        """中断单条任务

        - queued: 直接标 aborted
        - generating: 触发 abort 信号 + 标 aborted(注意即梦点可能已扣)
        """
        item = await queue_service.get_by_id(item_id)
        if not item:
            return False
        # codex P1:只要任务已在内存执行流里(可能正卡在 _wait_for_jimeng_capacity 等容量,
        #   而 DB 行此时仍是 queued),就必须先 set abort_event。否则容量释放后会照常
        #   mark_generating + 提交,变成一个无法追踪的新即梦幽灵任务。
        #   abort_event 只在 _execute 进入后才创建,其存在本身≈该 item 在 _running 里。
        ev = self._abort_events.get(item_id)
        if ev and item_id in self._running:
            ev.set()
        if item["status"] == STATUS_QUEUED:
            # 若它正在容量等待(in _running),上面已 set event,_execute 会自行收尾标 aborted;
            # 这里再 mark_aborted 一次是幂等的(非 ACTIVE 状态会被忽略),也覆盖纯排队未派单的情况。
            await queue_service.mark_aborted(item_id, reason)
            await self._publish_update(item_id)
            return True
        if item["status"] == STATUS_GENERATING:
            # ev 已在上面按 _running 条件 set 过
            # 不立即标 aborted,等执行流自己结束(避免和 mark_done 冲突)
            # 但如果这条 generating 是从崩溃恢复来的(没有 _running 记录),要主动标
            if item_id not in self._running:
                await queue_service.mark_aborted(item_id, reason)
                await self._publish_update(item_id)
            return True
        return False

    async def abort_all_active(self, novel_id: Optional[int] = None) -> int:
        """中断所有 active(queued+generating)项"""
        items = await queue_service.list_items(
            novel_id=novel_id, statuses=[STATUS_QUEUED, STATUS_GENERATING]
        )
        count = 0
        for item in items:
            if await self.abort(item["id"], "批量中断"):
                count += 1
        return count

    # ------------- SSE 推送 -------------
    async def _publish_update(self, item_id: int):
        try:
            item = await queue_service.get_by_id(item_id)
            if item:
                await event_bus.publish("queue.update", item)
            # 同时推 summary + lock-status
            summary = await queue_service.get_summary()
            await event_bus.publish("queue.summary", summary)
            lock = await queue_service.get_lock_status()
            await event_bus.publish("queue.lock", lock)
        except Exception as e:
            logger.warning(f"[queue_worker] 发 SSE 失败: {e}")


# ===================== 错误分类 =====================
def _classify_error(msg: str) -> tuple:
    """根据错误文本归类错误码"""
    if not msg:
        return ERR_UNKNOWN, "未知错误"
    m = msg.lower()
    # v3.61.x: 本地文件问题不重试(重试也没用)— 必须放在 upload/network 之前,
    # 避免 "cannot open xxx.png: ..." 这类被误判成网络重试
    if ("no such file" in m or "file not found" in m or "cannot open" in m
            or "系统找不到" in msg or "the system cannot find the file" in m):
        return ERR_UNKNOWN, msg
    # v3.60.11: 并发上限是 retryable,等已跑的完成再发就行
    if "1310" in msg or "exceedconcurrencylimit" in m or "concurrency" in m or "并发" in msg:
        return ERR_NETWORK, msg  # 复用 NETWORK 这个 retryable 码
    if "余额" in msg or "insufficient" in m or "balance" in m:
        return ERR_BALANCE, msg
    if "审核" in msg or "敏感" in msg or "rejected" in m or "reject" in m:
        return ERR_REVIEW, msg
    # v3.61.x: 即梦上传/网络瞬时失败 → 归 NETWORK(可重试)。
    # 放在「审核」之后,确保含 upload 字样的审核拦截仍走 REVIEW、不重试。
    _upload_net_keys = (
        "no file upload", "upload phase", "apply phase", "commit phase",
        "applyimageupload", "commitimageupload",
        "no such host", "dial tcp", "lookup ", "connection reset",
        "broken pipe", "eof", "i/o timeout",
        "bad gateway", "gateway time-out", "gateway timeout", "http status=50",
        "deadline exceeded", "context deadline", "201007",
    )
    if any(_k in m for _k in _upload_net_keys):
        return ERR_NETWORK, msg
    if "timeout" in m or "超时" in msg:
        return ERR_TIMEOUT, msg
    if "network" in m or "连接" in msg or "网络" in msg:
        return ERR_NETWORK, msg
    if "truncate" in m or "截断" in msg or "不完整" in msg:
        return ERR_TRUNCATED, msg
    if "rate limit" in m or "too many" in m or "限流" in msg:
        return ERR_NETWORK, msg
    return ERR_UNKNOWN, msg


# ===================== 单例 =====================
_worker_instance: Optional[QueueWorker] = None


def get_worker() -> QueueWorker:
    global _worker_instance
    if _worker_instance is None:
        _worker_instance = QueueWorker(max_concurrent=3)
    return _worker_instance


async def start_worker():
    w = get_worker()
    await w.start()


async def stop_worker():
    global _worker_instance
    if _worker_instance is not None:
        await _worker_instance.stop()
        _worker_instance = None
