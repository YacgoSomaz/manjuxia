const fs = require("node:fs");
const path = require("node:path");
const { _electron: electron } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const artifactDir = path.join(projectDir, "test-artifacts");
const originalExe = "C:\\Users\\q2414\\AppData\\Local\\Programs\\xiaoyangmengjuchang\\造梦工坊.exe";

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  const app = await electron.launch({ executablePath: originalExe, args: [] });
  try {
    const page = await app.firstWindow({ timeout: 30000 });
    await page.waitForTimeout(2000);
    const later = page.getByText("稍后再说", { exact: true });
    if (await later.isVisible()) await later.click();
    await page.getByText("设置", { exact: true }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, "original-qianshan-settings.png"), fullPage: true });
    console.log((await page.locator("body").innerText()).slice(0, 7000));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
