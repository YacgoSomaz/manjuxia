const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { UpdateClient, compareVersions, installerArgsForCurrentApp, verifyUpdateRelease } = require("../electron/update-client");

const NOW = 1_780_000_000;

function publicKeyText(publicKey) {
  return publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
}

function publicKeySpkiText(publicKey) {
  return publicKey.export({ format: "der", type: "spki" }).toString("base64url");
}

function payload(overrides = {}) {
  return {
    typ: "desktop-release",
    iss: "https://anyq.site",
    aud: "comic_shrimp",
    issued_at: NOW - 30,
    signed_until: NOW + 600,
    product_id: "comic_shrimp",
    version: "0.1.14",
    min_supported_version: "0.1.10",
    mandatory: false,
    installer_url: "https://download.anyq.site/comic-shrimp/0.1.14/ComicShrimpSetup_0.1.14.exe",
    sha256: "a".repeat(64),
    size_bytes: 314182000,
    notes: "修复稳定性问题",
    published_at: "2026-07-14T12:00:00.000Z",
    ...overrides
  };
}

function signedReply(releasePayload, privateKey, envelopeOverrides = {}, rootOverrides = {}) {
  const bytes = Buffer.from(JSON.stringify(releasePayload), "utf8");
  return {
    ok: true,
    update_release: {
      schema: "anyq.desktop-update.v1",
      alg: "Ed25519",
      key_id: "update-v1",
      payload: bytes.toString("base64url"),
      signature: crypto.sign(null, bytes, privateKey).toString("base64url"),
      ...envelopeOverrides
    },
    ...rootOverrides
  };
}

test("compares dotted versions numerically", () => {
  assert.equal(compareVersions("1.10.0", "1.2.9") > 0, true);
  assert.equal(compareVersions("0.1.13", "0.1.13"), 0);
  assert.equal(compareVersions("0.1.12", "0.1.13") < 0, true);
});

test("accepts only a valid signed update_release for comic_shrimp", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const result = verifyUpdateRelease(signedReply(payload(), privateKey), {
    publicKey: publicKeyText(publicKey), productId: "comic_shrimp", now: NOW
  });

  assert.equal(result.ok, true);
  assert.equal(result.release.version, "0.1.14");
  assert.equal(result.release.installerUrl, "https://download.anyq.site/comic-shrimp/0.1.14/ComicShrimpSetup_0.1.14.exe");
});

test("accepts the exact Ed25519 SPKI encoding used by release configuration", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const result = verifyUpdateRelease(signedReply(payload(), privateKey), {
    publicKey: publicKeySpkiText(publicKey), productId: "comic_shrimp", now: NOW
  });
  assert.equal(result.ok, true);
  assert.equal(result.release.version, "0.1.14");
});

test("ignores all unsigned root fields and rejects cross-product or stale signatures", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const key = publicKeyText(publicKey);
  const poisoned = signedReply(payload(), privateKey, {}, {
    version: "999.0.0",
    mandatory: true,
    installer_url: "https://attacker.invalid/evil.exe",
    products: [{ product_id: "comic_shrimp", status: "active" }]
  });
  const accepted = verifyUpdateRelease(poisoned, { publicKey: key, productId: "comic_shrimp", now: NOW });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.release.mandatory, false);
  assert.equal(accepted.release.version, "0.1.14");

  const wrongProduct = verifyUpdateRelease(signedReply(payload({ aud: "operation_shrimp", product_id: "operation_shrimp" }), privateKey), {
    publicKey: key, productId: "comic_shrimp", now: NOW
  });
  assert.equal(wrongProduct.reason, "audience_mismatch");

  const expired = verifyUpdateRelease(signedReply(payload({ signed_until: NOW - 1 }), privateKey), {
    publicKey: key, productId: "comic_shrimp", now: NOW
  });
  assert.equal(expired.reason, "signature_expired");
});

test("rejects any non-official installer URL, malformed file metadata, or non-update-v1 key", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const key = publicKeyText(publicKey);
  for (const invalidPayload of [
    payload({ installer_url: "https://download.anyq.site/comic-shrimp/a.exe?token=bad" }),
    payload({ installer_url: "https://cdn.anyq.site/comic-shrimp/a.exe" }),
    payload({ installer_url: "https://download.anyq.site/comic-shrimp/a.zip" }),
    payload({ sha256: "A".repeat(64) }),
    payload({ size_bytes: 0 })
  ]) {
    assert.equal(verifyUpdateRelease(signedReply(invalidPayload, privateKey), {
      publicKey: key, productId: "comic_shrimp", now: NOW
    }).ok, false);
  }
  assert.equal(verifyUpdateRelease(signedReply(payload(), privateKey, { key_id: "account-v1" }), {
    publicKey: key, productId: "comic_shrimp", now: NOW
  }).reason, "unknown_update_key");
});

test("uses the fixed account endpoint and only blocks for signed mandatory or minimum versions", async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const key = publicKeyText(publicKey);
  let request = null;
  const client = new UpdateClient({
    app: { getVersion: () => "0.1.13" },
    config: { account_api_url: "https://oss.example.invalid", product_code: "operation_shrimp", update_public_key: key },
    dataDir: "",
    mainWindow: null,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => signedReply(payload(), privateKey) };
    },
    now: () => NOW * 1000
  });
  const optional = await client.check();
  assert.equal(request.url, "https://anyq.site/api/v1/releases/latest?product_id=comic_shrimp");
  assert.equal(request.options.redirect, "error");
  assert.equal(optional.mandatory, false);

  const requiredClient = new UpdateClient({
    app: { getVersion: () => "0.1.13" }, config: { update_public_key: key }, dataDir: "", mainWindow: null,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => signedReply(payload({ min_supported_version: "0.1.14" }), privateKey) }),
    now: () => NOW * 1000
  });
  assert.equal((await requiredClient.check()).mandatory, true);
});

test("passes the current installed directory to the Inno updater", () => {
  const args = installerArgsForCurrentApp({
    getPath(name) {
      assert.equal(name, "exe");
      return "D:\\Apps\\ManJuXia\\漫剧虾.exe";
    }
  });
  assert.deepEqual(args, ["/NORESTART", "/DIR=D:\\Apps\\ManJuXia"]);

  assert.deepEqual(installerArgsForCurrentApp({ getPath: () => "D:\\Tools\\electron.exe" }), ["/NORESTART"]);
});
