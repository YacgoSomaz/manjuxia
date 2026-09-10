import json
import unittest
from unittest.mock import AsyncMock, patch

from services import supplement_video_service
from services.supplement_video_service import (
    _build_messages,
    _build_supplement_priority_block,
    _extract_supplement_dialogues,
    _supplement_output_follows_target,
)


SCRIPT_TEXT = """【内 茶室 日】
甲与乙隔桌相对。
甲：你昨晚为什么没来？我在桥边等了一夜。
乙：我去了，看见有人陪着你，就没敢过去。"""

ANCHOR_TEXT = """镜头24｜00:53.3-00:54.0｜手绳与男主眼神机制特写
本镜人物白名单:裴砚之、沈昭昭
裴砚之右手压稳绳索，沈昭昭位于左前焦外。"""


class SupplementStoryboardPromptTests(unittest.TestCase):
    def test_anchor_is_read_only_and_target_is_last(self):
        block = _build_supplement_priority_block(SCRIPT_TEXT, ANCHOR_TEXT)

        self.assertIn("相邻正式分镜参考｜只读连续性资料", block)
        self.assertIn("本次补镜描述｜唯一剧情来源｜最高优先级", block)
        self.assertLess(block.index(ANCHOR_TEXT), block.index(SCRIPT_TEXT))
        self.assertGreater(block.rfind(SCRIPT_TEXT), block.rfind(ANCHOR_TEXT))
        self.assertTrue(block.rstrip().endswith("输出前必须核对人物、动作与台词均属于本次补镜。"))

    def test_target_is_appended_even_when_only_anchor_placeholder_matches(self):
        template = {
            "content": "模板规则\n{storyboard_context}",
            "variables": json.dumps(["storyboard_context"], ensure_ascii=False),
        }

        messages, values = _build_messages(template, SCRIPT_TEXT, ANCHOR_TEXT)
        prompt = messages[1]["content"]

        self.assertIn(SCRIPT_TEXT, prompt)
        self.assertIn(ANCHOR_TEXT, prompt)
        self.assertGreater(prompt.rfind(SCRIPT_TEXT), prompt.rfind(ANCHOR_TEXT))
        self.assertIn("唯一剧情来源", messages[0]["content"])
        self.assertIn("只读连续性资料", values["storyboard_context"])

    def test_target_is_last_for_templates_without_variables(self):
        template = {
            "content": "完整分镜模板正文",
            "variables": "[]",
        }

        messages, _ = _build_messages(template, SCRIPT_TEXT, ANCHOR_TEXT)
        prompt = messages[1]["content"]

        self.assertGreater(prompt.rfind(SCRIPT_TEXT), prompt.rfind(ANCHOR_TEXT))
        self.assertNotIn("参考上下文：\n" + ANCHOR_TEXT, prompt)

    def test_dialogue_guard_rejects_anchor_storyboard_output(self):
        wrong_output = """镜头24｜00:53.3-00:54.0｜手绳与男主眼神机制特写
裴砚之右手压稳绳索，沈昭昭位于左前焦外。"""

        self.assertFalse(
            _supplement_output_follows_target(SCRIPT_TEXT, ANCHOR_TEXT, wrong_output)
        )

    def test_dialogue_guard_accepts_supplement_output(self):
        correct_output = """【内 茶室 日】
甲抬手指向门外：“你昨晚为什么没来？我在桥边等了一夜。”
乙轻按胸口：“我去了，看见有人陪着你，就没敢过去。”"""

        self.assertTrue(
            _supplement_output_follows_target(SCRIPT_TEXT, ANCHOR_TEXT, correct_output)
        )

    def test_dialogue_extractor_ignores_structural_labels(self):
        text = """场景：茶室
时间：白日
甲：你为什么没来？
旁白：窗外的雨忽然停了。
本节主线：误会解除"""

        self.assertEqual(
            _extract_supplement_dialogues(text),
            ["你为什么没来？", "窗外的雨忽然停了。"],
        )


class SupplementMaterialRefreshTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.old_materials = {
            "characters": [{
                "id": 1603,
                "name": "甲",
                "matched_name": "甲",
                "element_type": "character",
                "description": "",
                "image_path": "/data/images/demo/角色_甲.png",
                "audio_file": None,
                "active_variant_name": None,
                "updated_at": "2026-07-29 21:33:07",
            }],
            "scenes": [],
            "props": [],
        }
        self.new_materials = {
            "characters": [{
                "id": 1606,
                "name": "甲",
                "matched_name": "甲",
                "element_type": "character",
                "description": "",
                "image_path": "/data/images/demo/角色_甲.png",
                "audio_file": None,
                "active_variant_name": None,
                "updated_at": "2026-07-30 00:20:36",
            }],
            "scenes": [],
            "props": [],
        }
        self.task = {
            "id": 6,
            "novel_id": 109,
            "characters": ["甲"],
            "scenes": [],
            "props": [],
            "materials": self.old_materials,
            "missing_assets": [],
        }

    async def test_refresh_replaces_stale_snapshot_even_when_path_is_unchanged(self):
        persisted = {
            **self.task,
            "materials": self.new_materials,
            "missing_assets": [],
        }
        with (
            patch.object(
                supplement_video_service,
                "_load_elements_by_name",
                new=AsyncMock(return_value=self.new_materials),
            ) as load_assets,
            patch.object(
                supplement_video_service,
                "_persist_material_asset_snapshot",
                new=AsyncMock(return_value=persisted),
            ) as persist,
        ):
            result = await supplement_video_service._refresh_material_asset_snapshots(self.task)

        load_assets.assert_awaited_once_with(
            109,
            {"characters": ["甲"], "scenes": [], "props": []},
        )
        persist.assert_awaited_once_with(6, self.new_materials, [])
        self.assertEqual(result["materials"]["characters"][0]["id"], 1606)
        self.assertEqual(
            result["materials"]["characters"][0]["updated_at"],
            "2026-07-30 00:20:36",
        )

    async def test_refresh_does_not_write_when_snapshot_is_current(self):
        current_task = {
            **self.task,
            "materials": self.new_materials,
        }
        with (
            patch.object(
                supplement_video_service,
                "_load_elements_by_name",
                new=AsyncMock(return_value=self.new_materials),
            ),
            patch.object(
                supplement_video_service,
                "_persist_material_asset_snapshot",
                new=AsyncMock(),
            ) as persist,
        ):
            result = await supplement_video_service._refresh_material_asset_snapshots(current_task)

        persist.assert_not_awaited()
        self.assertIs(result, current_task)

    async def test_get_task_resolves_latest_material_assets(self):
        refreshed = {
            **self.task,
            "materials": self.new_materials,
        }
        with (
            patch.object(
                supplement_video_service,
                "_get_task",
                new=AsyncMock(return_value=self.task),
            ) as get_task,
            patch.object(
                supplement_video_service,
                "_refresh_material_asset_snapshots",
                new=AsyncMock(return_value=refreshed),
            ) as refresh,
        ):
            result = await supplement_video_service.SupplementVideoService.get_task(6)

        get_task.assert_awaited_once_with(6)
        refresh.assert_awaited_once_with(self.task)
        self.assertIs(result, refreshed)


if __name__ == "__main__":
    unittest.main()
