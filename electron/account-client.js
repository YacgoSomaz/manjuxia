const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_PRODUCT_ID = "comic_shrimp";
const REQUIRED_ENTITLEMENT = "comic_course";
const ACCOUNT_LICENSE_SCHEMA = "anyq.account-license.v1";
const ACCOUNT_LICENSE_TYPE = "anyq.account-license.v1";
const ACCOUNT_LICENSE_ISSUER = "https://anyq.site";
const DEFAULT_KEY_ID = "account-v1";
const MAX_CLOCK_SKEW_SECONDS = 120;
const MAX_LICENSE_DURATION_SECONDS = 600;
const REQUEST_TIMEOUT_MS = 12_000;
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function normalizeBaseUrl(value) {
  return String(value || "https://anyq.site").replace(/\/+$/, "");
}

function parseSetCookie(value) {
  if (!value) return "";
  return String(value).split(/,(?=\s*[^;,]+=)/).map((item) => item.trim()).find(Boolean) || "";
}

function cookiePair(setCookie) {
  return String(setCookie || "").split(";", 1)[0] || "";
}

function activeUntil(product) {
  const raw = product && product.expires_at;
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function findProduct(products, productId = DEFAULT_PRODUCT_ID) {
  if (!Array.isArray(products)) return null;
  return products.find((product) => product && product.product_id === productId) || null;
}

function hasRequiredEntitlement(product, entitlement = REQUIRED_ENTITLEMENT) {
  return Array.isArray(product && product.entitlements) && product.entitlements.includes(entitlement);
}

function hasActiveProduct(products, productId = DEFAULT_PRODUCT_ID, entitlement = REQUIRED_ENTITLEMENT, now = Date.now()) {
  const product = findProduct(products, productId);
  if (!product || !hasRequiredEntitlement(product, entitlement)) return false;
  const expiresAt = activeUntil(product);
  return product.status === "active" && Boolean(expiresAt && Date.parse(expiresAt) > now);
}

function normalizeCreditBalances(payload) {
  const source = payload && (payload.credits || payload.credit_balances || payload.balances);
  const empty = { language: null, image: null, video: null };
  if (!source || typeof source !== "object" || Array.isArray(source)) return empty;
  const read = (keys) => {
    for (const key of keys) {
      let value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        value = value.remaining ?? value.balance ?? value.amount ?? value.available;
      }
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
      if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value.trim());
    }
    return null;
  };
  return {
    total: read(["total", "points", "credit", "balance"]),
    language: read(["language", "llm", "text"]),
    image: read(["image", "images", "picture"]),
    video: read(["video", "videos"])
  };
}

function normalizeOfficialCatalogBalance(data) {
  const raw = data && (data.balance ?? data.points ?? data.credits ?? (data.data && (data.data.balance ?? data.data.points)));
  let value = raw;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    value = value.remaining ?? value.balance ?? value.amount ?? value.available ?? value.total;
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return { total: value };
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())) return { total: Number(value.trim()) };
  return { total: null };
}

function inactiveProductReason(products, productId = DEFAULT_PRODUCT_ID, now = Date.now()) {
  const product = findProduct(products, productId);
  if (!product) return "unauthorized_tool";
  const expiresAt = activeUntil(product);
  if (product.status === "active" && expiresAt && Date.parse(expiresAt) <= now) return "expired";
  return "unauthorized_tool";
}

function isExplicitAuthorizationFailure(error) {
  const status = Number(error && error.status);
  if ([401, 403, 410].includes(status)) return true;
  const data = error && error.data;
  const code = String(data && (data.code || data.error || data.reason || data.status) || "").toLowerCase();
  return /(unauthoriz|not[_-]?entitled|disabled|revoked|expired|membership|entitlement|product[_-]?stop|account[_-]?stop)/.test(code);
}

function isTransientAuthorizationFailure(error) {
  const status = Number(error && error.status);
  return !isExplicitAuthorizationFailure(error) && (status === 408 || status === 429 || status >= 500);
}

function decodeBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url");
}

