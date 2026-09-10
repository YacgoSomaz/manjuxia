import os
import time
import asyncio
import json
import base64
import logging
import re
import secrets  # v3.61.202:原子写 tmp 文件名加随机 token,防并发抢同一 tmp
from urllib.parse import urlparse
from io import BytesIO
from typing import Optional, List, Literal, Any
import httpx
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel
from PIL import Image, ImageOps, UnidentifiedImageError

# v3.61.165: 修 create_character_variant / _safe_remove_file 等用了 logger 但模块顶部没 import 导致
#             "name 'logger' is not defined" 致命 500 错(用户 v3.61.163/164 新建马甲全挂)
logger = logging.getLogger(__name__)
from models.extraction import (
    ExtractionRequest,
    OfficialExtractionPromptRequest,
    OfficialExtractionResultRequest,
    ExtractedElementCreate,
    ExtractedElementUpdate,
    ExtractedElementResponse,
    GenerateImageRequest,
    BatchGenerateImageRequest,
    ImageStyleSetting,
    ImageStyleSettingResponse,
    GenerateGridImageRequest,
    CharacterVariantCreate,
    CharacterVariantUpdate,
    CharacterVariantResponse,
    SetActiveVariantRequest,
)
from services.extraction_service import ExtractionService
from services.image_service import ImageService
from services.novel_service import NovelService
from services.template_service import get_by_id as get_template_by_id
from database.db import get_db
from utils.paths import get_data_dir, media_subdir, resolve_db_path

router = APIRouter(prefix="/api/extraction", tags=["extraction"])

# 全景生成是长请求。浏览器刷新会丢掉前端临时状态，但后端请求仍会继续执行；
# 用进程内注册表把真实运行状态注入元素查询结果。桌面端后端为单进程，进程重启时
# 请求本身也会终止，因此这里不落永久状态，避免崩溃后留下永远转圈的脏数据。
_running_panorama_generations: dict[int, dict] = {}

# 批量全景/宫格必须脱离前端页面生命周期运行。刷新或切菜单后，前端通过
# batch/status 重新订阅；停止只阻止派发后续项，当前图片请求自然收尾。
_extraction_batch_jobs: dict[str, dict[str, Any]] = {}
_extraction_batch_tasks: dict[str, asyncio.Task] = {}


class ExtractionBatchStartRequest(BaseModel):
    novel_id: int
    action: Literal["panorama", "grid"]
    element_type: Literal["scene", "prop"]
    element_ids: List[int]
    config_id: int
    template_id: Optional[int] = None
    llm_config_id: Optional[int] = None


class OfficialImageResultRequest(BaseModel):
    """Authenticated desktop bridge payload for a completed official image job."""
    image_url: str
    image_prompt: Optional[str] = None


class OfficialImageStatusRequest(BaseModel):
    """State bridge for a desktop-owned official image job.

    The official job itself runs in Electron, rather than ImageService.  The
    normal card refresh loop still reads ``image_status`` from this backend,
    so it needs this small, explicit state hand-off while the remote job runs.
    """
    status: Literal["generating", "error"]


_OFFICIAL_IMAGE_DELIVERY_HOSTS = {
    "imgcdn.aicodeme.cn",
    # Official results are copied once from the provider CDN into OSS.  The
    # desktop downloads from this signed OSS URL, so a user's inability to
    # reach the provider CDN no longer turns a completed job into FAILED.
    "software-update0012.oss-cn-guangzhou.aliyuncs.com",
}


async def _download_official_image(raw_url: str) -> bytes:
    """Download an official CDN result without inheriting desktop proxy state.

    Proxy/VPN programs commonly leave HTTP(S)_PROXY variables behind.  The
    Chromium renderer can still open the CDN while httpx follows those stale
    variables and fails, which previously turned a completed official job into
    a FAILED card.  Use a direct connection and retry short-lived CDN races.
    """
    last_error: Exception | None = None
    headers = {
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "ManJuXia/0.1.37 official-image-downloader",
    }
    for attempt, delay in enumerate((0, 2, 5), start=1):
        if delay:
            await asyncio.sleep(delay)
        try:
            timeout = httpx.Timeout(300.0, connect=30.0)
            async with httpx.AsyncClient(
                timeout=timeout,
                follow_redirects=False,
                trust_env=False,
                headers=headers,
            ) as client:
                response = await client.get(raw_url)
            if response.status_code == 200 and response.content:
                return response.content
            last_error = RuntimeError(f"CDN HTTP {response.status_code}")
        except Exception as exc:
            last_error = exc
        logger.warning(
            "下载官方图片重试 host=%s attempt=%s error=%s",
            (urlparse(raw_url).hostname or "").lower(),
            attempt,
            type(last_error).__name__ if last_error else "empty_response",
        )
    raise RuntimeError("下载官方图片失败") from last_error


def _public_batch_job(job: dict[str, Any]) -> dict[str, Any]:
    element_ids = list(job.get("element_ids") or [])
    success_ids = list(job.get("success_ids") or [])
    failed_ids = list(job.get("failed_ids") or [])
    processed_ids = set(success_ids) | set(failed_ids)
    current_id = job.get("current_element_id")
    remaining_ids = [item_id for item_id in element_ids if item_id not in processed_ids and item_id != current_id]
    return {
        "job_id": job.get("job_id"),
        "novel_id": job.get("novel_id"),
        "action": job.get("action"),
        "element_type": job.get("element_type"),
        "status": job.get("status"),
        "total": len(element_ids),
        "current": len(processed_ids),
        "current_element_id": current_id,
        "current_name": job.get("current_name") or "",
        "success": len(success_ids),
        "failed": len(failed_ids),
        "element_ids": element_ids,
        "success_ids": success_ids,
        "failed_ids": failed_ids,
        "remaining_ids": remaining_ids,
        "failures": list(job.get("failures") or []),
        "stop_requested": bool(job.get("stop_requested")),
        "started_at": job.get("started_at"),
        "finished_at": job.get("finished_at"),
    }


def _active_batch_for_novel(novel_id: int) -> Optional[dict[str, Any]]:
    candidates = [
        job for job in _extraction_batch_jobs.values()
        if int(job.get("novel_id") or 0) == int(novel_id)
        and job.get("status") in ("running", "stopping")
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda job: float(job.get("started_ts") or 0))


async def _run_extraction_batch(job_id: str) -> None:
    job = _extraction_batch_jobs[job_id]
    try:
        for element_id in list(job["element_ids"]):
            if job.get("stop_requested"):
                break

            element = await ExtractionService.get_element(element_id)
            job["current_element_id"] = element_id
            job["current_name"] = (element or {}).get("name") or f"元素 {element_id}"
            try:
                if not element or int(element.get("novel_id") or 0) != int(job["novel_id"]):
                    raise HTTPException(status_code=404, detail="元素不存在或不属于当前小说")

                if job["action"] == "panorama":
                    if element.get("element_type") != "scene":
                        raise HTTPException(status_code=400, detail="批量全景只支持场景元素")
                    panorama_result = await generate_panorama_endpoint(
                        element_id,
                        GeneratePanoramaRequest(config_id=job["config_id"]),
                    )
                    if not panorama_result.get("success"):
                        raise HTTPException(status_code=500, detail=panorama_result.get("message") or "全景图生成失败")
                    grid_result = await panorama_to_grid_endpoint(
                        element_id,
                        PanoramaToGridRequest(view_count=9),
                    )
                    if not grid_result.get("success"):
                        raise HTTPException(status_code=500, detail=grid_result.get("message") or "拆 9 视图失败")
                else:
                    grid_result = await generate_grid_image(
                        element_id,
                        GenerateGridImageRequest(
                            config_id=job["config_id"],
                            template_id=job["template_id"],
                            llm_config_id=job["llm_config_id"],
                        ),
                    )
                    if not grid_result.get("success"):
                        raise HTTPException(status_code=500, detail=grid_result.get("message") or "宫格图生成失败")

                job["success_ids"].append(element_id)
            except HTTPException as exc:
                job["failed_ids"].append(element_id)
                job["failures"].append(f"{job['current_name']}: {exc.detail}")
            except Exception as exc:
                logger.exception("[extraction-batch] item failed job=%s element=%s", job_id, element_id)
                job["failed_ids"].append(element_id)
                job["failures"].append(f"{job['current_name']}: {exc}")
            finally:
                job["current_element_id"] = None
                job["current_name"] = ""

        if job.get("stop_requested"):
            job["status"] = "stopped"
        else:
            job["status"] = "completed"
    except asyncio.CancelledError:
        job["status"] = "stopped"
        job["stop_requested"] = True
        raise
    except Exception as exc:
        logger.exception("[extraction-batch] runner failed job=%s", job_id)
        job["status"] = "failed"
        job["failures"].append(f"批次异常: {exc}")
    finally:
        job["finished_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        job["current_element_id"] = None
        job["current_name"] = ""
        _extraction_batch_tasks.pop(job_id, None)


@router.post("/batch/start")
async def start_extraction_batch(request: ExtractionBatchStartRequest):
    await _ensure_novel_visible(request.novel_id)
    active = _active_batch_for_novel(request.novel_id)
    if active:
        raise HTTPException(status_code=409, detail="该小说已有批量任务在运行，请先等待或停止后续")

    element_ids = list(dict.fromkeys(int(item_id) for item_id in request.element_ids if int(item_id) > 0))
    if not element_ids:
        raise HTTPException(status_code=400, detail="没有可执行的卡片")
    if request.action == "grid" and (not request.template_id or not request.llm_config_id):
        raise HTTPException(status_code=400, detail="批量宫格必须选择提示词模板和视觉大语言模型")
    if request.action == "grid" and (
        int(request.llm_config_id or 0) in (-900001, -900002)
        or int(request.config_id or 0) in (-900001, -900002)
    ):
        raise HTTPException(
            status_code=409,
            detail="批量宫格暂不支持官方算力，请选择本地大语言模型和图片模型配置",
        )
    if request.action == "panorama" and request.element_type != "scene":
        raise HTTPException(status_code=400, detail="批量全景只支持场景卡片")

    # 启动前一次性验证归属和基础条件，避免任务进后台后才发现整批参数错误。
    for element_id in element_ids:
        element = await ExtractionService.get_element(element_id)
        if not element or int(element.get("novel_id") or 0) != int(request.novel_id):
            raise HTTPException(status_code=404, detail=f"元素 {element_id} 不存在或不属于当前小说")
        if request.action == "panorama" and element.get("element_type") != "scene":
            raise HTTPException(status_code=400, detail="批量全景只支持场景卡片")
        if request.action == "grid" and element.get("element_type") != request.element_type:
            raise HTTPException(status_code=400, detail="批量宫格卡片类型不一致")
        if request.action == "grid" and not (element.get("finished_image") or element.get("image_url")):
            raise HTTPException(status_code=400, detail=f"{element.get('name') or element_id} 没有成品图或生成图")

    job_id = secrets.token_hex(12)
    job: dict[str, Any] = {
        "job_id": job_id,
        "novel_id": request.novel_id,
        "action": request.action,
        "element_type": request.element_type,
        "element_ids": element_ids,
        "config_id": request.config_id,
        "template_id": request.template_id,
        "llm_config_id": request.llm_config_id,
        "status": "running",
        "stop_requested": False,
        "current_element_id": None,
        "current_name": "",
        "success_ids": [],
        "failed_ids": [],
        "failures": [],
        "started_ts": time.time(),
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "finished_at": None,
    }
    _extraction_batch_jobs[job_id] = job
    task = asyncio.create_task(_run_extraction_batch(job_id))
    _extraction_batch_tasks[job_id] = task
    return {"success": True, "job": _public_batch_job(job)}


@router.get("/batch/active")
async def get_active_extraction_batch(novel_id: int = Query(...)):
    await _ensure_novel_visible(novel_id)
    job = _active_batch_for_novel(novel_id)
    return {"job": _public_batch_job(job) if job else None}


@router.get("/batch/{job_id}")
async def get_extraction_batch(job_id: str):
    job = _extraction_batch_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="批量任务不存在或后端已重启")
    await _ensure_novel_visible(int(job["novel_id"]))
    return {"job": _public_batch_job(job)}


@router.post("/batch/{job_id}/stop")
async def stop_extraction_batch(job_id: str):
    job = _extraction_batch_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="批量任务不存在或后端已重启")
    await _ensure_novel_visible(int(job["novel_id"]))
    if job.get("status") in ("running", "stopping"):
        job["stop_requested"] = True
        job["status"] = "stopping"
    return {"success": True, "job": _public_batch_job(job)}


def _is_panorama_generating(element_id: int) -> bool:
    return int(element_id) in _running_panorama_generations


def _attach_panorama_runtime_status(element: dict, active_before_query: Optional[set[int]] = None) -> dict:
    element_id = int(element.get("id") or 0)
    # 同时看查询前快照和查询后的实时值：若任务恰好在 DB 查询期间完成，快照仍会
    # 让前端多轮询一次，从而拿到刚落库的 panorama_url，不会卡在旧列表结果。
    element["panorama_generating"] = (
        element_id in (active_before_query or set())
        or _is_panorama_generating(element_id)
    )
    return element


class PolishDescriptionRequest(BaseModel):
    instruction: str = ""
    current_description: Optional[str] = None
    llm_config_id: Optional[int] = None


async def _ensure_novel_visible(novel_id: int) -> None:
    if not await NovelService.get_by_id(novel_id):
        raise HTTPException(status_code=404, detail="小说不存在或不属于当前账号")


