# 商业版发布加固

本目录是万山商业版发布流程的安全骨架。它不包含真实授权服务器地址、授权公钥、服务端私钥或用户数据。

Electron `asar` 只是归档格式，不是加密。正式包不能包含 `src/`、`.env`、prompt、测试、源码映射、开发文档、接口密钥或用户数据；前端构建必须关闭 sourcemap，授权验签放在 Electron 主进程，客户端只携带授权公钥。

## 目录

- `config/release.example.json`: 本地构建参数示例
- `build/build_release.ps1`: 构建入口和参数校验
- `build/Generate-IntegrityManifest.py`: 生成发布文件 SHA-256 清单
- `build/Scan-Release.ps1`: 检查发布目录是否混入源码、数据库、Cookie、日志或临时文件
- `release/`: 本地构建产物，使用 Git LFS 管理，不提交到普通源码历史

## 当前边界

当前项目仍是 Electron + Python 源码运行结构，Nuitka 模块布局和 PyInstaller launcher spec 尚未接入最终构建；Inno Setup 已提供基础覆盖安装清理脚本。因此构建入口不会假装已经产出安全的商业安装包，必须完成编译产物复制、签名清单和安装后扫描后才能发布。

授权客户端已按当前授权服务器协议接入，协议边界包括：

- 激活、校验、续期和离线宽限接口
- 请求签名或 TLS 证书策略
- 设备标识规则
- 成功和失败响应字段
- 公钥格式与签名算法

真实值只通过本地参数或 CI Secret 注入，禁止写入 Git。

`Generate-IntegrityManifest.py` 要求通过 `WANSHAN_MANIFEST_PRIVATE_KEY` 或 `--private-key` 提供构建机上的 Ed25519 清单签名私钥，输出 `integrity_manifest.json` 和 `integrity_manifest.sig`。私钥只存在构建机/CI，`release_config.json` 只写 `integrity_public_key`。启动时会校验签名、哈希以及清单外新增文件。

## 目标构建流程

```text
准备本地商业参数
  → Nuitka 编译业务模块
  → PyInstaller 构建启动器
  → 复制前端和运行时依赖
  → 生成 integrity_manifest.json
  → 扫描发布目录
  → Inno Setup 生成安装包
  → 安装到干净目录验证
  → Git LFS 上传安装包
```
