"""俯视调度图熔合(实验功能,可整体回退)— 首尾调度链

流程(首张 2 次生图 + 1 次 LLM 推演;同场景续张复用上一节底板,通常 1 次生图):
  1. LLM 只读分镜正文(剥离「起始/结尾状态」块),推演本节结尾调度。
  2. 场景平视图 → 正俯视结构图。
  3. 俯视图 + 人物立绘(最多 13 位,马甲优先) + 尾态推演 → 本节结尾俯视调度图。
产物落 storyboards.topview_image/topview_prompt;start_frame_image/end_frame_image 保留兼容老库但新流程不再生成。
生成视频时动态注入:上一节同场景的 topview_image 作为起始俯视图,本节 topview_image 作为结尾俯视图。
详情面板可 X 掉(四字段一起清)。fusion_history 每步留档。

回退方式:删除本文件 + main.py 注册两行 + 前端熔图列/弹窗/状态模块 + db 四字段(可留存不影响)。
"""
import base64
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.db import get_db
from services.image_service import ImageService
from services.llm_service import LLMService
from utils.paths import resolve_db_path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/topview-demo", tags=["topview-demo"])

_TOPVIEW_PROMPT = (
    "将参考图1的场景转换为同一场景的正俯视(90度垂直俯拍)结构图,如同建筑平面图或掀掉屋顶的俯视沙盘"
    "(dollhouse/RTS 俯视地图):保持场景的建筑结构与家具布局与参考图一致,画面只覆盖参考图可见或可由可见结构直接确定的场景范围,"
    "俯视视角下清晰展示该范围内的房间与院落布局、家具与陈设位置。相机始终锁定在场景正上方,垂直向下拍摄,"
    "视角全程保持90度垂直俯视,不得倾斜、不得转成斜俯或立面透视。"
    "场景边界规则:参考图是空间边界,不是扩建蓝图。无论场景是室内房间/厅堂/地牢/洞窟,还是室外街巷/庭院/园林/宫殿/山林/水域/码头/市集/战场,"
    "都只还原参考图可见的主体空间和能由可见门洞、墙线、道路、水岸、山体、树线、建筑外轮廓直接闭合推断出的部分。"
    "参考图看不到的相邻房间、院落、街区、树林深处、山路后段、水域尽头、城墙外侧、门后空间、楼上楼下和地下空间不要补画;"
    "不要为了画面更完整而补对称建筑、延长街道、扩建府邸、补完整宅院、补整片森林、补山谷、补港口、补战场阵列或复制相似区域。"
    "信息不足的位置允许按可见边界截断、留作遮挡/黑区/雾区/树冠覆盖/墙体外侧空白,不要用模型想象填满。"
    "自适应处理顶盖,分区处理、只掀该掀的:凡是本场景的主体活动空间——被屋顶、亭盖、廊檐遮住下方地面"
    "活动区的房间、花厅、亭子、廊子、水榭、敞厅——一律将其顶盖掀除,露出下方完整、连续、无遮挡的地面"
    "与家具布局(掀顶沙盘效果);而画面里非主体的周边/沿街/环院建筑(如长街两侧民居、院落四周厢房廊庑),"
    "一律保持屋顶顶视——只画屋脊、瓦面、檐口的俯视轮廓,不掀顶、不剖开露室内,作为场景的顶面边框;"
    "凡是本来就露天的院落、街道、天井、屋顶平台等区域,保持原样俯视呈现,不额外加盖。同一张图里可以"
    "一部分掀顶露地面、一部分保留屋顶顶视,按「是否主体活动区」分区决定,不要全掀也不要全封。"
    "所有竖直面——墙体、隔断、屏风、门框、廊柱、栏杆、美人靠,以及墙上的字画/挂画/匾额/牌位/灵位/"
    "壁挂火把或灯具、立牌、展板——一律只呈现为从正上方看到的薄边线或薄轮廓,压成场景边界或细点/细线,"
    "绝不正面展开、绝不作为可辨认的正面画面呈现;墙上的字画、牌位只作为墙顶薄边的一部分带过,不得为了"
    "看清其内容而倾斜视角或把墙立起来。落地的供桌、神龛、香炉、案几等按其顶部俯视轮廓保留平面位置,"
    "仅其上竖立的牌位与墙面平贴装饰压薄或略去。"
    "街道、院落、屋顶、墙体、树冠等区域边界必须清晰;若场景临水,水面、池、河按其俯视轮廓如实画出,"
    "水岸线/陆-水边界必须清晰,水面属不可承载区,不得铺成硬地或院落、不得因反光转成透视斜俯。马车、"
    "车辆、桌椅等实体只能位于道路、院落或室内地面等可承载区域,不得压在屋顶、墙体、树冠、门框、建筑"
    "立面或水面上。掀顶后暴露出的原室内/廊下地面同样计入可承载区。地面、室内地面、院落、道路等可承载"
    "区域要保持清晰、连续、平整、无遮挡,为后续人物落位留出空间。任何被保留的实体尺度都要与建筑相称、"
    "远小于整体场景。"
    "不出现任何人物,不添加文字标注。"
)

_PANORAMA_TOPVIEW_PROMPT = (
    "参考图1若为2:1的720°/VR/equirectangular全景图,它不是普通单向平视图,而是水平360°环绕场景。"
    "必须先理解并还原真实空间结构:全景图左右边缘在真实空间中彼此相连,不能把左右边缘当作断裂墙面或两处不同空间;"
    "不要照抄全景图的拉伸、弯曲、接缝和极区畸变,要把环绕视角中的门、窗、墙体、廊柱、路径、水岸、地形、家具、屏风"
    "按真实相对方位重建成同一张90度正俯视平面结构图。"
    "全景图是场景边界约束,不是扩图灵感。输出只能包含全景中实际可见或能由360°连续视角直接闭合的结构:室内只还原可见房间/厅堂/走廊和可见家具,"
    "门后未知空间截断;街巷只还原可见街段、巷口、沿街建筑轮廓和路面边界,不补整座城;庭院/宫殿只还原可见院落、台阶、廊庑、墙线和主体建筑轮廓,"
    "不补完整府邸;园林/山林/水域只还原可见水岸、桥、亭、树线、假山、路径和地形边界,不补额外水池、山谷或林地;洞窟/地牢只还原可见洞壁、牢门、通道和地面,"
    "暗处按遮挡截断。参考图里看不到、无法由相邻可见结构闭合推断的任何房间、院落、道路、楼阁、墙体、水域、树林、山路、码头、摊位、人群或战场阵列一律不要补画。"
    "若全景某个方向被树木/墙体/岩体/建筑/暗部遮挡或信息不足,该区域保持为空白边界、遮挡区、雾区、暗区或按可见边界截断,不要脑补隐藏空间。"
    "如果同时提供参考图2,参考图2是同一全景拆出的9视图宫格,用于核对可见地标和边界;参考图1与参考图2冲突时,只保留两者共同支持的结构。"
    "输出必须是从全景可见信息重建的局部正俯视结构图,不是完整府邸总平面图,不是2:1全景截图、不是横向长条展开图、"
    "不是鱼眼/环景/VR界面。"
)

