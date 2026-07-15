const LOCAL_ORIGIN = "http://local.invalid";
const ROOT_PATH = /^\/api\/llm-configs\/?$/;
const ITEM_PATH = /^\/api\/llm-configs\/\d+\/?$/;
const TEST_PATH = /^\/api\/llm-configs\/\d+\/test\/?$/;

function normalizeLlmConfigRequest(requestPath, method = "GET") {
  let target;
  try {
    target = new URL(String(requestPath || ""), LOCAL_ORIGIN);
  } catch (_) {
    throw new Error("本地模型配置请求地址无效");
  }
  if (target.origin !== LOCAL_ORIGIN) {
    throw new Error("本地模型配置只允许访问本机服务");
  }

  const requestMethod = String(method || "GET").toUpperCase();
  const pathname = target.pathname;
  const valid =
    (ROOT_PATH.test(pathname) && ["GET", "POST"].includes(requestMethod)) ||
    (ITEM_PATH.test(pathname) && ["PUT", "DELETE"].includes(requestMethod)) ||
    (TEST_PATH.test(pathname) && requestMethod === "POST");
  if (!valid) {
    throw new Error("不支持的本地模型配置请求");
  }
  return `${pathname}${target.search}`;
}

module.exports = { normalizeLlmConfigRequest };
