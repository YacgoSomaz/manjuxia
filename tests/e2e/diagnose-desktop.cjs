const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { _electron: electron } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const artifactDir = path.join(projectDir, "test-artifacts");
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wanshan-e2e-"));
const dataDir = path.join(runtimeRoot, "万山", "data");
fs.mkdirSync(dataDir, { recursive: true });
const events = [];

function record(type, value) {
  events.push({ type, value: String(value), at: new Date().toISOString() });
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  Object.assign(process.env, {
    APPDATA: runtimeRoot,
    LOCALAPPDATA: runtimeRoot,
    WANSHAN_DATA_DIR: dataDir,
    WANSHAN_E2E: "1",
  });
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [projectDir],
  });

  try {
    const window = await app.firstWindow();
    window.on("console", (message) => record(`console:${message.type()}`, message.text()));
    window.on("pageerror", (error) => record("pageerror", error.stack || error.message));
    window.on("requestfailed", (request) => record("requestfailed", `${request.method()} ${request.url()} ${request.failure()?.errorText || "unknown"}`));
    window.on("response", (response) => {
      if (response.status() >= 400) record("http-error", `${response.status()} ${response.url()}`);
    });

    await window.reload();
    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(5000);
    await window.screenshot({ path: path.join(artifactDir, "desktop-observed.png"), fullPage: true });
    fs.writeFileSync(path.join(artifactDir, "desktop-observed.json"), JSON.stringify(events, null, 2));
    const runtime = await window.evaluate(async () => ({
      appInfo: await window.wanshan?.getAppInfo?.(),
      backendUrl: await window.electronAPI?.getBackendUrl?.(),
      sessionSecretPresent: Boolean(await window.electronAPI?.getSessionSecret?.()),
    }));
    console.log(JSON.stringify({ title: await window.title(), url: window.url(), runtime, eventCount: events.length, events }, null, 2));
    if (!runtime.sessionSecretPresent) {
      throw new Error("isolated Electron instance did not receive its backend session secret");
    }
  } finally {
    await app.close();
    fs.rmSync(runtimeRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
