# 千山源码结构、功能实现与万山缺口图

更新时间：2026-07-17

## 结论先说

千山后端源码没有做到逐行完整人工审计，但已经完成：

- 全量文件枚举：`D:\qianshan\xiaoyangmengjuchang\resources\backend`
- 路由扫描：`main.py` 和 `api/*.py` 的 FastAPI 路由
- 服务层函数扫描：`services/*.py` 和 `services/video_providers/*.py`
- 数据库结构扫描：`database/db.py`
- 重点新增模块阅读：补镜视频、TopView、语音音色、Pippit、视频队列、视频素材链路、信息提取批量任务

前端情况不同：千山安装包里前端是 `resources/app.asar` 和编译后的 `assets/*.js`，不是原始 Vue/TypeScript 源码。可以反查页面、接口调用和组件行为，但不能说“拿到了原前端源码”。后续若要深度复刻前端，应按编译 chunk 逐页反编译阅读，不建议整包覆盖万山。

## 千山安装目录结构

根目录：

```text
D:\qianshan\xiaoyangmengjuchang
├── 造梦工坊.exe
├── resources
│   ├── app.asar                 # Electron 前端与主进程打包产物
│   ├── app-update.yml
│   ├── backend                  # Python 后端源码
│   ├── backend-dist             # 后端打包产物/运行时
│   ├── build                    # 图标、ffmpeg 等构建资源
│   ├── public                   # 静态资源、激活背景、语音试听样例
│   └── elevate.exe
├── chrome_*.pak / *.dll / *.dat # Electron/Chromium 运行时
└── Uninstall 造梦工坊.exe
```

不要复制进万山源码或商业包的运行残留：

- `resources/backend/data/app.db*`
- `resources/backend/data/*.log`
- `resources/backend/data/*.bak_*`
- `resources/backend/data/backend.session`
- `resources/backend/data/backend.port`
- `__pycache__/`

## 千山后端源码总结构

```text
resources/backend
├── main.py                       # FastAPI 应用入口，注册全部路由，启动队列 worker
├── _version.py                   # 版本号
├── requirements.txt              # Python 依赖
├── database/db.py                # SQLite schema、自动迁移、历史数据修复
├── api/                          # HTTP 接口层
├── services/                     # 业务服务层
├── services/video_providers/     # 视频供应商适配器
├── models/                       # Pydantic 请求/响应模型
├── utils/                        # 路径、签名、加密、日志清洗、时区工具
├── tools/                        # 字幕去除/超分等外部工具 wrapper
├── ml_models/                    # YuNet 人脸检测模型
├── public/                       # 由安装 resources/public 提供，主要含语音试听
└── test_*.py / recover_*.py      # 测试与修复脚本
```

## main.py 做什么

`main.py` 是后端启动入口：

- 创建 FastAPI app。
- 配置 CORS 和本机访问策略。
- 初始化数据库。
- 注册所有 `api/*` 路由。
- 启动全局视频队列 worker。
- 提供静态资源访问。
- 做日志配置与进程运行端口/session 文件写入。

千山注册的路由模块：

```text
api.novels              小说导入、章节、创作、标签
api.templates           提示词模板
api.llm_configs         模型配置
api.extraction          人物/场景/道具提取、素材图、全景、宫格、音频、音色
api.scripts             小说转剧本、剧本导入导出
api.storyboards         剧本转分镜、分镜解析、状态继承、敏感词
api.pipeline            一键流水线
api.llm_logs            LLM 调用日志
api.topview_demo        TopView 俯视调度图实验功能
api.video               视频生成、轮询、尾帧、TopView 链、音频过滤
api.subtitle_removal    字幕去除
api.license_context     授权/云 token 上下文
api.settings            设置
api.queue               全局视频队列
api.short_drama_sync    短剧云项目同步
api.team                团队上下文
api.team_script         团队剧本同步
api.team_asset          团队资产同步/推送
api.cover               小说封面
api.extra               图片融合、火山素材库
api.supplement_video    补镜视频
```

## 数据库结构

`database/db.py` 负责创建和自动迁移这些核心表：

