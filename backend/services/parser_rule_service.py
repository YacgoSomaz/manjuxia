"""解析规则服务 - 从 admin MySQL 动态拉取小节拆分等正则规则。

设计:
- admin 的 preset_templates 表里 category='parser_rule' 的记录存 JSON 规则
- 本服务按 name 拉取(如 'section_split'),带 5 分钟内存缓存
- 拉失败时返回 None,调用方降级到硬编码规则(稳定性保证)

使用:
    from services import parser_rule_service
    rules = await parser_rule_service.get_rules('section_split')
    if rules:
        for rule in rules:
            ... 按 priority 尝试
"""
import json
import logging
import time
from typing import Optional, List, Dict, Any

from services.template_service import _fetch_content_from_admin

logger = logging.getLogger(__name__)

# 简单内存缓存: {name: (timestamp, rules_list)}
_CACHE: Dict[str, tuple[float, Optional[List[Dict[str, Any]]]]] = {}
_CACHE_TTL = 300  # 5 分钟


async def get_rules(rule_name: str) -> Optional[List[Dict[str, Any]]]:
    """获取解析规则列表, 按 priority 升序排列。

    Args:
        rule_name: 规则名(对应 admin preset_templates.name), 如 'section_split'

    Returns:
        规则 dict 列表, 每个含 name/priority/type/pattern/enabled/description 等字段
        或 None(拉取失败/未配置)
    """
    # 缓存命中
    cached = _CACHE.get(rule_name)
    if cached and (time.time() - cached[0] < _CACHE_TTL):
        return cached[1]

    # 从 admin 拉取
    try:
        content = await _fetch_content_from_admin(rule_name, 'parser_rule')
    except Exception as e:
        logger.warning(f"[parser_rule] 拉取 {rule_name} 失败: {e}")
        # 写入缓存防止频繁重试
        _CACHE[rule_name] = (time.time(), None)
        return None

    if not content:
        logger.info(f"[parser_rule] admin 无 {rule_name} 配置, 将降级到硬编码")
        _CACHE[rule_name] = (time.time(), None)
        return None

    # 解析 JSON
    try:
        data = json.loads(content)
        raw_rules = data.get('rules') if isinstance(data, dict) else data
        if not isinstance(raw_rules, list):
            logger.warning(f"[parser_rule] {rule_name} 不是 rules 列表")
            _CACHE[rule_name] = (time.time(), None)
            return None

        # 过滤 enabled=True, 按 priority 升序
        rules = [r for r in raw_rules if isinstance(r, dict) and r.get('enabled', True)]
        rules.sort(key=lambda r: r.get('priority', 100))

        logger.info(
            f"[parser_rule] 已拉取 {rule_name}: {len(rules)} 条规则 "
            f"({[r.get('name') for r in rules]})"
        )
        _CACHE[rule_name] = (time.time(), rules)
        return rules
    except json.JSONDecodeError as e:
        logger.warning(f"[parser_rule] {rule_name} JSON 解析失败: {e}")
        _CACHE[rule_name] = (time.time(), None)
        return None


def clear_cache(rule_name: Optional[str] = None):
    """清空规则缓存(用于测试或手动刷新)。"""
    if rule_name:
        _CACHE.pop(rule_name, None)
    else:
        _CACHE.clear()
