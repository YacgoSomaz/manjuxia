# 漫剧虾文件结构与 BUG 定位

这份索引描述“代码在哪里、它负责什么、出问题先查哪里”。`frontend/assets/` 是编译后的前端资源，文件名带 hash，重新构建后可能变化；不要把 hash 文件名当作稳定 API。

## 顶层目录

```text
backend/       本地 FastAPI 后端和数据层
electron/      桌面壳、启动器桥接、账号和更新器
frontend/      编译后的 Vue/Element Plus 前端与业务补丁
packaging/     Nuitka、PyInstaller、Inno Setup 和发布安全检查
prompts/       开发期提示词/模板资源，不直接进入正式包
scripts/       项目检查、图标、教程和发布辅助脚本
tests/         Node、Python、发布和 Electron 行为测试
docs/          交接、源程序审计、教程和协议记录
build/         本机构建依赖；默认不提交
```

## Backend

| 路径 | 职责 | 常见问题 |
| --- | --- | --- |
| `backend/main.py` | FastAPI 启动、路由挂载、中间件、本地端口握手 | 后端启动失败、端口未写入、路由未挂载 |
| `backend/api/novels.py` | 小说创建、上传、章节解析、增量导入 | `Failed to fetch`、文件上传、章节数不对 |
| `backend/api/scripts.py` | 小说章节转剧本 | 模板/大模型调用失败、会员拦截 |
| `backend/api/extraction.py` | 人物、场景、道具提取和批量生图任务 | 提取 0 个、没有剧本时未提示、批量任务状态 |
| `backend/api/storyboards.py` | 分镜生成、重生成、状态和导出 | 模板 ID、上下文继承、分镜格式 |
| `backend/api/video.py` | 即梦/火山/中转视频任务、状态轮询 | 请求体、登录态、视频素材保序 |
| `backend/api/llm_configs.py` | 本地语言/图片/视频/语音配置 | 配置加载失败、模型类型错配 |
| `backend/api/license_context.py` | Electron 传入的已验签账号上下文 | 登录成功但后端仍认为未授权 |
| `backend/database/db.py` | SQLite 初始化、迁移、索引 | 旧库字段缺失、重复队列、标签保存 |
| `backend/models/novels.py` | 小说和章节 ORM/数据模型 | 小说列表字段和标签返回不一致 |
| `backend/models/extraction.py` | 人物/场景/道具模型 | 资产关联、图片和音频字段 |
| `backend/models/storyboards.py` | 分镜模型及 TopView/首尾帧字段 | 分镜状态和视频输入不一致 |
| `backend/services/novel_service.py` | 小说业务封装和章节处理 | 章节导入、列表刷新和数据目录 |
| `backend/services/storyboard_service.py` | 分镜生成 payload、状态继承和镜头连续性 | 模板套用、上一镜景别和状态继承 |
| `backend/services/extraction_service.py` | 资产提取和生图调用 | 生成 0 个、图片模型配置 |
| `backend/services/video_service.py` | 视频生成提交、素材排序和下载 | NewAPI 请求体、参考图数量、下载失败 |
| `backend/services/queue_service.py` | 全局视频队列和活跃任务幂等 | 重复入队、并发、刷新后状态 |
| `backend/services/wanshan_prompt_seed.py` | 内置模板种子与初始化 | 模板为空、分类不匹配、排序不一致 |
| `backend/services/model_presets.py` | 模型厂商预设和低代码默认值 | 用户不应填写请求头/参数过多 |
| `backend/services/trusted_providers.py` | 模型服务商 URL/协议限制 | 中转站白名单、图片/视频接口校验 |
| `backend/utils/local_signature.py` | 本地 HMAC 请求签名 | 上传 FormData、时间戳、签名不匹配 |
| `backend/utils/commercial_guard.py` | 会员门槛判定 | 不要把登录门槛套到基础小说导入 |
| `backend/utils/paths.py` | `%APPDATA%\万山\data` 等路径 | 覆盖安装丢数据、安装目录污染 |

## Electron

| 路径 | 职责 | 常见问题 |
| --- | --- | --- |
| `electron/main.js` | 单实例、启动页、后端生命周期、窗口和更新调度 | 白屏、黑窗、启动慢、重复启动 |
| `electron/preload.js` | 受控 `electronAPI` 桥接 | 前端调用不到后端或权限过宽 |
| `electron/account-client.js` | 手机号登录、Cookie、Ed25519 `account_license` 验签 | 验签失败、过期、产品不匹配 |
| `electron/local-api-bridge.js` | 仅暴露允许的本地模型配置桥接 | `local-api:llm-configs` 未就绪 |
| `electron/update-client.js` | `update-v1` 验签、下载和安装器启动 | 更新不提示、错误版本、非官方 URL |
| `electron/release-guard.js` | 清单签名、hash 和额外文件检查 | `manifest file missing`、未登记 `.pyd` |
| `electron/shell-hardening.js` | 禁止开发菜单/危险参数 | 用户看到开发者工具或启动参数绕过 |
| `electron/trusted-origins.js` | 受信来源 | 页面加载后接口被拒绝 |
| `electron/release-config.js` | 读取商业配置 | 本地配置与打包配置混用 |

