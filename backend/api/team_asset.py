"""团队版资产正向拉取(C3)— 云端团队资产 → 本地信息提取(extracted_elements)。

v3.61.228。契约见 docs/team-asset-manju-integration.md + 云端 AssetController/TeamScriptController。
链路(按剧):
  1. GET {API}/tools/web/team-script/projects/{projectId}/asset-groups → [{groupId,name,assetCount}]  (bearer)
  2. GET {API}/team/{teamId}/assets?groupId=&type=&page=&size=&updatedSince= → {total,list:[{id,...,updateTime}]}  (bearer + X-Team-Id)
  3. GET {API}/team/{teamId}/assets/{aid} → 含 coverSignedUrl + variants[].imageSignedUrl(10min TTL)
落地:downloaded 封面/变体图 → media/images;upsert extracted_elements
  (novel_id=该剧本地 team_script 小说;remote_source='team_asset';remote_id=assetId;element_type=assetType)。
  人物 variants → character_variants。个人/团队筛选靠 remote_source 区分。
"""
import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx
import oss2  # 顶层导入:确保 pyinstaller 打包时把 oss2 + 依赖一并收进(C4 反推 OSS 直传用)
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.db import get_db
from services import cloud_token_service as cloud_token
from services import team_context_service as team_ctx
from api.short_drama_sync import _ensure_sync_columns
from utils.paths import media_subdir, resolve_db_path
from utils.timezone import now_beijing_str

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/team/asset", tags=["team-asset"])

_sync_lock = asyncio.Lock()  # 串行化资产落库,杜绝并发竞态


def _team_headers(team_id: int) -> dict:
    h = cloud_token.headers()  # 已含 Authorization: Bearer
    h["X-Team-Id"] = str(team_id)
    return h


async def _bearer_get(path: str, timeout: float = 30.0) -> Any:
    """主服务接口(bearer,无 X-Team-Id),如 asset-groups。"""
    await cloud_token.get_access_token()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(f"{cloud_token.QIANSHAN_API_BASE}{path}", headers=cloud_token.headers())
    except httpx.HTTPError as e:
        logger.warning("[team-asset] bearer GET 失败 %s: %s", path, e)
        raise HTTPException(status_code=502, detail="无法连接团队服务器,请稍后重试")
    return _unwrap(resp, path)


async def _team_get(path: str, team_id: int, timeout: float = 30.0) -> Any:
    """团队服务接口(bearer + X-Team-Id),如 assets。"""
    await cloud_token.get_access_token()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(f"{cloud_token.QIANSHAN_API_BASE}{path}", headers=_team_headers(team_id))
    except httpx.HTTPError as e:
        logger.warning("[team-asset] team GET 失败 %s: %s", path, e)
        raise HTTPException(status_code=502, detail="无法连接团队服务器,请稍后重试")
    return _unwrap(resp, path)


async def _team_post(path: str, body: dict, team_id: int, timeout: float = 30.0) -> Any:
    """团队服务 POST(bearer + X-Team-Id),如 upload-token / asset-submissions。"""
    await cloud_token.get_access_token()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{cloud_token.QIANSHAN_API_BASE}{path}", json=body, headers=_team_headers(team_id))
    except httpx.HTTPError as e:
        logger.warning("[team-asset] team POST 失败 %s: %s", path, e)
        raise HTTPException(status_code=502, detail="无法连接团队服务器,请稍后重试")
    return _unwrap(resp, path)


_ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
_ALLOWED_AUDIO_EXT = {"mp3", "wav", "m4a", "aac"}


def _oss_put_sync(token: dict, abs_path: str) -> None:
    """oss2 用 STS 临时凭证直传本地文件到 objectKey(同步,调用方用 to_thread 包)。"""
    auth = oss2.StsAuth(token["stsAccessKeyId"], token["stsAccessKeySecret"], token["securityToken"])
    ep = token["endpoint"]
    if not ep.startswith("http"):
        ep = f"https://{ep}"
    bucket = oss2.Bucket(auth, ep, token["bucket"])
    bucket.put_object_from_file(token["objectKey"], abs_path)


async def _upload_one(team_id: int, abs_path: str, purpose: str) -> dict:
    """申请 upload-token → oss2 直传 → 返回 {uploadLogId, objectKey}。失败抛 HTTPException。"""
    ext = os.path.splitext(abs_path)[1].lstrip(".").lower() or "png"
    if ext == "jpe":
        ext = "jpg"
    # v3.61.264:音频也走同一 upload-token 管道(云端 fileExt 支持 mp3/wav/m4a/aac,≤50MB)
    is_audio = ext in _ALLOWED_AUDIO_EXT
    if ext not in _ALLOWED_EXT and not is_audio:
        raise HTTPException(status_code=400, detail=f"格式 {ext} 不支持(图片 png/jpg/jpeg/webp,音频 mp3/wav/m4a/aac)")
    size = os.path.getsize(abs_path)
    _limit = 50 * 1024 * 1024 if is_audio else 20 * 1024 * 1024
    if size > _limit:
        raise HTTPException(status_code=400, detail=f"文件超 {_limit // (1024*1024)}MB,无法推送: {os.path.basename(abs_path)}")
    token = await _team_post(
        f"/team/{team_id}/assets/upload-token",
        {"fileExt": ext, "declaredSize": size, "purpose": purpose},
        team_id,
    )
    if not isinstance(token, dict) or not token.get("objectKey") or not token.get("uploadLogId"):
        raise HTTPException(status_code=502, detail="申请上传凭证失败")
    await asyncio.to_thread(_oss_put_sync, token, abs_path)
    return {"uploadLogId": token["uploadLogId"], "objectKey": token["objectKey"]}


