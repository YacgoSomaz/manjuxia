"""v3.61.92 / v3.61.99: 其他功能 — 溶图 + 火山方舟素材库加白

设置 → 其他功能 / 信息提取页 的后端接口:
- POST /api/extra/fuse:多张参考图 base64 + prompt + ratio → 生成融合图
- GET  /api/extra/fusion/history:溶图历史(分页)
- DELETE /api/extra/fusion/history/{id}:删除某条历史记录

火山方舟素材库(企业版):
- GET  /api/extra/volc/config:拉本地存的 AK + 加密 SK + 项目
- POST /api/extra/volc/config:保存配置(SK 由前端 safeStorage 加密后传过来)
- POST /api/extra/volc/test:测试连接(临时用前端解密后的明文 SK)
- POST /api/extra/volc/asset/upload:为某元素加白入库(明文 SK 一次性传)
- POST /api/extra/volc/asset/status:轮询素材状态
"""
import json
import logging
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.db import get_db
from services.image_service import ImageService
from services.llm_service import LLMService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/extra", tags=["extra"])


class FuseRequest(BaseModel):
    config_id: int
    prompt: str
    ratio: str = "1:1"
    reference_images: List[str]  # base64 字符串数组(可带或不带 data: 前缀)


@router.post("/fuse")
async def fuse_images(req: FuseRequest):
    """溶图 — 多参考图融合"""
    if not req.reference_images:
        raise HTTPException(status_code=400, detail="至少需要 1 张参考图")
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="融合描述不能为空")

    # 写一条 pending 历史
    config = await LLMService.get_by_id(req.config_id)
    config_name = (config or {}).get("name", "") if config else ""
    model_name = (config or {}).get("model_name", "") if config else ""

    history_id = None
    db = await get_db()
    try:
        cur = await db.execute(
            "INSERT INTO fusion_history (config_id, config_name, model_name, prompt, ratio, reference_images, status) "
            "VALUES (?, ?, ?, ?, ?, ?, 'pending')",
            (
                req.config_id, config_name, model_name,
                req.prompt, req.ratio,
                # 历史记录只存数量,不存原始 base64(太大)
                json.dumps({"count": len(req.reference_images)}, ensure_ascii=False),
            )
        )
        history_id = cur.lastrowid
        await db.commit()
    except Exception as e:
        logger.warning(f"[fusion] 写 history pending 失败: {e}")
    finally:
        await db.close()

    # 调 ImageService.generate_fusion_image
    result = await ImageService.generate_fusion_image(
        config_id=req.config_id,
        prompt=req.prompt,
        ratio=req.ratio,
        reference_images_base64=req.reference_images,
    )

    # 回写 history
    if history_id is not None:
        try:
            db = await get_db()
            try:
                if result.get("success"):
                    await db.execute(
                        "UPDATE fusion_history SET status='success', output_image_url=?, output_remote_url=?, "
                        "finished_at=datetime('now','+8 hours') WHERE id=?",
                        (result.get("image_url"), result.get("remote_url"), history_id)
                    )
                else:
                    await db.execute(
                        "UPDATE fusion_history SET status='failed', error_message=?, "
                        "finished_at=datetime('now','+8 hours') WHERE id=?",
                        (result.get("message", ""), history_id)
                    )
                await db.commit()
            finally:
                await db.close()
        except Exception as e:
            logger.warning(f"[fusion] 回写 history 失败: {e}")

    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("message", "融合失败"))

    return {
        "success": True,
        "image_url": result.get("image_url"),
        "remote_url": result.get("remote_url"),
        "history_id": history_id,
    }


@router.get("/fusion/history")
async def list_fusion_history(limit: int = 50, offset: int = 0):
    """溶图历史列表(按 created_at 倒序)"""
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, config_id, config_name, model_name, prompt, ratio, "
            "       output_image_url, output_remote_url, status, error_message, "
            "       created_at, finished_at "
            "FROM fusion_history ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = await cur.fetchall()
        items = []
        for r in rows:
            items.append({
                "id": r["id"],
                "config_id": r["config_id"],
                "config_name": r["config_name"],
                "model_name": r["model_name"],
                "prompt": r["prompt"],
                "ratio": r["ratio"],
                "output_image_url": r["output_image_url"],
                "output_remote_url": r["output_remote_url"],
                "status": r["status"],
                "error_message": r["error_message"],
                "created_at": r["created_at"],
                "finished_at": r["finished_at"],
            })

        cur2 = await db.execute("SELECT COUNT(*) AS c FROM fusion_history")
        total_row = await cur2.fetchone()
        total = total_row["c"] if total_row else 0
    finally:
        await db.close()
    return {"items": items, "total": total, "limit": limit, "offset": offset}


