"""Ephemeral scene-image references for storyboard generation.

The image is resolved from the current novel's extracted scene assets, resized
entirely in memory and returned as a short-lived data URL.  Nothing in this
module writes the derived image to disk or to the database.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

import httpx
from PIL import Image, ImageOps

from services.extraction_service import ExtractionService
from utils.paths import resolve_db_path


logger = logging.getLogger(__name__)

MAX_SOURCE_BYTES = 15 * 1024 * 1024
MAX_OUTPUT_BYTES = 2 * 1024 * 1024
MAX_IMAGE_SIDE = 1600

SCENE_REFERENCE_INSTRUCTION = (
    "【当前场景素材图视觉参考｜仅限本次请求】\n"
    "请读取图片中真实可见的空间结构、前景/中景/背景、固定陈设、材质与色彩、"
    "时辰光影、天气氛围及可见动态特效，并据此完成当前场景的分镜设计。\n"
    "边界：图片中的人物、临时道具、现成构图、机位和人物动作不得直接继承；"
    "不得新增剧本未出现的人物、道具或剧情；剧本与分镜模板的明确要求优先。"
)

_TIME_SUFFIXES: Tuple[Tuple[str, str], ...] = (
    ("时间未明", "unknown"),
    ("时辰未明", "unknown"),
    ("凌晨", "dawn"),
    ("黎明", "dawn"),
    ("早晨", "dawn"),
    ("清晨", "dawn"),
    ("日出", "dawn"),
    ("晨", "dawn"),
    ("上午", "day"),
    ("正午", "day"),
    ("中午", "day"),
    ("午间", "day"),
    ("午后", "day"),
    ("下午", "day"),
    ("白日", "day"),
    ("黄昏", "dusk"),
    ("傍晚", "dusk"),
    ("日落", "dusk"),
    ("暮", "dusk"),
    ("深夜", "night"),
    ("雨夜", "night"),
    ("雪夜", "night"),
    ("夜", "night"),
    ("白天", "day"),
    ("日间", "day"),
    ("日", "day"),
)


def _safe_aliases(value: Any) -> List[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item or "").strip()]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item or "").strip()]
        except Exception:
            pass
        return [item.strip() for item in re.split(r"[,，、;/；\n]+", value) if item.strip()]
    return []


def normalize_scene_reference_key(value: Any) -> str:
    """Normalize a scene label while deliberately preserving its time slot."""
    text = str(value or "").strip().lower()
    if not text:
        return ""
    bracket = re.search(r"[【\[]([^】\]]+)[】\]]", text)
    if bracket:
        text = bracket.group(1)
    text = re.sub(r"^\s*(?:场景\s*)?\d+(?:[-－—.]\d+)?\s*[:：、.-]?\s*", "", text)
    text = re.sub(r"^\s*#?\d+(?:[-－—.]\d+)+\s*", "", text)
    text = re.sub(r"[（(]\s*续\s*\d*\s*[）)]\s*$", "", text)
    text = re.sub(r"[（(]\s*\d+\s*字\s*[）)]\s*$", "", text)
    text = re.sub(r"^\s*(?:内\s*/\s*外|外\s*/\s*内|内外|内景|外景|室内|室外|内|外)\s*", "", text)
    text = re.sub(r"\b(?:场景|地点)\s*[:：]", "", text)
    # Keep Chinese/letters/digits but remove formatting separators so
    # "藏偶冷室·清晨" and "藏偶冷室 清晨" compare identically.
    return re.sub(r"[^0-9a-z_\u4e00-\u9fff]+", "", text)


def _scene_base_and_time(key: str) -> Tuple[str, str]:
    for suffix, category in _TIME_SUFFIXES:
        normalized_suffix = normalize_scene_reference_key(suffix)
        if key.endswith(normalized_suffix) and len(key) > len(normalized_suffix):
            return key[: -len(normalized_suffix)], category
    return key, ""


def _scene_names(element: Dict[str, Any]) -> List[str]:
    result: List[str] = []
    base = str(element.get("name") or "").strip()
    if base:
        result.append(base)
    result.extend(_safe_aliases(element.get("aliases")))
    return list(dict.fromkeys(result))


def _score_scene_name(target_key: str, candidate_key: str) -> int:
    if not target_key or not candidate_key:
        return -1
    if target_key == candidate_key:
        return 10000 + len(candidate_key)

    target_base, target_time = _scene_base_and_time(target_key)
    candidate_base, candidate_time = _scene_base_and_time(candidate_key)
    if not target_base or target_base != candidate_base:
        return -1
    if target_time and candidate_time and target_time != candidate_time:
        return -1
    if target_time and candidate_time:
        return 8000 + len(candidate_key)
    if not target_time and not candidate_time:
        return 7000 + len(candidate_key)
    # A time-specific request may use one unique timeless asset, but only after
    # ambiguity checks in match_scene_element.
    return 4000 + len(candidate_key)


def match_scene_element(
    elements: Iterable[Dict[str, Any]],
    scene_title: str,
    scene_content: str = "",
) -> Optional[Dict[str, Any]]:
    """Return one unambiguous scene element; never merge multiple scenes."""
    scene_elements = [dict(item) for item in elements if item.get("element_type") == "scene"]
    if not scene_elements:
        return None

    targets: List[str] = []
    for raw in (scene_title, scene_content.splitlines()[0] if scene_content else ""):
        key = normalize_scene_reference_key(raw)
        if key and key not in targets:
            targets.append(key)
    if not targets:
        return None

    ranked: List[Tuple[int, int, Dict[str, Any], str]] = []
    for element in scene_elements:
        best_score = -1
        best_key = ""
        for name in _scene_names(element):
            candidate_key = normalize_scene_reference_key(name)
            for target_key in targets:
                score = _score_scene_name(target_key, candidate_key)
                if score > best_score:
                    best_score = score
                    best_key = candidate_key
        if best_score >= 0:
            ranked.append((best_score, int(element.get("id") or 0), element, best_key))
    if not ranked:
        return None

    ranked.sort(key=lambda item: (-item[0], -len(item[3]), item[1]))
    top_score = ranked[0][0]
    top = [item for item in ranked if item[0] == top_score]
    if len({item[1] for item in top}) != 1:
        logger.warning(
            "[scene-reference] ambiguous exact candidates title=%r ids=%s; skip image",
            scene_title,
            [item[1] for item in top],
        )
        return None

    chosen = ranked[0]
    if top_score < 7000:
        # Timed scene -> timeless fallback is only safe when this physical
        # location has exactly one extracted scene asset.
        chosen_base, _ = _scene_base_and_time(chosen[3])
        same_base_ids = set()
        for element in scene_elements:
            for name in _scene_names(element):
                key = normalize_scene_reference_key(name)
                base, _time = _scene_base_and_time(key)
                if base and base == chosen_base:
                    same_base_ids.add(int(element.get("id") or 0))
        if len(same_base_ids) != 1:
            logger.warning(
                "[scene-reference] timed scene %r has %s base-location variants; skip timeless fallback",
                scene_title,
                len(same_base_ids),
            )
            return None
    return chosen[2]


def _active_scene_image(element: Dict[str, Any]) -> Tuple[str, str]:
    # Do not use grid_image as an automatic visual reference: a contact sheet
    # can contain several views and would pollute spatial reasoning.
    for field in ("finished_image", "image_url", "reference_image"):
        value = str(element.get(field) or "").strip()
        if value:
            return field, value
    return "", ""


async def _read_image_bytes(source: str) -> bytes:
    if source.startswith("data:image/"):
        try:
            encoded = source.split(",", 1)[1]
            raw = base64.b64decode(encoded, validate=True)
        except Exception as exc:
            raise ValueError(f"场景图片 Data URL 无效: {exc}") from exc
    elif source.startswith(("http://", "https://")):
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, trust_env=False) as client:
            response = await client.get(source)
            response.raise_for_status()
            raw = response.content
    else:
        path = source if os.path.isabs(source) else resolve_db_path(source)
        if not path or not os.path.isfile(path):
            raise FileNotFoundError(f"场景图片不存在: {source}")
        size = os.path.getsize(path)
        if size > MAX_SOURCE_BYTES:
            raise ValueError("场景图片超过 15MB，无法作为临时视觉参考")
        with open(path, "rb") as handle:
            raw = handle.read(MAX_SOURCE_BYTES + 1)
    if not raw:
        raise ValueError("场景图片为空")
    if len(raw) > MAX_SOURCE_BYTES:
        raise ValueError("场景图片超过 15MB，无法作为临时视觉参考")
    return raw


def _compress_image_data_url(raw: bytes) -> str:
    """Resize and encode in memory; no temporary file is ever created."""
    with Image.open(io.BytesIO(raw)) as opened:
        image = ImageOps.exif_transpose(opened)
        image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE), Image.Resampling.LANCZOS)
        if image.mode in ("RGBA", "LA"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            alpha = image.getchannel("A")
            background.paste(image.convert("RGB"), mask=alpha)
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")

        encoded = b""
        for quality in (88, 82, 76, 70):
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=quality, optimize=True)
            encoded = output.getvalue()
            if len(encoded) <= MAX_OUTPUT_BYTES:
                break
        if len(encoded) > MAX_OUTPUT_BYTES:
            raise ValueError("场景图片压缩后仍超过 2MB，请先缩小图片")
    return "data:image/jpeg;base64," + base64.b64encode(encoded).decode("ascii")


async def prepare_scene_reference(
    novel_id: int,
    scene_title: str,
    scene_content: str = "",
) -> Optional[Dict[str, Any]]:
    """Resolve exactly one current scene image and return an ephemeral ref."""
    elements = await ExtractionService.get_elements(novel_id, "scene")
    element = match_scene_element(elements, scene_title, scene_content)
    if not element:
        logger.info("[scene-reference] no unambiguous scene asset for %r", scene_title)
        return None
    source_field, source = _active_scene_image(element)
    if not source:
        logger.info(
            "[scene-reference] matched scene %r(id=%s) but it has no finished/generated/reference image",
            element.get("name"),
            element.get("id"),
        )
        return None
    try:
        raw = await _read_image_bytes(source)
        data_url = _compress_image_data_url(raw)
    except Exception as exc:
        logger.warning(
            "[scene-reference] failed to prepare scene %r(id=%s, field=%s): %s",
            element.get("name"),
            element.get("id"),
            source_field,
            exc,
        )
        return None
    return {
        "data_url": data_url,
        "label": f"当前场景「{element.get('name') or scene_title}」素材图",
        "instruction": SCENE_REFERENCE_INSTRUCTION,
        "element_id": element.get("id"),
        "scene_name": element.get("name") or scene_title,
        "source_field": source_field,
    }


def dispose_scene_references(references: Optional[List[Dict[str, Any]]]) -> None:
    """Drop large data-URL references immediately after the LLM call."""
    if not references:
        return
    for item in references:
        if isinstance(item, dict):
            item["data_url"] = ""
    references.clear()
