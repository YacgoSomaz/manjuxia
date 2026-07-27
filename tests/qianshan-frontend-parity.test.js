const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("character extraction templates follow the current Qianshan order and identities", () => {
  const seed = JSON.parse(fs.readFileSync(path.join(root, "backend", "data", "wanshan_prompt_seed.json"), "utf8"));
  const rows = seed.filter((item) => item.category === "character_extraction");
  assert.deepEqual(rows.map((item) => item.name), [
    "角色提取模板【千人千面】【3D真人】",
    "角色提取模板（搭配火山5.0生图模型稳过真人[独家]）【旧版】",
    "角色提取模板（适配gtp-image2）【旧版】",
    "角色提取模板【千人千面】【3D国漫】",
    "角色提取模板【千人千面】【2D国漫】",
  ]);
  assert.deepEqual(rows.map((item) => item.admin_id), [58, 5, 28, 61, 62]);
});

test("migrated Qianshan prompt payloads keep the captured current lengths", () => {
  const seed = JSON.parse(fs.readFileSync(path.join(root, "backend", "data", "wanshan_prompt_seed.json"), "utf8"));
  const expectedLengths = new Map([
    [59, 19761],
    [60, 13875],
    [6, 12197],
    [20, 24501],
    [12, 464],
  ]);
  for (const [adminId, expectedLength] of expectedLengths) {
    const row = seed.find((item) => Number(item.admin_id) === adminId);
    assert.ok(row, `missing migrated template admin_id=${adminId}`);
    assert.equal((row.content || "").length, expectedLength, `prompt length mismatch admin_id=${adminId}`);
  }
});

test("the five missing Qianshan normal templates are bundled verbatim", () => {
  const seed = JSON.parse(fs.readFileSync(path.join(root, "backend", "data", "wanshan_prompt_seed.json"), "utf8"));
  const expected = new Map([
    [8, ["小说洗稿模板", "novel_rewrite", 1483, "b1b092b42cb4519ea22256a6600a1d4190749effdee3580b906800cafa657e8a"]],
    [7, ["剧本逆转小说-国内", "script_to_novel", 2874, "23ac40fc895b2f2ddba88d5530254f53332158cc0d293d5771ec956b885b7f41"]],
    [15, ["剧本逆转小说-海外", "script_to_novel", 5594, "ac96822dd8bbbd79e750f1fe4c42b53e77372fb3440524917070ed52208d0e43"]],
    [50, ["剧本格式化-国内", "script_to_script", 8846, "14571d749dc01e388779dad3e776496a2f3d3ddce9762bbeacea87b8c9f0e7ba"]],
    [51, ["剧本格式化-海外", "script_to_script", 4674, "7c9a05300e4b81c2953bfcf613031601560f7695f44870eb7ad8ef531fee9ebb"]],
  ]);
  for (const [adminId, [name, category, expectedLength, expectedSha256]] of expected) {
    const row = seed.find((item) => Number(item.admin_id) === adminId);
    assert.ok(row, `missing Qianshan template admin_id=${adminId}`);
    assert.equal(row.name, name);
    assert.equal(row.category, category);
    assert.equal(row.source, "qianshan_current_remote");
    assert.equal((row.content || "").length, expectedLength, `prompt length mismatch admin_id=${adminId}`);
    assert.equal(crypto.createHash("sha256").update(row.content, "utf8").digest("hex"), expectedSha256);
  }
});

test("extension scripts use the shared route contract", () => {
  for (const name of [
    "wanshan-recovery-tools.js",
    "wanshan-topview.js",
    "wanshan-extraction-batch.js",
    "wanshan-supplement-video.js",
    "wanshan-pippit.js",
    "wanshan-voice.js",
  ]) {
    const source = fs.readFileSync(path.join(root, "frontend", name), "utf8");
    assert.match(source, /wanshanRoute/, `${name} must use route-aware visibility`);
    assert.match(source, /\.watch\(/, `${name} must clean up on route changes`);
  }
  const index = fs.readFileSync(path.join(root, "frontend", "index.html"), "utf8");
  assert.match(index, /wanshan-route\.js/);
});

test("prompt metadata required by the Qianshan sync contract is present in the local schema and sorter", () => {
  const dbSource = fs.readFileSync(path.join(root, "backend", "database", "db.py"), "utf8");
  const templateSource = fs.readFileSync(path.join(root, "backend", "services", "template_service.py"), "utf8");
  assert.match(dbSource, /tags TEXT DEFAULT/);
  assert.match(dbSource, /screen_mode TEXT DEFAULT/);
  assert.match(templateSource, /category == "character_extraction"/);
  assert.match(templateSource, /_EXTRACTION_ORDER_HINTS/);
});
