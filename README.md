# 万山

万山是从已安装包静态拆解后整理出的本地优先版本。当前版本复用原 Vue/Element Plus 前端 `dist`, 保留并改造 Python/FastAPI 后端, 替换为干净 Electron 壳。

## 目录

- `backend/`: 复用并改造后的 FastAPI 后端
- `electron/`: 新 Electron 主进程和 preload, 兼容原前端需要的 `window.electronAPI`
- `frontend/`: 从原包复用的 Vue 3 + Element Plus 打包前端
- `prompts/`: 已提取提示词库

## 运行

```powershell
cd C:\Users\q2414\Desktop\万山
npm install
npm start
```

后端 Python 依赖按需安装。当前机器默认 Python 是 3.14, 建议只安装预编译 wheel, 避免触发本机 C++/Rust 编译：

```powershell
cd C:\Users\q2414\Desktop\万山
python -m pip install --only-binary=:all: -r backend\requirements.txt
```

## 离线策略

- 启动时不再主动同步千山模板、模型配置、团队数据或敏感词远端接口。
- 本地数据目录改为 `%APPDATA%\万山\data`。
- 提示词从 `prompts/` 和 `backend/data/wanshan_prompt_seed.json` 本地加载。
- 旧云端 token、模型配置、模板内容、敏感词同步入口默认被 `WANSHAN_ENABLE_CLOUD` 禁用。
- Electron preload 不暴露旧 `license` 对象, 原前端路由守卫会直接放行, 不弹激活页。
