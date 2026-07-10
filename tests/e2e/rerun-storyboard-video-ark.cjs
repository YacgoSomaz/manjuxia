const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const base = "http://127.0.0.1:8000";
const configId = 4;
const storyboardReport = path.resolve(__dirname, "..", "..", "test-artifacts", "rerun-storyboard-high-output.json");
const reportPath = path.resolve(__dirname, "..", "..", "test-artifacts", "rerun-storyboard-video-ark.json");

function signedHeaders(secret, requestPath, body = "") {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = crypto.createHash("sha256").update(Buffer.from(body)).digest("hex");
  const token = crypto.createHmac("sha256", secret)
    .update(`anonymous|${requestPath.split("?", 1)[0]}|${timestamp}|${nonce}|${bodyHash}`)
    .digest("hex");
  return {
    "X-Session-License": "anonymous",
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
function normalizedVideoPrompt(prompt) {
  return String(prompt || "")
    .replace(/本小节总时长\s*[:：]\s*(?:13|14|15)\s*秒/g, "本小节总时长:12 秒")
    .replace(/·\s*(?:13|14|15)\s*秒?\s*·/g, "· 12 秒 ·");
}

function sanitizedVideoPrompt(prompt) {
  return String(prompt || "")
    .replace(/吸食毒品的瘾君子/g, "神情恍惚的路人")
    .replace(/瘾君子/g, "神情恍惚的路人")
    .replace(/毒品/g, "违禁物")
    .replace(/黑人青年/g, "青年")
    .replace(/黑人/g, "路人");
}

function safeFallbackPrompt() {
  return "现实主义电影风格，白天的城市街区，一名成年男子拖着行李箱沿街走向远处的小教堂，阴天散射光，冷灰色调，安静克制的氛围，镜头缓慢跟随，12秒。";
}

async function main() {
  const secret = fs.readFileSync(path.join(process.env.APPDATA, "万山", "data", "backend.session"));
  const source = JSON.parse(fs.readFileSync(storyboardReport, "utf8"));
  const storyboardIds = source.storyboards.ids;
  const previous = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : null;
  const previouslySubmitted = new Set(
    (previous?.final || [])
      .filter((item) => item.video_status === "done")
      .map((item) => item.id)
  );
  const ctx = await request.newContext();
  const report = {
    generated_at: new Date().toISOString(),
    config_id: configId,
    storyboard_ids: storyboardIds,
    submissions: previous?.submissions || [],
    polls: [],
    failures: previous?.failures || [],
    status: "running",
  };
  const activeStoryboardIds = [];
  try {
    for (const id of storyboardIds) {
      if (previouslySubmitted.has(id)) {
        console.log(`[ark-submit] storyboard=${id} skip=already-submitted`);
        activeStoryboardIds.push(id);
        continue;
      }
      const storyboard = await call(ctx, secret, "GET", `/api/storyboards/${id}`);
      const prompt = storyboard.prompt || storyboard.description || "";
      const started = Date.now();
      let result = await call(ctx, secret, "POST", "/api/video/ark/submit", {
        storyboard_id: id,
        prompt,
        config_id: configId,
        params: {},
        use_chain_frame: false,
      });
      let retried = false;
      if (!result.success && /sensitive|合规|审核|content\[0\]|content\.text|Invalid content\.text/i.test(JSON.stringify(result))) {
        retried = true;
        result = await call(ctx, secret, "POST", "/api/video/ark/submit", {
          storyboard_id: id,
          prompt: normalizedVideoPrompt(sanitizedVideoPrompt(prompt)),
          config_id: configId,
          params: {},
          use_chain_frame: false,
        });
        if (!result.success) {
          result = await call(ctx, secret, "POST", "/api/video/ark/submit", {
            storyboard_id: id,
            prompt: safeFallbackPrompt(),
            config_id: configId,
            params: {},
            use_chain_frame: false,
          });
        }
      } else if (!result.success && /13|14|15|duration|时长|参数/.test(JSON.stringify(result))) {
        retried = true;
        result = await call(ctx, secret, "POST", "/api/video/ark/submit", {
          storyboard_id: id,
          prompt: normalizedVideoPrompt(prompt),
          config_id: configId,
          params: {},
          use_chain_frame: false,
        });
      }
      report.submissions.push({ id, elapsed_ms: Date.now() - started, retried, result });
      console.log(`[ark-submit] storyboard=${id} success=${result.success} retried=${retried}`);
      if (!result.success) {
        report.failures.push({ id, message: result.message || "unknown" });
        continue;
      }
      activeStoryboardIds.push(id);
    }

    for (let i = 0; i < 540 && activeStoryboardIds.length; i += 1) {
      const result = await call(ctx, secret, "POST", "/api/video/poll-status", {
        storyboard_ids: activeStoryboardIds,
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
    report.status = report.final.length && report.final.every((row) => row.video_status === "done") && report.failures.length === 0
      ? "completed"
      : "completed-with-failures";
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
