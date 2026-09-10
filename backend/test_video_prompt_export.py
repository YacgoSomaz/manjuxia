import os
import sys
import unittest


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from api.video import (
    VideoPromptExportItem,
    VideoPromptExportRequest,
    _extract_start_state_from_prompt,
    _format_video_prompt_export_block,
    _strip_inline_start_state_duplicate,
    _strip_llm_metadata,
)


class VideoPromptExportTests(unittest.TestCase):
    def test_standard_and_inline_states_become_one_state_in_final_prompt(self):
        raw_prompt = (
            "场景起始状态:\n"
            "  裴砚之 = 坐于椅上\n"
            "  沈昭昭 = 站在画面左侧\n"
            "场景起始状态:角色=裴砚之/角色=沈昭昭\n"
            "本节叙事目标:继续上药\n"
            "镜头1｜00:00.0-00:02.0｜近景"
        )

        start_state = _extract_start_state_from_prompt(raw_prompt)
        stripped = _strip_llm_metadata(raw_prompt)
        stripped = _strip_inline_start_state_duplicate(stripped)
        final_prompt = start_state + "\n" + stripped

        self.assertEqual(final_prompt.count("场景起始状态:"), 1)
        self.assertNotIn("场景起始状态:角色=", final_prompt)
        self.assertIn("本节叙事目标:继续上药", final_prompt)
        self.assertIn("镜头1｜00:00.0-00:02.0｜近景", final_prompt)

    def test_strips_legacy_inline_start_state_without_touching_following_fields(self):
        prompt = (
            "场景起始状态:角色=裴砚之/角色=沈昭昭\n"
            "本节叙事目标:继续上药\n"
            "镜头1｜00:00.0-00:02.0｜近景"
        )

        output = _strip_inline_start_state_duplicate(prompt)

        self.assertNotIn("场景起始状态:角色=", output)
        self.assertIn("本节叙事目标:继续上药", output)
        self.assertIn("镜头1｜00:00.0-00:02.0｜近景", output)

    def test_inline_strip_does_not_match_plain_discussion_text(self):
        prompt = "角色讨论场景起始状态，但这不是字段。\n镜头1｜00:00.0-00:02.0｜近景"

        self.assertEqual(_strip_inline_start_state_duplicate(prompt), prompt)

    def test_formats_human_readable_prompt_block_without_payload_wrapper(self):
        row = {
            "id": 99,
            "scene_index": 1,
            "section_number": 3,
            "section_info": '{"scene":"内 花厅 日"}',
        }
        final_prompt = "图片1为人物参考图\n\n人物走到桌前。"

        output = _format_video_prompt_export_block(row, final_prompt)

        self.assertEqual(
            output,
            "==================== 分镜 #2-3｜内 花厅 日 ====================\n"
            "图片1为人物参考图\n\n人物走到桌前。",
        )
        self.assertNotIn('"prompt":', output)
        self.assertNotIn('"params":', output)
        self.assertNotIn('"model":', output)

    def test_request_rejects_duplicate_storyboards(self):
        with self.assertRaises(ValueError):
            VideoPromptExportRequest(
                items=[
                    VideoPromptExportItem(storyboard_id=1, prompt="A"),
                    VideoPromptExportItem(storyboard_id=1, prompt="B"),
                ],
                provider="jimeng",
            )

    def test_request_accepts_all_video_page_providers(self):
        for provider in ("jimeng", "pippit", "ark", "cool", "xinglian"):
            req = VideoPromptExportRequest(
                items=[VideoPromptExportItem(storyboard_id=1, prompt="测试")],
                provider=provider,
            )
            self.assertEqual(req.provider, provider)


if __name__ == "__main__":
    unittest.main()
