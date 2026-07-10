import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from models.pipeline import PipelineConfig, PipelineStatus, StepStatus, StepConfig
from services.script_service import ScriptService
from services.extraction_service import ExtractionService
from services.storyboard_service import StoryboardService
from utils.timezone import now_beijing_str, now_beijing

# 全局存储运行中的流水线状态
_pipelines: Dict[str, PipelineStatus] = {}
_pipeline_tasks: Dict[str, asyncio.Task] = {}

# 步骤名称映射
STEP_NAMES = {
    "script_conversion": "剧本转换",
    "character_extraction": "人物提取",
    "scene_extraction": "场景提取",
    "prop_extraction": "道具提取",
    "storyboard_generation": "分镜生成"
}

# 步骤顺序（用于确定执行顺序）
STEP_ORDER = [
    "script_conversion",
    "character_extraction",
    "scene_extraction",
    "prop_extraction",
    "storyboard_generation"
]


def _create_initial_status(pipeline_id: str, novel_id: int, config: PipelineConfig) -> PipelineStatus:
    """创建初始流水线状态"""
    steps = []
    for step_key in STEP_ORDER:
        step_config = getattr(config, step_key)
        steps.append(StepStatus(
            name=STEP_NAMES[step_key],
            status="pending" if step_config.enabled else "skipped",
            message="等待执行" if step_config.enabled else "已跳过",
            progress=0
        ))
    
    return PipelineStatus(
        pipeline_id=pipeline_id,
        novel_id=novel_id,
        status="pending",
        steps=steps,
        current_step=0,
        started_at=None,
        completed_at=None
    )


def _update_step_status(
    status: PipelineStatus,
    step_name: str,
    step_status: str,
    message: str = "",
    progress: float = 0
) -> None:
    """更新单个步骤状态"""
    for step in status.steps:
        if step.name == step_name:
            step.status = step_status
            step.message = message
            step.progress = progress
            break


def _get_step_index(step_name: str) -> int:
    """获取步骤索引"""
    for i, key in enumerate(STEP_ORDER):
        if STEP_NAMES[key] == step_name:
            return i
    return -1


async def _run_script_conversion(
    pipeline_id: str,
    novel_id: int,
    config: StepConfig
) -> Dict[str, Any]:
    """执行剧本转换步骤"""
    status = _pipelines[pipeline_id]
    _update_step_status(status, "剧本转换", "running", "正在转换章节为剧本...", 10)
    
    try:
        result = await ScriptService.convert_all_chapters(
            novel_id=novel_id,
            template_id=config.template_id,
            llm_config_id=config.llm_config_id
        )
        
        if result["success_count"] > 0:
            _update_step_status(
                status, 
                "剧本转换", 
                "completed", 
                f"成功转换 {result['success_count']}/{result['total']} 个章节",
                100
            )
            return {"success": True, "message": "剧本转换完成"}
        else:
            _update_step_status(
                status, 
                "剧本转换", 
                "failed", 
                f"转换失败: 成功0个，失败{result['failed_count']}个",
                0
            )
            return {"success": False, "message": "剧本转换失败"}
            
    except Exception as e:
        _update_step_status(status, "剧本转换", "failed", f"执行出错: {str(e)}", 0)
        return {"success": False, "message": str(e)}


async def _run_extraction(
    pipeline_id: str,
    novel_id: int,
    element_type: str,
    config: StepConfig
) -> Dict[str, Any]:
    """执行信息提取步骤"""
    status = _pipelines[pipeline_id]
    step_name = STEP_NAMES[f"{element_type}_extraction"]
    _update_step_status(status, step_name, "running", f"正在提取{step_name}...", 10)
    
    try:
        result = await ExtractionService.extract_all(
            novel_id=novel_id,
            element_type=element_type,
            template_id=config.template_id,
            llm_config_id=config.llm_config_id
        )
        
        if result.get("success", False):
            _update_step_status(
                status, 
                step_name, 
                "completed", 
                f"成功提取 {result.get('total_unique', 0)} 个{step_name}",
                100
            )
            return {"success": True, "message": f"{step_name}完成"}
        else:
            _update_step_status(
                status, 
                step_name, 
                "failed", 
                f"提取失败: {result.get('message', '未知错误')}",
                0
            )
            return {"success": False, "message": result.get('message', '提取失败')}
            
    except Exception as e:
        _update_step_status(status, step_name, "failed", f"执行出错: {str(e)}", 0)
        return {"success": False, "message": str(e)}


