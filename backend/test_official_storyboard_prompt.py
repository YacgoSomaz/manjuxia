import os
import sys
import unittest


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from api.storyboards import OfficialStoryboardSectionRequest, _expand_official_storyboard_prompt


class OfficialStoryboardPromptTests(unittest.TestCase):
    def make_request(self, **overrides):
        values = {
            "novel_id": 7,
            "template_id": 14,
            "script_id": 9,
            "scene_content": "【内 宴会厅 夜】\nA：第一句。\nB：第二句。",
            "scene_title": "宴会厅",
            "section_number": 1,
            "with_character_state": True,
        }
        values.update(overrides)
        return OfficialStoryboardSectionRequest(**values)

    def test_no_placeholder_uses_original_github_appendix_only(self):
        prompt = _expand_official_storyboard_prompt(
            {"content": "完整 Markdown 模板", "variables": "[]"},
            self.make_request(),
        )

        self.assertEqual(
            prompt,
            "完整 Markdown 模板\n\n以下是需要转换为分镜的剧本内容：\n\n"
            "【内 宴会厅 夜】\nA：第一句。\nB：第二句。",
        )
        self.assertNotIn("JSON 数组", prompt)
        self.assertNotIn("服务端会按模板规则回算", prompt)

    def test_defined_variable_replacement_matches_original_request(self):
        prompt = _expand_official_storyboard_prompt(
            {"content": "模板正文\n{script_content}", "variables": '["script_content"]'},
            self.make_request(scene_content="完整四句剧本"),
        )

        self.assertEqual(prompt, "模板正文\n完整四句剧本")

    def test_no_state_switch_keeps_original_override(self):
        prompt = _expand_official_storyboard_prompt(
            {"content": "模板", "variables": "[]"},
            self.make_request(with_character_state=False),
        )

        self.assertIn("严禁输出任何人物状态块", prompt)
        self.assertNotIn("JSON 数组", prompt)


if __name__ == "__main__":
    unittest.main()
