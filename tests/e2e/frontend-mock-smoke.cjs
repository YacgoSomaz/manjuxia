const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { _electron: electron } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const artifactDir = path.join(projectDir, "test-artifacts");
const mockMain = path.join(__dirname, "mock-main.cjs");
const failures = [];

function json(route, payload, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [mockMain],
    cwd: projectDir,
  });

  try {
    const page = await app.firstWindow();
    page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
    page.on("requestfailed", (request) => failures.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || "unknown"}`));
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`console: ${message.text()}`);
    });

    await page.route("http://mock.wanshan.test/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/novels/" && route.request().method() === "GET") {
        return json(route, [{
          id: 101,
          name: "Mock 苍穹短剧",
          raw_content: "用于前端 E2E 的本地 mock 数据。",
          chapter_count: 3,
          created_at: "2026-07-10T00:00:00",
          updated_at: "2026-07-10T00:00:00",
          mode: "import",
        }]);
      }
      if (url.pathname === "/api/team/context") return json(route, {});
      if (url.pathname.startsWith("/data/")) return route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1\" height=\"1\"/>" });
      return json(route, []);
    });

    await page.reload();
    await page.getByText("小说列表").waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("Mock 苍穹短剧").waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("导入 / 创作小说", { exact: true }).click();
    await page.getByText("剧本/小说导入", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("AI创作", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("内容类型", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText("粘贴文本", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
    await page.screenshot({ path: path.join(artifactDir, "frontend-mock-smoke.png"), fullPage: true });

    assert.equal(failures.length, 0, failures.join("\n"));
    console.log("mock_ui_visible=true");
    console.log("mock_network_failures=0");
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
