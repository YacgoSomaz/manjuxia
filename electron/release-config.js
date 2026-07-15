const fs = require("node:fs");
const path = require("node:path");

function configCandidates({ rootDir, isPackaged, env }) {
  if (env.WANSHAN_RELEASE_CONFIG) return [path.resolve(env.WANSHAN_RELEASE_CONFIG)];
  const candidates = [path.join(rootDir, "release_config.json")];
  if (!isPackaged) candidates.push(path.join(rootDir, "packaging", "config", "release.local.json"));
  return candidates;
}

function readReleaseConfig({ rootDir, isPackaged, env = process.env }) {
  for (const configPath of configCandidates({ rootDir, isPackaged, env })) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return { ...config, commercial: Boolean(config.commercial) };
    } catch (_) {
      // Continue to the next permitted configuration location.
    }
  }
  return { commercial: env.WANSHAN_COMMERCIAL === "1" };
}

module.exports = { readReleaseConfig };
