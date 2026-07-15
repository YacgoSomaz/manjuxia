const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("installs the signed fetch repair before the application module loads", () => {
  const html = fs.readFileSync(path.join(root, "frontend", "index.html"), "utf8");
  assert.ok(html.indexOf('src="./manjuxia-brand.js"') < html.indexOf('src="./assets/index-CHppf6so.js"'));
});

test("silences automatic selector-loading failures until users take an action", () => {
  const brand = fs.readFileSync(path.join(root, "frontend", "manjuxia-brand.js"), "utf8");
  const localConfig = fs.readFileSync(path.join(root, "frontend", "wanshan-local-config.js"), "utf8");
  assert.match(brand, /suppressStartupLoadFailureToasts/);
  assert.match(brand, /\(\?:加载\|获取\).{0,32}\(\?:列表\|配置\)/);
  assert.doesNotMatch(brand, /window\.__manjuxiaModelNoticeUntil/);
  assert.match(localConfig, /window\.manjuxiaOpenLocalModelConfig = openModal/);
});

test("replaces legacy sidebar monetization and card-key details with account details", () => {
  const brand = fs.readFileSync(path.join(root, "frontend", "manjuxia-brand.js"), "utf8");
  assert.match(brand, /price-compare-btn/);
  assert.match(brand, /training-btn/);
  assert.match(brand, /普通用户 · 开通后可使用生成、编辑与导出/);
  assert.match(brand, /手机号验证码重新登录/);
  assert.match(brand, /manjuxia-account-footer__logout/);
  assert.match(brand, /border: 1px solid #ef4444/);
  assert.match(brand, /installMemberButtonGate/);
  assert.match(brand, /未开通漫剧虾会员/);
  assert.match(brand, /-webkit-text-fill-color/);
  assert.match(brand, /isGuestReadOnlyButton/);
  assert.match(brand, /event\.key === "Escape"/);
  assert.doesNotMatch(brand, /installGuestFeaturePreviews\(\);/);
});
