import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from services.qianshan_storyboard_lab import (
    DIRECT_PROMPT_MODE_CLEAN,
    DIRECT_PROMPT_MODE_TWO_STEP,
    _build_clean_direct_messages,
    summarize_storyboards,
)


class QianshanStoryboardLabTests(unittest.TestCase):
    def test_summarize_storyboards_decodes_json_fields(self):
        rows = [
            {
                "id": 1,
                "scene_index": 0,
                "section_number": 1,
                "sort_order": 0,
                "description": "【外 机场 日 · 镜号1 · 6秒 · 建立场景】\n人物：林锐",
                "prompt": "【外 机场 日 · 镜号1 · 6秒 · 建立场景】\n人物：林锐",
                "characters": json.dumps(["林锐"], ensure_ascii=False),
                "scenes": json.dumps(["外 机场 日"], ensure_ascii=False),
                "props": "[]",
                "section_info": json.dumps({"scene": "外 机场 日", "characters": "林锐"}, ensure_ascii=False),
                "section_start_state": json.dumps({"林锐": "姿态[站立] · 情绪[冷静]"}, ensure_ascii=False),
                "end_state": json.dumps({"林锐": "姿态[抬头] · 情绪[警惕]"}, ensure_ascii=False),
            }
        ]

        summary = summarize_storyboards(rows)

        self.assertEqual(summary[0]["title_line"], "【外 机场 日 · 镜号1 · 6秒 · 建立场景】")
        self.assertEqual(summary[0]["characters"], ["林锐"])
        self.assertEqual(summary[0]["scenes"], ["外 机场 日"])
        self.assertEqual(summary[0]["section_start_state"]["林锐"], "姿态[站立] · 情绪[冷静]")
        self.assertEqual(summary[0]["end_state"]["林锐"], "姿态[抬头] · 情绪[警惕]")

    def test_clean_direct_messages_do_not_add_system_prompt(self):
        messages = _build_clean_direct_messages(
            "请认真阅读下面内容。\n\n正文内容",
            prompt_mode=DIRECT_PROMPT_MODE_CLEAN,
        )

        self.assertEqual(messages, [{"role": "user", "content": "请认真阅读下面内容。\n\n正文内容"}])

    def test_two_step_direct_messages_add_only_followup_user_message(self):
        messages = _build_clean_direct_messages(
            "第一条指令",
            prompt_mode=DIRECT_PROMPT_MODE_TWO_STEP,
            followup_instruction="第二条指令",
        )

        self.assertEqual(
            messages,
            [
                {"role": "user", "content": "第一条指令"},
                {"role": "user", "content": "第二条指令"},
            ],
        )


if __name__ == "__main__":
    unittest.main()
