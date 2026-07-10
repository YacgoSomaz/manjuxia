const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const base = "http://127.0.0.1:18472";
const ids = Array.from({ length: 15 }, (_, i) => i + 1);
const submitIds = [14];
const reportPath = path.resolve(__dirname, "..", "..", "test-artifacts", "all-first-3-qianshan-video.json");
function key() { return fs.readFileSync(path.join(process.env.APPDATA, "小洋梦剧场", "data", "backend.session")); }
function headers(secret, p, body = "") {
  const l = "anonymous", n = crypto.randomBytes(16).toString("hex"), t = String(Math.floor(Date.now() / 1000));
  const h = crypto.createHash("sha256").update(Buffer.from(body)).digest("hex");
  const token = crypto.createHmac("sha256", secret).update(`${l}|${p.split("?", 1)[0]}|${t}|${n}|${h}`).digest("hex");
  return { "X-Session-License": l, "X-Session-Nonce": n, "X-Session-Timestamp": t, "X-Session-Token": token, Accept: "application/json", "Content-Type": "application/json" };
}
async function call(ctx, secret, method, p, payload) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const r = await ctx.fetch(`${base}${p}`, { method, headers: headers(secret, p, body), data: body || undefined, timeout: 900000 });
  const text = await r.text(); let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 1000) }; }
  if (!r.ok()) throw new Error(`${method} ${p} HTTP ${r.status()}: ${JSON.stringify(data).slice(0, 1000)}`);
  return data;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  const ctx = await request.newContext(); const secret = key();
  const report = { generated_at: new Date().toISOString(), novel_id: 4, config_id: 5903, storyboard_ids: ids, submissions: [], polls: [], status: "running" };
  try {
    const storyboards = [];
    for (const id of submitIds) storyboards.push(await call(ctx, secret, "GET", `/api/storyboards/${id}`));
    for (const sb of storyboards) {
      const prompt = sb.id === 14
        ? (sb.prompt || sb.description || "").replace(/本小节总时长\s*[:：]\s*15\s*秒/g, "本小节总时长:5 秒")
        : (sb.prompt || sb.description || "");
      const result = await call(ctx, secret, "POST", "/api/video/ark/submit", { storyboard_id: sb.id, prompt, config_id: 5903, params: { duration: 5 }, use_chain_frame: false });
      report.submissions.push({ id: sb.id, result });
      console.log(`[qianshan-ark-submit] ${sb.id} ${result.success}`);
      if (!result.success) console.log(`[qianshan-ark-submit] skipped ${sb.id}: ${result.message || "unknown"}`);
    }
    for (let i = 0; i < 540; i += 1) {
      const poll = await call(ctx, secret, "POST", "/api/video/poll-status", { storyboard_ids: ids, force: true });
      report.polls.push(poll); const rows = poll.results || [];
      console.log(`[qianshan-video] ${JSON.stringify(rows.reduce((a, x) => { a[x.video_status] = (a[x.video_status] || 0) + 1; return a; }, {}))}`);
      if (rows.length && rows.every((x) => !["pending", "queued", "generating"].includes(x.video_status))) break;
      await sleep(10000);
    }
    const final = report.polls.at(-1)?.results || [];
    report.final = final.map((x) => ({ id: x.id, video_status: x.video_status, video_url: x.video_url, fail_reason: x.fail_reason }));
    report.status = report.final.length && report.final.every((x) => x.video_status === "done") ? "completed" : "finished-with-failures";
  } catch (error) {
    report.status = "failed"; report.error = { name: error.name, message: error.message, stack: error.stack }; throw error;
  } finally {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8"); await ctx.dispose();
    console.log(JSON.stringify({ report: reportPath, status: report.status, final: report.final }, null, 2));
  }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
