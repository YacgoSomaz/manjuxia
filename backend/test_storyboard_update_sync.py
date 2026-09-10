import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

import aiosqlite

from services.storyboard_service import (
    StoryboardService,
    _extract_explicit_visible_character_names,
    repair_empty_storyboard_character_associations,
)


class StoryboardUpdateSyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_character_edit_keeps_section_info_in_sync(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            conn = sqlite3.connect(db_path)
            conn.execute(
                "CREATE TABLE storyboards "
                "(id INTEGER PRIMARY KEY, characters TEXT, section_info TEXT)"
            )
            conn.execute(
                "INSERT INTO storyboards(id, characters, section_info) VALUES(1, ?, ?)",
                (
                    json.dumps(["沈昭昭", "裴砚之", "裴明珠", "玄七"], ensure_ascii=False),
                    json.dumps(
                        {
                            "scene": "西山别院暖阁",
                            "characters": "沈昭昭, 裴砚之, 裴明珠, 玄七",
                        },
                        ensure_ascii=False,
                    ),
                ),
            )
            conn.commit()
            conn.close()

            async def fake_get_db():
                db = await aiosqlite.connect(db_path)
                db.row_factory = aiosqlite.Row
                return db

            with (
                patch("services.storyboard_service.get_db", new=fake_get_db),
                patch.object(
                    StoryboardService,
                    "get_storyboard",
                    new=AsyncMock(return_value={"id": 1}),
                ),
            ):
                await StoryboardService.update_storyboard(
                    1,
                    {"characters": ["沈昭昭", "裴砚之", "沈昭昭"]},
                )

            conn = sqlite3.connect(db_path)
            characters_raw, section_info_raw = conn.execute(
                "SELECT characters, section_info FROM storyboards WHERE id = 1"
            ).fetchone()
            conn.close()

            self.assertEqual(json.loads(characters_raw), ["沈昭昭", "裴砚之"])
            section_info = json.loads(section_info_raw)
            self.assertEqual(section_info["scene"], "西山别院暖阁")
            self.assertEqual(section_info["characters"], "沈昭昭, 裴砚之")
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass

    async def test_repair_empty_character_links_from_a_plus_whitelist(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            conn = sqlite3.connect(db_path)
            conn.execute(
                "CREATE TABLE storyboards ("
                "id INTEGER PRIMARY KEY, novel_id INTEGER, prompt TEXT, "
                "description TEXT, characters TEXT, section_info TEXT)"
            )
            conn.execute(
                "CREATE TABLE extracted_elements ("
                "id INTEGER PRIMARY KEY, novel_id INTEGER, "
                "element_type TEXT, name TEXT, aliases TEXT DEFAULT '[]')"
            )
            conn.executemany(
                "INSERT INTO extracted_elements("
                "id, novel_id, element_type, name) VALUES(?, 1, 'character', ?)",
                [(1, "沈昭昭"), (2, "裴砚之"), (3, "裴明珠")],
            )
            prompt = (
                "人物:S0=沈昭昭[C01] / IN=裴砚之[C02] / OUT=无 / "
                "实际出镜=沈昭昭[C01]、裴砚之[C02] / "
                "画外发声=裴明珠[C03]\n"
                "本镜人物白名单:可见人物=沈昭昭[C01]、裴砚之[C02] / "
                "局部可见人物=无 / 画外声源=裴明珠[C03]"
            )
            conn.execute(
                "INSERT INTO storyboards("
                "id, novel_id, prompt, description, characters, section_info"
                ") VALUES(1, 1, ?, ?, '[]', ?)",
                (
                    prompt,
                    prompt,
                    json.dumps({"scene": "西山别院暖阁"}, ensure_ascii=False),
                ),
            )
            conn.commit()
            conn.close()

            async def fake_get_db():
                db = await aiosqlite.connect(db_path)
                db.row_factory = aiosqlite.Row
                return db

            with patch("database.db.get_db", new=fake_get_db):
                stats = await repair_empty_storyboard_character_associations()

            conn = sqlite3.connect(db_path)
            characters_raw, section_info_raw = conn.execute(
                "SELECT characters, section_info FROM storyboards WHERE id = 1"
            ).fetchone()
            conn.close()

            self.assertEqual(stats["repaired"], 1)
            self.assertEqual(json.loads(characters_raw), ["沈昭昭", "裴砚之"])
            self.assertEqual(
                json.loads(section_info_raw)["characters"],
                "沈昭昭, 裴砚之",
            )
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass

    async def test_repair_does_not_invent_people_for_explicit_empty_shot(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            conn = sqlite3.connect(db_path)
            conn.execute(
                "CREATE TABLE storyboards ("
                "id INTEGER PRIMARY KEY, novel_id INTEGER, prompt TEXT, "
                "description TEXT, characters TEXT, section_info TEXT)"
            )
            conn.execute(
                "CREATE TABLE extracted_elements ("
                "id INTEGER PRIMARY KEY, novel_id INTEGER, "
                "element_type TEXT, name TEXT, aliases TEXT DEFAULT '[]')"
            )
            conn.execute(
                "INSERT INTO extracted_elements("
                "id, novel_id, element_type, name) "
                "VALUES(1, 1, 'character', '裴明珠')"
            )
            prompt = (
                "本镜人物白名单:可见人物=无 / 局部可见人物=无 / "
                "画外声源=裴明珠[C03]"
            )
            conn.execute(
                "INSERT INTO storyboards("
                "id, novel_id, prompt, description, characters, section_info"
                ") VALUES(1, 1, ?, ?, '[]', '{}')",
                (prompt, prompt),
            )
            conn.commit()
            conn.close()

            async def fake_get_db():
                db = await aiosqlite.connect(db_path)
                db.row_factory = aiosqlite.Row
                return db

            with patch("database.db.get_db", new=fake_get_db):
                stats = await repair_empty_storyboard_character_associations()

            conn = sqlite3.connect(db_path)
            characters_raw = conn.execute(
                "SELECT characters FROM storyboards WHERE id = 1"
            ).fetchone()[0]
            conn.close()

            self.assertEqual(stats["repaired"], 0)
            self.assertEqual(stats["skipped_explicit_empty"], 1)
            self.assertEqual(json.loads(characters_raw), [])
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass

    async def test_repair_cloud_nickname_whitelist_to_canonical_character(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            conn = sqlite3.connect(db_path)
            conn.execute(
                "CREATE TABLE storyboards ("
                "id INTEGER PRIMARY KEY, novel_id INTEGER, prompt TEXT, "
                "description TEXT, characters TEXT, section_info TEXT)"
            )
            conn.execute(
                "CREATE TABLE extracted_elements ("
                "id INTEGER PRIMARY KEY, novel_id INTEGER, "
                "element_type TEXT, name TEXT, aliases TEXT DEFAULT '[]')"
            )
            conn.executemany(
                "INSERT INTO extracted_elements("
                "id, novel_id, element_type, name, aliases"
                ") VALUES(?, 1, 'character', ?, ?)",
                [
                    (1, "白清寒", json.dumps(["小白"], ensure_ascii=False)),
                    (2, "林渊", json.dumps(["阿渊"], ensure_ascii=False)),
                ],
            )
            prompt = (
                "【本节人物与道具白名单】起始在场=小白、阿渊 / "
                "本节实际出镜=小白、阿渊 / 本节画外发声=无\n"
                "本镜人物白名单:本镜可见人物=小白、阿渊 / "
                "本镜局部可见人物=无"
            )
            conn.execute(
                "INSERT INTO storyboards("
                "id, novel_id, prompt, description, characters, section_info"
                ") VALUES(1, 1, ?, ?, '[]', '{}')",
                (prompt, prompt),
            )
            conn.commit()
            conn.close()

            async def fake_get_db():
                db = await aiosqlite.connect(db_path)
                db.row_factory = aiosqlite.Row
                return db

            with patch("database.db.get_db", new=fake_get_db):
                stats = await repair_empty_storyboard_character_associations()

            conn = sqlite3.connect(db_path)
            characters_raw = conn.execute(
                "SELECT characters FROM storyboards WHERE id = 1"
            ).fetchone()[0]
            conn.close()

            self.assertEqual(stats["repaired"], 1)
            self.assertEqual(json.loads(characters_raw), ["白清寒", "林渊"])
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass

    async def test_repair_old_template_character_line_with_cloud_nickname(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            conn = sqlite3.connect(db_path)
            conn.execute(
                "CREATE TABLE storyboards ("
                "id INTEGER PRIMARY KEY, novel_id INTEGER, prompt TEXT, "
                "description TEXT, characters TEXT, section_info TEXT)"
            )
            conn.execute(
                "CREATE TABLE extracted_elements ("
                "id INTEGER PRIMARY KEY, novel_id INTEGER, "
                "element_type TEXT, name TEXT, aliases TEXT DEFAULT '[]')"
            )
            conn.execute(
                "INSERT INTO extracted_elements("
                "id, novel_id, element_type, name, aliases"
                ") VALUES(1, 1, 'character', '白清寒', ?)",
                (json.dumps(["小白"], ensure_ascii=False),),
            )
            prompt = "场景：山门\n人物：小白\n镜号1：小白抬头。"
            conn.execute(
                "INSERT INTO storyboards("
                "id, novel_id, prompt, description, characters, section_info"
                ") VALUES(1, 1, ?, ?, '[]', '{}')",
                (prompt, prompt),
            )
            conn.commit()
            conn.close()

            async def fake_get_db():
                db = await aiosqlite.connect(db_path)
                db.row_factory = aiosqlite.Row
                return db

            with patch("database.db.get_db", new=fake_get_db):
                stats = await repair_empty_storyboard_character_associations()

            conn = sqlite3.connect(db_path)
            characters_raw = conn.execute(
                "SELECT characters FROM storyboards WHERE id = 1"
            ).fetchone()[0]
            conn.close()

            self.assertEqual(stats["repaired"], 1)
            self.assertEqual(stats["repaired_from_legacy"], 1)
            self.assertEqual(json.loads(characters_raw), ["白清寒"])
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass

    def test_shared_nickname_is_not_guessed(self):
        refs = [
            {"name": "林渊", "aliases": ["殿下"]},
            {"name": "萧衡", "aliases": ["殿下"]},
        ]
        resolved = _extract_explicit_visible_character_names(
            "本节实际出镜=殿下",
            refs,
        )
        self.assertIsNone(resolved)


if __name__ == "__main__":
    unittest.main()
