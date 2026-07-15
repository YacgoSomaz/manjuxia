import pathlib
import sys
import types
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from services.wanshan_prompt_seed import _embedded_templates, _normalize_template_payload


class PromptSeedPayloadTests(unittest.TestCase):
    def test_accepts_the_exported_templates_object(self):
        template = {"name": "即梦2.0分镜模板-慢节奏通用版【3D】", "category": "storyboard_generation", "content": "rule"}
        self.assertEqual(_normalize_template_payload({"templates": [template]}), [template])

    def test_rejects_non_template_payloads(self):
        self.assertIsNone(_normalize_template_payload({"templates": "invalid"}))
        self.assertIsNone(_normalize_template_payload("invalid"))

    def test_embedded_loader_accepts_the_compressed_build_module(self):
        template = {"name": "慢节奏通用", "category": "storyboard_generation", "content": "rule"}
        module = types.ModuleType("services.wanshan_prompt_seed_embedded")
        module.load_templates = lambda: {"templates": [template]}
        with patch.dict(sys.modules, {"services.wanshan_prompt_seed_embedded": module}):
            self.assertEqual(_embedded_templates(), [template])


if __name__ == "__main__":
    unittest.main()
