const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const backend = fs.readFileSync(path.join(__dirname, "..", "backend", "api", "video.py"), "utf8");
const page = fs.readFileSync(path.join(__dirname, "..", "frontend", "wanshan-history.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "..", "frontend", "index.html"), "utf8");

test("history API reads completed local storyboard videos", () => {
  assert.match(backend, /@router\.get\("\/history"\)/);
  assert.match(backend, /video_status = 'done'/);
  assert.match(backend, /video_url IS NOT NULL/);
  assert.match(backend, /resolve_db_path\(video_url\)/);
});

test("history page is discoverable and renders playable videos", () => {
  assert.match(index, /wanshan-history\.js/);
  assert.match(page, /历史成片/);
  assert.match(page, /\/api\/video\/history\?limit=200&offset=0/);
  assert.match(page, /cache: "no-store"/);
  assert.match(page, /document\.createElement\("video"\)/);
  assert.match(page, /video\.controls = true/);
  assert.match(page, /视频文件暂时不可用/);
});
