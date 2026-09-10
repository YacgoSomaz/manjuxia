import os
import sys
import unittest


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.storyboard_service import StoryboardService, _dedupe_start_state_blocks


class StoryboardSectionParserTests(unittest.TestCase):
    def test_start_state_dedupe_drops_inline_copy_when_standard_block_exists(self):
        lines = [
            "场景起始状态:",
            "  裴砚之 = 坐于椅上",
            "  沈昭昭 = 站在画面左侧",
            "场景起始状态:角色=裴砚之/角色=沈昭昭",
            "本节叙事目标:继续上药",
        ]

        output = _dedupe_start_state_blocks(lines)

        self.assertEqual(output.count("场景起始状态:"), 1)
        self.assertNotIn("场景起始状态:角色=裴砚之/角色=沈昭昭", output)
        self.assertIn("本节叙事目标:继续上药", output)

    def test_start_state_dedupe_keeps_legacy_inline_when_it_is_the_only_state(self):
        lines = [
            "场景起始状态:角色=裴砚之/角色=沈昭昭",
            "本节叙事目标:继续上药",
        ]

        self.assertEqual(_dedupe_start_state_blocks(lines), lines)

    def test_start_state_dedupe_still_keeps_last_standard_block(self):
        lines = [
            "场景起始状态:",
            "  裴砚之 = 旧状态",
            "场景起始状态:",
            "  裴砚之 = 新状态",
            "本节叙事目标:继续上药",
        ]

        output = _dedupe_start_state_blocks(lines)

        self.assertNotIn("  裴砚之 = 旧状态", output)
        self.assertIn("  裴砚之 = 新状态", output)

    def test_inline_shot_audit_is_not_a_real_shot_marker(self):
        summary_only = (
            "【内 西山别院 日 · 关系翻面 · 8.0秒】\n\n"
            "【全片人声与时长预排总账】"
            "镜头1完成控制端收紧，镜头2完成警告，镜头3完成关系翻面"
        )

        self.assertFalse(StoryboardService._has_shot_marker(summary_only))

    def test_real_shot_line_formats_are_still_accepted(self):
        samples = (
            "镜头1｜00:00.0-00:01.8｜中近景",
            "  镜号 2：人物抬眼",
            "### Shot 3 (2.0秒): reaction",
            "- 镜4：绳索收紧",
        )

        for sample in samples:
            with self.subTest(sample=sample):
                self.assertTrue(StoryboardService._has_shot_marker(sample))

    def test_conflict_report_is_not_wrapped_as_a_storyboard_section(self):
        response = (
            "前5秒人声钩子冲突｜缺失人声区间=00:00.0-00:05.0，"
            "剧本锁定“无对白、无OS、无字卡”，无法形成2至3镜逐镜有效人声覆盖｜"
            "需上游调整=允许画外OS"
        )

        sections = StoryboardService._parse_sections_from_response(response)

        self.assertEqual(sections, [])
        message = StoryboardService._build_no_storyboard_error_message(response)
        self.assertIn("模板规则与当前场景冲突", message)
        self.assertIn("无对白、无OS、无字卡", message)

    def test_repeated_scene_header_drops_summary_shell(self):
        header = "【内 西山别院·临水竹梅暖阁 日 · 关系翻面 · 8.0秒】"
        response = (
            f"{header}\n\n"
            "【全片人声与时长预排总账】"
            "镜头1完成控制端收紧，镜头2完成警告，镜头3完成验手\n\n"
            f"{header}\n"
            "【本节光影基准】白日午后\n\n"
            "镜头1｜00:00.0-00:03.0｜中近景\n"
            "画面内容：裴砚之收紧绳索。\n\n"
            "镜头2｜00:03.0-00:08.0｜近景\n"
            "画面内容：沈昭昭停住。\n\n"
            "📏 本小节总时长:8.0秒"
        )

        sections = StoryboardService._parse_text_sections(response)

        self.assertEqual(len(sections), 1)
        self.assertIn("镜头1｜00:00.0-00:03.0", sections[0]["full_text"])
        self.assertNotIn("全片人声与时长预排总账", sections[0]["full_text"])


if __name__ == "__main__":
    unittest.main()
