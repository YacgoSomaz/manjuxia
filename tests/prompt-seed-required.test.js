const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("local prompt seed includes extraction and style templates", () => {
  const seedPath = path.resolve(__dirname, "..", "backend", "data", "wanshan_prompt_seed.json");
  const templates = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const source = templates.map((template) => `${template.category}\n${template.name}`).join("\n");
  for (const category of [
    "character_extraction",
    "scene_extraction",
    "prop_extraction",
    "style_prompt",
    "grid_image",
  ]) {
    assert.match(source, new RegExp(`(^|\\n)${category}\\n`));
  }
  for (const templateName of [
    "角色提取模板【千人千面】【3D真人】",
    "场景提取模板【细节版】",
    "道具提取模板【细节版】",
    "多机位道具",
  ]) {
    assert.match(source, new RegExp(templateName));
  }
});

test("local prompt seed includes migrated qianshan storyboard rules", () => {
  const seedPath = path.resolve(__dirname, "..", "backend", "data", "wanshan_prompt_seed.json");
  const templates = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const storyboardTemplates = templates.filter((template) => template.category === "storyboard_generation");
  assert.deepEqual(storyboardTemplates.map((template) => template.qianshan_id), [
    ...Array.from({ length: 29 }, (_, index) => index + 23),
    62,
  ]);
  for (const template of storyboardTemplates) {
    assert.ok((template.content || "").length > 1000, `${template.name} should include full prompt content`);
    assert.equal(template.admin_id, null, `${template.name} must remain local-only`);
    assert.equal(template.is_preset, 1);
    assert.equal(
      crypto.createHash("sha256").update(template.content, "utf8").digest("hex"),
      template.sha256,
      `${template.name} sha256 mismatch`,
    );
  }
});

test("cleaned Qianshan storyboard prompts are complete and exclude legacy selector rows", () => {
  const seedPath = path.resolve(__dirname, "..", "backend", "data", "wanshan_prompt_seed.json");
  const templates = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const storyboardTemplates = templates.filter((template) => template.category === "storyboard_generation");
  assert.equal(storyboardTemplates.length, 30);
  assert.ok(storyboardTemplates.every((template) => !/旧版勿用|测试勿使用|旧版备份差异版/.test(template.name)));
  assert.deepEqual(
    storyboardTemplates.map((template) => template.sort_order),
    [...Array.from({ length: 29 }, (_, index) => index + 23), 62],
  );
});
