import json
import unittest

from api.video import find_best_match


def _element(element_id, name, *, aliases=None, asset=None):
    row = {
        "id": element_id,
        "name": name,
        "aliases": json.dumps(aliases or [], ensure_ascii=False),
        "finished_image": None,
        "reference_image": None,
        "image_url": None,
        "grid_image": None,
        "panorama_url": None,
        "audio_file": None,
    }
    if asset:
        row[asset] = f"data/{element_id}.png"
    return row


class FindBestMatchTests(unittest.TestCase):
    def test_specific_scene_beats_older_short_alias_in_any_order(self):
        old = _element(1065, "瑶华阁", aliases=["国公府瑶华阁内部", "瑶华阁"], asset="finished_image")
        precise = _element(1370, "瑶华阁湖心亭", aliases=["瑶华阁湖心亭"], asset="grid_image")

        for rows in ([old, precise], [precise, old]):
            with self.subTest(order=[row["id"] for row in rows]):
                match = find_best_match("内/外 瑶华阁湖心亭 夜", rows, "scene")
                self.assertEqual(match["id"], 1370)

    def test_scene_decorators_are_removed_before_exact_match(self):
        target = _element(20, "瑶华阁湖心亭", asset="panorama_url")
        variants = [
            "内 瑶华阁湖心亭 夜",
            "外 瑶华阁湖心亭 日",
            "内/外 瑶华阁湖心亭 时间未明",
            "外／内 瑶华阁湖心亭 清晨",
            "【外 瑶华阁湖心亭 · 江南宅院 · 14 秒】",
        ]
        for search in variants:
            with self.subTest(search=search):
                self.assertEqual(find_best_match(search, [target], "scene")["id"], 20)

    def test_longer_subscene_beats_short_parent_scene(self):
        parent = _element(1, "瑶华阁", aliases=["瑶华阁"], asset="finished_image")
        subscene = _element(2, "瑶华阁暗室内部", asset="grid_image")
        match = find_best_match("内 瑶华阁暗室 夜", [parent, subscene], "scene")
        self.assertEqual(match["id"], 2)

    def test_interior_scene_does_not_fall_back_to_exterior_asset(self):
        interior = _element(976, "清幽院房间内部", asset="finished_image")
        exterior = _element(1269, "清幽院院落外景", asset="finished_image")

        for rows in ([interior, exterior], [exterior, interior]):
            with self.subTest(order=[row["id"] for row in rows]):
                match = find_best_match("内 清幽院内室 日", rows, "scene")
                self.assertEqual(match["id"], 976)

    def test_exact_hollow_scene_beats_fuzzy_scene_with_asset(self):
        exact = _element(30, "瑶华阁湖心亭")
        broad = _element(31, "瑶华阁", aliases=["瑶华阁"], asset="finished_image")
        match = find_best_match("外 瑶华阁湖心亭 夜", [broad, exact], "scene")
        self.assertEqual(match["id"], 30)

    def test_duplicate_exact_name_prefers_asset_then_newer_id(self):
        hollow = _element(40, "长公主府花厅")
        filled_old = _element(41, "长公主府花厅", asset="reference_image")
        filled_new = _element(42, "长公主府花厅", asset="grid_image")
        match = find_best_match("长公主府花厅", [filled_old, hollow, filled_new], "scene")
        self.assertEqual(match["id"], 42)

    def test_character_exact_alias_and_prop_exact_name_still_work(self):
        characters = [
            _element(50, "凌瑶华", aliases=["瑶华"], asset="finished_image"),
            _element(51, "凌瑶", aliases=["阿瑶"], asset="finished_image"),
        ]
        self.assertEqual(find_best_match("瑶华", characters, "character")["id"], 50)

        props = [
            _element(60, "彩绘纸鸢", asset="finished_image"),
            _element(61, "纸鸢"),
        ]
        self.assertEqual(find_best_match("纸鸢", props, "prop")["id"], 61)

    def test_invalid_alias_json_does_not_break_matching(self):
        row = _element(70, "铜镜", asset="finished_image")
        row["aliases"] = "not-json"
        self.assertEqual(find_best_match("铜镜", [row], "prop")["id"], 70)


if __name__ == "__main__":
    unittest.main()
