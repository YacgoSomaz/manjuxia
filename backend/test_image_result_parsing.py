import unittest

from services.image_service import ImageService


class ImageResultParsingTests(unittest.TestCase):
    def test_accepts_standard_url(self):
        self.assertEqual(
            ImageService._extract_image_payload({"url": "https://cdn.example/image.png"}),
            ("url", "https://cdn.example/image.png"),
        )

    def test_accepts_common_nested_image_url(self):
        self.assertEqual(
            ImageService._extract_image_payload(
                {"data": [{"image_url": {"url": "https://cdn.example/image.webp"}}]}
            ),
            ("url", "https://cdn.example/image.webp"),
        )

    def test_accepts_base64_and_markdown(self):
        self.assertEqual(
            ImageService._extract_image_payload({"image": "data:image/png;base64,AAAA"}),
            ("url", "data:image/png;base64,AAAA"),
        )
        self.assertEqual(
            ImageService._extract_image_payload({"content": "![result](https://cdn.example/image.jpg)"}),
            ("url", "https://cdn.example/image.jpg"),
        )

    def test_accepts_proxy_base64_field(self):
        self.assertEqual(
            ImageService._extract_image_payload({"base64": "A" * 64}),
            ("base64", "A" * 64),
        )

    def test_ignores_revised_prompt_without_image(self):
        self.assertIsNone(
            ImageService._extract_image_payload({"revised_prompt": "a revised prompt"})
        )


if __name__ == "__main__":
    unittest.main()
