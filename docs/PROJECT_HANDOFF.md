# 漫剧虾项目交接说明

更新时间：2026-07-15

这份文档面向下一位开发者或 AI。先读本文件，再读 `PROJECT_FILE_MAP.md`，最后按 `CHANGELOG.md` 回看历史。不要凭截图猜问题，先确认运行形态、接口边界和实际日志。

## 1. 项目定位

漫剧虾是 Windows Electron 桌面应用，使用本地 FastAPI 后端保存和处理创作数据，模型请求由用户在设置页配置。主链路：

```text
小说导入 → 章节解析 → 剧本转换 → 人物/场景/道具提取 → 分镜生成 → 图片/视频生成
```

当前工作区是 `comic_shrimp` 账号登录版，不是旧的卡密激活版。开发版和商业包应保持同一产品协议。

## 2. 三层边界

### 远端账号层

- 服务器：`https://anyq.site`
- 产品：`comic_shrimp`
- 权益：`comic_course`
- 登录：手机号 + 短信验证码
- 远端返回：`account_license` Ed25519 签名信封
- 客户端校验：schema、typ、iss、aud、key_id、签名、时间窗口、产品和权益
- 本地缓存：Electron `safeStorage` 加密保存 Cookie、签名权益快照和刷新所需状态

客户端只使用签名载荷中的产品信息。不能根据未签名根字段、前端状态或本地数据库直接解锁高价值功能。

### 本地业务层

- Electron 主进程启动后端，并为本次后端生成独立端口和 session secret。
- 本地 `/api/*` 请求仍经过 HMAC 签名的安全通道。
- 小说创建、上传、章节解析、增量导入是基础本地功能，商业守卫不要求会员，但 HMAC 不关闭。
- 剧本转换、标签保存、AI 分析、图片/视频生成、导出等付费或高成本操作仍受商业上下文保护。

### 发布更新层

- 只请求服务端产品更新接口，不从 OSS 文件目录推断版本。
- 客户端只接受签名的 `update-v1` 发布载荷。
- 下载必须是 `https://download.anyq.site/` 下的 `.exe`，无 query/hash，并校验版本、字节数和 SHA-256。
- `mandatory=true` 或低于签名的 `min_supported_version` 才阻止启动；普通更新只提示。

## 3. 最近已完成的关键修复

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
node --test tests/*.test.js           48/48
发布前测试子集                        26/26
```

本轮没有重新构建正式安装包。发布脚本通过后才允许进入 Nuitka/Inno 构建。

## 5. 开发启动

```powershell
cd C:\Users\q2414\Desktop\万山
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
| 模板列表为空 | `backend/services/wanshan_prompt_seed.py`、`backend/services/template_service.py`、`backend/data` | 种子未初始化、分类过滤或后端未完成握手 |
| 频繁弹“加载模板/模型配置失败” | `frontend/manjuxia-brand.js`、`frontend/wanshan-local-config.js` | 页面初始化把可选配置当成阻断错误；应在用户点击具体功能时提示 |
| 无会员却启动即被挡 | `electron/account-client.js`、`backend/utils/commercial_guard.py` | 把登录态、会员态和功能门槛混用；登录可进工作台，具体付费动作再拦截 |
| 启动器黑窗/启动很慢 | `electron/main.js`、`packaging/build/Build-Launcher.ps1` | 启动器窗口样式、后端握手等待或 Nuitka 后端冷启动 |
| 覆盖安装后启动失败 | `packaging/installer/万山.iss`、`electron/release-guard.js` | 旧进程未退出、文件清单不一致、旧安装残留或清单签名不匹配 |
| 更新器未提示 | `electron/update-client.js`、`release_config.json` | 没有签名 `update_release`、产品 ID 不对、版本未超过当前版本或下载地址不合规 |

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
