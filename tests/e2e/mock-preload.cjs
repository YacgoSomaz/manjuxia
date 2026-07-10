const { contextBridge } = require("electron");

const mockBackendUrl = process.env.WANSHAN_E2E_BACKEND_URL || "http://mock.wanshan.test";
const mockSessionSecret = process.env.WANSHAN_E2E_SESSION_SECRET || "a".repeat(64);
const noop = async () => ({ success: true });

contextBridge.exposeInMainWorld("electronAPI", {
  getBackendUrl: async () => mockBackendUrl,
  getSessionSecret: async () => mockSessionSecret,
  getAppVersion: async () => "e2e",
  getVersionHistory: async () => ({ versions: [] }),
  openExternal: noop,
  openLocalFile: noop,
  openDataDir: noop,
  openFolder: noop,
  quitApp: noop,
  openJimeng: noop,
  closeJimeng: noop,
  injectScript: noop,
  getJimengUrl: async () => ({ success: false, url: null }),
  navigateJimeng: noop,
  openLlmConfigEmbed: noop,
  onLicenseInvalid: () => {},
  safeStorage: {
    encrypt: async (value) => Buffer.from(String(value), "utf8").toString("base64"),
    decrypt: async (value) => Buffer.from(String(value), "base64").toString("utf8"),
  },
  update: {
    onUpdateAvailable: () => {},
    onUpdateProgress: () => {},
    onUpdateDownloaded: () => {},
    onUpdateError: () => {},
    startDownload: noop,
    cancelDownload: noop,
  },
});

contextBridge.exposeInMainWorld("wanshan", {
  getAppInfo: async () => ({ name: "万山 E2E" }),
  getBackendUrl: async () => mockBackendUrl,
  checkBackend: async () => ({ ok: true, url: mockBackendUrl }),
  openDataDir: noop,
});
