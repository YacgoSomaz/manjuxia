import json
import os
import re
import asyncio
import random
import logging
import time
import aiosqlite
from typing import List, Dict, Any, Optional, Tuple
from database.db import get_db
from services.llm_service import LLMService
from services.script_service import ScriptService
from services.extraction_service import ExtractionService
from services.template_service import get_by_id as get_template_by_id
from services.utils import parse_storyboard_response
from utils.timezone import now_beijing_str
from utils.paths import resolve_db_path

logger = logging.getLogger(__name__)

# SQLite并发写入重试配置
DB_RETRY_MAX_ATTEMPTS = 5
DB_RETRY_BASE_DELAY = 0.1  # 100ms基础延迟
DB_RETRY_MAX_DELAY = 2.0  # 最大延迟2秒

# ============================================================================
# 全局异步任务追踪机制
# ============================================================================
# 用于追踪正在运行的分镜生成任务，支持在清空分镜时取消这些任务
# key格式: f"{novel_id}_{script_id}_{scene_index}"
# value: {"task": asyncio.Task, "start_time": float, "novel_id": int, "script_id": int}
_running_generation_tasks: Dict[str, Dict[str, Any]] = {}


def _get_task_key(novel_id: int, script_id: int, scene_index: int) -> str:
    """生成任务追踪的key"""
    return f"{novel_id}_{script_id}_{scene_index}"


def register_generation_task(novel_id: int, script_id: int, scene_index: int, task: asyncio.Task) -> str:
    """
    注册分镜生成任务到全局追踪字典
    
    Args:
        novel_id: 小说ID
        script_id: 剧本ID
        scene_index: 场景序号
        task: asyncio.Task 对象
        
    Returns:
        任务key
    """
    key = _get_task_key(novel_id, script_id, scene_index)
    _running_generation_tasks[key] = {
        "task": task,
        "start_time": time.time(),
        "novel_id": novel_id,
        "script_id": script_id,
        "scene_index": scene_index
    }
    logger.info(f"[task-tracker] 注册任务: key={key}, 当前活跃任务数={len(_running_generation_tasks)}")
    return key


def unregister_generation_task(key: str):
    """
    从全局追踪字典中移除任务
    
    Args:
        key: 任务key
    """
    if key in _running_generation_tasks:
        del _running_generation_tasks[key]
        logger.info(f"[task-tracker] 注销任务: key={key}, 当前活跃任务数={len(_running_generation_tasks)}")


async def cancel_generation_tasks(novel_id: int, script_id: int = None) -> int:
    """
    取消指定小说/章节的所有正在运行的生成任务
    
    Args:
        novel_id: 小说ID
        script_id: 剧本ID（可选，如果不指定则取消该小说所有任务）
        
    Returns:
        取消的任务数量
    """
    cancelled_count = 0
    keys_to_cancel = []
    
    for key, task_info in list(_running_generation_tasks.items()):
        if task_info["novel_id"] == novel_id:
            # 如果指定了script_id，只取消匹配的任务
            if script_id is None or task_info["script_id"] == script_id:
                keys_to_cancel.append(key)
    
    for key in keys_to_cancel:
        task_info = _running_generation_tasks[key]
        task = task_info["task"]
        
        if not task.done():
            logger.info(f"[task-tracker] 取消任务: key={key}, scene_index={task_info['scene_index']}")
            task.cancel()
            try:
                await task  # 等待任务真正取消
            except asyncio.CancelledError:
                pass
            cancelled_count += 1
        
        # 从追踪字典中移除
        del _running_generation_tasks[key]

    # v3.61.223: 取消任务后,把对应仍为 running 的分镜日志标成 error。
    #   asyncio 任务被 cancel 时抛 CancelledError,日志可能停留在 'running',
    #   导致 generation-status / checkRunningGenerations 误判"还在生成"(僵尸日志)。
    if cancelled_count > 0:
        try:
            db = await get_db()
            try:
                now = now_beijing_str()
                if script_id is None:
                    await db.execute(
                        "UPDATE llm_logs SET status='error', "
                        "error_message=COALESCE(error_message,'')||'(已手动中止生成)', end_time=? "
                        "WHERE status='running' AND source_type='storyboard' AND novel_id=?",
                        (now, novel_id)
                    )
                else:
                    await db.execute(
                        "UPDATE llm_logs SET status='error', "
                        "error_message=COALESCE(error_message,'')||'(已手动中止生成)', end_time=? "
                        "WHERE status='running' AND source_type='storyboard' AND novel_id=? AND source_id=?",
                        (now, novel_id, script_id)
                    )
                await db.commit()
            finally:
                await db.close()
        except Exception as _e:
            logger.warning(f"[task-tracker] 取消后清理 running 分镜日志失败(忽略): {_e}")

    logger.info(f"[task-tracker] 共取消 {cancelled_count} 个任务, 剩余活跃任务数={len(_running_generation_tasks)}")
    return cancelled_count


def get_running_task_count(novel_id: int = None, script_id: int = None) -> int:
    """
    获取正在运行的任务数量
    
    Args:
        novel_id: 小说ID（可选）
        script_id: 剧本ID（可选）
        
    Returns:
        任务数量
    """
    if novel_id is None:
        return len(_running_generation_tasks)
    
    count = 0
    for task_info in _running_generation_tasks.values():
        if task_info["novel_id"] == novel_id:
            if script_id is None or task_info["script_id"] == script_id:
                count += 1
    return count


