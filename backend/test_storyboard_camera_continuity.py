import unittest

from services.storyboard_service import (
    _build_storyboard_assemble_payload,
    _extract_tail_camera_continuity,
)


class StoryboardCameraContinuityTest(unittest.TestCase):
    def test_extract_tail_camera_continuity_uses_last_shot(self):
        text = """
镜号1:【远景，平视，缓慢推进】主角走入院门
镜号2:【近景，低角度，横移】主角抬眼看向灯下
"""
        info = _extract_tail_camera_continuity(text)

        self.assertEqual(info["shot_number"], "2")
        self.assertEqual(info["shot_size"], "近景")
        self.assertEqual(info["angle"], "低角度")
        self.assertEqual(info["movement"], "横移")

    def test_assemble_payload_carries_camera_continuity(self):
        camera = {
            "camera": "近景，低角度，横移",
            "shot_size": "近景",
            "angle": "低角度",
            "movement": "横移",
        }
        payload = _build_storyboard_assemble_payload(
            {"variables": '["script_content"]'},
            admin_id=23,
            var_values={"script_content": "测试剧本"},
            scene_content="测试剧本",
            with_character_state=True,
            inject_block="",
            camera_continuity=camera,
        )

        self.assertEqual(payload["camera_continuity"], camera)


if __name__ == "__main__":
    unittest.main()
