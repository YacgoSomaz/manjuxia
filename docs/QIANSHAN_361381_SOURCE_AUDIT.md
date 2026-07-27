# 千山 3.61.381 源码阅读与万山差异清单

更新时间：2026-07-17

## 来源

- 千山安装目录：`D:\qianshan\xiaoyangmengjuchang`
- 千山后端源码：`D:\qianshan\xiaoyangmengjuchang\resources\backend`
- 千山前端包：`D:\qianshan\xiaoyangmengjuchang\resources\app.asar`
- 千山版本：`3.61.381`
- 千山更新源：`https://qianshan-ai.oss-cn-chengdu.aliyuncs.com/xiaoshuotool/app/3.61.381/`
- 万山源码目录：`D:\万山项目`

注意：千山目录里包含 `data/app.db*`、日志、缓存、`__pycache__` 和历史备份库。这些是运行数据，不应复制进万山源码或商业包。

## 已确认的千山近期更新

从千山更新日志与源码注释确认的近期重点：

- `3.61.382`：修复剧本内容编辑、对白角色误判、TopView 图片刷新、Qekor 参考图走 images/edits、日志取消等。
- `3.61.381`：优化视频素材超过 9 个时的自动保序，优先保留主要人物、主场景、道具、用户关键帧、尾帧、TopView A/B。
- `3.61.380`：优化信息提取页加载速度，批量全景/宫格任务可跨刷新/切菜单继续。
- `3.61.379`：信息提取页批量生图改造：卡片多选、批量全景、全景自动拆 9 视图、批量宫格图、可停止后续任务。
- `3.61.374`：新增作品标签体系：西方玄幻、超自然等；支持小说标签、模板推荐、题材识别。
- `3.61.365+`：TopView/俯视调度图、场景 A/B 调度、视频素材链路多轮优化。

## 本次已移植到万山的内容

### TopView 俯视人物调度图（本轮新增）

- 从千山 `resources/backend/api/topview_demo.py` 迁入漫剧虾 `backend/api/topview_demo.py`，继续使用漫剧虾本地 `ImageService`、`LLMService`、媒体路径和数据库。
- 在 `backend/main.py` 注册 `POST/DELETE /api/topview-demo/storyboard/{storyboard_id}/fuse`。
- 新增 `frontend/wanshan-topview.js`：选择小说、分镜、图片模型和语言模型，生成/预览/删除俯视调度图。
- 新增 `tests/topview-frontend-contract.test.js` 和 `backend/test_topview_paths.py`。
- 未迁移千山 Cookie、账号态、数据库、日志、缓存和远端接口。

当前边界：前端使用独立浮层，不覆盖漫剧虾现有编译产物；真实生图需用户在漫剧虾本地配置图片模型后测试。

### 小说标签

已移植：

- `backend/services/tag_service.py`
- `tag_definitions` 数据表
- `novel_tags` 数据表
- `GET /api/novels/tag-definitions`
- `POST /api/novels/analyze-tags`
- `GET /api/novels/{novel_id}/tags`
- `PUT /api/novels/{novel_id}/tags`
- `POST /api/novels/{novel_id}/tags/analyze`
- 小说列表和详情携带 `novel_tags`
- 模板上下文携带 `novel_tag_genres` 和 `screen_mode`
- 前端轻量入口：`frontend/wanshan-novel-tags.js`

万山侧改动：自动打标只走本地关键词规则，不会在导入小说后静默调用外部模型。用户主动点击“AI分析题材”时才走已配置的大模型。

尚未完全对齐千山：

- 千山原前端是深度嵌入小说导入弹窗和小说列表的标签 UI；万山当前是独立挂件。
- 千山会在部分转换流程强制要求标签完整；万山目前没有强制拦截，避免旧项目突然无法转换。

### 信息提取批量任务后端

已移植同名后端接口：

