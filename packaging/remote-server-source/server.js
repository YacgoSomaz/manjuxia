require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { sendAccountSnapshotJson } = require("./account-cache-policy");
const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const OpenApi = require('@alicloud/openapi-client');
const Dypnsapi20170525 = require('@alicloud/dypnsapi20170525');
const {
  getWechatConfig,
  createNativeOrder,
  decryptResource,
  getPlatformPublicKey,
  verifySignature,
} = require('./wechat');
const { resolveOrderAmountCents } = require('./payment-pricing');
const {
  PRODUCT_IDS,
  ReleaseContractError,
  normalizeRelease,
  signReleaseEnvelope,
} = require('./release-contract');
const {
  buildReleaseObject,
  createOssSignedUrl,
  readOssUploadConfig,
} = require('./oss-upload-policy');
const { verifyPassword } = require('./admin-console-auth');
const { renderAdminReleasePage } = require('./admin-release-page');
const { ReleaseEventHub } = require('./release-events');
const {
  RETENTION_POLICY,
  ensureRetentionSchema,
  getRetentionSnapshot,
  runRetentionSweep,
} = require('./release-retention');
const { buildMembershipSummary } = require('./account-membership');
const {
  AdminMembershipError,
  computeGrantedExpiry,
  normalizeMembershipGrant,
  normalizeMembershipExpiry,
  normalizeMembershipPhone,
} = require('./admin-membership');
const {
  OfficialAiError,
  ensureOfficialAiSchema,
  listTaskRules,
  readOfficialAiConfig,
  publicOfficialAiConfig,
  saveOfficialAiModelConfig,
  publicTaskRule,
  updateTaskRule,
  resolveAiJob,
  resolveOfficialVideoJob,
  officialConfigForTask,
  activeProductForTask,
  reserveAiJob,
  settleAiJob,
  refundAiJob,
  refundStaleAiJobs,
  cleanupExpiredAiJobs,
  adjustCredits,
  getCreditLedger,
  callOfficialAi,
  callOfficialImage,
  buildSafeOfficialImagePrompt,
  saveAiJobAsset,
  listAiJobAssets,
  publicJob,
} = require('./official-ai-service');

const app = express();
const PORT = Number(process.env.PORT || 3300);
const DATA_DIR = path.resolve(process.env.DB_FILE ? path.dirname(process.env.DB_FILE) : path.join(__dirname, 'data'));
const DB_FILE = path.resolve(process.env.DB_FILE || path.join(__dirname, 'data', 'recharge.sqlite'));
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'wz_session';
const SESSION_TTL_MS = Math.max(1, Number(process.env.SESSION_TTL_DAYS || 7)) * 24 * 60 * 60 * 1000;
const PAYMENT_PLANS = Object.freeze({
  replay_shrimp: {
    name: '复盘虾 + 运营杀招教程', amountCents: 249900, durationDays: 365, energy: 0,
    entitlements: ['livewatch'],
    featureEntitlements: ['live_monitor', 'ai_replay', 'short_video_ai', 'lead_radar', 'export'],
  },
  comic_shrimp: {
    name: '漫剧虾 + 漫剧精品课程', amountCents: 79900, durationDays: 365, energy: 0,
    entitlements: ['comic_course'], featureEntitlements: [],
  },
  operation_shrimp: {
    name: '运营虾', amountCents: 79900, durationDays: 365, energy: 0,
    entitlements: ['operation_course'], featureEntitlements: [],
  },
});
// Credit top-ups are intentionally separate from membership plans.  A paid
// credit order must never create, extend, or otherwise alter a product
// membership record.
const CREDIT_TOPUP_PLANS = Object.freeze({
  credit_1: { name: '测试充值 1 积分', amountCents: 10, energy: 1 },
  credit_500: { name: '充值 500 积分', amountCents: 5000, energy: 500 },
  credit_2000: { name: '充值 2000 积分', amountCents: 20000, energy: 2000 },
  credit_10000: { name: '充值 10000 积分', amountCents: 100000, energy: 10000 },
});

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
ensureRetentionSchema(db);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_login_at TEXT NOT NULL,
    energy_balance INTEGER NOT NULL DEFAULT 0,
    membership_expires_at TEXT,
    membership_plan TEXT,
    last_recharge_at TEXT,
    role TEXT NOT NULL DEFAULT 'regular',
    entitlements_json TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS web_handoffs (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    consumed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS web_handoffs_expires_at_idx ON web_handoffs(expires_at);
  CREATE TABLE IF NOT EXISTS recharge_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    plan_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    energy INTEGER NOT NULL,
    order_kind TEXT NOT NULL DEFAULT 'membership',
    status TEXT NOT NULL DEFAULT 'PENDING',
    transaction_id TEXT,
    code_url TEXT,
    created_at TEXT NOT NULL,
    paid_at TEXT,
    notified_at TEXT,
    last_error TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS recharge_orders_user_idx ON recharge_orders(user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS user_products (
    user_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    entitlements_json TEXT NOT NULL DEFAULT '[]',
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS user_products_user_expiry_idx ON user_products(user_id, expires_at DESC);
  CREATE TABLE IF NOT EXISTS product_releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    version TEXT NOT NULL,
    min_supported_version TEXT NOT NULL,
    mandatory INTEGER NOT NULL DEFAULT 0,
    installer_url TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT,
    revoked_at TEXT,
    UNIQUE(product_id, version),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
  );
  CREATE INDEX IF NOT EXISTS product_releases_latest_idx
    ON product_releases(product_id, status, published_at DESC, id DESC);
  CREATE TABLE IF NOT EXISTS admin_product_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    previous_expires_at TEXT,
    expires_at TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'grant',
    created_at TEXT NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS admin_product_grants_target_idx
    ON admin_product_grants(target_user_id, created_at DESC, id DESC);
`);

function ensureUserColumn(name, definition) {
  const columns = db.prepare('PRAGMA table_info(users)').all();
  if (!columns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
  }
}

ensureUserColumn('energy_balance', 'INTEGER NOT NULL DEFAULT 0');
ensureUserColumn('membership_expires_at', 'TEXT');
ensureUserColumn('membership_plan', 'TEXT');
ensureUserColumn('last_recharge_at', 'TEXT');
ensureUserColumn('role', "TEXT NOT NULL DEFAULT 'regular'");
ensureUserColumn('entitlements_json', "TEXT NOT NULL DEFAULT '[]'");
ensureOfficialAiSchema(db);
refundStaleAiJobs(db);
cleanupExpiredAiJobs(db);

function ensureAdminProductGrantColumn(name, definition) {
  const columns = db.prepare('PRAGMA table_info(admin_product_grants)').all();
  if (!columns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE admin_product_grants ADD COLUMN ${name} ${definition}`);
  }
}

ensureAdminProductGrantColumn('action', "TEXT NOT NULL DEFAULT 'grant'");

