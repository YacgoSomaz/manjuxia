import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from services.image_service import ImageService


class _FakeResponse:
    def __init__(self, status_code: int):
        self.status_code = status_code
        self.content = (
            b"\x89PNG\r\n\x1a\nmock-image"
            if status_code == 200
            else b"<html>not found</html>"
        )
        self.headers = {
            "content-type": "image/png" if status_code == 200 else "text/html"
        }


class _FakeAsyncClient:
    statuses = []
    calls = 0
    urls = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url, headers=None):
        type(self).calls += 1
        type(self).urls.append(url)
        return _FakeResponse(type(self).statuses.pop(0))


class ImageDownloadTests(unittest.IsolatedAsyncioTestCase):
    async def test_retries_404_then_saves_image(self):
        _FakeAsyncClient.statuses = [404, 404, 200]
        _FakeAsyncClient.calls = 0
        _FakeAsyncClient.urls = []
        with tempfile.TemporaryDirectory() as tmp_dir:
            with patch.object(ImageService, "_ensure_images_dir", return_value=tmp_dir), patch(
                "services.image_service.httpx.AsyncClient", _FakeAsyncClient
            ):
                result = await ImageService._download_image(
                    "https://example.test/result.png",
                    "retry.png",
                    retry_404_delays=[0],
                )

            self.assertEqual(result, "data/images/retry.png")
            self.assertTrue((Path(tmp_dir) / "retry.png").exists())
            self.assertEqual(_FakeAsyncClient.calls, 3)

    async def test_permanent_404_does_not_create_file(self):
        _FakeAsyncClient.statuses = [404, 404, 404, 404]
        _FakeAsyncClient.calls = 0
        _FakeAsyncClient.urls = []
        with tempfile.TemporaryDirectory() as tmp_dir:
            with patch.object(ImageService, "_ensure_images_dir", return_value=tmp_dir), patch(
                "services.image_service.httpx.AsyncClient", _FakeAsyncClient
            ):
                result = await ImageService._download_image(
                    "https://example.test/missing.png",
                    "missing.png",
                    retry_404_delays=[0],
                )

            self.assertIsNone(result)
            self.assertFalse((Path(tmp_dir) / "missing.png").exists())
            self.assertEqual(_FakeAsyncClient.calls, 4)

    async def test_cool_short_url_is_downloaded_from_final_cdn(self):
        _FakeAsyncClient.statuses = [200]
        _FakeAsyncClient.calls = 0
        _FakeAsyncClient.urls = []
        with tempfile.TemporaryDirectory() as tmp_dir:
            with patch.object(ImageService, "_ensure_images_dir", return_value=tmp_dir), patch(
                "services.image_service.httpx.AsyncClient", _FakeAsyncClient
            ):
                result = await ImageService._download_image(
                    "https://cnd.uidp.cn/?id=abc123.png",
                    "cool.png",
                )

            self.assertEqual(result, "data/images/cool.png")
            self.assertEqual(_FakeAsyncClient.urls, ["https://cdn.mjapi.cc.cd/abc123.png"])

    async def test_transient_500_retries_and_cool_retry_bypasses_cache(self):
        _FakeAsyncClient.statuses = [500, 500, 200]
        _FakeAsyncClient.calls = 0
        _FakeAsyncClient.urls = []
        diagnostics = {}
        with tempfile.TemporaryDirectory() as tmp_dir:
            with patch.object(ImageService, "_ensure_images_dir", return_value=tmp_dir), patch(
                "services.image_service.httpx.AsyncClient", _FakeAsyncClient
            ):
                result = await ImageService._download_image(
                    "https://cnd.uidp.cn/?id=delayed.png",
                    "delayed.png",
                    retry_404_delays=[0],
                    diagnostics=diagnostics,
                )

            self.assertEqual(result, "data/images/delayed.png")
            self.assertEqual(_FakeAsyncClient.calls, 3)
            self.assertEqual(_FakeAsyncClient.urls[0], "https://cdn.mjapi.cc.cd/delayed.png")
            self.assertEqual(_FakeAsyncClient.urls[1], "https://cdn.mjapi.cc.cd/delayed.png")
            self.assertIn("_qianshan_retry=", _FakeAsyncClient.urls[2])
            self.assertEqual(diagnostics.get("error"), "")

    def test_cool_remote_ref_round_trip(self):
        value = ImageService._build_cool_remote_ref(
            "task-123",
            "https://cnd.uidp.cn/?id=result.png",
        )
        self.assertEqual(
            ImageService._parse_cool_remote_ref(value),
            ("task-123", "https://cnd.uidp.cn/?id=result.png"),
        )
        self.assertIsNone(
            ImageService._parse_cool_remote_ref("https://example.test/result.png")
        )


if __name__ == "__main__":
    unittest.main()
