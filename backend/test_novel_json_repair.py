import unittest

from services.novel_creation_service import _extract_json


class NovelJsonRepairTests(unittest.TestCase):
    def test_repairs_missing_object_closer_before_array_end(self):
        raw = """```json
{"chapters":[{"title":"第1章","summary":"暴雨车站"
]}
```"""
        parsed = _extract_json(raw)
        self.assertEqual(parsed["chapters"][0]["title"], "第1章")

    def test_keeps_valid_fenced_json_unchanged(self):
        parsed = _extract_json('```json\n{"chapters": []}\n```')
        self.assertEqual(parsed, {"chapters": []})

    def test_escapes_raw_control_character_inside_json_string(self):
        raw = "```json\n{\"story_summary\":\"第一行\n第二行\",\"chapters\":[]}\n```"
        parsed = _extract_json(raw)
        self.assertEqual(parsed["story_summary"], "第一行\n第二行")

    def test_treats_curly_quote_before_json_delimiter_as_string_closer(self):
        raw = '```json\n{"scenes":[{"description":"夜雨中的车站。”}]}\n```'
        parsed = _extract_json(raw)
        self.assertEqual(parsed["scenes"][0]["description"], "夜雨中的车站。")


if __name__ == "__main__":
    unittest.main()
