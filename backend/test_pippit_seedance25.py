import os
import sys
import unittest


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.video_providers.pippit import PippitCliProvider


class PippitSeedance25Tests(unittest.IsolatedAsyncioTestCase):
    async def test_submit_uses_official_model_identifier_and_30_second_limit(self):
        provider = PippitCliProvider({})
        captured = {}

        async def fake_upload(paths, *, label):
            return [], None, []

        async def fake_post(path, payload, *, timeout, action):
            captured["path"] = path
            captured["payload"] = payload
            return {
                "success": True,
                "data": {"thread_id": "thread-25", "run_id": "run-25"},
            }

        provider._upload_media_list_api = fake_upload
        provider._post_json = fake_post

        result = await provider.submit(
            prompt="测试 Seedance 2.5",
            params={
                "model": "seedance2.5",  # historical cached placeholder
                "duration": 30,
                "ratio": "9:16",
                "resolution": "720p",
            },
        )

        self.assertTrue(result.success)
        tool_params = captured["payload"]["video_part_tool_param"]
        self.assertEqual(tool_params["model"], "Seedance_2.5")
        self.assertEqual(tool_params["duration_sec"], 30)

    async def test_seedance25_rejects_unsupported_1080p(self):
        provider = PippitCliProvider({})
        result = await provider.submit(
            prompt="测试",
            params={
                "model": "Seedance_2.5",
                "resolution": "1080p",
            },
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_PARAM")
        self.assertIn("1080p", result.fail_reason or "")


if __name__ == "__main__":
    unittest.main()
