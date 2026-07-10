const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const base = "http://127.0.0.1:8000";
const reportPath = path.resolve(__dirname, "..", "..", "test-artifacts", "all-first-3-video-ark.json");

function signedHeaders(secret, requestPath, body = "") {
  const license = "anonymous";
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = crypto.createHash("sha256").update(Buffer.from(body)).digest("hex");
  const token = crypto.createHmac("sha256", secret)
    .update(`${license}|${requestPath.split("?", 1)[0]}|${timestamp}|${nonce}|${bodyHash}`)
    .digest("hex");
  return {
    "X-Session-License": license,
    "X-Session-Nonce": nonce,
    "X-Session-Timestamp": timestamp,
    "X-Session-Token": token,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function call(ctx, secret, method, requestPath, payload) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const res = await ctx.fetch(`${base}${requestPath}`, {
    method,
    headers: signedHeaders(secret, requestPath, body),
    data: body || undefined,
    timeout: 900000,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 1000) }; }
  if (!res.ok()) throw new Error(`${method} ${requestPath} HTTP ${res.status()}: ${JSON.stringify(data).slice(0, 1200)}`);
  return data;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const secret = fs.readFileSync(path.join(process.env.APPDATA, "万山", "data", "backend.session"));
  const ctx = await request.newContext();
  const storyboardIds = [3, 4, 5];
  const report = { generated_at: new Date().toISOString(), config_id: 4, storyboard_ids: storyboardIds, submissions: [], polls: [], status: "running" };
  try {
    const storyboards = [];
    for (const id of storyboardIds) storyboards.push(await call(ctx, secret, "GET", `/api/storyboards/${id}`));
    for (const storyboard of storyboards) {
      const started = Date.now();
      const result = await call(ctx, secret, "POST", "/api/video/ark/submit", {
        storyboard_id: storyboard.id,
        prompt: storyboard.prompt || storyboard.description || "",
        config_id: 4,
        params: {},
        use_chain_frame: false,
      });
      report.submissions.push({ id: storyboard.id, elapsed_ms: Date.now() - started, result });
      console.log(`[ark-submit] storyboard=${storyboard.id} success=${result.success}`);
      if (!result.success) throw new Error(`Ark submit failed for storyboard ${storyboard.id}: ${result.message || "unknown"}`);
    }

    for (let i = 0; i < 180; i += 1) {
      const result = await call(ctx, secret, "POST", "/api/video/poll-status", {
        storyboard_ids: storyboardIds,
        force: true,
      });
      report.polls.push(result);
      const rows = result.results || [];
      const summary = rows.reduce((acc, row) => {
        const state = row.video_status || "unknown";
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      }, {});
      console.log(`[ark-poll] ${JSON.stringify(summary)}`);
      if (rows.length && rows.every((row) => !["pending", "queued", "generating"].includes(row.video_status))) break;
      await sleep(10000);
    }

    const final = report.polls.at(-1)?.results || [];
    report.final = final.map((row) => ({ id: row.id, video_status: row.video_status, video_url: row.video_url, fail_reason: row.fail_reason }));
    report.status = report.final.length && report.final.every((row) => row.video_status === "done") ? "completed" : "finished-with-failures";
  } catch (error) {
    report.status = "failed";
    report.error = { name: error.name, message: error.message, stack: error.stack };
    throw error;
  } finally {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    await ctx.dispose();
    console.log(JSON.stringify({ report: reportPath, status: report.status, final: report.final }, null, 2));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