def _local_abs(rel: Optional[str]) -> Optional[str]:
    """把 DB 存的相对图路径解析成本地绝对路径(存在才返回)。"""
    if not rel:
        return None
    p = resolve_db_path(rel)
    return p if (p and os.path.exists(p)) else None


_PASSTHROUGH = {400, 401, 403, 404, 409, 429}


def _unwrap(resp: httpx.Response, path: str) -> Any:
    try:
        body = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail=f"团队服务器响应异常({resp.status_code})")
    code = body.get("code")
    if resp.status_code == 200 and code == 200:
        return body.get("data")
    msg = body.get("message") or f"团队服务器错误({resp.status_code})"
    logger.warning("[team-asset] %s 失败 http=%s code=%s msg=%s", path, resp.status_code, code, msg)
    if resp.status_code in _PASSTHROUGH:
        raise HTTPException(status_code=resp.status_code, detail=msg)
    if isinstance(code, int) and code in _PASSTHROUGH:
        raise HTTPException(status_code=code, detail=msg)
    raise HTTPException(status_code=502, detail=msg)


def _safe_dir(name: Optional[str], maxlen: int = 24) -> str:
    """把剧名做成安全的文件夹名(去非法字符)。"""
    import re as _re
    s = _re.sub(r'[\\/:*?"<>|\r\n\t]+', "_", (name or "").strip())
    s = s.strip(". ")[:maxlen]
    return s or "团队剧本"


async def _download_image(url: Optional[str], filename: str, subdir: Optional[str] = None) -> Optional[str]:
    """下载签名图 URL 到 media/images[/subdir],返回 DB 用相对路径 data/images[/subdir]/<filename>;失败 None。"""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.get(url)
        if resp.status_code != 200 or not resp.content:
            logger.warning("[team-asset] 下载图失败 HTTP %s: %s", resp.status_code, url[:120])
            return None
        # 大小/类型保护:>30MB 或非图片(magic number)拒绝写盘
        if len(resp.content) > 30 * 1024 * 1024:
            logger.warning("[team-asset] 下载图过大(%.1fMB)跳过: %s", len(resp.content) / 1024 / 1024, url[:120])
            return None
        head = resp.content[:12]
        is_image = (
            head[:8] == b"\x89PNG\r\n\x1a\n"        # png
            or head[:3] == b"\xff\xd8\xff"            # jpg
            or head[:6] in (b"GIF87a", b"GIF89a")     # gif
            or (head[:4] == b"RIFF" and resp.content[8:12] == b"WEBP")  # webp
            or head[:2] == b"BM"                       # bmp
        )
        if not is_image:
            ct = resp.headers.get("content-type", "")
            logger.warning("[team-asset] 下载内容非图片(content-type=%s)跳过: %s", ct, url[:120])
            return None
        images_dir = media_subdir("images")
        if subdir:
            images_dir = os.path.join(images_dir, subdir)
        os.makedirs(images_dir, exist_ok=True)
        abs_path = os.path.join(images_dir, filename)
        with open(abs_path, "wb") as f:
            f.write(resp.content)
        rel = f"data/images/{subdir}/{filename}" if subdir else f"data/images/{filename}"
        return rel
    except Exception as e:
        logger.warning("[team-asset] 下载图异常 %s: %s", url[:120], e)
        return None


def _ext_from_key(object_key: Optional[str], default: str = "png") -> str:
    if object_key and "." in object_key.rsplit("/", 1)[-1]:
        return object_key.rsplit(".", 1)[-1].lower()[:5] or default
    return default


# v3.61.275:团队资产图片落地复用本地生图命名规范 ——
#   {剧名}/{角色|场景|道具|其他}/{类型}_{元素名}[_马甲名 / _宫格图 / _720 / _参考图].ext
# 与 image_service._build_image_filename 同名同位,使团队图与本地图同名覆盖、不再散落根目录。
_ASSET_TYPE_CN = {"character": "角色", "scene": "场景", "prop": "道具"}


def _asset_img_parts(novel_dir: str, asset_type: Optional[str], name: str,
                     role: str, ext: str, variant_name: Optional[str] = None) -> tuple[str, str]:
    """返回 (subdir, filename):subdir={剧名}/{类型中};filename={类型中}_{名}{role后缀}{ext}。"""
    from services.image_service import ImageService
    type_cn = _ASSET_TYPE_CN.get(asset_type or "", "其他")
    safe_name = ImageService._safe_name_part(name, 24) or "未命名"
    vn = ImageService._safe_name_part(variant_name, 24) if variant_name else ""
    role_suffix = {
        "finished": "",
        "grid": "_宫格图",
        "panorama": "_720",
        "reference": "_参考图",
        "variant_finished": f"_{vn}" if vn else "_马甲",
        "variant_reference": (f"_{vn}" if vn else "_马甲") + "_参考图",
    }.get(role, "")
    e = ext if ext.startswith(".") else f".{ext}"
    return f"{novel_dir}/{type_cn}", f"{type_cn}_{safe_name}{role_suffix}{e}"


