"""Team usage reporting for successful local team-project llm_logs.

The cloud side owns billing/monitoring.  The desktop app only reports a
successful team project task once with a stable idempotency key.
"""
import json
import logging
from typing import Any, Dict, Optional

import httpx

from database.db import get_db
from services import cloud_token_service as cloud_token
from services import team_context_service as team_ctx
from utils.timezone import now_beijing_str

logger = logging.getLogger(__name__)


_LLM_TASK_TYPES = {
    "storyboard_generate",
    "state_extract",
    "script_convert",
    "script_to_novel",
    "novel_rewrite",
    "novel_creation",
    "novel_post_process",
    "novel_outline",
    "extraction",
    "grid_image_prompt",
}

_IMAGE_TASK_TYPES = {"image_generation", "fusion_image"}


def _safe_json_loads(value: Any) -> Optional[Dict[str, Any]]:
    if not value:
        return None
    if isinstance(value, dict):
        return value
    if not isinstance(value, str):
        return None
    try:
        data = json.loads(value)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _find_provider_code(obj: Any) -> str:
    """Best-effort providerCode extraction from logged payloads.

    New logs persist llm_logs.provider_code directly.  This is only a fallback
    for old queued logs or provider-specific payload summaries.
    """
    if isinstance(obj, dict):
        for key in ("providerCode", "provider_code", "provider"):
            val = obj.get(key)
            if isinstance(val, str) and val.strip():
                provider = val.strip()
                if provider in ("jimeng", "dreamina"):
                    return "seedance"
                return provider
        for val in obj.values():
            found = _find_provider_code(val)
            if found:
                return found
    elif isinstance(obj, list):
        for val in obj:
            found = _find_provider_code(val)
            if found:
                return found
    return ""


def _infer_provider_code(log: Dict[str, Any], input_obj: Optional[Dict[str, Any]], output_obj: Optional[Dict[str, Any]]) -> str:
    direct = (log.get("provider_code") or "").strip()
    if direct:
        return direct

    found = _find_provider_code(input_obj) or _find_provider_code(output_obj)
    if found:
        return found

    base = (log.get("base_url") or "").lower()
    name = (log.get("config_name") or "").lower()
    model = (log.get("model") or "").lower()
    hay = f"{base} {name} {model}"
    if (log.get("task_type") or "") == "video_generation" and ("seedance" in hay or "即梦" in name or not base):
        return "seedance"
    if "mooko" in hay or "kkone" in hay or "kkai" in hay:
        return "mooko"
    if "mjapi" in hay or "cool" in hay:
        return "cool"
    if "xinglian" in hay or "星链" in name:
        return "xinglian"
    if "lingya" in hay:
        return "lingya"
    if "bltcy" in hay or "柏拉图" in name:
        return "bltcy"
    if "geek" in hay:
        return "geek"
    if "wuyinkeji" in hay or "速创" in name:
        return "wuyinkeji"
    if "volc" in hay or "ark" in hay or "火山" in name:
        return "volcengine_ark"
    return ""


def _usage_event_type(task_type: str) -> Optional[tuple[str, str]]:
    # v3.61.241: 云端用量接口 taskType 枚举改为 llm / image / video
    # (云端按 providerCode + model 匹配价格;LLM 按 token、image 按次、video 按秒)
    if task_type == "video_generation":
        return "video", "video"
    if task_type in _IMAGE_TASK_TYPES:
        return "image", "image"
    # v3.61.241: 收窄白名单 — 只有确属 LLM 的 task_type 才上报,避免未来新增的
    # 非 LLM 本地任务(或 'test' 等)被误算成团队 LLM 用量
    if task_type in _LLM_TASK_TYPES:
        return "llm", "llm"
    return None


def _extract_image_count(log: Dict[str, Any], output_obj: Optional[Dict[str, Any]]) -> int:
    task_type = log.get("task_type") or ""
    if task_type not in _IMAGE_TASK_TYPES:
        return 0
    if output_obj:
        for key in ("imageCount", "image_count", "images_count"):
            try:
                val = int(output_obj.get(key) or 0)
                if val > 0:
                    return val
            except Exception:
                pass
    return 1


