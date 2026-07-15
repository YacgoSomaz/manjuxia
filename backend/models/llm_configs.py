from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime


class LLMConfigCreate(BaseModel):
    name: str = Field(..., description="配置名称")
    base_url: str = Field(..., description="API基础地址")
    api_key: str = Field(..., description="API密钥")
    model_name: str = Field(..., description="模型名称")
    temperature: float = Field(default=0.7, ge=0, le=2, description="温度参数")
    # v3.61.166: 自定义第三方默认值对标 Gemini 2.5/3.1 Pro(行业最高档),
    #             防止用户跑 32K/128K context 的中转却被默认 4K 截断
    max_tokens: int = Field(default=65536, ge=256, le=1048576, description="最大Token数")
    context_window: int = Field(default=1048576, ge=256, le=1048576, description="上下文窗口大小")
    extra_params: Optional[Dict[str, Any]] = Field(default=None, description="额外参数")
    # 新增字段
    config_type: Literal['llm', 'image', 'video', 'audio'] = Field(default='llm', description="配置类型")
    image_ratio: Optional[str] = Field(default='16:9', description="图片比例")
    request_timeout: Optional[int] = Field(default=60, ge=1, le=3000, description="请求超时时间(秒),最大50分钟")
    download_timeout: Optional[int] = Field(default=60, ge=1, le=3000, description="下载超时时间(秒),最大50分钟")
    retry_count: Optional[int] = Field(default=0, ge=0, le=10, description="重试次数")
    generation_mode: Optional[str] = Field(default='', description="生成模式")
    duration: Optional[int] = Field(default=15, ge=1, le=300, description="视频时长(秒)")
    browser_path: Optional[str] = Field(default='', description="浏览器路径")


class LLMConfigUpdate(BaseModel):
    name: Optional[str] = Field(default=None, description="配置名称")
    base_url: Optional[str] = Field(default=None, description="API基础地址")
    api_key: Optional[str] = Field(default=None, description="API密钥")
    model_name: Optional[str] = Field(default=None, description="模型名称")
    temperature: Optional[float] = Field(default=None, ge=0, le=2, description="温度参数")
    max_tokens: Optional[int] = Field(default=None, ge=256, le=1048576, description="最大Token数")
    context_window: Optional[int] = Field(default=None, ge=256, le=1048576, description="上下文窗口大小")
    extra_params: Optional[Dict[str, Any]] = Field(default=None, description="额外参数")
    # 新增字段
    config_type: Optional[Literal['llm', 'image', 'video', 'audio']] = Field(default=None, description="配置类型")
    image_ratio: Optional[str] = Field(default=None, description="图片比例")
    request_timeout: Optional[int] = Field(default=None, ge=1, le=3000, description="请求超时时间(秒),最大50分钟")
    download_timeout: Optional[int] = Field(default=None, ge=1, le=3000, description="下载超时时间(秒),最大50分钟")
    retry_count: Optional[int] = Field(default=None, ge=0, le=10, description="重试次数")
    generation_mode: Optional[str] = Field(default=None, description="生成模式")
    duration: Optional[int] = Field(default=None, ge=1, le=300, description="视频时长(秒)")
    browser_path: Optional[str] = Field(default=None, description="浏览器路径")


class LLMConfigResponse(BaseModel):
    id: int
    name: str
    base_url: str
    api_key: str
    model_name: str
    temperature: float
    max_tokens: int
    context_window: int
    extra_params: str
    created_at: datetime
    updated_at: datetime
    # 新增字段
    config_type: str
    image_ratio: Optional[str]
    request_timeout: Optional[int]
    download_timeout: Optional[int]
    retry_count: Optional[int]
    generation_mode: Optional[str]
    duration: Optional[int]
    browser_path: Optional[str]

    class Config:
        from_attributes = True