async def _ensure_element_visible(element_id: int) -> dict:
    element = await ExtractionService.get_element(element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    if not await NovelService.get_by_id(element.get("novel_id")):
        raise HTTPException(status_code=404, detail="元素不存在或不属于当前账号")
    return element


async def _ensure_variant_visible(variant_id: int) -> dict:
    variant = await ExtractionService.get_variant(variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="马甲不存在")
    await _ensure_element_visible(variant.get("element_id"))
    return variant


def _is_recent_image_generation(element: dict, max_age_seconds: int = 45 * 60) -> bool:
    """Return True when an element is already in a fresh image generation run."""
    if element.get("image_status") != "generating":
        return False
    if element.get("image_url") or element.get("finished_image"):
        return False

    ts = element.get("updated_at") or element.get("created_at")
    if not ts:
        return True
    try:
        parsed = time.strptime(str(ts)[:19], "%Y-%m-%d %H:%M:%S")
        return (time.time() - time.mktime(parsed)) < max_age_seconds
    except Exception:
        return True


def _fill_template_placeholders(template: str, element_type: str, description: str) -> str:
    """把 prefix 模板里的 {角色信息}/{场景信息}/{道具信息} 占位符替换为 description。
    若模板里没占位符,在开头拼 description(兼容旧风格设置)。
    """
    placeholder_map = {
        "character": "{角色信息}",
        "scene": "{场景信息}",
        "prop": "{道具信息}",
    }
    ph = placeholder_map.get(element_type, "")
    if ph and ph in template:
        return template.replace(ph, description)
    # 兼容:旧风格设置里没占位符,就走原 prefix + description 拼接
    return template + "\n" + description if template else description


LEGACY_DENOISE_BLOCK = """【真实质感 · 降噪(反 AI 塑料感)】
This image is a film still captured during a real shoot - it should appear slightly soft and imperfect like a real photograph, this softness is intentional and desired. Soft natural lighting with realistic falloff, not punchy HDR. Subtle organic film grain only, NOT heavy digital noise, NOT artificial grain overlay. Skin texture must be natural with visible pores and imperfections, NO plastic smoothing, NO beauty-filter aesthetic. Materials should look photographically captured, not 3D-rendered or AI-stylized. Slightly soft focus character with natural lens DOF, NOT digitally tack-sharp. Colors with realistic restraint, slight gray tone, NOT oversaturated, NOT HDR-pumped.
Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, beauty-filter skin, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default model aesthetic bias."""

PREVIOUS_DENOISE_BLOCK = """【真实质感 · 通用降噪 · 反 AI 塑料感】

The image should feel naturally produced within its chosen visual style, with believable material texture, soft and restrained lighting, and no over-polished AI look. Keep the overall image slightly soft, organic, and visually coherent, not digitally over-sharpened.

Use natural light falloff, gentle contrast, realistic shadow transitions, and restrained colors with a slight gray cinematic tone. Avoid punchy HDR, excessive saturation, glossy highlight blowout, or artificial studio perfection.

Skin, fabric, hair, metal, wood, stone, and other materials should have clear but natural texture. Skin should not look plastic, waxy, airbrushed, or beauty-filtered. Fabric should show believable weave, folds, thickness, and weight. Hair should have natural strand structure, not helmet-like or overly smooth.

For 3D realistic / cinematic style: make it feel like a real photographed subject with subtle lens depth of field, slight optical softness, and natural imperfections.

For 3D Chinese animation style: keep the stylized character design, but materials, lighting, skin, hair, and clothing should have believable physical texture and avoid game-render plastic, cheap CG gloss, or overly smooth surfaces.

For 2D Chinese animation style: keep clean 2D line art and painted surfaces, but avoid flat generic AI coloring, excessive digital sharpness, over-smooth gradients, fake texture overlays, and overly glossy highlights. The image should feel hand-crafted, layered, and naturally painted.

Subtle organic grain or texture is allowed only when it fits the chosen style. Do not add heavy digital noise, artificial grain overlay, dirty compression artifacts, or random speckles.

Avoid: oversharpening, artificial sharpness, punchy HDR, heavy digital grain, fake noise overlay, beauty-filter skin, plastic smoothing, waxy skin, glossy CG highlights, oversaturation, overexposed highlights, cheap game-render look, generic AI image quality, default model aesthetic bias, over-polished studio look, flat lifeless coloring."""

DENOISE_BLOCK = """画面风格要求:
柔焦边缘,克制的细节表达,
大色块优先
材质统一干净,避免堆砌细碎纹理,整体通透高级。参考电影摄影质感:浅景深柔光、自然胶片颗粒、Kodak Portra 400 色调,像一张精心打光的电影剧照,而不是高清数码照片。"""


def _normalize_style_prompt(prompt: str) -> str:
    text = (prompt or "").replace("\r\n", "\n")
    if not text:
        return text
    # Remove only the exact system-injected style blocks. User-authored visual
    # style content remains untouched.
    for block in (DENOISE_BLOCK, PREVIOUS_DENOISE_BLOCK, LEGACY_DENOISE_BLOCK):
        text = text.replace(block, "")
    return re.sub(r"\n{3,}", "\n\n", text).strip()


# 后端兜底默认模板:用户没在前端打开过"风格设置"对话框时,
# 生成图片不会无风格(出图变成纯描述,效果差)
# 与前端 ExtractionView.vue 的默认模板保持等价。人物默认走通用三视图。
DEFAULT_STYLE_TEMPLATES = {
    "character": """古装电视剧剧照,真人电影级写实摄影

【角色信息】
{角色信息}

【一致性约束·必须严格遵守】
所有视图中的角色为同一人,面部骨骼结构、眼型、鼻梁、唇形、脸型完全一致;
表情图中的每张脸与正视图面部特征 100% 相同,仅表情肌肉变化;
全图同一套光影逻辑、色温、透视角度,无风格突变;
色彩严格统一,无色偏,肤色/发色/服色与角色设定完全匹配。

【视图排布·按编号顺序排列在 16:9 画布内】
• 面部极致正视特写 左侧1/3
• 全身正视图
• 全身背视图
• 全身侧视图

背景白底,不拿任何道具
""",
    "scene": """场景背景图,不要出现人物。

【视觉风格】


【场景信息】
{场景信息}

【画质要求】
4K 高精度渲染,320DPI,无噪点无模糊无畸变,色彩还原准确
""",
    "prop": """【视觉风格】


【道具信息】
{道具信息}

【画质要求】
4K 高精度渲染,320DPI,纯白/浅灰底版,无噪点无模糊无畸变,主体清晰无遮挡
""",
}


# v3.61.63: 场景生图运行时强制约束 — 不论用户 prefix 怎么改,scene 类型 prompt 都必须含"不要出现人物"
#   原因:场景图夹带人物会导致后续视频生成时人物风格/服装错位,严重影响视频质量
#   逻辑:如果 prompt 里已经有"不要出现人物" / "no human" / "no people" 等关键字,不重复注入
SCENE_NO_HUMAN_CONSTRAINT = "场景背景图,不要出现人物。"
_SCENE_NO_HUMAN_KEYWORDS = ("不要出现人物", "不要人物", "no human", "no people", "without people", "no person")

def _ensure_scene_no_human(prompt: str, element_type: str) -> str:
    """如果是场景生图,顶部强制注入'不要出现人物'约束(已有则不重复)"""
    if element_type != "scene":
        return prompt
    pl = (prompt or "").lower()
    if any(k in pl for k in _SCENE_NO_HUMAN_KEYWORDS):
        return prompt
    return f"{SCENE_NO_HUMAN_CONSTRAINT}\n\n{prompt}"


def _clean_polished_description(text: str) -> str:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    for prefix in (
        "润色后：", "润色后:", "优化后：", "优化后:",
        "人物描述：", "人物描述:", "场景描述：", "场景描述:",
    ):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    return cleaned.strip().strip('"').strip("'").strip()


def _build_description_polish_messages(
    element_type: str,
    element_name: str,
    description: str,
    instruction: str = "",
) -> List[dict]:
    if element_type == "scene":
        default_instruction = (
            "在不改变原地点、时代、内外景、时段和剧情用途的前提下，重点增强空间层次、"
            "环境材质、光影色温、天气空气感与可见的叙事氛围，让场景更精致、更有纵深。"
        )
        system_prompt = (
            "你是资深影视美术指导、场景概念设计师和 AI 场景提示词优化师。"
            "任务是润色场景描述，供 AI 生成纯场景环境图、全景图和多视角图使用。\n"
            "要求：\n"
            "1. 只输出润色后的最终场景描述，不要解释、不要标题、不要 Markdown，也不要重复输出场景名。\n"
            "2. 严格保留原场景的地点、时代、内外景、时段、季节天气、剧情功能、空间结构、出入口和关键固定物，"
            "不得擅自换地点、换时代或改变用途。\n"
            "3. 优先补强前景、中景、远景的空间层次与动线，再补建筑、地面、墙面、家具陈设、植被等材质细节和真实使用痕迹。\n"
            "4. 明确主光源与辅光源、方向、冷暖色温、明暗关系，并用薄雾、雨丝、尘埃、倒影、树影、帘幕等"
            "符合原设定的可见环境证据营造氛围；不要只堆砌“唯美、高级、氛围感”等空泛形容词。\n"
            "5. 必须是无人纯场景空镜：禁止出现人物、角色、人体、肢体、人脸、人影、剪影或人群。\n"
            "6. 不添加镜头运动、分镜编号、对白、字幕、文字、水印、品牌，也不重复全局画风模板。\n"
            "7. 输出中文自然段或逗号分隔短句，信息密度高、画面可执行，建议控制在 120～260 个汉字。"
        )
        label = "场景"
    else:
        default_instruction = "在不改变角色身份、年龄段、时代背景和核心设定的前提下，让人物形象描述更适合 AI 生图。"
        system_prompt = (
            "你是影视角色视觉设定助手。任务是润色人物提示词描述，供 AI 生成人物图使用。\n"
            "要求：\n"
            "1. 只输出润色后的最终人物描述，不要解释、不要标题、不要 Markdown。\n"
            "2. 保留角色姓名、性别、年龄段、身份、时代背景、服装类型和核心气质，不要改成人设。\n"
            "3. 根据用户补充要求增强外貌、身材、气质、服装质感、五官、发型、姿态等视觉细节。\n"
            "4. 不要加入情色、裸露、未成年人性化、血腥暴力或与原设定冲突的内容。\n"
            "5. 输出应是中文自然段或逗号分隔短句，适合作为人物描述字段保存。"
        )
        label = "角色"

    user_instruction = (instruction or "").strip() or default_instruction
    return [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "user",
            "content": (
                f"{label}名：{element_name or f'未命名{label}'}\n\n"
                f"当前{label}描述：\n{description}\n\n"
                f"用户润色要求：\n{user_instruction}\n\n"
                f"请输出润色后的完整{label}描述。"
            ),
        },
    ]


