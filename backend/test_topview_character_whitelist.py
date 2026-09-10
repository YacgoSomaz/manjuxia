import json
import unittest

from api.topview_demo import (
    _build_dispatch_infer_messages,
    _filter_dispatch_to_visible_characters,
    _resolve_topview_character_names,
)
from services.storyboard_service import _extract_explicit_visible_character_names


KNOWN_NAMES = ["沈昭昭", "裴砚之", "裴明珠", "玄七"]
CHARACTER_ELEMENTS = [
    {
        "id": index + 1,
        "name": name,
        "element_type": "character",
        "aliases": "[]",
    }
    for index, name in enumerate(KNOWN_NAMES)
]


class TopviewCharacterWhitelistTests(unittest.TestCase):
    def test_empty_db_characters_fall_back_to_latest_prompt_visual_people(self):
        names, text, source = _resolve_topview_character_names(
            base_character_names=[],
            prompt=(
                "镜头1：沈昭昭走到木椅旁，裴砚之抬眼看她。\n"
                "台词：裴明珠在门外喊了一声。"
            ),
            description="旧描述没有人物关联",
            character_elements=CHARACTER_ELEMENTS,
            manual_image_characters_raw=None,
        )

        self.assertEqual(names, ["沈昭昭", "裴砚之"])
        self.assertTrue(text.startswith("镜头1"))
        self.assertEqual(source, "jimeng_auto_visual")

    def test_manual_jimeng_image_list_is_reused_when_db_characters_are_empty(self):
        names, _text, source = _resolve_topview_character_names(
            base_character_names=[],
            prompt="无结构化人物字段",
            description="",
            character_elements=CHARACTER_ELEMENTS,
            manual_image_characters_raw=json.dumps(
                ["裴砚之", "沈昭昭"], ensure_ascii=False
            ),
        )

        self.assertCountEqual(names, ["裴砚之", "沈昭昭"])
        self.assertEqual(source, "jimeng_manual_images")

    def test_last_shot_visible_whitelist_overrides_broader_image_list(self):
        names, _text, source = _resolve_topview_character_names(
            base_character_names=[],
            prompt=(
                "本镜人物白名单:本镜可见人物=沈昭昭、裴砚之 / "
                "本镜局部可见人物=无 / 本镜画外声源=无\n"
                "本镜人物白名单:本镜可见人物=沈昭昭 / "
                "本镜局部可见人物=无 / 本镜画外声源=裴砚之"
            ),
            description="",
            character_elements=CHARACTER_ELEMENTS,
            manual_image_characters_raw=json.dumps(
                ["沈昭昭", "裴砚之"], ensure_ascii=False
            ),
        )

        self.assertEqual(names, ["沈昭昭"])
        self.assertEqual(source, "ending_visible_whitelist")

    def test_section_whitelist_ignores_dialogue_only_name(self):
        text = """
【本节人物与道具白名单】起始在场=沈昭昭、裴砚之 / 本节实际出镜=沈昭昭、裴砚之 / 本节画外发声=无
本节叙事目标:裴砚之自报裴明珠大哥身份
台词:裴砚之:「我是裴明珠的大哥。」
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(text, KNOWN_NAMES),
            ["沈昭昭", "裴砚之"],
        )

    def test_a_plus_section_format_extracts_actual_visible_people(self):
        text = """
人物:S0=沈昭昭[C01] / IN=裴砚之[C02] / OUT=无 / 实际出镜=沈昭昭[C01]、裴砚之[C02] / 画外发声=裴明珠[C03]
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(text, KNOWN_NAMES),
            ["沈昭昭", "裴砚之"],
        )

    def test_legacy_slash_delimited_character_members_are_all_kept(self):
        text = """
【本节人物与道具白名单】起始在场=沈昭昭 / 裴砚之 / 裴明珠 / 允许入场=无 / 实际出镜=沈昭昭 / 裴砚之 / 裴明珠 / 画外发声=无 / 启用道具=无
本镜人物白名单:本镜可见人物=沈昭昭 / 裴砚之 / 裴明珠 / 本镜局部可见人物=无 / 本镜新入场人物=无 / 本镜画外声源=无
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(text, KNOWN_NAMES),
            ["沈昭昭", "裴砚之", "裴明珠"],
        )
        self.assertEqual(
            _extract_explicit_visible_character_names(
                text, KNOWN_NAMES, ending_only=True
            ),
            ["沈昭昭", "裴砚之", "裴明珠"],
        )

    def test_a_plus_last_shot_format_extracts_unprefixed_visible_fields(self):
        text = """
