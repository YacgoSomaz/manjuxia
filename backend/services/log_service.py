import asyncio
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from database.db import get_db
from fastapi import HTTPException
from utils.timezone import now_beijing_str, now_beijing


# 需要冲突检查的 task_type 及其中文名
CHECKED_TASK_TYPES = {
    "novel_rewrite": "小说洗稿",
    "script_convert": "剧本转换",
    "script_to_novel": "剧本转小说",
}


# v3.61.183: 视频提交日志可能含 base64 data URL(xinglian images/audios 数组)
#   provider 内部已经 sanitize 一次,这里是 LogService 入库前的最终防线(codex 要求"双保险")
#   策略:>200 字符的 `data:xxx;base64,...` 字符串 → 替换 `<data:xxx base64 len=N>` 占位
_DATA_URL_RE = re.compile(
    r'data:([a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+)(?:;[^,]*)?,([A-Za-z0-9+/=_-]{200,})',
)


def _sanitize_base64_in_string(s: str) -> str:
    """字符串内若含 base64 data URL,替换成 `<data:image/jpeg base64 len=N>` 占位"""
    if not s or 'data:' not in s:
        return s
    def _sub(m: re.Match) -> str:
        media = m.group(1)
        body_len = len(m.group(2))
        return f"<data:{media} base64 len={body_len}>"
    return _DATA_URL_RE.sub(_sub, s)


