"""即梦 CLI Provider(原 dreamina-cli 逻辑的 thin wrapper)

完全复用现有 services.video_service.VideoService,只是包装成 VideoProviderBase 接口。
逻辑零变化,确保现有用户无感升级。
"""
import logging
import os
from typing import Optional, List, Dict, Any

from .base import VideoProviderBase, ProviderType, SubmitResult, QueryResult
from services.jimeng_black_video import (
    BLACK_VIDEO_DURATION_SECONDS,
    is_jimeng_black_reference_video,
    prepare_jimeng_reference_videos,
)

logger = logging.getLogger(__name__)


def _probe_local_media_durations(paths: List[str]) -> List[float]:
    """Probe known local media durations; unknown/remote paths are left to CLI."""
    from api.extraction import _probe_audio_duration_seconds
    from utils.paths import resolve_db_path

    durations: List[float] = []
    for raw_path in paths or []:
        if is_jimeng_black_reference_video(raw_path):
            durations.append(BLACK_VIDEO_DURATION_SECONDS)
            continue
        path = resolve_db_path(raw_path)
        if not path or not os.path.exists(path):
            continue
        duration = _probe_audio_duration_seconds(path)
        if duration is not None:
            durations.append(float(duration))
    return durations


def _ensure_jpg_if_large(path: str, threshold: int = 8 * 1024 * 1024, quality: int = 95) -> str:
    """v3.61.200:即梦 CLI 读本地文件;图 >8M(尤其 png)只转 jpg【保原分辨率,绝不缩尺寸】存 _cli.jpg。
    主路径 q95(视觉无损);若 q95 后仍 >8M 再降一档 q90(画质几乎无损,仍不缩分辨率)— codex P2。
    透明素材(RGBA/LA/P)铺白底再转,避免透明区变黑 — codex P2。<8M 或非本地文件原样返回。"""
    try:
        import os as _os
        import io as _io
        from utils.paths import resolve_db_path as _resolve
        if not path:
            return path
        _abs = path if _os.path.isfile(path) else _resolve(path)
        if not _abs or not _os.path.isfile(_abs):
            return path
        _old = _os.path.getsize(_abs)
        if _old <= threshold:
            return path
        from PIL import Image
        with Image.open(_abs) as im:
            # 透明素材铺白底再转 RGB(直接 convert 会让透明区变黑)
            if im.mode in ("RGBA", "LA", "P"):
                im = im.convert("RGBA")
                _bg = Image.new("RGB", im.size, (255, 255, 255))
                _bg.paste(im, mask=im.split()[-1])
                im = _bg
            elif im.mode != "RGB":
                im = im.convert("RGB")
            w, h = im.size
            # 保分辨率;先 q95,仍 >阈值再降一档 q90(不缩尺寸)
            _data = None
            for _q in (quality, 90):
                _buf = _io.BytesIO()
                im.save(_buf, format="JPEG", quality=_q)
                _data = _buf.getvalue()
                if len(_data) <= threshold:
                    break
            _new = _os.path.splitext(_abs)[0] + "_cli.jpg"
            with open(_new, "wb") as _f:
                _f.write(_data)
        logger.info(
            f"[jimeng] 大图转 jpg(保分辨率 {w}x{h}): {_os.path.basename(_abs)} "
            f"{_old/1024/1024:.1f}MB → {len(_data)/1024/1024:.1f}MB"
        )
        return _new
    except Exception as e:
        logger.warning(f"[jimeng] 大图转 jpg 失败,用原图: {e}")
        return path


