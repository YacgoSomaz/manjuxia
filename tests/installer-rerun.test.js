const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("same or older installer launches an existing install instead of showing setup", () => {
  const installer = fs.readFileSync(path.join(__dirname, "..", "packaging", "installer", "万山.iss"), "utf8");
  assert.match(installer, /function InitializeSetup\(\): Boolean/);
  assert.match(installer, /DisplayVersion/);
  assert.match(installer, /InstallLocation/);
  assert.match(installer, /CompareVersions/);
  assert.match(installer, /LaunchExistingInstallation/);
  assert.match(installer, /ShellExec\('', ExePath/);
  assert.match(installer, /function InitializeUninstall\(\): Boolean/);
  assert.match(installer, /请先退出软件及其后台进程后再重新卸载/);
});
