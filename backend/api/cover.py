"""
封面生成模块 - v3.61.33

设计:
  1. 不写新表,只 ALTER novels 表加 cover_url + cover_updated_at(在 db.py)
  2. 用户 prompt 完全控制画风/构图/标题文字 — 工具只负责 AI 出图
  3. 多张参考图(主角)后端拼图成 1 张 reference 给 ImageService
  4. 异步 job 模式:点生成立刻返回 job_id,前端轮询;关弹窗任务继续跑;
     再开弹窗能看到当前 in-flight job 状态

接口:
  GET  /api/cover/init/{novel_id}     拿小说+主角列表+默认 prompt+当前封面+在跑 job
  GET  /api/cover/image-configs       列出可用 image 配置
  POST /api/cover/generate            启动 job(单比例),立刻返回 job_id
  GET  /api/cover/job/{job_id}        查 job 状态
  POST /api/cover/set-primary/{novel_id}  把某比例 variant 设为主封面
  GET  /api/cover/download/{novel_id} 下载小说当前(主)封面
  v3.61.261: 多比例 — cover_variants 表存各比例封面,is_primary 同步 novels.cover_url
"""
from __future__ import annotations
import logging, os, time, uuid, asyncio
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import aiofiles

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/cover", tags=["cover"])

# 进程内 job 表 — 关闭进程就丢,这是实验功能不做持久化
# job 结构: { job_id: {novel_id, status, progress, image_url, error, started_at, finished_at, prompt, ratio} }
_COVER_JOBS: Dict[str, Dict[str, Any]] = {}
# v3.61.261: 封面多比例 — 同一本小说允许多个比例并发,各比例各一个 job。
# 结构: { novel_id: { ratio: job_id } }(同 novel+同 ratio 同时只能一个 job)
_NOVEL_INFLIGHT: Dict[int, Dict[str, str]] = {}


# ====================== 数据结构 ======================

class CoverGenerateRequest(BaseModel):
    novel_id: int
    prompt: str
    reference_image_paths: List[str] = []
    ratio: str = "3:4"
    config_id: Optional[int] = None
    # v3.61.34: 标题/标题位 — 模型出图后用 PIL 叠中文标题
    # (image2image 模型对中文字渲染极差,prompt 控制不可靠,直接 PIL 叠最稳)
    title: Optional[str] = None
    title_style: Optional[str] = "top"  # top / bottom / none


# ====================== 工具 ======================

def _build_default_prompt(novel_name: str, characters: List[dict]) -> str:
    char_names = "、".join((c.get("name") or "") for c in characters[:3] if c.get("name"))
    return (
        f"小说《{novel_name}》封面海报。\n"
        f"主要角色:{char_names}\n"
        f"风格、构图、色调、背景、标题位置 — 由你在这里自由描述。\n"
        f"建议要素:主角面部清晰,氛围感强,色彩浓郁。\n"
        f"严禁:水印,LOGO,二次元,卡通,平面插画。"
    )