class LinkToElementRequest(BaseModel):
    history_id: int
    element_id: int
    # v3.61.264:非空 = 把图存为该角色的马甲(character_variants)成品图,不覆盖本体成品图。
    #   仅人物有效;马甲名已存在则覆盖该马甲成品图,不存在则新建马甲。
    variant_name: Optional[str] = None


@router.post("/fusion/link-to-element")
async def link_fusion_to_element(req: LinkToElementRequest):
    """把溶图历史里的成品图,关联到信息提取里的某个角色/场景/道具元素。

    两种模式:
    - variant_name 为空:覆盖元素本体 finished_image(原逻辑)。
    - variant_name 非空(仅人物):存为该角色马甲的成品图(真复制文件,语义命名 角色_名_马甲名.ext),
      本体成品图保留不动。马甲不存在则新建。
    都是 shutil.copy2 真落地本地文件(不存远程引用),保证推云端不漏。
    """
    import os
    import time
    import shutil
    from utils.paths import resolve_db_path, media_subdir
    from services.extraction_service import ExtractionService

    # 1. 拉 history
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT output_image_url, status FROM fusion_history WHERE id=?",
            (req.history_id,)
        )
        h = await cur.fetchone()
    finally:
        await db.close()
    if not h:
        raise HTTPException(status_code=404, detail=f"自由生图历史 id={req.history_id} 不存在")
    if h["status"] != "success" or not h["output_image_url"]:
        raise HTTPException(status_code=400, detail="该自由生图任务未成功,无图可关联")

    src_path_rel = h["output_image_url"]
    src_abs = resolve_db_path(src_path_rel)
    if not src_abs or not os.path.exists(src_abs):
        raise HTTPException(status_code=400, detail=f"源图文件不存在: {src_path_rel}")

    # 2. 拉 element
    element = await ExtractionService.get_element(req.element_id)
    if not element:
        raise HTTPException(status_code=404, detail=f"元素 id={req.element_id} 不存在")

    ext = os.path.splitext(src_abs)[1] or ".png"
    images_dir = media_subdir("images")
    os.makedirs(images_dir, exist_ok=True)

    # ===== 分支 A:存为马甲成品图(仅人物) =====
    vname = (req.variant_name or "").strip()
    if vname:
        if element.get("element_type") != "character":
            raise HTTPException(status_code=400, detail="只有人物支持马甲")
        # 找/建马甲
        variant = await ExtractionService.get_variant_by_name(req.element_id, vname)
        if not variant:
            try:
                variant = await ExtractionService.create_variant(req.element_id, vname)
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))
        if not variant:
            raise HTTPException(status_code=500, detail="创建马甲失败")
        variant_id = variant["id"]
        # 语义命名落地:小说名/人物/人物_角色名_马甲名.ext(同名覆盖)
        rel_name = await _build_variant_finished_rel(req.element_id, vname, ext)
        if rel_name:
            dst_abs = os.path.join(images_dir, rel_name.replace("/", os.sep))
            os.makedirs(os.path.dirname(dst_abs), exist_ok=True)
            new_variant_path = f"data/images/{rel_name}"
        else:
            new_variant_path = f"data/images/variant_fin_{variant_id}_{int(time.time())}{ext}"
            dst_abs = os.path.join(images_dir, os.path.basename(new_variant_path))
        try:
            shutil.copy2(src_abs, dst_abs)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"复制文件失败: {e}")
        # 删旧马甲成品图(路径不同才删)
        old_v = variant.get("finished_image")
        if old_v and old_v != new_variant_path:
            try:
                old_abs = resolve_db_path(old_v)
                if old_abs and os.path.exists(old_abs) and os.path.abspath(old_abs) != os.path.abspath(dst_abs):
                    os.remove(old_abs)
            except Exception as e:
                logger.warning(f"[fusion-link] 删旧马甲成品图失败(忽略): {e}")
        await ExtractionService.update_variant(variant_id, finished_image=new_variant_path, image_status="success")
        return {
            "success": True,
            "element_id": req.element_id,
            "element_name": element.get("name", ""),
            "element_type": "character",
            "variant_id": variant_id,
            "variant_name": vname,
            "finished_image": new_variant_path,
            "message": f"已存为 「{element.get('name','')}」 的马甲「{vname}」成品图",
        }

    # ===== 分支 B:覆盖本体成品图(原逻辑) =====
    timestamp = int(time.time())
    new_filename = f"fin_{req.element_id}_{timestamp}{ext}"
    dst_abs = os.path.join(images_dir, new_filename)
    try:
        shutil.copy2(src_abs, dst_abs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"复制文件失败: {e}")

    new_finished_path = f"data/images/{new_filename}"

    # 删旧 finished_image
    old_finished = element.get("finished_image")
    if old_finished and old_finished != new_finished_path:
        try:
            old_abs = resolve_db_path(old_finished)
            if old_abs and os.path.exists(old_abs):
                os.remove(old_abs)
        except Exception as e:
            logger.warning(f"[fusion-link] 删除旧 finished_image 失败(忽略): {e}")

    await ExtractionService.update_element_image(
        element_id=req.element_id,
        finished_image=new_finished_path,
        image_status=None,
    )

    return {
        "success": True,
        "element_id": req.element_id,
        "element_name": element.get("name", ""),
        "element_type": element.get("element_type", ""),
        "finished_image": new_finished_path,
        "message": f"已关联到 {element.get('element_type', '')} 「{element.get('name', '')}」",
    }


