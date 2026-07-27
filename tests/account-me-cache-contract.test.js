const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const remoteRoot = path.join(__dirname, "..", "test-artifacts", "remote-recharge-api");
const serverSource = fs.readFileSync(path.join(remoteRoot, "server.js"), "utf8");

test("account snapshot response uses no-store headers and never res.json", () => {
  const helper = fs.readFileSync(path.join(remoteRoot, "account-cache-policy.js"), "utf8");
  assert.match(helper, /private, no-store, max-age=0/);
  assert.match(helper, /Pragma: \"no-cache\"/);
  assert.match(helper, /Vary: \"Cookie, X-Product-Code, X-Device-Hash\"/);
  assert.match(helper, /\.end\(JSON\.stringify\(payload\)\)/);
  const route = serverSource.match(/app\.get\('\/api\/auth\/me'[\s\S]*?\n\}\);/);
  assert.ok(route, "account me route must remain present");
  assert.doesNotMatch(route[0], /res\.json\(/);
  assert.match(route[0], /sendAccountSnapshotJson/);
});

test("account snapshot diagnostics are redacted to product, entitlement, times, and result", () => {
  assert.match(serverSource, /function logAccountMeDiagnostic\(/);
  assert.match(serverSource, /active_entitlement/);
  assert.match(serverSource, /issued_at/);
  assert.match(serverSource, /signed_until/);
  assert.match(serverSource, /result_code/);
  const diagnosticBlock = serverSource.slice(serverSource.indexOf("function logAccountMeDiagnostic"), serverSource.indexOf("function nowIso"));
  assert.doesNotMatch(diagnosticBlock, /phone|cookie|signature|private[_-]?key/i);
});

test("snapshot helper produces the exact cache contract without an ETag", () => {
  const { sendAccountSnapshotJson } = require(path.join(remoteRoot, "account-cache-policy.js"));
  const calls = [];
  const res = {
    status(code) { calls.push(["status", code]); return this; },
    set(headers) { calls.push(["set", headers]); return this; },
    type(value) { calls.push(["type", value]); return this; },
    end(body) { calls.push(["end", body]); return this; }
  };
  sendAccountSnapshotJson(res, 200, { ok: true, user: null });
  const headers = calls.find(([name]) => name === "set")[1];
  assert.deepEqual(headers, {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    Vary: "Cookie, X-Product-Code, X-Device-Hash"
  });
  assert.equal(calls.find(([name]) => name === "end")[1], JSON.stringify({ ok: true, user: null }));
});
