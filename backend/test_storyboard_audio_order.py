import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

import aiosqlite

from services.storyboard_service import StoryboardService
from database.db import auto_migrate_table


class StoryboardAudioOrderPersistenceTests(unittest.IsolatedAsyncioTestCase):
    async def test_auto_migration_adds_manual_audio_order_to_existing_database(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            db = await aiosqlite.connect(db_path)
            await db.execute("CREATE TABLE storyboards (id INTEGER PRIMARY KEY)")
            await auto_migrate_table(
                db,
                "storyboards",
                """
                CREATE TABLE IF NOT EXISTS storyboards (
                    id INTEGER PRIMARY KEY,
                    manual_audio_order TEXT DEFAULT '[]',
                    jimeng_image_characters TEXT DEFAULT NULL,
                    jimeng_audio_characters TEXT DEFAULT NULL
                )
                """,
            )
            await db.commit()
            columns = {
                row[1]: row
                for row in await (await db.execute("PRAGMA table_info(storyboards)")).fetchall()
            }
            await db.close()
            self.assertIn("manual_audio_order", columns)
            self.assertEqual(columns["manual_audio_order"][4], "'[]'")
            self.assertIn("jimeng_image_characters", columns)
            self.assertIn("jimeng_audio_characters", columns)
            self.assertIn(columns["jimeng_image_characters"][4], (None, "NULL"))
            self.assertIn(columns["jimeng_audio_characters"][4], (None, "NULL"))
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass

    async def test_manual_audio_order_is_deduplicated_and_persisted(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            conn = sqlite3.connect(db_path)
            conn.execute(
                "CREATE TABLE storyboards ("
                "id INTEGER PRIMARY KEY, section_info TEXT, manual_audio_order TEXT)"
            )
            conn.execute(
                "INSERT INTO storyboards(id, section_info, manual_audio_order) "
                "VALUES(1, '{}', '[]')"
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
                    {"manual_audio_order": ["女乙", "女甲", "女乙", ""]},
                )

            conn = sqlite3.connect(db_path)
            raw_value = conn.execute(
                "SELECT manual_audio_order FROM storyboards WHERE id = 1"
            ).fetchone()[0]
            conn.close()
            self.assertEqual(json.loads(raw_value), ["女乙", "女甲"])
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass

    async def test_jimeng_reference_lists_preserve_null_auto_and_explicit_empty(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            conn = sqlite3.connect(db_path)
            conn.execute(
                "CREATE TABLE storyboards ("
                "id INTEGER PRIMARY KEY, section_info TEXT, "
                "jimeng_image_characters TEXT NULL, "
                "jimeng_audio_characters TEXT NULL)"
            )
            conn.execute(
                "INSERT INTO storyboards("
                "id, section_info, jimeng_image_characters, jimeng_audio_characters"
                ") VALUES(1, '{}', NULL, NULL)"
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
                    {
                        "jimeng_image_characters": [],
                        "jimeng_audio_characters": ["女乙", "女乙", ""],
                    },
                )

            conn = sqlite3.connect(db_path)
            image_raw, audio_raw = conn.execute(
                "SELECT jimeng_image_characters, jimeng_audio_characters "
                "FROM storyboards WHERE id = 1"
            ).fetchone()
            self.assertEqual(json.loads(image_raw), [])
            self.assertEqual(json.loads(audio_raw), ["女乙"])
            conn.close()

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
                    {
                        "jimeng_image_characters": None,
                        "jimeng_audio_characters": None,
                    },
                )

            conn = sqlite3.connect(db_path)
            values = conn.execute(
                "SELECT jimeng_image_characters, jimeng_audio_characters "
                "FROM storyboards WHERE id = 1"
            ).fetchone()
            conn.close()
            self.assertEqual(values, (None, None))
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass


if __name__ == "__main__":
    unittest.main()
