# 漫剧虾项目交接说明

更新时间：2026-07-20

这份文档面向下一位开发者或 AI。先读本文件，再读 `PROJECT_FILE_MAP.md`，最后按 `CHANGELOG.md` 回看历史。不要凭截图猜问题，先确认运行形态、接口边界和实际日志。

## 1. 项目定位

漫剧虾是 Windows Electron 桌面应用，使用本地 FastAPI 后端保存和处理创作数据，模型请求由用户在设置页配置。主链路：

```text
小说导入 → 章节解析 → 剧本转换 → 人物/场景/道具提取 → 分镜生成 → 图片/视频生成
```

当前工作区是 `comic_shrimp` 账号登录版，不是旧的卡密激活版。开发版和商业包应保持同一产品协议。

### 官方 AI 与本地 custom 的边界（2026-07-23）

- `custom` 仍由用户在本地模型配置页填写并直连自己的服务；该链路不读取官方目录，也不使用官方积分。
- `official` 只能由漫剧虾 Electron 主进程访问 anyq.site，固定产品为 `comic_shrimp`，权益为 `comic_course`，请求头为 `X-Product-Code: comic_shrimp`。渲染层只能看到经过清洗的目录任务，不接触 Cookie、上游 API Key、模型地址或供应商信息。
- 官方目录是模型下拉项的唯一来源。只有 `enabled=true` 且 `available=true` 的任务会注入现有语言/图片下拉菜单，积分价格不在客户端硬编码。
- 官方任务体固定为 `product_id`、目录允许的 `task_type`、`input_text`、`idempotency_key` 四项；一次点击生成 UUID，重试复用同一 UUID。账号权益、扣费、限流、模型调用和退款由服务端决定。
- 官方图片优先展示 `result_assets[].display_url`，缺失时才使用 `download_url`；浏览器不用 fetch 跨域抓图片，“保存到本地”由主进程通过 HTTPS 下载。
- 官方语言任务的章节正文作为用户输入提交，完成后通过本地 `/api/scripts/official-result` 落库；该路由只保存正文，不在本地再次调用模型。
- 官方不可用时不会静默回退 custom。旧安装包没有本次下拉和结果处理能力，必须重新打包安装后才生效；本次没有修改 anyq.site 服务端、数据库、支付回调或签名私钥。

当前发布版本：`0.1.28`。安装包位于 `packaging/release/installer/comic-shrimp/0.1.28/漫剧虾Setup_0.1.28.exe`，大小 `244051356` 字节，SHA-256 为 `a53d92eb0ad67cfeb13ea6c29262eedc33f465e8aa34421a4000327d013b6d16`。本次构建的发布扫描、完整性清单签名和后端冒烟测试均通过；安装包 Authenticode 当前为 `NotSigned`，正式外发前需要证书签名。

`0.1.28` 已包含本次完整性校验调整。新策略只校验固定核心文件，不再因为用户运行时新增文件或后端依赖 DLL/Python 运行库变化而阻断启动；核心文件哈希和清单签名仍然有效。

## 2. 三层边界

### 远端账号层

- 服务器：`https://anyq.site`
- 产品：`comic_shrimp`
- 权益：`comic_course`
- 登录：手机号 + 短信验证码
- 远端返回：`account_license` Ed25519 签名信封
- 客户端校验：schema、typ、iss、aud、key_id、签名、时间窗口、产品和权益
- 本地缓存：Electron `safeStorage` 加密保存 Cookie、签名权益快照和刷新所需状态

权益撤销时序：启动先请求 `/api/auth/me` 并验签，确认仍有 `comic_shrimp` + `comic_course` 后才把权益同步给本地后端；运行中每 10 秒重查一次；所有付费操作再次走远端校验。服务器明确返回停用、过期或未授权时，客户端清空本地后端上下文并回到账号页。网络短暂失败才允许继续使用仍在有效期内的已验签快照。

客户端只使用签名载荷中的产品信息。不能根据未签名根字段、前端状态或本地数据库直接解锁高价值功能。

