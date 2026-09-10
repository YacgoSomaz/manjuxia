import json
import unittest
from unittest.mock import AsyncMock, patch

from services.novel_service import NovelService
from services import parser_rule_service


class ChapterSplitTests(unittest.TestCase):
    def test_single_bracketed_episode_is_recognized_for_script_import(self):
        content = "【第1集 魂穿】\n\n场景1 林晚的高级公寓 夜 内\n\n林晚推开门。"

        chapters = NovelService._split_chapters_from_content(
            content,
            allow_single_explicit=True,
            fallback_to_chunks=True,
            mode="script_import",
        )

        self.assertEqual(1, len(chapters))
        self.assertEqual("第1集: 魂穿", chapters[0]["title"])
        self.assertIn("林晚推开门", chapters[0]["content"])

    def test_single_marker_is_not_forced_for_normal_novel_import(self):
        content = "【第1集 魂穿】\n\n这只是小说正文里偶然出现的一行。"

        chapters = NovelService._split_chapters_from_content(
            content,
            allow_single_explicit=False,
            fallback_to_chunks=True,
            mode="import",
        )

        self.assertEqual(1, len(chapters))
        self.assertEqual("第1部分", chapters[0]["title"])

    def test_admin_rule_supports_named_groups_and_custom_format(self):
        content = (
            "@@ EPISODE 7 / 雨夜 @@\n第一集正文。\n\n"
            "@@ EPISODE 8 / 追凶 @@\n第二集正文。"
        )
        rules = [
            {
                "name": "custom_episode",
                "priority": 1,
                "type": "regex",
                "pattern": r"(?:^|\n)@@\s*EPISODE\s*(?P<number>\d+)\s*/\s*(?P<title>[^@\n]+)\s*@@",
                "number_group": "number",
                "title_group": "title",
                "title_template": "第{number}集: {title}",
                "min_matches": 2,
                "modes": ["script_import"],
            }
        ]

        chapters = NovelService._split_chapters_from_content(
            content,
            custom_rules=rules,
            fallback_to_chunks=False,
            mode="script_import",
        )

        self.assertEqual(["第7集: 雨夜", "第8集: 追凶"], [item["title"] for item in chapters])
        self.assertIn("第一集正文", chapters[0]["content"])
        self.assertIn("第二集正文", chapters[1]["content"])

    def test_invalid_admin_regex_falls_back_to_builtin_rule(self):
        content = "【第1集 开端】\n正文一。\n【第2集 反转】\n正文二。"
        chapters = NovelService._split_chapters_from_content(
            content,
            custom_rules=[{"name": "broken", "pattern": "(["}],
            fallback_to_chunks=False,
            mode="script_import",
        )

        self.assertEqual(["第1集: 开端", "第2集: 反转"], [item["title"] for item in chapters])

    def test_admin_rule_mode_scope_is_respected(self):
        content = "@@ EPISODE 1 / 开端 @@\n正文。"
        rules = [
            {
                "name": "script_only",
                "pattern": r"(?:^|\n)@@\s*EPISODE\s*(\d+)\s*/\s*([^@\n]+)\s*@@",
                "min_matches": 1,
                "modes": ["script_import"],
            }
        ]

        chapters = NovelService._split_chapters_from_content(
            content,
            custom_rules=rules,
            fallback_to_chunks=False,
            mode="import",
        )

        self.assertEqual([], chapters)


class ParserRuleServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        parser_rule_service.clear_cache()

    async def asyncTearDown(self):
        parser_rule_service.clear_cache()

    async def test_admin_fetch_tuple_is_decoded(self):
        payload = {
            "rules": [
                {"name": "later", "priority": 20, "pattern": "b"},
                {"name": "first", "priority": 10, "pattern": "a"},
            ]
        }
        with patch.object(
            parser_rule_service,
            "_fetch_content_from_admin",
            new=AsyncMock(return_value=(88, json.dumps(payload))),
        ):
            rules = await parser_rule_service.get_rules("chapter_split")

        self.assertEqual(["first", "later"], [rule["name"] for rule in rules])


if __name__ == "__main__":
    unittest.main()
