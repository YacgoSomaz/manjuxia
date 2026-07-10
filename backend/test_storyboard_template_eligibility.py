import unittest

from services.storyboard_service import _storyboard_assemble_eligibility


class StoryboardTemplateEligibilityTests(unittest.TestCase):
    def test_local_preset_with_bundled_content_uses_legacy_mode(self):
        mode, value = _storyboard_assemble_eligibility({
            "is_preset": 1,
            "category": "storyboard_generation",
            "admin_id": None,
            "content": "local bundled storyboard prompt",
        })
        self.assertEqual((mode, value), ("legacy", None))

    def test_preset_without_admin_or_content_still_fails_closed(self):
        mode, _ = _storyboard_assemble_eligibility({
            "is_preset": 1,
            "category": "storyboard_generation",
            "admin_id": None,
            "content": "",
        })
        self.assertEqual(mode, "fail")

    def test_remote_preset_with_admin_uses_assemble_mode(self):
        self.assertEqual(
            _storyboard_assemble_eligibility({
                "is_preset": 1,
                "category": "storyboard_generation",
                "admin_id": 38,
                "content": "",
            }),
            ("assemble", 38),
        )


if __name__ == "__main__":
    unittest.main()
