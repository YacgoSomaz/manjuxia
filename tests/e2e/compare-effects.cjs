const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const reportPath = path.join(projectDir, "test-artifacts", "compare-effects.json");
const concept = "现代悬疑短剧：暴雨夜，女记者在废弃车站发现一部能记录未来的手机。她得在凌晨前阻止一场看似意外的火灾，救出被困在旧车站里的弟弟。要求节奏紧凑、每章有明确冲突和结尾悬念。";
const runId = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

function sessionSecret(file) {
  const raw = fs.readFileSync(file);
  assert.equal(raw.length, 32, `${file} session secret length invalid`);
  return raw;
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
    "Content-Type": "application/json",
  };
}

async function call(ctx, base, secret, method, requestPath, payload) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const response = await ctx.fetch(`${base}${requestPath}`, {
    method,
    headers: signedHeaders(secret, requestPath, body),
    data: body || undefined,
    timeout: 900000,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 1000) }; }
  if (!response.ok()) throw new Error(`${method} ${requestPath} HTTP ${response.status()}: ${JSON.stringify(data).slice(0, 1000)}`);
  return data;
}

async function runOne(ctx, name, base, secret, configId) {
  const novel = await call(ctx, base, secret, "POST", "/api/novels/create-outline", {
    novel_name: `替代效果对比-${name}-${runId}`,
    concept,
    llm_config_id: configId,
    template_id: null,
  });
  assert.ok(novel.novel_id, `${name} outline did not return novel_id`);

  await call(ctx, base, secret, "POST", `/api/novels/${novel.novel_id}/generate-chapter`, {
    chapter_index: 1,
    llm_config_id: configId,
    template_id: null,
  });

  let status = null;
  for (let i = 0; i < 180; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    status = await call(ctx, base, secret, "GET", `/api/novels/${novel.novel_id}/generation-status`);
    if (["success", "failed"].includes(status.status)) break;
  }
  assert.equal(status?.status, "success", `${name} chapter generation did not succeed: ${JSON.stringify(status)}`);
  const chapters = await call(ctx, base, secret, "GET", `/api/novels/${novel.novel_id}/chapters`);
  const firstChapter = chapters.find((chapter) => Number(chapter.chapter_number ?? chapter.chapter_index ?? 1) === 1) || chapters[0];
  assert.ok(firstChapter, `${name} did not return chapter 1`);

  return {
    name,
    novel_id: novel.novel_id,
    outline: novel.outline,
    generation_status: status,
    chapter: firstChapter,
    metrics: {
      outline_chars: String(novel.outline || "").length,
      chapter_chars: String(firstChapter.content || firstChapter.chapter_content || "").length,
      chapter_title: firstChapter.title || firstChapter.chapter_title || "",
    },
  };
}

async function main() {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const ctx = await request.newContext({ extraHTTPHeaders: { Accept: "application/json" } });
  try {
    const appData = process.env.APPDATA;
    const wanshan = await runOne(
      ctx,
      "万山-DeepSeek Flash",
      "http://127.0.0.1:8000",
      sessionSecret(path.join(appData, "万山", "data", "backend.session")),
      1,
    );
    const qianshan = await runOne(
      ctx,
      "千山-当前DeepSeek对话",
      "http://127.0.0.1:18472",
      sessionSecret(path.join(appData, "小洋梦剧场", "data", "backend.session")),
      5904,
    );
    const report = {
      generated_at: new Date().toISOString(),
      prompt: concept,
      note: "两边均使用 DeepSeek Flash 配置和同一提示词；图片/视频配置不参与本次文本效果对比。",
      results: { wanshan, qianshan },
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify({
      report: reportPath,
      wanshan: wanshan.metrics,
      qianshan: qianshan.metrics,
    }, null, 2));
  } finally {
    await ctx.dispose();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
