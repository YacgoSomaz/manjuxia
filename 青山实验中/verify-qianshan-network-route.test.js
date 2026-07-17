const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const experimentRoot = __dirname;
const repositoryRoot = path.resolve(experimentRoot, "..");

test("青山实验中 uses the Qianshan network-backend experiment route", () => {
  const launcher = fs.readFileSync(path.join(experimentRoot, "启动青山实验室.ps1"), "utf8");
  const page = fs.readFileSync(path.join(repositoryRoot, "frontend", "qianshan-storyboard-lab.html"), "utf8");

  assert.match(launcher, /WANSHAN_ENABLE_QIANSHAN_LAB/);
  assert.match(launcher, /WANSHAN_LAUNCH_QIANSHAN_LAB/);
  assert.match(launcher, /qianshan-storyboard-lab/);
  assert.match(page, /\/api\/qianshan-lab\/storyboard-stream/);
  assert.match(page, /qianshan_direct/);
});
