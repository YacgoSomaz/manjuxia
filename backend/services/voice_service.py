"""角色音色(TTS)服务 · 第一步:试听 + 绑定。

镜像 image_service 的调用模式:取云端语音配置(get_active_config("voice")) →
建日志 → 按 provider 路由合成 → 存 mp3 到 media/images/{小说}/音频/ → 回相对 url。

⚠️ 第一步只做"人物卡选音色 + 试听 demo"。声音复刻 / 台词批量配音是后续步骤。
⚠️ 实际 TTS 的 HTTP 形状(百炼)是唯一的不确定点,集中在 `_synthesize_via_bailian`,
   便于实测后单点调整;不通时按 model 名回退 `_synthesize_via_cosyvoice`。
"""
import asyncio
import json
import logging
import os
import sys
from typing import Optional, List, Dict, Any
from urllib.parse import quote, unquote

import httpx

from services import cloud_llm_sync
from services.log_service import LogService
from services.image_service import ImageService
from services.settings_service import SettingsService
from utils.paths import media_subdir, resolve_db_path

logger = logging.getLogger(__name__)

KEY_CUSTOM_VOICES = "voice.custom_library"
LOCAL_AUDIO_PREFIX = "local_audio:"

# 试听并发去重:同 voice_id 的 demo 同一时刻只合成一次(防首次连点/多角色同点重复计费)。
_preview_locks: Dict[str, asyncio.Lock] = {}


def _preview_lock_for(voice_id: str) -> asyncio.Lock:
    lk = _preview_locks.get(voice_id)
    if lk is None:
        lk = asyncio.Lock()
        _preview_locks[voice_id] = lk
    return lk

# 试听示例文本(短,自然约 3-5 秒)
DEMO_TEXT = "你好,这是我的声音试听,希望你会喜欢。"

# 内置音色表(下拉/弹窗用;前端也允许手填 voice_id 兜底)。
# 百炼/DashScope 没有"列音色"API(MiniMax 在百炼上不支持音色查询),故内置静态表。
# voice_id 为 MiniMax 原生命名(百炼直接透传),来源 MiniMax 系统音色列表。
# 每条:voice_id / label(中文名)/ gender(male/female/child,供前端分组)。
# 版权/来源未确认的音色不要放入 PRESET_VOICES;若后续导入脚本里出现 pending/unconfirmed 等标记,
# 服务端和生成脚本也会兜底过滤,避免把待确认音色打进包。
_ALLOWED_PRESET_GENDERS = {"male", "female", "child"}