_DISPATCH_MARKER_COLORS = [
    "红色", "蓝色", "黄色", "绿色", "紫色", "橙色", "青色",
    "玫红色", "金色", "白色", "黑色", "浅蓝色", "深绿色",
]


def _extract_marker_color_map(dispatch_text: Any) -> Dict[str, str]:
    """从上一节 topview_dispatch_text 里恢复 人名→色标颜色,保证 A/B 同角色同色。"""
    text = str(dispatch_text or "")
    if not text:
        return {}
    color_alt = "|".join(re.escape(c) for c in sorted(_DISPATCH_MARKER_COLORS, key=len, reverse=True))
    result: Dict[str, str] = {}
    for m in re.finditer(rf"({color_alt})(?:框|标记)\s*[=:：]\s*([^（(,，;；。]+)", text):
        color = m.group(1).strip()
        name = m.group(2).strip()
        key = _identity_name_key(name)
        if color and key and key not in result:
            result[key] = color
    return result


def _assign_character_markers(
    chars: List[Dict[str, Any]],
    ref_start: int = 2,
    preferred_colors: Optional[Dict[str, str]] = None,
) -> None:
    """给本次俯视熔图的人物分配稳定色标。

    ref_index 是熔图阶段的参考图编号;视频阶段会再按最终素材列表重映射到图片N。
    """
    preferred_colors = preferred_colors or {}
    used_colors = set()
    for char in chars:
        raw_candidates = [
            char.get("name"),
            char.get("input_name"),
            char.get("variant"),
            *(_parse_json_list(char.get("aliases")) if isinstance(char.get("aliases"), str) else (char.get("aliases") or [])),
        ]
        for raw in raw_candidates:
            color = preferred_colors.get(_identity_name_key(raw))
            if color:
                char["marker_color"] = color
                used_colors.add(color)
                break

    color_cursor = 0
    for idx, char in enumerate(chars):
        color = char.get("marker_color")
        if not color:
            while color_cursor < len(_DISPATCH_MARKER_COLORS) and _DISPATCH_MARKER_COLORS[color_cursor] in used_colors:
                color_cursor += 1
            color = _DISPATCH_MARKER_COLORS[color_cursor % len(_DISPATCH_MARKER_COLORS)]
            used_colors.add(color)
            color_cursor += 1
        char["marker_color"] = color
        char["marker_label"] = f"{color}框"
        char["ref_index"] = ref_start + idx


def _parse_json_list(raw: Any) -> List[str]:
    if isinstance(raw, list):
        return [str(x) for x in raw if str(x or "").strip()]
    try:
        data = json.loads(raw or "[]")
        if isinstance(data, list):
            return [str(x) for x in data if str(x or "").strip()]
    except Exception:
        pass
    return []


def _pick_element_image(elem: Dict[str, Any], priority: tuple) -> Optional[str]:
    path, _key = _pick_element_image_with_key(elem, priority)
    return path


def _pick_element_image_with_key(elem: Dict[str, Any], priority: tuple) -> Tuple[Optional[str], Optional[str]]:
    for key in priority:
        val = elem.get(key)
        if val:
            path = resolve_db_path(str(val))
            if os.path.isfile(path):
                return path, key
    return None, None


def _file_to_base64(path: str, max_side: int = 1280, max_bytes: int = 900_000) -> str:
    """压缩后转 base64。参考图要上传 admin(nginx 体积限制,原图几 MB 会 413),
    压到最长边 1280 + JPEG 自适应质量,融合参考用途分辨率足够。"""
    import io
    from PIL import Image

    source_path = str(path or "").strip()
    if source_path.lstrip("/\\").replace("\\", "/").startswith("data/"):
        source_path = resolve_db_path(source_path)

    try:
        img = Image.open(source_path)
        img = img.convert("RGB")
        w, h = img.size
        scale = max_side / max(w, h)
        if scale < 1:
            img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        quality = 88
        buf = io.BytesIO()
        while True:
            buf.seek(0)
            buf.truncate()
            img.save(buf, "JPEG", quality=quality)
            if buf.tell() <= max_bytes or quality <= 40:
                break
            quality -= 12
        return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception as e:
        logger.warning("[topview-demo] 压缩失败,回退原图 base64: %s (%s)", source_path, e)
        with open(source_path, "rb") as f:
            return base64.b64encode(f.read()).decode("ascii")


def _match_element(name: str, elements: List[Dict[str, Any]], element_type: str) -> Optional[Dict[str, Any]]:
    """复用正式管线的多级匹配(精确→别名→核心名→关键词)。
    分镜场景常是「外 长公主府长街 日」标头格式,元素叫「长公主府长街外景」,
    简单包含匹配不上,必须走 find_best_match 的核心名剥离。"""
    target = str(name or "").strip()
    if not target:
        return None
    from api.video import find_best_match
    try:
        matched = find_best_match(target, elements, element_type)
        if matched:
            return dict(matched)
    except Exception as e:
        logger.warning("[topview-demo] find_best_match 异常,降级简单匹配: %s", e)
    for e in elements:
        en = str(e.get("name") or "").strip()
        if en and (en == target or en in target or target in en):
            return e
    return None


def _extract_placement_text(description: str) -> Optional[str]:
    """从分镜文本抓「空间布局:」或「站位:」行,给熔合 prompt 用。"""
    for pattern in (r"空间布局[:：]\s*(.+)", r"站位[:：]\s*(.+)"):
        m = re.search(pattern, description or "")
        if m:
            text = m.group(1).strip()
            if text:
                return text[:300]
    return None


def _extract_state_lines(description: str, marker: str) -> Dict[str, str]:
    """切出指定状态块(「场景起始状态」/「本节结尾状态」)内的人物状态行。

    分镜首尾两个块都有同名人物行,必须限定块内搜索,不能全文匹配。
    块行格式(规整):  云瓷 = 姿态[转身向窗边跑去]·伤势[无伤]·持有道具[命偶]·情绪[x]·朝向关系[背对谢无妄]
    """
    result: Dict[str, str] = {}
    if not description or not marker:
        return result
    lines = description.splitlines()
    in_block = False
    for raw in lines:
        if not in_block:
            if marker in raw:
                in_block = True
            continue
        s = raw.strip()
        if not s:
            continue  # 块内空行跳过
        m = re.match(r"^(\S+?)\s*[=＝]\s*(.+)$", s)
        if m:
            result[m.group(1).strip()] = m.group(2).strip()
        else:
            break  # 遇到非状态行 = 块结束
    return result


