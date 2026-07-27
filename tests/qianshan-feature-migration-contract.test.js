const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('migrated Qianshan feature modules are staged in the ManJuXia client', () => {
  const main = read('backend/main.py');
  const video = read('backend/api/video.py');
  const extraction = read('backend/api/extraction.py');
  const db = read('backend/database/db.py');
  const html = read('frontend/index.html');
  const recoveryTools = read('frontend/wanshan-recovery-tools.js');
  assert.match(main, /supplement_video_router/);
  assert.match(main, /@app\.get\("\/public\/\{filename:path\}"\)/);
  assert.match(video, /@router\.get\("\/pippit\/config"\)/);
  assert.match(video, /@router\.post\("\/pippit\/submit"\)/);
  assert.match(video, /provider_type == "pippit_cli"/);
  assert.match(video, /@router\.post\("\/abort-stuck-video"\)/);
  assert.match(video, /@router\.post\("\/recover-chain"\)/);
  assert.match(extraction, /@router\.get\("\/voices"\)/);
  assert.match(extraction, /@router\.post\("\/voices\/preview"\)/);
  assert.match(extraction, /@router\.post\("\/element\/\{element_id\}\/voice"\)/);
  assert.match(extraction, /@router\.post\("\/element\/\{element_id\}\/polish-description"\)/);
  assert.match(extraction, /你是影视角色视觉设定助手/);
  assert.doesNotMatch(extraction, /漫剧制作资产描述润色助手/);
  assert.doesNotMatch(extraction, /"polished_description"/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS supplement_video_tasks/);
  for (const file of ['wanshan-voice.js', 'wanshan-pippit.js', 'wanshan-supplement-video.js', 'wanshan-recovery-tools.js']) {
    assert.match(html, new RegExp(file.replace('.', '\\.') ))
    assert.ok(fs.existsSync(path.join(root, 'frontend', file)));
  }
  assert.match(recoveryTools, /wanshanRoute/);
  assert.match(recoveryTools, /currentRoute\(\) === "storyboards"/);
  assert.ok(fs.existsSync(path.join(root, 'public', 'voice-previews', 'sonicvalue_voices.json')));
});

test('ManJuXia keeps local model configuration boundary', () => {
  const main = read('backend/main.py');
  const pippit = read('frontend/wanshan-pippit.js');
  assert.match(main, /跳过远端模板同步、远端模型配置同步/);
  assert.match(pippit, /只保存在本机/);
});
