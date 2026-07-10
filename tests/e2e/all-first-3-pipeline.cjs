const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const inputPath = "C:/Users/q2414/Documents/xwechat_files/wxid_quj6od9onuqc22_ab2a/msg/file/2026-07/all.txt";
const reportPath = path.join(projectDir, "test-artifacts", "all-first-3-pipeline.json");
const wanshanBase = "http://127.0.0.1:8000";
const qianshanBase = "http://127.0.0.1:18472";
const runId = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

function secretFor(appName) {
  const file = path.join(process.env.APPDATA, appName, "data", "backend.session");
  const secret = fs.readFileSync(file);
  assert.equal(secret.length, 32, `${appName} session secret length invalid`);
  return secret;
}

function signedHeaders(secret, requestPath, body = "") {
  const canonicalPath = requestPath.split("?", 1)[0];
  const license = "anonymous";
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = crypto.createHash("sha256").update(Buffer.from(body)).digest("hex");
  const message = `${license}|${canonicalPath}|${timestamp}|${nonce}|${bodyHash}`;
  const token = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return {
    "X-Session-License": license,
    "X-Session-Nonce": nonce,
    "X-Session-Timestamp": timestamp,
    "X-Session-Token": token,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function call(ctx, base, secret, method, requestPath, payload, options = {}) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const response = await ctx.fetch(`${base}${requestPath}`, {
    method,
    headers: signedHeaders(secret, requestPath, body),
    data: body || undefined,
    timeout: options.timeout || 900000,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 2000) };
  }
  if (!response.ok()) {
    throw new Error(`${method} ${requestPath} HTTP ${response.status()}: ${JSON.stringify(data).slice(0, 1500)}`);
  }
  return data;
}

function chapterSlice(raw) {
  const matches = [...raw.matchAll(/^第\s*([0-9]+)章[^\r\n]*/gm)];
  const first = matches.findIndex((m) => m[1] === "1");
  assert.equal(first, 0, "all.txt does not start with 第1章 at the first chapter boundary");
  assert.equal(matches.length >= 4, true, "all.txt has fewer than 4 chapter boundaries");
  const start = matches[0].index;
  const end = matches[3].index;
  const content = raw.slice(start, end).trim();
  return {
    content,
    headers: matches.slice(0, 4).map((m) => m[0]),
    chars: content.length,
  };
}