def _state_to_spatial_desc(state_line: Optional[str]) -> Optional[str]:
    """状态行 → 空间三要素(姿态/持有道具/朝向关系)。伤势/情绪对画面调度意义小,略。"""
    if not state_line:
        return None
    parts = []
    for key, label in (("姿态", "姿态"), ("持有道具", "持有"), ("朝向关系", "朝向")):
        km = re.search(rf"{key}\[([^\]]+)\]", state_line)
        if km and km.group(1).strip():
            parts.append(f"{label}:{km.group(1).strip()}")
    return ",".join(parts)[:200] if parts else None


def _extract_character_state(description: str, char_name: str, which: str = "start") -> Optional[str]:
    """which='start' 取「场景起始状态」块;'end' 取「结尾状态」块(🔗 本节结尾状态)。"""
    marker = "起始状态" if which == "start" else "结尾状态"
    block = _extract_state_lines(description, marker)
    return _state_to_spatial_desc(block.get(char_name))


def _strip_state_blocks(description: str) -> str:
    """LLM 尾态推演只看镜号正文,不读模板状态块,避免依赖特定分镜模板格式。"""
    lines = (description or "").splitlines()
    kept: List[str] = []
    in_state = False
    for raw in lines:
        s = raw.strip()
        if re.search(r"(场景起始状态|本节结尾状态|结尾状态)", s):
            in_state = True
            continue
        if in_state:
            if not s:
                continue
            if re.match(r"^\S+\s*[=＝]\s*.+$", s):
                continue
            in_state = False
        kept.append(raw)
    text = "\n".join(kept).strip()
    return text or (description or "").strip()


def _normalize_chain_scene_name(value: Any) -> str:
    text = str(value or "").strip()
    return re.sub(r"\s*[\(（]\s*续\s*\d*\s*[\)）]\s*$", "", text).strip()


async def _find_prev_topview_context(storyboard_id: int) -> Optional[Dict[str, Any]]:
    """找当前小节可接的上一节结尾俯视图,给 A→B 调度推演和生图参考使用。"""
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, novel_id, script_id, sort_order, section_number, scene_index, scene_type, scenes "
            "FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        curr = await cur.fetchone()
        if not curr:
            return None
        try:
            curr_scenes = json.loads(curr["scenes"] or "[]")
        except Exception:
            curr_scenes = []
        curr_scene_type = (curr["scene_type"] if "scene_type" in curr.keys() else None) or "normal"
        curr_scene_idx = curr["scene_index"] if "scene_index" in curr.keys() else None

        if curr_scene_idx is None:
            cur = await db.execute(
                "SELECT id, section_number, scene_index, scenes, topview_image, topview_prompt, topview_dispatch_text "
                "FROM storyboards "
                "WHERE novel_id=? AND script_id IS ? AND sort_order < ? "
                "  AND COALESCE(scene_type, 'normal')=? "
                "ORDER BY sort_order DESC LIMIT 1",
                (curr["novel_id"], curr["script_id"], curr["sort_order"], curr_scene_type),
            )
        else:
            cur = await db.execute(
                "SELECT id, section_number, scene_index, scenes, topview_image, topview_prompt, topview_dispatch_text "
                "FROM storyboards "
                "WHERE novel_id=? AND script_id IS ? AND scene_index IS NOT NULL "
                "  AND (scene_index < ? OR (scene_index = ? AND section_number < ?) "
                "       OR (scene_index = ? AND section_number = ? AND sort_order < ?)) "
                "  AND COALESCE(scene_type, 'normal')=? "
                "ORDER BY scene_index DESC, section_number DESC, sort_order DESC LIMIT 1",
                (
                    curr["novel_id"], curr["script_id"],
                    curr_scene_idx,
                    curr_scene_idx, curr["section_number"],
                    curr_scene_idx, curr["section_number"], curr["sort_order"],
                    curr_scene_type,
                ),
            )
        prev = await cur.fetchone()
        if not prev or not prev["topview_image"]:
            return None
        prev_scene_idx = prev["scene_index"] if "scene_index" in prev.keys() else None
        connectable = prev_scene_idx is not None and curr_scene_idx is not None and prev_scene_idx == curr_scene_idx
        if not connectable:
            try:
                prev_scenes = json.loads(prev["scenes"] or "[]")
            except Exception:
                prev_scenes = []
            connectable = bool(
                prev_scenes and curr_scenes
                and _normalize_chain_scene_name(prev_scenes[0]) == _normalize_chain_scene_name(curr_scenes[0])
            )
        if not connectable:
            return None
        abs_path = resolve_db_path(prev["topview_image"])
        if not abs_path or not os.path.exists(abs_path):
            return None
        return {
            "storyboard_id": prev["id"],
            "scene_index": prev_scene_idx,
            "section_number": prev["section_number"],
            "image_path": prev["topview_image"],
            "abs_path": abs_path,
            "topview_prompt": prev["topview_prompt"],
            "dispatch_text": prev["topview_dispatch_text"],
        }
    finally:
        await db.close()


def _extract_json_object(raw: str) -> Optional[Dict[str, Any]]:
    text = (raw or "").strip()
    if not text:
        return None
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I).strip()
    text = re.sub(r"\s*```$", "", text).strip()
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except Exception:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            data = json.loads(text[start:end + 1])
            return data if isinstance(data, dict) else None
        except Exception:
            return None
    return None


def _format_dispatch_subject(item: Any) -> Optional[str]:
    if not isinstance(item, dict):
        return None
    name = str(item.get("name") or item.get("角色") or item.get("名称") or "").strip()
    parts = []
    for key, label in (
        ("marker_color", "颜色框"), ("色标", "颜色框"),
        ("position", "位置"), ("位置", "位置"),
        ("posture", "姿态"), ("姿态", "姿态"),
        ("action", "动作"), ("动作", "动作"),
        ("holding", "持有"), ("持有", "持有"),
        ("facing", "朝向"), ("朝向", "朝向"),
        ("state", "状态"), ("状态", "状态"),
    ):
        val = str(item.get(key) or "").strip()
        if val:
            parts.append(f"{label}:{val}")
    if name and parts:
        return f"{name}({';'.join(parts)})"
    if name:
        return name
    if parts:
        return ";".join(parts)
    return None


