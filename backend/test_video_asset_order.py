import json
import os
import tempfile
import unittest

import database.db as db_module
from database.db import get_db, init_db
from api.video import (
    _build_file_refs,
    _collect_storyboard_assets_for_ark,
    _extract_speaker_order_from_prompt,
    _merge_structured_enabled_props,
    _order_characters_by_visual_appearance,
    _resolve_audio_character_order,
    _resolve_jimeng_character_references,
    _sort_named_assets,
)


class VideoAssetOrderTests(unittest.TestCase):
    def test_jimeng_prompt_lists_images_then_audio_in_actual_upload_order(self):
        images = [
            ("xie.png", "谢明渊", "character"),
            ("ling.png", "凌瑶华", "character"),
            ("corridor.png", "外行宫回廊 日", "scene"),
        ]
        audios = [
            ("ling.wav", "凌瑶华"),
            ("xie.wav", "谢明渊"),
        ]

        self.assertEqual(
            _build_file_refs(
                images,
                audios,
                separate_audio_order=True,
            ),
            [
                "图片1 谢明渊人物形象参考图",
                "图片2 凌瑶华人物形象参考图",
                "图片3 外行宫回廊 日场景参考图",
                "音频1 凌瑶华角色音色参考",
                "音频2 谢明渊角色音色参考",
            ],
        )

    def test_other_providers_keep_character_image_audio_pairing(self):
        images = [
            ("xie.png", "谢明渊", "character"),
            ("ling.png", "凌瑶华", "character"),
        ]
        audios = [
            ("ling.wav", "凌瑶华"),
            ("xie.wav", "谢明渊"),
        ]

        self.assertEqual(
            _build_file_refs(images, audios),
            [
                "图片1 谢明渊人物形象参考图,音频2 谢明渊角色音色参考",
                "图片2 凌瑶华人物形象参考图,音频1 凌瑶华角色音色参考",
            ],
        )

    def test_visual_and_audio_orders_are_intentionally_decoupled(self):
        prompt = """
【本节人物与道具白名单】本节实际出镜=裴明珠、沈昭昭、玄七
场景起始状态:
  裴明珠 = 门外等待
  沈昭昭 = 屋内站立
镜头1｜00:00-00:03｜中景
画面：沈昭昭先站在画面中央，转身望向门口。
台词/OS/口型:角色画外台词:裴明珠:「昭昭，开门。」
镜头2｜00:03-00:06｜双人近景
画面：裴明珠推门入画，与沈昭昭对视。
台词:沈昭昭:「你怎么来了？」
🔗 本节结尾状态
  玄七 = 下一节才入场
"""
        characters = ["裴明珠", "沈昭昭", "玄七"]

        self.assertEqual(
            _order_characters_by_visual_appearance(characters, prompt),
            ["沈昭昭", "裴明珠", "玄七"],
        )
        self.assertEqual(
            _resolve_audio_character_order(characters, prompt),
            ["裴明珠", "沈昭昭", "玄七"],
        )

    def test_speaker_order_uses_global_text_position_across_formats(self):
        prompt = """
裴砚之(VO):「先听见我的声音。」
台词:沈昭昭:「后轮到我。」
"""
        self.assertEqual(
            _extract_speaker_order_from_prompt(prompt),
            ["裴砚之", "沈昭昭"],
        )

    def test_offscreen_speaker_does_not_take_visual_image_priority(self):
        prompt = """
镜头1｜中景
本镜人物白名单:本镜可见人物=女甲 / 本镜局部可见人物=无 / 本镜新入场人物=无 / 本镜画外声源=女乙
画面/构图提示词:女甲独自在画面中央。
台词/OS/口型:角色画外台词:女乙:「我先说。」
镜头2｜近景
本镜人物白名单:本镜可见人物=女丙 / 本镜局部可见人物=无 / 本镜新入场人物=女丙 / 本镜画外声源=无
画面/构图提示词:女丙推门入画。
镜头3｜双人
本镜人物白名单:本镜可见人物=女甲、女乙、女丙 / 本镜局部可见人物=无 / 本镜新入场人物=女乙 / 本镜画外声源=无
"""
        self.assertEqual(
            _order_characters_by_visual_appearance(["女乙", "女丙", "女甲"], prompt),
            ["女甲", "女丙", "女乙"],
        )

    def test_per_shot_voice_audit_does_not_hide_later_visual_characters(self):
        prompt = """
镜头10｜中近景
本镜人物白名单:本镜可见人物=女甲、女乙 / 本镜局部可见人物=无 / 本镜新入场人物=无
本镜人声审计:覆盖人声段=无
镜头11｜细节特写
本镜人物白名单:本镜可见人物=无 / 本镜局部可见人物=女乙右手 / 本镜新入场人物=无
本镜人声审计:覆盖人声段=无
镜头12｜双人中景
本镜人物白名单:本镜可见人物=女乙、女丙 / 本镜局部可见人物=无 / 本镜新入场人物=无
本镜人声审计:覆盖人声段=无
本节人声审计:视觉时长=12秒
本节结尾状态:
  女丁 = 下一节才出场
"""
        elements = [
            {"name": "女甲", "aliases": "[]"},
            {"name": "女乙", "aliases": "[]"},
            {"name": "女丙", "aliases": "[]"},
            {"name": "女丁", "aliases": "[]"},
        ]

        refs = _resolve_jimeng_character_references(
            ["女甲", "女乙", "女丙", "女丁"],
            prompt,
            elements,
        )

        self.assertEqual(refs["image_names"], ["女甲", "女乙", "女丙"])
        self.assertEqual(refs["image_selection_mode"], "auto")

    def test_legacy_slash_delimited_visible_names_keep_all_images(self):
        prompt = """
镜头1｜中景
本镜人物白名单:本镜可见人物=女甲 / 女乙 / 女丙 / 本镜局部可见人物=无 / 本镜新入场人物=女乙 / 女丙 / 本镜画外声源=无
画面/构图提示词:三人同框。
"""
        elements = [
            {"name": "女甲", "aliases": "[]"},
            {"name": "女乙", "aliases": "[]"},
            {"name": "女丙", "aliases": "[]"},
        ]

        refs = _resolve_jimeng_character_references([], prompt, elements)

        self.assertEqual(refs["image_names"], ["女甲", "女乙", "女丙"])

    def test_enabled_prop_whitelist_blocks_hidden_full_text_candidates(self):
        prompt = (
            "【本节人物与道具白名单】启用道具=火把 / 染血的刀\n"
            "本节结尾状态:持有道具[酒盏与香炉盖/袖中/隐藏]"
        )
        elements = [
            {"name": "火把", "aliases": "[]"},
            {"name": "染血的刀", "aliases": "[]"},
            {"name": "酒盏", "aliases": "[]"},
            {"name": "香炉", "aliases": '["香炉盖"]'},
        ]

        props, blocks_full_scan = _merge_structured_enabled_props(
            [],
            prompt,
            elements,
        )

        self.assertTrue(blocks_full_scan)
        self.assertEqual(props, ["火把", "染血的刀"])
        self.assertNotIn("酒盏", props)
        self.assertNotIn("香炉", props)

    def test_structured_props_drop_stored_future_items_without_visual_evidence(self):
        prompt = """
【本节人物与道具白名单】启用道具=火把、酒盏、香炉盖
起始连续性账本:辅助道具=火把＋燃烧、酒盏与香炉盖＋尚未显露＋不可见＋不启用素材
画面/构图提示词:谢明渊右手火把位于画面左侧
动作/表演/关系:谢明渊保持火把，凌瑶华转身离开
道具交互/连续性:辅助道具=火把＋保持
光影/质感/脸部读性:火把映亮人物脸侧
运镜/动作衔接:固定机位
"""
        elements = [
            {"name": "火把", "aliases": "[]"},
            {"name": "酒盏", "aliases": "[]"},
            {"name": "香炉", "aliases": '["香炉盖"]'},
        ]

        props, blocks_full_scan = _merge_structured_enabled_props(
            ["酒盏", "香炉", "火把"],
            prompt,
            elements,
        )

        self.assertTrue(blocks_full_scan)
        self.assertEqual(props, ["火把"])

    def test_structured_props_keep_future_items_once_a_shot_reveals_them(self):
        prompt = """
【本节人物与道具白名单】启用道具=火把、酒盏、香炉盖
起始连续性账本:辅助道具=火把＋燃烧、酒盏与香炉盖＋尚未显露＋不可见＋不启用素材
画面/构图提示词:凌瑶华右手抬起，酒盏与香炉盖清楚显露
动作/表演/关系:凌瑶华将酒盏与香炉盖递给小白
道具交互/连续性:酒盏与香炉盖＋完成可见交接
光影/质感/脸部读性:火把与酒盏、香炉盖均承接火光
运镜/动作衔接:跟随证据交接
"""
        elements = [
            {"name": "火把", "aliases": "[]"},
            {"name": "酒盏", "aliases": "[]"},
            {"name": "香炉", "aliases": '["香炉盖"]'},
        ]

        props, blocks_full_scan = _merge_structured_enabled_props(
            ["酒盏", "香炉", "火把"],
            prompt,
            elements,
        )

        self.assertTrue(blocks_full_scan)
        self.assertEqual(props, ["酒盏", "香炉", "火把"])

    def test_removed_structured_enabled_prop_is_not_added_back(self):
        prompt = """
【本节人物与道具白名单】启用道具=黑羽铁箭、锦囊军箭、弓、长弓
画面/构图提示词:四件道具均清楚可见
动作/表演/关系:人物握住长弓，箭矢放在一旁
道具交互/连续性:黑羽铁箭、锦囊军箭、弓、长弓保持在场
光影/质感/脸部读性:道具承接自然光
运镜/动作衔接:固定机位
"""
        elements = [
            {"name": "黑羽铁箭", "aliases": "[]"},
            {"name": "锦囊军箭", "aliases": "[]"},
            {"name": "弓", "aliases": "[]"},
            {"name": "长弓", "aliases": '["硬木长弓"]'},
        ]

        props, blocks_full_scan = _merge_structured_enabled_props(
            ["黑羽铁箭", "锦囊军箭", "弓"],
            prompt,
            elements,
            ["长弓"],
        )

        self.assertTrue(blocks_full_scan)
        self.assertEqual(props, ["黑羽铁箭", "锦囊军箭", "弓"])

    def test_manually_readded_prop_overrides_stale_exclusion(self):
        prompt = """
【本节人物与道具白名单】启用道具=长弓
画面/构图提示词:长弓清楚可见
动作/表演/关系:人物握住长弓
道具交互/连续性:长弓保持在场
光影/质感/脸部读性:长弓承接自然光
运镜/动作衔接:固定机位
"""
        elements = [{"name": "长弓", "aliases": '["硬木长弓"]'}]

        props, blocks_full_scan = _merge_structured_enabled_props(
            ["长弓"],
            prompt,
            elements,
            ["长弓"],
        )

        self.assertTrue(blocks_full_scan)
        self.assertEqual(props, ["长弓"])

    def test_legacy_prompt_without_enabled_prop_keeps_full_scan_available(self):
        props, blocks_full_scan = _merge_structured_enabled_props(
            ["火把"],
            "人物举着火把，袖中藏着酒盏。",
            [{"name": "火把", "aliases": "[]"}, {"name": "酒盏", "aliases": "[]"}],
        )

        self.assertFalse(blocks_full_scan)
        self.assertEqual(props, ["火把"])

    def test_a_plus_unprefixed_visible_fields_exclude_offscreen_speaker(self):
        prompt = """
镜号1:【中景·平视·固定】
本镜人物白名单:可见人物=女甲[C01] / 局部可见人物=无 / 新入场人物=无 / 画外声源=女乙[C02]
发声:类型=角色画外台词 / 角色=女乙[C02] / 原文=「先听见我。」 / 口型=画外无口型
镜号2:【近景·平视·缓推】
本镜人物白名单:可见人物=女甲[C01]、女丙[C03] / 局部可见人物=无 / 新入场人物=女丙[C03] / 画外声源=无
"""
        elements = [
            {"name": "女甲", "aliases": "[]"},
            {"name": "女乙", "aliases": "[]"},
            {"name": "女丙", "aliases": "[]"},
        ]

        refs = _resolve_jimeng_character_references(
            [],
            prompt,
            elements,
        )

        self.assertEqual(refs["image_names"], ["女甲", "女丙"])
        self.assertNotIn("女乙", refs["image_names"])
        self.assertEqual(refs["image_selection_mode"], "auto")

    def test_combined_key_value_dialogue_keeps_first_speech_order(self):
        prompt = (
            "台词/OS/口型:类型=现场台词/角色=女乙:「第一句。」"
            "；类型=现场台词/角色=女甲:「第二句。」"
            " / 现场台词:女丙:「第三句。」"
        )
        self.assertEqual(
            _extract_speaker_order_from_prompt(prompt),
            ["女乙", "女甲", "女丙"],
        )

    def test_manual_audio_order_overrides_auto_and_appends_new_people(self):
        prompt = """
镜头1｜近景
画面：女甲与女乙同框。
台词:女乙:「先说。」
台词:女甲:「后说。」
"""
        self.assertEqual(
            _resolve_audio_character_order(
                ["女甲", "女乙", "女丙"],
                prompt,
                ["女甲", "已删除人物"],
            ),
            ["女甲", "女乙", "女丙"],
        )

    def test_stale_manual_names_fall_back_to_current_automatic_order(self):
        prompt = """
镜头1｜近景
本镜人物白名单:本镜可见人物=女甲、女乙 / 本镜局部可见人物=无 / 本镜新入场人物=无
台词:女乙:「先说。」
台词:女甲:「后说。」
"""
        self.assertEqual(
            _resolve_audio_character_order(
                ["女甲", "女乙"],
                prompt,
                ["已经删除的角色"],
            ),
            ["女乙", "女甲"],
        )

    def test_named_assets_follow_audio_order_without_changing_payload_shape(self):
        items = [
            ("a.wav", "女甲"),
            ("b.wav", "女乙"),
            ("c.wav", "女丙"),
        ]
        self.assertEqual(
            _sort_named_assets(items, ["女乙", "女甲", "女丙"]),
            [
                ("b.wav", "女乙"),
                ("a.wav", "女甲"),
                ("c.wav", "女丙"),
            ],
        )

    def test_pure_offscreen_speaker_gets_audio_without_character_image(self):
        prompt = """
镜头1｜近景
本镜人物白名单:本镜可见人物=女甲 / 本镜局部可见人物=无 / 本镜新入场人物=无 / 本镜画外声源=女乙
画面/构图提示词:女甲独自在窗前回头。
台词/OS/口型:角色画外台词:女乙:「别回头。」
"""
        elements = [
            {"name": "女甲", "aliases": "[]"},
            {"name": "女乙", "aliases": "[]"},
        ]
        refs = _resolve_jimeng_character_references(
            ["女甲"],
            prompt,
            elements,
        )
        self.assertEqual(refs["image_names"], ["女甲"])
        self.assertEqual(refs["audio_names"], ["女乙"])
        self.assertEqual(refs["image_selection_mode"], "auto")
        self.assertEqual(refs["audio_selection_mode"], "auto")

    def test_manual_image_and_audio_lists_are_independent_including_empty(self):
        prompt = """
镜头1｜近景
本镜人物白名单:本镜可见人物=女甲 / 本镜局部可见人物=无 / 本镜新入场人物=无
台词:女甲:「在。」
"""
        elements = [
            {"name": "女甲", "aliases": "[]"},
            {"name": "女乙", "aliases": "[]"},
        ]
        refs = _resolve_jimeng_character_references(
            ["女甲"],
            prompt,
            elements,
            manual_image_characters=[],
            manual_audio_characters=["女乙"],
        )
        self.assertEqual(refs["image_names"], [])
        self.assertEqual(refs["audio_names"], ["女乙"])
        self.assertEqual(refs["image_selection_mode"], "manual")
        self.assertEqual(refs["audio_selection_mode"], "manual")

    def test_old_prompt_without_visual_or_dialogue_fields_keeps_legacy_base_refs(self):
        refs = _resolve_jimeng_character_references(
            ["女甲", "女乙"],
            "两人继续完成这一镜。",
            [
                {"name": "女甲", "aliases": "[]"},
                {"name": "女乙", "aliases": "[]"},
            ],
        )
        self.assertEqual(refs["image_names"], ["女甲", "女乙"])
        self.assertEqual(refs["audio_names"], ["女甲", "女乙"])


