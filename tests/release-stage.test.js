const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("release stage packages the application into its own app.asar archive", () => {
  const buildScript = fs.readFileSync(path.join(__dirname, "..", "packaging", "build", "Build-ElectronApp.ps1"), "utf8");
  assert.match(buildScript, /default_app\.asar/);
  assert.match(buildScript, /Remove-Item/);
  assert.match(buildScript, /\$appAsar = Join-Path \$resources "app\.asar"/);
  assert.match(buildScript, /Pack-ElectronAsar\.cjs/);
});

test("release staging obfuscates the staged Electron and custom frontend JavaScript before ASAR packing", () => {
  const buildScript = fs.readFileSync(path.join(__dirname, "..", "packaging", "build", "Build-ElectronApp.ps1"), "utf8");
  const obfuscator = fs.readFileSync(path.join(__dirname, "..", "scripts", "Obfuscate-ReleaseJavaScript.cjs"), "utf8");
  const bytecodeCompiler = fs.readFileSync(path.join(__dirname, "..", "scripts", "Compile-ElectronV8Bytecode.cjs"), "utf8");
  assert.match(buildScript, /Obfuscate-ReleaseJavaScript\.cjs/);
  assert.ok(buildScript.indexOf("Obfuscate-ReleaseJavaScript.cjs") < buildScript.indexOf("Pack-ElectronAsar.cjs"));
  assert.match(buildScript, /Compile-ElectronV8Bytecode\.cjs/);
  assert.ok(buildScript.indexOf("Obfuscate-ReleaseJavaScript.cjs") < buildScript.indexOf("Compile-ElectronV8Bytecode.cjs"));
  assert.ok(buildScript.indexOf("Compile-ElectronV8Bytecode.cjs") < buildScript.indexOf("Pack-ElectronAsar.cjs"));
  assert.match(buildScript, /Compile-ElectronV8Bytecode\.cjs"\) \$appSourceDir \$electronExe/);
  assert.match(obfuscator, /javascript-obfuscator/);
  assert.match(obfuscator, /stringArrayEncoding: \["base64"\]/);
  assert.match(obfuscator, /renameProperties: false/);
  assert.match(bytecodeCompiler, /compileElectronMainCode|electronMain: true/);
  assert.match(bytecodeCompiler, /transform-arrow-functions/);
  assert.match(bytecodeCompiler, /require\("\.\/main\.jsc"\)/);
  assert.match(bytecodeCompiler, /preload\.js/);
  assert.match(bytecodeCompiler, /cached data there/);
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
