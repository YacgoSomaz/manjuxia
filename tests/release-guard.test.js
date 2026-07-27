const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { verifyPackagedRelease } = require("../electron/release-guard");

function createSignedRelease({ withBom = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wanshan-release-"));
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const rawPublic = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
  fs.mkdirSync(path.join(root, "resources", "app", "electron"), { recursive: true });
  fs.mkdirSync(path.join(root, "resources", "backend-dist", "backend-server"), { recursive: true });
  fs.writeFileSync(path.join(root, "漫剧虾.exe"), Buffer.from("electron-core"));
  fs.writeFileSync(path.join(root, "resources", "app", "electron", "main.js"), Buffer.from("auth and startup core"));
  fs.writeFileSync(path.join(root, "resources", "backend-dist", "backend-server", "backend-server.exe"), Buffer.from("compiled-backend"));
  const releaseConfig = JSON.stringify({ integrity_public_key: rawPublic });
  fs.writeFileSync(path.join(root, "release_config.json"), withBom ? `\uFEFF${releaseConfig}` : releaseConfig);
  const files = {};
  for (const name of [
    "漫剧虾.exe",
    "resources/app/electron/main.js",
    "resources/backend-dist/backend-server/backend-server.exe",
  ]) {
    const file = path.join(root, name);
    files[name] = { sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), size: fs.statSync(file).size };
  }
  const manifest = Buffer.from(`${JSON.stringify({ version: 2, algorithm: "sha256", scope: "core", files }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "integrity_manifest.json"), manifest);
  fs.writeFileSync(path.join(root, "integrity_manifest.sig"), crypto.sign(null, manifest, privateKey).toString("base64url"));
  return root;
}

test("accepts a signed core manifest while allowing runtime-created files", () => {
  const root = createSignedRelease();
  fs.mkdirSync(path.join(root, "resources", "user-data"), { recursive: true });
  fs.writeFileSync(path.join(root, "resources", "user-data", "generated-image.png"), Buffer.from("user asset"));
  fs.writeFileSync(path.join(root, "resources", "runtime-cache.tmp"), Buffer.from("runtime cache"));
  fs.writeFileSync(path.join(root, "resources", "backend-dist", "backend-server", "runtime-library.dll"), Buffer.from("runtime dependency"));
  assert.deepEqual(verifyPackagedRelease(root), { ok: true });
});

test("accepts a signed release whose JSON metadata has a UTF-8 BOM", () => {
  const root = createSignedRelease({ withBom: true });
  assert.deepEqual(verifyPackagedRelease(root), { ok: true });
});

test("rejects core tampering and manifest tampering", () => {
  const tamperedCoreRoot = createSignedRelease();
  fs.appendFileSync(path.join(tamperedCoreRoot, "resources", "app", "electron", "main.js"), "tampered");
  assert.match(verifyPackagedRelease(tamperedCoreRoot).reason, /file hash mismatch/);

  const tamperedRoot = createSignedRelease();
  fs.appendFileSync(path.join(tamperedRoot, "integrity_manifest.json"), " ");
  assert.match(verifyPackagedRelease(tamperedRoot).reason, /signature mismatch/);
});

test("commercial manifest generator treats app.asar as the Electron core boundary", () => {
  const generator = fs.readFileSync(
    path.join(__dirname, "..", "packaging", "build", "Generate-IntegrityManifest.py"),
    "utf8"
  );
  assert.match(generator, /resources\/app\.asar/);
  assert.doesNotMatch(generator, /resources\/app\/electron/);
});
