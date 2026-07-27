# Changelog

## Unreleased - Electron 核心 V8 字节码保护（2026-07-24）

- 商业构建在 JavaScript 混淆后，将 Electron 主进程核心模块编译为与 Electron 43 主进程兼容的 V8 `.jsc` 字节码；不再把账户、更新、完整性、官方算力桥等原始 `.js` 随包保留。
- 保留极小 `electron/main.js` 加载器，只负责加载 `bytenode` 与 `main.jsc`，不包含授权规则、远端公钥或业务决策。`preload.js` 位于 Electron 隔离渲染上下文，不能复用主进程缓存数据，因此保留混淆 JS，避免 `cachedDataRejected` 白屏。
- 构建使用 Electron 主进程编译模式，避免 Electron 42+ 通过 `ELECTRON_RUN_AS_NODE` 编译导致的 `SIGTRAP` 启动崩溃；并在编译前转换箭头函数，规避 V8 字节码的已知 Electron 限制。
- 渲染页面脚本仍由浏览器执行，因此保留混淆而不强制转 `.jsc`；会员与官方算力权限继续由签名权益和服务端接口最终裁决。

## Unreleased - 官方入口、积分与历史成片（2026-07-23）

- 语言和图片模型下拉框旁增加“自配算力 / 官方算力”来源按钮；官方任务必须来自 anyq.site 目录并满足 `enabled=true`、`available=true`，视频/语音未开放时不伪造入口。
- 账号页脚从已验签的 `account_license.payload` 展示语言、图片、视频剩余积分；不读取未签名根字段，缺失余额显示 `-`。
- 新增侧边栏“历史成片”页和 `/api/video/history`，展示本机数据库中已完成的视频，并对已被移动/删除的文件给出明确状态。
- 新增 `account-credit-ui.test.js`、`official-source-controls.test.js`、`video-history-contract.test.js` 契约测试；本次未修改 anyq.site 服务端，也未构建安装包。

## Unreleased - 账号页脚修正（2026-07-23）

- 未登录时显示“登录”按钮，不再显示“退出登录”。
- 积分区域统一显示为“积分余额”，只读取签名载荷中的总余额字段；没有总余额时显示 `-`，不擅自合并不同算力类别。
- 源码基准版本同步到当前已发布的 `0.1.30`，商业构建仍以发布脚本传入版本为准。
- 积分余额改为按统一协议从官方算力目录读取：`GET /api/v1/ai/catalog?product_id=comic_shrimp`；该余额仅用于界面展示，会员授权仍只信已验签 `account_license.payload`。

## Unreleased - 官方 AI 算力下拉接入（2026-07-23）

- 官方语言/图片算力与本地自定义配置分开，直接注入现有模型下拉菜单；不要求用户进入设置页填写远端参数。
- 官方固定使用 `comic_shrimp` / `comic_course` 和 `X-Product-Code: comic_shrimp`；只有目录同时返回 `enabled=true`、`available=true` 的任务才能显示或提交。
- 官方目录、任务提交和任务查询只由主进程代理到 `https://anyq.site`；请求体不包含模型地址、API Key、模型名、provider 或 system prompt。
- 价格、余额、开放状态由服务端目录返回；官方算力未配置、会员未开通、余额不足、限流和上游错误分别提示，禁止静默回退本地模型。
- 任务幂等键按一次用户操作生成并在重试时复用；客户端不自行扣积分。
- 图片结果优先使用 `result_assets[].display_url`，兼容 `download_url`；预览有加载失败状态，保存由 Electron 主进程 HTTPS 下载。
- 官方语言任务完成后通过本地 `/api/scripts/official-result` 保存章节剧本；本地不再次调用模型。
- 更新 `tests/official-ai-client.test.js`、`tests/official-ai-frontend.test.js` 和 `tests/official-image-frontend-contract.test.js`；本次改动需要重新打包后才会进入安装包。
- 未修改 anyq.site 的 `server.js`、数据库、支付回调或签名私钥。

