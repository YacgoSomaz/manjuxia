import os
import sys
import asyncio
import logging
import logging.handlers
import datetime
import traceback
from fastapi import FastAPI, HTTPException, Request


def setup_windows_encoding():
    """在 Windows 上设置 UTF-8 编码，解决 GBK 无法编码特殊 Unicode 字符的问题"""
    if sys.platform == 'win32':
        # 设置控制台输出编码为 UTF-8
        # 这样 print() 和 sys.stdout.write() 都会使用 UTF-8
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, OSError):
            # 如果 reconfigure 不可用，尝试其他方法
            pass
        
        # 设置环境变量，影响子进程的默认编码
        os.environ['PYTHONIOENCODING'] = 'utf-8'
        
        # 设置默认文件编码
        try:
            import locale
            locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
        except (ImportError, locale.Error):
            pass


# 在最开始设置 Windows 编码
setup_windows_encoding()
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from utils.paths import get_data_dir


class BeijingFormatter(logging.Formatter):
    """使用北京时间（UTC+8）的日志格式化器"""
    def formatTime(self, record, datefmt=None):
        ct = datetime.datetime.fromtimestamp(record.created, tz=datetime.timezone(datetime.timedelta(hours=8)))
        if datefmt:
            return ct.strftime(datefmt)
        return ct.strftime('%Y-%m-%d %H:%M:%S')


def setup_logging():
    """配置全局日志系统"""
    # 确保数据目录存在
    data_dir = get_data_dir()
    os.makedirs(data_dir, exist_ok=True)
    
    log_file = os.path.join(data_dir, 'app.log')
    formatter = BeijingFormatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
    
    # 文件处理器：最大10MB，保留3个备份
    file_handler = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=10*1024*1024, backupCount=3, encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)
    
    # 控制台处理器 - 指定 UTF-8 编码避免 Windows GBK 编码错误
    # Windows 中文系统默认使用 GBK 编码，无法处理某些 Unicode 字符（如 \u2005）
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    # 尝试设置 UTF-8 编码，如果失败则使用 errors='replace'
    try:
        if hasattr(console_handler.stream, 'reconfigure'):
            console_handler.stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    
    # 配置 root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    return log_file


# 在最开始配置日志（在导入其他模块之前）
log_file_path = setup_logging()
logger = logging.getLogger(__name__)

# v3.61.196:backend 版本号
#   - 打包环境(sys.frozen):用 backend-server.spec 注入的 _version.py(本次打包的真实版本)
#   - 开发环境:实时读 package.json(避免本地遗留的 _version.py 显示旧版本 — codex P2)
def _resolve_app_version():
    if getattr(sys, "frozen", False):
        try:
            from _version import APP_VERSION as _v
            return _v
        except Exception:
            return "unknown"
    try:
        import json as _json
        _pkg = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "package.json")
        with open(_pkg, encoding="utf-8") as _f:
            return _json.load(_f).get("version", "dev")
    except Exception:
        return "dev"

APP_VERSION = _resolve_app_version()

# 记录启动日志
logger.info("=" * 50)
logger.info("后端服务启动中...")
logger.info(f"后端版本: {APP_VERSION}")
# v3.61.198:PIL JPEG 编码自检 —— 打包漏 PIL 插件会导致 save("JPEG") 失败(KKAI 强转 jpg 退化成 png 的根因)
try:
    from PIL import Image as _PILImage
    import io as _pio
    _buf = _pio.BytesIO()
    _PILImage.new("RGB", (8, 8)).save(_buf, "JPEG")
    logger.info(f"PIL JPEG 编码自检: OK ({len(_buf.getvalue())} bytes)")
except Exception as _pe:
    logger.error(f"PIL JPEG 编码自检: FAIL — {type(_pe).__name__}: {_pe}(KKAI/自由生图强转 jpg 会退化成 png)")
logger.info(f"Python 版本: {sys.version}")
logger.info(f"工作目录: {os.getcwd()}")
logger.info(f"数据目录: {get_data_dir()}")
logger.info(f"日志文件: {log_file_path}")
logger.info("=" * 50)

from database.db import init_db
from api.novels import router as novels_router
from api.templates import router as templates_router
from api.llm_configs import router as llm_configs_router
from api.extraction import router as extraction_router
from api.scripts import router as scripts_router
from api.storyboards import router as storyboards_router
from api.pipeline import router as pipeline_router
from api.llm_logs import router as llm_logs_router
from api.video import router as video_router
from api.subtitle_removal import router as subtitle_removal_router
from api.settings import router as settings_router
from api.queue import router as queue_router
from api.team import router as team_router
from api.license_context import router as license_context_router
from utils.local_access import require_local_business_access
qianshan_lab_router = None
if os.getenv("WANSHAN_ENABLE_QIANSHAN_LAB", "").strip() == "1":
    from api.qianshan_lab import router as qianshan_lab_router
