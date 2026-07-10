"""模型预置配置"""

# 大语言模型预置配置
LLM_MODEL_PRESETS = {
    "gemini-3.1-pro-preview": {
        "display_name": "Gemini 3.1 Pro Preview",
        "max_tokens": 65536,
        "context_window": 1048576,
        "default_temperature": 0.7,
    },
    "gemini-2.5-pro-preview": {
        "display_name": "Gemini 2.5 Pro Preview",
        "max_tokens": 65536,
        "context_window": 1048576,
        "default_temperature": 0.7,
    },
    "gemini-2.5-flash-preview": {
        "display_name": "Gemini 2.5 Flash Preview",
        "max_tokens": 65536,
        "context_window": 1048576,
        "default_temperature": 0.7,
    },
    "gpt-4o": {
        "display_name": "GPT-4o",
        "max_tokens": 16384,
        "context_window": 128000,
        "default_temperature": 0.7,
    },
    "gpt-4o-mini": {
        "display_name": "GPT-4o Mini",
        "max_tokens": 16384,
        "context_window": 128000,
        "default_temperature": 0.7,
    },
    "gpt-4-turbo": {
        "display_name": "GPT-4 Turbo",
        "max_tokens": 4096,
        "context_window": 128000,
        "default_temperature": 0.7,
    },
    "claude-sonnet-4-20250514": {
        "display_name": "Claude Sonnet 4",
        "max_tokens": 16000,
        "context_window": 200000,
        "default_temperature": 0.7,
    },
    "claude-3-5-sonnet-20241022": {
        "display_name": "Claude 3.5 Sonnet",
        "max_tokens": 8192,
        "context_window": 200000,
        "default_temperature": 0.7,
    },
    "claude-3-5-haiku-20241022": {
        "display_name": "Claude 3.5 Haiku",
        "max_tokens": 8192,
        "context_window": 200000,
        "default_temperature": 0.7,
    },
    "deepseek-v4-pro": {
        "display_name": "DeepSeek V4 Pro",
        "max_tokens": 32768,
        "context_window": 131072,
        "default_temperature": 0.7,
    },
    "deepseek-v4-flash": {
        "display_name": "DeepSeek V4 Flash",
        "max_tokens": 16384,
        "context_window": 131072,
        "default_temperature": 0.7,
    },
    "deepseek-chat": {
        "display_name": "DeepSeek Chat (旧版)",
        "max_tokens": 8192,
        "context_window": 65536,
        "default_temperature": 0.7,
    },
    "deepseek-reasoner": {
        "display_name": "DeepSeek Reasoner (旧版)",
        "max_tokens": 16384,
        "context_window": 65536,
        "default_temperature": 0.6,
    },
    "qwen-max": {
        "display_name": "通义千问 Max",
        "max_tokens": 8192,
        "context_window": 32768,
        "default_temperature": 0.7,
    },
    "qwen-plus": {
        "display_name": "通义千问 Plus",
        "max_tokens": 8192,
        "context_window": 131072,
        "default_temperature": 0.7,
    },
    "doubao-pro-32k": {
        "display_name": "豆包 Pro 32K",
        "max_tokens": 4096,
        "context_window": 32768,
        "default_temperature": 0.7,
    },
    "glm-4-plus": {
        "display_name": "GLM-4 Plus",
        "max_tokens": 4096,
        "context_window": 128000,
        "default_temperature": 0.7,
    },
}

# 图片生成模型预置配置
IMAGE_MODEL_PRESETS = {
    "gemini-2.0-flash-preview-image-generation": {
        "display_name": "Gemini 2.0 Flash 图片生成",
        "default_ratio": "16:9",
    },
    "gpt-image-1": {
        "display_name": "GPT Image 1",
        "default_ratio": "16:9",
    },
    "dall-e-3": {
        "display_name": "DALL-E 3",
        "default_ratio": "16:9",
    },
    "midjourney": {
        "display_name": "Midjourney",
        "default_ratio": "16:9",
    },
}

