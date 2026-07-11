const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("script template picker falls back when script-to-script templates are empty", () => {
  const assetPath = path.resolve(__dirname, "..", "frontend", "assets", "ScriptsView-CWRWjoci.js");
  const source = fs.readFileSync(assetPath, "utf8");

  assert.match(source, /await Ee\(t\)/);
  assert.match(
    source,
    /t==="script_to_script"&&m\.value&&e\.length===0&&\(e=await Ee\("script_conversion"\)\)/
  );
});
