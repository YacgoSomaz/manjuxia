const assert = require("node:assert/strict");

const baseUrl = "https://ark.cn-beijing.volces.com/api/v3";
const apiKey = process.env.VOLC_API_KEY;
const models = {
  video: process.env.VOLC_VIDEO_MODEL,
  image: process.env.VOLC_IMAGE_MODEL,
  chat: process.env.VOLC_CHAT_MODEL,
  embedding: process.env.VOLC_EMBEDDING_MODEL,
};

assert.ok(apiKey, "VOLC_API_KEY 未设置");
for (const [name, model] of Object.entries(models)) assert.ok(model, `${name} model 未设置`);

async function call(pathname, body, timeoutMs = 120000) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text.slice(0, 500) }; }
  if (!response.ok) {
    const safe = JSON.stringify(payload).replaceAll(apiKey, "[REDACTED]");
    throw new Error(`${pathname} HTTP ${response.status}: ${safe.slice(0, 800)}`);
  }
  return { payload, elapsedMs: Date.now() - started };
}

function resultUrl(payload) {
  const item = payload?.data?.[0] || {};
  return item.url || item.b64_json || item.image_url || "";
}

async function main() {
  const report = {};

  const chat = await call("/chat/completions", {
    model: models.chat,
    messages: [{ role: "user", content: "请只用一句话回答：万山火山方舟对话链路测试成功了吗？" }],
    max_tokens: 64,
    temperature: 0.2,
  });
  const chatText = chat.payload?.choices?.[0]?.message?.content || "";
  assert.ok(chatText.trim(), "对话接口返回空内容");
  report.chat = { ok: true, elapsedMs: chat.elapsedMs, chars: chatText.length };

  const embedding = await call("/embeddings/multimodal", {
    model: models.embedding,
    encoding_format: "float",
    input: [{ type: "text", text: "万山火山方舟向量链路测试" }],
  });
  const vector = embedding.payload?.data?.embedding || embedding.payload?.data?.[0]?.embedding;
  if (!vector) console.log(JSON.stringify({
    embeddingResponseKeys: Object.keys(embedding.payload || {}),
    dataType: Array.isArray(embedding.payload?.data) ? "array" : typeof embedding.payload?.data,
    dataKeys: embedding.payload?.data && !Array.isArray(embedding.payload.data) ? Object.keys(embedding.payload.data) : [],
    dataLength: Array.isArray(embedding.payload?.data) ? embedding.payload.data.length : null,
  }, null, 2));
  assert.ok(Array.isArray(vector) && vector.length > 0, "向量接口返回空向量");
  report.embedding = { ok: true, elapsedMs: embedding.elapsedMs, dimensions: vector.length };

  const image = await call("/images/generations", {
    model: models.image,
    prompt: "一座安静的未来海滨档案馆，月光，电影感，干净构图，无文字",
    size: "2048x2048",
    response_format: "url",
    watermark: false,
  });
  assert.ok(resultUrl(image.payload), "生图接口没有返回图片结果");
  report.image = { ok: true, elapsedMs: image.elapsedMs, resultType: image.payload?.data?.[0]?.url ? "url" : "data" };

  const video = await call("/contents/generations/tasks", {
    model: models.video,
    content: [{ type: "text", text: "镜头缓慢推进一座月光下的未来海滨档案馆，海面微光，稳定运镜" }],
    duration: 5,
    ratio: "adaptive",
    watermark: false,
  });
  const taskId = video.payload?.id;
  assert.ok(taskId, "视频接口没有返回任务 ID");

  let final = null;
  for (let i = 0; i < 60; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const response = await fetch(`${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`video query HTTP ${response.status}`);
    const status = String(payload.status || "").toLowerCase();
    if (["succeeded", "failed", "expired", "cancelled"].includes(status)) {
      final = payload;
      break;
    }
  }
  assert.ok(final, "视频任务在 5 分钟内未结束");
  const videoUrl = final?.content?.video_url;
  if (String(final.status).toLowerCase() !== "succeeded") {
    throw new Error(`视频任务失败: ${final.error?.message || final.status}`);
  }
  assert.ok(videoUrl, "视频任务成功但没有 video_url");
  report.video = { ok: true, taskId, status: final.status, hasVideoUrl: true };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
