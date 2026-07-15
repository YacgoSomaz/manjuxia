from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "assets" / "user-guide-real"
OUT = SRC / "annotated"
OUT.mkdir(parents=True, exist_ok=True)

FONT = "C:/Windows/Fonts/msyh.ttc"
FONT_BOLD = "C:/Windows/Fonts/msyhbd.ttc"

CYAN = (41, 226, 229, 255)
BLUE = (53, 155, 255, 255)
RED = (255, 92, 112, 255)
ORANGE = (255, 183, 70, 255)
WHITE = (255, 255, 255, 255)
PANEL = (8, 14, 35, 205)


def f(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def rounded_rect(draw, box, outline=CYAN, fill=None, width=3, radius=10):
    draw.rounded_rectangle(box, radius=radius, outline=outline, width=width, fill=fill)


def marker(draw, x, y, num, color=CYAN):
    r = 17
    draw.ellipse((x - r, y - r, x + r, y + r), fill=color, outline=WHITE, width=2)
    text = str(num)
    bbox = draw.textbbox((0, 0), text, font=f(18, True))
    draw.text((x - (bbox[2] - bbox[0]) / 2, y - (bbox[3] - bbox[1]) / 2 - 1), text, fill=(5, 10, 25), font=f(18, True))


def caption(draw, x, y, title, body, w=390, color=CYAN):
    title_font = f(23, True)
    body_font = f(17)
    lines = [title] + body.split("\n")
    line_heights = [28] + [23] * (len(lines) - 1)
    h = 22 + sum(line_heights) + 10
    rounded_rect(draw, (x, y, x + w, y + h), outline=color, fill=PANEL, width=3, radius=8)
    draw.text((x + 16, y + 12), title, font=title_font, fill=color)
    yy = y + 44
    for line in body.split("\n"):
        draw.text((x + 16, yy), line, font=body_font, fill=WHITE)
        yy += 23


def title(draw, img, text, sub):
    W, _ = img.size
    rounded_rect(draw, (240, 16, min(W - 24, 1120), 94), outline=RED, fill=(8, 14, 35, 210), width=3, radius=8)
    draw.text((262, 27), text, font=f(28, True), fill=RED)
    draw.text((262, 62), sub, font=f(17), fill=WHITE)


def annotate(src_name, out_name, title_text, sub, boxes, notes):
    img = Image.open(SRC / src_name).convert("RGBA")
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    title(draw, img, title_text, sub)
    for i, b in enumerate(boxes, start=1):
        color = b.get("color", CYAN)
        rounded_rect(draw, b["box"], outline=color, fill=None, width=b.get("width", 3), radius=8)
        mx, my = b.get("marker", (b["box"][0], b["box"][1]))
        marker(draw, mx, my, i, color=color)
    for note in notes:
        caption(draw, note["x"], note["y"], note["title"], note["body"], w=note.get("w", 390), color=note.get("color", CYAN))
    Image.alpha_composite(img, layer).convert("RGB").save(OUT / out_name, quality=95)


def main():
    annotate(
        "01-novel-list.png",
        "01-novel-list-guide.png",
        "1. 小说导入：项目入口",
        "导入小说后先补标签，再进入剧本、分镜和视频流程。",
        boxes=[
            {"box": (390, 310, 640, 405), "marker": (392, 316), "color": CYAN},
            {"box": (935, 335, 1280, 500), "marker": (938, 338), "color": BLUE},
            {"box": (1280, 776, 1360, 814), "marker": (1285, 778), "color": ORANGE},
        ],
        notes=[
            {"x": 690, "y": 292, "title": "小说列表", "body": "这里能看到章节数、封面、标签。\n有标签的小说才能稳定走后续流程。", "w": 370},
            {"x": 930, "y": 530, "title": "常用操作", "body": "查看章节、增量导入、导出、封面下载。\n转剧本前建议先确认章节完整。", "w": 410, "color": BLUE},
            {"x": 930, "y": 695, "title": "小说标签", "body": "补齐屏幕模式、视觉标签、题材标签。\n缺标签时分镜/保存可能被拦住。", "w": 405, "color": ORANGE},
        ],
    )
    annotate(
        "02-script-convert.png",
        "02-script-convert-guide.png",
        "2. 剧本转换：小说一键转短剧",
        "选择小说、章节、模板和语言模型，生成可拆分镜的剧本。",
        boxes=[
            {"box": (280, 305, 672, 585), "marker": (283, 310), "color": CYAN},
            {"box": (752, 270, 1305, 808), "marker": (755, 274), "color": BLUE},
            {"box": (282, 682, 668, 807), "marker": (285, 686), "color": ORANGE},
        ],
        notes=[
            {"x": 735, "y": 125, "title": "左侧选择输入", "body": "选择小说和章节。\n已转换章节会显示“已转换”。", "w": 350},
            {"x": 872, "y": 520, "title": "右侧检查剧本", "body": "生成后先看内容是否能拍。\n确认无误后保存，供信息提取使用。", "w": 390, "color": BLUE},
            {"x": 282, "y": 620, "title": "模板与模型", "body": "剧本模板决定叙事风格。\n语言模型负责生成文本。", "w": 385, "color": ORANGE},
        ],
    )
    annotate(
        "03-extraction-assets.png",
        "03-extraction-assets-guide.png",
        "3. 信息提取：人物、场景、道具资产库",
        "从已保存剧本中提取资产，并在这里维护图像、马甲和音频。",
        boxes=[
            {"box": (410, 195, 845, 230), "marker": (412, 197), "color": CYAN},
            {"box": (954, 195, 1295, 270), "marker": (958, 198), "color": BLUE},
            {"box": (330, 498, 1270, 828), "marker": (334, 502), "color": ORANGE},
        ],
        notes=[
            {"x": 405, "y": 116, "title": "选择剧本", "body": "信息提取依赖剧本。\n如果提取为 0，先回剧本转换保存剧本。", "w": 430},
            {"x": 878, "y": 292, "title": "一键提取", "body": "分别提取人物、场景、道具。\n提取后会进入下方资产卡片。", "w": 395, "color": BLUE},
            {"x": 732, "y": 735, "title": "音频绑定位置", "body": "人物卡片底部“导入音频”。\n用于绑定角色音色，不是自动 TTS。", "w": 430, "color": ORANGE},
        ],
    )
    annotate(
        "04-storyboard.png",
        "04-storyboard-guide.png",
        "4. 分镜管理：剧本转镜头小节",
        "选择模板和风格，把剧本拆成可直接送视频模型的小节。",
        boxes=[
            {"box": (280, 174, 1316, 255), "marker": (283, 178), "color": CYAN},
            {"box": (283, 390, 700, 858), "marker": (286, 394), "color": BLUE},
            {"box": (724, 390, 1319, 858), "marker": (728, 394), "color": ORANGE},
        ],
        notes=[
            {"x": 770, "y": 112, "title": "分镜参数", "body": "小说、章节、分镜模板、模型、风格。\n模板会直接影响镜头密度和输出格式。", "w": 465},
            {"x": 295, "y": 705, "title": "剧本内容", "body": "左侧是本节原始剧本。\n用于校对分镜是否忠实原文。", "w": 370, "color": BLUE},
            {"x": 865, "y": 710, "title": "分镜小节", "body": "右侧生成镜头、人物状态、秒数、成片提示词。\n后续视频生成会读取这里。", "w": 445, "color": ORANGE},
        ],
    )
    annotate(
        "05-video.png",
        "05-video-guide.png",
        "5. 即梦视频生成：分镜批量出片",
        "选择视频通道和模型，系统会提交分镜、图片资产和音频参考。",
        boxes=[
            {"box": (258, 152, 735, 236), "marker": (262, 156), "color": CYAN},
            {"box": (257, 263, 690, 796), "marker": (261, 267), "color": BLUE},
            {"box": (707, 322, 1345, 760), "marker": (711, 326), "color": ORANGE},
        ],
        notes=[
            {"x": 755, "y": 148, "title": "选择生成通道", "body": "即梦 CLI、火山方舟、中转、星链云。\n不同通道支持能力不同。", "w": 405},
            {"x": 288, "y": 704, "title": "批量生成", "body": "选择小说章节后勾选小节。\n批量生成会按分镜逐条提交。", "w": 380, "color": BLUE},
            {"x": 815, "y": 640, "title": "日志很关键", "body": "登录失败、模型缺失、素材缺失都会在这里提示。\n即梦 CLI 还需要账号具备 CLI/会员权限。", "w": 475, "color": ORANGE},
        ],
    )
    annotate(
        "06-character-grid.png",
        "06-character-grid-guide.png",
        "6. 人物宫格图：保证角色一致性",
        "人物图不是单张头像，宫格图会固定正面、背面、侧面、表情和材质。",
        boxes=[
            {"box": (276, 56, 1110, 866), "marker": (280, 60), "color": CYAN},
            {"box": (350, 650, 640, 865), "marker": (352, 654), "color": BLUE},
            {"box": (866, 398, 1084, 570), "marker": (870, 402), "color": ORANGE},
        ],
        notes=[
            {"x": 735, "y": 90, "title": "多角度固定外观", "body": "正面、背面、侧面、45度视图。\n用于减少角色跑脸。", "w": 360},
            {"x": 300, "y": 720, "title": "表情参考", "body": "常用情绪可以提前固定。\n短剧里连续镜头更稳定。", "w": 330, "color": BLUE},
            {"x": 765, "y": 590, "title": "材质与色卡", "body": "衣服、肤色、发色、质感都能锁住。\n后续生成视频更一致。", "w": 420, "color": ORANGE},
        ],
    )


if __name__ == "__main__":
    main()

