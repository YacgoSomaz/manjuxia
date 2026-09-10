import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from services.image_upscale_service import LocalImageUpscaler


class _FakeProcess:
    def __init__(
        self,
        returncode: int,
        *,
        stderr: bytes = b"",
        output_path: Path | None = None,
        output_size: tuple[int, int] = (40, 40),
    ):
        self.returncode = returncode
        self._stderr = stderr
        self._output_path = output_path
        self._output_size = output_size

    async def communicate(self):
        if self.returncode == 0 and self._output_path is not None:
            Image.new("RGB", self._output_size, "white").save(
                self._output_path,
                format="JPEG",
            )
        return b"", self._stderr

    def kill(self):
        self.returncode = -9

    async def wait(self):
        return self.returncode


class LocalImageUpscalerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        LocalImageUpscaler._lock = None

    async def asyncTearDown(self):
        LocalImageUpscaler._lock = None

    def test_detects_amd_vulkan_memory_failure(self):
        self.assertTrue(
            LocalImageUpscaler._is_gpu_memory_failure(
                3221225477,
                "vkAllocateMemory failed -2",
            )
        )
        self.assertTrue(
            LocalImageUpscaler._is_gpu_memory_failure(
                -1073741819,
                "",
            )
        )
        self.assertFalse(
            LocalImageUpscaler._is_gpu_memory_failure(
                1,
                "invalid model file",
            )
        )

    async def test_retries_with_smaller_tile_after_gpu_memory_failure(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            executable = root / "realesrgan-ncnn-vulkan.exe"
            executable.touch()
            model_dir = root / "models"
            model_dir.mkdir()
            (model_dir / "realesrgan-x4plus.bin").touch()
            (model_dir / "realesrgan-x4plus.param").touch()

            source = root / "source.jpg"
            target = root / "target.jpg"
            Image.new("RGB", (10, 10), "black").save(source)
            attempted_tiles: list[str] = []
            attempted_worker_modes: list[str | None] = []

            async def fake_create_subprocess_exec(*args, **_kwargs):
                tile = str(args[args.index("-t") + 1])
                attempted_tiles.append(tile)
                attempted_worker_modes.append(
                    str(args[args.index("-j") + 1]) if "-j" in args else None
                )
                output_path = Path(args[args.index("-o") + 1])
                if tile == "0":
                    return _FakeProcess(
                        3221225477,
                        stderr=b"vkAllocateMemory failed -2",
                    )
                return _FakeProcess(0, output_path=output_path)

            with (
                patch.object(
                    LocalImageUpscaler,
                    "_resolve_executable",
                    return_value=executable,
                ),
                patch(
                    "services.image_upscale_service.asyncio.create_subprocess_exec",
                    new=fake_create_subprocess_exec,
                ),
            ):
                result = await LocalImageUpscaler()._upscale_to_dimensions(
                    source=source,
                    target=target,
                    input_size=(10, 10),
                    expected_size=(20, 20),
                    timeout=30,
                    success_message="本地超分完成",
                )

            self.assertTrue(result.success)
            self.assertEqual(attempted_tiles, ["0", "256"])
            self.assertEqual(attempted_worker_modes, [None, "1:1:1"])
            self.assertIn("低显存兼容模式", result.message)
            self.assertTrue(target.is_file())
            with Image.open(target) as image:
                self.assertEqual(image.size, (20, 20))

    async def test_non_memory_engine_error_does_not_retry(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            executable = root / "realesrgan-ncnn-vulkan.exe"
            executable.touch()
            model_dir = root / "models"
            model_dir.mkdir()
            (model_dir / "realesrgan-x4plus.bin").touch()
            (model_dir / "realesrgan-x4plus.param").touch()

            source = root / "source.jpg"
            target = root / "target.jpg"
            Image.new("RGB", (10, 10), "black").save(source)
            attempted_tiles: list[str] = []

            async def fake_create_subprocess_exec(*args, **_kwargs):
                attempted_tiles.append(str(args[args.index("-t") + 1]))
                return _FakeProcess(1, stderr=b"invalid model file")

            with (
                patch.object(
                    LocalImageUpscaler,
                    "_resolve_executable",
                    return_value=executable,
                ),
                patch(
                    "services.image_upscale_service.asyncio.create_subprocess_exec",
                    new=fake_create_subprocess_exec,
                ),
            ):
                result = await LocalImageUpscaler()._upscale_to_dimensions(
                    source=source,
                    target=target,
                    input_size=(10, 10),
                    expected_size=(20, 20),
                    timeout=30,
                    success_message="本地超分完成",
                )

            self.assertFalse(result.success)
            self.assertEqual(attempted_tiles, ["0"])
            self.assertIn("invalid model file", result.message)

    async def test_exhausted_low_memory_retries_return_friendly_error(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            executable = root / "realesrgan-ncnn-vulkan.exe"
            executable.touch()
            model_dir = root / "models"
            model_dir.mkdir()
            (model_dir / "realesrgan-x4plus.bin").touch()
            (model_dir / "realesrgan-x4plus.param").touch()

            source = root / "source.jpg"
            target = root / "target.jpg"
            Image.new("RGB", (10, 10), "black").save(source)
            attempted_tiles: list[str] = []

            async def fake_create_subprocess_exec(*args, **_kwargs):
                attempted_tiles.append(str(args[args.index("-t") + 1]))
                return _FakeProcess(
                    3221225477,
                    stderr=b"vkAllocateMemory failed -2",
                )

            with (
                patch.object(
                    LocalImageUpscaler,
                    "_resolve_executable",
                    return_value=executable,
                ),
                patch(
                    "services.image_upscale_service.asyncio.create_subprocess_exec",
                    new=fake_create_subprocess_exec,
                ),
            ):
                result = await LocalImageUpscaler()._upscale_to_dimensions(
                    source=source,
                    target=target,
                    input_size=(10, 10),
                    expected_size=(20, 20),
                    timeout=30,
                    success_message="本地超分完成",
                )

            self.assertFalse(result.success)
            self.assertEqual(attempted_tiles, ["0", "256", "128", "64"])
            self.assertIn("显存不足", result.message)
            self.assertNotIn("vkAllocateMemory", result.message)