async def _build_variant_finished_rel(element_id: int, variant_name: str, ext: str) -> Optional[str]:
    """算马甲成品图语义路径片段 小说名/人物/人物_角色名_马甲名.ext。失败返 None。"""
    try:
        from services.extraction_service import ExtractionService
        from services.image_service import ImageService
        el = await ExtractionService.get_element(element_id)
        if not el:
            return None
        return await ImageService._build_image_filename(
            novel_id=el.get("novel_id"),
            element_id=element_id,
            element_type=el.get("element_type"),
            ext=ext,
            image_role="variant_finished",
            variant_name=variant_name,
        )
    except Exception as e:
        logger.warning(f"[fusion-link] 算马甲语义路径失败 element={element_id}: {e}")
        return None


@router.delete("/fusion/history/{history_id}")
async def delete_fusion_history(history_id: int):
    """删除一条溶图历史"""
    db = await get_db()
    try:
        cur = await db.execute("DELETE FROM fusion_history WHERE id=?", (history_id,))
        await db.commit()
        rowcount = cur.rowcount
    finally:
        await db.close()
    if rowcount == 0:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    return {"success": True}


@router.get("/fusion/supported-configs")
async def list_supported_configs():
    """列出当前支持多参考图融合的图片配置(从云端拉,跟其他模块统一)

    过滤规则:config_type='image' 且 (provider_code ∈ {wuyinkeji, wuyinkeji_llm, mooko, kkai, kkone}
    或 base_url / model_name 命中 wuyinkeji / geek + gpt-image / cool / mooko.ai / kkone 关键字)
    v3.61.192:补 KKAI(mooko/kkone)— fusion 后端已支持,但本端点白名单漏了它导致下拉不显示
    """
    items = []
    try:
        # v3.61.92: 改走云端 cloud_llm_sync(本地 llm_configs 表已经不是权威源,见 LLMConfigView 提示)
        from services import cloud_llm_sync
        cloud_items = await cloud_llm_sync.list_configs("image")
    except Exception as e:
        logger.warning(f"[fusion] 云端拉 image 配置失败,fallback 到本地表: {e}")
        cloud_items = None

    if cloud_items:
        # 云端格式:camelCase(configType / providerCode / baseUrl / modelName)
        for r in cloud_items:
            if not r.get("enabled", True):
                continue
            api_style = (r.get("apiStyle") or r.get("api_style") or "").lower()
            base_url = (r.get("baseUrl") or "").lower()
            model_name = (r.get("modelName") or "").lower().replace(" ", "")
            provider_code = (r.get("providerCode") or "").lower()
            is_wuyinkeji = (
                provider_code in ("wuyinkeji", "wuyinkeji_llm")
                or "wuyinkeji" in base_url
                or api_style == "wuyinkeji_async"
            )
            is_geek_gpt = "geek" in base_url and ("gptimage" in model_name or "gpt-image" in model_name)
            is_cool = "cool" in api_style or "mjapi" in base_url
            is_mooko = (
                provider_code in ("mooko", "kkai", "kkone")
                or "mooko.ai" in base_url
                or "kkone" in base_url
            )
            if is_wuyinkeji or is_geek_gpt or is_cool or is_mooko:
                items.append({
                    "id": r.get("id"),
                    "name": r.get("name", ""),
                    "model_name": r.get("modelName", ""),
                    "category": "wuyinkeji" if is_wuyinkeji else ("geek" if is_geek_gpt else ("cool" if is_cool else "mooko")),
                })
    else:
        # fallback 本地 SQLite
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT id, name, model_name, base_url, api_style FROM llm_configs WHERE config_type='image' ORDER BY id DESC"
            )
            rows = await cur.fetchall()
        finally:
            await db.close()
        for r in rows:
            api_style = (r["api_style"] or "").lower()
            base_url = (r["base_url"] or "").lower()
            model_name = (r["model_name"] or "").lower().replace(" ", "")
            is_wuyinkeji = "wuyinkeji" in base_url or api_style == "wuyinkeji_async"
            is_geek_gpt = "geek" in base_url and ("gptimage" in model_name or "gpt-image" in model_name)
            is_cool = "cool" in api_style or "mjapi" in base_url
            # 本地 fallback SQL 未选 provider_code,只能靠 base_url 判断 mooko/kkone
            is_mooko = "mooko.ai" in base_url or "kkone" in base_url
            if is_wuyinkeji or is_geek_gpt or is_cool or is_mooko:
                items.append({
                    "id": r["id"],
                    "name": r["name"],
                    "model_name": r["model_name"],
                    "category": "wuyinkeji" if is_wuyinkeji else ("geek" if is_geek_gpt else ("cool" if is_cool else "mooko")),
                })
    return {"items": items}