PRESET_VOICES: Dict[str, List[Dict[str, str]]] = {
    "minimax": [
        # —— 旧式命名:男声 ——
        {"voice_id": "male-qn-qingse", "label": "青涩青年", "gender": "male"},
        {"voice_id": "male-qn-jingying", "label": "精英青年", "gender": "male"},
        {"voice_id": "male-qn-badao", "label": "霸道青年", "gender": "male"},
        {"voice_id": "male-qn-daxuesheng", "label": "青年大学生", "gender": "male"},
        {"voice_id": "junlang_nanyou", "label": "俊朗男友", "gender": "male"},
        {"voice_id": "chunzhen_xuedi", "label": "纯真学弟", "gender": "male"},
        {"voice_id": "lengdan_xiongzhang", "label": "冷淡学长", "gender": "male"},
        {"voice_id": "badao_shaoye", "label": "霸道少爷", "gender": "male"},
        {"voice_id": "bingjiao_didi", "label": "病娇弟弟", "gender": "male"},
        # —— 旧式命名:女声 ——
        {"voice_id": "female-shaonv", "label": "少女", "gender": "female"},
        {"voice_id": "female-yujie", "label": "御姐", "gender": "female"},
        {"voice_id": "female-chengshu", "label": "成熟女性", "gender": "female"},
        {"voice_id": "female-tianmei", "label": "甜美女性", "gender": "female"},
        {"voice_id": "tianxin_xiaoling", "label": "甜心小玲", "gender": "female"},
        {"voice_id": "qiaopi_mengmei", "label": "俏皮萌妹", "gender": "female"},
        {"voice_id": "wumei_yujie", "label": "妩媚御姐", "gender": "female"},
        {"voice_id": "diadia_xuemei", "label": "嗲嗲学妹", "gender": "female"},
        {"voice_id": "danya_xuejie", "label": "淡雅学姐", "gender": "female"},
        # —— 童声 ——
        {"voice_id": "clever_boy", "label": "聪明男童", "gender": "child"},
        {"voice_id": "cute_boy", "label": "可爱男童", "gender": "child"},
        {"voice_id": "lovely_girl", "label": "萌萌女童", "gender": "child"},
        # —— 新式命名(Chinese (Mandarin)_*,含空格/括号,精确照抄)——
        {"voice_id": "Chinese (Mandarin)_Reliable_Executive", "label": "沉稳高管", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Gentleman", "label": "温润男声", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Unrestrained_Young_Man", "label": "不羁青年", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Gentle_Youth", "label": "温润青年", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Male_Announcer", "label": "播报男声", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Southern_Young_Man", "label": "南方小哥", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Radio_Host", "label": "电台男主播", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Lyrical_Voice", "label": "抒情男声", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Sincere_Adult", "label": "真诚青年", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_Humorous_Elder", "label": "搞笑大爷", "gender": "male"},
        {"voice_id": "Chinese (Mandarin)_News_Anchor", "label": "新闻女声", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Mature_Woman", "label": "傲娇御姐", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Sweet_Lady", "label": "甜美女声", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Warm_Bestie", "label": "温暖闺蜜", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Warm_Girl", "label": "温暖少女", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Wise_Women", "label": "阅历姐姐", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Gentle_Senior", "label": "温柔学姐", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Crisp_Girl", "label": "清脆少女", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Soft_Girl", "label": "柔和少女", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Kind-hearted_Antie", "label": "热心大婶", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_Kind-hearted_Elder", "label": "花甲奶奶", "gender": "female"},
        {"voice_id": "Chinese (Mandarin)_HK_Flight_Attendant", "label": "港普空姐", "gender": "female"},
    ],
    "cosyvoice": [
        {"voice_id": "longxiaochun", "label": "龙小淳", "gender": "female"},
        {"voice_id": "longxiaoxia", "label": "龙小夏", "gender": "female"},
        {"voice_id": "longwan", "label": "龙婉", "gender": "female"},
        {"voice_id": "longcheng", "label": "龙橙", "gender": "male"},
        {"voice_id": "longhua", "label": "龙华", "gender": "male"},
        {"voice_id": "longshu", "label": "龙书", "gender": "male"},
    ],
}
# _default 复用 minimax 桶(避免重复维护)
PRESET_VOICES["_default"] = PRESET_VOICES["minimax"]


def _voice_bucket(cfg: Optional[dict]) -> str:
    """按配置的 model/provider 选预置音色桶。"""
    if not cfg:
        return "_default"
    model = (cfg.get("modelName") or "").lower()
    pc = (cfg.get("providerCode") or "").lower()
    blob = f"{model} {pc}"
    if "cosyvoice" in blob:
        return "cosyvoice"
    if "minimax" in blob or "speech-2" in blob:
        return "minimax"
    return "_default"


def _is_excluded_preset_voice(item: Dict[str, Any]) -> bool:
    """Skip voices whose source/copyright is not confirmed."""
    blob = " ".join(
        str(item.get(k) or "")
        for k in ("voice_id", "label", "gender", "status", "category", "source_note", "copyright")
    ).lower()
    return any(
        token in blob
        for token in (
            "待确认",
            "待人工",
            "未确认",
            "版权待确认",
            "pending",
            "unconfirmed",
            "manual_review",
            "review_required",
            "copyright_pending",
        )
    )


def _is_supported_preset_voice(item: Dict[str, Any]) -> bool:
    """Only confirmed male/female/child preset voices are bundled/displayed."""
    if _is_excluded_preset_voice(item):
        return False
    return str(item.get("gender") or "").strip() in _ALLOWED_PRESET_GENDERS


def _local_audio_voice_id(audio_file: str) -> str:
    return LOCAL_AUDIO_PREFIX + quote(str(audio_file or "").strip(), safe="")


def local_audio_voice_id(audio_file: str) -> str:
    return _local_audio_voice_id(audio_file)


def local_audio_file_from_voice_id(voice_id: Optional[str]) -> Optional[str]:
    raw = str(voice_id or "").strip()
    if not raw.startswith(LOCAL_AUDIO_PREFIX):
        return None
    rel = unquote(raw[len(LOCAL_AUDIO_PREFIX):]).strip()
    return rel or None


def _normalize_voice_item(item: Dict[str, Any], source: str) -> Optional[Dict[str, Any]]:
    audio_file = str(item.get("audio_file") or item.get("audio_url") or "").strip()
    kind = str(item.get("kind") or ("audio" if audio_file else "preset")).strip() or "preset"
    voice_id = str(item.get("voice_id") or "").strip()
    if not voice_id and audio_file:
        voice_id = _local_audio_voice_id(audio_file)
    if voice_id.startswith(LOCAL_AUDIO_PREFIX) and not audio_file:
        audio_file = local_audio_file_from_voice_id(voice_id) or ""
        kind = "audio"
    label = str(item.get("label") or "").strip()
    if not voice_id:
        return None
    # v3.61.291: "我的"只保留真正的外部音频。旧版把预制 voice_id 复制到
    # custom 库会造成重复,这里直接过滤掉非本地音频的 custom 项。
    if source == "custom" and kind != "audio":
        return None
    gender = str(item.get("gender") or "").strip()
    if gender == "role" or gender not in _ALLOWED_PRESET_GENDERS:
        gender = ""
    normalized = {
        "voice_id": voice_id,
        "label": label or voice_id,
        "gender": gender,
        "source": source,
        "is_custom": source == "custom",
        "kind": kind,
    }
    if audio_file:
        normalized["audio_file"] = audio_file
    if bool(item.get("auto_audio")):
        normalized["auto_audio"] = True
    return normalized


async def list_custom_voices() -> List[Dict[str, Any]]:
    raw = await SettingsService.get(KEY_CUSTOM_VOICES, "[]")
    try:
        data = json.loads(raw) if raw else []
    except Exception:
        logger.warning("[voice] 自定义音色库 JSON 解析失败,已按空库处理")
        data = []
    if not isinstance(data, list):
        data = []
    voices: List[Dict[str, Any]] = []
    seen = set()
    for item in data:
        if not isinstance(item, dict):
            continue
        normalized = _normalize_voice_item(item, "custom")
        if not normalized or normalized["voice_id"] in seen:
            continue
        seen.add(normalized["voice_id"])
        voices.append(normalized)
    return voices


async def save_custom_voice(voice_id: str, label: str, gender: str = "") -> Dict[str, Any]:
    if not str(label or "").strip():
        raise ValueError("音色名称不能为空")
    normalized = _normalize_voice_item(
        {"voice_id": voice_id, "label": label, "gender": gender},
        "custom",
    )
    if not normalized:
        raise ValueError("voice_id 不能为空")

    voices = await list_custom_voices()
    replaced = False
    for idx, item in enumerate(voices):
        if item["voice_id"] == normalized["voice_id"]:
            voices[idx] = normalized
            replaced = True
            break
    if not replaced:
        voices.insert(0, normalized)
    voices = voices[:200]
    await SettingsService.set(
        KEY_CUSTOM_VOICES,
        json.dumps(voices, ensure_ascii=False, separators=(",", ":")),
    )
    return normalized


async def save_custom_audio_voice(label: str, audio_file: str, gender: str = "") -> Dict[str, Any]:
    if not str(label or "").strip():
        raise ValueError("音色名称不能为空")
    if not str(audio_file or "").strip():
        raise ValueError("音频文件不能为空")
    normalized = _normalize_voice_item(
        {
            "voice_id": _local_audio_voice_id(audio_file),
            "label": label,
            "gender": gender,
            "kind": "audio",
            "audio_file": audio_file,
        },
        "custom",
    )
    if not normalized:
        raise ValueError("音频音色无效")
    voices = await list_custom_voices()
    kept = [v for v in voices if v["voice_id"] != normalized["voice_id"]]
    kept.insert(0, normalized)
    kept = kept[:200]
    await SettingsService.set(
        KEY_CUSTOM_VOICES,
        json.dumps(kept, ensure_ascii=False, separators=(",", ":")),
    )
    return normalized


async def delete_custom_voice(voice_id: str) -> bool:
    target = str(voice_id or "").strip()
    if not target:
        return False
    voices = await list_custom_voices()
    kept = [v for v in voices if v["voice_id"] != target]
    if len(kept) == len(voices):
        return False
    await SettingsService.set(
        KEY_CUSTOM_VOICES,
        json.dumps(kept, ensure_ascii=False, separators=(",", ":")),
    )
    return True


async def _list_existing_audio_voices(element_id: Optional[int] = None, novel_id: Optional[int] = None) -> List[Dict[str, Any]]:
    if not element_id and not novel_id:
        return []
    try:
        from database.db import get_db
        db = await get_db()
        try:
            if element_id and not novel_id:
                cur = await db.execute("SELECT novel_id FROM extracted_elements WHERE id = ?", (element_id,))
                row = await cur.fetchone()
                if row:
                    novel_id = row["novel_id"]
            if not novel_id:
                return []

            voices: List[Dict[str, Any]] = []
            cur = await db.execute(
                """
                SELECT id, name, audio_file
                FROM extracted_elements
                WHERE novel_id = ?
                  AND element_type = 'character'
                  AND audio_file IS NOT NULL
                  AND audio_file != ''
                ORDER BY id
                """,
                (novel_id,),
            )
            for row in await cur.fetchall():
                audio_file = str(row["audio_file"] or "").strip()
                if not audio_file:
                    continue
                voices.append({
                    "voice_id": _local_audio_voice_id(audio_file),
                    "label": str(row["name"] or "角色音频"),
                    "gender": "",
                    "source": "custom",
                    "is_custom": True,
                    "kind": "audio",
                    "audio_file": audio_file,
                    "auto_audio": True,
                    "current_audio": bool(element_id and row["id"] == element_id),
                })

            cur = await db.execute(
                """
                SELECT v.variant_name, v.audio_file, e.name AS character_name
                FROM character_variants v
                JOIN extracted_elements e ON e.id = v.element_id
                WHERE e.novel_id = ?
                  AND v.audio_file IS NOT NULL
                  AND v.audio_file != ''
                ORDER BY e.id, v.sort_order, v.id
                """,
                (novel_id,),
            )
            for row in await cur.fetchall():
                audio_file = str(row["audio_file"] or "").strip()
                if not audio_file:
                    continue
                character_name = str(row["character_name"] or "").strip()
                variant_name = str(row["variant_name"] or "").strip()
                label = f"{character_name}·{variant_name}" if character_name and variant_name else (variant_name or character_name or "马甲音频")
                voices.append({
                    "voice_id": _local_audio_voice_id(audio_file),
                    "label": label,
                    "gender": "",
                    "source": "custom",
                    "is_custom": True,
                    "kind": "audio",
                    "audio_file": audio_file,
                    "auto_audio": True,
                })
            return voices
        finally:
            await db.close()
    except Exception as e:
        logger.warning("[voice] 自动收集角色音频失败: %s", e)
        return []


async def resolve_local_audio_voice(voice_id: Optional[str]) -> Optional[str]:
    audio_file = local_audio_file_from_voice_id(voice_id)
    if audio_file:
        return audio_file
    for item in await list_custom_voices():
        if item.get("voice_id") == voice_id and item.get("kind") == "audio":
            return item.get("audio_file")
    return None


async def resolve_voice_audio_source_path(voice_id: Optional[str]) -> Optional[str]:
    """Return an existing local file path usable as a video reference audio.

    Custom voices resolve to the user's global data/audios file. Preset voices
    resolve to the bundled public/voice-previews mp3 generated at build time.
    """
    raw = str(voice_id or "").strip()
    if not raw:
        return None

    local_audio = await resolve_local_audio_voice(raw)
    if local_audio:
        path = resolve_db_path(local_audio)
        if path and os.path.exists(path):
            return path
        return None

    rel = _bundled_preview_rel(raw)
    try:
        path = os.path.join(_public_dir(), rel.replace("/", os.sep))
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return path
    except Exception:
        return None
    return None


async def materialize_voice_audio_file(
    voice_id: Optional[str],
    novel_name: Optional[str],
    character_name: Optional[str],
    *,
    variant_name: Optional[str] = None,
) -> Optional[str]:
    """Copy a selected voice's audio source into a novel-scoped standard path.

    Returns a DB path like /data/images/{novel}/音频/音频_{character}[_{variant}].mp3.
    """
    src_path = await resolve_voice_audio_source_path(voice_id)
    if not src_path:
        return None

    ext = os.path.splitext(src_path)[1].lower() or ".mp3"
    novel_part = ImageService._safe_name_part(novel_name, 24) or "未命名小说"
    name_part = ImageService._safe_name_part(character_name, 24) or "角色"
    if variant_name:
        variant_part = ImageService._safe_name_part(variant_name, 24) or "马甲"
        filename = f"音频_{name_part}_{variant_part}{ext}"
    else:
        filename = f"音频_{name_part}{ext}"
    rel_name = f"{novel_part}/音频/{filename}"
    dest_path = os.path.join(media_subdir("images"), rel_name.replace("/", os.sep))
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if os.path.abspath(src_path) != os.path.abspath(dest_path):
        import shutil
        shutil.copyfile(src_path, dest_path)
    return f"/data/images/{rel_name}"


def _load_bundled_voice_manifest() -> List[Dict[str, str]]:
    """Load extra locally bundled preset voices from public/voice-previews."""
    rel = os.path.join("voice-previews", "sonicvalue_voices.json")
    try:
        full = os.path.join(_public_dir(), rel)
        if not os.path.exists(full):
            return []
        with open(full, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            return []
        items: List[Dict[str, str]] = []
        for raw in data:
            if not isinstance(raw, dict):
                continue
            voice_id = str(raw.get("voice_id") or "").strip()
            label = str(raw.get("label") or "").strip()
            gender = str(raw.get("gender") or "").strip()
            if not voice_id or not label or gender not in _ALLOWED_PRESET_GENDERS:
                continue
            items.append({"voice_id": voice_id, "label": label, "gender": gender})
        return items
    except Exception as exc:
        logger.warning("[voice] 读取本地预制音色清单失败: %s", exc)
        return []


async def list_voices(element_id: Optional[int] = None, novel_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """返回内置音色 + 本地自定义音色。无语音配置时仍返回默认内置表,试听时再报配置缺失。"""
    cfg: Optional[dict] = None
    try:
        cfg = await cloud_llm_sync.get_active_config(config_type="voice")
    except Exception as e:
        logger.warning("[voice] 取语音配置失败: %s", e)
    bucket = PRESET_VOICES.get(_voice_bucket(cfg), PRESET_VOICES["_default"])
    preset_items = list(bucket) + _load_bundled_voice_manifest()
    merged: Dict[str, Dict[str, Any]] = {}
    for item in preset_items:
        if not _is_supported_preset_voice(item):
            continue
        normalized = _normalize_voice_item(item, "preset")
        if normalized:
            merged[normalized["voice_id"]] = normalized
    for item in await _list_existing_audio_voices(element_id=element_id, novel_id=novel_id):
        # 角色卡已存在的老音频自动回显到「我的」。后续用户显式导入/命名的
        # custom 项会覆盖这里的自动标签。
        merged[item["voice_id"]] = item
    for item in await list_custom_voices():
        merged[item["voice_id"]] = item
    return list(merged.values())


def _looks_like_audio(data: bytes) -> bool:
    if not data or len(data) < 4:
        return False
    return (
        data[:3] == b"ID3"            # mp3 with ID3
        or data[0] == 0xFF and (data[1] & 0xE0) == 0xE0  # mp3 frame sync
        or data[:4] == b"RIFF"        # wav
        or data[:4] == b"OggS"        # ogg
    )


async def _synthesize_via_bailian(cfg: dict, voice_id: str, text: str) -> bytes:
    """百炼(DashScope)MiniMax 同步语音合成。
    依据官方文档:POST {base}/api/v1/services/aigc/multimodal-generation/generation,
    body = {model, input:{text, voice_setting:{voice_id,speed,vol,pitch}, audio_setting:{...}, output_format}},
    返回 output.data.audio:output_format=hex(默认)→ bytes.fromhex;=url → 下载。
    文档:help.aliyun.com/zh/model-studio/minimax-synchronous-speech-synthesis-api
    """
    # baseUrl 归一化:云端可能填 域名 / 域名+/api/v1(SDK 风格) / 域名+/compatible-mode/v1(OpenAI 兼容),
    # 统一截到域名根再拼 DashScope 原生路径,避免 /api/v1/api/v1 之类重复。
    base = (cfg.get("baseUrl") or "https://dashscope.aliyuncs.com").strip().rstrip("/")
    for _suf in ("/compatible-mode/v1", "/api/v1"):
        if base.endswith(_suf):
            base = base[: -len(_suf)].rstrip("/")
            break
    url = f"{base}/api/v1/services/aigc/multimodal-generation/generation"
    extra = cfg.get("extraParams") if isinstance(cfg.get("extraParams"), dict) else {}
    voice_setting: Dict[str, Any] = {"speed": 1.0, "vol": 1.0, "pitch": 0}
    if isinstance(extra.get("voice_setting"), dict):
        voice_setting.update(extra["voice_setting"])
    # 用户在人物卡里选/填的 voice_id 优先,覆盖 extraParams 里可能预填的 voice_id
    voice_setting["voice_id"] = voice_id
    audio_setting: Dict[str, Any] = {"sample_rate": 32000, "format": "mp3"}
    if isinstance(extra.get("audio_setting"), dict):
        audio_setting.update(extra["audio_setting"])
    out_fmt = str(extra.get("output_format") or "hex").lower()
    body = {
        "model": cfg.get("modelName") or "",
        "input": {
            "text": text,
            "voice_setting": voice_setting,
            "audio_setting": audio_setting,
            "output_format": out_fmt,
        },
    }
    headers = {
        "Authorization": f"Bearer {cfg.get('apiKey') or ''}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
        resp = await client.post(url, json=body, headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(f"百炼语音 HTTP {resp.status_code}: {resp.text[:300]}")
        try:
            data = resp.json()
        except Exception:
            raise RuntimeError(f"百炼语音返回非 JSON: {resp.text[:200]}")
        # DashScope 顶层错误(鉴权/参数/模型不存在等)
        if isinstance(data, dict) and data.get("code"):
            raise RuntimeError(f"百炼语音错误 {data.get('code')}: {data.get('message')}")
        output = (data or {}).get("output") or {}
        base_resp = output.get("base_resp") or {}
        if base_resp.get("status_code") not in (0, None):
            raise RuntimeError(f"MiniMax 合成失败 {base_resp.get('status_code')}: {base_resp.get('status_msg')}")
        audio_field = ((output.get("data") or {}).get("audio")) or ""
        if not audio_field:
            raise RuntimeError(f"百炼语音返回无音频: {str(data)[:200]}")
        if out_fmt == "url":
            dl = await client.get(audio_field)
            dl.raise_for_status()
            audio = dl.content
        else:
            try:
                audio = bytes.fromhex(audio_field)
            except ValueError:
                raise RuntimeError("百炼语音 hex 解码失败")
    if not _looks_like_audio(audio):
        raise RuntimeError("百炼语音解码后内容非音频")
    return audio


async def _synthesize_via_cosyvoice(cfg: dict, voice_id: str, text: str) -> bytes:
    """百炼 CosyVoice 路径 —— 本版本暂未接入(协议与 MiniMax 不同,后续补)。"""
    raise RuntimeError(
        "当前语音模型为 CosyVoice,本版本暂未接入;请把云端「语音」配置的模型改为 "
        "MiniMax/speech-2.8-hd,或等后续版本支持 CosyVoice。"
    )


async def _route_synthesize(cfg: dict, voice_id: str, text: str) -> bytes:
    model = (cfg.get("modelName") or "").lower()
    if "cosyvoice" in model:
        return await _synthesize_via_cosyvoice(cfg, voice_id, text)
    return await _synthesize_via_bailian(cfg, voice_id, text)


def _demo_cache_rel(voice_id: str) -> str:
    voice_part = ImageService._safe_name_part(voice_id, 40) or "voice"
    return f"_voice_previews/试听_{voice_part}.mp3"


def _public_dir() -> str:
    candidates = []
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(sys.executable)
        candidates.append(os.path.abspath(os.path.join(exe_dir, "..", "..", "public")))
    candidates.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "public")))
    candidates.append(os.path.abspath(os.path.join(os.getcwd(), "public")))
    for p in candidates:
        if os.path.isdir(p):
            return p
    return candidates[-1]


def _bundled_preview_rel(voice_id: str) -> str:
    voice_part = ImageService._safe_name_part(voice_id, 80) or "voice"
    return f"voice-previews/{voice_part}.mp3"


def _bundled_preview_hit(voice_id: str) -> Optional[str]:
    rel = _bundled_preview_rel(voice_id)
    try:
        full = os.path.join(_public_dir(), rel.replace("/", os.sep))
        if os.path.exists(full) and os.path.getsize(full) > 0:
            return f"/public/{rel}"
    except Exception:
        pass
    return None


def _demo_cache_hit(voice_id: str) -> Optional[str]:
    """命中返回 audio_url,否则 None。"""
    cache_rel = _demo_cache_rel(voice_id)
    try:
        cache_abs = os.path.join(media_subdir("images"), cache_rel)
        if os.path.exists(cache_abs) and os.path.getsize(cache_abs) > 0:
            return f"/data/images/{cache_rel}"
    except Exception:
        pass
    return None


async def synthesize_preview(
    element_id: int,
    voice_id: str,
    novel_id: Optional[int] = None,
    novel_name: Optional[str] = None,
    character_name: Optional[str] = None,
    text: str = DEMO_TEXT,
) -> Dict[str, Any]:
    """合成 ≤5s 试听 demo。返回 {success, audio_url?, message?}。
    缓存 + 并发去重:固定示例文案下,同 voice_id 的 demo 复用同一文件;
    同 voice 正在合成时后续请求 await 同一把锁,落盘后直接返回缓存,避免首次连点/多角色同点重复计费。"""
    local_audio = await resolve_local_audio_voice(voice_id)
    if local_audio:
        path = resolve_db_path(local_audio)
        if path and os.path.exists(path):
            return {"success": True, "audio_url": local_audio, "cached": True, "kind": "audio"}
        return {"success": False, "message": "本地音频文件不存在,请重新导入"}

    text = (text or DEMO_TEXT).strip() or DEMO_TEXT
    is_demo = (text == DEMO_TEXT)
    if is_demo:
        bundled = _bundled_preview_hit(voice_id)
        if bundled:
            return {"success": True, "audio_url": bundled, "cached": True, "kind": "bundled"}
    if not is_demo:
        # 自定义文案不缓存、不去重,直接合成
        return await _do_synthesize_preview(
            element_id, voice_id, novel_id, novel_name, character_name, text, is_demo=False
        )

    # demo:先查缓存(无锁快路径)
    hit = _demo_cache_hit(voice_id)
    if hit:
        return {"success": True, "audio_url": hit, "cached": True}
    # 同 voice 串行:拿锁后再查一次缓存(可能已被前一个请求落盘)
    async with _preview_lock_for(voice_id):
        hit = _demo_cache_hit(voice_id)
        if hit:
            return {"success": True, "audio_url": hit, "cached": True}
        return await _do_synthesize_preview(
            element_id, voice_id, novel_id, novel_name, character_name, text, is_demo=True
        )


async def _do_synthesize_preview(
    element_id: int,
    voice_id: str,
    novel_id: Optional[int],
    novel_name: Optional[str],
    character_name: Optional[str],
    text: str,
    is_demo: bool,
) -> Dict[str, Any]:
    """实际合成 + 落盘(被 synthesize_preview 包裹,demo 路径已持锁)。"""
    cache_rel = _demo_cache_rel(voice_id)
    voice_part = ImageService._safe_name_part(voice_id, 40) or "voice"

    try:
        cfg = await cloud_llm_sync.get_active_config(config_type="voice")
    except Exception as e:
        return {"success": False, "message": f"取语音配置失败: {e}"}
    if not cfg:
        return {"success": False, "message": "未配置语音模型,请先在大模型配置的「语音」里添加并设为默认"}

    log_id = None
    try:
        log_id = await LogService.create_log(
            task_type="voice_preview",
            model=cfg.get("modelName") or "",
            config_name=cfg.get("name") or "",
            base_url=cfg.get("baseUrl") or "",
            input_prompt=f"[voice={voice_id}] {text}",
            provider_code=cfg.get("providerCode") or "",
            novel_id=novel_id,
            source_id=element_id,
            source_type="extracted_element:character",
        )
    except Exception as e:
        logger.warning("[voice] 建日志失败(忽略): %s", e)

    try:
        audio = await _route_synthesize(cfg, voice_id, text)
    except Exception as e:
        msg = f"语音合成失败: {e}"
        logger.warning("[voice] %s", msg)
        if log_id:
            try:
                await LogService.update_log_error(log_id=log_id, error_message=msg)
            except Exception:
                pass
        return {"success": False, "message": msg}

    # 存盘:demo 走全局 voice 缓存目录;自定义文案走 {小说}/音频/试听_{角色}_{voice}.mp3
    if is_demo:
        rel = cache_rel
    else:
        novel_part = ImageService._safe_name_part(novel_name, 24) or "未命名小说"
        char_part = ImageService._safe_name_part(character_name, 24) or f"角色{element_id}"
        rel = f"{novel_part}/音频/试听_{char_part}_{voice_part}.mp3"
    try:
        images_dir = media_subdir("images")
        abs_path = os.path.join(images_dir, rel)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "wb") as f:
            f.write(audio)
    except Exception as e:
        msg = f"试听音频写盘失败: {e}"
        logger.warning("[voice] %s", msg)
        if log_id:
            try:
                await LogService.update_log_error(log_id=log_id, error_message=msg)
            except Exception:
                pass
        return {"success": False, "message": msg}

    audio_url = f"/data/images/{rel}"
    if log_id:
        try:
            await LogService.update_log_success(log_id=log_id, output_content=audio_url)
        except Exception:
            pass
    return {"success": True, "audio_url": audio_url}
