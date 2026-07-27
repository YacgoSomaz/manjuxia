const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "frontend", "official-ai.js"), "utf8");

test("AI selectors expose local and official source controls", () => {
  assert.match(source, /oai-inline-source/);
  assert.match(source, /自配算力/);
  assert.match(source, /官方算力/);
  assert.match(source, /catalogItems\(result\)/);
  assert.match(source, /enabled === true && item\.available === true/);
});

test("unsupported official media categories are not fabricated", () => {
  assert.match(source, /type === "video" \|\| type === "audio"/);
  assert.match(source, /暂未开放/);
  assert.match(source, /sourceModes\.image === "official"/);
  assert.doesNotMatch(source, /sourceModes\.video\s*=\s*["']official/);
});
