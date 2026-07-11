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
    await page.getByText("万山模型配置").waitFor({ state: "visible", timeout: 15000 });
    await page.screenshot({ path: path.join(projectDir, "test-artifacts", "live-settings.png"), fullPage: true });
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes("一键本地配置")) {
      throw new Error("设置页缺少一键本地配置入口");
    }
    if (!bodyText.includes("使用本机加密配置")) {
      throw new Error("设置页没有说明当前使用本机加密配置");
    }
    if (bodyText.includes("千山远端配置")) {
      throw new Error("设置页不应再主推千山远端配置入口");
    }
    await page.getByText("一键本地配置").click();
    await page.getByText("低代码本地配置").waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("厂商预设").waitFor({ state: "visible", timeout: 5000 });
    const maxTokens = await page.locator('input[name="max_tokens"]').inputValue();
    if (maxTokens !== "20000") {
      throw new Error(`最大输出Token默认值错误: ${maxTokens}`);
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
