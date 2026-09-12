'use strict';

class AiContractError extends Error {
  constructor(message, code = 'AI_CONTRACT_INVALID') {
    super(message);
    this.name = 'AiContractError';
    this.code = code;
  }
}

const AI_TASKS = Object.freeze({
  replay_report: Object.freeze({
    productId: 'replay_shrimp', entitlement: 'livewatch', displayName: 'AI复盘报告',
    kind: 'text', creditCost: 60, maxInputChars: 18_000, maxOutputTokens: 3_600,
  }),
  replay_advisor: Object.freeze({
    productId: 'replay_shrimp', entitlement: 'livewatch', displayName: 'AI专场顾问',
    kind: 'text', creditCost: 8, maxInputChars: 12_000, maxOutputTokens: 1_600,
  }),
  comic_creation: Object.freeze({
    productId: 'comic_shrimp', entitlement: 'comic_course', displayName: '漫剧创作',
    // A converted chapter and its extraction template routinely exceed 18k
    // Chinese characters.  The language model supports long context; keep
    // the product contract aligned so official extraction is not rejected
    // before it reaches the model.
    kind: 'text', creditCost: 30, maxInputChars: 100_000, maxOutputTokens: 3_000,
  }),
  comic_creation_deepseek_v41: Object.freeze({
    productId: 'comic_shrimp', entitlement: 'comic_course', displayName: 'DeepSeek V4.1 漫剧创作',
    // Kept as a distinct task so the server, not the desktop, selects the
    // DeepSeek credential and model for this official-compute option.
    kind: 'text', creditCost: 30, maxInputChars: 100_000, maxOutputTokens: 30_000,
  }),
  operation_analysis: Object.freeze({
    productId: 'operation_shrimp', entitlement: 'operation_course', displayName: '运营分析',
    kind: 'text', creditCost: 20, maxInputChars: 16_000, maxOutputTokens: 2_400,
  }),
  comic_image: Object.freeze({
    productId: 'comic_shrimp', entitlement: 'comic_course', displayName: '漫剧图片生成',
    kind: 'image', creditCost: 100, maxInputChars: 10_000, maxOutputTokens: 0,
  }),
  comic_image_seedream2: Object.freeze({
    productId: 'comic_shrimp', entitlement: 'comic_course', displayName: 'Seedream5 图片生成',
    kind: 'image', creditCost: 100, maxInputChars: 10_000, maxOutputTokens: 0,
  }),
  comic_video: Object.freeze({
    productId: 'comic_shrimp', entitlement: 'comic_course', displayName: '漫剧视频生成',
    kind: 'video', creditCost: 800, maxInputChars: 10_000, maxOutputTokens: 0,
  }),
  operation_image: Object.freeze({
    productId: 'operation_shrimp', entitlement: 'operation_course', displayName: '运营图片生成',
    kind: 'image', creditCost: 30, maxInputChars: 4_000, maxOutputTokens: 0,
  }),
});

function normalizePhone(value) {
  return String(value || '').trim().replace(/^\+86/, '').replace(/^86(?=1\d{10}$)/, '');
}

function assertPlainString(value, field, maxLength, minLength = 1) {
  if (typeof value !== 'string') throw new AiContractError(`${field}必须是文本`);
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new AiContractError(`${field}长度无效`);
  }
  return normalized;
}

function normalizeAiJobRequest(body) {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  if (!raw) throw new AiContractError('AI请求格式无效');
  for (const protectedField of ['system_prompt', 'model', 'api_key', 'api_base', 'provider']) {
    if (Object.prototype.hasOwnProperty.call(raw, protectedField)) {
      throw new AiContractError('客户端不能覆盖官方AI配置', 'AI_CONFIG_OVERRIDE_FORBIDDEN');
    }
  }
  const productId = assertPlainString(raw.product_id, 'product_id', 48);
  const taskType = assertPlainString(raw.task_type, 'task_type', 48);
  const task = AI_TASKS[taskType];
  if (!task) throw new AiContractError('未知官方AI任务', 'AI_TASK_UNKNOWN');
  if (task.productId !== productId) throw new AiContractError('该AI任务不属于当前软件', 'AI_PRODUCT_MISMATCH');
  const inputText = assertPlainString(raw.input_text, 'input_text', task.maxInputChars);
  const idempotencyKey = assertPlainString(raw.idempotency_key, 'idempotency_key', 128, 16);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(idempotencyKey)) {
    throw new AiContractError('幂等键格式无效');
  }
  return {
    productId,
    taskType,
    inputText,
    idempotencyKey,
    creditCost: task.creditCost,
    maxOutputTokens: task.maxOutputTokens,
    kind: task.kind || 'text',
  };
}

// Official video accepts a provider *choice* and short-lived HTTPS asset URLs,
// never a provider credential or endpoint supplied by the desktop client.
function normalizeOfficialVideoJobRequest(body) {
  const base = normalizeAiJobRequest({ ...(body || {}), task_type: 'comic_video' });
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const provider = assertPlainString(raw.video_provider, 'video_provider', 24);
  if (!['newapi', 'volcengine_ark'].includes(provider)) throw new AiContractError('官方视频模型无效');
  const urls = (value, field, limit) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > limit) throw new AiContractError(`${field}数量无效`);
    return value.map((item) => {
      const text = assertPlainString(item, field, 2048);
      let url;
      try { url = new URL(text); } catch { throw new AiContractError(`${field}地址无效`); }
      if (url.protocol !== 'https:' || url.username || url.password) throw new AiContractError(`${field}必须是 HTTPS 地址`);
      return url.toString();
    });
  };
  const params = raw.params && typeof raw.params === 'object' && !Array.isArray(raw.params) ? raw.params : {};
  for (const key of ['api_key', 'key', 'base_url', 'model', 'provider']) {
    if (Object.prototype.hasOwnProperty.call(params, key)) throw new AiContractError('客户端不能覆盖官方视频配置', 'AI_CONFIG_OVERRIDE_FORBIDDEN');
  }
  return { ...base, videoProvider: provider, images: urls(raw.images, '参考图', 9), audios: urls(raw.audios, '参考音频', 3), videos: urls(raw.videos, '参考视频', 3), params };
}

function normalizeCreditAdjustment(body) {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  if (!raw) throw new AiContractError('积分调整格式无效');
  const phone = normalizePhone(raw.phone);
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new AiContractError('请输入正确的11位手机号');
  const delta = Number(raw.delta);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100_000) {
    throw new AiContractError('积分调整必须是1至100000之间的非零整数');
  }
  const note = assertPlainString(raw.note, '调整备注', 160, 2);
  return { phone, delta, note };
}

function publicAiTask(task) {
  return {
    task_type: task.taskType || Object.entries(AI_TASKS).find(([, value]) => value === task)?.[0] || null,
    product_id: task.productId,
    name: task.displayName,
    credits: Number(task.creditCost),
    max_input_chars: Number(task.maxInputChars),
    max_output_tokens: Number(task.maxOutputTokens),
    output_kind: task.kind || 'text',
    enabled: Boolean(task.enabled),
    model_configured: Boolean(task.modelConfigured),
  };
}

module.exports = {
  AI_TASKS,
  AiContractError,
  normalizeAiJobRequest,
  normalizeOfficialVideoJobRequest,
  normalizeCreditAdjustment,
  publicAiTask,
};
