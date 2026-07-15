const path = require("node:path");

async function main() {
  const [exePath, iconPath, version] = process.argv.slice(2);
  if (!exePath || !iconPath || !version) {
    throw new Error("Usage: node Set-WindowsIcon.cjs <exe> <icon.ico> <version>");
  }
  const rcedit = require("rcedit");
  await rcedit(path.resolve(exePath), {
    icon: path.resolve(iconPath),
    "file-version": version,
    "product-version": version,
    "version-string": {
      CompanyName: "漫剧虾",
      FileDescription: "漫剧虾 AI 漫剧创作平台",
      ProductName: "漫剧虾",
      OriginalFilename: "漫剧虾.exe"
    }
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
