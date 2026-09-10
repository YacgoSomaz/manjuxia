import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, relative, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packaging = join(root, "packaging");
const packageVersion = "0.1.38";
const staging = join(packaging, "release", `漫剧虾-${packageVersion}`);
const resources = join(staging, "resources");
const appSource = join(packaging, ".app-source");
const copy = (from, to, filter) => {
  if (!existsSync(from)) throw new Error(`missing required source: ${from}`);
  if (filter && !filter(from)) return;
  const sourceStat = lstatSync(from);
  if (sourceStat.isDirectory()) {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) copy(join(from, name), join(to, name), filter);
    return;
  }
  if (!sourceStat.isFile()) return;
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};

rmSync(staging, { recursive: true, force: true });
rmSync(appSource, { recursive: true, force: true });
mkdirSync(resources, { recursive: true });

// The runtime loads electron/main.protected.js, not main.js. Refuse to stage
// an older protected entrypoint. The packaging command regenerates it first;
// this guard prevents a stale auth/timeout implementation from being shipped.
const mainSource = join(root, "electron", "main.js");
const protectedMain = join(root, "electron", "main.protected.js");
if (!existsSync(protectedMain) || statSync(protectedMain).mtimeMs < statSync(mainSource).mtimeMs) {
  throw new Error("electron/main.protected.js is stale; run packaging/obfuscate-electron-main.cjs first");
}

// Keep Electron's entrypoint unpacked. This deliberately avoids app.asar so
// post-install updates to the application cannot trigger the old ASAR
// integrity failure. Python/runtime assets stay beside the entrypoint.
copy(join(root, "electron"), join(resources, "app", "electron"));
copy(join(root, "package.json"), join(resources, "app", "package.json"));

// electron-builder supplies Electron's executable from the project's pinned
// node_modules version.  Do not copy it into the release resources: doing so
// both duplicates a 220 MB binary and can leave an old Electron-branded EXE.
copy(join(root, "frontend"), join(resources, "frontend"));
copy(join(root, "backend"), join(resources, "backend"), (src) => !src.includes(`${sep}__pycache__${sep}`) && !src.endsWith(".pyc"));
copy(join(root, "public"), join(resources, "public"));
copy(join(root, "build"), join(resources, "build"));
copy(join(root, "packaging", "config", "release.local.json"), join(resources, "release_config.json"));

// A self-contained Python runtime: CPython stdlib/DLLs plus the project's
// pinned virtual-environment packages, without pip/docs/test tooling.
const pythonSource = "F:\\Dev\\Python313";
const skipPythonPart = new Set(["Doc", "include", "libs", "Scripts", "share", "site-packages", "test", "ensurepip", "idlelib", "turtledemo", "__pycache__"]);
copy(pythonSource, join(resources, "python"), (src) => {
  const parts = relative(pythonSource, src).split(sep);
  return !parts.some((part) => skipPythonPart.has(part));
});
copy(join(root, ".venv", "Lib", "site-packages"), join(resources, "python", "Lib", "site-packages"), (src) => !src.includes(`${sep}__pycache__${sep}`));

writeFileSync(join(staging, "BUILD-INFO.txt"), [
  "Product: 漫剧虾",
  `Version: ${packageVersion}`,
  "Mode: commercial account authentication",
  "Package: self-contained Electron + Python runtime"
].join("\r\n") + "\r\n", "utf8");
console.log(`STAGING_READY ${staging}`);
