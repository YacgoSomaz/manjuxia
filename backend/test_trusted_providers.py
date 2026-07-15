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

    def test_allows_public_https_relay_provider(self):
        self.assertEqual(
            require_trusted_model_url("https://grsaj.dakka.com/v1"),
            "https://grsaj.dakka.com/v1",
        )

    def test_allows_loopback_model_server(self):
        self.assertEqual(
            require_trusted_model_url("http://127.0.0.1:11434/v1"),
            "http://127.0.0.1:11434/v1",
        )

    def test_rejects_insecure_or_unsafe_hosts(self):
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            require_trusted_model_url("http://api.deepseek.com/v1")
        with self.assertRaisesRegex(ValueError, "内网"):
            require_trusted_model_url("https://192.168.1.20/v1")
        with self.assertRaisesRegex(ValueError, "凭据"):
            require_trusted_model_url("https://user:pass@example.com/v1")

    def test_image_service_accepts_public_https_relay_endpoint(self):
        trusted = ImageService._trusted_config({"base_url": "https://images.example.com/v1"})
        self.assertEqual(trusted["base_url"], "https://images.example.com/v1")

    def test_video_provider_accepts_public_https_relay_endpoint(self):
        provider = VolcengineArkProvider({"base_url": "https://video.example.com/v1"})
        self.assertEqual(provider.base_url, "https://video.example.com/v1")


if __name__ == "__main__":
    unittest.main()
