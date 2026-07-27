# AI Handoff: 万山漫剧

> 兼容入口：最新、最完整的接手资料请先阅读 [`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md) 和 [`PROJECT_FILE_MAP.md`](PROJECT_FILE_MAP.md)。

这份文档给后续接手的 AI 或开发者快速建立上下文。不要在仓库中写入真实管理员令牌、服务端私钥、模型 API Key、用户数据库、Cookie、日志、安装包或本地构建私钥。

## 一句话目标

万山漫剧是本地优先的 AI 漫剧/短剧创作工具，主流程是：

```text
小说原文 → 章节/大纲 → 剧本转换 → 人物/场景/道具提取 → 分镜 → 图片/视频生成
```

商业版使用手机号账号登录，产品 ID / aud 是 `comic_shrimp`，必需权益是 `comic_course`，后台显示名是“漫剧虾”。

当前发布版本是 `0.1.28`。商业安装包位于 `packaging/release/installer/comic-shrimp/0.1.28/漫剧虾Setup_0.1.28.exe`，SHA-256 为 `a53d92eb0ad67cfeb13ea6c29262eedc33f465e8aa34421a4000327d013b6d16`。该包已通过发布前测试、后端冒烟测试、完整性清单签名和发布扫描；代码签名状态仍为 `NotSigned`，正式外发前必须用证书重新构建。

账号权益快照：服务端 `/api/auth/me` 每次基于 `user_products` 重新签发最多 600 秒的 Ed25519 `account_license`，响应禁止缓存且不返回 ETag。Electron 端每 10 秒单飞刷新，所有账号请求显式禁缓存；网络失败只允许未过期的已验签快照，过期返回 `signature_expired` 并阻止付费功能。线上诊断日志只保留产品、权益状态、签发/到期时间和结果码。

## 商业包代码保护（2026-07-24）

- 构建顺序固定为：阶段化复制 -> JavaScript 混淆 -> Electron 主进程 V8 `.jsc` 字节码 -> `app.asar` -> 签名完整性清单。不要跳过或调换顺序。
- `scripts/Compile-ElectronV8Bytecode.cjs` 只处理 Electron **主进程**模块：`main`、账号、更新、完整性、官方算力和本地桥接。`main.js` 在成品中只有两行加载器，真实代码为 `main.jsc`；其他主进程业务 `.js` 会被删除。
- `electron/preload.js` 与前端脚本必须保留为混淆 JS。Electron 43 的 preload 属于隔离渲染 V8 上下文，加载主进程生成的 `.jsc` 会报 `cachedDataRejected`，强行编译会导致桥接失效或白屏。
- V8 字节码和 ASAR 都是提高逆向/篡改成本，不是授权根。真正的会员裁决由 Nuitka 后端再次验证 anyq.site 的 Ed25519 `account_license`；篡改 Electron UI 或本地缓存不能伪造新的有效服务器签名。

官方 AI 算力：本地 `custom` 配置继续由用户自己填写并直连；`official` 只由 Electron 主进程访问 anyq.site，固定 `comic_shrimp` / `comic_course`。官方目录同时满足 `enabled=true`、`available=true` 的任务才会注入现有语言/图片下拉菜单。官方任务请求体只有固定产品、目录任务类型、用户输入和 UUID 幂等键，不包含上游密钥、模型地址、供应商或系统提示词。图片结果优先使用 `result_assets[].display_url`，兼容 `download_url`，保存由主进程完成；语言结果通过本地 `/api/scripts/official-result` 落库，不在本地再次调用模型。未修改 anyq.site 服务端。

## 最近变更：官方来源、积分和历史成片（2026-07-23）

- 官方算力入口在 `frontend/official-ai.js`，只把已通过官方目录筛选的语言/图片任务注入现有下拉菜单；本地 custom 与 official 来源分开，视频和语音未开放时不生成假入口。
- `electron/account-client.js`、`electron/main.js` 和 `frontend/manjuxia-brand.js` 组成积分显示链路：会员与产品权益只来自已验签 `account_license.payload`；官方算力余额按统一协议从已登录会话的 `/api/v1/ai/catalog?product_id=comic_shrimp` 读取，仅用于展示，不参与授权判定。每次账号刷新会同步更新余额，目录请求失败时保留上次显示值或显示 `-`。
- `backend/api/video.py` 的 `/api/video/history` 与 `frontend/wanshan-history.js` 组成历史成片页，按本地完成记录展示视频，文件不存在时显示缺失状态。
- 本轮只改客户端和本地后端；没有改 anyq.site、支付回调、数据库协议或签名私钥，也没有构建安装包。

## 核心目录

```text
backend/      FastAPI 后端、模板服务、模型配置、分镜/视频/小说业务逻辑
electron/     Electron 主进程、授权客户端、更新器、完整性校验、preload
frontend/     编译后的 Vue/Element Plus 前端资源
packaging/    商业构建、Nuitka、PyInstaller、Inno Setup、发布扫描
tests/        Node 测试、发布安全测试、E2E/烟测脚本
docs/         项目设计与交接说明
```

## 运行开发版

```powershell
cd D:\万山项目
npm install
python -m pip install --only-binary=:all: -r backend\requirements.txt
npm start
```

开发版通过 Electron 启动本地后端。当前后端端口会写入：

```text
%APPDATA%\万山\data\backend.port
```

## 必跑检查

```powershell
npm run check
npm run test:security
python -m py_compile backend\main.py backend\services\template_service.py backend\services\wanshan_prompt_seed.py
```

商业构建后必须额外跑：

```powershell
pwsh -File packaging\build\Scan-Release.ps1 -ReleaseDir packaging\release\万山-<version>
```

## 商业构建

商业构建入口：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File packaging\build\build_release.ps1 `
  -Version <version> `
  -Commercial `
  -LicenseServerUrl "https://license.runmo.art" `
  -LicensePublicKey "<授权公钥>" `
  -ProductCode "wanshan_media" `
  -IntegrityPublicKey "<完整性公钥>" `
  -UpdateFeedUrl "https://license.runmo.art/v1/update?product_code=wanshan_media"
```

构建私钥从本地环境变量 `WANSHAN_MANIFEST_PRIVATE_KEY` 读取，只能留在构建机或 CI Secret。不要提交。

商业包规则：

- 后端业务必须通过 Nuitka 进入 `backend-server.exe`。
- Electron 主进程业务在正式包中必须为 `.jsc`，并保留 `node_modules/bytenode` 运行时；不得把 `electron/account-client.js`、`update-client.js`、`release-guard.js` 等明文重新复制进包。
- 正式包不包含 `.py`、`.env`、`.map`、`.db`、Cookie、日志、测试文件、源码目录、prompt 原始目录。
- `backend/data/wanshan_prompt_seed.json` 会嵌入编译临时模块，不直接落地到安装目录。
- `frontend/qianshan-storyboard-lab.html` 是内部实验台，默认不进正式包。只有设置 `WANSHAN_ENABLE_QIANSHAN_LAB=1` 才会带入。
- 发布目录会生成 `integrity_manifest.json` 与 `integrity_manifest.sig`。

## 授权系统

客户端：

- `electron/account-client.js` 负责验证码登录、刷新、验签和本地授权缓存。
- `electron/main.js` 从 `release_config.json` 读取商业配置。
- 客户端只放公钥，不放服务端私钥。
- 授权信封格式是 `license.payload + license.signature`，算法 Ed25519。
- 必须校验 `product_code`、设备指纹、到期时间、宽限期和功能列表。

服务端：

- 账号服务器：`https://anyq.site`
- 产品 ID：`comic_shrimp`
- 必需权益：`comic_course`
- 充值通过网页登录交接票据跳转，票据不放进 URL 查询参数，也不返回 Cookie 或管理员令牌。

## 更新器

- `electron/update-client.js` 负责读取更新接口、校验下载包 SHA-256 并启动安装器。
- 更新接口和公钥来自本地发布配置，产品必须固定为 `comic_shrimp`；不得用 OSS 文件列表判断更新。

## 模板与排序

- 种子模板文件：`backend/data/wanshan_prompt_seed.json`
- 模板初始化服务：`backend/services/wanshan_prompt_seed.py`
- 模板列表排序和过滤：`backend/services/template_service.py`
- 正式分镜模板选择器要按千山展示顺序，而不是按本地 SQLite 自增 ID。
- 本地 ID 不要求和千山 ID 一致，避免破坏引用。正确策略是内容、名称、分类和显示顺序对齐。

## 前端注意事项

- 正式前端在 `frontend/assets/`，目前是编译后资源。
- 分镜选择器相关资源：
  - `frontend/assets/StoryboardsView-D8ihlApB.js`
  - `frontend/assets/StoryboardsView-QwKOpbul.css`
- 本地模型配置增强在 `frontend/wanshan-local-config.js`。
- 不要把调试文案、内部实验说明或提示词套取工具暴露到正式用户界面。

## 远端管理后台现状

远端授权后台已经支持两个产品：

- 直播复盘侠
- 万山漫剧

万山漫剧下不显示直播监听上限、导出水印、最低版本等直播复盘侠专属策略。后台页面禁用缓存，避免浏览器拿旧 JS。

如果后续增加第三个软件，应新增独立产品码和独立功能列表，不要复用 `wanshan_media`。

## 当前已知优化空间

- 安装包仍包含 Electron/Chromium 运行时、Python runtime、Numpy/PIL/tzdata 等依赖，0.1.9 大约 212 MB。后续可单独做瘦身：
  - 只保留 `zh-CN`、`en-US` locale。
  - 删除不使用的 Python 数据包和时区数据。
  - 继续排查 pandas/docx 等是否是硬依赖。
- 前端仍是编译后资源，长期建议回收原始 Vue 工程或重建源码工程。
- 内部分镜实验台不应进入正式商业包，但可以保留在开发仓库帮助测试模板。
- 前端是编译后资源，某些问题只能在打包后才暴露；每个版本必须做干净安装、覆盖安装、卸载保留数据和运行中二次启动测试。

## 禁止事项

- 不要提交 `packaging/release/`。
- 不要提交 `build/ffmpeg.exe`、截图或临时产物。
- 不要提交 `%APPDATA%\万山\data` 下任何内容。
- 不要把用户提供的模型 Key、服务器密码、管理员 token 写入代码或文档。
- 不要把服务端 Ed25519 私钥、完整性签名私钥写入仓库。
