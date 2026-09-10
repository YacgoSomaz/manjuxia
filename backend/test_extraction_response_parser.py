import json
import unittest
from unittest.mock import AsyncMock, patch

from services.extraction_service import ExtractionService


class ExtractionResponseParserTests(unittest.TestCase):
    def test_standard_array_keeps_aliases(self):
        response = json.dumps([
            {
                "name": "沈昭昭",
                "aliases": "昭昭, 沈姑娘",
                "description": "年轻女子，圆眼，古装。",
            }
        ], ensure_ascii=False)

        result = ExtractionService._parse_llm_response(response, "character")

        self.assertEqual(result[0]["name"], "沈昭昭")
        self.assertEqual(result[0]["aliases"], ["昭昭", "沈姑娘"])

    def test_aggregate_response_selects_characters_for_character_extraction(self):
        response = """```json
        {
          "scenes": [{"location": "西山别院暖阁", "environment": "雨后初晴"}],
          "characters": [
            {
              "name": "沈昭昭",
              "identity": "裴明珠的闺蜜",
              "personality": "古灵精怪",
              "actions_and_emotions": "误绑裴砚之后心虚逃跑"
            },
            {
              "name": "裴砚之",
              "identity": "世子",
              "personality": "冷静沉稳"
            }
          ],
          "key_props": [{"name": "暗朱绳", "function": "核心互动道具"}]
        }
        ```"""

        result = ExtractionService._parse_llm_response(response, "character")

        self.assertEqual([item["name"] for item in result], ["沈昭昭", "裴砚之"])
        self.assertIn("身份：裴明珠的闺蜜", result[0]["description"])

    def test_aggregate_response_maps_scene_location_and_environment(self):
        response = json.dumps({
            "scenes": [{
                "location": "西山别院·临水竹梅暖阁",
                "time": "日",
                "environment": "雨后初晴，溪水缓流",
            }]
        }, ensure_ascii=False)

        result = ExtractionService._parse_llm_response(response, "scene")

        self.assertEqual(result[0]["name"], "西山别院·临水竹梅暖阁")
        self.assertIn("环境：雨后初晴，溪水缓流", result[0]["description"])

    def test_aggregate_response_maps_key_props(self):
        response = json.dumps({
            "key_props": [{"name": "黑金令牌", "function": "身份证明道具"}]
        }, ensure_ascii=False)

        result = ExtractionService._parse_llm_response(response, "prop")

        self.assertEqual(result[0]["name"], "黑金令牌")
        self.assertEqual(result[0]["description"], "作用：身份证明道具")

    def test_nonempty_unrecognizable_list_fails_instead_of_fake_success(self):
        with self.assertRaisesRegex(ValueError, "缺少可识别"):
            ExtractionService._parse_llm_response(
                '[{"scene_number":"1-1","time":"日"}]',
                "character",
            )

    def test_invalid_json_fails_instead_of_creating_placeholder_element(self):
        with self.assertRaisesRegex(ValueError, "不是有效 JSON"):
            ExtractionService._parse_llm_response("这不是 JSON", "character")


class ExtractionFlowTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_failed_chapters_return_failure_instead_of_success_zero(self):
        with (
            patch(
                "services.extraction_service.NovelService.get_chapters",
                new=AsyncMock(return_value=[{"id": 1}]),
            ),
            patch.object(
                ExtractionService,
                "extract_from_chapter",
                new=AsyncMock(side_effect=ValueError("模板内容获取失败")),
            ),
        ):
            result = await ExtractionService.extract_all(
                novel_id=1,
                element_type="character",
                template_id=216,
                llm_config_id=1,
            )

        self.assertFalse(result["success"])
        self.assertEqual(result["code"], "EXTRACTION_FAILED")
        self.assertEqual(result["total_unique"], 0)
        self.assertIn("模板内容获取失败", result["message"])


if __name__ == "__main__":
    unittest.main()