def _extract_video_duration(log: Dict[str, Any], output_obj: Optional[Dict[str, Any]]) -> Optional[float]:
    if (log.get("task_type") or "") != "video_generation":
        return None
    if output_obj:
        for key in ("video_duration_seconds", "durationSeconds", "duration_seconds"):
            try:
                val = float(output_obj.get(key) or 0)
                if val > 0:
                    return val
            except Exception:
                pass
    # v3.61.232+: video finalization stores the requested section duration in total_tokens
    # for local display compatibility.  Use it only as a usage fallback.
    try:
        val = float(log.get("total_tokens") or 0)
        if val > 0:
            return val
    except Exception:
        pass
    return None


class UsageReportService:
    @staticmethod
    async def _ensure_queue_table(db) -> None:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS usage_report_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER,
                log_id INTEGER NOT NULL UNIQUE,
                status TEXT NOT NULL DEFAULT 'pending',
                attempts INTEGER NOT NULL DEFAULT 0,
                last_error TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
        try:
            async with db.execute("PRAGMA table_info(usage_report_queue)") as cursor:
                cols = {r["name"] for r in await cursor.fetchall()}
            if "team_id" not in cols:
                await db.execute("ALTER TABLE usage_report_queue ADD COLUMN team_id INTEGER")
        except Exception:
            pass

    @staticmethod
    async def _get_team_usage_context(db, log_id: int, team_id: int) -> Optional[Dict[str, Any]]:
        """Return context only when the log belongs to the current team workspace.

        Team login state alone is not enough: users can work on personal novels
        while a team identity is active. Only current-team synced scripts/assets
        are allowed to call the team usage API.
        """
        try:
            async with db.execute(
                "SELECT novel_id, source_id, source_type FROM llm_logs WHERE id = ?",
                (log_id,),
            ) as cursor:
                log_row = await cursor.fetchone()
            if not log_row:
                return None
            novel_id = log_row["novel_id"]
            if not novel_id:
                return None

            async with db.execute("PRAGMA table_info(novels)") as cursor:
                novel_cols = {r["name"] for r in await cursor.fetchall()}
            if "remote_team_id" not in novel_cols:
                return None

            async with db.execute(
                "SELECT source_type, mode, remote_team_id, remote_project_id FROM novels WHERE id = ?",
                (novel_id,),
            ) as cursor:
                novel_row = await cursor.fetchone()
            if not novel_row:
                return None

            source_type = novel_row["source_type"] if "source_type" in novel_row.keys() else ""
            mode = novel_row["mode"] if "mode" in novel_row.keys() else ""
            row_team_id = novel_row["remote_team_id"] if "remote_team_id" in novel_row.keys() else None
            is_team_script = source_type == "team_script" or mode == "team_script_sync"
            if not (is_team_script and row_team_id and str(row_team_id) == str(team_id)):
                return None

            context: Dict[str, Any] = {
                "source": "team_script",
                "teamId": str(team_id),
                "projectId": novel_row["remote_project_id"] if "remote_project_id" in novel_row.keys() else None,
                "novelId": novel_id,
                "assetId": None,
                "assetType": None,
            }

            log_source_type = log_row["source_type"] if "source_type" in log_row.keys() else None
            log_source_id = log_row["source_id"] if "source_id" in log_row.keys() else None
            if log_source_id and (log_source_type or "").startswith("extracted_element"):
                try:
                    async with db.execute(
                        "SELECT remote_source, remote_id, element_type FROM extracted_elements WHERE id=? AND novel_id=?",
                        (log_source_id, novel_id),
                    ) as cursor:
                        element_row = await cursor.fetchone()
                    if element_row and (element_row["remote_source"] or "") == "team_asset":
                        context["source"] = "team_asset"
                        context["assetId"] = element_row["remote_id"] if "remote_id" in element_row.keys() else None
                        context["assetType"] = element_row["element_type"] if "element_type" in element_row.keys() else None
                except Exception:
                    pass

            return context
        except Exception as e:
            logger.warning("[usage-report] team usage context check failed log_id=%s team_id=%s: %s", log_id, team_id, e)
            return None

    @staticmethod
    async def _is_current_team_project_log(db, log_id: int, team_id: int) -> bool:
        return await UsageReportService._get_team_usage_context(db, log_id, team_id) is not None

    @staticmethod
    async def _mark_queue_skipped(queue_id: int, reason: str) -> None:
        db = await get_db()
        try:
            await db.execute(
                """
                UPDATE usage_report_queue
                SET status='skipped', last_error=?, updated_at=?
                WHERE id=?
                """,
                ((reason or "")[:1000], now_beijing_str(), queue_id),
            )
            await db.commit()
        finally:
            await db.close()

    @staticmethod
    async def report_log_success(log_id: int) -> None:
        """Backward-compatible entry: queue and then try to report."""
        queued = await UsageReportService.enqueue_log_success(log_id)
        if queued:
            await UsageReportService.process_pending(limit=5)

    @staticmethod
    async def enqueue_log_success(log_id: int) -> bool:
        """Durably queue a successful log. Does not perform network I/O."""
        if not log_id or log_id <= 0:
            return False
        team_id = team_ctx.get_team_id()
        if not team_id:
            return False

        db = await get_db()
        try:
            await UsageReportService._ensure_queue_table(db)
            if not await UsageReportService._is_current_team_project_log(db, log_id, int(team_id)):
                return False
            now = now_beijing_str()
            await db.execute(
                """
                INSERT OR IGNORE INTO usage_report_queue
                    (team_id, log_id, status, attempts, created_at, updated_at)
                VALUES (?, ?, 'pending', 0, ?, ?)
                """,
                (team_id, log_id, now, now),
            )
            await db.commit()
            return True
        except Exception as e:
            logger.warning("[usage-report] 入队失败 log_id=%s: %s", log_id, e)
            return False
        finally:
            await db.close()

    @staticmethod
    async def process_pending(limit: int = 20) -> None:
        """Retry queued usage reports. Safe to call on startup and after enqueue."""
        db = await get_db()
        try:
            await UsageReportService._ensure_queue_table(db)
            async with db.execute(
                """
                SELECT id, team_id, log_id, attempts
                FROM usage_report_queue
                WHERE status IN ('pending', 'error') AND attempts < 5 AND team_id IS NOT NULL
                ORDER BY id ASC
                LIMIT ?
                """,
                (int(limit),),
            ) as cursor:
                rows = await cursor.fetchall()
        finally:
            await db.close()

        for row in rows:
            queue_id = int(row["id"])
            team_id = int(row["team_id"])
            current_team_id = team_ctx.get_team_id()
            if current_team_id is not None and int(current_team_id) != team_id:
                continue
            log_id = int(row["log_id"])
            attempts = int(row["attempts"] or 0)
            db = await get_db()
            try:
                usage_context = await UsageReportService._get_team_usage_context(db, log_id, team_id)
            finally:
                await db.close()
            if not usage_context:
                await UsageReportService._mark_queue_skipped(
                    queue_id,
                    "skip: log is not tied to current team synced novel",
                )
                logger.info(
                    "[usage-report] 跳过非当前团队剧本日志 queue_id=%s log_id=%s team_id=%s",
                    queue_id,
                    log_id,
                    team_id,
                )
                continue
            ok, err = await UsageReportService._send_log_success(log_id, team_id=team_id)
            db = await get_db()
            try:
                now = now_beijing_str()
                if ok:
                    await db.execute(
                        """
                        UPDATE usage_report_queue
                        SET status='success', attempts=?, last_error=NULL, updated_at=?
                        WHERE id=?
                        """,
                        (attempts + 1, now, queue_id),
                    )
                else:
                    await db.execute(
                        """
                        UPDATE usage_report_queue
                        SET status='error', attempts=?, last_error=?, updated_at=?
                        WHERE id=?
                        """,
                        (attempts + 1, (err or "")[:1000], now, queue_id),
                    )
                await db.commit()
            finally:
                await db.close()

    @staticmethod
    async def _send_log_success(log_id: int, *, team_id: int) -> tuple[bool, str]:
        db = await get_db()
        try:
            async with db.execute("SELECT * FROM llm_logs WHERE id = ?", (log_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return False, "log not found"
                log = dict(row)
        finally:
            await db.close()

        if (log.get("status") or "") != "success":
            return False, "log not success"

        usage_types = _usage_event_type(log.get("task_type") or "")
        if not usage_types:
            return False, "unsupported task type"
        task_type, config_type = usage_types

        db = await get_db()
        try:
            usage_context = await UsageReportService._get_team_usage_context(db, log_id, team_id)
        finally:
            await db.close()
        if not usage_context:
            return False, "log not tied to current team project"

        output_obj = _safe_json_loads(log.get("output_content"))
        input_obj = _safe_json_loads(log.get("input_prompt"))
        duration_seconds = _extract_video_duration(log, output_obj)
        image_count = _extract_image_count(log, output_obj)
        input_tokens = int(log.get("input_tokens") or 0)
        output_tokens = int(log.get("output_tokens") or 0)
        # v3.61.241: providerCode 优先取 llm_logs.provider_code,空了再从 payload/base_url 兜底推断,
        # 避免旧 running 日志或漏写路径上报空 providerCode 导致云端无法按 providerCode+model 计价
        provider_code = _infer_provider_code(log, input_obj, output_obj)
        # v3.61.241: 仅 llm_call 才有真实 token 计费;image/video 的 total_tokens 字段
        # 被 video 复用存了「时长秒数」做本地显示,绝不能当 totalTokens 上报,否则云端按 token 误计费。
        total_tokens = (input_tokens + output_tokens) if config_type == "llm" else 0

        payload: Dict[str, Any] = {
            "taskType": task_type,
            "configType": config_type,
            "configName": log.get("config_name") or "",
            # v3.61.241: providerCode 让云端按 providerCode+model 匹配价格
            "providerCode": provider_code,
            "model": log.get("model") or "",
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "totalTokens": total_tokens,
            "imageCount": image_count,
            "durationSeconds": duration_seconds,
            "status": "success",
            "startedAt": log.get("start_time") or "",
            "endedAt": log.get("end_time") or "",
            "clientTaskId": f"xiaoshuotool:llm_logs:{log_id}",
            "metadata": {
                "source": usage_context.get("source") or "team_script",
                "teamId": usage_context.get("teamId"),
                "projectId": usage_context.get("projectId"),
                "assetId": usage_context.get("assetId"),
                "assetType": usage_context.get("assetType"),
                "localLogId": log_id,
                "localTaskType": log.get("task_type") or "",
                "novelId": log.get("novel_id"),
                "chapterTitle": log.get("chapter_title") or "",
                "sourceId": log.get("source_id"),
                "sourceType": log.get("source_type") or "",
                "sourceSceneIndex": log.get("source_scene_index"),
                "baseUrl": log.get("base_url") or "",
                "startTime": log.get("start_time") or "",
                "endTime": log.get("end_time") or "",
            },
        }

        try:
            await cloud_token.get_access_token()
            headers = cloud_token.headers()
            headers["X-Team-Id"] = str(team_id)
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{cloud_token.QIANSHAN_API_BASE}/team/{team_id}/usage/events",
                    json=payload,
                    headers=headers,
                )
            if resp.status_code >= 400:
                err = f"HTTP {resp.status_code}: {resp.text[:500]}"
                logger.warning("[usage-report] 上报失败 log_id=%s %s", log_id, err)
                return False, err
            logger.info("[usage-report] 上报成功 log_id=%s type=%s", log_id, task_type)
            return True, ""
        except Exception as e:
            logger.warning("[usage-report] 上报异常 log_id=%s: %s", log_id, e)
            return False, str(e)
