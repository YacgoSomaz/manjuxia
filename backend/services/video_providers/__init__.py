"""视频生成 provider 抽象层 (v3.61+)

设计理念: 数据/验证/队列/锁定 完全统一,只在最后一步调第三方时分流。

Provider 类型:
- jimeng: 即梦 CLI 模式 (浏览器登录 + dreamina-cli 子进程,扣点制)
- volcengine_ark: 火山方舟 HTTP API 模式 (API Key,token 后付费)
- cool: Cool API 中转 (mjapi.cc.cd) — Seedance 2 系列,文件走 multipart 上传 → URL
- xinglian: 星链云 (vjimeng.vip) — SD2 系列,文件走 base64 data URL 直接进 payload
- pippit_cli: 小云雀 CLI (pippit-tool-cli),Access Key 由 CLI 自己管理

入口:
    from services.video_providers import get_provider
    provider = get_provider("jimeng" or "volcengine_ark" or "cool" or "xinglian" or "pippit_cli", config_dict)
    result = await provider.submit(...)
"""
from .base import VideoProviderBase, ProviderType, SubmitResult, QueryResult


def get_provider(provider_type: str, config: dict = None):
    """根据 provider_type 字符串选择对应的实现类

    v3.61.1: 宽松匹配 — 不仅看 provider_type,也看 config 的 base_url / model_name
    v3.61.168: 加入 Cool 视频(seedance_2 / seedance_2_fast),base_url 优先级最高
               防 Cool 的 model="seedance_2" 跟 ARK 的"seedance"子串误匹配
    v3.61.173: 加入星链云(SD2 / vjimeng.vip),识别 base_url 含 vjimeng 或 model 起 sd2-
    """
    pt = (provider_type or "jimeng").lower()
    cfg = config or {}
    bu = (cfg.get("base_url") or "").lower()
    mn = (cfg.get("model_name") or "").lower()
    name = (cfg.get("name") or "").lower()

    # ---------- 强匹配 ----------
    # Cool
    if pt in ("cool", "mjapi") or "cool" in pt or "mjapi" in pt:
        from .cool import CoolVideoProvider
        return CoolVideoProvider(cfg)
    # 星链云
    if pt in ("xinglian", "vjimeng") or "xinglian" in pt or "vjimeng" in pt:
        from .xinglian import XinglianVideoProvider
        return XinglianVideoProvider(cfg)
    # 小云雀 CLI
    if pt in ("pippit", "pippit_cli", "xiaoyunque") or "pippit" in pt or "小云雀" in pt:
        from .pippit import PippitCliProvider
        return PippitCliProvider(cfg)
    # ARK
    if pt in ("volcengine_ark", "ark", "volcengine") or "ark" in pt or "volces" in pt:
        from .volcengine_ark import VolcengineArkProvider
        return VolcengineArkProvider(cfg)

    # ---------- 弱匹配 ----------
    # Cool 优先(base_url 决定性,防 model="seedance_2" 误归 ARK)
    if "mjapi.cc.cd" in bu or "mjapi" in bu or "cool" in name:
        from .cool import CoolVideoProvider
        return CoolVideoProvider(cfg)

    # 星链云 — base_url 含 vjimeng,或 model 以 sd2- 开头(SD2 系列专属命名)
    if "vjimeng.vip" in bu or "vjimeng" in bu or "vjimeng" in name or mn.startswith("sd2-"):
        from .xinglian import XinglianVideoProvider
        return XinglianVideoProvider(cfg)

    if "pippit" in bu or "pippit" in name or "小云雀" in name:
        from .pippit import PippitCliProvider
        return PippitCliProvider(cfg)

    # ARK — model_name 用全名 "doubao-seedance" 而不是 "seedance"(防误伤 cool 的 seedance_2 / seedance_2_fast)
    if (
        "volces.com" in bu or "ark.cn" in bu
        or "doubao-seedance" in mn
        or "火山" in name or "方舟" in name
    ):
        from .volcengine_ark import VolcengineArkProvider
        return VolcengineArkProvider(cfg)

    # 默认即梦
    from .jimeng import JimengCliProvider
    return JimengCliProvider(cfg)


__all__ = [
    "VideoProviderBase",
    "ProviderType",
    "SubmitResult",
    "QueryResult",
    "get_provider",
]
