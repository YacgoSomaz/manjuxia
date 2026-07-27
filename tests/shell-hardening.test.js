const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const { removeApplicationMenu } = require("../electron/shell-hardening");

test("removes Electron's default developer menu from the product window", () => {
  let applied = "not-called";
  removeApplicationMenu({ setApplicationMenu(value) { applied = value; } });
  assert.equal(applied, null);
});

test("source restarts clear only stale backends from this workspace", () => {
  const main = fs.readFileSync(path.join(__dirname, "..", "electron", "main.js"), "utf8");
  assert.match(main, /Get-CimInstance Win32_Process/);
  assert.match(main, /backendMain\.replace/);
  assert.match(main, /Stop-Process -Id/);
});

test("desktop client accepts only one running instance and focuses it on a second launch", () => {
  const main = fs.readFileSync(path.join(__dirname, "..", "electron", "main.js"), "utf8");
  assert.match(main, /app\.requestSingleInstanceLock\(\)/);
  assert.match(main, /app\.on\("second-instance"/);
  assert.match(main, /mainWindow\.isMinimized\(\)/);
  assert.match(main, /mainWindow\.restore\(\)/);
  assert.match(main, /mainWindow\.focus\(\)/);
});

test("keeps the startup status window until the local backend is ready", () => {
  const main = fs.readFileSync(path.join(__dirname, "..", "electron", "main.js"), "utf8");
  const startBackend = main.lastIndexOf("\n  startBackend();");
  const waitForBackend = main.indexOf("backendReadyPromise = waitForBackend()", startBackend);
  const createWindow = main.indexOf("\n  createWindow(", waitForBackend);
  assert.ok(startBackend >= 0 && waitForBackend > startBackend && createWindow > waitForBackend);
});

test("shows a startup status window until the workspace is ready", () => {
  const main = fs.readFileSync(path.join(__dirname, "..", "electron", "main.js"), "utf8");
  assert.match(main, /function createSplashWindow\(\)/);
  assert.match(main, /正在检查应用文件/);
  assert.match(main, /正在启动本地创作引擎/);
  assert.match(main, /closeSplashWindow\(\)/);
});

test("opens the login route immediately when no account session is stored and polls only stored sessions", () => {
  const main = fs.readFileSync(path.join(__dirname, "..", "electron", "main.js"), "utf8");
  assert.match(main, /const LICENSE_REFRESH_INTERVAL_MS = 10 \* 1000/);
  assert.match(main, /licenseClient\.hasSession\(\)/);
  assert.match(main, /createWindow\(hasStoredAccountSession \? "" : activationHash\("not_activated"\)\)/);
});
