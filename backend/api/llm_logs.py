import os
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from database.db import get_db
from services.log_service import LogService
from models.llm_logs import LLMLogListResponse, LLMLogDetailResponse, LLMLogDeleteRequest
from utils.paths import get_data_dir
from utils.timezone import now_beijing_strf
from utils.ssl_helper import get_aiohttp_connector

router = APIRouter(prefix="/api/llm-logs", tags=["LLM Logs"])


@router.post("/{log_id}/interrupt")
async def interrupt_log(log_id: int):
    """强制中断运行中的日志任务"""
    db = await get_db()
    try:
        async with db.execute(
            "SELECT id, status, task_type FROM llm_logs WHERE id = ?", (log_id,)
        ) as cursor:
            log = await cursor.fetchone()
        if not log:
            raise HTTPException(status_code=404, detail="日志不存在")
        if log["status"] != "running":
            raise HTTPException(status_code=400, detail="只能中断运行中的任务")

        now = now_beijing_strf()
        await db.execute(
            "UPDATE llm_logs SET status = 'error', error_message = '用户手动中断', end_time = ? WHERE id = ?",
            (now, log_id)
        )
        await db.commit()

        return {"status": "ok", "message": "任务已中断"}
    finally:
        await db.close()


@router.post("/{log_id}/redownload")
async def redownload_image(log_id: int):
    """重下失败图片任务的图片(使用已保存的 remote_url,不重新调 API 也不扣费)

    适用场景:图片生成成功但本地下载失败(URL 已保存在 remote_url 字段)
    注意:服务商图片 URL 一般只有 2 小时有效期,过期后此接口会失败

    重下成功后会:
    1. 更新 llm_logs 为 success
    2. 尝试从 chapter_title 反查 element_id,把 image_url 写回 extracted_elements 表
       (这样分镜/人物/场景页面的图片也会恢复显示)
    """
    from services.image_service import ImageService
    from services.log_service import LogService
    from services.extraction_service import ExtractionService
    import uuid
    import re

    log = await LogService.get_log_detail(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="日志不存在")
    if log.get("task_type") != "image_generation":
        raise HTTPException(status_code=400, detail="仅图片生成任务支持重下")
    remote_url = log.get("remote_url")
    if not remote_url:
        raise HTTPException(status_code=400, detail="该任务未保存 remote_url,无法重下")

    # 尝试从 chapter_title 解析 element_id + element_type
    # 格式: "元素ID: 214, 类型: character"
    element_id = None
    element_type = None
    chapter_title = log.get("chapter_title") or ""
    m = re.search(r"元素ID:\s*(\d+)\s*,\s*类型:\s*(\w+)", chapter_title)
    if m:
        element_id = int(m.group(1))
        element_type = m.group(2)

    # 🆕 柏拉图异步任务的 task_id 反查:remote_url 形如 "bltcy-task:abc123|generate"
    # 服务端任务可能还在排队/已完成/已失败,我们去拉一次状态再决定怎么走
    bltcy_task_match = re.match(r"^bltcy-task:([a-f0-9]+)\|(generate|edit)$", remote_url)
    if bltcy_task_match:
        task_id = bltcy_task_match.group(1)
        # 找原始 config(用 config_name 反查 api_key + base_url)
        from services.llm_service import LLMService
        all_image_cfgs = await LLMService.get_all(config_type="image")
        cfg = next((c for c in all_image_cfgs if c.get("name") == log.get("config_name")), None)
        if not cfg:
            raise HTTPException(status_code=400, detail=f"找不到原始配置 '{log.get('config_name')}',无法反查 task_id")
        # 调柏拉图查询接口
        import aiohttp
        base_url = (cfg.get("base_url") or "https://api.bltcy.cn").rstrip("/").rstrip("/v1")
        if not base_url.endswith("/v1"):
            base_url = base_url + "/v1"
        query_url = f"{base_url}/images/tasks/{task_id}"
        api_key = cfg.get("api_key") or ""
        try:
            async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=30)) as s:
                async with s.get(query_url, headers={"Authorization": f"Bearer {api_key}"}) as resp:
                    rj = await resp.json()
                    task = (rj or {}).get("data") or {}
                    status = (task.get("status") or "").upper()
                    if status == "SUCCESS":
                        inner = (task.get("data") or {})
                        arr = inner.get("data") if isinstance(inner, dict) else None
                        if isinstance(arr, list) and arr:
                            real_url = arr[0].get("url")
                            if real_url:
                                remote_url = real_url
                                # 把真实 URL 也回写 llm_logs(下次重下不必再反查)
                                await LogService.update_log_remote_url(log_id=log_id, remote_url=real_url)
                            else:
                                raise HTTPException(status_code=502, detail="柏拉图任务成功但响应无 URL")
                        else:
                            raise HTTPException(status_code=502, detail="柏拉图任务成功但响应数据为空")
                    elif status == "FAILURE":
                        raise HTTPException(status_code=502, detail=f"柏拉图任务失败: {task.get('fail_reason') or '未知'}")
                    elif status in ("NOT_START", "IN_PROGRESS", ""):
                        raise HTTPException(status_code=425,
                            detail=f"柏拉图任务还在生成中({status or '未启动'},progress={task.get('progress') or '0%'}),请稍后再点重下")
                    else:
                        raise HTTPException(status_code=502, detail=f"柏拉图未知状态: {status}")
        except aiohttp.ClientError as e:
            raise HTTPException(status_code=502, detail=f"柏拉图查询接口网络错误: {e}")

    # 用原始命名约定:element_{id}_{uuid}.png(跟正常生成保持一致,方便后续清理)
    ext = ".png"
    if element_id:
        filename = f"element_{element_id}_{uuid.uuid4().hex[:8]}{ext}"
    else:
        filename = f"redownload_{log_id}_{uuid.uuid4().hex[:8]}{ext}"

    local_path = await ImageService._download_image(remote_url, filename)
    if not local_path:
        raise HTTPException(status_code=502, detail="下载失败(URL 可能已过期,服务商图片 URL 通常仅 2 小时有效)")

    # 更新 llm_logs 为 success
    await LogService.update_log_success(
        log_id=log_id,
        output_content=local_path,
        input_tokens=log.get("input_tokens", 0),
        output_tokens=log.get("output_tokens", 0),
        total_tokens=log.get("total_tokens", 0),
    )

    # 反向更新 extracted_elements 表(如果能解析到 element_id)
    element_restored = False
    if element_id:
        try:
            existing = await ExtractionService.get_element(element_id)
            if existing:
                await ExtractionService.update_element_image(
                    element_id=element_id,
                    image_url=local_path,
                    image_status="success"
                )
                element_restored = True
        except Exception as e:
            # 元素可能已被删除,不影响主流程
            print(f"[WARN] 重下后回写元素 {element_id} 失败: {e}")

    return {
        "status": "ok",
        "image_url": local_path,
        "element_restored": element_restored,
        "element_id": element_id,
        "message": "图片重下成功" + ("(已回写元素)" if element_restored else "(未关联元素或元素已删)")
    }


