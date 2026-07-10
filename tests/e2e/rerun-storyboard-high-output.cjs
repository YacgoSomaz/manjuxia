const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const base = "http://127.0.0.1:8000";
const novelId = 8;
const configId = 1;
const templateId = 13;
const reportPath = path.resolve(__dirname, "..", "..", "test-artifacts", "rerun-storyboard-high-output.json");

function signedHeaders(secret, requestPath, body = "") {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = crypto.createHash("sha256").update(Buffer.from(body)).digest("hex");
  const message = `anonymous|${requestPath.split("?", 1)[0]}|${timestamp}|${nonce}|${bodyHash}`;
  const token = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return {
    "X-Session-License": "anonymous",
    "X-Session-Nonce": nonce,
    "X-Session-Timestamp": timestamp,
    "X-Session-Token": token,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function call(ctx, secret, method, requestPath, payload, timeout = 900000) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const response = await ctx.fetch(`${base}${requestPath}`, {
    method,
    headers: signedHeaders(secret, requestPath, body),
    data: body || undefined,
    timeout,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 2000) }; }
  if (!response.ok()) throw new Error(`${method} ${requestPath} HTTP ${response.status()}: ${JSON.stringify(data).slice(0, 2000)}`);
  return data;
}

function asList(value, keys = ["items", "data", "storyboards"]) {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
}

async function main() {
  const secret = fs.readFileSync(path.join(process.env.APPDATA, "万山", "data", "backend.session"));
  const ctx = await request.newContext();
  const report = { generated_at: new Date().toISOString(), novel_id: novelId, config_id: configId, template_id: templateId };
  try {
    report.config = await call(ctx, secret, "GET", `/api/llm-configs/${configId}`);
    assert.equal(report.config.model_name, "deepseek-v4-flash");
    report.deleted = await call(ctx, secret, "DELETE", `/api/storyboards/novel/${novelId}/all`);
    report.generated = await call(ctx, secret, "POST", "/api/storyboards/generate", {
      novel_id: novelId,
      template_id: templateId,
      llm_config_id: configId,
    });
    const rows = asList(await call(ctx, secret, "GET", `/api/storyboards/novel/${novelId}`));
    report.storyboards = {
      count: rows.length,
      ids: rows.map((row) => row.id),
      prompt_chars: rows.map((row) => String(row.prompt || row.description || "").length),
      total_prompt_chars: rows.reduce((sum, row) => sum + String(row.prompt || row.description || "").length, 0),
      durations: rows.map((row) => {
        const match = String(row.prompt || row.description || "").match(/本小节总时长\s*[:：]\s*(\d+(?:\.\d+)?)\s*秒/);
        return match ? Number(match[1]) : null;
      }),
    };
    assert.ok(rows.length >= 10, `expected at least 10 storyboard sections, got ${rows.length}`);
    report.status = "completed";
  } catch (error) {
    report.status = "failed";
    report.error = { name: error.name, message: error.message, stack: error.stack };
    throw error;
  } finally {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    await ctx.dispose();
    console.log(JSON.stringify({ report: reportPath, status: report.status, count: report.storyboards?.count, total_prompt_chars: report.storyboards?.total_prompt_chars }, null, 2));
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
