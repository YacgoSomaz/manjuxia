"""
时区工具模块 - 提供北京时间相关功能
"""
from datetime import datetime, timezone, timedelta

# 北京时区 (UTC+8)
BEIJING_TZ = timezone(timedelta(hours=8))


def now_beijing() -> datetime:
    """返回当前北京时间（带时区信息）"""
    return datetime.now(BEIJING_TZ)


def now_beijing_str() -> str:
    """返回当前北京时间的简单格式字符串（兼容SQLite）"""
    return datetime.now(BEIJING_TZ).strftime('%Y-%m-%d %H:%M:%S')


def now_beijing_strf(format_str: str = '%Y-%m-%d %H:%M:%S') -> str:
    """返回当前北京时间的自定义格式字符串
    
    Args:
        format_str: 时间格式字符串，默认为 '%Y-%m-%d %H:%M:%S'
    
    Returns:
        格式化后的时间字符串
    """
    return datetime.now(BEIJING_TZ).strftime(format_str)


def beijing_time_str_to_iso(time_str: str) -> str:
    """将北京时间字符串转换为 ISO 格式（带时区）
    
    Args:
        time_str: 时间字符串，支持多种格式
        
    Returns:
        ISO 格式的时间字符串
    """
    # 尝试解析常见格式
    formats = [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S.%f',
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(time_str, fmt)
            # 如果没有时区信息，假设是北京时间
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=BEIJING_TZ)
            return dt.isoformat()
        except ValueError:
            continue
    
    # 如果都无法解析，返回原字符串
    return time_str