function ensureRechargeOrderColumn(name, definition) {
  const columns = db.prepare('PRAGMA table_info(recharge_orders)').all();
  if (!columns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE recharge_orders ADD COLUMN ${name} ${definition}`);
  }
}

ensureRechargeOrderColumn('entitlements_json', "TEXT NOT NULL DEFAULT '[]'");
ensureRechargeOrderColumn('order_kind', "TEXT NOT NULL DEFAULT 'membership'");

function enforceSessionTtl() {
  const sessions = db.prepare('SELECT token_hash, created_at, expires_at FROM sessions').all();
  const update = db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?');
  const apply = db.transaction(() => {
    for (const session of sessions) {
      const createdAt = Date.parse(session.created_at);
      if (!Number.isFinite(createdAt)) continue;
      const maxExpiresAt = new Date(createdAt + SESSION_TTL_MS).toISOString();
      if (Date.parse(session.expires_at) > Date.parse(maxExpiresAt)) {
        update.run(maxExpiresAt, session.token_hash);
      }
    }
  });
  apply();
}

enforceSessionTtl();

const sendCodeLimiter = new Map();
const loginLimiter = new Map();
const handoffLimiter = new Map();
const releaseLookupLimiter = new Map();
const releaseEventConnectionsByIp = new Map();
const releaseEventHub = new ReleaseEventHub({ maxSubscribers: 5000 });
const adminConsoleLimiter = new Map();
const adminConsoleUnlocks = new Map();
const officialAiRequestLimiter = new Map();
const SMS_CONFIG_KEYS = [
  'ALIBABA_CLOUD_ACCESS_KEY_ID',
  'ALIBABA_CLOUD_ACCESS_KEY_SECRET',
  'SMS_SIGN_NAME',
  'SMS_TEMPLATE_CODE',
];

function parseEntitlementList(raw) {
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))] : [];
  } catch {
    return [];
  }
}

function accountProducts(userId, serverTime) {
  const current = Date.parse(serverTime);
  const rows = db.prepare(`
    SELECT product_id, product_name, price_cents, duration_days, entitlements_json, expires_at
    FROM user_products WHERE user_id = ? ORDER BY expires_at DESC, product_id ASC
  `).all(userId);
  return rows.map((row) => ({
    product_id: row.product_id,
    name: row.product_name,
    price_cents: Number(row.price_cents || 0),
    duration_days: Number(row.duration_days || 0),
    status: Date.parse(row.expires_at) > current ? 'active' : 'expired',
    expires_at: row.expires_at,
    entitlements: parseEntitlementList(row.entitlements_json),
  }));
}

function publicUser(row) {
  if (!row) return null;
  const serverTime = nowIso();
  const serverNow = Date.parse(serverTime);
  const products = accountProducts(row.id, serverTime);
  const activeProducts = products.filter((product) => product.status === 'active');
  const legacyEntitlements = parseEntitlementList(row.entitlements_json);
  const productEntitlements = activeProducts.flatMap((product) => product.entitlements);
  const featureEntitlements = activeProducts.flatMap((product) => PAYMENT_PLANS[product.product_id]?.featureEntitlements || []);
  const entitlements = [...new Set([...legacyEntitlements, ...productEntitlements, ...featureEntitlements])];
  const replayProduct = activeProducts.find((product) => product.product_id === 'replay_shrimp');
  const legacyExpiresAt = Date.parse(row.membership_expires_at || '');
  const legacyMember = Number.isFinite(legacyExpiresAt) && legacyExpiresAt > serverNow;
  const isMember = Boolean(replayProduct) || legacyMember;
  const energy = Number(row.energy_balance || 0);
  const membershipExpiry = replayProduct?.expires_at || (legacyMember ? row.membership_expires_at : null);
  const membershipPlan = replayProduct?.name || (legacyMember ? row.membership_plan : null);
  const remainingDays = Date.parse(membershipExpiry || '') > serverNow
    ? Math.max(0, Math.ceil((Date.parse(membershipExpiry) - serverNow) / (24 * 60 * 60 * 1000))) : 0;
  return {
    id: row.id,
    phone: row.phone,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    role: String(row.role || 'regular'),
    energy_balance: energy,
    membership_expires_at: membershipExpiry,
    membership_plan: membershipPlan,
    entitlements,
    products,
    is_member: isMember,
    member_level: replayProduct ? 'replay_shrimp' : (legacyMember ? 'legacy_livewatch' : 'free'),
    features: entitlements,
    server_time: serverTime,
    remaining_days: remainingDays,
    need_recharge: !isMember,
    membership_status: isMember ? 'active' : (products.length || row.membership_expires_at ? 'expired' : 'unopened'),
  };
}


function decodeBase64Url(value) {
  return Buffer.from(String(value || ''), 'base64url');
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

let accountSigningPrivateKey = null;
function getAccountSigningPrivateKey() {
  if (accountSigningPrivateKey) return accountSigningPrivateKey;
  const raw = String(process.env.ACCOUNT_SIGNING_PRIVATE_KEY || '').trim();
  if (!raw) {
    const error = new Error('ACCOUNT_SIGNING_PRIVATE_KEY missing');
    error.code = 'ACCOUNT_SIGNING_NOT_CONFIGURED';
    throw error;
  }
  accountSigningPrivateKey = crypto.createPrivateKey({ key: decodeBase64Url(raw), format: 'der', type: 'pkcs8' });
  return accountSigningPrivateKey;
}

const ACCOUNT_LICENSE_SCHEMA = 'anyq.account-license.v1';
const ACCOUNT_LICENSE_KEY_ID = process.env.ACCOUNT_LICENSE_KEY_ID || 'account-v1';
const ACCOUNT_LICENSE_ISSUER = 'https://anyq.site';

let releaseSigningPrivateKey = null;
function getReleaseSigningPrivateKey() {
  if (releaseSigningPrivateKey) return releaseSigningPrivateKey;
  const raw = String(process.env.UPDATE_SIGNING_PRIVATE_KEY || '').trim();
  if (!raw) {
    const error = new Error('UPDATE_SIGNING_PRIVATE_KEY missing');
    error.code = 'UPDATE_SIGNING_NOT_CONFIGURED';
    throw error;
  }
  releaseSigningPrivateKey = crypto.createPrivateKey({ key: decodeBase64Url(raw), format: 'der', type: 'pkcs8' });
  return releaseSigningPrivateKey;
}

const RELEASE_SIGNING_KEY_ID = process.env.UPDATE_SIGNING_KEY_ID || 'update-v1';
const RELEASE_ISSUER = 'https://anyq.site';

function releaseProductId(value) {
  const productId = String(value || '').trim();
  if (!PRODUCT_IDS.has(productId)) {
    const error = new Error('未知更新产品');
    error.code = 'UPDATE_PRODUCT_INVALID';
    throw error;
  }
  return productId;
}

function releaseFromRow(row) {
  return {
    product_id: row.product_id,
    version: row.version,
    min_supported_version: row.min_supported_version,
    mandatory: Number(row.mandatory) === 1,
    installer_url: row.installer_url,
    sha256: row.sha256,
    size_bytes: Number(row.size_bytes),
    notes: row.notes || '',
    published_at: row.published_at,
  };
}

function signPublishedRelease(row) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(60, Math.min(86_400, parseInteger(process.env.UPDATE_RELEASE_TTL_SECONDS, 3_600)));
  return signReleaseEnvelope({
    release: releaseFromRow(row),
    privateKey: getReleaseSigningPrivateKey(),
    issuer: RELEASE_ISSUER,
    keyId: RELEASE_SIGNING_KEY_ID,
    issuedAt: now,
    signedUntil: now + ttl,
  });
}

function canonicalReleaseObject(productId, version) {
  return buildReleaseObject(productId, version, process.env.OSS_UPLOAD_PUBLIC_BASE || 'https://download.anyq.site');
}

function ensureCanonicalReleaseUrl(release) {
  const expected = canonicalReleaseObject(release.product_id, release.version);
  if (release.installer_url !== expected.installer_url) {
    throw new ReleaseContractError('安装包地址必须使用该产品的官方版本路径');
  }
  return expected;
}

async function verifyOssReleaseObject({ config, objectKey }) {
  const expiresAt = Math.floor(Date.now() / 1000) + 120;
  const signedUrl = createOssSignedUrl({ config, method: 'GET', objectKey, expiresAt });
  const response = await fetch(signedUrl, { redirect: 'error' });
  if (!response.ok || !response.body) {
    const error = new Error('OSS 对象不存在或无法读取');
    error.code = 'OSS_OBJECT_UNAVAILABLE';
    throw error;
  }
  const advertisedBytes = Number(response.headers.get('content-length') || 0);
  if (advertisedBytes && (!Number.isSafeInteger(advertisedBytes) || advertisedBytes > config.maxSizeBytes)) {
    const error = new Error('OSS 安装包大小无效');
    error.code = 'OSS_OBJECT_SIZE_INVALID';
    throw error;
  }
  const digest = crypto.createHash('sha256');
  let sizeBytes = 0;
  for await (const chunk of response.body) {
    sizeBytes += chunk.length;
    if (sizeBytes > config.maxSizeBytes) {
      const error = new Error('OSS 安装包超过允许大小');
      error.code = 'OSS_OBJECT_TOO_LARGE';
      throw error;
    }
    digest.update(chunk);
  }
  if (sizeBytes < 1 || (advertisedBytes && sizeBytes !== advertisedBytes)) {
    const error = new Error('OSS 安装包读取不完整');
    error.code = 'OSS_OBJECT_TRUNCATED';
    throw error;
  }
  return { sha256: digest.digest('hex'), size_bytes: sizeBytes };
}

function requestAudience(req) {
  // Audience only identifies the compiled client receiving this snapshot. It
  // never changes the user's purchased products, and must not be read from a
  // mutable JSON body used by a browser or payment request.
  const requested = String(req.headers['x-product-code'] || 'replay_shrimp').trim();
  if (PAYMENT_PLANS[requested]) return requested;
  const error = new Error('未知产品受众');
  error.code = 'ACCOUNT_AUDIENCE_INVALID';
  throw error;
}

function publicAccountUser(account) {
  return {
    id: account.id,
    phone: account.phone,
    role: String(account.role || 'regular'),
  };
}

function signAccountLicense(req, publicAccount) {
  const ttl = Math.max(60, Math.min(600, parseInteger(process.env.ACCOUNT_LICENSE_TTL_SECONDS, 600)));
  const issuedAt = Math.floor(Date.now() / 1000);
  const user = publicAccountUser(publicAccount);
  const products = Array.isArray(publicAccount.products) ? publicAccount.products : [];
  const payload = {
    typ: ACCOUNT_LICENSE_SCHEMA,
    iss: ACCOUNT_LICENSE_ISSUER,
    aud: requestAudience(req),
    issued_at: issuedAt,
    signed_until: issuedAt + ttl,
    server_time: publicAccount.server_time || nowIso(),
    user,
    products,
  };
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = crypto.sign(null, payloadBytes, getAccountSigningPrivateKey());
  return {
    schema: ACCOUNT_LICENSE_SCHEMA,
    alg: 'Ed25519',
    key_id: ACCOUNT_LICENSE_KEY_ID,
    payload: encodeBase64Url(payloadBytes),
    signature: encodeBase64Url(signature),
  };
}

function accountResponse(req, publicAccount, extras = {}) {
  const products = Array.isArray(publicAccount.products) ? publicAccount.products : [];
  return {
    ok: true,
    user: publicAccountUser(publicAccount),
    products,
    membership: buildMembershipSummary(products, publicAccount.server_time || nowIso()),
    server_time: publicAccount.server_time || nowIso(),
    account_license: signAccountLicense(req, publicAccount),
    ...extras,
  };
}

function logAccountMeDiagnostic(req, publicAccount, resultCode, accountLicense) {
  const requestedProduct = String(req.headers['x-product-code'] || '').trim();
  const productId = PAYMENT_PLANS[requestedProduct] ? requestedProduct : 'unknown';
  const product = Array.isArray(publicAccount?.products)
    ? publicAccount.products.find((item) => item && item.product_id === productId)
    : null;
  const requiredEntitlements = PAYMENT_PLANS[productId]?.entitlements || [];
  let issuedAt = null;
  let signedUntil = null;
  try {
    if (accountLicense?.payload) {
      const payload = JSON.parse(Buffer.from(accountLicense.payload, 'base64url').toString('utf8'));
      issuedAt = Number.isSafeInteger(payload.issued_at) ? payload.issued_at : null;
      signedUntil = Number.isSafeInteger(payload.signed_until) ? payload.signed_until : null;
    }
  } catch (_) {
    // Diagnostics must never alter authorization behavior.
  }
  console.info('[AUTH_ME]', JSON.stringify({
    product_id: productId,
    active_entitlement: Boolean(product && product.status === 'active' && requiredEntitlements.every((item) => product.entitlements?.includes(item))),
    issued_at: issuedAt,
    signed_until: signedUntil,
    result_code: String(resultCode || 'unknown'),
  }));
}

function nowIso() {
  return new Date().toISOString();
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function jsonResponse(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizePhone(phone) {
  return String(phone || '').trim().replace(/^\+86/, '').replace(/^86(?=1\d{10}$)/, '');
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function consumeRateLimit(map, key, intervalMs, max = 1) {
  const now = Date.now();
  const entries = (map.get(key) || []).filter((timestamp) => now - timestamp < intervalMs);
  if (entries.length >= max) {
    map.set(key, entries);
    return false;
  }
  entries.push(now);
  map.set(key, entries);
  return true;
}

function getSmsConfig() {
  const missing = SMS_CONFIG_KEYS.filter((key) => !process.env[key]);
  let templateParam;
  try {
    templateParam = JSON.parse(process.env.SMS_TEMPLATE_PARAM || '{"code":"##code##","min":"5"}');
  } catch {
    throw new Error('SMS_TEMPLATE_PARAM must be valid JSON');
  }
  return {
    missing,
    endpoint: process.env.ALIBABA_CLOUD_DYPNS_ENDPOINT || 'dypnsapi.aliyuncs.com',
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    schemeName: process.env.SMS_SCHEME_NAME || undefined,
    countryCode: process.env.SMS_COUNTRY_CODE || '86',
    signName: process.env.SMS_SIGN_NAME,
    templateCode: process.env.SMS_TEMPLATE_CODE,
    templateParam,
    codeLength: parseInteger(process.env.SMS_CODE_LENGTH, 6),
    validTime: parseInteger(process.env.SMS_VALID_TIME, 300),
    duplicatePolicy: parseInteger(process.env.SMS_DUPLICATE_POLICY, 1),
    interval: parseInteger(process.env.SMS_INTERVAL, 60),
    codeType: parseInteger(process.env.SMS_CODE_TYPE, 1),
    returnVerifyCode: parseBoolean(process.env.SMS_RETURN_VERIFY_CODE, false),
    autoRetry: parseInteger(process.env.SMS_AUTO_RETRY, 1),
  };
}

let smsClient;
function getSmsClient(config) {
  if (!config.accessKeyId || !config.accessKeySecret) return null;
  if (!smsClient) {
    const clientConfig = new OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.endpoint,
    });
    const Client = Dypnsapi20170525.default || Dypnsapi20170525;
    smsClient = new Client(clientConfig);
  }
  return smsClient;
}

function responseBody(response) {
  return response && (response.body || response);
}

function apiField(object, upperName, lowerName) {
  return object?.[upperName] ?? object?.[lowerName];
}

async function sendSms(phone) {
  const config = getSmsConfig();
  if (config.missing.length) {
    const error = new Error('SMS provider is not configured');
    error.code = 'SMS_NOT_CONFIGURED';
    throw error;
  }
  const client = getSmsClient(config);
  const Request = Dypnsapi20170525.SendSmsVerifyCodeRequest;
  const request = new Request({
    schemeName: config.schemeName,
    countryCode: config.countryCode,
    phoneNumber: phone,
    signName: config.signName,
    templateCode: config.templateCode,
    templateParam: JSON.stringify(config.templateParam),
    codeLength: config.codeLength,
    validTime: config.validTime,
    duplicatePolicy: config.duplicatePolicy,
    interval: config.interval,
    codeType: config.codeType,
    returnVerifyCode: config.returnVerifyCode,
    autoRetry: config.autoRetry,
  });
  const response = responseBody(await client.sendSmsVerifyCode(request));
  const responseCode = apiField(response, 'Code', 'code');
  const responseMessage = apiField(response, 'Message', 'message');
  if (!response || responseCode !== 'OK') {
    const error = new Error(responseMessage || 'SMS send failed');
    error.code = responseCode || 'SMS_SEND_FAILED';
    throw error;
  }
  return response;
}

async function verifySms(phone, code) {
  const config = getSmsConfig();
  if (config.missing.length) {
    const error = new Error('SMS provider is not configured');
    error.code = 'SMS_NOT_CONFIGURED';
    throw error;
  }
  const client = getSmsClient(config);
  const Request = Dypnsapi20170525.CheckSmsVerifyCodeRequest;
  const request = new Request({
    schemeName: config.schemeName,
    countryCode: config.countryCode,
    phoneNumber: phone,
    verifyCode: code,
  });
  const response = responseBody(await client.checkSmsVerifyCode(request));
  const responseCode = apiField(response, 'Code', 'code');
  const model = apiField(response, 'Model', 'model');
  const verifyResult = apiField(model, 'VerifyResult', 'verifyResult');
  return {
    accepted: responseCode === 'OK' && verifyResult === 'PASS',
    response,
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), userId, expiresAt, createdAt);
  return { token, expiresAt };
}

function setSessionCookie(res, token, expiresAt) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Expires=${new Date(expiresAt).toUTCString()}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (!parseBoolean(process.env.ALLOW_INSECURE_COOKIES, false)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  const item = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function userFromRequest(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  const row = db.prepare(`
    SELECT users.id, users.phone, users.created_at, users.last_login_at,
      users.energy_balance, users.membership_expires_at, users.membership_plan, users.role, users.entitlements_json
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashToken(token), nowIso());
  return publicUser(row);
}

