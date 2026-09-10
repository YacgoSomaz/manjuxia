import os
import sys
import unittest


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.storyboard_service import StoryboardService
from services.video_model_capabilities import (
    canonical_video_model_name,
    get_video_model_capabilities,
    is_video_generation_available,
    normalize_video_model_family,
    reference_audio_duration_error,
    reference_video_duration_error,
)


class VideoModelCapabilityTests(unittest.TestCase):
    def test_seedance_20_defaults_are_backward_compatible(self):
        capabilities = get_video_model_capabilities(None)

        self.assertEqual(capabilities["family"], "seedance_2_0")
        self.assertEqual(capabilities["max_duration_seconds"], 15)
        self.assertEqual(capabilities["max_images"], 9)
        self.assertEqual(capabilities["max_audios"], 3)
        self.assertEqual(capabilities["max_total_materials"], 12)
        self.assertTrue(capabilities["video_generation_available"])

    def test_seedance_25_capabilities(self):
        capabilities = get_video_model_capabilities("Seedance 2.5")

        self.assertEqual(capabilities["family"], "seedance_2_5")
        self.assertEqual(capabilities["max_duration_seconds"], 30)
        self.assertEqual(capabilities["max_images"], 30)
        self.assertEqual(capabilities["max_audios"], 10)
        self.assertEqual(capabilities["max_videos"], 10)
        self.assertEqual(capabilities["max_total_materials"], 50)
        self.assertEqual(capabilities["recommended_max_subject_images"], 8)
        self.assertEqual(capabilities["recommended_max_subject_videos"], 5)
        self.assertFalse(capabilities["video_generation_available"])

        pippit_capabilities = get_video_model_capabilities(
            "Seedance_2.5",
            "pippit_cli",
        )
        self.assertTrue(pippit_capabilities["video_generation_available"])
        self.assertTrue(is_video_generation_available("Seedance_2.5", "xiaoyunque"))
        self.assertTrue(is_video_generation_available("Seedance_2.5", "jimeng"))
        self.assertFalse(is_video_generation_available("Seedance_2.5", "cool"))

    def test_template_model_family_drives_storyboard_duration_limit(self):
        self.assertEqual(
            StoryboardService._section_duration_limit_for_template(
                {"model_family": "seedance_2_0"}
            ),
            15,
        )
        self.assertEqual(
            StoryboardService._section_duration_limit_for_template(
                {"model_family": "seedance_2_5"}
            ),
            30,
        )

    def test_model_name_normalization_accepts_cli_style_names(self):
        self.assertEqual(
            normalize_video_model_family("seedance2.5-vip"),
            "seedance_2_5",
        )
        self.assertEqual(
            normalize_video_model_family("seedance2.0fast"),
            "seedance_2_0",
        )
        self.assertEqual(
            normalize_video_model_family("Seedance_2.5"),
            "seedance_2_5",
        )

    def test_pippit_seedance_25_uses_exact_official_identifier(self):
        self.assertEqual(
            canonical_video_model_name("seedance2.5", "pippit_cli"),
            "Seedance_2.5",
        )
        self.assertEqual(
            canonical_video_model_name("Seedance_2.5", "jimeng"),
            "seedance2.5",
        )

    def test_seedance_25_reference_duration_tolerance_and_total(self):
        self.assertEqual(reference_audio_duration_error("seedance2.5", [1.8]), "")
        self.assertEqual(reference_audio_duration_error("seedance2.5", [30.2]), "")
        self.assertIn("2-30", reference_audio_duration_error("seedance2.5", [1.79]))
        self.assertIn("2-30", reference_audio_duration_error("seedance2.5", [30.21]))
        self.assertIn("总时长", reference_audio_duration_error("seedance2.5", [15.2, 15.1]))
        self.assertIn("总时长", reference_video_duration_error("seedance2.5", [10.1, 20.2]))

    def test_seedance_20_reference_total_remains_model_specific(self):
        self.assertEqual(reference_audio_duration_error("seedance2.0_vip", [7.5, 7.5]), "")
        self.assertIn("总时长", reference_audio_duration_error("seedance2.0_vip", [8, 8]))


if __name__ == "__main__":
    unittest.main()