`/api/auth/me` 续签与缓存约束（2026-07-20）：账号服务每次按当前 `user_products` 生成新的 `account_license`，签名有效期最多 600 秒；所有响应固定返回 `Cache-Control: private, no-store, max-age=0`、`Pragma: no-cache` 和 `Vary: Cookie, X-Product-Code, X-Device-Hash`，不使用 ETag/304。Electron 账号请求显式使用 `cache: "no-store"`、`Cache-Control: no-cache` 和 `Pragma: no-cache`。客户端每 10 秒单飞刷新；网络失败只保留未过期快照，快照过期后返回 `signature_expired` 并清理本地权益。账号状态会同步到渲染层，区分服务端未授权、短期离线和快照过期。

账号服务只记录脱敏诊断字段：`product_id`、`active_entitlement`、`issued_at`、`signed_until`、`result_code`，不记录 Cookie、短信码、签名私钥或完整手机号。线上部署备份位于账号服务器的 `recharge-api/backups/account-diagnostic-*`；本地诊断测试夹具位于 `test-artifacts/remote-recharge-api/`。

### 本地业务层

- Electron 主进程启动后端，并为本次后端生成独立端口和 session secret。
- 正式包中 Electron 主进程的账号、更新、完整性、官方算力与本地桥接代码先混淆后编译为 Electron 43 匹配的 V8 `.jsc`；仅 `main.js` 保留两行加载器。`preload.js` 和渲染页必须保留混淆 JS，因为 Electron 隔离渲染上下文不能加载主进程缓存的 V8 字节码。
- 本地 `/api/*` 请求仍经过 HMAC 签名的安全通道。
- 小说创建、上传、章节解析、增量导入是基础本地功能，商业守卫不要求会员，但 HMAC 不关闭。
- 剧本转换、标签保存、AI 分析、图片/视频生成、导出等付费或高成本操作仍受商业上下文保护。

### 发布更新层

- 只请求服务端产品更新接口，不从 OSS 文件目录推断版本。
- 客户端只接受签名的 `update-v1` 发布载荷。
- 下载必须是 `https://download.anyq.site/` 下的 `.exe`，无 query/hash，并校验版本、字节数和 SHA-256。
- `mandatory=true` 或低于签名的 `min_supported_version` 才阻止启动；普通更新只提示。
- 漫剧虾运行中固定连接 `https://anyq.site/api/v1/releases/events?product_id=comic_shrimp`，只监听 `release` 事件。SSE 事件内容一律不可信，只触发重新请求 `https://anyq.site/api/v1/releases/latest?product_id=comic_shrimp`，仍必须完整验证 schema、alg、key_id、签名、aud/product_id、时间窗口、版本、HTTPS 地址、大小和 SHA-256。
- 客户端每 60 秒执行一次普通签名更新检查，作为 SSE 断线、代理缓存或漏事件时的兜底；SSE 断线自动重连，同一客户端只允许一个连接。
- 应用退出时会关闭 SSE 长连接并清理重连/轮询定时器。旧安装包没有这项能力，必须重新打包并安装新版本后才会生效。
- 运营虾不是本仓库产品；其客户端必须独立固定 `operation_shrimp`，不能复用漫剧虾的产品 ID，也不能由网页、配置文件或用户输入切换产品。

## 3. 最近已完成的关键修复

### 官方算力入口、积分与历史成片（2026-07-23）

- `frontend/official-ai.js` 在现有语言/图片模型选择器旁增加“自配算力 / 官方算力”来源控件。来源按 `image`、`llm` 独立维护，语言切换不会误把图片请求切到官方模式；视频、语音在官方目录未支持时保持禁用提示。
- `electron/account-client.js` 只从验签后的 `account_license.payload` 读取 `credits`，并在账号状态同步中保留 language/image/video 三类余额；`frontend/manjuxia-brand.js` 在左下角显示三类余额。
- `backend/api/video.py` 新增 `/api/video/history`，只查询 `storyboards.video_status='done'` 且有 `video_url` 的本地记录；`frontend/wanshan-history.js` 提供侧边栏历史成片页、播放和文件缺失提示。
- 相关断言测试：`tests/account-credit-ui.test.js`、`tests/official-source-controls.test.js`、`tests/video-history-contract.test.js`。

