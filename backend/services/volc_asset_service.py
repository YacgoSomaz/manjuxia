"""v3.61.99: 火山方舟私域素材库(Asset Lib)— 企业版用,本地 AK/SK 直连火山

用途:把虚拟人像 / 场景 / 道具图加白入库,规避 Seedance 2.0 Deepfake/版权拦截。
流程:
  1. 用户在「设置 → 火山方舟素材库(企业版)」填 AK / SK / ProjectName
  2. 信息提取页元素卡片点「🔐 加白入库」按钮
  3. 后端用本地 AK/SK 调火山 OpenAPI(CreateAssetGroup / CreateAsset / GetAsset)
  4. 拿到 asset-xxxx 后存 extracted_elements.volc_asset_uri (`asset://asset-xxx`)
  5. 视频生成时,如果元素有 volc_asset_uri,直接用 asset:// URI(替代 base64)

AK/SK 不离开本地,本地 SQLite settings 表加密存(用 Electron safeStorage IPC)。
"""
import os
import time
import json
import hmac
import asyncio
import hashlib
import base64
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple, List
from urllib.parse import quote

import aiohttp

from utils.ssl_helper import get_aiohttp_connector

logger = logging.getLogger(__name__)


# ==================== 火山引擎 OpenAPI 常量 ====================
VOLC_ENDPOINT = "open.volcengineapi.com"
VOLC_REGION = "cn-beijing"
VOLC_SERVICE = "ark"
VOLC_API_VERSION = "2024-01-01"

# v3.61.108: 瞬时错误码 — 这些是火山服务端临时问题,重试有效
_TRANSIENT_VOLC_CODES = {
    "InternalServiceTimeout",
    "ServiceUnavailable",
    "InternalError",
    "InternalServerError",
    "Throttling",
    "TooManyRequests",
}


# ==================== AK/SK 签名(火山 v4 签名,纯 Python 实现) ====================
def _hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _norm_query(params: Dict[str, str]) -> str:
    if not params:
        return ""
    items = sorted(params.items())
    return "&".join(f"{quote(k, safe='-_.~')}={quote(str(v), safe='-_.~')}" for k, v in items)


