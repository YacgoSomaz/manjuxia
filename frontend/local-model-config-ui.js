/* Reused from the GitHub development build's local-model configurator.
 * It is intentionally a modal layered onto the production Settings view. */
(() => {
  "use strict";
  const STYLE_ID = "wanshan-local-config-style";
  const BAR_ID = "wanshan-local-config-bar";
  const MODAL_ID = "wanshan-local-config-modal";
  const TYPES = [["llm", "语言大模型"], ["image", "图片大模型"], ["video", "视频大模型"], ["audio", "语音大模型"]];
  const DEFAULT_MAX_TOKENS = 65536, DEFAULT_CONTEXT_WINDOW = 131072;
  const PRODUCTION_REMOTE_HOSTS = new Set(["qianshanai.cn", "www.qianshanai.cn", "api.qianshanai.cn", "xiaoshuo.qianshanai.cn"]);
  const PRESETS = {
    llm: [
      ["deepseek", "DeepSeek 官方", "DeepSeek V4 Flash", "https://api.deepseek.com/v1", "deepseek-v4-flash"],
      ["volcengine", "火山方舟", "火山方舟", "https://ark.cn-beijing.volces.com/api/v3", "ep-请填你的接入点ID"],
      ["openai", "OpenAI 兼容", "OpenAI", "https://api.openai.com/v1", "gpt-4o-mini"],
      ["qwen", "通义千问", "通义千问", "https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-plus"],
      ["siliconflow", "硅基流动", "硅基流动", "https://api.siliconflow.cn/v1", "deepseek-ai/DeepSeek-V3"],
      ["custom", "自定义 / 中转站 OpenAI 兼容", "自定义中转站", "", ""]
    ],
    image: [
      ["volcengine-image", "火山方舟生图", "火山生图", "https://ark.cn-beijing.volces.com/api/v3", "ep-请填你的生图接入点ID"],
      ["openai-image", "OpenAI 图片", "OpenAI 图片", "https://api.openai.com/v1", "gpt-image-1"],
      ["custom-image", "自定义 / 中转站图片接口", "自定义图片中转站", "", ""]
    ],
    video: [
      ["volcengine-video", "火山方舟视频", "火山视频", "https://ark.cn-beijing.volces.com/api/v3", "ep-请填你的视频接入点ID"],
      ["newapi-video", "New API · MiniMax H3", "New API MiniMax H3", "http://120.209.70.196:8118", "minimax-H3-768p-IR"],
      ["jimeng-local", "即梦网页登录", "即梦视频", "", "seedance-2.0-fast"],
      ["custom-video", "自定义 / 中转站视频接口", "自定义视频中转站", "", ""]
    ],
    audio: [
      ["volcengine-audio", "火山方舟语音", "火山语音", "https://ark.cn-beijing.volces.com/api/v3", "ep-请填你的语音接入点ID"],
      ["openai-audio", "OpenAI 语音", "OpenAI 语音", "https://api.openai.com/v1", "tts-1"],
      ["custom-audio", "自定义 / 中转站语音接口", "自定义语音中转站", "", ""]
    ]
  };
  let currentType = "llm", configs = [], editing = null;
  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

  function blockProductionRemoteFetch() {
    if (window.__wanshanProductionRemoteFetchBlocked) return;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try { if (PRODUCTION_REMOTE_HOSTS.has(new URL(input instanceof Request ? input.url : String(input), location.href).hostname.toLowerCase())) return Promise.reject(new Error("开发迁移版已切断生产远端服务")); } catch (_) {}
      return nativeFetch(input, init);
    };
    window.__wanshanProductionRemoteFetchBlocked = true;
  }
  function style() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style"); s.id = STYLE_ID; s.textContent = `
      .wlc-btn{border:1px solid rgba(100,181,246,.38);background:rgba(100,181,246,.14);color:#e8f7ff;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:13px}.wlc-btn:hover{background:rgba(100,181,246,.24)}.wlc-btn.primary{background:#409eff;border-color:#409eff;color:#fff}.wlc-btn.danger{border-color:rgba(245,108,108,.55);background:rgba(245,108,108,.12);color:#ffd8d8}.wlc-btn:disabled{opacity:.55;cursor:not-allowed}
      .wlc-mask{position:fixed;inset:0;background:rgba(3,8,22,.72);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px}.wlc-dialog{width:min(980px,96vw);max-height:92vh;overflow:hidden;background:#111a32;border:1px solid rgba(100,181,246,.25);border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.45);color:#e8f7ff;display:flex;flex-direction:column}.wlc-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(100,181,246,.18)}.wlc-head h3{margin:0;font-size:17px}.wlc-body{display:grid;grid-template-columns:minmax(270px,340px) 1fr;gap:16px;padding:16px;overflow:auto}.wlc-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.wlc-tab{flex:1;min-width:110px}.wlc-list{display:flex;flex-direction:column;gap:8px;max-height:58vh;overflow:auto}.wlc-item{border:1px solid rgba(100,181,246,.18);border-radius:8px;padding:10px;background:rgba(255,255,255,.035);cursor:pointer}.wlc-item.active{border-color:#409eff;background:rgba(64,158,255,.16)}.wlc-item-title{font-weight:650;margin-bottom:4px}.wlc-item-meta{font-size:12px;color:rgba(220,240,255,.62);word-break:break-all}.wlc-empty{padding:24px 12px;text-align:center;color:rgba(220,240,255,.62);border:1px dashed rgba(100,181,246,.22);border-radius:8px}.wlc-form{border:1px solid rgba(100,181,246,.18);border-radius:8px;padding:14px;background:rgba(255,255,255,.025)}.wlc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.wlc-intro{margin:0 0 12px;color:rgba(220,240,255,.72);font-size:13px;line-height:1.6}.wlc-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}.wlc-field.wide{grid-column:1/-1}.wlc-field label{font-size:12px;color:rgba(220,240,255,.68)}.wlc-field input,.wlc-field select,.wlc-field textarea{box-sizing:border-box;width:100%;border:1px solid rgba(100,181,246,.24);border-radius:6px;background:#0b1328;color:#e8f7ff;padding:8px 10px;outline:none}.wlc-field textarea{min-height:70px;resize:vertical}.wlc-field small{color:rgba(220,240,255,.52)}.wlc-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;border-top:1px solid rgba(100,181,246,.16);padding-top:12px}.wlc-result{min-height:20px;margin-top:10px;font-size:12px;white-space:pre-wrap;color:#a7e3ff}.wlc-test-preview{display:block;max-width:min(100%,560px);max-height:360px;margin-top:10px;border:1px solid rgba(100,181,246,.45);border-radius:8px;background:#0b1328;object-fit:contain}.wlc-test-preview-link{display:inline-block;margin-top:8px;color:#70d6ff;font-size:12px}.wlc-inline-action{margin-left:8px}@media(max-width:760px){.wlc-body,.wlc-grid{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }
  async function api(method, path, body) {
    const bridge = window.electronAPI?.localModelConfig;
    if (!bridge?.request) throw new Error("本地模型安全桥不可用，请重启应用");
    return bridge.request({ method, path, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  async function load() { configs = await api("GET", `/api/llm-configs/?config_type=${encodeURIComponent(currentType)}&force=true&local_only=true`); if (!Array.isArray(configs)) configs = []; }
  function preset() { return PRESETS[currentType][0]; }
  function testImageUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(String(value), location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) { return ""; }
  }
  function testResultHtml(response) {
    const prefix = response?.success ? "测试成功：" : "测试失败：";
    const message = response?.message || JSON.stringify(response);
    const imageUrl = response?.success ? testImageUrl(response?.image_url) : "";
    if (!imageUrl) return `${esc(prefix + message)}${response?.response ? `<br><small>${esc(response.response)}</small>` : ""}`;
    return `${esc(prefix + message)}<br><img class="wlc-test-preview" src="${esc(imageUrl)}" alt="图片模型测试生成结果"><a class="wlc-test-preview-link" href="${esc(imageUrl)}" target="_blank" rel="noopener">在新窗口查看原图</a>`;
  }
  function editTemplate() { const c = editing || {}; const p = preset(); return {name:c.name||p[2], base_url:c.base_url||p[3], model_name:c.model_name||p[4], temperature:c.temperature??.7, max_tokens:c.max_tokens??DEFAULT_MAX_TOKENS, context_window:c.context_window??DEFAULT_CONTEXT_WINDOW, image_ratio:c.image_ratio||"16:9", generation_mode:c.generation_mode||"image2video", duration:c.duration||5, request_timeout:c.request_timeout||120, download_timeout:c.download_timeout||120, retry_count:c.retry_count??0, extra_params:c.extra_params&&c.extra_params!=="{}"?c.extra_params:""}; }
  function formHtml(v) {
    const typed = currentType === "llm" ? `<div class="wlc-field"><label>温度</label><input name="temperature" type="number" step=".1" value="${v.temperature}"></div><div class="wlc-field"><label>最大输出 Token</label><input name="max_tokens" type="number" value="${v.max_tokens}"></div><div class="wlc-field"><label>上下文窗口</label><input name="context_window" type="number" value="${v.context_window}"></div><div class="wlc-field"><label>请求超时（秒）</label><input name="request_timeout" type="number" value="${v.request_timeout}"></div><div class="wlc-field wide"><label>额外参数 JSON（通常留空）</label><textarea name="extra_params">${esc(v.extra_params)}</textarea></div>` : currentType === "image" ? `<div class="wlc-field"><label>图片比例</label><select name="image_ratio">${["16:9","9:16","1:1","4:3","3:4","2:1"].map(x=>`<option ${v.image_ratio===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="wlc-field"><label>请求超时（秒）</label><input name="request_timeout" type="number" value="${v.request_timeout}"></div><div class="wlc-field"><label>下载超时（秒）</label><input name="download_timeout" type="number" value="${v.download_timeout}"></div><div class="wlc-field"><label>重试次数</label><input name="retry_count" type="number" value="${v.retry_count}"></div>` : currentType === "video" ? `<div class="wlc-field"><label>生成模式</label><select name="generation_mode">${[["image2video","图生视频"],["text2video","文生视频"],["multimodal2video","多图/参考视频"]].map(([x,n])=>`<option value="${x}" ${v.generation_mode===x?"selected":""}>${n}</option>`).join("")}</select></div><div class="wlc-field"><label>画幅比例</label><select name="image_ratio">${["16:9","9:16","1:1","4:3","3:4"].map(x=>`<option ${v.image_ratio===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="wlc-field"><label>视频时长（秒）</label><input name="duration" type="number" value="${v.duration}"></div><div class="wlc-field"><label>请求超时（秒）</label><input name="request_timeout" type="number" value="${v.request_timeout}"></div><div class="wlc-field"><label>下载超时（秒）</label><input name="download_timeout" type="number" value="${v.download_timeout}"></div><div class="wlc-field"><label>重试次数</label><input name="retry_count" type="number" value="${v.retry_count}"></div>` : `<div class="wlc-field"><label>请求超时（秒）</label><input name="request_timeout" type="number" value="${v.request_timeout}"></div><div class="wlc-field wide"><label>额外参数 JSON（voice、speed 等）</label><textarea name="extra_params">${esc(v.extra_params)}</textarea></div>`;
    const intro = currentType === "video" ? "低代码本地配置：视频中转站可使用 HTTP 或 HTTPS 地址；填写 API Key 和模型名。配置仅保存在本机。" : "低代码本地配置：选择厂商预设后填写 API Key；中转站请选择“自定义”，填入 HTTPS API 地址、Key 和模型名。配置仅保存在本机。";
    return `<p class="wlc-intro">${intro}</p>${editing?"":`<div class="wlc-field"><label>厂商预设</label><select data-preset>${PRESETS[currentType].map(([id,n])=>`<option value="${id}">${n}</option>`).join("")}</select><small>默认参数已配好；只需填入你自己的 Key 或接入点 ID。</small></div>`}<form data-form><div class="wlc-grid"><div class="wlc-field"><label>配置名称</label><input name="name" value="${esc(v.name)}"></div><div class="wlc-field"><label>${currentType==="llm"?"语言模型 / 接入点 ID":currentType==="image"?"图片模型 / 接入点 ID":currentType==="video"?"视频模型 / 接入点 ID":"语音模型 / 接入点 ID"}</label><input name="model_name" value="${esc(v.model_name)}"></div><div class="wlc-field wide"><label>API 地址</label><input name="base_url" value="${esc(v.base_url)}"></div><div class="wlc-field wide"><label>${editing?"API Key（留空保持原值）":"API Key"}</label><input name="api_key" type="password" autocomplete="off" placeholder="仅保存到本机加密配置数据库"></div>${typed}</div><div class="wlc-actions">${editing?'<button class="wlc-btn" type="button" data-test>测试</button><button class="wlc-btn danger" type="button" data-delete>删除</button>':''}<button class="wlc-btn" type="button" data-new>新建</button><button class="wlc-btn primary" type="submit">${editing?"保存修改":"保存本地配置"}</button></div><div class="wlc-result" data-result></div></form>`;
  }
  function render() {
    style(); let mask=document.getElementById(MODAL_ID); if(!mask){mask=document.createElement("div");mask.id=MODAL_ID;mask.className="wlc-mask";document.body.append(mask);}
    const list=configs.length?configs.map(c=>`<div class="wlc-item ${editing?.id===c.id?"active":""}" data-config="${c.id}"><div class="wlc-item-title">${esc(c.name||`配置#${c.id}`)}</div><div class="wlc-item-meta">${esc(c.model_name)}</div><div class="wlc-item-meta">${esc(c.base_url)}</div></div>`).join(""):`<div class="wlc-empty">暂无${TYPES.find(x=>x[0]===currentType)[1]}配置</div>`;
    mask.innerHTML=`<div class="wlc-dialog"><div class="wlc-head"><h3>万山本地模型配置</h3><button class="wlc-btn" data-close>关闭</button></div><div class="wlc-body"><div><div class="wlc-tabs">${TYPES.map(([id,n])=>`<button class="wlc-btn wlc-tab ${currentType===id?"primary":""}" data-type="${id}">${n}</button>`).join("")}</div><div class="wlc-list">${list}</div></div><div class="wlc-form">${formHtml(editTemplate())}</div></div></div>`;
    mask.querySelector("[data-close]").onclick=close;
    mask.querySelectorAll("[data-type]").forEach(b=>b.onclick=async()=>{currentType=b.dataset.type;editing=null;await load();render();});
    mask.querySelectorAll("[data-config]").forEach(n=>n.onclick=()=>{editing=configs.find(c=>String(c.id)===n.dataset.config);render();});
    const form=mask.querySelector("[data-form]"), result=mask.querySelector("[data-result]");
    const val=n=>form.querySelector(`[name="${n}"]`)?.value.trim()||"", num=(n,d)=>{const x=Number(val(n));return Number.isFinite(x)&&x!==0?x:d};
    const applyPreset=()=>{const p=PRESETS[currentType].find(x=>x[0]===mask.querySelector("[data-preset]").value)||preset(); form.querySelector('[name="name"]').value=p[2];form.querySelector('[name="base_url"]').value=p[3];form.querySelector('[name="model_name"]').value=p[4];};
    mask.querySelector("[data-preset]")?.addEventListener("change",applyPreset);
    mask.querySelector("[data-new]").onclick=()=>{editing=null;render()};
    mask.querySelector("[data-delete]")?.addEventListener("click",async()=>{if(!confirm("确定删除这条本地模型配置吗？"))return;try{await api("DELETE",`/api/llm-configs/${editing.id}?local_only=true`);editing=null;await load();render()}catch(e){result.textContent=`删除失败：${e.message||e}`}});
    mask.querySelector("[data-test]")?.addEventListener("click",async()=>{result.textContent="正在测试…";try{const r=await api("POST",`/api/llm-configs/${editing.id}/test?local_only=true`);result.innerHTML=testResultHtml(r);}catch(e){result.textContent=`测试失败：${e.message||e}`}});
    form.onsubmit=async e=>{e.preventDefault();try{let extra={};if(val("extra_params")){try{extra=JSON.parse(val("extra_params"))}catch(_){throw new Error("额外参数必须是合法 JSON")}}const payload={name:val("name"),base_url:val("base_url"),model_name:val("model_name"),config_type:currentType,request_timeout:num("request_timeout",120),api_key:val("api_key")};if(!payload.name||!payload.model_name)throw new Error("配置名称和模型名称不能为空");if(currentType!=="video"&&(!payload.base_url||(!editing&&!payload.api_key)))throw new Error("API 地址和 API Key 不能为空");if(editing&&!payload.api_key)delete payload.api_key;if(currentType==="llm")Object.assign(payload,{temperature:num("temperature",.7),max_tokens:num("max_tokens",DEFAULT_MAX_TOKENS),context_window:num("context_window",DEFAULT_CONTEXT_WINDOW),extra_params:extra});else if(currentType==="image")Object.assign(payload,{image_ratio:val("image_ratio")||"16:9",download_timeout:num("download_timeout",120),retry_count:num("retry_count",0)});else if(currentType==="video")Object.assign(payload,{generation_mode:val("generation_mode")||"image2video",image_ratio:val("image_ratio")||"16:9",duration:num("duration",5),download_timeout:num("download_timeout",120),retry_count:num("retry_count",0)});else payload.extra_params=extra;await api(editing?"PUT":"POST",editing?`/api/llm-configs/${editing.id}?local_only=true`:"/api/llm-configs/",payload);await load();editing=null;render();}catch(err){result.textContent=`保存失败：${err.message||err}`}};
  }
  function close(){document.getElementById(MODAL_ID)?.remove()}
  async function open(type){currentType=TYPES.some(x=>x[0]===type)?type:"llm";editing=null;configs=[];render();try{await load()}catch(_){}render()}
  function removeLingyaGuide(){document.querySelectorAll(".qs-hint-link").forEach(node=>{if((node.textContent||"").includes("灵芽"))node.remove()});}
  function ensureButton(){if(location.hash!=="#/settings")return;removeLingyaGuide();const toolbar=document.querySelector(".qs-toolbar");if(!toolbar||document.getElementById(BAR_ID))return;style();const b=document.createElement("button");b.id=BAR_ID;b.className="wlc-btn primary wlc-inline-action";b.textContent="本地模型配置";b.title="管理已测试的语言、图片、视频和语音模型";b.onclick=()=>open("llm");toolbar.append(b);const banner=document.querySelector(".qs-cloud-banner");if(banner){banner.textContent="本地模型配置已启用：点击右上角“本地模型配置”管理语言、图片、视频与语音模型。";banner.style.display="block";}}
  window.manjuxiaOpenLocalModelConfig=open; blockProductionRemoteFetch();new MutationObserver(ensureButton).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener("hashchange",()=>setTimeout(ensureButton,150));setInterval(ensureButton,500);
})();
