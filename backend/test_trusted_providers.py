import unittest

from services.trusted_providers import require_trusted_model_url
from services.image_service import ImageService
from services.video_providers.volcengine_ark import VolcengineArkProvider


class TrustedProviderTests(unittest.TestCase):
    def test_allows_builtin_https_provider(self):
        self.assertEqual(
            require_trusted_model_url("https://api.deepseek.com/v1"),
            "https://api.deepseek.com/v1",
        )

    def test_allows_loopback_model_server(self):
        self.assertEqual(
            require_trusted_model_url("http://127.0.0.1:11434/v1"),
            "http://127.0.0.1:11434/v1",
        )

    def test_rejects_unknown_or_insecure_hosts(self):
        with self.assertRaisesRegex(ValueError, "受信任"):
            require_trusted_model_url("https://api.deepseek.com.evil.example/v1")
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            require_trusted_model_url("http://api.deepseek.com/v1")

    def test_image_service_rejects_untrusted_config_endpoint(self):
        with self.assertRaisesRegex(ValueError, "受信任"):
            ImageService._trusted_config({"base_url": "https://images.evil.example/v1"})

    def test_video_provider_rejects_untrusted_config_endpoint(self):
        with self.assertRaisesRegex(ValueError, "受信任"):
            VolcengineArkProvider({"base_url": "https://video.evil.example/v1"})


if __name__ == "__main__":
    unittest.main()