| 表 | 用途 | 万山状态 |
|---|---|---|
| `prompt_templates` | 提示词模板，含预置模板、云端 admin_id | 已有 |
| `tag_definitions` | 小说标签定义 | 已补 |
| `novel_tags` | 小说与标签关系 | 已补 |
| `llm_configs` | 本地模型配置 | 已有，万山偏本地配置 |
| `llm_config_presets` | 云端同步的模型配置预设 | 已有 |
| `novels` | 小说项目 | 已有 |
| `chapters` | 章节 | 已有 |
| `scripts` | 剧本，千山新增 `sync_outdated` | 字段已补 |
| `extracted_elements` | 人物/场景/道具资产，千山新增 `voice_id` | 字段已补 |
| `character_variants` | 人物马甲/变体 | 已有 |
| `storyboards` | 分镜，含 TopView/首尾帧字段 | 基础字段已补 |
| `video_task_queue` | 全局视频生成队列 | 活跃态幂等已补 |
| `llm_logs` | LLM 调用日志 | 已有 |

## 2026-07-17 漫剧虾补齐记录

本轮只补功能层差异，不修改千山安装目录，不启用短剧同步、团队剧本同步和团队资产同步。

- 人物描述润色：`backend/api/extraction.py` 新增千山原版 `POST /api/extraction/element/{element_id}/polish-description`，使用漫剧虾本地语言模型配置调用 LLM，返回原版 `description` 字段，不自动写回 `extracted_elements.description`。
- 分镜链路恢复：`backend/api/video.py` 新增 `POST /api/video/recover-chain`，用于把同脚本后续 `chain_aborted` 分镜恢复为可重新生成状态，并清理仍占用的旧队列任务。
- 前端入口：`frontend/wanshan-recovery-tools.js` 以增强脚本方式挂入已编译前端，信息提取页显示“润色描述”，分镜/视频相关页面显示“恢复链路”。
- 回归约束：`tests/qianshan-feature-migration-contract.test.js` 已覆盖补镜、TopView、Pippit、音色、卡死中止、描述润色、链路恢复和本地模型配置边界。
| `app_settings` | KV 设置 | 已有 |
| `image_style_settings` | 图片风格设置 | 已有 |
| `novel_writing_context` | 小说创作上下文 | 已有 |
| `fusion_history` | 图片融合历史 | 已有 |
| `supplement_video_tasks` | 补镜视频任务 | 未补 |
| `cover_variants` | 小说封面变体 | 需核对万山实际是否完整 |

