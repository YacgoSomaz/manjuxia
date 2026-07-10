const fs = require("node:fs");
const path = require("node:path");
const { _electron: electron } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const dataDir = path.join(process.env.APPDATA, "万山", "data");
const port = fs.readFileSync(path.join(dataDir, "backend.port"), "utf8").trim();
const sessionSecret = fs.readFileSync(path.join(dataDir, "backend.session")).toString("hex");

async function main() {
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [path.join(__dirname, "mock-main.cjs")],
    cwd: projectDir,
    env: {
      ...process.env,
      WANSHAN_E2E_BACKEND_URL: `http://127.0.0.1:${port}`,
      WANSHAN_E2E_SESSION_SECRET: sessionSecret,
    },
  });
  try {
    const page = await app.firstWindow();
    await page.goto(`file://${path.join(projectDir, "frontend", "index.html").replace(/\\/g, "/")}#/settings`);
    await page.getByText("模型 API 配置").waitFor({ state: "visible", timeout: 15000 });
    await page.screenshot({ path: path.join(projectDir, "test-artifacts", "live-settings.png"), fullPage: true });
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes("配置保存在本机")) {
      throw new Error("设置页仍显示旧的云端配置文案");
    }
    if (bodyText.includes("配置已迁移到云端")) {
      throw new Error("设置页不应再显示云端迁移文案");
    }
    console.log(bodyText.slice(0, 5000));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
