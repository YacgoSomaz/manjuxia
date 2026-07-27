const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('one-click commercial publisher keeps the comic product and hardening checks', () => {
  const publisher = fs.readFileSync(
    path.join(root, 'packaging', 'build', 'Publish-ComicShrimp.ps1'),
    'utf8',
  );
  const launcher = fs.readFileSync(path.join(root, '打包漫剧虾.bat'), 'utf8');
  const compiler = fs.readFileSync(
    path.join(root, 'packaging', 'build', 'Compile-Backend.ps1'),
    'utf8',
  );

  assert.match(publisher, /comic_shrimp/);
  assert.match(publisher, /WANSHAN_MANIFEST_PRIVATE_KEY/);
  assert.match(publisher, /WANSHAN_CODESIGN_THUMBPRINT/);
  assert.match(publisher, /py312-build/);
  assert.match(publisher, /buildPython/);
  assert.match(publisher, /Python = \$buildPython/);
  assert.match(publisher, /build_release\.ps1/);
  assert.match(publisher, /node --test/);
  assert.match(publisher, /test_wanshan_prompt_seed_payload\.py/);
  assert.match(publisher, /packaged-backend-smoke-gate\.test\.js/);
  assert.match(publisher, /official-ai-client\.test\.js/);
  assert.match(publisher, /official-ai-frontend\.test\.js/);
  assert.match(publisher, /Scan-Release\.ps1/);
  assert.match(publisher, /Get-NextComicShrimpVersion/);
  assert.match(publisher, /ManJuXiaComicShrimpBuild/);
  assert.match(publisher, /已有一个漫剧虾构建正在运行/);
  assert.match(launcher, /Publish-ComicShrimp\.ps1/);
  assert.match(launcher, /powershell\.exe -NoExit/);
  assert.match(launcher, /pause/);
  assert.match(compiler, /import nuitka; print\('Nuitka ready'\)/);
  assert.doesNotMatch(compiler, /nuitka --assume-yes-for-downloads --version/);
  assert.match(compiler, /wanshan_prompt_seed_embedded\.py/);
  assert.match(compiler, /zlib\.compress/);
  assert.match(compiler, /--include-module=services\.wanshan_prompt_seed_embedded/);
  assert.match(compiler, /\$_\.Extension -in "\.py", "\.pyc", "\.pyo"/);
  assert.match(compiler, /wanshan\.backend-cache\.v1/);
  assert.match(compiler, /\[string\]\$Python = "python"/);
  assert.match(compiler, /Test-BackendCache/);
  assert.match(compiler, /Get-BackendTreeManifest/);
  assert.match(compiler, /backend\/requirements\.txt/);
  assert.match(compiler, /\-m pip freeze/);
  assert.match(publisher, /DisableBackendCache/);
});