def _overlay_title_on_image(image_db_url: str, title: str, style: str = "top") -> Optional[str]:
    """v3.61.34: 模型出图后用 PIL 叠中文标题
    返回新 /data/images/cover_titled_xxx.png 路径(失败返回 None,调用方 fallback 用原图)
    """
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    from utils.paths import resolve_db_path, media_subdir
    src_disk = resolve_db_path(image_db_url)
    if not src_disk or not os.path.exists(src_disk):
        return None
    font_candidates = [
        r"C:/Windows/Fonts/msyhbd.ttc",
        r"C:/Windows/Fonts/msyh.ttc",
        r"C:/Windows/Fonts/simhei.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/usr/share/fonts/wqy-microhei.ttc",
    ]
    font_path = next((p for p in font_candidates if os.path.exists(p)), None)
    if not font_path:
        logger.warning("[cover.title] 没找到中文字体,跳过叠标题")
        return None

    bg = Image.open(src_disk).convert("RGBA")
    W, H = bg.size
    n = len(title)
    if n <= 6:
        font_size = max(60, W // 10)
    elif n <= 10:
        font_size = max(50, W // 13)
    else:
        font_size = max(40, W // 16)
    font = ImageFont.truetype(font_path, font_size)

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    band_h = int(H * 0.30)
    if style == "bottom":
        for y in range(band_h):
            a = int(170 * (y / band_h))
            odraw.line([(0, H - band_h + y), (W, H - band_h + y)], fill=(0, 0, 0, a))
    else:
        for y in range(band_h):
            a = int(170 * (1 - y / band_h))
            odraw.line([(0, y), (W, y)], fill=(0, 0, 0, a))
    bg = Image.alpha_composite(bg, overlay)

    draw = ImageDraw.Draw(bg)
    bbox = draw.textbbox((0, 0), title, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (W - tw) // 2 - bbox[0]
    y = int(H * 0.85) - th if style == "bottom" else int(H * 0.05)

    shadow_layer = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.text((x + 4, y + 4), title, font=font, fill=(0, 0, 0, 180))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=6))
    bg = Image.alpha_composite(bg, shadow_layer)

    draw = ImageDraw.Draw(bg)
    draw.text((x, y), title, font=font, fill=(255, 255, 255, 255),
              stroke_width=4, stroke_fill=(20, 20, 30, 255))

    images_dir = media_subdir("images")
    os.makedirs(images_dir, exist_ok=True)
    out_name = f"cover_titled_{int(time.time() * 1000)}.png"
    out_disk = os.path.join(images_dir, out_name)
    bg.convert("RGB").save(out_disk, "PNG", optimize=True)
    logger.info(f"[cover.title] 叠标题完成 → /data/images/{out_name}")
    return f"/data/images/{out_name}"


def _compose_reference_images(image_paths: List[str]) -> Optional[str]:
    """多张主角图拼成一张供 ImageService 用。返回 /data/images/cover_ref_xxx.png"""
    from PIL import Image
    from utils.paths import resolve_db_path, media_subdir
    if not image_paths:
        return None
    if len(image_paths) == 1:
        return image_paths[0]
    abs_paths = []
    for p in image_paths:
        ab = resolve_db_path(p)
        if not ab or not os.path.exists(ab):
            logger.warning(f"[cover.compose] 参考图不存在,跳过: {p}")
            continue
        abs_paths.append(ab)
    if not abs_paths:
        return None
    if len(abs_paths) == 1:
        return image_paths[0]
    target_h = 1024
    parts = []
    total_w = 0
    for ab in abs_paths[:2]:
        img = Image.open(ab).convert("RGB")
        ratio = target_h / img.height
        new_w = int(img.width * ratio)
        img = img.resize((new_w, target_h), Image.LANCZOS)
        parts.append(img)
        total_w += new_w
    composite = Image.new("RGB", (total_w, target_h), (240, 240, 240))
    x = 0
    for img in parts:
        composite.paste(img, (x, 0))
        x += img.width
    images_dir = media_subdir("images")
    os.makedirs(images_dir, exist_ok=True)
    fname = f"cover_ref_{uuid.uuid4().hex[:8]}_{int(time.time())}.png"
    out_disk = os.path.join(images_dir, fname)
    composite.save(out_disk, "PNG", optimize=True)
    rel = f"/data/images/{fname}"
    logger.info(f"[cover.compose] 拼接 {len(parts)} 张主角图 → {rel} ({total_w}x{target_h})")
    return rel


# ====================== 封面 variant 存储 ======================

async def _upsert_cover_variant(novel_id: int, ratio: str, image_url: str, raw_image_url: Optional[str]):
    """写入/更新某 novel+ratio 的封面 variant(同比例重生成则覆盖)。
    若该 novel 当前没有"其它已出图的主封面",则原子地把这张设为主封面。
    最后把主封面同步到 novels.cover_url。返回 (variant_id, became_primary)。"""
    from database.db import get_db
    from utils.timezone import now_beijing_str
    db = await get_db()
    try:
        now = now_beijing_str()
        # upsert by (novel_id, ratio)
        cur = await db.execute(
            "SELECT id FROM cover_variants WHERE novel_id=? AND ratio=?",
            (novel_id, ratio),
        )
        row = await cur.fetchone()
        if row:
            variant_id = row["id"]
            await db.execute(
                "UPDATE cover_variants SET image_url=?, raw_image_url=?, updated_at=? WHERE id=?",
                (image_url, raw_image_url, now, variant_id),
            )
        else:
            cur = await db.execute(
                "INSERT INTO cover_variants (novel_id, ratio, image_url, raw_image_url, is_primary, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, 0, ?, ?)",
                (novel_id, ratio, image_url, raw_image_url, now, now),
            )
            variant_id = cur.lastrowid
        # v3.61.261 codex P1:原子设主 —— 单条条件 UPDATE,仅当本 novel 不存在"其它已出图的主封面"时才把本张设主。
        #   SQLite 写锁串行化保证并发多 job 不会都判定为主(第二个 UPDATE 会等第一个 commit 后再跑,届时 NOT EXISTS 已为假)。
        cur = await db.execute(
            "UPDATE cover_variants SET is_primary=1 WHERE id=? AND NOT EXISTS("
            " SELECT 1 FROM cover_variants WHERE novel_id=? AND is_primary=1 AND image_url IS NOT NULL AND id<>?)",
            (variant_id, novel_id, variant_id),
        )
        became_primary = (cur.rowcount or 0) > 0
        await db.commit()
        if became_primary:
            await _sync_primary_to_novel(novel_id, db)
            await db.commit()
        return variant_id, became_primary
    finally:
        await db.close()


async def _sync_primary_to_novel(novel_id: int, db) -> None:
    """把当前主封面 variant 的 image_url 同步到 novels.cover_url(列表缩略图/下载都用它)"""
    from utils.timezone import now_beijing_str
    cur = await db.execute(
        "SELECT image_url FROM cover_variants WHERE novel_id=? AND is_primary=1 AND image_url IS NOT NULL LIMIT 1",
        (novel_id,),
    )
    row = await cur.fetchone()
    if row and row["image_url"]:
        await db.execute(
            "UPDATE novels SET cover_url=?, cover_updated_at=? WHERE id=?",
            (row["image_url"], now_beijing_str(), novel_id),
        )


async def _list_cover_variants(novel_id: int) -> List[Dict[str, Any]]:
    from database.db import get_db
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, ratio, image_url, is_primary, updated_at FROM cover_variants "
            "WHERE novel_id=? AND image_url IS NOT NULL ORDER BY id ASC",
            (novel_id,),
        )
        rows = await cur.fetchall()
        return [
            {
                "id": r["id"], "ratio": r["ratio"], "image_url": r["image_url"],
                "is_primary": bool(r["is_primary"]), "updated_at": r["updated_at"],
            }
            for r in rows
        ]
    finally:
        await db.close()


# ====================== 路由 ======================

@router.get("/init/{novel_id}")
async def cover_init(novel_id: int):
    """打开制作封面弹窗时调"""
    from database.db import get_db
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, name, cover_url FROM novels WHERE id = ?",
            (novel_id,),
        )
        nv = await cur.fetchone()
        if not nv:
            raise HTTPException(404, f"小说 {novel_id} 不存在")
        cur = await db.execute(
            """SELECT id, name, description, finished_image
               FROM extracted_elements
               WHERE novel_id=? AND element_type='character' AND finished_image IS NOT NULL
               ORDER BY id ASC LIMIT 30""",
            (novel_id,),
        )
        rows = await cur.fetchall()
        characters = [
            {
                "id": r["id"], "name": r["name"],
                "description": (r["description"] or "")[:80],
                "finished_image": r["finished_image"],
            }
            for r in rows
        ]
    finally:
        await db.close()

    # v3.61.261: 每个比例在跑/刚完成的 job(关弹窗再开能恢复进度/看到刚生成的图)
    inflight_jobs = []
    for ratio, jid in (_NOVEL_INFLIGHT.get(novel_id) or {}).items():
        j = _COVER_JOBS.get(jid)
        if not j:
            continue
        inflight_jobs.append({
            "job_id": jid,
            "ratio": ratio,
            "status": j["status"],
            "started_at": j.get("started_at"),
            "elapsed_sec": int(time.time() - j["started_at"]) if j.get("started_at") else 0,
            "image_url": j.get("image_url"),
            "error": j.get("error"),
        })

    variants = await _list_cover_variants(novel_id)

    return {
        "novel_id": novel_id,
        "novel_name": nv["name"],
        "current_cover_url": nv["cover_url"] if "cover_url" in nv.keys() else None,
        "variants": variants,
        "inflight_jobs": inflight_jobs,
        "characters": characters,
        "default_prompt": _build_default_prompt(nv["name"], characters),
    }


