const { _electron: electron } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "assets", "user-guide");
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  { id: "01-settings", hash: "#/settings", title: "模型配置" },
  { id: "02-novels", hash: "#/novels", title: "小说导入" },
  { id: "03-scripts", hash: "#/scripts", title: "剧本转换" },
  { id: "04-extraction", hash: "#/extraction", title: "信息提取" },
  { id: "05-storyboards", hash: "#/storyboards", title: "分镜管理" },
  { id: "06-video", hash: "#/video", title: "即梦视频生成" },
];

async function closePopups(page) {
  for (const label of ["关闭", "取消", "我知道了"]) {
    const btn = page.getByText(label, { exact: true }).last();
    try {
      if (await btn.isVisible({ timeout: 300 })) await btn.click({ timeout: 500 });
    } catch (_) {}
  }
}

(async () => {
  const app = await electron.launch({
    args: [root],
    cwd: root,
    env: {
      ...process.env,
      WANSHAN_COMMERCIAL: "0",
    },
  });
  const page = await app.firstWindow({ timeout: 60000 });
  await page.setViewportSize({ width: 1386, height: 820 });

  page.on("console", (msg) => {
    const text = msg.text();
    if (/error|failed|无法|失败/i.test(text)) console.log(`[browser:${msg.type()}] ${text}`);
  });

  for (const item of pages) {
    console.log(`capture ${item.title}: ${item.hash}`);
    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, item.hash);
    await page.waitForTimeout(2600);
    await closePopups(page);
    await page.screenshot({
      path: path.join(outDir, `${item.id}.raw.png`),
      fullPage: false,
    });
  }

  await app.close();
})();