# v3.61.28: 封面生成实验模块,完全解耦,删 api/cover.py + 这两行就还原
from api.cover import router as cover_router
# v3.61.92: 其他功能 (溶图)
from api.extra import router as extra_router
# v3.61.x: 俯视人物调度图首尾链路，与千山同源的独立后端模块。
from api.topview_demo import router as topview_demo_router
# v3.61.383: 补镜视频任务与首尾帧链路。
from api.supplement_video import router as supplement_video_router
from services import subtitle_removal_service
from services.log_service import LogService


async def run_log_cleanup_once():
    """启动时执行一次日志清理 + 僵尸任务回收"""
    try:
        await LogService.cleanup_old_logs()
        logger.info("日志清理完成")
    except Exception as e:
        logger.error(f"日志清理失败: {e}")

    try:
        # 回收上次异常关闭留下的 running 僵尸任务(超过 10 分钟未完成视为已中断)
        count = await LogService.mark_stale_running_as_error(threshold_minutes=10)
        if count > 0:
            logger.info(f"僵尸任务回收完成: {count} 条")
    except Exception as e:
        logger.error(f"僵尸任务回收失败: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # v3.61.70: 启动时生成 session secret(写文件,Electron 读了通过 IPC 给前端)
    # 防 curl localhost:8000 直接调本地接口拿模板
    try:
        from utils.local_secret import get_or_create_session_secret
        get_or_create_session_secret()
    except Exception as e:
        logger.warning(f"session secret 初始化失败(本机签名校验可能不生效): {e}")

    # 启动时初始化数据库
    logger.info("开始初始化数据库...")
    try:
        await init_db()
        logger.info("数据库初始化成功")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}\n{traceback.format_exc()}")
        raise

    try:
        from services.llm_service import LLMService
        migrated_keys = await LLMService.migrate_local_api_keys()
        if migrated_keys:
            logger.info("已迁移 %s 个本地模型密钥到 Windows DPAPI", migrated_keys)
    except Exception as e:
        logger.error(f"本地模型密钥迁移失败: {e}")

    try:
        from services.wanshan_prompt_seed import seed_prompt_templates
        await seed_prompt_templates()
    except Exception as e:
        logger.error(f"万山本地提示词种子导入失败: {e}")
    
    # 初始化字幕去除任务表
    try:
        await subtitle_removal_service.init_table()
        logger.info("字幕去除任务表初始化成功")
    except Exception as e:
        logger.error(f"字幕去除任务表初始化失败: {e}\n{traceback.format_exc()}")
    
    # 确保字幕去除相关目录存在
    data_dir = get_data_dir()
    try:
        os.makedirs(os.path.join(data_dir, "videos", "subtitle_removed"), exist_ok=True)
        os.makedirs(os.path.join(data_dir, "videos", "uploads"), exist_ok=True)
        logger.info("字幕去除目录创建成功")
    except Exception as e:
        logger.error(f"创建字幕去除目录失败: {e}")
    
    logger.info("万山离线策略:跳过远端模板同步、远端模型配置同步和预置模板清空")
    
    # 自动修正 Gemini 3 系列的 api_style:必须走 gemini_native 否则会被网关 8K 截断
    try:
        from database.db import get_db
        db = await get_db()
        cursor = await db.execute(
            "UPDATE llm_configs SET api_style = 'gemini_native' "
            "WHERE (model_name LIKE '%gemini-3%' OR model_name LIKE '%gemini-2.5%') "
            "AND (api_style IS NULL OR api_style != 'gemini_native')"
        )
        fixed = cursor.rowcount
        await db.commit()
        await db.close()
        if fixed > 0:
            logger.info(f"自动将 {fixed} 条 Gemini 配置改为 gemini_native(避免 8K 截断)")
    except Exception as e:
        logger.error(f"自动修正 Gemini api_style 失败: {e}")

    # v3.61.177: 启动迁移 — 修存量 storyboards.prompt 字段的「场景起始状态:」块 LLM 污染
    #   背景:state-chain 老逻辑只重写 description 没改 prompt,前端 UI 优先读 prompt
    #         → 视频管理页显示 LLM 原文(可能是上节 8 人状态),跟分镜管理页 4 人对不上
    #   策略:只在 prompt 角色集 ⊋ section_start_state.keys() 时才动手(防误伤用户编辑)
    try:
        from services.storyboard_service import repair_prompt_start_state_pollution
        await repair_prompt_start_state_pollution()
    except Exception as e:
        logger.error(f"修复 prompt 字段污染失败: {e}")

    # v3.61.178: 启动迁移 — 修存量 storyboards.end_state 跨场景污染
    #   背景:LLM 在跨场景节写 _end_state 时把上场景累积角色一起复制了
    #         → 分镜管理页角标"8 人状态"(实际本节只 2 人),chain-header 还会
    #           把这堆污染传播到下一节,雪球越滚越大
    #   策略:只在 end_state 角色集 ⊋ characters 时清(超集 = 污染);⊆ 不动
    try:
        from services.storyboard_service import repair_end_state_cross_scene_contamination
        await repair_end_state_cross_scene_contamination()
    except Exception as e:
        logger.error(f"修复 end_state 跨场景污染失败: {e}")

    # 启动时执行一次日志清理
    await run_log_cleanup_once()

    # 万山离线策略:只初始化本地敏感词缓存,不主动从远端同步。
    try:
        from services import sensitive_word_service
        await sensitive_word_service.init_cache_table()
        await sensitive_word_service.ensure_fallback_seeded()
        logger.info("本地敏感词库就绪")
    except Exception as e:
        logger.error(f"敏感词库初始化失败: {e}")
    
    logger.info("=" * 50)
    # ★ v3.59.45:之前这行写死 "监听端口 8000",但实际启动时若 8000 被占会跳 18472/28800/...
    #   误导排查 — 改成读 backend.port 文件拿真实端口
    try:
        from utils.paths import get_data_dir as _gdd_lifespan
        _pf = os.environ.get("WANSHAN_BACKEND_PORT_FILE") or os.path.join(_gdd_lifespan(), 'backend.port')
        if os.path.exists(_pf):
            with open(_pf, 'r', encoding='utf-8') as _f:
                _real_port = _f.read().strip() or '?'
        else:
            _real_port = '?(未写入端口文件,可能用了 reload 模式)'
    except Exception:
        _real_port = '?'
    # 启动全局视频生成队列 worker (v3.60+)
    try:
        from services.queue_worker import start_worker as _start_queue_worker
        await _start_queue_worker()
        logger.info("全局视频队列 worker 已启动")
    except Exception as e:
        logger.error(f"启动队列 worker 失败: {e}\n{traceback.format_exc()}")

    logger.info(f"后端服务启动成功,监听端口 {_real_port}")
    logger.info("=" * 50)

    yield

    # 关闭时的清理工作
    logger.info("后端服务正在关闭...")
    try:
        from services.queue_worker import stop_worker as _stop_queue_worker
        await _stop_queue_worker()
    except Exception as e:
        logger.error(f"停止队列 worker 失败: {e}")


