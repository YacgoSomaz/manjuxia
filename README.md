# 漫剧虾

## 本地优先的 AI 漫剧与短剧创作工作台

漫剧虾是一套面向小说作者、短剧创作者和视频团队的 AI 内容生产工具。它把长篇小说中的文字内容，逐步转化为可执行的剧本、角色与场景资产、影视分镜，以及可直接生成图片和视频的提示词。

> 小说不是终点，能拍出来的故事才是。

## 当前状态

- 当前产品名：`漫剧虾`
- 产品 ID / aud：`comic_shrimp`
- 必需权益：`comic_course`
- 当前工作区：账号登录版，源码运行已接入远端 `anyq.site`
- 发布状态：`0.1.23` 商业安装包已构建，发布前测试、后端冒烟测试和发布扫描通过
- 当前版本：`0.1.23`
- 安装包：`packaging/release/installer/comic-shrimp/0.1.23/漫剧虾Setup_0.1.23.exe`
- 安装包 SHA-256：`f835706e49724eac21ae6f8a540548c268e314f29921f6004e4210024427ed15`
- 代码签名：当前为 `NotSigned`；正式对外发布前需使用证书重新构建
- 版本号：由 `packaging/build/Publish-ComicShrimp.ps1` 根据已有发布目录递增；不要只改 `package.json`

账号登录、权益签名和产品隔离协议以统一账户契约为准；本机参考文件位于 `C:\Users\q2414\Desktop\live_watch\docs\ACCOUNT_PRODUCT_CONTRACT.md`。客户端只内置账号公钥和更新公钥，不保存服务端私钥、管理员令牌或模型 API Key。

客户端只内置授权公钥和完整性公钥。服务端私钥、管理员令牌、模型 API Key、用户数据库、Cookie、日志和生成素材都不应进入仓库。

## 产品能做什么

漫剧虾围绕一条完整的内容生产链设计：

```text
小说原文 → 章节解析 → 剧本转换 → 角色/场景/道具提取 → 分镜设计 → 图片与视频生成
```

### 小说转剧本

导入小说或章节文本，按章节拆分内容，使用内置模板将叙事文本转换为适合短剧、广播剧和影视制作的剧本。

### 角色、场景与道具资产

从剧本中提取角色、场景和道具，形成可复用的创作资产，减少重复描述，帮助保持人物、空间和关键物件的一致性。

### 小说标签与模板推荐

导入或创建小说后，可以给作品设置屏幕模式、视觉方向、受众和题材标签。标签会参与后续模板推荐与流程上下文，让剧本转换、信息提取和分镜生成更贴合作品类型。

### AI 分镜设计

根据剧本生成场景节奏、镜号、景别、机位、光线、动作、台词和状态衔接，输出适合视频模型使用的结构化分镜文本。

### 图片与视频生成

支持为角色、场景和道具生成视觉素材，并将分镜提交到视频模型，完成从文字到视频的制作流程。

信息提取页支持单卡片生成素材，也提供批量任务接口用于批量生成场景全景、全景拆宫格和素材宫格图。批量任务在后端运行，前端刷新后可以重新查询任务状态。

### 模板化创作

内置小说创作、剧本转换、元素提取和多种影视风格分镜模板，也支持继续扩展自己的提示词模板。

### 账号授权与更新

商业版使用手机号验证码登录。服务端返回 `account_license` Ed25519 签名信封，客户端校验 schema、签名、产品 ID、权益、时间范围和签发方后才建立本地授权上下文。客户端只检查 `products[]` 中的 `comic_shrimp` / `comic_course`，其他产品不能解锁漫剧虾。

更新器只请求签名的产品更新接口，校验 `update-v1`、HTTPS 下载地址、版本约束、文件大小和 SHA-256。运行中会连接 `https://anyq.site/api/v1/releases/events?product_id=comic_shrimp` 监听 `release` 信号；事件内容只触发重新查询，不能直接触发安装。客户端同时每 60 秒轮询 `https://anyq.site/api/v1/releases/latest?product_id=comic_shrimp` 兜底。OSS 目录中新上传 EXE 不会直接触发更新。

实时更新产品 ID 写死在客户端：漫剧虾只能使用 `comic_shrimp`；运营虾客户端应单独固定为 `operation_shrimp`，不能由网页、配置文件或用户输入切换。旧安装包没有 SSE 实时监听能力，必须重新打包并安装新版本后才会生效。普通更新只提示，签名载荷中的 `mandatory=true` 或当前版本低于 `min_supported_version` 时才会阻断使用；下载、签名、大小或 SHA-256 失败会显示错误并允许重试。

## 产品特点

