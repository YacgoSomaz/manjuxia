const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("local API fetch waits for a signed backend session before loading selectors", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "frontend", "manjuxia-brand.js"), "utf8");
  assert.match(source, /async function waitForSessionSecret\(electronAPI, timeoutMs = 10000\)/);
  assert.match(source, /const secret = await waitForSessionSecret\(electronAPI\);/);
  assert.match(source, /本地创作引擎正在启动，请稍后重试/);
  assert.doesNotMatch(source, /secret = await electronAPI\.getSessionSecret\(\);\s*} catch \(_\) \{\s*secret = "";/);
});
