(function () {
  const MODAL_ID = "manjuxia-official-ai-modal";
  const STYLE_ID = "manjuxia-official-ai-style";
  // Stable local sentinel ids.  The backend includes these capability rows in
  // its first configuration response, so the production selector never has
  // to wait for a remote catalog before it can render an official choice.
  const OFFICIAL_TEXT_CONFIG_ID = "-900001";
  const OFFICIAL_IMAGE_CONFIG_ID = "-900002";
  const OFFICIAL_SEEDREAM2_CONFIG_ID = "-900003";
  const OFFICIAL_SEEDANCE2_VIDEO_CONFIG_ID = "-900004";
  const OFFICIAL_MINIMAX_H3_VIDEO_CONFIG_ID = "-900005";
  const OFFICIAL_DEEPSEEK_V41_CONFIG_ID = "-900006";
  const OFFICIAL_TEXT_CONFIG_PREFIX = "official:text:";
  const OFFICIAL_IMAGE_TASK_TYPE = "comic_image";
  let pollTimer = null;
  let currentJobId = "";
  let currentIdempotencyKey = "";
  let currentTaskType = OFFICIAL_IMAGE_TASK_TYPE;
  let currentTaskKind = "image";
  let imageResolver = null;
  let previousFetch = null;
  const officialTaskTypes = new Map();

  function api() {
    return window.electronAPI && window.electronAPI.officialAi;
  }

  function node(tag, props = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "text") el.textContent = value;
      else if (key === "className") el.className = value;
      else if (key === "onclick") el.addEventListener("click", value);
      else if (key === "disabled") el.disabled = Boolean(value);
      else el.setAttribute(key, value);
    }
    for (const child of children) el.append(child);
    return el;
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:2147483000;background:rgba(4,10,24,.68);display:grid;place-items:center;padding:20px}
      .oai-dialog{width:min(680px,calc(100vw - 36px));max-height:calc(100vh - 44px);overflow:auto;background:#101a35;border:1px solid #3d77b8;border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.45);color:#edf5ff;font-family:"Microsoft YaHei",sans-serif}
      .oai-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(150,190,240,.18)}
      .oai-head strong{font-size:18px}.oai-close{border:0;background:transparent;color:#b8c9e3;font-size:22px;cursor:pointer;padding:2px 6px}.oai-body{padding:18px 20px}
      .oai-source{display:flex;gap:8px;margin-bottom:16px}.oai-source button,.oai-actions button{border:1px solid #3d77b8;background:#16274a;color:#edf5ff;border-radius:7px;padding:9px 14px;cursor:pointer}.oai-source button.active,.oai-actions button.primary{background:#27bfd0;color:#061226;border-color:#27bfd0;font-weight:700}
      .oai-copy{margin:0 0 14px;color:#b8c9e3;font-size:13px;line-height:1.65}.oai-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 16px}.oai-meta div{padding:10px;background:#0b1530;border:1px solid rgba(130,175,230,.18);border-radius:7px}.oai-meta small{display:block;color:#94abca;font-size:11px}.oai-meta b{display:block;margin-top:4px;color:#f2f7ff;font-size:14px;word-break:break-word}.oai-text{width:100%;min-height:180px;resize:vertical;border:1px solid #385c8e;border-radius:8px;background:#09142d;color:#f4f8ff;padding:12px;line-height:1.6;font:inherit}.oai-text::placeholder{color:#7e95b5}.oai-status{min-height:24px;margin:12px 0;color:#a7c6e8;font-size:13px}.oai-status.error{color:#ffb4b4}.oai-status.ok{color:#91e0b0}.oai-output{display:none;max-height:300px;overflow:auto;margin:12px 0;padding:12px;border:1px solid rgba(130,175,230,.24);border-radius:8px;background:#09142d;color:#eaf3ff;font:13px/1.65 "Microsoft YaHei",sans-serif}.oai-output-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.oai-output-card{display:flex;flex-direction:column;gap:6px;color:#c9dcf5}.oai-output-card img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:7px;background:#172744}.oai-output-card a{color:#8de9f0;font-size:12px}.oai-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.oai-note{color:#8198b8;font-size:12px;margin-top:14px;line-height:1.55}
      @media(max-width:520px){.oai-meta{grid-template-columns:1fr}.oai-body{padding:14px}.oai-head{padding:14px}}
    `;
    style.textContent += `
      .oai-image-wrap{position:relative;width:100%;aspect-ratio:1;border-radius:7px;background:#172744;overflow:hidden;display:grid;place-items:center}
      .oai-image-wrap img{display:block;width:100%;height:100%;object-fit:contain}
      .oai-image-placeholder{position:absolute;color:#a9bbd4;font-size:12px}
      .oai-image-wrap.is-error{border:1px solid #c66a6a}
      .oai-image-wrap.is-error .oai-image-placeholder{color:#ffb4b4}
      .oai-output-card button{border:1px solid #3d77b8;background:#16274a;color:#edf5ff;border-radius:6px;padding:6px 9px;cursor:pointer}
       .oai-text-output{white-space:pre-wrap;max-height:360px;overflow:auto;padding:12px;border-radius:7px;background:#09142d;color:#edf5ff;line-height:1.7}
       .oai-operation-progress{position:fixed;z-index:2147482990;right:22px;bottom:22px;width:min(350px,calc(100vw - 44px));padding:13px 15px;border:1px solid #2d8db6;border-radius:10px;background:#101a35;box-shadow:0 15px 38px rgba(0,0,0,.38);color:#edf5ff;font:13px/1.45 "Microsoft YaHei",sans-serif}.oai-operation-progress strong{display:block;color:#84edf5;font-size:14px}.oai-operation-progress-copy{display:block;margin-top:4px;color:#c6d8f0}.oai-operation-progress-track{height:5px;overflow:hidden;margin-top:10px;border-radius:999px;background:#213253}.oai-operation-progress-bar{display:block;width:3%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#53b7ff,#17d4c8);transition:width .35s ease}.oai-operation-progress.is-error{border-color:#bf5c70}.oai-operation-progress.is-error .oai-operation-progress-bar{background:#e15d70}
      /* The storyboard body already contains the complete scene description.
         Keep its action row, but do not repeat that long summary above it. */
      .section-card .section-header .section-title,.section-card .section-header .section-scene,.section-card .section-header .chain-tooltip{display:none!important}
      #manjuxia-official-video-progress{position:fixed;right:22px;bottom:22px;z-index:2147482991;display:flex;align-items:center;gap:10px;max-width:min(480px,calc(100vw - 44px));padding:12px 15px;border:1px solid #2d8db6;border-radius:10px;background:#101a35;box-shadow:0 15px 38px rgba(0,0,0,.38);color:#d9ebff;font:13px/1.45 "Microsoft YaHei",sans-serif}.mjx-video-spinner{width:16px;height:16px;flex:0 0 16px;border:2px solid rgba(104,198,255,.28);border-top-color:#57c8ff;border-radius:50%;animation:mjx-video-spin .8s linear infinite}@keyframes mjx-video-spin{to{transform:rotate(360deg)}}
      .el-tag.mjx-video-active{display:inline-flex;align-items:center;gap:6px;border-color:#4ca9e8!important;background:rgba(61,137,218,.17)!important;color:#8bd6ff!important}.mjx-video-tag-spinner{width:11px;height:11px;border:2px solid rgba(139,214,255,.3);border-top-color:#8bd6ff;border-radius:50%;animation:mjx-video-spin .8s linear infinite}.mjx-video-live-copy{display:flex;align-items:center;min-height:34px;margin:0 0 12px;padding:0 14px;border:1px solid rgba(76,169,232,.42);border-radius:7px;background:rgba(36,92,151,.16);color:#8bd6ff;font-size:12px;white-space:nowrap}.section-header .mjx-video-header-status{display:flex;align-items:center;gap:10px;min-width:0;margin-left:16px;margin-right:auto;white-space:nowrap}.section-header .mjx-video-header-status .mjx-video-live-copy{display:inline-flex;min-height:0;margin:0;padding:0;border:0;background:transparent;font-size:12px;color:#8bd6ff}
    `;
    document.head.append(style);
  }

  // Storage is an implementation detail. Keep generation progress phrased in
  // user-facing terms even though the bundled video view writes its own logs.
  function hideInternalStorageTerms(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const replacements = [
      ["⏳ NewAPI 中转生成中（章节图片、视频、音频素材已走临时 OSS）", "⏳ NewAPI 正在准备参考素材"],
      ["临时 OSS", "临时素材"],
    ];
    let textNode;
    while ((textNode = walker.nextNode())) {
      let text = textNode.nodeValue || "";
      for (const [from, to] of replacements) text = text.replaceAll(from, to);
      if (text !== textNode.nodeValue) textNode.nodeValue = text;
    }
  }

  function installUserFacingVideoLogLabels() {
    const observe = () => {
      hideInternalStorageTerms();
      if (!document.documentElement || window.__manjuxiaVideoLogObserver) return;
      const observer = new MutationObserver(() => hideInternalStorageTerms());
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      window.__manjuxiaVideoLogObserver = observer;
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observe, { once: true });
    else observe();
  }

  // The bundled video view only renders the static word “生成中”.  Keep a
  // small, non-blocking live indicator visible while any storyboard remains
  // in that state, so users can distinguish an active upstream job from a
  // stalled screen and see elapsed time without opening logs.
  function installOfficialVideoProgressFeedback() {
    const id = "manjuxia-official-video-progress";
    let startedAt = 0;
    let ticker = null;
    const isGenerating = () => Array.from(document.querySelectorAll("body *")).some((element) => {
      if (element.children.length) return false;
      return String(element.textContent || "").trim() === "生成中";
    });
    const update = () => {
      const active = isGenerating();
      let panel = document.getElementById(id);
      if (!active) {
        startedAt = 0;
        if (panel) panel.remove();
        return;
      }
      if (!startedAt) startedAt = Date.now();
      if (!panel) {
        panel = document.createElement("div");
        panel.id = id;
        panel.innerHTML = '<span class="mjx-video-spinner" aria-hidden="true"></span><span></span>';
        document.body.appendChild(panel);
      }
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const minutes = Math.floor(elapsed / 60);
      const seconds = String(elapsed % 60).padStart(2, "0");
      panel.querySelector("span:last-child").textContent = `视频已提交上游，正在排队或渲染 · 已等待 ${minutes}:${seconds} · 最长等待 30 分钟`;
    };
    const start = () => {
      if (ticker) return;
      const observer = new MutationObserver(update);
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      ticker = setInterval(update, 1000);
      update();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }

  // This deliberately touches only Element Plus status tags once per second.
  // It does not observe the DOM, so updating its own elapsed-time label can
  // never create the renderer-loop that a broad MutationObserver caused.
  function installLightweightVideoProgressFeedback() {
    const refresh = () => {
      const statusTags = Array.from(document.querySelectorAll(".el-tag"))
        .filter((tag) => /视频状态/.test(String(tag.parentElement && tag.parentElement.textContent || "")));
      statusTags.forEach((tag) => {
        const isActive = String(tag.textContent || "").replace(/\s+/g, "").startsWith("生成中");
        const host = tag.parentElement;
        if (!host) return;
        const card = tag.closest(".section-card");
        const anchor = card && card.querySelector(".section-header");
        // The status belongs in the same header row: title → status → action.
        // Keep the existing Refresh/failure controls in the moved row.
        host.classList.add("mjx-video-header-status");
        if (anchor && host.parentElement !== anchor) {
          const action = anchor.querySelector("button");
          if (action) anchor.insertBefore(host, action);
          else anchor.appendChild(host);
        }
        let copy = host.querySelector(":scope > .mjx-video-live-copy") || (card && card.querySelector(":scope > .mjx-video-live-copy"));
        if (copy && copy.parentElement !== host) host.insertBefore(copy, tag.nextSibling);
        if (!isActive) {
          tag.classList.remove("mjx-video-active");
          tag.querySelector(".mjx-video-tag-spinner")?.remove();
          copy?.remove();
          return;
        }
        tag.classList.add("mjx-video-active");
        if (!tag.dataset.mjxVideoStartedAt) tag.dataset.mjxVideoStartedAt = String(Date.now());
        if (!tag.querySelector(".mjx-video-tag-spinner")) {
          const spinner = document.createElement("i");
          spinner.className = "mjx-video-tag-spinner";
          spinner.setAttribute("aria-hidden", "true");
          tag.prepend(spinner);
        }
        if (!copy) {
          copy = document.createElement("span");
          copy.className = "mjx-video-live-copy";
          host.insertBefore(copy, tag.nextSibling);
        }
        const elapsed = Math.max(0, Math.floor((Date.now() - Number(tag.dataset.mjxVideoStartedAt || Date.now())) / 1000));
        copy.textContent = `已提交上游，排队/渲染中 · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} · 最长 30 分钟`;
      });
    };
    refresh();
    window.setInterval(refresh, 1000);
  }

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
  }

  function createIdempotencyKey() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 3) | 8;
      return value.toString(16);
    });
  }

  function closeModal(resolveCancel = true) {
    stopPolling();
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.remove();
    if (resolveCancel && imageResolver) {
      const resolve = imageResolver;
      imageResolver = null;
      resolve({ ok: false, code: "cancelled", message: "已取消图片生成" });
    }
  }

  function setStatus(modal, text, type = "") {
    const status = modal && modal.querySelector(".oai-status");
    if (!status) return;
    status.textContent = text || "";
    status.className = `oai-status ${type}`.trim();
  }

  function getResultAssets(job) {
    if (!job) return [];
    const raw = [];
    const seenNodes = new Set();
    const collect = (value, depth = 0) => {
      if (depth > 5 || value == null) return;
      if (typeof value === "string") {
        if (/^https?:\/\//i.test(value)) raw.push(value);
        return;
      }
      if (typeof value !== "object" || seenNodes.has(value)) return;
      seenNodes.add(value);
      if (Array.isArray(value)) { value.forEach((item) => collect(item, depth + 1)); return; }
      const direct = value.stable_url || value.display_url || value.download_url || value.image_url || value.result_url || value.output_url || value.url || value.uri || value.href;
      if (typeof direct === "string" && direct.trim()) raw.push(value);
      ["result_assets", "assets", "images", "image", "image_urls", "urls", "output", "outputs", "artifacts", "files", "result", "data"].forEach((key) => collect(value[key], depth + 1));
    };
    collect(job.result_assets); collect(job.assets); collect(job.images); collect(job.image_urls); collect(job.urls);
    collect(job.output); collect(job.outputs); collect(job.artifacts); collect(job.files); collect(job.result); collect(job.data);
    [job.image_url, job.result_url, job.output_url, job.url].forEach((url) => collect(url));
    const seen = new Set();
    return raw.map((asset) => {
      if (typeof asset === "string") return { display_url: asset, download_url: asset };
      if (!asset || typeof asset !== "object") return null;
      const url = asset.stable_url || asset.display_url || asset.download_url || asset.image_url || asset.result_url || asset.output_url || asset.url || asset.uri || asset.href;
      return typeof url === "string" && url.trim() ? { ...asset, display_url: asset.stable_url || asset.display_url || url, download_url: asset.download_url || url } : null;
    }).filter((asset) => {
      if (!asset || !asset.display_url || seen.has(asset.display_url)) return false;
      seen.add(asset.display_url);
      return true;
    });
  }

  function officialImageFailure(job) {
    const code = String(job && (job.failure_code || job.error_code || job.code) || '').trim();
    const messages = {
      AI_IMAGE_PROMPT_REJECTED: '图片内容触发上游安全限制，安全回退后仍无法生成，积分已自动退回',
      AI_IMAGE_RESULT_UNSUPPORTED: '官方图片服务返回格式不受支持（未返回可用图片 URL）',
      AI_IMAGE_RESULT_INVALID: '官方图片服务返回的图片结果无效',
      AI_UPSTREAM_TIMEOUT: '官方图片服务响应超时，积分已自动退回',
      AI_UPSTREAM_RATE_LIMITED: '官方图片服务繁忙，请稍后重试',
      AI_UPSTREAM_AUTH_FAILED: '官方图片服务认证异常，请联系管理员',
      AI_UPSTREAM_BAD_REQUEST: '官方图片请求未被上游接受，积分已自动退回',
      AI_UPSTREAM_FAILED: '官方图片服务暂时不可用，积分已自动退回',
    };
    return {
      code: code || 'image_generation_failed',
      message: job && job.message || messages[code] || (code
        ? `官方图片任务失败（${code}），积分已自动退回`
        : '官方图片任务失败，积分已自动退回'),
    };
  }

  function getResultText(job) {
    if (!job || typeof job !== "object") return "";
    const candidates = [job.result_text, job.output_text, job.content, job.text, job.result && job.result.text, job.result && job.result.content];
    return candidates.find((value) => typeof value === "string" && value.trim()) || "";
  }

  function displayResultAssets(modal, assets) {
    const output = modal && modal.querySelector(".oai-output");
    if (!output) return;
    output.replaceChildren();
    const grid = node("div", { className: "oai-output-grid" });
    assets.forEach((asset, index) => {
      const url = asset.display_url || asset.download_url;
      const wrap = node("div", { className: "oai-image-wrap" }, [
        node("span", { className: "oai-image-placeholder", text: "正在加载图片…" }),
        node("img", { src: url, alt: `官方图片 ${index + 1}`, loading: "lazy" })
      ]);
      const image = wrap.querySelector("img");
      const placeholder = wrap.querySelector(".oai-image-placeholder");
      image.addEventListener("load", () => { placeholder.hidden = true; });
      image.addEventListener("error", () => {
        wrap.classList.add("is-error");
        placeholder.hidden = false;
        placeholder.textContent = "图片加载失败，请尝试保存到本地";
      });
      const save = node("button", { text: "保存到本地" });
      save.addEventListener("click", async () => {
        save.disabled = true;
        const bridge = api();
        const result = bridge && typeof bridge.saveAsset === "function"
          ? await bridge.saveAsset(url, `漫剧虾-官方图片-${index + 1}.png`)
          : { ok: false, message: "当前客户端不支持本地保存" };
        save.disabled = false;
        setStatus(modal, result && result.ok ? "图片已保存到本地。" : result && result.message || "图片保存失败。", result && result.ok ? "ok" : "error");
      });
      const card = node("div", { className: "oai-output-card" }, [
        wrap,
        node("a", { href: url, target: "_blank", rel: "noreferrer", text: "打开图片" }),
        save
      ]);
      grid.append(card);
    });
    output.append(grid);
    output.style.display = "block";
  }

  function displayResultText(modal, value) {
    const output = modal && modal.querySelector(".oai-output");
    if (!output) return;
    output.replaceChildren(node("div", { className: "oai-text-output", text: value }));
    output.style.display = "block";
  }

  function finishImageTask(result) {
    if (!imageResolver) return;
    const resolve = imageResolver;
    imageResolver = null;
    resolve(result);
    closeModal(false);
  }

  function displayCatalog(modal, result) {
    const meta = modal.querySelector(".oai-meta");
    const submit = modal.querySelector(".oai-submit");
    const item = catalogItems(result).find((entry) => entry.task_type === currentTaskType);
    if (!result || !result.ok || !item) {
      if (meta) meta.replaceChildren();
      if (submit) submit.disabled = true;
      setStatus(modal, result && result.message || `官方${currentTaskKind === "text" ? "语言" : "图片"}算力暂未开放`, result && result.code === "official_not_configured" ? "" : "error");
      return false;
    }
    if (meta) {
      meta.replaceChildren(
        node("div", {}, [node("small", { text: "官方任务" }), node("b", { text: currentTaskKind === "text" ? "语言处理" : "图片生成" })]),
        node("div", {}, [node("small", { text: "可用状态" }), node("b", { text: "已开放" })])
      );
    }
    if (submit) submit.disabled = false;
    setStatus(modal, `官方${currentTaskKind === "text" ? "语言" : "图片"}算力已就绪，积分和模型由服务端处理。`, "ok");
    return true;
  }

  async function loadCatalog(modal) {
    setStatus(modal, "正在读取官方图片算力状态…");
    const remote = api();
    if (!remote || typeof remote.catalog !== "function") {
      displayCatalog(modal, { ok: false, message: "当前客户端暂不支持官方图片算力" });
      return false;
    }
    try {
      return displayCatalog(modal, await remote.catalog());
    } catch (_) {
      displayCatalog(modal, { ok: false, message: "官方图片算力状态暂不可用，请稍后重试" });
      return false;
    }
  }

  async function pollJob(modal) {
    if (!currentJobId || !api() || typeof api().getJob !== "function") return;
    try {
      const result = await api().getJob(currentJobId);
      if (!result || result.ok === false) {
        const message = result && result.message || "图片任务状态查询失败，请稍后重试";
        setStatus(modal, message, "error");
        if (imageResolver) finishImageTask({ ok: false, code: result && result.code || "official_request_failed", message });
        return;
      }
      const job = result.job || result.data || result;
      const state = String(job.status || job.state || "").toLowerCase();
      const success = ["completed", "complete", "succeeded", "success"].includes(state);
      const failed = ["failed", "error", "cancelled", "canceled"].includes(state);
      if (success) {
        if (currentTaskKind === "text") {
          const outputText = getResultText(job);
          if (outputText) displayResultText(modal, outputText);
          if (imageResolver) finishImageTask(outputText ? { ok: true, text: outputText, job } : { ok: false, code: "script_generation_failed", message: "官方语言任务完成但没有返回正文" });
          setStatus(modal, outputText ? "官方语言任务完成。" : "官方语言任务失败：没有返回正文。", outputText ? "ok" : "error");
          return;
        }
        const assets = getResultAssets(job);
        if (assets.length) displayResultAssets(modal, assets);
        if (imageResolver) {
          finishImageTask(assets.length ? { ok: true, result_assets: assets, job } : { ok: false, code: "image_generation_failed", message: "图片生成完成但没有返回图片" });
        }
        setStatus(modal, assets.length ? "图片生成完成。" : "图片生成失败：没有返回图片。", assets.length ? "ok" : "error");
        return;
      }
      if (failed) {
        const failure = officialImageFailure(job);
        setStatus(modal, failure.message, "error");
        if (imageResolver) finishImageTask({ ok: false, code: failure.code, message: failure.message });
        return;
      }
      setStatus(modal, `${currentTaskKind === "text" ? "语言" : "图片"}任务状态：${job.status || job.state || "处理中"}`);
      const httpStatus = Number(result.http_status || job.http_status || 0);
      const pollable = httpStatus === 202 || ["queued", "pending", "running", "processing", "in_progress"].includes(state) || !state;
      if (pollable) pollTimer = setTimeout(() => pollJob(modal), 2500);
    } catch (_) {
      const message = "图片任务状态暂时无法获取，请稍后重试";
      setStatus(modal, message, "error");
      if (imageResolver) finishImageTask({ ok: false, code: "official_request_failed", message });
    }
  }

  async function submit(modal) {
    const text = modal.querySelector(".oai-text").value;
    if (!text.trim()) {
      setStatus(modal, "请先确认图片提示词。", "error");
      return;
    }
    const remote = api();
    if (!remote || typeof remote.createJob !== "function") {
      setStatus(modal, "当前客户端暂不支持官方图片算力。", "error");
      return;
    }
    currentIdempotencyKey = currentIdempotencyKey || createIdempotencyKey();
    modal.querySelector(".oai-submit").disabled = true;
      setStatus(modal, `正在提交${currentTaskKind === "text" ? "语言" : "图片"}任务…`);
    try {
      const result = await remote.createJob(text, currentIdempotencyKey, currentTaskType);
      if (!result || result.ok === false) {
        setStatus(modal, result && result.message || "图片任务提交失败，请稍后重试。", "error");
        modal.querySelector(".oai-submit").disabled = false;
        return;
      }
      const job = result.job || result.data || result;
      currentJobId = String(job.id || result.id || "");
      if (!currentJobId) {
        setStatus(modal, "任务已提交，但服务端未返回任务编号。", "error");
        modal.querySelector(".oai-submit").disabled = false;
        return;
      }
      setStatus(modal, `${currentTaskKind === "text" ? "语言" : "图片"}任务已提交，正在等待结果…`, "ok");
      stopPolling();
      const state = String(job.status || job.state || "").toLowerCase();
      const httpStatus = Number(result.http_status || 0);
      // anyq.site returns completed text jobs synchronously.  Consume that
      // response directly instead of issuing a second status request: a
      // finished job already has its output, while an extra request can race
      // a server restart and turn a successful conversion into a false error.
      if (["succeeded", "success", "completed", "complete"].includes(state)) {
        if (currentTaskKind === "text") {
          const outputText = getResultText(job);
          if (!outputText) {
            setStatus(modal, "官方语言任务完成但没有返回正文。", "error");
            if (imageResolver) finishImageTask({ ok: false, code: "script_generation_failed", message: "官方语言任务完成但没有返回正文" });
            return;
          }
          displayResultText(modal, outputText);
          setStatus(modal, "官方语言任务完成。", "ok");
          if (imageResolver) finishImageTask({ ok: true, text: outputText, job });
          return;
        }
        // Image jobs can complete synchronously too.  Use the assets carried
        // by that response; polling again can otherwise replace a successful
        // result with a transient empty status response.
        const assets = getResultAssets(job);
        if (!assets.length) {
          setStatus(modal, "图片生成完成但没有返回图片。", "error");
          if (imageResolver) finishImageTask({ ok: false, code: "image_generation_failed", message: "图片生成完成但没有返回图片" });
          return;
        }
        displayResultAssets(modal, assets);
        setStatus(modal, "图片生成完成。", "ok");
        if (imageResolver) finishImageTask({ ok: true, result_assets: assets, job });
        return;
      }
      if (httpStatus === 202 || state === "running") pollJob(modal);
      else if (["succeeded", "success", "completed", "complete", "failed", "error", "cancelled", "canceled"].includes(state)) pollJob(modal);
    } catch (_) {
      setStatus(modal, "图片任务提交失败，请稍后重试。", "error");
      modal.querySelector(".oai-submit").disabled = false;
    }
  }

  function openPanel({ prompt = "", imageOnly = false, taskType = OFFICIAL_IMAGE_TASK_TYPE } = {}) {
    closeModal();
    addStyle();
    currentJobId = "";
    currentIdempotencyKey = "";
    currentTaskType = taskType;
    currentTaskKind = imageOnly ? "image" : "text";
    const taskLabel = imageOnly ? "图片" : "语言";
    const modal = node("div", { id: MODAL_ID }, [
      node("section", { className: "oai-dialog", role: "dialog", "aria-modal": "true", "aria-label": imageOnly ? "官方图片算力" : "官方语言算力" }, [
        node("header", { className: "oai-head" }, [node("strong", { text: imageOnly ? "确认图片提示词" : "官方语言算力" }), node("button", { className: "oai-close", text: "×", title: "关闭", onclick: closeModal })]),
        node("div", { className: "oai-body" }, [
          node("p", { className: "oai-copy", text: imageOnly ? "请确认或修改下面的图片提示词。点击提交后会消耗官方积分，网络异常不会自动切换到本地配置。" : "请确认本次剧本素材。官方语言算力只处理这段用户输入，模型、积分和可用状态以服务端为准。" }),
          node("div", { className: "oai-meta" }),
          node("textarea", { className: "oai-text", placeholder: imageOnly ? "请输入图片提示词…" : "请输入剧本或章节内容…", "aria-label": `${taskLabel}任务内容` }),
          node("div", { className: "oai-output" }),
          node("div", { className: "oai-status", text: "正在读取官方图片算力状态…" }),
          node("div", { className: "oai-actions" }, [
            node("button", { text: "重新读取", onclick: () => loadCatalog(modal) }),
            node("button", { className: "primary oai-submit", text: `提交${taskLabel}任务`, disabled: true, onclick: () => submit(modal) })
          ]),
          node("div", { className: "oai-note", text: "一次点击只创建一个任务标识；重试会复用本次标识，避免重复扣费。" })
        ])
      ])
    ]);
    modal.querySelector(".oai-text").value = prompt;
    modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
    document.body.append(modal);
    loadCatalog(modal);
    return modal;
  }

  function openImagePanel(prompt) {
    return new Promise((resolve) => {
      openPanel({ prompt, imageOnly: true });
      imageResolver = resolve;
    });
  }

  window.manjuxiaOpenOfficialImagePanel = () => openPanel();

  function requestPath(input) {
    try {
      const value = typeof input === "string" ? input : input && input.url;
      // Electron renders the UI from file://. Resolving an absolute backend
      // route with new URL('/api/...', location.href) incorrectly produces
      // '/F:/api/...' and silently bypasses every official interceptor.
      if (typeof value === "string" && value.startsWith("/")) return value;
      return new URL(value, location.href).pathname + (new URL(value, location.href).search || "");
    } catch (_) {
      return String(input || "");
    }
  }

  function isOfficialImageConfig(value) {
    const id = String(value || "");
    return id === OFFICIAL_IMAGE_CONFIG_ID || id === OFFICIAL_SEEDREAM2_CONFIG_ID;
  }

  function isOfficialConfig(value) {
    const id = String(value || "");
    return id === OFFICIAL_TEXT_CONFIG_ID || id === OFFICIAL_DEEPSEEK_V41_CONFIG_ID || isOfficialImageConfig(id) || id === OFFICIAL_SEEDANCE2_VIDEO_CONFIG_ID || id === OFFICIAL_MINIMAX_H3_VIDEO_CONFIG_ID || id.startsWith(OFFICIAL_TEXT_CONFIG_PREFIX);
  }

  function officialVideoProvider(value) {
    const id = String(value || "");
    return id === OFFICIAL_SEEDANCE2_VIDEO_CONFIG_ID ? "volcengine_ark" : id === OFFICIAL_MINIMAX_H3_VIDEO_CONFIG_ID ? "newapi" : "";
  }

  function officialTaskTypeForConfig(configId) {
    const id = String(configId || "");
    if (isOfficialImageConfig(id)) return officialTaskTypes.get(id) || OFFICIAL_IMAGE_TASK_TYPE;
    if (id === OFFICIAL_TEXT_CONFIG_ID) return "comic_creation";
    if (id === OFFICIAL_DEEPSEEK_V41_CONFIG_ID) return "comic_creation_deepseek_v41";
    if (!id.startsWith(OFFICIAL_TEXT_CONFIG_PREFIX)) return "";
    return officialTaskTypes.get(id) || id.slice(OFFICIAL_TEXT_CONFIG_PREFIX.length);
  }

  function requestUsesOfficialImageConfig(init) {
    if (!init || init.body == null) return false;
    try {
      const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      return isOfficialImageConfig(body && (body.config_id || body.llm_config_id));
    } catch (_) {
      return false;
    }
  }

  function requestOfficialConfigId(input, init) {
    try {
      const body = init && init.body != null
        ? (typeof init.body === "string" ? JSON.parse(init.body) : init.body)
        : null;
      let id = body && (body.config_id || body.llm_config_id);
      if (!id) {
        const value = typeof input === "string" ? input : input && input.url;
        id = new URL(value, location.href).searchParams.get("llm_config_id");
      }
      return isOfficialConfig(id) ? String(id) : "";
    } catch (_) {
      return "";
    }
  }

  function catalogItems(result) {
    if (!result || result.ok !== true || !Array.isArray(result.items)) return [];
    return result.items.filter((item) => item && item.enabled !== false && item.available !== false && typeof item.task_type === "string");
  }

  function officialOptionsSupportedOnCurrentPage(configType) {
    const route = String(location.hash || "").toLowerCase();
    if (configType === "image") return route.startsWith("#/extraction");
    // Only offer an official text choice where the matching production action
    // persists its result through an adapter below.  Other pages retain their
    // native selectors rather than accepting an incompatible string config ID.
    return route.startsWith("#/scripts") || route.startsWith("#/extraction") || route.startsWith("#/storyboards");
  }

  function optionForCatalogItem(item) {
    const taskType = String(item.task_type || "").trim();
    if (!taskType) return null;
    const isImage = taskType === OFFICIAL_IMAGE_TASK_TYPE || /image|picture|photo/i.test(taskType);
    const id = isImage ? (taskType === "comic_image_seedream2" ? OFFICIAL_SEEDREAM2_CONFIG_ID : OFFICIAL_IMAGE_CONFIG_ID) : taskType === "comic_creation_deepseek_v41" ? OFFICIAL_DEEPSEEK_V41_CONFIG_ID : OFFICIAL_TEXT_CONFIG_ID;
    officialTaskTypes.set(id, taskType);
    return {
      id,
      // This is returned through the same API as local configurations, so the
      // existing Vue/Element Plus select renders it as a normal dropdown item.
      // Local rows are the user's self-configured compute; this row is the
      // official-compute choice.
      name: isImage
        ? (taskType === "comic_image_seedream2" ? "官方 Seedream5" : "官方 Image2")
        : taskType === "comic_creation_deepseek_v41" ? "官方 DeepSeek V4.1" : "官方 GPT-sol",
      config_type: isImage ? "image" : "llm",
      official_ai: true,
      task_type: taskType
    };
  }

  async function addOfficialOptions(response, configType) {
    try {
      const remote = api();
      if (!officialOptionsSupportedOnCurrentPage(configType)) return response;
      // The choice is a local, stable capability marker rather than a
      // remotely delivered model/key.  It must remain selectable while the
      // account server is temporarily unavailable; createJob performs the
      // authoritative entitlement/catalog check in Electron at execution.
      const fallbackTasks = configType === "image"
        ? [OFFICIAL_IMAGE_TASK_TYPE, "comic_image_seedream2"]
        : ["comic_creation", "comic_creation_deepseek_v41"];
      let catalog = null;
      if (remote && typeof remote.catalog === "function") {
        try { catalog = await remote.catalog(); } catch (_) {}
      }
      let options = catalogItems(catalog).map(optionForCatalogItem).filter((item) => item && item.config_type === configType);
      fallbackTasks
        .map((task_type) => optionForCatalogItem({ task_type, enabled: true, available: true }))
        .filter((option) => option && option.config_type === configType)
        .forEach((option) => {
          if (!options.some((item) => String(item.id) === String(option.id))) options.push(option);
        });
      if (!options.length) return response;
      const payload = await response.clone().json();
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload && payload.data)
          ? payload.data
          : Array.isArray(payload && payload.items)
            ? payload.items
          : null;
      if (!list) return response;
      // Keep local configurations in the same native selector, but make their
      // source explicit without changing the saved config id or request body.
      // This produces options such as "自配算力 · 我的 DeepSeek" beside
      // "官方算力" instead of adding a second, hand-built control below it.
      list.forEach((item) => {
        // The local backend's persistent official capability row uses a
        // negative sentinel id.  It is not a self-configured model and must
        // never receive the "自配算力" prefix.
        if (item && isOfficialConfig(item.id)) {
          item.name = String(item.id) === OFFICIAL_SEEDREAM2_CONFIG_ID
            ? "官方 Seedream5"
            : String(item.id) === OFFICIAL_IMAGE_CONFIG_ID
              ? "官方 Image2"
              : String(item.id) === OFFICIAL_DEEPSEEK_V41_CONFIG_ID
                ? "官方 DeepSeek V4.1"
                : "官方 GPT-sol";
          item.official_ai = true;
          return;
        }
        if (!item || item.official_ai || !item.name || String(item.name).startsWith("自配算力 · ")) return;
        item.name = `自配算力 · ${item.name}`;
      });
      options.forEach((option) => {
        if (!list.some((item) => item && String(item.id) === String(option.id))) list.push(option);
      });
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(JSON.stringify(payload), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (_) {
      return response;
    }
  }

  async function fetchConfirmedPrompt(elementId) {
    const response = await localBackendFetch(`/api/extraction/element/${elementId}/full-prompt`, { method: "GET" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.prompt) throw new Error(data.message || "无法读取图片提示词");
    return String(data.prompt);
  }

  async function persistOfficialImage(elementId, asset, prompt) {
    const imageUrl = String(asset && (asset.stable_url || asset.display_url || asset.download_url) || "").trim();
    if (!imageUrl) throw new Error("官方图片任务没有返回可保存的图片地址");
    const response = await localBackendFetch(`/api/extraction/element/${elementId}/official-image-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, image_prompt: prompt })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success || !data.image_url) {
      throw new Error(data.detail || data.message || "官方图片已生成，但保存到本地素材库失败");
    }
    return data.image_url;
  }

  async function setOfficialImageStatus(elementId, status) {
    const response = await localBackendFetch(`/api/extraction/element/${elementId}/official-image-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.detail || data.message || "无法更新官方图片任务状态");
  }

  function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  }

  async function localApiUrl(path) {
    const value = String(path || "");
    try {
      const bridge = window.electronAPI;
      if (bridge && typeof bridge.getBackendUrl === "function") {
        const base = String(await bridge.getBackendUrl()).replace(/\/+$/, "");
        if (/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) return `${base}${value.startsWith("/") ? value : `/${value}`}`;
      }
    } catch (_) {}
    return value;
  }

  async function localBackendFetch(path, init = {}) {
    const url = await localApiUrl(path);
    let response = await previousFetch(url, init);
    // Official adapters call the original fetch to avoid recursively
    // intercepting themselves.  Keep the same signed-session renewal that
    // ordinary frontend calls receive, otherwise a task can fail exactly when
    // its local account envelope expires.
    if (response && response.status === 401 && window.electronAPI?.account?.me) {
      let expired = false;
      try {
        const payload = await response.clone().json();
        expired = String(payload && (payload.detail || payload.message || payload.error) || "") === "account_signature_expired";
      } catch (_) {}
      if (expired) {
        try {
          const refreshed = await window.electronAPI.account.me();
          if (refreshed && refreshed.ok) response = await previousFetch(url, init);
        } catch (_) {}
      }
    }
    return response;
  }

  function openTextPanel(prompt, taskType) {
    return new Promise((resolve) => {
      openPanel({ prompt, imageOnly: false, taskType });
      imageResolver = resolve;
    });
  }

  function createOperationProgress(label) {
    addStyle();
    const id = "manjuxia-official-operation-progress";
    document.getElementById(id)?.remove();
    const panel = node("div", { id, className: "oai-operation-progress", role: "status", "aria-live": "polite" }, [
      node("strong", { text: label }),
      node("span", { className: "oai-operation-progress-copy", text: "正在提交官方任务…" }),
      node("div", { className: "oai-operation-progress-track" }, [node("i", { className: "oai-operation-progress-bar" })])
    ]);
    document.body.append(panel);
    const update = (copy, percent) => {
      const text = panel.querySelector(".oai-operation-progress-copy");
      const bar = panel.querySelector(".oai-operation-progress-bar");
      if (text) text.textContent = copy;
      if (bar && Number.isFinite(Number(percent))) bar.style.width = `${Math.max(3, Math.min(100, Number(percent)))}%`;
    };
    update("正在提交官方任务…", 7);
    return {
      update,
      done(copy = "任务完成，正在刷新结果…") {
        update(copy, 100);
        window.setTimeout(() => panel.remove(), 1200);
      },
      fail(copy = "任务失败") {
        update(copy, 100);
        panel.classList.add("is-error");
        window.setTimeout(() => panel.remove(), 2600);
      }
    };
  }

  async function runOfficialTextTask(prompt, taskType, onProgress) {
    const remote = api();
    if (!remote || typeof remote.catalog !== "function" || typeof remote.createJob !== "function" || typeof remote.getJob !== "function") {
      throw new Error("当前客户端暂不支持官方语言算力");
    }
    const catalog = await remote.catalog();
    if (!catalogItems(catalog).some((item) => item.task_type === taskType)) {
      throw new Error((catalog && catalog.message) || "官方语言算力暂未开放");
    }
    onProgress?.("正在向官方算力提交任务…", 12);
    const created = await remote.createJob(prompt, createIdempotencyKey(), taskType);
    if (!created || created.ok === false) throw new Error(created && created.message || "官方语言任务提交失败");
    let job = created.job || created.data || created;
    const jobId = String(job.id || created.id || "");
    if (!jobId) throw new Error("官方语言任务未返回任务编号");
    // Full production storyboard prompts are intentionally preserved. Keep
    // polling while the asynchronous gateway waits for long model outputs.
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const state = String(job.status || job.state || "").toLowerCase();
      if (["completed", "complete", "succeeded", "success"].includes(state)) {
        const text = getResultText(job);
        if (text) {
          onProgress?.("官方任务已完成，正在写入本地结果…", 96);
          return text;
        }
        throw new Error("官方语言任务完成但没有返回结果");
      }
      if (["failed", "error", "cancelled", "canceled"].includes(state)) {
        const failureCode = String(job.failure_code || job.error_code || job.code || "").trim();
        const message = job.message || "官方语言任务失败，积分将自动退回";
        throw new Error(failureCode ? `${message} [${failureCode}]` : message);
      }
      const serviceProgress = Number(job.progress || job.percent || job.percentage);
      const fallbackProgress = Math.min(92, 18 + attempt * 2);
      onProgress?.(
        state === "queued" || state === "pending" ? "官方任务排队中…" : "官方算力正在生成结果…",
        Number.isFinite(serviceProgress) ? Math.max(14, Math.min(92, serviceProgress)) : fallbackProgress
      );
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const current = await remote.getJob(jobId);
      if (!current || current.ok === false) throw new Error(current && current.message || "官方语言任务状态查询失败");
      job = current.job || current.data || current;
    }
    throw new Error("官方语言任务处理超时，请稍后到任务记录查看结果");
  }

  async function runOfficialImageTask(prompt, onProgress, taskType = OFFICIAL_IMAGE_TASK_TYPE) {
    const remote = api();
    if (!remote || typeof remote.catalog !== "function" || typeof remote.createJob !== "function" || typeof remote.getJob !== "function") {
      throw new Error("当前客户端暂不支持官方图片算力");
    }
    const catalog = await remote.catalog();
    if (!catalogItems(catalog).some((item) => item.task_type === taskType)) {
      throw new Error((catalog && catalog.message) || "官方图片算力暂未开放");
    }
    onProgress?.("正在向官方图片算力提交任务…", 12);
    const created = await remote.createJob(prompt, createIdempotencyKey(), taskType);
    if (!created || created.ok === false) throw new Error(created && created.message || "官方图片任务提交失败");
    let job = created.job || created.data || created;
    const jobId = String(job.id || created.id || "");
    if (!jobId) throw new Error("官方图片任务未返回任务编号");
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const state = String(job.status || job.state || "").toLowerCase();
      if (["completed", "complete", "succeeded", "success"].includes(state)) {
        const assets = getResultAssets(job);
        if (!assets.length) throw new Error("官方图片任务完成但没有返回图片");
        onProgress?.("图片已生成，正在写入素材…", 96);
        return assets;
      }
      if (["failed", "error", "cancelled", "canceled"].includes(state)) {
        throw new Error(officialImageFailure(job).message);
      }
      const serviceProgress = Number(job.progress || job.percent || job.percentage);
      const fallbackProgress = Math.min(92, 18 + attempt);
      onProgress?.(
        state === "queued" || state === "pending" ? "官方图片任务排队中…" : "官方图片正在生成…",
        Number.isFinite(serviceProgress) ? Math.max(14, Math.min(92, serviceProgress)) : fallbackProgress
      );
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const current = await remote.getJob(jobId);
      if (!current || current.ok === false) throw new Error(current && current.message || "官方图片任务状态查询失败");
      job = current.job || current.data || current;
    }
    throw new Error("官方图片任务处理超时，请稍后到任务记录查看结果");
  }

  async function interceptOfficialScriptRequest(init) {
    let body;
    try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body || {}; } catch (_) { return jsonResponse({ success: false, message: "官方语言任务参数无效" }, 400); }
    const configId = String(body.llm_config_id || "");
    const taskType = officialTaskTypeForConfig(configId);
    if (!taskType) return jsonResponse({ success: false, message: "官方语言任务未在服务端目录开放" }, 409);
    if (body.chapter_id == null || body.novel_id == null) {
      return jsonResponse({ success: false, message: "官方语言算力请逐章转换" }, 409);
    }
    const progress = createOperationProgress("官方剧本转换");
    try {
      const prepared = await localBackendFetch("/api/scripts/official-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novel_id: body.novel_id, chapter_id: body.chapter_id, template_id: body.template_id })
      });
      const preparedData = await prepared.json().catch(() => ({}));
      if (!prepared.ok || !preparedData.success || !preparedData.prompt) {
        return jsonResponse({ success: false, message: preparedData.detail || preparedData.message || "无法准备剧本转换模板" }, prepared.status || 502);
      }
      progress.update("正在读取剧本并创建官方任务…", 10);
      const content = await runOfficialTextTask(preparedData.prompt, taskType, progress.update);
      const saved = await localBackendFetch("/api/scripts/official-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_id: body.novel_id,
          chapter_id: body.chapter_id,
          template_id: body.template_id,
          content
        })
      });
      const savedData = await saved.json().catch(() => ({}));
      if (!saved.ok || !savedData || !savedData.id) {
        return jsonResponse({
          success: false,
          message: savedData.detail || savedData.message || "官方剧本结果保存失败"
        }, saved.status || 502);
      }
      // Match the native /api/scripts/convert-single contract exactly. The
      // Vue view uses `success` and `script_id` to refresh its right-hand
      // result panel immediately; returning the persisted Script object made
      // a completed official conversion look like a failed request.
      progress.done("剧本已生成，正在打开结果…");
      return jsonResponse({
        chapter_id: body.chapter_id,
        chapter_title: savedData.chapter_title || preparedData.chapter_title || "未命名章节",
        success: true,
        script_id: savedData.id,
        message: "转换成功"
      });
    } catch (error) {
      progress.fail(error && error.message || "官方剧本转换失败");
      return jsonResponse({ success: false, message: error && error.message || "官方剧本转换失败" }, 502);
    }
  }

  async function interceptOfficialExtractionRequest(init) {
    let body;
    try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body || {}; } catch (_) { return jsonResponse({ success: false, message: "官方信息提取参数无效" }, 400); }
    const configId = String(body.llm_config_id || "");
    const taskType = officialTaskTypeForConfig(configId);
    if (!taskType) return jsonResponse({ success: false, message: "官方语言任务未在服务端目录开放" }, 409);
    const progress = createOperationProgress("官方信息提取");
    try {
      const prepared = await localBackendFetch("/api/extraction/official-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_id: body.novel_id,
          element_type: body.element_type,
          template_id: body.template_id,
          chapter_ids: body.chapter_ids || null
        })
      });
      const preparedData = await prepared.json().catch(() => ({}));
      if (!prepared.ok || !preparedData.success || !preparedData.prompt) {
        return jsonResponse({ success: false, message: preparedData.detail || preparedData.message || "无法准备官方信息提取素材" }, prepared.status || 502);
      }
      progress.update("正在读取章节并创建官方任务…", 10);
      const content = await runOfficialTextTask(preparedData.prompt, taskType, progress.update);
      const saved = await localBackendFetch("/api/extraction/official-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novel_id: body.novel_id,
          element_type: body.element_type,
          chapter_ids: preparedData.chapter_ids || body.chapter_ids || [],
          content
        })
      });
      const savedData = await saved.json().catch(() => ({}));
      if (!saved.ok || !savedData || savedData.success !== true) {
        return jsonResponse({
          success: false,
          message: savedData.detail || savedData.message || "官方信息提取结果保存失败"
        }, saved.status || 502);
      }
      // The production extraction view consumes total_unique and then reloads
      // the current element tab. Preserve that native response instead of
      // adapting it to a script-conversion shape.
      progress.done("提取完成，正在刷新素材列表…");
      return jsonResponse(savedData);
    } catch (error) {
      progress.fail(error && error.message || "官方信息提取失败");
      return jsonResponse({ success: false, message: error && error.message || "官方信息提取失败" }, 502);
    }
  }

  async function interceptOfficialDescriptionPolish(input, init) {
    let body;
    try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body || {}; } catch (_) { return jsonResponse({ success: false, message: "官方润色任务参数无效" }, 400); }
    const taskType = officialTaskTypeForConfig(body.llm_config_id);
    const match = requestPath(input).match(/^\/api\/extraction\/element\/(\d+)\/polish-description$/);
    if (!taskType || !match || !String(body.current_description || "").trim()) return jsonResponse({ success: false, message: "官方润色任务缺少人物描述" }, 400);
    const instruction = String(body.instruction || "在不改变角色核心设定的前提下，让人物形象描述更适合 AI 生图。");
    const prompt = "你是影视角色视觉设定助手。只输出润色后的最终人物描述，不要解释、标题或 Markdown。"
      + "保留角色身份、年龄段、时代背景和核心设定；增强外貌、服装、气质等适合生图的视觉细节。\n\n"
      + `当前人物描述：\n${body.current_description}\n\n润色要求：\n${instruction}`;
    try {
      const description = await runOfficialTextTask(prompt, taskType);
      if (!String(description || "").trim()) return jsonResponse({ success: false, message: "官方润色结果为空" }, 502);
      return jsonResponse({ success: true, description: String(description).trim() });
    } catch (error) {
      return jsonResponse({ success: false, message: error && error.message || "官方人物润色失败" }, 502);
    }
  }

  async function interceptOfficialStoryboardRequest(init, mode) {
    let body;
    try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body || {}; } catch (_) { return jsonResponse({ success: false, message: "官方分镜任务参数无效" }, 400); }
    const taskType = officialTaskTypeForConfig(body.llm_config_id);
    if (!taskType) return jsonResponse({ success: false, message: "官方语言任务未在服务端目录开放" }, 409);
    const request = { ...body, mode };
    delete request.llm_config_id;
    try {
      const prepared = await localBackendFetch("/api/storyboards/official-prompt-section", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request)
      });
      const preparedData = await prepared.json().catch(() => ({}));
      if (!prepared.ok || !preparedData.success || !preparedData.prompt) {
        return jsonResponse({ success: false, message: preparedData.detail || preparedData.message || "无法准备官方分镜素材" }, prepared.status || 502);
      }
      const content = await runOfficialTextTask(preparedData.prompt, taskType);
      const saved = await localBackendFetch("/api/storyboards/official-result-section", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...request, content })
      });
      const savedData = await saved.json().catch(() => ({}));
      if (!saved.ok || !savedData.success) {
        return jsonResponse({ success: false, message: savedData.detail || savedData.message || "官方分镜结果保存失败" }, saved.status || 502);
      }
      if (mode === "regenerate") return jsonResponse(savedData);
      // The production page retains its original status polling flow.  The
      // result has already been persisted and a completed log is written, so
      // the next poll observes the normal success state without special UI.
      return jsonResponse({ status: "started", novel_id: body.novel_id, script_id: body.script_id, scene_index: body.scene_index });
    } catch (error) {
      return jsonResponse({ success: false, message: error && error.message || "官方分镜生成失败" }, 502);
    }
  }

  async function interceptOfficialEndStateRequest(input, init) {
    const taskType = officialTaskTypeForConfig(requestOfficialConfigId(input, init));
    const match = requestPath(input).match(/^\/api\/storyboards\/(\d+)\/extract-end-state(?:\?|$)/);
    if (!taskType || !match) return jsonResponse({ success: false, message: "官方状态提取任务参数无效" }, 400);
    const storyboardId = match[1];
    try {
      const prepared = await localBackendFetch(`/api/storyboards/${storyboardId}/official-end-state-prompt`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
      });
      const preparedData = await prepared.json().catch(() => ({}));
      if (!prepared.ok || !preparedData.success || !preparedData.prompt) {
        return jsonResponse({ success: false, message: preparedData.detail || preparedData.message || "无法准备官方状态提取素材" }, prepared.status || 502);
      }
      const content = await runOfficialTextTask(preparedData.prompt, taskType);
      return localBackendFetch(`/api/storyboards/${storyboardId}/official-end-state-result`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content })
      });
    } catch (error) {
      return jsonResponse({ success: false, message: error && error.message || "官方状态提取失败" }, 502);
    }
  }

  async function interceptImageRequest(input, init, elementId) {
    const progress = createOperationProgress("官方图片生成");
    let markedGenerating = false;
    try {
      // The normal ExtractionView refreshes cards every few seconds.  Official
      // jobs run in Electron, so without persisting this state that refresh
      // sees an empty card and clears its spinner long before the image exists.
      await setOfficialImageStatus(elementId, "generating");
      markedGenerating = true;
      const prompt = await fetchConfirmedPrompt(elementId);
      const taskType = officialTaskTypeForConfig(requestOfficialConfigId(input, init)) || OFFICIAL_IMAGE_TASK_TYPE;
      const assets = await runOfficialImageTask(prompt, (copy, percent) => progress.update(copy, percent), taskType);
      const first = assets[0];
      progress.update("图片已生成，正在保存到本地素材库…", 97);
      const imageUrl = await persistOfficialImage(elementId, first, prompt);
      progress.done("图片已保存，正在刷新素材…");
      return jsonResponse({ success: true, message: "图片生成成功", status: "success", image_url: imageUrl, result_assets: assets });
    } catch (error) {
      const message = error && error.message || "图片生成失败";
      if (markedGenerating) {
        try { await setOfficialImageStatus(elementId, "error"); } catch (_) {}
      }
      progress.fail(message);
      return jsonResponse({ success: false, message }, 502);
    }
  }

  async function interceptOfficialConfigTest(configId) {
    // 官方密钥仅保存在服务端。设置页的“测试”只能检查本地通道是否可用，
    // 绝不能为了测试创建图片、语言或视频任务，否则可被反复点击消耗官方额度。
    if (isOfficialConfig(configId)) {
      return jsonResponse({
        success: true,
        message: "官方通道已启用；测试不会发起生成或扣除积分。实际生成时由服务端校验会员、积分与模型状态。",
        response: "服务端托管密钥已保护",
      });
    }
    return jsonResponse({ success: false, message: "官方配置类型无效" }, 400);
  }

  async function officialVideoPromptFromStoryboard(storyboardId) {
    const id = Number(storyboardId);
    if (!Number.isSafeInteger(id) || id <= 0) return "";
    const merge = (storyboard) => {
      const scenePrompt = String(storyboard && (storyboard.prompt || storyboard.description || storyboard.video_prompt) || "").trim();
      const stylePrompt = String(storyboard && (storyboard.style_prompt || storyboard.stylePrompt) || "").trim();
      // The saved video prompt describes the shot; the selected template is
      // persisted separately. Send both explicitly so “动漫 2D” and other
      // style constraints cannot disappear on the official-video route.
      return [stylePrompt, scenePrompt].filter(Boolean).join("\n\n").trim();
    };
    const bridge = api();
    if (bridge && typeof bridge.getStoryboardPrompt === "function") {
      try {
        const result = await bridge.getStoryboardPrompt(id);
        if (result && result.ok && result.prompt) {
          // Main-process prompt reads are deliberately minimal. Fetch the
          // storyboard record below when possible to append its style field.
          const base = String(result.prompt).trim();
          try {
            const response = await window.fetch(await localApiUrl(`/api/storyboards/${id}`), { method: "GET" });
            const storyboard = await response.json().catch(() => null);
            return merge({ ...(storyboard || {}), prompt: base });
          } catch (_) { return base; }
        }
      } catch (_) {}
    }
    try {
      // Use the current fetch chain here.  It attaches the per-request local
      // signature required by the desktop backend; calling previousFetch
      // directly bypasses that signer and turns a valid prompt into a hidden
      // 403/empty fallback.
      const response = await window.fetch(await localApiUrl(`/api/storyboards/${id}`), { method: "GET" });
      const storyboard = await response.json().catch(() => ({}));
      if (!response.ok || !storyboard || typeof storyboard !== "object") return "";
      return merge(storyboard);
    } catch (_) {
      return "";
    }
  }

  async function interceptOfficialVideoSubmit(init) {
    let body;
    try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body || {}; } catch (_) { return null; }
    const provider = officialVideoProvider(body.config_id);
    if (!provider) return null;
    const bridge = api();
    if (!bridge || typeof bridge.createVideoJob !== "function") return jsonResponse({ success: false, message: "当前客户端不支持官方视频算力" }, 409);
    // /api/video/ark/submit 使用的是 prompt；某些旧版视频页会把它放在
    // video_prompt / prompt_text 或 params 内。官方通道不能因此把空字符串交给上游。
    const params = body.params && typeof body.params === "object" ? body.params : {};
    let inputText = String(
      body.prompt || body.video_prompt || body.videoPrompt || body.prompt_text || body.promptText ||
      params.prompt || params.video_prompt || params.videoPrompt || ""
    ).trim();
    // The bundled video view normally sends `prompt`, but some legacy UI
    // paths lose that property while retaining storyboard_id.  The database
    // has the final saved storyboard prompt, which is the correct safe
    // fallback and avoids ever submitting an empty paid job.
    const storyboardId = body.storyboard_id || body.storyboardId || body.id;
    // Always prefer the saved storyboard composition when it is available:
    // it contains the selected style template in addition to the shot prompt.
    // This keeps the official path aligned with the normal video generator.
    const composedPrompt = await officialVideoPromptFromStoryboard(storyboardId);
    if (composedPrompt) inputText = composedPrompt;
    if (!inputText) {
      return jsonResponse({ success: false, message: "视频提示词为空，请先生成或填写分镜提示词后重试" }, 400);
    }
    const result = await bridge.createVideoJob({
      video_provider: provider, input_text: inputText, idempotency_key: createIdempotencyKey(),
      // Non-authoritative diagnostic metadata only.  The server never uses it
      // to choose a model or read local files; it lets audit mode prove which
      // storyboard supplied the prompt.
      source_storyboard_id: Number.isSafeInteger(Number(storyboardId)) ? Number(storyboardId) : null,
      params,
      images: Array.isArray(body.uploaded_images) ? body.uploaded_images : [],
      audios: Array.isArray(body.uploaded_audios) ? body.uploaded_audios : [],
      videos: Array.isArray(body.uploaded_videos) ? body.uploaded_videos : [],
    });
    if (!result || result.ok === false) return jsonResponse({ success: false, message: result && result.message || "官方视频任务提交失败" }, 502);
    const job = result.job || result.data || result;
    const id = String(job.id || result.id || "");
    if (!id) return jsonResponse({ success: false, message: "官方视频任务未返回编号" }, 502);
    // A video job can run for tens of minutes. Persist its mapping across a
    // desktop restart so completed official jobs are still polled and written
    // back into the local storyboard instead of becoming invisible.
    try { localStorage.setItem(`manjuxia-official-video:${body.storyboard_id}`, id); } catch (_) {}
    return jsonResponse({ success: true, task_id: id, submit_id: id, video_provider: "official" }, 202);
  }

  async function persistOfficialVideoLocally(storyboardId, remoteUrl) {
    const id = Number(storyboardId);
    const url = String(remoteUrl || "").trim();
    if (!Number.isSafeInteger(id) || id <= 0 || !/^https?:\/\//i.test(url)) return url;
    try {
      // The local downloader already owns the safe media directory layout,
      // resumable transfer and the standard video-completion hooks. First
      // store the trusted official result URL, then ask it to make a local
      // copy and return /data/videos/... for playback and export.
      const save = await localBackendFetch(
        `/api/storyboards/${id}/video-status?video_status=done&video_url=${encodeURIComponent(url)}`,
        { method: "PUT" }
      );
      if (!save.ok) return url;
      const download = await localBackendFetch("/api/video/retry-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyboard_id: id }),
      });
      const result = await download.json().catch(() => ({}));
      return download.ok && result && result.success && result.video_url
        ? String(result.video_url)
        : url;
    } catch (_) {
      // Keep the playable remote URL if a local transfer is temporarily
      // unavailable; the user can still retry download from the card.
      return url;
    }
  }

  async function interceptOfficialVideoPoll(init) {
    let body;
    try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body || {}; } catch (_) { return null; }
    const ids = Array.isArray(body.storyboard_ids) ? body.storyboard_ids : [];
    const bridge = api();
    if (!ids.length || !bridge || typeof bridge.getVideoJob !== "function") return null;
    const mapped = [];
    for (const storyboardId of ids) {
      let jobId = "";
      try { jobId = localStorage.getItem(`manjuxia-official-video:${storyboardId}`) || ""; } catch (_) {}
      if (!jobId) return null; // preserve the native poller for mixed/local batches
      const response = await bridge.getVideoJob(jobId);
      const job = response && (response.job || response.data || response);
      const state = String(job && (job.status || job.state) || "").toLowerCase();
      if (!response || response.ok === false || ["failed", "error", "cancelled", "canceled"].includes(state)) {
        try { localStorage.removeItem(`manjuxia-official-video:${storyboardId}`); } catch (_) {}
        mapped.push({ id: storyboardId, video_status: "failed", video_url: null, fail_reason: job && job.failure_code || response && response.message || "官方视频任务失败" });
      } else if (["succeeded", "success", "completed", "complete"].includes(state)) {
        const url = String(job && (job.result_text || job.video_url || job.output_url) || "");
        const localUrl = url ? await persistOfficialVideoLocally(storyboardId, url) : "";
        if (localUrl) try { localStorage.removeItem(`manjuxia-official-video:${storyboardId}`); } catch (_) {}
        mapped.push(localUrl ? { id: storyboardId, video_status: "done", video_url: localUrl } : { id: storyboardId, video_status: "failed", video_url: null, fail_reason: "官方视频未返回播放地址" });
      } else {
        mapped.push({ id: storyboardId, video_status: "generating", video_url: null });
      }
    }
    return jsonResponse({ success: true, results: mapped });
  }

  function installImageFetchInterceptor() {
    if (window.__manjuxiaOfficialImageFetchInstalled) return;
    previousFetch = window.fetch.bind(window);
    window.__manjuxiaOfficialImageFetchInstalled = true;
    window.fetch = async function officialImageFetch(input, init = {}) {
      const path = requestPath(input);
      const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
      if (method === "GET" && /^\/api\/llm-configs\/?(?:\?|$)/.test(path) && /(?:^|[?&])config_type=(image|llm)(?:&|$)/.test(path)) {
        const typeMatch = path.match(/(?:^|[?&])config_type=(image|llm)(?:&|$)/);
        return addOfficialOptions(await previousFetch(input, init), typeMatch && typeMatch[1]);
      }
      const officialTest = path.match(/^\/api\/llm-configs\/(-?\d+)\/test(?:\?|$)/);
      if (method === "POST" && officialTest && isOfficialConfig(officialTest[1])) {
        return interceptOfficialConfigTest(officialTest[1]);
      }
      const officialId = requestOfficialConfigId(input, init);
      if (method === "POST" && /^\/api\/video\/ark\/submit(?:\?|$)/.test(path)) {
        const handled = await interceptOfficialVideoSubmit(init);
        if (handled) return handled;
      }
      if (method === "POST" && /^\/api\/video\/poll-status(?:\?|$)/.test(path)) {
        const handled = await interceptOfficialVideoPoll(init);
        if (handled) return handled;
      }
      if (method === "POST" && officialTaskTypeForConfig(officialId) && /^\/api\/scripts\/convert-single$/.test(path)) {
        return interceptOfficialScriptRequest(init);
      }
      if (method === "POST" && officialTaskTypeForConfig(officialId) && /^\/api\/scripts\/convert$/.test(path)) {
        return jsonResponse({ success: false, message: "官方语言算力暂支持逐章转换，请先选择单个章节" }, 409);
      }
      if (method === "POST" && officialTaskTypeForConfig(officialId) && /^\/api\/extraction\/extract$/.test(path)) {
        return interceptOfficialExtractionRequest(init);
      }
      if (method === "POST" && officialTaskTypeForConfig(officialId) && /^\/api\/extraction\/element\/\d+\/polish-description$/.test(path)) {
        return interceptOfficialDescriptionPolish(input, init);
      }
      if (method === "POST" && officialTaskTypeForConfig(officialId) && /^\/api\/storyboards\/generate-section$/.test(path)) {
        return interceptOfficialStoryboardRequest(init, "generate");
      }
      if (method === "POST" && officialTaskTypeForConfig(officialId) && /^\/api\/storyboards\/regenerate-single-section$/.test(path)) {
        return interceptOfficialStoryboardRequest(init, "regenerate");
      }
      if (method === "POST" && officialTaskTypeForConfig(officialId) && /^\/api\/storyboards\/\d+\/extract-end-state(?:\?|$)/.test(path)) {
        return interceptOfficialEndStateRequest(input, init);
      }
      if (method === "POST" && requestUsesOfficialImageConfig(init)) {
        const single = path.match(/^\/api\/extraction\/element\/(\d+)\/generate-image(?:-async)?$/);
        if (single) return interceptImageRequest(input, init, single[1]);
        if (
          /\/api\/extraction\/variant\/\d+\/generate-image$/.test(path) ||
          /\/api\/extraction\/novel\/\d+\/batch-generate-images/.test(path) ||
          /\/api\/extraction\/element\/\d+\/(?:generate-grid-image|panorama\/generate)$/.test(path)
        ) {
          return jsonResponse({ success: false, message: "官方模式当前仅支持逐个确认的本体图片生成，请切换本地配置使用马甲、宫格、全景或批量功能" }, 409);
        }
      }
      const response = await previousFetch(input, init);
      // Local paid APIs are protected by a 10-minute, server-signed account
      // envelope.  If a request lands exactly after that envelope expires,
      // renew it through Electron and replay this one idempotent browser
      // request.  The renewal has no navigation/reload side effect, so an
      // editor never loses unsaved work.
      if (response && response.status === 401 && window.electronAPI && window.electronAPI.account && typeof window.electronAPI.account.me === "function") {
        let expired = false;
        try {
          const payload = await response.clone().json();
          expired = String(payload && (payload.detail || payload.message || payload.error) || "") === "account_signature_expired";
        } catch (_) {}
        if (expired) {
          try {
            const refreshed = await window.electronAPI.account.me();
            if (refreshed && refreshed.ok) return previousFetch(input, init);
          } catch (_) {}
        }
      }
      return response;
    };
  }

  function remountInitialSupportedSelector() {
    // The production bundle fetches its selectors while mounting.  This
    // adapter is intentionally loaded after the bundle's local-session
    // signer, so on a cold start the first request can otherwise cache an
    // empty list before the official option interceptor exists.  Re-mount the
    // current supported route once, immediately after this interceptor is
    // ready; no page reload and no later periodic refresh is involved.
    const rawHash = String(location.hash || "");
    const route = rawHash.toLowerCase();
    if (!officialOptionsSupportedOnCurrentPage("llm")) return;
    const routeKey = rawHash.split("?")[0];
    const storageKey = `manjuxia-official-selector-ready-v3:${routeKey}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch (_) {}
    setTimeout(() => {
      // Do not interrupt user navigation that occurred while the adapter was
      // being initialized.
      if (String(location.hash || "").split("?")[0] !== routeKey) return;
      const separator = rawHash.includes("?") ? "&" : "?";
      location.hash = `${rawHash}${separator}official_selector_ready=1`;
    }, 0);
  }

  window.manjuxiaOpenOfficialAi = openPanel;
  window.manjuxiaOfficialImageConfigId = OFFICIAL_IMAGE_CONFIG_ID;
  window.manjuxiaOfficialSeedream2ConfigId = OFFICIAL_SEEDREAM2_CONFIG_ID;
  // Global visual adjustments (including the storyboard summary suppression)
  // must be present before a user opens any official-compute dialog.
  addStyle();
  installUserFacingVideoLogLabels();
  installLightweightVideoProgressFeedback();
  installImageFetchInterceptor();
  remountInitialSupportedSelector();
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && document.getElementById(MODAL_ID)) closeModal(); });
})();