# ==================== v3.61.99 火山方舟素材库(企业版) ====================
# 设计:
#   - AK 明文 / SK 密文(Electron safeStorage 加密) / ProjectName 都存 app_settings 表
#   - 每次调火山时,前端用 safeStorage 解密 SK,把明文 SK 一次性放进请求 body
#   - 后端拿到明文 SK,签名调火山,然后**立刻**丢弃(不写日志/不落盘)

class VolcConfigSaveRequest(BaseModel):
    ak: str
    sk_encrypted: str  # safeStorage 加密后的密文(base64),后端不解密,只透传到本地 DB
    project_name: str = "default"
    # v3.61.107: 企业自持 APIKey(可选,留空则走云端 APIKey),safeStorage 加密
    apikey_encrypted: Optional[str] = ""


class VolcAssetUploadRequest(BaseModel):
    element_id: int
    ak: str
    sk: str  # 明文,后端用完即丢
    project_name: str = "default"


class VolcAssetStatusRequest(BaseModel):
    asset_id: int  # extracted_element id
    ak: str
    sk: str  # 明文
    project_name: str = "default"


class VolcTestRequest(BaseModel):
    ak: str
    sk: str
    project_name: str = "default"


@router.get("/volc/config")
async def get_volc_config():
    """读取本地存的 AK + 加密 SK + ProjectName + 加密 APIKey(密文都让前端解密)"""
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT key, value FROM app_settings WHERE key IN "
            "('volc.ak', 'volc.sk_encrypted', 'volc.project_name', 'volc.enabled', 'volc.apikey_encrypted')"
        )
        rows = await cur.fetchall()
    finally:
        await db.close()
    kv = {r["key"]: r["value"] for r in rows}
    return {
        "ak": kv.get("volc.ak", ""),
        "sk_encrypted": kv.get("volc.sk_encrypted", ""),
        "project_name": kv.get("volc.project_name", "default"),
        "enabled": kv.get("volc.enabled", "") == "1",
        "has_credentials": bool(kv.get("volc.ak") and kv.get("volc.sk_encrypted")),
        # v3.61.107: 企业自持 APIKey(可选)
        "apikey_encrypted": kv.get("volc.apikey_encrypted", ""),
        "has_apikey": bool(kv.get("volc.apikey_encrypted")),
    }


@router.post("/volc/config")
async def save_volc_config(req: VolcConfigSaveRequest):
    """保存 AK + 密文 SK + ProjectName"""
    db = await get_db()
    try:
        for k, v in [
            ("volc.ak", req.ak.strip()),
            ("volc.sk_encrypted", req.sk_encrypted),
            ("volc.project_name", req.project_name.strip() or "default"),
            ("volc.enabled", "1"),
            # v3.61.107: 企业自持 APIKey(可选,空串=清掉)
            ("volc.apikey_encrypted", (req.apikey_encrypted or "").strip()),
        ]:
            await db.execute(
                "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now', '+8 hours')) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now', '+8 hours')",
                (k, v)
            )
        await db.commit()
    finally:
        await db.close()
    _has_apikey = bool((req.apikey_encrypted or "").strip())
    logger.info(f"[volc-asset] 已保存配置 ak={req.ak[:8]}*** project={req.project_name} apikey={'本地配置' if _has_apikey else '走云端'}")
    return {"success": True, "message": "配置已保存"}


