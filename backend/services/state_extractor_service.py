"""分镜小节 end_state 提取器(C 方案第二层)。

职责:
- 给定一个小节的 shots 描述,调 LLM 提取每个在场角色在"本节最后一镜结束时"的状态
- 返回结构化 JSON: {角色名: "姿势·面部状态·持有道具·情绪状态"}

设计要点:
- 复用当前主 LLM 配置,通过 extra_params 降级 thinking_level=low 省成本
- 单一职责 prompt,输入输出极简,准确率高
- 失败时返回 None,调用方决定要不要继续
"""
import json
import logging
import re
from typing import Optional, Dict, Any

from services.llm_service import LLMService

logger = logging.getLogger(__name__)


EXTRACT_SYSTEM = "你是一位专注的分镜状态归档员,只负责从镜头描述中提取每个角色的最终状态,不做任何发挥和解释。"

EXTRACT_USER_TPL = """下面是一个分镜小节的所有镜头 JSON 片段。你的任务:

【任务】
提取每个在场角色在本节【最后一镜结束时】的状态,输出为 JSON 对象。

⛔【最高优先级 · 复制粘贴指令】⛔
如果 shots 数据里能找到「📎 本节结尾状态」或「🔗 本节结尾状态」开头的 block(其后跟若干 `角色名 = 姿势·...` 行),
你必须**一字不差地复制粘贴**这个 block 的内容到输出 JSON,**严禁任何形式的改写、合并、补充、推断**。
此时:
- 忽略「场景起始状态」block(那是本节开始时的状态,不是结尾状态)
- 忽略「🎬 渐进变化」「🎬 不变元素」(那是导演线索,不是状态本身)
- 不要从镜号描述里再去推理 — 你只需要原样搬运 📎/🔗 块的内容

只有当 shots 数据里**完全没有** 📎/🔗 本节结尾状态 block 时,才走下面的"自由提取"模式。

【状态格式】(仅"自由提取"模式下用)
每个角色的状态用"·"分隔的四段信息组成:
`姿势·面部状态·持有道具·情绪状态`

示例:
- "双膝跪地·泪痕未干·双手揪帕子·哀求未止"
- "坐太师椅·神情冷漠·手扶椅柄·厌烦"
- "站立·满脸血污·空手·痛苦喘息"

【规则】
1. 只输出 JSON 对象,不要任何解释文字、markdown、代码块标记
2. 角色名必须完全匹配镜头中出现的人物 — **不要把"渐进变化"线索里提到的角色当成在场角色**
3. 状态要能准确反映最后一镜的状态(伤势/道具/姿势/哭泣等不得丢失)
4. 若某项信息不可确定,写"未变"(如"姿势未变")
5. 仅包含**最后一镜**实际在场的角色,前几镜出现但已退场的不写,顶部线索里出现但本节镜号里没出场的不写

【本节 shots 数据】
{shots_json}

【输出】
只输出 JSON,格式如:
{{"角色名1": "姿势·面部状态·持有道具·情绪状态", "角色名2": "..."}}
"""


async def extract_end_state(
    shots: list,
    llm_config_id: int,
    timeout: float = 180.0,
) -> Optional[Dict[str, str]]:
    """从 shots 数组提取最后一镜结束时的每个角色状态。

    Args:
        shots: [{shot_number, camera, description, dialogue, ...}, ...]
        llm_config_id: 复用主 LLM 配置
        timeout: 超时秒数

    Returns:
        {"角色名": "状态字符串"} 或 None(失败)
    """
    if not shots or not isinstance(shots, list):
        return None

    # 只取必要字段,减小输入 token
    compact = []
    for s in shots:
        if not isinstance(s, dict):
            continue
        compact.append({
            "shot_number": s.get("shot_number"),
            "description": s.get("description", ""),
            "dialogue": s.get("dialogue", ""),
        })
    if not compact:
        return None

    shots_json = json.dumps(compact, ensure_ascii=False)
    messages = [
        {"role": "system", "content": EXTRACT_SYSTEM},
        {"role": "user", "content": EXTRACT_USER_TPL.format(shots_json=shots_json)},
    ]

    try:
        # 注意:这里不走 skip_auto_log_update,让提取调用也有 log 方便追踪
        content = await LLMService.call_llm(
            config_id=llm_config_id,
            messages=messages,
            temperature=0.1,    # 严格还原,不要发挥
            max_tokens=2000,
            timeout=timeout,
            task_type="state_extract",
        )
    except Exception as e:
        logger.warning(f"[state_extractor] LLM 调用失败,走 fallback: {type(e).__name__}: {e}")
        return _fallback_extract_from_shots(shots)

    if not content or not content.strip():
        return _fallback_extract_from_shots(shots)

    parsed = _parse_state_json(content)
    if not parsed:
        logger.warning(f"[state_extractor] LLM 返回无法解析为 JSON,走 fallback。raw 前 200 字: {content[:200]!r}")
        return _fallback_extract_from_shots(shots)
    return parsed


