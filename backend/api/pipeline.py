from typing import List, Optional
from fastapi import APIRouter, HTTPException
from models.pipeline import (
    PipelineConfig,
    PipelineStatus,
    SingleStepRequest,
    PipelineStartResponse,
    PipelineListResponse
)
from services import pipeline_service

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/start", response_model=PipelineStartResponse)
async def start_pipeline(config: PipelineConfig):
    """
    启动全自动流水线
    
    按顺序执行：剧本转换 → 并行(人物/场景/道具提取) → 分镜生成
    """
    try:
        pipeline_id = await pipeline_service.run_pipeline(config)
        return PipelineStartResponse(
            pipeline_id=pipeline_id,
            message="流水线已启动"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动流水线失败: {str(e)}")


@router.post("/step")
async def run_single_step(request: SingleStepRequest):
    """
    执行单个步骤（用于单步模式）
    
    支持的步骤名称:
    - script_conversion: 剧本转换
    - character_extraction: 人物提取
    - scene_extraction: 场景提取
    - prop_extraction: 道具提取
    - storyboard_generation: 分镜生成
    """
    try:
        # 生成临时pipeline_id
        import uuid
        pipeline_id = f"single_{uuid.uuid4().hex[:8]}"
        
        result = await pipeline_service.run_single_step(
            pipeline_id=pipeline_id,
            step_name=request.step_name,
            novel_id=request.novel_id,
            template_id=request.template_id,
            llm_config_id=request.llm_config_id
        )
        
        return {
            "success": result.get("success", False),
            "message": result.get("message", ""),
            "pipeline_id": pipeline_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"执行步骤失败: {str(e)}")


@router.get("/{pipeline_id}/status", response_model=PipelineStatus)
async def get_pipeline_status(pipeline_id: str):
    """获取流水线执行状态"""
    status = await pipeline_service.get_pipeline_status(pipeline_id)
    if not status:
        raise HTTPException(status_code=404, detail="流水线不存在")
    return status


@router.post("/{pipeline_id}/cancel")
async def cancel_pipeline(pipeline_id: str):
    """取消正在运行的流水线"""
    success = await pipeline_service.cancel_pipeline(pipeline_id)
    if not success:
        raise HTTPException(status_code=400, detail="无法取消流水线（可能不存在或已完成）")
    return {"success": True, "message": "流水线已取消"}


@router.get("/", response_model=PipelineListResponse)
async def list_pipelines():
    """列出所有流水线"""
    pipelines = await pipeline_service.list_pipelines()
    return PipelineListResponse(pipelines=pipelines)
