const { app, BrowserWindow } = require("electron");
const path = require("node:path");

const projectDir = path.resolve(__dirname, "..", "..");

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "mock-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.loadFile(path.join(projectDir, "frontend", "index.html"));
});

app.on("window-all-closed", () => app.quit());
