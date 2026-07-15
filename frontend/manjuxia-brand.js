(function () {
  const BRAND_NAME = "漫剧虾";
  const BRAND_EN = "ManJuXia";
  const BRAND_SUBTITLE = "AI漫剧创作平台";
  const THEME_KEY = "manjuxia_theme";
  const replacements = [
    ["万山漫剧", BRAND_NAME],
    ["万山自媒体", BRAND_NAME],
    ["万山", BRAND_NAME],
    ["WanShan", BRAND_EN],
    ["千山AI", BRAND_NAME],
    ["千山 AI", BRAND_NAME],
    ["qianshanAI", "manjuxia"],
    ["漫剧创作平台", BRAND_SUBTITLE]
  ];

  function applyText(text) {
    let next = text;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    return next;
  }

  function shouldSkip(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/.test(parent.tagName);
  }

  function patchTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (shouldSkip(node)) continue;
      const next = applyText(node.nodeValue || "");
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function getTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return stored === "light" ? "light" : "dark";
    } catch (_) {
      return "dark";
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {
      // Ignore private-mode storage failures.
    }
  }

  function lightThemeLink() {
    return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find((link) => /manjuxia-light\.css(?:$|\?)/.test(link.getAttribute("href") || ""));
  }

  function installThemeToggleStyle() {
    if (document.getElementById("manjuxia-theme-toggle-style")) return;
    const style = document.createElement("style");
    style.id = "manjuxia-theme-toggle-style";
    style.textContent = `
      .manjuxia-theme-toggle {
        width: calc(100% - 32px);
        margin: 8px 16px 10px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid rgba(148, 163, 184, .45);
        border-radius: 8px;
        background: rgba(255, 255, 255, .72);
        color: #111827;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background .16s ease, border-color .16s ease, color .16s ease;
      }
      .manjuxia-theme-toggle:hover { background: #f8fafc; border-color: #94a3b8; }
      body.manjuxia-dark-theme .manjuxia-theme-toggle {
        background: rgba(15, 23, 42, .55);
        border-color: rgba(100, 181, 246, .35);
        color: #dff7ff;
      }
      body.manjuxia-dark-theme .manjuxia-theme-toggle:hover {
        background: rgba(33, 150, 243, .16);
        border-color: rgba(128, 222, 234, .65);
      }
      .manjuxia-theme-toggle__icon { font-size: 14px; line-height: 1; }
    `;
    document.head.appendChild(style);
  }

  function applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    const link = lightThemeLink();
    if (link) link.disabled = next === "dark";
    document.documentElement.classList.toggle("manjuxia-light-theme", next === "light");
    document.documentElement.classList.toggle("manjuxia-dark-theme", next === "dark");
    if (document.body) {
      document.body.classList.toggle("manjuxia-light-theme", next === "light");
      document.body.classList.toggle("manjuxia-dark-theme", next === "dark");
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]') || document.createElement("meta");
    if (themeMeta.getAttribute("name") !== "theme-color") themeMeta.setAttribute("name", "theme-color");
    themeMeta.setAttribute("content", next === "dark" ? "#0b1026" : "#ffffff");
    if (!themeMeta.parentNode) document.head.appendChild(themeMeta);

    const toggle = document.querySelector(".manjuxia-theme-toggle");
    if (toggle) {
      const isDark = next === "dark";
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.title = isDark ? "切换到日间模式" : "切换到夜间模式";
      if (toggle.dataset.theme !== next) {
        toggle.dataset.theme = next;
        toggle.innerHTML = `<span class="manjuxia-theme-toggle__icon">${isDark ? "☀" : "☾"}</span><span>${isDark ? "日间模式" : "夜间模式"}</span>`;
      }
    }
  }

  function toggleTheme() {
    const next = getTheme() === "dark" ? "light" : "dark";
    setStoredTheme(next);
    applyTheme(next);
  }

  function ensureThemeToggle() {
    installThemeToggleStyle();
    let toggle = document.querySelector(".manjuxia-theme-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "manjuxia-theme-toggle";
      toggle.addEventListener("click", toggleTheme);
      const footer = document.querySelector(".sidebar-footer");
      if (footer) footer.insertBefore(toggle, footer.firstChild);
      else {
        const sidebar = document.querySelector(".sidebar");
        if (sidebar) sidebar.appendChild(toggle);
      }
    }
    applyTheme(getTheme());
  }

  function installAccountFooterStyle() {
    if (document.getElementById("manjuxia-account-footer-style")) return;
    const style = document.createElement("style");
    style.id = "manjuxia-account-footer-style";
    style.textContent = `
      .sidebar-footer .price-compare-btn,
      .sidebar-footer .training-btn,
      .sidebar-footer .license-info,
      .sidebar-footer > .logout-btn { display: none !important; }
      .manjuxia-account-footer { margin: 8px 0 6px; padding: 9px 10px; border: 1px solid rgba(100,181,246,.28); border-radius: 8px; text-align: left; background: rgba(15,23,42,.42); color: #dcecff; }
      .manjuxia-account-footer__phone { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 700; }
      .manjuxia-account-footer__status { margin-top: 4px; color: #9fb7cc; font-size: 11px; line-height: 1.5; }
      .manjuxia-account-footer__action { margin-top: 7px; padding: 0; border: 0; background: transparent; color: #4fd1c5; font-size: 11px; font-weight: 700; cursor: pointer; }
      .manjuxia-account-footer__logout { width: 100%; height: 29px; margin-top: 9px; border: 1px solid #ef4444; border-radius: 6px; background: transparent; color: #f87171; font-size: 12px; font-weight: 700; cursor: pointer; }
      .manjuxia-account-footer__logout:hover { background: rgba(239,68,68,.12); border-color: #fb7185; color: #fda4af; }
      body.manjuxia-light-theme .manjuxia-account-footer { border-color: #d9e2ec; background: #f8fafc; color: #1f2937; }
      body.manjuxia-light-theme .manjuxia-account-footer__status { color: #64748b; }
      body.manjuxia-light-theme .manjuxia-account-footer__action { color: #0f766e; }
      body.manjuxia-light-theme .manjuxia-account-footer__logout { color: #dc2626; border-color: #dc2626; }
    `;
    document.head.appendChild(style);
  }

  function maskPhone(phone) {
    const text = String(phone || "");
    return /^1\d{10}$/.test(text) ? `${text.slice(0, 3)}****${text.slice(-4)}` : (text || "未登录账号");
  }

  async function openRechargePage() {
    const account = window.electronAPI && window.electronAPI.account;
    const handoff = account && typeof account.rechargeUrl === "function" ? await account.rechargeUrl() : null;
    const url = handoff && handoff.continueUrl ? handoff.continueUrl : "https://anyq.site/";
    if (window.electronAPI && typeof window.electronAPI.openExternal === "function") await window.electronAPI.openExternal(url);
  }

  function ensureAccountFooter() {
    installAccountFooterStyle();
    document.querySelectorAll(".sidebar-footer .price-compare-btn, .sidebar-footer .training-btn, .sidebar-footer .license-info").forEach((node) => node.remove());
    const footer = document.querySelector(".sidebar-footer");
    if (!footer) return;
    let accountFooter = footer.querySelector(".manjuxia-account-footer");
    if (!accountFooter) {
      accountFooter = document.createElement("section");
      accountFooter.className = "manjuxia-account-footer";
      const logout = footer.querySelector(".logout-btn");
      footer.insertBefore(accountFooter, logout || footer.querySelector(".version-text") || null);
    }
    const license = window.electronAPI && window.electronAPI.license;
    if (!license || typeof license.getInfo !== "function" || accountFooter.dataset.loading === "1" || accountFooter.dataset.ready === "1") return;
    accountFooter.dataset.loading = "1";
    license.getInfo().then((info) => {
      window.__manjuxiaAccountInfo = info || null;
      const active = Boolean(info && info.active);
      const expires = info && info.expires_at ? formatDateTime(info.expires_at) : "未开通";
      accountFooter.innerHTML = `
        <div class="manjuxia-account-footer__phone">账号：${maskPhone(info && info.phone)}</div>
        <div class="manjuxia-account-footer__status">${active ? `漫剧虾会员 · 有效至 ${expires}` : "普通用户 · 开通后可使用生成、编辑与导出"}</div>
        ${active ? "" : '<button type="button" class="manjuxia-account-footer__action">去官网开通</button>'}
        <button type="button" class="manjuxia-account-footer__logout">退出登录</button>`;
      const action = accountFooter.querySelector(".manjuxia-account-footer__action");
      if (action) action.addEventListener("click", openRechargePage);
    }).catch(() => {
      accountFooter.textContent = "账号信息暂不可用";
    }).finally(() => {
      accountFooter.dataset.loading = "";
      accountFooter.dataset.ready = "1";
    });
  }

  function patchLegacyLogoutDialog() {
    document.querySelectorAll(".el-message-box").forEach((dialog) => {
      if (!/重新输入激活码|激活码才能继续使用/.test(dialog.textContent || "")) return;
      const message = dialog.querySelector(".el-message-box__message p, .el-message-box__message");
      if (message) message.textContent = "退出后将清除当前手机号登录态。下次使用时请通过手机号验证码重新登录。";
    });
  }

  function installAccountLogoutGuard() {
    if (window.__manjuxiaAccountLogoutGuardInstalled) return;
    window.__manjuxiaAccountLogoutGuardInstalled = true;
    document.addEventListener("click", async (event) => {
      const target = event.target && event.target.closest ? event.target.closest(".logout-btn, .manjuxia-account-footer__logout") : null;
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.confirm("确认退出当前手机号账号吗？下次使用时需重新获取验证码登录。")) return;
      const account = window.electronAPI && window.electronAPI.account;
      if (account && typeof account.logout === "function") await account.logout();
      else if (window.electronAPI && window.electronAPI.license && typeof window.electronAPI.license.logout === "function") await window.electronAPI.license.logout();
      location.hash = "#/activation";
    }, true);
  }

  function installMemberButtonGate() {
    if (window.__manjuxiaMemberButtonGateInstalled) return;
    window.__manjuxiaMemberButtonGateInstalled = true;
    document.addEventListener("click", (event) => {
      if (!document.querySelector(".main-layout")) return;
      const button = event.target && event.target.closest ? event.target.closest("button") : null;
      if (!button) return;
      if (button.closest(".manjuxia-membership-dialog") || button.matches(".manjuxia-theme-toggle, .manjuxia-account-footer__logout, .manjuxia-account-footer__action, .el-dialog__headerbtn")) return;
      if (isGuestReadOnlyButton(button)) return;
      const info = window.__manjuxiaAccountInfo;
      if (info && info.active) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showMembershipRequired();
    }, true);
  }

  function isGuestReadOnlyButton(button) {
    const label = String(button && button.textContent || "").replace(/\s+/g, "");
    return /配置分镜模板/.test(label);
  }

  function patchBrandMeta() {
    applyTheme(getTheme());
    if (document.title !== BRAND_NAME) document.title = BRAND_NAME;
  }

  function patchLogoText() {
    for (const image of document.querySelectorAll(".logo-image")) {
      image.src = "./assets/manjuxia-app-icon.png";
    }
    const logoText = document.querySelector(".logo-text");
    setText(logoText, BRAND_NAME);
    const logoEn = document.querySelector(".logo-en");
    setText(logoEn, BRAND_EN);
    const logoSubtitle = document.querySelector(".logo-subtitle");
    setText(logoSubtitle, BRAND_SUBTITLE);
  }

  function installAccountLoginStyle() {
    if (document.getElementById("manjuxia-account-login-style")) return;
    const style = document.createElement("style");
    style.id = "manjuxia-account-login-style";
    style.textContent = `
      .manjuxia-account-card {
        position: relative;
        z-index: 20;
        width: min(460px, calc(100vw - 32px));
        padding: 34px;
        border-radius: 14px;
        border: 1px solid rgba(100, 181, 246, .28);
        background: rgba(10, 18, 42, .86);
        box-shadow: 0 24px 70px rgba(0, 0, 0, .45);
        color: #eaf7ff;
      }
      .activation-container > .video-bg-wrapper {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .activation-container > .video-bg-wrapper .video-bg {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: .55;
      }
      .activation-container > .video-bg-wrapper .video-overlay {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 14, 34, .35);
      }
      .manjuxia-account-card h1 {
        margin: 0;
        font-size: 30px;
        letter-spacing: 4px;
        color: #80deea;
      }
      .manjuxia-account-card .subtitle {
        margin: 8px 0 24px;
        color: #a8bdd8;
        font-size: 14px;
      }
      .manjuxia-account-field {
        margin-bottom: 14px;
      }
      .manjuxia-account-field label {
        display: block;
        margin-bottom: 7px;
        color: #cfe7ff;
        font-size: 13px;
        font-weight: 600;
      }
      .manjuxia-account-input-row {
        display: flex;
        gap: 10px;
      }
      .manjuxia-account-card input {
        width: 100%;
        height: 42px;
        box-sizing: border-box;
        border: 1px solid rgba(100, 181, 246, .35);
        border-radius: 8px;
        background: rgba(20, 31, 67, .82);
        color: #ffffff;
        padding: 0 12px;
        outline: none;
        font-size: 14px;
      }
      .manjuxia-account-card input:focus {
        border-color: #22d3ee;
        box-shadow: 0 0 0 3px rgba(34, 211, 238, .18);
      }
      .manjuxia-account-card button {
        height: 42px;
        border: 0;
        border-radius: 8px;
        padding: 0 16px;
        background: linear-gradient(135deg, #38bdf8, #14b8a6);
        color: #07111f;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .manjuxia-account-card button.secondary {
        background: rgba(148, 163, 184, .18);
        color: #dff7ff;
        border: 1px solid rgba(148, 163, 184, .35);
      }
      .manjuxia-account-card button:disabled {
        opacity: .55;
        cursor: not-allowed;
      }
      .manjuxia-account-primary {
        width: 100%;
        margin-top: 6px;
      }
      .manjuxia-account-message {
        min-height: 22px;
        margin: 12px 0 0;
        font-size: 13px;
        color: #a8bdd8;
      }
      .manjuxia-account-message.error { color: #fecaca; }
      .manjuxia-account-message.success { color: #bbf7d0; }
      .manjuxia-account-info {
        margin-top: 18px;
        padding: 14px;
        border-radius: 10px;
        background: rgba(15, 23, 42, .76);
        border: 1px solid rgba(148, 163, 184, .22);
        font-size: 13px;
        line-height: 1.7;
        color: #dbeafe;
      }
      .manjuxia-renew-actions {
        display: flex;
        gap: 10px;
        margin-top: 12px;
      }
      .manjuxia-renew-actions button {
        flex: 1;
      }
      html.manjuxia-light-theme .manjuxia-account-card,
      body.manjuxia-light-theme .manjuxia-account-card {
        background: rgba(255, 255, 255, .96);
        color: #0f172a;
        border-color: #d8e0eb;
        box-shadow: 0 24px 70px rgba(15, 23, 42, .12);
      }
      html.manjuxia-light-theme .manjuxia-account-card h1,
      body.manjuxia-light-theme .manjuxia-account-card h1 {
        color: #0f766e;
      }
      html.manjuxia-light-theme .manjuxia-account-card .subtitle,
      body.manjuxia-light-theme .manjuxia-account-card .subtitle,
      html.manjuxia-light-theme .manjuxia-account-message,
      body.manjuxia-light-theme .manjuxia-account-message {
        color: #475569;
      }
      html.manjuxia-light-theme .manjuxia-account-field label,
      body.manjuxia-light-theme .manjuxia-account-field label {
        color: #1f2937;
      }
      html.manjuxia-light-theme .manjuxia-account-card input,
      body.manjuxia-light-theme .manjuxia-account-card input {
        background: #ffffff;
        color: #111827;
        border-color: #cbd5e1;
      }
      html.manjuxia-light-theme .manjuxia-account-info,
      body.manjuxia-light-theme .manjuxia-account-info {
        background: #f8fafc;
        border-color: #e2e8f0;
        color: #334155;
      }
    `;
    document.head.appendChild(style);
  }

  function isActivationPage() {
    return /#\/activation(?:\?|$)/.test(location.hash || "") || Boolean(document.querySelector(".activation-container"));
  }

  function formatDateTime(value) {
    if (!value) return "未开通";
    try {
      return new Date(value).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return String(value);
    }
  }

  function renderAccountLoginPanel() {
    if (!isActivationPage()) return;
    const container = document.querySelector(".activation-container");
    if (!container || container.dataset.accountPanel === "1") return;
    const account = window.electronAPI && window.electronAPI.account;
    if (!account) return;
    installAccountLoginStyle();
    container.dataset.accountPanel = "1";
    container.innerHTML = `
      <div class="video-bg-wrapper">
        <video class="video-bg" autoplay loop muted playsinline><source src="./activation-bg.mp4" type="video/mp4"></video>
        <div class="video-overlay"></div>
      </div>
      <section class="manjuxia-account-card">
        <h1>${BRAND_NAME}</h1>
        <p class="subtitle">手机号登录后使用。新账号默认为普通用户，需要到官网充值续费后进入工作台。</p>
        <div class="manjuxia-account-field">
          <label>手机号</label>
          <div class="manjuxia-account-input-row">
            <input class="manjuxia-account-phone" inputmode="numeric" maxlength="11" placeholder="请输入 11 位手机号">
            <button class="secondary manjuxia-send-code" type="button">发送验证码</button>
          </div>
        </div>
        <div class="manjuxia-account-field">
          <label>短信验证码</label>
          <input class="manjuxia-account-code" inputmode="numeric" maxlength="8" placeholder="请输入验证码">
        </div>
        <button class="manjuxia-account-primary manjuxia-login" type="button">登录</button>
        <button class="manjuxia-account-primary secondary manjuxia-open-recharge-top" type="button">官网充值 / 续费</button>
        <p class="manjuxia-account-message"></p>
        <div class="manjuxia-account-info" hidden></div>
      </section>
    `;

    const phoneInput = container.querySelector(".manjuxia-account-phone");
    const codeInput = container.querySelector(".manjuxia-account-code");
    const sendButton = container.querySelector(".manjuxia-send-code");
    const loginButton = container.querySelector(".manjuxia-login");
    const rechargeTopButton = container.querySelector(".manjuxia-open-recharge-top");
    const message = container.querySelector(".manjuxia-account-message");
    const infoBox = container.querySelector(".manjuxia-account-info");
    let countdown = 0;
    let countdownTimer = null;

    const setMessage = (text, type) => {
      message.textContent = text || "";
      message.classList.toggle("error", type === "error");
      message.classList.toggle("success", type === "success");
    };
    const openRechargePage = async () => {
      let url = "https://anyq.site/";
      if (account && typeof account.rechargeUrl === "function") {
        const handoff = await account.rechargeUrl();
        if (handoff && handoff.continueUrl) url = handoff.continueUrl;
        if (handoff && handoff.message && !handoff.success) setMessage(handoff.message, "error");
      }
      const opened = window.electronAPI && typeof window.electronAPI.openExternal === "function"
        ? await window.electronAPI.openExternal(url)
        : false;
      if (opened) setMessage("已打开官网充值页，支付完成后回到这里刷新权限。", "success");
      else setMessage(`请在浏览器打开：${url}`, "error");
    };
    const validPhone = () => /^1[3-9]\d{9}$/.test((phoneInput.value || "").trim());
    const updateSendButton = () => {
      sendButton.disabled = countdown > 0;
      sendButton.textContent = countdown > 0 ? `${countdown} 秒后重发` : "发送验证码";
    };
    const startCountdown = () => {
      countdown = 60;
      clearInterval(countdownTimer);
      updateSendButton();
      countdownTimer = setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) {
          clearInterval(countdownTimer);
          countdown = 0;
        }
        updateSendButton();
      }, 1000);
    };
    const renderInfo = (info, reason) => {
      if (!info) {
        infoBox.hidden = true;
        return;
      }
      infoBox.hidden = false;
      const isActive = Boolean(info.active);
      infoBox.innerHTML = `
        <div>当前账号：${info.phone || "-"}</div>
        <div>权限状态：${isActive ? "会员有效" : "普通用户，暂无软件使用权限"}</div>
        <div>会员到期：${formatDateTime(info.expires_at)}</div>
        <div>剩余额度：${info.energy_balance || 0}</div>
        ${reason && !isActive ? `<div>提示：${reason === "expired" ? "会员已过期，请到官网续费后继续使用。" : "该账号尚未开通会员权限，请到官网选择套餐开通。"}</div>` : ""}
        ${!isActive ? `<div class="manjuxia-renew-actions">
          <button class="manjuxia-open-recharge" type="button">去官网充值续费</button>
          <button class="secondary manjuxia-refresh-account" type="button">我已支付，刷新权限</button>
        </div>` : ""}
      `;
      const rechargeButton = infoBox.querySelector(".manjuxia-open-recharge");
      if (rechargeButton) {
        rechargeButton.addEventListener("click", openRechargePage);
      }
      const refreshButton = infoBox.querySelector(".manjuxia-refresh-account");
      if (refreshButton) {
        refreshButton.addEventListener("click", async () => {
          refreshButton.disabled = true;
          setMessage("正在刷新账号权限...", "");
          const me = await account.me();
          refreshButton.disabled = false;
          if (me && me.info) renderInfo(me.info, me.reason || "");
          else setMessage("刷新失败，请确认已登录", "error");
        });
      }
      setMessage(isActive ? "会员权限有效，正在进入工作台..." : "登录成功，当前为普通用户。需要会员的功能会在执行时提示续费。", "success");
      setTimeout(() => { location.hash = "#/"; }, 500);
    };

    rechargeTopButton.addEventListener("click", openRechargePage);

    sendButton.addEventListener("click", async () => {
      if (!validPhone()) {
        setMessage("请输入正确的手机号", "error");
        return;
      }
      sendButton.disabled = true;
      setMessage("正在发送验证码...", "");
      const result = await account.sendCode(phoneInput.value.trim());
      if (result && result.success) {
        setMessage(result.message || "验证码已发送", "success");
        startCountdown();
        codeInput.focus();
      } else {
        countdown = 0;
        updateSendButton();
        setMessage((result && result.message) || "验证码发送失败", "error");
      }
    });

    loginButton.addEventListener("click", async () => {
      if (!validPhone()) {
        setMessage("请输入正确的手机号", "error");
        return;
      }
      if (!/^\d{4,8}$/.test((codeInput.value || "").trim())) {
        setMessage("请输入短信验证码", "error");
        return;
      }
      loginButton.disabled = true;
      setMessage("正在登录...", "");
      const result = await account.login(phoneInput.value.trim(), codeInput.value.trim());
      loginButton.disabled = false;
      if (!result || !result.success) {
        setMessage((result && result.message) || "登录失败", "error");
        return;
      }
      setMessage(result.active ? "登录成功" : "登录成功，当前为普通用户", "success");
      renderInfo(result, result.active ? "" : "unauthorized_tool");
    });

    account.me().then((result) => {
      if (result && result.info) renderInfo(result.info, result.reason || "");
    }).catch(() => {});
  }

  function run() {
    patchBrandMeta();
    patchTextNodes(document.body);
    patchLogoText();
    ensureThemeToggle();
    ensureAccountFooter();
    installAccountLogoutGuard();
    installMemberButtonGate();
    patchLegacyLogoutDialog();
    renderAccountLoginPanel();
    suppressStartupLoadFailureToasts();
  }

  function openLocalModelConfig() {
    if (typeof window.manjuxiaOpenLocalModelConfig === "function") {
      window.manjuxiaOpenLocalModelConfig();
      return;
    }
    location.hash = "#/settings";
    setTimeout(() => {
      if (typeof window.manjuxiaOpenLocalModelConfig === "function") window.manjuxiaOpenLocalModelConfig();
    }, 450);
  }

  function suppressStartupLoadFailureToasts() {
    document.querySelectorAll(".el-message").forEach((message) => {
      const text = String(message.textContent || "");
      if (!/(?:加载|获取).{0,32}(?:列表|配置).{0,16}失败|bad session token|missing session token|invalid timestamp|timestamp_skew|nonce_reused/i.test(text)) return;
      // These requests populate optional selectors during page mounting. They are
      // retried by the app after the user signs in or navigates to the feature.
      // A startup toast for each selector is noisy and gives users no useful action.
      message.remove();
    });
  }

  function pathForSignature(urlLike) {
    let raw = "";
    if (typeof urlLike === "string") raw = urlLike;
    else if (urlLike && typeof urlLike.url === "string") raw = urlLike.url;
    else raw = String(urlLike || "");
    try {
      if (raw.startsWith("/")) return raw.split("?")[0];
      return new URL(raw).pathname;
    } catch (_) {
      return raw.split("?")[0];
    }
  }

  function isLocalApiRequest(urlLike) {
    let raw = "";
    if (typeof urlLike === "string") raw = urlLike;
    else if (urlLike && typeof urlLike.url === "string") raw = urlLike.url;
    else raw = String(urlLike || "");
    if (raw.startsWith("/api/")) return true;
    try {
      const url = new URL(raw);
      return (url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.pathname.startsWith("/api/");
    } catch (_) {
      return false;
    }
  }

  function requestBodyBytes(body) {
    if (body == null) return new Uint8Array(0);
    if (typeof body === "string") return new TextEncoder().encode(body);
    if (body instanceof Uint8Array) return body;
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    return new Uint8Array(0);
  }

  function randomHex(byteLength) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((n) => n.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, "0")).join("");
  }

  async function hmacSha256Hex(secretHex, message) {
    const keyBytes = new Uint8Array(secretHex.length / 2);
    for (let i = 0; i < keyBytes.length; i += 1) {
      keyBytes[i] = parseInt(secretHex.slice(i * 2, i * 2 + 2), 16);
    }
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    return Array.from(new Uint8Array(sig)).map((n) => n.toString(16).padStart(2, "0")).join("");
  }

  function licenseKeyForSignature() {
    try {
      return localStorage.getItem("license_key") || "anonymous";
    } catch (_) {
      return "anonymous";
    }
  }

  async function signedHeaders(urlLike, init, secretHex) {
    const path = pathForSignature(urlLike);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomHex(16);
    const license = licenseKeyForSignature();
    const bodyHash = await sha256Hex(requestBodyBytes(init && init.body));
    const token = await hmacSha256Hex(secretHex, `${license}|${path}|${timestamp}|${nonce}|${bodyHash}`);
    const headers = new Headers((init && init.headers) || {});
    headers.set("X-Session-License", license);
    headers.set("X-Session-Nonce", nonce);
    headers.set("X-Session-Timestamp", timestamp);
    headers.set("X-Session-Token", token);
    return headers;
  }

  async function cloneErrorText(response) {
    try {
      return await response.clone().text();
    } catch (_) {
      return "";
    }
  }

  function isSessionFailure(response, bodyText) {
    if (!response || response.status !== 403) return false;
    return /bad session token|missing session token|invalid timestamp|timestamp_skew|nonce_reused/i.test(bodyText || "");
  }

  async function waitForSessionSecret(electronAPI, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const secret = await electronAPI.getSessionSecret();
        if (typeof secret === "string" && /^[0-9a-fA-F]{64}$/.test(secret)) {
          return secret.toLowerCase();
        }
      } catch (_) {
        // The backend creates its per-run secret shortly after Electron starts.
      }
      await new Promise((resolve) => setTimeout(resolve, 160));
    }
    return "";
  }

  function isMembershipFailure(response, bodyText) {
    if (!response || ![401, 403].includes(response.status)) return false;
    return /account_required|product_entitlement_required|account_signature_expired|product_expired/i.test(bodyText || "");
  }

  function showMembershipRequired() {
    if (document.getElementById("manjuxia-membership-required")) return;
    const mask = document.createElement("div");
    mask.id = "manjuxia-membership-required";
    mask.innerHTML = `
      <div class="manjuxia-membership-dialog" role="dialog" aria-modal="true">
        <h3>未开通漫剧虾会员</h3>
        <p>当前账号可以浏览工作台。开通或续费漫剧虾会员后，即可使用生成、编辑、导出等功能。</p>
        <div class="manjuxia-membership-actions">
          <button type="button" class="manjuxia-membership-cancel">知道了</button>
          <button type="button" class="manjuxia-membership-recharge">去官网开通</button>
        </div>
      </div>`;
    const style = document.createElement("style");
    style.textContent = `#manjuxia-membership-required{position:fixed;inset:0;z-index:200000;background:rgba(15,23,42,.48);display:grid;place-items:center;padding:20px}.manjuxia-membership-dialog{width:min(420px,calc(100vw - 40px));padding:24px;border-radius:12px;background:#fff!important;color:#172033!important;box-shadow:0 22px 64px rgba(15,23,42,.28)}.manjuxia-membership-dialog *{color:inherit}.manjuxia-membership-dialog h3{margin:0 0 10px;font-size:19px;color:#172033!important;-webkit-text-fill-color:#172033!important}.manjuxia-membership-dialog p{margin:0;color:#536174!important;-webkit-text-fill-color:#536174!important;line-height:1.7}.manjuxia-membership-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.manjuxia-membership-actions button{height:36px;padding:0 14px;border:1px solid #cbd5e1;border-radius:7px;background:#fff!important;color:#334155!important;-webkit-text-fill-color:#334155!important;cursor:pointer}.manjuxia-membership-recharge{background:#0f766e!important;border-color:#0f766e!important;color:#fff!important;-webkit-text-fill-color:#fff!important}`;
    mask.appendChild(style);
    const close = () => {
      document.removeEventListener("keydown", onKey, true);
      mask.remove();
    };
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey, true);
    mask.addEventListener("mousedown", (event) => {
      if (event.target === mask) close();
    });
    mask.querySelector(".manjuxia-membership-cancel").addEventListener("click", close);
    mask.querySelector(".manjuxia-membership-recharge").addEventListener("click", async () => {
      const account = window.electronAPI && window.electronAPI.account;
      const handoff = account && typeof account.rechargeUrl === "function" ? await account.rechargeUrl() : null;
      const url = handoff && handoff.continueUrl ? handoff.continueUrl : "https://anyq.site/";
      if (window.electronAPI && typeof window.electronAPI.openExternal === "function") await window.electronAPI.openExternal(url);
    });
    document.body.appendChild(mask);
  }

  function showGuestTemplatePreview() {
    if (document.getElementById("manjuxia-template-preview")) return;
    const mask = document.createElement("div");
    mask.id = "manjuxia-template-preview";
    mask.innerHTML = `
      <div class="manjuxia-template-preview-dialog" role="dialog" aria-modal="true" aria-label="精选提示词模板预览">
        <div class="manjuxia-template-preview-head"><div><h3>精选提示词模板</h3><p>先看看漫剧虾如何把小说变成可制作的漫剧素材。</p></div><button type="button" class="manjuxia-template-preview-close" aria-label="关闭">×</button></div>
        <div class="manjuxia-template-preview-list">
          <article><strong>小说转剧本 · 通用情景剧</strong><pre>目标：保留关键剧情与台词，按场景拆分。\n输出：场景头、人物动作、对白、情绪转折。</pre></article>
          <article><strong>人物提取 · 角色资产卡</strong><pre>人物：姓名、年龄、外貌锚点、服装、情绪。\n用于后续生成角色宫格图，保持人物一致性。</pre></article>
          <article><strong>即梦 2.0 分镜 · 慢节奏通用</strong><pre>【内/外 场景 · 时间 · 镜号N · 秒数】\n成片提示词：运镜、动作、光影、环境声、台词。\n结尾状态：姿态、情绪、朝向、持有道具。</pre></article>
        </div>
        <div class="manjuxia-template-preview-actions"><button type="button" class="manjuxia-template-preview-later">继续浏览</button><button type="button" class="manjuxia-template-preview-use">开通后使用完整模板</button></div>
      </div>`;
    const style = document.createElement("style");
    style.textContent = `#manjuxia-template-preview{position:fixed;inset:0;z-index:200001;background:rgba(15,23,42,.48);display:grid;place-items:center;padding:20px}.manjuxia-template-preview-dialog{width:min(650px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto;padding:24px;border-radius:12px;background:#fff!important;color:#172033!important;box-shadow:0 22px 64px rgba(15,23,42,.28)}.manjuxia-template-preview-dialog *{box-sizing:border-box}.manjuxia-template-preview-head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:16px}.manjuxia-template-preview-head h3{margin:0;color:#172033!important;font-size:19px}.manjuxia-template-preview-head p{margin:7px 0 0;color:#526175!important}.manjuxia-template-preview-close{width:30px;height:30px;border:0;background:#f1f5f9!important;color:#334155!important;border-radius:6px;font-size:22px;line-height:1;cursor:pointer}.manjuxia-template-preview-list{display:grid;gap:12px;margin-top:16px}.manjuxia-template-preview-list article{border:1px solid #dbe5f0;border-radius:8px;padding:14px;background:#f8fafc}.manjuxia-template-preview-list strong{display:block;color:#0f172a!important;font-size:14px}.manjuxia-template-preview-list pre{margin:9px 0 0;white-space:pre-wrap;font:13px/1.65 ui-monospace,Consolas,monospace;color:#334155!important}.manjuxia-template-preview-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.manjuxia-template-preview-actions button{height:36px;padding:0 14px;border:1px solid #cbd5e1;border-radius:7px;background:#fff!important;color:#334155!important;cursor:pointer}.manjuxia-template-preview-use{background:#0f766e!important;border-color:#0f766e!important;color:#fff!important}`;
    mask.appendChild(style);
    const close = () => mask.remove();
    mask.querySelector(".manjuxia-template-preview-close").addEventListener("click", close);
    mask.querySelector(".manjuxia-template-preview-later").addEventListener("click", close);
    mask.querySelector(".manjuxia-template-preview-use").addEventListener("click", () => {
      close();
      showMembershipRequired();
    });
    document.body.appendChild(mask);
  }

  function installGuestTemplatePreview() {
    if (window.__manjuxiaGuestTemplatePreviewInstalled) return;
    window.__manjuxiaGuestTemplatePreviewInstalled = true;
    document.addEventListener("click", (event) => {
      const tab = event.target && event.target.closest && event.target.closest('[role="tab"], .el-tabs__item');
      if (!tab || String(tab.textContent || "").trim() !== "提示词模板") return;
      const info = window.__manjuxiaAccountInfo;
      if (info && info.active) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showGuestTemplatePreview();
    }, true);
  }

  function showGuestExtractionPreview(kind) {
    if (document.getElementById("manjuxia-extraction-preview")) return;
    const samples = {
      "人物": ["林晚：二十多岁女性，黑长发，素色睡衣，神情警惕", "顾沉舟：三十岁男性，深色西装，克制冷峻，手持旧手机"],
      "场景": ["顾家客厅：夜，落地窗外暴雨，冷色大理石和水晶吊灯", "医院走廊：深夜，顶灯惨白，尽头安全出口泛着绿光"],
      "道具": ["旧婚戒：磨损银色金属，内圈有模糊刻字", "录音笔：黑色磨砂外壳，红色指示灯闪烁"]
    };
    const rows = (samples[kind] || samples["人物"]).map((item) => `<li>${item}</li>`).join("");
    const mask = document.createElement("div");
    mask.id = "manjuxia-extraction-preview";
    mask.innerHTML = `<div class="manjuxia-template-preview-dialog" role="dialog" aria-modal="true" aria-label="${kind}提取效果预览"><div class="manjuxia-template-preview-head"><div><h3>${kind}提取效果预览</h3><p>漫剧虾会先整理可复用资产，再用于生图和分镜保持一致。</p></div><button type="button" class="manjuxia-template-preview-close" aria-label="关闭">×</button></div><div class="manjuxia-extraction-preview-body"><strong>示例识别结果</strong><ul>${rows}</ul></div><div class="manjuxia-template-preview-actions"><button type="button" class="manjuxia-template-preview-later">继续浏览</button><button type="button" class="manjuxia-template-preview-use">开通后开始提取</button></div></div>`;
    const style = document.createElement("style");
    style.textContent = `#manjuxia-extraction-preview{position:fixed;inset:0;z-index:200001;background:rgba(15,23,42,.48);display:grid;place-items:center;padding:20px}.manjuxia-extraction-preview .manjuxia-template-preview-dialog{width:min(650px,calc(100vw - 40px));padding:24px;border-radius:12px;background:#fff!important;color:#172033!important;box-shadow:0 22px 64px rgba(15,23,42,.28)}.manjuxia-extraction-preview .manjuxia-template-preview-head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:16px}.manjuxia-extraction-preview h3{margin:0;color:#172033!important;font-size:19px}.manjuxia-extraction-preview p{margin:7px 0 0;color:#526175!important}.manjuxia-extraction-preview-close{width:30px;height:30px;border:0;background:#f1f5f9!important;color:#334155!important;border-radius:6px;font-size:22px;line-height:1;cursor:pointer}.manjuxia-extraction-preview-body{margin-top:16px;border:1px solid #dbe5f0;border-radius:8px;padding:14px;background:#f8fafc;color:#172033}.manjuxia-extraction-preview-body strong{color:#0f172a}.manjuxia-extraction-preview-body ul{margin:10px 0 0;padding-left:20px;color:#334155;line-height:1.8}.manjuxia-extraction-preview .manjuxia-template-preview-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.manjuxia-extraction-preview .manjuxia-template-preview-actions button{height:36px;padding:0 14px;border:1px solid #cbd5e1;border-radius:7px;background:#fff!important;color:#334155!important;cursor:pointer}.manjuxia-extraction-preview .manjuxia-template-preview-use{background:#0f766e!important;border-color:#0f766e!important;color:#fff!important}`;
    mask.appendChild(style);
    const close = () => mask.remove();
    mask.querySelector(".manjuxia-template-preview-close").addEventListener("click", close);
    mask.querySelector(".manjuxia-template-preview-later").addEventListener("click", close);
    mask.querySelector(".manjuxia-template-preview-use").addEventListener("click", () => {
      close();
      showMembershipRequired();
    });
    document.body.appendChild(mask);
  }

  function installGuestFeaturePreviews() {
    if (window.__manjuxiaGuestFeaturePreviewsInstalled) return;
    window.__manjuxiaGuestFeaturePreviewsInstalled = true;
    document.addEventListener("click", (event) => {
      const button = event.target && event.target.closest && event.target.closest("button");
      if (!button || !isGuestPreviewButton(button)) return;
      const info = window.__manjuxiaAccountInfo;
      if (info && info.active) return;
      const label = String(button.textContent || "").replace(/\s+/g, "");
      event.preventDefault();
      event.stopImmediatePropagation();
      if (/配置分镜模板/.test(label)) showGuestTemplatePreview();
      else if (/提取场景/.test(label)) showGuestExtractionPreview("场景");
      else if (/提取道具/.test(label)) showGuestExtractionPreview("道具");
      else showGuestExtractionPreview("人物");
    }, true);
  }

  function installSessionFetchRepair() {
    if (window.__manjuxiaSessionFetchRepairInstalled) return;
    const nativeFetch = window.__manjuxiaNativeFetch || window.fetch.bind(window);
    const electronAPI = window.electronAPI;
    if (!electronAPI || typeof electronAPI.getSessionSecret !== "function") return;
    window.__manjuxiaSessionFetchRepairInstalled = true;

    window.fetch = async function manjuxiaSignedFetch(input, init) {
      if (!isLocalApiRequest(input)) return nativeFetch(input, init);
      const secret = await waitForSessionSecret(electronAPI);
      if (!secret) {
        // Do not send an unsigned selector request while the local engine is
        // starting. The UI can retry normally instead of caching an empty list.
        throw new Error("本地创作引擎正在启动，请稍后重试");
      }
      const firstInit = { ...(init || {}), headers: await signedHeaders(input, init || {}, secret.toLowerCase()) };
      const first = await nativeFetch(input, firstInit);
      const firstText = await cloneErrorText(first);
      if (!isSessionFailure(first, firstText)) return first;

      const fresh = await waitForSessionSecret(electronAPI, 3000) || secret;
      const secondInit = { ...(init || {}), headers: await signedHeaders(input, init || {}, String(fresh).toLowerCase()) };
      console.warn("[manjuxia-session] 本地 session token 已刷新并重试:", pathForSignature(input));
      const second = await nativeFetch(input, secondInit);
      const secondText = await cloneErrorText(second);
      return second;
    };
  }

  installSessionFetchRepair();

  window.addEventListener("DOMContentLoaded", () => {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        run();
      });
    };
    run();
    installSessionFetchRepair();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
