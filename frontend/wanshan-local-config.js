(function () {
  const STYLE_ID = "wanshan-local-config-style";
  const BAR_ID = "wanshan-local-config-bar";
  const MODAL_ID = "wanshan-local-config-modal";
  const TYPES = [
    ["llm", "大语言模型"],
    ["image", "图片生成模型"],
    ["video", "视频生成模型"],
  ];

  let currentType = "llm";
  let configs = [];
  let editing = null;

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .wlc-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;padding:10px 12px;border:1px solid rgba(100,181,246,.22);border-radius:8px;background:rgba(100,181,246,.07)}
      .wlc-bar-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .wlc-bar strong{color:#e8f7ff;font-size:14px}
      .wlc-bar span{color:rgba(220,240,255,.68);font-size:12px}
      .wlc-btn{border:1px solid rgba(100,181,246,.38);background:rgba(100,181,246,.14);color:#e8f7ff;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:13px}
      .wlc-btn:hover{background:rgba(100,181,246,.24)}
      .wlc-btn.primary{background:#409eff;border-color:#409eff;color:#fff}
      .wlc-btn.danger{border-color:rgba(245,108,108,.55);background:rgba(245,108,108,.12);color:#ffd8d8}
      .wlc-btn:disabled{opacity:.55;cursor:not-allowed}
      .wlc-mask{position:fixed;inset:0;background:rgba(3,8,22,.72);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px}
      .wlc-dialog{width:min(980px,96vw);max-height:92vh;overflow:hidden;background:#111a32;border:1px solid rgba(100,181,246,.25);border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.45);color:#e8f7ff;display:flex;flex-direction:column}
      .wlc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(100,181,246,.18)}
      .wlc-head h3{margin:0;font-size:17px;font-weight:650}
      .wlc-body{display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:16px;padding:16px;overflow:auto}
      .wlc-tabs{display:flex;gap:8px;margin-bottom:12px}
      .wlc-tab{flex:1}
      .wlc-list{display:flex;flex-direction:column;gap:8px;max-height:58vh;overflow:auto}
      .wlc-item{border:1px solid rgba(100,181,246,.18);border-radius:8px;padding:10px;background:rgba(255,255,255,.035);cursor:pointer}
      .wlc-item.active{border-color:#409eff;background:rgba(64,158,255,.16)}
      .wlc-item-title{font-weight:650;margin-bottom:4px}
      .wlc-item-meta{font-size:12px;color:rgba(220,240,255,.62);word-break:break-all}
      .wlc-empty{padding:24px 12px;text-align:center;color:rgba(220,240,255,.62);border:1px dashed rgba(100,181,246,.22);border-radius:8px}
      .wlc-form{border:1px solid rgba(100,181,246,.18);border-radius:8px;padding:14px;background:rgba(255,255,255,.025)}
      .wlc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .wlc-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
      .wlc-field label{font-size:12px;color:rgba(220,240,255,.68)}
      .wlc-field input,.wlc-field textarea,.wlc-field select{box-sizing:border-box;width:100%;border:1px solid rgba(100,181,246,.24);border-radius:6px;background:#0b1328;color:#e8f7ff;padding:8px 10px;outline:none}
      .wlc-field textarea{min-height:74px;resize:vertical;font-family:Consolas,monospace}
      .wlc-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;border-top:1px solid rgba(100,181,246,.16);padding-top:12px}
      .wlc-result{margin-top:10px;font-size:12px;white-space:pre-wrap;color:#a7e3ff}
      @media(max-width:760px){.wlc-body{grid-template-columns:1fr}.wlc-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function backendBase() {
    try {
      if (window.electronAPI && window.electronAPI.getBackendUrl) {
        return String(await window.electronAPI.getBackendUrl()).replace(/\/$/, "");
      }
    } catch (_) {}
    return "http://127.0.0.1:8000";
  }

  async function api(path, options) {
    const base = await backendBase();
    const res = await fetch(base + path, {
      headers: { "Content-Type": "application/json", ...(options && options.headers) },
      ...(options || {}),
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
    if (!res.ok) {
      const detail = body && (body.detail || body.message) ? (body.detail || body.message) : text || `HTTP ${res.status}`;
      throw new Error(detail);
    }
    return body;
  }

  function typeLabel(type) {
    return (TYPES.find((item) => item[0] === type) || TYPES[0])[1];
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value !== false && value != null) node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children || []) node.append(child);
    return node;
  }

  function formValue(form, name) {
    const input = form.querySelector(`[name="${name}"]`);
    return input ? input.value.trim() : "";
  }

  function numberValue(form, name, fallback) {
    const raw = formValue(form, name);
    if (!raw) return fallback;
    const num = Number(raw);
    return Number.isFinite(num) ? num : fallback;
  }

  function resetForm() {
    editing = null;
    renderModal();
  }

  async function loadConfigs() {
    configs = await api(`/api/llm-configs/?config_type=${encodeURIComponent(currentType)}&force=true`);
    configs = Array.isArray(configs) ? configs : [];
  }

  function buildPayload(form) {
    const payload = {
      name: formValue(form, "name"),
      base_url: formValue(form, "base_url"),
      model_name: formValue(form, "model_name"),
      config_type: currentType,
      request_timeout: numberValue(form, "request_timeout", 60),
    };
    const key = formValue(form, "api_key");
    if (key) payload.api_key = key;
    if (currentType === "llm") {
      payload.temperature = numberValue(form, "temperature", 0.7);
      payload.max_tokens = numberValue(form, "max_tokens", 4096);
      payload.context_window = numberValue(form, "context_window", 65536);
      const extra = formValue(form, "extra_params");
      payload.extra_params = extra ? JSON.parse(extra) : {};
    } else if (currentType === "image") {
      payload.image_ratio = formValue(form, "image_ratio") || "16:9";
      payload.download_timeout = numberValue(form, "download_timeout", 60);
      payload.retry_count = numberValue(form, "retry_count", 0);
    } else {
      payload.generation_mode = formValue(form, "generation_mode") || "image2video";
      payload.image_ratio = formValue(form, "image_ratio") || "16:9";
      payload.duration = numberValue(form, "duration", 5);
      payload.download_timeout = numberValue(form, "download_timeout", 60);
      payload.retry_count = numberValue(form, "retry_count", 0);
    }
    if (!payload.name || !payload.model_name) throw new Error("配置名称和模型名称不能为空");
    if (currentType !== "video" && (!payload.base_url || (!editing && !payload.api_key))) {
      throw new Error("API地址和API Key不能为空");
    }
    return payload;
  }

  async function saveConfig(form, result) {
    try {
      result.textContent = "";
      const payload = buildPayload(form);
      if (editing) {
        await api(`/api/llm-configs/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/llm-configs/", { method: "POST", body: JSON.stringify(payload) });
      }
      await loadConfigs();
      editing = null;
      renderModal();
      setTimeout(() => location.reload(), 250);
    } catch (error) {
      result.textContent = "保存失败: " + (error.message || error);
    }
  }

  async function deleteConfig(id, result) {
    if (!confirm("确定删除这条本地模型配置吗？")) return;
    try {
      await api(`/api/llm-configs/${id}`, { method: "DELETE" });
      await loadConfigs();
      editing = null;
      renderModal();
      setTimeout(() => location.reload(), 250);
    } catch (error) {
      result.textContent = "删除失败: " + (error.message || error);
    }
  }

  async function testConfig(id, result) {
    try {
      result.textContent = "正在测试...";
      const data = await api(`/api/llm-configs/${id}/test`, { method: "POST" });
      result.textContent = (data && data.success ? "测试成功: " : "测试失败: ") + ((data && data.message) || JSON.stringify(data));
    } catch (error) {
      result.textContent = "测试失败: " + (error.message || error);
    }
  }

  function field(name, label, value, attrs) {
    return el("div", { class: "wlc-field" }, [
      el("label", { text: label }),
      el(attrs && attrs.type === "textarea" ? "textarea" : "input", { name, value: value || "", ...(attrs || {}) }),
    ]);
  }

  function formNode() {
    const cfg = editing || {};
    const result = el("div", { class: "wlc-result" });
    const extra = cfg.extra_params && cfg.extra_params !== "{}" ? cfg.extra_params : "";
    const common = [
      field("name", "配置名称", cfg.name || ""),
      field("model_name", "模型名称 / 接入点ID", cfg.model_name || ""),
      field("base_url", "API地址", cfg.base_url || ""),
      field("api_key", editing ? "API Key（留空保持原值）" : "API Key", ""),
      field("request_timeout", "请求超时(秒)", cfg.request_timeout || 60, { type: "number" }),
    ];
    const typed = currentType === "llm"
      ? [
          field("temperature", "温度", cfg.temperature || 0.7, { type: "number", step: "0.1" }),
          field("max_tokens", "最大输出Token", cfg.max_tokens || 4096, { type: "number" }),
          field("context_window", "上下文窗口", cfg.context_window || 65536, { type: "number" }),
          field("extra_params", "额外参数(JSON)", extra, { type: "textarea" }),
        ]
      : currentType === "image"
        ? [
            field("image_ratio", "图片比例", cfg.image_ratio || "16:9"),
            field("download_timeout", "下载超时(秒)", cfg.download_timeout || 60, { type: "number" }),
            field("retry_count", "重试次数", cfg.retry_count || 0, { type: "number" }),
          ]
        : [
            field("generation_mode", "生成模式", cfg.generation_mode || "image2video"),
            field("image_ratio", "画幅比例", cfg.image_ratio || "16:9"),
            field("duration", "视频时长(秒)", cfg.duration || 5, { type: "number" }),
            field("download_timeout", "下载超时(秒)", cfg.download_timeout || 60, { type: "number" }),
            field("retry_count", "重试次数", cfg.retry_count || 0, { type: "number" }),
          ];
    const form = el("form", { class: "wlc-form" }, [
      el("div", { class: "wlc-grid" }, common.concat(typed)),
      el("div", { class: "wlc-actions" }, [
        el("button", { class: "wlc-btn", type: "button", onclick: resetForm, text: "新建" }),
        editing ? el("button", { class: "wlc-btn", type: "button", onclick: () => testConfig(editing.id, result), text: "测试" }) : document.createTextNode(""),
        editing ? el("button", { class: "wlc-btn danger", type: "button", onclick: () => deleteConfig(editing.id, result), text: "删除" }) : document.createTextNode(""),
        el("button", { class: "wlc-btn primary", type: "submit", text: editing ? "保存修改" : "创建配置" }),
      ]),
      result,
    ]);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveConfig(form, result);
    });
    return form;
  }

  function renderModal() {
    addStyle();
    let mask = document.getElementById(MODAL_ID);
    if (!mask) {
      mask = el("div", { id: MODAL_ID, class: "wlc-mask" });
      document.body.appendChild(mask);
    }
    const list = configs.length
      ? el("div", { class: "wlc-list" }, configs.map((cfg) => el("div", {
          class: "wlc-item" + (editing && editing.id === cfg.id ? " active" : ""),
          onclick: () => { editing = cfg; renderModal(); },
        }, [
          el("div", { class: "wlc-item-title", text: cfg.name || `配置#${cfg.id}` }),
          el("div", { class: "wlc-item-meta", text: cfg.model_name || "" }),
          el("div", { class: "wlc-item-meta", text: cfg.base_url || "" }),
        ])))
      : el("div", { class: "wlc-empty", text: `暂无${typeLabel(currentType)}配置` });
    mask.replaceChildren(el("div", { class: "wlc-dialog" }, [
      el("div", { class: "wlc-head" }, [
        el("h3", { text: "万山本地模型配置" }),
        el("button", { class: "wlc-btn", onclick: closeModal, text: "关闭" }),
      ]),
      el("div", { class: "wlc-body" }, [
        el("div", {}, [
          el("div", { class: "wlc-tabs" }, TYPES.map(([type, label]) => el("button", {
            class: "wlc-btn wlc-tab" + (currentType === type ? " primary" : ""),
            onclick: async () => {
              currentType = type;
              editing = null;
              await loadConfigs();
              renderModal();
            },
            text: label,
          }))),
          list,
        ]),
        formNode(),
      ]),
    ]));
  }

  function closeModal() {
    const node = document.getElementById(MODAL_ID);
    if (node) node.remove();
  }

  async function openModal() {
    try {
      await loadConfigs();
      editing = configs[0] || null;
      renderModal();
    } catch (error) {
      alert("加载本地模型配置失败: " + (error.message || error));
    }
  }

  async function openRemoteConfig() {
    const api = window.electronAPI || {};
    if (!api.openLlmConfigEmbed) {
      alert("当前客户端不支持远端模型配置窗口");
      return;
    }
    try {
      const result = await api.openLlmConfigEmbed();
      if (result && result.success === false) alert(result.message || "打开远端模型配置失败");
    } catch (error) {
      alert("打开远端模型配置失败: " + (error.message || error));
    }
  }

  function ensureBar() {
    if (!location.hash.includes("/settings")) return;
    if (document.getElementById(BAR_ID)) return;
    const cloudBanner = document.querySelector(".qs-cloud-banner");
    const toolbar = document.querySelector(".qs-toolbar");
    const anchor = cloudBanner || toolbar;
    if (!anchor) return;
    if (cloudBanner) cloudBanner.style.display = "none";
    addStyle();
    const bar = el("div", { id: BAR_ID, class: "wlc-bar" }, [
      el("div", {}, [
        el("strong", { text: "万山模型配置" }),
        el("span", { text: " 可使用千山远端配置，也可保留本机加密配置兜底。" }),
      ]),
      el("div", { class: "wlc-bar-actions" }, [
        el("button", { class: "wlc-btn", onclick: openRemoteConfig, text: "千山远端配置" }),
        el("button", { class: "wlc-btn primary", onclick: openModal, text: "管理本地配置" }),
      ]),
    ]);
    anchor.insertAdjacentElement("afterend", bar);
  }

  const observer = new MutationObserver(ensureBar);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", () => setTimeout(ensureBar, 200));
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBar, 800));
  setInterval(ensureBar, 1500);
})();
