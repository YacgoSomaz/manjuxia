from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import PlainTextResponse
from starlette.requests import Request
from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any, Tuple  # v3.61.184 hotfix: 加 Dict/Any(_build_file_refs / _build_video_payload_log / _log_video_submit_end 用)
from datetime import datetime, timedelta
import asyncio
import logging
import json
import os
import uuid
import re
import mimetypes
import aiofiles
import shutil
from utils.ssl_helper import get_aiohttp_connector

from services.video_service import VideoService
from services.storyboard_service import StoryboardService, _match_section_prop_names
from database.db import get_db
from utils.paths import get_data_dir, media_subdir, resolve_db_path
from utils.timezone import now_beijing, now_beijing_str

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/video", tags=["video"])
video_service = VideoService()
_JIMENG_GHOST_MISS_COUNTS: Dict[str, int] = {}
_AUDIO_DURATION_CACHE: Dict[str, Tuple[int, int, Optional[float]]] = {}
# 即梦普通 2.0 偶发 query_result 一直返回 querying,但真实排队任务在 list_task 里的
# gen_status 可能也是 querying,并不出现在 --gen_status=processing 过滤结果里。
# 强幽灵判定不能依赖 processing 过滤。真实排队任务可能很久才有结果,
# 只有超过 6 小时且 query_result.queue_info 连续为空时才释放本地状态。
_JIMENG_STRONG_GHOST_MIN_SECONDS = 6 * 60 * 60
_JIMENG_GHOST_MISS_LIMIT = 3
CONFIG_VIDEO_PROVIDERS = ("volcengine_ark", "cool", "xinglian", "newapi")
UNIFIED_VIDEO_PROVIDERS = CONFIG_VIDEO_PROVIDERS + ("pippit_cli", "minimax_h3")
PROVIDER_FRIENDLY = {
    "cool": "Cool API",
    "volcengine_ark": "火山方舟",
    "xinglian": "星链云",
    "newapi": "New API 中转",
    "pippit_cli": "小云雀 CLI",
    "minimax_h3": "MiniMax H3",
}
PIPPIT_ACCESS_KEY_SETTING = "pippit.access_key"
MINIMAX_API_KEY_SETTING = "minimax.api_key"


def _cached_audio_duration_seconds(file_path: str) -> Optional[float]:
    """Probe a local audio once per file version for submission prechecks."""
    try:
        normalized = os.path.abspath(file_path)
        stat = os.stat(normalized)
        cache_key = os.path.normcase(normalized)
        cached = _AUDIO_DURATION_CACHE.get(cache_key)
        version = (int(stat.st_mtime_ns), int(stat.st_size))
        if cached and cached[:2] == version:
            return cached[2]
        from api.extraction import _probe_audio_duration_seconds

        duration = _probe_audio_duration_seconds(normalized)
        _AUDIO_DURATION_CACHE[cache_key] = (version[0], version[1], duration)
        if len(_AUDIO_DURATION_CACHE) > 1000:
            oldest_key = next(iter(_AUDIO_DURATION_CACHE))
            if oldest_key != cache_key:
                _AUDIO_DURATION_CACHE.pop(oldest_key, None)
        return duration
    except Exception:
        return None


def _mask_secret(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    if len(text) <= 8:
        return "***"
    return f"{text[:4]}***{text[-4:]}"


async def _get_app_setting(key: str, default: str = "") -> str:
    db = await get_db()
    try:
        cur = await db.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
        row = await cur.fetchone()
        return str(row["value"] if row and row["value"] is not None else default)
    finally:
        await db.close()


async def _set_app_setting(key: str, value: str) -> None:
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now', '+8 hours')) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now', '+8 hours')",
            (key, value),
        )
        await db.commit()
    finally:
        await db.close()


def _env_pippit_access_key() -> str:
    for name in (
        "PIPPIT_ACCESS_KEY",
        "PIPPIT_API_KEY",
        "PIPPIT_TOOL_ACCESS_KEY",
        "XIAOYUNQUE_ACCESS_KEY",
        "XIAOYUNQUE_API_KEY",
    ):
        value = os.environ.get(name)
        if value and value.strip():
            return value.strip()
    return ""


async def _get_pippit_access_key() -> str:
    # Env wins so deployments can override local SQLite settings.
    return _env_pippit_access_key() or (await _get_app_setting(PIPPIT_ACCESS_KEY_SETTING)).strip()


async def _pippit_provider_config() -> Dict[str, Any]:
    access_key = await _get_pippit_access_key()
    return {"access_key": access_key} if access_key else {}


def _env_minimax_api_key() -> str:
    for name in ("MINIMAX_API_KEY", "MINIMAX_ACCESS_KEY", "MINIMAX_SECRET_KEY"):
        value = os.environ.get(name)
        if value and value.strip():
            return value.strip()
    return ""


async def _get_minimax_api_key() -> str:
    # 部署环境变量优先；桌面端默认读取本机 app_settings。
    return _env_minimax_api_key() or (await _get_app_setting(MINIMAX_API_KEY_SETTING)).strip()


async def _minimax_provider_config() -> Dict[str, Any]:
    api_key = await _get_minimax_api_key()
    return {
        "api_key": api_key,
        "base_url": "https://api.minimaxi.com",
        "model_name": "MiniMax-H3",
        "name": "MiniMax H3",
    }


def _is_jimeng_active_queue_status(value: Any) -> bool:
    """query_result.queue_info.queue_status 表示当前 submit_id 的队列态。

    这个字段比全局 list_task 更贴近当前任务。若它明确表示排队/生成中,
    不应再用任务列表反查缺失把任务判成幽灵。
    """
    text = str(value or "").strip().lower()
    return text in {
        "queueing", "queue", "queued", "waiting", "inqueue",
        "querying", "generating", "generation", "running", "processing", "process",
    }


def _extract_task_list(data) -> list:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        if data.get("submit_id") or data.get("id") or data.get("task_id"):
            return [data]
        tasks = data.get("tasks") or data.get("data") or []
        if isinstance(tasks, dict) and (
            tasks.get("submit_id") or tasks.get("id") or tasks.get("task_id")
        ):
            return [tasks]
        return tasks if isinstance(tasks, list) else []
    return []


_JIMENG_TERMINAL_TASK_STATUSES = {
    "success", "succeeded",
    "finish", "finished",
    "complete", "completed",
    "fail", "failed", "error",
    "cancel", "canceled", "cancelled",
}


def _jimeng_task_id(task: Dict[str, Any]) -> str:
    return str(task.get("submit_id") or task.get("id") or task.get("task_id") or "").strip()


def _is_jimeng_active_task_entry(task: Dict[str, Any]) -> bool:
    """判断 list_task 里的匹配任务是否仍应视为远端活任务。

    list_task 的字段在 CLI 版本间不完全稳定。匹配到 submit_id 但没有状态字段时,
    为避免误杀真实排队任务,保守视为活跃；只有明确终态才返回 False。
    """
    raw_statuses = [
        task.get("gen_status"),
        task.get("status"),
        task.get("task_status"),
        task.get("queue_status"),
    ]
    statuses = [str(s).strip().lower() for s in raw_statuses if str(s or "").strip()]
    if not statuses:
        return True
    if any(s in _JIMENG_TERMINAL_TASK_STATUSES for s in statuses):
        return False
    if any(_is_jimeng_active_queue_status(s) for s in statuses):
        return True
    # 未知状态宁可保留到 query_result / 8 小时硬上限处理,不在这里释放本地状态。
    return True


def _jimeng_query_result_is_active(result: Dict[str, Any]) -> Optional[bool]:
    """Interpret dreamina query_result as remote liveness.

    This intentionally treats Queueing/querying as active so poll/ghost logic
    does not release real long-running Jimeng tasks. Do not use it for the local
    capacity gate, where only queue_info.queue_status=Generating should count.
    """
    if not isinstance(result, dict) or not result.get("success"):
        return None
    data = result.get("data") or {}
    if not isinstance(data, dict):
        return None

    raw_statuses = [
        data.get("gen_status"),
        data.get("status"),
        data.get("task_status"),
    ]
    queue_info = data.get("queue_info")
    if isinstance(queue_info, dict):
        raw_statuses.extend([
            queue_info.get("queue_status"),
            queue_info.get("status"),
        ])

    statuses = [str(s).strip().lower() for s in raw_statuses if str(s or "").strip()]
    if any(s in _JIMENG_TERMINAL_TASK_STATUSES for s in statuses):
        return False
    if any(_is_jimeng_active_queue_status(s) for s in statuses):
        return True

    # Some successful terminal payloads omit status but include a video URL.
    if data.get("video_url") or data.get("url") or data.get("download_url"):
        return False
    videos = data.get("videos")
    if isinstance(videos, list) and videos:
        return False

    return None


def _jimeng_query_result_occupies_capacity(result: Dict[str, Any]) -> Optional[bool]:
    """Return whether a Jimeng task should occupy the local capacity gate.

    Customer machines can accumulate stale local CLI rows that list_task reports
    as querying forever. Those rows, and normal Queueing rows, must not block the
    global queue. Capacity only counts a task when query_result explicitly says
    queue_info.queue_status is Generating. Terminal payloads return False; unclear
    payloads return None and are not counted by the gate.
    """
    if not isinstance(result, dict) or not result.get("success"):
        return None
    data = result.get("data") or {}
    if not isinstance(data, dict):
        return None

    raw_statuses = [
        data.get("gen_status"),
        data.get("status"),
        data.get("task_status"),
    ]
    statuses = [str(s).strip().lower() for s in raw_statuses if str(s or "").strip()]
    if any(s in _JIMENG_TERMINAL_TASK_STATUSES for s in statuses):
        return False

    if data.get("video_url") or data.get("url") or data.get("download_url"):
        return False
    videos = data.get("videos")
    if isinstance(videos, list) and videos:
        return False

    queue_info = data.get("queue_info")
    if isinstance(queue_info, dict):
        queue_status = str(queue_info.get("queue_status") or "").strip().lower()
        if queue_status == "generating":
            return True
        if queue_status:
            return False

    return None


def _jimeng_task_response_contains_active(res: dict, submit_id: str) -> Optional[bool]:
    if not res.get("success"):
        return None
    tasks = _extract_task_list(res.get("data"))
    target = str(submit_id or "").strip()
    for task in tasks:
        if not isinstance(task, dict):
            continue
        if _jimeng_task_id(task) == target:
            return _is_jimeng_active_task_entry(task)
    return False


async def _backfill_character_audio_from_voice(db, novel_id: int, elem: dict) -> dict:
    """Backfill legacy preset voice bindings into audio_file for video flows."""
    if not elem or elem.get("element_type") != "character":
        return elem
    if elem.get("audio_file") or not elem.get("voice_id"):
        return elem
    try:
        from services import voice_service
        from utils.timezone import now_beijing_str

        cur = await db.execute("SELECT name FROM novels WHERE id = ?", (novel_id,))
        novel = await cur.fetchone()
        novel_name = None
        if novel:
            try:
                novel_name = novel["name"]
            except Exception:
                novel_name = None
        audio_file = await voice_service.materialize_voice_audio_file(
            elem.get("voice_id"),
            novel_name,
            elem.get("name"),
        )
        if not audio_file:
            return elem
        await db.execute(
            "UPDATE extracted_elements SET audio_file = ?, updated_at = ? WHERE id = ?",
            (audio_file, now_beijing_str(), elem.get("id")),
        )
        await db.commit()
        elem = dict(elem)
        elem["audio_file"] = audio_file
    except Exception as e:
        logger.warning("[video] 音色音频自动补齐失败 element=%s: %s", elem.get("id"), e)
    return elem


async def _jimeng_task_list_contains_active(submit_id: str) -> Optional[bool]:
    """检查即梦任务列表是否仍包含该 submit_id 且不是明确终态。

    返回:
      True  = list_task 确认包含活跃/未知状态任务
      False = list_task 可查,但不包含或已明确终态
      None  = 查询失败/结构异常,调用方不能据此判失败
    """
    if not submit_id:
        return None
    try:
        # 先用 CLI 原生 submit_id 过滤,不带 gen_status。真实排队任务可能是 querying,
        # 用 --gen_status=processing 会漏掉,导致强幽灵误杀。
        direct = await video_service.list_tasks(submit_id=submit_id)
        direct_present = _jimeng_task_response_contains_active(direct, submit_id)
        if direct_present is True:
            return True

        # 兼容旧 CLI/异常输出:再查无状态列表兜底。这里也不能带 processing 过滤。
        broad = await video_service.list_tasks(limit=50)
        broad_present = _jimeng_task_response_contains_active(broad, submit_id)
        if broad_present is True:
            return True
        if direct_present is False or broad_present is False:
            return False
        return None
    except Exception as e:
        logger.debug(f"[poll-status] 即梦 list_task 反查失败 submit_id={submit_id}: {e}")
        return None


_JIMENG_TRANSIENT_SUBMIT_FAIL_KEYWORDS = (
    "context deadline exceeded",
    "client.timeout",
    "awaiting headers",
    "deadline exceeded",
    "timed out",
    "timeout",
    "i/o timeout",
    "connection reset",
    "wsarecv",
    "broken pipe",
    "eof",
)


_JIMENG_RECOVERABLE_SUBMIT_FAIL_KEYWORDS = (
    "1310",
    "exceedconcurrencylimit",
    "concurrency",
)


def _is_jimeng_transient_submit_failure(reason: str) -> bool:
    """提交阶段的网络/超时类失败。

    这类响应即使带 submit_id,也可能只是 CLI 本地写了 task 记录,
    即梦后台并没有真正进入 processing,不能直接按"已受理"轮询。
    """
    text = str(reason or "").lower()
    return any(k in text for k in _JIMENG_TRANSIENT_SUBMIT_FAIL_KEYWORDS)


def _is_jimeng_recoverable_submit_failure(reason: str) -> bool:
    """提交返回 fail+submit_id,但即梦仍可能把任务排进队列的已知业务场景。"""
    text = str(reason or "").lower()
    return any(k in text for k in _JIMENG_RECOVERABLE_SUBMIT_FAIL_KEYWORDS)


async def _confirm_jimeng_submit_visible(
    submit_id: str,
    *,
    attempts: int = 3,
    delay_seconds: float = 2.0,
) -> Optional[bool]:
    """提交超时但带 submit_id 时,短暂反查即梦后台是否真的有任务。

    返回:
      True  = list_task 确认看到活跃/未知状态任务,可按已受理进入轮询
      False = list_task 可查,多次都看不到,应立即失败释放本地状态
      None  = list_task 查询失败,不能据此判失败
    """
    if not submit_id:
        return False
    saw_unknown = False
    for idx in range(max(1, attempts)):
        present = await _jimeng_task_list_contains_active(submit_id)
        if present is True:
            return True
        if present is None:
            saw_unknown = True
        if idx < attempts - 1:
            await asyncio.sleep(delay_seconds)
    if saw_unknown:
        return None
    return False


def _strip_llm_metadata(prompt: str) -> str:
    """
    裁掉分镜 prompt 里 LLM 专用的元数据,只保留即梦真正需要的视觉指令。
    裁掉:
      1. 「承接上镜：...」状态块
      2. 在场(仅此 N 人,无其他角色入画):...。
      3. 说话人:XX(仅此一人开口) - A:... - B:... 多角色反应列表
         (保留"说话人:XX"这一行,去掉后面的反应列表)
      4. 状态链标签行 (🔗 / ⏪ / 📏)
      5. / English: "..." 英文翻译(对即梦无效,只增加字数)
      6. 连续空行压缩成单空行
    """
    # 1. 去掉「承接上镜：...」块(中文书名号包裹,含换行)
    prompt = re.sub(r'「承接上镜：.*?」', '', prompt, flags=re.DOTALL)

    # 2. 去掉"在场(仅此...入画):...。"整行
    prompt = re.sub(r'在场\(仅此.{1,30}入画\)[^。\n]*[。\n]', '', prompt)

    # 3. 说话人行:只保留"说话人:XX(仅此一人开口)",去掉后面所有" - 角色:反应"条目
    #    格式: 说话人:XX(仅此一人开口) - 角色A:反应 - 角色B:反应 ...句号或换行结束
    #    策略: 找到 说话人:XX(...) 后紧跟的所有 - 汉字:文字 条目,整段替换掉
    def _clean_speaker_line(m):
        return m.group(1)  # 只保留"说话人:XX(...)"部分
    prompt = re.sub(
        r'(说话人\s*[:：]\s*[^\n\-(（]{1,15}(?:[（(][^）)\n]{1,20}[）)])?)'  # 说话人:XX(...)
        r'(?:\s*-\s*[\u4e00-\u9fff]{1,6}\s*[:：]\s*[^\n\-]{1,30})+',        # - 角色:反应 × N
        _clean_speaker_line,
        prompt
    )

    # 4. 状态链标签:🔗/⏪ 是块头(本节结尾状态/承接上节),要连同其下缩进的角色状态行一起剥离
    #    📏/📋 是单行(总时长/自查),只剥该行
    # 先剥块(🔗/⏪ 开头 + 后续缩进行)
    prompt = re.sub(
        r'^[🔗⏪][^\n]*\n(?:[ \t]+[^\n]*\n?)*',
        '',
        prompt,
        flags=re.MULTILINE
    )
    # 再剥单行(📏/📋)
    prompt = re.sub(r'^[📏📋][^\n]*\n?', '', prompt, flags=re.MULTILINE)

    # 4b. 剥「场景起始状态:」block(LLM prompt 自带的) — 后端会用 cur_section_start_state 单独注入
    # 之前的 bug:LLM prompt 里有这个 block,后端又注入了一份相同的,即梦收到 2 份重复内容
    # 格式:「场景起始状态:」开头一行 + 后续若干缩进行(角色 = 状态)
    # v3.60.14:在剥之前外层会先调 _extract_start_state_from_prompt 提取用户编辑后的版本
    prompt = re.sub(
        r'^\s*场景起始状态\s*[:：]?\s*\n(?:[ \t]+[^\n]*\n?)+',
        '',
        prompt,
        flags=re.MULTILINE
    )

    # 5. 去掉 / English: "..." 英文翻译(普通引号和转义引号两种格式)
    prompt = re.sub(r'\s*/\s*English:\s*"[^"]*"', '', prompt)        # 普通双引号
    prompt = re.sub(r'\s*/\s*English:\s*\\"[^"\\]*\\"', '', prompt)  # 转义双引号(JSON示例中)

    # 6. 去掉 [电影感写实叙事,导演视角,非真实事件] tag (每镜重复太浪费字数,已由 v5.7 规则废弃)
    prompt = re.sub(r'\s*\[电影感写实叙事[,，]\s*导演视角[,，]\s*非真实事件\]\s*', ' ', prompt)

    # 7. 压缩连续空行
    prompt = re.sub(r'\n{3,}', '\n\n', prompt)

    return prompt.strip()


def _extract_start_state_from_prompt(prompt: str) -> str:
    """v3.60.14: 从 prompt 中提取用户编辑后的"场景起始状态:"块,原样返回(包含表头)

    格式: 「场景起始状态:」开头一行 + 后续若干"  角色 = 状态" 缩进行
    返回示例:
        "场景起始状态:\n  凌瑶华 = 姿态[站立挺拔]·伤势[无伤]...\n  小丫鬟 = ..."

    没找到返回 ''。

    ⚠️ 本函数只做"抽取",**不做合法性校验**。调用方必须用 _parse_start_state_names()
       跟 DB.section_start_state 的角色集对比 — 若抽到的角色超过本节激活角色,
       说明 LLM 把上节 chain-header 8 人块抄进了 description,**必须拒绝**。
       (v3.61.176 修复:之前盲信 prompt 抽取 → 视频管理页显示 8 人 / 分镜页显示 4 人)
    """
    if not prompt:
        return ''
    m = re.search(
        r'(^\s*场景起始状态\s*[:：]?\s*\n(?:[ \t]+[^\n]*\n?)+)',
        prompt,
        flags=re.MULTILINE,
    )
    if not m:
        return ''
    block = m.group(1).strip('\n')
    # 标准化表头(去掉前导空格,统一冒号)
    lines = block.split('\n')
    if lines:
        lines[0] = '场景起始状态:'
    return '\n'.join(lines).rstrip()


def _strip_inline_start_state_duplicate(prompt: str) -> str:
    """删除旧模板的单行起始状态副本。

    仅由调用方在已经取得可信的标准多行 ``start_state_text`` 时调用。
    这里故意不解析单行内容,也不无条件删除,避免存量首节只有
    ``场景起始状态:角色=...`` 时丢失唯一状态。
    """
    if not prompt:
        return prompt
    cleaned = re.sub(
        r'(?m)^[ \t]*场景起始状态[ \t]*[:：][ \t]*\S[^\r\n]*(?:\r?\n)?',
        '',
        prompt,
    )
    return re.sub(r'\n{3,}', '\n\n', cleaned).strip()


def _parse_start_state_names(start_state_text: str) -> set:
    """v3.61.176: 从"场景起始状态:"块里只抽角色名(`=` 左侧),返回 set。

    用于校验 _extract_start_state_from_prompt 抽到的角色集是否合法
    (必须 ⊆ DB.section_start_state 的本节激活角色集)。

    严格规则:
      - 只解析"角色 = 状态"行的 `=` 左侧
      - 不在状态描述里全文搜索,避免"姿态[望向凌婉兮]"误把"凌婉兮"识别成角色
      - 表头行("场景起始状态:")自动跳过
      - 左侧去掉空白和 `:：` 等字符后再 strip

    返回:角色名 set;空字符串 / 解析失败返回 set()
    """
    if not start_state_text:
        return set()
    names: set = set()
    for line in start_state_text.split('\n'):
        line = line.strip()
        if not line:
            continue
        # 跳过表头(可能为"场景起始状态:"或带各种空格冒号变体)
        if re.match(r'^场景起始状态\s*[:：]?\s*$', line):
            continue
        # 必须有 `=` 才视为状态行
        if '=' not in line:
            continue
        name = line.split('=', 1)[0]
        # 去掉左侧空白 / 冒号
        name = name.strip().rstrip(':：').strip()
        if name:
            names.add(name)
    return names


# 图片超过渠道 9 张上限时的“保留优先级”（数值越大越优先保留）。
# 用户确认的顺序：人物 > 场景 > 道具 > 用户关键帧 > 尾帧 > 俯视 A/B。
# 同类素材保持原顺序，因此人物列表靠前的主角、俯视 A 图会优先保留。
_IMAGE_KEEP_PRIORITY = {
    "character": 6,
    "scene": 5,
    "prop": 4,
    "reference": 3,
    "extra_reference": 3,
    "chain_prev_frame": 2,
    "chain_frame": 2,
    "topview_dispatch": 1,
}


def _image_asset_kind(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("kind") or "")
    if isinstance(item, (tuple, list)) and len(item) > 2:
        return str(item[2] or "")
    return ""


def _image_asset_name(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("name") or "")
    if isinstance(item, (tuple, list)) and len(item) > 1:
        return str(item[1] or "")
    return ""


def _select_image_keep_indices(items: List[Any], limit: int = 9) -> tuple[List[int], List[int]]:
    """按统一保留优先级选出图片索引，同时保持最终上传的原始顺序。"""
    if len(items) <= limit:
        return list(range(len(items))), []
    ranked = sorted(
        range(len(items)),
        key=lambda idx: (-_IMAGE_KEEP_PRIORITY.get(_image_asset_kind(items[idx]), 0), idx),
    )
    keep_set = set(ranked[:limit])
    kept = [idx for idx in range(len(items)) if idx in keep_set]
    removed = [idx for idx in range(len(items)) if idx not in keep_set]
    return kept, removed


def _build_file_refs(
    image_items: List[tuple],
    audio_items: List[tuple],
    ref_at: bool = False,
    separate_audio_order: bool = False,
) -> List[str]:
    """v3.61.181: 共用 file_refs 生成器(原 _process_video_generation L2143-2148 抽出)

    Args:
        image_items: [(path, name, elem_type), ...] elem_type ∈ {character, scene, prop, reference}
        audio_items: [(path, name), ...]

    Returns:
        默认保持历史行为：人物图后紧跟同名音频。
        separate_audio_order=True 时，先列完全部图片，再严格按 audio_items
        的实际上传顺序列音频，避免图片顺序把“音频2”排到“音频1”前面。
        调用方按需 ";".join 或 "\n".join,本函数不带分隔符
    """
    _kind_label_map = {
        "character": "人物形象",
        "scene": "场景",
        "prop": "道具",
        "reference": "",
    }

    def _name(item) -> str:
        if isinstance(item, dict):
            return (item.get("name") or "").strip() or "未命名"
        return ((item[1] if len(item) > 1 else "未命名") or "未命名")

    def _kind(item) -> str:
        if isinstance(item, dict):
            return item.get("kind") or ""
        return item[2] if len(item) > 2 else ""

    # 先按【原始顺序】给音频编号 + 建同名映射(编号绝不改 —— 要和传给即梦的 audios[] 位置一一对应)
    # v3.61.214: cool 走 @图片N / @音频N 引用语法;其余渠道保持原样
    _ref_pfx = "@" if ref_at else ""
    audio_labels = []  # [(name, "[@]音频M {name}角色音色参考")]
    for m, item in enumerate(audio_items, 1):
        anm = _name(item)
        audio_labels.append((anm, f"{_ref_pfx}音频{m} {anm}角色音色参考"))
    used_audio = [False] * len(audio_labels)

    # 图片按原始顺序编号;每张【人物图】后面用逗号紧跟【同名角色音频】配成一组
    refs: List[str] = []
    for idx, item in enumerate(image_items, 1):
        name = _name(item)
        kind = _kind(item)
        # 俯视调度图:name 已是完整短句("这张俯视调度图作为参考"),不追加"参考图"后缀
        if kind == "topview_dispatch":
            refs.append(f"{_ref_pfx}图片{idx} {name}")
            continue
        type_desc = _kind_label_map.get(kind, "")
        label = f"{_ref_pfx}图片{idx} {name}{type_desc}参考图"
        if kind == "character" and not separate_audio_order:
            for ai, (anm, alabel) in enumerate(audio_labels):
                if not used_audio[ai] and anm == name:
                    label = f"{label},{alabel}"   # 人物图 + 该人物音频,同组逗号分隔
                    used_audio[ai] = True
                    break
        refs.append(label)
    if separate_audio_order:
        # 即梦独立排序模式：人物/场景/道具图片全部说完后，再按实际 audios[]
        # 顺序列“音频1、音频2...”，让提示词文字顺序与上传顺序完全一致。
        refs.extend(alabel for _, alabel in audio_labels)
    else:
        # 没有同名图片可配的音频(理论少见)→ 末尾单列,不丢
        for ai, (anm, alabel) in enumerate(audio_labels):
            if not used_audio[ai]:
                refs.append(alabel)
    return refs


def _topview_item_parts(item: Any) -> tuple:
    if isinstance(item, dict):
        return item.get("kind") or "", item.get("name") or "", item
    kind = item[2] if isinstance(item, (list, tuple)) and len(item) > 2 else ""
    name = item[1] if isinstance(item, (list, tuple)) and len(item) > 1 else ""
    meta = item[3] if isinstance(item, (list, tuple)) and len(item) > 3 and isinstance(item[3], dict) else {}
    return kind or "", name or "", meta


def _topview_identity_from_dispatch(raw: Optional[str]) -> str:
    text = str(raw or "").strip()
    if not text:
        return ""
    identity_pos = text.find("身份绑定:")
    if identity_pos >= 0:
        s = text[identity_pos + len("身份绑定:"):].strip()
        s = s.splitlines()[0].strip()
        s = s.split("。只参考", 1)[0].strip()
        s = s.split("。画面其余", 1)[0].strip()
        s = s.split("。颜色标注只用于", 1)[0].strip()
        s = s.split("。颜色框只用于", 1)[0].strip()
        return re.sub(r"\s+", " ", s)[:1000]
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("人物尾态:"):
            return re.sub(r"\s+", " ", s[len("人物尾态:"):].strip())[:1000]
    return ""


def _topview_binding_name_key(value: Any) -> str:
    text = str(value or "").strip()
    return re.sub(r"[\s,，、;；:：·・\-\_()\[\]{}（）【】《》\"'“”‘’]+", "", text)


def _topview_name_candidates(name: Any, meta: Optional[Dict[str, Any]] = None) -> List[str]:
    meta = meta or {}
    raw: List[Any] = [
        name,
        meta.get("name"),
        meta.get("input_name"),
        meta.get("element_name"),
        meta.get("variant"),
        meta.get("variant_name"),
    ]
    aliases = meta.get("aliases")
    if isinstance(aliases, str):
        try:
            parsed = json.loads(aliases or "[]")
            if isinstance(parsed, list):
                raw.extend(parsed)
            else:
                raw.extend([x.strip() for x in re.split(r"[,，、]", aliases) if x.strip()])
        except Exception:
            raw.extend([x.strip() for x in re.split(r"[,，、]", aliases) if x.strip()])
    elif isinstance(aliases, list):
        raw.extend(aliases)
    out: List[str] = []
    seen: set = set()
    for item in raw:
        key = _topview_binding_name_key(item)
        if key and key not in seen:
            seen.add(key)
            out.append(key)
    return out


def _topview_character_ref_map(image_items: Optional[List[Any]], ref_at: bool = False) -> Dict[str, str]:
    """把当前最终上传素材里的角色图映射为 图片N 引用,供俯视颜色框绑定复用。"""
    refs: Dict[str, str] = {}
    if not image_items:
        return refs
    prefix = "@" if ref_at else ""
    for idx, item in enumerate(image_items, 1):
        kind, name, _meta = _topview_item_parts(item)
        if kind != "character" or not name:
            continue
        for key in _topview_name_candidates(name, _meta):
            if key and key not in refs:
                refs[key] = f"{prefix}图片{idx} {name}人物形象参考图"
    return refs


def _topview_marker_pairs(identity_text: str) -> List[tuple]:
    """从「红色框=凌瑶华(...)」/旧「红色标记=凌瑶华(...)」绑定里抽 (颜色框, 人名)。"""
    pairs: List[tuple] = []
    for seg in re.split(r"[；;]", str(identity_text or "")):
        seg = seg.strip()
        if not seg:
            continue
        m = re.search(r"((?:红|蓝|黄|绿|紫|橙|青|玫红|金|白|黑|浅蓝|深绿)色(?:框|标记))\s*[=:：]\s*([^（(,，;；。]+)", seg)
        if not m:
            continue
        marker = m.group(1).strip()
        name = m.group(2).strip()
        if marker and name:
            pairs.append((marker, name))
    return pairs


def _topview_marker_position_hints(identity_text: str) -> List[str]:
    """从颜色框绑定括号里取地标站位,过滤参考图段后保留完整位置。"""
    hints: List[str] = []
    color_pat = r"(?:红|蓝|黄|绿|紫|橙|青|玫红|金|白|黑|浅蓝|深绿)色(?:框|标记)"
    for seg in re.split(r"[；;]", str(identity_text or "")):
        seg = seg.strip()
        if not seg:
            continue
        m = re.search(rf"({color_pat})\s*[=:：]\s*([^（(,，;；。]+)[（(]([^）)]*)[）)]", seg)
        if not m:
            continue
        marker = m.group(1).strip()
        detail = m.group(3).strip()
        parts = [p.strip() for p in re.split(r"[,，]", detail) if p.strip()]
        if not parts:
            continue
        # topview_demo 写入顺序为:参考图、站位。站位本身可能含逗号,不能只取最后一段。
        position_parts = [
            p for p in parts
            if not p.startswith("熔图参考图") and "参考图" not in p
        ]
        pos = "，".join(position_parts)
        if pos:
            hints.append(f"{marker}在{pos}")
    return hints


def _topview_dispatch_rule(image_items: Optional[List[tuple]], ref_at: bool = False) -> str:
    """按素材中的 A/B 俯视人物调度图,给视频 prompt 补一段集中职责声明。"""
    if not image_items:
        return ""

    has_start = False
    has_end = False
    start_identities: List[str] = []
    end_identities: List[str] = []
    for item in image_items:
        kind, name, meta = _topview_item_parts(item)
        if kind != "topview_dispatch":
            continue
        role = str(meta.get("role") or "").lower()
        if role == "start" or "调度图A" in name or "位置图A" in name or "开始" in name:
            has_start = True
            ident = _topview_identity_from_dispatch(meta.get("identity_binding") or meta.get("dispatch_text"))
            if ident:
                start_identities.append(ident)
        if role == "end" or "调度图B" in name or "位置图B" in name or "结束" in name:
            has_end = True
            ident = _topview_identity_from_dispatch(meta.get("identity_binding") or meta.get("dispatch_text"))
            if ident:
                end_identities.append(ident)

    if has_start and has_end:
        lead = "人物调度:开始时人物位于俯视人物调度图A所示站位,结束时自然移动到俯视人物调度图B所示站位,移动过程连贯。"
    elif has_end:
        lead = "人物调度:结束时人物自然移动到俯视人物调度图B所示站位,移动过程连贯。"
    elif has_start:
        lead = "人物调度:开始时人物位于俯视人物调度图A所示站位,后续按分镜正文自然运动。"
    else:
        return ""
    identity_lines = list(dict.fromkeys(end_identities or start_identities))
    character_refs = _topview_character_ref_map(image_items, ref_at=ref_at)
    color_identity_lines: List[str] = []
    marker_ref_lines: List[str] = []
    position_hint_lines: List[str] = []
    seen_identities: set = set()
    seen_marker_refs: set = set()
    seen_positions: set = set()
    for ident in identity_lines:
        for marker, role_name in _topview_marker_pairs(ident):
            identity_line = f"{marker}={role_name}"
            if identity_line not in seen_identities:
                seen_identities.add(identity_line)
                color_identity_lines.append(identity_line)
            ref = character_refs.get(_topview_binding_name_key(role_name))
            if ref:
                line = f"{marker}对应当前视频素材{ref}"
                if line not in seen_marker_refs:
                    seen_marker_refs.add(line)
                    marker_ref_lines.append(line)
        for hint in _topview_marker_position_hints(ident):
            if hint not in seen_positions:
                seen_positions.add(hint)
                position_hint_lines.append(hint)
    binding_text = ""
    if identity_lines:
        binding_text = (
            (("颜色身份:" + "；".join(color_identity_lines) + "。") if color_identity_lines else "")
            + (("角色素材对应:" + "；".join(marker_ref_lines) + "。") if marker_ref_lines else "")
            + (("站位提示:" + "；".join(position_hint_lines) + "。") if position_hint_lines else "")
            + "俯视参考仅用于读取目标人物身份、起始站位、结束站位与移动关系,并与对应人物素材图匹配;"
            "正片始终按分镜规定的景别、机位和运镜呈现真实人物与真实场景。"
        )
    return (
        lead +
        "俯视人物调度图只用于读取人物和道具的位置关系,不代表正片画面视角;"
        "视频全程按分镜正文的景别、机位和运镜正常拍摄。"
        + binding_text
    )


async def _build_final_video_prompt(
    storyboard_id: int,
    raw_prompt: str,
    image_items: Optional[List[tuple]] = None,
    audio_items: Optional[List[tuple]] = None,
    *,
    with_file_refs: bool = True,
    log_prefix: str = "video-gen",
    ref_at: bool = False,
    separate_audio_order: bool = False,
    provider_type: Optional[str] = None,
) -> str:
    """v3.61.181: 即梦 CLI / ark / cool / xinglian 4 路径共用的 final prompt 拼装

    输入:
        storyboard_id: 分镜 ID
        raw_prompt: 原始 prompt(从 DB / 用户编辑 / template 来)
        image_items / audio_items: 素材列表,生成 file_refs 用
                                    (传 None 或空 → 不拼 file_refs 段)
        with_file_refs: cool 等已经在 payload 里独立传 files,但仍要在 prompt 里
                        告知模型"哪张图是谁",所以默认 True
        separate_audio_order: 按调用方需要先列图片，再按实际上传顺序列音频
        provider_type: 兼容现有各渠道调用；模板正文不再按渠道投影或过滤
        log_prefix: 日志前缀(各 provider 区分)

    流程:
        1) `_extract_start_state_from_prompt` + 4 分支校验取 start_state_text
        2) `_strip_llm_metadata` 仅执行历史基础清理，不改写模板正文
        3) 拼装顺序: style_prefix → storyboard_style_prompt → start_state → file_refs → stripped prompt → style_suffix
        4) 完整 final_prompt log 出来

    模板正文由模板自身负责约束；工具不投影、压缩或过滤固定11字段。
    账本、审计、Cmin、V/E 等内容是否出现，完全由模板输出决定。

    返回:final_prompt 字符串
    """
    import json as _json
    raw_prompt = raw_prompt or ""

    # 0) 拉 storyboard 基础信息 + style_prefix/suffix + section_start_state
    db = await get_db()
    storyboard_style_prompt = ""
    style_prefix = ""
    style_suffix = ""
    cur_section_start_state: Dict[str, str] = {}
    try:
        cur = await db.execute(
            "SELECT novel_id, style_prompt, section_start_state FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        sb_row = await cur.fetchone()
        if sb_row:
            novel_id = sb_row["novel_id"]
            storyboard_style_prompt = (sb_row["style_prompt"] or "") if sb_row else ""
            try:
                cur_section_start_state = _json.loads(sb_row["section_start_state"] or "{}")
            except Exception:
                cur_section_start_state = {}
            if novel_id:
                cur = await db.execute(
                    "SELECT prefix_prompt, suffix_prompt FROM image_style_settings "
                    "WHERE novel_id = ? AND element_type = ?",
                    (novel_id, "video"),
                )
                sty_row = await cur.fetchone()
                if sty_row:
                    style_prefix = sty_row["prefix_prompt"] or ""
                    style_suffix = sty_row["suffix_prompt"] or ""
    finally:
        await db.close()

    # 1) 抽 user 编辑后的 场景起始状态 + 4 分支校验(沿用 _process_video_generation 同款逻辑)
    user_edited = _extract_start_state_from_prompt(raw_prompt)
    db_names = set(cur_section_start_state.keys()) if isinstance(cur_section_start_state, dict) else set()
    prompt_names = _parse_start_state_names(user_edited)

    start_state_text = ""
    use_prompt = False
    if user_edited and prompt_names:
        if not db_names:
            use_prompt = True
            logger.info(
                f"[{log_prefix}] 分镜 {storyboard_id} DB.section_start_state 为空,"
                f"按旧行为用 prompt 抽取的 {len(prompt_names)} 角色"
            )
        elif prompt_names <= db_names:
            use_prompt = True
            logger.info(
                f"[{log_prefix}] 分镜 {storyboard_id} 使用用户编辑的 场景起始状态 块 "
                f"({len(prompt_names)}/{len(db_names)} 角色)"
            )
        else:
            extra = prompt_names - db_names
            logger.warning(
                f"[{log_prefix}] 分镜 {storyboard_id} prompt 含 {len(extra)} 个本节激活之外的人物 "
                f"{sorted(extra)},判定为 LLM chain-header 污染,fallback 到 DB "
                f"{len(db_names)} 人"
            )

    if use_prompt:
        start_state_text = user_edited
    elif cur_section_start_state:
        lines = [f"  {name} = {state}" for name, state in cur_section_start_state.items() if state]
        if lines:
            start_state_text = "场景起始状态:\n" + "\n".join(lines)
            logger.info(
                f"[{log_prefix}] 分镜 {storyboard_id} 注入 section_start_state: "
                f"{len(cur_section_start_state)} 个激活角色"
            )

    # 2) 沿用历史基础清理，不对模板正文做结构化投影或字段过滤
    stripped = _strip_llm_metadata(raw_prompt)
    if start_state_text:
        stripped = _strip_inline_start_state_duplicate(stripped)
    logger.info(f"[{log_prefix}] 分镜 {storyboard_id} 裁剪后 prompt 长度: {len(stripped)}")

    # 3) file_refs(图片1 ... ; 图片2 ... ; ...) v3.61.157 用分号
    file_refs_text = ""
    if with_file_refs and (image_items or audio_items):
        refs = _build_file_refs(
            image_items or [],
            audio_items or [],
            ref_at=ref_at,
            separate_audio_order=separate_audio_order,
        )
        if refs:
            file_refs_text = ";".join(refs)
    topview_rule_text = _topview_dispatch_rule(image_items if with_file_refs else None, ref_at=ref_at)

    # 4) 拼装(完全跟即梦 CLI L2223-2248 对齐)
    parts: List[str] = []
    if style_prefix:
        parts.append(style_prefix)
    if storyboard_style_prompt:
        parts.append(storyboard_style_prompt)
        logger.info(f"[{log_prefix}] 分镜 {storyboard_id} 已拼接分镜风格提示词: {storyboard_style_prompt[:50]}...")
    if start_state_text:
        parts.append(start_state_text)
    if file_refs_text:
        parts.append(file_refs_text)
        parts.append("")  # 空行分隔
    if topview_rule_text:
        parts.append(topview_rule_text)
        parts.append("")
    parts.append(stripped)
    if style_suffix:
        parts.append(style_suffix)
    final_prompt = "\n".join(p for p in parts if p is not None)

    if style_prefix or style_suffix or storyboard_style_prompt or file_refs_text:
        logger.info(f"[{log_prefix}] 分镜 {storyboard_id} 已拼接风格/素材清单到提示词")

    # 5) 完整 final_prompt log(对用户最有用 — 工具显示 vs 上游实际收到内容)
    logger.info(
        f"[{log_prefix}] 分镜 {storyboard_id} >>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n"
        f"实际发给上游的 prompt(共 {len(final_prompt)} 字符):\n"
        f"{final_prompt}\n"
        f"<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 分镜 {storyboard_id}"
    )

    return final_prompt


def _build_video_payload_log(
    *,
    provider: str,
    model: str,
    base_url: str,
    final_prompt: str,
    images: Optional[List[str]] = None,
    audios: Optional[List[str]] = None,
    params: Optional[Dict[str, Any]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """v3.61.183: 视频提交日志的统一结构(provider/model 元数据 + sanitized payload)

    传给 LogService.create_log 的 input_prompt(它内部还会过一次 base64 递归 sanitize 双保险)。

    Args:
        provider: 'jimeng' / 'volcengine_ark' / 'cool' / 'xinglian'
        model: 真实发上游的 model id(jimeng 走 model_version, ark 走 ep id, cool 走 seedance_2 等)
        base_url: 配置的网关地址
        final_prompt: 经 _build_final_video_prompt 拼好的完整 prompt
        images: 本地路径或 data URL 数组(jimeng/ark/cool 是路径,xinglian 是 data URL)
        audios: 同 images
        params: ratio/duration/resolution/enable_sound 等
        extra: provider 专属字段(如 cool files 数组,ark generation_mode)

    Returns:
        dict — 内含 sanitized payload,无 base64 残留
    """
    # 摘要素材:本地路径直接放进去(短),data URL 由 LogService 递归 sanitize
    def _summarize_assets(items: Optional[List[str]]) -> List[Dict[str, Any]]:
        if not items:
            return []
        out = []
        for i, it in enumerate(items, 1):
            if isinstance(it, str):
                if it.startswith("data:"):
                    # data URL — 不入 path,只标长度
                    out.append({"index": i, "type": "data_url", "len": len(it)})
                elif it.startswith("asset://"):
                    out.append({"index": i, "type": "asset_uri", "path": it})
                else:
                    out.append({"index": i, "type": "local", "path": it})
            else:
                out.append({"index": i, "raw": str(it)[:200]})
        return out

    payload = {
        "provider": provider,
        "model": model,
        "base_url": base_url,
        "params": params or {},
        "video_duration_seconds": (params or {}).get("duration"),
        "prompt": final_prompt or "",
        "images_count": len(images or []),
        "audios_count": len(audios or []),
        "images_summary": _summarize_assets(images),
        "audios_summary": _summarize_assets(audios),
    }
    if extra:
        payload["extra"] = extra
    return payload


async def _log_video_submit_start(
    *,
    storyboard_id: int,
    provider: str,
    provider_code: str = "",
    model: str,
    config_name: str,
    base_url: str,
    final_prompt: str,
    images: Optional[List[str]] = None,
    audios: Optional[List[str]] = None,
    params: Optional[Dict[str, Any]] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> int:
    """v3.61.183: 视频提交开始时调,返回 log_id(失败返 -1)

    所有 4 路径(jimeng CLI / ark / cool / xinglian)共用。
    task_type 固定 'video_generation',source_type='storyboard'。
    """
    from services.log_service import LogService
    try:
        # 拉 storyboard novel_id + scene_index + section_number(用于 chapter_title 显示)
        novel_id = None
        chapter_title = f"[{provider}] storyboard {storyboard_id}"
        scene_index = None
        try:
            db = await get_db()
            try:
                cur = await db.execute(
                    "SELECT novel_id, scene_index, section_number FROM storyboards WHERE id = ?",
                    (storyboard_id,),
                )
                row = await cur.fetchone()
                if row:
                    novel_id = row["novel_id"]
                    scene_index = row["scene_index"]
                    sn = row["section_number"]
                    if scene_index is not None and sn is not None:
                        chapter_title = f"[{provider}] 分镜 #{scene_index + 1}-{sn}"
            finally:
                await db.close()
        except Exception:
            pass

        payload_log = _build_video_payload_log(
            provider=provider,
            model=model,
            base_url=base_url,
            final_prompt=final_prompt,
            images=images,
            audios=audios,
            params=params,
            extra=extra,
        )

        log_id = await LogService.create_log(
            task_type="video_generation",
            model=model or "",
            config_name=config_name or "",
            provider_code=provider_code or provider or "",
            base_url=base_url or "",
            input_prompt=payload_log,  # LogService 内部 sanitize_for_log + base64 递归脱敏双保险
            novel_id=novel_id,
            chapter_title=chapter_title,
            source_id=storyboard_id,
            source_type="storyboard",
            source_scene_index=scene_index,
        )
        return log_id or -1
    except Exception as e:
        logger.warning(f"[video-log] sb={storyboard_id} create_log 失败(不影响主流程): {e}")
        return -1


async def _log_video_submit_end(
    log_id: int,
    *,
    success: bool,
    submit_id: Optional[str] = None,
    fail_reason: Optional[str] = None,
    sanitized_payload: Optional[Dict[str, Any]] = None,
) -> None:
    """v3.61.183: 视频提交结束(成功或失败)时调

    成功:output_content 写 submit_id + provider 内部 sanitized_payload;失败:走 update_log_error
    sanitized_payload:provider 在 SubmitResult 里塞的"实际发上游"摘要,含 base64 占位 / 失败的 img_fail / audio_fail 等;
                     codex P2 复审后接入(原是预留字段)— LogService 入库前会跑递归 base64 脱敏双保险
    """
    if not log_id or log_id <= 0:
        return
    from services.log_service import LogService
    try:
        if success:
            output_obj: Dict[str, Any] = {"submit_id": submit_id or "", "result": "submitted"}
            if sanitized_payload:
                # provider 已 sanitize 过 base64,LogService.create_log 也会再扫一遍;
                # 这里是 update_log_success,不走 LogService 内置脱敏,所以**先在外面递归脱敏**确保安全
                try:
                    from services.log_service import _sanitize_base64_recursive
                    output_obj["sanitized_payload"] = _sanitize_base64_recursive(sanitized_payload)
                except Exception:
                    # 脱敏失败兜底:不写 sanitized_payload,只留 submit_id
                    pass
            await LogService.update_log_success(
                log_id=log_id,
                output_content=json.dumps(output_obj, ensure_ascii=False),
            )
        else:
            # 失败时把 sanitized_payload 也带进 error_message,便于排查"实际发了什么导致失败"
            err_msg = (fail_reason or "video submit failed")[:500]
            if sanitized_payload:
                try:
                    from services.log_service import _sanitize_base64_recursive
                    sp_str = json.dumps(_sanitize_base64_recursive(sanitized_payload), ensure_ascii=False)[:1500]
                    err_msg = f"{err_msg}\n\n[实际发上游 payload(摘要)]: {sp_str}"
                except Exception:
                    pass
            await LogService.update_log_error(
                log_id=log_id,
                error_message=err_msg,
            )
    except Exception as e:
        logger.warning(f"[video-log] update_log 失败 log_id={log_id}(不影响主流程): {e}")


def _video_log_remote_marker(provider: str, submit_id: Optional[str]) -> str:
    return f"video-submit:{provider or 'unknown'}:{submit_id or ''}"


async def _log_video_submitted(log_id: int, *, provider: str, submit_id: Optional[str]) -> None:
    """Persist submit_id while keeping llm_logs.status=running."""
    if not log_id or log_id <= 0 or not submit_id:
        return
    try:
        from services.log_service import LogService
        await LogService.update_log_remote_url(log_id, _video_log_remote_marker(provider, submit_id))
    except Exception as e:
        logger.warning(f"[video-log] persist submit marker failed log_id={log_id}: {e}")


async def _find_running_video_log_id(storyboard_id: int, submit_id: Optional[str] = None) -> int:
    db = await get_db()
    try:
        if submit_id:
            cur = await db.execute(
                """
                SELECT id FROM llm_logs
                WHERE task_type = 'video_generation'
                  AND source_type = 'storyboard'
                  AND source_id = ?
                  AND status = 'running'
                  AND remote_url LIKE ?
                ORDER BY id DESC LIMIT 1
                """,
                (storyboard_id, f"%:{submit_id}"),
            )
            row = await cur.fetchone()
            if row:
                return int(row["id"])
        cur = await db.execute(
            """
            SELECT id FROM llm_logs
            WHERE task_type = 'video_generation'
              AND source_type = 'storyboard'
              AND source_id = ?
              AND status = 'running'
            ORDER BY id DESC LIMIT 1
            """,
            (storyboard_id,),
        )
        row = await cur.fetchone()
        return int(row["id"]) if row else -1
    except Exception as e:
        logger.warning(f"[video-log] find running log failed sb={storyboard_id} submit={submit_id}: {e}")
        return -1
    finally:
        await db.close()


async def _get_storyboard_video_duration(storyboard_id: int) -> Optional[int]:
    """Return intended video length from storyboard prompt/description."""
    db = await get_db()
    try:
        cur = await db.execute(
            """
            SELECT s.prompt, s.description,
                   COALESCE(pt.model_family, 'seedance_2_0') AS model_family
            FROM storyboards s
            LEFT JOIN prompt_templates pt ON pt.id = s.template_id
            WHERE s.id = ?
            """,
            (storyboard_id,),
        )
        row = await cur.fetchone()
        if not row:
            return None
        from services.video_model_capabilities import get_video_model_capabilities

        max_duration_sec = int(
            get_video_model_capabilities(row["model_family"])[
                "max_duration_seconds"
            ]
        )
        for key in ("prompt", "description"):
            dur = _extract_section_duration(
                row[key] or "",
                max_duration_sec=max_duration_sec,
            )
            if dur is not None:
                return dur
        return None
    except Exception as e:
        logger.debug(f"[video-log] extract storyboard duration failed sb={storyboard_id}: {e}")
        return None
    finally:
        await db.close()


async def _finalize_video_log_success(
    *,
    storyboard_id: int,
    submit_id: Optional[str],
    provider: str,
    video_url: Optional[str],
    requested_duration: Optional[int] = None,
    actual_duration: Optional[float] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    """Set video_generation log success only after the video is really done."""
    log_id = await _find_running_video_log_id(storyboard_id, submit_id)
    if not log_id or log_id <= 0:
        return
    from services.log_service import LogService
    try:
        if requested_duration is None:
            requested_duration = await _get_storyboard_video_duration(storyboard_id)
        usage_duration = requested_duration
        if usage_duration is None and actual_duration:
            usage_duration = int(round(float(actual_duration)))

        output_obj: Dict[str, Any] = {
            "result": "completed",
            "submit_id": submit_id or "",
            "provider": provider or "",
            "video_url": video_url or "",
            "video_duration_seconds": usage_duration,
        }
        if actual_duration:
            output_obj["actual_video_duration_seconds"] = actual_duration
        if extra:
            output_obj["extra"] = extra
        await LogService.update_log_success(
            log_id=log_id,
            output_content=json.dumps(output_obj, ensure_ascii=False),
            input_tokens=0,
            output_tokens=0,
            total_tokens=int(usage_duration or 0),
        )
    except Exception as e:
        logger.warning(f"[video-log] finalize success failed log_id={log_id} sb={storyboard_id}: {e}")


async def _finalize_video_log_error(
    *,
    storyboard_id: int,
    submit_id: Optional[str],
    fail_reason: str,
) -> None:
    """Set video_generation log error for terminal poll/download failures."""
    log_id = await _find_running_video_log_id(storyboard_id, submit_id)
    if not log_id or log_id <= 0:
        return
    try:
        from services.log_service import LogService
        await LogService.update_log_error(log_id=log_id, error_message=(fail_reason or "video failed")[:1500])
    except Exception as e:
        logger.warning(f"[video-log] finalize error failed log_id={log_id} sb={storyboard_id}: {e}")


storyboard_service = StoryboardService()


def _normalize_path(path: str | None) -> str | None:
    """确保路径以 / 开头"""
    if path and not path.startswith('/'):
        return '/' + path
    return path


@router.get("/chapter-videos-dir")
async def get_chapter_videos_dir(novel_id: int, chapter_id: int = None, script_id: int = None):
    """v3.59.87:返回本章视频子目录绝对路径(供前端 IPC 打开 explorer 用)。
    优先级:chapter_id > script_id 反推 chapter
    返回 {success, abs_path, exists} — abs_path 是 explorer 应打开的目录
    """
    db = await get_db()
    try:
        # 拿 novel_name + chapter_title
        if chapter_id:
            cur = await db.execute(
                "SELECT n.name AS novel_name, c.title AS chapter_title "
                "FROM novels n LEFT JOIN chapters c ON c.id=? AND c.novel_id=n.id "
                "WHERE n.id=?",
                (chapter_id, novel_id)
            )
        elif script_id:
            cur = await db.execute(
                "SELECT n.name AS novel_name, c.title AS chapter_title "
                "FROM scripts s LEFT JOIN novels n ON s.novel_id=n.id LEFT JOIN chapters c ON s.chapter_id=c.id "
                "WHERE s.id=?",
                (script_id,)
            )
        else:
            return {"success": False, "message": "需要 chapter_id 或 script_id"}
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        return {"success": False, "message": "找不到对应章节"}

    novel_name = (row["novel_name"] or "未命名").strip()
    chapter_title = (row["chapter_title"] or "未分章").strip()
    # 跟 _build_friendly_video_path 同款 sanitize
    def _sanitize(s: str) -> str:
        return re.sub(r'[\\/:*?"<>|\x00-\x1f]', '_', s).strip().rstrip('.')
    novel_dir = _sanitize(novel_name) or "未命名"
    chapter_dir = _sanitize(chapter_title) or "未分章"

    videos_dir = os.path.normpath(media_subdir("videos"))
    abs_path = os.path.normpath(os.path.join(videos_dir, novel_dir, chapter_dir))
    return {
        "success": True,
        "abs_path": abs_path,
        "exists": os.path.exists(abs_path),
        "novel_name": novel_name,
        "chapter_title": chapter_title,
    }


# v3.59.85:即梦视频下载完后改用"小说_章节_场节_时间戳"友好命名(扁平结构)
# v3.59.87:改成按 [小说名/章节/] 子目录归类 + 文件名简化为 S场-节_时间戳
# 用户场景:点"素材文件夹"按钮直接打开本章子目录,explorer 一目了然只看本章视频
async def _build_friendly_video_path(storyboard_id: int, original_ext: str = ".mp4") -> tuple | None:
    """
    返回 (子目录相对路径, 文件名),失败返回 None 让调用方走原始命名兜底。
    例:("重生后我比恶毒女配还恶/第14章", "S03-01_001230.mp4")
    完整路径 = videos_dir + 子目录 + 文件名
    """
    import re as _re
    from datetime import datetime as _dt
    db = await get_db()
    try:
        cur = await db.execute(
            """
            SELECT n.name AS novel_name,
                   c.title AS chapter_title, c.sort_order AS chapter_order,
                   sb.scene_index, sb.section_number, sb.sort_order
            FROM storyboards sb
            LEFT JOIN novels n ON sb.novel_id=n.id
            LEFT JOIN scripts s ON sb.script_id=s.id
            LEFT JOIN chapters c ON s.chapter_id=c.id
            WHERE sb.id=?
            """,
            (storyboard_id,)
        )
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        return None
    novel_name = (row["novel_name"] or "未命名").strip()
    chapter_order = row["chapter_order"]  # 0-based 或 None
    scene_index = row["scene_index"]      # 0-based
    section_number = row["section_number"] or 1
    # 章节目录名:用 chapter_title(用户能看懂),如"第14章 殿下你真好"
    # 没 chapter_title 用兜底
    chapter_title = (row["chapter_title"] or "").strip()
    if not chapter_title and chapter_order is not None:
        chapter_title = f"第{chapter_order + 1:02d}章"
    elif not chapter_title:
        chapter_title = "未分章"

    scene_part = f"S{(scene_index or 0) + 1:02d}-{section_number:02d}"
    ts = _dt.now().strftime("%H%M%S")
    filename = f"{scene_part}_{ts}{original_ext}"

    # Windows 文件名/目录非法字符过滤
    def _sanitize(s: str) -> str:
        return _re.sub(r'[\\/:*?"<>|\x00-\x1f]', '_', s).strip().rstrip('.')

    novel_dir = _sanitize(novel_name)
    chapter_dir = _sanitize(chapter_title)
    if not novel_dir:
        novel_dir = "未命名"
    if not chapter_dir:
        chapter_dir = "未分章"
    # 子目录用 / 拼接,os.path.join 在 win 下也认
    subdir = f"{novel_dir}/{chapter_dir}"
    return subdir, filename


def _rename_to_friendly_subdir(videos_dir: str, original_filename: str, subdir: str, friendly_filename: str) -> str:
    """把 dreamina-cli 下载的 {submit_id}_video_N.mp4 重命名 + 移到章节子目录。
    返回 db 里要存的相对路径(相对 videos_dir 的部分):
      - 成功:"{novel}/{chapter}/{S场-节_时间戳}.mp4"
      - 失败:原文件名(沿用扁平路径,不破坏老逻辑)
    """
    if not original_filename:
        return original_filename
    src = os.path.join(videos_dir, original_filename)
    if not os.path.exists(src):
        # v3.61.30: 兜底 — 如果章节子目录已经有相同 S场-节 前缀的文件,说明已经 rename 过(并发 poll 重复下载)
        # 直接返回那个已存在的相对路径,跳过重复重命名
        target_subdir_check = os.path.normpath(os.path.join(videos_dir, subdir))
        if os.path.isdir(target_subdir_check):
            stem_prefix = friendly_filename.rsplit("_", 1)[0]  # e.g. "S03-02"
            for existing in os.listdir(target_subdir_check):
                if existing.startswith(stem_prefix + "_") and existing.lower().endswith((".mp4", ".mov", ".webm")):
                    logger.warning(f"[video-rename] 检测到 {subdir}/{existing} 已存在(并发 poll),跳过重命名沿用旧文件")
                    return f"{subdir}/{existing}"
        return original_filename

    target_subdir = os.path.normpath(os.path.join(videos_dir, subdir))
    try:
        os.makedirs(target_subdir, exist_ok=True)
    except Exception as _err:
        logger.warning(f"[video-rename] 创建章节子目录失败,沿用扁平: {_err}")
        return original_filename

    dst = os.path.join(target_subdir, friendly_filename)
    # 碰撞兜底:同节同秒重生 → 加 (2)/(3)/...
    if os.path.exists(dst):
        stem, ext = os.path.splitext(friendly_filename)
        for n in range(2, 100):
            cand = f"{stem}({n}){ext}"
            cand_path = os.path.join(target_subdir, cand)
            if not os.path.exists(cand_path):
                dst = cand_path
                friendly_filename = cand
                break
    try:
        os.rename(src, dst)
        # 返回相对 videos_dir 的路径(给前端拼 video_url 用)
        rel = f"{subdir}/{friendly_filename}"
        return rel
    except Exception as _err:
        logger.warning(f"[video-rename] 移到子目录失败,沿用扁平 {original_filename}: {_err}")
        return original_filename


# 兼容老调用点:返回值还是单个文件名(扁平)
async def _build_friendly_video_name(storyboard_id: int, original_ext: str = ".mp4") -> str | None:
    """老 API,留兜底(任何路径走子目录就用 _build_friendly_video_path)"""
    return None


def find_best_match(search_name: str, elements: list, element_type: str = 'scene') -> dict | None:
    """
    全候选匹配：精确名称/核心名 → 精确别名 → 最长包含 → 关键词。

    旧实现会在别名子串命中时立即返回，结果依赖数据库返回顺序。例如旧元素
    "瑶华阁" 先于新元素 "瑶华阁湖心亭" 返回时，短别名会抢走
    "内/外 瑶华阁湖心亭 夜"。这里先为所有候选评分，再统一选最高分，
    从根上消除短名称抢占和输入顺序依赖。

    elements: list of sqlite3.Row or dict, 每个元素需要有 name 和 aliases 字段
    返回匹配到的元素或 None
    """
    if not search_name or not elements:
        logger.debug(f"[find_best_match] 提前返回: search_name={search_name}, elements数量={len(elements) if elements else 0}")
        return None

    trailing_punctuation = '。，.,:：；;、！!？? '

    def _normalize_text(value: object) -> str:
        text = str(value or '').strip()
        while text and text[-1] in trailing_punctuation:
            text = text[:-1]
        return re.sub(r'\s+', ' ', text).strip().casefold()

    def _scene_core_name(value: object) -> str:
        """去掉镜头场景名外围信息，只保留可用于素材匹配的地点核心名。"""
        core = _normalize_text(value)
        if not core:
            return ''
        if ((core.startswith('【') and core.endswith('】'))
                or (core.startswith('[') and core.endswith(']'))):
            core = core[1:-1].strip()
        if '。人物：' in core:
            core = core.split('。人物：', 1)[0].strip()
        # 分镜标题可能带“·题材·时长·情绪”，地点始终在第一个分段。
        if '·' in core:
            core = core.split('·', 1)[0].strip()
        # “内/外”是混合场景标识；裸“内/外”仅在后面有空格时视为前缀，
        # 避免误伤“内蒙古”“外滩”等真实地名。
        core = re.sub(
            r'^(?:(?:内\s*[/／]\s*外|外\s*[/／]\s*内)\s*|(?:内外|外内|内|外)\s+)',
            '',
            core,
        ).strip()
        # 时间标签只在与地点有分隔时剥离，不删除名称本身以“夜”等字结尾的场景。
        core = re.sub(
            r'\s+(?:时间未明|时间不明|时间未知|日|夜|昼|白天|夜晚|深夜|清晨|黎明|黄昏|傍晚)\s*$',
            '',
            core,
        ).strip()
        return _normalize_text(core)

    def _core_name(value: object) -> str:
        normalized = _normalize_text(value)
        return _scene_core_name(normalized) if element_type == 'scene' else normalized

    def _scene_space_kind(value: object) -> str:
        """提取明确的室内/室外属性；混合场景和无标记场景返回空。"""
        if element_type != 'scene':
            return ''
        normalized = _normalize_text(value)
        if not normalized:
            return ''
        if ((normalized.startswith('【') and normalized.endswith('】'))
                or (normalized.startswith('[') and normalized.endswith(']'))):
            normalized = normalized[1:-1].strip()
        if re.match(r'^(?:内\s*[/／]\s*外|外\s*[/／]\s*内|内外\s+|外内\s+)', normalized):
            return ''
        if re.match(r'^内\s+', normalized):
            return 'interior'
        if re.match(r'^外\s+', normalized):
            return 'exterior'

        core = _scene_core_name(normalized)
        interior_tokens = ('内室', '室内', '内部', '房间', '卧室', '书房', '暗室', '密室')
        exterior_tokens = ('外景', '室外', '院落', '庭院', '门外')
        has_interior = any(token in core for token in interior_tokens)
        has_exterior = any(token in core for token in exterior_tokens)
        if has_interior != has_exterior:
            return 'interior' if has_interior else 'exterior'
        return ''

    normalized_name = _normalize_text(search_name)
    search_core = _core_name(search_name)
    search_space_kind = _scene_space_kind(search_name)
    if not normalized_name or not search_core:
        return None

    # 预处理：将 sqlite3.Row 转为 dict，解析 aliases
    processed_elements = []
    for elem in elements:
        if hasattr(elem, 'keys'):
            elem_dict = dict(elem)
        else:
            elem_dict = dict(elem) if isinstance(elem, dict) else {}
        if not elem_dict:
            continue

        aliases_raw = elem_dict.get('aliases') or '[]'
        if isinstance(aliases_raw, str):
            try:
                aliases = json.loads(aliases_raw) if aliases_raw else []
            except (json.JSONDecodeError, TypeError, ValueError):
                aliases = []
        else:
            aliases = aliases_raw if isinstance(aliases_raw, list) else []
        elem_dict['_aliases_list'] = [
            str(alias).strip()
            for alias in aliases
            if alias is not None and str(alias).strip()
        ]
        processed_elements.append(elem_dict)

    def _is_hollow(elem: dict) -> bool:
        """素材完整度只用于同分候选，不能覆盖更精确的语义匹配。"""
        if element_type == 'character' and elem.get('active_variant_id'):
            return False
        return not (
            elem.get('finished_image')
            or elem.get('image_url')
            or elem.get('reference_image')
            or elem.get('grid_image')
            or elem.get('panorama_url')
            or elem.get('audio_file')
            or elem.get('volc_asset_uri')
        )

    def _compact_len(value: str) -> int:
        return len(re.sub(r'\s+', '', value or ''))

    def _keywords(value: str) -> set[str]:
        compact = re.sub(r'\s+', '', value or '')
        result: set[str] = set()
        for index in range(len(compact)):
            if index + 2 <= len(compact):
                result.add(compact[index:index + 2])
            if index + 3 <= len(compact):
                result.add(compact[index:index + 3])
        return result

    search_keywords = _keywords(search_core)

    def _score_label(label: str, *, is_alias: bool) -> tuple[tuple[int, ...], str] | None:
        label_normalized = _normalize_text(label)
        label_core = _core_name(label)
        if not label_normalized or not label_core:
            return None

        source_bonus = 0 if is_alias else 1
        raw_len = _compact_len(label_normalized)
        core_len = _compact_len(label_core)
        search_len = _compact_len(search_core)

        if label_normalized == normalized_name:
            tier = 480 if is_alias else 500
            return (tier, 1, raw_len, 1000, source_bonus, 0), '别名精确' if is_alias else '名称精确'
        if label_core == search_core:
            tier = 470 if is_alias else 490
            return (tier, 1, core_len, 1000, source_bonus, 0), '别名核心精确' if is_alias else '名称核心精确'

        label_space_kind = _scene_space_kind(label)
        if search_space_kind and label_space_kind and search_space_kind != label_space_kind:
            return None
        space_compatibility = int(
            bool(search_space_kind) and search_space_kind == label_space_kind
        )

        if min(search_len, core_len) >= 2 and (label_core in search_core or search_core in label_core):
            matched_len = min(search_len, core_len)
            coverage = int(1000 * matched_len / max(search_len, core_len))
            length_delta = abs(search_len - core_len)
            return (
                300, space_compatibility, matched_len, coverage, source_bonus, -length_delta
            ), '最长包含'

        label_keywords = _keywords(label_core)
        common_count = len(search_keywords & label_keywords)
        if common_count >= 3:
            coverage = int(
                1000 * common_count / max(len(search_keywords), len(label_keywords), 1)
            )
            length_delta = abs(search_len - core_len)
            return (
                100, space_compatibility, common_count, coverage, source_bonus, -length_delta
            ), '关键词'
        return None

    best_match = None
    best_score = None
    best_reason = ''
    best_label = ''

    for elem in processed_elements:
        labels = [(elem.get('name') or '', False)]
        labels.extend((alias, True) for alias in elem.get('_aliases_list', []))
        seen_labels = set()
        elem_label_score = None
        elem_reason = ''
        elem_label = ''

        for label, is_alias in labels:
            label_key = (_normalize_text(label), is_alias)
            if not label_key[0] or label_key in seen_labels:
                continue
            seen_labels.add(label_key)
            scored = _score_label(label, is_alias=is_alias)
            if not scored:
                continue
            label_score, reason = scored
            if elem_label_score is None or label_score > elem_label_score:
                elem_label_score = label_score
                elem_reason = reason
                elem_label = str(label)

        if elem_label_score is None:
            continue

        try:
            elem_id = int(elem.get('id') or 0)
        except (TypeError, ValueError):
            elem_id = 0
        # 语义评分永远排在素材完整度之前；同分时才优先有素材、较新的记录。
        score = elem_label_score + (
            0 if _is_hollow(elem) else 1,
            elem_id,
            _normalize_text(elem.get('name')),
        )
        if best_score is None or score > best_score:
            best_score = score
            best_match = elem
            best_reason = elem_reason
            best_label = elem_label

    if best_match:
        logger.debug(
            "[find_best_match] '%s' -> '%s' id=%s via=%s label='%s' score=%s",
            search_name,
            best_match.get('name'),
            best_match.get('id'),
            best_reason,
            best_label,
            best_score,
        )
    return best_match


class JimengParams(BaseModel):
    """即梦生成参数 - 前端直接发送, 不再依赖预存 video_config"""
    model_version: str       # seedance2.0 / seedance2.0_vip / seedance2.0fast / seedance2.0fast_vip / seedance2.0mini
    generation_mode: str     # text2video / image2video / multimodal2video
    ratio: str               # 16:9 / 9:16 / 1:1 / 4:3 / 3:4
    resolution: str          # 480P / 720P / 1080P
    duration: int            # 秒
    # 活动辅助参数：开启后，每次即梦 CLI 提交额外附带一段本地缓存的2秒纯黑参考视频。
    include_black_video: bool = False

    # v3.61.120: 兼容前端可能传 float / str ("15" / 15.0) 的情况
    # el-input-number 失焦偶尔变 float;localStorage 反序列化某些情况下变 string
    @field_validator('duration', mode='before')
    @classmethod
    def _coerce_duration(cls, v):
        if v is None:
            return 5  # 兜底默认 5s
        if isinstance(v, bool):
            return 5
        if isinstance(v, int):
            return v
        if isinstance(v, float):
            return int(round(v))
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return 5
            try:
                return int(round(float(s)))
            except Exception:
                raise ValueError(f"duration 无法解析为整数: {v!r}")
        raise ValueError(f"duration 类型不支持: {type(v).__name__}")


class VideoGenerateRequest(BaseModel):
    storyboard_id: int
    prompt: str
    # 以下两者二选一: params(新版直传) 或 video_config_id(老版查库)
    params: Optional[JimengParams] = None
    video_config_id: Optional[int] = None
    # 串行尾帧模式相关(均可选,不传走老逻辑)
    use_chain_frame: bool = False  # 是否把上一可接镜的尾帧作为参考图注入(用户在分镜面板上勾选状态)
    chain_frame_desc: Optional[str] = None  # 尾帧描述,前端可由用户编辑;不传时后端用默认文案


class BatchVideoGenerateRequest(BaseModel):
    storyboard_ids: List[int]
    params: Optional[JimengParams] = None
    video_config_id: Optional[int] = None
    # 串行尾帧模式总开关:开启后按 sort_order 严格串行,任一镜失败 → 后续全置 chain_aborted
    serial_chain_mode: bool = False
    # 用户在批量生成对话框里(若有)预填的 chain frame 描述;为空时各镜走默认文案
    chain_frame_desc: Optional[str] = None


class VideoPromptExportItem(BaseModel):
    """A storyboard prompt exactly as the video page would submit it."""

    storyboard_id: int
    prompt: str = ""


class VideoPromptExportRequest(BaseModel):
    """Build channel-ready prompt text without exposing the provider JSON payload."""

    items: List[VideoPromptExportItem]
    provider: str = "jimeng"
    use_chain_frame: bool = False
    chain_frame_desc: Optional[str] = None
    generation_mode: str = "multimodal2video"
    model_version: Optional[str] = None

    @field_validator("items")
    @classmethod
    def _validate_items(cls, value):
        if not value:
            raise ValueError("请至少选择一个分镜")
        if len(value) > 500:
            raise ValueError("一次最多导出 500 个分镜")
        ids = [item.storyboard_id for item in value]
        if len(ids) != len(set(ids)):
            raise ValueError("导出分镜中存在重复项")
        return value

    @field_validator("provider")
    @classmethod
    def _validate_provider(cls, value):
        provider = str(value or "").strip().lower()
        if provider not in {"jimeng", "pippit", "minimax", "ark", "cool", "xinglian"}:
            raise ValueError(f"不支持的导出渠道: {value}")
        return provider


# 串行尾帧默认描述(前端预填用,后端兜底)
DEFAULT_CHAIN_FRAME_DESC = "此图为上一视频的尾帧参考图,本镜从此画面故事的延续,保持场景与角色一致,不重新诠释画风/材质"
DEFAULT_TOPVIEW_START_PROMPT = "俯视人物调度图A:本镜开始时的人物站位与颜色框"
DEFAULT_TOPVIEW_END_PROMPT = "俯视人物调度图B:本镜结束时的人物站位与颜色框"
TOPVIEW_START_LABEL = DEFAULT_TOPVIEW_START_PROMPT
TOPVIEW_END_LABEL = DEFAULT_TOPVIEW_END_PROMPT


def _translate_jimeng_fail_reason(raw: str, guidance: str = "") -> str:
    """把即梦 dreamina-cli 返回的英文 fail_reason 翻译成中文友好提示。
    dreamina-cli 拿不到即梦官网 UI 那种详细审核结果(比如"音频可能包含不适当内容"),
    只能拿到粗粒度提示。我们按关键字推测最可能原因,引导用户去即梦官网查详细。
    """
    if not raw:
        return "视频生成失败,具体原因未知。建议前往即梦官网(jimeng.jianying.com)查看详情或重试"
    low = raw.lower()
    # 已知英文模式 → 中文
    # ★ 4010 AigcComplianceConfirmationRequired:一次性协议签署,不是本次内容问题
    if "4010" in raw or "aigccomplianceconfirmationrequired" in low:
        msg = (
            "即梦要求账号先完成「AIGC 合规授权」(一次性协议签署,不是本次内容问题)。\n"
            "解决步骤:\n"
            "  1) 浏览器打开 https://jimeng.jianying.com 登录你的即梦账号\n"
            "  2) 系统会弹出 AIGC 合规协议,点【同意/签署】\n"
            "  3) 回本工具点「检查登录状态」,然后重新生成即可\n"
            "签署只需做一次,以后所有视频都生效。"
        )
    # ★ 1310 ExceedConcurrencyLimit:即梦同账号并发任务数上限,等待已有任务完成再发
    elif "1310" in raw or "exceedconcurrencylimit" in low or "concurrency" in low:
        msg = (
            "即梦提示:同时跑的视频任务超过了账号并发上限(常见 1~3 个/账号)。\n"
            "怎么办:\n"
            "  1) 等已经在生成的几条跑完(到「即梦Web」可看进度),再点本工具「重新生成」\n"
            "  2) 长期想多跑:把生成模式从「并发」切到「串行尾帧」(顶部开关) — 一个完成才发下一个,不会撞并发\n"
            "(这是即梦平台的限制,不是工具问题)"
        )
    elif "post-tns" in low or "tns check" in low or "tns" in low:
        msg = (
            "即梦生成后的内容安全审核未通过(post-TNS),不是本地 CLI 调用失败。\n"
            "通常是画面、台词、音频或参考素材触发平台后置审核。建议弱化敏感词/暴力色情/未成年/真人脸风险,或换参考图后重试；"
            "也可以到即梦官网(jimeng.jianying.com)查看更细的审核反馈。"
        )
    elif "generation failed" in low or "final generation failed" in low:
        msg = (
            "视频生成失败,通常是即梦内容审核未通过(画面/音频/台词可能含不适当内容)。\n"
            "建议:1) 修改提示词或台词后重试  2) 前往即梦官网(jimeng.jianying.com)查看具体审核反馈"
        )
    elif (
        "upload resource" in low
        or "upload image" in low
        or "upload audio" in low
        or "no file upload" in low
        or "upload phase" in low
    ):
        msg = (
            "即梦素材上传失败,任务没有真正进入生成队列。\n"
            "这通常表示素材在上传阶段没有被即梦接收,不等同于账号积分或 4000 分限制。\n"
            "建议先减少参考素材数量,去掉非必要的人物/道具/场景图；再检查参考图/音频文件是否存在、能否正常打开、路径是否含特殊权限限制,然后重新生成。\n"
            f"原始错误:{raw[:200]}"
        )
    elif "aigccompliance" in low or "compliance" in low or "violat" in low:
        msg = "内容安全审核未通过(可能含敏感内容),请修改提示词或素材后重试"
    # ★ 1057 RateLimit / RateLimit1:即梦账号级 RPM 限流(跟 1310 并发上限不同,是请求频率上限)
    elif "1057" in raw or "ratelimit" in low or "rate limit" in low or "too many" in low or "限流" in raw:
        msg = (
            "即梦提示:调用过于频繁触发了平台 RPM 限流(账号每分钟请求次数上限)。\n"
            "怎么办:\n"
            "  1) 等 2-3 分钟让限流冷却,然后点「重新生成」\n"
            "  2) 如果是批量串行/并发跑很多个,请把「批量数」放小一点,或开「串行尾帧」模式排队跑\n"
            "  3) 这跟 1310(并发上限)不一样 — 1057 是「频率」限制,1310 是「同时跑几个」限制\n"
            "(平台限制,不是工具问题)"
        )
    elif "timeout" in low or "超时" in raw:
        msg = "即梦服务响应超时,请稍后重试"
    elif (
        "current account is not allowed to use dreamina_cli" in low
        or "not allowed to use dreamina_cli" in low
        or ("dreamina_cli" in low and "permission denied" in low)
        or "未开通即梦 cli 生成权限" in low
    ):
        msg = (
            "当前即梦账号已完成网页授权，但即梦平台未给该账号开放 CLI 视频生成权限。\n"
            "网页显示高级会员或有会员积分，不等于 dreamina_cli 权限已经开通。\n"
            "请点页面顶部「切换账号」，在独立登录窗口中换一个已开放 CLI 权限的账号；"
            "若确认该账号本应可用，请联系即梦官方核查账号权限。"
        )
    elif "credit" in low or "balance" in low or "余额" in raw or "积分" in raw:
        msg = "即梦余额不足,请到即梦充值后重试"
    elif "param" in low or "参数" in raw:
        msg = f"提交参数不正确:{raw[:200]}"
    else:
        # 完全不认识的英文,给通用提示但不丢原文(便于后续排查)
        msg = (
            f"视频生成失败:{raw[:200]}\n"
            f"建议前往即梦官网(jimeng.jianying.com)查看具体审核反馈"
        )
    if guidance:
        msg += f"\n👉 即梦建议:{guidance}"
    return msg


def _normalize_chain_scene_name(value: Any) -> str:
    """接尾帧用的物理场景名归一化,忽略拆分产生的「(续2)」后缀。"""
    text = str(value or "").strip()
    return re.sub(r"\s*[\(（]\s*续\s*\d*\s*[\)）]\s*$", "", text).strip()


async def find_chainable_prev_frame(storyboard_id: int) -> Optional[dict]:
    """寻找当前镜可接的上一镜尾帧。

    判定规则(按 sort_order 倒序找最近 video_status='done' 的镜,然后判断):
      1. 上镜 section_number == 当前镜 section_number → 同节,直接接 ✅
      2. 上镜 section_number != 当前镜 section_number 但
         上镜 scenes[0] == 当前镜 scenes[0] → 跨节同场景(剧本拆分),接 ✅
      3. 其他情况(真换场景) → 不接 ❌

    返回:
      {"storyboard_id": int, "section_label": "#1-2", "frame_path": "/data/frames/..."}
      或 None(找不到 / 上镜无尾帧 / 跨场景)
    """
    db = await get_db()
    try:
        # 当前镜
        # ★ 修复 v3.59.39:SELECT 必须包含 scene_index,否则下面 cur["scene_index"] 拿不到
        # ★ v3.59.55:SELECT 包含 scene_type — 接帧只接同 type(主线只接主线,回忆只接回忆),
        #   跟人物状态累积逻辑(storyboards.py:666-686)一致
        cursor = await db.execute(
            "SELECT id, novel_id, script_id, sort_order, section_number, scene_index, scene_type, scenes "
            "FROM storyboards WHERE id = ?",
            (storyboard_id,)
        )
        cur = await cursor.fetchone()
        if not cur:
            return None
        cur_scenes = []
        try:
            cur_scenes = json.loads(cur["scenes"] or "[]")
        except Exception:
            cur_scenes = []
        cur_scene_type = (cur["scene_type"] if "scene_type" in cur.keys() else None) or "normal"

        # 找紧邻同 type 上一镜(不限制 video_status,真正的"语义紧邻"按 scene_type 过滤后倒序第一条)
        # v3.59.21~28 老 bug:WHERE sort_order < 0(跨场景时新场景第一节 sort_order=0)永远空集
        # v3.59.55:加 scene_type 过滤 — 主线/回忆/平行/梦境/幻觉 各自时间线独立,中间塞回忆/平行不算紧邻
        # v3.59.77:不再"跳过失败找前一个 done",改为直接取紧邻同 type 的那一条
        #          紧邻是 done → 接(原行为)
        #          紧邻是 failed/aborted/queued/generating/pending → 链路断,不接(用户预期:失败的链路必须先修好才能续)
        # v3.61.112: 多 SELECT last_frame_volc_asset_uri / status,给 chain-frame 加白绑定用
        cur_scene_idx = cur["scene_index"] if "scene_index" in cur.keys() else None
        if cur_scene_idx is None:
            cursor = await db.execute(
                "SELECT id, sort_order, section_number, scene_index, scene_type, scenes, "
                "       last_frame_path, video_status, video_url, "
                "       last_frame_volc_asset_uri, last_frame_volc_asset_status "
                "FROM storyboards "
                "WHERE novel_id = ? AND script_id IS ? AND sort_order < ? "
                "  AND COALESCE(scene_type, 'normal') = ? "
                "ORDER BY sort_order DESC LIMIT 1",
                (cur["novel_id"], cur["script_id"], cur["sort_order"], cur_scene_type)
            )
        else:
            cursor = await db.execute(
                "SELECT id, sort_order, section_number, scene_index, scene_type, scenes, "
                "       last_frame_path, video_status, video_url, "
                "       last_frame_volc_asset_uri, last_frame_volc_asset_status "
                "FROM storyboards "
                "WHERE novel_id = ? AND script_id IS ? AND scene_index IS NOT NULL "
                "  AND ("
                "    scene_index < ?"
                "    OR (scene_index = ? AND section_number < ?)"
                "    OR (scene_index = ? AND section_number = ? AND sort_order < ?)"
                "  ) "
                "  AND COALESCE(scene_type, 'normal') = ? "
                "ORDER BY scene_index DESC, section_number DESC, sort_order DESC LIMIT 1",
                (
                    cur["novel_id"], cur["script_id"],
                    cur_scene_idx,
                    cur_scene_idx, cur["section_number"],
                    cur_scene_idx, cur["section_number"], cur["sort_order"],
                    cur_scene_type,
                )
            )
        prev = await cursor.fetchone()
        if not prev:
            return None
        # v3.59.77:紧邻镜状态判定 — 失败/未完成 → 链路断,不接尾帧
        prev_status = (prev["video_status"] if "video_status" in prev.keys() else None) or "pending"
        if prev_status != "done":
            logger.info(
                f"[chain-prev] 当前镜 {storyboard_id} 紧邻同 type 镜 {prev['id']} 状态 {prev_status},"
                f"链路断(不再跳过失败找前一个 done),返回 None"
            )
            return None
        if not prev["last_frame_path"]:
            return None

        # 判定可接性
        # ★ v3.59.52 修复:section_number 是每个场景内从 1 重新编号的,
        #   只比 section_number 会让所有不同场景的 #X-1 都被判为"同节",
        #   导致跨场景错误接帧。必须 (scene_index, section_number) 一起比。
        prev_scene_idx = prev["scene_index"] if "scene_index" in prev.keys() else None
        same_section = (
            prev_scene_idx is not None
            and cur_scene_idx is not None
            and prev_scene_idx == cur_scene_idx
            and prev["section_number"] == cur["section_number"]
        )
        connectable = same_section
        if not connectable:
            try:
                prev_scenes = json.loads(prev["scenes"] or "[]")
            except Exception:
                prev_scenes = []
            # 跨节但同物理场景(剧本拆分)— scenes[0] 是完整场景描述。
            # 分镜拆分会把同一物理场景标成「外 陈州祭台 日 (续2)」这类续场景,
            # 接尾帧时应按去掉续集后缀后的场景名比较。
            if (
                prev_scenes
                and cur_scenes
                and _normalize_chain_scene_name(prev_scenes[0]) == _normalize_chain_scene_name(cur_scenes[0])
            ):
                connectable = True
        if not connectable:
            return None

        # 文件存在性校验
        from utils.paths import get_data_dir
        data_base = os.path.dirname(get_data_dir())
        abs_path = os.path.normpath(os.path.join(data_base, prev["last_frame_path"].lstrip("/")))
        if not os.path.exists(abs_path):
            return None

        # v3.59.58:同时返 scene_index,前端可拼 #X-Y 完整镜号(如 #8-2)
        # 老版本只返 section_number,前端显示 "#2" 容易被误解为 #2-1
        prev_scene_idx_out = prev["scene_index"] if "scene_index" in prev.keys() else None
        # v3.61.57: 追加 video_url 给前端做 cache-buster
        #   原因:上一镜重新生成视频 → last_frame_path 文件内容变了但 string 没变,
        #         前端 getFrameThumbSrcByStoryboardId 只看 frameForceBust 做 buster,
        #         用户没转彩铅/恢复时该 buster 一直空,浏览器永远走缓存看老尾帧
        #   修法:返 video_url,video_url 重新生成必变 → 前端可用 url 末尾片段做 buster
        prev_video_url = prev["video_url"] if "video_url" in prev.keys() else None
        # v3.61.58: 单 video_url 不够 — 转彩铅/恢复原图不改 video_url 但改 last_frame_path 文件,
        #   且 frameForceBust 跨 session 会丢(它是内存 ref,重启 app 清空)→ 重启后浏览器还是走缓存
        #   修法:返 last_frame_mtime(文件修改时间戳),覆盖任何修改尾帧文件的操作
        try:
            last_frame_mtime = int(os.path.getmtime(abs_path))
        except Exception:
            last_frame_mtime = None
        # v3.61.112: 透出 last_frame_volc_asset_uri/status,让 _collect_storyboard_assets_for_ark 用 asset://
        _lf_volc_uri = prev["last_frame_volc_asset_uri"] if "last_frame_volc_asset_uri" in prev.keys() else None
        _lf_volc_status = prev["last_frame_volc_asset_status"] if "last_frame_volc_asset_status" in prev.keys() else None
        return {
            "storyboard_id": prev["id"],
            "scene_index": prev_scene_idx_out,
            "section_number": prev["section_number"],
            "frame_path": prev["last_frame_path"],
            "video_url": prev_video_url,
            "last_frame_mtime": last_frame_mtime,
            "last_frame_volc_asset_uri": _lf_volc_uri,
            "last_frame_volc_asset_status": _lf_volc_status,
        }
    finally:
        await db.close()


async def find_chainable_prev_topview(storyboard_id: int) -> Optional[dict]:
    """寻找当前镜可接的上一小节结尾俯视调度图。

    和尾帧不同,俯视链不要求上一镜视频已完成,只要求紧邻上一小节已生成
    topview_image,且仍在同一物理场景内。跨场景直接断链。
    """
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, novel_id, script_id, sort_order, section_number, scene_index, scene_type, scenes "
            "FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        cur = await cursor.fetchone()
        if not cur:
            return None
        try:
            cur_scenes = json.loads(cur["scenes"] or "[]")
        except Exception:
            cur_scenes = []
        cur_scene_type = (cur["scene_type"] if "scene_type" in cur.keys() else None) or "normal"
        cur_scene_idx = cur["scene_index"] if "scene_index" in cur.keys() else None

        if cur_scene_idx is None:
            cursor = await db.execute(
                "SELECT id, sort_order, section_number, scene_index, scene_type, scenes, topview_image, topview_prompt, topview_dispatch_text "
                "FROM storyboards "
                "WHERE novel_id = ? AND script_id IS ? AND sort_order < ? "
                "  AND COALESCE(scene_type, 'normal') = ? "
                "ORDER BY sort_order DESC LIMIT 1",
                (cur["novel_id"], cur["script_id"], cur["sort_order"], cur_scene_type),
            )
        else:
            cursor = await db.execute(
                "SELECT id, sort_order, section_number, scene_index, scene_type, scenes, topview_image, topview_prompt, topview_dispatch_text "
                "FROM storyboards "
                "WHERE novel_id = ? AND script_id IS ? AND scene_index IS NOT NULL "
                "  AND ("
                "    scene_index < ?"
                "    OR (scene_index = ? AND section_number < ?)"
                "    OR (scene_index = ? AND section_number = ? AND sort_order < ?)"
                "  ) "
                "  AND COALESCE(scene_type, 'normal') = ? "
                "ORDER BY scene_index DESC, section_number DESC, sort_order DESC LIMIT 1",
                (
                    cur["novel_id"], cur["script_id"],
                    cur_scene_idx,
                    cur_scene_idx, cur["section_number"],
                    cur_scene_idx, cur["section_number"], cur["sort_order"],
                    cur_scene_type,
                ),
            )
        prev = await cursor.fetchone()
        if not prev or not prev["topview_image"]:
            return None

        prev_scene_idx = prev["scene_index"] if "scene_index" in prev.keys() else None
        connectable = prev_scene_idx is not None and cur_scene_idx is not None and prev_scene_idx == cur_scene_idx
        if not connectable:
            try:
                prev_scenes = json.loads(prev["scenes"] or "[]")
            except Exception:
                prev_scenes = []
            connectable = bool(
                prev_scenes
                and cur_scenes
                and _normalize_chain_scene_name(prev_scenes[0]) == _normalize_chain_scene_name(cur_scenes[0])
            )
        if not connectable:
            return None

        abs_path = resolve_db_path(prev["topview_image"])
        if not abs_path or not os.path.exists(abs_path):
            logger.info("[topview-chain] 当前镜 %s 上一镜 %s 有 topview 但文件不存在:%s", storyboard_id, prev["id"], abs_path)
            return None
        return {
            "storyboard_id": prev["id"],
            "scene_index": prev_scene_idx,
            "section_number": prev["section_number"],
            "image_path": prev["topview_image"],
            "abs_path": abs_path,
            "topview_prompt": prev["topview_prompt"],
            "dispatch_text": prev["topview_dispatch_text"] if "topview_dispatch_text" in prev.keys() else None,
        }
    finally:
        await db.close()


@router.get("/active-tasks")
async def list_active_video_tasks():
    """v3.61.23: 跨章节、跨小说扫一遍 storyboards,返回所有"真正还在跑"的分镜
    用于前端批量生成按钮判断:有任何活动任务时,拒绝再次提交,避免同分镜被即梦提交多次。

    过滤规则(跟 /generate 的 30 分钟去重窗口对齐):
      - generating + submit_time 在 30 分钟内 → 算活动(用户可能正在跑)
      - generating + submit_time 超过 30 分钟 → 视为僵尸,不挡(避免老 session 残留永久封锁按钮)
      - queued → 30 分钟内的等待任务算活动;或同一剧本内有近期 generating 时算活动
                  老崩溃残留 queued 超过 30 分钟后不挡按钮
    """
    from utils.timezone import now_beijing_str
    now_str = now_beijing_str()
    db = await get_db()
    try:
        cursor = await db.execute(
            """
            WITH recent_generating AS (
              SELECT id, script_id
              FROM storyboards
              WHERE video_status = 'generating'
                AND video_submit_time IS NOT NULL
                AND datetime(replace(video_submit_time, ' ', 'T'))
                    > datetime(replace(?, ' ', 'T'), '-30 minutes')
            )
            SELECT s.id, s.video_status, s.scene_index, s.section_number, s.sort_order,
                   s.video_submit_time, s.script_id, scr.chapter_id,
                   ch.title AS chapter_title, ch.novel_id, n.name AS novel_name
            FROM storyboards s
            LEFT JOIN scripts scr ON s.script_id = scr.id
            LEFT JOIN chapters ch ON scr.chapter_id = ch.id
            LEFT JOIN novels n ON ch.novel_id = n.id
            WHERE
              s.id IN (SELECT id FROM recent_generating)
              OR (
                s.video_status = 'queued'
                AND (
                  (
                    s.video_submit_time IS NOT NULL
                    AND datetime(replace(s.video_submit_time, ' ', 'T'))
                        > datetime(replace(?, ' ', 'T'), '-30 minutes')
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM recent_generating rg
                    WHERE rg.script_id = s.script_id
                       OR (rg.script_id IS NULL AND s.script_id IS NULL)
                  )
                )
              )
            ORDER BY s.video_submit_time DESC, s.id ASC
            LIMIT 50
            """,
            (now_str, now_str),
        )
        rows = await cursor.fetchall()
        items = []
        for r in rows:
            scene = r["scene_index"] if r["scene_index"] is not None else "?"
            section = r["section_number"] if r["section_number"] is not None else "?"
            label = f"#{scene}-{section}"
            items.append({
                "storyboard_id": r["id"],
                "label": label,
                "status": r["video_status"],
                "novel_name": r["novel_name"] or "未知小说",
                "chapter_title": r["chapter_title"] or "未知章节",
                "submit_time": r["video_submit_time"],
            })
        return {
            "success": True,
            "count": len(items),
            "generating_count": sum(1 for x in items if x["status"] == "generating"),
            "queued_count": sum(1 for x in items if x["status"] == "queued"),
            "items": items,
        }
    finally:
        await db.close()


@router.post("/check-login")
async def check_login(force: bool = False):
    """检查即梦CLI登录状态和余额"""
    result = await video_service.check_login(force=force)
    
    # 解析结果，转换为前端期望的格式
    if result.get("success"):
        data = result.get("data", {})
        if isinstance(data, dict) and data.get("_identity_unverified"):
            return {
                "success": True,
                "logged_in": True,
                "balance": 0,
                "cli_permission": "unknown",
                "can_generate": True,
                "identity_unverified": True,
                "message": data.get("_identity_unverified_message")
                or "网页授权完成，但 CLI 未取得账号身份，真实余额未知；可尝试提交生成",
            }
        # dreamina user_credit 返回的格式: {"vip_credit": 6194, "gift_credit": 0, "purchase_credit": 0, "total_credit": 6194}
        if isinstance(data, dict) and "total_credit" in data:
            cli_permission = str(data.get("_cli_permission") or "available")
            permission_message = str(data.get("_cli_permission_message") or "")
            balance = data.get("total_credit", 0)
            if cli_permission == "denied":
                message = permission_message or "已授权，但当前账号没有即梦 CLI 生成权限"
            elif cli_permission == "unknown":
                message = permission_message or "已授权，CLI 余额为 0，生成权限待验证"
            else:
                message = f"已登录，余额: {balance}"
            return {
                "success": True,
                "logged_in": True,
                "balance": balance,
                "cli_permission": cli_permission,
                "can_generate": cli_permission != "denied",
                "message": message,
            }
        else:
            # 如果返回格式不符合预期，可能是未登录
            return {
                "success": True,
                "logged_in": False,
                "balance": 0,
                "message": "未登录或登录已过期"
            }
    else:
        # 命令执行失败不等同于退出登录。只有 CLI 明确返回登录失效时才确认
        # logged_in=False；超时、锁等待、进程异常等瞬态错误交给前端保留
        # 最近一次已确认状态，避免路由切换时闪成“未登录”。
        error_msg = result.get("error", "检查登录状态失败")
        error_text = str(error_msg or "")
        error_lower = error_text.lower()
        confirmed_logged_out = (
            "dreamina login" in error_lower
            or "未检测到有效登录" in error_text
            or "请先登录" in error_text
        )
        if confirmed_logged_out:
            error_text = "未登录，请点击上方“登录即梦”按钮进行授权"
            return {
                "success": True,
                "logged_in": False,
                "balance": 0,
                "message": error_text,
            }
        return {
            "success": False,
            "logged_in": False,
            "transient": True,
            "message": error_text,
        }


@router.post("/login")
async def login_jimeng():
    """启动即梦CLI登录流程（会打开浏览器）"""
    result = await video_service.login()
    return result


@router.post("/relogin")
async def relogin_jimeng():
    """切换即梦账号:清旧凭证 + 重新打开浏览器登录"""
    result = await video_service.relogin()
    return result


# v3.61.6 火山方舟单条提交(非队列路径)— 跟 /generate 对等,但走 VolcengineArkProvider
class ArkSubmitRequest(BaseModel):
    storyboard_id: int
    prompt: str
    config_id: int  # 火山方舟视频配置 id (云端 llm_configs)
    params: Optional[dict] = None
    use_chain_frame: bool = False  # v3.61.12: 串行尾帧
    # v3.61.107: 企业自持 APIKey(可选,明文,用完即丢)
    # 前端从 safeStorage 解密后塞过来,后端用它覆盖云端 cloud_cfg["apiKey"]
    # 留空 → 降级用云端 APIKey
    local_api_key: Optional[str] = None
    # New API 仅接受公网 URL。桌面端通过受控 OSS 临时上传完成后把 URL
    # 透传到这里；未传时 provider 会明确说明哪些本地素材尚未发布。
    uploaded_images: Optional[List[str]] = None
    uploaded_audios: Optional[List[str]] = None
    uploaded_videos: Optional[List[str]] = None
    first_frame_url: Optional[str] = None
    last_frame_url: Optional[str] = None


class NewApiPrepareAssetsRequest(BaseModel):
    storyboard_id: int
    config_id: int
    use_chain_frame: bool = False


def _newapi_upload_asset(value: str, kind: str) -> Dict[str, str]:
    source = str(value or "").strip()
    if source.startswith(("http://", "https://")):
        return {"url": source, "kind": kind}
    # DB 中同时存在两种历史格式：/data/images/... 与 data/images/....
    # 后一种若交给 abspath() 会被解析到后端的当前工作目录；安装/升级后
    # 工作目录可变，导致 UI 能预览本机媒体但 NewAPI 上传阶段误报“找不到素材”。
    # 两种 data 路径都必须从用户数据/媒体目录解析，而不是从安装目录解析。
    path = resolve_db_path(source) if source.startswith(("/data/", "data/")) else os.path.abspath(source)
    if not os.path.isfile(path):
        return {"error": f"找不到{kind}素材文件: {source}", "kind": kind}
    mime_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return {"path": path, "kind": kind, "mime_type": mime_type}


@router.post("/newapi/prepare-assets")
async def prepare_newapi_assets(request: NewApiPrepareAssetsRequest):
    """Return local storyboard asset metadata only when this is a New API config.

    The Electron main process consumes the returned local paths and uploads the
    bytes directly to OSS through its authenticated IPC bridge.  This FastAPI
    process never receives account cookies or OSS credentials.
    """
    try:
        from services.llm_service import LLMService
        # Negative ids are desktop-only official capability markers.  They
        # contain no endpoint/key but use the same signed OSS upload bridge as
        # NewAPI, so raw local paths never leave the desktop process.
        official_video = int(request.config_id) in {-900004, -900005}
        config = await LLMService.get_by_id(request.config_id, local_only=True) if not official_video else None
        if not official_video and (not config or config.get("config_type") != "video"):
            return {"active": False}
        normalized = {
            "baseUrl": config.get("base_url"), "modelName": config.get("model_name"),
            "providerCode": config.get("provider_code"), "name": config.get("name"),
        } if config else {"providerCode": "newapi"}
        if not official_video and _infer_cloud_provider(normalized) != "newapi":
            return {"active": False}
        images, audios, _, _ = await _collect_storyboard_assets_for_ark(
            request.storyboard_id,
            use_chain_frame=request.use_chain_frame,
            provider_type="newapi",
        )
        prepared_images = [_newapi_upload_asset(item, "image") for item in images]
        prepared_audios = [_newapi_upload_asset(item, "audio") for item in audios]
        failures = [item["error"] for item in prepared_images + prepared_audios if item.get("error")]
        if failures:
            return {"active": True, "success": False, "message": "；".join(failures[:3])}
        return {
            "active": True,
            "success": True,
            "images": prepared_images,
            "audios": prepared_audios,
            "videos": [],
        }
    except Exception as exc:
        logger.exception(f"[newapi/prepare-assets] sb={request.storyboard_id} 失败: {exc}")
        return {"active": True, "success": False, "message": f"准备 New API 素材失败: {type(exc).__name__}: {exc}"}


class PippitSubmitRequest(BaseModel):
    storyboard_id: int
    prompt: str
    params: Optional[dict] = None
    use_chain_frame: bool = False


class PippitConfigSaveRequest(BaseModel):
    access_key: str = ""


class MiniMaxSubmitRequest(BaseModel):
    storyboard_id: int
    prompt: str
    params: Optional[dict] = None
    # H3 的 r2va 不能混 first_frame/last_frame；开启后上一镜尾帧仅作为 reference_image。
    use_chain_frame: bool = False


class MiniMaxConfigSaveRequest(BaseModel):
    api_key: str = ""


def _normalize_minimax_resolution(value: Any) -> str:
    """Preserve the UI choice while supplying H3's historical 2K default."""
    return str(value or "2K").upper()


@router.get("/pippit/config")
async def get_pippit_config():
    env_key = _env_pippit_access_key()
    local_key = (await _get_app_setting(PIPPIT_ACCESS_KEY_SETTING)).strip()
    active_key = env_key or local_key
    return {
        "success": True,
        "has_access_key": bool(active_key),
        "has_env_access_key": bool(env_key),
        "has_local_access_key": bool(local_key),
        "access_key_masked": _mask_secret(active_key),
    }


@router.post("/pippit/config")
async def save_pippit_config(req: PippitConfigSaveRequest):
    access_key = (req.access_key or "").strip()
    await _set_app_setting(PIPPIT_ACCESS_KEY_SETTING, access_key)
    logger.info(
        "[pippit/config] access_key=%s",
        "configured" if access_key else "cleared",
    )
    return {
        "success": True,
        "message": "小云雀 Access Key 已保存" if access_key else "小云雀 Access Key 已清空",
        "has_access_key": bool(access_key or _env_pippit_access_key()),
        "has_env_access_key": bool(_env_pippit_access_key()),
        "has_local_access_key": bool(access_key),
        "access_key_masked": _mask_secret(_env_pippit_access_key() or access_key),
    }


@router.post("/pippit/check")
async def check_pippit_cli():
    from services.video_providers import get_provider

    provider = get_provider("pippit_cli", await _pippit_provider_config())
    result = await provider.check_login()
    has_key = bool(await _get_pippit_access_key())
    return {
        "success": bool(result.get("success")),
        "message": result.get("message") or result.get("error") or "",
        "cli_found": bool(result.get("cli_found")),
        "logged_in": bool(result.get("logged_in")),
        "has_access_key": has_key,
        "access_key_masked": _mask_secret(await _get_pippit_access_key()),
    }


@router.get("/minimax/config")
async def get_minimax_config():
    env_key = _env_minimax_api_key()
    local_key = (await _get_app_setting(MINIMAX_API_KEY_SETTING)).strip()
    active_key = env_key or local_key
    return {
        "success": True,
        "has_api_key": bool(active_key),
        "has_env_api_key": bool(env_key),
        "has_local_api_key": bool(local_key),
        "api_key_masked": _mask_secret(active_key),
        "model": "MiniMax-H3",
        "resolution": "2K",
    }


@router.post("/minimax/config")
async def save_minimax_config(req: MiniMaxConfigSaveRequest):
    api_key = (req.api_key or "").strip()
    await _set_app_setting(MINIMAX_API_KEY_SETTING, api_key)
    logger.info("[minimax/config] api_key=%s", "configured" if api_key else "cleared")
    active_key = _env_minimax_api_key() or api_key
    return {
        "success": True,
        "message": "MiniMax API Key 已保存" if api_key else "MiniMax API Key 已清空",
        "has_api_key": bool(active_key),
        "has_env_api_key": bool(_env_minimax_api_key()),
        "has_local_api_key": bool(api_key),
        "api_key_masked": _mask_secret(active_key),
        "model": "MiniMax-H3",
        "resolution": "2K",
    }


@router.post("/minimax/check")
async def check_minimax_config():
    """只检查本机是否已配置凭证，不创建付费视频任务。"""
    from services.video_providers import get_provider

    provider = get_provider("minimax_h3", await _minimax_provider_config())
    result = await provider.check_login()
    active_key = await _get_minimax_api_key()
    return {
        "success": bool(result.get("success")),
        "logged_in": bool(result.get("logged_in")),
        "has_api_key": bool(active_key),
        "api_key_masked": _mask_secret(active_key),
        "message": result.get("message") or "",
        "model": "MiniMax-H3",
        "resolution": "2K",
    }


@router.post("/ark/submit")
async def ark_submit(request: ArkSubmitRequest):
    """火山方舟单条提交,前端串行循环用(不走全局队列)

    返回 {success, submit_id, message}
    成功后 storyboard.video_status='generating' + submit_id 已写入,
    前端走 poll-status 轮询(poll-status 按 video_provider 路由会自动走 ark 查询)
    """
    from services.video_providers import get_provider
    from services.cloud_llm_sync import get_active_config

    sb_id = request.storyboard_id

    # 1. 原子判重 + 占位(跟 /generate 一致)
    # 火山方舟 provider.submit() 是 inline await(5~30 秒等审核),如果不预占位,
    # 整个 submit 窗口里 status 还是 failed/pending,并发请求全都过去重 → 重复扣费
    # v3.61.23 重写:_try_claim 一条 SQL 同时做"判重 + 占位",并发安全
    claim = await _try_claim_storyboard_for_submit(sb_id, provider="volcengine_ark")
    if not claim["claimed"]:
        if claim.get("not_found"):
            return {"success": False, "message": "分镜不存在"}
        elapsed = claim.get("blocked_minutes", -1)
        return {
            "success": False,
            "duplicate": True,
            "message": f"该分镜已有任务在生成({elapsed} 分钟前),拒绝重复提交",
        }

    # ★ 占位之后必须用 try/except 兜底,中间任何异常都要把 status 退回 failed,
    # 不然会留下"卡死的 generating"被去重逻辑挡住后续提交
    try:
        # 2. 取火山方舟配置
        try:
            cloud_cfg = await get_active_config(config_id=request.config_id, config_type="video")
        except Exception:
            # Self-configured New API entries live only in the encrypted local
            # config database.  Falling back here keeps them independent of the
            # account server and avoids the historical account_required error.
            cloud_cfg = None
            try:
                from services.llm_service import LLMService
                local_cfg = await LLMService.get_by_id(request.config_id, local_only=True)
                if local_cfg and local_cfg.get("config_type") == "video":
                    cloud_cfg = {
                        "id": local_cfg.get("id"),
                        "name": local_cfg.get("name"),
                        "baseUrl": local_cfg.get("base_url"),
                        "apiKey": local_cfg.get("api_key"),
                        "modelName": local_cfg.get("model_name"),
                        "providerCode": local_cfg.get("provider_code"),
                        "extraParams": local_cfg.get("extra_params") or {},
                        "_local_only": True,
                    }
            except Exception as local_error:
                logger.warning(f"[cloud/submit] sb={sb_id} 本地视频配置读取失败: {local_error}")

        if not cloud_cfg:
            await storyboard_service.update_video_status(
                sb_id,
                "failed",
                fail_reason="当前选择的视频模型配置已失效",
            )
            return {
                "success": False,
                "message": (
                    "当前选择的视频模型配置已失效或不属于当前账号，请返回视频页重新选择对应渠道配置；"
                    "若无可选项，请先在千山AI个人中心配置视频模型"
                ),
            }

        # v3.61.170: 提前算 _resolved_provider_type — 传给 collect 让 asset:// 按 provider 分流
        #   cool 不认 asset://,collect 必须降级用原本地图(否则角色加白图会丢)
        # v3.61.173: 加 xinglian(星链云 SD2)friendly 文案
        _resolved_provider_type = _infer_cloud_provider(cloud_cfg)
        _provider_friendly = PROVIDER_FRIENDLY.get(_resolved_provider_type, _resolved_provider_type)

        # 3. 收集图片/音频(从 storyboard 关联元素 + 尾帧 + 自定义参考图)
        # v3.61.110: 同时拿 image_labels — 用于拼 @image1 / @image2 角色绑定
        # v3.61.111: 同时拿 audio_labels — 用于拼 @audio1 / @audio2,跟同名 @imageN 绑同一角色
        # v3.61.135: 种菜模式 — 先调统一 helper 把非说话人写进 excluded_audios + 返回最新集合
        #            collect 函数从 DB 读 excluded_audios 自动应用,行为跟即梦路径对称
        await _apply_speaker_filter_to_storyboard(sb_id, request.prompt or "")
        images, audios, image_labels, audio_labels = await _collect_storyboard_assets_for_ark(
            sb_id, use_chain_frame=request.use_chain_frame,
            prompt_for_speakers=request.prompt or "",
            provider_type=_resolved_provider_type,
        )
        if _resolved_provider_type == "newapi":
            # The New API relay cannot read local desktop paths.  The renderer
            # uploads selected assets directly to OSS first and sends their
            # short-lived read URLs here.  Keep source labels for prompt
            # binding, but swap only the provider payload values.
            uploaded_images = [str(item).strip() for item in (request.uploaded_images or []) if str(item or "").strip()]
            uploaded_audios = [str(item).strip() for item in (request.uploaded_audios or []) if str(item or "").strip()]
            if uploaded_images:
                images = uploaded_images
            if uploaded_audios:
                audios = uploaded_audios

        # v3.61.181: 统一调 helper,跟即梦 CLI / cool / xinglian 完全对齐
        #   流程:_strip_llm_metadata 剥 🔗 + 📏 → style_prefix → storyboard_style → start_state → file_refs(分号拼) → stripped prompt → style_suffix
        #   不再加 @image/@audio token(v3.61.118 已经禁,helper 也不加)
        # image_labels / audio_labels 是 list of {"name","kind"},helper 已 dict 兼容
        final_prompt = await _build_final_video_prompt(
            storyboard_id=sb_id,
            raw_prompt=request.prompt or "",
            image_items=image_labels[:9],
            audio_items=audio_labels[:3],
            with_file_refs=True,
            log_prefix="ark/submit",
            ref_at=(_resolved_provider_type == "cool"),  # v3.61.214: 仅 cool 用 @图片N / @音频N
            provider_type=_resolved_provider_type,
        )

        # v3.61.41: 提交前预校验音频总时长 — 火山方舟 r2v 要求音频总时长 ≤ 视频时长
        # 调 API 失败也得 5-30 秒,本地 ffprobe 算下时长直接拦能省很多时间和审核额度
        try:
            _vid_dur = int((request.params or {}).get("duration") or 0)
            if not _vid_dur:
                _sec = _extract_section_duration(request.prompt or "")
                _vid_dur = int(_sec) if _sec else 12  # fallback 默认 12s
            _audio_total = _sum_audio_duration_seconds(audios) if audios else 0
            if _audio_total > _vid_dur + 0.2:
                msg = (
                    f"参考音频总时长 {_audio_total:.1f}s 超过视频时长 {_vid_dur}s — "
                    f"火山方舟要求音频总时长 ≤ 视频时长。\n"
                    "解决方法:\n"
                    "  1) 缩短或删除该分镜的参考音频\n"
                    f"  2) 把视频时长调到 ≥ {int(_audio_total)+1} 秒\n"
                    "  3) 不需要语音同步可关掉「合同步音频」选项"
                )
                await storyboard_service.update_video_status(sb_id, "failed", fail_reason=msg)
                return {"success": False, "message": msg, "error_code": "INVALID_PARAM"}
        except Exception as _pre_err:
            logger.warning(f"[ark/submit] sb={sb_id} 预校验音频时长失败(忽略): {_pre_err}")

        # 4. 调 cloud provider 提交
        # v3.61.107: 企业自持 APIKey 覆盖逻辑 — 本地有就用本地的,没有降级用云端的
        # model_name / base_url / extra_params 永远走云端(用户在千山 AI 个人中心选模型)
        # v3.61.169 + 170: _resolved_provider_type / _provider_friendly 已在 collect 之前算了,直接复用

        # v3.61.169: local_api_key 只对 ARK 有效(企业火山 AK/SK 解出来的 sk-volc)
        # cool 的 key 是 cool 网关自己的 sk-,跟火山完全不同源 → cool 路径忽略 local_api_key,永远走云端
        # v3.61.173: 统一收口 — 凡是 provider != volcengine_ark,一律忽略 local_api_key
        #   走云端配置 key(cool / xinglian / 未来其他中转都适用)
        _local_key = (request.local_api_key or "").strip()
        _cloud_key = (cloud_cfg.get("apiKey") or "").strip()
        if _resolved_provider_type != "volcengine_ark":
            _final_api_key = _cloud_key
            _key_source = f"云端默认({_provider_friendly} 不接受企业本地 APIKey 覆盖)"
        else:
            _final_api_key = _local_key or _cloud_key
            _key_source = "企业本地(覆盖云端)" if _local_key else "云端默认"
        if not _final_api_key:
            await storyboard_service.update_video_status(sb_id, "failed",
                fail_reason=f"{_provider_friendly} APIKey 未配置:云端为空且本地也没配企业 APIKey")
            return {"success": False, "message": f"请在千山 AI 个人中心配置 {_provider_friendly} APIKey,或在设置页配置企业 APIKey"}
        logger.info(
            f"[cloud/submit] sb={sb_id} provider={_resolved_provider_type} APIKey 来源: {_key_source}"
        )

        provider = get_provider(_resolved_provider_type, {
            "id": cloud_cfg.get("id"),
            "name": cloud_cfg.get("name"),
            "base_url": cloud_cfg.get("baseUrl"),
            "api_key": _final_api_key,
            "model_name": cloud_cfg.get("modelName"),
            "provider_code": cloud_cfg.get("providerCode"),
            "extra_params": cloud_cfg.get("extraParams") or {},
        })

        # v3.61.11: 按 prompt 里的 "📏 本小节总时长" 覆盖 duration(跟队列 worker / 即梦路径一致)
        final_params = dict(request.params or {})
        if _resolved_provider_type == "newapi":
            final_params["reference_videos"] = [str(item).strip() for item in (request.uploaded_videos or []) if str(item or "").strip()]
            if request.first_frame_url:
                final_params["first_frame_url"] = request.first_frame_url.strip()
            if request.last_frame_url:
                final_params["last_frame_url"] = request.last_frame_url.strip()
        try:
            sec_dur = _extract_section_duration(request.prompt or "")
            if sec_dur is not None:
                old_dur = final_params.get("duration")
                if old_dur != sec_dur:
                    logger.info(
                        f"[ark/submit] sb={sb_id} 按小节时长自动调整 duration: "
                        f"{old_dur} -> {sec_dur}"
                    )
                final_params["duration"] = sec_dur
        except Exception as _e:
            logger.debug(f"[ark/submit] 提取小节时长失败(忽略): {_e}")

        # v3.61.183: 视频提交日志(create_log)— 进上游前记一条 running,后面 update 成 success/error
        _video_log_id = await _log_video_submit_start(
            storyboard_id=sb_id,
            provider=_resolved_provider_type,
            provider_code=cloud_cfg.get("providerCode") or _resolved_provider_type,
            model=cloud_cfg.get("modelName") or "",
            config_name=cloud_cfg.get("name") or "",
            base_url=cloud_cfg.get("baseUrl") or "",
            final_prompt=final_prompt,
            images=images,
            audios=audios,
            params=final_params,
        )

        sub_res = await provider.submit(
            prompt=final_prompt,
            images=images,
            audios=audios,
            params=final_params,
        )

        if not sub_res.success:
            await _log_video_submit_end(
                _video_log_id, success=False, fail_reason=sub_res.fail_reason,
                sanitized_payload=sub_res.sanitized_payload,
            )
            await storyboard_service.update_video_status(
                sb_id, "failed", fail_reason=sub_res.fail_reason or f"{_provider_friendly} 提交失败"
            )
            return {
                "success": False,
                "message": sub_res.fail_reason or "提交失败",
                "error_code": sub_res.error_code,
            }

        # 提交成功
        await _log_video_submitted(
            _video_log_id, provider=_resolved_provider_type, submit_id=sub_res.submit_id,
        )

        # 5. 写真 submit_id(占位时是空字符串)+ provider 标记 + 刷新 submit_time
        # v3.61.168: video_provider 按 _resolved_provider_type 写真值(cool / volcengine_ark)
        # v3.61.171: 同步写 video_config_id — poll-status 用本字段精准定位用的哪份配置,
        #   不再从 video_task_queue 拿(直 submit 路径不入队 → 拿到的可能是历史其他 provider 的配置 id)
        # v3.61.172: 重新提交时必须清旧 video_url / last_frame_path / video_fail_reason —
        #   实测 sb=2473 老 ARK 任务在新 cool 任务提交"之前几秒"才异步完成下载,
        #   导致 video_url 残留 → 新 cool 任务轮询时 UI 显示老视频"已完成"
        db = await get_db()
        try:
            await db.execute(
                "UPDATE storyboards SET submit_id = ?, video_status = 'generating', "
                "video_submit_time = ?, video_provider = ?, video_config_id = ?, "
                "video_url = NULL, last_frame_path = NULL, last_frame_orig_path = NULL, "
                "video_fail_reason = NULL "
                "WHERE id = ?",
                (sub_res.submit_id, _now_str_simple(), _resolved_provider_type, cloud_cfg.get("id"), sb_id),
            )
            await db.commit()
        finally:
            await db.close()
    except Exception as e:
        # 任何意外异常 → 退回 failed,释放占位
        logger.exception(f"[ark/submit] sb={sb_id} 异常: {e}")
        try:
            await storyboard_service.update_video_status(sb_id, "failed", fail_reason=f"提交异常: {type(e).__name__}: {e}")
        except Exception:
            pass
        # v3.61.183 codex P1:外层 except 必须把 _video_log_id 改 error,否则 llm_logs 残留 running
        #   running 状态会卡住"启动 mark_stale_running" 那个清理 + UI 日志页一直转圈
        _vlid = locals().get("_video_log_id")
        if _vlid:
            try:
                await _log_video_submit_end(_vlid, success=False, fail_reason=f"{type(e).__name__}: {e}")
            except Exception:
                pass
        return {"success": False, "message": f"提交异常: {e}"}

    logger.info(f"[cloud/submit] sb={sb_id} provider={_resolved_provider_type} task_id={sub_res.submit_id}")
    return {
        "success": True,
        "submit_id": sub_res.submit_id,
        "message": f"已提交 {_provider_friendly}",
    }


@router.post("/pippit/submit")
async def pippit_submit(request: PippitSubmitRequest):
    """小云雀 CLI 单条提交,按即梦 CLI 的产品流程接入统一 provider 轮询。

    Access Key is read from local app_settings/env and injected into the CLI subprocess env.
    """
    from services.video_providers import get_provider

    sb_id = request.storyboard_id
    claim = await _try_claim_storyboard_for_submit(sb_id, provider="pippit_cli")
    if not claim["claimed"]:
        if claim.get("not_found"):
            return {"success": False, "message": "分镜不存在"}
        elapsed = claim.get("blocked_minutes", -1)
        return {
            "success": False,
            "duplicate": True,
            "message": f"该分镜已有任务在生成({elapsed} 分钟前),拒绝重复提交",
        }

    try:
        await _apply_speaker_filter_to_storyboard(sb_id, request.prompt or "")
        from services.video_model_capabilities import get_video_model_capabilities
        _pippit_caps = get_video_model_capabilities(
            (request.params or {}).get("model")
            or (request.params or {}).get("model_version"),
            "pippit_cli",
        )
        images, audios, image_labels, audio_labels = await _collect_storyboard_assets_for_ark(
            sb_id,
            use_chain_frame=request.use_chain_frame,
            prompt_for_speakers=request.prompt or "",
            provider_type="pippit_cli",
            max_images=int(_pippit_caps["max_images"]),
        )

        final_prompt = await _build_final_video_prompt(
            storyboard_id=sb_id,
            raw_prompt=request.prompt or "",
            image_items=image_labels[: int(_pippit_caps["max_images"])],
            audio_items=audio_labels[: int(_pippit_caps["max_audios"])],
            with_file_refs=True,
            log_prefix="pippit/submit",
            provider_type="pippit_cli",
        )

        final_params = dict(request.params or {})
        try:
            sec_dur = _extract_section_duration(
                request.prompt or "",
                max_duration_sec=int(_pippit_caps["max_duration_seconds"]),
            )
            if sec_dur is not None:
                final_params["duration"] = sec_dur
        except Exception as _e:
            logger.debug(f"[pippit/submit] 提取小节时长失败(忽略): {_e}")

        _video_log_id = await _log_video_submit_start(
            storyboard_id=sb_id,
            provider="pippit_cli",
            provider_code="pippit_cli",
            model=final_params.get("model") or final_params.get("model_version") or "",
            config_name="小云雀 CLI",
            base_url="",
            final_prompt=final_prompt,
            images=images,
            audios=audios,
            params=final_params,
        )

        provider = get_provider("pippit_cli", await _pippit_provider_config())
        sub_res = await provider.submit(
            prompt=final_prompt,
            images=images,
            audios=audios,
            params=final_params,
        )

        if not sub_res.success:
            await _log_video_submit_end(
                _video_log_id,
                success=False,
                fail_reason=sub_res.fail_reason,
                sanitized_payload=sub_res.sanitized_payload,
            )
            await storyboard_service.update_video_status(
                sb_id,
                "failed",
                fail_reason=sub_res.fail_reason or "小云雀 CLI 提交失败",
            )
            return {
                "success": False,
                "message": sub_res.fail_reason or "小云雀 CLI 提交失败",
                "error_code": sub_res.error_code,
            }

        await _log_video_submitted(
            _video_log_id,
            provider="pippit_cli",
            submit_id=sub_res.submit_id,
        )

        db = await get_db()
        try:
            await db.execute(
                "UPDATE storyboards SET submit_id = ?, video_status = 'generating', "
                "video_submit_time = ?, video_provider = ?, video_config_id = NULL, "
                "video_url = NULL, last_frame_path = NULL, last_frame_orig_path = NULL, "
                "video_fail_reason = NULL "
                "WHERE id = ?",
                (sub_res.submit_id, _now_str_simple(), "pippit_cli", sb_id),
            )
            await db.commit()
        finally:
            await db.close()

        logger.info(f"[pippit/submit] sb={sb_id} task_id={sub_res.submit_id}")
        return {
            "success": True,
            "submit_id": sub_res.submit_id,
            "message": "已提交小云雀 CLI",
        }
    except Exception as e:
        logger.exception(f"[pippit/submit] sb={sb_id} 异常: {e}")
        try:
            await storyboard_service.update_video_status(
                sb_id,
                "failed",
                fail_reason=f"小云雀提交异常: {type(e).__name__}: {e}",
            )
        except Exception:
            pass
        _vlid = locals().get("_video_log_id")
        if _vlid:
            try:
                await _log_video_submit_end(_vlid, success=False, fail_reason=f"{type(e).__name__}: {e}")
            except Exception:
                pass
        return {"success": False, "message": f"小云雀提交异常: {e}"}


@router.post("/minimax/submit")
async def minimax_submit(request: MiniMaxSubmitRequest):
    """MiniMax H3 单条提交；素材、提示词、日志、轮询和下载均走统一链路。"""
    from services.video_providers import get_provider

    sb_id = request.storyboard_id
    claim = await _try_claim_storyboard_for_submit(sb_id, provider="minimax_h3")
    if not claim["claimed"]:
        if claim.get("not_found"):
            return {"success": False, "message": "分镜不存在"}
        elapsed = claim.get("blocked_minutes", -1)
        return {
            "success": False,
            "duplicate": True,
            "message": f"该分镜已有任务在生成({elapsed} 分钟前),拒绝重复提交",
        }

    try:
        if not await _get_minimax_api_key():
            await storyboard_service.update_video_status(
                sb_id, "failed", fail_reason="未配置 MiniMax API Key"
            )
            return {
                "success": False,
                "message": "请先在 MiniMax H3 渠道顶部保存 API Key",
                "error_code": "AUTH",
            }

        declared_duration = _extract_declared_section_duration(request.prompt or "")
        if declared_duration is not None and not 4 <= declared_duration <= 15:
            message = (
                f"当前分镜声明时长 {declared_duration:g} 秒，MiniMax H3 仅支持 4-15 秒。"
                "请先调整或拆分该分镜；系统不会静默增补或截断时长。"
            )
            await storyboard_service.update_video_status(sb_id, "failed", fail_reason=message)
            return {"success": False, "message": message, "error_code": "INVALID_PARAM"}

        await _apply_speaker_filter_to_storyboard(sb_id, request.prompt or "")
        images, audios, image_labels, audio_labels = await _collect_storyboard_assets_for_ark(
            sb_id,
            use_chain_frame=request.use_chain_frame,
            prompt_for_speakers=request.prompt or "",
            provider_type="minimax_h3",
            max_images=9,
            # H3 超限必须明确报错，不能沿用旧渠道的“自动裁掉低优先级图片”。
            apply_image_limit=False,
        )

        final_prompt = await _build_final_video_prompt(
            storyboard_id=sb_id,
            raw_prompt=request.prompt or "",
            image_items=image_labels[:9],
            audio_items=audio_labels[:3],
            with_file_refs=True,
            log_prefix="minimax/submit",
            provider_type="minimax_h3",
            separate_audio_order=True,
        )

        final_params = dict(request.params or {})
        final_params["model"] = "MiniMax-H3"
        # Keep the renderer's selected H3 resolution. The provider performs
        # the authoritative allow-list validation (768P / 2K) before calling
        # MiniMax; do not silently force every submission back to 2K here.
        final_params["resolution"] = _normalize_minimax_resolution(final_params.get("resolution"))
        if declared_duration is not None:
            import math
            final_params["duration"] = int(math.ceil(declared_duration))
        else:
            try:
                final_params["duration"] = int(final_params.get("duration") or 5)
            except (TypeError, ValueError):
                final_params["duration"] = 5
        final_params["use_chain_frame"] = bool(request.use_chain_frame)

        _video_log_id = await _log_video_submit_start(
            storyboard_id=sb_id,
            provider="minimax_h3",
            provider_code="minimax_h3",
            model="MiniMax-H3",
            config_name="MiniMax H3",
            base_url="https://api.minimaxi.com",
            final_prompt=final_prompt,
            images=images,
            audios=audios,
            params=final_params,
        )

        provider = get_provider("minimax_h3", await _minimax_provider_config())
        sub_res = await provider.submit(
            prompt=final_prompt,
            images=images,
            audios=audios,
            params=final_params,
        )
        if not sub_res.success:
            await _log_video_submit_end(
                _video_log_id,
                success=False,
                fail_reason=sub_res.fail_reason,
                sanitized_payload=sub_res.sanitized_payload,
            )
            await storyboard_service.update_video_status(
                sb_id,
                "failed",
                fail_reason=sub_res.fail_reason or "MiniMax H3 提交失败",
            )
            return {
                "success": False,
                "message": sub_res.fail_reason or "MiniMax H3 提交失败",
                "error_code": sub_res.error_code,
            }

        await _log_video_submitted(
            _video_log_id,
            provider="minimax_h3",
            submit_id=sub_res.submit_id,
        )
        db = await get_db()
        try:
            await db.execute(
                "UPDATE storyboards SET submit_id = ?, video_status = 'generating', "
                "video_submit_time = ?, video_provider = 'minimax_h3', video_config_id = NULL, "
                "video_url = NULL, last_frame_path = NULL, last_frame_orig_path = NULL, "
                "video_fail_reason = NULL WHERE id = ?",
                (sub_res.submit_id, _now_str_simple(), sb_id),
            )
            await db.commit()
        finally:
            await db.close()

        logger.info("[minimax/submit] sb=%s task_id=%s", sb_id, sub_res.submit_id)
        return {
            "success": True,
            "submit_id": sub_res.submit_id,
            "message": "已提交 MiniMax H3",
        }
    except Exception as e:
        logger.exception("[minimax/submit] sb=%s 异常: %s", sb_id, e)
        try:
            await storyboard_service.update_video_status(
                sb_id,
                "failed",
                fail_reason=f"MiniMax H3 提交异常: {type(e).__name__}: {e}",
            )
        except Exception:
            pass
        _vlid = locals().get("_video_log_id")
        if _vlid:
            try:
                await _log_video_submit_end(
                    _vlid,
                    success=False,
                    fail_reason=f"{type(e).__name__}: {e}",
                )
            except Exception:
                pass
        return {"success": False, "message": f"MiniMax H3 提交异常: {e}"}


async def _normalize_video_reference_audios(audio_paths: List[str], *, log_prefix: str) -> List[str]:
    """Normalize old and newly-uploaded local M4A references before provider handoff."""
    from services.audio_conversion import AudioTranscodeError, normalize_video_reference_audio

    normalized: List[str] = []
    for source in audio_paths:
        try:
            converted = await asyncio.to_thread(normalize_video_reference_audio, source)
        except AudioTranscodeError as exc:
            raise ValueError(f"参考音频转换失败：{exc}") from exc
        if converted != source:
            logger.info("[%s] 已将视频参考音频转为 MP3: %s -> %s", log_prefix, source, converted)
        normalized.append(converted)
    return normalized


async def _collect_storyboard_assets_for_ark(
    sb_id: int,
    use_chain_frame: bool = False,
    # prompt is also used to derive independent visual-appearance and first-speech order.
    prompt_for_speakers: str = "",
    provider_type: str = "volcengine_ark",  # v3.61.170+173: cool / volcengine_ark / xinglian
    apply_image_limit: bool = True,
    max_images: int = 9,
) -> tuple:
    """从 storyboard 关联元素收集图片+音频路径(给云端 HTTP provider 用)

    v3.61.12: 跟即梦路径完全对齐:
    - 串行尾帧:用 find_chainable_prev_frame 拿上一镜尾帧(最高优先级)
    - 用户上传额外参考图:走 resolve_db_path 解析(extra_reference_image)
    - 元素图/音频:用 find_best_match 三级匹配(精确名 → 别名 → 关键字)

    v3.61.170: 加 provider_type 参数 — 火山方舟独占 asset:// 私域素材库 URI,
                cool 不认识 asset://,所以 cool 模式下必须降级用原本地图路径,否则会丢图
    v3.61.173: xinglian(星链云 SD2)也不认 asset://,同 cool 一样降级本地图;
                xinglian provider 内部会把本地路径转 base64 data URL 再进 payload

    所有逻辑跟 _process_video_generation 同源,不再单独写。

    v3.61.110: 返回值新增 image_labels(跟 images 一一对应),
    元素结构 {"name": "凌婉兮", "kind": "character"} — 给 ark_submit 拼 @image1 绑定用。
    """
    import json as _json

    images: List[str] = []
    audios: List[str] = []
    audio_candidates: List[tuple] = []  # (path, 分镜人物原名, audio_label)
    matched_log: List[str] = []
    image_labels: List[Dict[str, str]] = []  # v3.61.110: 每张图的 {name, kind}
    audio_labels: List[Dict[str, str]] = []  # v3.61.111: 每段音频的 {name, kind} — Seedance 2.0 @Audio1 绑定

    # v3.61.135: 种菜模式自动过滤已在外面 _apply_speaker_filter_to_storyboard 写回 excluded_audios
    # collect 函数纯查询,只看 DB 里的 excluded_audios(下面 SELECT 已读)
    # 这里仍保留 prompt_for_speakers 参数兼容老调用(队列 worker 也用),
    # 但只在外部没调 _apply_speaker_filter_to_storyboard 时兜底
    if prompt_for_speakers:
        try:
            await _apply_speaker_filter_to_storyboard(sb_id, prompt_for_speakers)
        except Exception as _e:
            logger.warning(f"[ark/collect] sb={sb_id} 兜底 speaker filter 失败: {_e}")

    db = await get_db()
    try:
        cur = await db.execute(
            """SELECT novel_id, characters, scenes, props,
                   extra_reference_image, extra_reference_desc,
                   last_frame_path, excluded_audios, auto_excluded_audios,
                   prompt, description, manual_audio_order,
                   jimeng_image_characters, jimeng_audio_characters,
                   topview_image, topview_prompt, topview_start_prompt, topview_end_prompt,
                   topview_dispatch_text, start_frame_image, end_frame_image
            FROM storyboards WHERE id = ?""",
            (sb_id,),
        )
        row = await cur.fetchone()
        if not row:
            return [], [], [], []

        novel_id = row["novel_id"]
        # v3.61.134/136: 读 手动 + 自动 屏蔽,并集生效
        # v3.61.155: 自动屏蔽 auto_excluded_audios 必须 check 种菜模式开关 — 关 → 忽略字段残留
        try:
            _manual = set(_json.loads(row["excluded_audios"] or "[]"))
        except Exception:
            _manual = set()
        _auto: set = set()
        try:
            from services.settings_service import SettingsService as _SS, KEY_AUDIO_AUTO_SPEAKER_FILTER as _K
            _filter_on = await _SS.get_bool(_K, default=False)
        except Exception:
            _filter_on = False
        if _filter_on:
            try:
                _auto = set(_json.loads(row["auto_excluded_audios"] or "[]"))
            except Exception:
                _auto = set()
        excluded_audio_names = _manual | _auto
        if excluded_audio_names:
            logger.info(f"[ark/collect] sb={sb_id} 屏蔽音频(手动 {sorted(_manual)} + 自动 {sorted(_auto)},开关={_filter_on})")
        topview_start_prompt = (row["topview_start_prompt"] or "").strip() or DEFAULT_TOPVIEW_START_PROMPT
        topview_end_prompt = (
            (row["topview_end_prompt"] or "").strip()
            or (row["topview_prompt"] or "").strip()
            or DEFAULT_TOPVIEW_END_PROMPT
        )
        try:
            raw_char_names = _json.loads(row["characters"] or "[]")
        except Exception:
            raw_char_names = []
        _ordering_prompt = (
            (prompt_for_speakers or "").strip()
            or (row["prompt"] or "").strip()
            or (row["description"] or "").strip()
        )
        try:
            _manual_audio_order = _json.loads(row["manual_audio_order"] or "[]")
        except Exception:
            _manual_audio_order = []
        # All providers share the same independent image/audio selection metadata.
        # Provider adapters only decide transport details and physical limits.
        char_names = list(raw_char_names)
        try:
            scene_names = _json.loads(row["scenes"] or "[]")
        except Exception:
            scene_names = []
        try:
            prop_names = _json.loads(row["props"] or "[]")
        except Exception:
            prop_names = []

        # v3.61.170: provider 仅 volcengine_ark 才支持 asset:// 火山私域素材库 URI
        _allow_asset_uri = (provider_type == "volcengine_ark")

        # v3.61.12 优先级 1: 串行尾帧(同即梦路径)
        if use_chain_frame:
            try:
                chain_prev = await find_chainable_prev_frame(sb_id)
                if chain_prev and chain_prev.get("frame_path"):
                    chain_abs_check = resolve_db_path(chain_prev["frame_path"])
                    if chain_abs_check and os.path.exists(chain_abs_check):
                        # v3.61.112: 尾帧加白 Active 时优先 asset:// — 绕过火山 Deepfake
                        # v3.61.170: cool 不支持 asset://,降级用原 frame_path
                        _lf_volc_uri = chain_prev.get("last_frame_volc_asset_uri")
                        _lf_volc_status = chain_prev.get("last_frame_volc_asset_status")
                        if _allow_asset_uri and _lf_volc_uri and _lf_volc_status == "Active":
                            images.append(_lf_volc_uri)
                            image_labels.append({"name": "前一镜尾帧(已加白)", "kind": "chain_frame"})
                            matched_log.append(f"chain_prev_frame: prev_sb={chain_prev.get('storyboard_id')} → {_lf_volc_uri}")
                        else:
                            # 用 DB 相对路径(/data/frames/xxx),让 provider 自己 resolve+上传
                            images.append(chain_prev["frame_path"])
                            image_labels.append({"name": "前一镜尾帧", "kind": "chain_frame"})
                            matched_log.append(f"chain_prev_frame: prev_sb={chain_prev.get('storyboard_id')}")
                            if _lf_volc_uri and _lf_volc_status == "Active" and not _allow_asset_uri:
                                matched_log.append(f"  ↳ provider={provider_type} 不支持 asset://,用原尾帧图")
                            elif _lf_volc_uri and _lf_volc_status != "Active":
                                matched_log.append(f"  ↳ 尾帧加白 status={_lf_volc_status},暂用原图")
                    else:
                        matched_log.append(f"chain_prev_frame 文件不存在: {chain_abs_check}")
            except Exception as e:
                logger.warning(f"[ark/collect] 取串行尾帧失败 sb={sb_id}: {e}")

        # v3.61.12 优先级 2: 用户上传的额外参考图(同即梦路径)
        if row["extra_reference_image"]:
            extra_abs_check = resolve_db_path(row["extra_reference_image"])
            if extra_abs_check and os.path.exists(extra_abs_check):
                if row["extra_reference_image"] not in images:
                    images.append(row["extra_reference_image"])
                    _extra_desc = (row["extra_reference_desc"] or "").strip() or "用户参考图"
                    image_labels.append({"name": _extra_desc, "kind": "extra_reference"})
                matched_log.append(f"extra_reference_image")
            else:
                matched_log.append(f"extra_reference_image 文件不存在: {extra_abs_check}")

        # 优先级 2.5: 首尾俯视调度链。
        # 当前起始俯视图 = 上一小节同场景的结尾俯视图;当前结尾俯视图 = 本节 topview_image。
        try:
            _prev_topview = await find_chainable_prev_topview(sb_id)
        except Exception as _e:
            logger.warning(f"[ark/collect] 取上一节俯视调度图失败 sb={sb_id}: {_e}")
            _prev_topview = None
        if _prev_topview and _prev_topview.get("image_path"):
            _pimg = _prev_topview["image_path"]
            if _pimg not in images:
                images.append(_pimg)
                image_labels.append({
                    "name": topview_start_prompt,
                    "kind": "topview_dispatch",
                    "role": "start",
                    "dispatch_text": _prev_topview.get("dispatch_text") or "",
                })
            matched_log.append(f"dispatch_start_topview: prev_sb={_prev_topview.get('storyboard_id')}")

        if row["topview_image"]:
            _dimg = row["topview_image"]
            _dabs = resolve_db_path(_dimg)
            if _dabs and os.path.exists(_dabs):
                if _dimg not in images:
                    images.append(_dimg)
                    image_labels.append({
                        "name": topview_end_prompt,
                        "kind": "topview_dispatch",
                        "role": "end",
                        "dispatch_text": row["topview_dispatch_text"] or "",
                    })
                matched_log.append("dispatch_end_topview")
            else:
                matched_log.append(f"dispatch_end_topview 文件不存在: {_dabs}")

        # v3.61.12 优先级 3: 元素图/音频 — 用 find_best_match 三级匹配
        # v3.61.104: 加白(Active) → asset:// URI 最优先,绕过火山 Deepfake 拦截
        # v3.61.158 codex P1 修:加 active_variant_id + image_prompt/image_status + volc_asset_id/group_id
        #   character 匹配后立刻走 resolve_active_character_asset() merge,
        #   ARK 路径才会真用马甲图/音频/加白 asset
        cur = await db.execute(
            """SELECT id, name, element_type, finished_image, image_url,
                   grid_image, reference_image, audio_file, voice_id, aliases, description,
                   image_prompt, image_status,
                   volc_asset_id, volc_asset_uri, volc_asset_status, volc_asset_group_id,
                   active_variant_id
            FROM extracted_elements WHERE novel_id = ?""",
            (novel_id,),
        )
        all_els = [dict(r) for r in await cur.fetchall()]

        by_type: Dict[str, List[Dict[str, Any]]] = {}
        for el in all_els:
            by_type.setdefault(el["element_type"], []).append(el)

        _jimeng_image_set: set = set()
        _jimeng_audio_set: set = set()
        _audio_character_order: List[str] = []
        _character_elements = by_type.get("character", [])
        _manual_image_characters = _optional_json_name_list(
            row["jimeng_image_characters"]
        )
        _manual_audio_characters = _optional_json_name_list(
            row["jimeng_audio_characters"]
        )
        _shared_refs = _resolve_jimeng_character_references(
            raw_char_names,
            _ordering_prompt,
            _character_elements,
            _manual_image_characters,
            _manual_audio_characters,
            _manual_audio_order,
        )
        _image_names = list(_shared_refs["image_names"])
        _audio_names = list(_shared_refs["audio_names"])

        _manual_excluded_canonical = {
            name.lower()
            for name in _canonicalize_character_names(
                list(_manual),
                _character_elements,
            )
        }
        if _shared_refs["audio_selection_mode"] == "manual":
            _effective_excluded_canonical = _manual_excluded_canonical
        else:
            _effective_excluded_canonical = {
                name.lower()
                for name in _canonicalize_character_names(
                    list(excluded_audio_names),
                    _character_elements,
                )
            }
        _audio_names = [
            name
            for name in _audio_names
            if name.lower() not in _effective_excluded_canonical
        ]
        _jimeng_image_set = {name.lower() for name in _image_names}
        _jimeng_audio_set = {name.lower() for name in _audio_names}
        _audio_character_order = [
            name
            for name in _shared_refs["audio_order"]
            if name.lower() in _jimeng_audio_set
        ]
        char_names = _dedup_order_names(_image_names + _audio_character_order)
        matched_log.append(
            f"人物图:{_image_names}({_shared_refs['image_selection_mode']})"
        )
        matched_log.append(
            f"人物音频:{_audio_character_order}"
            f"({_shared_refs['audio_selection_mode']}/"
            f"{_shared_refs['audio_order_mode']})"
        )

        from services.extraction_service import ExtractionService as _ES_ark
        for name_list, etype in [
            (char_names, "character"),
            (scene_names, "scene"),
            (prop_names, "prop"),
        ]:
            type_els = by_type.get(etype, [])
            for name in name_list:
                if not name:
                    continue
                el = find_best_match(name, type_els, element_type=etype)
                if not el:
                    matched_log.append(f"未匹配 {etype}:{name}")
                    continue
                # v3.61.158 codex P1: 人物走 active variant fallback(字段级 merge)
                # ARK 路径才能用马甲图/音频/加白 asset,跟即梦路径口径一致
                if etype == "character":
                    el = await _backfill_character_audio_from_voice(db, novel_id, dict(el))
                    el = await _ES_ark.resolve_active_character_asset(el)
                _v_tag = el.get("__active_variant_name")
                matched_log.append(f"{etype}:{name} → {el.get('name')}" + (f" [马甲={_v_tag}]" if _v_tag else ""))
                # 加白 Active 时优先用 asset:// URI(火山私域素材,跳过 Deepfake)
                # v3.61.170: cool 不支持 asset:// — 降级用原本地图(不然角色图直接丢)
                volc_uri = el.get("volc_asset_uri")
                volc_status = el.get("volc_asset_status")
                _matched_name = el.get("name") or name  # 实际匹配到的元素名
                _label_meta = {"name": _matched_name, "kind": etype}
                if etype == "character":
                    _label_meta.update({
                        "input_name": name,
                        "element_name": el.get("name"),
                        "aliases": el.get("aliases"),
                        "variant": _v_tag,
                    })
                _submit_image = etype != "character" or name.lower() in _jimeng_image_set
                if not _submit_image:
                    matched_log.append(f"  ↳ 本镜不提交人物图:{name}")
                elif _allow_asset_uri and volc_uri and volc_status == "Active":
                    if volc_uri not in images:
                        images.append(volc_uri)
                        image_labels.append(dict(_label_meta))
                    matched_log.append(f"  ↳ 使用火山私域素材 {volc_uri}")
                else:
                    img = (
                        el.get("finished_image") or el.get("image_url")
                        or el.get("grid_image") or el.get("reference_image")
                    )
                    if img and img not in images:
                        images.append(img)
                        image_labels.append(dict(_label_meta))
                    if volc_uri and volc_status == "Active" and not _allow_asset_uri:
                        matched_log.append(f"  ↳ provider={provider_type} 不支持 asset://,用原本地图")
                    elif volc_uri and volc_status != "Active":
                        matched_log.append(f"  ↳ 加白 status={volc_status},暂用原图")
                if etype == "character" and el.get("audio_file"):
                    # v3.61.135: 纯 excluded_audios 判定 — key 统一用"分镜字段里那个 name"
                    # (前端 char.name / 种菜模式 helper / 手动屏蔽 全部写这个),不再混 _matched_name
                    _in_excluded = name.lower() not in _jimeng_audio_set
                    if _in_excluded:
                        matched_log.append(f"  ↳ 屏蔽音频:{name}")
                    elif not any(
                        item[0] == el["audio_file"] for item in audio_candidates
                    ):
                        # Keep audio labels aligned with the independently ordered character list.
                        audio_candidates.append((
                            el["audio_file"],
                            name,
                            {
                                "name": _matched_name,
                                "kind": "character",
                                "input_name": name,
                            },
                        ))
    finally:
        await db.close()

    # Every provider receives the same first-speech/manual audio order.
    for _audio_path, _input_name, _audio_label in _sort_named_assets(
        audio_candidates,
        locals().get("_audio_character_order", []),
    ):
        audios.append(_audio_path)
        audio_labels.append(_audio_label)
    audios = await _normalize_video_reference_audios(audios, log_prefix="ark/collect")

    # Cloud/全局队列/Pippit 都会在 provider 层截到 9 张。必须在这里先按
    # 统一优先级同步裁 images + labels，不能让 provider 简单取前 9 张造成
    # 提示词素材编号与实际上传错位。
    max_images = max(1, int(max_images or 9))
    if apply_image_limit and len(images) > max_images:
        aligned_labels = list(image_labels)
        while len(aligned_labels) < len(images):
            aligned_labels.append({"name": f"图片{len(aligned_labels) + 1}", "kind": ""})
        kept_indices, removed_indices = _select_image_keep_indices(
            aligned_labels, max_images
        )
        removed_names = [_image_asset_name(aligned_labels[idx]) for idx in removed_indices]
        images = [images[idx] for idx in kept_indices]
        image_labels = [aligned_labels[idx] for idx in kept_indices]
        logger.warning(
            f"[ark/collect] sb={sb_id} 图片超出 {max_images} 张上限，按人物>场景>道具>关键帧>尾帧>俯视图 "
            f"裁掉 {len(removed_indices)} 张: {removed_names}"
        )

    logger.info(
        f"[ark/collect] sb={sb_id} use_chain_frame={use_chain_frame} "
        f"匹配: {matched_log} → images={len(images)} audios={len(audios)}"
    )
    # image_labels / audio_labels 附加在 tuple 后两位；图片已按当前模型上限收敛。
    return images, audios, image_labels, audio_labels


_PROMPT_EXPORT_PROVIDER_TYPES = {
    "jimeng": "jimeng",
    "pippit": "pippit_cli",
    "minimax": "minimax_h3",
    "ark": "volcengine_ark",
    "cool": "cool",
    "xinglian": "xinglian",
}


def _prompt_export_section_label(row: Dict[str, Any]) -> str:
    scene_index = row.get("scene_index")
    section_number = row.get("section_number")
    if scene_index is not None:
        return f"{int(scene_index) + 1}-{section_number or ''}".rstrip("-")
    return str(section_number or row.get("id") or "")


def _prompt_export_scene_name(row: Dict[str, Any]) -> str:
    try:
        section_info = json.loads(row.get("section_info") or "{}")
    except Exception:
        section_info = {}
    if not isinstance(section_info, dict):
        return ""
    return str(section_info.get("scene") or "").strip()


def _format_video_prompt_export_block(row: Dict[str, Any], final_prompt: str) -> str:
    """Format one human-copyable prompt block; never serialize a request payload."""
    label = _prompt_export_section_label(row)
    scene = _prompt_export_scene_name(row)
    heading = f"分镜 #{label}"
    if scene:
        heading += f"｜{scene}"
    return f"==================== {heading} ====================\n{(final_prompt or '').strip()}"


@router.post("/export-prompts", response_class=PlainTextResponse)
async def export_video_prompts(request: VideoPromptExportRequest):
    """Export only the final prompt/content text sent to the active video channel.

    The response is plain UTF-8 text grouped by storyboard. It intentionally omits
    the provider request JSON, model parameters, credentials, local asset paths and
    all other transport metadata.
    """
    provider_type = _PROMPT_EXPORT_PROVIDER_TYPES[request.provider]
    from services.video_model_capabilities import (
        get_video_model_capabilities,
        reference_audio_duration_error,
    )
    export_capabilities = get_video_model_capabilities(
        request.model_version or "seedance_2_0",
        provider_type,
    )
    max_export_images = int(export_capabilities["max_images"])
    max_export_audios = int(export_capabilities["max_audios"])
    requested_ids = [item.storyboard_id for item in request.items]
    prompt_by_id = {item.storyboard_id: item.prompt or "" for item in request.items}

    placeholders = ",".join("?" for _ in requested_ids)
    db = await get_db()
    try:
        cur = await db.execute(
            f"""
            SELECT id, scene_index, section_number, section_info
            FROM storyboards
            WHERE id IN ({placeholders})
            """,
            tuple(requested_ids),
        )
        row_by_id = {int(row["id"]): dict(row) for row in await cur.fetchall()}
    finally:
        await db.close()

    missing_ids = [storyboard_id for storyboard_id in requested_ids if storyboard_id not in row_by_id]
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"以下分镜不存在或已删除: {missing_ids}")

    blocks: List[str] = []
    with_file_refs = not (
        request.provider == "jimeng"
        and request.generation_mode != "multimodal2video"
    )
    for storyboard_id in requested_ids:
        raw_prompt = prompt_by_id[storyboard_id]
        # Keep audio/image numbering aligned with a real submit. This helper may
        # refresh the automatic speaker-audio exclusion just like submit does.
        await _apply_speaker_filter_to_storyboard(storyboard_id, raw_prompt)
        images, audios, image_labels, audio_labels = await _collect_storyboard_assets_for_ark(
            storyboard_id,
            use_chain_frame=request.use_chain_frame,
            prompt_for_speakers=raw_prompt,
            provider_type=provider_type,
            # Jimeng filters missing local files before applying its model-aware
            # priority cap, so defer that cap until after the same filter below.
            apply_image_limit=(request.provider != "jimeng"),
            max_images=max_export_images,
        )
        if request.provider == "jimeng":
            # The Jimeng CLI path only uploads existing local files and drops
            # voice samples outside its model-specific duration range. Mirror
            # those two filters so exported 图片N/音频N numbering stays exact.
            existing_images: List[Dict[str, str]] = []
            for path, label in zip(images, image_labels):
                abs_path = resolve_db_path(path)
                if abs_path and os.path.exists(abs_path):
                    existing_images.append(dict(label))
            if len(existing_images) > max_export_images:
                kept_indices, _removed_indices = _select_image_keep_indices(
                    existing_images,
                    max_export_images,
                )
                existing_images = [existing_images[idx] for idx in kept_indices]
            image_labels = existing_images

            valid_audio_labels: List[Dict[str, str]] = []
            try:
                from api.extraction import _probe_audio_duration_seconds
            except Exception:
                _probe_audio_duration_seconds = None
            valid_audio_durations: List[float] = []
            for path, label in zip(audios, audio_labels):
                abs_path = resolve_db_path(path)
                if not abs_path or not os.path.exists(abs_path):
                    continue
                try:
                    duration = _probe_audio_duration_seconds(abs_path) if _probe_audio_duration_seconds else None
                except Exception:
                    duration = None
                if duration is not None and reference_audio_duration_error(
                    request.model_version or "seedance_2_0",
                    [duration],
                ):
                    continue
                if duration is not None:
                    valid_audio_durations.append(float(duration))
                valid_audio_labels.append(dict(label))
            audio_labels = valid_audio_labels
            total_audio_error = reference_audio_duration_error(
                request.model_version or "seedance_2_0",
                valid_audio_durations,
            )
            if total_audio_error:
                raise HTTPException(status_code=400, detail=total_audio_error)

            if request.use_chain_frame:
                chain_desc = (request.chain_frame_desc or DEFAULT_CHAIN_FRAME_DESC).strip()
                for label in image_labels:
                    if label.get("kind") == "chain_frame":
                        label["name"] = chain_desc
                        label["kind"] = "chain_prev_frame"
                        break
        final_prompt = await _build_final_video_prompt(
            storyboard_id=storyboard_id,
            raw_prompt=raw_prompt,
            image_items=image_labels[:max_export_images] if with_file_refs else [],
            audio_items=audio_labels[:max_export_audios] if with_file_refs else [],
            with_file_refs=with_file_refs,
            log_prefix=f"prompt-export/{request.provider}",
            ref_at=(request.provider == "cool"),
            separate_audio_order=(request.provider in {"jimeng", "minimax"}),
            provider_type=provider_type,
        )
        blocks.append(_format_video_prompt_export_block(row_by_id[storyboard_id], final_prompt))

    return PlainTextResponse("\n\n\n".join(blocks), media_type="text/plain")


def _now_str_simple() -> str:
    from utils.timezone import now_beijing_str
    return now_beijing_str()


def _cloud_timeout_minutes(provider: Optional[str]) -> int:
    """v3.61.175: 云端 HTTP provider 任务超时阈值(分钟),按 provider 区分

    用于两个地方,必须共用以免不一致:
      1. _poll_storyboard_via_cloud() 的 "success + url 空" 宽限期(超时才标 friendly failed)
      2. /poll-status 的整体超时阈值(超时强制查上游)

    阈值依据:
      - volcengine_ark = 5  火山真 API,正常 1-3 分钟,5 分钟足够
      - pippit_cli     = 5  小云雀 CLI,5 分钟后开始主动查上游;硬上限另见 _cloud_hard_limit_minutes()
      - xinglian       = 180 逆向即梦号,排队几小时常态(实测 38 分钟才出包),3 小时折中
      - cool / 其他    = 30  Cool 正常 1-3 分钟,30 分钟留 10 倍余量,死任务不挂太久
      - None / jimeng  = 30  不该走云端路径,兜底
    """
    p = (provider or "").lower()
    if p in ("volcengine_ark", "pippit_cli"):
        return 5
    if p == "xinglian":
        return 180
    if p == "newapi":
        return 30
    return 30


def _cloud_hard_limit_minutes(provider: Optional[str]) -> Optional[int]:
    """Provider-specific hard stop for jobs that keep returning running."""
    p = (provider or "").lower()
    if p == "pippit_cli":
        return 8 * 60
    return None


def _infer_cloud_provider(cloud_cfg: dict) -> str:
    """v3.61.168 + 173: 根据 cloud config 推断真 video provider type
    只在云端 HTTP provider 之间选 — cool / xinglian / volcengine_ark,不返 jimeng(CLI 不走这条入口)
    优先级:providerCode > base_url 关键字 > model_name 关键字 > 默认 volcengine_ark
    """
    bu = (cloud_cfg.get("baseUrl") or cloud_cfg.get("base_url") or "").lower()
    mn = (cloud_cfg.get("modelName") or cloud_cfg.get("model_name") or "").lower()
    pc = (cloud_cfg.get("providerCode") or cloud_cfg.get("provider_code") or "").lower()
    name = (cloud_cfg.get("name") or "").lower()

    # OpenAI/New API compatible H3 relay. This needs to be resolved before
    # model-name heuristics because its model also contains "minimax".
    if pc in ("newapi", "new_api", "taihang") or "newapi" in pc or "taihang" in pc:
        return "newapi"
    if "120.209.70.196" in bu or "newapi" in bu or "太航" in name:
        return "newapi"

    # Cool 优先(防 cool 配置的 model="seedance_2" 被 ARK "seedance" 子串误归)
    if pc in ("cool", "mjapi") or "cool" in pc or "mjapi" in pc:
        return "cool"
    if "mjapi.cc.cd" in bu or "mjapi" in bu or "cool" in name:
        return "cool"

    # v3.61.173: 星链云(vjimeng.vip / SD2 系列)
    if pc in ("xinglian", "vjimeng") or "xinglian" in pc or "vjimeng" in pc:
        return "xinglian"
    if "vjimeng.vip" in bu or "vjimeng" in bu or "vjimeng" in name or mn.startswith("sd2-"):
        return "xinglian"

    if pc in ("pippit", "pippit_cli") or "pippit" in pc or "pippit" in bu or "pippit" in name or "小云雀" in name:
        return "pippit_cli"

    # 默认 ARK
    return "volcengine_ark"


def _sum_audio_duration_seconds(audio_paths) -> float:
    """v3.61.41: 用 ffprobe 求音频文件总时长(秒)。失败的当 0 算,不拦提交流程"""
    if not audio_paths:
        return 0.0
    import subprocess
    from utils.paths import resolve_db_path
    total = 0.0
    for p in audio_paths:
        try:
            abs_p = resolve_db_path(p) if isinstance(p, str) and p.startswith("/data/") else p
            if not abs_p or not os.path.exists(abs_p):
                continue
            out = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", abs_p],
                capture_output=True, text=True, timeout=10
            )
            if out.returncode == 0 and out.stdout.strip():
                total += float(out.stdout.strip())
        except Exception as e:
            logger.debug(f"[audio-dur] ffprobe 失败 {p}: {e}")
    return total


# v3.61.23: 原子级"判重 + 占位"。用 UPDATE WHERE 一条 SQL 同时做:
#   1) 检查是否还有 30 分钟内的 generating 任务,或全局队列活跃项
#   2) 没有 → 把状态置 generating + 刷 video_submit_time + 清旧 submit_id/url/fail_reason
# 因为是单条 SQL,SQLite 行锁保证并发请求只会有一个赢,根治 TOCTOU race。
async def _try_claim_storyboard_for_submit(sb_id: int, provider: str = "jimeng") -> dict:
    """尝试占位 storyboard 准备提交。

    返回 dict:
      - claimed=True:占位成功,可以继续提交
      - claimed=False, blocked_minutes=N:已有 N 分钟前的活动任务,拒绝
      - claimed=False, not_found=True:storyboard 不存在
    """
    from utils.timezone import now_beijing_str
    now_str = now_beijing_str()
    db = await get_db()
    try:
        # 一条原子 UPDATE:WHERE 子句既是判重(NOT 30 分钟内 generating/queued)又是 id 匹配
        cursor = await db.execute(
            """
            UPDATE storyboards
            SET video_status = 'generating',
                submit_id = '',
                video_url = NULL,
                video_fail_reason = NULL,
                video_submit_time = ?,
                video_provider = ?
            WHERE id = ?
              AND NOT (
                video_status = 'generating'
                AND video_submit_time IS NOT NULL
                AND datetime(replace(video_submit_time, ' ', 'T'))
                    > datetime(replace(?, ' ', 'T'), '-30 minutes')
              )
              AND NOT EXISTS (
                SELECT 1 FROM video_task_queue q
                WHERE q.storyboard_id = storyboards.id
                  AND q.status IN ('queued', 'generating')
              )
            """,
            (now_str, provider, sb_id, now_str),
        )
        await db.commit()
        if cursor.rowcount > 0:
            return {"claimed": True}
        # 没改到行 — 要么 id 不存在,要么命中拒绝条件
        cur2 = await db.execute(
            "SELECT video_status, video_submit_time FROM storyboards WHERE id = ?",
            (sb_id,),
        )
        row = await cur2.fetchone()
        if not row:
            return {"claimed": False, "not_found": True}
        # 算一下还有多久
        elapsed_min = -1
        try:
            t = row["video_submit_time"] or ""
            if t:
                from datetime import datetime as _dt
                submitted_at = _dt.fromisoformat(t.replace(" ", "T"))
                elapsed_min = int((_dt.now() - submitted_at).total_seconds() / 60)
        except Exception:
            pass
        return {"claimed": False, "blocked_minutes": elapsed_min, "current_status": row["video_status"]}
    finally:
        await db.close()


@router.post("/generate")
async def generate_video(request: VideoGenerateRequest, background_tasks: BackgroundTasks):
    """提交单个视频生成任务"""
    if not request.params and not request.video_config_id:
        return {"success": False, "message": "缺少 params 或 video_config_id"}

    # ★ 2026-04 v3.59.43:防重复提交
    # 用户场景:先用「串行尾帧」批量跑了一次(前端循环还没结束),又取消串行勾选再点批量
    # → 两条路径同时调 /generate → 同一个分镜被提交 2 次给即梦 → 重复扣费
    # v3.61.23 重写:用原子 UPDATE WHERE 一条 SQL 同时做"判重 + 占位",
    #              彻底治掉旧版 SELECT-check-UPDATE 之间的 TOCTOU race +
    #              "update_submit_id 把 submit_id 清空导致后续判重失效"的窗口问题

    # 串行尾帧模式:在用户开启接帧时,如果上一可接镜状态是 failed/chain_aborted,本镜立即置为 chain_aborted
    # (避免链路中断后用户单点重试造成不连贯的接帧效果)
    # ★ 这个检查必须在 _try_claim 之前 — 不然占了位再回 chain_aborted 状态会污染
    if request.use_chain_frame:
        abort_reason = await _check_chain_aborted_precondition(request.storyboard_id)
        if abort_reason:
            if abort_reason.startswith("链路暂停:"):
                return {
                    "success": False,
                    "message": abort_reason,
                    "chain_blocked": True,
                }
            await storyboard_service.update_video_status(
                request.storyboard_id, "chain_aborted",
                fail_reason=abort_reason
            )
            return {"success": False, "message": abort_reason, "chain_aborted": True}

    # 原子判重 + 占位
    claim = await _try_claim_storyboard_for_submit(request.storyboard_id, provider="jimeng")
    if not claim["claimed"]:
        if claim.get("not_found"):
            return {"success": False, "message": "分镜不存在"}
        elapsed = claim.get("blocked_minutes", -1)
        if (claim.get("current_status") or "").lower() == "queued":
            msg = "该分镜已在全局队列等待生成,为避免重复扣费已拒绝本次提交。"
        else:
            msg = (
                f"该分镜已有任务在生成(提交于 {elapsed} 分钟前),为避免重复扣费已拒绝本次提交。"
                f"如需强制重新生成,请先在视频列表里点「刷新状态」或等当前任务完成"
            )
        return {"success": False, "message": msg, "duplicate": True}

    try:
        await storyboard_service.clear_stale_chain_aborted_after(request.storyboard_id)
    except Exception as e:
        logger.warning(f"[chain-aborted-clear] 分镜 {request.storyboard_id} 占位后清理旧中断失败(忽略): {e}")

    # 把 params 转 dict 传给 background(BaseModel 跨协程可能有序列化问题)
    params_dict = request.params.model_dump() if request.params else None
    # 后台异步执行生成
    background_tasks.add_task(
        _process_video_generation,
        request.storyboard_id,
        request.prompt,
        request.video_config_id,
        params_dict,
        request.use_chain_frame,
        request.chain_frame_desc,
    )
    return {"success": True, "message": "视频生成任务已提交"}


async def _check_chain_aborted_precondition(storyboard_id: int) -> Optional[str]:
    """判断当前镜在串行尾帧模式下是否应直接 chain_aborted。
    规则:同节(或跨节同 scenes[0])的最近一条上一镜状态是 failed/chain_aborted → 链路已断 → 中断本镜。
    返回 None = 可以继续生成;返回字符串 = 应该 chain_aborted 的原因。
    """
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT novel_id, script_id, sort_order, section_number, scene_index, scene_type, scenes FROM storyboards WHERE id = ?",
            (storyboard_id,)
        )
        cur = await cursor.fetchone()
        if not cur:
            return None
        try:
            cur_scenes = json.loads(cur["scenes"] or "[]")
        except Exception:
            cur_scenes = []
        cur_scene_idx = cur["scene_index"] if "scene_index" in cur.keys() else None
        # v3.59.55:链路失败传染只在同 scene_type 内,回忆失败不影响主线
        cur_scene_type = (cur["scene_type"] if "scene_type" in cur.keys() else None) or "normal"

        # 找前一条已结束(done/failed/chain_aborted/download_failed)的镜 — 限同 scene_type
        # v3.61.153 codex P1:download_failed 也算前镜终态(上游成功但本地无视频/无尾帧 → 接不了帧)
        cursor = await db.execute(
            "SELECT id, section_number, scene_index, scene_type, scenes, video_status FROM storyboards "
            "WHERE novel_id = ? AND script_id IS ? AND sort_order < ? "
            "  AND video_status IN ('done','failed','chain_aborted','download_failed') "
            "  AND COALESCE(scene_type, 'normal') = ? "
            "ORDER BY sort_order DESC LIMIT 1",
            (cur["novel_id"], cur["script_id"], cur["sort_order"], cur_scene_type)
        )
        prev = await cursor.fetchone()
        if not prev:
            return None  # 没有上镜,本镜是首镜,正常生成
        # 判定可接性
        # ★ v3.59.52 修复:section_number 是每个场景内从 1 重新编号的,必须 (scene_index, section_number) 一起比。
        prev_scene_idx = prev["scene_index"] if "scene_index" in prev.keys() else None
        same_section = (
            prev_scene_idx is not None
            and cur_scene_idx is not None
            and prev_scene_idx == cur_scene_idx
            and prev["section_number"] == cur["section_number"]
        )
        connectable = same_section
        if not connectable:
            try:
                prev_scenes = json.loads(prev["scenes"] or "[]")
            except Exception:
                prev_scenes = []
            if (
                prev_scenes
                and cur_scenes
                and _normalize_chain_scene_name(prev_scenes[0]) == _normalize_chain_scene_name(cur_scenes[0])
            ):
                connectable = True
        if not connectable:
            return None  # 跨场景,前镜失败跟我无关
        # 同链路且前镜失败 → 中断;本地下载失败只暂停,不能把当前镜写成 chain_aborted。
        if prev["video_status"] == "download_failed":
            return f"链路暂停:上一镜(分镜 #{prev['id']})本地下载失败,请先重试下载上一镜再继续串行尾帧生成"
        if prev["video_status"] in ("failed", "chain_aborted"):
            _zh = {
                "failed": "生成失败",
                "chain_aborted": "已被链路中断",
            }.get(prev["video_status"], prev["video_status"])
            return f"前置分镜(id #{prev['id']}){_zh},本镜未生成;请先重试该前置分镜"
        return None
    finally:
        await db.close()


async def _process_video_generation(
    storyboard_id: int,
    prompt: str,
    video_config_id: Optional[int] = None,
    params: Optional[dict] = None,
    use_chain_frame: bool = False,
    chain_frame_desc: Optional[str] = None,
    start_background_reconcile: bool = True,
):
    """后台处理视频生成 - 仅提交任务，不等待完成

    params 和 video_config_id 二选一:
    - params: 前端直传的即梦参数 dict(新版本)
    - video_config_id: 查 llm_configs 表(老版本兼容)
    """
    try:
        # 获取视频模型配置和分镜信息（用于获取novel_id和风格设置）
        logger.info(f"[video-gen] 开始处理分镜 {storyboard_id} 的视频生成任务(params={bool(params)}, config_id={video_config_id})")
        db = await get_db()
        try:
            # 新版: 有 params 时不查 llm_configs,构造一个虚拟 config_dict
            if params:
                config = {
                    "name": "即梦直传参数",
                    "model_name": params.get("model_version", ""),  # 这里 model_name 已经是 CLI 版本号
                    "duration": params.get("duration", 10),
                    "image_ratio": params.get("ratio", "16:9"),
                    "generation_mode": params.get("generation_mode", "text2video"),
                    "_direct_model_version": params.get("model_version", ""),  # 跳过后续解析,直接用
                    "_direct_resolution": params.get("resolution", "720P"),
                }
            else:
                cursor = await db.execute(
                    "SELECT * FROM llm_configs WHERE id = ? AND config_type = 'video'",
                    (video_config_id,),
                )
                config = await cursor.fetchone()
            
            # 获取分镜所属的小说ID和风格提示词
            cursor = await db.execute(
                "SELECT novel_id, style_prompt, extra_reference_image, extra_reference_desc, "
                "topview_image, topview_prompt, topview_start_prompt, topview_end_prompt, "
                "topview_dispatch_text, start_frame_image, end_frame_image FROM storyboards WHERE id = ?",
                (storyboard_id,)
            )
            sb_novel_row = await cursor.fetchone()
            novel_id = sb_novel_row['novel_id'] if sb_novel_row else None
            storyboard_style_prompt = (sb_novel_row['style_prompt'] or "") if sb_novel_row else ""
            extra_ref_image = (sb_novel_row['extra_reference_image'] or "") if sb_novel_row else ""
            extra_ref_desc = (sb_novel_row['extra_reference_desc'] or "") if sb_novel_row else ""
            # 本节结尾俯视调度图(熔图功能产物,用户可在详情面板 X 掉 = 字段清空)
            topview_image = (sb_novel_row['topview_image'] or "") if sb_novel_row else ""
            topview_start_prompt = (sb_novel_row['topview_start_prompt'] or "").strip() if sb_novel_row else ""
            topview_end_prompt = (sb_novel_row['topview_end_prompt'] or "").strip() if sb_novel_row else ""
            legacy_topview_prompt = (sb_novel_row['topview_prompt'] or "").strip() if sb_novel_row else ""
            topview_dispatch_text = (sb_novel_row['topview_dispatch_text'] or "") if sb_novel_row else ""
            topview_start_prompt = topview_start_prompt or DEFAULT_TOPVIEW_START_PROMPT
            topview_end_prompt = topview_end_prompt or legacy_topview_prompt or DEFAULT_TOPVIEW_END_PROMPT
            
            # 获取视频风格设置（使用 'video' 作为 element_type）
            style_prefix = ""
            style_suffix = ""
            if novel_id:
                cursor = await db.execute(
                    "SELECT prefix_prompt, suffix_prompt FROM image_style_settings WHERE novel_id = ? AND element_type = ?",
                    (novel_id, "video")
                )
                style_row = await cursor.fetchone()
                if style_row:
                    style_prefix = style_row["prefix_prompt"] or ""
                    style_suffix = style_row["suffix_prompt"] or ""
                    logger.info(f"[video-gen] 找到视频风格设置: prefix={len(style_prefix)}字符, suffix={len(style_suffix)}字符")
        finally:
            await db.close()

        if not config:
            await storyboard_service.update_video_status(storyboard_id, "failed")
            logger.error(f"未找到视频配置或配置类型错误，config_id={video_config_id}")
            return

        # 从配置中提取参数 (sqlite3.Row 通过字典方式访问)
        config_dict = dict(config) if config else {}
        config_name = config_dict.get("name", "Unknown")
        model_name = config_dict.get("model_name") or "seedance-2.0-fast"
        duration = config_dict.get("duration") or 10
        ratio = config_dict.get("image_ratio") or "16:9"
        generation_mode = config_dict.get("generation_mode") or "text2video"
        # 新版直传参数时,后续调用要用的 resolution
        direct_resolution = config_dict.get("_direct_resolution") or "720P"

        # 兼容旧的中文值映射
        mode_mapping = {
            "全能参考": "multimodal2video",
            "首尾帧": "image2video",
            "智能多帧": "text2video",
        }
        generation_mode = mode_mapping.get(generation_mode, generation_mode)
        from services.jimeng_black_video import jimeng_black_video_enabled
        include_black_video = jimeng_black_video_enabled(
            (params or {}).get("include_black_video", False)
        )
        if include_black_video and generation_mode != "multimodal2video":
            logger.info(
                "[video-gen] 分镜 %s 已开启2秒黑屏视频，生成模式切换为 multimodal2video",
                storyboard_id,
            )
            generation_mode = "multimodal2video"
        logger.info(f"[video-gen] 分镜 {storyboard_id} 使用配置: id={video_config_id}, name='{config_name}', model_name='{model_name}', duration={duration}, ratio='{ratio}', mode='{generation_mode}'")

        # 映射 model_name 到 CLI 的 model_version 格式
        # CLI 正确的 model_version 值:
        #   - seedance2.0_vip      (VIP标准版)
        #   - seedance2.0fast_vip  (VIP快速版)
        #   - seedance2.0fast      (快速版)
        #   - seedance2.0mini      (Mini版)
        #   - seedance2.0          (标准版)
        # VIP 参数会触发即梦平台的优先队列处理

        # 新版直传的 _direct_model_version 已是 CLI 格式,跳过解析
        direct_model_version = config_dict.get("_direct_model_version")
        if direct_model_version:
            model_version = direct_model_version
            logger.info(f"[video-gen] 分镜 {storyboard_id} 直传 model_version: {model_version}")
        else:
            model_name_lower = model_name.lower()
            is_vip = "-vip" in model_name_lower or "_vip" in model_name_lower or model_name_lower.endswith("vip")
            is_fast = "fast" in model_name_lower
            is_mini = "mini" in model_name_lower

            logger.info(f"[video-gen] 分镜 {storyboard_id} model_name 解析: raw='{model_name}', lower='{model_name_lower}', is_vip={is_vip}, is_fast={is_fast}, is_mini={is_mini}")

            # 提取版本号
            if "2.0" in model_name_lower or "20" in model_name_lower:
                version = "2.0"
            elif "1.5" in model_name_lower or "15" in model_name_lower:
                version = "1.5"
            elif "1.0" in model_name_lower or "10" in model_name_lower:
                version = "1.0"
            else:
                version = "2.0"  # 默认版本

            # 构建 CLI 的 model_version（注意 VIP 使用下划线）
            if version == "2.0":
                if is_mini:
                    model_version = "seedance2.0mini"
                elif is_fast:
                    model_version = "seedance2.0fast"
                else:
                    model_version = "seedance2.0"
                if is_vip and not is_mini:
                    model_version += "_vip"  # VIP 使用下划线
            elif version == "1.5":
                # 1.5 系列已从可选模板下线;历史配置命中 1.5 时回落到 2.0。
                model_version = "seedance2.0"
            elif version == "1.0":
                if is_fast:
                    model_version = "seedance1.0fast"
                else:
                    model_version = "seedance1.0"
            else:
                model_version = "seedance2.0fast"  # 默认

            logger.info(f"[video-gen] 分镜 {storyboard_id} model_name: {model_name} -> model_version: {model_version}")

        if model_version == "seedance2.0mini" and str(direct_resolution or "").lower() != "720p":
            logger.info(
                f"[video-gen] 分镜 {storyboard_id} Seedance 2.0 Mini 仅按 720P 提交,"
                f"忽略前端/历史配置 resolution={direct_resolution}"
            )
            direct_resolution = "720P"

        from services.video_model_capabilities import (
            canonical_video_model_name,
            get_video_model_capabilities,
            reference_audio_duration_error,
        )
        model_version = canonical_video_model_name(model_version, "jimeng")
        _model_caps = get_video_model_capabilities(model_version, "jimeng")
        if not _model_caps["video_generation_available"]:
            raise ValueError(f"即梦 CLI 暂未开放 {_model_caps['label']} 视频生成")
        _min_output_duration = int(_model_caps.get("min_duration_seconds") or 4)
        _max_output_duration = int(_model_caps["max_duration_seconds"])
        try:
            duration = int(round(float(duration)))
        except (TypeError, ValueError):
            duration = _min_output_duration
        if duration < _min_output_duration or duration > _max_output_duration:
            logger.warning(
                "[video-gen] 分镜 %s %s 时长 %s 超范围,收敛到 %s-%ss",
                storyboard_id,
                _model_caps["label"],
                duration,
                _min_output_duration,
                _max_output_duration,
            )
            duration = min(_max_output_duration, max(_min_output_duration, duration))

        # 根据生成模式准备素材
        images = []
        audios = []
        videos = []

        logger.info(f"[video-gen] 分镜 {storyboard_id} 生成模式: {generation_mode}")

        # 用于 multimodal2video 的文件引用描述
        image_refs = []  # [(index, name, elem_type), ...]
        audio_refs = []  # [(index, name), ...]
        image_items = []  # [(path, name, elem_type), ...]
        audio_items = []  # [(path, name), ...]

        if generation_mode in ("image2video", "multimodal2video"):
            # 串行尾帧模式:把上一可接镜的尾帧作为最优先的参考图(放在 image_items 第一位)
            # 只有用户在分镜面板勾选"使用尾帧"且后端能找到可接的上镜时才注入。
            # 尾帧 prepend 在用户额外参考图之前 — 概念上"上镜的延续"权重最高。
            if use_chain_frame:
                chain_prev = await find_chainable_prev_frame(storyboard_id)
                if chain_prev:
                    data_base_dir = os.path.dirname(get_data_dir())
                    chain_abs = resolve_db_path(chain_prev["frame_path"])
                    if os.path.exists(chain_abs):
                        chain_label = chain_frame_desc or DEFAULT_CHAIN_FRAME_DESC
                        image_items.append((chain_abs, chain_label, "chain_prev_frame"))
                        logger.info(f"[video-gen] 分镜 {storyboard_id} 已注入上镜尾帧: prev={chain_prev['storyboard_id']}, path={chain_abs}")
                    else:
                        logger.warning(f"[video-gen] 分镜 {storyboard_id} 上镜尾帧文件不存在: {chain_abs}")
                else:
                    logger.info(f"[video-gen] 分镜 {storyboard_id} use_chain_frame=true 但找不到可接的上镜(首镜/跨场景/上镜未生成)")

            # 处理分镜自身的额外参考图(用户上传的关键帧参考)
            if extra_ref_image:
                data_base_dir = os.path.dirname(get_data_dir())  # data目录的父目录
                ref_img_path = resolve_db_path(extra_ref_image)
                if os.path.exists(ref_img_path):
                    ref_label = extra_ref_desc if extra_ref_desc else "关键帧参考图"
                    image_items.append((ref_img_path, ref_label, "reference"))
                    logger.info(f"[video-gen] 分镜 {storyboard_id} 添加额外参考图: {ref_img_path}, 描述: {ref_label}")
                else:
                    logger.warning(f"[video-gen] 分镜 {storyboard_id} 额外参考图文件不存在: {ref_img_path}")

            # 首尾俯视调度链:上一节同场景结尾俯视图作为本镜起始图,本节 topview_image 作为本镜结尾图。
            try:
                prev_topview = await find_chainable_prev_topview(storyboard_id)
            except Exception as _e:
                logger.warning(f"[video-gen] 分镜 {storyboard_id} 取上一节俯视调度图失败: {_e}")
                prev_topview = None
            if prev_topview and prev_topview.get("abs_path"):
                image_items.append((prev_topview["abs_path"], topview_start_prompt, "topview_dispatch", {
                    "role": "start",
                    "dispatch_text": prev_topview.get("dispatch_text") or "",
                }))
                logger.info(f"[video-gen] 分镜 {storyboard_id} 已注入起始俯视调度图: prev={prev_topview.get('storyboard_id')}, path={prev_topview['abs_path']}")

            if topview_image:
                topview_abs = resolve_db_path(topview_image)
                if os.path.exists(topview_abs):
                    image_items.append((topview_abs, topview_end_prompt, "topview_dispatch", {
                        "role": "end",
                        "dispatch_text": topview_dispatch_text,
                    }))
                    logger.info(f"[video-gen] 分镜 {storyboard_id} 已注入结尾俯视调度图: {topview_abs}")
                else:
                    logger.warning(f"[video-gen] 分镜 {storyboard_id} 结尾俯视调度图文件不存在: {topview_abs}")

            # 查询分镜关联的元素图片和音频
            db2 = await get_db()
            try:
                cursor = await db2.execute(
                    "SELECT novel_id, script_id, section_number, sort_order, characters, scenes, props, "
                    "description, prompt, excluded_audios, auto_excluded_audios, manual_audio_order, "
                    "jimeng_image_characters, jimeng_audio_characters, "
                    "section_start_state FROM storyboards WHERE id = ?",
                    (storyboard_id,)
                )
                sb_row = await cursor.fetchone()

                if sb_row:
                    novel_id = sb_row['novel_id']
                    cur_script_id = sb_row['script_id']
                    cur_section_number = sb_row['section_number'] or 1
                    # 本节起始状态(只含本节激活角色的状态快照)
                    try:
                        cur_section_start_state = json.loads(sb_row['section_start_state'] or '{}')
                    except Exception:
                        cur_section_start_state = {}
                    # v3.61.135/136: 种菜模式自动过滤 — 统一 helper(跟 ARK / 队列 同源)
                    # helper 返回的是 manual ∪ auto 并集,可以直接当 excluded_audio_names 用
                    try:
                        _new_excluded = await _apply_speaker_filter_to_storyboard(storyboard_id, prompt or "")
                    except Exception as _e:
                        logger.warning(f"[video-gen] sb={storyboard_id} 种菜模式 helper 异常: {_e}")
                        _new_excluded = set()
                    if _new_excluded:
                        excluded_audio_names = _new_excluded
                    else:
                        # helper 没动 / 开关关 → 自己合并 sb_row 里两个字段
                        # v3.61.155 修:开关关时,自动屏蔽字段(可能历史残留)要忽略,只用 manual
                        try:
                            _m = set(json.loads(sb_row['excluded_audios'] or '[]'))
                        except Exception:
                            _m = set()
                        _a: set = set()
                        try:
                            from services.settings_service import SettingsService as _SS2, KEY_AUDIO_AUTO_SPEAKER_FILTER as _K2
                            _filter_on2 = await _SS2.get_bool(_K2, default=False)
                        except Exception:
                            _filter_on2 = False
                        if _filter_on2:
                            try:
                                _a = set(json.loads(sb_row['auto_excluded_audios'] or '[]'))
                            except Exception:
                                _a = set()
                        excluded_audio_names = _m | _a
                    if excluded_audio_names:
                        logger.info(f"[video-gen] 分镜 {storyboard_id} 屏蔽的音频角色: {excluded_audio_names}")
                    names_by_field: Dict[str, List[str]] = {}
                    for field in ['characters', 'scenes', 'props']:
                        raw_names = json.loads(sb_row[field] or '[]')
                        expanded_names: List[str] = []
                        for raw_name in raw_names:
                            # 拆分中文逗号和英文逗号
                            split_names = [n.strip() for n in raw_name.replace('，', ',').split(',') if n.strip()]
                            expanded_names.extend(split_names)
                        names_by_field[field] = _dedup_order_names(expanded_names)

                    _ordering_prompt = (
                        (prompt or "").strip()
                        or (sb_row['prompt'] or "").strip()
                        or (sb_row['description'] or "").strip()
                    )
                    _raw_character_names = names_by_field.get('characters', [])
                    try:
                        _manual_audio_order = json.loads(sb_row['manual_audio_order'] or '[]')
                    except Exception:
                        _manual_audio_order = []
                    _manual_image_characters = _optional_json_name_list(
                        sb_row['jimeng_image_characters']
                    )
                    _manual_audio_characters = _optional_json_name_list(
                        sb_row['jimeng_audio_characters']
                    )

                    # 预加载该小说的所有元素（人物、场景、道具）用于三级匹配
                    # v3.61.158: 加 id + element_type + active_variant_id + 火山相关全字段,给 resolve_active_character_asset 用
                    cursor = await db2.execute(
                        "SELECT id, element_type, name, description, finished_image, audio_file, voice_id, grid_image, aliases, image_url, reference_image, image_prompt, image_status, volc_asset_id, volc_asset_uri, volc_asset_status, volc_asset_group_id, active_variant_id FROM extracted_elements WHERE novel_id = ? AND element_type = 'character'",
                        (novel_id,)
                    )
                    character_elements = await cursor.fetchall()

                    _jimeng_refs = _resolve_jimeng_character_references(
                        _raw_character_names,
                        _ordering_prompt,
                        list(character_elements),
                        _manual_image_characters,
                        _manual_audio_characters,
                        _manual_audio_order,
                    )
                    _image_character_names = _jimeng_refs["image_names"]
                    _image_character_set = {name.lower() for name in _image_character_names}
                    _audio_character_names = list(_jimeng_refs["audio_names"])

                    # 手动音频名单是用户明确选择，忽略“仅说话人”自动屏蔽残留；
                    # 手动屏蔽 excluded_audios 仍始终生效。
                    try:
                        _manual_excluded_names = set(json.loads(sb_row['excluded_audios'] or '[]'))
                    except Exception:
                        _manual_excluded_names = set()
                    _manual_excluded_canonical = set(
                        name.lower()
                        for name in _canonicalize_character_names(
                            list(_manual_excluded_names),
                            list(character_elements),
                        )
                    )
                    if _jimeng_refs["audio_selection_mode"] == "manual":
                        _effective_excluded_canonical = _manual_excluded_canonical
                    else:
                        _effective_excluded_canonical = set(
                            name.lower()
                            for name in _canonicalize_character_names(
                                list(excluded_audio_names),
                                list(character_elements),
                            )
                        )
                    _audio_character_names = [
                        name
                        for name in _audio_character_names
                        if name.lower() not in _effective_excluded_canonical
                    ]
                    _audio_character_set = {name.lower() for name in _audio_character_names}
                    _audio_character_order = [
                        name
                        for name in _jimeng_refs["audio_order"]
                        if name.lower() in _audio_character_set
                    ]
                    logger.info(
                        f"[video-gen] 分镜 {storyboard_id} 即梦人物图="
                        f"{_image_character_names}({_jimeng_refs['image_selection_mode']})；"
                        f"音频={_audio_character_order}"
                        f"({_jimeng_refs['audio_selection_mode']}/"
                        f"{_jimeng_refs['audio_order_mode']})"
                    )

                    all_names = []
                    _all_character_names = _dedup_order_names(
                        _image_character_names + _audio_character_order
                    )
                    all_names.extend((name, "character") for name in _all_character_names)
                    for field in ['scenes', 'props']:
                        elem_type = field.rstrip('s')
                        all_names.extend(
                            (name, elem_type)
                            for name in names_by_field.get(field, [])
                        )

                    cursor = await db2.execute(
                        "SELECT name, finished_image, audio_file, grid_image, aliases, image_url, volc_asset_uri, volc_asset_status FROM extracted_elements WHERE novel_id = ? AND element_type = 'scene'",
                        (novel_id,)
                    )
                    scene_elements = await cursor.fetchall()

                    cursor = await db2.execute(
                        "SELECT name, finished_image, audio_file, grid_image, aliases, image_url, volc_asset_uri, volc_asset_status FROM extracted_elements WHERE novel_id = ? AND element_type = 'prop'",
                        (novel_id,)
                    )
                    prop_elements = await cursor.fetchall()

                    # 查询元素的图片和音频
                    for name, elem_type in all_names:
                        elem = None
                        
                        if elem_type == 'character':
                            # 人物使用三级匹配
                            matched = find_best_match(name, character_elements, 'character')
                            if matched:
                                # v3.61.158: 人物走 active variant fallback(字段级 merge)
                                from services.extraction_service import ExtractionService as _ES
                                elem_dict = await _backfill_character_audio_from_voice(db2, novel_id, dict(matched))
                                elem = await _ES.resolve_active_character_asset(elem_dict)
                                _v_tag = elem.get("__active_variant_name")
                                if _v_tag:
                                    logger.info(f"[video-gen] 人物三级匹配 '{name}' -> '{matched['name']}' [马甲={_v_tag}]")
                                else:
                                    logger.info(f"[video-gen] 人物三级匹配成功: '{name}' -> '{matched['name']}'")
                            else:
                                logger.warning(f"[video-gen] 人物未找到匹配: '{name}'")
                        elif elem_type == 'scene':
                            # 场景使用三级匹配
                            matched = find_best_match(name, scene_elements, 'scene')
                            if matched:
                                elem = matched
                                logger.info(f"[video-gen] 场景三级匹配成功: '{name}' -> '{matched['name']}'")
                            else:
                                logger.warning(f"[video-gen] 场景未找到匹配: '{name}'")
                        elif elem_type == 'prop':
                            # 道具使用三级匹配
                            matched = find_best_match(name, prop_elements, 'prop')
                            if matched:
                                elem = matched
                                logger.info(f"[video-gen] 道具三级匹配成功: '{name}' -> '{matched['name']}'")
                            else:
                                logger.warning(f"[video-gen] 道具未找到匹配: '{name}'")

                        if elem:
                            data_base_dir = os.path.dirname(get_data_dir())  # data目录的父目录
                            # v3.61.119 BUG FIX: 删除 asset:// URI 分支!
                            # 此函数 `_process_video_generation` 是**即梦 CLI 专用**(走 dreamina.exe),
                            # 即梦完全不认识 asset://xxx URI(那是火山方舟视频专属),
                            # 直接传 → dreamina 当本地文件 open → Windows 报"filename syntax incorrect"
                            _submit_character_image = (
                                elem_type != "character"
                                or name.lower() in _image_character_set
                            )
                            img_added = not _submit_character_image
                            # 优先级:
                            # - 人物:成品图 → AI生成图 → 宫格图 → 参考图。人物卡片和云端 provider 都按这个口径展示/提交;
                            #   这里若先用宫格图,会绕过已打 AI 合规标识的成品图,导致视频端仍拿到无标图。
                            # - 场景/道具:保留老口径,仍优先宫格图 → 成品图 → AI生成图。
                            # v3.61.154 Q4 道具不上传修复:
                            #   原代码三个图都没就**默默 skip**,用户报"关联了道具结果即梦那边没了"
                            #   现在加详细 log 标明每条路径的命中情况,让用户能定位"为啥道具丢了"
                            _tried_paths = []
                            _image_priority = (
                                ["finished_image", "image_url", "grid_image", "reference_image"]
                                if elem_type == "character"
                                else ["grid_image", "finished_image", "image_url"]
                            )
                            for _field in _image_priority:
                                if img_added:
                                    break
                                _value = elem[_field] if _field in elem.keys() else None
                                if not _value:
                                    _tried_paths.append(f"{_field}=空")
                                    continue
                                img_path = resolve_db_path(_value)
                                if os.path.exists(img_path):
                                    if elem_type == "character":
                                        image_items.append((img_path, name, elem_type, {
                                            "input_name": name,
                                            "element_name": elem.get("name"),
                                            "aliases": elem.get("aliases"),
                                            "variant": elem.get("__active_variant_name"),
                                        }))
                                    else:
                                        image_items.append((img_path, name, elem_type))
                                    img_added = True
                                else:
                                    _tried_paths.append(f"{_field}={_value}(文件不存在)")
                            if _submit_character_image and not img_added:
                                logger.warning(
                                    f"[video-gen] 分镜 {storyboard_id} 跳过 {elem_type} '{name}':无可用图片。"
                                    f"尝试路径: {' | '.join(_tried_paths)}。"
                                    f"请在信息提取页给该元素生成/上传图片"
                                )
                            # 角色音频:屏蔽判定只看分镜字段里的 name(跟前端写入/读取 key 一致)
                            # v3.61.135: 不再用 elem.name(素材库正式名)二次判定 — 避免别名场景下前后端不一致
                            _submit_character_audio = (
                                elem_type != "character"
                                or name.lower() in _audio_character_set
                            )
                            if elem['audio_file'] and _submit_character_audio:
                                audio_path = resolve_db_path(elem['audio_file'])
                                if os.path.exists(audio_path):
                                    audio_items.append((audio_path, name))
                            elif elem['audio_file'] and elem_type == "character":
                                logger.info(f"[video-gen] 分镜 {storyboard_id} 跳过被屏蔽的音频: {name}")

                    # ★ v3.59.53 移除「道具文本扫描补充」逻辑
                    # 老逻辑:扫分镜描述文字,如果出现某全局道具名,就自动把它加到上传列表
                    # 问题:覆盖用户在前端的显式删除 — 用户把"帕子"从关联道具里删了,
                    #      但分镜描述文字仍含"帕子",自动补充会把它加回去 → 即梦端仍收到帕子
                    # 现在以 storyboards.props 字段为唯一权威来源,
                    # LLM 漏标时用户可在前端手动 + 添加,删了就真的删了。
            finally:
                await db2.close()

        if audio_items:
            audio_items = _sort_named_assets(
                audio_items,
                locals().get("_audio_character_order", []),
            )

        # 发即梦前按当前模型过滤单条音频时长，并校验所有音频总时长。
        # 2.0:单条/合计 2-15s；2.5:用户口径 2-30s，实际容差
        # 单条 [1.8, 30.2]s、合计 <=30.2s。
        # 这里过滤后跳过该音频,保留其他素材让任务继续
        if audio_items:
            from api.extraction import _probe_audio_duration_seconds
            audio_durations = []
            valid_audios = []
            for ap, an in audio_items:
                try:
                    dur = _probe_audio_duration_seconds(ap)
                    if dur is not None:
                        one_audio_error = reference_audio_duration_error(model_version, [dur])
                    else:
                        one_audio_error = ""
                    if one_audio_error:
                        logger.warning(
                            f"[video-gen] 分镜 {storyboard_id} 跳过音频 '{an}' "
                            f"({one_audio_error})"
                        )
                        continue
                    if dur is not None:
                        audio_durations.append(float(dur))
                except Exception:
                    pass
                valid_audios.append((ap, an))
            audio_items = valid_audios
            total_audio_error = reference_audio_duration_error(
                model_version,
                audio_durations,
            )
            if total_audio_error:
                raise ValueError(total_audio_error)

        # ─────── 即梦 CLI 素材上限（按模型族路由） ───────
        # 当前主流程没有用户参考视频入口；活动开关可额外注入1段缓存黑屏视频。
        # 超出时按统一保留优先级裁剪:
        #   人物 > 场景 > 道具 > 用户关键帧 > 尾帧 > 俯视 A/B。
        MAX_IMAGES = int(_model_caps["max_images"])
        MAX_AUDIO = int(_model_caps["max_audios"])
        MAX_VIDEOS = int(_model_caps["max_videos"])
        MAX_TOTAL_MATERIALS = int(_model_caps["max_total_materials"])

        # 1) 音频按当前模型族上限裁剪
        if len(audio_items) > MAX_AUDIO:
            removed = audio_items[MAX_AUDIO:]
            audio_items = audio_items[:MAX_AUDIO]
            logger.warning(
                f"[video-gen] 分镜 {storyboard_id} 音频超出 {MAX_AUDIO} 个上限,"
                f"裁掉 {len(removed)} 个: {[n for _, n in removed]}"
            )

        # 2) 图片按当前模型族上限裁剪
        if len(image_items) > MAX_IMAGES:
            kept_indices, removed_indices = _select_image_keep_indices(image_items, MAX_IMAGES)
            removed_names = [_image_asset_name(image_items[idx]) for idx in removed_indices]
            image_items = [image_items[idx] for idx in kept_indices]
            logger.warning(
                f"[video-gen] 分镜 {storyboard_id} 图片超出 {MAX_IMAGES} 张上限,"
                f"按人物>场景>道具>关键帧>尾帧>俯视图裁掉 {len(removed_indices)} 个: {removed_names}"
            )

        # 活动开关只改变即梦 CLI 的传输参数，不写入提示词，也不作为首/尾帧。
        # 同一比例全局复用一个本地缓存 MP4，避免每个分镜重复生成文件。
        if include_black_video:
            from services.jimeng_black_video import prepare_jimeng_reference_videos
            videos = await prepare_jimeng_reference_videos([], True, ratio)
            total_materials = len(image_items) + len(audio_items) + len(videos)
            if len(videos) > MAX_VIDEOS or total_materials > MAX_TOTAL_MATERIALS:
                raise ValueError(
                    f"{_model_caps['label']} 开启2秒黑屏视频后素材合计 {total_materials} 个，"
                    f"超过上限 {MAX_TOTAL_MATERIALS} 个；请减少1个图片或音频素材后重试"
                )

        # 构建文件路径列表和引用描述
        images = [item[0] for item in image_items]
        audios = [item[0] for item in audio_items]
        audios = await _normalize_video_reference_audios(
            audios,
            log_prefix=f"video-gen/{storyboard_id}",
        )

        logger.info(
            f"[video-gen] 分镜 {storyboard_id} 最终上传: 图片 {len(images)} 张, "
            f"视频 {len(videos)} 个, 音频 {len(audios)} 个 ({_model_caps['label']} 上限: "
            f"图片≤{MAX_IMAGES}, 视频≤{MAX_VIDEOS}, 音频≤{MAX_AUDIO})"
        )
        logger.info(f"[video-gen] 分镜 {storyboard_id} 图片: {images}, 视频: {videos}, 音频: {audios}")

        # v3.61.181: 拼装统一走 _build_final_video_prompt helper(同步 ark / cool / xinglian)
        #   行为零变化:即梦 CLI 原 L2143-2260 全套逻辑现在在 helper 内,
        #     包括 _strip_llm_metadata + 4 分支 user_edited 校验 + style + file_refs。
        #   ★ text2video 模式不需要 file_refs(没素材),但 helper 会在 image_items/audio_items
        #     都为空时跳过 file_refs 段,所以 generation_mode 判断可以省掉。
        if generation_mode == "multimodal2video":
            _img_items = image_items
            _aud_items = audio_items
        else:
            _img_items = []  # text2video 不拼素材清单
            _aud_items = []

        final_prompt = await _build_final_video_prompt(
            storyboard_id=storyboard_id,
            raw_prompt=prompt,
            image_items=_img_items,
            audio_items=_aud_items,
            with_file_refs=(generation_mode == "multimodal2video"),
            log_prefix="video-gen",
            separate_audio_order=True,
            provider_type="jimeng",
        )

        # v3.61.183: 视频提交日志(create_log)— 进 dreamina CLI 前记一条 running
        _video_log_id = await _log_video_submit_start(
            storyboard_id=storyboard_id,
            provider="jimeng",
            provider_code="seedance",
            model=model_version or "",
            config_name=(config.get("name") if isinstance(config, dict) else "") or "即梦CLI",
            base_url="",  # CLI 没 base_url,留空
            final_prompt=final_prompt,
            images=images,
            audios=audios,
            params={
                "duration": duration,
                "ratio": ratio,
                "resolution": direct_resolution if generation_mode not in ("image2video", "multimodal2video") else None,
                "model_version": model_version,
                "generation_mode": generation_mode,
                "include_black_video": include_black_video,
            },
        )

        async def _submit_jimeng_once() -> dict:
            # 根据 generation_mode 调用不同的生成方法
            if generation_mode == "image2video" and images:
                logger.info(f"[video-gen] 分镜 {storyboard_id} 使用 image2video 生成视频")
                return await video_service.image2video(
                    image=images[0], prompt=final_prompt, duration=duration,
                    resolution=direct_resolution,
                    model_version=model_version, poll=0
                )
            if generation_mode == "multimodal2video" and (images or videos or audios):
                logger.info(f"[video-gen] 分镜 {storyboard_id} 使用 multimodal2video 生成视频")
                return await video_service.multimodal2video(
                    prompt=final_prompt,
                    images=images[:MAX_IMAGES],
                    videos=videos[:MAX_VIDEOS],
                    audios=audios[:MAX_AUDIO],
                    duration=duration, ratio=ratio,
                    resolution=direct_resolution,
                    model_version=model_version, poll=0
                )
            logger.info(f"[video-gen] 分镜 {storyboard_id} 使用 text2video 生成视频 (generation_mode={generation_mode}, images={images})")
            # 默认 text2video，或者没有图片时回退到 text2video
            return await video_service.generate_video(
                prompt=final_prompt,
                duration=duration,
                ratio=ratio,
                resolution=direct_resolution,
                model_version=model_version,
                poll=0,
            )

        result = {}
        _submit_visibility_checked = False
        _submit_visibility: Optional[bool] = None
        _max_submit_attempts = 2
        for _submit_attempt in range(1, _max_submit_attempts + 1):
            result = await _submit_jimeng_once()
            _submit_visibility_checked = False
            _submit_visibility = None
            if result.get("success"):
                _data = result.get("data", {}) or {}
                _gen_status = _data.get("gen_status", "")
                _submit_id = _data.get("submit_id")
                _fail_reason = _data.get("fail_reason", "")
                if (
                    _gen_status == "fail"
                    and _submit_id
                    and _is_jimeng_transient_submit_failure(_fail_reason)
                ):
                    _submit_visibility = await _confirm_jimeng_submit_visible(
                        _submit_id,
                        attempts=5,
                        delay_seconds=3.0,
                    )
                    _submit_visibility_checked = True
                    if _submit_visibility is False and _submit_attempt < _max_submit_attempts:
                        logger.warning(
                            f"[video-gen] 分镜 {storyboard_id} 第 {_submit_attempt} 次提交超时且即梦后台未确认 "
                            f"submit_id={_submit_id},不自动重试以避免即梦侧重复生成;进入轮询后由幽灵任务检测兜底"
                        )
            elif (
                _submit_attempt < _max_submit_attempts
                and _is_jimeng_transient_submit_failure(str(result.get("error") or result.get("message") or ""))
            ):
                logger.warning(
                    f"[video-gen] 分镜 {storyboard_id} 第 {_submit_attempt} 次提交网络/超时失败(无可认领 submit_id),"
                    f"自动重试一次: {str(result.get('error') or result.get('message') or '')[:200]}"
                )
                await asyncio.sleep(3)
                continue
            break

        if result.get("success"):
            data = result.get("data", {})
            gen_status = data.get("gen_status", "")
            submit_id = data.get("submit_id")
            fail_reason = data.get("fail_reason", "")
            guidance = data.get("guidance", "")

            # v3.61.254 修复②:提交即失败(gen_status=fail)前先看有没有 submit_id。
            #   即梦撞 1310 等场景会返回"fail + submit_id"混合响应 —— 任务其实已建在生成。
            #   旧逻辑在取 submit_id 之前就 return,把这种已受理任务误判失败 → 上层 60s 后重复提交撞自己并发。
            # v3.61.295: 但"提交网络超时 + submit_id"不能直接认领。
            #   冷启动首条视频实测会返回 context deadline exceeded + submit_id,query_result 一直 querying,
            #   但即梦任务列表没有对应活跃任务。此时 submit_id 可能只是 CLI 本地幽灵记录。
            #   故:业务类 fail(如 1310)仍可认领;网络/超时类 fail 必须先按 submit_id 反查即梦任务列表。
            #   v3.61.xxx:只要 CLI 给了 submit_id 就不自动二次提交,避免实际已落地但短时不可见时重复扣费。
            if gen_status == "fail" and not submit_id:
                fail_reason = fail_reason or "未知原因"
                logger.error(f"[video-gen] 分镜 {storyboard_id} 提交即失败(无 submit_id): {fail_reason}")
                if guidance:
                    logger.error(f"[video-gen] 分镜 {storyboard_id} 解决建议: {guidance}")

                # ★ v3.59.55:走翻译函数,把英文/技术性错误转成中文友好提示(包含 4010 协议签署引导等)
                full_reason = _translate_jimeng_fail_reason(fail_reason, guidance)
                await _log_video_submit_end(_video_log_id, success=False, fail_reason=full_reason)
                await storyboard_service.update_video_status(storyboard_id, "failed", fail_reason=full_reason)
                return

            if gen_status == "fail" and submit_id:
                if _is_jimeng_transient_submit_failure(fail_reason):
                    if _submit_visibility_checked:
                        visible = _submit_visibility
                    else:
                        visible = await _confirm_jimeng_submit_visible(
                            submit_id,
                            attempts=5,
                            delay_seconds=3.0,
                        )
                    if visible is False:
                        logger.warning(
                            f"[video-gen] 分镜 {storyboard_id} 提交超时且 submit_id={submit_id} "
                            f"暂未出现在即梦任务列表;仍按已受理进入轮询,避免自动重提交造成重复扣费: {fail_reason!r}"
                        )
                    elif visible is True:
                        logger.warning(
                            f"[video-gen] 分镜 {storyboard_id} 提交超时但即梦后台确认 submit_id={submit_id} "
                            f"已在即梦任务列表,按已受理进入轮询"
                        )
                    else:
                        logger.warning(
                            f"[video-gen] 分镜 {storyboard_id} 提交超时且无法反查即梦任务列表 "
                            f"submit_id={submit_id},保守按已提交进入轮询: {fail_reason!r}"
                        )
                elif _is_jimeng_recoverable_submit_failure(fail_reason):
                    logger.warning(
                        f"[video-gen] 分镜 {storyboard_id} 即梦返回可恢复 gen_status=fail 且带 submit_id={submit_id} "
                        f"(fail_reason={data.get('fail_reason')!r}) → 按已排队进入轮询"
                    )
                else:
                    visible = await _confirm_jimeng_submit_visible(
                        submit_id,
                        attempts=2,
                        delay_seconds=1.0,
                    )
                    if visible is True:
                        logger.warning(
                            f"[video-gen] 分镜 {storyboard_id} 即梦提交阶段失败但 submit_id={submit_id} 已在即梦任务列表可见,"
                            f"继续按已受理任务轮询: {fail_reason!r}"
                        )
                    else:
                        full_reason = _translate_jimeng_fail_reason(fail_reason, guidance)
                        logger.warning(
                            f"[video-gen] 分镜 {storyboard_id} 即梦提交阶段硬失败但带 submit_id={submit_id},"
                            f"任务列表反查未确认任务存在,不再认领为生成中: {fail_reason!r}"
                        )
                        await _log_video_submit_end(_video_log_id, success=False, fail_reason=full_reason)
                        await storyboard_service.update_video_status(
                            storyboard_id,
                            "failed",
                            fail_reason=full_reason,
                        )
                        return

            if submit_id:
                # 保存 submit_id 到数据库，状态保持 generating
                submit_saved = await storyboard_service.update_submit_id(
                    storyboard_id,
                    submit_id,
                    "generating",
                )
                logger.info(f"分镜 {storyboard_id} 视频任务已提交，submit_id: {submit_id}，模型: {model_name}，模式: {generation_mode}")
                await _log_video_submitted(_video_log_id, provider="jimeng", submit_id=submit_id)
                # 单镜/旧批量接口以前完全依赖 VideoView 的前端定时器推进
                # query_result -> 下载 -> 尾帧回写。用户切换菜单后组件卸载，
                # 定时器停止，本地就会长期停在 generating。提交成功后由后端
                # 持续收敛；全局队列已有自己的 worker，调用时显式关闭本任务。
                if submit_saved and start_background_reconcile:
                    _ensure_standalone_video_reconcile(storyboard_id)
            else:
                # 提交成功但没有 submit_id，视为失败
                # 把 dreamina 返回的完整 data 当作失败原因,便于排查
                raw_summary = json.dumps(data, ensure_ascii=False)[:300] if data else "(无数据)"
                _fail_msg = f"提交成功但未返回 submit_id;原始响应: {raw_summary}"
                await _log_video_submit_end(_video_log_id, success=False, fail_reason=_fail_msg)
                await storyboard_service.update_video_status(
                    storyboard_id, "failed",
                    fail_reason=_fail_msg
                )
                logger.error(f"分镜 {storyboard_id} 视频任务提交成功但未返回 submit_id, 完整 data={data}")
        else:
            error = result.get("error", "未知错误")
            _err_str = str(error)
            # v3.61.212: 登录态失效 → 友好提示,不甩 "dreamina login" CLI 黑话;并区分渠道引导
            if "未检测到有效登录" in _err_str or "dreamina login" in _err_str.lower() or "请先登录" in _err_str:
                _fail_msg = (
                    "视频提交失败:即梦登录态已失效。"
                    "若用即梦模式,请点页面顶部「登录即梦」按钮重新授权;"
                    "若用 Cool / 星链云 / 火山方舟等渠道,请直接点「重新生成」重试。"
                )
            elif (
                "dreamina_cli" in _err_str.lower()
                and ("not allowed" in _err_str.lower() or "permission denied" in _err_str.lower())
            ):
                _fail_msg = _translate_jimeng_fail_reason(_err_str)
            else:
                _fail_msg = f"视频任务提交失败: {_err_str[:500]}"
            await _log_video_submit_end(_video_log_id, success=False, fail_reason=_fail_msg)
            await storyboard_service.update_video_status(
                storyboard_id, "failed",
                fail_reason=_fail_msg
            )
            logger.error(f"分镜 {storyboard_id} 视频任务提交失败: {error}")
    except Exception as e:
        # v3.61.183: 异常情况下也要 mark _video_log_id 为 error(如果已 create)
        _vlid = locals().get('_video_log_id', None)
        if _vlid:
            try:
                await _log_video_submit_end(_vlid, success=False, fail_reason=f"{type(e).__name__}: {e}")
            except Exception:
                pass
        await storyboard_service.update_video_status(
            storyboard_id, "failed",
            fail_reason=f"后端异常: {type(e).__name__}: {str(e)[:300]}"
        )
        logger.error(f"分镜 {storyboard_id} 视频生成异常: {e}")


@router.post("/batch-generate")
async def batch_generate_videos(request: BatchVideoGenerateRequest, background_tasks: BackgroundTasks):
    """批量提交视频生成任务。

    ⚠️ 串行尾帧模式(serial_chain_mode=true)请改走前端逐个调 /generate 的方式 —
    本接口是异步并发提交,无法实现"等上镜真完成才发下一镜"的串行效果。
    前端应在 serial_chain_mode 时不调用本接口。这里只是为了 API 兼容性接收参数。
    """
    if not request.params and not request.video_config_id:
        return {"success": False, "message": "缺少 params 或 video_config_id"}

    # 串行尾帧模式拒绝走批量并发(防止前端误用)
    if request.serial_chain_mode:
        return {
            "success": False,
            "message": "串行尾帧模式下请使用单镜逐个生成接口(/generate),而不是批量并发",
        }

    # ★ 2026-04 v3.59.43:防重复提交 — 过滤掉"已经在 generating 且 30 分钟内提交"的分镜
    # 用户场景:第一次串行批量还在跑,又点取消串行后再批量,会导致同分镜被提交 2 次
    # v3.61.23 重写:逐个用原子 _try_claim 占位,占位失败的进 skipped 列表
    raw_ids = list(request.storyboard_ids)
    if not raw_ids:
        return {"success": False, "message": "未选中任何分镜"}

    filtered_ids = []
    skipped = []
    for sid in raw_ids:
        claim = await _try_claim_storyboard_for_submit(sid, provider="jimeng")
        if claim["claimed"]:
            filtered_ids.append(sid)
        elif claim.get("not_found"):
            # id 不存在,直接跳过
            continue
        else:
            skipped.append(sid)

    if skipped:
        logger.warning(f"[batch-generate] 跳过 {len(skipped)} 个已在生成中的分镜(防重复扣费): {skipped}")
    if not filtered_ids:
        queued_count = 0
        for sid in skipped:
            # skipped 不多,这里仅用于更准确的用户提示。
            try:
                _db = await get_db()
                try:
                    _cur = await _db.execute("SELECT video_status FROM storyboards WHERE id = ?", (sid,))
                    _r = await _cur.fetchone()
                    if _r and ((_r["video_status"] or "").lower() == "queued"):
                        queued_count += 1
                finally:
                    await _db.close()
            except Exception:
                pass
        if queued_count == len(raw_ids):
            return {
                "success": False,
                "message": f"所选 {len(raw_ids)} 个分镜都已在全局队列等待生成,为避免重复扣费已拒绝。",
                "skipped": skipped,
            }
        return {
            "success": False,
            "message": f"所选 {len(raw_ids)} 个分镜全部已在生成中(submit 不到 30 分钟),为避免重复扣费已拒绝。请等当前任务完成后再试",
            "skipped": skipped,
        }

    # _try_claim 已经原子地占位 status='generating' + 刷新 submit_time + 清旧 submit_id,无需再 mark
    params_dict = request.params.model_dump() if request.params else None
    background_tasks.add_task(
        _process_batch_generation,
        filtered_ids,
        request.video_config_id,
        params_dict,
    )
    return {"success": True, "message": f"已提交 {len(filtered_ids)} 个视频生成任务"}


class AbortChainRequest(BaseModel):
    """串行尾帧批次中,某镜失败后把"后续仍 pending/generating 的镜"全部置 chain_aborted。
    by_id_list = 当前批次的分镜 id 列表(由前端传过来,严格按 sort_order 升序);
    failed_storyboard_id = 触发中断的那一镜 id;
    后端只把 by_id_list 中位置在 failed_storyboard_id 之后的镜置为 chain_aborted。
    不会动 done 镜,也不会动不在 by_id_list 中的镜。
    """
    by_id_list: List[int]
    failed_storyboard_id: int
    fail_reason: Optional[str] = None  # 可选:用于 fail_reason 文案,默认"前置分镜 #X 失败,本镜未生成"


@router.post("/abort-chain-after")
async def abort_chain_after(request: AbortChainRequest):
    """串行尾帧批次中触发链路中断时调用,把失败镜之后的镜全部置 chain_aborted。"""
    if not request.by_id_list or request.failed_storyboard_id not in request.by_id_list:
        return {"success": False, "message": "failed_storyboard_id 必须在 by_id_list 中"}

    fail_idx = request.by_id_list.index(request.failed_storyboard_id)
    after_ids = request.by_id_list[fail_idx + 1:]
    if not after_ids:
        return {"success": True, "aborted": 0, "message": "失败镜已是最后一项,无后续可中断"}

    db = await get_db()
    aborted = 0
    try:
        cursor = await db.execute(
            "SELECT video_status, submit_id, video_fail_reason FROM storyboards WHERE id = ?",
            (request.failed_storyboard_id,)
        )
        failed_row = await cursor.fetchone()
        failed_status = failed_row["video_status"] if failed_row else None
        if failed_status == "download_failed":
            logger.info(
                f"[abort-chain] 跳过中断:#{request.failed_storyboard_id} 是 download_failed,"
                "仅本地下载失败,后续镜保持原状态"
            )
            return {
                "success": True,
                "aborted": 0,
                "aborted_ids": [],
                "message": "上一镜已生成但本地下载失败,后续镜保持待生成;请先重试下载上一镜",
            }

        if failed_status not in ("failed", "chain_aborted"):
            logger.info(
                f"[abort-chain] 跳过中断:#{request.failed_storyboard_id} 当前状态不是失败态"
                f"(status={failed_status}, submit_id={(failed_row['submit_id'] if failed_row else None)}, "
                f"reason={(failed_row['video_fail_reason'] if failed_row else None)})"
            )
            return {
                "success": True,
                "aborted": 0,
                "aborted_ids": [],
                "skipped": True,
                "message": "前置分镜仍在生成或未确认失败,后续镜保持原状态",
            }

        reason = request.fail_reason or f"前置分镜(id #{request.failed_storyboard_id})失败,本镜未生成;请先重试该前置分镜"
        # 仅对未定型镜执行(不动 done/failed/download_failed/chain_aborted 已经定型的)
        # v3.61.153 codex P1:加 'queued' — 串行批次后续镜常在 queued 状态,
        # 原条件漏了,导致前镜失败后后续镜不会被 chain_aborted
        placeholder = ",".join(["?"] * len(after_ids))
        cursor = await db.execute(
            f"SELECT id FROM storyboards WHERE id IN ({placeholder}) "
            f"  AND (video_status IS NULL OR video_status IN ('pending','generating','queued'))",
            after_ids
        )
        targets = [r["id"] for r in await cursor.fetchall()]
        for tid in targets:
            await db.execute(
                "UPDATE storyboards SET video_status = ?, video_fail_reason = ? WHERE id = ?",
                ("chain_aborted", reason, tid)
            )
            aborted += 1
        await db.commit()
        logger.info(f"[abort-chain] 因 #{request.failed_storyboard_id} 失败,中断后续 {aborted} 镜")
        return {"success": True, "aborted": aborted, "aborted_ids": targets}
    finally:
        await db.close()


class AbortStuckVideoRequest(BaseModel):
    storyboard_ids: List[int]
    reason: Optional[str] = None


@router.post("/abort-stuck-video")
async def abort_stuck_video(request: AbortStuckVideoRequest):
    """用户手动中止卡住的视频生成:把指定分镜里仍 generating/queued 的镜标为 failed,
    让用户能立刻重新勾选生成(不再干等 6 小时兜底)。
    注:不取消上游任务(部分 provider 无 cancel),仅解除本地"生成中"占用。"""
    if not request.storyboard_ids:
        return {"success": True, "aborted": 0, "aborted_ids": []}
    reason = request.reason or "已手动中止生成,可重新勾选生成"
    db = await get_db()
    aborted_ids: list = []
    try:
        placeholder = ",".join(["?"] * len(request.storyboard_ids))
        cursor = await db.execute(
            f"SELECT id FROM storyboards WHERE id IN ({placeholder}) "
            f"  AND video_status IN ('generating','queued')",
            request.storyboard_ids,
        )
        targets = [r["id"] for r in await cursor.fetchall()]
        for tid in targets:
            await db.execute(
                """
                UPDATE storyboards
                SET video_status = ?,
                    video_fail_reason = ?,
                    submit_id = CASE
                        WHEN COALESCE(video_provider, 'jimeng') = 'jimeng' THEN NULL
                        ELSE submit_id
                    END
                WHERE id = ?
                """,
                ("failed", reason, tid),
            )
            await db.execute(
                """
                UPDATE video_task_queue
                SET status = 'aborted',
                    finished_at = ?,
                    error_code = 'USER_ABORTED',
                    error_message = ?
                WHERE storyboard_id = ?
                  AND status IN ('queued', 'generating')
                """,
                (now_beijing_str(), reason, tid),
            )
            aborted_ids.append(tid)
        await db.commit()
        logger.info(f"[abort-stuck-video] 用户手动中止 {len(aborted_ids)} 个卡住的视频任务: {aborted_ids}")
        return {"success": True, "aborted": len(aborted_ids), "aborted_ids": aborted_ids}
    finally:
        await db.close()


async def _apply_speaker_filter_to_storyboard(sb_id: int, prompt: str) -> set:
    """v3.61.135/136: 种菜模式自动过滤 — 即梦/ARK/队列 三路径共用

    v3.61.136 拆字段:
        excluded_audios       = 用户**手动**屏蔽(永久,只有用户能取消)
        auto_excluded_audios  = 本函数**自动**屏蔽(跟随 prompt 实时变化:
                                  非说话人 → 加进自动屏蔽
                                  prompt 后来又说话了 → 自动从自动屏蔽里移除)

    读 KEY_AUDIO_AUTO_SPEAKER_FILTER 开关:关 → noop;开 → 同步上面两条

    返回:并集(给调用方做即时过滤)
    """
    try:
        from services.settings_service import SettingsService, KEY_AUDIO_AUTO_SPEAKER_FILTER
        on = await SettingsService.get_bool(KEY_AUDIO_AUTO_SPEAKER_FILTER, default=False)
    except Exception:
        on = False
    if not on:
        # v3.61.155: 开关关 → 顺手把 auto_excluded_audios 字段清空,防"曾经开过"的残留屏蔽
        # 否则用户关开关后,视频生成路径直接读 DB 字段还会过滤,用户感觉"关了还在过滤"
        try:
            from database.db import get_db as _get_db_off
            _db_off = await _get_db_off()
            try:
                await _db_off.execute(
                    "UPDATE storyboards SET auto_excluded_audios = '[]' "
                    "WHERE id = ? AND auto_excluded_audios IS NOT NULL AND auto_excluded_audios != '[]'",
                    (sb_id,),
                )
                await _db_off.commit()
            finally:
                await _db_off.close()
        except Exception as _e:
            logger.warning(f"[speaker-filter] sb={sb_id} 清 auto_excluded_audios 残留失败(忽略): {_e}")
        return set()
    if not prompt:
        return set()

    speakers = _extract_speakers_from_prompt(prompt)
    # v3.61.136: 没识别到说话人不动 auto_excluded(避免错读 prompt 导致全部解封)

    from database.db import get_db as _get_db
    import json as _json
    db = await _get_db()
    try:
        cur = await db.execute(
            "SELECT characters, excluded_audios, auto_excluded_audios FROM storyboards WHERE id = ?",
            (sb_id,),
        )
        row = await cur.fetchone()
        if not row:
            return set()
        try:
            char_raw = _json.loads(row["characters"] or "[]")
        except Exception:
            char_raw = []
        try:
            manual_excluded = set(_json.loads(row["excluded_audios"] or "[]"))
        except Exception:
            manual_excluded = set()
        try:
            auto_excluded = set(_json.loads(row["auto_excluded_audios"] or "[]"))
        except Exception:
            auto_excluded = set()

        # 拆逗号(角色字段可能"凌瑶华,凌婉兮"连写)
        expanded = set()
        for n in char_raw:
            for s in str(n).replace("，", ",").split(","):
                ss = s.strip()
                if ss:
                    expanded.add(ss)

        if not speakers:
            # 没识别到说话人时:不动 auto_excluded(prompt 可能被错误清空,
            # 别把已经标对的"非说话人"全部解封)
            return manual_excluded | auto_excluded

        non_speakers = expanded - speakers  # 这一帧应该自动屏蔽的
        # auto_excluded 必须跟随当前 prompt 重新计算:
        # 现在说话的角色要从自动屏蔽里释放;手动屏蔽留在 excluded_audios 中单独生效。
        new_auto = non_speakers - manual_excluded
        if new_auto == auto_excluded:
            return manual_excluded | auto_excluded  # 没变化,不写盘

        try:
            await db.execute(
                "UPDATE storyboards SET auto_excluded_audios = ? WHERE id = ?",
                (_json.dumps(sorted(new_auto), ensure_ascii=False), sb_id),
            )
            await db.commit()
            _added = new_auto - auto_excluded
            _removed = auto_excluded - new_auto
            logger.info(
                f"[speaker-filter] sb={sb_id} 自动屏蔽更新:"
                + (f" 新增 {sorted(_added)}" if _added else "")
                + (f" 释放 {sorted(_removed)}" if _removed else "")
                + f" → auto_excluded = {sorted(new_auto)}"
            )
        except Exception as e:
            logger.warning(f"[speaker-filter] sb={sb_id} 写回 auto_excluded_audios 失败(不影响生成): {e}")
        return manual_excluded | new_auto
    finally:
        await db.close()


def _extract_speaker_order_from_prompt(text: str) -> List[str]:
    """按 prompt 中首次开口的文本位置抽取说话人顺序。

    宽容匹配(避免漏识别导致误屏蔽真实说话人):
        # 完整规范格式
        台词:角色名:「...」
        内心OS:角色名:「...」
        画外音:角色名:「...」 或 画外音:旁白:「...」
        # 简化变体(用户/旧模板偶尔会用)
        台词: 角色名:"..."           (双引号)
        台词: 角色名:".."             (单引号)
        OS: 角色名: ...               (空格分隔,无引号)
        VO: 角色名: ...
        角色名(VO): ...               (括号内 VO)
        角色名(内心OS): ...
        # 组合模板同一行格式
        台词/OS/口型:现场台词:角色名:「...」 / 内心OS:角色名:「...」
        台词/OS/口型:角色画外台词:角色名:「...」
        # 组合模板键值格式
        台词/OS/口型:类型=现场台词/角色=角色名:「...」
        台词/OS/口型:类型=角色画外台词/角色=角色名:「...」

    返回按首次发声位置去重后的角色名列表。"旁白"过滤掉。
    不按正则分支的执行先后排序，避免括号 VO 写在前面、规范台词写在后面时
    被错误地反排。若无任何匹配，返回空列表。
    """
    if not text:
        return []
    import re
    matches: List[tuple[int, int, str]] = []
    match_seq = 0
    rejected = {
        '旁白', '无', 'none', 'None', '-', '台词', '内心OS', '画外音', 'OS', 'VO',
        '类型', '角色', '现场台词', '角色画外台词', '画外台词',
    }
    rejected_lower = {name.lower() for name in rejected}

    def _add_name(raw_name: str, position: int):
        nonlocal match_seq
        name = (raw_name or "").strip()
        if name and name.lower() not in rejected_lower:
            matches.append((max(0, position), match_seq, name))
            match_seq += 1

    def _collect(pattern, source=text, base_offset: int = 0):
        for match in pattern.finditer(source):
            _add_name(match.group(1), base_offset + match.start(1))

    # ① 行首完整 / 半完整字段格式:字段:角色名:引号
    # 必须从行首识别,且空白仅允许空格/Tab,不能用 \s 跨行。
    # 否则“台词/OS:\n台词:云瓷:”会从标题里的 OS: 起步,错误抓成说话人“台词”,
    # 同时吞掉真正的“台词:云瓷:”匹配。
    pattern1 = re.compile(
        r'^[ \t]*(?:[-*•][ \t]*)?'
        r'(?:现场台词|角色画外台词|画外台词|台词|内心[ \t]*OS|画外音|OS|VO)'
        r'[ \t]*[:：][ \t]*'
        r'([^:：「"\'\r\n（(〔\[｜/]{1,15}?)[ \t]*[:：]',
        re.MULTILINE,
    )
    _collect(pattern1)

    # ② 新组合模板把多段人声放在同一行。既匹配总字段后的第一段，
    # 也匹配 “/ 现场台词:另一角色:” 这类后续段。
    pattern_inline = re.compile(
        r'(?:台词[ \t]*/[ \t]*OS[ \t]*/[ \t]*口型[ \t]*[:：]|'
        r'[/｜;；][ \t]*)'
        r'(?:现场台词|角色画外台词|画外台词|台词|内心[ \t]*OS|画外音|OS|VO)'
        r'[ \t]*[:：][ \t]*'
        r'([^:：「"\'\r\n（(〔\[｜/]{1,15}?)[ \t]*[:：]',
        re.MULTILINE,
    )
    _collect(pattern_inline)

    # ③ 组合模板键值格式。只在“台词/OS/口型”字段行内读取角色键，
    # 避免动作、人物状态等其他行里的“角色=某人”污染说话人。
    combined_heading = re.compile(
        r'^[ \t]*(?:[-*•][ \t]*)?'
        r'台词[ \t]*/[ \t]*OS[ \t]*/[ \t]*口型[ \t]*[:：]',
    )
    keyed_role = re.compile(
        r'(?:^|[/｜;；:：])[ \t]*角色[ \t]*(?:[=＝]|[:：])[ \t]*'
        r'([^:：「"\'\r\n（(〔\[｜/;；=＝]{1,15}?)[ \t]*[:：]',
    )
    # 极少数模型会把“类型=现场台词/角色=裴砚之”退化成“类型:裴砚之”。
    # 仅在组合字段行首兜底，并通过 rejected 排除“现场台词”等类型值。
    degraded_type_role = re.compile(
        r'^[ \t]*(?:[-*•][ \t]*)?'
        r'台词[ \t]*/[ \t]*OS[ \t]*/[ \t]*口型[ \t]*[:：][ \t]*'
        r'类型[ \t]*[:：][ \t]*'
        r'([^:：「"\'\r\n（(〔\[｜/;；=＝]{1,15}?)[ \t]*[:：]',
    )
    line_offset = 0
    for line_with_ending in text.splitlines(keepends=True):
        line = line_with_ending.rstrip("\r\n")
        if not combined_heading.match(line):
            line_offset += len(line_with_ending)
            continue
        _collect(keyed_role, line, line_offset)
        degraded_match = degraded_type_role.match(line)
        if degraded_match:
            _add_name(degraded_match.group(1), line_offset + degraded_match.start(1))
        line_offset += len(line_with_ending)

    # ④ 角色名(VO/OS/内心OS): ... 这种括号变体
    pattern2 = re.compile(
        r'^[ \t]*(?:[-*•][ \t]*)?'
        r'([^\s:：「\r\n（(]{1,15}?)[ \t]*[\((][ \t]*'
        r'(?:VO|OS|内心[ \t]*OS|画外音|旁白)[ \t]*[\))][ \t]*[:：]',
        re.MULTILINE,
    )
    _collect(pattern2)

    ordered: List[str] = []
    seen = set()
    for _, _, name in sorted(matches, key=lambda item: (item[0], item[1])):
        key = name.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(name)
    return ordered


def _extract_speakers_from_prompt(text: str) -> set:
    """兼容旧调用：返回说话人集合；顺序需求请用 _extract_speaker_order_from_prompt。"""
    return set(_extract_speaker_order_from_prompt(text))


def _dedup_order_names(names: List[str]) -> List[str]:
    """人物顺序字段统一去空、大小写不敏感去重，并保留首次出现。"""
    result: List[str] = []
    seen = set()
    source = [names] if isinstance(names, str) else (names or [])
    for raw_name in source:
        for part in re.split(r'[,，、]', str(raw_name or "")):
            name = part.strip()
            key = name.lower()
            if not key or key in seen:
                continue
            seen.add(key)
            result.append(name)
    return result


_ENABLED_PROP_FIELD_RE = re.compile(
    r"(?<![A-Za-z0-9_\u4e00-\u9fff])启用道具\s*(?:=|＝|[:：])"
)


def _merge_structured_enabled_props(
    stored_props: List[str],
    prompt: str,
    prop_elements: Optional[List[Any]] = None,
    excluded_props: Optional[List[str]] = None,
) -> tuple[List[str], bool]:
    """合并节级 ``启用道具``，并告知调用方是否必须关闭全文补扫。

    - 存在 ``启用道具``：它是当前小节道具外显白名单，只补充该名单中能映射
      到素材库的道具，禁止再从结尾状态、隐藏物、钩子等全文区域扫入道具。
    - 不存在：保留旧模板的全文补扫兜底。
    - 已保存/手动加入的 props 不删除，避免程序擅自覆盖用户选择。
    - 用户显式移除的 excluded_props 优先于模板里的 ``启用道具``，否则删除后
      会在刷新关联元素时被结构化白名单立即补回；手动重新加入 stored_props
      仍拥有最高优先级，兼容“删掉后又主动加回”的操作。
    """
    merged = _dedup_order_names(stored_props)
    text = str(prompt or "")
    has_enabled_field = bool(_ENABLED_PROP_FIELD_RE.search(text))
    if not has_enabled_field:
        return merged, False

    normalized_elements = [
        dict(element) if hasattr(element, "keys") else (element or {})
        for element in (prop_elements or [])
    ]

    def _canonical_prop_keys(names: Optional[List[str]]) -> set[str]:
        """把正式名/别名统一映射到素材库正式名，供排除名单可靠比较。"""
        keys: set[str] = set()
        for raw_name in names or []:
            name = str(raw_name or "").strip()
            if not name:
                continue
            keys.add(name.casefold())
            matched = find_best_match(name, normalized_elements, 'prop')
            if matched:
                canonical = str(matched.get("name") or "").strip()
                if canonical:
                    keys.add(canonical.casefold())
        return keys

    # 当前已落库 props 代表用户当前选择，优先级高于历史 excluded；这与
    # StoryboardService.update_storyboard 中“手动重新加入即清除排除”保持一致。
    stored_prop_keys = _canonical_prop_keys(merged)
    blocked_prop_keys = _canonical_prop_keys(excluded_props) - stored_prop_keys
    declared_enabled = _match_section_prop_names(
        text,
        normalized_elements,
        enforce_visual_evidence=False,
    )
    matched_enabled = _match_section_prop_names(
        text,
        normalized_elements,
    )
    # 历史分镜可能已经把“启用清单里声明、但逐镜从未显露”的道具写入 props。
    # 只过滤这种有明确结构化冲突的自动关联项；未出现在启用清单里的手动道具
    # 仍保留，避免程序擅自覆盖用户选择。
    no_visual_evidence = {
        name.casefold()
        for name in declared_enabled
        if name not in matched_enabled
    }
    if no_visual_evidence:
        invalid_variants = set(no_visual_evidence)
        for element in normalized_elements:
            canonical = str(element.get("name") or "").strip()
            if canonical.casefold() not in no_visual_evidence:
                continue
            aliases_raw = element.get("aliases") or []
            if isinstance(aliases_raw, str):
                try:
                    aliases_raw = json.loads(aliases_raw)
                except Exception:
                    aliases_raw = re.split(r"[,，、]", aliases_raw)
            invalid_variants.update(
                str(alias).strip().casefold()
                for alias in (aliases_raw if isinstance(aliases_raw, list) else [])
                if str(alias).strip()
            )
        merged = [
            name
            for name in merged
            if str(name).strip().casefold() not in invalid_variants
        ]

    seen = {name.lower() for name in merged}
    for name in matched_enabled:
        key = str(name or "").strip().lower()
        if key in blocked_prop_keys:
            logger.info(
                "[storyboard-elements] 启用道具跳过(用户已显式移除): '%s'",
                str(name).strip(),
            )
            continue
        if key and key not in seen:
            seen.add(key)
            merged.append(str(name).strip())
    return merged, True


_SHOT_LINE_RE = re.compile(
    r'(?mi)^[ \t]*(?:[-*#>]+[ \t]*)*(?:镜号|镜头|镜|Shot)[ \t]*\d+'
)
_VOICE_FIELD_RE = re.compile(
    r'(?:^|[|｜/;；])[ \t]*(?:'
    r'台词[ \t]*/[ \t]*OS[ \t]*/[ \t]*口型|'
    r'现场台词|角色画外台词|画外台词|台词|内心[ \t]*OS|画外音|OS|VO|'
    r'对白|人声|口型'
    r')[ \t]*[:：]',
    re.IGNORECASE,
)
_VISUAL_TRAILER_RE = re.compile(
    r'(?mi)^[ \t]*(?:[📎🔗📏📋]\s*)?(?:'
    r'本节结尾状态|本节回收目标|本节人声审计|'
    r'本节总时长|本小节总时长|自查|检查清单'
    r')[^\r\n]*'
)
_STRUCTURED_VISIBLE_FIELD_RE = re.compile(
    # 同时兼容：
    #   本镜人物白名单:本镜可见人物=...
    #   本镜人物白名单:可见人物=...
    # 负向后顾避免把“局部可见人物”里的“可见人物”再次截取。
    r'(?<![A-Za-z0-9_\u4e00-\u9fff])'
    r'(?:本镜)?(?:局部可见人物|可见人物|新入场人物)'
    r'[ \t]*(?:=|＝|[:：])[ \t]*'
    r'(.*?)'
    r'(?=[ \t]*[/／｜|;；][ \t]*(?:本镜)?(?:'
    r'局部可见人物|可见人物|新入场人物|退场人物|画外声源|启用角色参考'
    r')[ \t]*(?:=|＝|[:：])|[\r\n]|$)',
)


def _visual_story_text(prompt: str) -> str:
    """只保留可用于判断人物画面首次出镜的镜头叙述。

    模板节头中的人物白名单、起始状态会先列全员，不能拿来决定图片顺序；
    台词/OS/画外音只代表发声，也不能冒充画面出镜。因此优先从第一条真实
    镜头行开始，逐行剥掉人声字段，并在整节镜头结束后截断节尾状态/审计块。
    “本镜人声审计”是每镜内部字段，不能拿它截断整节，否则第二镜及后续
    才出场的人物会被误判为不出镜。
    """
    text = prompt or ""
    shot_match = _SHOT_LINE_RE.search(text)
    if shot_match:
        text = text[shot_match.start():]

    trailer_match = _VISUAL_TRAILER_RE.search(text)
    if trailer_match:
        text = text[:trailer_match.start()]

    # 新模板每镜都有明确的视觉白名单。优先只读“可见/局部可见/新入场”，
    # 故意不读同一行后面的“本镜画外声源”，避免尚未入画的先说话角色
    # 抢到人物图片前排。
    structured_visible = [
        match.group(1).strip()
        for match in _STRUCTURED_VISIBLE_FIELD_RE.finditer(text)
        if match.group(1).strip()
    ]
    if structured_visible:
        return "\n".join(structured_visible)

    visual_lines: List[str] = []
    for line in text.splitlines():
        voice_match = _VOICE_FIELD_RE.search(line)
        if voice_match:
            # 一行可能是“镜头1...｜画面...｜台词:...”，只删人声字段之后；
            # 若本行本来就是台词字段，则整行自然变为空。
            line = line[:voice_match.start()]
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(
            r'^(?:【)?(?:本节人物与道具白名单|场景起始状态|本节起始状态|'
            r'本节人物状态|人物白名单|角色白名单)',
            stripped,
        ):
            continue
        visual_lines.append(line)
    return "\n".join(visual_lines)


def _order_characters_by_visual_appearance(
    character_names: List[str],
    prompt: str,
) -> List[str]:
    """人物图片顺序：按镜头画面叙述中的首次出镜；未命中者稳定追加。"""
    candidates = _dedup_order_names(character_names)
    visual_text = _visual_story_text(prompt)
    found: List[tuple[int, int, str]] = []
    missing: List[str] = []
    for original_index, name in enumerate(candidates):
        position = visual_text.find(name)
        if position < 0:
            missing.append(name)
        else:
            found.append((position, original_index, name))
    found.sort(key=lambda item: (item[0], item[1]))
    return [name for _, _, name in found] + missing


def _optional_json_name_list(raw_value: Any) -> Optional[List[str]]:
    """读取可空 JSON 人名列表：NULL 表示自动，[] 表示用户明确不提交。"""
    if raw_value is None:
        return None
    if isinstance(raw_value, list):
        return _dedup_order_names(raw_value)
    try:
        parsed = json.loads(raw_value or "[]")
    except Exception:
        return None
    return _dedup_order_names(parsed if isinstance(parsed, list) else [])


def _character_element_aliases(element: Any) -> List[str]:
    data = dict(element) if hasattr(element, "keys") else (element or {})
    aliases_raw = data.get("aliases") or []
    if isinstance(aliases_raw, str):
        try:
            aliases_raw = json.loads(aliases_raw)
        except Exception:
            aliases_raw = re.split(r"[,，、]", aliases_raw)
    return _dedup_order_names(aliases_raw if isinstance(aliases_raw, list) else [])


def _canonicalize_character_names(
    names: List[str],
    character_elements: Optional[List[Any]] = None,
) -> List[str]:
    """把提示词/旧分镜里的简称映射到素材库正式名，无法匹配时保留原名。"""
    result: List[str] = []
    seen = set()
    elements = character_elements or []
    for raw_name in _dedup_order_names(names):
        matched = find_best_match(raw_name, elements, "character") if elements else None
        name = str((matched or {}).get("name") or raw_name).strip()
        key = name.lower()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(name)
    return result


def _order_names_by_reference(names: List[str], reference_order: List[str]) -> List[str]:
    """按参考顺序稳定排列一个人名集合，参考中未出现的人保持原相对顺序置后。"""
    candidates = _dedup_order_names(names)
    rank = {
        str(name or "").strip().lower(): index
        for index, name in enumerate(_dedup_order_names(reference_order))
        if str(name or "").strip()
    }
    return [
        name
        for _, name in sorted(
            enumerate(candidates),
            key=lambda pair: (
                rank.get(pair[1].lower(), len(rank) + pair[0]),
                pair[0],
            ),
        )
    ]


def _extract_visual_character_order(
    character_names: List[str],
    prompt: str,
    character_elements: Optional[List[Any]] = None,
) -> tuple[List[str], bool]:
    """返回真正出镜的人物顺序，以及本次视觉识别是否足够可信。

    有“本镜可见人物/局部可见/新入场”字段时，即便三个字段都写“无”，
    也视为可信的显式结果；旧模板没有结构字段时，仅在视觉叙述确实命中
    至少一个人物名时才可信，否则由调用方回退旧 characters，避免老项目
    因模板格式不同突然丢光人物图。
    """
    candidates = _canonicalize_character_names(character_names, character_elements)
    visual_text = _visual_story_text(prompt)
    has_structured_visible_fields = bool(_STRUCTURED_VISIBLE_FIELD_RE.search(prompt or ""))
    elements = character_elements or []

    found: List[tuple[int, int, str]] = []
    for original_index, name in enumerate(candidates):
        tokens = [name]
        if elements:
            matched = find_best_match(name, elements, "character")
            if matched:
                tokens.append(str(matched.get("name") or ""))
                tokens.extend(_character_element_aliases(matched))
        positions = [
            visual_text.find(token)
            for token in _dedup_order_names(tokens)
            if token and visual_text.find(token) >= 0
        ]
        if positions:
            found.append((min(positions), original_index, name))

    found.sort(key=lambda item: (item[0], item[1]))
    ordered = [name for _, _, name in found]
    return ordered, bool(has_structured_visible_fields or ordered)


def _resolve_jimeng_character_references(
    base_character_names: List[str],
    prompt: str,
    character_elements: Optional[List[Any]] = None,
    manual_image_characters: Optional[List[str]] = None,
    manual_audio_characters: Optional[List[str]] = None,
    manual_audio_order: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """计算即梦本镜人物图片与音频的独立名单。

    - 图片自动名单只读视觉叙述/可见白名单，纯画外音不会带人物图。
    - 音频自动名单只读首次开口（包含 VO/OS/画外音）。
    - 两个 manual_* 参数以 None 表示自动；空列表是用户明确全部关闭。
    - 界面可以仍用一张人物卡，提交层则完全独立。
    """
    elements = character_elements or []
    catalog_names = _dedup_order_names([
        str((dict(element) if hasattr(element, "keys") else (element or {})).get("name") or "")
        for element in elements
    ])
    base_names = _canonicalize_character_names(base_character_names, elements)
    candidates = _dedup_order_names(base_names + catalog_names)

    auto_image_names, visual_confident = _extract_visual_character_order(
        candidates,
        prompt,
        elements,
    )
    if not visual_confident:
        auto_image_names = list(base_names)

    raw_speaker_order = _extract_speaker_order_from_prompt(prompt)
    resolved_speaker_order = _canonicalize_character_names(raw_speaker_order, elements)
    # 只有确实匹配到人物素材库/当前人物的说话人才进入自动音频名单。
    candidate_keys = {name.lower() for name in candidates}
    auto_audio_names = [
        name for name in resolved_speaker_order
        if name.lower() in candidate_keys
    ]
    if not auto_audio_names:
        # 兼容没有结构化台词字段的旧模板，维持历史人物音频关联行为。
        auto_audio_names = list(base_names)

    if manual_image_characters is None:
        image_names = list(auto_image_names)
        image_mode = "auto"
    else:
        image_names = _canonicalize_character_names(manual_image_characters, elements)
        image_mode = "manual"
    image_names = _order_names_by_reference(
        image_names,
        auto_image_names + candidates,
    )

    if manual_audio_characters is None:
        audio_names = list(auto_audio_names)
        audio_selection_mode = "auto"
    else:
        audio_names = _canonicalize_character_names(manual_audio_characters, elements)
        audio_selection_mode = "manual"

    auto_audio_order = _order_names_by_reference(
        audio_names,
        resolved_speaker_order + auto_audio_names + candidates,
    )
    effective_manual_audio_order = _effective_manual_audio_order(
        audio_names,
        _canonicalize_character_names(manual_audio_order or [], elements),
    )
    audio_order = (
        _order_names_by_reference(audio_names, effective_manual_audio_order + auto_audio_order)
        if effective_manual_audio_order
        else auto_audio_order
    )

    return {
        "auto_image_names": auto_image_names,
        "image_names": image_names,
        "image_selection_mode": image_mode,
        "auto_audio_names": auto_audio_names,
        "audio_names": audio_names,
        "audio_selection_mode": audio_selection_mode,
        "auto_audio_order": auto_audio_order,
        "audio_order": audio_order,
        "audio_order_mode": "manual" if effective_manual_audio_order else "auto",
    }


def _resolve_audio_character_order(
    character_names: List[str],
    prompt: str,
    manual_audio_order: Optional[List[str]] = None,
) -> List[str]:
    """音频顺序：默认按首次开口；有手动顺序时以手动为首并自动补齐新增人物。"""
    candidates = _dedup_order_names(character_names)
    by_key = {name.lower(): name for name in candidates}

    auto_order: List[str] = []
    auto_seen = set()
    for speaker in _extract_speaker_order_from_prompt(prompt):
        matched = by_key.get(speaker.strip().lower())
        if matched and matched.lower() not in auto_seen:
            auto_seen.add(matched.lower())
            auto_order.append(matched)

    # 未发声人物仍可能在关闭“仅说话人”时携带音频，按画面顺序稳定补到末尾。
    for name in _order_characters_by_visual_appearance(candidates, prompt):
        key = name.lower()
        if key not in auto_seen:
            auto_seen.add(key)
            auto_order.append(name)

    manual = _effective_manual_audio_order(candidates, manual_audio_order)
    if not manual:
        return auto_order

    result: List[str] = []
    seen = set()
    for manual_name in manual:
        if manual_name.lower() not in seen:
            seen.add(manual_name.lower())
            result.append(manual_name)
    for name in auto_order:
        key = name.lower()
        if key not in seen:
            seen.add(key)
            result.append(name)
    return result


def _effective_manual_audio_order(
    character_names: List[str],
    manual_audio_order: Optional[List[str]],
) -> List[str]:
    """过滤已删除人物，并把手动顺序中的名字映射回当前分镜原名。"""
    candidates = _dedup_order_names(character_names)
    by_key = {name.lower(): name for name in candidates}
    result: List[str] = []
    seen = set()
    for raw_name in _dedup_order_names(manual_audio_order or []):
        matched = by_key.get(raw_name.lower())
        if not matched or matched.lower() in seen:
            continue
        seen.add(matched.lower())
        result.append(matched)
    return result


def _sort_named_assets(
    items: List[Any],
    name_order: List[str],
    name_index: int = 1,
) -> List[Any]:
    """按指定人物名顺序稳定排列素材 tuple，未知名保持原相对顺序并置后。"""
    rank = {
        str(name or "").strip().lower(): index
        for index, name in enumerate(name_order or [])
        if str(name or "").strip()
    }
    fallback = len(rank)
    indexed = list(enumerate(items or []))
    indexed.sort(
        key=lambda pair: (
            rank.get(
                str(pair[1][name_index] if len(pair[1]) > name_index else "").strip().lower(),
                fallback + pair[0],
            ),
            pair[0],
        )
    )
    return [item for _, item in indexed]


def _extract_declared_section_duration(text: str) -> Optional[float]:
    """读取模板声明的原始时长，不做截断；用于不允许静默裁时长的渠道校验。"""
    if not text:
        return None
    match = re.search(r"📏?\s*本小节总时长[:：]\s*([\d.]+)\s*秒", text)
    if not match:
        return None
    try:
        value = float(match.group(1))
        return value if value > 0 else None
    except (TypeError, ValueError):
        return None


def _extract_section_duration(
    text: str,
    max_duration_sec: Optional[int] = None,
) -> Optional[int]:
    """从分镜 prompt 中提取"📏 本小节总时长：X 秒"。
    返回向上取整的整数秒(最小4秒,最大值由当前模型能力决定);找不到返回 None。

    视觉时间轴允许 0.1 秒精度，平台时长却只接受整数。必须用 ceil，
    否则 12.5 秒经 Python round 会变成 12 秒并截掉末尾画面。
    """
    if not text:
        return None
    try:
        max_sec = int(max_duration_sec) if max_duration_sec is not None else 15
    except (TypeError, ValueError):
        max_sec = 15
    if max_sec < 4:
        max_sec = 15
    import re
    m = re.search(r"📏?\s*本小节总时长[:：]\s*([\d.]+)\s*秒", text)
    if not m:
        return None
    try:
        import math
        val = float(m.group(1))
        sec = math.ceil(val)
        if sec < 4:
            sec = 4
        if sec > max_sec:
            sec = max_sec
        return sec
    except Exception:
        return None


async def _poll_storyboard_via_cloud(
    sid: int,
    submit_id: str,
    provider_type: str = "volcengine_ark",
    local_api_key: Optional[str] = None,
) -> dict:
    """v3.61.168 + 173: 通用云端 HTTP provider 查询(支持 volcengine_ark / cool / xinglian),完成时下载视频到本地

    返回 dict 给 poll_video_status 的 results 使用,字段格式跟即梦分支一致
    v3.61.107: 接受可选 local_api_key — 企业自持 APIKey 时用本地 key 查(提交也是用本地 key 的,
              不然云端 apiKey 跟企业 apiKey 是不同 volc 账号 → 任务查不到)
    v3.61.168: 增加 provider_type 参数,从 storyboard.video_provider 透传(cool / volcengine_ark)
    v3.61.173: provider_type 扩 xinglian(星链云 SD2),local_api_key 同 cool 一样禁用
    """
    from services.video_providers import get_provider
    from services.cloud_llm_sync import get_active_config
    from utils.paths import media_subdir

    _provider_friendly = PROVIDER_FRIENDLY.get(provider_type, provider_type)

    # 1. 取分镜对应的视频配置(api_key)
    # v3.61.171 优先:storyboards.video_config_id(submit 时写的真值)
    #   兜底:video_task_queue.video_config_id(队列路径,老逻辑)
    # 老 bug:直 submit 路径不入队 → SQL LIMIT 1 拿到的是 sb 历史其他 provider 的 cfg_id
    #   实测 sb=2478 cool 提交后查到的是 1072(ARK 配置)→ 用 ARK sk-volc 调 cool 上游 → 401
    if provider_type == "pippit_cli":
        provider = get_provider("pippit_cli", await _pippit_provider_config())
    elif provider_type == "minimax_h3":
        provider = get_provider("minimax_h3", await _minimax_provider_config())
    else:
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT video_config_id FROM storyboards WHERE id = ?",
                (sid,),
            )
            srow = await cur.fetchone()
            cfg_id = srow["video_config_id"] if srow and srow["video_config_id"] else None
            if not cfg_id:
                # 兜底:队列路径(老逻辑)
                cur = await db.execute(
                    "SELECT video_config_id FROM video_task_queue WHERE storyboard_id = ? "
                    "AND provider IN ('volcengine_ark', 'cool', 'xinglian', 'newapi') ORDER BY id DESC LIMIT 1",
                    (sid,),
                )
                qrow = await cur.fetchone()
                cfg_id = qrow["video_config_id"] if qrow else None
        finally:
            await db.close()

        cloud_cfg = None
        if provider_type == "newapi":
            try:
                from services.llm_service import LLMService
                local_cfg = await LLMService.get_by_id(cfg_id, local_only=True)
                if local_cfg and local_cfg.get("config_type") == "video":
                    cloud_cfg = {
                        "id": local_cfg.get("id"),
                        "name": local_cfg.get("name"),
                        "baseUrl": local_cfg.get("base_url"),
                        "apiKey": local_cfg.get("api_key"),
                        "modelName": local_cfg.get("model_name"),
                        "providerCode": local_cfg.get("provider_code"),
                        "extraParams": local_cfg.get("extra_params") or {},
                    }
            except Exception as local_error:
                logger.warning(f"[poll] sid={sid} New API 本地配置读取失败: {local_error}")
        try:
            if cloud_cfg is None:
                cloud_cfg = await get_active_config(config_id=cfg_id, config_type="video")
        except Exception as e:
            return {
                "id": sid,
                "video_status": "generating",
                "video_url": None,
                "fail_reason": f"{_provider_friendly} 配置失效: {e}",
            }
        if not cloud_cfg:
            return {
                "id": sid,
                "video_status": "generating",
                "video_url": None,
                "fail_reason": f"未找到 {_provider_friendly} 配置",
            }

        # v3.61.107: 企业本地 APIKey 覆盖,跟 submit 同源
        # v3.61.169: ★ 关键防御 — local_api_key 是企业"火山方舟" AK/SK 解密的 sk-volc 格式
        #             cool 用户的 key 是 cool 网关自己的 sk-xxx,跟火山完全不同源 →
        #             轮询时若 provider_type='cool' 错用 local_api_key 会触发 cool 上游 401
        #             "The API key format is incorrect"(用户已实测)
        #             修法:仅 ARK 才允许 local_api_key 覆盖,cool 永远走 cloud_cfg.apiKey
        # v3.61.173: 统一收口 — 非 ARK 一律忽略 local_api_key(cool / xinglian / 未来中转都适用)
        _local_key = (local_api_key or "").strip()
        if provider_type != "volcengine_ark":
            _final_api_key = (cloud_cfg.get("apiKey") or "").strip()
        else:
            _final_api_key = _local_key or (cloud_cfg.get("apiKey") or "").strip()
        provider = get_provider(provider_type, {
            "id": cloud_cfg.get("id"),
            "name": cloud_cfg.get("name"),
            "base_url": cloud_cfg.get("baseUrl"),
            "api_key": _final_api_key,
            "model_name": cloud_cfg.get("modelName"),
            "provider_code": cloud_cfg.get("providerCode"),
            "extra_params": cloud_cfg.get("extraParams") or {},
        })

    # v3.61.172 codex 复审:加 stale-poll 守卫
    #   场景:同一 sb 老 ARK 任务还在跑(轮询的 submit_id=旧),用户重新提交了 Cool 新任务
    #         (storyboard.submit_id 被改成新 cool task_id)
    #         旧 ARK 轮询慢一拍 finally 完成 → 仍用旧 submit_id 写 done + 旧 video_url
    #         覆盖了新任务的 generating 状态
    #   修法:每次写 DB 前查 storyboards.submit_id,跟当前轮询的 submit_id 不等就放弃 写,
    #         返回 stale_poll=True 让上层知道这条结果是过期的
    async def _is_stale() -> bool:
        try:
            _db = await get_db()
            try:
                _cur = await _db.execute(
                    "SELECT submit_id FROM storyboards WHERE id = ?", (sid,)
                )
                _row = await _cur.fetchone()
            finally:
                await _db.close()
            _current_submit = (_row["submit_id"] if _row else None) or ""
            if _current_submit != submit_id:
                logger.info(
                    f"[poll-stale] sid={sid} 本轮 submit_id={submit_id} != 当前 DB submit_id={_current_submit},"
                    f"跳过写 DB(任务已被重新提交,旧轮询结果忽略)"
                )
                return True
            return False
        except Exception as _e:
            # 查 DB 异常时不阻塞写(降级当作 not stale)
            logger.warning(f"[poll-stale] sid={sid} 查 submit_id 失败,跳过守卫: {_e}")
            return False

    # 2. 查询任务状态
    qres = await provider.query(submit_id)

    if qres.status == "running":
        return {
            "id": sid,
            "video_status": "generating",
            "video_url": None,
            "queue_status": "running",
        }

    if qres.status in ("fail", "cancelled", "expired"):
        if await _is_stale():
            return {"id": sid, "video_status": "generating", "video_url": None, "stale_poll": True}
        terminal_reason = qres.fail_reason
        if not terminal_reason and qres.status == "cancelled":
            terminal_reason = f"{_provider_friendly} 任务已取消"
        if not terminal_reason and qres.status == "expired":
            terminal_reason = f"{_provider_friendly} 任务已过期"
        await storyboard_service.update_video_status(
            sid, "failed", fail_reason=terminal_reason or f"{_provider_friendly} 生成失败"
        )
        await _finalize_video_log_error(
            storyboard_id=sid,
            submit_id=submit_id,
            fail_reason=terminal_reason or f"{_provider_friendly} generation failed",
        )
        return {
            "id": sid,
            "video_status": "failed",
            "video_url": None,
            "fail_reason": terminal_reason,
        }

    # 3. status = success → 下载视频到本地
    if qres.status == "success":
        if provider_type == "pippit_cli":
            local_video_path = None
            if isinstance(qres.raw, dict):
                local_video_path = qres.raw.get("_local_video_path")
            if not local_video_path and qres.video_url and not str(qres.video_url).startswith(("http://", "https://")):
                local_video_path = qres.video_url

            if local_video_path and os.path.isfile(local_video_path):
                if await _is_stale():
                    return {"id": sid, "video_status": "generating", "video_url": None, "stale_poll": True}
                videos_dir = os.path.normpath(media_subdir("videos"))
                os.makedirs(videos_dir, exist_ok=True)
                ext = os.path.splitext(local_video_path)[1] or ".mp4"
                path_info = await _build_friendly_video_path(sid, ext)
                if not path_info:
                    path_info = ("", f"storyboard_{sid}{ext}")
                subdir, fname = path_info
                target_dir = os.path.join(videos_dir, subdir)
                os.makedirs(target_dir, exist_ok=True)
                target_path = os.path.abspath(os.path.join(target_dir, fname))
                source_path = os.path.abspath(local_video_path)
                if source_path != target_path:
                    shutil.copy2(source_path, target_path)
                local_url = f"/data/videos/{subdir}/{fname}" if subdir else f"/data/videos/{fname}"
                await storyboard_service.update_video_status(sid, "done", local_url)
                await _finalize_video_log_success(
                    storyboard_id=sid,
                    submit_id=submit_id,
                    provider=provider_type,
                    video_url=local_url,
                    actual_duration=qres.duration or None,
                )
                logger.info(f"[pippit-poll] 本地视频已归档 sid={sid} path={target_path}")
                return {
                    "id": sid,
                    "video_status": "done",
                    "video_url": local_url,
                    "last_frame_path": None,
                }
            if qres.video_url and not str(qres.video_url).startswith(("http://", "https://")):
                qres.video_url = None

        if not qres.video_url:
            if await _is_stale():
                return {"id": sid, "video_status": "generating", "video_url": None, "stale_poll": True}
            # v3.61.173 用户反馈 + codex 复审 P1 + v3.61.175 调整:
            #   逆向即梦号 API(星链云)常态:上游 status 翻 SUCCESS 比 video_url 出包早几秒~几十秒,
            #   而且整个任务可能在上游排队几十分钟~几小时,实测 38 分钟才出包(2301s)。
            #   provider 层如实返 success + url=None,这里按 video_submit_time 做宽限:
            #     - 未到任务超时阈值(ark 5 / xinglian 180 / 其他 30 min) → 当 generating 继续等
            #     - 超过阈值还 url=None → 死任务/上游 bug,落库 friendly failed
            #   阈值统一从 _cloud_timeout_minutes() 取,跟 poll-status 整体超时一致。
            _grace_min = _cloud_timeout_minutes(provider_type)
            _grace_exceeded = False
            try:
                _db2 = await get_db()
                try:
                    _c = await _db2.execute(
                        "SELECT video_submit_time FROM storyboards WHERE id = ?",
                        (sid,),
                    )
                    _r = await _c.fetchone()
                finally:
                    await _db2.close()
                if _r and _r["video_submit_time"]:
                    submit_time = datetime.strptime(_r["video_submit_time"], '%Y-%m-%d %H:%M:%S')
                    elapsed = now_beijing().replace(tzinfo=None) - submit_time
                    _grace_exceeded = elapsed > timedelta(minutes=_grace_min)
                else:
                    # submit_time 缺失就认了,直接 generating 让下次轮询再来
                    _grace_exceeded = False
            except Exception as _e:
                logger.warning(f"[poll-cloud] sb={sid} success-no-url 宽限判断失败,默认继续等: {_e}")
                _grace_exceeded = False

            if not _grace_exceeded:
                logger.info(
                    f"[poll-cloud] sb={sid} {_provider_friendly} 上游 status=success "
                    f"但 url 暂空,在 {_grace_min}min 宽限内,继续 generating"
                )
                return {
                    "id": sid,
                    "video_status": "generating",
                    "video_url": None,
                    "queue_status": "url_pending",
                }

            _friendly_fail = (
                f"{_provider_friendly} 上游标记完成,但等待 {_grace_min} 分钟仍未返回视频 URL。"
                "可能原因:上游任务被清理 / 接口返回字段异常 / 账号扣量。"
                "请点「刷新状态」重试一次,仍不行请重新生成。"
            )
            await storyboard_service.update_video_status(
                sid, "failed", fail_reason=_friendly_fail
            )
            await _finalize_video_log_error(
                storyboard_id=sid,
                submit_id=submit_id,
                fail_reason=_friendly_fail,
            )
            return {
                "id": sid,
                "video_status": "failed",
                "video_url": None,
                "fail_reason": _friendly_fail,
            }

        videos_dir = os.path.normpath(media_subdir("videos"))
        os.makedirs(videos_dir, exist_ok=True)

        # 下载 mp4 + 友好命名
        local_url, download_error = await _download_remote_video_with_diagnostics(
            sid,
            qres.video_url,
            videos_dir,
            provider_type=provider_type,
        )
        if not local_url:
            # v3.61.153 codex P1:下载失败 → download_failed,远程 URL 入库供 retry-download 重试
            # 原代码 "用远程 URL 兜底标 done" 会导致后续接帧/尾帧 hook 都失效
            if await _is_stale():
                return {"id": sid, "video_status": "generating", "video_url": None, "stale_poll": True}
            _fail_detail = (download_error or "网络、磁盘或远程地址异常")[:240]
            _fail_msg = (
                f"{_provider_friendly} 已生成完成,但本地下载失败（{_fail_detail}）。"
                "可在视频生成页点重试下载。"
            )
            await storyboard_service.update_video_status(
                sid, "download_failed", qres.video_url, fail_reason=_fail_msg,
            )
            await _finalize_video_log_error(
                storyboard_id=sid,
                submit_id=submit_id,
                fail_reason=_fail_msg,
            )
            return {
                "id": sid,
                "video_status": "download_failed",
                "video_url": qres.video_url,
                "fail_reason": _fail_msg,
            }

        # 下载尾帧(火山方舟原生返回 last_frame_url)
        last_frame_local = None
        if qres.last_frame_url:
            try:
                last_frame_local = await _download_last_frame(sid, qres.last_frame_url)
            except Exception as e:
                logger.warning(f"[ark-poll] 下载尾帧失败: {e}")

        # v3.61.172:✦ 最后一道守卫 — 长流程(下载 mp4 + 抽尾帧)期间用户可能已重新提交,
        #            写 done + last_frame 之前再查一次,陈旧就放弃(下载的 mp4 仍留在盘上无害)
        if await _is_stale():
            return {"id": sid, "video_status": "generating", "video_url": None, "stale_poll": True}

        await storyboard_service.update_video_status(sid, "done", local_url)
        await _finalize_video_log_success(
            storyboard_id=sid,
            submit_id=submit_id,
            provider=provider_type,
            video_url=local_url,
            actual_duration=qres.duration or None,
        )
        if last_frame_local:
            db = await get_db()
            try:
                await db.execute(
                    "UPDATE storyboards SET last_frame_path = ? WHERE id = ?",
                    (last_frame_local, sid),
                )
                await db.commit()
            finally:
                await db.close()

        return {
            "id": sid,
            "video_status": "done",
            "video_url": local_url,
            "last_frame_path": last_frame_local,
        }

    # 兜底
    return {
        "id": sid,
        "video_status": "generating",
        "video_url": None,
    }


# v3.61.168: 向后兼容 alias — 历史调用方仍用 _poll_storyboard_via_ark 名字
# 自动从 storyboards.video_provider 拿真 provider type,让 /ark/force-sync / /ark/sync-all-pending /
# /ark/claim-by-task-id 三个端点零侵入支持 cool storyboard
async def _poll_storyboard_via_ark(sid: int, submit_id: str, local_api_key: Optional[str] = None) -> dict:
    db = await get_db()
    try:
        cur = await db.execute("SELECT video_provider FROM storyboards WHERE id = ?", (sid,))
        r = await cur.fetchone()
    finally:
        await db.close()
    resolved = "volcengine_ark"
    if r and 'video_provider' in r.keys():
        v = (r['video_provider'] or '').lower()
        if v in UNIFIED_VIDEO_PROVIDERS:
            resolved = v
    return await _poll_storyboard_via_cloud(sid, submit_id, resolved, local_api_key)


async def _download_remote_video_with_diagnostics(
    sid: int,
    url: str,
    videos_dir: str,
    *,
    provider_type: str = "",
    max_attempts: int = 2,
    attempt_timeout_seconds: int = 150,
) -> Tuple[Optional[str], Optional[str]]:
    """可靠地把云端视频下载到本地，并返回 ``(local_url, error)``。

    v3.61.406:
    - 旧实现只有一次 aiohttp 直连；用户网络需要系统代理、CDN 中途断流或响应很慢时，
      会静默等到 300 秒后才失败，点「重试下载」看起来像没反应。
    - 现在按「直连 → 系统代理/再次直连」重试，并用 Range 续传上一轮的临时文件。
    - 只在完整响应写完后原子替换正式 mp4，避免半截视频被误标为 done。
    - 日志只记录 host、HTTP 状态和异常类型，不泄露带签名的完整 URL。
    """
    import aiohttp
    from urllib.parse import urlparse

    clean_url = (url or "").strip()
    provider_label = PROVIDER_FRIENDLY.get(provider_type, provider_type or "云端视频")
    if not clean_url.startswith(("http://", "https://")):
        return None, "远程视频 URL 无效"

    try:
        path_info = await _build_friendly_video_path(sid, ".mp4")
        if not path_info:
            return None, "无法生成本地视频文件名"
        subdir, fname = path_info
        target_dir = os.path.join(videos_dir, subdir)
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, fname)
        partial_path = target_path + ".part"
    except Exception as exc:
        error = f"创建本地目录失败 {type(exc).__name__}: {exc}"
        logger.error(f"[video-download] sid={sid} provider={provider_label} {error}", exc_info=True)
        return None, error

    host = urlparse(clean_url).netloc or "unknown-host"
    max_attempts = max(1, min(int(max_attempts or 1), 3))
    attempt_timeout_seconds = max(30, min(int(attempt_timeout_seconds or 150), 300))
    last_error = "下载未开始"

    # 第一次强制直连，避免坏代理污染；第二次允许 aiohttp 读取系统/环境代理。
    # 如果机器没有代理，trust_env=True 会自然退化为再次直连。
    routes = [(False, "直连"), (True, "系统代理/重试"), (False, "直连重试")]
    routes = routes[:max_attempts]

    headers_base = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 "
            "qianshanAI/1.0"
        ),
        "Accept": "video/mp4,video/*;q=0.9,application/octet-stream;q=0.8,*/*;q=0.5",
        "Accept-Encoding": "identity",
    }

    try:
        for attempt_index, (trust_env, route_label) in enumerate(routes, start=1):
            if attempt_index > 1:
                await asyncio.sleep(2)

            resume_from = 0
            try:
                if os.path.exists(partial_path):
                    resume_from = max(0, os.path.getsize(partial_path))
            except OSError:
                resume_from = 0

            headers = dict(headers_base)
            if resume_from > 0:
                headers["Range"] = f"bytes={resume_from}-"

            logger.info(
                f"[video-download] sid={sid} provider={provider_label} host={host} "
                f"attempt={attempt_index}/{len(routes)} route={route_label} resume={resume_from}"
            )

            timeout = aiohttp.ClientTimeout(
                total=attempt_timeout_seconds,
                connect=20,
                sock_connect=20,
                sock_read=60,
            )
            try:
                async with aiohttp.ClientSession(
                    connector=get_aiohttp_connector(),
                    timeout=timeout,
                    trust_env=trust_env,
                ) as sess:
                    async with sess.get(
                        clean_url,
                        headers=headers,
                        allow_redirects=True,
                    ) as resp:
                        status = resp.status

                        # Range 已经等于服务端文件总长时，部分文件其实是完整的。
                        if status == 416 and resume_from > 0:
                            content_range = resp.headers.get("Content-Range", "")
                            total_match = re.search(r"\*/(\d+)", content_range)
                            if total_match and int(total_match.group(1)) == resume_from:
                                os.replace(partial_path, target_path)
                                local_url = f"/data/videos/{subdir}/{fname}"
                                logger.info(
                                    f"[video-download] sid={sid} provider={provider_label} "
                                    f"续传文件已完整 bytes={resume_from} path={target_path}"
                                )
                                return local_url, None

                        if status not in (200, 206):
                            try:
                                body_preview = (await resp.text(errors="replace"))[:160].replace("\r", " ").replace("\n", " ")
                            except Exception:
                                body_preview = ""
                            last_error = f"{route_label} HTTP {status}"
                            if body_preview:
                                last_error += f": {body_preview}"
                            logger.warning(
                                f"[video-download] sid={sid} provider={provider_label} "
                                f"host={host} attempt={attempt_index} {last_error}"
                            )
                            continue

                        content_type = (resp.headers.get("Content-Type") or "").lower()
                        if content_type.startswith(("text/", "application/json", "application/xml")):
                            try:
                                body_preview = (await resp.text(errors="replace"))[:160].replace("\r", " ").replace("\n", " ")
                            except Exception:
                                body_preview = ""
                            last_error = (
                                f"{route_label} 返回的不是视频"
                                f"(content-type={content_type or '-'})"
                            )
                            if body_preview:
                                last_error += f": {body_preview}"
                            logger.warning(
                                f"[video-download] sid={sid} provider={provider_label} "
                                f"host={host} attempt={attempt_index} {last_error}"
                            )
                            try:
                                if os.path.exists(partial_path):
                                    os.remove(partial_path)
                            except OSError:
                                pass
                            continue

                        # 服务端忽略 Range、返回 200 时必须从头覆盖；206 才能 append。
                        append_mode = status == 206 and resume_from > 0
                        if append_mode:
                            range_start_match = re.match(r"bytes\s+(\d+)-", resp.headers.get("Content-Range", ""))
                            if range_start_match and int(range_start_match.group(1)) != resume_from:
                                last_error = (
                                    f"{route_label} 续传起点异常"
                                    f"(请求 {resume_from}，响应 {range_start_match.group(1)})"
                                )
                                logger.warning(
                                    f"[video-download] sid={sid} provider={provider_label} "
                                    f"host={host} attempt={attempt_index} {last_error}"
                                )
                                try:
                                    os.remove(partial_path)
                                except OSError:
                                    pass
                                continue
                        if not append_mode:
                            resume_from = 0
                        expected_total: Optional[int] = None
                        content_range = resp.headers.get("Content-Range", "")
                        total_match = re.search(r"/(\d+)$", content_range)
                        if total_match:
                            expected_total = int(total_match.group(1))
                        else:
                            content_length = resp.headers.get("Content-Length")
                            if content_length and str(content_length).isdigit():
                                expected_total = resume_from + int(content_length)

                        with open(partial_path, "ab" if append_mode else "wb") as out:
                            async for chunk in resp.content.iter_chunked(512 * 1024):
                                if chunk:
                                    out.write(chunk)

                        actual_size = os.path.getsize(partial_path)
                        if actual_size <= 0:
                            last_error = f"{route_label} 返回空文件"
                            logger.warning(
                                f"[video-download] sid={sid} provider={provider_label} "
                                f"host={host} attempt={attempt_index} {last_error}"
                            )
                            continue
                        if expected_total is not None and actual_size < expected_total:
                            last_error = (
                                f"{route_label} 下载不完整 "
                                f"({actual_size}/{expected_total} bytes)"
                            )
                            logger.warning(
                                f"[video-download] sid={sid} provider={provider_label} "
                                f"host={host} attempt={attempt_index} {last_error}"
                            )
                            continue

                        # CDN 偶尔 200 返回 HTML 错误页但错误地标 application/octet-stream。
                        with open(partial_path, "rb") as check_file:
                            head = check_file.read(32).lstrip().lower()
                        if head.startswith((b"<html", b"<!doctype", b"{\"error", b"{\"message")):
                            last_error = f"{route_label} 返回错误页面而非视频"
                            logger.warning(
                                f"[video-download] sid={sid} provider={provider_label} "
                                f"host={host} attempt={attempt_index} {last_error}"
                            )
                            try:
                                os.remove(partial_path)
                            except OSError:
                                pass
                            continue

                        os.replace(partial_path, target_path)
                        local_url = f"/data/videos/{subdir}/{fname}"
                        logger.info(
                            f"[video-download] sid={sid} provider={provider_label} "
                            f"下载完成 bytes={actual_size} path={target_path}"
                        )
                        return local_url, None

            except PermissionError as exc:
                last_error = f"本地写盘失败 {type(exc).__name__}: {exc}"
                logger.error(
                    f"[video-download] sid={sid} provider={provider_label} "
                    f"host={host} attempt={attempt_index} {last_error}",
                    exc_info=True,
                )
                break
            except Exception as exc:
                # TimeoutError 的 str 常为空，必须把异常类型写进日志，否则用户日志只剩一个冒号。
                detail = str(exc).strip()
                last_error = f"{route_label} {type(exc).__name__}"
                if detail:
                    last_error += f": {detail}"
                try:
                    partial_size = os.path.getsize(partial_path) if os.path.exists(partial_path) else 0
                except OSError:
                    partial_size = 0
                logger.warning(
                    f"[video-download] sid={sid} provider={provider_label} host={host} "
                    f"attempt={attempt_index} {last_error} partial={partial_size}",
                    # CDN 断流/超时是可重试常态，异常类型和 partial 大小已经足够诊断；
                    # 只有非网络类意外异常才输出整段堆栈，避免用户日志被重复 traceback 淹没。
                    exc_info=not isinstance(
                        exc,
                        (aiohttp.ClientError, asyncio.TimeoutError, OSError),
                    ),
                )

        return None, last_error
    finally:
        # 一次调用内会续传；所有尝试都失败后删掉临时文件，避免长期堆积半截视频。
        # 正式文件只会在完整下载后由 os.replace 原子产生。
        if os.path.exists(partial_path):
            try:
                os.remove(partial_path)
            except OSError:
                pass


async def _download_remote_video(
    sid: int,
    url: str,
    videos_dir: str,
    *,
    provider_type: str = "",
) -> Optional[str]:
    """兼容旧调用方：下载成功返回 /data/videos/...，失败返回 None。"""
    local_url, _ = await _download_remote_video_with_diagnostics(
        sid,
        url,
        videos_dir,
        provider_type=provider_type,
    )
    return local_url


async def _download_last_frame(sid: int, url: str) -> Optional[str]:
    """下载火山方舟尾帧 PNG 到本地 frames 目录"""
    import aiohttp
    from utils.paths import get_data_dir
    try:
        frames_dir = os.path.join(get_data_dir(), "frames")
        os.makedirs(frames_dir, exist_ok=True)
        fname = f"sb{sid}_{int(__import__('time').time())}.png"
        target = os.path.join(frames_dir, fname)
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=120)) as sess:
            async with sess.get(url) as resp:
                if resp.status != 200:
                    return None
                with open(target, "wb") as f:
                    async for chunk in resp.content.iter_chunked(32 * 1024):
                        f.write(chunk)
        return f"/data/frames/{fname}"
    except Exception as e:
        logger.warning(f"[ark-poll] 下载尾帧异常: {e}")
        return None


async def _process_batch_generation(storyboard_ids: List[int], video_config_id: Optional[int] = None, params: Optional[dict] = None):
    """后台批量处理视频生成 - 逐个执行避免CLI速率限制。
    每个分镜按自己 prompt 中的"📏 本小节总时长"覆盖顶部 duration,解决批量用同一个时长导致错配问题。
    """
    from services.video_model_capabilities import get_video_model_capabilities

    batch_capabilities = get_video_model_capabilities(
        (params or {}).get("model_version") or (params or {}).get("model")
    )
    batch_max_duration = int(batch_capabilities["max_duration_seconds"])
    for sid in storyboard_ids:
        try:
            # 从数据库获取分镜的prompt
            db = await get_db()
            try:
                row = await db.execute("SELECT prompt FROM storyboards WHERE id = ?", (sid,))
                result = await row.fetchone()
                if not result or not result[0]:
                    await storyboard_service.update_video_status(sid, "failed")
                    logger.error(f"分镜 {sid} 没有prompt")
                    continue

                prompt = result[0]
            finally:
                await db.close()

            # 每个分镜独立算一次 duration:prompt 里有 "本小节总时长" 就用它,没有就 fallback 到 params
            per_params = dict(params) if params else None
            section_dur = _extract_section_duration(
                prompt,
                max_duration_sec=batch_max_duration,
            )
            if section_dur is not None:
                if per_params is None:
                    per_params = {}
                if per_params.get("duration") != section_dur:
                    logger.info(f"[batch-gen] 分镜 {sid} 按小节时长自动调整 duration: {per_params.get('duration')} -> {section_dur}")
                per_params["duration"] = section_dur

            await _process_video_generation(sid, prompt, video_config_id, per_params)
        except Exception as e:
            await storyboard_service.update_video_status(sid, "failed")
            logger.error(f"批量生成 - 分镜 {sid} 处理异常: {e}")


@router.get("/status/{submit_id}")
async def query_video_status(submit_id: str):
    """查询视频生成任务状态"""
    result = await video_service.query_result(submit_id)
    return result


@router.get("/tasks")
async def list_video_tasks(status: str = None):
    """查询视频任务列表"""
    result = await video_service.list_tasks(status=status)
    return result


@router.get("/storyboard-elements/{storyboard_id}")
async def get_storyboard_elements(
    storyboard_id: int,
    include_audio_duration: bool = False,
):
    """获取分镜关联的元素详情（人物、场景、道具）"""
    db = await get_db()
    try:
        # 1. 获取分镜信息
        cursor = await db.execute(
            "SELECT novel_id, characters, scenes, props, description, prompt, excluded_props, "
            "excluded_audios, auto_excluded_audios, manual_audio_order, "
            "jimeng_image_characters, jimeng_audio_characters "
            "FROM storyboards WHERE id = ?",
            (storyboard_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="分镜不存在")

        novel_id = row['novel_id']
        characters = json.loads(row['characters'] or '[]')
        scenes = json.loads(row['scenes'] or '[]')
        props = json.loads(row['props'] or '[]')
        excluded_props = json.loads(row['excluded_props'] or '[]')

        # v3.61.57: 读出端 dedup chars/scenes/props,兼容历史脏数据(同名重复)
        # 老数据可能存 ["铜镜","彩绘纸鸢","彩绘纸鸢","彩绘纸鸢"],前端 v-for :key 重复会渲染错乱
        def _dedup_keep_first(_names):
            _seen = set()
            _out = []
            for _n in _names or []:
                if not _n:
                    continue
                _key = str(_n).strip().lower()
                if not _key or _key in _seen:
                    continue
                _seen.add(_key)
                _out.append(_n)
            return _out
        characters = _dedup_keep_first(characters)
        scenes = _dedup_keep_first(scenes)
        props = _dedup_keep_first(props)

        result = {
            "characters": [],
            "jimeng_characters": [],
            "scenes": [],
            "props": [],
            "visual_character_order": [],
            "jimeng_image_characters": [],
            "jimeng_audio_characters": [],
            "image_selection_mode": "auto",
            "audio_selection_mode": "auto",
            "auto_audio_order": [],
            "audio_order": [],
            "audio_order_mode": "auto",
        }

        # 2. 预加载该小说的所有元素（人物、场景、道具）用于三级匹配
        cursor = await db.execute(
            "SELECT id, element_type, name, description, finished_image, reference_image, image_url, grid_image, audio_file, voice_id, aliases, image_prompt, image_status, volc_asset_id, volc_asset_uri, volc_asset_status, volc_asset_group_id, active_variant_id, updated_at FROM extracted_elements WHERE novel_id = ? AND element_type = 'character'",
            (novel_id,)
        )
        character_elements = await cursor.fetchall()

        cursor = await db.execute(
            "SELECT id, name, description, finished_image, reference_image, image_url, grid_image, audio_file, aliases, updated_at FROM extracted_elements WHERE novel_id = ? AND element_type = 'scene'",
            (novel_id,)
        )
        scene_elements = await cursor.fetchall()

        cursor = await db.execute(
            "SELECT id, name, description, finished_image, reference_image, image_url, grid_image, audio_file, aliases, updated_at FROM extracted_elements WHERE novel_id = ? AND element_type = 'prop'",
            (novel_id,)
        )
        prop_elements = await cursor.fetchall()

        ordering_prompt = (row['prompt'] or '').strip() or (row['description'] or '').strip()
        props, has_enabled_prop_field = _merge_structured_enabled_props(
            props,
            ordering_prompt,
            list(prop_elements),
            excluded_props,
        )
        manual_image_characters = _optional_json_name_list(row['jimeng_image_characters'])
        manual_audio_characters = _optional_json_name_list(row['jimeng_audio_characters'])
        try:
            manual_audio_order = json.loads(row['manual_audio_order'] or '[]')
        except Exception:
            manual_audio_order = []
        manual_audio_order = _dedup_order_names(manual_audio_order)

        jimeng_refs = _resolve_jimeng_character_references(
            characters,
            ordering_prompt,
            list(character_elements),
            manual_image_characters,
            manual_audio_characters,
            manual_audio_order,
        )
        try:
            manual_excluded = set(json.loads(row['excluded_audios'] or '[]'))
        except Exception:
            manual_excluded = set()
        try:
            from services.settings_service import (
                KEY_AUDIO_AUTO_SPEAKER_FILTER as _KEY_AUDIO_FILTER_ELEMENTS,
                SettingsService as _SettingsServiceElements,
            )
            audio_filter_enabled = await _SettingsServiceElements.get_bool(
                _KEY_AUDIO_FILTER_ELEMENTS,
                default=False,
            )
        except Exception:
            audio_filter_enabled = False
        try:
            auto_excluded = (
                set(json.loads(row['auto_excluded_audios'] or '[]'))
                if audio_filter_enabled
                else set()
            )
        except Exception:
            auto_excluded = set()

        manual_excluded_keys = {
            name.lower()
            for name in _canonicalize_character_names(
                list(manual_excluded),
                list(character_elements),
            )
        }
        if jimeng_refs["audio_selection_mode"] == "manual":
            excluded_audio_keys = manual_excluded_keys
        else:
            excluded_audio_keys = {
                name.lower()
                for name in _canonicalize_character_names(
                    list(manual_excluded | auto_excluded),
                    list(character_elements),
                )
            }

        image_character_order = list(jimeng_refs["image_names"])
        active_audio_names = [
            name
            for name in jimeng_refs["audio_names"]
            if name.lower() not in excluded_audio_keys
        ]
        active_audio_keys = {name.lower() for name in active_audio_names}
        auto_audio_order = [
            name
            for name in jimeng_refs["auto_audio_order"]
            if name.lower() in active_audio_keys
        ]
        audio_order = [
            name
            for name in jimeng_refs["audio_order"]
            if name.lower() in active_audio_keys
        ]
        effective_manual_audio_order = _effective_manual_audio_order(
            active_audio_names,
            _canonicalize_character_names(manual_audio_order, list(character_elements)),
        )
        jimeng_character_order = _dedup_order_names(
            image_character_order + audio_order
        )

        result.update({
            "visual_character_order": image_character_order,
            "jimeng_image_characters": image_character_order,
            "jimeng_audio_characters": active_audio_names,
            "image_selection_mode": jimeng_refs["image_selection_mode"],
            "audio_selection_mode": jimeng_refs["audio_selection_mode"],
            "auto_audio_order": auto_audio_order,
            "audio_order": audio_order,
            "audio_order_mode": "manual" if effective_manual_audio_order else "auto",
        })

        # 3. 查询人物元素（使用三级匹配）
        # v3.61.136: name 字段必须用分镜原始名(跟 storyboards.characters/excluded_audios 一致),
        # 不能用 matched["name"](素材库正式名)— 否则前后端 excluded_audios 的 key 对不上
        # 单独加 matched_name 给 UI 提示用("瑶华 → 凌瑶华")
        _resolved_character_cards: Dict[str, Dict[str, Any]] = {}

        async def _build_character_card(name: str) -> Dict[str, Any]:
            _cache_key = name.strip().lower()
            if _cache_key in _resolved_character_cards:
                return dict(_resolved_character_cards[_cache_key])
            matched = find_best_match(name, character_elements, 'character')
            if matched:
                # v3.61.158: 人物走 active variant fallback — UI 预览跟视频生成路径一致
                from services.extraction_service import ExtractionService as _ES_sb
                matched_dict = await _backfill_character_audio_from_voice(db, novel_id, dict(matched))
                resolved = await _ES_sb.resolve_active_character_asset(matched_dict)
                _vname = resolved.get("__active_variant_name")
                logger.info(f"[storyboard-elements] 人物匹配成功: '{name}' -> '{matched['name']}' [马甲={_vname or '本体'}]")
                card = {
                    "id": resolved.get("id"),
                    "name": name,
                    "matched_name": matched["name"],
                    "description": resolved.get("description"),
                    "finished_image": _normalize_path(resolved.get("finished_image")),
                    "reference_image": _normalize_path(resolved.get("reference_image")),
                    "image_url": _normalize_path(resolved.get("image_url")),
                    "grid_image": _normalize_path(resolved.get("grid_image")),
                    "audio_file": resolved.get("audio_file"),
                    "active_variant_name": _vname,
                    "updated_at": resolved.get("__asset_updated_at") or resolved.get("updated_at"),
                }
                if include_audio_duration and card.get("audio_file"):
                    audio_path = resolve_db_path(card["audio_file"])
                    if audio_path and os.path.isfile(audio_path):
                        duration_value = await asyncio.to_thread(
                            _cached_audio_duration_seconds,
                            audio_path,
                        )
                        if duration_value is not None:
                            card["audio_duration_seconds"] = round(float(duration_value), 3)
            else:
                logger.info(f"[storyboard-elements] 人物匹配失败: '{name}'")
                card = {"name": name}
            _resolved_character_cards[_cache_key] = dict(card)
            return card

        for name in characters:
            card = await _build_character_card(name)
            card["base_associated"] = True
            result["characters"].append(card)

        _image_keys = {name.lower() for name in image_character_order}
        _audio_keys = {name.lower() for name in active_audio_names}
        _base_keys = {
            name.lower()
            for name in _canonicalize_character_names(
                characters,
                list(character_elements),
            )
        }
        for name in jimeng_character_order:
            card = await _build_character_card(name)
            card["image_enabled"] = name.lower() in _image_keys
            card["audio_enabled"] = name.lower() in _audio_keys
            card["base_associated"] = name.lower() in _base_keys
            result["jimeng_characters"].append(card)

        # 4. 查询场景元素（使用三级匹配）
        for name in scenes:
            # 场景使用三级匹配
            matched = find_best_match(name, scene_elements, 'scene')
            if matched:
                logger.info(f"[storyboard-elements] 场景匹配成功: '{name}' -> '{matched['name']}' (id={matched.get('id')}, grid_image={matched.get('grid_image')}, finished_image={matched.get('finished_image')}, image_url={matched.get('image_url')})")
                result["scenes"].append({
                    "id": matched.get("id"),
                    "name": matched["name"],
                    "description": matched.get("description"),
                    "finished_image": _normalize_path(matched.get("finished_image")),
                    "reference_image": _normalize_path(matched.get("reference_image")),
                    "image_url": _normalize_path(matched.get("image_url")),
                    "grid_image": _normalize_path(matched.get("grid_image")),
                    "audio_file": matched.get("audio_file"),
                    "updated_at": matched.get("updated_at"),
                })
            else:
                logger.info(f"[storyboard-elements] 场景匹配失败: '{name}'")
                result["scenes"].append({"name": name})

        # 4. 道具文本扫描补充（弥补 props 字段粗粒度提取的遗漏）
        # v3.59.89:筛选时把 alias / 模糊关系也算进 excluded
        # 老 bug:DB 里 prop 元素同时存"彩绘纸鸢"(全名)和"纸鸢"(简称),
        #         描述文本里写"纸鸢"扫到 → 三级匹配又会命中"彩绘纸鸢" →
        #         用户点 X 移除"彩绘纸鸢"(excluded='彩绘纸鸢'),"纸鸢"没在 excluded 里 →
        #         扫描通过 → 三级匹配又把"彩绘纸鸢"挂回来 → 用户感觉怎么删都删不掉
        # 修法:扫描每个 prop_name 时,先 find_best_match 看会不会命中已被排除的元素,
        #       命中也跳过
        # v3.61.57: effective_excluded = excluded_props - 当前 props
        #   原因:用户删了"彩绘纸鸢" → 加进 excluded_props
        #         然后又在弹窗里勾选"彩绘纸鸢"重新加回 → confirmElementSelection 写 props=[..."彩绘纸鸢"]
        #         (注意 v3.61.57 写入端已经会把"彩绘纸鸢"从 excluded 移除,但读端这里再做一层防御)
        #         如果 excluded 还包含它,渲染层会 skip → 用户感觉"添加成功但页面没显示"
        #   修法:渲染/扫描用的是 effective(排除 current props),让 props 里的 name 永远能显示
        _props_lower_set = set(str(p).strip().lower() for p in props)
        _effective_excluded_lower = set(
            str(p).strip().lower() for p in excluded_props
            if str(p).strip().lower() not in _props_lower_set
        )

        scan_text = row['description'] or ''
        if has_enabled_prop_field:
            logger.info(
                f"[storyboard-elements] 检测到启用道具权威名单，"
                f"跳过全文道具补扫 (分镜 {storyboard_id})"
            )
        elif scan_text and prop_elements:
            existing_props_lower = set(p.lower() for p in props)
            excluded_props_lower = _effective_excluded_lower
            for elem in prop_elements:
                elem_dict = dict(elem)
                prop_name = (elem_dict.get('name') or '').strip()
                if not prop_name:
                    continue

                aliases_raw = elem_dict.get('aliases') or '[]'
                aliases = []
                if isinstance(aliases_raw, str):
                    try:
                        aliases = json.loads(aliases_raw) if aliases_raw else []
                    except Exception:
                        aliases = []
                elif isinstance(aliases_raw, list):
                    aliases = aliases_raw

                candidates = []
                seen_candidates = set()

                def add_candidate(value: Any) -> None:
                    candidate = str(value or '').strip()
                    candidate_lower = candidate.lower()
                    if len(candidate) < 2 or not candidate_lower or candidate_lower in seen_candidates:
                        return
                    candidates.append(candidate)
                    seen_candidates.add(candidate_lower)

                add_candidate(prop_name)
                for alias in aliases:
                    add_candidate(alias)

                for candidate in candidates:
                    matched_for_check = find_best_match(candidate, prop_elements, 'prop') or elem_dict
                    matched_name = (matched_for_check.get("name") or prop_name or candidate).strip()
                    candidate_lower = candidate.lower()
                    matched_lower = matched_name.lower()

                    if candidate_lower in existing_props_lower or matched_lower in existing_props_lower:
                        continue
                    # 直接命中 excluded,或三级匹配命中已排除元素(防别名/模糊匹配回环)
                    if candidate_lower in excluded_props_lower or matched_lower in excluded_props_lower:
                        logger.info(
                            f"[storyboard-elements] 道具文本扫描跳过(命中已排除): "
                            f"'{candidate}' → '{matched_name}' (分镜 {storyboard_id})"
                        )
                        continue
                    if candidate in scan_text:
                        props.append(matched_name)
                        existing_props_lower.add(candidate_lower)
                        existing_props_lower.add(matched_lower)
                        if candidate == matched_name:
                            logger.info(f"[storyboard-elements] 道具文本扫描补充: '{matched_name}' (分镜 {storyboard_id})")
                        else:
                            logger.info(f"[storyboard-elements] 道具别名文本扫描补充: '{candidate}' → '{matched_name}' (分镜 {storyboard_id})")
                        break

        # 5. 查询道具元素（使用三级匹配）
        # v3.59.89:遍历 props 时也用 excluded 过滤(双层保险)
        # 老 bug:props 里残留简称(如"纸鸢"),三级匹配后变成全名"彩绘纸鸢" —
        #         用户已经把"彩绘纸鸢"加进 excluded_props,但这一遍遍历不读 excluded,
        #         直接把"彩绘纸鸢"渲染到卡片 → 用户怎么删都删不掉
        # 修法:三级匹配后,再 check 匹配到的全名是否在 excluded,在就 skip
        # v3.61.60 关键修复:渲染层加 dedup —
        #         scenario:storyboard.props=["彩绘纸鸢"],description 含"纸鸢"
        #          → 文本扫描补充 props=["彩绘纸鸢","纸鸢"]
        #          → "纸鸢"三级匹配命中"彩绘纸鸢"(alias) → matched.name="彩绘纸鸢"
        #          → result["props"] 出现两个"彩绘纸鸢"(id 都=177)
        #          → 前端 v-for :key 撞 + filter 一删全删,用户感觉"删除按钮搞笑"
        #         修法:用 already_added 集合按 matched.id / 或 raw name 去重
        excluded_props_lower_render = _effective_excluded_lower  # v3.61.57: 用 effective 防止"重新加回的道具被 skip"
        already_added_keys = set()  # v3.61.60: 防止 alias 经三级匹配后命中已加过的同名 / 同 id
        for name in props:
            # 直接命中 excluded(原始名)
            if name.lower() in excluded_props_lower_render:
                logger.info(f"[storyboard-elements] 道具渲染跳过(props 字段含已排除原名): '{name}' (分镜 {storyboard_id})")
                continue
            matched = find_best_match(name, prop_elements, 'prop')
            if matched:
                # 三级匹配命中的全名也要 check excluded
                matched_name = matched.get("name") or ""
                if matched_name.lower() in excluded_props_lower_render:
                    logger.info(
                        f"[storyboard-elements] 道具渲染跳过(三级匹配命中已排除): "
                        f"'{name}' → '{matched_name}' (分镜 {storyboard_id})"
                    )
                    continue
                # v3.61.60: 用 matched.id 去重,避免简称别名重复 append
                _dedup_key = f"id:{matched.get('id')}" if matched.get("id") else f"name:{matched_name.lower()}"
                if _dedup_key in already_added_keys:
                    logger.info(f"[storyboard-elements] 道具渲染跳过(同 id/name 已加): '{name}' → '{matched_name}' (分镜 {storyboard_id})")
                    continue
                already_added_keys.add(_dedup_key)
                result["props"].append({
                    "id": matched.get("id"),
                    "name": matched["name"],
                    "description": matched.get("description"),
                    "finished_image": _normalize_path(matched.get("finished_image")),
                    "reference_image": _normalize_path(matched.get("reference_image")),
                    "image_url": _normalize_path(matched.get("image_url")),
                    "grid_image": _normalize_path(matched.get("grid_image")),
                    "audio_file": matched.get("audio_file"),
                    "updated_at": matched.get("updated_at"),
                })
            else:
                # 没 matched 的情况按 name 去重
                _dedup_key = f"name:{name.lower()}"
                if _dedup_key in already_added_keys:
                    continue
                already_added_keys.add(_dedup_key)
                result["props"].append({"name": name})

        return {"success": True, "data": result}
    finally:
        await db.close()


@router.get("/generating-ids")
async def get_generating_storyboard_ids():
    """获取所有处于生成中状态的分镜ID，供前端页面加载时校验"""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM storyboards WHERE video_status = 'generating'"
        )
        rows = await cursor.fetchall()
        return {"success": True, "ids": [row['id'] for row in rows]}
    finally:
        await db.close()


class PollStatusRequest(BaseModel):
    storyboard_ids: List[int]
    # v3.61.107: 企业自持火山 APIKey(可选) — 前端从 safeStorage 解密后塞过来
    local_api_key: Optional[str] = None
    # v3.61.164: 强制查上游(绕过超时检测短路)— 用户手动点"刷新状态"时用,
    #            场景:工具关掉后即梦/ARK 已生成完,重开后强查拉回 video_url + last_frame
    force: bool = False


# v3.61.30: poll-status 进程内 inflight set,防同一 sb 并发 poll 导致重复下载
# 前端 startPolling + worker._wait_storyboard_settled + 用户点刷新 三处定时器
# 会同时调 poll-status,如果同一个 sb 在 generating 状态被并发查询,
# 两个/三个都会进"下载视频"分支,dreamina-cli 把同一 submit_id 的视频下载多份。
# 用 inflight set 跳过已在处理的 sid,只让一个并发跑下载。
_POLL_INFLIGHT: set = set()


def _local_video_needs_tail_frame(
    video_status: Any,
    video_url: Any,
    last_frame_path: Any,
) -> bool:
    """Return True while a downloaded local video still needs its tail frame.

    The video row is committed as ``done`` before the (potentially slower)
    tail-frame post-processing finishes.  A concurrent poll must therefore not
    tell the frontend that the whole pipeline is settled yet, otherwise the
    frontend stops polling and keeps showing an empty tail-frame column.
    """
    return (
        str(video_status or "").strip().lower() == "done"
        and isinstance(video_url, str)
        and video_url.startswith("/data/")
        and not last_frame_path
    )

# 单镜/旧批量提交的后端收敛任务。全局队列由 queue_worker 自己轮询；这里专门
# 接管没有队列记录的即梦任务，使页面被卸载后仍能查询、下载并回写尾帧。
_STANDALONE_VIDEO_RECONCILE_TASKS: Dict[int, asyncio.Task] = {}
_STANDALONE_VIDEO_RECONCILE_INTERVAL_SECONDS = 15.0


async def _get_standalone_video_reconcile_state(storyboard_id: int) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, video_status, submit_id, video_provider "
            "FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def _run_standalone_video_reconcile(
    storyboard_id: int,
    interval_seconds: float = _STANDALONE_VIDEO_RECONCILE_INTERVAL_SECONDS,
) -> None:
    """持续推进一个非队列即梦任务，直到数据库进入终态。"""
    logger.info(f"[video-reconcile] 分镜 {storyboard_id} 后台状态收敛已启动")
    consecutive_errors = 0
    try:
        while True:
            state = await _get_standalone_video_reconcile_state(storyboard_id)
            if not state:
                logger.info(f"[video-reconcile] 分镜 {storyboard_id} 已不存在，停止")
                return

            status = str(state.get("video_status") or "").strip().lower()
            submit_id = str(state.get("submit_id") or "").strip()
            provider = str(state.get("video_provider") or "jimeng").strip().lower()
            if status != "generating" or not submit_id or provider != "jimeng":
                logger.info(
                    f"[video-reconcile] 分镜 {storyboard_id} 已收敛/转交，停止 "
                    f"(status={status or '-'}, provider={provider or '-'}, submit_id={bool(submit_id)})"
                )
                return

            try:
                response = await poll_video_status(
                    PollStatusRequest(storyboard_ids=[storyboard_id])
                )
                consecutive_errors = 0
                items = response.get("results") if isinstance(response, dict) else None
                item = next(
                    (
                        candidate
                        for candidate in (items or [])
                        if int(candidate.get("id") or 0) == storyboard_id
                    ),
                    None,
                )
                polled_status = str((item or {}).get("video_status") or "").strip().lower()
                if polled_status and polled_status != "generating":
                    logger.info(
                        f"[video-reconcile] 分镜 {storyboard_id} 后台收敛完成: {polled_status}"
                    )
                    return
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                consecutive_errors += 1
                # 瞬态查询失败不能结束任务；首轮和每 10 轮记录一次，避免刷爆日志。
                if consecutive_errors == 1 or consecutive_errors % 10 == 0:
                    logger.warning(
                        f"[video-reconcile] 分镜 {storyboard_id} 查询失败"
                        f"(连续 {consecutive_errors} 次): {type(exc).__name__}: {exc}"
                    )

            await asyncio.sleep(max(0.1, float(interval_seconds)))
    except asyncio.CancelledError:
        logger.info(f"[video-reconcile] 分镜 {storyboard_id} 后台状态收敛已取消")
        raise


def _ensure_standalone_video_reconcile(storyboard_id: int) -> bool:
    """幂等启动单镜后台收敛任务；返回 True 表示本次新建。"""
    existing = _STANDALONE_VIDEO_RECONCILE_TASKS.get(storyboard_id)
    if existing and not existing.done():
        return False

    task = asyncio.create_task(
        _run_standalone_video_reconcile(storyboard_id),
        name=f"video-reconcile-{storyboard_id}",
    )
    _STANDALONE_VIDEO_RECONCILE_TASKS[storyboard_id] = task

    def _cleanup(done_task: asyncio.Task, sid: int = storyboard_id) -> None:
        if _STANDALONE_VIDEO_RECONCILE_TASKS.get(sid) is done_task:
            _STANDALONE_VIDEO_RECONCILE_TASKS.pop(sid, None)
        if done_task.cancelled():
            return
        try:
            exc = done_task.exception()
        except asyncio.CancelledError:
            return
        if exc:
            logger.error(
                f"[video-reconcile] 分镜 {sid} 后台任务异常退出: "
                f"{type(exc).__name__}: {exc}"
            )

    task.add_done_callback(_cleanup)
    return True


async def start_standalone_video_reconcile_workers() -> int:
    """应用启动时恢复上次关闭前仍在生成、且不属于全局队列的即梦任务。"""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT s.id FROM storyboards s "
            "WHERE s.video_status = 'generating' "
            "  AND s.submit_id IS NOT NULL AND s.submit_id != '' "
            "  AND (s.video_provider IS NULL OR s.video_provider = '' OR s.video_provider = 'jimeng') "
            "  AND NOT EXISTS ("
            "      SELECT 1 FROM video_task_queue q "
            "      WHERE q.storyboard_id = s.id AND q.status IN ('queued', 'generating')"
            "  )"
        )
        rows = await cursor.fetchall()
    finally:
        await db.close()

    started = sum(1 for row in rows if _ensure_standalone_video_reconcile(int(row["id"])))
    if started:
        logger.info(f"[video-reconcile] 启动恢复 {started} 个非队列即梦任务")
    return started


async def stop_standalone_video_reconcile_workers() -> None:
    tasks = list(_STANDALONE_VIDEO_RECONCILE_TASKS.values())
    if not tasks:
        return
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    _STANDALONE_VIDEO_RECONCILE_TASKS.clear()


class RetryDownloadRequest(BaseModel):
    storyboard_id: int


@router.post("/retry-download")
async def retry_download_video(request: RetryDownloadRequest):
    """v3.61.153 / v3.61.406:
    针对 status=download_failed 的分镜重新下载。

    先尝试 DB 保存的远程 URL；失败后，统一异步 provider 会按 submit_id
    重新查询上游拿最新地址再下载，避免签名 URL 过期后永远重试同一条旧地址。
    """
    sid = request.storyboard_id
    from database.db import get_db
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT video_status, video_url, submit_id, video_provider "
            "FROM storyboards WHERE id = ?",
            (sid,),
        )
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"分镜 {sid} 不存在")
    cur_status = row["video_status"]
    remote_url = row["video_url"] or ""
    submit_id = row["submit_id"] or ""
    provider_type = (row["video_provider"] or "").strip().lower()
    can_refresh_upstream = provider_type in UNIFIED_VIDEO_PROVIDERS and bool(submit_id)
    # 允许从 download_failed 或 done(但 url 是 http远程)两种状态重试
    if (
        (not remote_url or not remote_url.startswith(("http://", "https://")))
        and not can_refresh_upstream
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"分镜 {sid} 没有可用的远程 URL，也没有可反查的上游任务 ID，"
                "无法重下载。请重新提交本镜。"
            ),
        )
    if cur_status not in ("download_failed", "done", "failed"):
        raise HTTPException(
            status_code=400,
            detail=f"分镜 {sid} 当前状态 {cur_status},不在可重试范围。",
        )

    videos_dir = os.path.normpath(media_subdir("videos"))
    logger.info(
        f"[retry-download] 开始 sid={sid} provider={provider_type or '-'} "
        f"submit_id={submit_id or '-'} has_remote_url={bool(remote_url)}"
    )

    # 已保存 URL 先做一次快速可靠下载。失败后云端 provider 再查最新地址，
    # 因此这里限制为单轮 120 秒，避免按钮一直静默等待旧签名 URL。
    local_url: Optional[str] = None
    download_error: Optional[str] = None
    if remote_url.startswith(("http://", "https://")):
        local_url, download_error = await _download_remote_video_with_diagnostics(
            sid,
            remote_url,
            videos_dir,
            provider_type=provider_type,
            max_attempts=1,
            attempt_timeout_seconds=120,
        )

    # 统一异步 provider：旧 URL 失败后强制重新查询任务，拿新的 result.url 再下载。
    if not local_url and can_refresh_upstream:
        logger.info(
            f"[retry-download] sid={sid} 旧 URL 下载失败({download_error or '无可用 URL'})，"
            f"重新查询 {PROVIDER_FRIENDLY.get(provider_type, provider_type)} task={submit_id}"
        )
        refreshed = await _poll_storyboard_via_cloud(
            sid,
            submit_id,
            provider_type=provider_type,
        )
        refreshed_status = refreshed.get("video_status")
        refreshed_url = refreshed.get("video_url")
        if refreshed_status == "done" and refreshed_url:
            logger.info(
                f"[retry-download] 分镜 {sid} 上游刷新后重试下载成功 → {refreshed_url}"
            )
            return {
                "success": True,
                "id": sid,
                "video_status": "done",
                "video_url": refreshed_url,
                "message": "已刷新上游地址并下载成功",
            }

        # 上游查询失败/仍在处理时，DB 里的 download_failed 保持可恢复；
        # 如果上游明确 failed，_poll_storyboard_via_cloud 已把真实状态落库。
        result_status = (
            refreshed_status
            if refreshed_status in ("failed", "download_failed")
            else "download_failed"
        )
        refresh_reason = refreshed.get("fail_reason") or refreshed.get("error")
        message_parts = []
        if download_error:
            message_parts.append(f"本地下载失败：{download_error}")
        if refresh_reason:
            message_parts.append(f"上游刷新：{refresh_reason}")
        elif refreshed_status == "generating":
            message_parts.append("上游当前仍未返回可下载视频，请稍后再试")
        else:
            message_parts.append("已刷新上游地址，但下载仍未成功")
        return {
            "success": False,
            "id": sid,
            "video_status": result_status,
            "video_url": refreshed_url or remote_url or None,
            "fail_reason": "；".join(message_parts),
            "message": "；".join(message_parts),
        }

    if not local_url:
        # 下载又失败,保留 download_failed 状态(已经是 download_failed 就维持)
        fail_message = (
            f"重试下载失败：{download_error or '网络、磁盘或远程地址异常'}。"
            "远程地址仍保留，可稍后再次重试。"
        )
        await storyboard_service.update_video_status(
            sid,
            "download_failed",
            remote_url,
            fail_reason=fail_message,
        )
        return {
            "success": False,
            "id": sid,
            "video_status": "download_failed",
            "video_url": remote_url or None,
            "fail_reason": fail_message,
            "message": fail_message,
        }

    # 下载成功 → 走标准 update_video_status('done'),自动触发尾帧抽取 hook + 队列同步
    await storyboard_service.update_video_status(sid, "done", local_url)
    await _finalize_video_log_success(
        storyboard_id=sid,
        submit_id=submit_id or None,
        provider=provider_type or "retry-download",
        video_url=local_url,
    )
    logger.info(f"[retry-download] 分镜 {sid} 重试下载成功 → {local_url}")
    return {
        "success": True,
        "id": sid,
        "video_status": "done",
        "video_url": local_url,
        "message": "重试下载成功",
    }


@router.post("/poll-status")
async def poll_video_status(request: PollStatusRequest):
    """批量查询视频生成状态"""
    from database.db import get_db
    db = await get_db()
    results = []
    # v3.61.122 / v3.61.175: 按 provider 区分超时阈值
    #   cloud HTTP provider (ark / cool / xinglian) 用 _cloud_timeout_minutes() helper,
    #   跟 _poll_storyboard_via_cloud 的 "success+url 空" 宽限共用同一套阈值
    #   jimeng CLI 排队可能久,保留 30 分钟兜底常量
    TIMEOUT_MINUTES_JIMENG = 30
    # v3.61.30: 跳过当前已经在 poll 的 sid,直接读 DB 当前状态返回
    # (前端轮询 + worker 轮询 + 用户点刷新 同时进入 poll-status 时,
    #  并发查到同一个 generating 状态 → 都进了下载分支 → dreamina-cli 重复下载同一 submit_id)
    skipped_concurrent: list = []
    process_ids: list = []
    for _sid in request.storyboard_ids:
        if _sid in _POLL_INFLIGHT:
            skipped_concurrent.append(_sid)
        else:
            _POLL_INFLIGHT.add(_sid)
            process_ids.append(_sid)
    try:
        # 先把 skip 的填上(读 DB 不重查即梦)
        for _ssid in skipped_concurrent:
            _cur = await db.execute(
                "SELECT video_status, video_url, video_fail_reason, last_frame_path "
                "FROM storyboards WHERE id=?",
                (_ssid,),
            )
            _row = await _cur.fetchone()
            if _row:
                _tail_frame_finalizing = _local_video_needs_tail_frame(
                    _row["video_status"],
                    _row["video_url"],
                    _row["last_frame_path"],
                )
                results.append({
                    "id": _ssid,
                    # Another poll/reconcile worker is still inside the done
                    # hook.  Keep the visible pipeline in generating state for
                    # these few seconds so the UI does not stop before the tail
                    # frame is written.
                    "video_status": "generating" if _tail_frame_finalizing else _row["video_status"],
                    "video_url": _row["video_url"],
                    "fail_reason": _row["video_fail_reason"],
                    "last_frame_path": _row["last_frame_path"],
                    "finalizing_tail_frame": _tail_frame_finalizing,
                    "skipped_concurrent": True,
                })
            else:
                results.append({"id": _ssid, "video_status": None, "video_url": None})

        for sid in process_ids:
            cursor = await db.execute(
                "SELECT id, submit_id, video_status, video_url, video_submit_time, "
                "video_fail_reason, video_provider, last_frame_path "
                "FROM storyboards WHERE id = ?", (sid,)
            )
            row = await cursor.fetchone()
            if not row:
                results.append({"id": sid, "video_status": None, "video_url": None})
                continue
            # 提取 DB 里存的 fail_reason,后续所有"submit_id 为空"或"failed 直接返回"的分支都用它兜底
            db_fail_reason = row['video_fail_reason'] if 'video_fail_reason' in row.keys() else None
            
            # 超时检测：如果状态为 generating 且超过阈值，查询真实状态
            # v3.61.121 修复:超时分支必须按 sb_provider 路由 — 之前 bug 是不管啥 provider 都走即梦 CLI,
            # 火山方舟的 cgt-xxx task_id 被即梦 CLI 当无效 ID → success=false → 死循环 30 min 后每轮都重复
            # v3.61.122 优化:按 provider 区分阈值 — 火山 5 分钟,即梦 30 分钟,不再让 API 用户白等
            # v3.61.164:force=True 时绕过超时阈值,直接进上游查询(用户手动点"刷新状态"用)
            if row['video_status'] == 'generating' and row['video_submit_time']:
                try:
                    submit_time = datetime.strptime(row['video_submit_time'], '%Y-%m-%d %H:%M:%S')
                    now = now_beijing().replace(tzinfo=None)
                    # 按 provider 决定阈值
                    _sb_prov_to_threshold = (row['video_provider'] if 'video_provider' in row.keys() else None) or 'jimeng'
                    # v3.61.175: unified provider (ark/cool/xinglian/pippit_cli) 走 helper,jimeng CLI 走旧常量
                    if _sb_prov_to_threshold in UNIFIED_VIDEO_PROVIDERS:
                        _timeout_min = _cloud_timeout_minutes(_sb_prov_to_threshold)
                    else:
                        _timeout_min = TIMEOUT_MINUTES_JIMENG
                    _is_overtime = now - submit_time > timedelta(minutes=_timeout_min)
                    _should_query_upstream = request.force or _is_overtime
                    if _should_query_upstream:
                        if request.force:
                            logger.info(f"[poll-status] 分镜 {sid} 用户强刷,绕过超时直接查上游 (provider={_sb_prov_to_threshold})")
                        else:
                            logger.info(f"[poll-status] 分镜 {sid} 已超时(>{_timeout_min}分钟,provider={_sb_prov_to_threshold})，查询真实状态...")

                        # submit_id 空值保护
                        # v3.61.164 codex round2:force=True 时不能用"超时+无 submit_id"逻辑标失败 —
                        #   用户场景:刚点开始生成,backend 占位 generating 但 submit_id 还没写回,
                        #   用户立刻点刷新 → force 进这条分支 → 误标 failed
                        # 修法:force 模式 submit_id 空 → 保持 generating(任务可能正在提交中,
                        #      等下次轮询/真超时再处理),只有"真超时(not force)"才走原 failed 兜底
                        if not row['submit_id']:
                            if request.force:
                                logger.info(
                                    f"[poll-status] 分镜 {sid} 强刷但 submit_id 暂空(可能正在提交中),"
                                    f"保持 generating 不标 failed"
                                )
                                results.append({
                                    "id": sid, "video_status": "generating", "video_url": None,
                                    "queue_status": "submitting",
                                })
                                continue
                            logger.warning(f"[poll-status] 分镜 {sid} 超时但 submit_id 为空，标记为失败")
                            await storyboard_service.update_video_status(sid, "failed")
                            await _finalize_video_log_error(
                                storyboard_id=sid,
                                submit_id=row['submit_id'],
                                fail_reason=f"生成超时(>{_timeout_min}分钟),且无有效的任务ID",
                            )
                            results.append({
                                "id": sid, "video_status": "failed", "video_url": None,
                                "fail_reason": f"生成超时(>{_timeout_min}分钟)，且无有效的任务ID",
                                "timeout": True
                            })
                            continue

                        # ★ v3.61.121:按 provider 路由 — 火山方舟/Cool 走 cloud HTTP API 查询,即梦走 CLI
                        # v3.61.168: cool 跟 ark 复用 _poll_storyboard_via_cloud(provider_type 透传)
                        _sb_provider_to = (row['video_provider'] if 'video_provider' in row.keys() else None) or 'jimeng'
                        if _sb_provider_to in UNIFIED_VIDEO_PROVIDERS:
                            # 云端 HTTP 超时强查 — 复用 _poll_storyboard_via_cloud(query + 下载 + 状态写回 + 抽尾帧 hook)
                            try:
                                _ark_to = await _poll_storyboard_via_cloud(
                                    sid, row['submit_id'],
                                    provider_type=_sb_provider_to,
                                    local_api_key=request.local_api_key,
                                )
                                _ark_status = _ark_to.get("video_status", "")
                                if _ark_status == 'done':
                                    logger.info(f"[poll-status/ark] 分镜 {sid} 超时强查到已完成,本地已写 done")
                                elif _ark_status == 'failed':
                                    logger.warning(f"[poll-status/ark] 分镜 {sid} 超时强查为 failed: {_ark_to.get('fail_reason')}")
                                else:
                                    _hard_limit_min = _cloud_hard_limit_minutes(_sb_provider_to)
                                    _elapsed_min_cloud = (now - submit_time).total_seconds() / 60.0
                                    if _hard_limit_min and _elapsed_min_cloud >= _hard_limit_min:
                                        _hard_msg = (
                                            f"{PROVIDER_FRIENDLY.get(_sb_provider_to, _sb_provider_to)} "
                                            f"超过 {int(_elapsed_min_cloud)} 分钟仍未出结果,已标记失败,请重新生成。"
                                        )
                                        logger.warning(f"[poll-status/ark] 分镜 {sid} {_hard_msg}")
                                        await storyboard_service.update_video_status(sid, "failed", fail_reason=_hard_msg)
                                        await _finalize_video_log_error(
                                            storyboard_id=sid,
                                            submit_id=row['submit_id'],
                                            fail_reason=_hard_msg,
                                        )
                                        results.append({
                                            "id": sid,
                                            "video_status": "failed",
                                            "video_url": None,
                                            "fail_reason": _hard_msg,
                                            "timeout": True,
                                        })
                                        continue
                                    # 仍在跑 — 只有真实超过阈值才标记 overtime。
                                    # force=True 是用户手动刷新状态,不能误导前端显示"已超过30分钟"。
                                    logger.info(
                                        f"[poll-status/ark] 分镜 {sid} "
                                        f"{'超时但' if _is_overtime else '强刷查询'}火山仍在处理(status={_ark_status})"
                                    )
                                    if _is_overtime:
                                        _ark_to.setdefault('overtime', True)
                                results.append(_ark_to)
                                continue
                            except Exception as _ark_err:
                                logger.warning(
                                    f"[poll-status/ark] 分镜 {sid} 超时火山查询异常: {_ark_err},"
                                    f"保留 generating(火山可能仍在跑)"
                                )
                                results.append({
                                    "id": sid, "video_status": "generating", "video_url": None,
                                    "queue_status": "unknown",
                                    "overtime": _is_overtime,
                                    "query_failed": True, "query_error": str(_ark_err)[:200],
                                })
                                continue

                        # 以下是即梦 CLI 路径(原逻辑) — 仅 jimeng provider 走
                        try:
                            timeout_query = await video_service.query_result(row['submit_id'])

                            # 先检查查询是否成功
                            # v3.61.88: cli 查询失败 ≠ 即梦没在跑 — 不能直接标本地 failed
                            # 修复 case: 截图显示"生成超时(>30分钟),且查询即梦状态失败:"(error_msg 为空)
                            #   实际即梦后台还在排队,本地误判失败,用户白等
                            # 改法: 查询失败 → 保留 generating 状态 + overtime 标记,前端显示"超时但仍在跑"
                            #       让用户/前端轮询下一次再试,自然恢复
                            if not timeout_query.get("success"):
                                error_msg = timeout_query.get("error", "未知错误")
                                logger.warning(
                                    f"[poll-status] 分镜 {sid} "
                                    f"{'超时(>' + str(_timeout_min) + '分钟)且' if _is_overtime else '强刷时'}"
                                    f"查询即梦状态失败: {error_msg},"
                                    f"保留 generating 状态(即梦可能仍在跑),等下次轮询再查"
                                )
                                results.append({
                                    "id": sid,
                                    "video_status": "generating",
                                    "video_url": None,
                                    "queue_status": "unknown",
                                    "overtime": _is_overtime,
                                    "query_failed": True,
                                    "query_error": error_msg,
                                })
                                continue
                            
                            timeout_data = timeout_query.get("data", {})
                            timeout_gen_status = timeout_data.get("gen_status", "")
                            
                            if timeout_gen_status == "success":
                                # 即梦已完成，走成功处理流程（下载视频）
                                logger.info(f"[poll-status] 分镜 {sid} 超时但即梦已完成，开始下载视频")
                                
                                # 准备下载目录
                                videos_dir = os.path.normpath(media_subdir("videos"))
                                os.makedirs(videos_dir, exist_ok=True)
                                existing_files = set(os.listdir(videos_dir))
                                
                                download_result = await video_service.query_result(row['submit_id'], download_dir=videos_dir)
                                # v3.61.67: 防破解 — download_result 里有完整 prompt
                                try:
                                    from utils.log_sanitizer import sanitize_dict_for_log
                                    _safe_dl_to = sanitize_dict_for_log(download_result, max_value_len=200)
                                except Exception:
                                    _safe_dl_to = '[sanitize 失败]'
                                logger.info(f"[poll-status] 分镜 {sid} 超时查询下载结果: {_safe_dl_to}")

                                # 检查下载是否成功
                                if not download_result.get("success"):
                                    logger.warning(f"[poll-status] 分镜 {sid} 超时成功但下载失败: {download_result.get('error', '')}")

                                # ★ 关键修复:dreamina-cli 输出文件名是 {submit_id}_video_N.mp4
                                # 必须按 submit_id 前缀精确匹配,不能用 listdir 取差集
                                # (并发轮询时 #1-4 会拿到 #1-5 的文件 → 多个分镜共用同一 video_url)
                                _sid_prefix = (row['submit_id'] or '').strip()
                                _matched_files = [
                                    f for f in os.listdir(videos_dir)
                                    if _sid_prefix and f.startswith(_sid_prefix) and f.lower().endswith(('.mp4', '.mov', '.webm'))
                                ]
                                if _matched_files:
                                    video_filename = _matched_files[0]
                                    # v3.59.87:按 {小说名}/{章节} 子目录归类 + 文件名只留 S场-节_时间戳
                                    # 用户点「素材文件夹」按钮直接打开本章子目录,explorer 一目了然
                                    try:
                                        _ext = os.path.splitext(video_filename)[1] or ".mp4"
                                        path_info = await _build_friendly_video_path(sid, _ext)
                                        if path_info:
                                            subdir, fname = path_info
                                            video_filename = _rename_to_friendly_subdir(videos_dir, video_filename, subdir, fname)
                                    except Exception as _re_err:
                                        logger.warning(f"[poll-status] 友好命名失败(沿用 cli 原名): {_re_err}")
                                    local_video_url = f"/data/videos/{video_filename}"
                                    logger.info(f"[poll-status] 分镜 {sid} 超时查询发现已完成，视频已下载: {local_video_url}")
                                    await storyboard_service.update_video_status(sid, "done", local_video_url)
                                    await _finalize_video_log_success(
                                        storyboard_id=sid,
                                        submit_id=row['submit_id'],
                                        provider="jimeng",
                                        video_url=local_video_url,
                                    )
                                    results.append({"id": sid, "video_status": "done", "video_url": local_video_url})
                                else:
                                    # v3.61.153 codex P1: 超时强查分支同样不能"下载失败标 done"
                                    # 远程 URL 解析路径补齐 data.result_json.videos[0].video_url
                                    remote_url = timeout_data.get("video_url") or timeout_data.get("url") or ""
                                    if not remote_url and isinstance(timeout_data.get("result"), dict):
                                        remote_url = timeout_data["result"].get("video_url", "")
                                    if not remote_url and isinstance(timeout_data.get("data"), list):
                                        for item in timeout_data["data"]:
                                            if isinstance(item, dict) and item.get("video_url"):
                                                remote_url = item["video_url"]
                                                break
                                    if not remote_url and isinstance(timeout_data.get("result_json"), dict):
                                        _videos = timeout_data["result_json"].get("videos")
                                        if isinstance(_videos, list) and _videos:
                                            v0 = _videos[0]
                                            if isinstance(v0, dict):
                                                remote_url = v0.get("video_url") or v0.get("url") or ""
                                    if remote_url:
                                        _fail_msg = "即梦已生成完成,但本地下载失败(超时强查路径)。可在视频生成页点重试下载。"
                                        logger.warning(f"[poll-status] 分镜 {sid} 超时查询下载失败,标 download_failed (远程URL={remote_url})")
                                        await storyboard_service.update_video_status(
                                            sid, "download_failed", remote_url, fail_reason=_fail_msg,
                                        )
                                        await _finalize_video_log_error(
                                            storyboard_id=sid,
                                            submit_id=row['submit_id'],
                                            fail_reason=_fail_msg,
                                        )
                                        results.append({
                                            "id": sid,
                                            "video_status": "download_failed",
                                            "video_url": remote_url,
                                            "fail_reason": _fail_msg,
                                        })
                                    else:
                                        logger.error(f"[poll-status] 分镜 {sid} 超时查询视频下载失败且无远程URL")
                                        await storyboard_service.update_video_status(
                                            sid, "failed", fail_reason="视频下载失败且未取到远程 URL",
                                        )
                                        await _finalize_video_log_error(
                                            storyboard_id=sid,
                                            submit_id=row['submit_id'],
                                            fail_reason="视频下载失败且未取到远程 URL",
                                        )
                                        results.append({"id": sid, "video_status": "failed", "video_url": None, "fail_reason": "视频下载失败"})
                                continue
                                
                            elif timeout_gen_status in ("failed", "fail"):
                                # 即梦确认失败
                                fail_reason = timeout_data.get("fail_reason") or timeout_data.get("error") or "未知错误"
                                guidance = timeout_data.get("guidance", "")
                                full_reason = f"{fail_reason}{'（' + guidance + '）' if guidance else ''}"
                                logger.warning(f"[poll-status] 分镜 {sid} 超时且即梦确认失败: {full_reason}")
                                await storyboard_service.update_video_status(sid, "failed", fail_reason=full_reason)
                                await _finalize_video_log_error(
                                    storyboard_id=sid,
                                    submit_id=row['submit_id'],
                                    fail_reason=full_reason or f"生成超时(>{_timeout_min}分钟)且即梦确认失败",
                                )
                                results.append({
                                    "id": sid,
                                    "video_status": "failed",
                                    "video_url": None,
                                    "fail_reason": full_reason or f"生成超时(>{_timeout_min}分钟)且即梦确认失败",
                                    "timeout": True
                                })
                                continue
                                
                            else:
                                # 即梦仍在处理中（querying/queuing/generating/pending等）
                                # v3.61.256 修复:querying 是即梦"进行中"返回值,但任务在即梦后台卡死
                                #   或被用户在即梦端取消时,query_result 会一直返回 querying,旧逻辑无限保留
                                #   generating 死等(实测 4504 次空转)。也兜住 v3.61.254「无效 submit_id 进轮询」的副作用。
                                #   硬止损:超过 480 分钟(8 小时)仍 querying → 标失败,
                                #   让用户能重新生成;未到硬上限的 querying 仍保留 generating,不误杀真排队。
                                #   v3.61.259:180→360,给即梦超长排队更大余地(用户要求)。
                                #   v3.61.336:360→480,即梦 CLI 视频最长等待 8 小时。
                                _elapsed_min_qy = (now - submit_time).total_seconds() / 60.0
                                _HARD_LIMIT_MIN = 480
                                if _elapsed_min_qy >= _HARD_LIMIT_MIN:
                                    _hard_msg = (
                                        f"即梦超过 {int(_elapsed_min_qy)} 分钟仍未出结果(状态 {timeout_gen_status}),"
                                        "可能即梦后台异常或任务已在即梦端取消,已标记失败,请重新生成。"
                                    )
                                    logger.warning(f"[poll-status] 分镜 {sid} {_hard_msg}")
                                    await storyboard_service.update_video_status(sid, "failed", fail_reason=_hard_msg)
                                    await _finalize_video_log_error(
                                        storyboard_id=sid,
                                        submit_id=row['submit_id'],
                                        fail_reason=_hard_msg,
                                    )
                                    results.append({
                                        "id": sid, "video_status": "failed", "video_url": None,
                                        "fail_reason": _hard_msg, "timeout": True,
                                    })
                                    continue
                                queue_info = timeout_data.get("queue_info", {})
                                logger.info(
                                    f"[poll-status] 分镜 {sid} "
                                    f"{'已超时但' if _is_overtime else '强刷查询'}即梦仍在处理中"
                                    f"(gen_status={timeout_gen_status})，不标记失败"
                                )
                                results.append({
                                    "id": sid,
                                    "video_status": "generating",
                                    "video_url": None,
                                    "queue_status": queue_info.get("queue_status", "") if isinstance(queue_info, dict) else "",
                                    "queue_idx": queue_info.get("queue_idx") if isinstance(queue_info, dict) else None,
                                    "overtime": _is_overtime
                                })
                                continue
                                
                        except Exception as e:
                            # v3.61.88: 查询异常同样不标失败 — 即梦后台可能仍在跑
                            # 网络抖/cli 子进程崩 都跟"任务在不在即梦后台"无关
                            logger.warning(
                                f"[poll-status] 分镜 {sid} "
                                f"{'超时且' if _is_overtime else '强刷时'}即梦查询异常: {e},"
                                f"保留 generating 状态(即梦可能仍在跑),等下次轮询再查"
                            )
                            results.append({
                                "id": sid,
                                "video_status": "generating",
                                "video_url": None,
                                "queue_status": "unknown",
                                "overtime": _is_overtime,
                                "query_failed": True,
                                "query_error": str(e)[:200],
                            })
                            continue
                except (ValueError, TypeError) as e:
                    logger.warning(f"[poll-status] 分镜 {sid} 解析 video_submit_time 失败: {e}")
            
            if not row['submit_id']:
                # submit_id 为空 — 两种情况:
                #   1) 状态 'generating':刚提交还在 _process_video_generation 跑,没写 submit_id
                #   2) 状态 'failed':提交即失败(如 AigcCompliance / Param 错),根本没拿到 submit_id
                # 两种都把 DB 里的 video_fail_reason 透传给前端
                logger.info(f"[poll-status] 分镜 {sid} submit_id 为空,status={row['video_status']},fail_reason={db_fail_reason}")
                results.append({
                    "id": sid,
                    "video_status": row['video_status'],
                    "video_url": row['video_url'],
                    "fail_reason": db_fail_reason,
                })
                continue

            # 如果已完成且有视频URL，直接返回
            if row['video_status'] == 'done' and row['video_url']:
                _last_frame_path = row['last_frame_path']
                # Self-heal old/racy rows: the video is already local and done,
                # but the tail-frame hook either had not finished when another
                # poll stopped the UI, or an older build failed before writing
                # last_frame_path.  Re-extract once on the next real poll.
                if _local_video_needs_tail_frame(
                    row['video_status'], row['video_url'], _last_frame_path
                ):
                    try:
                        logger.info(
                            f"[poll-status] 分镜 {sid} 已完成但缺少尾帧，执行自愈抽帧"
                        )
                        await storyboard_service._extract_and_save_last_frame(
                            sid, row['video_url']
                        )
                        _lf_cur = await db.execute(
                            "SELECT last_frame_path FROM storyboards WHERE id = ?",
                            (sid,),
                        )
                        _lf_row = await _lf_cur.fetchone()
                        _last_frame_path = _lf_row['last_frame_path'] if _lf_row else None
                    except Exception as _tail_err:
                        logger.warning(
                            f"[poll-status] 分镜 {sid} 尾帧自愈失败(视频仍保留完成): {_tail_err}"
                        )
                results.append({
                    "id": sid,
                    "video_status": row['video_status'],
                    "video_url": row['video_url'],
                    "last_frame_path": _last_frame_path,
                })
                continue

            # v3.59.86:已标 failed 的分镜不再重查即梦
            # (v3.60.12 临时加过自动认领,但容易错认其他人的任务,v3.60.13 撤回)
            # v3.61.175: failed 早退加 force=True 例外 ——
            #   场景:逆向即梦号(xinglian)排队超 30 min 老版本误判 failed,
            #   实际上游异步可能已经出包,用户点「刷新状态」(force=True)就该再去捞一次。
            #   放过条件:
            #     1) force=True + submit_id 非空 + provider in (ark/cool/xinglian)
            #     2) v3.61.278:用户手动中止的即梦任务。手动中止只解除本地占用,
            #        即梦上游可能还在跑,允许用户点「刷新状态」按 submit_id 捞回。
            #     - 自动轮询(force=False)不重查,避免后台死循环
            #     - 普通即梦 failed 多半是审核拒/账号封,重查无意义(维持不放过)
            #   落到后面的 _poll_storyboard_via_cloud 后:
            #     - 上游已出 url → 自动 success → 下载视频 → status 自动改 done
            #     - 上游 success+url 空且未超 xinglian 180min → 继续 generating(老超时 30min 用户可救)
            #     - 上游 success+url 空且超 180min → friendly failed(写明已重试)
            _sb_prov_for_failed = (row['video_provider'] if 'video_provider' in row.keys() else None) or 'jimeng'
            _manual_abort_failed = str(db_fail_reason or "").startswith("已手动中止生成")
            _fail_reason_text = str(db_fail_reason or "")
            _jimeng_ghost_failed = (
                (
                    "即梦 CLI 返回了任务ID" in _fail_reason_text
                    and (
                        "处理中列表连续查不到" in _fail_reason_text
                        or "任务列表连续查不到" in _fail_reason_text
                    )
                )
                or (
                    "即梦 CLI 返回任务正在排队/生成" in _fail_reason_text
                    and "幽灵任务" in _fail_reason_text
                )
            )
            _allow_failed_force_retry = (
                request.force
                and row['submit_id']
                and (
                    _sb_prov_for_failed in UNIFIED_VIDEO_PROVIDERS
                    or (_sb_prov_for_failed == 'jimeng' and (_manual_abort_failed or _jimeng_ghost_failed))
                )
            )
            if row['video_status'] == 'failed':
                if not _allow_failed_force_retry:
                    _display_fail_reason = db_fail_reason
                    _raw_fail_low = str(db_fail_reason or "").lower()
                    _needs_translate = any(k in _raw_fail_low for k in (
                        "post-tns", "tns check", "generation failed", "final generation failed",
                        "aigccompliance", "exceedconcurrencylimit", "ratelimit", "rate limit",
                        "context deadline", "no file upload", "upload phase",
                    ))
                    if _sb_prov_for_failed == "jimeng" and db_fail_reason and _needs_translate:
                        _translated = _translate_jimeng_fail_reason(str(db_fail_reason), "")
                        if _translated != db_fail_reason:
                            _display_fail_reason = _translated
                            try:
                                await storyboard_service.update_video_status(sid, "failed", fail_reason=_translated)
                            except Exception as _e:
                                logger.debug(f"[poll-status] failed reason translate backfill skipped sb={sid}: {_e}")
                    results.append({
                        "id": sid,
                        "video_status": "failed",
                        "video_url": row['video_url'],
                        "fail_reason": _display_fail_reason,
                    })
                    continue
                logger.info(
                    f"[poll-status] sb={sid} force 重查 failed 任务 "
                    f"(provider={_sb_prov_for_failed}, submit_id={row['submit_id']})"
                )
                # 落到下面的 cloud HTTP 查询路径

            # 其他情况（generating / done但无video_url）都重新查询即梦状态

            submit_id = row['submit_id']
            logger.info(f"[poll-status] 查询分镜 {sid}, submit_id={submit_id}")

            # v3.61.0: 按 provider 路由查询
            # storyboard.video_provider 标记了用哪个 provider 提交的
            # v3.61.168: cool 跟 ark 都走 _poll_storyboard_via_cloud,provider_type 透传
            sb_provider = (row['video_provider'] if 'video_provider' in row.keys() else None) or 'jimeng'
            if sb_provider in UNIFIED_VIDEO_PROVIDERS:
                # 云端 HTTP API 查询
                ark_result = await _poll_storyboard_via_cloud(
                    sid, submit_id,
                    provider_type=sb_provider,
                    local_api_key=request.local_api_key,
                )
                # v3.61.175 codex 复审 P1:救回 failed 任务时落库改回 generating
                #   场景:老版本被误判 failed 的星链云任务,用户点刷新走 force 重查,
                #   上游返 success+url 空 / running → _poll_storyboard_via_cloud 这次不会
                #   再标 failed(provider 层 success+url 空已改返 success,上层走 grace
                #   period),但它返回 generating 时也不会主动落库 status。
                #   如果不在这里 update_video_status,DB 里仍是 failed,下次自动轮询
                #   (force=False) 又会命中 failed 早退 → 救援不持久。
                #   update_video_status 在非 failed 状态自动清 fail_reason(见
                #   storyboard_service.py:3198-3199),所以只调一次即可。
                if row['video_status'] == 'failed' and ark_result.get("video_status") == "generating":
                    try:
                        await storyboard_service.update_video_status(sid, "generating")
                        logger.info(
                            f"[poll-status] sb={sid} failed 强刷救回,DB 改回 generating + 清 fail_reason"
                        )
                    except Exception as _e:
                        logger.warning(
                            f"[poll-status] sb={sid} 救回落库失败: {_e}(本次返回仍是 generating,下次自动轮询会再撞 failed)"
                        )
                results.append(ark_result)
                continue

            # 调用 dreamina query_result
            query_result = await video_service.query_result(submit_id)
            # v3.61.67: 防破解 — data 里 prompt 字段是完整 LLM 生成的分镜文本,脱敏后打日志
            try:
                from utils.log_sanitizer import sanitize_dict_for_log
                _safe_data = sanitize_dict_for_log(query_result.get('data'), max_value_len=200)
            except Exception:
                _safe_data = '[sanitize 失败,跳过]'
            logger.info(f"[poll-status] 分镜 {sid} query_result: success={query_result.get('success')}, data={_safe_data}")
            
            if query_result.get("success"):
                data = query_result.get("data", {})
                gen_status = data.get("gen_status", "")
                logger.info(f"[poll-status] 分镜 {sid} gen_status={gen_status}")
                
                if gen_status == "success":
                    # 准备下载目录
                    videos_dir = os.path.normpath(media_subdir("videos"))
                    os.makedirs(videos_dir, exist_ok=True)

                    # ★ v3.59.89:即梦上游报的 duration,用来后面校验下载是否被截断
                    upstream_duration = 0.0
                    try:
                        rj = data.get("result_json") or {}
                        videos = rj.get("videos") or []
                        if videos and isinstance(videos[0], dict):
                            upstream_duration = float(videos[0].get("duration") or 0)
                    except Exception:
                        pass

                    # 调用 CLI 下载视频
                    logger.info(f"[poll-status] 分镜 {sid} 生成成功，开始下载视频到 {videos_dir} (上游 duration={upstream_duration}s)")
                    download_result = await video_service.query_result(submit_id, download_dir=videos_dir)
                    # v3.61.67: 下载结果里也有完整 prompt,脱敏
                    try:
                        from utils.log_sanitizer import sanitize_dict_for_log
                        _safe_dl = sanitize_dict_for_log(download_result, max_value_len=200)
                    except Exception:
                        _safe_dl = '[sanitize 失败]'
                    logger.info(f"[poll-status] 分镜 {sid} 下载结果: {_safe_dl}")

                    # ★ v3.59.89:dreamina-cli 报 success=False 时不当作成功
                    # 老 bug:cli 下到一半网络断 → 写了截断的 mp4 + 报 success=False
                    #         我们代码看到 listdir 有 submit_id 前缀的文件就当下载成功
                    #         → 用户拿到 4 秒残缺视频(应该 10 秒)+ 抽帧失败 + 没尾帧
                    # 修法:cli success=False → 直接走"下载失败回退远程 URL"分支
                    cli_success = bool(download_result.get("success"))

                    # ★ 关键修复:按 submit_id 前缀精确匹配 dreamina-cli 输出文件 ({submit_id}_video_N.mp4)
                    # 不能用 listdir 取差集 — 并发轮询时多个分镜会拿到对方的视频(#1-4 写成 #1-5 的 url)
                    _matched_files = [
                        f for f in os.listdir(videos_dir)
                        if submit_id and f.startswith(submit_id) and f.lower().endswith(('.mp4', '.mov', '.webm'))
                    ]
                    if cli_success and _matched_files:
                        video_filename = _matched_files[0]
                        # ★ v3.59.89:文件大小防截断校验 — 上游 10s 视频 < 1MB 显然不正常
                        # 即梦 720p mp4 通常 0.8-1.5 MB/s,正常 5s 视频 ≥ 4MB,10s ≥ 8MB
                        # 这里阈值放宽 — 仅拦截"明显异常小"的文件(如截断到 4 秒只有 4MB)
                        try:
                            _src_path = os.path.join(videos_dir, video_filename)
                            _src_size = os.path.getsize(_src_path)
                            _expected_min = max(0.5 * 1024 * 1024, upstream_duration * 0.4 * 1024 * 1024)
                            if upstream_duration > 0 and _src_size < _expected_min:
                                logger.warning(
                                    f"[poll-status] 分镜 {sid} 下载文件可能被截断 "
                                    f"(实际 {_src_size/1024/1024:.2f}MB,期望至少 {_expected_min/1024/1024:.2f}MB,"
                                    f"上游 duration={upstream_duration}s),删除残文件,fallback 远程 URL"
                                )
                                try: os.remove(_src_path)
                                except Exception: pass
                                _matched_files = []  # 触发下方 fallback
                        except Exception as _sz_err:
                            logger.warning(f"[poll-status] 校验下载大小异常(忽略): {_sz_err}")

                    if cli_success and _matched_files:
                        video_filename = _matched_files[0]
                        # v3.59.87:按 {小说名}/{章节} 子目录归类 + 文件名只留 S场-节_时间戳
                        try:
                            _ext = os.path.splitext(video_filename)[1] or ".mp4"
                            path_info = await _build_friendly_video_path(sid, _ext)
                            if path_info:
                                subdir, fname = path_info
                                video_filename = _rename_to_friendly_subdir(videos_dir, video_filename, subdir, fname)
                        except Exception as _re_err:
                            logger.warning(f"[poll-status] 友好命名失败(沿用 cli 原名): {_re_err}")
                        local_video_url = f"/data/videos/{video_filename}"
                        logger.info(f"[poll-status] 分镜 {sid} 视频已下载: {local_video_url}")
                        await storyboard_service.update_video_status(sid, "done", local_video_url)
                        await _finalize_video_log_success(
                            storyboard_id=sid,
                            submit_id=submit_id,
                            provider="jimeng",
                            video_url=local_video_url,
                            actual_duration=upstream_duration or None,
                        )
                        results.append({"id": sid, "video_status": "done", "video_url": local_video_url, "fail_reason": None})
                    else:
                        # v3.61.153 codex review 修复:
                        # 之前下载失败仍写 done,导致 video_url 可能为空、本地无文件、尾帧 hook 跳过,
                        # 前端只看 status=done 就当成功,实际素材根本没落盘 → 后续视频生成/分镜接帧全炸。
                        # 改成:下载失败 → video_status='download_failed' 可重试;
                        #     尽量解析所有已知嵌套结构提取远程 video_url 存到字段(给重下自愈用)
                        video_url = data.get("video_url") or data.get("url") or ""
                        # 尝试从嵌套结构提取(扩充所有已知路径)
                        if not video_url and isinstance(data.get("result"), dict):
                            video_url = data["result"].get("video_url", "")
                        if not video_url and isinstance(data.get("data"), list):
                            for item in data["data"]:
                                if isinstance(item, dict) and item.get("video_url"):
                                    video_url = item["video_url"]
                                    break
                        # 即梦实际嵌套路径(实证 codex):data.result_json.videos[0].video_url
                        if not video_url and isinstance(data.get("result_json"), dict):
                            _videos = data["result_json"].get("videos")
                            if isinstance(_videos, list) and _videos:
                                v0 = _videos[0]
                                if isinstance(v0, dict):
                                    video_url = v0.get("video_url") or v0.get("url") or ""
                        # 状态写 download_failed,UI 显示"已生成但下载失败,可重试",不再误标 done
                        _fail_msg = (
                            "即梦已生成完成,但本地下载失败(网络/磁盘/超时)。"
                            "已记录远程 URL,可在视频生成页点本镜重新下载。"
                            if video_url else
                            "即梦已生成完成,但下载失败,且未能解析到远程 URL。请重新提交本镜。"
                        )
                        logger.warning(
                            f"[poll-status] 分镜 {sid} 下载失败,标 download_failed (远程URL={video_url or '空'})"
                        )
                        # video_url 存远程 URL 给重下用,但 status 是 download_failed,前端不会当 done 处理
                        await storyboard_service.update_video_status(
                            sid, "download_failed", video_url or None, fail_reason=_fail_msg,
                        )
                        await _finalize_video_log_error(
                            storyboard_id=sid,
                            submit_id=submit_id,
                            fail_reason=_fail_msg,
                        )
                        results.append({
                            "id": sid,
                            "video_status": "download_failed",
                            "video_url": video_url or None,
                            "fail_reason": _fail_msg,
                        })
                elif gen_status == "failed" or gen_status == "fail":
                    # 提取失败原因和解决建议
                    raw_fail_reason = data.get("fail_reason") or data.get("error") or "未知错误"
                    guidance = data.get("guidance", "")
                    # ★ 翻译即梦的英文 fail_reason 为中文友好提示
                    # 即梦 dreamina-cli 拿不到详细审核结果(中文「音频可能包含不适当内容」是即梦官网内部 API),
                    # 只能拿到 "generation failed: final generation failed" 这种粗粒度提示。
                    # 我们基于关键字推测最可能原因 + 建议用户去即梦官网查详细。
                    friendly_fail = _translate_jimeng_fail_reason(raw_fail_reason, guidance)
                    logger.info(f"[poll-status] 分镜 {sid} 生成失败,原始={raw_fail_reason},翻译={friendly_fail[:80]}")
                    # ★ 修复:之前 update_video_status 没传 fail_reason 参数,DB 里没存,刷新页面后失败原因丢失
                    update_result = await storyboard_service.update_video_status(sid, "failed", fail_reason=friendly_fail)
                    await _finalize_video_log_error(
                        storyboard_id=sid,
                        submit_id=submit_id,
                        fail_reason=friendly_fail,
                    )
                    logger.info(f"[poll-status] 分镜 {sid} 更新状态为 failed: {update_result}")
                    results.append({"id": sid, "video_status": "failed", "video_url": None, "fail_reason": friendly_fail, "guidance": guidance})
                else:
                    # 仍在排队/生成中
                    queue_info = data.get("queue_info", {})
                    logger.info(f"[poll-status] 分镜 {sid} 仍在生成中，gen_status={gen_status}")
                    if row['video_status'] == 'failed' and _allow_failed_force_retry:
                        try:
                            await storyboard_service.update_video_status(sid, "generating")
                            logger.info(
                                f"[poll-status] sb={sid} failed 强刷救回,DB 改回 generating + 清 fail_reason"
                            )
                        except Exception as _e:
                            logger.warning(
                                f"[poll-status] sb={sid} 即梦 failed 强刷救回落库失败: {_e}"
                            )

                    # 强幽灵兜底:客户机器的 Jimeng CLI 本地库可能残留 querying 死记录,
                    # list_task 会一直列出它们,但 query_result.queue_info 为空且网页端并无任务。
                    # 因此这里不再用 list_task 缺失作为释放条件;只在同一 submit_id 超过 6 小时、
                    # 且 queue_info 连续为空时释放本地状态。只要 queue_info 里出现 Queueing/Generating
                    # 等远端队列信息,就认为任务仍被即梦接住,不触发强幽灵。
                    try:
                        _queue_status_l = ""
                        _queue_info_empty = True
                        if isinstance(queue_info, dict):
                            _queue_status_l = str(queue_info.get("queue_status") or "").lower()
                            _queue_info_empty = not any(
                                str(v or "").strip() for v in queue_info.values()
                            )
                        _gen_status_l = str(gen_status or "").lower()
                        _submitted_at = None
                        if row["video_submit_time"]:
                            _submitted_at = datetime.strptime(row["video_submit_time"], "%Y-%m-%d %H:%M:%S")
                        _elapsed = (now_beijing().replace(tzinfo=None) - _submitted_at).total_seconds() if _submitted_at else 0
                        _still_running_status = _gen_status_l in ("querying", "generating", "pending", "running", "")
                        _should_ghost_check = (
                            submit_id
                            and _elapsed >= _JIMENG_STRONG_GHOST_MIN_SECONDS
                            and _still_running_status
                            and _queue_info_empty
                        )
                        if _should_ghost_check:
                            _miss = _JIMENG_GHOST_MISS_COUNTS.get(str(submit_id), 0) + 1
                            _JIMENG_GHOST_MISS_COUNTS[str(submit_id)] = _miss
                            logger.warning(
                                f"[poll-status] 分镜 {sid} submit_id={submit_id} 已 querying {int(_elapsed)}s,"
                                f"且 query_result.queue_info 连续为空 {_miss}/{_JIMENG_GHOST_MISS_LIMIT}"
                            )
                            if _miss >= _JIMENG_GHOST_MISS_LIMIT:
                                _JIMENG_GHOST_MISS_COUNTS.pop(str(submit_id), None)
                                _ghost_msg = (
                                    "即梦 CLI 返回了任务ID,但超过6小时仍无远端队列信息(queue_info为空)。"
                                    "这通常是本机即梦 CLI 本地库残留幽灵任务导致,已释放本地生成状态,请重新生成。"
                                )
                                await storyboard_service.update_video_status(sid, "failed", fail_reason=_ghost_msg)
                                await _finalize_video_log_error(
                                    storyboard_id=sid,
                                    submit_id=submit_id,
                                    fail_reason=_ghost_msg,
                                )
                                results.append({
                                    "id": sid,
                                    "video_status": "failed",
                                    "video_url": None,
                                    "fail_reason": _ghost_msg,
                                })
                                continue
                        else:
                            _JIMENG_GHOST_MISS_COUNTS.pop(str(submit_id), None)
                    except Exception as _ghost_err:
                        logger.debug(f"[poll-status] 即梦幽灵任务反查跳过 sb={sid}: {_ghost_err}")
                    results.append({
                        "id": sid, 
                        "video_status": "generating", 
                        "video_url": None,
                        "gen_status": gen_status,
                        "queue_idx": queue_info.get("queue_idx"),
                        "queue_status": queue_info.get("queue_status"),
                        "fail_reason": None
                    })
            else:
                error_msg = query_result.get("error", "未知错误")
                logger.error(f"[poll-status] 分镜 {sid} 查询失败: {error_msg}")
                results.append({"id": sid, "video_status": "generating", "video_url": None, "error": error_msg})
    finally:
        # v3.61.30: 释放 inflight 标记
        for _pid in process_ids:
            _POLL_INFLIGHT.discard(_pid)
        await db.close()

    # ★ 2026-04 增强:批量补充 last_frame_path / extra_reference_image / extra_reference_desc
    # 让前端能拿到最新的尾帧 + 下一镜的 extra_reference(自动接帧后的内容)
    # 不补这几个字段的话,前端 storyboards.value 里这些值是页面加载时的旧值,
    # 视频生成完后用户看不到新的尾帧缩略图,也看不到下一镜的 extra_reference 已被自动写入。
    if results:
        try:
            id_to_idx = {r["id"]: i for i, r in enumerate(results) if "id" in r}
            db2 = await get_db()
            try:
                placeholders = ",".join("?" * len(id_to_idx))
                async with db2.execute(
                    f"SELECT id, last_frame_path, extra_reference_image, extra_reference_desc "
                    f"FROM storyboards WHERE id IN ({placeholders})",
                    list(id_to_idx.keys())
                ) as _cur:
                    async for row in _cur:
                        if row["id"] in id_to_idx:
                            r = results[id_to_idx[row["id"]]]
                            r["last_frame_path"] = row["last_frame_path"]
                            r["extra_reference_image"] = row["extra_reference_image"]
                            r["extra_reference_desc"] = row["extra_reference_desc"]
            finally:
                await db2.close()
        except Exception as e:
            logger.warning(f"[poll-status] 补充 last_frame/extra_reference 字段失败(不影响主流程): {e}")

    return {"success": True, "results": results}


# ============ 额外参考图接口 ============

@router.post("/storyboard/{storyboard_id}/extra-reference")
async def upload_extra_reference(
    storyboard_id: int,
    file: UploadFile = File(...),
    desc: Optional[str] = Form(default=None)
):
    """上传额外参考图"""
    # 检查分镜是否存在
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM storyboards WHERE id = ?", (storyboard_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="分镜不存在")

        # 检查文件类型
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="只支持图片文件")

        # 生成文件名并保存
        ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
        filename = f"extra_ref_{storyboard_id}_{uuid.uuid4().hex[:8]}{ext}"
        images_dir = media_subdir("images")
        os.makedirs(images_dir, exist_ok=True)
        file_path = os.path.join(images_dir, filename)

        # 异步保存文件
        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)

        # v3.61.32: 按设置开关给上传的参考图打"此图由AI生成"水印
        # 跟生图(信息提取页) 一致 — 给即梦合规标识降低拒绝率
        # 注意:这里直接覆盖原文件;用户原文件本身在自己电脑里有,工具内只保留水印版
        # v3.61.46: 撤回彩铅(效果不好);走生图 watermark 开关
        try:
            from services.settings_service import (
                SettingsService,
                KEY_IMAGE_WATERMARK_ENABLED,
                KEY_IMAGE_WATERMARK_FACE_ENABLED,
            )
            if await SettingsService.get_bool(KEY_IMAGE_WATERMARK_ENABLED, default=False):
                from services.watermark_service import add_ai_watermark
                face_mode = await SettingsService.get_bool(KEY_IMAGE_WATERMARK_FACE_ENABLED, default=False)
                add_ai_watermark(file_path, face_mode=face_mode)
                logger.info(f"分镜 {storyboard_id} 额外参考图已加 AI 水印 (face_mode={face_mode})")
        except Exception as _wm_err:
            logger.warning(f"分镜 {storyboard_id} 额外参考图加水印失败(忽略): {_wm_err}")

        # 更新数据库
        image_url = f"/data/images/{filename}"
        await db.execute(
            "UPDATE storyboards SET extra_reference_image = ?, extra_reference_desc = ? WHERE id = ?",
            (image_url, desc or "", storyboard_id)
        )
        await db.commit()

        logger.info(f"分镜 {storyboard_id} 上传额外参考图成功: {image_url}")
        return {
            "success": True,
            "image_url": image_url,
            "desc": desc or "",
            "message": "上传成功"
        }
    finally:
        await db.close()


@router.delete("/storyboard/{storyboard_id}/extra-reference")
async def delete_extra_reference(storyboard_id: int):
    """删除额外参考图"""
    db = await get_db()
    try:
        # 获取当前图片路径
        cursor = await db.execute(
            "SELECT extra_reference_image FROM storyboards WHERE id = ?", (storyboard_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="分镜不存在")

        old_image = row["extra_reference_image"]
        if old_image:
            # 删除本地文件
            base_dir = os.path.dirname(os.path.dirname(__file__))
            file_path = os.path.join(base_dir, old_image.lstrip("/").replace("/", os.sep))
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"已删除额外参考图文件: {file_path}")

        # 清空数据库字段
        await db.execute(
            "UPDATE storyboards SET extra_reference_image = NULL, extra_reference_desc = NULL WHERE id = ?",
            (storyboard_id,)
        )
        await db.commit()

        return {"success": True, "message": "删除成功"}
    finally:
        await db.close()


class CaptureLastFrameRequest(BaseModel):
    capture_time: float

    @field_validator("capture_time")
    @classmethod
    def validate_capture_time(cls, value: float) -> float:
        if value < 0:
            raise ValueError("capture_time 必须大于等于 0")
        return value


@router.post("/storyboard/{storyboard_id}/last-frame-capture")
async def capture_custom_last_frame(storyboard_id: int, request: CaptureLastFrameRequest):
    """按用户选择的时间点重新截取该分镜尾帧。"""
    try:
        return await storyboard_service.capture_custom_last_frame(
            storyboard_id,
            request.capture_time,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/storyboard/{storyboard_id}/last-frame-download")
async def download_last_frame(storyboard_id: int):
    """v3.61.32: 下载尾帧 — 永远返回无水印的原图
    优先用 last_frame_orig_path(新逻辑双文件版),没有则 fallback 用 last_frame_path
    (老数据,可能带水印 — 用户重新生成视频后 orig 字段就有了)
    """
    from fastapi.responses import FileResponse
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT last_frame_path, last_frame_orig_path FROM storyboards WHERE id = ?",
            (storyboard_id,)
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "分镜不存在")
        # 优先无水印原图,fallback 展示版
        rel = row["last_frame_orig_path"] or row["last_frame_path"]
        if not rel:
            raise HTTPException(404, "该分镜还没生成尾帧")
        abs_path = resolve_db_path(rel)
        if not abs_path or not os.path.exists(abs_path):
            raise HTTPException(404, f"尾帧文件不存在: {rel}")
        # 用 attachment 让浏览器走下载
        out_name = f"storyboard_{storyboard_id}_last.jpg"
        return FileResponse(abs_path, media_type="image/jpeg", filename=out_name)
    finally:
        await db.close()


# v3.61.49: 把现有尾帧后处理成"彩铅风格" — 用图片模型 image2image 改造
class StylizeLastFrameRequest(BaseModel):
    config_id: int                                # 用户选的 image config(因为不同模型效果/价格不同)
    style: Optional[str] = "pencil"               # 风格 key,目前只支持 pencil(彩铅);后续可扩展 watercolor / illustration
    custom_prompt: Optional[str] = None           # 用户自己想覆盖默认 prompt 时传


# v3.61.61 极简版:
#   reference 给 image 模型 + prompt = "转彩铅风格" 就完事(同信息提取页角色生图最简流程)
#   废弃 v3.61.49~v3.61.60 各种花式方案(LLM 看图描述、storyboard description 拼接、长风格描述、方括号 meta 块)
#   理由:用户实测信息提取页 5 字描述 + reference 能稳定出彩铅,这边就用同款,不再过度工程


@router.post("/storyboard/{storyboard_id}/last-frame-stylize")
async def stylize_last_frame(storyboard_id: int, request: StylizeLastFrameRequest):
    """v3.61.49: 把分镜尾帧用 image2image 转成指定风格(默认彩铅)。
    流程:
      1. 拿当前 storyboard 的 last_frame_orig_path(干净原图;若无则用 last_frame_path)做参考
      2. 调 ImageService.generate_image — 它内部已封装各 provider 的 reference 协议
      3. 成功 → 把生成的新图覆盖到 last_frame_path(展示版),orig 保留不动
         之后用户提交视频时,即梦/方舟拿到的 reference 就是彩铅版尾帧
      4. 失败 → 不动任何文件,返回错误
    """
    from services.image_service import ImageService
    from services import cloud_llm_sync
    import shutil as _shutil

    # 1. 校验 storyboard + 尾帧存在
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, last_frame_path, last_frame_orig_path FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        raise HTTPException(404, "分镜不存在")
    # v3.61.61: reference 直接用 last_frame_path —— 前端 chain prev 显示的就是这张,
    #   "用户看到啥就转啥",最直观无歧义
    src_rel = row["last_frame_path"] or row["last_frame_orig_path"]
    if not src_rel:
        raise HTTPException(400, "该分镜还没有尾帧,请先生成视频")
    src_abs = resolve_db_path(src_rel)
    if not src_abs or not os.path.exists(src_abs):
        raise HTTPException(404, f"尾帧文件磁盘上不存在: {src_rel}")

    # ⭐ v3.61.52 关键修复: 如果 last_frame_orig_path 为空(老视频在 v3.61.32 双文件方案前生成),
    #    先把 last_frame_path 当前文件**备份成 orig**,这样转彩铅覆盖 last_frame_path 后,
    #    用户点"恢复原图"还能从 orig 拿回真实原图。
    #    没这一步的话: orig=NULL, 转彩铅覆盖 last_frame_path → 真实原图永久丢失,恢复无效。
    if not row["last_frame_orig_path"] and row["last_frame_path"]:
        try:
            from utils.paths import get_data_dir
            data_dir = get_data_dir()
            frames_dir = os.path.join(data_dir, 'frames')
            os.makedirs(frames_dir, exist_ok=True)
            orig_filename = f'storyboard_{storyboard_id}_last_orig.jpg'
            orig_abs = os.path.join(frames_dir, orig_filename)
            if not os.path.exists(orig_abs):
                _shutil.copyfile(src_abs, orig_abs)
                logger.info(f"[stylize-lastframe] sb={storyboard_id} 老视频补救:已备份原始尾帧到 {orig_abs}")
            # 写回 DB
            orig_rel = f'/data/frames/{orig_filename}'
            _db = await get_db()
            try:
                await _db.execute(
                    "UPDATE storyboards SET last_frame_orig_path = ? WHERE id = ?",
                    (orig_rel, storyboard_id),
                )
                await _db.commit()
            finally:
                await _db.close()
        except Exception as _bk_err:
            logger.warning(f"[stylize-lastframe] sb={storyboard_id} 备份原始尾帧失败(继续转彩铅,但不可恢复): {_bk_err}")

    # 2. 校验 image config 可用
    cfg = await cloud_llm_sync.get_active_config(config_id=request.config_id, config_type="image")
    if not cfg:
        raise HTTPException(404, f"image config_id={request.config_id} 不存在或不可用")
    # v3.61.52: gpt-image-2 系列对 image2image 不稳(中转那边常拒/超时/出图不像),日志警告
    _model_lower = (cfg.get("modelName") or "").lower()
    if "gpt" in _model_lower and ("image" in _model_lower or "_2" in _model_lower):
        logger.warning(f"[stylize-lastframe] sb={storyboard_id} 警告:gpt-image-2 系列对 image2image 不稳,建议换 Seedream / nano-banana / Doubao image-edit")

    # 3. 生成 prompt
    # v3.61.61 极简版:用户明确要求 — reference 给图片大模型,prompt 就 5 字"转彩铅风格",完事
    #   废弃所有花式方案(LLM 描述、storyboard description 拼接、长风格描述)
    #   理由:跟"信息提取页角色生图"同款最简流程,reference 让 image 模型"画啥",
    #         "转彩铅风格"让模型"咋画",cool LOCK 锚点 / 各 provider 自己的 reference 协议会兜底
    prompt = request.custom_prompt or "转彩铅风格"

    # 4. 调 ImageService — 它内部按 api_style/provider_code 自动路由不同 provider 的 reference 协议
    #    (用户接的图片模型参考图模式不一样,ImageService 已封装这些差异)
    # v3.61.50: 加详细诊断
    # v3.61.51: 把尾帧从 frames 目录复制一份到 images 目录,用 images 那份做 reference
    #          (经实测部分 provider 的 _get_image_base64 对 /data/frames/ 路径处理不稳,
    #          复制到 /data/images/ 这个 ImageService 100% 能处理的目录最稳)
    _src_size = 0
    try:
        _src_size = os.path.getsize(src_abs)
    except Exception:
        pass
    logger.info(
        f"[stylize-lastframe] sb={storyboard_id} src_rel={src_rel} src_abs={src_abs} src_size={_src_size}B "
        f"config_id={request.config_id} config_name={cfg.get('name')} model={cfg.get('modelName')} "
        f"provider_code={cfg.get('providerCode')} style={request.style}"
    )
    if _src_size < 100:
        return {"success": False, "message": f"参考图文件异常(大小 {_src_size}B,可能没真正生成)"}

    # 复制到 images 目录
    images_dir = media_subdir("images")
    os.makedirs(images_dir, exist_ok=True)
    _ext = os.path.splitext(src_abs)[1] or ".jpg"
    tmp_ref_name = f"stylize_ref_{storyboard_id}_{uuid.uuid4().hex[:8]}{_ext}"
    tmp_ref_abs = os.path.join(images_dir, tmp_ref_name)
    tmp_ref_rel = f"/data/images/{tmp_ref_name}"
    try:
        _shutil.copyfile(src_abs, tmp_ref_abs)
        logger.info(f"[stylize-lastframe] sb={storyboard_id} 临时参考图已就位: {tmp_ref_rel}")
    except Exception as _cp_err:
        logger.warning(f"[stylize-lastframe] 复制参考图失败,fallback 用原 frames 路径: {_cp_err}")
        tmp_ref_rel = src_rel
        tmp_ref_abs = None

    try:
        result = await ImageService.generate_image(
            config_id=request.config_id,
            prompt=prompt,
            element_id=None,        # 不关联 element
            element_type=None,
            novel_id=None,
            reference_image_path=tmp_ref_rel,
        )
    except Exception as e:
        logger.exception(f"[stylize-lastframe] sb={storyboard_id} 异常: {e}")
        return {"success": False, "message": f"生成异常: {e}"}
    finally:
        # 清理临时参考图
        if tmp_ref_abs and os.path.exists(tmp_ref_abs):
            try: os.remove(tmp_ref_abs)
            except Exception: pass
    logger.info(f"[stylize-lastframe] sb={storyboard_id} ImageService 返回: success={result.get('success')} url={result.get('image_url')} msg={result.get('message')}")

    if not result.get("success"):
        # ⚠️ 失败保留原文件不动
        return {"success": False, "message": result.get("message", "图片模型返回失败")}

    new_url = result.get("image_url")  # data/images/xxx.png 或 /data/images/xxx.png
    if not new_url:
        return {"success": False, "message": "图片模型未返回 image_url"}
    new_abs = resolve_db_path(new_url)
    if not new_abs or not os.path.exists(new_abs):
        return {"success": False, "message": f"模型说成功但文件不存在: {new_url}"}

    # 5. 覆盖 last_frame_path 文件 (用 copy 而不是 rename — 保留生成的源图在 images/ 下,以防用户重转)
    dst_rel = row["last_frame_path"]
    if not dst_rel:
        # 老数据可能 last_frame_path 没设,这种情况直接把新图作为 last_frame_path
        dst_rel = new_url if new_url.startswith("/") else "/" + new_url
        try:
            db = await get_db()
            try:
                await db.execute(
                    "UPDATE storyboards SET last_frame_path = ? WHERE id = ?",
                    (dst_rel, storyboard_id),
                )
                await db.commit()
            finally:
                await db.close()
        except Exception as _db_err:
            logger.warning(f"[stylize-lastframe] 写 last_frame_path 失败: {_db_err}")
    else:
        dst_abs = resolve_db_path(dst_rel)
        if not dst_abs:
            return {"success": False, "message": f"无法解析 last_frame_path: {dst_rel}"}
        try:
            os.makedirs(os.path.dirname(dst_abs), exist_ok=True)
            _shutil.copyfile(new_abs, dst_abs)
            logger.info(f"[stylize-lastframe] sb={storyboard_id} 已覆盖展示版尾帧: {dst_abs}")
        except Exception as e:
            logger.exception(f"[stylize-lastframe] 覆盖失败: {e}")
            return {"success": False, "message": f"覆盖尾帧失败: {e}"}

    return {
        "success": True,
        "message": f"已应用{request.style}风格,提交视频时将使用此尾帧",
        "last_frame_path": dst_rel,
        "model": cfg.get("name"),
    }


@router.post("/storyboard/{storyboard_id}/last-frame-restore-orig")
async def restore_last_frame_orig(storyboard_id: int):
    """v3.61.49: 恢复尾帧到无水印原图(撤销彩铅/水印等后处理)
    把 last_frame_orig_path 文件复制覆盖 last_frame_path
    """
    import shutil as _shutil
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT last_frame_path, last_frame_orig_path FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        raise HTTPException(404, "分镜不存在")
    if not row["last_frame_orig_path"]:
        return {"success": False, "message": "该尾帧没有保留干净原图(可能是老数据);请重新生成视频"}
    if not row["last_frame_path"]:
        return {"success": False, "message": "尾帧路径异常"}
    src_abs = resolve_db_path(row["last_frame_orig_path"])
    dst_abs = resolve_db_path(row["last_frame_path"])
    if not src_abs or not os.path.exists(src_abs):
        return {"success": False, "message": "原图文件不存在"}
    if not dst_abs:
        return {"success": False, "message": "无法解析展示版路径"}
    try:
        _shutil.copyfile(src_abs, dst_abs)
        logger.info(f"[restore-lastframe-orig] sb={storyboard_id} 已恢复展示版到原图")
        return {"success": True, "message": "已恢复无水印原图"}
    except Exception as e:
        logger.exception(f"[restore-lastframe-orig] 失败: {e}")
        return {"success": False, "message": f"恢复失败: {e}"}


class UpdateExtraRefDescRequest(BaseModel):
    desc: str


class UpdateTopviewPromptsRequest(BaseModel):
    start_prompt: Optional[str] = None
    end_prompt: Optional[str] = None


@router.put("/storyboard/{storyboard_id}/extra-reference-desc")
async def update_extra_reference_desc(storyboard_id: int, request: UpdateExtraRefDescRequest):
    """更新额外参考图描述"""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM storyboards WHERE id = ?", (storyboard_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="分镜不存在")

        await db.execute(
            "UPDATE storyboards SET extra_reference_desc = ? WHERE id = ?",
            (request.desc, storyboard_id)
        )
        await db.commit()

        return {"success": True, "message": "更新成功"}
    finally:
        await db.close()


@router.get("/storyboard/{storyboard_id}/topview-chain")
async def get_storyboard_topview_chain(storyboard_id: int):
    """返回当前分镜生成视频时会使用的俯视人物调度图链。

    prev_topview 只来自 find_chainable_prev_topview,即同一物理场景且文件存在的上一小节
    结尾俯视图;不会按列表顺序无脑展示。
    """
    prev = await find_chainable_prev_topview(storyboard_id)
    prev_public = None
    if prev:
        prev_public = {k: v for k, v in prev.items() if k != "abs_path"}
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, topview_image, topview_prompt, topview_start_prompt, topview_end_prompt "
            "FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="分镜不存在")
        start_prompt = (row["topview_start_prompt"] or "").strip() or DEFAULT_TOPVIEW_START_PROMPT
        end_prompt = (
            (row["topview_end_prompt"] or "").strip()
            or (row["topview_prompt"] or "").strip()
            or DEFAULT_TOPVIEW_END_PROMPT
        )
        return {
            "prev_topview": prev_public,
            "current_topview": {
                "storyboard_id": row["id"],
                "image_path": row["topview_image"],
            } if row["topview_image"] else None,
            "start_prompt": start_prompt,
            "end_prompt": end_prompt,
            "default_start_prompt": DEFAULT_TOPVIEW_START_PROMPT,
            "default_end_prompt": DEFAULT_TOPVIEW_END_PROMPT,
        }
    finally:
        await db.close()


@router.put("/storyboard/{storyboard_id}/topview-prompts")
async def update_topview_prompts(storyboard_id: int, request: UpdateTopviewPromptsRequest):
    """保存当前分镜的俯视人物调度图 A/B 说明。

    start_prompt 描述"上一节可接俯视图作为本镜开始 A";end_prompt 描述本镜 topview_image
    作为结束 B。旧字段 topview_prompt 同步写 B,保持兼容。
    """
    start_prompt = (request.start_prompt or "").strip() or DEFAULT_TOPVIEW_START_PROMPT
    end_prompt = (request.end_prompt or "").strip() or DEFAULT_TOPVIEW_END_PROMPT
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id FROM storyboards WHERE id = ?", (storyboard_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="分镜不存在")
        await db.execute(
            "UPDATE storyboards SET topview_start_prompt = ?, topview_end_prompt = ?, topview_prompt = ? WHERE id = ?",
            (start_prompt, end_prompt, end_prompt, storyboard_id),
        )
        await db.commit()
        return {
            "success": True,
            "start_prompt": start_prompt,
            "end_prompt": end_prompt,
            "message": "更新成功",
        }
    finally:
        await db.close()


class StopBatchRequest(BaseModel):
    storyboard_ids: List[int]


@router.post("/stop-batch")
async def stop_batch_video_generation(request: StopBatchRequest):
    """批量停止视频生成任务，将状态重置为pending"""
    storyboard_ids = request.storyboard_ids
    count = 0
    for sid in storyboard_ids:
        result = await storyboard_service.update_video_status(sid, "pending")
        if result:
            count += 1
    logger.info(f"批量停止: {count}/{len(storyboard_ids)} 个分镜状态已重置为pending")
    return {"success": True, "count": count}


class MarkQueuedRequest(BaseModel):
    """串行批次开始时把后续镜标记为 queued(等待中)的请求体"""
    storyboard_ids: List[int]


@router.post("/mark-queued")
async def mark_queued(request: MarkQueuedRequest):
    """把指定 storyboard_ids 的 video_status 在 DB 里改为 'queued'(等待中)。
    用于串行批次开始时,前端调一次让后续镜在 DB 里也持久化为 queued,
    刷新页面后 loadStoryboards 拉回来仍是 queued,UI 显示「等待中」。
    清掉 video_fail_reason / submit_id 避免 UI 残留旧失败信息。
    """
    if not request.storyboard_ids:
        return {"success": False, "message": "storyboard_ids 为空"}
    db = await get_db()
    try:
        placeholders = ",".join("?" * len(request.storyboard_ids))
        await db.execute(
            f"UPDATE storyboards SET video_status = 'queued', "
            f"  video_fail_reason = NULL, submit_id = NULL, video_submit_time = ? "
            f"WHERE id IN ({placeholders})",
            [now_beijing_str(), *request.storyboard_ids],
        )
        await db.commit()
        logger.info(f"[mark-queued] 已把 {len(request.storyboard_ids)} 个分镜置为 queued: {request.storyboard_ids}")
        return {"success": True, "count": len(request.storyboard_ids)}
    finally:
        await db.close()


@router.get("/storyboard/{storyboard_id}/speakers")
async def get_storyboard_speakers(storyboard_id: int):
    """v3.61.132: 从分镜 prompt 抽出"说话人"列表(台词/内心OS/画外音 字段里出现的角色名)
    前端用来在"关联人物"卡片上标识哪些角色在本节有台词。
    """
    db = await get_db()
    try:
        cur = await db.execute("SELECT prompt FROM storyboards WHERE id = ?", (storyboard_id,))
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        raise HTTPException(status_code=404, detail="分镜不存在")
    prompt = row["prompt"] or ""
    speakers = _extract_speakers_from_prompt(prompt)
    return {"speakers": sorted(speakers)}


class ApplyAutoFilterRequest(BaseModel):
    storyboard_ids: List[int]


@router.post("/apply-auto-filter")
async def apply_auto_filter_batch(req: ApplyAutoFilterRequest):
    """v3.61.136: 批量触发种菜模式自动屏蔽 — 前端预检前调一次,让自动屏蔽真正"自动"

    流程:
        1. 设置页开关关 → 全部跳过(返回 applied=[])
        2. 开关开 → 对每个 sb_id 调 _apply_speaker_filter_to_storyboard
        3. 返回每个 sb 的最新 (manual, auto, total_excluded) 集合,前端拿来更新 UI
    """
    try:
        from services.settings_service import SettingsService, KEY_AUDIO_AUTO_SPEAKER_FILTER
        on = await SettingsService.get_bool(KEY_AUDIO_AUTO_SPEAKER_FILTER, default=False)
    except Exception:
        on = False
    if not on:
        return {"enabled": False, "applied": []}

    applied = []
    db = await get_db()
    try:
        for sb_id in req.storyboard_ids:
            try:
                cur = await db.execute("SELECT prompt FROM storyboards WHERE id = ?", (sb_id,))
                row = await cur.fetchone()
                if not row:
                    continue
                prompt = row["prompt"] or ""
            except Exception:
                continue
            # helper 内部独立 DB conn,这里 await 它
            try:
                total = await _apply_speaker_filter_to_storyboard(sb_id, prompt)
                # 回读最新 manual + auto 给前端
                cur2 = await db.execute(
                    "SELECT excluded_audios, auto_excluded_audios FROM storyboards WHERE id = ?", (sb_id,)
                )
                row2 = await cur2.fetchone()
                try:
                    manual = json.loads(row2["excluded_audios"] or "[]") if row2 else []
                    auto = json.loads(row2["auto_excluded_audios"] or "[]") if row2 else []
                except Exception:
                    manual, auto = [], []
                applied.append({
                    "storyboard_id": sb_id,
                    "manual_excluded": manual,
                    "auto_excluded": auto,
                    "total_excluded": sorted(set(manual) | set(auto)),
                })
            except Exception as e:
                logger.warning(f"[apply-auto-filter] sb={sb_id} 失败: {e}")
    finally:
        await db.close()

    return {"enabled": True, "applied": applied}


@router.get("/storyboard/{storyboard_id}/chain-prev")
async def get_storyboard_chain_prev(storyboard_id: int):
    """获取当前分镜可接的上一镜尾帧信息(供前端"上一镜尾帧"区域显示)。
    返回 {"chain_prev": {...} 或 null, "default_desc": "..."}
    chain_prev 为 null 表示没有可接的上镜(首镜 / 跨场景 / 上镜未生成 / 上镜没尾帧)。
    """
    prev = await find_chainable_prev_frame(storyboard_id)
    return {
        "chain_prev": prev,
        "default_desc": DEFAULT_CHAIN_FRAME_DESC,
    }


# ============================================================
# v3.61.100: 火山方舟视频任务修复工具
# ============================================================
#
# 用户痛点:火山那边已经成功生成 + 扣费,但本地一直显示"生成中"。
# 原因:轮询断/进程死/30 分钟误判超时 → 本地 DB 状态没更新。
#
# 3 个工具:
# 1. POST /api/video/ark/force-sync — 用 submit_id 直接强查火山 + 下载视频(绕过 30 min 超时检测)
# 2. POST /api/video/ark/list-tasks  — 列火山账号下最近 N 个视频任务(用于"认领")
# 3. POST /api/video/ark/claim-by-task-id — 用 task_id 强认领并下载到指定分镜


class ArkForceSyncRequest(BaseModel):
    storyboard_id: int
    local_api_key: Optional[str] = None  # v3.61.107: 企业本地 APIKey


@router.post("/ark/force-sync")
async def ark_force_sync(req: ArkForceSyncRequest):
    """强同步火山方舟分镜状态(绕过 30 min 超时检测,绕过 video_status 短路逻辑)

    流程:
      1. 拉分镜 submit_id + provider
      2. 直接调 _poll_storyboard_via_ark(已含 query + 下载逻辑)
      3. 返回最终结果
    """
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, submit_id, video_status, video_provider FROM storyboards WHERE id=?",
            (req.storyboard_id,)
        )
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"分镜 id={req.storyboard_id} 不存在")
    if not row["submit_id"]:
        raise HTTPException(status_code=400, detail="该分镜没有 submit_id,无法同步")
    provider = (row["video_provider"] if "video_provider" in row.keys() else None) or "jimeng"
    if provider not in UNIFIED_VIDEO_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"该分镜 provider={provider},不是可强同步的视频 provider({UNIFIED_VIDEO_PROVIDERS})",
        )

    logger.info(f"[ark/force-sync] 强同步 sb={req.storyboard_id} provider={provider} submit_id={row['submit_id']}")
    # _poll_storyboard_via_ark alias 内部已经自动读 storyboards.video_provider 真值分流
    result = await _poll_storyboard_via_ark(req.storyboard_id, row["submit_id"], local_api_key=req.local_api_key)
    return result


class ArkSyncAllPendingRequest(BaseModel):
    novel_id: Optional[int] = None
    script_id: Optional[int] = None
    provider: Optional[str] = None  # v3.61.308: 可按当前渠道过滤(pippit_cli/cool/xinglian/volcengine_ark)
    local_api_key: Optional[str] = None  # v3.61.107: 企业本地 APIKey


@router.post("/ark/sync-all-pending")
async def ark_sync_all_pending(req: ArkSyncAllPendingRequest = None):
    """v3.61.100 + v3.61.169 + 173: 一键同步本地所有统一 provider generating 状态的分镜

    用户不用输入 task_id,后端自动:
      1. 查所有 video_provider IN UNIFIED_VIDEO_PROVIDERS AND video_status='generating' AND submit_id IS NOT NULL 的分镜
      2. 对每条调 _poll_storyboard_via_ark(alias 会按 storyboards.video_provider 真值分流)
      3. 返回修复报告:成功转 done 几个 / 失败几个 / 仍在跑几个
    """
    if req is None:
        req = ArkSyncAllPendingRequest()
    novel_id = req.novel_id
    script_id = req.script_id
    local_api_key = req.local_api_key
    provider_filter = (req.provider or "").strip().lower()
    if provider_filter and provider_filter not in UNIFIED_VIDEO_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"不支持同步该视频渠道: {provider_filter}")
    sql = "SELECT id, submit_id, scene_index, section_number, video_provider FROM storyboards WHERE "
    if provider_filter:
        sql += "video_provider = ? AND video_status='generating' AND submit_id IS NOT NULL AND submit_id != ''"
        params: List[Any] = [provider_filter]
    else:
        sql += (
            f"video_provider IN ({','.join(['?'] * len(UNIFIED_VIDEO_PROVIDERS))}) AND video_status='generating' "
            "AND submit_id IS NOT NULL AND submit_id != ''"
        )
        params = list(UNIFIED_VIDEO_PROVIDERS)
    if novel_id is not None:
        sql += " AND novel_id=?"
        params.append(novel_id)
    if script_id is not None:
        sql += " AND script_id=?"
        params.append(script_id)
    sql += " ORDER BY id DESC LIMIT 200"

    db = await get_db()
    try:
        cur = await db.execute(sql, params)
        rows = await cur.fetchall()
    finally:
        await db.close()

    if not rows:
        return {
            "success": True,
            "total_pending": 0,
            "done": 0,
            "still_generating": 0,
            "failed": 0,
            "message": "本地没有「生成中」的可同步视频任务,无需同步",
            "items": [],
        }

    done_cnt = 0
    still_cnt = 0
    failed_cnt = 0
    items_report = []
    for r in rows:
        sid = r["id"]
        submit_id = r["submit_id"]
        label = f"#{r['scene_index']}-{r['section_number']}"
        try:
            res = await _poll_storyboard_via_ark(sid, submit_id, local_api_key=local_api_key)
            status = res.get("video_status", "")
            if status == "done":
                done_cnt += 1
            elif status == "failed":
                failed_cnt += 1
            else:
                still_cnt += 1
            items_report.append({
                "storyboard_id": sid,
                "label": label,
                "submit_id": submit_id,
                "result_status": status,
                "video_url": res.get("video_url"),
                "fail_reason": res.get("fail_reason"),
            })
        except Exception as e:
            failed_cnt += 1
            items_report.append({
                "storyboard_id": sid,
                "label": label,
                "submit_id": submit_id,
                "result_status": "error",
                "error": str(e),
            })

    return {
        "success": True,
        "total_pending": len(rows),
        "done": done_cnt,
        "still_generating": still_cnt,
        "failed": failed_cnt,
        "message": f"同步完成: {done_cnt} 个已下载完成,{still_cnt} 个仍在跑,{failed_cnt} 个失败",
        "items": items_report,
    }


class ArkListTasksRequest(BaseModel):
    page_size: int = 20
    config_id: Optional[int] = None


@router.post("/ark/list-tasks")
async def ark_list_tasks(req: ArkListTasksRequest):
    """列火山方舟账号下最近的视频任务(用于"认领"已生成但本地状态丢失的任务)"""
    from services.video_providers import get_provider
    from services.cloud_llm_sync import get_active_config

    try:
        cloud_cfg = await get_active_config(config_id=req.config_id, config_type="video")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"拉取火山方舟配置失败: {e}")
    if not cloud_cfg:
        raise HTTPException(status_code=400, detail="没有可用的火山方舟视频配置")

    provider = get_provider("volcengine_ark", {
        "id": cloud_cfg.get("id"),
        "base_url": cloud_cfg.get("baseUrl"),
        "api_key": cloud_cfg.get("apiKey"),
        "model_name": cloud_cfg.get("modelName"),
        "extra_params": cloud_cfg.get("extraParams") or {},
    })

    # ark provider 已有 list_active 方法,扩展查更多状态
    try:
        tasks = await provider.list_active()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询火山任务列表失败: {e}")

    # 跟本地 storyboards 关联:看哪些 task_id 已经在本地 DB 里
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, submit_id, video_status, scene_index, section_number FROM storyboards "
            "WHERE submit_id IS NOT NULL AND video_provider='volcengine_ark'"
        )
        local_rows = await cur.fetchall()
    finally:
        await db.close()
    local_map = {r["submit_id"]: dict(r) for r in local_rows}

    items = []
    for t in tasks[:req.page_size]:
        task_id = t.get("submit_id") or t.get("id")
        local = local_map.get(task_id)
        items.append({
            "task_id": task_id,
            "status": t.get("status", ""),
            "created_at": t.get("created_at"),
            "local_storyboard_id": local["id"] if local else None,
            "local_status": local["video_status"] if local else None,
            "local_label": (f"#{local['scene_index']}-{local['section_number']}"
                           if local else None),
        })
    return {"items": items, "total": len(items)}


class ArkClaimRequest(BaseModel):
    storyboard_id: int
    task_id: str
    local_api_key: Optional[str] = None  # v3.61.107: 企业本地 APIKey
    # v3.61.171: 显式指定本次认领用哪份配置(可选);不传则清掉旧的 video_config_id 避免残留
    config_id: Optional[int] = None
    # v3.61.173: 认领时指定真实 provider(volcengine_ark / cool / xinglian)
    #   None 兼容旧调用 → 默认 volcengine_ark
    provider: Optional[str] = None


# v3.61.173: claim 接口允许写入的 provider 白名单
_CLAIM_ALLOWED_PROVIDERS = UNIFIED_VIDEO_PROVIDERS


@router.post("/ark/claim-by-task-id")
async def ark_claim_by_task_id(req: ArkClaimRequest):
    """用 task_id 强认领某分镜:写入 submit_id + 立刻强同步状态 + 下载视频

    v3.61.173: provider 字段可选,允许 volcengine_ark / cool / xinglian,
               不传默认 volcengine_ark(兼容旧调用)
    """
    if not req.task_id or not req.task_id.strip():
        raise HTTPException(status_code=400, detail="task_id 不能为空")

    # v3.61.173: 校验 provider 白名单
    target_provider = (req.provider or "volcengine_ark").strip().lower()
    if target_provider not in _CLAIM_ALLOWED_PROVIDERS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"provider={req.provider!r} 不在认领白名单 {_CLAIM_ALLOWED_PROVIDERS},"
                "认领仅支持云端 HTTP provider"
            ),
        )

    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, submit_id FROM storyboards WHERE id=?",
            (req.storyboard_id,)
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"分镜 id={req.storyboard_id} 不存在")
        # 写 submit_id + provider
        # v3.61.171: 同步刷 video_config_id 避免历史 Cool/其他 provider 配置残留
        #   req.config_id 优先(用户显式指定);没传时清成 NULL,poll-status 兜底走老逻辑
        # v3.61.173: video_provider 按 req.provider 写真值(支持 xinglian),不再硬编码 volcengine_ark
        await db.execute(
            "UPDATE storyboards SET submit_id=?, video_provider=?, "
            "video_status='generating', video_submit_time=COALESCE(video_submit_time, datetime('now', '+8 hours')), "
            "video_config_id=? "
            "WHERE id=?",
            (req.task_id.strip(), target_provider, req.config_id, req.storyboard_id)
        )
        await db.commit()
    finally:
        await db.close()

    logger.info(f"[ark/claim] 认领 sb={req.storyboard_id} task_id={req.task_id} provider={target_provider}")
    # 立刻强同步
    result = await _poll_storyboard_via_ark(req.storyboard_id, req.task_id.strip(), local_api_key=req.local_api_key)
    return result
