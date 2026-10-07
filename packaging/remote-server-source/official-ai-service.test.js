const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {
  ensureOfficialAiSchema,
  getTaskRule,
  reserveAiJob,
  refundAiJob,
  refundStaleAiJobs,
  settleAiJob,
  cleanupExpiredAiJobs,
  adjustCredits,
  readOfficialAiConfig,
  saveOfficialAiModelConfig,
  publicOfficialAiConfig,
} = require('./official-ai-service');

function makeDb() {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, phone TEXT UNIQUE, energy_balance INTEGER NOT NULL DEFAULT 0);`);
  db.prepare('INSERT INTO users (id, phone, energy_balance) VALUES (1, ?, 100)').run('13368764847');
  ensureOfficialAiSchema(db);
  return db;
}

test('官方AI调用先预扣积分，失败后自动退回并保留审计记录', () => {
  const db = makeDb();
  const job = { productId: 'replay_shrimp', taskType: 'replay_report', idempotencyKey: 'job_20260722_replay_1001', inputText: '转写', creditCost: 60 };
  const reserved = reserveAiJob(db, 1, job, '2026-07-22T00:00:00.000Z');
  assert.equal(reserved.existing, false);
  assert.equal(db.prepare('SELECT energy_balance FROM users WHERE id = 1').get().energy_balance, 40);
  refundAiJob(db, reserved.job.id, 'AI_UPSTREAM_TIMEOUT', '2026-07-22T00:01:00.000Z');
  assert.equal(db.prepare('SELECT energy_balance FROM users WHERE id = 1').get().energy_balance, 100);
  assert.equal(db.prepare('SELECT status FROM ai_jobs WHERE id = ?').get(reserved.job.id).status, 'failed');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM ai_credit_ledger').get().count, 2);
});

test('成功任务不会再次退款，管理员调整积分必须记入独立流水', () => {
  const db = makeDb();
  const job = { productId: 'replay_shrimp', taskType: 'replay_advisor', idempotencyKey: 'job_20260722_advisor_1001', inputText: '上下文', creditCost: 8 };
  const reserved = reserveAiJob(db, 1, job, '2026-07-22T00:00:00.000Z');
  settleAiJob(db, reserved.job.id, { text: '建议', inputTokens: 1, outputTokens: 2 }, '2026-07-22T00:01:00.000Z');
  refundAiJob(db, reserved.job.id, 'SHOULD_NOT_REFUND', '2026-07-22T00:02:00.000Z');
  assert.equal(db.prepare('SELECT energy_balance FROM users WHERE id = 1').get().energy_balance, 92);
  const result = adjustCredits(db, 1, { phone: '13368764847', delta: 20, note: '测试赠送' }, (phone) => db.prepare('SELECT id, phone FROM users WHERE phone = ?').get(phone), '2026-07-22T00:03:00.000Z');
  assert.equal(result.balance, 112);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM ai_credit_ledger WHERE reason = 'admin_adjustment'").get().count, 1);
});

test('官方模型仅从服务器环境读取，公开配置不依赖客户端字段', () => {
  const config = readOfficialAiConfig({
    OFFICIAL_AI_ENABLED: 'true', OFFICIAL_AI_API_BASE: 'https://example.test/v1/', OFFICIAL_AI_API_KEY: 'secret', OFFICIAL_AI_MODEL: 'model-x',
  });
  assert.equal(config.configured, true);
  assert.equal(config.apiBase, 'https://example.test/v1');
  assert.equal(getTaskRule(makeDb(), 'replay_report').creditCost, 60);
});

test('官网 MiniMax 视频仅在服务器配置密钥后开放且不会公开密钥', () => {
  const env = {
    OFFICIAL_VIDEO_MINIMAX_ENABLED: 'true',
    OFFICIAL_VIDEO_MINIMAX_KEY: 'secret-minimax-key',
  };
  const config = readOfficialAiConfig(env);
  assert.equal(config.video.providers.some((item) => item.provider === 'minimax_official'), true);
  const publicConfig = publicOfficialAiConfig(config);
  assert.equal(publicConfig.models.video.providers.some((item) => item.provider === 'minimax_official'), true);
  assert.equal(JSON.stringify(publicConfig).includes('secret-minimax-key'), false);
  assert.equal(readOfficialAiConfig({ OFFICIAL_VIDEO_MINIMAX_ENABLED: 'true' }).video.providers.length, 0);
});

test('已过期的完成任务会清理结果，运行中的任务不会被误删', () => {
  const db = makeDb();
  const job = { productId: 'replay_shrimp', taskType: 'replay_advisor', idempotencyKey: 'job_20260722_cleanup_1', inputText: '上下文', creditCost: 8 };
  const reserved = reserveAiJob(db, 1, job, '2026-07-20T00:00:00.000Z');
  settleAiJob(db, reserved.job.id, { text: '建议' }, '2026-07-20T00:01:00.000Z');
  assert.equal(cleanupExpiredAiJobs(db, '2026-07-22T00:00:01.000Z'), 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM ai_jobs').get().count, 0);
});

test('已取得上游任务编号的官方视频在服务重启后保留待恢复状态', () => {
  const db = makeDb();
  const reserved = reserveAiJob(db, 1, {
    productId: 'comic_shrimp', taskType: 'comic_video',
    idempotencyKey: 'video_resume_20260722_1', inputText: '测试分镜', creditCost: 8,
  }, '2026-07-22T00:00:00.000Z');
  db.prepare('UPDATE ai_jobs SET provider_request_id = ? WHERE id = ?').run('newapi:task-123', reserved.job.id);
  refundStaleAiJobs(db, '2026-07-22T00:20:00.000Z');
  assert.equal(db.prepare('SELECT status FROM ai_jobs WHERE id = ?').get(reserved.job.id).status, 'running');
  assert.equal(db.prepare('SELECT energy_balance FROM users WHERE id = 1').get().energy_balance, 92);
});

test('后台模型配置以主密钥加密保存，公开状态绝不返回中转地址或密钥', () => {
  const db = makeDb();
  const env = { OFFICIAL_AI_CONFIG_MASTER_KEY: 'test-master-key-only-for-unit-tests' };
  saveOfficialAiModelConfig(db, {
    kind: 'language',
    enabled: true,
    label: 'ChatGPT 5.6',
    api_base: 'https://relay.example.test/v1',
    api_key: 'sk-should-never-leave-server',
    model: 'gpt-5.6-terra',
  }, env);
  const stored = db.prepare('SELECT * FROM official_ai_model_configs WHERE kind = ?').get('language');
  assert.equal(JSON.stringify(stored).includes('sk-should-never-leave-server'), false);
  const publicConfig = publicOfficialAiConfig(readOfficialAiConfig(env, db));
  assert.equal(publicConfig.models.language.label, 'ChatGPT 5.6');
  assert.equal(publicConfig.models.language.configured, true);
  assert.equal(JSON.stringify(publicConfig).includes('relay.example.test'), false);
  assert.equal(JSON.stringify(publicConfig).includes('sk-should-never-leave-server'), false);
});
