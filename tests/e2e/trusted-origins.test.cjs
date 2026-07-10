const assert = require("node:assert/strict");
const { isTrustedExternalUrl, isTrustedJimengUrl } = require("../../electron/trusted-origins");

assert.equal(isTrustedExternalUrl("https://jimeng.jianying.com"), true);
assert.equal(isTrustedExternalUrl("https://api.deepseek.com/v1"), true);
assert.equal(isTrustedExternalUrl("http://jimeng.jianying.com"), false);
assert.equal(isTrustedExternalUrl("https://jimeng.jianying.com.evil.example"), false);
assert.equal(isTrustedExternalUrl("file:///C:/Windows/System32/cmd.exe"), false);

assert.equal(isTrustedJimengUrl("https://jimeng.jianying.com"), true);
assert.equal(isTrustedJimengUrl("https://www.jianying.com"), true);
assert.equal(isTrustedJimengUrl("https://api.deepseek.com/v1"), false);
assert.equal(isTrustedJimengUrl("https://evil.example/login"), false);

console.log("trusted_origin_policy=true");