## Unreleased - 账号权益快照续签与缓存修复（2026-07-20）

- Electron 账号请求统一增加 `cache: "no-store"`、`Cache-Control: no-cache` 和 `Pragma: no-cache`。
- 新增跨越 600 秒的假时钟回归测试：每 60 秒刷新会拿到新的 `issued_at/signed_until`，不会错误降级。
- 网络失败仅在已验签快照尚未过期时保留短期离线权益；快照过期后返回 `signature_expired`、清理本地权益并阻止付费功能。
- 账号状态同步到渲染层，区分服务端未开通/停用、短期离线和快照过期。
- 账号服务 `/api/auth/me` 的所有分支固定使用 `private, no-store`、`Pragma: no-cache` 和产品/会话 `Vary`，线上不再依赖 ETag/304。
- 线上增加脱敏 `[AUTH_ME]` 诊断日志，不记录 Cookie、短信码、签名私钥或完整手机号；未修改数据库、支付回调或签名私钥。

## 0.1.28 - 2026-07-20

### 发布结果

- 已构建漫剧虾商业安装包：`packaging/release/installer/comic-shrimp/0.1.28/漫剧虾Setup_0.1.28.exe`。
- 安装包大小：`244051356` 字节；SHA-256：`a53d92eb0ad67cfeb13ea6c29262eedc33f465e8aa34421a4000327d013b6d16`。
- 发布前 Node 测试 36/36、Python 定向测试 4/4、后端冒烟测试、完整性清单签名和发布扫描通过。
- 完整性清单改为 `version=2 / scope=core`，只校验固定核心文件；用户运行时新增文件不再阻断启动。
- Authenticode 状态为 `NotSigned`；正式对外发布前必须注入代码签名证书后重新构建。

## Unreleased - 完整性校验放宽

- 将启动完整性清单收窄为固定核心文件：主 EXE、Electron 启动/鉴权/本地桥接/更新文件、发布配置和 `backend-server.exe`。
- 不再把 Python 运行库、DLL、用户生成的图片/视频/音频、数据库、缓存和清单外新增文件当作启动失败条件。
- 保留 Ed25519 清单签名和核心文件 SHA-256 校验，核心逻辑被篡改时仍拒绝启动。
- 现有安装包不会自动获得该修复，必须重新构建并安装新版本。

## 0.1.27 - 2026-07-17

### 发布结果

- 已构建漫剧虾商业安装包：`packaging/release/installer/comic-shrimp/0.1.27/漫剧虾Setup_0.1.27.exe`。
- 安装包大小：`244100477` 字节；SHA-256：`d0639d20a953452f36bd0cc0b329b48f79a2e247a4bbe5f0ce7ba9d82f0d5e06`。
- 发布前 Node 测试 36/36、Python 定向测试 4/4、完整性清单签名和发布扫描通过。
- Authenticode 状态为 `NotSigned`；正式对外发布前必须注入代码签名证书后重新构建，不能伪造签名。

### 千山分镜模板清洗版

- 商业包内置千山 ID23–ID51、ID62 共 30 条清洗版分镜正文，按 `qianshan_id` 顺序展示。
- 启动时会把旧预置分镜行迁移为当前 30 条，并保留用户自建模板；模型配置仍走漫剧虾本地配置，不依赖千山远端模板接口。

## Unreleased - 2026-07-17

### 千山清洗版分镜模板完整迁移

- 用 `千山分镜提示词_清洗版` 中 ID23–ID51、ID62 的 30 份逐条清洗正文替换漫剧虾原有分镜种子；原始文件和清洗审计文件仍保留在外部归档目录，不在项目内改写。
- 正式选择器只保留这 30 个当前模板，移除旧版、测试版和差异备份行；每行写入 `qianshan_id`、`source`、`sort_order` 和正文 SHA-256，前端按千山 ID 顺序展示。
- SQLite `prompt_templates` 自动迁移新增本地来源和排序字段；已有安装启动时会清理旧预置分镜行，不删除用户自建模板。
- 分镜模板正文保持本地模型配置链路，不请求千山远端模板接口；`admin_id` 保持为空，避免把本地正文误判为远端受保护模板。
- 发布脚本新增分镜种子与千山前端对齐测试，确保正式安装包不会漏掉 30 份完整正文。

