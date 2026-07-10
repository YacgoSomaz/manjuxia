const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { LicenseClient, verifyLicenseDocument } = require("../electron/license-client");

function b64url(value) {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createSignedLicense({ privateKey, productCode = "wanshan", deviceHash = "device-1", expiresAt = 2000, graceUntil = 3000 }) {
  const payload = { license_id: "activation-1", activation_id: "activation-1", product_code: productCode, device_hash: deviceHash, features: ["basic"], issued_at: 1000, expires_at: expiresAt, grace_until: graceUntil };
  const payloadBytes = Buffer.from(JSON.stringify(payload));
  return { alg: "Ed25519", payload: b64url(payloadBytes), signature: b64url(crypto.sign(null, payloadBytes, privateKey)) };
}

function fakeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(value, "utf8"),
    decryptString: (value) => Buffer.from(value).toString("utf8")
  };
}

function unavailableStorage() {
  return {
    isEncryptionAvailable: () => false,
    encryptString: (value) => Buffer.from(value, "utf8"),
    decryptString: (value) => Buffer.from(value).toString("utf8")
  };
}

test("verifies a signed license document and rejects tampering", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const rawPublic = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
  const license = createSignedLicense({ privateKey });
  assert.equal(verifyLicenseDocument(license, { publicKey: rawPublic, productCode: "wanshan", deviceHash: "device-1", now: 1500 }).ok, true);
  const tampered = { ...license, payload: license.payload.slice(0, -1) + "A" };
  assert.equal(verifyLicenseDocument(tampered, { publicKey: rawPublic, productCode: "wanshan", deviceHash: "device-1", now: 1500 }).ok, false);
});

test("rejects wrong product, device, and expired grace window", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const rawPublic = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
  const license = createSignedLicense({ privateKey, expiresAt: 2000, graceUntil: 2100 });
  assert.equal(verifyLicenseDocument(license, { publicKey: rawPublic, productCode: "other", deviceHash: "device-1", now: 1500 }).reason, "product_mismatch");
  assert.equal(verifyLicenseDocument(license, { publicKey: rawPublic, productCode: "wanshan", deviceHash: "device-2", now: 1500 }).reason, "device_mismatch");
  assert.equal(verifyLicenseDocument(license, { publicKey: rawPublic, productCode: "wanshan", deviceHash: "device-1", now: 2200 }).reason, "expired");
});

test("activates through the existing API and stores encrypted state", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wanshan-license-"));
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const rawPublic = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
  const license = createSignedLicense({ privateKey, expiresAt: Math.floor(Date.now() / 1000) + 3600, graceUntil: Math.floor(Date.now() / 1000) + 7200 });
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ license, activation_id: "activation-1", refresh_token: "refresh-token-123456" }) };
  };
  const client = new LicenseClient({ baseUrl: "https://license.example", publicKey: rawPublic, productCode: "wanshan", deviceHash: "device-1", appVersion: "1.0.0", dataPath: path.join(tempDir, "license.dat"), safeStorage: fakeStorage(), fetchImpl });
  const result = await client.activate("LRX-TEST");
  assert.equal(result.success, true);
  assert.equal(calls[0].url, "https://license.example/v1/activate");
  assert.equal(JSON.parse(calls[0].options.body).card_key, "LRX-TEST");
  assert.equal(fs.existsSync(path.join(tempDir, "license.dat")), true);
  assert.equal((await client.verify()).ok, true);
});

test("does not consume a card when encrypted local storage is unavailable", async () => {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  const rawPublic = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64url");
  let called = false;
  const client = new LicenseClient({
    baseUrl: "https://license.example",
    publicKey: rawPublic,
    productCode: "wanshan",
    deviceHash: "device-1",
    appVersion: "1.0.0",
    dataPath: path.join(os.tmpdir(), "unused-license.dat"),
    safeStorage: unavailableStorage(),
    fetchImpl: async () => {
      called = true;
      throw new Error("should not be called");
    }
  });
  const result = await client.activate("LRX-TEST");
  assert.equal(result.success, false);
  assert.equal(called, false);
});
