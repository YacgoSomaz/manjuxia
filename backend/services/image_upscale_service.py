import asyncio
import logging
import os
import shutil
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image

from utils.paths import is_frozen


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UpscaleResult:
    success: bool
    output_path: str
    input_size: Optional[Tuple[int, int]] = None
    output_size: Optional[Tuple[int, int]] = None
    elapsed_ms: int = 0
    message: str = ""


class LocalImageUpscaler:
    """Run the bundled Real-ESRGAN NCNN Vulkan executable for one image."""

    _lock: Optional[asyncio.Lock] = None
    _LOW_MEMORY_TILE_SIZES = (256, 128, 64)

    @classmethod
    def _get_lock(cls) -> asyncio.Lock:
        if cls._lock is None:
            cls._lock = asyncio.Lock()
        return cls._lock

    @staticmethod
    def _bundled_dir() -> Path:
        if is_frozen():
            exe_dir = Path(sys.executable).resolve().parent
            resources_dir = exe_dir.parent.parent
            return resources_dir / "build" / "realesrgan"
        return Path(__file__).resolve().parents[2] / "build" / "realesrgan"

    @classmethod
    def _resolve_executable(cls) -> Optional[Path]:
        env_path = os.environ.get("REALESRGAN_PATH", "").strip()
        if env_path:
            candidate = Path(env_path).expanduser().resolve()
            if candidate.is_file():
                return candidate

        candidate = cls._bundled_dir() / "realesrgan-ncnn-vulkan.exe"
        if candidate.is_file():
            return candidate

        path_candidate = shutil.which("realesrgan-ncnn-vulkan")
        return Path(path_candidate).resolve() if path_candidate else None

    @classmethod
    def is_available(cls) -> bool:
        executable = cls._resolve_executable()
        return bool(
            executable
            and (executable.parent / "models" / "realesrgan-x4plus.bin").is_file()
            and (executable.parent / "models" / "realesrgan-x4plus.param").is_file()
        )

    @staticmethod
    def _is_gpu_memory_failure(returncode: Optional[int], detail: str) -> bool:
        """Recognize NCNN/Vulkan failures that are worth retrying with tiles.

        Some AMD integrated GPUs print ``vkAllocateMemory failed -2`` and then
        terminate with Windows access-violation code ``0xC0000005``.  NCNN's
        automatic tile estimator (``-t 0``) can therefore fail even though a
        smaller explicit tile works on the same machine.
        """
        normalized = (detail or "").casefold()
        markers = (
            "vkallocatememory failed",
            "vk_error_out_of_device_memory",
            "out of device memory",
            "out of gpu memory",
            "failed to allocate gpu memory",
        )
        if any(marker in normalized for marker in markers):
            return True
        if returncode is None:
            return False
        unsigned_code = int(returncode) & 0xFFFFFFFF
        return unsigned_code in {
            0xC0000005,  # access violation after failed Vulkan allocation
            0xC0000017,  # STATUS_NO_MEMORY
        }

    @staticmethod
    def _read_input_size(source: Path) -> Tuple[Optional[Tuple[int, int]], str]:
        if not source.is_file() or source.stat().st_size <= 0:
            return None, "输入图片不存在或为空"
        try:
            with Image.open(source) as image:
                input_size = tuple(image.size)
                image.verify()
            return input_size, ""
        except Exception as exc:
            return None, f"输入图片校验失败: {exc}"

    async def upscale_2x(
        self,
        input_path: str,
        output_path: Optional[str] = None,
        timeout: int = 180,
    ) -> UpscaleResult:
        source = Path(input_path).resolve()
        target = Path(output_path or input_path).resolve()
        input_size, error = self._read_input_size(source)
        if not input_size:
            return UpscaleResult(False, str(target), message=error)

        return await self._upscale_to_dimensions(
            source=source,
            target=target,
            input_size=input_size,
            expected_size=(input_size[0] * 2, input_size[1] * 2),
            timeout=timeout,
            success_message="本地 2 倍超分完成",
        )

    async def upscale_to_2k(
        self,
        input_path: str,
        output_path: str,
        timeout: int = 300,
        longest_edge: int = 2048,
    ) -> UpscaleResult:
        """Create a 2K image whose longest edge is exactly ``longest_edge``.

        Sources below 2K go through Real-ESRGAN first. Sources already at or
        above 2K are normalized with a single high-quality resize so the tool
        never needlessly spends GPU time enlarging an image that is already
        large enough.
        """
        source = Path(input_path).resolve()
        target = Path(output_path).resolve()
        input_size, error = self._read_input_size(source)
        if not input_size:
            return UpscaleResult(False, str(target), message=error)
        if longest_edge < 256:
            return UpscaleResult(False, str(target), input_size=input_size, message="目标尺寸无效")

        source_longest = max(input_size)
        ratio = longest_edge / source_longest
        expected_size = (
            max(1, int(round(input_size[0] * ratio))),
            max(1, int(round(input_size[1] * ratio))),
        )

        if source_longest >= longest_edge:
            return self._resize_to_dimensions(
                source=source,
                target=target,
                input_size=input_size,
                expected_size=expected_size,
                success_message="原图已达到 2K，已输出标准 2K 图片",
            )

        return await self._upscale_to_dimensions(
            source=source,
            target=target,
            input_size=input_size,
            expected_size=expected_size,
            timeout=timeout,
            success_message="本地 2K 超分完成",
        )

    @staticmethod
    def _resize_to_dimensions(
        *,
        source: Path,
        target: Path,
        input_size: Tuple[int, int],
        expected_size: Tuple[int, int],
        success_message: str,
    ) -> UpscaleResult:
        target.parent.mkdir(parents=True, exist_ok=True)
        token = uuid.uuid4().hex[:10]
        temp_output = target.with_name(f".{target.stem}.resize-{token}.jpg")
        started = time.perf_counter()
        try:
            with Image.open(source) as image:
                resampling = getattr(Image, "Resampling", Image).LANCZOS
                image.convert("RGB").resize(expected_size, resampling).save(
                    temp_output,
                    format="JPEG",
                    quality=95,
                    subsampling=0,
                )
            with Image.open(temp_output) as image:
                output_size = tuple(image.size)
                image.verify()
            if output_size != expected_size:
                return UpscaleResult(
                    False,
                    str(target),
                    input_size=input_size,
                    output_size=output_size,
                    elapsed_ms=int((time.perf_counter() - started) * 1000),
                    message=f"图片尺寸异常,期望 {expected_size},实际 {output_size}",
                )
            os.replace(temp_output, target)
            return UpscaleResult(
                True,
                str(target),
                input_size=input_size,
                output_size=output_size,
                elapsed_ms=int((time.perf_counter() - started) * 1000),
                message=success_message,
            )
        except Exception as exc:
            logger.exception("[local-upscale] resize failed input=%s: %s", source, exc)
            return UpscaleResult(
                False,
                str(target),
                input_size=input_size,
                elapsed_ms=int((time.perf_counter() - started) * 1000),
                message=f"图片处理失败: {exc}",
            )
        finally:
            try:
                if temp_output.exists():
                    temp_output.unlink()
            except OSError:
                pass

    async def _upscale_to_dimensions(
        self,
        *,
        source: Path,
        target: Path,
        input_size: Tuple[int, int],
        expected_size: Tuple[int, int],
        timeout: int,
        success_message: str,
    ) -> UpscaleResult:

        executable = self._resolve_executable()
        if not executable:
            return UpscaleResult(False, str(target), message="未找到本地超分引擎")
        model_dir = executable.parent / "models"
        model_bin = model_dir / "realesrgan-x4plus.bin"
        model_param = model_dir / "realesrgan-x4plus.param"
        if not model_bin.is_file() or not model_param.is_file():
            return UpscaleResult(False, str(target), message="本地超分模型文件不完整")

        target.parent.mkdir(parents=True, exist_ok=True)
        token = uuid.uuid4().hex[:10]
        temp_native = target.with_name(f".{target.stem}.upscale-native-{token}.jpg")
        # Some bundled NCNN builds append their actual format extension even
        # when the output path already has one (for example ``.jpg.png``).
        # Probe both conventions so the portable runtime and upstream builds
        # share the same code path.
        native_candidates = (
            temp_native,
            Path(f"{temp_native}.png"),
            Path(f"{temp_native}.jpg"),
            Path(f"{temp_native}.webp"),
        )
        temp_output = target.with_name(f".{target.stem}.upscale-{token}.jpg")
        started = time.perf_counter()
        process = None
        selected_tile_size = 0
        try:
            async with self._get_lock():
                process_kwargs = {}
                if os.name == "nt":
                    process_kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
                tile_attempts = (0, *self._LOW_MEMORY_TILE_SIZES)
                last_returncode: Optional[int] = None
                last_detail = ""
                for attempt_index, tile_size in enumerate(tile_attempts):
                    for candidate in native_candidates:
                        try:
                            if candidate.exists():
                                candidate.unlink()
                        except OSError:
                            pass

                    elapsed_seconds = time.perf_counter() - started
                    remaining_timeout = timeout - elapsed_seconds
                    if remaining_timeout <= 0:
                        raise asyncio.TimeoutError

                    engine_args = [
                        str(executable),
                        "-i", str(source),
                        "-o", str(temp_native),
                        "-m", str(model_dir),
                        "-n", "realesrgan-x4plus",
                        # x4plus produces broken tile placement with outscale=2 in the
                        # portable NCNN build. Run at the model's native scale, then
                        # downsample once to the requested 2x result.
                        "-s", "4",
                        "-t", str(tile_size),
                    ]
                    if tile_size:
                        # NCNN defaults to two simultaneous processing workers.
                        # A single worker avoids doubling tile buffers on low-memory
                        # integrated GPUs.
                        engine_args.extend(("-j", "1:1:1"))
                    engine_args.extend(("-f", "jpg"))
                    process = await asyncio.create_subprocess_exec(
                        *engine_args,
                        cwd=str(executable.parent),
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        **process_kwargs,
                    )
                    stdout, stderr = await asyncio.wait_for(
                        process.communicate(),
                        timeout=remaining_timeout,
                    )
                    if process.returncode == 0:
                        selected_tile_size = tile_size
                        break

                    last_returncode = process.returncode
                    last_detail = (stderr or stdout or b"").decode(
                        "utf-8",
                        errors="replace",
                    )[-1200:].strip()
                    can_retry = (
                        attempt_index < len(tile_attempts) - 1
                        and self._is_gpu_memory_failure(last_returncode, last_detail)
                    )
                    if not can_retry:
                        elapsed_ms = int((time.perf_counter() - started) * 1000)
                        if self._is_gpu_memory_failure(last_returncode, last_detail):
                            logger.error(
                                "[local-upscale] GPU memory exhausted after tile retries "
                                "input=%s code=%s detail=%s",
                                source,
                                last_returncode,
                                last_detail,
                            )
                            return UpscaleResult(
                                False,
                                str(target),
                                input_size=input_size,
                                elapsed_ms=elapsed_ms,
                                message=(
                                    "显卡可用显存不足，已自动尝试低显存模式仍失败。"
                                    "请关闭占用显卡的程序或更新显卡驱动后重试。"
                                ),
                            )
                        return UpscaleResult(
                            False,
                            str(target),
                            input_size=input_size,
                            elapsed_ms=elapsed_ms,
                            message=(
                                f"超分引擎退出码 {last_returncode}: "
                                f"{last_detail[-800:]}"
                            ),
                        )

                    next_tile_size = tile_attempts[attempt_index + 1]
                    logger.warning(
                        "[local-upscale] GPU memory allocation failed input=%s "
                        "code=%s tile=%s; retrying tile=%s",
                        source,
                        last_returncode,
                        tile_size,
                        next_tile_size,
                    )

            elapsed_ms = int((time.perf_counter() - started) * 1000)
            native_output = next(
                (
                    candidate
                    for candidate in native_candidates
                    if candidate.is_file() and candidate.stat().st_size > 0
                ),
                None,
            )
            if native_output is None:
                return UpscaleResult(
                    False,
                    str(target),
                    input_size=input_size,
                    elapsed_ms=elapsed_ms,
                    message="超分引擎未生成有效图片",
                )

            native_expected_size = (input_size[0] * 4, input_size[1] * 4)
            with Image.open(native_output) as image:
                native_size = tuple(image.size)
                if native_size != native_expected_size:
                    return UpscaleResult(
                        False,
                        str(target),
                        input_size=input_size,
                        output_size=native_size,
                        elapsed_ms=elapsed_ms,
                        message=(
                            f"超分原生尺寸异常,期望 {native_expected_size},"
                            f"实际 {native_size}"
                        ),
                    )
                resampling = getattr(Image, "Resampling", Image).LANCZOS
                image.convert("RGB").resize(expected_size, resampling).save(
                    temp_output,
                    format="JPEG",
                    quality=95,
                    subsampling=0,
                )

            with Image.open(temp_output) as image:
                output_size = tuple(image.size)
                image.verify()
            if output_size != expected_size:
                return UpscaleResult(
                    False,
                    str(target),
                    input_size=input_size,
                    output_size=output_size,
                    elapsed_ms=elapsed_ms,
                    message=f"超分尺寸异常,期望 {expected_size},实际 {output_size}",
                )

            os.replace(temp_output, target)
            logger.info(
                "[local-upscale] success input=%s size=%sx%s output=%s "
                "size=%sx%s tile=%s elapsed=%dms",
                source,
                input_size[0],
                input_size[1],
                target,
                output_size[0],
                output_size[1],
                selected_tile_size,
                elapsed_ms,
            )
            return UpscaleResult(
                True,
                str(target),
                input_size=input_size,
                output_size=output_size,
                elapsed_ms=elapsed_ms,
                message=(
                    f"{success_message}（低显存兼容模式）"
                    if selected_tile_size
                    else success_message
                ),
            )
        except asyncio.TimeoutError:
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait()
                except Exception:
                    pass
            return UpscaleResult(
                False,
                str(target),
                input_size=input_size,
                elapsed_ms=int((time.perf_counter() - started) * 1000),
                message=f"本地超分超时({timeout}秒)",
            )
        except Exception as exc:
            logger.exception("[local-upscale] failed input=%s: %s", source, exc)
            return UpscaleResult(
                False,
                str(target),
                input_size=input_size,
                elapsed_ms=int((time.perf_counter() - started) * 1000),
                message=f"本地超分失败: {exc}",
            )
        finally:
            for temp_path in (*native_candidates, temp_output):
                try:
                    if temp_path.exists():
                        temp_path.unlink()
                except OSError:
                    pass
