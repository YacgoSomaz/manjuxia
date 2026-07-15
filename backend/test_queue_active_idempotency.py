import os
import tempfile
import unittest


class QueueActiveIdempotencyTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["WANSHAN_DATA_DIR"] = self.tmp.name

        from database.db import init_db

        await init_db()

    async def asyncTearDown(self):
        self.tmp.cleanup()
        os.environ.pop("WANSHAN_DATA_DIR", None)

    async def test_enqueue_skips_existing_active_even_when_latest_history_is_terminal(self):
        from database.db import get_db
        from services import queue_service

        db = await get_db()
        try:
            await db.execute("INSERT INTO novels (id, name, raw_content) VALUES (1, '测试小说', '正文')")
            await db.execute(
                "INSERT INTO scripts (id, novel_id, content) VALUES (10, 1, '剧本')"
            )
            await db.execute(
                """
                INSERT INTO storyboards (id, novel_id, script_id, scene_number, description, prompt)
                VALUES (100, 1, 10, 1, '镜头', '提示词')
                """
            )
            await db.execute(
                """
                INSERT INTO video_task_queue
                    (id, novel_id, script_id, storyboard_id, mode, status, label, provider, prompt_snapshot)
                VALUES
                    (1, 1, 10, 100, 'parallel', 'queued', '旧活跃', 'jimeng', 'old-active'),
                    (2, 1, 10, 100, 'parallel', 'done', '最新终态', 'jimeng', 'done')
                """
            )
            await db.commit()
        finally:
            await db.close()

        result = await queue_service.enqueue_batch(
            novel_id=1,
            script_id=10,
            storyboard_ids=[100],
            provider="jimeng",
        )

        self.assertEqual(result["enqueued"], [])
        self.assertEqual(result["skipped"][0]["queue_id"], 1)

        db = await get_db()
        try:
            cur = await db.execute(
                """
                SELECT COUNT(*) AS c
                FROM video_task_queue
                WHERE storyboard_id = 100 AND status IN ('queued', 'generating')
                """
            )
            row = await cur.fetchone()
            self.assertEqual(row["c"], 1)
        finally:
            await db.close()


if __name__ == "__main__":
    unittest.main()
