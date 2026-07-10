"""图片水印工具(中央红色半透明"此图由AI生成"标识)。

业务背景:
- 即梦/抖音对"涉嫌真人照片"做审核拦截。AIGC 内容只要打了合规标识,审核会跳过这部分检测
- 配合《生成式人工智能服务管理暂行办法》第十二条要求

实现:
- PIL 加载本地 PNG → RGBA 模式
- 居中绘制大字号红色半透明文本
- 自动选可用中文字体(微软雅黑 / 黑体 / 宋体 / fallback PIL 默认)
- 失败时不阻塞业务,日志告警后保持原图
"""
import os
import sys
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# 候选字体路径(按优先级排序)
_CANDIDATE_FONTS = [
    r"C:\Windows\Fonts\msyh.ttc",       # 微软雅黑
    r"C:\Windows\Fonts\msyhbd.ttc",     # 微软雅黑 Bold
    r"C:\Windows\Fonts\simhei.ttf",     # 黑体
    r"C:\Windows\Fonts\simsun.ttc",     # 宋体
    r"C:\Windows\Fonts\Deng.ttf",       # 等线
    "/System/Library/Fonts/PingFang.ttc",       # macOS
    "/usr/share/fonts/wqy-microhei.ttc",        # Linux
]


def _find_chinese_font_path() -> Optional[str]:
    for p in _CANDIDATE_FONTS:
        if os.path.exists(p):
            return p
    return None


def _find_yunet_model() -> Optional[str]:
    """定位 YuNet ONNX 模型文件路径。
    打包后通过 pyinstaller 把 backend/ml_models 一起塞进 _internal/ml_models,
    开发时直接在 backend/ml_models。
    """
    candidates = []
    # PyInstaller 运行时(_MEIPASS 指向解包临时目录)
    import sys
    if hasattr(sys, "_MEIPASS"):
        candidates.append(os.path.join(sys._MEIPASS, "ml_models", "face_detection_yunet_2023mar.onnx"))
    # 开发环境:相对 backend 目录
    here = os.path.dirname(os.path.abspath(__file__))  # backend/services
    candidates.append(os.path.normpath(os.path.join(here, "..", "ml_models", "face_detection_yunet_2023mar.onnx")))
    # frozen 时 services 目录在 _internal/services,模型在 _internal/ml_models
    candidates.append(os.path.normpath(os.path.join(here, "..", "..", "ml_models", "face_detection_yunet_2023mar.onnx")))
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def _detect_faces(image_path: str) -> list:
    """检测人脸,返回 [(x, y, w, h), ...] 像素坐标列表。

    v3.59.47:主用 OpenCV YuNet DNN 模型(对 AI 渲染脸识别率显著高于 haarcascade);
    YuNet 失败时 fallback 到 haarcascade_frontalface_default + alt2 + profileface 三种合并。
    任何异常或全部失败 → 返回 []。
    """
    try:
        import cv2
    except ImportError:
        logger.info("[watermark] cv2 不可用,跳过人脸检测")
        return []

    # v3.61.45: cv2.imread 不支持 Windows 中文路径,统一用 imdecode 绕开
    def _read_image_safe(p: str):
        try:
            import numpy as _np
            with open(p, "rb") as _f:
                _buf = _np.frombuffer(_f.read(), dtype=_np.uint8)
            return cv2.imdecode(_buf, cv2.IMREAD_COLOR)
        except Exception as _e:
            logger.warning(f"[watermark] 读图失败: {p} {_e}")
            return None

    # === 主路径:YuNet DNN ===
    yunet_path = _find_yunet_model()
    if yunet_path:
        try:
            img = _read_image_safe(image_path)
            if img is None:
                logger.warning(f"[watermark] 读不到图: {image_path}")
                return []
            h, w = img.shape[:2]
            detector = cv2.FaceDetectorYN.create(
                yunet_path,
                "",
                (w, h),
                score_threshold=0.5,  # 0.5 比默认 0.9 宽松,捕半写实/插画风脸
                nms_threshold=0.3,
                top_k=5000,
            )
            detector.setInputSize((w, h))
            _, faces = detector.detect(img)
            result = []
            if faces is not None:
                for f in faces:
                    x, y, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
                    # 边界规整
                    x = max(0, x); y = max(0, y)
                    fw = min(fw, w - x); fh = min(fh, h - y)
                    if fw > 20 and fh > 20:
                        result.append((x, y, fw, fh))
            logger.info(f"[watermark] YuNet 检测命中 {len(result)} 处 -> {os.path.basename(image_path)}")
            return result
        except Exception as e:
            logger.warning(f"[watermark] YuNet 检测异常({type(e).__name__}),fallback haarcascade: {e}")
    else:
        logger.warning("[watermark] 找不到 YuNet 模型,fallback haarcascade")

    # === Fallback:haarcascade(三个 cascade 合并 + 去重)===
    try:
        cascade_dir = getattr(cv2.data, "haarcascades", None) if hasattr(cv2, "data") else None
        if not cascade_dir:
            return []
        img = _read_image_safe(image_path)
        if img is None:
            return []
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        boxes: list = []
        for xml_name in (
            "haarcascade_frontalface_default.xml",
            "haarcascade_frontalface_alt2.xml",
            "haarcascade_profileface.xml",
        ):
            p = os.path.join(cascade_dir, xml_name)
            if not os.path.exists(p):
                continue
            cascade = cv2.CascadeClassifier(p)
            if cascade.empty():
                continue
            faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(40, 40))
            for (x, y, w_, h_) in faces:
                boxes.append((int(x), int(y), int(w_), int(h_)))
        # 去重(IoU > 0.4 视为重复)
        deduped: list = []
        for b in boxes:
            keep = True
            for d in deduped:
                if _iou(b, d) > 0.4:
                    keep = False
                    break
            if keep:
                deduped.append(b)
        logger.info(f"[watermark] haarcascade 合并检测命中 {len(deduped)} 处 -> {os.path.basename(image_path)}")
        return deduped
    except Exception as e:
        logger.warning(f"[watermark] haarcascade 检测异常({type(e).__name__}): {e}")
        return []


