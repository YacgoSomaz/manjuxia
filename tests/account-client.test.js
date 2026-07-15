const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { AccountClient } = require("../electron/account-client");

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function rawPublicKey(publicKey) {
  const spki = publicKey.export({ format: "der", type: "spki" });
  assert.equal(spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX), true);
  return spki.subarray(ED25519_SPKI_PREFIX.length).toString("base64url");
}

function createSignedAccount({ privateKey, keyId = "account-v1", aud = "comic_shrimp", user, products, now = 1_700_000_000, signedUntil = now + 600 }) {
  const payloadBytes = Buffer.from(JSON.stringify({
    typ: "anyq.account-license.v1",
    iss: "https://anyq.site",
    aud,
    issued_at: now,
    signed_until: signedUntil,
    server_time: new Date(now * 1000).toISOString(),
    user,
    products
  }), "utf8");
  return {
    schema: "anyq.account-license.v1",
    alg: "Ed25519",
    key_id: keyId,
    payload: payloadBytes.toString("base64url"),
    signature: crypto.sign(null, payloadBytes, privateKey).toString("base64url")
  };
}

function createSignedRawPayload({ privateKey, payloadText, keyId = "account-v1" }) {
  const payloadBytes = Buffer.from(payloadText, "utf8");
  return {
    schema: "anyq.account-license.v1",
    alg: "Ed25519",
    key_id: keyId,
    payload: payloadBytes.toString("base64url"),
    signature: crypto.sign(null, payloadBytes, privateKey).toString("base64url")
  };
}

function fakeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(value, "utf8"),
    decryptString: (value) => Buffer.from(value).toString("utf8")
  };
}

function jsonResponse(data, headers = {}, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: (name) => headers[String(name).toLowerCase()] || null },
    json: async () => data
  };
}

test("account client logs in, stores cookie, and verifies active membership", async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const accountPublicKey = rawPublicKey(publicKey);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manjuxia-account-"));
  const nowMs = 1_700_000_000_000;
  const expiresAt = new Date(nowMs + 86400_000).toISOString();
  const user = { id: 7, phone: "13800138000", role: "regular" };
  const products = [
    {
      product_id: "comic_shrimp",
      name: "漫剧虾 + 漫剧精品课程",
      price_cents: 79900,
      duration_days: 365,
      status: "active",
      expires_at: expiresAt,
      entitlements: ["comic_course"]
    }
  ];
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith("/api/auth/send-code")) return jsonResponse({ ok: true, message: "验证码已发送" });
    if (url.endsWith("/api/auth/login")) {
      return jsonResponse(
        {
          ok: true,
          user,
          products,
          account_license: createSignedAccount({ privateKey, user, products }),
          expiresAt
        },
        { "set-cookie": "wz_session=session-token; Path=/; HttpOnly; Secure; SameSite=Lax" }
      );
    }
    if (url.endsWith("/api/auth/me")) {
      assert.equal(init.headers.Cookie, "wz_session=session-token");
      return jsonResponse({
        ok: true,
        user,
        products,
        account_license: createSignedAccount({ privateKey, user, products }),
        server_time: new Date().toISOString()
      });
    }
    if (url.endsWith("/api/auth/web-handoff")) {
      assert.equal(init.headers.Cookie, "wz_session=session-token");
      return jsonResponse({ ok: true, continueUrl: "https://anyq.site/account/continue#ticket=abc12345678901234567890123456789012345678901" });
    }
    throw new Error(`unexpected url ${url}`);
  };
  const client = new AccountClient({
    baseUrl: "https://anyq.site",
    publicKey: { "account-v1": accountPublicKey },
    productCode: "comic_shrimp",
    deviceHash: "device-1",
    appVersion: "0.1.0",
    dataPath: path.join(tempDir, "account.dat"),
    safeStorage: fakeStorage(),
    fetchImpl,
    now: () => nowMs
  });

  assert.equal((await client.sendCode("13800138000")).success, true);
  assert.equal(calls[0].init.headers["X-Product-Code"], "comic_shrimp");
  const login = await client.login("13800138000", "123456");
  assert.equal(login.success, true);
  assert.equal(login.active, true);
  assert.equal(fs.existsSync(path.join(tempDir, "account.dat")), true);
  const verified = await client.verify();
  assert.equal(verified.ok, true);
  const requestsBeforeCachedVerify = calls.length;
  const cached = client.verifyCached();
  assert.equal(cached.ok, true);
  assert.equal(calls.length, requestsBeforeCachedVerify);
  assert.equal(client.getInfo().phone, "13800138000");
  assert.equal(client.getInfo().product_id, "comic_shrimp");
  assert.equal(client.getInfo().product_name, "漫剧虾 + 漫剧精品课程");
  assert.deepEqual(client.getInfo().entitlements, ["comic_course"]);
  assert.equal(client.getInfo().membership_status, "active");
  const handoff = await client.createWebHandoff();
  assert.equal(handoff.success, true);
  assert.match(handoff.continueUrl, /^https:\/\/anyq\.site\/account\/continue#ticket=/);
  assert.equal(calls.some((call) => call.url.endsWith("/api/auth/me")), true);
});