本镜人物白名单:可见人物=裴明珠[C03]、玄七[C04] / 局部可见人物=无 / 画外声源=无
本镜人物白名单:可见人物=沈昭昭[C01] / 局部可见人物=裴砚之[C02]右手 / 画外声源=裴明珠[C03]
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(
                text, KNOWN_NAMES, ending_only=True
            ),
            ["沈昭昭", "裴砚之"],
        )

    def test_nonempty_unresolved_whitelist_does_not_erase_associations(self):
        text = """
本镜人物白名单:可见人物=阿昭[C01]、世子[C02] / 局部可见人物=无 / 画外声源=无
"""
        self.assertIsNone(
            _extract_explicit_visible_character_names(text, KNOWN_NAMES)
        )

    def test_explicit_empty_whitelist_still_means_no_visible_people(self):
        text = """
本镜人物白名单:可见人物=无 / 局部可见人物=无 / 画外声源=裴明珠[C03]
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(text, KNOWN_NAMES),
            [],
        )

    def test_ending_whitelist_uses_last_shot_not_all_named_people(self):
        text = """
本镜人物白名单:本镜可见人物=裴明珠、玄七 / 本镜局部可见人物=无 / 本镜画外声源=无
本镜人物白名单:本镜可见人物=沈昭昭、裴砚之 / 本镜局部可见人物=无 / 本镜画外声源=裴明珠
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(
                text, KNOWN_NAMES, ending_only=True
            ),
            ["沈昭昭", "裴砚之"],
        )

    def test_legacy_end_state_excludes_offscreen_people(self):
        text = """
本节结尾状态:
沈昭昭:站在高背木椅旁 / 右手持绳
裴砚之:坐于高背木椅 / 双腕受制
裴明珠:站在门外回廊 / 画外 / 面向门内
玄七:停在裴明珠身后 / 画外 / 沉默
本节追更钩子:门外的人尚未入镜。
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(
                text, KNOWN_NAMES, ending_only=True
            ),
            ["沈昭昭", "裴砚之"],
        )

    def test_legacy_end_state_accepts_equals_separator(self):
        text = """
本节结尾状态:
沈昭昭 = 姿态[站立] / 位置[画面左侧]
裴砚之 = 姿态[坐姿] / 位置[画面右侧]
本节追更钩子:两人隔案对峙。
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(
                text, KNOWN_NAMES, ending_only=True
            ),
            ["沈昭昭", "裴砚之"],
        )

    def test_unrecognized_legacy_end_state_does_not_erase_associations(self):
        text = """
本节结尾状态:
C01 -> 姿态[站立] / 位置[画面左侧]
C02 -> 姿态[坐姿] / 位置[画面右侧]
本节追更钩子:两人隔案对峙。
"""
        self.assertIsNone(
            _extract_explicit_visible_character_names(
                text, KNOWN_NAMES, ending_only=True
            )
        )

    def test_legacy_end_state_all_known_people_offscreen_is_explicit_empty(self):
        text = """
本节结尾状态:
沈昭昭 = 位置[门外] / 画外
裴砚之 = 位置[回廊] / 已退场
本节追更钩子:室内暂时无人。
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(
                text, KNOWN_NAMES, ending_only=True
            ),
            [],
        )

    def test_legacy_end_state_explicit_none_is_empty(self):
        text = """
本节结尾状态:无
本节追更钩子:空镜结束。
"""
        self.assertEqual(
            _extract_explicit_visible_character_names(
                text, KNOWN_NAMES, ending_only=True
            ),
            [],
        )

    def test_dispatch_filter_removes_named_offscreen_people_everywhere(self):
        polluted = {
            "summary": "沈昭昭与裴砚之在暖阁，裴明珠和玄七在门外",
            "spatial_layout": "裴砚之在木椅，沈昭昭在旁边，裴明珠在门外",
            "characters": [
                {"name": "沈昭昭", "position": "木椅旁"},
                {"name": "裴砚之", "position": "木椅上"},
                {"name": "裴明珠", "position": "门外"},
                {"name": "玄七", "position": "回廊"},
            ],
        }

        clean = _filter_dispatch_to_visible_characters(
            polluted,
            ["沈昭昭", "裴砚之"],
            known_character_names=KNOWN_NAMES,
        )
        serialized = json.dumps(clean, ensure_ascii=False)

        self.assertEqual(
            [item["name"] for item in clean["characters"]],
            ["沈昭昭", "裴砚之"],
        )
        self.assertNotIn("裴明珠", serialized)
        self.assertNotIn("玄七", serialized)

    def test_dispatch_prompt_declares_hard_visible_whitelist(self):
        messages = _build_dispatch_infer_messages(
            "台词中提到裴明珠，但她不在场。",
            ["西山别院暖阁"],
            ["沈昭昭", "裴砚之"],
            ["黑金世子令"],
        )
        prompt = "\n".join(message["content"] for message in messages)
        self.assertIn("结尾可见人物硬白名单:沈昭昭、裴砚之", prompt)
        self.assertIn("不得降级成背景路人", prompt)


if __name__ == "__main__":
    unittest.main()
