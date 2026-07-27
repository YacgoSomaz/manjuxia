(function installWanshanTopviewPanel() {
  const STYLE_ID = "wanshan-topview-style";
  const BUTTON_ID = "wanshan-topview-button";
  const MODAL_ID = "wanshan-topview-modal";
  const state = {
    novels: [],
    storyboards: [],
    imageConfigs: [],
    llmConfigs: [],
    novelId: "",
    storyboardId: "",
    imageConfigId: "",
    llmConfigId: "",
    loading: false,
    message: "",
    error: "",
    result: null,
    backendBase: "",
  };

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{position:fixed;right:24px;bottom:28px;z-index:11000;border:1px solid #4f8cff;border-radius:8px;padding:10px 15px;background:#1769e0;color:#fff;font:600 13px "Microsoft YaHei",sans-serif;box-shadow:0 8px 24px #0b1b4380;cursor:pointer}
      #${BUTTON_ID}:hover{background:#2b7cf2}
      .wst-mask{position:fixed;inset:0;z-index:12000;display:flex;align-items:center;justify-content:center;padding:24px;background:#061027b8}
      .wst-dialog{width:min(980px,96vw);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid #4776c8;border-radius:10px;background:#101b38;color:#eaf3ff;box-shadow:0 24px 70px #00000075;font-family:"Microsoft YaHei",sans-serif}
      .wst-head{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid #2b416d}
      .wst-head h3{margin:0;font-size:18px}
      .wst-close,.wst-btn{border:1px solid #466a9f;border-radius:6px;padding:8px 12px;background:#17284d;color:#eaf3ff;cursor:pointer;font-size:13px}
      .wst-btn:hover,.wst-close:hover{background:#244578}
      .wst-btn.primary{border-color:#2b8dff;background:#2177e8;color:#fff}
      .wst-btn.danger{border-color:#bd5962;background:#6d2937;color:#ffe8e8}
      .wst-btn:disabled{opacity:.55;cursor:not-allowed}
      .wst-body{display:grid;grid-template-columns:330px 1fr;gap:16px;padding:16px;overflow:auto}
      .wst-panel{min-width:0;border:1px solid #2a416d;border-radius:8px;background:#0b1530;padding:12px}
      .wst-panel h4{margin:0 0 12px;font-size:14px;color:#9ed7ff}
      .wst-field{display:flex;flex-direction:column;gap:6px;margin-bottom:11px}
      .wst-field label{font-size:12px;color:#b9c9e2}
      .wst-field select{width:100%;box-sizing:border-box;border:1px solid #41618f;border-radius:6px;background:#09132a;color:#eaf3ff;padding:8px 9px;outline:none}
      .wst-list{display:flex;flex-direction:column;gap:7px;max-height:42vh;overflow:auto}
      .wst-item{border:1px solid #2c4676;border-radius:7px;padding:9px;background:#101f42;cursor:pointer}
      .wst-item.active{border-color:#45b8ff;background:#173b70}
      .wst-item-title{font-size:13px;font-weight:650;line-height:1.45}
      .wst-item-meta{margin-top:4px;color:#a9bddb;font-size:11px}
      .wst-badge{display:inline-block;margin-left:6px;padding:2px 5px;border:1px solid #4fc494;border-radius:10px;color:#8ce4bd;font-size:10px;font-weight:400}
      .wst-help{margin:0 0 12px;color:#b8c9e3;font-size:12px;line-height:1.55}
      .wst-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .wst-status{min-height:22px;margin-top:12px;color:#a9dcff;font-size:12px;white-space:pre-wrap;line-height:1.5}
      .wst-status.error{color:#ffb7bd}
      .wst-result{margin-top:14px;border-top:1px solid #2a416d;padding-top:12px}
      .wst-result img{display:block;width:100%;max-height:46vh;object-fit:contain;border:1px solid #31558c;border-radius:7px;background:#061028}
      .wst-result pre{max-height:180px;overflow:auto;margin:10px 0 0;padding:9px;border-radius:6px;background:#071128;color:#c9ddf6;font:12px/1.55 Consolas,"Microsoft YaHei",sans-serif;white-space:pre-wrap}
      .wst-empty{padding:18px 8px;text-align:center;color:#8094b8;border:1px dashed #34527f;border-radius:6px;font-size:12px}
      @media(max-width:760px){.wst-body{grid-template-columns:1fr}.wst-list{max-height:30vh}}
    `;
    document.head.appendChild(style);
  }

  async function backendBase() {
    try {
      if (window.electronAPI && window.electronAPI.getBackendUrl) {
        return String(await window.electronAPI.getBackendUrl()).replace(/\/$/, "");
      }
      if (window.wanshan && window.wanshan.getBackendUrl) {
        return String(await window.wanshan.getBackendUrl()).replace(/\/$/, "");
      }
    } catch (_) {}
    return "http://127.0.0.1:8000";
  }

  async function api(path, options) {
    const base = await backendBase();
    const init = { ...(options || {}) };
    const headers = new Headers(init.headers || {});
    if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    init.headers = headers;
    const response = await fetch(base + path, init);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!response.ok) {
      const detail = data && (data.detail || data.message) ? (data.detail || data.message) : text || `HTTP ${response.status}`;
      throw new Error(String(detail));
    }
    return data;
  }

  function listOf(value, keys) {
    if (Array.isArray(value)) return value;
    for (const key of keys) if (value && Array.isArray(value[key])) return value[key];
    return [];
  }

  function labelOf(item, fallback) {
    return String(item && (item.name || item.title || item.scene_name || item.model_name || item.id) || fallback || "");
  }

  function imageUrl(value) {
    if (!value) return "";
    const raw = String(value);
    if (/^(data:|https?:\/\/|blob:)/i.test(raw)) return raw;
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return state.backendBase ? `${state.backendBase}${path}` : path;
  }

  function field(label, control) {
    const wrap = document.createElement("div");
    wrap.className = "wst-field";
    const caption = document.createElement("label");
    caption.textContent = label;
    wrap.append(caption, control);
    return wrap;
  }

  function selectControl(items, selected, placeholder, onChange) {
    const select = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder;
    select.appendChild(empty);
    for (const item of items) {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = labelOf(item, `#${item.id}`);
      select.appendChild(option);
    }
    select.value = selected ? String(selected) : "";
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  function button(text, className, onClick) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `wst-btn ${className || ""}`;
    node.textContent = text;
    node.addEventListener("click", onClick);
    return node;
  }

  function currentStoryboard() {
    return state.storyboards.find((item) => String(item.id) === String(state.storyboardId)) || null;
  }

  function renderResult(parent) {
    const item = state.result || currentStoryboard();
    const url = imageUrl(item && (item.fused_url || item.top_view_url || item.topview_image));
    if (!url && !(item && (item.dispatch_text || item.topview_dispatch_text))) return;
    const result = document.createElement("div");
    result.className = "wst-result";
    const title = document.createElement("h4");
    title.textContent = "当前俯视调度结果";
    result.appendChild(title);
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "俯视人物调度图";
      img.onerror = () => { img.replaceWith(document.createTextNode("图片地址无法读取，请检查媒体目录或重新生成。")); };
      result.appendChild(img);
    }
    const dispatch = item && (item.dispatch_text || item.topview_dispatch_text || item.placement_text);
    if (dispatch) {
      const pre = document.createElement("pre");
      pre.textContent = dispatch;
      result.appendChild(pre);
    }
    parent.appendChild(result);
  }

  function renderModal() {
    addStyle();
    let mask = document.getElementById(MODAL_ID);
    if (!mask) {
      mask = document.createElement("div");
      mask.id = MODAL_ID;
      mask.className = "wst-mask";
      mask.addEventListener("click", (event) => { if (event.target === mask) closeModal(); });
      document.body.appendChild(mask);
    }
    const dialog = document.createElement("div");
    dialog.className = "wst-dialog";
    const head = document.createElement("div");
    head.className = "wst-head";
    const heading = document.createElement("h3");
    heading.textContent = "俯视人物调度图";
    head.append(heading, button("关闭", "wst-close", closeModal));
    dialog.appendChild(head);

    const body = document.createElement("div");
    body.className = "wst-body";
    const left = document.createElement("div");
    left.className = "wst-panel";
    const leftTitle = document.createElement("h4");
    leftTitle.textContent = "选择分镜";
    left.appendChild(leftTitle);
    const novelSelect = selectControl(state.novels, state.novelId, "请选择小说", async (value) => {
      state.novelId = value;
      state.storyboardId = "";
      await loadStoryboards();
      renderModal();
    });
    left.appendChild(field("小说", novelSelect));
    const list = document.createElement("div");
    list.className = "wst-list";
    if (!state.novelId) {
      const empty = document.createElement("div");
      empty.className = "wst-empty";
      empty.textContent = "先选择小说";
      list.appendChild(empty);
    } else if (!state.storyboards.length) {
      const empty = document.createElement("div");
      empty.className = "wst-empty";
      empty.textContent = "这本小说还没有分镜";
      list.appendChild(empty);
    } else {
      for (const item of state.storyboards) {
        const row = document.createElement("div");
        row.className = `wst-item${String(item.id) === String(state.storyboardId) ? " active" : ""}`;
        row.addEventListener("click", () => { state.storyboardId = String(item.id); state.result = null; renderModal(); });
        const title = document.createElement("div");
        title.className = "wst-item-title";
        title.textContent = `${item.section_number || ""} · ${item.scene_name || item.description || `分镜 #${item.id}`}`;
        if (item.topview_image) {
          const badge = document.createElement("span");
          badge.className = "wst-badge";
          badge.textContent = "已有调度图";
          title.appendChild(badge);
        }
        const meta = document.createElement("div");
        meta.className = "wst-item-meta";
        meta.textContent = `分镜 ${item.id} · ${Array.isArray(item.characters) ? item.characters.join("、") : "未读取人物"}`;
        row.append(title, meta);
        list.appendChild(row);
      }
    }
    left.appendChild(list);
    body.appendChild(left);

    const right = document.createElement("div");
    right.className = "wst-panel";
    const rightTitle = document.createElement("h4");
    rightTitle.textContent = "配置与生成";
    right.appendChild(rightTitle);
    const help = document.createElement("p");
    help.className = "wst-help";
    help.textContent = "将场景图、人物资产和分镜状态融合为俯视调度图，结果会写回当前分镜，并自动参与后续视频的素材链。";
    right.appendChild(help);
    right.appendChild(field("图片模型", selectControl(state.imageConfigs, state.imageConfigId, "请选择图片模型", (value) => { state.imageConfigId = value; })));
    right.appendChild(field("语言模型（用于状态推演）", selectControl(state.llmConfigs, state.llmConfigId, "请选择语言模型", (value) => { state.llmConfigId = value; })));
    const actions = document.createElement("div");
    actions.className = "wst-actions";
    const generate = button(state.loading ? "正在生成…" : "生成俯视调度图", "primary", generateTopview);
    generate.disabled = state.loading || !state.storyboardId || !state.imageConfigId || !state.llmConfigId;
    actions.appendChild(generate);
    const current = currentStoryboard();
    const remove = button("删除调度图", "danger", removeTopview);
    remove.disabled = state.loading || !current || !current.topview_image;
    actions.appendChild(remove);
    right.appendChild(actions);
    const status = document.createElement("div");
    status.className = `wst-status${state.error ? " error" : ""}`;
    status.textContent = state.error || state.message || "请选择分镜和模型配置";
    right.appendChild(status);
    renderResult(right);
    body.appendChild(right);
    dialog.appendChild(body);
    mask.replaceChildren(dialog);
  }

  async function loadInitialData() {
    state.message = "正在读取小说、分镜和模型配置…";
    try {
      state.backendBase = await backendBase();
      const [novels, images, llms] = await Promise.all([
        api("/api/novels/"),
        api("/api/llm-configs/?config_type=image&local_only=true"),
        api("/api/llm-configs/?config_type=llm&local_only=true"),
      ]);
      state.novels = listOf(novels, ["data", "novels"]);
      state.imageConfigs = listOf(images, ["data", "configs"]);
      state.llmConfigs = listOf(llms, ["data", "configs"]);
      if (!state.novelId && state.novels.length === 1) state.novelId = String(state.novels[0].id);
      if (state.imageConfigs.length === 1) state.imageConfigId = String(state.imageConfigs[0].id);
      if (state.llmConfigs.length === 1) state.llmConfigId = String(state.llmConfigs[0].id);
      await loadStoryboards();
      state.message = "请选择分镜并生成调度图";
    } catch (error) {
      state.error = `读取数据失败：${error.message || error}`;
    }
  }

  async function loadStoryboards() {
    if (!state.novelId) { state.storyboards = []; return; }
    try {
      const data = await api(`/api/storyboards/novel/${encodeURIComponent(state.novelId)}`);
      state.storyboards = listOf(data, ["data", "storyboards"]);
      if (state.storyboards.length && !state.storyboardId) state.storyboardId = String(state.storyboards[0].id);
    } catch (error) {
      state.storyboards = [];
      state.error = `读取分镜失败：${error.message || error}`;
    }
  }

  async function generateTopview() {
    if (!state.storyboardId) return;
    state.loading = true;
    state.error = "";
    state.message = "正在生成俯视底板、推演人物状态并融合调度图，请稍候…";
    renderModal();
    try {
      state.result = await api(`/api/topview-demo/storyboard/${encodeURIComponent(state.storyboardId)}/fuse`, {
        method: "POST",
        body: JSON.stringify({ config_id: Number(state.imageConfigId), llm_config_id: Number(state.llmConfigId) }),
      });
      await loadStoryboards();
      state.message = "生成完成，结果已写入当前分镜";
    } catch (error) {
      state.error = `生成失败：${error.message || error}`;
    } finally {
      state.loading = false;
      renderModal();
    }
  }

  async function removeTopview() {
    if (!state.storyboardId || !confirm("确定删除当前分镜的俯视调度图吗？")) return;
    state.loading = true;
    state.error = "";
    state.message = "正在删除…";
    renderModal();
    try {
      await api(`/api/topview-demo/storyboard/${encodeURIComponent(state.storyboardId)}/fuse`, { method: "DELETE" });
      state.result = null;
      await loadStoryboards();
      state.message = "已删除当前俯视调度图";
    } catch (error) {
      state.error = `删除失败：${error.message || error}`;
    } finally {
      state.loading = false;
      renderModal();
    }
  }

  function closeModal() {
    const node = document.getElementById(MODAL_ID);
    if (node) node.remove();
  }

  function pageText() {
    return `${location.href} ${location.hash} ${document.title} ${document.body?.innerText?.slice(0, 1600) || ""}`;
  }

  function isLoginOrActivationPage() {
    const text = pageText();
    return /手机号|短信验证码|发送验证码|官网充值|会员仅限有效|进入工作台|登录/.test(text)
      && !/小说列表|剧本转换|信息提取|分镜管理|即梦视频生成/.test(text);
  }

  function inWorkbench() {
    const text = pageText();
    return !isLoginOrActivationPage() && /小说导入/.test(text) && /剧本转换/.test(text) && /设置/.test(text);
  }

  function pageSupportsTopview() {
    return window.wanshanRoute?.is("storyboards") === true;
  }

  function ensureButton() {
    if (!pageSupportsTopview()) {
      document.getElementById(BUTTON_ID)?.remove();
      return;
    }
    addStyle();
    if (document.getElementById(BUTTON_ID)) return;
    const node = button("俯视调度", "", async () => {
      state.error = "";
      state.message = "正在读取数据…";
      state.result = null;
      const modal = document.createElement("div");
      modal.id = MODAL_ID;
      modal.className = "wst-mask";
      document.body.appendChild(modal);
      renderModal();
      await loadInitialData();
      renderModal();
    });
    node.id = BUTTON_ID;
    node.title = "生成并管理人物俯视调度图";
    document.body.appendChild(node);
  }

  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
  window.wanshanRoute?.watch(() => {
    closeModal();
    ensureButton();
  });
  const observer = new MutationObserver(ensureButton);
  const start = () => { observer.observe(document.body, { childList: true, subtree: true }); ensureButton(); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
  window.addEventListener("hashchange", () => setTimeout(ensureButton, 250));
  setInterval(ensureButton, 1800);
})();