test("account client rejects accounts without comic_shrimp comic_course entitlement", async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const accountPublicKey = rawPublicKey(publicKey);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manjuxia-account-free-"));
  const nowMs = 1_700_000_000_000;
  const user = { id: 8, phone: "13900139000", role: "regular" };
  const products = [
    {
      product_id: "replay_shrimp",
      name: "复盘虾 + 运营杀招教程",
      price_cents: 249900,
      duration_days: 365,
      status: "active",
      expires_at: new Date(nowMs + 86400_000).toISOString(),
      entitlements: ["livewatch"]
    }
  ];
  const fetchImpl = async (url) => {
    if (url.endsWith("/api/auth/login")) {
      return jsonResponse(
        {
          ok: true,
          user,
          products,
          account_license: createSignedAccount({ privateKey, user, products }),
          expiresAt: new Date(nowMs + 86400_000).toISOString()
        },
        { "set-cookie": "wz_session=free-token; Path=/; HttpOnly; Secure; SameSite=Lax" }
      );
    }
    if (url.endsWith("/api/auth/me")) {
      return jsonResponse({
        ok: true,
        user,
        products,
        account_license: createSignedAccount({ privateKey, user, products })
      });
    }
    throw new Error(`unexpected url ${url}`);
  };
  const client = new AccountClient({
    baseUrl: "https://anyq.site",
    publicKey: { "account-v1": accountPublicKey },
    productCode: "comic_shrimp",
    deviceHash: "device-1",
    dataPath: path.join(tempDir, "account.dat"),
    safeStorage: fakeStorage(),
    fetchImpl,
    now: () => nowMs
  });

  const login = await client.login("13900139000", "123456");
  assert.equal(login.success, true);
  assert.equal(login.active, false);
  const verified = await client.verify();
  assert.equal(verified.ok, false);
  assert.equal(verified.authenticated, true);
  assert.equal(verified.reason, "unauthorized_tool");
  assert.equal(client.getInfo().active, false);
});

test("account client rejects tampered product fields outside signed envelope", async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const accountPublicKey = rawPublicKey(publicKey);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manjuxia-account-tampered-"));
  const nowMs = 1_700_000_000_000;
  const user = { id: 9, phone: "13700137000", role: "regular" };
  const signedProducts = [
    {
      product_id: "replay_shrimp",
      name: "复盘虾 + 运营杀招教程",
      price_cents: 249900,
      duration_days: 365,
      status: "active",
      expires_at: new Date(nowMs + 86400_000).toISOString(),
      entitlements: ["livewatch"]
    }
  ];
  const tamperedProducts = [
    {
      product_id: "comic_shrimp",
      name: "漫剧虾 + 漫剧精品课程",
      price_cents: 79900,
      duration_days: 365,
      status: "active",
      expires_at: new Date(nowMs + 86400_000).toISOString(),
      entitlements: ["comic_course"]
    }
  ];
  const fetchImpl = async (url) => {
    if (url.endsWith("/api/auth/login")) {
      return jsonResponse(
        {
          ok: true,
          user,
          products: tamperedProducts,
          account_license: createSignedAccount({ privateKey, user, products: signedProducts })
        },
        { "set-cookie": "wz_session=tampered-token; Path=/; HttpOnly; Secure; SameSite=Lax" }
      );
    }
    throw new Error(`unexpected url ${url}`);
  };
  const client = new AccountClient({
    baseUrl: "https://anyq.site",
    publicKey: { "account-v1": accountPublicKey },
    productCode: "comic_shrimp",
    deviceHash: "device-1",
    dataPath: path.join(tempDir, "account.dat"),
    safeStorage: fakeStorage(),
    fetchImpl,
    now: () => nowMs
  });

  const login = await client.login("13700137000", "123456");
  assert.equal(login.success, true);
  assert.equal(login.active, false);
  assert.equal(client.getInfo().product_id, "comic_shrimp");
  assert.deepEqual(client.getInfo().products, signedProducts);
});

