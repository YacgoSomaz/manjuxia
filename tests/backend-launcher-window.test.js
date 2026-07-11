const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("backend launcher hides the packaged backend console window on Windows", () => {
  const launcherPath = path.resolve(__dirname, "..", "packaging", "launcher", "backend_launcher.py");
  const source = fs.readFileSync(launcherPath, "utf8");

  assert.match(source, /subprocess\.CREATE_NO_WINDOW if os\.name == "nt" else 0/);
  assert.match(source, /creationflags=creationflags/);
});
