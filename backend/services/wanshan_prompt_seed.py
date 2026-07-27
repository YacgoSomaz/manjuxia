import json
import logging
import os
import json

from database.db import get_db
from utils.paths import get_data_dir
from utils.timezone import now_beijing_str


logger = logging.getLogger(__name__)


def _normalize_template_payload(payload):
    """Accept both the exported {"templates": [...]} form and a raw list."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("templates"), list):
        return payload["templates"]
    return None

MANDATORY_LOCAL_TEMPLATES = [
    {
        "name": "角色提取模板（新版高度适配gtp-image2）",
        "category": "character_extraction",
        "description": "从剧本中提取所有出场人物，输出标签化的简洁结构化描述，便于 AI 生图。",
        "variables": "[]",
        "genres": "[]",
        "content": """你是专业短剧资产整理师。请从下面剧本内容中提取需要出镜或需要保持连续性的主要人物。

输出要求：
1. 只输出 JSON 数组，不要解释，不要 Markdown。
2. 每个对象必须包含 name、description、attributes。
3. name 使用剧本中的稳定角色名。
4. description 写成可用于 AI 生图的角色档案，包含性别、年龄感、外貌、发型、服装、气质、身份、关键辨识物。
5. attributes 至少包含 gender、age_range、identity、personality。
6. 合并同一人物的重复称呼，忽略路人、群演和纯称谓。

示例格式：
[
  {
    "name": "林晚",
    "description": "二十多岁女性，清瘦苍白，长黑发，穿素色连衣裙，气质隐忍克制，眼神带疲惫和倔强，是被豪门压迫的女主。",
    "attributes": {"gender":"女","age_range":"20-30","identity":"女主","personality":"隐忍、倔强"}
  }
]

以下是需要分析的剧本内容：
{script_content}
""",
    },
    {
        "name": "场景提取模板",
        "category": "scene_extraction",
        "description": "根据提供的原始资料，提取文中出现过的场景信息，输出JSON数组。",
        "variables": "[]",
        "genres": "[]",
        "content": """你是专业短剧美术资产整理师。请从下面剧本内容中提取需要反复出现或适合做背景图的场景。

输出要求：
1. 只输出 JSON 数组，不要解释，不要 Markdown。
2. 每个对象必须包含 name、description、attributes。
3. name 用简短稳定的场景名。
4. description 写成可用于 AI 生图的场景描述，包含内外景、时间、空间结构、光线、氛围、关键陈设。
5. 场景描述不要写人物，避免背景图夹带人物。
6. attributes 至少包含 location_type、time、mood。

示例格式：
[
  {
    "name": "顾家客厅",
    "description": "现代豪门别墅客厅，挑高空间，冷色大理石地面，水晶吊灯，深色真皮沙发，落地窗外是夜雨，整体压抑冷峻，不出现人物。",
    "attributes": {"location_type":"内景","time":"夜","mood":"压抑、冷峻"}
  }
]

以下是需要分析的剧本内容：
{script_content}
""",
    },
    {
        "name": "道具提取模板",
        "category": "prop_extraction",
        "description": "从小说中提取所有道具和物品信息",
        "variables": "[]",
        "genres": "[]",
        "content": """你是专业短剧道具资产整理师。请从下面剧本内容中提取对剧情、身份、线索或视觉连续性有意义的关键道具。

输出要求：
1. 只输出 JSON 数组，不要解释，不要 Markdown。
2. 每个对象必须包含 name、description、attributes。
3. 忽略普通无意义物品，只保留有剧情价值或需要视觉统一的道具。
4. description 写成可用于 AI 生图的道具描述，包含材质、颜色、形状、状态、特殊标记、用途。
5. attributes 至少包含 category、material、significance。

示例格式：
[
  {
    "name": "旧婚戒",
    "description": "一枚磨损的银色婚戒，戒圈内侧有细小刻字，边缘有轻微划痕，象征破裂婚姻和旧日承诺。",
    "attributes": {"category":"首饰","material":"银色金属","significance":"婚姻信物"}
  }
]

以下是需要分析的剧本内容：
{script_content}
""",
    },
    {
        "name": "通用风格提示词",
        "category": "style_prompt",
        "description": "适用于分镜和视频生成的通用电影感风格",
        "variables": "[]",
        "genres": "[]",
        "content": "电影级写实质感，真实自然光影，低饱和高级色彩，人物表演克制细腻，画面干净稳定，4K，浅景深，轻微胶片颗粒，避免夸张滤镜和塑料感。",
    },
    {
        "name": "宫格图提示词模板(通用)",
        "category": "grid_image",
        "description": "把单张资产图扩展为多角度宫格图",
        "variables": "[]",
        "genres": "[]",
        "content": """请根据素材描述和参考图，生成适合角色/场景/道具资产管理的多角度宫格图提示词。

要求：
1. 保持主体身份、服装、材质、颜色和关键特征一致。
2. 输出一段可直接用于生图模型的中文提示词。
3. 不要输出 JSON，不要解释。
4. 如果是人物，包含正面、侧面、背面、半身、表情变化。
5. 如果是场景，包含整体、局部、入口、关键陈设、不同视角，且不要出现人物。
6. 如果是道具，包含正面、侧面、背面、细节特写、比例参考。

