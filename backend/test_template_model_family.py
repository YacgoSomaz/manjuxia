import os
import tempfile
import unittest

import database.db as db_module
from database.db import init_db
from models.templates import TemplateCreate, TemplateUpdate
from services import template_service


class TemplateModelFamilyTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        handle, self.db_path = tempfile.mkstemp(suffix=".db")
        os.close(handle)
        os.remove(self.db_path)
        self.old_db_path = db_module.DB_PATH
        db_module.DB_PATH = self.db_path
        await init_db()

    async def asyncTearDown(self):
        db_module.DB_PATH = self.old_db_path
        for suffix in ("", "-shm", "-wal"):
            try:
                os.remove(self.db_path + suffix)
            except FileNotFoundError:
                pass

    async def test_storyboard_template_persists_model_family(self):
        created = await template_service.create(
            TemplateCreate(
                name="Seedance 2.5 测试模板",
                category="storyboard_generation",
                content="模板正文",
                model_family="seedance_2_5",
            )
        )
        self.assertEqual(created["model_family"], "seedance_2_5")

        updated = await template_service.update(
            created["id"],
            TemplateUpdate(model_family="seedance_2_0"),
        )
        self.assertEqual(updated["model_family"], "seedance_2_0")

    async def test_non_storyboard_template_does_not_keep_model_family(self):
        created = await template_service.create(
            TemplateCreate(
                name="风格模板",
                category="style_prompt",
                content="风格正文",
                model_family="seedance_2_5",
            )
        )
        self.assertEqual(created["model_family"], "")

    def test_invalid_storyboard_family_falls_back_to_seedance_2_0(self):
        self.assertEqual(
            template_service._normalize_model_family(
                "not-a-model",
                "storyboard_generation",
            ),
            "seedance_2_0",
        )


if __name__ == "__main__":
    unittest.main()
