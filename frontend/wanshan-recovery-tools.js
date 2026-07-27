(function installWanshanRecoveryTools() {
  const POLISH_BUTTON_ID = "wanshan-polish-description-button";
  const CHAIN_BUTTON_ID = "wanshan-recover-chain-button";
  const MODAL_ID = "wanshan-recovery-tools-modal";

  function currentRoute() {
    return window.wanshanRoute?.current() || "";
  }

  function onExtractionPage() {
    return currentRoute() === "extraction";
  }

  function onStoryboardOrVideoPage() {
    return currentRoute() === "storyboards" || currentRoute() === "video";
  }

  async function backendBase() {
    try {
      if (window.electronAPI && window.electronAPI.getBackendUrl) {
        return String(await window.electronAPI.getBackendUrl()).replace(/\/$/, "");
      }
    } catch (_) {}
    return "http://127.0.0.1:8000";
  }

  async function api(path, init) {
    const res = await fetch(`${await backendBase()}${path}`, init);
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch (_) { body = { message: text }; }
    if (!res.ok) throw new Error(body.detail || body.message || `HTTP ${res.status}`);
    return body;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  function closeModal() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function openToolModal(kind) {
    closeModal();
    const isPolish = kind === "polish";
    const mask = document.createElement("div");
    mask.id = MODAL_ID;
    mask.innerHTML = `<div class="wmx-recovery-dialog" role="dialog" aria-modal="true">
      <header><strong>${isPolish ? "人物描述润色" : "恢复分镜链路"}</strong><button type="button" data-close>关闭</button></header>
      <div class="wmx-recovery-body">
        <p class="wmx-recovery-hint">${isPolish
          ? "千山原版人物描述润色：只返回润色结果，不自动覆盖本地资产描述。"
          : "用于串行尾帧失败后，把后续“已中断”的分镜恢复为可重新生成状态。"}</p>
        <label>${isPolish ? "人物元素 ID" : "起点分镜 ID"}<input data-primary type="number" min="1" placeholder="${isPolish ? "例如：126" : "例如：58"}"></label>
        ${isPolish ? `<label>语言模型配置 ID<input data-llm type="number" min="1" placeholder="使用设置页里的语言模型配置 ID"></label>
        <label>额外要求<textarea data-instruction rows="3" placeholder="可选，例如：更电影感、更适合人物官格图、保留原设定"></textarea></label>` : `<label>指定恢复的分镜 ID（可选）<input data-ids placeholder="例如：59,60,61；留空则恢复该镜之后所有已中断分镜"></label>`}
        <div class="wmx-recovery-actions"><button type="button" data-run>${isPolish ? "开始润色" : "恢复链路"}</button></div>
        <pre class="wmx-recovery-result"></pre>
      </div>
    </div>`;
    document.body.appendChild(mask);
    mask.querySelector("[data-close]").onclick = closeModal;
    mask.onclick = (event) => { if (event.target === mask) closeModal(); };
    const result = mask.querySelector(".wmx-recovery-result");
    mask.querySelector("[data-run]").onclick = async () => {
      const primary = Number(mask.querySelector("[data-primary]").value || 0);
      if (!primary) {
        result.textContent = isPolish ? "请填写元素 ID。" : "请填写起点分镜 ID。";
        return;
      }
      const button = mask.querySelector("[data-run]");
      button.disabled = true;
      result.textContent = "正在处理...";
      try {
        if (isPolish) {
          const llmConfigId = Number(mask.querySelector("[data-llm]").value || 0);
          if (!llmConfigId) throw new Error("请填写语言模型配置 ID");
          const data = await api(`/api/extraction/element/${primary}/polish-description`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              llm_config_id: llmConfigId,
              instruction: mask.querySelector("[data-instruction]").value || "",
            }),
          });
          result.innerHTML = `润色完成，请确认效果后再复制保存。\n\n${escapeHtml(data.description || "")}`;
        } else {
          const ids = (mask.querySelector("[data-ids]").value || "")
            .split(/[，,\s]+/).map((item) => Number(item)).filter(Boolean);
          const data = await api("/api/video/recover-chain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storyboard_id: primary, storyboard_ids: ids }),
          });
          result.textContent = `已恢复 ${data.recovered || 0} 个分镜：${(data.storyboard_ids || []).join("、") || "无"}`;
        }
      } catch (error) {
        result.textContent = `处理失败：${error.message || error}`;
      } finally {
        button.disabled = false;
      }
    };
  }

  function ensureButton(id, text, visible, bottom, onClick) {
    let button = document.getElementById(id);
    if (!visible) {
      button?.remove();
      return;
    }
    if (!button) {
      button = document.createElement("button");
      button.id = id;
      button.type = "button";
      button.className = "wmx-recovery-fab";
      button.textContent = text;
      button.onclick = onClick;
      button.style.bottom = `${bottom}px`;
      document.body.appendChild(button);
    }
  }

  function install() {
    ensureButton(POLISH_BUTTON_ID, "润色描述", onExtractionPage(), 122, () => openToolModal("polish"));
    ensureButton(CHAIN_BUTTON_ID, "恢复链路", onStoryboardOrVideoPage(), 122, () => openToolModal("chain"));
  }

  const style = document.createElement("style");
  style.textContent = `.wmx-recovery-fab{position:fixed;right:24px;z-index:10021;border:1px solid #2aa6c8;border-radius:7px;padding:10px 14px;background:#146aa7;color:#fff;font-weight:700;box-shadow:0 10px 24px #0005;cursor:pointer}#${MODAL_ID}{position:fixed;inset:0;z-index:10030;background:#020817b8;display:flex;align-items:center;justify-content:center;padding:20px}.wmx-recovery-dialog{width:min(560px,94vw);background:#111a32;color:#eaf3ff;border:1px solid #37618f;border-radius:10px;box-shadow:0 20px 60px #0008}.wmx-recovery-dialog header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #29476d}.wmx-recovery-dialog header button,.wmx-recovery-actions button{border:1px solid #4384bd;border-radius:6px;background:#18365e;color:#fff;padding:7px 12px;cursor:pointer}.wmx-recovery-body{display:grid;gap:12px;padding:16px}.wmx-recovery-hint{margin:0;color:#a9dcff;font-size:13px;line-height:1.6}.wmx-recovery-body label{display:grid;gap:6px;color:#d9e8ff;font-size:13px}.wmx-recovery-body input,.wmx-recovery-body textarea{width:100%;box-sizing:border-box;border:1px solid #38547e;border-radius:7px;background:#0b1530;color:#fff;padding:9px 10px;outline:none}.wmx-recovery-actions{text-align:right}.wmx-recovery-result{min-height:64px;max-height:220px;overflow:auto;white-space:pre-wrap;margin:0;padding:10px;border:1px solid #263f66;border-radius:7px;background:#071126;color:#dff7ff;font-family:inherit;font-size:13px}`;
  document.head.appendChild(style);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
  window.wanshanRoute?.watch(() => {
    closeModal();
    install();
  });
  setInterval(install, 1000);
  window.addEventListener("hashchange", install);
  install();
})();