- `POST /api/extraction/batch/start`
- `GET /api/extraction/batch/active`
- `GET /api/extraction/batch/{job_id}`
- `POST /api/extraction/batch/{job_id}/stop`

当前实现复用万山已有单卡片能力：

- 批量全景：调用 `generate_panorama_endpoint`，再调用 `panorama_to_grid_endpoint(view_count=9)`。
- 批量宫格：调用 `generate_grid_image`。
- 刷新页面后可查询进程内任务状态。
- 停止任务只阻止派发后续卡片，当前图片请求自然收尾。
- 前端已补独立入口：`frontend/wanshan-extraction-batch.js`，在信息提取页浮出“批量生图”面板。

尚未完全对齐千山：

- 千山前端是深度嵌入卡片区的多选 UI；万山当前先用独立浮层面板，不直接改编译后的主 Vue 包。
- 千山的 `ExtractionView` 新版还包含更多声音、TopView、团队资产联动逻辑，不能直接整体覆盖，否则会破坏万山本地模型配置和商业授权差异。

## 仍缺失或未完全移植的功能

### 1. 补镜视频

千山新增文件：

- `api/supplement_video.py`
- `services/supplement_video_service.py`

主要接口：

- `GET /api/supplement-video/tasks`
- `POST /api/supplement-video/tasks`
- `GET /api/supplement-video/tasks/{task_id}`
- `PUT /api/supplement-video/tasks/{task_id}`
- `DELETE /api/supplement-video/tasks/{task_id}`
- `POST /api/supplement-video/tasks/{task_id}/upload-frame`
- `PUT /api/supplement-video/tasks/{task_id}/materials`
- `GET /api/supplement-video/tasks/{task_id}/materials.zip`
- `GET /api/supplement-video/tasks/{task_id}/frame-sources`
- `POST /api/supplement-video/tasks/{task_id}/capture-frame`
- `POST /api/supplement-video/tasks/{task_id}/generate-storyboard`
- `POST /api/supplement-video/tasks/{task_id}/generate-video`
- `POST /api/supplement-video/tasks/{task_id}/poll`

数据库依赖：

- `supplement_video_tasks`

移植风险：

- 依赖视频服务、素材压缩、帧截取、补镜分镜生成。
- 前端入口在“其他功能/补镜视频”一类页面，万山主前端还未接入。

建议优先级：中高。它是独立模块，适合单独移植，但必须补数据库表和前端入口。

### 2. TopView / 俯视调度图

千山新增文件：

- `api/topview_demo.py`
- `test_topview_paths.py`

主要接口（千山旧记录）：

- `POST /api/topview/storyboard/{storyboard_id}/fuse`
- `DELETE /api/topview/storyboard/{storyboard_id}/fuse`

漫剧虾适配后的实际接口：

- `POST /api/topview-demo/storyboard/{storyboard_id}/fuse`
- `DELETE /api/topview-demo/storyboard/{storyboard_id}/fuse`

数据库字段：

- `storyboards.topview_image`
- `storyboards.topview_prompt`
- `storyboards.topview_start_prompt`
- `storyboards.topview_end_prompt`
- `storyboards.topview_dispatch_text`
- `storyboards.start_frame_image`
- `storyboards.end_frame_image`

万山当前状态：

- 已补齐上述数据库字段和 `StoryboardUpdate` / `StoryboardResponse` 兼容字段。
- 已让视频参考图链路识别 `topview_dispatch`，并在素材超过上限时按千山优先级保留 TopView A/B。
- 已移植为漫剧虾本地 `/api/topview-demo/storyboard/{storyboard_id}/fuse`，并增加独立 TopView 操作面板。

移植风险：

- 跟分镜卡片、视频素材保序、首尾帧、A/B 图、TopView 刷新强相关。
- 需要同时看 `storyboard_service.py`、`video.py`、`queue_worker.py`、前端 `VideoView` / `StoryboardView`。

建议优先级：高。基础字段和视频素材链路已补，下一步是独立移植 TopView fuse 接口与前端入口。

