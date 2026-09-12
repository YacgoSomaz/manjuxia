'use strict';

const crypto = require('node:crypto');
const {
  AI_TASKS,
  AiContractError,
  normalizeAiJobRequest,
  normalizeOfficialVideoJobRequest,
  normalizeCreditAdjustment,
  publicAiTask,
} = require('./ai-contract');

class OfficialAiError extends Error {
  constructor(message, code = 'OFFICIAL_AI_ERROR', status = 400, details = null) {
    super(message);
    this.name = 'OfficialAiError';
    this.code = code;
    this.status = status;
    if (details && typeof details === 'object') this.details = details;
  }
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

function clamp(value, lower, upper) {
  return Math.max(lower, Math.min(upper, value));
}

function ensureOfficialAiSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_task_rules (
      task_type TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      credit_cost INTEGER NOT NULL,
      max_input_chars INTEGER NOT NULL,
      max_output_tokens INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      input_sha256 TEXT NOT NULL,
      credit_cost INTEGER NOT NULL,
      status TEXT NOT NULL,
      result_text TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      provider_request_id TEXT,
      failure_code TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      expires_at TEXT NOT NULL,
      UNIQUE(user_id, product_id, task_type, idempotency_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS ai_jobs_user_created_idx ON ai_jobs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS ai_jobs_status_created_idx ON ai_jobs(status, created_at);
    CREATE TABLE IF NOT EXISTS ai_credit_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      task_type TEXT,
      product_id TEXT,
      job_id TEXT,
      status TEXT NOT NULL,
      note TEXT,
      admin_user_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS ai_credit_ledger_user_created_idx ON ai_credit_ledger(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS ai_credit_ledger_job_idx ON ai_credit_ledger(job_id, created_at);
    CREATE TABLE IF NOT EXISTS ai_job_assets (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      object_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES ai_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS ai_job_assets_job_idx ON ai_job_assets(job_id, created_at);
    CREATE TABLE IF NOT EXISTS official_ai_model_configs (
      kind TEXT PRIMARY KEY CHECK(kind IN ('language', 'image')),
      enabled INTEGER NOT NULL DEFAULT 0,
      label TEXT NOT NULL,
      api_base_ciphertext TEXT NOT NULL,
      api_key_ciphertext TEXT NOT NULL,
      model_ciphertext TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const assetColumns = db.prepare('PRAGMA table_info(ai_job_assets)').all().map((column) => column.name);
  if (!assetColumns.includes('delivery_url')) {
    db.exec('ALTER TABLE ai_job_assets ADD COLUMN delivery_url TEXT');
  }
  const timestamp = nowIso();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO ai_task_rules
      (task_type, product_id, display_name, credit_cost, max_input_chars, max_output_tokens, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const seed = db.transaction(() => {
    for (const [taskType, task] of Object.entries(AI_TASKS)) {
      insert.run(taskType, task.productId, task.displayName, task.creditCost, task.maxInputChars, task.maxOutputTokens, timestamp, timestamp);
    }
  });
  seed();
  // Official pricing is centrally controlled.  Migrate existing deployments
  // instead of leaving pre-release image pricing in their SQLite databases.
  db.prepare(`UPDATE ai_task_rules SET credit_cost = 100, max_input_chars = 10000, updated_at = ? WHERE task_type = 'comic_image'`).run(timestamp);
  db.prepare(`UPDATE ai_task_rules SET credit_cost = 800, max_input_chars = 10000, updated_at = ? WHERE task_type = 'comic_video'`).run(timestamp);
}

function getTaskRule(db, taskType) {
  const row = db.prepare('SELECT * FROM ai_task_rules WHERE task_type = ?').get(taskType);
  const contract = AI_TASKS[taskType];
  if (!row || !contract || row.product_id !== contract.productId) {
    throw new OfficialAiError('官方AI任务配置无效', 'AI_TASK_RULE_INVALID', 503);
  }
  return {
    taskType,
    productId: row.product_id,
    displayName: row.display_name,
    creditCost: Number(row.credit_cost),
    maxInputChars: Number(row.max_input_chars),
    maxOutputTokens: Number(row.max_output_tokens),
    enabled: Number(row.enabled) === 1,
    entitlement: contract.entitlement,
    kind: contract.kind || 'text',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listTaskRules(db) {
  return Object.keys(AI_TASKS).map((taskType) => getTaskRule(db, taskType));
}

function configMasterKey(env) {
  const source = String(env.OFFICIAL_AI_CONFIG_MASTER_KEY || '').trim();
  if (!source) throw new OfficialAiError('服务器未配置模型加密主密钥', 'AI_CONFIG_KEY_UNAVAILABLE', 503);
  return crypto.createHash('sha256').update(source, 'utf8').digest();
}

function encryptModelConfigValue(value, env) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', configMasterKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decryptModelConfigValue(value, env) {
  const [version, ivValue, tagValue, ciphertext] = String(value || '').split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertext) throw new OfficialAiError('官方模型配置无法解密', 'AI_CONFIG_DECRYPT_FAILED', 503);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', configMasterKey(env), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new OfficialAiError('官方模型配置无法解密', 'AI_CONFIG_DECRYPT_FAILED', 503);
  }
}

function legacyModelConfig(env, kind) {
  const image = kind === 'image';
  const prefix = image ? 'OFFICIAL_IMAGE_' : 'OFFICIAL_AI_';
  const enabled = parseBoolean(env[`${prefix}ENABLED`], false);
  const apiBase = String(env[`${prefix}API_BASE`] || '').trim().replace(/\/+$/, '');
  const apiKey = String(env[`${prefix}API_KEY`] || '').trim();
  const model = String(env[`${prefix}MODEL`] || '').trim();
  const labelKey = image ? 'OFFICIAL_IMAGE_MODEL_LABEL' : 'OFFICIAL_AI_MODEL_LABEL';
  const fallbackLabel = image ? '官方 Image2' : '官方 AI 算力';
  return {
    enabled,
    configured: enabled && Boolean(apiBase && apiKey && model),
    provider: 'openai_compatible',
    label: String(env[labelKey] || fallbackLabel).trim().slice(0, 80) || fallbackLabel,
    apiBase,
    apiKey,
    model,
  };
}

function storedModelConfig(db, env, kind) {
  if (!db) return null;
  const row = db.prepare('SELECT * FROM official_ai_model_configs WHERE kind = ?').get(kind);
  if (!row) return null;
  const apiBase = decryptModelConfigValue(row.api_base_ciphertext, env);
  const apiKey = decryptModelConfigValue(row.api_key_ciphertext, env);
  const model = decryptModelConfigValue(row.model_ciphertext, env);
  return {
    enabled: Number(row.enabled) === 1,
    configured: Number(row.enabled) === 1 && Boolean(apiBase && apiKey && model),
    provider: 'openai_compatible',
    label: String(row.label || '').trim().slice(0, 80) || (kind === 'image' ? 'Image-2' : '官方 AI 算力'),
    apiBase,
    apiKey,
    model,
  };
}

function normalizeModelConfigInput(body) {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  if (!raw || !['language', 'image'].includes(raw.kind)) throw new OfficialAiError('模型类型无效', 'AI_CONFIG_INVALID', 400);
  if (typeof raw.enabled !== 'boolean') throw new OfficialAiError('启用状态必须是布尔值', 'AI_CONFIG_INVALID', 400);
  const label = String(raw.label || '').trim();
  const apiBase = String(raw.api_base || '').trim().replace(/\/+$/, '');
  const apiKey = String(raw.api_key || '').trim();
  const model = String(raw.model || '').trim();
  if (!label || label.length > 80) throw new OfficialAiError('显示名称长度必须是1至80个字符', 'AI_CONFIG_INVALID', 400);
  let parsed;
  try { parsed = new URL(apiBase); } catch { throw new OfficialAiError('模型地址必须是有效 HTTPS 地址', 'AI_CONFIG_INVALID', 400); }
  if (parsed.protocol !== 'https:' || apiBase.length > 240) throw new OfficialAiError('模型地址必须是有效 HTTPS 地址', 'AI_CONFIG_INVALID', 400);
  if (apiKey.length < 12 || apiKey.length > 512 || /\s/.test(apiKey)) throw new OfficialAiError('密钥格式无效', 'AI_CONFIG_INVALID', 400);
  if (!/^[A-Za-z0-9._:-]{1,120}$/.test(model)) throw new OfficialAiError('模型标识格式无效', 'AI_CONFIG_INVALID', 400);
  return { kind: raw.kind, enabled: raw.enabled, label, apiBase, apiKey, model };
}

function saveOfficialAiModelConfig(db, body, env = process.env, timestamp = nowIso()) {
  const config = normalizeModelConfigInput(body);
  // Resolve the master key before writes, so an incomplete server setup never stores unreadable records.
  configMasterKey(env);
  db.prepare(`
    INSERT INTO official_ai_model_configs
      (kind, enabled, label, api_base_ciphertext, api_key_ciphertext, model_ciphertext, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(kind) DO UPDATE SET
      enabled = excluded.enabled,
      label = excluded.label,
      api_base_ciphertext = excluded.api_base_ciphertext,
      api_key_ciphertext = excluded.api_key_ciphertext,
      model_ciphertext = excluded.model_ciphertext,
      updated_at = excluded.updated_at
  `).run(
    config.kind,
    Number(config.enabled),
    config.label,
    encryptModelConfigValue(config.apiBase, env),
    encryptModelConfigValue(config.apiKey, env),
    encryptModelConfigValue(config.model, env),
    timestamp,
    timestamp,
  );
  const saved = storedModelConfig(db, env, config.kind);
  return { kind: config.kind, enabled: saved.enabled, configured: saved.configured, label: saved.label };
}

function readOfficialAiConfig(env = process.env, db = null) {
  const language = storedModelConfig(db, env, 'language') || legacyModelConfig(env, 'language');
  const languageDeepseek = {
    enabled: parseBoolean(env.OFFICIAL_DEEPSEEK_ENABLED, false),
    configured: false,
    provider: 'deepseek_openai_compatible',
    label: String(env.OFFICIAL_DEEPSEEK_LABEL || '官方 DeepSeek V4.1').trim().slice(0, 80) || '官方 DeepSeek V4.1',
    apiBase: String(env.OFFICIAL_DEEPSEEK_API_BASE || 'https://api.deepseek.com').trim().replace(/\/+$/, ''),
    apiKey: String(env.OFFICIAL_DEEPSEEK_API_KEY || '').trim(),
    model: String(env.OFFICIAL_DEEPSEEK_MODEL || 'deepseek-v4-pro').trim(),
    // Long-form storyboard output needs materially longer than the shared
    // 90-second default. This stays server-side and applies only to DeepSeek.
    timeoutMs: clamp(parseInteger(env.OFFICIAL_DEEPSEEK_TIMEOUT_MS, 300_000), 10_000, 600_000),
  };
  languageDeepseek.configured = languageDeepseek.enabled && Boolean(languageDeepseek.apiBase && languageDeepseek.apiKey && languageDeepseek.model);
  const image = storedModelConfig(db, env, 'image') || legacyModelConfig(env, 'image');
  const imageSeedream2 = {
    enabled: parseBoolean(env.OFFICIAL_IMAGE_SEEDREAM2_ENABLED, false),
    configured: false,
    provider: 'volcengine_ark',
    label: String(env.OFFICIAL_IMAGE_SEEDREAM2_LABEL || '官方 Seedream5').trim().slice(0, 80) || '官方 Seedream5',
    apiBase: String(env.OFFICIAL_IMAGE_SEEDREAM2_BASE || 'https://ark.cn-beijing.volces.com/api/v3').trim().replace(/\/+$/, ''),
    apiKey: String(env.OFFICIAL_IMAGE_SEEDREAM2_KEY || '').trim(),
    model: String(env.OFFICIAL_IMAGE_SEEDREAM2_MODEL || '').trim(),
  };
  imageSeedream2.configured = imageSeedream2.enabled && Boolean(imageSeedream2.apiBase && imageSeedream2.apiKey && imageSeedream2.model);
  // 视频密钥只允许由服务器环境变量提供，绝不写入客户端或本地模型配置。
  const videoNewApi = {
    enabled: parseBoolean(env.OFFICIAL_VIDEO_NEWAPI_ENABLED, false),
    provider: 'newapi', label: String(env.OFFICIAL_VIDEO_NEWAPI_LABEL || '官方 NewAPI 视频').slice(0, 80),
    apiBase: String(env.OFFICIAL_VIDEO_NEWAPI_BASE || '').trim().replace(/\/+$/, ''),
    apiKey: String(env.OFFICIAL_VIDEO_NEWAPI_KEY || '').trim(),
    model: String(env.OFFICIAL_VIDEO_NEWAPI_MODEL || '').trim(),
  };
  videoNewApi.configured = videoNewApi.enabled && Boolean(videoNewApi.apiBase && videoNewApi.apiKey && videoNewApi.model);
  const videoArk = {
    enabled: parseBoolean(env.OFFICIAL_VIDEO_ARK_ENABLED, false),
    provider: 'volcengine_ark', label: String(env.OFFICIAL_VIDEO_ARK_LABEL || '官方火山方舟即梦').slice(0, 80),
    apiBase: String(env.OFFICIAL_VIDEO_ARK_BASE || 'https://ark.cn-beijing.volces.com/api/v3').trim().replace(/\/+$/, ''),
    apiKey: String(env.OFFICIAL_VIDEO_ARK_KEY || '').trim(),
    model: String(env.OFFICIAL_VIDEO_ARK_MODEL || '').trim(),
  };
  videoArk.configured = videoArk.enabled && Boolean(videoArk.apiBase && videoArk.apiKey && videoArk.model);
  return {
    enabled: language.enabled,
    configured: language.configured,
    provider: language.provider,
    label: language.label,
    apiBase: language.apiBase,
    apiKey: language.apiKey,
    model: language.model,
    languageDeepseek,
    timeoutMs: clamp(parseInteger(env.OFFICIAL_AI_TIMEOUT_MS, 90_000), 10_000, 180_000),
    image,
    imageSeedream2,
    video: { configured: videoNewApi.configured || videoArk.configured, providers: [videoNewApi, videoArk].filter((item) => item.configured) },
  };
}

function publicOfficialAiConfig(config) {
  return {
    enabled: Boolean(config.enabled),
    configured: Boolean(config.configured),
    provider: config.provider,
    label: config.label,
    models: {
      language: {
        configured: Boolean(config.configured),
        label: config.label,
      },
      language_deepseek: {
        configured: Boolean(config.languageDeepseek?.configured),
        label: config.languageDeepseek?.label || '官方 DeepSeek V4.1',
      },
      image: {
        configured: Boolean(config.image?.configured),
        label: config.image?.label || 'Image-2',
        status: 'reserved',
      },
      image_seedream2: { configured: Boolean(config.imageSeedream2?.configured), label: config.imageSeedream2?.label || '官方 Seedream5' },
      video: { configured: Boolean(config.video?.configured), providers: (config.video?.providers || []).map(({ provider, label, model }) => ({ provider, label, model })) },
    },
  };
}

function publicTaskRule(rule, config) {
  return publicAiTask({ ...rule, modelConfigured: Boolean(officialConfigForTask(config, rule.taskType || rule.task_type)?.configured) });
}

function officialConfigForTask(config, taskType) {
  if (taskType === 'comic_creation_deepseek_v41') return config.languageDeepseek;
  const task = AI_TASKS[taskType];
  if (task?.kind === 'image') return taskType === 'comic_image_seedream2' ? config.imageSeedream2 : config.image;
  if (task?.kind === 'video') return config.video;
  return config;
}

function normalizeTaskRulePatch(taskType, body) {
  const base = AI_TASKS[taskType];
  if (!base) throw new OfficialAiError('未知官方AI任务', 'AI_TASK_UNKNOWN', 404);
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  if (!raw) throw new OfficialAiError('任务配置格式无效', 'AI_TASK_RULE_INVALID', 400);
  const next = {};
  if (Object.prototype.hasOwnProperty.call(raw, 'enabled')) {
    if (typeof raw.enabled !== 'boolean') throw new OfficialAiError('启用状态必须是布尔值', 'AI_TASK_RULE_INVALID', 400);
    next.enabled = raw.enabled;
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'credit_cost')) {
    const creditCost = Number(raw.credit_cost);
    if (!Number.isInteger(creditCost) || creditCost < 1 || creditCost > 10_000) {
      throw new OfficialAiError('单次积分必须是1至10000的整数', 'AI_TASK_RULE_INVALID', 400);
    }
    next.creditCost = creditCost;
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'max_input_chars')) {
    const maxInputChars = Number(raw.max_input_chars);
    if (!Number.isInteger(maxInputChars) || maxInputChars < 1_000 || maxInputChars > 40_000) {
      throw new OfficialAiError('最大输入长度必须是1000至40000的整数', 'AI_TASK_RULE_INVALID', 400);
    }
    next.maxInputChars = maxInputChars;
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'max_output_tokens')) {
    const maxOutputTokens = Number(raw.max_output_tokens);
    if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 256 || maxOutputTokens > 8_000) {
      throw new OfficialAiError('最大输出长度必须是256至8000的整数', 'AI_TASK_RULE_INVALID', 400);
    }
    next.maxOutputTokens = maxOutputTokens;
  }
  if (!Object.keys(next).length) throw new OfficialAiError('没有可更新的任务配置', 'AI_TASK_RULE_INVALID', 400);
  return next;
}

function updateTaskRule(db, taskType, patch, timestamp = nowIso()) {
  const current = getTaskRule(db, taskType);
  const next = normalizeTaskRulePatch(taskType, patch);
  db.prepare(`
    UPDATE ai_task_rules SET credit_cost = ?, max_input_chars = ?, max_output_tokens = ?, enabled = ?, updated_at = ?
    WHERE task_type = ?
  `).run(
    next.creditCost ?? current.creditCost,
    next.maxInputChars ?? current.maxInputChars,
    next.maxOutputTokens ?? current.maxOutputTokens,
    next.enabled === undefined ? Number(current.enabled) : Number(next.enabled),
    timestamp,
    taskType,
  );
  return getTaskRule(db, taskType);
}

function resolveAiJob(db, body) {
  let job;
  try {
    job = normalizeAiJobRequest(body);
  } catch (error) {
    if (error instanceof AiContractError) throw new OfficialAiError(error.message, error.code, 400);
    throw error;
  }
  const rule = getTaskRule(db, job.taskType);
  if (rule.productId !== job.productId) throw new OfficialAiError('该AI任务不属于当前软件', 'AI_PRODUCT_MISMATCH', 400);
  if (!rule.enabled) throw new OfficialAiError('该官方AI服务暂未开放', 'AI_TASK_DISABLED', 403);
  if (job.inputText.length > rule.maxInputChars) throw new OfficialAiError('输入内容超过当前服务限制', 'AI_INPUT_TOO_LARGE', 413);
  return { ...job, creditCost: rule.creditCost, maxOutputTokens: rule.maxOutputTokens, rule };
}

function resolveOfficialVideoJob(db, body) {
  let job;
  try { job = normalizeOfficialVideoJobRequest(body); }
  catch (error) {
    if (error instanceof AiContractError) throw new OfficialAiError(error.message, error.code, 400);
    throw error;
  }
  const rule = getTaskRule(db, job.taskType);
  if (!rule.enabled) throw new OfficialAiError('该官方视频服务暂未开放', 'AI_TASK_DISABLED', 403);
  if (job.inputText.length > rule.maxInputChars) throw new OfficialAiError('输入内容超过当前服务限制', 'AI_INPUT_TOO_LARGE', 413);
  return { ...job, creditCost: rule.creditCost, maxOutputTokens: rule.maxOutputTokens, rule };
}

function hasActiveProduct(db, userId, productId, currentIso = nowIso()) {
  const row = db.prepare('SELECT expires_at, entitlements_json FROM user_products WHERE user_id = ? AND product_id = ?').get(userId, productId);
  if (!row || Date.parse(row.expires_at) <= Date.parse(currentIso)) return false;
  try {
    const entitlements = JSON.parse(row.entitlements_json || '[]');
    return Array.isArray(entitlements) && entitlements.includes(AI_TASKS[Object.keys(AI_TASKS).find((key) => AI_TASKS[key].productId === productId)]?.entitlement);
  } catch {
    return false;
  }
}

function activeProductForTask(db, userId, taskType, currentIso = nowIso()) {
  const task = AI_TASKS[taskType];
  if (!task) return false;
  const row = db.prepare('SELECT expires_at, entitlements_json FROM user_products WHERE user_id = ? AND product_id = ?').get(userId, task.productId);
  if (!row || Date.parse(row.expires_at) <= Date.parse(currentIso)) return false;
  try {
    const entitlements = JSON.parse(row.entitlements_json || '[]');
    return Array.isArray(entitlements) && entitlements.includes(task.entitlement);
  } catch {
    return false;
  }
}

function reserveAiJob(db, userId, job, timestamp = nowIso()) {
  const reserve = db.transaction(() => {
    const existing = db.prepare(`
      SELECT * FROM ai_jobs WHERE user_id = ? AND product_id = ? AND task_type = ? AND idempotency_key = ?
    `).get(userId, job.productId, job.taskType, job.idempotencyKey);
    if (existing) return { existing: true, job: existing };
    const user = db.prepare('SELECT energy_balance FROM users WHERE id = ?').get(userId);
    if (!user) throw new OfficialAiError('账号不存在', 'AI_ACCOUNT_NOT_FOUND', 401);
    const balance = Number(user.energy_balance || 0);
    if (balance < job.creditCost) throw new OfficialAiError('算力积分不足，请先充值或联系管理员', 'AI_CREDITS_INSUFFICIENT', 402);
    const balanceAfter = balance - job.creditCost;
    const jobId = crypto.randomUUID();
    const expiresAt = new Date(Date.parse(timestamp) + 24 * 60 * 60 * 1000).toISOString();
    const inputSha256 = crypto.createHash('sha256').update(job.inputText, 'utf8').digest('hex');
    db.prepare('UPDATE users SET energy_balance = ? WHERE id = ?').run(balanceAfter, userId);
    db.prepare(`
      INSERT INTO ai_jobs
        (id, user_id, product_id, task_type, idempotency_key, input_sha256, credit_cost, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, ?)
    `).run(jobId, userId, job.productId, job.taskType, job.idempotencyKey, inputSha256, job.creditCost, timestamp, expiresAt);
    db.prepare(`
      INSERT INTO ai_credit_ledger
        (user_id, delta, balance_after, reason, task_type, product_id, job_id, status, created_at)
      VALUES (?, ?, ?, 'official_ai', ?, ?, ?, 'reserved', ?)
    `).run(userId, -job.creditCost, balanceAfter, job.taskType, job.productId, jobId, timestamp);
    return { existing: false, job: db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) };
  });
  return reserve();
}

