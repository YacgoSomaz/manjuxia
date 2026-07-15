const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Electron pairs the current backend port with its own fresh session secret", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "..", "electron", "main.js"), "utf8");

  assert.match(source, /BACKEND_PORT_CANDIDATES = \[8000, 18472, 28800, 38765, 48899\]/);
  assert.match(source, /function backendPortCandidates\(\)/);
  assert.match(source, /const freshPort = readBackendPort\(backendLaunchStartedAt\);/);
  assert.match(source, /const freshSecret = readSessionSecret\(backendLaunchStartedAt\);/);
  assert.match(source, /const candidateUrl = `http:\/\/127\.0\.0\.1:\$\{freshPort\}`/);
  assert.match(source, /backendUrl === `http:\/\/127\.0\.0\.1:\$\{freshPort\}`/);
});
