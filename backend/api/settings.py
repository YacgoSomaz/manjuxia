"""通用全局设置 API。
- GET /api/settings/{key} -> {"key", "value"}(value 是字符串,布尔值约定 '0'/'1')
- PUT /api/settings/{key} -> body {"value": "..."}
- GET /api/settings/media-dir/info -> 媒体目录信息
- POST /api/settings/media-dir/change -> 切换媒体目录
"""
import os
import shutil
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.settings_service import SettingsService
from utils.paths import get_data_dir, get_media_dir

router = APIRouter(prefix="/api/settings", tags=["settings"])
logger = logging.getLogger(__name__)

KEY_MEDIA_DIR = "data.media_dir_override"


class SettingValue(BaseModel):
    value: str


# ---- 媒体目录相关接口 — 必须在 /{key} 通用路由之前注册,否则会被泛匹配吞掉 ----

def _calc_dir_size(path: str) -> int:
    """递归计算目录占用大小(字节)。失败返 0 不抛"""
    total = 0
    try:
        for entry in os.scandir(path):
            try:
                if entry.is_file(follow_symlinks=False):
                    total += entry.stat(follow_symlinks=False).st_size
                elif entry.is_dir(follow_symlinks=False):
                    total += _calc_dir_size(entry.path)
            except Exception:
                continue
    except Exception:
        pass
    return total


def _format_size(n: int) -> str:
    for u in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024:
            return f"{n:.1f} {u}"
        n /= 1024
    return f"{n:.1f} PB"


@router.get("/media-dir/info")
async def get_media_dir_info():
    """获取当前媒体目录信息(路径 + 各分类占用 + 默认路径)。"""
    cur_dir = get_media_dir()
    default_dir = get_data_dir()
    is_custom = os.path.normpath(cur_dir) != os.path.normpath(default_dir)

    breakdown = {}
    for cat in ("images", "videos", "audios", "subtitle_removed"):
        sub = os.path.join(cur_dir, cat)
        if os.path.isdir(sub):
            sz = _calc_dir_size(sub)
            breakdown[cat] = {"bytes": sz, "human": _format_size(sz)}
        else:
            breakdown[cat] = {"bytes": 0, "human": "0 B"}

    total = sum(b["bytes"] for b in breakdown.values())
    return {
        "current_dir": cur_dir,
        "default_dir": default_dir,
        "is_custom": is_custom,
        "breakdown": breakdown,
        "total_bytes": total,
        "total_human": _format_size(total),
    }


class ChangeMediaDirRequest(BaseModel):
    new_dir: str           # 用户选的新目录(绝对路径)
    migrate: str = "skip"  # 'move'(迁移) / 'skip'(只切换不动旧素材) / 'cancel'


@router.post("/media-dir/change")
async def change_media_dir(req: ChangeMediaDirRequest):
    """切换媒体保存目录。
    migrate:
      - 'move':把当前媒体目录里的 images/videos/audios/subtitle_removed 整个 move 到新目录
      - 'skip':只切设置,旧素材留原处(可能造成查找混乱)
      - 'cancel':取消
    """
    if req.migrate == "cancel":
        return {"success": False, "message": "已取消"}

    new_dir = os.path.normpath(req.new_dir.strip())
    if not new_dir:
        raise HTTPException(400, "新目录路径为空")

    # 校验:不能跟 data_dir 相同(那等于回退默认)
    cur_dir = get_media_dir()
    if os.path.normpath(new_dir) == os.path.normpath(cur_dir):
        return {"success": False, "message": "新目录和当前目录相同,无需切换"}

    # 不允许选 data_dir 当媒体目录(否则 db 跟媒体混)— 除非是显式回退默认
    default_dir = get_data_dir()
    is_revert_default = os.path.normpath(new_dir) == os.path.normpath(default_dir)

    # 创建新目录
    try:
        os.makedirs(new_dir, exist_ok=True)
    except Exception as e:
        raise HTTPException(400, f"新目录无法创建:{e}")

    # 写入权限校验
    test_file = os.path.join(new_dir, ".wanshan_write_test.tmp")
    try:
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
    except Exception as e:
        raise HTTPException(400, f"新目录无写入权限:{e}")

    # 迁移
    moved_count = 0
    if req.migrate == "move":
        for cat in ("images", "videos", "audios", "subtitle_removed"):
            src = os.path.join(cur_dir, cat)
            dst = os.path.join(new_dir, cat)
            if not os.path.isdir(src):
                continue
            if os.path.normpath(src) == os.path.normpath(dst):
                continue
            try:
                # 如果目标已存在,合并(逐文件移动)
                if os.path.isdir(dst):
                    for entry in os.scandir(src):
                        target = os.path.join(dst, entry.name)
                        if not os.path.exists(target):
                            shutil.move(entry.path, target)
                            moved_count += 1
                else:
                    shutil.move(src, dst)
                    moved_count += 1
                logger.info(f"[media-dir] 已迁移 {cat}:{src} → {dst}")
            except Exception as e:
                logger.error(f"[media-dir] 迁移 {cat} 失败: {e}")
                # 不抛出,继续迁其它分类

    # 写设置
    if is_revert_default:
        # 回退默认:清空 setting
        await SettingsService.set(KEY_MEDIA_DIR, "")
    else:
        await SettingsService.set(KEY_MEDIA_DIR, new_dir)
    logger.info(f"[media-dir] 切换完成,新目录: {new_dir} (迁移 {moved_count} 项)")

    return {
        "success": True,
        "new_dir": new_dir,
        "is_default": is_revert_default,
        "migrated": moved_count if req.migrate == "move" else 0,
        "message": f"已切换到 {new_dir}" + (f",迁移了 {moved_count} 项素材" if req.migrate == "move" else ""),
    }


# ---- 通用 settings(放最后,/{key} 是泛匹配)----

@router.get("/{key}")
async def get_setting(key: str):
    val = await SettingsService.get(key, default="")
    return {"key": key, "value": val}


@router.put("/{key}")
async def put_setting(key: str, body: SettingValue):
    if not key or len(key) > 200:
        raise HTTPException(400, "key 非法")
    await SettingsService.set(key, body.value)
    return {"key": key, "value": body.value, "success": True}