## Frontend

| 路径 | 职责 | 常见问题 |
| --- | --- | --- |
| `frontend/index.html` | 前端入口、资源顺序、上传补丁加载 | 补丁未加载、白屏、旧资源缓存 |
| `frontend/multipart-fetch-bridge.js` | 在 signed fetch 前准备 FormData | 小说上传体为空 |
| `frontend/multipart-fetch-finalizer.js` | 在应用签名层外再保证 multipart 字节化 | 打包后导入失败、旧窗口不生效 |
| `frontend/manjuxia-brand.js` | 品牌、提示文案、低打扰错误提示 | 重复弹“加载失败”、名称不一致 |
| `frontend/manjuxia-light.css` | 白天主题和对比度 | 浅色背景白字、下拉选择看不见 |
| `frontend/wanshan-local-config.js` | 本地模型配置低代码体验 | 模型类型混用、配置保存失败 |
| `frontend/wanshan-novel-tags.js` | 小说标签界面和 AI 分析入口 | 标签保存、列表未刷新 |
| `frontend/wanshan-extraction-batch.js` | 批量全景/宫格生图 | 批量任务按钮和进度 |
| `frontend/assets/` | Vue 编译产物、Element Plus CSS、图标 | 先定位业务 chunk，再回到上游源码/补丁 |
| `frontend/qianshan-storyboard-lab.html` | 内部分镜实验台 | 默认不得进入商业包 |

## Packaging / Scripts

| 路径 | 职责 | 常见问题 |
| --- | --- | --- |
| `packaging/build/Publish-ComicShrimp.ps1` | 商业发布入口，固定 `comic_shrimp` | 发布前测试失败、版本递增、密钥缺失 |
| `packaging/build/build_release.ps1` | 通用构建链 | Nuitka 全量编译、构建目录、发布扫描 |
| `packaging/build/Compile-Backend.ps1` | Nuitka 后端编译和缓存 | 后端改动导致重新编译、漏 `.pyd` |
| `packaging/build/Build-Launcher.ps1` | PyInstaller 启动器 | 黑窗口、启动器找不到后端 |
| `packaging/build/Scan-Release.ps1` | 发布目录敏感文件扫描 | 源码、日志、extra file 被拒绝 |
| `packaging/build/Generate-IntegrityManifest.py` | 生成 hash 清单和 Ed25519 签名 | 公钥/私钥不匹配 |
| `packaging/installer/万山.iss` | Inno Setup 安装/卸载/覆盖逻辑 | AppId、旧进程、卸载残留 |
| `scripts/check-project.cjs` | 发布前项目结构检查 | 缺少关键文件或模板数量不足 |
| `打包漫剧虾.bat` | 本地双击入口 | 编码、窗口闪退、环境变量缺失 |

## Tests

- `tests/account-client.test.js`：账号登录、产品隔离、签名篡改、过期、公钥和重复 JSON key。
- `tests/update-client.test.js`：更新载荷签名、版本、URL、SHA-256、产品和强制更新。
- `tests/shell-hardening.test.js`：单实例、启动时序、启动页和开发菜单。
- `tests/installer-rerun.test.js`：重复运行安装包直接启动已有安装、非多开。
- `tests/frontend-multipart-fetch.test.js`：上传补丁加载顺序和 FormData 字节化。
- `tests/packaged-backend-smoke-gate.test.js`：打包后后端握手和模板烟测。
- `tests/publish-comic-shrimp.test.js`：商业发布固定产品、加固和发布边界。
- `backend/test_commercial_guard.py`：基础小说导入免会员、付费操作仍拦截。
- `backend/test_wanshan_prompt_seed_payload.py`：提示词种子和模板数量。

推荐验证：

```powershell
npm run check
node --test tests\*.test.js
python -m unittest backend\test_commercial_guard.py backend\test_wanshan_prompt_seed_payload.py
```

## 变更原则

1. 先判断问题发生在源码、Electron、编译产物、安装器还是远端服务。
2. 先用最小测试复现，再修改；不要用兜底假数据掩盖接口错误。
3. 基础小说导入可以免会员，但不得删除本地 HMAC。
4. 不要让客户端未签名字段决定会员权限。
5. 修改账号协议、支付回调、产品 ID、数据库或远端接口前，先阅读统一账户契约（本机参考：`C:\Users\q2414\Desktop\live_watch\docs\ACCOUNT_PRODUCT_CONTRACT.md`），不要在三个客户端各自改一份协议。