账号页脚现在按实际登录态渲染：未登录只显示登录按钮，已登录才显示退出登录；积分统一显示签名载荷中的总余额字段，不合并语言/图片/视频不同类别余额。源码 `package.json` 基准版本为当前发布基线 `0.1.30`，商业构建版本仍由发布脚本控制。

### 千山分镜模板清洗版迁移

- `backend/data/wanshan_prompt_seed.json` 现在只包含 30 条正式分镜模板：千山 ID23–ID51、ID62；正文来自外部清洗归档 `千山分镜提示词_清洗版`，按文件原文写入并记录 SHA-256。
- 本地分镜模板使用 `qianshan_id`、`source`、`sort_order` 三个字段复刻千山选择器顺序。`admin_id` 为空，故不会触发千山远端模板内容拉取。
- `backend/database/db.py` 会自动给旧数据库补齐这三个字段；`backend/services/wanshan_prompt_seed.py` 启动时删除不在当前 30 条名单中的旧预置分镜行，但保留用户自建模板。
- 分镜列表接口仍只返回模板元数据，点击/实际使用时从本地数据库读取完整正文；这不是云端模板同步。
- 发布前会执行 `tests/prompt-seed-required.test.js` 与 `tests/qianshan-frontend-parity.test.js`，验证 ID 集合、顺序、正文长度、SHA-256 和旧版行清理契约。
- `0.1.27` 已将上述本地种子和数据库迁移逻辑编入商业安装包；安装包发布前 Node 测试 36/36、Python 定向测试 4/4 通过。

### 小说导入 Failed to fetch

根因不是单一问题：

1. 旧窗口可能仍运行旧前端资源。
2. 编译后前端的签名 fetch 层把 `FormData` 当作空请求体计算，导致 multipart 上传签名/请求体不一致。
3. 测试时如果文件路径不存在，Playwright 会在发请求前直接报 `ENOENT`，这不是应用网络错误。

当前修复：

- `frontend/multipart-fetch-bridge.js` 在应用加载前接管 FormData。
- `frontend/multipart-fetch-finalizer.js` 在应用 signed fetch 安装完成后再次包装 fetch，确保先生成 multipart 字节再签名。
- `backend/utils/commercial_guard.py` 仅对小说基础导入操作免会员，不会放开其他付费接口。
- 已用 Playwright 真实选择测试文件并完成 HTTP 200 导入，页面显示“导入成功”和章节解析结果。

### 启动空白和发布测试

当前启动顺序是：

```text
createSplashWindow
  → startBackend
  → waitForBackend
  → createWindow
  → syncLicenseContext / refresh timer
```

启动页会一直显示到后端握手完成，避免用户看到白屏或空工作台。曾有测试错误地要求 `createWindow` 先于 `waitForBackend`，现已同步测试契约。

## 4. 当前验证结果

本轮交接前已通过：

```text
npm run check                         project ok
python -m unittest backend/test_wanshan_prompt_seed_payload.py   3/3
node --test tests/*.test.js           53/53
发布前测试子集                        27/27
node tests/e2e/frontend-mock-smoke.cjs  mock_ui_visible=true, mock_network_failures=0
```

`0.1.23` 已完成 Nuitka/Inno 正式构建。后端商业冒烟测试报告 `health OK; 22 storyboard templates; novel upload id=1`，发布目录生成了 `integrity_manifest.json`、`integrity_manifest.sig`，并通过发布扫描。后续版本仍必须在构建结束后核对安装包 SHA-256 和 Authenticode 状态。

## 5. 开发启动

```powershell
cd D:\万山项目
npm install
python -m pip install --only-binary=:all: -r backend\requirements.txt
npm start
```

源码运行时，后端实际数据目录默认为：

```text
%APPDATA%\万山\data
```

不要为了测试删除该目录。需要隔离测试时，用单独的 `WANSHAN_DATA_DIR` 或独立 Electron user-data 目录。

## 6. 发布前流程