function requireUser(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return jsonResponse(res, 401, { ok: false, error: '请先登录' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return jsonResponse(res, 403, { ok: false, error: '需要管理员权限' });
  next();
}

function adminConsoleSessionKey(req) {
  const token = readCookie(req, COOKIE_NAME);
  return token ? hashToken(token) : '';
}

function adminConsoleTtlMs() {
  const minutes = Math.max(5, Math.min(60, parseInteger(process.env.ADMIN_CONSOLE_TTL_MINUTES, 20)));
  return minutes * 60 * 1000;
}

function requireAdminConsole(req, res, next) {
  const key = adminConsoleSessionKey(req);
  const expiresAt = key ? Number(adminConsoleUnlocks.get(key) || 0) : 0;
  if (!key || expiresAt <= Date.now()) {
    if (key) adminConsoleUnlocks.delete(key);
    return jsonResponse(res, 403, { ok: false, error: '请先输入管理密码' });
  }
  next();
}

function requireSameSiteAdminRequest(req, res, next) {
  const expectedOrigin = String(process.env.PUBLIC_WEB_ORIGIN || 'https://anyq.site').trim().replace(/\/+$/, '');
  const origin = String(req.headers.origin || '').trim().replace(/\/+$/, '');
  if (!origin || origin !== expectedOrigin) {
    return jsonResponse(res, 403, { ok: false, error: '管理员请求来源无效' });
  }
  next();
}

function getWechatReadyConfig() {
  const config = getWechatConfig(__dirname);
  if (config.missing.length) {
    const error = new Error('微信支付配置尚未完成');
    error.code = 'WECHAT_NOT_CONFIGURED';
    error.missing = config.missing;
    throw error;
  }
  return config;
}

function generateOrderNo() {
  return `WZ${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`.slice(0, 32);
}

function settleRechargeOrder(orderNo, transactionId, paidAt) {
  const settle = db.transaction(() => {
    const order = db.prepare('SELECT * FROM recharge_orders WHERE order_no = ?').get(orderNo);
    if (!order) throw new Error('充值订单不存在');
    if (order.status === 'SUCCESS') return order;
    if (order.status !== 'PENDING') throw new Error('充值订单状态不可更新');

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(order.user_id);
    if (!user) throw new Error('充值用户不存在');
    const timestamp = paidAt || nowIso();
    const isCreditTopup = order.order_kind === 'credit_topup';
    if (isCreditTopup) {
      const current = db.prepare('SELECT energy_balance FROM users WHERE id = ?').get(order.user_id);
      const balanceAfter = Number(current?.energy_balance || 0) + Number(order.energy || 0);
      db.prepare('UPDATE users SET energy_balance = ?, last_recharge_at = ? WHERE id = ?')
        .run(balanceAfter, timestamp, order.user_id);
      // This ledger row makes payment-side crediting auditable independently
      // of later official-AI reservation and refund records.
      db.prepare(`
        INSERT INTO ai_credit_ledger
          (user_id, delta, balance_after, reason, status, note, created_at)
        VALUES (?, ?, ?, 'payment_topup', 'settled', ?, ?)
      `).run(order.user_id, Number(order.energy || 0), balanceAfter, order.order_no, timestamp);
    } else {
      const existing = db.prepare('SELECT expires_at FROM user_products WHERE user_id = ? AND product_id = ?')
        .get(order.user_id, order.plan_id);
      const currentExpiry = Date.parse(existing?.expires_at || '');
      const baseTime = Math.max(Date.now(), Number.isFinite(currentExpiry) ? currentExpiry : 0);
      const expiresAt = new Date(baseTime + Number(order.duration_days) * 24 * 60 * 60 * 1000).toISOString();
      const entitlements = parseEntitlementList(order.entitlements_json);
      db.prepare(`
        INSERT INTO user_products
          (user_id, product_id, product_name, price_cents, duration_days, entitlements_json, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, product_id) DO UPDATE SET
          product_name = excluded.product_name,
          price_cents = excluded.price_cents,
          duration_days = excluded.duration_days,
          entitlements_json = excluded.entitlements_json,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `).run(order.user_id, order.plan_id, order.plan_name, order.amount_cents, order.duration_days,
        JSON.stringify(entitlements), expiresAt, timestamp, timestamp);
      db.prepare('UPDATE users SET energy_balance = COALESCE(energy_balance, 0) + ?, last_recharge_at = ? WHERE id = ?')
        .run(Number(order.energy || 0), timestamp, order.user_id);
    }
    db.prepare(`
      UPDATE recharge_orders
      SET status = 'SUCCESS', transaction_id = ?, paid_at = ?, notified_at = ?, last_error = NULL
      WHERE order_no = ?
    `).run(transactionId || null, timestamp, nowIso(), orderNo);
    return db.prepare('SELECT * FROM recharge_orders WHERE order_no = ?').get(orderNo);
  });
  return settle();
}


app.disable('x-powered-by');
app.set('trust proxy', 1);
// Official language jobs can carry a full script plus an extraction template.
// Chinese UTF-8 text reaches the old 32 KB parser ceiling long before the
// documented 18,000-character task limit, so the request was rejected before
// the job service could run.  Keep a bounded limit that covers the contract.
app.use(express.json({
  limit: '1mb',
  verify(req, res, buffer) {
    req.rawBody = Buffer.from(buffer);
  },
}));

function sendAccountPage(res, script) {
  const nonce = crypto.randomBytes(18).toString('base64');
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; connect-src 'self'; img-src 'self' data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; form-action 'self'`,
  });
  return res.type('html').send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>漫剧虾 - 账户中心</title><style nonce="${nonce}">body{margin:0;background:#f5f7fb;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}.card{box-sizing:border-box;width:min(680px,calc(100% - 32px));margin:64px auto;background:#fff;border:1px solid #e6ebf3;border-radius:16px;padding:30px;box-shadow:0 20px 48px rgba(30,55,90,.10)}h1{margin:0 0 8px;font-size:24px}.muted{color:#6f7d91;line-height:1.7}.status{margin:22px 0;padding:15px;border-radius:10px;background:#f7f9fd}.row{display:flex;justify-content:space-between;gap:18px;padding:10px 0;border-bottom:1px solid #edf0f5}.row:last-child{border:0}.label{color:#718096}.value{font-weight:650;text-align:right;word-break:break-all}.notice{margin-top:20px;padding:13px 14px;border-radius:10px;background:#fff8e8;color:#8a6115;line-height:1.7}.error{color:#c23d3d}.hidden{display:none}.topup{margin-top:24px;border-top:1px solid #edf0f4;padding-top:22px}.topup h2{margin:0 0 7px;font-size:18px}.topup p{margin:0 0 14px;color:#6f7d91;font-size:13px;line-height:1.6}.plans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.plan{border:1px solid #d8e3f2;border-radius:11px;background:#fbfdff;padding:14px;text-align:left;cursor:pointer;color:#172033}.plan:hover,.plan:focus{border-color:#287df5;box-shadow:0 0 0 3px rgba(40,125,245,.12);outline:0}.plan strong{display:block;font-size:18px}.plan span{display:block;margin-top:5px;color:#52647d;font-size:13px}.plan em{display:block;margin-top:8px;color:#167a50;font-size:14px;font-style:normal;font-weight:700}.pay{margin-top:16px;padding:16px;border-radius:11px;background:#f7f9fd}.pay img{display:block;width:220px;height:220px;max-width:100%;margin:12px auto 4px}.pay button{display:block;margin:10px auto 0;border:0;border-radius:8px;background:#286cf5;color:#fff;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer}@media(max-width:520px){.card{margin:24px auto;padding:22px}.plans{grid-template-columns:1fr}}</style></head><body><main class="card"><h1>漫剧虾账户中心</h1><p id="subtitle" class="muted">正在确认登录状态…</p><section id="account" class="status hidden"><div class="row"><span class="label">手机号</span><span id="phone" class="value"></span></div><div class="row"><span class="label">会员状态</span><span id="level" class="value"></span></div><div class="row"><span class="label">已开通软件</span><span id="products" class="value"></span></div><div class="row"><span class="label">软件到期时间</span><span id="expiry" class="value"></span></div><div class="row"><span class="label">已开通权益</span><span id="entitlements" class="value"></span></div></section><div id="notice" class="notice hidden"></div></main><script nonce="${nonce}">${script}</script></body></html>`);
}

function sendReleaseAdminPage(res) {
  const nonce = crypto.randomBytes(18).toString('base64');
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; connect-src 'self' https://software-update0012.oss-cn-guangzhou.aliyuncs.com; img-src 'self' data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; form-action 'self'`,
  });
  return res.type('html').send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>版本发布后台</title><style nonce="${nonce}">:root{color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0,#e6efff,transparent 31rem),#f5f7fb}.shell{width:min(1100px,calc(100% - 32px));margin:40px auto}.hero{display:flex;justify-content:space-between;gap:22px;align-items:flex-end;margin-bottom:24px}.eyebrow{color:#286cf5;font-size:12px;font-weight:800;letter-spacing:.13em}.hero h1{margin:7px 0;font-size:30px}.muted{margin:0;color:#6b7890;line-height:1.6}.grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px}.card{background:#fff;border:1px solid #e5eaf3;border-radius:18px;padding:24px;box-shadow:0 16px 40px rgba(37,59,92,.07)}h2{font-size:17px;margin:0 0 16px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}label{display:grid;gap:7px;color:#46536a;font-size:13px;font-weight:700}.wide{grid-column:1/-1}input,select,textarea{width:100%;border:1px solid #d9e1ed;border-radius:10px;background:#fbfcff;color:#172033;padding:11px 12px;font:inherit}textarea{min-height:76px;resize:vertical}input:focus,select:focus,textarea:focus{outline:2px solid #b9d1ff;border-color:#5d94ff}.actions{display:flex;gap:10px;align-items:center;margin-top:18px;flex-wrap:wrap}button{border:0;border-radius:10px;padding:11px 15px;font:inherit;font-weight:750;cursor:pointer;background:#286cf5;color:#fff}button.secondary{background:#eef3fb;color:#31527d}button.danger{background:#fff0f0;color:#bd3c48}button:disabled{opacity:.5;cursor:not-allowed}.status{min-height:21px;margin-top:14px;color:#50617a;font-size:13px;line-height:1.55}.status.error{color:#c13f4d}.status.ok{color:#14865a}.meta{display:grid;gap:12px}.meta div{padding:12px;border-radius:11px;background:#f7f9fd}.meta span{display:block;color:#718096;font-size:12px;margin-bottom:4px}.meta strong{font-size:14px;word-break:break-all}.table{width:100%;border-collapse:collapse;font-size:13px}.table th,.table td{padding:12px 8px;border-bottom:1px solid #edf0f4;text-align:left;vertical-align:top}.table th{color:#718096;font-size:12px}.pill{display:inline-block;padding:3px 8px;border-radius:99px;background:#edf3ff;color:#286cf5;font-size:12px;font-weight:700}.release-actions{display:flex;gap:7px;flex-wrap:wrap}.release-actions button{padding:6px 8px;font-size:12px}@media(max-width:800px){.grid{grid-template-columns:1fr}.shell{margin:24px auto}.hero{display:block}.fields{grid-template-columns:1fr}}</style></head><body><main class="shell"><header class="hero"><div><div class="eyebrow">ANYQ RELEASE CONTROL</div><h1>安装包发布后台</h1><p class="muted">上传到官方 OSS 后由服务器复核文件大小与 SHA-256，再签名发布更新。</p></div><p id="account" class="muted">正在确认管理员身份…</p></header><section class="grid"><section class="card"><h2>上传并创建更新草稿</h2><div class="fields"><label>产品<select id="product"><option value="replay_shrimp">复盘虾</option><option value="comic_shrimp">漫剧虾</option><option value="operation_shrimp">运营虾</option></select></label><label>版本号<input id="version" placeholder="例如 1.0.14"></label><label class="wide">安装包<input id="installer" type="file" accept=".exe,application/vnd.microsoft.portable-executable"></label><label>最低支持版本<input id="minVersion" placeholder="默认与版本号相同"></label><label>更新方式<select id="mandatory"><option value="false">普通更新（允许稍后安装）</option><option value="true">强制更新（阻止旧版启动）</option></select></label><label class="wide">更新说明<textarea id="notes" maxlength="4000" placeholder="例如：修复登录、评论采集与安装覆盖问题"></textarea></label></div><div class="actions"><button id="upload">上传、复核并创建草稿</button><button class="secondary" id="reload" type="button">刷新版本列表</button></div><p id="status" class="status">上传为 OSS 直传，密钥不会进入浏览器或安装包。</p></section><aside class="card"><h2>本次发布校验</h2><div class="meta"><div><span>官方对象路径</span><strong id="objectPath">填写产品和版本后生成</strong></div><div><span>SHA-256</span><strong id="sha">等待服务器复核</strong></div><div><span>文件大小</span><strong id="bytes">等待服务器复核</strong></div></div></aside></section><section class="card" style="margin-top:20px"><h2>发布记录</h2><table class="table"><thead><tr><th>产品 / 版本</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody id="releases"><tr><td colspan="4" class="muted">正在加载…</td></tr></tbody></table></section></main><script nonce="${nonce}">(() => { const $ = (id) => document.getElementById(id); const status = $('status'); const setStatus = (text, kind) => { status.textContent = text; status.className = 'status' + (kind ? ' ' + kind : ''); }; const request = async (url, method, body) => { const response = await fetch(url,{method:method || 'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}); const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw new Error(data.error || '请求失败'); return data; }; const label = {replay_shrimp:'复盘虾',comic_shrimp:'漫剧虾',operation_shrimp:'运营虾'}; const bytes = (n) => n ? (n / 1024 / 1024).toFixed(2) + ' MB' : '—'; let verified = null; const load = async () => { const data = await request('/api/v1/admin/releases'); const target = $('releases'); target.textContent = ''; if (!data.releases.length) { const row=document.createElement('tr');const cell=document.createElement('td');cell.colSpan=4;cell.className='muted';cell.textContent='还没有发布记录';row.append(cell);target.append(row);return; } data.releases.forEach((item) => { const row=document.createElement('tr'); const a=document.createElement('td');a.textContent=(label[item.product_id] || item.product_id) + ' / ' + item.version; const b=document.createElement('td');const p=document.createElement('span');p.className='pill';p.textContent=item.status;b.append(p); const c=document.createElement('td');c.textContent=item.updated_at || item.created_at; const d=document.createElement('td');d.className='release-actions'; if(item.status==='draft'){const publish=document.createElement('button');publish.textContent='签名发布';publish.onclick=async()=>{try{await request('/api/v1/admin/releases/'+item.id+'/publish','POST',{});setStatus('已签名发布 '+item.version,'ok');await load();}catch(e){setStatus(e.message,'error');}};d.append(publish);} if(item.status==='draft'||item.status==='published'){const revoke=document.createElement('button');revoke.className='danger';revoke.textContent='撤回';revoke.onclick=async()=>{if(!confirm('确认撤回 '+item.version+' 吗？'))return;try{await request('/api/v1/admin/releases/'+item.id+'/revoke','POST',{});setStatus('已撤回 '+item.version,'ok');await load();}catch(e){setStatus(e.message,'error');}};d.append(revoke);} row.append(a,b,c,d);target.append(row); }); }; const upload = async () => { const product_id=$('product').value, version=$('version').value.trim(), file=$('installer').files[0]; if(!version||!file){setStatus('请先选择版本号和 .exe 安装包','error');return;} if(!/\.exe$/i.test(file.name)){setStatus('只允许上传 .exe 安装包','error');return;} $('upload').disabled=true; verified=null; try { setStatus('正在向服务器申请一次性上传地址…'); const ticket=await request('/api/v1/admin/releases/upload-url','POST',{product_id,version}); $('objectPath').textContent=ticket.object_key; if(file.size>ticket.max_size_bytes)throw new Error('安装包超过服务器允许大小'); setStatus('正在直传 OSS：'+bytes(file.size)+'，请勿关闭页面…'); const put=await fetch(ticket.upload_url,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:file}); if(!put.ok)throw new Error('OSS 上传失败，请检查 OSS CORS 与网络'); setStatus('OSS 已接收，正在由服务器计算 SHA-256…'); verified=await request('/api/v1/admin/releases/verify-upload','POST',{product_id,version}); $('sha').textContent=verified.sha256; $('bytes').textContent=bytes(verified.size_bytes); const release=await request('/api/v1/admin/releases','POST',{product_id,version,min_supported_version:$('minVersion').value.trim()||version,mandatory:$('mandatory').value==='true',installer_url:verified.installer_url,sha256:verified.sha256,size_bytes:verified.size_bytes,notes:$('notes').value.trim()}); setStatus('草稿已创建。确认无误后点击列表中的“签名发布”。','ok'); await load(); } catch(e) { setStatus(e.message || '发布准备失败','error'); } finally { $('upload').disabled=false; } }; (async()=>{try{const me=await request('/api/auth/me');if(me.user.role!=='admin')throw new Error('当前账号没有管理员权限');$('account').textContent='管理员：'+me.user.phone.replace(/(\\d{3})\\d{4}(\\d{4})/,'$1****$2');await load();}catch(e){$('account').textContent='无法进入后台';setStatus(e.message || '请先登录管理员账号','error');}})(); $('upload').onclick=upload; $('reload').onclick=()=>load().catch(e=>setStatus(e.message,'error')); })();</script></body></html>`);
}