# 视频生成模型预置配置
# CLI 支持的 model_version:
# - seedance2.0_vip      (VIP标准版)
# - seedance2.0fast_vip  (VIP快速版)
# - seedance2.0fast      (快速版)
# - seedance2.0          (标准版)
VIDEO_MODEL_PRESETS = {
    "seedance-2.0-fast-vip": {
        "display_name": "Seedance 2.0 Fast VIP",
        "modes": ["全能参考", "首尾帧", "智能多帧"],
        "default_duration": 10,
    },
    "seedance-2.0-vip": {
        "display_name": "Seedance 2.0 VIP",
        "modes": ["全能参考", "首尾帧", "智能多帧"],
        "default_duration": 10,
    },
    "seedance-2.0-fast": {
        "display_name": "Seedance 2.0 Fast",
        "modes": ["全能参考", "首尾帧", "智能多帧"],
        "default_duration": 10,
    },
    "seedance-2.0": {
        "display_name": "Seedance 2.0",
        "modes": ["全能参考", "首尾帧", "智能多帧"],
        "default_duration": 10,
    },
    "seedance-1.5-pro": {
        "display_name": "Seedance 1.5 Pro",
        "modes": ["全能参考", "首尾帧", "智能多帧"],
        "default_duration": 10,
    },
    "seedance-1.0": {
        "display_name": "Seedance 1.0",
        "modes": ["全能参考", "首尾帧", "智能多帧"],
        "default_duration": 10,
    },
    "seedance-1.0-fast": {
        "display_name": "Seedance 1.0 Fast",
        "modes": ["全能参考", "首尾帧", "智能多帧"],
        "default_duration": 10,
    },
    "wan-2.1": {
        "display_name": "Wan 2.1",
        "modes": ["文生视频", "图生视频"],
        "default_duration": 5,
    },
    "kling-1.6": {
        "display_name": "可灵 1.6",
        "modes": ["标准模式", "高品质模式"],
        "default_duration": 10,
    },
    # ===== v3.61.168: Cool API (mjapi.cc.cd) Seedance 2 视频 4 个预设 =====
    # 用户选 preset key 后,CoolVideoProvider __init__ 内部解析:
    #   cool-seedance-2-720p       → model=seedance_2,       resolution=720p
    #   cool-seedance-2-480p       → model=seedance_2,       resolution=480p
    #   cool-seedance-2-fast-720p  → model=seedance_2_fast,  resolution=720p
    #   cool-seedance-2-fast-480p  → model=seedance_2_fast,  resolution=480p
    "cool-seedance-2-720p": {
        "display_name": "Cool · Seedance 2.0 (720p)",
        "modes": ["文生视频", "图生视频", "音频驱动"],
        "default_duration": 5,
        "provider_type": "cool",
    },
    "cool-seedance-2-480p": {
        "display_name": "Cool · Seedance 2.0 (480p)",
        "modes": ["文生视频", "图生视频", "音频驱动"],
        "default_duration": 5,
        "provider_type": "cool",
    },
    "cool-seedance-2-fast-720p": {
        "display_name": "Cool · Seedance 2.0 Fast (720p)",
        "modes": ["文生视频", "图生视频", "音频驱动"],
        "default_duration": 5,
        "provider_type": "cool",
    },
    "cool-seedance-2-fast-480p": {
        "display_name": "Cool · Seedance 2.0 Fast (480p)",
        "modes": ["文生视频", "图生视频", "音频驱动"],
        "default_duration": 5,
        "provider_type": "cool",
    },
    # ===== v3.61.173: 星链云 (vjimeng.vip) SD2 视频 6 个预设 =====
    # key 直接用上游模型原名,XinglianVideoProvider 内部直传 model 字段不需要 strip;
    # _infer_cloud_provider() 的 mn.startswith("sd2-") 弱匹配也能命中这些 key。
    # 模型能力(详见 video_providers/xinglian.py:MODEL_CAPS):
    #   sd2-720p-fast / sd2-720p / sd2-1080p-fast / sd2-1080p:
    #     image + audio,duration 4-15s,图片数无上限
    #   sd2-720p-min-fast / sd2-720p-min:
    #     only image(不接 audio),最多 4 张,duration 5-15s
    "sd2-720p-fast": {
        "display_name": "星链云 · SD2 720p Fast",
        "modes": ["文生视频", "图生视频", "音频驱动"],
        "default_duration": 4,
        "provider_type": "xinglian",
    },
    "sd2-720p": {
        "display_name": "星链云 · SD2 720p",
        "modes": ["文生视频", "图生视频", "音频驱动"],
        "default_duration": 4,
        "provider_type": "xinglian",
    },
    "sd2-1080p-fast": {
        "display_name": "星链云 · SD2 1080p Fast",
        "modes": ["文生视频", "图生视频", "音频驱动"],
        "default_duration": 4,
        "provider_type": "xinglian",
    },
    "sd2-1080p": {
        "display_name": "星链云 · SD2 1080p",
        "modes": ["文生视频", "图生视频", "音频驱动"],
        "default_duration": 4,
        "provider_type": "xinglian",
    },
    "sd2-720p-min-fast": {
        "display_name": "星链云 · SD2 720p Min Fast(限图,有概率卡真人脸)",
        "modes": ["图生视频"],
        "default_duration": 5,
        "provider_type": "xinglian",
    },
    "sd2-720p-min": {
        "display_name": "星链云 · SD2 720p Min(限图,有概率卡真人脸)",
        "modes": ["图生视频"],
        "default_duration": 5,
        "provider_type": "xinglian",
    },
}