- **本地优先**：项目数据、运行数据库和生成文件默认保存在本机。
- **商业版可控**：正式包要求账号登录，支持产品权益、设备绑定、远端冻结、签名缓存和版本更新。
- **模型可替换**：支持配置兼容 OpenAI 接口的文本模型，以及图片和视频模型服务。
- **完整工作流**：从小说导入到视频生成，围绕同一部作品持续管理内容和状态。
- **可二次开发**：开发仓库保留前端资源、Electron 壳、FastAPI 后端、提示词种子和构建脚本。
- **适合批量生产**：章节、剧本、资产、分镜和视频结果都按项目组织，方便持续迭代。

## 适合谁使用

- 想把小说改编成短剧或影视内容的作者
- 需要批量制作 AI 视频的短剧团队
- 需要统一管理角色、场景和分镜资产的编导
- 想搭建自己 AI 内容生产工具的开发者

## 快速开始开发

### 运行桌面应用

```powershell
cd D:\万山项目
npm install
npm start
```

### 安装后端依赖

```powershell
cd D:\万山项目
python -m pip install --only-binary=:all: -r backend\requirements.txt
```

启动后先显示启动状态页，Electron 会等待本地后端握手完成再打开工作台。登录成功后才能使用会员功能；小说导入、章节解析等基础本地工作流不依赖会员权益，但仍经过本地签名 API 通道。

## 项目结构

```text
backend/      Python/FastAPI 后端、业务服务、模板服务与模型调用
electron/     Electron 主进程、授权客户端、更新器、完整性校验与 preload
frontend/     Vue 3 + Element Plus 编译后的前端资源
packaging/    Nuitka/PyInstaller/Inno Setup 商业构建与发布扫描
tests/        Node 单元测试与 Playwright/后端流程测试
scripts/      项目检查和辅助脚本
docs/         设计说明、AI 接手说明和产品关键记录
```

## 数据与隐私

漫剧虾当前为了兼容旧版本数据，默认继续使用本地数据目录：

```text
%APPDATA%\万山\data
```

本地数据库、登录态、日志、图片和视频不会进入 Git 仓库。远端模型调用只在用户主动配置并启用对应服务时发生；使用第三方模型时，请根据服务商条款判断发送内容是否适合外部处理。

## 商业构建

商业构建入口（只构建 `comic_shrimp`）：

```powershell
cd D:\万山项目
$env:WANSHAN_MANIFEST_PRIVATE_KEY = (Get-Content "$env:LOCALAPPDATA\万山\build-keys\manifest_ed25519_private.txt" -Raw).Trim()
pwsh -NoProfile -ExecutionPolicy Bypass -File packaging\build\Publish-ComicShrimp.ps1
```

商业包构建结果：

- 后端业务通过 Nuitka 编译为 `backend-server.exe`
- 启动器通过 PyInstaller 生成 `backend-launcher.exe`
- 前端 sourcemap 会被移除
- `qianshan-storyboard-lab.html` 默认不会进入正式包
- `Scan-Release.ps1` 会拒绝 `.py/.env/.map/.db/.cookie/src/prompts/test` 等残留
- 完整性清单 `integrity_manifest.json` 会用 Ed25519 私钥签名

`packaging/build/Publish-ComicShrimp.ps1` 会先执行全部发布前测试，再调用完整构建链。

`build/ffmpeg.exe` 是本机构建可选依赖，体积较大，不进普通 Git。需要发布视频相关能力时，在本机 `build/` 目录放置对应二进制即可。

构建密钥、账号公钥、完整性公钥和更新公钥的来源及边界见 [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md)。不要把本地 `release.local.json`、签名私钥或安装包提交到 Git。

## 开发说明

```powershell
# 检查项目结构
npm run check

# 授权与发布安全测试
npm run test:security

# Python 语法检查
python -m py_compile backend\main.py backend\services\template_service.py backend\services\wanshan_prompt_seed.py
```

漫剧虾当前保留了原有前端的主要交互结构，并对后端鉴权、模板加载、模型调用、分镜解析、本地配置、商业授权和更新器进行了整理，适合作为 AI 漫剧/短剧生产工具继续二次开发。

继续开发前建议按这个顺序阅读：

- [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md)：当前协议、最近改动、测试和发布边界
- [`docs/PROJECT_FILE_MAP.md`](docs/PROJECT_FILE_MAP.md)：目录/文件职责和 BUG 定位表
- [`CHANGELOG.md`](CHANGELOG.md)
- [`docs/AI_HANDOFF.md`](docs/AI_HANDOFF.md)
- [`docs/QIANSHAN_361381_SOURCE_AUDIT.md`](docs/QIANSHAN_361381_SOURCE_AUDIT.md)
- [`docs/superpowers/specs/2026-07-10-commercial-license-design.md`](docs/superpowers/specs/2026-07-10-commercial-license-design.md)
- [`packaging/README.md`](packaging/README.md)