@router.get("/stats/overview")
async def get_logs_stats():
    """获取日志统计概览"""
    db = await get_db()
    try:
        # 总数
        async with db.execute("SELECT COUNT(*) as total FROM llm_logs") as cursor:
            row = await cursor.fetchone()
            total = row["total"] if row else 0
        
        # 按状态统计
        async with db.execute(
            "SELECT status, COUNT(*) as count FROM llm_logs GROUP BY status"
        ) as cursor:
            rows = await cursor.fetchall()
            status_stats = {row["status"]: row["count"] for row in rows}
        
        # 按任务类型统计
        async with db.execute(
            "SELECT task_type, COUNT(*) as count FROM llm_logs GROUP BY task_type"
        ) as cursor:
            rows = await cursor.fetchall()
            task_type_stats = {row["task_type"]: row["count"] for row in rows}
        
        # 总token使用量
        async with db.execute(
            "SELECT SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens, SUM(total_tokens) as total_tokens FROM llm_logs"
        ) as cursor:
            row = await cursor.fetchone()
            token_stats = {
                "input_tokens": row["input_tokens"] or 0,
                "output_tokens": row["output_tokens"] or 0,
                "total_tokens": row["total_tokens"] or 0
            }
        
        # 总耗时
        async with db.execute(
            "SELECT SUM(duration_seconds) as total_duration FROM llm_logs WHERE status = 'success'"
        ) as cursor:
            row = await cursor.fetchone()
            total_duration = row["total_duration"] or 0
        
        return {
            "total": total,
            "status_stats": status_stats,
            "task_type_stats": task_type_stats,
            "token_stats": token_stats,
            "total_duration_seconds": round(total_duration, 2)
        }
    finally:
        await db.close()


@router.get("/", response_model=LLMLogListResponse)
async def get_logs(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=100, description="每页数量"),
    task_type: Optional[str] = Query(None, description="任务类型筛选"),
    status: Optional[str] = Query(None, description="状态筛选"),
    novel_id: Optional[int] = Query(None, description="小说ID筛选")
):
    """获取日志列表（分页，可按任务类型/状态/小说ID筛选）
    
    任务类型：
    - script_convert: 剧本转换
    - storyboard_generate: 分镜生成
    - extraction: 信息提取
    - test: 测试连接
    - other: 其他
    """
    await LogService.mark_superseded_image_logs()
    result = await LogService.get_logs(
        page=page,
        page_size=page_size,
        task_type=task_type,
        status=status,
        novel_id=novel_id
    )
    return result


@router.get("/system-log")
async def get_system_log(lines: int = Query(200, description="返回最后N行日志")):
    """获取系统日志（app.log最后N行）"""
    log_path = os.path.join(get_data_dir(), "app.log")
    if not os.path.exists(log_path):
        return {"content": "日志文件不存在", "path": log_path}
    
    try:
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()
            last_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return {"content": "".join(last_lines), "path": log_path, "total_lines": len(all_lines)}
    except Exception as e:
        return {"content": f"读取日志失败: {str(e)}", "path": log_path}


@router.get("/{log_id}", response_model=LLMLogDetailResponse)
async def get_log_detail(log_id: int):
    """获取日志详情（包含完整输入输出）"""
    log = await LogService.get_log_detail(log_id)
    if not log:
        raise HTTPException(status_code=404, detail="日志不存在")
    # input_prompt 可能包含渲染后的模板内容，截断保护
    if log.get("input_prompt") and len(log["input_prompt"]) > 100:
        log["input_prompt"] = log["input_prompt"][:100] + "...(内容已隐藏)"
    return log


@router.delete("/")
async def delete_logs(
    log_ids: Optional[List[int]] = Query(None, description="要删除的日志ID列表"),
    before_date: Optional[str] = Query(None, description="删除此日期之前的日志（ISO格式）")
):
    """删除日志
    
    两种方式：
    1. 指定 log_ids: 删除指定ID的日志
    2. 指定 before_date: 删除指定日期之前的所有日志
    """
    if not log_ids and not before_date:
        raise HTTPException(status_code=400, detail="请提供 log_ids 或 before_date 参数")
    
    deleted_count = await LogService.delete_logs(
        log_ids=log_ids,
        before_date=before_date
    )
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"成功删除 {deleted_count} 条日志"
    }
