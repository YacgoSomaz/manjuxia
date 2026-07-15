import unittest
from unittest.mock import AsyncMock, patch

from api.novels import NovelTagsUpdateRequest, update_novel_tags
from services.tag_service import TagService


class NovelTagSaveTests(unittest.IsolatedAsyncioTestCase):
    async def test_partial_tags_can_be_saved_before_conversion_ready(self):
        saved_tags = [
            {
                "code": "audience_general",
                "label": "通用",
                "dimension": "audience",
                "score": 1.0,
                "source": "manual",
                "evidence": "",
            }
        ]

        with patch("api.novels.NovelService.get_by_id", AsyncMock(return_value={"id": 7})), \
             patch("api.novels.TagService.save_novel_tags", AsyncMock(return_value=saved_tags)) as save_mock:
            result = await update_novel_tags(
                7,
                NovelTagsUpdateRequest(tags=[
                    {"code": "audience_general", "label": "通用", "dimension": "audience"}
                ]),
            )

        self.assertEqual(result["tags"], saved_tags)
        self.assertEqual(result["missing_required_tags"], ["屏幕模式", "视觉标签"])
        save_mock.assert_awaited_once()

    async def test_tag_analysis_prefers_deepseek_config(self):
        selected = TagService.select_analysis_config([
            {"id": 9, "name": "通用配置", "base_url": "https://example.com/v1", "model_name": "gpt-like", "config_type": "llm"},
            {"id": 8, "name": "DeepSeek-标签分析", "base_url": "https://api.deepseek.com/v1", "model_name": "deepseek-chat", "config_type": "llm"},
            {"id": 10, "name": "图片配置", "base_url": "https://api.deepseek.com/v1", "model_name": "deepseek-chat", "config_type": "image"},
        ])

        self.assertIsNotNone(selected)
        self.assertEqual(selected["id"], 8)


if __name__ == "__main__":
    unittest.main()