@router.get("/image-configs")
async def list_image_configs():
    from services import cloud_llm_sync
    try:
        items = await cloud_llm_sync.list_configs("image")
    except Exception as e:
        logger.warning(f"[cover/image-configs] 云端拉配置失败: {e}")
        return {"success": False, "items": [], "message": f"获取配置失败: {e}"}
    out = []
    for it in items or []:
        out.append({
            "id": it.get("id"),
            "name": it.get("name") or f"配置#{it.get('id')}",
            "model_name": it.get("modelName") or "",
            "is_default": it.get("isDefault") == 1,
        })
    return {"success": True, "items": out}


async def _run_cover_job(job_id: str, req: CoverGenerateRequest):
    """异步任务:实际跑图生图。完成后写到 _COVER_JOBS,关弹窗也能查"""
    from services.image_service import ImageService
    from services import cloud_llm_sync

    job = _COVER_JOBS[job_id]
    try:
        # 1. 选 config
        config_id = req.config_id
        if not config_id:
            cfg = await cloud_llm_sync.get_active_config(config_type="image")
            if not cfg:
                job.update(status="failed", error="未找到可用的图片模型,请到千山AI个人中心配置", finished_at=time.time())
                return
            config_id = cfg.get("id")

        # 2. 多参考图拼图
        ref_paths = req.reference_image_paths or []
        if len(ref_paths) > 2:
            ref_paths = ref_paths[:2]
        composed_ref = _compose_reference_images(ref_paths)
        if composed_ref is None and ref_paths:
            job.update(status="failed", error="参考图全部读取失败", finished_at=time.time())
            return

        # 3. ratio 提示
        ratio_hint = ""
        if req.ratio in ("3:4", "9:16"):
            ratio_hint = f"\n[输出比例 {req.ratio} 竖版构图]"
        elif req.ratio in ("4:3", "16:9"):
            ratio_hint = f"\n[输出比例 {req.ratio} 横版构图]"
        elif req.ratio == "1:1":
            ratio_hint = "\n[输出比例 1:1 方形构图]"
        full_prompt = req.prompt + ratio_hint

        logger.info(f"[cover.job] {job_id} novel={req.novel_id} config={config_id} ref={composed_ref} ratio={req.ratio}")
        job["status"] = "generating"
        # v3.61.262:封面 element/novel 都 None,_build_image_filename 会落到固定路径
        #   「未命名小说/其他/其他_未命名.png」→ 多比例并发互相覆盖成同一张(用户实测 bug)。
        #   这里给每张封面唯一文件名(novel+ratio+job),彻底隔离。
        _ratio_tag = req.ratio.replace(":", "x")
        cover_filename = f"covers/cover_n{req.novel_id}_{_ratio_tag}_{job_id[:8]}.png"
        result = await ImageService.generate_image(
            config_id=config_id,
            prompt=full_prompt,
            element_id=None, element_type=None, novel_id=None,
            reference_image_path=composed_ref,
            # v3.61.251: 用户在封面弹窗选的比例之前只进了 prompt 软提示,真正的 size/aspect_ratio
            # 取 config.image_ratio(缺省 1:1),导致选 3:4 仍按配置比例出图。这里强制透传,
            # 跟自由生图(generate_fusion_image ratio 透传)对齐。
            override_ratio=req.ratio,
            override_filename=cover_filename,
        )
        if not result.get("success"):
            job.update(status="failed", error=result.get("message", "生成失败"), finished_at=time.time())
            return
        image_url = result.get("image_url")

        # v3.61.34: 按需 PIL 叠标题
        final_url = image_url
        if req.title and (req.title_style or "top") != "none":
            try:
                titled = _overlay_title_on_image(image_url, req.title, req.title_style or "top")
                if titled:
                    final_url = titled
            except Exception as _ot_err:
                logger.warning(f"[cover.job] {job_id} 叠标题失败(用原图): {_ot_err}")

        # v3.61.261: 写入 cover_variants(按 novel+ratio upsert),首张原子设主封面并同步 novels.cover_url
        # codex P1:cover_variants 是新方案的源数据,写库失败不能算成功(否则前端假成功、刷新即丢)。
        try:
            variant_id, became_primary = await _upsert_cover_variant(req.novel_id, req.ratio, final_url, image_url)
            logger.info(f"[cover.job] {job_id} 已写入 variant id={variant_id} ratio={req.ratio} primary={became_primary} url={final_url}")
        except Exception as _save_err:
            logger.exception(f"[cover.job] {job_id} 写 variant 失败: {_save_err}")
            job.update(status="failed", error="图片已生成,但保存封面记录失败,请重试", finished_at=time.time())
            return

        job.update(
            status="done",
            image_url=final_url,
            raw_image_url=image_url,  # 保留模型出的原图(无标题),备用
            variant_id=variant_id,
            became_primary=became_primary,
            finished_at=time.time(),
        )
        logger.info(f"[cover.job] {job_id} done ratio={req.ratio} → {final_url}")
    except Exception as e:
        logger.exception(f"[cover.job] {job_id} 异常: {e}")
        job.update(status="failed", error=f"生成异常: {type(e).__name__}: {e}", finished_at=time.time())
    finally:
        # v3.61.34: 不释放 inflight slot,这样 init 重开能拿到刚完成的 job 状态
        # 释放发生在: 1) 用户启动新 job 时(覆盖) 2) 应用重启(进程内存丢)
        pass