function settleAiJob(db, jobId, result, timestamp = nowIso()) {
  db.transaction(() => {
    const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId);
    if (!job || job.status !== 'running') return;
    db.prepare(`
      UPDATE ai_jobs SET status = 'succeeded', result_text = ?, input_tokens = ?, output_tokens = ?, provider_request_id = ?, completed_at = ?
      WHERE id = ?
    `).run(result.text, result.inputTokens ?? null, result.outputTokens ?? null, result.providerRequestId ?? null, timestamp, jobId);
    db.prepare(`UPDATE ai_credit_ledger SET status = 'settled' WHERE job_id = ? AND reason = 'official_ai' AND status = 'reserved'`).run(jobId);
  })();
}

function refundAiJob(db, jobId, code = 'AI_UPSTREAM_FAILED', timestamp = nowIso()) {
  db.transaction(() => {
    const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId);
    if (!job || job.status !== 'running') return;
    const user = db.prepare('SELECT energy_balance FROM users WHERE id = ?').get(job.user_id);
    if (!user) return;
    const balanceAfter = Number(user.energy_balance || 0) + Number(job.credit_cost || 0);
    db.prepare('UPDATE users SET energy_balance = ? WHERE id = ?').run(balanceAfter, job.user_id);
    db.prepare(`UPDATE ai_credit_ledger SET status = 'refunded' WHERE job_id = ? AND reason = 'official_ai' AND status = 'reserved'`).run(jobId);
    db.prepare(`
      INSERT INTO ai_credit_ledger
        (user_id, delta, balance_after, reason, task_type, product_id, job_id, status, note, created_at)
      VALUES (?, ?, ?, 'official_ai_refund', ?, ?, ?, 'settled', ?, ?)
    `).run(job.user_id, Number(job.credit_cost || 0), balanceAfter, job.task_type, job.product_id, jobId, code, timestamp);
    db.prepare(`UPDATE ai_jobs SET status = 'failed', failure_code = ?, completed_at = ? WHERE id = ?`).run(code, timestamp, jobId);
  })();
}

