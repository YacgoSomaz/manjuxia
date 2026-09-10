import base64
import io
import unittest

from PIL import Image

from services.llm_service import (
    _attach_ephemeral_images,
    _redact_multimodal_messages_for_log,
)
from services.scene_reference_service import (
    MAX_OUTPUT_BYTES,
    _active_scene_image,
    _compress_image_data_url,
    dispose_scene_references,
    match_scene_element,
)


def _scene(element_id: int, name: str, **extra):
    return {
        "id": element_id,
        "element_type": "scene",
        "name": name,
        "aliases": [],
        **extra,
    }


class SceneReferenceMatchingTests(unittest.TestCase):
    def test_exact_time_slot_wins_without_crossing_day_and_night(self):
        morning = _scene(1, "藏偶冷室·清晨")
        night = _scene(2, "藏偶冷室·夜")

        result = match_scene_element(
            [night, morning],
            "【内 藏偶冷室 清晨】",
        )

        self.assertEqual(result["id"], 1)

    def test_common_white_day_label_matches(self):
        result = match_scene_element(
            [_scene(1, "新房·白日"), _scene(2, "新房·夜")],
            "【内 新房 白日】",
        )
        self.assertEqual(result["id"], 1)

    def test_timed_scene_does_not_fallback_when_location_has_variants(self):
        result = match_scene_element(
            [_scene(1, "茶室"), _scene(2, "茶室·夜")],
            "【内 茶室 清晨】",
        )
        self.assertIsNone(result)

    def test_duplicate_exact_assets_are_ambiguous_and_skipped(self):
        result = match_scene_element(
            [_scene(1, "茶室·日"), _scene(2, "茶室·日")],
            "【内 茶室 日】",
        )
        self.assertIsNone(result)

    def test_active_image_never_uses_contact_sheet(self):
        field, value = _active_scene_image(_scene(
            1,
            "茶室",
            grid_image="/grid.png",
            reference_image="/reference.png",
            finished_image="/finished.png",
        ))
        self.assertEqual((field, value), ("finished_image", "/finished.png"))


class SceneReferenceMemoryTests(unittest.TestCase):
    def test_compression_returns_small_data_url_without_file_output(self):
        source = io.BytesIO()
        Image.new("RGB", (2400, 1800), (32, 64, 96)).save(source, format="PNG")

        data_url = _compress_image_data_url(source.getvalue())
        encoded = data_url.split(",", 1)[1]
        binary = base64.b64decode(encoded)

        self.assertTrue(data_url.startswith("data:image/jpeg;base64,"))
        self.assertLessEqual(len(binary), MAX_OUTPUT_BYTES)
        with Image.open(io.BytesIO(binary)) as image:
            self.assertLessEqual(max(image.size), 1600)

    def test_dispose_blanks_and_clears_references(self):
        refs = [{"data_url": "data:image/jpeg;base64,AAAA", "label": "x"}]
        original = refs[0]

        dispose_scene_references(refs)

        self.assertEqual(refs, [])
        self.assertEqual(original["data_url"], "")

    def test_llm_log_redaction_never_contains_base64(self):
        messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": "生成分镜"},
                {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,SECRET"}},
            ],
        }]

        redacted = _redact_multimodal_messages_for_log(messages, 1)

        self.assertNotIn("SECRET", str(redacted))
        self.assertIn("临时图片已脱敏", str(redacted))

    def test_llm_log_redaction_also_removes_gemini_inline_data(self):
        messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": "生成分镜"},
                {"inlineData": {"mimeType": "image/jpeg", "data": "SECRET_INLINE"}},
            ],
        }]

        redacted = _redact_multimodal_messages_for_log(messages)

        self.assertNotIn("SECRET_INLINE", str(redacted))
        self.assertIn("临时图片已脱敏", str(redacted))

    def test_attach_does_not_mutate_text_only_caller_messages(self):
        messages = [{"role": "user", "content": "生成分镜"}]
        refs = [{
            "data_url": "data:image/jpeg;base64,QUJDRA==",
            "label": "茶室素材图",
            "instruction": "只参考空间",
        }]

        attached = _attach_ephemeral_images(messages, refs)

        self.assertEqual(messages, [{"role": "user", "content": "生成分镜"}])
        self.assertIsInstance(attached[0]["content"], list)
        self.assertIn("QUJDRA==", str(attached))


if __name__ == "__main__":
    unittest.main()
