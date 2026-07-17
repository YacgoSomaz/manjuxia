const { app, BrowserWindow, dialog, ipcMain, shell, safeStorage, Menu } = require("electron");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { isTrustedExternalUrl, isTrustedJimengUrl } = require("./trusted-origins");
const { verifyPackagedRelease } = require("./release-guard");
const { LicenseClient } = require("./license-client");
const { AccountClient } = require("./account-client");
const { UpdateClient } = require("./update-client");
const { readReleaseConfig } = require("./release-config");
const { removeApplicationMenu } = require("./shell-hardening");
const { normalizeLlmConfigRequest } = require("./local-api-bridge");

const APP_NAME = "漫剧虾";
const DATA_APP_NAME = "万山";
const PRODUCT_ID = "comic_shrimp";
const isBackendSmoke = process.argv.includes("--backend-smoke");
const isPrimaryInstance = isBackendSmoke ? true : app.requestSingleInstanceLock();

if (!isPrimaryInstance) {
  app.exit(0);
}

let mainWindow = null;
let splashWindow = null;
let jimengWindow = null;
let qianshanConfigWindow = null;
let backendProcess = null;
let backendUrl = "http://127.0.0.1:8000";
let backendLaunchStartedAt = 0;
let backendReadyPromise = null;
const runtimeId = `${process.pid}-${Date.now()}`;
let licenseClient = null;
let commercialBuild = false;
let releaseConfig = null;
let updateClient = null;
let updatePromptInFlight = false;
let authMode = "license";
let licenseRefreshTimer = null;
let licenseRefreshInFlight = false;
const BACKEND_PORT_CANDIDATES = [8000, 18472, 28800, 38765, 48899];
// Revocations made in the account backend must reach an open client promptly.
// The signed snapshot remains valid for short network outages, but an online
// client re-checks the authoritative account endpoint once per minute.
const LICENSE_REFRESH_INTERVAL_MS = 60 * 1000;

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

if (isPrimaryInstance) {
  app.on("second-instance", () => {
    focusMainWindow();
  });
}

function rootDir() {
  return app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..");
}

