"""
v3.61.156: ERP 全景图 → 多视角拆图(参考用户提供的工作流)

输入: 一张 2:1 / 2.35:1 等距柱状投影全景图(equirectangular)
输出: 按 yaw 角度从全景图里采样出 N 张 16:9 透视截图,拼成网格图存盘

默认: 12 张,每 30° 一张(0°/30°/60°/.../330°),拼 4×3 网格
其他: 可指定 6/9/12 视角,自动适配 cols=ceil(N/3)

核心算法: equirectangular → perspective projection
  对网格里每个目标像素 (x, y):
    1. 算它在透视相机视角里的方向向量 (X, Y, Z)
    2. 应用 yaw 旋转(pitch=0 水平)
    3. 用 atan2/asin 反推方向对应等距柱状全景图上的 (lon, lat) 像素
    4. 双线性采样

为啥不用 OpenCV: 现有依赖 numpy + Pillow 就够了,bundle 更小。
单张全景 3072×1296 → 12 张 640×360 拼接,实测 < 3s,适合一键拆图。
"""

import logging
import os
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# 默认 12 视角(对齐用户参考工作流),每 30°
DEFAULT_YAW_STEP = 30
DEFAULT_TILE_W = 640    # 单格 16:9
DEFAULT_TILE_H = 360
DEFAULT_FOV_DEG = 75.0  # 标准镜头视角,接近自然观感
DEFAULT_PITCH = 0.0     # 水平,不抬头不低头


def equirect_to_perspective(
    pano: np.ndarray,
    out_w: int,
    out_h: int,
    yaw_deg: float,
    pitch_deg: float,
    fov_deg: float,
) -> np.ndarray:
    """从 equirectangular 全景图采样指定视角的透视投影图。

    Args:
        pano: 全景图 numpy 数组 (H, W, 3) uint8,水平 360° / 垂直 180°
        out_w, out_h: 输出透视图尺寸(默认 640×360 16:9)
        yaw_deg: 偏航角(0=正前,90=右,180=后,270=左)
        pitch_deg: 俯仰角(0=水平,正=抬头)
        fov_deg: 水平视场角

    Returns:
        透视投影 numpy 数组 (out_h, out_w, 3) uint8
    """
    pano_h, pano_w = pano.shape[:2]

    # 1. 输出网格归一化坐标
    # 焦距 f 由 fov 决定: f = (w/2) / tan(fov/2)
    fov_rad = np.deg2rad(fov_deg)
    f = (out_w / 2.0) / np.tan(fov_rad / 2.0)

    xs = np.linspace(-out_w / 2.0, out_w / 2.0, out_w, dtype=np.float32)
    ys = np.linspace(-out_h / 2.0, out_h / 2.0, out_h, dtype=np.float32)
    grid_x, grid_y = np.meshgrid(xs, ys)
    grid_z = np.full_like(grid_x, f)

    # 2. 应用 pitch(绕 X 轴旋转,正值抬头)+ yaw(绕 Y 轴旋转,正值向右)
    pitch_rad = np.deg2rad(pitch_deg)
    yaw_rad = np.deg2rad(yaw_deg)

    # pitch(X 轴): y, z 平面旋转
    cos_p = np.cos(pitch_rad)
    sin_p = np.sin(pitch_rad)
    y1 = grid_y * cos_p - grid_z * sin_p
    z1 = grid_y * sin_p + grid_z * cos_p
    x1 = grid_x

    # yaw(Y 轴): x, z 平面旋转
    cos_y = np.cos(yaw_rad)
    sin_y = np.sin(yaw_rad)
    x2 = x1 * cos_y + z1 * sin_y
    y2 = y1
    z2 = -x1 * sin_y + z1 * cos_y

    # 3. 方向向量 → 全景图 (lon, lat)
    r = np.sqrt(x2 * x2 + y2 * y2 + z2 * z2)
    lon = np.arctan2(x2, z2)
    lat = np.arcsin(y2 / r)

    # 4. 映射到全景图像素坐标
    u = (lon / (2.0 * np.pi) + 0.5) * pano_w
    v = (lat / np.pi + 0.5) * pano_h

    # 5. 双线性采样
    u = np.clip(u, 0, pano_w - 1)
    v = np.clip(v, 0, pano_h - 1)
    u0 = np.floor(u).astype(np.int32)
    v0 = np.floor(v).astype(np.int32)
    u1 = np.clip(u0 + 1, 0, pano_w - 1)
    v1 = np.clip(v0 + 1, 0, pano_h - 1)
    du = (u - u0).astype(np.float32)
    dv = (v - v0).astype(np.float32)

    # 横向 wrap: u1 在右边界时回到 0(全景图水平循环)
    u1 = np.where(u0 == pano_w - 1, 0, u1)

    c00 = pano[v0, u0].astype(np.float32)
    c01 = pano[v0, u1].astype(np.float32)
    c10 = pano[v1, u0].astype(np.float32)
    c11 = pano[v1, u1].astype(np.float32)

    du_ = du[..., None]
    dv_ = dv[..., None]
    top = c00 * (1 - du_) + c01 * du_
    bot = c10 * (1 - du_) + c11 * du_
    out = top * (1 - dv_) + bot * dv_
    return np.clip(out, 0, 255).astype(np.uint8)


