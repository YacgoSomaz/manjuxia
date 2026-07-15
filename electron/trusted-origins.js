const TRUSTED_EXTERNAL_HOSTS = new Set([
  "api.deepseek.com",
  "api.openai.com",
  "ark.cn-beijing.volces.com",
  "api.lingyaai.cn",
  "api.wuyinkeji.com",
  "api.bltcy.cn",
  "api.mjapi.cc.cd",
  "qianshanai.cn",
  "www.qianshanai.cn",
  "api.qianshanai.cn",
  "anyq.site",
  "www.anyq.site",
  "www.vjimeng.vip",
  "jimeng.jianying.com",
  "www.jianying.com",
  "jianying.com",
]);

const TRUSTED_JIMENG_HOSTS = new Set([
  "jimeng.jianying.com",
  "www.jianying.com",
  "jianying.com",
]);

function hasTrustedHost(value, hosts) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && hosts.has(url.hostname.toLowerCase());
  } catch (_) {
    return false;
  }
}

function isTrustedExternalUrl(value) {
  return hasTrustedHost(value, TRUSTED_EXTERNAL_HOSTS);
}

function isTrustedJimengUrl(value) {
  return hasTrustedHost(value, TRUSTED_JIMENG_HOSTS);
}

module.exports = { isTrustedExternalUrl, isTrustedJimengUrl };
