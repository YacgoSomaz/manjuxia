"""
Unicode 字符清理工具

用于解决 Windows GBK 编码无法处理特殊 Unicode 字符的问题。
"""
import re


# 需要替换的特殊 Unicode 空格字符
# 参考：https://en.wikipedia.org/wiki/Whitespace_character
SPECIAL_SPACE_CHARS = [
    '\u2000',  # EN QUAD
    '\u2001',  # EM QUAD
    '\u2002',  # EN SPACE
    '\u2003',  # EM SPACE
    '\u2004',  # THREE-PER-EM SPACE
    '\u2005',  # FOUR-PER-EM SPACE (本问题的根源)
    '\u2006',  # SIX-PER-EM SPACE
    '\u2007',  # FIGURE SPACE
    '\u2008',  # PUNCTUATION SPACE
    '\u2009',  # THIN SPACE
    '\u200A',  # HAIR SPACE
    '\u200B',  # ZERO WIDTH SPACE
    '\u202F',  # NARROW NO-BREAK SPACE
    '\u205F',  # MEDIUM MATHEMATICAL SPACE
    '\u3000',  # IDEOGRAPHIC SPACE (全角空格)
    '\uFEFF',  # ZERO WIDTH NO-BREAK SPACE (BOM)
]

# 构建正则表达式模式
_SPECIAL_SPACE_PATTERN = re.compile('[' + ''.join(SPECIAL_SPACE_CHARS) + ']')


def sanitize_unicode(text: str, replacement: str = ' ') -> str:
    """
    清理文本中的特殊 Unicode 字符，替换为普通空格或其他字符。
    
    这主要用于：
    1. 传递给外部命令行工具（如即梦 CLI）
    2. 写入可能有编码限制的系统
    
    Args:
        text: 原始文本
        replacement: 替换字符，默认为普通空格
    
    Returns:
        清理后的文本
    
    Example:
        >>> sanitize_unicode("Hello\u2005World")  # \u2005 是 FOUR-PER-EM SPACE
        'Hello World'
    """
    if not text:
        return text
    return _SPECIAL_SPACE_PATTERN.sub(replacement, text)


def sanitize_for_gbk(text: str) -> str:
    """
    将文本转换为 GBK 兼容的格式。
    
    移除或替换 GBK 无法编码的字符，适用于：
    1. Windows 控制台输出
    2. 传递给使用系统默认编码的子进程
    
    Args:
        text: 原始文本
    
    Returns:
        GBK 兼容的文本
    
    Example:
        >>> sanitize_for_gbk("Hello\u2005World")
        'Hello World'
    """
    if not text:
        return text
    
    # 首先替换特殊空格
    text = sanitize_unicode(text)
    
    # 然后尝试编码为 GBK，替换无法编码的字符
    try:
        text.encode('gbk')
        return text
    except UnicodeEncodeError:
        # 将无法编码的字符替换为问号
        return text.encode('gbk', errors='replace').decode('gbk')