def panorama_to_views(
    panorama_path: str,
    output_path: str,
    view_count: int = 12,
    pitch: float = DEFAULT_PITCH,
    fov: float = DEFAULT_FOV_DEG,
    tile_w: int = DEFAULT_TILE_W,
    tile_h: int = DEFAULT_TILE_H,
    gap_px: int = 16,
    gap_color: Tuple[int, int, int] = (255, 255, 255),
) -> Tuple[bool, str]:
    """ERP 全景图 → N 视角网格图(默认 12 视角 4×3 16:9)。

    Args:
        panorama_path: 输入全景图绝对路径(2:1 或 2.35:1 ERP)
        output_path: 输出网格图绝对路径
        view_count: 视角数,推荐 6 / 9 / 12;每 360/N° 采一张
        pitch, fov: 透视参数
        tile_w, tile_h: 单格分辨率(默认 640×360 16:9 跟用户参考工作流一致)
        gap_px: v3.61.186 单格间距(像素),0=紧贴老风格,默认 16 跟用户参考的宫格风格对齐
        gap_color: 间距填充色,默认白色 (R,G,B)

    Returns:
        (success, message)
    """
    if not os.path.isfile(panorama_path):
        return False, f"全景图文件不存在: {panorama_path}"

    if view_count < 1 or view_count > 24:
        return False, f"view_count={view_count} 不合理,建议 6/9/12"

    # 列数自适应:N≤4 → 2 列,5-9 → 3 列,10+ → 4 列
    if view_count <= 4:
        cols = 2
    elif view_count <= 9:
        cols = 3
    else:
        cols = 4
    rows = (view_count + cols - 1) // cols

    # yaw 角度列表:0, 360/N, 2*360/N, ...
    step = 360.0 / view_count
    yaws = [round(i * step, 2) for i in range(view_count)]

    try:
        pano_img = Image.open(panorama_path).convert("RGB")
        pano = np.asarray(pano_img)
    except Exception as e:
        return False, f"全景图加载失败: {e}"

    tiles = []
    for yaw in yaws:
        try:
            tile = equirect_to_perspective(pano, tile_w, tile_h, yaw, pitch, fov)
            tiles.append(tile)
        except Exception as e:
            logger.exception(f"[panorama] yaw={yaw}° 投影失败: {e}")
            return False, f"yaw={yaw}° 透视投影失败: {e}"

    # 拼网格(v3.61.186: 加白色间距,对齐用户参考的宫格风格;gap_px=0 可走老风格)
    gap = max(0, int(gap_px))
    grid_w = tile_w * cols + gap * (cols - 1 if cols > 0 else 0)
    grid_h = tile_h * rows + gap * (rows - 1 if rows > 0 else 0)
    bg = np.array(gap_color, dtype=np.uint8).reshape(1, 1, 3)
    grid = np.broadcast_to(bg, (grid_h, grid_w, 3)).copy()
    for idx, tile in enumerate(tiles):
        r = idx // cols
        c = idx % cols
        y0 = r * (tile_h + gap)
        x0 = c * (tile_w + gap)
        grid[y0:y0 + tile_h, x0:x0 + tile_w] = tile

    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        Image.fromarray(grid).save(output_path, format="PNG", optimize=True)
        logger.info(
            f"[panorama] 拆视角成功: {view_count}视角 / {cols}×{rows} 布局 / "
            f"单格 {tile_w}×{tile_h} → {output_path}"
        )
        return True, f"拆 {view_count} 视角成功({cols}×{rows} 网格)"
    except Exception as e:
        logger.exception(f"[panorama] 保存失败: {e}")
        return False, f"保存失败: {e}"


# v3.61.147 老 API 保留(老调用方可能还在用)— 默认 6 视角 3×2
def panorama_to_grid(panorama_path: str, output_path: str) -> Tuple[bool, str]:
    """老 API,默认 6 视角 3×2,新代码推荐 panorama_to_views(view_count=12)。

    v3.61.186: 老 API 保持 gap_px=0 紧贴拼接,不破坏既有输出尺寸。
    """
    return panorama_to_views(panorama_path, output_path, view_count=6,
                              tile_w=768, tile_h=768, gap_px=0)