function refundStaleAiJobs(db, timestamp = nowIso()) {
  const deadline = new Date(Date.parse(timestamp) - 15 * 60 * 1000).toISOString();
  const jobs = db.prepare(`SELECT id FROM ai_jobs WHERE status = 'running' AND created_at < ?`).all(deadline);
  for (const job of jobs) refundAiJob(db, job.id, 'AI_JOB_INTERRUPTED', timestamp);
  return jobs.length;
}

function cleanupExpiredAiJobs(db, timestamp = nowIso()) {
  const result = db.prepare(`
    DELETE FROM ai_jobs
    WHERE status <> 'running' AND expires_at < ?
  `).run(timestamp);
  return Number(result.changes || 0);
}

function adjustCredits(db, adminUserId, body, findOrCreateUser, timestamp = nowIso()) {
  let input;
  try {
    input = normalizeCreditAdjustment(body);
  } catch (error) {
    if (error instanceof AiContractError) throw new OfficialAiError(error.message, error.code, 400);
    throw error;
  }
  return db.transaction(() => {
    const target = findOrCreateUser(input.phone, timestamp);
    const current = db.prepare('SELECT energy_balance FROM users WHERE id = ?').get(target.id);
    const balanceAfter = Number(current?.energy_balance || 0) + input.delta;
    if (balanceAfter < 0) throw new OfficialAiError('扣减后积分不能小于0', 'AI_CREDITS_NEGATIVE', 409);
    db.prepare('UPDATE users SET energy_balance = ? WHERE id = ?').run(balanceAfter, target.id);
    db.prepare(`
      INSERT INTO ai_credit_ledger
        (user_id, delta, balance_after, reason, status, note, admin_user_id, created_at)
      VALUES (?, ?, ?, 'admin_adjustment', 'settled', ?, ?, ?)
    `).run(target.id, input.delta, balanceAfter, input.note, adminUserId, timestamp);
    return { user: target, delta: input.delta, balance: balanceAfter, note: input.note };
  })();
}

