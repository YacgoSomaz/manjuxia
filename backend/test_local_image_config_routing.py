import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from services.llm_service import LLMService
from services.image_service import ImageService


class LocalImageConfigRoutingTests(unittest.IsolatedAsyncioTestCase):
    async def test_cloud_miss_falls_back_to_local_config(self):
        local_config = {
            "id": 17,
            "name": "本地图片模型",
            "config_type": "image",
            "base_url": "https://example.invalid/v1",
            "api_key": "local-key",
            "model_name": "image-model",
        }
        with (
            patch("services.llm_service.cloud_enabled", return_value=True),
            patch(
                "services.cloud_llm_sync.get_active_config",
                new=AsyncMock(return_value=None),
            ) as cloud_get,
            patch.object(
                LLMService,
                "_get_local_by_id",
                new=AsyncMock(return_value=local_config),
            ) as local_get,
        ):
            result = await LLMService.get_by_id(17)

        self.assertEqual(result, local_config)
        self.assertEqual(cloud_get.await_count, 3)
        local_get.assert_awaited_once_with(17)

    async def test_local_image_test_keeps_local_routing_for_generation(self):
        local_config = {
            "id": 23,
            "name": "本地图片模型",
            "config_type": "image",
            "base_url": "https://example.invalid/v1",
            "api_key": "local-key",
            "model_name": "image-model",
        }
        generated = {
            "success": True,
            "image_url": "https://example.invalid/generated.png",
        }
        with (
            patch.object(
                LLMService,
                "get_by_id",
                new=AsyncMock(return_value=local_config),
            ),
            patch(
                "services.image_service.ImageService.generate_image",
                new=AsyncMock(return_value=generated),
            ) as generate,
        ):
            result = await LLMService.test_connection(23, local_only=True)

        self.assertTrue(result["success"])
        self.assertEqual(result["image_url"], generated["image_url"])
        self.assertTrue(generate.await_args.kwargs["local_only"])

    async def test_volcengine_endpoint_uses_ark_image_request_shape(self):
        generate = AsyncMock(
            return_value=SimpleNamespace(
                data=[SimpleNamespace(url="https://example.invalid/image.png", b64_json=None)]
            )
        )
        client = SimpleNamespace(images=SimpleNamespace(generate=generate))

        result = await ImageService._generate_with_images_api(
            client=client,
            model="ep-20260329205212-p6sd4",
            prompt="测试图片",
            size="1792x1024",
            base_url="https://ark.cn-beijing.volces.com/api/v3",
            ratio="16:9",
            provider_code="volcengine",
        )

        self.assertEqual(result, "https://example.invalid/image.png")
        body = generate.await_args.kwargs
        self.assertEqual(body["size"], "2K")
        self.assertNotIn("n", body)
        self.assertEqual(body["extra_body"]["sequential_image_generation"], "disabled")
        self.assertEqual(body["extra_body"]["response_format"], "url")

    async def test_provider_error_is_not_replaced_by_empty_image_message(self):
        generate = AsyncMock(side_effect=RuntimeError("401 Unauthorized: API key does not exist"))
        client = SimpleNamespace(images=SimpleNamespace(generate=generate))

        with self.assertRaisesRegex(RuntimeError, "401 Unauthorized"):
            await ImageService._generate_with_images_api(
                client=client,
                model="ep-test",
                prompt="测试图片",
                size="1024x1024",
                base_url="https://ark.cn-beijing.volces.com/api/v3",
                ratio="1:1",
                provider_code="volcengine",
            )


if __name__ == "__main__":
    unittest.main()