function sendReleaseAdminPageV2(res) {
  const nonce = crypto.randomBytes(18).toString('base64');
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; connect-src 'self' https://software-update0012.oss-cn-guangzhou.aliyuncs.com; img-src 'self' data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; form-action 'self'`,
  });
  return res.type('html').send(renderAdminReleasePage({ nonce }));
}

app.get('/account/continue', (req, res) => sendAccountPage(res, `
  (async () => {
    const subtitle = document.getElementById('subtitle');
    const ticket = new URLSearchParams(location.hash.slice(1)).get('ticket') || '';
    history.replaceState(null, '', location.pathname);
    if (!/^[A-Za-z0-9_-]{40,128}$/.test(ticket)) {
      subtitle.textContent = '登录交接已失效，请返回客户端重新进入账户中心。';
      subtitle.className = 'muted error';
      return;
    }
    try {
      const response = await fetch('/api/auth/web-handoff/consume', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ticket}), credentials:'same-origin'});
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error('handoff failed');
      location.replace('/account/topup');
    } catch {
      subtitle.textContent = '登录交接已失效或已使用，请返回客户端重新进入账户中心。';
      subtitle.className = 'muted error';
    }
  })();
`));

app.get('/account/recharge', (req, res) => sendAccountPage(res, `
  (async () => {
    const subtitle = document.getElementById('subtitle');
    const account = document.getElementById('account');
    const notice = document.getElementById('notice');
    const set = (id, value) => { document.getElementById(id).textContent = value || '—'; };
    try {
      const response = await fetch('/api/auth/me', {credentials:'same-origin'});
      const data = await response.json();
      if (!response.ok || !data.ok || !data.user) throw new Error('not signed in');
      const user = data.user;
      const membership = data.membership || {};
      const activeProducts = Array.isArray(data.products) ? data.products.filter((product) => product && product.status === 'active') : [];
      subtitle.textContent = '已安全登录。这里展示的是你当前账户的实时权益。';
      set('phone', user.phone);
      set('level', membership.status === 'active' ? '已开通 ' + activeProducts.length + ' 款软件' : '暂未开通软件会员');
      set('products', activeProducts.length ? activeProducts.map((product) => product.name).join('、') : '暂未开通');
      set('expiry', activeProducts.length ? activeProducts.map((product) => product.name + '：' + new Date(product.expires_at).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai',hour12:false})).join('；') : '暂未开通');
      set('entitlements', Array.isArray(membership.entitlements) && membership.entitlements.length ? membership.entitlements.join('、') : '暂未开通');
      account.classList.remove('hidden');
      notice.textContent = '会员权限以服务端签名的软件权益为准；如刚完成开通，请回到客户端刷新账号权益。';
      notice.classList.remove('hidden');
    } catch {
      subtitle.textContent = '当前网页未登录。请返回客户端，重新点击“续费/账户中心”。';
      subtitle.className = 'muted error';
    }
  })();
`));

app.get('/account/topup', (req, res) => sendAccountPage(res, `
  (async () => {
    const subtitle = document.getElementById('subtitle');
    const account = document.getElementById('account');
    const notice = document.getElementById('notice');
    const set = (id, value) => { document.getElementById(id).textContent = value || '—'; };
    const request = async (url, options) => {
      const response = await fetch(url, Object.assign({ credentials: 'same-origin' }, options || {}));
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || '请求失败');
      return data;
    };
    const money = (cents) => '¥' + (Number(cents || 0) / 100).toFixed(2);
    let paymentTimer = null;
    const stopPolling = () => { if (paymentTimer) { clearInterval(paymentTimer); paymentTimer = null; } };
    const showPayment = (payment, credits) => {
      const old = document.getElementById('wechat-payment');
      if (old) old.remove();
      const panel = document.createElement('section');
      panel.id = 'wechat-payment'; panel.className = 'pay';
      const title = document.createElement('strong');
      title.textContent = '请使用微信扫描二维码支付 ' + money(payment.amountCents);
      const image = document.createElement('img'); image.src = payment.qrDataUrl; image.alt = '微信支付二维码';
      const status = document.createElement('p'); status.textContent = '等待支付确认…';
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '关闭支付二维码';
      cancel.onclick = () => { stopPolling(); panel.remove(); };
      panel.append(title, image, status, cancel);
      document.querySelector('.topup').append(panel);
      stopPolling();
      paymentTimer = setInterval(async () => {
        try {
          const result = await request('/api/pay/wechat/status/' + encodeURIComponent(payment.orderNo));
          if (result.order && result.order.status === 'SUCCESS') {
            stopPolling();
            status.textContent = '支付成功，' + credits + ' 积分已到账。';
            notice.textContent = '充值成功：' + credits + ' 积分已到账。返回客户端后积分会自动刷新。';
            notice.classList.remove('hidden');
          }
        } catch (_) {}
      }, 2000);
    };
    try {
      const me = await request('/api/auth/me');
      const user = me.user || {};
      const membership = me.membership || {};
      const products = Array.isArray(me.products) ? me.products.filter((item) => item && item.status === 'active') : [];
      subtitle.textContent = '已安全登录。支付完成后积分将直接记入当前手机号账户。';
      set('phone', user.phone);
      set('level', membership.status === 'active' ? '已开通 ' + products.length + ' 款软件' : '普通用户');
      set('products', products.length ? products.map((item) => item.name).join('、') : '暂未开通');
      set('expiry', products.length ? products.map((item) => item.name + '：' + new Date(item.expires_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })).join('；') : '—');
      set('entitlements', '当前积分：' + String(user.energy_balance == null ? 0 : user.energy_balance));
      account.classList.remove('hidden');
      const topup = document.createElement('section'); topup.className = 'topup';
      const heading = document.createElement('h2'); heading.textContent = '充值算力积分';
      const hint = document.createElement('p'); hint.textContent = '固定兑换比例：¥0.10 = 1 积分。支付成功后由服务端验签并入账。';
      const plans = document.createElement('div'); plans.className = 'plans';
      topup.append(heading, hint, plans); document.querySelector('main.card').append(topup);
      const catalog = await request('/api/pay/credit-plans');
      if (!catalog.paymentsEnabled) {
        hint.textContent = '充值服务暂未开启，请稍后再试。';
        return;
      }
      (catalog.plans || []).forEach((plan) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'plan';
        button.innerHTML = '<strong>' + String(plan.credits) + ' 积分</strong><span>' + String(plan.name) + '</span><em>' + money(plan.amountCents) + '</em>';
        button.onclick = async () => {
          button.disabled = true;
          try {
            const payment = await request('/api/pay/wechat/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: plan.id }) });
            showPayment(payment, plan.credits);
          } catch (error) {
            notice.textContent = error.message || '创建支付订单失败，请稍后重试。';
            notice.classList.remove('hidden');
          } finally { button.disabled = false; }
        };
        plans.append(button);
      });
    } catch (_) {
      subtitle.textContent = '当前网页未登录。请返回客户端后重新点击“充值”。';
      subtitle.className = 'muted error';
    }
  })();
`));

app.get('/api/pay/plans', (req, res) => {
  const paymentsEnabled = parseBoolean(process.env.PAYMENTS_ENABLED, false);
  const plans = paymentsEnabled ? Object.entries(PAYMENT_PLANS).map(([id, plan]) => ({
    id, name: plan.name, amountCents: plan.amountCents, durationDays: plan.durationDays, entitlements: plan.entitlements,
  })) : [];
  return res.json({ ok: true, paymentsEnabled, plans });
});

app.get('/api/pay/credit-plans', requireUser, (req, res) => {
  const paymentsEnabled = parseBoolean(process.env.PAYMENTS_ENABLED, false);
  const plans = Object.entries(CREDIT_TOPUP_PLANS).map(([id, plan]) => ({
    id,
    name: plan.name,
    amountCents: plan.amountCents,
    credits: plan.energy,
  }));
  return res.json({ ok: true, paymentsEnabled, plans });
});

app.get('/admin/releases', (req, res) => sendReleaseAdminPageV2(res));

app.post('/api/v1/admin/releases/upload-url', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  try {
    const config = readOssUploadConfig(process.env);
    const release = canonicalReleaseObject(req.body?.product_id, req.body?.version);
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
    const uploadUrl = createOssSignedUrl({ config, method: 'PUT', objectKey: release.object_key, expiresAt });
    return res.json({
      ok: true,
      product_id: release.product_id,
      version: release.version,
      object_key: release.object_key,
      installer_url: release.installer_url,
      upload_url: uploadUrl,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      max_size_bytes: config.maxSizeBytes,
    });
  } catch (error) {
    const clientError = error instanceof ReleaseContractError || /产品标识无效|版本号格式无效/.test(String(error.message || ''));
    return jsonResponse(res, clientError ? 400 : 503, { ok: false, error: clientError ? error.message : 'OSS 直传服务尚未配置' });
  }
});

app.post('/api/v1/admin/releases/verify-upload', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, async (req, res) => {
  try {
    const config = readOssUploadConfig(process.env);
    const release = canonicalReleaseObject(req.body?.product_id, req.body?.version);
    const verified = await verifyOssReleaseObject({ config, objectKey: release.object_key });
    return res.json({ ok: true, ...release, ...verified });
  } catch (error) {
    console.error('[UPDATE] verify uploaded installer failed:', error.code || 'UNKNOWN');
    const clientError = error instanceof ReleaseContractError || /产品标识无效|版本号格式无效/.test(String(error.message || ''));
    return jsonResponse(res, clientError ? 400 : 503, { ok: false, error: clientError ? error.message : 'OSS 安装包校验失败，请确认上传完成后重试' });
  }
});

app.get('/api/v1/releases/latest', (req, res) => {
  let productId;
  try {
    productId = releaseProductId(req.query.product_id);
  } catch (error) {
    return jsonResponse(res, 400, { ok: false, error: '未知更新产品' });
  }
  const clientKey = `${getClientIp(req)}:${productId}`;
  if (!consumeRateLimit(releaseLookupLimiter, clientKey, 60_000, 60)) {
    return jsonResponse(res, 429, { ok: false, error: '检查更新过于频繁，请稍后再试' });
  }
  const row = db.prepare(`
    SELECT id, product_id, version, min_supported_version, mandatory, installer_url, sha256, size_bytes, notes, published_at
    FROM product_releases
    WHERE product_id = ? AND status = 'published' AND published_at IS NOT NULL
    ORDER BY published_at DESC, id DESC LIMIT 1
  `).get(productId);
  res.set('Cache-Control', 'no-store');
  if (!row) return res.json({ ok: true, update_release: null, server_time: nowIso() });
  try {
    return res.json({ ok: true, update_release: signPublishedRelease(row), server_time: nowIso() });
  } catch (error) {
    console.error('[UPDATE] signing failed:', error.code || 'UNKNOWN', error.message || '');
    return jsonResponse(res, 503, { ok: false, error: '更新服务暂时不可用' });
  }
});

app.get('/api/v1/releases/events', (req, res) => {
  let productId;
  try {
    productId = releaseProductId(req.query.product_id);
  } catch {
    return jsonResponse(res, 400, { ok: false, error: '未知更新产品' });
  }
  const clientIp = getClientIp(req);
  const currentConnections = releaseEventConnectionsByIp.get(clientIp) || 0;
  if (currentConnections >= 6) {
    return jsonResponse(res, 429, { ok: false, error: '更新通知连接过多，请稍后再试' });
  }
  releaseEventConnectionsByIp.set(clientIp, currentConnections + 1);
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  res.write('retry: 5000\n');
  res.write(`event: ready\ndata: ${JSON.stringify({ product_id: productId })}\n\n`);
  let unsubscribe;
  let heartbeat = null;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (heartbeat) clearInterval(heartbeat);
    if (unsubscribe) unsubscribe();
    const remaining = (releaseEventConnectionsByIp.get(clientIp) || 1) - 1;
    if (remaining > 0) releaseEventConnectionsByIp.set(clientIp, remaining);
    else releaseEventConnectionsByIp.delete(clientIp);
  };
  try {
    unsubscribe = releaseEventHub.subscribe(productId, (event) => {
      if (!res.writableEnded) res.write(`event: release\ndata: ${JSON.stringify(event)}\n\n`);
    });
  } catch (error) {
    cleanup();
    return res.end();
  }
  heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, 15_000);
  req.on('close', cleanup);
  res.on('close', cleanup);
});

app.post('/api/v1/admin/console/unlock', requireUser, requireAdmin, requireSameSiteAdminRequest, (req, res) => {
  const sessionKey = adminConsoleSessionKey(req);
  const limiterKey = `${getClientIp(req)}:${sessionKey || 'missing'}`;
  if (!consumeRateLimit(adminConsoleLimiter, limiterKey, 15 * 60 * 1000, 5)) {
    return jsonResponse(res, 429, { ok: false, error: '管理密码尝试次数过多，请稍后再试' });
  }
  const passwordHash = String(process.env.ADMIN_CONSOLE_PASSWORD_HASH || '').trim();
  const password = req.body?.password;
  if (!passwordHash) return jsonResponse(res, 503, { ok: false, error: '管理后台尚未配置' });
  if (!verifyPassword(password, passwordHash)) {
    return jsonResponse(res, 401, { ok: false, error: '管理密码错误' });
  }
  const expiresAt = Date.now() + adminConsoleTtlMs();
  adminConsoleUnlocks.set(sessionKey, expiresAt);
  return res.json({ ok: true, expires_at: new Date(expiresAt).toISOString() });
});


