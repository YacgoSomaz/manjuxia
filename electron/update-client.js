const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PRODUCT_ID = "comic_shrimp";
const UPDATE_ORIGIN = "https://anyq.site";
const UPDATE_SCHEMA = "anyq.desktop-update.v1";
const UPDATE_TYPE = "desktop-release";
const UPDATE_KEY_ID = "update-v1";
const DOWNLOAD_HOST = "download.anyq.site";
const CLOCK_SKEW_SECONDS = 120;
const MAX_RELEASE_SECONDS = 86_400;
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const VERSION_RE = /^\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

function decodeBase64Url(value, label, maximumBytes) {
  const text = String(value || "");
  if (!text || text.length > maximumBytes * 2 || !/^[A-Za-z0-9_-]+$/.test(text)) {
    throw new Error(`${label}_invalid`);
  }
  const decoded = Buffer.from(text, "base64url");
  if (!decoded.length || decoded.length > maximumBytes) throw new Error(`${label}_invalid`);
  return decoded;
}

function publicKeyFromRaw(rawPublicKey) {
  const raw = decodeBase64Url(rawPublicKey, "public_key", 64);
  if (raw.length !== 32) throw new Error("public_key_invalid");
  return crypto.createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: "der", type: "spki" });
}

function compareVersions(a, b) {
  const left = String(a || "0").split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const right = String(b || "0").split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] || 0) - (right[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function hasDuplicateJsonObjectKeys(json) {
  const stack = [];
  for (let index = 0; index < json.length; index += 1) {
    if (json[index] === "\"") {
      let key = "";
      index += 1;
      for (; index < json.length; index += 1) {
        if (json[index] === "\\") { key += json[index] + (json[index + 1] || ""); index += 1; continue; }
        if (json[index] === "\"") break;
        key += json[index];
      }
      let next = index + 1;
      while (next < json.length && /\s/.test(json[next])) next += 1;
      const parent = stack[stack.length - 1];
      if (parent && parent.type === "object" && json[next] === ":") {
        let decoded;
        try { decoded = JSON.parse(`"${key}"`); } catch (_) { return true; }
        if (typeof decoded !== "string" || parent.keys.has(decoded)) return true;
        parent.keys.add(decoded);
      }
      continue;
    }
    if (json[index] === "{") stack.push({ type: "object", keys: new Set() });
    else if (json[index] === "[") stack.push({ type: "array" });
    else if (json[index] === "}" || json[index] === "]") stack.pop();
  }
  return false;
}

function parseObject(bytes) {
  const text = bytes.toString("utf8");
  if (hasDuplicateJsonObjectKeys(text)) throw new Error("duplicate_key");
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_payload");
  return value;
}

function assertInteger(value, field) {
  if (!Number.isSafeInteger(value)) throw new Error(`invalid_${field}`);
  return value;
}

function parseInstallerUrl(value) {
  if (typeof value !== "string" || !value || value.length > 2048) throw new Error("invalid_installer_url");
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:"
    || parsed.hostname !== DOWNLOAD_HOST
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || !parsed.pathname.toLowerCase().endsWith(".exe")
  ) throw new Error("invalid_installer_url");
  return parsed.toString();
}

function parsePublishedAt(value) {
  if (typeof value !== "string" || !value || value.length > 64 || !Number.isFinite(Date.parse(value))) {
    throw new Error("invalid_published_at");
  }
  return value;
}

function normalizeUpdateKey(publicKey) {
  if (typeof publicKey === "string") return publicKey;
  if (publicKey && typeof publicKey === "object") return publicKey[UPDATE_KEY_ID] || "";
  return "";
}

function validateReleasePayload(payload, productId, now) {
  if (payload.typ !== UPDATE_TYPE || payload.iss !== UPDATE_ORIGIN) throw new Error("payload_mismatch");
  if (payload.aud !== productId || payload.product_id !== productId) throw new Error("audience_mismatch");

  const issuedAt = assertInteger(payload.issued_at, "issued_at");
  const signedUntil = assertInteger(payload.signed_until, "signed_until");
  if (signedUntil <= issuedAt || signedUntil - issuedAt > MAX_RELEASE_SECONDS || issuedAt > now + CLOCK_SKEW_SECONDS) {
    throw new Error("invalid_signature_window");
  }
  if (now > signedUntil) throw new Error("signature_expired");

  const version = payload.version;
  const minSupportedVersion = payload.min_supported_version;
  if (typeof version !== "string" || !VERSION_RE.test(version) || typeof minSupportedVersion !== "string" || !VERSION_RE.test(minSupportedVersion)) {
    throw new Error("invalid_version");
  }
  if (typeof payload.mandatory !== "boolean") throw new Error("invalid_mandatory");
  if (typeof payload.sha256 !== "string" || !SHA256_RE.test(payload.sha256)) throw new Error("invalid_sha256");
  const sizeBytes = assertInteger(payload.size_bytes, "size_bytes");
  if (sizeBytes < 1 || sizeBytes > 10 * 1024 * 1024 * 1024) throw new Error("invalid_size_bytes");
  if (typeof payload.notes !== "string" || payload.notes.length > 4000) throw new Error("invalid_notes");

  return {
    productId,
    version,
    minSupportedVersion,
    mandatory: payload.mandatory,
    installerUrl: parseInstallerUrl(payload.installer_url),
    sha256: payload.sha256,
    sizeBytes,
    notes: payload.notes,
    publishedAt: parsePublishedAt(payload.published_at),
    issuedAt,
    signedUntil
  };
}

function verifyUpdateRelease(reply, { publicKey, productId = PRODUCT_ID, now = Math.floor(Date.now() / 1000) }) {
  try {
    if (!reply || typeof reply !== "object") return { ok: false, reason: "invalid_update_response" };
    if (reply.update_release == null) return { ok: true, release: null };
    const envelope = reply.update_release;
    if (!envelope || typeof envelope !== "object" || envelope.schema !== UPDATE_SCHEMA || envelope.alg !== "Ed25519") {
      return { ok: false, reason: "invalid_update_envelope" };
    }
    if (envelope.key_id !== UPDATE_KEY_ID) return { ok: false, reason: "unknown_update_key" };
    const selectedKey = normalizeUpdateKey(publicKey);
    if (!selectedKey) return { ok: false, reason: "unknown_update_key" };
    const payloadBytes = decodeBase64Url(envelope.payload, "payload", 32 * 1024);
    const signature = decodeBase64Url(envelope.signature, "signature", 128);
    if (signature.length !== 64 || !crypto.verify(null, payloadBytes, publicKeyFromRaw(selectedKey), signature)) {
      return { ok: false, reason: "invalid_update_signature" };
    }
    return { ok: true, release: validateReleasePayload(parseObject(payloadBytes), productId, now) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "invalid_update_payload" };
  }
}

class UpdateClient {
  constructor({ app, config, dataDir, mainWindow, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
    this.app = app;
    this.config = config || {};
    this.dataDir = dataDir;
    this.mainWindow = mainWindow;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.currentRelease = null;
    this.abortController = null;
  }

  emit(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) this.mainWindow.webContents.send(channel, payload);
  }

  releaseUrl() {
    return `${UPDATE_ORIGIN}/api/v1/releases/latest?product_id=${PRODUCT_ID}`;
  }

  async check() {
    const publicKey = normalizeUpdateKey(this.config.update_public_key);
    if (!publicKey) return { updateAvailable: false, reason: "update_public_key_not_configured" };
    const response = await this.fetchImpl(this.releaseUrl(), {
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json", "X-Product-Code": PRODUCT_ID }
    });
    if (!response.ok) throw new Error(`更新信息请求失败: HTTP ${response.status}`);
    const verified = verifyUpdateRelease(await response.json(), {
      publicKey,
      productId: PRODUCT_ID,
      now: Math.floor(this.now() / 1000)
    });
    if (!verified.ok) throw new Error(`更新签名校验失败：${verified.reason}`);
    if (!verified.release) return { updateAvailable: false, reason: "no_published_release" };

    const release = verified.release;
    const currentVersion = this.app.getVersion();
    const minimumRequired = compareVersions(currentVersion, release.minSupportedVersion) < 0;
    if (compareVersions(release.version, currentVersion) <= 0) {
      if (minimumRequired) throw new Error("更新发布数据无可用安装包，无法满足最低支持版本");
      return { updateAvailable: false, version: release.version, mandatory: false };
    }
    this.currentRelease = release;
    const result = {
      updateAvailable: true,
      version: release.version,
      notes: release.notes,
      size: release.sizeBytes,
      mandatory: release.mandatory || minimumRequired
    };
    this.emit("update-available", result);
    return result;
  }

  async downloadAndInstall() {
    if (!this.currentRelease) {
      const checked = await this.check();
      if (!checked.updateAvailable) return { success: false, error: checked.reason || "当前已是最新版本" };
    }
    const release = this.currentRelease;
    const updateDir = path.join(this.dataDir, "updates");
    fs.mkdirSync(updateDir, { recursive: true });
    const target = path.join(updateDir, `ComicShrimpSetup_${release.version}.exe`);
    this.abortController = new AbortController();
    const response = await this.fetchImpl(release.installerUrl, { signal: this.abortController.signal, redirect: "error" });
    if (!response.ok || !response.body) throw new Error(`安装包下载失败: HTTP ${response.status}`);
    const contentLength = String(response.headers.get("content-length") || "");
    if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) !== release.sizeBytes)) {
      throw new Error("安装包字节数校验失败，已拒绝安装");
    }

    const temporary = `${target}.${Date.now()}.part`;
    const file = fs.createWriteStream(temporary);
    const reader = response.body.getReader();
    let downloaded = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        if (!file.write(chunk)) await new Promise((resolve) => file.once("drain", resolve));
        downloaded += chunk.length;
        this.emit("update-progress", { downloaded, total: release.sizeBytes, percent: Math.round((downloaded / release.sizeBytes) * 100) });
      }
      await new Promise((resolve, reject) => file.end((error) => error ? reject(error) : resolve()));
      if (downloaded !== release.sizeBytes || sha256(temporary) !== release.sha256) {
        throw new Error("安装包完整性校验失败，已拒绝安装");
      }
      fs.rmSync(target, { force: true });
      fs.renameSync(temporary, target);
    } catch (error) {
      file.destroy();
      fs.rmSync(temporary, { force: true });
      throw error;
    } finally {
      reader.releaseLock();
    }

    this.emit("update-downloaded", { path: target, version: release.version });
    require("node:child_process").spawn(target, ["/NORESTART"], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    setTimeout(() => this.app.quit(), 500);
    return { success: true, path: target };
  }

  cancel() {
    if (this.abortController) this.abortController.abort();
    this.abortController = null;
    return true;
  }
}

module.exports = { PRODUCT_ID, UPDATE_KEY_ID, UpdateClient, compareVersions, verifyUpdateRelease };
