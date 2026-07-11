const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("release stage does not rely on Electron default app archive", () => {
  const buildScript = fs.readFileSync(path.join(__dirname, "..", "packaging", "build", "Build-ElectronApp.ps1"), "utf8");
  assert.match(buildScript, /default_app\.asar/);
  assert.match(buildScript, /Remove-Item/);
});

test("commercial release excludes qianshan storyboard lab artifacts by default", () => {
  const electronBuild = fs.readFileSync(path.join(__dirname, "..", "packaging", "build", "Build-ElectronApp.ps1"), "utf8");
  const backendBuild = fs.readFileSync(path.join(__dirname, "..", "packaging", "build", "Compile-Backend.ps1"), "utf8");
  const backendMain = fs.readFileSync(path.join(__dirname, "..", "backend", "main.py"), "utf8");

  assert.match(electronBuild, /qianshan-storyboard-lab\.html/);
  assert.match(backendBuild, /qianshan_lab\.py/);
  assert.match(backendBuild, /qianshan_storyboard_lab\.py/);
  assert.match(backendMain, /WANSHAN_ENABLE_QIANSHAN_LAB/);
});