def _format_dispatch_text(data: Dict[str, Any], char_names: List[str], scene_names: List[str]) -> str:
    lines: List[str] = []
    summary = str(data.get("summary") or data.get("结尾概述") or "").strip()
    layout = str(data.get("spatial_layout") or data.get("layout") or data.get("空间布局") or "").strip()
    if summary:
        lines.append(f"结尾概述:{summary}")
    if layout:
        lines.append(f"空间布局:{layout}")
    characters = data.get("characters") or data.get("人物") or []
    if isinstance(characters, dict):
        characters = [{"name": k, **(v if isinstance(v, dict) else {"state": v})} for k, v in characters.items()]
    char_lines = [_format_dispatch_subject(x) for x in characters if _format_dispatch_subject(x)]
    if char_lines:
        lines.append("人物尾态:" + "；".join(char_lines))
    props = data.get("props") or data.get("objects") or data.get("道具") or []
    if isinstance(props, dict):
        props = [{"name": k, **(v if isinstance(v, dict) else {"state": v})} for k, v in props.items()]
    prop_lines = [_format_dispatch_subject(x) for x in props if _format_dispatch_subject(x)]
    if prop_lines:
        lines.append("关键道具:" + "；".join(prop_lines))
    if not lines:
        lines.append(f"场景:{'、'.join(scene_names) or '当前场景'}；人物:{'、'.join(char_names) or '当前人物'}；按分镜正文最后一刻推演人物站位、姿态、持有物和朝向。")
    return "\n".join(lines)[:1600]


def _identity_name_key(value: Any) -> str:
    text = str(value or "").strip()
    return re.sub(r"[\s,，、;；:：·・\-\_()\[\]{}（）【】《》\"'“”‘’]+", "", text)


def _compact_text(value: Any, limit: int = 80) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", "", text)
    return text[:limit]


def _identity_target_desc(target: Any) -> Optional[Dict[str, Any]]:
    if isinstance(target, dict):
        name = str(target.get("name") or target.get("element_name") or "").strip()
        input_name = str(target.get("input_name") or "").strip()
        variant = str(target.get("variant") or target.get("variant_name") or "").strip()
        appearance = str(target.get("appearance") or "").strip()
        marker_color = str(target.get("marker_color") or "").strip()
        marker_label = str(target.get("marker_label") or (f"{marker_color}框" if marker_color else "")).strip()
        ref_index = target.get("ref_index")
        aliases = target.get("aliases") or []
        if isinstance(aliases, str):
            aliases = _parse_json_list(aliases) or [x.strip() for x in re.split(r"[,，、]", aliases) if x.strip()]
        if not isinstance(aliases, list):
            aliases = []
        raw_candidates = [name, input_name, variant, *[str(x).strip() for x in aliases if str(x or "").strip()]]
        base = name or input_name or variant
        label = base
    else:
        base = str(target or "").strip()
        raw_candidates = [base]
        label = base
        appearance = ""
        marker_color = ""
        marker_label = ""
        ref_index = None

    candidates: List[str] = []
    seen: set = set()
    for raw in raw_candidates:
        key = _identity_name_key(raw)
        if key and key not in seen:
            seen.add(key)
            candidates.append(key)
    if not label or not candidates:
        return None
    return {
        "label": label,
        "candidates": candidates,
        "appearance": appearance,
        "marker_color": marker_color,
        "marker_label": marker_label,
        "ref_index": ref_index,
    }


def _identity_fuzzy_score(target: Dict[str, Any], char_key: str) -> int:
    if not char_key:
        return 0
    best = 0
    for cand in target.get("candidates") or []:
        if not cand or cand == char_key:
            continue
        # 一字名/短称呼宁可缺席,不能把「王」误绑到「王妃」。
        if min(len(cand), len(char_key)) < 2:
            continue
        # 两边都只有 2 字时包含关系太脆,只允许至少一侧是更完整的长名。
        if max(len(cand), len(char_key)) < 3:
            continue
        if cand in char_key or char_key in cand:
            best = max(best, min(len(cand), len(char_key)))
    return best


def _format_identity_binding_text(data: Dict[str, Any], target_names: List[Any]) -> str:
    """从 LLM 调度结构里抽一行给视频模型用的身份绑定。

    只走文字约束,不往图上烧编号/箭头,避免生成视频时把标注复现到画面里。
    这里不是动作说明,只负责帮助视频模型把俯拍小人和角色名对上。
    """
    characters = data.get("characters") or data.get("人物") or []
    if isinstance(characters, dict):
        characters = [{"name": k, **(v if isinstance(v, dict) else {"state": v})} for k, v in characters.items()]
    if not isinstance(characters, list):
        return ""

    def _name_of(item: Any) -> str:
        if not isinstance(item, dict):
            return ""
        return str(item.get("name") or item.get("角色") or item.get("名称") or "").strip()

    targets = [x for x in (_identity_target_desc(t) for t in target_names) if x]
    if not targets:
        return ""

    char_entries: List[Dict[str, Any]] = []
    for idx, item in enumerate(characters):
        nm = _name_of(item)
        key = _identity_name_key(nm)
        if nm and key:
            char_entries.append({"idx": idx, "key": key, "item": item})

    matched_by_target: Dict[int, Dict[str, Any]] = {}
    used_chars: set = set()

    # 第一轮:全量精确匹配。先让「王妃」占住「王妃」,避免「王」按子串抢错人。
    for ti, target in enumerate(targets):
        for entry in char_entries:
            if entry["idx"] in used_chars:
                continue
            if entry["key"] in target.get("candidates", []):
                matched_by_target[ti] = entry["item"]
                used_chars.add(entry["idx"])
                break

    # 第二轮:只对剩余项做带歧义保护的长名模糊匹配。可缺失,不可张冠李戴。
    for ti, target in enumerate(targets):
        if ti in matched_by_target:
            continue
        ranked = []
        for entry in char_entries:
            if entry["idx"] in used_chars:
                continue
            score = _identity_fuzzy_score(target, entry["key"])
            if score > 0:
                ranked.append((score, entry))
        if not ranked:
            continue
        ranked.sort(key=lambda x: x[0], reverse=True)
        if len(ranked) > 1 and ranked[0][0] == ranked[1][0]:
            continue
        best_score, best_entry = ranked[0]
        contenders = []
        for other_i, other_target in enumerate(targets):
            if other_i in matched_by_target:
                continue
            score = _identity_fuzzy_score(other_target, best_entry["key"])
            if score > 0:
                contenders.append((score, other_i))
        if any(score >= best_score and other_i != ti for score, other_i in contenders):
            continue
        matched_by_target[ti] = best_entry["item"]
        used_chars.add(best_entry["idx"])

    bindings: List[str] = []
    for ti, target in enumerate(targets):
        matched = matched_by_target.get(ti)
        if not isinstance(matched, dict):
            continue
        position = _compact_text(
            matched.get("landmark_position")
            or matched.get("position")
            or matched.get("位置")
            or matched.get("所在位置"),
            48,
        )
        marker = str(target.get("marker_label") or target.get("marker_color") or "").strip()
        ref_index = target.get("ref_index")
        ref_part = f"熔图参考图{ref_index}" if ref_index else "对应人物素材图"
        detail_parts = [ref_part]
        if position:
            detail_parts.append(position)
        detail = ",".join(detail_parts)
        if marker:
            bindings.append(f"{marker}={target['label']}({detail})")
        else:
            bindings.append(f"{target['label']}({detail})")

    if not bindings:
        return ""
    return (
        "身份绑定:俯视图颜色框认人:" + "；".join(bindings) +
        "。颜色框只用于识别目标人物,不是剧情道具或正片画面元素;"
        "画面其余无色框人影均为背景路人,勿当主角,勿新增人物。"
    )[:1000]


