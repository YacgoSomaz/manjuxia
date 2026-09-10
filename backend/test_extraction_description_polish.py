import unittest

from api.extraction import (
    _build_description_polish_messages,
    _clean_polished_description,
)


class ExtractionDescriptionPolishTests(unittest.TestCase):
    def test_scene_prompt_enhances_visible_atmosphere_without_changing_scene(self):
        messages = _build_description_polish_messages(
            "scene",
            "临水竹梅暖阁",
            "古代暖阁，雨后初晴。",
        )

        system = messages[0]["content"]
        user = messages[1]["content"]
        self.assertIn("严格保留原场景的地点、时代、内外景、时段", system)
        self.assertIn("前景、中景、远景", system)
        self.assertIn("可见环境证据", system)
        self.assertIn("禁止出现人物", system)
        self.assertIn("不要只堆砌", system)
        self.assertIn("空间层次", user)
        self.assertIn("场景名：临水竹梅暖阁", user)

    def test_scene_prompt_keeps_user_instruction(self):
        messages = _build_description_polish_messages(
            "scene",
            "回廊",
            "古代回廊，白日。",
            "增加雨丝和檐下灯笼的冷暖对比。",
        )

        self.assertIn("增加雨丝和檐下灯笼的冷暖对比。", messages[1]["content"])

    def test_character_prompt_remains_character_specific(self):
        messages = _build_description_polish_messages(
            "character",
            "沈昭昭",
            "年轻女子，古装。",
        )

        self.assertIn("保留角色姓名、性别、年龄段、身份", messages[0]["content"])
        self.assertIn("角色名：沈昭昭", messages[1]["content"])

    def test_cleaner_removes_scene_prefix(self):
        self.assertEqual(
            _clean_polished_description("场景描述：雨后石板泛着微光。"),
            "雨后石板泛着微光。",
        )


if __name__ == "__main__":
    unittest.main()
