const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PUBLIC_KEY_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized + "=".repeat((4 - (normalized.length % 4)) % 4), "base64");
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function publicKeyFromRaw(rawPublicKey) {
  const raw = decodeBase64Url(rawPublicKey);
  if (raw.length !== 32) throw new Error("授权公钥格式无效");
  return crypto.createPublicKey({ key: Buffer.concat([PUBLIC_KEY_PREFIX, raw]), format: "der", type: "spki" });
}

function verifyLicenseDocument(document, { publicKey, productCode, deviceHash, now = Math.floor(Date.now() / 1000) }) {
  try {
    if (!document || document.alg !== "Ed25519" || !document.payload || !document.signature) return { ok: false, reason: "invalid_document" };
    const payloadBytes = decodeBase64Url(document.payload);
    const signature = decodeBase64Url(document.signature);
    const payload = JSON.parse(payloadBytes.toString("utf8"));
    if (!crypto.verify(null, payloadBytes, publicKeyFromRaw(publicKey), signature)) return { ok: false, reason: "invalid_signature" };
    if (payload.product_code !== productCode) return { ok: false, reason: "product_mismatch" };
    if (payload.device_hash !== deviceHash) return { ok: false, reason: "device_mismatch" };
    if (!Number.isFinite(Number(payload.expires_at)) || !Number.isFinite(Number(payload.grace_until))) return { ok: false, reason: "invalid_expiry" };
    if (now > Number(payload.grace_until)) return { ok: false, reason: "expired" };
    return { ok: true, payload, inGrace: now > Number(payload.expires_at) };
  } catch (_) {
    return { ok: false, reason: "invalid_document" };
  }
}

class LicenseClient {
  constructor({ baseUrl, publicKey, productCode, deviceHash, appVersion, dataPath, safeStorage, fetchImpl = globalThis.fetch, now = () => Math.floor(Date.now() / 1000) }) {
    this.baseUrl = String(baseUrl || "").replace(/\/+$/, "");
    this.publicKey = String(publicKey || "");
    this.productCode = String(productCode || "wanshan");
    this.deviceHash = String(deviceHash || "");
    this.appVersion = String(appVersion || "");
    this.dataPath = dataPath;
    this.safeStorage = safeStorage;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.lastFailReason = "";
  }

  _readState() {
    if (!this.dataPath || !fs.existsSync(this.dataPath)) return null;
    try {
      const encoded = fs.readFileSync(this.dataPath, "utf8");
      const json = this.safeStorage.decryptString(Buffer.from(encoded, "base64"));
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  _writeState(state) {
    if (!this.dataPath || !this.safeStorage || !this.safeStorage.isEncryptionAvailable()) throw new Error("系统安全存储不可用，无法保存授权");
    const encrypted = this.safeStorage.encryptString(JSON.stringify(state)).toString("base64");
    fs.mkdirSync(path.dirname(this.dataPath), { recursive: true });
    const tempPath = `${this.dataPath}.tmp`;
    fs.writeFileSync(tempPath, encrypted, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tempPath, this.dataPath);
  }

  _validate(document) {
    return verifyLicenseDocument(document, { publicKey: this.publicKey, productCode: this.productCode, deviceHash: this.deviceHash, now: this.now() });
  }

  async _request(pathname, body) {
    if (!this.baseUrl || !this.publicKey) throw Object.assign(new Error("授权服务未配置"), { code: "config" });
    if (typeof this.fetchImpl !== "function") throw Object.assign(new Error("当前运行环境不支持 HTTPS 请求"), { code: "network" });
    const response = await this.fetchImpl(`${this.baseUrl}${pathname}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(typeof data.detail === "string" ? data.detail : "授权服务器拒绝请求");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async activate(cardKey) {
    try {
      const data = await this._request("/v1/activate", { card_key: String(cardKey || "").trim(), device_hash: this.deviceHash, app_version: this.appVersion, product_code: this.productCode });
      const checked = this._validate(data.license);
      if (!checked.ok) throw new Error(`授权凭证校验失败: ${checked.reason}`);
      this._writeState({ card_key: String(cardKey || "").trim(), activation_id: data.activation_id, refresh_token: data.refresh_token, license: data.license, last_verified_at: this.now() });
      this.lastFailReason = "";
      return { success: true, ...this._infoFromState(this._readState()) };
    } catch (error) {
      this.lastFailReason = error && error.status === 403 ? "invalid" : "network";
      return { success: false, message: error instanceof Error ? error.message : "激活失败" };
    }
  }

  async verify() {
    const state = this._readState();
    if (!state || !state.license) {
      this.lastFailReason = "not_activated";
      return { ok: false, reason: this.lastFailReason };
    }
    const local = this._validate(state.license);
    if (!local.ok) {
      this.lastFailReason = local.reason;
      return { ok: false, reason: local.reason };
    }
    try {
      const refreshed = await this._request("/v1/refresh", { activation_id: state.activation_id, refresh_token: state.refresh_token, device_hash: this.deviceHash, app_version: this.appVersion, product_code: this.productCode });
      const checked = this._validate(refreshed.license);
      if (!checked.ok) throw new Error(`刷新凭证校验失败: ${checked.reason}`);
      const next = { ...state, license: refreshed.license, activation_id: refreshed.activation_id || state.activation_id, refresh_token: refreshed.refresh_token || state.refresh_token, last_verified_at: this.now() };
      this._writeState(next);
      this.lastFailReason = "";
      return { ok: true, ...checked };
    } catch (error) {
      if (!error || !error.status) {
        this.lastFailReason = "network";
        return { ok: true, offline: true, ...local };
      }
      this.lastFailReason = error.status === 403 ? "invalid" : "network";
      return { ok: false, reason: this.lastFailReason };
    }
  }

  getInfo() {
    return this._infoFromState(this._readState());
  }

  _infoFromState(state) {
    if (!state || !state.license) return null;
    const payload = this._validate(state.license).payload || {};
    return { license_key: state.card_key, license_type: payload.expires_at ? "time_limited" : "permanent", expires_at: payload.expires_at || null, grace_until: payload.grace_until || null, last_verified_at: state.last_verified_at || null, features: payload.features || [], product_code: payload.product_code || this.productCode };
  }

  logout() {
    try { fs.rmSync(this.dataPath, { force: true }); } catch (_) { /* best effort cleanup */ }
    this.lastFailReason = "not_activated";
    return true;
  }
}

module.exports = { LicenseClient, verifyLicenseDocument, decodeBase64Url, encodeBase64Url };