## Unreleased - 2026-07-17

### 漫剧虾对齐千山功能

- 从千山迁入俯视人物调度图后端模块 `backend/api/topview_demo.py`，并在 `backend/main.py` 注册生成与删除接口。
- 新增漫剧虾独立入口 `frontend/wanshan-topview.js`：选择小说和分镜、选择图片/语言模型、生成俯视调度图、预览结果、删除结果。
- 俯视调度图继续写入漫剧虾本地 `storyboards` 字段，并沿用现有视频素材保序链路；不会复制千山 Cookie、数据库、日志或远端登录态。
- 新增 `tests/topview-frontend-contract.test.js` 和 `backend/test_topview_paths.py`，覆盖接口契约、模型配置入口和媒体路径解析。
- 本次仅修改漫剧虾客户端源码和文档，未修改远端 `server.js`、数据库、支付回调或签名私钥；未构建正式安装包。
- 继续补齐千山功能差异：新增 `supplement_video_tasks` 本地表、补镜视频 API/前端入口、Pippit 本地 CLI 配置/提交/轮询链路、用户主动中止卡住任务。
- 漫剧虾已有的语音后端接口接入了 `voice_service.py`，新增本地预置音色资源 `/public/voice-previews` 和“音色管理”入口；试听、Access Key 等敏感值不写入前端日志。
- 小云雀 Access Key 只写入漫剧虾本机 `app_settings`，视频模型配置仍走漫剧虾本地配置；未复制千山 Cookie、数据库、日志或云端模型配置。
- `Build-ElectronApp.ps1` 会把 `public/voice-previews` 一并放入安装包，新增 `qianshan-feature-migration-contract.test.js` 覆盖路由注册、资源打包和本地配置边界。
- 补齐旧版明面功能缺口：新增千山原版 `/api/extraction/element/{element_id}/polish-description`，只支持人物描述润色，返回原版 `description` 字段，不自动写回本地资产库。
- 新增 `/api/video/recover-chain`，用于串行尾帧失败后清理后续 `chain_aborted` 状态和旧队列占用，让用户可继续重新生成。
- 新增 `frontend/wanshan-recovery-tools.js`，在信息提取页提供“润色描述”，在分镜/视频页提供“恢复链路”；弹窗支持关闭按钮、遮罩关闭和 ESC 关闭。

### 更新提示体验

- 普通签名更新不再弹出全屏更新对话框，改为工作台左下角的非打扰通知，显示版本和更新说明；用户可选择稍后或主动开始下载。
- 普通更新下载期间在左下角显示进度和失败重试；强制更新仍由原有不可关闭对话框处理。
- 在 Electron preload 桥接层分流普通/强制更新，避免渲染层改写桥接对象导致打包环境行为不一致；本次只改客户端，未构建正式安装包。

## 0.1.23 - 2026-07-16

### 发布结果

- 已构建漫剧虾商业安装包：`packaging/release/installer/comic-shrimp/0.1.23/漫剧虾Setup_0.1.23.exe`。
- 安装包大小：`236800728` 字节；SHA-256：`f835706e49724eac21ae6f8a540548c268e314f29921f6004e4210024427ed15`。
- 发布前 Node 测试、Python 测试、后端冒烟测试、完整性清单签名和发布扫描通过。
- Authenticode 状态为 `NotSigned`；正式对外发布前必须注入代码签名证书后重新构建，不能伪造签名。

### 批量生图稳定性

