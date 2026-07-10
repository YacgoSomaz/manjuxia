const fs = require("node:fs");
const path = require("node:path");
const { _electron: electron } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const dataDir = path.join(process.env.APPDATA, "万山", "data");
const artifactDir = path.join(projectDir, "test-artifacts");

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [projectDir],
    cwd: projectDir,
    env: { ...process.env, WANSHAN_DATA_DIR: dataDir, WANSHAN_E2E: "1" },
  });
  try {
    const page = await app.firstWindow();
    await page.getByText("剧本转换", { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await page.getByText("请选择小说转剧本模板", { exact: true }).click();
    await page.waitForTimeout(300);
    const body = await page.locator("body").innerText();
    await page.screenshot({ path: path.join(artifactDir, "script-template-ui.png"), fullPage: true });
    const names = [
      "小说转剧本模板(通用情景剧)",
      "小说转剧本模板(海外广播剧)",
      "小说转剧本模板(海外情景剧)",
    ];
    const visible = Object.fromEntries(names.map((name) => [name, body.includes(name)]));
    console.log(JSON.stringify({ visible, bodyPreview: body.slice(0, 2500) }, null, 2));
    if (!Object.values(visible).every(Boolean)) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
