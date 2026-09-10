import os
import tempfile
import unittest
from unittest.mock import ANY, AsyncMock, patch

from api.extra import LinkToElementRequest, link_fusion_to_element
from services.extraction_service import ExtractionService


class _HistoryCursor:
    def __init__(self, row):
        self.row = row

    async def fetchone(self):
        return self.row


class _HistoryDb:
    def __init__(self, row):
        self.row = row
        self.sql = ""

    async def execute(self, sql, *_args):
        self.sql = sql
        return _HistoryCursor(self.row)

    async def close(self):
        return None


class FusionLinkDescriptionTests(unittest.IsolatedAsyncioTestCase):
    async def test_link_to_base_element_replaces_image_and_description(self):
        prompt = "1:1正方形构图，纯古代蓝调冷室，木构与冷雾细节清晰。"
        history_db = _HistoryDb({
            "output_image_url": "data/images/fusion-source.png",
            "status": "success",
            "prompt": prompt,
        })

        with tempfile.TemporaryDirectory() as tmp:
            source = os.path.join(tmp, "fusion-source.png")
            images_dir = os.path.join(tmp, "images")
            with open(source, "wb") as f:
                f.write(b"fusion-image")

            update_image = AsyncMock(return_value={"id": 11})
            update_element = AsyncMock(return_value={"id": 11, "description": prompt})
            with (
                patch("api.extra.get_db", AsyncMock(return_value=history_db)),
                patch("utils.paths.resolve_db_path", return_value=source),
                patch("utils.paths.media_subdir", return_value=images_dir),
                patch.object(
                    ExtractionService,
                    "get_element",
                    AsyncMock(return_value={
                        "id": 11,
                        "name": "藏偶冷室",
                        "element_type": "scene",
                        "finished_image": None,
                    }),
                ),
                patch.object(ExtractionService, "update_element_image", update_image),
                patch.object(ExtractionService, "update_element", update_element),
            ):
                result = await link_fusion_to_element(
                    LinkToElementRequest(history_id=7, element_id=11)
                )

        self.assertIn("prompt", history_db.sql)
        update_image.assert_awaited_once_with(
            element_id=11,
            finished_image=ANY,
            image_status=None,
            image_prompt=prompt,
        )
        update_element.assert_awaited_once_with(11, {"description": prompt})
        self.assertEqual(result["description"], prompt)
        self.assertTrue(result["description_replaced"])
        self.assertIn("成品图和描述", result["message"])

    async def test_link_to_character_variant_replaces_variant_description_only(self):
        prompt = "古装女主红嫁衣BJD仿真人造型，妆发与配饰连续稳定。"
        history_db = _HistoryDb({
            "output_image_url": "data/images/fusion-variant.png",
            "status": "success",
            "prompt": prompt,
        })

        with tempfile.TemporaryDirectory() as tmp:
            source = os.path.join(tmp, "fusion-variant.png")
            images_dir = os.path.join(tmp, "images")
            with open(source, "wb") as f:
                f.write(b"variant-image")

            update_variant = AsyncMock(return_value={"id": 21})
            update_element = AsyncMock()
            with (
                patch("api.extra.get_db", AsyncMock(return_value=history_db)),
                patch("utils.paths.resolve_db_path", return_value=source),
                patch("utils.paths.media_subdir", return_value=images_dir),
                patch("api.extra._build_variant_finished_rel", AsyncMock(return_value=None)),
                patch.object(
                    ExtractionService,
                    "get_element",
                    AsyncMock(return_value={
                        "id": 12,
                        "name": "云瓷",
                        "element_type": "character",
                        "finished_image": "data/images/old-main.png",
                    }),
                ),
                patch.object(
                    ExtractionService,
                    "get_variant_by_name",
                    AsyncMock(return_value={"id": 21, "finished_image": None}),
                ),
                patch.object(ExtractionService, "update_variant", update_variant),
                patch.object(ExtractionService, "update_element", update_element),
            ):
                result = await link_fusion_to_element(
                    LinkToElementRequest(
                        history_id=8,
                        element_id=12,
                        variant_name="新婚嫁衣",
                    )
                )

        update_variant.assert_awaited_once_with(
            21,
            finished_image=ANY,
            image_status="success",
            description=prompt,
            image_prompt=prompt,
        )
        update_element.assert_not_awaited()
        self.assertEqual(result["description"], prompt)
        self.assertTrue(result["description_replaced"])
        self.assertIn("马甲", result["message"])
        self.assertIn("描述", result["message"])


if __name__ == "__main__":
    unittest.main()
