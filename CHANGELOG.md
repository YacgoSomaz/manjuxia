# Changelog

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
- 当前安装包：`packaging/release/installer/万山Setup_0.1.9.exe`，不提交到普通 Git。
- 当前安装包大小约 `212.65 MB`。
- 当前安装包 SHA-256：`82b859b3233ba686cf846386bf7d3aba6a7073cce2768f607ef1e1b9ef2ffe40`。
- 已验证 `npm run check`、`npm run test:security`、Python 编译检查、发布扫描、远端卡密创建和远端激活。

## 0.1.8 及以前

- 建立万山本地项目形态。
- 初步复用原前端资源、FastAPI 后端服务和 Electron 壳。
- 移除强制登录态，补充本地离线模板和模型配置能力。
- 初步接入商业授权与完整性校验骨架。