@router.post("/volc/test")
async def test_volc_credentials(req: VolcTestRequest):
    """测试 AK/SK 是否有效(调 ListAssetGroups)"""
    from services.volc_asset_service import test_credentials
    ok, msg = await test_credentials(req.ak.strip(), req.sk.strip(), req.project_name.strip() or "default")
    return {"success": ok, "message": msg}


@router.post("/volc/asset/upload")
async def upload_volc_asset(req: VolcAssetUploadRequest):
    """为某元素加白入库 — 同步上传,返回 asset_id(状态 Processing,需后续轮询 Active)

    流程:
      1. 拉 element 拿 finished_image
      2. 上传 admin server 拿临时 URL
      3. 取/建 group(每角色/场景/道具一个组)
      4. CreateAsset → 拿 asset_id
      5. 写回 DB
    """
    from services.volc_asset_service import (
        create_asset_group, create_asset, upload_image_to_admin_temp,
    )
    from services.extraction_service import ExtractionService

    element = await ExtractionService.get_element(req.element_id)
    if not element:
        raise HTTPException(status_code=404, detail=f"元素 id={req.element_id} 不存在")
    finished_image = element.get("finished_image") or element.get("image_url")
    if not finished_image:
        raise HTTPException(status_code=400, detail="元素没有成品图,无法加白")

    project = (req.project_name or "default").strip()
    ak = req.ak.strip()
    sk = req.sk.strip()
    if not ak or not sk:
        raise HTTPException(status_code=400, detail="AK/SK 不能为空")

    # 1. 上传图片到 admin server 拿临时 URL
    try:
        public_url = await upload_image_to_admin_temp(finished_image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传图片到 admin 失败: {e}")

    # 2. 取/建素材组(每元素一个组,组名跟元素绑定)
    # v3.61.129: 组名 / 描述 全部用 ASCII,避免火山 InputTextSensitiveContentDetected
    # (中文人名/小说角色名常被火山文本审核当敏感词拦,只用 element_type + element_id)
    group_name = f"el-{element.get('element_type', 'asset')}-{req.element_id}"
    desc = f"auto-whitelist asset for element {req.element_id}"
    stored_group_id = element.get("volc_asset_group_id")
    group_id = stored_group_id
    if not group_id:
        try:
            group_id = await create_asset_group(group_name, desc, project, ak, sk)
            logger.info(f"[volc-asset] 新建素材组 group_id={group_id} name={group_name}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"创建素材组失败: {e}")
    else:
        logger.info(f"[volc-asset] 复用素材组 group_id={group_id}")

    # 3. CreateAsset — 若 group 失效(NotFound.group_id)自动重建一次
    def _is_group_not_found(err: Exception) -> bool:
        msg = str(err)
        return ("NotFound.group_id" in msg) or ("asset_group" in msg and "not found" in msg)

    # v3.61.129: asset name 也用 ASCII id,避免中文人名触发火山敏感词
    asset_name_safe = f"el-{req.element_id}"
    try:
        asset_id = await create_asset(group_id, public_url, project, ak, sk,
                                       asset_type="Image",
                                       name=asset_name_safe)
    except Exception as e:
        # 若是用了"以前存的 group_id"导致 NotFound,清掉重建一次再试
        if stored_group_id and _is_group_not_found(e):
            logger.warning(f"[volc-asset] 旧 group_id={stored_group_id} 已失效,自动重建一次: {e}")
            # 清掉 DB 里的旧 group_id
            try:
                await ExtractionService.update_element_image(
                    element_id=req.element_id,
                    volc_asset_group_id=None,
                )
            except Exception as ce:
                logger.warning(f"[volc-asset] 清旧 group_id 失败(忽略): {ce}")
            # 重建一个新 group
            try:
                group_id = await create_asset_group(group_name, desc, project, ak, sk)
                logger.info(f"[volc-asset] 自动重建素材组 group_id={group_id}")
            except Exception as ce:
                raise HTTPException(status_code=500, detail=f"重建素材组失败: {ce}")
            # 再尝试一次
            try:
                asset_id = await create_asset(group_id, public_url, project, ak, sk,
                                               asset_type="Image",
                                               name=asset_name_safe)
            except Exception as ce:
                logger.warning(f"[volc-asset] CreateAsset 重试后仍失败 element_id={req.element_id} group={group_id}: {ce}")
                raise HTTPException(status_code=500, detail=f"创建素材失败(重试后仍失败): {ce}")
        else:
            logger.warning(f"[volc-asset] CreateAsset 失败 element_id={req.element_id} group={group_id} url={public_url[:80]}...: {e}")
            raise HTTPException(status_code=500, detail=f"创建素材失败: {e}")

    asset_uri = f"asset://{asset_id}"

    # 4. 写回 extracted_elements
    await ExtractionService.update_element_image(
        element_id=req.element_id,
        volc_asset_id=asset_id,
        volc_asset_uri=asset_uri,
        volc_asset_status="Processing",
        volc_asset_group_id=group_id,
    )

    return {
        "success": True,
        "asset_id": asset_id,
        "asset_uri": asset_uri,
        "group_id": group_id,
        "status": "Processing",
        "message": "已提交火山审核,稍等约 1-3 分钟变 Active 即可用于视频生成",
    }


# v3.61.158 codex P2: variant 独立加白入库
class VolcVariantUploadRequest(BaseModel):
    variant_id: int
    ak: str
    sk: str
    project_name: str = "default"


@router.post("/volc/asset/upload-variant")
async def upload_volc_variant_asset(req: VolcVariantUploadRequest):
    """为某 character_variant 加白入库 — 跟 /volc/asset/upload 同源,数据源换 variant.finished_image
    写回 character_variants.volc_asset_* 字段。
    """
    from services.volc_asset_service import (
        create_asset_group, create_asset, upload_image_to_admin_temp,
    )
    from services.extraction_service import ExtractionService

    variant = await ExtractionService.get_variant(req.variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail=f"马甲 id={req.variant_id} 不存在")
    finished_image = variant.get("finished_image") or variant.get("image_url")
    if not finished_image:
        raise HTTPException(status_code=400, detail="该马甲没有成品图/生成图,无法加白")

    ak = req.ak.strip()
    sk = req.sk.strip()
    project = (req.project_name or "default").strip()
    if not ak or not sk:
        raise HTTPException(status_code=400, detail="AK/SK 不能为空")

    try:
        public_url = await upload_image_to_admin_temp(finished_image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传图片到 admin 失败: {e}")

    # 每个 variant 独立 group(组名带 variant_id,跟 element-level 不冲突)
    group_name = f"el-character-variant-{req.variant_id}"
    desc = f"auto-whitelist asset for variant {req.variant_id}"
    stored_group_id = variant.get("volc_asset_group_id")
    group_id = stored_group_id

    def _is_group_not_found(err: Exception) -> bool:
        msg = str(err)
        return ("NotFound.group_id" in msg) or ("asset_group" in msg and "not found" in msg)

    if not group_id:
        try:
            group_id = await create_asset_group(group_name, desc, project, ak, sk)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"创建素材组失败: {e}")

    asset_name_safe = f"variant-{req.variant_id}"
    try:
        asset_id = await create_asset(group_id, public_url, project, ak, sk,
                                       asset_type="Image", name=asset_name_safe)
    except Exception as e:
        if stored_group_id and _is_group_not_found(e):
            try:
                await ExtractionService.update_variant(req.variant_id, volc_asset_group_id=None)
            except Exception:
                pass
            try:
                group_id = await create_asset_group(group_name, desc, project, ak, sk)
            except Exception as ce:
                raise HTTPException(status_code=500, detail=f"重建素材组失败: {ce}")
            try:
                asset_id = await create_asset(group_id, public_url, project, ak, sk,
                                               asset_type="Image", name=asset_name_safe)
            except Exception as ce:
                raise HTTPException(status_code=500, detail=f"创建素材失败(重试后): {ce}")
        else:
            raise HTTPException(status_code=500, detail=f"创建素材失败: {e}")

    asset_uri = f"asset://{asset_id}"
    await ExtractionService.update_variant(
        req.variant_id,
        volc_asset_id=asset_id,
        volc_asset_uri=asset_uri,
        volc_asset_status="Processing",
        volc_asset_group_id=group_id,
    )

    return {
        "success": True,
        "asset_id": asset_id,
        "asset_uri": asset_uri,
        "group_id": group_id,
        "status": "Processing",
        "message": "已提交火山审核,1-3 分钟后变 Active 可用",
    }


class VolcVariantStatusRequest(BaseModel):
    variant_id: int
    ak: str
    sk: str
    project_name: str = "default"


@router.post("/volc/asset/variant-status")
async def get_volc_variant_status(req: VolcVariantStatusRequest):
    """轮询 variant 加白状态(Processing→Active)— 跟 /volc/asset/status 同源,数据源换 variant"""
    from services.volc_asset_service import get_asset
    from services.extraction_service import ExtractionService

    variant = await ExtractionService.get_variant(req.variant_id)
    if not variant:
        raise HTTPException(404, "马甲不存在")
    asset_id = variant.get("volc_asset_id")
    if not asset_id:
        return {"success": True, "status": None, "message": "未加白"}

    project = (req.project_name or "default").strip()
    try:
        info = await get_asset(int(asset_id), project, req.ak.strip(), req.sk.strip())
    except Exception as e:
        logger.warning(f"[volc-asset/variant-status] variant={req.variant_id} 查询失败: {e}")
        raise HTTPException(500, f"查询素材状态失败: {e}")

    status = info.get("Status", "")
    _old = variant.get("volc_asset_status")
    if status:
        if status != _old:
            logger.info(
                f"[volc-asset/variant-status] variant={req.variant_id} {_old}→{status} asset={asset_id}"
            )
        await ExtractionService.update_variant(req.variant_id, volc_asset_status=status)
    return {
        "success": True,
        "asset_id": asset_id,
        "status": status,
        "create_time": info.get("CreateTime"),
        "update_time": info.get("UpdateTime"),
    }


class VolcLastFrameUploadRequest(BaseModel):
    storyboard_id: int
    ak: str
    sk: str
    project_name: str = "default"


@router.post("/volc/asset/upload-last-frame")
async def upload_volc_last_frame(req: VolcLastFrameUploadRequest):
    """v3.61.112: 为某分镜的尾帧加白入库 — 解决"串行尾帧过不了 Deepfake"

    跟 /volc/asset/upload(角色版)同源,只是数据源从 extracted_elements.finished_image
    换成 storyboards.last_frame_path,写回字段是 storyboards.last_frame_volc_asset_*
    """
    from services.volc_asset_service import (
        create_asset_group, create_asset, upload_image_to_admin_temp,
    )
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, last_frame_path, last_frame_volc_asset_group_id, "
            "       last_frame_volc_asset_id, last_frame_volc_asset_status "
            "FROM storyboards WHERE id = ?",
            (req.storyboard_id,),
        )
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"分镜 id={req.storyboard_id} 不存在")
    last_frame_path = row["last_frame_path"]
    if not last_frame_path:
        raise HTTPException(status_code=400, detail="该分镜没有尾帧,无法加白")
    # 已 Active 的不重复加白
    if row["last_frame_volc_asset_status"] == "Active" and row["last_frame_volc_asset_id"]:
        return {
            "success": True,
            "asset_id": row["last_frame_volc_asset_id"],
            "asset_uri": f"asset://{row['last_frame_volc_asset_id']}",
            "status": "Active",
            "message": "已加白,跳过",
        }

    project = (req.project_name or "default").strip()
    ak = req.ak.strip()
    sk = req.sk.strip()
    if not ak or not sk:
        raise HTTPException(status_code=400, detail="AK/SK 不能为空")

    # 1. 上传图片(走 v3.61.109 优先 OSS + 压缩链)
    try:
        public_url = await upload_image_to_admin_temp(last_frame_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传尾帧图片失败: {e}")

    # 2. 取/建素材组
    group_name = f"last-frame-sb-{req.storyboard_id}"
    desc = f"千山漫剧 自动尾帧加白 - storyboard_id={req.storyboard_id}"
    stored_group_id = row["last_frame_volc_asset_group_id"]
    group_id = stored_group_id
    if not group_id:
        try:
            group_id = await create_asset_group(group_name, desc, project, ak, sk)
            logger.info(f"[volc-asset/last-frame] sb={req.storyboard_id} 新建组 {group_id}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"创建素材组失败: {e}")

    # 3. CreateAsset(NotFound.group_id 自动重建一次)
    def _is_group_not_found(err: Exception) -> bool:
        msg = str(err)
        return ("NotFound.group_id" in msg) or ("asset_group" in msg and "not found" in msg)

    try:
        asset_id = await create_asset(group_id, public_url, project, ak, sk,
                                       asset_type="Image",
                                       name=f"last-frame-{req.storyboard_id}")
    except Exception as e:
        if stored_group_id and _is_group_not_found(e):
            logger.warning(f"[volc-asset/last-frame] 旧 group={stored_group_id} 失效,重建: {e}")
            try:
                group_id = await create_asset_group(group_name, desc, project, ak, sk)
            except Exception as ce:
                raise HTTPException(status_code=500, detail=f"重建素材组失败: {ce}")
            try:
                asset_id = await create_asset(group_id, public_url, project, ak, sk,
                                               asset_type="Image",
                                               name=f"last-frame-{req.storyboard_id}")
            except Exception as ce:
                logger.warning(f"[volc-asset/last-frame] CreateAsset 重试后仍失败 sb={req.storyboard_id}: {ce}")
                raise HTTPException(status_code=500, detail=f"尾帧加白失败(重试后): {ce}")
        else:
            logger.warning(f"[volc-asset/last-frame] CreateAsset 失败 sb={req.storyboard_id}: {e}")
            raise HTTPException(status_code=500, detail=f"尾帧加白失败: {e}")

    asset_uri = f"asset://{asset_id}"

    # 4. 写回 storyboards
    db = await get_db()
    try:
        await db.execute(
            "UPDATE storyboards SET "
            "last_frame_volc_asset_id = ?, last_frame_volc_asset_uri = ?, "
            "last_frame_volc_asset_status = ?, last_frame_volc_asset_group_id = ? "
            "WHERE id = ?",
            (asset_id, asset_uri, "Processing", group_id, req.storyboard_id),
        )
        await db.commit()
    finally:
        await db.close()

    logger.info(f"[volc-asset/last-frame] sb={req.storyboard_id} 加白提交成功 {asset_uri}")
    return {
        "success": True,
        "asset_id": asset_id,
        "asset_uri": asset_uri,
        "group_id": group_id,
        "status": "Processing",
        "message": "尾帧已提交火山审核,约 1-3 分钟变 Active",
    }


class VolcLastFrameStatusRequest(BaseModel):
    storyboard_id: int
    ak: str
    sk: str
    project_name: str = "default"


@router.post("/volc/asset/last-frame-status")
async def get_volc_last_frame_status(req: VolcLastFrameStatusRequest):
    """轮询某分镜尾帧的素材状态,Active 后回写 DB"""
    from services.volc_asset_service import get_asset
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT last_frame_volc_asset_id, last_frame_volc_asset_status "
            "FROM storyboards WHERE id = ?",
            (req.storyboard_id,),
        )
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"分镜 id={req.storyboard_id} 不存在")
    asset_id = row["last_frame_volc_asset_id"]
    if not asset_id:
        raise HTTPException(status_code=400, detail="该分镜尾帧未加白")

    project = (req.project_name or "default").strip()
    try:
        info = await get_asset(asset_id, project, req.ak.strip(), req.sk.strip())
    except Exception as e:
        logger.warning(f"[volc-asset/last-frame-status] sb={req.storyboard_id} 查询失败: {e}")
        raise HTTPException(status_code=500, detail=f"查询火山素材失败: {e}")

    status = info.get("Status", "")
    _old = row["last_frame_volc_asset_status"]
    if status:
        if status != _old:
            logger.info(
                f"[volc-asset/last-frame-status] sb={req.storyboard_id} {_old}→{status} asset={asset_id}"
            )
        db = await get_db()
        try:
            await db.execute(
                "UPDATE storyboards SET last_frame_volc_asset_status = ? WHERE id = ?",
                (status, req.storyboard_id),
            )
            await db.commit()
        finally:
            await db.close()
    return {
        "success": True,
        "asset_id": asset_id,
        "status": status,
        "create_time": info.get("CreateTime"),
        "update_time": info.get("UpdateTime"),
    }


@router.post("/volc/asset/status")
async def get_volc_asset_status(req: VolcAssetStatusRequest):
    """轮询某 element 的素材状态,Active 后更新本地 DB"""
    from services.volc_asset_service import get_asset
    from services.extraction_service import ExtractionService

    element = await ExtractionService.get_element(req.asset_id)
    if not element:
        raise HTTPException(status_code=404, detail=f"元素 id={req.asset_id} 不存在")
    asset_id = element.get("volc_asset_id")
    if not asset_id:
        raise HTTPException(status_code=400, detail="该元素还未加白,无 asset_id")

    project = (req.project_name or "default").strip()
    try:
        info = await get_asset(asset_id, project, req.ak.strip(), req.sk.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询火山素材状态失败: {e}")

    status = info.get("Status", "")
    # 同步本地
    if status:
        await ExtractionService.update_element_image(
            element_id=req.asset_id,
            volc_asset_status=status,
        )
    return {
        "success": True,
        "asset_id": asset_id,
        "status": status,
        "create_time": info.get("CreateTime"),
        "update_time": info.get("UpdateTime"),
    }
