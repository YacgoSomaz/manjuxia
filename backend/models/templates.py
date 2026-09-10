from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TemplateCreate(BaseModel):
    name: str
    category: str
    content: str
    variables: Optional[List[str]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    screen_mode: Optional[str] = "portrait"
    model_family: Optional[str] = "seedance_2_0"


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    screen_mode: Optional[str] = None
    model_family: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    category: str
    content: str
    variables: str
    description: str
    tags: Optional[str] = None
    screen_mode: Optional[str] = "portrait"
    model_family: Optional[str] = "seedance_2_0"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
