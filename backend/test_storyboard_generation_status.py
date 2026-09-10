import os
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

import aiosqlite


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from api.storyboards import get_generation_status
from services.log_service import LogService
from services.storyboard_service import StoryboardService


class StoryboardGenerationStatusTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        handle, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "CREATE TABLE llm_logs ("
            "id INTEGER PRIMARY KEY, status TEXT, source_type TEXT, source_id INTEGER, "
            "novel_id INTEGER, source_scene_index INTEGER, error_message TEXT, "
            "output_content TEXT, created_at TEXT)"
        )
        conn.execute(
            "CREATE TABLE storyboards ("
            "id INTEGER PRIMARY KEY, novel_id INTEGER, script_id INTEGER, scene_index INTEGER)"
        )
        conn.commit()
        conn.close()

    def tearDown(self):
        try:
            os.remove(self.db_path)
        except FileNotFoundError:
            pass

    async def _get_db(self):
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        return db

    def _insert_success_conflict_log(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT INTO llm_logs VALUES(1, 'success', 'storyboard', 20, 10, 3, NULL, ?, '2026-08-02 12:00:00')",
            (
                "前5秒人声钩子冲突，剧本锁定无对白、无OS，"
                "无法形成有效人声覆盖，需上游调整",
            ),
        )
        conn.commit()
        conn.close()

    async def test_success_log_without_storyboard_is_corrected_to_error(self):
        self._insert_success_conflict_log()
        with (
            patch("api.storyboards.get_db", new=self._get_db),
            patch.object(
                StoryboardService,
                "recover_from_log",
                new=AsyncMock(return_value=False),
            ),
            patch.object(
                LogService,
                "update_log_error",
                new=AsyncMock(),
            ) as update_error,
            patch("api.storyboards.get_running_task_scene_indices", return_value=[]),
        ):
            result = await get_generation_status(10, 20, 293)

        self.assertEqual(result["scenes"][0]["status"], "error")
        self.assertIn("模板规则与当前场景冲突", result["scenes"][0]["error_message"])
        update_error.assert_awaited_once()

    async def test_active_regeneration_overrides_previous_success_status(self):
        self._insert_success_conflict_log()
        with (
            patch("api.storyboards.get_db", new=self._get_db),
            patch.object(
                StoryboardService,
                "recover_from_log",
                new=AsyncMock(),
            ) as recover,
            patch("api.storyboards.get_running_task_scene_indices", return_value=[3]),
        ):
            result = await get_generation_status(10, 20, 293)

        self.assertEqual(result["scenes"][0]["status"], "running")
        self.assertTrue(result["scenes"][0]["active_task"])
        recover.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