async def db_execute_with_retry(db, query: str, params: tuple = (), max_retries: int = DB_RETRY_MAX_ATTEMPTS):
    """
    带重试的数据库执行函数，用于处理SQLite并发写入时的"database is locked"错误。
    
    使用指数退避+随机抖动策略，避免多个并发请求同时重试导致的冲突。
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            cursor = await db.execute(query, params)
            return cursor
        except aiosqlite.OperationalError as e:
            if "database is locked" in str(e) or "locked" in str(e).lower():
                last_error = e
                if attempt < max_retries - 1:
                    # 指数退避 + 随机抖动
                    delay = min(DB_RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 0.1), DB_RETRY_MAX_DELAY)
                    print(f"[WARN] Database locked, retry {attempt + 1}/{max_retries} after {delay:.3f}s")
                    await asyncio.sleep(delay)
                else:
                    raise  # 最后一次重试失败，抛出异常
            else:
                raise  # 非锁定错误，直接抛出
    raise last_error


async def db_commit_with_retry(db, max_retries: int = DB_RETRY_MAX_ATTEMPTS):
    """
    带重试的数据库commit函数。
    """
    last_error = None
    for attempt in range(max_retries):
        try:
            await db.commit()
            return
        except aiosqlite.OperationalError as e:
            if "database is locked" in str(e) or "locked" in str(e).lower():
                last_error = e
                if attempt < max_retries - 1:
                    delay = min(DB_RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 0.1), DB_RETRY_MAX_DELAY)
                    print(f"[WARN] Database locked on commit, retry {attempt + 1}/{max_retries} after {delay:.3f}s")
                    await asyncio.sleep(delay)
                else:
                    raise
            else:
                raise
    raise last_error


# ============================================================================
# 时辰/时间槽 变化检测(状态继承用)
# ============================================================================
# 需求(2026-06):时辰不一样 → 不继承上节状态(弱继承·只留伤势)。
#   兼容两套体系:用户剧本用「时辰」(子时/午时/黄昏…),别人可能用「时间」(日/夜/晨/昏)。
#   不写死时间词表 —— 场景标头格式统一为「内/外 地点 <时间>」,末尾 token 即时间槽,对两套都成立。
_TIMELINE_TAG_RE = re.compile(r'\[?\s*时间线\s*[:：][^\]\n]*\]?')


def _extract_time_slot(scene_str: Optional[str]) -> str:
    """从场景标头里取时间槽(时辰/时间)。取不到返回 ''。

    兼容两类标头:
      - 原始剧本场景头:「内 地点 日」→ 取末尾 token
      - 分镜节头:「内 地点 · 日 · 13秒 · 对峙」→ 取时长 token 前一个 token

    不写死 日/夜/子时 等词表,只利用"时长前一格就是时间槽"这个结构。
    """
    if not scene_str:
        return ''
    s = str(scene_str).strip()
    # 去掉 [时间线:回忆] 这类标签,避免误当成时间槽
    s = _TIMELINE_TAG_RE.sub('', s)
    s = s.strip().strip('【】[]()（）').strip()
    if not s:
        return ''
    toks = [t for t in re.split(r'[\s·・、,，/|]+', s) if t]
    for idx, tok in enumerate(toks):
        if re.fullmatch(r'\d+(?:\.\d+)?(?:秒|s|S)?', tok) or tok in {"秒", "s", "S"}:
            if idx > 0:
                return toks[idx - 1]
    return toks[-1] if toks else ''


def _time_slot_from_script(text: Optional[str]) -> str:
    """从剧本正文里取首个场景标头的时间槽。优先 【...】 标头,兜底首个非空行。"""
    if not text:
        return ''
    m = re.search(r'【([^】]{1,60})】', str(text))
    if m:
        slot = _extract_time_slot(m.group(1))
        if slot:
            return slot
    for line in str(text).splitlines():
        line = line.strip()
        if line:
            return _extract_time_slot(line)
    return ''


async def _detect_scene_boundary_break(
    novel_id: int,
    script_id: Optional[int],
    scene_index: Optional[int],
    section_number: int,
    scene_type: Optional[str],
    current_scene_name: Optional[str] = None,
) -> Tuple[bool, Optional[int], Optional[str]]:
    """判断当前节是否应断开强状态继承。

    scene_index 变化表示换场景,scene_type 变化表示主线/回忆/梦境等时间线切换。
    这两种情况都不能继承姿态/朝向/情绪/道具,最多只允许伤势弱继承。
    查询失败时保守处理:scene_index>0 视为断开,避免把上一场状态强灌进来。

    v3.61.250: 同名续场景(剧本里 (续N) 长场景)例外 —— 不算跨场景。
      根因:剧本里超长场景写成 `【内 大殿 夜】 ... 【内 大殿 夜】 (续2)`,
        (续N) 段被切成新的 scene_index,但 SCENE_PATTERN 只匹配【】内,
        section_info.scene 存的是去后缀的干净基名 → 上下节场景名完全相同。
      旧逻辑只比 scene_index 数值,把同名续场景误判为跨场景 → 弱继承,
        武侠 8 槽里除伤势外全被 description 重抽(2026-06-09 script148 实证)。
      修法:传入本节场景基名 current_scene_name,与上节 section_info.scene 比对;
        基名相同且 scene_type 相同 → 视为续场景,强继承不 break。
        时辰变化由上层 _detect_time_slot_change 独立处理,不受此例外影响。
    """
    cur_type = scene_type or "normal"
    if scene_index is None or not script_id:
        return False, None, None

    db = None
    try:
        db = await get_db()
        cursor = await db.execute(
            "SELECT scene_index, scene_type, section_info FROM storyboards "
            "WHERE novel_id=? AND script_id IS ? AND scene_index IS NOT NULL "
            "AND (scene_index < ? OR (scene_index = ? AND section_number < ?)) "
            "ORDER BY scene_index DESC, section_number DESC, sort_order DESC LIMIT 1",
            (novel_id, script_id, scene_index, scene_index, section_number)
        )
        row = await cursor.fetchone()
        if not row:
            return False, None, None

        prev_si = row["scene_index"]
        prev_type = row["scene_type"] or "normal"

        # v3.61.250: 同名续场景(剧本 (续N) 长场景软切)不算跨场景 → 强继承不 break。
        # 上节 section_info.scene 与本节 current_scene_name 都是去后缀基名,相等即续场景。
        # scene_type 必须也相同(回忆/梦境切换仍按跨界处理)。
        if current_scene_name and prev_type == cur_type:
            try:
                _prev_scene = (json.loads(row["section_info"]) or {}).get("scene", "") if row["section_info"] else ""
            except Exception:
                _prev_scene = ""
            if _prev_scene and _prev_scene == current_scene_name:
                logger.info(
                    f"[state-chain] 同名续场景(scene_index {prev_si}→{scene_index},"
                    f"场景名均='{current_scene_name}'),判为续场景强继承,不 break"
                )
                return False, prev_si, prev_type

        should_break = (prev_si != scene_index) or (prev_type != cur_type)
        return should_break, prev_si, prev_type
    except Exception as exc:
        fallback = scene_index > 0
        logger.warning(
            f"[state-chain] 跨场景/时间线检测失败: {exc}; "
            f"fallback_break={fallback}(scene_index={scene_index}, scene_type={cur_type})"
        )
        return fallback, None, None
    finally:
        if db is not None:
            try:
                await db.close()
            except Exception:
                pass


async def _detect_time_slot_change(
    novel_id: int,
    script_id: Optional[int],
    scene_index: Optional[int],
    section_number: int,
    scene_content: Optional[str],
) -> bool:
    """本节时辰/时间槽 != 紧邻的上一节 → True(触发"时辰变不继承")。

    Q2=A:只要时辰不同就触发,不限是否跨场景(与紧邻的上一节比,可同 scene_index)。
    任一侧取不到时间槽则不触发(避免无时间标头的剧本误判)。
    """
    try:
        if scene_index is None or not script_id:
            return False
        cur_slot = _time_slot_from_script(scene_content)
        if not cur_slot:
            return False
        db = await get_db()
        try:
            async with db.execute(
                "SELECT section_info FROM storyboards "
                "WHERE novel_id=? AND script_id IS ? AND scene_index IS NOT NULL "
                "AND (scene_index < ? OR (scene_index = ? AND section_number < ?)) "
                "ORDER BY scene_index DESC, section_number DESC, sort_order DESC LIMIT 1",
                (novel_id, script_id, scene_index, scene_index, section_number)
            ) as cur:
                row = await cur.fetchone()
        finally:
            await db.close()
        if not row or not row["section_info"]:
            return False
        try:
            prev_scene = (json.loads(row["section_info"]) or {}).get("scene", "")
        except Exception:
            prev_scene = ""
        prev_slot = _extract_time_slot(prev_scene)
        if not prev_slot:
            return False
        if cur_slot != prev_slot:
            logger.info(
                f"[state-chain] 时辰/时间变化: 上节='{prev_slot}' → 本节='{cur_slot}',"
                f"按'弱继承·只留伤势'处理(scene_index={scene_index}, section={section_number})"
            )
            return True
        return False
    except Exception as e:
        logger.warning(f"[state-chain] 时辰变化检测失败(忽略): {e}")
        return False


def _strip_state_blocks(text: str) -> str:
    """v3.61.229: 关闭"生成人物状态"时,从分镜文本里剥掉所有人物状态块(兜底,防模型仍输出)。

    去掉:「场景起始状态:」块、「🔗 本节结尾状态:」块、以及残留的 姿态[/情绪[/伤势[/朝向关系[/持有道具[ 单行。
    line-based 处理:遇状态块起始行进入跳过,直到边界行(空间布局/本节主线/镜号/🎬/📏/场景标头/---)恢复。
    """
    if not text:
        return text
    _start_re = re.compile(r'^\s*(场景起始状态|🔗?\s*本节结尾状态)\s*[:：]')
    _boundary_re = re.compile(r'^\s*(空间布局|本节主线|本节剧情|镜号|Shot\b|🎬|📏|【|---|===)')
    _tag_re = re.compile(r'^\s*(姿态|情绪|伤势|朝向关系|持有道具)\s*\[')
    out: List[str] = []
    skipping = False
    for ln in text.split('\n'):
        if skipping:
            if _boundary_re.match(ln):
                skipping = False
                out.append(ln)
            continue  # 状态块内部行丢弃
        if _start_re.match(ln):
            skipping = True
            continue
        if _tag_re.match(ln):
            continue
        out.append(ln)
    return '\n'.join(out)


def _storyboard_assemble_eligibility(template: dict):
    """判断分镜模板走 服务端拼装(assemble) 还是 旧 messages 模式。
    返回 (mode, admin_id_or_reason):
      - ('legacy', None)      自建模板(is_preset≠1 或非分镜类),走旧模式,客户端本地拼(用户自己的模板,无所谓)
      - ('assemble', admin_id) 预置分镜模板,走服务端拼装,模板明文不出客户端
      - ('fail', reason)      预置分镜模板既缺 admin_id 又没有本地内容 → 拒绝
    """
    if (not template) or (template.get("is_preset") != 1) or (template.get("category") != "storyboard_generation"):
        return ("legacy", None)
    admin_id = template.get("admin_id")
    if not admin_id:
        # 离线发行版会把预置模板内容随应用打包,没有云端 admin_id 时应使用本地内容。
        # 只有内容也为空的模板才需要继续失败关闭,避免把缺失模板静默当成可用模板。
        if (template.get("content") or "").strip():
            return ("legacy", None)
        return ("fail", "预置分镜模板缺 admin_id,无法服务端拼装;为保护模板不回退本地拼接,请重启客户端或联系管理员")
    return ("assemble", admin_id)


def _parse_camera_continuity(camera_text: str) -> Optional[Dict[str, str]]:
    """把 camera 文本拆成景别/机位/运镜,用于跨小节景别避重。"""
    camera = str(camera_text or "").strip()
    if not camera:
        return None
    parts = [p.strip() for p in re.split(r"\s*[,，]\s*", camera) if p.strip()]
    if len(parts) < 2:
        parts = [p.strip() for p in re.split(r"\s*[-－—]\s*", camera) if p.strip()]
    if not parts:
        return None
    return {
        "camera": camera,
        "shot_size": parts[0],
        "angle": parts[1] if len(parts) > 1 else "",
        "movement": " - ".join(parts[2:]) if len(parts) > 2 else "",
    }


def _extract_tail_camera_continuity(text: str) -> Optional[Dict[str, str]]:
    """从一节分镜文本中取最后一个镜号的 camera 信息。"""
    if not text:
        return None
    tail: Optional[Dict[str, str]] = None
    shot_re = re.compile(r"^\s*镜号\s*(\d+)\s*[:：]\s*(.*)$")
    camera_re = re.compile(r"【([^】]{1,160})】")
    for raw_line in str(text).splitlines():
        m = shot_re.match(raw_line.strip())
        if not m:
            continue
        cm = camera_re.search(m.group(2) or "")
        if not cm:
            continue
        parsed = _parse_camera_continuity(cm.group(1))
        if parsed:
            parsed["shot_number"] = m.group(1)
            tail = parsed
    return tail


async def _get_prev_section_tail_camera_continuity(
    novel_id: int,
    script_id: Optional[int],
    scene_index: Optional[int],
    section_number: int,
    allow_cross_script: bool = False,
) -> Optional[Dict[str, str]]:
    """查找上一小节末镜 camera,供 admin-server 拼装景别避重提示。"""
    if not script_id:
        return None
    cur_scene_idx = scene_index if scene_index is not None else 0
    cur_section = section_number or 1
    db = await get_db()
    try:
        async with db.execute(
            """
            SELECT id, description, prompt, scene_index, section_number
            FROM storyboards
            WHERE novel_id=? AND script_id=? AND scene_index IS NOT NULL
              AND (scene_index < ? OR (scene_index = ? AND section_number < ?))
            ORDER BY scene_index DESC, section_number DESC, sort_order DESC, id DESC
            LIMIT 8
            """,
            (novel_id, script_id, cur_scene_idx, cur_scene_idx, cur_section),
        ) as cur:
            rows = await cur.fetchall()
        for row in rows:
            info = _extract_tail_camera_continuity(row["description"] or row["prompt"] or "")
            if info and info.get("shot_size"):
                info["storyboard_id"] = str(row["id"])
                info["scene_index"] = str(row["scene_index"])
                info["section_number"] = str(row["section_number"])
                logger.info(
                    f"[camera-chain] 找到上一末镜 sb={row['id']} "
                    f"#{row['scene_index']}-{row['section_number']} camera={info.get('camera')}"
                )
                return info

        if allow_cross_script:
            async with db.execute(
                """
                SELECT id, description, prompt, script_id, scene_index, section_number
                FROM storyboards
                WHERE novel_id=? AND script_id<? AND script_id IS NOT NULL
                ORDER BY script_id DESC, scene_index DESC, section_number DESC, sort_order DESC, id DESC
                LIMIT 8
                """,
                (novel_id, script_id),
            ) as cur:
                rows = await cur.fetchall()
            for row in rows:
                info = _extract_tail_camera_continuity(row["description"] or row["prompt"] or "")
                if info and info.get("shot_size"):
                    info["storyboard_id"] = str(row["id"])
                    info["script_id"] = str(row["script_id"])
                    info["scene_index"] = str(row["scene_index"])
                    info["section_number"] = str(row["section_number"])
                    logger.info(
                        f"[camera-chain] 跨章节找到上一末镜 sb={row['id']} "
                        f"script={row['script_id']} camera={info.get('camera')}"
                    )
                    return info
    except Exception as e:
        logger.warning(f"[camera-chain] 查询上一末镜失败(忽略): {e}")
    finally:
        await db.close()
    return None


def _build_storyboard_assemble_payload(template: dict, admin_id, var_values: dict,
                                       scene_content: str, with_character_state: bool,
                                       inject_block: str,
                                       camera_continuity: Optional[dict] = None) -> dict:
    """构造 assemble payload(不含模板明文,只给 admin_id + 变量值 + 状态块)。"""
    try:
        variables = json.loads(template.get("variables", "[]"))
    except Exception:
        variables = []
    return {
        "template_admin_id": admin_id,
        "template_variables": variables,
        "var_values": var_values or {},
        "scene_content": scene_content or "",
        "with_character_state": bool(with_character_state),
        "inject_block": inject_block or "",
        "camera_continuity": camera_continuity or None,
    }


def _strip_reasoning_chain(response: str, scene_header_re: str = r'【\s*(内|外|场景\s*\d+|黑屏|序幕|片头|片尾)') -> str:
    """v3.61.89: 剥离 Gemini 3.1 Pro / Claude 等 reasoning 模型在输出开头夹带的思考链。

    背景(2026-05-15 起):Gemini 服务端把 thinking 默认从隐藏改成附带输出,
    LLM 把"思考过程"塞进 content 开头,前段是 `**Refining Novel to Script**` /
    `**剧本转化思考**` / `**Adapting Script to Storyboards**` 等中英文加粗段落 + 元描述,
    后面才是真正的剧本/分镜。

    判定开头是思考链的特征:
      1) 开头(strip 后)以 `**` 加粗段开始
      2) 前 1500 字含元描述关键字(思考/思路/I'm/Refining/Translating/Adapting 等)

    策略:命中 → 找第一个 `scene_header_re` 匹配的真正剧本/分镜标头,前面思考链全部丢掉。
         未命中 → 原样返回。
    """
    if not response or not response.strip():
        return response
    stripped = response.lstrip()
    if not stripped.startswith('**'):
        return response
    head = stripped[:1500]
    meta_keywords = (
        '思考', '思路', '思绪', '梳理', '转化', '转换', '处理', '分析',
        "I'm", 'I have', 'Refining', 'Translating', 'Processing',
        'Mapping', 'Adapting', 'Visualizing', 'Converting', 'Structuring',
    )
    if not any(k in head for k in meta_keywords):
        return response
    m = re.search(scene_header_re, response)
    if not m:
        return response
    dropped = response[:m.start()]
    new_response = response[m.start():]
    logger.info(
        f"[storyboard] 剥离 reasoning 思考链 {len(dropped)} 字符,"
        f"保留分镜 {len(new_response)} 字符 (开头被剥:{dropped[:60]!r}...)"
    )
    return new_response


def _dedupe_start_state_blocks(header_lines: List[str]) -> List[str]:
    """去重 LLM 输出中重复的"场景起始状态:"块。

    背景:模板要求 LLM 在节头写"场景起始状态: 角色 = 状态...",
         但后端 prompt 注入要求 LLM "复制粘贴上节结尾状态作为本节起点",
         LLM 偶尔会两边都按字面理解 → 输出两份"场景起始状态:"块 → 用户看到一节有两个起点状态。
    策略:识别 header_lines 里的每个"场景起始状态:" + 紧随的"  角色 = ..."缩进行,合并成 block。
         若 ≥2 个块,**保留最后一个**(因为它通常贴近【场景标头】,代表本节真正起点;
         前面那个往往是 LLM 抄的注入老状态)。

    边缘情况:
    - 中间隔了一行非缩进内容 → 块结束
    - 只有 1 个块或 0 个块 → 原样返回
    - 整个 header 没"场景起始状态:" 字样 → 原样返回
    """
    if not header_lines:
        return header_lines
    block_re = re.compile(r'^\s*场景起始状态\s*[:：]\s*$')
    indent_re = re.compile(r'^[ \t]+\S')

    # 标记每行是不是某个 block 的起点
    blocks = []  # [(start_idx, end_idx_exclusive)]
    i = 0
    n = len(header_lines)
    while i < n:
        if block_re.match(header_lines[i] or ""):
            # block 起点;往后吃缩进行 / 空行
            j = i + 1
            # 允许块头紧跟一个空行,但通常没空行
            while j < n:
                line = header_lines[j] or ""
                if indent_re.match(line):
                    j += 1
                    continue
                # 完全空行:块结束
                if not line.strip():
                    break
                # 非缩进内容行:块结束
                break
            if j > i + 1:  # 至少抓到 1 行内容才算块
                blocks.append((i, j))
            i = j
        else:
            i += 1

    if len(blocks) < 2:
        return header_lines

    # 只保留最后一个块,前面所有块整段删掉
    keep_start, _ = blocks[-1]
    # 收集要删的索引
    drop = set()
    for (s, e) in blocks[:-1]:
        for idx in range(s, e):
            drop.add(idx)

    out = [line for idx, line in enumerate(header_lines) if idx not in drop]
    return out


def _dedupe_same_name_state_lines(lines: List[str]) -> List[str]:
    """归一化「场景起始状态:」块内/块后(空行隔开)的同名角色状态行重复(2026-05)。

    背景:_dedupe_start_state_blocks 只去重"多个完整的场景起始状态:块",
         不处理"一个块后面隔空行又重复一条同名角色状态"这种残留:
            场景起始状态:
              谢明渊 = ...
              凌瑶华 = ...
              (空行)
              凌瑶华 = ...   ← 同名重复行,不带第二个"场景起始状态:"标题
         state-chain 重写正则遇空行也会结束 block,兜不住。无论来源是模型写重还是
         后端拼接,后端都应清掉。

    保守规则:
      - 只处理「场景起始状态:」之后、到 空间布局/本节主线/镜号/【/🎬/📏/🔗/--- 之前的区域;
      - 同名角色只保留一条;完全相同 → 删;同名不同内容 → 保留【最后一条】(后写更接近最终状态);
      - 顺序按角色首次出现;区域后保留一个空行与下文分隔;遇到意外非状态行则保守停手。
    """
    _STOP = ('空间布局', '本节主线', '镜号', 'Shot', '【', '🎬', '📏', '🔗', '---')

    def _is_stop(s: str) -> bool:
        return any(s.startswith(p) for p in _STOP)

    hi = None
    for i, l in enumerate(lines):
        if re.match(r'^\s*场景起始状态\s*[:：]', l or ''):
            hi = i
            break
    if hi is None:
        return lines

    j = hi + 1
    order: List[str] = []
    content: Dict[str, str] = {}
    while j < len(lines):
        s = (lines[j] or '').strip()
        if s == '':
            j += 1
            continue
        if _is_stop(s):
            break
        if '=' in s:
            name = s.split('=', 1)[0].strip()
            if name not in content:
                order.append(name)
            content[name] = '  ' + s   # 统一两空格缩进
            j += 1
        else:
            # 非状态、非 STOP 的意外行 → 保守不动
            return lines

    if len(order) == sum(1 for k in range(hi + 1, j) if (lines[k] or '').strip() and '=' in lines[k]):
        # 没有任何重复(状态行数 == 去重后角色数)→ 原样返回,避免无谓改动空行结构
        return lines

    rebuilt = [content[n] for n in order]
    return lines[:hi + 1] + rebuilt + [''] + lines[j:]


def _relocate_orphan_tail_fragments(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """🔗 归位修正 v2(2026-05):把"漏到下一节节首的上一节尾块残片"挪回上一节。

    背景(DB 实测,按 §3.2/§3.3 节尾切节时的边界 bug):
        上一节正常结尾应是「📏 + 🔗本节结尾状态(全部在场角色) + 🎬补充层」,
        但拆节时偶尔只把 `🔗` 标题 + 第一个角色留在上一节,
        其余角色状态行 + 🎬 行被切到了【下一节节头、真正场景标题【...】之前】。
        现有 v1 归位只认以 `🔗 本节结尾状态:` 开头的整块,抓不到这种"无标题残片";
        且 v1 在上一节已有 🔗 时直接跳过、不合并 → 状态行被丢弃。

    v2 策略(只读节首、保守判定,绝不动正常内容):
        - 定位当前节"真正内容起点" = 节头【...】 / `场景起始状态:` / 第一个镜号 三者最靠前者。
        - 起点之前的"节首块"若【非空、且每一行都是 状态行(角色 = ...)/🎬/🔗标题、且不含镜号】,
          判定为上一节尾块残片。
        - 把残片里的角色状态行【合并】进上一节的 🔗 块(上一节没 🔗 就补一个;
          已有就把缺的角色补进去,不覆盖),🎬 行也并入(去重);同步修正上一节 _end_state。
        - 残片从当前节移除。

    只处理"节首"残片,镜号一旦出现就停手,避免误移正常节末 🔗。
    """
    import re as _re
    if not sections or len(sections) < 2:
        return sections

    _shot_re = _re.compile(r'(?:^|\n)\s*(?:镜号|Shot)\s*\d', _re.IGNORECASE)
    _header_re = _re.compile(r'(?:^|\n)[ \t]*【[^】\n]+】')
    _start_state_re = _re.compile(r'(?:^|\n)[ \t]*场景起始状态[:：]')
    _state_line_re = _re.compile(r'^[ \t]*[^=\n【】]{1,30}=\s*\S')

    def _parse_states(block: str) -> Dict[str, str]:
        od: Dict[str, str] = {}
        for ln in block.split('\n'):
            s = ln.strip()
            if not s or s.startswith('🔗') or s.startswith('🎬') or '=' not in s:
                continue
            if '【' in s or '镜号' in s:
                continue
            nm, val = s.split('=', 1)
            nm = nm.strip().rstrip(':：').strip()
            val = val.strip()
            if nm and val:
                od[nm] = val
        return od

    def _is_orphan_line(l: str) -> bool:
        s = l.strip()
        return s.startswith('🔗') or s.startswith('🎬') or bool(_state_line_re.match(l))

    for idx in range(1, len(sections)):
        curr = sections[idx].get("full_text", "") or ""
        cut = len(curr)
        for rx in (_header_re, _start_state_re, _shot_re):
            mm = rx.search(curr)
            if mm:
                cut = min(cut, mm.start())
        if cut <= 0:
            continue
        head = curr[:cut]
        head_lines = [l for l in head.split('\n') if l.strip()]
        if not head_lines:
            continue
        if _shot_re.search(head):
            continue
        if not all(_is_orphan_line(l) for l in head_lines):
            continue

        # —— 确认是孤儿尾块 ——
        orphan_states = _parse_states(head)
        orphan_jin = [l.rstrip() for l in head.split('\n') if l.strip().startswith('🎬')]
        if not orphan_states and not orphan_jin:
            continue
        # 1) 从当前节移除残片
        sections[idx]["full_text"] = curr[cut:].lstrip()

        # 2) 合并进上一节(重建节末:body + 🔗块 + 🎬 + 📏)
        prev = (sections[idx - 1].get("full_text", "") or "").rstrip()
        plines = prev.split('\n')

        def _is_tail(l: str) -> bool:
            s = l.strip()
            return s.startswith('🔗') or s.startswith('🎬') or s.startswith('📏')

        ts = len(plines)
        for i, l in enumerate(plines):
            if _is_tail(l):
                ts = i
                break
        body = plines[:ts]
        tail = '\n'.join(plines[ts:])
        prev_states = _parse_states(tail)
        prev_jin = [l.rstrip() for l in tail.split('\n') if l.strip().startswith('🎬')]
        durm = _re.search(r'(📏\s*本小节总时长[:：]\s*\d+(?:\.\d+)?\s*秒)', tail)
        dur = durm.group(1) if durm else None

        merged = dict(prev_states)
        for nm, val in orphan_states.items():
            merged.setdefault(nm, val)
        # 🎬 合并:不是二选一,而是按"不变元素/渐进变化"类目并集(上一节已有的优先,
        # 漂来的补缺)。修上一节有🎬不变、下一节漂🎬渐进时丢一行的问题(125 轻漏法)。
        def _jin_cat(l: str) -> str:
            if '不变元素' in l:
                return '不变'
            if '渐进变化' in l:
                return '渐进'
            return l.strip()
        jin = list(prev_jin)
        _have_cat = {_jin_cat(l) for l in prev_jin}
        for l in orphan_jin:
            c = _jin_cat(l)
            if c not in _have_cat:
                jin.append(l)
                _have_cat.add(c)

        new_lines = list(body)
        new_lines.append('🔗 本节结尾状态:')
        for nm, val in merged.items():
            new_lines.append(f'  {nm} = {val}')
        new_lines.extend(jin)
        if dur:
            new_lines.append(dur)
        sections[idx - 1]["full_text"] = '\n'.join(new_lines).strip()

        # 3) 修正上一节 _end_state(补缺角色,不覆盖)
        es = dict(sections[idx - 1].get("_end_state") or {})
        for nm, val in prev_states.items():
            es.setdefault(nm, val)
        for nm, val in orphan_states.items():
            es.setdefault(nm, val)
        if es:
            sections[idx - 1]["_end_state"] = es
        try:
            logger.info(
                f"[🔗归位v2] 小节 {sections[idx].get('section_number')} 节首残片"
                f"(角色:{list(orphan_states.keys())} 🎬:{len(orphan_jin)}行)挪回前一节并合并"
            )
        except Exception:
            pass

    return sections


class StoryboardService:
    @staticmethod
    def _has_shot_marker(text: str) -> bool:
        """判断分镜文本里是否至少有一个真实镜号。

        防止 LLM 输出只有风格描述/状态块/节头的"空境小节"被保存或展示。
        只认带数字的镜号标记,避免把"运镜/镜头语言"这类普通词误判成有效镜头。
        """
        return bool(re.search(r'(?:镜号|镜头|镜|Shot)\s*\d', text or '', re.IGNORECASE))

    # 标准景别格式（作为拆分点）- 匹配【外/内/外/内/内/外 场景描述】格式
    SCENE_PATTERN = re.compile(r'^【(?:外|内|外/内|内/外)\s+[^】]+】', re.MULTILINE)
    
    # 通用中文方括号格式（fallback）- 匹配【任意内容】行首模式
    # 如【现实 · 深夜书房 · 夜】、【回忆 · 主卧室 · 夜】等
    SCENE_PATTERN_GENERAL = re.compile(r'^【[^【】]+】', re.MULTILINE)

    @staticmethod
    def _normalize_characters(characters_input) -> List[str]:
        """
        标准化人物列表：处理各种分隔符（中文逗号、英文逗号、顿号）
        
        Args:
            characters_input: 可以是字符串或列表
            
        Returns:
            拆分后的人物列表，去重
        """
        if not characters_input:
            return []
        
        # 如果已经是列表，检查每个元素是否需要进一步拆分
        if isinstance(characters_input, list):
            normalized_chars = []
            for char in characters_input:
                if isinstance(char, str):
                    # 按中文逗号、英文逗号、顿号拆分
                    parts = re.split(r'[，,、]', char)
                    normalized_chars.extend([p.strip() for p in parts if p.strip()])
            return list(dict.fromkeys(normalized_chars))  # 去重保持顺序
        
        # 如果是字符串
        if isinstance(characters_input, str):
            parts = re.split(r'[，,、]', characters_input)
            return list(dict.fromkeys([p.strip() for p in parts if p.strip()]))
        
        return []

    @staticmethod
    def normalize_scene_title(title: str) -> str:
        """标准化场景标题：去除【】括号，规范化空格"""
        if not title:
            return title
        # 去除【】括号
        title = title.replace('【', '').replace('】', '')
        # 将多个连续空格替换为单个空格
        title = re.sub(r'\s+', ' ', title)
        # 去除首尾空格
        title = title.strip()
        return title

    @staticmethod
    def _parse_storyboard_response(response: str) -> List[Dict[str, Any]]:
        """解析大模型返回的分镜结果，提取JSON数组"""
        return parse_storyboard_response(response)

    @staticmethod
    def split_scenes_from_script(script_content: str) -> List[Dict[str, Any]]:
        """
        从剧本内容中拆分出各个场景

        场景标记格式（多级匹配策略）：
        1. 标准景别格式：【外 xxx】、【内 xxx】、【外/内 xxx】、【内/外 xxx】
        2. 通用方括号格式：【现实 · 深夜书房 · 夜】、【回忆 · 主卧室 · 夜】等
        3. 特殊标记（不作为拆分点）：【闪回画面：xxx】、【画面切回：xxx】

        Args:
            script_content: 剧本内容

        Returns:
            场景列表，每个场景包含：
            - index: 场景序号（从0开始）
            - scene_title: 场景标记内容
            - content: 该场景的完整剧本内容（包括场景标记行）
            - char_count: 字符数
        """
        if not script_content or not script_content.strip():
            return []

        scenes = []
        content = script_content.strip()

        # 第一级：标准景别格式
        matches = list(StoryboardService.SCENE_PATTERN.finditer(content))
        
        # 第二级：通用【xxx】格式（如【现实 · 深夜书房 · 夜】）
        if not matches:
            matches = list(StoryboardService.SCENE_PATTERN_GENERAL.finditer(content))

        if not matches:
            # 没有场景标记，将整个内容作为一个场景
            return [{
                "index": 0,
                "scene_title": "未命名场景",
                "content": content,
                "char_count": len(content)
            }]

        # 处理剧本开头没有场景标记的内容（归入第一个场景）
        first_match_start = matches[0].start()
        if first_match_start > 0:
            # 开头有内容，归入第一个场景
            prefix_content = content[:first_match_start].strip()
        else:
            prefix_content = ""

        # 场景时间线类型标签识别
        # 剧本里格式: 【外 场景名 时间】 [时间线:回忆]
        # 可选标签,默认 normal
        SCENE_TYPE_TAG = re.compile(r'\[\s*时间线\s*[:：]\s*(\S+?)\s*\]')
        CN_TO_EN_TYPE = {
            # 主时间线别名(向后兼容"正常"旧值)
            "主线": "normal",
            "正常": "normal",
            "回忆": "flashback",
            "梦境": "dream",
            "幻觉": "vision",
            "平行": "parallel",
            "normal": "normal",
            "flashback": "flashback",
            "dream": "dream",
            "vision": "vision",
            "parallel": "parallel",
        }

        # 遍历所有场景标记
        for i, match in enumerate(matches):
            scene_title = match.group(0).strip()
            start_pos = match.start()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(content)

            # 获取场景内容
            scene_content = content[start_pos:end_pos].strip()

            # 如果是第一个场景，加上前缀内容
            if i == 0 and prefix_content:
                scene_content = prefix_content + "\n\n" + scene_content

            # 从场景头后紧跟的一行里找 [时间线:xxx] 标签(只看前 200 字避免误伤)
            scene_type = "normal"
            probe = scene_content[:200]
            m = SCENE_TYPE_TAG.search(probe)
            if m:
                raw = m.group(1).strip().lower()
                scene_type = CN_TO_EN_TYPE.get(raw) or CN_TO_EN_TYPE.get(m.group(1).strip()) or "normal"

            scenes.append({
                "index": i,
                "scene_title": scene_title,
                "content": scene_content,
                "char_count": len(scene_content),
                "scene_type": scene_type,
            })

        # v3.61.125: 后端兜底强制软切
        # 模板里写了"600~1100 字必须软切",但 LLM(尤其 Gemini)对"连续累计字数"规则
        # 遵守率差,经常一个场景 3000+ 字也不切续标。导致下游分镜 AI 漏后半剧情。
        # → 后端二次切割:任何场景超 1300 字(模板 1100 上限 + 200 缓冲),按段落自动加续标
        scenes = StoryboardService._force_soft_split_scenes(scenes, max_chars=1300)

        return scenes

    @staticmethod
    def _force_soft_split_scenes(scenes: List[Dict[str, Any]], max_chars: int = 1300) -> List[Dict[str, Any]]:
        """v3.61.125: LLM 没遵守"600~1100 字软切续标"规则时,后端自动切。

        切割原则:
            - 优先切空行(\n\n)— 段落边界,语意完整
            - 退而求其次切单 \n
            - 单段超 max_chars 也保留(不切句子中间)
            - 续标格式跟模板一致:`{原场景标头} (续N)` — 跟 SCENE_PATTERN 匹配兼容
            - 续标段保留原 scene_type(回忆/梦境 不变)
        """
        new_scenes = []
        for s in scenes:
            content = s.get("content", "") or ""
            if len(content) <= max_chars:
                new_scenes.append(s)
                continue

            # 去掉场景标头那一行(保留下来后再拼回)
            # 标头在第一行(scene_title),内容从第二行起
            scene_title = s.get("scene_title", "")
            body = content
            if scene_title and content.startswith(scene_title):
                body = content[len(scene_title):].lstrip('\n')

            # 按段落切(优先 \n\n,fallback \n)
            chunks = StoryboardService._chunk_text_by_paragraph(body, max_chars=max_chars)
            if len(chunks) <= 1:
                # 切不动(整段无段落分隔) — 原样保留
                new_scenes.append(s)
                continue

            # 第一段用原 scene_title,后续段加 (续N)
            for idx, chunk in enumerate(chunks):
                if idx == 0:
                    new_title = scene_title
                    new_content = scene_title + ("\n" + chunk if chunk else "")
                else:
                    new_title = f"{scene_title} (续{idx + 1})"
                    new_content = new_title + "\n" + chunk
                new_scenes.append({
                    "index": len(new_scenes),  # 重新编号
                    "scene_title": new_title,
                    "content": new_content,
                    "char_count": len(new_content),
                    "scene_type": s.get("scene_type", "normal"),
                })

        # 重排 index(保证连续 0,1,2...)
        for i, sc in enumerate(new_scenes):
            sc["index"] = i

        return new_scenes

    @staticmethod
    def _chunk_text_by_paragraph(text: str, max_chars: int = 1300) -> List[str]:
        """把长文本按段落切成多段,每段 ≤ max_chars,目标长度 ~ max_chars/2 (≈ 650)"""
        if not text or len(text) <= max_chars:
            return [text] if text else []

        # 目标长度:max_chars 一半(~650 字),让每段 600-1100 的目标范围
        target = max_chars // 2

        # 先尝试用 \n\n(空行)切
        paragraphs = re.split(r'\n\s*\n', text)
        if len(paragraphs) <= 1:
            # 没空行,fallback 用 \n
            paragraphs = text.split('\n')

        chunks = []
        cur = []
        cur_len = 0
        for p in paragraphs:
            if not p.strip():
                continue
            plen = len(p)
            # 当前段 + 新段 在 max_chars 内 → 拼;否则起新 chunk
            if cur_len + plen + 2 > max_chars and cur:
                chunks.append('\n\n'.join(cur))
                cur = [p]
                cur_len = plen
            else:
                cur.append(p)
                cur_len += plen + 2
        if cur:
            chunks.append('\n\n'.join(cur))

        return chunks

    @staticmethod
    async def get_script_content_for_split_scenes(novel_id: int, script_id: Optional[int] = None) -> Dict[str, Any]:
        """
        获取用于场景拆分的剧本内容

        Args:
            novel_id: 小说ID
            script_id: 指定剧本ID，为None则合并所有剧本

        Returns:
            {
                "success": bool,
                "content": str,
                "message": str
            }
        """
        try:
            if script_id:
                script = await ScriptService.get_script(script_id)
                if not script:
                    return {
                        "success": False,
                        "content": "",
                        "message": f"剧本不存在: script_id={script_id}"
                    }
                script_content = script.get("content", "")
            else:
                scripts_data = await ScriptService.get_scripts(novel_id)
                scripts = scripts_data.get("scripts", [])
                if not scripts:
                    return {
                        "success": False,
                        "content": "",
                        "message": "该小说没有可用的剧本内容"
                    }
                # 合并所有剧本内容
                script_content = "\n\n".join([
                    f"【{s.get('chapter_title', '未命名章节')}】\n{s.get('content', '')}"
                    for s in scripts
                ])

            if not script_content.strip():
                return {
                    "success": False,
                    "content": "",
                    "message": "剧本内容为空"
                }

            return {
                "success": True,
                "content": script_content,
                "message": "获取剧本内容成功"
            }

        except Exception as e:
            return {
                "success": False,
                "content": "",
                "message": f"获取剧本内容失败: {str(e)}"
            }

    @staticmethod
    async def match_elements(novel_id: int, storyboard_text: str) -> Dict[str, List[str]]:
        """
        匹配分镜描述中的关联元素
        
        Returns:
            {
                "characters": ["人物1", "人物2"],
                "scenes": ["场景1"],
                "props": ["道具1", "道具2"]
            }
        """
        result = {
            "characters": [],
            "scenes": [],
            "props": []
        }
        
        # 获取该小说的所有提取元素
        elements = await ExtractionService.get_elements(novel_id)
        
        if not elements:
            return result
        
        # 按类型分类元素
        characters = [e for e in elements if e.get("element_type") == "character"]
        scenes = [e for e in elements if e.get("element_type") == "scene"]
        props = [e for e in elements if e.get("element_type") == "prop"]
        
        text_lower = storyboard_text.lower()
        
        # 匹配人物
        for char in characters:
            name = char.get("name", "")
            if name and name.lower() in text_lower:
                result["characters"].append(name)
        
        # 匹配场景
        for scene in scenes:
            name = scene.get("name", "")
            if name and name.lower() in text_lower:
                result["scenes"].append(name)
        
        # 匹配道具
        for prop in props:
            name = prop.get("name", "")
            if name and name.lower() in text_lower:
                result["props"].append(name)
        
        return result

    @staticmethod
    async def _parse_sections_with_dynamic_rules(response: str) -> List[Dict[str, Any]]:
        """异步包装:先从 admin 拉取小节解析规则,再调同步解析。
        拉取失败会自动降级到硬编码规则。"""
        try:
            from services import parser_rule_service
            rules = await parser_rule_service.get_rules('section_split')
        except Exception as e:
            logger.warning(f"[storyboard] 拉取 section_split 规则失败,降级硬编码: {e}")
            rules = None
        return StoryboardService._parse_sections_from_response(response, custom_rules=rules)

    @staticmethod
    def _parse_sections_from_response(response: str, custom_rules: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """
        从 LLM 响应中解析小节数据
        支持两种格式：
        1. JSON 格式（有小节结构）：[{"section_number": 1, "scene": "...", "characters": "...", "shots": [...]}, ...]
        2. 纯文本格式（小节标记）：### 小节1：... 或 小节1：...

        Args:
            response: LLM 返回的文本
            custom_rules: 可选的动态解析规则(从 admin 拉取),为 None 时使用硬编码

        返回每个小节作为一条记录，包含完整的文本内容
        """
        if not response or not response.strip():
            return []
        
        text = response.strip()
        
        # 尝试1：解析 JSON 格式
        try:
            result = json.loads(text)
            if isinstance(result, list):
                return StoryboardService._postprocess_text_sections(
                    StoryboardService._convert_json_sections_to_text(result)
                )
            if isinstance(result, dict):
                for key in ['sections', 'storyboards', 'scenes', 'data', 'results', 'list', 'items', 'shots']:
                    if key in result and isinstance(result[key], list):
                        return StoryboardService._postprocess_text_sections(
                            StoryboardService._convert_json_sections_to_text(result[key])
                        )
                return StoryboardService._postprocess_text_sections(
                    StoryboardService._convert_json_sections_to_text([result])
                )
        except json.JSONDecodeError:
            pass

        # 尝试2：提取 markdown 代码块中的 JSON
        import re
        code_block_patterns = [
            r'```json\s*\n?(.*?)\n?\s*```',
            r'```\s*\n?(.*?)\n?\s*```',
        ]
        candidate_json_texts = []
        for pattern in code_block_patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            for match in matches:
                candidate_json_texts.append(match.strip())

        # 尝试2.5:裸 JSON 数组/对象(没代码块包装),例如开头直接是 [ 或 {
        # 截取从第一个 [ 或 { 到最后一个 ] 或 } 的子串
        def _extract_naked_json(s: str) -> Optional[str]:
            for open_c, close_c in [('[', ']'), ('{', '}')]:
                start = s.find(open_c)
                end = s.rfind(close_c)
                if start >= 0 and end > start:
                    return s[start:end + 1]
            return None
        naked = _extract_naked_json(text)
        if naked:
            candidate_json_texts.append(naked)

        # 容错清理:移除尾逗号/中文全角标点(LLM 有时会混用)
        def _clean_json(s: str) -> str:
            # 移除 JSON5 风格尾逗号: ,] 或 ,}
            s = re.sub(r',(\s*[\]}])', r'\1', s)
            return s

        # 截断修复:LLM 输出 max_tokens 截断时,补齐未闭合的 { [ 括号
        # 策略:从末尾往前找最后一个合法 JSON 片段,按栈补齐
        def _repair_truncated(s: str) -> str:
            s = s.strip()
            if not s:
                return s
            # 如果以 , 或不完整字符串结尾,先截到最后一个 } 或 ]
            last_close = max(s.rfind('}'), s.rfind(']'))
            if last_close < 0:
                return s
            body = s[:last_close + 1]
            # 统计括号栈
            stack = []
            in_str = False
            esc = False
            for ch in body:
                if esc:
                    esc = False
                    continue
                if ch == '\\':
                    esc = True
                    continue
                if ch == '"':
                    in_str = not in_str
                    continue
                if in_str:
                    continue
                if ch in '[{':
                    stack.append(ch)
                elif ch == ']':
                    if stack and stack[-1] == '[':
                        stack.pop()
                elif ch == '}':
                    if stack and stack[-1] == '{':
                        stack.pop()
            # 栈里剩下的按反向补齐
            suffix = ''.join(']' if c == '[' else '}' for c in reversed(stack))
            return body + suffix

        for candidate in candidate_json_texts:
            for attempt in (candidate, _clean_json(candidate), _repair_truncated(_clean_json(candidate))):
                try:
                    result = json.loads(attempt)
                    if isinstance(result, list):
                        return StoryboardService._postprocess_text_sections(
                            StoryboardService._convert_json_sections_to_text(result)
                        )
                    if isinstance(result, dict):
                        for key in ['sections', 'storyboards', 'scenes', 'data', 'results', 'list', 'items', 'shots']:
                            if key in result and isinstance(result[key], list):
                                return StoryboardService._postprocess_text_sections(
                                    StoryboardService._convert_json_sections_to_text(result[key])
                                )
                        return StoryboardService._postprocess_text_sections(
                            StoryboardService._convert_json_sections_to_text([result])
                        )
                except (json.JSONDecodeError, ValueError) as je:
                    logger.warning(f"[storyboard] JSON candidate 解析失败: {type(je).__name__}: {str(je)[:120]}")
                    continue

        # 尝试3:Markdown 表格 fallback(LLM 有时不听话改输 | 镜号 | 景别 |... 表格)
        md_parsed = StoryboardService._parse_markdown_table(text)
        if md_parsed:
            logger.warning(f"[storyboard] JSON 解析失败,用 Markdown 表格 fallback 解析到 {len(md_parsed)} 个小节")
            return StoryboardService._postprocess_text_sections(
                StoryboardService._convert_json_sections_to_text(md_parsed)
            )

        # 尝试4:按文本格式解析（小节标记）
        logger.warning(f"[storyboard] 所有解析失败,回退到文本解析。response 前 200 字: {text[:200]!r}")
        parsed = StoryboardService._parse_text_sections(text, custom_rules=custom_rules)
        # 对 text 格式结果再做一次"按 15s 拆分 + 时间码归零 + 追加总时长"后处理
        return StoryboardService._postprocess_text_sections(parsed)

    @staticmethod
    def _parse_markdown_table(text: str) -> List[Dict[str, Any]]:
        """把 LLM 输出的 Markdown 表格分镜解析为标准 JSON 结构。
        典型表格表头:| 镜号 | 景别 | 角度 | 运镜 | 画面内容 | 台词 | OS | 音效 | 音乐 | 时长 |
        返回与 JSON 格式一致的 sections 列表(1 个小节含多个 shots)。
        """
        import re
        lines = text.split('\n')
        # 找表头
        header_idx = None
        for i, line in enumerate(lines):
            if '|' in line and ('镜号' in line or '景别' in line) and '画面' in line:
                header_idx = i
                break
        if header_idx is None:
            return []
        header_cells = [c.strip() for c in lines[header_idx].split('|')[1:-1]]
        # 表头下一行通常是分隔符 | :--- | ... | 跳过
        body_start = header_idx + 1
        if body_start < len(lines) and re.match(r'^\s*\|[\s:\-|]+\|\s*$', lines[body_start]):
            body_start += 1

        shots = []
        for line in lines[body_start:]:
            line = line.strip()
            if not line.startswith('|') or not line.endswith('|'):
                if not line:
                    continue
                break  # 表格结束
            cells = [c.strip() for c in line.split('|')[1:-1]]
            if len(cells) != len(header_cells):
                continue
            row = dict(zip(header_cells, cells))

            # 提取关键字段(容忍 HTML<br>和多种标题写法)
            def _clean(s: str) -> str:
                return re.sub(r'<br\s*/?>', ' ', s or '').strip()

            shot_no_raw = _clean(row.get('镜号', ''))
            shot_match = re.search(r'(\d+)', shot_no_raw)
            if not shot_match:
                continue
            shot_num = int(shot_match.group(1))

            scale = _clean(row.get('景别', ''))
            angle = _clean(row.get('角度', ''))
            move = _clean(row.get('运镜', ''))
            camera_parts = [p for p in [scale, angle, move] if p and p != '-']
            camera = ', '.join(camera_parts)

            content = _clean(row.get('画面内容', ''))
            dialogue = _clean(row.get('台词', ''))
            if dialogue == '-':
                dialogue = ''
            sfx = _clean(row.get('音效', ''))
            ambient = _clean(row.get('音乐', ''))
            duration = _clean(row.get('时长', ''))

            description = content
            if sfx and sfx != '-':
                description += f" / 音效:{sfx}"
            if duration and duration != '-':
                description = f"[{duration}] " + description

            shots.append({
                "shot_number": shot_num,
                "camera": camera,
                "description": description,
                "dialogue": dialogue,
            })

        if not shots:
            return []

        # 尝试从文本顶部提取场景和人物
        scene = ""
        characters = ""
        top = text[:header_idx * 50] if header_idx else text[:500]
        m = re.search(r'(?:场景|\*\*场景\*\*)\s*[:：]\s*([^\n]+)', top)
        if m:
            scene = m.group(1).strip().rstrip('。')
        m = re.search(r'(?:人物|角色|\*\*人物\*\*)\s*[:：]\s*([^\n]+)', top)
        if m:
            characters = m.group(1).strip().rstrip('。')

        return [{
            "section_number": 1,
            "scene": scene,
            "characters": characters,
            "shots": shots,
        }]
    
    # 即梦单条视频最大时长(秒),超过此时长的小节需要按镜头时间码自动拆分
    MAX_SECTION_DURATION_SEC = 15

    @staticmethod
    def _parse_timecode_seconds(tc: str) -> Optional[tuple]:
        """把 "00:00-00:04.5" 或 "00:00.5-00:09" 之类的时间码解析成 (start_sec, end_sec) 浮点秒
        解析失败返回 None
        """
        if not tc or not isinstance(tc, str):
            return None
        import re
        m = re.match(r'^\s*(\d{1,2}):(\d{1,2}(?:\.\d+)?)\s*[-~]\s*(\d{1,2}):(\d{1,2}(?:\.\d+)?)\s*$', tc)
        if not m:
            return None
        try:
            s_min, s_sec, e_min, e_sec = m.groups()
            start = int(s_min) * 60 + float(s_sec)
            end = int(e_min) * 60 + float(e_sec)
            return (start, end) if end > start else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _split_shots_by_duration(shots: List[Dict[str, Any]], max_sec: int) -> List[List[Dict[str, Any]]]:
        """按累计时长把镜头拆成若干组,每组总时长 ≤ max_sec

        如果任何一个 shot 缺 timecode/duration 或解析失败,整体保持不拆(兼容旧模板/LLM 输出不规范)

        返回值:嵌套列表,每个子列表是一组镜头;若不能拆(或不需要拆),返回 [[所有原 shots]]
        """
        if not shots:
            return [[]]

        # 预解析每个 shot 的起止秒; 任何一个解析失败就放弃拆分(保持兼容)
        parsed = []
        for shot in shots:
            if not isinstance(shot, dict):
                return [shots]  # 非 dict 混入,不拆
            tc = shot.get("timecode") or shot.get("time_range")
            duration = shot.get("duration")
            sec_range = StoryboardService._parse_timecode_seconds(tc) if tc else None
            if sec_range is None:
                # 尝试用 duration 字段补救:但没有累计起点参考,不能靠它拆
                return [shots]  # 无法拆分,保持原状
            parsed.append(sec_range)

        # 按累计时长贪心切分
        groups = []
        current = []
        current_start = None
        for shot, (s, e) in zip(shots, parsed):
            if not current:
                current = [shot]
                current_start = s
            else:
                # 判断加入当前 shot 后是否会超过 max_sec
                if (e - current_start) <= max_sec:
                    current.append(shot)
                else:
                    groups.append(current)
                    current = [shot]
                    current_start = s
        if current:
            groups.append(current)
        return groups

    @staticmethod
    def _format_timecode(start: float, end: float) -> str:
        """把浮点秒重新格式化为 "MM:SS.s-MM:SS.s" 字符串(与输入格式一致)"""
        def fmt(sec: float) -> str:
            m = int(sec // 60)
            s = sec - m * 60
            if abs(s - round(s)) < 0.05:
                return f"{m:02d}:{int(round(s)):02d}"
            return f"{m:02d}:{s:04.1f}"
        return f"{fmt(start)}-{fmt(end)}"

    @staticmethod
    def _normalize_shots_timecode(shots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """把一组 shot 的 timecode 归零:第一个从 00:00 起,保持每个 shot 原时长

        返回新列表(不改原对象)。解析失败的 shot 保持原 timecode
        """
        if not shots:
            return shots
        # 找到这组 shots 的起始秒(取第一个 shot 的起始时间)
        first_range = None
        for shot in shots:
            if not isinstance(shot, dict):
                continue
            tc = shot.get("timecode") or shot.get("time_range")
            r = StoryboardService._parse_timecode_seconds(tc) if tc else None
            if r is not None:
                first_range = r
                break
        if first_range is None:
            return shots  # 没法归零

        base = first_range[0]
        new_shots = []
        for shot in shots:
            if not isinstance(shot, dict):
                new_shots.append(shot)
                continue
            ns = dict(shot)  # 浅拷贝
            tc = shot.get("timecode") or shot.get("time_range")
            r = StoryboardService._parse_timecode_seconds(tc) if tc else None
            if r is not None:
                ns["timecode"] = StoryboardService._format_timecode(r[0] - base, r[1] - base)
            new_shots.append(ns)
        return new_shots

    @staticmethod
    def _calc_section_duration(shots: List[Dict[str, Any]]) -> Optional[float]:
        """从 shots 的 timecode 计算小节总时长(秒),失败返回 None"""
        if not shots:
            return None
        last_end = None
        first_start = None
        for shot in shots:
            if not isinstance(shot, dict):
                return None
            tc = shot.get("timecode") or shot.get("time_range")
            r = StoryboardService._parse_timecode_seconds(tc) if tc else None
            if r is None:
                return None
            if first_start is None:
                first_start = r[0]
            last_end = r[1]
        if first_start is None or last_end is None:
            return None
        return last_end - first_start

    @staticmethod
    def _convert_json_sections_to_text(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        将 JSON 格式的小节数据转换为文本格式
        每个小节包含完整的文本内容，方便用户直接复制使用

        V2 新增:如果 shots 带 timecode 且总时长超过 15 秒,自动拆成多个小节
        (无 timecode 的老模板输出完全保持原逻辑,不受影响)
        """
        result = []

        # 预处理:按 15s 规则自动拆分超长小节
        # 只在能够安全解析 timecode 的情况下拆(无 timecode 一律保持不拆,不影响旧模板)
        # 拆分后:每个子小节的 timecode 重新从 00:00 开始,即梦才认
        expanded = []
        for idx, section in enumerate(data):
            if not isinstance(section, dict):
                expanded.append((idx, section, None))
                continue
            shots = section.get("shots", [])
            groups = StoryboardService._split_shots_by_duration(shots, StoryboardService.MAX_SECTION_DURATION_SEC)
            if len(groups) <= 1:
                expanded.append((idx, section, None))
            else:
                # 拆成多个子 section,每个子 section 继承原 scene/characters 等元数据
                # 并把每组 shots 的 timecode 重新归零(从 00:00 起)
                for sub_idx, group in enumerate(groups):
                    new_section = dict(section)  # 浅拷贝
                    new_section["shots"] = StoryboardService._normalize_shots_timecode(group)
                    expanded.append((idx, new_section, sub_idx))

        for flat_idx, (orig_idx, section, sub_idx) in enumerate(expanded):
            if not isinstance(section, dict):
                continue

            # 小节号:有拆分时按顺序重新编号(保持线性)
            section_number = flat_idx + 1 if any(s[2] is not None for s in expanded) else section.get("section_number", orig_idx + 1)
            scene = section.get("scene", "")
            characters = section.get("characters", "")
            shots = section.get("shots", [])
            
            # 重组为文本格式
            lines = []
            if scene:
                lines.append(f"场景：{scene}")
            if characters:
                lines.append(f"人物：{characters}")
            
            for shot in shots:
                if not isinstance(shot, dict):
                    continue

                shot_number = shot.get("shot_number", shot.get("scene_number", 1))
                camera = shot.get("camera", "")
                # V2 新增字段
                timecode = shot.get("timecode", "")
                subject = shot.get("subject", "")
                background = shot.get("background", "")
                # 向下兼容旧字段
                description = shot.get("description", "")
                dialogue = shot.get("dialogue", "")

                shot_text = f"镜号{shot_number}:"
                if timecode:
                    shot_text += f"[{timecode}] "
                if camera:
                    shot_text += f"【{camera}】"

                # 主体:V2 用 subject,旧版用 description
                visual = subject or description
                if visual:
                    shot_text += visual
                # V2 专有:独立 background 字段(如与 subject 不同)
                if background and background != visual:
                    shot_text += f"。背景:{background}"

                # dialogue 兼容 dict(V2)和 string(旧版)两种形式
                if dialogue:
                    if isinstance(dialogue, dict):
                        sp = dialogue.get("speaker", "")
                        ct = dialogue.get("content", "")
                        tn = dialogue.get("tone", "")
                        if ct:
                            prefix = f"{sp}({tn})" if sp and tn else (sp or "")
                            if prefix:
                                shot_text += f' "{prefix}: {ct}"'
                            else:
                                shot_text += f' "{ct}"'
                    elif isinstance(dialogue, str):
                        shot_text += f' "{dialogue}"'

                shot_text += ";"
                lines.append(shot_text)

            # 末尾追加本小节总时长(供用户在即梦界面手动设置视频时长)
            # 只在 shots 能解析出时间码时追加,旧模板无 timecode 的保持原样
            total_duration = StoryboardService._calc_section_duration(shots)
            if total_duration is not None and total_duration > 0:
                # 即梦平台只接受整数秒视频时长,统一向上取整
                # ceil 而不是 round 是为了不丢最后画面(14.5→15 而不是 14.5→14)
                # 但不能超过 15 秒红线(即梦上限)
                import math
                dur_int = min(15, math.ceil(total_duration))
                lines.append(f"📏 本小节总时长:{dur_int} 秒")

            full_text = "\n".join(lines)

            result.append({
                "section_number": section_number,
                "section_info": {
                    "scene": scene,
                    "characters": characters
                },
                "full_text": full_text,
                # 保留 shots 原始结构和 state_snapshot,供后续 end_state 提取用
                "_shots_raw": shots,
                "_state_snapshot": section.get("state_snapshot"),
                # 优先使用模板直接输出的 end_state(零额外 LLM 调用)
                "_end_state": section.get("end_state"),
            })

        return result
    
    @staticmethod
    def _postprocess_text_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """对 text 格式的 sections 做 15s 拆分 + 时间码归零 + 追加总时长

        输入:[{section_number, section_info{scene,characters}, full_text}, ...]
        输出:同结构,但 full_text 中:
          - 每小节的镜号行时间码归零从 00:00 起
          - 超过 15s 的小节会拆成多个子小节,section_number 按顺序重编号
          - 末尾追加"📏 本小节总时长:X 秒"

        策略:逐行扫描每个 section 的 full_text,
          - 识别镜号行(正则匹配 "镜号N" + "[MM:SS-MM:SS]" 时间码)
          - 非镜号行作为"头部元数据"(场景/人物等)
          - 按累计时长 ≤ 15s 切分镜号行,超长就另起子小节

        若 full_text 里压根没有 timecode 格式的镜号行,完全保持原样(兼容旧模板)。
        """
        import re
        # 时间码后允许有描述内容(如色温/光源)直到 ] 关闭
        # 例 "[00:13-00:16 · 4500K 阴天窗光+冷调日光灯]" 也要匹配
        shot_line_pattern = re.compile(r'^(镜号\d+[:：].*?\[(\d{1,2}:\d{1,2}(?:\.\d+)?)-(\d{1,2}:\d{1,2}(?:\.\d+)?)[^\]]*\])(.*)$')
        # 兜底: LLM 经常输出 "镜号1 (3.5秒):" 或 "镜号1 (3秒):" 这种时长简写格式
        # 没有时间码就用累计起点逻辑反推时间码
        duration_short_pattern = re.compile(r'^(镜号\d+)\s*[\(（](\d+(?:\.\d+)?)\s*秒[\)）]\s*[:：](.*)$')
        max_sec = StoryboardService.MAX_SECTION_DURATION_SEC
        result = []

        def tc_to_sec(s: str) -> float:
            m, sec = s.split(':')
            return int(m) * 60 + float(sec)

        def sec_to_tc(sec: float) -> str:
            mm = int(sec // 60)
            ss = sec - mm * 60
            if abs(ss - round(ss)) < 0.05:
                return f"{mm:02d}:{int(round(ss)):02d}"
            return f"{mm:02d}:{ss:04.1f}"

        for section in sections:
            full_text = section.get("full_text", "") or ""
            header_lines = []
            shot_entries = []  # [(prefix, start_sec, end_sec, suffix), ...]

            # 用一个累计起点变量,处理 "(X秒)" 格式时反推时间码
            running_sec = 0.0
            for raw_line in full_text.split('\n'):
                line = raw_line.rstrip()
                stripped = line.lstrip()
                m = shot_line_pattern.match(stripped)
                if m:
                    # 标准格式: 镜号N: ... [MM:SS-MM:SS]
                    prefix_to_bracket = m.group(1)
                    s_sec = tc_to_sec(m.group(2))
                    e_sec = tc_to_sec(m.group(3))
                    suffix_after = m.group(4)
                    shot_entries.append((prefix_to_bracket, s_sec, e_sec, suffix_after))
                    running_sec = max(running_sec, e_sec)
                    continue

                m2 = duration_short_pattern.match(stripped)
                if m2:
                    # 简写格式: 镜号N (X秒):xxx
                    # 用累计起点反推时间码,转成标准格式
                    shot_label = m2.group(1)        # "镜号1"
                    dur = float(m2.group(2))        # 3.5
                    suffix_after = m2.group(3)      # 后面所有内容
                    s_sec = running_sec
                    e_sec = running_sec + dur
                    new_prefix = f"{shot_label}: [{sec_to_tc(s_sec)}-{sec_to_tc(e_sec)}]"
                    shot_entries.append((new_prefix, s_sec, e_sec, suffix_after))
                    running_sec = e_sec
                    continue

                # 非镜号行
                if shot_entries:
                    last_prefix, ls, le, last_suffix = shot_entries[-1]
                    shot_entries[-1] = (last_prefix, ls, le, last_suffix + "\n" + raw_line)
                else:
                    header_lines.append(raw_line)

            # ★ 去重"场景起始状态" 块的重复输出
            # 根因:LLM 同时收到模板"节头要写场景起始状态"和后端注入的"复制粘贴老状态",
            #      偶尔会写两次 — 第一次是抄注入的老状态,第二次是按模板要本节起点
            # 策略:扫 header_lines,识别每个"场景起始状态:"+ 其下连续的"  角色 = ..."缩进行
            #      合并成一个块。如果有 ≥2 个块,仅保留最末尾那个(挨着【场景标头】的就是本节真正起点)
            header_lines = _dedupe_start_state_blocks(header_lines)
            # 2026-05:再清"块后空行隔开的同名重复行"(_dedupe_start_state_blocks 抓不到的残留)
            header_lines = _dedupe_same_name_state_lines(header_lines)

            # 若没有任何带 timecode 的镜号,原样放回
            if not shot_entries:
                # 但 header 已可能去重过,如果原文有去重发生需要把改后的 full_text 写回
                section = dict(section)
                section["full_text"] = "\n".join(header_lines).rstrip() + "\n"
                result.append(section)
                continue

            # 按累计 ≤ 15s 切组
            groups = []
            current = []
            base = None
            for entry in shot_entries:
                _, s, e, _ = entry
                if not current:
                    current = [entry]
                    base = s
                else:
                    if (e - base) <= max_sec:
                        current.append(entry)
                    else:
                        groups.append(current)
                        current = [entry]
                        base = s
            if current:
                groups.append(current)

            # 为每组生成一个子 section
            for group in groups:
                group_base = group[0][1]  # 起始秒作为归零基准
                group_end = group[-1][2]
                duration = group_end - group_base

                new_lines = list(header_lines)  # 复制场景/人物等
                # 渲染每个镜号行(归零 timecode + 镜号重新从 1 编号)
                for new_shot_idx, (prefix, s, e, suffix) in enumerate(group, start=1):
                    new_s = s - group_base
                    new_e = e - group_base
                    # 重编号:把 "镜号<原数字>" 替换成 "镜号<新序号>"
                    prefix = re.sub(r'^镜号\d+', f'镜号{new_shot_idx}', prefix)
                    # 替换原时间码部分(只替换时间码数字,保留后面的描述如"· 4500K 阴天窗光")
                    # 用 capture group 保留非数字部分
                    old_tc_match = re.search(
                        r'\[(\d{1,2}:\d{1,2}(?:\.\d+)?)-(\d{1,2}:\d{1,2}(?:\.\d+)?)([^\]]*)\]',
                        prefix
                    )
                    if old_tc_match:
                        tail_meta = old_tc_match.group(3)  # 如 " · 4500K 阴天窗光"
                        new_tc = f"[{sec_to_tc(new_s)}-{sec_to_tc(new_e)}{tail_meta}]"
                        new_prefix = prefix[:old_tc_match.start()] + new_tc + prefix[old_tc_match.end():]
                    else:
                        new_prefix = prefix
                    new_lines.append(new_prefix + suffix)

                # 追加总时长(即梦只接受整数秒,统一向上取整,不超过 15 秒上限)
                if duration > 0:
                    import math
                    dur_int = min(15, math.ceil(duration))
                    # 先清理 new_lines 里已有的"📏 本小节总时长"行(LLM 可能已输出),防重复
                    new_lines = [l for l in new_lines if not re.match(r'^\s*📏\s*本小节总时长', l or '')]
                    new_lines.append(f"📏 本小节总时长:{dur_int} 秒")

                new_section = dict(section)
                # 再次兜底去重(不论拆节与否都保证只有一行 📏)
                full_text_out = "\n".join(new_lines).strip()
                _lines_dedupe = []
                _seen_dur_idx = None
                for _l in full_text_out.split('\n'):
                    if re.match(r'^\s*📏\s*本小节总时长', _l):
                        if _seen_dur_idx is not None:
                            _lines_dedupe[_seen_dur_idx] = None
                        _seen_dur_idx = len(_lines_dedupe)
                    _lines_dedupe.append(_l)
                full_text_out = '\n'.join(l for l in _lines_dedupe if l is not None)
                new_section["full_text"] = full_text_out
                result.append(new_section)

        # 重新按顺序编号
        if any(s.get("section_number") for s in result):
            for i, s in enumerate(result, 1):
                s["section_number"] = i

        # ══════════════════════════════════════════════════════════
        # 📏 最终兜底:
        #   1) 全局去重,保证每节只有 1 个 📏 本小节总时长
        #   2) cap 到 15 秒(即梦平台硬上限)
        #      LLM 经常无视模板要求写出 18/20/25 秒,这里强制截断
        # ══════════════════════════════════════════════════════════
        DUR_LINE_RE = re.compile(r'^\s*📏\s*本小节总时长[:：]\s*(\d+(?:\.\d+)?)\s*秒\s*$')
        for s in result:
            ft = s.get("full_text", "")
            lines_in = ft.split('\n')
            keep_idx = None
            for i in range(len(lines_in) - 1, -1, -1):
                if DUR_LINE_RE.match(lines_in[i]):
                    keep_idx = i
                    break
            if keep_idx is None:
                continue

            # cap 到 15:解析数字,> 15 强制改为 15
            m = DUR_LINE_RE.match(lines_in[keep_idx])
            if m:
                try:
                    val = float(m.group(1))
                    if val > 15:
                        lines_in[keep_idx] = '📏 本小节总时长:15 秒'
                        logger.info(f"[duration-cap] 总时长 {val} > 15,cap 到 15")
                    elif val != int(val):
                        # 0.5 类小数 → 向上取整(即梦只接受整数)
                        import math
                        lines_in[keep_idx] = f'📏 本小节总时长:{min(15, math.ceil(val))} 秒'
                except Exception:
                    pass

            # 去重:删除非 keep_idx 的同类行
            s["full_text"] = '\n'.join(
                l for i, l in enumerate(lines_in)
                if not (DUR_LINE_RE.match(l) and i != keep_idx)
            )

        return result

    @staticmethod
    def _parse_text_sections(text: str, custom_rules: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """
        解析纯文本格式的小节内容

        Args:
            text: 要解析的文本
            custom_rules: 可选的自定义规则(从 admin MySQL parser_rule 拉取),
                         格式: [{'type':'regex'/'delimiter', 'pattern':'...', 'priority':10, ...}, ...]
                         已按 priority 排序。如果为 None 或空,使用硬编码规则(向后兼容)。

        支持格式:
            ### 小节1: / 场景:xxx / 人物:xxx / 镜号1:...
        """
        import re
        sections = []

        # === 策略:优先用 custom_rules,fallback 到硬编码 ===
        matches = []
        dur_marker_count = len(re.findall(r'📏\s*本小节总时长', text))

        def _try_regex_rule(pattern: str, flags: int = 0):
            """尝试一条 regex 规则,返回 matches list"""
            try:
                pat = re.compile(pattern, flags)
                return list(pat.finditer(text))
            except re.error as e:
                logger.warning(f"[parse-rule] 正则编译失败 ({e}): {pattern[:80]}")
                return []

        if custom_rules:
            # 按 priority 尝试,直到匹配数 >= 📏 marker 数(或 >=1 且没 📏)
            logger.info(f"[parse-rule] 使用动态规则 {len(custom_rules)} 条")
            for rule in custom_rules:
                rtype = rule.get('type', 'regex')
                rpattern = rule.get('pattern', '')
                rname = rule.get('name', 'unnamed')
                if not rpattern:
                    continue

                if rtype == 'regex':
                    flags = re.MULTILINE if rule.get('multiline', True) else 0
                    current_matches = _try_regex_rule(rpattern, flags)
                    if len(current_matches) > len(matches):
                        matches = current_matches
                        logger.info(f"[parse-rule] 规则 '{rname}' 识别 {len(matches)} 节")
                        # 如果已经够用(>= 📏 数),提前退出
                        if dur_marker_count > 0 and len(matches) >= dur_marker_count:
                            break

                elif rtype == 'delimiter':
                    # 按分隔符硬拆:每个 delimiter 前的区块算一节
                    delim_matches = _try_regex_rule(rpattern, re.MULTILINE)
                    if delim_matches and len(delim_matches) > len(matches):
                        class _FakeMatch:
                            def __init__(self, start, num):
                                self._start = start
                                self._num = num
                            def start(self): return self._start
                            def group(self, idx=0): return str(self._num) if idx == 1 else ""
                        prev_end = 0
                        fake = []
                        for i, dm in enumerate(delim_matches):
                            fake.append(_FakeMatch(prev_end, i + 1))
                            prev_end = dm.end()
                        matches = fake
                        logger.info(f"[parse-rule] 分隔符规则 '{rname}' 硬拆 {len(matches)} 节")

            if matches:
                pass  # 已找到,跳过硬编码
            else:
                logger.warning(f"[parse-rule] 动态规则全部失败,降级到硬编码")

        # === 硬编码 fallback(向后兼容 + 兜底) ===
        if not matches:
            section_pattern = (
                r'(?:^|\n)'
                r'(?:[━═─—\-]{2,}\s*)?'               # 前置装饰线(可选)
                r'(?:#{0,3}\s*)?\*{0,2}\s*'            # Markdown 标题和加粗(可选)
                r'小节\s*(\d+)(?:\s*[-\u2010-\u2015]\s*\d+)?'  # 小节编号(支持 1 / 1-1 / 1—1 等)
                r'\s*[:：]?[^\n]{0,200}?'               # 标题文字(可选,宽到 200 字容纳"时长:14s 情节:XXX"等元信息)
                r'(?:\s*[━═─—\-]{2,})?'                # 后置装饰线(可选)
                r'\s*\*{0,2}\s*(?=\n|$)'
            )

            matches = list(re.finditer(section_pattern, text, re.MULTILINE))

        # 🆘 兜底 1:简化正则 - 如果上面匹配到的小节数量 < 内容里 📏 标记数量,说明漏了
        dur_marker_count = len(re.findall(r'📏\s*本小节总时长', text))
        if dur_marker_count > max(1, len(matches)):
            # 简化的小节头匹配:放宽边界条件,只要独占行的 "小节X" 即可
            simple_pattern = re.compile(
                r'(?:^|\n)'
                r'[`#*\-━═─—\s]*'                         # 允许任意前置装饰(code fence/标题/装饰线)
                r'小节\s*(\d+)(?:\s*[-\u2010-\u2015]\s*\d+)?'
                r'[^\n]*',                                 # 后面任意内容直到换行
                re.MULTILINE
            )
            alt_matches = list(simple_pattern.finditer(text))
            if len(alt_matches) > len(matches):
                logger.warning(
                    f"[storyboard] 主正则识别 {len(matches)} 节 < 📏 标记 {dur_marker_count} 节,"
                    f"启用简化兜底正则 → 识别 {len(alt_matches)} 节"
                )
                matches = alt_matches

        # 🆘 兜底 2:如果依然没匹配到但有 📏 标记,按 📏 硬拆
        if not matches and dur_marker_count > 0:
            # 每个 📏 marker 之后到下一个 📏 前算一节
            dur_matches = list(re.finditer(r'📏\s*本小节总时长[^\n]*\n?', text))
            if dur_matches:
                logger.warning(
                    f"[storyboard] 正则完全失败,按 📏 标记硬拆 {len(dur_matches)} 节"
                )
                # 伪造 matches:每一节的边界是"上一个 📏 结束 ~ 本 📏 结束"
                # 包装成与 re.Match 类似的接口
                class _FakeMatch:
                    def __init__(self, start, num):
                        self._start = start
                        self._num = num
                    def start(self):
                        return self._start
                    def group(self, idx=0):
                        return str(self._num) if idx == 1 else ""

                # 段起点:从 0 或上一个📏结束;段终点:当前📏结束
                matches = []
                prev_end = 0
                for i, dm in enumerate(dur_matches):
                    matches.append(_FakeMatch(prev_end, i + 1))
                    prev_end = dm.end()

        # 🆘 兜底 3:部分模板不写"小节N",而是每节直接用独占行的场景头开场:
        #   【内 大魏阴暗冷宫 深夜 · 13.5 秒 · 对峙冲突】
        # 旧逻辑只认"小节N"或📏,会把后续这种节头吞进上一节,导致界面看起来"没分小节"。
        # 这里只认独占一行的【...】,并要求像场景节头(含时长/分隔点/内外景),避免误切 镜号1:【近景...】。
        bare_scene_header_re = re.compile(r'(?m)^[ \t]*(【[^】\n]{2,180}】)[ \t]*$')
        bare_header_matches = []
        for hm in bare_scene_header_re.finditer(text or ""):
            header = hm.group(1)
            inner = header.strip("【】")
            looks_like_scene_section = (
                bool(re.search(r'\d+(?:\.\d+)?\s*秒', inner))
                or inner.startswith(('内 ', '外 ', '内·', '外·', '内/', '外/'))
                or ('·' in inner and re.search(r'(日|夜|晨|午|昏|深夜|黄昏|清晨|傍晚|午后|子时|丑时|寅时|卯时|辰时|巳时|午时|未时|申时|酉时|戌时|亥时)', inner))
            )
            if looks_like_scene_section:
                bare_header_matches.append(hm)

        if len(bare_header_matches) > max(1, len(matches)):
            class _FakeMatch:
                def __init__(self, start, num):
                    self._start = start
                    self._num = num
                def start(self):
                    return self._start
                def group(self, idx=0):
                    return str(self._num) if idx == 1 else ""

            logger.warning(
                f"[storyboard] 检测到 {len(bare_header_matches)} 个独占场景节头,按场景头兜底拆小节"
            )
            matches = [_FakeMatch(hm.start(), i + 1) for i, hm in enumerate(bare_header_matches)]

        if not matches:
            # 如果没有找到小节标记，将整个文本作为一个小节
            return [{
                "section_number": 1,
                "section_info": {"scene": "", "characters": ""},
                "full_text": text.strip()
            }]

        # 提取"文档头部"(第一个小节标记前的内容)里的 场景/人物,供后续小节缺失时继承
        # 融合版 v2 这类模板只在顶部写一次 场景/人物,后续 ━━━ 小节 X ━━━ 里不重复
        doc_header_text = text[:matches[0].start()]
        doc_scene = ""
        doc_characters = ""
        m = re.search(r'场景[：:]\s*([^\n]+)', doc_header_text)
        if m:
            doc_scene = m.group(1).strip()
        m = re.search(r'人物[：:]\s*([^\n]+)', doc_header_text)
        if m:
            doc_characters = m.group(1).strip()

        # 跟踪最近一次出现的场景/人物,用于"场景:同上"之类写法
        last_scene = doc_scene
        last_characters = doc_characters

        for i, match in enumerate(matches):
            section_number = int(match.group(1))
            start_pos = match.start()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)

            section_text = text[start_pos:end_pos].strip()

            # 提取场景和人物信息(小节内显式声明优先,没有就继承)
            scene = ""
            characters = ""

            scene_match = re.search(r'场景[：:]\s*([^\n]+)', section_text)
            if scene_match:
                scene = scene_match.group(1).strip()

            characters_match = re.search(r'人物[：:]\s*([^\n]+)', section_text)
            if characters_match:
                characters = characters_match.group(1).strip()

            # 场景写"同上"时也用上次值
            if scene in ("同上", "同前", "如上", "同场景", ""):
                scene = last_scene if last_scene else scene
            if characters in ("同上", "同前", "如上", ""):
                characters = last_characters if last_characters else characters

            # 更新最近值(供下个小节继承)
            if scene:
                last_scene = scene
            if characters:
                last_characters = characters
            
            # 清理小节标记行，保留内容 (兼容 ** 加粗 / 装饰线围起来的标记)
            # 匹配如:"小节1:" / "**小节1:**" / "### 小节1" / "━━━ 小节 1-1：xxx ━━━"
            marker_re = re.compile(
                r'^[━═─—\-#\s\*]*小节\s*\d+(?:\s*[-\u2010-\u2015]\s*\d+)?'
                r'\s*[:：]?[^━═─—\*\n]{0,200}?[━═─—\*\s]*$'  # 标题宽到 200 字
            )
            lines = section_text.split('\n')
            content_lines = []
            has_scene_line = False
            has_char_line = False
            for line in lines:
                stripped = line.strip()
                if marker_re.match(stripped):
                    continue  # 跳过整行装饰性小节标记
                if re.match(r'^场景[：:]\s*', stripped):
                    has_scene_line = True
                if re.match(r'^人物[：:]\s*', stripped):
                    has_char_line = True
                content_lines.append(line)

            # 如果小节内没写场景/人物行,而我们从文档头部继承到了,就补到正文开头
            header_lines = []
            if scene and not has_scene_line:
                header_lines.append(f"场景：{scene}")
            if characters and not has_char_line:
                header_lines.append(f"人物：{characters}")
            full_text = ("\n".join(header_lines) + "\n" if header_lines else "") + '\n'.join(content_lines).strip()
            full_text = full_text.strip()

            # 🧹 去重:LLM 偶尔会连续输出两行相同的 "📏 本小节总时长:XX 秒",只保留最后一个
            # 同样处理连续重复的 "🔗 本节结尾状态:" 开头块(仅去除多余 header 行,不去状态内容)
            def _dedupe_duration_lines(txt: str) -> str:
                import re as _re
                lines_in = txt.split('\n')
                out = []
                seen_duration_idx = None
                for i, line in enumerate(lines_in):
                    if _re.match(r'^\s*📏\s*本小节总时长', line):
                        if seen_duration_idx is not None:
                            # 删掉之前的,保留当前(最后出现的)
                            out[seen_duration_idx] = None
                        seen_duration_idx = len(out)
                    out.append(line)
                # 过滤 None
                return '\n'.join(l for l in out if l is not None)
            full_text = _dedupe_duration_lines(full_text)

            # 从 full_text 里抽 🔗 本节结尾状态 标签块(文本模板的 end_state 载体)
            # 支持两种格式(闭合标记可选):
            #   格式 A(旧版,有闭合):
            #     🔗 本节结尾状态：
            #       角色名 = 姿势·伤势·道具·情绪
            #     🔗 结尾状态结束
            #   格式 B(v7.0 新版,无闭合,到下一个空行/非缩进行/下一个 emoji 标记或文件尾停):
            #     🔗 本节结尾状态:
            #       角色名 = 姿态[...] · 伤势[...] · ...
            #       角色名 = ...
            extracted_end_state = None
            # 先试闭合格式
            m = re.search(
                r'🔗\s*本节结尾状态[:：]?\s*\n(.*?)🔗\s*结尾状态结束',
                full_text, re.DOTALL
            )
            # 如果闭合格式没匹配,试开放格式(到下一个非缩进行/空行/其他 emoji 标记/文件尾)
            if not m:
                m = re.search(
                    r'🔗\s*本节结尾状态[:：]?\s*\n'
                    r'((?:[ \t]+[^\n]+\n?)+)',  # 捕获 1+ 行缩进内容
                    full_text
                )
            if m:
                es = {}
                for line in m.group(1).split('\n'):
                    line = line.strip()
                    if not line or '=' not in line:
                        continue
                    name, val = line.split('=', 1)
                    name = name.strip().rstrip(':：').strip()
                    val = val.strip()
                    if name and val:
                        es[name] = val
                if es:
                    extracted_end_state = es
                    logger.info(f"[text-template-end-state] 小节 {section_number} 从文本标签抽出 {len(es)} 角色状态")

            section_result = {
                "section_number": section_number,
                "section_info": {
                    "scene": scene,
                    "characters": characters
                },
                "full_text": full_text,
            }
            # 文本模板用 🔗 标签输出的 end_state,走零额外 LLM 调用路径
            if extracted_end_state:
                section_result["_end_state"] = extracted_end_state
            # v3.61.219: 丢弃无任何镜号的空节。
            # LLM 偶尔输出只有节头/📏/🎬、没有镜号的空段;不过滤会变成空小节占位。
            # 只在完全找不到 镜号N / 镜头N / Shot N 时丢弃,避免误删合法文本节。
            if not StoryboardService._has_shot_marker(full_text):
                logger.warning(
                    f"[storyboard] 小节 {section_number} 无任何镜号行,判定为空节丢弃:"
                    f"{(full_text or '')[:80]!r}"
                )
                continue
            sections.append(section_result)

        # ══════════════════════════════════════════════════════════
        # 🔗 归位修正(2026-04 增强版)
        # LLM 经常把"🔗 本节结尾状态" 块输出在下一节的开头(夹在场景/人物/起始状态之间),
        # 而正则之前只用 re.match 卡死字符串起点,匹配不到夹在中间的 🔗 块。
        # 改进:用 re.search 找全篇,但只挪那些"出现在节首前 5 行内 + 该节还没出现镜号" 的,
        # 避免把节末的正常 🔗 块也错挪走。
        # ══════════════════════════════════════════════════════════
        leading_end_state = re.compile(
            r'(?:^|\n)(🔗\s*本节结尾状态[:：]?\s*\n'
            r'(?:[ \t]+[^\n]+\n?)+)',
            re.MULTILINE
        )
        # 镜号识别:认 "镜号1:" / "镜号 1 (2.5秒)：" / "Shot 1" 等开头
        shot_marker_re = re.compile(r'(?:^|\n)\s*(?:镜号|Shot)\s*\d', re.MULTILINE | re.IGNORECASE)

        for idx in range(1, len(sections)):
            curr_text = sections[idx].get("full_text", "") or ""
            m = leading_end_state.search(curr_text)
            if not m:
                continue
            block_start = m.start(1)
            # 启发式:只挪"前置 🔗 块"——也就是 🔗 之前没出现过镜号
            # 镜号已经出现 = 这是节末的正常 🔗,不能动
            preceding = curr_text[:block_start]
            if shot_marker_re.search(preceding):
                continue
            # 是错位的前置 🔗 块
            end_state_block = m.group(1).rstrip()
            prev_text = sections[idx - 1].get("full_text", "").rstrip()
            # ★ 缺口修复(2026-05):只有"上一节没 🔗"时 v1 才删当前节前置块 + 追加;
            #   上一节已有 🔗 时,v1【不动当前节】,把这个前置块留给后面的 v2
            #   (_relocate_orphan_tail_fragments)去【合并】进上一节 🔗——
            #   否则像原来那样"删了又不追加" = 丢块。
            if not re.search(r'🔗\s*本节结尾状态', prev_text):
                new_curr = curr_text[:block_start] + curr_text[m.end():]
                sections[idx]["full_text"] = new_curr.lstrip()
                sections[idx - 1]["full_text"] = prev_text + "\n" + end_state_block
                logger.info(f"[🔗归位] 小节 {sections[idx].get('section_number')} 的 🔗 块(夹在节首)挪回前一节")

                # ★ 关键修复(2026-04):同步移动 _end_state 字段,修"end_state 整体错位 1 节"的 bug
                # 之前:_end_state 在 1485 行解析阶段已经从原 full_text 抽出,归位修正只动 full_text,
                #      不动 _end_state 字段 → 落库时 sections[idx]._end_state 实际是上一节内容,
                #      sections[idx-1]._end_state 是 None,导致整体错位 1 节。
                # 修复:
                #  1. 把当前节"错位的" _end_state 挪到前一节(它本来就是属于前一节的)
                #  2. 当前节(sections[idx])重新从清理后的 full_text 解析自己节末的真 🔗 块
                stale_es = sections[idx].pop("_end_state", None)
                if stale_es and not sections[idx - 1].get("_end_state"):
                    sections[idx - 1]["_end_state"] = stale_es
                    logger.info(
                        f"[🔗归位] 同时把 _end_state(角色:{list(stale_es.keys())}) 挪到前一节"
                    )
                # 当前节重新解析自己节末的 🔗 块(如果有)
                # 用同样两种格式(闭合 / 开放),跟解析阶段保持一致
                _new_curr_text = sections[idx]["full_text"]
                _m2 = re.search(
                    r'🔗\s*本节结尾状态[:：]?\s*\n(.*?)🔗\s*结尾状态结束',
                    _new_curr_text, re.DOTALL
                )
                if not _m2:
                    _m2 = re.search(
                        r'🔗\s*本节结尾状态[:：]?\s*\n((?:[ \t]+[^\n]+\n?)+)',
                        _new_curr_text
                    )
                if _m2:
                    _es2 = {}
                    for line in _m2.group(1).split('\n'):
                        line = line.strip()
                        if not line or '=' not in line:
                            continue
                        _name, _val = line.split('=', 1)
                        _name = _name.strip().rstrip(':：').strip()
                        _val = _val.strip()
                        if _name and _val:
                            _es2[_name] = _val
                    if _es2:
                        sections[idx]["_end_state"] = _es2
                        logger.info(
                            f"[🔗归位] 当前节重新从节末解析到 _end_state: {list(_es2.keys())}"
                        )

        # 🔗 归位修正 v2(2026-05):处理"🔗 标题留在上一节,只剩状态行 + 🎬 残片漏到下一节头"
        # 以及"上一节已有 🔗 需合并"的场景(v1 抓不到、会丢状态)。详见函数 docstring。
        sections = _relocate_orphan_tail_fragments(sections)

        # ══════════════════════════════════════════════════════════
        # 📏 全局兜底去重:不管在哪个位置的 📏,每节只保留最后一个
        # ══════════════════════════════════════════════════════════
        for s in sections:
            ft = s.get("full_text", "")
            lines_in = ft.split('\n')
            keep_idx = None
            for i in range(len(lines_in) - 1, -1, -1):
                if re.match(r'^\s*📏\s*本小节总时长', lines_in[i]):
                    keep_idx = i
                    break
            if keep_idx is not None:
                s["full_text"] = '\n'.join(
                    l for i, l in enumerate(lines_in)
                    if not (re.match(r'^\s*📏\s*本小节总时长', l) and i != keep_idx)
                )

        return sections

    @staticmethod
    async def _generate_storyboards_scene_by_scene(
        novel_id: int,
        template_id: int,
        llm_config_id: int,
        scripts: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """整剧路径按剧本场景逐个生成，避免单次调用只覆盖第一个场景。

        分镜模板的输入契约是“一个剧本场景”，把多章合并后再调用会让模型
        只完成首节；逐场景调用还可以复用现有的状态链和场景边界判断。
        """
        saved_storyboards: List[Dict[str, Any]] = []
        failures: List[str] = []
        for script in scripts:
            current_script_id = script.get("id")
            scenes = StoryboardService.split_scenes_from_script(script.get("content", ""))
            for scene in scenes:
                result = await StoryboardService.generate_section_storyboards(
                    novel_id=novel_id,
                    template_id=template_id,
                    llm_config_id=llm_config_id,
                    scene_content=scene.get("content", ""),
                    scene_title=scene.get("scene_title", "未命名场景"),
                    section_number=1,
                    script_id=current_script_id,
                    scene_index=scene.get("index", 0),
                    inherit_prev_state=True,
                    cross_chapter_inherit=True,
                    with_character_state=True,
                )
                if result.get("success"):
                    saved_storyboards.extend(result.get("storyboards", []))
                else:
                    failures.append(
                        f"{scene.get('scene_title', '未命名场景')}: {result.get('message', '生成失败')}"
                    )

        if failures:
            return {
                "success": False,
                "count": len(saved_storyboards),
                "message": f"有 {len(failures)} 个场景生成失败: {'; '.join(failures[:3])}",
                "storyboards": saved_storyboards,
            }
        return {
            "success": True,
            "count": len(saved_storyboards),
            "message": f"按场景成功生成 {len(saved_storyboards)} 个小节",
            "storyboards": saved_storyboards,
        }

    @staticmethod
    async def generate_storyboards(
        novel_id: int,
        template_id: int,
        llm_config_id: int,
        script_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        生成分镜
        
        Args:
            novel_id: 小说ID
            template_id: 提示词模板ID
            llm_config_id: LLM配置ID
            script_id: 指定剧本ID，为None则使用所有剧本
            
        Returns:
            {
                "success": bool,
                "count": int,
                "message": str,
                "storyboards": List[Dict]
            }
        """
        logger.info(f"[storyboard] generate_storyboards 被调用: novel_id={novel_id}, template_id={template_id}, llm_config_id={llm_config_id}, script_id={script_id}")
        try:
            # 1. 获取剧本内容
            logger.info(f"[storyboard] 开始获取剧本内容: script_id={script_id}")
            if script_id:
                script = await ScriptService.get_script(script_id)
                if not script:
                    return {
                        "success": False,
                        "count": 0,
                        "message": f"剧本不存在: script_id={script_id}",
                        "storyboards": []
                    }
                script_content = script.get("content", "")
                logger.info(f"[storyboard] 获取到指定剧本内容，长度: {len(script_content)}")
            else:
                scripts_data = await ScriptService.get_scripts(novel_id)
                scripts = scripts_data.get("scripts", [])
                logger.info(f"[storyboard] 获取到 {len(scripts)} 个剧本")
                if not scripts:
                    return {
                        "success": False,
                        "count": 0,
                        "message": "该小说没有可用的剧本内容",
                        "storyboards": []
                    }
                # 整剧模板的输入契约是单场景。多章合并调用会导致模型只返回
                # 第一场景；按场景串行生成，和前端逐场景生成路径保持一致。
                scene_count = sum(
                    len(StoryboardService.split_scenes_from_script(s.get("content", "")))
                    for s in scripts
                )
                if scene_count > 1:
                    logger.info(
                        f"[storyboard] 检测到整剧 {len(scripts)} 个剧本/{scene_count} 个场景，切换逐场景生成"
                    )
                    return await StoryboardService._generate_storyboards_scene_by_scene(
                        novel_id=novel_id,
                        template_id=template_id,
                        llm_config_id=llm_config_id,
                        scripts=scripts,
                    )
                # 合并所有剧本内容
                script_content = "\n\n".join([
                    f"【{s.get('chapter_title', '未命名章节')}】\n{s.get('content', '')}"
                    for s in scripts
                ])
                logger.info(f"[storyboard] 合并后剧本内容长度: {len(script_content)}")
            
            if not script_content.strip():
                return {
                    "success": False,
                    "count": 0,
                    "message": "剧本内容为空",
                    "storyboards": []
                }
            
            # 2. 获取提示词模板(先只取元数据,绝不拉 content → 护模板)
            logger.info(f"[storyboard] 正在获取模板(meta): template_id={template_id}")
            template = await get_template_by_id(template_id, meta_only=True)
            logger.info(f"[storyboard] 模板获取结果: {template is not None}")
            if not template:
                return {
                    "success": False,
                    "count": 0,
                    "message": f"模板不存在: template_id={template_id}",
                    "storyboards": []
                }

            # 上报使用计数(预置模板才计,异步失败静默)
            try:
                from services.template_service import report_usage as _report_template_usage
                await _report_template_usage(template)
            except Exception:
                pass

            # 分镜模板上云:判定 服务端拼装 / 旧模式 / 失败(护模板)。整剧路径无状态继承,inject_block 恒空
            _asm_mode, _asm_admin_id = _storyboard_assemble_eligibility(template)
            if _asm_mode == "fail":
                return {"success": False, "count": 0, "message": _asm_admin_id, "storyboards": []}
            # 仅自建模板(legacy)才取 content 在本地拼;预置模板绝不取 content
            if _asm_mode == "legacy":
                template = await get_template_by_id(template_id)

            # 3. 解析模板变量并填充内容(预置 assemble:template_content 恒为空,本地不含模板)
            template_content = template.get("content") or ""
            variables = json.loads(template.get("variables", "[]"))

            # 构建变量映射 - 支持多种常见变量名
            variable_map = {
                "script_content": script_content,
                "content": script_content,
                "script": script_content,
                "text": script_content,
                "novel_id": str(novel_id),
                "script_id": str(script_id) if script_id else "all",
            }
            
            # 替换模板中的变量占位符（支持 {var} 和 {{var}} 两种格式）
            prompt = template_content
            has_replacement = False
            
            # 首先尝试根据模板定义的变量进行替换
            for var_name in variables:
                # 支持 {var_name} 格式
                placeholder1 = f"{{{var_name}}}"
                if placeholder1 in prompt:
                    prompt = prompt.replace(placeholder1, variable_map.get(var_name, ""))
                    has_replacement = True
                # 支持 {{var_name}} 格式
                placeholder2 = f"{{{{{var_name}}}}}"
                if placeholder2 in prompt:
                    prompt = prompt.replace(placeholder2, variable_map.get(var_name, ""))
                    has_replacement = True
            
            # 如果没有匹配到任何变量定义，尝试直接替换常见变量名
            if not has_replacement:
                for var_name, var_value in variable_map.items():
                    placeholder1 = f"{{{var_name}}}"
                    if placeholder1 in prompt:
                        prompt = prompt.replace(placeholder1, var_value)
                        has_replacement = True
                    placeholder2 = f"{{{{{var_name}}}}}"
                    if placeholder2 in prompt:
                        prompt = prompt.replace(placeholder2, var_value)
                        has_replacement = True
            
            # 如果仍然没有替换任何内容（模板中没有变量占位符），则将剧本内容追加到模板后面
            if prompt == template_content or not has_replacement:
                prompt = f"{template_content}\n\n以下是需要转换为分镜的剧本内容：\n\n{script_content}"
            
            logger.info(f"[regenerate-section] 构建的 prompt 长度: {len(prompt)}, 前200字: {prompt[:200]}")
            
            # 4. 调用大模型生成分镜
            try:
                logger.info(f"[storyboard] 准备调用 LLM: config_id={llm_config_id}")
                # 简化 system prompt，让提示词模板完全控制输出格式
                messages = [
                    {"role": "system", "content": "你是一位专业的分镜设计助手。\n\n【输出约束(必读)】\n1. 直接输出中文分镜内容,严禁输出任何思考过程(英文如 **Refining Novel to Script**、中文如 **剧本转化思考** 等加粗段落)\n2. 严禁在分镜前加任何元描述(如 'Here is the storyboard:' / '以下是分镜:' / '我来转换:')\n3. 第一个字符必须是场景标头(如 【内 xxx 日】)或节奏类型词,不允许任何前言/思考链"},
                    {"role": "user", "content": prompt}
                ]
                
                logger.info(f"[storyboard] 即将调用 call_llm, config_id={llm_config_id}")
                # 预置分镜模板走服务端拼装(整剧路径无状态继承:with_character_state=True 不追加禁止指令, inject_block 空)
                _assemble_payload = None
                if _asm_mode == "assemble":
                    _assemble_payload = _build_storyboard_assemble_payload(
                        template, _asm_admin_id, variable_map, script_content, True, "",
                    )
                response = await LLMService.call_llm_with_retry(
                    config_id=llm_config_id,
                    messages=messages,
                    timeout=600,
                    task_type="storyboard_generate",
                    novel_id=novel_id,
                    assemble_payload=_assemble_payload,
                    allow_direct_storyboard=(_asm_mode == "legacy"),
                )
                logger.info(f"[regenerate-section] LLM 调用完成，响应长度: {len(response) if response else 0}")
                if response:
                    logger.info(f"[storyboard] 响应前500字: {response[:500]}")

                if not response or not response.strip():
                    return {
                        "success": False,
                        "count": 0,
                        "message": "大模型返回空内容",
                        "storyboards": []
                    }

                # v3.61.89: 剥离 reasoning 思考链
                response = _strip_reasoning_chain(response)
                
            except Exception as e:
                logger.error(f"[regenerate-section] 调用 LLM 时发生异常: {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()
                return {
                    "success": False,
                    "count": 0,
                    "message": f"大模型调用失败: {str(e)}",
                    "storyboards": []
                }
            
            # 5. 解析大模型返回的分镜列表（按小节组织）
            logger.info(f"[storyboard] 开始解析分镜响应")
            sections_data = await StoryboardService._parse_sections_with_dynamic_rules(response)
            logger.info(f"[storyboard] 解析到 {len(sections_data)} 个小节")
            
            if not sections_data:
                return {
                    "success": False,
                    "count": 0,
                    "message": "无法解析大模型返回的分镜数据",
                    "storyboards": []
                }
            
            # 6. 构建场景标题到 scene_index + scene_type 的映射表
            scenes_from_script = StoryboardService.split_scenes_from_script(script_content)
            scene_title_to_index = {}
            scene_index_to_type = {}  # {scene_index: 'normal'/'flashback'/...}
            for scene in scenes_from_script:
                scene_title_to_index[scene['scene_title']] = scene['index']
                scene_index_to_type[scene['index']] = scene.get('scene_type', 'normal')

            # 6.5. 读 scripts.scene_meta,让用户手动标注的 scene_type 覆盖 LLM 剧本里的自动识别
            if script_id:
                db_tmp = await get_db()
                try:
                    async with db_tmp.execute("SELECT scene_meta FROM scripts WHERE id=?", (script_id,)) as cur:
                        r = await cur.fetchone()
                    if r and r["scene_meta"]:
                        try:
                            meta = json.loads(r["scene_meta"] or "{}")
                            if isinstance(meta, dict):
                                for k, v in meta.items():
                                    try:
                                        idx = int(k)
                                    except Exception:
                                        continue
                                    if isinstance(v, dict) and v.get("scene_type"):
                                        scene_index_to_type[idx] = v["scene_type"]
                                logger.info(f"[storyboard] 已应用 scripts.scene_meta 覆盖 scene_type")
                        except Exception as e:
                            logger.warning(f"[storyboard] 解析 scene_meta 失败: {e}")
                finally:
                    await db_tmp.close()

            logger.info(f"[storyboard] 场景映射表: {scene_title_to_index}")
            logger.info(f"[storyboard] 场景时间线类型(最终): {scene_index_to_type}")

            # 7. 保存分镜到数据库（每个小节作为一条记录）
            logger.info(f"[storyboard] 开始保存分镜到数据库，共 {len(sections_data)} 个小节")
            
            # 追踪每个场景的 section_number 计数器（场景内递增）
            scene_section_counter = {}  # scene_index -> 当前 section_number
            
            db = await get_db()
            try:
                saved_storyboards = []
                
                for idx, section in enumerate(sections_data):
                    logger.info(f"[storyboard] 保存小节 {idx + 1}/{len(sections_data)}")
                    
                    # 完整的小节文本内容（用户直接复制去即梦使用）
                    full_text = section.get("full_text", "")
                    if not StoryboardService._has_shot_marker(full_text):
                        logger.warning(
                            f"[storyboard] 小节 {idx + 1} 无任何镜号行,跳过保存:"
                            f"{(full_text or '')[:80]!r}"
                        )
                        continue
                    
                    # 从 section_info 或顶层提取场景和人物
                    # 注意：AI 返回的格式可能是 JSON 或文本，字段位置不同：
                    # - JSON 格式：scene/characters 直接在顶层
                    # - 文本格式：scene/characters 在 section_info 中
                    section_info = section.get("section_info", {})
                    scene_name = section_info.get("scene", "") or section.get("scene", "")
                    characters_str = section_info.get("characters", "") or section.get("characters", "")
                    
                    # 人物提取（从 characters 字段或文本中）- 支持中英文逗号和顿号
                    characters = StoryboardService._normalize_characters(characters_str)
                    
                    # 防御：如果 scene_name 为空，尝试从文本中提取场景标记
                    if not scene_name and full_text:
                        scene_match = re.search(r'[【\[]([^】\]]+)[】\]]', full_text)
                        if scene_match:
                            scene_name = StoryboardService.normalize_scene_title(scene_match.group(0))
                            logger.warning(f"[storyboard] 从文本提取场景名: '{scene_name}'")
                    
                    # 构建完整的 section_info（确保包含 scene 和 characters）
                    final_section_info = {
                        "scene": scene_name,
                        "characters": characters_str
                    }
                    
                    characters_json = json.dumps(characters)
                    scenes_json = json.dumps([scene_name] if scene_name else [])
                    props_json = json.dumps([])
                    section_info_json = json.dumps(final_section_info)
                    
                    # 匹配 scene_index：先精确匹配，再模糊匹配
                    matched_scene_index = scene_title_to_index.get(scene_name)
                    if matched_scene_index is None and scene_name:
                        for title, idx_val in scene_title_to_index.items():
                            if scene_name in title or title in scene_name:
                                matched_scene_index = idx_val
                                break
                    # 生成结果必须可持久化:启动清理会删除 NULL scene_index 的脏分镜。
                    # 当 LLM 场景标题与剧本标题无法匹配时,用本次合并结果的稳定序号兜底。
                    if matched_scene_index is None:
                        matched_scene_index = idx
                    
                    # 根据 matched_scene_index 确定 section_number（场景内递增）
                    if matched_scene_index is not None:
                        if matched_scene_index not in scene_section_counter:
                            scene_section_counter[matched_scene_index] = 0
                        scene_section_counter[matched_scene_index] += 1
                        section_number = scene_section_counter[matched_scene_index]
                    else:
                        # 如果没有匹配到场景，使用全局索引作为备用
                        section_number = idx + 1
                    
                    # 从场景映射表拿 scene_type
                    scene_type_val = scene_index_to_type.get(matched_scene_index, 'normal') if matched_scene_index is not None else 'normal'
                    logger.info(f"[storyboard] 小节 {idx + 1} 场景 '{scene_name}' -> scene_index={matched_scene_index}, section_number={section_number}, scene_type={scene_type_val}")

                    cursor = await db_execute_with_retry(
                        db,
                        """
                        INSERT INTO storyboards
                        (novel_id, script_id, scene_number, description, prompt,
                         characters, scenes, props, sort_order, section_number, section_info, scene_index, template_id, scene_type, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (novel_id, script_id, 1, full_text, full_text,
                         characters_json, scenes_json, props_json, idx, section_number, section_info_json, matched_scene_index, template_id, scene_type_val, now_beijing_str())
                    )

                    storyboard_id = cursor.lastrowid
                    logger.info(f"[storyboard] 小节 {idx + 1} 保存成功，id={storyboard_id}")
                    saved_storyboards.append({
                        "id": storyboard_id,
                        "scene_number": 1,
                        "description": full_text,
                        "prompt": full_text,
                        "characters": characters,
                        "scenes": [scene_name] if scene_name else [],
                        "props": [],
                        "section_number": section_number,
                        "section_info": final_section_info
                    })
                
                await db_commit_with_retry(db)
                logger.info(f"[storyboard] 数据库 commit 成功，共保存 {len(saved_storyboards)} 个小节")
                
                return {
                    "success": True,
                    "count": len(saved_storyboards),
                    "message": f"成功生成 {len(saved_storyboards)} 个小节",
                    "storyboards": saved_storyboards
                }

            finally:
                await db.close()

        except Exception as e:
            logger.error(f"[storyboard] generate_storyboards 顶层异常: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "count": 0,
                "message": f"生成分镜失败: {str(e)}",
                "storyboards": []
            }

    @staticmethod
    async def generate_section_storyboards(
        novel_id: int,
        template_id: int,
        llm_config_id: int,
        scene_content: str,
        scene_title: str,
        section_number: int,
        script_id: Optional[int] = None,
        style_template_id: Optional[int] = None,
        scene_index: Optional[int] = None,
        inherit_prev_state: bool = True,
        cross_chapter_inherit: bool = False,
        with_character_state: bool = True,
        avoid_same_shot_size: bool = True,
    ) -> Dict[str, Any]:
        """
        为单个场景生成分镜

        Args:
            novel_id: 小说ID
            template_id: 提示词模板ID
            llm_config_id: LLM配置ID
            scene_content: 单个场景的剧本内容
            scene_title: 场景标题
            section_number: 小节编号（从1开始）
            script_id: 指定剧本ID
            scene_index: 场景在剧本中的序号（从0开始，用于精确匹配）

        Returns:
            {
                "success": bool,
                "count": int,
                "section_number": int,
                "scene_title": str,
                "storyboards": List[Dict],
                "message": str
            }
        """
        logger.info(f"[storyboard] generate_section_storyboards 被调用: novel_id={novel_id}, template_id={template_id}, section_number={section_number}, scene_title={scene_title}")

        # v3.61.91: scene_index 越界校验 — 防止前端 sceneCards 缓存过期传来超出剧本场景数的 scene_index
        # 修复 case: 剧本拆 9 个场景生成,后改成 2 场景,前端 sceneCards 没刷新点"场景 9 重新生成"
        # 后端老老实实存了 scene_index=8,UI 上冒出 #9-1 孤儿(2026-05-16)
        # v3.61.143: 校验跟拆分必须用同一套规则。
        #   老正则只数 SCENE_PATTERN 原始头,漏算 _force_soft_split_scenes(max_chars=1300, v3.61.125 加)
        #   软切产出的续标场景 → 最后那个续标场景的 scene_index 永远被误判越界
        #   → 用户报"分镜生成到最后一个场景就失败"的根因
        if scene_index is not None and script_id is not None:
            try:
                _vdb = await get_db()
                try:
                    async with _vdb.execute("SELECT content FROM scripts WHERE id=?", (script_id,)) as _vc:
                        _vrow = await _vc.fetchone()
                    if _vrow and _vrow["content"]:
                        _scene_count = len(StoryboardService.split_scenes_from_script(_vrow["content"]))
                        if _scene_count > 0 and scene_index >= _scene_count:
                            err_msg = (
                                f"scene_index={scene_index} 超出剧本实际场景数 {_scene_count} "
                                f"(剧本仅 {_scene_count} 个场景, 合法范围 0~{_scene_count-1})。"
                                f"可能原因:前端 sceneCards 缓存过期(剧本曾拆出更多场景, 后被改/重生成)。"
                                f"请刷新分镜管理页或重新选章节,前端会重建 sceneCards。"
                            )
                            logger.warning(f"[storyboard] {err_msg}")
                            return {
                                "success": False,
                                "count": 0,
                                "section_number": section_number,
                                "scene_title": scene_title,
                                "storyboards": [],
                                "message": err_msg,
                            }
                finally:
                    await _vdb.close()
            except Exception as _verr:
                logger.warning(f"[storyboard] scene_index 范围校验失败(放行): {_verr}")

        try:
            if not scene_content or not scene_content.strip():
                return {
                    "success": False,
                    "count": 0,
                    "section_number": section_number,
                    "scene_title": scene_title,
                    "storyboards": [],
                    "message": "场景内容为空"
                }

            # 1. 获取提示词模板(先只取元数据,绝不拉 content → 护模板)
            logger.info(f"[generate-section] 正在获取模板(meta): template_id={template_id}")
            template = await get_template_by_id(template_id, meta_only=True)
            if not template:
                return {
                    "success": False,
                    "count": 0,
                    "section_number": section_number,
                    "scene_title": scene_title,
                    "storyboards": [],
                    "message": f"模板不存在: template_id={template_id}"
                }

            # 上报使用计数(预置模板才计,异步失败静默)
            try:
                from services.template_service import report_usage as _report_template_usage
                await _report_template_usage(template)
            except Exception:
                pass

            # 分镜模板上云:判定 服务端拼装 / 旧模式 / 失败(护模板)
            _asm_mode, _asm_admin_id = _storyboard_assemble_eligibility(template)
            if _asm_mode == "fail":
                return {
                    "success": False, "count": 0,
                    "section_number": section_number, "scene_title": scene_title,
                    "storyboards": [], "message": _asm_admin_id,
                }
            _assemble_inject_block = ""  # 状态继承块(本地算,assemble 时单独传 admin)
            _camera_continuity = None  # 上一末镜结构化信息(完整提示词在 admin-server 拼)
            # 仅自建模板(legacy)才取 content 在本地拼;预置模板绝不取 content
            if _asm_mode == "legacy":
                template = await get_template_by_id(template_id)

            # 2. 解析模板变量并填充内容(预置 assemble:template_content 恒为空,本地不含模板)
            template_content = template.get("content") or ""
            variables = json.loads(template.get("variables", "[]"))

            # 构建变量映射 - 支持多种常见变量名
            variable_map = {
                "script_content": scene_content,
                "content": scene_content,
                "script": scene_content,
                "text": scene_content,
                "novel_id": str(novel_id),
                "script_id": str(script_id) if script_id else "all",
            }

            # 替换模板中的变量占位符（支持 {var} 和 {{var}} 两种格式）
            prompt = template_content
            has_replacement = False

            # 首先尝试根据模板定义的变量进行替换
            for var_name in variables:
                # 支持 {var_name} 格式
                placeholder1 = f"{{{var_name}}}"
                if placeholder1 in prompt:
                    prompt = prompt.replace(placeholder1, variable_map.get(var_name, ""))
                    has_replacement = True
                # 支持 {{var_name}} 格式
                placeholder2 = f"{{{{{var_name}}}}}"
                if placeholder2 in prompt:
                    prompt = prompt.replace(placeholder2, variable_map.get(var_name, ""))
                    has_replacement = True

            # 如果没有匹配到任何变量定义，尝试直接替换常见变量名
            if not has_replacement:
                for var_name, var_value in variable_map.items():
                    placeholder1 = f"{{{var_name}}}"
                    if placeholder1 in prompt:
                        prompt = prompt.replace(placeholder1, var_value)
                        has_replacement = True
                    placeholder2 = f"{{{{{var_name}}}}}"
                    if placeholder2 in prompt:
                        prompt = prompt.replace(placeholder2, var_value)
                        has_replacement = True

            # 如果仍然没有替换任何内容（模板中没有变量占位符），则将场景内容追加到模板后面
            if prompt == template_content or not has_replacement:
                prompt = f"{template_content}\n\n以下是需要转换为分镜的剧本内容：\n\n{scene_content}"

            # v3.61.229: 关闭"生成人物状态"→ 不注入前序状态 + prompt 末尾追加最高优先级禁止指令
            if not with_character_state:
                prompt = prompt + (
                    "\n\n【本次最高优先级·覆盖模板】严禁输出任何人物状态块:不要写「场景起始状态:」、"
                    "「🔗 本节结尾状态:」、以及姿态[/情绪[/伤势[/朝向关系[/持有道具[ 等状态行。"
                    "即使上文模板要求生成人物状态,本次也一律省略,只输出场景标头 + 镜号分镜内容。"
                )

            if avoid_same_shot_size:
                _camera_continuity = await _get_prev_section_tail_camera_continuity(
                    novel_id=novel_id,
                    script_id=script_id,
                    scene_index=scene_index,
                    section_number=section_number,
                    allow_cross_script=cross_chapter_inherit,
                )
                if _camera_continuity and _asm_mode == "legacy":
                    logger.info("[camera-chain] legacy 自建模板跳过本地避重提示:核心规则仅在 admin-server assemble 拼装")
                elif _camera_continuity:
                    logger.info("[camera-chain] 预置模板 assemble 模式:上一末镜信息将交由 admin-server 拼装")

            # C 方案第三层:注入上一节的 end_state 作为"强制继承·不可覆盖"指令
            # 按本节 scene_type 过滤(主线跳过回忆节,回忆节跳过主线节)
            # v3.61.229: with_character_state=False 时整段跳过(不做状态继承注入)
            if inherit_prev_state and with_character_state:
                try:
                    # 检测本节 scene_type: 从 scene_content 的 [时间线:xxx] 标签 + scripts.scene_meta
                    _probe = (scene_content or "")[:300]
                    _tag_m = re.search(r'\[\s*时间线\s*[:：]\s*(\S+?)\s*\]', _probe)
                    _cn_to_en = {
                        "主线": "normal", "正常": "normal",
                        "回忆": "flashback", "梦境": "dream", "幻觉": "vision", "平行": "parallel",
                    }
                    cur_type = _cn_to_en.get(_tag_m.group(1).strip(), "normal") if _tag_m else "normal"
                    # 读 scripts.scene_meta 覆盖
                    if script_id and scene_index is not None:
                        try:
                            _db = await get_db()
                            async with _db.execute("SELECT scene_meta FROM scripts WHERE id=?", (script_id,)) as _c:
                                _r = await _c.fetchone()
                            await _db.close()
                            if _r and _r["scene_meta"]:
                                _meta = json.loads(_r["scene_meta"] or "{}")
                                _entry = _meta.get(str(scene_index), {})
                                _user_st = _entry.get("scene_type") if isinstance(_entry, dict) else None
                                if _user_st and _user_st in ("normal", "flashback", "dream", "vision", "parallel"):
                                    cur_type = _user_st
                        except Exception:
                            pass
                    logger.info(f"[state-chain] 本节 scene_type={cur_type},查找对应类型的上节 end_state")

                    prev_state = await StoryboardService._get_prev_section_end_state(
                        novel_id=novel_id,
                        script_id=script_id,
                        scene_index=scene_index,
                        section_number=section_number,
                        allow_cross_script=cross_chapter_inherit,
                        current_scene_type=cur_type,
                    )
                    if prev_state:
                        from services.state_extractor_service import format_state_for_prompt
                        # v3.59.57:按本节剧本里实际提到的角色过滤注入
                        # 累积层 prev_state 保留全场角色,注入层只喂相关角色给 LLM
                        # 防止 LLM 看到全场状态就把全场都写进节头
                        all_chars_in_novel = []
                        try:
                            async with (await get_db()) as _cdb:
                                async with _cdb.execute(
                                    "SELECT name FROM extracted_elements WHERE novel_id=? AND element_type='character'",
                                    (novel_id,)
                                ) as _cc:
                                    all_chars_in_novel = [r[0] for r in await _cc.fetchall() if r[0]]
                        except Exception:
                            pass

                        # v3.61.241: 场景/时间线边界检测 — 换场景或主线/回忆切换时,
                        # 只允许伤势弱继承。查询失败也保守断开,避免把上一场姿态/朝向强灌进来。
                        # v3.61.250: 提取本节场景基名,供"同名续场景不 break"判据。
                        #   (续N) 在【】外,SCENE_PATTERN 只取【】内 → normalize 后是干净基名。
                        _cur_scene_m = (
                            StoryboardService.SCENE_PATTERN.search(scene_content or "")
                            or StoryboardService.SCENE_PATTERN_GENERAL.search(scene_content or "")
                        )
                        _cur_scene_name = (
                            StoryboardService.normalize_scene_title(_cur_scene_m.group(0))
                            if _cur_scene_m else ""
                        )
                        _scene_boundary_break, _diag_prev_si, _diag_prev_type = await _detect_scene_boundary_break(
                            novel_id=novel_id,
                            script_id=script_id,
                            scene_index=scene_index,
                            section_number=section_number,
                            scene_type=cur_type,
                            current_scene_name=_cur_scene_name,
                        )
                        logger.info(
                            f"[state-chain] 边界检测 cur_type={cur_type}, scene_index={scene_index}, "
                            f"prev_si={_diag_prev_si}, prev_type={_diag_prev_type}, novel_id={novel_id}, "
                            f"script_id={script_id}, scene_boundary_break={_scene_boundary_break}"
                        )

                        # v3.61.221: 时辰/时间变化也触发"弱继承·只留伤势"(Q2=A,不限是否跨场景)
                        _time_changed = (
                            await _detect_time_slot_change(novel_id, script_id, scene_index, section_number, scene_content)
                            if cur_type == "normal" else False
                        )
                        _break_inherit = _scene_boundary_break or _time_changed

                        inject_block = format_state_for_prompt(
                            prev_state,
                            scene_content=scene_content,
                            all_character_names=all_chars_in_novel,
                            is_scene_change=_break_inherit,
                        )
                        if inject_block:
                            prompt = prompt + "\n\n" + inject_block
                            _assemble_inject_block = inject_block  # assemble 模式单独传给 admin
                            mentioned_now = [c for c in (prev_state or {}).keys() if c and c in scene_content]
                            kept_now = [c for c in mentioned_now if c in prev_state]
                            if _break_inherit:
                                _why = "时辰变化" if _time_changed and not _scene_boundary_break else "场景/时间线变化"
                                logger.info(f"[state-chain] {_why}(scene_index={scene_index}),"
                                            f"注入'弱继承·只传伤势'块({len(kept_now)} 角色) → prompt")
                            else:
                                logger.info(f"[state-chain] 累积 {len(prev_state)} 角色,本节剧本提及并注入 {len(kept_now)} 角色 → prompt")
                        else:
                            if _break_inherit:
                                _why = "时辰变化" if _time_changed and not _scene_boundary_break else "场景/时间线变化"
                                logger.info(f"[state-chain] {_why}(scene_index={scene_index}),"
                                            f"无伤无累积可注入,LLM 完全独立生成")
                            else:
                                logger.info(f"[state-chain] 累积 {len(prev_state)} 角色,本节剧本未提及任何累积角色,跳过注入")
                except Exception as e:
                    logger.warning(f"[state-chain] 获取/注入上节状态失败,本节按独立生成处理: {e}")

            logger.info(f"[regenerate-section] 构建的 prompt 长度: {len(prompt)}, 前200字: {prompt[:200]}")

            # 3. 调用大模型生成分镜
            # 使用 skip_auto_log_update=True 让我们控制日志状态更新的时机
            # 这样只有在数据成功保存后才标记日志为 success
            from services.log_service import LogService
            
            log_id = None
            token_info = None
            try:
                print("[DEBUG] 准备调用 LLM: config_id={}".format(llm_config_id))
                # 简化 system prompt，让提示词模板完全控制输出格式
                messages = [
                    {"role": "system", "content": "你是一位专业的分镜设计助手。\n\n【输出约束(必读)】\n1. 直接输出中文分镜内容,严禁输出任何思考过程(英文如 **Refining Novel to Script**、中文如 **剧本转化思考** 等加粗段落)\n2. 严禁在分镜前加任何元描述(如 'Here is the storyboard:' / '以下是分镜:' / '我来转换:')\n3. 第一个字符必须是场景标头(如 【内 xxx 日】)或节奏类型词,不允许任何前言/思考链"},
                    {"role": "user", "content": prompt}
                ]

                # 预置分镜模板:走服务端拼装(模板明文不出客户端);自建模板 _assemble_payload=None 走旧模式
                _assemble_payload = None
                if _asm_mode == "assemble":
                    _assemble_payload = _build_storyboard_assemble_payload(
                        template, _asm_admin_id, variable_map, scene_content,
                        with_character_state, _assemble_inject_block, _camera_continuity,
                    )

                print("[DEBUG] 即将调用 call_llm, config_id={}".format(llm_config_id), flush=True)
                # 使用 skip_auto_log_update=True，让 generate_section_storyboards 控制日志状态
                result = await LLMService.call_llm_with_retry(
                    config_id=llm_config_id,
                    messages=messages,
                    timeout=600,
                    task_type="storyboard_generate",
                    novel_id=novel_id,
                    source_id=script_id,
                    source_type="storyboard",
                    source_scene_index=scene_index,
                    skip_auto_log_update=True,
                    assemble_payload=_assemble_payload,
                    allow_direct_storyboard=(_asm_mode == "legacy"),
                )
                # 返回值为 (content, log_id, token_info)
                response = result[0]
                log_id = result[1]
                token_info = result[2]
                
                print("[DEBUG] LLM 调用完成，响应长度: {}".format(len(response) if response else 0), flush=True)
                if response:
                    print("[DEBUG] 响应前500字: {}".format(response[:500]), flush=True)

                if not response or not response.strip():
                    # 更新日志为成功但空内容
                    if log_id:
                        await LogService.update_log_success(
                            log_id=log_id,
                            output_content="",
                            input_tokens=token_info.get("input_tokens", 0),
                            output_tokens=token_info.get("output_tokens", 0),
                            total_tokens=token_info.get("total_tokens", 0)
                        )
                    return {
                        "success": False,
                        "count": 0,
                        "section_number": section_number,
                        "scene_title": scene_title,
                        "storyboards": [],
                        "message": "大模型返回空内容"
                    }

                # v3.61.89: 剥离 reasoning 思考链
                response = _strip_reasoning_chain(response)
                # v3.61.229: 关闭"生成人物状态"→ 兜底剥掉所有状态块(防模型仍输出)
                if not with_character_state:
                    response = _strip_state_blocks(response)

            except Exception as e:
                print("[ERROR] 调用 LLM 时发生异常: {}: {}".format(type(e).__name__, str(e)), flush=True)
                import traceback
                traceback.print_exc()
                # 注意：call_llm 内部已经在异常时更新了日志为 error
                return {
                    "success": False,
                    "count": 0,
                    "section_number": section_number,
                    "scene_title": scene_title,
                    "storyboards": [],
                    "message": "大模型调用失败: {}".format(str(e))
                }

            # 4. 解析大模型返回的分镜列表（按小节组织）
            print("[DEBUG] 开始解析分镜响应", flush=True)
            sections_data = await StoryboardService._parse_sections_with_dynamic_rules(response)
            print("[DEBUG] 解析到 {} 个小节".format(len(sections_data)), flush=True)

            if not sections_data:
                # 解析失败，更新日志为 error
                if log_id:
                    await LogService.update_log_error(log_id=log_id, error_message="无法解析大模型返回的分镜数据")
                return {
                    "success": False,
                    "count": 0,
                    "section_number": section_number,
                    "scene_title": scene_title,
                    "storyboards": [],
                    "message": "无法解析大模型返回的分镜数据"
                }

            # 5. 删除该场景的旧分镜数据（使用 scene_index 精确匹配）
            # 先备份旧分镜的视频相关字段，按顺序映射以便恢复
            db = await get_db()
            old_media_data = []  # 存储旧分镜的媒体字段，按section_number排序
            try:
                # 使用 scene_index 精确匹配旧分镜
                logger.info(f"[storyboard] 查询 scene_index={scene_index} 的旧分镜")
                
                # 查询该场景下已有的分镜ID及其媒体字段，按section_number排序
                cursor = await db.execute(
                    """
                    SELECT id, section_number, video_status, video_url, submit_id,
                           scene_image_url, audio_url, style_prompt
                    FROM storyboards 
                    WHERE novel_id = ? AND script_id = ? AND scene_index = ?
                    ORDER BY sort_order, id
                    """,
                    (novel_id, script_id, scene_index)
                )
                rows = await cursor.fetchall()
                existing_ids = []
                for row in rows:
                    existing_ids.append(row[0])
                    # 备份媒体字段
                    old_media_data.append({
                        "id": row[0],
                        "section_number": row[1],
                        "video_status": row[2],
                        "video_url": row[3],
                        "submit_id": row[4],
                        "scene_image_url": row[5],
                        "audio_url": row[6],
                        "style_prompt": row[7]
                    })
                            
                logger.info(f"[storyboard] 备份了 {len(old_media_data)} 个旧分镜的媒体字段")
                            
                # 删除这些旧分镜
                if existing_ids:
                    placeholders = ','.join(['?' for _ in existing_ids])
                    await db_execute_with_retry(
                        db,
                        f"DELETE FROM storyboards WHERE id IN ({placeholders})",
                        tuple(existing_ids)
                    )
                    # 清理关联的 llm_logs
                    await db_execute_with_retry(
                        db,
                        "DELETE FROM llm_logs WHERE novel_id = ? AND source_id = ? AND source_type = 'storyboard' AND source_scene_index = ?",
                        (novel_id, script_id, scene_index)
                    )
                    logger.info(f"[storyboard] 已清理场景 scene_index={scene_index} 的 llm_logs")
                    await db_commit_with_retry(db)
                    logger.info(f"[storyboard] 已删除场景 scene_index={scene_index} 的 {len(existing_ids)} 个旧分镜数据")
            finally:
                await db.close()

            # 6. 不再使用 match_elements 从整个场景匹配人物
            # 因为一个场景可能拆成多个小节，每个小节涉及的人物不同
            # 改为在保存每条分镜时，使用该条分镜自己的人物信息
            logger.info(f"[storyboard] 跳过场景级别的人物匹配，改用每条分镜自己的人物")

            # 7. section_number 改为场景内递增（从1开始）
            # 查询同一 scene_index 下的最大 section_number（如果已有分镜）
            db = await get_db()
            try:
                cursor = await db.execute(
                    "SELECT MAX(section_number) FROM storyboards WHERE novel_id = ? AND script_id = ? AND scene_index = ?",
                    (novel_id, script_id, scene_index)
                )
                row = await cursor.fetchone()
                existing_max_section = row[0] if row[0] is not None else 0
                logger.info(f"[storyboard] 场景 {scene_index} 现有最大 section_number: {existing_max_section}")
            finally:
                await db.close()

            # 8. 查询该小说的所有道具名（用于后续匹配）
            db = await get_db()
            try:
                cursor = await db.execute(
                    "SELECT name FROM extracted_elements WHERE novel_id = ? AND element_type = 'prop'",
                    (novel_id,)
                )
                prop_rows = await cursor.fetchall()
                all_props = [row[0] for row in prop_rows]
                logger.info(f"[storyboard] 查询到 {len(all_props)} 个道具元素: {all_props}")
            finally:
                await db.close()

            # 9. 保存分镜到数据库（每个小节作为一条记录）
            logger.info(f"[storyboard] 开始保存分镜到数据库，共 {len(sections_data)} 个小节")

            db = await get_db()
            try:
                saved_storyboards = []

                for idx, section in enumerate(sections_data):
                    # 场景内递增：从 existing_max_section + 1 开始
                    current_section_number = existing_max_section + 1 + idx
                    logger.info(f"[storyboard] 保存小节 {idx + 1}/{len(sections_data)}, scene_index={scene_index}, section_number={current_section_number}")

                    # 完整的小节文本内容（用户直接复制去即梦使用）
                    # 注意：风格提示词现在在前端实时拼接，数据库只存纯分镜内容
                    full_text = section.get("full_text", "")
                    if not StoryboardService._has_shot_marker(full_text):
                        logger.warning(
                            f"[storyboard] 场景 {scene_index} 小节 {idx + 1} 无任何镜号行,跳过保存:"
                            f"{(full_text or '')[:80]!r}"
                        )
                        continue
                    
                    # 关键修复：使用标准化后的 scene_title 存入数据库
                    # 同时去除【】括号和规范化空格
                    scene_name = StoryboardService.normalize_scene_title(scene_title)
                    
                    # 防御：如果 scene_title 为空，尝试从 AI 返回的 section_info 中提取
                    if not scene_name:
                        ai_scene = section.get("section_info", {}).get("scene", "") or section.get("scene", "")
                        if ai_scene:
                            scene_name = StoryboardService.normalize_scene_title(ai_scene)
                            logger.warning(f"[storyboard] scene_title 为空，使用 AI 返回的场景名: '{scene_name}'")
                    # 再次防御：从分镜文本中提取 【xxx】 场景标记
                    if not scene_name and full_text:
                        scene_match = re.search(r'[【\[]([^】\]]+)[】\]]', full_text)
                        if scene_match:
                            scene_name = StoryboardService.normalize_scene_title(scene_match.group(0))
                            logger.warning(f"[storyboard] 从文本提取场景名: '{scene_name}'")
                    
                    # 人物提取：优先使用 AI 返回的人物，不再从整个场景匹配
                    # AI 返回的格式可能是 JSON 或文本，characters 字段位置不同：
                    # - JSON 格式：section["characters"] 直接在顶层
                    # - 文本格式：section["section_info"]["characters"] 在 section_info 中
                    ai_chars_str = section.get("section_info", {}).get("characters", "") or section.get("characters", "")
                    
                    if ai_chars_str:
                        # AI 返回了人物列表，直接使用
                        characters = StoryboardService._normalize_characters(ai_chars_str)
                        logger.info(f"[storyboard] 小节 {idx + 1} 使用 AI 返回的人物: {characters}")
                    else:
                        # fallback: 从 description 文本的 "人物：xxx" 行提取
                        char_match = re.search(r'人物[：:]\s*(.+)', full_text)
                        if char_match:
                            characters = StoryboardService._normalize_characters(char_match.group(1))
                            logger.info(f"[storyboard] 小节 {idx + 1} 从文本提取人物: {characters}")
                        else:
                            characters = []
                            logger.info(f"[storyboard] 小节 {idx + 1} 未找到人物信息")
                    
                    characters_str = ", ".join(characters)
                    
                    # 构建 section_info，使用标准化后的 scene_title
                    section_info = {
                        "scene": scene_name,
                        "characters": characters_str
                    }

                    characters_json = json.dumps(characters)
                    scenes_json = json.dumps([scene_name] if scene_name else [])
                    # 道具匹配：检查分镜文本中是否包含道具名
                    matched_props = [p for p in all_props if p in full_text]
                    props_json = json.dumps(matched_props, ensure_ascii=False)
                    if matched_props:
                        logger.info(f"[storyboard] 小节 {idx + 1} 匹配到道具: {matched_props}")
                    section_info_json = json.dumps(section_info)

                    # 从当前 scene_content 里识别 [时间线:xxx] 标签(只看前 200 字避免误伤)
                    _scene_probe = (scene_content or "")[:200]
                    _st_tag_m = re.search(r'\[\s*时间线\s*[:：]\s*(\S+?)\s*\]', _scene_probe)
                    _cn_to_en = {
                        "主线": "normal", "正常": "normal",
                        "回忆": "flashback", "梦境": "dream", "幻觉": "vision", "平行": "parallel",
                        "normal": "normal", "flashback": "flashback", "dream": "dream",
                        "vision": "vision", "parallel": "parallel",
                    }
                    scene_type_val = _cn_to_en.get(_st_tag_m.group(1).strip().lower() if _st_tag_m else "", "normal") if _st_tag_m else "normal"
                    if _st_tag_m:
                        logger.info(f"[storyboard] 场景 {scene_index} 检测到时间线标签: {scene_type_val}")

                    # 优先用 scripts.scene_meta 里用户手动标注的(覆盖 LLM 自动识别)
                    if script_id and scene_index is not None:
                        db_meta = await get_db()
                        try:
                            async with db_meta.execute("SELECT scene_meta FROM scripts WHERE id=?", (script_id,)) as _cur:
                                _r = await _cur.fetchone()
                            if _r and _r["scene_meta"]:
                                try:
                                    _meta = json.loads(_r["scene_meta"] or "{}")
                                    _entry = _meta.get(str(scene_index), {})
                                    _user_st = _entry.get("scene_type") if isinstance(_entry, dict) else None
                                    if _user_st and _cn_to_en.get(_user_st):
                                        scene_type_val = _cn_to_en[_user_st]
                                        logger.info(f"[storyboard] 场景 {scene_index} 用户标注的 scene_type 覆盖: {scene_type_val}")
                                except Exception:
                                    pass
                        finally:
                            await db_meta.close()

                    # 使用计算出的 current_section_number，确保全局递增
                    cursor = await db_execute_with_retry(
                        db,
                        """
                        INSERT INTO storyboards
                        (novel_id, script_id, scene_number, description, prompt,
                         characters, scenes, props, sort_order, section_number, section_info, scene_index, template_id, scene_type, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (novel_id, script_id, 1, full_text, full_text,
                         characters_json, scenes_json, props_json, idx, current_section_number, section_info_json, scene_index, template_id, scene_type_val, now_beijing_str())
                    )

                    storyboard_id = cursor.lastrowid
                    logger.info(f"[storyboard] 小节 {idx + 1} 保存成功，id={storyboard_id}")
                    saved_storyboards.append({
                        "id": storyboard_id,
                        "scene_number": 1,
                        "description": full_text,
                        "prompt": full_text,
                        "characters": characters,
                        "scenes": [scene_name] if scene_name else [],
                        "props": matched_props,
                        "section_number": current_section_number,
                        "section_info": section_info,
                        "scene_index": scene_index
                    })

                await db_commit_with_retry(db)
                logger.info(f"[storyboard] 数据库 commit 成功，共保存 {len(saved_storyboards)} 个小节")

                # 8a. 状态链:提取每个新保存小节的 end_state 并写库(异步调一次廉价 LLM)
                # 失败不阻塞主流程(end_state 为 None 时后续查询会跳过)
                try:
                    await StoryboardService._extract_and_save_end_states(
                        sections_data, saved_storyboards, llm_config_id
                    )
                except Exception as e:
                    logger.warning(f"[state-chain] 提取 end_state 异常(不影响主流程): {e}")

                # 8. 恢复旧分镜的媒体字段到新分镜（按顺序对应）
                if old_media_data and saved_storyboards:
                    restored_count = 0
                    for i, new_sb in enumerate(saved_storyboards):
                        if i < len(old_media_data):
                            old_media = old_media_data[i]
                            # 只恢复有值的媒体字段
                            if old_media.get("video_status") or old_media.get("video_url") or \
                               old_media.get("submit_id") or old_media.get("scene_image_url") or \
                               old_media.get("audio_url") or old_media.get("style_prompt"):
                                await db_execute_with_retry(
                                    db,
                                    """
                                    UPDATE storyboards
                                    SET video_status = ?,
                                        video_url = ?,
                                        submit_id = ?,
                                        scene_image_url = ?,
                                        audio_url = ?,
                                        style_prompt = ?
                                    WHERE id = ?
                                    """,
                                    (
                                        old_media.get("video_status"),
                                        old_media.get("video_url"),
                                        old_media.get("submit_id"),
                                        old_media.get("scene_image_url"),
                                        old_media.get("audio_url"),
                                        old_media.get("style_prompt"),
                                        new_sb["id"]
                                    )
                                )
                                restored_count += 1
                                # 更新返回数据中的媒体字段
                                new_sb["video_status"] = old_media.get("video_status")
                                new_sb["video_url"] = old_media.get("video_url")
                                new_sb["submit_id"] = old_media.get("submit_id")
                                new_sb["scene_image_url"] = old_media.get("scene_image_url")
                                new_sb["audio_url"] = old_media.get("audio_url")
                                new_sb["style_prompt"] = old_media.get("style_prompt")
                    
                    await db_commit_with_retry(db)
                    print("[DEBUG] 已恢复 {} 个分镜的媒体字段".format(restored_count), flush=True)

                # 关键修复：只有数据成功保存后才更新日志为 success
                if log_id:
                    await LogService.update_log_success(
                        log_id=log_id,
                        output_content=response,
                        input_tokens=token_info.get("input_tokens", 0) if token_info else 0,
                        output_tokens=token_info.get("output_tokens", 0) if token_info else 0,
                        total_tokens=token_info.get("total_tokens", 0) if token_info else 0
                    )
                    print("[DEBUG] 日志 {} 已更新为 success".format(log_id), flush=True)

                return {
                    "success": True,
                    "count": len(saved_storyboards),
                    "section_number": existing_max_section + 1 if saved_storyboards else section_number,
                    "scene_title": scene_title,
                    "storyboards": saved_storyboards,
                    "message": "成功生成 {} 个小节".format(len(saved_storyboards))
                }

            finally:
                await db.close()

        except Exception as e:
            print("[ERROR] generate_section_storyboards 顶层异常: {}: {}".format(type(e).__name__, str(e)), flush=True)
            import traceback
            traceback.print_exc()
            # 如果解析或保存失败，更新日志为 error
            if log_id:
                error_msg = "分镜解析/保存失败: {}".format(str(e))
                await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                print("[DEBUG] 日志 {} 已更新为 error: {}".format(log_id, error_msg), flush=True)
            return {
                "success": False,
                "count": 0,
                "section_number": section_number,
                "scene_title": scene_title,
                "storyboards": [],
                "message": "生成分镜失败: {}".format(str(e))
            }

    @staticmethod
    async def get_storyboards(novel_id: int, script_id: int = None) -> List[Dict[str, Any]]:
        """获取某小说的所有分镜。

        2026-04 防御性变更:不传 script_id 时,**只取每个 chapter_id 下最新的 script_id 对应的 storyboards**。
        历史背景:同 chapter 可能因老版本 bug 残留多份 script,旧 script 的 storyboards 不应被显示。
        修复入口在 script_service 重新生成剧本时已清理,但 get 这里再加一层防御。
        """
        db = await get_db()
        try:
            # 如果指定了 script_id，则只查询该剧本的分镜
            # 过滤 scene_index IS NULL 的脏数据
            if script_id:
                cursor = await db.execute(
                    """
                    SELECT * FROM storyboards
                    WHERE novel_id = ? AND script_id = ? AND scene_index IS NOT NULL
                    ORDER BY scene_index, section_number, sort_order, id
                    """,
                    (novel_id, script_id)
                )
            else:
                # 不传 script_id:每个 chapter 只取最新 script_id 的 storyboards
                # SQLite 子查询:对每个 chapter 找出 max(script.id) 作为 latest_script_id
                cursor = await db.execute(
                    """
                    SELECT s.* FROM storyboards s
                    WHERE s.novel_id = ? AND s.scene_index IS NOT NULL
                      AND (
                        s.script_id IS NULL  -- 没有 script_id 的老数据保留
                        OR s.script_id IN (
                          SELECT MAX(sc.id) FROM scripts sc
                          WHERE sc.novel_id = ?
                          GROUP BY sc.chapter_id
                        )
                      )
                    ORDER BY s.scene_index, s.section_number, s.sort_order, s.id
                    """,
                    (novel_id, novel_id)
                )
            rows = await cursor.fetchall()
            
            result = []
            for row in rows:
                row_dict = dict(row)
                if not StoryboardService._has_shot_marker(row_dict.get("description") or row_dict.get("prompt") or ""):
                    logger.warning(
                        f"[storyboard] 读取时跳过无镜号空小节 id={row_dict.get('id')} "
                        f"scene_index={row_dict.get('scene_index')} section={row_dict.get('section_number')}"
                    )
                    continue
                # 解析JSON字段
                try:
                    row_dict["characters"] = json.loads(row_dict.get("characters", "[]"))
                except:
                    row_dict["characters"] = []
                try:
                    row_dict["scenes"] = json.loads(row_dict.get("scenes", "[]"))
                except:
                    row_dict["scenes"] = []
                try:
                    row_dict["props"] = json.loads(row_dict.get("props", "[]"))
                except:
                    row_dict["props"] = []
                try:
                    row_dict["excluded_props"] = json.loads(row_dict.get("excluded_props", "[]"))
                except:
                    row_dict["excluded_props"] = []
                try:
                    row_dict["excluded_audios"] = json.loads(row_dict.get("excluded_audios", "[]"))
                except:
                    row_dict["excluded_audios"] = []
                try:
                    row_dict["auto_excluded_audios"] = json.loads(row_dict.get("auto_excluded_audios", "[]") or "[]")
                except:
                    row_dict["auto_excluded_audios"] = []
                try:
                    row_dict["section_info"] = json.loads(row_dict.get("section_info", "{}"))
                except:
                    row_dict["section_info"] = {"scene": "", "characters": ""}
                # section_start_state 解析(本节起始时激活角色的状态快照)
                sss_raw = row_dict.get("section_start_state")
                if sss_raw and isinstance(sss_raw, str):
                    try:
                        row_dict["section_start_state"] = json.loads(sss_raw)
                    except:
                        row_dict["section_start_state"] = {}
                elif not row_dict.get("section_start_state"):
                    row_dict["section_start_state"] = {}
                # scene_type 默认 normal
                if not row_dict.get("scene_type"):
                    row_dict["scene_type"] = "normal"
                # 确保 section_number 有默认值
                if row_dict.get("section_number") is None:
                    row_dict["section_number"] = 1
                # 确保 style_prompt 有默认值
                if row_dict.get("style_prompt") is None:
                    row_dict["style_prompt"] = ""
                # end_state 解析(状态链)
                es_raw = row_dict.get("end_state")
                if es_raw and isinstance(es_raw, str):
                    try:
                        row_dict["end_state"] = json.loads(es_raw)
                    except:
                        row_dict["end_state"] = None
                result.append(row_dict)
            
            return result
            
        finally:
            await db.close()

    @staticmethod
    async def get_storyboards_grouped(novel_id: int, script_id: int = None) -> Dict[str, Any]:
        """获取某小说的所有分镜，按小节分组
        
        分组键为 (scene_index, section_number) 组合，确保唯一性。
        返回的 section_number 格式为 '场景号-小节号'。
        """
        storyboards = await StoryboardService.get_storyboards(novel_id, script_id)
        
        # 按 (scene_index, section_number) 组合键分组，确保唯一性
        sections_map: Dict[str, Dict[str, Any]] = {}
        
        for sb in storyboards:
            scene_index = sb.get("scene_index")
            section_number = sb.get("section_number", 1)
            section_info = sb.get("section_info", {"scene": "", "characters": ""})
            # 2026-04 防御性:分组键加 script_id,避免同 (scene_index, section_number)
            # 但属于不同 script(历史多次拆剧本)的 shots 被错塞进同一个 section 渲染
            sb_script_id = sb.get("script_id")

            if scene_index is not None:
                group_key = f"s{sb_script_id}_{scene_index}_{section_number}"
            else:
                group_key = f"s{sb_script_id}_null_{section_number}"

            if group_key not in sections_map:
                sections_map[group_key] = {
                    "section_number": section_number,
                    "scene_index": scene_index,
                    "section_info": {
                        "scene": section_info.get("scene", ""),
                        "characters": section_info.get("characters", "")
                    },
                    "shots": []
                }

            sections_map[group_key]["shots"].append(sb)
        
        # 转换为列表并按 (scene_index, section_number) 排序
        def sort_key(section):
            si = section.get("scene_index")
            sn = section.get("section_number", 1)
            # scene_index 为 null 的排在最后
            if si is None:
                return (float('inf'), sn)
            return (si, sn)
        
        sections = sorted(sections_map.values(), key=sort_key)
        
        return {
            "novel_id": novel_id,
            "sections": sections,
            "total": len(storyboards)
        }

    @staticmethod
    async def get_storyboard(storyboard_id: int) -> Optional[Dict[str, Any]]:
        """获取单个分镜"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM storyboards WHERE id = ?",
                (storyboard_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                row_dict = dict(row)
                # 解析JSON字段
                try:
                    row_dict["characters"] = json.loads(row_dict.get("characters", "[]"))
                except:
                    row_dict["characters"] = []
                try:
                    row_dict["scenes"] = json.loads(row_dict.get("scenes", "[]"))
                except:
                    row_dict["scenes"] = []
                try:
                    row_dict["props"] = json.loads(row_dict.get("props", "[]"))
                except:
                    row_dict["props"] = []
                try:
                    row_dict["excluded_props"] = json.loads(row_dict.get("excluded_props", "[]"))
                except:
                    row_dict["excluded_props"] = []
                try:
                    row_dict["excluded_audios"] = json.loads(row_dict.get("excluded_audios", "[]"))
                except:
                    row_dict["excluded_audios"] = []
                try:
                    row_dict["auto_excluded_audios"] = json.loads(row_dict.get("auto_excluded_audios", "[]") or "[]")
                except:
                    row_dict["auto_excluded_audios"] = []
                try:
                    row_dict["section_info"] = json.loads(row_dict.get("section_info", "{}"))
                except:
                    row_dict["section_info"] = {"scene": "", "characters": ""}
                # section_start_state 解析(本节起始时激活角色的状态快照)
                sss_raw = row_dict.get("section_start_state")
                if sss_raw and isinstance(sss_raw, str):
                    try:
                        row_dict["section_start_state"] = json.loads(sss_raw)
                    except:
                        row_dict["section_start_state"] = {}
                elif not row_dict.get("section_start_state"):
                    row_dict["section_start_state"] = {}
                # scene_type 默认 normal
                if not row_dict.get("scene_type"):
                    row_dict["scene_type"] = "normal"
                # 确保 section_number 有默认值
                if row_dict.get("section_number") is None:
                    row_dict["section_number"] = 1
                # 确保 style_prompt 有默认值
                if row_dict.get("style_prompt") is None:
                    row_dict["style_prompt"] = ""
                return row_dict
            return None
            
        finally:
            await db.close()

    @staticmethod
    async def update_storyboard(storyboard_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """更新分镜"""
        db = await get_db()
        try:
            # 检查分镜是否存在
            cursor = await db.execute(
                "SELECT id FROM storyboards WHERE id = ?",
                (storyboard_id,)
            )
            if not await cursor.fetchone():
                return None
            
            # 构建更新字段
            updates = []
            params = []
            
            if "description" in data:
                updates.append("description = ?")
                params.append(data["description"])
            if "prompt" in data:
                updates.append("prompt = ?")
                params.append(data["prompt"])
            # v3.61.57: 关联人物/场景/道具列表写入前先 dedup(case-insensitive,保留首次出现顺序)
            #   背景(2026-05-10):前端"批量添加 + 删除"流程在脏数据上崩坏 ——
            #     ① 历史 storyboard.props 存了 ["铜镜","彩绘纸鸢","折扇","彩绘纸鸢","彩绘纸鸢"]
            #        前端 v-for :key="prop.name" 重复 key,Vue 渲染错乱
            #     ② removeElement 用 filter(n !== name) 一次删所有同名,用户感觉"点删除没反应"
            #     ③ 删完后再批量添加同名,因为 excluded_props 里还有 → 渲染层被 skip → 用户感觉"操作成功但页面没更新"
            #   修法(写入端):
            #     - dedup chars/scenes/props
            #     - props 写入时,如果包含的 name 在当前 excluded_props 里,自动从 excluded 移除(用户改主意了)
            def _dedup_keep_first(names):
                seen = set()
                out = []
                for n in names or []:
                    if not n:
                        continue
                    key = str(n).strip().lower()
                    if not key or key in seen:
                        continue
                    seen.add(key)
                    out.append(n)
                return out

            if "characters" in data:
                updates.append("characters = ?")
                params.append(json.dumps(_dedup_keep_first(data["characters"])))
            if "scenes" in data:
                updates.append("scenes = ?")
                params.append(json.dumps(_dedup_keep_first(data["scenes"])))

            # props 和 excluded_props 要联动:incoming props 里的 name 要从 excluded 里挪走
            _props_dedup = _dedup_keep_first(data["props"]) if "props" in data else None
            if _props_dedup is not None:
                updates.append("props = ?")
                params.append(json.dumps(_props_dedup))

            if "excluded_props" in data or _props_dedup is not None:
                # 取 incoming excluded(优先)或读 DB 当前的
                if "excluded_props" in data:
                    _incoming_excluded = data["excluded_props"] or []
                else:
                    _cur = await db.execute("SELECT excluded_props FROM storyboards WHERE id = ?", (storyboard_id,))
                    _row = await _cur.fetchone()
                    try:
                        _incoming_excluded = json.loads(_row[0]) if _row and _row[0] else []
                    except Exception:
                        _incoming_excluded = []
                # dedup excluded
                _excluded_dedup = _dedup_keep_first(_incoming_excluded)
                # 把已经回到 props 里的 name 从 excluded 移除
                if _props_dedup is not None:
                    _props_lower = set(str(p).strip().lower() for p in _props_dedup)
                    _excluded_dedup = [e for e in _excluded_dedup if str(e).strip().lower() not in _props_lower]
                updates.append("excluded_props = ?")
                params.append(json.dumps(_excluded_dedup))
            if "excluded_audios" in data:
                updates.append("excluded_audios = ?")
                params.append(json.dumps(data["excluded_audios"]))
            # v3.61.136: 自动屏蔽列表(种菜模式管理)
            if "auto_excluded_audios" in data:
                updates.append("auto_excluded_audios = ?")
                params.append(json.dumps(data["auto_excluded_audios"]))
            if "section_start_state" in data:
                updates.append("section_start_state = ?")
                v = data["section_start_state"]
                if v is None:
                    params.append("{}")
                elif isinstance(v, str):
                    params.append(v)  # 已经是 JSON 字符串
                else:
                    params.append(json.dumps(v, ensure_ascii=False))
            if "scene_type" in data:
                st = data["scene_type"] or "normal"
                # 白名单校验
                if st not in ("normal", "flashback", "dream", "vision", "parallel"):
                    st = "normal"
                updates.append("scene_type = ?")
                params.append(st)
            if "sort_order" in data:
                updates.append("sort_order = ?")
                params.append(data["sort_order"])
            if "section_number" in data:
                updates.append("section_number = ?")
                params.append(data["section_number"])
            if "section_info" in data:
                updates.append("section_info = ?")
                params.append(json.dumps(data["section_info"]))
            if "style_prompt" in data:
                updates.append("style_prompt = ?")
                params.append(data["style_prompt"])
            if "end_state" in data:
                # end_state 存 JSON 字符串(None 允许)
                es = data["end_state"]
                updates.append("end_state = ?")
                params.append(json.dumps(es, ensure_ascii=False) if es else None)

            if not updates:
                return await StoryboardService.get_storyboard(storyboard_id)
            
            params.append(storyboard_id)
            
            await db.execute(
                f"UPDATE storyboards SET {', '.join(updates)} WHERE id = ?",
                params
            )
            await db.commit()
            
            return await StoryboardService.get_storyboard(storyboard_id)
            
        finally:
            await db.close()

    @staticmethod
    async def delete_storyboard(storyboard_id: int) -> bool:
        """删除单个分镜小节。

        显式清理与该小节强绑定的队列/视频日志/本地媒体，避免留下孤儿任务。
        不删除 storyboard 生成日志：那类日志通常以 script_id/scene_index 记录整场生成，
        不是单小节独占，删除单小节不应把整场生成记录删掉。
        """
        db = await get_db()
        try:
            cur = await db.execute(
                """
                SELECT id, video_url, last_frame_path, last_frame_orig_path
                FROM storyboards
                WHERE id = ?
                """,
                (storyboard_id,)
            )
            row = await cur.fetchone()
            if not row:
                return False

            media_paths = [
                row["video_url"],
                row["last_frame_path"],
                row["last_frame_orig_path"],
            ]
            for rel_path in media_paths:
                if not rel_path:
                    continue
                try:
                    abs_path = resolve_db_path(rel_path)
                    if abs_path and os.path.exists(abs_path):
                        os.remove(abs_path)
                except Exception as e:
                    logger.warning(f"[storyboard] 删除小节 {storyboard_id} 清理媒体失败 {rel_path}: {e}")

            await db.execute(
                "DELETE FROM video_task_queue WHERE storyboard_id = ?",
                (storyboard_id,)
            )
            await db.execute(
                """
                DELETE FROM llm_logs
                WHERE source_type = 'storyboard'
                  AND source_id = ?
                  AND task_type = 'video_generation'
                """,
                (storyboard_id,)
            )
            cursor = await db.execute(
                "DELETE FROM storyboards WHERE id = ?",
                (storyboard_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
            
        finally:
            await db.close()

    @staticmethod
    async def delete_storyboards_by_novel(novel_id: int, script_id: int = None) -> int:
        """
        删除小说的分镜，如果指定了script_id则只删除该章节的分镜，返回删除数量
        
        【重要】在删除分镜前会先取消所有正在运行的生成任务，防止旧任务完成后写入新分镜
        【重要】同时删除对应的llm_logs日志，防止自动恢复逻辑从旧日志恢复分镜数据
        """
        # 【关键修复】先取消正在运行的生成任务
        cancelled_count = await cancel_generation_tasks(novel_id, script_id)
        logger.info(f"[storyboard] 清空分镜前取消了 {cancelled_count} 个正在运行的生成任务")
        
        db = await get_db()
        try:
            # 1. 删除分镜数据
            if script_id:
                cursor = await db.execute(
                    "DELETE FROM storyboards WHERE novel_id = ? AND script_id = ?",
                    (novel_id, script_id)
                )
                deleted_count = cursor.rowcount
                
                # 【关键修复】同时删除该章节的llm_logs日志
                await db.execute(
                    "DELETE FROM llm_logs WHERE novel_id = ? AND source_id = ? AND source_type = 'storyboard'",
                    (novel_id, script_id)
                )
                logger.info(f"[storyboard] 删除了 {deleted_count} 条分镜记录，以及对应的llm_logs日志")
            else:
                cursor = await db.execute(
                    "DELETE FROM storyboards WHERE novel_id = ?",
                    (novel_id,)
                )
                deleted_count = cursor.rowcount
                
                # 【关键修复】同时删除该小说的所有storyboard类型llm_logs日志
                await db.execute(
                    "DELETE FROM llm_logs WHERE novel_id = ? AND source_type = 'storyboard'",
                    (novel_id,)
                )
                logger.info(f"[storyboard] 删除了 {deleted_count} 条分镜记录，以及该小说的所有storyboard类型llm_logs日志")
            
            await db.commit()
            return deleted_count
            
        finally:
            await db.close()

    @staticmethod
    async def reorder_storyboards(novel_id: int, storyboard_ids: List[int]) -> bool:
        """重新排序分镜"""
        db = await get_db()
        try:
            for idx, storyboard_id in enumerate(storyboard_ids):
                await db.execute(
                    "UPDATE storyboards SET sort_order = ? WHERE id = ? AND novel_id = ?",
                    (idx, storyboard_id, novel_id)
                )
            await db.commit()
            return True
            
        finally:
            await db.close()

    @staticmethod
    async def update_video_status(storyboard_id: int, video_status: str, video_url: str = None, fail_reason: str = None) -> bool:
        """更新分镜的视频生成状态

        fail_reason: 失败时的原因(即梦返回的 fail_reason + guidance),会存到 video_fail_reason 字段
                     状态变为非 failed 时(success/generating),自动清空 fail_reason
        """
        from utils.timezone import now_beijing_str
        db = await get_db()
        try:
            if video_url:
                await db.execute(
                    "UPDATE storyboards SET video_status = ?, video_url = ? WHERE id = ?",
                    (video_status, video_url, storyboard_id)
                )
            else:
                await db.execute(
                    "UPDATE storyboards SET video_status = ? WHERE id = ?",
                    (video_status, storyboard_id)
                )
            # 失败时写入 fail_reason;成功/生成中清空
            # v3.61.153 codex P2: download_failed 也写 fail_reason,刷新后用户能看到原因
            if video_status in ('failed', 'download_failed') and fail_reason:
                await db.execute(
                    "UPDATE storyboards SET video_fail_reason = ? WHERE id = ?",
                    (fail_reason, storyboard_id)
                )
            elif video_status in ('done', 'generating'):
                await db.execute(
                    "UPDATE storyboards SET video_fail_reason = NULL WHERE id = ?",
                    (storyboard_id,)
                )
            # 当状态变为 generating 时，记录提交时间
            if video_status == 'generating':
                await db.execute(
                    "UPDATE storyboards SET video_submit_time = ? WHERE id = ?",
                    (now_beijing_str(), storyboard_id)
                )
            await db.commit()

            # ★ 视频成功 hook:抽尾帧供下一镜接帧用(2026-04 串行尾帧模式)
            # 仅在 video_status='done' 且 video_url 是本地文件(/data/videos/xxx.mp4)时触发
            # 抽帧失败不影响主流程 — 静默 log,本镜 last_frame_path 留空
            if video_status == 'done' and video_url and isinstance(video_url, str) and video_url.startswith('/data/'):
                try:
                    await StoryboardService._extract_and_save_last_frame(storyboard_id, video_url)
                except Exception as e:
                    # 任何异常都不能影响视频本身的生成结果
                    import logging as _lg
                    _lg.getLogger(__name__).exception(f"[chain-frame] 分镜 {storyboard_id} 抽帧 hook 异常(已忽略): {e}")

            # v3.60.13 关键: 同步队列状态 — 主表 ↔ 队列 双向 1:1
            # storyboard 状态变化时,自动把对应的 active 队列项也同步过去
            try:
                await StoryboardService._sync_queue_from_storyboard(
                    storyboard_id, video_status, video_url, fail_reason
                )
            except Exception as e:
                import logging as _lg
                _lg.getLogger(__name__).warning(f"[queue-sync] 分镜 {storyboard_id} 队列同步失败(忽略): {e}")

            return True
        except Exception as e:
            print(f"更新视频状态失败: {e}")
            return False
        finally:
            await db.close()

    @staticmethod
    async def _sync_queue_from_storyboard(
        storyboard_id: int,
        video_status: str,
        video_url: Optional[str] = None,
        fail_reason: Optional[str] = None,
    ):
        """v3.60.13: 把 storyboard 状态同步到 video_task_queue
        映射规则:
        - storyboard.done → queue.done
        - storyboard.failed → queue.failed
        - storyboard.generating → queue.generating
        - storyboard.queued/pending/chain_aborted: 不动队列
        """
        from database.db import get_db as _gdb
        from utils.timezone import now_beijing_str as _now
        # 只同步终态和 generating
        target_status = None
        if video_status == "done":
            target_status = "done"
        elif video_status == "failed":
            target_status = "failed"
        elif video_status == "generating":
            target_status = "generating"
        else:
            return  # pending/queued/chain_aborted 不主动 sync

        db = await _gdb()
        try:
            cur = await db.execute(
                "SELECT id, status FROM video_task_queue "
                "WHERE storyboard_id = ? "
                "ORDER BY id DESC LIMIT 1",
                (storyboard_id,),
            )
            row = await cur.fetchone()
            if not row:
                return
            qid = row["id"]
            old_status = row["status"]
            if old_status == target_status:
                return
            if old_status in ("done", "aborted"):
                return
            now_str = _now()
            if target_status == "done":
                await db.execute(
                    "UPDATE video_task_queue SET status='done', video_url=?, "
                    "finished_at=?, error_code=NULL, error_message=NULL "
                    "WHERE id=?",
                    (video_url or "", now_str, qid),
                )
            elif target_status == "failed":
                await db.execute(
                    "UPDATE video_task_queue SET status='failed', "
                    "finished_at=?, error_code='UNKNOWN', error_message=? "
                    "WHERE id=?",
                    (now_str, (fail_reason or "未知错误")[:500], qid),
                )
            elif target_status == "generating":
                await db.execute(
                    "UPDATE video_task_queue SET status='generating', "
                    "started_at=COALESCE(started_at, ?) WHERE id=?",
                    (now_str, qid),
                )
            await db.commit()
        finally:
            await db.close()

    @staticmethod
    async def _extract_and_save_last_frame(storyboard_id: int, video_url: str) -> None:
        """从生成完成的视频末尾抽 1 帧,存为 jpg,并 UPDATE storyboards.last_frame_path。
        失败不抛异常 — 视频本身依然 done,只是无法供下一镜接帧。
        """
        import os as _os
        import logging as _lg
        from services.video_service import VideoService
        from utils.paths import get_data_dir, resolve_db_path
        log = _lg.getLogger(__name__)

        # video_url 是相对 URL '/data/videos/xxx.mp4'
        # ★ v3.59.50:用 resolve_db_path 自动按分类(videos→media_dir)拼绝对路径
        # 老版本写死 os.path.dirname(get_data_dir()),用户改了媒体保存位置后视频
        # 实际在 D:\xxx\videos 但抽帧代码去 APPDATA\小洋梦剧场\data\videos 找,
        # 找不到 → 跳过抽帧 → 尾帧入库失败 → 前端「尾帧」列空
        abs_video_path = resolve_db_path(video_url)
        if not abs_video_path or not _os.path.exists(abs_video_path):
            log.warning(f"[chain-frame] 分镜 {storyboard_id} 视频文件不存在,跳过抽帧: {abs_video_path}")
            return

        # ★ v3.59.51 修补 v3.59.50 的疏忽:之前删了 data_dir 变量赋值,
        # 但下面 frames_dir 还在引用 → NameError → 整个 hook 被外层 catch 吞 → 用户看不到尾帧
        # 尾帧固定走 data_dir(系统目录,不跟用户改的媒体目录)
        data_dir = get_data_dir()
        frames_dir = _os.path.join(data_dir, 'frames')
        _os.makedirs(frames_dir, exist_ok=True)
        # ★ v3.61.32:抽帧改成"双文件"
        #   - {sb}_last_orig.jpg:永远是无水印原图(用户下载用)
        #   - {sb}_last.jpg     :工具内展示+给即梦/方舟接帧用,按水印开关决定是否带水印
        # 这样用户下载到的永远是无水印原图,工具内仍然按设置展示带/不带水印
        orig_filename = f'storyboard_{storyboard_id}_last_orig.jpg'
        out_filename = f'storyboard_{storyboard_id}_last.jpg'
        orig_path = _os.path.join(frames_dir, orig_filename)
        out_path = _os.path.join(frames_dir, out_filename)

        vs = VideoService()
        # 先抽到 orig_path(原图)
        ok = await vs.extract_last_frame(abs_video_path, orig_path, sseof_seconds=0.5)
        if not ok:
            log.warning(f"[chain-frame] 分镜 {storyboard_id} 抽帧失败,last_frame_path 保持空")
            return

        # 把原图复制一份到 out_path(展示版),按需在副本上加水印
        try:
            import shutil as _shutil
            _shutil.copyfile(orig_path, out_path)
        except Exception as _cp_err:
            log.warning(f"[chain-frame] 分镜 {storyboard_id} 复制原图到展示版失败: {_cp_err}")
            out_path = orig_path  # 兜底,展示版直接用原图

        # ★ 2026-04 v3.59.41:如果用户开了「尾帧 AI 水印」,展示版加水印
        # 跟人物角色图一致 — 即梦审核检测到水印 = 合规标识 → 跳过涉嫌真人检查 → 降低拒绝率
        # v3.61.32:水印只打在 out_path(展示版),orig_path 永远干净留给下载
        # v3.61.46: 尾帧水印改用独立开关 KEY_LASTFRAME_WATERMARK_ENABLED(跟生图开关分离)
        try:
            from services.settings_service import (
                SettingsService,
                KEY_LASTFRAME_WATERMARK_ENABLED,
                KEY_IMAGE_WATERMARK_FACE_ENABLED,
            )
            if await SettingsService.get_bool(KEY_LASTFRAME_WATERMARK_ENABLED, default=False):
                from services.watermark_service import add_ai_watermark
                # v3.59.45:面部覆盖模式同步生效到尾帧
                face_mode = await SettingsService.get_bool(KEY_IMAGE_WATERMARK_FACE_ENABLED, default=False)
                add_ai_watermark(out_path, face_mode=face_mode)
                log.info(f"[chain-frame] 分镜 {storyboard_id} 尾帧展示版已加水印 (face_mode={face_mode}) [原图保留无水印]")
        except Exception as _wm_err:
            log.warning(f"[chain-frame] 分镜 {storyboard_id} 尾帧后处理失败(已忽略): {_wm_err}")

        rel_path = f'/data/frames/{out_filename}'
        rel_orig_path = f'/data/frames/{orig_filename}'
        # 用独立 connection 更新(主调用方的 db 已经 commit 并即将 close)
        db = await get_db()
        try:
            await db.execute(
                "UPDATE storyboards SET last_frame_path = ?, last_frame_orig_path = ? WHERE id = ?",
                (rel_path, rel_orig_path, storyboard_id)
            )
            await db.commit()
            log.info(f"[chain-frame] 分镜 {storyboard_id} 尾帧入库: {rel_path} (原图 {rel_orig_path})")
            # 2026-04 v3.59.37 回退:不再主动把尾帧写下一镜的 extra_reference_image
            # 改回老逻辑:extra_reference_image 纯用户上传,后端不污染
            # 「上一镜尾帧」用前端蓝色卡片单独展示(走 GET /api/video/storyboard/{id}/chain-prev)
            # 用户可在卡片上勾选/取消使用,描述也在卡片上编辑(per 生成单次有效)
        finally:
            await db.close()

    DEFAULT_CHAIN_FRAME_DESC = (
        "此图为上一视频的尾帧参考图,本镜从此画面故事的延续,保持场景与角色一致,不重新诠释画风/材质"
    )

    @staticmethod
    async def _auto_propagate_chain_frame_to_next(
        prev_storyboard_id: int, prev_frame_rel_path: str
    ) -> None:
        """上一镜抽完尾帧后,自动把尾帧路径 + 默认描述写到下一可接镜的 extra_reference_image / desc。

        规则:
          1. 找 prev_storyboard_id 之后最近一条同 novel/script 的镜
          2. 判定可接性:同节(scene_index+section_number 紧邻) 或 跨节同 scenes[0]
          3. 跨场景(scenes[0] 不同) → 不写
          4. 已有 extra_reference_image(用户手动上传过) → 不覆盖
          5. 自动写入时附带 _chain_frame=1 标记字段(借用 extra_reference_desc 前缀,
             用户编辑保留;但用户清掉时也可以认出来)— 简化版只看 image 是否等于该 frame 路径
        """
        import logging as _lg
        log = _lg.getLogger(__name__)

        db = await get_db()
        try:
            # 1. 取上镜元信息
            cur = await db.execute(
                "SELECT id, novel_id, script_id, scene_index, section_number, sort_order, scenes "
                "FROM storyboards WHERE id = ?",
                (prev_storyboard_id,)
            )
            prev = await cur.fetchone()
            if not prev:
                return
            try:
                prev_scenes = json.loads(prev["scenes"] or "[]")
            except Exception:
                prev_scenes = []

            # 2. 找下一镜:同 novel + 同 script(IS 比较以兼容 NULL),按 (scene_index, section_number, sort_order) 三元组
            #    取严格大于上镜的最近一条
            # v3.59.78:script_id 严格 IS 匹配,避免跨章污染
            cur = await db.execute(
                "SELECT id, scene_index, section_number, sort_order, scenes, "
                "       extra_reference_image, extra_reference_desc "
                "FROM storyboards "
                "WHERE novel_id = ? AND script_id IS ? "
                "  AND scene_index IS NOT NULL "
                "  AND ("
                "    scene_index > ?"
                "    OR (scene_index = ? AND section_number > ?)"
                "    OR (scene_index = ? AND section_number = ? AND sort_order > ?)"
                "  ) "
                "ORDER BY scene_index ASC, section_number ASC, sort_order ASC LIMIT 1",
                (
                    prev["novel_id"], prev["script_id"],
                    prev["scene_index"],
                    prev["scene_index"], prev["section_number"],
                    prev["scene_index"], prev["section_number"], prev["sort_order"],
                )
            )
            nxt = await cur.fetchone()
            if not nxt:
                log.info(f"[chain-frame-propagate] 分镜 {prev_storyboard_id} 没有下一镜,跳过")
                return

            # 3. 判定可接性
            same_scene = (prev["scene_index"] == nxt["scene_index"])
            connectable = same_scene
            if not connectable:
                try:
                    nxt_scenes = json.loads(nxt["scenes"] or "[]")
                except Exception:
                    nxt_scenes = []
                if prev_scenes and nxt_scenes and prev_scenes[0] == nxt_scenes[0]:
                    connectable = True
            if not connectable:
                log.info(
                    f"[chain-frame-propagate] 分镜 {prev_storyboard_id} → {nxt['id']} 跨场景,不传尾帧"
                )
                return

            # 4. 下一镜已有 extra_reference_image → 不覆盖
            existing_img = nxt["extra_reference_image"]
            if existing_img and existing_img != prev_frame_rel_path:
                log.info(
                    f"[chain-frame-propagate] 分镜 {nxt['id']} 已有 extra_reference_image"
                    f"({existing_img}),不覆盖"
                )
                return

            # 5. 写入:image = 上镜尾帧路径, desc = 默认文案(如果之前空) / 保留用户已编辑的
            existing_desc = nxt["extra_reference_desc"] or ""
            new_desc = existing_desc if existing_desc.strip() else StoryboardService.DEFAULT_CHAIN_FRAME_DESC

            await db.execute(
                "UPDATE storyboards SET extra_reference_image = ?, extra_reference_desc = ? "
                "WHERE id = ?",
                (prev_frame_rel_path, new_desc, nxt["id"])
            )
            await db.commit()
            log.info(
                f"[chain-frame-propagate] 已把分镜 {prev_storyboard_id} 尾帧"
                f"传递到下一镜 {nxt['id']} (extra_reference_image)"
            )
        finally:
            await db.close()

    @staticmethod
    async def update_submit_id(
        storyboard_id: int,
        submit_id: str,
        video_status: str = "generating",
        provider: Optional[str] = None,
    ) -> bool:
        """更新分镜的 submit_id 和视频状态，同时清除旧的 video_url + 旧的 fail_reason

        v3.61.18: 同时更新 video_provider — 防止跨 Tab 重新提交时 provider 字段污染
                  导致 poll-status 走错查询路径(用即梦 id 调火山方舟会"找不到资源")
        provider:
          - 'jimeng' / None:即梦 CLI 路径(默认)
          - 'volcengine_ark':火山方舟 API 路径
        """
        from utils.timezone import now_beijing_str
        db = await get_db()
        try:
            # provider 默认 jimeng(老路径不传时按即梦处理,清掉历史 ark 残留)
            effective_provider = provider or "jimeng"
            await db.execute(
                "UPDATE storyboards SET submit_id = ?, video_status = ?, video_url = NULL, "
                "video_fail_reason = NULL, video_submit_time = ?, video_provider = ? WHERE id = ?",
                (submit_id, video_status, now_beijing_str(), effective_provider, storyboard_id)
            )
            await db.commit()
            return True
        except Exception as e:
            print(f"更新 submit_id 失败: {e}")
            return False
        finally:
            await db.close()

    # ============ C 方案第二层:状态链辅助方法 ============
    @staticmethod
    async def _get_prev_section_end_state(
        novel_id: int,
        script_id: Optional[int],
        scene_index: Optional[int],
        section_number: int,
        allow_cross_script: bool = False,
        current_scene_type: str = 'normal',
    ) -> Optional[Dict[str, str]]:
        """查找当前小节之前的累积 end_state(挂起状态语义),注入到 LLM prompt。

        ★ 关键设计(2026-04 修复):
        实现"角色只要还在主线、跨场景/没离开就挂起状态"的需求 — 不是只取最近一节的 end_state,
        而是把当前节之前所有主线节的 end_state 按时序累加,每个角色取**最新一次出现的状态**,
        这样:
          - 凌瑶华 在 #1-5 站立逼视 → 写入累积
          - 凌瑶华 在 #1-6 不出场 → 累积里凌瑶华仍是"站立逼视"(挂起)
          - 凌瑶华 在 #2-1 重新登场 → 收到挂起的"站立逼视",防止 LLM 自由发挥
        老 bug:只返回单节 end_state,#1-6 那一节没凌瑶华 → 注入到 #2-1 的 prev_state 不含凌瑶华
                → LLM 没约束,按剧本暗示写"端坐太师椅"。

        按 scene_type 过滤以避免时间线污染:
        - 当前是主线(normal) → 累积所有主线节 end_state(跳过回忆/梦境/幻觉)
        - 当前是回忆/梦境/幻觉 → 只累积同类型节 end_state(平行回忆连贯),否则 None
        """
        if not script_id:
            return None

        # scene_type 过滤
        if current_scene_type == 'normal':
            type_filter = "AND (scene_type = 'normal' OR scene_type IS NULL OR scene_type = '')"
        else:
            type_filter = f"AND scene_type = '{current_scene_type}'"

        db = await get_db()
        try:
            # 累积所有"在当前节之前"的同类型节的 end_state
            # 三元组排序: scene_index → section_number → sort_order
            cur_scene_idx = scene_index if scene_index is not None else 0
            cur_section = section_number or 1

            sql = (
                f"SELECT end_state, scene_index, section_number FROM storyboards "
                f"WHERE novel_id=? AND script_id=? AND scene_index IS NOT NULL "
                f"AND ("
                f"    scene_index < ?"
                f"    OR (scene_index = ? AND section_number < ?)"
                f") "
                f"AND end_state IS NOT NULL AND end_state != '' AND end_state != '{{}}' "
                f"{type_filter} "
                f"ORDER BY scene_index ASC, section_number ASC, sort_order ASC"
            )
            params = (
                novel_id, script_id,
                cur_scene_idx,
                cur_scene_idx, cur_section,
            )

            accumulated: Dict[str, str] = {}
            count_rows = 0
            async with db.execute(sql, params) as _cur:
                async for row in _cur:
                    count_rows += 1
                    try:
                        es = json.loads(row["end_state"])
                        if isinstance(es, dict):
                            accumulated.update({k: str(v) for k, v in es.items() if v})
                    except Exception:
                        continue

            if accumulated:
                logger.info(
                    f"[state-chain] 累积主线 end_state(type={current_scene_type}): "
                    f"扫描 {count_rows} 节, 共 {len(accumulated)} 个挂起角色"
                )
                return accumulated

            # 兜底:跨章节(需用户显式允许)
            if allow_cross_script:
                async with db.execute(
                    "SELECT end_state FROM storyboards "
                    "WHERE novel_id=? AND script_id<? AND script_id IS NOT NULL "
                    "AND end_state IS NOT NULL AND end_state != '' "
                    "ORDER BY script_id DESC, scene_index DESC, section_number DESC LIMIT 1",
                    (novel_id, script_id)
                ) as cur:
                    row = await cur.fetchone()
                    if row and row["end_state"]:
                        try:
                            logger.info(f"[state-chain] 启用跨章节继承,从上一章取 end_state")
                            return json.loads(row["end_state"])
                        except Exception:
                            pass
        finally:
            await db.close()
        return None

    @staticmethod
    async def _extract_and_save_end_states(
        sections_data: List[Dict[str, Any]],
        saved_storyboards: List[Dict[str, Any]],
        llm_config_id: int,
    ):
        """为每个刚保存的小节提取并写入 end_state + section_start_state。
        优先级:
        1) 模板直接输出的 end_state(0 延迟,推荐所有模板加)
        2) LLM 提取(fallback,适用于旧模板)
        3) 代码正则抠角色名(终极兜底)
        sections_data[i] 对应 saved_storyboards[i](顺序一致)。

        同时计算 section_start_state:
        - accumulated_state: 从本节之前所有节的 end_state 累加合并(每个角色取最新快照)
        - 过滤:只保留本节 characters 字段里列出的"激活角色"
        - 保存到本节 storyboard 行的 section_start_state 字段
        """
        from services.state_extractor_service import extract_end_state
        if not saved_storyboards:
            return
        db = await get_db()
        try:
            # === 构建先导 accumulated_state: 读本批次之前已存在的 storyboards 的 end_state ===
            # 只累加 scene_type='normal' 的节,回忆/梦境/幻觉/平行 不污染主时间线
            #
            # ★ 关键修复(2026-04):用 (scene_index, section_number, sort_order) 三元组判断"在当前节之前"
            # 老 bug:只看 sort_order < first_sort,但跨场景时新场景的第 1 节 sort_order=0,
            # SQL 永远查不到任何记录(WHERE sort_order<0),导致 accumulated_state 空,
            # 所有角色被当成"首次出场",LLM 自由发挥写起始状态(详见 2026-04 截图案例:
            # 凌瑶华从 #1-5 站立逼视突变到 #2-1 端坐太师椅)
            first = saved_storyboards[0]
            first_novel_id = first.get("novel_id")
            first_script_id = first.get("script_id")
            first_scene_idx = first.get("scene_index")
            first_section_number = first.get("section_number", 1) or 1
            first_sort = first.get("sort_order", 0) or 0
            accumulated_state: Dict[str, str] = {}
            if first_novel_id is not None:
                try:
                    # v3.59.78 严重 bug 修复:script_id 匹配从 COALESCE 改为严格 IS
                    # 老 bug:COALESCE(script_id,0)=COALESCE(?,0) 把 NULL 当成 0
                    #   → 老数据 script_id=NULL 的分镜会跟新章 script_id=N 都匹配到 (0=0 / 0=COALESCE(N,0)=N)
                    #   实际表现:第 5 章生成时累积到了第 1 章的 end_state → 多出来的角色注入第 5 章节头
                    # 改用 IS:NULL 只匹配 NULL,数字只匹配同数字,各章节严格隔离
                    if first_scene_idx is not None:
                        # 三元组排序找"在当前节之前"的所有 storyboards
                        # 排序优先级: scene_index → section_number → sort_order
                        sql = (
                            "SELECT end_state, scene_type FROM storyboards "
                            "WHERE novel_id=? AND script_id IS ? "
                            "AND scene_index IS NOT NULL "
                            "AND ("
                            "    scene_index < ?"
                            "    OR (scene_index = ? AND section_number < ?)"
                            "    OR (scene_index = ? AND section_number = ? AND sort_order < ?)"
                            ") "
                            "AND end_state IS NOT NULL AND end_state!='' AND end_state!='{}' "
                            "ORDER BY scene_index ASC, section_number ASC, sort_order ASC"
                        )
                        params = (
                            first_novel_id, first_script_id,
                            first_scene_idx,
                            first_scene_idx, first_section_number,
                            first_scene_idx, first_section_number, first_sort,
                        )
                    else:
                        # scene_index 为 NULL 的旧数据,仍走老路径
                        sql = (
                            "SELECT end_state, scene_type FROM storyboards "
                            "WHERE novel_id=? AND script_id IS ? "
                            "AND sort_order<? AND end_state IS NOT NULL AND end_state!='' AND end_state!='{}' "
                            "ORDER BY sort_order ASC"
                        )
                        params = (first_novel_id, first_script_id, first_sort)
                    async with db.execute(sql, params) as cur:
                        async for row in cur:
                            st = (row["scene_type"] or "normal").lower() if "scene_type" in row.keys() else "normal"
                            if st != "normal":
                                # 非主时间线节不累加
                                continue
                            try:
                                es = json.loads(row["end_state"])
                                if isinstance(es, dict):
                                    accumulated_state.update({k: str(v) for k, v in es.items() if v})
                            except Exception:
                                pass
                    if accumulated_state:
                        logger.info(f"[state-chain] 先导累积状态(仅主时间线): {len(accumulated_state)} 个角色")
                except Exception as e:
                    logger.warning(f"[state-chain] 构建先导 accumulated_state 失败: {e}")

            # v3.61.81: 跨场景检测准备 — 查询上一节 (DB 里紧邻当前批次之前的 storyboard) 的 scene_index
            # 用途:循环里判断"本节 vs 上节"是否跨场景 (scene_index 不同 = 跨场景)
            # 跨场景时:section_start 不全盘继承 accumulated_state,只继承伤势+关键道具,其他从 description 提取
            prev_scene_index: Optional[int] = None
            # v3.61.250: 同步追踪上一节场景基名,供回写层"同名续场景不算跨场景"判据。
            prev_scene_name: str = ""
            if first_novel_id is not None and first_scene_idx is not None:
                try:
                    async with db.execute(
                        "SELECT scene_index, section_info FROM storyboards "
                        "WHERE novel_id=? AND script_id IS ? AND scene_index IS NOT NULL "
                        "AND ("
                        "    scene_index < ?"
                        "    OR (scene_index = ? AND section_number < ?)"
                        "    OR (scene_index = ? AND section_number = ? AND sort_order < ?)"
                        ") "
                        "ORDER BY scene_index DESC, section_number DESC, sort_order DESC LIMIT 1",
                        (
                            first_novel_id, first_script_id,
                            first_scene_idx,
                            first_scene_idx, first_section_number,
                            first_scene_idx, first_section_number, first_sort,
                        )
                    ) as _pc:
                        _prow = await _pc.fetchone()
                        if _prow:
                            prev_scene_index = _prow["scene_index"]
                            try:
                                prev_scene_name = (json.loads(_prow["section_info"]) or {}).get("scene", "") if _prow["section_info"] else ""
                            except Exception:
                                prev_scene_name = ""
                except Exception as _pe:
                    logger.debug(f"[state-chain] 查询上一节 scene_index 失败,prev_scene_index 留空: {_pe}")

            for i, sb in enumerate(saved_storyboards):
                sid = sb.get("id")
                if not sid:
                    continue
                if i >= len(sections_data):
                    break
                section = sections_data[i]

                # ── 1. 计算本节 section_start_state(按 scene_type 分流) ──
                # 读本节 scene_type
                section_scene_type = (sb.get("scene_type") or "normal").lower()

                try:
                    chars_raw = sb.get("characters") or "[]"
                    if isinstance(chars_raw, str):
                        active_chars = json.loads(chars_raw)
                    else:
                        active_chars = chars_raw if isinstance(chars_raw, list) else []
                except Exception:
                    active_chars = []

                # v3.59.78:跨场景污染 bug 修复
                # 老 bug:LLM 自由发挥把上一场景的角色(如医院外的"男记者女记者")也写进了
                #         本场景(手术室)的 characters 字段 → 通过 active_chars 过滤后被持久化
                # 修法:用剧本文字 (section.full_text) 核对角色名是否真出现,跟 prompt 注入层
                #         (storyboard_service.py:2126)的过滤逻辑对齐。
                #         脑补的角色没在本节剧本里出现 → 不会进 section_start_state
                _full_text_for_filter = section.get("full_text") or section.get("scene_content") or ""
                if _full_text_for_filter and active_chars:
                    _filtered_active = [c for c in active_chars if c and c in _full_text_for_filter]
                    if len(_filtered_active) != len(active_chars):
                        _dropped = [c for c in active_chars if c not in _filtered_active]
                        logger.info(
                            f"[state-chain] sb={sid} 剧本未提及但 LLM 写进 characters 的角色已剔除: {_dropped}"
                        )
                    active_chars = _filtered_active

                # 只有 normal 节继承主时间线 accumulated_state
                # flashback/dream/vision/parallel 节不继承主时间线(起始状态为空,由 LLM/用户自己设定情境)
                #
                # v3.61.81: 主线内跨场景检测
                # - 同场景下一节 (scene_index 相同) → 走老逻辑,全盘继承 accumulated_state
                # - 跨场景下一节 (scene_index 不同) → 只继承"伤势 + 关键道具"
                #   其他(姿态/朝向/情绪/普通道具)由本节 description 重新提取
                # 修复 case:闺房 (scene 1) → 大门外 (scene 2),凌婉兮被错继承为"转身坐立"
                curr_scene_index = sb.get("scene_index")
                # v3.61.250: 本节场景基名直接取 sb.section_info.scene —— 它与上节 prev_scene_name
                #   同源(都是入库时 normalize_scene_title 后的干净基名),保证两边可比。
                #   ★ 不能从 description/full_text 抽:那是分镜节头格式「内 大殿 · 古代夜 · 10秒 · 对峙」,
                #     与 DB 基名「内 大殿 夜」对不上,会让同名判据永远 False(自审 2026-06-09 实测)。
                _cur_si = sb.get("section_info") or {}
                if isinstance(_cur_si, str):
                    try:
                        _cur_si = json.loads(_cur_si) or {}
                    except Exception:
                        _cur_si = {}
                curr_scene_name = (_cur_si.get("scene", "") if isinstance(_cur_si, dict) else "") or ""
                is_scene_change_within_main = (
                    section_scene_type == "normal"
                    and prev_scene_index is not None
                    and curr_scene_index is not None
                    and curr_scene_index != prev_scene_index
                    # 同名续场景(scene_index 变但场景基名相同)不算跨场景 → 走全盘强继承。
                    and not (
                        curr_scene_name
                        and prev_scene_name
                        and curr_scene_name == prev_scene_name
                    )
                )

                if section_scene_type == "normal":
                    if is_scene_change_within_main:
                        # 跨场景:只继承"伤势"(剧情连贯) + 关键剧情道具占位,
                        # 其他字段(姿态/朝向/情绪)等 description 抽取阶段从本节剧本里补
                        section_start = {}
                        for c in active_chars:
                            if c in accumulated_state:
                                # 抽出 伤势[xxx] 段
                                inj_m = re.search(r'伤势\[([^\]]+)\]', accumulated_state[c])
                                injury = inj_m.group(1) if inj_m else None
                                if injury and injury not in ('无伤', '无', ''):
                                    # 保留伤势,其他字段填占位
                                    section_start[c] = (
                                        f"姿态[待 description 提取] · "
                                        f"伤势[{injury}] · "
                                        f"持有道具[待 description 提取] · "
                                        f"情绪[待 description 提取] · "
                                        f"朝向关系[待 description 提取]"
                                    )
                        logger.info(
                            f"[state-chain] sb={sid} 主线跨场景检测 prev_scene={prev_scene_index} → curr_scene={curr_scene_index},"
                            f"仅继承伤势({len(section_start)} 个角色),其他字段交给 description 提取"
                        )
                    else:
                        # 同场景下一节:维持现有"全盘继承 accumulated_state"逻辑(防 LLM 演绎)
                        section_start = {c: accumulated_state[c] for c in active_chars if c in accumulated_state}
                else:
                    section_start = {}
                    logger.info(
                        f"[state-chain] sb={sid} scene_type={section_scene_type},"
                        f"不继承主时间线,先尝试从 description 抽取"
                    )

                # 兜底:如果 accumulated_state 没给出 section_start(如第 1 节、首次出场的角色、
                # 或回忆节 LLM 自己写了 场景起始状态 块),从 description 文本里抽取
                # 关键不变量:accumulated_state 有的角色永远以 accumulated 为准,
                #            description 抽取的内容只用于补足 accumulated 缺失的角色
                #            (这是为了治"LLM 自作主张润色起始状态"的 bug)
                full_text = section.get("full_text") or ""
                if full_text:
                    extract_m = re.search(
                        r'场景起始状态\s*[:：]?\s*\n'
                        r'((?:[ \t]+[^\n]+\n?)+)',
                        full_text
                    )
                    if extract_m:
                        extracted = {}
                        for line in extract_m.group(1).split('\n'):
                            line = line.strip()
                            if not line or '=' not in line:
                                continue
                            name, val = line.split('=', 1)
                            name = name.strip().rstrip(':：').strip()
                            val = val.strip()
                            if name and val:
                                extracted[name] = val
                        if extracted:
                            filtered = {c: extracted[c] for c in active_chars if c in extracted}
                            # merge 策略:
                            # - 同场景下一节:角色在 accumulated_state 里 → 用 accumulated(防 LLM 演绎 bug)
                            # - 主线跨场景:section_start 是占位结构(仅伤势真实) → 用 description 抽取覆盖
                            # - 角色不在 section_start 里(首次出场或跨场景无累积) → 用 description 抽取
                            # v3.61.81: 跨场景时严禁强制还原,因为 description 才是符合新场景的真实状态
                            added_from_desc = []
                            overridden_by_acc = []
                            overridden_by_desc_xscene = []
                            for k, v in filtered.items():
                                if k in section_start:
                                    if is_scene_change_within_main:
                                        # 跨场景:占位结构里的"姿态/朝向/情绪/道具"全用 description 覆盖
                                        # 但保留 section_start 里已抽出的真实伤势(伤势必须延续)
                                        existing = section_start[k]
                                        existing_inj_m = re.search(r'伤势\[([^\]]+)\]', existing)
                                        existing_injury = existing_inj_m.group(1) if existing_inj_m else None
                                        if existing_injury and existing_injury not in ('待 description 提取', '无伤', '无', ''):
                                            # 拼回:用 description 提取的内容,但 伤势[xxx] 段强制用累积的真实伤势
                                            merged = re.sub(
                                                r'伤势\[[^\]]*\]',
                                                f'伤势[{existing_injury}]',
                                                v
                                            )
                                            section_start[k] = merged
                                        else:
                                            section_start[k] = v
                                        overridden_by_desc_xscene.append(k)
                                    else:
                                        # 同场景:维持现有"以 accumulated 为准"逻辑
                                        if section_start[k] != v:
                                            overridden_by_acc.append(k)
                                else:
                                    section_start[k] = v
                                    added_from_desc.append(k)
                            if added_from_desc:
                                logger.info(
                                    f"[state-chain] sb={sid} 从 description 抽取首次出场角色 {len(added_from_desc)} 人: {added_from_desc}"
                                )
                            if overridden_by_acc:
                                logger.warning(
                                    f"[state-chain] sb={sid} LLM 在 description 中改写了上节状态,已强制还原为上节 end_state: {overridden_by_acc}"
                                )
                            if overridden_by_desc_xscene:
                                logger.info(
                                    f"[state-chain] sb={sid} 主线跨场景,已用 description 提取覆盖姿态/朝向/情绪/道具(保留伤势): {overridden_by_desc_xscene}"
                                )

                if section_start:
                    try:
                        # v3.59.78:同时把 description 里 LLM 自由发挥写的"场景起始状态:"块
                        #          替换成 section_start 真实数据(DB 字段是真相)
                        # 老 bug:UI 渲染 description 显示 LLM 原文,看到的是 LLM 改写后的状态(如
                        #         江杰从"僵直站立·极度恐慌"被 LLM 改成"强挺腰板·强装镇定"),
                        #         实际 DB.section_start_state 里是正确的(从上节 end_state 挂起)。
                        #         此处强制把 description 里的块改写成真实数据,UI 跟 DB 一致。
                        # v3.61.177 关键修:
                        #   storyboards 同时有 `description` 和 `prompt` 两个字段(INSERT 时都设成
                        #   LLM 原文 full_text);state-chain 老逻辑只重写 description,prompt 没同步,
                        #   导致前端 UI(VideoView `editablePrompt = sb.prompt || sb.description`)
                        #   优先读 prompt → 显示 LLM 原文 8 人,跟分镜管理页 4 人对不上。
                        #   实测案例:sb=2534,description 是 4 人(正确),prompt 是 8 人(LLM 原文)。
                        #   修法:同一个块替换算法应用到 description **和** prompt 两个字段。
                        new_block_lines = ["场景起始状态:"]
                        for _name, _state in section_start.items():
                            new_block_lines.append(f"  {_name} = {_state}")
                        new_block = "\n".join(new_block_lines)

                        # 拉当前 description + prompt(一次 SELECT)
                        async with db.execute(
                            "SELECT description, prompt FROM storyboards WHERE id=?", (sid,)
                        ) as _dc:
                            _drow = await _dc.fetchone()
                        current_desc = _drow["description"] if _drow else ""
                        current_prompt = _drow["prompt"] if _drow else ""

                        # 匹配"场景起始状态:" + 紧随的缩进行(空格/tab 开头),
                        # 直到遇到空行或非缩进行(下一个 block 标题)
                        block_re = re.compile(
                            r'(场景起始状态\s*[:：]\s*\n)((?:[ \t]+[^\n]+\n?)+)',
                            re.MULTILINE
                        )

                        def _rewrite_block(text: str) -> tuple:
                            """把 text 里所有「场景起始状态:」块清掉,在第一个块原位插入唯一新块。
                            返回 (new_text, match_count)。无块时返回 (text, 0)。
                            防御性:虽然实测 description / prompt 通常只 1 个块,但 LLM 偶尔
                            会把 chain-header 抄进去出现 ≥2 个块 → 此算法都能兜住。
                            """
                            ms = list(block_re.finditer(text or ""))
                            if not ms:
                                return text, 0
                            sentinel = "\x00__START_STATE_PLACEHOLDER__\x00"
                            first = ms[0]
                            t = text[:first.start()] + sentinel + text[first.end():]
                            t = block_re.sub("", t)
                            t = t.replace(sentinel, new_block + "\n")
                            return t, len(ms)

                        new_desc, desc_n = _rewrite_block(current_desc)
                        new_prompt, prompt_n = _rewrite_block(current_prompt)
                        # 2026-05:_rewrite_block 的正则遇空行就结束 block,清不掉"空行后的同名重复行";
                        #          这里再归一化一次,确保 DB 里 description/prompt 不残留重复角色状态行
                        new_desc = "\n".join(_dedupe_same_name_state_lines(new_desc.split("\n")))
                        new_prompt = "\n".join(_dedupe_same_name_state_lines(new_prompt.split("\n")))

                        # 同时 UPDATE 三个字段:section_start_state JSON + description + prompt
                        # 没有块的字段保持原样(传入 new_desc / new_prompt 等于原值)
                        await db.execute(
                            "UPDATE storyboards SET section_start_state=?, description=?, prompt=? WHERE id=?",
                            (
                                json.dumps(section_start, ensure_ascii=False),
                                new_desc,
                                new_prompt,
                                sid,
                            )
                        )

                        # 日志:报告每个字段处理了几个块
                        if desc_n == 0 and prompt_n == 0:
                            logger.info(
                                f"[state-chain] sb={sid} section_start_state 已写入"
                                f"(description / prompt 都无块,老数据/格式异常): {list(section_start.keys())}"
                            )
                        else:
                            warn_parts = []
                            if desc_n > 1:
                                warn_parts.append(f"description 含 {desc_n} 个块(清除 {desc_n-1} 个污染)")
                            if prompt_n > 1:
                                warn_parts.append(f"prompt 含 {prompt_n} 个块(清除 {prompt_n-1} 个污染)")
                            extra = f" [{'; '.join(warn_parts)}]" if warn_parts else ""
                            logger.info(
                                f"[state-chain] sb={sid} section_start_state + description({desc_n} 块) + prompt({prompt_n} 块) "
                                f"已同步重写: {list(section_start.keys())}{extra}"
                            )
                    except Exception as e:
                        logger.warning(f"[state-chain] 写 section_start_state 失败 sb={sid}: {e}")

                # ── 2. 提取/保存本节 end_state ──
                # 第一优先:模板直接输出的 end_state
                end_state = section.get("_end_state")
                if end_state and isinstance(end_state, dict) and len(end_state) > 0:
                    # 清洗:确保 value 是字符串
                    end_state = {k: str(v) for k, v in end_state.items() if v}
                    if end_state:
                        logger.info(f"[state-chain] sb={sid} 使用模板直接输出的 end_state: {list(end_state.keys())}")
                else:
                    end_state = None

                # v3.61.178: 跨场景 end_state 清理 —
                #   LLM 在跨场景节(scene_index 变化)写 _end_state 时,经常把上场景累积
                #   角色(从 chain-header 看到的)也"原样复制"进来。实测案例 sb=2531(场景3)
                #   end_state 8 人,其中 4 人(凌瑶华/素裳/谢明渊/青竹)是场景1 的角色,
                #   场景3 根本不在场,本节 characters 字段只 2 人。
                #   → 分镜管理页 UI 角标显示"8 人状态",视觉错乱。
                #   修法:跨场景时,只保留本节 active_chars 里的角色;同场景维持现状
                #         (允许有"在场不说话"的延续角色)。
                if end_state and is_scene_change_within_main:
                    if active_chars:
                        _cur_chars_set = set(active_chars)
                        _filtered = {k: v for k, v in end_state.items() if k in _cur_chars_set}
                        _dropped = set(end_state.keys()) - _cur_chars_set
                        if _dropped:
                            logger.warning(
                                f"[state-chain] sb={sid} 跨场景 end_state 清理 — "
                                f"移除上场景累积残留 {sorted(_dropped)},"
                                f"保留本节激活 {sorted(_filtered.keys())}"
                            )
                            end_state = _filtered if _filtered else None

                # 第二优先:shots(JSON 模板) 存在时调 LLM 提取
                if not end_state:
                    shots = section.get("_shots_raw") or []
                    if shots:
                        try:
                            end_state = await extract_end_state(shots=shots, llm_config_id=llm_config_id)
                            if end_state:
                                logger.info(f"[state-chain] sb={sid} LLM 从 shots 提取 end_state: {list(end_state.keys())}")
                        except Exception as e:
                            logger.warning(f"[state-chain] sb={sid} LLM 从 shots 提取失败: {e}")
                            end_state = None

                # 第三优先:文本模板(v7.0)没有 _shots_raw,但 full_text 里有整段 shot 描述
                # 把 full_text 包装成单个 shot 丢给 LLM 提取(适用于"LLM 忘记输出 🔗 块"的情况)
                if not end_state:
                    full_text_for_extract = section.get("full_text") or ""
                    if full_text_for_extract and len(full_text_for_extract) > 100:
                        try:
                            fake_shots = [{"shot_number": 1, "description": full_text_for_extract, "dialogue": ""}]
                            end_state = await extract_end_state(shots=fake_shots, llm_config_id=llm_config_id)
                            if end_state:
                                logger.info(
                                    f"[state-chain] sb={sid} LLM 从 full_text 兜底提取 end_state: {list(end_state.keys())}"
                                )
                        except Exception as e:
                            logger.warning(f"[state-chain] sb={sid} LLM 从 full_text 提取失败: {e}")
                            end_state = None

                if end_state:
                    try:
                        await db.execute(
                            "UPDATE storyboards SET end_state=? WHERE id=?",
                            (json.dumps(end_state, ensure_ascii=False), sid)
                        )
                    except Exception as e:
                        logger.warning(f"[state-chain] 写 end_state 失败 sb={sid}: {e}")
                    # 只有主时间线节(normal)的 end_state 回写主累积状态
                    # 回忆/梦境节 end_state 保留但不影响主时间线
                    if section_scene_type == "normal":
                        accumulated_state.update({k: str(v) for k, v in end_state.items() if v})
                    else:
                        logger.info(
                            f"[state-chain] sb={sid} scene_type={section_scene_type},"
                            f"end_state 已保存但不回写主时间线"
                        )
                else:
                    logger.info(f"[state-chain] sb={sid} end_state 为空(模板未输出 + LLM 提取失败),跳过")

                # v3.61.81: 每轮末尾刷新 prev_scene_index,供下一轮跨场景检测
                if curr_scene_index is not None:
                    prev_scene_index = curr_scene_index
                # v3.61.250: 同步刷新 prev_scene_name(同名续场景判据用)。
                #   只有本节真有场景名才更新,避免空名覆盖掉有效的上一节场景名。
                if curr_scene_name:
                    prev_scene_name = curr_scene_name
            await db.commit()
        finally:
            await db.close()
    # ============ / C 方案状态链辅助方法结束 ============

    @staticmethod
    async def update_style_prompt_batch(novel_id: int, style_prompt: str, script_id: int = None) -> Dict[str, Any]:
        """批量更新分镜的风格提示词
        
        Args:
            novel_id: 小说ID
            style_prompt: 风格提示词内容
            script_id: 可选，指定剧本ID
            
        Returns:
            {
                "success": bool,
                "updated_count": int,
                "message": str
            }
        """
        db = await get_db()
        try:
            if script_id:
                cursor = await db.execute(
                    "UPDATE storyboards SET style_prompt = ? WHERE novel_id = ? AND script_id = ?",
                    (style_prompt, novel_id, script_id)
                )
            else:
                cursor = await db.execute(
                    "UPDATE storyboards SET style_prompt = ? WHERE novel_id = ?",
                    (style_prompt, novel_id)
                )
            await db.commit()
            updated_count = cursor.rowcount
            return {
                "success": True,
                "updated_count": updated_count,
                "message": f"成功更新 {updated_count} 个分镜的风格提示词"
            }
        except Exception as e:
            print(f"批量更新风格提示词失败: {e}")
            return {
                "success": False,
                "updated_count": 0,
                "message": f"批量更新失败: {str(e)}"
            }
        finally:
            await db.close()

    @staticmethod
    async def regenerate_single_section(
        novel_id: int,
        template_id: int,
        llm_config_id: int,
        scene_content: str,
        scene_title: str,
        section_number: int,
        storyboard_id: int,
        script_id: Optional[int] = None,
        style_template_id: Optional[int] = None,
        inherit_prev_state: bool = True,
        cross_chapter_inherit: bool = False,
        with_character_state: bool = True,
        avoid_same_shot_size: bool = True,
    ) -> Dict[str, Any]:
        """
        重新生成单个小节的分镜

        Args:
            novel_id: 小说ID
            template_id: 提示词模板ID
            llm_config_id: LLM配置ID
            scene_content: 场景的剧本内容
            scene_title: 场景标题
            section_number: 小节编号
            storyboard_id: 要重新生成的分镜ID
            script_id: 指定剧本ID
            style_template_id: 风格提示词模板ID

        Returns:
            {
                "success": bool,
                "storyboard": Dict,
                "message": str
            }
        """
        logger.info(f"[regenerate-section] regenerate_single_section 被调用: novel_id={novel_id}, "
              f"storyboard_id={storyboard_id}, section_number={section_number}")

        try:
            if not scene_content or not scene_content.strip():
                return {
                    "success": False,
                    "storyboard": None,
                    "message": "场景内容为空"
                }

            # 1. 获取提示词模板(先只取元数据,绝不拉 content → 护模板)
            logger.info(f"[regenerate-section] 正在获取模板(meta): template_id={template_id}")
            template = await get_template_by_id(template_id, meta_only=True)
            if not template:
                return {
                    "success": False,
                    "storyboard": None,
                    "message": f"模板不存在: template_id={template_id}"
                }

            # 上报使用计数(预置模板才计,异步失败静默)
            try:
                from services.template_service import report_usage as _report_template_usage
                await _report_template_usage(template)
            except Exception:
                pass

            # 分镜模板上云:判定 服务端拼装 / 旧模式 / 失败(护模板)
            _asm_mode, _asm_admin_id = _storyboard_assemble_eligibility(template)
            if _asm_mode == "fail":
                return {"success": False, "storyboard": None, "message": _asm_admin_id}
            _assemble_inject_block = ""
            _camera_continuity = None
            # 仅自建模板(legacy)才取 content 在本地拼;预置模板绝不取 content
            if _asm_mode == "legacy":
                template = await get_template_by_id(template_id)

            # 2. 解析模板变量并填充内容(预置 assemble:template_content 恒为空,本地不含模板)
            template_content = template.get("content") or ""
            variables = json.loads(template.get("variables", "[]"))

            # 构建变量映射
            variable_map = {
                "script_content": scene_content,
                "content": scene_content,
                "script": scene_content,
                "text": scene_content,
                "novel_id": str(novel_id),
                "script_id": str(script_id) if script_id else "all",
            }

            # 替换模板中的变量占位符
            prompt = template_content
            has_replacement = False

            for var_name in variables:
                placeholder1 = f"{{{var_name}}}"
                if placeholder1 in prompt:
                    prompt = prompt.replace(placeholder1, variable_map.get(var_name, ""))
                    has_replacement = True
                placeholder2 = f"{{{{{var_name}}}}}"
                if placeholder2 in prompt:
                    prompt = prompt.replace(placeholder2, variable_map.get(var_name, ""))
                    has_replacement = True

            if not has_replacement:
                for var_name, var_value in variable_map.items():
                    placeholder1 = f"{{{var_name}}}"
                    if placeholder1 in prompt:
                        prompt = prompt.replace(placeholder1, var_value)
                        has_replacement = True
                    placeholder2 = f"{{{{{var_name}}}}}"
                    if placeholder2 in prompt:
                        prompt = prompt.replace(placeholder2, var_value)
                        has_replacement = True

            if prompt == template_content or not has_replacement:
                prompt = f"{template_content}\n\n以下是需要转换为分镜的剧本内容：\n\n{scene_content}"

            # v3.61.229: 关闭"生成人物状态"→ 不注入前序状态 + prompt 追加最高优先级禁止指令
            if not with_character_state:
                prompt = prompt + (
                    "\n\n【本次最高优先级·覆盖模板】严禁输出任何人物状态块:不要写「场景起始状态:」、"
                    "「🔗 本节结尾状态:」、以及姿态[/情绪[/伤势[/朝向关系[/持有道具[ 等状态行。"
                    "即使上文模板要求生成人物状态,本次也一律省略,只输出场景标头 + 镜号分镜内容。"
                )

            _regen_scene_idx = None
            if avoid_same_shot_size:
                try:
                    async with (await get_db()) as _cam_db:
                        async with _cam_db.execute(
                            "SELECT scene_index FROM storyboards WHERE id=?",
                            (storyboard_id,),
                        ) as _cam_cur:
                            _cam_row = await _cam_cur.fetchone()
                            _regen_scene_idx = _cam_row["scene_index"] if _cam_row else None
                except Exception as _e:
                    logger.warning(f"[camera-chain][regenerate] 反查 scene_index 失败(忽略): {_e}")
                _camera_continuity = await _get_prev_section_tail_camera_continuity(
                    novel_id=novel_id,
                    script_id=script_id,
                    scene_index=_regen_scene_idx,
                    section_number=section_number,
                    allow_cross_script=cross_chapter_inherit,
                )
                if _camera_continuity and _asm_mode == "legacy":
                    logger.info("[camera-chain][regenerate] legacy 自建模板跳过本地避重提示:核心规则仅在 admin-server assemble 拼装")
                elif _camera_continuity:
                    logger.info("[camera-chain][regenerate] 预置模板 assemble 模式:上一末镜信息将交由 admin-server 拼装")

            # 状态链注入:重新生成单节时默认继承上节 end_state,用户可关闭
            # 按本节 scene_type 过滤(主线跳过回忆节,回忆节跳过主线节)
            # v3.61.229: with_character_state=False 时整段跳过
            if inherit_prev_state and with_character_state:
                try:
                    # 用 storyboard_id 反查 scene_index + scene_type
                    async with (await get_db()) as _sb_db:
                        async with _sb_db.execute(
                            "SELECT scene_index, scene_type FROM storyboards WHERE id=?",
                            (storyboard_id,)
                        ) as _c:
                            _r = await _c.fetchone()
                            _scene_idx = _r["scene_index"] if _r else None
                            _cur_type = (_r["scene_type"] or "normal").lower() if _r and "scene_type" in _r.keys() else "normal"
                    logger.info(f"[state-chain][regenerate] 本节 scene_type={_cur_type}")

                    prev_state = await StoryboardService._get_prev_section_end_state(
                        novel_id=novel_id,
                        script_id=script_id,
                        scene_index=_scene_idx,
                        section_number=section_number,
                        allow_cross_script=cross_chapter_inherit,
                        current_scene_type=_cur_type,
                    )
                    if prev_state:
                        from services.state_extractor_service import format_state_for_prompt
                        # v3.59.57:同首次生成,只把本节剧本提到的角色喂给 LLM
                        all_chars_in_novel = []
                        try:
                            async with (await get_db()) as _cdb:
                                async with _cdb.execute(
                                    "SELECT name FROM extracted_elements WHERE novel_id=? AND element_type='character'",
                                    (novel_id,)
                                ) as _cc:
                                    all_chars_in_novel = [r[0] for r in await _cc.fetchall() if r[0]]
                        except Exception:
                            pass

                        # v3.61.241: 单节重生同样按场景/时间线边界断开强继承。
                        # v3.61.250: 同步传本节场景基名,保证单节重生与首次生成同名续场景判据一致。
                        _cur_scene_m_re = (
                            StoryboardService.SCENE_PATTERN.search(scene_content or "")
                            or StoryboardService.SCENE_PATTERN_GENERAL.search(scene_content or "")
                        )
                        _cur_scene_name_re = (
                            StoryboardService.normalize_scene_title(_cur_scene_m_re.group(0))
                            if _cur_scene_m_re else ""
                        )
                        _scene_boundary_break_re, _diag_prev_si_re, _diag_prev_type_re = await _detect_scene_boundary_break(
                            novel_id=novel_id,
                            script_id=script_id,
                            scene_index=_scene_idx,
                            section_number=section_number,
                            scene_type=_cur_type,
                            current_scene_name=_cur_scene_name_re,
                        )
                        logger.info(
                            f"[state-chain][regenerate] 边界检测 _cur_type={_cur_type}, _scene_idx={_scene_idx}, "
                            f"prev_si={_diag_prev_si_re}, prev_type={_diag_prev_type_re}, novel_id={novel_id}, "
                            f"script_id={script_id}, scene_boundary_break={_scene_boundary_break_re}"
                        )

                        # v3.61.221: 时辰/时间变化也触发"弱继承·只留伤势"(Q2=A,不限是否跨场景)
                        _time_changed_re = (
                            await _detect_time_slot_change(novel_id, script_id, _scene_idx, section_number, scene_content)
                            if _cur_type == "normal" else False
                        )
                        _break_inherit_re = _scene_boundary_break_re or _time_changed_re

                        inject_block = format_state_for_prompt(
                            prev_state,
                            scene_content=scene_content,
                            all_character_names=all_chars_in_novel,
                            is_scene_change=_break_inherit_re,
                        )
                        if inject_block:
                            prompt = prompt + "\n\n" + inject_block
                            _assemble_inject_block = inject_block  # assemble 模式单独传给 admin
                            mentioned_now = [c for c in (prev_state or {}).keys() if c and c in scene_content]
                            kept_now = [c for c in mentioned_now if c in prev_state]
                            if _break_inherit_re:
                                _why = "时辰变化" if _time_changed_re and not _scene_boundary_break_re else "场景/时间线变化"
                                logger.info(f"[state-chain][regenerate] {_why}(scene_index={_scene_idx}),"
                                            f"注入'弱继承·只传伤势'块({len(kept_now)} 角色)")
                            else:
                                logger.info(f"[state-chain][regenerate] 累积 {len(prev_state)} 角色,本节剧本提及并注入 {len(kept_now)} 角色")
                        else:
                            if _break_inherit_re:
                                _why = "时辰变化" if _time_changed_re and not _scene_boundary_break_re else "场景/时间线变化"
                                logger.info(f"[state-chain][regenerate] {_why}(scene_index={_scene_idx}),"
                                            f"无伤无累积可注入,LLM 完全独立生成")
                            else:
                                logger.info(f"[state-chain][regenerate] 累积 {len(prev_state)} 角色,本节剧本未提及任何累积角色,跳过注入")
                except Exception as e:
                    logger.warning(f"[state-chain][regenerate] 注入失败: {e}")

            logger.info(f"[regenerate-section] 构建的 prompt 长度: {len(prompt)}, 前200字: {prompt[:200]}")

            # 3. 调用大模型生成分镜
            try:
                logger.info(f"[regenerate-section] 准备调用 LLM: config_id={llm_config_id}")
                messages = [
                    {"role": "system", "content": "你是一位专业的分镜设计助手。\n\n【输出约束(必读)】\n1. 直接输出中文分镜内容,严禁输出任何思考过程(英文如 **Refining Novel to Script**、中文如 **剧本转化思考** 等加粗段落)\n2. 严禁在分镜前加任何元描述(如 'Here is the storyboard:' / '以下是分镜:' / '我来转换:')\n3. 第一个字符必须是场景标头(如 【内 xxx 日】)或节奏类型词,不允许任何前言/思考链"},
                    {"role": "user", "content": prompt}
                ]

                # 预置分镜模板走服务端拼装(模板明文不出客户端);自建模板 None 走旧模式
                _assemble_payload = None
                if _asm_mode == "assemble":
                    _assemble_payload = _build_storyboard_assemble_payload(
                        template, _asm_admin_id, variable_map, scene_content,
                        with_character_state, _assemble_inject_block, _camera_continuity,
                    )

                response = await LLMService.call_llm_with_retry(
                    config_id=llm_config_id,
                    messages=messages,
                    timeout=600,
                    task_type="storyboard_generate",
                    novel_id=novel_id,
                    assemble_payload=_assemble_payload,
                    allow_direct_storyboard=(_asm_mode == "legacy"),
                )
                logger.info(f"[regenerate-section] LLM 调用完成，响应长度: {len(response) if response else 0}")

                if not response or not response.strip():
                    return {
                        "success": False,
                        "storyboard": None,
                        "message": "大模型返回空内容"
                    }

                # v3.61.89: 剥离 reasoning 思考链
                response = _strip_reasoning_chain(response)
                # v3.61.229: 关闭"生成人物状态"→ 兜底剥状态块
                if not with_character_state:
                    response = _strip_state_blocks(response)

            except Exception as e:
                logger.error(f"[regenerate-section] 调用 LLM 时发生异常: {type(e).__name__}: {str(e)}")
                import traceback
                traceback.print_exc()
                return {
                    "success": False,
                    "storyboard": None,
                    "message": f"大模型调用失败: {str(e)}"
                }

            # 4. 解析大模型返回的分镜列表
            logger.info(f"[regenerate-section] 开始解析分镜响应")
            sections_data = await StoryboardService._parse_sections_with_dynamic_rules(response)
            logger.info(f"[regenerate-section] 解析到 {len(sections_data)} 个小节")

            if not sections_data:
                return {
                    "success": False,
                    "storyboard": None,
                    "message": "无法解析大模型返回的分镜数据"
                }

            # 5. 不再使用 match_elements 从整个场景匹配人物
            # 因为一个场景可能拆成多个小节，每个小节涉及的人物不同
            # 改为使用该条分镜自己的人物信息
            logger.info(f"[regenerate-section] 跳过场景级别的人物匹配，改用分镜自己的人物")

            # 5.5 查询该小说的所有道具名（用于后续匹配）
            db = await get_db()
            try:
                cursor = await db.execute(
                    "SELECT name FROM extracted_elements WHERE novel_id = ? AND element_type = 'prop'",
                    (novel_id,)
                )
                prop_rows = await cursor.fetchall()
                all_props = [row[0] for row in prop_rows]
                logger.info(f"[regenerate-section] 查询到 {len(all_props)} 个道具元素")
            finally:
                await db.close()

            # 6. 只取第一个小节的内容（因为是重新生成单个小节）
            section = sections_data[0]
            full_text = section.get("full_text", "")
            if not StoryboardService._has_shot_marker(full_text):
                logger.warning(
                    f"[regenerate-section] 生成结果无任何镜号行,拒绝保存:"
                    f"{(full_text or '')[:120]!r}"
                )
                return {
                    "success": False,
                    "count": 0,
                    "section_number": section_number,
                    "scene_title": scene_title,
                    "storyboards": [],
                    "message": "生成结果没有任何镜号,已判定为空小节并丢弃。请重试或调整模板。"
                }

            # 标准化场景标题
            normalized_title = StoryboardService.normalize_scene_title(scene_title)
            
            # 关键修复：使用标准化后的 scene_title，确保一致性
            scene_name = normalized_title

            # 防御：如果 scene_title 为空，尝试从 AI 返回的 section_info 中提取
            if not scene_name:
                ai_scene = section.get("section_info", {}).get("scene", "") or section.get("scene", "")
                if ai_scene:
                    scene_name = StoryboardService.normalize_scene_title(ai_scene)
                    logger.warning(f"[regenerate-section] scene_title 为空，使用 AI 返回的场景名: '{scene_name}'")
            # 再次防御：从分镜文本中提取 【xxx】 场景标记
            if not scene_name and full_text:
                scene_match = re.search(r'[【\[]([^】\]]+)[】\]]', full_text)
                if scene_match:
                    scene_name = StoryboardService.normalize_scene_title(scene_match.group(0))
                    logger.warning(f"[regenerate-section] 从文本提取场景名: '{scene_name}'")

            # 人物提取：优先使用 AI 返回的人物，不再从整个场景匹配
            # AI 返回的格式可能是 JSON 或文本，characters 字段位置不同：
            # - JSON 格式：section["characters"] 直接在顶层
            # - 文本格式：section["section_info"]["characters"] 在 section_info 中
            ai_chars_str = section.get("section_info", {}).get("characters", "") or section.get("characters", "")
            
            if ai_chars_str:
                # AI 返回了人物列表，直接使用
                characters = StoryboardService._normalize_characters(ai_chars_str)
                logger.info(f"[regenerate-section] 使用 AI 返回的人物: {characters}")
            else:
                # fallback: 从 description 文本的 "人物：xxx" 行提取
                char_match = re.search(r'人物[：:]\s*(.+)', full_text)
                if char_match:
                    characters = StoryboardService._normalize_characters(char_match.group(1))
                    logger.info(f"[regenerate-section] 从文本提取人物: {characters}")
                else:
                    characters = []
                    logger.info(f"[regenerate-section] 未找到人物信息")
            
            characters_str = ", ".join(characters)

            # 构建 section_info，使用标准化后的 scene_title
            section_info = {
                "scene": normalized_title,
                "characters": characters_str
            }

            characters_json = json.dumps(characters)
            scenes_json = json.dumps([scene_name] if scene_name else [])
            # 道具匹配：检查分镜文本中是否包含道具名
            matched_props = [p for p in all_props if p in full_text]
            props_json = json.dumps(matched_props, ensure_ascii=False)
            if matched_props:
                logger.info(f"[regenerate-section] 匹配到道具: {matched_props}")
            section_info_json = json.dumps(section_info)

            # 7. 更新数据库中的分镜记录
            db = await get_db()
            try:
                # 先检查分镜是否存在
                cursor = await db.execute(
                    "SELECT id FROM storyboards WHERE id = ? AND novel_id = ?",
                    (storyboard_id, novel_id)
                )
                row = await cursor.fetchone()

                if not row:
                    return {
                        "success": False,
                        "storyboard": None,
                        "message": f"分镜不存在: storyboard_id={storyboard_id}"
                    }

                # 更新分镜内容
                await db.execute(
                    """
                    UPDATE storyboards
                    SET description = ?, prompt = ?, characters = ?, scenes = ?, 
                        props = ?, section_info = ?
                    WHERE id = ?
                    """,
                    (full_text, full_text, characters_json, scenes_json, 
                     props_json, section_info_json, storyboard_id)
                )
                await db.commit()
                logger.info(f"[regenerate-section] 分镜 {storyboard_id} 更新成功")

                # 返回更新后的分镜数据
                updated_storyboard = {
                    "id": storyboard_id,
                    "scene_number": 1,
                    "description": full_text,
                    "prompt": full_text,
                    "characters": characters,
                    "scenes": [scene_name] if scene_name else [],
                    "props": matched_props,
                    "section_number": section_number,
                    "section_info": section_info
                }

                return {
                    "success": True,
                    "storyboard": updated_storyboard,
                    "message": "小节分镜重新生成成功"
                }

            finally:
                await db.close()

        except Exception as e:
            logger.error(f"[regenerate-section] regenerate_single_section 顶层异常: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "storyboard": None,
                "message": f"重新生成小节分镜失败: {str(e)}"
            }

    @staticmethod
    async def export_storyboards(novel_id: int) -> Dict[str, Any]:
        """导出某小说的所有分镜数据（包含关联元素详细信息）"""
        db = await get_db()
        try:
            # 获取小说信息
            cursor = await db.execute(
                "SELECT id, name FROM novels WHERE id = ?",
                (novel_id,)
            )
            novel_row = await cursor.fetchone()
            if not novel_row:
                return {
                    "success": False,
                    "message": "小说不存在",
                    "data": None
                }
            
            novel_info = dict(novel_row)
            
            # 获取分镜数据
            storyboards = await StoryboardService.get_storyboards(novel_id)
            
            # 获取关联元素详细信息
            elements = await ExtractionService.get_elements(novel_id)
            
            # 构建元素映射表
            element_map = {}
            for elem in elements:
                elem_key = f"{elem.get('element_type')}:{elem.get('name')}"
                element_map[elem_key] = elem
            
            # 为每个分镜添加关联元素的详细信息
            enriched_storyboards = []
            for sb in storyboards:
                sb_with_details = dict(sb)
                
                # 人物详细信息
                character_details = []
                for char_name in sb.get("characters", []):
                    key = f"character:{char_name}"
                    if key in element_map:
                        character_details.append(element_map[key])
                    else:
                        character_details.append({"name": char_name, "element_type": "character"})
                sb_with_details["character_details"] = character_details
                
                # 场景详细信息
                scene_details = []
                for scene_name in sb.get("scenes", []):
                    key = f"scene:{scene_name}"
                    if key in element_map:
                        scene_details.append(element_map[key])
                    else:
                        scene_details.append({"name": scene_name, "element_type": "scene"})
                sb_with_details["scene_details"] = scene_details
                
                # 道具详细信息
                prop_details = []
                for prop_name in sb.get("props", []):
                    key = f"prop:{prop_name}"
                    if key in element_map:
                        prop_details.append(element_map[key])
                    else:
                        prop_details.append({"name": prop_name, "element_type": "prop"})
                sb_with_details["prop_details"] = prop_details
                
                enriched_storyboards.append(sb_with_details)
            
            # 统计数据
            all_characters = set()
            all_scenes = set()
            all_props = set()
            for sb in storyboards:
                all_characters.update(sb.get("characters", []))
                all_scenes.update(sb.get("scenes", []))
                all_props.update(sb.get("props", []))
            
            return {
                "success": True,
                "message": "导出成功",
                "data": {
                    "novel": novel_info,
                    "export_time": str(__import__('utils.timezone').timezone.now_beijing()),
                    "statistics": {
                        "total_storyboards": len(storyboards),
                        "total_characters": len(all_characters),
                        "total_scenes": len(all_scenes),
                        "total_props": len(all_props)
                    },
                    "storyboards": enriched_storyboards
                }
            }
            
        finally:
            await db.close()

    @staticmethod
    async def recover_from_log(log_id: int, novel_id: int, script_id: int, scene_index: int) -> bool:
        """
        从成功的日志中恢复缺失的分镜数据
        
        Args:
            log_id: 日志ID
            novel_id: 小说ID
            script_id: 剧本ID
            scene_index: 场景索引
            
        Returns:
            是否成功恢复
        """
        from services.log_service import LogService
        
        logger.info(f"[storyboard] recover_from_log: 尝试从日志 {log_id} 恢复场景 {scene_index} 的分镜数据")
        
        # 1. 获取日志详情
        log = await LogService.get_log_detail(log_id)
        if not log:
            logger.warning(f"[storyboard] recover_from_log: 日志 {log_id} 不存在")
            return False
        
        if log.get('status') != 'success':
            logger.warning(f"[storyboard] recover_from_log: 日志 {log_id} 状态不是 success")
            return False
        
        
        output_content = log.get('output_content')
        if not output_content:
            logger.warning(f"[storyboard] recover_from_log: 日志 {log_id} 没有 output_content")
            return False
        
        # 2. 解析分镜内容
        sections = await StoryboardService._parse_sections_with_dynamic_rules(output_content)
        if not sections:
            logger.warning(f"[storyboard] recover_from_log: 无法从日志 {log_id} 解析分镜内容")
            return False
        
        # 3. 获取剧本场景列表用于匹配
        script = await ScriptService.get_script(script_id)
        if not script:
            logger.warning(f"[storyboard] recover_from_log: 剧本 {script_id} 不存在")
            return False
        
        
        script_content = script.get('content', '')
        scene_list = []
        scenes_data = StoryboardService.split_scenes_from_script(script_content)
        for s in scenes_data:
            normalized = StoryboardService.normalize_scene_title(s.get('scene_title', ''))
            scene_list.append(normalized)
        
        # 4. 检查是否已有分镜
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT COUNT(*) FROM storyboards WHERE novel_id = ? AND script_id = ? AND scene_index = ?",
                (novel_id, script_id, scene_index)
            )
            row = await cursor.fetchone()
            existing_count = row[0] if row else 0
            
            if existing_count > 0:
                # 已有分镜，检查是否需要补充
                logger.info(f"[storyboard] recover_from_log: 场景 {scene_index} 已有 {existing_count} 条分镜")
            
            # 5. 查询该场景的最大 section_number
            cursor = await db.execute(
                "SELECT MAX(section_number) FROM storyboards WHERE novel_id = ? AND script_id = ? AND scene_index = ?",
                (novel_id, script_id, scene_index)
            )
            row = await cursor.fetchone()
            max_section = row[0] if row and row[0] is not None else 0
            
            # 6. 保存分镜
            saved_count = 0
            for idx, section in enumerate(sections):
                full_text = section.get('full_text', '')
                if not full_text:
                    continue
                if not StoryboardService._has_shot_marker(full_text):
                    logger.warning(
                        f"[storyboard] recover_from_log 小节 {idx + 1} 无任何镜号行,跳过恢复:"
                        f"{(full_text or '')[:80]!r}"
                    )
                    continue
                
                # 检查是否已存在相同内容
                cursor = await db.execute(
                    "SELECT id FROM storyboards WHERE novel_id = ? AND script_id = ? AND description = ?",
                    (novel_id, script_id, full_text[:200])
                )
                if await cursor.fetchone():
                    continue
                
                # 提取场景和人物
                scene_name = section.get('section_info', {}).get('scene', '')
                characters_str = section.get('section_info', {}).get('characters', '')
                
                # 标准化人物
                characters = StoryboardService._normalize_characters(characters_str)
                characters_json = json.dumps(characters, ensure_ascii=False)
                scenes_json = json.dumps([scene_name] if scene_name else [], ensure_ascii=False)
                props_json = json.dumps([], ensure_ascii=False)
                section_info = {"scene": scene_name, "characters": characters_str}
                section_info_json = json.dumps(section_info, ensure_ascii=False)
                
                # section_number 场景内递增
                new_section_number = max_section + 1 + idx
                
                await db.execute(
                    """
                    INSERT INTO storyboards
                    (novel_id, script_id, scene_number, description, prompt,
                     characters, scenes, props, sort_order, section_number, section_info, scene_index, template_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (novel_id, script_id, 1, full_text, full_text,
                     characters_json, scenes_json, props_json, idx, new_section_number, section_info_json, scene_index, template_id, now_beijing_str())
                )
                saved_count += 1
            
            await db.commit()
            logger.info(f"[storyboard] recover_from_log: 从日志 {log_id} 恢复了 {saved_count} 条分镜")
            return saved_count > 0
            
        except Exception as e:
            logger.error(f"[storyboard] recover_from_log: 恢复失败: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await db.close()

    @staticmethod
    async def fix_empty_scene_fields(novel_id: int, script_id: Optional[int] = None) -> Dict[str, Any]:
        """
        修复分镜中 section_info.scene 为空的记录。
        通过 scene_index 匹配剧本场景拆分结果，填充场景名。
        如果无法通过 scene_index 匹配，尝试从分镜文本中提取场景标记。
        """
        logger.info(f"[storyboard] fix_empty_scene_fields: novel_id={novel_id}, script_id={script_id}")
        
        fixed_count = 0
        fixed_details = []
        
        try:
            # 1. 查找 scene 为空的分镜记录
            db = await get_db()
            try:
                query = "SELECT id, scene_index, section_number, section_info, description FROM storyboards WHERE novel_id = ?"
                params = [novel_id]
                if script_id:
                    query += " AND script_id = ?"
                    params.append(script_id)
                
                cursor = await db.execute(query, params)
                rows = await cursor.fetchall()
                
                empty_scene_rows = []
                for row in rows:
                    section_info = json.loads(row[3]) if row[3] else {}
                    scene = section_info.get('scene', '')
                    if not scene:
                        empty_scene_rows.append({
                            'id': row[0],
                            'scene_index': row[1],
                            'section_number': row[2],
                            'section_info': section_info,
                            'description': row[4] or ''
                        })
                
                if not empty_scene_rows:
                    return {
                        "success": True,
                        "fixed_count": 0,
                        "message": "没有发现场景为空的分镜记录"
                    }
                
                logger.info(f"[storyboard] 发现 {len(empty_scene_rows)} 条场景为空的分镜")
            finally:
                await db.close()
            
            # 2. 获取剧本内容并拆分场景
            script_result = await StoryboardService.get_script_content_for_split_scenes(novel_id, script_id)
            scene_index_to_title = {}  # scene_index -> normalized_title
            
            if script_result.get('success'):
                scenes = StoryboardService.split_scenes_from_script(script_result['content'])
                for scene in scenes:
                    normalized = StoryboardService.normalize_scene_title(scene['scene_title'])
                    scene_index_to_title[scene['index']] = normalized
                logger.info(f"[storyboard] 场景拆分结果: {scene_index_to_title}")
            
            # 3. 修复每条记录
            db = await get_db()
            try:
                for row in empty_scene_rows:
                    scene_name = ''
                    
                    # 方法 1: 通过 scene_index 匹配
                    if row['scene_index'] is not None and row['scene_index'] in scene_index_to_title:
                        scene_name = scene_index_to_title[row['scene_index']]
                    
                    # 方法 2: 从分镜文本中提取 【xxx】 场景标记
                    if not scene_name and row['description']:
                        scene_match = re.search(r'[【\[]([^】\]]+)[】\]]', row['description'])
                        if scene_match:
                            scene_name = StoryboardService.normalize_scene_title(scene_match.group(0))
                    
                    if scene_name:
                        # 更新 section_info
                        section_info = row['section_info']
                        section_info['scene'] = scene_name
                        section_info_json = json.dumps(section_info, ensure_ascii=False)
                        
                        # 更新 scenes 字段
                        scenes_json = json.dumps([scene_name], ensure_ascii=False)
                        
                        await db.execute(
                            "UPDATE storyboards SET section_info = ?, scenes = ? WHERE id = ?",
                            (section_info_json, scenes_json, row['id'])
                        )
                        fixed_count += 1
                        fixed_details.append({
                            "id": row['id'],
                            "scene_index": row['scene_index'],
                            "section_number": row['section_number'],
                            "fixed_scene": scene_name
                        })
                        logger.info(f"[storyboard] 修复 id={row['id']}: scene='{scene_name}'")
                    else:
                        logger.warning(f"[storyboard] 无法修复 id={row['id']}: 找不到场景名")
                
                await db.commit()
                logger.info(f"[storyboard] fix_empty_scene_fields: 修复了 {fixed_count} 条记录")
            finally:
                await db.close()
            
            return {
                "success": True,
                "fixed_count": fixed_count,
                "total_empty": len(empty_scene_rows),
                "details": fixed_details,
                "message": f"修复了 {fixed_count}/{len(empty_scene_rows)} 条场景为空的分镜记录"
            }
            
        except Exception as e:
            logger.error(f"[storyboard] fix_empty_scene_fields: 失败: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "fixed_count": 0,
                "message": f"修复失败: {str(e)}"
            }


# ============================================================================
# v3.61.177 启动迁移:修复存量 prompt 字段「场景起始状态:」块的 LLM 污染
# ============================================================================
#
# 背景:
#   state-chain 老逻辑只重写 storyboards.description 字段(L3936-3996),没同步
#   storyboards.prompt 字段。INSERT 时 prompt=description=full_text(LLM 原文),
#   后续 state-chain 把 description 改成本节激活角色(如 4 人),但 prompt 留着
#   LLM 抄的"上节结尾"块(如 8 人)。
#
#   前端 VideoView 视频管理页:`editablePrompt = sb.prompt || sb.description`,
#   优先读 prompt → 用户看到 8 人,跟分镜管理页 4 人对不上。
#
# 修复策略:
#   1. 只动 prompt 字段(description 已经被 state-chain 重写过,是干净的)
#   2. **不无脑覆盖**:只在 prompt 抽到的角色集 ⊋ section_start_state.keys() 时才动手
#      (子集放行 = 用户可能在视频页编辑过 prompt 减角色,合法保留)
#   3. 用 section_start_state 当真相重写 prompt 里的「场景起始状态:」块
#   4. 启动时跑一次,幂等(下次启动会跳过已经干净的)
#
# 不修以下情况(防误伤):
#   - section_start_state 为空(没有真相基线,跳过)
#   - prompt 不含「场景起始状态:」块(老数据/异常格式,跳过)
#   - prompt 角色集 == section_start_state(已经干净 / 用户改了描述但角色没变,跳过)
#   - prompt 角色集 ⊆ section_start_state(用户精简了角色,合法保留)

async def repair_prompt_start_state_pollution() -> dict:
    """启动迁移:扫存量 storyboards,修 prompt 字段「场景起始状态:」块的 LLM 污染。

    返回 {"scanned": int, "repaired": int, "skipped_clean": int, "skipped_user_edit": int}
    """
    from database.db import get_db

    # 抽 prompt 里「场景起始状态:」块的同款正则(跟 state-chain 重写用的对齐)
    block_re = re.compile(
        r'(场景起始状态\s*[:：]\s*\n)((?:[ \t]+[^\n]+\n?)+)',
        re.MULTILINE
    )
    # 抽 `  角色 = 状态` 左侧角色名(只解析等号左侧,不全文搜)
    name_re = re.compile(r'^[ \t]+([^=\n:：]+?)\s*=\s*', re.MULTILINE)

    def _extract_prompt_names(prompt: str) -> set:
        """从 prompt 第一个「场景起始状态:」块里抽角色名 set"""
        if not prompt:
            return set()
        m = block_re.search(prompt)
        if not m:
            return set()
        body = m.group(2) or ""
        return {n.strip() for n in name_re.findall(body) if n.strip()}

    def _rewrite_prompt(prompt: str, new_block: str) -> str:
        """把 prompt 里所有「场景起始状态:」块清掉,在第一个块原位插入唯一新块"""
        ms = list(block_re.finditer(prompt or ""))
        if not ms:
            return prompt
        sentinel = "\x00__START_STATE_PLACEHOLDER__\x00"
        first = ms[0]
        t = prompt[:first.start()] + sentinel + prompt[first.end():]
        t = block_re.sub("", t)
        t = t.replace(sentinel, new_block + "\n")
        return t

    stats = {"scanned": 0, "repaired": 0, "skipped_clean": 0, "skipped_user_edit": 0, "skipped_no_block": 0}

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, section_start_state, prompt FROM storyboards "
            "WHERE section_start_state IS NOT NULL "
            "AND section_start_state != '' "
            "AND section_start_state != '{}' "
            "AND prompt IS NOT NULL "
            "AND prompt LIKE '%场景起始状态%'"
        )
        rows = await cursor.fetchall()
        stats["scanned"] = len(rows)
        if not rows:
            logger.info("[migrate] repair_prompt_start_state_pollution: 无候选 row,跳过")
            return stats

        to_update: list = []
        for row in rows:
            sid = row["id"]
            try:
                ss = json.loads(row["section_start_state"] or "{}")
            except Exception:
                continue
            if not isinstance(ss, dict) or not ss:
                continue
            db_names = set(ss.keys())
            prompt = row["prompt"] or ""
            prompt_names = _extract_prompt_names(prompt)

            if not prompt_names:
                # prompt 含"场景起始状态"字样但抽不出角色(块格式异常 / 老数据)→ 跳过
                stats["skipped_no_block"] += 1
                continue
            if prompt_names == db_names:
                # 已经一致,无需修
                stats["skipped_clean"] += 1
                continue
            if prompt_names <= db_names:
                # 用户可能在视频页精简了角色(合法子集) → 保留用户编辑
                stats["skipped_user_edit"] += 1
                continue

            # prompt 含 db 之外的角色(超集) = LLM 污染,必须修
            new_block_lines = ["场景起始状态:"]
            for _name, _state in ss.items():
                new_block_lines.append(f"  {_name} = {_state}")
            new_block = "\n".join(new_block_lines)
            new_prompt = _rewrite_prompt(prompt, new_block)
            if new_prompt != prompt:
                to_update.append((new_prompt, sid))
                stats["repaired"] += 1
                logger.info(
                    f"[migrate] sb={sid} prompt 修复:角色 {sorted(prompt_names)} → {sorted(db_names)}"
                )

        if to_update:
            for new_prompt, sid in to_update:
                await db.execute(
                    "UPDATE storyboards SET prompt=? WHERE id=?",
                    (new_prompt, sid),
                )
            await db.commit()
    except Exception as e:
        logger.error(f"[migrate] repair_prompt_start_state_pollution 失败: {e}")
    finally:
        await db.close()

    logger.info(
        f"[migrate] repair_prompt_start_state_pollution 完成: "
        f"扫描 {stats['scanned']} 条, 修复 {stats['repaired']} 条, "
        f"跳过(已干净) {stats['skipped_clean']}, "
        f"跳过(用户编辑) {stats['skipped_user_edit']}, "
        f"跳过(无块) {stats['skipped_no_block']}"
    )
    return stats


async def repair_end_state_cross_scene_contamination() -> dict:
    """v3.61.178 启动迁移:修存量 storyboards.end_state 跨场景污染。

    背景:
      LLM 在跨场景节(scene_index 变化)写 _end_state 时,经常把上场景累积角色
      "原样复制"进 end_state。实测案例 sb=2531(场景3,本节 characters=2 人:
      凌婉兮+连枝)的 end_state 含 8 个角色 — 多出来的 凌瑶华/素裳/谢明渊/青竹
      4 个角色是场景1 的角色,场景3 根本不在场。
      → 分镜管理页 UI 角标显示"8 人状态",视觉错乱;同时如果下节又是跨场景,
        chain-header 会把这 8 人当"上节结尾"继续往后传播。

    修复策略(跟新生成链路 storyboard_service.py:4039 同款防线):
      **必须同时满足以下条件才修**:
        1. characters 非空(有基线可对比)
        2. scene_type == 'normal'(主时间线节,排除回忆/梦境)
        3. **本节 scene_index != 上节 scene_index(确实是跨场景)**
        4. end_state 角色集 ⊋ characters(有超出激活角色的污染)
      → 然后清掉 characters 之外的角色。

      **同场景**(scene_index 跟上节一样)即使 end_state 超出 characters 也
      **跳过** — 因为同场景里可能有合法的"在场不说话/不列入 characters 的延续角色",
      贸然清会误伤(codex 复审 P0 指出的风险)。

    返回 {"scanned": int, "repaired": int, "skipped_clean": int,
          "skipped_no_chars": int, "skipped_non_main": int, "skipped_same_scene": int,
          "skipped_first_scene": int}
    """
    from database.db import get_db

    stats = {
        "scanned": 0,
        "repaired": 0,
        "skipped_clean": 0,
        "skipped_no_chars": 0,
        "skipped_non_main": 0,
        "skipped_same_scene": 0,
        "skipped_first_scene": 0,  # 一章第一个场景没有"上节场景"可比
    }

    db = await get_db()
    try:
        # 一次拉全部候选 + 排序后的全字段,内存里走 prev_scene_index 滑窗
        # 排序按 (novel_id, script_id, scene_index, section_number, sort_order)
        # 跟 _extract_and_save_end_states 的累积顺序保持一致
        cursor = await db.execute(
            "SELECT id, novel_id, script_id, scene_index, section_number, sort_order, "
            "       scene_type, end_state, characters "
            "FROM storyboards "
            "WHERE end_state IS NOT NULL "
            "AND end_state != '' "
            "AND end_state != '{}' "
            "ORDER BY novel_id ASC, script_id ASC, "
            "         (scene_index IS NULL) ASC, scene_index ASC, "
            "         section_number ASC, sort_order ASC"
        )
        rows = await cursor.fetchall()
        stats["scanned"] = len(rows)
        if not rows:
            logger.info("[migrate] repair_end_state_cross_scene_contamination: 无候选 row,跳过")
            return stats

        # 内存里维护 (novel_id, script_id) → 上一条的 scene_index
        # 当 novel_id / script_id 切换时重置,避免跨章误判
        prev_key = None
        prev_scene_index = None

        to_update: list = []
        for row in rows:
            sid = row["id"]
            curr_key = (row["novel_id"], row["script_id"])
            curr_scene_index = row["scene_index"]
            scene_type = (row["scene_type"] or "normal").lower() if "scene_type" in row.keys() else "normal"

            # 切换 (novel, script) → 重置上节 scene_index
            if curr_key != prev_key:
                prev_key = curr_key
                prev_scene_index = None

            # 在更新 prev_scene_index 之前做判断
            # 一章第一节(prev_scene_index is None)或非主线节 → 跳过 + 但仍要刷新 prev_scene_index
            this_prev_scene = prev_scene_index

            # 不论是否跳过,都先刷新 prev_scene_index(下一条要看)
            if curr_scene_index is not None:
                prev_scene_index = curr_scene_index

            # 解析 end_state / characters
            try:
                es = json.loads(row["end_state"] or "{}")
                cs = json.loads(row["characters"] or "[]")
            except Exception:
                continue
            if not isinstance(es, dict) or not es:
                continue
            if not isinstance(cs, list) or not cs:
                stats["skipped_no_chars"] += 1
                continue
            cs_names = {c for c in cs if isinstance(c, str) and c.strip()}
            if not cs_names:
                stats["skipped_no_chars"] += 1
                continue
            es_names = set(es.keys())

            # 跨场景判断:跟新生成链路同款防线
            #  1. 必须是 normal 主时间线节
            #  2. 必须有"上节 scene_index"作对比(章节第一节没有)
            #  3. curr_scene_index != prev_scene_index
            if scene_type != "normal":
                stats["skipped_non_main"] += 1
                continue
            if this_prev_scene is None:
                # 章节第一节,无法判断跨场景 → 保守不动
                # (这种 case end_state 应该天然就只有本场景角色,不会超过 characters)
                if es_names - cs_names:
                    stats["skipped_first_scene"] += 1
                else:
                    stats["skipped_clean"] += 1
                continue
            if curr_scene_index is None or curr_scene_index == this_prev_scene:
                # 同场景或 scene_index 异常 → 跳过(避免误删合法"在场不说话"角色)
                stats["skipped_same_scene"] += 1
                continue

            # 来到这里:确认是跨场景的主时间线节
            extra = es_names - cs_names
            if not extra:
                stats["skipped_clean"] += 1
                continue

            new_es = {k: v for k, v in es.items() if k in cs_names}
            if not new_es:
                # 清完没剩(异常情况:end_state 跟 characters 完全无交集) — 保守不动 + warn
                logger.warning(
                    f"[migrate] sb={sid} 跨场景 end_state 清污后为空"
                    f"(end={sorted(es_names)} vs chars={sorted(cs_names)} 无交集),保守跳过"
                )
                continue
            to_update.append((json.dumps(new_es, ensure_ascii=False), sid))
            stats["repaired"] += 1
            logger.info(
                f"[migrate] sb={sid} 跨场景 end_state 清污 "
                f"(prev_scene={this_prev_scene} → curr_scene={curr_scene_index}):"
                f"移除 {sorted(extra)},保留 {sorted(new_es.keys())}"
            )

        if to_update:
            for new_es_json, sid in to_update:
                await db.execute(
                    "UPDATE storyboards SET end_state=? WHERE id=?",
                    (new_es_json, sid),
                )
            await db.commit()
    except Exception as e:
        logger.error(f"[migrate] repair_end_state_cross_scene_contamination 失败: {e}")
    finally:
        await db.close()

    logger.info(
        f"[migrate] repair_end_state_cross_scene_contamination 完成: "
        f"扫描 {stats['scanned']} 条, 修复 {stats['repaired']} 条, "
        f"跳过(已干净) {stats['skipped_clean']}, "
        f"跳过(无 characters) {stats['skipped_no_chars']}, "
        f"跳过(非主线) {stats['skipped_non_main']}, "
        f"跳过(同场景) {stats['skipped_same_scene']}, "
        f"跳过(章节首场景无对比) {stats['skipped_first_scene']}"
    )
    return stats
