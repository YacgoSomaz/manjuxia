(function () {
  const MODAL_ID = "manjuxia-official-ai-modal";
  const STYLE_ID = "manjuxia-official-ai-style";
  const SOURCE_ID = "manjuxia-image-source-bar";
  const OFFICIAL_IMAGE_CONFIG_ID = "official:comic_image";
  const OFFICIAL_TEXT_CONFIG_PREFIX = "official:text:";
  const OFFICIAL_IMAGE_TASK_TYPE = "comic_image";
  const OFFICIAL_IMAGE_LABEL = "官方图片算力（积分）";
  let pollTimer = null;
  let currentJobId = "";
  let currentIdempotencyKey = "";
  let currentTaskType = OFFICIAL_IMAGE_TASK_TYPE;
  let currentTaskKind = "image";
  const sourceModes = { image: "local", llm: "local" };
  let sourceMode = "local";
  let imageResolver = null;
  let previousFetch = null;
  const officialTaskTypes = new Map();

  function api() {
    return window.electronAPI && window.electronAPI.officialAi;
  }

  function node(tag, props = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "text") el.textContent = value;
      else if (key === "className") el.className = value;
      else if (key === "onclick") el.addEventListener("click", value);
      else if (key === "disabled") el.disabled = Boolean(value);
      else el.setAttribute(key, value);
    }
    for (const child of children) el.append(child);
    return el;
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:2147483000;background:rgba(4,10,24,.68);display:grid;place-items:center;padding:20px}
      .oai-dialog{width:min(680px,calc(100vw - 36px));max-height:calc(100vh - 44px);overflow:auto;background:#101a35;border:1px solid #3d77b8;border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.45);color:#edf5ff;font-family:"Microsoft YaHei",sans-serif}
      .oai-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(150,190,240,.18)}
      .oai-head strong{font-size:18px}.oai-close{border:0;background:transparent;color:#b8c9e3;font-size:22px;cursor:pointer;padding:2px 6px}.oai-body{padding:18px 20px}
      .oai-source{display:flex;gap:8px;margin-bottom:16px}.oai-source button,.oai-actions button{border:1px solid #3d77b8;background:#16274a;color:#edf5ff;border-radius:7px;padding:9px 14px;cursor:pointer}.oai-source button.active,.oai-actions button.primary{background:#27bfd0;color:#061226;border-color:#27bfd0;font-weight:700}
      .oai-copy{margin:0 0 14px;color:#b8c9e3;font-size:13px;line-height:1.65}.oai-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 16px}.oai-meta div{padding:10px;background:#0b1530;border:1px solid rgba(130,175,230,.18);border-radius:7px}.oai-meta small{display:block;color:#94abca;font-size:11px}.oai-meta b{display:block;margin-top:4px;color:#f2f7ff;font-size:14px;word-break:break-word}.oai-text{width:100%;min-height:180px;resize:vertical;border:1px solid #385c8e;border-radius:8px;background:#09142d;color:#f4f8ff;padding:12px;line-height:1.6;font:inherit}.oai-text::placeholder{color:#7e95b5}.oai-status{min-height:24px;margin:12px 0;color:#a7c6e8;font-size:13px}.oai-status.error{color:#ffb4b4}.oai-status.ok{color:#91e0b0}.oai-output{display:none;max-height:300px;overflow:auto;margin:12px 0;padding:12px;border:1px solid rgba(130,175,230,.24);border-radius:8px;background:#09142d;color:#eaf3ff;font:13px/1.65 "Microsoft YaHei",sans-serif}.oai-output-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.oai-output-card{display:flex;flex-direction:column;gap:6px;color:#c9dcf5}.oai-output-card img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:7px;background:#172744}.oai-output-card a{color:#8de9f0;font-size:12px}.oai-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.oai-note{color:#8198b8;font-size:12px;margin-top:14px;line-height:1.55}
      #${SOURCE_ID}{position:fixed;right:24px;top:72px;z-index:1800;display:none;align-items:center;gap:8px;padding:8px 10px;background:#101a35;border:1px solid #315988;border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:12px "Microsoft YaHei",sans-serif;color:#b8c9e3}
      #${SOURCE_ID}.visible{display:flex}#${SOURCE_ID} button{border:1px solid #315988;background:#17284b;color:#dbe9fb;border-radius:6px;padding:6px 9px;cursor:pointer}#${SOURCE_ID} button.active{background:#27bfd0;color:#061226;font-weight:700}#${SOURCE_ID} .source-status{max-width:180px;line-height:1.35}#${SOURCE_ID} .source-status.error{color:#ffb4b4}
      @media(max-width:520px){.oai-meta{grid-template-columns:1fr}.oai-body{padding:14px}.oai-head{padding:14px}#${SOURCE_ID}{right:10px;top:62px}}
    `;
    style.textContent += `
      .oai-image-wrap{position:relative;width:100%;aspect-ratio:1;border-radius:7px;background:#172744;overflow:hidden;display:grid;place-items:center}
      .oai-image-wrap img{display:block;width:100%;height:100%;object-fit:contain}
      .oai-image-placeholder{position:absolute;color:#a9bbd4;font-size:12px}
      .oai-image-wrap.is-error{border:1px solid #c66a6a}
      .oai-image-wrap.is-error .oai-image-placeholder{color:#ffb4b4}
      .oai-output-card button{border:1px solid #3d77b8;background:#16274a;color:#edf5ff;border-radius:6px;padding:6px 9px;cursor:pointer}
      .oai-text-output{white-space:pre-wrap;max-height:360px;overflow:auto;padding:12px;border-radius:7px;background:#09142d;color:#edf5ff;line-height:1.7}
      .oai-inline-source{display:inline-flex;align-items:center;gap:4px;margin:5px 0 0;padding:3px;border:1px solid rgba(61,119,184,.38);border-radius:7px;background:rgba(9,20,45,.7);font:11px "Microsoft YaHei",sans-serif}
      .oai-inline-source button{border:0;border-radius:5px;padding:5px 7px;background:transparent;color:#b8c9e3;cursor:pointer}.oai-inline-source button.active{background:#27bfd0;color:#061226;font-weight:700}.oai-inline-source button:disabled{opacity:.55;cursor:not-allowed}.oai-inline-source small{color:#8198b8;padding:0 3px}
    `;
    document.head.append(style);
  }

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  function createIdempotencyKey() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 3) | 8;
      return value.toString(16);
    });
  }

  function closeModal(resolveCancel = true) {
    stopPolling();
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.remove();
    if (resolveCancel && imageResolver) {
      const resolve = imageResolver;
      imageResolver = null;
      resolve({ ok: false, code: "cancelled", message: "已取消图片生成" });
    }
  }

  function setStatus(modal, text, type = "") {
    const status = modal && modal.querySelector(".oai-status");
    if (!status) return;
    status.textContent = text || "";
    status.className = `oai-status ${type}`.trim();
  }

  function getResultAssets(job) {
    if (!job || !Array.isArray(job.result_assets)) return [];
    return job.result_assets.filter((asset) => asset && (
      typeof asset.display_url === "string" && asset.display_url.trim() ||
      typeof asset.download_url === "string" && asset.download_url.trim()
    ));
  }

  function getResultText(job) {
    if (!job || typeof job !== "object") return "";
    const candidates = [job.result_text, job.output_text, job.content, job.text, job.result && job.result.text, job.result && job.result.content];
    return candidates.find((value) => typeof value === "string" && value.trim()) || "";
  }

  function displayResultAssets(modal, assets) {
    const output = modal && modal.querySelector(".oai-output");
    if (!output) return;
    output.replaceChildren();
    const grid = node("div", { className: "oai-output-grid" });
    assets.forEach((asset, index) => {
      const url = asset.display_url || asset.download_url;
      const wrap = node("div", { className: "oai-image-wrap" }, [
        node("span", { className: "oai-image-placeholder", text: "正在加载图片…" }),
        node("img", { src: url, alt: `官方图片 ${index + 1}`, loading: "lazy" })
      ]);
      const image = wrap.querySelector("img");
      const placeholder = wrap.querySelector(".oai-image-placeholder");
      image.addEventListener("load", () => { placeholder.hidden = true; });
      image.addEventListener("error", () => {
        wrap.classList.add("is-error");
        placeholder.hidden = false;
        placeholder.textContent = "图片加载失败，请尝试保存到本地";
      });
      const save = node("button", { text: "保存到本地" });
      save.addEventListener("click", async () => {
        save.disabled = true;
        const bridge = api();
        const result = bridge && typeof bridge.saveAsset === "function"
          ? await bridge.saveAsset(url, `漫剧虾-官方图片-${index + 1}.png`)
          : { ok: false, message: "当前客户端不支持本地保存" };
        save.disabled = false;
        setStatus(modal, result && result.ok ? "图片已保存到本地。" : result && result.message || "图片保存失败。", result && result.ok ? "ok" : "error");
      });
      const card = node("div", { className: "oai-output-card" }, [
        wrap,
        node("a", { href: url, target: "_blank", rel: "noreferrer", text: "打开图片" }),
        save
      ]);
      grid.append(card);
    });
    output.append(grid);
    output.style.display = "block";
  }

  function displayResultText(modal, value) {
    const output = modal && modal.querySelector(".oai-output");
    if (!output) return;
    output.replaceChildren(node("div", { className: "oai-text-output", text: value }));
    output.style.display = "block";
  }

  function finishImageTask(result) {
    if (!imageResolver) return;
    const resolve = imageResolver;
    imageResolver = null;
    resolve(result);
    closeModal(false);
  }

  function displayCatalog(modal, result) {
    const meta = modal.querySelector(".oai-meta");
    const submit = modal.querySelector(".oai-submit");
    const item = catalogItems(result).find((entry) => entry.task_type === currentTaskType);
    if (!result || !result.ok || !item) {
      if (meta) meta.replaceChildren();
      if (submit) submit.disabled = true;
      setStatus(modal, result && result.message || `官方${currentTaskKind === "text" ? "语言" : "图片"}算力暂未开放`, result && result.code === "official_not_configured" ? "" : "error");
      return false;
    }
    if (meta) {
      meta.replaceChildren(
        node("div", {}, [node("small", { text: "官方任务" }), node("b", { text: currentTaskKind === "text" ? "语言处理" : "图片生成" })]),
        node("div", {}, [node("small", { text: "可用状态" }), node("b", { text: "已开放" })])
      );
    }
    if (submit) submit.disabled = false;
    setStatus(modal, `官方${currentTaskKind === "text" ? "语言" : "图片"}算力已就绪，积分和模型由服务端处理。`, "ok");
    return true;
  }

  async function loadCatalog(modal) {
    setStatus(modal, "正在读取官方图片算力状态…");
    const remote = api();
    if (!remote || typeof remote.catalog !== "function") {
      displayCatalog(modal, { ok: false, message: "当前客户端暂不支持官方图片算力" });
      return false;
    }
    try {
      return displayCatalog(modal, await remote.catalog());
    } catch (_) {
      displayCatalog(modal, { ok: false, message: "官方图片算力状态暂不可用，请稍后重试" });
      return false;
    }
  }

  async function pollJob(modal) {
    if (!currentJobId || !api() || typeof api().getJob !== "function") return;
    try {
      const result = await api().getJob(currentJobId);
      if (!result || result.ok === false) {
        const message = result && result.message || "图片任务状态查询失败，请稍后重试";
        setStatus(modal, message, "error");
        if (imageResolver) finishImageTask({ ok: false, code: result && result.code || "official_request_failed", message });
        return;
      }
      const job = result.job || result.data || result;
      const state = String(job.status || job.state || "").toLowerCase();
      const success = ["completed", "complete", "succeeded", "success"].includes(state);
      const failed = ["failed", "error", "cancelled", "canceled"].includes(state);
      if (success) {
        if (currentTaskKind === "text") {
          const outputText = getResultText(job);
          if (outputText) displayResultText(modal, outputText);
          if (imageResolver) finishImageTask(outputText ? { ok: true, text: outputText, job } : { ok: false, code: "script_generation_failed", message: "官方语言任务完成但没有返回正文" });
          setStatus(modal, outputText ? "官方语言任务完成。" : "官方语言任务失败：没有返回正文。", outputText ? "ok" : "error");
          return;
        }
        const assets = getResultAssets(job);
        if (assets.length) displayResultAssets(modal, assets);
        if (imageResolver) {
          finishImageTask(assets.length ? { ok: true, result_assets: assets, job } : { ok: false, code: "image_generation_failed", message: "图片生成完成但没有返回图片" });
        }
        setStatus(modal, assets.length ? "图片生成完成。" : "图片生成失败：没有返回图片。", assets.length ? "ok" : "error");
        return;
      }
      if (failed) {
        const message = "图片生成失败，积分将自动退回";
        setStatus(modal, message, "error");
        if (imageResolver) finishImageTask({ ok: false, code: "image_generation_failed", message });
        return;
      }
      setStatus(modal, `${currentTaskKind === "text" ? "语言" : "图片"}任务状态：${job.status || job.state || "处理中"}`);
      const httpStatus = Number(result.http_status || job.http_status || 0);
      const pollable = httpStatus === 202 || state === "running";
      if (pollable) pollTimer = setTimeout(() => pollJob(modal), 2500);
    } catch (_) {
      const message = "图片任务状态暂时无法获取，请稍后重试";
      setStatus(modal, message, "error");
      if (imageResolver) finishImageTask({ ok: false, code: "official_request_failed", message });
    }
  }

  async function submit(modal) {
    const text = modal.querySelector(".oai-text").value;
    if (!text.trim()) {
      setStatus(modal, "请先确认图片提示词。", "error");
      return;
    }
    const remote = api();
    if (!remote || typeof remote.createJob !== "function") {
      setStatus(modal, "当前客户端暂不支持官方图片算力。", "error");
      return;
    }
    currentIdempotencyKey = currentIdempotencyKey || createIdempotencyKey();
    modal.querySelector(".oai-submit").disabled = true;
      setStatus(modal, `正在提交${currentTaskKind === "text" ? "语言" : "图片"}任务…`);
    try {
      const result = await remote.createJob(text, currentIdempotencyKey, currentTaskType);
      if (!result || result.ok === false) {
        setStatus(modal, result && result.message || "图片任务提交失败，请稍后重试。", "error");
        modal.querySelector(".oai-submit").disabled = false;
        return;
      }
      const job = result.job || result.data || result;
      currentJobId = String(job.id || result.id || "");
      if (!currentJobId) {
        setStatus(modal, "任务已提交，但服务端未返回任务编号。", "error");
        modal.querySelector(".oai-submit").disabled = false;
        return;
      }
      setStatus(modal, `${currentTaskKind === "text" ? "语言" : "图片"}任务已提交，正在等待结果…`, "ok");
      stopPolling();
      const state = String(job.status || job.state || "").toLowerCase();
      const httpStatus = Number(result.http_status || 0);
      if (httpStatus === 202 || state === "running") pollJob(modal);
      else if (["succeeded", "success", "completed", "complete", "failed", "error", "cancelled", "canceled"].includes(state)) pollJob(modal);
    } catch (_) {
      setStatus(modal, "图片任务提交失败，请稍后重试。", "error");
      modal.querySelector(".oai-submit").disabled = false;
    }
  }

  function openPanel({ prompt = "", imageOnly = false, taskType = OFFICIAL_IMAGE_TASK_TYPE } = {}) {
    closeModal();
    addStyle();
    currentJobId = "";
    currentIdempotencyKey = "";
    currentTaskType = taskType;
    currentTaskKind = imageOnly ? "image" : "text";
    const taskLabel = imageOnly ? "图片" : "语言";
    const modal = node("div", { id: MODAL_ID }, [
      node("section", { className: "oai-dialog", role: "dialog", "aria-modal": "true", "aria-label": "官方图片算力" }, [
        node("header", { className: "oai-head" }, [node("strong", { text: imageOnly ? "确认图片提示词" : "官方图片算力" }), node("button", { className: "oai-close", text: "×", title: "关闭", onclick: closeModal })]),
        node("div", { className: "oai-body" }, [
          node("p", { className: "oai-copy", text: imageOnly ? "请确认或修改下面的图片提示词。点击提交后会消耗官方积分，网络异常不会自动切换到本地配置。" : "请确认本次剧本素材。官方语言算力只处理这段用户输入，模型、积分和可用状态以服务端为准。" }),
          node("div", { className: "oai-meta" }),
          node("textarea", { className: "oai-text", placeholder: imageOnly ? "请输入图片提示词…" : "请输入剧本或章节内容…", "aria-label": `${taskLabel}任务内容` }),
          node("div", { className: "oai-output" }),
          node("div", { className: "oai-status", text: "正在读取官方图片算力状态…" }),
          node("div", { className: "oai-actions" }, [
            node("button", { text: "重新读取", onclick: () => loadCatalog(modal) }),
            node("button", { className: "primary oai-submit", text: `提交${taskLabel}任务`, disabled: true, onclick: () => submit(modal) })
          ]),
          node("div", { className: "oai-note", text: "一次点击只创建一个任务标识；重试会复用本次标识，避免重复扣费。" })
        ])
      ])
    ]);
    modal.querySelector(".oai-text").value = prompt;
    modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
    document.body.append(modal);
    loadCatalog(modal);
    return modal;
  }

  function openImagePanel(prompt) {
    return new Promise((resolve) => {
      imageResolver = resolve;
      openPanel({ prompt, imageOnly: true });
    });
  }

  function setSourceStatus(text, error = false) {
    const bar = document.getElementById(SOURCE_ID);
    const status = bar && bar.querySelector(".source-status");
    if (!status) return;
    status.textContent = text || "";
    status.className = `source-status${error ? " error" : ""}`;
  }

  async function setSourceMode(mode, type = "image") {
    if (mode === "official") {
      setSourceStatus("正在检查官方图片算力…");
      const remote = api();
      const result = remote && typeof remote.catalog === "function" ? await remote.catalog() : { ok: false, message: "当前客户端暂不支持官方图片算力" };
      if (!result || !result.ok || result.available !== true) {
        sourceModes[type] = "local";
        if (type === "image") sourceMode = "local";
        updateSourceControl();
        setSourceStatus(result && result.message || "官方图片算力暂未开放", true);
        return;
      }
      sourceModes[type] = "official";
      if (type === "image") sourceMode = "official";
      updateSourceControl();
      setSourceStatus("已启用官方图片算力");
      return;
    }
    sourceModes[type] = "local";
    if (type === "image") sourceMode = "local";
    updateSourceControl();
    setSourceStatus("本地配置模式");
  }

  function updateSourceControl() {
    const bar = document.getElementById(SOURCE_ID);
    if (!bar) return;
    bar.querySelectorAll("button[data-source]").forEach((button) => button.classList.toggle("active", button.dataset.source === sourceModes.image));
  }

  function ensureSourceControl() {
    const candidates = Array.from(document.querySelectorAll(".el-select, .wlc-field select"));
    candidates.forEach((control) => {
      const scope = control.closest(".el-form-item, .wlc-field, .setting-row") || control.parentElement;
      if (!scope || scope.querySelector(".oai-inline-source")) return;
      const label = String(scope.textContent || "");
      if (!/(模型|配置|LLM|图片|视频|语音)/i.test(label)) return;
      const type = /图片|image/i.test(label) ? "image" : /语言|大模型|LLM|文本/i.test(label) ? "llm" : /视频|video/i.test(label) ? "video" : /语音|audio|voice/i.test(label) ? "audio" : "";
      if (!type) return;
      const wrap = document.createElement("div");
      wrap.className = "oai-inline-source";
      wrap.dataset.configType = type;
      const local = document.createElement("button");
      local.type = "button";
      local.dataset.source = "local";
      local.textContent = "自配算力";
      local.title = "使用本机保存的模型配置";
      local.addEventListener("click", () => { sourceModes[type] = "local"; if (type === "image") sourceMode = "local"; updateInlineSourceControls(); });
      const official = document.createElement("button");
      official.type = "button";
      official.dataset.source = "official";
      official.textContent = "官方算力";
      official.title = "使用服务端官方算力，按服务端规则消耗积分";
      official.addEventListener("click", () => enableOfficialForControl(scope, type));
      const note = document.createElement("small");
      note.textContent = type === "video" || type === "audio" ? "暂未开放" : "来源";
      if (type === "video" || type === "audio") official.disabled = true;
      wrap.append(local, official, note);
      scope.appendChild(wrap);
    });
    updateInlineSourceControls();
  }

  function updateInlineSourceControls() {
    document.querySelectorAll(".oai-inline-source").forEach((wrap) => {
      const type = wrap.dataset.configType || "image";
      const activeMode = sourceModes[type] || "local";
      wrap.querySelectorAll("button[data-source]").forEach((button) => button.classList.toggle("active", button.dataset.source === activeMode));
    });
  }

  async function enableOfficialForControl(scope, type) {
    if (type !== "image" && type !== "llm") {
      setSourceStatus("该类型官方算力暂未开放，请使用自配算力。", true);
      return;
    }
    setSourceStatus("正在检查官方算力…");
    try {
      const result = await (api() && api().catalog ? api().catalog() : Promise.resolve({ ok: false, message: "官方算力暂不可用" }));
      const items = catalogItems(result);
      const available = items.some((item) => type === "image" ? /image|picture|photo/i.test(item.task_type) : !/image|picture|photo/i.test(item.task_type));
      if (!available) {
        setSourceStatus("该类型官方算力暂未开放，请使用自配算力。", true);
        return;
      }
      sourceModes[type] = "official";
      if (type === "image") sourceMode = "official";
      updateSourceControl();
      updateInlineSourceControls();
      const trigger = scope.querySelector(".el-select, select");
      if (trigger && trigger.classList.contains("el-select")) {
        trigger.click();
        setTimeout(() => {
          const option = Array.from(document.querySelectorAll(".el-select-dropdown__item"))
            .find((item) => /官方.*算力/.test(item.textContent || ""));
          if (option) option.click();
        }, 80);
      }
      setSourceStatus("已选择官方算力；提交前会再次读取服务端目录。", false);
    } catch (_) {
      setSourceStatus("官方算力状态暂不可用，请使用自配算力。", true);
    }
  }

  // The settings page uses this public action as the single entry point for
  // the image tab. It keeps source selection in this module so local image
  // requests can never accidentally receive the official mode's state.
  window.manjuxiaSetOfficialImageMode = () => setSourceMode("official");
  window.manjuxiaOpenOfficialImagePanel = () => openPanel();

  function requestPath(input) {
    try {
      const value = typeof input === "string" ? input : input && input.url;
      return new URL(value, location.href).pathname + (new URL(value, location.href).search || "");
    } catch (_) {
      return String(input || "");
    }
  }

  function isOfficialImageConfig(value) {
    return String(value || "") === OFFICIAL_IMAGE_CONFIG_ID;
  }

  function isOfficialConfig(value) {
    const id = String(value || "");
    return id === OFFICIAL_IMAGE_CONFIG_ID || id.startsWith(OFFICIAL_TEXT_CONFIG_PREFIX);
  }

  function requestUsesOfficialImageConfig(init) {
    if (!init || init.body == null) return false;
    try {
      const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      return isOfficialImageConfig(body && body.config_id);
    } catch (_) {
      return false;
    }
  }

  function requestOfficialConfigId(init) {
    if (!init || init.body == null) return "";
    try {
      const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      const id = body && (body.config_id || body.llm_config_id);
      return isOfficialConfig(id) ? String(id) : "";
    } catch (_) {
      return "";
    }
  }

  function catalogItems(result) {
    if (!result || result.ok !== true || !Array.isArray(result.items)) return [];
    return result.items.filter((item) => item && item.enabled === true && item.available === true && typeof item.task_type === "string");
  }

  function optionForCatalogItem(item) {
    const taskType = String(item.task_type || "").trim();
    if (!taskType) return null;
    const isImage = taskType === OFFICIAL_IMAGE_TASK_TYPE || /image|picture|photo/i.test(taskType);
    const id = isImage && taskType === OFFICIAL_IMAGE_TASK_TYPE ? OFFICIAL_IMAGE_CONFIG_ID : `${OFFICIAL_TEXT_CONFIG_PREFIX}${taskType}`;
    officialTaskTypes.set(id, taskType);
    return {
      id,
      name: isImage && taskType === OFFICIAL_IMAGE_TASK_TYPE ? OFFICIAL_IMAGE_LABEL : (isImage ? "官方图片算力（积分）" : "官方语言算力（积分）"),
      config_type: isImage ? "image" : "llm",
      official_ai: true,
      task_type: taskType
    };
  }

  async function addOfficialOptions(response, configType) {
    try {
      const remote = api();
      if (!remote || typeof remote.catalog !== "function") return response;
      const catalog = await remote.catalog();
      const options = catalogItems(catalog).map(optionForCatalogItem).filter((item) => item && item.config_type === configType);
      if (!options.length) return response;
      const payload = await response.clone().json();
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload && payload.data)
          ? payload.data
          : Array.isArray(payload && payload.items)
            ? payload.items
            : null;
      if (!list) return response;
      options.forEach((option) => {
        if (!list.some((item) => item && item.id === option.id)) list.push(option);
      });
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(JSON.stringify(payload), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (_) {
      return response;
    }
  }

  async function fetchConfirmedPrompt(elementId) {
    const response = await previousFetch(`/api/extraction/element/${elementId}/full-prompt`, { method: "GET" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.prompt) throw new Error(data.message || "无法读取图片提示词");
    return String(data.prompt);
  }

  function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  }

  async function fetchChapterForOfficialScript(novelId, chapterId) {
    const response = await previousFetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`, { method: "GET" });
    const chapters = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(chapters)) throw new Error("无法读取章节内容");
    const chapter = chapters.find((item) => String(item && item.id) === String(chapterId));
    if (!chapter || !String(chapter.content || "").trim()) throw new Error("章节没有可转换的正文");
    return chapter;
  }

  function openTextPanel(prompt, taskType) {
    return new Promise((resolve) => {
      imageResolver = resolve;
      openPanel({ prompt, imageOnly: false, taskType });
    });
  }

  async function interceptOfficialScriptRequest(init) {
    let body;
    try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body || {}; } catch (_) { return jsonResponse({ success: false, message: "官方语言任务参数无效" }, 400); }
    const configId = String(body.llm_config_id || "");
    const taskType = officialTaskTypes.get(configId);
    if (!taskType) return jsonResponse({ success: false, message: "官方语言任务未在服务端目录开放" }, 409);
    if (body.chapter_id == null || body.novel_id == null) {
      return jsonResponse({ success: false, message: "官方语言算力请逐章转换" }, 409);
    }
    try {
      const chapter = await fetchChapterForOfficialScript(body.novel_id, body.chapter_id);
      const result = await openTextPanel(`章节标题：${chapter.title || "未命名章节"}\n\n${chapter.content}`, taskType);
      if (!result || !result.ok) return jsonResponse({ success: false, message: result && result.message || "已取消剧本转换" }, 499);
      const saved = await previousFetch("/api/scripts/official-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_id: body.novel_id,
          chapter_id: body.chapter_id,
          template_id: body.template_id,
          content: result.text
        })
      });
      return saved;
    } catch (error) {
      return jsonResponse({ success: false, message: error && error.message || "官方剧本转换失败" }, 502);
    }
  }

  async function interceptImageRequest(input, init, elementId) {
    try {
      const prompt = await fetchConfirmedPrompt(elementId);
      const result = await openImagePanel(prompt);
      if (!result.ok) return jsonResponse({ success: false, message: result.message || "已取消图片生成" }, 499);
      const first = result.result_assets && result.result_assets[0];
      return jsonResponse({ success: true, message: "图片生成成功", status: "success", image_url: first && (first.display_url || first.download_url), result_assets: result.result_assets });
    } catch (error) {
      return jsonResponse({ success: false, message: error && error.message || "图片生成失败" }, 502);
    }
  }

  function installImageFetchInterceptor() {
    if (window.__manjuxiaOfficialImageFetchInstalled) return;
    previousFetch = window.fetch.bind(window);
    window.__manjuxiaOfficialImageFetchInstalled = true;
    window.fetch = async function officialImageFetch(input, init = {}) {
      const path = requestPath(input);
      const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
      if (method === "GET" && /^\/api\/llm-configs\/?(?:\?|$)/.test(path) && /(?:^|[?&])config_type=(image|llm)(?:&|$)/.test(path)) {
        const typeMatch = path.match(/(?:^|[?&])config_type=(image|llm)(?:&|$)/);
        return addOfficialOptions(await previousFetch(input, init), typeMatch && typeMatch[1]);
      }
      const officialId = requestOfficialConfigId(init);
      if (method === "POST" && officialId && officialId.startsWith(OFFICIAL_TEXT_CONFIG_PREFIX) && /^\/api\/scripts\/convert-single$/.test(path)) {
        return interceptOfficialScriptRequest(init);
      }
      if (method === "POST" && officialId && officialId.startsWith(OFFICIAL_TEXT_CONFIG_PREFIX) && /^\/api\/scripts\/convert$/.test(path)) {
        return jsonResponse({ success: false, message: "官方语言算力暂支持逐章转换，请先选择单个章节" }, 409);
      }
      if (method === "POST" && (requestUsesOfficialImageConfig(init) || sourceModes.image === "official")) {
        const single = path.match(/^\/api\/extraction\/element\/(\d+)\/generate-image(?:-async)?$/);
        if (single) return interceptImageRequest(input, init, single[1]);
        if (
          /\/api\/extraction\/variant\/\d+\/generate-image$/.test(path) ||
          /\/api\/extraction\/novel\/\d+\/batch-generate-images/.test(path) ||
          /\/api\/extraction\/element\/\d+\/(?:generate-grid-image|panorama\/generate)$/.test(path)
        ) {
          return jsonResponse({ success: false, message: "官方模式当前仅支持逐个确认的本体图片生成，请切换本地配置使用马甲、宫格、全景或批量功能" }, 409);
        }
      }
      return previousFetch(input, init);
    };
  }

  window.manjuxiaOpenOfficialAi = openPanel;
  window.manjuxiaOfficialImageConfigId = OFFICIAL_IMAGE_CONFIG_ID;
  installImageFetchInterceptor();
  const observer = new MutationObserver(() => { ensureSourceControl(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", () => setTimeout(() => { ensureSourceControl(); }, 300));
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && document.getElementById(MODAL_ID)) closeModal(); });
  window.addEventListener("DOMContentLoaded", () => setTimeout(() => { ensureSourceControl(); }, 900));
  setInterval(() => { ensureSourceControl(); }, 1500);
})();
