import asyncio
import json
import os
import sqlite3
import sys
import tempfile
import unittest


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import aiosqlite
import services.storyboard_service as storyboard_service
from services.storyboard_service import (
    StoryboardService,
    _can_strong_inherit_across_scripts,
    _detect_scene_boundary_break,
    _get_prev_section_tail_camera_continuity,
    _get_previous_script_id,
)


PREVIOUS_SCENE = "内/外 京兆府公堂/牢门外 次日"
CURRENT_SCENE = "外 行宫猎场 日"
PREVIOUS_STATE = {
    "凌婉兮": (
        "姿态[站在伞下,右手攥紧名单] · 伤势[衣袖被扯住撕裂] · "
        "持有道具[皇家行宫随驾名单(攥皱)] · 情绪[冷硬决绝] · 朝向关系[面向名单]"
    )
}


class CrossChapterSceneInheritanceTests(unittest.TestCase):
    def setUp(self):
        fd, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        conn = sqlite3.connect(self.db_path)
        conn.executescript(
            """
            CREATE TABLE chapters (
                id INTEGER PRIMARY KEY,
                novel_id INTEGER NOT NULL,
                sort_order INTEGER
            );
            CREATE TABLE scripts (
                id INTEGER PRIMARY KEY,
                novel_id INTEGER NOT NULL,
                chapter_id INTEGER
            );
            CREATE TABLE storyboards (
                id INTEGER PRIMARY KEY,
                novel_id INTEGER NOT NULL,
                script_id INTEGER,
                scene_index INTEGER,
                section_number INTEGER,
                sort_order INTEGER DEFAULT 0,
                description TEXT DEFAULT '',
                prompt TEXT DEFAULT '',
                end_state TEXT,
                section_info TEXT,
                scene_type TEXT DEFAULT 'normal'
            );
            """
        )
        # 特意让“上一章”的 script_id=400 大于当前 script_id=254，验证不能再用 id 大小猜章节顺序。
        conn.executemany(
            "INSERT INTO chapters (id, novel_id, sort_order) VALUES (?, ?, ?)",
            [(3184, 88, 18), (9000, 88, 19), (3186, 88, 20)],
        )
        conn.executemany(
            "INSERT INTO scripts (id, novel_id, chapter_id) VALUES (?, ?, ?)",
            [(253, 88, 3184), (400, 88, 9000), (254, 88, 3186)],
        )
        conn.execute(
            """
            INSERT INTO storyboards
                (id, novel_id, script_id, scene_index, section_number, end_state,
                 section_info, scene_type, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                1,
                88,
                400,
                3,
                4,
                json.dumps(PREVIOUS_STATE, ensure_ascii=False),
                json.dumps({"scene": PREVIOUS_SCENE}, ensure_ascii=False),
                "normal",
                "镜号1：【中景,平视,固定】上一章末镜",
            ),
        )
        conn.commit()
        conn.close()
        self.original_get_db = storyboard_service.get_db

        async def _test_get_db():
            db = await aiosqlite.connect(self.db_path)
            db.row_factory = aiosqlite.Row
            return db

        storyboard_service.get_db = _test_get_db

    def tearDown(self):
        storyboard_service.get_db = self.original_get_db
        try:
            os.remove(self.db_path)
        except FileNotFoundError:
            pass

    def _previous_state(
        self,
        current_scene,
        scene_index=0,
        section_number=1,
        current_scene_type="normal",
    ):
        return asyncio.run(
            StoryboardService._get_prev_section_end_state(
                novel_id=88,
                script_id=254,
                scene_index=scene_index,
                section_number=section_number,
                allow_cross_script=True,
                current_scene_type=current_scene_type,
                current_scene_name=current_scene,
            )
        )

    def _boundary(self, current_scene, current_scene_type="normal"):
        return asyncio.run(
            _detect_scene_boundary_break(
                novel_id=88,
                script_id=254,
                scene_index=0,
                section_number=1,
                scene_type=current_scene_type,
                current_scene_name=current_scene,
                allow_cross_script=True,
            )
        )[0]

    def test_strong_identity_requires_location_time_and_timeline_to_match(self):
        self.assertTrue(
            _can_strong_inherit_across_scripts(
                "【内 大殿 夜】 (续2)", "内 大殿 夜", "normal", "normal"
            )
        )
        self.assertFalse(
            _can_strong_inherit_across_scripts("外 大殿 夜", "内 大殿 夜", "normal", "normal")
        )
        self.assertFalse(
            _can_strong_inherit_across_scripts("内 大殿 夜", "内 大殿 次日", "normal", "normal")
        )
        self.assertFalse(
            _can_strong_inherit_across_scripts("内 大殿 夜", "内 大殿 夜", "normal", "flashback")
        )

    def test_previous_script_uses_chapter_order_not_script_id(self):
        async def _lookup():
            db = await storyboard_service.get_db()
            try:
                return await _get_previous_script_id(db, 88, 254)
            finally:
                await db.close()

        self.assertEqual(asyncio.run(_lookup()), 400)

    def test_different_scene_fully_disconnects_including_injury(self):
        state = self._previous_state(CURRENT_SCENE)
        self.assertIsNone(state)
        self.assertTrue(self._boundary(CURRENT_SCENE))

    def test_same_location_but_different_time_fully_disconnects(self):
        self.assertIsNone(
            self._previous_state("内/外 京兆府公堂/牢门外 日")
        )

    def test_same_scene_same_time_same_timeline_can_strong_inherit(self):
        state = self._previous_state(f"【{PREVIOUS_SCENE}】")
        self.assertEqual(state, PREVIOUS_STATE)
        self.assertFalse(self._boundary(PREVIOUS_SCENE))

    def test_timeline_change_fully_disconnects(self):
        self.assertIsNone(
            self._previous_state(PREVIOUS_SCENE, current_scene_type="flashback")
        )

    def test_cross_chapter_camera_reference_uses_same_boundary_rules(self):
        async def _camera(scene, scene_type="normal"):
            return await _get_prev_section_tail_camera_continuity(
                novel_id=88,
                script_id=254,
                scene_index=0,
                section_number=1,
                allow_cross_script=True,
                current_scene_name=scene,
                current_scene_type=scene_type,
            )

        same = asyncio.run(_camera(PREVIOUS_SCENE))
        self.assertIsNotNone(same)
        self.assertEqual(same["shot_size"], "中景")
        self.assertIsNone(asyncio.run(_camera(CURRENT_SCENE)))
        self.assertIsNone(asyncio.run(_camera(PREVIOUS_SCENE, "flashback")))

    def test_cross_chapter_fallback_only_applies_to_first_scene_first_section(self):
        self.assertIsNone(
            self._previous_state(PREVIOUS_SCENE, scene_index=1, section_number=1)
        )

    def test_empty_real_previous_tail_does_not_skip_to_older_state(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            """
            INSERT INTO storyboards
                (id, novel_id, script_id, scene_index, section_number, end_state,
                 section_info, scene_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                2,
                88,
                400,
                4,
                1,
                None,
                json.dumps({"scene": "外 城门 夜"}, ensure_ascii=False),
                "normal",
            ),
        )
        conn.commit()
        conn.close()
        self.assertIsNone(self._previous_state("外 城门 夜"))


if __name__ == "__main__":
    unittest.main()
