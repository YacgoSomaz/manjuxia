const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("release build packages ffmpeg where backend expects it", () => {
  const projectDir = path.resolve(__dirname, "..");
  const ffmpegPath = path.join(projectDir, "build", "ffmpeg.exe");
  const buildScript = fs.readFileSync(
    path.join(projectDir, "packaging", "build", "Build-ElectronApp.ps1"),
    "utf8"
  );

  assert.ok(fs.existsSync(ffmpegPath), "build/ffmpeg.exe must exist before packaging");
  assert.match(buildScript, /resources["']?\s*\)?\s*["']build|resources["']?\s*,?\s*["']build/i);
  assert.match(buildScript, /build\\ffmpeg\.exe/);
});
