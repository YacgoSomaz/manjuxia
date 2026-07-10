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
  const manifestPath = path.join(root, "integrity_manifest.json");
  const signaturePath = path.join(root, "integrity_manifest.sig");
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, reason: "integrity_manifest.json missing" };
  }
  if (!fs.existsSync(signaturePath)) {
    return { ok: false, reason: "integrity_manifest.sig missing" };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return { ok: false, reason: `invalid integrity manifest: ${error.message}` };
  }
  if (manifest.algorithm !== "sha256" || !manifest.files || typeof manifest.files !== "object") {
    return { ok: false, reason: "unsupported integrity manifest" };
  }

  let releaseConfig;
  try {
    releaseConfig = JSON.parse(fs.readFileSync(path.join(root, "release_config.json"), "utf8"));
    const signature = decodeBase64Url(fs.readFileSync(signaturePath, "utf8").trim());
    const verified = crypto.verify(null, fs.readFileSync(manifestPath), publicKeyFromRaw(releaseConfig.integrity_public_key), signature);
    if (!verified) return { ok: false, reason: "integrity manifest signature mismatch" };
  } catch (error) {
    return { ok: false, reason: `invalid integrity manifest signature: ${error.message}` };
  }

  const files = walkFiles(root);
  const payloadFiles = files.filter((file) => {
    const name = path.basename(file);
    return name !== "integrity_manifest.json" && name !== "integrity_manifest.sig";
  });
  const listedFiles = new Set(Object.keys(manifest.files));
  if (listedFiles.has("integrity_manifest.json") || listedFiles.has("integrity_manifest.sig")) {
    return { ok: false, reason: "integrity metadata must not be listed as payload" };
  }
  for (const file of payloadFiles) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (!listedFiles.has(relative)) return { ok: false, reason: `unregistered release file: ${relative}` };
  }
  for (const relative of listedFiles) {
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      return { ok: false, reason: `manifest path escaped release root: ${relative}` };
    }
  }
  const sourceLeak = files.find((file) => path.extname(file).toLowerCase() === ".py");
  if (sourceLeak) return { ok: false, reason: `Python source leaked: ${path.relative(root, sourceLeak)}` };
  if (!files.some((file) => path.extname(file).toLowerCase() === ".pyd")) {
    return { ok: false, reason: "compiled Python module (.pyd) missing" };
  }

  for (const [relative, expected] of Object.entries(manifest.files)) {
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
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