function publicKeyFromRaw(publicKey) {
  const raw = decodeBase64Url(publicKey);
  if (raw.length !== 32) throw new Error("账号公钥格式无效");
  return crypto.createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: "der", type: "spki" });
}

function hasDuplicateJsonObjectKeys(json) {
  const stack = [];
  for (let i = 0; i < json.length; i += 1) {
    const char = json[i];
    if (char === "\"") {
      let key = "";
      i += 1;
      for (; i < json.length; i += 1) {
        const current = json[i];
        if (current === "\\") {
          key += current;
          i += 1;
          if (i < json.length) key += json[i];
          continue;
        }
        if (current === "\"") break;
        key += current;
      }
      let next = i + 1;
      while (next < json.length && /\s/.test(json[next])) next += 1;
      const top = stack[stack.length - 1];
      if (top && top.type === "object" && json[next] === ":") {
        let decodedKey;
        try {
          decodedKey = JSON.parse(`"${key}"`);
        } catch (_) {
          return true;
        }
        if (typeof decodedKey !== "string" || top.keys.has(decodedKey)) return true;
        top.keys.add(decodedKey);
      }
      continue;
    }
    if (char === "{") stack.push({ type: "object", keys: new Set() });
    else if (char === "[") stack.push({ type: "array" });
    else if (char === "}" || char === "]") stack.pop();
  }
  return false;
}

function normalizePublicKeys(publicKey) {
  if (!publicKey) return {};
  if (typeof publicKey === "string") return { [DEFAULT_KEY_ID]: publicKey };
  if (typeof publicKey === "object") return { ...publicKey };
  return {};
}

function verifyAccountDocument(document, { publicKey, productCode, now = Date.now() }) {
  try {
    if (!document || document.schema !== ACCOUNT_LICENSE_SCHEMA || document.alg !== "Ed25519" || !document.key_id || !document.payload || !document.signature) {
      return { ok: false, reason: "invalid_envelope" };
    }
    const publicKeys = normalizePublicKeys(publicKey);
    const selectedPublicKey = publicKeys[String(document.key_id)];
    if (!selectedPublicKey) return { ok: false, reason: "unknown_key" };
    const payloadBytes = decodeBase64Url(document.payload);
    const signature = decodeBase64Url(document.signature);
    const verified = crypto.verify(null, payloadBytes, publicKeyFromRaw(selectedPublicKey), signature);
    if (!verified) return { ok: false, reason: "bad_signature" };
    const payloadText = payloadBytes.toString("utf8");
    if (hasDuplicateJsonObjectKeys(payloadText)) return { ok: false, reason: "duplicate_key" };
    const payload = JSON.parse(payloadText);
    if (payload.typ !== ACCOUNT_LICENSE_TYPE) return { ok: false, reason: "type_mismatch" };
    if (payload.iss !== ACCOUNT_LICENSE_ISSUER) return { ok: false, reason: "issuer_mismatch" };
    if (payload.aud !== productCode) return { ok: false, reason: "audience_mismatch" };
    if (!Array.isArray(payload.products) || !payload.user) return { ok: false, reason: "payload_incomplete" };
    const nowSeconds = Math.floor(now / 1000);
    const issuedAt = Number(payload.issued_at);
    const signedUntil = Number(payload.signed_until);
    if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(signedUntil)) {
      return { ok: false, reason: "invalid_time_range" };
    }
    if (signedUntil <= nowSeconds) {
      return { ok: false, reason: "signature_expired", payload };
    }
    if (issuedAt > nowSeconds + MAX_CLOCK_SKEW_SECONDS || signedUntil <= issuedAt || signedUntil - issuedAt > MAX_LICENSE_DURATION_SECONDS) {
      return { ok: false, reason: "invalid_time_range" };
    }
    return { ok: true, payload };
  } catch (_) {
    return { ok: false, reason: "invalid_signature_payload" };
  }
}

