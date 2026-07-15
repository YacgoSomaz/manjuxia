const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { readReleaseConfig } = require("../electron/release-config");

test("source runtime loads the local commercial account configuration", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "manjuxia-config-"));
  const localConfigPath = path.join(rootDir, "packaging", "config", "release.local.json");
  fs.mkdirSync(path.dirname(localConfigPath), { recursive: true });
  fs.writeFileSync(localConfigPath, JSON.stringify({
    commercial: true,
    auth_mode: "account",
    account_api_url: "https://anyq.site",
    account_public_key: "public-key",
    product_code: "comic_shrimp"
  }));

  const config = readReleaseConfig({ rootDir, isPackaged: false, env: {} });
  assert.equal(config.commercial, true);
  assert.equal(config.auth_mode, "account");
  assert.equal(config.product_code, "comic_shrimp");
});

test("a packaged release only loads its root release_config.json", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "manjuxia-packaged-config-"));
  fs.writeFileSync(path.join(rootDir, "release_config.json"), JSON.stringify({ commercial: true, auth_mode: "account" }));

  const config = readReleaseConfig({ rootDir, isPackaged: true, env: {} });
  assert.equal(config.commercial, true);
  assert.equal(config.auth_mode, "account");
});