function appIconPath() {
  return path.join(rootDir(), "frontend", "assets", "manjuxia-app-icon.ico");
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 320,
    minWidth: 520,
    minHeight: 320,
    maxWidth: 520,
    maxHeight: 320,
    title: APP_NAME,
    icon: appIconPath(),
    show: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    backgroundColor: "#081126",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const markup = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#081126;color:#e7f1ff;font-family:"Microsoft YaHei",sans-serif}
    main{height:320px;padding:42px;display:flex;flex-direction:column;justify-content:center;background:radial-gradient(circle at 78% 18%,#123c672e,transparent 36%)}
    .brand{display:flex;align-items:center;gap:14px;font-size:25px;font-weight:700;color:#ffffff}.mark{width:42px;height:42px;border-radius:14px;background:#17c9d6;display:grid;place-items:center;color:#071122;font-size:22px}
    .copy{margin:22px 0 12px;color:#b8c9e3;font-size:14px}.line{height:4px;border-radius:3px;background:#1b2a47;overflow:hidden}.line span{display:block;width:42%;height:100%;border-radius:inherit;background:#20d5de;animation:loading 1.35s ease-in-out infinite}
    .step{margin-top:18px;color:#78dce6;font-size:13px}@keyframes loading{0%{transform:translateX(-110%)}55%{transform:translateX(180%)}100%{transform:translateX(260%)}}
  </style></head><body><main><div class="brand"><div class="mark">✦</div><span>漫剧虾</span></div><div class="copy">正在准备你的 AI 漫剧创作工作台</div><div class="line"><span></span></div><div class="step" id="step">正在检查应用文件…</div></main><script>const steps=["正在检查应用文件…","正在启动本地创作引擎…","正在载入工作台…"];let i=0;setInterval(()=>{i=(i+1)%steps.length;document.getElementById("step").textContent=steps[i]},1200)</script></body></html>`;
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(markup)}`);
  splashWindow.on("closed", () => { splashWindow = null; });
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
  splashWindow = null;
}

function dataDir() {
  const override = process.env.WANSHAN_DATA_DIR;
  if (override) return path.resolve(override);
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, DATA_APP_NAME, "data");
}

function getMachineId() {
  const stableParts = [process.env.ComputerName || os.hostname(), process.platform, process.arch];
  return crypto.createHash("sha256").update(stableParts.join("|"), "utf8").digest("hex");
}

function initializeLicenseClient() {
  const config = readReleaseConfig({ rootDir: rootDir(), isPackaged: app.isPackaged, env: process.env });
  releaseConfig = config;
  commercialBuild = Boolean(config.commercial);
  authMode = String(config.auth_mode || process.env.WANSHAN_AUTH_MODE || (commercialBuild ? "account" : "license")).toLowerCase();
  if (authMode === "account") {
    licenseClient = new AccountClient({
      baseUrl: config.account_api_url || process.env.WANSHAN_ACCOUNT_API_URL || "https://anyq.site",
      publicKey: config.account_public_key || process.env.WANSHAN_ACCOUNT_PUBLIC_KEY || "",
      productCode: PRODUCT_ID,
      deviceHash: getMachineId(),
      appVersion: app.getVersion(),
      dataPath: path.join(dataDir(), "account.dat"),
      safeStorage
    });
    return;
  }
  licenseClient = new LicenseClient({
    baseUrl: config.license_server_url || process.env.WANSHAN_LICENSE_SERVER_URL || "",
    publicKey: config.license_public_key || process.env.WANSHAN_LICENSE_PUBLIC_KEY || "",
    productCode: PRODUCT_ID,
    deviceHash: getMachineId(),
    appVersion: app.getVersion(),
    dataPath: path.join(dataDir(), "license.dat"),
    safeStorage
  });
}

async function syncLicenseContext() {
  if (!commercialBuild || !licenseClient) return;
  const info = licenseClient.getInfo();
  if (!info || !info.active || !backendUrl) return;
  try {
    await requestBackend("/api/license/context/set", {
      method: "POST",
      body: {
        license_key: info.license_key,
        machine_id: getMachineId(),
        source: "account",
        product_id: info.product_id,
        entitlement: "comic_course",
        expires_at: info.expires_at,
        signed_until: info.signed_until
      }
    });
  } catch (_) {
    // The local app remains usable if its local backend is still starting.
  }
  const cloudToken = typeof licenseClient.getCloudToken === "function" ? licenseClient.getCloudToken() : null;
  if (cloudToken && cloudToken.accessToken) {
    await pushCloudTokenToBackend(cloudToken);
  }
}

async function clearLicenseContext() {
  try {
    await requestBackend("/api/license/context/clear", { method: "POST", body: {} });
  } catch (_) {
    // The next backend start begins with an empty in-memory context.
  }
}

function activationHash(reason) {
  const value = String(reason || "unknown").trim() || "unknown";
  return `/activation?reason=${encodeURIComponent(value)}`;
}

function shouldLogoutForLicenseFailure(reason) {
  if (authMode === "account") {
    return !["network", "expired", "unauthorized_tool"].includes(String(reason || ""));
  }
  return String(reason || "") !== "network";
}

async function navigateToActivation(reason) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const hash = activationHash(reason);
  try {
    const currentUrl = mainWindow.webContents.getURL();
    if (currentUrl.includes(`#${hash}`)) return;
    await mainWindow.webContents.executeJavaScript(
      `window.location.hash = ${JSON.stringify(hash)}`,
      true
    );
  } catch (_) {
    try {
      await mainWindow.loadFile(path.join(rootDir(), "frontend", "index.html"), { hash });
    } catch (error) {
      console.error("[license] failed to navigate to activation:", error);
    }
  }
}

async function enforceLicenseState(source = "timer") {
  if (!commercialBuild || !licenseClient) return true;
  if (licenseRefreshInFlight) return true;
  licenseRefreshInFlight = true;
  try {
    const result = await licenseClient.verify();
    if (result && result.ok) {
      await syncLicenseContext();
      return true;
    }
    if (authMode === "account" && result && result.authenticated) {
      await clearLicenseContext();
      const reason = result.reason || licenseClient.lastFailReason || "unauthorized_tool";
      console.warn(`[license] account is authenticated but not entitled from ${source}: ${reason}`);
      await navigateToActivation(reason);
      return false;
    }
    const reason = (result && result.reason) || licenseClient.lastFailReason || "unknown";
    console.warn(`[license] verification failed from ${source}: ${reason}`);
    if (shouldLogoutForLicenseFailure(reason)) {
      licenseClient.logout();
      await clearLicenseContext();
    }
    await navigateToActivation(reason);
    return false;
  } catch (error) {
    console.error(`[license] verification error from ${source}:`, error);
    await navigateToActivation("network");
    return false;
  } finally {
    licenseRefreshInFlight = false;
  }
}

function startLicenseRefreshTimer() {
  if (!commercialBuild || !licenseClient || licenseRefreshTimer) return;
  licenseRefreshTimer = setInterval(() => {
    enforceLicenseState("interval").catch((error) => {
      console.error("[license] interval refresh failed:", error);
    });
  }, LICENSE_REFRESH_INTERVAL_MS);
  if (typeof licenseRefreshTimer.unref === "function") licenseRefreshTimer.unref();
  console.log(`[license] periodic refresh enabled: ${LICENSE_REFRESH_INTERVAL_MS / 60000} minutes`);
}

function stopLicenseRefreshTimer() {
  if (!licenseRefreshTimer) return;
  clearInterval(licenseRefreshTimer);
  licenseRefreshTimer = null;
}

async function requirePaidDesktopAction() {
  if (!commercialBuild || authMode !== "account" || !licenseClient) return { allowed: true };
  // Paid actions are an authorization boundary. Re-check the authoritative
  // account endpoint instead of trusting a previously cached snapshot, so a
  // server-side stop takes effect on the next action even before the timer.
  const result = await licenseClient.verify();
  if (result && result.ok) {
    await syncLicenseContext();
    return { allowed: true };
  }
  if (result && result.authenticated) {
    await clearLicenseContext();
    const choice = await dialog.showMessageBox(mainWindow || undefined, {
      type: "info",
      title: "需要漫剧虾会员",
      message: "此功能需要漫剧虾会员",
      detail: "当前账号可以浏览工作台。开通或续费后即可使用生成、编辑、导出和即梦相关功能。",
      buttons: ["取消", "去官网开通"],
      defaultId: 1,
      cancelId: 0,
      noLink: true
    });
    if (choice.response === 1) {
      const handoff = await licenseClient.createWebHandoff();
      await shell.openExternal(handoff.continueUrl || "https://anyq.site/");
    }
    return { allowed: false, message: "此功能需要漫剧虾会员，请先到官网开通或续费" };
  }
  await enforceLicenseState("paid-ipc");
  return { allowed: false, message: "请先完成手机号登录" };
}

async function downloadUpdateWithRetry(result) {
  while (true) {
    try {
      const downloaded = await updateClient.downloadAndInstall();
      if (downloaded && downloaded.success) return true;
      throw new Error((downloaded && downloaded.error) || "安装包下载失败");
    } catch (error) {
      const retry = await dialog.showMessageBox(mainWindow || undefined, {
        type: "error",
        title: "更新失败",
        message: error instanceof Error ? error.message : String(error),
        detail: result.mandatory ? "必须完成签名、大小和 SHA-256 校验后才能继续使用。" : "可以稍后重试更新。",
        buttons: result.mandatory ? ["重试", "退出"] : ["重试", "稍后"],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      });
      if (retry.response !== 0) {
        if (result.mandatory) app.quit();
        return false;
      }
    }
  }
}

async function presentUpdate(result) {
  if (!updateClient || !result || !result.updateAvailable || updatePromptInFlight) return;
  updatePromptInFlight = true;
  try {
    if (!result.mandatory) {
      const choice = await dialog.showMessageBox(mainWindow || undefined, {
        type: "info",
        title: `${APP_NAME}有新版本`,
        message: `发现新版本 ${result.version}`,
        detail: result.notes || "安装更新可获得最新功能与修复。",
        buttons: ["稍后", "立即安装"],
        defaultId: 1,
        cancelId: 0,
        noLink: true
      });
      if (choice.response === 1) await downloadUpdateWithRetry(result);
      return;
    }

    const choice = await dialog.showMessageBox(mainWindow || undefined, {
      type: "info",
      title: `${APP_NAME}需要更新`,
      message: `检测到必须安装的新版本 ${result.version}`,
      detail: result.notes || "请完成更新后继续使用。",
      buttons: ["立即更新", "退出"],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });
    if (choice.response !== 0) {
      app.quit();
      return;
    }
    await downloadUpdateWithRetry(result);
  } finally {
    updatePromptInFlight = false;
  }
}

async function checkForUpdatesOnStartup() {
  if (!updateClient) return;
  try {
    await updateClient.check();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateClient.emit("update-error", { error: message, source: "startup" });
  }
}

async function pushCloudTokenToBackend(token) {
  if (!token || !token.accessToken || !backendUrl) return { success: false, message: "远端登录态为空" };
  try {
    const response = await requestBackend("/api/license/context/set-cloud-token", {
      method: "POST",
      body: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken || "",
        expiresIn: Number(token.expiresIn || 7200),
        userId: token.userId || null,
        team: token.team || null
      }
    });
    return response;
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "同步远端登录态失败" };
  }
}

