import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.qianshan_storyboard_lab import (
    DEFAULT_LLM_CONFIG_ID,
    DIRECT_STORYBOARD_MAX_TOKENS,
    DEFAULT_SCRIPT_TEMPLATE_ID,
    DEFAULT_STORYBOARD_TEMPLATE_ID,
    QianshanLabError,
    get_qianshan_status,
    get_qianshan_lab_history,
    get_storyboard_direct_status,
    run_qianshan_storyboard_pipeline,
    stream_direct_storyboard_pipeline,
    stream_qianshan_storyboard_pipeline,
)


router = APIRouter(prefix="/api/qianshan-lab", tags=["qianshan-lab"])


class StoryboardLabRequest(BaseModel):
    article: str = Field(..., min_length=1)
    title: str = ""
    script_template_id: int = DEFAULT_SCRIPT_TEMPLATE_ID
    storyboard_template_id: int = DEFAULT_STORYBOARD_TEMPLATE_ID
    style_template_id: int | None = None
    llm_config_id: int = DEFAULT_LLM_CONFIG_ID
    scene_index: int = 0
    qianshan_mode: str = "direct_scene"


class DirectStoryboardRequest(BaseModel):
    text: str = Field(..., min_length=1)
    title: str = ""
    storyboard_template_id: int = DEFAULT_STORYBOARD_TEMPLATE_ID
    style_template_id: int | None = None
    llm_config_id: int = DEFAULT_LLM_CONFIG_ID
    enable_context: bool = True
    max_tokens: int = DIRECT_STORYBOARD_MAX_TOKENS
    temperature: float = 0.7
    prompt_mode: str = "clean"
    followup_instruction: str = ""
    model_override: str = ""
    thinking_enabled: bool = False
    reasoning_effort: str = "high"


@router.get("/status")
async def qianshan_lab_status():
    try:
        return await get_qianshan_status()
    except QianshanLabError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/direct-status")
async def qianshan_lab_direct_status():
    try:
        return await get_storyboard_direct_status()
    except QianshanLabError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/history")
async def qianshan_lab_history(limit: int = Query(100, ge=1, le=100)):
    try:
        return {"runs": get_qianshan_lab_history(limit=limit)}
    except QianshanLabError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/direct-storyboard-stream")
async def qianshan_lab_direct_storyboard_stream(request: DirectStoryboardRequest):
    async def event_stream():
        try:
            async for event in stream_direct_storyboard_pipeline(
                request.text,
                title=request.title,
                storyboard_template_id=request.storyboard_template_id,
                style_template_id=request.style_template_id,
                llm_config_id=request.llm_config_id,
                enable_context=request.enable_context,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                prompt_mode=request.prompt_mode,
                followup_instruction=request.followup_instruction,
                model_override=request.model_override,
                thinking_enabled=request.thinking_enabled,
                reasoning_effort=request.reasoning_effort,
            ):
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception as exc:
            yield json.dumps(
                {"type": "error", "stage": "error", "message": str(exc)},
                ensure_ascii=False,
            ) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson; charset=utf-8")


@router.post("/storyboard")
async def qianshan_lab_storyboard(request: StoryboardLabRequest):
    try:
        return await run_qianshan_storyboard_pipeline(
            request.article,
            title=request.title,
            script_template_id=request.script_template_id,
            storyboard_template_id=request.storyboard_template_id,
            style_template_id=request.style_template_id,
            llm_config_id=request.llm_config_id,
            scene_index=request.scene_index,
        )
    except QianshanLabError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/storyboard-stream")
async def qianshan_lab_storyboard_stream(request: StoryboardLabRequest):
    async def event_stream():
        try:
            async for event in stream_qianshan_storyboard_pipeline(
                request.article,
                title=request.title,
                script_template_id=request.script_template_id,
                storyboard_template_id=request.storyboard_template_id,
                style_template_id=request.style_template_id,
                llm_config_id=request.llm_config_id,
                scene_index=request.scene_index,
                qianshan_mode=request.qianshan_mode,
            ):
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception as exc:
            yield json.dumps(
                {"type": "error", "stage": "error", "message": str(exc)},
                ensure_ascii=False,
            ) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson; charset=utf-8")
