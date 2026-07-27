from typing import Any, Dict, Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from services.supplement_video_service import SupplementVideoService

router = APIRouter(prefix="/api/supplement-video", tags=["supplement-video"])


class SupplementTaskCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    novel_id: Optional[int] = None
    chapter_id: Optional[int] = None
    anchor_storyboard_id: Optional[int] = None
    anchor_position: str = "after"
    title: str = ""
    script_text: str = ""
    storyboard_text: str = ""
    video_prompt: str = ""
    provider: str = "jimeng"
    video_config_id: Optional[int] = None
    model_name: str = ""
    ratio: str = "9:16"
    resolution: str = "720P"
    duration: int = 8
    generation_mode: str = "multimodal2video"
    params: Dict[str, Any] = Field(default_factory=dict)


class SupplementTaskUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    novel_id: Optional[int] = None
    chapter_id: Optional[int] = None
    anchor_storyboard_id: Optional[int] = None
    anchor_position: Optional[str] = None
    title: Optional[str] = None
    script_text: Optional[str] = None
    storyboard_text: Optional[str] = None
    video_prompt: Optional[str] = None
    first_frame_path: Optional[str] = None
    last_frame_path: Optional[str] = None
    provider: Optional[str] = None
    video_config_id: Optional[int] = None
    model_name: Optional[str] = None
    ratio: Optional[str] = None
    resolution: Optional[str] = None
    duration: Optional[int] = None
    generation_mode: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class GenerateStoryboardRequest(BaseModel):
    template_id: int
    llm_config_id: int


class SupplementMaterialsUpdate(BaseModel):
    characters: list[str] = Field(default_factory=list)
    scenes: list[str] = Field(default_factory=list)
    props: list[str] = Field(default_factory=list)


class CaptureFrameRequest(BaseModel):
    source_storyboard_id: int
    frame_type: str
    capture_time: Optional[float] = None


@router.get("/tasks")
async def list_tasks(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
):
    return await SupplementVideoService.list_tasks(limit=limit, offset=offset, status=status)


@router.post("/tasks")
async def create_task(payload: SupplementTaskCreate):
    try:
        return await SupplementVideoService.create_task(payload.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/tasks/{task_id}")
async def get_task(task_id: int):
    task = await SupplementVideoService.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="supplement task not found")
    return task


@router.put("/tasks/{task_id}")
async def update_task(task_id: int, payload: SupplementTaskUpdate):
    data = payload.model_dump(exclude_unset=True)
    try:
        task = await SupplementVideoService.update_task(task_id, data)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not task:
        raise HTTPException(status_code=404, detail="supplement task not found")
    return task


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int):
    ok = await SupplementVideoService.delete_task(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="supplement task not found")
    return {"success": True}


@router.post("/tasks/{task_id}/upload-frame")
async def upload_frame(task_id: int, frame_type: str = Query(...), file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image file required")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty file")
    try:
        task = await SupplementVideoService.save_frame(task_id, frame_type, file.filename or "frame.png", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not task:
        raise HTTPException(status_code=404, detail="supplement task not found")
    return task


@router.put("/tasks/{task_id}/materials")
async def update_materials(task_id: int, payload: SupplementMaterialsUpdate):
    try:
        task = await SupplementVideoService.set_materials(task_id, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not task:
        raise HTTPException(status_code=404, detail="supplement task not found")
    return task


@router.get("/tasks/{task_id}/materials.zip")
async def download_materials(task_id: int):
    try:
        zip_path = await SupplementVideoService.build_material_archive(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"supplement_{task_id}_materials.zip",
    )


@router.get("/tasks/{task_id}/frame-sources")
async def list_frame_sources(task_id: int):
    try:
        return await SupplementVideoService.list_frame_sources(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/tasks/{task_id}/capture-frame")
async def capture_frame(task_id: int, payload: CaptureFrameRequest):
    try:
        task = await SupplementVideoService.capture_frame_from_storyboard(
            task_id,
            payload.source_storyboard_id,
            payload.frame_type,
            payload.capture_time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not task:
        raise HTTPException(status_code=404, detail="supplement task not found")
    return task


@router.post("/tasks/{task_id}/generate-storyboard")
async def generate_storyboard(task_id: int, payload: GenerateStoryboardRequest):
    try:
        return await SupplementVideoService.generate_storyboard(
            task_id,
            template_id=payload.template_id,
            llm_config_id=payload.llm_config_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/tasks/{task_id}/generate-video")
async def generate_video(task_id: int, payload: Optional[SupplementTaskUpdate] = None):
    try:
        data = payload.model_dump(exclude_unset=True) if payload else {}
        return await SupplementVideoService.generate_video(task_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/tasks/{task_id}/poll")
async def poll_video(task_id: int):
    try:
        return await SupplementVideoService.poll_video(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
