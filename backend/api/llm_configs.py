from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from models.llm_configs import LLMConfigCreate, LLMConfigUpdate, LLMConfigResponse
from services.llm_service import LLMService
from services.model_presets import get_model_presets, get_all_presets, get_provider_presets
from utils.local_signature import require_local_signature
import httpx

router = APIRouter(
    prefix="/api/llm-configs",
    tags=["llm-configs"],
    dependencies=[Depends(require_local_signature)],
)


# ==================== 列表 & 创建 ====================

@router.get("/", response_model=List[LLMConfigResponse])
async def get_llm_configs(
    config_type: Optional[str] = Query(None, description="配置类型筛选: llm/image/video"),
    force: bool = Query(False, description="是否强制绕过 30s 缓存,前端刷新按钮请传 true"),
):
    """获取所有大模型配置,支持按类型筛选。
    v3.59.64:支持 force=true 绕过云端配置 30s 缓存,适用于"用户在 web 改了立刻想在 C 端看到"。
    v3.59.75:登录失效返 401,前端引导用户重启工具(以前静默返空被当成"云端真没数据")。"""
    if force:
        # 绕过 cloud_llm_sync 的 30s 缓存
        from services.cloud_llm_sync import _list_cache, _key_cache
        _list_cache.pop(config_type or "llm", None)
        # key_cache 整个清(用户改 key 也希望立刻生效)
        _key_cache.clear()
    try:
        configs = await LLMService.get_all(config_type)
    except RuntimeError as e:
        msg = str(e)
        if "登录已失效" in msg or "登录已" in msg:
            raise HTTPException(status_code=401, detail="登录已失效,请退出后重新打开千山漫剧重新登录")
        raise HTTPException(status_code=500, detail=msg)
    return configs


@router.post("/", response_model=LLMConfigResponse)
async def create_llm_config(config: LLMConfigCreate):
    """创建大模型配置"""
    return LLMService.to_public_config(await LLMService.create(config))


# ==================== 静态路径端点(必须在 /{config_id} 之前) ====================

@router.get("/presets", response_model=Dict[str, Any])
async def get_model_presets_endpoint(config_type: Optional[str] = Query(None, description="配置类型: llm/image/video")):
    """[旧接口] 获取按模型 ID 索引的预置(供现有 UI 使用,逐步废弃)"""
    if config_type:
        presets = get_model_presets(config_type)
        return presets
    return get_all_presets()


@router.get("/provider-presets")
async def get_provider_presets_endpoint(
    config_type: Optional[str] = Query(None, description="配置类型: llm/image")
):
    """获取厂商预设(新结构,供前端两级下拉使用)。
    数据来源:本地 llm_config_presets 表(启动时从 admin-server 同步)。
    """
    presets = await get_provider_presets(config_type)
    return {"presets": presets}


class ProbeModelsRequest(BaseModel):
    base_url: str
    api_key: str
    probe_path: Optional[str] = "/models"


@router.post("/probe-models")
async def probe_models(req: ProbeModelsRequest):
    """探测中转站/OpenAI 兼容服务的可用模型列表(GET {base_url}/models)"""
    base_url = (req.base_url or "").rstrip("/")
    path = req.probe_path or "/models"
    if not path.startswith("/"):
        path = "/" + path
    url = f"{base_url}{path}"

    try:
        # v3.61.170: trust_env=False — 防用户代理软件污染外部 API 探测(同 llm_service / image_service)
        async with httpx.AsyncClient(timeout=10.0, trust_env=False) as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {req.api_key}"},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail=f"探测超时: {url}")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"探测失败: {type(e).__name__}")

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="API Key 无效")
    if resp.status_code == 403:
        raise HTTPException(status_code=403, detail="拒绝访问(Key 无权限或未开通)")
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"{path} 端点不存在,此服务可能不支持模型列表查询")
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=f"探测返回 HTTP {resp.status_code}")

    try:
        payload = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="响应不是合法 JSON")

    # OpenAI 兼容格式: {"data": [{"id": "...", "owned_by": "..."}]}
    items = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(items, list):
        # 某些中转可能直接返数组
        if isinstance(payload, list):
            items = payload
        else:
            raise HTTPException(status_code=502, detail="响应格式不符合 OpenAI 协议(无 data 字段)")

    models = []
    for item in items:
        if isinstance(item, dict) and item.get("id"):
            models.append({
                "id": item.get("id"),
                "owned_by": item.get("owned_by"),
            })
        elif isinstance(item, str):
            models.append({"id": item, "owned_by": None})

    return {"models": models, "count": len(models)}


# ==================== 按 ID 操作(路径参数必须在静态路径之后) ====================

@router.get("/{config_id}", response_model=LLMConfigResponse)
async def get_llm_config(config_id: int):
    """获取单个大模型配置"""
    config = await LLMService.get_by_id(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return LLMService.to_public_config(config)


@router.put("/{config_id}", response_model=LLMConfigResponse)
async def update_llm_config(config_id: int, config: LLMConfigUpdate):
    """更新大模型配置"""
    updated = await LLMService.update(config_id, config)
    if not updated:
        raise HTTPException(status_code=404, detail="配置不存在")
    return LLMService.to_public_config(updated)


@router.delete("/{config_id}")
async def delete_llm_config(config_id: int):
    """删除大模型配置"""
    deleted = await LLMService.delete(config_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="配置不存在")
    return {"message": "删除成功"}


@router.post("/{config_id}/test")
async def test_llm_connection(config_id: int):
    """测试大模型API连通性"""
    result = await LLMService.test_connection(config_id)
    return result
