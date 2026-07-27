const fs = require("node:fs");
const path = require("node:path");
const JavaScriptObfuscator = require("javascript-obfuscator");

function collectJavaScript(root, skip) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (skip(target, entry)) continue;
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".js") files.push(target);
    }
  };
  visit(root);
  return files;
}

function obfuscateFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const result = JavaScriptObfuscator.obfuscate(source, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    renameProperties: false,
    selfDefending: false,
    sourceMap: false,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayEncoding: ["base64"],
    stringArrayThreshold: 0.75,
    transformObjectKeys: false,
    unicodeEscapeSequence: false
  });
  fs.writeFileSync(filePath, result.getObfuscatedCode(), "utf8");
}

function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : "";
  if (!root || !fs.statSync(root).isDirectory()) {
    throw new Error("usage: node Obfuscate-ReleaseJavaScript.cjs <app-source-dir>");
  }

  const electronRoot = path.join(root, "electron");
  const frontendRoot = path.join(root, "frontend");
  const targets = [];
  if (fs.existsSync(electronRoot)) targets.push(...collectJavaScript(electronRoot, () => false));
  if (fs.existsSync(frontendRoot)) {
    const bundledAssets = `${path.resolve(frontendRoot, "assets")}${path.sep}`;
    targets.push(...collectJavaScript(frontendRoot, (target, entry) => entry.isDirectory() && `${path.resolve(target)}${path.sep}` === bundledAssets));
  }
  if (!targets.length) throw new Error("release JavaScript sources are missing");

  for (const filePath of targets) obfuscateFile(filePath);
  process.stdout.write(`Obfuscated ${targets.length} release JavaScript files.\n`);
}

main();
