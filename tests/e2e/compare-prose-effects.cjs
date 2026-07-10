const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { request } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const reportPath = path.join(projectDir, "test-artifacts", "compare-prose-effects.json");
const runId = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const script = `【第1集：暴雨车站】
场景：凌晨，南方城市暴雨。调查记者林筱为追查一条毒品线索，进入废弃东站。
事件：她在候车大厅捡到一部银灰色旧手机，屏幕显示一条未来新闻：凌晨两点，东站发生火灾，一名少年死亡。林筱认出照片中的校服属于离家出走的弟弟林晨。
冲突：林筱拨打弟弟电话，铃声却从地下通道传来。两名毒贩发现她并追杀，她一边躲避一边寻找林晨。
悬念：手机收到一条陌生短信：“要想救他，先相信我。”林筱推开地下通道的铁门，听见弟弟在黑暗中呼救。`;

function readSecret(file) {
  const raw = fs.readFileSync(file);
  assert.equal(raw.length, 32, `${file} session secret invalid`);
  return raw;
}

function headers(secret, requestPath, body = "") {
  const canonicalPath = requestPath.split("?", 1)[0];
  const license = "anonymous";
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyHash = crypto.createHash("sha256").update(Buffer.from(body)).digest("hex");
  const msg = `${license}|${canonicalPath}|${timestamp}|${nonce}|${bodyHash}`;
  const token = crypto.createHmac("sha256", secret).update(msg).digest("hex");
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
    headers: headers(secret, requestPath, body),
    data: body || undefined,
    timeout: 900000,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 1000) }; }
  if (!response.ok()) throw new Error(`${method} ${requestPath} HTTP ${response.status()}: ${JSON.stringify(data).slice(0, 1200)}`);
  return data;
}

async function runOne(ctx, name, base, secret, configId, templateId, appDataDir) {
  const result = await call(ctx, base, secret, "POST", "/api/novels/script-to-novel", {
    name: `同条件成文对比-${name}-${runId}`,
    content: script,
    template_id: templateId,
    llm_config_id: configId,
  });
  assert.ok(result.novel_id, `${name} did not return novel_id`);
  const chapters = await call(ctx, base, secret, "GET", `/api/novels/${result.novel_id}/chapters`);
  assert.ok(chapters.length > 0, `${name} returned no chapters`);
  const chapter = chapters[0];
  const content = chapter.content || chapter.chapter_content || "";
  return {
    name,
    template_id: templateId,
    novel_id: result.novel_id,
    chapter_count: result.chapter_count,
    chapter_title: chapter.title,
    content,
    metrics: {
      chars: content.length,
      paragraphs: content.split(/\n+/).filter(Boolean).length,
      has_dialogue: /[“”「」]/.test(content),
      has_scene_description: /雨|车站|地下|铁门|手机/.test(content),
    },
    data_dir: appDataDir,
  };
}

async function main() {
  const ctx = await request.newContext({ extraHTTPHeaders: { Accept: "application/json" } });
  try {
    const appData = process.env.APPDATA;
    const wanshan = await runOne(
      ctx,
      "万山-DeepSeek Flash",
      "http://127.0.0.1:8000",
      readSecret(path.join(appData, "万山", "data", "backend.session")),
      1,
      1,
      path.join(appData, "万山", "data"),
    );
    const qianshan = await runOne(
      ctx,
      "千山-DeepSeek Flash",
      "http://127.0.0.1:18472",
      readSecret(path.join(appData, "小洋梦剧场", "data", "backend.session")),
      5904,
      60,
      path.join(appData, "小洋梦剧场", "data"),
    );
    const report = {
      generated_at: new Date().toISOString(),
      model: "deepseek-v4-flash",
      template_mapping: {
        wanshan: { id: 1, name: "小说章节创作模板" },
        qianshan: { id: 60, name: "小说章节创作模板" },
      },
      input_script: script,
      results: { wanshan, qianshan },
    };
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify({ report: reportPath, wanshan: wanshan.metrics, qianshan: qianshan.metrics }, null, 2));
  } finally {
    await ctx.dispose();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
