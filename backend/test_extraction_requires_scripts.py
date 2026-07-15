import unittest
from unittest.mock import AsyncMock, patch

from services.extraction_service import ExtractionService
from services.novel_service import NovelService


class _FakeCursor:
    async def fetchall(self):
        return []


class _FakeDb:
    async def execute(self, *args, **kwargs):
        return _FakeCursor()

    async def commit(self):
        return None

    async def close(self):
        return None


class ExtractionRequiresScriptsTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_missing_scripts_returns_actionable_failure(self):
        missing_script = ValueError("章节 第1章 尚未转换为剧本，请先进行剧本转换")
        with patch.object(
            NovelService,
            "get_chapters",
            AsyncMock(return_value=[{"id": 1}, {"id": 2}]),
        ), patch.object(
            ExtractionService,
            "extract_from_chapter",
            AsyncMock(side_effect=[missing_script, missing_script]),
        ), patch(
            "services.extraction_service.get_db",
            AsyncMock(return_value=_FakeDb()),
        ):
            result = await ExtractionService.extract_all(
                novel_id=7,
                element_type="character",
                template_id=1,
                llm_config_id=1,
            )

        self.assertFalse(result["success"])
        self.assertEqual(result["code"], "SCRIPT_REQUIRED")
        self.assertEqual(result["count"], 0)
        self.assertIn("请先到「剧本转换」生成剧本", result["message"])


if __name__ == "__main__":
    unittest.main()
