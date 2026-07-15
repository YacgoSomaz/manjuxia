from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "docs" / "assets" / "user-guide"
FONT_BOLD = "C:/Windows/Fonts/msyhbd.ttc"
FONT_REG = "C:/Windows/Fonts/msyh.ttc"

RED = (255, 82, 96, 255)
CYAN = (63, 230, 255, 255)
DARK = (10, 18, 45, 220)
WHITE = (255, 255, 255, 255)
YELLOW = (255, 196, 64, 255)


def font(size: int, bold: bool = False):
    path = FONT_BOLD if bold else FONT_REG
    return ImageFont.truetype(path, size=size)


def text_size(draw, text, fnt):
    box = draw.multiline_textbbox((0, 0), text, font=fnt, spacing=6)
    return box[2] - box[0], box[3] - box[1]


def draw_label(draw, xy, text, fill=RED, text_fill=WHITE, size=24, pad=12):
    x, y = xy
    fnt = font(size, True)
    w, h = text_size(draw, text, fnt)
    box = (x, y, x + w + pad * 2, y + h + pad * 2)
    draw.rounded_rectangle(box, radius=8, outline=fill, width=4, fill=(10, 18, 45, 185))
    draw.multiline_text((x + pad, y + pad - 2), text, font=fnt, fill=text_fill, spacing=6)
    return box


def arrow(draw, start, end, color=RED, width=6):
    draw.line([start, end], fill=color, width=width)
    ex, ey = end
    sx, sy = start
    dx, dy = ex - sx, ey - sy
    if abs(dx) > abs(dy):
        sign = 1 if dx > 0 else -1
        pts = [(ex, ey), (ex - sign * 24, ey - 14), (ex - sign * 24, ey + 14)]
    else:
        sign = 1 if dy > 0 else -1
        pts = [(ex, ey), (ex - 14, ey - sign * 24), (ex + 14, ey - sign * 24)]
    draw.polygon(pts, fill=color)


def title_bar(draw, image, title, subtitle):
    w, _h = image.size
    draw.rounded_rectangle((310, 18, min(w - 70, 1078), 106), radius=4, outline=RED, width=5, fill=(8, 13, 35, 185))
    draw.text((332, 31), title, font=font(32, True), fill=RED)
    draw.text((332, 70), subtitle, font=font(18, False), fill=WHITE)


def annotate(filename, output, title, subtitle, labels, arrows=(), rects=()):
    img = Image.open(ASSET_DIR / filename).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    title_bar(draw, img, title, subtitle)
    for rect in rects:
        draw.rounded_rectangle(rect, radius=6, outline=CYAN, width=4, fill=None)
    for label in labels:
        draw_label(draw, label["xy"], label["text"], fill=label.get("fill", RED), size=label.get("size", 22))
    for arr in arrows:
        arrow(draw, arr["start"], arr["end"], color=arr.get("color", RED), width=arr.get("width", 6))
    composed = Image.alpha_composite(img, overlay).convert("RGB")
    composed.save(ASSET_DIR / output, quality=94)


def main():
    annotate(
        "01-settings.raw.png",
        "01-settings-models.png",
        "第一步：配置大模型",
        "语言、图片、视频分开配置；语音目前用于后续 TTS 扩展，当前以导入音频为主",
        labels=[
            {"xy": (320, 136), "text": "先到设置里配置模型\n语言=剧本/分镜/提取\n图片=人物/场景/道具\n视频=最终出片"},
            {"xy": (930, 610), "text": "API Key 只保存在本机\n打包不会带走用户 Key", "fill": YELLOW},
        ],
        arrows=[
            {"start": (445, 235), "end": (455, 176)},
            {"start": (1060, 650), "end": (1132, 540), "color": YELLOW},
        ],
        rects=[(235, 120, 1354, 790)],
    )
    annotate(
        "02-novels.raw.png",
        "02-novel-import-tags.png",
        "第二步：导入小说并打标签",
        "小说是全流程入口；标签决定横竖屏、视觉风格和后续分镜模板",
        labels=[
            {"xy": (330, 150), "text": "导入 txt 小说\n检查章节是否拆分正确"},
            {"xy": (830, 610), "text": "缺屏幕模式/视觉标签时\n保存和转分镜会受影响", "fill": YELLOW},
        ],
        arrows=[
            {"start": (430, 210), "end": (405, 285)},
            {"start": (980, 650), "end": (715, 615), "color": YELLOW},
        ],
        rects=[(260, 137, 1338, 790)],
    )
    annotate(
        "03-scripts.raw.png",
        "03-script-convert.png",
        "第三步：小说一键转剧本",
        "选择小说、章节、剧本模板和语言模型，先把小说变成可拆分镜的剧本",
        labels=[
            {"xy": (470, 185), "text": "选择小说和章节\n支持多章批量转换"},
            {"xy": (720, 575), "text": "选择剧本模板 + 语言模型\n点击转换后在右侧保存"},
        ],
        arrows=[
            {"start": (590, 250), "end": (470, 330)},
            {"start": (850, 625), "end": (640, 705)},
        ],
        rects=[(260, 150, 694, 825), (714, 150, 1342, 825)],
    )
    annotate(
        "04-extraction.raw.png",
        "04-extraction-assets-audio.png",
        "第四步：提取资产并绑定音频",
        "从剧本提取人物、场景、道具；人物卡片可上传参考图、导入成品图、导入音频",
        labels=[
            {"xy": (800, 132), "text": "一键提取人物 / 场景 / 道具"},
            {"xy": (324, 424), "text": "人物卡片：生成宫格图\n保证角色外观一致"},
            {"xy": (870, 650), "text": "导入音频=绑定角色音色\n推荐 2-15 秒干净人声", "fill": YELLOW},
        ],
        arrows=[
            {"start": (1000, 190), "end": (1070, 206)},
            {"start": (430, 500), "end": (388, 665)},
            {"start": (1030, 710), "end": (1192, 684), "color": YELLOW},
        ],
        rects=[(260, 150, 1338, 845)],
    )
    annotate(
        "05-storyboards.raw.png",
        "05-storyboard-generate.png",
        "第五步：剧本生成分镜",
        "选择分镜模板、风格和模型，把每章剧本拆成可直接送视频模型的小节",
        labels=[
            {"xy": (402, 150), "text": "选择小说、章节、分镜模板"},
            {"xy": (760, 395), "text": "右侧是生成后的分镜小节\n包含人物状态、镜号、秒数、成片提示词"},
        ],
        arrows=[
            {"start": (558, 210), "end": (585, 190)},
            {"start": (930, 465), "end": (1040, 520)},
        ],
        rects=[(260, 154, 1350, 270), (260, 292, 1345, 835)],
    )
    annotate(
        "06-video.raw.png",
        "06-video-generate.png",
        "第六步：批量生成视频",
        "选择视频通道和模型，系统会把分镜 + 图片资产 + 音频参考一起提交",
        labels=[
            {"xy": (300, 138), "text": "视频通道：即梦 CLI / 火山方舟 / 中转"},
            {"xy": (760, 540), "text": "左侧选分镜\n右侧看详情和生成日志"},
            {"xy": (860, 705), "text": "如带音频，最多优先传 3 段\n并可按说话人自动过滤", "fill": YELLOW},
        ],
        arrows=[
            {"start": (525, 196), "end": (324, 164)},
            {"start": (880, 590), "end": (465, 552)},
            {"start": (1030, 748), "end": (1120, 804), "color": YELLOW},
        ],
        rects=[(256, 137, 1346, 252), (256, 265, 692, 820), (706, 265, 1342, 820)],
    )


if __name__ == "__main__":
    main()

