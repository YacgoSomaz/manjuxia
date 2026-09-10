import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from api.video import (
    PollStatusRequest,
    _POLL_INFLIGHT,
    _STANDALONE_VIDEO_RECONCILE_TASKS,
    _ensure_standalone_video_reconcile,
    _local_video_needs_tail_frame,
    _run_standalone_video_reconcile,
    check_login,
    poll_video_status,
)


class StandaloneVideoReconcileTests(unittest.IsolatedAsyncioTestCase):
    async def asyncTearDown(self):
        tasks = list(_STANDALONE_VIDEO_RECONCILE_TASKS.values())
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        _STANDALONE_VIDEO_RECONCILE_TASKS.clear()

    async def test_reconcile_stops_when_poll_returns_terminal_status(self):
        state = {
            "id": 42,
            "video_status": "generating",
            "submit_id": "submit-42",
            "video_provider": "jimeng",
        }
        with patch(
            "api.video._get_standalone_video_reconcile_state",
            AsyncMock(return_value=state),
        ) as get_state, patch(
            "api.video.poll_video_status",
            AsyncMock(return_value={
                "success": True,
                "results": [{"id": 42, "video_status": "done"}],
            }),
        ) as poll:
            await _run_standalone_video_reconcile(42, interval_seconds=0.1)

        get_state.assert_awaited_once_with(42)
        poll.assert_awaited_once()

    async def test_ensure_is_idempotent_for_same_storyboard(self):
        release = asyncio.Event()

        async def wait_until_released(_storyboard_id):
            await release.wait()

        with patch(
            "api.video._run_standalone_video_reconcile",
            side_effect=wait_until_released,
        ) as runner:
            self.assertTrue(_ensure_standalone_video_reconcile(77))
            self.assertFalse(_ensure_standalone_video_reconcile(77))
            await asyncio.sleep(0)
            self.assertEqual(runner.call_count, 1)
            release.set()
            task = _STANDALONE_VIDEO_RECONCILE_TASKS[77]
            await task
            await asyncio.sleep(0)

        self.assertNotIn(77, _STANDALONE_VIDEO_RECONCILE_TASKS)

    async def test_transient_cli_error_is_not_reported_as_logged_out(self):
        with patch(
            "api.video.video_service.check_login",
            AsyncMock(return_value={
                "success": False,
                "error": "命令执行超时(60秒)",
            }),
        ):
            result = await check_login()

        self.assertFalse(result["success"])
        self.assertTrue(result["transient"])

    async def test_explicit_cli_login_error_is_confirmed_logged_out(self):
        with patch(
            "api.video.video_service.check_login",
            AsyncMock(return_value={
                "success": False,
                "error": "未检测到有效登录，请运行 dreamina login",
            }),
        ):
            result = await check_login(force=True)

        self.assertTrue(result["success"])
        self.assertFalse(result["logged_in"])


class TailFrameFinalizationTests(unittest.TestCase):
    def test_local_done_video_without_tail_frame_is_still_finalizing(self):
        self.assertTrue(
            _local_video_needs_tail_frame(
                "done", "/data/videos/episode/shot.mp4", None
            )
        )

    def test_existing_tail_frame_finishes_pipeline(self):
        self.assertFalse(
            _local_video_needs_tail_frame(
                "done",
                "/data/videos/episode/shot.mp4",
                "/data/frames/storyboard_1_last.jpg",
            )
        )

    def test_remote_or_generating_video_does_not_enter_local_tail_finalize(self):
        self.assertFalse(
            _local_video_needs_tail_frame(
                "done", "https://cdn.example.com/shot.mp4", None
            )
        )
        self.assertFalse(
            _local_video_needs_tail_frame(
                "generating", "/data/videos/episode/shot.mp4", None
            )
        )


class ConcurrentTailFramePollTests(unittest.IsolatedAsyncioTestCase):
    async def asyncTearDown(self):
        _POLL_INFLIGHT.clear()

    async def test_concurrent_done_row_stays_polling_until_tail_frame_is_written(self):
        row = {
            "video_status": "done",
            "video_url": "/data/videos/episode/shot.mp4",
            "video_fail_reason": None,
            "last_frame_path": None,
        }

        class FetchCursor:
            async def fetchone(self):
                return row

        class FirstDb:
            async def execute(self, *_args, **_kwargs):
                return FetchCursor()

            async def close(self):
                return None

        class RowsContext:
            async def __aenter__(self):
                return self

            async def __aexit__(self, *_args):
                return False

            def __aiter__(self):
                async def iterate():
                    yield {
                        "id": 4816,
                        "last_frame_path": None,
                        "extra_reference_image": None,
                        "extra_reference_desc": None,
                    }

                return iterate()

        class SupplementDb:
            def execute(self, *_args, **_kwargs):
                return RowsContext()

            async def close(self):
                return None

        _POLL_INFLIGHT.add(4816)
        with patch(
            "database.db.get_db",
            AsyncMock(side_effect=[FirstDb(), SupplementDb()]),
        ):
            result = await poll_video_status(PollStatusRequest(storyboard_ids=[4816]))

        item = result["results"][0]
        self.assertEqual(item["video_status"], "generating")
        self.assertTrue(item["finalizing_tail_frame"])
        self.assertTrue(item["skipped_concurrent"])


if __name__ == "__main__":
    unittest.main()
