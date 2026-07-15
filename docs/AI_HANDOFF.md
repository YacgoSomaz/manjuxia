# AI Handoff: 万山漫剧

> 兼容入口：最新、最完整的接手资料请先阅读 [`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md) 和 [`PROJECT_FILE_MAP.md`](PROJECT_FILE_MAP.md)。

这份文档给后续接手的 AI 或开发者快速建立上下文。不要在仓库中写入真实管理员令牌、服务端私钥、模型 API Key、用户数据库、Cookie、日志、安装包或本地构建私钥。

## 一句话目标

万山漫剧是本地优先的 AI 漫剧/短剧创作工具，主流程是：

```text
小说原文 → 章节/大纲 → 剧本转换 → 人物/场景/道具提取 → 分镜 → 图片/视频生成
```

商业版使用手机号账号登录，产品 ID / aud 是 `comic_shrimp`，必需权益是 `comic_course`，后台显示名是“漫剧虾”。

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
cd C:\Users\q2414\Desktop\万山
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