def get_model_presets(config_type: str = "llm"):
    """获取指定类型的预置模型配置"""
    if config_type == "llm":
        presets = LLM_MODEL_PRESETS
    elif config_type == "image":
        presets = IMAGE_MODEL_PRESETS
    elif config_type == "video":
        presets = VIDEO_MODEL_PRESETS
    else:
        presets = LLM_MODEL_PRESETS
    
    return {
        model_id: {
            "model_id": model_id,
            **preset
        }
        for model_id, preset in presets.items()
    }


def get_all_presets():
    """获取所有预置模型配置（按类型分组）"""
    return {
        "llm": get_model_presets("llm"),
        "image": get_model_presets("image"),
        "video": get_model_presets("video"),
    }


def get_model_preset(model_id: str, config_type: str = "llm"):
    """获取指定模型的预置配置"""
    if config_type == "llm":
        preset = LLM_MODEL_PRESETS.get(model_id)
    elif config_type == "image":
        preset = IMAGE_MODEL_PRESETS.get(model_id)
    elif config_type == "video":
        preset = VIDEO_MODEL_PRESETS.get(model_id)
    else:
        preset = None

    if preset:
        return {
            "model_id": model_id,
            **preset
        }
    return None


# ========================================================================
# 厂商预设(Provider Preset)—— 按"厂商/中转"维度的新预设体系
# 用户在前端"新增配置"时通过两级下拉(厂商 → 模型)快速创建
# 数据默认从 admin-server /api/llm-config-presets 同步;失败时用下面的本地 fallback
# ========================================================================