class VideoProviderAssetIsolationTests(unittest.IsolatedAsyncioTestCase):
    async def test_visual_audio_split_is_shared_by_all_providers(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        os.remove(db_path)
        old_db_path = db_module.DB_PATH
        db_module.DB_PATH = db_path
        try:
            await init_db()
            db = await get_db()
            try:
                await db.execute(
                    "INSERT INTO novels(id, name, raw_content) VALUES(1, 'demo', 'demo')"
                )
                prompt = """
镜头1
本镜可见人物=女甲 / 本镜局部可见人物=无 / 本镜新入场人物=无 / 本镜画外声源=女乙
台词:女乙:「先说。」
"""
                cursor = await db.execute(
                    "INSERT INTO storyboards("
                    "novel_id, scene_number, description, prompt, characters"
                    ") VALUES(?,?,?,?,?)",
                    (
                        1,
                        1,
                        prompt,
                        prompt,
                        json.dumps(["女乙", "女甲"], ensure_ascii=False),
                    ),
                )
                storyboard_id = cursor.lastrowid
                for name in ("女甲", "女乙"):
                    await db.execute(
                        "INSERT INTO extracted_elements("
                        "novel_id, element_type, name, aliases, finished_image, audio_file"
                        ") VALUES(?,?,?,?,?,?)",
                        (1, "character", name, "[]", f"{name}.png", f"{name}.wav"),
                    )
                await db.commit()
            finally:
                await db.close()

            cool = await _collect_storyboard_assets_for_ark(
                storyboard_id,
                prompt_for_speakers=prompt,
                provider_type="cool",
            )
            jimeng = await _collect_storyboard_assets_for_ark(
                storyboard_id,
                prompt_for_speakers=prompt,
                provider_type="jimeng",
                apply_image_limit=False,
            )

            self.assertEqual(
                [label["input_name"] for label in cool[2]],
                ["女甲"],
            )
            self.assertEqual(
                [label["input_name"] for label in cool[3]],
                ["女乙"],
            )
            self.assertEqual(
                [label["input_name"] for label in jimeng[2]],
                ["女甲"],
            )
            self.assertEqual(
                [label["input_name"] for label in jimeng[3]],
                ["女乙"],
            )
        finally:
            db_module.DB_PATH = old_db_path
            for suffix in ("", "-shm", "-wal"):
                try:
                    os.remove(db_path + suffix)
                except FileNotFoundError:
                    pass


if __name__ == "__main__":
    unittest.main()
