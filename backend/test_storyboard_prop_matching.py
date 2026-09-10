import os
import sys
import unittest


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.storyboard_service import (
    _build_prop_code_map,
    _match_section_prop_names,
)


PROP_ELEMENTS = [
    {"name": "暗朱绳", "aliases": '["暗朱软绳"]'},
    {"name": "黑金令牌", "aliases": '["黑金令"]'},
    {"name": "迷香", "aliases": '["软筋香"]'},
    {"name": "伤药", "aliases": '["药"]'},
    {"name": "空令囊", "aliases": "[]"},
]


class StoryboardPropMatchingTests(unittest.TestCase):
    def test_batch_code_map_accepts_name_before_or_after_code(self):
        texts = [
            "核心道具=C01暗朱绳；辅助剧情道具=空令囊D02、D03伤药、黑金令D04",
        ]

        self.assertEqual(
            _build_prop_code_map(texts, PROP_ELEMENTS),
            {
                "C01": "暗朱绳",
                "D04": "黑金令牌",
                "D03": "伤药",
                "D02": "空令囊",
            },
        )

    def test_code_does_not_cross_a_list_separator(self):
        code_map = _build_prop_code_map(
            ["当前道具参考图=C01、空令囊D02"],
            PROP_ELEMENTS,
        )

        self.assertNotIn("C01", code_map)
        self.assertEqual(code_map["D02"], "空令囊")

    def test_structured_fields_resolve_codes_and_aliases(self):
        definitions = (
            "核心道具=C01暗朱绳；"
            "辅助剧情道具=空令囊D02、伤药D03、黑金令D04"
        )
        section = (
            "【本节美术/质感基准】当前道具参考图=C01、D04、D03 / 固定质感\n"
            "【本节人物与道具白名单】启用道具=C01、D04、D03、D02、木椅D01\n"
            "镜头1｜00:00-00:03｜近景\n"
            "动作：人物核对物证。"
        )
        code_map = _build_prop_code_map([definitions, section], PROP_ELEMENTS)

        self.assertEqual(
            _match_section_prop_names(section, PROP_ELEMENTS, code_map),
            ["暗朱绳", "黑金令牌", "伤药", "空令囊"],
        )

    def test_legacy_slash_delimited_enabled_prop_members_are_all_kept(self):
        section = (
            "【本节人物与道具白名单】起始在场=沈昭昭 / "
            "实际出镜=沈昭昭 / "
            "启用道具=暗朱绳 / 伤药 / 空令囊\n"
            "本节结尾状态:未显露隐藏物=存在＋不可见＋不启用素材"
        )

        self.assertEqual(
            _match_section_prop_names(section, PROP_ELEMENTS),
            ["暗朱绳", "伤药", "空令囊"],
        )

    def test_enabled_future_props_without_positive_shot_evidence_are_filtered(self):
        section = """
【本节人物与道具白名单】实际出镜=谢明渊、凌瑶华 / 启用道具=火把、酒盏、香炉盖
起始连续性账本:辅助道具=火把＋谢明渊右手持有＋燃烧、酒盏与香炉盖＋尚未显露＋不可见＋不启用素材
画面/构图提示词:谢明渊中近景居左，右手火把位于身侧上方
动作/表演/关系:谢明渊右手火把保持，凌瑶华转身离开
道具交互/连续性:辅助道具=火把＋谢明渊右手持有＋保持
光影/质感/脸部读性:火把映亮谢明渊左脸
运镜/动作衔接:固定机位，火把保持
"""
        props = [
            {"name": "火把", "aliases": []},
            {"name": "酒盏", "aliases": []},
            {"name": "香炉", "aliases": ["香炉盖"]},
        ]

        self.assertEqual(
            _match_section_prop_names(section, props),
            ["火把"],
        )
        self.assertEqual(
            _match_section_prop_names(
                section,
                props,
                enforce_visual_evidence=False,
            ),
            ["火把", "酒盏", "香炉"],
        )

    def test_enabled_props_are_kept_when_later_shot_visibly_reveals_them(self):
        section = """
【本节人物与道具白名单】实际出镜=凌瑶华、小白 / 启用道具=火把、酒盏、香炉盖
起始连续性账本:辅助道具=火把＋燃烧、酒盏与香炉盖＋尚未显露＋不可见＋不启用素材
画面/构图提示词:凌瑶华抬起右手，酒盏与香炉盖在画面中清楚显露
动作/表演/关系:凌瑶华右手递出酒盏与香炉盖，小白双手接住
道具交互/连续性:酒盏与香炉盖＋由未显露转为可见＋完成交接
光影/质感/脸部读性:火光映亮酒盏边缘与香炉盖
运镜/动作衔接:镜头跟随酒盏与香炉盖交接
"""
        props = [
            {"name": "火把", "aliases": []},
            {"name": "酒盏", "aliases": []},
            {"name": "香炉", "aliases": ["香炉盖"]},
        ]

        self.assertEqual(
            _match_section_prop_names(section, props),
            ["火把", "酒盏", "香炉"],
        )

    def test_unextracted_codes_are_ignored(self):
        definitions = "核心道具=C01暗朱绳；黑金令D04"
        section = (
            "当前道具=C01、D04、木椅D01、廊门D07\n"
            "启用道具=C01、D04、D01、D07"
        )
        code_map = _build_prop_code_map([definitions, section], PROP_ELEMENTS)

        self.assertEqual(
            _match_section_prop_names(section, PROP_ELEMENTS, code_map),
            ["暗朱绳", "黑金令牌"],
        )
        self.assertNotIn("D01", code_map)
        self.assertNotIn("D07", code_map)

    def test_structured_scope_does_not_import_future_prop_mentions(self):
        section = (
            "当前道具参考图：暗朱绳、木椅\n"
            "启用道具=C01、木椅D01\n"
            "本节结尾状态：下一镜承接为取出空令囊与伤药。"
        )
        code_map = {"C01": "暗朱绳"}

        self.assertEqual(
            _match_section_prop_names(section, PROP_ELEMENTS, code_map),
            ["暗朱绳"],
        )

    def test_legacy_template_keeps_direct_name_and_long_alias_matching(self):
        legacy_text = "人物拿起黑金令，又把暗朱绳绕回支点。"

        self.assertEqual(
            _match_section_prop_names(legacy_text, PROP_ELEMENTS),
            ["暗朱绳", "黑金令牌"],
        )

    def test_one_character_alias_does_not_pollute_legacy_narrative(self):
        legacy_text = "药效已经过去，但这一镜没有出现任何道具。"

        self.assertEqual(
            _match_section_prop_names(legacy_text, PROP_ELEMENTS),
            [],
        )


if __name__ == "__main__":
    unittest.main()
