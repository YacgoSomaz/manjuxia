import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.jimeng_black_video import (
    ensure_jimeng_black_reference_video_sync,
    jimeng_black_video_enabled,
    prepare_jimeng_reference_videos,
)


class _Completed:
    returncode = 0
    stderr = b""


class JimengBlackVideoTests(unittest.IsolatedAsyncioTestCase):
    def test_switch_defaults_and_string_values_are_safe(self):
        self.assertFalse(jimeng_black_video_enabled(None))
        self.assertFalse(jimeng_black_video_enabled(False))
        self.assertFalse(jimeng_black_video_enabled("false"))
        self.assertTrue(jimeng_black_video_enabled(True))
        self.assertTrue(jimeng_black_video_enabled("true"))

    def test_cached_asset_is_created_once_and_reused(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            calls = []

            def fake_run(command, **_kwargs):
                calls.append(command)
                target = Path(command[-1])
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(b"\x00\x00\x00\x18ftypisom" + (b"0" * 2048))
                return _Completed()

            with patch(
                "services.jimeng_black_video.get_data_dir",
                return_value=temp_dir,
            ), patch(
                "services.jimeng_black_video._resolve_ffmpeg_path",
                return_value="ffmpeg.exe",
            ), patch(
                "services.jimeng_black_video.subprocess.run",
                side_effect=fake_run,
            ):
                first = ensure_jimeng_black_reference_video_sync("9:16")
                second = ensure_jimeng_black_reference_video_sync("9:16")

            self.assertEqual(first, second)
            self.assertTrue(first.endswith("jimeng_black_2s_9x16.mp4"))
            self.assertEqual(len(calls), 1)
            self.assertIn("color=c=black:s=360x640:r=24:d=2", calls[0])

    async def test_prepare_appends_exactly_one_black_video_and_preserves_order(self):
        with patch(
            "services.jimeng_black_video.ensure_jimeng_black_reference_video",
            return_value=os.path.abspath("black.mp4"),
        ):
            prepared = await prepare_jimeng_reference_videos(
                ["user-video.mp4"],
                True,
                "16:9",
            )
            repeated = await prepare_jimeng_reference_videos(prepared, True, "16:9")

        self.assertEqual(prepared[0], "user-video.mp4")
        self.assertEqual(prepared[-1], os.path.abspath("black.mp4"))
        self.assertEqual(repeated.count(os.path.abspath("black.mp4")), 1)

    async def test_disabled_switch_keeps_existing_videos_unchanged(self):
        with patch(
            "services.jimeng_black_video.ensure_jimeng_black_reference_video",
        ) as ensure:
            result = await prepare_jimeng_reference_videos(
                ["user-video.mp4"],
                False,
                "16:9",
            )

        self.assertEqual(result, ["user-video.mp4"])
        ensure.assert_not_called()


if __name__ == "__main__":
    unittest.main()
