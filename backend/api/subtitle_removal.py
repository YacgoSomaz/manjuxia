"""字幕去除 API"""
import os
import shutil
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from services import subtitle_removal_service as srs

router = APIRouter(prefix="/api/subtitle-removal", tags=["字幕去除"])

UPLOAD_DIR = srs.UPLOAD_DIR


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """上传视频文件"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # 保存文件
    import uuid
    ext = os.path.splitext(file.filename)[1] or '.mp4'
    saved_name = f"{uuid.uuid4().hex[:8]}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    
    with open(saved_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {
        "filename": file.filename,
        "saved_path": saved_path,
        "saved_name": saved_name,
        "size": len(content)
    }


@router.post("/process")
async def process_video(
    background_tasks: BackgroundTasks,
    video_path: str = Form(...),
    algorithm: str = Form("vsr-sttn"),
    subtitle_area: str = Form("auto"),
    filename: str = Form("")
):
    """提交去字幕处理任务
    
    video_path 支持:
    1. 绝对路径: /path/to/video.mp4 或 E:\\path\\to\\video.mp4
    2. 相对路径: /data/videos/xxx.mp4 (会被转换为实际路径)
    """
    # 处理相对路径，如 /data/videos/xxx.mp4
    actual_path = video_path
    if video_path.startswith('/data/'):
        # 获取后端 data 目录的绝对路径
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        data_dir = os.path.join(backend_dir, "data")
        rel_path = video_path[6:]  # 去掉 /data/ 前缀
        actual_path = os.path.join(data_dir, rel_path.replace('/', os.sep))
    
    if not os.path.exists(actual_path):
        raise HTTPException(status_code=400, detail=f"视频文件不存在: {video_path} (解析路径: {actual_path})")
    
    # 使用实际路径进行后续处理
    video_path = actual_path
    
    valid_algorithms = ["vsr-sttn", "vsr-lama", "vsr-propainter", "propainter"]
    if algorithm not in valid_algorithms:
        raise HTTPException(status_code=400, detail=f"不支持的算法: {algorithm}")
    
    task_id = await srs.create_task(video_path, filename or os.path.basename(video_path), algorithm, subtitle_area)
    
    # 在后台处理
    background_tasks.add_task(srs.process_video, task_id)
    
    return {"task_id": task_id, "status": "pending"}


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    """查询任务状态"""
    task = await srs.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.get("/list")
async def list_tasks():
    """获取所有任务列表"""
    tasks = await srs.list_tasks()
    return {"tasks": tasks}


@router.delete("/task/{task_id}")
async def delete_task(task_id: str):
    """删除任务"""
    task = await srs.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    await srs.delete_task(task_id)
    return {"message": "已删除"}


@router.get("/download/{task_id}")
async def download_video(task_id: str):
    """下载处理后的视频"""
    task = await srs.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task['status'] != 'done' or not task.get('output_path'):
        raise HTTPException(status_code=400, detail="视频尚未处理完成")
    if not os.path.exists(task['output_path']):
        raise HTTPException(status_code=404, detail="输出文件不存在")
    
    return FileResponse(
        task['output_path'],
        media_type="video/mp4",
        filename=f"no_sub_{task.get('original_filename', 'video.mp4')}"
    )
