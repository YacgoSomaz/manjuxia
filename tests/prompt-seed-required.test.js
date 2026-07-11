const assert = require("node:assert/strict");
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
    "角色提取模板【千人千面版】【3D真人】",
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
  const names = storyboardTemplates.map((template) => template.name).join("\n");

  assert.ok(storyboardTemplates.length >= 19);
  for (const templateName of [
    "罗杰狄金斯式冷峻现实主义-最新规则版",
    "仙侠修仙·东方玄幻史诗-最新规则版",
    "机甲科幻·巨兽战争-最新规则版",
    "通用语速版·无状态版",
    "旧版备份差异版",
  ]) {
    assert.match(names, new RegExp(templateName));
  }
  for (const template of storyboardTemplates) {
    assert.ok((template.content || "").length > 1000, `${template.name} should include full prompt content`);
  }
});
