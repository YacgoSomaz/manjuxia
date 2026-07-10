import os
import asyncio
import base64
import json
import httpx
import secrets
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI, Timeout
from database.db import get_db
from services.llm_service import LLMService
from services.log_service import LogService
from services.trusted_providers import require_trusted_model_url
from utils.paths import get_data_dir, media_subdir, resolve_db_path
from utils.unicode_utils import sanitize_unicode
# v3.61.37: 打包后 aiohttp 找不到系统根证书,统一走 certifi
from utils.ssl_helper import get_aiohttp_connector


class ImageService:
    """图片生成服务"""

    # 图片比例到尺寸的映射
    SIZE_MAP = {
        "1:1": "1024x1024",
        "16:9": "1792x1024",
        "9:16": "1024x1792",
        "4:3": "1024x768",
        "3:4": "768x1024",
        # v3.61.147:VR 720° 全景图,等距柱状投影必须 2:1
        # 2048x1024 是 GPT-Image-2 支持的最高 2:1 尺寸(再大就超 model 限制)
        "2:1": "2048x1024",
    }

    # Seedream endpoints reject requests below 3,686,400 pixels.
    VOLCENGINE_SIZE_MAP = {
        "1:1": "2048x2048",
        "16:9": "2560x1440",
        "9:16": "1440x2560",
        "4:3": "2304x1728",
        "3:4": "1728x2304",
        "2:1": "2720x1360",
    }

    # 需要通过 chat.completions 接口调用的模型（如智谱 CogView、Gemini 等）
    CHAT_COMPLETION_IMAGE_MODELS = [
        "cogview", "glm", "gemini"
    ]

    # ==================== 图生图模型适配器注册表 ====================
    # 新接入支持图生图的模型,只需在此追加一项即可,无需改其他代码
    #
    # 字段说明:
    #   match:       (str) 用于在 model_name.lower() 中匹配的子串
    #   field:       (str) 该模型在 extra_body 里接收参考图的字段名
    #   value_type:  ("array" | "string") 字段值是数组还是单字符串
    #   accept:      ("base64" | "url_only") 是否接受 base64 data URL
    #   max_images:  (int) 最多支持几张参考图
    #
    # 当前支持的图生图模型:
    REFERENCE_IMAGE_ADAPTERS = [
        {
            "match": "seedream",          # doubao-seedream-4.5 / 5.0-lite 等
            "field": "image_urls",
            "value_type": "array",
            "accept": "base64",
            "max_images": 14,
        },
        # 待接入的示例(注释占位,接入时取消注释并改 match):
        # {
        #     "match": "qwen-vl",         # 通义万相 / 千问图生图
        #     "field": "image_url",
        #     "value_type": "string",
        #     "accept": "url_only",
        #     "max_images": 1,
        # },
        # {
        #     "match": "kling",           # 可灵图生图
        #     "field": "ref_image",
        #     "value_type": "string",
        #     "accept": "base64",
        #     "max_images": 1,
        # },
    ]

    @staticmethod
    def _trusted_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """Copy and validate a configured image provider before dispatch."""
        trusted = dict(config)
        trusted["base_url"] = require_trusted_model_url(trusted.get("base_url") or "")
        return trusted

    @staticmethod
    def _find_reference_adapter(model_name: str) -> Optional[Dict[str, Any]]:
        """根据模型名查找匹配的图生图适配器,找不到返回 None(说明模型暂不支持图生图)"""
        m = (model_name or "").lower()
        for ad in ImageService.REFERENCE_IMAGE_ADAPTERS:
            if ad["match"] in m:
                return ad
        return None
    
    @staticmethod
    def _get_size_from_ratio(ratio: str, base_url: str = "") -> str:
        """根据比例获取尺寸,仅对需要大像素下限的火山方舟提高尺寸。"""
        if "volces.com" in (base_url or "").lower():
            return ImageService.VOLCENGINE_SIZE_MAP.get(ratio, "2048x2048")
        return ImageService.SIZE_MAP.get(ratio, "1024x1024")

    @staticmethod
    def _wrap_panorama_prompt(prompt: str) -> str:
        """v3.61.150: 用户指定的 ERP 全景模板
        把"720° 全景 VR 视图,2:1 高清"放在 prompt **最前面**(中文模型对头部指令响应最强)。
        v3.61.150 codex P2 修:锚点之后追加"空镜/不要人物"硬约束(v3.61.63 场景生图老规则),
                             否则 description 带角色描写时模型会生成人物剧情截图 → VR 取景废
        通用 image 模型(GPT-Image-2/nano-banana)对真 360° 全景支持不稳,
        这里只是"尽力而为";质量更高的全景建议用户用 LibTV / Skybox 等专业工具产出后再上传。
        """
        scene = (prompt or "").strip()
        return (
            "720° 全景 VR 视图,2:1 高清。"
            "等距柱状投影 ERP,360° 全视角,上下左右无缝,VR 漫游可用,720P。"
            "纯场景环境空镜,不要出现任何人物/角色/肢体/人脸,只渲染建筑/场景/物件/光影氛围。\n"
            f"场景:{scene}"
        )
    
    @staticmethod
    def _should_use_chat_completion(model_name: str) -> bool:
        """判断模型是否需要通过 chat.completions 接口调用"""
        model_lower = model_name.lower()
        return any(keyword in model_lower for keyword in ImageService.CHAT_COMPLETION_IMAGE_MODELS)

    @staticmethod
    def _resize_data_url_for_1day(data_url: str, max_side: int = 1280, jpeg_quality: int = 80) -> Optional[str]:
        """v3.61.75: 把 base64 data URL 的参考图 resize + JPEG 重压
        用于 1Day 等 body 限制紧的中转,避免 HTTP 413 Payload Too Large
        返回新 data:image/jpeg;base64,... 字符串,失败返 None
        """
        if not data_url or "base64," not in data_url:
            return None
        try:
            import base64 as _b64
            import io as _io
            from PIL import Image as _PILImage
            # 拆 data URL
            b64_part = data_url.split(",", 1)[1]
            raw = _b64.b64decode(b64_part)
            img = _PILImage.open(_io.BytesIO(raw))
            # JPEG 不支持 alpha,转 RGB
            if img.mode != "RGB":
                img = img.convert("RGB")
            # resize 长边到 max_side(等比缩放)
            w, h = img.size
            if max(w, h) > max_side:
                if w >= h:
                    new_w = max_side
                    new_h = int(round(h * max_side / w))
                else:
                    new_h = max_side
                    new_w = int(round(w * max_side / h))
                img = img.resize((new_w, new_h), _PILImage.LANCZOS)
            # 输出 JPEG
            out = _io.BytesIO()
            img.save(out, format="JPEG", quality=jpeg_quality, optimize=True)
            new_b64 = _b64.b64encode(out.getvalue()).decode("ascii")
            return f"data:image/jpeg;base64,{new_b64}"
        except Exception as _e:
            import logging as _lg
            _lg.getLogger(__name__).warning(f"[resize_for_1day] 压缩失败: {_e}")
            return None
    
    @staticmethod
    def _ensure_images_dir() -> str:
        """确保图片目录存在，返回目录路径"""
        images_dir = media_subdir("images")
        os.makedirs(images_dir, exist_ok=True)
        return images_dir

    @staticmethod
    def _safe_name_part(s: Optional[str], maxlen: int = 24) -> str:
        """把任意字符串转成 Windows 安全的文件名片段:
        - 去除/替换 < > : " / \ | ? * 等保留字符 + 控制字符
        - ★ v3.59.58:半角 . 和全角 。 也替换为 _
          否则像 "炮灰重生.末世先刀圣母" 这种带句点的小说名,会让最终文件名出现
          "xxx.末世先刀圣母_角色_22_xxx.png" — 即梦上传时按扩展名推 MIME 会失败
        - 折叠空白
        - 截断到 maxlen 字符
        - 全空返回 ''
        """
        if not s:
            return ""
        bad = '<>:"/\\|?*\r\n\t.。'
        cleaned = "".join("_" if c in bad or ord(c) < 32 else c for c in s)
        cleaned = "_".join(cleaned.split())  # 折叠空白
        cleaned = cleaned.strip(" ._-")
        if len(cleaned) > maxlen:
            cleaned = cleaned[:maxlen]
        return cleaned

    # v3.61.202:资产图按「小说名/类型/语义名.ext」分文件夹存(同名覆盖,不带 id/uuid)。
    #   元素类型中文 + 图类别(image_role)拼语义名。各段缺失优雅降级保证 3 段路径完整。
    _TYPE_CN = {"character": "角色", "scene": "场景", "prop": "道具"}

    @staticmethod
    async def _build_image_filename(
        novel_id: Optional[int],
        element_id: Optional[int],
        element_type: Optional[str],
        ext: str = ".png",
        image_role: str = "finished",
        variant_name: Optional[str] = None,
    ) -> str:
        """生成「{小说名}/{类型中}/{语义名}{ext}」带子目录的相对路径片段(不含 data/images/ 前缀)。

        image_role → 语义名:
          finished           角色_名 / 场景_名 / 道具_名
          grid               …_宫格图
          panorama           场景_名_720
          reference          …_参考图
          variant_finished   角色_名_{马甲名}
          variant_reference  角色_名_{马甲名}_参考图
        同名覆盖(去掉 id/uuid)。各段缺失降级:小说→未命名小说 / 元素→元素{id} / 类型→其他。
        """
        ext = ext if ext.startswith(".") else f".{ext}"
        # 小说名
        novel_part = ""
        if novel_id:
            try:
                from services.novel_service import NovelService
                novel = await NovelService.get_by_id(novel_id)
                if novel and novel.get("name"):
                    novel_part = ImageService._safe_name_part(novel.get("name"), 24)
            except Exception:
                pass
        if not novel_part:
            novel_part = "未命名小说"
        # 类型中文
        type_cn = ImageService._TYPE_CN.get(element_type or "", "其他")
        # 元素名
        elem_part = ""
        if element_id:
            try:
                from services.extraction_service import ExtractionService
                el = await ExtractionService.get_element(element_id)
                if el and el.get("name"):
                    elem_part = ImageService._safe_name_part(el.get("name"), 24)
            except Exception:
                pass
        if not elem_part:
            elem_part = f"元素{element_id}" if element_id else "未命名"
        # 语义名 core
        base = f"{type_cn}_{elem_part}"
        vname = ImageService._safe_name_part(variant_name, 24) if variant_name else ""
        role_suffix = {
            "finished": "",
            "grid": "_宫格图",
            "panorama": "_720",
            "reference": "_参考图",
            "variant_finished": f"_{vname}" if vname else "_马甲",
            "variant_reference": (f"_{vname}" if vname else "_马甲") + "_参考图",
        }
        core = base + role_suffix.get(image_role, "")
        return f"{novel_part}/{type_cn}/{core}{ext}"

    @staticmethod
    def _delete_same_stem_siblings(rel_or_abs: str) -> None:
        """v3.61.202:同名覆盖前,删掉同目录同 stem 的其它扩展名兄弟文件
        (如新写 角色_张三.jpg 时删掉旧的 角色_张三.png/.webp),避免一图多份残留。"""
        try:
            abs_path = rel_or_abs
            if not os.path.isabs(abs_path):
                abs_path = os.path.join(media_subdir("images"), rel_or_abs.replace("/", os.sep))
            d = os.path.dirname(abs_path)
            stem = os.path.splitext(os.path.basename(abs_path))[0]
            if not d or not os.path.isdir(d):
                return
            for fn in os.listdir(d):
                if os.path.splitext(fn)[0] == stem and fn.lower().endswith(
                    (".png", ".jpg", ".jpeg", ".webp")
                ):
                    fp = os.path.join(d, fn)
                    if os.path.abspath(fp) != os.path.abspath(abs_path):
                        try:
                            os.remove(fp)
                        except Exception:
                            pass
        except Exception:
            pass
    
    @staticmethod
    async def _download_image(url: str, filename: str) -> Optional[str]:
        """下载图片到本地，返回本地路径

        分阶段 timeout + asyncio.wait_for 双保险,防止 httpx 边缘情况卡死
        """
        try:
            images_dir = ImageService._ensure_images_dir()
            # v3.61.202:filename 可能含子目录(小说/类型/名.ext),写盘前建目录 + 同 stem 清理
            local_path = os.path.join(images_dir, filename.replace("/", os.sep))
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            timeout_cfg = httpx.Timeout(connect=30.0, read=120.0, write=60.0, pool=10.0)
            # trust_env=False 关键:绕过系统代理环境变量,避免本地代理拦截 CDN 资源
            # (实测速创/NanoBanana 的 CDN 在有系统代理时会连接失败或半包)
            async with httpx.AsyncClient(timeout=timeout_cfg, follow_redirects=True, trust_env=False) as client:
                # asyncio.wait_for 作为总超时兜底
                response = await asyncio.wait_for(client.get(url), timeout=180)
                if response.status_code == 200:
                    # v3.61.202:只负责写新图返回路径;同 stem 旧图清理由【调用方 DB 更新成功后】做
                    #   (ImageService 不知道 DB 会不会成功,提前删旧图会导致 DB 失败时指向坏文件)
                    with open(local_path, 'wb') as f:
                        f.write(response.content)
                    return f"data/images/{filename}"
                print(f"[WARN] 下载图片 HTTP {response.status_code}: {url[:80]}")
            return None
        except asyncio.TimeoutError:
            print(f"[WARN] 下载图片总超时(120s): {url[:80]}")
            return None
        except Exception as e:
            print(f"[WARN] 下载图片失败: {type(e).__name__}: {e}")
            return None
    
    @staticmethod
    async def _save_base64_image(base64_data: str, filename: str) -> Optional[str]:
        """保存 base64 图片到本地，返回本地路径"""
        try:
            images_dir = ImageService._ensure_images_dir()
            # v3.61.202:filename 可能含子目录,写盘前建目录 + 同 stem 清理
            local_path = os.path.join(images_dir, filename.replace("/", os.sep))
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            # 处理可能的数据 URI 前缀
            if "," in base64_data:
                base64_data = base64_data.split(",")[1]

            image_bytes = base64.b64decode(base64_data)
            # v3.61.202:只写新图;同 stem 旧图清理由调用方 DB 成功后做
            with open(local_path, 'wb') as f:
                f.write(image_bytes)

            return f"data/images/{filename}"
        except Exception as e:
            print(f"[WARN] 保存 base64 图片失败: {e}")
            return None
    
    @staticmethod
    def _get_image_base64(image_path: str) -> Optional[str]:
        """读取图片文件并转为 base64
        v3.61.51: print → logger 方便诊断;支持 /data/frames/ 等所有 data 子目录
        """
        import logging as _lg
        _lg2 = _lg.getLogger(__name__)
        try:
            # 构建完整路径
            # v3.61.51: 之前只识别 "data/images/" 前缀,frames/audios/videos 等都走 else 分支也能 resolve,
            # 但有时 image_path 已经是 absolute (e.g. C:\...\storyboard_xxx.jpg) 时 isabs 在 Windows 上要看是否带盘符
            if image_path.startswith(("data/", "/data/")):
                # 任何 /data/* 路径(images/frames/audios/videos)都走 resolve_db_path
                full_path = resolve_db_path(image_path)
            elif os.path.isabs(image_path):
                full_path = image_path
            else:
                # 其他相对路径也尝试 resolve
                full_path = resolve_db_path(image_path)

            _lg2.info(f"[ImageService._get_image_base64] in={image_path} resolved={full_path}")

            if not full_path or not os.path.exists(full_path):
                _lg2.warning(f"[ImageService._get_image_base64] 文件不存在 in={image_path} resolved={full_path}")
                return None

            with open(full_path, 'rb') as f:
                image_bytes = f.read()
            if not image_bytes:
                _lg2.warning(f"[ImageService._get_image_base64] 文件为空: {full_path}")
                return None

            # 获取文件扩展名
            ext = os.path.splitext(full_path)[1].lower()
            mime_type = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
                '.bmp': 'image/bmp'
            }.get(ext, 'image/png')

            base64_data = base64.b64encode(image_bytes).decode('utf-8')
            _lg2.info(f"[ImageService._get_image_base64] OK file_size={len(image_bytes)}B base64_len={len(base64_data)}")
            return f"data:{mime_type};base64,{base64_data}"
        except Exception as e:
            _lg2.warning(f"[ImageService._get_image_base64] 异常 in={image_path}: {type(e).__name__}: {e}")
            return None

    @staticmethod
    async def generate_fusion_image(
        config_id: int,
        prompt: str,
        ratio: str = "1:1",
        reference_images_base64: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """v3.61.92: 溶图(多参考图融合)— 设置 → 其他功能 → 溶图 模块用

        跟 generate_image 不同点:
        - 接收多张参考图(base64 list 或 data URL list),最多 14 张
        - 只支持原生多图能力的中转:wuyinkeji_async / geek_sync / cool_async
        - 不写 storyboards / extracted_elements 等业务表,纯生图
        - 返回 {"success", "image_url"(本地路径), "remote_url"(原始 URL), "message"}
        """
        import logging as _lg
        _lg2 = _lg.getLogger(__name__)
        reference_images_base64 = [b for b in (reference_images_base64 or []) if b]
        if not reference_images_base64:
            return {"success": False, "image_url": None, "message": "至少需要 1 张参考图"}
        if len(reference_images_base64) > 14:
            return {"success": False, "image_url": None, "message": "参考图最多 14 张,当前 " + str(len(reference_images_base64))}

        # v3.61.96: 双保险 — 在 prompt 前显式加比例提示,即使上游忽略 size 参数也能按比例出图
        # 触发场景:速创/Cool/geek 的 gpt-image-2 有时会"跟参考图比例"而忽略我们传的 size
        _ratio_hint_map = {
            "9:16": "输出比例 9:16(竖版/手机屏构图,人物纵向居中)",
            "16:9": "输出比例 16:9(横版/影视宽屏构图)",
            "1:1":  "输出比例 1:1(方形构图,主体居中)",
            "4:3":  "输出比例 4:3(标准宽屏)",
            "3:4":  "输出比例 3:4(竖版/海报)",
            "2:3":  "输出比例 2:3(竖版/A4)",
            "3:2":  "输出比例 3:2(横版/相片)",
            "21:9": "输出比例 21:9(超宽幅/电影)",
        }
        _ratio_hint = _ratio_hint_map.get(ratio, f"输出比例 {ratio}")
        prompt = f"[{_ratio_hint},严格按此比例输出,不要跟随任何参考图的比例]\n\n{prompt}"

        # 拉配置
        config = await LLMService.get_by_id(config_id)
        if not config:
            return {"success": False, "image_url": None, "message": f"配置 ID {config_id} 不存在"}
        if config.get("config_type") != "image":
            return {"success": False, "image_url": None, "message": "指定的配置不是图片生成配置"}
        config = ImageService._trusted_config(config)

        # 创建日志记录
        log_id = await LogService.create_log(
            task_type="fusion_image",
            model=config.get("model_name", ""),
            config_name=config.get("name", ""),
            provider_code=config.get("provider_code", ""),
            base_url=config.get("base_url", ""),
            input_prompt=prompt + f"\n[参考图 {len(reference_images_base64)} 张]",
            novel_id=None,
            chapter_title=f"自由生图(融合 {len(reference_images_base64)} 图)",
        )

        try:
            # api_style 路由
            api_style = (config.get("api_style") or "auto").lower()
            _provider_code = (config.get("provider_code") or "").lower()
            _base_url_lower = (config.get("base_url") or "").lower()
            _model_norm = (config.get("model_name") or "").lower().replace(" ", "")
            _is_wuyinkeji = (_provider_code in ("wuyinkeji", "wuyinkeji_llm")) or ("wuyinkeji" in _base_url_lower)
            _is_geek_gpt_image = "geek" in _base_url_lower and ("gpt-image" in _model_norm or "gptimage" in _model_norm)
            _is_cool = "cool" in api_style or "mjapi" in _base_url_lower
            _is_1day = ("1day" in _base_url_lower or "oneday" in _base_url_lower) and ("gpt-image" in _model_norm or "gptimage" in _model_norm)
            # v3.61.191:KKAI(mooko/kkone)融合 — 多参考图走 /images/edits
            _is_mooko = (_provider_code in ("mooko", "kkai", "kkone")) or ("mooko.ai" in _base_url_lower) or ("kkone" in _base_url_lower)

            if _is_wuyinkeji and api_style != "wuyinkeji_async":
                api_style = "wuyinkeji_async"
            if _is_geek_gpt_image and api_style != "geek_sync":
                api_style = "geek_sync"
            if _is_mooko and api_style != "mooko_sync":
                api_style = "mooko_sync"

            timeout = max(config.get("request_timeout", 600) or 600, 600)
            model_name = config["model_name"]
            image_url = None

            if api_style == "wuyinkeji_async":
                _lg2.info(f"[fusion] 使用速创 wuyinkeji_async 多图融合: {model_name} (ref={len(reference_images_base64)})")
                _mn_lower = (model_name or "").lower().replace(" ", "")
                is_gpt_image = ("gpt" in _mn_lower and "image" in _mn_lower)
                ref_urls = []
                if is_gpt_image:
                    # GPT-Image-2 上游只接 URL,先全部上传到 admin
                    for b64 in reference_images_base64:
                        try:
                            ref_url, _del_token = await ImageService._upload_ref_to_admin(b64)
                            ref_urls.append(ref_url)
                        except Exception as _up_err:
                            _lg2.warning(f"[fusion] 参考图上传 admin 失败,跳过该张: {_up_err}")
                else:
                    # NanoBanana/Wan/Grok 直接吞 base64 data URL
                    for b64 in reference_images_base64:
                        if b64.startswith("data:"):
                            ref_urls.append(b64)
                        else:
                            ref_urls.append(f"data:image/png;base64,{b64}")
                if not ref_urls:
                    raise RuntimeError("所有参考图上传/编码失败,无法发起融合")
                import json as _json
                try:
                    cfg_extra = _json.loads(config.get("extra_params") or "{}") if isinstance(config.get("extra_params"), str) else (config.get("extra_params") or {})
                except Exception:
                    cfg_extra = {}
                image_url = await ImageService._generate_with_wuyinkeji_async(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    aspect_ratio=ratio,
                    image_size=cfg_extra.get("image_size") or "1K",
                    ref_urls=ref_urls,
                    timeout=timeout,
                )
            elif api_style == "geek_sync":
                _lg2.info(f"[fusion] 使用 geek_sync 多图融合: {model_name} (ref={len(reference_images_base64)})")
                ref_urls = []
                for b64 in reference_images_base64:
                    try:
                        b64_arg = b64.split(",", 1)[-1] if (isinstance(b64, str) and b64.startswith("data:")) else b64
                        ref_url, _del_token = await ImageService._upload_ref_to_admin(b64_arg)
                        ref_urls.append(ref_url)
                    except Exception as _up_err:
                        _lg2.warning(f"[fusion] 参考图上传 admin 失败,跳过该张: {_up_err}")
                if not ref_urls:
                    raise RuntimeError("所有参考图上传 admin 失败,无法发起融合")
                # v3.61.96: 补齐所有 UI 比例预设,避免 fallback 到 16:9
                # v3.61.147: 加 2:1(VR equirectangular 全景图,2048x1024)
                _geek_size_map = {
                    "1:1":  "2048x2048",
                    "16:9": "1920x1080",
                    "9:16": "1080x1920",
                    "4:3":  "1536x1024",
                    "3:4":  "1024x1536",
                    "2:3":  "1024x1536",
                    "3:2":  "1536x1024",
                    "21:9": "2520x1080",
                    "9:21": "1080x2520",
                    "2:1":  "2048x1024",
                    "1:2":  "1024x2048",
                }
                geek_size = _geek_size_map.get(ratio, "1920x1080")
                image_url = await ImageService._generate_with_geek_sync(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    size=geek_size,
                    ref_urls=ref_urls,
                    timeout=timeout,
                )
            elif api_style == "mooko_sync":
                # v3.61.191:KKAI(mooko/kkone)多参考图融合 — 有 ref → _generate_with_mooko_sync 走 /images/edits
                _lg2.info(f"[fusion] 使用 KKAI mooko_sync 多图融合: {model_name} (ref={len(reference_images_base64)})")
                # v3.61.193:多参考图直接传 base64(edits 走 multipart 上传文件),不再上传 admin
                ref_images = list(reference_images_base64)
                # v3.61.194:比例 → size 用 KKAI 官网同款算法实时算,默认 4K(溶图所有比例对齐官网)
                # v3.61.205:KKAI 已修复横幅 4K edits 网关超时(实测 4K 16:9 edits ~62s 返 200,
                #   不再像之前 3 分钟→502)→ 还原回 4K,横幅/竖图统一 4K。
                mooko_size = ImageService._kkai_calc_size(ratio, "4K")
                import json as _mooko_json
                try:
                    _mooko_extra = _mooko_json.loads(config.get("extra_params") or "{}") if isinstance(config.get("extra_params"), str) else (config.get("extra_params") or {})
                except Exception:
                    _mooko_extra = {}
                image_url = await ImageService._generate_with_mooko_sync(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    size=mooko_size,
                    ref_images=ref_images,
                    output_format=str(_mooko_extra.get("output_format") or "jpeg"),
                    response_format=_mooko_extra.get("response_format"),
                    quality=_mooko_extra.get("quality"),
                    moderation=_mooko_extra.get("moderation"),
                    timeout=timeout,
                )
            elif api_style == "cool_async" or _is_cool:
                _lg2.info(f"[fusion] 使用 Cool API 多图融合: {model_name} (ref={len(reference_images_base64)})")
                ref_urls = []
                for b64 in reference_images_base64:
                    try:
                        b64_arg = b64.split(",", 1)[-1] if (isinstance(b64, str) and b64.startswith("data:")) else b64
                        cool_url = await ImageService._upload_ref_to_cool(b64_arg, config["base_url"], config["api_key"])
                        ref_urls.append(cool_url)
                    except Exception as _up_err:
                        _lg2.warning(f"[fusion] 参考图上传 Cool CDN 失败,跳过该张: {_up_err}")
                if not ref_urls:
                    raise RuntimeError("所有参考图上传 Cool 失败,无法发起融合")
                image_url = await ImageService._generate_with_cool_async(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    aspect_ratio=ratio,  # v3.61.96: fix — 之前没传 ratio,Cool 默认 16:9 → 用户选 9:16 不生效
                    ref_urls=ref_urls,
                    timeout=timeout,
                )
            else:
                err_msg = (
                    f"模型 {model_name}({api_style}) 不支持多参考图融合。"
                    f"自由生图功能当前支持:速创(wuyinkeji_async) / geek GPT-Image-2(geek_sync) / KKAI(mooko_sync) / Cool API(cool_async)。"
                    f"请到模型 API 配置切换到支持的中转。"
                )
                await LogService.update_log_error(log_id=log_id, error_message=err_msg)
                return {"success": False, "image_url": None, "message": err_msg}

            if not image_url:
                err_msg = "融合图生成失败:上游返回空 URL"
                await LogService.update_log_error(log_id=log_id, error_message=err_msg)
                return {"success": False, "image_url": None, "message": err_msg}

            # v3.61.191:image_url 可能是 http URL(待下载)或已是本地路径
            #   (KKAI 返 b64_json/dataURL → _generate_with_mooko_sync 已存盘返回本地路径)。
            #   本地路径不该写进 remote_url,也不该再走 _download_image(否则脏日志 + 下载失败 warning)。
            if isinstance(image_url, str) and image_url.startswith("http"):
                remote_url = image_url
                try:
                    await LogService.update_log_remote_url(log_id=log_id, remote_url=remote_url)
                except Exception:
                    pass
                # 下载到本地 data/images/
                import time as _time
                filename = f"fusion_{int(_time.time())}_{secrets.token_hex(4)}.png"
                local_path = await ImageService._download_image(image_url, filename)
                if local_path:
                    image_url = local_path
            else:
                # 已是本地路径(provider 端已存盘),不写 remote_url、不重复下载
                remote_url = None

            await LogService.update_log_success(
                log_id=log_id, output_content=image_url, input_tokens=0, output_tokens=0, total_tokens=0
            )
            return {"success": True, "image_url": image_url, "remote_url": remote_url, "message": "融合图生成成功"}
        except Exception as e:
            err_msg = f"{type(e).__name__}: {str(e)[:300]}"
            _lg2.error(f"[fusion] 异常: {err_msg}", exc_info=True)
            try:
                await LogService.update_log_error(log_id=log_id, error_message=err_msg)
            except Exception:
                pass
            return {"success": False, "image_url": None, "message": err_msg}

    @staticmethod
    async def generate_image(
        config_id: int,
        prompt: str,
        element_id: int = None,
        element_type: str = None,
        novel_id: int = None,
        reference_image_path: str = None,
        override_ratio: str = None,  # v3.61.147:强制覆盖 config 里的 image_ratio(全景图用 "2:1")
        image_role: str = "finished",  # v3.61.202:图类别(finished/grid/panorama/variant_finished)→ 决定语义文件名
        variant_name: str = None,      # v3.61.202:马甲名(image_role=variant_* 时用)
        override_filename: str = None,  # v3.61.262:强制指定保存文件名(相对 data/images/ 的片段,可带子目录)。
                                        # 封面多比例用:每比例各唯一名,绕过 _build_image_filename 的"未命名"固定路径互相覆盖。
    ) -> Dict[str, Any]:
        """
        调用图片生成大模型生成图片
        
        参数:
        - config_id: 图片模型配置ID（config_type=image 的配置）
        - prompt: 图片生成提示词（元素的描述）
        - element_id: 关联的元素ID
        - element_type: 元素类型（character/scene/prop）
        - novel_id: 关联小说ID
        - reference_image_path: 参考图路径（可选，用于图生图）
        
        返回:
        - {"success": bool, "image_url": str, "message": str}
        """
        # 清理 prompt 中的 Unicode 特殊字符，避免编码错误
        prompt = sanitize_unicode(prompt)
                
        # 获取图片模型配置
        config = await LLMService.get_by_id(config_id)
        if not config:
            return {"success": False, "image_url": None, "message": f"配置ID {config_id} 不存在"}
        
        if config.get("config_type") != "image":
            return {"success": False, "image_url": None, "message": "指定的配置不是图片生成配置"}
        config = ImageService._trusted_config(config)
        
        # 创建日志记录
        log_id = await LogService.create_log(
            task_type="image_generation",
            model=config.get("model_name", ""),
            config_name=config.get("name", ""),
            provider_code=config.get("provider_code", ""),
            base_url=config.get("base_url", ""),
            input_prompt=prompt + (f"\n[参考图: {reference_image_path}]" if reference_image_path else ""),
            novel_id=novel_id,
            chapter_title=f"元素ID: {element_id}, 类型: {element_type}" if element_id else None,
            source_id=element_id,
            source_type=f"extracted_element:{element_type}" if element_id else None
        )
        
        # v3.61.170 codex round2:client/http_client 初始化为 None,
        #   finally 阶段检查存在再 close — 防 try 早期(timeout 计算等)异常导致变量未赋值
        client = None
        _img_http_client = None
        try:
            # 获取尺寸参数
            # v3.61.147:override_ratio(全景图 = 2:1) 优先级最高,绕过 config 配置
            ratio = override_ratio or config.get("image_ratio", "1:1")
            model_name = config["model_name"]
            size = ImageService._get_size_from_ratio(ratio, config.get("base_url", ""))

            # 创建 OpenAI 客户端
            # 图片生成(nano-banana/gpt-image-2 等)可能需要较长时间,设置 600s(10min)超时
            timeout = config.get("request_timeout", 600)
            # 确保图片生成超时至少为 600 秒
            if timeout < 600:
                timeout = 600
            # v3.59.69:geek 中转 + gpt-image-2 实测稳定在 31s 切流,定位是 connect=30 太短
            # connect 抬到 60s,write 显式 120s,pool 10s,max_retries=0 防 SDK 静默重试遮蔽日志
            # v3.61.170: 注入 trust_env=False httpx client 防代理污染(同 llm_service / probe-models)
            _img_timeout_cfg = Timeout(timeout + 60.0, connect=60.0, read=timeout, write=120.0, pool=10.0)
            _img_http_client = httpx.AsyncClient(timeout=_img_timeout_cfg, trust_env=False)
            client = AsyncOpenAI(
                api_key=config["api_key"],
                base_url=config["base_url"],
                timeout=_img_timeout_cfg,
                max_retries=0,
                http_client=_img_http_client,
            )
            
            image_url = None
            
            # 准备参考图 base64（如果需要）
            reference_image_base64 = None
            if reference_image_path:
                reference_image_base64 = ImageService._get_image_base64(reference_image_path)
                if reference_image_base64:
                    # v3.61.50: print → logger 方便诊断(尾帧转彩铅时看不到 print 输出)
                    import logging as _lg2
                    _lg2.getLogger(__name__).info(
                        f"[ImageService] 使用参考图: {reference_image_path} "
                        f"(base64 长度={len(reference_image_base64)})"
                    )
                else:
                    import logging as _lg2
                    _lg2.getLogger(__name__).warning(
                        f"[ImageService] ⚠️ 参考图传入但读 base64 失败: {reference_image_path}"
                    )
            
            # 判断使用哪种 API 方式
            # 优先用 config.api_style 显式指定(走新预设机制);fallback 走关键字自动判断
            api_style = (config.get("api_style") or "auto").lower()

            # 🛡️ 兜底:按 provider_code(优先)/ base_url(fallback)识别速创 API
            # 原因:admin 后台预设的 api_style 字段容易被误改/同步覆盖成 auto
            # v3.59.66:provider_code 是确定性 enum,优先使用;字符串 fallback 留着兼容老配置
            _provider_code = (config.get("provider_code") or "").lower()
            _base_url_lower = (config.get("base_url") or "").lower()
            _is_wuyinkeji = (_provider_code in ("wuyinkeji", "wuyinkeji_llm")) or ("wuyinkeji" in _base_url_lower)
            _is_bltcy     = (_provider_code == "bltcy") or ("bltcy" in _base_url_lower)
            # v3.59.70:Cool API 中转(mjapi.cc.cd),异步 task_id 轮询协议
            _is_cool      = (_provider_code == "cool") or ("mjapi.cc.cd" in _base_url_lower)
            # v3.59.72:geek 中转 — gpt-image-2 系列必须自己拼 JSON 直发(SDK 不可靠)
            _is_geek_route = (_provider_code == "geek") or ("geek" in _base_url_lower) or ("geeknow" in _base_url_lower)
            _model_lower_route = (model_name or "").lower()
            _is_geek_gpt_image = _is_geek_route and "gpt-image" in _model_lower_route
            # v3.61.189:KKAI(mooko)中转 — OpenAI 兼容但 output_format 必需,自拼 JSON 直发
            # codex P2:产品名 KKAI,后台预设/用户配置可能填 kkai,一并识别
            # v3.61.190:实测 KKAI 实际 API 域名是 api.kkone.vip(mooko.ai 同 key 无效),加 kkone 识别
            _is_mooko = (_provider_code in ("mooko", "kkai", "kkone")) or ("mooko.ai" in _base_url_lower) or ("kkone" in _base_url_lower)
            if api_style != "wuyinkeji_async" and _is_wuyinkeji:
                print(f"[INFO] 识别为速创 API(provider={_provider_code or 'fallback-from-url'}),强制 api_style=wuyinkeji_async (原值={api_style})")
                api_style = "wuyinkeji_async"

            # 🛡️ 兜底:柏拉图 API,强制走 bltcy_async 分支
            # 同步接口 184s+ 后 keep-alive 经常被中转切流,async 模式 task_id 轮询不怕断流
            if api_style != "bltcy_async" and _is_bltcy:
                print(f"[INFO] 识别为柏拉图 API(provider={_provider_code or 'fallback-from-url'}),强制 api_style=bltcy_async (原值={api_style})")
                api_style = "bltcy_async"

            # 🛡️ 兜底:Cool API,异步任务 + 轮询(协议结构跟速创类似但鉴权/字段不同)
            if api_style != "cool_async" and _is_cool:
                print(f"[INFO] 识别为 Cool API(provider={_provider_code or 'fallback-from-url'}),强制 api_style=cool_async (原值={api_style})")
                api_style = "cool_async"

            # 🛡️ 兜底:geek + gpt-image-2 系列 → 走 geek_sync 自拼 JSON
            # 原因(v3.59.72):OpenAI SDK 的 extra_body 透传不可靠,实测 image 字段被 SDK 静默吞掉
            #                 → 上游收不到参考图 → 出图等同文生图
            #                 用 aiohttp 直发完全控制请求体,参考图先上传 admin-server 拿公网 URL
            if api_style != "geek_sync" and _is_geek_gpt_image:
                print(f"[INFO] 识别为 geek GPT-Image(provider={_provider_code or 'fallback-from-url'}),强制 api_style=geek_sync (原值={api_style})")
                api_style = "geek_sync"

            # 🛡️ 兜底:KKAI(mooko)→ 走 mooko_sync 自拼 JSON(OpenAI 兼容,但 output_format 必需)
            if api_style != "mooko_sync" and _is_mooko:
                print(f"[INFO] 识别为 KKAI(mooko)(provider={_provider_code or 'fallback-from-url'}),强制 api_style=mooko_sync (原值={api_style})")
                api_style = "mooko_sync"

            # 速创 API(wuyinkeji)专用异步分支:提交任务→轮询获取→返回 URL
            # 设计思路:应用层调用流程不变,只在这里走另一套获取链路
            if api_style == "wuyinkeji_async":
                print(f"[INFO] 使用速创 wuyinkeji_async 异步接口生成图片: {model_name}")
                # 解析参考图 URL 列表(速创支持 urls 数组传入,最多 14 张)
                import json as _json
                try:
                    cfg_extra = _json.loads(config.get("extra_params") or "{}") if isinstance(config.get("extra_params"), str) else (config.get("extra_params") or {})
                except Exception:
                    cfg_extra = {}
                ref_urls = []
                delete_tokens = []  # GPT-Image-2 走 URL 上传路径时需要清理
                # GPT-Image-2 upstream 只接受公网 URL,不认 base64。
                # 其它模型(NanoBanana/Wan/Grok)可以直接吞 base64 data URI。
                _mn_lower = (model_name or "").lower().replace(" ", "")
                is_gpt_image = ("gpt" in _mn_lower and "image" in _mn_lower)

                if reference_image_base64:
                    if is_gpt_image:
                        # 先上传到管理服务器,换一个公网 URL 再发给速创
                        try:
                            ref_url, del_token = await ImageService._upload_ref_to_admin(
                                reference_image_base64
                            )
                            ref_urls.append(ref_url)
                            delete_tokens.append(del_token)
                            print(f"[INFO] GPT-Image-2 参考图已上传: {ref_url}")
                        except Exception as _up_err:
                            print(f"[WARN] 参考图上传 admin-server 失败,继续无参考图生成: {_up_err}")
                    else:
                        # 其它模型直接用 base64 data URI
                        # v3.61.78 修复:_get_image_base64 已返回完整 data: 前缀,
                        # 不能再拼一层(原代码 data:image/png;base64,data:image/png;base64,xxx 双前缀
                        # 导致 NanoBanana/Wan/Grok 等模型 base64 解码失败 → 宫格图无参考图)
                        if reference_image_base64.startswith("data:"):
                            ref_urls.append(reference_image_base64)
                        else:
                            ref_urls.append(f"data:image/png;base64,{reference_image_base64}")

                # 注意：不在此处立即清理参考图。
                # 原因：速创提交任务后可能在内部异步拉取参考图 URL，
                # 即使 detail 接口返回 status=2，图片服务器仍可能在使用该 URL。
                # 改为由 admin-server 每天凌晨 00:00 统一清理，更安全。
                image_url = await ImageService._generate_with_wuyinkeji_async(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    aspect_ratio=ratio,
                    image_size=cfg_extra.get("image_size") or "1K",
                    ref_urls=ref_urls,
                    timeout=timeout,
                )
            elif api_style == "bltcy_async":
                # 柏拉图异步分支:解决同步 API 长连接被中转切流(实测 184s+ 后 HTTP 不响应)
                print(f"[INFO] 使用柏拉图 bltcy_async 异步接口生成图片: {model_name}")
                # 像素尺寸映射 — 跟原同步分支保持一致
                _bltcy_size_map = {
                    "1:1":  "2048x2048",
                    "16:9": "3840x2160",
                    "9:16": "2160x3840",
                    "4:3":  "3840x2160",
                    "3:4":  "2160x3840",
                }
                # 有参考图统一走 16:9 4K(柏拉图 edits 实际不读 size,但路径上保留兜底)
                bltcy_size = "3840x2160" if reference_image_base64 else _bltcy_size_map.get(ratio, "3840x2160")
                image_url = await ImageService._generate_with_bltcy_async(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    size=bltcy_size,
                    reference_image_base64=reference_image_base64,
                    timeout=timeout,
                    log_id=log_id,
                )
            elif api_style == "cool_async":
                # v3.59.70:Cool API(mjapi.cc.cd)异步分支
                # POST /v1/cool/generate → task_id → GET /v1/cool/task/{id} 轮询
                # v3.59.84 关键修复:参考图改走 cool 原生上传接口(/v1/cool/upload multipart 直传)
                # 老 bug:走 admin-server 外链 → cool 上游模型拉 admin 端口 9000 拉不到 → 静默忽略
                #         实测 admin URL 直接调 cool 的 /upload_url 也是 404,网络层就有问题
                # 修法:用 cool 自己的 multipart upload,拿 cdn.flova.ai 内部 URL,绕开外链
                # v3.61.53: print → logger 方便诊断
                import logging as _lg2
                _lg2.getLogger(__name__).info(f"[Cool] 使用 cool_async 接口生成: {model_name}")
                ref_urls = []
                if reference_image_base64:
                    try:
                        cool_ref_url = await ImageService._upload_ref_to_cool(
                            reference_image_base64,
                            cool_base_url=config["base_url"],
                            api_key=config["api_key"],
                        )
                        ref_urls.append(cool_ref_url)
                        _lg2.getLogger(__name__).info(f"[Cool] 参考图已传 CDN: {cool_ref_url[:120]}")
                    except Exception as _up_err:
                        _lg2.getLogger(__name__).warning(f"[Cool] ⚠️ 参考图上传 CDN 失败,fallback 无参考图: {_up_err}")
                image_url = await ImageService._generate_with_cool_async(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    aspect_ratio=ratio,
                    ref_urls=ref_urls,
                    timeout=timeout,
                )
            elif api_style == "geek_sync":
                # v3.59.72:geek + gpt-image-2 自拼 JSON 直发(绕开 OpenAI SDK)
                # 参考图先上传 admin-server 拿公网 URL,传给 geek 的 image 数组
                # 实测(v3.59.71):传 base64 数组(无论带/不带 data URI)上游都识别不了
                #                  → 走 URL 这条更可靠的路径
                print(f"[INFO] 使用 geek_sync 自拼 JSON 直发 gpt-image: {model_name}")
                ref_urls = []
                if reference_image_base64:
                    try:
                        # _upload_ref_to_admin 接受裸 base64 或 data URI,内部会处理
                        b64_arg = reference_image_base64
                        if isinstance(b64_arg, str) and b64_arg.startswith("data:"):
                            b64_arg = b64_arg.split(",", 1)[-1]
                        ref_url, _del_token = await ImageService._upload_ref_to_admin(b64_arg)
                        ref_urls.append(ref_url)
                        print(f"[INFO] geek 参考图已上传: {ref_url}")
                    except Exception as _up_err:
                        print(f"[WARN] 参考图上传 admin-server 失败,继续无参考图生成: {_up_err}")
                # 比例 → size(B 方案,文档原生 2K)
                # v3.61.147: 加 2:1(VR 全景图)
                _geek_size_map = {
                    "1:1":  "2048x2048",
                    "16:9": "1920x1080",
                    "9:16": "1080x1920",
                    "4:3":  "1536x1024",
                    "3:4":  "1024x1536",
                    "2:1":  "2048x1024",
                    "1:2":  "1024x2048",
                }
                geek_size = _geek_size_map.get(ratio, "1920x1080")
                image_url = await ImageService._generate_with_geek_sync(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    size=geek_size,
                    ref_urls=ref_urls,
                    timeout=timeout,
                )
            elif api_style == "mooko_sync":
                # v3.61.189:KKAI(mooko/kkone)OpenAI 兼容图片生成
                #   - output_format 必需(KKAI 强校验;png 生 4K 必失败 → 默认 jpeg)
                #   - v3.61.190:2:1=2048x1024 实测能出真 equirectangular 全景(已进全景白名单)
                #   - 默认 16:9 走 4K(3840x2160)
                print(f"[INFO] 使用 mooko_sync KKAI 生成: {model_name}")
                # v3.61.193:参考图直接传 base64(edits 走 multipart 上传文件),不再上传 admin
                ref_images = [reference_image_base64] if reference_image_base64 else []
                # v3.61.194:比例 → size 用 KKAI 官网同款算法实时算,默认 4K(任意比例精确对齐官网)
                mooko_size = ImageService._kkai_calc_size(ratio, "4K")
                # extra_params 可覆盖 output_format / quality / moderation
                import json as _mooko_json
                try:
                    _mooko_extra = _mooko_json.loads(config.get("extra_params") or "{}") if isinstance(config.get("extra_params"), str) else (config.get("extra_params") or {})
                except Exception:
                    _mooko_extra = {}
                image_url = await ImageService._generate_with_mooko_sync(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=model_name,
                    prompt=prompt,
                    size=mooko_size,
                    ref_images=ref_images,
                    output_format=str(_mooko_extra.get("output_format") or "jpeg"),
                    response_format=_mooko_extra.get("response_format"),
                    quality=_mooko_extra.get("quality"),
                    moderation=_mooko_extra.get("moderation"),
                    timeout=timeout,
                )
            elif api_style == "openai_chat":
                use_chat = True
            elif api_style == "openai_images":
                use_chat = False
            else:  # 'auto' 或未知值,保持原有行为
                use_chat = ImageService._should_use_chat_completion(model_name)

            if api_style in ("wuyinkeji_async", "bltcy_async", "cool_async", "geek_sync", "mooko_sync"):
                # 已在上方分支处理 — 不再走 OpenAI SDK 路径
                pass
            elif use_chat:
                # 方式2：通过 chat.completions 接口调用（智谱 CogView、Gemini 等）
                print(f"[INFO] 使用 chat.completions 接口生成图片: {model_name} (api_style={api_style})")
                image_url = await ImageService._generate_with_chat_completion(
                    client=client,
                    model=model_name,
                    prompt=prompt,
                    size=size,
                    reference_image_base64=reference_image_base64
                )
            else:
                # 方式1：标准 OpenAI images.generate 接口（DALL-E / Seedream 等）
                # 参考图按模型适配:Seedream 走 extra_body.image_urls;DALL-E 等暂不支持
                print(f"[INFO] 使用 images.generate 接口生成图片: {model_name} (api_style={api_style})")
                # 解析 config.extra_params:里面可能带 use_pre_llm / watermark / seed / guidance_scale 等
                import json as _json
                try:
                    cfg_extra = _json.loads(config.get("extra_params") or "{}") if isinstance(config.get("extra_params"), str) else (config.get("extra_params") or {})
                except Exception:
                    cfg_extra = {}
                image_url = await ImageService._generate_with_images_api(
                    client=client,
                    model=model_name,
                    prompt=prompt,
                    size=size,
                    reference_image_base64=reference_image_base64,
                    extra_params=cfg_extra,
                    base_url=config.get("base_url") or "",
                    ratio=ratio,
                    provider_code=config.get("provider_code") or "",  # v3.59.66:渠道路由优先用 provider_code
                )
            
            if not image_url:
                error_msg = "无法获取生成的图片"
                await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                return {"success": False, "image_url": None, "message": error_msg}

            # ★ 关键:服务商响应到手立刻持久化 URL(防止后续下载挂掉导致 URL 永久丢失)
            # nano-banana 这类模型返回的 URL 仅 2 小时有效,必须第一时间入库
            if image_url.startswith("http"):
                await LogService.update_log_remote_url(log_id=log_id, remote_url=image_url)

                # 下载到本地(小说/类型/语义名,用户打开目录可一眼区分)
                # v3.61.262:override_filename 优先(封面多比例各唯一名,避免固定路径互相覆盖)
                filename = override_filename or await ImageService._build_image_filename(
                    novel_id=novel_id,
                    element_id=element_id,
                    element_type=element_type,
                    ext=".png",
                    image_role=image_role,
                    variant_name=variant_name,
                )
                local_path = await ImageService._download_image(image_url, filename)
                if local_path:
                    image_url = local_path
                else:
                    # 下载失败,但 remote_url 已在库里,前端可点"重下图片"在 2 小时内补救
                    error_msg = "图片生成成功但下载失败(服务商已扣费,URL 已保存,可在 2 小时内点击'重下图片'重试)"
                    await LogService.update_log_error(log_id=log_id, error_message=error_msg)
                    return {"success": False, "image_url": None, "message": error_msg}

            # base64 直接落地的回退:文件已被底层 saver 用占位名 image_xxx.png 写入,
            # 这里改名成「小说/类型/语义名」(跟 http 下载路径完全一致的命名规则)
            elif image_url.startswith("data/images/"):
                try:
                    old_basename = os.path.basename(image_url)
                    if old_basename.startswith("image_"):
                        ext = os.path.splitext(old_basename)[1] or ".png"
                        # v3.61.262:override_filename 优先(封面多比例各唯一名)
                        if override_filename:
                            new_rel = override_filename
                        else:
                            new_rel = await ImageService._build_image_filename(
                                novel_id=novel_id,
                                element_id=element_id,
                                element_type=element_type,
                                ext=ext,
                                image_role=image_role,
                                variant_name=variant_name,
                            )
                        images_dir = ImageService._ensure_images_dir()
                        old_path = os.path.join(images_dir, old_basename)
                        new_path = os.path.join(images_dir, new_rel.replace("/", os.sep))
                        if os.path.exists(old_path):
                            # v3.61.202:os.replace 原子转正成新语义名;同 stem 旧图(不同扩展名)清理
                            #   由【调用方 DB 更新成功后】做 — ImageService 不碰 DB,不能提前删旧图。
                            os.makedirs(os.path.dirname(new_path), exist_ok=True)
                            os.replace(old_path, new_path)
                            image_url = f"data/images/{new_rel}"
                except Exception as _rename_err:
                    print(f"[WARN] 重命名图片为语义名失败,沿用原名: {_rename_err}")

            # ⚠️ 用户开启水印开关时,只给【人物】图打"此图由AI生成"红色半透明标识
            # 用途:配合即梦"涉嫌真人"审核 — 真人脸触发拦截,合规标识能让审核器跳过
            # 范围:仅 element_type='character' (场景/道具图不加,因为它们本身不会被识别成真人)
            # v3.61.46: 撤回彩铅滤镜(效果不好,改回风格 prompt 控);水印仍按 KEY_IMAGE_WATERMARK_ENABLED 控制(只控生图)
            if (image_url
                and image_url.startswith("data/images/")
                and element_type == "character"):
                try:
                    from services.settings_service import (
                        SettingsService,
                        KEY_IMAGE_WATERMARK_ENABLED,
                        KEY_IMAGE_WATERMARK_FACE_ENABLED,
                    )
                    if await SettingsService.get_bool(KEY_IMAGE_WATERMARK_ENABLED, default=False):
                        from services.watermark_service import add_ai_watermark
                        # v3.59.45:面部覆盖模式 — 解决人物三视图/表情图等多脸图居中水印失效
                        face_mode = await SettingsService.get_bool(KEY_IMAGE_WATERMARK_FACE_ENABLED, default=False)
                        # ★ v3.59.46:用 resolve_db_path 自动按分类(images→media_dir/frames→data_dir)拼绝对路径
                        abs_path = resolve_db_path(image_url)
                        add_ai_watermark(abs_path, face_mode=face_mode)
                except Exception as _wm_err:
                    print(f"[WARN] 水印处理异常(忽略): {_wm_err}")

            # 更新日志为成功状态
            await LogService.update_log_success(
                log_id=log_id,
                output_content=image_url,
                input_tokens=0,
                output_tokens=0,
                total_tokens=0
            )

            return {
                "success": True,
                "image_url": image_url,
                "message": "图片生成成功"
            }
            
        except Exception as e:
            raw = f"{type(e).__name__}: {str(e)}"
            lower = raw.lower()
            # 跟 LLM 路径同款友好化:已识别的错误给精准提示,未识别的兜底"换中转"
            if 'insufficient_user_quota' in lower or 'new_api_error' in lower:
                error_msg = f"中转拒绝调用:{str(e)[:300]}\n说明:这是中转的提示,可能是分组配额、模型权限或渠道路由问题。请到中转后台查看,或联系中转客服。"
            elif 'insufficient_quota' in lower or 'insufficient balance' in lower or 'billing' in lower or '402' in lower:
                error_msg = "API 账户余额不足或额度已用完,请充值后重试。"
            elif '401' in lower or 'unauthorized' in lower or 'invalid api key' in lower:
                error_msg = 'API Key 无效或已失效,请到"模型API配置"检查密钥是否正确。'
            elif '429' in lower or 'rate limit' in lower or 'too many requests' in lower:
                error_msg = "调用过于频繁触发服务商限流,请稍候 1-2 分钟再试。"
            elif '404' in lower or 'model not found' in lower:
                error_msg = "图像模型不存在或接口地址错误,请检查 model_name 和 base_url。"
            elif '502' in lower or '503' in lower or 'bad gateway' in lower:
                error_msg = "服务商网关临时故障(502/503),请稍后重试。"
            elif 'prohibited_content' in lower or 'prompt_blocked' in lower or '内容安全' in str(e) or 'safety' in lower:
                error_msg = "图像服务的内容安全过滤拒绝了本次请求。请检查 prompt 是否含血腥/暴力/情色/敏感词,修改后重试。"
            else:
                # 兜底:未识别的中转/服务商错误
                error_msg = (
                    "图像 API 调用异常,请稍后再试,"
                    "或尝试切换该中转的【高级分组】、或切换为【其他中转】。\n"
                    f"(技术信息:{raw[:300]})"
                )
            print(f"[ERROR] 图片生成失败: {raw}")
            await LogService.update_log_error(log_id=log_id, error_message=error_msg)
            return {"success": False, "image_url": None, "message": error_msg}
        finally:
            # v3.61.170 codex round2:关 OpenAI client + 自定义 httpx — 防连接池泄漏
            #   client.close() 会顺手关掉 _img_http_client(SDK 内部转发)
            if client is not None:
                try:
                    await client.close()
                except Exception:
                    pass

    # ==================== 速创 API (wuyinkeji) 异步图片生成 ====================
    # 流程:POST 提交任务 → 拿 task_id → 轮询 /api/async/detail → status=2 取 result[0] URL
    # 模型名→端点路径映射(model_name 填啥就走对应端点)
    _WUYINKEJI_MODEL_ENDPOINT = {
        # key 是规范化后的 model_name 小写去连字符;value 是端点路径(不含 base_url)
        "nanobanana": "/api/async/image_nanoBanana",
        "nanobanana2": "/api/async/image_nanoBanana2",
        "nanobanana-pro": "/api/async/image_nanoBanana_pro",
        "nanobananapro": "/api/async/image_nanoBanana_pro",
        "gpt-image-2": "/api/async/image_gpt",
        "gptimage2": "/api/async/image_gpt",
        "image_gpt": "/api/async/image_gpt",
        # 实测正确端点:Wan 2.6 的 path 带版本号 2.6
        "wan2.6": "/api/async/image_wan2.6",
        "wan-2.6": "/api/async/image_wan2.6",
        "image_wan": "/api/async/image_wan2.6",
        # Grok Imagine 的 path 含 _imagine 后缀
        "grok-imagine": "/api/async/image_grok_imagine",
        "grokimagine": "/api/async/image_grok_imagine",
        "image_grok": "/api/async/image_grok_imagine",
    }

    # v3.61.147:VR 720° 全景图生成 — generate_image 的薄包装
    # 强制 ratio=2:1 (2048x1024) + prompt 头注入 equirectangular 锚点
    # 调用方:ExtractionService 场景元素的"生成全景图"按钮
    # v3.61.155:支持参考图(从 element.reference_image 自动读),让用户能用一张普通场景图引导风格/构图
    @staticmethod
    async def generate_panorama(
        config_id: int,
        prompt: str,
        element_id: int = None,
        novel_id: int = None,
        reference_image_path: str = None,
    ) -> Dict[str, Any]:
        """生成 VR 720° equirectangular 全景图。
        返回结构跟 generate_image 一致 {"success", "image_url", "message"}
        image_url 字段虽叫 image_url,实际是 panorama_url(调用方写入 extracted_elements.panorama_url 即可)

        v3.61.147 通道校验(按 api_style/provider 实际分支判断,而非 model 名模糊匹配):
          只放行已经加了 2:1 size 映射的真实分支:
            1) geek_sync(geek 中转 GPT-Image-2,已加 2:1=2048x1024)
            2) 1Day 路径(1day/oneday 中转 GPT-Image-2 / nano-banana,已加 2:1=2048x1024)
            3) OpenAI 官方直发(SDK 把 size 参数直接透传,服务端兜底)
          其余分支(wuyinkeji_async / bltcy_async / cool_async / 灵芽 等)→ size map 没 2:1,
          会 fallback 到 16:9,生成的不是等距柱状全景,后续宫格投影会变形,直接拒绝
        """
        # 校验配置通道是否支持 2:1
        config = await LLMService.get_by_id(config_id)
        if not config:
            return {"success": False, "image_url": None, "message": f"配置 ID {config_id} 不存在"}
        if config.get("config_type") != "image":
            return {"success": False, "image_url": None, "message": "指定的配置不是图片生成配置"}
        config = ImageService._trusted_config(config)

        # 复用 generate_image 的 provider 识别逻辑(L620-657),保持一致
        api_style = (config.get("api_style") or "auto").lower()
        _provider = (config.get("provider_code") or "").lower()
        _base = (config.get("base_url") or "").lower()
        _model = (config.get("model_name") or "").lower()

        _is_wuyinkeji = _provider in ("wuyinkeji", "wuyinkeji_llm") or "wuyinkeji" in _base
        _is_bltcy     = _provider == "bltcy" or "bltcy" in _base
        _is_cool      = _provider == "cool" or "mjapi.cc.cd" in _base
        _is_geek      = _provider == "geek" or "geek" in _base or "geeknow" in _base
        # v3.61.190:KKAI(mooko/kkone)实测能出真 2:1 equirectangular 全景,放进白名单
        _is_mooko     = _provider in ("mooko", "kkai", "kkone") or "mooko.ai" in _base or "kkone" in _base
        # 1Day 真实检测同步实际 dispatch 逻辑(image_service L1740):
        #   provider_code == "1day" 优先;base_url 含 daydreaming.work 是规范域名;
        #   1day/oneday 字串只是历史 fallback,大部分 1Day 配置走的是 daydreaming.work
        _is_1day      = _provider == "1day" or "daydreaming.work" in _base or "1day" in _base or "oneday" in _base
        _is_lingya    = _provider == "lingya" or "lingya" in _base  # 灵芽,size 也没 2:1
        _is_openai_direct = ("api.openai.com" in _base) and not (_is_geek or _is_1day)
        # v3.61.158 codex round5 + v3.61.161: Seedream 按版本分支 —
        #   4.0 / 4.5 等"非 lite"档:文档支持像素 size,2048x1024(2:1)在 2K 档内合法 → 白名单放行
        #   5.0-lite / 后续 *-lite 档:文档只标比例(16:9/21:9 无 2:1),且像素 size 有 2K 最小限制
        #                            2048x1024(≈2.1M 像素)低于 2K 档,大概率被拒 → 单独从白名单摘出
        #   v3.61.161 修:火山 2026 年 5.0 系列目前全是 lite(实例:doubao-seedream-5-0-260128
        #               命名不带 'lite' 但实际是 lite,放行后上游 200+empty data 返"无法获取图片")
        #               → "5-0"/"5.0"/"5_0" 子串识别也归 lite 拒
        _is_seedream      = "seedream" in _model
        _is_seedream_lite = _is_seedream and (
            "lite" in _model
            or "5-0" in _model    # doubao-seedream-5-0-XXXXXX
            or "5.0" in _model    # 防变种命名
            or "5_0" in _model
        )
        _is_seedream_ok   = _is_seedream and not _is_seedream_lite  # 仅非 lite 进白名单
        # v3.61.158 codex round5: 速创 wuyinkeji + GPT-Image-2 — 内部白名单(L1311)含 "2:1","21:9"
        #   原 v3.61.147 整条 wuyinkeji 拉黑过严了。其他模型(Wan/Grok 明确不支持,
        #   nano-banana 透传上游不确定)仍拒
        # v3.61.158 codex round6: 用 _resolve_wuyinkeji_endpoint 复用现成的规范化(支持 gptimage2 / image_gpt / GPT-Image-2 等别名),
        #                          比纯子串 "gpt-image" in _model 准
        # 双保险:resolve 不命中时,再用规范化(去 - _ 后)子串查一次,catches "gpt-image-2" 系列别名 + "image_gpt" 写法
        _is_wuyinkeji_gpt_image = False
        if _is_wuyinkeji:
            try:
                _ep = ImageService._resolve_wuyinkeji_endpoint(config.get("model_name") or "")
                _is_wuyinkeji_gpt_image = _ep.endswith("/image_gpt")
            except Exception:
                pass
            if not _is_wuyinkeji_gpt_image:
                _flat = _model.replace("-", "").replace("_", "")
                _is_wuyinkeji_gpt_image = ("gptimage" in _flat) or ("imagegpt" in _flat)

        # v3.61.158 codex round6: 5.0-lite 显式拒挪到 lingya 判断前(否则灵芽托管的 *-lite 会被 lingya 分支先吞,
        #                          用户看不到"5.0-lite 不支持严格 2:1"这条精准提示)
        if _is_seedream_lite:
            return {"success": False, "image_url": None,
                    "message": "豆包 Seedream 5.0 系列(含 lite,如 doubao-seedream-5-0-* 全部)文档不支持严格 2:1 全景图 — "
                               "只列 16:9 / 21:9 比例,且像素 size 有 2K 档最小限制(2048x1024≈2.1M 像素低于下限,上游会返 200+空 data)。"
                               "请改用:火山方舟 doubao-seedream-4.0 / 4.5、速创 + GPT-Image-2、geek / 1day / OpenAI 直发 gpt-image-2、1day nano-banana"}

        # 黑名单先拒(就算 model 名长得像 gpt-image,api_style 也是这几个 _async 分支 → fallback 16:9)
        # v3.61.158 codex round5: wuyinkeji + GPT-Image-2 例外放行(下面白名单接住)
        if _is_wuyinkeji and not _is_wuyinkeji_gpt_image:
            return {"success": False, "image_url": None,
                    "message": "速创(wuyinkeji)通道:Wan 2.6 / Grok 不支持 2:1,nano-banana 比例透传上游不可控。"
                               "请改用速创 + GPT-Image-2、geek / 1day / OpenAI 直发 gpt-image-2 / nano-banana,或 火山方舟 seedream-4.x(非 lite)"}
        if _is_bltcy:
            return {"success": False, "image_url": None,
                    "message": "柏拉图(bltcy)通道不支持 2:1 全景图,请改用 速创/geek/1day/OpenAI 直发 gpt-image-2 / nano-banana 或 火山方舟 seedream-4.x(非 lite)"}
        # v3.61.158 round8: Cool 客服确认补了 2:1(参见 _generate_with_cool_async L1675 _allowed_ratios),
        # 跟 wuyinkeji+gpt-image 同样从全黑名单摘出来 — 但只放行任意模型(Cool 内部统一走 ratio_use),不细分
        if _is_lingya and not _is_seedream_ok:
            return {"success": False, "image_url": None,
                    "message": "灵芽通道(非 Seedream 非 lite 模型)暂不支持 2:1 全景图,请改用 速创 + GPT-Image-2 / geek / 1day / OpenAI 直发 / 火山方舟 seedream-4.x"}

        # 白名单(已加 2:1 size 映射的真实分支)
        # v3.61.147 P2 修:OpenAI 直发也限定 gpt-image 系列(非 gpt-image 模型给 2048x1024 size 会服务端拒)
        # v3.61.158 codex round5: 仅 seedream 非 lite 档放行;速创 + GPT-Image-2 加入
        _channel_ok = (
            (_is_geek and "gpt-image" in _model)              # geek + gpt-image → geek_sync 路径,已加 2:1
            or (_is_1day and ("gpt-image" in _model or "nano-banana" in _model))  # 1Day 路径,已加 2:1
            or (_is_openai_direct and "gpt-image" in _model)  # OpenAI 直发 + 限定 gpt-image 系列
            or api_style in ("geek_sync",)                    # 显式指定 geek_sync
            or _is_seedream_ok                                 # 火山方舟 Seedream 非 lite(4.0/4.5 等)
            or _is_wuyinkeji_gpt_image                         # 速创 + GPT-Image-2(内部 size 白名单含 2:1)
            or _is_cool                                        # Cool(L1675 _allowed_ratios 加了 2:1)
            or _is_mooko                                       # v3.61.201:KKAI(mooko/kkai/kkone)所有模型都支持 2:1 全景;不查模型名(作者把 image2-pro/image2 合并成 image2,旧 'gpt-image' in model 会漏)
        )
        if not _channel_ok:
            return {
                "success": False,
                "image_url": None,
                "message": (
                    "当前图片模型配置无法保证生成真正的 2:1 全景图(可能 fallback 到 16:9)。"
                    "请改用以下配置之一:geek 中转 + gpt-image-2 / 1day 中转 + gpt-image-2 或 nano-banana / "
                    "OpenAI 官方 + gpt-image-2 / 火山方舟 doubao-seedream-4.x 系列(非 lite)"
                ),
            }

        wrapped_prompt = ImageService._wrap_panorama_prompt(prompt)
        return await ImageService.generate_image(
            config_id=config_id,
            prompt=wrapped_prompt,
            element_id=element_id,
            element_type="scene",  # 全景只服务于场景
            novel_id=novel_id,
            reference_image_path=reference_image_path,  # v3.61.155:透传参考图,有就走图生图
            override_ratio="2:1",
            image_role="panorama",  # v3.61.202:场景_名_720
        )

    # v3.61.156:用户在弹窗里编辑过的 prompt 直接用,跳过 _wrap_panorama_prompt 二次包装
    # 仍跑通道白名单校验,仍强制 ratio=2:1
    @staticmethod
    async def generate_panorama_raw(
        config_id: int,
        final_prompt: str,
        element_id: int = None,
        novel_id: int = None,
        reference_image_path: str = None,
    ) -> Dict[str, Any]:
        """跟 generate_panorama 一样,但 prompt 直接用,不二次包装。
        用户在弹窗编辑完最终 prompt 后走这条。
        """
        # 复用 generate_panorama 的通道校验
        config = await LLMService.get_by_id(config_id)
        if not config:
            return {"success": False, "image_url": None, "message": f"配置 ID {config_id} 不存在"}
        if config.get("config_type") != "image":
            return {"success": False, "image_url": None, "message": "指定的配置不是图片生成配置"}
        config = ImageService._trusted_config(config)

        api_style = (config.get("api_style") or "auto").lower()
        _provider = (config.get("provider_code") or "").lower()
        _base = (config.get("base_url") or "").lower()
        _model = (config.get("model_name") or "").lower()

        _is_wuyinkeji = _provider in ("wuyinkeji", "wuyinkeji_llm") or "wuyinkeji" in _base
        _is_bltcy     = _provider == "bltcy" or "bltcy" in _base
        _is_cool      = _provider == "cool" or "mjapi.cc.cd" in _base
        _is_geek      = _provider == "geek" or "geek" in _base or "geeknow" in _base
        # v3.61.190:KKAI(mooko/kkone)实测能出真 2:1 全景,放进白名单
        _is_mooko     = _provider in ("mooko", "kkai", "kkone") or "mooko.ai" in _base or "kkone" in _base
        _is_1day      = _provider == "1day" or "daydreaming.work" in _base or "1day" in _base or "oneday" in _base
        _is_lingya    = _provider == "lingya" or "lingya" in _base
        _is_openai_direct = ("api.openai.com" in _base) and not (_is_geek or _is_1day)
        # v3.61.158 codex round5 + v3.61.161: 跟 generate_panorama 同款
        _is_seedream      = "seedream" in _model
        _is_seedream_lite = _is_seedream and (
            "lite" in _model or "5-0" in _model or "5.0" in _model or "5_0" in _model
        )
        _is_seedream_ok   = _is_seedream and not _is_seedream_lite
        # v3.61.158 codex round6: 复用 _resolve_wuyinkeji_endpoint 规范化(支持 gptimage2 / image_gpt 别名)
        # 双保险:resolve 不命中时再用规范化子串查一次
        _is_wuyinkeji_gpt_image = False
        if _is_wuyinkeji:
            try:
                _ep = ImageService._resolve_wuyinkeji_endpoint(config.get("model_name") or "")
                _is_wuyinkeji_gpt_image = _ep.endswith("/image_gpt")
            except Exception:
                pass
            if not _is_wuyinkeji_gpt_image:
                _flat = _model.replace("-", "").replace("_", "")
                _is_wuyinkeji_gpt_image = ("gptimage" in _flat) or ("imagegpt" in _flat)

        # v3.61.158 codex round6: lite 显式拒挪到所有 provider 判断前,避免被灵芽分支吞掉
        if _is_seedream_lite:
            return {"success": False, "image_url": None,
                    "message": "豆包 Seedream 5.0 系列(含 lite)文档不支持严格 2:1 全景图。请改用 doubao-seedream-4.0/4.5、速创+GPT-Image-2、geek/1day/OpenAI 直发 gpt-image-2,或 1day nano-banana"}

        # v3.61.158 round8: Cool 加 2:1 后从黑名单摘除
        if (_is_wuyinkeji and not _is_wuyinkeji_gpt_image) or _is_bltcy or (_is_lingya and not _is_seedream_ok):
            return {"success": False, "image_url": None,
                    "message": "当前通道不支持 2:1 全景图,请改用 Cool / 速创+GPT-Image-2 / geek / 1day / OpenAI 直发 gpt-image-2 / nano-banana 或 火山方舟 seedream-4.x(非 lite)"}

        _channel_ok = (
            (_is_geek and "gpt-image" in _model)
            or (_is_1day and ("gpt-image" in _model or "nano-banana" in _model))
            or (_is_openai_direct and "gpt-image" in _model)
            or api_style in ("geek_sync",)
            or _is_seedream_ok
            or _is_wuyinkeji_gpt_image
            or _is_cool
            or _is_mooko                                       # v3.61.201:KKAI(mooko/kkai/kkone)是图片中转,所有模型都支持 2:1 全景;不查模型名(作者把 image2-pro/image2 合并成 image2 后,旧的 'gpt-image' in model 会漏)
        )
        if not _channel_ok:
            return {"success": False, "image_url": None,
                    "message": "请用 Cool / 速创+GPT-Image-2 / geek / 1day / OpenAI 直发的 gpt-image-2 / nano-banana 或 火山方舟 doubao-seedream-4.x(非 lite)配置"}

        return await ImageService.generate_image(
            config_id=config_id,
            prompt=final_prompt,
            element_id=element_id,
            element_type="scene",
            novel_id=novel_id,
            reference_image_path=reference_image_path,
            override_ratio="2:1",
            image_role="panorama",  # v3.61.202:场景_名_720
        )

    # ==================== 参考图上传到 admin-server(供 GPT-Image-2 等只认 URL 的模型使用) ====================
    # admin-server 部署位置:http://42.121.219.38:9000
    # 可通过环境变量 ADMIN_SERVER_URL 覆盖(便于本地开发)
    _ADMIN_SERVER_URL = "https://xiaoshuo.qianshanai.cn"

    @staticmethod
    async def _upload_ref_to_admin(base64_data: str) -> tuple:
        """
        把 base64 参考图上传到 admin-server,返回 (public_url, delete_token)。
        成功后该 URL 可被速创等外部 API 直接拉取;1 小时 TTL 内有效。
        """
        import base64 as _b64
        import httpx as _httpx
        import os as _os
        admin_url = _os.getenv("ADMIN_SERVER_URL") or ImageService._ADMIN_SERVER_URL

        # 支持带或不带 data:image/xxx;base64, 前缀
        b64 = base64_data
        if "," in b64 and b64.lstrip().lower().startswith("data:"):
            b64 = b64.split(",", 1)[1]
        try:
            raw = _b64.b64decode(b64)
        except Exception as e:
            raise RuntimeError(f"base64 解码失败: {e}")

        files = {"file": ("ref.png", raw, "image/png")}
        async with _httpx.AsyncClient(timeout=30, trust_env=False) as client:
            resp = await client.post(
                f"{admin_url.rstrip('/')}/api/refs/upload",
                files=files,
            )
            resp.raise_for_status()
            data = resp.json()
            if not data.get("success") or not data.get("url"):
                raise RuntimeError(f"上传返回异常: {data}")
            return data["url"], data.get("delete_token")

    @staticmethod
    async def _upload_ref_to_cool(
        base64_data: str,
        cool_base_url: str,
        api_key: str,
    ) -> str:
        """v3.59.84:把参考图直接上传到 Cool CDN,返回 cool 内部 URL。

        背景:Cool 网关的上游图片模型(gpt_image_2 等)不能可靠地从我们 admin-server
              (端口 9000)拉外链 — 实测 cool 的 /upload_url 调 admin URL 时 404,
              geek 也明确拒绝过 "port 9000 is not allowed"。
        修法:走 cool 自己的 multipart 上传接口 /v1/cool/upload,直传 bytes,
              拿到 cdn.flova.ai 的官方 CDN URL,再传给 generate。
              彻底绕开"上游 fetch 我们外链失败"的链路风险。

        实测验证(2026-05-04):
          - 用 admin URL → cool 出图脑补,完全没用参考图
          - 用 cool CDN URL(本接口产出)→ actual_prompt 出现 <<<image_id>>>,
            出图调性 100% 贴合参考图(白色现代办公室 + 一只猫)
        """
        import base64 as _b64
        import aiohttp

        b64 = base64_data
        if isinstance(b64, str) and "," in b64 and b64.lstrip().lower().startswith("data:"):
            b64 = b64.split(",", 1)[1]
        try:
            raw = _b64.b64decode(b64)
        except Exception as e:
            raise RuntimeError(f"base64 解码失败: {e}")

        upload_url = (cool_base_url or "https://api.mjapi.cc.cd").rstrip("/") + "/v1/cool/upload"
        headers = {"Authorization": f"Bearer {api_key}"}

        # multipart/form-data
        form = aiohttp.FormData()
        form.add_field("file", raw, filename="ref.png", content_type="image/png")

        timeout = aiohttp.ClientTimeout(total=120, connect=15)
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=timeout) as session:
            async with session.post(upload_url, data=form, headers=headers) as resp:
                txt = await resp.text()
                if resp.status != 200:
                    raise RuntimeError(f"Cool 原生上传 HTTP {resp.status}: {txt[:300]}")
                try:
                    data = json.loads(txt)
                except Exception:
                    raise RuntimeError(f"Cool 上传响应非 JSON: {txt[:300]}")
                file_url = data.get("file_url")
                if not file_url:
                    raise RuntimeError(f"Cool 上传响应缺 file_url: {txt[:300]}")
                return file_url

    @staticmethod
    async def _cleanup_refs_on_admin(delete_tokens: list) -> None:
        """批量清理上传的参考图。失败不抛异常(服务器有 GC 兜底)"""
        if not delete_tokens:
            return
        import httpx as _httpx
        import os as _os
        admin_url = _os.getenv("ADMIN_SERVER_URL") or ImageService._ADMIN_SERVER_URL
        try:
            async with _httpx.AsyncClient(timeout=10, trust_env=False) as client:
                r = await client.post(
                    f"{admin_url.rstrip('/')}/api/refs/cleanup",
                    json={"delete_tokens": delete_tokens},
                )
                if r.status_code == 200:
                    data = r.json()
                    print(f"[INFO] 参考图清理: 删 {data.get('deleted', 0)}/{data.get('requested', 0)}")
        except Exception as e:
            print(f"[WARN] 参考图清理调用失败(GC 会兜底): {e}")

    @staticmethod
    def _resolve_wuyinkeji_endpoint(model: str) -> str:
        """根据模型名找到对应的速创端点路径

        v3.61.158 codex round7: 修原 .replace("_","-") 一上来就抹掉下划线导致
            "image_gpt" / "image_wan" / "image_grok" 这类 dict key 永远命不中,
            最后 fallback 成 "/api/async/image_image_gpt" 走错 endpoint。
        改成三次查询:原始小写 → _ 替 - → flat,任一命中即返。
        """
        raw_lower = (model or "").strip().lower()
        # 1. 原始小写完全匹配(catch 带 _ 的 key:image_gpt / image_wan / image_grok)
        if raw_lower in ImageService._WUYINKEJI_MODEL_ENDPOINT:
            return ImageService._WUYINKEJI_MODEL_ENDPOINT[raw_lower]
        # 2. _ 替 - 后匹配(catch 用户写 gpt_image_2 想匹 gpt-image-2 这种)
        dashed = raw_lower.replace("_", "-")
        if dashed in ImageService._WUYINKEJI_MODEL_ENDPOINT:
            return ImageService._WUYINKEJI_MODEL_ENDPOINT[dashed]
        # 3. 模糊匹配(去掉所有非字母数字 — catch gptimage2 / nanobananapro 这种)
        flat = "".join(c for c in raw_lower if c.isalnum())
        if flat in ImageService._WUYINKEJI_MODEL_ENDPOINT:
            return ImageService._WUYINKEJI_MODEL_ENDPOINT[flat]
        # fallback: 把 model_name 直接作为端点后缀(走未知 endpoint,通常会上游 404)
        return f"/api/async/image_{model}"

    @staticmethod
    async def _generate_with_wuyinkeji_async(
        api_key: str,
        base_url: str,
        model: str,
        prompt: str,
        aspect_ratio: str = "1:1",
        image_size: str = "1K",
        ref_urls: list = None,
        timeout: int = 1200,  # 默认 20 分钟轮询总超时(批量/4K 大图排队时够用)
    ) -> Optional[str]:
        """速创异步图片生成:提交 + 轮询 + 取结果 URL。"""
        import aiohttp
        import asyncio as _asyncio

        base_url = (base_url or "https://api.wuyinkeji.com").rstrip("/")
        endpoint = ImageService._resolve_wuyinkeji_endpoint(model)
        submit_url = f"{base_url}{endpoint}"
        detail_url = f"{base_url}/api/async/detail"

        # 按模型分流参数(实测不同端点支持的字段不一样)
        # 策略:默认统一走最高画质,用户不用管像素
        model_norm = (model or "").strip().lower().replace("_", "").replace("-", "")
        body = {"prompt": prompt}

        # 比例 aspect_ratio 兜底
        _aspect = aspect_ratio or "1:1"

        if "gptimage" in model_norm or endpoint.endswith("image_gpt"):
            # GPT-Image-2 (速创): size 是比例字符串(auto/1:1/16:9 等),不是像素尺寸
            # 支持: auto, 1:1, 3:2, 2:3, 16:9, 9:16, 4:3, 3:4, 21:9, 9:21, 1:3, 3:1, 2:1, 1:2
            _allowed = {"auto", "1:1", "3:2", "2:3", "16:9", "9:16",
                        "4:3", "3:4", "21:9", "9:21", "1:3", "3:1", "2:1", "1:2"}
            body["size"] = _aspect if _aspect in _allowed else "auto"
            if ref_urls:
                body["urls"] = ref_urls[:14]

        elif "wan" in model_norm:
            # Wan 2.6: size 用 "宽*高" 星号格式(不是 x)
            _wan_size_map = {
                "1:1":  "1280*1280",
                "16:9": "1664*928",
                "9:16": "928*1664",
                "4:3":  "1472*1104",
                "3:4":  "1104*1472",
                "3:2":  "1584*1056",
                "2:3":  "1056*1584",
            }
            body["size"] = _wan_size_map.get(_aspect, "1280*1280")
            if ref_urls:
                body["urls"] = ref_urls[:14]

        elif "grok" in model_norm:
            # Grok Imagine: 用 aspect_ratio(下划线) + image_urls(不是 urls)
            # 只支持 1:1 / 2:3 / 3:2 / 16:9 / 9:16
            _grok_allowed = {"1:1", "2:3", "3:2", "16:9", "9:16"}
            body["aspect_ratio"] = _aspect if _aspect in _grok_allowed else "1:1"
            if ref_urls:
                body["image_urls"] = ref_urls[:14]

        else:
            # nanoBanana 系列(base 不支持 size,pro/2 支持)
            body["aspectRatio"] = _aspect
            # nanoBanana base 端点不接受 size,其他都支持 4K
            if "nanobanana" in model_norm and model_norm not in ("nanobanana2", "nanobananapro"):
                # base 端点:不传 size
                pass
            else:
                body["size"] = "4K"
            if ref_urls:
                body["urls"] = ref_urls[:14]

        headers = {
            "Content-Type": "application/json",
            "Authorization": api_key,
        }

        timeout_cfg = aiohttp.ClientTimeout(total=60, connect=15)

        # 1. 提交任务
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=timeout_cfg) as session:
            async with session.post(submit_url, json=body, headers=headers) as resp:
                resp_text = await resp.text()
                if resp.status != 200:
                    raise RuntimeError(f"速创提交任务 HTTP {resp.status}: {resp_text[:500]}")
                try:
                    data = json.loads(resp_text)
                except Exception:
                    raise RuntimeError(f"速创提交响应非 JSON: {resp_text[:500]}")
                if data.get("code") not in (200, 0):
                    raise RuntimeError(f"速创提交失败: code={data.get('code')} msg={data.get('msg')}")
                task_id = (data.get("data") or {}).get("task_id") or (data.get("data") or {}).get("id")
                if not task_id:
                    raise RuntimeError(f"速创响应无 task_id: {resp_text[:500]}")
                print(f"[wuyinkeji] 已提交任务 id={task_id} model={model} endpoint={endpoint}")

        # 2. 轮询获取结果
        # 轮询策略:首 5s 内 1s 一次,之后每 3s 一次,总超时 timeout 秒
        poll_interval = 1.0
        poll_elapsed = 0.0
        max_wait = float(timeout)
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=30, connect=10)) as session:
            while poll_elapsed < max_wait:
                await _asyncio.sleep(poll_interval)
                poll_elapsed += poll_interval
                # 5 秒后切到 3s 间隔
                if poll_elapsed >= 5.0:
                    poll_interval = 3.0

                params = {"id": task_id, "key": api_key}
                try:
                    async with session.get(detail_url, params=params) as resp:
                        resp_text = await resp.text()
                        if resp.status != 200:
                            print(f"[wuyinkeji] 轮询 HTTP {resp.status},继续重试")
                            continue
                        try:
                            data = json.loads(resp_text)
                        except Exception:
                            continue
                        if data.get("code") not in (200, 0):
                            continue
                        task = data.get("data") or {}
                        status = task.get("status")
                        # status 语义(根据文档):0=初始化,1=进行中,2=成功,3=失败
                        if status == 2:
                            result = task.get("result") or []
                            if isinstance(result, list) and result:
                                image_url = result[0]
                                print(f"[wuyinkeji] 任务 {task_id} 成功,URL={image_url}")
                                return image_url
                            else:
                                raise RuntimeError(f"速创任务成功但 result 为空: {resp_text[:500]}")
                        elif status == 3:
                            fail_msg = task.get("message") or task.get("fail_reason") or "未知错误"
                            raise RuntimeError(f"速创任务失败: {fail_msg}")
                        else:
                            # 0/1 继续轮询
                            if int(poll_elapsed) % 15 == 0:
                                print(f"[wuyinkeji] 任务 {task_id} 状态 {status},已等待 {int(poll_elapsed)}s")
                            continue
                except RuntimeError:
                    raise
                except Exception as e:
                    # 网络瞬时错误继续重试
                    print(f"[wuyinkeji] 轮询异常(继续): {e}")
                    continue

        raise RuntimeError(f"速创任务 {task_id} 轮询超时({max_wait}s)")

    # ==================== 柏拉图(bltcy) 异步图片生成 ====================
    # 流程:POST 提交(?async=true) → 立即拿 task_id → 轮询 GET /v1/images/tasks/{task_id}
    # 跟同步接口的差别:提交瞬间断开,绕过 184s+ 长连接被中转切流的死角
    # 实测(2026-04-28):
    #   提交 ~2s 拿到 task_id;NOT_START 排队 30-90s;SUCCESS 后取 data.data.data[0].url
    @staticmethod
    async def _generate_with_bltcy_async(
        api_key: str,
        base_url: str,
        model: str,
        prompt: str,
        size: str = "3840x2160",
        reference_image_base64: Optional[str] = None,
        timeout: int = 1200,  # 20 分钟轮询总超时
        log_id: Optional[int] = None,  # 提交成功后立即把 task_id 写 llm_logs.remote_url(供"重下图片"反查)
    ) -> Optional[str]:
        """柏拉图异步图片生成:提交 + 轮询 + 取结果 URL。
        - 文生图: POST /v1/images/generations?async=true (JSON body)
        - 图生图: POST /v1/images/edits?async=true (multipart/form-data)
        响应:{"task_id": "xxx"}
        查询:GET /v1/images/tasks/{task_id}
        响应:{"data": {"status": "NOT_START|IN_PROGRESS|SUCCESS|FAILURE", "data": {...}}}
        """
        import aiohttp
        import asyncio as _asyncio
        import base64 as _base64

        base_url = (base_url or "https://api.bltcy.cn").rstrip("/").rstrip("/v1")
        if not base_url.endswith("/v1"):
            base_url = base_url + "/v1"

        headers_auth = {"Authorization": f"Bearer {api_key}"}
        has_ref = bool(reference_image_base64)

        # ============ 1. 提交任务 ============
        submit_timeout = aiohttp.ClientTimeout(total=60, connect=15)
        task_id: Optional[str] = None

        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=submit_timeout) as session:
            if has_ref:
                # 图生图 → /v1/images/edits?async=true (multipart)
                # reference_image_base64 是 data URI(data:image/png;base64,...)或纯 base64
                # 需要解码成原始 bytes 以 multipart 上传
                ref_b64 = reference_image_base64
                if ref_b64.startswith("data:"):
                    ref_b64 = ref_b64.split(",", 1)[1]
                try:
                    img_bytes = _base64.b64decode(ref_b64)
                except Exception as e:
                    raise RuntimeError(f"柏拉图参考图 base64 解码失败: {e}")

                form = aiohttp.FormData()
                form.add_field("model", model)
                form.add_field("prompt", prompt)
                # gpt-image-2 edits 不接受 size 字段(实测会忽略),传了也无害但精简起见省略
                form.add_field("image", img_bytes,
                               filename="ref.png",
                               content_type="image/png")
                submit_url = f"{base_url}/images/edits?async=true"
                print(f"[bltcy-async] 图生图提交: {submit_url} model={model}")
                async with session.post(submit_url, data=form, headers=headers_auth) as resp:
                    resp_text = await resp.text()
                    if resp.status != 200:
                        raise RuntimeError(f"柏拉图异步提交 HTTP {resp.status}: {resp_text[:500]}")
                    try:
                        data = json.loads(resp_text)
                    except Exception:
                        raise RuntimeError(f"柏拉图异步提交响应非 JSON: {resp_text[:500]}")
                    task_id = data.get("task_id") or (data.get("data") or {}).get("task_id")
                    if not task_id:
                        raise RuntimeError(f"柏拉图异步响应无 task_id: {resp_text[:500]}")
                    # 提交成功立刻写 llm_logs.remote_url(用前缀 bltcy-task: 标识)
                    # 这样即使后续轮询超时/backend 崩,前端"重下图片"按钮也能反查这个 task_id
                    if log_id:
                        await LogService.update_log_remote_url(
                            log_id=log_id,
                            remote_url=f"bltcy-task:{task_id}|edit"
                        )
            else:
                # 文生图 → /v1/images/generations?async=true (JSON)
                body = {
                    "model": model,
                    "prompt": prompt,
                    "size": size,
                    "n": 1,
                }
                submit_url = f"{base_url}/images/generations?async=true"
                print(f"[bltcy-async] 文生图提交: {submit_url} model={model} size={size}")
                async with session.post(submit_url, json=body, headers={**headers_auth, "Content-Type": "application/json"}) as resp:
                    resp_text = await resp.text()
                    if resp.status != 200:
                        raise RuntimeError(f"柏拉图异步提交 HTTP {resp.status}: {resp_text[:500]}")
                    try:
                        data = json.loads(resp_text)
                    except Exception:
                        raise RuntimeError(f"柏拉图异步提交响应非 JSON: {resp_text[:500]}")
                    task_id = data.get("task_id") or (data.get("data") or {}).get("task_id")
                    if not task_id:
                        raise RuntimeError(f"柏拉图异步响应无 task_id: {resp_text[:500]}")
                    # 同上,写 llm_logs.remote_url
                    if log_id:
                        await LogService.update_log_remote_url(
                            log_id=log_id,
                            remote_url=f"bltcy-task:{task_id}|generate"
                        )

        print(f"[bltcy-async] 已提交任务 task_id={task_id}")

        # ============ 2. 轮询任务状态 ============
        # 轮询策略:首 10s 内 1s 一次(快出图的小任务能秒回),之后 5s 一次
        # 实测 NOT_START 阶段约 30-90s,完成后立刻 SUCCESS
        query_url = f"{base_url}/images/tasks/{task_id}"
        poll_interval = 1.0
        poll_elapsed = 0.0
        max_wait = float(timeout)

        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=30, connect=10)) as session:
            while poll_elapsed < max_wait:
                await _asyncio.sleep(poll_interval)
                poll_elapsed += poll_interval
                if poll_elapsed >= 10.0:
                    poll_interval = 5.0

                try:
                    async with session.get(query_url, headers=headers_auth) as resp:
                        resp_text = await resp.text()
                        if resp.status != 200:
                            print(f"[bltcy-async] 轮询 HTTP {resp.status},继续重试")
                            continue
                        try:
                            data = json.loads(resp_text)
                        except Exception:
                            continue
                        task = data.get("data") or {}
                        status = (task.get("status") or "").upper()

                        if status == "SUCCESS":
                            # 取图片 URL: data.data.data[0].url
                            inner = (task.get("data") or {})
                            arr = inner.get("data") if isinstance(inner, dict) else None
                            if isinstance(arr, list) and arr:
                                first = arr[0]
                                image_url = first.get("url") if isinstance(first, dict) else None
                                if image_url:
                                    print(f"[bltcy-async] 任务 {task_id} 成功,URL={image_url[:80]}")
                                    return image_url
                                # 兜底:如果只有 b64_json
                                b64 = first.get("b64_json") if isinstance(first, dict) else None
                                if b64:
                                    import uuid as _uuid
                                    fn = f"image_{_uuid.uuid4().hex[:8]}.png"
                                    return await ImageService._save_base64_image(b64, fn)
                            raise RuntimeError(f"柏拉图任务成功但无 URL/base64: {resp_text[:500]}")

                        elif status == "FAILURE":
                            fail_msg = task.get("fail_reason") or task.get("message") or "未知错误"
                            raise RuntimeError(f"柏拉图任务失败: {fail_msg}")

                        else:
                            # NOT_START / IN_PROGRESS 继续轮询
                            if int(poll_elapsed) % 15 == 0:
                                progress = task.get("progress", "?")
                                print(f"[bltcy-async] 任务 {task_id} 状态 {status} progress={progress},已等待 {int(poll_elapsed)}s")
                            continue
                except RuntimeError:
                    raise
                except Exception as e:
                    print(f"[bltcy-async] 轮询异常(继续): {e}")
                    continue

        raise RuntimeError(f"柏拉图任务 {task_id} 轮询超时({max_wait}s)")

    # ==================== Cool API(mjapi.cc.cd)异步图片生成 ====================
    # 协议跟速创/柏拉图类似但鉴权和字段都不同:
    #   - Bearer Token in header(不是 body 里 key)
    #   - POST /v1/cool/generate 字段: prompt/model/ratio/files[{url,type,name}]
    #   - GET /v1/cool/task/{task_id} 状态: pending/running/success/failed (字符串)
    #   - 成功后从 result.url 取图片 URL
    #   - 参考图只接受 URL(不吃 base64),所以上层必须先上传 admin-server
    @staticmethod
    async def _generate_with_cool_async(
        api_key: str,
        base_url: str,
        model: str,
        prompt: str,
        aspect_ratio: str = "16:9",
        ref_urls: list = None,
        timeout: int = 1200,  # 默认 20 分钟,Cool 视频可能 30 分钟,但 C 端不接视频
    ) -> Optional[str]:
        """Cool API 异步图片生成:提交 + 轮询 + 取 result.url"""
        import aiohttp
        import asyncio as _asyncio

        # base_url 文档定义为 https://api.mjapi.cc.cd ,容错去尾斜杠
        base_url = (base_url or "https://api.mjapi.cc.cd").rstrip("/")
        submit_url = f"{base_url}/v1/cool/generate"

        # Cool 支持的比例:16:9 / 9:16 / 1:1 / 4:3,其他兜底 16:9
        # v3.61.158 round8: Cool 客服确认新增 2:1(VR equirectangular)、21:9
        _allowed_ratios = {"16:9", "9:16", "1:1", "4:3", "2:1", "21:9"}
        ratio_use = aspect_ratio if aspect_ratio in _allowed_ratios else "16:9"

        # v3.59.83/.84:参考图引用策略 — 在 prompt 前拼显式引用
        # 1) `@图片N`  → 触发 cool 隐式自动别名映射(actual_prompt 会出现 <<<image_N>>>)
        # 2) `Reference image #N — STRICTLY use ...`  → 跟隔壁 qianshan-server 一致的英文锚点,
        #    上游图片模型(尤其 OpenAI gpt-image-2)对英文锚点响应更强
        # 实测(2026-05-04):
        #   - 单纯 @图片N + admin URL  → cool 出图脑补,完全没用参考图(因为 admin 端口 9000 被拒拉)
        #   - cool 原生 upload + Reference image #N → actual_prompt 含 <<<image_id>>>,
        #     出图调性 100% 贴合参考图
        prompt_to_send = prompt or ""
        if ref_urls:
            ref_count = len(ref_urls[:14])
            zh_refs = " ".join(f"@图片{i+1}" for i in range(ref_count))
            en_lock = "\n★★★ REFERENCE IMAGE LOCK (HIGHEST PRIORITY) — strictly follow the attached reference image(s):\n"
            for i in range(ref_count):
                en_lock += f"  - Reference image #{i+1} — STRICTLY use this image's exact location/architecture/lighting/color palette/atmosphere, do NOT generate generic content; replicate the same visual feel.\n"
            prompt_to_send = f"{zh_refs} {prompt_to_send}".strip() + en_lock

        body = {
            "prompt": prompt_to_send,
            "model": model,
            "ratio": ratio_use,
        }
        if ref_urls:
            # files: [{url, type:"image"}] — 顺序对应 prompt 里的 @图片1 / @图片2 ...
            body["files"] = [{"url": u, "type": "image"} for u in ref_urls[:14]]

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }

        submit_timeout = aiohttp.ClientTimeout(total=60, connect=15)
        # 1. 提交任务
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=submit_timeout) as session:
            async with session.post(submit_url, json=body, headers=headers) as resp:
                resp_text = await resp.text()
                if resp.status != 200:
                    raise RuntimeError(f"Cool 提交任务 HTTP {resp.status}: {resp_text[:500]}")
                try:
                    data = json.loads(resp_text)
                except Exception:
                    raise RuntimeError(f"Cool 提交响应非 JSON: {resp_text[:500]}")
                task_id = data.get("task_id")
                if not task_id:
                    raise RuntimeError(f"Cool 响应无 task_id: {resp_text[:500]}")
                print(f"[cool] 已提交任务 id={task_id} model={model} ratio={ratio_use}")

        # 2. 轮询获取结果
        # 文档建议 3-5s 一次;前 5s 内 1s 一次抢早出图,之后 3s 一次
        detail_url = f"{base_url}/v1/cool/task/{task_id}"
        poll_interval = 1.0
        poll_elapsed = 0.0
        max_wait = float(timeout)
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=aiohttp.ClientTimeout(total=30, connect=10)) as session:
            while poll_elapsed < max_wait:
                await _asyncio.sleep(poll_interval)
                poll_elapsed += poll_interval
                if poll_elapsed >= 5.0:
                    poll_interval = 3.0
                try:
                    async with session.get(detail_url, headers=headers) as resp:
                        resp_text = await resp.text()
                        if resp.status != 200:
                            print(f"[cool] 轮询 HTTP {resp.status},继续重试")
                            continue
                        try:
                            data = json.loads(resp_text)
                        except Exception:
                            continue
                        status = (data.get("status") or "").lower()
                        if status == "success":
                            result = data.get("result") or {}
                            image_url = result.get("url")
                            if image_url:
                                print(f"[cool] 任务 {task_id} 成功,URL={image_url}")
                                return image_url
                            raise RuntimeError(f"Cool 任务成功但 result.url 为空: {resp_text[:500]}")
                        elif status == "failed":
                            err_msg = data.get("error") or "未知错误"
                            raise RuntimeError(f"Cool 任务失败: {err_msg}")
                        else:
                            # pending / running 继续轮询
                            if int(poll_elapsed) % 15 == 0:
                                print(f"[cool] 任务 {task_id} 状态 {status},已等待 {int(poll_elapsed)}s")
                            continue
                except RuntimeError:
                    raise
                except Exception as e:
                    print(f"[cool] 轮询异常(继续): {e}")
                    continue

        raise RuntimeError(f"Cool 任务 {task_id} 轮询超时({max_wait}s)")

    # ==================== geek GPT-Image-2 同步直发(自拼 JSON,绕开 OpenAI SDK) ====================
    # v3.59.72:专给 geek 的 gpt-image-2/-pro 用 — SDK 透传 extra_body.image 在 geek 上游被吞
    # 协议(geek 文档实测):
    #   - POST /v1/images/generations (Content-Type: application/json,Bearer 鉴权)
    #   - body: {model, prompt, n, size, image: [url1, url2, ...]}
    #   - response: {created, data: [{url, ...}]} 或 {data: [{b64_json, ...}]}
    @staticmethod
    async def _generate_with_geek_sync(
        api_key: str,
        base_url: str,
        model: str,
        prompt: str,
        size: str = "1920x1080",
        ref_urls: list = None,
        timeout: int = 600,
    ) -> Optional[str]:
        """geek GPT-Image-2 同步直发,完全控制 JSON body。"""
        import aiohttp

        base_url = (base_url or "").rstrip("/")
        # 容错:用户填的 base_url 可能带 /v1 也可能不带
        if base_url.endswith("/v1"):
            submit_url = f"{base_url}/images/generations"
        else:
            submit_url = f"{base_url}/v1/images/generations"

        body = {
            "model": model,
            "prompt": prompt,
            "n": 1,
            "size": size,
        }
        if ref_urls:
            body["image"] = list(ref_urls)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        # geek 实测同步出图 30~60s,留 timeout+30 兜底
        timeout_cfg = aiohttp.ClientTimeout(total=timeout + 30, connect=30)
        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=timeout_cfg) as session:
            async with session.post(submit_url, json=body, headers=headers) as resp:
                resp_text = await resp.text()
                if resp.status != 200:
                    raise RuntimeError(f"geek HTTP {resp.status}: {resp_text[:500]}")
                try:
                    data = json.loads(resp_text)
                except Exception:
                    raise RuntimeError(f"geek 响应非 JSON: {resp_text[:500]}")

                items = data.get("data") or []
                if not items:
                    raise RuntimeError(f"geek 响应 data 为空: {resp_text[:500]}")
                # v3.61.189:改用统一三态解析(补老缺口:dataURL 之前被当普通 URL 原样返回 → 下游炸)
                result = await ImageService._extract_openai_image_result(items[0], fmt_hint="png")
                if not result:
                    raise RuntimeError(f"geek 响应缺 url/b64_json: {resp_text[:500]}")
                print(f"[geek] OK result={result[:120] if isinstance(result, str) else result}")
                return result

    # v3.61.194:复刻 KKAI 官网 calculateExactSize(image.kkone.vip/app.js)— 按比例+档位精确算 size
    #   目标像素:4K=8294400 / 2K=4194304 / 1K=1048576;对齐 16;长边 clamp 3840;
    #   超 8294400 缩回(floor),低于 655360 放大(ceil)。实测与官网逐值一致(3:4=2480x3312 等)。
    @staticmethod
    def _kkai_calc_size(ratio: str, resolution: str = "4K") -> str:
        import math
        try:
            rw, rh = (float(x) for x in str(ratio).split(":"))
            r = rw / rh if rh else 1.0
        except Exception:
            r = 1.0
        target = 8294400 if resolution == "4K" else (4194304 if resolution == "2K" else 1048576)
        _jr = lambda x: math.floor(x + 0.5)   # JS Math.round 语义(Python round 是 banker's rounding,会差)
        height = _jr(math.sqrt(target / r) / 16) * 16
        width = _jr((height * r) / 16) * 16
        if width > 3840:
            width = 3840
            height = _jr((width / r) / 16) * 16
        if height > 3840:
            height = 3840
            width = _jr((height * r) / 16) * 16
        px = width * height
        if px > 8294400:
            s = math.sqrt(8294400 / px)
            width = math.floor(width * s / 16) * 16
            height = math.floor(height * s / 16) * 16
        elif px < 655360:
            s = math.sqrt(655360 / px)
            width = math.ceil(width * s / 16) * 16
            height = math.ceil(height * s / 16) * 16
        return f"{width}x{height}"

    # v3.61.189:OpenAI 兼容图片响应的统一三态解析(geek_sync / mooko_sync 共用)
    @staticmethod
    async def _extract_openai_image_result(first: dict, fmt_hint: str = "png", want_fmt: str = None) -> Optional[str]:
        """从 data[0] 取图,三态兜底:
          1) url 是 http(s) → 直接返回 URL
          2) url 是 data:image/...;base64,... → 存盘返本地路径
          3) b64_json → 存盘返本地路径
        v3.61.194:存盘扩展名按图片【实际字节 magic number】定,不盲信 fmt_hint。
        v3.61.195:want_fmt 指定时(用户要的格式),若 KKAI 实返格式 ≠ want_fmt,用 PIL 强转 —
          KKAI 实测 edits 在 4K 下返 png(忽略 output_format=jpeg),强转保证用户拿到要的格式。
          (geek 等不传 want_fmt → 不转,保持原行为)
        """
        if not isinstance(first, dict):
            return None
        import uuid, base64 as _b64
        _fh = (fmt_hint or "png").lower()
        _ext_hint = "jpg" if _fh in ("jpeg", "jpg") else ("webp" if _fh == "webp" else "png")

        def _ext_from_bytes(raw: bytes) -> Optional[str]:
            if not raw or len(raw) < 12:
                return None
            if raw[:2] == b"\xff\xd8":
                return "jpg"
            if raw[:8] == b"\x89PNG\r\n\x1a\n":
                return "png"
            if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
                return "webp"
            return None

        def _normalize_and_save(raw: bytes):
            """按实际字节定扩展名;若 want_fmt 指定且实际≠want_fmt,PIL 强转。返回 (b64_str, ext)。"""
            actual = _ext_from_bytes(raw)
            w = (want_fmt or "").lower()
            w = "jpg" if w in ("jpg", "jpeg") else w
            if w and w in ("jpg", "png", "webp") and actual and actual != w:
                try:
                    from PIL import Image
                    import io as _io
                    img = Image.open(_io.BytesIO(raw))
                    buf = _io.BytesIO()
                    if w == "jpg":
                        # JPEG 不支持透明;RGBA/LA/带透明的 P → 先铺白底合成,
                        # 否则 convert("RGB") 会把透明区变黑底(PIL 丢 alpha 取原 RGB)
                        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                            img = img.convert("RGBA")
                            _bg = Image.new("RGB", img.size, "white")
                            _bg.paste(img, mask=img.split()[-1])
                            img = _bg
                        else:
                            img = img.convert("RGB")
                        img.save(buf, format="JPEG", quality=92)
                    elif w == "webp":
                        img.save(buf, format="WEBP", quality=92)
                    else:
                        img.save(buf, format="PNG")
                    raw = buf.getvalue()
                    print(f"[img] 格式强转 {actual} → {w}(KKAI 实返与请求不符)")
                    return _b64.b64encode(raw).decode(), w
                except Exception as _ce:
                    print(f"[img] 格式转换失败,保留原格式 {actual}: {_ce}")
            return _b64.b64encode(raw).decode(), (actual or _ext_hint)

        url = first.get("url")
        if url:
            if isinstance(url, str) and url.startswith("data:"):
                try:
                    raw = _b64.b64decode(url.split(",", 1)[-1])
                    b64s, ext = _normalize_and_save(raw)
                    return await ImageService._save_base64_image(b64s, f"image_{uuid.uuid4().hex[:8]}.{ext}")
                except Exception:
                    return await ImageService._save_base64_image(url, f"image_{uuid.uuid4().hex[:8]}.{_ext_hint}")
            # v3.61.199:http 外链 + want_fmt 指定(KKAI/mooko 要特定格式)→ 下载 + magic 识别 + 强转,
            #   再存本地。KKAI 4K 的 url 模式返回的是【外部 http 链接】(图太大不内嵌 base64),
            #   之前直接返回 url → 上层下载时文件名写死 .png + 不走强转 → 成品图退化成 png 的真根因。
            #   (geek/cool 等不传 want_fmt → 仍直接返回 url,行为不变)
            if isinstance(url, str) and url.startswith("http") and want_fmt:
                try:
                    import aiohttp as _aiohttp
                    async with _aiohttp.ClientSession(connector=get_aiohttp_connector()) as _s:
                        async with _s.get(url, timeout=_aiohttp.ClientTimeout(total=180)) as _r:
                            if _r.status != 200:
                                raise RuntimeError(f"下载 HTTP {_r.status}")
                            raw = await _r.read()
                    # codex P1:校验下载内容确实是图片,防 CDN 返 403/HTML/错误页被当 jpg 存成坏图
                    if not _ext_from_bytes(raw):
                        raise RuntimeError("下载内容不是 jpg/png/webp 图片(可能外链过期或返错误页)")
                    b64s, ext = _normalize_and_save(raw)
                    return await ImageService._save_base64_image(b64s, f"image_{uuid.uuid4().hex[:8]}.{ext}")
                except Exception as _de:
                    print(f"[img] http url 下载强转失败,返回原 url: {_de}")
            return url
        b64 = first.get("b64_json")
        if b64:
            try:
                raw = _b64.b64decode(b64)
                b64s, ext = _normalize_and_save(raw)
                return await ImageService._save_base64_image(b64s, f"image_{uuid.uuid4().hex[:8]}.{ext}")
            except Exception:
                return await ImageService._save_base64_image(b64, f"image_{uuid.uuid4().hex[:8]}.{_ext_hint}")
        return None

    # v3.61.189:KKAI(mooko/kkone)OpenAI 兼容图片生成 — output_format 必需
    # v3.61.193:edits(图生图/溶图)改 multipart/form-data — 实测 JSON image 数组一律 400,只认 multipart 文件
    @staticmethod
    async def _generate_with_mooko_sync(
        api_key: str,
        base_url: str,
        model: str,
        prompt: str,
        size: str = "3840x2160",
        ref_images: list = None,   # base64/dataURL 列表;有则走 /images/edits multipart
        output_format: str = "jpeg",
        response_format: str = None,
        quality: str = None,
        moderation: str = None,
        timeout: int = 600,
    ) -> Optional[str]:
        """KKAI(mooko.ai / kkone)OpenAI 兼容图片生成。
          - output_format 必需(KKAI 强校验;png 生 4K 必失败 → 默认 jpeg)
          - 有参考图 → /images/edits(multipart/form-data,image[] 传文件;实测 JSON 一律 400)
          - 无参考图 → /images/generations(JSON)
          - 响应三态解析走 _extract_openai_image_result(url-http / url-dataURL / b64_json)
        """
        import aiohttp
        import base64 as _b64

        base_url = (base_url or "").rstrip("/")
        ref_images = [b for b in (ref_images or []) if b]
        use_edits = bool(ref_images)
        _endpoint = "/images/edits" if use_edits else "/images/generations"
        if base_url.endswith("/v1"):
            submit_url = f"{base_url}{_endpoint}"
        else:
            submit_url = f"{base_url}/v1{_endpoint}"

        # output_format 兜底:KKAI 只认 png/jpeg/webp;非法值回退 jpeg(png 4K 会失败)
        _fmt = (output_format or "jpeg").lower()
        if _fmt not in ("png", "jpeg", "webp"):
            _fmt = "jpeg"

        # v3.61.197:response_format 默认 url(作者建议;KKAI 实际默认 b64,b64_json 4K 大图易不稳/502)。
        #   KKAI 的 "url" 实测返回的是内嵌 base64 的 dataURL(非外部链接),三态解析照样走强转,格式不失控。
        _rf = (response_format or "url").lower()

        headers = {"Authorization": f"Bearer {api_key}"}
        timeout_cfg = aiohttp.ClientTimeout(total=timeout + 30, connect=30)
        print(f"[mooko] endpoint={submit_url} refs={len(ref_images)} size={size} fmt={_fmt}")

        async with aiohttp.ClientSession(connector=get_aiohttp_connector(), timeout=timeout_cfg) as session:
            if use_edits:
                # /images/edits:multipart/form-data,文本字段 + image[] 文件(每张参考图)
                form = aiohttp.FormData()
                form.add_field("model", model)
                form.add_field("prompt", prompt)
                form.add_field("n", "1")
                form.add_field("size", size)
                form.add_field("output_format", _fmt)
                form.add_field("response_format", _rf)
                if quality:
                    form.add_field("quality", quality)
                if moderation:
                    form.add_field("moderation", moderation)
                for idx, b in enumerate(ref_images):
                    try:
                        _s = b.split(",", 1)[-1] if (isinstance(b, str) and b.startswith("data:")) else b
                        raw = _b64.b64decode(_s)
                    except Exception as _dec_err:
                        raise RuntimeError(f"KKAI 参考图 base64 解码失败(第{idx+1}张): {_dec_err}")
                    form.add_field("image[]", raw, filename=f"ref{idx}.png", content_type="image/png")
                _ctx = session.post(submit_url, data=form, headers=headers)
            else:
                # /images/generations:JSON 文生图
                body = {"model": model, "prompt": prompt, "n": 1, "size": size, "output_format": _fmt, "response_format": _rf}
                if quality:
                    body["quality"] = quality
                if moderation:
                    body["moderation"] = moderation
                _ctx = session.post(submit_url, json=body, headers={**headers, "Content-Type": "application/json"})

            async with _ctx as resp:
                resp_text = await resp.text()
                if resp.status != 200:
                    raise RuntimeError(f"KKAI(mooko) HTTP {resp.status}: {resp_text[:500]}")
                try:
                    data = json.loads(resp_text)
                except Exception:
                    raise RuntimeError(f"KKAI 响应非 JSON: {resp_text[:500]}")
                items = data.get("data") or []
                if not items:
                    raise RuntimeError(f"KKAI 响应 data 为空: {resp_text[:500]}")
                result = await ImageService._extract_openai_image_result(items[0], fmt_hint=_fmt, want_fmt=_fmt)
                if not result:
                    raise RuntimeError(f"KKAI 响应缺 url/b64_json: {resp_text[:500]}")
                print(f"[mooko] OK result={result[:120] if isinstance(result, str) else result}")
                return result

    @staticmethod
    async def _generate_with_images_api(
        client: AsyncOpenAI,
        model: str,
        prompt: str,
        size: str,
        reference_image_base64: str = None,
        extra_params: dict = None,
        base_url: str = "",
        ratio: str = "1:1",
        provider_code: str = "",
    ) -> Optional[str]:
        """使用标准 OpenAI images.generate 接口生成图片

        分支策略(每个中转一套独立逻辑,不要混):
          - Seedream(火山方舟/灵芽 doubao):  size="2K", extra_body.image_urls (base64 数组)
          - 灵芽 GPT-Image-2:                 size 占位, extra_body.aspect_ratio + resolution + image
          - 灵芽 nano-banana 系列:            size 占位, extra_body.aspect_ratio + image_size + image
          - 柏拉图(bltcy) GPT-Image-2:        size=像素枚举(3840x2160 等), 顶层 image 字段
          - 其他(走老的注册表逻辑作 fallback)

        参考图固定按 16:9 + 4K 处理(原图大多 16:9,避免裁切失真;速创那套独立另算)
        """
        prompt = sanitize_unicode(prompt)

        model_lower = model.lower()
        base_url_lower = (base_url or "").lower()
        # v3.59.66:provider_code 优先,base_url 字符串包含作 fallback(过渡期兼容老配置)
        # 老的纯字符串包含留着是因为有些老用户配置 provider_code 可能还没补齐(数据迁移期)
        provider = (provider_code or "").lower()
        is_lingya = (provider == "lingya") or ("lingyaai" in base_url_lower)
        is_bltcy  = (provider == "bltcy")  or ("bltcy" in base_url_lower)
        # v3.59.70:geek 中转 — 跟 bltcy 同协议(/v1/images/generations JSON,顶层 image 数组)
        # 但 size 用 geek 文档原生标注的 1920x1080 / 1080x1920(2K),不堆 4K(更快+省钱)
        is_geek   = (provider == "geek")   or ("geek" in base_url_lower) or ("geeknow" in base_url_lower)
        # v3.61.74:1Day 多模型聚合中转 — base_url 是 daydreaming.work
        # 文档说 GPT-Image-2 最大分辨率 2K(API Beta),宽高比 3:1 ~ 1:3,中转用 OpenAI 标准 images.generate 协议
        is_1day   = (provider == "1day") or ("daydreaming.work" in base_url_lower)
        has_ref   = bool(reference_image_base64)

        extra_body = {}

        # ============ 分支 1: Seedream(豆包系) ============
        if "seedream" in model_lower:
            # v3.61.158: 默认 "2K" 预设让模型自适应比例;但 2:1 全景必须显式给像素
            # v3.61.158 codex round5: 5.0-lite 文档不含严格 2:1(只有 21:9),且像素 size 有 2K 最小限制,
            #   2048x1024(≈2.1M 像素)低于 2K 档,大概率 400 — 这里只对非 lite 才传像素
            #   lite 通常已经被 generate_panorama 白名单拒掉了,这里只是兜底防直调
            _is_lite = "lite" in model_lower
            if ratio == "2:1":
                if _is_lite:
                    # 不该走到这条(白名单已拒)— 真撞上就降级 21:9 + 2K 防上游 400
                    size = "21:9"
                    extra_body["resolution"] = "2K"
                    print(f"[WARN] seedream-*-lite 不支持严格 2:1,降级 21:9 + 2K(非标准 VR,可能宫格对位偏)")
                else:
                    size = "2048x1024"
                    print(f"[INFO] seedream 2:1 全景: 用像素 size={size}")
            else:
                size = "2K"
            extra_body["use_pre_llm"] = True
            extra_body["watermark"] = False
            if has_ref:
                # data URL 格式
                # v3.61.162: 5.0 系列(含 lite,如 doubao-seedream-5-0-260128)官方文档参数名是 `image`
                #            不是 4.x 的 `image_urls` — 用 4.x 字段名传给 5.0 上游会 silent ignore(图生成但参考图无效)
                #            参考:https://www.volcengine.com/docs/6791/1541523
                #   保守只切 5.0 系列;4.0/4.5 维持 image_urls(已验过能用)
                _is_5x = ("5-0" in model_lower or "5.0" in model_lower or "5_0" in model_lower)
                if _is_5x:
                    extra_body["image"] = [reference_image_base64]
                    print(f"[INFO] 图生图(seedream 5.x) ref count=1 字段=image")
                else:
                    extra_body["image_urls"] = [reference_image_base64]
                    print(f"[INFO] 图生图(seedream 4.x) ref count=1 字段=image_urls")

        # ============ 分支 2: 柏拉图(bltcy) GPT-Image-2 / nano-banana ============
        elif is_bltcy and ("gpt-image" in model_lower or "nano-banana" in model_lower):
            # 柏拉图标准 OpenAI images.generate,只认 model/prompt/size/image
            # 参考图模式强制 16:9 4K(原图大多 16:9)
            if has_ref:
                size = "3840x2160"
            else:
                bltcy_size = {
                    "1:1":  "2048x2048",
                    "16:9": "3840x2160",
                    "9:16": "2160x3840",
                    "4:3":  "3840x2160",   # 文档无 4:3,退 16:9
                    "3:4":  "2160x3840",   # 文档无 3:4,退 9:16
                }
                size = bltcy_size.get(ratio, "3840x2160")
            if has_ref:
                # 柏拉图的 image 字段是顶层(不是 extra_body),放进 kwargs
                # OpenAI SDK 的 images.generate 不认 image,要走 extra_body
                # 实测:柏拉图也兼容 extra_body 透传
                extra_body["image"] = [reference_image_base64]
                print(f"[INFO] 图生图(bltcy {model}) size={size} ref count=1")
            else:
                print(f"[INFO] 文生图(bltcy {model}) size={size}")

        # ============ 分支 2.5: 1Day(daydreaming.work) GPT-Image-2 / nano-banana ============
        # v3.61.74: 1Day 文档说 GPT-Image-2 最大 2K(API Beta),宽高比 3:1 ~ 1:3
        # 协议:走标准 OpenAI images.generate(同 bltcy),顶层 image 字段传参考图(extra_body 透传)
        # 分辨率严格上限 2K,不堆 4K(中转成本高 + 响应慢,更不必要)
        # v3.61.75 修复:1Day 中转 body 上限实测较紧,参考图原图 > 5MB 会被 HTTP 413 拒
        #               这里在传参前用 PIL resize + JPEG 重压(长边 1280,quality 80,~500KB)
        elif is_1day and ("gpt-image" in model_lower or "nano-banana" in model_lower):
            # 1Day 2K 像素映射 — 长边 2048
            _1day_size = {
                "1:1":  "2048x2048",
                "16:9": "2048x1152",
                "9:16": "1152x2048",
                "4:3":  "2048x1536",
                "3:4":  "1536x2048",
                "3:1":  "2048x683",   # 文档支持的最大长宽比
                "1:3":  "683x2048",
                "21:9": "2048x878",   # 电影宽幅
                "9:21": "878x2048",
                "2:1":  "2048x1024",  # v3.61.147: VR equirectangular 全景图
                "1:2":  "1024x2048",
            }
            if has_ref:
                # v3.61.77: 1Day 中转 GPT-Image-2 跟 geek 同款,base64 直传上游不识别(实测会卡 60s 超时)
                # 必须先上传 admin-server 换公网 URL,再把 URL 列表传给 1Day
                # 顺便:上传前用 PIL resize + JPEG q80 把参考图压到 < 500KB(admin 上传也更快)
                _ref_for_1day = ImageService._resize_data_url_for_1day(reference_image_base64, max_side=1280, jpeg_quality=80)
                if _ref_for_1day is None:
                    _ref_for_1day = reference_image_base64
                _orig_kb = len(reference_image_base64) // 1024
                _new_kb = len(_ref_for_1day) // 1024

                import logging as _lg
                _logger_1day = _lg.getLogger(__name__)

                # 上传 admin 换 URL
                try:
                    _b64_only = _ref_for_1day.split(",", 1)[-1] if "," in _ref_for_1day else _ref_for_1day
                    ref_url, _del_token = await ImageService._upload_ref_to_admin(_b64_only)
                    _logger_1day.info(f"[1Day] 参考图已上传 admin: {ref_url[:120]}")
                    # 1Day 接 URL 列表(同 geek)
                    extra_body["image"] = [ref_url]
                    size = _1day_size.get(ratio, "2048x1152")
                    _logger_1day.info(f"[1Day] 图生图 {model} size={size} ref: {_orig_kb}KB → {_new_kb}KB → URL")
                except Exception as _up_err:
                    _logger_1day.warning(f"[1Day] 参考图上传 admin 失败,fallback 传 base64: {_up_err}")
                    extra_body["image"] = [_ref_for_1day]
                    size = _1day_size.get(ratio, "2048x1152")
                    _logger_1day.info(f"[1Day] 图生图 {model} size={size} ref base64 兜底 {_new_kb}KB")
            else:
                size = _1day_size.get(ratio, "2048x1152")
                import logging as _lg
                _lg.getLogger(__name__).info(f"[1Day] 文生图 {model} size={size}")

        # ============ 分支 2.1: geek GPT-Image-2 — 已迁到 geek_sync 自拼 JSON 路径(v3.59.72)
        # 此处保留兜底:如果上游路由没识别(api_style 没强制成 geek_sync),走文生图模式不带参考图,免崩
        elif is_geek and ("gpt-image" in model_lower):
            geek_size = {
                "1:1":  "2048x2048",
                "16:9": "1920x1080",
                "9:16": "1080x1920",
                "4:3":  "1536x1024",
                "3:4":  "1024x1536",
            }
            size = geek_size.get(ratio, "1920x1080")
            print(f"[WARN] 图生图(geek {model}) 走到了 SDK fallback,本应走 geek_sync。size={size},ref count={1 if has_ref else 0}")
            # 不再透传 extra_body.image — SDK 路径已证实不可靠
            # 真要传参考图必须走 geek_sync 分支(api_style=geek_sync)

        # ============ 分支 3: 灵芽 GPT-Image-2 ============
        elif is_lingya and "gpt-image" in model_lower:
            # 灵芽私有: aspect_ratio + resolution + image
            if has_ref:
                aspect = "16:9"
                resolution = "4K"
            else:
                aspect = ratio if ratio in ("1:1","16:9","9:16","4:3","3:4") else "16:9"
                resolution = "4K" if aspect in ("16:9", "9:16") else "1K"  # 1:1/4:3/3:4 强制 1K
            extra_body["aspect_ratio"] = aspect
            extra_body["resolution"] = resolution
            if has_ref:
                extra_body["image"] = [reference_image_base64]
            size = "1024x1024"  # 占位,灵芽看 extra_body
            print(f"[INFO] {'图生' if has_ref else '文生'}图(lingya gpt-image-2) ratio={aspect} res={resolution}")

        # ============ 分支 4: 灵芽 nano-banana 系列 ============
        elif is_lingya and "nano-banana" in model_lower:
            # 灵芽 nano-banana-pro / -2 用 image_size,base 版不支持分辨率
            if has_ref:
                aspect = "16:9"
                resolution = "4K"
            else:
                aspect = ratio if ratio in ("1:1","16:9","9:16","4:3","3:4") else "16:9"
                resolution = "4K" if aspect in ("16:9", "9:16") else "1K"
            extra_body["aspect_ratio"] = aspect
            # pro / 2 才有 image_size,基础版没有
            if "nano-banana-pro" in model_lower or "nano-banana-2" in model_lower:
                extra_body["image_size"] = resolution
            if has_ref:
                extra_body["image"] = [reference_image_base64]
            size = "1024x1024"
            print(f"[INFO] {'图生' if has_ref else '文生'}图(lingya {model}) ratio={aspect} res={resolution if 'nano-banana-pro' in model_lower or 'nano-banana-2' in model_lower else 'N/A'}")

        # ============ 分支 5: fallback 通用 ============
        else:
            if has_ref:
                adapter = ImageService._find_reference_adapter(model)
                if adapter:
                    value = [reference_image_base64] if adapter["value_type"] == "array" else reference_image_base64
                    extra_body[adapter["field"]] = value
                    print(f"[INFO] 图生图(fallback) model={model}, field={adapter['field']}")
                else:
                    print(f"[WARN] 模型 {model} 未在适配器注册表中,参考图被忽略")

        # 合并配置里的扩展参数(用户在 admin 后台 extra_params 设的会覆盖默认)
        if extra_params:
            RESERVED = {"image_ratio", "request_timeout", "download_timeout", "retry_count",
                        "image_size", "image_style"}
            for k, v in extra_params.items():
                if k in RESERVED or v is None:
                    continue
                extra_body[k] = v  # 用户设置覆盖默认
            print(f"[INFO] extra_body 最终: {list(extra_body.keys())}")

        kwargs = dict(model=model, prompt=prompt, n=1, size=size)
        if extra_body:
            kwargs["extra_body"] = extra_body

        # v3.61.76: 1Day / nano-banana 等中转上游不稳,加自动 retry(最多 2 次重试,共 3 次尝试)
        # 失败原因写 logger.warning(替换 print),app.log 能看到具体异常类型
        import logging as _lg
        _logger = _lg.getLogger(__name__)
        # 哪些 provider 需要 retry(慢/抽风) — 1Day / lingya / bltcy 都加上,稳产 provider 不加
        is_flaky = is_1day or is_lingya or is_bltcy or is_geek
        max_attempts = 3 if is_flaky else 1
        last_err = None
        for attempt in range(1, max_attempts + 1):
            try:
                response = await client.images.generate(**kwargs)

                if not response.data or len(response.data) == 0:
                    _logger.warning(f"[images.generate] 返回空结果 model={model} attempt={attempt}/{max_attempts}")
                    if attempt < max_attempts:
                        continue
                    return None

                image_data = response.data[0]

                # 优先处理 URL 格式
                if hasattr(image_data, 'url') and image_data.url:
                    if attempt > 1:
                        _logger.info(f"[images.generate] 第 {attempt} 次尝试成功 model={model}")
                    return image_data.url

                # 处理 base64 格式
                if hasattr(image_data, 'b64_json') and image_data.b64_json:
                    import uuid
                    filename = f"image_{uuid.uuid4().hex[:8]}.png"
                    if attempt > 1:
                        _logger.info(f"[images.generate] 第 {attempt} 次尝试成功(b64) model={model}")
                    return await ImageService._save_base64_image(image_data.b64_json, filename)

                _logger.warning(f"[images.generate] data[0] 既无 url 也无 b64_json model={model}")
                if attempt < max_attempts:
                    continue
                return None
            except Exception as e:
                # 异常类型 + message
                last_err = e
                _logger.warning(f"[images.generate] 调用失败 model={model} attempt={attempt}/{max_attempts}: {type(e).__name__}: {e}")
                if attempt < max_attempts:
                    # 简单退避:第 2 次等 2s,第 3 次等 5s
                    import asyncio as _asyncio
                    await _asyncio.sleep(2 if attempt == 1 else 5)
                    continue
                # 最后一次也失败,落地
                return None
        return None
    
    @staticmethod
    async def _generate_with_chat_completion(
        client: AsyncOpenAI,
        model: str,
        prompt: str,
        size: str,
        reference_image_base64: str = None
    ) -> Optional[str]:
        """使用 chat.completions 接口生成图片（适用于智谱 CogView、Gemini 等）"""
        # 清理 prompt 中的 Unicode 特殊字符
        prompt = sanitize_unicode(prompt)
        try:
            # 构建请求体
            if reference_image_base64:
                # 有参考图时使用多模态消息格式
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": reference_image_base64}}
                        ]
                    }
                ]
            else:
                messages = [{"role": "user", "content": prompt}]
            
            # 某些模型需要额外的参数
            extra_body = {}
            if "cogview" in model.lower() or "glm" in model.lower():
                # 智谱 CogView 模型
                extra_body = {"size": size}
            
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                extra_body=extra_body if extra_body else None
            )
            
            # 打印完整响应用于调试
            print(f"[DEBUG] chat.completions 原始响应: {response}")
            
            # 修复2：处理非JSON响应（如果 response 是字符串而不是对象）
            if isinstance(response, str):
                print(f"[ERROR] API 返回了非预期的字符串响应（可能是HTML页面），请检查API配置")
                print(f"[ERROR] 响应内容: {response[:500] if len(response) > 500 else response}")
                raise Exception("API 返回了非预期格式的响应，请检查模型配置的 API 地址和密钥是否正确")
            
            if not response.choices or len(response.choices) == 0:
                print("[WARN] chat.completions 返回空结果")
                return None
            
            message = response.choices[0].message
            content = message.content
            
            # 调试：打印 message 的所有属性
            print(f"[DEBUG] message 对象属性: content={content[:200] if content else 'None'}, "
                  f"has_image_url={hasattr(message, 'image_url')}, "
                  f"has_tool_calls={hasattr(message, 'tool_calls')}, "
                  f"has_function_call={hasattr(message, 'function_call')}")
            
            # 方式0：检查 message.image_url 属性（某些模型直接返回图片URL）
            if hasattr(message, 'image_url') and message.image_url:
                image_url = message.image_url
                if isinstance(image_url, str):
                    print(f"[DEBUG] 从 message.image_url 获取到图片URL: {image_url[:100]}...")
                    return image_url
                elif isinstance(image_url, dict) and 'url' in image_url:
                    print(f"[DEBUG] 从 message.image_url.url 获取到图片URL: {image_url['url'][:100]}...")
                    return image_url['url']
            
            # 方式1：content 直接是 URL
            if content and content.startswith("http"):
                print(f"[DEBUG] 从 content 直接获取到URL")
                return content.strip()
            
            # 方式2：content 是 JSON 格式，包含图片 URL
            if content and (content.startswith("{") or content.startswith("[")):
                try:
                    data = json.loads(content)
                    print(f"[DEBUG] 解析 content JSON: {data}")
                    # 尝试各种可能的字段
                    if isinstance(data, dict):
                        for key in ["url", "image_url", "image", "data", "imageUrl", "img_url", "imgUrl"]:
                            if key in data and data[key]:
                                url = data[key]
                                if isinstance(url, str) and url.startswith("http"):
                                    print(f"[DEBUG] 从 JSON 字段 {key} 获取到URL")
                                    return url
                                # 处理嵌套对象
                                if isinstance(url, dict) and 'url' in url:
                                    return url['url']
                    elif isinstance(data, list) and len(data) > 0:
                        if isinstance(data[0], str) and data[0].startswith("http"):
                            return data[0]
                        if isinstance(data[0], dict) and "url" in data[0]:
                            return data[0]["url"]
                except json.JSONDecodeError as e:
                    print(f"[DEBUG] JSON 解析失败: {e}")
            
            # 方式3：content 包含 markdown 格式的图片链接 ![alt](url)
            if content and "![" in content and "](" in content:
                import re
                # 修复1：首先检查是否包含 base64 data URL 格式的图片
                # 格式: ![xxx](data:image/jpeg;base64,/9j/4AAQ...)
                data_url_pattern = r'!\[.*?\]\((data:image/[^;]+;base64,[A-Za-z0-9+/=]+)\)'
                data_match = re.search(data_url_pattern, content)
                if data_match:
                    data_url = data_match.group(1)
                    print(f"[DEBUG] 从 markdown 格式获取到 base64 data URL")
                    # 提取 base64 数据并保存为文件
                    # data:image/jpeg;base64,/9j/4AAQ...
                    header, b64_data = data_url.split(',', 1)
                    # 从 header 提取格式: data:image/jpeg -> jpeg
                    fmt = header.split('/')[1].split(';')[0]  # jpeg, png, webp etc
                    import uuid
                    filename = f"image_{uuid.uuid4().hex[:8]}.{fmt}"
                    image_path = await ImageService._save_base64_image(b64_data, filename)
                    if image_path:
                        print(f"[DEBUG] base64 图片已保存: {image_path}")
                        return image_path
                
                # 然后检查普通 http/https URL
                match = re.search(r'!\[.*?\]\((https?://[^\)]+)\)', content)
                if match:
                    print(f"[DEBUG] 从 markdown 格式获取到URL")
                    return match.group(1)
            
            # 方式4：content 是纯文本，尝试提取其中的 URL
            if content:
                import re
                urls = re.findall(r'https?://[^\s<>"\']+', content)
                if urls:
                    print(f"[DEBUG] 从纯文本提取到URL: {urls[0][:100]}...")
                    return urls[0]
            
            # 方式5：检查是否有 tool_calls（某些模型通过工具调用返回图片）
            if hasattr(message, 'tool_calls') and message.tool_calls:
                print(f"[DEBUG] 发现 tool_calls: {message.tool_calls}")
                for tool_call in message.tool_calls:
                    if hasattr(tool_call, 'function') and tool_call.function:
                        func = tool_call.function
                        if hasattr(func, 'arguments') and func.arguments:
                            try:
                                args = json.loads(func.arguments)
                                for key in ["url", "image_url", "image", "imageUrl"]:
                                    if key in args and args[key]:
                                        url = args[key]
                                        if isinstance(url, str) and url.startswith("http"):
                                            print(f"[DEBUG] 从 tool_call 参数获取到URL")
                                            return url
                            except json.JSONDecodeError:
                                pass
            
            # 方式6：检查 response 中是否有 images 字段（某些API格式）
            if hasattr(response, 'images') and response.images:
                print(f"[DEBUG] 发现 response.images: {response.images}")
                for img in response.images:
                    if isinstance(img, str) and img.startswith("http"):
                        return img
                    if isinstance(img, dict):
                        for key in ["url", "image_url", "image", "data"]:
                            if key in img and img[key]:
                                url = img[key]
                                if isinstance(url, str) and url.startswith("http"):
                                    return url
            
            print(f"[WARN] 无法从 chat.completions 响应中提取图片 URL。content={content[:500] if content else 'None'}")
            return None
            
        except Exception as e:
            print(f"[ERROR] chat.completions 调用失败: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    async def delete_image_file(image_url: str) -> bool:
        """删除本地图片文件"""
        try:
            if not image_url or image_url.startswith("http"):
                return True  # 远程 URL 无需删除
            
            # ★ v3.59.46:用 resolve_db_path,自动按分类走 media_dir / data_dir
            # 老版本写死 get_data_dir() 在自定义媒体路径下删不掉文件
            if image_url.startswith(("data/images/", "/data/images/")):
                file_path = resolve_db_path(image_url)
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                    return True
            return False
        except Exception as e:
            print(f"[WARN] 删除图片文件失败: {e}")
            return False
