import json
import unittest
from unittest.mock import AsyncMock, patch

from api.llm_logs import redownload_image
from services.image_service import ImageService


class _FakeCoolResponse:
    status = 200

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def text(self):
        return json.dumps(
            {
                "status": "success",
                "result": {"url": "https://cnd.uidp.cn/?id=refreshed.png"},
            }
        )


class _FakeCoolSession:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def get(self, url, headers=None):
        return _FakeCoolResponse()


class ImageRedownloadTests(unittest.IsolatedAsyncioTestCase):
    async def test_cool_redownload_refreshes_task_url_and_restores_source_element(self):
        log = {
            "id": 91,
            "task_type": "image_generation",
            "status": "error",
            "config_name": "Cool 中转(图像)",
            "provider_code": "cool",
            "remote_url": ImageService._build_cool_remote_ref(
                "task-abc",
                "https://cnd.uidp.cn/?id=old.png",
            ),
            "source_id": 1626,
            "source_type": "extracted_element:character",
            "chapter_title": None,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
        }
        download_mock = AsyncMock(return_value="data/images/element_1626_new.png")
        update_remote_mock = AsyncMock()
        update_success_mock = AsyncMock()
        update_element_mock = AsyncMock()

        with patch(
            "api.llm_logs.LogService.get_log_detail",
            AsyncMock(return_value=log),
        ), patch(
            "services.llm_service.LLMService.get_all",
            AsyncMock(
                return_value=[
                    {
                        "id": 267,
                        "name": "Cool 中转(图像)",
                        "provider_code": "cool",
                    }
                ]
            ),
        ), patch(
            "services.llm_service.LLMService.get_by_id",
            AsyncMock(
                return_value={
                    "id": 267,
                    "name": "Cool 中转(图像)",
                    "provider_code": "cool",
                    "base_url": "https://api.mjapi.cc.cd",
                    "api_key": "test-key",
                }
            ),
        ), patch(
            "aiohttp.ClientSession",
            _FakeCoolSession,
        ), patch.object(
            ImageService,
            "_download_image",
            download_mock,
        ), patch(
            "api.llm_logs.LogService.update_log_remote_url",
            update_remote_mock,
        ), patch(
            "api.llm_logs.LogService.update_log_success",
            update_success_mock,
        ), patch(
            "services.extraction_service.ExtractionService.get_element",
            AsyncMock(return_value={"id": 1626, "name": "测试角色"}),
        ), patch(
            "services.extraction_service.ExtractionService.update_element_image",
            update_element_mock,
        ):
            result = await redownload_image(91)

        self.assertEqual(result["status"], "ok")
        self.assertTrue(result["element_restored"])
        self.assertEqual(result["element_id"], 1626)
        self.assertIn("已刷新 Cool 任务结果地址", result["message"])
        self.assertEqual(
            download_mock.await_args.args[0],
            "https://cnd.uidp.cn/?id=refreshed.png",
        )
        self.assertRegex(
            download_mock.await_args.args[1],
            r"^element_1626_[0-9a-f]{8}\.png$",
        )
        self.assertEqual(download_mock.await_args.kwargs["retry_404_delays"], [1, 3, 8, 15])
        update_remote_mock.assert_awaited_with(
            log_id=91,
            remote_url=ImageService._build_cool_remote_ref(
                "task-abc",
                "https://cnd.uidp.cn/?id=refreshed.png",
            ),
        )
        update_success_mock.assert_awaited()
        update_element_mock.assert_awaited_with(
            element_id=1626,
            image_url="data/images/element_1626_new.png",
            image_status="success",
        )


if __name__ == "__main__":
    unittest.main()