### 3. 语音/音色系统

千山新增文件：

- `services/voice_service.py`

千山 `api/extraction.py` 新增语音相关端点，关键能力包括：

- 获取预设/自定义音色列表
- 上传自定义音频音色
- 删除自定义音色
- 试听音色
- 给人物绑定 `voice_id`
- 从角色已有音频或全局音色库解析音色

数据库字段：

- `extracted_elements.voice_id`

万山当前状态：

- 已补齐 `extracted_elements.voice_id` 和响应模型字段。
- 尚未移植 `voice_service.py`、音色列表、试听、上传、删除和角色绑定接口。

移植风险：

- 依赖 `cloud_llm_sync` 的 `voice` 配置类型。
- 涉及外部 TTS 计费和音频版权。
- 商业版需要明确是否开放语音配置，避免用户误用不可授权音色。

建议优先级：中。先补字段和本地自定义音频绑定，再考虑外部 TTS。

### 4. Pippit 视频通道

千山新增文件：

- `services/video_providers/pippit.py`

移植风险：

- 可能依赖第三方接口、账号、Cookie 或特定 API Key。
- 需要同步 `video_service.py`、`video.py`、`queue_worker.py` 中 provider 分发逻辑。

建议优先级：低到中。除非确认用户需要 Pippit，否则先保留现有即梦/火山/兼容通道。

### 5. 视频素材保序和 9 素材上限策略

千山 `3.61.381` 更新重点是超过 9 个素材时的保序规则：

- 主要人物
- 主场景
- 道具
- 用户关键帧
- 尾帧
- TopView A/B

涉及文件：

- `api/video.py`
- `services/video_service.py`
- `services/queue_worker.py`
- `services/storyboard_service.py`

万山当前状态：

- 已局部移植 `api/video.py` 中的素材优先级选择逻辑。
- 已覆盖单元测试：主要人物/主场景/道具/用户关键帧/尾帧/TopView 优先保留，超出上限时裁掉低优先级图。

移植风险：

- 如果只复制单个文件，容易破坏万山已有视频 provider 和授权上下文。
- 需要先写素材排序单元测试，再局部迁移排序函数。

建议优先级：已完成第一阶段。后续如移植完整 TopView 和补镜视频，再补跨模块集成测试。

### 6. 剧本同步脏标记

千山数据库和模型新增：

- `scripts.sync_outdated`

用途：

- 团队同步把某集剧本覆盖更新后，标记该集“未转换/已过期”，避免继续使用旧分镜或旧脚本。

万山当前状态：

- 已补齐 `scripts.sync_outdated` 数据库字段和 `ScriptListItem` 响应字段。
- 尚未接入团队同步流程，本地版目前不会主动设置该标记。

移植风险：

- 主要服务团队同步和远端项目。
- 万山当前更偏本地版，是否需要完整团队同步要先定产品策略。

建议优先级：字段已补；团队同步逻辑仍后置。

### 7. 队列活跃态幂等

千山数据库新增/迁移：

- 活跃视频队列按 `storyboard_id` 做硬幂等。
- 启动时折叠重复活跃队列项。

涉及文件：

- `database/db.py`
- `services/queue_service.py`
- `services/queue_worker.py`
- `api/queue.py`

移植风险：

- 影响视频队列稳定性，是正向修复。

万山当前状态：

- 已在 `database/db.py` 启动迁移中折叠历史重复活跃队列项。
- 已创建 `idx_queue_active_storyboard_unique` 部分唯一索引。
- 已在 `services/queue_service.py` 入队事务中复用或折叠同一分镜活跃项。
- 已补 `backend/test_queue_active_idempotency.py` 覆盖。

建议优先级：已完成第一阶段。后续观察长任务 worker 与取消/重试路径。

### 8. Qekor / 多参考图融合修复

千山 `3.61.382` 提到：

- Qekor 参考图需要走 `images/edits`。
- 多参考图融合白名单和不同图片通道的兼容逻辑有更新。

