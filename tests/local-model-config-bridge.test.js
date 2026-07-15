const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { normalizeLlmConfigRequest } = require("../electron/local-api-bridge");

test("only exposes model-configuration routes through the signed local API bridge", () => {
  assert.equal(
    normalizeLlmConfigRequest("/api/llm-configs/?config_type=llm&force=true", "GET"),
    "/api/llm-configs/?config_type=llm&force=true"
  );
  assert.equal(normalizeLlmConfigRequest("/api/llm-configs/42", "PUT"), "/api/llm-configs/42");
  assert.equal(normalizeLlmConfigRequest("/api/llm-configs/42/test", "POST"), "/api/llm-configs/42/test");
  assert.throws(() => normalizeLlmConfigRequest("https://example.com/api/llm-configs/", "GET"), /本地模型配置/);
  assert.throws(() => normalizeLlmConfigRequest("/api/novels/", "GET"), /本地模型配置/);
  assert.throws(() => normalizeLlmConfigRequest("/api/llm-configs/42/test", "GET"), /不支持/);
});

test("model configuration UI uses the signed Electron bridge before browser fetch", () => {
  const preload = fs.readFileSync(path.join(__dirname, "..", "electron", "preload.js"), "utf8");
  const main = fs.readFileSync(path.join(__dirname, "..", "electron", "main.js"), "utf8");
  const ui = fs.readFileSync(path.join(__dirname, "..", "frontend", "wanshan-local-config.js"), "utf8");
  assert.match(preload, /local-api:llm-configs/);
  assert.match(main, /ipcMain\.handle\("local-api:llm-configs"/);
  assert.match(main, /normalizeLlmConfigRequest/);
  assert.match(main, /createBackendSignatureHeaders\(target\.pathname, serializedBody\)/);
  assert.match(main, /ensureBackendSecureReady/);
  assert.match(main, /本地后端安全通道启动超时/);
  assert.match(main, /freshPort && freshSecret/);
  assert.match(ui, /localModelConfig/);
  assert.match(ui, /bridge\.request/);
});