function findOrCreateGrantTarget(phone, timestamp) {
  const existing = db.prepare('SELECT id, phone FROM users WHERE phone = ?').get(phone);
  if (existing) return existing;
  db.prepare(`
    INSERT INTO users (phone, created_at, last_login_at)
    VALUES (?, ?, ?)
    ON CONFLICT(phone) DO NOTHING
  `).run(phone, timestamp, timestamp);
  const created = db.prepare('SELECT id, phone FROM users WHERE phone = ?').get(phone);
  if (!created) throw new Error('无法创建授权账号');
  return created;
}

app.get('/api/v1/admin/memberships', requireUser, requireAdmin, requireAdminConsole, (req, res) => {
  let phone;
  try {
    phone = normalizeMembershipPhone(req.query.phone);
  } catch (error) {
    return jsonResponse(res, 400, { ok: false, error: error.message });
  }
  const user = db.prepare('SELECT id, phone FROM users WHERE phone = ?').get(phone);
  if (!user) return jsonResponse(res, 404, { ok: false, error: '该手机号尚未注册，请先在客户端登录一次' });
  return res.json({
    ok: true,
    user: { phone: user.phone },
    products: accountProducts(user.id, nowIso()),
  });
});

app.post('/api/v1/admin/memberships/grant', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  let input;
  try {
    input = normalizeMembershipGrant(req.body, PAYMENT_PLANS);
  } catch (error) {
    const message = error instanceof AdminMembershipError ? error.message : '会员授权参数无效';
    return jsonResponse(res, 400, { ok: false, error: message });
  }

  const timestamp = nowIso();
  const grantProducts = db.transaction(() => {
    const target = findOrCreateGrantTarget(input.phone, timestamp);
    const granted = [];
    for (const productId of input.productIds) {
      const plan = PAYMENT_PLANS[productId];
      const existing = db.prepare('SELECT expires_at FROM user_products WHERE user_id = ? AND product_id = ?')
        .get(target.id, productId);
      const expiresAt = computeGrantedExpiry(existing?.expires_at, input.durationDays, Date.parse(timestamp));
      db.prepare(`
        INSERT INTO user_products
          (user_id, product_id, product_name, price_cents, duration_days, entitlements_json, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, product_id) DO UPDATE SET
          product_name = excluded.product_name,
          price_cents = excluded.price_cents,
          duration_days = excluded.duration_days,
          entitlements_json = excluded.entitlements_json,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      `).run(target.id, productId, plan.name, plan.amountCents, input.durationDays,
        JSON.stringify(plan.entitlements), expiresAt, timestamp, timestamp);
      db.prepare(`
        INSERT INTO admin_product_grants
          (admin_user_id, target_user_id, product_id, duration_days, previous_expires_at, expires_at, action, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'grant', ?)
      `).run(req.user.id, target.id, productId, input.durationDays, existing?.expires_at || null, expiresAt, timestamp);
      granted.push({ product_id: productId, expires_at: expiresAt });
    }
    return { target, granted };
  });

  const { target, granted } = grantProducts();
  return res.json({
    ok: true,
    user: { phone: target.phone },
    granted,
    products: accountProducts(target.id, nowIso()),
  });
});

app.post('/api/v1/admin/memberships/expire', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  let input;
  try {
    input = normalizeMembershipExpiry(req.body, PAYMENT_PLANS);
  } catch (error) {
    const message = error instanceof AdminMembershipError ? error.message : '停用权益参数无效';
    return jsonResponse(res, 400, { ok: false, error: message });
  }

  const target = db.prepare('SELECT id, phone FROM users WHERE phone = ?').get(input.phone);
  if (!target) return jsonResponse(res, 404, { ok: false, error: '该手机号尚未注册，请先在客户端登录一次' });

  const timestamp = nowIso();
  const currentTime = Date.parse(timestamp);
  const existingProducts = input.productIds.map((productId) => ({
    productId,
    row: db.prepare('SELECT expires_at FROM user_products WHERE user_id = ? AND product_id = ?').get(target.id, productId),
  }));
  const unavailable = existingProducts.find(({ row }) => !row || Date.parse(row.expires_at) <= currentTime);
  if (unavailable) {
    return jsonResponse(res, 409, { ok: false, error: `${PAYMENT_PLANS[unavailable.productId].name}当前没有生效中的权益` });
  }

  const expireProducts = db.transaction(() => {
    for (const { productId, row } of existingProducts) {
      db.prepare(`UPDATE user_products SET expires_at = ?, updated_at = ? WHERE user_id = ? AND product_id = ?`)
        .run(timestamp, timestamp, target.id, productId);
      db.prepare(`
        INSERT INTO admin_product_grants
          (admin_user_id, target_user_id, product_id, duration_days, previous_expires_at, expires_at, action, created_at)
        VALUES (?, ?, ?, 0, ?, ?, 'expire', ?)
      `).run(req.user.id, target.id, productId, row.expires_at, timestamp, timestamp);
    }
  });
  expireProducts();

  return res.json({
    ok: true,
    user: { phone: target.phone },
    expired: input.productIds,
    products: accountProducts(target.id, nowIso()),
  });
});

function officialAiErrorResponse(res, error) {
  if (error instanceof OfficialAiError) {
    console.warn('[OFFICIAL_AI]', JSON.stringify({ code: error.code, status: error.status }));
    return jsonResponse(res, error.status, { ok: false, error: error.message, code: error.code });
  }
  console.error('[OFFICIAL_AI] unexpected error:', error);
  return jsonResponse(res, 500, { ok: false, error: '官方AI服务暂时不可用', code: 'AI_INTERNAL_ERROR' });
}

function setOfficialAiNoStore(res) {
  res.set({
    'Cache-Control': 'private, no-store, max-age=0',
    'Pragma': 'no-cache',
    'Vary': 'Cookie, X-Product-Code',
  });
}

function officialAiAudienceMatches(req, productId) {
  try {
    return requestAudience(req) === productId;
  } catch {
    return false;
  }
}

function publicOfficialAiAsset(job, asset) {
  let stableUrl = null;
  if (asset.object_key && !String(asset.object_key).startsWith('upstream-temporary/')) {
    try {
      const oss = readOssUploadConfig(process.env);
      stableUrl = createOssSignedUrl({
        config: oss,
        method: 'GET',
        objectKey: asset.object_key,
        expiresAt: Math.floor(Date.now() / 1000) + 10 * 60,
      });
    } catch (error) {
      console.warn('[OFFICIAL_AI]', JSON.stringify({
        code: 'AI_IMAGE_DELIVERY_SIGN_FAILED',
        job_id: job.id,
        asset_id: asset.id,
      }));
    }
  }
  return {
    id: asset.id,
    mime_type: asset.mime_type,
    size_bytes: Number(asset.size_bytes),
    width: asset.width || null,
    height: asset.height || null,
    expires_at: asset.expires_at,
    delivery: stableUrl ? 'oss' : 'upstream_temporary_url',
    // Desktop clients need a directly fetchable URL.  For OSS-backed assets
    // return a short-lived signed URL; the application server is not in the
    // image data path and therefore does not carry end-user download traffic.
    // Keep display_url compatible with already-issued desktop builds whose
    // allowlist only contains the provider CDN.  Updated clients prefer the
    // stable OSS URL and no longer depend on that provider CDN being reachable.
    display_url: asset.delivery_url || stableUrl,
    stable_url: stableUrl,
    download_url: `/api/v1/ai/jobs/${job.id}/assets/${asset.id}`,
  };
}

async function downloadOfficialImageForStorage(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || ''));
  } catch {
    throw new OfficialAiError('官方图片服务返回了无效地址', 'AI_IMAGE_RESULT_UNSUPPORTED', 502);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new OfficialAiError('官方图片服务返回了不安全地址', 'AI_IMAGE_RESULT_UNSUPPORTED', 502);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300 * 1000);
  try {
    const response = await fetch(parsed, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'ManJuXia-Official-AI/1.0',
      },
    });
    if (!response.ok) {
      throw new OfficialAiError('官方图片下载失败，积分将自动退回', 'AI_IMAGE_STORAGE_FAILED', 503);
    }
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > 25 * 1024 * 1024) {
      throw new OfficialAiError('官方图片超过存储大小限制', 'AI_IMAGE_STORAGE_FAILED', 503);
    }
    const contentType = String(response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
    if (contentType && !contentType.startsWith('image/')) {
      throw new OfficialAiError('官方图片地址未返回图片内容', 'AI_IMAGE_STORAGE_FAILED', 503);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 25 * 1024 * 1024) {
      throw new OfficialAiError('官方图片内容为空或超过大小限制', 'AI_IMAGE_STORAGE_FAILED', 503);
    }
    return { buffer, mimeType: contentType || 'image/png' };
  } catch (error) {
    if (error instanceof OfficialAiError) throw error;
    const code = error?.name === 'AbortError' ? 'AI_UPSTREAM_TIMEOUT' : 'AI_IMAGE_STORAGE_FAILED';
    throw new OfficialAiError('官方图片转存失败，积分将自动退回', code, 503);
  } finally {
    clearTimeout(timer);
  }
}

function createOssImageUploadUrl(config, objectKey, mimeType, expiresAt) {
  const contentType = String(mimeType || 'image/png').trim().toLowerCase();
  if (!contentType.startsWith('image/')) throw new OfficialAiError('官方图片格式无效', 'AI_IMAGE_STORAGE_FAILED', 503);
  const resource = `/${config.bucket}/${objectKey}`;
  const stringToSign = `PUT\n\n${contentType}\n${expiresAt}\n${resource}`;
  const signature = crypto.createHmac('sha1', config.accessKeySecret).update(stringToSign, 'utf8').digest('base64');
  const encodedKey = String(objectKey).split('/').map(encodeURIComponent).join('/');
  const url = new URL(`${config.endpoint}/${encodedKey}`);
  url.searchParams.set('OSSAccessKeyId', config.accessKeyId);
  url.searchParams.set('Expires', String(expiresAt));
  url.searchParams.set('Signature', signature);
  return url.toString();
}

function publicOfficialAiJob(job) {
  return publicJob(job, listAiJobAssets(db, job.id).map((asset) => publicOfficialAiAsset(job, asset)));
}

