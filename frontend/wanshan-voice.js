(function installWanshanVoicePanel() {
  const BUTTON_ID = "wanshan-voice-button";
  const MODAL_ID = "wanshan-voice-modal";

  function onExtractionPage() {
    return window.wanshanRoute?.is("extraction") === true;
  }

  async function base() {
    try {
      if (window.electronAPI && window.electronAPI.getBackendUrl) return String(await window.electronAPI.getBackendUrl()).replace(/\/$/, "");
    } catch (_) {}
    return "http://127.0.0.1:8000";
  }

  async function api(path, init) {
    const res = await fetch(`${await base()}${path}`, init);
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; } catch (_) { body = { message: text }; }
    if (!res.ok) throw new Error(body.detail || body.message || `HTTP ${res.status}`);
    return body;
  }

  function close() { document.getElementById(MODAL_ID)?.remove(); }

  function open() {
    if (document.getElementById(MODAL_ID)) return;
    const mask = document.createElement("div");
    mask.id = MODAL_ID;
    mask.innerHTML = `<div class="wmx-voice-dialog" role="dialog" aria-modal="true">
      <header><strong>音色管理</strong><button class="wmx-voice-close" type="button">关闭</button></header>
      <div class="wmx-voice-body"><p class="wmx-voice-status">正在加载音色...</p><div class="wmx-voice-list"></div></div>
    </div>`;
    document.body.appendChild(mask);
    mask.querySelector(".wmx-voice-close").onclick = close;
    mask.onclick = (e) => { if (e.target === mask) close(); };
    const list = mask.querySelector(".wmx-voice-list");
    const status = mask.querySelector(".wmx-voice-status");
    api("/api/extraction/voices").then((data) => {
      const voices = Array.isArray(data.voices) ? data.voices : [];
      list.innerHTML = voices.length ? voices.map((voice) => `<div class="wmx-voice-row">
        <span><b>${String(voice.label || voice.name || voice.voice_id || "未命名音色").replace(/[<>&]/g, "")}</b><small>${voice.source === "custom" ? "我的音色" : "预置音色"}</small></span>
        <button type="button" data-voice="${String(voice.voice_id || "").replace(/"/g, "&quot;")}">试听</button>
      </div>`).join("") : `<div class="wmx-voice-empty">暂无可用音色</div>`;
      status.textContent = `共 ${voices.length} 个音色。选择角色后，可在角色卡片中绑定音色。`;
      list.querySelectorAll("button[data-voice]").forEach((button) => {
        button.onclick = async () => {
          button.disabled = true;
          try {
            const result = await api("/api/extraction/voices/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voice_id: button.dataset.voice }) });
            if (result.audio_url) new Audio(result.audio_url.startsWith("/") ? `${await base()}${result.audio_url}` : result.audio_url).play();
            status.textContent = "试听已生成。";
          } catch (error) { status.textContent = `试听失败：${error.message}`; }
          button.disabled = false;
        };
      });
    }).catch((error) => { status.textContent = `加载音色失败：${error.message}`; });
  }

  function install() {
    const button = document.getElementById(BUTTON_ID);
    if (!onExtractionPage()) { button?.remove(); return; }
    if (!button) {
      const next = document.createElement("button");
      next.id = BUTTON_ID; next.type = "button"; next.textContent = "音色管理"; next.onclick = open;
      document.body.appendChild(next);
    }
  }

  const style = document.createElement("style");
  style.textContent = `#${BUTTON_ID}{position:fixed;right:24px;bottom:74px;z-index:10020;border:1px solid #2aa6c8;border-radius:7px;padding:10px 14px;background:#087ea4;color:#fff;font-weight:600;cursor:pointer}.wmx-voice-mask{}.wmx-voice-dialog{width:min(620px,94vw);max-height:82vh;overflow:hidden;background:#111a32;color:#eaf3ff;border:1px solid #37618f;border-radius:10px;box-shadow:0 20px 60px #0008}.wmx-voice-dialog header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #29476d}.wmx-voice-dialog header button,.wmx-voice-row button{border:1px solid #4384bd;border-radius:6px;background:#18365e;color:#fff;padding:6px 10px;cursor:pointer}.wmx-voice-body{padding:16px;max-height:72vh;overflow:auto}.wmx-voice-status{margin:0 0 12px;color:#a9dcff;font-size:13px}.wmx-voice-list{display:grid;gap:8px}.wmx-voice-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;border:1px solid #28456e;border-radius:7px;background:#0b1530}.wmx-voice-row span{display:grid;gap:3px}.wmx-voice-row small{color:#93aac8}.wmx-voice-empty{padding:18px;text-align:center;color:#91a4c2}#${MODAL_ID}{position:fixed;inset:0;z-index:10019;background:#020817b8;display:flex;align-items:center;justify-content:center;padding:20px}`;
  document.head.appendChild(style);
  setInterval(install, 900);
  window.addEventListener("hashchange", install);
  window.wanshanRoute?.watch(() => { close(); install(); });
  install();
})();
