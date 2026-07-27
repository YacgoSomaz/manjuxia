(function installWanshanPippitPanel() {
  const BUTTON_ID = "wanshan-pippit-button";
  const MODAL_ID = "wanshan-pippit-modal";
  const isVideoPage = () => window.wanshanRoute?.is("video") === true;
  async function base() { try { if (window.electronAPI?.getBackendUrl) return String(await window.electronAPI.getBackendUrl()).replace(/\/$/, ""); } catch (_) {} return "http://127.0.0.1:8000"; }
  async function api(path, init) { const r = await fetch(`${await base()}${path}`, init); const t = await r.text(); let b; try { b = t ? JSON.parse(t) : {}; } catch (_) { b = { message: t }; } if (!r.ok) throw new Error(b.detail || b.message || `HTTP ${r.status}`); return b; }
  function close() { document.getElementById(MODAL_ID)?.remove(); }
  async function open() {
    if (document.getElementById(MODAL_ID)) return;
    const mask = document.createElement("div"); mask.id = MODAL_ID;
    mask.innerHTML = `<div class="wmx-pip-dialog"><header><strong>小云雀 CLI</strong><button type="button" data-close>关闭</button></header><main><p>小云雀配置只保存在本机，不会写入云端模型配置。</p><label>Access Key<input type="password" data-key autocomplete="off" placeholder="可选，留空不修改"></label><div class="wmx-pip-actions"><button type="button" data-save>保存</button><button type="button" data-check>检查 CLI</button></div><div data-status>正在读取配置...</div></main></div>`;
    document.body.appendChild(mask); mask.querySelector("[data-close]").onclick = close; mask.onclick = e => { if (e.target === mask) close(); };
    const status = mask.querySelector("[data-status]");
    try { const cfg = await api("/api/video/pippit/config"); status.textContent = cfg.has_access_key ? `已配置：${cfg.access_key_masked}` : "尚未配置 Access Key"; } catch (e) { status.textContent = `读取失败：${e.message}`; }
    mask.querySelector("[data-save]").onclick = async () => { const key = mask.querySelector("[data-key]").value.trim(); if (!key) { status.textContent = "请输入 Access Key"; return; } try { const cfg = await api("/api/video/pippit/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_key: key }) }); status.textContent = cfg.message || "已保存"; } catch (e) { status.textContent = `保存失败：${e.message}`; } };
    mask.querySelector("[data-check]").onclick = async () => { try { const result = await api("/api/video/pippit/check", { method: "POST" }); status.textContent = result.message || (result.logged_in ? "CLI 已登录" : "未登录或未找到 CLI"); } catch (e) { status.textContent = `检查失败：${e.message}`; } };
  }
  const style = document.createElement("style"); style.textContent = `#${BUTTON_ID}{position:fixed;right:24px;bottom:28px;z-index:10020;border:1px solid #2aa6c8;border-radius:7px;padding:10px 14px;background:#087ea4;color:#fff;font-weight:600;cursor:pointer}#${MODAL_ID}{position:fixed;inset:0;z-index:10019;background:#020817b8;display:flex;align-items:center;justify-content:center;padding:20px}.wmx-pip-dialog{width:min(520px,94vw);background:#111a32;color:#eaf3ff;border:1px solid #37618f;border-radius:10px;box-shadow:0 20px 60px #0008}.wmx-pip-dialog header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #29476d}.wmx-pip-dialog header button,.wmx-pip-actions button{border:1px solid #4384bd;border-radius:6px;background:#18365e;color:#fff;padding:7px 11px;cursor:pointer}.wmx-pip-dialog main{padding:16px}.wmx-pip-dialog label{display:grid;gap:6px;font-size:13px}.wmx-pip-dialog input{border:1px solid #3c6592;border-radius:6px;background:#09132a;color:#fff;padding:9px}.wmx-pip-actions{display:flex;gap:8px;margin-top:14px}.wmx-pip-dialog [data-status]{margin-top:14px;color:#a9dcff;font-size:13px}`; document.head.appendChild(style);
  function install() { const b = document.getElementById(BUTTON_ID); if (!isVideoPage()) { b?.remove(); return; } if (!b) { const n = document.createElement("button"); n.id = BUTTON_ID; n.type = "button"; n.textContent = "小云雀配置"; n.onclick = open; document.body.appendChild(n); } }
  window.wanshanRoute?.watch(() => { close(); install(); });
  setInterval(install, 900); addEventListener("hashchange", install); addEventListener("popstate", install); install();
})();