def _purge_legacy_flat_images(novel_dir: str, aid: str) -> None:
    """清理旧版散落在剧名根目录的通用名图片 team_{aid}_*(cover/grid/ref/720/var_*)。
    只删该资产自己的旧散文件,不动子目录与其它资产。"""
    try:
        import glob as _glob
        root = os.path.join(media_subdir("images"), novel_dir)
        for p in _glob.glob(os.path.join(root, f"team_{aid}_*")):
            if os.path.isfile(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
    except Exception as e:
        logger.warning("[team-asset] 清理旧散文件失败 novel_dir=%s aid=%s: %s", novel_dir, aid, e)


@router.get("/groups")
async def asset_groups(projectId: Optional[int] = None, novelId: Optional[int] = None):
    """该剧绑定的资产组(供前端展示/选择)。可传 projectId 或 novelId(后者后端解析 projectId)。"""
    if team_ctx.get_team_id() is None:
        raise HTTPException(status_code=401, detail="未登录团队席位")
    pid = projectId
    if pid is None and novelId is not None:
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT remote_project_id FROM novels WHERE id=? AND source_type='team_script'", (novelId,)
            )
            row = await cur.fetchone()
        finally:
            await db.close()
        if not row or not row["remote_project_id"]:
            raise HTTPException(status_code=400, detail="该小说不是团队剧本")
        pid = row["remote_project_id"]
    if pid is None:
        raise HTTPException(status_code=400, detail="缺少 projectId 或 novelId")
    data = await _bearer_get(f"/tools/web/team-script/projects/{pid}/asset-groups")
    return {"groups": data or []}


class SyncAssetReq(BaseModel):
    novelId: int


class SyncOneAssetReq(BaseModel):
    novelId: int
    assetId: int


class SyncCleanupReq(BaseModel):
    novelId: int
    # v3.61.268:assetId 前端可能传 number,Pydantic v2 严格模式 int 不自动转 str -> 报错。
    #   放宽成 Any,下游统一 str(x)。修"sync-cleanup: Input should be a valid string"。
    seenIds: List[Any] = []


async def _resolve_team_novel(novel_id: int):
    """Return (novel_id, novel_name, project_id) for a local team-script novel."""
    db = await get_db()
    try:
        await _ensure_sync_columns(db)
        cur = await db.execute(
            "SELECT id, name, source_type, remote_project_id FROM novels WHERE id=?",
            (novel_id,),
        )
        row = await cur.fetchone()
    finally:
        await db.close()
    if not row or row["source_type"] != "team_script" or not row["remote_project_id"]:
        raise HTTPException(status_code=400, detail="该小说不是团队剧本,无法拉取团队资产")
    return row["id"], row["name"], row["remote_project_id"]


async def _list_project_asset_items(team_id: int, project_id) -> tuple[int, list[dict]]:
    groups = await _bearer_get(f"/tools/web/team-script/projects/{project_id}/asset-groups") or []
    assets: list[dict] = []
    for g in groups:
        gid = g.get("groupId")
        if gid is None:
            continue
        page = 1
        while True:
            listed = await _team_get(
                f"/team/{team_id}/assets?groupId={gid}&page={page}&size=50", team_id, timeout=45.0
            )
            items = (listed or {}).get("list") or []
            if not items:
                break
            for it in items:
                aid = it.get("id")
                if aid is None:
                    continue
                assets.append({
                    "assetId": aid,
                    "groupId": gid,
                    "name": it.get("name") or f"资产{aid}",
                    "assetType": it.get("assetType"),
                    "updateTime": it.get("updateTime"),
                })
            total = (listed or {}).get("total") or 0
            if page * 50 >= total:
                break
            page += 1
    return len(groups), assets


@router.get("/sync-plan")
async def sync_plan(novelId: int):
    """Return the exact asset list before sync so the client can show real progress."""
    team_id = team_ctx.get_team_id()
    if team_id is None:
        raise HTTPException(status_code=401, detail="未登录团队席位")
    _, _, project_id = await _resolve_team_novel(novelId)
    groups_count, assets = await _list_project_asset_items(team_id, project_id)
    return {"novelId": novelId, "groups": groups_count, "total": len(assets), "assets": assets}


@router.post("/sync-one")
async def sync_one_asset(req: SyncOneAssetReq):
    """Sync one cloud asset to local extracted_elements. Used by the progress UI."""
    team_id = team_ctx.get_team_id()
    if team_id is None:
        raise HTTPException(status_code=401, detail="未登录团队席位")
    novel_id, novel_name, _project_id = await _resolve_team_novel(req.novelId)
    async with _sync_lock:
        detail = await _team_get(f"/team/{team_id}/assets/{req.assetId}", team_id, timeout=45.0)
        if not isinstance(detail, dict):
            raise HTTPException(status_code=502, detail="团队资产详情为空")
        await _land_asset(novel_id, detail, novel_name)
    return {"assetId": req.assetId, "name": detail.get("name"), "ok": True}


@router.post("/sync-cleanup")
async def sync_cleanup(req: SyncCleanupReq):
    """Mirror cleanup after a progress sync: remove local team assets no longer present in cloud."""
    team_id = team_ctx.get_team_id()
    if team_id is None:
        raise HTTPException(status_code=401, detail="未登录团队席位")
    novel_id, _novel_name, _project_id = await _resolve_team_novel(req.novelId)
    removed = await _cleanup_stale_team_assets(novel_id, set(str(x) for x in req.seenIds))
    return {"novelId": novel_id, "removed": removed}