async def _run_storyboard_generation(
    pipeline_id: str,
    novel_id: int,
    config: StepConfig
) -> Dict[str, Any]:
    """执行分镜生成步骤"""
    status = _pipelines[pipeline_id]
    _update_step_status(status, "分镜生成", "running", "正在生成分镜...", 10)
    
    try:
        result = await StoryboardService.generate_storyboards(
            novel_id=novel_id,
            template_id=config.template_id,
            llm_config_id=config.llm_config_id,
            script_id=None  # 使用所有剧本
        )
        
        if result.get("success", False):
            _update_step_status(
                status, 
                "分镜生成", 
                "completed", 
                f"成功生成 {result.get('count', 0)} 个分镜",
                100
            )
            return {"success": True, "message": "分镜生成完成"}
        else:
            _update_step_status(
                status, 
                "分镜生成", 
                "failed", 
                f"生成失败: {result.get('message', '未知错误')}",
                0
            )
            return {"success": False, "message": result.get('message', '分镜生成失败')}
            
    except Exception as e:
        _update_step_status(status, "分镜生成", "failed", f"执行出错: {str(e)}", 0)
        return {"success": False, "message": str(e)}


async def _check_cancelled(pipeline_id: str) -> bool:
    """检查流水线是否被取消"""
    if pipeline_id not in _pipelines:
        return True
    return _pipelines[pipeline_id].status == "cancelled"


async def _execute_pipeline(pipeline_id: str, config: PipelineConfig) -> None:
    """执行完整流水线"""
    status = _pipelines[pipeline_id]
    status.status = "running"
    status.started_at = now_beijing_str()
    
    try:
        # 步骤1: 剧本转换（必须执行）
        if config.script_conversion.enabled:
            if await _check_cancelled(pipeline_id):
                return
            status.current_step = 0
            result = await _run_script_conversion(
                pipeline_id, 
                config.novel_id, 
                config.script_conversion
            )
            if not result["success"]:
                status.status = "failed"
                status.completed_at = now_beijing_str()
                return
        
        # 步骤2-4: 信息提取（并行执行）
        extraction_tasks = []
        
        if config.character_extraction.enabled:
            extraction_tasks.append(
                _run_extraction(pipeline_id, config.novel_id, "character", config.character_extraction)
            )
        if config.scene_extraction.enabled:
            extraction_tasks.append(
                _run_extraction(pipeline_id, config.novel_id, "scene", config.scene_extraction)
            )
        if config.prop_extraction.enabled:
            extraction_tasks.append(
                _run_extraction(pipeline_id, config.novel_id, "prop", config.prop_extraction)
            )
        
        if extraction_tasks:
            if await _check_cancelled(pipeline_id):
                return
            status.current_step = 1
            # 并行执行所有提取任务
            results = await asyncio.gather(*extraction_tasks, return_exceptions=True)
            
            # 检查是否有失败
            for result in results:
                if isinstance(result, Exception):
                    status.status = "failed"
                    status.completed_at = now_beijing_str()
                    return
                if isinstance(result, dict) and not result.get("success", False):
                    status.status = "failed"
                    status.completed_at = now_beijing_str()
                    return
        
        # 步骤5: 分镜生成
        if config.storyboard_generation.enabled:
            if await _check_cancelled(pipeline_id):
                return
            status.current_step = 4
            result = await _run_storyboard_generation(
                pipeline_id, 
                config.novel_id, 
                config.storyboard_generation
            )
            if not result["success"]:
                status.status = "failed"
                status.completed_at = now_beijing_str()
                return
        
        # 全部完成
        if not await _check_cancelled(pipeline_id):
            status.status = "completed"
            status.completed_at = now_beijing_str()
            
    except Exception as e:
        if not await _check_cancelled(pipeline_id):
            status.status = "failed"
            status.completed_at = now_beijing_str()


async def run_pipeline(config: PipelineConfig) -> str:
    """
    启动全自动流水线
    
    Args:
        config: 流水线配置
        
    Returns:
        pipeline_id: 流水线ID
    """
    pipeline_id = str(uuid.uuid4())
    
    # 创建初始状态
    _pipelines[pipeline_id] = _create_initial_status(
        pipeline_id, config.novel_id, config
    )
    
    # 在后台启动流水线
    task = asyncio.create_task(_execute_pipeline(pipeline_id, config))
    _pipeline_tasks[pipeline_id] = task
    
    return pipeline_id