@router.post("/generate")
async def cover_generate(req: CoverGenerateRequest):
    """启动异步 job,立刻返回 job_id。
    v3.61.261: 同一本小说允许多个比例并发,但同 novel+同 ratio 同时只能一个在跑。"""
    novel_jobs = _NOVEL_INFLIGHT.setdefault(req.novel_id, {})
    cur_jid = novel_jobs.get(req.ratio)
    if cur_jid and _COVER_JOBS.get(cur_jid, {}).get("status") in ("generating", "queued"):
        return {"success": False, "job_id": cur_jid, "ratio": req.ratio,
                "message": f"该比例({req.ratio})已有生成任务在跑,请等完成后再发"}

    job_id = uuid.uuid4().hex
    _COVER_JOBS[job_id] = {
        "novel_id": req.novel_id,
        "status": "queued",
        "started_at": time.time(),
        "finished_at": None,
        "image_url": None,
        "error": None,
        "prompt": req.prompt,
        "ratio": req.ratio,
    }
    novel_jobs[req.ratio] = job_id
    asyncio.create_task(_run_cover_job(job_id, req))
    return {"success": True, "job_id": job_id, "ratio": req.ratio, "status": "queued"}


@router.get("/job/{job_id}")
async def cover_job_status(job_id: str):
    j = _COVER_JOBS.get(job_id)
    if not j:
        raise HTTPException(404, "job 不存在(可能后端重启了 — 请重新生成)")
    return {
        "job_id": job_id,
        "status": j["status"],
        "ratio": j.get("ratio"),
        "image_url": j.get("image_url"),
        "variant_id": j.get("variant_id"),
        "became_primary": j.get("became_primary"),
        "error": j.get("error"),
        "started_at": j.get("started_at"),
        "elapsed_sec": int(time.time() - j["started_at"]) if j.get("started_at") else 0,
        "finished_at": j.get("finished_at"),
    }


