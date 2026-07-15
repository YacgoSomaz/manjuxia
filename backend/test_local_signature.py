import hashlib
import hmac
import time
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

from utils import local_signature


async def empty_receive():
    return {"type": "http.request", "body": b"", "more_body": False}


def signed_request(secret: bytes, nonce: str) -> Request:
    path = "/api/templates/"
    timestamp = str(int(time.time()))
    license_key = "anonymous"
    body_hash = hashlib.sha256(b"").hexdigest()
    message = f"{license_key}|{path}|{timestamp}|{nonce}|{body_hash}".encode("utf-8")
    token = hmac.new(secret, message, hashlib.sha256).hexdigest()
    return Request({
        "type": "http",
        "method": "GET",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": b"",
        "headers": [
            (b"x-session-license", license_key.encode("utf-8")),
            (b"x-session-nonce", nonce.encode("utf-8")),
            (b"x-session-timestamp", timestamp.encode("utf-8")),
            (b"x-session-token", token.encode("utf-8")),
        ],
        "server": ("127.0.0.1", 8000),
        "scheme": "http",
    }, receive=empty_receive)


class LocalSignatureTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        local_signature._nonce_seen.clear()

    async def test_route_dependency_reuses_middleware_verification_on_same_request(self):
        secret = b"x" * 32
        request = signed_request(secret, "a" * 32)
        with patch("utils.local_secret.get_or_create_session_secret", return_value=secret):
            first = await local_signature.require_local_signature(request)
            second = await local_signature.require_local_signature(request)
        self.assertIs(first, second)
        self.assertEqual(first["license_key"], "anonymous")

    async def test_nonce_is_still_rejected_when_replayed_in_a_different_request(self):
        secret = b"y" * 32
        with patch("utils.local_secret.get_or_create_session_secret", return_value=secret):
            await local_signature.require_local_signature(signed_request(secret, "b" * 32))
            with self.assertRaises(HTTPException) as error:
                await local_signature.require_local_signature(signed_request(secret, "b" * 32))
        self.assertEqual(error.exception.detail, "nonce_reused")


if __name__ == "__main__":
    unittest.main()
