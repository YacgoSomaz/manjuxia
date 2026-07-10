const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const reportPath = path.join(projectDir, "test-artifacts", "compare-image-effects.json");

function secret(file) {
  const raw = fs.readFileSync(file);
  assert.equal(raw.length, 32, `${file} session secret invalid`);
  return raw;
}

function headers(key, requestPath) {
  const license = "anonymous";
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = crypto.createHash("sha256").update(Buffer.alloc(0)).digest("hex");
  const msg = `${license}|${requestPath}|${timestamp}|${nonce}|${bodyHash}`;
  const token = crypto.createHmac("sha256", key).update(msg).digest("hex");
  return {
    "X-Session-License": license,
    "X-Session-Nonce": nonce,
    "X-Session-Timestamp": timestamp,
    "X-Session-Token": token,
  };
}

async function test(ctx, label, base, sessionFile, configId, dataDir) {
  const requestPath = `/api/llm-configs/${configId}/test`;
  const response = await ctx.fetch(`${base}${requestPath}`, {
    method: "POST",
    headers: headers(secret(sessionFile), requestPath),
    timeout: 240000,
  });
  const payload = await response.json();
  assert.equal(response.ok(), true, `${label} HTTP ${response.status()}: ${JSON.stringify(payload)}`);
  assert.equal(payload.success, true, `${label} failed: ${payload.message}`);
  return { label, config_id: configId, data_dir: dataDir, payload };
}

async function main() {
  const appData = process.env.APPDATA;
  const ctx = await request.newContext({ extraHTTPHeaders: { Accept: "application/json" } });
  try {
    const results = {
      wanshan: await test(ctx, "万山-火山方舟生图", "http://127.0.0.1:8000", path.join(appData, "万山", "data", "backend.session"), 3, path.join(appData, "万山", "data")),
      qianshan: await test(ctx, "千山-火山方舟生图", "http://127.0.0.1:18472", path.join(appData, "小洋梦剧场", "data", "backend.session"), 5900, path.join(appData, "小洋梦剧场", "data")),
    };
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      prompt: "一只可爱的橘色小猫,坐在阳光明媚的窗台上,卡通风格",
      results,
    }, null, 2), "utf8");
    console.log(JSON.stringify({ report: reportPath, results }, null, 2));
  } finally {
    await ctx.dispose();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
