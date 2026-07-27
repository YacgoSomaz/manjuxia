# 商业版发布加固

本目录是漫剧虾商业版发布流程的安全骨架。它不包含服务端私钥、管理员令牌、模型 API Key 或用户数据。

Electron `asar` 只是归档格式，不是加密。正式包不能包含 `src/`、`.env`、prompt、测试、源码映射、开发文档、接口密钥或用户数据；前端构建必须关闭 sourcemap，授权验签放在 Electron 主进程，客户端只携带授权公钥。

## 目录

- `config/release.example.json`: 本地构建参数示例
- `build/build_release.ps1`: 构建入口和参数校验
- `build/Compile-Backend.ps1`: 用 Nuitka 将后端业务代码编译为独立二进制目录
- `build/Build-Launcher.ps1`: 用 PyInstaller 生成只负责启动后端二进制的启动器
- `build/Build-ElectronApp.ps1`: 复制 Electron 运行时、前端资源和编译后后端到发布目录
- `build/Generate-IntegrityManifest.py`: 生成发布文件 SHA-256 清单
- `build/Generate-UpdateManifest.py`: 生成带 Ed25519 签名的 `update.json`
- `build/Scan-Release.ps1`: 检查发布目录是否混入源码、数据库、Cookie、日志或临时文件
- `release/`: 本地构建产物，使用 Git LFS 管理，不提交到普通源码历史

## 当前边界

当前构建入口已接入后端 Nuitka 编译、PyInstaller 启动器、Electron 运行时组装、签名清单生成、发布扫描和 Inno Setup 安装包构建。构建时会在临时源码副本中生成提示词模板嵌入模块，正式发布目录不落地 `backend/data/wanshan_prompt_seed.json`。

本机磁盘迁移：设置 `WANSHAN_BUILD_CACHE_DIR` 可将 Nuitka 后端缓存放到 D 盘；设置 `WANSHAN_DATA_DIR` 可将本机数据库、日志和生成媒体放到 D 盘。未设置时仍兼容 `%LOCALAPPDATA%` / `%APPDATA%` 默认路径。

账号客户端已按 anyq.site 统一账户协议接入，客户端只检查 `products[]` 里的 `comic_shrimp` 产品和 `comic_course` 权益。服务器返回 `account_license` Ed25519 签名信封，客户端内置账号公钥验签；裸 JSON 字段被抓包篡改时不会解锁。协议边界包括：

- 手机号验证码登录、账号校验和网页登录交接接口
- 账号权益签名、TLS 传输和短有效期签名缓存
- 设备标识规则
- 成功和失败响应字段，尤其是 `user`、`products`、`account_license`
- 公钥格式与签名算法

真实值只通过本地参数或 CI Secret 注入，禁止写入 Git。

`Generate-IntegrityManifest.py` 要求通过 `WANSHAN_MANIFEST_PRIVATE_KEY` 或 `--private-key` 提供构建机上的 Ed25519 清单签名私钥，输出 `integrity_manifest.json` 和 `integrity_manifest.sig`。私钥只存在构建机/CI，`release_config.json` 只写 `integrity_public_key`。清单使用 `version=2`、`scope=core`，只记录主 EXE、固定的 Electron 启动/鉴权/本地桥接/更新文件、发布配置和 `backend-server.exe`。Python 运行库、DLL、用户生成的图片、视频、音频、数据库、缓存及其他运行时文件不参与启动硬校验，也不要求登记。启动时仍校验签名清单中的核心文件哈希，但不再以“清单外新增文件”阻断启动。

更新器使用 `release_config.json` 里的 `update_feed_url` 和 `update_public_key`。客户端先校验 `update.json` 的 Ed25519 签名，再按安装包 SHA-256 校验下载文件，最后启动安装器。发布新版本时上传安装包和对应 `update.json` 即可。

## 当前商业产品

- 产品显示名：漫剧虾
- 产品代码：`comic_shrimp`
- 必需权益：`comic_course`
- 账号/充值服务器：`https://anyq.site`
- 账号权益公钥：`CqLAEE2KnduTFtw1gVQIExS1qLRa-XI3TaWpbchMbKc`
- 当前商业包：`release/installer/comic-shrimp/0.1.23/漫剧虾Setup_0.1.23.exe`
- 当前包 SHA-256：`f835706e49724eac21ae6f8a540548c268e314f29921f6004e4210024427ed15`
- 当前包大小：`236800728` 字节
- 当前 Authenticode：`NotSigned`；外发前必须使用 `-CodeSignThumbprint` 重新构建

管理后台有多个产品时，漫剧虾必须使用 `comic_shrimp` 下单/发权益。不要选择直播复盘侠或运营虾，否则客户端会因产品码或权益不匹配拒绝解锁。

## 目标构建流程

```text
准备本地商业参数
  → Nuitka 编译业务模块
  → PyInstaller 构建启动器
  → 复制前端和运行时依赖
  → 生成 integrity_manifest.json
  → 扫描发布目录
  → Inno Setup 生成安装包
  → 生成 update.json / release 记录
  → 安装到干净目录验证
  → Git LFS 上传安装包
```
