const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'official-ai.js'), 'utf8');

test('official image mode is a separate source and intercepts local image generation', () => {
  assert.match(source, /官方图片算力（积分）/);
  assert.match(source, /official:comic_image/);
  assert.match(source, /generate-image\(\?:-async\)\?/);
  assert.match(source, /variant.*generate-image/);
  assert.match(source, /batch-generate-images/);
  assert.match(source, /不会自动切换到本地配置/);
});

test('official image results prefer display_url and support local save', () => {
  assert.match(source, /result_assets/);
  assert.match(source, /display_url \|\| asset\.download_url/);
  assert.match(source, /download_url/);
  assert.match(source, /saveAsset/);
  assert.match(source, /object-fit:contain/);
  assert.match(source, /图片加载失败/);
  assert.doesNotMatch(source, /download_url\s*\+/);
  assert.doesNotMatch(source, /base_url|api_key|model_name|provider/);
});