- 修复批量生图每 15 秒刷新资产状态时触发全页黑色 loading 遮罩的问题；生成期间只保留卡片级状态，用户可以继续查看其他资产和切换页面。
- 扩展 OpenAI 兼容图片响应解析，兼容中转常见的嵌套 `image_url`、`image`、`base64` 和 Markdown 图片 URL，避免接口已返回图片但客户端误报“无法获取生成的图片”。
- 新增前端稳定性和后端图片结果解析回归测试；本次未构建正式安装包。

### 账号与产品边界

- 漫剧虾客户端统一使用 `comic_shrimp` 产品 ID 和 `comic_course` 权益；不能因为购买其他产品而解锁漫剧虾。
- 登录态使用手机号验证码和 `anyq.site` 账号接口，客户端只信任服务端签名的 `account_license`，不使用未签名根节点字段作为授权依据。
- 保留登录后的工作台可见性；没有会员时，点击具体会员功能再提示权益不足，不在启动阶段连续弹出模型/模板错误。
- 修复后台停用产品后客户端继续沿用旧权益快照的问题：启动鉴权先向服务器校验，再同步本地后端上下文；明确停用/未授权会立即回到账号页，不再被当作“已登录所以继续可用”。
- 付费操作不再调用 `verifyCached()`，而是重新请求权威账号接口；账号页的“刷新权限”也改为服务端校验。运行中的权益刷新间隔收紧为 60 秒，网络短暂失败仍可使用已验签快照。

### 小说导入与本地安全通道

- 小说创建、文件上传、章节解析和增量导入不再要求商业会员，作为基础本地工作流开放。
- 以上接口仍经过 Electron 与本地后端之间的 HMAC 签名通道，不是关闭全部安全校验。
- 修复 Electron `FormData` 在签名 fetch 层被错误计算为空请求体的问题；新增 `frontend/multipart-fetch-bridge.js` 和 `frontend/multipart-fetch-finalizer.js`，真实上传会先物化 multipart 字节再签名发送。
- 增加商业守卫回归测试，确保小说导入放行而脚本转换、标签保存、生成、导出等付费动作仍受保护。

### 启动器、安装与更新

- 启动页会在本地后端握手完成前保持显示，避免用户看到空白工作台；发布前测试已同步这一实际启动时序。
- 保留单实例启动和二次启动聚焦已有窗口的行为。
- 更新器只消费签名的 `update-v1` 产品发布载荷，校验产品、版本、HTTPS 下载地址、文件大小和 SHA-256，不读取 OSS 文件列表判断版本。
- 新增运行中 SSE 更新监听：漫剧虾固定连接 `https://anyq.site/api/v1/releases/events?product_id=comic_shrimp`，只监听 `release` 事件；事件内容不可信，只用于触发 `/api/v1/releases/latest?product_id=comic_shrimp` 重新做 `update-v1` 验签。
- 新增每 60 秒一次的签名更新查询兜底，以及 SSE 断线自动重连；同一客户端只保留一个 SSE 连接，退出时关闭连接并清理定时器。
- 强制更新继续只由已验签的 `mandatory=true` 或 `min_supported_version` 判断；强制更新不可通过关闭弹窗、刷新页面或切换按钮绕过，下载失败支持重试。
- 旧安装包没有实时监听能力，必须重新打包并安装包含本次代码的新版本后才会生效；`0.1.23` 已包含运行中 SSE 监听和 60 秒兜底检查。
- 一键发布脚本继续在构建前执行项目检查、后端提示词检查和发布安全测试；`0.1.23` 已完成完整商业构建链。

### 文档与交接

- 新增 `docs/PROJECT_HANDOFF.md`，记录当前账号协议、运行方式、发布边界、测试结果和下一步。
- 新增 `docs/PROJECT_FILE_MAP.md`，记录目录职责、核心文件和常见 BUG 定位路径。
- README 更新为账号登录版、`comic_shrimp` 产品协议和当前发布流程。
- 本地 Nuitka 崩溃诊断文件加入 Git 忽略规则，避免误提交构建机诊断产物。

