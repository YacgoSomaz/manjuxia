"""星链云 (Xinglian / vjimeng.vip) 视频生成 Provider

API 文档(基于 vjimeng SD2-Video 文档 v2026-05-27 + 官方 demo HTML 反推):
- 创建任务: POST /v1/video/submit/generate
- 查询任务: GET  /v1/video/fetch/{task_id}
- Base URL: https://www.vjimeng.vip

鉴权: Authorization: Bearer {api_key}

支持的视频模型(SD2 系列 6 个):
- sd2-720p-fast / sd2-720p / sd2-1080p-fast / sd2-1080p:
    image + audio,duration 4-15s,图片数无上限
- sd2-720p-min-fast / sd2-720p-min:
    only image(不接 audio),最多 4 张,duration 5-15s

字段稳定性策略(关键设计点):
  vjimeng 服务端返回字段名不稳定 —— 文档说 video_url 在 `metadata.url`,
  demo HTML 兜底读 `result_url || video_url || data.video_url`,
  所以本 provider 全部多重兜底:
    - submit task_id : id || task_id || data.id || data.task_id
    - query video_url: metadata.url || result_url || video_url || data.video_url
    - query fail     : error.message || fail_reason || error_msg
    - query status   : .upper() 后枚举 SUCCESS / COMPLETED / FAILED / FAILURE 等

素材传输方式:
  跟 Cool 不同 —— 星链云接受 base64 data URL,不需要外部图床。
  本地文件 → base64 → "data:image/jpeg;base64,..." 直接放进 images[] / audios[]。
  跟 _upload_file 路径完全独立,各走各的。

日志脱敏:
  payload 里的 base64 不能原样打 log / 入库(SQLite 会炸)。
  统一走 `_sanitize_payload_for_log()` 替换成 `<data:image/jpeg base64 len=234567>` 占位。
"""
import asyncio
import base64
import io
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


DEFAULT_BASE_URL = "https://www.vjimeng.vip"

# 模型能力 — 基于 demo HTML 第 212-219 行 modelSupports() 实现
MODEL_CAPS = {
    "sd2-720p-fast": {
        "duration_range": (4, 15),
        "supports_image": True,
        "supports_audio": True,
        "max_images": 0,         # 0 = 无上限
        "default_timeout_min": 5,
    },
    "sd2-720p": {
        "duration_range": (4, 15),
        "supports_image": True,
        "supports_audio": True,
        "max_images": 0,
        "default_timeout_min": 10,
    },
    "sd2-1080p-fast": {
        "duration_range": (4, 15),
        "supports_image": True,
        "supports_audio": True,
        "max_images": 0,
        "default_timeout_min": 8,
    },
    "sd2-1080p": {
        "duration_range": (4, 15),
        "supports_image": True,
        "supports_audio": True,
        "max_images": 0,
        "default_timeout_min": 15,
    },
    "sd2-720p-min-fast": {
        "duration_range": (5, 15),
        "supports_image": True,
        "supports_audio": False,
        "max_images": 4,
        "default_timeout_min": 5,
    },
    "sd2-720p-min": {
        "duration_range": (5, 15),
        "supports_image": True,
        "supports_audio": False,
        "max_images": 4,
        "default_timeout_min": 10,
    },
}

# UI 支持的画面比例(demo HTML 给的 6 项,比文档多 3 项 4:3/3:4/21:9)
ALLOWED_RATIOS = {"16:9", "9:16", "1:1", "4:3", "3:4", "21:9"}

# 单文件原始字节上限(超出则尝试 PIL 缩放;再超就跳过)
MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024  # 50MB 硬上限,跟 cool 同款保守值
IMAGE_RESIZE_TRIGGER = 8 * 1024 * 1024     # >8MB 的图片自动缩放
IMAGE_MAX_DIMENSION = 1920                 # 缩放后长边


