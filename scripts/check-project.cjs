const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "package.json",
  "electron/main.js",
  "electron/preload.js",
  "frontend/index.html",
  "frontend/assets/index-CHppf6so.js",
  "frontend/assets/index-DcZCm4BG.css",
  "backend/main.py",
  "backend/data/wanshan_prompt_seed.json",
  "prompts/index.json"
];

for (const file of required) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`missing: ${file}`);
    process.exitCode = 1;
  }
}

const prompts = JSON.parse(fs.readFileSync(path.join(root, "prompts/index.json"), "utf8"));
if (!Array.isArray(prompts) || prompts.length === 0) {
  console.error("prompt index is empty");
  process.exitCode = 1;
}

for (const prompt of prompts) {
  const fullPath = path.join(root, "prompts", prompt.file);
  if (!fs.existsSync(fullPath)) {
    console.error(`missing prompt file: ${prompt.file}`);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(`project ok: ${required.length} core files, ${prompts.length} prompts`);
}