@router.post("/sync")
async def sync_assets(req: SyncAssetReq):
    """按本地团队小说拉取该剧绑定的全部团队资产 → 落信息提取(remote_source='team_asset')。

    projectId 由后端从 novels.remote_project_id 解析(前端只传 novelId)。
    """
    team_id = team_ctx.get_team_id()
    if team_id is None:
        raise HTTPException(status_code=401, detail="未登录团队席位")

    async with _sync_lock:
        # 1. 校验本地小说是团队剧,取其 projectId
        db = await get_db()
        try:
            await _ensure_sync_columns(db)
            cur = await db.execute(
                "SELECT id, name, source_type, remote_project_id FROM novels WHERE id=?",
                (req.novelId,),
            )
            row = await cur.fetchone()
        finally:
            await db.close()
        if not row or row["source_type"] != "team_script" or not row["remote_project_id"]:
            raise HTTPException(status_code=400, detail="该小说不是团队剧本,无法拉取团队资产")
        novel_id = row["id"]
        novel_name = row["name"]
        project_id = row["remote_project_id"]

        # 2. 该剧绑定的资产组
        groups = await _bearer_get(f"/tools/web/team-script/projects/{project_id}/asset-groups") or []
        if not groups:
            # 云端无绑定资产组 → 也要镜像清理本地残留的团队资产(之前可能绑过)
            removed = await _cleanup_stale_team_assets(novel_id, set())
            return {
                "novelId": novel_id, "groups": 0, "assets": 0, "removed": removed,
                "message": f"该剧云端无绑定资产组,已清理本地团队资产 {removed} 个" if removed
                           else "该剧未绑定资产组(团队主在网页绑定后再拉)",
            }

        total_assets = 0
        seen_ids: set = set()
        for g in groups:
            gid = g.get("groupId")
            if gid is None:
                continue
            # 3. 分页拉该组资产
            page = 1
            while True:
                listed = await _team_get(
                    f"/team/{team_id}/assets?groupId={gid}&page={page}&size=50", team_id, timeout=45.0
                )
                items = (listed or {}).get("list") or []
                if not items:
                    break
                for it in items:
                    aid = it.get("id")
                    if aid is None:
                        continue
                    detail = await _team_get(f"/team/{team_id}/assets/{aid}", team_id, timeout=45.0)
                    if isinstance(detail, dict):
                        await _land_asset(novel_id, detail, novel_name)
                        seen_ids.add(str(aid))
                        total_assets += 1
                total = (listed or {}).get("total") or 0
                if page * 50 >= total:
                    break
                page += 1

        # 4. 镜像清理:云端已解绑/删除的团队资产 → 从本地删除(仅 remote_source='team_asset',个人资产不动)
        removed = await _cleanup_stale_team_assets(novel_id, seen_ids)

        return {"novelId": novel_id, "groups": len(groups), "assets": total_assets, "removed": removed}


async def _cleanup_stale_team_assets(novel_id: int, seen_ids: set) -> int:
    """删掉该剧本地 remote_source='team_asset' 且不在本次同步集合里的元素(连同其变体)。

    只动团队来源资产,个人提取的元素绝不碰。符合"反复拉取覆盖、镜像云端当前状态"语义。
    """
    db = await get_db()
    try:
        if seen_ids:
            ph = ",".join("?" * len(seen_ids))
            cond = f"novel_id=? AND remote_source='team_asset' AND remote_id NOT IN ({ph})"
            params = (novel_id, *seen_ids)
        else:
            # 本次一个资产都没拉到(云端该剧已无绑定资产)→ 清掉本地全部 team_asset
            cond = "novel_id=? AND remote_source='team_asset'"
            params = (novel_id,)
        # 先删这些元素的变体
        await db.execute(
            f"DELETE FROM character_variants WHERE element_id IN (SELECT id FROM extracted_elements WHERE {cond})",
            params,
        )
        cur = await db.execute(f"DELETE FROM extracted_elements WHERE {cond}", params)
        removed = cur.rowcount or 0
        await db.commit()
        if removed:
            logger.info("[team-asset] 镜像清理:novel=%s 删除 %s 个云端已移除的团队资产", novel_id, removed)
        return removed
    finally:
        await db.close()


async def _download_audio(url: Optional[str], rel_name: str) -> Optional[str]:
    """下载签名音频 URL 到 media/images/<rel_name>(可含子目录),返回 data/images/<rel_name>;失败 None。
    rel_name 形如 '剧名/音频/音频_角色名.mp3'。不做图片 magic 校验,仅大小上限(≤50MB)。"""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.get(url)
        if resp.status_code != 200 or not resp.content:
            logger.warning("[team-asset] 下载音频失败 HTTP %s: %s", resp.status_code, url[:120])
            return None
        if len(resp.content) > 50 * 1024 * 1024:
            logger.warning("[team-asset] 音频过大(%.1fMB)跳过", len(resp.content) / 1024 / 1024)
            return None
        images_dir = media_subdir("images")
        abs_path = os.path.join(images_dir, rel_name.replace("/", os.sep))
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "wb") as f:
            f.write(resp.content)
        return f"data/images/{rel_name}"
    except Exception as e:
        logger.warning("[team-asset] 下载音频异常 %s: %s", url[:120], e)
        return None