class JimengCliProvider(VideoProviderBase):
    provider_type = ProviderType.JIMENG

    async def submit(
        self,
        prompt: str,
        images: Optional[List[str]] = None,
        audios: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> SubmitResult:
        """提交即梦任务 — 包装 video_service 的 generate_video / image2video / multimodal2video"""
        from services.video_service import VideoService

        params = params or {}
        # v3.61.200:>8M 的图先只转 jpg(保分辨率),避免 CLI 传大图慢/失败
        images = [_ensure_jpg_if_large(p) for p in (images or [])]
        raw_videos = params.get("videos") or params.get("reference_videos") or []
        videos = [raw_videos] if isinstance(raw_videos, str) else list(raw_videos or [])
        audios = audios or []
        vs = VideoService()

        duration = int(params.get("duration", 10))
        ratio = params.get("ratio", "16:9")
        resolution = params.get("resolution", "720P")
        requested_model = params.get("model_version") or params.get("model") or "seedance2.0fast"
        generation_mode = params.get("generation_mode", "text2video")
        from services.video_model_capabilities import (
            canonical_video_model_name,
            get_video_model_capabilities,
            reference_audio_duration_error,
            reference_video_duration_error,
        )
        model_version = canonical_video_model_name(requested_model, "jimeng")
        capabilities = get_video_model_capabilities(model_version, "jimeng")
        if not capabilities["video_generation_available"]:
            return SubmitResult(
                success=False,
                fail_reason=f"即梦 CLI 暂未开放 {capabilities['label']} 视频生成",
                error_code="INVALID_PARAM",
            )
        max_images = int(capabilities["max_images"])
        max_videos = int(capabilities["max_videos"])
        max_audios = int(capabilities["max_audios"])
        max_total = int(capabilities["max_total_materials"])

        min_duration = int(capabilities.get("min_duration_seconds") or 4)
        max_duration = int(capabilities["max_duration_seconds"])
        if duration < min_duration or duration > max_duration:
            return SubmitResult(
                success=False,
                fail_reason=(
                    f"{capabilities['label']} 生成时长需为 "
                    f"{min_duration}-{max_duration} 秒，当前 {duration} 秒"
                ),
                error_code="INVALID_PARAM",
            )

        resolution_key = str(resolution or "720p").strip().lower()
        allowed_resolutions = (
            ("480p", "720p")
            if capabilities["family"] == "seedance_2_5"
            else (("720p", "1080p", "4k") if model_version == "seedance2.0_vip" else ("720p",))
        )
        if resolution_key not in allowed_resolutions:
            return SubmitResult(
                success=False,
                fail_reason=(
                    f"即梦 {model_version} 不支持 {resolution}，"
                    f"可选: {', '.join(allowed_resolutions)}"
                ),
                error_code="INVALID_PARAM",
            )

        try:
            videos = await prepare_jimeng_reference_videos(
                videos,
                params.get("include_black_video", False),
                ratio,
            )
        except Exception as exc:
            return SubmitResult(
                success=False,
                fail_reason=str(exc),
                error_code="INVALID_PARAM",
            )

        material_counts = (len(images), len(videos), len(audios))
        if material_counts[0] > max_images or material_counts[1] > max_videos or material_counts[2] > max_audios:
            return SubmitResult(
                success=False,
                fail_reason=(
                    f"{capabilities['label']} 素材超限: 图片 {len(images)}/{max_images}，"
                    f"视频 {len(videos)}/{max_videos}，音频 {len(audios)}/{max_audios}"
                ),
                error_code="INVALID_PARAM",
            )
        if sum(material_counts) > max_total:
            return SubmitResult(
                success=False,
                fail_reason=(
                    f"{capabilities['label']} 所有参考素材合计最多 {max_total} 个，"
                    f"当前 {sum(material_counts)} 个"
                ),
                error_code="INVALID_PARAM",
            )

        audio_duration_error = reference_audio_duration_error(
            model_version,
            _probe_local_media_durations(audios),
        )
        if audio_duration_error:
            return SubmitResult(
                success=False,
                fail_reason=audio_duration_error,
                error_code="INVALID_PARAM",
            )
        video_duration_error = reference_video_duration_error(
            model_version,
            _probe_local_media_durations(videos),
        )
        if video_duration_error:
            return SubmitResult(
                success=False,
                fail_reason=video_duration_error,
                error_code="INVALID_PARAM",
            )
        if audios and not images and not videos and not capabilities.get("audio_only_multimodal"):
            return SubmitResult(
                success=False,
                fail_reason=f"{capabilities['label']} 全能参考至少需要 1 张图片或 1 段视频",
                error_code="INVALID_PARAM",
            )

        try:
            # 路由到具体接口
            if generation_mode == "frames2video":
                if len(images) < 2:
                    return SubmitResult(
                        success=False,
                        fail_reason="首尾帧模式需要按顺序提供首帧和尾帧两张图",
                        error_code="INVALID_PARAM",
                    )
                result = await vs.frames2video(
                    first=images[0],
                    last=images[1],
                    prompt=prompt,
                    duration=duration,
                    resolution=resolution_key,
                    model_version=model_version,
                    poll=0,
                )
            elif generation_mode == "multimodal2video" or (images and len(images) > 1) or videos or audios:
                # 多模态:图片 + 视频 + 音频
                result = await vs.multimodal2video(
                    prompt=prompt,
                    images=images,
                    videos=videos,
                    audios=audios,
                    duration=duration,
                    ratio=ratio,
                    resolution=resolution,
                    model_version=model_version,
                    poll=0,
                )
            elif generation_mode == "image2video" or (images and len(images) == 1):
                # 图生视频
                result = await vs.image2video(
                    image=images[0],
                    prompt=prompt,
                    duration=duration,
                    resolution=resolution_key,
                    model_version=model_version,
                    poll=0,
                )
            else:
                # 文生视频
                result = await vs.generate_video(
                    prompt=prompt,
                    duration=duration,
                    ratio=ratio,
                    resolution=resolution,
                    model_version=model_version,
                    poll=0,
                )

            if not result.get("success"):
                # 子进程级失败(超时 / 启动失败等)
                raw_error = str(result.get("error") or result.get("message") or "提交失败")
                from api.video import _translate_jimeng_fail_reason
                return SubmitResult(
                    success=False,
                    fail_reason=_translate_jimeng_fail_reason(raw_error),
                    error_code=self._classify_jimeng_error(raw_error),
                    raw=result,
                )

            data = result.get("data", {})
            gen_status = data.get("gen_status", "")

            # 即梦特殊:gen_status="fail" 表示 dreamina-cli 返回 success 但即梦端拒绝
            if gen_status == "fail":
                fail_reason = data.get("fail_reason", "提交失败")
                guidance = data.get("guidance", "")
                # 翻译为友好中文(复用现有 _translate_jimeng_fail_reason)
                from api.video import _translate_jimeng_fail_reason
                friendly = _translate_jimeng_fail_reason(fail_reason, guidance)
                # 错误码归类
                err_code = self._classify_jimeng_error(fail_reason + " " + guidance)
                return SubmitResult(
                    success=False,
                    fail_reason=friendly,
                    error_code=err_code,
                    raw=data,
                )

            submit_id = data.get("submit_id")
            if not submit_id:
                return SubmitResult(
                    success=False,
                    fail_reason="即梦未返回任务 ID",
                    error_code="UNKNOWN",
                    raw=data,
                )

            return SubmitResult(success=True, submit_id=submit_id, raw=data)

        except Exception as e:
            logger.error(f"[jimeng-provider] submit 异常: {e}", exc_info=True)
            return SubmitResult(
                success=False,
                fail_reason=f"提交异常: {e}",
                error_code="UNKNOWN",
                raw={},
            )

    async def query(self, submit_id: str) -> QueryResult:
        """查询任务 — 包装 query_result"""
        from services.video_service import VideoService
        vs = VideoService()

        try:
            result = await vs.query_result(submit_id)
            if not result.get("success"):
                return QueryResult(
                    status="fail",
                    fail_reason=str(result.get("error") or result.get("message") or "查询失败"),
                    error_code="UNKNOWN",
                    raw=result,
                )
            data = result.get("data", {})
            gen_status = (data.get("gen_status") or "").lower()

            # 状态映射:即梦 → 统一
            #   in_queue/queueing/running → running
            #   success → success
            #   fail/failed/error → fail
            if gen_status == "success":
                status = "success"
            elif gen_status in ("fail", "failed", "error"):
                status = "fail"
            else:
                status = "running"

            video_url = data.get("video_url") or data.get("url")
            duration = float(data.get("duration") or 0)

            # 即梦不返回 last_frame_url(我们自己 ffmpeg 抽)
            fail_reason = None
            if status == "fail":
                raw_fail_reason = data.get("fail_reason") or data.get("error") or "生成失败"
                guidance = data.get("guidance", "")
                from api.video import _translate_jimeng_fail_reason
                fail_reason = _translate_jimeng_fail_reason(raw_fail_reason, guidance)

            return QueryResult(
                status=status,
                video_url=video_url,
                last_frame_url=None,
                duration=duration,
                fail_reason=fail_reason,
                raw=data,
            )
        except Exception as e:
            logger.error(f"[jimeng-provider] query 异常: {e}", exc_info=True)
            return QueryResult(status="fail", fail_reason=str(e), error_code="UNKNOWN")

    async def cancel(self, submit_id: str) -> bool:
        """即梦 CLI 不支持取消任务(任务已交给即梦后台,只能等)"""
        logger.info(f"[jimeng-provider] cancel 不支持(即梦后台已收到任务,无法本地取消): {submit_id}")
        return False

    async def list_active(self) -> List[Dict[str, Any]]:
        """列出即梦仍活跃的任务"""
        from services.video_service import VideoService
        from api.video import _extract_task_list, _is_jimeng_active_task_entry
        vs = VideoService()
        try:
            res = await vs.list_tasks(limit=50)
            if not res.get("success"):
                return []
            tasks = _extract_task_list(res.get("data"))
            return [
                {
                    "submit_id": t.get("submit_id") or t.get("id"),
                    "status": (t.get("gen_status") or t.get("status") or "").lower(),
                    "created_at": t.get("create_time") or t.get("created_at"),
                }
                for t in tasks
                if isinstance(t, dict) and _is_jimeng_active_task_entry(t)
            ]
        except Exception as e:
            logger.warning(f"[jimeng-provider] list_active 失败: {e}")
            return []

    async def check_login(self) -> Dict[str, Any]:
        """即梦登录检查 — 复用 services.video_service.check_login"""
        from services.video_service import VideoService
        vs = VideoService()
        try:
            return await vs.check_login()
        except Exception as e:
            return {"success": False, "logged_in": False, "balance": 0, "message": str(e)}

    # -------------------- 私有 --------------------
    @staticmethod
    def _classify_jimeng_error(text: str) -> str:
        t = (text or "").lower()
        raw = text or ""
        if "dreamina_cli" in t and (
            "not allowed" in t or "permission denied" in t or "没有权限" in raw
        ):
            return "AUTH"
        if "1310" in raw or "exceedconcurrencylimit" in t or "concurrency" in t or "并发" in raw:
            return "CONCURRENCY"
        if "余额" in raw or "insufficient" in t or "balance" in t:
            return "BALANCE"
        if "审核" in raw or "敏感" in raw or "rejected" in t or "compliance" in t or "post-tns" in t or "tns check" in t:
            return "REVIEW"
        if "timeout" in t or "超时" in raw:
            return "TIMEOUT"
        if "network" in t or "连接" in raw or "网络" in raw:
            return "NETWORK"
        return "UNKNOWN"