# 本地 fallback 预设(admin-server 不可达时使用)
LOCAL_PROVIDER_PRESETS = [
    {
        "category": "official", "config_type": "llm", "provider_code": "volcengine",
        "display_name": "火山引擎 Doubao",
        "provider_icon": "volcengine",
        "description": ("字节跳动火山方舟大模型直连。ID 取自火山 API 参考文档(截至 2026-04-18)。"
                        "必须带版本日期(如 -260415);新模型或更新版本请去方舟控制台模型详情页查最新 ID。"
                        "也可在「在线推理」创建推理接入点获得 ep-xxx 作为 model 字段使用。"),
        "base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "base_url_hint": "",
        "model_mode": "fixed_list",
        "model_list": [
            {"id": "doubao-seed-2-0-pro-260215", "name": "Doubao-Seed 2.0 Pro (260215 稳定版)", "recommended": True,
             "max_tokens": 16384, "context_window": 256000},
            {"id": "doubao-seed-2-0-pro-260415", "name": "Doubao-Seed 2.0 Pro (260415 新版,部分账号未开放)",
             "max_tokens": 16384, "context_window": 256000},
            {"id": "doubao-seed-2-0-lite-260215", "name": "Doubao-Seed 2.0 Lite",
             "max_tokens": 16384, "context_window": 256000},
            {"id": "doubao-seed-1-8-251228", "name": "Doubao-Seed 1.8",
             "max_tokens": 16384, "context_window": 256000},
            {"id": "doubao-seed-1-6-251015", "name": "Doubao-Seed 1.6 (251015 升级版)",
             "max_tokens": 16384, "context_window": 256000},
            {"id": "doubao-seed-1-6-250615", "name": "Doubao-Seed 1.6 (250615)",
             "max_tokens": 16384, "context_window": 256000},
            {"id": "doubao-1-5-pro-32k-250115", "name": "Doubao 1.5 Pro 32K",
             "max_tokens": 12288, "context_window": 32768},
            {"id": "deepseek-r1-250528", "name": "DeepSeek R1 (via 火山)",
             "max_tokens": 32768, "context_window": 128000},
            {"id": "deepseek-v3", "name": "DeepSeek V3 (via 火山)",
             "max_tokens": 8192, "context_window": 128000},
        ],
        "probe_path": "/models",
        "default_params": {"temperature": 0.7, "max_tokens": 16384, "context_window": 256000},
        "api_style": "auto",
        "key_format_hint": "如 doubao-seed-2-0-pro 或自建接入点 ep-xxx",
        "docs_url": "https://console.volcengine.com/ark/region:ark+cn-beijing/model",
        "sort_order": 10, "is_recommended": 1, "enabled": 1,
    },
    {
        "category": "official", "config_type": "llm", "provider_code": "openai",
        "display_name": "OpenAI GPT",
        "provider_icon": "openai",
        "description": "OpenAI 官方模型",
        "base_url": "https://api.openai.com/v1",
        "base_url_hint": "",
        "model_mode": "fixed_list",
        "model_list": [
            {"id": "gpt-4o", "name": "GPT-4o", "recommended": True},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini"},
        ],
        "probe_path": "/models",
        "default_params": {"temperature": 0.7, "max_tokens": 4096, "context_window": 128000},
        "api_style": "openai_chat",
        "key_format_hint": "sk-...",
        "docs_url": "https://platform.openai.com/api-keys",
        "sort_order": 20, "is_recommended": 1, "enabled": 1,
    },
    {
        "category": "official", "config_type": "llm", "provider_code": "deepseek",
        "display_name": "DeepSeek(官方直连)",
        "provider_icon": "deepseek",
        "description": "DeepSeek 官方直连:V3 通用对话 + R1 深度推理。价格便宜,国内可直连。",
        "base_url": "https://api.deepseek.com/v1",
        "base_url_hint": "",
        "model_mode": "fixed_list",
        "model_list": [
            {"id": "deepseek-v4-pro", "name": "DeepSeek V4 Pro(推理增强,推荐)", "recommended": True,
             "max_tokens": 32768, "context_window": 131072},
            {"id": "deepseek-v4-flash", "name": "DeepSeek V4 Flash(快速非推理)",
             "max_tokens": 16384, "context_window": 131072},
            {"id": "deepseek-chat", "name": "DeepSeek Chat (旧版,2026-07 弃用)",
             "max_tokens": 8192, "context_window": 65536},
            {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner (旧版,2026-07 弃用)",
             "max_tokens": 32768, "context_window": 65536},
        ],
        "probe_path": "/models",
        "default_params": {"temperature": 0.7, "max_tokens": 8192, "context_window": 65536},
        "api_style": "openai_chat",
        "key_format_hint": "sk-...",
        "docs_url": "https://platform.deepseek.com/api_keys",
        "sort_order": 30, "is_recommended": 1, "enabled": 1,
    },
    {
        "category": "gateway", "config_type": "llm", "provider_code": "lingya",
        "display_name": "灵芽 API 中转(LLM)",
        "provider_icon": "lingya",
        "description": "OpenAI 协议中转网关,聚合 Gemini/GPT/Claude/DeepSeek 等多厂商大模型",
        "base_url": "https://api.lingyaai.cn/v1",
        "base_url_hint": "",
        "model_mode": "probe",
        "model_list": [
            {"id": "gemini-3.1-pro-preview", "name": "Gemini 3.1 Pro Preview", "recommended": True},
            {"id": "gemini-2.5-pro-preview", "name": "Gemini 2.5 Pro Preview"},
            {"id": "gemini-2.5-flash-preview", "name": "Gemini 2.5 Flash Preview"},
        ],
        "probe_path": "/models",
        "default_params": {"temperature": 0.7, "max_tokens": 10000, "context_window": 100000},
        "api_style": "openai_chat",
        "key_format_hint": "sk-...",
        "docs_url": "https://api.lingyaai.cn/register?aff=TBEz",
        "sort_order": 50, "is_recommended": 1, "enabled": 1,
    },
    {
        "category": "gateway", "config_type": "image", "provider_code": "lingya",
        "display_name": "灵芽 API 中转(图像)",
        "provider_icon": "lingya",
        "description": "灵芽中转的图像生成模型,推荐 Gemini Flash Image(点击可探测全部可用模型)",
        "base_url": "https://api.lingyaai.cn/v1",
        "base_url_hint": "",
        "model_mode": "probe",
        "model_list": [
            {"id": "gemini-3.1-flash-image-preview", "name": "Gemini 3.1 Flash Image", "recommended": True},
            {"id": "gemini-2.5-flash-image-preview", "name": "Gemini 2.5 Flash Image"},
        ],
        "probe_path": "/models",
        "default_params": {"image_ratio": "16:9", "request_timeout": 600, "download_timeout": 60, "retry_count": 0},
        "api_style": "auto",
        "key_format_hint": "sk-...",
        "docs_url": "https://api.lingyaai.cn/register?aff=TBEz",
        "sort_order": 50, "is_recommended": 1, "enabled": 1,
    },
    {
        "category": "gateway", "config_type": "image", "provider_code": "wuyinkeji",
        "display_name": "速创 API(图像·异步)",
        "provider_icon": "wuyinkeji",
        "description": ("速创 API 聚合多家图片模型。采用异步模式:提交任务拿 task_id,客户端轮询 /api/async/detail。"
                        "支持 GPT-Image-2(OpenAI 文字渲染强)、NanoBanana2(谷歌高清,最多 14 张参考图)等。"),
        "base_url": "https://api.wuyinkeji.com",
        "base_url_hint": "",
        "model_mode": "fixed_list",
        "model_list": [
            {"id": "nanoBanana2", "name": "NanoBanana2 (谷歌高清,推荐)", "recommended": True},
            {"id": "gpt-image-2", "name": "GPT-Image-2 (OpenAI,字体渲染强)"},
            {"id": "nanoBanana_pro", "name": "NanoBanana Pro"},
            {"id": "nanoBanana", "name": "NanoBanana (基础版)"},
        ],
        "probe_path": "",
        "default_params": {
            "image_ratio": "16:9",
            "request_timeout": 1200,  # 轮询总超时 20 分钟(4K 大图 / 批量 20+ 时排队可能很久)
            "download_timeout": 90,   # 下载超时也拉长
            "retry_count": 0,
            # image_size 留空 → 后端自动走最高档(nanoBanana系列=4K,GPT-Image-2=2048×)
        },
        "api_style": "wuyinkeji_async",
        "key_format_hint": "速创官网控制台获取的 key",
        "docs_url": "https://api.wuyinkeji.com/user/register?cps=A04qLdfU",
        "sort_order": 55, "is_recommended": 1, "enabled": 1,
    },
    {
        "category": "gateway", "config_type": "llm", "provider_code": "wuyinkeji_llm",
        "display_name": "速创 API(大语言模型)",
        "provider_icon": "wuyinkeji",
        "description": "速创 API 聚合多家大语言模型。专用 /api/chat/index 接口(非 OpenAI 兼容)。推荐 Gemini 3.0 Pro(多模态)。",
        "base_url": "https://api.wuyinkeji.com",
        "base_url_hint": "",
        "model_mode": "fixed_list",
        "model_list": [
            {"id": "gemini-3-pro", "name": "Gemini 3 Pro", "recommended": True,
             "max_tokens": 8192, "context_window": 1048576},
        ],
        "probe_path": "",
        "default_params": {"temperature": 0.7, "max_tokens": 8192, "context_window": 128000},
        "api_style": "wuyinkeji_chat",
        "key_format_hint": "速创官网控制台获取的 key",
        "docs_url": "https://api.wuyinkeji.com/user/register?cps=A04qLdfU",
        "sort_order": 56, "is_recommended": 1, "enabled": 1,
    },
    {
        "category": "gateway", "config_type": "llm", "provider_code": "oneapi",
        "display_name": "OneAPI / NewAPI",
        "provider_icon": "oneapi",
        "description": "OpenAI 协议中转网关,支持聚合多厂商模型",
        "base_url": None,
        "base_url_hint": "https://your-oneapi.com/v1",
        "model_mode": "probe",
        "model_list": [],
        "probe_path": "/models",
        "default_params": {"temperature": 0.7, "max_tokens": 4096},
        "api_style": "openai_chat",
        "key_format_hint": "sk-...",
        "docs_url": "",
        "sort_order": 80, "is_recommended": 0, "enabled": 1,
    },
    {
        "category": "gateway", "config_type": "llm", "provider_code": "openai_compat",
        "display_name": "通用 OpenAI 兼容",
        "provider_icon": "openai_compat",
        "description": "任何符合 OpenAI 协议的自建/第三方服务",
        "base_url": None,
        "base_url_hint": "https://your-service.com/v1",
        "model_mode": "probe",
        "model_list": [],
        "probe_path": "/models",
        "default_params": {"temperature": 0.7, "max_tokens": 4096},
        "api_style": "auto",
        "key_format_hint": "",
        "docs_url": "",
        "sort_order": 90, "is_recommended": 0, "enabled": 1,
    },
    {
        "category": "official", "config_type": "image", "provider_code": "volcengine",
        "display_name": "火山引擎 Doubao-Seedream",
        "provider_icon": "volcengine",
        "description": ("字节跳动火山方舟 Seedream 直连。ID 须带版本戳(如 -260128)。"
                        "size 自动设置为 2K(Seedream 要求最小 3,686,400 像素),默认输出 2048×2048。"
                        "若需 4K 或特定像素,请在 admin 后台预设的 default_params 里添加 image_size 字段。"),
        "base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "base_url_hint": "",
        "model_mode": "fixed_list",
        "model_list": [
            {"id": "doubao-seedream-5-0-260128", "name": "Doubao-Seedream 5.0 Lite", "recommended": True},
        ],
        "probe_path": "/models",
        "default_params": {"image_ratio": "1:1", "request_timeout": 600},
        "api_style": "openai_images",
        "key_format_hint": "如 doubao-seedream-5-0-lite 或 ep-xxx 接入点 ID",
        "docs_url": "https://console.volcengine.com/ark/region:ark+cn-beijing/model",
        "sort_order": 10, "is_recommended": 1, "enabled": 1,
    },
    {
        "category": "official", "config_type": "image", "provider_code": "openai",
        "display_name": "OpenAI DALL-E",
        "provider_icon": "openai",
        "description": "OpenAI DALL-E 图像生成",
        "base_url": "https://api.openai.com/v1",
        "base_url_hint": "",
        "model_mode": "fixed_list",
        "model_list": [
            {"id": "dall-e-3", "name": "DALL-E 3", "recommended": True},
        ],
        "probe_path": "/models",
        "default_params": {"image_ratio": "1:1", "request_timeout": 600},
        "api_style": "openai_images",
        "key_format_hint": "sk-...",
        "docs_url": "https://platform.openai.com/api-keys",
        "sort_order": 20, "is_recommended": 0, "enabled": 1,
    },
    {
        "category": "gateway", "config_type": "image", "provider_code": "oneapi",
        "display_name": "OneAPI / NewAPI(图像)",
        "provider_icon": "oneapi",
        "description": "OpenAI 协议中转网关的图像模型",
        "base_url": None,
        "base_url_hint": "https://your-oneapi.com/v1",
        "model_mode": "probe",
        "model_list": [],
        "probe_path": "/models",
        "default_params": {"image_ratio": "1:1", "request_timeout": 600},
        "api_style": "auto",
        "key_format_hint": "sk-...",
        "docs_url": "",
        "sort_order": 80, "is_recommended": 0, "enabled": 1,
    },
    {
        "category": "gateway", "config_type": "image", "provider_code": "openai_compat",
        "display_name": "通用 OpenAI 兼容(图像)",
        "provider_icon": "openai_compat",
        "description": "任何符合 OpenAI 图像协议的自建/第三方服务",
        "base_url": None,
        "base_url_hint": "https://your-service.com/v1",
        "model_mode": "probe",
        "model_list": [],
        "probe_path": "/models",
        "default_params": {"image_ratio": "1:1", "request_timeout": 600},
        "api_style": "auto",
        "key_format_hint": "",
        "docs_url": "",
        "sort_order": 90, "is_recommended": 0, "enabled": 1,
    },
]