def _sanitize_payload_for_log(payload: Any) -> Any:
    """脱敏 payload 中的 base64 data URL,只保留 media type 和长度。

    用途:
      - logger.info(payload) 前
      - LogService 把 raw payload 入库前(必须也走这个 helper,否则 SQLite 会炸)

    递归处理 dict / list / data URL 字符串。
    非 data URL 字符串 / 数字 / bool 原样返回。
    """
    if isinstance(payload, dict):
        return {k: _sanitize_payload_for_log(v) for k, v in payload.items()}
    if isinstance(payload, list):
        return [_sanitize_payload_for_log(v) for v in payload]
    if isinstance(payload, str) and payload.startswith("data:"):
        m = re.match(r'^data:([^;,]+)(?:;[^,]*)?,(.*)$', payload)
        if m:
            media_type = m.group(1)
            body_len = len(m.group(2))
            return f"<data:{media_type} base64 len={body_len}>"
        return f"<data:... base64 len={len(payload)}>"
    return payload


class XinglianVideoProvider(VideoProviderBase):
    """星链云 (vjimeng.vip) 视频生成 — SD2 系列"""
    provider_type = "xinglian"

    def __init__(self, config: dict):
        super().__init__(config)
        self.base_url = self._normalize_base_url(config.get("base_url"))
        self.api_key = config.get("api_key") or ""
        extra = config.get("extra_params") or {}
        if isinstance(extra, str):
            try:
                extra = json.loads(extra)
            except Exception:
                extra = {}
        self.default_params = extra if isinstance(extra, dict) else {}

        raw_model = (config.get("model_name") or "sd2-720p-fast").strip()
        rm_lower = raw_model.lower()
        if rm_lower.startswith("sd2-"):
            self.model_id = rm_lower
        else:
            # 兜底:直接透传(未来星链云上新模型时不卡)
            self.model_id = raw_model
            logger.warning(f"[xinglian] 非 sd2- 前缀模型 {raw_model!r},按透传处理")

    @staticmethod
    def _normalize_base_url(raw: Optional[str]) -> str:
        """规范化 base_url:
          - None / 空 → DEFAULT_BASE_URL
          - 削末尾 /
          - 削末尾 /v1(用户可能填了 https://www.vjimeng.vip/v1)
        """
        if not raw:
            return require_trusted_model_url(DEFAULT_BASE_URL)
        s = raw.strip().rstrip("/")
        if s.endswith("/v1"):
            s = s[:-3]
        return require_trusted_model_url(s)

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

    async def _get(self, path: str, timeout: int = 60) -> dict:
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

    # ==================== base64 编码 ====================
    def _encode_local_file_to_data_url(self, path_or_url: str) -> Optional[str]:
        """把本地文件读出来,base64 编码为 data URL。

        分支:
          - http(s) URL  → 透传(星链云上游可自取),不再 base64
          - asset://     → 跳过(火山私域,星链云不认)
          - DB 风格 /data/... 或真绝对路径 → base64

        Windows 真绝对路径检测复用 cool.py 同款正则,避免 /data/xxx 在 Windows
        被 os.path.isabs 误判为绝对路径。
        """
        if not path_or_url:
            return None
        if path_or_url.startswith(("http://", "https://")):
            return path_or_url
        if path_or_url.startswith("asset://"):
            logger.info(f"[xinglian] 跳过火山私域 asset URI(星链云不支持): {path_or_url}")
            return None

        _looks_real_abs = bool(re.match(r'^[A-Za-z]:[/\\]', path_or_url))
        if _looks_real_abs:
            abs_path = path_or_url
        else:
            abs_path = resolve_db_path(path_or_url)

        if not abs_path or not os.path.exists(abs_path):
            logger.warning(f"[xinglian] 文件不存在: {path_or_url} -> {abs_path}")
            return None

        size = os.path.getsize(abs_path)
        if size > MAX_SINGLE_FILE_BYTES:
            logger.warning(f"[xinglian] 文件过大({size/1024/1024:.1f}MB > 50MB),跳过: {abs_path}")
            return None

        mime, _ = mimetypes.guess_type(abs_path)
        mime = (mime or "application/octet-stream").lower()
        is_image = mime.startswith("image/")

        raw: Optional[bytes] = None
        # 图片体积过大时尝试 PIL 缩放(长边 ≤ IMAGE_MAX_DIMENSION + JPEG 85%)
        if is_image and size > IMAGE_RESIZE_TRIGGER:
            try:
                from PIL import Image
                with Image.open(abs_path) as im:
                    if im.mode in ("P", "RGBA", "LA"):
                        im = im.convert("RGB")
                    w, h = im.size
                    if max(w, h) > IMAGE_MAX_DIMENSION:
                        scale = IMAGE_MAX_DIMENSION / max(w, h)
                        new_size = (int(w * scale), int(h * scale))
                        im = im.resize(new_size, Image.LANCZOS)
                    buf = io.BytesIO()
                    im.save(buf, format="JPEG", quality=85)
                    raw = buf.getvalue()
                    mime = "image/jpeg"
                    logger.info(
                        f"[xinglian] 图片缩放: {os.path.basename(abs_path)} "
                        f"{size//1024}KB → {len(raw)//1024}KB ({w}x{h} → {new_size if max(w,h)>IMAGE_MAX_DIMENSION else (w,h)})"
                    )
            except Exception as e:
                logger.warning(f"[xinglian] PIL 缩放失败,改用原图: {e}")
                raw = None

        if raw is None:
            try:
                with open(abs_path, "rb") as f:
                    raw = f.read()
            except Exception as e:
                logger.warning(f"[xinglian] 读文件失败 {abs_path}: {e}")
                return None

        b64 = base64.b64encode(raw).decode("ascii")
        return f"data:{mime};base64,{b64}"

    # ==================== 字段兜底解析 ====================
    @staticmethod
    def _extract_task_id(body: dict) -> Optional[str]:
        """submit 返回的 task_id 多重兜底:id || task_id || data.id || data.task_id"""
        if not isinstance(body, dict):
            return None
        tid = body.get("id") or body.get("task_id")
        if not tid:
            data = body.get("data") or {}
            if isinstance(data, dict):
                tid = data.get("id") or data.get("task_id")
            elif isinstance(data, str):
                tid = data
        return str(tid) if tid else None

    @staticmethod
    def _extract_video_url(body: dict) -> Optional[str]:
        """完成时 video_url 多重兜底。

        v3.61.180 关键修正:对照官方 demo HTML(api测试demo.html L898-904)实测,
            星链云 fetch 成功响应实际结构:
            { "data": { "status": "SUCCESS", "result_url": "https://...mp4", ... } }
            demo 用 `const task = json.data || json; task.result_url || task.video_url`,
            等价于优先读 `body.data.result_url` —— 这是我们漏掉的"真实"字段。

        新的检测顺序(顶层 → 嵌套层,result_url 优先):
            body.result_url
            body.video_url
            body.metadata.url
            body.data.result_url    ← 实测真实位置
            body.data.video_url
            body.data.url
            body.data.metadata.url

        老 bug 影响:v3.61.173-179 实测 sb=2571(task_xEVKkQ...)上游 1009s 完成,
            但因为没读到 result_url,工具一直显示"生成中",用户手动也救不回。
        """
        if not isinstance(body, dict):
            return None

        def _pick(d):
            if not isinstance(d, dict):
                return None
            # 顶层常见字段
            for k in ("result_url", "video_url", "url"):
                v = d.get(k)
                if v:
                    return str(v)
            # metadata.url(老文档说法)
            meta = d.get("metadata")
            if isinstance(meta, dict):
                v = meta.get("url")
                if v:
                    return str(v)
            return None

        # 1) 顶层
        u = _pick(body)
        if u:
            return u
        # 2) body.data 嵌套(demo 实测最常见路径)
        return _pick(body.get("data"))

    @staticmethod
    def _extract_fail_reason_from_dict(d: dict) -> Optional[str]:
        """从一个 dict 抽失败原因(顶层),供 _extract_fail_reason 在 body 和 body.data 两层调用"""
        if not isinstance(d, dict):
            return None
        err = d.get("error")
        if isinstance(err, dict):
            m = err.get("message")
            if m:
                return str(m)
        elif isinstance(err, str) and err:
            return err
        for k in ("fail_reason", "error_msg", "message"):
            v = d.get(k)
            if v:
                return str(v)
        return None

    @staticmethod
    def _extract_fail_reason(body: dict) -> Optional[str]:
        """失败原因多重兜底,跟 status / video_url 同源 —— 既要 body.*,也要 body.data.*

        v3.61.173 codex 复审 P1:既然 status 已经支持 body.data.status,
            实测 case `{"data":{"status":"FAILED","error_msg":"bad"}}` 顶层无 fail
            → 老逻辑只读顶层会返 fail_reason=None 丢失原因。
        位置全列(顶层优先):
            body.error.message / body.error(str) / body.fail_reason / body.error_msg / body.message
            body.data.error.message / body.data.error(str) / body.data.fail_reason / body.data.error_msg / body.data.message
        """
        if not isinstance(body, dict):
            return None
        # 1) 顶层
        m = XinglianVideoProvider._extract_fail_reason_from_dict(body)
        if m:
            return m
        # 2) body.data 嵌套
        data = body.get("data")
        if isinstance(data, dict):
            m = XinglianVideoProvider._extract_fail_reason_from_dict(data)
            if m:
                return m
        return None

    @staticmethod
    def _extract_status_raw(body: dict) -> Any:
        """v3.61.173 codex 复审 P0 + v3.61.180 codex 复审 P2:status 字段位置兜底
        实测案例:`{"data":{"status":"SUCCESS","video_url":"xxx"}}` 上游会把
                整个 result 嵌在 data 下,顶层无 status —— 老代码只读 body.status
                导致 status 被当 running,永远拉不到 success 状态。

        v3.61.180 P2 修正:严格对齐官方 demo HTML 逻辑(`const task = json.data || json`),
            优先级改成 **body.data.status > body.status > body.metadata.status**。
            防 case:外层包装 `{"status":"SUCCESS","data":{"status":"FAILED","error_msg":"xxx"}}`,
            外层 SUCCESS 是 HTTP 网关传输层 ack,真实任务状态在 data 内 — 老逻辑会读外层
            掩盖真实失败。新逻辑跟 demo 完全对齐。
        """
        if not isinstance(body, dict):
            return None
        # 1) body.data.status(demo 优先路径)
        data = body.get("data")
        if isinstance(data, dict):
            s = data.get("status")
            if s:
                return s
        # 2) body.status(顶层兜底)
        s = body.get("status")
        if s:
            return s
        # 3) body.metadata.status(罕见,留兜底)
        meta = body.get("metadata")
        if isinstance(meta, dict):
            s = meta.get("status")
            if s:
                return s
        return None

    @staticmethod
    def _normalize_status(raw: Any) -> str:
        """status 大小写归一,返回 base.py 约定状态:queued / running / success / fail"""
        s = (str(raw) if raw is not None else "").upper().strip()
        if s in ("SUCCESS", "COMPLETED", "FINISHED", "DONE"):
            return "success"
        if s in ("FAILED", "FAILURE", "ERROR"):
            return "fail"
        if s in ("QUEUED", "PENDING", "WAITING"):
            return "queued"
        if s in ("IN_PROGRESS", "RUNNING", "PROCESSING", "GENERATING"):
            return "running"
        return "running"  # 未知态当继续等

    # ==================== 错误码翻译 ====================
    @staticmethod
    def _translate_error(sc: int, body: Any) -> tuple:
        raw_msg = ""
        if isinstance(body, dict):
            raw_msg = (
                XinglianVideoProvider._extract_fail_reason(body)
                or body.get("message")
                or str(body)[:200]
            )
        else:
            raw_msg = str(body)[:200]
        if sc == 400:
            return f"星链云 请求参数错误: {raw_msg}", "UNKNOWN"
        if sc == 401:
            return "星链云 API Key 无效(401),请检查配置", "UNKNOWN"
        if sc == 402:
            return "星链云 余额不足,请充值后重试", "BALANCE"
        if sc == 429:
            return "星链云 限流(429),请稍后重试", "RATE_LIMIT"
        if sc == 503:
            return "星链云 服务器繁忙,请稍后重试", "RATE_LIMIT"
        return f"星链云 HTTP {sc}: {raw_msg}", "UNKNOWN"

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
                fail_reason="未配置 星链云 API Key,请到模型配置补全",
                error_code="UNKNOWN",
            )

        params = params or {}
        images = [i for i in (images or []) if i]
        audios = [a for a in (audios or []) if a]

        model = self.model_id
        caps = MODEL_CAPS.get(model, {})
        d_min, d_max = caps.get("duration_range", (4, 15))

        # 时长
        # v3.61.173 codex 复审 P1:duration / 图片数 / 音频 caps 违规改硬失败,不再静默修正
        #   静默 clamp / 裁切 / 丢弃 会让用户遇到"我明明传了 X,结果实际生成 Y"的隐性问题
        duration_raw = params.get("duration") or self.default_params.get("duration") or d_min
        try:
            duration = int(duration_raw)
        except Exception:
            return SubmitResult(
                success=False,
                fail_reason=f"duration 解析失败:{duration_raw!r} 不是合法整数",
                error_code="INVALID_PARAM",
            )
        if duration < d_min or duration > d_max:
            return SubmitResult(
                success=False,
                fail_reason=(
                    f"星链云 model={model} 时长必须在 {d_min}-{d_max} 秒之间,"
                    f"当前 duration={duration} 不符合"
                ),
                error_code="INVALID_PARAM",
            )

        # 图片数限制(min 系列 ≤ 4)
        max_images = caps.get("max_images", 0)
        if max_images and len(images) > max_images:
            return SubmitResult(
                success=False,
                fail_reason=(
                    f"星链云 model={model} 图片上限 {max_images} 张,"
                    f"当前 {len(images)} 张超出。请减少图片数或换非 min 模型(无上限)"
                ),
                error_code="INVALID_PARAM",
            )

        # min 系列不支持音频
        if not caps.get("supports_audio", True) and audios:
            return SubmitResult(
                success=False,
                fail_reason=(
                    f"星链云 model={model} 不支持音频参考(min 系列限制),"
                    f"当前传了 {len(audios)} 段音频。请换非 min 模型(如 sd2-720p / sd2-1080p)"
                ),
                error_code="INVALID_PARAM",
            )

        # 比例
        ratio_in = params.get("ratio") or self.default_params.get("ratio") or "16:9"
        ratio = ratio_in if ratio_in in ALLOWED_RATIOS else "16:9"

        # 启用音效(demo 字段名:enableSound)
        enable_sound_in = (
            params.get("enable_sound")
            or self.default_params.get("enable_sound")
            or "off"
        )
        enable_sound = "on" if str(enable_sound_in).lower() in ("on", "true", "1", "yes") else "off"

        # base64 编码本地文件
        image_urls: List[str] = []
        audio_urls: List[str] = []
        img_fail: List[str] = []
        au_fail: List[str] = []
        for img in images[:9]:  # 跟 cool 同款防过载,9 张上限
            du = self._encode_local_file_to_data_url(img)
            if du:
                image_urls.append(du)
                logger.info(
                    f"[xinglian] 图片就绪 #{len(image_urls)}: {os.path.basename(img)} "
                    f"({len(du)//1024}KB data URL)"
                )
            else:
                img_fail.append(img)
                logger.warning(f"[xinglian] 图片编码失败,跳过: {img}")
        for au in audios[:3]:
            du = self._encode_local_file_to_data_url(au)
            if du:
                audio_urls.append(du)
                logger.info(
                    f"[xinglian] 音频就绪 #{len(audio_urls)}: {os.path.basename(au)} "
                    f"({len(du)//1024}KB data URL)"
                )
            else:
                au_fail.append(au)
                logger.warning(f"[xinglian] 音频编码失败,跳过: {au}")

        if img_fail or au_fail:
            logger.warning(
                f"[xinglian] 素材编码统计:图片 {len(image_urls)}/{len(images[:9])},"
                f"音频 {len(audio_urls)}/{len(audios[:3])} "
                f"(失败图片 {img_fail!r} 失败音频 {au_fail!r})"
            )

        # v3.61.181: 不再在 provider 内部拼 [参考图:图片N] 中文前缀。
        #   外部 _build_final_video_prompt(api/video.py)已经按即梦 CLI 同款格式拼了
        #   "图片1 角色「凌婉兮」人物形象参考图;..." 素材清单(分号隔开)。
        #   provider 这层只做 base64 编码 + payload 装填,prompt 透传不动。
        # 同时老的"本镜素材清单(按提交顺序):..." 段落也由外部 helper 拼,这里不再独立产生。
        final_prompt = prompt or ""

        # 构造 payload — 不发 metadata.modeType(跟 demo 一致,服务端按 images 数量自动判)
        payload: Dict[str, Any] = {
            "model": model,
            "prompt": final_prompt,
            "duration": duration,
            "metadata": {
                "ratio": ratio,
                "enableSound": enable_sound,
            },
        }
        if image_urls:
            payload["images"] = image_urls
        if audio_urls:
            payload["audios"] = audio_urls

        # 日志脱敏 — payload 里的 base64 不能原样打
        sanitized_payload_log = _sanitize_payload_for_log(payload)
        logger.info(
            f"[xinglian] submit model={model} ratio={ratio} duration={duration}s "
            f"enableSound={enable_sound} images={len(image_urls)} audios={len(audio_urls)} "
            f"payload(sanitized)={sanitized_payload_log}"
        )

        # v3.61.183: SubmitResult.sanitized_payload — 上层入 llm_logs 用
        #   provider 标签 + 撤掉具体 base64 内容,只留 media type + 长度;
        #   含 provider/model/prompt/duration/metadata/images_summary/audios_summary
        sanitized_payload_full: Dict[str, Any] = {
            "provider": "xinglian",
            **sanitized_payload_log,  # model / prompt / duration / metadata / images(摘要) / audios(摘要)
            "_stats": {
                "image_count": len(image_urls),
                "audio_count": len(audio_urls),
                "img_fail": img_fail,
                "audio_fail": au_fail,
            },
        }

        try:
            resp = await self._post("/v1/video/submit/generate", payload, timeout=120)
        except Exception as e:
            logger.error(f"[xinglian] submit 网络异常: {e}", exc_info=True)
            return SubmitResult(
                success=False,
                fail_reason=f"星链云 网络异常: {e}",
                error_code="NETWORK",
                sanitized_payload=sanitized_payload_full,
            )

        sc = resp.get("status_code", 0)
        body = resp.get("body") or {}

        if sc in (200, 201):
            task_id = self._extract_task_id(body)
            if task_id:
                logger.info(f"[xinglian] 提交成功 task_id={task_id} model={model}")
                return SubmitResult(
                    success=True, submit_id=task_id, raw=body,
                    sanitized_payload=sanitized_payload_full,
                )
            return SubmitResult(
                success=False,
                fail_reason=f"星链云 返回 {sc} 但缺 task_id: {body}",
                error_code="UNKNOWN",
                raw=body,
                sanitized_payload=sanitized_payload_full,
            )

        friendly, classified = self._translate_error(sc, body)
        logger.warning(f"[xinglian] 提交失败 sc={sc} body={str(body)[:300]}")
        return SubmitResult(
            success=False,
            fail_reason=friendly,
            error_code=classified,
            raw=body,
            sanitized_payload=sanitized_payload_full,
        )

    async def query(self, submit_id: str) -> QueryResult:
        try:
            # v3.61.173 用户反馈修正(codex 复审 P1):
            #   逆向即梦号 API 慢,单次 fetch 用 60s 默认值,不再显式传 30s
            resp = await self._get(f"/v1/video/fetch/{submit_id}", timeout=60)
        except Exception as e:
            logger.warning(f"[xinglian] query 网络异常: {e}")
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

        # v3.61.173 codex 复审 P0:status 走三重兜底(body / data / metadata)
        status_raw = self._extract_status_raw(body)
        status = self._normalize_status(status_raw)

        video_url = self._extract_video_url(body) if status == "success" else None
        fail_reason = self._extract_fail_reason(body) if status == "fail" else None
        err_code = "UNKNOWN" if status == "fail" else None

        # v3.61.173 用户反馈 + codex 复审 P1:
        #   星链云本质是"逆向即梦账号"调用,上游 status 字段会先翻 success / completed,
        #   但 video_url 真正生成完入库还要再等几秒到几十秒(异步链路)。
        #   provider 层这里如实返回 status=success + url=None,
        #   宽限/超时判断完全由 video.py 上层按 video_submit_time 决定:
        #     - 未到任务超时阈值 → 继续 generating(看不到死任务)
        #     - 超时阈值后还 url=None → friendly failed 文案落库
        #   不在 provider 层自作主张永久 running,否则上层 30 分钟超时分支不会触发。
        if status == "success" and not video_url:
            # v3.61.180:把 body 的 key 路径打出来,方便未来如果星链云又改字段时一眼定位
            #   body 本身可能 base64 体积大(虽然 fetch 应该没这风险),也走 sanitize 一次再 log
            try:
                _sanitized = _sanitize_payload_for_log(body)
                logger.warning(
                    f"[xinglian] task 上游标完成但 video_url 暂未就绪 — "
                    f"raw body(sanitized,排查字段位置用): {_sanitized}"
                )
            except Exception:
                logger.warning(
                    f"[xinglian] task 上游标完成但 video_url 暂未就绪,"
                    f"由 video.py 按 submit_time 决定继续等还是超时 failed"
                )

        # duration 兜底
        duration_raw = 0
        meta = body.get("metadata")
        if isinstance(meta, dict):
            duration_raw = meta.get("duration") or 0
        try:
            duration = float(duration_raw or 0)
        except Exception:
            duration = 0.0

        return QueryResult(
            status=status,
            video_url=video_url,
            last_frame_url=None,  # 星链云不返尾帧,走本地 ffmpeg 抽
            duration=duration,
            fail_reason=fail_reason,
            error_code=err_code,
            raw=body,
        )

    async def cancel(self, submit_id: str) -> bool:
        # 文档未提供 cancel 接口
        logger.info(f"[xinglian] cancel 不支持(文档无接口),task_id={submit_id}")
        return False

    async def list_active(self) -> List[Dict[str, Any]]:
        # 文档未提供 list 接口
        logger.info("[xinglian] list_active 不支持(文档无接口)")
        return []

    async def check_login(self) -> Dict[str, Any]:
        """探测 api_key 有效性。

        星链云没有公开的 /models 接口,改用 GET /v1/video/fetch/probe-test 探测:
          - 401 / 403  → key 无效
          - 402        → 余额不足
          - 其他(404 / 200 / 500) → key 有效,服务端能解析鉴权头
        """
        if not self.api_key:
            return {"success": False, "logged_in": False, "balance": 0, "message": "未配置 API Key"}
        try:
            resp = await self._get("/v1/video/fetch/probe-nonexistent-test", timeout=15)
            sc = resp.get("status_code", 0)
            if sc in (401, 403):
                return {"success": False, "logged_in": False, "balance": 0, "message": f"API Key 无效 (HTTP {sc})"}
            if sc == 402:
                return {"success": False, "logged_in": False, "balance": 0, "message": "余额不足 (402)"}
            return {"success": True, "logged_in": True, "balance": 0, "message": "OK"}
        except Exception as e:
            return {"success": False, "logged_in": False, "balance": 0, "message": f"网络异常: {e}"}
