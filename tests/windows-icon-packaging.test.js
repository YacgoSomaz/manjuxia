const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

test("uses the 漫剧虾 icon for the executable, installer, and shortcuts", () => {
  assert.equal(fs.existsSync(path.join(root, "packaging", "installer", "漫剧虾.ico")), true);
  assert.equal(fs.existsSync(path.join(root, "frontend", "assets", "manjuxia-app-icon.ico")), true);
  const build = fs.readFileSync(path.join(root, "packaging", "build", "Build-ElectronApp.ps1"), "utf8");
  const installer = fs.readFileSync(path.join(root, "packaging", "installer", "万山.iss"), "utf8");
  assert.match(build, /Set-WindowsIcon\.cjs/);
  assert.match(build, /Get-ChildItem -LiteralPath \(Join-Path \$projectRoot "frontend"\)/);
  assert.match(build, /frontend staging failed: missing/);
  assert.match(build, /frontend release verification failed: missing/);
  assert.match(build, /assets\\manjuxia-app-icon\.ico/);
  assert.match(build, /\$_.Extension -ieq "\.map"/);
  assert.match(build, /\$_.Extension -in "\.map", "\.md", "\.tmp", "\.bak"/);
  assert.match(installer, /SetupIconFile=\{#SourcePath\}\\漫剧虾\.ico/);
  assert.match(installer, /IconFilename: "\{app\}\\漫剧虾\.exe"/);
});
