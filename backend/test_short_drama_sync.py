import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

import aiosqlite

from api.short_drama_sync import (
    _build_existing_element_indexes,
    _merge_alias_values,
    _short_drama_item_aliases,
    repair_short_drama_character_aliases,
)


class ShortDramaSyncTests(unittest.IsolatedAsyncioTestCase):
    def test_cloud_nickname_becomes_alias_without_overwriting_existing(self):
        incoming = _short_drama_item_aliases(
            {
                "name": "白清寒",
                "nickname": "小白／白白",
                "aliases": ["白小姐"],
            },
            "白清寒",
        )
        merged = _merge_alias_values(
            json.dumps(["白姑娘"], ensure_ascii=False),
            incoming,
            "白清寒",
        )
        self.assertEqual(merged, ["白姑娘", "白小姐", "小白", "白白"])

    def test_remote_ids_are_isolated_by_element_type(self):
        rows = [
            {
                "id": 11,
                "element_type": "character",
                "name": "白清寒",
                "remote_id": "7",
                "aliases": "[]",
            },
            {
                "id": 22,
                "element_type": "scene",
                "name": "山门",
                "remote_id": "7",
                "aliases": "[]",
            },
            {
                "id": 33,
                "element_type": "prop",
                "name": "长剑",
                "remote_id": "7",
                "aliases": "[]",
            },
        ]
        by_remote, _ = _build_existing_element_indexes(rows)
        self.assertEqual(by_remote[("character", "7")]["id"], 11)
        self.assertEqual(by_remote[("scene", "7")]["id"], 22)
        self.assertEqual(by_remote[("prop", "7")]["id"], 33)

    async def test_backfill_historical_nickname_from_attributes(self):
        handle, db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        try:
            conn = sqlite3.connect(db_path)
            conn.execute(
                "CREATE TABLE extracted_elements ("
                "id INTEGER PRIMARY KEY, name TEXT, aliases TEXT, attributes TEXT, "
                "remote_source TEXT, element_type TEXT, updated_at TEXT)"
            )
            conn.execute(
                "INSERT INTO extracted_elements("
                "id, name, aliases, attributes, remote_source, element_type"
                ") VALUES(1, '白清寒', ?, ?, 'short_drama', 'character')",
                (
                    json.dumps(["白姑娘"], ensure_ascii=False),
                    json.dumps(
                        {"name": "白清寒", "nickname": "小白/白白"},
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
                patch("api.short_drama_sync.get_db", new=fake_get_db),
                patch(
                    "api.short_drama_sync._ensure_sync_columns",
                    new=AsyncMock(return_value=None),
                ),
            ):
                stats = await repair_short_drama_character_aliases()

            conn = sqlite3.connect(db_path)
            aliases_raw = conn.execute(
                "SELECT aliases FROM extracted_elements WHERE id = 1"
            ).fetchone()[0]
            conn.close()

            self.assertEqual(stats, {"scanned": 1, "repaired": 1})
            self.assertEqual(
                json.loads(aliases_raw),
                ["白姑娘", "小白", "白白"],
            )
        finally:
            try:
                os.remove(db_path)
            except FileNotFoundError:
                pass


if __name__ == "__main__":
    unittest.main()