def _fallback_extract_from_shots(shots: list) -> Optional[Dict[str, str]]:
    """LLM 提取失败的纯代码兜底方案:
    - 从 shots 里扫描最后一镜的 description,按"角色名(动作描述)"正则抠出人名
    - 每个人名给一个简化状态:'状态未知·延续上镜' (占位,不精确但避免空链)
    比完全没 state 好,下游 LLM 至少知道哪些角色在场。
    """
    if not shots:
        return None
    # 取最后 2 镜的 description 联合扫描人名
    import re
    texts = []
    for s in shots[-2:]:
        if isinstance(s, dict):
            d = s.get("description", "")
            if d:
                texts.append(d)
    if not texts:
        return None
    joined = "\n".join(texts)
    # 匹配中文姓名(2-4 字),跟在"。"、", "、"、"、开头、空格 后面
    # 简单粗暴:抓出所有连续 2-4 个中文字符且不在常见停用词里的 token
    # 只保留"XX(动作)" / "XX 动作" 这种出现在句首的
    name_pattern = re.compile(r"(?:^|[。，、；\s])([\u4e00-\u9fa5]{2,4})(?=[((（]?[:：])?(?=[（(]?|\s)")
    candidates = set()
    # 更精确:抓"XX((描述))" "XX:xxx" "XX 动作"
    for m in re.finditer(r"([\u4e00-\u9fa5]{2,4})[((（][^)）)]{1,30}[))）]", joined):
        candidates.add(m.group(1))
    # 抓开头的 "XX " 格式
    for line in joined.split("\n"):
        m = re.match(r"\s*([\u4e00-\u9fa5]{2,4})[\s，。]", line.strip())
        if m:
            candidates.add(m.group(1))
    # 过滤太常见的非人名词
    STOP_WORDS = {"画面", "镜头", "背景", "前景", "音效", "光影", "环境", "视觉", "站位",
                  "主光源", "焦平面", "动作", "口型", "对应", "承接", "上镜", "延续",
                  "台词", "声音", "场景", "说话", "情绪", "状态"}
    candidates = {c for c in candidates if c not in STOP_WORDS and len(c) >= 2}
    if not candidates:
        return None
    result = {}
    for name in candidates:
        result[name] = "状态未知·延续上镜"
    logger.info(f"[state_extractor] fallback 抠出 {len(result)} 个角色: {list(result.keys())}")
    return result


def _parse_state_json(raw: str) -> Optional[Dict[str, str]]:
    """容错解析 LLM 返回的 JSON。
    可能情况:
    - 纯 JSON: {...}
    - ```json { ... } ```
    - 前置说明 + JSON
    """
    s = raw.strip()

    # 剥 code block
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", s)
    candidates = []
    if m:
        candidates.append(m.group(1).strip())
    candidates.append(s)
    # 裸 JSON: 从第一个 { 到最后 }
    first = s.find("{")
    last = s.rfind("}")
    if first >= 0 and last > first:
        candidates.append(s[first:last + 1])

    for c in candidates:
        try:
            result = json.loads(c)
            if isinstance(result, dict) and all(isinstance(k, str) and isinstance(v, str) for k, v in result.items()):
                return result
        except Exception:
            continue
    return None