async def _land_audio_asset(novel_id: int, detail: Dict[str, Any], subdir: str) -> None:
    """音频资产(assetType=audio)落地:按 boundCharacterId/Name 匹配本地角色,匹配不到则建角色,
    再把下载的音频写到该角色 extracted_elements.audio_file。"""
    bound_id = str(detail.get("boundCharacterId") or "")
    bound_name = str(detail.get("boundCharacterName") or "").strip()
    aid = str(detail.get("id") or "")
    now = now_beijing_str()
    ext = _ext_from_key(detail.get("audioObjectKey"), default="mp3")

    db = await get_db()
    try:
        element_id = None
        # 1) 按云端角色 id(remote_id)匹配已同步的角色
        if bound_id:
            cur = await db.execute(
                "SELECT id, name FROM extracted_elements WHERE novel_id=? AND remote_source='team_asset' AND remote_id=? LIMIT 1",
                (novel_id, bound_id),
            )
            r = await cur.fetchone()
            if r:
                element_id = r["id"]
                bound_name = bound_name or r["name"]
        # 2) 按角色名匹配本地同名 character
        if element_id is None and bound_name:
            cur = await db.execute(
                "SELECT id FROM extracted_elements WHERE novel_id=? AND element_type='character' AND name=? LIMIT 1",
                (novel_id, bound_name),
            )
            r = await cur.fetchone()
            if r:
                element_id = r["id"]
        # 3) 还没有 → 建角色(挂音频用),remote_id 用云端角色 id(便于后续角色资产同步 upsert 到同一行)
        if element_id is None:
            new_name = bound_name or f"音频角色{aid}"
            cur = await db.execute(
                """INSERT INTO extracted_elements
                       (novel_id, element_type, name, description, attributes, chapter_ids, aliases,
                        remote_source, remote_id, created_at, updated_at)
                   VALUES (?, 'character', ?, '', '{}', '[]', '[]', 'team_asset', ?, ?, ?)""",
                (novel_id, new_name, (bound_id or None), now, now),
            )
            element_id = cur.lastrowid
            bound_name = new_name

        # 下载音频 → 写 audio_file(语义路径 剧名/音频/音频_角色名.ext)
        safe_char = re.sub(r'[\\/:*?"<>|\r\n\t.。]+', "_", bound_name or f"角色{element_id}").strip("_") or f"角色{element_id}"
        rel_name = f"{subdir}/音频/音频_{safe_char}{ext if ext.startswith('.') else '.' + ext}"
        audio_rel = await _download_audio(detail.get("audioSignedUrl"), rel_name)
        if audio_rel:
            await db.execute(
                "UPDATE extracted_elements SET audio_file=?, updated_at=? WHERE id=?",
                (audio_rel, now, element_id),
            )

        # v3.61.267:马甲音频 → audio 资产的 variants(variantName=马甲名,imageSignedUrl 承载音频)
        #   落到对应角色马甲 character_variants.audio_file;马甲不存在则建(只挂音频,图后续同步角色资产时补)。
        for v in (detail.get("variants") or []):
            vname = str(v.get("variantName") or "").strip()
            vaudio_url = v.get("imageSignedUrl") or v.get("audioSignedUrl")
            if not vname or not vaudio_url:
                continue
            vext = _ext_from_key(v.get("imageObjectKey") or v.get("audioObjectKey"), default="mp3")
            v_rel = f"{subdir}/音频/音频_{safe_char}_{re.sub(r'[\\/:*?\"<>|\r\n\t.。]+', '_', vname).strip('_') or '马甲'}{vext if vext.startswith('.') else '.' + vext}"
            v_audio_rel = await _download_audio(vaudio_url, v_rel)
            if not v_audio_rel:
                continue
            vcur = await db.execute(
                "SELECT id FROM character_variants WHERE element_id=? AND variant_name=? LIMIT 1",
                (element_id, vname),
            )
            vex = await vcur.fetchone()
            if vex:
                await db.execute(
                    "UPDATE character_variants SET audio_file=?, updated_at=? WHERE id=?",
                    (v_audio_rel, now, vex["id"]),
                )
            else:
                await db.execute(
                    """INSERT INTO character_variants
                           (element_id, variant_name, audio_file, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?)""",
                    (element_id, vname, v_audio_rel, now, now),
                )
        await db.commit()
    finally:
        await db.close()


