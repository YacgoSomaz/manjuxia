(() => {
  "use strict";

  const api = window.electronAPI && window.electronAPI.account;
  if (!api || typeof api.sendCode !== "function" || typeof api.login !== "function") return;

  const notify = (message, type = "error") => {
    const node = document.querySelector("#wanshan-account-login-message");
    if (!node) return;
    node.textContent = message || "";
    node.dataset.type = type;
  };

  const install = () => {
    if (!location.hash.startsWith("#/activation") || document.querySelector("#wanshan-account-login")) return;
    const root = document.querySelector("#app");
    if (!root || !root.querySelector("input")) return;
    root.innerHTML = `
      <main id="wanshan-account-login" class="wanshan-login-page">
        <section class="wanshan-login-card">
          <div class="wanshan-login-mark">漫剧虾</div>
          <h1>账号登录</h1>
          <p>使用手机号验证码登录。账号权益、官方算力和积分以服务端为准。</p>
          <label>手机号<input id="wanshan-login-phone" inputmode="numeric" maxlength="11" placeholder="请输入手机号"></label>
          <label>短信验证码<div class="wanshan-code-row"><input id="wanshan-login-code" inputmode="numeric" maxlength="8" placeholder="请输入验证码"><button id="wanshan-send-code" type="button">发送验证码</button></div></label>
          <div id="wanshan-account-login-message" role="status"></div>
          <button id="wanshan-login-submit" class="wanshan-login-submit" type="button">登录</button>
        </section>
      </main>`;
    const phone = document.querySelector("#wanshan-login-phone");
    const code = document.querySelector("#wanshan-login-code");
    const send = document.querySelector("#wanshan-send-code");
    const submit = document.querySelector("#wanshan-login-submit");
    const validPhone = () => /^1\d{10}$/.test(phone.value.trim());
    const busy = (button, value, text) => { button.disabled = value; if (text) button.textContent = text; };
    send.addEventListener("click", async () => {
      if (!validPhone()) return notify("请输入正确的 11 位手机号");
      busy(send, true, "发送中...");
      try {
        const result = await api.sendCode(phone.value.trim());
        if (!result || !result.success) {
          busy(send, false, "发送验证码");
          return notify((result && result.message) || "验证码发送失败");
        }
        notify("验证码已发送，请查收短信", "success");
        let left = 60;
        const timer = setInterval(() => { send.textContent = `${left--} 秒后重发`; if (left < 0) { clearInterval(timer); busy(send, false, "发送验证码"); } }, 1000);
      } catch (error) { notify(`验证码发送失败：${error.message || error}`); busy(send, false, "发送验证码"); }
    });
    submit.addEventListener("click", async () => {
      if (!validPhone()) return notify("请输入正确的 11 位手机号");
      if (!code.value.trim()) return notify("请输入短信验证码");
      busy(submit, true, "登录中...");
      try {
        const result = await api.login(phone.value.trim(), code.value.trim());
        if (!result || !result.success) return notify((result && result.message) || "登录失败");
        notify("登录成功，正在进入工作台...", "success");
        location.hash = "#/";
        setTimeout(() => location.reload(), 180);
      } catch (error) { notify(`登录失败：${error.message || error}`); }
      finally { busy(submit, false, "登录"); }
    });
  };

  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", install);
  install();
})();
