import json
import unittest
from unittest.mock import patch

from services import template_service


class _FakeResponse:
    def __init__(self, status, payload):
        self.status = status
        self._payload = payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def json(self):
        return self._payload

    async def text(self):
        return json.dumps(self._payload, ensure_ascii=False)


class _FakeSession:
    def __init__(self, captured, response):
        self._captured = captured
        self._response = response

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def post(self, url, data, headers, timeout):
        self._captured["url"] = url
        self._captured["body"] = json.loads(data.decode("utf-8"))
        return self._response


class TemplateContentFetchTests(unittest.IsolatedAsyncioTestCase):
    async def test_admin_id_is_used_before_stale_local_name(self):
        captured = {}
        response = _FakeResponse(200, {"template_id": 58, "content": "真实模板内容"})

        with (
            patch.object(
                template_service.aiohttp,
                "ClientSession",
                return_value=_FakeSession(captured, response),
            ),
            patch.object(template_service, "get_aiohttp_connector", return_value=None),
            patch(
                "services.license_context.get_context",
                return_value={"license_key": "license", "machine_id": "machine"},
            ),
            patch("utils.client_signature.sign_request", return_value={}),
        ):
            fetched_id, content = await template_service._fetch_content_from_admin(
                "角色提取模板【千人千面版】【3D真人】",
                "character_extraction",
                admin_id=58,
            )

        self.assertEqual(fetched_id, 58)
        self.assertEqual(content, "真实模板内容")
        self.assertEqual(captured["body"]["template_id"], 58)
        self.assertEqual(captured["body"]["product_code"], "comic")
        self.assertNotIn("name", captured["body"])
        self.assertNotIn("category", captured["body"])


if __name__ == "__main__":
    unittest.main()
