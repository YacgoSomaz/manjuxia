import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from database import db
from database.db import get_db, init_db
from services.template_service import get_all, get_by_id
from services.wanshan_prompt_seed import seed_prompt_templates


class PromptSeedMigrationTest(unittest.TestCase):
    def test_old_storyboard_presets_are_replaced_and_sorted(self):
        with tempfile.TemporaryDirectory(prefix="wanshan-prompt-migration-") as tmp:
            old_path = db.DB_PATH
            db.DB_PATH = str(Path(tmp) / "app.db")
            try:
                asyncio.run(self._exercise_seed())
            finally:
                db.DB_PATH = old_path

    async def _exercise_seed(self):
        await init_db()
        connection = await get_db()
        await connection.execute(
            "INSERT INTO prompt_templates (name, category, content, is_preset) VALUES (?, ?, ?, 1)",
            ("旧版勿用-测试模板", "storyboard_generation", "old"),
        )
        await connection.commit()
        await connection.close()

        with patch("services.wanshan_prompt_seed._embedded_templates", return_value=None):
            await seed_prompt_templates()

        rows = await get_all("storyboard_generation")
        self.assertEqual(
            [row["qianshan_id"] for row in rows],
            list(range(23, 52)) + [62],
        )
        self.assertTrue(all(not row["content"] for row in rows))

        full = await get_by_id(rows[0]["id"])
        self.assertGreater(len(full["content"]), 1000)
        self.assertIsNone(full["admin_id"])

        connection = await get_db()
        cursor = await connection.execute(
            "SELECT COUNT(*) AS count FROM prompt_templates WHERE name = ?",
            ("旧版勿用-测试模板",),
        )
        self.assertEqual((await cursor.fetchone())["count"], 0)
        await connection.close()


if __name__ == "__main__":
    unittest.main()
