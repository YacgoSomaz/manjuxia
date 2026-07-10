import asyncio
import os
import shutil
import tempfile
import unittest


_DATA_DIR = tempfile.mkdtemp(prefix="wanshan-llm-test-")
os.environ["WANSHAN_DATA_DIR"] = _DATA_DIR
os.environ.pop("WANSHAN_ENABLE_CLOUD", None)

from database.db import init_db
from database.db import get_db
from models.llm_configs import LLMConfigCreate
from services.llm_service import LLMService


class LocalLlmConfigTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(_DATA_DIR, ignore_errors=True)

    async def asyncSetUp(self):
        await init_db()

    async def test_offline_mode_reads_created_local_config(self):
        created = await LLMService.create(
            LLMConfigCreate(
                name="DeepSeek local test",
                base_url="https://api.deepseek.com/v1",
                api_key="test-key-only",
                model_name="deepseek-chat",
                max_tokens=1024,
                context_window=65536,
            )
        )

        self.assertEqual(created["name"], "DeepSeek local test")
        self.assertEqual(created["model_name"], "deepseek-chat")

        db = await get_db()
        try:
            cursor = await db.execute("SELECT api_key FROM llm_configs WHERE id = ?", (created["id"],))
            stored_key = (await cursor.fetchone())["api_key"]
        finally:
            await db.close()
        self.assertTrue(stored_key.startswith("dpapi:"))
        self.assertNotIn("test-key-only", stored_key)

        configs = await LLMService.get_all("llm")
        self.assertEqual(len(configs), 1)
        self.assertEqual(configs[0]["id"], created["id"])
        self.assertEqual(configs[0]["api_key"], "test****only")


if __name__ == "__main__":
    unittest.main()