@router.get("/element/{element_id}/full-prompt")
async def get_element_full_prompt(element_id: int, variant_id: Optional[int] = None):
    """返回拼好的完整提示词。
    用户在风格设置里存的 prefix_prompt 是完整模板(带 {角色信息}/{场景信息}/{道具信息} 占位符),
    这里把占位符替换成 description,再追加 suffix(如有)。

    v3.61.158 round8: 支持 ?variant_id=N — 用 variant.description(空则 fallback element.description)
    """
    element = await _ensure_element_visible(element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")

    # 优先用 variant.description(给马甲复制提示词用)
    description = ""
    if variant_id:
        variant = await ExtractionService.get_variant(variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail="马甲不存在")
        if variant.get("element_id") != element_id:
            raise HTTPException(status_code=400, detail="马甲不属于该元素")
        description = (variant.get("description") or "").strip()
    if not description:
        description = (element.get("description") or "").strip()
    if not description:
        return {"success": False, "message": "元素和马甲都没有描述", "prompt": ""}

    element_type = element.get("element_type")
    style = await ExtractionService.get_image_style(
        element.get("novel_id"), element_type
    )
    prefix = _normalize_style_prompt((style.get("prefix_prompt") or "").strip())
    suffix = (style.get("suffix_prompt") or "").strip()

    prompt = _fill_template_placeholders(prefix, element_type, description) if prefix else description
    if suffix:
        prompt += "\n" + suffix
    # v3.61.63: 场景生图运行时注入"不要出现人物"约束,预览跟实际生图一致
    prompt = _ensure_scene_no_human(prompt, element_type)
    return {"success": True, "prompt": prompt}


@router.post("/element/{element_id}/official-image-status")
async def set_official_image_status(element_id: int, request: OfficialImageStatusRequest):
    """Keep the native extraction card in sync with an Electron official job."""
    element = await _ensure_element_visible(element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    await ExtractionService.update_element_image(
        element_id=element_id,
        image_status=request.status,
    )
    return {"success": True, "image_status": request.status}


@router.post("/extract")
async def extract_elements(request: ExtractionRequest):
    """启动信息提取"""
    await _ensure_novel_visible(request.novel_id)
    try:
        result = await ExtractionService.extract_all(
            novel_id=request.novel_id,
            element_type=request.element_type,
            template_id=request.template_id,
            llm_config_id=request.llm_config_id,
            chapter_ids=request.chapter_ids
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/official-prompt")
async def build_official_extraction_prompt(request: OfficialExtractionPromptRequest):
    """在本地展开提取模板，交由开发环境官方语言算力执行。"""
    await _ensure_novel_visible(request.novel_id)
    if request.element_type not in {"character", "scene", "prop"}:
        raise HTTPException(status_code=400, detail="不支持的提取类型")
    template = await get_template_by_id(request.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    chapters = await NovelService.get_chapters(request.novel_id)
    selected = {int(item) for item in (request.chapter_ids or [])}
    chapters = [item for item in chapters if not selected or int(item.get("id")) in selected]
    if not chapters:
        raise HTTPException(status_code=400, detail="没有可处理的章节")
    db = await get_db()
    try:
        parts = []
        chapter_ids = []
        missing = []
        for chapter in chapters:
            chapter_id = int(chapter["id"])
            cur = await db.execute(
                "SELECT content FROM scripts WHERE chapter_id = ? AND novel_id = ?",
                (chapter_id, request.novel_id),
            )
            row = await cur.fetchone()
            content = (dict(row).get("content") if row else "") or ""
            if not content.strip():
                missing.append(str(chapter.get("title") or chapter_id))
                continue
            chapter_ids.append(chapter_id)
            parts.append(f"【章节 {chapter.get('title') or chapter_id}】\n{content}")
    finally:
        await db.close()
    if not parts:
        raise HTTPException(status_code=400, detail="所选章节尚未生成剧本，请先到「剧本转换」生成剧本后再提取")
    prompt = (template.get("content") or "").strip()
    prompt += (
        "\n\n请仅返回 JSON 数组，不要 Markdown、不写解释。每项必须是对象，"
        "包含 name（名称）、description（完整视觉与剧情描述）、attributes（对象）三个字段。"
        f"\n\n待提取类型：{request.element_type}\n\n以下是待分析剧本：\n{"\n\n".join(parts)}"
    )
    return {"success": True, "prompt": prompt, "chapter_ids": chapter_ids, "skipped_chapters": missing}


@router.post("/official-result")
async def save_official_extraction_result(request: OfficialExtractionResultRequest):
    await _ensure_novel_visible(request.novel_id)
    if request.element_type not in {"character", "scene", "prop"}:
        raise HTTPException(status_code=400, detail="不支持的提取类型")
    result = await ExtractionService.save_official_result(
        request.novel_id, request.element_type,
        [int(item) for item in (request.chapter_ids or [])], request.content,
    )
    if not result.get("success"):
        raise HTTPException(status_code=422, detail=result.get("message") or "官方结果无法保存")
    return result


@router.get("/novel/{novel_id}", response_model=List[ExtractedElementResponse])
async def get_novel_elements(
    novel_id: int,
    response: Response,
    element_type: Optional[str] = Query(None, description="筛选类型: character/scene/prop"),
):
    """获取某小说的所有提取结果"""
    # Extraction cards contain mutable generation state.  Do not let the
    # renderer reuse a cached response (e.g. an old `generating`/`error`
    # state after the image has already been downloaded successfully).
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    await _ensure_novel_visible(novel_id)
    try:
        active_before_query = set(_running_panorama_generations)
        elements = await ExtractionService.get_elements(novel_id, element_type)
        for element in elements:
            _attach_panorama_runtime_status(element, active_before_query)
        return elements
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices")
async def get_voices(element_id: Optional[int] = Query(None)):
    """当前语音配置对应的内置音色 + 本地「我的音色」。
    ⚠️ 必须定义在 /{element_id} 之前,否则会被 catch-all 当成 element_id=voices → 422。"""
    from services import voice_service
    return {"voices": await voice_service.list_voices(element_id=element_id)}


@router.post("/voices/custom-audio")
async def add_custom_audio_voice(
    element_id: int = Form(...),
    label: str = Form(...),
    file: UploadFile = File(...),
):
    """导入一段外部音频到「我的音色」。不暴露 voice_id 给用户。"""
    from services import voice_service
    try:
        element = await _ensure_element_visible(element_id)
        if element.get("element_type") != "character":
            raise HTTPException(status_code=400, detail="只有人物类型支持导入音色")
        label = (label or "").strip()
        if not label:
            raise HTTPException(status_code=400, detail="请填写音色名称")

        ext = _get_audio_extension(file.filename or "voice.mp3")
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"不支持的音频格式，仅支持: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}")

        content = await file.read()
        if len(content) > MAX_AUDIO_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"文件大小超过限制，最大允许 {MAX_AUDIO_FILE_SIZE // (1024*1024)}MB")

        # “我的音色库”是工具级资产,不属于某一本剧。导入时放到 data/audios;
        # 只有绑定角色/马甲时才复制到对应剧本的 images/{剧名}/音频/音频_*.ext 标准路径。
        label_part = ImageService._safe_name_part(label, 32) or "未命名音色"
        rel_name = f"音色_{label_part}{ext}"
        audios_dir = media_subdir("audios")
        file_path = os.path.join(audios_dir, rel_name.replace("/", os.sep))
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(content)

        try:
            dur = _probe_audio_duration_seconds(file_path)
            if dur is not None and (dur < JIMENG_AUDIO_MIN_DURATION or dur > JIMENG_AUDIO_MAX_DURATION):
                try:
                    os.remove(file_path)
                except Exception:
                    pass
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"音频时长 {dur:.2f} 秒,不在即梦允许范围 "
                        f"[{JIMENG_AUDIO_MIN_DURATION:g}, {JIMENG_AUDIO_MAX_DURATION:g}] 秒内。"
                        "请提供约 2~30 秒的音频片段；提交时还会按所选模型复核。"
                    ),
                )
        except HTTPException:
            raise
        except Exception:
            pass

        audio_file = f"/data/audios/{rel_name}"
        voice = await voice_service.save_custom_audio_voice(label=label, audio_file=audio_file)
        return {
            "success": True,
            "voice": voice,
            "voices": await voice_service.list_voices(element_id=element_id),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入外部音色失败: {e}")


@router.delete("/voices/custom")
async def remove_custom_voice(voice_id: str = Query(...)):
    """从本地「我的音色」库删除一条自定义 voice_id。已绑定角色不会被自动解绑。"""
    from services import voice_service
    try:
        deleted = await voice_service.delete_custom_voice(voice_id)
        return {"success": True, "deleted": deleted, "voices": await voice_service.list_voices()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除自定义音色失败: {e}")


@router.post("/element/{element_id}/polish-description")
async def polish_element_description(element_id: int, request: PolishDescriptionRequest):
    """Polish a character or scene description without saving it."""
    element = await _ensure_element_visible(element_id)
    element_type = element.get("element_type")
    if element_type not in ("character", "scene"):
        raise HTTPException(status_code=400, detail="目前仅人物和场景描述支持 AI 润色")

    description = (
        request.current_description
        if request.current_description is not None
        else element.get("description")
    )
    description = (description or "").strip()
    if not description:
        label = "人物" if element_type == "character" else "场景"
        raise HTTPException(status_code=400, detail=f"{label}描述为空，无法润色")

    instruction = (request.instruction or "").strip()
    try:
        from services import cloud_llm_sync
        from services.llm_service import LLMService

        cfg = await cloud_llm_sync.get_active_config(
            config_id=request.llm_config_id,
            config_type="llm",
        )
        if not cfg:
            raise HTTPException(status_code=400, detail="未找到可用的大语言模型配置，请先在大模型配置中配置默认 LLM")

        element_name = (element.get("name") or "").strip()
        messages = _build_description_polish_messages(
            element_type,
            element_name,
            description,
            instruction,
        )
        is_scene = element_type == "scene"
        result = await LLMService.call_llm(
            config_id=int(cfg["id"]),
            messages=messages,
            temperature=0.45,
            max_tokens=1200 if is_scene else 1000,
            timeout=120,
            task_type="scene_description_polish" if is_scene else "character_description_polish",
            novel_id=element.get("novel_id"),
            chapter_title=f"{element_name or ('场景' if is_scene else '人物')} AI润色",
            source_id=element_id,
            source_type="extraction_scene" if is_scene else "extraction_character",
        )
        polished = _clean_polished_description(result)
        if not polished:
            raise HTTPException(status_code=500, detail="AI 润色结果为空，请重试")
        return {"success": True, "description": polished}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("AI 润色描述失败 element_id=%s type=%s", element_id, element_type)
        raise HTTPException(status_code=500, detail=f"AI 润色失败: {e}")


@router.get("/{element_id}", response_model=ExtractedElementResponse)
async def get_element(element_id: int):
    """获取单个元素详情"""
    active_before_query = set(_running_panorama_generations)
    element = await _ensure_element_visible(element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    return _attach_panorama_runtime_status(element, active_before_query)


@router.post("/", response_model=ExtractedElementResponse)
async def create_element(data: ExtractedElementCreate):
    """手动创建元素"""
    await _ensure_novel_visible(data.novel_id)
    try:
        element = await ExtractionService.create_element(data.model_dump())
        return element
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{element_id}", response_model=ExtractedElementResponse)
async def update_element(element_id: int, data: ExtractedElementUpdate):
    """更新元素"""
    await _ensure_element_visible(element_id)
    element = await ExtractionService.update_element(element_id, data.model_dump(exclude_unset=True))
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    return element


@router.delete("/{element_id}")
async def delete_element(element_id: int):
    """删除元素"""
    await _ensure_element_visible(element_id)
    success = await ExtractionService.delete_element(element_id)
    if not success:
        raise HTTPException(status_code=404, detail="元素不存在")
    return {"success": True, "message": "删除成功"}


@router.delete("/novel/{novel_id}")
async def delete_novel_elements(
    novel_id: int,
    element_type: Optional[str] = Query(None, description="删除指定类型: character/scene/prop，为空则删除全部")
):
    """清空某小说的提取结果"""
    await _ensure_novel_visible(novel_id)
    try:
        count = await ExtractionService.delete_elements_by_novel(novel_id, element_type)
        return {"success": True, "message": f"已删除 {count} 条记录"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/element/{element_id}/cancel-image")
async def cancel_element_image(element_id: int):
    """v3.61.128: 取消生成图片 — 前端点"停止"时调,把 image_status 从 generating 置 null

    注意:这个 API 只改 DB 状态,**不会真的取消后端正在跑的 LLM 调用**(LLM 客户端不支持中断)。
    LLM 还是会跑完,但完成后 update_element_image 看到 image_status=null 会自然写回 success/error。
    用户点"停止"后切走再切回,UI 不会再显示转圈(因为 DB 是 null,不是 generating)。
    """
    element = await _ensure_element_visible(element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    # 只在 generating 状态下才置空(防止误清掉 success/error)
    cur_status = element.get("image_status")
    if cur_status == "generating":
        await ExtractionService.update_element_image(
            element_id=element_id,
            image_status=None,
        )
        return {"success": True, "message": "已停止"}
    return {"success": True, "message": f"当前状态 {cur_status},无需停止"}


async def _run_element_image_generation(
    element_id: int,
    config_id: int,
    element: Optional[dict] = None,
    *,
    mark_generating: bool = True,
) -> dict:
    """实际执行元素生图。同步接口/后台任务共用,避免两套状态逻辑分叉。"""
    try:
        # 获取元素信息
        element = element or await _ensure_element_visible(element_id)
        if not element:
            return {"success": False, "message": "元素不存在", "image_url": None}
        
        # 检查元素是否有描述
        description = element.get("description", "")
        if not description:
            return {"success": False, "message": "元素没有描述，无法生成图片", "image_url": None}
        
        # 获取风格设置
        novel_id = element.get("novel_id")
        element_type = element.get("element_type")
        style = await ExtractionService.get_image_style(novel_id, element_type)
        
        # 拼接最终提示词:占位符({角色信息}/{场景信息}/{道具信息})被替换为 description
        prefix = _normalize_style_prompt(style.get("prefix_prompt", "").strip())
        suffix = style.get("suffix_prompt", "").strip()
        # 兜底:用户没在前端打开过"风格设置"对话框 → prefix 为空 → 出图无风格
        # 改用对应类型的内置默认模板,保证出图至少有"电影写真质感+8K+真实光影"
        if not prefix:
            prefix = DEFAULT_STYLE_TEMPLATES.get(element_type, "")
        final_prompt = _fill_template_placeholders(prefix, element_type, description) if prefix else description
        if suffix:
            final_prompt = final_prompt + "\n" + suffix

        # v3.61.63: 场景生图运行时强制注入"不要出现人物"约束
        final_prompt = _ensure_scene_no_human(final_prompt, element_type)

        # 获取参考图路径（如果存在）
        reference_image_path = element.get("reference_image")
        
        if mark_generating:
            # 设置状态为生成中
            await ExtractionService.update_element_image(
                element_id=element_id,
                image_status="generating"
            )
        
        # 调用图片生成服务
        result = await ImageService.generate_image(
            config_id=config_id,
            prompt=final_prompt,
            element_id=element_id,
            element_type=element_type,
            novel_id=novel_id,
            reference_image_path=reference_image_path
        )
        
        if result["success"]:
            _old_img = element.get("image_url")
            # 更新元素图片信息
            await ExtractionService.update_element_image(
                element_id=element_id,
                image_url=result["image_url"],
                image_prompt=final_prompt,
                image_status="success"
            )
            # v3.61.202:DB 成功后清旧图(不同扩展名残留)
            _cleanup_old_asset_after_db(resolve_db_path(result["image_url"]), _old_img)
            return {
                "success": True,
                "message": "图片生成成功",
                "image_url": result["image_url"]
            }
        else:
            # 更新状态为错误
            await ExtractionService.update_element_image(
                element_id=element_id,
                image_status="error"
            )
            return {"success": False, "message": result["message"], "image_url": None}
    except Exception as e:
        # 更新状态为错误
        await ExtractionService.update_element_image(
            element_id=element_id,
            image_status="error"
        )
        return {"success": False, "message": str(e), "image_url": None}


@router.post("/element/{element_id}/official-image-result")
async def save_official_image_result(element_id: int, request: OfficialImageResultRequest):
    """Persist a finished official-compute image as a normal local generated asset.

    Official jobs run through the desktop main process, so their remote result
    never enters ``ImageService.generate_image``.  Without this bridge the UI
    receives a URL but the element keeps its ``generating`` state and loses the
    result after the provider's temporary URL expires.
    """
    element = await _ensure_element_visible(element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    raw_url = str(request.image_url or "").strip()
    parsed = urlparse(raw_url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or host not in _OFFICIAL_IMAGE_DELIVERY_HOSTS:
        raise HTTPException(status_code=400, detail="官方图片地址无效")
    try:
        content = await _download_official_image(raw_url)
        if not content or len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=502, detail="官方图片内容无效或超过大小限制")
        try:
            with Image.open(BytesIO(content)) as image:
                image.verify()
            with Image.open(BytesIO(content)) as image:
                image_format = (image.format or "PNG").upper()
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=502, detail="官方图片格式无效") from exc
        extension = {"JPEG": ".jpg", "JPG": ".jpg", "PNG": ".png", "WEBP": ".webp"}.get(image_format)
        if not extension:
            raise HTTPException(status_code=502, detail="官方图片格式暂不支持")
        relative = await _build_asset_rel(element_id, "generated", extension)
        if not relative:
            relative = f"official_{element_id}_{int(time.time() * 1000)}{extension}"
        output_path = os.path.join(_ensure_images_dir(), relative.replace("/", os.sep))
        old_image = element.get("image_url")
        _write_image_atomic(output_path, content)
        image_path = f"/data/images/{relative}"
        await ExtractionService.update_element_image(
            element_id=element_id,
            image_url=image_path,
            image_prompt=request.image_prompt or element.get("image_prompt"),
            image_status="success",
        )
        _cleanup_old_asset_after_db(output_path, old_image)
        return {"success": True, "message": "官方图片已保存", "image_url": image_path}
    except HTTPException:
        await ExtractionService.update_element_image(element_id=element_id, image_status="error")
        raise
    except Exception as exc:
        # The official server has already completed the paid task and returned
        # a validated CDN URL.  If only the embedded Python downloader is
        # blocked by a machine-specific proxy/certificate policy, retain that
        # URL so Chromium can display the generated image instead of replacing
        # a successful job with a permanent FAILED tile.
        logger.exception("保存官方图片到本地失败，改用远端地址 element=%s host=%s", element_id, host)
        await ExtractionService.update_element_image(
            element_id=element_id,
            image_url=raw_url,
            image_prompt=request.image_prompt or element.get("image_prompt"),
            image_status="success",
        )
        return {
            "success": True,
            "message": "官方图片已生成，当前使用远端地址显示",
            "image_url": raw_url,
            "remote_only": True,
        }


@router.post("/element/{element_id}/generate-image")
async def generate_element_image(element_id: int, request: GenerateImageRequest):
    """
    为指定元素生成图片
    - 获取元素的 description 作为图片提示词
    - 拼接风格设置的前置和后置提示词
    - 如果有参考图，使用图生图模式
    - 调用图片生成服务
    - 更新元素的 image_url 字段
    - 返回结果
    """
    element = await _ensure_element_visible(element_id)
    if _is_recent_image_generation(element):
        raise HTTPException(status_code=409, detail="该元素图片正在生成中,请等待当前任务完成或先停止生成")

    result = await _run_element_image_generation(
        element_id=element_id,
        config_id=request.config_id,
        element=element,
        mark_generating=True,
    )
    if result.get("success"):
        return result
    raise HTTPException(status_code=500, detail=result.get("message") or "图片生成失败")


@router.post("/element/{element_id}/generate-image-async")
async def submit_element_image_generation(
    element_id: int,
    request: GenerateImageRequest,
):
    """提交元素生图后台任务。

    v3.61.242:批量生图专用。避免前端同时持有多个 25 分钟长连接,
    否则 Electron 到本地后端的请求会排队,表现为切菜单后页面空/日志转圈。
    """
    element = await _ensure_element_visible(element_id)
    if _is_recent_image_generation(element):
        raise HTTPException(status_code=409, detail="该元素图片正在生成中,请等待当前任务完成或先停止生成")
    if not (element.get("description") or "").strip():
        raise HTTPException(status_code=400, detail="元素没有描述，无法生成图片")

    await ExtractionService.update_element_image(element_id=element_id, image_status="generating")
    task = asyncio.create_task(
        _run_element_image_generation(
            element_id=element_id,
            config_id=request.config_id,
            element=element,
            mark_generating=False,
        )
    )
    task.add_done_callback(
        lambda t: logger.error(
            f"[image-async] 元素 {element_id} 后台生图任务异常: {t.exception()}",
            exc_info=t.exception(),
        ) if (not t.cancelled() and t.exception()) else None
    )
    return {"success": True, "message": "图片生成已提交", "image_url": None, "status": "generating"}


# ============================================================
# v3.61.147: VR 720° 全景图 + 自动拼宫格(MVP)
# ============================================================
class GeneratePanoramaRequest(BaseModel):
    config_id: int
    # v3.61.156:用户可在弹窗里编辑 prompt;传了就用它,后端跳过默认 ERP 包装
    prompt_override: Optional[str] = None


@router.post("/element/{element_id}/panorama/generate")
async def generate_panorama_endpoint(element_id: int, request: GeneratePanoramaRequest):
    """生成场景元素的 VR 720° equirectangular 全景图。
    成功后写入 extracted_elements.panorama_url(本地相对路径)。

    v3.61.156:支持 prompt_override — 用户在弹窗里编辑过的 prompt 直接生效,
    跳过 _wrap_panorama_prompt 二次包装,让用户拥有完整控制权
    """
    registered = False
    try:
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        if element.get("element_type") != "scene":
            raise HTTPException(status_code=400, detail="全景图只支持场景元素")
        description = (element.get("description") or "").strip()
        if not description and not (request.prompt_override or "").strip():
            raise HTTPException(status_code=400, detail="场景没有描述,无法生成全景图")

        if _is_panorama_generating(element_id):
            raise HTTPException(status_code=409, detail="该场景的全景图仍在生成中,请等待完成")

        novel_id = element.get("novel_id")
        _running_panorama_generations[element_id] = {
            "novel_id": novel_id,
            "config_id": request.config_id,
            "started_at": time.time(),
        }
        registered = True
        logger.info("[panorama] 注册运行任务 element=%s novel=%s", element_id, novel_id)
        # 参考图自动从 element.reference_image 读
        reference_image_path = element.get("reference_image")
        if reference_image_path:
            __import__('logging').getLogger(__name__).info(
                f"[panorama] element {element_id} 使用参考图: {reference_image_path}"
            )

        # v3.61.156: prompt_override 优先,用户编辑后的 prompt 不再包装
        # 没传(走老路径) → 按成品图同口径拼场景风格模板,再由 _wrap_panorama_prompt 加 ERP 硬约束
        if request.prompt_override and request.prompt_override.strip():
            result = await ImageService.generate_panorama_raw(
                config_id=request.config_id,
                final_prompt=request.prompt_override.strip(),
                element_id=element_id,
                novel_id=novel_id,
                reference_image_path=reference_image_path,
            )
        else:
            style = await ExtractionService.get_image_style(novel_id, "scene")
            prefix = _normalize_style_prompt((style.get("prefix_prompt") or "").strip())
            suffix = (style.get("suffix_prompt") or "").strip()
            if not prefix:
                prefix = DEFAULT_STYLE_TEMPLATES.get("scene", "")
            panorama_scene_prompt = _fill_template_placeholders(prefix, "scene", description) if prefix else description
            if suffix:
                panorama_scene_prompt = panorama_scene_prompt + "\n" + suffix
            panorama_scene_prompt = _ensure_scene_no_human(panorama_scene_prompt, "scene")
            panorama_scene_prompt = "\n".join([
                "【场景描述与风格】",
                "以下内容按场景成品图同口径生成:风格设置模板中的【场景信息】已替换为当前场景描述;只用于定义场景结构、材质、色彩、光影和画面质感,不得改变上方 2:1 等距柱状投影、720° VR 全景、无人物空景要求。",
                panorama_scene_prompt,
            ])
            result = await ImageService.generate_panorama(
                config_id=request.config_id,
                prompt=panorama_scene_prompt,
                element_id=element_id,
                novel_id=novel_id,
                reference_image_path=reference_image_path,
            )

        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("message") or "全景图生成失败")

        panorama_path = result.get("image_url")  # ImageService 返回的字段名叫 image_url,内容是本地相对路径
        await ExtractionService.update_element_image(
            element_id=element_id,
            panorama_url=panorama_path,
        )
        return {"success": True, "panorama_url": panorama_path, "message": "全景图生成成功"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if registered:
            _running_panorama_generations.pop(element_id, None)
            logger.info("[panorama] 注销运行任务 element=%s", element_id)


class PanoramaToGridRequest(BaseModel):
    view_count: int = 9  # 默认 9 视图,每 40°


@router.post("/element/{element_id}/panorama/grid")
async def panorama_to_grid_endpoint(element_id: int, request: PanoramaToGridRequest):
    """v3.61.156 复活:把元素的 panorama_url 按 N 视角(每 360/N°)采样,拼成网格图写入 grid_image。
    默认 9 视图 / 3×3 / 单格 16:9。仍支持 6 / 12 视角。
    """
    from services.panorama_service import panorama_to_views
    try:
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        panorama_rel = element.get("panorama_url")
        if not panorama_rel:
            raise HTTPException(status_code=400, detail="该场景还没有全景图,先生成或上传一张")

        # 走 resolve_db_path,尊重用户自定义 media 目录
        panorama_abs = resolve_db_path(panorama_rel)
        if not os.path.isfile(panorama_abs):
            if os.path.isfile(panorama_rel):
                panorama_abs = panorama_rel
            else:
                raise HTTPException(status_code=404, detail=f"全景图文件不存在: {panorama_abs}")

        images_dir = media_subdir("images")
        ts = int(time.time() * 1000)
        # v3.61.202:场景_名_宫格图,小说/场景/ 子目录,同名覆盖
        _rel = await _build_asset_rel(element_id, "grid", ".png") or f"pano_grid_{element_id}_{ts}.png"
        out_abs = os.path.join(images_dir, _rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(out_abs), exist_ok=True)
        _old_grid = element.get("grid_image")

        # v3.61.202 P2:先输出到 tmp,成功才 replace 转正(半写/失败不污染同名旧宫格)
        tmp_abs = f"{out_abs}.{secrets.token_hex(4)}.building.tmp"
        success, message = panorama_to_views(
            panorama_abs, tmp_abs,
            view_count=request.view_count,
        )
        if not success:
            try: os.remove(tmp_abs)
            except Exception: pass
            raise HTTPException(status_code=500, detail=message)
        _replace_file_with_retry(tmp_abs, out_abs)

        # 生成成功 → 先 DB → 成功后才清旧图(DB 失败旧图保留)
        grid_rel = f"data/images/{_rel}"
        await ExtractionService.update_element_image(
            element_id=element_id,
            grid_image=grid_rel,
        )
        _cleanup_old_asset_after_db(out_abs, _old_grid)
        return {"success": True, "grid_image": grid_rel, "view_count": request.view_count, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/element/{element_id}/panorama/upload")
async def upload_panorama_endpoint(element_id: int, file: UploadFile = File(...)):
    """用户上传 equirectangular 2:1 全景图。
    v3.61.148: 接 LibTV / Skybox 等专业工具产出的全景图作为输入源。
    """
    try:
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        if element.get("element_type") != "scene":
            raise HTTPException(status_code=400, detail="全景图只支持场景元素")

        # 文件名 + 路径(v3.61.202:场景_名_720,小说/场景/ 子目录,同名覆盖)
        ts = int(time.time() * 1000)
        suffix = ".png"
        if file.filename and "." in file.filename:
            ext = file.filename.rsplit(".", 1)[-1].lower()
            if ext in ("png", "jpg", "jpeg", "webp"):
                suffix = f".{ext}"
        _rel = await _build_asset_rel(element_id, "panorama", suffix) or f"pano_upload_{element_id}_{ts}{suffix}"
        images_dir = media_subdir("images")
        out_abs = os.path.join(images_dir, _rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(out_abs), exist_ok=True)
        # v3.61.202:先写 temp,2:1 校验通过才 os.replace 到正式名 —
        #   否则同名直接覆盖后校验失败,会把旧全景一起删掉(codex P1)
        tmp_abs = f"{out_abs}.{secrets.token_hex(4)}.uploading.tmp"

        # 流式写入到 temp
        with open(tmp_abs, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)

        # 简单尺寸校验:必须 2:1 横屏
        try:
            from PIL import Image as _PILImage
            with _PILImage.open(tmp_abs) as im:
                w, h = im.size
            if w < 2 * h * 0.95 or w > 2 * h * 1.05:
                try:
                    os.remove(tmp_abs)  # 只删 temp,旧全景不动
                except Exception:
                    pass
                raise HTTPException(
                    status_code=400,
                    detail=f"全景图必须是 2:1 等距柱状投影(equirectangular)。"
                           f"上传的图片尺寸 {w}x{h} 不符合(宽应 ≈ 高×2)"
                )
        except HTTPException:
            raise
        except Exception as _verr:
            logger = __import__('logging').getLogger(__name__)
            logger.warning(f"[panorama-upload] PIL 校验失败但放行: {_verr}")

        # 校验通过 → temp 转正(原子覆盖)→ DB → 成功后才清旧
        _old_pano = element.get("panorama_url")
        _replace_file_with_retry(tmp_abs, out_abs)
        panorama_rel = f"data/images/{_rel}"
        await ExtractionService.update_element_image(
            element_id=element_id,
            panorama_url=panorama_rel,
        )
        _cleanup_old_asset_after_db(out_abs, _old_pano)
        return {"success": True, "panorama_url": panorama_rel, "message": "全景图上传成功"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AppendScreenshotRequest(BaseModel):
    image_base64: str  # data:image/png;base64,... 或纯 base64


@router.post("/element/{element_id}/panorama/append-screenshot")
async def append_screenshot_endpoint(element_id: int, request: AppendScreenshotRequest):
    """v3.61.148 / v3.61.152 重写:VR 查看器截图直接落盘成 grid_image
    v3.61.152:前端已经在 canvas 里把所有截图拼成完整宫格,后端不再做拼接,只解 base64 存
    (之前后端拼接逻辑会因首次拼接后宽高比突变导致后续位置乱)
    """
    try:
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        if element.get("element_type") != "scene":
            raise HTTPException(status_code=400, detail="该功能只支持场景元素")

        # 解 base64
        b64 = request.image_base64 or ""
        if "," in b64 and b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]
        try:
            new_png_bytes = base64.b64decode(b64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"base64 解码失败: {e}")
        if len(new_png_bytes) < 100:
            raise HTTPException(status_code=400, detail="截图数据为空或太小")

        # v3.61.152 P2: 校验合法 PNG —— PIL 试解一次,坏数据不入库
        # PNG magic = 89 50 4E 47 0D 0A 1A 0A;PIL .verify() 校验 IDAT 链
        from PIL import Image as _PILImage
        from io import BytesIO as _BytesIO
        try:
            with _PILImage.open(_BytesIO(new_png_bytes)) as _vimg:
                _vimg.verify()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"截图不是合法 PNG: {e}")

        images_dir = media_subdir("images")
        ts = int(time.time() * 1000)
        # v3.61.202:场景_名_宫格图,小说/场景/ 子目录,同名覆盖
        _rel = await _build_asset_rel(element_id, "grid", ".png") or f"vr_grid_{element_id}_{ts}.png"
        out_abs = os.path.join(images_dir, _rel.replace("/", os.sep))
        _old_grid = element.get("grid_image")

        # v3.61.202:原子写 → DB → 成功后清旧
        _write_image_atomic(out_abs, new_png_bytes)
        grid_rel = f"data/images/{_rel}"
        await ExtractionService.update_element_image(
            element_id=element_id,
            grid_image=grid_rel,
        )
        _cleanup_old_asset_after_db(out_abs, _old_grid)
        return {"success": True, "grid_image": grid_rel, "message": "宫格图已更新"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/element/{element_id}/panorama")
async def delete_panorama_endpoint(element_id: int):
    """删除元素的 panorama_url(不删本地文件,只清字段)。"""
    try:
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        await ExtractionService.update_element_image(
            element_id=element_id,
            panorama_url=None,
        )
        return {"success": True, "message": "全景图已清除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _generate_single_image(
    element: dict,
    novel_id: int,
    config_id: int,
    default_prefix: str,
    default_suffix: str,
    default_element_type: str
) -> dict:
    """
    为单个元素生成图片
    每个任务独立处理异常，一个失败不影响其他
    """
    element_id = element["id"]
    description = element.get("description", "")
    elem_type = element.get("element_type", default_element_type)
    
    if _is_recent_image_generation(element):
        return {"id": element_id, "status": "generating", "reason": "该元素图片正在生成中"}

    if not description:
        return {"id": element_id, "status": "failed", "reason": "无描述"}
    
    try:
        # 获取该元素类型的风格设置
        if elem_type != default_element_type:
            elem_style = await ExtractionService.get_image_style(novel_id, elem_type)
            elem_prefix = _normalize_style_prompt(elem_style.get("prefix_prompt", "").strip())
            elem_suffix = elem_style.get("suffix_prompt", "").strip()
        else:
            elem_prefix = default_prefix
            elem_suffix = default_suffix
        
        # 拼接最终提示词
        final_prompt = description
        if elem_prefix:
            final_prompt = elem_prefix + "\n" + final_prompt
        if elem_suffix:
            final_prompt = final_prompt + "\n" + elem_suffix

        # v3.61.63: 场景生图运行时强制注入"不要出现人物"约束
        final_prompt = _ensure_scene_no_human(final_prompt, elem_type)

        # 设置状态为生成中
        await ExtractionService.update_element_image(
            element_id=element_id,
            image_status="generating"
        )
        
        # 获取参考图路径（如果存在）
        reference_image_path = element.get("reference_image")
        
        # 调用图片生成服务
        result = await ImageService.generate_image(
            config_id=config_id,
            prompt=final_prompt,
            element_id=element_id,
            element_type=elem_type,
            novel_id=novel_id,
            reference_image_path=reference_image_path
        )
        
        if result["success"]:
            _old_img = element.get("image_url")
            # 更新元素图片信息
            await ExtractionService.update_element_image(
                element_id=element_id,
                image_url=result["image_url"],
                image_prompt=final_prompt,
                image_status="success"
            )
            # v3.61.202:DB 成功后清旧图
            _cleanup_old_asset_after_db(resolve_db_path(result["image_url"]), _old_img)
            return {"id": element_id, "status": "success", "image_url": result["image_url"]}
        else:
            await ExtractionService.update_element_image(
                element_id=element_id,
                image_status="error"
            )
            return {"id": element_id, "status": "failed", "reason": result["message"]}
            
    except Exception as e:
        await ExtractionService.update_element_image(
            element_id=element_id,
            image_status="error"
        )
        return {"id": element_id, "status": "failed", "reason": str(e)}


@router.post("/novel/{novel_id}/generate-images")
async def batch_generate_images(novel_id: int, request: BatchGenerateImageRequest):
    """
    批量为指定小说的元素生成图片（并发版本）
    - element_type 可选：character, scene, prop，为空则全部生成
    - 自动拼接风格设置的前置和后置提示词
    - 跳过已有成品图(finished_image)的元素
    - 使用 asyncio.gather 并发调用，所有元素同时发起请求
    """
    await _ensure_novel_visible(novel_id)
    try:
        # 获取要处理的元素
        elements = await ExtractionService.get_elements(novel_id, request.element_type)
        
        # 过滤掉已有成品图(finished_image)的元素，以及已有AI生成图片且状态成功的元素
        elements_to_process = [
            e for e in elements 
            if not e.get("finished_image") and (not e.get("image_url") or e.get("image_status") != "success")
        ]
        
        if not elements_to_process:
            return {
                "success": True,
                "message": "没有需要生成图片的元素（已有成品图的元素会被跳过）",
                "total": 0,
                "success_count": 0,
                "failed_count": 0,
                "results": []
            }
        
        # 获取该类型的风格设置
        element_type = request.element_type or elements_to_process[0].get("element_type", "character")
        style = await ExtractionService.get_image_style(novel_id, element_type)
        prefix = _normalize_style_prompt(style.get("prefix_prompt", "").strip())
        suffix = style.get("suffix_prompt", "").strip()
        
        # v3.61.235:批量生图限并发。
        # 之前直接 gather 全量元素,会同时触发多组云端 for-client/decrypt-key + 图片生成,
        # 席位模式还会按 X-Team-Id 重试,容易被云端判"并发过高",并留下 running 日志。
        sem = asyncio.Semaphore(2)

        async def _run_one(element):
            async with sem:
                return await _generate_single_image(
                    element=element,
                    novel_id=novel_id,
                    config_id=request.config_id,
                    default_prefix=prefix,
                    default_suffix=suffix,
                    default_element_type=element_type
                )

        tasks = [_run_one(element) for element in elements_to_process]
        
        # 使用 asyncio.gather 同时发起所有请求
        results = await asyncio.gather(*tasks)
        
        # 汇总结果
        success_list = [r for r in results if r["status"] == "success"]
        failed_list = [r for r in results if r["status"] == "failed"]
        
        return {
            "success": True,
            "message": f"批量生成完成，成功 {len(success_list)} 个，失败 {len(failed_list)} 个",
            "total": len(elements_to_process),
            "success_count": len(success_list),
            "failed_count": len(failed_list),
            "results": results,
            "failed_details": failed_list if failed_list else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/element/{element_id}/image")
async def delete_element_image(element_id: int):
    """删除元素的图片"""
    try:
        # 获取元素信息
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        image_url = element.get("image_url")
        
        # 删除本地图片文件
        if image_url:
            await ImageService.delete_image_file(image_url)
        
        # 清空图片信息
        await ExtractionService.update_element_image(
            element_id=element_id,
            image_url=None,
            image_prompt=None,
            image_status=None
        )
        
        return {"success": True, "message": "图片已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/novel/{novel_id}/image-style/{element_type}", response_model=ImageStyleSettingResponse)
async def get_image_style(novel_id: int, element_type: str):
    """获取图片风格设置"""
    await _ensure_novel_visible(novel_id)
    try:
        style = await ExtractionService.get_image_style(novel_id, element_type)
        return style
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/novel/{novel_id}/image-style/{element_type}", response_model=ImageStyleSettingResponse)
async def save_image_style(novel_id: int, element_type: str, data: ImageStyleSetting):
    """保存图片风格设置"""
    await _ensure_novel_visible(novel_id)
    try:
        style = await ExtractionService.save_image_style(
            novel_id=novel_id,
            element_type=element_type,
            prefix_prompt=data.prefix_prompt,
            suffix_prompt=data.suffix_prompt
        )
        return style
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


_STYLE_REFERENCE_MAX_FILES = 4
_STYLE_REFERENCE_MAX_FILE_SIZE = 10 * 1024 * 1024
_STYLE_REFERENCE_MAX_EDGE = 1600


def _style_reference_data_url(content: bytes) -> str:
    """Validate and resize a reference screenshot before sending it to the LLM."""
    try:
        with Image.open(BytesIO(content)) as source:
            image = ImageOps.exif_transpose(source)
            image.seek(0)
            image.load()
            if image.width < 64 or image.height < 64:
                raise ValueError("截图尺寸过小，宽高至少为 64 像素")
            if image.width > 16000 or image.height > 16000:
                raise ValueError("截图尺寸过大，宽高不能超过 16000 像素")
            image.thumbnail(
                (_STYLE_REFERENCE_MAX_EDGE, _STYLE_REFERENCE_MAX_EDGE),
                Image.Resampling.LANCZOS,
            )
            if image.mode in ("RGBA", "LA") or (
                image.mode == "P" and "transparency" in image.info
            ):
                rgba = image.convert("RGBA")
                flattened = Image.new("RGB", rgba.size, (255, 255, 255))
                flattened.paste(rgba, mask=rgba.getchannel("A"))
                image = flattened
            else:
                image = image.convert("RGB")
            output = BytesIO()
            image.save(output, format="JPEG", quality=86, optimize=True)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as exc:
        raise ValueError("文件不是有效的 PNG、JPEG 或 WebP 图片") from exc
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def _parse_style_reference_json(raw_text: str) -> dict[str, Any]:
    text = (raw_text or "").strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline >= 0:
            text = text[first_newline + 1:]
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3].rstrip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        object_start = text.find("{")
        if object_start < 0:
            raise ValueError("视觉模型未返回可解析的 JSON")
        try:
            parsed, _ = json.JSONDecoder().raw_decode(text[object_start:])
        except json.JSONDecodeError as exc:
            raise ValueError("视觉模型返回格式不正确，请重试或更换视觉模型") from exc

    if not isinstance(parsed, dict):
        raise ValueError("视觉模型返回的结果不是对象")

    def clean_text(key: str, limit: int = 3000) -> str:
        value = parsed.get(key, "")
        if value is None:
            return ""
        if not isinstance(value, str):
            value = str(value)
        return value.strip()[:limit]

    warnings = parsed.get("warnings") or []
    if isinstance(warnings, str):
        warnings = [warnings]
    if not isinstance(warnings, list):
        warnings = []
    normalized_warnings = [str(item).strip()[:300] for item in warnings if str(item).strip()][:8]

    result = {
        "preset_name": clean_text("preset_name", 80) or "截图风格预设",
        "summary": clean_text("summary", 600),
        "shared_visual_style": clean_text("shared_visual_style"),
        "character_visual_style": clean_text("character_visual_style", 1600),
        "scene_visual_style": clean_text("scene_visual_style", 1600),
        "prop_visual_style": clean_text("prop_visual_style", 1600),
        "negative_prompt": clean_text("negative_prompt", 1600),
        "layout_style": clean_text("layout_style", 1600),
        "warnings": normalized_warnings,
    }
    if not result["shared_visual_style"]:
        raise ValueError("视觉模型没有提取出共享视觉风格，请换一张更清晰的截图后重试")
    return result


@router.post("/novel/{novel_id}/analyze-style-reference")
async def analyze_style_reference(
    novel_id: int,
    llm_config_id: int = Form(...),
    analyze_layout: bool = Form(False),
    files: List[UploadFile] = File(...),
):
    """Infer a reusable visual preset from screenshots without changing saved templates."""
    await _ensure_novel_visible(novel_id)
    if not files or len(files) > _STYLE_REFERENCE_MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"请上传 1-{_STYLE_REFERENCE_MAX_FILES} 张参考截图",
        )

    from services.llm_service import LLMService

    try:
        config = await LLMService.get_by_id(llm_config_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if not config or (config.get("config_type") or "").lower() != "llm":
        raise HTTPException(status_code=400, detail="请选择有效的大语言模型配置")

    provider = (config.get("provider_code") or "").lower()
    model_name = (config.get("model_name") or "").lower()
    api_style = (config.get("api_style") or "").lower()
    if provider == "deepseek" or "deepseek" in model_name:
        raise HTTPException(status_code=400, detail="DeepSeek 不支持截图识别，请选择视觉大语言模型")
    if api_style == "gemini_native":
        raise HTTPException(
            status_code=400,
            detail="当前 Gemini 原生配置尚未接入图片输入，请选择 OpenAI 兼容的视觉大语言模型",
        )
    if api_style == "wuyinkeji_chat" and len(files) > 1:
        raise HTTPException(status_code=400, detail="当前速创视觉接口仅支持 1 张截图，请减少截图或更换视觉模型")

    image_urls: list[str] = []
    for index, file in enumerate(files, start=1):
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail=f"第 {index} 张截图为空")
        if len(content) > _STYLE_REFERENCE_MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"第 {index} 张截图超过 10MB")
        try:
            image_urls.append(_style_reference_data_url(content))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"第 {index} 张截图无效：{exc}") from exc

    layout_rule = (
        "同时分析版式语言，layout_style 只描述可复用的网格、留白、信息层级与视图组织；"
        "不得要求直接覆盖人物三/九视图、场景单图、道具静物的现有版式。"
        if analyze_layout
        else "本次不分析版式，layout_style 必须返回空字符串。"
    )
    analysis_prompt = f"""请综合分析随后提供的 {len(image_urls)} 张截图，提取可复用的视觉风格预设。

分析目标：
1. shared_visual_style：三类素材共同使用的视觉母版，只写媒介/渲染方式、色彩体系、明暗与光线、材质纹理、镜头与景深、整体氛围。
2. character_visual_style：人物专属适配，只写肤质、发丝、服装材质、妆面和人物呈现质感，不写人物身份、动作、视图数量或排版。
3. scene_visual_style：场景专属适配，只写空间氛围、环境材质、天气、光源和纵深，不复述截图里的具体地点。
4. prop_visual_style：道具专属适配，只写材质、工艺、磨损、反光和微距/静物质感，不复述具体道具。
5. negative_prompt：只写与该风格冲突的通用负面约束。
6. {layout_rule}

硬性规则：
- 不要输出截图中的人物姓名、具体剧情、具体建筑名、具体道具名、文字、水印或 UI。
- 静态截图无法证明运镜，不得臆造镜头运动。
- 不确定的信息留空，不要编造。
- 输出简洁中文提示词，可直接插入现有【视觉风格】段。
- 只输出一个 JSON 对象，不要 Markdown、解释或代码围栏。

JSON 字段必须完整：
{{
  "preset_name": "预设名称",
  "summary": "一句话风格摘要",
  "shared_visual_style": "共享视觉母版",
  "character_visual_style": "人物适配",
  "scene_visual_style": "场景适配",
  "prop_visual_style": "道具适配",
  "negative_prompt": "负面约束",
  "layout_style": "版式建议或空字符串",
  "warnings": ["不确定项或截图局限"]
}}"""

    user_content: list[dict[str, Any]] = [{"type": "text", "text": analysis_prompt}]
    for index, image_url in enumerate(image_urls, start=1):
        user_content.append({"type": "text", "text": f"参考截图 {index}"})
        user_content.append({"type": "image_url", "image_url": {"url": image_url}})
    messages = [
        {
            "role": "system",
            "content": "你是影视视觉风格分析师。你只提取可迁移的视觉语言，并严格按用户要求输出 JSON。",
        },
        {"role": "user", "content": user_content},
    ]

    try:
        raw_result = await LLMService.call_llm(
            config_id=llm_config_id,
            messages=messages,
            temperature=0.2,
            max_tokens=2400,
            timeout=180.0,
            task_type="style_reference_analysis",
            novel_id=novel_id,
        )
        result = _parse_style_reference_json(raw_result)
        return {"success": True, **result}
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("截图风格分析失败 novel_id=%s", novel_id)
        raise HTTPException(status_code=500, detail=f"截图风格分析失败：{exc}") from exc


# 允许的图片扩展名
ALLOWED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'}
# v3.61.211: 上限 10MB→50MB。自带生成的 4K 图常 20-40MB,旧上限把批量导入卡住。
# 即梦上传侧 jimeng._ensure_jpg_if_large 对 >8M 的图会自动转 jpg(保分辨率),大图存库不影响生成。
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def _get_image_extension(filename: str) -> str:
    """获取图片扩展名"""
    ext = os.path.splitext(filename.lower())[1]
    return ext if ext in ALLOWED_IMAGE_EXTENSIONS else '.png'

def _ensure_images_dir() -> str:
    """确保图片目录存在，返回目录路径"""
    images_dir = media_subdir("images")
    os.makedirs(images_dir, exist_ok=True)
    return images_dir


def _write_image_atomic(abs_path: str, data: bytes) -> None:
    """v3.61.202:原子写图 — 先写带随机 token 的 tmp,close 后 os.replace 转正。
    避免直接 open(final,'wb') 在写一半失败/同名时截断旧图;token 防并发写同资产抢同一 tmp。"""
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    # Importing a file that already lives at this semantic media path should
    # only bind the DB field. Replacing the exact same file can fail on Windows
    # because Chromium may still hold the selected File handle.
    if _file_has_same_bytes(abs_path, data):
        return
    tmp = f"{abs_path}.{secrets.token_hex(4)}.uploading.tmp"
    with open(tmp, "wb") as f:
        f.write(data)
    # Windows 下目标图可能正被前端 <img>/预览解码或安全软件短暂占用,
    # os.replace 会抛 WinError 5。批量导入同名覆盖最容易撞,这里短重试。
    last_err = None
    last_err = None
    for attempt in range(8):
        try:
            os.replace(tmp, abs_path)
            return
        except PermissionError as e:
            last_err = e
            if attempt >= 4:
                # 目标文件被普通只读句柄占用时,先删再 replace 有时能成功;
                # 如果仍被强占用,remove 也会失败,继续等下一轮。
                try:
                    if os.path.exists(abs_path):
                        os.remove(abs_path)
                except Exception:
                    pass
            time.sleep(0.25)
    try:
        if os.path.exists(tmp):
            os.remove(tmp)
    except Exception:
        pass
    raise last_err or PermissionError(f"写入图片失败: {abs_path}")


def _replace_file_with_retry(tmp_path: str, final_path: str) -> None:
    """把已有 temp 文件替换到正式路径,带 Windows 占用重试。"""
    if _files_have_same_bytes(final_path, tmp_path):
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
        return
    last_err = None
    for attempt in range(8):
        try:
            os.replace(tmp_path, final_path)
            return
        except PermissionError as e:
            last_err = e
            if attempt >= 4:
                try:
                    if os.path.exists(final_path):
                        os.remove(final_path)
                except Exception:
                    pass
            time.sleep(0.25)
    try:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    except Exception:
        pass
    raise last_err or PermissionError(f"写入图片失败: {final_path}")


def _file_has_same_bytes(path: str, data: bytes) -> bool:
    try:
        if not path or not os.path.isfile(path):
            return False
        if os.path.getsize(path) != len(data):
            return False
        with open(path, "rb") as f:
            return f.read() == data
    except Exception:
        return False


def _files_have_same_bytes(path_a: str, path_b: str) -> bool:
    try:
        if not path_a or not path_b or not os.path.isfile(path_a) or not os.path.isfile(path_b):
            return False
        if os.path.getsize(path_a) != os.path.getsize(path_b):
            return False
        with open(path_a, "rb") as fa, open(path_b, "rb") as fb:
            while True:
                ba = fa.read(1024 * 1024)
                bb = fb.read(1024 * 1024)
                if ba != bb:
                    return False
                if not ba:
                    return True
    except Exception:
        return False


def _cleanup_temp_siblings(new_abs: str) -> None:
    try:
        parent = os.path.dirname(new_abs)
        name = os.path.basename(new_abs)
        if not parent or not name or not os.path.isdir(parent):
            return
        for fn in os.listdir(parent):
            if fn.startswith(f"{name}.") and (fn.endswith(".uploading.tmp") or fn.endswith(".building.tmp")):
                try:
                    os.remove(os.path.join(parent, fn))
                except Exception:
                    pass
    except Exception:
        pass


def _cleanup_old_asset_after_db(new_abs: str, old_db_path: Optional[str]) -> None:
    """v3.61.202:DB 更新成功【之后】才清理 —
    ① 删旧 DB 路径文件(resolve_db_path,排除新文件)② 清同 stem 不同扩展名兄弟。
    顺序保证:DB 更新失败时旧文件还在,DB 不会指向已删的坏文件。"""
    try:
        if old_db_path:
            op = resolve_db_path(old_db_path)
            if op and os.path.exists(op) and os.path.abspath(op) != os.path.abspath(new_abs):
                try:
                    os.remove(op)
                except Exception:
                    pass
        from services.image_service import ImageService
        ImageService._delete_same_stem_siblings(new_abs)
        _cleanup_temp_siblings(new_abs)
    except Exception:
        pass

@router.post("/element/{element_id}/reference-image")
async def upload_reference_image(element_id: int, file: UploadFile = File(...)):
    """上传参考图"""
    try:
        # 检查元素是否存在
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        # 验证文件扩展名
        ext = _get_image_extension(file.filename or 'image.png')
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"不支持的图片格式，仅支持: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")
        
        # 读取文件内容并检查大小
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"文件大小超过限制，最大允许 {MAX_FILE_SIZE // (1024*1024)}MB")
        
        # v3.61.202:语义命名 XX_名_参考图;原子写 → DB → 成功后清旧
        timestamp = int(time.time())
        _rel = await _build_asset_rel(element_id, "reference", ext) or f"ref_{element_id}_{timestamp}{ext}"
        images_dir = _ensure_images_dir()
        file_path = os.path.join(images_dir, _rel.replace("/", os.sep))
        _old_ref = element.get("reference_image")
        _write_image_atomic(file_path, content)

        # 更新数据库(成功后才清旧文件)
        reference_image_path = f"/data/images/{_rel}"
        await ExtractionService.update_element_image(
            element_id=element_id,
            reference_image=reference_image_path
        )
        _cleanup_old_asset_after_db(file_path, _old_ref)
        
        return {
            "success": True,
            "message": "参考图上传成功",
            "reference_image": reference_image_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传参考图失败: {str(e)}")


@router.post("/element/{element_id}/finished-image")
async def upload_finished_image(element_id: int, file: UploadFile = File(...)):
    """上传成品图（直接导入）"""
    try:
        # 检查元素是否存在
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        # 验证文件扩展名
        ext = _get_image_extension(file.filename or 'image.png')
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"不支持的图片格式，仅支持: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")
        
        # 读取文件内容并检查大小
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"文件大小超过限制，最大允许 {MAX_FILE_SIZE // (1024*1024)}MB")
        
        # v3.61.202:语义命名 类型_名;原子写 → DB → 成功后清旧
        timestamp = int(time.time())
        _rel = await _build_asset_rel(element_id, "finished", ext) or f"fin_{element_id}_{timestamp}{ext}"
        images_dir = _ensure_images_dir()
        file_path = os.path.join(images_dir, _rel.replace("/", os.sep))
        _old_fin = element.get("finished_image")
        _write_image_atomic(file_path, content)

        # 更新数据库(成功后才清旧文件)
        finished_image_path = f"/data/images/{_rel}"
        await ExtractionService.update_element_image(
            element_id=element_id,
            finished_image=finished_image_path,
            image_status=None
        )
        _cleanup_old_asset_after_db(file_path, _old_fin)
        
        return {
            "success": True,
            "message": "成品图上传成功",
            "finished_image": finished_image_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传成品图失败: {str(e)}")


@router.delete("/element/{element_id}/reference-image")
async def delete_reference_image(element_id: int):
    """删除参考图"""
    try:
        # 检查元素是否存在
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        reference_image = element.get("reference_image")
        if not reference_image:
            raise HTTPException(status_code=404, detail="该元素没有参考图")
        
        # 删除文件
        file_path = resolve_db_path(reference_image)  # v3.61.202:统一用 resolve_db_path,支持子目录+自定义媒体目录
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # 更新数据库
        await ExtractionService.update_element_image(
            element_id=element_id,
            reference_image=None
        )
        
        return {"success": True, "message": "参考图已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除参考图失败: {str(e)}")


@router.delete("/element/{element_id}/finished-image")
async def delete_finished_image(element_id: int):
    """删除成品图"""
    try:
        # 检查元素是否存在
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        finished_image = element.get("finished_image")
        if not finished_image:
            raise HTTPException(status_code=404, detail="该元素没有成品图")
        
        # 删除文件
        file_path = resolve_db_path(finished_image)  # v3.61.202:统一用 resolve_db_path,支持子目录+自定义媒体目录
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # 更新数据库
        await ExtractionService.update_element_image(
            element_id=element_id,
            finished_image=None
        )
        
        return {"success": True, "message": "成品图已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除成品图失败: {str(e)}")


@router.post("/element/{element_id}/generate-grid-image")
async def generate_grid_image(element_id: int, request: GenerateGridImageRequest):
    """
    为指定元素生成宫格图（两步生成流程）
    第一步：调用LLM生成详细图片提示词（模板内容 + 素材描述 → LLM → 详细prompt）
    第二步：调用图片模型生成宫格图（详细prompt + 成品图作为参考图 → 图片模型 → 宫格图）
    """
    try:
        if (
            int(request.llm_config_id or 0) in (-900001, -900002)
            or int(request.config_id or 0) in (-900001, -900002)
        ):
            raise HTTPException(
                status_code=409,
                detail="宫格图暂不支持官方算力，请选择本地大语言模型和图片模型配置",
            )
        # 获取元素信息
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        # 获取素材描述和成品图路径
        description = element.get("description", "")
        if not description:
            raise HTTPException(status_code=400, detail="元素没有描述，无法生成宫格图")
        
        finished_image_path = element.get("finished_image") or element.get("image_url")
        if not finished_image_path:
            raise HTTPException(status_code=400, detail="元素没有成品图或生成图，无法生成宫格图")
        
        # 获取宫格图模板
        from services.template_service import get_by_id as get_template_by_id
        template = await get_template_by_id(request.template_id)
        if not template:
            raise HTTPException(status_code=404, detail="宫格图模板不存在")

        template_content = template.get("content", "")
        if not template_content:
            raise HTTPException(status_code=400, detail="宫格图模板内容为空")

        # 上报使用计数(预置模板才计,异步失败静默)
        try:
            from services.template_service import report_usage as _report_template_usage
            await _report_template_usage(template)
        except Exception:
            pass

        # 第一步：调用LLM生成详细图片提示词
        from services.llm_service import LLMService
        
        # 解析模板变量并进行替换
        template_variables = json.loads(template.get("variables", "[]"))
        
        # 获取元素信息
        element_name = element.get("name", "")
        element_type = element.get("element_type", "")
        
        # 获取图片基础目录（用于读取文件做base64）
        data_base_dir = os.path.dirname(get_data_dir())
        
        # 构建变量映射
        # v3.60.20: 宫格图生成不再传 description — 用户反馈描述会干扰参考图
        # v3.61.38: 道具(prop)是例外 — 小物件 + 纹理细节多,文字描述才锁得住细节
        # v3.61.124 回滚:全类型都传 description
        #   原因:屏蔽描述后视觉 LLM 判定"时间/光照"不靠谱
        #         用户反馈"白天的参考图生成了晚上的版本"
        #         描述兜底比"瞎猜"稳得多;早期"描述干扰参考图"主要是模板太啰嗦,
        #         现在 Gemini 3 视觉理解强,描述跟参考图冲突时模型会自己权衡
        _desc_for_grid = description
        variable_map = {
            # 场景/元素名称相关
            "changjing": element_name,
            "name": element_name,
            "element_name": element_name,
            # 描述相关 — 道具传真实 description,角色/场景留空
            "description": _desc_for_grid,
            "material_desc": _desc_for_grid,
            # 图片路径相关（这些变量会被识别为图片变量）
            "changjing_image": finished_image_path,
            "image_url": finished_image_path,
            "element_image": finished_image_path,
            "reference_image": finished_image_path,
        }
        
        def is_image_path(value: str) -> bool:
            """判断值是否为图片路径"""
            if not value:
                return False
            lower = value.lower()
            return ('/data/images/' in lower or 
                    lower.endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')))
        
        # 替换模板变量
        prompt_content = template_content
        image_paths = []  # 收集需要作为多模态图片传入的路径
        has_replacement = False
        
        # 第一层：按模板定义的 variables 列表替换
        for var_name in template_variables:
            var_value = variable_map.get(var_name, "")
            if not var_value:
                continue
            
            # 双花括号优先检查（避免单花括号匹配到双花括号的子串）
            for fmt in [f"{{{{{var_name}}}}}", f"{{{var_name}}}"]:
                if fmt in prompt_content:
                    if is_image_path(str(var_value)):
                        # 图片变量：移除占位符，收集图片路径
                        prompt_content = prompt_content.replace(fmt, "")
                        image_paths.append(str(var_value))
                    else:
                        # 文本变量：正常替换
                        prompt_content = prompt_content.replace(fmt, str(var_value))
                    has_replacement = True
        
        # 第二层：如果模板没定义 variables，尝试直接匹配
        if not has_replacement:
            for var_name, var_value in variable_map.items():
                if not var_value:
                    continue
                # 双花括号优先检查（避免单花括号匹配到双花括号的子串）
                for fmt in [f"{{{{{var_name}}}}}", f"{{{var_name}}}"]:
                    if fmt in prompt_content:
                        if is_image_path(str(var_value)):
                            prompt_content = prompt_content.replace(fmt, "")
                            image_paths.append(str(var_value))
                        else:
                            prompt_content = prompt_content.replace(fmt, str(var_value))
                        has_replacement = True
        
        # 第三层：兜底拼接
        # v3.60.20: 兜底也不再附加 description,只给名称+类型,让 LLM 看参考图工作
        # v3.61.38: 道具兜底带 description(避免 LLM 视觉降级时瞎编)
        if not has_replacement:
            if element_type == "prop" and description:
                prompt_content = (
                    f"{template_content}\n\n【素材信息】\n"
                    f"名称:{element_name}\n类型:道具\n描述:{description}\n"
                    f"(参考图请见用户上传的图片;若 LLM 看不到图,请严格按描述还原)"
                )
            else:
                prompt_content = f"{template_content}\n\n【素材信息】\n名称:{element_name}\n类型:{element_type}\n(参考图请见用户上传的图片)"
        
        # 去重图片路径
        image_paths = list(dict.fromkeys(image_paths))
        
        # 构建LLM输入消息（支持多模态）
        if image_paths:
            # 多模态模式：文本 + 图片
            user_content = [{"type": "text", "text": prompt_content}]

            for img_path in image_paths:
                abs_path = resolve_db_path(img_path)
                if os.path.exists(abs_path):
                    with open(abs_path, "rb") as f:
                        img_data = base64.b64encode(f.read()).decode("utf-8")
                    ext = os.path.splitext(abs_path)[1].lower()
                    mime_map = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif'}
                    mime_type = mime_map.get(ext, 'image/jpeg')
                    user_content.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{img_data}"}
                    })

            llm_messages = [
                {"role": "system", "content": "你是一个专业的AI绘画提示词工程师。你的任务是根据提供的模板和素材信息（包括参考图片），生成一个详细的、高质量的AI绘画提示词。"},
                {"role": "user", "content": user_content}
            ]
        else:
            # 纯文本模式
            llm_messages = [
                {"role": "system", "content": "你是一个专业的AI绘画提示词工程师。你的任务是根据提供的模板和素材信息，生成一个详细的、高质量的AI绘画提示词。"},
                {"role": "user", "content": prompt_content}
            ]
        
        try:
            try:
                detailed_prompt = await LLMService.call_llm(
                    config_id=request.llm_config_id,
                    messages=llm_messages,
                    task_type="grid_image_prompt",
                    novel_id=element.get("novel_id")
                )
            except Exception as first_err:
                # 自动降级:如果用户选的 LLM 不支持视觉(image_url),自动 fallback 到纯文本模式
                # 触发条件:错误里出现 "unknown variant `image_url`" / "image_url" / "vision"
                # / "does not support" / "multimodal" 等关键字 + 我们这次确实带了图片
                err_str = str(first_err).lower()
                triggers = [
                    "image_url",
                    "unknown variant",
                    "vision",
                    "multimodal",
                    "does not support image",
                    "model does not support",
                    "unsupported content type",
                ]
                if image_paths and any(t in err_str for t in triggers):
                    print(f"[grid_image_prompt] LLM 不支持视觉,自动降级到纯文本模式: {first_err}", flush=True)
                    # 重建只含 text 的消息(把图片"丢弃",原 prompt_content 已包含详细描述)
                    # v3.61.38: 道具降级时 system 多加一句"严格按文字描述",避免 LLM 偏离参考图
                    _sys_msg = "你是一个专业的AI绘画提示词工程师。你的任务是根据提供的模板和素材信息，生成一个详细的、高质量的AI绘画提示词。"
                    if element_type == "prop":
                        _sys_msg += "本次为道具图,务必严格按用户提供的文字描述还原细节(材质/纹理/形状/色彩),不要凭空发挥。"
                    fallback_messages = [
                        {"role": "system", "content": _sys_msg},
                        {"role": "user", "content": prompt_content + "\n\n注:本次未提供参考图(当前 LLM 不支持视觉输入),请仅依据上述文字描述生成提示词。"}
                    ]
                    detailed_prompt = await LLMService.call_llm(
                        config_id=request.llm_config_id,
                        messages=fallback_messages,
                        task_type="grid_image_prompt",
                        novel_id=element.get("novel_id")
                    )
                else:
                    raise

            # 清理生成的prompt（去除可能的引号、多余空格等）
            detailed_prompt = detailed_prompt.strip().strip('"').strip("'")

            if not detailed_prompt:
                raise ValueError("LLM生成的提示词为空")

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LLM生成提示词失败: {str(e)}")

        # 第二步：调用图片模型生成宫格图
        result = await ImageService.generate_image(
            config_id=request.config_id,
            prompt=detailed_prompt,
            element_id=element_id,
            element_type=element.get("element_type"),
            novel_id=element.get("novel_id"),
            reference_image_path=finished_image_path,
            image_role="grid",  # v3.61.202:XX_名_宫格图
        )
        
        if result["success"]:
            _old_grid = element.get("grid_image")
            # 更新元素的 grid_image 字段
            await ExtractionService.update_element_image(
                element_id=element_id,
                grid_image=result["image_url"]
            )
            # v3.61.202:DB 成功后清旧宫格图
            _cleanup_old_asset_after_db(resolve_db_path(result["image_url"]), _old_grid)
            return {
                "success": True,
                "message": "宫格图生成成功",
                "grid_image": result["image_url"]
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成宫格图失败: {str(e)}")


class WatermarkRequest(BaseModel):
    face_mode: bool = False  # 面部覆盖模式(多脸图用)
    target: str = "auto"     # auto(优先 finished > image_url) / finished / image_url


@router.post("/element/{element_id}/watermark")
async def add_element_watermark(element_id: int, request: WatermarkRequest):
    """v3.61.130: 手动给人物素材打 AI 合规标识

    场景:用户已生成 / 已上传的人物图,想补打"此图由AI生成"水印
    限制:仅 character 类型;场景/道具拒绝
    """
    element = await _ensure_element_visible(element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")

    if element.get("element_type") != "character":
        raise HTTPException(status_code=400, detail="只有人物类型支持打 AI 合规标识")

    # 决定打哪张图(优先 finished_image,fallback image_url)
    finished = element.get("finished_image")
    image_url = element.get("image_url")
    target_field = ""
    target_path = ""
    if request.target == "finished" and finished:
        target_field, target_path = "finished_image", finished
    elif request.target == "image_url" and image_url:
        target_field, target_path = "image_url", image_url
    elif request.target == "auto":
        if finished:
            target_field, target_path = "finished_image", finished
        elif image_url:
            target_field, target_path = "image_url", image_url

    if not target_path:
        raise HTTPException(status_code=400, detail="该元素没有可打水印的图片")

    # resolve 路径
    from utils.paths import resolve_db_path
    abs_path = resolve_db_path(target_path)
    if not abs_path or not os.path.exists(abs_path):
        raise HTTPException(status_code=400, detail=f"图片文件不存在: {target_path}")

    # 调用 watermark_service
    try:
        from services.watermark_service import add_ai_watermark
        ok = add_ai_watermark(abs_path, face_mode=request.face_mode)
        if not ok:
            raise HTTPException(status_code=500, detail="打水印失败(底层 PIL 异常,详见后端日志)")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"打水印异常: {e}")

    updated = None
    if target_field == "finished_image":
        updated = await ExtractionService.update_element_image(element_id, finished_image=target_path)
    elif target_field == "image_url":
        updated = await ExtractionService.update_element_image(element_id, image_url=target_path)

    return {
        "success": True,
        "target_field": target_field,
        "image_path": target_path,
        "updated_at": (updated or {}).get("updated_at"),
        "face_mode": request.face_mode,
        "message": "AI 合规标识已添加" + ("(面部覆盖模式)" if request.face_mode else ""),
    }


@router.delete("/element/{element_id}/grid-image")
async def delete_grid_image(element_id: int):
    """删除宫格图"""
    try:
        # 检查元素是否存在
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        grid_image = element.get("grid_image")
        if not grid_image:
            raise HTTPException(status_code=404, detail="该元素没有宫格图")
        
        # 删除文件
        file_path = resolve_db_path(grid_image)  # v3.61.202:统一用 resolve_db_path,支持子目录+自定义媒体目录
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # 更新数据库
        await ExtractionService.update_element_image(
            element_id=element_id,
            grid_image=None
        )
        
        return {"success": True, "message": "宫格图已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除宫格图失败: {str(e)}")


@router.post("/element/{element_id}/grid-image")
async def upload_grid_image(element_id: int, file: UploadFile = File(...)):
    """上传宫格图（直接导入）"""
    try:
        # 检查元素是否存在
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        # 验证文件扩展名
        ext = _get_image_extension(file.filename or 'image.png')
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"不支持的图片格式，仅支持: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}")
        
        # 读取文件内容并检查大小
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"文件大小超过限制，最大允许 {MAX_FILE_SIZE // (1024*1024)}MB")
        
        # v3.61.202:语义命名 类型_名_宫格图;原子写 → DB → 成功后清旧
        timestamp = int(time.time())
        _rel = await _build_asset_rel(element_id, "grid", ext) or f"grid_{element_id}_{timestamp}{ext}"
        images_dir = _ensure_images_dir()
        file_path = os.path.join(images_dir, _rel.replace("/", os.sep))
        _old_grid = element.get("grid_image")
        _write_image_atomic(file_path, content)

        # 更新数据库(成功后才清旧文件)
        grid_image_path = f"/data/images/{_rel}"
        await ExtractionService.update_element_image(
            element_id=element_id,
            grid_image=grid_image_path
        )
        _cleanup_old_asset_after_db(file_path, _old_grid)
        
        return {
            "success": True,
            "message": "宫格图上传成功",
            "grid_image": grid_image_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传宫格图失败: {str(e)}")


# 允许的音频扩展名
ALLOWED_AUDIO_EXTENSIONS = {'.mp3', '.wav', '.m4a', '.ogg', '.flac'}
MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024  # 50MB
# 素材库按当前最宽的 Seedance 2.5 容差接收音频。具体提交时长仍由
# 当前视频模型二次校验：2.0 为 2-15s，2.5 用户口径为 2-30s。
JIMENG_AUDIO_MIN_DURATION = 1.8
JIMENG_AUDIO_MAX_DURATION = 30.2

def _get_audio_extension(filename: str) -> str:
    """获取音频扩展名"""
    ext = os.path.splitext(filename.lower())[1]
    return ext if ext in ALLOWED_AUDIO_EXTENSIONS else '.mp3'

def _probe_audio_duration_seconds(file_path: str) -> Optional[float]:
    """探测音频时长(秒)。失败返回 None,调用方按"未知时长"处理(放行)。

    走 ffmpeg(已经随包带在 resources/build/ffmpeg.exe)而不依赖 ffprobe — 我们打包没带 ffprobe。
    用 `ffmpeg -i file -hide_banner -f null -` 这种方式,从 stderr 解析 "Duration: HH:MM:SS.xx"
    """
    try:
        import subprocess, re as _re
        from services.video_service import VideoService
        vs = VideoService()
        ffmpeg_path = vs._get_ffmpeg_path()
        result = subprocess.run(
            [ffmpeg_path, "-hide_banner", "-i", file_path, "-f", "null", "-"],
            capture_output=True, text=True, timeout=10, encoding='utf-8', errors='replace'
        )
        # ffmpeg 把元数据输到 stderr,匹配 "Duration: 00:00:01.31, start: ..."
        m = _re.search(r'Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)', result.stderr or '')
        if m:
            h, mm, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
            return h * 3600 + mm * 60 + s
    except Exception:
        pass
    return None

def _ensure_audios_dir() -> str:
    """确保音频目录存在，返回目录路径"""
    audios_dir = media_subdir("audios")
    os.makedirs(audios_dir, exist_ok=True)
    return audios_dir

@router.post("/element/{element_id}/upload-audio")
async def upload_audio(element_id: int, file: UploadFile = File(...)):
    """上传音频文件（仅人物类型）"""
    try:
        # 检查元素是否存在
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        # 检查元素类型是否为人物
        if element.get("element_type") != "character":
            raise HTTPException(status_code=400, detail="只有人物类型支持上传音频")
        
        # 验证文件扩展名
        ext = _get_audio_extension(file.filename or 'audio.mp3')
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"不支持的音频格式，仅支持: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}")
        
        # 读取文件内容并检查大小
        content = await file.read()
        if len(content) > MAX_AUDIO_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"文件大小超过限制，最大允许 {MAX_AUDIO_FILE_SIZE // (1024*1024)}MB")
        
        # v3.61.263:音频与图片同结构存到 images/{小说名}/音频/音频_{角色名}{ext}
        #   (旧版存 data/audios/audio_{id}_{ts}.ext,目录散、不跟小说走;改成跟图片一致便于"文件目录"统一查看)
        from services.image_service import ImageService
        novel_part = ""
        try:
            _novel = await NovelService.get_by_id(element.get("novel_id"))
            if _novel and _novel.get("name"):
                novel_part = ImageService._safe_name_part(_novel.get("name"), 24)
        except Exception:
            pass
        if not novel_part:
            novel_part = "未命名小说"
        name_part = ImageService._safe_name_part(element.get("name"), 24) or f"角色{element_id}"
        rel_name = f"{novel_part}/音频/音频_{name_part}{ext}"  # 同名覆盖
        images_dir = media_subdir("images")
        file_path = os.path.join(images_dir, rel_name.replace("/", os.sep))
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # 保存文件
        with open(file_path, 'wb') as f:
            f.write(content)

        # 上传时按最宽的 2.5 容差探测；生成前再按所选 2.0/2.5 模型复核。
        try:
            dur = _probe_audio_duration_seconds(file_path)
            if dur is not None and (dur < JIMENG_AUDIO_MIN_DURATION or dur > JIMENG_AUDIO_MAX_DURATION):
                # 删掉刚保存的不合规文件
                try: os.remove(file_path)
                except Exception: pass
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"音频时长 {dur:.2f} 秒,不在即梦允许范围 "
                        f"[{JIMENG_AUDIO_MIN_DURATION:g}, {JIMENG_AUDIO_MAX_DURATION:g}] 秒内。"
                        "请提供约 2~30 秒的音频片段；提交时还会按所选模型复核。"
                    )
                )
        except HTTPException:
            raise
        except Exception:
            # ffprobe 出错(没装/路径不对)→ 不阻塞上传,后端生成时由即梦兜底报错
            pass

        # 删除旧的音频文件
        old_audio_file = element.get("audio_file")
        if old_audio_file:
            old_path = resolve_db_path(old_audio_file)  # v3.61.202:统一用 resolve_db_path,支持子目录+自定义媒体目录
            if old_path and os.path.exists(old_path) and os.path.abspath(old_path) != os.path.abspath(file_path):
                os.remove(old_path)
        
        # 更新数据库
        audio_file_path = f"/data/images/{rel_name}"
        updated = await ExtractionService.update_element_audio(
            element_id=element_id,
            audio_file=audio_file_path
        )
        
        return {
            "success": True,
            "message": "音频上传成功",
            "audio_file": audio_file_path,
            "updated_at": (updated or {}).get("updated_at"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传音频失败: {str(e)}")


@router.delete("/element/{element_id}/audio")
async def delete_audio(element_id: int):
    """删除音频文件"""
    try:
        # 检查元素是否存在
        element = await _ensure_element_visible(element_id)
        if not element:
            raise HTTPException(status_code=404, detail="元素不存在")
        
        audio_file = element.get("audio_file")
        if not audio_file:
            raise HTTPException(status_code=404, detail="该元素没有音频文件")
        
        # 删除文件
        file_path = resolve_db_path(audio_file)  # v3.61.202:统一用 resolve_db_path,支持子目录+自定义媒体目录
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # 更新数据库
        await ExtractionService.update_element_audio(
            element_id=element_id,
            audio_file=None
        )
        updated = await ExtractionService.update_element_voice(
            element_id=element_id,
            voice_id=None
        )

        return {"success": True, "message": "音频已删除", "audio_file": None, "voice_id": None, "updated_at": (updated or {}).get("updated_at")}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除音频失败: {str(e)}")


# ============================================================
# v3.61.x: 角色音色(TTS)— 第一步:列音色 / 绑音色 / 试听
# ============================================================

class BindVoiceRequest(BaseModel):
    voice_id: Optional[str] = None


class VoicePreviewRequest(BaseModel):
    voice_id: str
    text: Optional[str] = None


async def _copy_voice_source_to_standard_audio(
    src_path: str,
    element: dict,
    variant: Optional[dict] = None,
) -> str:
    """Copy a selected voice audio into the current novel's standard audio path."""
    if not src_path or not os.path.exists(src_path):
        raise HTTPException(status_code=400, detail="音频文件不存在,请重新选择音色")

    ext = os.path.splitext(src_path)[1].lower() or ".mp3"
    novel = await NovelService.get_by_id(element.get("novel_id"))
    novel_part = ImageService._safe_name_part((novel or {}).get("name"), 24) or "未命名小说"
    name_part = ImageService._safe_name_part(element.get("name"), 24) or f"角色{element.get('id') or element.get('element_id') or 'unknown'}"
    if variant:
        variant_part = ImageService._safe_name_part(variant.get("variant_name"), 24) or f"马甲{variant.get('id') or 'unknown'}"
        filename = f"音频_{name_part}_{variant_part}{ext}"
    else:
        filename = f"音频_{name_part}{ext}"
    rel_name = f"{novel_part}/音频/{filename}"
    dest_path = os.path.join(media_subdir("images"), rel_name.replace("/", os.sep))
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if os.path.abspath(src_path) != os.path.abspath(dest_path):
        import shutil
        shutil.copyfile(src_path, dest_path)
    return f"/data/images/{rel_name}"


VOICE_VIDEO_EXTENSIONS = {
    ".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".ts", ".mpeg", ".mpg"
}
MAX_VOICE_VIDEO_SIZE = 1024 * 1024 * 1024
VOICE_SOURCE_TTL_SECONDS = 60 * 60
_prepared_voice_sources: dict[str, dict[str, Any]] = {}


def _remove_prepared_voice_source(source_token: str, *, force: bool = False) -> bool:
    source = _prepared_voice_sources.get(source_token)
    if not source:
        return False
    if int(source.get("in_use") or 0) > 0 and not force:
        source["cleanup_requested"] = True
        return False
    _prepared_voice_sources.pop(source_token, None)
    if source.get("owned"):
        try:
            source_path = str(source.get("path") or "")
            if source_path and os.path.exists(source_path):
                os.remove(source_path)
        except OSError:
            logger.warning("[人声提取] 清理预处理源失败 token=%s", source_token)
    return True


def _expire_prepared_voice_sources() -> None:
    deadline = time.time() - VOICE_SOURCE_TTL_SECONDS
    for source_token, source in list(_prepared_voice_sources.items()):
        if int(source.get("in_use") or 0) <= 0 and float(source.get("last_access") or 0) < deadline:
            _remove_prepared_voice_source(source_token, force=True)


def _safe_media_folder_name(value: Any, fallback: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|\x00-\x1f]', '_', str(value or "")).strip().rstrip('.')
    return cleaned or fallback


@router.get("/element/{element_id}/voice-source-recommendation")
async def get_voice_source_recommendation(element_id: int):
    """Return the earliest source chapter's generated-video directory for a character."""
    element = await _ensure_element_visible(element_id)
    if element.get("element_type") != "character":
        raise HTTPException(status_code=400, detail="只有人物类型支持推荐音色来源目录")
    novel_id = int(element.get("novel_id") or 0)
    novel = await NovelService.get_by_id(novel_id)
    chapter_ids = element.get("chapter_ids") or []
    if isinstance(chapter_ids, str):
        try:
            chapter_ids = json.loads(chapter_ids)
        except (TypeError, ValueError):
            chapter_ids = []
    normalized_ids: list[int] = []
    for chapter_id in chapter_ids if isinstance(chapter_ids, list) else []:
        try:
            normalized_ids.append(int(chapter_id))
        except (TypeError, ValueError):
            continue

    chapter = None
    if normalized_ids:
        placeholders = ",".join("?" for _ in normalized_ids)
        db = await get_db()
        try:
            cursor = await db.execute(
                f"SELECT id, title, sort_order FROM chapters "
                f"WHERE novel_id = ? AND id IN ({placeholders}) ORDER BY sort_order, id LIMIT 1",
                (novel_id, *normalized_ids),
            )
            row = await cursor.fetchone()
            chapter = dict(row) if row else None
        finally:
            await db.close()

    videos_root = os.path.normpath(media_subdir("videos"))
    novel_dir = _safe_media_folder_name((novel or {}).get("name"), "未命名")
    novel_path = os.path.normpath(os.path.join(videos_root, novel_dir))
    chapter_title = str((chapter or {}).get("title") or "")
    target_path = novel_path
    if chapter_title:
        target_path = os.path.normpath(
            os.path.join(novel_path, _safe_media_folder_name(chapter_title, "未分章"))
        )
    default_path = target_path
    while default_path and not os.path.isdir(default_path):
        parent = os.path.dirname(default_path)
        if not parent or parent == default_path:
            default_path = videos_root
            break
        default_path = parent
    return {
        "success": True,
        "abs_path": target_path,
        "default_path": default_path if os.path.isdir(default_path) else videos_root,
        "exists": os.path.isdir(target_path),
        "novel_id": novel_id,
        "novel_name": (novel or {}).get("name") or "未命名",
        "chapter_id": (chapter or {}).get("id"),
        "chapter_title": chapter_title,
    }


@router.post("/voice-source/prepare")
async def prepare_voice_source(
    file: Optional[UploadFile] = File(None),
    local_path: Optional[str] = Form(None),
):
    """Prepare one source video once and return a compact waveform for range selection."""
    from services.vocal_extraction_service import VocalExtractionError, analyze_audio_waveform

    _expire_prepared_voice_sources()
    if not file and not local_path:
        raise HTTPException(status_code=400, detail="请选择一个包含人物对白的视频")
    source_token = secrets.token_urlsafe(18)
    owned = bool(file)
    source_path = ""
    filename = ""
    registered = False
    work_dir = os.path.join(get_data_dir(), "temp", "voice-extract")
    os.makedirs(work_dir, exist_ok=True)
    try:
        if file:
            filename = file.filename or "voice.mp4"
            suffix = os.path.splitext(filename)[1].lower()
            if suffix not in VOICE_VIDEO_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的视频格式，仅支持: {', '.join(sorted(VOICE_VIDEO_EXTENSIONS))}",
                )
            source_path = os.path.join(work_dir, f"prepared_{source_token}{suffix}")
            total = 0
            with open(source_path, "wb") as output:
                while True:
                    chunk = await file.read(4 * 1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_VOICE_VIDEO_SIZE:
                        raise HTTPException(status_code=413, detail="视频文件超过 1GB，建议先裁出包含对白的片段")
                    output.write(chunk)
            if total == 0:
                raise HTTPException(status_code=400, detail="上传的视频为空")
        else:
            source_path = os.path.abspath(os.path.expanduser(str(local_path or "").strip()))
            filename = os.path.basename(source_path)
            suffix = os.path.splitext(source_path)[1].lower()
            if suffix not in VOICE_VIDEO_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的视频格式，仅支持: {', '.join(sorted(VOICE_VIDEO_EXTENSIONS))}",
                )
            if not os.path.isfile(source_path):
                raise HTTPException(status_code=400, detail="所选视频文件不存在，请重新选择")
            if os.path.getsize(source_path) > MAX_VOICE_VIDEO_SIZE:
                raise HTTPException(status_code=413, detail="视频文件超过 1GB，建议先裁出包含对白的片段")

        try:
            waveform = await asyncio.to_thread(analyze_audio_waveform, source_path)
        except VocalExtractionError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        now = time.time()
        _prepared_voice_sources[source_token] = {
            "path": source_path,
            "filename": filename,
            "owned": owned,
            "created_at": now,
            "last_access": now,
            "in_use": 0,
            "cleanup_requested": False,
        }
        registered = True
        return {
            "success": True,
            "source_token": source_token,
            "filename": filename,
            "duration": waveform.get("duration"),
            "waveform": waveform.get("peaks") or [],
            "media_url": f"/api/extraction/voice-source/{source_token}/media",
        }
    finally:
        if owned and not registered and source_path and os.path.exists(source_path):
            try:
                os.remove(source_path)
            except OSError:
                pass
        if file:
            try:
                await file.close()
            except Exception:
                pass


@router.get("/voice-source/{source_token}/media")
async def stream_prepared_voice_source(source_token: str, request: Request):
    """Stream a prepared source so Electron dev and packaged builds share one preview path."""
    _expire_prepared_voice_sources()
    source = _prepared_voice_sources.get(source_token)
    source_path = str((source or {}).get("path") or "")
    if not source or not os.path.isfile(source_path):
        raise HTTPException(status_code=404, detail="视频源已失效，请重新选择视频")
    source["last_access"] = time.time()
    file_size = os.path.getsize(source_path)
    media_type = "video/" + (os.path.splitext(source_path)[1].lower().lstrip(".") or "mp4")
    if media_type == "video/mov":
        media_type = "video/quicktime"
    base_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
    }
    range_header = request.headers.get("range")
    if not range_header:
        return FileResponse(source_path, media_type=media_type, headers=base_headers)

    if not range_header.startswith("bytes=") or file_size <= 0:
        return Response(
            status_code=416,
            headers={**base_headers, "Content-Range": f"bytes */{file_size}"},
        )
    range_value = range_header.removeprefix("bytes=").split(",", 1)[0].strip()
    start_text, _, end_text = range_value.partition("-")
    try:
        if start_text == "":
            suffix_length = int(end_text)
            if suffix_length <= 0:
                raise ValueError
            start = max(file_size - suffix_length, 0)
            end = file_size - 1
        else:
            start = int(start_text)
            end = int(end_text) if end_text else file_size - 1
    except (TypeError, ValueError):
        return Response(
            status_code=416,
            headers={**base_headers, "Content-Range": f"bytes */{file_size}"},
        )
    end = min(end, file_size - 1)
    if start < 0 or start >= file_size or end < start:
        return Response(
            status_code=416,
            headers={**base_headers, "Content-Range": f"bytes */{file_size}"},
        )
    content_length = end - start + 1

    def iter_file_range():
        with open(source_path, "rb") as media_file:
            media_file.seek(start)
            remaining = content_length
            while remaining > 0:
                chunk = media_file.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    return StreamingResponse(
        iter_file_range(),
        status_code=206,
        media_type=media_type,
        headers={
            **base_headers,
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(content_length),
        },
    )


