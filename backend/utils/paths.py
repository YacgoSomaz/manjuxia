import os
import sys


def is_frozen() -> bool:
    """判断是否在打包环境中运行。

    PyInstaller 会设置 ``sys.frozen``；Nuitka standalone 运行时会设置
    ``__compiled__``。商业包后端现在由 Nuitka 编译，不能只判断
    PyInstaller，否则会漏掉安装包内 resources/backend-dist 下的 CLI 资源。
    """
    return bool(getattr(sys, 'frozen', False) or globals().get('__compiled__'))


APP_NAME = os.environ.get("WANSHAN_APP_NAME", "万山")


def get_runtime_file_override(env_name: str, argument_name: str) -> str:
    """Read an Electron-provided runtime file path.

    Installed Windows builds pass the path both through environment variables
    and argv.  argv is a deliberate fallback for launch environments that do
    not reliably preserve a child process's custom environment variables.
    """
    value = os.environ.get(env_name, "").strip()
    if value:
        return os.path.abspath(value)

    prefix = f"{argument_name}="
    for index, argument in enumerate(sys.argv[1:], start=1):
        if argument == argument_name and index + 1 < len(sys.argv):
            candidate = str(sys.argv[index + 1]).strip()
            if candidate:
                return os.path.abspath(candidate)
        if argument.startswith(prefix):
            candidate = argument[len(prefix):].strip()
            if candidate:
                return os.path.abspath(candidate)
    return ""


def get_data_dir() -> str:
    """获取 data 目录路径(数据库 / 日志 / 缓存 / 尾帧 用 — 始终在系统目录,不可改)
    默认路径: %APPDATA%/万山/data
    可通过 WANSHAN_DATA_DIR 覆盖,用于调试或便携版。

    ★ 设计要点(2026-04 v3.59.41):
    - 这个函数返回的目录**永远不变**,不允许用户改
    - 数据库 app.db、日志、尾帧 frames/ 都放这里
    - 防止用户清理素材时误删 db 导致整个工具数据丢失
    """
    override = os.environ.get("WANSHAN_DATA_DIR")
    if override:
        data_dir = override
    else:
        appdata = os.environ.get('APPDATA') or os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming')
        data_dir = os.path.join(appdata, APP_NAME, 'data')
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def get_media_dir() -> str:
    """获取媒体素材目录(images / videos / audios / subtitle_removed 用)
    用户可以在「设置 → 通用设置」里改这个路径,把重资产放到 D 盘等大盘上。
    没改时跟 get_data_dir() 一致(老用户无感)。

    settings 表的 key: 'data.media_dir_override'(空 = 用默认 data_dir)
    """
    custom = _read_media_dir_override()
    if custom and os.path.isdir(custom):
        return custom
    return get_data_dir()


MEDIA_CATEGORIES = ('images/', 'videos/', 'audios/', 'subtitle_removed/')


def resolve_db_path(db_rel_path: str) -> str:
    """把 DB 里存的相对路径解析到磁盘绝对路径。
    DB 里所有图片/视频/音频路径都以 '/data/xxx/...' 开头(历史约定)。
    本函数:
      - images/videos/audios/subtitle_removed → 走 get_media_dir()(用户可改)
      - frames 及其它(尾帧/缓存/db) → 走 get_data_dir()(始终系统目录)
    返回 '' 表示输入为空。
    """
    if not db_rel_path:
        return ''
    rel = db_rel_path.lstrip('/')
    if rel.startswith('data/'):
        rel = rel[5:]
    # 判断分类
    if any(rel.startswith(c) for c in MEDIA_CATEGORIES):
        return os.path.normpath(os.path.join(get_media_dir(), rel))
    return os.path.normpath(os.path.join(get_data_dir(), rel))


def media_subdir(name: str) -> str:
    """获取媒体子目录绝对路径(images/videos/audios/subtitle_removed),自动 makedirs"""
    p = os.path.join(get_media_dir(), name)
    os.makedirs(p, exist_ok=True)
    return p


def _read_media_dir_override() -> str:
    """同步读 SettingsService 里的自定义媒体路径。
    必须同步,因为 paths 模块被很多同步代码用(写文件路径拼接时)。
    直接 SQL 读 app_settings 表,绕过 SettingsService 的 async 接口。
    """
    try:
        import sqlite3
        db_path = os.path.join(get_data_dir(), 'app.db')
        if not os.path.exists(db_path):
            return ''
        conn = sqlite3.connect(db_path, timeout=2)
        try:
            cur = conn.cursor()
            # app_settings 可能还没建,容错
            cur.execute("SELECT value FROM app_settings WHERE key=? LIMIT 1", ('data.media_dir_override',))
            row = cur.fetchone()
            if row and row[0]:
                return str(row[0]).strip()
        except sqlite3.OperationalError:
            return ''  # 表不存在
        finally:
            conn.close()
    except Exception:
        return ''
    return ''
