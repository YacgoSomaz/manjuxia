const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const accountClient = fs.readFileSync(path.join(__dirname, "..", "electron", "account-client.js"), "utf8");
const main = fs.readFileSync(path.join(__dirname, "..", "electron", "main.js"), "utf8");
const brand = fs.readFileSync(path.join(__dirname, "..", "frontend", "manjuxia-brand.js"), "utf8");

test("credits are normalized only from the verified account payload", () => {
  assert.match(accountClient, /function normalizeCreditBalances\(payload\)/);
  assert.match(accountClient, /normalizeCreditBalances\(result\.payload\)/);
  assert.match(accountClient, /\/api\/v1\/ai\/catalog\?product_id=/);
  assert.match(accountClient, /official_credits/);
  assert.match(accountClient, /credits: signed\.credits/);
  assert.doesNotMatch(accountClient, /normalizeCreditBalances\(data\.products\)/);
});

test("the account footer requests current account state and shows the signed balance", () => {
  assert.match(brand, /account\.me\(\)/);
  assert.match(brand, /官方算力剩余积分/);
  assert.match(brand, /积分余额：\$\{formatCreditBalance\(credits\)\}/);
  assert.match(brand, /!loggedIn \? .*manjuxia-account-footer__login/s);
  assert.match(brand, /loggedIn \? .*manjuxia-account-footer__logout/s);
  assert.doesNotMatch(brand, /<span class="manjuxia-account-footer__credit">语言/);
  assert.match(brand, /const loggedIn = Boolean\(info && info\.phone\)/);
  assert.match(main, /credits: info\.credits/);
});

test("source package version matches the current published baseline", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  assert.equal(pkg.version, "0.1.30");
  assert.match(brand, /syncFooterVersion/);
});
