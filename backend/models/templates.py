from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TemplateCreate(BaseModel):
    name: str
    category: str
    content: str
    variables: Optional[List[str]] = None
    description: Optional[str] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None
    description: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    category: str
    content: str
    variables: str
    description: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
