const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("release build blocks packaging unless the staged backend serves storyboard templates", () => {
  const verifierPath = path.join(root, "packaging", "build", "Verify-PackagedBackend.ps1");
  const releaseBuildPath = path.join(root, "packaging", "build", "build_release.ps1");

  assert.ok(fs.existsSync(verifierPath), "missing packaged backend runtime verifier");

  const verifier = fs.readFileSync(verifierPath, "utf8");
  const releaseBuild = fs.readFileSync(releaseBuildPath, "utf8");

  assert.match(verifier, /resources[\\/]backend-dist[\\/]backend-server[\\/]backend-server\.exe/);
  assert.match(verifier, /WANSHAN_BACKEND_PORT_FILE/);
  assert.match(verifier, /WANSHAN_SESSION_SECRET_FILE/);
  assert.match(verifier, /\/api\/health/);
  assert.match(verifier, /\/api\/templates\/\?category=storyboard_generation/);
  assert.match(verifier, /HMACSHA256/);
  assert.match(verifier, /RandomNumberGenerator\]::Create\(\)/);
  assert.match(verifier, /ComputeHash/);
  assert.doesNotMatch(verifier, /RandomNumberGenerator\]::Fill/);
  assert.doesNotMatch(verifier, /SHA256\]::HashData/);
  assert.match(verifier, /taskkill/);
  assert.match(verifier, /at least 20 storyboard templates/);
  assert.match(verifier, /api\/novels\/upload/);
  assert.match(verifier, /multipart\/form-data/);
  assert.match(releaseBuild, /Verify-PackagedBackend\.ps1/);
});

test("Electron waits for its exact backend handshake before loading the workbench", () => {
  const electronMain = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
  assert.match(electronMain, /--wanshan-backend-port-file/);
  assert.match(electronMain, /--wanshan-session-secret-file/);
  assert.match(electronMain, /const backendReady = await backendReadyPromise/);
  assert.match(electronMain, /BACKEND_SMOKE_OK templates=/);
  assert.match(electronMain, /Array\.isArray\(templates\)/);
  assert.ok(electronMain.indexOf("const backendReady = await backendReadyPromise") < electronMain.indexOf("createWindow();"));
});

test("packaged Electron launches the nested Nuitka backend directly", () => {
  const electronMain = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");
  const electronBuild = fs.readFileSync(path.join(root, "packaging", "build", "Build-ElectronApp.ps1"), "utf8");

  assert.match(electronMain, /path\.join\(backendDist, "backend-server", "backend-server\.exe"\)/);
  assert.doesNotMatch(electronMain, /backend-launcher\.exe/);
  assert.match(electronBuild, /backend-server\\backend-server\.exe/);
});