def _iou(a: tuple, b: tuple) -> float:
    """两个 (x,y,w,h) 矩形的 IoU。"""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def add_ai_watermark(image_path: str, text: str = "此图由AI生成", face_mode: bool = False) -> bool:
    """给指定路径图片打红色半透明 AI 水印,**就地覆盖原文件**。

    face_mode=False(默认):仅居中大字水印(原行为)
    face_mode=True:居中水印 + 在每张检测到的脸上叠加小"AI"标
                    用于人物三视图、表情图、面部特写等多脸合成图,
                    避免居中水印因绕开脸部区域而失效。

    成功返回 True;失败返回 False(原文件不动,日志告警)。
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as e:
        logger.warning(f"[watermark] PIL 不可用,跳过水印: {e}")
        return False

    if not os.path.exists(image_path):
        logger.warning(f"[watermark] 图片不存在: {image_path}")
        return False

    try:
        img = Image.open(image_path).convert("RGBA")
    except Exception as e:
        logger.warning(f"[watermark] 打开图片失败({type(e).__name__}): {image_path} -> {e}")
        return False

    try:
        # 字体大小 = 图片宽度的 9%
        font_size = max(36, int(img.width * 0.09))
        font_path = _find_chinese_font_path()
        if font_path:
            try:
                font = ImageFont.truetype(font_path, font_size)
            except Exception:
                font = ImageFont.load_default()
        else:
            # fallback 默认字体不支持中文,会显示乱码方框,但至少不崩
            font = ImageFont.load_default()
            logger.warning("[watermark] 找不到中文字体,水印显示可能异常")

        # 准备透明 overlay
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # 计算居中位置
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
        except Exception:
            # 老版本 PIL 用 textsize
            tw, th = draw.textsize(text, font=font)

        x = (img.width - tw) // 2
        y = (img.height - th) // 2 - bbox[1] if 'bbox' in locals() else (img.height - th) // 2

        # 红色半透明文字 (alpha=170 ≈ 67%)
        draw.text((x, y), text, font=font, fill=(255, 50, 50, 170))

        # ★ v3.59.45 / v3.59.47:面部覆盖 + 九宫格兜底
        # B 档:YuNet DNN 检测(主),漏检 fallback haarcascade
        # C 档:不管检测有无,九宫格(3×3)中心都打一个"AI"小标 — 保证多脸合成图
        #       任意角落都被水印覆盖,即梦审核 OCR 至少撞到一个合规标识
        face_label_count = 0
        grid_label_count = 0
        if face_mode:
            face_text = "AI"

            def _draw_ai_label(cx: int, cy: int, font_size_px: int):
                """在 (cx,cy) 中心位置画一个红色半透明 'AI' 标。"""
                if font_path:
                    try:
                        f = ImageFont.truetype(font_path, font_size_px)
                    except Exception:
                        f = font
                else:
                    f = font
                try:
                    fbbox = draw.textbbox((0, 0), face_text, font=f)
                    ftw = fbbox[2] - fbbox[0]
                    fth = fbbox[3] - fbbox[1]
                    ftx = cx - ftw // 2
                    fty = cy - fth // 2 - fbbox[1]
                except Exception:
                    ftw, fth = draw.textsize(face_text, font=f)
                    ftx = cx - ftw // 2
                    fty = cy - fth // 2
                draw.text((ftx, fty), face_text, font=f, fill=(255, 30, 30, 200))

            # B:精准面部水印
            faces = _detect_faces(image_path)
            for (fx, fy, fw, fh) in faces:
                face_font_size = max(24, int(fw * 0.5))
                _draw_ai_label(fx + fw // 2, fy + fh // 2, face_font_size)
                face_label_count += 1

            # C:九宫格兜底 — 把图均分 3×3,每格中心打小标
            # 字号 = min(width,height) / 22,小但 OCR 能识别(实测 24~80px 范围)
            grid_font_size = max(20, min(img.width, img.height) // 22)
            cell_w = img.width // 3
            cell_h = img.height // 3
            for row in range(3):
                for col in range(3):
                    cx = col * cell_w + cell_w // 2
                    cy = row * cell_h + cell_h // 2
                    # 如果该网格中心已被某个面部框中心覆盖(距离 < cell_w/3),跳过避免叠字
                    skip = False
                    for (fx, fy, fw, fh) in faces:
                        face_cx = fx + fw // 2
                        face_cy = fy + fh // 2
                        if abs(face_cx - cx) < cell_w // 3 and abs(face_cy - cy) < cell_h // 3:
                            skip = True
                            break
                    if skip:
                        continue
                    _draw_ai_label(cx, cy, grid_font_size)
                    grid_label_count += 1

        # 合并
        out = Image.alpha_composite(img, overlay)

        # 按原扩展名保存
        ext = os.path.splitext(image_path)[1].lower()
        save_kwargs = {}
        if ext in (".jpg", ".jpeg"):
            out = out.convert("RGB")
            save_kwargs = {"quality": 95}
        elif ext == ".webp":
            save_kwargs = {"quality": 95}
        # PNG 默认即可,保持 RGBA

        out.save(image_path, **save_kwargs)
        logger.info(
            f"[watermark] 已加水印: {os.path.basename(image_path)} "
            f"({img.width}x{img.height}, font={font_size}px, face_mode={face_mode}, "
            f"faces={face_label_count}, grid={grid_label_count if face_mode else 0})"
        )
        return True
    except Exception as e:
        logger.warning(f"[watermark] 加水印失败({type(e).__name__}): {image_path} -> {e}")
        return False
