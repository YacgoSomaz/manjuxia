from typing import Optional, List
from pydantic import BaseModel


class StoryboardGenerateRequest(BaseModel):
    novel_id: int
    script_id: Optional[int] = None
    template_id: int
    llm_config_id: int


class SplitScenesRequest(BaseModel):
    novel_id: int
    script_id: Optional[int] = None


class GenerateSectionRequest(BaseModel):
    novel_id: int
    template_id: int
    llm_config_id: int
    script_id: Optional[int] = None
    scene_content: str
    scene_title: str
    section_number: int
    style_template_id: Optional[int] = None
    scene_index: Optional[int] = None  # 场景在剧本中的序号（用于精确匹配）
    inherit_prev_state: bool = True    # 是否继承上一小节的 end_state(默认开启)
    cross_chapter_inherit: bool = False  # 是否跨章节继承(默认关闭,跨章通常有时间跳跃)
    with_character_state: bool = True  # v3.61.229 是否生成人物状态(默认开);关=不注入/不输出/清空本节状态块

class RegenerateSingleSectionRequest(BaseModel):
    """单个小节重新生成请求"""
    novel_id: int
    template_id: int
    llm_config_id: int
    script_id: Optional[int] = None
    scene_content: str
    scene_title: str
    section_number: int
    storyboard_id: int
    style_template_id: Optional[int] = None
    scene_index: Optional[int] = None  # 场景在剧本中的序号（用于精确匹配）
    inherit_prev_state: bool = True    # 是否继承上一小节的 end_state(默认开启)
    cross_chapter_inherit: bool = False  # 是否跨章节继承
    with_character_state: bool = True  # v3.61.229 是否生成人物状态(默认开)

class StoryboardCreate(BaseModel):
    novel_id: int
    script_id: Optional[int] = None
    scene_number: int
    description: str
    prompt: str = ""
    characters: List[str] = []
    scenes: List[str] = []
    props: List[str] = []
    sort_order: int = 0
    section_number: int = 1
    section_info: dict = {}


class StoryboardUpdate(BaseModel):
    description: Optional[str] = None
    prompt: Optional[str] = None
    style_prompt: Optional[str] = None
    characters: Optional[List[str]] = None
    scenes: Optional[List[str]] = None
    props: Optional[List[str]] = None
    excluded_props: Optional[List[str]] = None
    excluded_audios: Optional[List[str]] = None
    auto_excluded_audios: Optional[List[str]] = None  # v3.61.136: 跟随 prompt 自动管理
    section_start_state: Optional[dict] = None  # 本节起始时,激活角色(本节 characters 列表里的)的状态快照 {"角色名": "姿态[...]·..."}
    scene_type: Optional[str] = None  # 节类型: normal(默认,主时间线) / flashback(回忆) / dream(梦境) / vision(幻觉) / parallel(平行叙事)
    sort_order: Optional[int] = None
    section_number: Optional[int] = None
    section_info: Optional[dict] = None
    end_state: Optional[dict] = None  # 本节结尾状态 {"角色": "姿势·伤势·道具·情绪"}


class StoryboardResponse(BaseModel):
    id: int
    novel_id: int
    script_id: Optional[int] = None
    scene_number: int
    description: str
    prompt: str
    style_prompt: Optional[str] = None
    characters: List[str]
    scenes: List[str]
    props: List[str]
    sort_order: int
    section_number: int
    section_info: dict
    scene_index: Optional[int] = None  # 场景在剧本中的序号
    video_status: Optional[str] = None  # pending/generating/completed/failed/chain_aborted
    video_url: Optional[str] = None
    submit_id: Optional[str] = None
    last_frame_path: Optional[str] = None  # 视频生成成功后,ffmpeg 抽出的尾帧 jpg 相对路径(供下一镜接帧用)
    chain_prev: Optional[dict] = None  # 计算字段:可接的上一镜信息 {"storyboard_id":..., "section_label":..., "frame_path":...}
    created_at: str

    class Config:
        from_attributes = True


class SectionInfo(BaseModel):
    scene: str = ""
    characters: str = ""


class StoryboardSectionResponse(BaseModel):
    section_number: int
    section_info: SectionInfo
    shots: List[StoryboardResponse]


class StoryboardGroupedResponse(BaseModel):
    novel_id: int
    sections: List[StoryboardSectionResponse]
    total: int
