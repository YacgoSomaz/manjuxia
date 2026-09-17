import unittest
from unittest.mock import AsyncMock

from services.video_providers.minimax_h3 import MiniMaxH3Provider
from api.video import _normalize_minimax_resolution


class MiniMaxH3ResolutionTests(unittest.IsolatedAsyncioTestCase):
    def test_submit_route_preserves_768p_before_provider_validation(self):
        self.assertEqual(_normalize_minimax_resolution("768p"), "768P")
        self.assertEqual(_normalize_minimax_resolution(None), "2K")

    async def test_submit_passes_selected_768p_to_minimax(self):
        provider = MiniMaxH3Provider({"api_key": "test-key"})
        provider._post = AsyncMock(return_value={"status_code": 200, "body": {"task_id": "task-768p"}})

        result = await provider.submit(
            "夜景镜头",
            params={"resolution": "768P", "ratio": "9:16", "duration": 5},
        )

        self.assertTrue(result.success)
        payload = provider._post.await_args.args[1]
        self.assertEqual(payload["resolution"], "768P")
        self.assertEqual(result.sanitized_payload["resolution"], "768P")

    async def test_submit_still_accepts_2k(self):
        provider = MiniMaxH3Provider({"api_key": "test-key"})
        provider._post = AsyncMock(return_value={"status_code": 200, "body": {"task_id": "task-2k"}})

        result = await provider.submit(
            "夜景镜头",
            params={"resolution": "2k", "ratio": "16:9", "duration": 5},
        )

        self.assertTrue(result.success)
        self.assertEqual(provider._post.await_args.args[1]["resolution"], "2K")

    async def test_submit_rejects_unknown_resolution(self):
        provider = MiniMaxH3Provider({"api_key": "test-key"})

        result = await provider.submit(
            "夜景镜头",
            params={"resolution": "1080P", "ratio": "16:9", "duration": 5},
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_PARAM")
        self.assertIn("768P、2K", result.fail_reason)


if __name__ == "__main__":
    unittest.main()