async function callOfficialImageWithRetry(config, job) {
  const retryableCodes = new Set(['AI_IMAGE_RESULT_UNSUPPORTED', 'AI_UPSTREAM_FAILED', 'AI_UPSTREAM_TIMEOUT']);
  let lastError;
  let activeJob = job;
  let safetyFallbackUsed = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await callOfficialImage(config, activeJob);
    } catch (error) {
      lastError = error;
      if (error?.code === 'AI_IMAGE_PROMPT_REJECTED' && !safetyFallbackUsed) {
        safetyFallbackUsed = true;
        activeJob = { ...job, input_text: buildSafeOfficialImagePrompt(job.input_text) };
        console.warn('[OFFICIAL_AI]', JSON.stringify({
          code: error.code,
          job_id: job.id,
          retry_mode: 'fictional_prop_safety_fallback',
          provider_status: error.details?.provider_status,
          provider_code: error.details?.provider_code,
          provider_request_id: error.details?.provider_request_id,
        }));
        continue;
      }
      if (!retryableCodes.has(error?.code) || attempt >= 3) throw error;
      const delayMs = attempt * 2000;
      console.warn('[OFFICIAL_AI]', JSON.stringify({ code: error.code, job_id: job.id, retry_attempt: attempt + 1 }));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
async function storeOfficialAiImage(job, image) {
  const assetId = crypto.randomUUID();
  let imageBuffer = Buffer.isBuffer(image.buffer) ? image.buffer : null;
  let imageMimeType = image.mimeType || 'image/png';
  if (typeof image.deliveryUrl === 'string' && image.deliveryUrl) {
    // The provider CDN can be unreachable from an individual desktop even
    // though generation succeeded.  Fetch it once on the service and move it
    // into our OSS bucket.  Users receive a signed OSS URL, not image bytes
    // proxied through this application server.
    const downloaded = await downloadOfficialImageForStorage(image.deliveryUrl);
    imageBuffer = downloaded.buffer;
    imageMimeType = downloaded.mimeType;
  }
  if (!Buffer.isBuffer(imageBuffer)) throw new OfficialAiError('官方图片服务未返回可保存内容', 'AI_IMAGE_RESULT_UNSUPPORTED', 502);
  const oss = readOssUploadConfig(process.env);
  const productStoragePrefix = {
    comic_shrimp: 'comic-shrimp',
    replay_shrimp: 'replay-shrimp',
    operation_shrimp: 'operation-shrimp',
  }[job.product_id];
  if (!productStoragePrefix) throw new OfficialAiError('官方图片存储产品无效', 'AI_IMAGE_STORAGE_FAILED', 503);
  // The OSS RAM policy is intentionally product-prefix scoped.  Keep official
  // assets beneath that authorized prefix instead of a bucket-root directory.
  const objectKey = `${productStoragePrefix}/official-ai/${job.user_id}/${job.id}/${assetId}.png`;
  const uploadUrl = createOssImageUploadUrl(oss, objectKey, imageMimeType, Math.floor(Date.now() / 1000) + 10 * 60);
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': imageMimeType }, body: imageBuffer });
  if (!response.ok) {
    console.warn('[OFFICIAL_AI]', JSON.stringify({ code: 'AI_IMAGE_OSS_UPLOAD_FAILED', job_id: job.id, status: response.status }));
    throw new OfficialAiError('图片保存失败，积分将自动退回', 'AI_IMAGE_STORAGE_FAILED', 503);
  }
  return saveAiJobAsset(db, {
    id: assetId,
    jobId: job.id,
    userId: job.user_id,
    productId: job.product_id,
    objectKey,
    // Kept only as a compatibility display URL for older desktop releases.
    // New clients always consume stable_url, which is backed by objectKey.
    deliveryUrl: image.deliveryUrl || null,
    mimeType: imageMimeType,
    sizeBytes: imageBuffer.length,
    width: image.width,
    height: image.height,
    expiresAt: job.expires_at,
  });
}

app.get('/api/v1/ai/catalog', requireUser, (req, res) => {
  setOfficialAiNoStore(res);
  let productId;
  try {
    productId = releaseProductId(req.query.product_id || requestAudience(req));
  } catch {
    return jsonResponse(res, 400, { ok: false, error: '未知软件产品', code: 'AI_PRODUCT_INVALID' });
  }
  if (!officialAiAudienceMatches(req, productId)) {
    return jsonResponse(res, 400, { ok: false, error: '客户端产品标识不匹配', code: 'AI_PRODUCT_MISMATCH' });
  }
  const config = readOfficialAiConfig(process.env, db);
  const tasks = listTaskRules(db)
    .filter((task) => task.productId === productId)
    .map((task) => ({
      ...publicTaskRule(task, config),
      available: Boolean(officialConfigForTask(config, task.taskType)?.configured && task.enabled && activeProductForTask(db, req.user.id, task.taskType)),
    }));
  const balance = db.prepare('SELECT energy_balance FROM users WHERE id = ?').get(req.user.id)?.energy_balance || 0;
  return res.json({
    ok: true,
    product_id: productId,
    balance: Number(balance),
    official_ai: publicOfficialAiConfig(config),
    tasks,
  });
});

app.post('/api/v1/ai/jobs', requireUser, async (req, res) => {
  setOfficialAiNoStore(res);
  let resolved;
  let reservation = null;
  try {
    resolved = resolveAiJob(db, req.body);
    if (!officialAiAudienceMatches(req, resolved.productId)) {
      throw new OfficialAiError('客户端产品标识不匹配', 'AI_PRODUCT_MISMATCH', 400);
    }
    if (!activeProductForTask(db, req.user.id, resolved.taskType)) {
      throw new OfficialAiError('未开通当前软件会员权益', 'AI_PRODUCT_NOT_ENTITLED', 403);
    }
    const limiterKey = `${req.user.id}:${resolved.taskType}`;
    if (!consumeRateLimit(officialAiRequestLimiter, limiterKey, 60_000, 6)) {
      throw new OfficialAiError('请求过于频繁，请稍后再试', 'AI_RATE_LIMITED', 429);
    }
    const config = readOfficialAiConfig(process.env, db);
    // Dedicated provider configurations (for example DeepSeek) hold only
    // provider fields. Inherit the service-wide timeout so they do not pass
    // `undefined` to setTimeout and get aborted immediately.
    const selectedTaskConfig = officialConfigForTask(config, resolved.taskType);
    const taskConfig = { ...selectedTaskConfig, timeoutMs: selectedTaskConfig?.timeoutMs || config.timeoutMs };
    if (!taskConfig?.configured) {
      throw new OfficialAiError('官方AI算力暂未配置', 'AI_NOT_CONFIGURED', 503);
    }
    reservation = reserveAiJob(db, req.user.id, resolved);
    if (reservation.existing) {
      const existing = publicOfficialAiJob(reservation.job);
      const status = existing.status === 'succeeded' ? 200 : 202;
      return res.status(status).json({ ok: true, reused: true, job: existing });
    }
    if (resolved.rule.kind === 'image') {
      const balance = db.prepare('SELECT energy_balance FROM users WHERE id = ?').get(req.user.id)?.energy_balance || 0;
      // Image upstreams can take several minutes.  A synchronous response makes
      // desktop clients time out even though the image eventually succeeds.
      // Match the text-job contract: acknowledge immediately and let clients
      // poll /jobs/:id until the saved asset is available.
      void (async () => {
        try {
          const imageConfig = taskConfig;
          const image = await callOfficialImageWithRetry(imageConfig, { ...reservation.job, input_text: resolved.inputText });
          await storeOfficialAiImage(reservation.job, image);
          settleAiJob(db, reservation.job.id, { text: '', providerRequestId: image.providerRequestId });
        } catch (error) {
          refundAiJob(db, reservation.job.id, error.code || 'AI_UPSTREAM_FAILED');
          console.warn('[OFFICIAL_AI]', JSON.stringify({
            code: error.code || 'AI_UPSTREAM_FAILED',
            job_id: reservation.job.id,
            provider_status: error.details?.provider_status,
            provider_code: error.details?.provider_code,
            provider_request_id: error.details?.provider_request_id,
          }));
        }
      })();
      const queued = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(reservation.job.id);
      return res.status(202).json({ ok: true, reused: false, balance: Number(balance), job: publicOfficialAiJob(queued) });
    }
    const balance = db.prepare('SELECT energy_balance FROM users WHERE id = ?').get(req.user.id)?.energy_balance || 0;
    // Text generation can exceed proxy request limits.  Reserve the job and
    // acknowledge it immediately; the desktop client polls /jobs/:id while
    // this worker settles or refunds it in the background.
    void (async () => {
      try {
        const result = await callOfficialAi(taskConfig, { ...reservation.job, input_text: resolved.inputText, max_output_tokens: resolved.maxOutputTokens });
        settleAiJob(db, reservation.job.id, result);
      } catch (error) {
        refundAiJob(db, reservation.job.id, error.code || 'AI_UPSTREAM_FAILED');
        console.warn('[OFFICIAL_AI]', JSON.stringify({ code: error.code || 'AI_UPSTREAM_FAILED', job_id: reservation.job.id }));
      }
    })();
    const queued = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(reservation.job.id);
    return res.status(202).json({ ok: true, reused: false, balance: Number(balance), job: publicOfficialAiJob(queued) });
  } catch (error) {
    if (reservation && !reservation.existing) refundAiJob(db, reservation.job.id, error.code || 'AI_UPSTREAM_FAILED');
    return officialAiErrorResponse(res, error);
  }
});

app.get('/api/v1/ai/jobs/:id', requireUser, (req, res) => {
  setOfficialAiNoStore(res);
  const jobId = String(req.params.id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    return jsonResponse(res, 400, { ok: false, error: '任务编号无效', code: 'AI_JOB_INVALID' });
  }
  const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
  if (!job) return jsonResponse(res, 404, { ok: false, error: '任务不存在', code: 'AI_JOB_NOT_FOUND' });
  return res.json({ ok: true, job: publicOfficialAiJob(job) });
});

function officialVideoUrl(value, provider = null) {
  try {
    const url = new URL(String(value || ''));
    if (url.username || url.password) return '';
    if (url.protocol === 'https:') return url.toString();
    // The documented NewAPI completion URL is HTTP on the same host as its
    // configured API base (the port differs). Accept only that exact trusted
    // host; arbitrary HTTP URLs remain rejected.
    if (url.protocol === 'http:' && provider?.provider === 'newapi') {
      const upstream = new URL(String(provider.apiBase || ''));
      if (url.hostname === upstream.hostname) return url.toString();
    }
    return '';
  } catch { return ''; }
}

function officialVideoResultUrl(payload, provider = null) {
  if (!payload || typeof payload !== 'object') return '';
  const candidates = [payload.url, payload.video_url, payload.download_url, payload.output_url,
    payload.data?.url, payload.data?.video_url, payload.data?.download_url,
    payload.data?.output?.url, payload.data?.output?.video_url];
  for (const candidate of candidates) {
    const value = officialVideoUrl(candidate, provider);
    if (value) return value;
  }
  return '';
}

async function officialVideoFetch(provider, pathName, method = 'GET', body = undefined) {
  const endpoint = `${String(provider.apiBase || '').replace(/\/+$/, '')}${pathName}`;
  const response = await fetch(endpoint, {
    method,
    headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(method === 'POST' ? 180_000 : 60_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const upstreamError = payload?.error && typeof payload.error === 'object' ? payload.error : payload;
    throw new OfficialAiError(
      '官方视频上游请求失败',
      response.status === 401 || response.status === 403 ? 'AI_UPSTREAM_AUTH_FAILED' : 'AI_UPSTREAM_FAILED',
      502,
      {
        provider_status: response.status,
        provider_code: String(upstreamError?.code || '').slice(0, 120),
        provider_message: String(upstreamError?.message || '').slice(0, 600),
        provider_request_id: String(response.headers.get('x-request-id') || payload?.id || '').slice(0, 160),
      },
    );
  }
  return payload;
}

async function submitOfficialVideo(provider, job) {
  const source = job.video;
  const params = source.params || {};
  if (provider.provider === 'newapi') {
    const payload = { model: provider.model, prompt: job.input_text, duration: Number(params.duration || 5), aspect_ratio: String(params.ratio || '9:16') };
    if (source.images.length) payload.images = source.images;
    if (source.audios.length) payload.audios = source.audios;
    if (source.videos.length) payload.videos = source.videos;
    if (parseBoolean(process.env.OFFICIAL_VIDEO_DRY_RUN, false)) {
      // Temporary audit mode for integration verification.  Keep the complete
      // provider body server-side (it can include short-lived signed asset
      // URLs), never send it to the desktop client, and never call NewAPI.
      const auditPath = path.resolve(process.env.OFFICIAL_VIDEO_AUDIT_LOG || path.join(DATA_DIR, 'official-video-audit.jsonl'));
      fs.appendFileSync(auditPath, `${JSON.stringify({
        created_at: new Date().toISOString(), job_id: job.id, provider: provider.provider,
        source_storyboard_id: Number.isSafeInteger(Number(source.source_storyboard_id)) ? Number(source.source_storyboard_id) : null,
        request: payload,
      })}\n`, { mode: 0o600 });
      throw new OfficialAiError('官方视频请求审计完成，未提交上游', 'AI_VIDEO_DRY_RUN', 409);
    }
    const response = await officialVideoFetch(provider, '/v1/video/generations', 'POST', payload);
    const taskId = response.task_id || response.data?.task_id || response.id || response.data?.id;
    if (!taskId) throw new OfficialAiError('官方视频服务未返回任务编号', 'AI_UPSTREAM_FAILED', 502);
    return { taskId: String(taskId), pollPath: `/v1/videos/${encodeURIComponent(String(taskId))}` };
  }
  const content = [{ type: 'text', text: job.input_text }];
  source.images.forEach((url) => content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' }));
  source.audios.forEach((url) => content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' }));
  const response = await officialVideoFetch(provider, '/contents/generations/tasks', 'POST', { model: provider.model, content, duration: Number(params.duration || 5), ratio: params.ratio, resolution: params.resolution && String(params.resolution).toLowerCase(), generate_audio: Boolean(params.generate_audio), return_last_frame: Boolean(params.use_chain_frame) });
  if (!response.id) throw new OfficialAiError('官方视频服务未返回任务编号', 'AI_UPSTREAM_FAILED', 502);
  return { taskId: String(response.id), pollPath: `/contents/generations/tasks/${encodeURIComponent(String(response.id))}` };
}

async function runOfficialVideoJob(provider, reservedJob, video) {
  try {
    const submitted = await submitOfficialVideo(provider, { ...reservedJob, video });
    db.prepare('UPDATE ai_jobs SET provider_request_id = ? WHERE id = ?').run(`${provider.provider}:${submitted.taskId}`, reservedJob.id);
    // NewAPI video queues can legitimately take longer than the previous
    // 15-minute window during peak demand. Poll every 5 seconds for up to
    // 30 minutes before declaring a refundable timeout.
    for (let attempt = 0; attempt < 360; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const current = await officialVideoFetch(provider, submitted.pollPath);
      const record = current.data || current;
      const state = String(record.status || record.state || '').toLowerCase();
      const url = officialVideoResultUrl(record, provider);
      if (url || ['succeeded', 'success', 'completed'].includes(state)) {
        if (!url) throw new OfficialAiError('官方视频任务完成但没有返回视频地址', 'AI_VIDEO_RESULT_INVALID', 502);
        settleAiJob(db, reservedJob.id, { text: url, providerRequestId: `${provider.provider}:${submitted.taskId}` });
        return;
      }
      if (['failed', 'error', 'cancelled', 'canceled', 'expired'].includes(state)) throw new OfficialAiError('官方视频任务失败', 'AI_UPSTREAM_FAILED', 502);
    }
    throw new OfficialAiError('官方视频生成超时', 'AI_UPSTREAM_TIMEOUT', 504);
  } catch (error) {
    refundAiJob(db, reservedJob.id, error.code || 'AI_UPSTREAM_FAILED');
    console.warn('[OFFICIAL_VIDEO]', JSON.stringify({
      code: error.code || 'AI_UPSTREAM_FAILED',
      job_id: reservedJob.id,
      provider: provider.provider,
      provider_status: error.details?.provider_status,
      provider_code: error.details?.provider_code,
      provider_message: error.details?.provider_message,
      provider_request_id: error.details?.provider_request_id,
    }));
  }
}

const OFFICIAL_VIDEO_ASSET_RULES = Object.freeze({
  image: { maxBytes: 25 * 1024 * 1024, mimeTypes: new Map([
    ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
  ]) },
  audio: { maxBytes: 50 * 1024 * 1024, mimeTypes: new Map([
    ['audio/mpeg', 'mp3'], ['audio/mp4', 'm4a'], ['audio/wav', 'wav'], ['audio/x-wav', 'wav'], ['audio/ogg', 'ogg'],
  ]) },
  video: { maxBytes: 300 * 1024 * 1024, mimeTypes: new Map([
    ['video/mp4', 'mp4'], ['video/webm', 'webm'], ['video/quicktime', 'mov'],
  ]) },
});

// The desktop uploads local reference material directly to a short-lived OSS
// object. Only the resulting signed HTTPS read URL is sent to NewAPI.
app.post('/api/v1/ai/video-assets/upload-policy', requireUser, (req, res) => {
  setOfficialAiNoStore(res);
  try {
    if (!officialAiAudienceMatches(req, 'comic_shrimp') || !activeProductForTask(db, req.user.id, 'comic_video')) {
      throw new OfficialAiError('未开通当前软件会员权益', 'AI_PRODUCT_NOT_ENTITLED', 403);
    }
    const kind = String(req.body?.kind || '').trim().toLowerCase();
    const mimeType = String(req.body?.mime_type || '').trim().toLowerCase();
    const sizeBytes = Number(req.body?.size_bytes);
    const rule = OFFICIAL_VIDEO_ASSET_RULES[kind];
    const extension = rule?.mimeTypes.get(mimeType);
    if (!rule || !extension) throw new OfficialAiError('视频参考素材格式不受支持', 'AI_VIDEO_ASSET_INVALID', 400);
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > rule.maxBytes) {
      throw new OfficialAiError('视频参考素材大小无效', 'AI_VIDEO_ASSET_TOO_LARGE', 400);
    }
    const oss = readOssUploadConfig(process.env);
    const now = Math.floor(Date.now() / 1000);
    const objectKey = `comic-shrimp/official-ai-input/${req.user.id}/${crypto.randomUUID()}.${extension}`;
    const uploadExpiresAt = now + 10 * 60;
    const readExpiresAt = now + 60 * 60;
    const uploadUrl = createOssSignedUrl({ config: oss, method: 'PUT', objectKey, expiresAt: uploadExpiresAt });
    const readUrl = createOssSignedUrl({ config: oss, method: 'GET', objectKey, expiresAt: readExpiresAt });
    return res.json({
      ok: true,
      asset: {
        kind,
        object_key: objectKey,
        // The current OSS signer binds PUT requests to this content type.
        upload_headers: { 'Content-Type': 'application/octet-stream' },
        upload_url: uploadUrl,
        read_url: readUrl,
        read_expires_at: new Date(readExpiresAt * 1000).toISOString(),
      },
    });
  } catch (error) {
    return officialAiErrorResponse(res, error instanceof OfficialAiError ? error : new OfficialAiError('视频参考素材上传服务暂不可用', 'AI_VIDEO_ASSET_STORAGE_FAILED', 503));
  }
});

// Official video jobs are deliberately isolated from local video providers:
// the desktop supplies only signed asset URLs and a provider choice; server
// environment configuration supplies every credential and model identifier.
app.post('/api/v1/ai/video/jobs', requireUser, async (req, res) => {
  setOfficialAiNoStore(res);
  let reservation = null;
  try {
    const resolved = resolveOfficialVideoJob(db, req.body);
    if (!officialAiAudienceMatches(req, resolved.productId) || !activeProductForTask(db, req.user.id, resolved.taskType)) {
      throw new OfficialAiError('未开通当前软件会员权益', 'AI_PRODUCT_NOT_ENTITLED', 403);
    }
    const config = readOfficialAiConfig(process.env, db);
    const provider = (config.video?.providers || []).find((item) => item.provider === resolved.videoProvider);
    if (!provider) throw new OfficialAiError('所选官方视频模型暂未配置', 'AI_NOT_CONFIGURED', 503);
    reservation = reserveAiJob(db, req.user.id, resolved);
    if (reservation.existing) return res.status(202).json({ ok: true, reused: true, job: publicOfficialAiJob(reservation.job) });
    // ai_jobs stores only an input hash, never the raw prompt. Preserve the
    // already validated in-memory text for this asynchronous submission;
    // otherwise `submitOfficialVideo` receives a database row with no
    // input_text and sends an empty prompt upstream.
    void runOfficialVideoJob(provider, { ...reservation.job, input_text: resolved.inputText }, {
      params: resolved.params, images: resolved.images, audios: resolved.audios, videos: resolved.videos,
      source_storyboard_id: Number.isSafeInteger(Number(req.body?.source_storyboard_id)) ? Number(req.body.source_storyboard_id) : null,
    });
    return res.status(202).json({ ok: true, job: publicOfficialAiJob(reservation.job) });
  } catch (error) {
    if (reservation && !reservation.existing) refundAiJob(db, reservation.job.id, error.code || 'AI_UPSTREAM_FAILED');
    return officialAiErrorResponse(res, error);
  }
});

app.get('/api/v1/ai/video/jobs/:id', requireUser, (req, res) => {
  setOfficialAiNoStore(res);
  const jobId = String(req.params.id || '').trim();
  const job = /^[0-9a-f-]{36}$/i.test(jobId) && db.prepare('SELECT * FROM ai_jobs WHERE id = ? AND user_id = ? AND task_type = ?').get(jobId, req.user.id, 'comic_video');
  if (!job) return jsonResponse(res, 404, { ok: false, error: '视频任务不存在', code: 'AI_JOB_NOT_FOUND' });
  return res.json({ ok: true, job: publicOfficialAiJob(job) });
});

app.get('/api/v1/ai/jobs/:id/assets/:assetId', requireUser, (req, res) => {
  setOfficialAiNoStore(res);
  const jobId = String(req.params.id || '').trim();
  const assetId = String(req.params.assetId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(jobId) || !/^[0-9a-f-]{36}$/i.test(assetId)) {
    return jsonResponse(res, 400, { ok: false, error: '图片编号无效', code: 'AI_ASSET_INVALID' });
  }
  const asset = db.prepare(`SELECT a.* FROM ai_job_assets a JOIN ai_jobs j ON j.id = a.job_id WHERE a.id = ? AND a.job_id = ? AND j.user_id = ?`).get(assetId, jobId, req.user.id);
  if (!asset || Date.parse(asset.expires_at) <= Date.now()) return jsonResponse(res, 404, { ok: false, error: '图片已过期', code: 'AI_ASSET_EXPIRED' });
  const hasStableObject = asset.object_key && !String(asset.object_key).startsWith('upstream-temporary/');
  if (!hasStableObject && asset.delivery_url) {
    try {
      const directUrl = new URL(asset.delivery_url);
      if (directUrl.protocol !== 'https:' || directUrl.username || directUrl.password) throw new Error('unsafe upstream URL');
      return res.redirect(302, directUrl.toString());
    } catch {
      return jsonResponse(res, 503, { ok: false, error: '图片临时地址不可用，请重新生成', code: 'AI_ASSET_URL_INVALID' });
    }
  }
  try {
    const oss = readOssUploadConfig(process.env);
    const url = createOssSignedUrl({ config: oss, method: 'GET', objectKey: asset.object_key, expiresAt: Math.floor(Date.now() / 1000) + 10 * 60 });
    return res.redirect(302, url);
  } catch (error) {
    return officialAiErrorResponse(res, error instanceof OfficialAiError ? error : new OfficialAiError('图片下载暂时不可用', 'AI_IMAGE_STORAGE_FAILED', 503));
  }
});

app.get('/api/v1/admin/ai/config', requireUser, requireAdmin, requireAdminConsole, (req, res) => {
  const config = readOfficialAiConfig(process.env, db);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const usage = db.prepare(`
    SELECT COUNT(*) AS requests, COALESCE(SUM(ABS(delta)), 0) AS credits
    FROM ai_credit_ledger WHERE reason = 'official_ai' AND status = 'settled' AND created_at >= ?
  `).get(since);
  return res.json({
    ok: true,
    official_ai: publicOfficialAiConfig(config),
    tasks: listTaskRules(db).map((task) => publicTaskRule(task, config)),
    usage_24h: { requests: Number(usage.requests || 0), credits: Number(usage.credits || 0) },
  });
});

app.put('/api/v1/admin/ai/models/:kind', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  try {
    const saved = saveOfficialAiModelConfig(db, { ...req.body, kind: String(req.params.kind || '').trim() }, process.env);
    const config = readOfficialAiConfig(process.env, db);
    return res.json({ ok: true, saved, official_ai: publicOfficialAiConfig(config) });
  } catch (error) {
    return officialAiErrorResponse(res, error);
  }
});

app.patch('/api/v1/admin/ai/tasks/:taskType', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  try {
    const task = updateTaskRule(db, String(req.params.taskType || '').trim(), req.body);
    return res.json({ ok: true, task: publicTaskRule(task, readOfficialAiConfig(process.env, db)) });
  } catch (error) {
    return officialAiErrorResponse(res, error);
  }
});

app.get('/api/v1/admin/ai/credits', requireUser, requireAdmin, requireAdminConsole, (req, res) => {
  const phone = normalizePhone(req.query.phone);
  if (!isValidPhone(phone)) return jsonResponse(res, 400, { ok: false, error: '请输入正确的11位手机号' });
  return res.json({ ok: true, ...getCreditLedger(db, phone, req.query.limit) });
});

app.post('/api/v1/admin/ai/credits/adjust', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  try {
    const result = adjustCredits(db, req.user.id, req.body, findOrCreateGrantTarget);
    return res.json({ ok: true, user: { phone: result.user.phone }, delta: result.delta, balance: result.balance, note: result.note });
  } catch (error) {
    return officialAiErrorResponse(res, error);
  }
});

app.get('/api/v1/admin/releases/retention', requireUser, requireAdmin, requireAdminConsole, (req, res) => {
  return res.json({ ok: true, ...getRetentionSnapshot(db) });
});

app.post('/api/v1/admin/releases/retention/run', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, async (req, res) => {
  try {
    const result = await runRetentionSweep({
      db,
      readOssUploadConfig,
      createOssSignedUrl,
      logger: console,
    });
    return res.json({ ok: true, policy: RETENTION_POLICY, ...result });
  } catch (error) {
    console.error('[UPDATE] retention sweep failed:', error.code || 'UNKNOWN', error.message || error);
    return jsonResponse(res, 503, { ok: false, error: '旧版本清理任务暂时不可用' });
  }
});

app.get('/api/v1/admin/releases', requireUser, requireAdmin, requireAdminConsole, (req, res) => {
  let productId = null;
  if (req.query.product_id !== undefined) {
    try {
      productId = releaseProductId(req.query.product_id);
    } catch {
      return jsonResponse(res, 400, { ok: false, error: '未知更新产品' });
    }
  }
  const rows = productId
    ? db.prepare('SELECT * FROM product_releases WHERE product_id = ? ORDER BY created_at DESC, id DESC').all(productId)
    : db.prepare('SELECT * FROM product_releases ORDER BY created_at DESC, id DESC').all();
  return res.json({ ok: true, releases: rows.map((row) => ({
    id: row.id,
    ...releaseFromRow(row),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    revoked_at: row.revoked_at,
  })) });
});

app.post('/api/v1/admin/releases', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  const timestamp = nowIso();
  let release;
  try {
    release = normalizeRelease({ ...req.body, published_at: timestamp });
    ensureCanonicalReleaseUrl(release);
  } catch (error) {
    const message = error instanceof ReleaseContractError ? error.message : '更新发布内容无效';
    return jsonResponse(res, 400, { ok: false, error: message });
  }
  try {
    const result = db.prepare(`
      INSERT INTO product_releases
        (product_id, version, min_supported_version, mandatory, installer_url, sha256, size_bytes, notes, status, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
    `).run(
      release.product_id, release.version, release.min_supported_version, release.mandatory ? 1 : 0,
      release.installer_url, release.sha256, release.size_bytes, release.notes, req.user.id, timestamp, timestamp,
    );
    const row = db.prepare('SELECT * FROM product_releases WHERE id = ?').get(result.lastInsertRowid);
    return jsonResponse(res, 201, { ok: true, release: { id: row.id, ...releaseFromRow(row), status: row.status } });
  } catch (error) {
    if (String(error.code || '').startsWith('SQLITE_CONSTRAINT')) {
      return jsonResponse(res, 409, { ok: false, error: '该产品版本已存在' });
    }
    throw error;
  }
});

