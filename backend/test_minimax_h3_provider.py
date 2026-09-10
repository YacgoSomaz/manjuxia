import os
import sys
import unittest
from unittest.mock import AsyncMock, patch


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.video_providers import get_provider
from services.video_providers.minimax_h3 import MiniMaxH3Provider
from services.queue_worker import QueueWorker


class MiniMaxH3ProviderTests(unittest.IsolatedAsyncioTestCase):
    def make_provider(self) -> MiniMaxH3Provider:
        return MiniMaxH3Provider({"api_key": "test-key"})

    async def test_submit_builds_official_multimodal_content(self):
        provider = self.make_provider()
        provider._post = AsyncMock(
            return_value={"status_code": 200, "body": {"task_id": "h3-task-1"}}
        )

        result = await provider.submit(
            prompt="两人正反打交谈，动作自然。",
            images=["https://example.com/character.png"],
            audios=["https://example.com/voice.mp3"],
            params={"duration": 10, "ratio": "9:16", "resolution": "2K"},
        )

        self.assertTrue(result.success)
        self.assertEqual(result.submit_id, "h3-task-1")
        provider._post.assert_awaited_once()
        path, payload = provider._post.await_args.args[:2]
        self.assertEqual(path, "/v2/video_generation")
        self.assertEqual(payload["model"], "MiniMax-H3")
        self.assertEqual(payload["resolution"], "2K")
        self.assertEqual(payload["duration"], 10)
        self.assertEqual(payload["ratio"], "9:16")
        self.assertEqual(
            [item["type"] for item in payload["content"]],
            ["text", "image_url", "audio_url"],
        )
        self.assertEqual(payload["content"][1]["role"], "reference_image")
        self.assertEqual(payload["content"][2]["role"], "reference_audio")

    async def test_submit_rejects_audio_only_reference(self):
        provider = self.make_provider()
        provider._post = AsyncMock()

        result = await provider.submit(
            prompt="测试",
            audios=["https://example.com/voice.mp3"],
            params={"duration": 5, "ratio": "9:16"},
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_PARAM")
        self.assertIn("不可只传音频", result.fail_reason or "")
        provider._post.assert_not_awaited()

    async def test_submit_rejects_prompt_over_7000_characters(self):
        provider = self.make_provider()
        result = await provider.submit(
            prompt="镜" * 7001,
            params={"duration": 5, "ratio": "9:16"},
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_PARAM")
        self.assertIn("7000", result.fail_reason or "")

    async def test_submit_rejects_duration_outside_4_to_15_seconds(self):
        provider = self.make_provider()
        for duration in (3, 16, 5.5):
            with self.subTest(duration=duration):
                result = await provider.submit(
                    prompt="测试",
                    params={"duration": duration, "ratio": "9:16"},
                )
                self.assertFalse(result.success)
                self.assertEqual(result.error_code, "INVALID_PARAM")

    async def test_submit_rejects_reference_count_over_limits(self):
        provider = self.make_provider()
        too_many_images = [f"https://example.com/{index}.png" for index in range(10)]
        too_many_audios = [f"https://example.com/{index}.mp3" for index in range(4)]

        image_result = await provider.submit(
            prompt="测试",
            images=too_many_images,
            params={"duration": 5, "ratio": "9:16"},
        )
        audio_result = await provider.submit(
            prompt="测试",
            images=["https://example.com/character.png"],
            audios=too_many_audios,
            params={"duration": 5, "ratio": "9:16"},
        )

        self.assertFalse(image_result.success)
        self.assertIn("最多 9 张", image_result.fail_reason or "")
        self.assertFalse(audio_result.success)
        self.assertIn("最多 3 段", audio_result.fail_reason or "")

    async def test_query_maps_success_and_failure(self):
        provider = self.make_provider()
        provider._get = AsyncMock(
            side_effect=[
                {
                    "status_code": 200,
                    "body": {
                        "task": {
                            "status": "succeeded",
                            "content": {"url": "https://example.com/result.mp4"},
                            "duration": 12,
                        }
                    },
                },
                {
                    "status_code": 200,
                    "body": {
                        "task": {
                            "status": "failed",
                            "error": {"code": "1026", "message": "sensitive content"},
                        }
                    },
                },
            ]
        )

        success = await provider.query("task-success")
        failed = await provider.query("task-failed")

        self.assertEqual(success.status, "success")
        self.assertEqual(success.video_url, "https://example.com/result.mp4")
        self.assertEqual(success.duration, 12)
        self.assertEqual(failed.status, "fail")
        self.assertEqual(failed.error_code, "1026")
        self.assertIn("sensitive", failed.fail_reason or "")

    async def test_query_keeps_transient_http_error_running(self):
        provider = self.make_provider()
        provider._get = AsyncMock(
            return_value={
                "status_code": 503,
                "body": {"error": {"message": "overloaded"}},
            }
        )

        result = await provider.query("task-running")

        self.assertEqual(result.status, "running")
        self.assertEqual(result.error_code, "NETWORK")

    def test_provider_factory_resolves_minimax_h3(self):
        self.assertIsInstance(
            get_provider("minimax_h3", {"api_key": "test-key"}),
            MiniMaxH3Provider,
        )
        self.assertIsInstance(
            get_provider(
                "unknown",
                {
                    "api_key": "test-key",
                    "base_url": "https://api.minimaxi.com",
                    "model_name": "MiniMax-H3",
                },
            ),
            MiniMaxH3Provider,
        )

    async def test_queue_startup_recovery_queries_the_original_provider(self):
        class FakeCursor:
            async def fetchone(self):
                return {
                    "submit_id": "h3-task-recover",
                    "video_status": "generating",
                    "video_url": None,
                    "last_frame_path": None,
                    "video_fail_reason": None,
                }

        class FakeDb:
            async def execute(self, *_args, **_kwargs):
                return FakeCursor()

            async def close(self):
                return None

        worker = QueueWorker()
        worker._publish_update = AsyncMock()
        poll = AsyncMock(
            return_value={"video_status": "generating", "video_url": None}
        )
        with (
            patch("database.db.get_db", new=AsyncMock(return_value=FakeDb())),
            patch("api.video._poll_storyboard_via_ark", new=poll),
        ):
            await worker._reconcile_local_provider_generating_on_startup(
                {
                    "id": 91,
                    "storyboard_id": 19,
                    "provider": "minimax_h3",
                }
            )

        poll.assert_awaited_once_with(
            19,
            "h3-task-recover",
            provider_type="minimax_h3",
            local_api_key=None,
        )


if __name__ == "__main__":
    unittest.main()
