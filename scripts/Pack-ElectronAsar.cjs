const fs = require("node:fs");
const path = require("node:path");
const { createPackage } = require("@electron/asar");

async function main() {
  const [sourceArg, outputArg] = process.argv.slice(2);
  if (!sourceArg || !outputArg) {
    throw new Error("usage: node Pack-ElectronAsar.cjs <source-dir> <output-file>");
  }

  const source = path.resolve(sourceArg);
  const output = path.resolve(outputArg);
  if (!fs.statSync(source).isDirectory()) {
    throw new Error(`ASAR source directory missing: ${source}`);
  }
  if (!fs.existsSync(path.join(source, "package.json"))) {
    throw new Error("ASAR source is missing package.json");
  }

  fs.rmSync(output, { force: true });
  await createPackage(source, output);
  if (!fs.statSync(output).isFile() || fs.statSync(output).size === 0) {
    throw new Error("ASAR archive was not created");
  }
  process.stdout.write(`ASAR ready: ${output}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
