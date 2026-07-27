const OFFICIAL_AI_PRODUCT_ID = "comic_shrimp";
const OFFICIAL_AI_ENTITLEMENT = "comic_course";
const OFFICIAL_AI_TASK_TYPE = "comic_image";

const SENSITIVE_FIELDS = new Set([
  "api_key", "apikey", "key", "secret", "token", "access_token",
  "model", "model_name", "model_id", "provider", "base_url", "api_url",
  "system_prompt", "systemMessage", "prompt", "input_text"
]);

function makeError(code, message, status = 0) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function mapError(error) {
  const status = Number(error && error.status) || 0;
  const data = error && error.data && typeof error.data === "object" ? error.data : {};
  const rawCode = String(data.code || data.error || data.reason || error && error.code || "").toLowerCase();
  if (rawCode === "ai_credits_insufficient") {
    return makeError("credits_insufficient", "积分不足", status);
  }
  if (rawCode === "ai_product_not_entitled") {
    return makeError("membership_required", "未开通漫剧虾会员", status);
  }
  if (rawCode === "ai_task_disabled" || rawCode === "ai_not_configured") {
    return makeError("official_not_configured", "官方算力暂未开放", status);
  }
  if (rawCode.startsWith("ai_upstream_") || rawCode.startsWith("ai_image_")) {
    return makeError("image_generation_failed", "图片生成失败，积分将自动退回", status);
  }
  if (status === 401 || status === 403 || status === 410 || /entitlement|membership|unauthori|forbidden|expired|disabled/.test(rawCode)) {
    return makeError("membership_required", "请先开通漫剧虾会员", status);
  }
  if (status === 429 || /rate.?limit|too.?many/.test(rawCode)) {
    return makeError("rate_limited", "当前请求较多，请稍后再试", status);
  }
  if (/insufficient|balance|points|credit/.test(rawCode)) {
    return makeError("credits_insufficient", "积分不足", status);
  }
  if (status >= 500 || /upstream|provider|gateway|temporar|unavailable/.test(rawCode)) {
    return makeError("upstream_unavailable", "官方算力暂时不可用，请稍后再试", status);
  }
  return makeError("official_request_failed", "官方算力请求失败，请稍后重试", status);
}

function sanitizeValue(value, depth = 0) {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeValue(item, depth + 1));
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_FIELDS.has(key) || SENSITIVE_FIELDS.has(key.toLowerCase())) continue;
    output[key] = sanitizeValue(item, depth + 1);
  }
  return output;
}

function extractOfficialAi(data) {
  if (!data || typeof data !== "object") return {};
  const candidate = data.official_ai || data.data && data.data.official_ai || {};
  return sanitizeValue(candidate);
}

function extractCatalogItems(data) {
  if (!data || typeof data !== "object") return [];
  const candidates = [
    data.catalog,
    data.items,
    data.data && data.data.catalog,
    data.data && data.data.items,
    data.official_ai && data.official_ai.catalog,
    data.official_ai && data.official_ai.items,
    data.data && data.data.official_ai && data.data.official_ai.catalog,
    data.data && data.data.official_ai && data.data.official_ai.items
  ];
  return candidates.find(Array.isArray) || [];
}

function isEligibleCatalogItem(entry) {
  return Boolean(
    entry &&
    typeof entry.task_type === "string" &&
    entry.task_type.trim() &&
    entry.enabled === true &&
    entry.available === true
  );
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

class OfficialAiClient {
  constructor({ request, verifyAccess } = {}) {
    this.request = request;
    this.verifyAccess = verifyAccess;
  }

  async _access() {
    if (typeof this.verifyAccess !== "function") return { allowed: false, code: "membership_required" };
    const result = await this.verifyAccess();
    return result && result.allowed ? result : { allowed: false, code: result && result.code || "membership_required" };
  }

  async _request(path, { method = "GET", body } = {}) {
    if (typeof this.request !== "function") throw makeError("official_request_failed", "官方算力请求不可用");
    try {
      const headers = {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "X-Product-Code": OFFICIAL_AI_PRODUCT_ID
      };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      const result = await this.request(path, {
        method,
        headers,
        cache: "no-store",
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (result && result.ok === false) {
        const error = new Error(result.message || "官方算力请求失败");
        error.status = Number(result.status) || 0;
        error.code = result.code || result.error || result.reason || "official_request_failed";
        error.data = result;
        throw error;
      }
      return result;
    } catch (error) {
      throw mapError(error);
    }
  }

  async getCatalog() {
    const access = await this._access();
    if (!access.allowed) return { ok: false, code: access.code || "membership_required", message: access.message || "请先开通漫剧虾会员" };
    try {
      const data = await this._request(`/api/v1/ai/catalog?product_id=${OFFICIAL_AI_PRODUCT_ID}`);
      const items = extractCatalogItems(data).filter(isEligibleCatalogItem).map((item) => sanitizeValue(item));
      const item = items.find((entry) => entry.task_type === OFFICIAL_AI_TASK_TYPE);
      if (!items.length) {
        return { ok: false, code: "official_not_configured", message: "官方算力暂不可用" };
      }
      return {
        ok: true,
        available: Boolean(item),
        product_id: OFFICIAL_AI_PRODUCT_ID,
        items,
        task_type: item ? OFFICIAL_AI_TASK_TYPE : undefined,
        catalog_item: item,
        official_ai: item
      };
    } catch (error) {
      return { ok: false, code: error.code || "official_request_failed", message: error.message };
    }
  }

  async createJob(inputText, idempotencyKey, taskType = OFFICIAL_AI_TASK_TYPE) {
    const text = String(inputText || "");
    if (!text.trim()) return { ok: false, code: "input_required", message: "请输入创作素材" };
    if (text.length > 200000) return { ok: false, code: "input_too_large", message: "创作素材过长，请分段处理" };
    if (!isUuid(idempotencyKey)) return { ok: false, code: "invalid_idempotency_key", message: "任务标识无效，请重试" };
    const catalog = await this.getCatalog();
    if (!catalog.ok) return catalog;
    const requestedTask = String(taskType || "").trim();
    const allowed = catalog.items.find((item) => item.task_type === requestedTask);
    if (!allowed) {
      return { ok: false, code: "official_task_not_allowed", message: "该官方任务当前未开放" };
    }
    try {
      const data = await this._request("/api/v1/ai/jobs", {
        method: "POST",
        body: {
          product_id: OFFICIAL_AI_PRODUCT_ID,
          task_type: requestedTask,
          input_text: text,
          idempotency_key: idempotencyKey
        }
      });
      return sanitizeValue(data);
    } catch (error) {
      return { ok: false, code: error.code || "official_request_failed", message: error.message };
    }
  }

  async getJob(jobId) {
    const access = await this._access();
    if (!access.allowed) return { ok: false, code: access.code || "membership_required", message: access.message || "请先开通漫剧虾会员" };
    const id = String(jobId || "").trim();
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) return { ok: false, code: "invalid_job_id", message: "任务标识无效" };
    try {
      return sanitizeValue(await this._request(`/api/v1/ai/jobs/${encodeURIComponent(id)}`));
    } catch (error) {
      return { ok: false, code: error.code || "official_request_failed", message: error.message };
    }
  }
}

module.exports = {
  OfficialAiClient,
  OFFICIAL_AI_PRODUCT_ID,
  OFFICIAL_AI_ENTITLEMENT,
  OFFICIAL_AI_TASK_TYPE,
  sanitizeValue
};
