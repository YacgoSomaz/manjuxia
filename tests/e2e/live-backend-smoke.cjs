const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { _electron: electron } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const artifactDir = path.join(projectDir, "test-artifacts");
const dataDir = path.join(process.env.APPDATA, "万山", "data");
const port = fs.readFileSync(path.join(dataDir, "backend.port"), "utf8").trim();
const sessionSecret = fs.readFileSync(path.join(dataDir, "backend.session")).toString("hex");
const failures = [];

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
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
    page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
    page.on("requestfailed", (request) => failures.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || "unknown"}`));
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`console: ${message.text()}`);
    });

    await page.reload();
    await page.getByText("小说列表").waitFor({ state: "visible", timeout: 15000 });
    await page.getByText(/E2E DeepSeek 章节测试/).first().waitFor({ state: "visible", timeout: 15000 });
    await page.screenshot({ path: path.join(artifactDir, "live-backend-smoke.png"), fullPage: true });
    assert.equal(failures.length, 0, failures.join("\n"));
    console.log("live_frontend_signed_requests=true");
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
