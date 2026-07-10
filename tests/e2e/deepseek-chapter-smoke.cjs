const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(process.env.APPDATA, "万山", "data");
const port = Number.parseInt(fs.readFileSync(path.join(dataDir, "backend.port"), "utf8").trim(), 10);
const baseUrl = `http://127.0.0.1:${port}`;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || "GET"} ${pathname}: ${body.detail || response.status}`);
  return body;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const configs = await request("/api/llm-configs/?config_type=llm");
  const config = configs.find((item) => item.name === "DeepSeek 本机");
  assert.ok(config, "需要本机 DeepSeek 配置");

  const novelName = `E2E DeepSeek 章节测试 ${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
  const outline = await request("/api/novels/create-outline", {
    method: "POST",
    body: JSON.stringify({
      novel_name: novelName,
      concept: "近未来的潮汐城每逢满月会短暂沉入海底。见习档案员林澈发现父亲失踪前留下的录音，指向一座会在潮水退去时出现的地下图书馆。请创作适合短剧改编的悬疑冒险故事。",
      llm_config_id: config.id,
    }),
  });

  assert.ok(outline.novel_id, "大纲生成应创建小说记录");
  assert.ok(Array.isArray(outline.outline?.chapters) && outline.outline.chapters.length > 0, "大纲应包含章节规划");

  await request(`/api/novels/${outline.novel_id}/generate-chapter`, {
    method: "POST",
    body: JSON.stringify({ chapter_index: 0, llm_config_id: config.id }),
  });

  let status;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await sleep(3000);
    status = await request(`/api/novels/${outline.novel_id}/generation-status`);
    if (status.status === "success") break;
    if (status.status === "failed") {
      throw new Error(`章节生成失败: ${status.current_log?.error_message || "未知错误"}`);
    }
  }
  assert.equal(status?.status, "success", "章节生成在 6 分钟内完成");

  const chapters = await request(`/api/novels/${outline.novel_id}/chapters`);
  const chapter = chapters.find((item) => item.sort_order === 0);
  assert.ok(chapter, "第 1 章应已写入数据库");
  assert.ok((chapter.content || "").trim().length >= 500, "章节正文应包含至少 500 个字符");

  console.log(`novel_id=${outline.novel_id}`);
  console.log(`novel_name=${novelName}`);
  console.log(`outline_chapters=${outline.outline.chapters.length}`);
  console.log(`chapter_id=${chapter.id}`);
  console.log(`chapter_title=${chapter.title}`);
  console.log(`chapter_characters=${chapter.content.trim().length}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
