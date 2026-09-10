import hashlib
import json
import unittest
from pathlib import Path

from services.storyboard_service import (
    STORYBOARD_SCRIPT_SEPARATOR,
    STORYBOARD_SYSTEM_PROMPT,
    _append_storyboard_script,
    _storyboard_messages,
)
from services.wanshan_prompt_seed import _apply_github_storyboard_overrides


TRACE_TEMPLATE_IDS = {
    23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34,
    35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 47,
    48, 49, 50, 51, 62,
}


class StoryboardTracePromptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed_path = Path(__file__).parent / "data" / "wanshan_prompt_seed.json"
        cls.templates = json.loads(seed_path.read_text(encoding="utf-8"))

    def test_all_recovered_trace_prompts_are_complete_and_hashed(self):
        recovered = {
            int(item["qianshan_id"]): item
            for item in self.templates
            if str(item.get("source") or "").startswith("deepseek_trace:")
        }
        self.assertEqual(TRACE_TEMPLATE_IDS, set(recovered))
        for template_id, item in recovered.items():
            content = item["content"]
            self.assertGreater(len(content), 8000, template_id)
            self.assertNotIn("以下是需要转换为分镜的剧本内容:", content)
            self.assertNotIn("以下是需要转换为分镜的剧本内容：", content)
            self.assertEqual(
                item["sha256"],
                hashlib.sha256(content.encode("utf-8")).hexdigest(),
                template_id,
            )

    def test_trace_prompt_is_not_replaced_by_github_fallback(self):
        original = {
            "qianshan_id": 26,
            "category": "storyboard_generation",
            "source": "deepseek_trace:test#trace-1",
            "content": "authoritative trace content",
        }
        result = _apply_github_storyboard_overrides([original])
        self.assertEqual("authoritative trace content", result[0]["content"])

    def test_storyboard_request_assembly_matches_audited_request(self):
        self.assertEqual(
            "19049effe9675c52892a2139bf5b8adb9f66617882e6ac6540827026c058c58f",
            hashlib.sha256(STORYBOARD_SYSTEM_PROMPT.encode("utf-8")).hexdigest(),
        )
        self.assertEqual(
            "\n\n\n以下是需要转换为分镜的剧本内容:\n\n",
            STORYBOARD_SCRIPT_SEPARATOR,
        )
        prompt = _append_storyboard_script("原版模板", "原始剧本")
        self.assertEqual(
            "原版模板\n\n\n以下是需要转换为分镜的剧本内容:\n\n原始剧本",
            prompt,
        )
        self.assertEqual(
            [
                {"role": "system", "content": STORYBOARD_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            _storyboard_messages(prompt),
        )


if __name__ == "__main__":
    unittest.main()
