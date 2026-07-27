const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized + "=".repeat((4 - (normalized.length % 4)) % 4), "base64");
}

function publicKeyFromRaw(rawPublicKey) {
  const raw = decodeBase64Url(rawPublicKey);
  if (raw.length !== 32) throw new Error("invalid Ed25519 public key");
  return crypto.createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]), format: "der", type: "spki" });
}

function readJsonFile(filePath) {
  // Windows PowerShell 5 writes UTF-8 files with a BOM for -Encoding UTF8.
  // Accept that byte-order mark so a signed, otherwise valid release can boot.
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function walkFiles(root) {
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(fullPath));
    else if (entry.isFile()) result.push(fullPath);
  }
  return result;
}

function verifyPackagedRelease(root) {
  const releaseRoot = path.resolve(root);
  const manifestPath = path.join(releaseRoot, "integrity_manifest.json");
  const signaturePath = path.join(releaseRoot, "integrity_manifest.sig");
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, reason: "integrity_manifest.json missing" };
  }
  if (!fs.existsSync(signaturePath)) {
    return { ok: false, reason: "integrity_manifest.sig missing" };
  }

  let manifest;
  try {
    manifest = readJsonFile(manifestPath);
  } catch (error) {
    return { ok: false, reason: `invalid integrity manifest: ${error.message}` };
  }
  if (manifest.version !== 2 || manifest.algorithm !== "sha256" || manifest.scope !== "core" || !manifest.files || typeof manifest.files !== "object") {
    return { ok: false, reason: "unsupported integrity manifest" };
  }

  let releaseConfig;
  try {
    releaseConfig = readJsonFile(path.join(releaseRoot, "release_config.json"));
    const signature = decodeBase64Url(fs.readFileSync(signaturePath, "utf8").trim());
    const verified = crypto.verify(null, fs.readFileSync(manifestPath), publicKeyFromRaw(releaseConfig.integrity_public_key), signature);
    if (!verified) return { ok: false, reason: "integrity manifest signature mismatch" };
  } catch (error) {
    return { ok: false, reason: `invalid integrity manifest signature: ${error.message}` };
  }

  const files = walkFiles(releaseRoot);
  const listedFiles = new Set(Object.keys(manifest.files));
  if (listedFiles.has("integrity_manifest.json") || listedFiles.has("integrity_manifest.sig")) {
    return { ok: false, reason: "integrity metadata must not be listed as payload" };
  }
  for (const relative of listedFiles) {
    const target = path.resolve(releaseRoot, relative);
    if (target !== releaseRoot && !target.startsWith(`${releaseRoot}${path.sep}`)) {
      return { ok: false, reason: `manifest path escaped release root: ${relative}` };
    }
  }
  const protectedRoots = [
    path.join(releaseRoot, "resources", "app"),
    path.join(releaseRoot, "resources", "backend-dist"),
  ];
  const sourceLeak = files.find((file) => {
    const normalized = path.resolve(file);
    const protectedCode = protectedRoots.some((root) => normalized === root || normalized.startsWith(`${root}${path.sep}`));
    return protectedCode && path.extname(file).toLowerCase() === ".py";
  });
  if (sourceLeak) return { ok: false, reason: `Python source leaked: ${path.relative(releaseRoot, sourceLeak)}` };
  const backendExecutable = path.join(releaseRoot, "resources", "backend-dist", "backend-server", "backend-server.exe");
  if (!fs.existsSync(backendExecutable) || !fs.statSync(backendExecutable).isFile()) {
    return { ok: false, reason: "compiled backend executable missing" };
  }

  for (const [relative, expected] of Object.entries(manifest.files)) {
    const target = path.resolve(releaseRoot, relative);
    if (target !== releaseRoot && !target.startsWith(`${releaseRoot}${path.sep}`)) {
      return { ok: false, reason: `manifest path escaped release root: ${relative}` };
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      return { ok: false, reason: `manifest file missing: ${relative}` };
    }
    if (sha256(target) !== expected.sha256) {
      return { ok: false, reason: `file hash mismatch: ${relative}` };
    }
  }
  return { ok: true };
}

module.exports = { verifyPackagedRelease };
