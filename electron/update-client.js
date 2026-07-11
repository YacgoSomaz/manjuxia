const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { shell } = require("electron");

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized + "=".repeat((4 - (normalized.length % 4)) % 4), "base64");
}

function publicKeyFromRaw(rawPublicKey) {
  const raw = decodeBase64Url(rawPublicKey);
  if (raw.length !== 32) throw new Error("invalid Ed25519 public key");
  return crypto.createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]), format: "der", type: "spki" });
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
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

function ensureSafeUrl(value) {
  const parsed = new URL(String(value || ""));
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLocal)) {
    throw new Error("更新地址必须使用 HTTPS，或仅限本机 HTTP 调试地址");
  }
  return parsed.toString();
}

function verifyUpdateManifest(manifest, publicKey) {
  if (!manifest || typeof manifest !== "object") throw new Error("更新清单格式无效");
  if (!manifest.signature) throw new Error("更新清单缺少签名");
  const signature = decodeBase64Url(manifest.signature);
  const payload = { ...manifest };
  delete payload.signature;
  const verified = crypto.verify(null, Buffer.from(stableJson(payload), "utf8"), publicKeyFromRaw(publicKey), signature);
  if (!verified) throw new Error("更新清单签名不匹配");
  return payload;
}

class UpdateClient {
  constructor({ app, config, dataDir, mainWindow }) {
    this.app = app;
    this.config = config || {};
    this.dataDir = dataDir;
    this.mainWindow = mainWindow;
    this.currentManifest = null;
    this.abortController = null;
  }

  emit(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload);
    }
  }

  async check() {
    const feedUrl = this.config.update_feed_url || process.env.WANSHAN_UPDATE_FEED_URL || "";
    const publicKey = this.config.update_public_key || this.config.integrity_public_key || process.env.WANSHAN_UPDATE_PUBLIC_KEY || "";
    if (!feedUrl) return { updateAvailable: false, reason: "update_feed_not_configured" };
    if (!publicKey) return { updateAvailable: false, reason: "update_public_key_not_configured" };
    const response = await fetch(ensureSafeUrl(feedUrl), { cache: "no-store" });
    if (!response.ok) throw new Error(`更新清单请求失败: HTTP ${response.status}`);
    const signedManifest = await response.json();
    const manifest = verifyUpdateManifest(signedManifest, publicKey);
    if (!manifest.version || !manifest.installer || !manifest.installer.url || !manifest.installer.sha256) {
      throw new Error("更新清单缺少版本或安装包信息");
    }
    if (compareVersions(manifest.version, this.app.getVersion()) <= 0) {
      return { updateAvailable: false, version: manifest.version };
    }
    this.currentManifest = manifest;
    const payload = {
      updateAvailable: true,
      version: manifest.version,
      notes: manifest.notes || "",
      size: manifest.installer.size || 0
    };
    this.emit("update-available", payload);
    return payload;
  }

  async downloadAndInstall() {
    if (!this.currentManifest) {
      const checked = await this.check();
      if (!checked.updateAvailable) return { success: false, error: checked.reason || "当前已是最新版本" };
    }
    const manifest = this.currentManifest;
    const installerUrl = ensureSafeUrl(manifest.installer.url);
    const updateDir = path.join(this.dataDir, "updates");
    fs.mkdirSync(updateDir, { recursive: true });
    const fileName = path.basename(new URL(installerUrl).pathname) || `万山Setup_${manifest.version}.exe`;
    const target = path.join(updateDir, fileName);
    this.abortController = new AbortController();
    const response = await fetch(installerUrl, { signal: this.abortController.signal });
    if (!response.ok || !response.body) throw new Error(`安装包下载失败: HTTP ${response.status}`);
    const total = Number(response.headers.get("content-length") || manifest.installer.size || 0);
    const file = fs.createWriteStream(target);
    let downloaded = 0;
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      file.write(Buffer.from(value));
      downloaded += value.byteLength;
      this.emit("update-progress", { downloaded, total, percent: total ? Math.round((downloaded / total) * 100) : 0 });
    }
    await new Promise((resolve, reject) => {
      file.end((error) => (error ? reject(error) : resolve()));
    });
    const actualHash = sha256(target);
    if (actualHash !== String(manifest.installer.sha256).toLowerCase()) {
      fs.rmSync(target, { force: true });
      throw new Error("安装包 SHA-256 校验失败，已删除下载文件");
    }
    this.emit("update-downloaded", { path: target, version: manifest.version });
    const args = Array.isArray(manifest.installer.args) ? manifest.installer.args.map(String) : ["/SILENT", "/NORESTART"];
    if (args.length) {
      require("node:child_process").spawn(target, args, { detached: true, stdio: "ignore", windowsHide: true }).unref();
    } else {
      await shell.openPath(target);
    }
    setTimeout(() => this.app.quit(), 500);
    return { success: true, path: target };
  }

  cancel() {
    if (this.abortController) this.abortController.abort();
    this.abortController = null;
    return true;
  }
}

module.exports = { UpdateClient, compareVersions, stableJson };
