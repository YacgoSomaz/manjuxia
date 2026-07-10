"""Cool API (mjapi.cc.cd) 视频生成 Provider

API 文档(基于 COOL_API_DOC v2026-05-18):
- 创建任务: POST /v1/cool/generate
- 查询任务: GET /v1/cool/task/{task_id}
- 列表任务: GET /v1/cool/tasks
- 上传文件: POST /v1/cool/upload (multipart)
- Base URL: https://api.mjapi.cc.cd

鉴权: Authorization: Bearer {api_key}  (sk-xxx 走 NewAPI 计费,失败全退)

支持的视频模型 (本 provider 当前只接 Seedance 2 系列):
- seedance_2 / seedance_2_fast  (×480p/720p = 4 个用户预设组合)

文件路径:
- Cool 网关接受外部 URL 自动代为下载,但实测我们 admin-server 端口
  (9000)被 cool 拒过,所以本 provider 走 /v1/cool/upload multipart
  直传本地 bytes,拿 cdn-ap.cool.tv URL,再写进 files 数组
"""
import asyncio
import json
import logging
import mimetypes
import os
import re
from typing import Optional, List, Dict, Any

import aiohttp
from utils.ssl_helper import get_aiohttp_connector
from services.trusted_providers import require_trusted_model_url

from .base import VideoProviderBase, ProviderType, SubmitResult, QueryResult
from utils.paths import resolve_db_path

logger = logging.getLogger(__name__)


DEFAULT_BASE_URL = "https://api.mjapi.cc.cd"

# 模型能力 (基于 cool 文档)
MODEL_CAPS = {
    "seedance_2": {
        "duration_range": (1, 15),
        "resolutions": ["480p", "720p"],
        "supports_audio": True,        # 文档明确"原生支持音频参考/唱演"
        "default_timeout_min": 30,
    },
    "seedance_2_fast": {
        "duration_range": (1, 15),
        "resolutions": ["480p", "720p"],
        "supports_audio": True,
        "default_timeout_min": 20,
    },
}

# Cool 文档列的合法 ratio (跟 image_service Cool 路径同款)
ALLOWED_RATIOS = {"16:9", "9:16", "1:1", "4:3", "2:1", "21:9"}


