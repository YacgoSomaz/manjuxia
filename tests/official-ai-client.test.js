const test = require('node:test');
const assert = require('node:assert/strict');
const { OfficialAiClient, OFFICIAL_AI_PRODUCT_ID, OFFICIAL_AI_TASK_TYPE } = require('../electron/official-ai-client');

const validKey = '11111111-1111-4111-8111-111111111111';

function makeClient({ responses = [], access = { allowed: true }, calls = [] } = {}) {
  let index = 0;
  const request = async (path, options) => {
    calls.push({ path, options });
    const response = responses[index++];
    if (response instanceof Error) throw response;
    return response || { ok: true };
  };
  return {
    client: new OfficialAiClient({ request, verifyAccess: async () => access }),
    calls
  };
}

test('official catalog is product-isolated and strips server-controlled model fields', async () => {
  const { client, calls } = makeClient({
    responses: [{
      ok: true,
      catalog: [{
        task_type: 'comic_image',
        enabled: true,
        available: true,
        price: { points: 12 },
        balance: 88,
        model: 'server-only-model',
        provider: 'server-only-provider',
        api_key: 'secret',
        system_prompt: 'secret'
      }]
    }]
  });
  const result = await client.getCatalog();
  assert.equal(calls[0].path, '/api/v1/ai/catalog?product_id=comic_shrimp');
  assert.equal(calls[0].options.headers['X-Product-Code'], 'comic_shrimp');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(result.ok, true);
  assert.equal(result.available, true);
  assert.equal(result.task_type, 'comic_image');
  assert.equal(result.catalog_item.balance, 88);
  assert.equal('model' in result.catalog_item, false);
  assert.equal('provider' in result.catalog_item, false);
  assert.equal('api_key' in result.catalog_item, false);
  assert.equal('system_prompt' in result.catalog_item, false);
  assert.equal('input_text' in result.official_ai, false);
});

test('official mode refuses an unconfigured catalog without local fallback', async () => {
  const { client } = makeClient({ responses: [{ ok: true, catalog: [{ task_type: 'comic_image', enabled: true, available: false }] }] });
  const result = await client.createJob('素材', validKey);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'official_not_configured');
});

test('official catalog requires both enabled and available', async () => {
  const { client } = makeClient({ responses: [{ ok: true, catalog: [
    { task_type: 'comic_image', enabled: false, available: true },
    { task_type: 'comic_text', enabled: true, available: false }
  ] }] });
  const result = await client.getCatalog();
  assert.equal(result.ok, false);
  assert.equal(result.code, 'official_not_configured');
});

test('official task type must come from the server catalog', async () => {
  const { client } = makeClient({ responses: [{ ok: true, catalog: [
    { task_type: 'comic_image', enabled: true, available: true }
  ] }] });
  const result = await client.createJob('素材', validKey, 'not-from-catalog');
  assert.equal(result.ok, false);
  assert.equal(result.code, 'official_task_not_allowed');
});

test('official language task uses the task type exposed by the catalog', async () => {
  const { client, calls } = makeClient({ responses: [
    { ok: true, catalog: [{ task_type: 'comic_script', enabled: true, available: true }] },
    { ok: true, job: { id: 'script-job', status: 'queued' } }
  ] });
  const result = await client.createJob('章节正文', validKey, 'comic_script');
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    product_id: OFFICIAL_AI_PRODUCT_ID,
    task_type: 'comic_script',
    input_text: '章节正文',
    idempotency_key: validKey
  });
});

test('official job body contains only fixed protocol fields and reuses idempotency key', async () => {
  const calls = [];
  const { client } = makeClient({
    responses: [
      { ok: true, catalog: [{ task_type: 'comic_image', enabled: true, available: true }] },
      { ok: true, job: { id: 'job-1', status: 'queued' } },
      { ok: true, catalog: [{ task_type: 'comic_image', enabled: true, available: true }] },
      { ok: true, job: { id: 'job-1', status: 'queued' } }
    ],
    calls
  });
  const first = await client.createJob('整理后的创作素材', validKey);
  const second = await client.createJob('整理后的创作素材', validKey);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  const jobCalls = calls.filter((call) => call.options.method === 'POST');
  const body = JSON.parse(jobCalls[0].options.body);
  assert.deepEqual(body, {
    product_id: OFFICIAL_AI_PRODUCT_ID,
    task_type: OFFICIAL_AI_TASK_TYPE,
    input_text: '整理后的创作素材',
    idempotency_key: validKey
  });
  assert.deepEqual(JSON.parse(jobCalls[1].options.body), body);
  assert.equal(Object.keys(body).length, 4);
  assert.equal(jobCalls[0].options.headers['X-Product-Code'], 'comic_shrimp');
  assert.equal(jobCalls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(jobCalls[0].options.headers['Cache-Control'], 'no-cache');
  assert.equal(jobCalls[0].options.headers.Pragma, 'no-cache');
  assert.equal(jobCalls[0].options.cache, 'no-store');
});

test('membership and balance errors are explicit and never fall back to local mode', async () => {
  const denied = makeClient({ access: { allowed: false, code: 'membership_required' } });
  assert.deepEqual(await denied.client.getCatalog(), {
    ok: false,
    code: 'membership_required',
    message: '请先开通漫剧虾会员'
  });

  const insufficient = makeClient({
    responses: [{ ok: true, catalog: [{ task_type: 'comic_image', enabled: true, available: true }] }, { ok: false, code: 'AI_CREDITS_INSUFFICIENT', message: '余额不足' }]
  });
  const result = await insufficient.client.createJob('素材', validKey);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'credits_insufficient');
});

test('custom/local configuration is not touched by the official client', async () => {
  const { client, calls } = makeClient({ responses: [{ ok: true, catalog: [{ task_type: 'comic_image', enabled: true, available: true }] }] });
  await client.getCatalog();
  assert.equal(calls.some((call) => call.path.includes('llm-config')), false);
  assert.equal(OFFICIAL_AI_PRODUCT_ID, 'comic_shrimp');
});

test('official image jobs expose only server result_assets image URLs', async () => {
  const { client } = makeClient({
    responses: [
      { ok: true, catalog: [{ task_type: 'comic_image', enabled: true, available: true }] },
      { ok: true, job: { id: 'job-asset', status: 'succeeded', result_assets: [{ display_url: 'https://images.example/a.png', download_url: 'https://download.anyq.site/a.png', api_key: 'hidden' }] } }
    ]
  });
  const result = await client.createJob('确认后的图片提示词', validKey);
  assert.equal(result.ok, true);
  assert.equal(result.job.result_assets[0].download_url, 'https://download.anyq.site/a.png');
  assert.equal(result.job.result_assets[0].display_url, 'https://images.example/a.png');
  assert.equal('api_key' in result.job.result_assets[0], false);
});

test('official error codes are mapped without falling back to local configuration', async () => {
  const cases = [
    ['AI_PRODUCT_NOT_ENTITLED', 'membership_required'],
    ['AI_TASK_DISABLED', 'official_not_configured'],
    ['AI_NOT_CONFIGURED', 'official_not_configured'],
    ['AI_UPSTREAM_TIMEOUT', 'image_generation_failed'],
    ['AI_IMAGE_INVALID', 'image_generation_failed']
  ];
  for (const [code, expected] of cases) {
    const { client } = makeClient({ responses: [{ ok: false, code, message: 'server message' }] });
    const result = await client.getCatalog();
    assert.equal(result.code, expected);
  }
});
