const assert = require("node:assert/strict");
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
    env: {
      ...process.env,
      WANSHAN_DATA_DIR: dataDir,
      WANSHAN_E2E: "1",
    },
  });

  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => errors.push(`requestfailed: ${request.url()}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  try {
    await page.getByText("设置", { exact: true }).first().click();
    await page.getByText("模型 API 配置", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
    await page.getByText("火山方舟对话（万山测试）", { exact: true }).waitFor({ state: "visible", timeout: 15000 });

    const buttons = await page.locator("button").allTextContents();
    await page.screenshot({ path: path.join(artifactDir, "volcengine-settings-before-test.png"), fullPage: true });

    const conversation = page.getByText("火山方舟对话（万山测试）", { exact: true });
    const row = conversation.locator("xpath=ancestor::*[self::tr or contains(@class, 'el-table__row')][1]");
    const testButton = row.getByRole("button", { name: /测试|试跑/ }).first();
    const chatResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/llm-configs/2/test") && response.request().method() === "POST",
      { timeout: 90000 },
    );
    await testButton.click();
    const chatPayload = await (await chatResponsePromise).json();
    assert.equal(chatPayload.success, true, chatPayload.message || "对话测试失败");
    await page.locator(".el-dialog__headerbtn").last().click({ force: true });
    await page.locator(".el-overlay.el-modal-dialog").last().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});

    const imageTab = page.getByText("图片生成模型", { exact: true });
    assert.equal(await imageTab.count(), 1, "图片生成模型标签不存在");
    await imageTab.click();
    const image = page.getByText("火山方舟生图（万山测试）", { exact: true });
    await image.waitFor({ state: "visible", timeout: 15000 });
    const imageRow = image.locator("xpath=ancestor::*[self::tr or contains(@class, 'el-table__row')][1]");
    const imageResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/llm-configs/3/test") && response.request().method() === "POST",
      { timeout: 180000 },
    );
    await imageRow.getByRole("button", { name: /测试|试跑/ }).first().click();
    const imagePayload = await (await imageResponsePromise).json();
    assert.equal(imagePayload.success, true, imagePayload.message || "图片测试失败");
    const resultDialogClose = page.locator(".el-dialog__headerbtn").last();
    await resultDialogClose.click({ force: true });
    await page.locator(".el-overlay.el-modal-dialog").last().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});

    const videoTab = page.getByText("视频生成模型", { exact: true });
    assert.equal(await videoTab.count(), 1, "视频生成模型标签不存在");
    await videoTab.click();
    await page.getByText("火山方舟视频（万山测试）", { exact: true }).waitFor({ state: "visible", timeout: 15000 });

    await page.screenshot({ path: path.join(artifactDir, "volcengine-settings-after-test.png"), fullPage: true });
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(JSON.stringify({
      settingsVisible: true,
      configNamesVisible: 3,
      chatTestPassed: true,
      imageTestPassed: true,
      buttonCount: buttons.length,
    }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
