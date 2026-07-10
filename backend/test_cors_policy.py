import unittest

from fastapi.testclient import TestClient
from main import app


class CorsPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_only_electron_file_origin_receives_cors_permission(self):
        allowed = self.client.options(
            "/api/health",
            headers={"Origin": "null", "Access-Control-Request-Method": "GET"},
        )
        self.assertEqual(allowed.headers.get("access-control-allow-origin"), "null")

        rejected = self.client.options(
            "/api/health",
            headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
        )
        self.assertIsNone(rejected.headers.get("access-control-allow-origin"))


if __name__ == "__main__":
    unittest.main()