class SetPrimaryRequest(BaseModel):
    variant_id: int


@router.post("/set-primary/{novel_id}")
async def cover_set_primary(novel_id: int, req: SetPrimaryRequest):
    """v3.61.261: 把某个比例的 variant 设为主封面,同步到 novels.cover_url"""
    from database.db import get_db
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, image_url FROM cover_variants WHERE id=? AND novel_id=?",
            (req.variant_id, novel_id),
        )
        row = await cur.fetchone()
        if not row or not row["image_url"]:
            raise HTTPException(404, "该封面不存在或尚未生成完成")
        await db.execute("UPDATE cover_variants SET is_primary=0 WHERE novel_id=?", (novel_id,))
        await db.execute("UPDATE cover_variants SET is_primary=1 WHERE id=?", (req.variant_id,))
        await db.commit()
        await _sync_primary_to_novel(novel_id, db)
        await db.commit()
        return {"success": True, "cover_url": row["image_url"]}
    finally:
        await db.close()


@router.get("/download/{novel_id}")
async def cover_download(novel_id: int):
    """下载小说当前封面 — 列表里那个下载按钮调这个"""
    from fastapi.responses import FileResponse
    from database.db import get_db
    from utils.paths import resolve_db_path
    db = await get_db()
    try:
        cur = await db.execute("SELECT name, cover_url FROM novels WHERE id = ?", (novel_id,))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "小说不存在")
        if not (row["cover_url"] if "cover_url" in row.keys() else None):
            raise HTTPException(404, "该小说还没生成封面")
        abs_path = resolve_db_path(row["cover_url"])
        if not abs_path or not os.path.exists(abs_path):
            raise HTTPException(404, "封面文件不存在")
        ext = os.path.splitext(abs_path)[1] or ".png"
        return FileResponse(abs_path, media_type="image/png", filename=f"cover_{row['name']}{ext}")
    finally:
        await db.close()


