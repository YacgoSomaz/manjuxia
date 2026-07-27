import asyncio
import os
import tempfile
import unittest
from unittest import mock

from services.video_service import VideoService


class DreaminaCliResolutionTest(unittest.TestCase):
    def test_env_path_has_highest_priority(self):
        with tempfile.TemporaryDirectory() as tmp:
            cli = os.path.join(tmp, "dreamina.exe")
            with open(cli, "wb") as f:
                f.write(b"stub")

            service = VideoService()
            with mock.patch.dict(os.environ, {"DREAMINA_PATH": cli}):
                self.assertEqual(service._get_dreamina_path(), cli)

    def test_packaged_nuitka_backend_finds_bundled_cli(self):
        with tempfile.TemporaryDirectory() as tmp:
            backend_dir = os.path.join(tmp, "resources", "backend-dist", "backend-server")
            dreamina_dir = os.path.join(tmp, "resources", "backend-dist", "dreamina")
            os.makedirs(backend_dir, exist_ok=True)
            os.makedirs(dreamina_dir, exist_ok=True)
            backend_exe = os.path.join(backend_dir, "backend-server.exe")
            bundled_cli = os.path.join(dreamina_dir, "dreamina.exe")
            with open(backend_exe, "wb") as f:
                f.write(b"backend")
            with open(bundled_cli, "wb") as f:
                f.write(b"dreamina")

            service = VideoService()
            with mock.patch.dict(os.environ, {}, clear=True), \
                 mock.patch("services.video_service.sys.executable", backend_exe), \
                 mock.patch("services.video_service.shutil.which", return_value=None):
                self.assertEqual(service._get_dreamina_path(), bundled_cli)

    def test_missing_cli_returns_actionable_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            service = VideoService()
            with mock.patch.dict(os.environ, {}, clear=True), \
                 mock.patch("services.video_service.is_frozen", return_value=False), \
                 mock.patch("services.video_service.shutil.which", return_value=None), \
                 mock.patch("services.video_service.os.path.expanduser", return_value=tmp), \
                 mock.patch("services.video_service.os.path.exists", return_value=False):
                result = asyncio.run(service._run_command("user_credit"))

        self.assertFalse(result["success"])
        self.assertEqual(result["code"], "CLI_MISSING")
        self.assertIn("dreamina.exe", result["error"])
        self.assertIn("即梦 CLI", result["error"])

    def test_login_failure_reports_membership_requirement(self):
        detail = (
            "ERROR waitForLogin login callback reported failure "
            "err=请先成为即梦高级会员后体验 Dreamina CLI 功能，可以在即梦 web 页面上完成订阅计划升级，logid = abc"
        )

        message = VideoService._format_login_failure(1, detail)

        self.assertIn("即梦高级会员", message)
        self.assertIn("Dreamina CLI", message)
        self.assertNotIn("错误码: 1", message)


if __name__ == "__main__":
    unittest.main()
