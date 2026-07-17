# 青山实验中

这是独立于远端 `main` 的千山接口实验入口，只应在 `codex/qingshan-experiment` 分支使用。

运行 `启动青山实验室.ps1` 后，Electron 会打开实验页并锁定为“千山分镜直发：不转剧本”。提交会通过本机已登录的千山后端网络流程：

`实验页 → /api/qianshan-lab/storyboard-stream → 千山本地后端 → 千山远端服务`

实验运行数据使用 `%APPDATA%\万山青山实验中\data`，独立于旧版千山和万山正式数据目录。此分支不应直接合并到远端 `main`；确认成熟后再按需挑选改动。

运行校验：

```powershell
node --test "青山实验中/verify-qianshan-network-route.test.js"
```
