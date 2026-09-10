import os
import sys
import tempfile
import unittest
from unittest.mock import AsyncMock, patch


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.video_providers.jimeng import JimengCliProvider
from services.video_service import VideoService
from api.video import _AUDIO_DURATION_CACHE, _cached_audio_duration_seconds
from api.extraction import JIMENG_AUDIO_MAX_DURATION, JIMENG_AUDIO_MIN_DURATION


class JimengSeedance25Tests(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def _params(**overrides):
        params = {
            "model_version": "Seedance_2.5",
            "generation_mode": "multimodal2video",
            "duration": 30,
            "ratio": "9:16",
            "resolution": "480P",
        }
        params.update(overrides)
        return params

    def test_audio_library_accepts_seedance_25_tolerance(self):
        self.assertEqual(JIMENG_AUDIO_MIN_DURATION, 1.8)
        self.assertEqual(JIMENG_AUDIO_MAX_DURATION, 30.2)

    def test_audio_duration_probe_is_cached_per_file_version(self):
        _AUDIO_DURATION_CACHE.clear()
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp.write(b"audio-v1")
            path = temp.name
        try:
            with patch(
                "api.extraction._probe_audio_duration_seconds",
                return_value=12.34,
            ) as probe:
                self.assertEqual(_cached_audio_duration_seconds(path), 12.34)
                self.assertEqual(_cached_audio_duration_seconds(path), 12.34)
                self.assertEqual(probe.call_count, 1)
                with open(path, "ab") as output:
                    output.write(b"-changed")
                self.assertEqual(_cached_audio_duration_seconds(path), 12.34)
                self.assertEqual(probe.call_count, 2)
        finally:
            try:
                os.remove(path)
            except OSError:
                pass

    async def test_audio_only_routes_to_multimodal_with_official_identifier(self):
        provider = JimengCliProvider({})
        with patch.object(
            VideoService,
            "multimodal2video",
            new=AsyncMock(return_value={"success": True, "data": {"submit_id": "task-25"}}),
        ) as submit:
            result = await provider.submit(
                prompt="test",
                audios=["voice.wav"],
                params=self._params(),
            )

        self.assertTrue(result.success)
        self.assertEqual(result.submit_id, "task-25")
        kwargs = submit.await_args.kwargs
        self.assertEqual(kwargs["model_version"], "seedance2.5")
        self.assertEqual(kwargs["duration"], 30)
        self.assertEqual(kwargs["resolution"], "480P")
        self.assertEqual(kwargs["audios"], ["voice.wav"])
        self.assertEqual(kwargs["images"], [])

    async def test_rejects_unsupported_1080p(self):
        provider = JimengCliProvider({})
        result = await provider.submit(
            prompt="test",
            images=["subject.png"],
            params=self._params(resolution="1080P"),
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_PARAM")
        self.assertIn("不支持", result.fail_reason)

    async def test_rejects_each_material_count_limit(self):
        provider = JimengCliProvider({})
        cases = (
            ([f"image-{i}.png" for i in range(31)], [], []),
            ([], [f"video-{i}.mp4" for i in range(11)], []),
            ([], [], [f"audio-{i}.wav" for i in range(11)]),
        )
        for images, videos, audios in cases:
            with self.subTest(images=len(images), videos=len(videos), audios=len(audios)):
                result = await provider.submit(
                    prompt="test",
                    images=images,
                    audios=audios,
                    params=self._params(videos=videos),
                )
                self.assertFalse(result.success)
                self.assertEqual(result.error_code, "INVALID_PARAM")
                self.assertIn("素材超限", result.fail_reason)

    async def test_accepts_full_30_10_10_material_envelope(self):
        provider = JimengCliProvider({})
        images = [f"image-{i}.png" for i in range(30)]
        videos = [f"video-{i}.mp4" for i in range(10)]
        audios = [f"audio-{i}.wav" for i in range(10)]
        with patch.object(
            VideoService,
            "multimodal2video",
            new=AsyncMock(return_value={"success": True, "data": {"submit_id": "task-50"}}),
        ) as submit:
            result = await provider.submit(
                prompt="test",
                images=images,
                audios=audios,
                params=self._params(videos=videos),
            )

        self.assertTrue(result.success)
        kwargs = submit.await_args.kwargs
        self.assertEqual(len(kwargs["images"]), 30)
        self.assertEqual(len(kwargs["videos"]), 10)
        self.assertEqual(len(kwargs["audios"]), 10)

    async def test_rejects_audio_total_above_actual_tolerance(self):
        provider = JimengCliProvider({})
        with patch(
            "services.video_providers.jimeng._probe_local_media_durations",
            return_value=[15.2, 15.1],
        ):
            result = await provider.submit(
                prompt="test",
                audios=["one.wav", "two.wav"],
                params=self._params(),
            )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_PARAM")
        self.assertIn("总时长", result.fail_reason)

    async def test_campaign_switch_appends_black_video_to_multimodal_submit(self):
        provider = JimengCliProvider({})
        with patch(
            "services.video_providers.jimeng.prepare_jimeng_reference_videos",
            new=AsyncMock(return_value=["cached-black-2s.mp4"]),
        ) as prepare, patch.object(
            VideoService,
            "multimodal2video",
            new=AsyncMock(return_value={"success": True, "data": {"submit_id": "task-black"}}),
        ) as submit:
            result = await provider.submit(
                prompt="test",
                images=["subject.png"],
                params=self._params(include_black_video=True),
            )

        self.assertTrue(result.success)
        prepare.assert_awaited_once_with([], True, "9:16")
        self.assertEqual(submit.await_args.kwargs["videos"], ["cached-black-2s.mp4"])

    async def test_campaign_asset_failure_is_returned_without_submitting(self):
        provider = JimengCliProvider({})
        with patch(
            "services.video_providers.jimeng.prepare_jimeng_reference_videos",
            new=AsyncMock(side_effect=RuntimeError("已开启2秒黑屏视频，但缓存素材准备失败")),
        ), patch.object(
            VideoService,
            "multimodal2video",
            new=AsyncMock(),
        ) as submit:
            result = await provider.submit(
                prompt="test",
                images=["subject.png"],
                params=self._params(include_black_video=True),
            )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_PARAM")
        self.assertIn("缓存素材准备失败", result.fail_reason)
        submit.assert_not_awaited()

    async def test_seedance_20_still_requires_image_or_video_for_audio(self):
        provider = JimengCliProvider({})
        result = await provider.submit(
            prompt="test",
            audios=["voice.wav"],
            params={
                "model_version": "seedance2.0_vip",
                "generation_mode": "multimodal2video",
                "duration": 10,
                "resolution": "720P",
            },
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_PARAM")
        self.assertIn("至少需要", result.fail_reason)


if __name__ == "__main__":
    unittest.main()