@router.delete("/voice-source/{source_token}")
async def cleanup_voice_source(source_token: str):
    removed = _remove_prepared_voice_source(source_token)
    return {"success": True, "removed": removed}


@router.post("/element/{element_id}/extract-voice-from-video")
async def extract_character_voice_from_video(
    element_id: int,
    file: Optional[UploadFile] = File(None),
    start_time: float = Form(...),
    duration: float = Form(5.0),
    variant_id: Optional[int] = Form(None),
    source_token: Optional[str] = Form(None),
    repeat_to_seconds: Optional[float] = Form(None),
):
    """Separate vocals from a selected video segment and bind them to a character."""
    from services import voice_service
    from services.vocal_extraction_service import VocalExtractionError, extract_vocals_from_video

    element = await _ensure_element_visible(element_id)
    if element.get("element_type") != "character":
        raise HTTPException(status_code=400, detail="只有人物类型支持从视频提取音色")
    variant = None
    if variant_id is not None:
        variant = await _ensure_variant_visible(variant_id)
        if int(variant.get("element_id") or 0) != int(element_id):
            raise HTTPException(status_code=400, detail="所选马甲不属于当前人物")
    if start_time < 0:
        raise HTTPException(status_code=400, detail="起始时间不能小于 0 秒")
    if not JIMENG_AUDIO_MIN_DURATION <= duration <= JIMENG_AUDIO_MAX_DURATION:
        raise HTTPException(status_code=400, detail="人声片段需约为 2-30 秒（实际容差 1.8-30.2 秒）")
    if repeat_to_seconds is not None and not duration < repeat_to_seconds <= JIMENG_AUDIO_MAX_DURATION:
        raise HTTPException(status_code=400, detail="循环补足时长必须大于当前选区且不超过 30 秒")

    work_dir = os.path.join(get_data_dir(), "temp", "voice-extract")
    os.makedirs(work_dir, exist_ok=True)
    token = secrets.token_hex(8)
    video_path = ""
    wav_path = os.path.join(work_dir, f"vocals_{element_id}_{token}.wav")
    direct_upload = False
    prepared_source = None
    try:
        if source_token:
            _expire_prepared_voice_sources()
            prepared_source = _prepared_voice_sources.get(source_token)
            if not prepared_source or not os.path.isfile(str(prepared_source.get("path") or "")):
                raise HTTPException(status_code=400, detail="视频源已失效，请重新选择视频")
            prepared_source["in_use"] = int(prepared_source.get("in_use") or 0) + 1
            prepared_source["last_access"] = time.time()
            video_path = str(prepared_source.get("path"))
        elif file:
            suffix = os.path.splitext(file.filename or "voice.mp4")[1].lower()
            if suffix not in VOICE_VIDEO_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"不支持的视频格式，仅支持: {', '.join(sorted(VOICE_VIDEO_EXTENSIONS))}",
                )
            video_path = os.path.join(work_dir, f"source_{element_id}_{token}{suffix}")
            direct_upload = True
            total = 0
            with open(video_path, "wb") as output:
                while True:
                    chunk = await file.read(4 * 1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_VOICE_VIDEO_SIZE:
                        raise HTTPException(status_code=413, detail="视频文件超过 1GB，建议先裁出包含对白的片段")
                    output.write(chunk)
            if total == 0:
                raise HTTPException(status_code=400, detail="上传的视频为空")
        else:
            raise HTTPException(status_code=400, detail="请选择视频或重新载入音轨")

        try:
            report = await asyncio.to_thread(
                extract_vocals_from_video,
                video_path,
                wav_path,
                start_time=float(start_time),
                duration=float(duration),
                repeat_to_seconds=float(repeat_to_seconds) if repeat_to_seconds else None,
            )
        except VocalExtractionError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        audio_file = await _copy_voice_source_to_standard_audio(wav_path, element, variant)
        destination = resolve_db_path(audio_file)
        if variant:
            old_audio = variant.get("audio_file")
            updated = await ExtractionService.update_variant(variant_id, audio_file=audio_file)
            voice_id = voice_service.local_audio_voice_id(audio_file)
        else:
            old_audio = element.get("audio_file")
            updated = await ExtractionService.update_element_audio(element_id, audio_file)
            voice_id = voice_service.local_audio_voice_id(audio_file)
            updated = await ExtractionService.update_element_voice(element_id, voice_id) or updated
        if old_audio:
            old_path = resolve_db_path(old_audio)
            if old_path and destination and os.path.abspath(old_path) != os.path.abspath(destination):
                _safe_remove_file(old_audio)

        return {
            "success": True,
            "voice_id": voice_id,
            "audio_file": audio_file,
            "updated_at": (updated or {}).get("updated_at"),
            "report": report,
            "voices": await voice_service.list_voices(element_id=element_id),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("[人声提取] element=%s 提取失败", element_id)
        raise HTTPException(status_code=500, detail=f"本地人声提取失败: {exc}") from exc
    finally:
        if file:
            try:
                await file.close()
            except Exception:
                pass
        if prepared_source is not None:
            prepared_source["in_use"] = max(0, int(prepared_source.get("in_use") or 0) - 1)
            prepared_source["last_access"] = time.time()
            if prepared_source.get("cleanup_requested") and source_token:
                _remove_prepared_voice_source(source_token)
        temp_paths = [wav_path]
        if direct_upload and video_path:
            temp_paths.append(video_path)
        for temp_path in temp_paths:
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except OSError:
                pass


@router.post("/voices/preview")
async def voice_preview_standalone(req: VoicePreviewRequest):
    """无角色上下文的音色试听。用于生成打包预置试听资产。"""
    from services import voice_service
    res = await voice_service.synthesize_preview(
        element_id=0,
        voice_id=req.voice_id,
        novel_id=None,
        novel_name=None,
        character_name=None,
        text=req.text or voice_service.DEMO_TEXT,
    )
    if not res.get("success"):
        raise HTTPException(status_code=502, detail=res.get("message") or "语音合成失败")
    return res


@router.post("/element/{element_id}/voice")
async def bind_voice(element_id: int, req: BindVoiceRequest):
    """给角色绑定音色 voice_id。"""
    from services import voice_service
    element = await _ensure_element_visible(element_id)
    if element.get("element_type") != "character":
        raise HTTPException(status_code=400, detail="只有人物类型支持音色")
    audio_file_path = None
    voice_id_to_save = req.voice_id
    if req.voice_id:
        src_path = await voice_service.resolve_voice_audio_source_path(req.voice_id)
        if not src_path:
            raise HTTPException(status_code=400, detail="该音色没有可用的本地音频,请重新导入或更新音色资源")
        audio_file_path = await _copy_voice_source_to_standard_audio(src_path, element)
        updated = await ExtractionService.update_element_audio(element_id, audio_file_path)
    else:
        old_audio = element.get("audio_file")
        if old_audio:
            _safe_remove_file(old_audio)
        updated = await ExtractionService.update_element_audio(element_id, None)
    updated = await ExtractionService.update_element_voice(element_id, voice_id_to_save) or updated
    res = {"success": True, "voice_id": voice_id_to_save}
    if audio_file_path is not None:
        res["audio_file"] = audio_file_path
    res["updated_at"] = (updated or {}).get("updated_at")
    return res


@router.post("/variant/{variant_id}/voice")
async def bind_variant_voice(variant_id: int, req: BindVoiceRequest):
    """给人物马甲绑定音色音频。

    预制音色走打包试听音频,「我的」外部音频走工具级 data/audios;
    绑定时统一复制到当前剧本标准路径:
    images/{剧名}/音频/音频_{角色名}_{马甲名}.ext,然后写 character_variants.audio_file。
    """
    from services import voice_service
    variant = await _ensure_variant_visible(variant_id)
    element = await _ensure_element_visible(variant.get("element_id"))
    if element.get("element_type") != "character":
        raise HTTPException(status_code=400, detail="只有人物马甲支持音色")

    audio_file_path = None
    voice_id_to_return = req.voice_id
    if req.voice_id:
        src_path = await voice_service.resolve_voice_audio_source_path(req.voice_id)
        if not src_path:
            raise HTTPException(status_code=400, detail="该音色没有可用的本地音频,请重新导入或更新音色资源")
        audio_file_path = await _copy_voice_source_to_standard_audio(src_path, element, variant)
        dest_path = resolve_db_path(audio_file_path)
        old_audio = variant.get("audio_file")
        if old_audio:
            old_path = resolve_db_path(old_audio)
            if old_path and os.path.exists(old_path) and os.path.abspath(old_path) != os.path.abspath(dest_path):
                try:
                    os.remove(old_path)
                except Exception:
                    pass
        updated = await ExtractionService.update_variant(variant_id, audio_file=audio_file_path)
        voice_id_to_return = voice_service.local_audio_voice_id(audio_file_path)
    else:
        old_audio = variant.get("audio_file")
        if old_audio:
            _safe_remove_file(old_audio)
        updated = await ExtractionService.update_variant(variant_id, audio_file=None)
    return {"success": True, "voice_id": voice_id_to_return, "audio_file": audio_file_path, "updated_at": (updated or {}).get("updated_at")}


@router.post("/element/{element_id}/voice-preview")
async def voice_preview(element_id: int, req: VoicePreviewRequest):
    """合成 ≤5s 试听 demo,返回可播放 url(不改角色绑定)。"""
    from services import voice_service
    element = await _ensure_element_visible(element_id)
    if element.get("element_type") != "character":
        raise HTTPException(status_code=400, detail="只有人物类型支持音色")
    novel = await NovelService.get_by_id(element.get("novel_id"))
    res = await voice_service.synthesize_preview(
        element_id=element_id,
        voice_id=req.voice_id,
        novel_id=element.get("novel_id"),
        novel_name=(novel or {}).get("name"),
        character_name=element.get("name"),
        text=req.text or voice_service.DEMO_TEXT,
    )
    if not res.get("success"):
        raise HTTPException(status_code=502, detail=res.get("message") or "语音合成失败")
    return res


# ============================================================
# v3.61.158: 人物马甲(variants)— 11 个端点
# ============================================================

@router.get("/element/{element_id}/variants", response_model=List[CharacterVariantResponse])
async def list_character_variants(element_id: int):
    """列出人物的所有马甲(按 sort_order + id 升序)"""
    el = await _ensure_element_visible(element_id)
    if not el:
        raise HTTPException(404, "元素不存在")
    if el.get("element_type") != "character":
        raise HTTPException(400, "马甲只支持人物类型")
    return await ExtractionService.list_variants(element_id)


@router.post("/element/{element_id}/variants", response_model=CharacterVariantResponse)
async def create_character_variant(element_id: int, req: CharacterVariantCreate):
    """新建一个马甲

    v3.61.163: 本体有成品图就默认复制一份当马甲参考图(方便后续 AI 生马甲图有形象基准)
        - 关键:必须 copy 文件不能共用路径(variant DELETE 会调 _safe_remove_file,共用会误删本体)
        - 失败不阻断新建马甲(toast 也不弹,后台 log 即可)
    """
    try:
        v = await ExtractionService.create_variant(element_id, req.variant_name, req.description)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not v:
        raise HTTPException(404, "元素不存在")

    # 默认继承本体的图作为参考图
    # v3.61.164: fallback 链 — finished_image(成品)→ image_url(AI 生)→ reference_image(本体参考)
    #            原先只看 finished_image,如果用户本体只生成过 AI 图没上传成品图,继承不到
    try:
        el = await _ensure_element_visible(element_id)
        body_src = None
        body_kind = ""
        if el:
            if el.get("finished_image"):
                body_src, body_kind = el["finished_image"], "finished"
            elif el.get("image_url"):
                body_src, body_kind = el["image_url"], "image_url"
            elif el.get("reference_image"):
                body_src, body_kind = el["reference_image"], "reference"
        if body_src:
            src_abs = resolve_db_path(body_src)
            if src_abs and os.path.exists(src_abs):
                import shutil
                src_ext = (os.path.splitext(src_abs)[1] or '.png').lower()
                if src_ext not in ALLOWED_IMAGE_EXTENSIONS:
                    src_ext = '.png'
                ts = int(time.time() * 1000)
                # v3.61.202:角色_名_马甲名_参考图,小说/角色/ 子目录,同名覆盖
                _rel = await _build_asset_rel(element_id, "variant_reference", src_ext,
                                              variant_name=v.get("variant_name")) \
                       or f"variant_ref_{v['id']}_inherited_{ts}{src_ext}"
                target_dir = media_subdir("images")
                target_abs = os.path.join(target_dir, _rel.replace("/", os.sep))
                os.makedirs(os.path.dirname(target_abs), exist_ok=True)
                shutil.copy2(src_abs, target_abs)
                inherited_rel = f"data/images/{_rel}"
                await ExtractionService.update_variant(v['id'], reference_image=inherited_rel)
                # v3.61.202:DB 成功后再清同 stem 兄弟
                try:
                    from services.image_service import ImageService
                    ImageService._delete_same_stem_siblings(target_abs)
                except Exception:
                    pass
                logger.info(f"[create_variant] 继承本体图({body_kind}): variant={v['id']} → {inherited_rel}")
                # 重新拿最新带 reference_image 的 v
                v = await ExtractionService.get_variant(v['id']) or v
    except Exception as _e:
        # 继承失败不阻断新建马甲 — 用户后续可以手动上传参考图
        logger.warning(f"[create_variant] 继承本体图失败,跳过: element={element_id} err={_e}")

    return v


@router.put("/variant/{variant_id}", response_model=CharacterVariantResponse)
async def update_character_variant(variant_id: int, req: CharacterVariantUpdate):
    """改马甲名称 / 描述 / 排序"""
    await _ensure_variant_visible(variant_id)
    updates = req.model_dump(exclude_unset=True, exclude_none=True)
    v = await ExtractionService.update_variant(variant_id, **updates)
    if not v:
        raise HTTPException(404, "马甲不存在")
    return v


@router.delete("/variant/{variant_id}")
async def delete_character_variant(variant_id: int):
    """删马甲(同事务清掉 element.active_variant_id 防坏引用)
    v3.61.158 codex round9 #3: 连带清所有附属本地文件(参考图/成品图/AI 生图/音频)
    """
    # 先抓 variant 字段(DB delete 后就拿不到了)
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    paths_to_clean = [v.get("reference_image"), v.get("finished_image"), v.get("image_url"), v.get("audio_file")]
    ok = await ExtractionService.delete_variant(variant_id)
    if not ok:
        # 不该发生:get_variant 拿到了 delete_variant 反而 False — 防御
        raise HTTPException(404, "马甲不存在")
    # DB 成功后再清文件(防文件清了 DB 没动 → 引用孤儿)
    for p in paths_to_clean:
        _safe_remove_file(p)
    return {"success": True}


@router.post("/element/{element_id}/active-variant")
async def set_active_variant(element_id: int, req: SetActiveVariantRequest):
    """切换 element 的当前默认马甲(variant_id=null → 回归本体)"""
    el = await _ensure_element_visible(element_id)
    if not el:
        raise HTTPException(404, "元素不存在")
    if el.get("element_type") != "character":
        raise HTTPException(400, "马甲只支持人物类型")
    try:
        await ExtractionService.set_active_variant(element_id, req.variant_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"success": True, "active_variant_id": req.variant_id}


# ----- variant 专属图/音频上传(不复用 element 端点,避免写回本体) -----

def _safe_remove_file(rel_path: Optional[str]) -> None:
    """v3.61.158 codex round9 #3: variant 删除端点的本地文件清理 — 跟本体行为对齐,防孤儿
    rel_path 是 DB 里存的相对路径(如 'data/images/variant_xxx.jpg');
    解析到磁盘绝对路径后 os.remove。任何异常都吞掉(文件不存在/权限等),只输出日志
    """
    if not rel_path:
        return
    try:
        from utils.paths import resolve_db_path
        abs_path = resolve_db_path(rel_path)
        if abs_path and os.path.exists(abs_path):
            os.remove(abs_path)
    except Exception as e:
        logger.warning(f"[variant-delete] 清理本地文件失败 {rel_path}: {e}")


async def _build_asset_rel(element_id: int, image_role: str, ext: str,
                           variant_name: str = None) -> Optional[str]:
    """v3.61.202:给上传端点算「小说/类型/语义名.ext」相对路径片段。
    取 element 的 novel_id/type/name → 复用 ImageService._build_image_filename。失败返 None(走老命名)。"""
    try:
        el = await _ensure_element_visible(element_id)
        if not el:
            return None
        from services.image_service import ImageService
        return await ImageService._build_image_filename(
            novel_id=el.get("novel_id"),
            element_id=element_id,
            element_type=el.get("element_type"),
            ext=ext,
            image_role=image_role,
            variant_name=variant_name,
        )
    except Exception as _e:
        logger.warning(f"[asset-rel] 算语义路径失败 element={element_id} role={image_role}: {_e}")
        return None


async def _save_uploaded_file(file_obj: UploadFile, subdir: str, prefix: str, kind: str,
                              full_rel_name: str = None) -> str:
    """v3.61.158 codex P3 修:加白名单扩展名 + 大小校验(跟本体上传同款)
    kind="image" → ALLOWED_IMAGE_EXTENSIONS / MAX_FILE_SIZE (50MB)
    kind="audio" → ALLOWED_AUDIO_EXTENSIONS / MAX_AUDIO_FILE_SIZE (50MB)
    v3.61.202:full_rel_name 非空时用它当语义文件名(可含子目录,同名覆盖 + 同 stem 清理),
              否则走老的 {prefix}_{ts}.{ext}。
    返回 data/{subdir}/{文件名或子路径}
    """
    fname = file_obj.filename or f"{prefix}.bin"
    if kind == "image":
        ext = _get_image_extension(fname)
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(400, f"不支持的图片格式,仅支持: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}")
        max_size = MAX_FILE_SIZE
        max_label = f"{MAX_FILE_SIZE // (1024*1024)}MB"
    elif kind == "audio":
        ext = _get_audio_extension(fname)
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(400, f"不支持的音频格式,仅支持: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}")
        max_size = MAX_AUDIO_FILE_SIZE
        max_label = f"{MAX_AUDIO_FILE_SIZE // (1024*1024)}MB"
    else:
        raise HTTPException(500, f"_save_uploaded_file: 未知 kind={kind}")

    content = await file_obj.read()
    if len(content) > max_size:
        raise HTTPException(400, f"文件大小超过限制,最大允许 {max_label}")

    target_dir = media_subdir(subdir)
    if full_rel_name:
        # v3.61.202:语义命名(可含子目录),原子写防截断;同 stem 清理交调用方 DB 成功后做
        out_filename = full_rel_name
        out_abs = os.path.join(target_dir, full_rel_name.replace("/", os.sep))
        _write_image_atomic(out_abs, content)
    else:
        ts = int(time.time() * 1000)
        out_filename = f"{prefix}_{ts}{ext}"
        out_abs = os.path.join(target_dir, out_filename)
        with open(out_abs, "wb") as f:
            f.write(content)
    return f"data/{subdir}/{out_filename}"


@router.post("/variant/{variant_id}/reference-image")
async def upload_variant_reference_image(variant_id: int, file: UploadFile = File(...)):
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    # v3.61.202:角色_名_马甲名_参考图
    _ext = _get_image_extension(file.filename or "image.png")
    _rel_name = await _build_asset_rel(v["element_id"], "variant_reference", _ext,
                                       variant_name=v.get("variant_name"))
    rel = await _save_uploaded_file(file, "images", f"variant_ref_{variant_id}", kind="image",
                                    full_rel_name=_rel_name)
    # v3.61.202:先更 DB,成功后才清旧(旧 DB 路径文件 + 同 stem 兄弟)
    _old = v.get("reference_image")
    await ExtractionService.update_variant(variant_id, reference_image=rel)
    _cleanup_old_asset_after_db(resolve_db_path(rel), _old)
    return {"success": True, "reference_image": rel}


@router.delete("/variant/{variant_id}/reference-image")
async def delete_variant_reference_image(variant_id: int):
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    _safe_remove_file(v.get("reference_image"))  # round9 #3: 清本地文件
    await ExtractionService.update_variant(variant_id, reference_image=None)
    return {"success": True}


@router.post("/variant/{variant_id}/finished-image")
async def upload_variant_finished_image(variant_id: int, file: UploadFile = File(...)):
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    # v3.61.202:角色_名_马甲名
    _ext = _get_image_extension(file.filename or "image.png")
    _rel_name = await _build_asset_rel(v["element_id"], "variant_finished", _ext,
                                       variant_name=v.get("variant_name"))
    rel = await _save_uploaded_file(file, "images", f"variant_finished_{variant_id}", kind="image",
                                    full_rel_name=_rel_name)
    # v3.61.202:先更 DB,成功后才清旧(旧 DB 路径文件 + 同 stem 兄弟)
    _old = v.get("finished_image")
    await ExtractionService.update_variant(variant_id, finished_image=rel)
    _cleanup_old_asset_after_db(resolve_db_path(rel), _old)
    return {"success": True, "finished_image": rel}


@router.delete("/variant/{variant_id}/finished-image")
async def delete_variant_finished_image(variant_id: int):
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    _safe_remove_file(v.get("finished_image"))  # round9 #3
    await ExtractionService.update_variant(variant_id, finished_image=None)
    return {"success": True}


# v3.61.158 round8: 给 variant 打 AI 合规水印(跟 element 同款,但目标改成 variant 字段)
@router.post("/variant/{variant_id}/watermark")
async def add_variant_watermark(variant_id: int, request: WatermarkRequest):
    """给 variant 的图打 AI 合规水印 — 跟 /element/{id}/watermark 同款,目标字段换成 variant"""
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    finished = v.get("finished_image")
    image_url = v.get("image_url")
    target_field = ""
    target_path = ""
    if request.target == "finished" and finished:
        target_field, target_path = "finished_image", finished
    elif request.target == "image_url" and image_url:
        target_field, target_path = "image_url", image_url
    elif request.target == "auto":
        if finished:
            target_field, target_path = "finished_image", finished
        elif image_url:
            target_field, target_path = "image_url", image_url
    if not target_path:
        raise HTTPException(400, "该马甲没有可打水印的图片")
    from utils.paths import resolve_db_path
    abs_path = resolve_db_path(target_path)
    if not abs_path or not os.path.exists(abs_path):
        raise HTTPException(400, f"图片文件不存在: {target_path}")
    try:
        from services.watermark_service import add_ai_watermark
        ok = add_ai_watermark(abs_path, face_mode=request.face_mode)
        if not ok:
            raise HTTPException(500, "打水印失败(底层 PIL 异常,详见后端日志)")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"打水印异常: {e}")
    updated = None
    if target_field == "finished_image":
        updated = await ExtractionService.update_variant(variant_id, finished_image=target_path)
    elif target_field == "image_url":
        updated = await ExtractionService.update_variant(variant_id, image_url=target_path)
    return {
        "success": True,
        "target_field": target_field,
        "image_path": target_path,
        "updated_at": (updated or {}).get("updated_at"),
        "face_mode": request.face_mode,
        "message": "AI 合规标识已添加" + ("(面部覆盖模式)" if request.face_mode else ""),
    }


# v3.61.158 round8: 删除 variant 的 AI 生图(image_url)
@router.delete("/variant/{variant_id}/image")
async def delete_variant_image(variant_id: int):
    """删 variant 的 AI 生图(image_url + image_status + image_prompt 一起清)"""
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    _safe_remove_file(v.get("image_url"))  # round9 #3
    await ExtractionService.update_variant(
        variant_id,
        image_url=None,
        image_status=None,
        image_prompt=None,
    )
    return {"success": True}


@router.post("/variant/{variant_id}/audio")
async def upload_variant_audio(variant_id: int, file: UploadFile = File(...)):
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    # v3.61.263:马甲音频与图片/本体音频同结构,存 images/{小说名}/音频/音频_{角色名}_{马甲名}{ext}
    from services.image_service import ImageService
    ext = _get_audio_extension(file.filename or 'audio.mp3')
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的音频格式,仅支持: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}")
    el = await ExtractionService.get_element(v.get("element_id"))
    novel_part = ""
    try:
        if el and el.get("novel_id"):
            _novel = await NovelService.get_by_id(el.get("novel_id"))
            if _novel and _novel.get("name"):
                novel_part = ImageService._safe_name_part(_novel.get("name"), 24)
    except Exception:
        pass
    if not novel_part:
        novel_part = "未命名小说"
    char_part = ImageService._safe_name_part((el or {}).get("name"), 24) or f"角色{(el or {}).get('id', '')}"
    variant_part = ImageService._safe_name_part(v.get("variant_name"), 24) or f"马甲{variant_id}"
    rel_name = f"{novel_part}/音频/音频_{char_part}_{variant_part}{ext}"  # 同名覆盖
    images_dir = media_subdir("images")
    dest = os.path.join(images_dir, rel_name.replace("/", os.sep))
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    content = await file.read()
    if len(content) > MAX_AUDIO_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"文件大小超过限制,最大 {MAX_AUDIO_FILE_SIZE // (1024*1024)}MB")
    with open(dest, 'wb') as _f:
        _f.write(content)
    rel = f"/data/images/{rel_name}"
    # v3.61.158 codex P2: 同款即梦时长校验 — 跟本体音频上传一致
    abs_path = resolve_db_path(rel)
    try:
        dur = _probe_audio_duration_seconds(abs_path)
        if dur is not None and (dur < JIMENG_AUDIO_MIN_DURATION or dur > JIMENG_AUDIO_MAX_DURATION):
            try: os.remove(abs_path)
            except Exception: pass
            raise HTTPException(
                status_code=400,
                detail=(
                    f"音频时长 {dur:.2f} 秒,不在即梦允许范围 "
                    f"[{JIMENG_AUDIO_MIN_DURATION:g}, {JIMENG_AUDIO_MAX_DURATION:g}] 秒。"
                    "请提供约 2~30 秒的片段；提交时还会按所选模型复核。"
                )
            )
    except HTTPException:
        raise
    except Exception:
        # ffprobe 没装 / 路径不对 → 不阻塞,后端生成时由即梦兜底报错(跟本体路径同款降级)
        pass
    # 删旧音频(仅当路径不同,避免同名覆盖时删掉刚写的新文件)
    old_audio = v.get("audio_file")
    if old_audio:
        old_path = resolve_db_path(old_audio)
        if old_path and os.path.exists(old_path) and os.path.abspath(old_path) != os.path.abspath(dest):
            try: os.remove(old_path)
            except Exception: pass
    updated = await ExtractionService.update_variant(variant_id, audio_file=rel)
    return {"success": True, "audio_file": rel, "updated_at": (updated or {}).get("updated_at")}


