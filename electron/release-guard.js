const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, reason: "integrity_manifest.json missing" };
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

  const files = walkFiles(root);
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