app.post('/api/v1/admin/releases/:id/publish', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  const id = parseInteger(req.params.id, 0);
  if (id < 1) return jsonResponse(res, 400, { ok: false, error: '更新记录标识无效' });
  const timestamp = nowIso();
  const publish = db.transaction(() => {
    const row = db.prepare('SELECT * FROM product_releases WHERE id = ?').get(id);
    if (!row) return { code: 'not_found' };
    if (row.status !== 'draft') return { code: 'not_draft' };
    // Validate the exact row and the signing key before making it public.
    signPublishedRelease({ ...row, published_at: timestamp });
    db.prepare(`
      UPDATE product_releases SET status = 'published', published_at = ?, updated_at = ? WHERE id = ? AND status = 'draft'
    `).run(timestamp, timestamp, id);
    return { row: db.prepare('SELECT * FROM product_releases WHERE id = ?').get(id) };
  });
  try {
    const result = publish();
    if (result.code === 'not_found') return jsonResponse(res, 404, { ok: false, error: '更新记录不存在' });
    if (result.code === 'not_draft') return jsonResponse(res, 409, { ok: false, error: '只有草稿可以发布' });
    releaseEventHub.publish(result.row.product_id, {
      version: result.row.version,
      published_at: result.row.published_at,
    });
    return res.json({ ok: true, release: { id: result.row.id, ...releaseFromRow(result.row), status: result.row.status } });
  } catch (error) {
    console.error('[UPDATE] publish failed:', error.code || 'UNKNOWN', error.message || '');
    return jsonResponse(res, 503, { ok: false, error: '更新签名服务未配置或发布内容无效' });
  }
});

app.post('/api/v1/admin/releases/:id/revoke', requireUser, requireAdmin, requireAdminConsole, requireSameSiteAdminRequest, (req, res) => {
  const id = parseInteger(req.params.id, 0);
  if (id < 1) return jsonResponse(res, 400, { ok: false, error: '更新记录标识无效' });
  const timestamp = nowIso();
  const changed = db.prepare(`
    UPDATE product_releases SET status = 'revoked', revoked_at = ?, updated_at = ?
    WHERE id = ? AND status IN ('draft', 'published')
  `).run(timestamp, timestamp, id);
  if (changed.changes !== 1) return jsonResponse(res, 404, { ok: false, error: '更新记录不存在或已撤回' });
  return res.json({ ok: true });
});

