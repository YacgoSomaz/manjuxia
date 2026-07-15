(function () {
  const STYLE_ID = "wanshan-novel-tags-style";
  const BUTTON_ID = "wanshan-novel-tags-button";
  const MODAL_ID = "wanshan-novel-tags-modal";

  let definitions = [];
  let novels = [];
  let activeNovelId = null;
  let selectedTags = [];
  let busy = false;
  let message = "";
  let search = "";
  let tagsDirty = false;
  let inlineNovels = [];
  let decorating = false;

  function isNovelPage() {
    const href = window.location.href || "";
    const hash = window.location.hash || "";
    return /novels|小说/.test(href + hash + document.title);
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
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value !== false && value != null) node.setAttribute(key, value === true ? "" : String(value));
    });
    (Array.isArray(children) ? children : [children]).filter(Boolean).forEach((child) => {
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function notify(text) {
    message = text || "";
    renderModal();
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .wnt-float{position:fixed;right:22px;bottom:22px;z-index:99990;border:1px solid rgba(100,181,246,.48);background:linear-gradient(135deg,#409eff,#00bfa5);color:#fff;border-radius:8px;padding:10px 14px;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.35);font-weight:650}
      .wnt-float:hover{filter:brightness(1.08)}
      .wnt-mask{position:fixed;inset:0;z-index:99999;background:rgba(2,8,24,.72);display:flex;align-items:center;justify-content:center;padding:22px}
      .wnt-dialog{width:min(1120px,96vw);max-height:92vh;overflow:hidden;background:#111a32;border:1px solid rgba(100,181,246,.28);border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.45);color:#e8f7ff;display:flex;flex-direction:column}
      .wnt-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(100,181,246,.18)}
      .wnt-head h3{margin:0;font-size:17px}
      .wnt-close,.wnt-btn{border:1px solid rgba(100,181,246,.38);background:rgba(100,181,246,.14);color:#e8f7ff;border-radius:6px;padding:7px 11px;cursor:pointer;font-size:13px}
      .wnt-close:hover,.wnt-btn:hover{background:rgba(100,181,246,.25)}
      .wnt-btn.primary{background:#409eff;border-color:#409eff;color:#fff}
      .wnt-btn.success{background:#13b7a8;border-color:#13b7a8;color:#fff}
      .wnt-btn:disabled{opacity:.55;cursor:not-allowed}
      .wnt-body{display:grid;grid-template-columns:330px 1fr;gap:16px;padding:16px;overflow:auto}
      .wnt-list-panel,.wnt-editor{border:1px solid rgba(100,181,246,.18);border-radius:8px;background:rgba(255,255,255,.025);padding:12px}
      .wnt-list{display:flex;flex-direction:column;gap:8px;max-height:64vh;overflow:auto}
      .wnt-item{padding:10px;border:1px solid rgba(100,181,246,.18);border-radius:8px;background:rgba(255,255,255,.035);cursor:pointer}
      .wnt-item.active{border-color:#409eff;background:rgba(64,158,255,.16)}
      .wnt-item-title{font-weight:650;margin-bottom:6px}
      .wnt-item-meta{font-size:12px;color:rgba(220,240,255,.62)}
      .wnt-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
      .wnt-chip{font-size:12px;padding:2px 7px;border-radius:999px;background:rgba(64,158,255,.18);border:1px solid rgba(64,158,255,.32);color:#cfeaff}
      .wnt-chip.warn{background:rgba(230,162,60,.15);border-color:rgba(230,162,60,.32);color:#ffdba8}
      .wnt-section{margin-bottom:14px}
      .wnt-section h4{margin:0 0 8px;font-size:14px;color:#e8f7ff}
      .wnt-radio-row,.wnt-tag-grid{display:flex;flex-wrap:wrap;gap:8px}
      .wnt-tag{border:1px solid rgba(100,181,246,.24);background:rgba(100,181,246,.08);border-radius:999px;padding:6px 10px;cursor:pointer;color:#dff5ff;font-size:13px}
      .wnt-tag.active{background:#409eff;border-color:#409eff;color:#fff}
      .wnt-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
      .wnt-toolbar input{flex:1;border:1px solid rgba(100,181,246,.24);border-radius:6px;background:#0b1328;color:#e8f7ff;padding:8px 10px;outline:none}
      .wnt-msg{margin-top:10px;color:#ffdba8;font-size:13px;white-space:pre-wrap}
      .wnt-empty{padding:28px 10px;text-align:center;color:rgba(220,240,255,.58)}
      .wnt-inline-wrap{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-top:4px;max-width:360px;max-height:44px;overflow:hidden;line-height:1.2}
      .wnt-inline-chip{display:inline-flex;align-items:center;max-width:120px;height:18px;padding:0 6px;border-radius:999px;font-size:11px;line-height:18px;font-weight:650;border:1px solid rgba(64,158,255,.38);background:rgba(64,158,255,.16);color:#bfeaff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .wnt-inline-chip.ok{border-color:rgba(19,183,168,.55);background:rgba(19,183,168,.18);color:#8ff5df}
      .wnt-inline-chip.warn{border-color:rgba(245,108,108,.46);background:rgba(245,108,108,.16);color:#ffc2c2}
      .wnt-inline-chip.screen{border-color:rgba(126,211,255,.48);background:rgba(126,211,255,.15);color:#c7f0ff}
      .wnt-inline-chip.visual{border-color:rgba(78,203,113,.48);background:rgba(78,203,113,.15);color:#c8ffd8}
      .wnt-inline-chip.audience{border-color:rgba(255,180,80,.48);background:rgba(255,180,80,.15);color:#ffd8a0}
      .wnt-inline-chip.topic{border-color:rgba(255,138,138,.48);background:rgba(255,138,138,.13);color:#ffc5c5}
      @media(max-width:860px){.wnt-body{grid-template-columns:1fr}.wnt-list{max-height:30vh}}
    `;
    document.head.appendChild(style);
  }

  function byDimension(dim) {
    return definitions.filter((tag) => tag.dimension === dim);
  }

  function activeNovel() {
    return novels.find((n) => Number(n.id) === Number(activeNovelId)) || null;
  }

  function hasTag(code) {
    return selectedTags.some((tag) => tag.code === code);
  }

  function setSingleDimension(tag) {
    selectedTags = selectedTags.filter((item) => item.dimension !== tag.dimension);
    selectedTags.push({ code: tag.code, label: tag.label, dimension: tag.dimension, score: 1, source: "manual" });
    renderModal();
  }

  function toggleContentTag(tag) {
    if (hasTag(tag.code)) {
      selectedTags = selectedTags.filter((item) => item.code !== tag.code);
    } else {
      selectedTags.push({ code: tag.code, label: tag.label, dimension: tag.dimension, score: 1, source: "manual" });
    }
    renderModal();
  }

  function tagSummary(tags) {
    if (!tags || !tags.length) return [el("span", { class: "wnt-chip warn", text: "未设置标签" })];
    return tags.slice(0, 8).map((tag) => el("span", { class: "wnt-chip", text: tag.label }));
  }

  function tagClass(tag) {
    if (!tag) return "";
    if (tag.dimension === "screen_mode") return "screen";
    if (tag.dimension === "visual_medium") return "visual";
    if (tag.dimension === "audience") return "audience";
    return "topic";
  }

  function sortedTags(tags) {
    const order = { screen_mode: 1, visual_medium: 2, audience: 3, genre: 4, trope: 4 };
    return [...(tags || [])].sort((a, b) => (order[a.dimension] || 9) - (order[b.dimension] || 9));
  }

  function hasRequiredTags(tags) {
    return ["screen_mode", "visual_medium"].every((dim) => (tags || []).some((tag) => tag.dimension === dim));
  }

  function hasAnyTags(tags) {
    return Array.isArray(tags) && tags.length > 0;
  }

  function inlineTagNodes(tags) {
    const nodes = [];
    const tagged = hasAnyTags(tags);
    if (!tagged) {
      nodes.push(el("span", { class: "wnt-inline-chip warn", text: "未打标" }));
      return nodes;
    }
    const maxVisibleTags = 8;
    sortedTags(tags).slice(0, maxVisibleTags).forEach((tag) => {
      nodes.push(el("span", { class: `wnt-inline-chip ${tagClass(tag)}`, text: tag.label }));
    });
    if ((tags || []).length > maxVisibleTags) {
      nodes.push(el("span", { class: "wnt-inline-chip", text: `+${tags.length - maxVisibleTags}` }));
    }
    return nodes;
  }

  function findNovelNameElement(name) {
    if (!name) return null;
    const candidates = Array.from(document.querySelectorAll("td, .el-table__cell, .cell, span, a, div"))
      .filter((node) => !node.closest(`#${MODAL_ID}`) && !node.closest(`#${BUTTON_ID}`) && !node.closest(".wnt-inline-wrap"));
    return candidates.find((node) => {
      const text = (node.textContent || "").trim();
      return text === name && node.children.length <= 1;
    }) || null;
  }

  function inlineTagContainer(target) {
    if (!target) return null;
    const tableCell = target.closest && target.closest(".cell");
    if (tableCell) return tableCell;
    const td = target.closest && target.closest("td");
    if (td) return td.querySelector(".cell") || td;
    if (target.classList && (target.classList.contains("cell") || target.tagName === "TD")) return target;
    return target.parentElement || target;
  }

  function renderInlineTags() {
    if (!isNovelPage() || !inlineNovels.length) return;
    document.querySelectorAll(".wnt-inline-wrap").forEach((node) => node.remove());
    inlineNovels.forEach((novel) => {
      const target = findNovelNameElement(novel.name || "");
      if (!target) return;
      const container = inlineTagContainer(target);
      if (!container || container.closest(`#${MODAL_ID}`)) return;
      const tags = novel.novel_tags || [];
      const wrap = el("div", { class: "wnt-inline-wrap", "data-novel-id": novel.id }, inlineTagNodes(tags));
      container.appendChild(wrap);
    });
  }

  async function refreshInlineTags() {
    if (decorating || !isNovelPage()) return;
    decorating = true;
    try {
      const data = await api("/api/novels/");
      inlineNovels = Array.isArray(data) ? data : [];
      renderInlineTags();
    } catch (err) {
      console.warn("[wanshan-tags] 刷新主列表标签失败:", err);
    } finally {
      decorating = false;
    }
  }

  async function loadData() {
    busy = true;
    renderModal();
    try {
      const [defRes, novelRes] = await Promise.all([
        api("/api/novels/tag-definitions"),
        api("/api/novels/"),
      ]);
      definitions = (defRes && defRes.tags) || [];
      novels = Array.isArray(novelRes) ? novelRes : [];
      if (!activeNovelId && novels[0]) activeNovelId = novels[0].id;
      const current = activeNovel();
      selectedTags = current ? [...(current.novel_tags || [])] : [];
      message = "";
    } catch (err) {
      message = `加载失败：${err.message || err}`;
    } finally {
      busy = false;
      renderModal();
    }
  }

  async function selectNovel(id) {
    activeNovelId = id;
    const current = activeNovel();
    selectedTags = current ? [...(current.novel_tags || [])] : [];
    message = "";
    renderModal();
  }

  function selectedLabels(dim) {
    return selectedTags.filter((tag) => tag.dimension === dim).map((tag) => tag.label);
  }

  async function analyzeTags() {
    const current = activeNovel();
    if (!current) return;
    busy = true;
    renderModal();
    try {
      const result = await api(`/api/novels/${current.id}/tags/analyze`, {
        method: "POST",
        body: JSON.stringify({
          visual_tags: selectedLabels("visual_medium"),
          screen_mode_tags: selectedLabels("screen_mode"),
        }),
      });
      selectedTags = (result.tags || []).map((tag) => ({
        code: tag.code,
        label: tag.label,
        dimension: tag.dimension,
        score: tag.score || 1,
        source: tag.source || "llm",
        evidence: tag.evidence || "",
      }));
      message = `分析完成：${result.source === "llm" ? "AI识别" : "关键词识别"}`;
    } catch (err) {
      message = `分析失败：${err.message || err}`;
    } finally {
      busy = false;
      renderModal();
    }
  }

  async function saveTags() {
    const current = activeNovel();
    if (!current) return;
    busy = true;
    renderModal();
    try {
      const result = await api(`/api/novels/${current.id}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tags: selectedTags }),
      });
      const saved = result.tags || [];
      novels = novels.map((novel) => Number(novel.id) === Number(current.id) ? { ...novel, novel_tags: saved } : novel);
      inlineNovels = novels;
      selectedTags = [...saved];
      tagsDirty = true;
      window.dispatchEvent(new CustomEvent("wanshan:novel-tags-updated", {
        detail: { novelId: current.id, tags: saved },
      }));
      renderInlineTags();
      const missing = result.missing_required_tags || [];
      message = missing.length ? `保存成功，生成前还需补齐：${missing.join("、")}` : "保存成功";
    } catch (err) {
      message = `保存失败：${err.message || err}`;
    } finally {
      busy = false;
      renderModal();
    }
  }

  function renderTagGroup(title, dim, mode) {
    const tags = byDimension(dim);
    return el("div", { class: "wnt-section" }, [
      el("h4", { text: title }),
      el("div", { class: mode === "single" ? "wnt-radio-row" : "wnt-tag-grid" }, tags.map((tag) =>
        el("button", {
          class: `wnt-tag ${hasTag(tag.code) ? "active" : ""}`,
          type: "button",
          text: tag.label,
          onclick: () => mode === "single" ? setSingleDimension(tag) : toggleContentTag(tag),
        })
      )),
    ]);
  }

  function renderModal() {
    const existing = document.getElementById(MODAL_ID);
    if (!existing) return;
    existing.innerHTML = "";
    const filteredNovels = novels.filter((novel) => {
      const text = `${novel.name || ""} ${(novel.novel_tags || []).map((tag) => tag.label).join(" ")}`;
      return !search || text.includes(search);
    });
    const current = activeNovel();
    existing.appendChild(el("div", { class: "wnt-dialog" }, [
      el("div", { class: "wnt-head" }, [
        el("h3", { text: "小说标签管理" }),
        el("button", { class: "wnt-close", type: "button", text: "关闭", onclick: closeModal }),
      ]),
      el("div", { class: "wnt-body" }, [
        el("div", { class: "wnt-list-panel" }, [
          el("div", { class: "wnt-toolbar" }, [
            el("input", {
              placeholder: "搜索小说/标签",
              value: search,
              oninput: (event) => { search = event.target.value || ""; renderModal(); },
            }),
            el("button", { class: "wnt-btn", type: "button", text: busy ? "刷新中" : "刷新", disabled: busy, onclick: loadData }),
          ]),
          el("div", { class: "wnt-list" },
            filteredNovels.length ? filteredNovels.map((novel) =>
              el("div", {
                class: `wnt-item ${Number(novel.id) === Number(activeNovelId) ? "active" : ""}`,
                onclick: () => selectNovel(novel.id),
              }, [
                el("div", { class: "wnt-item-title", text: novel.name || `小说 ${novel.id}` }),
                el("div", { class: "wnt-item-meta", text: `${novel.chapter_count || 0} 章 · ${novel.mode || "import"}` }),
                el("div", { class: "wnt-chips" }, tagSummary(novel.novel_tags || [])),
              ])
            ) : [el("div", { class: "wnt-empty", text: busy ? "加载中..." : "暂无小说" })]
          ),
        ]),
        el("div", { class: "wnt-editor" }, current ? [
          el("div", { class: "wnt-toolbar" }, [
            el("strong", { text: current.name || `小说 ${current.id}` }),
            el("div", {}, [
              el("button", { class: "wnt-btn", type: "button", text: busy ? "分析中" : "AI分析题材", disabled: busy, onclick: analyzeTags }),
              " ",
              el("button", { class: "wnt-btn primary", type: "button", text: busy ? "保存中" : "保存标签", disabled: busy, onclick: saveTags }),
            ]),
          ]),
          renderTagGroup("屏幕模式（必选一项）", "screen_mode", "single"),
          renderTagGroup("视觉方向（必选一项）", "visual_medium", "single"),
          renderTagGroup("受众标签", "audience", "multi"),
          renderTagGroup("题材/模板匹配标签", "genre", "multi"),
          message ? el("div", { class: "wnt-msg", text: message }) : null,
        ] : [el("div", { class: "wnt-empty", text: "请选择一部小说" })]),
      ]),
    ]));
  }

  function openModal() {
    addStyle();
    let mask = document.getElementById(MODAL_ID);
    if (!mask) {
      mask = el("div", { id: MODAL_ID, class: "wnt-mask" });
      document.body.appendChild(mask);
    }
    loadData();
  }

  function closeModal() {
    const mask = document.getElementById(MODAL_ID);
    if (mask) mask.remove();
    if (tagsDirty) {
      tagsDirty = false;
      refreshInlineTags();
    }
  }

  function ensureButton() {
    addStyle();
    const existing = document.getElementById(BUTTON_ID);
    if (!isNovelPage()) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    document.body.appendChild(el("button", {
      id: BUTTON_ID,
      class: "wnt-float",
      type: "button",
      text: "小说标签",
      onclick: openModal,
    }));
  }

  const tick = () => {
    try { ensureButton(); } catch (_) {}
    try { renderInlineTags(); } catch (_) {}
  };
  const debouncedRefresh = (() => {
    let timer = null;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(refreshInlineTags, 250);
    };
  })();
  window.addEventListener("hashchange", tick);
  window.addEventListener("popstate", tick);
  window.addEventListener("wanshan:novel-tags-updated", debouncedRefresh);
  document.addEventListener("DOMContentLoaded", tick);
  setTimeout(refreshInlineTags, 800);
  setTimeout(refreshInlineTags, 2200);
  setInterval(tick, 1500);
})();
