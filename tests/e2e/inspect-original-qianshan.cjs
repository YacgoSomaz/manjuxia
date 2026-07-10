const fs = require("node:fs");
const path = require("node:path");
const { _electron: electron, chromium } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const artifactDir = path.join(projectDir, "test-artifacts");
const originalExe = "C:\\Users\\q2414\\AppData\\Local\\Programs\\xiaoyangmengjuchang\\造梦工坊.exe";

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  const cdpUrl = process.env.ORIGINAL_CDP_URL;
  const app = cdpUrl ? null : await electron.launch({ executablePath: originalExe, args: [] });
  let browser = null;
  try {
    let page;
    if (app) {
      page = await app.firstWindow({ timeout: 30000 });
    } else {
      browser = await chromium.connectOverCDP(cdpUrl);
      page = browser.contexts()[0].pages().find((candidate) => candidate.url().includes("index.html"));
      if (!page) throw new Error("未找到原版主窗口");
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(artifactDir, "original-qianshan-home.png"), fullPage: true });
    const later = page.getByText("稍后再说", { exact: true });
    if (await later.isVisible()) await later.click();
    await page.getByText("导入 / 创作小说", { exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, "original-qianshan-import-dialog.png"), fullPage: true });
    const text = (await page.locator("body").innerText()).slice(0, 5000);
    console.log(JSON.stringify({ title: await page.title(), url: page.url(), text }, null, 2));
  } finally {
    if (app) await app.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
