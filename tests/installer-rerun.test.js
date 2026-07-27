const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("same or older installer launches an existing install instead of showing setup", () => {
  const installer = fs.readFileSync(path.join(__dirname, "..", "packaging", "installer", "万山.iss"), "utf8");
  assert.match(installer, /function InitializeSetup\(\): Boolean/);
  assert.match(installer, /UsePreviousAppDir=yes/);
  assert.match(installer, /DisableDirPage=no/);
  assert.match(installer, /AlwaysShowDirOnReadyPage=yes/);
  assert.match(installer, /DisplayVersion/);
  assert.match(installer, /InstallLocation/);
  assert.match(installer, /function InstalledAppDir\(var InstallLocation: String\): Boolean/);
  assert.match(installer, /procedure InitializeWizard\(\)/);
  assert.match(installer, /WizardForm\.DirEdit\.Text := InstallLocation/);
  assert.match(installer, /CompareVersions/);
  assert.match(installer, /LaunchExistingInstallation/);
  assert.match(installer, /ShellExec\('', ExePath/);
  assert.match(installer, /Name: "\{autodesktop\}\\漫剧虾"; Filename: "\{app\}\\漫剧虾\.exe"; WorkingDir: "\{app\}"/);
  assert.doesNotMatch(installer, /Tasks: desktopicon/);
  assert.match(installer, /Name: "\{autodesktop\}\\万山\.lnk"/);
  assert.match(installer, /function InitializeUninstall\(\): Boolean/);
  assert.match(installer, /请先退出软件及其后台进程后再重新卸载/);
});
