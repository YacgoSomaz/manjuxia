import os
import tempfile
import unittest


class QianshanSchemaCompatTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        os.environ["WANSHAN_DATA_DIR"] = self.tmpdir.name

    async def asyncTearDown(self):
        self.tmpdir.cleanup()
        os.environ.pop("WANSHAN_DATA_DIR", None)

    async def test_init_db_adds_qianshan_compat_columns_and_queue_index(self):
        from database.db import get_db, init_db

        await init_db()
        db = await get_db()
        try:
            expected_columns = {
                "scripts": {"sync_outdated"},
                "extracted_elements": {"voice_id"},
                "storyboards": {
                    "topview_image",
                    "topview_prompt",
                    "topview_start_prompt",
                    "topview_end_prompt",
                    "topview_dispatch_text",
                    "start_frame_image",
                    "end_frame_image",
                },
            }
            for table, columns in expected_columns.items():
                cur = await db.execute(f"PRAGMA table_info({table})")
                actual = {row["name"] for row in await cur.fetchall()}
                self.assertTrue(columns <= actual, f"{table} missing {columns - actual}")

            cur = await db.execute(
                "SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_queue_active_storyboard_unique'"
            )
            row = await cur.fetchone()
            self.assertIsNotNone(row)
            self.assertIn("WHERE status IN ('queued','generating')", row["sql"])
        finally:
            await db.close()


if __name__ == "__main__":
    unittest.main()