async def run_single_step(
    pipeline_id: str,
    step_name: str,
    novel_id: int,
    template_id: int,
    llm_config_id: int
) -> Dict[str, Any]:
    """
    执行单个步骤（用于单步模式）
    
    Args:
        pipeline_id: 流水线ID
        step_name: 步骤名称
        novel_id: 小说ID
        template_id: 模板ID
        llm_config_id: LLM配置ID
        
    Returns:
        执行结果
    """
    config = StepConfig(template_id=template_id, llm_config_id=llm_config_id, enabled=True)
    
    # 如果流水线不存在，创建一个新的
    if pipeline_id not in _pipelines:
        # 创建一个临时配置用于单步执行
        temp_config = PipelineConfig(
            novel_id=novel_id,
            script_conversion=StepConfig(template_id=0, llm_config_id=0, enabled=False),
            character_extraction=StepConfig(template_id=0, llm_config_id=0, enabled=False),
            scene_extraction=StepConfig(template_id=0, llm_config_id=0, enabled=False),
            prop_extraction=StepConfig(template_id=0, llm_config_id=0, enabled=False),
            storyboard_generation=StepConfig(template_id=0, llm_config_id=0, enabled=False)
        )
        _pipelines[pipeline_id] = _create_initial_status(pipeline_id, novel_id, temp_config)
        _pipelines[pipeline_id].status = "running"
        _pipelines[pipeline_id].started_at = now_beijing_str()
    
    # 执行对应步骤
    if step_name == "script_conversion":
        return await _run_script_conversion(pipeline_id, novel_id, config)
    elif step_name == "character_extraction":
        return await _run_extraction(pipeline_id, novel_id, "character", config)
    elif step_name == "scene_extraction":
        return await _run_extraction(pipeline_id, novel_id, "scene", config)
    elif step_name == "prop_extraction":
        return await _run_extraction(pipeline_id, novel_id, "prop", config)
    elif step_name == "storyboard_generation":
        return await _run_storyboard_generation(pipeline_id, novel_id, config)
    else:
        return {"success": False, "message": f"未知的步骤: {step_name}"}


async def get_pipeline_status(pipeline_id: str) -> Optional[PipelineStatus]:
    """
    获取流水线状态
    
    Args:
        pipeline_id: 流水线ID
        
    Returns:
        流水线状态，如果不存在返回None
    """
    return _pipelines.get(pipeline_id)


async def cancel_pipeline(pipeline_id: str) -> bool:
    """
    取消正在运行的流水线
    
    Args:
        pipeline_id: 流水线ID
        
    Returns:
        是否成功取消
    """
    if pipeline_id not in _pipelines:
        return False
    
    status = _pipelines[pipeline_id]
    
    # 只有运行中的流水线可以取消
    if status.status != "running":
        return False
    
    # 标记为已取消
    status.status = "cancelled"
    status.completed_at = now_beijing_str()
    
    # 取消正在运行的任务
    if pipeline_id in _pipeline_tasks:
        task = _pipeline_tasks[pipeline_id]
        if not task.done():
            task.cancel()
        del _pipeline_tasks[pipeline_id]
    
    # 更新所有正在运行的步骤
    for step in status.steps:
        if step.status == "running":
            step.status = "failed"
            step.message = "已取消"
    
    return True


async def list_pipelines() -> List[PipelineStatus]:
    """
    列出所有流水线记录
    
    Returns:
        流水线状态列表
    """
    return list(_pipelines.values())


async def cleanup_old_pipelines(max_age_hours: int = 24) -> int:
    """
    清理过期的流水线记录
    
    Args:
        max_age_hours: 最大保留时间（小时）
        
    Returns:
        清理的数量
    """
    now = now_beijing()
    to_remove = []
    
    for pipeline_id, status in _pipelines.items():
        if status.completed_at:
            completed_time = datetime.fromisoformat(status.completed_at)
            age = (now - completed_time).total_seconds() / 3600
            if age > max_age_hours:
                to_remove.append(pipeline_id)
    
    for pipeline_id in to_remove:
        del _pipelines[pipeline_id]
        if pipeline_id in _pipeline_tasks:
            del _pipeline_tasks[pipeline_id]
    
    return len(to_remove)
