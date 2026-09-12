const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSafeOfficialImagePrompt, normalizeOfficialImageResult, officialImageUpstreamError } = require('./official-ai-service');

test('优先解析上游 HTTPS 临时图片 URL，不在接口结果中保留 Base64', () => {
  const result = normalizeOfficialImageResult({
    data: [{
      url: 'https://img.example.test/result.png?temporary=1',
      b64_json: Buffer.from('redundant-image-bytes').toString('base64'),
      revised_prompt: 'test',
    }],
  });
  assert.equal(result.deliveryUrl, 'https://img.example.test/result.png?temporary=1');
  assert.equal(result.buffer, null);
  assert.equal(result.mimeType, 'image/png');
});

test('拒绝非 HTTPS 的上游图片地址', () => {
  assert.throws(() => normalizeOfficialImageResult({ data: [{ url: 'http://unsafe.example.test/a.png' }] }), /图片/);
});

test('上游内容安全拒绝被识别为可执行安全回退的独立错误', () => {
  const response = { status: 400, headers: { get: () => 'request-1' } };
  const error = officialImageUpstreamError(response, { error: { code: 'IMAGE_BAD_REQUEST', message: 'prompt violates safety policy' } });
  assert.equal(error.code, 'AI_IMAGE_PROMPT_REJECTED');
  assert.equal(error.details.provider_status, 400);
  assert.equal(error.details.provider_code, 'IMAGE_BAD_REQUEST');
});

test('安全回退只改写敏感道具语义并保留原构图画质内容', () => {
  const prompt = '2005年美国机动车驾驶证卡。产品级静物，真实电影摄影质感。';
  const safe = buildSafeOfficialImagePrompt(prompt);
  assert.match(safe, /虚构/);
  assert.doesNotMatch(safe, /机动车驾驶证/);
  assert.match(safe, /产品级静物/);
  assert.match(safe, /真实电影摄影质感/);
});
