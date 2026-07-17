# Changelog

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
