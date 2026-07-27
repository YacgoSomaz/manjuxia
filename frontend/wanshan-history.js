(function installWanshanVideoHistory() {
  const MENU_ID = "manjuxia-video-history-menu";
  const PAGE_ID = "manjuxia-video-history-page";
  const STYLE_ID = "manjuxia-video-history-style";

  function backendBase() {
    return window.electronAPI && typeof window.electronAPI.getBackendUrl === "function"
      ? window.electronAPI.getBackendUrl().then((value) => String(value || "http://127.0.0.1:8000").replace(/\/$/, ""))
      : Promise.resolve("http://127.0.0.1:8000");
  }

  async function requestHistory() {
    const base = await backendBase();
    const response = await fetch(`${base}/api/video/history?limit=200&offset=0`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) throw new Error(body.detail || body.message || "历史成片加载失败");
    return { base, body };
  }

  function mediaUrl(base, value) {
    const raw = String(value || "");
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }

  function style() {
    if (document.getElementById(STYLE_ID)) return;
    const css = document.createElement("style");
    css.id = STYLE_ID;
    css.textContent = `
      #${PAGE_ID}{position:fixed;inset:0 0 0 220px;z-index:15000;overflow:auto;background:#f8fafc;color:#0f172a;padding:28px 32px;font-family:"Microsoft YaHei",sans-serif}
      .mvh-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px;border-bottom:1px solid #e2e8f0;padding-bottom:16px}
      .mvh-head h1{margin:0;font-size:24px;color:#0f172a}.mvh-head p{margin:6px 0 0;color:#64748b;font-size:13px}
      .mvh-actions{display:flex;gap:8px}.mvh-btn{border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#334155;padding:8px 13px;cursor:pointer;font-size:13px}.mvh-btn.primary{border-color:#0ea5e9;background:#0ea5e9;color:#fff}.mvh-btn:hover{filter:brightness(.98)}
      .mvh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}.mvh-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 3px 10px rgba(15,23,42,.06)}
      .mvh-video{display:block;width:100%;aspect-ratio:16/9;background:#0f172a;object-fit:contain}.mvh-body{padding:13px 15px}.mvh-title{font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mvh-meta{margin-top:6px;color:#64748b;font-size:12px;line-height:1.6}.mvh-missing{display:grid;place-items:center;aspect-ratio:16/9;background:#e2e8f0;color:#64748b;font-size:13px}.mvh-empty{padding:80px 20px;text-align:center;color:#64748b;background:#fff;border:1px dashed #cbd5e1;border-radius:10px}.mvh-error{padding:14px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px}
      @media(max-width:760px){#${PAGE_ID}{inset:0;padding:18px}.mvh-head{align-items:flex-start;flex-direction:column}.mvh-grid{grid-template-columns:1fr}}
      body.manjuxia-dark-theme #${PAGE_ID}{background:#080d20;color:#e8f1ff}
      body.manjuxia-dark-theme .mvh-head{border-color:#22345a}
      body.manjuxia-dark-theme .mvh-head h1,body.manjuxia-dark-theme .mvh-title{color:#e8f1ff}
      body.manjuxia-dark-theme .mvh-head p,body.manjuxia-dark-theme .mvh-meta{color:#9fb2cf}
      body.manjuxia-dark-theme .mvh-btn{background:#111d3b;color:#dbe9fb;border-color:#38527b}
      body.manjuxia-dark-theme .mvh-btn.primary{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
      body.manjuxia-dark-theme .mvh-card,body.manjuxia-dark-theme .mvh-empty{background:#101a35;border-color:#2b4169;color:#dbe9fb}
      body.manjuxia-dark-theme .mvh-missing{background:#162442;color:#9fb2cf}
      body.manjuxia-dark-theme .mvh-error{background:#351b2a;border-color:#8f4159;color:#fecdd3}
    `;
    document.head.appendChild(css);
  }

  function closePage() {
    const page = document.getElementById(PAGE_ID);
    if (page) page.remove();
  }

  function renderItems(page, base, items) {
    const grid = page.querySelector(".mvh-grid");
    if (!grid) return;
    grid.replaceChildren();
    if (!items.length) {
      grid.appendChild(Object.assign(document.createElement("div"), { className: "mvh-empty", textContent: "还没有已完成的成片" }));
      return;
    }
    for (const item of items) {
      const card = document.createElement("article");
      card.className = "mvh-card";
      if (item.exists !== false) {
        const video = document.createElement("video");
        video.className = "mvh-video";
        video.controls = true;
        video.preload = "metadata";
        video.src = mediaUrl(base, item.video_url);
        video.addEventListener("error", () => { video.replaceWith(Object.assign(document.createElement("div"), { className: "mvh-missing", textContent: "视频文件暂时不可用" })); });
        card.appendChild(video);
      } else {
        card.appendChild(Object.assign(document.createElement("div"), { className: "mvh-missing", textContent: "视频文件已被移动或删除" }));
      }
      const body = document.createElement("div");
      body.className = "mvh-body";
      const title = document.createElement("div");
      title.className = "mvh-title";
      title.textContent = `${item.novel_name} · ${item.chapter_title} · 场景${item.scene_number || "-"}`;
      const meta = document.createElement("div");
      meta.className = "mvh-meta";
      meta.textContent = `${item.video_provider || "本地视频任务"} · ${item.video_submit_time || item.created_at || "时间未知"}`;
      body.append(title, meta);
      card.appendChild(body);
      grid.appendChild(card);
    }
  }

  async function openPage() {
    style();
    closePage();
    const page = document.createElement("section");
    page.id = PAGE_ID;
    page.innerHTML = `<header class="mvh-head"><div><h1>历史成片</h1><p>这里展示已保存到本机的成片，按最近生成时间排列。</p></div><div class="mvh-actions"><button class="mvh-btn primary mvh-refresh">刷新</button><button class="mvh-btn mvh-close">关闭</button></div></header><div class="mvh-grid"><div class="mvh-empty">正在加载历史成片…</div></div>`;
    document.body.appendChild(page);
    page.querySelector(".mvh-close").addEventListener("click", closePage);
    page.querySelector(".mvh-refresh").addEventListener("click", () => load(page));
    await load(page);
  }

  async function load(page) {
    const grid = page.querySelector(".mvh-grid");
    if (!grid) return;
    try {
      const result = await requestHistory();
      renderItems(page, result.base, Array.isArray(result.body.items) ? result.body.items : []);
    } catch (error) {
      grid.replaceChildren(Object.assign(document.createElement("div"), { className: "mvh-error", textContent: error.message || "历史成片加载失败" }));
    }
  }

  function ensureMenu() {
    const menu = document.querySelector(".sidebar-menu, .el-menu");
    if (!menu || document.getElementById(MENU_ID)) return;
    const item = document.createElement("li");
    item.id = MENU_ID;
    item.className = "el-menu-item manjuxia-video-history-menu";
    item.setAttribute("role", "menuitem");
    item.innerHTML = '<span aria-hidden="true">▣</span><span class="menu-label">历史成片</span>';
    item.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openPage(); });
    menu.appendChild(item);
  }

  const observer = new MutationObserver(ensureMenu);
  const start = () => { ensureMenu(); observer.observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else window.addEventListener("DOMContentLoaded", start, { once: true });
  document.addEventListener("click", (event) => {
    const target = event.target && event.target.closest ? event.target : null;
    if (target && !target.closest(`#${PAGE_ID}`) && !target.closest(`#${MENU_ID}`) && target.closest(".el-menu-item")) closePage();
  }, true);
  window.manjuxiaOpenVideoHistory = openPage;
})();
