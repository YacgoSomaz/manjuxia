from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class LLMLogBase(BaseModel):
    """日志基础模型"""
    task_type: str
    model: Optional[str] = None
    config_name: Optional[str] = None
    base_url: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    status: str = "running"
    error_message: Optional[str] = None
    duration_seconds: float = 0
    novel_id: Optional[int] = None
    chapter_title: Optional[str] = None


class LLMLogResponse(LLMLogBase):
    """日志响应模型（列表用，不包含大字段）"""
    id: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    created_at: Optional[str] = None
    remote_url: Optional[str] = None  # 服务商返回的原始图片URL(用于重下)

    class Config:
        from_attributes = True


class LLMLogDetailResponse(LLMLogBase):
    """日志详情响应模型（包含完整输入输出）"""
    id: int
    input_prompt: Optional[str] = None
    output_content: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    created_at: Optional[str] = None
    remote_url: Optional[str] = None

    class Config:
        from_attributes = True


class LLMLogListResponse(BaseModel):
    """日志列表响应"""
    logs: List[LLMLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class LLMLogDeleteRequest(BaseModel):
    """删除日志请求"""
    log_ids: Optional[List[int]] = None
    before_date: Optional[str] = None
