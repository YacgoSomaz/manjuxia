import asyncio
import json
import logging
import os
import re
import time
import uuid
import zipfile
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import unquote, urlparse

import aiofiles
import aiohttp

from database.db import get_db
from services.extraction_service import ExtractionService
from services.llm_service import LLMService
from services.storyboard_service import (
    StoryboardService,
    _build_storyboard_assemble_payload,
    _storyboard_assemble_eligibility,
    _storyboard_flow,
    _strip_reasoning_chain,
)
from services.template_service import get_by_id as get_template_by_id
from services.video_providers import get_provider
from services.video_service import VideoService
from utils.paths import get_data_dir, media_subdir, resolve_db_path
from utils.ssl_helper import get_aiohttp_connector
from utils.timezone import now_beijing_str

logger = logging.getLogger(__name__)


SUPPLEMENT_STATUSES = {
    "draft",
    "storyboard_ready",
    "generating",
    "success",
    "failed",
}

PROVIDER_FRIENDLY = {
    "volcengine_ark": "火山方舟",
    "cool": "Cool",
    "xinglian": "星链云",
    "pippit_cli": "小云雀",
    "jimeng": "即梦",
}

DEFAULT_FIRST_FRAME_DESC = "此图为上一视频的尾帧参考图,本镜从此画面故事的延续,保持场景与角色一致,不重新诠释画风/材质"
DEFAULT_LAST_FRAME_DESC = "此图为本一视频的尾帧参考图,保持场景与角色一致,不重新诠释画风/材质"


def _json_loads(value: Any, default: Any) -> Any:
    if value in (None, ""):
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return default