def _build_dispatch_infer_messages(description: str, scene_names: List[str], char_names: List[str],
                                   prop_names: List[str], prev_context: Optional[Dict[str, Any]] = None,
                                   character_refs: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, str]]:
    clean_text = _strip_state_blocks(description)
    prev_text = ""
    if prev_context:
        prev_label = f"上一小节#{prev_context.get('section_number') or prev_context.get('storyboard_id')}"
        prev_dispatch = str(prev_context.get("dispatch_text") or "").strip()
        if prev_dispatch:
            prev_text = f"{prev_label}结尾俯视调度(作为本节起点A):\n{prev_dispatch}\n\n"
        else:
            prev_text = (
                f"{prev_label}已有结尾俯视调度图,会作为本节起点A的图像参考传给生图模型。"
                "请把本节正文理解为从该起点继续发展到结尾B。\n\n"
            )
    reference_text = ""
    reference_lines = []
    for c in character_refs or []:
        label = str(c.get("input_name") or c.get("name") or "").strip()
        marker = str(c.get("marker_label") or c.get("marker_color") or "").strip()
        ref_index = c.get("ref_index")
        ref_text = f"人物参考图{ref_index}" if ref_index else "人物参考图"
        if label:
            reference_lines.append(f"- {marker or '无色框'}={label}({ref_text})")
    if reference_lines:
        reference_text = (
            "人物参考图与颜色框映射(只用于认人和保持颜色框,不要据此编写服装/外观文字):\n"
            + "\n".join(reference_lines[:13]) + "\n\n"
        )
    system = (
        "你是影视分镜调度师。任务是只根据当前小节正文,推演本节结束最后一刻的俯视调度状态。"
        "不要引用或依赖任何「场景起始状态」「本节结尾状态」模板块;输入里若出现状态块也视为无效。"
        "若提供上一小节结尾俯视调度,它就是本节开始时刻A点;你要推演本节正文结束后的B点。"
        "输出必须是严格 JSON,不要 Markdown。"
    )
    user = (
        f"场景:{'、'.join(scene_names) or '未知'}\n"
        f"人物:{'、'.join(char_names) or '未知'}\n"
        f"道具:{'、'.join(prop_names) or '无'}\n\n"
        f"{prev_text}"
        f"{reference_text}"
        f"小节正文:\n{clean_text[:2400]}\n\n"
        "请推演本节结束最后一刻的空间调度,返回 JSON:\n"
        "{\n"
        '  "summary": "一句话概述最后一刻画面",\n'
        '  "spatial_layout": "俯视视角下的空间布局,说明人物/道具相对位置",\n'
        '  "characters": [\n'
        '    {"name": "人物名", "marker_color": "上方分配的颜色框颜色", "position": "锚定场景地标的所在位置", "posture": "姿态动作", "holding": "手中/身上持有物", "facing": "朝向或相对关系", "state": "情绪/伤势等可见状态"}\n'
        "  ],\n"
        '  "props": [{"name": "关键道具", "position": "最后所在位置", "state": "可见状态"}]\n'
        "}\n"
        "只写正文能推出的内容;不确定的持有物写空字符串。\n"
        "characters 里的 marker_color 必须沿用上方分配的颜色框颜色,不要自行换色;每个目标人物都必须保留一条记录。\n"
        "不要输出 appearance/外观/服饰颜色字段,也不要根据小说文字概括人物衣服颜色;人物外观只由后续生图阶段的人物参考图决定。\n"
        "位置描述规则(重要):你看不到实际俯视地图,所以 position 和 spatial_layout 里"
        "严禁使用「画面左1/3」「两侧后景」「中轴线」等画面坐标,也不要断言街道朝向(东西向/南北向)。"
        "position 必须优先锚定场景实体地标来写,例如「马车左轮旁」「朱门台阶下」「高墙墙根」「街心」「廊柱旁」。"
        "不要只写「某人正前方/身后」;若必须写人物相对关系,也要同时补一个地标。"
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


async def _infer_end_dispatch(storyboard_id: int, novel_id: int, description: str,
                              scene_names: List[str], char_names: List[str],
                              prop_names: List[str],
                              prev_context: Optional[Dict[str, Any]] = None,
                              character_refs: Optional[List[Dict[str, Any]]] = None,
                              llm_config_id: Optional[int] = None) -> Dict[str, Any]:
    configs = await LLMService.get_all(config_type="llm")
    if llm_config_id:
        config = next((c for c in configs if int(c.get("id") or 0) == int(llm_config_id)), None)
        if not config:
            raise HTTPException(status_code=400, detail="所选俯视推演 LLM 不存在或不可用,请重新选择文本模型")
    else:
        config = configs[0] if configs else None
    config_id = int(config["id"]) if config and config.get("id") is not None else None
    if not config_id:
        raise HTTPException(status_code=400, detail="没有可用的 LLM 配置,请先在设置里添加文本模型")
    messages = _build_dispatch_infer_messages(
        description, scene_names, char_names, prop_names, prev_context, character_refs
    )
    raw = await LLMService.call_llm(
        config_id=config_id,
        messages=messages,
        temperature=0.1,
        max_tokens=1200,
        timeout=180,
        task_type="topview_dispatch_infer",
        novel_id=novel_id,
        source_id=storyboard_id,
        source_type="topview_dispatch_infer",
    )
    parsed = _extract_json_object(raw or "")
    if not parsed:
        logger.warning("[topview-demo] sb=%s 尾态推演 JSON 解析失败,使用原文兜底。raw=%r", storyboard_id, (raw or "")[:300])
        parsed = {
            "summary": "按小节正文最后一刻推演人物与道具位置",
            "spatial_layout": _strip_state_blocks(description)[:500],
            "characters": [{"name": name, "state": "按正文最后一刻呈现"} for name in char_names[:2]],
            "props": [{"name": name, "state": "按正文最后一刻呈现"} for name in prop_names[:4]],
        }
    return {
        "raw": raw or "",
        "data": parsed,
        "dispatch_text": _format_dispatch_text(parsed, char_names, scene_names),
        "messages": messages,
    }


async def _write_fusion_history(config_id: int, config_name: str, model_name: str,
                                prompt: str, ref_count: int, result: Dict[str, Any]) -> None:
    """demo 生图落一条溶图历史(设置→其他功能→溶图历史可回看),失败不阻断主流程。"""
    try:
        db = await get_db()
        try:
            if result.get("success"):
                await db.execute(
                    "INSERT INTO fusion_history (config_id, config_name, model_name, prompt, ratio, reference_images, "
                    "status, output_image_url, output_remote_url, finished_at) "
                    "VALUES (?, ?, ?, ?, '1:1', ?, 'success', ?, ?, datetime('now','+8 hours'))",
                    (config_id, config_name, model_name, prompt,
                     json.dumps({"count": ref_count}, ensure_ascii=False),
                     result.get("image_url"), result.get("remote_url")),
                )
            else:
                await db.execute(
                    "INSERT INTO fusion_history (config_id, config_name, model_name, prompt, ratio, reference_images, "
                    "status, error_message, finished_at) "
                    "VALUES (?, ?, ?, ?, '1:1', ?, 'failed', ?, datetime('now','+8 hours'))",
                    (config_id, config_name, model_name, prompt,
                     json.dumps({"count": ref_count}, ensure_ascii=False),
                     str(result.get("message", ""))[:500]),
                )
            await db.commit()
        finally:
            await db.close()
    except Exception as e:
        logger.warning("[topview-demo] 写溶图历史失败(忽略): %s", e)


async def _default_image_config_id() -> Optional[int]:
    try:
        configs = await LLMService.get_all(config_type="image")
    except Exception as e:
        logger.warning("[topview-demo] 读取图像配置失败: %s", e)
        return None
    if not configs:
        return None
    return int(configs[0]["id"])


class TopviewFuseRequest(BaseModel):
    config_id: Optional[int] = None  # 前端选择的图像配置;不传用第一个可用配置(兼容旧调用)
    llm_config_id: Optional[int] = None  # 前端选择的文本 LLM,用于尾态/站位推演


@router.delete("/storyboard/{storyboard_id}/fuse")
async def clear_topview_fuse(storyboard_id: int):
    """清除分镜的俯视调度图(仿尾帧的 X 操作):清字段,生成视频时不再传入。图片文件保留在溶图历史。"""
    db = await get_db()
    try:
        await db.execute(
            "UPDATE storyboards SET topview_image = NULL, topview_prompt = NULL, "
            "topview_end_prompt = NULL, topview_dispatch_text = NULL, "
            "start_frame_image = NULL, end_frame_image = NULL WHERE id = ?",
            (storyboard_id,),
        )
        await db.commit()
    finally:
        await db.close()
    return {"success": True}


@router.post("/storyboard/{storyboard_id}/fuse")
async def fuse_topview_demo(storyboard_id: int, request: Optional[TopviewFuseRequest] = None):
    """生成本节结尾俯视调度图。同步执行(前端 timeout 需给足)。
    完成后把结果落到 storyboards.topview_image/topview_prompt,生成视频时自动参与首尾俯视链。"""
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, novel_id, description, characters, scenes, props FROM storyboards WHERE id = ?",
            (storyboard_id,),
        )
        sb = await cur.fetchone()
        if not sb:
            raise HTTPException(status_code=404, detail="分镜不存在")
        novel_id = sb["novel_id"]
        cur = await db.execute(
            "SELECT id, name, element_type, aliases, description, attributes, image_prompt, "
            "image_url, finished_image, reference_image, grid_image, panorama_url, active_variant_id "
            "FROM extracted_elements WHERE novel_id = ? AND element_type IN ('scene','character')",
            (novel_id,),
        )
        rows = await cur.fetchall()
    finally:
        await db.close()

    elements = [dict(r) for r in rows]
    scene_pool = [e for e in elements if e["element_type"] == "scene"]
    char_pool = [e for e in elements if e["element_type"] == "character"]

    scene_names = _parse_json_list(sb["scenes"])
    # v3(codex 审核 P3):不预截 [:2] — 遍历全部人物,收满 2 个唯一人物即停,
    # 防前两个名字匹配到同一元素时,第三个有效人物没机会补位。
    char_names = _parse_json_list(sb["characters"])
    prop_names = _parse_json_list(sb["props"])

    scene_elem = _match_element(scene_names[0], scene_pool, "scene") if scene_names else None
    if not scene_elem:
        raise HTTPException(status_code=400, detail=f"未匹配到场景元素(分镜场景: {scene_names or '空'})")
    scene_img, scene_img_source = _pick_element_image_with_key(
        scene_elem, ("panorama_url", "image_url", "finished_image", "reference_image")
    )
    if not scene_img:
        raise HTTPException(status_code=400, detail=f"场景「{scene_elem['name']}」没有可用全景图或场景图,请先生成场景素材")
    scene_grid_img = ""
    if scene_img_source == "panorama_url":
        scene_grid_raw = scene_elem.get("grid_image") or ""
        if scene_grid_raw:
            resolved_grid_path = resolve_db_path(scene_grid_raw)
            if os.path.isfile(resolved_grid_path):
                scene_grid_img = resolved_grid_path
            else:
                logger.info(
                    "[topview-demo] 场景「%s」有 grid_image 但文件不存在,不作为全景辅助参考: %s",
                    scene_elem["name"], resolved_grid_path,
                )

    # v2 修复:人物取图走马甲解析(active_variant_id 有值时用马甲资产,与视频生成同口径);
    #          并按元素/图片双重去重,防两个名字匹配到同一元素导致参考图重复。
    from services.extraction_service import ExtractionService
    chars: List[Dict[str, Any]] = []
    _seen_elem_ids: set = set()
    _seen_paths: set = set()
    _matched_input_names: set = set()
    _MAX_CHARS = 13  # 融合接口最多 14 张参考图:1 张俯视底板 + 13 位人物
    if len(char_names) > _MAX_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"俯视调度图最多支持 {_MAX_CHARS} 位人物参考图,当前 {len(char_names)} 位,请先减少本小节关联人物"
        )
    for name in char_names:
        elem = _match_element(name, char_pool, "character")
        if not elem:
            continue
        if elem.get("id") in _seen_elem_ids:
            logger.info("[topview-demo] 人物「%s」与已选人物匹配到同一元素#%s,跳过", name, elem.get("id"))
            continue
        try:
            resolved = await ExtractionService.resolve_active_character_asset(dict(elem))
        except Exception as e:
            logger.warning("[topview-demo] 马甲解析失败,用本体: %s", e)
            resolved = dict(elem)
        img = _pick_element_image(resolved, ("finished_image", "image_url", "grid_image", "reference_image"))
        if img and img not in _seen_paths:
            _seen_elem_ids.add(elem.get("id"))
            _seen_paths.add(img)
            _matched_input_names.add(name)
            _variant = resolved.get("__active_variant_name")
            chars.append({
                "name": elem["name"],
                "input_name": name,
                "path": img,
                "variant": _variant,
                "aliases": elem.get("aliases"),
                # 不从文字描述抽服装颜色。人物外观只允许由实际参考图决定,
                # 避免 DB 描述/马甲旧文案和当前参考图不一致时反向污染生图。
                "appearance": "",
            })
            logger.info(
                "[topview-demo] 人物「%s」取图[马甲=%s]: %s",
                elem["name"], _variant or "本体", img
            )
    if len(chars) < len(char_names):
        missing_names = [n for n in char_names if n not in _matched_input_names]
        logger.warning("[topview-demo] sb=%s 部分人物没有可用参考图: %s", storyboard_id, missing_names)
    if not chars:
        raise HTTPException(status_code=400, detail=f"分镜关联人物({char_names or '空'})都没有可用立绘")

    config_id = (request.config_id if request else None) or await _default_image_config_id()
    if not config_id:
        raise HTTPException(status_code=400, detail="没有可用的图像模型配置,请先到 设置→大模型配置 添加")
    config = await LLMService.get_by_id(config_id)
    config_name = (config or {}).get("name", "")

    prev_topview = await _find_prev_topview_context(storyboard_id)
    _assign_character_markers(
        chars,
        ref_start=2,
        preferred_colors=_extract_marker_color_map(prev_topview.get("dispatch_text") if prev_topview else ""),
    )
    if prev_topview:
        logger.info(
            "[topview-demo] sb=%s 接入上一节结尾俯视图 prev=%s path=%s",
            storyboard_id, prev_topview.get("storyboard_id"), prev_topview.get("abs_path")
        )

    dispatch = await _infer_end_dispatch(
        storyboard_id=storyboard_id,
        novel_id=novel_id,
        description=sb["description"] or "",
        scene_names=scene_names,
        char_names=char_names,
        prop_names=prop_names,
        prev_context=prev_topview,
        character_refs=chars,
        llm_config_id=request.llm_config_id if request else None,
    )
    dispatch_text = dispatch["dispatch_text"]
    identity_binding_text = _format_identity_binding_text(dispatch.get("data") or {}, chars)
    if identity_binding_text and "身份绑定:" not in dispatch_text:
        dispatch_text = f"{dispatch_text}\n{identity_binding_text}"
    logger.info("[topview-demo] sb=%s 尾态推演完成 len=%s", storyboard_id, len(dispatch_text))

    # ---- step 1: 场景平视图 → 俯视结构图 ----
    # 同一物理场景已有上一节俯视图时,直接把上一节图当作唯一地图底板。
    # 否则每节重新从场景平视图生一张俯视底板,模型会改街道/建筑/裁切,同场景连续图会漂。
    if prev_topview:
        top_view_url = prev_topview["image_path"]
        top_view_path = prev_topview["abs_path"]
        logger.info(
            "[topview-demo] sb=%s step1 跳过重建底板,复用上一节俯视图 prev=%s",
            storyboard_id, prev_topview.get("storyboard_id")
        )
    else:
        topview_prompt = _TOPVIEW_PROMPT + (_PANORAMA_TOPVIEW_PROMPT if scene_img_source == "panorama_url" else "")
        logger.info(
            "[topview-demo] sb=%s step1 俯视图 config=%s scene=%s ref_source=%s grid_ref=%s",
            storyboard_id, config_name, scene_elem["name"], scene_img_source or "unknown", bool(scene_grid_img)
        )
        step1_refs = [_file_to_base64(scene_img)]
        if scene_grid_img:
            step1_refs.append(_file_to_base64(scene_grid_img))
        r1 = await ImageService.generate_fusion_image(
            config_id=config_id,
            prompt=topview_prompt,
            ratio="1:1",
            reference_images_base64=step1_refs,
            task_type="topview_dispatch",
            task_title=f"俯视人物调度图(底板 {len(step1_refs)} 图)",
            feature_name="俯视人物调度图",
        )
        await _write_fusion_history(config_id, config_name, (config or {}).get("model_name", ""),
                                    f"[俯视人物调度图 sb={storyboard_id} step1 场景俯视图] {topview_prompt}", len(step1_refs), r1)
        if not r1.get("success") or not r1.get("image_url"):
            raise HTTPException(status_code=500, detail=f"俯视图生成失败: {r1.get('message', '未知错误')}")
        top_view_url = r1["image_url"]
        top_view_path = resolve_db_path(top_view_url)
        if not os.path.isfile(top_view_path):
            raise HTTPException(status_code=500, detail=f"俯视图文件缺失: {top_view_url}")

    # ---- step 2: 俯视图 + 人物 + LLM 尾态推演 → 结尾俯视调度图 ----
    lines = []
    char_ref_base = 2
    for i, c in enumerate(chars):
        lines.append(f"{c.get('marker_label') or c.get('marker_color') or '颜色框'}=人物「{c['name']}」(参考图{i + char_ref_base})")
    marker_rule_text = (
        "人物颜色框规则:" +
        "；".join(
            f"{c.get('marker_label')}={c['name']}(参考图{c.get('ref_index')},外观只按参考图{c.get('ref_index')})"
            for c in chars
        ) +
        "。"
    )
    character_ref_lock_text = (
        "人物参考图硬约束:" +
        "；".join(
            f"参考图{c.get('ref_index')}是人物「{c['name']}」的唯一外观来源,{c.get('marker_label')}只允许框住由参考图{c.get('ref_index')}生成出来的该人物"
            for c in chars
        ) +
        "。每个目标人物必须严格沿用对应参考图在俯视下可见的发型/发色、服装颜色、服饰轮廓、体态比例和持有物;"
        "正俯视看不到脸属正常,不要为了展示脸部而放大人物、抬高视角或把人物转成半正脸;"
        "不得根据文字设定、场景背景人物或模型想象自行改换衣服颜色/款式,不得把参考图A的人物外观套给参考图B的人物。"
    )
    prev_ref_text = ""
    if prev_topview:
        prev_ref_text = (
            "参考图1是上一小节结尾俯视调度图,也是本节同一物理场景的唯一地图底板。"
            "必须锁定参考图1的街道走向、建筑轮廓、屋顶位置、院落开口、马车位置、树木位置、光照方向、镜头高度、裁切范围和画幅尺度;"
            "严禁重新设计街区、扩展地图、缩放视野、旋转镜头或改变构图。"
            "只允许把人物/关键道具从参考图1的开始时刻A点,按照本节正文和尾态推演移动到本节结尾B点;"
            "人物、马车、车辆、道具只能移动到道路、院落、室内地面等可行走/可承载区域,不得移动到屋顶、墙体、树冠或建筑阴影上;"
            "旧人物站位需要被新的结尾站位替换,不要残留重复人物,也不得因为底板已有旧人物而省略本节目标人物;"
            "参考图1里已有的旧颜色框只代表上一节起点,必须随人物移动并按本节人物颜色框规则更新,不要在旧位置残留。"
        )
    base_text = (
        "在参考图1(上一小节同场景俯视调度底板)的基础上,"
        if prev_topview
        else "在参考图1(场景俯视结构图)的基础上,"
    )
    fuse_prompt = (
        f"{base_text}保持场景结构、家具布局、材质、光照完全不变,"
        f"将 {'、'.join(lines)} 以正俯视视角自然融入场景。"
        f"{marker_rule_text}"
        f"{character_ref_lock_text}"
        f"{prev_ref_text}"
        "以下是 LLM 推演出的本节结尾调度。其中人物的姿态、持有物、朝向、以及人物之间的相对关系(谁面对谁、谁在谁旁边)必须严格遵守;"
        "但调度里出现的任何画面方位词(如「画面两侧」「左1/3」「后景」「靠近高墙」)只作弱参考,不得据此把人物贴到墙边或屋顶——"
        "人物最终落在哪里,一律以参考图1底板里真实的街道/院落/室内地面为准,在满足相对关系的前提下就近落到可承载地面上:\n"
        f"{dispatch_text}\n"
        f"画面中必须完整出现上述 {len(chars)} 位目标人物,逐一对应参考图{char_ref_base}到参考图{char_ref_base + len(chars) - 1};"
        "每位目标人物必须带有唯一对应颜色的清晰矩形框标注,颜色严格按「人物颜色框规则」执行;"
        "矩形框使用高饱和纯色线条,完整圈住该人物的主要身体区域,线条清晰可见,不得遮挡脸部和身体主体;"
        "矩形框应贴近对应人物,不得框住其他人物或背景物。"
        "背景路人、围观群众、随从等非目标人物一律不得带颜色框。"
        "严禁少人、合并人物、用背影/遮挡代替目标人物,每位目标人物最终只出现一次。"
        "除上述目标人物和分镜/尾态推演明确要求的背景人群外,不要主动新增路人、随从或围观者;"
        "若尾态推演提到围观群众/权贵夫人小姐/路人,只能作为弱化背景小人影,不得替代或吞掉目标人物。"
        "所有人物、车马、家具与建筑必须保持真实世界比例:成年人身高约等于普通门高,"
        "马车、桌椅等物件不得明显大于真实尺度,人物在俯视全景中应显著小于建筑。"
        "必须遵守物理碰撞关系:屋顶、墙体、树冠、门框和建筑立面是不可通行/不可承载区域;"
        "人物、马、马车、车辆、桌椅、酒壶等实体必须落在街道、院落、室内地面或台阶平台上,不得悬浮、穿墙、压住屋顶或覆盖建筑结构。"
        "调度文本里的方位词只是相对参考,若与参考图1的实际地图冲突(如街道朝向不一致、指定方位落在屋顶上),"
        "一律以参考图1的地图结构为准:保持人物之间的相对关系,把每个人物沿最近的街道、院落或室内地面就近落位,"
        "任何人物(包括背景围观人群)都绝不允许出现在屋顶、墙头或树冠上。"
        "输出同一俯视视角的本节结尾调度图,人物在画面中位置清晰可辨。"
        "不要写中文/英文人名、数字编号、箭头或说明文字;只允许保留上述彩色矩形框作为人物识别标注。"
    )
    refs = [_file_to_base64(top_view_path)]
    refs += [_file_to_base64(c["path"]) for c in chars]
    logger.info("[topview-demo] sb=%s step2 结尾俯视调度 chars=%s", storyboard_id, [c["name"] for c in chars])
    r2 = await ImageService.generate_fusion_image(
        config_id=config_id,
        prompt=fuse_prompt,
        ratio="1:1",
        reference_images_base64=refs,
        task_type="topview_dispatch",
        task_title=f"俯视人物调度图(人物融合 {len(refs)} 图)",
        feature_name="俯视人物调度图",
    )
    await _write_fusion_history(config_id, config_name, (config or {}).get("model_name", ""),
                                f"[俯视人物调度图 sb={storyboard_id} step2 人物融合] {fuse_prompt}", len(refs), r2)
    if not r2.get("success") or not r2.get("image_url"):
        err_msg = r2.get("message", "未知错误")
        if "geek HTTP 500" in str(err_msg) or "未接收到上游响应内容" in str(err_msg):
            err_msg = (
                f"{err_msg}。Geek 多参考图融合上游未返回内容,建议切换 KKAI/Cool/速创 等融合模型重试;"
                "这不是分镜数据丢失,俯视底板已生成但未绑定为最终人物调度图。"
            )
        raise HTTPException(status_code=500, detail=f"人物熔合失败: {err_msg}(俯视图已生成: {top_view_url})")

    # 落库:topview_image 表示「本节结尾俯视调度图」。start/end_frame 字段为上一版遗留,新流程清空。
    topview_start_prompt = "俯视人物调度图A:本镜开始时的人物站位与颜色框"
    topview_prompt = "俯视人物调度图B:本镜结束时的人物站位与颜色框"
    db = await get_db()
    try:
        await db.execute(
            "UPDATE storyboards SET topview_image = ?, topview_prompt = ?, "
            "topview_start_prompt = ?, topview_end_prompt = ?, topview_dispatch_text = ?, "
            "start_frame_image = ?, end_frame_image = ? WHERE id = ?",
            (r2["image_url"], topview_prompt, topview_start_prompt, topview_prompt, dispatch_text, None, None, storyboard_id),
        )
        await db.commit()
    finally:
        await db.close()

    return {
        "success": True,
        "top_view_url": top_view_url,
        "fused_url": r2["image_url"],
        "start_frame_url": None,
        "end_frame_url": None,
        "config_name": config_name,
        "scene_name": scene_elem["name"],
        "character_names": [c["name"] for c in chars],
        "character_markers": [
            {
                "name": c["name"],
                "input_name": c.get("input_name"),
                "marker_color": c.get("marker_color"),
                "marker_label": c.get("marker_label"),
                "ref_index": c.get("ref_index"),
                "appearance": c.get("appearance"),
            }
            for c in chars
        ],
        "placement_text": dispatch_text,
        "dispatch_text": dispatch_text,
        "topview_dispatch_text": dispatch_text,
        "dispatch_raw": dispatch["raw"],
        "fuse_prompt": fuse_prompt,
        "topview_prompt": topview_prompt,
        "topview_start_prompt": topview_start_prompt,
        "topview_end_prompt": topview_prompt,
        "reused_prev_topview": bool(prev_topview),
    }
