from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from models.templates import TemplateCreate, TemplateUpdate, TemplateResponse
from services.template_service import get_all, get_by_id, create, update, delete
# v3.61.70: 本机签名校验 — 防 curl localhost:8000 直接拿模板 content
from utils.local_signature import require_local_signature

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("/")
async def list_templates(
    category: Optional[str] = Query(None, description="按类别筛选"),
    _sig: dict = Depends(require_local_signature),
):
    """获取模板列表(需本机签名)"""
    templates = await get_all(category_filter=category)
    return templates


@router.get("/{template_id}")
async def get_template(
    template_id: int,
    _sig: dict = Depends(require_local_signature),
):
    """获取单个模板详情(需本机签名)
    v3.61.70: 加签名校验后,外部 curl localhost:8000/api/templates/123 直接 403
    只有真前端(通过 Electron IPC 拿到 session_secret)能算出正确 X-Session-Token
    """
    template = await get_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    return template


@router.post("/")
async def create_template(template: TemplateCreate):
    """创建新模板"""
    return await create(template)


@router.put("/{template_id}")
async def update_template(template_id: int, template: TemplateUpdate):
    """更新模板"""
    result = await update(template_id, template)
    if not result:
        raise HTTPException(status_code=404, detail="模板不存在")
    return result


@router.delete("/{template_id}")
async def delete_template(template_id: int):
    """删除模板"""
    success = await delete(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {"message": "删除成功"}
