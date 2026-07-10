from typing import List, Optional
from pydantic import BaseModel


class StepConfig(BaseModel):
    """单个步骤配置"""
    template_id: int
    llm_config_id: int
    enabled: bool = True


class PipelineConfig(BaseModel):
    """流水线配置"""
    novel_id: int
    script_conversion: StepConfig
    character_extraction: StepConfig
    scene_extraction: StepConfig
    prop_extraction: StepConfig
    storyboard_generation: StepConfig


class StepStatus(BaseModel):
    """单个步骤状态"""
    name: str
    status: str  # pending/running/completed/failed/skipped
    message: str = ""
    progress: float = 0  # 0-100


class PipelineStatus(BaseModel):
    """流水线执行状态"""
    pipeline_id: str
    novel_id: int
    status: str  # pending/running/completed/failed/cancelled
    steps: List[StepStatus]
    current_step: int = 0
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class SingleStepRequest(BaseModel):
    """单步执行请求"""
    step_name: str
    novel_id: int
    template_id: int
    llm_config_id: int


class PipelineStartResponse(BaseModel):
    """流水线启动响应"""
    pipeline_id: str
    message: str


class PipelineListResponse(BaseModel):
    """流水线列表响应"""
    pipelines: List[PipelineStatus]
