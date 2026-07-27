(function () {
  "use strict";

  var electron = window.electronAPI;
  var update = electron && electron.update;
  if (!update || typeof update.onOptionalUpdateAvailable !== "function") return;

  var notice = null;
  var current = null;
  var state = "available";
  var errorMessage = "";
  var checking = false;

  function isMandatory(payload) {
    return !!(payload && (payload.update_level === "force" || payload.force_update === true || payload.mandatory === true));
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function installStyle() {
    if (document.getElementById("manjuxia-update-notice-style")) return;
    var style = element("style");
    style.id = "manjuxia-update-notice-style";
    style.textContent = [
      ".manjuxia-update-notice{position:fixed;left:236px;bottom:20px;width:310px;z-index:5000;background:#fff;border:1px solid #d9e2ec;border-radius:10px;box-shadow:0 8px 28px rgba(15,23,42,.18);color:#172033;font:14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif}",
      ".manjuxia-update-notice__head{display:flex;align-items:center;gap:8px;padding:12px 14px 6px;font-weight:600}",
      ".manjuxia-update-notice__icon{color:#1687d9;font-size:16px}",
      ".manjuxia-update-notice__close{margin-left:auto;border:0;background:transparent;color:#64748b;font-size:18px;cursor:pointer;line-height:1;padding:0 2px}",
      ".manjuxia-update-notice__body{padding:0 14px 10px;color:#475569}",
      ".manjuxia-update-notice__version{color:#0f172a;font-weight:600}",
      ".manjuxia-update-notice__notes{display:block;margin-top:4px;max-height:42px;overflow:hidden;color:#64748b;white-space:pre-wrap}",
      ".manjuxia-update-notice__actions{display:flex;justify-content:flex-end;gap:8px;padding:8px 14px 12px;border-top:1px solid #eef2f7}",
      ".manjuxia-update-notice__button{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:5px 10px;color:#475569;cursor:pointer}",
      ".manjuxia-update-notice__button--primary{border-color:#1687d9;background:#1687d9;color:#fff}",
      ".manjuxia-update-notice__progress{height:6px;margin:2px 14px 10px;border-radius:6px;background:#e8eef5;overflow:hidden}",
      ".manjuxia-update-notice__progress>i{display:block;height:100%;width:0;background:#1687d9;transition:width .2s ease}",
      ".manjuxia-update-notice__status{padding:0 14px 10px;color:#64748b;font-size:12px}",
      ".manjuxia-update-notice__error{padding:0 14px 10px;color:#c2410c;font-size:12px;word-break:break-word}"
    ].join("");
    document.head.appendChild(style);
  }

  function closeNotice() {
    if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
    notice = null;
    current = null;
  }

  function render() {
    if (!current) return;
    installStyle();
    if (!notice) {
      notice = element("section", "manjuxia-update-notice");
      notice.setAttribute("role", "status");
      document.body.appendChild(notice);
    }
    notice.textContent = "";

    var head = element("div", "manjuxia-update-notice__head");
    head.appendChild(element("span", "manjuxia-update-notice__icon", "↻"));
    var heading = state === "checking" ? "正在检查更新"
      : state === "latest" ? "更新状态"
      : state === "installing" ? "正在准备安装"
      : "发现新版本";
    head.appendChild(element("span", "", heading));
    var close = element("button", "manjuxia-update-notice__close", "×");
    close.type = "button";
    close.title = "稍后提醒";
    close.addEventListener("click", closeNotice);
    head.appendChild(close);
    notice.appendChild(head);

    var body = element("div", "manjuxia-update-notice__body");
    var shownVersion = state === "latest" ? (current.currentVersion || current.version) : current.version;
    var version = element("span", "manjuxia-update-notice__version", "v" + String(shownVersion || ""));
    body.appendChild(version);
    if (current.notes || current.description) {
      body.appendChild(element("span", "manjuxia-update-notice__notes", current.notes || current.description));
    }
    notice.appendChild(body);

    if (state === "checking") {
      notice.appendChild(element("div", "manjuxia-update-notice__status", "正在向官方更新服务检查已签名版本…"));
      return;
    }

    if (state === "latest") {
      notice.appendChild(element("div", "manjuxia-update-notice__status", "当前已是最新版本。"));
      var closeActions = element("div", "manjuxia-update-notice__actions");
      var closeAction = element("button", "manjuxia-update-notice__button manjuxia-update-notice__button--primary", "关闭");
      closeAction.type = "button";
      closeAction.addEventListener("click", closeNotice);
      closeActions.appendChild(closeAction);
      notice.appendChild(closeActions);
      return;
    }

    if (state === "downloading") {
      var progress = element("div", "manjuxia-update-notice__progress");
      var bar = element("i");
      bar.style.width = String(current.__percent || 0) + "%";
      progress.appendChild(bar);
      notice.appendChild(progress);
      notice.appendChild(element("div", "manjuxia-update-notice__status", "正在下载更新 " + String(current.__percent || 0) + "%" + "，可继续使用软件。"));
      return;
    }

    if (state === "installing") {
      var installedProgress = element("div", "manjuxia-update-notice__progress");
      var installedBar = element("i");
      installedBar.style.width = "100%";
      installedProgress.appendChild(installedBar);
      notice.appendChild(installedProgress);
      notice.appendChild(element("div", "manjuxia-update-notice__status", "安装包已校验，正在启动安装程序。应用将自动退出，请稍候…"));
      return;
    }

    if (state === "error") {
      notice.appendChild(element("div", "manjuxia-update-notice__error", errorMessage || "更新失败，请稍后重试"));
    }

    var actions = element("div", "manjuxia-update-notice__actions");
    var later = element("button", "manjuxia-update-notice__button", "稍后");
    later.type = "button";
    later.addEventListener("click", closeNotice);
    actions.appendChild(later);
    var action = element("button", "manjuxia-update-notice__button manjuxia-update-notice__button--primary", state === "error" ? "重试更新" : "下载并安装");
    action.type = "button";
    action.addEventListener("click", startDownload);
    actions.appendChild(action);
    notice.appendChild(actions);
  }

  function showOptional(payload) {
    if (!payload || isMandatory(payload)) return;
    current = Object.assign({}, payload, { __percent: 0 });
    state = "available";
    errorMessage = "";
    render();
    window.dispatchEvent(new window.CustomEvent("manjuxia:optional-update", { detail: payload }));
  }

  function startDownload() {
    if (!current || state === "downloading" || state === "installing") return;
    state = "downloading";
    errorMessage = "";
    render();
    Promise.resolve(update.startDownload()).then(function (result) {
      if (result && result.success === false) throw new Error(result.error || "更新下载失败");
    }).catch(function (error) {
      state = "error";
      errorMessage = error && error.message ? error.message : String(error);
      render();
    });
  }

  async function checkFromVersionLabel() {
    if (checking || typeof update.check !== "function") return;
    checking = true;
    current = { version: "", currentVersion: "" };
    state = "checking";
    errorMessage = "";
    render();
    try {
      var result = await update.check();
      if (result && result.updateAvailable) {
        if (!isMandatory(result)) showOptional(result);
        return;
      }
      current = {
        version: result && result.version ? result.version : "",
        currentVersion: result && result.currentVersion ? result.currentVersion : ""
      };
      state = "latest";
      render();
    } catch (error) {
      state = "error";
      errorMessage = error && error.message ? error.message : "更新检查失败，请稍后重试";
      render();
    } finally {
      checking = false;
    }
  }

  update.onOptionalUpdateAvailable(showOptional);

  if (typeof update.onUpdateProgress === "function") {
    update.onUpdateProgress(function (payload) {
      if (!current || state !== "downloading") return;
      current.__percent = Math.max(0, Math.min(100, Number(payload && payload.percent) || 0));
      render();
    });
  }
  if (typeof update.onUpdateDownloaded === "function") {
    update.onUpdateDownloaded(function () {
      if (current && state === "downloading") {
        state = "installing";
        current.__percent = 100;
        render();
      }
    });
  }
  if (typeof update.onUpdateError === "function") {
    update.onUpdateError(function (payload) {
      if (!current || state !== "downloading") return;
      state = "error";
      errorMessage = payload && payload.error ? payload.error : "更新失败，请稍后重试";
      render();
    });
  }

  document.addEventListener("click", function (event) {
    var target = event.target && typeof event.target.closest === "function" ? event.target.closest(".version-text") : null;
    if (!target) return;
    // The old Vue bundle uses this label to open a static v3 changelog. The
    // capture handler replaces it with a signed, native update check.
    event.preventDefault();
    event.stopImmediatePropagation();
    void checkFromVersionLabel();
  }, true);

  window.__manjuxiaUpdateNotice = {
    showOptional: showOptional,
    close: closeNotice,
    check: checkFromVersionLabel
  };
}());
