const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'frontend', 'wanshan-topview.js');

test('topview panel uses the local backend fuse contract', () => {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /\/api\/topview-demo\/storyboard\/\$\{encodeURIComponent\(state\.storyboardId\)\}\/fuse/);
  assert.match(source, /method:\s*['"]POST['"]/);
  assert.match(source, /method:\s*['"]DELETE['"]/);
  assert.match(source, /config_id/);
  assert.match(source, /llm_config_id/);
  assert.doesNotMatch(source, /qianshan|qianshanai\.cn/i);
});

test('topview panel exposes model selection and current result removal', () => {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /config_type=image/);
  assert.match(source, /config_type=llm/);
  assert.match(source, /生成俯视调度图/);
  assert.match(source, /删除调度图/);
  assert.match(source, /Escape/);
});

test('topview button is hidden from login and activation pages', () => {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /wanshanRoute\?\.is\("storyboards"\)/);
  assert.doesNotMatch(source, /document\.body\.innerText/);
  assert.doesNotMatch(source, /path\.includes\("video"\)/);
});
