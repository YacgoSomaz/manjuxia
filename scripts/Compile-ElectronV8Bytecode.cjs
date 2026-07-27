const fs = require("node:fs");
const path = require("node:path");
const babel = require("@babel/core");
const transformArrowFunctions = require("@babel/plugin-transform-arrow-functions");
const bytenode = require("bytenode");

const LOADER_SOURCE = `require("bytenode");\nrequire("./main.jsc");\n`;

function collectJavaScript(root) {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.join(root, entry.name));
}

function transformForBytecode(source, filePath, compiledNames) {
  const rewritten = source.replace(/require\((["'])\.(\/[^"']+)\1\)/g, (match, quote, localPath) => {
    const target = `${path.basename(localPath)}.js`;
    return compiledNames.has(target) ? `require(${quote}.${localPath}.jsc${quote})` : match;
  });
  const result = babel.transformSync(rewritten, {
    filename: filePath,
    babelrc: false,
    configFile: false,
    plugins: [transformArrowFunctions],
    sourceMaps: false,
    comments: false,
    compact: true
  });
  if (!result || !result.code) throw new Error(`failed to transform ${filePath}`);
  return result.code;
}

async function compileFile(filePath, electronPath, compiledNames) {
  const temporarySource = `${filePath}.v8-source.js`;
  const bytecodePath = filePath.replace(/\.js$/i, ".jsc");
  try {
    fs.writeFileSync(temporarySource, transformForBytecode(fs.readFileSync(filePath, "utf8"), filePath, compiledNames), "utf8");
    await bytenode.compileFile({
      filename: temporarySource,
      output: bytecodePath,
      electronMain: true,
      electronPath
    });
    if (!fs.existsSync(bytecodePath) || fs.statSync(bytecodePath).size === 0) {
      throw new Error(`V8 bytecode output missing for ${filePath}`);
    }
  } finally {
    fs.rmSync(temporarySource, { force: true });
  }
}

async function main() {
  const [sourceArg, electronArg] = process.argv.slice(2);
  if (!sourceArg || !electronArg) {
    throw new Error("usage: node Compile-ElectronV8Bytecode.cjs <app-source-dir> <electron-exe>");
  }
  const appSource = path.resolve(sourceArg);
  const electronPath = path.resolve(electronArg);
  const electronRoot = path.join(appSource, "electron");
  if (!fs.statSync(electronRoot).isDirectory() || !fs.statSync(electronPath).isFile()) {
    throw new Error("staged Electron sources or Electron runtime are missing");
  }

  // A preload runs in Electron's renderer-side isolated V8 context. Electron 43
  // rejects main-process cached data there, so it must remain obfuscated JS.
  // Every other Electron module runs from the main process and is bytecode-safe.
  const sourceFiles = collectJavaScript(electronRoot).filter((filePath) => path.basename(filePath) !== "preload.js");
  const compiledNames = new Set(sourceFiles.map((filePath) => path.basename(filePath)));
  for (const filePath of sourceFiles) await compileFile(filePath, electronPath, compiledNames);

  for (const filePath of sourceFiles) {
    const name = path.basename(filePath);
    if (name === "main.js") fs.writeFileSync(filePath, LOADER_SOURCE, "utf8");
    else fs.rmSync(filePath, { force: true });
  }
  process.stdout.write(`Compiled ${sourceFiles.length} Electron modules into V8 bytecode.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