def _sanitize_base64_recursive(obj: Any) -> Any:
    """递归扫 dict / list / str,所有 base64 data URL 都替换成占位"""
    if isinstance(obj, dict):
        return {k: _sanitize_base64_recursive(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_base64_recursive(v) for v in obj]
    if isinstance(obj, str):
        return _sanitize_base64_in_string(obj)
    return obj


async def check_novel_running(novel_id: int, db) -> None:
    """检查小说是否有特定类型的运行中任务"""
    placeholders = ",".join(["?" for _ in CHECKED_TASK_TYPES])
    cursor = await db.execute(
        f"SELECT task_type, chapter_title FROM llm_logs WHERE novel_id = ? AND status = 'running' AND task_type IN ({placeholders}) LIMIT 1",
        (novel_id, *CHECKED_TASK_TYPES.keys())
    )
    running = await cursor.fetchone()
    if running:
        task_type = running["task_type"] or "未知"
        chapter = running["chapter_title"] or ""
        label = CHECKED_TASK_TYPES.get(task_type, task_type)
        detail = f"「{label}」功能正在执行中"
        if chapter:
            detail += f"（{chapter}）"
        detail += "，请等待完成或在日志页面中断后再操作"
        raise HTTPException(status_code=409, detail=detail)


class LogService:
    """大模型调用日志服务"""

    @staticmethod
    async def create_log(
        task_type: str,
        model: str,
        config_name: str,
        base_url: str,
        input_prompt: Any,
        provider_code: str = "",
        novel_id: Optional[int] = None,
        chapter_title: Optional[str] = None,
        source_id: Optional[int] = None,
        source_type: Optional[str] = None,
        source_scene_index: Optional[int] = None
    ) -> int:
        """创建日志记录，返回log_id"""
        db = await get_db()
        try:
            # 将 input_prompt 转换为 JSON 字符串（截断base64图片数据避免数据库膨胀）
            if isinstance(input_prompt, (list, dict)):
                import copy
                safe_prompt = copy.deepcopy(input_prompt)
                # 截断多模态消息中的base64图片数据(OpenAI multimodal 标准结构)
                if isinstance(safe_prompt, list):
                    for msg in safe_prompt:
                        if isinstance(msg, dict) and isinstance(msg.get("content"), list):
                            for item in msg["content"]:
                                if (isinstance(item, dict) and
                                    item.get("type") == "image_url" and
                                    isinstance(item.get("image_url"), dict)):
                                    url = item["image_url"].get("url", "")
                                    if url.startswith("data:"):
                                        item["image_url"]["url"] = f"[base64图片数据已截断, 原始长度={len(url)}字符]"
                # v3.61.183: 递归扫所有 `data:...;base64,...` 字符串(任意嵌套位置)双保险
                #   覆盖 xinglian 视频提交的 `images: ["data:image/png;base64,..."]` flat 数组,
                #   provider 内部 sanitize 是第一道,LogService 这里是最终防线
                safe_prompt = _sanitize_base64_recursive(safe_prompt)
                input_prompt_str = json.dumps(safe_prompt, ensure_ascii=False)
            else:
                # 字符串也走一次正则,处理 data URL 嵌在长文本里的边角情况
                input_prompt_str = _sanitize_base64_in_string(str(input_prompt))

            # v3.61.67: 防破解 — input_prompt 入库前脱敏,避免拷 sqlite 拿到完整 prompt 模板
            #   策略:长 prompt 只保留前 300 字 + 后 300 字,中间打 [脱敏 N 字]
            #   调试模式(env QIANSHAN_LOG_DEBUG=1 或 settings.data.log_debug_mode)不脱敏
            try:
                from utils.log_sanitizer import sanitize_for_log
                input_prompt_str = sanitize_for_log(input_prompt_str, head=300, tail=300, min_len=800)
            except Exception:
                # sanitizer 自己挂了不影响主流程
                pass

            start_time = now_beijing_str()

            created_at = now_beijing_str()

            cursor = await db.execute(
                """
                INSERT INTO llm_logs 
                (task_type, model, config_name, provider_code, base_url, input_prompt, status, start_time, novel_id, chapter_title, source_id, source_type, source_scene_index, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (task_type, model, config_name, provider_code or "", base_url, input_prompt_str, 'running', start_time, novel_id, chapter_title, source_id, source_type, source_scene_index, created_at)
            )
            await db.commit()
            return cursor.lastrowid
        except Exception as e:
            # 日志写入失败不影响主流程
            print(f"[WARN] 创建日志记录失败: {e}")
            return -1
        finally:
            await db.close()

    @staticmethod
    async def update_log_success(
        log_id: int,
        output_content: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        total_tokens: int = 0
    ):
        """更新日志为成功状态"""
        if not log_id or log_id <= 0:
            return

        db = await get_db()
        try:
            end_time = now_beijing_str()

            # 先获取开始时间计算耗时
            async with db.execute(
                "SELECT start_time FROM llm_logs WHERE id = ?", (log_id,)
            ) as cursor:
                row = await cursor.fetchone()
                duration_seconds = 0
                if row:
                    try:
                        start_time_str = row["start_time"]
                        start_time = datetime.strptime(start_time_str[:19], '%Y-%m-%d %H:%M:%S')
                        end_time_dt = datetime.strptime(end_time[:19], '%Y-%m-%d %H:%M:%S')
                        duration_seconds = round((end_time_dt - start_time).total_seconds(), 2)
                    except:
                        pass

            await db.execute(
                """
                UPDATE llm_logs 
                SET output_content = ?, input_tokens = ?, output_tokens = ?, total_tokens = ?,
                    status = ?, end_time = ?, duration_seconds = ?
                WHERE id = ?
                """,
                (output_content, input_tokens, output_tokens, total_tokens, 'success', end_time, duration_seconds, log_id)
            )
            await db.commit()
            try:
                from services.usage_report_service import UsageReportService
                queued = await UsageReportService.enqueue_log_success(log_id)
                if queued:
                    asyncio.create_task(UsageReportService.process_pending(limit=5))
            except Exception:
                pass
        except Exception as e:
            # 日志更新失败不影响主流程
            print(f"[WARN] 更新日志记录失败: {e}")
        finally:
            await db.close()

    @staticmethod
    async def update_log_remote_url(log_id: int, remote_url: str):
        """立即持久化服务商返回的图片URL(下载前)

        即使后续下载失败,URL也保留在数据库里(2小时内可重试)
        """
        if not log_id or log_id <= 0 or not remote_url:
            return
        db = await get_db()
        try:
            await db.execute(
                "UPDATE llm_logs SET remote_url = ? WHERE id = ?",
                (remote_url, log_id)
            )
            await db.commit()
        except Exception as e:
            print(f"[WARN] 持久化 remote_url 失败: {e}")
        finally:
            await db.close()

    @staticmethod
    async def mark_stale_running_as_error(threshold_minutes: int = 10) -> int:
        """将超过阈值仍为 running 状态的僵尸任务标记为 error

        用于应用启动时清理上次异常关闭留下的遗留任务
        """
        db = await get_db()
        try:
            now = now_beijing_str()
            # SQLite 的 datetime() 函数用 '-N minutes' 做时间比较
            cursor = await db.execute(
                f"""UPDATE llm_logs
                    SET status = 'error',
                        error_message = COALESCE(error_message, '') || '任务中断(可能服务商已扣费,请对账)',
                        end_time = ?
                    WHERE status = 'running'
                      AND datetime(start_time) < datetime('now', '+8 hours', '-{int(threshold_minutes)} minutes')""",
                (now,)
            )
            await db.commit()
            count = cursor.rowcount
            if count > 0:
                print(f"[LOG] 启动清理: {count} 条僵尸 running 任务已标记为 error")
            return count
        except Exception as e:
            print(f"[WARN] 僵尸任务清理失败: {e}")
            return 0
        finally:
            await db.close()

    @staticmethod
    async def update_log_error(log_id: int, error_message: str):
        """更新日志为错误状态"""
        if not log_id or log_id <= 0:
            return

        db = await get_db()
        try:
            end_time = now_beijing_str()

            # 先获取开始时间计算耗时
            async with db.execute(
                "SELECT start_time FROM llm_logs WHERE id = ?", (log_id,)
            ) as cursor:
                row = await cursor.fetchone()
                duration_seconds = 0
                if row:
                    try:
                        start_time_str = row["start_time"]
                        start_time = datetime.strptime(start_time_str[:19], '%Y-%m-%d %H:%M:%S')
                        end_time_dt = datetime.strptime(end_time[:19], '%Y-%m-%d %H:%M:%S')
                        duration_seconds = round((end_time_dt - start_time).total_seconds(), 2)
                    except:
                        pass

            await db.execute(
                """
                UPDATE llm_logs 
                SET error_message = ?, status = ?, end_time = ?, duration_seconds = ?
                WHERE id = ?
                """,
                (error_message, 'error', end_time, duration_seconds, log_id)
            )
            await db.commit()
        except Exception as e:
            # 日志更新失败不影响主流程
            print(f"[WARN] 更新日志记录失败: {e}")
        finally:
            await db.close()

    @staticmethod
    async def mark_superseded_image_logs() -> int:
        """????????????????? running ?????? error."""
        db = await get_db()
        try:
            end_time = now_beijing_str()
            cursor = await db.execute(
                """
                UPDATE llm_logs AS old
                SET status = 'error',
                    error_message = '?????????????,??????????',
                    end_time = ?
                WHERE old.task_type = 'image_generation'
                  AND old.status = 'running'
                  AND old.chapter_title IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM llm_logs AS newer
                    WHERE newer.task_type = old.task_type
                      AND newer.chapter_title = old.chapter_title
                      AND newer.id > old.id
                      AND newer.status IN ('success', 'error')
                  )
                """,
                (end_time,)
            )
            await db.commit()
            return cursor.rowcount if hasattr(cursor, "rowcount") else 0
        except Exception as e:
            print(f"[WARN] ????????????????: {e}")
            return 0
        finally:
            await db.close()

    @staticmethod
    async def get_logs(
        page: int = 1,
        page_size: int = 50,
        task_type: Optional[str] = None,
        status: Optional[str] = None,
        novel_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """获取日志列表（分页，可按任务类型/状态/小说ID筛选）"""
        db = await get_db()
        try:
            # 计算偏移量
            offset = (page - 1) * page_size

            # 构建查询条件
            conditions = []
            params = []
            if task_type:
                conditions.append("task_type = ?")
                params.append(task_type)
            if status:
                conditions.append("status = ?")
                params.append(status)
            if novel_id is not None:
                conditions.append("novel_id = ?")
                params.append(novel_id)
            where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

            # 获取总数
            count_sql = f"SELECT COUNT(*) as total FROM llm_logs {where_clause}"
            async with db.execute(count_sql, params) as cursor:
                row = await cursor.fetchone()
                total = row["total"] if row else 0

            # 获取分页数据
            query_sql = f"""
                SELECT id, task_type, model, config_name, base_url,
                       input_tokens, output_tokens, total_tokens,
                       status, error_message, start_time, end_time, duration_seconds,
                       novel_id, chapter_title, remote_url, created_at
                FROM llm_logs
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """
            query_params = params + [page_size, offset]

            async with db.execute(query_sql, query_params) as cursor:
                rows = await cursor.fetchall()
                logs = [dict(row) for row in rows]

            return {
                "logs": logs,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }
        finally:
            await db.close()

    @staticmethod
    async def get_log_detail(log_id: int) -> Optional[Dict[str, Any]]:
        """获取日志详情"""
        db = await get_db()
        try:
            async with db.execute(
                "SELECT * FROM llm_logs WHERE id = ?", (log_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
                return None
        finally:
            await db.close()

    @staticmethod
    async def delete_logs(log_ids: Optional[List[int]] = None, before_date: Optional[str] = None) -> int:
        """删除日志，返回删除数量"""
        db = await get_db()
        try:
            if log_ids:
                # 按ID列表删除
                placeholders = ",".join(["?" for _ in log_ids])
                cursor = await db.execute(
                    f"DELETE FROM llm_logs WHERE id IN ({placeholders})",
                    log_ids
                )
            elif before_date:
                # 按日期删除（删除指定日期之前的日志）
                cursor = await db.execute(
                    "DELETE FROM llm_logs WHERE created_at < ?",
                    (before_date,)
                )
            else:
                return 0

            await db.commit()
            return cursor.rowcount
        finally:
            await db.close()

    @staticmethod
    async def cleanup_old_logs():
        """清理过期日志，只保留当天和昨天的"""
        # 计算前天的开始时间（即昨天 00:00:00）
        today = now_beijing().replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today - timedelta(days=1)
        cutoff = yesterday_start.strftime('%Y-%m-%d %H:%M:%S')

        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT COUNT(*) FROM llm_logs WHERE created_at < ?", (cutoff,)
            )
            row = await cursor.fetchone()
            count = row[0] if row else 0

            if count > 0:
                await db.execute("DELETE FROM llm_logs WHERE created_at < ?", (cutoff,))
                await db.commit()
                print(f"[LOG CLEANUP] 清理了 {count} 条过期日志（保留 {cutoff} 之后的）")
            else:
                print(f"[LOG CLEANUP] 无过期日志需要清理")
        finally:
            await db.close()
