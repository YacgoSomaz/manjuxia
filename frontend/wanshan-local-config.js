(function () {
  const STYLE_ID = "wanshan-local-config-style";
  const BAR_ID = "wanshan-local-config-bar";
  const MODAL_ID = "wanshan-local-config-modal";
  const TYPES = [
    ["llm", "语言大模型"],
    ["image", "图片大模型"],
    ["video", "视频大模型"],
    ["audio", "语音大模型"],
  ];
  const DEFAULT_MAX_TOKENS = 20000;
  const DEFAULT_CONTEXT_WINDOW = 131072;
  const LOCAL_PRESETS = {
    llm: [
      {
        id: "deepseek",
        label: "DeepSeek 官方",
        name: "DeepSeek",
        base_url: "https://api.deepseek.com/v1",
        model_name: "deepseek-chat",
        temperature: 0.7,
        max_tokens: DEFAULT_MAX_TOKENS,
        context_window: DEFAULT_CONTEXT_WINDOW,
      },
      {
        id: "volcengine",
        label: "火山方舟",
        name: "火山方舟",
        base_url: "https://ark.cn-beijing.volces.com/api/v3",
        model_name: "ep-请填你的接入点ID",
        temperature: 0.7,
        max_tokens: DEFAULT_MAX_TOKENS,
        context_window: DEFAULT_CONTEXT_WINDOW,
      },
      {
        id: "openai",
        label: "OpenAI 兼容",
        name: "OpenAI",
        base_url: "https://api.openai.com/v1",
        model_name: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 16000,
        context_window: 128000,
      },
      {
        id: "qwen",
        label: "通义千问",
        name: "通义千问",
        base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model_name: "qwen-plus",
        temperature: 0.7,
        max_tokens: DEFAULT_MAX_TOKENS,
        context_window: DEFAULT_CONTEXT_WINDOW,
      },
      {
        id: "siliconflow",
        label: "硅基流动",
        name: "硅基流动",
        base_url: "https://api.siliconflow.cn/v1",
        model_name: "deepseek-ai/DeepSeek-V3",
        temperature: 0.7,
        max_tokens: DEFAULT_MAX_TOKENS,
        context_window: DEFAULT_CONTEXT_WINDOW,
      },
      { id: "custom", label: "自定义 / 中转站 OpenAI 兼容", name: "自定义中转站", base_url: "", model_name: "", max_tokens: DEFAULT_MAX_TOKENS, context_window: DEFAULT_CONTEXT_WINDOW },
    ],
    image: [
      { id: "volcengine-image", label: "火山方舟生图", name: "火山生图", base_url: "https://ark.cn-beijing.volces.com/api/v3", model_name: "ep-请填你的生图接入点ID", image_ratio: "16:9" },
      { id: "openai-image", label: "OpenAI 图片", name: "OpenAI 图片", base_url: "https://api.openai.com/v1", model_name: "gpt-image-1", image_ratio: "16:9" },
      { id: "custom-image", label: "自定义 / 中转站图片接口", name: "自定义图片中转站", base_url: "", model_name: "", image_ratio: "16:9" },
    ],
    video: [
      { id: "volcengine-video", label: "火山方舟视频", name: "火山视频", base_url: "https://ark.cn-beijing.volces.com/api/v3", model_name: "ep-请填你的视频接入点ID", generation_mode: "image2video", image_ratio: "16:9", duration: 5 },
      { id: "cool-video", label: "Cool Seedance", name: "Cool 视频", base_url: "https://api.mjapi.cc.cd", model_name: "cool-seedance-2-fast-720p", generation_mode: "image2video", image_ratio: "16:9", duration: 5 },
      { id: "xinglian-video", label: "星链云 SD2", name: "星链云视频", base_url: "https://www.vjimeng.vip", model_name: "sd2-720p-fast", generation_mode: "image2video", image_ratio: "16:9", duration: 5 },
      { id: "jimeng-local", label: "即梦网页登录", name: "即梦视频", base_url: "", model_name: "seedance-2.0-fast", generation_mode: "image2video", image_ratio: "16:9", duration: 5 },
      { id: "custom-video", label: "自定义 / 中转站视频接口", name: "自定义视频中转站", base_url: "", model_name: "", generation_mode: "image2video", image_ratio: "16:9", duration: 5 },
    ],
    audio: [
      { id: "volcengine-audio", label: "火山方舟语音", name: "火山语音", base_url: "https://ark.cn-beijing.volces.com/api/v3", model_name: "ep-请填你的语音接入点ID" },
      { id: "openai-audio", label: "OpenAI 语音", name: "OpenAI 语音", base_url: "https://api.openai.com/v1", model_name: "tts-1" },
      { id: "custom-audio", label: "自定义 / 中转站语音接口", name: "自定义语音中转站", base_url: "", model_name: "" },
    ],
  };

  let currentType = "llm";
  let configs = [];
  let editing = null;
  let loadError = "";

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
      .wlc-intro{margin:0 0 12px;color:rgba(220,240,255,.72);font-size:13px;line-height:1.6}
      .wlc-preset-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;margin-bottom:12px}
      .wlc-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
      .wlc-field label{font-size:12px;color:rgba(220,240,255,.68)}
      .wlc-field input,.wlc-field textarea,.wlc-field select{box-sizing:border-box;width:100%;border:1px solid rgba(100,181,246,.24);border-radius:6px;background:#0b1328;color:#e8f7ff;padding:8px 10px;outline:none}
      .wlc-field textarea{min-height:74px;resize:vertical;font-family:Consolas,monospace}
      .wlc-field small{color:rgba(220,240,255,.52);line-height:1.45}
      .wlc-advanced{grid-column:1/-1;border:1px solid rgba(100,181,246,.16);border-radius:8px;padding:8px 10px;background:rgba(255,255,255,.02)}
      .wlc-advanced summary{cursor:pointer;color:#a7e3ff;font-size:13px}
      .wlc-advanced .wlc-grid{margin-top:10px}
      .wlc-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;border-top:1px solid rgba(100,181,246,.16);padding-top:12px}
      .wlc-result{margin-top:10px;font-size:12px;white-space:pre-wrap;color:#a7e3ff}
      @media(max-width:760px){.wlc-body{grid-template-columns:1fr}.wlc-grid,.wlc-preset-row{grid-template-columns:1fr}}
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
    const bridge = window.electronAPI && window.electronAPI.localModelConfig;
    if (bridge && typeof bridge.request === "function") {
      return bridge.request({
        path,
        method: (options && options.method) || "GET",
        body: options && options.body,
      });
    }
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
      else if (key === "value") node.value = value == null ? "" : String(value);
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
    loadError = "";
    renderModal();
  }

  function currentPresets() {
    return LOCAL_PRESETS[currentType] || LOCAL_PRESETS.llm;
  }

  function defaultPreset() {
    return currentPresets()[0] || {};
  }

  function applyPresetToForm(form, preset) {
    if (!form || !preset) return;
    const set = (name, value) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input && value != null) input.value = String(value);
    };
    set("name", preset.name || preset.label || "");
    set("base_url", preset.base_url || "");
    set("model_name", preset.model_name || "");
    set("temperature", preset.temperature ?? 0.7);
    set("max_tokens", preset.max_tokens ?? DEFAULT_MAX_TOKENS);
    set("context_window", preset.context_window ?? DEFAULT_CONTEXT_WINDOW);
    set("image_ratio", preset.image_ratio || "16:9");
    set("generation_mode", preset.generation_mode || "image2video");
    set("duration", preset.duration || 5);
    set("request_timeout", preset.request_timeout || 120);
    set("download_timeout", preset.download_timeout || 120);
    set("retry_count", preset.retry_count || 0);
    set("extra_params", preset.extra_params ? JSON.stringify(preset.extra_params, null, 2) : "");
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
      request_timeout: numberValue(form, "request_timeout", 120),
    };
    const key = formValue(form, "api_key");
    if (key) payload.api_key = key;
    if (currentType === "llm") {
      payload.temperature = numberValue(form, "temperature", 0.7);
      payload.max_tokens = numberValue(form, "max_tokens", DEFAULT_MAX_TOKENS);
      payload.context_window = numberValue(form, "context_window", DEFAULT_CONTEXT_WINDOW);
      const extra = formValue(form, "extra_params");
      payload.extra_params = extra ? JSON.parse(extra) : {};
    } else if (currentType === "image") {
      payload.image_ratio = formValue(form, "image_ratio") || "16:9";
      payload.download_timeout = numberValue(form, "download_timeout", 120);
      payload.retry_count = numberValue(form, "retry_count", 0);
    } else if (currentType === "video") {
      payload.generation_mode = formValue(form, "generation_mode") || "image2video";
      payload.image_ratio = formValue(form, "image_ratio") || "16:9";
      payload.duration = numberValue(form, "duration", 5);
      payload.download_timeout = numberValue(form, "download_timeout", 120);
      payload.retry_count = numberValue(form, "retry_count", 0);
    } else if (currentType === "audio") {
      const extra = formValue(form, "extra_params");
      payload.extra_params = extra ? JSON.parse(extra) : {};
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
    const options = attrs && attrs.options;
    const hint = attrs && attrs.hint;
    const cleanAttrs = { ...(attrs || {}) };
    delete cleanAttrs.options;
    delete cleanAttrs.hint;
    const control = options
      ? el("select", { name, value: value || "", ...cleanAttrs }, options.map((item) => el("option", { value: item[0], text: item[1] })))
      : el(cleanAttrs.type === "textarea" ? "textarea" : "input", { name, value: value || "", ...cleanAttrs });
    if (options) control.value = value || "";
    return el("div", { class: "wlc-field" }, [
      el("label", { text: label }),
      control,
      hint ? el("small", { text: hint }) : document.createTextNode(""),
    ]);
  }

  function presetSelector() {
    const presets = currentPresets();
    const select = field("preset", "厂商预设", defaultPreset().id || "", {
      options: presets.map((preset) => [preset.id, preset.label]),
      hint: "一般只需要选厂商、填 API Key；其它参数已自动带好。",
    });
    select.querySelector("select").addEventListener("change", (event) => {
      const form = event.target.closest("form");
      const preset = presets.find((item) => item.id === event.target.value);
      applyPresetToForm(form, preset);
    });
    return select;
  }

  function formNode() {
    const cfg = editing || {};
    const result = el("div", { class: "wlc-result" });
    const extra = cfg.extra_params && cfg.extra_params !== "{}" ? cfg.extra_params : "";
    const preset = defaultPreset();
    const common = [
      field("name", "配置名称", cfg.name || preset.name || ""),
      field("api_key", editing ? "API Key（留空保持原值）" : "API Key", "", { type: "password", autocomplete: "off", hint: "只保存在本机加密配置里，不写进安装包。" }),
      field("model_name", currentType === "llm" ? "语言模型 / 接入点ID" : currentType === "image" ? "图片模型 / 接入点ID" : currentType === "video" ? "视频模型 / 接入点ID" : "语音模型 / 接入点ID", cfg.model_name || preset.model_name || ""),
      field("base_url", "API地址", cfg.base_url || preset.base_url || "", { hint: "官方厂商会自动预填；中转站请选择“自定义 / 中转站”，填写 HTTPS 地址和 Key。" }),
    ];
    const typed = currentType === "llm"
      ? [
          el("details", { class: "wlc-advanced" }, [
            el("summary", { text: "高级设置（默认不用改）" }),
            el("div", { class: "wlc-grid" }, [
              field("temperature", "温度", cfg.temperature || preset.temperature || 0.7, { type: "number", step: "0.1" }),
              field("max_tokens", "最大输出Token", cfg.max_tokens || preset.max_tokens || DEFAULT_MAX_TOKENS, { type: "number", hint: "默认 20000，适合长剧本和长章节输出。" }),
              field("context_window", "上下文窗口", cfg.context_window || preset.context_window || DEFAULT_CONTEXT_WINDOW, { type: "number" }),
              field("request_timeout", "请求超时(秒)", cfg.request_timeout || 120, { type: "number" }),
              field("extra_params", "额外参数(JSON)", extra, { type: "textarea", placeholder: "通常留空。只有厂商要求 top_p、response_format 等特殊参数时才填写。" }),
            ]),
          ]),
        ]
      : currentType === "image"
        ? [
            field("image_ratio", "图片比例", cfg.image_ratio || preset.image_ratio || "16:9", { options: [["16:9", "16:9 横屏"], ["9:16", "9:16 竖屏"], ["1:1", "1:1 方图"], ["4:3", "4:3"], ["3:4", "3:4"], ["2:1", "2:1 全景"]] }),
            el("details", { class: "wlc-advanced" }, [
              el("summary", { text: "高级设置（默认不用改）" }),
              el("div", { class: "wlc-grid" }, [
                field("download_timeout", "下载超时(秒)", cfg.download_timeout || 120, { type: "number" }),
                field("retry_count", "重试次数", cfg.retry_count || 0, { type: "number" }),
              ]),
            ]),
          ]
        : currentType === "video"
          ? [
            field("generation_mode", "生成模式", cfg.generation_mode || preset.generation_mode || "image2video", { options: [["image2video", "图生视频"], ["text2video", "文生视频"], ["multimodal2video", "多图/参考视频"]] }),
            field("image_ratio", "画幅比例", cfg.image_ratio || preset.image_ratio || "16:9", { options: [["16:9", "16:9 横屏"], ["9:16", "9:16 竖屏"], ["1:1", "1:1 方图"], ["4:3", "4:3"], ["3:4", "3:4"]] }),
            field("duration", "视频时长(秒)", cfg.duration || preset.duration || 5, { type: "number" }),
            el("details", { class: "wlc-advanced" }, [
              el("summary", { text: "高级设置（默认不用改）" }),
              el("div", { class: "wlc-grid" }, [
                field("request_timeout", "请求超时(秒)", cfg.request_timeout || 120, { type: "number" }),
                field("download_timeout", "下载超时(秒)", cfg.download_timeout || 120, { type: "number" }),
                field("retry_count", "重试次数", cfg.retry_count || 0, { type: "number" }),
              ]),
            ]),
          ]
          : [
              el("details", { class: "wlc-advanced" }, [
                el("summary", { text: "高级设置（默认不用改）" }),
                el("div", { class: "wlc-grid" }, [
                  field("request_timeout", "请求超时(秒)", cfg.request_timeout || 120, { type: "number" }),
                  field("extra_params", "额外参数(JSON)", extra, { type: "textarea", placeholder: "通常留空。语音厂商要求 voice、speed、format 等参数时才填写。" }),
                ]),
              ]),
            ];
    const form = el("form", { class: "wlc-form" }, [
      el("p", { class: "wlc-intro", text: "低代码本地配置：官方厂商选预设后填 API Key；中转站请选择“自定义 / 中转站”，填写 HTTPS API 地址、Key 和模型名。" }),
      editing ? document.createTextNode("") : presetSelector(),
      el("div", { class: "wlc-grid" }, common.concat(typed)),
      el("div", { class: "wlc-actions" }, [
        el("button", { class: "wlc-btn", type: "button", onclick: resetForm, text: "新建" }),
        editing ? el("button", { class: "wlc-btn", type: "button", onclick: () => testConfig(editing.id, result), text: "测试" }) : document.createTextNode(""),
        editing ? el("button", { class: "wlc-btn danger", type: "button", onclick: () => deleteConfig(editing.id, result), text: "删除" }) : document.createTextNode(""),
        el("button", { class: "wlc-btn primary", type: "submit", text: editing ? "保存修改" : "保存本地配置" }),
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
      : el("div", { class: "wlc-empty", text: loadError || `暂无${typeLabel(currentType)}配置` });
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
    editing = null;
    loadError = "";
    configs = [];
    renderModal();
    try {
      await loadConfigs();
      loadError = "";
      renderModal();
    } catch (error) {
      loadError = "读取已有配置失败，但可以先新建本地配置。";
      renderModal();
    }
  }

  window.manjuxiaOpenLocalModelConfig = openModal;

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
    normalizeLocalLabels();
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
        el("span", { text: " 使用本机加密配置；选厂商、填 Key 即可。" }),
      ]),
      el("div", { class: "wlc-bar-actions" }, [
        el("button", { class: "wlc-btn primary", onclick: openModal, text: "一键本地配置" }),
      ]),
    ]);
    anchor.insertAdjacentElement("afterend", bar);
  }

  function normalizeLocalLabels() {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.nodeValue && node.nodeValue.includes("云端同步")) {
        node.nodeValue = node.nodeValue.replaceAll("云端同步", "本地配置");
      }
    }
  }

  const observer = new MutationObserver(ensureBar);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", () => setTimeout(ensureBar, 200));
  window.addEventListener("DOMContentLoaded", () => setTimeout(ensureBar, 800));
  setInterval(ensureBar, 1500);
})();
