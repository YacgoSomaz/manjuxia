(function () {
  const STYLE_ID = "wanshan-extraction-batch-style";
  const BUTTON_ID = "wanshan-extraction-batch-button";
  const MODAL_ID = "wanshan-extraction-batch-modal";

  let novels = [];
  let elements = [];
  let imageConfigs = [];
  let llmConfigs = [];
  let gridTemplates = [];
  let selectedIds = new Set();
  let activeJob = null;
  let pollTimer = null;
  let busy = false;
  let message = "";
  let state = {
    novelId: "",
    action: "panorama",
    elementType: "scene",
    imageConfigId: "",
    llmConfigId: "",
    templateId: "",
    onlyMissing: true,
  };

  function isExtractionPage() {
    const text = `${window.location.href || ""} ${window.location.hash || ""} ${document.title || ""}`;
    return /extraction|信息提取/.test(text);
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
      headers: { "Content-Type": "application/json", ...((options && options.headers) || {}) },
      ...(options || {}),
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
    if (!res.ok) {
      const detail = body && (body.detail || body.message) ? (body.detail || body.message) : text || `HTTP ${res.status}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return body;
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value == null ? "" : String(value);
      else if (key === "html") node.innerHTML = value == null ? "" : String(value);
      else if (key === "checked") node.checked = !!value;
      else if (key === "value") node.value = value == null ? "" : String(value);
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value !== false && value != null) node.setAttribute(key, value === true ? "" : String(value));
    });
    (Array.isArray(children) ? children : [children]).filter(Boolean).forEach((child) => {
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .web-float{position:fixed;right:22px;bottom:74px;z-index:99990;border:1px solid rgba(34,211,238,.45);background:linear-gradient(135deg,#1d9bf0,#18b7a7);color:#fff;border-radius:8px;padding:10px 14px;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.35);font-weight:650}
      .web-float:hover{filter:brightness(1.08)}
      .web-mask{position:fixed;inset:0;z-index:99999;background:rgba(2,8,24,.72);display:flex;align-items:center;justify-content:center;padding:22px}
      .web-dialog{width:min(1160px,96vw);max-height:92vh;overflow:hidden;background:#111a32;border:1px solid rgba(100,181,246,.28);border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.45);color:#e8f7ff;display:flex;flex-direction:column}
      .web-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(100,181,246,.18)}
      .web-head h3{margin:0;font-size:17px}
      .web-close,.web-btn{border:1px solid rgba(100,181,246,.38);background:rgba(100,181,246,.14);color:#e8f7ff;border-radius:6px;padding:7px 11px;cursor:pointer;font-size:13px}
      .web-close:hover,.web-btn:hover{background:rgba(100,181,246,.25)}
      .web-btn.primary{background:#409eff;border-color:#409eff;color:#fff}
      .web-btn.success{background:#13b7a8;border-color:#13b7a8;color:#fff}
      .web-btn.danger{background:#c45656;border-color:#c45656;color:#fff}
      .web-btn:disabled{opacity:.55;cursor:not-allowed}
      .web-body{display:grid;grid-template-columns:330px 1fr;gap:16px;padding:16px;overflow:auto}
      .web-panel{border:1px solid rgba(100,181,246,.18);border-radius:8px;background:rgba(255,255,255,.025);padding:12px}
      .web-row{display:grid;gap:6px;margin-bottom:10px}
      .web-row label{font-size:12px;color:rgba(220,240,255,.66)}
      .web-row select,.web-row input{border:1px solid rgba(100,181,246,.24);border-radius:6px;background:#0b1328;color:#e8f7ff;padding:8px 10px;outline:none;width:100%;box-sizing:border-box}
      .web-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .web-seg button.active{background:#409eff;border-color:#409eff}
      .web-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#dff5ff;margin:8px 0}
      .web-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}
      .web-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;max-height:58vh;overflow:auto}
      .web-card{border:1px solid rgba(100,181,246,.18);border-radius:8px;background:rgba(255,255,255,.035);padding:9px;cursor:pointer;min-height:74px}
      .web-card.active{border-color:#22d3ee;background:rgba(34,211,238,.13)}
      .web-card.disabled{opacity:.48}
      .web-card-title{font-weight:650;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .web-card-meta{font-size:12px;color:rgba(220,240,255,.62);line-height:1.5}
      .web-msg{margin-top:10px;color:#ffdba8;font-size:13px;white-space:pre-wrap}
      .web-progress{display:grid;gap:6px;margin-top:12px;border-top:1px solid rgba(100,181,246,.14);padding-top:12px}
      .web-bar{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
      .web-bar span{display:block;height:100%;background:#22d3ee;width:0}
      .web-empty{padding:28px 10px;text-align:center;color:rgba(220,240,255,.58)}
      @media(max-width:860px){.web-body{grid-template-columns:1fr}.web-list{max-height:34vh}}
    `;
    document.head.appendChild(style);
  }

  function optionList(items, labelFn) {
    return items.map((item) => el("option", { value: item.id, text: labelFn(item) }));
  }

  function actionableElements() {
    return elements.filter((item) => {
      if (state.action === "panorama") {
        if (item.element_type !== "scene") return false;
        return !state.onlyMissing || !item.panorama_url;
      }
      if (item.element_type !== state.elementType) return false;
      const hasSource = !!(item.finished_image || item.image_url);
      return hasSource && (!state.onlyMissing || !item.grid_image);
    });
  }

  function setMessage(text) {
    message = text || "";
    renderModal();
  }

  function defaultSelect() {
    const ids = actionableElements().map((item) => Number(item.id));
    selectedIds = new Set(ids);
  }

  async function loadInitial() {
    busy = true;
    renderModal();
    try {
      const [novelRes, imageRes, llmRes, templateRes] = await Promise.all([
        api("/api/novels/"),
        api("/api/llm-configs/?config_type=image"),
        api("/api/llm-configs/?config_type=llm"),
        api("/api/templates/?category=grid_image"),
      ]);
      novels = Array.isArray(novelRes) ? novelRes : [];
      imageConfigs = Array.isArray(imageRes) ? imageRes : [];
      llmConfigs = Array.isArray(llmRes) ? llmRes : [];
      gridTemplates = Array.isArray(templateRes) ? templateRes : [];
      state.novelId = state.novelId || (novels[0] && novels[0].id) || "";
      state.imageConfigId = state.imageConfigId || (imageConfigs[0] && imageConfigs[0].id) || "";
      state.llmConfigId = state.llmConfigId || (llmConfigs[0] && llmConfigs[0].id) || "";
      state.templateId = state.templateId || (gridTemplates[0] && gridTemplates[0].id) || "";
      await loadElements(false);
      if (state.novelId) await loadActiveJob(false);
      message = "";
    } catch (err) {
      message = `加载失败：${err.message || err}`;
    } finally {
      busy = false;
      renderModal();
    }
  }

  async function loadElements(shouldRender) {
    if (!state.novelId) {
      elements = [];
      selectedIds = new Set();
      if (shouldRender) renderModal();
      return;
    }
    const type = state.action === "panorama" ? "scene" : state.elementType;
    const res = await api(`/api/extraction/novel/${state.novelId}?element_type=${encodeURIComponent(type)}`);
    elements = Array.isArray(res) ? res : [];
    defaultSelect();
    if (shouldRender) renderModal();
  }

  async function loadActiveJob(shouldRender) {
    if (!state.novelId) return;
    try {
      const res = await api(`/api/extraction/batch/active?novel_id=${state.novelId}`);
      activeJob = res && res.job ? res.job : activeJob;
      setupPolling();
    } catch (_) {}
    if (shouldRender) renderModal();
  }

  function setupPolling() {
    if (pollTimer) clearInterval(pollTimer);
    if (!activeJob || !["running", "stopping"].includes(activeJob.status)) return;
    pollTimer = setInterval(async () => {
      try {
        const res = await api(`/api/extraction/batch/${activeJob.job_id}`);
        activeJob = res.job;
        if (!["running", "stopping"].includes(activeJob.status)) {
          clearInterval(pollTimer);
          pollTimer = null;
          await loadElements(false);
        }
        renderModal();
      } catch (err) {
        message = `查询进度失败：${err.message || err}`;
        renderModal();
      }
    }, 2500);
  }

  async function startBatch() {
    const ids = [...selectedIds].map(Number).filter(Boolean);
    if (!state.novelId) return setMessage("请先选择小说");
    if (!state.imageConfigId) return setMessage("请先选择图片模型配置");
    if (!ids.length) return setMessage("没有选中的可执行卡片");
    if (state.action === "grid" && (!state.templateId || !state.llmConfigId)) {
      return setMessage("批量宫格需要选择宫格模板和视觉大语言模型");
    }
    busy = true;
    renderModal();
    try {
      const res = await api("/api/extraction/batch/start", {
        method: "POST",
        body: JSON.stringify({
          novel_id: Number(state.novelId),
          action: state.action,
          element_type: state.action === "panorama" ? "scene" : state.elementType,
          element_ids: ids,
          config_id: Number(state.imageConfigId),
          template_id: state.action === "grid" ? Number(state.templateId) : null,
          llm_config_id: state.action === "grid" ? Number(state.llmConfigId) : null,
        }),
      });
      activeJob = res.job;
      message = "批量任务已启动";
      setupPolling();
    } catch (err) {
      message = `启动失败：${err.message || err}`;
    } finally {
      busy = false;
      renderModal();
    }
  }

  async function stopBatch() {
    if (!activeJob || !activeJob.job_id) return;
    busy = true;
    renderModal();
    try {
      const res = await api(`/api/extraction/batch/${activeJob.job_id}/stop`, { method: "POST" });
      activeJob = res.job;
      message = "已请求停止，当前正在执行的卡片会自然收尾";
      setupPolling();
    } catch (err) {
      message = `停止失败：${err.message || err}`;
    } finally {
      busy = false;
      renderModal();
    }
  }

  function progressBlock() {
    if (!activeJob) return null;
    const total = activeJob.total || 0;
    const done = (activeJob.success || 0) + (activeJob.failed || 0);
    const percent = total ? Math.round((done / total) * 100) : 0;
    return el("div", { class: "web-progress" }, [
      el("div", { text: `任务状态：${activeJob.status} · ${done}/${total} · 成功 ${activeJob.success || 0} · 失败 ${activeJob.failed || 0}` }),
      activeJob.current_name ? el("div", { text: `当前：${activeJob.current_name}` }) : null,
      el("div", { class: "web-bar" }, el("span", { style: `width:${percent}%` })),
      ...(activeJob.failures || []).slice(-3).map((item) => el("div", { class: "web-msg", text: item })),
    ]);
  }

  function cardFor(item) {
    const enabled = actionableElements().some((x) => Number(x.id) === Number(item.id));
    const checked = selectedIds.has(Number(item.id));
    const meta = item.element_type === "scene"
      ? `全景 ${item.panorama_url ? "已有" : "未生成"} · 宫格 ${item.grid_image ? "已有" : "未生成"}`
      : `源图 ${item.finished_image || item.image_url ? "已有" : "缺少"} · 宫格 ${item.grid_image ? "已有" : "未生成"}`;
    return el("div", {
      class: `web-card ${checked ? "active" : ""} ${enabled ? "" : "disabled"}`,
      onclick: () => {
        if (!enabled || busy) return;
        const id = Number(item.id);
        if (selectedIds.has(id)) selectedIds.delete(id);
        else selectedIds.add(id);
        renderModal();
      },
    }, [
      el("div", { class: "web-card-title", text: `${checked ? "✓ " : ""}${item.name || `元素 ${item.id}`}` }),
      el("div", { class: "web-card-meta", text: meta }),
    ]);
  }

  function renderModal() {
    const old = document.getElementById(MODAL_ID);
    if (!old) return;
    old.innerHTML = "";
    const available = actionableElements();
    const isRunning = activeJob && ["running", "stopping"].includes(activeJob.status);
    const dialog = el("div", { class: "web-dialog" }, [
      el("div", { class: "web-head" }, [
        el("h3", { text: "批量生图" }),
        el("button", { class: "web-close", onclick: closeModal, text: "关闭" }),
      ]),
      el("div", { class: "web-body" }, [
        el("div", { class: "web-panel" }, [
          el("div", { class: "web-row" }, [
            el("label", { text: "小说" }),
            el("select", { value: state.novelId, onchange: async (ev) => {
              state.novelId = ev.target.value;
              activeJob = null;
              await loadElements(true);
              await loadActiveJob(true);
            } }, optionList(novels, (item) => item.name || `小说 ${item.id}`)),
          ]),
          el("div", { class: "web-row" }, [
            el("label", { text: "任务类型" }),
            el("div", { class: "web-seg" }, [
              el("button", { class: `web-btn ${state.action === "panorama" ? "active" : ""}`, onclick: async () => {
                state.action = "panorama";
                state.elementType = "scene";
                await loadElements(true);
              }, text: "批量全景+9视图" }),
              el("button", { class: `web-btn ${state.action === "grid" ? "active" : ""}`, onclick: async () => {
                state.action = "grid";
                await loadElements(true);
              }, text: "批量宫格图" }),
            ]),
          ]),
          state.action === "grid" ? el("div", { class: "web-row" }, [
            el("label", { text: "卡片类型" }),
            el("select", { value: state.elementType, onchange: async (ev) => {
              state.elementType = ev.target.value;
              await loadElements(true);
            } }, [
              el("option", { value: "scene", text: "场景" }),
              el("option", { value: "prop", text: "道具" }),
            ]),
          ]) : null,
          el("div", { class: "web-row" }, [
            el("label", { text: "图片模型" }),
            el("select", { value: state.imageConfigId, onchange: (ev) => { state.imageConfigId = ev.target.value; } },
              optionList(imageConfigs, (item) => `${item.name || item.model_name} · ${item.model_name || ""}`)),
          ]),
          state.action === "grid" ? el("div", { class: "web-row" }, [
            el("label", { text: "宫格模板" }),
            el("select", { value: state.templateId, onchange: (ev) => { state.templateId = ev.target.value; } },
              optionList(gridTemplates, (item) => item.name || `模板 ${item.id}`)),
          ]) : null,
          state.action === "grid" ? el("div", { class: "web-row" }, [
            el("label", { text: "视觉大语言模型" }),
            el("select", { value: state.llmConfigId, onchange: (ev) => { state.llmConfigId = ev.target.value; } },
              optionList(llmConfigs, (item) => `${item.name || item.model_name} · ${item.model_name || ""}`)),
          ]) : null,
          el("label", { class: "web-check" }, [
            el("input", { type: "checkbox", checked: state.onlyMissing, onchange: async (ev) => {
              state.onlyMissing = ev.target.checked;
              defaultSelect();
              renderModal();
            } }),
            "只处理缺失项",
          ]),
          el("div", { class: "web-toolbar" }, [
            el("button", { class: "web-btn", disabled: busy, onclick: loadInitial, text: busy ? "加载中..." : "刷新" }),
            isRunning
              ? el("button", { class: "web-btn danger", disabled: busy, onclick: stopBatch, text: "停止后续" })
              : el("button", { class: "web-btn success", disabled: busy || !available.length, onclick: startBatch, text: `开始执行 ${selectedIds.size}` }),
          ]),
          progressBlock(),
          message ? el("div", { class: "web-msg", text: message }) : null,
        ]),
        el("div", { class: "web-panel" }, [
          el("div", { class: "web-toolbar" }, [
            el("div", { text: `可执行 ${available.length} / 当前 ${elements.length} · 已选 ${selectedIds.size}` }),
            el("div", {}, [
              el("button", { class: "web-btn", onclick: () => { defaultSelect(); renderModal(); }, text: "全选可执行" }),
              " ",
              el("button", { class: "web-btn", onclick: () => { selectedIds = new Set(); renderModal(); }, text: "清空" }),
            ]),
          ]),
          elements.length
            ? el("div", { class: "web-list" }, elements.map(cardFor))
            : el("div", { class: "web-empty", text: busy ? "加载中..." : "暂无卡片" }),
        ]),
      ]),
    ]);
    old.appendChild(dialog);
  }

  function openModal() {
    addStyle();
    if (document.getElementById(MODAL_ID)) return;
    const mask = el("div", { id: MODAL_ID, class: "web-mask", onclick: (ev) => {
      if (ev.target && ev.target.id === MODAL_ID) closeModal();
    } });
    document.body.appendChild(mask);
    renderModal();
    loadInitial();
  }

  function closeModal() {
    const old = document.getElementById(MODAL_ID);
    if (old) old.remove();
  }

  function ensureButton() {
    if (!isExtractionPage()) {
      const old = document.getElementById(BUTTON_ID);
      if (old) old.remove();
      return;
    }
    addStyle();
    if (document.getElementById(BUTTON_ID)) return;
    document.body.appendChild(el("button", {
      id: BUTTON_ID,
      class: "web-float",
      onclick: openModal,
      text: "批量生图",
    }));
  }

  setInterval(ensureButton, 1200);
  window.addEventListener("hashchange", ensureButton);
  window.addEventListener("popstate", ensureButton);
  setTimeout(ensureButton, 800);
})();
