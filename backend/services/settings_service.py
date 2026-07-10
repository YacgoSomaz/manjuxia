"""通用 KV 全局设置(app_settings 表的封装)。

约定:
- key: ascii 字符串,业务模块前缀(如 image.watermark_enabled)
- value: 文本(布尔存 '0'/'1',JSON 等自行序列化)
- 默认值由调用方在 get 时通过 default 参数提供
"""
from typing import Optional
from database.db import get_db


class SettingsService:
    @staticmethod
    async def get(key: str, default: str = "") -> str:
        db = await get_db()
        try:
            cur = await db.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
            row = await cur.fetchone()
            if not row:
                return default
            return row["value"] if row["value"] is not None else default
        finally:
            await db.close()

    @staticmethod
    async def get_bool(key: str, default: bool = False) -> bool:
        v = await SettingsService.get(key, "")
        if v == "":
            return default
        return v.strip().lower() in ("1", "true", "yes", "on")

    @staticmethod
    async def set(key: str, value: str) -> None:
        db = await get_db()
        try:
            await db.execute(
                """INSERT INTO app_settings (key, value, updated_at)
                   VALUES (?, ?, datetime('now', '+8 hours'))
                   ON CONFLICT(key) DO UPDATE SET
                       value = excluded.value,
                       updated_at = datetime('now', '+8 hours')""",
                (key, value),
            )
            await db.commit()
        finally:
            await db.close()

    @staticmethod
    async def set_bool(key: str, value: bool) -> None:
        await SettingsService.set(key, "1" if value else "0")


# ============ 业务级 keys 常量 ============

# 图片水印开关:用户可在设置页打开,出图时自动加"此图由AI生成"红色半透明居中水印
# 目的:配合即梦"涉嫌真人"审核逻辑,合规标识能让审核器跳过真人检测分支
# v3.61.46: 改成只控生图(信息提取页角色图 + 视频额外参考图上传)
KEY_IMAGE_WATERMARK_ENABLED = "image.watermark_enabled"

# v3.61.46: 尾帧水印开关 — 独立于生图 watermark
# 之前一个开关同管生图+尾帧,用户反馈想分开控制(尾帧/生图各自决定要不要打 AI 标识)
KEY_LASTFRAME_WATERMARK_ENABLED = "lastframe.watermark_enabled"

# v3.61.132: "按说话人过滤音频"自动开关
# 开 → 视频生成时自动屏蔽 prompt 里没台词/OS/画外音 的角色音频(种菜模式)
# 关 → 老行为,全部带音频(默认)
# 兼容 0(关) / 1(开),app_settings.value 存字符串
KEY_AUDIO_AUTO_SPEAKER_FILTER = "video.audio_auto_speaker_filter"

# v3.59.67:云端 LLM 配置已完成首次迁移标志位
# 一旦本标志位为 "1",后续启动跳过 sync_from_local 不再向云端推本地数据。
# 这样用户在 web 删除一条后,C 端不会因为本地表残留把它推回去。
# 标志位只在 sync_from_local 全部成功(无 error 项)后落,失败保留以便下次重试。
KEY_CLOUD_LLM_SYNCED_ONCE = "cloud.llm_synced_once"

# v3.59.45 新增:面部覆盖模式开关
# 居中大字水印对人物三视图、表情图、面部特写无效(避开了脸部区域)
# 开启后会在每张检测到的脸上额外打一个小"AI"标,确保覆盖每个面部
# 依赖 OpenCV haarcascade(cv2 已在依赖里),检测失败会静默回退到只居中水印
KEY_IMAGE_WATERMARK_FACE_ENABLED = "image.watermark_face_enabled"

# v3.61.44 引入彩铅风格滤镜,v3.61.46 撤回(效果不好,改回风格 prompt 控)
# KEY 保留以兼容 — 不再被任何业务读取,前端开关已删
# KEY_IMAGE_PENCIL_ENABLED = "image.pencil_enabled"