涉及文件：

- `api/extra.py`
- `services/image_service.py`
- `services/model_presets.py`

移植风险：

- 依赖具体图片通道行为，不能盲目改。

建议优先级：中。需要用真实图片配置测试。

### 9. 前端主包差异

千山前端 `app.asar` 已解包到本地临时目录时可见：

- `assets/index-8yDDLKzn.js`
- `assets/NovelsView-C80QUUSO.js`
- `assets/novels-Z5L5bOpH.js`
- `assets/ExtractionView-B3wYf6nO.js`
- `assets/extraction-DJEdOpGm.js`
- `assets/ExtraToolsView-D0Aa4oVq.js`
- `assets/VideoView-CZdfAK1c.js`

万山前端当前保留独立注入脚本：

- `frontend/wanshan-local-config.js`
- `frontend/wanshan-novel-tags.js`

不建议直接覆盖千山前端主包，原因：

- 会恢复千山品牌、登录态、远端 URL、更新日志、账号入口。
- 会覆盖万山本地模型配置。
- 可能破坏商业授权路由守卫。
- 会引入团队/云端接口依赖，导致本地版用户报错。

建议做法：

- 对新增模块优先用独立注入脚本或局部兼容接口。
- 如果必须深度复刻 UI，再逐个页面反编译阅读，不能整包替换。

## 新增/差异文件清单

千山有、万山仍没有的源码文件：

- `api/supplement_video.py`
- `services/supplement_video_service.py`
- `services/video_providers/pippit.py`
- `services/voice_service.py`
- `FINAL_INVESTIGATION_REPORT.py`
- `test_find_best_match.py`

万山有、千山没有的万山专用文件：

- `api/qianshan_lab.py`
- `services/qianshan_storyboard_lab.py`
- `services/wanshan_prompt_seed.py`
- `services/offline_guard.py`
- `services/secure_secrets.py`
- `services/trusted_providers.py`
- 本地安全、商业授权、提示词种子和实验台相关测试文件

## 建议移植顺序

### 第一批：稳定性和效果直接相关

1. 队列活跃态幂等与重复任务折叠。已完成第一阶段。
2. 视频素材保序策略。已完成第一阶段。
3. TopView 字段和素材链路。基础字段与视频保序已完成，fuse 接口和 UI 未完成。
4. 信息提取批量前端 UI。已完成第一阶段，使用独立浮层入口。

### 第二批：独立功能模块

1. 补镜视频后端表与服务。
2. 补镜视频前端入口。
3. 语音/音色本地绑定。
4. 语音试听和外部 TTS。

### 第三批：外部通道和团队能力

1. Pippit provider。
2. Qekor / 图片通道修复。
3. 团队同步脏标记。
4. 团队资产联动与远端项目同步。

## 移植原则

- 不复制千山运行数据、数据库、Cookie、日志、缓存。
- 不整包覆盖万山前端。
- 优先移植后端稳定接口，再补前端入口。
- 涉及远端账号、团队、云端模型配置的功能必须先确认产品策略。
- 本地优先功能不得在用户无感知情况下上传小说正文、剧本、素材或 API Key。
- 每移植一块，都要补 `CHANGELOG.md` 和本文件，避免后续遗忘。

## 本轮完成情况（2026-07-17）

- 已补入语音服务、预置试听资源、补镜视频任务链路、小云雀本地 CLI 通道和主动中止卡住任务。
- 已用 Playwright 对千山登录后的正常工作台页面做控件/请求路径对照；只保存页面结构与接口路径，不保存 Cookie、会话令牌、小说正文或账号数据。
- 漫剧虾仍保持本地模型配置边界，未修改千山、anyq.site、支付回调、数据库或签名私钥。
- 尚未构建正式安装包；下一步应先通过 Node/Python 静态检查，再用带测试数据的漫剧虾本地进程验证 UI 与接口。