## 0.1.10-dev - 2026-07-13

### 品牌与白色主题

- 客户端展示名从“万山漫剧”调整为“漫剧虾”，商业产品码仍保持 `wanshan_media`，用于兼容现有授权后台。
- Electron 主进程使用新展示名，但本地数据目录继续沿用 `%APPDATA%\万山\data`，避免改名后丢失已有小说、模型配置和授权缓存。
- 新增 `frontend/manjuxia-brand.js` 和 `frontend/manjuxia-light.css`，在编译后前端上覆盖品牌文案、页面标题和 Codex 风格白色简约主题。
- 更新后续商业构建命名，安装目录、桌面快捷方式、exe 和安装包输出将使用“漫剧虾”。

### 对齐千山 3.61.381/3.61.382

- 确认千山安装目录为 `D:\qianshan\xiaoyangmengjuchang`，当前安装版本为 `3.61.381`，更新源为阿里云 `xiaoshuotool/app/3.61.381/`。
- 查阅千山更新日志，确认近期新增重点包括小说标签、批量场景全景/宫格图、TopView 刷新、视频素材保序和脚本编辑修复。
- 新增源码审计文档：`docs/QIANSHAN_361381_SOURCE_AUDIT.md`，记录已补、未补、移植风险和建议顺序。

### 小说标签

- 新增 `tag_definitions` 和 `novel_tags` 数据表，启动时可自动迁移旧库。
- 新增 `backend/services/tag_service.py`，同步千山标签体系，包含屏幕模式、视觉方向、受众、题材和分镜主题标签。
- 新增小说标签接口：标签定义、文本分析、读取标签、保存标签、按现有小说重新分析标签。
- 小说列表和小说详情返回 `novel_tags`，模板上下文返回 `novel_tag_genres` 和 `screen_mode`，供后续推荐链路使用。
- 新增 `frontend/wanshan-novel-tags.js`，在小说页提供轻量“小说标签管理”入口，支持手动设置、AI 分析和保存。
- 为保持本地优先，导入/创建小说后的自动打标只使用本地关键词规则；只有用户主动点击“AI分析题材”才会调用已配置的大模型。

### 信息提取批量任务

- 新增 `/api/extraction/batch/start`、`/api/extraction/batch/active`、`/api/extraction/batch/{job_id}`、`/api/extraction/batch/{job_id}/stop`。
- 批量全景任务复用现有单场景全景生成接口，并自动拆 9 视图宫格。
- 批量宫格任务复用现有素材宫格图生成接口，支持场景和道具卡片。
- 批量任务在后端进程内维护状态，刷新页面后可继续查询；停止操作会阻止派发后续卡片。
- 新增 `frontend/wanshan-extraction-batch.js`，在信息提取页提供“批量生图”入口：可选择小说、任务类型、场景/道具、图片模型、宫格模板和视觉大语言模型，支持只处理缺失项、全选可执行项、进度轮询和停止后续。

### 视频队列与素材链路

- 移植千山视频素材超过 9 个时的自动保序策略，优先保留主要人物、主场景、道具、用户关键帧、尾帧和 TopView 调度图。
- 修复 TopView 调度图进入视频参考图时的标签格式，避免被追加普通“参考图”后缀。
- 全局视频队列新增同一分镜活跃态硬幂等：启动时折叠历史重复 `queued/generating` 项，并创建 `idx_queue_active_storyboard_unique` 部分唯一索引。
- 入队接口改为事务内检查/复用活跃队列项，降低重复点击或并发请求造成同一分镜重复派单的风险。

### TopView / 兼容字段

