const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("frontend loads the multipart bridge before the signed app bundle", () => {
  const html = fs.readFileSync(path.join(root, "frontend", "index.html"), "utf8");
  const bridge = html.indexOf('src="./multipart-fetch-bridge.js"');
  const app = html.indexOf('type="module" crossorigin src="./assets/index-');
  const finalizer = html.indexOf('src="./multipart-fetch-finalizer.js"');
  assert.notEqual(bridge, -1);
  assert.notEqual(app, -1);
  assert.notEqual(finalizer, -1);
  assert.ok(bridge < app);
  assert.ok(app < finalizer);
});

test("multipart bridge converts FormData into bytes and preserves generated headers", () => {
  const source = fs.readFileSync(path.join(root, "frontend", "multipart-fetch-bridge.js"), "utf8");
  assert.match(source, /body instanceof FormData/);
  assert.match(source, /new Request\(input, init\)/);
  assert.match(source, /new Uint8Array\(await request\.arrayBuffer\(\)\)/);
  assert.match(source, /new Headers\(request\.headers\)/);
});

test("signed multipart finalizer wraps fetch after page readiness", () => {
  const source = fs.readFileSync(path.join(root, "frontend", "multipart-fetch-finalizer.js"), "utf8");
  assert.match(source, /window\.fetch = async function signedMultipartFetch/);
  assert.match(source, /window\.addEventListener\("load", install/);
  assert.match(source, /body: bytes/);
});