function backendPortFile() {
  return path.join(dataDir(), `backend.${runtimeId}.port`);
}

function sessionSecretFile() {
  return path.join(dataDir(), `backend.${runtimeId}.session`);
}

function isFreshRuntimeFile(filePath, minMtimeMs) {
  if (!minMtimeMs) return true;
  try {
    return fs.statSync(filePath).mtimeMs >= minMtimeMs - 500;
  } catch (_) {
    return false;
  }
}

function readBackendPort(minMtimeMs = 0) {
  try {
    const filePath = backendPortFile();
    if (!isFreshRuntimeFile(filePath, minMtimeMs)) return null;
    const raw = fs.readFileSync(filePath, "utf8").trim();
    const port = Number.parseInt(raw, 10);
    if (Number.isFinite(port) && port > 0 && port < 65536) return port;
  } catch (_) {
    // The backend writes this after it chooses a free port.
  }
  return null;
}

function backendPortCandidates() {
  const filePort = readBackendPort();
  const ports = [];
  if (filePort) ports.push(filePort);
  for (const port of BACKEND_PORT_CANDIDATES) {
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}

function readSessionSecret(minMtimeMs = 0) {
  try {
    const filePath = sessionSecretFile();
    if (!isFreshRuntimeFile(filePath, minMtimeMs)) return "";
    const buf = fs.readFileSync(filePath);
    if (buf.length === 32) return buf.toString("hex");
    const raw = buf.toString("utf8").trim();
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return raw.toLowerCase();
  } catch (_) {
    // The frontend can still call non-protected endpoints while backend starts.
  }
  return "";
}

function createBackendSignatureHeaders(pathname, bodyText = "") {
  const secretHex = readSessionSecret(backendLaunchStartedAt);
  if (!secretHex) throw new Error("本地后端安全通道尚未就绪");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString("hex");
  const bodyHash = crypto.createHash("sha256").update(bodyText, "utf8").digest("hex");
  const licenseKey = licenseClient?.getInfo()?.license_key || "account-bridge";
  const message = `${licenseKey}|${pathname}|${timestamp}|${nonce}|${bodyHash}`;
  const token = crypto.createHmac("sha256", Buffer.from(secretHex, "hex")).update(message, "utf8").digest("hex");
  return {
    "X-Session-License": licenseKey,
    "X-Session-Nonce": nonce,
    "X-Session-Timestamp": timestamp,
    "X-Session-Token": token
  };
}

async function requestBackend(requestPath, { method = "GET", body, bodyText } = {}) {
  await ensureBackendSecureReady();
  if (!backendUrl) throw new Error("本地后端尚未启动");
  const backendOrigin = new URL(backendUrl);
  const target = new URL(String(requestPath || ""), `${backendUrl}/`);
  if (target.origin !== backendOrigin.origin) throw new Error("本地后端请求地址无效");
  const serializedBody = bodyText === undefined ? (body === undefined ? "" : JSON.stringify(body)) : String(bodyText);
  const headers = createBackendSignatureHeaders(target.pathname, serializedBody);
  if (body !== undefined || bodyText !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(target, { method, headers, body: body === undefined && bodyText === undefined ? undefined : serializedBody });
  const data = await response.json().catch(() => ({ success: response.ok }));
  if (!response.ok) throw new Error(data.detail || data.message || `本地后端请求失败(${response.status})`);
  return data;
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
    const freshPort = readBackendPort(backendLaunchStartedAt);
    const freshSecret = readSessionSecret(backendLaunchStartedAt);
    if (freshPort && freshSecret) {
      const candidateUrl = `http://127.0.0.1:${freshPort}`;
      if (await requestHealth(candidateUrl)) {
        backendUrl = candidateUrl;
        return true;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function hasBackendSecureChannel() {
  const freshPort = readBackendPort(backendLaunchStartedAt);
  const freshSecret = readSessionSecret(backendLaunchStartedAt);
  return Boolean(freshPort && freshSecret && backendUrl === `http://127.0.0.1:${freshPort}`);
}

async function ensureBackendSecureReady() {
  if (hasBackendSecureChannel()) return;
  if (!backendReadyPromise) {
    backendReadyPromise = waitForBackend().finally(() => {
      backendReadyPromise = null;
    });
  }
  const ready = await backendReadyPromise;
  if (!ready || !hasBackendSecureChannel()) {
    throw new Error("本地后端安全通道启动超时，请稍后重试");
  }
}

function startBackend() {
  const backendMain = path.join(rootDir(), "backend", "main.py");
  const backendDist = path.join(rootDir(), "backend-dist");
  const packagedBackend = path.join(backendDist, "backend-server", "backend-server.exe");
  const legacyPackagedBackend = path.join(backendDist, "backend-server.exe");
  let command = process.env.WANSHAN_PYTHON || "python";
  let args = [backendMain];
  let cwd = path.dirname(backendMain);
  if (app.isPackaged && fs.existsSync(packagedBackend)) {
    command = packagedBackend;
    args = [];
    cwd = path.dirname(packagedBackend);
  } else if (app.isPackaged && fs.existsSync(legacyPackagedBackend)) {
    command = legacyPackagedBackend;
    args = [];
    cwd = backendDist;
  } else if (!fs.existsSync(backendMain)) {
    console.warn("[wanshan] backend entrypoint not found:", backendMain);
    return;
  }

  // argv is the authoritative pairing channel for the installed backend. It
  // prevents the renderer from attaching to a stale fallback port when a
  // Windows launch environment loses a custom child-process environment key.
  args = args.concat([
    "--wanshan-backend-port-file", backendPortFile(),
    "--wanshan-session-secret-file", sessionSecretFile()
  ]);

  // Source-mode restarts used to leave Python backends listening on every
  // fallback port. The next renderer could then pair a fresh session secret
  // with an old backend and all read-only selectors appeared empty.
  if (!app.isPackaged && process.platform === "win32") {
    const escapedBackendMain = backendMain.replace(/'/g, "''");
    const cleanupCommand = `$target='${escapedBackendMain}'; Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -like \"*$target*\" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    try {
      childProcess.execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cleanupCommand], {
        windowsHide: true,
        stdio: "ignore"
      });
    } catch (_) {
      // A failed cleanup only means the normal dynamic port fallback is used.
    }
  }

  fs.mkdirSync(dataDir(), { recursive: true });
  try {
    fs.rmSync(backendPortFile(), { force: true });
    fs.rmSync(sessionSecretFile(), { force: true });
  } catch (_) {
    // Ignore stale runtime files.
  }
  backendLaunchStartedAt = Date.now();
  backendReadyPromise = null;

  backendProcess = childProcess.spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      WANSHAN_APP_NAME: DATA_APP_NAME,
      WANSHAN_BACKEND_PORT_FILE: backendPortFile(),
      WANSHAN_SESSION_SECRET_FILE: sessionSecretFile(),
      WANSHAN_REQUIRE_ACCOUNT_AUTH: commercialBuild ? "1" : "0",
      WANSHAN_REQUIRED_PRODUCT_ID: PRODUCT_ID,
      WANSHAN_REQUIRED_ENTITLEMENT: "comic_course",
      WANSHAN_ENABLE_CLOUD: process.env.WANSHAN_ENABLE_CLOUD || "0",
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
  backendReadyPromise = null;
  try {
    fs.rmSync(backendPortFile(), { force: true });
    fs.rmSync(sessionSecretFile(), { force: true });
  } catch (_) {
    // Ignore cleanup failures.
  }
}

function hasBlockedLaunchArgument() {
  const blocked = [
    /^--inspect(?:$|=|-)/i,
    /^--remote-debugging-(?:port|address)(?:$|=)/i,
    /^--disable-web-security$/i,
    /^--allow-running-insecure-content$/i,
    /^--no-sandbox$/i
  ];
  return process.argv.slice(1).find((argument) => blocked.some((pattern) => pattern.test(argument))) || "";
}

function closePackagedDevTools(window) {
  if (!app.isPackaged) return;
  window.webContents.on("devtools-opened", () => window.webContents.closeDevTools());
  window.webContents.on("before-input-event", (event, input) => {
    const key = String(input.key || "").toLowerCase();
    if (input.type === "keyDown" && (key === "f12" || (input.control && input.shift && key === "i"))) {
      event.preventDefault();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: APP_NAME,
    icon: appIconPath(),
    backgroundColor: "#f6f7f9",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged,
      webSecurity: true
    }
  });
  closePackagedDevTools(mainWindow);

  const launchQianshanLab = process.env.WANSHAN_ENABLE_QIANSHAN_LAB === "1"
    && process.env.WANSHAN_LAUNCH_QIANSHAN_LAB === "1";
  if (launchQianshanLab) {
    mainWindow.loadURL(`${backendUrl}/qianshan-storyboard-lab`);
  } else {
    mainWindow.loadFile(path.join(rootDir(), "frontend", "index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
    closeSplashWindow();
  });
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
      sandbox: true,
      devTools: false,
      webSecurity: true
    }
  });
  closePackagedDevTools(jimengWindow);
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

async function captureQianshanCloudToken() {
  if (!qianshanConfigWindow || qianshanConfigWindow.isDestroyed()) {
    return { success: false, message: "千山配置窗口未打开" };
  }
  const url = qianshanConfigWindow.webContents.getURL();
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch (_) {
    return { success: false, message: "当前页面地址无效" };
  }
  if (!["qianshanai.cn", "www.qianshanai.cn"].includes(host)) {
    return { success: false, message: "请先在千山配置窗口完成登录" };
  }
  const raw = await qianshanConfigWindow.webContents.executeJavaScript(`(() => {
    const userRaw = localStorage.getItem("userInfo") || "{}";
    let user = {};
    try { user = JSON.parse(userRaw) || {}; } catch (_) {}
    return JSON.stringify({
      accessToken: localStorage.getItem("accessToken") || "",
      refreshToken: localStorage.getItem("refreshToken") || "",
      userId: user.id || user.userId || null,
      team: user.team || null
    });
  })()`, true);
  const token = JSON.parse(raw || "{}");
  if (!token.accessToken) return { success: false, message: "未检测到千山登录态，请在窗口内登录后刷新" };
  return pushCloudTokenToBackend({ ...token, expiresIn: 7200 });
}

function openQianshanConfigWindow() {
  if (qianshanConfigWindow && !qianshanConfigWindow.isDestroyed()) {
    qianshanConfigWindow.focus();
    return { success: true, message: "千山远端模型配置窗口已打开" };
  }
  qianshanConfigWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "千山远端模型配置",
    backgroundColor: "#0b1020",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
      webSecurity: true
    }
  });
  closePackagedDevTools(qianshanConfigWindow);
  qianshanConfigWindow.loadURL("https://qianshanai.cn/user/llm-configs");
  qianshanConfigWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedExternalUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  qianshanConfigWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (!["qianshanai.cn", "www.qianshanai.cn"].includes(host)) event.preventDefault();
    } catch (_) {
      event.preventDefault();
    }
  });
  qianshanConfigWindow.webContents.on("did-finish-load", () => {
    captureQianshanCloudToken().catch(() => {});
  });
  qianshanConfigWindow.on("closed", () => {
    qianshanConfigWindow = null;
  });
  return { success: true, message: "千山远端模型配置窗口已打开" };
}

ipcMain.handle("get-backend-url", () => backendUrl);
ipcMain.handle("get-session-secret", () => readSessionSecret());
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-version-history", () => ({ versions: [] }));

ipcMain.handle("local-api:llm-configs", async (_event, request = {}) => {
  const method = String(request.method || "GET").toUpperCase();
  const requestPath = normalizeLlmConfigRequest(request.path, method);
  const rawBody = request.body === undefined || request.body === null ? undefined : String(request.body);
  if (rawBody && Buffer.byteLength(rawBody, "utf8") > 512 * 1024) {
    throw new Error("本地模型配置请求内容过大");
  }
  return requestBackend(requestPath, { method, bodyText: rawBody });
});

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

ipcMain.handle("open-jimeng", async () => {
  const access = await requirePaidDesktopAction();
  if (!access.allowed) return { success: false, code: "membership_required", message: access.message };
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
  const access = await requirePaidDesktopAction();
  if (!access.allowed) return { success: false, code: "membership_required", message: access.message };
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
  const access = await requirePaidDesktopAction();
  if (!access.allowed) return { success: false, code: "membership_required", message: access.message };
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

ipcMain.handle("embed-config:open-llm-config", async () => {
  const access = await requirePaidDesktopAction();
  if (!access.allowed) return { success: false, code: "membership_required", message: access.message };
  return openQianshanConfigWindow();
});
ipcMain.handle("embed-config:sync-llm-token", async () => {
  const access = await requirePaidDesktopAction();
  if (!access.allowed) return { success: false, code: "membership_required", message: access.message };
  return captureQianshanCloudToken();
});

ipcMain.handle("check-for-updates", async () => {
  if (!updateClient) return { updateAvailable: false, reason: "updater_not_initialized" };
  try {
    return await updateClient.check();
  } catch (error) {
    const payload = { error: error.message || String(error) };
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("update-error", payload);
    return { updateAvailable: false, ...payload };
  }
});

ipcMain.handle("start-update-download", async () => {
  if (!updateClient) return { success: false, error: "更新器尚未初始化" };
  try {
    return await updateClient.downloadAndInstall();
  } catch (error) {
    const payload = { error: error.message || String(error) };
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("update-error", payload);
    return { success: false, ...payload };
  }
});

ipcMain.handle("cancel-update-download", () => (updateClient ? updateClient.cancel() : true));

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
  if (authMode === "account") return { success: false, message: "当前版本已切换为手机号验证码登录，请使用账号登录入口" };
  const result = await licenseClient.activate(cardKey);
  if (result.success) await syncLicenseContext();
  return result;
});
ipcMain.handle("license:verify", async () => {
  if (!commercialBuild || !licenseClient) return true;
  return enforceLicenseState("ipc");
});
ipcMain.handle("license:logout", async () => {
  if (licenseClient && typeof licenseClient.logoutRemote === "function") await licenseClient.logoutRemote();
  if (licenseClient) licenseClient.logout();
  await clearLicenseContext();
  return true;
});

ipcMain.handle("account:send-code", async (_event, phone) => {
  if (!commercialBuild || authMode !== "account" || !licenseClient || typeof licenseClient.sendCode !== "function") {
    return { success: false, message: "账号登录服务未启用" };
  }
  try {
    return await licenseClient.sendCode(phone);
  } catch (error) {
    console.error("[account] send-code request failed:", {
      message: error instanceof Error ? error.message : String(error),
      code: error && error.code ? error.code : "",
      cause: error && error.cause ? String(error.cause.message || error.cause) : ""
    });
    return { success: false, message: error instanceof Error ? error.message : "验证码发送失败" };
  }
});

ipcMain.handle("account:login", async (_event, phone, code) => {
  if (!commercialBuild || authMode !== "account" || !licenseClient || typeof licenseClient.login !== "function") {
    return { success: false, message: "账号登录服务未启用" };
  }
  const result = await licenseClient.login(phone, code);
  if (result.success && result.active) {
    void syncLicenseContext().catch((error) => console.warn("[account] deferred local context sync failed:", error));
  } else if (result.success) {
    // A successful login can still be a free, expired, or disabled account.
    // Never leave the previous account's local commercial context active.
    await clearLicenseContext();
  }
  return result;
});

ipcMain.handle("account:me", async () => {
  if (!commercialBuild || authMode !== "account" || !licenseClient) return { success: true, user: null, active: true };
  // This endpoint is the explicit account refresh action. It must ask the
  // server, not replay the locally cached signed snapshot, so an admin stop
  // or expiry is visible without restarting or manually forcing a reload.
  const verified = await licenseClient.verify();
  if (verified.ok) {
    await syncLicenseContext();
  } else {
    // The UI refresh is also an authorization boundary. Clearing the local
    // backend context makes a server-side stop effective immediately.
    await clearLicenseContext();
  }
  return { success: true, ok: verified.ok, authenticated: Boolean(verified.ok || verified.authenticated), reason: verified.reason || "", info: licenseClient.getInfo() };
});

ipcMain.handle("account:logout", async () => {
  if (licenseClient && typeof licenseClient.logoutRemote === "function") await licenseClient.logoutRemote();
  if (licenseClient) licenseClient.logout();
  await clearLicenseContext();
  return { success: true };
});

ipcMain.handle("account:create-payment", async (_event, planId) => {
  if (!commercialBuild || authMode !== "account" || !licenseClient || typeof licenseClient.createPayment !== "function") {
    return { success: false, message: "账号支付服务未启用" };
  }
  const access = await requirePaidDesktopAction();
  if (!access.allowed) return { success: false, code: "membership_required", message: access.message };
  return licenseClient.createPayment(planId);
});

ipcMain.handle("account:payment-status", async (_event, orderNo) => {
  if (!commercialBuild || authMode !== "account" || !licenseClient || typeof licenseClient.getPaymentStatus !== "function") {
    return { success: false, message: "账号支付服务未启用" };
  }
  const access = await requirePaidDesktopAction();
  if (!access.allowed) return { success: false, code: "membership_required", message: access.message };
  return licenseClient.getPaymentStatus(orderNo);
});

ipcMain.handle("account:recharge-url", async () => {
  if (!commercialBuild || authMode !== "account" || !licenseClient || typeof licenseClient.createWebHandoff !== "function") {
    return { success: true, continueUrl: "https://anyq.site/" };
  }
  return licenseClient.createWebHandoff();
});

app.whenReady().then(async () => {
  app.setName(APP_NAME);
  removeApplicationMenu(Menu);
  createSplashWindow();
  if (app.isPackaged) {
    const blockedArgument = hasBlockedLaunchArgument();
    if (blockedArgument) {
      dialog.showErrorBox(`${APP_NAME}启动失败`, `检测到被禁止的启动参数：${blockedArgument}`);
      closeSplashWindow();
      app.quit();
      return;
    }
  }
  initializeLicenseClient();
  if (app.isPackaged) {
    const releaseCheck = verifyPackagedRelease(path.dirname(rootDir()));
    if (!releaseCheck.ok) {
      dialog.showErrorBox(`${APP_NAME}启动失败`, `安装包完整性校验失败：${releaseCheck.reason}`);
      closeSplashWindow();
      app.quit();
      return;
    }
  }
  startBackend();
  backendReadyPromise = waitForBackend();
  const backendReady = await backendReadyPromise;
  if (!backendReady) {
    const message = "本地创作引擎未能启动，请退出后重试。";
    console.error("[backend] startup synchronization failed:", message);
    if (isBackendSmoke) {
      console.error("BACKEND_SMOKE_FAIL", message);
      app.exit(1);
      return;
    }
    dialog.showErrorBox(`${APP_NAME}启动失败`, message);
    closeSplashWindow();
    app.quit();
    return;
  }

  if (isBackendSmoke) {
    try {
      const templates = await requestBackend("/api/templates/?category=storyboard_generation");
      const templateItems = Array.isArray(templates)
        ? templates
        : (Array.isArray(templates?.data) ? templates.data : []);
      const count = templateItems.length;
      if (count < 20) throw new Error(`分镜模板数量不足: ${count}`);
      console.log(`BACKEND_SMOKE_OK templates=${count} url=${backendUrl}`);
      app.exit(0);
    } catch (error) {
      console.error("BACKEND_SMOKE_FAIL", error instanceof Error ? error.message : String(error));
      app.exit(1);
    }
    return;
  }

  createWindow();
  backendReadyPromise = null;
  // Verify the account before forwarding any cached entitlement to the local
  // backend. This closes the startup window where a server-side revocation
  // could otherwise be mistaken for the last locally cached snapshot.
  const startupLicenseValid = await enforceLicenseState("startup");
  if (startupLicenseValid) {
    void syncLicenseContext().catch((error) => console.error("[backend] startup synchronization failed:", error));
  }
  startLicenseRefreshTimer();
  updateClient = new UpdateClient({ app, config: releaseConfig, dataDir: dataDir(), mainWindow });
  // The renderer already owns the update dialog and progress bar. Do not
  // open a second native confirmation dialog here: the renderer receives
  // update-available/update-progress/update-downloaded through preload and
  // can show the complete state transition to the user.
  updateClient.startRealtimeMonitoring();
  if (app.isPackaged) {
    setTimeout(() => checkForUpdatesOnStartup(), 5000);
  }
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopLicenseRefreshTimer();
  if (updateClient) updateClient.stopRealtimeMonitoring();
  stopBackend();
});