function getCreditLedger(db, phone, limit = 20) {
  const safeLimit = clamp(parseInteger(limit, 20), 1, 100);
  const user = db.prepare('SELECT id, phone, energy_balance FROM users WHERE phone = ?').get(phone);
  if (!user) return { user: null, ledger: [] };
  const ledger = db.prepare(`
    SELECT delta, balance_after, reason, task_type, product_id, status, note, created_at
    FROM ai_credit_ledger WHERE user_id = ? ORDER BY id DESC LIMIT ?
  `).all(user.id, safeLimit);
  return { user: { phone: user.phone, balance: Number(user.energy_balance || 0) }, ledger };
}

const AI_SYSTEM_PROMPTS = Object.freeze({
  replay_report: '你是直播复盘专家。只依据用户提供的转写和数据，输出结构清晰、可执行的中文复盘报告；不编造未提供的数据。',
  replay_advisor: '你是直播专场顾问。仅根据用户提供的直播上下文，用简洁中文给出可执行建议；不承诺无法验证的结果。',
  comic_creation: '你是漫剧创作助手。根据用户提供的素材输出结构化中文创作建议，尊重用户原始设定，不复制受版权保护的长篇文本。',
  operation_analysis: '你是内容运营分析助手。根据用户提供的数据给出可执行的中文分析与下一步建议，不虚构指标。',
});