class AccountClient {
  constructor({ baseUrl, publicKey, productCode, deviceHash, appVersion, dataPath, safeStorage, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.publicKey = publicKey || "";
    this.productCode = String(productCode || DEFAULT_PRODUCT_ID);
    this.deviceHash = String(deviceHash || "");
    this.appVersion = String(appVersion || "");
    this.dataPath = dataPath;
    this.safeStorage = safeStorage;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.lastFailReason = "";
  }

  _readState() {
    if (!this.dataPath || !fs.existsSync(this.dataPath)) return null;
    try {
      const encoded = fs.readFileSync(this.dataPath, "utf8");
      const json = this.safeStorage.decryptString(Buffer.from(encoded, "base64"));
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  _writeState(state) {
    if (!this.dataPath || !this.safeStorage || !this.safeStorage.isEncryptionAvailable()) {
      throw new Error("系统安全存储不可用，无法保存登录态");
    }
    const encrypted = this.safeStorage.encryptString(JSON.stringify(state)).toString("base64");
    fs.mkdirSync(path.dirname(this.dataPath), { recursive: true });
    const tempPath = `${this.dataPath}.tmp`;
    fs.writeFileSync(tempPath, encrypted, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tempPath, this.dataPath);
  }

  async _request(pathname, { method = "GET", body, cookie, baseUrl = this.baseUrl } = {}) {
    if (typeof this.fetchImpl !== "function") throw Object.assign(new Error("当前运行环境不支持 HTTPS 请求"), { code: "network" });
    const headers = {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "X-Product-Code": this.productCode,
      "X-Device-Hash": this.deviceHash,
      "X-App-Version": this.appVersion
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (cookie) headers.Cookie = cookie;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await this.fetchImpl(`${baseUrl}${pathname}`, {
        method,
        cache: "no-store",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      if (controller.signal.aborted) throw new Error("账号服务响应超时，请检查网络后重试");
      if (error && typeof error === "object") {
        error.accountRequestPath = pathname;
        error.accountRequestUrl = `${baseUrl}${pathname}`;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      const error = new Error(data.error || data.message || `账号服务器请求失败(${response.status})`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return { data, response };
  }

  async sendCode(phone) {
    const normalized = String(phone || "").trim();
    const { data } = await this._request("/api/auth/send-code", {
      method: "POST",
      body: { phone: normalized, product_code: this.productCode, app_version: this.appVersion }
    });
    return { success: true, message: data.message || "验证码已发送", requestId: data.requestId || null };
  }

  async login(phone, code) {
    try {
      const { data, response } = await this._request("/api/auth/login", {
        method: "POST",
        body: {
          phone: String(phone || "").trim(),
          code: String(code || "").trim(),
          product_code: this.productCode,
          app_version: this.appVersion
        }
      });
      const setCookie = parseSetCookie(response.headers.get("set-cookie"));
      const cookie = cookiePair(setCookie);
      if (!cookie) throw new Error("登录成功但服务端未返回会话 Cookie");
      const signed = this._validatedAccountFromResponse(data);
      const officialCredits = await this._fetchOfficialCredits(cookie);
      const state = {
        cookie,
        user: signed.user,
        products: signed.products,
        account_license: data.account_license,
        server_time: data.server_time || null,
        signed_until: signed.signed_until,
        credits: signed.credits,
        official_credits: officialCredits === undefined ? null : officialCredits,
        session_expires_at: data.expiresAt || null,
        last_verified_at: Math.floor(this.now() / 1000)
      };
      this._writeState(state);
      const active = hasActiveProduct(state.products, this.productCode, REQUIRED_ENTITLEMENT, this.now());
      this.lastFailReason = active ? "" : inactiveProductReason(state.products, this.productCode, this.now());
      return { success: true, ...this._infoFromState(state) };
    } catch (error) {
      this.lastFailReason = error && error.status === 401 ? "invalid" : "network";
      return { success: false, message: error instanceof Error ? error.message : "登录失败" };
    }
  }

  async verify() {
    const state = this._readState();
    if (!state || !state.cookie) {
      this.lastFailReason = "not_activated";
      return { ok: false, reason: this.lastFailReason };
    }
    try {
      const { data } = await this._request("/api/auth/me", { cookie: state.cookie });
      if (!data.user) {
        this.clearCachedEntitlements("not_activated");
        this.lastFailReason = "not_activated";
        return { ok: false, authenticated: false, reason: this.lastFailReason };
      }
      const signed = this._validatedAccountFromResponse(data);
      const officialCredits = await this._fetchOfficialCredits(state.cookie);
      const next = {
        ...state,
        user: signed.user,
        products: signed.products,
        account_license: data.account_license,
        server_time: data.server_time || null,
        signed_until: signed.signed_until,
        credits: signed.credits,
        official_credits: officialCredits === undefined ? (state.official_credits || null) : officialCredits,
        last_verified_at: Math.floor(this.now() / 1000)
      };
      this._writeState(next);
      if (!hasActiveProduct(next.products, this.productCode, REQUIRED_ENTITLEMENT, this.now())) {
        this.lastFailReason = inactiveProductReason(next.products, this.productCode, this.now());
        this.clearCachedEntitlements(this.lastFailReason);
        return { ok: false, authenticated: true, reason: this.lastFailReason, user: signed.user, products: next.products };
      }
      this.lastFailReason = "";
      return { ok: true, payload: { user: next.user, products: next.products, credits: next.credits } };
    } catch (error) {
      if (error && error.reason) {
        this.clearCachedEntitlements(error.reason);
        this.lastFailReason = error.reason;
        return { ok: false, authenticated: Boolean(state.user), reason: this.lastFailReason };
      }
      if (isTransientAuthorizationFailure(error) || !error || !error.status) {
        if (this._isCachedSnapshotExpired(state)) {
          this.clearCachedEntitlements("signature_expired");
          this.lastFailReason = "signature_expired";
          return { ok: false, authenticated: Boolean(state.user), offline: true, reason: this.lastFailReason };
        }
        const signedState = this._validatedState(state);
        if (signedState && hasActiveProduct(signedState.products, this.productCode, REQUIRED_ENTITLEMENT, this.now())) {
          this.lastFailReason = "network";
          return { ok: true, offline: true, payload: { user: signedState.user || null, products: signedState.products || [], credits: signedState.credits } };
        }
        const products = signedState ? signedState.products : [];
        this.lastFailReason = inactiveProductReason(products, this.productCode, this.now());
        return { ok: false, authenticated: Boolean(signedState && signedState.user), offline: true, reason: this.lastFailReason, user: signedState ? signedState.user : null, products };
      }
      if (isExplicitAuthorizationFailure(error)) {
        const data = error.data || {};
        const code = String(data.code || data.error || data.reason || "").toLowerCase();
        this.lastFailReason = /expired/.test(code) ? "expired" : (error.status === 401 ? "not_activated" : "unauthorized_tool");
        this.clearCachedEntitlements(this.lastFailReason);
        return { ok: false, authenticated: Boolean(state.user), reason: this.lastFailReason };
      }
      this.lastFailReason = "network";
      return { ok: false, authenticated: Boolean(state.user), reason: this.lastFailReason };
    }
  }

  verifyCached() {
    const state = this._readState();
    if (state && !state.account_license && state.last_account_state === "signature_expired") {
      this.lastFailReason = "signature_expired";
      return { ok: false, authenticated: Boolean(state.user), cached: true, reason: this.lastFailReason };
    }
    if (this._isCachedSnapshotExpired(state)) {
      this.clearCachedEntitlements("signature_expired");
      this.lastFailReason = "signature_expired";
      return { ok: false, authenticated: Boolean(state && state.user), cached: true, reason: this.lastFailReason };
    }
    const signedState = this._validatedState(state);
    if (!signedState || !signedState.user) {
      this.lastFailReason = "not_activated";
      return { ok: false, reason: this.lastFailReason };
    }
    if (!hasActiveProduct(signedState.products, this.productCode, REQUIRED_ENTITLEMENT, this.now())) {
      this.lastFailReason = inactiveProductReason(signedState.products, this.productCode, this.now());
      return {
        ok: false,
        authenticated: true,
        cached: true,
        reason: this.lastFailReason,
        user: signedState.user,
        products: signedState.products
      };
    }
    this.lastFailReason = "";
    return {
      ok: true,
      cached: true,
      payload: { user: signedState.user, products: signedState.products, credits: signedState.credits }
    };
  }

  async createPayment(planId) {
    const state = this._readState();
    if (!state || !state.cookie) return { success: false, message: "请先登录" };
    try {
      const { data } = await this._request("/api/pay/wechat/create", {
        method: "POST",
        cookie: state.cookie,
        body: { planId: String(planId || this.productCode), product_id: this.productCode }
      });
      return { success: true, ...data };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "创建支付订单失败" };
    }
  }

  async getPaymentStatus(orderNo) {
    const state = this._readState();
    if (!state || !state.cookie) return { success: false, message: "请先登录" };
    try {
      const { data } = await this._request(`/api/pay/wechat/status/${encodeURIComponent(String(orderNo || ""))}`, {
        cookie: state.cookie
      });
      return { success: true, ...data };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "查询支付状态失败" };
    }
  }

  // Used only by the main-process official AI bridge. The cookie never crosses
  // IPC and the renderer receives only the sanitized result from the bridge.
  async requestOfficialAi(pathname, options = {}) {
    const state = this._readState();
    if (!state || !state.cookie) {
      const error = new Error("请先登录漫剧虾");
      error.status = 401;
      error.data = { code: "membership_required" };
      throw error;
    }
    const pathValue = String(pathname || "");
    if (!pathValue.startsWith("/api/v1/ai/")) {
      const error = new Error("官方算力请求路径无效");
      error.status = 400;
      throw error;
    }
    const result = await this._request(pathValue, { ...options, cookie: state.cookie, baseUrl: this.baseUrl });
    if (!result || !result.data || typeof result.data !== "object" || Array.isArray(result.data)) return result && result.data;
    // Status is non-sensitive protocol metadata used to decide whether an async
    // official job may be polled. Cookies and response headers never cross IPC.
    return { ...result.data, http_status: result.response && result.response.status };
  }

  async createWebHandoff() {
    const state = this._readState();
    if (!state || !state.cookie) return { success: false, message: "请先登录", continueUrl: `${this.baseUrl}/` };
    try {
      const { data } = await this._request("/api/auth/web-handoff", {
        method: "POST",
        cookie: state.cookie,
        body: { product_id: this.productCode, product_code: this.productCode, app_version: this.appVersion }
      });
      return { success: true, continueUrl: data.continueUrl || `${this.baseUrl}/account/recharge` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "生成网页登录票据失败", continueUrl: `${this.baseUrl}/` };
    }
  }

  getInfo() {
    return this._infoFromState(this._readState());
  }

  getAccountLicense() {
    const state = this._readState();
    return state && state.account_license && typeof state.account_license === "object" ? state.account_license : null;
  }

  hasSession() {
    const state = this._readState();
    return Boolean(state && state.cookie);
  }

  clearCachedEntitlements(reason = "not_activated") {
    const state = this._readState();
    if (!state) {
      this.lastFailReason = "not_activated";
      return false;
    }
    try {
      this._writeState({
        ...state,
        account_license: null,
        products: [],
        credits: { total: null, language: null, image: null, video: null },
        official_credits: null,
        signed_until: null,
        last_account_state: String(reason || "not_activated"),
        last_verified_at: Math.floor(this.now() / 1000)
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  getCloudToken() {
    return null;
  }

  _infoFromState(state) {
    const signedState = this._validatedState(state);
    const user = (signedState && signedState.user) || (state && state.user);
    if (!user) return null;
    // Product and entitlement fields are used only from the verified envelope.
    // A cleared/revoked state may retain the user for UI display, but it has no products.
    const products = signedState ? signedState.products : [];
    const product = findProduct(products, this.productCode);
    const expiresAt = activeUntil(product);
    const isActive = hasActiveProduct(products, this.productCode, REQUIRED_ENTITLEMENT, this.now());
    return {
      auth_mode: "account",
      account_id: user.id,
      phone: user.phone,
      license_key: user.phone ? `account:${user.phone}` : `account:${user.id || "unknown"}`,
      license_type: isActive ? "member" : "free",
      expires_at: expiresAt,
      grace_until: expiresAt,
      last_verified_at: state.last_verified_at || null,
      features: product && Array.isArray(product.entitlements) ? product.entitlements : [],
      product_id: this.productCode,
      product_name: product && product.name ? product.name : "漫剧虾 + 漫剧精品课程",
      product_status: product && product.status ? product.status : (expiresAt ? "expired" : "unopened"),
      member_level: product && product.status === "active" ? this.productCode : "free",
      membership_status: product && product.status ? product.status : (expiresAt ? "expired" : "unopened"),
      remaining_days: expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - this.now()) / 86400000)) : 0,
      entitlements: product && Array.isArray(product.entitlements) ? product.entitlements : [],
      products,
      credits: state && state.official_credits ? state.official_credits : (signedState ? signedState.credits : { total: null, language: null, image: null, video: null }),
      server_time: (signedState && signedState.server_time) || state.server_time || null,
      signed_until: (signedState && signedState.signed_until) || null,
      need_recharge: !isActive,
      product_code: this.productCode,
      energy_balance: 0,
      membership_plan: product && product.name ? product.name : null,
      account_state: this.lastFailReason === "network"
        ? "offline_grace"
        : (this.lastFailReason === "signature_expired" ? "signature_expired" : (isActive ? "active" : "server_unauthorized")),
      active: isActive
    };
  }

  _validatedAccountFromResponse(data) {
    const result = verifyAccountDocument(data && data.account_license, {
      publicKey: this.publicKey,
      productCode: this.productCode,
      now: this.now()
    });
    if (!result.ok) {
      const error = new Error(`账号权益签名校验失败：${result.reason}`);
      error.status = 498;
      error.reason = result.reason;
      throw error;
    }
    return {
      user: result.payload.user,
      products: result.payload.products,
      credits: normalizeCreditBalances(result.payload),
      server_time: result.payload.server_time || null,
      signed_until: result.payload.signed_until || null
    };
  }

  _validatedState(state) {
    if (!state || !state.account_license) return null;
    const result = verifyAccountDocument(state.account_license, {
      publicKey: this.publicKey,
      productCode: this.productCode,
      now: this.now()
    });
    if (!result.ok) return null;
    return {
      ...state,
      user: result.payload.user,
      products: result.payload.products,
      credits: normalizeCreditBalances(result.payload),
      signed_until: result.payload.signed_until || null
    };
  }

  _isCachedSnapshotExpired(state) {
    if (!state || !state.account_license) return false;
    const signedUntil = Number(state.signed_until || 0);
    return Number.isSafeInteger(signedUntil) && signedUntil > 0 && Math.floor(this.now() / 1000) >= signedUntil;
  }

  async _fetchOfficialCredits(cookie) {
    try {
      const { data } = await this._request(`/api/v1/ai/catalog?product_id=${encodeURIComponent(this.productCode)}`, { cookie });
      return normalizeOfficialCatalogBalance(data);
    } catch (_) {
      // The catalog is display-only. Account authentication and entitlement
      // remain determined by the verified account_license response.
      return undefined;
    }
  }

  async logoutRemote() {
    const state = this._readState();
    if (!state || !state.cookie) return;
    try {
      await this._request("/api/auth/logout", { method: "POST", cookie: state.cookie, body: {} });
    } catch (_) {
      // Local cleanup must still happen.
    }
  }

  logout() {
    try { fs.rmSync(this.dataPath, { force: true }); } catch (_) { /* best effort */ }
    this.lastFailReason = "not_activated";
    return true;
  }
}

module.exports = { AccountClient, hasActiveProduct, findProduct, verifyAccountDocument };
