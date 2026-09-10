"use strict";

const path = require("node:path");
const rcedit = require("rcedit");

module.exports = async function afterPack(context) {
  if (!context || context.electronPlatformName !== "win32") return;
  const productName = context.packager.appInfo.productFilename;
  const executable = path.join(context.appOutDir, `${productName}.exe`);
  const icon = path.resolve(__dirname, "..", "build", "icon.ico");
  await rcedit(executable, {
    icon,
    "file-version": "0.1.38",
    "product-version": "0.1.38",
    "version-string": {
      ProductName: "漫剧虾",
      FileDescription: "漫剧虾 AI 漫剧创作平台",
      CompanyName: "漫剧虾",
      InternalName: "漫剧虾",
      OriginalFilename: "漫剧虾.exe"
    }
  });
  console.log(`WINDOWS_ICON_EMBEDDED ${executable}`);
};