app.get(['/health', '/api/health'], (req, res) => {
  const config = getSmsConfig();
  const wechat = getWechatConfig(__dirname);
  const paymentsEnabled = parseBoolean(process.env.PAYMENTS_ENABLED, false);
  res.json({
    ok: true,
    service: 'wenzhou-recharge-api',
    smsConfigured: config.missing.length === 0,
    wechatConfigured: wechat.missing.length === 0,
    wechatMissing: wechat.missing,
    paymentsEnabled,
    updateSigningConfigured: Boolean(String(process.env.UPDATE_SIGNING_PRIVATE_KEY || '').trim()),
    time: nowIso(),
  });
});

app.post('/api/pay/wechat/create', requireUser, async (req, res) => {
  if (!parseBoolean(process.env.PAYMENTS_ENABLED, false)) {
    return jsonResponse(res, 503, { ok: false, error: '充值套餐尚未上线' });
  }
  const planId = String(req.body?.planId || '').trim();
  const creditPlan = CREDIT_TOPUP_PLANS[planId];
  const membershipPlan = PAYMENT_PLANS[planId];
  const plan = creditPlan || membershipPlan;
  if (!plan) return jsonResponse(res, 400, { ok: false, error: '充值方案不存在' });
  const orderKind = creditPlan ? 'credit_topup' : 'membership';
  // Credit denominations are fixed at ¥0.10 per point. Membership plans keep
  // their existing pricing policy (for example, any approved campaign price).
  const orderPricing = creditPlan
    ? { amountCents: creditPlan.amountCents }
    : resolveOrderAmountCents({ phone: req.user.phone, normalAmountCents: plan.amountCents });

  let config;
  try {
    config = getWechatReadyConfig();
  } catch (error) {
    return jsonResponse(res, 503, {
      ok: false,
      error: '微信支付配置尚未完成，请稍后再试',
      missing: error.missing || [],
    });
  }

  const orderNo = generateOrderNo();
  const createdAt = nowIso();
  db.prepare(`
    INSERT INTO recharge_orders
      (order_no, user_id, plan_id, plan_name, amount_cents, duration_days, energy, entitlements_json, order_kind, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(orderNo, req.user.id, planId, plan.name, orderPricing.amountCents,
    creditPlan ? 0 : plan.durationDays, plan.energy, JSON.stringify(creditPlan ? [] : plan.entitlements), orderKind, createdAt);

  try {
    const result = await createNativeOrder(config, {
      orderNo,
      userId: req.user.id,
      planId,
      planName: plan.name,
      amountCents: orderPricing.amountCents,
    });
    const codeUrl = String(result?.code_url || '').trim();
    if (!codeUrl) throw new Error('微信支付未返回二维码地址');
    const qrDataUrl = await QRCode.toDataURL(codeUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
    });
    db.prepare('UPDATE recharge_orders SET code_url = ? WHERE order_no = ?').run(codeUrl, orderNo);
    return res.json({
      ok: true,
      orderNo,
      planId,
      amountCents: orderPricing.amountCents,
      qrDataUrl,
      expiresInSeconds: 900,
    });
  } catch (error) {
    db.prepare('UPDATE recharge_orders SET last_error = ? WHERE order_no = ?')
      .run(String(error.message || '微信支付下单失败').slice(0, 500), orderNo);
    console.error('[WECHAT] create order failed:', error.code || 'UNKNOWN', error.message || '');
    return jsonResponse(res, 502, { ok: false, error: '微信支付下单失败，请稍后重试' });
  }
});

app.get('/api/pay/wechat/status/:orderNo', requireUser, (req, res) => {
  const orderNo = String(req.params.orderNo || '').trim();
  const order = db.prepare(`
    SELECT order_no, plan_id, plan_name, amount_cents, status, transaction_id, paid_at
    FROM recharge_orders
    WHERE order_no = ? AND user_id = ?
  `).get(orderNo, req.user.id);
  if (!order) return jsonResponse(res, 404, { ok: false, error: '订单不存在' });
  return res.json({ ok: true, order });
});

app.post('/api/pay/wechat/notify', async (req, res) => {
  const config = getWechatConfig(__dirname);
  const timestamp = String(req.headers['wechatpay-timestamp'] || '');
  const nonce = String(req.headers['wechatpay-nonce'] || '');
  const signature = String(req.headers['wechatpay-signature'] || '');
  const serial = String(req.headers['wechatpay-serial'] || '');
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  try {
    if (!config.apiV3Key || config.missing.includes('WECHAT_PRIVATE_KEY_PATH')) {
      throw Object.assign(new Error('微信支付回调配置未完成'), { code: 'WECHAT_NOT_CONFIGURED' });
    }
    const publicKey = await getPlatformPublicKey(config, serial);
    if (!verifySignature(rawBody, timestamp, nonce, signature, publicKey)) {
      return jsonResponse(res, 401, { code: 'FAIL', message: '签名验证失败' });
    }
    const resource = req.body?.resource;
    const payment = decryptResource(resource, config.apiV3Key);
    if (payment.trade_state !== 'SUCCESS') {
      return res.json({ code: 'SUCCESS', message: '成功' });
    }
    if (payment.appid !== config.appId || payment.mchid !== config.mchId) {
      return jsonResponse(res, 400, { code: 'FAIL', message: '商户或应用不匹配' });
    }
    const order = db.prepare('SELECT * FROM recharge_orders WHERE order_no = ?').get(payment.out_trade_no);
    if (!order) return jsonResponse(res, 404, { code: 'FAIL', message: '订单不存在' });
    if (Number(payment.amount?.total) !== Number(order.amount_cents)) {
      return jsonResponse(res, 400, { code: 'FAIL', message: '订单金额不匹配' });
    }
    settleRechargeOrder(order.order_no, payment.transaction_id, payment.success_time || nowIso());
    return res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('[WECHAT] notify failed:', error.code || 'UNKNOWN', error.message || '');
    const status = error.code === 'WECHAT_NOT_CONFIGURED' ? 503 : 500;
    return jsonResponse(res, status, { code: 'FAIL', message: '回调处理失败' });
  }
});

app.post('/api/auth/send-code', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!isValidPhone(phone)) return jsonResponse(res, 400, { ok: false, error: '请输入正确的手机号' });

  const clientKey = `${getClientIp(req)}:${phone}`;
  const interval = Math.max(10, parseInteger(process.env.SMS_INTERVAL, 60)) * 1000;
  if (!consumeRateLimit(sendCodeLimiter, clientKey, interval, 1)) {
    return jsonResponse(res, 429, { ok: false, error: `请${Math.ceil(interval / 1000)}秒后再试` });
  }

  try {
    const result = await sendSms(phone);
    return res.json({ ok: true, message: '验证码已发送', requestId: result.RequestId || null });
  } catch (error) {
    sendCodeLimiter.delete(clientKey);
    console.error('[SMS] send failed:', error.code || 'UNKNOWN', error.message || '');
    const status = error.code === 'SMS_NOT_CONFIGURED' ? 503 : 502;
    return jsonResponse(res, status, {
      ok: false,
      error: status === 503 ? '短信服务尚未配置完成' : '短信发送失败，请稍后重试',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!isValidPhone(phone) || !/^\d{4,8}$/.test(code)) {
    return jsonResponse(res, 400, { ok: false, error: '手机号或验证码格式不正确' });
  }
  const clientKey = `${getClientIp(req)}:${phone}`;
  if (!consumeRateLimit(loginLimiter, clientKey, 60_000, 5)) {
    return jsonResponse(res, 429, { ok: false, error: '验证次数过多，请稍后再试' });
  }

  try {
    const result = await verifySms(phone, code);
    if (!result.accepted) return jsonResponse(res, 401, { ok: false, error: '验证码错误或已过期' });

    const timestamp = nowIso();
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    let userId = existing?.id;
    if (userId) {
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(timestamp, userId);
    } else {
      const created = db.prepare('INSERT INTO users (phone, created_at, last_login_at) VALUES (?, ?, ?)')
        .run(phone, timestamp, timestamp);
      userId = created.lastInsertRowid;
    }
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(timestamp);
    const session = createSession(userId);
    setSessionCookie(res, session.token, session.expiresAt);
    const loggedInUser = db.prepare(`
      SELECT id, phone, created_at, last_login_at, energy_balance, membership_expires_at, membership_plan, role, entitlements_json
      FROM users WHERE id = ?
    `).get(userId);
    const publicAccount = publicUser(loggedInUser);
    try {
      return res.json(accountResponse(req, publicAccount, {
        expiresAt: session.expiresAt,
        membershipExpiresAt: publicAccount.membership_expires_at,
        membershipPlan: publicAccount.membership_plan,
        membershipStatus: publicAccount.membership_status,
      }));
    } catch (error) {
      if (error.code === 'ACCOUNT_AUDIENCE_INVALID') {
        return jsonResponse(res, 400, { ok: false, error: '未知产品受众' });
      }
      throw error;
    }
  } catch (error) {
    console.error('[SMS] verify failed:', error.code || 'UNKNOWN', error.message || '');
    const status = error.code === 'SMS_NOT_CONFIGURED' ? 503 : 502;
    return jsonResponse(res, status, {
      ok: false,
      error: status === 503 ? '短信服务尚未配置完成' : '验证码校验失败，请稍后重试',
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = userFromRequest(req);
  if (!user) {
    logAccountMeDiagnostic(req, null, 'anonymous', null);
    return sendAccountSnapshotJson(res, 200, { ok: true, user: null, server_time: nowIso() });
  }
  try {
    const response = accountResponse(req, user);
    logAccountMeDiagnostic(req, user, 'ok', response.account_license);
    return sendAccountSnapshotJson(res, 200, response);
  } catch (error) {
    if (error.code === 'ACCOUNT_AUDIENCE_INVALID') {
      logAccountMeDiagnostic(req, user, 'invalid_audience', null);
      return sendAccountSnapshotJson(res, 400, { ok: false, error: '未知产品受众' });
    }
    console.error('[ACCOUNT] snapshot response failed:', error.code || 'UNKNOWN', error.message || '');
    logAccountMeDiagnostic(req, user, error.code || 'server_error', null);
    return sendAccountSnapshotJson(res, 503, { ok: false, error: '账号权益服务暂时不可用' });
  }
});

app.post('/api/auth/web-handoff', requireUser, (req, res) => {
  const clientKey = `${req.user.id}:${getClientIp(req)}`;
  if (!consumeRateLimit(handoffLimiter, clientKey, 60_000, 8)) {
    return jsonResponse(res, 429, { ok: false, error: '请求次数过多，请稍后再试' });
  }
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const ticket = crypto.randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM web_handoffs WHERE expires_at <= ?').run(createdAt);
  db.prepare('INSERT INTO web_handoffs (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(ticket), req.user.id, expiresAt, createdAt);
  const origin = String(process.env.PUBLIC_WEB_ORIGIN || 'https://anyq.site').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^/?#]+$/i.test(origin)) {
    return jsonResponse(res, 500, { ok: false, error: '账户网页地址配置错误' });
  }
  return res.json({ ok: true, continueUrl: `${origin}/account/continue#ticket=${ticket}` });
});

app.post('/api/auth/web-handoff/consume', (req, res) => {
  const ticket = String(req.body?.ticket || '').trim();
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(ticket)) {
    return jsonResponse(res, 400, { ok: false, error: '登录交接无效' });
  }
  const consume = db.transaction(() => {
    const timestamp = nowIso();
    const tokenHash = hashToken(ticket);
    const handoff = db.prepare('SELECT user_id FROM web_handoffs WHERE token_hash = ? AND expires_at > ? AND consumed_at IS NULL')
      .get(tokenHash, timestamp);
    if (!handoff) return null;
    const changed = db.prepare('UPDATE web_handoffs SET consumed_at = ? WHERE token_hash = ? AND consumed_at IS NULL')
      .run(timestamp, tokenHash);
    if (changed.changes !== 1) return null;
    return db.prepare(`
      SELECT id, phone, created_at, last_login_at, energy_balance, membership_expires_at, membership_plan, role, entitlements_json
      FROM users WHERE id = ?
    `).get(handoff.user_id);
  });
  const row = consume();
  if (!row) return jsonResponse(res, 401, { ok: false, error: '登录交接已失效' });
  const session = createSession(row.id);
  setSessionCookie(res, session.token, session.expiresAt);
  return res.json({ ok: true });
});

app.post('/api/auth/logout', requireUser, (req, res) => {
  const token = readCookie(req, COOKIE_NAME);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${parseBoolean(process.env.ALLOW_INSECURE_COOKIES, false) ? '' : '; Secure'}`);
  return res.json({ ok: true });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return jsonResponse(res, 400, { ok: false, error: '请求格式不正确' });
  }
  console.error('[API] unexpected error:', error);
  return jsonResponse(res, 500, { ok: false, error: '服务器暂时不可用' });
});

const runScheduledRetentionSweep = () => runRetentionSweep({
  db,
  readOssUploadConfig,
  createOssSignedUrl,
  logger: console,
}).catch((error) => console.error('[UPDATE] scheduled retention sweep failed:', error.message || error));
const retentionStartupTimer = setTimeout(runScheduledRetentionSweep, 10_000);
retentionStartupTimer.unref?.();
const retentionInterval = setInterval(runScheduledRetentionSweep, 6 * 60 * 60 * 1000);
retentionInterval.unref?.();

app.listen(PORT, '127.0.0.1', () => {
  const config = getSmsConfig();
  console.log(`[recharge-api] listening on 127.0.0.1:${PORT}; smsConfigured=${config.missing.length === 0}`);
});