function extractCompletionText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const joined = content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('').trim();
    if (joined) return joined;
  }
  throw new OfficialAiError('官方AI没有返回可用内容', 'AI_UPSTREAM_EMPTY', 502);
}

async function callOfficialAi(config, job) {
  if (!config.configured) throw new OfficialAiError('官方AI算力暂未配置', 'AI_NOT_CONFIGURED', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const requestBody = {
      model: config.model,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPTS[job.task_type] || AI_SYSTEM_PROMPTS.comic_creation },
        { role: 'user', content: job.input_text },
      ],
      max_tokens: job.max_output_tokens,
      temperature: 0.35,
    };
    // DeepSeek V4 enables thinking by default. For a long storyboard prompt,
    // that hidden reasoning can consume the whole output allowance and leave
    // `message.content` empty. This production task needs final text, not a
    // reasoning trace, so explicitly select its non-thinking mode.
    if (config.provider === 'deepseek_openai_compatible') {
      requestBody.thinking = { type: 'disabled' };
    }
    const response = await fetch(`${config.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Idempotency-Key': job.id,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new OfficialAiError('官方AI服务暂时不可用', response.status === 429 ? 'AI_UPSTREAM_RATE_LIMITED' : 'AI_UPSTREAM_FAILED', 502);
    return {
      text: extractCompletionText(payload),
      inputTokens: Number(payload?.usage?.prompt_tokens) || null,
      outputTokens: Number(payload?.usage?.completion_tokens) || null,
      providerRequestId: String(response.headers.get('x-request-id') || payload?.id || '').slice(0, 160) || null,
    };
  } catch (error) {
    if (error instanceof OfficialAiError) throw error;
    if (error?.name === 'AbortError') throw new OfficialAiError('官方AI响应超时，积分将自动退回', 'AI_UPSTREAM_TIMEOUT', 504);
    throw new OfficialAiError('官方AI服务暂时不可用，积分将自动退回', 'AI_UPSTREAM_FAILED', 502);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeOfficialImageResult(payload) {
  const findUrl = (value, depth = 0) => {
    if (depth > 5 || value == null) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed;
      const embedded = trimmed.match(/https?:\/\/[^\s"'<>\\]+/i);
      return embedded ? embedded[0] : '';
    }
    if (Array.isArray(value)) {
      for (const item of value) { const found = findUrl(item, depth + 1); if (found) return found; }
      return '';
    }
    if (typeof value !== 'object') return '';
    for (const key of ['url', 'image_url', 'imageUrl', 'display_url', 'download_url', 'output_url', 'result_url', 'uri', 'href']) {
      if (typeof value[key] === 'string' && /^https?:\/\//i.test(value[key].trim())) return value[key].trim();
    }
    for (const key of ['data', 'images', 'image', 'output', 'outputs', 'result', 'results', 'assets', 'artifacts', 'files']) {
      const found = findUrl(value[key], depth + 1); if (found) return found;
    }
    // OpenAI-compatible relays frequently wrap the standard payload in a
    // provider-specific key (for example response/content/payload).  Search
    // all remaining values instead of treating a valid nested CDN URL as an
    // unsupported result.  Deliberately skip base64 fields: production stays
    // URL-only and never relays image bytes through this server.
    for (const [key, item] of Object.entries(value)) {
      if (/b64|base64/i.test(key)) continue;
      const found = findUrl(item, depth + 1); if (found) return found;
    }
    return '';
  };
  const imageUrl = findUrl(payload);
  if (imageUrl) {
    let deliveryUrl;
    try { deliveryUrl = new URL(imageUrl); } catch {
      throw new OfficialAiError('官方图片服务返回了无效地址', 'AI_IMAGE_RESULT_UNSUPPORTED', 502);
    }
    if (deliveryUrl.protocol !== 'https:' || deliveryUrl.username || deliveryUrl.password || deliveryUrl.toString().length > 4096) {
      throw new OfficialAiError('官方图片服务返回了不安全地址', 'AI_IMAGE_RESULT_UNSUPPORTED', 502);
    }
    return { deliveryUrl: deliveryUrl.toString(), buffer: null, mimeType: 'image/png', width: 1024, height: 1024 };
  }
  // Keep the production path URL-only so generated image bytes never pass through
  // the official server. Base64 is opt-in for emergency provider compatibility.
  const item = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (process.env.OFFICIAL_AI_ALLOW_BASE64_IMAGE !== '1') {
    throw new OfficialAiError('官方图片服务未返回可用图片 URL', 'AI_IMAGE_RESULT_UNSUPPORTED', 502);
  }
  if (!item || typeof item.b64_json !== 'string' || !item.b64_json) {
    throw new OfficialAiError('官方图片服务未返回可保存的图片数据', 'AI_IMAGE_RESULT_UNSUPPORTED', 502);
  }
  const buffer = Buffer.from(item.b64_json, 'base64');
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
    throw new OfficialAiError('官方图片结果大小无效', 'AI_IMAGE_RESULT_INVALID', 502);
  }
  return { deliveryUrl: null, buffer, mimeType: 'image/png', width: 1024, height: 1024 };
}

function buildSafeOfficialImagePrompt(input) {
  const original = String(input || '').trim();
  const rewritten = original
    .replace(/机动车驾驶证|驾驶证|驾照/gi, '完全虚构、不可使用的影视道具资格卡')
    .replace(/居民身份证|身份证|护照/gi, '完全虚构、不可使用的影视道具身份卡')
    .replace(/银行卡|信用卡/gi, '完全虚构、不可使用的影视道具卡片')
    .replace(/政府徽章|官方徽章|国徽/gi, '虚构装饰图案')
    .replace(/驾驶资格凭证/gi, '剧情线索道具');
  return [
    'SAFETY FALLBACK — FICTIONAL MOVIE PROP ONLY. This image must not depict a real or usable identity, financial, medical, legal, or government document.',
    '仅用于虚构影视美术设计。所有证件、卡片、票据和界面均为不可在现实中使用的虚构道具；不得出现真实个人信息、真实编号、政府标识、条形码、二维码或可读取的敏感文字。',
    rewritten,
    '保持原提示词的主体、时代、构图、材质、光影和画质要求；如画面包含文字或编号，一律处理为模糊、抽象且不可辨认的虚构符号。',
  ].filter(Boolean).join('\n\n');
}

function officialImageUpstreamError(response, payload) {
  const providerError = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload.error && typeof payload.error === 'object' ? payload.error : payload)
    : {};
  const providerCode = String(providerError.code || '').trim().slice(0, 120);
  const providerMessage = String(providerError.message || '').trim().slice(0, 500);
  const requestId = String(response.headers.get('x-request-id') || payload?.id || '').trim().slice(0, 160);
  const details = { provider_status: response.status, provider_code: providerCode, provider_message: providerMessage, provider_request_id: requestId };
  if (response.status === 429) {
    return new OfficialAiError('官方图片服务繁忙，请稍后重试', 'AI_UPSTREAM_RATE_LIMITED', 502, details);
  }
  if (response.status === 400 && (/IMAGE_BAD_REQUEST/i.test(providerCode) || /policy|safety|安全|无法生成/i.test(providerMessage))) {
    return new OfficialAiError('图片提示词触发上游安全限制', 'AI_IMAGE_PROMPT_REJECTED', 422, details);
  }
  if ([401, 403].includes(response.status)) {
    return new OfficialAiError('官方图片服务认证失败', 'AI_UPSTREAM_AUTH_FAILED', 502, details);
  }
  if ([408, 524].includes(response.status)) {
    // 524 is the gateway's upstream-processing timeout, not a malformed
    // client payload. Surface it accurately so users can retry safely.
    return new OfficialAiError('官方图片服务响应超时，请稍后重试', 'AI_UPSTREAM_TIMEOUT', 504, details);
  }
  if ([425, 500, 502, 503, 504].includes(response.status)) {
    return new OfficialAiError('官方图片服务暂时不可用', 'AI_UPSTREAM_FAILED', 502, details);
  }
  return new OfficialAiError('官方图片请求未被上游接受', 'AI_UPSTREAM_BAD_REQUEST', 502, details);
}

function officialImageSize(config) {
  // Seedream inference endpoints reject the legacy 1024×1024 payload: their
  // minimum is 3,686,400 pixels.  1920×1920 meets that documented limit
  // exactly while preserving a neutral canvas for character/scene prompts.
  const raw = String(config?.imageSize || '1920x1920').trim().toLowerCase();
  const match = /^(\d{3,5})x(\d{3,5})$/.exec(raw);
  if (!match) return '1920x1920';
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width * height < 3_686_400) {
    return '1920x1920';
  }
  return `${width}x${height}`;
}

async function callOfficialImage(config, job) {
  if (!config?.configured) throw new OfficialAiError('官方图片算力暂未配置', 'AI_IMAGE_NOT_CONFIGURED', 503);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300_000);
  try {
    const response = await fetch(`${config.apiBase}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}`, 'Idempotency-Key': job.id },
      body: JSON.stringify({
        model: config.model,
        prompt: job.input_text,
        size: officialImageSize(config),
        n: 1,
        response_format: 'url',
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw officialImageUpstreamError(response, payload);
    const image = normalizeOfficialImageResult(payload);
    return { ...image, providerRequestId: String(response.headers.get('x-request-id') || payload?.id || '').slice(0, 160) || null };
  } catch (error) {
    if (error instanceof OfficialAiError) throw error;
    if (error?.name === 'AbortError') throw new OfficialAiError('官方图片响应超时，积分将自动退回', 'AI_UPSTREAM_TIMEOUT', 504);
    throw new OfficialAiError('官方图片服务暂时不可用，积分将自动退回', 'AI_UPSTREAM_FAILED', 502);
  } finally {
    clearTimeout(timer);
  }
}

function saveAiJobAsset(db, { jobId, userId, productId, objectKey, deliveryUrl = null, mimeType, sizeBytes, width, height, expiresAt, id = crypto.randomUUID() }, timestamp = nowIso()) {
  db.prepare(`
    INSERT INTO ai_job_assets (id, job_id, user_id, product_id, object_key, delivery_url, mime_type, size_bytes, width, height, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, jobId, userId, productId, objectKey, deliveryUrl || null, mimeType, sizeBytes, width || null, height || null, timestamp, expiresAt);
  return db.prepare('SELECT * FROM ai_job_assets WHERE id = ?').get(id);
}

function listAiJobAssets(db, jobId) {
  return db.prepare('SELECT * FROM ai_job_assets WHERE job_id = ? ORDER BY created_at ASC').all(jobId);
}

function publicJob(row, assets = []) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    task_type: row.task_type,
    status: row.status,
    credits: Number(row.credit_cost || 0),
    result_text: row.status === 'succeeded' ? row.result_text : undefined,
    failure_code: row.status === 'failed' ? row.failure_code : undefined,
    created_at: row.created_at,
    completed_at: row.completed_at || null,
    result_assets: row.status === 'succeeded' && assets.length ? assets : undefined,
  };
}

module.exports = {
  OfficialAiError,
  ensureOfficialAiSchema,
  getTaskRule,
  listTaskRules,
  readOfficialAiConfig,
  officialConfigForTask,
  publicOfficialAiConfig,
  saveOfficialAiModelConfig,
  publicTaskRule,
  normalizeTaskRulePatch,
  updateTaskRule,
  resolveAiJob,
  resolveOfficialVideoJob,
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
  officialImageUpstreamError,
  normalizeOfficialImageResult,
  saveAiJobAsset,
  listAiJobAssets,
  publicJob,
};
