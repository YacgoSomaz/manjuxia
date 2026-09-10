import unittest

from api.video import _extract_speakers_from_prompt


class VideoSpeakerParserTests(unittest.TestCase):
    def test_legacy_line_based_fields_still_work(self):
        text = """
台词:沈昭昭:「别挣。」
裴砚之(VO):「药效过了。」
内心OS:旁白:「不应作为人物音频。」
"""
        self.assertEqual(
            _extract_speakers_from_prompt(text),
            {"沈昭昭", "裴砚之"},
        )

    def test_combined_template_extracts_multiple_speakers_on_one_line(self):
        text = (
            "台词/OS/口型:现场台词:沈昭昭:「俘虏不许勾引人。」"
            " / 现场台词:裴砚之:「你离这么近，谁像俘虏？」"
        )
        self.assertEqual(
            _extract_speakers_from_prompt(text),
            {"沈昭昭", "裴砚之"},
        )

    def test_combined_template_extracts_os_and_offscreen_dialogue(self):
        text = (
            "台词/OS/口型:内心OS:沈昭昭:「更可疑。」"
            " / 角色画外台词:裴明珠:「昭昭，玄七抓到了。」"
        )
        self.assertEqual(
            _extract_speakers_from_prompt(text),
            {"沈昭昭", "裴明珠"},
        )

    def test_key_value_template_extracts_current_storyboard_speakers(self):
        text = """
台词/OS/口型:类型=角色画外台词/角色=裴明珠:「昭昭，玄七抓到了！」
台词/OS/口型:类型=现场台词/角色=沈昭昭:「哪个哥？」
台词/OS/口型:类型=现场台词/角色=裴明珠:「我亲哥。」
"""
        self.assertEqual(
            _extract_speakers_from_prompt(text),
            {"裴明珠", "沈昭昭"},
        )

    def test_key_value_template_extracts_multiple_roles_on_one_line(self):
        text = (
            "台词/OS/口型:类型=现场台词/角色=沈昭昭:「别动。」"
            "；类型=现场台词/角色=裴砚之:「我动过？」"
        )
        self.assertEqual(
            _extract_speakers_from_prompt(text),
            {"沈昭昭", "裴砚之"},
        )

    def test_degraded_type_name_format_is_tolerated(self):
        text = "台词/OS/口型:类型:裴砚之:「别挣，越挣越紧。」"
        self.assertEqual(_extract_speakers_from_prompt(text), {"裴砚之"})

    def test_key_value_roles_outside_voice_field_are_ignored(self):
        text = """
场景起始状态:角色=裴砚之/角色=沈昭昭
台词/OS/口型:无
"""
        self.assertEqual(_extract_speakers_from_prompt(text), set())

    def test_combined_heading_does_not_become_a_speaker(self):
        text = """
台词/OS/口型:
本镜人声审计:覆盖人声段=无
"""
        self.assertEqual(_extract_speakers_from_prompt(text), set())


if __name__ == "__main__":
    unittest.main()
