import asyncio
import hashlib
import hmac
import os
import shutil
import tempfile
import time
import unittest


_DATA_DIR = tempfile.mkdtemp(prefix="wanshan-signature-test-")
os.environ["WANSHAN_DATA_DIR"] = _DATA_DIR

from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.llm_configs import router
from database.db import init_db
from utils.local_secret import get_or_create_session_secret


def signed_headers(path: str, body: bytes = b"") -> dict[str, str]:
    license_key = "anonymous"
    nonce = "a" * 32
    timestamp = str(int(time.time()))
    body_hash = hashlib.sha256(body).hexdigest()
    message = f"{license_key}|{path}|{timestamp}|{nonce}|{body_hash}".encode("utf-8")
    token = hmac.new(get_or_create_session_secret(), message, hashlib.sha256).hexdigest()
    return {
        "X-Session-License": license_key,
        "X-Session-Nonce": nonce,
        "X-Session-Timestamp": timestamp,
        "X-Session-Token": token,
    }


class LlmConfigSignatureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        asyncio.run(init_db())
        cls.app = FastAPI()
        cls.app.include_router(router)
        cls.client = TestClient(cls.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        shutil.rmtree(_DATA_DIR, ignore_errors=True)

    def test_llm_config_list_requires_valid_local_signature(self):
        self.assertEqual(self.client.get("/api/llm-configs/").status_code, 403)
        response = self.client.get("/api/llm-configs/", headers=signed_headers("/api/llm-configs/"))
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
