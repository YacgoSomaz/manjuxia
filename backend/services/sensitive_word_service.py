#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""敏感词扫描/清洗服务

- 启动时从 admin-server 拉取敏感词库,缓存到本地 DB(sensitive_words_cache 表)
- 如拉取失败,使用上次缓存或内置 fallback 词库
- 提供扫描和清洗 API
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
import aiohttp
from utils.ssl_helper import get_aiohttp_connector
from database.db import get_db
from utils.timezone import now_beijing_str
from services.offline_guard import require_cloud

logger = logging.getLogger(__name__)

ADMIN_API_URL = "https://xiaoshuo.qianshanai.cn/api/sensitive-words"

# fallback 词库(admin 不可达时用)
_FALLBACK_WORDS = [
    {"word": "大马金刀", "replacement": "端坐", "category": "暴力", "reason": "暗含威压感"},
    {"word": "怒斥", "replacement": "严肃说", "category": "暴力", "reason": "情绪激烈"},
    {"word": "暴怒", "replacement": "生气", "category": "暴力", "reason": "极端情绪"},
    {"word": "离家出走", "replacement": "在外求学", "category": "家庭", "reason": "家庭问题敏感"},
    {"word": "校服", "replacement": "便装", "category": "未成年", "reason": "未成年服饰"},
    {"word": "学生", "replacement": "青年", "category": "未成年", "reason": "年龄敏感"},
    {"word": "少女", "replacement": "年轻女性", "category": "未成年", "reason": "年龄敏感"},
    {"word": "性感", "replacement": "", "category": "情色", "reason": "情色词禁用"},
    {"word": "妖娆", "replacement": "", "category": "情色", "reason": "情色词禁用"},
    {"word": "撕心裂肺", "replacement": "悲痛", "category": "极端情绪", "reason": "情绪夸张"},
    {"word": "歇斯底里", "replacement": "激动", "category": "极端情绪", "reason": "情绪夸张"},
    {"word": "真人扮演", "replacement": "", "category": "真人锚", "reason": "易被误解为真人"},
]


async def init_cache_table():
    """创建客户端本地缓存表"""
    db = await get_db()
    await db.execute("""
        CREATE TABLE IF NOT EXISTS sensitive_words_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL UNIQUE,
            replacement TEXT DEFAULT '',
            category TEXT DEFAULT '',
            reason TEXT DEFAULT '',
            updated_at TEXT
        )
    """)
    await db.commit()
    await db.close()


async def sync_from_admin(timeout: int = 10) -> int:
    """从 admin-server 同步词库到本地缓存,返回成功同步的词条数

    拉取失败时保留上次缓存不变,返回 0
    """
    require_cloud("远端敏感词同步")
    try:
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            async with session.get(f"{ADMIN_API_URL}?platform=jimeng") as resp:
                if resp.status != 200:
                    logger.warning(f"[sensitive] admin 返回 {resp.status},跳过同步")
                    return 0
                data = await resp.json()
        words = data.get("words", [])
        if not words:
            logger.info("[sensitive] admin 无词库数据")
            return 0

        db = await get_db()
        try:
            # 全量替换(简单粗暴,数据量小)
            await db.execute("DELETE FROM sensitive_words_cache")
            now = now_beijing_str()
            for w in words:
                await db.execute(
                    "INSERT OR REPLACE INTO sensitive_words_cache (word, replacement, category, reason, updated_at) VALUES (?, ?, ?, ?, ?)",
                    (w["word"], w.get("replacement", ""), w.get("category", ""), w.get("reason", ""), now)
                )
            await db.commit()
        finally:
            await db.close()
        logger.info(f"[sensitive] 从 admin 同步 {len(words)} 条敏感词到本地")
        return len(words)
    except Exception as e:
        logger.warning(f"[sensitive] 同步 admin 失败,使用本地缓存: {type(e).__name__}: {e}")
        return 0


async def ensure_fallback_seeded():
    """如本地缓存为空(从未同步成功),写入 fallback 兜底"""
    db = await get_db()
    try:
        cur = await db.execute("SELECT COUNT(*) FROM sensitive_words_cache")
        row = await cur.fetchone()
        count = row[0] if row else 0
        if count == 0:
            now = now_beijing_str()
            for w in _FALLBACK_WORDS:
                await db.execute(
                    "INSERT OR IGNORE INTO sensitive_words_cache (word, replacement, category, reason, updated_at) VALUES (?, ?, ?, ?, ?)",
                    (w["word"], w["replacement"], w["category"], w["reason"], now)
                )
            await db.commit()
            logger.info(f"[sensitive] 本地缓存为空,已写入 {len(_FALLBACK_WORDS)} 条 fallback")
    finally:
        await db.close()


async def get_all_words() -> List[Dict[str, Any]]:
    """返回当前缓存中的所有敏感词"""
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT word, replacement, category, reason FROM sensitive_words_cache ORDER BY word"
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


# category → 即梦失败类型映射(用户反馈即梦审核 3 大类)
_FAILURE_TYPE_MAP = {
    "真人锚": "jimeng_face",      # 真人脸识别失败
    "IP": "jimeng_video",          # 可能导致视频整体审核失败
    "IP名人": "jimeng_video",
    # 其他所有 category 默认归文字不合规
}

_FAILURE_TYPE_LABEL = {
    "jimeng_face": "🎭 真人脸识别失败",
    "jimeng_text": "📝 文字内容不合规",
    "jimeng_video": "🚫 视频整体审核失败",
}


def _infer_failure_type(category: str) -> str:
    """根据 category 推导即梦失败类型"""
    return _FAILURE_TYPE_MAP.get(category or "", "jimeng_text")


async def scan_text(text: str) -> Dict[str, Any]:
    """扫描文本中的敏感词,返回命中列表 + 建议清洗结果 + 按即梦失败类型分组

    返回:
      {
        "has_hits": bool,
        "hits": [{word, replacement, category, reason, positions, failure_type}],
        "hits_by_failure": {jimeng_face: [...], jimeng_text: [...], jimeng_video: [...]},
        "failure_labels": {jimeng_face: "🎭 真人脸识别失败", ...},
        "original": "原文",
        "cleaned": "替换后文本"
      }
    """
    if not text:
        return {
            "has_hits": False, "hits": [], "hits_by_failure": {},
            "failure_labels": _FAILURE_TYPE_LABEL,
            "original": text or "", "cleaned": text or ""
        }

    words = await get_all_words()
    hits = []
    cleaned = text
    for w in words:
        word = w["word"]
        if not word or word not in text:
            continue
        # 找出所有命中位置
        positions = []
        start = 0
        while True:
            idx = text.find(word, start)
            if idx < 0:
                break
            positions.append([idx, idx + len(word)])
            start = idx + len(word)

        hits.append({
            "word": word,
            "replacement": w["replacement"] or "",
            "category": w["category"] or "",
            "reason": w["reason"] or "",
            "positions": positions,
            "count": len(positions),
            "failure_type": _infer_failure_type(w["category"] or ""),
        })
        # 替换(空 replacement 就删除)
        cleaned = cleaned.replace(word, w["replacement"] or "")

    # 按 failure_type 分组
    hits_by_failure: Dict[str, list] = {}
    for h in hits:
        ft = h["failure_type"]
        hits_by_failure.setdefault(ft, []).append(h)

    return {
        "has_hits": bool(hits),
        "hits": hits,
        "hits_by_failure": hits_by_failure,
        "failure_labels": _FAILURE_TYPE_LABEL,
        "original": text,
        "cleaned": cleaned,
    }
