import base64
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from api.topview_demo import _file_to_base64


class TopviewPathTests(unittest.TestCase):
    def test_db_relative_image_uses_resolved_media_path(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            image_path = Path(tmp_dir) / "grid.png"
            Image.new("RGB", (32, 24), color=(20, 40, 60)).save(image_path)

            with patch(
                "api.topview_demo.resolve_db_path",
                return_value=str(image_path),
            ) as resolve_mock:
                encoded = _file_to_base64("data/images/novel/scene_grid.png")

            resolve_mock.assert_called_once_with("data/images/novel/scene_grid.png")
            self.assertGreater(len(base64.b64decode(encoded)), 0)


if __name__ == "__main__":
    unittest.main()
