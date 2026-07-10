"""字幕去除服务"""
import os
import asyncio
import json
import uuid
import logging
from database.db import get_db
from utils.timezone import now_beijing_str
from utils.paths import get_data_dir

logger = logging.getLogger(__name__)

# VSR 虚拟环境的 Python
VSR_PYTHON = r"e:\tools\vsr\venv\Scripts\python.exe"
# Wrapper 脚本路径
TOOLS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tools")
VSR_WRAPPER = os.path.join(TOOLS_DIR, "vsr_wrapper.py")
PROPAINTER_WRAPPER = os.path.join(TOOLS_DIR, "propainter_wrapper.py")
# 数据目录
_DATA_DIR = get_data_dir()
# 输出目录
OUTPUT_DIR = os.path.join(_DATA_DIR, "videos", "subtitle_removed")
# 上传目录
UPLOAD_DIR = os.path.join(_DATA_DIR, "videos", "uploads")


async def init_table():
    """创建去字幕任务表"""
    db = await get_db()
    await db.execute("""
        CREATE TABLE IF NOT EXISTS subtitle_removal_tasks (
            id TEXT PRIMARY KEY,
            original_video_path TEXT NOT NULL,
            original_filename TEXT,
            algorithm TEXT NOT NULL DEFAULT 'vsr-sttn',
            subtitle_area TEXT DEFAULT 'auto',
            status TEXT NOT NULL DEFAULT 'pending',
            progress INTEGER DEFAULT 0,
            output_path TEXT,
            output_url TEXT,
            error_message TEXT,
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )
    """)
    await db.commit()


async def create_task(video_path: str, filename: str, algorithm: str = "vsr-sttn", subtitle_area: str = "auto") -> str:
    """创建去字幕任务"""
    db = await get_db()
    task_id = str(uuid.uuid4())[:8]
    now = now_beijing_str()
    await db.execute(
        "INSERT INTO subtitle_removal_tasks (id, original_video_path, original_filename, algorithm, subtitle_area, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)",
        (task_id, video_path, filename, algorithm, subtitle_area, now, now)
    )
    await db.commit()
    return task_id


# 后端数据目录（用于路径转换）
DATA_DIR = _DATA_DIR


def _task_with_urls(task: dict) -> dict:
    """将任务中的绝对路径转换为相对URL"""
    if task and task.get('original_video_path'):
        abs_path = task['original_video_path']
        try:
            rel = os.path.relpath(abs_path, DATA_DIR)
            task['original_video_url'] = '/data/' + rel.replace('\\', '/')
        except ValueError:
            task['original_video_url'] = abs_path
    return task


async def get_task(task_id: str):
    """获取任务详情"""
    db = await get_db()
    cursor = await db.execute("SELECT * FROM subtitle_removal_tasks WHERE id = ?", (task_id,))
    row = await cursor.fetchone()
    if row:
        return _task_with_urls(dict(row))
    return None


async def list_tasks():
    """获取所有任务列表"""
    db = await get_db()
    cursor = await db.execute("SELECT * FROM subtitle_removal_tasks ORDER BY created_at DESC")
    rows = await cursor.fetchall()
    return [_task_with_urls(dict(r)) for r in rows]


async def update_task(task_id: str, **kwargs):
    """更新任务字段"""
    db = await get_db()
    kwargs['updated_at'] = now_beijing_str()
    set_clause = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [task_id]
    await db.execute(f"UPDATE subtitle_removal_tasks SET {set_clause} WHERE id = ?", values)
    await db.commit()


async def delete_task(task_id: str):
    """删除任务及其输出文件"""
    task = await get_task(task_id)
    if task and task.get('output_path') and os.path.exists(task['output_path']):
        try:
            os.remove(task['output_path'])
        except Exception:
            pass
    db = await get_db()
    await db.execute("DELETE FROM subtitle_removal_tasks WHERE id = ?", (task_id,))
    await db.commit()


async def process_video(task_id: str):
    """在后台处理视频去字幕"""
    task = await get_task(task_id)
    if not task:
        return
    
    await update_task(task_id, status="processing", progress=10)
    
    algorithm = task['algorithm']
    video_path = task['original_video_path']
    subtitle_area = task.get('subtitle_area', 'auto')
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 根据算法选择 wrapper
    if algorithm.startswith('vsr'):
        algo_name = algorithm.split('-')[1].upper() if '-' in algorithm else 'STTN'
        wrapper = VSR_WRAPPER
        config = {
            "video_path": video_path,
            "algorithm": algo_name,
            "output_dir": OUTPUT_DIR,
            "subtitle_area": subtitle_area
        }
    else:  # propainter
        wrapper = PROPAINTER_WRAPPER
        config = {
            "video_path": video_path,
            "output_dir": OUTPUT_DIR,
            "subtitle_area": subtitle_area
        }
    
    config_json = json.dumps(config, ensure_ascii=False)
    
    try:
        await update_task(task_id, progress=5)
        
        logger.info(f"[subtitle-removal] 开始处理 task={task_id}, algorithm={algorithm}")
        
        process = await asyncio.create_subprocess_exec(
            VSR_PYTHON, wrapper, "--config", config_json,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # 逐行读取 stdout，解析进度和结果
        stdout_lines = []
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            line_text = line.decode('utf-8', errors='replace').strip()
            stdout_lines.append(line_text)
            
            # 解析进度行
            if line_text.startswith('===PROGRESS==='):
                try:
                    pct = int(line_text.split('===PROGRESS===')[1])
                    await update_task(task_id, progress=min(pct, 99))
                except (ValueError, IndexError):
                    pass
        
        # 等待进程结束，读取 stderr
        stderr = await process.stderr.read()
        stderr_text = stderr.decode('utf-8', errors='replace')
        await process.wait()
        
        stdout_text = '\n'.join(stdout_lines)
        
        logger.info(f"[subtitle-removal] task={task_id} 进程退出码={process.returncode}")
        
        if process.returncode != 0:
            raise RuntimeError(f"进程退出码 {process.returncode}: {stderr_text[:500]}")
        
        # 解析结果（wrapper 输出 ===RESULT=== 后的 JSON）
        result_json = None
        if "===RESULT===" in stdout_text:
            result_str = stdout_text.split("===RESULT===")[1].strip()
            result_json = json.loads(result_str)
        else:
            # 尝试直接解析最后一行
            lines = stdout_text.strip().split('\n')
            for line in reversed(lines):
                try:
                    result_json = json.loads(line.strip())
                    break
                except:
                    continue
        
        if not result_json:
            raise RuntimeError(f"无法解析输出: {stdout_text[:500]}")
        
        if result_json.get('status') == 'success':
            output_path = result_json.get('output_path', '')
            # 生成访问URL
            if output_path:
                rel_path = os.path.relpath(output_path, _DATA_DIR)
                output_url = "/data/" + rel_path.replace("\\", "/")
            else:
                output_url = ""
            await update_task(task_id, status="done", progress=100, output_path=output_path, output_url=output_url)
            logger.info(f"[subtitle-removal] task={task_id} 完成, output={output_path}")
        else:
            error = result_json.get('error', '未知错误')
            await update_task(task_id, status="failed", error_message=error)
            logger.error(f"[subtitle-removal] task={task_id} 失败: {error}")
    
    except Exception as e:
        logger.error(f"[subtitle-removal] task={task_id} 异常: {e}")
        await update_task(task_id, status="failed", error_message=str(e))
