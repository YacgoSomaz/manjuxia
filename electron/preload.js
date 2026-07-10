const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  getBackendUrl: () => ipcRenderer.invoke("get-backend-url"),
  getSessionSecret: () => ipcRenderer.invoke("get-session-secret"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getVersionHistory: (limit) => ipcRenderer.invoke("get-version-history", limit),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  openLocalFile: (file) => ipcRenderer.invoke("open-local-file", file),
  openDataDir: (category) => ipcRenderer.invoke("open-data-dir", category),
  openFolder: (folder) => ipcRenderer.invoke("open-folder", folder),
  quitApp: () => ipcRenderer.invoke("quit-app"),
  openJimeng: () => ipcRenderer.invoke("open-jimeng"),
  closeJimeng: () => ipcRenderer.invoke("close-jimeng"),
  injectScript: (script) => ipcRenderer.invoke("jimeng-inject-script", script),
  getJimengUrl: () => ipcRenderer.invoke("jimeng-get-url"),
  navigateJimeng: (url) => ipcRenderer.invoke("jimeng-navigate", url),
  openLlmConfigEmbed: () => ipcRenderer.invoke("embed-config:open-llm-config"),
  safeStorage: {
    encrypt: (value) => ipcRenderer.invoke("safe-storage:encrypt", value),
    decrypt: (value) => ipcRenderer.invoke("safe-storage:decrypt", value)
  },
  onLicenseInvalid: () => {},
  update: {
    onUpdateAvailable: (callback) => ipcRenderer.on("update-available", (_event, payload) => callback(payload)),
    onUpdateProgress: (callback) => ipcRenderer.on("update-progress", (_event, payload) => callback(payload)),
    onUpdateDownloaded: (callback) => ipcRenderer.on("update-downloaded", () => callback()),
    onUpdateError: (callback) => ipcRenderer.on("update-error", (_event, payload) => callback(payload)),
    startDownload: () => ipcRenderer.invoke("start-update-download"),
    cancelDownload: () => ipcRenderer.invoke("cancel-update-download")
  }
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

contextBridge.exposeInMainWorld("wanshan", {
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  getBackendUrl: () => ipcRenderer.invoke("backend:url"),
  checkBackend: () => ipcRenderer.invoke("backend:health"),
  openDataDir: () => ipcRenderer.invoke("shell:open-data-dir")
});