- `storyboards` 新增 `topview_image`、`topview_prompt`、`topview_start_prompt`、`topview_end_prompt`、`topview_dispatch_text`、`start_frame_image`、`end_frame_image`。
- `scripts` 新增 `sync_outdated`，为后续团队/远端同步后的“剧本已过期”提示预留。
- `extracted_elements` 新增 `voice_id`，为后续人物音色/TTS 绑定预留。
- 分镜生成和重新生成接口新增 `avoid_same_shot_size`，并把上一末镜景别/机位/运镜信息传给服务端拼装 payload，便于远端规则做跨小节景别避重。

### 验证

- 已通过 Python 编译检查：`backend/api/extraction.py`、`backend/api/novels.py`、`backend/services/tag_service.py` 等。
- 已通过 `node --check frontend/wanshan-novel-tags.js` 和 `node --check frontend/wanshan-extraction-batch.js`。
- 已用临时 `WANSHAN_DATA_DIR` 初始化数据库并烟测标签种子与样本文本分析。
- 已新增并通过后端针对性测试：视频素材保序、队列活跃态幂等、千山兼容 schema、分镜景别连续性 payload。

## 0.1.9 - 2026-07-12

### 产品与模板

- 将商业授权后台中的万山产品显示名整理为“万山漫剧”，产品码保持 `wanshan_media`。
- 同步并清洗小说大纲、章节创作、章节后处理模板，使当前万山库与千山对应模板内容一致。
- 补充分镜模板和风格提示词种子，正式分镜选择器按千山展示顺序排序。
- 优化剧本转换、信息提取和分镜模板选择在有小说/无小说状态下的可用性。

### 本地模型配置

- 改造本地模型配置入口，减少请求头、请求参数等低代码用户不需要直接填写的字段。
- 默认最大输出 token 提升到适合长文本生成的范围。
- 支持 DeepSeek、火山方舟等兼容 OpenAI 风格接口的配置。

### 商业授权

- 新增 Electron 授权客户端，支持卡密激活、设备绑定、刷新授权、离线宽限和本地 safeStorage 缓存。
- 客户端校验服务端返回的 `license.payload + license.signature` Ed25519 签名信封。
- 校验 `product_code`、设备指纹、到期时间、宽限期和功能权限。
- 授权服务端支持 `wanshan_media` 产品，并在管理后台按产品切换功能项。
- 管理后台禁用缓存，避免旧页面导致万山卡密生成失败。

### 完整性与加固

- 商业包后端通过 Nuitka 编译为 `backend-server.exe`。
- PyInstaller 只生成后端启动器 `backend-launcher.exe`，不承载业务源码。
- 商业发布目录生成 `integrity_manifest.json` 和 `integrity_manifest.sig`。
- Electron 启动时校验完整性清单签名、关键文件 hash 和未登记额外文件。
- 发布扫描拒绝 `.py/.env/.map/.db/.sqlite/.cookie/.tmp/.bak/src/prompts/test` 等残留。
- `qianshan-storyboard-lab.html` 默认不进入正式商业包。

### 更新器

- 新增 Electron 更新客户端。
- 支持读取 `release_config.json` 中的 `update_feed_url`。
- 更新接口当前指向 `https://license.runmo.art/v1/update?product_code=wanshan_media`。
- 0.1.9 安装包已上传到远端更新目录，并写入更新接口。

### 构建与验证

- 商业构建入口：`packaging/build/build_release.ps1`。
- 当前安装包：`packaging/release/installer/万山Setup_0.1.9.exe`，这是改名前的历史产物，不提交到普通 Git。
- 当前安装包大小约 `212.65 MB`。
- 当前安装包 SHA-256：`82b859b3233ba686cf846386bf7d3aba6a7073cce2768f607ef1e1b9ef2ffe40`。
- 已验证 `npm run check`、`npm run test:security`、Python 编译检查、发布扫描、远端卡密创建和远端激活。

## 0.1.8 及以前

- 建立万山本地项目形态。
- 初步复用原前端资源、FastAPI 后端服务和 Electron 壳。
- 移除强制登录态，补充本地离线模板和模型配置能力。
- 初步接入商业授权与完整性校验骨架。