def _json_dumps(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def _row_to_task(row) -> Dict[str, Any]:
    d = dict(row)
    for key, default in (
        ("characters_json", []),
        ("scenes_json", []),
        ("props_json", []),
        ("materials_json", {}),
        ("missing_assets_json", []),
        ("params_json", {}),
    ):
        public_key = key[:-5] if key.endswith("_json") else key
        d[public_key] = _json_loads(d.get(key), default)
    return d


def _clean_path(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    p = str(path).strip()
    if not p:
        return None
    if p.startswith("data/"):
        return "/" + p
    return p


def _material_image_path(item: Dict[str, Any]) -> Optional[str]:
    et = item.get("element_type")
    if et == "character":
        keys = ("finished_image", "image_url", "grid_image", "reference_image")
    else:
        keys = ("grid_image", "finished_image", "image_url", "reference_image")
    for key in keys:
        value = _clean_path(item.get(key))
        if value:
            return value
    return None


def _safe_aliases(value: Any) -> List[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v or "").strip()]
    if isinstance(value, str):
        try:
            loaded = json.loads(value)
            if isinstance(loaded, list):
                return [str(v).strip() for v in loaded if str(v or "").strip()]
        except Exception:
            pass
        return [v.strip() for v in re.split(r"[,，、;/；\n]+", value) if v.strip()]
    return []


def _normalize_scene_candidate(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[（(]\s*续\s*\d*\s*[）)]\s*$", "", text).strip()
    text = re.sub(r"^(内|外|室内|室外)\s+", "", text).strip()
    text = re.sub(r"\s+(日|夜|晨|暮|黄昏|清晨|傍晚|午后|白天|雨夜|雪夜)\s*$", "", text).strip()
    return text


def _material_candidates(element: Dict[str, Any]) -> List[str]:
    names: List[str] = []
    base = str(element.get("name") or "").strip()
    if base:
        names.append(base)
    names.extend(_safe_aliases(element.get("aliases")))
    if element.get("element_type") == "scene":
        for name in list(names):
            core = _normalize_scene_candidate(name)
            if core and core not in names:
                names.append(core)
    dedup: List[str] = []
    seen = set()
    for name in names:
        key = name.lower()
        if len(name) >= 2 and key not in seen:
            dedup.append(name)
            seen.add(key)
    return dedup


def _text_contains_candidate(text: str, candidate: str, element_type: str) -> bool:
    if not text or not candidate:
        return False
    low_text = text.lower()
    cand = candidate.lower()
    if cand in low_text:
        return True
    if element_type == "scene":
        core = _normalize_scene_candidate(candidate).lower()
        if core and core in low_text:
            return True
    return False


def _names_from_json(value: Any) -> List[str]:
    data = _json_loads(value, [])
    if not isinstance(data, list):
        return []
    return [str(v).strip() for v in data if str(v or "").strip()]


async def _anchor_material_names(storyboard_id: Optional[int]) -> Dict[str, List[str]]:
    if not storyboard_id:
        return {"characters": [], "scenes": [], "props": []}
    anchor = await _load_anchor(storyboard_id)
    if not anchor:
        return {"characters": [], "scenes": [], "props": []}
    scenes = _names_from_json(anchor.get("scenes_json"))
    if not scenes:
        info = _json_loads(anchor.get("section_info"), {})
        scene = str(info.get("scene") or "").strip() if isinstance(info, dict) else ""
        if scene:
            scenes.append(scene)
    return {
        "characters": _names_from_json(anchor.get("characters_json")),
        "scenes": scenes,
        "props": _names_from_json(anchor.get("props_json")),
    }


async def _match_supplement_elements(novel_id: int, text: str, task: Optional[Dict[str, Any]] = None) -> Dict[str, List[str]]:
    result = {"characters": [], "scenes": [], "props": []}
    elements = await ExtractionService.get_elements(novel_id)
    if not elements:
        return result
    key_by_type = {"character": "characters", "scene": "scenes", "prop": "props"}
    seen = {"characters": set(), "scenes": set(), "props": set()}

    def add(public_key: str, name: str) -> None:
        clean = str(name or "").strip()
        if not clean:
            return
        low = clean.lower()
        if low in seen[public_key]:
            return
        result[public_key].append(clean)
        seen[public_key].add(low)

    for raw in elements:
        et = raw.get("element_type")
        public_key = key_by_type.get(et)
        if not public_key:
            continue
        official_name = str(raw.get("name") or "").strip()
        if not official_name:
            continue
        if any(_text_contains_candidate(text, c, et) for c in _material_candidates(raw)):
            add(public_key, official_name)

    if task:
        anchor_names = await _anchor_material_names(task.get("anchor_storyboard_id"))
        for public_key, names in anchor_names.items():
            for name in names:
                add(public_key, name)
    return result


def _as_local_or_original(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    if str(path).startswith(("http://", "https://", "asset://")):
        return path
    resolved = resolve_db_path(path)
    return resolved or path


def _resolve_local_media_or_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    raw = str(path).strip()
    if not raw:
        return None
    resolved = resolve_db_path(raw)
    if resolved and os.path.exists(resolved):
        return resolved
    parsed = urlparse(raw)
    if parsed.scheme in ("http", "https"):
        url_path = unquote(parsed.path or "")
        if url_path.startswith("/data/"):
            resolved = resolve_db_path(url_path)
            if resolved and os.path.exists(resolved):
                return resolved
        return raw
    if raw.startswith("/data/"):
        resolved = resolve_db_path(raw)
        if resolved and os.path.exists(resolved):
            return resolved
    return raw if os.path.exists(raw) else None


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


async def _get_app_setting(key: str, default: str = "") -> str:
    db = await get_db()
    try:
        cur = await db.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
        row = await cur.fetchone()
        return str(row["value"] if row and row["value"] is not None else default)
    finally:
        await db.close()


async def _pippit_provider_config() -> Dict[str, Any]:
    access_key = _env_pippit_access_key() or (await _get_app_setting("pippit.access_key")).strip()
    return {"access_key": access_key} if access_key else {}


def _infer_provider_from_config(provider: Optional[str], config: Optional[Dict[str, Any]]) -> str:
    p = (provider or "").strip().lower()
    if p:
        return p
    cfg = config or {}
    base_url = (cfg.get("base_url") or cfg.get("baseUrl") or "").lower()
    model = (cfg.get("model_name") or cfg.get("modelName") or "").lower()
    name = (cfg.get("name") or "").lower()
    provider_code = (cfg.get("provider_code") or cfg.get("providerCode") or "").lower()
    if "pippit" in provider_code or "pippit" in base_url or "pippit" in name or "小云雀" in name:
        return "pippit_cli"
    if "cool" in provider_code or "mjapi" in provider_code or "mjapi" in base_url or "cool" in name:
        return "cool"
    if "xinglian" in provider_code or "vjimeng" in provider_code or "vjimeng" in base_url or model.startswith("sd2-"):
        return "xinglian"
    if "ark" in provider_code or "volces" in base_url or "doubao-seedance" in model or "火山" in name:
        return "volcengine_ark"
    return "jimeng"


async def _get_task(task_id: int) -> Optional[Dict[str, Any]]:
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM supplement_video_tasks WHERE id=?", (task_id,))
        row = await cur.fetchone()
        return _row_to_task(row) if row else None
    finally:
        await db.close()


async def _update_task_fields(task_id: int, fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not fields:
        return await _get_task(task_id)
    fields = dict(fields)
    fields["updated_at"] = now_beijing_str()
    sets = []
    params = []
    for key, value in fields.items():
        sets.append(f"{key}=?")
        params.append(value)
    params.append(task_id)
    db = await get_db()
    try:
        await db.execute(f"UPDATE supplement_video_tasks SET {', '.join(sets)} WHERE id=?", tuple(params))
        await db.commit()
    finally:
        await db.close()
    return await _get_task(task_id)


async def _load_anchor(storyboard_id: Optional[int]) -> Optional[Dict[str, Any]]:
    if not storyboard_id:
        return None
    db = await get_db()
    try:
        cur = await db.execute("SELECT * FROM storyboards WHERE id=?", (storyboard_id,))
        row = await cur.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def _load_elements_by_name(novel_id: int, names: Dict[str, List[str]]) -> Dict[str, List[Dict[str, Any]]]:
    all_elements = await ExtractionService.get_elements(novel_id)
    by_type: Dict[str, Dict[str, Dict[str, Any]]] = {"character": {}, "scene": {}, "prop": {}}
    candidates_by_type: Dict[str, List[Tuple[str, Dict[str, Any]]]] = {"character": [], "scene": [], "prop": []}
    for el in all_elements:
        et = el.get("element_type")
        nm = str(el.get("name") or "").strip()
        if et not in by_type or not nm:
            continue
        if et == "character":
            el = await ExtractionService.resolve_active_character_asset(dict(el))
        by_type[et][nm.lower()] = dict(el)
        for candidate in _material_candidates(dict(el)):
            candidates_by_type[et].append((candidate.lower(), dict(el)))

    result = {"characters": [], "scenes": [], "props": []}
    mapping = {
        "characters": "character",
        "scenes": "scene",
        "props": "prop",
    }
    for public_key, et in mapping.items():
        seen = set()
        seen_elements = set()
        for name in names.get(public_key) or []:
            key = str(name or "").strip().lower()
            if not key or key in seen:
                continue
            seen.add(key)
            el = by_type[et].get(key)
            if not el:
                normalized_key = _normalize_scene_candidate(key).lower() if et == "scene" else key
                for candidate, candidate_el in candidates_by_type[et]:
                    if candidate == key or (normalized_key and candidate == normalized_key):
                        el = candidate_el
                        break
                    if et == "scene" and normalized_key and normalized_key in candidate:
                        el = candidate_el
                        break
            if el:
                element_key = f"id:{el.get('id')}" if el.get("id") is not None else f"name:{str(el.get('name') or '').strip().lower()}"
                if element_key in seen_elements:
                    continue
                seen_elements.add(element_key)
                image_path = _material_image_path(el)
                result[public_key].append({
                    "id": el.get("id"),
                    "name": el.get("name"),
                    "matched_name": el.get("name"),
                    "element_type": et,
                    "description": el.get("description") or "",
                    "image_path": image_path,
                    "audio_file": el.get("audio_file"),
                    "active_variant_name": el.get("__active_variant_name"),
                    "updated_at": el.get("__asset_updated_at") or el.get("updated_at"),
                })
            else:
                result[public_key].append({
                    "name": name,
                    "element_type": et,
                    "missing": True,
                })
    return result


def _missing_assets(materials: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    missing: List[Dict[str, Any]] = []
    for key in ("characters", "scenes", "props"):
        for item in materials.get(key) or []:
            if item.get("missing") or not item.get("image_path"):
                missing.append({
                    "name": item.get("name"),
                    "element_type": item.get("element_type"),
                    "reason": "未匹配到素材" if item.get("missing") else "没有可用图片",
                })
    return missing


async def _refresh_materials(task: Dict[str, Any], text: str) -> Dict[str, Any]:
    novel_id = task.get("novel_id")
    if not novel_id:
        return {"characters": [], "scenes": [], "props": []}
    matched = await _match_supplement_elements(int(novel_id), text or "", task)
    for key in ("characters", "scenes", "props"):
        seen = {str(name or "").strip().lower() for name in matched.get(key, []) if str(name or "").strip()}
        for name in task.get(key) or []:
            clean = str(name or "").strip()
            low = clean.lower()
            if clean and low not in seen:
                matched[key].append(clean)
                seen.add(low)
    materials = await _load_elements_by_name(int(novel_id), matched)
    await _update_task_fields(task["id"], {
        "characters_json": _json_dumps([x.get("name") for x in materials["characters"] if x.get("name")]),
        "scenes_json": _json_dumps([x.get("name") for x in materials["scenes"] if x.get("name")]),
        "props_json": _json_dumps([x.get("name") for x in materials["props"] if x.get("name")]),
        "materials_json": _json_dumps(materials),
        "missing_assets_json": _json_dumps(_missing_assets(materials)),
    })
    return materials


def _build_messages(template: Dict[str, Any], script_text: str, anchor_text: str) -> Tuple[List[Dict[str, str]], Dict[str, str]]:
    template_content = template.get("content") or ""
    var_values = {
        "scene_content": script_text,
        "script_content": script_text,
        "content": script_text,
        "storyboard_context": anchor_text,
        "anchor_storyboard": anchor_text,
        "requirement": script_text,
    }
    prompt = template_content
    replaced = False
    try:
        variables = json.loads(template.get("variables") or "[]")
    except Exception:
        variables = []
    for var in variables:
        value = var_values.get(str(var), script_text)
        for ph in (f"{{{var}}}", f"{{{{{var}}}}}"):
            if ph in prompt:
                prompt = prompt.replace(ph, value)
                replaced = True
    if not replaced:
        prompt = (
            f"{template_content}\n\n"
            "以下是需要补生成的一镜内容，请只输出一个可直接用于视频生成的临时分镜小节：\n\n"
            f"{script_text}\n\n"
            f"参考上下文：\n{anchor_text}"
        )
    messages = [
        {"role": "system", "content": "你是专业短剧/短片分镜导演。只输出补镜分镜正文，不要解释、不要输出思考过程。"},
        {"role": "user", "content": prompt},
    ]
    return messages, var_values


async def _download_remote_video(task_id: int, url: str) -> Optional[str]:
    if not url:
        return None
    videos_dir = os.path.join(media_subdir("videos"), "supplement")
    os.makedirs(videos_dir, exist_ok=True)
    filename = f"supplement_{task_id}_{int(time.time())}_{uuid.uuid4().hex[:6]}.mp4"
    target_path = os.path.join(videos_dir, filename)
    try:
        async with aiohttp.ClientSession(
            connector=get_aiohttp_connector(),
            timeout=aiohttp.ClientTimeout(total=600),
        ) as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    logger.warning("[supplement-video] download http %s task=%s", resp.status, task_id)
                    return None
                with open(target_path, "wb") as f:
                    async for chunk in resp.content.iter_chunked(64 * 1024):
                        f.write(chunk)
        return f"/data/videos/supplement/{filename}"
    except Exception as exc:
        logger.warning("[supplement-video] download failed task=%s: %s", task_id, exc)
        return None


def _extract_video_url(data: Any) -> Optional[str]:
    if isinstance(data, str) and data.startswith(("http://", "https://", "/data/", "data/")):
        return data
    if isinstance(data, dict):
        for key in ("video_url", "videoUrl", "url", "download_url", "downloadUrl", "local_video_path", "local_path"):
            value = data.get(key)
            if isinstance(value, str) and value:
                return value
        for key in ("result", "data", "result_json", "output"):
            found = _extract_video_url(data.get(key))
            if found:
                return found
        videos = data.get("videos")
        if isinstance(videos, list):
            for item in videos:
                found = _extract_video_url(item)
                if found:
                    return found
    if isinstance(data, list):
        for item in data:
            found = _extract_video_url(item)
            if found:
                return found
    return None


def _latest_mp4_path(directory: str, before: Optional[set] = None) -> Optional[str]:
    before = before or set()
    candidates: List[str] = []
    if not os.path.isdir(directory):
        return None
    for root, _, files in os.walk(directory):
        for name in files:
            if name.lower().endswith((".mp4", ".mov", ".webm")):
                path = os.path.join(root, name)
                if path not in before:
                    candidates.append(path)
    if not candidates:
        return None
    return max(candidates, key=lambda p: os.path.getmtime(p))


def _db_rel_from_abs(abs_path: str) -> Optional[str]:
    if not abs_path:
        return None
    norm = os.path.normpath(abs_path)
    roots = [
        (os.path.normpath(media_subdir("images")), "/data/images"),
        (os.path.normpath(media_subdir("videos")), "/data/videos"),
        (os.path.normpath(media_subdir("audios")), "/data/audios"),
        (os.path.normpath(os.path.join(get_data_dir(), "frames")), "/data/frames"),
    ]
    for root, prefix in roots:
        try:
            rel = os.path.relpath(norm, root)
        except ValueError:
            continue
        if rel and not rel.startswith(".."):
            return f"{prefix}/{rel.replace(os.sep, '/')}"
    return None


def _archive_safe_name(name: str, fallback: str) -> str:
    clean = re.sub(r'[\\/:*?"<>|\r\n]+', "_", str(name or "").strip()).strip(" .")
    return clean or fallback


async def _extract_output_last_frame(task_id: int, video_rel_path: str) -> Optional[str]:
    if not video_rel_path:
        return None
    abs_video = resolve_db_path(video_rel_path) or video_rel_path
    if not os.path.exists(abs_video):
        return None
    frames_dir = os.path.join(get_data_dir(), "frames", "supplement")
    os.makedirs(frames_dir, exist_ok=True)
    output_path = os.path.join(frames_dir, f"supplement_{task_id}_output_last.jpg")
    ok = await VideoService().extract_last_frame(abs_video, output_path, sseof_seconds=0.5, timeout=30)
    if not ok:
        return None
    return f"/data/frames/supplement/{os.path.basename(output_path)}"


def _collect_downloadable_materials(task: Dict[str, Any]) -> List[Tuple[str, str]]:
    files: List[Tuple[str, str]] = []
    params = task.get("params") or {}
    frame_descs = {
        "first_frame_path": "首帧",
        "last_frame_path": "尾帧",
        "output_last_frame_path": "输出尾帧",
    }
    for field, label in frame_descs.items():
        path = task.get(field)
        if path:
            files.append((path, f"frames/{label}{os.path.splitext(str(path))[1] or '.jpg'}"))
    materials = task.get("materials") or {}
    group_label = {"characters": "人物", "scenes": "场景", "props": "道具"}
    for group, label in group_label.items():
        for idx, item in enumerate(materials.get(group) or [], 1):
            path = item.get("image_path")
            if not path:
                continue
            name = _archive_safe_name(item.get("name") or f"{label}{idx}", f"{label}{idx}")
            ext = os.path.splitext(str(path))[1] or ".png"
            files.append((path, f"materials/{label}/{idx:02d}_{name}{ext}"))
        if group == "characters":
            for idx, item in enumerate(materials.get(group) or [], 1):
                audio = item.get("audio_file")
                if not audio:
                    continue
                name = _archive_safe_name(item.get("name") or f"人物{idx}", f"人物{idx}")
                ext = os.path.splitext(str(audio))[1] or ".mp3"
                files.append((audio, f"materials/人物音频/{idx:02d}_{name}{ext}"))
    return files


def _build_supplement_file_refs(
    image_items: List[Dict[str, str]],
    audio_items: List[Dict[str, str]],
    *,
    ref_at: bool = False,
) -> List[str]:
    """Build a lightweight material index that matches the exact upload order."""
    kind_label = {
        "character": "人物形象",
        "scene": "场景",
        "prop": "道具",
        "first_frame": "",
        "last_frame": "",
        "reference": "",
    }
    ref_pfx = "@" if ref_at else ""
    audio_labels = []
    for idx, item in enumerate(audio_items, 1):
        name = (item.get("name") or "未命名").strip()
        audio_labels.append((name, f"{ref_pfx}音频{idx} {name}角色音色参考"))
    used_audio = [False] * len(audio_labels)

    refs: List[str] = []
    for idx, item in enumerate(image_items, 1):
        name = (item.get("name") or "未命名").strip()
        kind = item.get("kind") or "reference"
        desc = kind_label.get(kind, "")
        suffix = "参考图" if desc else "参考图"
        label = f"{ref_pfx}图片{idx} {name}{desc}{suffix}"
        frame_desc = (item.get("desc") or "").strip()
        if kind in ("first_frame", "last_frame"):
            label = frame_desc or f"{ref_pfx}图片{idx} 参考图"
        elif frame_desc:
            label = f"{label}，画面说明：{frame_desc}"
        if kind == "character":
            for ai, (audio_name, audio_label) in enumerate(audio_labels):
                if not used_audio[ai] and audio_name == name:
                    label = f"{label},{audio_label}"
                    used_audio[ai] = True
                    break
        refs.append(label)

    for ai, (_, audio_label) in enumerate(audio_labels):
        if not used_audio[ai]:
            refs.append(audio_label)
    return refs


def _build_supplement_final_prompt(
    prompt: str,
    image_items: List[Dict[str, str]],
    audio_items: List[Dict[str, str]],
    *,
    ref_at: bool = False,
    style_prompt: str = "",
) -> str:
    refs = _build_supplement_file_refs(image_items, audio_items, ref_at=ref_at)
    clean_prompt = (prompt or "").strip()
    style = (style_prompt or "").strip()
    if style:
        clean_prompt = f"风格提示词：{style}\n\n{clean_prompt}" if clean_prompt else f"风格提示词：{style}"
    if not refs:
        return clean_prompt
    return ";".join(refs) + "\n\n" + clean_prompt


async def _extract_first_frame(video_path: str, output_path: str, timeout: int = 30) -> bool:
    if not video_path or not os.path.exists(video_path):
        return False
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    ffmpeg = VideoService()._get_ffmpeg_path()
    args = ["-y", "-ss", "0.2", "-i", video_path, "-frames:v", "1", "-q:v", "2", output_path]
    try:
        proc = await asyncio.create_subprocess_exec(
            ffmpeg,
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            try:
                await proc.wait()
            except Exception:
                pass
            return False
        if proc.returncode != 0:
            logger.warning("[supplement-frame] extract first frame failed: %s", (stderr or b"")[-500:])
            return False
        return os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as exc:
        logger.warning("[supplement-frame] extract first frame exception: %s", exc)
        return False


async def _extract_frame_at(video_path: str, output_path: str, seconds: float, timeout: int = 30) -> bool:
    try:
        sec = max(0.0, float(seconds or 0.0))
    except Exception:
        sec = 0.0
    ffmpeg = VideoService()._get_ffmpeg_path()
    args = ["-y", "-ss", f"{sec:.3f}", "-i", video_path, "-frames:v", "1", "-q:v", "2", output_path]
    try:
        proc = await asyncio.create_subprocess_exec(
            ffmpeg,
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            return False
        if proc.returncode == 0 and os.path.exists(output_path):
            return True
        logger.warning("[supplement-frame] extract frame at %.3fs failed: %s", sec, (stderr or b"")[-500:])
        return False
    except Exception as exc:
        logger.warning("[supplement-frame] extract frame at %.3fs exception: %s", sec, exc)
        return False


def _summarize_logged_assets(items: Optional[List[str]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for idx, item in enumerate(items or [], 1):
        if isinstance(item, str):
            if item.startswith("data:"):
                out.append({"index": idx, "type": "data_url", "len": len(item)})
            elif item.startswith("asset://"):
                out.append({"index": idx, "type": "asset_uri", "path": item})
            else:
                out.append({"index": idx, "type": "local", "path": item})
        else:
            out.append({"index": idx, "raw": str(item)[:200]})
    return out


def _build_supplement_video_payload_log(
    *,
    provider: str,
    model: str,
    base_url: str,
    final_prompt: str,
    images: Optional[List[str]],
    audios: Optional[List[str]],
    params: Optional[Dict[str, Any]],
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "provider": provider,
        "model": model,
        "base_url": base_url,
        "params": params or {},
        "video_duration_seconds": (params or {}).get("duration"),
        "prompt": final_prompt or "",
        "images_count": len(images or []),
        "audios_count": len(audios or []),
        "images_summary": _summarize_logged_assets(images),
        "audios_summary": _summarize_logged_assets(audios),
    }
    if extra:
        payload["extra"] = extra
    return payload


def _supplement_video_remote_marker(provider: str, submit_id: Optional[str]) -> str:
    return f"supplement-video-submit:{provider or 'unknown'}:{submit_id or ''}"


async def _mark_previous_supplement_video_logs_error(task_id: int) -> None:
    try:
        from services.log_service import LogService
        db = await get_db()
        try:
            cur = await db.execute(
                """
                SELECT id FROM llm_logs
                WHERE task_type='video_generation'
                  AND source_type='supplement_video'
                  AND source_id=?
                  AND status='running'
                ORDER BY id DESC
                """,
                (task_id,),
            )
            rows = await cur.fetchall()
        finally:
            await db.close()
        for row in rows:
            await LogService.update_log_error(
                int(row["id"]),
                "新的补镜视频任务已提交，上一条未完成日志已作废",
            )
    except Exception as exc:
        logger.warning("[supplement-video-log] mark previous logs failed task=%s: %s", task_id, exc)


async def _create_supplement_video_log(
    *,
    task: Dict[str, Any],
    provider: str,
    provider_code: str,
    model: str,
    config_name: str,
    base_url: str,
    final_prompt: str,
    images: Optional[List[str]],
    audios: Optional[List[str]],
    params: Optional[Dict[str, Any]],
    extra: Optional[Dict[str, Any]] = None,
) -> int:
    try:
        from services.log_service import LogService

        task_id = int(task.get("id") or 0)
        await _mark_previous_supplement_video_logs_error(task_id)
        title = (task.get("title") or "").strip() or f"补镜 #{task_id}"
        payload_log = _build_supplement_video_payload_log(
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
            input_prompt=payload_log,
            novel_id=task.get("novel_id"),
            chapter_title=f"[补镜视频] {title}",
            source_id=task_id,
            source_type="supplement_video",
            source_scene_index=None,
        )
        return log_id or -1
    except Exception as exc:
        logger.warning("[supplement-video-log] create failed task=%s: %s", task.get("id"), exc)
        return -1


async def _mark_supplement_video_submitted(log_id: int, *, provider: str, submit_id: Optional[str]) -> None:
    if not log_id or log_id <= 0 or not submit_id:
        return
    try:
        from services.log_service import LogService
        await LogService.update_log_remote_url(log_id, _supplement_video_remote_marker(provider, submit_id))
    except Exception as exc:
        logger.warning("[supplement-video-log] persist submit marker failed log_id=%s: %s", log_id, exc)


async def _find_running_supplement_video_log_id(task_id: int, submit_id: Optional[str] = None) -> int:
    db = await get_db()
    try:
        if submit_id:
            cur = await db.execute(
                """
                SELECT id FROM llm_logs
                WHERE task_type='video_generation'
                  AND source_type='supplement_video'
                  AND source_id=?
                  AND status='running'
                  AND remote_url LIKE ?
                ORDER BY id DESC LIMIT 1
                """,
                (task_id, f"%:{submit_id}"),
            )
            row = await cur.fetchone()
            if row:
                return int(row["id"])
        cur = await db.execute(
            """
            SELECT id FROM llm_logs
            WHERE task_type='video_generation'
              AND source_type='supplement_video'
              AND source_id=?
              AND status='running'
            ORDER BY id DESC LIMIT 1
            """,
            (task_id,),
        )
        row = await cur.fetchone()
        return int(row["id"]) if row else -1
    except Exception as exc:
        logger.warning("[supplement-video-log] find running failed task=%s submit=%s: %s", task_id, submit_id, exc)
        return -1
    finally:
        await db.close()


async def _finalize_supplement_video_log_success(
    *,
    task_id: int,
    submit_id: Optional[str],
    provider: str,
    video_url: Optional[str],
    requested_duration: Optional[int],
    actual_duration: Optional[float] = None,
) -> None:
    log_id = await _find_running_supplement_video_log_id(task_id, submit_id)
    if not log_id or log_id <= 0:
        return
    try:
        from services.log_service import LogService
        usage_duration = requested_duration
        if usage_duration is None and actual_duration:
            usage_duration = int(round(float(actual_duration)))
        output_obj = {
            "result": "completed",
            "submit_id": submit_id or "",
            "provider": provider or "",
            "video_url": video_url or "",
            "video_duration_seconds": usage_duration,
        }
        if actual_duration:
            output_obj["actual_video_duration_seconds"] = actual_duration
        await LogService.update_log_success(
            log_id=log_id,
            output_content=json.dumps(output_obj, ensure_ascii=False),
            input_tokens=0,
            output_tokens=0,
            total_tokens=int(usage_duration or 0),
        )
    except Exception as exc:
        logger.warning("[supplement-video-log] finalize success failed log_id=%s task=%s: %s", log_id, task_id, exc)


async def _finalize_supplement_video_log_error(
    *,
    task_id: int,
    submit_id: Optional[str],
    fail_reason: str,
) -> None:
    log_id = await _find_running_supplement_video_log_id(task_id, submit_id)
    if not log_id or log_id <= 0:
        return
    try:
        from services.log_service import LogService
        await LogService.update_log_error(log_id=log_id, error_message=(fail_reason or "video failed")[:1500])
    except Exception as exc:
        logger.warning("[supplement-video-log] finalize error failed log_id=%s task=%s: %s", log_id, task_id, exc)


class SupplementVideoService:
    @staticmethod
    async def list_tasks(limit: int = 50, offset: int = 0, status: Optional[str] = None) -> Dict[str, Any]:
        params: List[Any] = []
        where = ""
        if status:
            where = "WHERE status=?"
            params.append(status)
        db = await get_db()
        try:
            cur = await db.execute(
                f"SELECT * FROM supplement_video_tasks {where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?",
                (*params, limit, offset),
            )
            rows = await cur.fetchall()
            cur_total = await db.execute(f"SELECT COUNT(*) AS c FROM supplement_video_tasks {where}", tuple(params))
            total_row = await cur_total.fetchone()
            return {
                "items": [_row_to_task(r) for r in rows],
                "total": total_row["c"] if total_row else 0,
                "limit": limit,
                "offset": offset,
            }
        finally:
            await db.close()

    @staticmethod
    async def get_task(task_id: int) -> Optional[Dict[str, Any]]:
        return await _get_task(task_id)

    @staticmethod
    async def create_task(payload: Dict[str, Any]) -> Dict[str, Any]:
        now = now_beijing_str()
        db = await get_db()
        try:
            cur = await db.execute(
                """
                INSERT INTO supplement_video_tasks
                (novel_id, chapter_id, anchor_storyboard_id, anchor_position, title, script_text,
                 storyboard_text, video_prompt, provider, video_config_id, model_name, ratio,
                 resolution, duration, generation_mode, params_json, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
                """,
                (
                    payload.get("novel_id"),
                    payload.get("chapter_id"),
                    payload.get("anchor_storyboard_id"),
                    payload.get("anchor_position") or "after",
                    payload.get("title") or "",
                    payload.get("script_text") or "",
                    payload.get("storyboard_text") or "",
                    payload.get("video_prompt") or "",
                    payload.get("provider") or "jimeng",
                    payload.get("video_config_id"),
                    payload.get("model_name") or "",
                    payload.get("ratio") or "9:16",
                    payload.get("resolution") or "720P",
                    int(payload.get("duration") or 8),
                    payload.get("generation_mode") or "multimodal2video",
                    _json_dumps(payload.get("params") or {}),
                    now,
                    now,
                ),
            )
            await db.commit()
            task_id = cur.lastrowid
        finally:
            await db.close()
        return await _get_task(task_id)

    @staticmethod
    async def update_task(task_id: int, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        allowed = {
            "novel_id", "chapter_id", "anchor_storyboard_id", "anchor_position", "title",
            "script_text", "storyboard_text", "video_prompt", "first_frame_path",
            "last_frame_path", "provider", "video_config_id", "model_name", "ratio",
            "resolution", "duration", "generation_mode",
        }
        fields: Dict[str, Any] = {}
        for key in allowed:
            if key in payload:
                fields[key] = payload[key]
        if "status" in payload and payload["status"] in SUPPLEMENT_STATUSES:
            fields["status"] = payload["status"]
        if "params" in payload:
            fields["params_json"] = _json_dumps(payload.get("params") or {})
        task = await _update_task_fields(task_id, fields)
        if task and (fields.get("storyboard_text") or fields.get("video_prompt")):
            await _refresh_materials(task, task.get("storyboard_text") or task.get("video_prompt") or "")
            task = await _get_task(task_id)
        return task

    @staticmethod
    async def set_materials(task_id: int, names: Dict[str, List[str]]) -> Optional[Dict[str, Any]]:
        task = await _get_task(task_id)
        if not task:
            return None
        novel_id = task.get("novel_id")
        if not novel_id:
            raise ValueError("请先选择小说")

        normalized: Dict[str, List[str]] = {"characters": [], "scenes": [], "props": []}
        for key in normalized:
            seen = set()
            for name in names.get(key) or []:
                clean = str(name or "").strip()
                low = clean.lower()
                if clean and low not in seen:
                    normalized[key].append(clean)
                    seen.add(low)

        materials = await _load_elements_by_name(int(novel_id), normalized)
        await _update_task_fields(task_id, {
            "characters_json": _json_dumps([x.get("name") for x in materials["characters"] if x.get("name")]),
            "scenes_json": _json_dumps([x.get("name") for x in materials["scenes"] if x.get("name")]),
            "props_json": _json_dumps([x.get("name") for x in materials["props"] if x.get("name")]),
            "materials_json": _json_dumps(materials),
            "missing_assets_json": _json_dumps(_missing_assets(materials)),
        })
        return await _get_task(task_id)

    @staticmethod
    async def delete_task(task_id: int) -> bool:
        db = await get_db()
        try:
            cur = await db.execute("DELETE FROM supplement_video_tasks WHERE id=?", (task_id,))
            await db.commit()
            return cur.rowcount > 0
        finally:
            await db.close()

    @staticmethod
    async def save_frame(task_id: int, frame_type: str, filename: str, content: bytes) -> Dict[str, Any]:
        if frame_type not in ("first", "last"):
            raise ValueError("frame_type must be first or last")
        ext = os.path.splitext(filename or "frame.png")[1] or ".png"
        images_dir = os.path.join(media_subdir("images"), "supplement")
        os.makedirs(images_dir, exist_ok=True)
        safe_name = f"supplement_{task_id}_{frame_type}_{uuid.uuid4().hex[:8]}{ext}"
        abs_path = os.path.join(images_dir, safe_name)
        async with aiofiles.open(abs_path, "wb") as f:
            await f.write(content)
        rel = f"/data/images/supplement/{safe_name}"
        field = "first_frame_path" if frame_type == "first" else "last_frame_path"
        task = await _update_task_fields(task_id, {field: rel})
        return task

    @staticmethod
    async def build_material_archive(task_id: int) -> str:
        task = await _get_task(task_id)
        if not task:
            raise ValueError("补镜任务不存在")
        zip_dir = os.path.join(get_data_dir(), "supplement_archives")
        os.makedirs(zip_dir, exist_ok=True)
        zip_path = os.path.join(zip_dir, f"supplement_{task_id}_materials.zip")
        files = _collect_downloadable_materials(task)
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            manifest = {
                "id": task.get("id"),
                "title": task.get("title"),
                "status": task.get("status"),
                "first_frame_desc": (task.get("params") or {}).get("first_frame_desc"),
                "last_frame_desc": (task.get("params") or {}).get("last_frame_desc"),
                "materials": task.get("materials") or {},
            }
            zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
            zf.writestr("storyboard.txt", task.get("storyboard_text") or "")
            zf.writestr("video_prompt.txt", task.get("video_prompt") or "")
            used_arc = set()
            for db_path, arc_name in files:
                abs_path = resolve_db_path(db_path) or db_path
                if not abs_path or not os.path.exists(abs_path):
                    continue
                safe_arc = arc_name
                base, ext = os.path.splitext(safe_arc)
                seq = 2
                while safe_arc in used_arc:
                    safe_arc = f"{base}_{seq}{ext}"
                    seq += 1
                used_arc.add(safe_arc)
                zf.write(abs_path, safe_arc)
        return zip_path

    @staticmethod
    async def list_frame_sources(task_id: int) -> Dict[str, Any]:
        task = await _get_task(task_id)
        if not task:
            raise ValueError("supplement task not found")
        anchor_id = task.get("anchor_storyboard_id")
        if not anchor_id:
            return {"items": []}
        anchor = await _load_anchor(int(anchor_id))
        if not anchor:
            return {"items": []}

        db = await get_db()
        try:
            script_id = anchor.get("script_id")
            if script_id is None and task.get("chapter_id"):
                cur_script = await db.execute(
                    "SELECT id FROM scripts WHERE novel_id=? AND chapter_id=? ORDER BY id DESC LIMIT 1",
                    (anchor.get("novel_id"), task.get("chapter_id")),
                )
                script_row = await cur_script.fetchone()
                if script_row:
                    script_id = script_row["id"]
            if script_id is None:
                queries = [
                    ("anchor", "SELECT * FROM storyboards WHERE id=? AND video_url IS NOT NULL AND video_url != ''", (anchor_id,)),
                ]
            else:
                sort_order = anchor.get("sort_order") or 0
                scene_index = anchor.get("scene_index")
                section_number = anchor.get("section_number") or 0
                if scene_index is not None:
                    prev_where = """
                      AND (
                        scene_index < ?
                        OR (scene_index = ? AND section_number < ?)
                        OR (scene_index = ? AND section_number = ? AND sort_order < ?)
                      )
                    """
                    next_where = """
                      AND (
                        scene_index > ?
                        OR (scene_index = ? AND section_number > ?)
                        OR (scene_index = ? AND section_number = ? AND sort_order > ?)
                      )
                    """
                    prev_params = (anchor.get("novel_id"), script_id, scene_index, scene_index, section_number, scene_index, section_number, sort_order)
                    next_params = (anchor.get("novel_id"), script_id, scene_index, scene_index, section_number, scene_index, section_number, sort_order)
                    order_prev = "scene_index DESC, section_number DESC, sort_order DESC, id DESC"
                    order_next = "scene_index ASC, section_number ASC, sort_order ASC, id ASC"
                else:
                    prev_where = "AND sort_order < ?"
                    next_where = "AND sort_order > ?"
                    prev_params = (anchor.get("novel_id"), script_id, sort_order)
                    next_params = (anchor.get("novel_id"), script_id, sort_order)
                    order_prev = "sort_order DESC, id DESC"
                    order_next = "sort_order ASC, id ASC"
                queries = [
                    ("prev", f"""
                        SELECT * FROM storyboards
                        WHERE novel_id=? AND script_id IS ?
                          {prev_where}
                          AND video_status='done'
                          AND video_url IS NOT NULL AND video_url != ''
                        ORDER BY {order_prev}
                        LIMIT 1
                    """, prev_params),
                    ("anchor", "SELECT * FROM storyboards WHERE id=? AND video_url IS NOT NULL AND video_url != ''", (anchor_id,)),
                    ("next", f"""
                        SELECT * FROM storyboards
                        WHERE novel_id=? AND script_id IS ?
                          {next_where}
                          AND video_status='done'
                          AND video_url IS NOT NULL AND video_url != ''
                        ORDER BY {order_next}
                        LIMIT 1
                    """, next_params),
                ]
            items: List[Dict[str, Any]] = []
            for role, sql, params in queries:
                cur = await db.execute(sql, params)
                row = await cur.fetchone()
                if not row:
                    continue
                item = dict(row)
                section_info = _json_loads(item.get("section_info"), {}) or {}
                scene_no = item.get("scene_index")
                section_no = item.get("section_number")
                label = f"#{(scene_no or 0) + 1}-{section_no or ''} {section_info.get('scene') or ''}".strip()
                items.append({
                    "role": role,
                    "storyboard_id": item.get("id"),
                    "label": label,
                    "video_url": _clean_path(item.get("video_url")),
                    "last_frame_path": _clean_path(item.get("last_frame_path")),
                })
            return {"items": items}
        finally:
            await db.close()

    @staticmethod
    async def capture_frame_from_storyboard(
        task_id: int,
        source_storyboard_id: int,
        frame_type: str,
        capture_time: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        if frame_type not in ("first", "last"):
            raise ValueError("frame_type must be first or last")
        task = await _get_task(task_id)
        if not task:
            return None
        source = await _load_anchor(source_storyboard_id)
        if not source or not source.get("video_url"):
            raise ValueError("source storyboard has no video")
        video_abs = _resolve_local_media_or_url(source.get("video_url"))
        if not video_abs:
            raise ValueError("source video file not found")
        images_dir = os.path.join(media_subdir("images"), "supplement")
        os.makedirs(images_dir, exist_ok=True)
        filename = f"supplement_{task_id}_{frame_type}_from_{source_storyboard_id}_{uuid.uuid4().hex[:8]}.jpg"
        output_path = os.path.join(images_dir, filename)
        if capture_time is not None:
            ok = await _extract_frame_at(video_abs, output_path, capture_time, timeout=30)
        elif frame_type == "first":
            ok = await _extract_first_frame(video_abs, output_path, timeout=30)
        else:
            ok = await VideoService().extract_last_frame(video_abs, output_path, sseof_seconds=0.5, timeout=30)
        if not ok:
            raise ValueError("capture frame failed")
        rel = f"/data/images/supplement/{filename}"
        field = "first_frame_path" if frame_type == "first" else "last_frame_path"
        return await _update_task_fields(task_id, {field: rel})

    @staticmethod
    async def generate_storyboard(task_id: int, template_id: int, llm_config_id: int) -> Dict[str, Any]:
        task = await _get_task(task_id)
        if not task:
            raise ValueError("补镜任务不存在")
        script_text = (task.get("script_text") or "").strip()
        if not script_text:
            raise ValueError("请先填写补镜描述")
        template = await get_template_by_id(template_id)
        if not template:
            raise ValueError("分镜模板不存在")
        anchor = await _load_anchor(task.get("anchor_storyboard_id"))
        anchor_text = ""
        if anchor:
            anchor_text = (anchor.get("prompt") or anchor.get("description") or "")[:3000]

        messages, var_values = _build_messages(template, script_text, anchor_text)
        assemble_payload = None
        mode, admin_id = _storyboard_assemble_eligibility(template)
        if mode == "assemble":
            assemble_payload = _build_storyboard_assemble_payload(
                template=template,
                admin_id=admin_id,
                var_values=var_values,
                scene_content=script_text,
                with_character_state=False,
                inject_block=f"补镜参考上下文:\n{anchor_text}" if anchor_text else "",
            )

        raw = await LLMService.call_llm(
            config_id=llm_config_id,
            messages=messages,
            timeout=900,
            task_type="storyboard_generate",
            novel_id=task.get("novel_id"),
            source_id=task_id,
            source_type="supplement_video",
            assemble_payload=assemble_payload,
        )
        cleaned = _strip_reasoning_chain(raw or "").strip()
        sections = await StoryboardService._parse_sections_with_dynamic_rules(cleaned, flow=_storyboard_flow(template))
        storyboard_text = ""
        if sections:
            first = sections[0]
            storyboard_text = first.get("full_text") or ""
        if not storyboard_text:
            storyboard_text = cleaned
        if not storyboard_text.strip():
            raise ValueError("大模型未返回可用分镜")

        video_prompt = SupplementVideoService.build_video_prompt(storyboard_text)
        task = await _update_task_fields(task_id, {
            "storyboard_text": storyboard_text,
            "video_prompt": video_prompt,
            "status": "storyboard_ready",
            "error_message": None,
        })
        await _refresh_materials(task, storyboard_text)
        return await _get_task(task_id)

    @staticmethod
    def build_video_prompt(storyboard_text: str) -> str:
        text = storyboard_text or ""
        start = text.find("成片提示词")
        if start >= 0:
            return text[start:].split("成片提示词", 1)[-1].strip("：:\n ")
        return text.strip()

    @staticmethod
    async def generate_video(task_id: int, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = payload or {}
        task = await _get_task(task_id)
        if not task:
            raise ValueError("补镜任务不存在")
        if payload:
            task = await SupplementVideoService.update_task(task_id, payload)
        prompt = (task.get("video_prompt") or task.get("storyboard_text") or "").strip()
        if not prompt:
            raise ValueError("请先生成或填写临时分镜/视频提示词")

        materials = task.get("materials") or {}
        params = task.get("params") or {}
        frame_mode = str(params.get("frame_reference_mode") or "auto").strip().lower()
        include_first_frame = frame_mode in ("auto", "first", "first_last")
        include_last_frame = frame_mode in ("auto", "last", "first_last")
        frame_desc_map = {
            "first_frame_path": str(params.get("first_frame_desc") or DEFAULT_FIRST_FRAME_DESC).strip(),
            "last_frame_path": str(params.get("last_frame_desc") or DEFAULT_LAST_FRAME_DESC).strip(),
        }
        images: List[str] = []
        image_items: List[Dict[str, str]] = []
        for frame_key in ("first_frame_path", "last_frame_path"):
            if frame_key == "first_frame_path" and not include_first_frame:
                continue
            if frame_key == "last_frame_path" and not include_last_frame:
                continue
            p = task.get(frame_key)
            if p:
                local = _as_local_or_original(p)
                if local:
                    images.append(local)
                    image_items.append({
                        "path": local,
                        "name": "首帧" if frame_key == "first_frame_path" else "尾帧",
                        "kind": "first_frame" if frame_key == "first_frame_path" else "last_frame",
                        "desc": frame_desc_map.get(frame_key, ""),
                    })
        for group in ("characters", "scenes", "props"):
            for item in materials.get(group) or []:
                p = item.get("image_path")
                if p:
                    local = _as_local_or_original(p)
                    if local:
                        images.append(local)
                        image_items.append({
                            "path": local,
                            "name": item.get("name") or "",
                            "kind": {"characters": "character", "scenes": "scene", "props": "prop"}[group],
                        })
        dedup_images: List[str] = []
        dedup_image_items: List[Dict[str, str]] = []
        for path, item in zip(images, image_items):
            if path and path not in dedup_images:
                dedup_images.append(path)
                dedup_image_items.append(item)
            if len(dedup_images) >= 9:
                break
        images = dedup_images
        image_items = dedup_image_items

        audios: List[str] = []
        audio_items: List[Dict[str, str]] = []
        for item in materials.get("characters") or []:
            audio = item.get("audio_file")
            if audio:
                local = _as_local_or_original(audio)
                if local:
                    audios.append(local)
                    audio_items.append({
                        "path": local,
                        "name": item.get("name") or "",
                        "kind": "character",
                    })
        dedup_audios: List[str] = []
        dedup_audio_items: List[Dict[str, str]] = []
        for path, item in zip(audios, audio_items):
            if path and path not in dedup_audios:
                dedup_audios.append(path)
                dedup_audio_items.append(item)
            if len(dedup_audios) >= 3:
                break
        audios = dedup_audios
        audio_items = dedup_audio_items

        provider_name = task.get("provider") or "jimeng"
        config = None
        if provider_name != "jimeng" and task.get("video_config_id"):
            config = await LLMService.get_by_id(int(task["video_config_id"]))
            if not config:
                raise ValueError("视频模型配置不存在，请先到视频管理重新选择对应渠道的视频模型")
        provider_name = _infer_provider_from_config(provider_name, config)
        if provider_name == "pippit_cli" and not config:
            config = await _pippit_provider_config()
        if provider_name in ("volcengine_ark", "cool", "xinglian") and not config:
            raise ValueError(f"请先到视频管理配置{PROVIDER_FRIENDLY.get(provider_name, provider_name)}视频模型")
        provider = get_provider(provider_name, config or {})
        params.update({
            "duration": int(task.get("duration") or params.get("duration") or 8),
            "ratio": task.get("ratio") or params.get("ratio") or "9:16",
            "resolution": task.get("resolution") or params.get("resolution") or "720P",
            "generation_mode": task.get("generation_mode") or params.get("generation_mode") or ("multimodal2video" if images or audios else "text2video"),
        })
        model_name = (task.get("model_name") or "").strip()
        if model_name:
            params["model_version"] = model_name
            params["model"] = model_name
        elif config and config.get("model_name"):
            params["model"] = config.get("model_name")
        final_prompt = _build_supplement_final_prompt(
            prompt,
            image_items,
            audio_items,
            ref_at=(provider_name == "cool"),
            style_prompt=str(params.get("style_prompt") or ""),
        )
        log_model = (
            str(params.get("model") or params.get("model_version") or "").strip()
            or model_name
            or (config or {}).get("model_name")
            or provider_name
        )
        log_config_name = (config or {}).get("name") or PROVIDER_FRIENDLY.get(provider_name, provider_name)
        log_base_url = (config or {}).get("base_url") or (config or {}).get("baseUrl") or ""
        log_provider_code = (config or {}).get("provider_code") or (config or {}).get("providerCode") or provider_name
        if provider_name == "jimeng" and log_provider_code == "jimeng":
            log_provider_code = "seedance"

        await _update_task_fields(task_id, {
            "status": "generating",
            "provider": provider_name,
            "params_json": _json_dumps(params),
            "submit_id": None,
            "output_video_path": None,
            "output_remote_url": None,
            "output_last_frame_path": None,
            "error_message": None,
            "finished_at": None,
        })
        video_log_id = await _create_supplement_video_log(
            task=task,
            provider=provider_name,
            provider_code=log_provider_code,
            model=log_model,
            config_name=log_config_name,
            base_url=log_base_url,
            final_prompt=final_prompt,
            images=images,
            audios=audios,
            params=params,
        )
        try:
            result = await provider.submit(prompt=final_prompt, images=images, audios=audios, params=params)
        except Exception as exc:
            error_message = f"{type(exc).__name__}: {exc}"
            if video_log_id > 0:
                try:
                    from services.log_service import LogService
                    await LogService.update_log_error(video_log_id, error_message[:1500])
                except Exception:
                    pass
            task = await _update_task_fields(task_id, {
                "status": "failed",
                "error_message": error_message,
                "finished_at": now_beijing_str(),
            })
            return task
        if not result.success or not result.submit_id:
            if video_log_id > 0:
                try:
                    from services.log_service import LogService
                    fail_detail = result.fail_reason or "视频提交失败"
                    if result.sanitized_payload:
                        try:
                            from services.log_service import _sanitize_base64_recursive
                            fail_detail += "\n\n[payload摘要]: " + json.dumps(
                                _sanitize_base64_recursive(result.sanitized_payload),
                                ensure_ascii=False,
                            )[:1500]
                        except Exception:
                            pass
                    await LogService.update_log_error(video_log_id, fail_detail[:1500])
                except Exception:
                    pass
            task = await _update_task_fields(task_id, {
                "status": "failed",
                "error_message": result.fail_reason or "视频提交失败",
                "finished_at": now_beijing_str(),
            })
            return task
        await _mark_supplement_video_submitted(video_log_id, provider=provider_name, submit_id=result.submit_id)
        return await _update_task_fields(task_id, {
            "status": "generating",
            "submit_id": result.submit_id,
            "error_message": None,
        })

    @staticmethod
    async def poll_video(task_id: int) -> Dict[str, Any]:
        task = await _get_task(task_id)
        if not task:
            raise ValueError("补镜任务不存在")
        submit_id = task.get("submit_id")
        if not submit_id:
            return task
        provider_name = task.get("provider") or "jimeng"
        config = None
        if provider_name != "jimeng" and task.get("video_config_id"):
            config = await LLMService.get_by_id(int(task["video_config_id"]))
        provider_name = _infer_provider_from_config(provider_name, config)
        if provider_name == "pippit_cli" and not config:
            config = await _pippit_provider_config()
        provider = get_provider(provider_name, config or {})
        qres = await provider.query(submit_id)
        if qres.status in ("queued", "running"):
            return await _update_task_fields(task_id, {"status": "generating"})
        if qres.status in ("fail", "failed", "cancelled", "expired"):
            fail_reason = qres.fail_reason or "视频生成失败"
            await _finalize_supplement_video_log_error(
                task_id=task_id,
                submit_id=submit_id,
                fail_reason=fail_reason,
            )
            return await _update_task_fields(task_id, {
                "status": "failed",
                "error_message": fail_reason,
                "finished_at": now_beijing_str(),
            })
        if qres.status != "success":
            return task

        local_url = None
        remote_url = qres.video_url
        if provider_name == "jimeng":
            download_dir = os.path.join(media_subdir("videos"), "supplement")
            os.makedirs(download_dir, exist_ok=True)
            before = set()
            for root, _, files in os.walk(download_dir):
                for name in files:
                    if name.lower().endswith((".mp4", ".mov", ".webm")):
                        before.add(os.path.join(root, name))
            vs = VideoService()
            download_result = await vs.query_result(submit_id, download_dir=download_dir)
            data = download_result.get("data") if isinstance(download_result, dict) else {}
            found = _extract_video_url(data)
            if found and not str(found).startswith(("http://", "https://")):
                abs_found = resolve_db_path(found) or found
                if os.path.exists(abs_found):
                    filename = f"supplement_{task_id}_{int(time.time())}_{os.path.basename(abs_found)}"
                    target = os.path.join(download_dir, filename)
                    if os.path.abspath(abs_found) != os.path.abspath(target):
                        import shutil
                        shutil.copy2(abs_found, target)
                    local_url = f"/data/videos/supplement/{filename}"
            if not local_url:
                latest = _latest_mp4_path(download_dir, before=before)
                if latest:
                    local_url = "/data/videos/supplement/" + os.path.basename(latest)
            if not remote_url:
                remote_url = _extract_video_url(data)
        else:
            if remote_url and not str(remote_url).startswith(("/data/", "data/")):
                local_url = await _download_remote_video(task_id, remote_url)
            elif remote_url:
                local_url = _clean_path(remote_url)

        if not local_url:
            fail_reason = "视频已生成，但本地下载失败。请稍后重试轮询或到上游后台查看。"
            await _finalize_supplement_video_log_error(
                task_id=task_id,
                submit_id=submit_id,
                fail_reason=fail_reason,
            )
            return await _update_task_fields(task_id, {
                "status": "failed",
                "output_remote_url": remote_url,
                "error_message": fail_reason,
                "finished_at": now_beijing_str(),
            })
        try:
            requested_duration = int((task.get("params") or {}).get("duration") or task.get("duration") or 0) or None
        except Exception:
            requested_duration = None
        await _finalize_supplement_video_log_success(
            task_id=task_id,
            submit_id=submit_id,
            provider=provider_name,
            video_url=local_url or remote_url,
            requested_duration=requested_duration,
            actual_duration=qres.duration or None,
        )
        output_last_frame = await _extract_output_last_frame(task_id, local_url)
        return await _update_task_fields(task_id, {
            "status": "success",
            "output_video_path": local_url,
            "output_remote_url": remote_url,
            "output_last_frame_path": output_last_frame,
            "error_message": None,
            "finished_at": now_beijing_str(),
        })
