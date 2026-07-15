import unittest

from api import video


class VideoAssetPriorityTests(unittest.TestCase):
    def test_select_image_keep_indices_prefers_story_assets_over_topview_tail(self):
        items = [
            ("c1.png", "主角A", "character"),
            ("c2.png", "主角B", "character"),
            ("c3.png", "配角C", "character"),
            ("s1.png", "主场景", "scene"),
            ("s2.png", "副场景", "scene"),
            ("p1.png", "道具1", "prop"),
            ("p2.png", "道具2", "prop"),
            ("ref.png", "用户关键帧", "reference"),
            ("tail.png", "上镜尾帧", "chain_prev_frame"),
            ("top-a.png", "俯视调度图A", "topview_dispatch"),
            ("top-b.png", "俯视调度图B", "topview_dispatch"),
        ]

        kept, removed = video._select_image_keep_indices(items, limit=9)

        self.assertEqual(kept, list(range(9)))
        self.assertEqual(removed, [9, 10])

    def test_build_file_refs_keeps_topview_label_plain(self):
        refs = video._build_file_refs(
            [("top-a.png", "俯视人物调度图A:本镜开始站位", "topview_dispatch")],
            [],
        )

        self.assertEqual(refs, ["图片1 俯视人物调度图A:本镜开始站位"])


if __name__ == "__main__":
    unittest.main()