app = FastAPI(title="万山 API", lifespan=lifespan)

# 全局异常处理中间件
@app.middleware("http")
async def global_exception_middleware(request: Request, call_next):
    try:
        await require_local_business_access(request)
        return await call_next(request)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
    except Exception as e:
        # 记录完整的错误信息
        error_detail = {
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }
        logger.error(
            f"请求异常 - 方法: {request.method}, URL: {request.url}, "
            f"错误类型: {type(e).__name__}, 错误信息: {e}\n"
            f"Traceback:\n{traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={"detail": f"服务器内部错误: {str(e)}", "error_type": type(e).__name__}
        )

app.add_middleware(
    CORSMiddleware,
    # Electron's local file renderer sends Origin: null. Do not expose the
    # loopback API to arbitrary browser origins.
    allow_origins=["null"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(novels_router)
app.include_router(templates_router)
app.include_router(llm_configs_router)
app.include_router(extraction_router)
app.include_router(scripts_router)
app.include_router(storyboards_router)
app.include_router(pipeline_router)
app.include_router(llm_logs_router)
app.include_router(video_router)
app.include_router(subtitle_removal_router)
app.include_router(settings_router)
app.include_router(queue_router)
app.include_router(team_router)
app.include_router(license_context_router)
if qianshan_lab_router is not None:
    app.include_router(qianshan_lab_router)
# v3.61.28: 封面生成实验路由
app.include_router(cover_router)
# v3.61.92: 其他功能 (溶图)
app.include_router(extra_router)
app.include_router(topview_demo_router)
app.include_router(supplement_video_router)

# ★ v3.59.46:媒体路径动态化
# 老版本用 app.mount(StaticFiles(directory=...))在启动时绑死路径,
# 用户在「设置→通用设置」改媒体目录后,挂载仍指向旧路径,新图保存到新路径但
# 静态服务从旧路径找 → 404 → 前端图位 FAILED。
# 改成 FileResponse 路由,每次请求时 get_media_dir() 重读 setting,即时生效。
data_dir = get_data_dir()

from utils.paths import get_media_dir
from fastapi.responses import FileResponse
from fastapi import HTTPException as _HTTPException
logger.info(f"data 目录(数据库/日志/尾帧):{data_dir}")
logger.info(f"媒体目录(图片/视频/音频,启动时):{get_media_dir()}")

# 启动时把当前媒体子目录都建好(避免空目录用户找不到)
for _cat in ("images", "audios", "videos", "subtitle_removed"):
    os.makedirs(os.path.join(get_media_dir(), _cat), exist_ok=True)


def _public_asset_dir() -> str:
    """Resolve bundled read-only assets in source and packaged layouts."""
    candidates = [
        os.environ.get("WANSHAN_PUBLIC_DIR", ""),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public"),
        os.path.join(os.getcwd(), "public"),
        os.path.abspath(os.path.join(os.getcwd(), "..", "..", "public")),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "resources", "public"),
    ]
    for candidate in candidates:
        if candidate and os.path.isdir(candidate):
            return os.path.abspath(candidate)
    return os.path.abspath(candidates[1])


@app.get("/public/{filename:path}")
async def _serve_public_asset(filename: str):
    """Serve bundled voice previews without exposing the install tree."""
    safe_filename = filename.replace("\\", "/").lstrip("/")
    if ".." in safe_filename.split("/"):
        raise _HTTPException(403, "非法路径")
    full = os.path.join(_public_asset_dir(), safe_filename)
    if not os.path.isfile(full):
        raise _HTTPException(404, f"公共资源不存在: {safe_filename}")
    return FileResponse(full)


def _serve_media(category: str, filename: str):
    # 防御:不允许 ../ 越权访问 data_dir 之外
    safe_filename = filename.replace("\\", "/").lstrip("/")
    if ".." in safe_filename.split("/"):
        raise _HTTPException(403, "非法路径")
    full = os.path.join(get_media_dir(), category, safe_filename)
    if not os.path.exists(full) or not os.path.isfile(full):
        raise _HTTPException(404, f"文件不存在: {category}/{safe_filename}")
    return FileResponse(full)


@app.get("/data/images/{filename:path}")
async def _serve_image(filename: str):
    return _serve_media("images", filename)


@app.get("/data/audios/{filename:path}")
async def _serve_audio(filename: str):
    return _serve_media("audios", filename)


@app.get("/data/videos/{filename:path}")
async def _serve_video(filename: str):
    return _serve_media("videos", filename)


@app.get("/data/subtitle_removed/{filename:path}")
async def _serve_subtitle_removed(filename: str):
    return _serve_media("subtitle_removed", filename)


# 串行尾帧 — 留 data_dir(体积小,跟 db 一起,不可改路径,所以仍可静态挂载)
frames_dir = os.path.join(data_dir, "frames")
os.makedirs(frames_dir, exist_ok=True)
app.mount("/data/frames", StaticFiles(directory=frames_dir), name="frames")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "服务运行正常", "version": APP_VERSION}