def format_state_for_prompt(
    end_state: Dict[str, str],
    scene_content: str = None,
    all_character_names: list = None,
    is_scene_change: bool = False,
) -> str:
    """把 end_state 格式化成"强制继承·一字不改"的 prompt 注入块。

    v3.59.57:新增 scene_content + all_character_names 过滤参数。
      - 累积层 end_state 保留全场所有角色状态(挂载逻辑不变)
      - 注入层只把"本节剧本里实际提到的角色"喂给 LLM,
        避免 LLM 看到 8 人状态就把 8 人都写进节头(已经过滤掉的角色,
        如果下节再出场会从累积层重新注入,挂载不丢)

    v3.61.84:新增 is_scene_change 参数。
      - True(主线跨场景,如闺房 → 门外):
        不输出"强制继承一字不改"硬指令,改成"弱继承·只传伤势"软提示;
        LLM 看到此块只是知晓哪些角色之前受过伤,姿态/朝向/情绪/道具
        完全依本节剧本重新构思,避免把上节末状态硬套到新场景
      - False(默认 / 同场景下一节):
        维持现有"强制继承一字不改"行为,防 LLM 演绎(瘫坐 → 瘫坐低头)
    """
    if not end_state:
        return ""
    # v3.61.219:按本节剧本提到的"累积角色名"过滤,不再依赖角色库。
    # 旧逻辑要求 all_character_names 非空才过滤;科幻/临时角色库为空时会短路,
    # 导致累积层里已离场角色全量注入新场景。
    if scene_content and scene_content.strip():
        # 角色名 in 剧本文字 即认为本节涉及该角色。
        # 只遍历 end_state 自身的角色名,避免角色库为空或不全导致过滤失效。
        mentioned = {c for c in end_state.keys() if c and c in scene_content}
        filtered = {k: v for k, v in end_state.items() if k in mentioned}
        # 如果过滤后没角色,直接不注入(LLM 视本节为独立)
        if not filtered:
            return ""
        end_state = filtered

    # v3.61.84: 主线跨场景 — 输出"弱继承·只传伤势"版本
    if is_scene_change:
        import re as _re
        injury_lines = []
        for name, state in end_state.items():
            inj_m = _re.search(r'伤势\[([^\]]+)\]', state)
            injury = inj_m.group(1) if inj_m else None
            if injury and injury not in ('无伤', '无', ''):
                injury_lines.append(f"  {name}:伤势[{injury}]")
        if not injury_lines:
            # 跨场景且无人有伤 → 完全不注入,让 LLM 视本节为独立新场景
            return ""
        lines = ["📍 [跨场景·弱继承提示] 📍"]
        lines.append("")
        lines.append("本节是新场景(与上节场景空间不同)。以下角色在前面剧情里受过伤,本节场景起始状态中这些角色的【伤势】字段必须保留(其他字段如姿态/朝向/情绪/道具完全依本节剧本自行推断,不要照搬任何上节状态):")
        lines.append("")
        lines.extend(injury_lines)
        lines.append("")
        lines.append("✅ 正确做法:本节【场景起始状态】块的姿态/朝向/情绪/道具完全基于本节剧本(角色现在在哪、做什么、拿什么、什么情绪),只在【伤势】字段保留以上记录。")
        lines.append("❌ 错误做法:把上节末状态(如「凌婉兮 姿态[转身坐立] 朝向[面向望儿]」)原样搬到本节 — 这是新场景,人物已位移、动作已切换。")
        return "\n".join(lines)

    lines = ["⛔ [强制继承·一字不改] ⛔"]
    lines.append("")
    lines.append("以下为上一节结束时各角色的状态。本节【场景起始状态】块必须一字不差地复制粘贴这段内容,严禁任何形式的改写、润色、扩写或精简。")
    lines.append("")
    lines.append("✅ 正确做法:把下面的状态行原样搬到本节【场景起始状态】块。")
    lines.append("❌ 错误做法 1:把『姿态[瘫坐]』扩写成『姿态[瘫坐低头]』 — 加字算违规。")
    lines.append("❌ 错误做法 2:把『情绪[惊恐无助]』换成『情绪[死灰绝望]』 — 换词算违规。")
    lines.append("❌ 错误做法 3:把『伤势[发怒散乱]』改成『伤势[满脸血污泪水]』 — 换内容算违规。")
    lines.append("")
    lines.append("如果本节剧情需要让状态发生变化(如哭出来、跌倒、咬牙等),必须在第一镜的【动作描述】里明确写出过渡动作,而不是改【场景起始状态】块。")
    lines.append("")
    lines.append("=== 上节结尾状态(本节起始状态原文)===")
    for name, state in end_state.items():
        lines.append(f"  {name} = {state}")
    lines.append("=== 复制结束 ===")
    return "\n".join(lines)
