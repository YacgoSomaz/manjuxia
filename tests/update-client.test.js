const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { compareVersions, stableJson } = require("../electron/update-client");

test("compares dotted versions numerically", () => {
  assert.equal(compareVersions("1.0.1", "1.0.0") > 0, true);
  assert.equal(compareVersions("1.10.0", "1.2.9") > 0, true);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("0.9.9", "1.0.0") < 0, true);
});

test("stableJson is deterministic for signed update manifests", () => {
  const first = { version: "1.0.1", installer: { url: "https://example.com/a.exe", sha256: "abc", size: 1 }, notes: "更新" };
  const second = { notes: "更新", installer: { size: 1, sha256: "abc", url: "https://example.com/a.exe" }, version: "1.0.1" };
  assert.equal(stableJson(first), stableJson(second));
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const signature = crypto.sign(null, Buffer.from(stableJson(first), "utf8"), privateKey);
  assert.equal(crypto.verify(null, Buffer.from(stableJson(second), "utf8"), publicKey, signature), true);
});
