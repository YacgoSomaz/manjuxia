const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const base = "http://127.0.0.1:18472";
const inputPath = "C:/Users/q2414/Documents/xwechat_files/wxid_quj6od9onuqc22_ab2a/msg/file/2026-07/all.txt";
const reportPath = path.resolve(__dirname, "..", "..", "test-artifacts", "all-first-3-qianshan.json");

function secret() { return fs.readFileSync(path.join(process.env.APPDATA, "小洋梦剧场", "data", "backend.session")); }
function headers(secretKey, requestPath, body = "") {
  const license = "anonymous";
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const hash = crypto.createHash("sha256").update(Buffer.from(body)).digest("hex");
  const token = crypto.createHmac("sha256", secretKey).update(`${license}|${requestPath.split("?", 1)[0]}|${timestamp}|${nonce}|${hash}`).digest("hex");
  return { "X-Session-License": license, "X-Session-Nonce": nonce, "X-Session-Timestamp": timestamp, "X-Session-Token": token, Accept: "application/json", "Content-Type": "application/json" };
}
async function call(ctx, key, method, requestPath, payload, retries = 3) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  let last;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await ctx.fetch(`${base}${requestPath}`, { method, headers: headers(key, requestPath, body), data: body || undefined, timeout: 900000 });
      const text = await res.text();
      let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 1000) }; }
      if (!res.ok()) throw new Error(`${method} ${requestPath} HTTP ${res.status()}: ${JSON.stringify(data).slice(0, 1500)}`);
      return data;
    } catch (error) {
      last = error;
      if (i + 1 < retries) await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw last;
}
function firstThree(raw) {
  const ms = [...raw.matchAll(/^第\s*([0-9]+)章[^\r\n]*/gm)];
  assert.equal(ms[0]?.[1], "1"); assert.ok(ms[3]);
  return { content: raw.slice(ms[0].index, ms[3].index).trim(), headers: ms.slice(0, 4).map((m) => m[0]) };
}
function list(value, key) { return Array.isArray(value) ? value : (Array.isArray(value?.[key]) ? value[key] : []); }
async function waitPipeline(ctx, key, id, report) {
  for (let i = 0; i < 540; i += 1) {
    const status = await call(ctx, key, "GET", `/api/pipeline/${id}/status`);
    report.pipeline_last_status = status;
    const marker = status.steps?.map((x) => `${x.name}:${x.status}`).join("|");
    if (marker !== report._last_marker) { report._last_marker = marker; console.log(`[qianshan-pipeline] ${status.status} ${marker}`); }
    if (["completed", "failed", "cancelled"].includes(status.status)) return status;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("Qianshan pipeline polling timeout");
}
async function main() {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const raw = fs.readFileSync(inputPath, "utf8");
  const input = firstThree(raw);
  const report = { generated_at: new Date().toISOString(), input: { path: inputPath, headers: input.headers, chars: input.content.length }, stages: {}, status: "running" };
  const ctx = await request.newContext();
  const key = secret();
  try {
    const novel = await call(ctx, key, "POST", "/api/novels/", { name: `前三章同条件对比-千山-${Date.now()}`, raw_content: input.content, mode: "import" });
    report.stages.import = { novel_id: novel.id, response: novel };
    const parsed = await call(ctx, key, "POST", `/api/novels/${novel.id}/parse-chapters`);
    const chapters = await call(ctx, key, "GET", `/api/novels/${novel.id}/chapters`);
    report.stages.parse = { response: parsed, chapters: chapters.map((x) => ({ id: x.id, title: x.title, chars: String(x.content || "").length })) };
    assert.equal(chapters.length, 3);

    const pipeline = await call(ctx, key, "POST", "/api/pipeline/start", {
      novel_id: novel.id,
      script_conversion: { template_id: 16, llm_config_id: 5904, enabled: true },
      character_extraction: { template_id: 3, llm_config_id: 5904, enabled: true },
      scene_extraction: { template_id: 15, llm_config_id: 5904, enabled: true },
      prop_extraction: { template_id: 13, llm_config_id: 5904, enabled: true },
      storyboard_generation: { template_id: 29, llm_config_id: 5904, enabled: true },
    });
    report.stages.pipeline_start = pipeline;
    const status = await waitPipeline(ctx, key, pipeline.pipeline_id, report);
    delete report._last_marker;
    report.stages.pipeline = status;
    const scripts = await call(ctx, key, "GET", `/api/scripts/novel/${novel.id}`);
    const elements = await call(ctx, key, "GET", `/api/extraction/novel/${novel.id}`);
    const storyboardList = await call(ctx, key, "GET", `/api/storyboards/novel/${novel.id}`);
    const sbRows = list(storyboardList, "storyboards");
    report.stages.outputs = {
      scripts: list(scripts, "scripts").map((x) => x.id),
      elements: { count: list(elements).length, by_type: list(elements).reduce((a, x) => { a[x.element_type] = (a[x.element_type] || 0) + 1; return a; }, {}) },
      storyboards: sbRows.map((x) => x.id),
    };
    if (status.status !== "completed" || !sbRows.length) { report.status = "pipeline-failed"; return; }

    report.stages.video = [];
    for (const sb of sbRows) {
      const result = await call(ctx, key, "POST", "/api/video/ark/submit", { storyboard_id: sb.id, prompt: sb.prompt || sb.description || "", config_id: 5903, params: {}, use_chain_frame: false });
      report.stages.video.push({ id: sb.id, submit: result });
      console.log(`[qianshan-ark-submit] ${sb.id} ${result.success}`);
    }
    for (let i = 0; i < 540; i += 1) {
      const poll = await call(ctx, key, "POST", "/api/video/poll-status", { storyboard_ids: sbRows.map((x) => x.id), force: true });
      report.video_last_poll = poll;
      const rows = poll.results || [];
      console.log(`[qianshan-video] ${JSON.stringify(rows.reduce((a, x) => { a[x.video_status] = (a[x.video_status] || 0) + 1; return a; }, {}))}`);
      if (rows.length && rows.every((x) => !["pending", "queued", "generating"].includes(x.video_status))) break;
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    report.status = "completed";
  } catch (error) {
    report.status = "failed";
    report.error = { name: error.name, message: error.message, stack: error.stack };
    throw error;
  } finally {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    await ctx.dispose();
    console.log(JSON.stringify({ report: reportPath, status: report.status, novel_id: report.stages.import?.novel_id, pipeline: report.stages.pipeline?.status, outputs: report.stages.outputs }, null, 2));
  }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
