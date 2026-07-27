const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const scriptPath = require("node:path").join(__dirname, "..", "frontend", "update-notice.js");

function loadNoticeScript() {
  const listeners = new Map();
  const nativeCallbacks = { available: [], progress: [], downloaded: [], error: [] };
  const document = {
    readyState: "complete",
    createElement() {
      return {
        style: {},
        className: "",
        classList: { add() {}, remove() {} },
        setAttribute() {},
        appendChild() {},
        addEventListener() {},
        remove() {}
      };
    },
    head: { appendChild() {} },
    body: { appendChild() {} },
    getElementById() { return null; },
    querySelector() { return null; },
    addEventListener() {}
  };
  const window = {
    document,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    addEventListener(type, callback) {
      const current = listeners.get(type) || [];
      current.push(callback);
      listeners.set(type, current);
    },
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) || []) callback(event);
    },
    electronAPI: {
      update: {
        onUpdateAvailable(callback) { nativeCallbacks.available.push(callback); },
        onOptionalUpdateAvailable(callback) { nativeCallbacks.optional = nativeCallbacks.optional || []; nativeCallbacks.optional.push(callback); },
        onUpdateProgress(callback) { nativeCallbacks.progress.push(callback); },
        onUpdateDownloaded(callback) { nativeCallbacks.downloaded.push(callback); },
        onUpdateError(callback) { nativeCallbacks.error.push(callback); },
        startDownload() { return Promise.resolve({ success: true }); },
        check() { return Promise.resolve({ updateAvailable: false, currentVersion: "0.1.30" }); }
      }
    }
  };
  vm.runInNewContext(fs.readFileSync(scriptPath, "utf8"), { window, document, setTimeout, clearTimeout, console });
  return { nativeCallbacks, window };
}

test("普通更新不会交给原有全屏更新弹窗", () => {
  const { nativeCallbacks, window } = loadNoticeScript();
  const optionalPayload = { version: "0.1.27", update_level: "optional", force_update: false };
  let nativeCallbackCalled = false;
  window.electronAPI.update.onUpdateAvailable(() => { nativeCallbackCalled = true; });
  nativeCallbacks.optional.forEach((callback) => callback(optionalPayload));
  assert.equal(nativeCallbackCalled, false);
});

test("强制更新仍然交给原有不可关闭更新弹窗", () => {
  const { nativeCallbacks, window } = loadNoticeScript();
  const mandatoryPayload = { version: "0.1.27", update_level: "force", force_update: true };
  let nativeCallbackCalled = false;
  window.electronAPI.update.onUpdateAvailable(() => { nativeCallbackCalled = true; });
  nativeCallbacks.available.forEach((callback) => callback(mandatoryPayload));
  assert.equal(nativeCallbackCalled, true);
});

test("普通更新事件会在左下角通知层触发", () => {
  const { nativeCallbacks, window } = loadNoticeScript();
  let received = null;
  let count = 0;
  window.addEventListener("manjuxia:optional-update", (event) => { received = event.detail; count += 1; });
  nativeCallbacks.optional[0]({ version: "0.1.27", update_level: "optional", force_update: false });
  assert.equal(received.version, "0.1.27");
  assert.equal(count, 1);
});

test("普通更新明确告知下载并安装，以及安装器接力状态", () => {
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.match(source, /下载并安装/);
  assert.match(source, /正在启动安装程序/);
  assert.doesNotMatch(source, /state = "available";\s*current\.__percent = 100/);
});

test("点击旧版版本号时会改为检查真实签名更新，而不是打开静态公告", () => {
  const source = fs.readFileSync(scriptPath, "utf8");
  assert.match(source, /document\.addEventListener\("click"/);
  assert.match(source, /closest\("\.version-text"\)/);
  assert.match(source, /update\.check\(\)/);
});