@router.delete("/{novel_id}")
async def cover_delete(novel_id: int):
    """清掉小说封面(只清 DB 引用,文件留在 images 目录)"""
    from database.db import get_db
    db = await get_db()
    try:
        await db.execute(
            "UPDATE novels SET cover_url = NULL, cover_updated_at = NULL WHERE id = ?",
            (novel_id,),
        )
        # v3.61.261: 同时清掉该小说所有比例封面记录(文件保留在磁盘)
        await db.execute("DELETE FROM cover_variants WHERE novel_id = ?", (novel_id,))
        await db.commit()
    finally:
        await db.close()
    return {"success": True}


@router.post("/upload-reference")
async def upload_cover_reference(file: UploadFile = File(...)):
    """v3.61.43: 用户在制作封面弹窗里上传参考图(自带,不走信息提取那套)
    返回 /data/images/cover_ref_xxx.png,前端拿这个 url 当主角参考
    """
    from utils.paths import media_subdir
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "只支持图片文件")
    ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
    if ext.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
        ext = ".png"
    fname = f"cover_ref_{uuid.uuid4().hex[:12]}{ext}"
    images_dir = media_subdir("images")
    os.makedirs(images_dir, exist_ok=True)
    fpath = os.path.join(images_dir, fname)
    async with aiofiles.open(fpath, "wb") as out:
        content = await file.read()
        await out.write(content)
    url = f"/data/images/{fname}"
    logger.info(f"[cover/upload-reference] 已保存 {url} ({len(content)} bytes)")
    return {"success": True, "image_url": url, "filename": fname}
