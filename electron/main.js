const { app, BrowserWindow, dialog, ipcMain, shell, safeStorage } = require("electron");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { isTrustedExternalUrl, isTrustedJimengUrl } = require("./trusted-origins");
const { verifyPackagedRelease } = require("./release-guard");
const { LicenseClient } = require("./license-client");

const APP_NAME = "万山";

let mainWindow = null;
let jimengWindow = null;
let backendProcess = null;
let backendUrl = "http://127.0.0.1:8000";
let licenseClient = null;
let commercialBuild = false;

function rootDir() {
  return app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..");
}

function dataDir() {
  const override = process.env.WANSHAN_DATA_DIR;
  if (override) return path.resolve(override);
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, APP_NAME, "data");
}

function readReleaseConfig() {
  const configPath = process.env.WANSHAN_RELEASE_CONFIG || path.join(rootDir(), "release_config.json");
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return { ...config, commercial: Boolean(config.commercial) };
  } catch (_) {
    return { commercial: process.env.WANSHAN_COMMERCIAL === "1" };
  }
}

function getMachineId() {
  const stableParts = [process.env.ComputerName || os.hostname(), process.platform, process.arch];
  return crypto.createHash("sha256").update(stableParts.join("|"), "utf8").digest("hex");
}

function initializeLicenseClient() {
  const config = readReleaseConfig();
  commercialBuild = Boolean(config.commercial);
  licenseClient = new LicenseClient({
    baseUrl: config.license_server_url || process.env.WANSHAN_LICENSE_SERVER_URL || "",
    publicKey: config.license_public_key || process.env.WANSHAN_LICENSE_PUBLIC_KEY || "",
    productCode: config.product_code || process.env.WANSHAN_PRODUCT_CODE || "wanshan",
    deviceHash: getMachineId(),
    appVersion: app.getVersion(),
    dataPath: path.join(dataDir(), "license.dat"),
    safeStorage
  });
}

