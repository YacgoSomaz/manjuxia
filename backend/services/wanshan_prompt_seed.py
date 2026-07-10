import json
import logging
import os

from database.db import get_db
from utils.paths import get_data_dir
from utils.timezone import now_beijing_str


logger = logging.getLogger(__name__)


def _seed_file_path() -> str:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(backend_dir, "data", "wanshan_prompt_seed.json")


async def seed_prompt_templates() -> int:
    """Seed bundled prompt templates into the local SQLite database.

    This is local-only. It intentionally avoids the original cloud template
    sync path so 万山 can start without license state or outbound requests.
    """
    path = _seed_file_path()
    if not os.path.exists(path):
        logger.warning("[wanshan_prompt_seed] seed file missing: %s", path)
        return 0

    with open(path, "r", encoding="utf-8") as f:
        templates = json.load(f)

    db = await get_db()
    changed = 0
    try:
        for tpl in templates:
            name = (tpl.get("name") or "").strip()
            category = (tpl.get("category") or "uncategorized").strip()
            content = tpl.get("content") or ""
            if not name or not content:
                continue

            variables = tpl.get("variables") or "[]"
            genres = tpl.get("genres") or "[]"
            description = tpl.get("description") or ""
            now = now_beijing_str()

            cursor = await db.execute(
                "SELECT id, content FROM prompt_templates WHERE name = ? AND category = ? LIMIT 1",
                (name, category),
            )
            row = await cursor.fetchone()
            if row:
                if row["content"] != content:
                    await db.execute(
                        """
                        UPDATE prompt_templates
                        SET content = ?, variables = ?, description = ?, is_preset = 1,
                            genres = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (content, variables, description, genres, now, row["id"]),
                    )
                    changed += 1
                continue

            await db.execute(
                """
                INSERT INTO prompt_templates
                    (name, category, content, variables, description, is_preset, genres, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
                """,
                (name, category, content, variables, description, genres, now, now),
            )
            changed += 1

        await db.commit()
        logger.info("[wanshan_prompt_seed] local templates ready: %s changed", changed)
        return changed
    finally:
        await db.close()

