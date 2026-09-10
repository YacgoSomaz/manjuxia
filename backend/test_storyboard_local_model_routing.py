import inspect
import os
import unittest
from unittest.mock import patch

from services.llm_service import LLMService, _effective_storyboard_max_tokens
from services.storyboard_service import _storyboard_assemble_eligibility


class StoryboardLocalModelRoutingTests(unittest.TestCase):
    def test_cloud_disabled_preset_uses_bundled_full_template(self):
        template = {
            "id": 1,
            "is_preset": 1,
            "category": "storyboard_generation",
            "admin_id": "remote-template-id",
            "content": "完整 Markdown 模板正文",
        }
        with patch.dict(os.environ, {"WANSHAN_ENABLE_CLOUD": "0"}, clear=False):
            self.assertEqual(("legacy", None), _storyboard_assemble_eligibility(template))

    def test_cloud_enabled_preset_keeps_remote_assemble_mode(self):
        template = {
            "is_preset": 1,
            "category": "storyboard_generation",
            "admin_id": "remote-template-id",
        }
        with patch.dict(os.environ, {"WANSHAN_ENABLE_CLOUD": "1"}, clear=False):
            self.assertEqual(
                ("assemble", "remote-template-id"),
                _storyboard_assemble_eligibility(template),
            )

    def test_storyboard_call_accepts_ephemeral_scene_references(self):
        parameters = inspect.signature(LLMService.call_llm).parameters
        self.assertIn("ephemeral_images", parameters)

    def test_deepseek_v4_flash_storyboard_gets_full_output_budget(self):
        config = {
            "model_name": "deepseek-v4-flash",
            "max_tokens": 16384,
            "context_window": 131072,
        }
        self.assertEqual(
            65536,
            _effective_storyboard_max_tokens(config, "storyboard_generate", None),
        )

    def test_small_context_model_is_not_forced_to_64k(self):
        config = {"max_tokens": 8192, "context_window": 32768}
        self.assertEqual(
            8192,
            _effective_storyboard_max_tokens(config, "storyboard_generate", None),
        )


if __name__ == "__main__":
    unittest.main()