test("account client rejects expired signatures, unknown keys, and wrong audiences", async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const { publicKey: wrongPublicKey } = crypto.generateKeyPairSync("ed25519");
  const accountPublicKey = rawPublicKey(publicKey);
  const wrongAccountPublicKey = rawPublicKey(wrongPublicKey);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manjuxia-account-bad-signature-"));
  const nowMs = 1_700_000_000_000;
  const user = { id: 10, phone: "13600136000", role: "regular" };
  const products = [
    {
      product_id: "comic_shrimp",
      name: "漫剧虾 + 漫剧精品课程",
      price_cents: 79900,
      duration_days: 365,
      status: "active",
      expires_at: new Date(nowMs + 86400_000).toISOString(),
      entitlements: ["comic_course"]
    }
  ];
  const envelopes = [
    ["signature_expired", createSignedAccount({ privateKey, user, products, signedUntil: 1_699_999_000 })],
    ["unknown_key", createSignedAccount({ privateKey, keyId: "account-v2", user, products })],
    ["audience_mismatch", createSignedAccount({ privateKey, aud: "replay_shrimp", user, products })],
    ["duplicate_key", createSignedRawPayload({
      privateKey,
      payloadText: `{"typ":"anyq.account-license.v1","typ":"anyq.account-license.v1","iss":"https://anyq.site","aud":"comic_shrimp","issued_at":1700000000,"signed_until":1700000600,"user":{"id":10,"phone":"13600136000","role":"regular"},"products":[]}`
    })]
  ];
  for (const [expectedReason, accountLicense] of envelopes) {
    const fetchImpl = async (url) => {
      if (url.endsWith("/api/auth/login")) {
        return jsonResponse(
          { ok: true, user, products, account_license: accountLicense },
          { "set-cookie": "wz_session=bad-token; Path=/; HttpOnly; Secure; SameSite=Lax" }
        );
      }
      throw new Error(`unexpected url ${url}`);
    };
    const client = new AccountClient({
      baseUrl: "https://anyq.site",
      publicKey: { "account-v1": accountPublicKey },
      productCode: "comic_shrimp",
      dataPath: path.join(tempDir, `${expectedReason}.dat`),
      safeStorage: fakeStorage(),
      fetchImpl,
      now: () => nowMs
    });
    const login = await client.login("13600136000", "123456");
    assert.equal(login.success, false);
    assert.match(login.message, new RegExp(expectedReason));
  }

  const validLicense = createSignedAccount({ privateKey, user, products });
  const fetchImpl = async (url) => {
    if (url.endsWith("/api/auth/login")) {
      return jsonResponse(
        { ok: true, user, products, account_license: validLicense },
        { "set-cookie": "wz_session=wrong-key-token; Path=/; HttpOnly; Secure; SameSite=Lax" }
      );
    }
    throw new Error(`unexpected url ${url}`);
  };
  const client = new AccountClient({
    baseUrl: "https://anyq.site",
    publicKey: { "account-v1": wrongAccountPublicKey },
    productCode: "comic_shrimp",
    dataPath: path.join(tempDir, "wrong-public-key.dat"),
    safeStorage: fakeStorage(),
    fetchImpl,
    now: () => nowMs
  });
  const login = await client.login("13600136000", "123456");
  assert.equal(login.success, false);
  assert.match(login.message, /bad_signature/);
});

test("account client rejects Unicode-escaped duplicate keys and invalid signed time ranges", async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const accountPublicKey = rawPublicKey(publicKey);
  const now = 1_700_000_000;
  const user = { id: 11, phone: "13500135000", role: "regular" };
  const products = [];
  const duplicate = createSignedRawPayload({
    privateKey,
    payloadText: `{"typ":"anyq.account-license.v1","\\u0074yp":"anyq.account-license.v1","iss":"https://anyq.site","aud":"comic_shrimp","issued_at":${now},"signed_until":${now + 600},"user":{"id":11,"phone":"13500135000","role":"regular"},"products":[]}`
  });
  const backwards = createSignedAccount({ privateKey, user, products, now: now + 100, signedUntil: now + 50 });

  for (const [reason, accountLicense] of [["duplicate_key", duplicate], ["invalid_time_range", backwards]]) {
    const client = new AccountClient({
      baseUrl: "https://anyq.site",
      publicKey: { "account-v1": accountPublicKey },
      productCode: "comic_shrimp",
      dataPath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "manjuxia-account-range-")), `${reason}.dat`),
      safeStorage: fakeStorage(),
      fetchImpl: async () => jsonResponse({ ok: true, user, products, account_license: accountLicense }, { "set-cookie": "wz_session=range-token; Path=/; HttpOnly; Secure; SameSite=Lax" }),
      now: () => now * 1000
    });
    const login = await client.login("13500135000", "123456");
    assert.equal(login.success, false);
    assert.match(login.message, new RegExp(reason));
  }
});
