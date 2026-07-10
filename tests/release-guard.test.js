const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { verifyPackagedRelease } = require("../electron/release-guard");

function createSignedRelease() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wanshan-release-"));
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const rawPublic = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
  fs.writeFileSync(path.join(root, "万山.pyd"), Buffer.from("compiled-module"));
  fs.writeFileSync(path.join(root, "release_config.json"), JSON.stringify({ integrity_public_key: rawPublic }));
  const files = {};
  for (const name of ["万山.pyd", "release_config.json"]) {
    const file = path.join(root, name);
    files[name] = { sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), size: fs.statSync(file).size };
  }
  const manifest = Buffer.from(`${JSON.stringify({ version: 1, algorithm: "sha256", files }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "integrity_manifest.json"), manifest);
  fs.writeFileSync(path.join(root, "integrity_manifest.sig"), crypto.sign(null, manifest, privateKey).toString("base64url"));
  return root;
}

test("accepts a signed release with an exact registered file set", () => {
  const root = createSignedRelease();
  assert.deepEqual(verifyPackagedRelease(root), { ok: true });
});

test("rejects unregistered files and manifest tampering", () => {
  const extraRoot = createSignedRelease();
  fs.writeFileSync(path.join(extraRoot, "debug.js"), "console.log('debug')");
  assert.match(verifyPackagedRelease(extraRoot).reason, /unregistered release file/);

  const tamperedRoot = createSignedRelease();
  fs.appendFileSync(path.join(tamperedRoot, "integrity_manifest.json"), " ");
  assert.match(verifyPackagedRelease(tamperedRoot).reason, /signature mismatch/);
});
