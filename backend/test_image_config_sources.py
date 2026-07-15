import unittest

from api.cover import _public_image_config_item
from api.extra import _public_supported_image_config


class ImageConfigSourceTests(unittest.TestCase):
    def test_cover_image_config_accepts_local_snake_case(self):
        item = _public_image_config_item(
            {
                "id": 3,
                "name": "火山方舟生图",
                "model_name": "ep-20260329205212-p6sd4",
                "is_default": False,
            }
        )

        self.assertEqual(item["id"], 3)
        self.assertEqual(item["name"], "火山方舟生图")
        self.assertEqual(item["model_name"], "ep-20260329205212-p6sd4")

    def test_fusion_supported_config_keeps_volcengine_image_config(self):
        item = _public_supported_image_config(
            {
                "id": 3,
                "name": "火山方舟生图",
                "model_name": "ep-20260329205212-p6sd4",
                "base_url": "https://ark.cn-beijing.volces.com/api/v3",
                "provider_code": "volcengine",
            }
        )

        self.assertEqual(item["id"], 3)
        self.assertEqual(item["model_name"], "ep-20260329205212-p6sd4")
        self.assertEqual(item["category"], "volcengine")


if __name__ == "__main__":
    unittest.main()
