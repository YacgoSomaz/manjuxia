const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "frontend", "qianshan-storyboard-lab.html"), "utf8");
const main = fs.readFileSync(path.join(root, "electron", "main.js"), "utf8");

test("Qianshan lab signs its local API requests and has an Electron launch gate", () => {
  assert.match(page, /async function signedLocalFetch\(/);
  assert.match(page, /signedLocalFetch\("\/api\/qianshan-lab\/direct-status"\)/);
  assert.match(page, /signedLocalFetch\("\/api\/qianshan-lab\/status"\)/);
  assert.match(page, /signedLocalFetch\(request\.url,/);
  assert.match(main, /WANSHAN_LAUNCH_QIANSHAN_LAB/);
  assert.match(main, /qianshan-storyboard-lab/);
});

test("Qianshan lab history renders both the submitted input and returned output", () => {
  assert.match(page, /run\.input_text/);
  assert.match(page, /run\.output_text/);
  assert.match(page, /历史输入/);
  assert.match(page, /历史输出/);
});
