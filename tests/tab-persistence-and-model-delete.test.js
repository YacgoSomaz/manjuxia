const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

test("all long-running work tabs stay mounted while switching routes", () => {
  const entry = fs.readFileSync(path.join(root, "frontend", "assets", "index-CHppf6so.js"), "utf8");
  assert.match(
    entry,
    /(?:const |,)[A-Za-z_$][A-Za-z0-9_$]*=\["NovelsView","ScriptsView","ExtractionView","StoryboardsView","VideoView","ExtraToolsView","SettingsView"\]/
  );
});

test("model configuration cards expose a quick delete action", () => {
  const ui = fs.readFileSync(path.join(root, "frontend", "wanshan-local-config.js"), "utf8");
  assert.match(ui, /wlc-item-delete/);
  assert.match(ui, /deleteConfig\(cfg\.id, itemResult\)/);
  assert.match(ui, /stopPropagation/);
  assert.match(ui, /local_only=true/);
  assert.match(ui, /function detectPageType\(\)/);
});

test("one-click local configuration follows the active model category", () => {
  const ui = fs.readFileSync(path.join(root, "frontend", "wanshan-local-config.js"), "utf8");
  assert.match(ui, /currentType = normalizeType\(preferredType\) \|\| detectPageType\(\)/);
  assert.match(ui, /onclick: \(\) => openModal\(detectPageType\(\)\)/);
  assert.match(ui, /\.config-tabs \.el-tabs__item\.is-active/);
});
