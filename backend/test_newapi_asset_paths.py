import os
import tempfile
import unittest
from unittest.mock import patch

from api import video


class NewApiAssetPathTests(unittest.TestCase):
    def test_unprefixed_data_image_path_uses_database_resolver(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            image_path = os.path.join(tmp_dir, "角色_老唐.png")
            with open(image_path, "wb") as file:
                file.write(b"png")

            with patch("api.video.resolve_db_path", return_value=image_path) as resolve:
                result = video._newapi_upload_asset("data/images/老唐/角色_老唐.png", "image")

            resolve.assert_called_once_with("data/images/老唐/角色_老唐.png")
            self.assertEqual(result["path"], image_path)
            self.assertEqual(result["kind"], "image")
            self.assertNotIn("error", result)

    def test_slash_prefixed_data_path_still_uses_database_resolver(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            audio_path = os.path.join(tmp_dir, "角色_老唐.mp3")
            with open(audio_path, "wb") as file:
                file.write(b"audio")

            with patch("api.video.resolve_db_path", return_value=audio_path) as resolve:
                result = video._newapi_upload_asset("/data/images/老唐/角色_老唐.mp3", "audio")

            resolve.assert_called_once_with("/data/images/老唐/角色_老唐.mp3")
            self.assertEqual(result["path"], audio_path)
            self.assertNotIn("error", result)

    def test_remote_url_is_not_resolved_as_a_local_file(self):
        remote = "https://cdn.example.com/角色_老唐.png"
        with patch("api.video.resolve_db_path") as resolve:
            result = video._newapi_upload_asset(remote, "image")

        resolve.assert_not_called()
        self.assertEqual(result, {"url": remote, "kind": "image"})


if __name__ == "__main__":
    unittest.main()