@router.delete("/variant/{variant_id}/audio")
async def delete_variant_audio(variant_id: int):
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    _safe_remove_file(v.get("audio_file"))  # round9 #3
    updated = await ExtractionService.update_variant(variant_id, audio_file=None)
    return {"success": True, "updated_at": (updated or {}).get("updated_at")}


# ----- variant 生图(自己组 prompt,不让通用 generate_image 偷读 element) -----

class GenerateVariantImageRequest(BaseModel):
    config_id: int


@router.post("/variant/{variant_id}/generate-image")
async def generate_variant_image(variant_id: int, req: GenerateVariantImageRequest):
    """用 variant.description 拼 prompt 生图,结果写回 character_variants.image_url"""
    v = await _ensure_variant_visible(variant_id)
    if not v:
        raise HTTPException(404, "马甲不存在")
    el = await ExtractionService.get_element(v["element_id"])
    if not el:
        raise HTTPException(404, "马甲所属人物不存在")

    # variant.description 优先;为空 fallback element.description(保底)
    desc = (v.get("description") or "").strip() or (el.get("description") or "").strip()
    if not desc:
        raise HTTPException(400, "马甲和本体都没有描述,无法生成图片")

    # 风格 prefix 跟普通生图同款
    novel_id = el.get("novel_id")
    style = await ExtractionService.get_image_style(novel_id, "character")
    prefix = _normalize_style_prompt((style.get("prefix_prompt") or "").strip()) or DEFAULT_STYLE_TEMPLATES.get("character", "")
    suffix = (style.get("suffix_prompt") or "").strip()
    final_prompt = _fill_template_placeholders(prefix, "character", desc) if prefix else desc
    if suffix:
        final_prompt = final_prompt + "\n" + suffix

    # variant 自己的参考图 → 图生图;无 → fallback element.reference_image
    ref = v.get("reference_image") or el.get("reference_image")

    await ExtractionService.update_variant(variant_id, image_status="generating")
    try:
        result = await ImageService.generate_image(
            config_id=req.config_id,
            prompt=final_prompt,
            element_id=el["id"],     # 日志归属
            element_type="character",
            novel_id=novel_id,
            reference_image_path=ref,
            image_role="variant_finished",  # v3.61.202:角色_名_马甲名
            variant_name=v.get("variant_name"),
        )
    except Exception as e:
        await ExtractionService.update_variant(variant_id, image_status="error")
        raise HTTPException(500, str(e))

    if not result.get("success"):
        await ExtractionService.update_variant(variant_id, image_status="error")
        raise HTTPException(500, result.get("message") or "生成失败")

    _old_img = v.get("image_url")
    await ExtractionService.update_variant(
        variant_id,
        image_url=result["image_url"],
        image_prompt=final_prompt,
        image_status="success",
    )
    # v3.61.202:DB 成功后清旧马甲生图
    _cleanup_old_asset_after_db(resolve_db_path(result["image_url"]), _old_img)
    return {"success": True, "image_url": result["image_url"]}
