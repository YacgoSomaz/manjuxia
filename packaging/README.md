# 商业版发布加固

本目录是万山商业版发布流程的安全骨架。它不包含真实授权服务器地址、授权公钥、服务端私钥或用户数据。

## 目录

- `config/release.example.json`: 本地构建参数示例
- `build/build_release.ps1`: 构建入口和参数校验
- `build/Generate-IntegrityManifest.py`: 生成发布文件 SHA-256 清单
- `build/Scan-Release.ps1`: 检查发布目录是否混入源码、数据库、Cookie、日志或临时文件
- `release/`: 本地构建产物，使用 Git LFS 管理，不提交到普通源码历史

## 当前边界

当前项目是 Electron + Python 源码运行结构，还没有经过审核的 Nuitka 模块布局、PyInstaller launcher spec 和 Inno Setup 脚本。因此构建入口先负责参数、工具和发布目录校验，不会假装已经产出安全的商业安装包。

授权客户端需要授权服务器的正式 API 协议后才能接入，至少需要：

- 激活、校验、续期和离线宽限接口
- 请求签名或 TLS 证书策略
- 设备标识规则
- 成功和失败响应字段
- 公钥格式与签名算法

真实值只通过本地参数或 CI Secret 注入，禁止写入 Git。

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