1. 确认 `packaging/config/release.local.json` 在本机存在且未提交。
2. 确认完整性私钥只存在本机环境或 CI Secret。
3. 确认账号公钥与 `account-v1` 对应，更新公钥与 `update-v1` 对应，二者不能互换。
4. 运行发布前测试。
5. 运行 `packaging/build/Publish-ComicShrimp.ps1`。
6. 检查发布扫描、完整性清单和安装包 SHA-256。
7. 做 clean install、覆盖安装、重复点击安装包、运行中二次启动、卸载后用户数据保留测试。
8. 上传完整安装包和签名更新载荷；不上传源码、数据库、Cookie、日志或用户素材。

## 7. 常见故障定位

| 现象 | 首先查看 | 常见根因 |
| --- | --- | --- |
| `Failed to fetch` | DevTools 网络、后端握手日志、`electron/main.js` | 后端未启动、旧窗口、端口不匹配或签名请求失败 |
| 上传小说前 Playwright 报 `ENOENT` | 本地文件路径 | 文件根本不存在，尚未发出网络请求 |
| 上传小说后失败 | `multipart-fetch-*`、`backend/utils/local_signature.py` | FormData 物化/签名不一致 |
| 模板列表为空 | `backend/services/wanshan_prompt_seed.py`、`backend/services/template_service.py`、`backend/data` | 种子未初始化、旧数据库未完成字段迁移、分类过滤或后端未完成握手 |
| 频繁弹“加载模板/模型配置失败” | `frontend/manjuxia-brand.js`、`frontend/wanshan-local-config.js` | 页面初始化把可选配置当成阻断错误；应在用户点击具体功能时提示 |
| 无会员却启动即被挡 | `electron/account-client.js`、`backend/utils/commercial_guard.py` | 把登录态、会员态和功能门槛混用；登录可进工作台，具体付费动作再拦截 |
| 启动器黑窗/启动很慢 | `electron/main.js`、`packaging/build/Build-Launcher.ps1` | 启动器窗口样式、后端握手等待或 Nuitka 后端冷启动 |
| 覆盖安装后启动失败 | `packaging/installer/万山.iss`、`electron/release-guard.js` | 旧进程未退出、文件清单不一致、旧安装残留或清单签名不匹配 |
| 更新器未提示 | `electron/update-client.js`、`electron/main.js`、`release_config.json` | 没有签名 `update_release`、产品 ID 不对、版本未超过当前版本、SSE 尚未包含在旧包或下载地址不合规 |
| 运行中更新未触发 | `electron/update-client.js` | SSE 只负责触发重新查询；检查 SSE 地址的产品 ID、`release` 事件、60 秒轮询和重连状态，不要直接信任事件字段 |
| 官方模型不出现在下拉框 | `electron/official-ai-client.js`、`frontend/official-ai.js` | 账号权益、目录请求或目录项的 `enabled/available` 未同时为 true；不要在客户端硬编码模型或积分 |
| 官方图片空白 | `frontend/official-ai.js`、主进程官方保存 IPC | 先看 `result_assets[].display_url`，再看 `download_url`；不要在 WebView 中用 fetch 跨域下载 |

## 8. 禁止提交的内容

- `packaging/release/`、完整安装包、`build/ffmpeg.exe`
- `packaging/config/release.local.json`
- 任何 `.env`、Cookie、短信验证码、管理员 Token、模型 API Key
- `%APPDATA%\万山\data` 下的数据库、日志、图片、音频、视频
- 完整性签名私钥、账号服务端私钥、更新服务端私钥
- `test-artifacts/`、临时截图和 Nuitka 崩溃报告

如果发现远端地址、产品 ID 或签名字段需要变更，先对照统一账户契约（本机参考：`C:\Users\q2414\Desktop\live_watch\docs\ACCOUNT_PRODUCT_CONTRACT.md`），不要在三个客户端各自改一份协议。

## 9. 下一步建议

- 先做一次真实 clean install 和覆盖安装验收，再发布新包。
- 继续把模板接口迁移到统一远端协议，但客户端仍必须验签和按产品隔离。
- 后续恢复原始前端源码工程或保留编译资源映射时，要确认商业包仍不带源码和 sourcemap。
- 把 Playwright 的小说真实文件导入加入回归测试，但测试文件必须位于仓库内的脱敏 fixture，不引用用户微信文件路径。
