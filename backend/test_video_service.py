import unittest
import sys
from unittest.mock import AsyncMock, Mock, patch

from services.video_service import VideoService
from api import video as video_api


class VideoServiceMultimodalTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        VideoService._clear_cli_permission_denied()
        VideoService._dreamina_submit_warmed = False

    async def test_login_check_reuses_recent_confirmed_result(self):
        service = VideoService()
        confirmed = {
            "success": True,
            "data": {"total_credit": 1234, "vip_credit": 1234, "user_id": 1001},
        }
        service._run_command = AsyncMock(return_value=confirmed)

        first = await service.check_login()
        second = await service.check_login()

        self.assertEqual(first["data"]["total_credit"], 1234)
        self.assertEqual(second["data"]["total_credit"], 1234)
        self.assertEqual(first["data"]["_cli_permission"], "available")
        service._run_command.assert_awaited_once_with("user_credit")

    async def test_forced_login_check_bypasses_cache(self):
        service = VideoService()
        service._run_command = AsyncMock(side_effect=[
            {"success": True, "data": {"total_credit": 10, "user_id": 1001}},
            {"success": True, "data": {"total_credit": 20, "user_id": 1001}},
        ])

        await service.check_login()
        refreshed = await service.check_login(force=True)

        self.assertEqual(refreshed["data"]["total_credit"], 20)
        self.assertEqual(service._run_command.await_count, 2)

    async def test_transient_forced_login_failure_does_not_destroy_confirmed_cache(self):
        service = VideoService()
        confirmed = {"success": True, "data": {"total_credit": 88, "user_id": 1001}}
        transient = {"success": False, "error": "命令执行超时(60秒)"}
        service._run_command = AsyncMock(side_effect=[confirmed, transient])

        await service.check_login()
        failed_refresh = await service.check_login(force=True)
        cached_after_failure = await service.check_login()

        self.assertEqual(failed_refresh, transient)
        self.assertEqual(cached_after_failure["data"]["total_credit"], 88)
        self.assertEqual(cached_after_failure["data"]["_cli_permission"], "available")
        self.assertEqual(service._run_command.await_count, 2)

    def test_extracts_official_jimeng_oauth_url(self):
        url = (
            "https://jimeng.jianying.com/ai_tool/cli-auth?"
            "verification_uri=https%3A%2F%2Fjimeng.jianying.com%2Fpassport&"
            "user_code=ABCD1234"
        )
        self.assertEqual(
            VideoService._extract_jimeng_oauth_url(
                f"verification_uri: {url}"
            ),
            url,
        )

    def test_rejects_non_jimeng_oauth_url(self):
        self.assertEqual(
            VideoService._extract_jimeng_oauth_url(
                "verification_uri: https://example.com/steal?user_code=123"
            ),
            "",
        )

    def test_oauth_output_filter_removes_temporary_codes(self):
        self.assertEqual(
            VideoService._safe_oauth_cli_line("device_code: secret-value"),
            "",
        )
        self.assertEqual(
            VideoService._safe_oauth_cli_line("请使用浏览器完成授权"),
            "请使用浏览器完成授权",
        )

    def test_private_browser_args_force_account_choice(self):
        url = "https://jimeng.jianying.com/ai_tool/cli-auth?user_code=ABCD"
        self.assertEqual(
            VideoService._private_browser_args("C:/Edge/msedge.exe", url),
            ["C:/Edge/msedge.exe", "--inprivate", "--new-window", url],
        )
        self.assertEqual(
            VideoService._private_browser_args("C:/Chrome/chrome.exe", url),
            ["C:/Chrome/chrome.exe", "--incognito", "--new-window", url],
        )

    async def test_zero_credit_is_authorized_but_permission_unknown(self):
        service = VideoService()
        service._run_command = AsyncMock(return_value={
            "success": True,
            "data": {"total_credit": 0, "vip_credit": 0, "user_id": 1001},
        })

        result = await service.check_login(force=True)

        self.assertEqual(result["data"]["_cli_permission"], "unknown")

    async def test_zero_identity_placeholder_is_marked_unverified_but_submit_allowed(self):
        service = VideoService()
        service._run_command = AsyncMock(return_value={
            "success": True,
            "data": {
                "total_credit": 0,
                "user_id": 0,
                "user_name": "",
                "vip_level": "",
            },
        })

        result = await service.check_login(force=True)

        self.assertFalse(service._is_logged_in_credit_result(result))
        self.assertTrue(result["data"]["_identity_unverified"])
        self.assertEqual(result["data"]["_cli_permission"], "unknown")

    async def test_check_login_api_allows_oauth_with_unsynced_identity(self):
        incomplete = {
            "success": True,
            "data": {
                "total_credit": 0,
                "user_id": 0,
                "_identity_unverified": True,
                "_identity_unverified_message": "identity pending",
            },
        }
        with patch.object(
            video_api.video_service,
            "check_login",
            AsyncMock(return_value=incomplete),
        ):
            result = await video_api.check_login(force=True)

        self.assertTrue(result["success"])
        self.assertTrue(result["logged_in"])
        self.assertTrue(result["can_generate"])
        self.assertTrue(result["identity_unverified"])
        self.assertEqual(result["cli_permission"], "unknown")
        self.assertEqual(result["message"], "identity pending")

    async def test_login_return_code_zero_allows_submit_when_user_id_is_unsynced(self):
        service = VideoService()
        service._run_jimeng_oauth_command = AsyncMock(return_value={
            "return_code": 0,
            "browser_opened": True,
            "safe_output": "OAuth 登录成功。\n登录成功，但获取账户信息失败: user_id is required",
        })
        service.check_login = AsyncMock(return_value={
            "success": True,
            "data": {"total_credit": 0, "user_id": 0},
        })

        result = await service.login()

        self.assertTrue(result["success"])
        self.assertTrue(result["identity_unverified"])
        self.assertNotIn("needs_relogin", result)
        self.assertIn("真实余额未知", result["message"])

    async def test_relogin_return_code_zero_allows_submit_when_user_id_is_unsynced(self):
        service = VideoService()
        service._run_jimeng_oauth_command = AsyncMock(side_effect=[
            {"return_code": 0, "browser_opened": False, "safe_output": ""},
            {
                "return_code": 0,
                "browser_opened": True,
                "safe_output": "OAuth 登录成功。\n登录成功，但获取账户信息失败: user_id is required",
            },
        ])
        service._clear_dreamina_oauth_state = Mock(return_value={
            "success": True,
            "removed": True,
            "error": "",
        })
        service.check_login = AsyncMock(return_value={
            "success": True,
            "data": {"total_credit": 0, "user_id": 0},
        })

        result = await service.relogin()

        self.assertTrue(result["success"])
        self.assertTrue(result["identity_unverified"])
        self.assertIn("真实余额未知", result["message"])

    async def test_known_cli_permission_denial_decorates_login_result(self):
        service = VideoService()
        VideoService._mark_cli_permission_denied(
            "current account is not allowed to use dreamina_cli"
        )
        service._run_command = AsyncMock(return_value={
            "success": True,
            "data": {"total_credit": 0, "vip_credit": 0, "user_id": 1001},
        })

        result = await service.check_login(force=True)

        self.assertEqual(result["data"]["_cli_permission"], "denied")

    async def test_check_login_api_exposes_authorized_but_denied_state(self):
        denied = {
            "success": True,
            "data": {
                "total_credit": 0,
                "_cli_permission": "denied",
                "_cli_permission_message": "当前账号无 CLI 权限",
            },
        }
        with patch.object(
            video_api.video_service,
            "check_login",
            AsyncMock(return_value=denied),
        ):
            result = await video_api.check_login(force=True)

        self.assertTrue(result["logged_in"])
        self.assertFalse(result["can_generate"])
        self.assertEqual(result["cli_permission"], "denied")

    async def test_oauth_command_opens_browser_without_console(self):
        class FakeStream:
            def __init__(self, lines):
                self.lines = list(lines)

            async def readline(self):
                if not self.lines:
                    return b""
                return self.lines.pop(0)

        class FakeProcess:
            def __init__(self):
                self.stdout = FakeStream([
                    "请使用浏览器完成 OAuth Device Flow 登录。\n".encode("utf-8"),
                    (
                        "verification_uri: "
                        "https://jimeng.jianying.com/ai_tool/cli-auth?user_code=ABCD\n"
                    ).encode("utf-8"),
                    b"device_code: hidden\n",
                ])
                self.returncode = 0

            async def wait(self):
                return self.returncode

            def kill(self):
                self.returncode = -9

        service = VideoService()
        service._get_dreamina_path = lambda: "dreamina.exe"
        VideoService._dreamina_cli_lock = None
        fake_process = FakeProcess()
        create_process = AsyncMock(return_value=fake_process)

        with patch(
            "services.video_service.asyncio.create_subprocess_exec",
            create_process,
        ), patch.object(
            VideoService,
            "_open_jimeng_oauth_url",
            return_value=True,
        ) as open_browser:
            result = await service._run_jimeng_oauth_command("login", timeout=5)

        self.assertEqual(result["return_code"], 0)
        self.assertTrue(result["browser_opened"])
        open_browser.assert_called_once_with(
            "https://jimeng.jianying.com/ai_tool/cli-auth?user_code=ABCD",
            force_fresh_account=False,
        )
        self.assertNotIn("device_code", result["safe_output"])
        self.assertNotIn("ABCD", result["safe_output"])
        kwargs = create_process.await_args.kwargs
        self.assertEqual(kwargs["stdout"], __import__("asyncio").subprocess.PIPE)
        self.assertEqual(kwargs["stderr"], __import__("asyncio").subprocess.STDOUT)

    async def test_relogin_forces_fresh_browser_account(self):
        service = VideoService()
        service._run_jimeng_oauth_command = AsyncMock(side_effect=[
            {"return_code": 0, "browser_opened": False},
            {"return_code": 0, "browser_opened": True},
        ])
        service._clear_dreamina_oauth_state = Mock(return_value={
            "success": True,
            "removed": True,
            "error": "",
        })
        service.check_login = AsyncMock(return_value={
            "success": True,
            "data": {"total_credit": 10, "user_id": 1001},
        })
        VideoService._mark_cli_permission_denied(
            "current account is not allowed to use dreamina_cli"
        )

        result = await service.relogin()

        self.assertTrue(result["success"])
        self.assertEqual(
            service._run_jimeng_oauth_command.await_args_list,
            [
                unittest.mock.call("logout", timeout=60),
                unittest.mock.call("login", force_fresh_account=True),
            ],
        )
        service._clear_dreamina_oauth_state.assert_called_once_with()
        self.assertEqual(VideoService._dreamina_cli_permission_denied_reason, "")

    async def test_login_refresh_10046_automatically_relogs_in(self):
        service = VideoService()
        service._run_jimeng_oauth_command = AsyncMock(side_effect=[
            {
                "return_code": 1,
                "browser_opened": False,
                "safe_output": "authsdk: refresh failed: protocol server: code=10046",
            },
            {
                "return_code": 0,
                "browser_opened": False,
                "safe_output": "",
            },
            {
                "return_code": 0,
                "browser_opened": True,
                "safe_output": "",
            },
        ])
        service._clear_dreamina_oauth_state = Mock(return_value={
            "success": True,
            "removed": True,
            "error": "",
        })
        service.check_login = AsyncMock(return_value={
            "success": True,
            "data": {"total_credit": 10, "user_id": 1001},
        })

        result = await service.login()

        self.assertTrue(result["success"])
        self.assertIn("自动重置", result["message"])
        self.assertEqual(
            service._run_jimeng_oauth_command.await_args_list,
            [
                unittest.mock.call("login"),
                unittest.mock.call("logout", timeout=60),
                unittest.mock.call("login"),
            ],
        )
        service._clear_dreamina_oauth_state.assert_called_once_with()

    def test_clear_oauth_state_targets_authsdk_registry_only(self):
        class FakeKey:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

        class FakeWinreg:
            HKEY_CURRENT_USER = object()
            KEY_READ = 1
            KEY_WRITE = 2

            def __init__(self):
                self.opened = []
                self.deleted = []

            def OpenKey(self, root, path, *_args):
                self.opened.append((root, path))
                return FakeKey()

            @staticmethod
            def EnumKey(_key, _index):
                raise OSError()

            def DeleteKey(self, root, path):
                self.deleted.append((root, path))

        fake_winreg = FakeWinreg()
        with patch("services.video_service.sys.platform", "win32"), patch.dict(
            sys.modules,
            {"winreg": fake_winreg},
        ):
            result = VideoService._clear_dreamina_oauth_state()

        self.assertTrue(result["success"])
        self.assertTrue(result["removed"])
        self.assertEqual(
            fake_winreg.deleted,
            [(fake_winreg.HKEY_CURRENT_USER, VideoService._dreamina_oauth_registry_path)],
        )

    async def test_relogin_stops_when_local_credential_cannot_be_cleared(self):
        service = VideoService()
        service._run_jimeng_oauth_command = AsyncMock(return_value={
            "return_code": 1,
            "safe_output": "authsdk: refresh failed: protocol server: code=10046",
        })
        service._clear_dreamina_oauth_state = Mock(return_value={
            "success": False,
            "removed": False,
            "error": "credential locked",
        })

        result = await service.relogin()

        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "credential locked")
        service._run_jimeng_oauth_command.assert_awaited_once_with("logout", timeout=60)

    async def test_login_10046_stops_when_local_credential_cannot_be_cleared(self):
        service = VideoService()
        service._run_jimeng_oauth_command = AsyncMock(side_effect=[
            {
                "return_code": 1,
                "safe_output": "authsdk: refresh failed: protocol server: code=10046",
            },
            {
                "return_code": 1,
                "safe_output": "authsdk: refresh failed: protocol server: code=10046",
            },
        ])
        service._clear_dreamina_oauth_state = Mock(return_value={
            "success": False,
            "removed": False,
            "error": "credential locked",
        })

        result = await service.login()

        self.assertFalse(result["success"])
        self.assertEqual(result["message"], "credential locked")
        self.assertEqual(
            service._run_jimeng_oauth_command.await_args_list,
            [
                unittest.mock.call("login"),
                unittest.mock.call("logout", timeout=60),
            ],
        )

    async def test_login_non_refresh_error_does_not_clear_credentials(self):
        service = VideoService()
        service._run_jimeng_oauth_command = AsyncMock(return_value={
            "return_code": 1,
            "browser_opened": False,
            "safe_output": "network unavailable",
        })
        service.check_login = AsyncMock(return_value={"success": False})

        result = await service.login()

        self.assertFalse(result["success"])
        service._run_jimeng_oauth_command.assert_awaited_once_with("login")

    async def test_multimodal_always_sends_supported_resolution(self):
        service = VideoService()
        service._ensure_submit_warmed = AsyncMock()
        service._run_command = AsyncMock(return_value={"success": True})

        await service.multimodal2video(
            prompt="test",
            images=["image.png"],
            duration=5,
            ratio="9:16",
            resolution="720P",
            model_version="seedance2.0_vip",
            poll=0,
        )

        args = service._run_command.await_args.args
        self.assertIn("--video_resolution=720p", args)

    async def test_multimodal_falls_back_to_720p_for_unknown_resolution(self):
        service = VideoService()
        service._ensure_submit_warmed = AsyncMock()
        service._run_command = AsyncMock(return_value={"success": True})

        await service.multimodal2video(
            prompt="test",
            images=["image.png"],
            resolution="1080P",
            poll=0,
        )

        args = service._run_command.await_args.args
        self.assertIn("--video_resolution=720p", args)
        self.assertNotIn("--video_resolution=1080p", args)

    async def test_seedance_25_text2video_uses_official_identifier_and_480p(self):
        service = VideoService()
        service._ensure_submit_warmed = AsyncMock()
        service._run_command = AsyncMock(return_value={"success": True})

        await service.generate_video(
            prompt="test",
            duration=30,
            ratio="9:16",
            resolution="480P",
            model_version="Seedance_2.5",
            poll=0,
        )

        args = service._run_command.await_args.args
        self.assertEqual(args[0], "text2video")
        self.assertIn("--duration=30", args)
        self.assertIn("--video_resolution=480p", args)
        self.assertIn("--model_version=seedance2.5", args)

    async def test_seedance_25_image2video_includes_required_resolution(self):
        service = VideoService()
        service._ensure_submit_warmed = AsyncMock()
        service._run_command = AsyncMock(return_value={"success": True})

        await service.image2video(
            image="image.png",
            prompt="test",
            duration=30,
            resolution="480P",
            model_version="seedance2.5",
            poll=0,
        )

        args = service._run_command.await_args.args
        self.assertEqual(args[0], "image2video")
        self.assertIn("--video_resolution=480p", args)
        self.assertIn("--model_version=seedance2.5", args)

    async def test_seedance_25_frames2video_uses_first_and_last(self):
        service = VideoService()
        service._ensure_submit_warmed = AsyncMock()
        service._run_command = AsyncMock(return_value={"success": True})

        await service.frames2video(
            first="first.png",
            last="last.png",
            prompt="test",
            duration=30,
            resolution="720P",
            model_version="seedance2.5",
            poll=0,
        )

        args = service._run_command.await_args.args
        self.assertEqual(args[0], "frames2video")
        self.assertIn("--first=first.png", args)
        self.assertIn("--last=last.png", args)
        self.assertIn("--duration=30", args)
        self.assertIn("--video_resolution=720p", args)

    async def test_seedance_25_multimodal_supports_audio_only(self):
        service = VideoService()
        service._ensure_submit_warmed = AsyncMock()
        service._run_command = AsyncMock(return_value={"success": True})

        await service.multimodal2video(
            prompt="test",
            audios=["voice.wav"],
            duration=30,
            resolution="480P",
            model_version="seedance2.5",
            poll=0,
        )

        args = service._run_command.await_args.args
        self.assertEqual(args[0], "multimodal2video")
        self.assertIn("--audio=voice.wav", args)
        self.assertIn("--video_resolution=480p", args)
        self.assertIn("--model_version=seedance2.5", args)


if __name__ == "__main__":
    unittest.main()