function asList(value, keys = ["items", "data", "results", "storyboards", "scripts"]) {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function findTemplate(ctx, secret, category, name) {
  const list = await call(ctx, wanshanBase, secret, "GET", `/api/templates/?category=${encodeURIComponent(category)}`);
  return asList(list).find((item) => item.name === name) || null;
}

async function ensureTemplate(ctx, wanshanSecret, qianshanSecret, category, name, qianshanId) {
  const existing = await findTemplate(ctx, wanshanSecret, category, name);
  if (existing) return { id: existing.id, source: "wanshan-existing", name };

  const original = await call(ctx, qianshanBase, qianshanSecret, "GET", `/api/templates/${qianshanId}`);
  assert.equal(original.category, category, `Qianshan template ${qianshanId} category mismatch`);
  const created = await call(ctx, wanshanBase, wanshanSecret, "POST", "/api/templates/", {
    name: original.name,
    category: original.category,
    content: original.content || "",
    variables: original.variables ? JSON.parse(original.variables) : [],
    description: original.description || null,
  });
  return { id: created.id, source: "copied-from-local-qianshan", name: created.name };
}

async function waitPipeline(ctx, secret, pipelineId, report) {
  const started = Date.now();
  let lastStatus = "";
  for (let i = 0; i < 360; i += 1) {
    const status = await call(ctx, wanshanBase, secret, "GET", `/api/pipeline/${pipelineId}/status`);
    report.pipeline_last_status = status;
    if (status.status !== lastStatus) {
      lastStatus = status.status;
      console.log(`[pipeline] ${status.status} ${JSON.stringify(status.steps || [])}`);
    }
    if (["completed", "failed", "cancelled"].includes(status.status)) return status;
    if (Date.now() - started > 45 * 60 * 1000) throw new Error("pipeline polling exceeded 45 minutes");
    await sleep(5000);
  }
  throw new Error("pipeline polling exceeded 360 checks");
}

async function pollVideos(ctx, secret, ids, report) {
  const started = Date.now();
  let lastSummary = "";
  for (let i = 0; i < 540; i += 1) {
    const result = await call(ctx, wanshanBase, secret, "POST", "/api/video/poll-status", {
      storyboard_ids: ids,
      force: true,
    }, { timeout: 900000 });
    report.video_last_poll = result;
    const rows = asList(result, ["results"]);
    const summary = rows.reduce((acc, row) => {
      const state = row.video_status || "unknown";
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    const key = JSON.stringify(summary);
    if (key !== lastSummary) {
      lastSummary = key;
      console.log(`[video] ${key}`);
    }
    const active = rows.filter((row) => ["pending", "queued", "generating"].includes(row.video_status));
    if (active.length === 0) return rows;
    if (Date.now() - started > 90 * 60 * 1000) throw new Error("video polling exceeded 90 minutes");
    await sleep(10000);
  }
  throw new Error("video polling exceeded 540 checks");
}

async function main() {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const raw = fs.readFileSync(inputPath, "utf8");
  const first3 = chapterSlice(raw);
  const report = {
    generated_at: new Date().toISOString(),
    input: { path: inputPath, headers: first3.headers, chars: first3.chars },
    stages: {},
    status: "running",
  };
  const ctx = await request.newContext();
  const wanshanSecret = secretFor("万山");
  const qianshanSecret = secretFor("小洋梦剧场");
  try {
    const extractionTemplates = {
      character: await ensureTemplate(ctx, wanshanSecret, qianshanSecret, "character_extraction", "角色提取模板【千人千面版】【3D真人】", 3),
      scene: await ensureTemplate(ctx, wanshanSecret, qianshanSecret, "scene_extraction", "场景提取模板【细节版】", 15),
      prop: await ensureTemplate(ctx, wanshanSecret, qianshanSecret, "prop_extraction", "道具提取模板【细节版】", 13),
    };
    const storyTemplate = await findTemplate(ctx, wanshanSecret, "storyboard_generation", "罗杰狄金斯式冷峻现实主义-最新规则版");
    assert.ok(storyTemplate, "Wanshan storyboard template is missing");

    const createdAt = Date.now();
    const novel = await call(ctx, wanshanBase, wanshanSecret, "POST", "/api/novels/", {
      name: `前三章视频流程测试-${runId}`,
      raw_content: first3.content,
      mode: "import",
    });
    report.stages.import = { elapsed_ms: Date.now() - createdAt, novel_id: novel.id, response: novel };
    assert.ok(novel.id, "novel import did not return an id");

    const parseStarted = Date.now();
    const parsed = await call(ctx, wanshanBase, wanshanSecret, "POST", `/api/novels/${novel.id}/parse-chapters`);
    const chapters = await call(ctx, wanshanBase, wanshanSecret, "GET", `/api/novels/${novel.id}/chapters`);
    report.stages.parse = { elapsed_ms: Date.now() - parseStarted, response: parsed, chapters: chapters.map((c) => ({ id: c.id, title: c.title, chars: String(c.content || "").length })) };
    assert.equal(chapters.length, 3, `expected 3 chapters, got ${chapters.length}`);
    const chapterIds = chapters.map((c) => c.id);

    const pipelineStarted = Date.now();
    const pipeline = await call(ctx, wanshanBase, wanshanSecret, "POST", "/api/pipeline/start", {
      novel_id: novel.id,
      script_conversion: { template_id: 15, llm_config_id: 1, enabled: true },
      character_extraction: { template_id: extractionTemplates.character.id, llm_config_id: 1, enabled: true },
      scene_extraction: { template_id: extractionTemplates.scene.id, llm_config_id: 1, enabled: true },
      prop_extraction: { template_id: extractionTemplates.prop.id, llm_config_id: 1, enabled: true },
      storyboard_generation: { template_id: storyTemplate.id, llm_config_id: 1, enabled: true },
    });
    assert.ok(pipeline.pipeline_id, "pipeline did not return an id");
    report.stages.pipeline_start = { elapsed_ms: Date.now() - pipelineStarted, response: pipeline, templates: { extractionTemplates, storyTemplate } };
    const pipelineStatus = await waitPipeline(ctx, wanshanSecret, pipeline.pipeline_id, report);
    report.stages.pipeline = { elapsed_ms: Date.now() - pipelineStarted, status: pipelineStatus };

    const scripts = await call(ctx, wanshanBase, wanshanSecret, "GET", `/api/scripts/novel/${novel.id}`);
    const elements = await call(ctx, wanshanBase, wanshanSecret, "GET", `/api/extraction/novel/${novel.id}`);
    const storyboards = await call(ctx, wanshanBase, wanshanSecret, "GET", `/api/storyboards/novel/${novel.id}`);
    const scriptRows = asList(scripts, ["scripts"]);
    const elementRows = asList(elements);
    const storyboardRows = asList(storyboards, ["storyboards"]);
    report.stages.outputs = {
      chapter_ids: chapterIds,
      scripts: { count: scriptRows.length, ids: scriptRows.map((x) => x.id) },
      elements: { count: elementRows.length, by_type: elementRows.reduce((a, x) => { a[x.element_type] = (a[x.element_type] || 0) + 1; return a; }, {}) },
      storyboards: { count: storyboardRows.length, ids: storyboardRows.map((x) => x.id) },
    };
    assert.equal(pipelineStatus.status, "completed", `pipeline failed: ${JSON.stringify(pipelineStatus)}`);
    assert.ok(storyboardRows.length > 0, "pipeline produced no storyboards");

    const storyboardIds = storyboardRows.map((x) => x.id);
    const videoStarted = Date.now();
    const submitted = await call(ctx, wanshanBase, wanshanSecret, "POST", "/api/video/batch-generate", {
      storyboard_ids: storyboardIds,
      video_config_id: 4,
      serial_chain_mode: false,
    });
    report.stages.video_submit = { elapsed_ms: Date.now() - videoStarted, response: submitted, storyboard_count: storyboardIds.length };
    assert.equal(submitted.success, true, `video submission failed: ${JSON.stringify(submitted)}`);
    const videoRows = await pollVideos(ctx, wanshanSecret, storyboardIds, report);
    report.stages.video = {
      elapsed_ms: Date.now() - videoStarted,
      summary: videoRows.reduce((a, x) => { const s = x.video_status || "unknown"; a[s] = (a[s] || 0) + 1; return a; }, {}),
      done: videoRows.filter((x) => x.video_status === "done").map((x) => ({ id: x.id, video_url: x.video_url })),
      failed: videoRows.filter((x) => !["done"].includes(x.video_status)).map((x) => ({ id: x.id, status: x.video_status, reason: x.fail_reason })),
    };
    report.status = "completed";
  } catch (error) {
    report.status = "failed";
    report.error = { name: error.name, message: error.message, stack: error.stack };
    throw error;
  } finally {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    await ctx.dispose();
    console.log(JSON.stringify({ report: reportPath, status: report.status, novel_id: report.stages.import?.novel_id, pipeline: report.stages.pipeline?.status?.status, video: report.stages.video?.summary }, null, 2));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
