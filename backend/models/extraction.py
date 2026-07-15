import json
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, field_validator


class ExtractionRequest(BaseModel):
    """信息提取请求"""
    novel_id: int
    element_type: str  # character/scene/prop
    template_id: int
    llm_config_id: int
    chapter_ids: Optional[List[int]] = None  # 可选，指定章节范围


class ExtractedElementCreate(BaseModel):
    """创建提取元素"""
    novel_id: int
    element_type: str  # character/scene/prop
    name: str
    description: Optional[str] = ''
    attributes: Optional[Dict[str, Any]] = None
    chapter_ids: Optional[List[int]] = None
    aliases: Optional[List[str]] = None


class ExtractedElementUpdate(BaseModel):
    """更新提取元素"""
    name: Optional[str] = None
    description: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    chapter_ids: Optional[List[int]] = None
    aliases: Optional[List[str]] = None


class ExtractedElementResponse(BaseModel):
    """提取元素响应"""
    id: int
    novel_id: int
    element_type: str
    name: str
    description: str = ''
    attributes: Dict[str, Any] = {}
    chapter_ids: List[int] = []
    aliases: List[str] = []
    created_at: str
    # v3.61.220: 图片字段变更时后端 bump updated_at,前端用作稳定 cache-buster
    updated_at: Optional[str] = None
    # 图片相关字段
    image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    image_status: Optional[str] = None
    # 参考图和成品图
    reference_image: Optional[str] = None
    finished_image: Optional[str] = None
    # 宫格图
    grid_image: Optional[str] = None
    # v3.61.147:VR 720° 全景图(equirectangular 2:1 等距柱状投影)
    # 用户点"全景生成宫格"会从此图按 yaw 多视角采样拼成 grid_image
    panorama_url: Optional[str] = None
    # 音频文件
    audio_file: Optional[str] = None
    # 角色绑定音色,用于后续 TTS/配音流程。
    voice_id: Optional[str] = None
    # v3.61.158:人物马甲(变体)— 当前激活的马甲 id;NULL = 用本体
    active_variant_id: Optional[int] = None
    active_variant_name: Optional[str] = None  # JOIN 出来的当前激活马甲名(防前端 N+1)
    variant_count: Optional[int] = 0           # 该人物有几个马甲
    # v3.61.99: 火山方舟私域素材库
    volc_asset_id: Optional[str] = None
    volc_asset_uri: Optional[str] = None
    volc_asset_status: Optional[str] = None
    volc_asset_group_id: Optional[str] = None
    # v3.61.230: 来源标记(team_asset=团队同步资产),供前端个人/团队筛选+卡片标签;
    #   ★ 必须在 response_model 里声明,否则 FastAPI 会把 SQL 查出的 remote_source 剥掉
    remote_source: Optional[str] = None
    remote_id: Optional[str] = None

    @field_validator('description', mode='before')
    @classmethod
    def validate_description(cls, v):
        if v is None:
            return ''
        return v

    @field_validator('attributes', mode='before')
    @classmethod
    def validate_attributes(cls, v):
        if v is None:
            return {}
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError, ValueError):
                return {}
        return v

    @field_validator('chapter_ids', mode='before')
    @classmethod
    def validate_chapter_ids(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError, ValueError):
                return []
        return v

    @field_validator('aliases', mode='before')
    @classmethod
    def validate_aliases(cls, v):
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError, ValueError):
                return []
        return v

    class Config:
        from_attributes = True


class ExtractionProgress(BaseModel):
    """提取进度"""
    total: int
    current: int
    current_chapter: Optional[str] = None
    status: str  # running/completed/failed
    message: Optional[str] = None


class GenerateImageRequest(BaseModel):
    """生成图片请求"""
    config_id: int  # 图片模型配置ID


class BatchGenerateImageRequest(BaseModel):
    """批量生成图片请求"""
    config_id: int
    element_type: Optional[str] = None  # character/scene/prop，为空则全部生成


class ImageStyleSetting(BaseModel):
    """图片风格设置"""
    prefix_prompt: str = ""  # 前置提示词
    suffix_prompt: str = ""  # 后置提示词


class ImageStyleSettingResponse(BaseModel):
    """图片风格设置响应"""
    prefix_prompt: str
    suffix_prompt: str


class GenerateGridImageRequest(BaseModel):
    """生成宫格图请求"""
    config_id: int  # 图片模型配置ID
    template_id: int  # 宫格图模板ID
    llm_config_id: int  # LLM模型配置ID，用于生成详细prompt


# ============================================================
# v3.61.158: 人物马甲(变体)
# ============================================================
class CharacterVariantCreate(BaseModel):
    variant_name: str
    description: str = ""


class CharacterVariantUpdate(BaseModel):
    variant_name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None


class CharacterVariantResponse(BaseModel):
    id: int
    element_id: int
    variant_name: str
    description: str = ""
    image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    image_status: Optional[str] = None
    reference_image: Optional[str] = None
    finished_image: Optional[str] = None
    audio_file: Optional[str] = None
    volc_asset_id: Optional[str] = None
    volc_asset_uri: Optional[str] = None
    volc_asset_status: Optional[str] = None
    volc_asset_group_id: Optional[str] = None
    sort_order: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    @field_validator('description', mode='before')
    @classmethod
    def _validate_desc(cls, v):
        return v or ''

    class Config:
        from_attributes = True


class SetActiveVariantRequest(BaseModel):
    variant_id: Optional[int] = None  # None = 回归本体


class SyncPreviewElement(BaseModel):
    """同步预览元素"""
    id: int
    name: str
    element_type: str
    description: str
    has_finished_image: bool
    has_grid_image: bool
    has_audio: bool
    exists_in_target: bool  # 目标小说是否已有同名同类型元素


class SyncPreviewResponse(BaseModel):
    """同步预览响应"""
    elements: List[SyncPreviewElement]


class SyncRequest(BaseModel):
    """执行同步请求"""
    from_novel_id: int
    to_novel_id: int
    element_ids: List[int]


class SyncResult(BaseModel):
    """同步结果响应"""
    synced_count: int
    skipped_count: int
    skipped_names: List[str]