async def sync_preset_llm_configs():
    """从 admin-server 同步厂商预设到本地 llm_config_presets 表。
    失败时降级到 LOCAL_PROVIDER_PRESETS(离线 fallback)。
    """
    import asyncio, json as _json, os
    import aiohttp
    import logging
    from database.db import get_db
    from utils.timezone import now_beijing_str

    logger = logging.getLogger(__name__)
    ADMIN_SERVER = os.getenv("ADMIN_SERVER", "https://xiaoshuo.qianshanai.cn")

    remote_presets = None
    is_from_admin = False  # 标记:数据是否真实来自 admin-server(可信时才允许清理本地过期记录)
    try:
        async with aiohttp.ClientSession(connector=get_aiohttp_connector()) as session:
            async with session.get(
                f"{ADMIN_SERVER}/api/llm-config-presets",
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    remote_presets = data.get("presets", [])
                    is_from_admin = True
                else:
                    logger.warning(f"同步预置配置失败:HTTP {resp.status}")
    except Exception as e:
        logger.warning(f"同步预置配置失败,降级到本地 fallback: {e}")

    # 降级:admin-server 不可达时用本地 fallback(不会清理本地)
    if remote_presets is None:
        remote_presets = [{"id": None, **p, "updated_at": None} for p in LOCAL_PROVIDER_PRESETS]
        logger.info(f"使用本地 fallback 预设:{len(remote_presets)} 条")
    else:
        logger.info(f"从 admin-server 拉到 {len(remote_presets)} 条预设")

    # UPSERT 到本地表(UNIQUE KEY: provider_code + config_type)
    db = await get_db()
    try:
        for p in remote_presets:
            key = (p.get("provider_code"), p.get("config_type"))
            async with db.execute(
                "SELECT id FROM llm_config_presets WHERE provider_code = ? AND config_type = ?",
                key,
            ) as cur:
                existing = await cur.fetchone()

            model_list_str = _json.dumps(p.get("model_list") or [], ensure_ascii=False)
            default_params_str = _json.dumps(p.get("default_params") or {}, ensure_ascii=False)
            now_str = now_beijing_str()

            if existing:
                await db.execute(
                    """UPDATE llm_config_presets SET remote_id=?, category=?, display_name=?,
                       provider_icon=?, description=?, base_url=?, base_url_hint=?,
                       model_mode=?, model_list=?, probe_path=?, default_params=?,
                       api_style=?, key_format_hint=?, docs_url=?,
                       sort_order=?, is_recommended=?, enabled=?, updated_at=?
                       WHERE id=?""",
                    (p.get("id"), p.get("category"), p.get("display_name"),
                     p.get("provider_icon"), p.get("description"),
                     p.get("base_url"), p.get("base_url_hint"),
                     p.get("model_mode"), model_list_str,
                     p.get("probe_path") or "/models", default_params_str,
                     p.get("api_style") or "auto", p.get("key_format_hint"), p.get("docs_url"),
                     p.get("sort_order") or 0,
                     1 if p.get("is_recommended") else 0,
                     1 if p.get("enabled", True) else 0,
                     now_str, existing[0] if not isinstance(existing, dict) else existing["id"]),
                )
            else:
                await db.execute(
                    """INSERT INTO llm_config_presets
                       (remote_id, category, config_type, provider_code, display_name,
                        provider_icon, description, base_url, base_url_hint,
                        model_mode, model_list, probe_path, default_params,
                        api_style, key_format_hint, docs_url,
                        sort_order, is_recommended, enabled, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (p.get("id"), p.get("category"), p.get("config_type"),
                     p.get("provider_code"), p.get("display_name"),
                     p.get("provider_icon"), p.get("description"),
                     p.get("base_url"), p.get("base_url_hint"),
                     p.get("model_mode"), model_list_str,
                     p.get("probe_path") or "/models", default_params_str,
                     p.get("api_style") or "auto", p.get("key_format_hint"), p.get("docs_url"),
                     p.get("sort_order") or 0,
                     1 if p.get("is_recommended") else 0,
                     1 if p.get("enabled", True) else 0,
                     now_str),
                )
        # 清理 admin 已删除的本地记录(安全阀:只在 admin 可达时执行,避免网络问题误删)
        if is_from_admin:
            remote_keys = set(
                (p.get("provider_code"), p.get("config_type")) for p in remote_presets
            )
            async with db.execute(
                "SELECT id, provider_code, config_type FROM llm_config_presets"
            ) as cur:
                local_all = await cur.fetchall()
            stale_ids = [
                r[0] if not isinstance(r, dict) else r["id"]
                for r in local_all
                if (
                    r[1] if not isinstance(r, dict) else r["provider_code"],
                    r[2] if not isinstance(r, dict) else r["config_type"],
                ) not in remote_keys
            ]
            if stale_ids:
                placeholders = ",".join("?" * len(stale_ids))
                await db.execute(
                    f"DELETE FROM llm_config_presets WHERE id IN ({placeholders})",
                    stale_ids,
                )
                logger.info(f"清理 admin 已删除的本地预设:{len(stale_ids)} 条")

        await db.commit()
        logger.info(f"同步预置配置完成:{len(remote_presets)} 条")
        return True
    finally:
        await db.close()


async def get_provider_presets(config_type: str = None):
    """从本地 llm_config_presets 表读取厂商预设(供 API 层使用)。"""
    import json as _json
    from database.db import get_db

    db = await get_db()
    try:
        if config_type:
            query = """SELECT id, remote_id, category, config_type, provider_code, display_name,
                       provider_icon, description, base_url, base_url_hint, model_mode,
                       model_list, probe_path, default_params, api_style, key_format_hint,
                       docs_url, sort_order, is_recommended, enabled, updated_at
                       FROM llm_config_presets
                       WHERE enabled = 1 AND config_type = ?
                       ORDER BY sort_order, id"""
            async with db.execute(query, (config_type,)) as cur:
                rows = await cur.fetchall()
        else:
            query = """SELECT id, remote_id, category, config_type, provider_code, display_name,
                       provider_icon, description, base_url, base_url_hint, model_mode,
                       model_list, probe_path, default_params, api_style, key_format_hint,
                       docs_url, sort_order, is_recommended, enabled, updated_at
                       FROM llm_config_presets
                       WHERE enabled = 1
                       ORDER BY config_type, sort_order, id"""
            async with db.execute(query) as cur:
                rows = await cur.fetchall()

        result = []
        for row in rows:
            r = dict(row)
            try:
                r["model_list"] = _json.loads(r.get("model_list") or "[]")
            except Exception:
                r["model_list"] = []
            try:
                r["default_params"] = _json.loads(r.get("default_params") or "{}")
            except Exception:
                r["default_params"] = {}
            r["is_recommended"] = bool(r.get("is_recommended"))
            r["enabled"] = bool(r.get("enabled"))
            result.append(r)
        return result
    finally:
        await db.close()