def _sign_request(
    method: str,
    query: Dict[str, str],
    body: bytes,
    ak: str,
    sk: str,
) -> Dict[str, str]:
    """火山 v4 签名,返回完整 HTTP Headers(含 Authorization)"""
    now = datetime.now(timezone.utc)
    date = now.strftime("%Y%m%d")
    x_date = now.strftime("%Y%m%dT%H%M%SZ")

    body_sha = _sha256_hex(body or b"")
    canonical_headers_keys = ["content-type", "host", "x-content-sha256", "x-date"]
    headers_kv = {
        "content-type": "application/json; charset=utf-8",
        "host": VOLC_ENDPOINT,
        "x-content-sha256": body_sha,
        "x-date": x_date,
    }
    canonical_headers = "".join(f"{k}:{headers_kv[k]}\n" for k in canonical_headers_keys)
    signed_headers = ";".join(canonical_headers_keys)

    canonical_request = "\n".join([
        method.upper(),
        "/",
        _norm_query(query),
        canonical_headers,
        signed_headers,
        body_sha,
    ])

    credential_scope = f"{date}/{VOLC_REGION}/{VOLC_SERVICE}/request"
    string_to_sign = "\n".join([
        "HMAC-SHA256",
        x_date,
        credential_scope,
        _sha256_hex(canonical_request.encode("utf-8")),
    ])

    k_date = _hmac_sha256(sk.encode("utf-8"), date)
    k_region = _hmac_sha256(k_date, VOLC_REGION)
    k_service = _hmac_sha256(k_region, VOLC_SERVICE)
    k_signing = _hmac_sha256(k_service, "request")
    signature = hmac.new(k_signing, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    authorization = (
        f"HMAC-SHA256 Credential={ak}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )

    return {
        "Authorization": authorization,
        "Content-Type": "application/json; charset=utf-8",
        "Host": VOLC_ENDPOINT,
        "X-Content-Sha256": body_sha,
        "X-Date": x_date,
    }


# ==================== 通用调用工具 ====================
async def _volc_call(action: str, body: Dict[str, Any], ak: str, sk: str, max_retries: int = 3) -> Dict[str, Any]:
    """调用火山引擎 OpenAPI 的通用工具

    Args:
        action: 接口名(CreateAssetGroup / CreateAsset / GetAsset 等)
        body: JSON body
        ak / sk: 用户的火山 AK/SK
        max_retries: 瞬时错误时最多重试次数(v3.61.108)
    Returns:
        响应 dict;失败抛 RuntimeError
    """
    if not ak or not sk:
        raise RuntimeError("火山 AK/SK 未配置,请到「设置 → 火山方舟素材库」填写")

    last_error: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        # 每次重试都要重签(x-date 跟时间相关,旧签名过期)
        query = {"Action": action, "Version": VOLC_API_VERSION}
        body_bytes = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers = _sign_request("POST", query, body_bytes, ak, sk)

        url = f"https://{VOLC_ENDPOINT}/?{_norm_query(query)}"
        # CreateAsset 涉及火山反向 fetch 图片,给宽点;其他接口正常 30s
        _total_timeout = 60 if action in ("CreateAsset",) else 30
        timeout_cfg = aiohttp.ClientTimeout(total=_total_timeout, connect=10)
        try:
            async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=timeout_cfg) as session:
                async with session.post(url, headers=headers, data=body_bytes) as resp:
                    text = await resp.text()
                    try:
                        data = json.loads(text)
                    except Exception:
                        raise RuntimeError(f"火山 {action} 响应非 JSON: {text[:300]}")

                    # 火山 OpenAPI 错误格式:
                    # 成功:{"ResponseMetadata":{...},"Result":{...}}
                    # 失败:{"ResponseMetadata":{"Error":{"Code":"xxx","Message":"xxx"}}}
                    meta = data.get("ResponseMetadata") or {}
                    err = meta.get("Error")
                    if err:
                        code = err.get("Code", "")
                        msg = err.get("Message", "")
                        # v3.61.108: 瞬时错误自动重试
                        if code in _TRANSIENT_VOLC_CODES and attempt < max_retries:
                            backoff = (2 ** attempt) + 1  # 2s, 3s, 5s
                            logger.warning(
                                f"[volc-call] {action} 瞬时错误 [{code}] {msg}, "
                                f"{backoff}s 后重试 ({attempt + 1}/{max_retries})"
                            )
                            await asyncio.sleep(backoff)
                            last_error = RuntimeError(f"火山 {action} 失败: [{code}] {msg}")
                            continue
                        raise RuntimeError(f"火山 {action} 失败: [{code}] {msg}")

                    if resp.status >= 400:
                        if 500 <= resp.status < 600 and attempt < max_retries:
                            backoff = (2 ** attempt) + 1
                            logger.warning(
                                f"[volc-call] {action} HTTP {resp.status},"
                                f"{backoff}s 后重试 ({attempt + 1}/{max_retries}): {text[:200]}"
                            )
                            await asyncio.sleep(backoff)
                            last_error = RuntimeError(f"火山 {action} HTTP {resp.status}: {text[:300]}")
                            continue
                        raise RuntimeError(f"火山 {action} HTTP {resp.status}: {text[:300]}")

                    return data.get("Result") or {}
        except asyncio.TimeoutError as e:
            # 网络超时也算 transient
            if attempt < max_retries:
                backoff = (2 ** attempt) + 1
                logger.warning(
                    f"[volc-call] {action} 网络超时(>{_total_timeout}s),"
                    f"{backoff}s 后重试 ({attempt + 1}/{max_retries})"
                )
                await asyncio.sleep(backoff)
                last_error = RuntimeError(f"火山 {action} 网络超时(>{_total_timeout}s)")
                continue
            raise RuntimeError(f"火山 {action} 网络超时(>{_total_timeout}s,已重试 {max_retries} 次)")
        except aiohttp.ClientError as e:
            # 连接重置 / DNS 失败 也算 transient
            if attempt < max_retries:
                backoff = (2 ** attempt) + 1
                logger.warning(
                    f"[volc-call] {action} 网络错误 {type(e).__name__}: {e}, "
                    f"{backoff}s 后重试 ({attempt + 1}/{max_retries})"
                )
                await asyncio.sleep(backoff)
                last_error = RuntimeError(f"火山 {action} 网络错误: {e}")
                continue
            raise RuntimeError(f"火山 {action} 网络错误(已重试 {max_retries} 次): {e}")

    # 理论上不会走到这里,for-else 完整退出意味着所有重试都用 continue
    if last_error:
        raise last_error
    raise RuntimeError(f"火山 {action} 失败(未知原因)")


# ==================== 业务接口 ====================
async def create_asset_group(
    name: str,
    description: str,
    project_name: str,
    ak: str,
    sk: str,
    group_type: str = "AIGC",
) -> str:
    """创建素材组合,返回 group_id"""
    body = {
        "Name": name,
        "Description": description or "",
        "GroupType": group_type,
        "ProjectName": project_name or "default",
    }
    res = await _volc_call("CreateAssetGroup", body, ak, sk)
    group_id = res.get("Id")
    if not group_id:
        raise RuntimeError(f"CreateAssetGroup 返回缺 Id: {res}")
    logger.info(f"[volc-asset] 创建素材组 {group_id} name={name} project={project_name}")
    return group_id


async def create_asset(
    group_id: str,
    image_url: str,
    project_name: str,
    ak: str,
    sk: str,
    asset_type: str = "Image",
    name: str = "",
) -> str:
    """上传素材,返回 asset_id

    image_url 必须是火山能访问到的公网 URL(我们走 admin server 的 /api/refs/upload 拿临时 URL)
    """
    body = {
        "GroupId": group_id,
        "URL": image_url,
        "AssetType": asset_type,
        "ProjectName": project_name or "default",
        "Name": name or "",
    }
    res = await _volc_call("CreateAsset", body, ak, sk)
    asset_id = res.get("Id")
    if not asset_id:
        raise RuntimeError(f"CreateAsset 返回缺 Id: {res}")
    logger.info(f"[volc-asset] 创建素材 {asset_id} group={group_id} type={asset_type}")
    return asset_id


async def get_asset(
    asset_id: str,
    project_name: str,
    ak: str,
    sk: str,
) -> Dict[str, Any]:
    """查素材状态。返回火山原始 dict,关键字段:
    - Status: Processing / Active / Failed
    - URL: 临时下载 URL(有效期 12h)
    - GroupId / AssetType / CreateTime
    """
    body = {
        "Id": asset_id,
        "ProjectName": project_name or "default",
    }
    res = await _volc_call("GetAsset", body, ak, sk)
    return res


async def list_asset_groups(
    project_name: str,
    ak: str,
    sk: str,
    page_size: int = 50,
) -> List[Dict[str, Any]]:
    """列出某项目下所有素材组"""
    body = {
        "Filter": {
            "GroupType": "AIGC",
        },
        "PageNumber": 1,
        "PageSize": page_size,
    }
    if project_name:
        # 火山 ListAssetGroups 没有显式 ProjectName 字段;走默认即可
        pass
    res = await _volc_call("ListAssetGroups", body, ak, sk)
    return res.get("Items") or []


async def upload_image_to_admin_temp(image_local_path: str) -> str:
    """把本地图片上传到千山 storyboard-ref OSS,返回公网 URL 给火山 CreateAsset 用

    v3.61.109 改造 — 用千山平台 OSS 端点取代 admin /api/refs/upload:
        优先:POST https://api.qianshanai.cn/api/tools/web/storyboard/upload-ref
              (Bearer token,文件直传 OSS,2 天 TTL,带宽走 OSS CDN)
        降级:POST admin /api/refs/upload (慢,只在新接口失败时兜底)

    上传前压缩成 JPEG q=85 / 长边 1920(再快的 CDN 也比小图慢)
    """
    from services.image_service import ImageService
    from utils.paths import resolve_db_path
    abs_path = resolve_db_path(image_local_path)
    if not abs_path or not os.path.exists(abs_path):
        raise RuntimeError(f"本地图片不存在: {image_local_path}")

    # ---------- 压图 ----------
    _orig_size = os.path.getsize(abs_path)
    raw: bytes
    upload_ext = os.path.splitext(abs_path)[1].lower() or ".png"
    upload_ct = "image/png"
    if _orig_size <= 300 * 1024:
        with open(abs_path, "rb") as f:
            raw = f.read()
        if upload_ext in (".jpg", ".jpeg"):
            upload_ct = "image/jpeg"
        elif upload_ext == ".webp":
            upload_ct = "image/webp"
        logger.info(f"[volc-asset] 图片 {_orig_size//1024}KB,小于阈值,跳过压缩")
    else:
        try:
            from PIL import Image
            import io as _io
            img = Image.open(abs_path)
            if img.mode in ("RGBA", "LA", "P"):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            _MAX_SIDE = 1920
            if max(img.size) > _MAX_SIDE:
                ratio = _MAX_SIDE / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.LANCZOS)
                logger.info(f"[volc-asset] 图片 downscale 到 {new_size}")
            buf = _io.BytesIO()
            img.save(buf, format="JPEG", quality=85, optimize=True)
            raw = buf.getvalue()
            upload_ext = ".jpg"
            upload_ct = "image/jpeg"
            logger.info(
                f"[volc-asset] 图片压缩 {_orig_size//1024}KB → {len(raw)//1024}KB (JPEG q=85)"
            )
        except Exception as _e:
            logger.warning(f"[volc-asset] 压缩失败,fallback 用原图: {_e}")
            with open(abs_path, "rb") as f:
                raw = f.read()

    # ---------- 优先:千山平台 storyboard-ref OSS 上传 ----------
    try:
        from services import cloud_token_service as cts
        await cts.get_access_token()  # 确保 token 没过期(会自动 refresh)
        url = "https://api.qianshanai.cn/api/tools/web/storyboard/upload-ref"
        filename = f"asset{upload_ext}"
        form = aiohttp.FormData()
        form.add_field("file", raw, filename=filename, content_type=upload_ct)
        timeout_cfg = aiohttp.ClientTimeout(total=60, connect=15)
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=timeout_cfg) as session:
            async with session.post(url, headers=cts.headers(), data=form) as resp:
                text = await resp.text()
                if resp.status != 200:
                    raise RuntimeError(f"千山 storyboard-ref 上传 HTTP {resp.status}: {text[:300]}")
                try:
                    body = json.loads(text)
                except Exception:
                    raise RuntimeError(f"千山 storyboard-ref 响应非 JSON: {text[:300]}")
                # 兼容几种常见返回结构
                if body.get("code") not in (200, 0, None):
                    raise RuntimeError(f"千山 storyboard-ref code={body.get('code')} msg={body.get('message') or body.get('msg')}")
                data = body.get("data") if isinstance(body.get("data"), dict) else body
                ref_url = (
                    (data or {}).get("url")
                    or (data or {}).get("file_url")
                    or (data or {}).get("publicUrl")
                    or body.get("url")
                )
                if not ref_url:
                    raise RuntimeError(f"千山 storyboard-ref 返回缺 url 字段: {text[:300]}")
        logger.info(f"[volc-asset] 已上传 storyboard-ref OSS({len(raw)//1024}KB) → {ref_url[:100]}...")
        return ref_url
    except Exception as _e:
        logger.warning(f"[volc-asset] storyboard-ref 上传失败,降级 admin /api/refs/upload: {_e}")

    # ---------- 降级:admin /api/refs/upload ----------
    b64 = base64.b64encode(raw).decode("ascii")
    ref_url, _del_token = await ImageService._upload_ref_to_admin(b64)
    logger.info(f"[volc-asset] 已通过 admin /refs 上传({len(raw)//1024}KB) → {ref_url[:80]}...")
    return ref_url


# ==================== 测试连接 ====================
async def test_credentials(ak: str, sk: str, project_name: str = "default") -> Tuple[bool, str]:
    """用 ListAssetGroups 试一下 AK/SK 是否有效,返回 (是否成功, 消息)"""
    try:
        items = await list_asset_groups(project_name, ak, sk, page_size=1)
        return True, f"连接成功,当前项目 [{project_name}] 已有 {len(items)} 个素材组"
    except Exception as e:
        return False, str(e)
