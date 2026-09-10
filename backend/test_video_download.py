import os
import sys
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

from aiohttp import web


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from api.video import (
    RetryDownloadRequest,
    _download_remote_video_with_diagnostics,
    retry_download_video,
)


class _FakeCursor:
    def __init__(self, row):
        self.row = row

    async def fetchone(self):
        return self.row


class _FakeDb:
    def __init__(self, row):
        self.row = row

    async def execute(self, _sql, _params):
        return _FakeCursor(self.row)

    async def close(self):
        return None


class RemoteVideoDownloadTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.runner = None

    async def asyncTearDown(self):
        if self.runner is not None:
            await self.runner.cleanup()

    async def _serve(self, handler):
        app = web.Application()
        app.router.add_get("/video.mp4", handler)
        self.runner = web.AppRunner(app)
        await self.runner.setup()
        site = web.TCPSite(self.runner, "127.0.0.1", 0)
        await site.start()
        port = site._server.sockets[0].getsockname()[1]
        return f"http://127.0.0.1:{port}/video.mp4"

    async def test_interrupted_download_resumes_with_range_and_is_atomic(self):
        payload = b"\x00\x00\x00\x18ftypmp42" + (b"video-data-" * 50_000)
        first_piece_size = len(payload) // 3
        range_headers = []
        request_count = 0

        async def handler(request):
            nonlocal request_count
            request_count += 1
            self.assertIn("Mozilla/5.0", request.headers.get("User-Agent", ""))
            range_headers.append(request.headers.get("Range"))

            if request_count == 1:
                response = web.StreamResponse(
                    status=200,
                    headers={
                        "Content-Type": "video/mp4",
                        "Content-Length": str(len(payload)),
                    },
                )
                await response.prepare(request)
                await response.write(payload[:first_piece_size])
                # 模拟 CDN 下载到一半断流。客户端应保留 .part，第二轮发 Range 续传。
                request.transport.close()
                return response

            range_header = request.headers.get("Range") or ""
            start = int(range_header.removeprefix("bytes=").removesuffix("-"))
            return web.Response(
                status=206,
                body=payload[start:],
                headers={
                    "Content-Type": "video/mp4",
                    "Content-Range": f"bytes {start}-{len(payload) - 1}/{len(payload)}",
                    "Content-Length": str(len(payload) - start),
                },
            )

        url = await self._serve(handler)
        with tempfile.TemporaryDirectory() as videos_dir:
            with patch(
                "api.video._build_friendly_video_path",
                new=AsyncMock(return_value=("测试", "S01-01.mp4")),
            ):
                local_url, error = await _download_remote_video_with_diagnostics(
                    123,
                    url,
                    videos_dir,
                    provider_type="cool",
                    max_attempts=2,
                    attempt_timeout_seconds=30,
                )

            self.assertEqual(local_url, "/data/videos/测试/S01-01.mp4")
            self.assertIsNone(error)
            self.assertEqual(request_count, 2)
            self.assertIsNone(range_headers[0])
            self.assertEqual(range_headers[1], f"bytes={first_piece_size}-")

            target = os.path.join(videos_dir, "测试", "S01-01.mp4")
            self.assertTrue(os.path.isfile(target))
            self.assertFalse(os.path.exists(target + ".part"))
            with open(target, "rb") as downloaded:
                self.assertEqual(downloaded.read(), payload)

    async def test_html_or_json_error_body_is_not_saved_as_mp4(self):
        async def handler(_request):
            return web.json_response({"error": "signed url expired"})

        url = await self._serve(handler)
        with tempfile.TemporaryDirectory() as videos_dir:
            with patch(
                "api.video._build_friendly_video_path",
                new=AsyncMock(return_value=("测试", "expired.mp4")),
            ):
                local_url, error = await _download_remote_video_with_diagnostics(
                    456,
                    url,
                    videos_dir,
                    provider_type="cool",
                    max_attempts=1,
                    attempt_timeout_seconds=30,
                )

            self.assertIsNone(local_url)
            self.assertIn("不是视频", error or "")
            target = os.path.join(videos_dir, "测试", "expired.mp4")
            self.assertFalse(os.path.exists(target))
            self.assertFalse(os.path.exists(target + ".part"))

    async def test_retry_endpoint_refreshes_cool_url_after_saved_url_fails(self):
        row = {
            "video_status": "download_failed",
            "video_url": "https://old.example/video.mp4",
            "submit_id": "9bf01916298f",
            "video_provider": "cool",
        }
        fake_db = _FakeDb(row)
        with tempfile.TemporaryDirectory() as videos_dir:
            with (
                patch("database.db.get_db", new=AsyncMock(return_value=fake_db)),
                patch("api.video.media_subdir", return_value=videos_dir),
                patch(
                    "api.video._download_remote_video_with_diagnostics",
                    new=AsyncMock(return_value=(None, "直连 HTTP 403")),
                ) as download_mock,
                patch(
                    "api.video._poll_storyboard_via_cloud",
                    new=AsyncMock(
                        return_value={
                            "id": 789,
                            "video_status": "done",
                            "video_url": "/data/videos/refreshed.mp4",
                        }
                    ),
                ) as refresh_mock,
            ):
                result = await retry_download_video(RetryDownloadRequest(storyboard_id=789))

        self.assertTrue(result["success"])
        self.assertEqual(result["video_url"], "/data/videos/refreshed.mp4")
        download_mock.assert_awaited_once()
        refresh_mock.assert_awaited_once_with(
            789,
            "9bf01916298f",
            provider_type="cool",
        )

    async def test_retry_endpoint_reports_failure_reason_instead_of_looking_unresponsive(self):
        row = {
            "video_status": "download_failed",
            "video_url": "https://old.example/video.mp4",
            "submit_id": "",
            "video_provider": "jimeng",
        }
        fake_db = _FakeDb(row)
        update_status = AsyncMock()
        with tempfile.TemporaryDirectory() as videos_dir:
            with (
                patch("database.db.get_db", new=AsyncMock(return_value=fake_db)),
                patch("api.video.media_subdir", return_value=videos_dir),
                patch(
                    "api.video._download_remote_video_with_diagnostics",
                    new=AsyncMock(return_value=(None, "直连 TimeoutError")),
                ),
                patch(
                    "api.video.storyboard_service.update_video_status",
                    new=update_status,
                ),
            ):
                result = await retry_download_video(RetryDownloadRequest(storyboard_id=790))

        self.assertFalse(result["success"])
        self.assertEqual(result["video_status"], "download_failed")
        self.assertIn("TimeoutError", result["message"])
        update_status.assert_awaited_once()


if __name__ == "__main__":
    unittest.main()
