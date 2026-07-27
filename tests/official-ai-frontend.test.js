const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'official-ai.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'index.html'), 'utf8');
const localConfig = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'wanshan-local-config.js'), 'utf8');

test('official AI frontend is included and has no local persistence or model secrets', () => {
  assert.match(index, /official-ai\.js/);
  assert.match(script, /electronAPI\.officialAi/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
  assert.doesNotMatch(script, /api_key|model_name|provider|system_prompt|base_url/);
  assert.match(script, /网络异常不会自动切换到本地配置/);
});

test('local model configuration remains a separate local-only bridge', () => {
  assert.match(localConfig, /localModelConfig/);
  assert.match(localConfig, /local_only=true/);
  assert.match(localConfig, /deleteConfig/);
  assert.doesNotMatch(localConfig, /official-ai:|api\/v1\/ai\/jobs/);
});

test('official image compute is discoverable from the existing image-model selector', () => {
  assert.match(script, /OFFICIAL_IMAGE_CONFIG_ID/);
  assert.match(script, /官方图片算力（积分）/);
  assert.match(script, /config_type=\(image\|llm\)/);
  assert.match(script, /official_ai: true/);
  assert.match(script, /manjuxiaSetOfficialImageMode/);
  assert.match(script, /requestUsesOfficialImageConfig/);
});

test('official language compute is injected into the existing language-model selector', () => {
  assert.match(script, /OFFICIAL_TEXT_CONFIG_PREFIX/);
  assert.match(script, /官方语言算力（积分）/);
  assert.match(script, /config_type=\(image\|llm\)/);
  assert.match(script, /convert-single/);
  assert.match(script, /official-result/);
});
