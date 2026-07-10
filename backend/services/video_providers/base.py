"""VideoProviderBase 抽象类

所有视频生成 provider(即梦CLI / 火山方舟 / 未来Sora 等)实现这个接口。
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


# ==================== 枚举 ====================
class ProviderType:
    JIMENG = "jimeng"
    VOLCENGINE_ARK = "volcengine_ark"


# ==================== 数据类 ====================
@dataclass
class SubmitResult:
    """submit() 返回值"""
    success: bool
    submit_id: Optional[str] = None        # 任务 ID(成功时)
    fail_reason: Optional[str] = None      # 失败原因(已翻译为友好中文)
    error_code: Optional[str] = None       # 错误码(供重试判定):NETWORK/TIMEOUT/REVIEW/BALANCE/RATE_LIMIT/CONCURRENCY/UNKNOWN
    raw: Dict[str, Any] = field(default_factory=dict)  # 原始返回,便于排查
    # v3.61.183: 实际发上游的瓶装好 payload 摘要(已经 sanitize 过 base64/敏感数据)
    #   字段建议:provider / model / prompt / duration / ratio / images_summary / audios_summary / skipped_assets
    #   入 llm_logs.input_prompt 用,4 个 provider 各自填(不填 = None,上层兜底降级)
    sanitized_payload: Optional[Dict[str, Any]] = None


@dataclass
class QueryResult:
    """query() 返回值"""
    status: str                             # 'queued'|'running'|'success'|'fail'|'cancelled'|'expired'
    video_url: Optional[str] = None         # 完成时的视频 URL
    last_frame_url: Optional[str] = None    # 完成时的尾帧 URL(火山方舟原生支持,即梦需 ffmpeg 抽取)
    duration: float = 0.0                   # 视频时长(秒)
    fail_reason: Optional[str] = None       # 失败时的友好中文原因
    error_code: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict)


# ==================== 抽象基类 ====================
class VideoProviderBase(ABC):
    """所有视频生成 provider 都实现这个接口

    config 字典:
        {
            "id": int,              # llm_configs 表 id (云端配置 id)
            "name": str,
            "base_url": str,
            "api_key": str,         # 仅方舟用,即梦 CLI 用浏览器 cookies
            "model_name": str,      # 火山方舟的 endpoint id 或 model id;即梦的 model_version
            "extra_params": dict,   # 默认参数
        }
    """
    provider_type: str = "base"

    def __init__(self, config: dict):
        self.config = config or {}

    # -------------------- 抽象接口 --------------------
    @abstractmethod
    async def submit(
        self,
        prompt: str,
        images: Optional[List[str]] = None,
        audios: Optional[List[str]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> SubmitResult:
        """提交视频生成任务

        Args:
            prompt: 文本提示词(已经经过 _strip_llm_metadata 等清洗)
            images: 图片路径列表(本地 /data/images/... 或 URL,首帧/尾帧/参考图)
            audios: 音频路径列表(可选,仅 Seedance 2.0 支持)
            params: 生成参数(duration/ratio/resolution/use_chain_frame 等)

        Returns:
            SubmitResult
        """
        pass

    @abstractmethod
    async def query(self, submit_id: str) -> QueryResult:
        """查询任务状态"""
        pass

    @abstractmethod
    async def cancel(self, submit_id: str) -> bool:
        """取消任务(只对 queued 状态有效)"""
        pass

    @abstractmethod
    async def list_active(self) -> List[Dict[str, Any]]:
        """列出当前账号正在跑的任务(用于并发控制)

        Returns:
            [{"submit_id": str, "status": str, "created_at": int}, ...]
        """
        pass

    # -------------------- 可选 hook --------------------
    async def check_login(self) -> Dict[str, Any]:
        """检查登录/凭证有效性。
        返回: {"success": bool, "logged_in": bool, "balance": int, "message": str}
        默认实现:不做检查直接通过。子类按需覆盖。
        """
        return {"success": True, "logged_in": True, "balance": 0, "message": "OK"}
