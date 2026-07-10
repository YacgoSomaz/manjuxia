"""v3.61.67: 日志脱敏 — 防破解者扒 app.log / sqlite llm_logs 表抄走 prompt 模板

策略:
  - 短文本(< 400 字)不脱敏(可能是错误信息、key/value 之类,需要完整看)
  - 长文本只保留前 200 字 + 后 200 字,中间用 [脱敏 N 字] 占位
  - 多模态消息里的 image_url 在原 log_service.py 已经截断了 base64,我们不重复
  - 用户排查时可通过环境变量 QIANSHAN_LOG_DEBUG=1 或 settings 'data.log_debug_mode' 关闭脱敏

为什么这么做:
  - 破解者拷一份 app.db sqlite 文件或 app.log,目前能直接看到完整 prompt → 抄走
  - 入库前脱敏 → sqlite 里也只剩摘要 → 抄不到
  - 同时 logger.info 写到 app.log 那侧也走同一个 sanitizer
"""

import os
from typing import Any


_LOG_DEBUG_MODE_CACHE: dict = {"checked_at": 0.0, "value": None}


def _is_log_debug_mode() -> bool:
    """是否开启调试日志模式(开启则 prompt 不脱敏)

    优先级:环境变量 > settings 表 > 默认 False
    """
    if os.environ.get("QIANSHAN_LOG_DEBUG", "").strip().lower() in ("1", "true", "yes", "on"):
        return True
    # settings 表的检查我们做缓存(避免每次 LLM 调用都查 db),60 秒刷一次
    import time
    now = time.time()
    if now - _LOG_DEBUG_MODE_CACHE["checked_at"] < 60 and _LOG_DEBUG_MODE_CACHE["value"] is not None:
        return _LOG_DEBUG_MODE_CACHE["value"]
    try:
        import sqlite3
        from utils.paths import get_data_dir
        db_path = os.path.join(get_data_dir(), 'app.db')
        if not os.path.exists(db_path):
            _LOG_DEBUG_MODE_CACHE["value"] = False
            _LOG_DEBUG_MODE_CACHE["checked_at"] = now
            return False
        conn = sqlite3.connect(db_path, timeout=1)
        try:
            cur = conn.cursor()
            cur.execute("SELECT value FROM app_settings WHERE key=? LIMIT 1", ('data.log_debug_mode',))
            row = cur.fetchone()
            val = bool(row and str(row[0]).strip().lower() in ('1', 'true', 'yes', 'on'))
        except sqlite3.OperationalError:
            val = False
        finally:
            conn.close()
        _LOG_DEBUG_MODE_CACHE["value"] = val
        _LOG_DEBUG_MODE_CACHE["checked_at"] = now
        return val
    except Exception:
        return False


def sanitize_for_log(text: Any, head: int = 200, tail: int = 200, min_len: int = 400) -> str:
    """通用脱敏:长文本只保留首尾,中间打省略号

    - text: 任意类型,会 str() 一次
    - head: 保留开头多少字
    - tail: 保留结尾多少字
    - min_len: 文本短于此值时不脱敏(避免错误消息被截)

    调试模式开启时返回完整字符串
    """
    if text is None:
        return ""
    s = str(text) if not isinstance(text, str) else text
    if _is_log_debug_mode():
        return s
    total = len(s)
    if total <= min_len:
        return s
    head_part = s[:head]
    tail_part = s[-tail:]
    return f"{head_part}\n\n... [脱敏中间 {total - head - tail} 字,如需完整内容请到设置开启调试日志] ...\n\n{tail_part}"


def sanitize_dict_for_log(d: Any, max_value_len: int = 300) -> str:
    """脱敏 dict/list/str:遍历所有 value,长字符串截断

    用于 logger.info(f"data={query_result.get('data')}") 这种场景 —
    query_result.data 是 dict,里面 'prompt' / 'description' 等字段藏着完整模板。
    """
    if _is_log_debug_mode():
        return str(d)
    try:
        return _walk_truncate(d, max_value_len)
    except Exception:
        # 兜底:遇到无法处理的对象直接 str + 整体截断
        s = str(d)
        return sanitize_for_log(s, head=max_value_len, tail=max_value_len, min_len=max_value_len * 2 + 100)


def _walk_truncate(obj: Any, max_value_len: int) -> str:
    """递归遍历 dict/list/tuple,把长字符串截掉"""
    if isinstance(obj, dict):
        parts = []
        for k, v in obj.items():
            parts.append(f"{k!r}: {_walk_truncate(v, max_value_len)}")
        return "{" + ", ".join(parts) + "}"
    if isinstance(obj, (list, tuple)):
        parts = [_walk_truncate(x, max_value_len) for x in obj]
        bracket = "[" if isinstance(obj, list) else "("
        bracket_close = "]" if isinstance(obj, list) else ")"
        return bracket + ", ".join(parts) + bracket_close
    if isinstance(obj, str):
        if len(obj) <= max_value_len:
            return repr(obj)
        return repr(obj[:max_value_len]) + f"...[+{len(obj) - max_value_len} chars]"
    if isinstance(obj, (int, float, bool)) or obj is None:
        return repr(obj)
    # 其他对象 → str() 后再截
    s = str(obj)
    if len(s) <= max_value_len:
        return s
    return s[:max_value_len] + f"...[+{len(s) - max_value_len} chars]"
