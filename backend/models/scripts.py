from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class ScriptConvertRequest(BaseModel):
    """剧本转换请求"""
    novel_id: int
    template_id: int
    llm_config_id: int
    chapter_ids: Optional[List[int]] = None


class SingleScriptConvertRequest(BaseModel):
    """单章节剧本转换请求"""
    novel_id: int
    chapter_id: int
    template_id: int
    llm_config_id: int


class ScriptResponse(BaseModel):
    """剧本响应"""
    id: int
    novel_id: int
    chapter_id: Optional[int] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ScriptListItem(BaseModel):
    """剧本列表项"""
    id: int
    novel_id: int
    chapter_id: Optional[int] = None
    content: str
    created_at: datetime
    chapter_title: Optional[str] = None


class ScriptListResponse(BaseModel):
    """剧本列表响应"""
    scripts: List[ScriptListItem]
    total: int
    novel_id: int


class ScriptUpdateRequest(BaseModel):
    """剧本更新请求"""
    content: str


class ScriptConvertResult(BaseModel):
    """单个章节转换结果"""
    chapter_id: int
    chapter_title: str
    success: bool
    script_id: Optional[int] = None
    message: str


class ScriptConvertResponse(BaseModel):
    """剧本转换响应"""
    novel_id: int
    results: List[ScriptConvertResult]
    total: int
    success_count: int
    failed_count: int