if qianshan_lab_router is not None:
    @app.get("/qianshan-storyboard-lab")
    async def qianshan_storyboard_lab_page():
        page = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "qianshan-storyboard-lab.html")
        if not os.path.exists(page):
            raise _HTTPException(404, "分镜实验页面不存在")
        return FileResponse(page)


def _find_free_port():
    """按候选列表试,返回第一个能 bind 127.0.0.1 的端口。
    8000 兜底首选(老用户/杀软白名单);其它 4 个 5 位数高位端口避开常见冲突。
    """
    import socket
    candidates = [8000, 18472, 28800, 38765, 48899]
    for p in candidates:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            # 立即试 bind,失败说明端口被占
            s.bind(('127.0.0.1', p))
            s.close()
            return p
        except OSError:
            try: s.close()
            except Exception: pass
            continue
    raise RuntimeError(f"所有候选端口都被占: {candidates}")


def _write_port_file(port: int):
    """把 backend 监听的端口写到 data/backend.port,Electron 启动时读取拼 BACKEND_URL"""
    try:
        from utils.paths import get_data_dir as _gdd, get_runtime_file_override
        port_file = get_runtime_file_override(
            "WANSHAN_BACKEND_PORT_FILE",
            "--wanshan-backend-port-file",
        ) or os.path.join(_gdd(), 'backend.port')
        with open(port_file, 'w', encoding='utf-8') as f:
            f.write(str(port))
        print(f"[port] 端口写入文件: {port_file} = {port}", flush=True)
    except Exception as e:
        print(f"[port] 写入端口文件失败(不致命): {e}", flush=True)


if __name__ == "__main__":
    # 开发环境使用 reload，生产环境禁用以避免长时间 LLM 请求被中断
    dev_mode = os.environ.get("DEV_MODE", "false").lower() == "true"
    # 直接传递 app 对象，避免打包后模块名解析问题
    # 2026-04 动态端口:8000 被占(System/IIS/Hyper-V/SQL Server 都可能)时自动 fallback
    try:
        port = _find_free_port()
    except RuntimeError as e:
        print(f"[port] 致命错误: {e}", flush=True)
        sys.exit(1)
    _write_port_file(port)
    print(f"[port] backend 监听 127.0.0.1:{port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port)
