from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NovelCreate(BaseModel):
    name: str
    raw_content: str
    mode: Optional[str] = None   # v3.61.269:'import'(小说默认) / 'script_import'(剧本导入)


class NovelResponse(BaseModel):
    id: int
    name: str
    raw_content: Optional[str] = None
    chapter_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    mode: Optional[str] = None      # 'import' 或 'create'
    outline: Optional[str] = None   # JSON 格式大纲

    class Config:
        from_attributes = True


class ChapterCreate(BaseModel):
    title: str
    content: str
    sort_order: int = 0


class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    sort_order: Optional[int] = None


class ChapterResponse(BaseModel):
    id: int
    novel_id: int
    title: str
    content: str
    sort_order: int

    class Config:
        from_attributes = True