素材描述：
{description}
""",
    },
]


def _embedded_templates():
    try:
        from services.wanshan_prompt_seed_embedded import load_templates
    except Exception:
        return None
    try:
        return _normalize_template_payload(load_templates())
    except Exception as exc:
        logger.warning("[wanshan_prompt_seed] embedded seed unavailable: %s", exc)
        return None


def _seed_file_path() -> str:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(backend_dir, "data", "wanshan_prompt_seed.json")


async def seed_prompt_templates() -> int:
    """Seed bundled prompt templates into the local SQLite database.

    This is local-only. It intentionally avoids the original cloud template
    sync path so 万山 can start without license state or outbound requests.
    """
    templates = _embedded_templates()
    if templates is None:
        path = _seed_file_path()
        if not os.path.exists(path):
            logger.warning("[wanshan_prompt_seed] seed file missing: %s", path)
            templates = []
        else:
            with open(path, "r", encoding="utf-8") as f:
                templates = _normalize_template_payload(json.load(f)) or []

    templates = list(templates)

    categories_with_content = {
        (tpl.get("category") or "uncategorized").strip()
        for tpl in templates
        if (tpl.get("content") or "").strip()
    }
    suppressed_fallbacks = []
    for tpl in MANDATORY_LOCAL_TEMPLATES:
        category = (tpl.get("category") or "uncategorized").strip()
        if category not in categories_with_content:
            templates.append(tpl)
            categories_with_content.add(category)
        else:
            suppressed_fallbacks.append(((tpl.get("name") or "").strip(), category))

    db = await get_db()
    changed = 0
    try:
        storyboard_names = {
            (tpl.get("name") or "").strip()
            for tpl in templates
            if (tpl.get("category") or "").strip() == "storyboard_generation"
            and (tpl.get("content") or "").strip()
        }
        # 清理旧预置分镜：不触碰用户自建模板，只移除不再属于当前
        # 千山 ID 清洗版的 preset 行，避免旧行在数据库中继续污染选择器。
        if storyboard_names:
            placeholders = ",".join("?" for _ in storyboard_names)
            cursor = await db.execute(
                f"DELETE FROM prompt_templates WHERE category = 'storyboard_generation' "
                f"AND is_preset = 1 AND name NOT IN ({placeholders})",
                tuple(sorted(storyboard_names)),
            )
            if cursor.rowcount:
                changed += cursor.rowcount

        for name, category in suppressed_fallbacks:
            if not name:
                continue
            cursor = await db.execute(
                "DELETE FROM prompt_templates WHERE name = ? AND category = ? AND is_preset = 1",
                (name, category),
            )
            if cursor.rowcount:
                changed += cursor.rowcount

        for tpl in templates:
            name = (tpl.get("name") or "").strip()
            category = (tpl.get("category") or "uncategorized").strip()
            content = tpl.get("content") or ""
            if not name or not content:
                continue

            variables = tpl.get("variables") or "[]"
            genres = tpl.get("genres") or "[]"
            tags = tpl.get("tags") or "[]"
            screen_mode = tpl.get("screen_mode") or ""
            admin_id = tpl.get("admin_id")
            description = tpl.get("description") or ""
            now = now_beijing_str()

            if isinstance(variables, (list, tuple, dict)):
                variables = json.dumps(variables, ensure_ascii=False)
            if isinstance(genres, (list, tuple, dict)):
                genres = json.dumps(genres, ensure_ascii=False)
            if isinstance(tags, (list, tuple, dict)):
                tags = json.dumps(tags, ensure_ascii=False)

            cursor = await db.execute(
                "SELECT id, content, admin_id, tags, screen_mode, qianshan_id, source, sort_order "
                "FROM prompt_templates WHERE name = ? AND category = ? LIMIT 1",
                (name, category),
            )
            row = await cursor.fetchone()
            if row:
                if (
                    row["content"] != content
                    or row["admin_id"] != admin_id
                    or (row["tags"] or "[]") != tags
                    or (row["screen_mode"] or "") != screen_mode
                    or row["qianshan_id"] != tpl.get("qianshan_id")
                    or (row["source"] or "") != (tpl.get("source") or "")
                    or (row["sort_order"] or 10000) != int(tpl.get("sort_order") or 10000)
                ):
                    await db.execute(
                        """
                        UPDATE prompt_templates
                        SET content = ?, variables = ?, description = ?, is_preset = 1,
                            genres = ?, tags = ?, screen_mode = ?, admin_id = ?,
                            qianshan_id = ?, source = ?, sort_order = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (
                            content, variables, description, genres, tags, screen_mode, admin_id,
                            tpl.get("qianshan_id"), tpl.get("source") or "",
                            int(tpl.get("sort_order") or 10000), now, row["id"],
                        ),
                    )
                    changed += 1
                continue

            await db.execute(
                """
                INSERT INTO prompt_templates
                    (name, category, content, variables, description, is_preset, genres, tags, screen_mode,
                     admin_id, qianshan_id, source, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name, category, content, variables, description, genres, tags, screen_mode, admin_id,
                    tpl.get("qianshan_id"), tpl.get("source") or "",
                    int(tpl.get("sort_order") or 10000), now, now,
                ),
            )
            changed += 1

        await db.commit()
        logger.info("[wanshan_prompt_seed] local templates ready: %s changed", changed)
        return changed
    finally:
        await db.close()