async function syncLicenseContext() {
  if (!commercialBuild || !licenseClient) return;
  const info = licenseClient.getInfo();
  if (!info || !backendUrl) return;
  try {
    await fetch(`${backendUrl}/api/license/context/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: info.license_key, machine_id: getMachineId(), source: "wanshan" })
    });
  } catch (_) {
    // The local app remains usable if its local backend is still starting.
  }
}

function backendPortFile() {
  return path.join(dataDir(), "backend.port");
}

function sessionSecretFile() {
  return path.join(dataDir(), "backend.session");
}

function readBackendPort() {
  try {
    const raw = fs.readFileSync(backendPortFile(), "utf8").trim();
    const port = Number.parseInt(raw, 10);
    if (Number.isFinite(port) && port > 0 && port < 65536) return port;
  } catch (_) {
    // The backend writes this after it chooses a free port.
  }
  return null;
}

function readSessionSecret() {
  try {
    const buf = fs.readFileSync(sessionSecretFile());
    if (buf.length === 32) return buf.toString("hex");
    const raw = buf.toString("utf8").trim();
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return raw.toLowerCase();
  } catch (_) {
    // The frontend can still call non-protected endpoints while backend starts.
  }
  return "";
}

function requestHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(`${url}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend() {
  for (let i = 0; i < 60; i += 1) {
    const port = readBackendPort();
    if (port) {
      backendUrl = `http://127.0.0.1:${port}`;
      if (await requestHealth(backendUrl)) return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function startBackend() {
  const backendMain = path.join(rootDir(), "backend", "main.py");
  if (!fs.existsSync(backendMain)) {
    console.warn("[wanshan] backend/main.py not found:", backendMain);
    return;
  }

  fs.mkdirSync(dataDir(), { recursive: true });
  try {
    fs.rmSync(backendPortFile(), { force: true });
    fs.rmSync(sessionSecretFile(), { force: true });
  } catch (_) {
    // Ignore stale runtime files.
  }

  const python = process.env.WANSHAN_PYTHON || "python";
  backendProcess = childProcess.spawn(python, [backendMain], {
    cwd: path.dirname(backendMain),
    env: {
      ...process.env,
      WANSHAN_APP_NAME: APP_NAME,
      PYTHONUTF8: "1"
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  backendProcess.stdout.on("data", (chunk) => console.log(`[backend] ${chunk.toString().trim()}`));
  backendProcess.stderr.on("data", (chunk) => console.error(`[backend] ${chunk.toString().trim()}`));
  backendProcess.on("exit", (code) => {
    console.log("[wanshan] backend exited:", code);
    backendProcess = null;
  });
}

function stopBackend() {
  if (!backendProcess) return;
  if (process.platform === "win32") {
    childProcess.spawn("taskkill", ["/pid", String(backendProcess.pid), "/f", "/t"], { windowsHide: true });
  } else {
    backendProcess.kill("SIGTERM");
  }
  backendProcess = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: "#0b1020",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(rootDir(), "frontend", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow && mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
}

function ensureInside(base, target) {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error("Path escaped allowed directory");
  }
  return resolvedTarget;
}

async function openEnsured(target) {
  fs.mkdirSync(target, { recursive: true });
  const result = await shell.openPath(target);
  return result ? { success: false, error: result, path: target } : { success: true, path: target };
}

function encryptText(text) {
  const value = String(text || "");
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString("base64");
  }
  return Buffer.from(value, "utf8").toString("base64");
}

function decryptText(encoded) {
  if (!encoded) return "";
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(String(encoded), "base64"));
  }
  return Buffer.from(String(encoded), "base64").toString("utf8");
}

function openJimengWindow() {
  if (jimengWindow && !jimengWindow.isDestroyed()) {
    jimengWindow.focus();
    return;
  }
  jimengWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: "即梦",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  jimengWindow.loadURL("https://jimeng.jianying.com");
  jimengWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedExternalUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  jimengWindow.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedJimengUrl(url)) event.preventDefault();
  });
  jimengWindow.on("closed", () => {
    jimengWindow = null;
  });
}

ipcMain.handle("get-backend-url", () => backendUrl);
ipcMain.handle("get-session-secret", () => readSessionSecret());
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-version-history", () => ({ versions: [] }));

ipcMain.handle("safe-storage:encrypt", (_event, value) => encryptText(value));
ipcMain.handle("safe-storage:decrypt", (_event, value) => decryptText(value));

ipcMain.handle("open-external", async (_event, url) => {
  if (!isTrustedExternalUrl(url)) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle("open-local-file", async (_event, relativePath) => {
  const frontendDir = path.join(rootDir(), "frontend");
  const target = ensureInside(frontendDir, path.join(frontendDir, String(relativePath || "")));
  const result = await shell.openPath(target);
  return result ? { success: false, error: result, path: target } : { success: true, path: target };
});

ipcMain.handle("open-data-dir", async (_event, subdir) => {
  const allowed = new Set(["images", "videos", "audios", "subtitle_removed"]);
  const target = subdir && allowed.has(subdir) ? path.join(dataDir(), subdir) : dataDir();
  return openEnsured(target);
});

ipcMain.handle("open-folder", async (_event, folderPath) => {
  if (!folderPath || typeof folderPath !== "string") {
    return { success: false, error: "路径参数无效" };
  }
  return openEnsured(folderPath);
});

ipcMain.handle("quit-app", async () => {
  app.quit();
  return true;
});

ipcMain.handle("open-jimeng", () => {
  openJimengWindow();
  return { success: true, message: "即梦窗口已打开" };
});

ipcMain.handle("close-jimeng", () => {
  if (jimengWindow && !jimengWindow.isDestroyed()) jimengWindow.close();
  return { success: true, message: "即梦窗口已关闭" };
});

ipcMain.handle("jimeng-get-url", () => {
  if (!jimengWindow || jimengWindow.isDestroyed()) {
    return { success: false, url: null, message: "即梦窗口未打开" };
  }
  return { success: true, url: jimengWindow.webContents.getURL(), message: "获取URL成功" };
});

ipcMain.handle("jimeng-navigate", async (_event, url) => {
  if (!jimengWindow || jimengWindow.isDestroyed()) {
    return { success: false, message: "即梦窗口未打开" };
  }
  if (!isTrustedJimengUrl(url)) {
    return { success: false, message: "仅允许受信任的即梦页面" };
  }
  await jimengWindow.loadURL(url);
  return { success: true, message: "导航成功" };
});

ipcMain.handle("jimeng-inject-script", async (_event, script) => {
  if (!jimengWindow || jimengWindow.isDestroyed()) {
    return { success: false, message: "即梦窗口未打开" };
  }
  if (!isTrustedJimengUrl(jimengWindow.webContents.getURL())) {
    return { success: false, message: "当前页面不在受信任的即梦域名内" };
  }
  try {
    const result = await jimengWindow.webContents.executeJavaScript(String(script || ""));
    return { success: true, result, message: "脚本注入成功" };
  } catch (error) {
    return { success: false, message: `脚本注入失败: ${error.message}` };
  }
});

ipcMain.handle("embed-config:open-llm-config", () => ({
  success: false,
  code: "LOCAL_OFFLINE",
  message: "万山本地离线版已禁用云端模型配置页"
}));

ipcMain.handle("start-update-download", () => ({
  success: false,
  error: "万山本地离线版已禁用自动更新"
}));

ipcMain.handle("cancel-update-download", () => true);

ipcMain.handle("app:info", () => ({
  name: APP_NAME,
  backendUrl,
  dataDir: dataDir(),
  rootDir: rootDir()
}));
ipcMain.handle("backend:url", () => backendUrl);
ipcMain.handle("backend:health", async () => ({ ok: await requestHealth(backendUrl), url: backendUrl }));
ipcMain.handle("shell:open-data-dir", () => shell.openPath(dataDir()));

ipcMain.handle("license:get-machine-id", () => getMachineId());
ipcMain.handle("license:get-info", () => (commercialBuild && licenseClient ? licenseClient.getInfo() : null));
ipcMain.handle("license:get-last-fail-reason", () => licenseClient?.lastFailReason || "");
ipcMain.handle("license:activate", async (_event, cardKey) => {
  if (!commercialBuild || !licenseClient) return { success: true, license_type: "permanent", expires_at: null };
  const result = await licenseClient.activate(cardKey);
  if (result.success) await syncLicenseContext();
  return result;
});
ipcMain.handle("license:verify", async () => {
  if (!commercialBuild || !licenseClient) return true;
  const result = await licenseClient.verify();
  if (result.ok) await syncLicenseContext();
  return Boolean(result.ok);
});
ipcMain.handle("license:logout", async () => {
  if (licenseClient) licenseClient.logout();
  try {
    await fetch(`${backendUrl}/api/license/context/clear`, { method: "POST" });
  } catch (_) {
    // The next backend start begins with an empty in-memory context.
  }
  return true;
});

app.whenReady().then(async () => {
  app.setName(APP_NAME);
  initializeLicenseClient();
  if (app.isPackaged) {
    const releaseCheck = verifyPackagedRelease(rootDir());
    if (!releaseCheck.ok) {
      dialog.showErrorBox("万山启动失败", `安装包完整性校验失败：${releaseCheck.reason}`);
      app.quit();
      return;
    }
  }
  startBackend();
  await waitForBackend();
  createWindow();
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopBackend();
});