class CoolVideoProvider(VideoProviderBase):
    """Cool API 视频生成 — Seedance 2.0 / Fast"""
    provider_type = "cool"

    def __init__(self, config: dict):
        super().__init__(config)
        self.base_url = require_trusted_model_url(config.get("base_url") or DEFAULT_BASE_URL)
        self.api_key = config.get("api_key") or ""
        extra = config.get("extra_params") or {}
        if isinstance(extra, str):
            try:
                extra = json.loads(extra)
            except Exception:
                extra = {}
        self.default_params = extra if isinstance(extra, dict) else {}

        # v3.61.168 / 169: 解析 model_name — 兼容多种命名风格
        #   1) cool 文档真 model: "seedance_2" / "seedance_2_fast"
        #   2) 千山官网命名(下划线 + 末尾分辨率): "seedance_2_720p" / "seedance_2_fast_480p"  ★ 主流
        #   3) 旧 UI preset key(短横线 + 前缀): "cool-seedance-2-720p" / "cool-seedance-2-fast-480p"
        #   4) 其他扩展(透传给 cool 上游,400 上游自己拒)
        raw_model = (config.get("model_name") or "seedance_2_fast").strip().lower()
        self._preset_resolution: Optional[str] = None

        # 先抽末尾分辨率(任何风格都支持 _720p / _480p / _1080p / -720p ...)
        import re
        m = re.search(r'[-_](480p|720p|1080p)$', raw_model)
        if m:
            self._preset_resolution = m.group(1)
            stripped = raw_model[:m.start()]
        else:
            stripped = raw_model

        # 规范化:把 "cool-" 前缀 + 所有 "-" 统一去掉,看核心是哪个 model
        # "cool-seedance-2-fast" → "seedance_2_fast"
        # "seedance_2_fast"      → "seedance_2_fast"
        # "seedance_2"           → "seedance_2"
        norm = stripped.replace("-", "_")
        if norm.startswith("cool_"):
            norm = norm[5:]

        if "seedance_2_fast" in norm:
            self.model_id = "seedance_2_fast"
        elif "seedance_2" in norm:
            self.model_id = "seedance_2"
        elif norm in ("seedance_2", "seedance_2_fast"):
            self.model_id = norm
        else:
            # 透传(扩展性留口,如未来支持其他 cool 模型)
            self.model_id = raw_model

    # ==================== HTTP 工具 ====================
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _post(self, path: str, payload: dict, timeout: int = 60) -> dict:
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession(
            connector=get_aiohttp_connector(),
            timeout=aiohttp.ClientTimeout(total=timeout),
        ) as sess:
            async with sess.post(url, headers=self._headers(), json=payload) as resp:
                text = await resp.text()
                try:
                    body = await resp.json(content_type=None) if text else {}
                except Exception:
                    body = {"raw_text": text}
                return {"status_code": resp.status, "body": body}

    async def _get(self, path: str, timeout: int = 30) -> dict:
        url = f"{self.base_url}{path}"
        async with aiohttp.ClientSession(
            connector=get_aiohttp_connector(),
            timeout=aiohttp.ClientTimeout(total=timeout),
        ) as sess:
            async with sess.get(url, headers=self._headers()) as resp:
                text = await resp.text()
                try:
                    body = await resp.json(content_type=None) if text else {}
                except Exception:
                    body = {"raw_text": text}
                return {"status_code": resp.status, "body": body}

    # ==================== 文件上传到 Cool CDN ====================
    async def _upload_file(self, path_or_url: str) -> Optional[Dict[str, str]]:
        r"""把本地文件 multipart 上传到 Cool,返回 {"url": cdn_url, "type": "image"/"audio"/"video"}
        - http(s) URL → 直接返回(Cool 网关会自动下载或复用)
        - asset://  → cool 不支持火山私域素材库 URI,直接 skip
        - DB 路径 (/data/xxx) → resolve_db_path → 上传 /v1/cool/upload
        - 真绝对路径 (C:\...) → 直接用
        v3.61.170: 修两个 bug
          1. 老代码 `os.path.isabs("/data/...")` 在 Windows 上返 True(因为有 leading /)
             → 跳过 resolve_db_path 直接当绝对路径 → 找不到文件
          2. asset:// URI 未识别 → 当本地路径解析成乱码
        """
        if not path_or_url:
            return None
        if path_or_url.startswith(("http://", "https://")):
            # 直接外链 — 让 cool 网关自己下载(文档说支持,但 admin-server 实测被拒过,所以仅信任非 admin 域)
            file_type = self._guess_type(path_or_url)
            return {"url": path_or_url, "type": file_type}
        if path_or_url.startswith("asset://"):
            # 火山方舟私域素材库 URI(ARK 加白后的),cool 不认 — skip
            logger.info(f"[cool] 跳过火山私域 asset URI(cool 不支持): {path_or_url}")
            return None

        # ★ v3.61.170 修:DB 风格路径以 / 开头(/data/xxx) 在 Windows 也算 isabs=True,
        #   但根本不是真绝对路径,必须 resolve_db_path。统一逻辑:有 drive letter (C:\) 才当真绝对路径
        _looks_real_abs = bool(re.match(r'^[A-Za-z]:[/\\]', path_or_url))  # Windows 真绝对路径
        if _looks_real_abs:
            abs_path = path_or_url
        else:
            abs_path = resolve_db_path(path_or_url)

        if not abs_path or not os.path.exists(abs_path):
            logger.warning(f"[cool] 文件不存在: {path_or_url} -> {abs_path}")
            return None

        # 大小检查 — image / audio / video 都过 50MB 就不传(cool 网关限制不明,保守)
        size = os.path.getsize(abs_path)
        if size > 50 * 1024 * 1024:
            logger.warning(f"[cool] 文件过大({size/1024/1024:.1f}MB),跳过: {abs_path}")
            return None

        file_type = self._guess_type(abs_path)
        mime, _ = mimetypes.guess_type(abs_path)
        mime = (mime or "application/octet-stream").lower()
        filename = os.path.basename(abs_path)

        upload_url = f"{self.base_url}/v1/cool/upload"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        try:
            with open(abs_path, "rb") as f:
                raw = f.read()
            form = aiohttp.FormData()
            form.add_field("file", raw, filename=filename, content_type=mime)
            # v3.61.219: cool 造视频上传素材需带 model(seedance_2 / seedance_2_fast),
            #   与后续 /v1/cool/generate 用同一 model_id;出图(image_service)那条端点不需要
            form.add_field("model", self.model_id)
            async with aiohttp.ClientSession(
                connector=get_aiohttp_connector(),
                timeout=aiohttp.ClientTimeout(total=120, connect=15),
            ) as sess:
                async with sess.post(upload_url, data=form, headers=headers) as resp:
                    txt = await resp.text()
                    if resp.status != 200:
                        logger.warning(f"[cool] /upload HTTP {resp.status}: {txt[:200]}")
                        return None
                    try:
                        data = json.loads(txt)
                    except Exception:
                        logger.warning(f"[cool] /upload 响应非 JSON: {txt[:200]}")
                        return None
                    file_url = data.get("file_url")
                    if not file_url:
                        logger.warning(f"[cool] /upload 缺 file_url: {txt[:200]}")
                        return None
                    # cool 文档说 file_type 返回的也带回来,优先用响应里的
                    file_type = data.get("file_type") or file_type
                    return {"url": file_url, "type": file_type}
        except Exception as e:
            logger.warning(f"[cool] 上传文件失败 {abs_path}: {e}")
            return None

    @staticmethod
    def _guess_type(path_or_url: str) -> str:
        """按扩展名/MIME 猜文件 type — image / audio / video"""
        lower = (path_or_url or "").lower().split("?")[0]  # 去 query string
        if any(lower.endswith(ext) for ext in (".mp4", ".mov", ".mkv", ".webm", ".avi")):
            return "video"
        if any(lower.endswith(ext) for ext in (".mp3", ".wav", ".m4a", ".ogg", ".flac")):
            return "audio"
        return "image"  # 默认按图片

    # ==================== 错误码翻译 ====================
    @staticmethod
    def _translate_error(sc: int, body: Any) -> tuple:
        """返回 (friendly_msg, classified_code)
        classified_code: NETWORK / BALANCE / RATE_LIMIT / UNKNOWN
        """
        raw_msg = ""
        if isinstance(body, dict):
            raw_msg = body.get("error") or body.get("message") or str(body)[:200]
        else:
            raw_msg = str(body)[:200]
        if sc == 400:
            return f"Cool 请求参数错误: {raw_msg}", "UNKNOWN"
        if sc == 402:
            return "Cool 余额不足(sk- Token 验资失败),请充值后重试", "BALANCE"
        if sc == 410:
            return "Cool: r_sd2 模型已迁移到月付接口,请改用 seedance_2 / seedance_2_fast", "UNKNOWN"
        if sc == 503:
            return "Cool 服务器繁忙(达 1500 并发上限或无可用账号),请稍后重试", "RATE_LIMIT"
        return f"Cool HTTP {sc}: {raw_msg}", "UNKNOWN"

    @staticmethod
    def _is_transient_submit_error(sc: int, body: Any, classified: str) -> bool:
        """Cool submit 阶段的瞬时上游错误,可安全重试。

        这些错误通常发生在任务尚未创建前,不会产生 submit_id。真实返回可能是
        HTTP 502/503/504/500,也可能是 body 里带 upstream_unavailable/server_error。
        """
        if classified == "RATE_LIMIT" or sc in (500, 502, 503, 504):
            return True

        raw = ""
        if isinstance(body, dict):
            parts = []
            for key in ("error", "message", "code", "type", "status"):
                val = body.get(key)
                if val:
                    parts.append(str(val))
            raw = " ".join(parts) or str(body)
        else:
            raw = str(body)
        raw = raw.lower()

        transient_markers = (
            "upstream_unavailable",
            "server_error",
            "bad gateway",
            "gateway timeout",
            "gateway time-out",
            "service unavailable",
            "temporarily unavailable",
            "stream disconnected",
            "connection reset",
            "connection refused",
            "eof",
            "timeout",
        )
        return any(marker in raw for marker in transient_markers)

    async def _post_submit_with_retry(self, path: str, payload: dict, timeout: int = 60) -> dict:
        """Retry transient Cool submit failures before surfacing them to the queue."""
        max_attempts = 3
        delays = [3, 8]
        last_resp: Optional[dict] = None
        last_exc: Optional[Exception] = None

        for attempt in range(1, max_attempts + 1):
            try:
                resp = await self._post(path, payload, timeout=timeout)
                last_resp = resp
                sc = resp.get("status_code", 0)
                body = resp.get("body") or {}
                _, classified = self._translate_error(sc, body)
                retryable = self._is_transient_submit_error(sc, body, classified)
                if retryable and attempt < max_attempts:
                    delay = delays[min(attempt - 1, len(delays) - 1)]
                    logger.warning(
                        f"[cool] submit transient failure sc={sc} "
                        f"attempt={attempt}/{max_attempts}, retry in {delay}s; body={str(body)[:300]}"
                    )
                    await asyncio.sleep(delay)
                    continue
                return resp
            except Exception as exc:
                last_exc = exc
                if attempt < max_attempts:
                    delay = delays[min(attempt - 1, len(delays) - 1)]
                    logger.warning(
                        f"[cool] submit network exception attempt={attempt}/{max_attempts}, "
                        f"retry in {delay}s: {exc}"
                    )
                    await asyncio.sleep(delay)
                    continue
                raise

        if last_resp is not None:
            return last_resp
        if last_exc is not None:
            raise last_exc
        return {"status_code": 0, "body": {}}

    # ==================== 接口实现 ====================
    async def submit(
        self,
        prompt: str,
        images: Optional[List[str]] = None,
        audios: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> SubmitResult:
        if not self.api_key:
            return SubmitResult(
                success=False,
                fail_reason="未配置 Cool API Key(sk- Token),请到模型配置补全",
                error_code="UNKNOWN",
            )

        params = params or {}
        images = [i for i in (images or []) if i]
        audios = [a for a in (audios or []) if a]

        # 模型 + 分辨率
        model = self.model_id
        # v3.61.170: resolution 来源优先级反转 — preset 后缀(千山官网建配置时锁的)最高,
        #   防前端 UI bug / localStorage 残留传错值导致 model_name 里的 720p 和 params 里的 480p 打架
        #   优先级:modelName 后缀(_720p/_480p)> 运行时 params > config.extra_params > 默认 720p
        _params_res = (params.get("resolution") or "").lower() if params.get("resolution") else None
        if self._preset_resolution and _params_res and _params_res != self._preset_resolution:
            logger.warning(
                f"[cool] params.resolution={_params_res} 跟 modelName 后缀 {self._preset_resolution} 不一致,"
                f"以 modelName 为准(防 UI 串值)"
            )
        resolution = (
            self._preset_resolution
            or _params_res
            or (self.default_params.get("resolution") or "").lower() or None
            or "720p"
        )
        # 校验:Cool 视频文档只列 480p/720p/1080p,seedance_2 系列只支持 480p/720p
        caps = MODEL_CAPS.get(model, {})
        allowed_res = caps.get("resolutions", ["480p", "720p"])
        if resolution not in allowed_res:
            logger.warning(
                f"[cool] resolution={resolution} 不在模型 {model} 支持列表 {allowed_res},降级 720p"
            )
            resolution = "720p"

        # 比例
        ratio_in = params.get("ratio") or self.default_params.get("ratio") or "16:9"
        ratio = ratio_in if ratio_in in ALLOWED_RATIOS else "16:9"

        # 时长 (1~15s,cool 文档"视频最大时长 15 秒")
        duration_raw = params.get("duration") or self.default_params.get("duration") or 5
        try:
            duration = int(duration_raw)
        except Exception:
            duration = 5
        d_min, d_max = caps.get("duration_range", (1, 15))
        duration = max(d_min, min(d_max, duration))

        # 上传 files — 同时记录 image / audio 数量,用于 prompt 前置绑定
        # v3.61.170: 每条素材上传成败 INFO 级别打 log,方便排查"只过去场景图"这类问题
        files: List[Dict[str, str]] = []
        img_count = 0
        au_count = 0
        img_fail: List[str] = []
        au_fail: List[str] = []
        for img in images[:9]:  # cool 没明确上限,跟即梦/ARK 保持 9 张防过载
            up = await self._upload_file(img)
            if up:
                # 强制 type=image(避免 _guess_type 在 query string 干扰下误判)
                up["type"] = "image"
                files.append(up)
                img_count += 1
                logger.info(f"[cool] 图片上传成功 #{img_count}: {os.path.basename(img)} → {up['url'][:80]}")
            else:
                img_fail.append(img)
                logger.warning(f"[cool] 图片上传失败,跳过: {img}")
        for au in audios[:3]:   # 音频跟即梦/ARK 一样 3 段
            up = await self._upload_file(au)
            if up:
                up["type"] = "audio"
                files.append(up)
                au_count += 1
                logger.info(f"[cool] 音频上传成功 #{au_count}: {os.path.basename(au)} → {up['url'][:80]}")
            else:
                au_fail.append(au)
                logger.warning(f"[cool] 音频上传失败,跳过: {au}")

        if img_fail or au_fail:
            logger.warning(
                f"[cool] 上传统计:图片成功 {img_count}/{len(images[:9])},音频成功 {au_count}/{len(audios[:3])} "
                f"(失败图片 {img_fail!r} 失败音频 {au_fail!r})"
            )

        # v3.61.214: 任一参考图上传失败时直接拦截,不带残缺 files 提交。
        # _build_final_video_prompt 已按全部素材写入 "图片N ..." 清单;如果 files 少图,
        # 上游会按剩余 files 顺序错配角色图,比失败更危险。
        if img_fail:
            fail_names = ", ".join(os.path.basename(p) for p in img_fail)
            logger.error(f"[cool] {len(img_fail)} 张参考图上传失败,取消提交以避免角色错位: {img_fail!r}")
            return SubmitResult(
                success=False,
                fail_reason=(
                    f"参考图上传失败 {len(img_fail)} 张({fail_names}),已取消提交以避免角色图错位。"
                    f"请重试(多为临时网络问题)或检查素材文件是否存在。"
                ),
                error_code="UPLOAD_FAILED",
                sanitized_payload={
                    "provider": "cool",
                    "model": model,
                    "img_uploaded": img_count,
                    "img_failed": img_fail,
                    "audio_uploaded": au_count,
                    "audio_failed": au_fail,
                },
            )

        # v3.61.181: 不再在 provider 内部拼 [参考图: @图片N] 前缀。
        #   外部 _build_final_video_prompt(api/video.py)已经按即梦 CLI 同款格式拼了
        #   "图片1 角色「凌婉兮」人物形象参考图;..." 素材清单(用分号隔开,无 @ 前缀)。
        #   provider 这层只做 multipart 上传 + payload 装填,prompt 透传不动。
        # 老逻辑(codex P1 修)在 v3.61.180 之前在用:
        #   for i in range(img_count): ref_tokens.append(f"@图片{i+1}")
        #   final_prompt = "[" + "][".join(ref_tokens) + "] " + final_prompt
        # 现在彻底删 — 跟即梦/ark/xinglian 完全统一。
        final_prompt = prompt or ""

        payload = {
            "prompt": final_prompt,
            "model": model,
            "ratio": ratio,
            "duration": duration,
            "resolution": resolution,
        }
        if files:
            payload["files"] = files

        logger.info(
            f"[cool] submit model={model} resolution={resolution} ratio={ratio} "
            f"duration={duration}s files={len(files)}"
        )

        # v3.61.183: 给 SubmitResult.sanitized_payload 拼摘要 — 上层入 llm_logs 用
        # cool 文件已经走 CDN 上传(_upload_file 拿到 cdn-ap.cool.tv URL),URL 不敏感可原样存
        sanitized_payload_full: Dict[str, Any] = {
            "provider": "cool",
            "model": model,
            "prompt": final_prompt,
            "ratio": ratio,
            "resolution": resolution,
            "duration": duration,
            "files": files,  # [{"url": cdn_url, "type": "image"/"audio"}] — URL 不含 base64
            "_stats": {
                "image_uploaded": img_count,
                "audio_uploaded": au_count,
                "img_fail": img_fail,
                "audio_fail": au_fail,
            },
        }

        try:
            resp = await self._post_submit_with_retry("/v1/cool/generate", payload, timeout=60)
        except Exception as e:
            logger.error(f"[cool] submit 网络异常: {e}", exc_info=True)
            return SubmitResult(
                success=False, fail_reason=f"Cool 网络异常: {e}", error_code="NETWORK",
                sanitized_payload=sanitized_payload_full,
            )

        sc = resp.get("status_code", 0)
        body = resp.get("body") or {}

        if sc == 200 or sc == 201:
            task_id = body.get("task_id")
            if task_id:
                logger.info(f"[cool] 提交成功 task_id={task_id} model={model}")
                return SubmitResult(
                    success=True, submit_id=str(task_id), raw=body,
                    sanitized_payload=sanitized_payload_full,
                )
            return SubmitResult(
                success=False,
                fail_reason=f"Cool 返回 200 但缺 task_id: {body}",
                error_code="UNKNOWN",
                raw=body,
                sanitized_payload=sanitized_payload_full,
            )

        friendly, classified = self._translate_error(sc, body)
        logger.warning(f"[cool] 提交失败 sc={sc} body={str(body)[:300]}")
        return SubmitResult(
            success=False,
            fail_reason=friendly,
            error_code=classified,
            raw=body,
            sanitized_payload=sanitized_payload_full,
        )

    async def query(self, submit_id: str) -> QueryResult:
        try:
            resp = await self._get(f"/v1/cool/task/{submit_id}", timeout=30)
        except Exception as e:
            logger.warning(f"[cool] query 网络异常: {e}")
            return QueryResult(status="running", fail_reason=str(e), error_code="NETWORK")

        sc = resp.get("status_code", 0)
        body = resp.get("body") or {}

        if sc != 200:
            friendly, classified = self._translate_error(sc, body)
            return QueryResult(
                status="fail",
                fail_reason=friendly,
                error_code=classified,
                raw=body,
            )

        # cool 状态: pending / running / success / failed
        status_raw = (body.get("status") or "").lower()
        if status_raw == "success":
            status = "success"
        elif status_raw == "failed":
            status = "fail"
        elif status_raw in ("pending", "running"):
            status = "running"
        else:
            status = "running"  # 未知当继续等

        result = body.get("result") or {}
        video_url = result.get("url") if isinstance(result, dict) else None
        # codex P1 修:Cool 没有真正的 last_frame 字段,thumbnail_url 是缩略图不是尾帧 —
        #   错把 thumbnail 当 last_frame 会污染串行尾帧链下一镜
        #   修法:返 None,让本地视频下载完成后走现有 ffmpeg 抽尾帧 hook
        last_frame_url = None
        duration_raw = result.get("duration") if isinstance(result, dict) else 0
        try:
            duration = float(duration_raw or 0)
        except Exception:
            duration = 0.0

        fail_reason = None
        err_code = None
        if status == "fail":
            fail_reason = body.get("error") or "Cool 任务失败"
            err_code = "UNKNOWN"

        return QueryResult(
            status=status,
            video_url=video_url,
            last_frame_url=last_frame_url,
            duration=duration,
            fail_reason=fail_reason,
            error_code=err_code,
            raw=body,
        )

    async def cancel(self, submit_id: str) -> bool:
        # Cool 文档没有提供 cancel 接口
        logger.info(f"[cool] cancel 不支持(文档无接口),task_id={submit_id}")
        return False

    async def list_active(self) -> List[Dict[str, Any]]:
        """列出 pending/running 任务用于并发控制"""
        try:
            resp = await self._get("/v1/cool/tasks", timeout=30)
        except Exception as e:
            logger.warning(f"[cool] list_active 网络异常: {e}")
            return []

        sc = resp.get("status_code", 0)
        body = resp.get("body") or {}
        if sc != 200 or not isinstance(body, list):
            return []

        active = []
        for t in body:
            if not isinstance(t, dict):
                continue
            st = (t.get("status") or "").lower()
            if st in ("pending", "running"):
                active.append({
                    "submit_id": str(t.get("task_id") or ""),
                    "status": st,
                    "created_at": t.get("created_at"),
                })
        return active

    async def check_login(self) -> Dict[str, Any]:
        """探测 api_key 有效性 — 调 /v1/cool/models 接口,200 即有效"""
        if not self.api_key:
            return {"success": False, "logged_in": False, "balance": 0, "message": "未配置 API Key"}
        try:
            resp = await self._get("/v1/cool/models", timeout=15)
            if resp.get("status_code") == 200:
                return {"success": True, "logged_in": True, "balance": 0, "message": "OK"}
            sc = resp.get("status_code", 0)
            if sc == 401 or sc == 402:
                return {"success": False, "logged_in": False, "balance": 0, "message": f"API Key 无效或余额不足 (HTTP {sc})"}
            return {"success": False, "logged_in": False, "balance": 0, "message": f"探测失败 HTTP {sc}"}
        except Exception as e:
            return {"success": False, "logged_in": False, "balance": 0, "message": f"网络异常: {e}"}