async def _land_asset(novel_id: int, detail: Dict[str, Any], novel_name: Optional[str] = None) -> None:
    """把单个团队资产 upsert 到 extracted_elements(+ 人物 variants → character_variants)。"""
    aid = str(detail.get("id") or "")
    if not aid:
        return
    subdir = _safe_dir(novel_name)  # 团队资产图按剧名归档,不再散落 images 根目录
    asset_type = detail.get("assetType") or "character"
    # v3.61.264:音频资产 = 独立 assetType=audio + 绑定角色 → 匹配/建角色挂 audio_file,不当普通元素落
    if asset_type == "audio":
        await _land_audio_asset(novel_id, detail, subdir)
        return
    name = str(detail.get("name") or f"资产{aid}")
    description = str(detail.get("description") or "")
    prompt = str(detail.get("prompt") or "")
    tags = detail.get("tags") or []
    now = now_beijing_str()

    # 下载封面(成品图)→ 按本地命名规范进 {剧名}/{类型中}/{类型}_{名}.ext
    _cov_sub, _cov_fn = _asset_img_parts(
        subdir, asset_type, name, "finished", _ext_from_key(detail.get('coverObjectKey')))
    cover_rel = await _download_image(detail.get("coverSignedUrl"), _cov_fn, _cov_sub)

    # 漫剧元素级没有的字段塞 attributes
    attrs = {
        "seed": detail.get("seed"),
        "model": detail.get("model"),
        "negativePrompt": detail.get("negativePrompt"),
        "category": detail.get("category"),
        "teamAssetUpdateTime": str(detail.get("updateTime") or ""),
    }
    aliases_json = json.dumps(tags if isinstance(tags, list) else [], ensure_ascii=False)

    db = await get_db()
    try:
        # v3.61.268:匹配顺序 —— ① 已同步过的(remote_id)② 同 novel+同 type+同名的本地已有角色(不限来源,认领它,避免重复建)③ 都没有才建。
        cur = await db.execute(
            "SELECT id FROM extracted_elements WHERE novel_id=? AND remote_source='team_asset' AND remote_id=? LIMIT 1",
            (novel_id, aid),
        )
        ex = await cur.fetchone()
        if not ex:
            cur = await db.execute(
                "SELECT id FROM extracted_elements WHERE novel_id=? AND element_type=? AND name=? "
                "ORDER BY (remote_source='team_asset') DESC, id ASC LIMIT 1",
                (novel_id, asset_type, name),
            )
            ex = await cur.fetchone()
        if ex:
            element_id = ex["id"]
            # 认领/更新:同名本地角色升级为 team_asset 来源 + 绑 remote_id(下次按 id 命中,不再重复)
            await db.execute(
                """UPDATE extracted_elements
                   SET element_type=?, name=?, description=?, image_prompt=?, aliases=?, attributes=?,
                       remote_source='team_asset', remote_id=?, updated_at=?"""
                + (", finished_image=?" if cover_rel else "")
                + " WHERE id=?",
                ((asset_type, name, description, prompt, aliases_json, json.dumps(attrs, ensure_ascii=False), aid, now)
                 + ((cover_rel,) if cover_rel else ())
                 + (element_id,)),
            )
        else:
            cur = await db.execute(
                """INSERT INTO extracted_elements
                       (novel_id, element_type, name, description, attributes, chapter_ids, aliases,
                        image_prompt, finished_image, image_status, remote_source, remote_id, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 'team_asset', ?, ?, ?)""",
                (novel_id, asset_type, name, description, json.dumps(attrs, ensure_ascii=False), aliases_json,
                 prompt, cover_rel, ("success" if cover_rel else None), aid, now, now),
            )
            element_id = cur.lastrowid

        # 人物变体 → character_variants(按 element_id + variant_name upsert)
        # v3.61.229: 变体名含「参考图」的不当马甲(语义污染);正好叫「参考图」的落到元素 reference_image。
        # v3.61.233: 云端当前用 variants 承载扩展图。
        # 场景/道具:「宫格图」→ grid_image,「参考图」→ reference_image,「720/全景」→ panorama_url。
        variants = detail.get("variants") or []
        if asset_type == "character" and isinstance(variants, list):
            real_variants = [v for v in variants
                             if (v.get("variantName") or "").strip() and "参考图" not in (v.get("variantName") or "")]
            # 云端是该资产变体的权威源:清掉本地不在本次"真马甲"集合里的旧变体(改名/删除/参考图都会被清掉)
            keep_names = [str(v.get("variantName") or "").strip() for v in real_variants]
            if keep_names:
                ph = ",".join("?" * len(keep_names))
                await db.execute(
                    f"DELETE FROM character_variants WHERE element_id=? AND variant_name NOT IN ({ph})",
                    (element_id, *keep_names),
                )
            else:
                await db.execute("DELETE FROM character_variants WHERE element_id=?", (element_id,))

            # 正好叫「参考图」的变体 → 落到元素 reference_image(不进马甲列表)
            ref_v = next((v for v in variants if (v.get("variantName") or "").strip() == "参考图"), None)
            if ref_v:
                _rsub, _rfn = _asset_img_parts(
                    subdir, asset_type, name, "reference", _ext_from_key(ref_v.get('imageObjectKey')))
                ref_img = await _download_image(ref_v.get("imageSignedUrl"), _rfn, _rsub)
                if ref_img:
                    await db.execute(
                        "UPDATE extracted_elements SET reference_image=? WHERE id=?",
                        (ref_img, element_id),
                    )

            for v in real_variants:
                vname = str(v.get("variantName") or "").strip()
                if not vname:
                    continue
                _vsub, _vfn = _asset_img_parts(
                    subdir, asset_type, name, "variant_finished",
                    _ext_from_key(v.get('imageObjectKey')), variant_name=vname)
                vimg = await _download_image(v.get("imageSignedUrl"), _vfn, _vsub)
                vcur = await db.execute(
                    "SELECT id FROM character_variants WHERE element_id=? AND variant_name=? LIMIT 1",
                    (element_id, vname),
                )
                vex = await vcur.fetchone()
                if vex:
                    if vimg:
                        await db.execute(
                            "UPDATE character_variants SET finished_image=?, image_prompt=?, sort_order=?, updated_at=? WHERE id=?",
                            (vimg, str(v.get("prompt") or ""), int(v.get("sortOrder") or 0), now, vex["id"]),
                        )
                else:
                    await db.execute(
                        """INSERT INTO character_variants
                               (element_id, variant_name, image_prompt, finished_image, sort_order, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (element_id, vname, str(v.get("prompt") or ""), vimg, int(v.get("sortOrder") or 0), now, now),
                    )
        elif asset_type in ("scene", "prop") and isinstance(variants, list):
            def _find_named_variant(label: str):
                return next((v for v in variants if (v.get("variantName") or "").strip() == label), None)

            ref_v = _find_named_variant("参考图")
            grid_v = _find_named_variant("宫格图")
            pano_v = next((v for v in variants if (v.get("variantName") or "").strip() in {"720", "720全景", "全景图", "全景"}), None)
            ref_img = None
            grid_img = None
            pano_img = None
            if ref_v:
                _s, _f = _asset_img_parts(
                    subdir, asset_type, name, "reference", _ext_from_key(ref_v.get('imageObjectKey')))
                ref_img = await _download_image(ref_v.get("imageSignedUrl"), _f, _s)
            if grid_v:
                _s, _f = _asset_img_parts(
                    subdir, asset_type, name, "grid", _ext_from_key(grid_v.get('imageObjectKey')))
                grid_img = await _download_image(grid_v.get("imageSignedUrl"), _f, _s)
            if pano_v:
                _s, _f = _asset_img_parts(
                    subdir, asset_type, name, "panorama", _ext_from_key(pano_v.get('imageObjectKey')))
                pano_img = await _download_image(pano_v.get("imageSignedUrl"), _f, _s)
            await db.execute(
                "UPDATE extracted_elements SET reference_image=?, grid_image=?, panorama_url=? WHERE id=?",
                (ref_img, grid_img, pano_img, element_id),
            )

        await db.commit()
    finally:
        await db.close()

    # v3.61.275:清掉该资产旧版散落在剧名根目录的通用名文件(team_{aid}_*)
    _purge_legacy_flat_images(subdir, aid)


# ============================================================
# C4: 资产反向推送(本地信息提取元素 → 云端待审池 asset-submissions)
# ============================================================
class PushAssetReq(BaseModel):
    novelId: int
    groupId: int
    elementIds: List[int]


@router.post("/push")
async def push_assets(req: PushAssetReq):
    """把选中的本地元素(成品图 + 马甲)推送到团队待审池(走审核闸门 asset-submissions)。

    云端目前只支持 cover + variants;宫格图/参考图/720 待云端扩字段后再接。
    """
    team_id = team_ctx.get_team_id()
    if team_id is None:
        raise HTTPException(status_code=401, detail="未登录团队席位")
    if not req.elementIds:
        raise HTTPException(status_code=400, detail="未选择要推送的素材")

    # 校验小说是团队剧,取 projectId
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, source_type, remote_project_id FROM novels WHERE id=?", (req.novelId,)
        )
        nv = await cur.fetchone()
    finally:
        await db.close()
    if not nv or nv["source_type"] != "team_script" or not nv["remote_project_id"]:
        raise HTTPException(status_code=400, detail="该小说不是团队剧本,无法推送资产")
    project_id = nv["remote_project_id"]
    try:
        project_id_int = int(project_id)
    except (TypeError, ValueError):
        project_id_int = project_id

    results: List[dict] = []
    for eid in req.elementIds:
        try:
            res = await _push_one_element(team_id, eid, project_id_int, req.groupId)
            results.append(res)
        except HTTPException as exc:
            results.append({"elementId": eid, "ok": False, "error": exc.detail})
        except Exception as e:
            logger.warning("[team-asset] push 元素 %s 异常: %s", eid, e)
            results.append({"elementId": eid, "ok": False, "error": str(e)[:120]})

    ok = sum(1 for r in results if r.get("ok"))
    return {"submitted": ok, "failed": len(results) - ok, "results": results}


async def _push_one_element(team_id: int, element_id: int, project_id, group_id: int) -> dict:
    db = await get_db()
    try:
        cur = await db.execute(
            "SELECT id, name, element_type, description, image_prompt, finished_image, image_url, "
            "reference_image, grid_image, panorama_url, aliases, audio_file, remote_source, remote_id "
            "FROM extracted_elements WHERE id=?",
            (element_id,),
        )
        el = await cur.fetchone()
        variants_rows = []
        if el:
            vcur = await db.execute(
                "SELECT variant_name, finished_image, image_url, image_prompt, sort_order, audio_file "
                "FROM character_variants WHERE element_id=? ORDER BY sort_order, id",
                (element_id,),
            )
            variants_rows = await vcur.fetchall()
    finally:
        await db.close()
    if not el:
        raise HTTPException(status_code=404, detail="元素不存在")

    name = el["name"] or f"元素{element_id}"
    # 成品图:finished_image 优先,退 image_url
    cover_abs = _local_abs(el["finished_image"]) or _local_abs(el["image_url"])
    if not cover_abs:
        raise HTTPException(status_code=400, detail=f"「{name}」没有可推送的成品图")
    cover = await _upload_one(team_id, cover_abs, "cover")

    # 马甲/扩展图 variants(有图的才推)
    # v3.61.230: 与 C3 拉取口径一致 —— variant_name 含「参考图」的不当马甲反推,避免重新污染云端
    variant_payload = []
    async def _append_variant_payload(variant_name: str, abs_path: str, prompt: str = "", sort_order: int = 0):
        up = await _upload_one(team_id, abs_path, "variant")
        variant_payload.append({
            "variantName": variant_name,
            "uploadLogId": up["uploadLogId"],
            "imageObjectKey": up["objectKey"],
            "prompt": prompt or "",
            "sortOrder": int(sort_order or 0),
        })

    asset_type = el["element_type"] or "character"
    if asset_type == "character":
        for v in variants_rows:
            if "参考图" in (v["variant_name"] or ""):
                continue
            vabs = _local_abs(v["finished_image"]) or _local_abs(v["image_url"])
            if not vabs:
                continue
            await _append_variant_payload(
                v["variant_name"] or "马甲",
                vabs,
                v["image_prompt"] or "",
                int(v["sort_order"] or 0),
            )
    elif asset_type in ("scene", "prop"):
        ref_abs = _local_abs(el["reference_image"])
        grid_abs = _local_abs(el["grid_image"])
        if ref_abs:
            await _append_variant_payload("参考图", ref_abs, "", 900)
        if grid_abs:
            await _append_variant_payload("宫格图", grid_abs, "", 901)
        if asset_type == "scene":
            pano_abs = _local_abs(el["panorama_url"])
            if pano_abs:
                await _append_variant_payload("720", pano_abs, "", 902)

    try:
        tags = json.loads(el["aliases"] or "[]")
        if not isinstance(tags, list):
            tags = []
    except Exception:
        tags = []

    body = {
        "scriptProjectId": project_id,
        "groupId": group_id,
        "assetType": asset_type,
        "name": name,
        "description": el["description"] or "",
        "prompt": el["image_prompt"] or "",
        "tags": tags,
        "coverUploadLogId": cover["uploadLogId"],
        "coverObjectKey": cover["objectKey"],
        "variants": variant_payload,
        "sourceTaskType": "manju_element",
        "sourceTaskId": element_id,
    }
    data = await _team_post(f"/team/{team_id}/asset-submissions", body, team_id, timeout=45.0)
    sub_id = (data or {}).get("submissionId") if isinstance(data, dict) else None

    # v3.61.264/266/267:角色音频 → 单独提交 assetType=audio submission。
    #   一条 audio 资产 = 本体音频(cover)+ 马甲音频(variants,音频跟着马甲走)。
    #   绑定角色:已同步团队角色(有 remote_id)→ boundCharacterId;否则(个人/新角色)→ boundCharacterName=角色名。
    #     云端 submit 支持 id/name 二选一(name 时角色同批推、审核通过后按名解析),所以个人角色也能随角色同批推音频。
    #   音频跟着图走:本体已校验有成品图;马甲取有 finished_image 的才带音频。
    audio_note = None
    if asset_type == "character":
        body_audio_abs = _local_abs(el["audio_file"]) if ("audio_file" in el.keys()) else None
        variant_audios = []  # (variant_name, abs_path):有成品图 + 有音频的马甲
        for v in variants_rows:
            if "参考图" in (v["variant_name"] or ""):
                continue
            vfin = _local_abs(v["finished_image"]) or _local_abs(v["image_url"])
            vaud = _local_abs(v["audio_file"]) if ("audio_file" in v.keys()) else None
            if vfin and vaud:
                variant_audios.append((v["variant_name"] or "马甲", vaud))

        if body_audio_abs or variant_audios:
            bound_cid = el["remote_id"] if ("remote_id" in el.keys()) else None
            is_team_synced = ("remote_source" in el.keys()) and el["remote_source"] == "team_asset"
            try:
                # 云端 audio 资产的 cover 是角色本体音频且必填。
                # 只有马甲音频、没有本体音频时不能无损表达,跳过以避免把马甲误挂成本体。
                if not body_audio_abs:
                    audio_note = f"audio_skipped: 仅有马甲音频{len(variant_audios)}条,缺本体音频"
                    logger.info("[team-asset] 跳过音频推送 element=%s: %s", element_id, audio_note)
                    return {
                        "elementId": element_id, "name": name, "ok": True,
                        "submissionId": sub_id,
                        "status": (data or {}).get("status") if isinstance(data, dict) else "pending",
                        "variants": len(variant_payload),
                        "audio": audio_note,
                    }
                au = await _upload_one(team_id, body_audio_abs, "cover")
                audio_variant_payload = []
                for vname, vpath in variant_audios:
                    vau = await _upload_one(team_id, vpath, "variant")
                    audio_variant_payload.append({
                        "variantName": vname,
                        "uploadLogId": vau["uploadLogId"],
                        "imageObjectKey": vau["objectKey"],  # 云端 audio variant 走 imageObjectKey 传音频
                        "sortOrder": 0,
                    })
                audio_body = {
                    "scriptProjectId": project_id,
                    "groupId": group_id,
                    "assetType": "audio",
                    "name": f"{name}_音频",
                    "coverUploadLogId": au["uploadLogId"],
                    "coverObjectKey": au["objectKey"],
                    "variants": audio_variant_payload,
                    "sourceTaskType": "manju_audio",
                    "sourceTaskId": element_id,
                }
                # 绑定:已入库角色用 id,否则用角色名(云端 approve 时按名解析)
                if bound_cid and is_team_synced:
                    audio_body["boundCharacterId"] = int(bound_cid)
                else:
                    audio_body["boundCharacterName"] = name
                await _team_post(f"/team/{team_id}/asset-submissions", audio_body, team_id, timeout=45.0)
                audio_note = f"audio_pushed(本体{'有' if body_audio_abs else '无'}+马甲{len(variant_audios)})"
            except HTTPException as ae:
                audio_note = f"audio_failed: {ae.detail}"
                logger.warning("[team-asset] 推音频失败 element=%s: %s", element_id, ae.detail)

    return {
        "elementId": element_id, "name": name, "ok": True,
        "submissionId": sub_id,
        "status": (data or {}).get("status") if isinstance(data, dict) else "pending",
        "variants": len(variant_payload),
        "audio": audio_note,
    }
