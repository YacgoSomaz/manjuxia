# 万山漫剧

## 本地优先的 AI 漫剧与短剧创作工作台

万山漫剧是一套面向小说作者、短剧创作者和视频团队的 AI 内容生产工具。它把长篇小说中的文字内容，逐步转化为可执行的剧本、角色与场景资产、影视分镜，以及可直接生成图片和视频的提示词。

> 小说不是终点，能拍出来的故事才是。

## 当前状态

- 当前商业测试版本：`0.1.9`
- 授权产品码：`wanshan_media`
- 授权后台显示名：`万山漫剧`
- 授权服务器：`https://license.runmo.art`
- 更新检测接口：`https://license.runmo.art/v1/update?product_code=wanshan_media`
- 商业安装包：本地生成在 `packaging/release/installer/`，不提交到普通 Git 历史

客户端只内置授权公钥和完整性公钥。服务端私钥、管理员令牌、模型 API Key、用户数据库、Cookie、日志和生成素材都不应进入仓库。

## 产品能做什么

万山漫剧围绕一条完整的内容生产链设计：

```text
小说原文 → 章节解析 → 剧本转换 → 角色/场景/道具提取 → 分镜设计 → 图片与视频生成
```

### 小说转剧本

导入小说或章节文本，按章节拆分内容，使用内置模板将叙事文本转换为适合短剧、广播剧和影视制作的剧本。

### 角色、场景与道具资产

从剧本中提取角色、场景和道具，形成可复用的创作资产，减少重复描述，帮助保持人物、空间和关键物件的一致性。

### AI 分镜设计

根据剧本生成场景节奏、镜号、景别、机位、光线、动作、台词和状态衔接，输出适合视频模型使用的结构化分镜文本。

### 图片与视频生成

支持为角色、场景和道具生成视觉素材，并将分镜提交到视频模型，完成从文字到视频的制作流程。

### 模板化创作

内置小说创作、剧本转换、元素提取和多种影视风格分镜模板，也支持继续扩展自己的提示词模板。

### 商业授权与更新

商业版通过远端授权服务生成卡密，客户端激活后校验 Ed25519 签名授权信封，并校验产品码、设备指纹、到期时间和离线宽限。客户端更新器会读取远端更新接口，校验更新清单和安装包 SHA-256 后再启动安装器。

## 产品特点

- **本地优先**：项目数据、运行数据库和生成文件默认保存在本机。
- **商业版可控**：正式包要求卡密激活，支持设备绑定、远端冻结、离线宽限和版本更新。
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
cd C:\Users\q2414\Desktop\万山
npm install
npm start
```

### 安装后端依赖

```powershell
cd C:\Users\q2414\Desktop\万山
python -m pip install --only-binary=:all: -r backend\requirements.txt
```

启动后，在设置页配置需要使用的文本、图片或视频模型即可开始创作。开发版可以本地运行，商业包才强制走卡密授权。

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

万山漫剧默认使用本地数据目录：

```text
%APPDATA%\万山\data
```

本地数据库、登录态、日志、图片和视频不会进入 Git 仓库。远端模型调用只在用户主动配置并启用对应服务时发生；使用第三方模型时，请根据服务商条款判断发送内容是否适合外部处理。

## 商业构建

商业构建入口：

```powershell
cd C:\Users\q2414\Desktop\万山
$env:WANSHAN_MANIFEST_PRIVATE_KEY = (Get-Content "$env:LOCALAPPDATA\万山\build-keys\manifest_ed25519_private.txt" -Raw).Trim()
pwsh -NoProfile -ExecutionPolicy Bypass -File packaging\build\build_release.ps1 `
  -Version 0.1.9 `
  -Commercial `
  -LicenseServerUrl "https://license.runmo.art" `
  -LicensePublicKey "<授权公钥>" `
  -ProductCode "wanshan_media" `
  -IntegrityPublicKey "<完整性公钥>" `
  -UpdateFeedUrl "https://license.runmo.art/v1/update?product_code=wanshan_media"
```

商业包构建结果：

- 后端业务通过 Nuitka 编译为 `backend-server.exe`
- 启动器通过 PyInstaller 生成 `backend-launcher.exe`
- 前端 sourcemap 会被移除
- `qianshan-storyboard-lab.html` 默认不会进入正式包
- `Scan-Release.ps1` 会拒绝 `.py/.env/.map/.db/.cookie/src/prompts/test` 等残留
- 完整性清单 `integrity_manifest.json` 会用 Ed25519 私钥签名

`build/ffmpeg.exe` 是本机构建可选依赖，体积较大，不进普通 Git。需要发布视频相关能力时，在本机 `build/` 目录放置对应二进制即可。

## 开发说明

```powershell
# 检查项目结构
npm run check

# 授权与发布安全测试
npm run test:security

# Python 语法检查
python -m py_compile backend\main.py backend\services\template_service.py backend\services\wanshan_prompt_seed.py
```

万山漫剧当前保留了原有前端的主要交互结构，并对后端鉴权、模板加载、模型调用、分镜解析、本地配置、商业授权和更新器进行了整理，适合作为 AI 漫剧/短剧生产工具继续二次开发。

继续开发前建议先读：

- [`CHANGELOG.md`](CHANGELOG.md)
- [`docs/AI_HANDOFF.md`](docs/AI_HANDOFF.md)
- [`docs/superpowers/specs/2026-07-10-commercial-license-design.md`](docs/superpowers/specs/2026-07-10-commercial-license-design.md)
- [`packaging/README.md`](packaging/README.md)
