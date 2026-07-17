const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "frontend", "index.html"), "utf8");
const runtime = fs.readFileSync(path.join(root, "frontend", "wanshan-image-generation-runtime.js"), "utf8");

test("image generation runtime is shipped and watches card-level generation state", () => {
  assert.match(indexHtml, /wanshan-image-generation-runtime\.js/);
  assert.match(runtime, /\.image-placeholder\.generating/);
  assert.match(runtime, /\.cvd-loading-overlay/);
  assert.match(runtime, /\.element-image-section \.el-button\.is-loading/);
  assert.match(runtime, /\.el-loading-mask/);
  assert.match(runtime, /pointer-events/);
});

test("image generation runtime does not replace the backend result with a fake URL", () => {
  assert.doesNotMatch(runtime, /generate-image|image_url|fetch\(/);
});