千山新增的重要索引：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_active_storyboard_unique
ON video_task_queue(storyboard_id)
WHERE status IN ('queued','generating')
```

万山已经补了这个索引和启动时重复活跃队列折叠逻辑。

## api 层功能图

### api/novels.py

功能：

- 小说列表、创建、上传、删除。
- 章节解析、增量导入、章节增删改、排序。
- 小说标签定义、标签分析、保存标签。
- 模板上下文：给剧本/分镜模板推荐提供题材、屏幕模式等信息。
- AI 创作大纲、章节生成、剧本转小说、剧本转剧本、批量洗稿。

技术实现：

- 调 `NovelService` 管理小说与章节。
- 调 `tag_service` 做本地关键词或 LLM 标签识别。
- 调 `LLMService` 生成大纲/章节/改写。

万山状态：

- 小说标签体系已补第一阶段。
- 原生深度嵌入 UI 还未完全复刻，当前是 `wanshan-novel-tags.js` 浮层入口。

### api/scripts.py

功能：

- 小说章节转剧本。
- 单章节转剧本。
- 剧本导入、导出 TXT/结构化格式。
- 剧本内容更新。
- `scene_meta` 读取/写入，用于场景状态、时间线、拆分信息。

技术实现：

- `ScriptService` 读取章节内容。
- 通过模板和 `LLMService` 生成剧本。
- 写入 `scripts` 表。

万山状态：

- 主流程已有。
- `sync_outdated` 字段已补，团队同步触发逻辑还没完整做。

### api/extraction.py

功能：

- 人物/场景/道具信息提取。
- 元素 CRUD。
- 生图、异步生图、取消生图。
- 参考图、成品图、宫格图上传/删除。
- 场景全景图生成、上传、截图追加、拆 9 视图宫格。
- 图片风格设置。
- 元素音频上传/删除。
- 人物马甲、马甲图、马甲音频。
- 批量全景/批量宫格任务。
- 千山新增音色相关接口：
  - `GET /api/extraction/voices`
  - `POST /api/extraction/voices/custom-audio`
  - `DELETE /api/extraction/voices/custom`
  - `POST /api/extraction/voices/preview`
  - `POST /api/extraction/element/{id}/voice`
  - `POST /api/extraction/variant/{id}/voice`
  - `POST /api/extraction/element/{id}/voice-preview`

技术实现：

- `ExtractionService` 做元素解析、保存、马甲合并。
- `ImageService` 做图片生成、全景、宫格、Qekor/GPT image 兼容。
- `voice_service.py` 做音色列表、试听合成、绑定。

万山状态：

- 批量全景/宫格后端已补。
- 批量生图前端第一阶段已补：`frontend/wanshan-extraction-batch.js`。
- `voice_id` 字段已补。
- 语音音色完整服务和 UI 未补。

### api/storyboards.py

功能：

- 剧本拆场景。
- 生成全部分镜或单场景分镜。
- 取消生成、查询生成状态。
- 分镜列表、分组、导入/导出。
- 单节重新生成。
- 起始/结尾状态提取。
- 敏感词扫描/替换。
- 分镜排序、删除、批量清空。

技术实现：

- `StoryboardService` 是最大核心服务。
- 支持本地模板 legacy 拼接和云端 assemble 拼装。
- 支持状态继承、跨章节继承、时间线/回忆/梦境隔离。
- 支持 `avoid_same_shot_size`，把上一末镜景别/机位/运镜传给远端拼装以避免连续同景别。
- 对 LLM 不规范输出有多层修复：JSON 修复、Markdown 表格 fallback、时间码归一、状态块归位。

万山状态：

- 主流程已有。
- `avoid_same_shot_size` 已补。
- 分镜模板种子已大量补齐。
- 仍需要继续做真实效果回归测试。

### api/video.py

功能：

- 即梦登录检测/登录/重新登录。
- 火山方舟视频提交。
- Pippit 小云雀配置、检测、提交。
- 单分镜视频生成。
- 批量视频生成。
- 停止批量、标记排队、异常任务恢复。
- 视频状态轮询、远端任务 claim。
- 分镜关联人物/场景/道具素材获取。
- 音频说话人识别、自动过滤非说话人音频。
- 尾帧抽取、下载、转彩铅、恢复原图。
- 额外参考图上传和描述编辑。
- TopView 链路：
  - `GET /api/video/storyboard/{id}/topview-chain`
  - `PUT /api/video/storyboard/{id}/topview-prompts`
- 上一镜尾帧：
  - `GET /api/video/storyboard/{id}/chain-prev`
- 方舟 pending 任务同步、任务列表、按 task_id 认领。

技术实现：

- `VideoService` 负责保存视频、抽尾帧、下载、状态更新。
- `services/video_providers/*` 抽象多家视频供应商。
- 素材引用从 `storyboards`、`extracted_elements`、马甲、尾帧、TopView、额外参考图组合而来。
- 千山 3.61.381 增强了 9 素材上限保序。

万山状态：

- 视频素材保序第一阶段已补。
- TopView 素材字段和视频链路部分已补。
- Pippit provider 未补。
- TopView fuse 接口和独立 UI 已补；原生编译页面尚未深度融合。

### api/queue.py

功能：

- 视频任务入队。
- 队列列表、锁状态、忙碌分镜。
- 中止、清空、重试。
- SSE 事件流。

技术实现：

- `queue_service.py` 管 DB 状态和幂等。
- `queue_worker.py` 后台串行/并行消费，调用 `api.video` 或 provider 提交。

万山状态：

- 活跃态硬幂等、重复活跃项折叠已补。
- 后续应继续观察取消、重试、下载失败恢复路径。

### api/topview_demo.py

功能：

- 把场景平视图转正俯视结构图。
- 融合俯视图 + 人物立绘 + 起始/结尾状态，生成本节结尾俯视调度图。
- 同场景续镜复用上一节底板。
- 结果落：
  - `storyboards.topview_image`
  - `storyboards.topview_prompt`
  - `storyboards.topview_start_prompt`
  - `storyboards.topview_end_prompt`
  - `storyboards.topview_dispatch_text`
- 支持删除 fuse 结果。

技术实现：

- 内置超长 TopView 场景俯视转换 prompt。
- 调 `ImageService` 做图片融合。
- 调 `LLMService` 推演调度文本。
- 从 `storyboards` 和 `extracted_elements` 匹配场景图、人物图、马甲图。
- 色标系统保证 A/B 图同一人物同色。

万山状态：

- 字段已补。
- 视频参考素材识别 TopView 已补。
- 已迁入 `backend/api/topview_demo.py`，并在 `backend/main.py` 注册 `/api/topview-demo`。
- 已接入 `frontend/wanshan-topview.js`：小说/分镜选择、图片模型/语言模型选择、生成、预览和删除。

### api/supplement_video.py

功能：

- 独立的“补镜视频”模块，不直接改正式 `storyboards/video_task_queue`。
- 创建补镜任务、编辑任务。
- 上传首帧/尾帧。
- 选择人物、场景、道具素材。
- 下载素材包 zip。
- 从正式分镜视频抓帧作为首尾帧。
- 根据脚本生成补镜分镜。
- 提交视频生成、轮询结果。

技术实现：

- `supplement_video_tasks` 表保存任务状态和素材 JSON。
- `SupplementVideoService` 匹配锚点分镜和素材。
- 复用 `StoryboardService` 的模板 assemble 逻辑。
- 复用 `video_providers` 提交视频，但不进入正式队列。

万山状态：

- 完全未补。
- 需要补表、服务、API、前端入口和测试。

### api/extra.py

功能：

- 多图融合。
- 融合历史。
- 把融合结果绑定回人物/场景/道具。
- 火山方舟私域素材库 AK/SK 配置。
- 上传人物、马甲、尾帧到火山素材库。
- 查询素材状态。

技术实现：

- `ImageService` 做融合。
- `volc_asset_service.py` 做火山签名和素材 API。
- `fusion_history` 表存融合记录。

万山状态：

- 主体已有。
- Qekor / GPT image 多参考图兼容仍需进一步对齐千山最新实现。

### api/cover.py

功能：

- 小说封面初始化。
- 图片模型列表。
- 封面生成任务。
- 封面变体、主封面设置、下载、删除、参考图上传。

技术实现：

- 调云端/本地图片模型。
- `cover_variants` 表保存封面结果。

万山状态：

- 需要核对 UI 是否完整暴露。

### api/subtitle_removal.py

功能：

- 上传视频。
- 调字幕去除处理。
- 查询状态、列表、下载、删除。

技术实现：

- `subtitle_removal_service.py`
- `tools/propainter_wrapper.py`
- `tools/vsr_wrapper.py`
- `ffmpeg.exe`

万山状态：

- 文件存在，未做本轮深测。

### api/team.py / team_script.py / team_asset.py / short_drama_sync.py

功能：

- 团队登录上下文。
- 团队分配项目同步。
- 团队剧本同步。
- 团队资产分组、同步、推送。
- 短剧项目导入。

技术实现：

- 依赖 cloud token / license context。
- 写入小说、章节、剧本、资产表。
- `scripts.sync_outdated` 用于远端更新后提示旧剧本过期。

万山状态：

- 部分文件存在，但万山产品策略偏本地版；不建议默认开放团队远端能力。

## services 层功能图

### 核心文本链路

| 文件 | 作用 |
|---|---|
| `novel_service.py` | 小说 CRUD、章节解析、增量导入、章节排序、删除媒体 |
| `novel_creation_service.py` | AI 大纲、章节创作、上下文维护 |
| `script_service.py` | 小说转剧本、导出、导入、scene_meta |
| `storyboard_service.py` | 剧本转分镜、分镜解析、状态继承、模板 assemble、JSON/表格容错 |
| `state_extractor_service.py` | 从分镜/镜头中提取人物结尾状态 |
| `sensitive_word_service.py` | 敏感词扫描和替换 |
| `tag_service.py` | 小说标签体系、关键词/LLM 分析、模板推荐上下文 |

### 模型与日志

| 文件 | 作用 |
|---|---|
| `llm_service.py` | OpenAI 兼容、Gemini、代理、admin proxy、重试、日志接入 |
| `cloud_llm_sync.py` | 从云端同步模型配置、获取激活配置和密钥 |
| `cloud_token_service.py` | 云 token 保存/读取 |
| `model_presets.py` | 模型预设、供应商预设同步 |
| `log_service.py` | LLM 日志、运行中清理、base64 清洗 |
| `usage_report_service.py` | 使用量上报 |

### 图片与资产

| 文件 | 作用 |
|---|---|
| `image_service.py` | 生图、图生图、融合、全景、Qekor/GPT image 兼容 |
| `panorama_service.py` | 720 全景拆视图/宫格相关能力 |
| `watermark_service.py` | AI 水印、人脸区域避让 |
| `volc_asset_service.py` | 火山私域素材库签名、上传、状态查询 |
| `last_frame_picker.py` | 从视频候选帧中挑选最佳尾帧 |
| `extraction_service.py` | 人物/场景/道具资产 CRUD、图片/音频字段、马甲合并 |

### 视频与队列

| 文件 | 作用 |
|---|---|
| `video_service.py` | 视频保存、下载、抽尾帧、状态更新、路径处理 |
| `queue_service.py` | 视频队列 DB 状态、锁、入队、幂等、失败/重试/清空 |
| `queue_worker.py` | 后台消费队列、提交视频、轮询、下载、错误恢复 |
| `supplement_video_service.py` | 补镜视频任务，万山未补 |

### 语音

| 文件 | 作用 |
|---|---|
| `voice_service.py` | 内置音色表、自定义音频库、试听合成、角色/马甲绑定，万山未补完整服务 |

### 团队/设置/安全

| 文件 | 作用 |
|---|---|
| `team_context_service.py` | 团队上下文 |
| `settings_service.py` | app_settings KV |
| `license_context.py` | 授权 key / machine / cloud token 上下文 |
| `parser_rule_service.py` | 解析规则读取 |
| `utils.py` | 通用小工具 |

## video_providers

| 文件 | 作用 | 万山状态 |
|---|---|---|
| `base.py` | provider 抽象：submit/query/cancel/list/check_login | 已有 |
| `jimeng.py` | 即梦 CLI/自动化提交 | 已有 |
| `volcengine_ark.py` | 火山方舟视频 API | 已有 |
| `cool.py` | Cool 视频通道 | 已有 |
| `xinglian.py` | 星链云视频通道 | 已有 |
| `pippit.py` | 小云雀/Pippit，支持 CLI/API、上传媒体、thread/run、下载结果 | 未补 |

## utils

| 文件 | 作用 |
|---|---|
| `paths.py` | 数据目录、媒体目录、DB 相对路径解析 |
| `local_signature.py` | 本机前端请求签名，保护模板/模型接口 |
| `local_secret.py` | 本机 session secret |
| `client_signature.py` | 客户端签名辅助 |
| `content_crypto.py` | 内容加密/解密辅助 |
| `log_sanitizer.py` | 日志敏感信息脱敏 |
| `ssl_helper.py` | aiohttp/httpx SSL connector 辅助 |
| `timezone.py` | 北京时间 |
| `unicode_utils.py` | Unicode 清理 |

## public 静态资源

```text
resources/public
├── activation-bg.mp4
├── favicon.png
├── 灵芽配置教程.pdf
└── voice-previews
    ├── sonicvalue_voices.json
    ├── README.txt
    └── 大量 mp3 试听文件
```

`voice-previews` 是语音系统的重要配套资源。万山现在没有完整接入音色服务，因此这些试听资源也未纳入产品功能。

## 千山有、万山没有的源码文件

通过相对路径对比，千山有而万山没有：

```text
api/supplement_video.py
services/supplement_video_service.py
services/video_providers/pippit.py
services/voice_service.py
FINAL_INVESTIGATION_REPORT.py
test_find_best_match.py
test_topview_paths.py
```

注：`api/topview_demo.py` 和 `test_topview_paths.py` 已在本轮迁入漫剧虾，不再属于“万山没有”。

万山有而千山没有，属于二开新增：

```text
api/qianshan_lab.py
services/qianshan_storyboard_lab.py
services/offline_guard.py
services/secure_secrets.py
services/trusted_providers.py
services/wanshan_prompt_seed.py
test_cors_policy.py
test_llm_config_signature.py
test_local_llm_configs.py
test_novel_json_repair.py
test_qianshan_storyboard_lab.py
test_queue_active_idempotency.py
test_secure_secrets.py
test_storyboard_camera_continuity.py
test_storyboard_template_eligibility.py
test_trusted_providers.py
test_video_asset_priority.py
```

## 目前万山仍缺什么

### 1. 补镜视频完整模块

缺：

- `supplement_video_tasks` 表
- `api/supplement_video.py`
- `services/supplement_video_service.py`
- 前端“其他功能/补镜视频”页面入口
- 补镜视频端到端测试

可实现能力：

- 针对已有成片中间缺镜头，独立创建补镜任务。
- 可上传首尾帧或从已有分镜视频抓帧。
- 可自动匹配人物/场景/道具素材。
- 可生成补镜分镜和补镜视频。
- 可导出素材包给外部制作。

### 2. TopView fuse 接口和 UI

已补：

- `backend/api/topview_demo.py`
- `frontend/wanshan-topview.js` 俯视调度入口、模型选择、生成、预览和删除
- `backend/test_topview_paths.py`
- `tests/topview-frontend-contract.test.js`

当前状态：

- 数据库字段、视频素材保序识别、TopView fuse 接口和独立浮层均已补。
- 仍需配置图片/语言模型做一次真实端到端生成验证；本轮未构建安装包。

可实现能力：

- 给每节分镜生成俯视调度图。
- 用 A/B 图约束同一场景中角色站位连续性。
- 辅助视频模型保持人物位置、道具、朝向关系一致。

### 3. 语音音色系统

缺：

- `services/voice_service.py`
- `api/extraction.py` 中音色相关完整端点
- 前端音色选择、试听、绑定 UI
- `resources/public/voice-previews` 资源接入

已补：

- `extracted_elements.voice_id` 字段。

可实现能力：

- 给人物/马甲绑定音色。
- 使用内置音色或本地上传音频作为音色。
- 试听音色。
- 后续可扩展台词批量配音。

### 4. Pippit 小云雀视频通道

缺：

- `services/video_providers/pippit.py`
- `api/video.py` 里 Pippit 配置/检测/提交完整逻辑
- 前端 provider 选择和配置 UI
- Pippit 端到端测试

可实现能力：

- 通过 Pippit CLI/API 提交视频任务。
- 上传多媒体素材。
- 查询 thread/run 状态。
- 下载生成视频。

风险：

- 依赖第三方凭证或 CLI。
- 要确认是否符合万山商业版的账号/密钥策略。

### 5. 前端原生复刻还不完整

已补：

- 小说标签浮层。
- 信息提取批量生图浮层。
- 分镜模板种子和排序大量补齐。

未完全复刻：

- 千山信息提取页原生卡片多选、成功自动取消选中、失败保持选中。
- TopView 原生按钮和面板。
- 语音音色弹窗。
- 补镜视频页面。
- Pippit 配置入口。

原因：

- 千山前端是编译产物，不是原始源码。
- 直接覆盖会带回千山品牌、登录态、远端 URL、账号入口和云端依赖，容易破坏万山商业授权和本地配置。

### 6. Qekor/GPT image 多参考图兼容需继续核对

千山 `image_service.py` 和 `api/extra.py` 对 Qekor/GPT image 参考图做了额外适配。万山已有相关功能，但还没有针对这些 provider 做真实图片回归测试。

## 建议下一步移植顺序

1. 补镜视频后端表、服务、API，先不做复杂 UI。
2. TopView 原生页面深度融合；当前独立浮层已可用，后续再替换为编译前端组件。
3. 语音音色服务，先支持本地音频绑定和内置试听，再接外部 TTS。
4. Pippit provider，等确认账号/凭证/产品策略后再接。
5. 前端深度复刻，把浮层入口逐步改成原生页面组件。
6. Qekor/GPT image 多参考图真实回归测试。

## AI 接手注意事项

- 不要复制千山 `data/app.db*`、日志、session、缓存、备份库。
- 不要整包覆盖万山 `frontend/assets`。
- 每移植一个模块先补 schema 测试或接口测试，再动实现。
- 涉及远端云同步、团队、Pippit、TTS 的功能，默认视为有外部数据流，必须先确认万山产品策略。
- 万山商业授权、完整性校验、本地模型配置是二开核心，不要被千山文件覆盖掉。
- 后端源码可参考千山逐模块迁移；前端只能参考编译产物行为，不能假设有原 Vue 源码。

## 2026-07-17 功能迁移增量

本轮已将以下千山功能以漫剧虾本地架构重新接入：

- 语音音色：`backend/services/voice_service.py`、音色列表/试听/绑定/自定义音频接口，以及 `frontend/wanshan-voice.js`。
- 预置试听资源：只复制 `public/voice-previews`，通过受限 `/public/{filename}` 路由提供，不暴露安装目录。
- 补镜视频：`supplement_video_tasks` 本地表、任务/素材/首尾帧/分镜生成/视频生成/轮询 API，以及 `frontend/wanshan-supplement-video.js`。
- 小云雀：`services/video_providers/pippit.py`、本地 Access Key 配置、检测、提交、统一轮询和本地归档；配置入口为 `frontend/wanshan-pippit.js`。
- 卡住任务处理：新增 `/api/video/abort-stuck-video`，只解除本地占用，不假设上游任务已取消。

边界保持不变：模型配置仍从漫剧虾本地配置读取；小云雀 Access Key 只存本机 `app_settings`；没有复制千山 Cookie、数据库、日志、缓存或远端配置。真实 Pippit CLI/凭证端到端测试仍待具备测试凭证后执行。
