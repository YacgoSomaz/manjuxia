const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-CHppf6so.js","./index-DcZCm4BG.css","./extraction-BqPvoFgZ.js"])))=>i.map(i=>d[i]);
import{d as kr,v as ci,o as Ec,x as Tu,k as mt,a as G,c as Ee,b as de,h as R,w as P,F as zt,z as Gt,f as Me,s as he,t as Ke,g as Fe,C as Ei,i as Nn,p as Re,y as hn,$ as Ki,a0 as Au,a1 as Ha,a2 as pa,a3 as hs,B as Wa,a4 as dl,a5 as fl,W as wu,a6 as Cu,a7 as hl,M as Ti,L as Ru,X as Pu,a8 as Du,r as Te,j as It,E as Z,A as pn,a9 as Va,S as Fn,_ as Vr,H as bc,l as Iu,aa as Lu,ab as ps,ac as ms,J as ir,ad as Uu,ae as Nu,af as Fu,ag as Ou,ah as Bu,ai as ku,U as Vu,aj as gs,Y as _s,ak as zu,al as pl,am as Gu,an as Hu}from"./index-CHppf6so.js";import{listVariants as Xo,setActiveVariant as Tc,generateVariantImage as Ac,deleteVariantFinishedImage as wc,deleteVariantImage as Wu,deleteVariantAudio as Cc,uploadVariantReferenceImage as $o,deleteVariantReferenceImage as Rc,uploadVariantAudio as qo,uploadVariantFinishedImage as Yo,addVariantWatermark as Xu,addElementWatermark as $u,appendVrScreenshotToGrid as qu,createVariant as Pc,updateVariant as ml,deleteVariant as Yu,getNovelElements as Zi,uploadAudio as gl,uploadReferenceImage as _l,uploadGridImage as vl,uploadPanorama as Ku,uploadFinishedImage as xl,createElement as Ml,saveImageStyle as vs,extractElements as Zu,updateElement as ju,getImageStyle as Sl,getElement as Ju,submitElementImageGeneration as Qu,generateGridImage as ed,deleteNovelElements as td,syncPreview as nd,syncElements as id,deleteElement as ad,generateElementImage as rd,cancelElementImage as sd,deleteElementImage as od,deleteReferenceImage as ld,deleteFinishedImage as cd,deleteGridImage as ud,deleteAudio as dd}from"./extraction-BqPvoFgZ.js";import{d as Dc}from"./download-image-B3fgqpU9.js";import{getVolcConfig as Js,getVolcAssetStatus as fd,safeDecrypt as Ic,uploadVolcAsset as hd,uploadVolcVariant as pd,getVolcVariantStatus as md}from"./extra--f11N8Ne.js";import{g as gd,s as _d,a as vd}from"./novels-DZhfIrkh.js";import{g as xd,a as yl,b as Md,r as ar,s as El}from"./llm_configs-BiH01fIy.js";const Sd={class:"element-image-section"},yd={key:0,class:"variant-bar"},Ed=["title"],bd={class:"images-row"},Td={class:"image-item main-item"},Ad={class:"image-label"},wd=["title"],Cd=["title"],Rd={key:0,class:"stop-overlay"},Pd=["title"],Dd={key:0,class:"image-item grid-item"},Id={key:1,class:"image-placeholder generating"},Ld={class:"image-item ref-item"},Ud=["title"],Nd={key:1,class:"image-item panorama-item"},Fd={key:1,class:"image-placeholder generating"},Od={key:2,class:"image-placeholder"},Bd={key:2,class:"image-item audio-item"},kd=["title"],Vd={class:"actions-row"},zd={key:0},Gd=["src"],Hd=kr({__name:"ElementImageSection",props:{element:{},selectedImageConfigId:{},generatingElements:{}},emits:["generate","deleteImage","uploadReference","deleteReference","uploadFinished","deleteFinished","generateGrid","deleteGrid","uploadGrid","uploadAudio","deleteAudio","stopGenerating","generatePanorama","uploadPanorama","openVrViewer","deletePanorama","panoramaToGrid","openVariants","variantsChanged"],setup(i,{expose:e,emit:t}){const n=i,a=t,r=Te([]),s=It(()=>{if(n.element.element_type!=="character")return null;const N=n.element.active_variant_id;return N&&r.value.find(V=>V.id===N)||null});function o(N,V=Date.now()){return N&&(N.includes("?")?`${N}&t=${V}`:`${N}?t=${V}`)}const c=It(()=>{var N;return((N=s.value)==null?void 0:N.reference_image)||n.element.reference_image}),l=It(()=>{var N;return((N=s.value)==null?void 0:N.audio_file)||n.element.audio_file}),d=It(()=>{const N=s.value;return N!=null&&N.finished_image?{url:N.finished_image,source:"variant",field:"finished_image"}:N!=null&&N.image_url?{url:N.image_url,source:"variant",field:"image_url"}:n.element.finished_image?{url:n.element.finished_image,source:"body",field:"finished_image"}:n.element.image_url?{url:n.element.image_url,source:"body",field:"image_url"}:null}),h=It(()=>{const N=d.value,V=s.value;return N?N.source==="variant"?V==null?void 0:V.image_status:n.element.image_status:V&&V.image_status?V.image_status:n.element.image_status}),u=It(()=>{const N=s.value;return!!(N&&N.reference_image)}),m=It(()=>{const N=s.value;return!!(N&&N.audio_file)}),v=It(()=>{const N=s.value;return N?!!N.finished_image:!!n.element.finished_image}),A=It(()=>{const N=s.value;return N?!!N.image_url:!!n.element.image_url}),p=It(()=>{const N=s.value;return N&&N.image_status==="generating"?"variant":n.generatingElements.has(n.element.id)||n.element.image_status==="generating"?"body":null});async function f(){if(n.element.element_type!=="character"){r.value=[];return}try{r.value=await Xo(n.element.id)}catch{r.value=[]}}ci(()=>[n.element.id,n.element.variant_count,n.element.active_variant_id],()=>f());async function y(N){const V=N&&N>0?N:null;try{if(await Tc(n.element.id,V),n.element.active_variant_id=V,V===null)n.element.active_variant_name=null,Z.success("已切回本体形象");else{const X=r.value.find($=>$.id===V);n.element.active_variant_name=(X==null?void 0:X.variant_name)||null,Z.success(`已切到「${X==null?void 0:X.variant_name}」 — 之后视频生成都用此形象`)}a("variantsChanged",n.element)}catch(X){Z.error(`切换马甲失败: ${(X==null?void 0:X.message)||X}`)}}function C(){a("openVariants",n.element)}const E=Te(null),F=Te(!1),D=Te(null),k=Te(null),x=Te(!1),w=Te(!1);let L=null,S=null,O=null;async function H(){if(O!==null){x.value=O;return}if(S){x.value=await S;return}S=(async()=>{try{O=!!(await Js()).has_credentials}catch{O=!1}return O})(),x.value=await S}async function q(){try{const N=await Js();if(!N.has_credentials)return null;const V=await Ic(N.sk_encrypted);return V?{ak:N.ak,sk:V,project:N.project_name||"default"}:null}catch(N){return console.error("[volc-asset] 拿凭证失败",N),null}}async function ee(){var N,V;if(!w.value){w.value=!0;try{const X=await q();if(!X){Z.warning("请先到「设置 → 通用设置 → 火山方舟素材库」配置 AK/SK");return}const $=await hd({element_id:n.element.id,ak:X.ak,sk:X.sk,project_name:X.project});$.success?(n.element.volc_asset_id=$.asset_id,n.element.volc_asset_uri=$.asset_uri,n.element.volc_asset_status=$.status,Z.success($.message||"已提交,审核中..."),J()):Z.error("加白失败")}catch(X){Z.error("加白失败: "+(((V=(N=X==null?void 0:X.response)==null?void 0:N.data)==null?void 0:V.detail)||(X==null?void 0:X.message)||X))}finally{w.value=!1}}}function J(){Y(),L=setInterval(async()=>{if(n.element.volc_asset_status!=="Processing"){Y();return}try{const V=await q();if(!V){Y();return}const X=await fd({asset_id:n.element.id,ak:V.ak,sk:V.sk,project_name:V.project});X.status&&X.status!=="Processing"&&(n.element.volc_asset_status=X.status,X.status==="Active"?Z.success(`${n.element.name} 已加白入库 ✅`):X.status==="Failed"&&Z.error(`${n.element.name} 加白审核失败`),Y())}catch{}},3e3)}function Y(){L&&(clearInterval(L),L=null)}Ec(()=>{H(),n.element.volc_asset_status==="Processing"&&J(),f()}),e({reloadVariants:f}),Tu(()=>{Y()});function ve(){var N,V,X;(X=(V=(N=D.value)==null?void 0:N.$el)==null?void 0:V.querySelector("input"))==null||X.click()}function _e(){var N,V,X;(X=(V=(N=k.value)==null?void 0:N.$el)==null?void 0:V.querySelector("input"))==null||X.click()}function Pe(N){return pn(N)}async function ue(){const N=s.value;if(N){if(!n.selectedImageConfigId){Z.warning('请先在顶部选择"图片模型配置"');return}N.image_status="generating";try{const V=Date.now(),X=await Ac(N.id,n.selectedImageConfigId);if(X.success){N.image_url=o(X.image_url,V),N.image_status="success",Z.success(`马甲「${N.variant_name}」生图成功`),await f();const $=r.value.find(me=>me.id===N.id);$!=null&&$.image_url&&($.image_url=o($.image_url,V))}else N.image_status="error",Z.error("生成失败: "+(X.message||"未知错误"))}catch(V){N.image_status="error",Z.error("生成失败: "+((V==null?void 0:V.message)||V))}return}a("generate",n.element)}function De(){a("stopGenerating",n.element)}function et(){a("deleteImage",n.element)}async function nt(){const N=d.value;if(N){if(N.source==="variant"){const V=s.value;try{N.field==="finished_image"?(await wc(V.id),V.finished_image=null):(await Wu(V.id),V.image_url=null,V.image_status=null),Z.success(`已删除马甲「${V.variant_name}」${N.field==="finished_image"?"成品":"生成"}图`),await f()}catch(X){Z.error("删除马甲图失败: "+((X==null?void 0:X.message)||X))}return}N.field==="finished_image"?Se():et()}}async function xt(){const N=s.value;if(N&&N.audio_file){try{await Cc(N.id),N.audio_file=null,Z.success(`已删除马甲「${N.variant_name}」音频`),await f()}catch(V){Z.error("删除马甲音频失败: "+((V==null?void 0:V.message)||V))}return}ke()}async function se(N){const V=s.value;if(V){const X=(N==null?void 0:N.raw)||N;if(!X)return;try{const $=Date.now(),me=await $o(V.id,X);V.reference_image=o(me.reference_image,$),Z.success(`已为马甲「${V.variant_name}」上传参考图`),await f();const Ce=r.value.find(ie=>ie.id===V.id);Ce!=null&&Ce.reference_image&&(Ce.reference_image=o(Ce.reference_image,$))}catch($){Z.error("上传参考图失败: "+(($==null?void 0:$.message)||$))}return}a("uploadReference",n.element,N)}async function Ae(){const N=s.value;if(N&&N.reference_image){try{await Rc(N.id),N.reference_image=null,Z.success(`已删除马甲「${N.variant_name}」参考图`),await f()}catch(V){Z.error("删除马甲参考图失败: "+((V==null?void 0:V.message)||V))}return}a("deleteReference",n.element)}async function te(N){const V=s.value;if(V){const X=(N==null?void 0:N.raw)||N;if(!X)return;try{const $=Date.now(),me=await Yo(V.id,X);V.finished_image=o(me.finished_image,$),Z.success(`已为马甲「${V.variant_name}」导入成品图`),await f();const Ce=r.value.find(ie=>ie.id===V.id);Ce!=null&&Ce.finished_image&&(Ce.finished_image=o(Ce.finished_image,$))}catch($){Z.error("上传成品图失败: "+(($==null?void 0:$.message)||$))}return}a("uploadFinished",n.element,N)}function Se(){a("deleteFinished",n.element)}function we(){a("generateGrid",n.element)}function Ge(){a("generatePanorama",n.element)}function ct(N){a("uploadPanorama",n.element,N)}function Xe(){a("openVrViewer",n.element)}function Je(){a("deletePanorama",n.element)}function Ze(){a("panoramaToGrid",n.element)}function tt(){a("deleteGrid",n.element)}function ht(N){a("uploadGrid",n.element,N)}function U(N){return pn(N)}function _t(){E.value&&(F.value?(E.value.pause(),F.value=!1):(E.value.play(),F.value=!0))}function gt(){F.value=!1}async function st(N){const V=s.value;if(V){const X=(N==null?void 0:N.raw)||N;if(!X)return;try{const $=await qo(V.id,X);V.audio_file=$.audio_file,Z.success(`已为马甲「${V.variant_name}」上传音频`),await f()}catch($){Z.error("上传音频失败: "+(($==null?void 0:$.message)||$))}return}a("uploadAudio",n.element,N)}function ke(){a("deleteAudio",n.element),F.value=!1}const b=Te(!1);async function g(){var V,X;if(b.value)return;let N=!1;try{await Fn.confirm(`是否启用「面部覆盖模式」?

• 单脸图(常规人物立绘): 关 → 居中红色"此图由AI生成"水印
• 多脸图(三视图/表情图): 开 → 每张人脸单独打小"AI"标识

不知道选哪个就关。`,"打 AI 合规标识",{confirmButtonText:"开启面部覆盖",cancelButtonText:"关闭(默认)",type:"info",distinguishCancelAndClose:!0}),N=!0}catch($){if($==="close")return;N=!1}b.value=!0;try{const $=s.value,me=$?await Xu($.id,{face_mode:N}):await $u(n.element.id,{face_mode:N});if(me.success){Z.success(($?`马甲「${$.variant_name}」`:"")+(me.message||"已打 AI 合规标识"));const Ce=Date.now();if($)me.target_field==="finished_image"&&$.finished_image?$.finished_image=$.finished_image.includes("?")?$.finished_image:`${$.finished_image}?t=${Ce}`:me.target_field==="image_url"&&$.image_url&&($.image_url=$.image_url.includes("?")?$.image_url:`${$.image_url}?t=${Ce}`),await f();else if(me.target_field==="finished_image"&&n.element.finished_image){const ie=n.element.finished_image;n.element.finished_image=ie.includes("?")?ie:`${ie}?t=${Ce}`}else if(me.target_field==="image_url"&&n.element.image_url){const ie=n.element.image_url;n.element.image_url=ie.includes("?")?ie:`${ie}?t=${Ce}`}}else Z.error("打标失败")}catch($){Z.error("打标失败: "+(((X=(V=$==null?void 0:$.response)==null?void 0:V.data)==null?void 0:X.detail)||($==null?void 0:$.message)||$))}finally{b.value=!1}}async function z(){try{const{request:N}=await Va(async()=>{const{request:me}=await import("./index-CHppf6so.js").then(Ce=>Ce.aF);return{request:me}},__vite__mapDeps([0,1]),import.meta.url),V=s.value,X=V?`/api/extraction/element/${n.element.id}/full-prompt?variant_id=${V.id}`:`/api/extraction/element/${n.element.id}/full-prompt`,$=await N(X,{method:"GET"});if(!$.success||!$.prompt){Z.warning($.message||(V?"该马甲和本体都没有描述,无法复制":"该元素没有描述,无法复制"));return}try{await navigator.clipboard.writeText($.prompt),Z.success((V?`马甲「${V.variant_name}」`:"")+"提示词已复制,可粘贴到豆包/MidJourney 等工具")}catch{const me=document.createElement("textarea");me.value=$.prompt,me.style.position="fixed",me.style.opacity="0",document.body.appendChild(me),me.select(),document.execCommand("copy"),document.body.removeChild(me),Z.success("提示词已复制")}}catch(N){Z.error("复制失败: "+(N.message||"未知错误"))}}async function oe(N,V){if(!N)return;const X=V||N.split("/").pop()||"image.png";await Dc(pn(N),X)}function pe(){const N=d.value;if(!N)return;const V=N.source==="variant"&&s.value?`_${s.value.variant_name}`:"",X=N.field==="finished_image"?"成品图":"生成图";oe(N.url,`${n.element.name}${V}_${X}.png`)}function re(){n.element.grid_image&&oe(n.element.grid_image,`${n.element.name}_宫格图.png`)}function Oe(){n.element.panorama_url&&oe(n.element.panorama_url,`${n.element.name}_全景图.png`)}function be(){const N=c.value;if(!N)return;const V=s.value?`_${s.value.variant_name}`:"";oe(N,`${n.element.name}${V}_参考图.png`)}return(N,V)=>{var ye,ge,Be,xe,le,ze,it;const X=mt("el-option"),$=mt("el-select"),me=mt("el-link"),Ce=mt("el-image"),ie=mt("el-icon"),Qe=mt("el-upload"),B=mt("el-tag");return G(),Ee("div",Sd,[i.element.element_type==="character"?(G(),Ee("div",yd,[V[1]||(V[1]=de("span",{class:"variant-label"},"马甲:",-1)),R($,{"model-value":i.element.active_variant_id??0,size:"small",class:"variant-select",onChange:y},{default:P(()=>[R(X,{value:0,label:"本体"}),(G(!0),Ee(zt,null,Gt(r.value,St=>(G(),Me(X,{key:St.id,value:St.id,label:St.variant_name},null,8,["value","label"]))),128))]),_:1},8,["model-value"]),R(me,{type:"primary",underline:!1,size:"small",onClick:C,class:"variant-manage"},{default:P(()=>[he(" 管理("+Ke(r.value.length)+") ",1)]),_:1}),i.element.active_variant_name?(G(),Ee("span",{key:0,class:"variant-tag",title:`当前生成使用「${i.element.active_variant_name}」的素材`}," 🎭 "+Ke(i.element.active_variant_name),9,Ed)):Fe("",!0)])):Fe("",!0),de("div",bd,[de("div",Td,[de("div",Ad,[he(Ke(((ye=d.value)==null?void 0:ye.field)==="finished_image"?"成品":"生成"),1),((ge=d.value)==null?void 0:ge.source)==="variant"?(G(),Ee("span",{key:0,class:"display-mark",title:`显示马甲「${(Be=s.value)==null?void 0:Be.variant_name}」`},"🎭",8,wd)):Fe("",!0)]),de("div",{class:Ei(["image-box main-box",{"has-image":!!d.value}])},[d.value?(G(),Me(Ce,{key:0,src:Pe(d.value.url),fit:"cover","preview-src-list":[Pe(d.value.url)],"preview-teleported":"",class:"element-image"},null,8,["src","preview-src-list"])):p.value?(G(),Ee("div",{key:1,class:"image-placeholder generating",onClick:V[0]||(V[0]=Nn(St=>p.value==="body"?De():void 0,["stop"])),title:p.value==="variant"?`马甲「${(xe=s.value)==null?void 0:xe.variant_name}」生图中,暂不支持取消`:"点击停止生成"},[R(ie,{class:"is-loading gen-loading"},{default:P(()=>[R(Re(hn))]),_:1}),p.value==="body"?(G(),Ee("div",Rd,[R(ie,null,{default:P(()=>[R(Re(Ki))]),_:1}),V[2]||(V[2]=de("span",null,"停止",-1))])):Fe("",!0)],8,Cd)):h.value==="error"||h.value==="failed"?(G(),Ee("div",{key:2,class:"image-placeholder error",onClick:ue,title:"点击重试"},[R(ie,null,{default:P(()=>[R(Re(Au))]),_:1})])):(G(),Ee("div",{key:3,class:"image-placeholder",onClick:ue},[R(ie,null,{default:P(()=>[R(Re(Ha))]),_:1})])),d.value?(G(),Ee("div",{key:4,class:"download-btn",onClick:Nn(pe,["stop"]),title:"下载图片"},[R(ie,null,{default:P(()=>[R(Re(pa))]),_:1})])):Fe("",!0),d.value?(G(),Ee("div",{key:5,class:"delete-btn",onClick:Nn(nt,["stop"]),title:d.value.source==="variant"?`删除马甲「${(le=s.value)==null?void 0:le.variant_name}」${d.value.field==="finished_image"?"成品":"生成"}图`:d.value.field==="finished_image"?"删除成品图":"删除生成图"},[R(ie,null,{default:P(()=>[R(Re(Ki))]),_:1})],8,Pd)):Fe("",!0)],2)]),i.element.element_type!=="character"?(G(),Ee("div",Dd,[V[4]||(V[4]=de("div",{class:"image-label grid-label-text"},"宫格",-1)),de("div",{class:Ei(["image-box grid-box",{"has-image":i.element.grid_image}])},[i.element.grid_image&&!i.element.grid_generating?(G(),Me(Ce,{key:0,src:Pe(i.element.grid_image),fit:"cover","preview-src-list":[Pe(i.element.grid_image)],"preview-teleported":"",class:"grid-image"},null,8,["src","preview-src-list"])):i.element.grid_generating?(G(),Ee("div",Id,[R(ie,{class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1}),V[3]||(V[3]=de("span",{class:"generating-text"},"生成中...",-1))])):(G(),Ee("div",{key:2,class:"image-placeholder",onClick:we},[R(ie,null,{default:P(()=>[R(Re(hs))]),_:1})])),i.element.grid_image?(G(),Ee("div",{key:3,class:"download-btn",onClick:Nn(re,["stop"]),title:"下载宫格图"},[R(ie,null,{default:P(()=>[R(Re(pa))]),_:1})])):Fe("",!0),i.element.grid_image?(G(),Ee("div",{key:4,class:"delete-btn",onClick:Nn(tt,["stop"]),title:"删除宫格图"},[R(ie,null,{default:P(()=>[R(Re(Ki))]),_:1})])):Fe("",!0)],2)])):Fe("",!0),de("div",Ld,[V[5]||(V[5]=de("div",{class:"image-label ref-label-text"},"参考",-1)),de("div",{class:Ei(["image-box ref-box",{"has-image":c.value}])},[c.value?(G(),Me(Ce,{key:0,src:Pe(c.value),fit:"cover","preview-src-list":[Pe(c.value)],"preview-teleported":"",class:"reference-image"},null,8,["src","preview-src-list"])):(G(),Ee("div",{key:1,class:"image-placeholder upload-trigger",onClick:ve},[R(ie,null,{default:P(()=>[R(Re(Wa))]),_:1})])),c.value?(G(),Ee("div",{key:2,class:"download-btn",onClick:Nn(be,["stop"]),title:"下载参考图"},[R(ie,null,{default:P(()=>[R(Re(pa))]),_:1})])):Fe("",!0),c.value?(G(),Ee("div",{key:3,class:"delete-btn",onClick:Nn(Ae,["stop"]),title:u.value?`删除马甲「${(ze=s.value)==null?void 0:ze.variant_name}」参考图`:"删除参考图"},[R(ie,null,{default:P(()=>[R(Re(Ki))]),_:1})],8,Ud)):Fe("",!0)],2)]),i.element.element_type==="scene"?(G(),Ee("div",Nd,[V[7]||(V[7]=de("div",{class:"image-label"},"全景",-1)),de("div",{class:Ei(["image-box pano-box",{"has-image":i.element.panorama_url}])},[i.element.panorama_url&&!i.element.panorama_generating?(G(),Me(Ce,{key:0,src:Pe(i.element.panorama_url),fit:"cover","preview-src-list":[Pe(i.element.panorama_url)],"preview-teleported":"",class:"pano-image"},null,8,["src","preview-src-list"])):i.element.panorama_generating?(G(),Ee("div",Fd,[R(ie,{class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1}),V[6]||(V[6]=de("span",{class:"generating-text"},"生成中...",-1))])):(G(),Ee("div",Od,[R(ie,null,{default:P(()=>[R(Re(dl))]),_:1})])),i.element.panorama_url?(G(),Ee("div",{key:3,class:"vr-btn",onClick:Nn(Xe,["stop"]),title:"VR 360° 查看"},[R(ie,null,{default:P(()=>[R(Re(fl))]),_:1})])):Fe("",!0),i.element.panorama_url?(G(),Ee("div",{key:4,class:"download-btn",onClick:Nn(Oe,["stop"]),title:"下载全景图"},[R(ie,null,{default:P(()=>[R(Re(pa))]),_:1})])):Fe("",!0)],2)])):Fe("",!0),i.element.element_type==="character"?(G(),Ee("div",Bd,[V[8]||(V[8]=de("div",{class:"image-label audio-label-text"},"音频",-1)),de("div",{class:Ei(["image-box audio-box",{"has-audio":l.value}])},[l.value?(G(),Ee("div",{key:0,class:"audio-content",onClick:_t},[R(ie,{class:Ei(["audio-icon",{"is-playing":F.value}])},{default:P(()=>[F.value?(G(),Me(Re(Cu),{key:1})):(G(),Me(Re(wu),{key:0}))]),_:1},8,["class"])])):(G(),Ee("div",{key:1,class:"image-placeholder upload-trigger",onClick:_e},[R(ie,null,{default:P(()=>[R(Re(hl))]),_:1})])),l.value?(G(),Ee("div",{key:2,class:"delete-btn audio-delete-btn",onClick:Nn(xt,["stop"]),title:m.value?`删除马甲「${(it=s.value)==null?void 0:it.variant_name}」音频`:"删除音频"},[R(ie,null,{default:P(()=>[R(Re(Ki))]),_:1})],8,kd)):Fe("",!0)],2)])):Fe("",!0)]),de("div",Vd,[(s.value?s.value.reference_image:i.element.reference_image)?Fe("",!0):(G(),Me(Qe,{key:0,ref_key:"referenceUploadRef",ref:D,"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:se,class:"action-link"},{default:P(()=>[R(me,{type:"success",underline:!1,size:"small"},{default:P(()=>[R(ie,null,{default:P(()=>[R(Re(Wa))]),_:1}),V[9]||(V[9]=he("上传参考图 ",-1))]),_:1})]),_:1},512)),v.value?Fe("",!0):(G(),Me(Qe,{key:1,"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:te,class:"action-link"},{default:P(()=>[R(me,{type:"info",underline:!1,size:"small"},{default:P(()=>[R(ie,null,{default:P(()=>[R(Re(Ti))]),_:1}),V[10]||(V[10]=he("导入成品图 ",-1))]),_:1})]),_:1})),!v.value&&(!A.value||h.value==="error"||h.value==="failed")?(G(),Me(me,{key:2,type:"primary",underline:!1,size:"small",disabled:!i.selectedImageConfigId||p.value!==null,onClick:ue,class:"action-link",title:s.value?`给马甲「${s.value.variant_name}」生图`:""},{default:P(()=>[p.value===null?(G(),Me(ie,{key:0},{default:P(()=>[R(Re(Ha))]),_:1})):(G(),Me(ie,{key:1,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})),he(" "+Ke(h.value==="error"||h.value==="failed"?"重试生成":"生成图片"),1)]),_:1},8,["disabled","title"])):Fe("",!0),i.element.element_type!=="character"&&(i.element.finished_image||i.element.image_url)?(G(),Me(me,{key:3,type:"warning",underline:!1,size:"small",disabled:i.element.grid_generating,onClick:we,class:"action-link"},{default:P(()=>[i.element.grid_generating?(G(),Me(ie,{key:1,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})):(G(),Me(ie,{key:0},{default:P(()=>[R(Re(hs))]),_:1})),V[11]||(V[11]=he(" 制作宫格图 ",-1))]),_:1},8,["disabled"])):Fe("",!0),i.element.element_type!=="character"&&!i.element.grid_image?(G(),Me(Qe,{key:4,"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:ht,class:"action-link"},{default:P(()=>[R(me,{type:"warning",underline:!1,size:"small"},{default:P(()=>[R(ie,null,{default:P(()=>[R(Re(Ti))]),_:1}),V[12]||(V[12]=he("导入宫格图 ",-1))]),_:1})]),_:1})):Fe("",!0),i.element.element_type==="scene"&&!i.element.panorama_url?(G(),Me(me,{key:5,type:"primary",underline:!1,size:"small",disabled:i.element.panorama_generating||i.element.panorama_uploading,onClick:Ge,class:"action-link",title:"用 AI 试出全景图(通用模型仅供尝试,质量推荐用 LibTV 等专业工具产出后上传)"},{default:P(()=>[i.element.panorama_generating?(G(),Me(ie,{key:1,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})):(G(),Me(ie,{key:0},{default:P(()=>[R(Re(dl))]),_:1})),V[13]||(V[13]=he(" 生成全景图 ",-1))]),_:1},8,["disabled"])):Fe("",!0),i.element.element_type==="scene"&&!i.element.panorama_url?(G(),Me(Qe,{key:6,"show-file-list":!1,"auto-upload":!1,accept:"image/png,image/jpeg,image/webp",onChange:ct,class:"action-link"},{default:P(()=>[R(me,{type:"primary",underline:!1,size:"small",disabled:i.element.panorama_uploading||i.element.panorama_generating},{default:P(()=>[i.element.panorama_uploading?(G(),Me(ie,{key:1,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})):(G(),Me(ie,{key:0},{default:P(()=>[R(Re(Ti))]),_:1})),V[14]||(V[14]=he(" 上传全景图 ",-1))]),_:1},8,["disabled"])]),_:1})):Fe("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(G(),Me(me,{key:7,type:"primary",underline:!1,size:"small",disabled:i.element.panorama_grid_building||i.element.panorama_generating||i.element.panorama_uploading,onClick:Ze,class:"action-link",title:"按每 30° 自动拆 12 张透视图,拼成 4×3 宫格写到 grid_image"},{default:P(()=>[i.element.panorama_grid_building?(G(),Me(ie,{key:1,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})):(G(),Me(ie,{key:0},{default:P(()=>[R(Re(hs))]),_:1})),V[15]||(V[15]=he(" 一键拆12视角 ",-1))]),_:1},8,["disabled"])):Fe("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(G(),Me(me,{key:8,type:"success",underline:!1,size:"small",disabled:i.element.vr_capturing||i.element.panorama_generating||i.element.panorama_uploading,onClick:Xe,class:"action-link",title:"进入 360° 查看器,自己选视角截图累加到宫格"},{default:P(()=>[R(ie,null,{default:P(()=>[R(Re(fl))]),_:1}),V[16]||(V[16]=he(" VR 查看截图 ",-1))]),_:1},8,["disabled"])):Fe("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(G(),Me(me,{key:9,type:"primary",underline:!1,size:"small",disabled:i.element.panorama_generating||i.element.panorama_uploading,onClick:Ge,class:"action-link",title:"重新生成一张全景图"},{default:P(()=>[i.element.panorama_generating?(G(),Me(ie,{key:1,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})):(G(),Me(ie,{key:0},{default:P(()=>[R(Re(Ru))]),_:1})),V[17]||(V[17]=he(" 重新生成 ",-1))]),_:1},8,["disabled"])):Fe("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(G(),Me(Qe,{key:10,"show-file-list":!1,"auto-upload":!1,accept:"image/png,image/jpeg,image/webp",onChange:ct,class:"action-link"},{default:P(()=>[R(me,{type:"primary",underline:!1,size:"small",disabled:i.element.panorama_uploading||i.element.panorama_generating,title:"用新的全景图替换"},{default:P(()=>[i.element.panorama_uploading?(G(),Me(ie,{key:1,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})):(G(),Me(ie,{key:0},{default:P(()=>[R(Re(Ti))]),_:1})),V[18]||(V[18]=he(" 上传替换 ",-1))]),_:1},8,["disabled"])]),_:1})):Fe("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(G(),Me(me,{key:11,type:"danger",underline:!1,size:"small",disabled:i.element.panorama_generating||i.element.panorama_uploading,onClick:Je,class:"action-link"},{default:P(()=>[R(ie,null,{default:P(()=>[R(Re(Ki))]),_:1}),V[19]||(V[19]=he(" 清除全景 ",-1))]),_:1},8,["disabled"])):Fe("",!0),(i.element.finished_image||i.element.image_url)&&x.value&&(!i.element.volc_asset_status||i.element.volc_asset_status==="Failed")?(G(),Me(me,{key:12,type:"primary",underline:!1,size:"small",disabled:w.value,onClick:ee,class:"action-link"},{default:P(()=>[w.value?(G(),Me(ie,{key:1,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})):(G(),Ee("span",zd,"🔐 "+Ke(i.element.volc_asset_status==="Failed"?"重试加白":"加白入库"),1))]),_:1},8,["disabled"])):i.element.volc_asset_status==="Processing"?(G(),Me(B,{key:13,type:"warning",size:"small",class:"action-link",title:"火山审核中,自动 2 秒轮询..."},{default:P(()=>[...V[20]||(V[20]=[he(" ⏳ 加白审核中 ",-1)])]),_:1})):i.element.volc_asset_status==="Active"?(G(),Me(B,{key:14,type:"success",size:"small",class:"action-link",title:"已加白入库,视频生成时会自动用 "+i.element.volc_asset_uri},{default:P(()=>[...V[21]||(V[21]=[he(" 🔒 已加白 ",-1)])]),_:1},8,["title"])):Fe("",!0),i.element.element_type==="character"&&!i.element.audio_file?(G(),Me(Qe,{key:15,ref_key:"audioUploadRef",ref:k,"show-file-list":!1,"auto-upload":!1,accept:"audio/*",onChange:st,class:"action-link"},{default:P(()=>[R(me,{type:"success",underline:!1,size:"small"},{default:P(()=>[R(ie,null,{default:P(()=>[R(Re(hl))]),_:1}),V[22]||(V[22]=he("导入音频 ",-1))]),_:1})]),_:1},512)):Fe("",!0),R(me,{type:"info",underline:!1,size:"small",onClick:z,class:"action-link",title:"复制风格+描述的完整提示词,粘贴到豆包/MidJourney 等外部工具"},{default:P(()=>[R(ie,null,{default:P(()=>[R(Re(Pu))]),_:1}),V[23]||(V[23]=he("复制提示词 ",-1))]),_:1}),i.element.element_type==="character"&&(i.element.finished_image||i.element.image_url)?(G(),Me(me,{key:16,type:"warning",underline:!1,size:"small",onClick:g,disabled:b.value,class:"action-link",title:"给当前人物图打『此图由AI生成』红色半透明水印,规避即梦真人审核(多脸图选面部覆盖模式)"},{default:P(()=>[b.value?(G(),Me(ie,{key:0,class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1})):(G(),Me(ie,{key:1},{default:P(()=>[R(Re(Du))]),_:1})),he(" "+Ke(b.value?"打标中...":"打 AI 标"),1)]),_:1},8,["disabled"])):Fe("",!0)]),R(Qe,{ref_key:"referenceUploadRef",ref:D,"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:se,style:{display:"none"}},null,512),R(Qe,{ref_key:"audioUploadRef",ref:k,"show-file-list":!1,"auto-upload":!1,accept:"audio/*",onChange:st,style:{display:"none"}},null,512),de("audio",{ref_key:"audioPlayer",ref:E,src:l.value?U(l.value):"",onEnded:gt,style:{display:"none"}},null,40,Gd)])}}}),xs=Vr(Hd,[["__scopeId","data-v-f574f0d2"]]);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Ko="183",Wd=0,bl=1,Xd=2,Pr=1,$d=2,za=3,wi=0,mn=1,li=2,di=0,ma=1,Tl=2,Al=3,wl=4,qd=5,ki=100,Yd=101,Kd=102,Zd=103,jd=104,Jd=200,Qd=201,ef=202,tf=203,Qs=204,eo=205,nf=206,af=207,rf=208,sf=209,of=210,lf=211,cf=212,uf=213,df=214,to=0,no=1,io=2,_a=3,ao=4,ro=5,so=6,oo=7,Lc=0,ff=1,hf=2,Zn=0,Uc=1,Nc=2,Fc=3,Oc=4,Bc=5,kc=6,Vc=7,zc=300,Hi=301,va=302,Ms=303,Ss=304,zr=306,lo=1e3,ui=1001,co=1002,en=1003,pf=1004,rr=1005,sn=1006,ys=1007,zi=1008,An=1009,Gc=1010,Hc=1011,qa=1012,Zo=1013,Qn=1014,Yn=1015,hi=1016,jo=1017,Jo=1018,Ya=1020,Wc=35902,Xc=35899,$c=1021,qc=1022,Bn=1023,pi=1026,Gi=1027,Yc=1028,Qo=1029,xa=1030,el=1031,tl=1033,Dr=33776,Ir=33777,Lr=33778,Ur=33779,uo=35840,fo=35841,ho=35842,po=35843,mo=36196,go=37492,_o=37496,vo=37488,xo=37489,Mo=37490,So=37491,yo=37808,Eo=37809,bo=37810,To=37811,Ao=37812,wo=37813,Co=37814,Ro=37815,Po=37816,Do=37817,Io=37818,Lo=37819,Uo=37820,No=37821,Fo=36492,Oo=36494,Bo=36495,ko=36283,Vo=36284,zo=36285,Go=36286,mf=3200,gf=0,_f=1,bi="",xn="srgb",Ma="srgb-linear",Fr="linear",Pt="srgb",ji=7680,Cl=519,vf=512,xf=513,Mf=514,nl=515,Sf=516,yf=517,il=518,Ef=519,Rl=35044,Pl="300 es",Kn=2e3,Or=2001;function bf(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Ka(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Tf(){const i=Ka("canvas");return i.style.display="block",i}const Dl={};function Il(...i){const e="THREE."+i.shift();console.log(e,...i)}function Kc(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function lt(...i){i=Kc(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function bt(...i){i=Kc(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function Br(...i){const e=i.join(" ");e in Dl||(Dl[e]=!0,lt(...i))}function Af(i,e,t){return new Promise(function(n,a){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const wf={[to]:no,[io]:so,[ao]:oo,[_a]:ro,[no]:to,[so]:io,[oo]:ao,[ro]:_a};class ya{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const a=n[e];if(a!==void 0){const r=a.indexOf(t);r!==-1&&a.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const a=n.slice(0);for(let r=0,s=a.length;r<s;r++)a[r].call(this,e);e.target=null}}}const an=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ll=1234567;const Xa=Math.PI/180,Za=180/Math.PI;function Ea(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(an[i&255]+an[i>>8&255]+an[i>>16&255]+an[i>>24&255]+"-"+an[e&255]+an[e>>8&255]+"-"+an[e>>16&15|64]+an[e>>24&255]+"-"+an[t&63|128]+an[t>>8&255]+"-"+an[t>>16&255]+an[t>>24&255]+an[n&255]+an[n>>8&255]+an[n>>16&255]+an[n>>24&255]).toLowerCase()}function vt(i,e,t){return Math.max(e,Math.min(t,i))}function al(i,e){return(i%e+e)%e}function Cf(i,e,t,n,a){return n+(i-e)*(a-n)/(t-e)}function Rf(i,e,t){return i!==e?(t-i)/(e-i):0}function $a(i,e,t){return(1-t)*i+t*e}function Pf(i,e,t,n){return $a(i,e,1-Math.exp(-t*n))}function Df(i,e=1){return e-Math.abs(al(i,e*2)-e)}function If(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Lf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Uf(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Nf(i,e){return i+Math.random()*(e-i)}function Ff(i){return i*(.5-Math.random())}function Of(i){i!==void 0&&(Ll=i);let e=Ll+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Bf(i){return i*Xa}function kf(i){return i*Za}function Vf(i){return(i&i-1)===0&&i!==0}function zf(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Gf(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Hf(i,e,t,n,a){const r=Math.cos,s=Math.sin,o=r(t/2),c=s(t/2),l=r((e+n)/2),d=s((e+n)/2),h=r((e-n)/2),u=s((e-n)/2),m=r((n-e)/2),v=s((n-e)/2);switch(a){case"XYX":i.set(o*d,c*h,c*u,o*l);break;case"YZY":i.set(c*u,o*d,c*h,o*l);break;case"ZXZ":i.set(c*h,c*u,o*d,o*l);break;case"XZX":i.set(o*d,c*v,c*m,o*l);break;case"YXY":i.set(c*m,o*d,c*v,o*l);break;case"ZYZ":i.set(c*v,c*m,o*d,o*l);break;default:lt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+a)}}function ha(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function un(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Ul={DEG2RAD:Xa,RAD2DEG:Za,generateUUID:Ea,clamp:vt,euclideanModulo:al,mapLinear:Cf,inverseLerp:Rf,lerp:$a,damp:Pf,pingpong:Df,smoothstep:If,smootherstep:Lf,randInt:Uf,randFloat:Nf,randFloatSpread:Ff,seededRandom:Of,degToRad:Bf,radToDeg:kf,isPowerOfTwo:Vf,ceilPowerOfTwo:zf,floorPowerOfTwo:Gf,setQuaternionFromProperEuler:Hf,normalize:un,denormalize:ha};class Ut{constructor(e=0,t=0){Ut.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,a=e.elements;return this.x=a[0]*t+a[3]*n+a[6],this.y=a[1]*t+a[4]*n+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=vt(this.x,e.x,t.x),this.y=vt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=vt(this.x,e,t),this.y=vt(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(vt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(vt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),a=Math.sin(t),r=this.x-e.x,s=this.y-e.y;return this.x=r*n-s*a+e.x,this.y=r*a+s*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class ba{constructor(e=0,t=0,n=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=a}static slerpFlat(e,t,n,a,r,s,o){let c=n[a+0],l=n[a+1],d=n[a+2],h=n[a+3],u=r[s+0],m=r[s+1],v=r[s+2],A=r[s+3];if(h!==A||c!==u||l!==m||d!==v){let p=c*u+l*m+d*v+h*A;p<0&&(u=-u,m=-m,v=-v,A=-A,p=-p);let f=1-o;if(p<.9995){const y=Math.acos(p),C=Math.sin(y);f=Math.sin(f*y)/C,o=Math.sin(o*y)/C,c=c*f+u*o,l=l*f+m*o,d=d*f+v*o,h=h*f+A*o}else{c=c*f+u*o,l=l*f+m*o,d=d*f+v*o,h=h*f+A*o;const y=1/Math.sqrt(c*c+l*l+d*d+h*h);c*=y,l*=y,d*=y,h*=y}}e[t]=c,e[t+1]=l,e[t+2]=d,e[t+3]=h}static multiplyQuaternionsFlat(e,t,n,a,r,s){const o=n[a],c=n[a+1],l=n[a+2],d=n[a+3],h=r[s],u=r[s+1],m=r[s+2],v=r[s+3];return e[t]=o*v+d*h+c*m-l*u,e[t+1]=c*v+d*u+l*h-o*m,e[t+2]=l*v+d*m+o*u-c*h,e[t+3]=d*v-o*h-c*u-l*m,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,a){return this._x=e,this._y=t,this._z=n,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,a=e._y,r=e._z,s=e._order,o=Math.cos,c=Math.sin,l=o(n/2),d=o(a/2),h=o(r/2),u=c(n/2),m=c(a/2),v=c(r/2);switch(s){case"XYZ":this._x=u*d*h+l*m*v,this._y=l*m*h-u*d*v,this._z=l*d*v+u*m*h,this._w=l*d*h-u*m*v;break;case"YXZ":this._x=u*d*h+l*m*v,this._y=l*m*h-u*d*v,this._z=l*d*v-u*m*h,this._w=l*d*h+u*m*v;break;case"ZXY":this._x=u*d*h-l*m*v,this._y=l*m*h+u*d*v,this._z=l*d*v+u*m*h,this._w=l*d*h-u*m*v;break;case"ZYX":this._x=u*d*h-l*m*v,this._y=l*m*h+u*d*v,this._z=l*d*v-u*m*h,this._w=l*d*h+u*m*v;break;case"YZX":this._x=u*d*h+l*m*v,this._y=l*m*h+u*d*v,this._z=l*d*v-u*m*h,this._w=l*d*h-u*m*v;break;case"XZY":this._x=u*d*h-l*m*v,this._y=l*m*h-u*d*v,this._z=l*d*v+u*m*h,this._w=l*d*h+u*m*v;break;default:lt("Quaternion: .setFromEuler() encountered an unknown order: "+s)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,a=Math.sin(n);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],a=t[4],r=t[8],s=t[1],o=t[5],c=t[9],l=t[2],d=t[6],h=t[10],u=n+o+h;if(u>0){const m=.5/Math.sqrt(u+1);this._w=.25/m,this._x=(d-c)*m,this._y=(r-l)*m,this._z=(s-a)*m}else if(n>o&&n>h){const m=2*Math.sqrt(1+n-o-h);this._w=(d-c)/m,this._x=.25*m,this._y=(a+s)/m,this._z=(r+l)/m}else if(o>h){const m=2*Math.sqrt(1+o-n-h);this._w=(r-l)/m,this._x=(a+s)/m,this._y=.25*m,this._z=(c+d)/m}else{const m=2*Math.sqrt(1+h-n-o);this._w=(s-a)/m,this._x=(r+l)/m,this._y=(c+d)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(vt(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const a=Math.min(1,t/n);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,a=e._y,r=e._z,s=e._w,o=t._x,c=t._y,l=t._z,d=t._w;return this._x=n*d+s*o+a*l-r*c,this._y=a*d+s*c+r*o-n*l,this._z=r*d+s*l+n*c-a*o,this._w=s*d-n*o-a*c-r*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,a=e._y,r=e._z,s=e._w,o=this.dot(e);o<0&&(n=-n,a=-a,r=-r,s=-s,o=-o);let c=1-t;if(o<.9995){const l=Math.acos(o),d=Math.sin(l);c=Math.sin(c*l)/d,t=Math.sin(t*l)/d,this._x=this._x*c+n*t,this._y=this._y*c+a*t,this._z=this._z*c+r*t,this._w=this._w*c+s*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+a*t,this._z=this._z*c+r*t,this._w=this._w*c+s*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),a=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(a*Math.sin(e),a*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class ne{constructor(e=0,t=0,n=0){ne.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Nl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Nl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,a=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*a,this.y=r[1]*t+r[4]*n+r[7]*a,this.z=r[2]*t+r[5]*n+r[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,a=this.z,r=e.elements,s=1/(r[3]*t+r[7]*n+r[11]*a+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*a+r[12])*s,this.y=(r[1]*t+r[5]*n+r[9]*a+r[13])*s,this.z=(r[2]*t+r[6]*n+r[10]*a+r[14])*s,this}applyQuaternion(e){const t=this.x,n=this.y,a=this.z,r=e.x,s=e.y,o=e.z,c=e.w,l=2*(s*a-o*n),d=2*(o*t-r*a),h=2*(r*n-s*t);return this.x=t+c*l+s*h-o*d,this.y=n+c*d+o*l-r*h,this.z=a+c*h+r*d-s*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,a=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*a,this.y=r[1]*t+r[5]*n+r[9]*a,this.z=r[2]*t+r[6]*n+r[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=vt(this.x,e.x,t.x),this.y=vt(this.y,e.y,t.y),this.z=vt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=vt(this.x,e,t),this.y=vt(this.y,e,t),this.z=vt(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(vt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,a=e.y,r=e.z,s=t.x,o=t.y,c=t.z;return this.x=a*c-r*o,this.y=r*s-n*c,this.z=n*o-a*s,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Es.copy(this).projectOnVector(e),this.sub(Es)}reflect(e){return this.sub(Es.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(vt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,a=this.z-e.z;return t*t+n*n+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const a=Math.sin(t)*e;return this.x=a*Math.sin(n),this.y=Math.cos(t)*e,this.z=a*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Es=new ne,Nl=new ba;class ft{constructor(e,t,n,a,r,s,o,c,l){ft.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,a,r,s,o,c,l)}set(e,t,n,a,r,s,o,c,l){const d=this.elements;return d[0]=e,d[1]=a,d[2]=o,d[3]=t,d[4]=r,d[5]=c,d[6]=n,d[7]=s,d[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,a=t.elements,r=this.elements,s=n[0],o=n[3],c=n[6],l=n[1],d=n[4],h=n[7],u=n[2],m=n[5],v=n[8],A=a[0],p=a[3],f=a[6],y=a[1],C=a[4],E=a[7],F=a[2],D=a[5],k=a[8];return r[0]=s*A+o*y+c*F,r[3]=s*p+o*C+c*D,r[6]=s*f+o*E+c*k,r[1]=l*A+d*y+h*F,r[4]=l*p+d*C+h*D,r[7]=l*f+d*E+h*k,r[2]=u*A+m*y+v*F,r[5]=u*p+m*C+v*D,r[8]=u*f+m*E+v*k,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],a=e[2],r=e[3],s=e[4],o=e[5],c=e[6],l=e[7],d=e[8];return t*s*d-t*o*l-n*r*d+n*o*c+a*r*l-a*s*c}invert(){const e=this.elements,t=e[0],n=e[1],a=e[2],r=e[3],s=e[4],o=e[5],c=e[6],l=e[7],d=e[8],h=d*s-o*l,u=o*c-d*r,m=l*r-s*c,v=t*h+n*u+a*m;if(v===0)return this.set(0,0,0,0,0,0,0,0,0);const A=1/v;return e[0]=h*A,e[1]=(a*l-d*n)*A,e[2]=(o*n-a*s)*A,e[3]=u*A,e[4]=(d*t-a*c)*A,e[5]=(a*r-o*t)*A,e[6]=m*A,e[7]=(n*c-l*t)*A,e[8]=(s*t-n*r)*A,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,a,r,s,o){const c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*s+l*o)+s+e,-a*l,a*c,-a*(-l*s+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(bs.makeScale(e,t)),this}rotate(e){return this.premultiply(bs.makeRotation(-e)),this}translate(e,t){return this.premultiply(bs.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let a=0;a<9;a++)if(t[a]!==n[a])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const bs=new ft,Fl=new ft().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Ol=new ft().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Wf(){const i={enabled:!0,workingColorSpace:Ma,spaces:{},convert:function(a,r,s){return this.enabled===!1||r===s||!r||!s||(this.spaces[r].transfer===Pt&&(a.r=fi(a.r),a.g=fi(a.g),a.b=fi(a.b)),this.spaces[r].primaries!==this.spaces[s].primaries&&(a.applyMatrix3(this.spaces[r].toXYZ),a.applyMatrix3(this.spaces[s].fromXYZ)),this.spaces[s].transfer===Pt&&(a.r=ga(a.r),a.g=ga(a.g),a.b=ga(a.b))),a},workingToColorSpace:function(a,r){return this.convert(a,this.workingColorSpace,r)},colorSpaceToWorking:function(a,r){return this.convert(a,r,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===bi?Fr:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,r=this.workingColorSpace){return a.fromArray(this.spaces[r].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,r,s){return a.copy(this.spaces[r].toXYZ).multiply(this.spaces[s].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,r){return Br("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,r)},toWorkingColorSpace:function(a,r){return Br("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Ma]:{primaries:e,whitePoint:n,transfer:Fr,toXYZ:Fl,fromXYZ:Ol,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:xn},outputColorSpaceConfig:{drawingBufferColorSpace:xn}},[xn]:{primaries:e,whitePoint:n,transfer:Pt,toXYZ:Fl,fromXYZ:Ol,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:xn}}}),i}const yt=Wf();function fi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function ga(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ji;class Xf{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Ji===void 0&&(Ji=Ka("canvas")),Ji.width=e.width,Ji.height=e.height;const a=Ji.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),n=Ji}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Ka("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const a=n.getImageData(0,0,e.width,e.height),r=a.data;for(let s=0;s<r.length;s++)r[s]=fi(r[s]/255)*255;return n.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(fi(t[n]/255)*255):t[n]=fi(t[n]);return{data:t,width:e.width,height:e.height}}else return lt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let $f=0;class rl{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:$f++}),this.uuid=Ea(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},a=this.data;if(a!==null){let r;if(Array.isArray(a)){r=[];for(let s=0,o=a.length;s<o;s++)a[s].isDataTexture?r.push(Ts(a[s].image)):r.push(Ts(a[s]))}else r=Ts(a);n.url=r}return t||(e.images[this.uuid]=n),n}}function Ts(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Xf.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(lt("Texture: Unable to serialize Texture."),{})}let qf=0;const As=new ne;class on extends ya{constructor(e=on.DEFAULT_IMAGE,t=on.DEFAULT_MAPPING,n=ui,a=ui,r=sn,s=zi,o=Bn,c=An,l=on.DEFAULT_ANISOTROPY,d=bi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:qf++}),this.uuid=Ea(),this.name="",this.source=new rl(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=a,this.magFilter=r,this.minFilter=s,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new Ut(0,0),this.repeat=new Ut(1,1),this.center=new Ut(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new ft,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=d,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(As).x}get height(){return this.source.getSize(As).y}get depth(){return this.source.getSize(As).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){lt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&n&&a.isVector2&&n.isVector2||a&&n&&a.isVector3&&n.isVector3||a&&n&&a.isMatrix3&&n.isMatrix3?a.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==zc)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case lo:e.x=e.x-Math.floor(e.x);break;case ui:e.x=e.x<0?0:1;break;case co:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case lo:e.y=e.y-Math.floor(e.y);break;case ui:e.y=e.y<0?0:1;break;case co:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}on.DEFAULT_IMAGE=null;on.DEFAULT_MAPPING=zc;on.DEFAULT_ANISOTROPY=1;class Ht{constructor(e=0,t=0,n=0,a=1){Ht.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,a){return this.x=e,this.y=t,this.z=n,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,a=this.z,r=this.w,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*a+s[12]*r,this.y=s[1]*t+s[5]*n+s[9]*a+s[13]*r,this.z=s[2]*t+s[6]*n+s[10]*a+s[14]*r,this.w=s[3]*t+s[7]*n+s[11]*a+s[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,a,r;const c=e.elements,l=c[0],d=c[4],h=c[8],u=c[1],m=c[5],v=c[9],A=c[2],p=c[6],f=c[10];if(Math.abs(d-u)<.01&&Math.abs(h-A)<.01&&Math.abs(v-p)<.01){if(Math.abs(d+u)<.1&&Math.abs(h+A)<.1&&Math.abs(v+p)<.1&&Math.abs(l+m+f-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const C=(l+1)/2,E=(m+1)/2,F=(f+1)/2,D=(d+u)/4,k=(h+A)/4,x=(v+p)/4;return C>E&&C>F?C<.01?(n=0,a=.707106781,r=.707106781):(n=Math.sqrt(C),a=D/n,r=k/n):E>F?E<.01?(n=.707106781,a=0,r=.707106781):(a=Math.sqrt(E),n=D/a,r=x/a):F<.01?(n=.707106781,a=.707106781,r=0):(r=Math.sqrt(F),n=k/r,a=x/r),this.set(n,a,r,t),this}let y=Math.sqrt((p-v)*(p-v)+(h-A)*(h-A)+(u-d)*(u-d));return Math.abs(y)<.001&&(y=1),this.x=(p-v)/y,this.y=(h-A)/y,this.z=(u-d)/y,this.w=Math.acos((l+m+f-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=vt(this.x,e.x,t.x),this.y=vt(this.y,e.y,t.y),this.z=vt(this.z,e.z,t.z),this.w=vt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=vt(this.x,e,t),this.y=vt(this.y,e,t),this.z=vt(this.z,e,t),this.w=vt(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(vt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Yf extends ya{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:sn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Ht(0,0,e,t),this.scissorTest=!1,this.viewport=new Ht(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:n.depth},r=new on(a),s=n.count;for(let o=0;o<s;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:sn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let a=0,r=this.textures.length;a<r;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=n,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new rl(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class jn extends Yf{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Zc extends on{constructor(e=null,t=1,n=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:a},this.magFilter=en,this.minFilter=en,this.wrapR=ui,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Kf extends on{constructor(e=null,t=1,n=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:a},this.magFilter=en,this.minFilter=en,this.wrapR=ui,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class $t{constructor(e,t,n,a,r,s,o,c,l,d,h,u,m,v,A,p){$t.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,a,r,s,o,c,l,d,h,u,m,v,A,p)}set(e,t,n,a,r,s,o,c,l,d,h,u,m,v,A,p){const f=this.elements;return f[0]=e,f[4]=t,f[8]=n,f[12]=a,f[1]=r,f[5]=s,f[9]=o,f[13]=c,f[2]=l,f[6]=d,f[10]=h,f[14]=u,f[3]=m,f[7]=v,f[11]=A,f[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new $t().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();const t=this.elements,n=e.elements,a=1/Qi.setFromMatrixColumn(e,0).length(),r=1/Qi.setFromMatrixColumn(e,1).length(),s=1/Qi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*a,t[1]=n[1]*a,t[2]=n[2]*a,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*s,t[9]=n[9]*s,t[10]=n[10]*s,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,a=e.y,r=e.z,s=Math.cos(n),o=Math.sin(n),c=Math.cos(a),l=Math.sin(a),d=Math.cos(r),h=Math.sin(r);if(e.order==="XYZ"){const u=s*d,m=s*h,v=o*d,A=o*h;t[0]=c*d,t[4]=-c*h,t[8]=l,t[1]=m+v*l,t[5]=u-A*l,t[9]=-o*c,t[2]=A-u*l,t[6]=v+m*l,t[10]=s*c}else if(e.order==="YXZ"){const u=c*d,m=c*h,v=l*d,A=l*h;t[0]=u+A*o,t[4]=v*o-m,t[8]=s*l,t[1]=s*h,t[5]=s*d,t[9]=-o,t[2]=m*o-v,t[6]=A+u*o,t[10]=s*c}else if(e.order==="ZXY"){const u=c*d,m=c*h,v=l*d,A=l*h;t[0]=u-A*o,t[4]=-s*h,t[8]=v+m*o,t[1]=m+v*o,t[5]=s*d,t[9]=A-u*o,t[2]=-s*l,t[6]=o,t[10]=s*c}else if(e.order==="ZYX"){const u=s*d,m=s*h,v=o*d,A=o*h;t[0]=c*d,t[4]=v*l-m,t[8]=u*l+A,t[1]=c*h,t[5]=A*l+u,t[9]=m*l-v,t[2]=-l,t[6]=o*c,t[10]=s*c}else if(e.order==="YZX"){const u=s*c,m=s*l,v=o*c,A=o*l;t[0]=c*d,t[4]=A-u*h,t[8]=v*h+m,t[1]=h,t[5]=s*d,t[9]=-o*d,t[2]=-l*d,t[6]=m*h+v,t[10]=u-A*h}else if(e.order==="XZY"){const u=s*c,m=s*l,v=o*c,A=o*l;t[0]=c*d,t[4]=-h,t[8]=l*d,t[1]=u*h+A,t[5]=s*d,t[9]=m*h-v,t[2]=v*h-m,t[6]=o*d,t[10]=A*h+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Zf,e,jf)}lookAt(e,t,n){const a=this.elements;return _n.subVectors(e,t),_n.lengthSq()===0&&(_n.z=1),_n.normalize(),_i.crossVectors(n,_n),_i.lengthSq()===0&&(Math.abs(n.z)===1?_n.x+=1e-4:_n.z+=1e-4,_n.normalize(),_i.crossVectors(n,_n)),_i.normalize(),sr.crossVectors(_n,_i),a[0]=_i.x,a[4]=sr.x,a[8]=_n.x,a[1]=_i.y,a[5]=sr.y,a[9]=_n.y,a[2]=_i.z,a[6]=sr.z,a[10]=_n.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,a=t.elements,r=this.elements,s=n[0],o=n[4],c=n[8],l=n[12],d=n[1],h=n[5],u=n[9],m=n[13],v=n[2],A=n[6],p=n[10],f=n[14],y=n[3],C=n[7],E=n[11],F=n[15],D=a[0],k=a[4],x=a[8],w=a[12],L=a[1],S=a[5],O=a[9],H=a[13],q=a[2],ee=a[6],J=a[10],Y=a[14],ve=a[3],_e=a[7],Pe=a[11],ue=a[15];return r[0]=s*D+o*L+c*q+l*ve,r[4]=s*k+o*S+c*ee+l*_e,r[8]=s*x+o*O+c*J+l*Pe,r[12]=s*w+o*H+c*Y+l*ue,r[1]=d*D+h*L+u*q+m*ve,r[5]=d*k+h*S+u*ee+m*_e,r[9]=d*x+h*O+u*J+m*Pe,r[13]=d*w+h*H+u*Y+m*ue,r[2]=v*D+A*L+p*q+f*ve,r[6]=v*k+A*S+p*ee+f*_e,r[10]=v*x+A*O+p*J+f*Pe,r[14]=v*w+A*H+p*Y+f*ue,r[3]=y*D+C*L+E*q+F*ve,r[7]=y*k+C*S+E*ee+F*_e,r[11]=y*x+C*O+E*J+F*Pe,r[15]=y*w+C*H+E*Y+F*ue,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],a=e[8],r=e[12],s=e[1],o=e[5],c=e[9],l=e[13],d=e[2],h=e[6],u=e[10],m=e[14],v=e[3],A=e[7],p=e[11],f=e[15],y=c*m-l*u,C=o*m-l*h,E=o*u-c*h,F=s*m-l*d,D=s*u-c*d,k=s*h-o*d;return t*(A*y-p*C+f*E)-n*(v*y-p*F+f*D)+a*(v*C-A*F+f*k)-r*(v*E-A*D+p*k)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],a=e[2],r=e[3],s=e[4],o=e[5],c=e[6],l=e[7],d=e[8],h=e[9],u=e[10],m=e[11],v=e[12],A=e[13],p=e[14],f=e[15],y=t*o-n*s,C=t*c-a*s,E=t*l-r*s,F=n*c-a*o,D=n*l-r*o,k=a*l-r*c,x=d*A-h*v,w=d*p-u*v,L=d*f-m*v,S=h*p-u*A,O=h*f-m*A,H=u*f-m*p,q=y*H-C*O+E*S+F*L-D*w+k*x;if(q===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const ee=1/q;return e[0]=(o*H-c*O+l*S)*ee,e[1]=(a*O-n*H-r*S)*ee,e[2]=(A*k-p*D+f*F)*ee,e[3]=(u*D-h*k-m*F)*ee,e[4]=(c*L-s*H-l*w)*ee,e[5]=(t*H-a*L+r*w)*ee,e[6]=(p*E-v*k-f*C)*ee,e[7]=(d*k-u*E+m*C)*ee,e[8]=(s*O-o*L+l*x)*ee,e[9]=(n*L-t*O-r*x)*ee,e[10]=(v*D-A*E+f*y)*ee,e[11]=(h*E-d*D-m*y)*ee,e[12]=(o*w-s*S-c*x)*ee,e[13]=(t*S-n*w+a*x)*ee,e[14]=(A*C-v*F-p*y)*ee,e[15]=(d*F-h*C+u*y)*ee,this}scale(e){const t=this.elements,n=e.x,a=e.y,r=e.z;return t[0]*=n,t[4]*=a,t[8]*=r,t[1]*=n,t[5]*=a,t[9]*=r,t[2]*=n,t[6]*=a,t[10]*=r,t[3]*=n,t[7]*=a,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,a))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),a=Math.sin(t),r=1-n,s=e.x,o=e.y,c=e.z,l=r*s,d=r*o;return this.set(l*s+n,l*o-a*c,l*c+a*o,0,l*o+a*c,d*o+n,d*c-a*s,0,l*c-a*o,d*c+a*s,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,a,r,s){return this.set(1,n,r,0,e,1,s,0,t,a,1,0,0,0,0,1),this}compose(e,t,n){const a=this.elements,r=t._x,s=t._y,o=t._z,c=t._w,l=r+r,d=s+s,h=o+o,u=r*l,m=r*d,v=r*h,A=s*d,p=s*h,f=o*h,y=c*l,C=c*d,E=c*h,F=n.x,D=n.y,k=n.z;return a[0]=(1-(A+f))*F,a[1]=(m+E)*F,a[2]=(v-C)*F,a[3]=0,a[4]=(m-E)*D,a[5]=(1-(u+f))*D,a[6]=(p+y)*D,a[7]=0,a[8]=(v+C)*k,a[9]=(p-y)*k,a[10]=(1-(u+A))*k,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,n){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const r=this.determinant();if(r===0)return n.set(1,1,1),t.identity(),this;let s=Qi.set(a[0],a[1],a[2]).length();const o=Qi.set(a[4],a[5],a[6]).length(),c=Qi.set(a[8],a[9],a[10]).length();r<0&&(s=-s),In.copy(this);const l=1/s,d=1/o,h=1/c;return In.elements[0]*=l,In.elements[1]*=l,In.elements[2]*=l,In.elements[4]*=d,In.elements[5]*=d,In.elements[6]*=d,In.elements[8]*=h,In.elements[9]*=h,In.elements[10]*=h,t.setFromRotationMatrix(In),n.x=s,n.y=o,n.z=c,this}makePerspective(e,t,n,a,r,s,o=Kn,c=!1){const l=this.elements,d=2*r/(t-e),h=2*r/(n-a),u=(t+e)/(t-e),m=(n+a)/(n-a);let v,A;if(c)v=r/(s-r),A=s*r/(s-r);else if(o===Kn)v=-(s+r)/(s-r),A=-2*s*r/(s-r);else if(o===Or)v=-s/(s-r),A=-s*r/(s-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=d,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=h,l[9]=m,l[13]=0,l[2]=0,l[6]=0,l[10]=v,l[14]=A,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,a,r,s,o=Kn,c=!1){const l=this.elements,d=2/(t-e),h=2/(n-a),u=-(t+e)/(t-e),m=-(n+a)/(n-a);let v,A;if(c)v=1/(s-r),A=s/(s-r);else if(o===Kn)v=-2/(s-r),A=-(s+r)/(s-r);else if(o===Or)v=-1/(s-r),A=-r/(s-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=d,l[4]=0,l[8]=0,l[12]=u,l[1]=0,l[5]=h,l[9]=0,l[13]=m,l[2]=0,l[6]=0,l[10]=v,l[14]=A,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let a=0;a<16;a++)if(t[a]!==n[a])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Qi=new ne,In=new $t,Zf=new ne(0,0,0),jf=new ne(1,1,1),_i=new ne,sr=new ne,_n=new ne,Bl=new $t,kl=new ba;class mi{constructor(e=0,t=0,n=0,a=mi.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,a=this._order){return this._x=e,this._y=t,this._z=n,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const a=e.elements,r=a[0],s=a[4],o=a[8],c=a[1],l=a[5],d=a[9],h=a[2],u=a[6],m=a[10];switch(t){case"XYZ":this._y=Math.asin(vt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-d,m),this._z=Math.atan2(-s,r)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-vt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(o,m),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,r),this._z=0);break;case"ZXY":this._x=Math.asin(vt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-h,m),this._z=Math.atan2(-s,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-vt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(u,m),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-s,l));break;case"YZX":this._z=Math.asin(vt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-d,l),this._y=Math.atan2(-h,r)):(this._x=0,this._y=Math.atan2(o,m));break;case"XZY":this._z=Math.asin(-vt(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-d,m),this._y=0);break;default:lt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Bl.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Bl,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return kl.setFromEuler(this),this.setFromQuaternion(kl,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}mi.DEFAULT_ORDER="XYZ";class jc{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Jf=0;const Vl=new ne,ea=new ba,ii=new $t,or=new ne,Ua=new ne,Qf=new ne,eh=new ba,zl=new ne(1,0,0),Gl=new ne(0,1,0),Hl=new ne(0,0,1),Wl={type:"added"},th={type:"removed"},ta={type:"childadded",child:null},ws={type:"childremoved",child:null};class Mn extends ya{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Jf++}),this.uuid=Ea(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Mn.DEFAULT_UP.clone();const e=new ne,t=new mi,n=new ba,a=new ne(1,1,1);function r(){n.setFromEuler(t,!1)}function s(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(s),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new $t},normalMatrix:{value:new ft}}),this.matrix=new $t,this.matrixWorld=new $t,this.matrixAutoUpdate=Mn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Mn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new jc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ea.setFromAxisAngle(e,t),this.quaternion.multiply(ea),this}rotateOnWorldAxis(e,t){return ea.setFromAxisAngle(e,t),this.quaternion.premultiply(ea),this}rotateX(e){return this.rotateOnAxis(zl,e)}rotateY(e){return this.rotateOnAxis(Gl,e)}rotateZ(e){return this.rotateOnAxis(Hl,e)}translateOnAxis(e,t){return Vl.copy(e).applyQuaternion(this.quaternion),this.position.add(Vl.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(zl,e)}translateY(e){return this.translateOnAxis(Gl,e)}translateZ(e){return this.translateOnAxis(Hl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ii.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?or.copy(e):or.set(e,t,n);const a=this.parent;this.updateWorldMatrix(!0,!1),Ua.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ii.lookAt(Ua,or,this.up):ii.lookAt(or,Ua,this.up),this.quaternion.setFromRotationMatrix(ii),a&&(ii.extractRotation(a.matrixWorld),ea.setFromRotationMatrix(ii),this.quaternion.premultiply(ea.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(bt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Wl),ta.child=e,this.dispatchEvent(ta),ta.child=null):bt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(th),ws.child=e,this.dispatchEvent(ws),ws.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ii.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ii.multiply(e.parent.matrixWorld)),e.applyMatrix4(ii),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Wl),ta.child=e,this.dispatchEvent(ta),ta.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,a=this.children.length;n<a;n++){const s=this.children[n].getObjectByProperty(e,t);if(s!==void 0)return s}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const a=this.children;for(let r=0,s=a.length;r<s;r++)a[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ua,e,Qf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ua,eh,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,a=t.length;n<a;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,a=t.length;n<a;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,a=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*a,r[13]+=n-r[1]*t-r[5]*n-r[9]*a,r[14]+=a-r[2]*t-r[6]*n-r[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,a=t.length;n<a;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const a=this.children;for(let r=0,s=a.length;r<s;r++)a[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(o=>({...o})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=r(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,d=c.length;l<d;l++){const h=c[l];r(e.shapes,h)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(e.materials,this.material[c]));a.material=o}else a.material=r(e.materials,this.material);if(this.children.length>0){a.children=[];for(let o=0;o<this.children.length;o++)a.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];a.animations.push(r(e.animations,c))}}if(t){const o=s(e.geometries),c=s(e.materials),l=s(e.textures),d=s(e.images),h=s(e.shapes),u=s(e.skeletons),m=s(e.animations),v=s(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),d.length>0&&(n.images=d),h.length>0&&(n.shapes=h),u.length>0&&(n.skeletons=u),m.length>0&&(n.animations=m),v.length>0&&(n.nodes=v)}return n.object=a,n;function s(o){const c=[];for(const l in o){const d=o[l];delete d.metadata,c.push(d)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),e.pivot!==null&&(this.pivot=e.pivot.clone()),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const a=e.children[n];this.add(a.clone())}return this}}Mn.DEFAULT_UP=new ne(0,1,0);Mn.DEFAULT_MATRIX_AUTO_UPDATE=!0;Mn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class lr extends Mn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const nh={type:"move"};class Cs{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new lr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new lr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ne,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ne),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new lr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ne,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ne),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let a=null,r=null,s=null;const o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){s=!0;for(const A of e.hand.values()){const p=t.getJointPose(A,n),f=this._getHandJoint(l,A);p!==null&&(f.matrix.fromArray(p.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=p.radius),f.visible=p!==null}const d=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],u=d.position.distanceTo(h.position),m=.02,v=.005;l.inputState.pinching&&u>m+v?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&u<=m-v&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(a=t.getPose(e.targetRaySpace,n),a===null&&r!==null&&(a=r),a!==null&&(o.matrix.fromArray(a.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,a.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(a.linearVelocity)):o.hasLinearVelocity=!1,a.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(a.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(nh)))}return o!==null&&(o.visible=a!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=s!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new lr;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const Jc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},vi={h:0,s:0,l:0},cr={h:0,s:0,l:0};function Rs(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Lt{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=xn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,yt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,a=yt.workingColorSpace){return this.r=e,this.g=t,this.b=n,yt.colorSpaceToWorking(this,a),this}setHSL(e,t,n,a=yt.workingColorSpace){if(e=al(e,1),t=vt(t,0,1),n=vt(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,s=2*n-r;this.r=Rs(s,r,e+1/3),this.g=Rs(s,r,e),this.b=Rs(s,r,e-1/3)}return yt.colorSpaceToWorking(this,a),this}setStyle(e,t=xn){function n(r){r!==void 0&&parseFloat(r)<1&&lt("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const s=a[1],o=a[2];switch(s){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:lt("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=a[1],s=r.length;if(s===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(s===6)return this.setHex(parseInt(r,16),t);lt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=xn){const n=Jc[e.toLowerCase()];return n!==void 0?this.setHex(n,t):lt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=fi(e.r),this.g=fi(e.g),this.b=fi(e.b),this}copyLinearToSRGB(e){return this.r=ga(e.r),this.g=ga(e.g),this.b=ga(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=xn){return yt.workingToColorSpace(rn.copy(this),e),Math.round(vt(rn.r*255,0,255))*65536+Math.round(vt(rn.g*255,0,255))*256+Math.round(vt(rn.b*255,0,255))}getHexString(e=xn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=yt.workingColorSpace){yt.workingToColorSpace(rn.copy(this),t);const n=rn.r,a=rn.g,r=rn.b,s=Math.max(n,a,r),o=Math.min(n,a,r);let c,l;const d=(o+s)/2;if(o===s)c=0,l=0;else{const h=s-o;switch(l=d<=.5?h/(s+o):h/(2-s-o),s){case n:c=(a-r)/h+(a<r?6:0);break;case a:c=(r-n)/h+2;break;case r:c=(n-a)/h+4;break}c/=6}return e.h=c,e.s=l,e.l=d,e}getRGB(e,t=yt.workingColorSpace){return yt.workingToColorSpace(rn.copy(this),t),e.r=rn.r,e.g=rn.g,e.b=rn.b,e}getStyle(e=xn){yt.workingToColorSpace(rn.copy(this),e);const t=rn.r,n=rn.g,a=rn.b;return e!==xn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(a*255)})`}offsetHSL(e,t,n){return this.getHSL(vi),this.setHSL(vi.h+e,vi.s+t,vi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(vi),e.getHSL(cr);const n=$a(vi.h,cr.h,t),a=$a(vi.s,cr.s,t),r=$a(vi.l,cr.l,t);return this.setHSL(n,a,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,a=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*a,this.g=r[1]*t+r[4]*n+r[7]*a,this.b=r[2]*t+r[5]*n+r[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const rn=new Lt;Lt.NAMES=Jc;class ih extends Mn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new mi,this.environmentIntensity=1,this.environmentRotation=new mi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Ln=new ne,ai=new ne,Ps=new ne,ri=new ne,na=new ne,ia=new ne,Xl=new ne,Ds=new ne,Is=new ne,Ls=new ne,Us=new Ht,Ns=new Ht,Fs=new Ht;class On{constructor(e=new ne,t=new ne,n=new ne){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,a){a.subVectors(n,t),Ln.subVectors(e,t),a.cross(Ln);const r=a.lengthSq();return r>0?a.multiplyScalar(1/Math.sqrt(r)):a.set(0,0,0)}static getBarycoord(e,t,n,a,r){Ln.subVectors(a,t),ai.subVectors(n,t),Ps.subVectors(e,t);const s=Ln.dot(Ln),o=Ln.dot(ai),c=Ln.dot(Ps),l=ai.dot(ai),d=ai.dot(Ps),h=s*l-o*o;if(h===0)return r.set(0,0,0),null;const u=1/h,m=(l*c-o*d)*u,v=(s*d-o*c)*u;return r.set(1-m-v,v,m)}static containsPoint(e,t,n,a){return this.getBarycoord(e,t,n,a,ri)===null?!1:ri.x>=0&&ri.y>=0&&ri.x+ri.y<=1}static getInterpolation(e,t,n,a,r,s,o,c){return this.getBarycoord(e,t,n,a,ri)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,ri.x),c.addScaledVector(s,ri.y),c.addScaledVector(o,ri.z),c)}static getInterpolatedAttribute(e,t,n,a,r,s){return Us.setScalar(0),Ns.setScalar(0),Fs.setScalar(0),Us.fromBufferAttribute(e,t),Ns.fromBufferAttribute(e,n),Fs.fromBufferAttribute(e,a),s.setScalar(0),s.addScaledVector(Us,r.x),s.addScaledVector(Ns,r.y),s.addScaledVector(Fs,r.z),s}static isFrontFacing(e,t,n,a){return Ln.subVectors(n,t),ai.subVectors(e,t),Ln.cross(ai).dot(a)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,a){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,n,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Ln.subVectors(this.c,this.b),ai.subVectors(this.a,this.b),Ln.cross(ai).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return On.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return On.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,a,r){return On.getInterpolation(e,this.a,this.b,this.c,t,n,a,r)}containsPoint(e){return On.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return On.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,a=this.b,r=this.c;let s,o;na.subVectors(a,n),ia.subVectors(r,n),Ds.subVectors(e,n);const c=na.dot(Ds),l=ia.dot(Ds);if(c<=0&&l<=0)return t.copy(n);Is.subVectors(e,a);const d=na.dot(Is),h=ia.dot(Is);if(d>=0&&h<=d)return t.copy(a);const u=c*h-d*l;if(u<=0&&c>=0&&d<=0)return s=c/(c-d),t.copy(n).addScaledVector(na,s);Ls.subVectors(e,r);const m=na.dot(Ls),v=ia.dot(Ls);if(v>=0&&m<=v)return t.copy(r);const A=m*l-c*v;if(A<=0&&l>=0&&v<=0)return o=l/(l-v),t.copy(n).addScaledVector(ia,o);const p=d*v-m*h;if(p<=0&&h-d>=0&&m-v>=0)return Xl.subVectors(r,a),o=(h-d)/(h-d+(m-v)),t.copy(a).addScaledVector(Xl,o);const f=1/(p+A+u);return s=A*f,o=u*f,t.copy(n).addScaledVector(na,s).addScaledVector(ia,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Ja{constructor(e=new ne(1/0,1/0,1/0),t=new ne(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Un.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Un.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Un.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let s=0,o=r.count;s<o;s++)e.isMesh===!0?e.getVertexPosition(s,Un):Un.fromBufferAttribute(r,s),Un.applyMatrix4(e.matrixWorld),this.expandByPoint(Un);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),ur.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ur.copy(n.boundingBox)),ur.applyMatrix4(e.matrixWorld),this.union(ur)}const a=e.children;for(let r=0,s=a.length;r<s;r++)this.expandByObject(a[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Un),Un.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Na),dr.subVectors(this.max,Na),aa.subVectors(e.a,Na),ra.subVectors(e.b,Na),sa.subVectors(e.c,Na),xi.subVectors(ra,aa),Mi.subVectors(sa,ra),Ii.subVectors(aa,sa);let t=[0,-xi.z,xi.y,0,-Mi.z,Mi.y,0,-Ii.z,Ii.y,xi.z,0,-xi.x,Mi.z,0,-Mi.x,Ii.z,0,-Ii.x,-xi.y,xi.x,0,-Mi.y,Mi.x,0,-Ii.y,Ii.x,0];return!Os(t,aa,ra,sa,dr)||(t=[1,0,0,0,1,0,0,0,1],!Os(t,aa,ra,sa,dr))?!1:(fr.crossVectors(xi,Mi),t=[fr.x,fr.y,fr.z],Os(t,aa,ra,sa,dr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Un).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Un).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(si[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),si[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),si[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),si[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),si[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),si[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),si[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),si[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(si),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const si=[new ne,new ne,new ne,new ne,new ne,new ne,new ne,new ne],Un=new ne,ur=new Ja,aa=new ne,ra=new ne,sa=new ne,xi=new ne,Mi=new ne,Ii=new ne,Na=new ne,dr=new ne,fr=new ne,Li=new ne;function Os(i,e,t,n,a){for(let r=0,s=i.length-3;r<=s;r+=3){Li.fromArray(i,r);const o=a.x*Math.abs(Li.x)+a.y*Math.abs(Li.y)+a.z*Math.abs(Li.z),c=e.dot(Li),l=t.dot(Li),d=n.dot(Li);if(Math.max(-Math.max(c,l,d),Math.min(c,l,d))>o)return!1}return!0}const Xt=new ne,hr=new Ut;let ah=0;class Jn{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:ah++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Rl,this.updateRanges=[],this.gpuType=Yn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let a=0,r=this.itemSize;a<r;a++)this.array[e+a]=t.array[n+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)hr.fromBufferAttribute(this,t),hr.applyMatrix3(e),this.setXY(t,hr.x,hr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Xt.fromBufferAttribute(this,t),Xt.applyMatrix3(e),this.setXYZ(t,Xt.x,Xt.y,Xt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Xt.fromBufferAttribute(this,t),Xt.applyMatrix4(e),this.setXYZ(t,Xt.x,Xt.y,Xt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Xt.fromBufferAttribute(this,t),Xt.applyNormalMatrix(e),this.setXYZ(t,Xt.x,Xt.y,Xt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Xt.fromBufferAttribute(this,t),Xt.transformDirection(e),this.setXYZ(t,Xt.x,Xt.y,Xt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=ha(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=un(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=ha(t,this.array)),t}setX(e,t){return this.normalized&&(t=un(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=ha(t,this.array)),t}setY(e,t){return this.normalized&&(t=un(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=ha(t,this.array)),t}setZ(e,t){return this.normalized&&(t=un(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=ha(t,this.array)),t}setW(e,t){return this.normalized&&(t=un(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=un(t,this.array),n=un(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,a){return e*=this.itemSize,this.normalized&&(t=un(t,this.array),n=un(n,this.array),a=un(a,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=a,this}setXYZW(e,t,n,a,r){return e*=this.itemSize,this.normalized&&(t=un(t,this.array),n=un(n,this.array),a=un(a,this.array),r=un(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=a,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Rl&&(e.usage=this.usage),e}}class Qc extends Jn{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class eu extends Jn{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class wn extends Jn{constructor(e,t,n){super(new Float32Array(e),t,n)}}const rh=new Ja,Fa=new ne,Bs=new ne;class sl{constructor(e=new ne,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):rh.setFromPoints(e).getCenter(n);let a=0;for(let r=0,s=e.length;r<s;r++)a=Math.max(a,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Fa.subVectors(e,this.center);const t=Fa.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),a=(n-this.radius)*.5;this.center.addScaledVector(Fa,a/n),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Bs.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Fa.copy(e.center).add(Bs)),this.expandByPoint(Fa.copy(e.center).sub(Bs))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let sh=0;const bn=new $t,ks=new Mn,oa=new ne,vn=new Ja,Oa=new Ja,Qt=new ne;class ni extends ya{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:sh++}),this.uuid=Ea(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(bf(e)?eu:Qc)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new ft().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return bn.makeRotationFromQuaternion(e),this.applyMatrix4(bn),this}rotateX(e){return bn.makeRotationX(e),this.applyMatrix4(bn),this}rotateY(e){return bn.makeRotationY(e),this.applyMatrix4(bn),this}rotateZ(e){return bn.makeRotationZ(e),this.applyMatrix4(bn),this}translate(e,t,n){return bn.makeTranslation(e,t,n),this.applyMatrix4(bn),this}scale(e,t,n){return bn.makeScale(e,t,n),this.applyMatrix4(bn),this}lookAt(e){return ks.lookAt(e),ks.updateMatrix(),this.applyMatrix4(ks.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(oa).negate(),this.translate(oa.x,oa.y,oa.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let a=0,r=e.length;a<r;a++){const s=e[a];n.push(s.x,s.y,s.z||0)}this.setAttribute("position",new wn(n,3))}else{const n=Math.min(e.length,t.count);for(let a=0;a<n;a++){const r=e[a];t.setXYZ(a,r.x,r.y,r.z||0)}e.length>t.count&&lt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ja);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){bt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new ne(-1/0,-1/0,-1/0),new ne(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,a=t.length;n<a;n++){const r=t[n];vn.setFromBufferAttribute(r),this.morphTargetsRelative?(Qt.addVectors(this.boundingBox.min,vn.min),this.boundingBox.expandByPoint(Qt),Qt.addVectors(this.boundingBox.max,vn.max),this.boundingBox.expandByPoint(Qt)):(this.boundingBox.expandByPoint(vn.min),this.boundingBox.expandByPoint(vn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&bt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new sl);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){bt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new ne,1/0);return}if(e){const n=this.boundingSphere.center;if(vn.setFromBufferAttribute(e),t)for(let r=0,s=t.length;r<s;r++){const o=t[r];Oa.setFromBufferAttribute(o),this.morphTargetsRelative?(Qt.addVectors(vn.min,Oa.min),vn.expandByPoint(Qt),Qt.addVectors(vn.max,Oa.max),vn.expandByPoint(Qt)):(vn.expandByPoint(Oa.min),vn.expandByPoint(Oa.max))}vn.getCenter(n);let a=0;for(let r=0,s=e.count;r<s;r++)Qt.fromBufferAttribute(e,r),a=Math.max(a,n.distanceToSquared(Qt));if(t)for(let r=0,s=t.length;r<s;r++){const o=t[r],c=this.morphTargetsRelative;for(let l=0,d=o.count;l<d;l++)Qt.fromBufferAttribute(o,l),c&&(oa.fromBufferAttribute(e,l),Qt.add(oa)),a=Math.max(a,n.distanceToSquared(Qt))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&bt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){bt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,a=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Jn(new Float32Array(4*n.count),4));const s=this.getAttribute("tangent"),o=[],c=[];for(let x=0;x<n.count;x++)o[x]=new ne,c[x]=new ne;const l=new ne,d=new ne,h=new ne,u=new Ut,m=new Ut,v=new Ut,A=new ne,p=new ne;function f(x,w,L){l.fromBufferAttribute(n,x),d.fromBufferAttribute(n,w),h.fromBufferAttribute(n,L),u.fromBufferAttribute(r,x),m.fromBufferAttribute(r,w),v.fromBufferAttribute(r,L),d.sub(l),h.sub(l),m.sub(u),v.sub(u);const S=1/(m.x*v.y-v.x*m.y);isFinite(S)&&(A.copy(d).multiplyScalar(v.y).addScaledVector(h,-m.y).multiplyScalar(S),p.copy(h).multiplyScalar(m.x).addScaledVector(d,-v.x).multiplyScalar(S),o[x].add(A),o[w].add(A),o[L].add(A),c[x].add(p),c[w].add(p),c[L].add(p))}let y=this.groups;y.length===0&&(y=[{start:0,count:e.count}]);for(let x=0,w=y.length;x<w;++x){const L=y[x],S=L.start,O=L.count;for(let H=S,q=S+O;H<q;H+=3)f(e.getX(H+0),e.getX(H+1),e.getX(H+2))}const C=new ne,E=new ne,F=new ne,D=new ne;function k(x){F.fromBufferAttribute(a,x),D.copy(F);const w=o[x];C.copy(w),C.sub(F.multiplyScalar(F.dot(w))).normalize(),E.crossVectors(D,w);const S=E.dot(c[x])<0?-1:1;s.setXYZW(x,C.x,C.y,C.z,S)}for(let x=0,w=y.length;x<w;++x){const L=y[x],S=L.start,O=L.count;for(let H=S,q=S+O;H<q;H+=3)k(e.getX(H+0)),k(e.getX(H+1)),k(e.getX(H+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Jn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,m=n.count;u<m;u++)n.setXYZ(u,0,0,0);const a=new ne,r=new ne,s=new ne,o=new ne,c=new ne,l=new ne,d=new ne,h=new ne;if(e)for(let u=0,m=e.count;u<m;u+=3){const v=e.getX(u+0),A=e.getX(u+1),p=e.getX(u+2);a.fromBufferAttribute(t,v),r.fromBufferAttribute(t,A),s.fromBufferAttribute(t,p),d.subVectors(s,r),h.subVectors(a,r),d.cross(h),o.fromBufferAttribute(n,v),c.fromBufferAttribute(n,A),l.fromBufferAttribute(n,p),o.add(d),c.add(d),l.add(d),n.setXYZ(v,o.x,o.y,o.z),n.setXYZ(A,c.x,c.y,c.z),n.setXYZ(p,l.x,l.y,l.z)}else for(let u=0,m=t.count;u<m;u+=3)a.fromBufferAttribute(t,u+0),r.fromBufferAttribute(t,u+1),s.fromBufferAttribute(t,u+2),d.subVectors(s,r),h.subVectors(a,r),d.cross(h),n.setXYZ(u+0,d.x,d.y,d.z),n.setXYZ(u+1,d.x,d.y,d.z),n.setXYZ(u+2,d.x,d.y,d.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Qt.fromBufferAttribute(e,t),Qt.normalize(),e.setXYZ(t,Qt.x,Qt.y,Qt.z)}toNonIndexed(){function e(o,c){const l=o.array,d=o.itemSize,h=o.normalized,u=new l.constructor(c.length*d);let m=0,v=0;for(let A=0,p=c.length;A<p;A++){o.isInterleavedBufferAttribute?m=c[A]*o.data.stride+o.offset:m=c[A]*d;for(let f=0;f<d;f++)u[v++]=l[m++]}return new Jn(u,d,h)}if(this.index===null)return lt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new ni,n=this.index.array,a=this.attributes;for(const o in a){const c=a[o],l=e(c,n);t.setAttribute(o,l)}const r=this.morphAttributes;for(const o in r){const c=[],l=r[o];for(let d=0,h=l.length;d<h;d++){const u=l[d],m=e(u,n);c.push(m)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const s=this.groups;for(let o=0,c=s.length;o<c;o++){const l=s[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const a={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],d=[];for(let h=0,u=l.length;h<u;h++){const m=l[h];d.push(m.toJSON(e.data))}d.length>0&&(a[c]=d,r=!0)}r&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const s=this.groups;s.length>0&&(e.data.groups=JSON.parse(JSON.stringify(s)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const a=e.attributes;for(const l in a){const d=a[l];this.setAttribute(l,d.clone(t))}const r=e.morphAttributes;for(const l in r){const d=[],h=r[l];for(let u=0,m=h.length;u<m;u++)d.push(h[u].clone(t));this.morphAttributes[l]=d}this.morphTargetsRelative=e.morphTargetsRelative;const s=e.groups;for(let l=0,d=s.length;l<d;l++){const h=s[l];this.addGroup(h.start,h.count,h.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}let oh=0;class Gr extends ya{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:oh++}),this.uuid=Ea(),this.name="",this.type="Material",this.blending=ma,this.side=wi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Qs,this.blendDst=eo,this.blendEquation=ki,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Lt(0,0,0),this.blendAlpha=0,this.depthFunc=_a,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Cl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ji,this.stencilZFail=ji,this.stencilZPass=ji,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){lt(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(n):a&&a.isVector3&&n&&n.isVector3?a.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ma&&(n.blending=this.blending),this.side!==wi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Qs&&(n.blendSrc=this.blendSrc),this.blendDst!==eo&&(n.blendDst=this.blendDst),this.blendEquation!==ki&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==_a&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Cl&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ji&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ji&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ji&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function a(r){const s=[];for(const o in r){const c=r[o];delete c.metadata,s.push(c)}return s}if(t){const r=a(e.textures),s=a(e.images);r.length>0&&(n.textures=r),s.length>0&&(n.images=s)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const a=t.length;n=new Array(a);for(let r=0;r!==a;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const oi=new ne,Vs=new ne,pr=new ne,Si=new ne,zs=new ne,mr=new ne,Gs=new ne;class lh{constructor(e=new ne,t=new ne(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,oi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=oi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(oi.copy(this.origin).addScaledVector(this.direction,t),oi.distanceToSquared(e))}distanceSqToSegment(e,t,n,a){Vs.copy(e).add(t).multiplyScalar(.5),pr.copy(t).sub(e).normalize(),Si.copy(this.origin).sub(Vs);const r=e.distanceTo(t)*.5,s=-this.direction.dot(pr),o=Si.dot(this.direction),c=-Si.dot(pr),l=Si.lengthSq(),d=Math.abs(1-s*s);let h,u,m,v;if(d>0)if(h=s*c-o,u=s*o-c,v=r*d,h>=0)if(u>=-v)if(u<=v){const A=1/d;h*=A,u*=A,m=h*(h+s*u+2*o)+u*(s*h+u+2*c)+l}else u=r,h=Math.max(0,-(s*u+o)),m=-h*h+u*(u+2*c)+l;else u=-r,h=Math.max(0,-(s*u+o)),m=-h*h+u*(u+2*c)+l;else u<=-v?(h=Math.max(0,-(-s*r+o)),u=h>0?-r:Math.min(Math.max(-r,-c),r),m=-h*h+u*(u+2*c)+l):u<=v?(h=0,u=Math.min(Math.max(-r,-c),r),m=u*(u+2*c)+l):(h=Math.max(0,-(s*r+o)),u=h>0?r:Math.min(Math.max(-r,-c),r),m=-h*h+u*(u+2*c)+l);else u=s>0?-r:r,h=Math.max(0,-(s*u+o)),m=-h*h+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,h),a&&a.copy(Vs).addScaledVector(pr,u),m}intersectSphere(e,t){oi.subVectors(e.center,this.origin);const n=oi.dot(this.direction),a=oi.dot(oi)-n*n,r=e.radius*e.radius;if(a>r)return null;const s=Math.sqrt(r-a),o=n-s,c=n+s;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,a,r,s,o,c;const l=1/this.direction.x,d=1/this.direction.y,h=1/this.direction.z,u=this.origin;return l>=0?(n=(e.min.x-u.x)*l,a=(e.max.x-u.x)*l):(n=(e.max.x-u.x)*l,a=(e.min.x-u.x)*l),d>=0?(r=(e.min.y-u.y)*d,s=(e.max.y-u.y)*d):(r=(e.max.y-u.y)*d,s=(e.min.y-u.y)*d),n>s||r>a||((r>n||isNaN(n))&&(n=r),(s<a||isNaN(a))&&(a=s),h>=0?(o=(e.min.z-u.z)*h,c=(e.max.z-u.z)*h):(o=(e.max.z-u.z)*h,c=(e.min.z-u.z)*h),n>c||o>a)||((o>n||n!==n)&&(n=o),(c<a||a!==a)&&(a=c),a<0)?null:this.at(n>=0?n:a,t)}intersectsBox(e){return this.intersectBox(e,oi)!==null}intersectTriangle(e,t,n,a,r){zs.subVectors(t,e),mr.subVectors(n,e),Gs.crossVectors(zs,mr);let s=this.direction.dot(Gs),o;if(s>0){if(a)return null;o=1}else if(s<0)o=-1,s=-s;else return null;Si.subVectors(this.origin,e);const c=o*this.direction.dot(mr.crossVectors(Si,mr));if(c<0)return null;const l=o*this.direction.dot(zs.cross(Si));if(l<0||c+l>s)return null;const d=-o*Si.dot(Gs);return d<0?null:this.at(d/s,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ol extends Gr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Lt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new mi,this.combine=Lc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const $l=new $t,Ui=new lh,gr=new sl,ql=new ne,_r=new ne,vr=new ne,xr=new ne,Hs=new ne,Mr=new ne,Yl=new ne,Sr=new ne;class ei extends Mn{constructor(e=new ni,t=new ol){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const a=t[n[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,s=a.length;r<s;r++){const o=a[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){const n=this.geometry,a=n.attributes.position,r=n.morphAttributes.position,s=n.morphTargetsRelative;t.fromBufferAttribute(a,e);const o=this.morphTargetInfluences;if(r&&o){Mr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const d=o[c],h=r[c];d!==0&&(Hs.fromBufferAttribute(h,e),s?Mr.addScaledVector(Hs,d):Mr.addScaledVector(Hs.sub(t),d))}t.add(Mr)}return t}raycast(e,t){const n=this.geometry,a=this.material,r=this.matrixWorld;a!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),gr.copy(n.boundingSphere),gr.applyMatrix4(r),Ui.copy(e.ray).recast(e.near),!(gr.containsPoint(Ui.origin)===!1&&(Ui.intersectSphere(gr,ql)===null||Ui.origin.distanceToSquared(ql)>(e.far-e.near)**2))&&($l.copy(r).invert(),Ui.copy(e.ray).applyMatrix4($l),!(n.boundingBox!==null&&Ui.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Ui)))}_computeIntersections(e,t,n){let a;const r=this.geometry,s=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,d=r.attributes.uv1,h=r.attributes.normal,u=r.groups,m=r.drawRange;if(o!==null)if(Array.isArray(s))for(let v=0,A=u.length;v<A;v++){const p=u[v],f=s[p.materialIndex],y=Math.max(p.start,m.start),C=Math.min(o.count,Math.min(p.start+p.count,m.start+m.count));for(let E=y,F=C;E<F;E+=3){const D=o.getX(E),k=o.getX(E+1),x=o.getX(E+2);a=yr(this,f,e,n,l,d,h,D,k,x),a&&(a.faceIndex=Math.floor(E/3),a.face.materialIndex=p.materialIndex,t.push(a))}}else{const v=Math.max(0,m.start),A=Math.min(o.count,m.start+m.count);for(let p=v,f=A;p<f;p+=3){const y=o.getX(p),C=o.getX(p+1),E=o.getX(p+2);a=yr(this,s,e,n,l,d,h,y,C,E),a&&(a.faceIndex=Math.floor(p/3),t.push(a))}}else if(c!==void 0)if(Array.isArray(s))for(let v=0,A=u.length;v<A;v++){const p=u[v],f=s[p.materialIndex],y=Math.max(p.start,m.start),C=Math.min(c.count,Math.min(p.start+p.count,m.start+m.count));for(let E=y,F=C;E<F;E+=3){const D=E,k=E+1,x=E+2;a=yr(this,f,e,n,l,d,h,D,k,x),a&&(a.faceIndex=Math.floor(E/3),a.face.materialIndex=p.materialIndex,t.push(a))}}else{const v=Math.max(0,m.start),A=Math.min(c.count,m.start+m.count);for(let p=v,f=A;p<f;p+=3){const y=p,C=p+1,E=p+2;a=yr(this,s,e,n,l,d,h,y,C,E),a&&(a.faceIndex=Math.floor(p/3),t.push(a))}}}}function ch(i,e,t,n,a,r,s,o){let c;if(e.side===mn?c=n.intersectTriangle(s,r,a,!0,o):c=n.intersectTriangle(a,r,s,e.side===wi,o),c===null)return null;Sr.copy(o),Sr.applyMatrix4(i.matrixWorld);const l=t.ray.origin.distanceTo(Sr);return l<t.near||l>t.far?null:{distance:l,point:Sr.clone(),object:i}}function yr(i,e,t,n,a,r,s,o,c,l){i.getVertexPosition(o,_r),i.getVertexPosition(c,vr),i.getVertexPosition(l,xr);const d=ch(i,e,t,n,_r,vr,xr,Yl);if(d){const h=new ne;On.getBarycoord(Yl,_r,vr,xr,h),a&&(d.uv=On.getInterpolatedAttribute(a,o,c,l,h,new Ut)),r&&(d.uv1=On.getInterpolatedAttribute(r,o,c,l,h,new Ut)),s&&(d.normal=On.getInterpolatedAttribute(s,o,c,l,h,new ne),d.normal.dot(n.direction)>0&&d.normal.multiplyScalar(-1));const u={a:o,b:c,c:l,normal:new ne,materialIndex:0};On.getNormal(_r,vr,xr,u.normal),d.face=u,d.barycoord=h}return d}class uh extends on{constructor(e=null,t=1,n=1,a,r,s,o,c,l=en,d=en,h,u){super(null,s,o,c,l,d,a,r,h,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Ws=new ne,dh=new ne,fh=new ft;class Bi{constructor(e=new ne(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,a){return this.normal.set(e,t,n),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const a=Ws.subVectors(n,t).cross(dh.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Ws),a=this.normal.dot(n);if(a===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/a;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||fh.getNormalMatrix(e),a=this.coplanarPoint(Ws).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-a.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ni=new sl,hh=new Ut(.5,.5),Er=new ne;class tu{constructor(e=new Bi,t=new Bi,n=new Bi,a=new Bi,r=new Bi,s=new Bi){this.planes=[e,t,n,a,r,s]}set(e,t,n,a,r,s){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(a),o[4].copy(r),o[5].copy(s),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Kn,n=!1){const a=this.planes,r=e.elements,s=r[0],o=r[1],c=r[2],l=r[3],d=r[4],h=r[5],u=r[6],m=r[7],v=r[8],A=r[9],p=r[10],f=r[11],y=r[12],C=r[13],E=r[14],F=r[15];if(a[0].setComponents(l-s,m-d,f-v,F-y).normalize(),a[1].setComponents(l+s,m+d,f+v,F+y).normalize(),a[2].setComponents(l+o,m+h,f+A,F+C).normalize(),a[3].setComponents(l-o,m-h,f-A,F-C).normalize(),n)a[4].setComponents(c,u,p,E).normalize(),a[5].setComponents(l-c,m-u,f-p,F-E).normalize();else if(a[4].setComponents(l-c,m-u,f-p,F-E).normalize(),t===Kn)a[5].setComponents(l+c,m+u,f+p,F+E).normalize();else if(t===Or)a[5].setComponents(c,u,p,E).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ni.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ni.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ni)}intersectsSprite(e){Ni.center.set(0,0,0);const t=hh.distanceTo(e.center);return Ni.radius=.7071067811865476+t,Ni.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ni)}intersectsSphere(e){const t=this.planes,n=e.center,a=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const a=t[n];if(Er.x=a.normal.x>0?e.max.x:e.min.x,Er.y=a.normal.y>0?e.max.y:e.min.y,Er.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Er)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class nu extends on{constructor(e=[],t=Hi,n,a,r,s,o,c,l,d){super(e,t,n,a,r,s,o,c,l,d),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class ja extends on{constructor(e,t,n=Qn,a,r,s,o=en,c=en,l,d=pi,h=1){if(d!==pi&&d!==Gi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:h};super(u,a,r,s,o,c,d,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new rl(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class ph extends ja{constructor(e,t=Qn,n=Hi,a,r,s=en,o=en,c,l=pi){const d={width:e,height:e,depth:1},h=[d,d,d,d,d,d];super(e,e,t,n,a,r,s,o,c,l),this.image=h,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class iu extends on{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Qa extends ni{constructor(e=1,t=1,n=1,a=1,r=1,s=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:a,heightSegments:r,depthSegments:s};const o=this;a=Math.floor(a),r=Math.floor(r),s=Math.floor(s);const c=[],l=[],d=[],h=[];let u=0,m=0;v("z","y","x",-1,-1,n,t,e,s,r,0),v("z","y","x",1,-1,n,t,-e,s,r,1),v("x","z","y",1,1,e,n,t,a,s,2),v("x","z","y",1,-1,e,n,-t,a,s,3),v("x","y","z",1,-1,e,t,n,a,r,4),v("x","y","z",-1,-1,e,t,-n,a,r,5),this.setIndex(c),this.setAttribute("position",new wn(l,3)),this.setAttribute("normal",new wn(d,3)),this.setAttribute("uv",new wn(h,2));function v(A,p,f,y,C,E,F,D,k,x,w){const L=E/k,S=F/x,O=E/2,H=F/2,q=D/2,ee=k+1,J=x+1;let Y=0,ve=0;const _e=new ne;for(let Pe=0;Pe<J;Pe++){const ue=Pe*S-H;for(let De=0;De<ee;De++){const et=De*L-O;_e[A]=et*y,_e[p]=ue*C,_e[f]=q,l.push(_e.x,_e.y,_e.z),_e[A]=0,_e[p]=0,_e[f]=D>0?1:-1,d.push(_e.x,_e.y,_e.z),h.push(De/k),h.push(1-Pe/x),Y+=1}}for(let Pe=0;Pe<x;Pe++)for(let ue=0;ue<k;ue++){const De=u+ue+ee*Pe,et=u+ue+ee*(Pe+1),nt=u+(ue+1)+ee*(Pe+1),xt=u+(ue+1)+ee*Pe;c.push(De,et,xt),c.push(et,nt,xt),ve+=6}o.addGroup(m,ve,w),m+=ve,u+=Y}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Qa(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class Hr extends ni{constructor(e=1,t=1,n=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:a};const r=e/2,s=t/2,o=Math.floor(n),c=Math.floor(a),l=o+1,d=c+1,h=e/o,u=t/c,m=[],v=[],A=[],p=[];for(let f=0;f<d;f++){const y=f*u-s;for(let C=0;C<l;C++){const E=C*h-r;v.push(E,-y,0),A.push(0,0,1),p.push(C/o),p.push(1-f/c)}}for(let f=0;f<c;f++)for(let y=0;y<o;y++){const C=y+l*f,E=y+l*(f+1),F=y+1+l*(f+1),D=y+1+l*f;m.push(C,E,D),m.push(E,F,D)}this.setIndex(m),this.setAttribute("position",new wn(v,3)),this.setAttribute("normal",new wn(A,3)),this.setAttribute("uv",new wn(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Hr(e.width,e.height,e.widthSegments,e.heightSegments)}}class ll extends ni{constructor(e=1,t=32,n=16,a=0,r=Math.PI*2,s=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:a,phiLength:r,thetaStart:s,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(s+o,Math.PI);let l=0;const d=[],h=new ne,u=new ne,m=[],v=[],A=[],p=[];for(let f=0;f<=n;f++){const y=[],C=f/n;let E=0;f===0&&s===0?E=.5/t:f===n&&c===Math.PI&&(E=-.5/t);for(let F=0;F<=t;F++){const D=F/t;h.x=-e*Math.cos(a+D*r)*Math.sin(s+C*o),h.y=e*Math.cos(s+C*o),h.z=e*Math.sin(a+D*r)*Math.sin(s+C*o),v.push(h.x,h.y,h.z),u.copy(h).normalize(),A.push(u.x,u.y,u.z),p.push(D+E,1-C),y.push(l++)}d.push(y)}for(let f=0;f<n;f++)for(let y=0;y<t;y++){const C=d[f][y+1],E=d[f][y],F=d[f+1][y],D=d[f+1][y+1];(f!==0||s>0)&&m.push(C,E,D),(f!==n-1||c<Math.PI)&&m.push(E,F,D)}this.setIndex(m),this.setAttribute("position",new wn(v,3)),this.setAttribute("normal",new wn(A,3)),this.setAttribute("uv",new wn(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ll(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function Sa(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const a=i[t][n];a&&(a.isColor||a.isMatrix3||a.isMatrix4||a.isVector2||a.isVector3||a.isVector4||a.isTexture||a.isQuaternion)?a.isRenderTargetTexture?(lt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=a.clone():Array.isArray(a)?e[t][n]=a.slice():e[t][n]=a}}return e}function dn(i){const e={};for(let t=0;t<i.length;t++){const n=Sa(i[t]);for(const a in n)e[a]=n[a]}return e}function mh(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function au(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:yt.workingColorSpace}const gh={clone:Sa,merge:dn};var _h=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,vh=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ti extends Gr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=_h,this.fragmentShader=vh,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Sa(e.uniforms),this.uniformsGroups=mh(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const s=this.uniforms[a].value;s&&s.isTexture?t.uniforms[a]={type:"t",value:s.toJSON(e).uuid}:s&&s.isColor?t.uniforms[a]={type:"c",value:s.getHex()}:s&&s.isVector2?t.uniforms[a]={type:"v2",value:s.toArray()}:s&&s.isVector3?t.uniforms[a]={type:"v3",value:s.toArray()}:s&&s.isVector4?t.uniforms[a]={type:"v4",value:s.toArray()}:s&&s.isMatrix3?t.uniforms[a]={type:"m3",value:s.toArray()}:s&&s.isMatrix4?t.uniforms[a]={type:"m4",value:s.toArray()}:t.uniforms[a]={value:s}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const a in this.extensions)this.extensions[a]===!0&&(n[a]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class xh extends ti{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Mh extends Gr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=mf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Sh extends Gr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Xs={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(Kl(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!Kl(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Kl(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class yh{constructor(e,t,n){const a=this;let r=!1,s=0,o=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(d){o++,r===!1&&a.onStart!==void 0&&a.onStart(d,s,o),r=!0},this.itemEnd=function(d){s++,a.onProgress!==void 0&&a.onProgress(d,s,o),s===o&&(r=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(d){a.onError!==void 0&&a.onError(d)},this.resolveURL=function(d){return c?c(d):d},this.setURLModifier=function(d){return c=d,this},this.addHandler=function(d,h){return l.push(d,h),this},this.removeHandler=function(d){const h=l.indexOf(d);return h!==-1&&l.splice(h,2),this},this.getHandler=function(d){for(let h=0,u=l.length;h<u;h+=2){const m=l[h],v=l[h+1];if(m.global&&(m.lastIndex=0),m.test(d))return v}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Eh=new yh;class cl{constructor(e){this.manager=e!==void 0?e:Eh,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const n=this;return new Promise(function(a,r){n.load(e,a,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}cl.DEFAULT_MATERIAL_NAME="__DEFAULT";const la=new WeakMap;class bh extends cl{constructor(e){super(e)}load(e,t,n,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,s=Xs.get(`image:${e}`);if(s!==void 0){if(s.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(s),r.manager.itemEnd(e)},0);else{let h=la.get(s);h===void 0&&(h=[],la.set(s,h)),h.push({onLoad:t,onError:a})}return s}const o=Ka("img");function c(){d(),t&&t(this);const h=la.get(this)||[];for(let u=0;u<h.length;u++){const m=h[u];m.onLoad&&m.onLoad(this)}la.delete(this),r.manager.itemEnd(e)}function l(h){d(),a&&a(h),Xs.remove(`image:${e}`);const u=la.get(this)||[];for(let m=0;m<u.length;m++){const v=u[m];v.onError&&v.onError(h)}la.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function d(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),Xs.add(`image:${e}`,o),r.manager.itemStart(e),o.src=e,o}}class Th extends cl{constructor(e){super(e)}load(e,t,n,a){const r=new on,s=new bh(this.manager);return s.setCrossOrigin(this.crossOrigin),s.setPath(this.path),s.load(e,function(o){r.image=o,r.needsUpdate=!0,t!==void 0&&t(r)},n,a),r}}const br=new ne,Tr=new ba,Xn=new ne;class ru extends Mn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new $t,this.projectionMatrix=new $t,this.projectionMatrixInverse=new $t,this.coordinateSystem=Kn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(br,Tr,Xn),Xn.x===1&&Xn.y===1&&Xn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(br,Tr,Xn.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(br,Tr,Xn),Xn.x===1&&Xn.y===1&&Xn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(br,Tr,Xn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const yi=new ne,Zl=new Ut,jl=new Ut;class Tn extends ru{constructor(e=50,t=1,n=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Za*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Xa*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Za*2*Math.atan(Math.tan(Xa*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){yi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(yi.x,yi.y).multiplyScalar(-e/yi.z),yi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(yi.x,yi.y).multiplyScalar(-e/yi.z)}getViewSize(e,t){return this.getViewBounds(e,Zl,jl),t.subVectors(jl,Zl)}setViewOffset(e,t,n,a,r,s){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=a,this.view.width=r,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Xa*.5*this.fov)/this.zoom,n=2*t,a=this.aspect*n,r=-.5*a;const s=this.view;if(this.view!==null&&this.view.enabled){const c=s.fullWidth,l=s.fullHeight;r+=s.offsetX*a/c,t-=s.offsetY*n/l,a*=s.width/c,n*=s.height/l}const o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+a,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class su extends ru{constructor(e=-1,t=1,n=1,a=-1,r=.1,s=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=a,this.near=r,this.far=s,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,a,r,s){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=a,this.view.width=r,this.view.height=s,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let r=n-e,s=n+e,o=a+t,c=a-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,d=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,s=r+l*this.view.width,o-=d*this.view.offsetY,c=o-d*this.view.height}this.projectionMatrix.makeOrthographic(r,s,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const ca=-90,ua=1;class Ah extends Mn{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Tn(ca,ua,e,t);a.layers=this.layers,this.add(a);const r=new Tn(ca,ua,e,t);r.layers=this.layers,this.add(r);const s=new Tn(ca,ua,e,t);s.layers=this.layers,this.add(s);const o=new Tn(ca,ua,e,t);o.layers=this.layers,this.add(o);const c=new Tn(ca,ua,e,t);c.layers=this.layers,this.add(c);const l=new Tn(ca,ua,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,a,r,s,o,c]=t;for(const l of t)this.remove(l);if(e===Kn)n.up.set(0,1,0),n.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),s.up.set(0,0,1),s.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Or)n.up.set(0,-1,0),n.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),s.up.set(0,0,-1),s.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,s,o,c,l,d]=this.children,h=e.getRenderTarget(),u=e.getActiveCubeFace(),m=e.getActiveMipmapLevel(),v=e.xr.enabled;e.xr.enabled=!1;const A=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(n,0,a),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,a),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,2,a),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,a),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,a),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.generateMipmaps=A,e.setRenderTarget(n,5,a),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(h,u,m),e.xr.enabled=v,n.texture.needsPMREMUpdate=!0}}class wh extends Tn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}function Jl(i,e,t,n){const a=Ch(n);switch(t){case $c:return i*e;case Yc:return i*e/a.components*a.byteLength;case Qo:return i*e/a.components*a.byteLength;case xa:return i*e*2/a.components*a.byteLength;case el:return i*e*2/a.components*a.byteLength;case qc:return i*e*3/a.components*a.byteLength;case Bn:return i*e*4/a.components*a.byteLength;case tl:return i*e*4/a.components*a.byteLength;case Dr:case Ir:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Lr:case Ur:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case fo:case po:return Math.max(i,16)*Math.max(e,8)/4;case uo:case ho:return Math.max(i,8)*Math.max(e,8)/2;case mo:case go:case vo:case xo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case _o:case Mo:case So:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case yo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Eo:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case bo:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case To:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Ao:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case wo:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Co:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Ro:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Po:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Do:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Io:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Lo:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Uo:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case No:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Fo:case Oo:case Bo:return Math.ceil(i/4)*Math.ceil(e/4)*16;case ko:case Vo:return Math.ceil(i/4)*Math.ceil(e/4)*8;case zo:case Go:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ch(i){switch(i){case An:case Gc:return{byteLength:1,components:1};case qa:case Hc:case hi:return{byteLength:2,components:1};case jo:case Jo:return{byteLength:2,components:4};case Qn:case Zo:case Yn:return{byteLength:4,components:1};case Wc:case Xc:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ko}}));typeof window<"u"&&(window.__THREE__?lt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ko);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function ou(){let i=null,e=!1,t=null,n=null;function a(r,s){t(r,s),n=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(a),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Rh(i){const e=new WeakMap;function t(o,c){const l=o.array,d=o.usage,h=l.byteLength,u=i.createBuffer();i.bindBuffer(c,u),i.bufferData(c,l,d),o.onUploadCallback();let m;if(l instanceof Float32Array)m=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)m=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?m=i.HALF_FLOAT:m=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)m=i.SHORT;else if(l instanceof Uint32Array)m=i.UNSIGNED_INT;else if(l instanceof Int32Array)m=i.INT;else if(l instanceof Int8Array)m=i.BYTE;else if(l instanceof Uint8Array)m=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)m=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:m,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:h}}function n(o,c,l){const d=c.array,h=c.updateRanges;if(i.bindBuffer(l,o),h.length===0)i.bufferSubData(l,0,d);else{h.sort((m,v)=>m.start-v.start);let u=0;for(let m=1;m<h.length;m++){const v=h[u],A=h[m];A.start<=v.start+v.count+1?v.count=Math.max(v.count,A.start+A.count-v.start):(++u,h[u]=A)}h.length=u+1;for(let m=0,v=h.length;m<v;m++){const A=h[m];i.bufferSubData(l,A.start*d.BYTES_PER_ELEMENT,d,A.start,A.count)}c.clearUpdateRanges()}c.onUploadCallback()}function a(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function s(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const d=e.get(o);(!d||d.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:a,remove:r,update:s}}var Ph=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Dh=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Ih=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Lh=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Uh=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Nh=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Fh=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Oh=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Bh=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,kh=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Vh=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,zh=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Gh=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Hh=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Wh=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Xh=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,$h=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,qh=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Yh=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Kh=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Zh=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,jh=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Jh=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Qh=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,ep=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,tp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,np=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,ip=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,ap=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,rp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,sp="gl_FragColor = linearToOutputTexel( gl_FragColor );",op=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,lp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,cp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,up=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,dp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,fp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,hp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,pp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,mp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,gp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,_p=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,vp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,xp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Mp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Sp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,yp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Ep=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,bp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Tp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Ap=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,wp=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Cp=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return v;
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Rp=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Pp=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Dp=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ip=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Lp=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Up=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Np=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Fp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Op=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Bp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,kp=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Vp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,zp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Gp=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Hp=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Wp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Xp=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,$p=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,qp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Yp=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Kp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Zp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,jp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Jp=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Qp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,em=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,tm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,nm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,im=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,am=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,rm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,sm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,om=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,lm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,cm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,um=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,dm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,fm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,hm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,pm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,mm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,gm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,_m=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,vm=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,xm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Mm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Sm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,ym=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Em=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,bm=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Tm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Am=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,wm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Cm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Rm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Pm=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Dm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Im=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Lm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Um=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Nm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Fm=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Om=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Bm=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,km=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Vm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,zm=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Gm=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Hm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Wm=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xm=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,$m=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qm=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Ym=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Km=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Zm=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,jm=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Jm=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Qm=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,eg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,tg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ng=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ig=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,ag=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,rg=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,sg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,og=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,lg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,pt={alphahash_fragment:Ph,alphahash_pars_fragment:Dh,alphamap_fragment:Ih,alphamap_pars_fragment:Lh,alphatest_fragment:Uh,alphatest_pars_fragment:Nh,aomap_fragment:Fh,aomap_pars_fragment:Oh,batching_pars_vertex:Bh,batching_vertex:kh,begin_vertex:Vh,beginnormal_vertex:zh,bsdfs:Gh,iridescence_fragment:Hh,bumpmap_pars_fragment:Wh,clipping_planes_fragment:Xh,clipping_planes_pars_fragment:$h,clipping_planes_pars_vertex:qh,clipping_planes_vertex:Yh,color_fragment:Kh,color_pars_fragment:Zh,color_pars_vertex:jh,color_vertex:Jh,common:Qh,cube_uv_reflection_fragment:ep,defaultnormal_vertex:tp,displacementmap_pars_vertex:np,displacementmap_vertex:ip,emissivemap_fragment:ap,emissivemap_pars_fragment:rp,colorspace_fragment:sp,colorspace_pars_fragment:op,envmap_fragment:lp,envmap_common_pars_fragment:cp,envmap_pars_fragment:up,envmap_pars_vertex:dp,envmap_physical_pars_fragment:yp,envmap_vertex:fp,fog_vertex:hp,fog_pars_vertex:pp,fog_fragment:mp,fog_pars_fragment:gp,gradientmap_pars_fragment:_p,lightmap_pars_fragment:vp,lights_lambert_fragment:xp,lights_lambert_pars_fragment:Mp,lights_pars_begin:Sp,lights_toon_fragment:Ep,lights_toon_pars_fragment:bp,lights_phong_fragment:Tp,lights_phong_pars_fragment:Ap,lights_physical_fragment:wp,lights_physical_pars_fragment:Cp,lights_fragment_begin:Rp,lights_fragment_maps:Pp,lights_fragment_end:Dp,logdepthbuf_fragment:Ip,logdepthbuf_pars_fragment:Lp,logdepthbuf_pars_vertex:Up,logdepthbuf_vertex:Np,map_fragment:Fp,map_pars_fragment:Op,map_particle_fragment:Bp,map_particle_pars_fragment:kp,metalnessmap_fragment:Vp,metalnessmap_pars_fragment:zp,morphinstance_vertex:Gp,morphcolor_vertex:Hp,morphnormal_vertex:Wp,morphtarget_pars_vertex:Xp,morphtarget_vertex:$p,normal_fragment_begin:qp,normal_fragment_maps:Yp,normal_pars_fragment:Kp,normal_pars_vertex:Zp,normal_vertex:jp,normalmap_pars_fragment:Jp,clearcoat_normal_fragment_begin:Qp,clearcoat_normal_fragment_maps:em,clearcoat_pars_fragment:tm,iridescence_pars_fragment:nm,opaque_fragment:im,packing:am,premultiplied_alpha_fragment:rm,project_vertex:sm,dithering_fragment:om,dithering_pars_fragment:lm,roughnessmap_fragment:cm,roughnessmap_pars_fragment:um,shadowmap_pars_fragment:dm,shadowmap_pars_vertex:fm,shadowmap_vertex:hm,shadowmask_pars_fragment:pm,skinbase_vertex:mm,skinning_pars_vertex:gm,skinning_vertex:_m,skinnormal_vertex:vm,specularmap_fragment:xm,specularmap_pars_fragment:Mm,tonemapping_fragment:Sm,tonemapping_pars_fragment:ym,transmission_fragment:Em,transmission_pars_fragment:bm,uv_pars_fragment:Tm,uv_pars_vertex:Am,uv_vertex:wm,worldpos_vertex:Cm,background_vert:Rm,background_frag:Pm,backgroundCube_vert:Dm,backgroundCube_frag:Im,cube_vert:Lm,cube_frag:Um,depth_vert:Nm,depth_frag:Fm,distance_vert:Om,distance_frag:Bm,equirect_vert:km,equirect_frag:Vm,linedashed_vert:zm,linedashed_frag:Gm,meshbasic_vert:Hm,meshbasic_frag:Wm,meshlambert_vert:Xm,meshlambert_frag:$m,meshmatcap_vert:qm,meshmatcap_frag:Ym,meshnormal_vert:Km,meshnormal_frag:Zm,meshphong_vert:jm,meshphong_frag:Jm,meshphysical_vert:Qm,meshphysical_frag:eg,meshtoon_vert:tg,meshtoon_frag:ng,points_vert:ig,points_frag:ag,shadow_vert:rg,shadow_frag:sg,sprite_vert:og,sprite_frag:lg},Ne={common:{diffuse:{value:new Lt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ft},alphaMap:{value:null},alphaMapTransform:{value:new ft},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ft}},envmap:{envMap:{value:null},envMapRotation:{value:new ft},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ft}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ft}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ft},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ft},normalScale:{value:new Ut(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ft},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ft}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ft}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ft}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Lt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Lt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ft},alphaTest:{value:0},uvTransform:{value:new ft}},sprite:{diffuse:{value:new Lt(16777215)},opacity:{value:1},center:{value:new Ut(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ft},alphaMap:{value:null},alphaMapTransform:{value:new ft},alphaTest:{value:0}}},qn={basic:{uniforms:dn([Ne.common,Ne.specularmap,Ne.envmap,Ne.aomap,Ne.lightmap,Ne.fog]),vertexShader:pt.meshbasic_vert,fragmentShader:pt.meshbasic_frag},lambert:{uniforms:dn([Ne.common,Ne.specularmap,Ne.envmap,Ne.aomap,Ne.lightmap,Ne.emissivemap,Ne.bumpmap,Ne.normalmap,Ne.displacementmap,Ne.fog,Ne.lights,{emissive:{value:new Lt(0)},envMapIntensity:{value:1}}]),vertexShader:pt.meshlambert_vert,fragmentShader:pt.meshlambert_frag},phong:{uniforms:dn([Ne.common,Ne.specularmap,Ne.envmap,Ne.aomap,Ne.lightmap,Ne.emissivemap,Ne.bumpmap,Ne.normalmap,Ne.displacementmap,Ne.fog,Ne.lights,{emissive:{value:new Lt(0)},specular:{value:new Lt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:pt.meshphong_vert,fragmentShader:pt.meshphong_frag},standard:{uniforms:dn([Ne.common,Ne.envmap,Ne.aomap,Ne.lightmap,Ne.emissivemap,Ne.bumpmap,Ne.normalmap,Ne.displacementmap,Ne.roughnessmap,Ne.metalnessmap,Ne.fog,Ne.lights,{emissive:{value:new Lt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:pt.meshphysical_vert,fragmentShader:pt.meshphysical_frag},toon:{uniforms:dn([Ne.common,Ne.aomap,Ne.lightmap,Ne.emissivemap,Ne.bumpmap,Ne.normalmap,Ne.displacementmap,Ne.gradientmap,Ne.fog,Ne.lights,{emissive:{value:new Lt(0)}}]),vertexShader:pt.meshtoon_vert,fragmentShader:pt.meshtoon_frag},matcap:{uniforms:dn([Ne.common,Ne.bumpmap,Ne.normalmap,Ne.displacementmap,Ne.fog,{matcap:{value:null}}]),vertexShader:pt.meshmatcap_vert,fragmentShader:pt.meshmatcap_frag},points:{uniforms:dn([Ne.points,Ne.fog]),vertexShader:pt.points_vert,fragmentShader:pt.points_frag},dashed:{uniforms:dn([Ne.common,Ne.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:pt.linedashed_vert,fragmentShader:pt.linedashed_frag},depth:{uniforms:dn([Ne.common,Ne.displacementmap]),vertexShader:pt.depth_vert,fragmentShader:pt.depth_frag},normal:{uniforms:dn([Ne.common,Ne.bumpmap,Ne.normalmap,Ne.displacementmap,{opacity:{value:1}}]),vertexShader:pt.meshnormal_vert,fragmentShader:pt.meshnormal_frag},sprite:{uniforms:dn([Ne.sprite,Ne.fog]),vertexShader:pt.sprite_vert,fragmentShader:pt.sprite_frag},background:{uniforms:{uvTransform:{value:new ft},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:pt.background_vert,fragmentShader:pt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ft}},vertexShader:pt.backgroundCube_vert,fragmentShader:pt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:pt.cube_vert,fragmentShader:pt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:pt.equirect_vert,fragmentShader:pt.equirect_frag},distance:{uniforms:dn([Ne.common,Ne.displacementmap,{referencePosition:{value:new ne},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:pt.distance_vert,fragmentShader:pt.distance_frag},shadow:{uniforms:dn([Ne.lights,Ne.fog,{color:{value:new Lt(0)},opacity:{value:1}}]),vertexShader:pt.shadow_vert,fragmentShader:pt.shadow_frag}};qn.physical={uniforms:dn([qn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ft},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ft},clearcoatNormalScale:{value:new Ut(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ft},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ft},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ft},sheen:{value:0},sheenColor:{value:new Lt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ft},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ft},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ft},transmissionSamplerSize:{value:new Ut},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ft},attenuationDistance:{value:0},attenuationColor:{value:new Lt(0)},specularColor:{value:new Lt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ft},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ft},anisotropyVector:{value:new Ut},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ft}}]),vertexShader:pt.meshphysical_vert,fragmentShader:pt.meshphysical_frag};const Ar={r:0,b:0,g:0},Fi=new mi,cg=new $t;function ug(i,e,t,n,a,r){const s=new Lt(0);let o=a===!0?0:1,c,l,d=null,h=0,u=null;function m(y){let C=y.isScene===!0?y.background:null;if(C&&C.isTexture){const E=y.backgroundBlurriness>0;C=e.get(C,E)}return C}function v(y){let C=!1;const E=m(y);E===null?p(s,o):E&&E.isColor&&(p(E,1),C=!0);const F=i.xr.getEnvironmentBlendMode();F==="additive"?t.buffers.color.setClear(0,0,0,1,r):F==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||C)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function A(y,C){const E=m(C);E&&(E.isCubeTexture||E.mapping===zr)?(l===void 0&&(l=new ei(new Qa(1,1,1),new ti({name:"BackgroundCubeMaterial",uniforms:Sa(qn.backgroundCube.uniforms),vertexShader:qn.backgroundCube.vertexShader,fragmentShader:qn.backgroundCube.fragmentShader,side:mn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(F,D,k){this.matrixWorld.copyPosition(k.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),Fi.copy(C.backgroundRotation),Fi.x*=-1,Fi.y*=-1,Fi.z*=-1,E.isCubeTexture&&E.isRenderTargetTexture===!1&&(Fi.y*=-1,Fi.z*=-1),l.material.uniforms.envMap.value=E,l.material.uniforms.flipEnvMap.value=E.isCubeTexture&&E.isRenderTargetTexture===!1?-1:1,l.material.uniforms.backgroundBlurriness.value=C.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(cg.makeRotationFromEuler(Fi)),l.material.toneMapped=yt.getTransfer(E.colorSpace)!==Pt,(d!==E||h!==E.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,d=E,h=E.version,u=i.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null)):E&&E.isTexture&&(c===void 0&&(c=new ei(new Hr(2,2),new ti({name:"BackgroundMaterial",uniforms:Sa(qn.background.uniforms),vertexShader:qn.background.vertexShader,fragmentShader:qn.background.fragmentShader,side:wi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=E,c.material.uniforms.backgroundIntensity.value=C.backgroundIntensity,c.material.toneMapped=yt.getTransfer(E.colorSpace)!==Pt,E.matrixAutoUpdate===!0&&E.updateMatrix(),c.material.uniforms.uvTransform.value.copy(E.matrix),(d!==E||h!==E.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,d=E,h=E.version,u=i.toneMapping),c.layers.enableAll(),y.unshift(c,c.geometry,c.material,0,0,null))}function p(y,C){y.getRGB(Ar,au(i)),t.buffers.color.setClear(Ar.r,Ar.g,Ar.b,C,r)}function f(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return s},setClearColor:function(y,C=1){s.set(y),o=C,p(s,o)},getClearAlpha:function(){return o},setClearAlpha:function(y){o=y,p(s,o)},render:v,addToRenderList:A,dispose:f}}function dg(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},a=u(null);let r=a,s=!1;function o(S,O,H,q,ee){let J=!1;const Y=h(S,q,H,O);r!==Y&&(r=Y,l(r.object)),J=m(S,q,H,ee),J&&v(S,q,H,ee),ee!==null&&e.update(ee,i.ELEMENT_ARRAY_BUFFER),(J||s)&&(s=!1,E(S,O,H,q),ee!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(ee).buffer))}function c(){return i.createVertexArray()}function l(S){return i.bindVertexArray(S)}function d(S){return i.deleteVertexArray(S)}function h(S,O,H,q){const ee=q.wireframe===!0;let J=n[O.id];J===void 0&&(J={},n[O.id]=J);const Y=S.isInstancedMesh===!0?S.id:0;let ve=J[Y];ve===void 0&&(ve={},J[Y]=ve);let _e=ve[H.id];_e===void 0&&(_e={},ve[H.id]=_e);let Pe=_e[ee];return Pe===void 0&&(Pe=u(c()),_e[ee]=Pe),Pe}function u(S){const O=[],H=[],q=[];for(let ee=0;ee<t;ee++)O[ee]=0,H[ee]=0,q[ee]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:O,enabledAttributes:H,attributeDivisors:q,object:S,attributes:{},index:null}}function m(S,O,H,q){const ee=r.attributes,J=O.attributes;let Y=0;const ve=H.getAttributes();for(const _e in ve)if(ve[_e].location>=0){const ue=ee[_e];let De=J[_e];if(De===void 0&&(_e==="instanceMatrix"&&S.instanceMatrix&&(De=S.instanceMatrix),_e==="instanceColor"&&S.instanceColor&&(De=S.instanceColor)),ue===void 0||ue.attribute!==De||De&&ue.data!==De.data)return!0;Y++}return r.attributesNum!==Y||r.index!==q}function v(S,O,H,q){const ee={},J=O.attributes;let Y=0;const ve=H.getAttributes();for(const _e in ve)if(ve[_e].location>=0){let ue=J[_e];ue===void 0&&(_e==="instanceMatrix"&&S.instanceMatrix&&(ue=S.instanceMatrix),_e==="instanceColor"&&S.instanceColor&&(ue=S.instanceColor));const De={};De.attribute=ue,ue&&ue.data&&(De.data=ue.data),ee[_e]=De,Y++}r.attributes=ee,r.attributesNum=Y,r.index=q}function A(){const S=r.newAttributes;for(let O=0,H=S.length;O<H;O++)S[O]=0}function p(S){f(S,0)}function f(S,O){const H=r.newAttributes,q=r.enabledAttributes,ee=r.attributeDivisors;H[S]=1,q[S]===0&&(i.enableVertexAttribArray(S),q[S]=1),ee[S]!==O&&(i.vertexAttribDivisor(S,O),ee[S]=O)}function y(){const S=r.newAttributes,O=r.enabledAttributes;for(let H=0,q=O.length;H<q;H++)O[H]!==S[H]&&(i.disableVertexAttribArray(H),O[H]=0)}function C(S,O,H,q,ee,J,Y){Y===!0?i.vertexAttribIPointer(S,O,H,ee,J):i.vertexAttribPointer(S,O,H,q,ee,J)}function E(S,O,H,q){A();const ee=q.attributes,J=H.getAttributes(),Y=O.defaultAttributeValues;for(const ve in J){const _e=J[ve];if(_e.location>=0){let Pe=ee[ve];if(Pe===void 0&&(ve==="instanceMatrix"&&S.instanceMatrix&&(Pe=S.instanceMatrix),ve==="instanceColor"&&S.instanceColor&&(Pe=S.instanceColor)),Pe!==void 0){const ue=Pe.normalized,De=Pe.itemSize,et=e.get(Pe);if(et===void 0)continue;const nt=et.buffer,xt=et.type,se=et.bytesPerElement,Ae=xt===i.INT||xt===i.UNSIGNED_INT||Pe.gpuType===Zo;if(Pe.isInterleavedBufferAttribute){const te=Pe.data,Se=te.stride,we=Pe.offset;if(te.isInstancedInterleavedBuffer){for(let Ge=0;Ge<_e.locationSize;Ge++)f(_e.location+Ge,te.meshPerAttribute);S.isInstancedMesh!==!0&&q._maxInstanceCount===void 0&&(q._maxInstanceCount=te.meshPerAttribute*te.count)}else for(let Ge=0;Ge<_e.locationSize;Ge++)p(_e.location+Ge);i.bindBuffer(i.ARRAY_BUFFER,nt);for(let Ge=0;Ge<_e.locationSize;Ge++)C(_e.location+Ge,De/_e.locationSize,xt,ue,Se*se,(we+De/_e.locationSize*Ge)*se,Ae)}else{if(Pe.isInstancedBufferAttribute){for(let te=0;te<_e.locationSize;te++)f(_e.location+te,Pe.meshPerAttribute);S.isInstancedMesh!==!0&&q._maxInstanceCount===void 0&&(q._maxInstanceCount=Pe.meshPerAttribute*Pe.count)}else for(let te=0;te<_e.locationSize;te++)p(_e.location+te);i.bindBuffer(i.ARRAY_BUFFER,nt);for(let te=0;te<_e.locationSize;te++)C(_e.location+te,De/_e.locationSize,xt,ue,De*se,De/_e.locationSize*te*se,Ae)}}else if(Y!==void 0){const ue=Y[ve];if(ue!==void 0)switch(ue.length){case 2:i.vertexAttrib2fv(_e.location,ue);break;case 3:i.vertexAttrib3fv(_e.location,ue);break;case 4:i.vertexAttrib4fv(_e.location,ue);break;default:i.vertexAttrib1fv(_e.location,ue)}}}}y()}function F(){w();for(const S in n){const O=n[S];for(const H in O){const q=O[H];for(const ee in q){const J=q[ee];for(const Y in J)d(J[Y].object),delete J[Y];delete q[ee]}}delete n[S]}}function D(S){if(n[S.id]===void 0)return;const O=n[S.id];for(const H in O){const q=O[H];for(const ee in q){const J=q[ee];for(const Y in J)d(J[Y].object),delete J[Y];delete q[ee]}}delete n[S.id]}function k(S){for(const O in n){const H=n[O];for(const q in H){const ee=H[q];if(ee[S.id]===void 0)continue;const J=ee[S.id];for(const Y in J)d(J[Y].object),delete J[Y];delete ee[S.id]}}}function x(S){for(const O in n){const H=n[O],q=S.isInstancedMesh===!0?S.id:0,ee=H[q];if(ee!==void 0){for(const J in ee){const Y=ee[J];for(const ve in Y)d(Y[ve].object),delete Y[ve];delete ee[J]}delete H[q],Object.keys(H).length===0&&delete n[O]}}}function w(){L(),s=!0,r!==a&&(r=a,l(r.object))}function L(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:o,reset:w,resetDefaultState:L,dispose:F,releaseStatesOfGeometry:D,releaseStatesOfObject:x,releaseStatesOfProgram:k,initAttributes:A,enableAttribute:p,disableUnusedAttributes:y}}function fg(i,e,t){let n;function a(l){n=l}function r(l,d){i.drawArrays(n,l,d),t.update(d,n,1)}function s(l,d,h){h!==0&&(i.drawArraysInstanced(n,l,d,h),t.update(d,n,h))}function o(l,d,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,d,0,h);let m=0;for(let v=0;v<h;v++)m+=d[v];t.update(m,n,1)}function c(l,d,h,u){if(h===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let v=0;v<l.length;v++)s(l[v],d[v],u[v]);else{m.multiDrawArraysInstancedWEBGL(n,l,0,d,0,u,0,h);let v=0;for(let A=0;A<h;A++)v+=d[A]*u[A];t.update(v,n,1)}}this.setMode=a,this.render=r,this.renderInstances=s,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function hg(i,e,t,n){let a;function r(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const k=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(k.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function s(k){return!(k!==Bn&&n.convert(k)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(k){const x=k===hi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(k!==An&&n.convert(k)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&k!==Yn&&!x)}function c(k){if(k==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";k="mediump"}return k==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const d=c(l);d!==l&&(lt("WebGLRenderer:",l,"not supported, using",d,"instead."),l=d);const h=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),m=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),A=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),f=i.getParameter(i.MAX_VERTEX_ATTRIBS),y=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),C=i.getParameter(i.MAX_VARYING_VECTORS),E=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),F=i.getParameter(i.MAX_SAMPLES),D=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:s,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:h,reversedDepthBuffer:u,maxTextures:m,maxVertexTextures:v,maxTextureSize:A,maxCubemapSize:p,maxAttributes:f,maxVertexUniforms:y,maxVaryings:C,maxFragmentUniforms:E,maxSamples:F,samples:D}}function pg(i){const e=this;let t=null,n=0,a=!1,r=!1;const s=new Bi,o=new ft,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,u){const m=h.length!==0||u||n!==0||a;return a=u,n=h.length,m},this.beginShadows=function(){r=!0,d(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(h,u){t=d(h,u,0)},this.setState=function(h,u,m){const v=h.clippingPlanes,A=h.clipIntersection,p=h.clipShadows,f=i.get(h);if(!a||v===null||v.length===0||r&&!p)r?d(null):l();else{const y=r?0:n,C=y*4;let E=f.clippingState||null;c.value=E,E=d(v,u,C,m);for(let F=0;F!==C;++F)E[F]=t[F];f.clippingState=E,this.numIntersection=A?this.numPlanes:0,this.numPlanes+=y}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function d(h,u,m,v){const A=h!==null?h.length:0;let p=null;if(A!==0){if(p=c.value,v!==!0||p===null){const f=m+A*4,y=u.matrixWorldInverse;o.getNormalMatrix(y),(p===null||p.length<f)&&(p=new Float32Array(f));for(let C=0,E=m;C!==A;++C,E+=4)s.copy(h[C]).applyMatrix4(y,o),s.normal.toArray(p,E),p[E+3]=s.constant}c.value=p,c.needsUpdate=!0}return e.numPlanes=A,e.numIntersection=0,p}}const Ai=4,Ql=[.125,.215,.35,.446,.526,.582],Vi=20,mg=256,Ba=new su,ec=new Lt;let $s=null,qs=0,Ys=0,Ks=!1;const gg=new ne;class tc{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,a=100,r={}){const{size:s=256,position:o=gg}=r;$s=this._renderer.getRenderTarget(),qs=this._renderer.getActiveCubeFace(),Ys=this._renderer.getActiveMipmapLevel(),Ks=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(s);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,a,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ac(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ic(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget($s,qs,Ys),this._renderer.xr.enabled=Ks,e.scissorTest=!1,da(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Hi||e.mapping===va?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),$s=this._renderer.getRenderTarget(),qs=this._renderer.getActiveCubeFace(),Ys=this._renderer.getActiveMipmapLevel(),Ks=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:sn,minFilter:sn,generateMipmaps:!1,type:hi,format:Bn,colorSpace:Ma,depthBuffer:!1},a=nc(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=nc(e,t,n);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=_g(r)),this._blurMaterial=xg(r,e,t),this._ggxMaterial=vg(r,e,t)}return a}_compileMaterial(e){const t=new ei(new ni,e);this._renderer.compile(t,Ba)}_sceneToCubeUV(e,t,n,a,r){const c=new Tn(90,1,t,n),l=[1,-1,1,1,1,1],d=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,m=h.toneMapping;h.getClearColor(ec),h.toneMapping=Zn,h.autoClear=!1,h.state.buffers.depth.getReversed()&&(h.setRenderTarget(a),h.clearDepth(),h.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new ei(new Qa,new ol({name:"PMREM.Background",side:mn,depthWrite:!1,depthTest:!1})));const A=this._backgroundBox,p=A.material;let f=!1;const y=e.background;y?y.isColor&&(p.color.copy(y),e.background=null,f=!0):(p.color.copy(ec),f=!0);for(let C=0;C<6;C++){const E=C%3;E===0?(c.up.set(0,l[C],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+d[C],r.y,r.z)):E===1?(c.up.set(0,0,l[C]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+d[C],r.z)):(c.up.set(0,l[C],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+d[C]));const F=this._cubeSize;da(a,E*F,C>2?F:0,F,F),h.setRenderTarget(a),f&&h.render(A,c),h.render(e,c)}h.toneMapping=m,h.autoClear=u,e.background=y}_textureToCubeUV(e,t){const n=this._renderer,a=e.mapping===Hi||e.mapping===va;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=ac()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=ic());const r=a?this._cubemapMaterial:this._equirectMaterial,s=this._lodMeshes[0];s.material=r;const o=r.uniforms;o.envMap.value=e;const c=this._cubeSize;da(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(s,Ba)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let r=1;r<a;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){const a=this._renderer,r=this._pingPongRenderTarget,s=this._ggxMaterial,o=this._lodMeshes[n];o.material=s;const c=s.uniforms,l=n/(this._lodMeshes.length-1),d=t/(this._lodMeshes.length-1),h=Math.sqrt(l*l-d*d),u=0+l*1.25,m=h*u,{_lodMax:v}=this,A=this._sizeLods[n],p=3*A*(n>v-Ai?n-v+Ai:0),f=4*(this._cubeSize-A);c.envMap.value=e.texture,c.roughness.value=m,c.mipInt.value=v-t,da(r,p,f,3*A,2*A),a.setRenderTarget(r),a.render(o,Ba),c.envMap.value=r.texture,c.roughness.value=0,c.mipInt.value=v-n,da(e,p,f,3*A,2*A),a.setRenderTarget(e),a.render(o,Ba)}_blur(e,t,n,a,r){const s=this._pingPongRenderTarget;this._halfBlur(e,s,t,n,a,"latitudinal",r),this._halfBlur(s,e,n,n,a,"longitudinal",r)}_halfBlur(e,t,n,a,r,s,o){const c=this._renderer,l=this._blurMaterial;s!=="latitudinal"&&s!=="longitudinal"&&bt("blur direction must be either latitudinal or longitudinal!");const d=3,h=this._lodMeshes[a];h.material=l;const u=l.uniforms,m=this._sizeLods[n]-1,v=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*Vi-1),A=r/v,p=isFinite(r)?1+Math.floor(d*A):Vi;p>Vi&&lt(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Vi}`);const f=[];let y=0;for(let k=0;k<Vi;++k){const x=k/A,w=Math.exp(-x*x/2);f.push(w),k===0?y+=w:k<p&&(y+=2*w)}for(let k=0;k<f.length;k++)f[k]=f[k]/y;u.envMap.value=e.texture,u.samples.value=p,u.weights.value=f,u.latitudinal.value=s==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:C}=this;u.dTheta.value=v,u.mipInt.value=C-n;const E=this._sizeLods[a],F=3*E*(a>C-Ai?a-C+Ai:0),D=4*(this._cubeSize-E);da(t,F,D,3*E,2*E),c.setRenderTarget(t),c.render(h,Ba)}}function _g(i){const e=[],t=[],n=[];let a=i;const r=i-Ai+1+Ql.length;for(let s=0;s<r;s++){const o=Math.pow(2,a);e.push(o);let c=1/o;s>i-Ai?c=Ql[s-i+Ai-1]:s===0&&(c=0),t.push(c);const l=1/(o-2),d=-l,h=1+l,u=[d,d,h,d,h,h,d,d,h,h,d,h],m=6,v=6,A=3,p=2,f=1,y=new Float32Array(A*v*m),C=new Float32Array(p*v*m),E=new Float32Array(f*v*m);for(let D=0;D<m;D++){const k=D%3*2/3-1,x=D>2?0:-1,w=[k,x,0,k+2/3,x,0,k+2/3,x+1,0,k,x,0,k+2/3,x+1,0,k,x+1,0];y.set(w,A*v*D),C.set(u,p*v*D);const L=[D,D,D,D,D,D];E.set(L,f*v*D)}const F=new ni;F.setAttribute("position",new Jn(y,A)),F.setAttribute("uv",new Jn(C,p)),F.setAttribute("faceIndex",new Jn(E,f)),n.push(new ei(F,null)),a>Ai&&a--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function nc(i,e,t){const n=new jn(i,e,t);return n.texture.mapping=zr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function da(i,e,t,n,a){i.viewport.set(e,t,n,a),i.scissor.set(e,t,n,a)}function vg(i,e,t){return new ti({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:mg,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Wr(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:di,depthTest:!1,depthWrite:!1})}function xg(i,e,t){const n=new Float32Array(Vi),a=new ne(0,1,0);return new ti({name:"SphericalGaussianBlur",defines:{n:Vi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:Wr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:di,depthTest:!1,depthWrite:!1})}function ic(){return new ti({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Wr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:di,depthTest:!1,depthWrite:!1})}function ac(){return new ti({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Wr(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:di,depthTest:!1,depthWrite:!1})}function Wr(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class lu extends jn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},a=[n,n,n,n,n,n];this.texture=new nu(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},a=new Qa(5,5,5),r=new ti({name:"CubemapFromEquirect",uniforms:Sa(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:mn,blending:di});r.uniforms.tEquirect.value=t;const s=new ei(a,r),o=t.minFilter;return t.minFilter===zi&&(t.minFilter=sn),new Ah(1,10,this).update(e,s),t.minFilter=o,s.geometry.dispose(),s.material.dispose(),this}clear(e,t=!0,n=!0,a=!0){const r=e.getRenderTarget();for(let s=0;s<6;s++)e.setRenderTarget(this,s),e.clear(t,n,a);e.setRenderTarget(r)}}function Mg(i){let e=new WeakMap,t=new WeakMap,n=null;function a(u,m=!1){return u==null?null:m?s(u):r(u)}function r(u){if(u&&u.isTexture){const m=u.mapping;if(m===Ms||m===Ss)if(e.has(u)){const v=e.get(u).texture;return o(v,u.mapping)}else{const v=u.image;if(v&&v.height>0){const A=new lu(v.height);return A.fromEquirectangularTexture(i,u),e.set(u,A),u.addEventListener("dispose",l),o(A.texture,u.mapping)}else return null}}return u}function s(u){if(u&&u.isTexture){const m=u.mapping,v=m===Ms||m===Ss,A=m===Hi||m===va;if(v||A){let p=t.get(u);const f=p!==void 0?p.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==f)return n===null&&(n=new tc(i)),p=v?n.fromEquirectangular(u,p):n.fromCubemap(u,p),p.texture.pmremVersion=u.pmremVersion,t.set(u,p),p.texture;if(p!==void 0)return p.texture;{const y=u.image;return v&&y&&y.height>0||A&&y&&c(y)?(n===null&&(n=new tc(i)),p=v?n.fromEquirectangular(u):n.fromCubemap(u),p.texture.pmremVersion=u.pmremVersion,t.set(u,p),u.addEventListener("dispose",d),p.texture):null}}}return u}function o(u,m){return m===Ms?u.mapping=Hi:m===Ss&&(u.mapping=va),u}function c(u){let m=0;const v=6;for(let A=0;A<v;A++)u[A]!==void 0&&m++;return m===v}function l(u){const m=u.target;m.removeEventListener("dispose",l);const v=e.get(m);v!==void 0&&(e.delete(m),v.dispose())}function d(u){const m=u.target;m.removeEventListener("dispose",d);const v=t.get(m);v!==void 0&&(t.delete(m),v.dispose())}function h(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:a,dispose:h}}function Sg(i){const e={};function t(n){if(e[n]!==void 0)return e[n];const a=i.getExtension(n);return e[n]=a,a}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const a=t(n);return a===null&&Br("WebGLRenderer: "+n+" extension not supported."),a}}}function yg(i,e,t,n){const a={},r=new WeakMap;function s(h){const u=h.target;u.index!==null&&e.remove(u.index);for(const v in u.attributes)e.remove(u.attributes[v]);u.removeEventListener("dispose",s),delete a[u.id];const m=r.get(u);m&&(e.remove(m),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function o(h,u){return a[u.id]===!0||(u.addEventListener("dispose",s),a[u.id]=!0,t.memory.geometries++),u}function c(h){const u=h.attributes;for(const m in u)e.update(u[m],i.ARRAY_BUFFER)}function l(h){const u=[],m=h.index,v=h.attributes.position;let A=0;if(v===void 0)return;if(m!==null){const y=m.array;A=m.version;for(let C=0,E=y.length;C<E;C+=3){const F=y[C+0],D=y[C+1],k=y[C+2];u.push(F,D,D,k,k,F)}}else{const y=v.array;A=v.version;for(let C=0,E=y.length/3-1;C<E;C+=3){const F=C+0,D=C+1,k=C+2;u.push(F,D,D,k,k,F)}}const p=new(v.count>=65535?eu:Qc)(u,1);p.version=A;const f=r.get(h);f&&e.remove(f),r.set(h,p)}function d(h){const u=r.get(h);if(u){const m=h.index;m!==null&&u.version<m.version&&l(h)}else l(h);return r.get(h)}return{get:o,update:c,getWireframeAttribute:d}}function Eg(i,e,t){let n;function a(u){n=u}let r,s;function o(u){r=u.type,s=u.bytesPerElement}function c(u,m){i.drawElements(n,m,r,u*s),t.update(m,n,1)}function l(u,m,v){v!==0&&(i.drawElementsInstanced(n,m,r,u*s,v),t.update(m,n,v))}function d(u,m,v){if(v===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,m,0,r,u,0,v);let p=0;for(let f=0;f<v;f++)p+=m[f];t.update(p,n,1)}function h(u,m,v,A){if(v===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let f=0;f<u.length;f++)l(u[f]/s,m[f],A[f]);else{p.multiDrawElementsInstancedWEBGL(n,m,0,r,u,0,A,0,v);let f=0;for(let y=0;y<v;y++)f+=m[y]*A[y];t.update(f,n,1)}}this.setMode=a,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=d,this.renderMultiDrawInstances=h}function bg(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,s,o){switch(t.calls++,s){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:bt("WebGLInfo: Unknown draw mode:",s);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:n}}function Tg(i,e,t){const n=new WeakMap,a=new Ht;function r(s,o,c){const l=s.morphTargetInfluences,d=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,h=d!==void 0?d.length:0;let u=n.get(o);if(u===void 0||u.count!==h){let w=function(){k.dispose(),n.delete(o),o.removeEventListener("dispose",w)};u!==void 0&&u.texture.dispose();const m=o.morphAttributes.position!==void 0,v=o.morphAttributes.normal!==void 0,A=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],f=o.morphAttributes.normal||[],y=o.morphAttributes.color||[];let C=0;m===!0&&(C=1),v===!0&&(C=2),A===!0&&(C=3);let E=o.attributes.position.count*C,F=1;E>e.maxTextureSize&&(F=Math.ceil(E/e.maxTextureSize),E=e.maxTextureSize);const D=new Float32Array(E*F*4*h),k=new Zc(D,E,F,h);k.type=Yn,k.needsUpdate=!0;const x=C*4;for(let L=0;L<h;L++){const S=p[L],O=f[L],H=y[L],q=E*F*4*L;for(let ee=0;ee<S.count;ee++){const J=ee*x;m===!0&&(a.fromBufferAttribute(S,ee),D[q+J+0]=a.x,D[q+J+1]=a.y,D[q+J+2]=a.z,D[q+J+3]=0),v===!0&&(a.fromBufferAttribute(O,ee),D[q+J+4]=a.x,D[q+J+5]=a.y,D[q+J+6]=a.z,D[q+J+7]=0),A===!0&&(a.fromBufferAttribute(H,ee),D[q+J+8]=a.x,D[q+J+9]=a.y,D[q+J+10]=a.z,D[q+J+11]=H.itemSize===4?a.w:1)}}u={count:h,texture:k,size:new Ut(E,F)},n.set(o,u),o.addEventListener("dispose",w)}if(s.isInstancedMesh===!0&&s.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",s.morphTexture,t);else{let m=0;for(let A=0;A<l.length;A++)m+=l[A];const v=o.morphTargetsRelative?1:1-m;c.getUniforms().setValue(i,"morphTargetBaseInfluence",v),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",u.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function Ag(i,e,t,n,a){let r=new WeakMap;function s(l){const d=a.render.frame,h=l.geometry,u=e.get(l,h);if(r.get(u)!==d&&(e.update(u),r.set(u,d)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),r.get(l)!==d&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,d))),l.isSkinnedMesh){const m=l.skeleton;r.get(m)!==d&&(m.update(),r.set(m,d))}return u}function o(){r=new WeakMap}function c(l){const d=l.target;d.removeEventListener("dispose",c),n.releaseStatesOfObject(d),t.remove(d.instanceMatrix),d.instanceColor!==null&&t.remove(d.instanceColor)}return{update:s,dispose:o}}const wg={[Uc]:"LINEAR_TONE_MAPPING",[Nc]:"REINHARD_TONE_MAPPING",[Fc]:"CINEON_TONE_MAPPING",[Oc]:"ACES_FILMIC_TONE_MAPPING",[kc]:"AGX_TONE_MAPPING",[Vc]:"NEUTRAL_TONE_MAPPING",[Bc]:"CUSTOM_TONE_MAPPING"};function Cg(i,e,t,n,a){const r=new jn(e,t,{type:i,depthBuffer:n,stencilBuffer:a}),s=new jn(e,t,{type:hi,depthBuffer:!1,stencilBuffer:!1}),o=new ni;o.setAttribute("position",new wn([-1,3,0,-1,-1,0,3,-1,0],3)),o.setAttribute("uv",new wn([0,2,0,0,2,0],2));const c=new xh({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),l=new ei(o,c),d=new su(-1,1,1,-1,0,1);let h=null,u=null,m=!1,v,A=null,p=[],f=!1;this.setSize=function(y,C){r.setSize(y,C),s.setSize(y,C);for(let E=0;E<p.length;E++){const F=p[E];F.setSize&&F.setSize(y,C)}},this.setEffects=function(y){p=y,f=p.length>0&&p[0].isRenderPass===!0;const C=r.width,E=r.height;for(let F=0;F<p.length;F++){const D=p[F];D.setSize&&D.setSize(C,E)}},this.begin=function(y,C){if(m||y.toneMapping===Zn&&p.length===0)return!1;if(A=C,C!==null){const E=C.width,F=C.height;(r.width!==E||r.height!==F)&&this.setSize(E,F)}return f===!1&&y.setRenderTarget(r),v=y.toneMapping,y.toneMapping=Zn,!0},this.hasRenderPass=function(){return f},this.end=function(y,C){y.toneMapping=v,m=!0;let E=r,F=s;for(let D=0;D<p.length;D++){const k=p[D];if(k.enabled!==!1&&(k.render(y,F,E,C),k.needsSwap!==!1)){const x=E;E=F,F=x}}if(h!==y.outputColorSpace||u!==y.toneMapping){h=y.outputColorSpace,u=y.toneMapping,c.defines={},yt.getTransfer(h)===Pt&&(c.defines.SRGB_TRANSFER="");const D=wg[u];D&&(c.defines[D]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=E.texture,y.setRenderTarget(A),y.render(l,d),A=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){r.dispose(),s.dispose(),o.dispose(),c.dispose()}}const cu=new on,Ho=new ja(1,1),uu=new Zc,du=new Kf,fu=new nu,rc=[],sc=[],oc=new Float32Array(16),lc=new Float32Array(9),cc=new Float32Array(4);function Ta(i,e,t){const n=i[0];if(n<=0||n>0)return i;const a=e*t;let r=rc[a];if(r===void 0&&(r=new Float32Array(a),rc[a]=r),e!==0){n.toArray(r,0);for(let s=1,o=0;s!==e;++s)o+=t,i[s].toArray(r,o)}return r}function Yt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Kt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Xr(i,e){let t=sc[e];t===void 0&&(t=new Int32Array(e),sc[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function Rg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Pg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Yt(t,e))return;i.uniform2fv(this.addr,e),Kt(t,e)}}function Dg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Yt(t,e))return;i.uniform3fv(this.addr,e),Kt(t,e)}}function Ig(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Yt(t,e))return;i.uniform4fv(this.addr,e),Kt(t,e)}}function Lg(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Yt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Kt(t,e)}else{if(Yt(t,n))return;cc.set(n),i.uniformMatrix2fv(this.addr,!1,cc),Kt(t,n)}}function Ug(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Yt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Kt(t,e)}else{if(Yt(t,n))return;lc.set(n),i.uniformMatrix3fv(this.addr,!1,lc),Kt(t,n)}}function Ng(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Yt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Kt(t,e)}else{if(Yt(t,n))return;oc.set(n),i.uniformMatrix4fv(this.addr,!1,oc),Kt(t,n)}}function Fg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function Og(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Yt(t,e))return;i.uniform2iv(this.addr,e),Kt(t,e)}}function Bg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Yt(t,e))return;i.uniform3iv(this.addr,e),Kt(t,e)}}function kg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Yt(t,e))return;i.uniform4iv(this.addr,e),Kt(t,e)}}function Vg(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function zg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Yt(t,e))return;i.uniform2uiv(this.addr,e),Kt(t,e)}}function Gg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Yt(t,e))return;i.uniform3uiv(this.addr,e),Kt(t,e)}}function Hg(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Yt(t,e))return;i.uniform4uiv(this.addr,e),Kt(t,e)}}function Wg(i,e,t){const n=this.cache,a=t.allocateTextureUnit();n[0]!==a&&(i.uniform1i(this.addr,a),n[0]=a);let r;this.type===i.SAMPLER_2D_SHADOW?(Ho.compareFunction=t.isReversedDepthBuffer()?il:nl,r=Ho):r=cu,t.setTexture2D(e||r,a)}function Xg(i,e,t){const n=this.cache,a=t.allocateTextureUnit();n[0]!==a&&(i.uniform1i(this.addr,a),n[0]=a),t.setTexture3D(e||du,a)}function $g(i,e,t){const n=this.cache,a=t.allocateTextureUnit();n[0]!==a&&(i.uniform1i(this.addr,a),n[0]=a),t.setTextureCube(e||fu,a)}function qg(i,e,t){const n=this.cache,a=t.allocateTextureUnit();n[0]!==a&&(i.uniform1i(this.addr,a),n[0]=a),t.setTexture2DArray(e||uu,a)}function Yg(i){switch(i){case 5126:return Rg;case 35664:return Pg;case 35665:return Dg;case 35666:return Ig;case 35674:return Lg;case 35675:return Ug;case 35676:return Ng;case 5124:case 35670:return Fg;case 35667:case 35671:return Og;case 35668:case 35672:return Bg;case 35669:case 35673:return kg;case 5125:return Vg;case 36294:return zg;case 36295:return Gg;case 36296:return Hg;case 35678:case 36198:case 36298:case 36306:case 35682:return Wg;case 35679:case 36299:case 36307:return Xg;case 35680:case 36300:case 36308:case 36293:return $g;case 36289:case 36303:case 36311:case 36292:return qg}}function Kg(i,e){i.uniform1fv(this.addr,e)}function Zg(i,e){const t=Ta(e,this.size,2);i.uniform2fv(this.addr,t)}function jg(i,e){const t=Ta(e,this.size,3);i.uniform3fv(this.addr,t)}function Jg(i,e){const t=Ta(e,this.size,4);i.uniform4fv(this.addr,t)}function Qg(i,e){const t=Ta(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function e_(i,e){const t=Ta(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function t_(i,e){const t=Ta(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function n_(i,e){i.uniform1iv(this.addr,e)}function i_(i,e){i.uniform2iv(this.addr,e)}function a_(i,e){i.uniform3iv(this.addr,e)}function r_(i,e){i.uniform4iv(this.addr,e)}function s_(i,e){i.uniform1uiv(this.addr,e)}function o_(i,e){i.uniform2uiv(this.addr,e)}function l_(i,e){i.uniform3uiv(this.addr,e)}function c_(i,e){i.uniform4uiv(this.addr,e)}function u_(i,e,t){const n=this.cache,a=e.length,r=Xr(t,a);Yt(n,r)||(i.uniform1iv(this.addr,r),Kt(n,r));let s;this.type===i.SAMPLER_2D_SHADOW?s=Ho:s=cu;for(let o=0;o!==a;++o)t.setTexture2D(e[o]||s,r[o])}function d_(i,e,t){const n=this.cache,a=e.length,r=Xr(t,a);Yt(n,r)||(i.uniform1iv(this.addr,r),Kt(n,r));for(let s=0;s!==a;++s)t.setTexture3D(e[s]||du,r[s])}function f_(i,e,t){const n=this.cache,a=e.length,r=Xr(t,a);Yt(n,r)||(i.uniform1iv(this.addr,r),Kt(n,r));for(let s=0;s!==a;++s)t.setTextureCube(e[s]||fu,r[s])}function h_(i,e,t){const n=this.cache,a=e.length,r=Xr(t,a);Yt(n,r)||(i.uniform1iv(this.addr,r),Kt(n,r));for(let s=0;s!==a;++s)t.setTexture2DArray(e[s]||uu,r[s])}function p_(i){switch(i){case 5126:return Kg;case 35664:return Zg;case 35665:return jg;case 35666:return Jg;case 35674:return Qg;case 35675:return e_;case 35676:return t_;case 5124:case 35670:return n_;case 35667:case 35671:return i_;case 35668:case 35672:return a_;case 35669:case 35673:return r_;case 5125:return s_;case 36294:return o_;case 36295:return l_;case 36296:return c_;case 35678:case 36198:case 36298:case 36306:case 35682:return u_;case 35679:case 36299:case 36307:return d_;case 35680:case 36300:case 36308:case 36293:return f_;case 36289:case 36303:case 36311:case 36292:return h_}}class m_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Yg(t.type)}}class g_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=p_(t.type)}}class __{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const a=this.seq;for(let r=0,s=a.length;r!==s;++r){const o=a[r];o.setValue(e,t[o.id],n)}}}const Zs=/(\w+)(\])?(\[|\.)?/g;function uc(i,e){i.seq.push(e),i.map[e.id]=e}function v_(i,e,t){const n=i.name,a=n.length;for(Zs.lastIndex=0;;){const r=Zs.exec(n),s=Zs.lastIndex;let o=r[1];const c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&s+2===a){uc(t,l===void 0?new m_(o,i,e):new g_(o,i,e));break}else{let h=t.map[o];h===void 0&&(h=new __(o),uc(t,h)),t=h}}}class Nr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){const o=e.getActiveUniform(t,s),c=e.getUniformLocation(t,o.name);v_(o,c,this)}const a=[],r=[];for(const s of this.seq)s.type===e.SAMPLER_2D_SHADOW||s.type===e.SAMPLER_CUBE_SHADOW||s.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(s):r.push(s);a.length>0&&(this.seq=a.concat(r))}setValue(e,t,n,a){const r=this.map[t];r!==void 0&&r.setValue(e,n,a)}setOptional(e,t,n){const a=t[n];a!==void 0&&this.setValue(e,n,a)}static upload(e,t,n,a){for(let r=0,s=t.length;r!==s;++r){const o=t[r],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,a)}}static seqWithValue(e,t){const n=[];for(let a=0,r=e.length;a!==r;++a){const s=e[a];s.id in t&&n.push(s)}return n}}function dc(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const x_=37297;let M_=0;function S_(i,e){const t=i.split(`
`),n=[],a=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let s=a;s<r;s++){const o=s+1;n.push(`${o===e?">":" "} ${o}: ${t[s]}`)}return n.join(`
`)}const fc=new ft;function y_(i){yt._getMatrix(fc,yt.workingColorSpace,i);const e=`mat3( ${fc.elements.map(t=>t.toFixed(4))} )`;switch(yt.getTransfer(i)){case Fr:return[e,"LinearTransferOETF"];case Pt:return[e,"sRGBTransferOETF"];default:return lt("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function hc(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const s=/ERROR: 0:(\d+)/.exec(r);if(s){const o=parseInt(s[1]);return t.toUpperCase()+`

`+r+`

`+S_(i.getShaderSource(e),o)}else return r}function E_(i,e){const t=y_(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const b_={[Uc]:"Linear",[Nc]:"Reinhard",[Fc]:"Cineon",[Oc]:"ACESFilmic",[kc]:"AgX",[Vc]:"Neutral",[Bc]:"Custom"};function T_(i,e){const t=b_[e];return t===void 0?(lt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const wr=new ne;function A_(){yt.getLuminanceCoefficients(wr);const i=wr.x.toFixed(4),e=wr.y.toFixed(4),t=wr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function w_(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ga).join(`
`)}function C_(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function R_(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<n;a++){const r=i.getActiveAttrib(e,a),s=r.name;let o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[s]={type:r.type,location:i.getAttribLocation(e,s),locationSize:o}}return t}function Ga(i){return i!==""}function pc(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function mc(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const P_=/^[ \t]*#include +<([\w\d./]+)>/gm;function Wo(i){return i.replace(P_,I_)}const D_=new Map;function I_(i,e){let t=pt[e];if(t===void 0){const n=D_.get(e);if(n!==void 0)t=pt[n],lt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Wo(t)}const L_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function gc(i){return i.replace(L_,U_)}function U_(i,e,t,n){let a="";for(let r=parseInt(e);r<parseInt(t);r++)a+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return a}function _c(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const N_={[Pr]:"SHADOWMAP_TYPE_PCF",[za]:"SHADOWMAP_TYPE_VSM"};function F_(i){return N_[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const O_={[Hi]:"ENVMAP_TYPE_CUBE",[va]:"ENVMAP_TYPE_CUBE",[zr]:"ENVMAP_TYPE_CUBE_UV"};function B_(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":O_[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const k_={[va]:"ENVMAP_MODE_REFRACTION"};function V_(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":k_[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const z_={[Lc]:"ENVMAP_BLENDING_MULTIPLY",[ff]:"ENVMAP_BLENDING_MIX",[hf]:"ENVMAP_BLENDING_ADD"};function G_(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":z_[i.combine]||"ENVMAP_BLENDING_NONE"}function H_(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function W_(i,e,t,n){const a=i.getContext(),r=t.defines;let s=t.vertexShader,o=t.fragmentShader;const c=F_(t),l=B_(t),d=V_(t),h=G_(t),u=H_(t),m=w_(t),v=C_(r),A=a.createProgram();let p,f,y=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(Ga).join(`
`),p.length>0&&(p+=`
`),f=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v].filter(Ga).join(`
`),f.length>0&&(f+=`
`)):(p=[_c(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+d:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ga).join(`
`),f=[_c(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,v,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+d:"",t.envMap?"#define "+h:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Zn?"#define TONE_MAPPING":"",t.toneMapping!==Zn?pt.tonemapping_pars_fragment:"",t.toneMapping!==Zn?T_("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",pt.colorspace_pars_fragment,E_("linearToOutputTexel",t.outputColorSpace),A_(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ga).join(`
`)),s=Wo(s),s=pc(s,t),s=mc(s,t),o=Wo(o),o=pc(o,t),o=mc(o,t),s=gc(s),o=gc(o),t.isRawShaderMaterial!==!0&&(y=`#version 300 es
`,p=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,f=["#define varying in",t.glslVersion===Pl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Pl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);const C=y+p+s,E=y+f+o,F=dc(a,a.VERTEX_SHADER,C),D=dc(a,a.FRAGMENT_SHADER,E);a.attachShader(A,F),a.attachShader(A,D),t.index0AttributeName!==void 0?a.bindAttribLocation(A,0,t.index0AttributeName):t.morphTargets===!0&&a.bindAttribLocation(A,0,"position"),a.linkProgram(A);function k(S){if(i.debug.checkShaderErrors){const O=a.getProgramInfoLog(A)||"",H=a.getShaderInfoLog(F)||"",q=a.getShaderInfoLog(D)||"",ee=O.trim(),J=H.trim(),Y=q.trim();let ve=!0,_e=!0;if(a.getProgramParameter(A,a.LINK_STATUS)===!1)if(ve=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,A,F,D);else{const Pe=hc(a,F,"vertex"),ue=hc(a,D,"fragment");bt("THREE.WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(A,a.VALIDATE_STATUS)+`

Material Name: `+S.name+`
Material Type: `+S.type+`

Program Info Log: `+ee+`
`+Pe+`
`+ue)}else ee!==""?lt("WebGLProgram: Program Info Log:",ee):(J===""||Y==="")&&(_e=!1);_e&&(S.diagnostics={runnable:ve,programLog:ee,vertexShader:{log:J,prefix:p},fragmentShader:{log:Y,prefix:f}})}a.deleteShader(F),a.deleteShader(D),x=new Nr(a,A),w=R_(a,A)}let x;this.getUniforms=function(){return x===void 0&&k(this),x};let w;this.getAttributes=function(){return w===void 0&&k(this),w};let L=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return L===!1&&(L=a.getProgramParameter(A,x_)),L},this.destroy=function(){n.releaseStatesOfProgram(this),a.deleteProgram(A),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=M_++,this.cacheKey=e,this.usedTimes=1,this.program=A,this.vertexShader=F,this.fragmentShader=D,this}let X_=0;class $_{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,a=this._getShaderStage(t),r=this._getShaderStage(n),s=this._getShaderCacheForMaterial(e);return s.has(a)===!1&&(s.add(a),a.usedTimes++),s.has(r)===!1&&(s.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new q_(e),t.set(e,n)),n}}class q_{constructor(e){this.id=X_++,this.code=e,this.usedTimes=0}}function Y_(i,e,t,n,a,r){const s=new jc,o=new $_,c=new Set,l=[],d=new Map,h=n.logarithmicDepthBuffer;let u=n.precision;const m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(x){return c.add(x),x===0?"uv":`uv${x}`}function A(x,w,L,S,O){const H=S.fog,q=O.geometry,ee=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?S.environment:null,J=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,Y=e.get(x.envMap||ee,J),ve=Y&&Y.mapping===zr?Y.image.height:null,_e=m[x.type];x.precision!==null&&(u=n.getMaxPrecision(x.precision),u!==x.precision&&lt("WebGLProgram.getParameters:",x.precision,"not supported, using",u,"instead."));const Pe=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,ue=Pe!==void 0?Pe.length:0;let De=0;q.morphAttributes.position!==void 0&&(De=1),q.morphAttributes.normal!==void 0&&(De=2),q.morphAttributes.color!==void 0&&(De=3);let et,nt,xt,se;if(_e){const Tt=qn[_e];et=Tt.vertexShader,nt=Tt.fragmentShader}else et=x.vertexShader,nt=x.fragmentShader,o.update(x),xt=o.getVertexShaderID(x),se=o.getFragmentShaderID(x);const Ae=i.getRenderTarget(),te=i.state.buffers.depth.getReversed(),Se=O.isInstancedMesh===!0,we=O.isBatchedMesh===!0,Ge=!!x.map,ct=!!x.matcap,Xe=!!Y,Je=!!x.aoMap,Ze=!!x.lightMap,tt=!!x.bumpMap,ht=!!x.normalMap,U=!!x.displacementMap,_t=!!x.emissiveMap,gt=!!x.metalnessMap,st=!!x.roughnessMap,ke=x.anisotropy>0,b=x.clearcoat>0,g=x.dispersion>0,z=x.iridescence>0,oe=x.sheen>0,pe=x.transmission>0,re=ke&&!!x.anisotropyMap,Oe=b&&!!x.clearcoatMap,be=b&&!!x.clearcoatNormalMap,N=b&&!!x.clearcoatRoughnessMap,V=z&&!!x.iridescenceMap,X=z&&!!x.iridescenceThicknessMap,$=oe&&!!x.sheenColorMap,me=oe&&!!x.sheenRoughnessMap,Ce=!!x.specularMap,ie=!!x.specularColorMap,Qe=!!x.specularIntensityMap,B=pe&&!!x.transmissionMap,ye=pe&&!!x.thicknessMap,ge=!!x.gradientMap,Be=!!x.alphaMap,xe=x.alphaTest>0,le=!!x.alphaHash,ze=!!x.extensions;let it=Zn;x.toneMapped&&(Ae===null||Ae.isXRRenderTarget===!0)&&(it=i.toneMapping);const St={shaderID:_e,shaderType:x.type,shaderName:x.name,vertexShader:et,fragmentShader:nt,defines:x.defines,customVertexShaderID:xt,customFragmentShaderID:se,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:u,batching:we,batchingColor:we&&O._colorsTexture!==null,instancing:Se,instancingColor:Se&&O.instanceColor!==null,instancingMorph:Se&&O.morphTexture!==null,outputColorSpace:Ae===null?i.outputColorSpace:Ae.isXRRenderTarget===!0?Ae.texture.colorSpace:Ma,alphaToCoverage:!!x.alphaToCoverage,map:Ge,matcap:ct,envMap:Xe,envMapMode:Xe&&Y.mapping,envMapCubeUVHeight:ve,aoMap:Je,lightMap:Ze,bumpMap:tt,normalMap:ht,displacementMap:U,emissiveMap:_t,normalMapObjectSpace:ht&&x.normalMapType===_f,normalMapTangentSpace:ht&&x.normalMapType===gf,metalnessMap:gt,roughnessMap:st,anisotropy:ke,anisotropyMap:re,clearcoat:b,clearcoatMap:Oe,clearcoatNormalMap:be,clearcoatRoughnessMap:N,dispersion:g,iridescence:z,iridescenceMap:V,iridescenceThicknessMap:X,sheen:oe,sheenColorMap:$,sheenRoughnessMap:me,specularMap:Ce,specularColorMap:ie,specularIntensityMap:Qe,transmission:pe,transmissionMap:B,thicknessMap:ye,gradientMap:ge,opaque:x.transparent===!1&&x.blending===ma&&x.alphaToCoverage===!1,alphaMap:Be,alphaTest:xe,alphaHash:le,combine:x.combine,mapUv:Ge&&v(x.map.channel),aoMapUv:Je&&v(x.aoMap.channel),lightMapUv:Ze&&v(x.lightMap.channel),bumpMapUv:tt&&v(x.bumpMap.channel),normalMapUv:ht&&v(x.normalMap.channel),displacementMapUv:U&&v(x.displacementMap.channel),emissiveMapUv:_t&&v(x.emissiveMap.channel),metalnessMapUv:gt&&v(x.metalnessMap.channel),roughnessMapUv:st&&v(x.roughnessMap.channel),anisotropyMapUv:re&&v(x.anisotropyMap.channel),clearcoatMapUv:Oe&&v(x.clearcoatMap.channel),clearcoatNormalMapUv:be&&v(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:N&&v(x.clearcoatRoughnessMap.channel),iridescenceMapUv:V&&v(x.iridescenceMap.channel),iridescenceThicknessMapUv:X&&v(x.iridescenceThicknessMap.channel),sheenColorMapUv:$&&v(x.sheenColorMap.channel),sheenRoughnessMapUv:me&&v(x.sheenRoughnessMap.channel),specularMapUv:Ce&&v(x.specularMap.channel),specularColorMapUv:ie&&v(x.specularColorMap.channel),specularIntensityMapUv:Qe&&v(x.specularIntensityMap.channel),transmissionMapUv:B&&v(x.transmissionMap.channel),thicknessMapUv:ye&&v(x.thicknessMap.channel),alphaMapUv:Be&&v(x.alphaMap.channel),vertexTangents:!!q.attributes.tangent&&(ht||ke),vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,pointsUvs:O.isPoints===!0&&!!q.attributes.uv&&(Ge||Be),fog:!!H,useFog:x.fog===!0,fogExp2:!!H&&H.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||q.attributes.normal===void 0&&ht===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:te,skinning:O.isSkinnedMesh===!0,morphTargets:q.morphAttributes.position!==void 0,morphNormals:q.morphAttributes.normal!==void 0,morphColors:q.morphAttributes.color!==void 0,morphTargetsCount:ue,morphTextureStride:De,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&L.length>0,shadowMapType:i.shadowMap.type,toneMapping:it,decodeVideoTexture:Ge&&x.map.isVideoTexture===!0&&yt.getTransfer(x.map.colorSpace)===Pt,decodeVideoTextureEmissive:_t&&x.emissiveMap.isVideoTexture===!0&&yt.getTransfer(x.emissiveMap.colorSpace)===Pt,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===li,flipSided:x.side===mn,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:ze&&x.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ze&&x.extensions.multiDraw===!0||we)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return St.vertexUv1s=c.has(1),St.vertexUv2s=c.has(2),St.vertexUv3s=c.has(3),c.clear(),St}function p(x){const w=[];if(x.shaderID?w.push(x.shaderID):(w.push(x.customVertexShaderID),w.push(x.customFragmentShaderID)),x.defines!==void 0)for(const L in x.defines)w.push(L),w.push(x.defines[L]);return x.isRawShaderMaterial===!1&&(f(w,x),y(w,x),w.push(i.outputColorSpace)),w.push(x.customProgramCacheKey),w.join()}function f(x,w){x.push(w.precision),x.push(w.outputColorSpace),x.push(w.envMapMode),x.push(w.envMapCubeUVHeight),x.push(w.mapUv),x.push(w.alphaMapUv),x.push(w.lightMapUv),x.push(w.aoMapUv),x.push(w.bumpMapUv),x.push(w.normalMapUv),x.push(w.displacementMapUv),x.push(w.emissiveMapUv),x.push(w.metalnessMapUv),x.push(w.roughnessMapUv),x.push(w.anisotropyMapUv),x.push(w.clearcoatMapUv),x.push(w.clearcoatNormalMapUv),x.push(w.clearcoatRoughnessMapUv),x.push(w.iridescenceMapUv),x.push(w.iridescenceThicknessMapUv),x.push(w.sheenColorMapUv),x.push(w.sheenRoughnessMapUv),x.push(w.specularMapUv),x.push(w.specularColorMapUv),x.push(w.specularIntensityMapUv),x.push(w.transmissionMapUv),x.push(w.thicknessMapUv),x.push(w.combine),x.push(w.fogExp2),x.push(w.sizeAttenuation),x.push(w.morphTargetsCount),x.push(w.morphAttributeCount),x.push(w.numDirLights),x.push(w.numPointLights),x.push(w.numSpotLights),x.push(w.numSpotLightMaps),x.push(w.numHemiLights),x.push(w.numRectAreaLights),x.push(w.numDirLightShadows),x.push(w.numPointLightShadows),x.push(w.numSpotLightShadows),x.push(w.numSpotLightShadowsWithMaps),x.push(w.numLightProbes),x.push(w.shadowMapType),x.push(w.toneMapping),x.push(w.numClippingPlanes),x.push(w.numClipIntersection),x.push(w.depthPacking)}function y(x,w){s.disableAll(),w.instancing&&s.enable(0),w.instancingColor&&s.enable(1),w.instancingMorph&&s.enable(2),w.matcap&&s.enable(3),w.envMap&&s.enable(4),w.normalMapObjectSpace&&s.enable(5),w.normalMapTangentSpace&&s.enable(6),w.clearcoat&&s.enable(7),w.iridescence&&s.enable(8),w.alphaTest&&s.enable(9),w.vertexColors&&s.enable(10),w.vertexAlphas&&s.enable(11),w.vertexUv1s&&s.enable(12),w.vertexUv2s&&s.enable(13),w.vertexUv3s&&s.enable(14),w.vertexTangents&&s.enable(15),w.anisotropy&&s.enable(16),w.alphaHash&&s.enable(17),w.batching&&s.enable(18),w.dispersion&&s.enable(19),w.batchingColor&&s.enable(20),w.gradientMap&&s.enable(21),x.push(s.mask),s.disableAll(),w.fog&&s.enable(0),w.useFog&&s.enable(1),w.flatShading&&s.enable(2),w.logarithmicDepthBuffer&&s.enable(3),w.reversedDepthBuffer&&s.enable(4),w.skinning&&s.enable(5),w.morphTargets&&s.enable(6),w.morphNormals&&s.enable(7),w.morphColors&&s.enable(8),w.premultipliedAlpha&&s.enable(9),w.shadowMapEnabled&&s.enable(10),w.doubleSided&&s.enable(11),w.flipSided&&s.enable(12),w.useDepthPacking&&s.enable(13),w.dithering&&s.enable(14),w.transmission&&s.enable(15),w.sheen&&s.enable(16),w.opaque&&s.enable(17),w.pointsUvs&&s.enable(18),w.decodeVideoTexture&&s.enable(19),w.decodeVideoTextureEmissive&&s.enable(20),w.alphaToCoverage&&s.enable(21),x.push(s.mask)}function C(x){const w=m[x.type];let L;if(w){const S=qn[w];L=gh.clone(S.uniforms)}else L=x.uniforms;return L}function E(x,w){let L=d.get(w);return L!==void 0?++L.usedTimes:(L=new W_(i,w,x,a),l.push(L),d.set(w,L)),L}function F(x){if(--x.usedTimes===0){const w=l.indexOf(x);l[w]=l[l.length-1],l.pop(),d.delete(x.cacheKey),x.destroy()}}function D(x){o.remove(x)}function k(){o.dispose()}return{getParameters:A,getProgramCacheKey:p,getUniforms:C,acquireProgram:E,releaseProgram:F,releaseShaderCache:D,programs:l,dispose:k}}function K_(){let i=new WeakMap;function e(s){return i.has(s)}function t(s){let o=i.get(s);return o===void 0&&(o={},i.set(s,o)),o}function n(s){i.delete(s)}function a(s,o,c){i.get(s)[o]=c}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:a,dispose:r}}function Z_(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function vc(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function xc(){const i=[];let e=0;const t=[],n=[],a=[];function r(){e=0,t.length=0,n.length=0,a.length=0}function s(u){let m=0;return u.isInstancedMesh&&(m+=2),u.isSkinnedMesh&&(m+=1),m}function o(u,m,v,A,p,f){let y=i[e];return y===void 0?(y={id:u.id,object:u,geometry:m,material:v,materialVariant:s(u),groupOrder:A,renderOrder:u.renderOrder,z:p,group:f},i[e]=y):(y.id=u.id,y.object=u,y.geometry=m,y.material=v,y.materialVariant=s(u),y.groupOrder=A,y.renderOrder=u.renderOrder,y.z=p,y.group=f),e++,y}function c(u,m,v,A,p,f){const y=o(u,m,v,A,p,f);v.transmission>0?n.push(y):v.transparent===!0?a.push(y):t.push(y)}function l(u,m,v,A,p,f){const y=o(u,m,v,A,p,f);v.transmission>0?n.unshift(y):v.transparent===!0?a.unshift(y):t.unshift(y)}function d(u,m){t.length>1&&t.sort(u||Z_),n.length>1&&n.sort(m||vc),a.length>1&&a.sort(m||vc)}function h(){for(let u=e,m=i.length;u<m;u++){const v=i[u];if(v.id===null)break;v.id=null,v.object=null,v.geometry=null,v.material=null,v.group=null}}return{opaque:t,transmissive:n,transparent:a,init:r,push:c,unshift:l,finish:h,sort:d}}function j_(){let i=new WeakMap;function e(n,a){const r=i.get(n);let s;return r===void 0?(s=new xc,i.set(n,[s])):a>=r.length?(s=new xc,r.push(s)):s=r[a],s}function t(){i=new WeakMap}return{get:e,dispose:t}}function J_(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new ne,color:new Lt};break;case"SpotLight":t={position:new ne,direction:new ne,color:new Lt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ne,color:new Lt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ne,skyColor:new Lt,groundColor:new Lt};break;case"RectAreaLight":t={color:new Lt,position:new ne,halfWidth:new ne,halfHeight:new ne};break}return i[e.id]=t,t}}}function Q_(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ut};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ut};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ut,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let ev=0;function tv(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function nv(i){const e=new J_,t=Q_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new ne);const a=new ne,r=new $t,s=new $t;function o(l){let d=0,h=0,u=0;for(let w=0;w<9;w++)n.probe[w].set(0,0,0);let m=0,v=0,A=0,p=0,f=0,y=0,C=0,E=0,F=0,D=0,k=0;l.sort(tv);for(let w=0,L=l.length;w<L;w++){const S=l[w],O=S.color,H=S.intensity,q=S.distance;let ee=null;if(S.shadow&&S.shadow.map&&(S.shadow.map.texture.format===xa?ee=S.shadow.map.texture:ee=S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)d+=O.r*H,h+=O.g*H,u+=O.b*H;else if(S.isLightProbe){for(let J=0;J<9;J++)n.probe[J].addScaledVector(S.sh.coefficients[J],H);k++}else if(S.isDirectionalLight){const J=e.get(S);if(J.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){const Y=S.shadow,ve=t.get(S);ve.shadowIntensity=Y.intensity,ve.shadowBias=Y.bias,ve.shadowNormalBias=Y.normalBias,ve.shadowRadius=Y.radius,ve.shadowMapSize=Y.mapSize,n.directionalShadow[m]=ve,n.directionalShadowMap[m]=ee,n.directionalShadowMatrix[m]=S.shadow.matrix,y++}n.directional[m]=J,m++}else if(S.isSpotLight){const J=e.get(S);J.position.setFromMatrixPosition(S.matrixWorld),J.color.copy(O).multiplyScalar(H),J.distance=q,J.coneCos=Math.cos(S.angle),J.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),J.decay=S.decay,n.spot[A]=J;const Y=S.shadow;if(S.map&&(n.spotLightMap[F]=S.map,F++,Y.updateMatrices(S),S.castShadow&&D++),n.spotLightMatrix[A]=Y.matrix,S.castShadow){const ve=t.get(S);ve.shadowIntensity=Y.intensity,ve.shadowBias=Y.bias,ve.shadowNormalBias=Y.normalBias,ve.shadowRadius=Y.radius,ve.shadowMapSize=Y.mapSize,n.spotShadow[A]=ve,n.spotShadowMap[A]=ee,E++}A++}else if(S.isRectAreaLight){const J=e.get(S);J.color.copy(O).multiplyScalar(H),J.halfWidth.set(S.width*.5,0,0),J.halfHeight.set(0,S.height*.5,0),n.rectArea[p]=J,p++}else if(S.isPointLight){const J=e.get(S);if(J.color.copy(S.color).multiplyScalar(S.intensity),J.distance=S.distance,J.decay=S.decay,S.castShadow){const Y=S.shadow,ve=t.get(S);ve.shadowIntensity=Y.intensity,ve.shadowBias=Y.bias,ve.shadowNormalBias=Y.normalBias,ve.shadowRadius=Y.radius,ve.shadowMapSize=Y.mapSize,ve.shadowCameraNear=Y.camera.near,ve.shadowCameraFar=Y.camera.far,n.pointShadow[v]=ve,n.pointShadowMap[v]=ee,n.pointShadowMatrix[v]=S.shadow.matrix,C++}n.point[v]=J,v++}else if(S.isHemisphereLight){const J=e.get(S);J.skyColor.copy(S.color).multiplyScalar(H),J.groundColor.copy(S.groundColor).multiplyScalar(H),n.hemi[f]=J,f++}}p>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ne.LTC_FLOAT_1,n.rectAreaLTC2=Ne.LTC_FLOAT_2):(n.rectAreaLTC1=Ne.LTC_HALF_1,n.rectAreaLTC2=Ne.LTC_HALF_2)),n.ambient[0]=d,n.ambient[1]=h,n.ambient[2]=u;const x=n.hash;(x.directionalLength!==m||x.pointLength!==v||x.spotLength!==A||x.rectAreaLength!==p||x.hemiLength!==f||x.numDirectionalShadows!==y||x.numPointShadows!==C||x.numSpotShadows!==E||x.numSpotMaps!==F||x.numLightProbes!==k)&&(n.directional.length=m,n.spot.length=A,n.rectArea.length=p,n.point.length=v,n.hemi.length=f,n.directionalShadow.length=y,n.directionalShadowMap.length=y,n.pointShadow.length=C,n.pointShadowMap.length=C,n.spotShadow.length=E,n.spotShadowMap.length=E,n.directionalShadowMatrix.length=y,n.pointShadowMatrix.length=C,n.spotLightMatrix.length=E+F-D,n.spotLightMap.length=F,n.numSpotLightShadowsWithMaps=D,n.numLightProbes=k,x.directionalLength=m,x.pointLength=v,x.spotLength=A,x.rectAreaLength=p,x.hemiLength=f,x.numDirectionalShadows=y,x.numPointShadows=C,x.numSpotShadows=E,x.numSpotMaps=F,x.numLightProbes=k,n.version=ev++)}function c(l,d){let h=0,u=0,m=0,v=0,A=0;const p=d.matrixWorldInverse;for(let f=0,y=l.length;f<y;f++){const C=l[f];if(C.isDirectionalLight){const E=n.directional[h];E.direction.setFromMatrixPosition(C.matrixWorld),a.setFromMatrixPosition(C.target.matrixWorld),E.direction.sub(a),E.direction.transformDirection(p),h++}else if(C.isSpotLight){const E=n.spot[m];E.position.setFromMatrixPosition(C.matrixWorld),E.position.applyMatrix4(p),E.direction.setFromMatrixPosition(C.matrixWorld),a.setFromMatrixPosition(C.target.matrixWorld),E.direction.sub(a),E.direction.transformDirection(p),m++}else if(C.isRectAreaLight){const E=n.rectArea[v];E.position.setFromMatrixPosition(C.matrixWorld),E.position.applyMatrix4(p),s.identity(),r.copy(C.matrixWorld),r.premultiply(p),s.extractRotation(r),E.halfWidth.set(C.width*.5,0,0),E.halfHeight.set(0,C.height*.5,0),E.halfWidth.applyMatrix4(s),E.halfHeight.applyMatrix4(s),v++}else if(C.isPointLight){const E=n.point[u];E.position.setFromMatrixPosition(C.matrixWorld),E.position.applyMatrix4(p),u++}else if(C.isHemisphereLight){const E=n.hemi[A];E.direction.setFromMatrixPosition(C.matrixWorld),E.direction.transformDirection(p),A++}}}return{setup:o,setupView:c,state:n}}function Mc(i){const e=new nv(i),t=[],n=[];function a(d){l.camera=d,t.length=0,n.length=0}function r(d){t.push(d)}function s(d){n.push(d)}function o(){e.setup(t)}function c(d){e.setupView(t,d)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:a,state:l,setupLights:o,setupLightsView:c,pushLight:r,pushShadow:s}}function iv(i){let e=new WeakMap;function t(a,r=0){const s=e.get(a);let o;return s===void 0?(o=new Mc(i),e.set(a,[o])):r>=s.length?(o=new Mc(i),s.push(o)):o=s[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const av=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,rv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,sv=[new ne(1,0,0),new ne(-1,0,0),new ne(0,1,0),new ne(0,-1,0),new ne(0,0,1),new ne(0,0,-1)],ov=[new ne(0,-1,0),new ne(0,-1,0),new ne(0,0,1),new ne(0,0,-1),new ne(0,-1,0),new ne(0,-1,0)],Sc=new $t,ka=new ne,js=new ne;function lv(i,e,t){let n=new tu;const a=new Ut,r=new Ut,s=new Ht,o=new Mh,c=new Sh,l={},d=t.maxTextureSize,h={[wi]:mn,[mn]:wi,[li]:li},u=new ti({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ut},radius:{value:4}},vertexShader:av,fragmentShader:rv}),m=u.clone();m.defines.HORIZONTAL_PASS=1;const v=new ni;v.setAttribute("position",new Jn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const A=new ei(v,u),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Pr;let f=this.type;this.render=function(D,k,x){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||D.length===0)return;this.type===$d&&(lt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Pr);const w=i.getRenderTarget(),L=i.getActiveCubeFace(),S=i.getActiveMipmapLevel(),O=i.state;O.setBlending(di),O.buffers.depth.getReversed()===!0?O.buffers.color.setClear(0,0,0,0):O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);const H=f!==this.type;H&&k.traverse(function(q){q.material&&(Array.isArray(q.material)?q.material.forEach(ee=>ee.needsUpdate=!0):q.material.needsUpdate=!0)});for(let q=0,ee=D.length;q<ee;q++){const J=D[q],Y=J.shadow;if(Y===void 0){lt("WebGLShadowMap:",J,"has no shadow.");continue}if(Y.autoUpdate===!1&&Y.needsUpdate===!1)continue;a.copy(Y.mapSize);const ve=Y.getFrameExtents();a.multiply(ve),r.copy(Y.mapSize),(a.x>d||a.y>d)&&(a.x>d&&(r.x=Math.floor(d/ve.x),a.x=r.x*ve.x,Y.mapSize.x=r.x),a.y>d&&(r.y=Math.floor(d/ve.y),a.y=r.y*ve.y,Y.mapSize.y=r.y));const _e=i.state.buffers.depth.getReversed();if(Y.camera._reversedDepth=_e,Y.map===null||H===!0){if(Y.map!==null&&(Y.map.depthTexture!==null&&(Y.map.depthTexture.dispose(),Y.map.depthTexture=null),Y.map.dispose()),this.type===za){if(J.isPointLight){lt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}Y.map=new jn(a.x,a.y,{format:xa,type:hi,minFilter:sn,magFilter:sn,generateMipmaps:!1}),Y.map.texture.name=J.name+".shadowMap",Y.map.depthTexture=new ja(a.x,a.y,Yn),Y.map.depthTexture.name=J.name+".shadowMapDepth",Y.map.depthTexture.format=pi,Y.map.depthTexture.compareFunction=null,Y.map.depthTexture.minFilter=en,Y.map.depthTexture.magFilter=en}else J.isPointLight?(Y.map=new lu(a.x),Y.map.depthTexture=new ph(a.x,Qn)):(Y.map=new jn(a.x,a.y),Y.map.depthTexture=new ja(a.x,a.y,Qn)),Y.map.depthTexture.name=J.name+".shadowMap",Y.map.depthTexture.format=pi,this.type===Pr?(Y.map.depthTexture.compareFunction=_e?il:nl,Y.map.depthTexture.minFilter=sn,Y.map.depthTexture.magFilter=sn):(Y.map.depthTexture.compareFunction=null,Y.map.depthTexture.minFilter=en,Y.map.depthTexture.magFilter=en);Y.camera.updateProjectionMatrix()}const Pe=Y.map.isWebGLCubeRenderTarget?6:1;for(let ue=0;ue<Pe;ue++){if(Y.map.isWebGLCubeRenderTarget)i.setRenderTarget(Y.map,ue),i.clear();else{ue===0&&(i.setRenderTarget(Y.map),i.clear());const De=Y.getViewport(ue);s.set(r.x*De.x,r.y*De.y,r.x*De.z,r.y*De.w),O.viewport(s)}if(J.isPointLight){const De=Y.camera,et=Y.matrix,nt=J.distance||De.far;nt!==De.far&&(De.far=nt,De.updateProjectionMatrix()),ka.setFromMatrixPosition(J.matrixWorld),De.position.copy(ka),js.copy(De.position),js.add(sv[ue]),De.up.copy(ov[ue]),De.lookAt(js),De.updateMatrixWorld(),et.makeTranslation(-ka.x,-ka.y,-ka.z),Sc.multiplyMatrices(De.projectionMatrix,De.matrixWorldInverse),Y._frustum.setFromProjectionMatrix(Sc,De.coordinateSystem,De.reversedDepth)}else Y.updateMatrices(J);n=Y.getFrustum(),E(k,x,Y.camera,J,this.type)}Y.isPointLightShadow!==!0&&this.type===za&&y(Y,x),Y.needsUpdate=!1}f=this.type,p.needsUpdate=!1,i.setRenderTarget(w,L,S)};function y(D,k){const x=e.update(A);u.defines.VSM_SAMPLES!==D.blurSamples&&(u.defines.VSM_SAMPLES=D.blurSamples,m.defines.VSM_SAMPLES=D.blurSamples,u.needsUpdate=!0,m.needsUpdate=!0),D.mapPass===null&&(D.mapPass=new jn(a.x,a.y,{format:xa,type:hi})),u.uniforms.shadow_pass.value=D.map.depthTexture,u.uniforms.resolution.value=D.mapSize,u.uniforms.radius.value=D.radius,i.setRenderTarget(D.mapPass),i.clear(),i.renderBufferDirect(k,null,x,u,A,null),m.uniforms.shadow_pass.value=D.mapPass.texture,m.uniforms.resolution.value=D.mapSize,m.uniforms.radius.value=D.radius,i.setRenderTarget(D.map),i.clear(),i.renderBufferDirect(k,null,x,m,A,null)}function C(D,k,x,w){let L=null;const S=x.isPointLight===!0?D.customDistanceMaterial:D.customDepthMaterial;if(S!==void 0)L=S;else if(L=x.isPointLight===!0?c:o,i.localClippingEnabled&&k.clipShadows===!0&&Array.isArray(k.clippingPlanes)&&k.clippingPlanes.length!==0||k.displacementMap&&k.displacementScale!==0||k.alphaMap&&k.alphaTest>0||k.map&&k.alphaTest>0||k.alphaToCoverage===!0){const O=L.uuid,H=k.uuid;let q=l[O];q===void 0&&(q={},l[O]=q);let ee=q[H];ee===void 0&&(ee=L.clone(),q[H]=ee,k.addEventListener("dispose",F)),L=ee}if(L.visible=k.visible,L.wireframe=k.wireframe,w===za?L.side=k.shadowSide!==null?k.shadowSide:k.side:L.side=k.shadowSide!==null?k.shadowSide:h[k.side],L.alphaMap=k.alphaMap,L.alphaTest=k.alphaToCoverage===!0?.5:k.alphaTest,L.map=k.map,L.clipShadows=k.clipShadows,L.clippingPlanes=k.clippingPlanes,L.clipIntersection=k.clipIntersection,L.displacementMap=k.displacementMap,L.displacementScale=k.displacementScale,L.displacementBias=k.displacementBias,L.wireframeLinewidth=k.wireframeLinewidth,L.linewidth=k.linewidth,x.isPointLight===!0&&L.isMeshDistanceMaterial===!0){const O=i.properties.get(L);O.light=x}return L}function E(D,k,x,w,L){if(D.visible===!1)return;if(D.layers.test(k.layers)&&(D.isMesh||D.isLine||D.isPoints)&&(D.castShadow||D.receiveShadow&&L===za)&&(!D.frustumCulled||n.intersectsObject(D))){D.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,D.matrixWorld);const H=e.update(D),q=D.material;if(Array.isArray(q)){const ee=H.groups;for(let J=0,Y=ee.length;J<Y;J++){const ve=ee[J],_e=q[ve.materialIndex];if(_e&&_e.visible){const Pe=C(D,_e,w,L);D.onBeforeShadow(i,D,k,x,H,Pe,ve),i.renderBufferDirect(x,null,H,Pe,D,ve),D.onAfterShadow(i,D,k,x,H,Pe,ve)}}}else if(q.visible){const ee=C(D,q,w,L);D.onBeforeShadow(i,D,k,x,H,ee,null),i.renderBufferDirect(x,null,H,ee,D,null),D.onAfterShadow(i,D,k,x,H,ee,null)}}const O=D.children;for(let H=0,q=O.length;H<q;H++)E(O[H],k,x,w,L)}function F(D){D.target.removeEventListener("dispose",F);for(const x in l){const w=l[x],L=D.target.uuid;L in w&&(w[L].dispose(),delete w[L])}}}function cv(i,e){function t(){let B=!1;const ye=new Ht;let ge=null;const Be=new Ht(0,0,0,0);return{setMask:function(xe){ge!==xe&&!B&&(i.colorMask(xe,xe,xe,xe),ge=xe)},setLocked:function(xe){B=xe},setClear:function(xe,le,ze,it,St){St===!0&&(xe*=it,le*=it,ze*=it),ye.set(xe,le,ze,it),Be.equals(ye)===!1&&(i.clearColor(xe,le,ze,it),Be.copy(ye))},reset:function(){B=!1,ge=null,Be.set(-1,0,0,0)}}}function n(){let B=!1,ye=!1,ge=null,Be=null,xe=null;return{setReversed:function(le){if(ye!==le){const ze=e.get("EXT_clip_control");le?ze.clipControlEXT(ze.LOWER_LEFT_EXT,ze.ZERO_TO_ONE_EXT):ze.clipControlEXT(ze.LOWER_LEFT_EXT,ze.NEGATIVE_ONE_TO_ONE_EXT),ye=le;const it=xe;xe=null,this.setClear(it)}},getReversed:function(){return ye},setTest:function(le){le?Ae(i.DEPTH_TEST):te(i.DEPTH_TEST)},setMask:function(le){ge!==le&&!B&&(i.depthMask(le),ge=le)},setFunc:function(le){if(ye&&(le=wf[le]),Be!==le){switch(le){case to:i.depthFunc(i.NEVER);break;case no:i.depthFunc(i.ALWAYS);break;case io:i.depthFunc(i.LESS);break;case _a:i.depthFunc(i.LEQUAL);break;case ao:i.depthFunc(i.EQUAL);break;case ro:i.depthFunc(i.GEQUAL);break;case so:i.depthFunc(i.GREATER);break;case oo:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Be=le}},setLocked:function(le){B=le},setClear:function(le){xe!==le&&(xe=le,ye&&(le=1-le),i.clearDepth(le))},reset:function(){B=!1,ge=null,Be=null,xe=null,ye=!1}}}function a(){let B=!1,ye=null,ge=null,Be=null,xe=null,le=null,ze=null,it=null,St=null;return{setTest:function(Tt){B||(Tt?Ae(i.STENCIL_TEST):te(i.STENCIL_TEST))},setMask:function(Tt){ye!==Tt&&!B&&(i.stencilMask(Tt),ye=Tt)},setFunc:function(Tt,Sn,Cn){(ge!==Tt||Be!==Sn||xe!==Cn)&&(i.stencilFunc(Tt,Sn,Cn),ge=Tt,Be=Sn,xe=Cn)},setOp:function(Tt,Sn,Cn){(le!==Tt||ze!==Sn||it!==Cn)&&(i.stencilOp(Tt,Sn,Cn),le=Tt,ze=Sn,it=Cn)},setLocked:function(Tt){B=Tt},setClear:function(Tt){St!==Tt&&(i.clearStencil(Tt),St=Tt)},reset:function(){B=!1,ye=null,ge=null,Be=null,xe=null,le=null,ze=null,it=null,St=null}}}const r=new t,s=new n,o=new a,c=new WeakMap,l=new WeakMap;let d={},h={},u=new WeakMap,m=[],v=null,A=!1,p=null,f=null,y=null,C=null,E=null,F=null,D=null,k=new Lt(0,0,0),x=0,w=!1,L=null,S=null,O=null,H=null,q=null;const ee=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let J=!1,Y=0;const ve=i.getParameter(i.VERSION);ve.indexOf("WebGL")!==-1?(Y=parseFloat(/^WebGL (\d)/.exec(ve)[1]),J=Y>=1):ve.indexOf("OpenGL ES")!==-1&&(Y=parseFloat(/^OpenGL ES (\d)/.exec(ve)[1]),J=Y>=2);let _e=null,Pe={};const ue=i.getParameter(i.SCISSOR_BOX),De=i.getParameter(i.VIEWPORT),et=new Ht().fromArray(ue),nt=new Ht().fromArray(De);function xt(B,ye,ge,Be){const xe=new Uint8Array(4),le=i.createTexture();i.bindTexture(B,le),i.texParameteri(B,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(B,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ze=0;ze<ge;ze++)B===i.TEXTURE_3D||B===i.TEXTURE_2D_ARRAY?i.texImage3D(ye,0,i.RGBA,1,1,Be,0,i.RGBA,i.UNSIGNED_BYTE,xe):i.texImage2D(ye+ze,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,xe);return le}const se={};se[i.TEXTURE_2D]=xt(i.TEXTURE_2D,i.TEXTURE_2D,1),se[i.TEXTURE_CUBE_MAP]=xt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),se[i.TEXTURE_2D_ARRAY]=xt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),se[i.TEXTURE_3D]=xt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),s.setClear(1),o.setClear(0),Ae(i.DEPTH_TEST),s.setFunc(_a),tt(!1),ht(bl),Ae(i.CULL_FACE),Je(di);function Ae(B){d[B]!==!0&&(i.enable(B),d[B]=!0)}function te(B){d[B]!==!1&&(i.disable(B),d[B]=!1)}function Se(B,ye){return h[B]!==ye?(i.bindFramebuffer(B,ye),h[B]=ye,B===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=ye),B===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=ye),!0):!1}function we(B,ye){let ge=m,Be=!1;if(B){ge=u.get(ye),ge===void 0&&(ge=[],u.set(ye,ge));const xe=B.textures;if(ge.length!==xe.length||ge[0]!==i.COLOR_ATTACHMENT0){for(let le=0,ze=xe.length;le<ze;le++)ge[le]=i.COLOR_ATTACHMENT0+le;ge.length=xe.length,Be=!0}}else ge[0]!==i.BACK&&(ge[0]=i.BACK,Be=!0);Be&&i.drawBuffers(ge)}function Ge(B){return v!==B?(i.useProgram(B),v=B,!0):!1}const ct={[ki]:i.FUNC_ADD,[Yd]:i.FUNC_SUBTRACT,[Kd]:i.FUNC_REVERSE_SUBTRACT};ct[Zd]=i.MIN,ct[jd]=i.MAX;const Xe={[Jd]:i.ZERO,[Qd]:i.ONE,[ef]:i.SRC_COLOR,[Qs]:i.SRC_ALPHA,[of]:i.SRC_ALPHA_SATURATE,[rf]:i.DST_COLOR,[nf]:i.DST_ALPHA,[tf]:i.ONE_MINUS_SRC_COLOR,[eo]:i.ONE_MINUS_SRC_ALPHA,[sf]:i.ONE_MINUS_DST_COLOR,[af]:i.ONE_MINUS_DST_ALPHA,[lf]:i.CONSTANT_COLOR,[cf]:i.ONE_MINUS_CONSTANT_COLOR,[uf]:i.CONSTANT_ALPHA,[df]:i.ONE_MINUS_CONSTANT_ALPHA};function Je(B,ye,ge,Be,xe,le,ze,it,St,Tt){if(B===di){A===!0&&(te(i.BLEND),A=!1);return}if(A===!1&&(Ae(i.BLEND),A=!0),B!==qd){if(B!==p||Tt!==w){if((f!==ki||E!==ki)&&(i.blendEquation(i.FUNC_ADD),f=ki,E=ki),Tt)switch(B){case ma:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Tl:i.blendFunc(i.ONE,i.ONE);break;case Al:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case wl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:bt("WebGLState: Invalid blending: ",B);break}else switch(B){case ma:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Tl:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Al:bt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case wl:bt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:bt("WebGLState: Invalid blending: ",B);break}y=null,C=null,F=null,D=null,k.set(0,0,0),x=0,p=B,w=Tt}return}xe=xe||ye,le=le||ge,ze=ze||Be,(ye!==f||xe!==E)&&(i.blendEquationSeparate(ct[ye],ct[xe]),f=ye,E=xe),(ge!==y||Be!==C||le!==F||ze!==D)&&(i.blendFuncSeparate(Xe[ge],Xe[Be],Xe[le],Xe[ze]),y=ge,C=Be,F=le,D=ze),(it.equals(k)===!1||St!==x)&&(i.blendColor(it.r,it.g,it.b,St),k.copy(it),x=St),p=B,w=!1}function Ze(B,ye){B.side===li?te(i.CULL_FACE):Ae(i.CULL_FACE);let ge=B.side===mn;ye&&(ge=!ge),tt(ge),B.blending===ma&&B.transparent===!1?Je(di):Je(B.blending,B.blendEquation,B.blendSrc,B.blendDst,B.blendEquationAlpha,B.blendSrcAlpha,B.blendDstAlpha,B.blendColor,B.blendAlpha,B.premultipliedAlpha),s.setFunc(B.depthFunc),s.setTest(B.depthTest),s.setMask(B.depthWrite),r.setMask(B.colorWrite);const Be=B.stencilWrite;o.setTest(Be),Be&&(o.setMask(B.stencilWriteMask),o.setFunc(B.stencilFunc,B.stencilRef,B.stencilFuncMask),o.setOp(B.stencilFail,B.stencilZFail,B.stencilZPass)),_t(B.polygonOffset,B.polygonOffsetFactor,B.polygonOffsetUnits),B.alphaToCoverage===!0?Ae(i.SAMPLE_ALPHA_TO_COVERAGE):te(i.SAMPLE_ALPHA_TO_COVERAGE)}function tt(B){L!==B&&(B?i.frontFace(i.CW):i.frontFace(i.CCW),L=B)}function ht(B){B!==Wd?(Ae(i.CULL_FACE),B!==S&&(B===bl?i.cullFace(i.BACK):B===Xd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):te(i.CULL_FACE),S=B}function U(B){B!==O&&(J&&i.lineWidth(B),O=B)}function _t(B,ye,ge){B?(Ae(i.POLYGON_OFFSET_FILL),(H!==ye||q!==ge)&&(H=ye,q=ge,s.getReversed()&&(ye=-ye),i.polygonOffset(ye,ge))):te(i.POLYGON_OFFSET_FILL)}function gt(B){B?Ae(i.SCISSOR_TEST):te(i.SCISSOR_TEST)}function st(B){B===void 0&&(B=i.TEXTURE0+ee-1),_e!==B&&(i.activeTexture(B),_e=B)}function ke(B,ye,ge){ge===void 0&&(_e===null?ge=i.TEXTURE0+ee-1:ge=_e);let Be=Pe[ge];Be===void 0&&(Be={type:void 0,texture:void 0},Pe[ge]=Be),(Be.type!==B||Be.texture!==ye)&&(_e!==ge&&(i.activeTexture(ge),_e=ge),i.bindTexture(B,ye||se[B]),Be.type=B,Be.texture=ye)}function b(){const B=Pe[_e];B!==void 0&&B.type!==void 0&&(i.bindTexture(B.type,null),B.type=void 0,B.texture=void 0)}function g(){try{i.compressedTexImage2D(...arguments)}catch(B){bt("WebGLState:",B)}}function z(){try{i.compressedTexImage3D(...arguments)}catch(B){bt("WebGLState:",B)}}function oe(){try{i.texSubImage2D(...arguments)}catch(B){bt("WebGLState:",B)}}function pe(){try{i.texSubImage3D(...arguments)}catch(B){bt("WebGLState:",B)}}function re(){try{i.compressedTexSubImage2D(...arguments)}catch(B){bt("WebGLState:",B)}}function Oe(){try{i.compressedTexSubImage3D(...arguments)}catch(B){bt("WebGLState:",B)}}function be(){try{i.texStorage2D(...arguments)}catch(B){bt("WebGLState:",B)}}function N(){try{i.texStorage3D(...arguments)}catch(B){bt("WebGLState:",B)}}function V(){try{i.texImage2D(...arguments)}catch(B){bt("WebGLState:",B)}}function X(){try{i.texImage3D(...arguments)}catch(B){bt("WebGLState:",B)}}function $(B){et.equals(B)===!1&&(i.scissor(B.x,B.y,B.z,B.w),et.copy(B))}function me(B){nt.equals(B)===!1&&(i.viewport(B.x,B.y,B.z,B.w),nt.copy(B))}function Ce(B,ye){let ge=l.get(ye);ge===void 0&&(ge=new WeakMap,l.set(ye,ge));let Be=ge.get(B);Be===void 0&&(Be=i.getUniformBlockIndex(ye,B.name),ge.set(B,Be))}function ie(B,ye){const Be=l.get(ye).get(B);c.get(ye)!==Be&&(i.uniformBlockBinding(ye,Be,B.__bindingPointIndex),c.set(ye,Be))}function Qe(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),s.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),d={},_e=null,Pe={},h={},u=new WeakMap,m=[],v=null,A=!1,p=null,f=null,y=null,C=null,E=null,F=null,D=null,k=new Lt(0,0,0),x=0,w=!1,L=null,S=null,O=null,H=null,q=null,et.set(0,0,i.canvas.width,i.canvas.height),nt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),s.reset(),o.reset()}return{buffers:{color:r,depth:s,stencil:o},enable:Ae,disable:te,bindFramebuffer:Se,drawBuffers:we,useProgram:Ge,setBlending:Je,setMaterial:Ze,setFlipSided:tt,setCullFace:ht,setLineWidth:U,setPolygonOffset:_t,setScissorTest:gt,activeTexture:st,bindTexture:ke,unbindTexture:b,compressedTexImage2D:g,compressedTexImage3D:z,texImage2D:V,texImage3D:X,updateUBOMapping:Ce,uniformBlockBinding:ie,texStorage2D:be,texStorage3D:N,texSubImage2D:oe,texSubImage3D:pe,compressedTexSubImage2D:re,compressedTexSubImage3D:Oe,scissor:$,viewport:me,reset:Qe}}function uv(i,e,t,n,a,r,s){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Ut,d=new WeakMap;let h;const u=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function v(b,g){return m?new OffscreenCanvas(b,g):Ka("canvas")}function A(b,g,z){let oe=1;const pe=ke(b);if((pe.width>z||pe.height>z)&&(oe=z/Math.max(pe.width,pe.height)),oe<1)if(typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&b instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&b instanceof ImageBitmap||typeof VideoFrame<"u"&&b instanceof VideoFrame){const re=Math.floor(oe*pe.width),Oe=Math.floor(oe*pe.height);h===void 0&&(h=v(re,Oe));const be=g?v(re,Oe):h;return be.width=re,be.height=Oe,be.getContext("2d").drawImage(b,0,0,re,Oe),lt("WebGLRenderer: Texture has been resized from ("+pe.width+"x"+pe.height+") to ("+re+"x"+Oe+")."),be}else return"data"in b&&lt("WebGLRenderer: Image in DataTexture is too big ("+pe.width+"x"+pe.height+")."),b;return b}function p(b){return b.generateMipmaps}function f(b){i.generateMipmap(b)}function y(b){return b.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:b.isWebGL3DRenderTarget?i.TEXTURE_3D:b.isWebGLArrayRenderTarget||b.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(b,g,z,oe,pe=!1){if(b!==null){if(i[b]!==void 0)return i[b];lt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+b+"'")}let re=g;if(g===i.RED&&(z===i.FLOAT&&(re=i.R32F),z===i.HALF_FLOAT&&(re=i.R16F),z===i.UNSIGNED_BYTE&&(re=i.R8)),g===i.RED_INTEGER&&(z===i.UNSIGNED_BYTE&&(re=i.R8UI),z===i.UNSIGNED_SHORT&&(re=i.R16UI),z===i.UNSIGNED_INT&&(re=i.R32UI),z===i.BYTE&&(re=i.R8I),z===i.SHORT&&(re=i.R16I),z===i.INT&&(re=i.R32I)),g===i.RG&&(z===i.FLOAT&&(re=i.RG32F),z===i.HALF_FLOAT&&(re=i.RG16F),z===i.UNSIGNED_BYTE&&(re=i.RG8)),g===i.RG_INTEGER&&(z===i.UNSIGNED_BYTE&&(re=i.RG8UI),z===i.UNSIGNED_SHORT&&(re=i.RG16UI),z===i.UNSIGNED_INT&&(re=i.RG32UI),z===i.BYTE&&(re=i.RG8I),z===i.SHORT&&(re=i.RG16I),z===i.INT&&(re=i.RG32I)),g===i.RGB_INTEGER&&(z===i.UNSIGNED_BYTE&&(re=i.RGB8UI),z===i.UNSIGNED_SHORT&&(re=i.RGB16UI),z===i.UNSIGNED_INT&&(re=i.RGB32UI),z===i.BYTE&&(re=i.RGB8I),z===i.SHORT&&(re=i.RGB16I),z===i.INT&&(re=i.RGB32I)),g===i.RGBA_INTEGER&&(z===i.UNSIGNED_BYTE&&(re=i.RGBA8UI),z===i.UNSIGNED_SHORT&&(re=i.RGBA16UI),z===i.UNSIGNED_INT&&(re=i.RGBA32UI),z===i.BYTE&&(re=i.RGBA8I),z===i.SHORT&&(re=i.RGBA16I),z===i.INT&&(re=i.RGBA32I)),g===i.RGB&&(z===i.UNSIGNED_INT_5_9_9_9_REV&&(re=i.RGB9_E5),z===i.UNSIGNED_INT_10F_11F_11F_REV&&(re=i.R11F_G11F_B10F)),g===i.RGBA){const Oe=pe?Fr:yt.getTransfer(oe);z===i.FLOAT&&(re=i.RGBA32F),z===i.HALF_FLOAT&&(re=i.RGBA16F),z===i.UNSIGNED_BYTE&&(re=Oe===Pt?i.SRGB8_ALPHA8:i.RGBA8),z===i.UNSIGNED_SHORT_4_4_4_4&&(re=i.RGBA4),z===i.UNSIGNED_SHORT_5_5_5_1&&(re=i.RGB5_A1)}return(re===i.R16F||re===i.R32F||re===i.RG16F||re===i.RG32F||re===i.RGBA16F||re===i.RGBA32F)&&e.get("EXT_color_buffer_float"),re}function E(b,g){let z;return b?g===null||g===Qn||g===Ya?z=i.DEPTH24_STENCIL8:g===Yn?z=i.DEPTH32F_STENCIL8:g===qa&&(z=i.DEPTH24_STENCIL8,lt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):g===null||g===Qn||g===Ya?z=i.DEPTH_COMPONENT24:g===Yn?z=i.DEPTH_COMPONENT32F:g===qa&&(z=i.DEPTH_COMPONENT16),z}function F(b,g){return p(b)===!0||b.isFramebufferTexture&&b.minFilter!==en&&b.minFilter!==sn?Math.log2(Math.max(g.width,g.height))+1:b.mipmaps!==void 0&&b.mipmaps.length>0?b.mipmaps.length:b.isCompressedTexture&&Array.isArray(b.image)?g.mipmaps.length:1}function D(b){const g=b.target;g.removeEventListener("dispose",D),x(g),g.isVideoTexture&&d.delete(g)}function k(b){const g=b.target;g.removeEventListener("dispose",k),L(g)}function x(b){const g=n.get(b);if(g.__webglInit===void 0)return;const z=b.source,oe=u.get(z);if(oe){const pe=oe[g.__cacheKey];pe.usedTimes--,pe.usedTimes===0&&w(b),Object.keys(oe).length===0&&u.delete(z)}n.remove(b)}function w(b){const g=n.get(b);i.deleteTexture(g.__webglTexture);const z=b.source,oe=u.get(z);delete oe[g.__cacheKey],s.memory.textures--}function L(b){const g=n.get(b);if(b.depthTexture&&(b.depthTexture.dispose(),n.remove(b.depthTexture)),b.isWebGLCubeRenderTarget)for(let oe=0;oe<6;oe++){if(Array.isArray(g.__webglFramebuffer[oe]))for(let pe=0;pe<g.__webglFramebuffer[oe].length;pe++)i.deleteFramebuffer(g.__webglFramebuffer[oe][pe]);else i.deleteFramebuffer(g.__webglFramebuffer[oe]);g.__webglDepthbuffer&&i.deleteRenderbuffer(g.__webglDepthbuffer[oe])}else{if(Array.isArray(g.__webglFramebuffer))for(let oe=0;oe<g.__webglFramebuffer.length;oe++)i.deleteFramebuffer(g.__webglFramebuffer[oe]);else i.deleteFramebuffer(g.__webglFramebuffer);if(g.__webglDepthbuffer&&i.deleteRenderbuffer(g.__webglDepthbuffer),g.__webglMultisampledFramebuffer&&i.deleteFramebuffer(g.__webglMultisampledFramebuffer),g.__webglColorRenderbuffer)for(let oe=0;oe<g.__webglColorRenderbuffer.length;oe++)g.__webglColorRenderbuffer[oe]&&i.deleteRenderbuffer(g.__webglColorRenderbuffer[oe]);g.__webglDepthRenderbuffer&&i.deleteRenderbuffer(g.__webglDepthRenderbuffer)}const z=b.textures;for(let oe=0,pe=z.length;oe<pe;oe++){const re=n.get(z[oe]);re.__webglTexture&&(i.deleteTexture(re.__webglTexture),s.memory.textures--),n.remove(z[oe])}n.remove(b)}let S=0;function O(){S=0}function H(){const b=S;return b>=a.maxTextures&&lt("WebGLTextures: Trying to use "+b+" texture units while this GPU supports only "+a.maxTextures),S+=1,b}function q(b){const g=[];return g.push(b.wrapS),g.push(b.wrapT),g.push(b.wrapR||0),g.push(b.magFilter),g.push(b.minFilter),g.push(b.anisotropy),g.push(b.internalFormat),g.push(b.format),g.push(b.type),g.push(b.generateMipmaps),g.push(b.premultiplyAlpha),g.push(b.flipY),g.push(b.unpackAlignment),g.push(b.colorSpace),g.join()}function ee(b,g){const z=n.get(b);if(b.isVideoTexture&&gt(b),b.isRenderTargetTexture===!1&&b.isExternalTexture!==!0&&b.version>0&&z.__version!==b.version){const oe=b.image;if(oe===null)lt("WebGLRenderer: Texture marked for update but no image data found.");else if(oe.complete===!1)lt("WebGLRenderer: Texture marked for update but image is incomplete");else{se(z,b,g);return}}else b.isExternalTexture&&(z.__webglTexture=b.sourceTexture?b.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,z.__webglTexture,i.TEXTURE0+g)}function J(b,g){const z=n.get(b);if(b.isRenderTargetTexture===!1&&b.version>0&&z.__version!==b.version){se(z,b,g);return}else b.isExternalTexture&&(z.__webglTexture=b.sourceTexture?b.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,z.__webglTexture,i.TEXTURE0+g)}function Y(b,g){const z=n.get(b);if(b.isRenderTargetTexture===!1&&b.version>0&&z.__version!==b.version){se(z,b,g);return}t.bindTexture(i.TEXTURE_3D,z.__webglTexture,i.TEXTURE0+g)}function ve(b,g){const z=n.get(b);if(b.isCubeDepthTexture!==!0&&b.version>0&&z.__version!==b.version){Ae(z,b,g);return}t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture,i.TEXTURE0+g)}const _e={[lo]:i.REPEAT,[ui]:i.CLAMP_TO_EDGE,[co]:i.MIRRORED_REPEAT},Pe={[en]:i.NEAREST,[pf]:i.NEAREST_MIPMAP_NEAREST,[rr]:i.NEAREST_MIPMAP_LINEAR,[sn]:i.LINEAR,[ys]:i.LINEAR_MIPMAP_NEAREST,[zi]:i.LINEAR_MIPMAP_LINEAR},ue={[vf]:i.NEVER,[Ef]:i.ALWAYS,[xf]:i.LESS,[nl]:i.LEQUAL,[Mf]:i.EQUAL,[il]:i.GEQUAL,[Sf]:i.GREATER,[yf]:i.NOTEQUAL};function De(b,g){if(g.type===Yn&&e.has("OES_texture_float_linear")===!1&&(g.magFilter===sn||g.magFilter===ys||g.magFilter===rr||g.magFilter===zi||g.minFilter===sn||g.minFilter===ys||g.minFilter===rr||g.minFilter===zi)&&lt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(b,i.TEXTURE_WRAP_S,_e[g.wrapS]),i.texParameteri(b,i.TEXTURE_WRAP_T,_e[g.wrapT]),(b===i.TEXTURE_3D||b===i.TEXTURE_2D_ARRAY)&&i.texParameteri(b,i.TEXTURE_WRAP_R,_e[g.wrapR]),i.texParameteri(b,i.TEXTURE_MAG_FILTER,Pe[g.magFilter]),i.texParameteri(b,i.TEXTURE_MIN_FILTER,Pe[g.minFilter]),g.compareFunction&&(i.texParameteri(b,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(b,i.TEXTURE_COMPARE_FUNC,ue[g.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(g.magFilter===en||g.minFilter!==rr&&g.minFilter!==zi||g.type===Yn&&e.has("OES_texture_float_linear")===!1)return;if(g.anisotropy>1||n.get(g).__currentAnisotropy){const z=e.get("EXT_texture_filter_anisotropic");i.texParameterf(b,z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(g.anisotropy,a.getMaxAnisotropy())),n.get(g).__currentAnisotropy=g.anisotropy}}}function et(b,g){let z=!1;b.__webglInit===void 0&&(b.__webglInit=!0,g.addEventListener("dispose",D));const oe=g.source;let pe=u.get(oe);pe===void 0&&(pe={},u.set(oe,pe));const re=q(g);if(re!==b.__cacheKey){pe[re]===void 0&&(pe[re]={texture:i.createTexture(),usedTimes:0},s.memory.textures++,z=!0),pe[re].usedTimes++;const Oe=pe[b.__cacheKey];Oe!==void 0&&(pe[b.__cacheKey].usedTimes--,Oe.usedTimes===0&&w(g)),b.__cacheKey=re,b.__webglTexture=pe[re].texture}return z}function nt(b,g,z){return Math.floor(Math.floor(b/z)/g)}function xt(b,g,z,oe){const re=b.updateRanges;if(re.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,g.width,g.height,z,oe,g.data);else{re.sort((X,$)=>X.start-$.start);let Oe=0;for(let X=1;X<re.length;X++){const $=re[Oe],me=re[X],Ce=$.start+$.count,ie=nt(me.start,g.width,4),Qe=nt($.start,g.width,4);me.start<=Ce+1&&ie===Qe&&nt(me.start+me.count-1,g.width,4)===ie?$.count=Math.max($.count,me.start+me.count-$.start):(++Oe,re[Oe]=me)}re.length=Oe+1;const be=i.getParameter(i.UNPACK_ROW_LENGTH),N=i.getParameter(i.UNPACK_SKIP_PIXELS),V=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,g.width);for(let X=0,$=re.length;X<$;X++){const me=re[X],Ce=Math.floor(me.start/4),ie=Math.ceil(me.count/4),Qe=Ce%g.width,B=Math.floor(Ce/g.width),ye=ie,ge=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Qe),i.pixelStorei(i.UNPACK_SKIP_ROWS,B),t.texSubImage2D(i.TEXTURE_2D,0,Qe,B,ye,ge,z,oe,g.data)}b.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,be),i.pixelStorei(i.UNPACK_SKIP_PIXELS,N),i.pixelStorei(i.UNPACK_SKIP_ROWS,V)}}function se(b,g,z){let oe=i.TEXTURE_2D;(g.isDataArrayTexture||g.isCompressedArrayTexture)&&(oe=i.TEXTURE_2D_ARRAY),g.isData3DTexture&&(oe=i.TEXTURE_3D);const pe=et(b,g),re=g.source;t.bindTexture(oe,b.__webglTexture,i.TEXTURE0+z);const Oe=n.get(re);if(re.version!==Oe.__version||pe===!0){t.activeTexture(i.TEXTURE0+z);const be=yt.getPrimaries(yt.workingColorSpace),N=g.colorSpace===bi?null:yt.getPrimaries(g.colorSpace),V=g.colorSpace===bi||be===N?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,g.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,g.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,g.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,V);let X=A(g.image,!1,a.maxTextureSize);X=st(g,X);const $=r.convert(g.format,g.colorSpace),me=r.convert(g.type);let Ce=C(g.internalFormat,$,me,g.colorSpace,g.isVideoTexture);De(oe,g);let ie;const Qe=g.mipmaps,B=g.isVideoTexture!==!0,ye=Oe.__version===void 0||pe===!0,ge=re.dataReady,Be=F(g,X);if(g.isDepthTexture)Ce=E(g.format===Gi,g.type),ye&&(B?t.texStorage2D(i.TEXTURE_2D,1,Ce,X.width,X.height):t.texImage2D(i.TEXTURE_2D,0,Ce,X.width,X.height,0,$,me,null));else if(g.isDataTexture)if(Qe.length>0){B&&ye&&t.texStorage2D(i.TEXTURE_2D,Be,Ce,Qe[0].width,Qe[0].height);for(let xe=0,le=Qe.length;xe<le;xe++)ie=Qe[xe],B?ge&&t.texSubImage2D(i.TEXTURE_2D,xe,0,0,ie.width,ie.height,$,me,ie.data):t.texImage2D(i.TEXTURE_2D,xe,Ce,ie.width,ie.height,0,$,me,ie.data);g.generateMipmaps=!1}else B?(ye&&t.texStorage2D(i.TEXTURE_2D,Be,Ce,X.width,X.height),ge&&xt(g,X,$,me)):t.texImage2D(i.TEXTURE_2D,0,Ce,X.width,X.height,0,$,me,X.data);else if(g.isCompressedTexture)if(g.isCompressedArrayTexture){B&&ye&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Be,Ce,Qe[0].width,Qe[0].height,X.depth);for(let xe=0,le=Qe.length;xe<le;xe++)if(ie=Qe[xe],g.format!==Bn)if($!==null)if(B){if(ge)if(g.layerUpdates.size>0){const ze=Jl(ie.width,ie.height,g.format,g.type);for(const it of g.layerUpdates){const St=ie.data.subarray(it*ze/ie.data.BYTES_PER_ELEMENT,(it+1)*ze/ie.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,xe,0,0,it,ie.width,ie.height,1,$,St)}g.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,xe,0,0,0,ie.width,ie.height,X.depth,$,ie.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,xe,Ce,ie.width,ie.height,X.depth,0,ie.data,0,0);else lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else B?ge&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,xe,0,0,0,ie.width,ie.height,X.depth,$,me,ie.data):t.texImage3D(i.TEXTURE_2D_ARRAY,xe,Ce,ie.width,ie.height,X.depth,0,$,me,ie.data)}else{B&&ye&&t.texStorage2D(i.TEXTURE_2D,Be,Ce,Qe[0].width,Qe[0].height);for(let xe=0,le=Qe.length;xe<le;xe++)ie=Qe[xe],g.format!==Bn?$!==null?B?ge&&t.compressedTexSubImage2D(i.TEXTURE_2D,xe,0,0,ie.width,ie.height,$,ie.data):t.compressedTexImage2D(i.TEXTURE_2D,xe,Ce,ie.width,ie.height,0,ie.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):B?ge&&t.texSubImage2D(i.TEXTURE_2D,xe,0,0,ie.width,ie.height,$,me,ie.data):t.texImage2D(i.TEXTURE_2D,xe,Ce,ie.width,ie.height,0,$,me,ie.data)}else if(g.isDataArrayTexture)if(B){if(ye&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Be,Ce,X.width,X.height,X.depth),ge)if(g.layerUpdates.size>0){const xe=Jl(X.width,X.height,g.format,g.type);for(const le of g.layerUpdates){const ze=X.data.subarray(le*xe/X.data.BYTES_PER_ELEMENT,(le+1)*xe/X.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,le,X.width,X.height,1,$,me,ze)}g.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,X.width,X.height,X.depth,$,me,X.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Ce,X.width,X.height,X.depth,0,$,me,X.data);else if(g.isData3DTexture)B?(ye&&t.texStorage3D(i.TEXTURE_3D,Be,Ce,X.width,X.height,X.depth),ge&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,X.width,X.height,X.depth,$,me,X.data)):t.texImage3D(i.TEXTURE_3D,0,Ce,X.width,X.height,X.depth,0,$,me,X.data);else if(g.isFramebufferTexture){if(ye)if(B)t.texStorage2D(i.TEXTURE_2D,Be,Ce,X.width,X.height);else{let xe=X.width,le=X.height;for(let ze=0;ze<Be;ze++)t.texImage2D(i.TEXTURE_2D,ze,Ce,xe,le,0,$,me,null),xe>>=1,le>>=1}}else if(Qe.length>0){if(B&&ye){const xe=ke(Qe[0]);t.texStorage2D(i.TEXTURE_2D,Be,Ce,xe.width,xe.height)}for(let xe=0,le=Qe.length;xe<le;xe++)ie=Qe[xe],B?ge&&t.texSubImage2D(i.TEXTURE_2D,xe,0,0,$,me,ie):t.texImage2D(i.TEXTURE_2D,xe,Ce,$,me,ie);g.generateMipmaps=!1}else if(B){if(ye){const xe=ke(X);t.texStorage2D(i.TEXTURE_2D,Be,Ce,xe.width,xe.height)}ge&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,$,me,X)}else t.texImage2D(i.TEXTURE_2D,0,Ce,$,me,X);p(g)&&f(oe),Oe.__version=re.version,g.onUpdate&&g.onUpdate(g)}b.__version=g.version}function Ae(b,g,z){if(g.image.length!==6)return;const oe=et(b,g),pe=g.source;t.bindTexture(i.TEXTURE_CUBE_MAP,b.__webglTexture,i.TEXTURE0+z);const re=n.get(pe);if(pe.version!==re.__version||oe===!0){t.activeTexture(i.TEXTURE0+z);const Oe=yt.getPrimaries(yt.workingColorSpace),be=g.colorSpace===bi?null:yt.getPrimaries(g.colorSpace),N=g.colorSpace===bi||Oe===be?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,g.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,g.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,g.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,N);const V=g.isCompressedTexture||g.image[0].isCompressedTexture,X=g.image[0]&&g.image[0].isDataTexture,$=[];for(let le=0;le<6;le++)!V&&!X?$[le]=A(g.image[le],!0,a.maxCubemapSize):$[le]=X?g.image[le].image:g.image[le],$[le]=st(g,$[le]);const me=$[0],Ce=r.convert(g.format,g.colorSpace),ie=r.convert(g.type),Qe=C(g.internalFormat,Ce,ie,g.colorSpace),B=g.isVideoTexture!==!0,ye=re.__version===void 0||oe===!0,ge=pe.dataReady;let Be=F(g,me);De(i.TEXTURE_CUBE_MAP,g);let xe;if(V){B&&ye&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Be,Qe,me.width,me.height);for(let le=0;le<6;le++){xe=$[le].mipmaps;for(let ze=0;ze<xe.length;ze++){const it=xe[ze];g.format!==Bn?Ce!==null?B?ge&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,ze,0,0,it.width,it.height,Ce,it.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,ze,Qe,it.width,it.height,0,it.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):B?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,ze,0,0,it.width,it.height,Ce,ie,it.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,ze,Qe,it.width,it.height,0,Ce,ie,it.data)}}}else{if(xe=g.mipmaps,B&&ye){xe.length>0&&Be++;const le=ke($[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Be,Qe,le.width,le.height)}for(let le=0;le<6;le++)if(X){B?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,0,0,0,$[le].width,$[le].height,Ce,ie,$[le].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,0,Qe,$[le].width,$[le].height,0,Ce,ie,$[le].data);for(let ze=0;ze<xe.length;ze++){const St=xe[ze].image[le].image;B?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,ze+1,0,0,St.width,St.height,Ce,ie,St.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,ze+1,Qe,St.width,St.height,0,Ce,ie,St.data)}}else{B?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,0,0,0,Ce,ie,$[le]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,0,Qe,Ce,ie,$[le]);for(let ze=0;ze<xe.length;ze++){const it=xe[ze];B?ge&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,ze+1,0,0,Ce,ie,it.image[le]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,ze+1,Qe,Ce,ie,it.image[le])}}}p(g)&&f(i.TEXTURE_CUBE_MAP),re.__version=pe.version,g.onUpdate&&g.onUpdate(g)}b.__version=g.version}function te(b,g,z,oe,pe,re){const Oe=r.convert(z.format,z.colorSpace),be=r.convert(z.type),N=C(z.internalFormat,Oe,be,z.colorSpace),V=n.get(g),X=n.get(z);if(X.__renderTarget=g,!V.__hasExternalTextures){const $=Math.max(1,g.width>>re),me=Math.max(1,g.height>>re);pe===i.TEXTURE_3D||pe===i.TEXTURE_2D_ARRAY?t.texImage3D(pe,re,N,$,me,g.depth,0,Oe,be,null):t.texImage2D(pe,re,N,$,me,0,Oe,be,null)}t.bindFramebuffer(i.FRAMEBUFFER,b),_t(g)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,oe,pe,X.__webglTexture,0,U(g)):(pe===i.TEXTURE_2D||pe>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&pe<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,oe,pe,X.__webglTexture,re),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Se(b,g,z){if(i.bindRenderbuffer(i.RENDERBUFFER,b),g.depthBuffer){const oe=g.depthTexture,pe=oe&&oe.isDepthTexture?oe.type:null,re=E(g.stencilBuffer,pe),Oe=g.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;_t(g)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,U(g),re,g.width,g.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,U(g),re,g.width,g.height):i.renderbufferStorage(i.RENDERBUFFER,re,g.width,g.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Oe,i.RENDERBUFFER,b)}else{const oe=g.textures;for(let pe=0;pe<oe.length;pe++){const re=oe[pe],Oe=r.convert(re.format,re.colorSpace),be=r.convert(re.type),N=C(re.internalFormat,Oe,be,re.colorSpace);_t(g)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,U(g),N,g.width,g.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,U(g),N,g.width,g.height):i.renderbufferStorage(i.RENDERBUFFER,N,g.width,g.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function we(b,g,z){const oe=g.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,b),!(g.depthTexture&&g.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const pe=n.get(g.depthTexture);if(pe.__renderTarget=g,(!pe.__webglTexture||g.depthTexture.image.width!==g.width||g.depthTexture.image.height!==g.height)&&(g.depthTexture.image.width=g.width,g.depthTexture.image.height=g.height,g.depthTexture.needsUpdate=!0),oe){if(pe.__webglInit===void 0&&(pe.__webglInit=!0,g.depthTexture.addEventListener("dispose",D)),pe.__webglTexture===void 0){pe.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,pe.__webglTexture),De(i.TEXTURE_CUBE_MAP,g.depthTexture);const V=r.convert(g.depthTexture.format),X=r.convert(g.depthTexture.type);let $;g.depthTexture.format===pi?$=i.DEPTH_COMPONENT24:g.depthTexture.format===Gi&&($=i.DEPTH24_STENCIL8);for(let me=0;me<6;me++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+me,0,$,g.width,g.height,0,V,X,null)}}else ee(g.depthTexture,0);const re=pe.__webglTexture,Oe=U(g),be=oe?i.TEXTURE_CUBE_MAP_POSITIVE_X+z:i.TEXTURE_2D,N=g.depthTexture.format===Gi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(g.depthTexture.format===pi)_t(g)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,N,be,re,0,Oe):i.framebufferTexture2D(i.FRAMEBUFFER,N,be,re,0);else if(g.depthTexture.format===Gi)_t(g)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,N,be,re,0,Oe):i.framebufferTexture2D(i.FRAMEBUFFER,N,be,re,0);else throw new Error("Unknown depthTexture format")}function Ge(b){const g=n.get(b),z=b.isWebGLCubeRenderTarget===!0;if(g.__boundDepthTexture!==b.depthTexture){const oe=b.depthTexture;if(g.__depthDisposeCallback&&g.__depthDisposeCallback(),oe){const pe=()=>{delete g.__boundDepthTexture,delete g.__depthDisposeCallback,oe.removeEventListener("dispose",pe)};oe.addEventListener("dispose",pe),g.__depthDisposeCallback=pe}g.__boundDepthTexture=oe}if(b.depthTexture&&!g.__autoAllocateDepthBuffer)if(z)for(let oe=0;oe<6;oe++)we(g.__webglFramebuffer[oe],b,oe);else{const oe=b.texture.mipmaps;oe&&oe.length>0?we(g.__webglFramebuffer[0],b,0):we(g.__webglFramebuffer,b,0)}else if(z){g.__webglDepthbuffer=[];for(let oe=0;oe<6;oe++)if(t.bindFramebuffer(i.FRAMEBUFFER,g.__webglFramebuffer[oe]),g.__webglDepthbuffer[oe]===void 0)g.__webglDepthbuffer[oe]=i.createRenderbuffer(),Se(g.__webglDepthbuffer[oe],b,!1);else{const pe=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,re=g.__webglDepthbuffer[oe];i.bindRenderbuffer(i.RENDERBUFFER,re),i.framebufferRenderbuffer(i.FRAMEBUFFER,pe,i.RENDERBUFFER,re)}}else{const oe=b.texture.mipmaps;if(oe&&oe.length>0?t.bindFramebuffer(i.FRAMEBUFFER,g.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,g.__webglFramebuffer),g.__webglDepthbuffer===void 0)g.__webglDepthbuffer=i.createRenderbuffer(),Se(g.__webglDepthbuffer,b,!1);else{const pe=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,re=g.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,re),i.framebufferRenderbuffer(i.FRAMEBUFFER,pe,i.RENDERBUFFER,re)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function ct(b,g,z){const oe=n.get(b);g!==void 0&&te(oe.__webglFramebuffer,b,b.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),z!==void 0&&Ge(b)}function Xe(b){const g=b.texture,z=n.get(b),oe=n.get(g);b.addEventListener("dispose",k);const pe=b.textures,re=b.isWebGLCubeRenderTarget===!0,Oe=pe.length>1;if(Oe||(oe.__webglTexture===void 0&&(oe.__webglTexture=i.createTexture()),oe.__version=g.version,s.memory.textures++),re){z.__webglFramebuffer=[];for(let be=0;be<6;be++)if(g.mipmaps&&g.mipmaps.length>0){z.__webglFramebuffer[be]=[];for(let N=0;N<g.mipmaps.length;N++)z.__webglFramebuffer[be][N]=i.createFramebuffer()}else z.__webglFramebuffer[be]=i.createFramebuffer()}else{if(g.mipmaps&&g.mipmaps.length>0){z.__webglFramebuffer=[];for(let be=0;be<g.mipmaps.length;be++)z.__webglFramebuffer[be]=i.createFramebuffer()}else z.__webglFramebuffer=i.createFramebuffer();if(Oe)for(let be=0,N=pe.length;be<N;be++){const V=n.get(pe[be]);V.__webglTexture===void 0&&(V.__webglTexture=i.createTexture(),s.memory.textures++)}if(b.samples>0&&_t(b)===!1){z.__webglMultisampledFramebuffer=i.createFramebuffer(),z.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,z.__webglMultisampledFramebuffer);for(let be=0;be<pe.length;be++){const N=pe[be];z.__webglColorRenderbuffer[be]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,z.__webglColorRenderbuffer[be]);const V=r.convert(N.format,N.colorSpace),X=r.convert(N.type),$=C(N.internalFormat,V,X,N.colorSpace,b.isXRRenderTarget===!0),me=U(b);i.renderbufferStorageMultisample(i.RENDERBUFFER,me,$,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+be,i.RENDERBUFFER,z.__webglColorRenderbuffer[be])}i.bindRenderbuffer(i.RENDERBUFFER,null),b.depthBuffer&&(z.__webglDepthRenderbuffer=i.createRenderbuffer(),Se(z.__webglDepthRenderbuffer,b,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(re){t.bindTexture(i.TEXTURE_CUBE_MAP,oe.__webglTexture),De(i.TEXTURE_CUBE_MAP,g);for(let be=0;be<6;be++)if(g.mipmaps&&g.mipmaps.length>0)for(let N=0;N<g.mipmaps.length;N++)te(z.__webglFramebuffer[be][N],b,g,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+be,N);else te(z.__webglFramebuffer[be],b,g,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+be,0);p(g)&&f(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Oe){for(let be=0,N=pe.length;be<N;be++){const V=pe[be],X=n.get(V);let $=i.TEXTURE_2D;(b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&($=b.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture($,X.__webglTexture),De($,V),te(z.__webglFramebuffer,b,V,i.COLOR_ATTACHMENT0+be,$,0),p(V)&&f($)}t.unbindTexture()}else{let be=i.TEXTURE_2D;if((b.isWebGL3DRenderTarget||b.isWebGLArrayRenderTarget)&&(be=b.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(be,oe.__webglTexture),De(be,g),g.mipmaps&&g.mipmaps.length>0)for(let N=0;N<g.mipmaps.length;N++)te(z.__webglFramebuffer[N],b,g,i.COLOR_ATTACHMENT0,be,N);else te(z.__webglFramebuffer,b,g,i.COLOR_ATTACHMENT0,be,0);p(g)&&f(be),t.unbindTexture()}b.depthBuffer&&Ge(b)}function Je(b){const g=b.textures;for(let z=0,oe=g.length;z<oe;z++){const pe=g[z];if(p(pe)){const re=y(b),Oe=n.get(pe).__webglTexture;t.bindTexture(re,Oe),f(re),t.unbindTexture()}}}const Ze=[],tt=[];function ht(b){if(b.samples>0){if(_t(b)===!1){const g=b.textures,z=b.width,oe=b.height;let pe=i.COLOR_BUFFER_BIT;const re=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Oe=n.get(b),be=g.length>1;if(be)for(let V=0;V<g.length;V++)t.bindFramebuffer(i.FRAMEBUFFER,Oe.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+V,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Oe.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+V,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Oe.__webglMultisampledFramebuffer);const N=b.texture.mipmaps;N&&N.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Oe.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Oe.__webglFramebuffer);for(let V=0;V<g.length;V++){if(b.resolveDepthBuffer&&(b.depthBuffer&&(pe|=i.DEPTH_BUFFER_BIT),b.stencilBuffer&&b.resolveStencilBuffer&&(pe|=i.STENCIL_BUFFER_BIT)),be){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Oe.__webglColorRenderbuffer[V]);const X=n.get(g[V]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,X,0)}i.blitFramebuffer(0,0,z,oe,0,0,z,oe,pe,i.NEAREST),c===!0&&(Ze.length=0,tt.length=0,Ze.push(i.COLOR_ATTACHMENT0+V),b.depthBuffer&&b.resolveDepthBuffer===!1&&(Ze.push(re),tt.push(re),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,tt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Ze))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),be)for(let V=0;V<g.length;V++){t.bindFramebuffer(i.FRAMEBUFFER,Oe.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+V,i.RENDERBUFFER,Oe.__webglColorRenderbuffer[V]);const X=n.get(g[V]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Oe.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+V,i.TEXTURE_2D,X,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Oe.__webglMultisampledFramebuffer)}else if(b.depthBuffer&&b.resolveDepthBuffer===!1&&c){const g=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[g])}}}function U(b){return Math.min(a.maxSamples,b.samples)}function _t(b){const g=n.get(b);return b.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&g.__useRenderToTexture!==!1}function gt(b){const g=s.render.frame;d.get(b)!==g&&(d.set(b,g),b.update())}function st(b,g){const z=b.colorSpace,oe=b.format,pe=b.type;return b.isCompressedTexture===!0||b.isVideoTexture===!0||z!==Ma&&z!==bi&&(yt.getTransfer(z)===Pt?(oe!==Bn||pe!==An)&&lt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):bt("WebGLTextures: Unsupported texture color space:",z)),g}function ke(b){return typeof HTMLImageElement<"u"&&b instanceof HTMLImageElement?(l.width=b.naturalWidth||b.width,l.height=b.naturalHeight||b.height):typeof VideoFrame<"u"&&b instanceof VideoFrame?(l.width=b.displayWidth,l.height=b.displayHeight):(l.width=b.width,l.height=b.height),l}this.allocateTextureUnit=H,this.resetTextureUnits=O,this.setTexture2D=ee,this.setTexture2DArray=J,this.setTexture3D=Y,this.setTextureCube=ve,this.rebindTextures=ct,this.setupRenderTarget=Xe,this.updateRenderTargetMipmap=Je,this.updateMultisampleRenderTarget=ht,this.setupDepthRenderbuffer=Ge,this.setupFrameBufferTexture=te,this.useMultisampledRTT=_t,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function dv(i,e){function t(n,a=bi){let r;const s=yt.getTransfer(a);if(n===An)return i.UNSIGNED_BYTE;if(n===jo)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Jo)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Wc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Xc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Gc)return i.BYTE;if(n===Hc)return i.SHORT;if(n===qa)return i.UNSIGNED_SHORT;if(n===Zo)return i.INT;if(n===Qn)return i.UNSIGNED_INT;if(n===Yn)return i.FLOAT;if(n===hi)return i.HALF_FLOAT;if(n===$c)return i.ALPHA;if(n===qc)return i.RGB;if(n===Bn)return i.RGBA;if(n===pi)return i.DEPTH_COMPONENT;if(n===Gi)return i.DEPTH_STENCIL;if(n===Yc)return i.RED;if(n===Qo)return i.RED_INTEGER;if(n===xa)return i.RG;if(n===el)return i.RG_INTEGER;if(n===tl)return i.RGBA_INTEGER;if(n===Dr||n===Ir||n===Lr||n===Ur)if(s===Pt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Dr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Ir)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Lr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Ur)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Dr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Ir)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Lr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Ur)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===uo||n===fo||n===ho||n===po)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===uo)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===fo)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===ho)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===po)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===mo||n===go||n===_o||n===vo||n===xo||n===Mo||n===So)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===mo||n===go)return s===Pt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===_o)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===vo)return r.COMPRESSED_R11_EAC;if(n===xo)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Mo)return r.COMPRESSED_RG11_EAC;if(n===So)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===yo||n===Eo||n===bo||n===To||n===Ao||n===wo||n===Co||n===Ro||n===Po||n===Do||n===Io||n===Lo||n===Uo||n===No)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===yo)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Eo)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===bo)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===To)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Ao)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===wo)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Co)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ro)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Po)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Do)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Io)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Lo)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Uo)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===No)return s===Pt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Fo||n===Oo||n===Bo)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===Fo)return s===Pt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Oo)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Bo)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===ko||n===Vo||n===zo||n===Go)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===ko)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Vo)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===zo)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Go)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ya?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const fv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,hv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class pv{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new iu(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new ti({vertexShader:fv,fragmentShader:hv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new ei(new Hr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class mv extends ya{constructor(e,t){super();const n=this;let a=null,r=1,s=null,o="local-floor",c=1,l=null,d=null,h=null,u=null,m=null,v=null;const A=typeof XRWebGLBinding<"u",p=new pv,f={},y=t.getContextAttributes();let C=null,E=null;const F=[],D=[],k=new Ut;let x=null;const w=new Tn;w.viewport=new Ht;const L=new Tn;L.viewport=new Ht;const S=[w,L],O=new wh;let H=null,q=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(se){let Ae=F[se];return Ae===void 0&&(Ae=new Cs,F[se]=Ae),Ae.getTargetRaySpace()},this.getControllerGrip=function(se){let Ae=F[se];return Ae===void 0&&(Ae=new Cs,F[se]=Ae),Ae.getGripSpace()},this.getHand=function(se){let Ae=F[se];return Ae===void 0&&(Ae=new Cs,F[se]=Ae),Ae.getHandSpace()};function ee(se){const Ae=D.indexOf(se.inputSource);if(Ae===-1)return;const te=F[Ae];te!==void 0&&(te.update(se.inputSource,se.frame,l||s),te.dispatchEvent({type:se.type,data:se.inputSource}))}function J(){a.removeEventListener("select",ee),a.removeEventListener("selectstart",ee),a.removeEventListener("selectend",ee),a.removeEventListener("squeeze",ee),a.removeEventListener("squeezestart",ee),a.removeEventListener("squeezeend",ee),a.removeEventListener("end",J),a.removeEventListener("inputsourceschange",Y);for(let se=0;se<F.length;se++){const Ae=D[se];Ae!==null&&(D[se]=null,F[se].disconnect(Ae))}H=null,q=null,p.reset();for(const se in f)delete f[se];e.setRenderTarget(C),m=null,u=null,h=null,a=null,E=null,xt.stop(),n.isPresenting=!1,e.setPixelRatio(x),e.setSize(k.width,k.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(se){r=se,n.isPresenting===!0&&lt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(se){o=se,n.isPresenting===!0&&lt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||s},this.setReferenceSpace=function(se){l=se},this.getBaseLayer=function(){return u!==null?u:m},this.getBinding=function(){return h===null&&A&&(h=new XRWebGLBinding(a,t)),h},this.getFrame=function(){return v},this.getSession=function(){return a},this.setSession=async function(se){if(a=se,a!==null){if(C=e.getRenderTarget(),a.addEventListener("select",ee),a.addEventListener("selectstart",ee),a.addEventListener("selectend",ee),a.addEventListener("squeeze",ee),a.addEventListener("squeezestart",ee),a.addEventListener("squeezeend",ee),a.addEventListener("end",J),a.addEventListener("inputsourceschange",Y),y.xrCompatible!==!0&&await t.makeXRCompatible(),x=e.getPixelRatio(),e.getSize(k),A&&"createProjectionLayer"in XRWebGLBinding.prototype){let te=null,Se=null,we=null;y.depth&&(we=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,te=y.stencil?Gi:pi,Se=y.stencil?Ya:Qn);const Ge={colorFormat:t.RGBA8,depthFormat:we,scaleFactor:r};h=this.getBinding(),u=h.createProjectionLayer(Ge),a.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),E=new jn(u.textureWidth,u.textureHeight,{format:Bn,type:An,depthTexture:new ja(u.textureWidth,u.textureHeight,Se,void 0,void 0,void 0,void 0,void 0,void 0,te),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{const te={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:r};m=new XRWebGLLayer(a,t,te),a.updateRenderState({baseLayer:m}),e.setPixelRatio(1),e.setSize(m.framebufferWidth,m.framebufferHeight,!1),E=new jn(m.framebufferWidth,m.framebufferHeight,{format:Bn,type:An,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(c),l=null,s=await a.requestReferenceSpace(o),xt.setContext(a),xt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function Y(se){for(let Ae=0;Ae<se.removed.length;Ae++){const te=se.removed[Ae],Se=D.indexOf(te);Se>=0&&(D[Se]=null,F[Se].disconnect(te))}for(let Ae=0;Ae<se.added.length;Ae++){const te=se.added[Ae];let Se=D.indexOf(te);if(Se===-1){for(let Ge=0;Ge<F.length;Ge++)if(Ge>=D.length){D.push(te),Se=Ge;break}else if(D[Ge]===null){D[Ge]=te,Se=Ge;break}if(Se===-1)break}const we=F[Se];we&&we.connect(te)}}const ve=new ne,_e=new ne;function Pe(se,Ae,te){ve.setFromMatrixPosition(Ae.matrixWorld),_e.setFromMatrixPosition(te.matrixWorld);const Se=ve.distanceTo(_e),we=Ae.projectionMatrix.elements,Ge=te.projectionMatrix.elements,ct=we[14]/(we[10]-1),Xe=we[14]/(we[10]+1),Je=(we[9]+1)/we[5],Ze=(we[9]-1)/we[5],tt=(we[8]-1)/we[0],ht=(Ge[8]+1)/Ge[0],U=ct*tt,_t=ct*ht,gt=Se/(-tt+ht),st=gt*-tt;if(Ae.matrixWorld.decompose(se.position,se.quaternion,se.scale),se.translateX(st),se.translateZ(gt),se.matrixWorld.compose(se.position,se.quaternion,se.scale),se.matrixWorldInverse.copy(se.matrixWorld).invert(),we[10]===-1)se.projectionMatrix.copy(Ae.projectionMatrix),se.projectionMatrixInverse.copy(Ae.projectionMatrixInverse);else{const ke=ct+gt,b=Xe+gt,g=U-st,z=_t+(Se-st),oe=Je*Xe/b*ke,pe=Ze*Xe/b*ke;se.projectionMatrix.makePerspective(g,z,oe,pe,ke,b),se.projectionMatrixInverse.copy(se.projectionMatrix).invert()}}function ue(se,Ae){Ae===null?se.matrixWorld.copy(se.matrix):se.matrixWorld.multiplyMatrices(Ae.matrixWorld,se.matrix),se.matrixWorldInverse.copy(se.matrixWorld).invert()}this.updateCamera=function(se){if(a===null)return;let Ae=se.near,te=se.far;p.texture!==null&&(p.depthNear>0&&(Ae=p.depthNear),p.depthFar>0&&(te=p.depthFar)),O.near=L.near=w.near=Ae,O.far=L.far=w.far=te,(H!==O.near||q!==O.far)&&(a.updateRenderState({depthNear:O.near,depthFar:O.far}),H=O.near,q=O.far),O.layers.mask=se.layers.mask|6,w.layers.mask=O.layers.mask&-5,L.layers.mask=O.layers.mask&-3;const Se=se.parent,we=O.cameras;ue(O,Se);for(let Ge=0;Ge<we.length;Ge++)ue(we[Ge],Se);we.length===2?Pe(O,w,L):O.projectionMatrix.copy(w.projectionMatrix),De(se,O,Se)};function De(se,Ae,te){te===null?se.matrix.copy(Ae.matrixWorld):(se.matrix.copy(te.matrixWorld),se.matrix.invert(),se.matrix.multiply(Ae.matrixWorld)),se.matrix.decompose(se.position,se.quaternion,se.scale),se.updateMatrixWorld(!0),se.projectionMatrix.copy(Ae.projectionMatrix),se.projectionMatrixInverse.copy(Ae.projectionMatrixInverse),se.isPerspectiveCamera&&(se.fov=Za*2*Math.atan(1/se.projectionMatrix.elements[5]),se.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(!(u===null&&m===null))return c},this.setFoveation=function(se){c=se,u!==null&&(u.fixedFoveation=se),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=se)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(O)},this.getCameraTexture=function(se){return f[se]};let et=null;function nt(se,Ae){if(d=Ae.getViewerPose(l||s),v=Ae,d!==null){const te=d.views;m!==null&&(e.setRenderTargetFramebuffer(E,m.framebuffer),e.setRenderTarget(E));let Se=!1;te.length!==O.cameras.length&&(O.cameras.length=0,Se=!0);for(let Xe=0;Xe<te.length;Xe++){const Je=te[Xe];let Ze=null;if(m!==null)Ze=m.getViewport(Je);else{const ht=h.getViewSubImage(u,Je);Ze=ht.viewport,Xe===0&&(e.setRenderTargetTextures(E,ht.colorTexture,ht.depthStencilTexture),e.setRenderTarget(E))}let tt=S[Xe];tt===void 0&&(tt=new Tn,tt.layers.enable(Xe),tt.viewport=new Ht,S[Xe]=tt),tt.matrix.fromArray(Je.transform.matrix),tt.matrix.decompose(tt.position,tt.quaternion,tt.scale),tt.projectionMatrix.fromArray(Je.projectionMatrix),tt.projectionMatrixInverse.copy(tt.projectionMatrix).invert(),tt.viewport.set(Ze.x,Ze.y,Ze.width,Ze.height),Xe===0&&(O.matrix.copy(tt.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),Se===!0&&O.cameras.push(tt)}const we=a.enabledFeatures;if(we&&we.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&A){h=n.getBinding();const Xe=h.getDepthInformation(te[0]);Xe&&Xe.isValid&&Xe.texture&&p.init(Xe,a.renderState)}if(we&&we.includes("camera-access")&&A){e.state.unbindTexture(),h=n.getBinding();for(let Xe=0;Xe<te.length;Xe++){const Je=te[Xe].camera;if(Je){let Ze=f[Je];Ze||(Ze=new iu,f[Je]=Ze);const tt=h.getCameraImage(Je);Ze.sourceTexture=tt}}}}for(let te=0;te<F.length;te++){const Se=D[te],we=F[te];Se!==null&&we!==void 0&&we.update(Se,Ae,l||s)}et&&et(se,Ae),Ae.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Ae}),v=null}const xt=new ou;xt.setAnimationLoop(nt),this.setAnimationLoop=function(se){et=se},this.dispose=function(){}}}const Oi=new mi,gv=new $t;function _v(i,e){function t(p,f){p.matrixAutoUpdate===!0&&p.updateMatrix(),f.value.copy(p.matrix)}function n(p,f){f.color.getRGB(p.fogColor.value,au(i)),f.isFog?(p.fogNear.value=f.near,p.fogFar.value=f.far):f.isFogExp2&&(p.fogDensity.value=f.density)}function a(p,f,y,C,E){f.isMeshBasicMaterial?r(p,f):f.isMeshLambertMaterial?(r(p,f),f.envMap&&(p.envMapIntensity.value=f.envMapIntensity)):f.isMeshToonMaterial?(r(p,f),h(p,f)):f.isMeshPhongMaterial?(r(p,f),d(p,f),f.envMap&&(p.envMapIntensity.value=f.envMapIntensity)):f.isMeshStandardMaterial?(r(p,f),u(p,f),f.isMeshPhysicalMaterial&&m(p,f,E)):f.isMeshMatcapMaterial?(r(p,f),v(p,f)):f.isMeshDepthMaterial?r(p,f):f.isMeshDistanceMaterial?(r(p,f),A(p,f)):f.isMeshNormalMaterial?r(p,f):f.isLineBasicMaterial?(s(p,f),f.isLineDashedMaterial&&o(p,f)):f.isPointsMaterial?c(p,f,y,C):f.isSpriteMaterial?l(p,f):f.isShadowMaterial?(p.color.value.copy(f.color),p.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(p,f){p.opacity.value=f.opacity,f.color&&p.diffuse.value.copy(f.color),f.emissive&&p.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(p.map.value=f.map,t(f.map,p.mapTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,t(f.alphaMap,p.alphaMapTransform)),f.bumpMap&&(p.bumpMap.value=f.bumpMap,t(f.bumpMap,p.bumpMapTransform),p.bumpScale.value=f.bumpScale,f.side===mn&&(p.bumpScale.value*=-1)),f.normalMap&&(p.normalMap.value=f.normalMap,t(f.normalMap,p.normalMapTransform),p.normalScale.value.copy(f.normalScale),f.side===mn&&p.normalScale.value.negate()),f.displacementMap&&(p.displacementMap.value=f.displacementMap,t(f.displacementMap,p.displacementMapTransform),p.displacementScale.value=f.displacementScale,p.displacementBias.value=f.displacementBias),f.emissiveMap&&(p.emissiveMap.value=f.emissiveMap,t(f.emissiveMap,p.emissiveMapTransform)),f.specularMap&&(p.specularMap.value=f.specularMap,t(f.specularMap,p.specularMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest);const y=e.get(f),C=y.envMap,E=y.envMapRotation;C&&(p.envMap.value=C,Oi.copy(E),Oi.x*=-1,Oi.y*=-1,Oi.z*=-1,C.isCubeTexture&&C.isRenderTargetTexture===!1&&(Oi.y*=-1,Oi.z*=-1),p.envMapRotation.value.setFromMatrix4(gv.makeRotationFromEuler(Oi)),p.flipEnvMap.value=C.isCubeTexture&&C.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=f.reflectivity,p.ior.value=f.ior,p.refractionRatio.value=f.refractionRatio),f.lightMap&&(p.lightMap.value=f.lightMap,p.lightMapIntensity.value=f.lightMapIntensity,t(f.lightMap,p.lightMapTransform)),f.aoMap&&(p.aoMap.value=f.aoMap,p.aoMapIntensity.value=f.aoMapIntensity,t(f.aoMap,p.aoMapTransform))}function s(p,f){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,f.map&&(p.map.value=f.map,t(f.map,p.mapTransform))}function o(p,f){p.dashSize.value=f.dashSize,p.totalSize.value=f.dashSize+f.gapSize,p.scale.value=f.scale}function c(p,f,y,C){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,p.size.value=f.size*y,p.scale.value=C*.5,f.map&&(p.map.value=f.map,t(f.map,p.uvTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,t(f.alphaMap,p.alphaMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest)}function l(p,f){p.diffuse.value.copy(f.color),p.opacity.value=f.opacity,p.rotation.value=f.rotation,f.map&&(p.map.value=f.map,t(f.map,p.mapTransform)),f.alphaMap&&(p.alphaMap.value=f.alphaMap,t(f.alphaMap,p.alphaMapTransform)),f.alphaTest>0&&(p.alphaTest.value=f.alphaTest)}function d(p,f){p.specular.value.copy(f.specular),p.shininess.value=Math.max(f.shininess,1e-4)}function h(p,f){f.gradientMap&&(p.gradientMap.value=f.gradientMap)}function u(p,f){p.metalness.value=f.metalness,f.metalnessMap&&(p.metalnessMap.value=f.metalnessMap,t(f.metalnessMap,p.metalnessMapTransform)),p.roughness.value=f.roughness,f.roughnessMap&&(p.roughnessMap.value=f.roughnessMap,t(f.roughnessMap,p.roughnessMapTransform)),f.envMap&&(p.envMapIntensity.value=f.envMapIntensity)}function m(p,f,y){p.ior.value=f.ior,f.sheen>0&&(p.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),p.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(p.sheenColorMap.value=f.sheenColorMap,t(f.sheenColorMap,p.sheenColorMapTransform)),f.sheenRoughnessMap&&(p.sheenRoughnessMap.value=f.sheenRoughnessMap,t(f.sheenRoughnessMap,p.sheenRoughnessMapTransform))),f.clearcoat>0&&(p.clearcoat.value=f.clearcoat,p.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(p.clearcoatMap.value=f.clearcoatMap,t(f.clearcoatMap,p.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,t(f.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(p.clearcoatNormalMap.value=f.clearcoatNormalMap,t(f.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===mn&&p.clearcoatNormalScale.value.negate())),f.dispersion>0&&(p.dispersion.value=f.dispersion),f.iridescence>0&&(p.iridescence.value=f.iridescence,p.iridescenceIOR.value=f.iridescenceIOR,p.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(p.iridescenceMap.value=f.iridescenceMap,t(f.iridescenceMap,p.iridescenceMapTransform)),f.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=f.iridescenceThicknessMap,t(f.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),f.transmission>0&&(p.transmission.value=f.transmission,p.transmissionSamplerMap.value=y.texture,p.transmissionSamplerSize.value.set(y.width,y.height),f.transmissionMap&&(p.transmissionMap.value=f.transmissionMap,t(f.transmissionMap,p.transmissionMapTransform)),p.thickness.value=f.thickness,f.thicknessMap&&(p.thicknessMap.value=f.thicknessMap,t(f.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=f.attenuationDistance,p.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(p.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(p.anisotropyMap.value=f.anisotropyMap,t(f.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=f.specularIntensity,p.specularColor.value.copy(f.specularColor),f.specularColorMap&&(p.specularColorMap.value=f.specularColorMap,t(f.specularColorMap,p.specularColorMapTransform)),f.specularIntensityMap&&(p.specularIntensityMap.value=f.specularIntensityMap,t(f.specularIntensityMap,p.specularIntensityMapTransform))}function v(p,f){f.matcap&&(p.matcap.value=f.matcap)}function A(p,f){const y=e.get(f).light;p.referencePosition.value.setFromMatrixPosition(y.matrixWorld),p.nearDistance.value=y.shadow.camera.near,p.farDistance.value=y.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:a}}function vv(i,e,t,n){let a={},r={},s=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(y,C){const E=C.program;n.uniformBlockBinding(y,E)}function l(y,C){let E=a[y.id];E===void 0&&(v(y),E=d(y),a[y.id]=E,y.addEventListener("dispose",p));const F=C.program;n.updateUBOMapping(y,F);const D=e.render.frame;r[y.id]!==D&&(u(y),r[y.id]=D)}function d(y){const C=h();y.__bindingPointIndex=C;const E=i.createBuffer(),F=y.__size,D=y.usage;return i.bindBuffer(i.UNIFORM_BUFFER,E),i.bufferData(i.UNIFORM_BUFFER,F,D),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,C,E),E}function h(){for(let y=0;y<o;y++)if(s.indexOf(y)===-1)return s.push(y),y;return bt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(y){const C=a[y.id],E=y.uniforms,F=y.__cache;i.bindBuffer(i.UNIFORM_BUFFER,C);for(let D=0,k=E.length;D<k;D++){const x=Array.isArray(E[D])?E[D]:[E[D]];for(let w=0,L=x.length;w<L;w++){const S=x[w];if(m(S,D,w,F)===!0){const O=S.__offset,H=Array.isArray(S.value)?S.value:[S.value];let q=0;for(let ee=0;ee<H.length;ee++){const J=H[ee],Y=A(J);typeof J=="number"||typeof J=="boolean"?(S.__data[0]=J,i.bufferSubData(i.UNIFORM_BUFFER,O+q,S.__data)):J.isMatrix3?(S.__data[0]=J.elements[0],S.__data[1]=J.elements[1],S.__data[2]=J.elements[2],S.__data[3]=0,S.__data[4]=J.elements[3],S.__data[5]=J.elements[4],S.__data[6]=J.elements[5],S.__data[7]=0,S.__data[8]=J.elements[6],S.__data[9]=J.elements[7],S.__data[10]=J.elements[8],S.__data[11]=0):(J.toArray(S.__data,q),q+=Y.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,O,S.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function m(y,C,E,F){const D=y.value,k=C+"_"+E;if(F[k]===void 0)return typeof D=="number"||typeof D=="boolean"?F[k]=D:F[k]=D.clone(),!0;{const x=F[k];if(typeof D=="number"||typeof D=="boolean"){if(x!==D)return F[k]=D,!0}else if(x.equals(D)===!1)return x.copy(D),!0}return!1}function v(y){const C=y.uniforms;let E=0;const F=16;for(let k=0,x=C.length;k<x;k++){const w=Array.isArray(C[k])?C[k]:[C[k]];for(let L=0,S=w.length;L<S;L++){const O=w[L],H=Array.isArray(O.value)?O.value:[O.value];for(let q=0,ee=H.length;q<ee;q++){const J=H[q],Y=A(J),ve=E%F,_e=ve%Y.boundary,Pe=ve+_e;E+=_e,Pe!==0&&F-Pe<Y.storage&&(E+=F-Pe),O.__data=new Float32Array(Y.storage/Float32Array.BYTES_PER_ELEMENT),O.__offset=E,E+=Y.storage}}}const D=E%F;return D>0&&(E+=F-D),y.__size=E,y.__cache={},this}function A(y){const C={boundary:0,storage:0};return typeof y=="number"||typeof y=="boolean"?(C.boundary=4,C.storage=4):y.isVector2?(C.boundary=8,C.storage=8):y.isVector3||y.isColor?(C.boundary=16,C.storage=12):y.isVector4?(C.boundary=16,C.storage=16):y.isMatrix3?(C.boundary=48,C.storage=48):y.isMatrix4?(C.boundary=64,C.storage=64):y.isTexture?lt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):lt("WebGLRenderer: Unsupported uniform value type.",y),C}function p(y){const C=y.target;C.removeEventListener("dispose",p);const E=s.indexOf(C.__bindingPointIndex);s.splice(E,1),i.deleteBuffer(a[C.id]),delete a[C.id],delete r[C.id]}function f(){for(const y in a)i.deleteBuffer(a[y]);s=[],a={},r={}}return{bind:c,update:l,dispose:f}}const xv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let $n=null;function Mv(){return $n===null&&($n=new uh(xv,16,16,xa,hi),$n.name="DFG_LUT",$n.minFilter=sn,$n.magFilter=sn,$n.wrapS=ui,$n.wrapT=ui,$n.generateMipmaps=!1,$n.needsUpdate=!0),$n}class Sv{constructor(e={}){const{canvas:t=Tf(),context:n=null,depth:a=!0,stencil:r=!1,alpha:s=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:d="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:u=!1,outputBufferType:m=An}=e;this.isWebGLRenderer=!0;let v;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");v=n.getContextAttributes().alpha}else v=s;const A=m,p=new Set([tl,el,Qo]),f=new Set([An,Qn,qa,Ya,jo,Jo]),y=new Uint32Array(4),C=new Int32Array(4);let E=null,F=null;const D=[],k=[];let x=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Zn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const w=this;let L=!1;this._outputColorSpace=xn;let S=0,O=0,H=null,q=-1,ee=null;const J=new Ht,Y=new Ht;let ve=null;const _e=new Lt(0);let Pe=0,ue=t.width,De=t.height,et=1,nt=null,xt=null;const se=new Ht(0,0,ue,De),Ae=new Ht(0,0,ue,De);let te=!1;const Se=new tu;let we=!1,Ge=!1;const ct=new $t,Xe=new ne,Je=new Ht,Ze={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let tt=!1;function ht(){return H===null?et:1}let U=n;function _t(M,W){return t.getContext(M,W)}try{const M={alpha:!0,depth:a,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:d,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ko}`),t.addEventListener("webglcontextlost",ze,!1),t.addEventListener("webglcontextrestored",it,!1),t.addEventListener("webglcontextcreationerror",St,!1),U===null){const W="webgl2";if(U=_t(W,M),U===null)throw _t(W)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(M){throw bt("WebGLRenderer: "+M.message),M}let gt,st,ke,b,g,z,oe,pe,re,Oe,be,N,V,X,$,me,Ce,ie,Qe,B,ye,ge,Be;function xe(){gt=new Sg(U),gt.init(),ye=new dv(U,gt),st=new hg(U,gt,e,ye),ke=new cv(U,gt),st.reversedDepthBuffer&&u&&ke.buffers.depth.setReversed(!0),b=new bg(U),g=new K_,z=new uv(U,gt,ke,g,st,ye,b),oe=new Mg(w),pe=new Rh(U),ge=new dg(U,pe),re=new yg(U,pe,b,ge),Oe=new Ag(U,re,pe,ge,b),ie=new Tg(U,st,z),$=new pg(g),be=new Y_(w,oe,gt,st,ge,$),N=new _v(w,g),V=new j_,X=new iv(gt),Ce=new ug(w,oe,ke,Oe,v,c),me=new lv(w,Oe,st),Be=new vv(U,b,st,ke),Qe=new fg(U,gt,b),B=new Eg(U,gt,b),b.programs=be.programs,w.capabilities=st,w.extensions=gt,w.properties=g,w.renderLists=V,w.shadowMap=me,w.state=ke,w.info=b}xe(),A!==An&&(x=new Cg(A,t.width,t.height,a,r));const le=new mv(w,U);this.xr=le,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){const M=gt.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){const M=gt.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return et},this.setPixelRatio=function(M){M!==void 0&&(et=M,this.setSize(ue,De,!1))},this.getSize=function(M){return M.set(ue,De)},this.setSize=function(M,W,ae=!0){if(le.isPresenting){lt("WebGLRenderer: Can't change size while VR device is presenting.");return}ue=M,De=W,t.width=Math.floor(M*et),t.height=Math.floor(W*et),ae===!0&&(t.style.width=M+"px",t.style.height=W+"px"),x!==null&&x.setSize(t.width,t.height),this.setViewport(0,0,M,W)},this.getDrawingBufferSize=function(M){return M.set(ue*et,De*et).floor()},this.setDrawingBufferSize=function(M,W,ae){ue=M,De=W,et=ae,t.width=Math.floor(M*ae),t.height=Math.floor(W*ae),this.setViewport(0,0,M,W)},this.setEffects=function(M){if(A===An){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(M){for(let W=0;W<M.length;W++)if(M[W].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}x.setEffects(M||[])},this.getCurrentViewport=function(M){return M.copy(J)},this.getViewport=function(M){return M.copy(se)},this.setViewport=function(M,W,ae,Q){M.isVector4?se.set(M.x,M.y,M.z,M.w):se.set(M,W,ae,Q),ke.viewport(J.copy(se).multiplyScalar(et).round())},this.getScissor=function(M){return M.copy(Ae)},this.setScissor=function(M,W,ae,Q){M.isVector4?Ae.set(M.x,M.y,M.z,M.w):Ae.set(M,W,ae,Q),ke.scissor(Y.copy(Ae).multiplyScalar(et).round())},this.getScissorTest=function(){return te},this.setScissorTest=function(M){ke.setScissorTest(te=M)},this.setOpaqueSort=function(M){nt=M},this.setTransparentSort=function(M){xt=M},this.getClearColor=function(M){return M.copy(Ce.getClearColor())},this.setClearColor=function(){Ce.setClearColor(...arguments)},this.getClearAlpha=function(){return Ce.getClearAlpha()},this.setClearAlpha=function(){Ce.setClearAlpha(...arguments)},this.clear=function(M=!0,W=!0,ae=!0){let Q=0;if(M){let K=!1;if(H!==null){const Ie=H.texture.format;K=p.has(Ie)}if(K){const Ie=H.texture.type,Ve=f.has(Ie),Le=Ce.getClearColor(),He=Ce.getClearAlpha(),$e=Le.r,ot=Le.g,dt=Le.b;Ve?(y[0]=$e,y[1]=ot,y[2]=dt,y[3]=He,U.clearBufferuiv(U.COLOR,0,y)):(C[0]=$e,C[1]=ot,C[2]=dt,C[3]=He,U.clearBufferiv(U.COLOR,0,C))}else Q|=U.COLOR_BUFFER_BIT}W&&(Q|=U.DEPTH_BUFFER_BIT),ae&&(Q|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),Q!==0&&U.clear(Q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ze,!1),t.removeEventListener("webglcontextrestored",it,!1),t.removeEventListener("webglcontextcreationerror",St,!1),Ce.dispose(),V.dispose(),X.dispose(),g.dispose(),oe.dispose(),Oe.dispose(),ge.dispose(),Be.dispose(),be.dispose(),le.dispose(),le.removeEventListener("sessionstart",Ca),le.removeEventListener("sessionend",Ra),Rn.stop()};function ze(M){M.preventDefault(),Il("WebGLRenderer: Context Lost."),L=!0}function it(){Il("WebGLRenderer: Context Restored."),L=!1;const M=b.autoReset,W=me.enabled,ae=me.autoUpdate,Q=me.needsUpdate,K=me.type;xe(),b.autoReset=M,me.enabled=W,me.autoUpdate=ae,me.needsUpdate=Q,me.type=K}function St(M){bt("WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function Tt(M){const W=M.target;W.removeEventListener("dispose",Tt),Sn(W)}function Sn(M){Cn(M),g.remove(M)}function Cn(M){const W=g.get(M).programs;W!==void 0&&(W.forEach(function(ae){be.releaseProgram(ae)}),M.isShaderMaterial&&be.releaseShaderCache(M))}this.renderBufferDirect=function(M,W,ae,Q,K,Ie){W===null&&(W=Ze);const Ve=K.isMesh&&K.matrixWorld.determinant()<0,Le=Ia(M,W,ae,Q,K);ke.setMaterial(Q,Ve);let He=ae.index,$e=1;if(Q.wireframe===!0){if(He=re.getWireframeAttribute(ae),He===void 0)return;$e=2}const ot=ae.drawRange,dt=ae.attributes.position;let je=ot.start*$e,Et=(ot.start+ot.count)*$e;Ie!==null&&(je=Math.max(je,Ie.start*$e),Et=Math.min(Et,(Ie.start+Ie.count)*$e)),He!==null?(je=Math.max(je,0),Et=Math.min(Et,He.count)):dt!=null&&(je=Math.max(je,0),Et=Math.min(Et,dt.count));const Ft=Et-je;if(Ft<0||Ft===1/0)return;ge.setup(K,Q,Le,ae,He);let Nt,At=Qe;if(He!==null&&(Nt=pe.get(He),At=B,At.setIndex(Nt)),K.isMesh)Q.wireframe===!0?(ke.setLineWidth(Q.wireframeLinewidth*ht()),At.setMode(U.LINES)):At.setMode(U.TRIANGLES);else if(K.isLine){let Zt=Q.linewidth;Zt===void 0&&(Zt=1),ke.setLineWidth(Zt*ht()),K.isLineSegments?At.setMode(U.LINES):K.isLineLoop?At.setMode(U.LINE_LOOP):At.setMode(U.LINE_STRIP)}else K.isPoints?At.setMode(U.POINTS):K.isSprite&&At.setMode(U.TRIANGLES);if(K.isBatchedMesh)if(K._multiDrawInstances!==null)Br("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),At.renderMultiDrawInstances(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount,K._multiDrawInstances);else if(gt.get("WEBGL_multi_draw"))At.renderMultiDraw(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount);else{const Zt=K._multiDrawStarts,We=K._multiDrawCounts,ln=K._multiDrawCount,ut=He?pe.get(He).bytesPerElement:1,Ot=g.get(Q).currentProgram.getUniforms();for(let cn=0;cn<ln;cn++)Ot.setValue(U,"_gl_DrawID",cn),At.render(Zt[cn]/ut,We[cn])}else if(K.isInstancedMesh)At.renderInstances(je,Ft,K.count);else if(ae.isInstancedBufferGeometry){const Zt=ae._maxInstanceCount!==void 0?ae._maxInstanceCount:1/0,We=Math.min(ae.instanceCount,Zt);At.renderInstances(je,Ft,We)}else At.render(je,Ft)};function er(M,W,ae){M.transparent===!0&&M.side===li&&M.forceSinglePass===!1?(M.side=mn,M.needsUpdate=!0,Pn(M,W,ae),M.side=wi,M.needsUpdate=!0,Pn(M,W,ae),M.side=li):Pn(M,W,ae)}this.compile=function(M,W,ae=null){ae===null&&(ae=M),F=X.get(ae),F.init(W),k.push(F),ae.traverseVisible(function(K){K.isLight&&K.layers.test(W.layers)&&(F.pushLight(K),K.castShadow&&F.pushShadow(K))}),M!==ae&&M.traverseVisible(function(K){K.isLight&&K.layers.test(W.layers)&&(F.pushLight(K),K.castShadow&&F.pushShadow(K))}),F.setupLights();const Q=new Set;return M.traverse(function(K){if(!(K.isMesh||K.isPoints||K.isLine||K.isSprite))return;const Ie=K.material;if(Ie)if(Array.isArray(Ie))for(let Ve=0;Ve<Ie.length;Ve++){const Le=Ie[Ve];er(Le,ae,K),Q.add(Le)}else er(Ie,ae,K),Q.add(Ie)}),F=k.pop(),Q},this.compileAsync=function(M,W,ae=null){const Q=this.compile(M,W,ae);return new Promise(K=>{function Ie(){if(Q.forEach(function(Ve){g.get(Ve).currentProgram.isReady()&&Q.delete(Ve)}),Q.size===0){K(M);return}setTimeout(Ie,10)}gt.get("KHR_parallel_shader_compile")!==null?Ie():setTimeout(Ie,10)})};let Aa=null;function wa(M){Aa&&Aa(M)}function Ca(){Rn.stop()}function Ra(){Rn.start()}const Rn=new ou;Rn.setAnimationLoop(wa),typeof self<"u"&&Rn.setContext(self),this.setAnimationLoop=function(M){Aa=M,le.setAnimationLoop(M),M===null?Rn.stop():Rn.start()},le.addEventListener("sessionstart",Ca),le.addEventListener("sessionend",Ra),this.render=function(M,W){if(W!==void 0&&W.isCamera!==!0){bt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(L===!0)return;const ae=le.enabled===!0&&le.isPresenting===!0,Q=x!==null&&(H===null||ae)&&x.begin(w,H);if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),W.parent===null&&W.matrixWorldAutoUpdate===!0&&W.updateMatrixWorld(),le.enabled===!0&&le.isPresenting===!0&&(x===null||x.isCompositing()===!1)&&(le.cameraAutoUpdate===!0&&le.updateCamera(W),W=le.getCamera()),M.isScene===!0&&M.onBeforeRender(w,M,W,H),F=X.get(M,k.length),F.init(W),k.push(F),ct.multiplyMatrices(W.projectionMatrix,W.matrixWorldInverse),Se.setFromProjectionMatrix(ct,Kn,W.reversedDepth),Ge=this.localClippingEnabled,we=$.init(this.clippingPlanes,Ge),E=V.get(M,D.length),E.init(),D.push(E),le.enabled===!0&&le.isPresenting===!0){const Ve=w.xr.getDepthSensingMesh();Ve!==null&&Wi(Ve,W,-1/0,w.sortObjects)}Wi(M,W,0,w.sortObjects),E.finish(),w.sortObjects===!0&&E.sort(nt,xt),tt=le.enabled===!1||le.isPresenting===!1||le.hasDepthSensing()===!1,tt&&Ce.addToRenderList(E,M),this.info.render.frame++,we===!0&&$.beginShadows();const K=F.state.shadowsArray;if(me.render(K,M,W),we===!0&&$.endShadows(),this.info.autoReset===!0&&this.info.reset(),(Q&&x.hasRenderPass())===!1){const Ve=E.opaque,Le=E.transmissive;if(F.setupLights(),W.isArrayCamera){const He=W.cameras;if(Le.length>0)for(let $e=0,ot=He.length;$e<ot;$e++){const dt=He[$e];tr(Ve,Le,M,dt)}tt&&Ce.render(M);for(let $e=0,ot=He.length;$e<ot;$e++){const dt=He[$e];Pa(E,M,dt,dt.viewport)}}else Le.length>0&&tr(Ve,Le,M,W),tt&&Ce.render(M),Pa(E,M,W)}H!==null&&O===0&&(z.updateMultisampleRenderTarget(H),z.updateRenderTargetMipmap(H)),Q&&x.end(w),M.isScene===!0&&M.onAfterRender(w,M,W),ge.resetDefaultState(),q=-1,ee=null,k.pop(),k.length>0?(F=k[k.length-1],we===!0&&$.setGlobalState(w.clippingPlanes,F.state.camera)):F=null,D.pop(),D.length>0?E=D[D.length-1]:E=null};function Wi(M,W,ae,Q){if(M.visible===!1)return;if(M.layers.test(W.layers)){if(M.isGroup)ae=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(W);else if(M.isLight)F.pushLight(M),M.castShadow&&F.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||Se.intersectsSprite(M)){Q&&Je.setFromMatrixPosition(M.matrixWorld).applyMatrix4(ct);const Ve=Oe.update(M),Le=M.material;Le.visible&&E.push(M,Ve,Le,ae,Je.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||Se.intersectsObject(M))){const Ve=Oe.update(M),Le=M.material;if(Q&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),Je.copy(M.boundingSphere.center)):(Ve.boundingSphere===null&&Ve.computeBoundingSphere(),Je.copy(Ve.boundingSphere.center)),Je.applyMatrix4(M.matrixWorld).applyMatrix4(ct)),Array.isArray(Le)){const He=Ve.groups;for(let $e=0,ot=He.length;$e<ot;$e++){const dt=He[$e],je=Le[dt.materialIndex];je&&je.visible&&E.push(M,Ve,je,ae,Je.z,dt)}}else Le.visible&&E.push(M,Ve,Le,ae,Je.z,null)}}const Ie=M.children;for(let Ve=0,Le=Ie.length;Ve<Le;Ve++)Wi(Ie[Ve],W,ae,Q)}function Pa(M,W,ae,Q){const{opaque:K,transmissive:Ie,transparent:Ve}=M;F.setupLightsView(ae),we===!0&&$.setGlobalState(w.clippingPlanes,ae),Q&&ke.viewport(J.copy(Q)),K.length>0&&Xi(K,W,ae),Ie.length>0&&Xi(Ie,W,ae),Ve.length>0&&Xi(Ve,W,ae),ke.buffers.depth.setTest(!0),ke.buffers.depth.setMask(!0),ke.buffers.color.setMask(!0),ke.setPolygonOffset(!1)}function tr(M,W,ae,Q){if((ae.isScene===!0?ae.overrideMaterial:null)!==null)return;if(F.state.transmissionRenderTarget[Q.id]===void 0){const je=gt.has("EXT_color_buffer_half_float")||gt.has("EXT_color_buffer_float");F.state.transmissionRenderTarget[Q.id]=new jn(1,1,{generateMipmaps:!0,type:je?hi:An,minFilter:zi,samples:Math.max(4,st.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:yt.workingColorSpace})}const Ie=F.state.transmissionRenderTarget[Q.id],Ve=Q.viewport||J;Ie.setSize(Ve.z*w.transmissionResolutionScale,Ve.w*w.transmissionResolutionScale);const Le=w.getRenderTarget(),He=w.getActiveCubeFace(),$e=w.getActiveMipmapLevel();w.setRenderTarget(Ie),w.getClearColor(_e),Pe=w.getClearAlpha(),Pe<1&&w.setClearColor(16777215,.5),w.clear(),tt&&Ce.render(ae);const ot=w.toneMapping;w.toneMapping=Zn;const dt=Q.viewport;if(Q.viewport!==void 0&&(Q.viewport=void 0),F.setupLightsView(Q),we===!0&&$.setGlobalState(w.clippingPlanes,Q),Xi(M,ae,Q),z.updateMultisampleRenderTarget(Ie),z.updateRenderTargetMipmap(Ie),gt.has("WEBGL_multisampled_render_to_texture")===!1){let je=!1;for(let Et=0,Ft=W.length;Et<Ft;Et++){const Nt=W[Et],{object:At,geometry:Zt,material:We,group:ln}=Nt;if(We.side===li&&At.layers.test(Q.layers)){const ut=We.side;We.side=mn,We.needsUpdate=!0,Ci(At,ae,Q,Zt,We,ln),We.side=ut,We.needsUpdate=!0,je=!0}}je===!0&&(z.updateMultisampleRenderTarget(Ie),z.updateRenderTargetMipmap(Ie))}w.setRenderTarget(Le,He,$e),w.setClearColor(_e,Pe),dt!==void 0&&(Q.viewport=dt),w.toneMapping=ot}function Xi(M,W,ae){const Q=W.isScene===!0?W.overrideMaterial:null;for(let K=0,Ie=M.length;K<Ie;K++){const Ve=M[K],{object:Le,geometry:He,group:$e}=Ve;let ot=Ve.material;ot.allowOverride===!0&&Q!==null&&(ot=Q),Le.layers.test(ae.layers)&&Ci(Le,W,ae,He,ot,$e)}}function Ci(M,W,ae,Q,K,Ie){M.onBeforeRender(w,W,ae,Q,K,Ie),M.modelViewMatrix.multiplyMatrices(ae.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),K.onBeforeRender(w,W,ae,Q,M,Ie),K.transparent===!0&&K.side===li&&K.forceSinglePass===!1?(K.side=mn,K.needsUpdate=!0,w.renderBufferDirect(ae,W,Q,K,M,Ie),K.side=wi,K.needsUpdate=!0,w.renderBufferDirect(ae,W,Q,K,M,Ie),K.side=li):w.renderBufferDirect(ae,W,Q,K,M,Ie),M.onAfterRender(w,W,ae,Q,K,Ie)}function Pn(M,W,ae){W.isScene!==!0&&(W=Ze);const Q=g.get(M),K=F.state.lights,Ie=F.state.shadowsArray,Ve=K.state.version,Le=be.getParameters(M,K.state,Ie,W,ae),He=be.getProgramCacheKey(Le);let $e=Q.programs;Q.environment=M.isMeshStandardMaterial||M.isMeshLambertMaterial||M.isMeshPhongMaterial?W.environment:null,Q.fog=W.fog;const ot=M.isMeshStandardMaterial||M.isMeshLambertMaterial&&!M.envMap||M.isMeshPhongMaterial&&!M.envMap;Q.envMap=oe.get(M.envMap||Q.environment,ot),Q.envMapRotation=Q.environment!==null&&M.envMap===null?W.environmentRotation:M.envMapRotation,$e===void 0&&(M.addEventListener("dispose",Tt),$e=new Map,Q.programs=$e);let dt=$e.get(He);if(dt!==void 0){if(Q.currentProgram===dt&&Q.lightsStateVersion===Ve)return Ri(M,Le),dt}else Le.uniforms=be.getUniforms(M),M.onBeforeCompile(Le,w),dt=be.acquireProgram(Le,He),$e.set(He,dt),Q.uniforms=Le.uniforms;const je=Q.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(je.clippingPlanes=$.uniform),Ri(M,Le),Q.needsLights=$r(M),Q.lightsStateVersion=Ve,Q.needsLights&&(je.ambientLightColor.value=K.state.ambient,je.lightProbe.value=K.state.probe,je.directionalLights.value=K.state.directional,je.directionalLightShadows.value=K.state.directionalShadow,je.spotLights.value=K.state.spot,je.spotLightShadows.value=K.state.spotShadow,je.rectAreaLights.value=K.state.rectArea,je.ltc_1.value=K.state.rectAreaLTC1,je.ltc_2.value=K.state.rectAreaLTC2,je.pointLights.value=K.state.point,je.pointLightShadows.value=K.state.pointShadow,je.hemisphereLights.value=K.state.hemi,je.directionalShadowMatrix.value=K.state.directionalShadowMatrix,je.spotLightMatrix.value=K.state.spotLightMatrix,je.spotLightMap.value=K.state.spotLightMap,je.pointShadowMatrix.value=K.state.pointShadowMatrix),Q.currentProgram=dt,Q.uniformsList=null,dt}function Da(M){if(M.uniformsList===null){const W=M.currentProgram.getUniforms();M.uniformsList=Nr.seqWithValue(W.seq,M.uniforms)}return M.uniformsList}function Ri(M,W){const ae=g.get(M);ae.outputColorSpace=W.outputColorSpace,ae.batching=W.batching,ae.batchingColor=W.batchingColor,ae.instancing=W.instancing,ae.instancingColor=W.instancingColor,ae.instancingMorph=W.instancingMorph,ae.skinning=W.skinning,ae.morphTargets=W.morphTargets,ae.morphNormals=W.morphNormals,ae.morphColors=W.morphColors,ae.morphTargetsCount=W.morphTargetsCount,ae.numClippingPlanes=W.numClippingPlanes,ae.numIntersection=W.numClipIntersection,ae.vertexAlphas=W.vertexAlphas,ae.vertexTangents=W.vertexTangents,ae.toneMapping=W.toneMapping}function Ia(M,W,ae,Q,K){W.isScene!==!0&&(W=Ze),z.resetTextureUnits();const Ie=W.fog,Ve=Q.isMeshStandardMaterial||Q.isMeshLambertMaterial||Q.isMeshPhongMaterial?W.environment:null,Le=H===null?w.outputColorSpace:H.isXRRenderTarget===!0?H.texture.colorSpace:Ma,He=Q.isMeshStandardMaterial||Q.isMeshLambertMaterial&&!Q.envMap||Q.isMeshPhongMaterial&&!Q.envMap,$e=oe.get(Q.envMap||Ve,He),ot=Q.vertexColors===!0&&!!ae.attributes.color&&ae.attributes.color.itemSize===4,dt=!!ae.attributes.tangent&&(!!Q.normalMap||Q.anisotropy>0),je=!!ae.morphAttributes.position,Et=!!ae.morphAttributes.normal,Ft=!!ae.morphAttributes.color;let Nt=Zn;Q.toneMapped&&(H===null||H.isXRRenderTarget===!0)&&(Nt=w.toneMapping);const At=ae.morphAttributes.position||ae.morphAttributes.normal||ae.morphAttributes.color,Zt=At!==void 0?At.length:0,We=g.get(Q),ln=F.state.lights;if(we===!0&&(Ge===!0||M!==ee)){const kt=M===ee&&Q.id===q;$.setState(Q,M,kt)}let ut=!1;Q.version===We.__version?(We.needsLights&&We.lightsStateVersion!==ln.state.version||We.outputColorSpace!==Le||K.isBatchedMesh&&We.batching===!1||!K.isBatchedMesh&&We.batching===!0||K.isBatchedMesh&&We.batchingColor===!0&&K.colorTexture===null||K.isBatchedMesh&&We.batchingColor===!1&&K.colorTexture!==null||K.isInstancedMesh&&We.instancing===!1||!K.isInstancedMesh&&We.instancing===!0||K.isSkinnedMesh&&We.skinning===!1||!K.isSkinnedMesh&&We.skinning===!0||K.isInstancedMesh&&We.instancingColor===!0&&K.instanceColor===null||K.isInstancedMesh&&We.instancingColor===!1&&K.instanceColor!==null||K.isInstancedMesh&&We.instancingMorph===!0&&K.morphTexture===null||K.isInstancedMesh&&We.instancingMorph===!1&&K.morphTexture!==null||We.envMap!==$e||Q.fog===!0&&We.fog!==Ie||We.numClippingPlanes!==void 0&&(We.numClippingPlanes!==$.numPlanes||We.numIntersection!==$.numIntersection)||We.vertexAlphas!==ot||We.vertexTangents!==dt||We.morphTargets!==je||We.morphNormals!==Et||We.morphColors!==Ft||We.toneMapping!==Nt||We.morphTargetsCount!==Zt)&&(ut=!0):(ut=!0,We.__version=Q.version);let Ot=We.currentProgram;ut===!0&&(Ot=Pn(Q,W,K));let cn=!1,kn=!1,Vn=!1;const wt=Ot.getUniforms(),Bt=We.uniforms;if(ke.useProgram(Ot.program)&&(cn=!0,kn=!0,Vn=!0),Q.id!==q&&(q=Q.id,kn=!0),cn||ee!==M){ke.buffers.depth.getReversed()&&M.reversedDepth!==!0&&(M._reversedDepth=!0,M.updateProjectionMatrix()),wt.setValue(U,"projectionMatrix",M.projectionMatrix),wt.setValue(U,"viewMatrix",M.matrixWorldInverse);const zn=wt.map.cameraPosition;zn!==void 0&&zn.setValue(U,Xe.setFromMatrixPosition(M.matrixWorld)),st.logarithmicDepthBuffer&&wt.setValue(U,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(Q.isMeshPhongMaterial||Q.isMeshToonMaterial||Q.isMeshLambertMaterial||Q.isMeshBasicMaterial||Q.isMeshStandardMaterial||Q.isShaderMaterial)&&wt.setValue(U,"isOrthographic",M.isOrthographicCamera===!0),ee!==M&&(ee=M,kn=!0,Vn=!0)}if(We.needsLights&&(ln.state.directionalShadowMap.length>0&&wt.setValue(U,"directionalShadowMap",ln.state.directionalShadowMap,z),ln.state.spotShadowMap.length>0&&wt.setValue(U,"spotShadowMap",ln.state.spotShadowMap,z),ln.state.pointShadowMap.length>0&&wt.setValue(U,"pointShadowMap",ln.state.pointShadowMap,z)),K.isSkinnedMesh){wt.setOptional(U,K,"bindMatrix"),wt.setOptional(U,K,"bindMatrixInverse");const kt=K.skeleton;kt&&(kt.boneTexture===null&&kt.computeBoneTexture(),wt.setValue(U,"boneTexture",kt.boneTexture,z))}K.isBatchedMesh&&(wt.setOptional(U,K,"batchingTexture"),wt.setValue(U,"batchingTexture",K._matricesTexture,z),wt.setOptional(U,K,"batchingIdTexture"),wt.setValue(U,"batchingIdTexture",K._indirectTexture,z),wt.setOptional(U,K,"batchingColorTexture"),K._colorsTexture!==null&&wt.setValue(U,"batchingColorTexture",K._colorsTexture,z));const yn=ae.morphAttributes;if((yn.position!==void 0||yn.normal!==void 0||yn.color!==void 0)&&ie.update(K,ae,Ot),(kn||We.receiveShadow!==K.receiveShadow)&&(We.receiveShadow=K.receiveShadow,wt.setValue(U,"receiveShadow",K.receiveShadow)),(Q.isMeshStandardMaterial||Q.isMeshLambertMaterial||Q.isMeshPhongMaterial)&&Q.envMap===null&&W.environment!==null&&(Bt.envMapIntensity.value=W.environmentIntensity),Bt.dfgLUT!==void 0&&(Bt.dfgLUT.value=Mv()),kn&&(wt.setValue(U,"toneMappingExposure",w.toneMappingExposure),We.needsLights&&La(Bt,Vn),Ie&&Q.fog===!0&&N.refreshFogUniforms(Bt,Ie),N.refreshMaterialUniforms(Bt,Q,et,De,F.state.transmissionRenderTarget[M.id]),Nr.upload(U,Da(We),Bt,z)),Q.isShaderMaterial&&Q.uniformsNeedUpdate===!0&&(Nr.upload(U,Da(We),Bt,z),Q.uniformsNeedUpdate=!1),Q.isSpriteMaterial&&wt.setValue(U,"center",K.center),wt.setValue(U,"modelViewMatrix",K.modelViewMatrix),wt.setValue(U,"normalMatrix",K.normalMatrix),wt.setValue(U,"modelMatrix",K.matrixWorld),Q.isShaderMaterial||Q.isRawShaderMaterial){const kt=Q.uniformsGroups;for(let zn=0,Gn=kt.length;zn<Gn;zn++){const Yi=kt[zn];Be.update(Yi,Ot),Be.bind(Yi,Ot)}}return Ot}function La(M,W){M.ambientLightColor.needsUpdate=W,M.lightProbe.needsUpdate=W,M.directionalLights.needsUpdate=W,M.directionalLightShadows.needsUpdate=W,M.pointLights.needsUpdate=W,M.pointLightShadows.needsUpdate=W,M.spotLights.needsUpdate=W,M.spotLightShadows.needsUpdate=W,M.rectAreaLights.needsUpdate=W,M.hemisphereLights.needsUpdate=W}function $r(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return S},this.getActiveMipmapLevel=function(){return O},this.getRenderTarget=function(){return H},this.setRenderTargetTextures=function(M,W,ae){const Q=g.get(M);Q.__autoAllocateDepthBuffer=M.resolveDepthBuffer===!1,Q.__autoAllocateDepthBuffer===!1&&(Q.__useRenderToTexture=!1),g.get(M.texture).__webglTexture=W,g.get(M.depthTexture).__webglTexture=Q.__autoAllocateDepthBuffer?void 0:ae,Q.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(M,W){const ae=g.get(M);ae.__webglFramebuffer=W,ae.__useDefaultFramebuffer=W===void 0};const $i=U.createFramebuffer();this.setRenderTarget=function(M,W=0,ae=0){H=M,S=W,O=ae;let Q=null,K=!1,Ie=!1;if(M){const Le=g.get(M);if(Le.__useDefaultFramebuffer!==void 0){ke.bindFramebuffer(U.FRAMEBUFFER,Le.__webglFramebuffer),J.copy(M.viewport),Y.copy(M.scissor),ve=M.scissorTest,ke.viewport(J),ke.scissor(Y),ke.setScissorTest(ve),q=-1;return}else if(Le.__webglFramebuffer===void 0)z.setupRenderTarget(M);else if(Le.__hasExternalTextures)z.rebindTextures(M,g.get(M.texture).__webglTexture,g.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){const ot=M.depthTexture;if(Le.__boundDepthTexture!==ot){if(ot!==null&&g.has(ot)&&(M.width!==ot.image.width||M.height!==ot.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");z.setupDepthRenderbuffer(M)}}const He=M.texture;(He.isData3DTexture||He.isDataArrayTexture||He.isCompressedArrayTexture)&&(Ie=!0);const $e=g.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray($e[W])?Q=$e[W][ae]:Q=$e[W],K=!0):M.samples>0&&z.useMultisampledRTT(M)===!1?Q=g.get(M).__webglMultisampledFramebuffer:Array.isArray($e)?Q=$e[ae]:Q=$e,J.copy(M.viewport),Y.copy(M.scissor),ve=M.scissorTest}else J.copy(se).multiplyScalar(et).floor(),Y.copy(Ae).multiplyScalar(et).floor(),ve=te;if(ae!==0&&(Q=$i),ke.bindFramebuffer(U.FRAMEBUFFER,Q)&&ke.drawBuffers(M,Q),ke.viewport(J),ke.scissor(Y),ke.setScissorTest(ve),K){const Le=g.get(M.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+W,Le.__webglTexture,ae)}else if(Ie){const Le=W;for(let He=0;He<M.textures.length;He++){const $e=g.get(M.textures[He]);U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0+He,$e.__webglTexture,ae,Le)}}else if(M!==null&&ae!==0){const Le=g.get(M.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Le.__webglTexture,ae)}q=-1},this.readRenderTargetPixels=function(M,W,ae,Q,K,Ie,Ve,Le=0){if(!(M&&M.isWebGLRenderTarget)){bt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let He=g.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&Ve!==void 0&&(He=He[Ve]),He){ke.bindFramebuffer(U.FRAMEBUFFER,He);try{const $e=M.textures[Le],ot=$e.format,dt=$e.type;if(M.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+Le),!st.textureFormatReadable(ot)){bt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!st.textureTypeReadable(dt)){bt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}W>=0&&W<=M.width-Q&&ae>=0&&ae<=M.height-K&&U.readPixels(W,ae,Q,K,ye.convert(ot),ye.convert(dt),Ie)}finally{const $e=H!==null?g.get(H).__webglFramebuffer:null;ke.bindFramebuffer(U.FRAMEBUFFER,$e)}}},this.readRenderTargetPixelsAsync=async function(M,W,ae,Q,K,Ie,Ve,Le=0){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let He=g.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&Ve!==void 0&&(He=He[Ve]),He)if(W>=0&&W<=M.width-Q&&ae>=0&&ae<=M.height-K){ke.bindFramebuffer(U.FRAMEBUFFER,He);const $e=M.textures[Le],ot=$e.format,dt=$e.type;if(M.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+Le),!st.textureFormatReadable(ot))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!st.textureTypeReadable(dt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const je=U.createBuffer();U.bindBuffer(U.PIXEL_PACK_BUFFER,je),U.bufferData(U.PIXEL_PACK_BUFFER,Ie.byteLength,U.STREAM_READ),U.readPixels(W,ae,Q,K,ye.convert(ot),ye.convert(dt),0);const Et=H!==null?g.get(H).__webglFramebuffer:null;ke.bindFramebuffer(U.FRAMEBUFFER,Et);const Ft=U.fenceSync(U.SYNC_GPU_COMMANDS_COMPLETE,0);return U.flush(),await Af(U,Ft,4),U.bindBuffer(U.PIXEL_PACK_BUFFER,je),U.getBufferSubData(U.PIXEL_PACK_BUFFER,0,Ie),U.deleteBuffer(je),U.deleteSync(Ft),Ie}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(M,W=null,ae=0){const Q=Math.pow(2,-ae),K=Math.floor(M.image.width*Q),Ie=Math.floor(M.image.height*Q),Ve=W!==null?W.x:0,Le=W!==null?W.y:0;z.setTexture2D(M,0),U.copyTexSubImage2D(U.TEXTURE_2D,ae,0,0,Ve,Le,K,Ie),ke.unbindTexture()};const qi=U.createFramebuffer(),nr=U.createFramebuffer();this.copyTextureToTexture=function(M,W,ae=null,Q=null,K=0,Ie=0){let Ve,Le,He,$e,ot,dt,je,Et,Ft;const Nt=M.isCompressedTexture?M.mipmaps[Ie]:M.image;if(ae!==null)Ve=ae.max.x-ae.min.x,Le=ae.max.y-ae.min.y,He=ae.isBox3?ae.max.z-ae.min.z:1,$e=ae.min.x,ot=ae.min.y,dt=ae.isBox3?ae.min.z:0;else{const Bt=Math.pow(2,-K);Ve=Math.floor(Nt.width*Bt),Le=Math.floor(Nt.height*Bt),M.isDataArrayTexture?He=Nt.depth:M.isData3DTexture?He=Math.floor(Nt.depth*Bt):He=1,$e=0,ot=0,dt=0}Q!==null?(je=Q.x,Et=Q.y,Ft=Q.z):(je=0,Et=0,Ft=0);const At=ye.convert(W.format),Zt=ye.convert(W.type);let We;W.isData3DTexture?(z.setTexture3D(W,0),We=U.TEXTURE_3D):W.isDataArrayTexture||W.isCompressedArrayTexture?(z.setTexture2DArray(W,0),We=U.TEXTURE_2D_ARRAY):(z.setTexture2D(W,0),We=U.TEXTURE_2D),U.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,W.flipY),U.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,W.premultiplyAlpha),U.pixelStorei(U.UNPACK_ALIGNMENT,W.unpackAlignment);const ln=U.getParameter(U.UNPACK_ROW_LENGTH),ut=U.getParameter(U.UNPACK_IMAGE_HEIGHT),Ot=U.getParameter(U.UNPACK_SKIP_PIXELS),cn=U.getParameter(U.UNPACK_SKIP_ROWS),kn=U.getParameter(U.UNPACK_SKIP_IMAGES);U.pixelStorei(U.UNPACK_ROW_LENGTH,Nt.width),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,Nt.height),U.pixelStorei(U.UNPACK_SKIP_PIXELS,$e),U.pixelStorei(U.UNPACK_SKIP_ROWS,ot),U.pixelStorei(U.UNPACK_SKIP_IMAGES,dt);const Vn=M.isDataArrayTexture||M.isData3DTexture,wt=W.isDataArrayTexture||W.isData3DTexture;if(M.isDepthTexture){const Bt=g.get(M),yn=g.get(W),kt=g.get(Bt.__renderTarget),zn=g.get(yn.__renderTarget);ke.bindFramebuffer(U.READ_FRAMEBUFFER,kt.__webglFramebuffer),ke.bindFramebuffer(U.DRAW_FRAMEBUFFER,zn.__webglFramebuffer);for(let Gn=0;Gn<He;Gn++)Vn&&(U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,g.get(M).__webglTexture,K,dt+Gn),U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,g.get(W).__webglTexture,Ie,Ft+Gn)),U.blitFramebuffer($e,ot,Ve,Le,je,Et,Ve,Le,U.DEPTH_BUFFER_BIT,U.NEAREST);ke.bindFramebuffer(U.READ_FRAMEBUFFER,null),ke.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else if(K!==0||M.isRenderTargetTexture||g.has(M)){const Bt=g.get(M),yn=g.get(W);ke.bindFramebuffer(U.READ_FRAMEBUFFER,qi),ke.bindFramebuffer(U.DRAW_FRAMEBUFFER,nr);for(let kt=0;kt<He;kt++)Vn?U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Bt.__webglTexture,K,dt+kt):U.framebufferTexture2D(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Bt.__webglTexture,K),wt?U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,yn.__webglTexture,Ie,Ft+kt):U.framebufferTexture2D(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,yn.__webglTexture,Ie),K!==0?U.blitFramebuffer($e,ot,Ve,Le,je,Et,Ve,Le,U.COLOR_BUFFER_BIT,U.NEAREST):wt?U.copyTexSubImage3D(We,Ie,je,Et,Ft+kt,$e,ot,Ve,Le):U.copyTexSubImage2D(We,Ie,je,Et,$e,ot,Ve,Le);ke.bindFramebuffer(U.READ_FRAMEBUFFER,null),ke.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else wt?M.isDataTexture||M.isData3DTexture?U.texSubImage3D(We,Ie,je,Et,Ft,Ve,Le,He,At,Zt,Nt.data):W.isCompressedArrayTexture?U.compressedTexSubImage3D(We,Ie,je,Et,Ft,Ve,Le,He,At,Nt.data):U.texSubImage3D(We,Ie,je,Et,Ft,Ve,Le,He,At,Zt,Nt):M.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,Ie,je,Et,Ve,Le,At,Zt,Nt.data):M.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,Ie,je,Et,Nt.width,Nt.height,At,Nt.data):U.texSubImage2D(U.TEXTURE_2D,Ie,je,Et,Ve,Le,At,Zt,Nt);U.pixelStorei(U.UNPACK_ROW_LENGTH,ln),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,ut),U.pixelStorei(U.UNPACK_SKIP_PIXELS,Ot),U.pixelStorei(U.UNPACK_SKIP_ROWS,cn),U.pixelStorei(U.UNPACK_SKIP_IMAGES,kn),Ie===0&&W.generateMipmaps&&U.generateMipmap(We),ke.unbindTexture()},this.initRenderTarget=function(M){g.get(M).__webglFramebuffer===void 0&&z.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?z.setTextureCube(M,0):M.isData3DTexture?z.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?z.setTexture2DArray(M,0):z.setTexture2D(M,0),ke.unbindTexture()},this.resetState=function(){S=0,O=0,H=null,ke.reset(),ge.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Kn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=yt._getDrawingBufferColorSpace(e),t.unpackColorSpace=yt._getUnpackColorSpace()}}const yv={class:"pv-wrap"},Ev={class:"pv-main"},bv={class:"pv-side"},Tv={class:"pv-side-header"},Av={class:"pv-side-count"},wv={key:0,class:"pv-side-empty"},Cv={key:1,class:"pv-side-list"},Rv=["src"],Pv={class:"pv-side-idx"},Dv={class:"pv-toolbar"},Iv={class:"pv-info"},fa=640,Cr=16,Lv="#ffffff",Uv=kr({__name:"PanoramaViewer",props:{modelValue:{type:Boolean},elementId:{},elementName:{},panoramaUrl:{},hasExistingGrid:{type:Boolean}},emits:["update:modelValue","screenshot-saved"],setup(i,{emit:e}){const t=i,n=e,a=It({get:()=>t.modelValue,set:te=>n("update:modelValue",te)}),r=It(()=>`VR 360° 查看 — ${t.elementName||"未命名场景"}`),s=Te(),o=Te(!1),c=Te("loading"),l=Te(""),d=Te([]);let h=null,u=null,m=null,v=0,A=null,p=0,f=0,y=!1,C=0,E=0;const F=Te(75),D=Te(0),k=Te(0);function x(){u&&(F.value=Math.round(u.fov),D.value=Math.round(p),k.value=Math.round(f))}function w(){if(!s.value)return;if(!t.panoramaUrl){c.value="error",l.value="全景图 URL 为空,父组件没传 panoramaUrl(可能 joinBackendUrl 失败 / vrViewerUrl 没塞)";return}const te=s.value,Se=te.clientWidth||1280,we=te.clientHeight||720;h=new ih,u=new Tn(75,Se/we,.1,1100),u.position.set(0,0,.01),m=new Sv({antialias:!0,preserveDrawingBuffer:!0}),m.setSize(Se,we),m.setPixelRatio(window.devicePixelRatio),te.appendChild(m.domElement);const Ge=new ll(500,64,32);Ge.scale(-1,1,1),c.value="loading",l.value="";const ct=new Th;ct.setCrossOrigin("anonymous"),ct.load(t.panoramaUrl,Je=>{Je.colorSpace=xn;const Ze=new ol({map:Je}),tt=new ei(Ge,Ze);h&&h.add(tt),c.value="success",console.log("[PanoramaViewer] 全景贴图加载成功:",t.panoramaUrl)},Je=>{console.log("[PanoramaViewer] 加载进度:",Je.loaded,"/",Je.total)},Je=>{console.error("[PanoramaViewer] 全景贴图加载失败:",t.panoramaUrl,Je),c.value="error",l.value=`URL=${t.panoramaUrl}  错误=${(Je==null?void 0:Je.message)||Je}`,Z.error("全景图加载失败,请检查图片是否可访问")});const Xe=m.domElement;Xe.style.cursor="grab",Xe.addEventListener("pointerdown",L),Xe.addEventListener("pointermove",S),Xe.addEventListener("pointerup",O),Xe.addEventListener("pointerleave",O),Xe.addEventListener("wheel",q,{passive:!1}),A=new ResizeObserver(()=>ee()),A.observe(te),J()}function L(te){if(y=!0,C=te.clientX,E=te.clientY,m){m.domElement.style.cursor="grabbing";try{m.domElement.setPointerCapture(te.pointerId)}catch{}}}function S(te){if(!y)return;const Se=te.clientX-C,we=te.clientY-E;C=te.clientX,E=te.clientY;const Ge=((u==null?void 0:u.fov)||75)/200;p-=Se*Ge,f+=we*Ge,f>89&&(f=89),f<-89&&(f=-89),p>180&&(p-=360),p<-180&&(p+=360)}function O(te){if(y=!1,m){m.domElement.style.cursor="grab";try{(te==null?void 0:te.pointerId)!==void 0&&m.domElement.releasePointerCapture(te.pointerId)}catch{}}}function H(){if(!u)return;const te=Ul.degToRad(90-f),Se=Ul.degToRad(p),we=new ne(500*Math.sin(te)*Math.cos(Se),500*Math.cos(te),500*Math.sin(te)*Math.sin(Se));u.lookAt(we)}function q(te){if(!u)return;te.preventDefault(),te.stopPropagation();const Se=te.deltaY>0?3:-3;u.fov=Math.max(20,Math.min(130,u.fov+Se)),u.updateProjectionMatrix()}function ee(){if(!u||!m||!s.value)return;const te=s.value.clientWidth,Se=s.value.clientHeight;u.aspect=te/Se,u.updateProjectionMatrix(),m.setSize(te,Se)}function J(){!m||!h||!u||(v=requestAnimationFrame(J),H(),x(),m.render(h,u))}function Y(){u&&(u.fov=75,u.updateProjectionMatrix(),p=0,f=0)}function ve(te){if(u){switch(te){case"top":f=-75,u.fov=85;break;case"front":f=0,u.fov=75;break;case"bottom":f=75,u.fov=85;break}u.updateProjectionMatrix()}}function _e(te){return te<=1?{cols:1,rows:1}:te<=4?{cols:2,rows:Math.ceil(te/2)}:{cols:3,rows:Math.ceil(te/3)}}function Pe(te){return new Promise((Se,we)=>{const{cols:Ge,rows:ct}=_e(te.length),Xe=document.createElement("canvas");Xe.width=fa*Ge+Cr*Math.max(0,Ge-1),Xe.height=fa*ct+Cr*Math.max(0,ct-1);const Je=Xe.getContext("2d");if(!Je)return we(new Error("canvas 2d context 不可用"));Je.fillStyle=Lv,Je.fillRect(0,0,Xe.width,Xe.height);let Ze=0,tt=!1;te.forEach((ht,U)=>{const _t=new Image;_t.onload=()=>{if(tt)return;const gt=Math.floor(U/Ge),ke=U%Ge*(fa+Cr),b=gt*(fa+Cr),g=_t.naturalWidth,z=_t.naturalHeight,oe=Math.min(g,z),pe=(g-oe)/2,re=(z-oe)/2;Je.drawImage(_t,pe,re,oe,oe,ke,b,fa,fa),Ze++,Ze===te.length&&Se(Xe.toDataURL("image/png"))},_t.onerror=()=>{tt=!0,we(new Error(`第 ${U+1} 张截图加载失败`))},_t.src=ht})})}const ue=Te(!1);async function De(){var te,Se;if(!m||!t.elementId){Z.warning("视图未就绪");return}if(d.value.length===0&&t.hasExistingGrid&&!ue.value)try{await Fn.confirm(`该场景已有宫格图。继续截图会**重新生成宫格图**(覆盖现有那张)。
若要保留旧宫格图,请先取消,然后导出/备份旧图后再来。`,"覆盖宫格图确认",{type:"warning",confirmButtonText:"覆盖,继续截图",cancelButtonText:"取消"}),ue.value=!0}catch{return}o.value=!0;try{let we="";if(h&&u&&m){const Ze=((te=s.value)==null?void 0:te.clientWidth)||1280,tt=((Se=s.value)==null?void 0:Se.clientHeight)||720,ht=u.aspect;try{m.setSize(1280,1280,!1),u.aspect=1,u.updateProjectionMatrix(),m.render(h,u),we=m.domElement.toDataURL("image/png")}finally{m.setSize(Ze,tt,!1),u.aspect=ht,u.updateProjectionMatrix(),m.render(h,u)}}const Ge=we||m.domElement.toDataURL("image/png"),ct=[...d.value,Ge],Xe=await Pe(ct),Je=await qu(t.elementId,Xe);if(Je.success&&Je.grid_image)d.value=ct,Z.success(`截图已加入宫格(共 ${d.value.length} 张)`),n("screenshot-saved",t.elementId,Je.grid_image);else throw new Error(Je.message||"保存失败")}catch(we){Z.error(`截图保存失败: ${(we==null?void 0:we.message)||we}`)}finally{o.value=!1}}function et(){if(se&&(clearTimeout(se),se=null),v&&(cancelAnimationFrame(v),v=0),A&&(A.disconnect(),A=null),m){const te=m.domElement;te.removeEventListener("pointerdown",L),te.removeEventListener("pointermove",S),te.removeEventListener("pointerup",O),te.removeEventListener("pointerleave",O),te.removeEventListener("wheel",q),m.dispose(),te.parentNode&&te.parentNode.removeChild(te),m=null}y=!1,h&&(h.traverse(te=>{if(te.geometry&&te.geometry.dispose(),te.material){const Se=te.material;Se.map&&Se.map.dispose(),Se.dispose()}}),h=null),u=null}function nt(){et(),d.value=[],ue.value=!1}let xt=!1,se=null;function Ae(){!a.value||!t.panoramaUrl||xt||(xt=!0,se&&clearTimeout(se),se=setTimeout(()=>{se=null,w()},350))}return ci(a,te=>{te?(xt=!1,Ae()):(xt=!1,se&&(clearTimeout(se),se=null))}),ci(()=>t.panoramaUrl,()=>{Ae()}),bc(()=>et()),(te,Se)=>{const we=mt("el-button"),Ge=mt("el-dialog");return G(),Me(Ge,{modelValue:a.value,"onUpdate:modelValue":Se[4]||(Se[4]=ct=>a.value=ct),title:r.value,width:"90%",top:"3vh","destroy-on-close":"","close-on-click-modal":!1,onClosed:nt},{default:P(()=>[de("div",yv,[Se[13]||(Se[13]=de("div",{class:"pv-tip"}," 鼠标拖拽旋转视角,滚轮缩放(FOV 20°-130°) · 对准想要的角度后点「📷 截图保存」 → 自动累加到该场景的宫格图 ",-1)),c.value!=="success"?(G(),Ee("div",{key:0,class:Ei(["pv-status",{"is-error":c.value==="error"}])},Ke(c.value==="loading"?`加载中: ${i.panoramaUrl}`:`加载失败: ${l.value}`),3)):Fe("",!0),de("div",Ev,[de("div",{ref_key:"containerRef",ref:s,class:"pv-canvas"},null,512),de("div",bv,[de("div",Tv,[Se[5]||(Se[5]=he(" 本次截图 ",-1)),de("span",Av,"("+Ke(d.value.length)+")",1)]),d.value.length===0?(G(),Ee("div",wv,[...Se[6]||(Se[6]=[he(" 旋转到想要的角度后",-1),de("br",null,null,-1),he("点「截图保存」",-1),de("br",null,null,-1),he("缩略图会出现在这里 ",-1)])])):(G(),Ee("div",Cv,[(G(!0),Ee(zt,null,Gt(d.value,(ct,Xe)=>(G(),Ee("div",{key:Xe,class:"pv-side-item"},[de("img",{src:ct,class:"pv-side-thumb"},null,8,Rv),de("div",Pv,"#"+Ke(Xe+1),1)]))),128))]))])]),de("div",Dv,[de("span",Iv,"FOV: "+Ke(F.value)+"° · Yaw: "+Ke(D.value)+"° · Pitch: "+Ke(k.value)+"°",1),R(we,{size:"small",onClick:Se[0]||(Se[0]=ct=>ve("top"))},{default:P(()=>[...Se[7]||(Se[7]=[he("俯视",-1)])]),_:1}),R(we,{size:"small",onClick:Se[1]||(Se[1]=ct=>ve("front"))},{default:P(()=>[...Se[8]||(Se[8]=[he("平视",-1)])]),_:1}),R(we,{size:"small",onClick:Se[2]||(Se[2]=ct=>ve("bottom"))},{default:P(()=>[...Se[9]||(Se[9]=[he("仰视",-1)])]),_:1}),R(we,{size:"small",onClick:Y},{default:P(()=>[...Se[10]||(Se[10]=[he("复位",-1)])]),_:1}),R(we,{type:"primary",loading:o.value,onClick:De},{default:P(()=>[...Se[11]||(Se[11]=[he(" 📷 截图保存到宫格 ",-1)])]),_:1},8,["loading"]),R(we,{onClick:Se[3]||(Se[3]=ct=>a.value=!1)},{default:P(()=>[...Se[12]||(Se[12]=[he("关闭",-1)])]),_:1})])])]),_:1},8,["modelValue","title"])}}}),Nv=Vr(Uv,[["__scopeId","data-v-d7d19b9e"]]),Fv={class:"cvd-wrap"},Ov={class:"cvd-toolbar"},Bv={key:0,class:"cvd-loading"},kv={key:1,class:"cvd-empty"},Vv={key:2,class:"cvd-list"},zv={class:"cvd-item-head"},Gv={class:"cvd-assets"},Hv={class:"cvd-asset"},Wv={class:"cvd-asset-box"},Xv={key:1,class:"cvd-asset-empty"},$v={class:"cvd-asset-actions"},qv={class:"cvd-asset"},Yv={class:"cvd-asset-box"},Kv={key:1,class:"cvd-asset-empty"},Zv={class:"cvd-asset-actions"},jv={class:"cvd-asset"},Jv={class:"cvd-asset-box cvd-gen-box"},Qv={key:1,class:"cvd-asset-empty"},e0={key:2,class:"cvd-loading-overlay"},t0={class:"cvd-asset-actions"},n0={class:"cvd-asset cvd-asset-audio"},i0={class:"cvd-asset-box cvd-audio"},a0=["src"],r0={key:1,class:"cvd-asset-empty"},s0={class:"cvd-asset-actions"},o0={class:"cvd-volc"},l0={key:4,class:"cvd-volc-hint"},c0={key:5,class:"cvd-volc-id"},u0=kr({__name:"CharacterVariantsDialog",props:{modelValue:{type:Boolean},element:{},selectedImageConfigId:{}},emits:["update:modelValue","changed"],setup(i,{emit:e}){const t=i,n=e,a=It({get:()=>t.modelValue,set:L=>n("update:modelValue",L)}),r=Te([]),s=Te(!1),o=Te("");function c(L,S=Date.now()){return L&&(L.includes("?")?`${L}&t=${S}`:`${L}?t=${S}`)}async function l(){if(t.element){s.value=!0;try{r.value=await Xo(t.element.id)}catch(L){Z.error(`加载马甲失败: ${(L==null?void 0:L.message)||L}`),r.value=[]}finally{s.value=!1}}}ci(()=>t.modelValue,L=>{L&&t.element&&(l(),o.value="")});async function d(){if(!(!t.element||!o.value.trim()))try{const L=await Pc(t.element.id,{variant_name:o.value.trim()});r.value.push(L),o.value="",Z.success("新建马甲成功"),n("changed",t.element)}catch(L){Z.error(`新建失败: ${(L==null?void 0:L.message)||L}`)}}async function h(L){try{await ml(L.id,{variant_name:L.variant_name}),n("changed",t.element)}catch(S){Z.error(`改名失败: ${(S==null?void 0:S.message)||S}`)}}async function u(L){try{await ml(L.id,{description:L.description})}catch(S){Z.error(`保存描述失败: ${(S==null?void 0:S.message)||S}`)}}async function m(L){if(t.element)try{await Tc(t.element.id,L.id),t.element.active_variant_id=L.id,t.element.active_variant_name=L.variant_name,Z.success(`已切到「${L.variant_name}」 — 之后视频生成都用此形象`),n("changed",t.element)}catch(S){Z.error(`设为默认失败: ${(S==null?void 0:S.message)||S}`)}}async function v(L){try{await Yu(L.id),r.value=r.value.filter(S=>S.id!==L.id),t.element&&t.element.active_variant_id===L.id&&(t.element.active_variant_id=null,t.element.active_variant_name=null),Z.success("马甲已删除"),n("changed",t.element)}catch(S){Z.error(`删除失败: ${(S==null?void 0:S.message)||S}`)}}async function A(L,S,O){const H=(O==null?void 0:O.raw)||O;if(H)try{if(S==="finished"){const q=await Yo(L.id,H);L.finished_image=c(q.finished_image)}else if(S==="reference"){const q=await $o(L.id,H);L.reference_image=c(q.reference_image)}else{const q=await qo(L.id,H);L.audio_file=q.audio_file}Z.success("上传成功"),n("changed",t.element)}catch(q){Z.error(`上传失败: ${(q==null?void 0:q.message)||q}`)}}async function p(L,S){try{S==="finished"?(await wc(L.id),L.finished_image=null):S==="reference"?(await Rc(L.id),L.reference_image=null):(await Cc(L.id),L.audio_file=null),n("changed",t.element)}catch(O){Z.error(`删除失败: ${(O==null?void 0:O.message)||O}`)}}async function f(L){if(!t.selectedImageConfigId){Z.warning('请先在顶部选择"图片模型配置"');return}L.image_status="generating";try{const S=await Ac(L.id,t.selectedImageConfigId);if(S.success)L.image_url=c(S.image_url),L.image_status="success",Z.success("马甲图生成成功"),n("changed",t.element);else throw L.image_status="error",new Error(S.message||"生成失败")}catch(S){L.image_status="error",Z.error(`生成失败: ${(S==null?void 0:S.message)||S}`)}}const y=Iu({}),C=new Map;async function E(){try{const L=await Js();if(!L.has_credentials)return null;const S=await Ic(L.sk_encrypted);return S?{ak:L.ak,sk:S,project:L.project_name||"default"}:null}catch(L){return console.error("[variant-volc] 拿凭证失败",L),null}}async function F(L){var S,O;if(!y[L.id]){if(!L.finished_image){Z.warning("该马甲还没有成品图,无法加白");return}y[L.id]=!0;try{const H=await E();if(!H){Z.warning("请先到「设置 → 通用设置 → 火山方舟素材库」配置 AK/SK");return}const q=await pd({variant_id:L.id,ak:H.ak,sk:H.sk,project_name:H.project});q.success?(L.volc_asset_id=q.asset_id,L.volc_asset_uri=q.asset_uri,L.volc_asset_status=q.status,Z.success(q.message||"已提交,审核中…"),D(L),n("changed",t.element)):Z.error("加白失败")}catch(H){Z.error("加白失败: "+(((O=(S=H==null?void 0:H.response)==null?void 0:S.data)==null?void 0:O.detail)||(H==null?void 0:H.message)||H))}finally{y[L.id]=!1}}}function D(L){k(L.id);const S=window.setInterval(async()=>{if(L.volc_asset_status!=="Processing"){k(L.id);return}try{const O=await E();if(!O){k(L.id);return}const H=await md({variant_id:L.id,ak:O.ak,sk:O.sk,project_name:O.project});H.status&&H.status!=="Processing"&&(L.volc_asset_status=H.status,H.status==="Active"?Z.success(`马甲「${L.variant_name}」已加白入库 ✅`):H.status==="Failed"&&Z.error(`马甲「${L.variant_name}」加白审核失败`),k(L.id),n("changed",t.element))}catch{}},3e3);C.set(L.id,S)}function k(L){const S=C.get(L);S&&(clearInterval(S),C.delete(L))}function x(){C.forEach(L=>clearInterval(L)),C.clear()}ci(r,L=>{for(const S of L)S.volc_asset_status==="Processing"&&!C.has(S.id)&&D(S)}),bc(()=>{x()});function w(){x(),r.value=[],o.value=""}return(L,S)=>{var Pe;const O=mt("el-input"),H=mt("el-button"),q=mt("el-icon"),ee=mt("el-tag"),J=mt("el-popconfirm"),Y=mt("el-image"),ve=mt("el-upload"),_e=mt("el-dialog");return G(),Me(_e,{modelValue:a.value,"onUpdate:modelValue":S[2]||(S[2]=ue=>a.value=ue),title:`马甲管理 — ${((Pe=i.element)==null?void 0:Pe.name)||""}`,width:"900px","destroy-on-close":"",onClosed:w},{footer:P(()=>[R(H,{onClick:S[1]||(S[1]=ue=>a.value=!1)},{default:P(()=>[...S[25]||(S[25]=[he("关闭",-1)])]),_:1})]),default:P(()=>[de("div",Fv,[de("div",Ov,[R(O,{modelValue:o.value,"onUpdate:modelValue":S[0]||(S[0]=ue=>o.value=ue),placeholder:"新马甲名称(青年/战甲/受伤...)",size:"small",class:"cvd-input"},null,8,["modelValue"]),R(H,{type:"primary",size:"small",disabled:!o.value.trim(),onClick:d},{default:P(()=>[...S[3]||(S[3]=[he("+ 新建马甲",-1)])]),_:1},8,["disabled"]),S[4]||(S[4]=de("span",{class:"cvd-hint"},'提示:切换"当前默认马甲"后,后续视频生成都用该形象。重跑旧分镜也会用新马甲。',-1))]),s.value?(G(),Ee("div",Bv,[R(q,{class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1}),S[5]||(S[5]=he(" 加载中... ",-1))])):r.value.length===0?(G(),Ee("div",kv," 还没有马甲。点上面 [+ 新建马甲] 来添加该角色的不同形象(青年/战甲/受伤...)。 ")):(G(),Ee("div",Vv,[(G(!0),Ee(zt,null,Gt(r.value,ue=>{var De,et;return G(),Ee("div",{key:ue.id,class:Ei(["cvd-item",{"is-active":ue.id===((De=i.element)==null?void 0:De.active_variant_id)}])},[de("div",zv,[R(O,{modelValue:ue.variant_name,"onUpdate:modelValue":nt=>ue.variant_name=nt,size:"small",class:"cvd-name-input",onChange:nt=>h(ue)},null,8,["modelValue","onUpdate:modelValue","onChange"]),ue.id===((et=i.element)==null?void 0:et.active_variant_id)?(G(),Me(ee,{key:0,type:"success",size:"small"},{default:P(()=>[...S[6]||(S[6]=[he("当前默认",-1)])]),_:1})):(G(),Me(H,{key:1,size:"small",onClick:nt=>m(ue)},{default:P(()=>[...S[7]||(S[7]=[he("设为默认",-1)])]),_:1},8,["onClick"])),R(J,{title:"确定删除该马甲?",onConfirm:nt=>v(ue)},{reference:P(()=>[R(H,{size:"small",type:"danger",plain:""},{default:P(()=>[...S[8]||(S[8]=[he("删除",-1)])]),_:1})]),_:1},8,["onConfirm"])]),R(O,{modelValue:ue.description,"onUpdate:modelValue":nt=>ue.description=nt,type:"textarea",rows:2,size:"small",placeholder:"该形象的描述(战甲、墨黑色锁甲、肩甲带云纹...) — 留空时 fallback 本体描述",onChange:nt=>u(ue),class:"cvd-desc-input"},null,8,["modelValue","onUpdate:modelValue","onChange"]),de("div",Gv,[de("div",Hv,[S[11]||(S[11]=de("div",{class:"cvd-asset-label"},"成品图",-1)),de("div",Wv,[ue.finished_image?(G(),Me(Y,{key:0,src:Re(pn)(ue.finished_image),fit:"cover","preview-src-list":[Re(pn)(ue.finished_image)],"preview-teleported":""},null,8,["src","preview-src-list"])):(G(),Ee("div",Xv,"无"))]),de("div",$v,[R(ve,{"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:nt=>A(ue,"finished",nt)},{default:P(()=>[R(H,{size:"small",link:""},{default:P(()=>[...S[9]||(S[9]=[he("上传",-1)])]),_:1})]),_:1},8,["onChange"]),ue.finished_image?(G(),Me(H,{key:0,size:"small",link:"",type:"danger",onClick:nt=>p(ue,"finished")},{default:P(()=>[...S[10]||(S[10]=[he("删",-1)])]),_:1},8,["onClick"])):Fe("",!0)])]),de("div",qv,[S[14]||(S[14]=de("div",{class:"cvd-asset-label"},"参考图",-1)),de("div",Yv,[ue.reference_image?(G(),Me(Y,{key:0,src:Re(pn)(ue.reference_image),fit:"cover","preview-src-list":[Re(pn)(ue.reference_image)],"preview-teleported":""},null,8,["src","preview-src-list"])):(G(),Ee("div",Kv,"无"))]),de("div",Zv,[R(ve,{"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:nt=>A(ue,"reference",nt)},{default:P(()=>[R(H,{size:"small",link:""},{default:P(()=>[...S[12]||(S[12]=[he("上传",-1)])]),_:1})]),_:1},8,["onChange"]),ue.reference_image?(G(),Me(H,{key:0,size:"small",link:"",type:"danger",onClick:nt=>p(ue,"reference")},{default:P(()=>[...S[13]||(S[13]=[he("删",-1)])]),_:1},8,["onClick"])):Fe("",!0)])]),de("div",jv,[S[16]||(S[16]=de("div",{class:"cvd-asset-label"},"AI 生图",-1)),de("div",Jv,[ue.image_url?(G(),Me(Y,{key:0,src:Re(pn)(ue.image_url),fit:"cover","preview-src-list":[Re(pn)(ue.image_url)],"preview-teleported":""},null,8,["src","preview-src-list"])):(G(),Ee("div",Qv,"未生成")),ue.image_status==="generating"?(G(),Ee("div",e0,[R(q,{class:"is-loading"},{default:P(()=>[R(Re(hn))]),_:1}),S[15]||(S[15]=de("span",{class:"cvd-loading-text"},"生成中",-1))])):Fe("",!0)]),de("div",t0,[R(H,{size:"small",link:"",loading:ue.image_status==="generating",disabled:ue.image_status==="generating"||!i.selectedImageConfigId,onClick:nt=>f(ue)},{default:P(()=>[he(Ke(ue.image_status==="generating"?"生成中":ue.image_url?"重生":"生图"),1)]),_:2},1032,["loading","disabled","onClick"])])]),de("div",n0,[S[19]||(S[19]=de("div",{class:"cvd-asset-label"},"音频",-1)),de("div",i0,[ue.audio_file?(G(),Ee("audio",{key:0,src:Re(pn)(ue.audio_file),controls:"",preload:"none",class:"cvd-audio-player"},null,8,a0)):(G(),Ee("div",r0,"无"))]),de("div",s0,[R(ve,{"show-file-list":!1,"auto-upload":!1,accept:"audio/*",onChange:nt=>A(ue,"audio",nt)},{default:P(()=>[R(H,{size:"small",link:""},{default:P(()=>[...S[17]||(S[17]=[he("上传",-1)])]),_:1})]),_:1},8,["onChange"]),ue.audio_file?(G(),Me(H,{key:0,size:"small",link:"",type:"danger",onClick:nt=>p(ue,"audio")},{default:P(()=>[...S[18]||(S[18]=[he("删",-1)])]),_:1},8,["onClick"])):Fe("",!0)])])]),de("div",o0,[S[24]||(S[24]=de("span",{class:"cvd-volc-label"},"火山方舟素材库:",-1)),ue.volc_asset_status==="Active"?(G(),Me(ee,{key:0,type:"success",size:"small"},{default:P(()=>[...S[20]||(S[20]=[he("已加白 ✅",-1)])]),_:1})):ue.volc_asset_status==="Processing"?(G(),Me(ee,{key:1,type:"warning",size:"small"},{default:P(()=>[...S[21]||(S[21]=[he("审核中…",-1)])]),_:1})):ue.volc_asset_status==="Failed"?(G(),Me(ee,{key:2,type:"danger",size:"small"},{default:P(()=>[...S[22]||(S[22]=[he("审核失败",-1)])]),_:1})):(G(),Me(ee,{key:3,type:"info",size:"small"},{default:P(()=>[...S[23]||(S[23]=[he("未加白",-1)])]),_:1})),R(H,{size:"small",type:"primary",plain:"",disabled:!ue.finished_image||ue.volc_asset_status==="Active"||y[ue.id],onClick:nt=>F(ue)},{default:P(()=>[he(Ke(ue.volc_asset_status==="Processing"?"已提交,等待中…":ue.volc_asset_status==="Active"?"已加白":"加白入库"),1)]),_:2},1032,["disabled","onClick"]),ue.finished_image?Fe("",!0):(G(),Ee("span",l0,"需先有成品图")),ue.volc_asset_id?(G(),Ee("span",c0,"asset_id: "+Ke(ue.volc_asset_id),1)):Fe("",!0)])],2)}),128))]))])]),_:1},8,["modelValue","title"])}}}),d0=Vr(u0,[["__scopeId","data-v-3d932e62"]]),f0={class:"page-container"},h0={class:"card-header"},p0={class:"header-left"},m0={class:"header-model"},g0={class:"header-right"},_0={key:0,class:"progress-section team-asset-sync-progress"},v0={class:"team-asset-sync-row"},x0={class:"progress-text"},M0={key:1,class:"progress-section"},S0={class:"progress-text"},y0={key:2,class:"progress-section"},E0={class:"progress-text"},b0={class:"tab-header"},T0={class:"tab-header-left"},A0={class:"tab-title"},w0={class:"tab-actions"},C0={class:"element-grid"},R0={class:"element-header-section"},P0={class:"element-header"},D0={class:"element-name"},I0={class:"element-actions"},L0={class:"element-description"},U0={key:0,class:"element-aliases"},N0={class:"tab-header"},F0={class:"tab-header-left"},O0={class:"tab-title"},B0={class:"tab-actions"},k0={class:"element-grid"},V0={class:"element-header-section"},z0={class:"element-header"},G0={class:"element-name"},H0={class:"element-actions"},W0={class:"element-description"},X0={key:0,class:"element-aliases"},$0={class:"tab-header"},q0={class:"tab-header-left"},Y0={class:"tab-title"},K0={class:"tab-actions"},Z0={class:"element-grid"},j0={class:"element-header-section"},J0={class:"element-header"},Q0={class:"element-name"},ex={class:"element-actions"},tx={class:"element-description"},nx={key:0,class:"element-aliases"},ix={style:{"margin-bottom":"10px",display:"flex","align-items":"center",gap:"8px","flex-wrap":"wrap"}},ax={key:0,style:{color:"#e6a23c","font-size":"12px"}},rx={style:{color:"#909399","font-size":"12px","margin-bottom":"8px","line-height":"1.6"}},sx={key:0,class:"push-progress-panel"},ox={class:"push-progress-head"},lx={class:"push-progress-meta"},cx={key:0},ux={key:1,style:{color:"#c0c4cc"}},dx={key:0,class:"form-tip"},fx={key:0,class:"form-tip"},hx={style:{display:"flex","flex-wrap":"wrap",gap:"4px","margin-bottom":"8px"}},px={style:{display:"flex",gap:"8px"}},mx={class:"style-dialog-content"},gx={class:"style-dialog-tip"},_x={class:"visual-style-tags"},vx={class:"style-hint"},xx={key:0,class:"grid-dialog-content"},Mx={class:"grid-preview-section"},Sx={class:"grid-preview-image"},yx={class:"grid-image-wrapper"},Ex={key:0,class:"form-tip"},bx={key:0,class:"form-tip"},Tx={class:"grid-dialog-tip"},Ax={style:{"margin-bottom":"16px"}},wx={key:0},Cx={key:1},Rx={key:2},Px={key:3,style:{color:"#909399"}},Dx=2700*1e3,Rr=`【真实质感 · 降噪(反 AI 塑料感)】
This image is a film still captured during a real shoot - it should appear slightly soft and imperfect like a real photograph, this softness is intentional and desired. Soft natural lighting with realistic falloff, not punchy HDR. Subtle organic film grain only, NOT heavy digital noise, NOT artificial grain overlay. Skin texture must be natural with visible pores and imperfections, NO plastic smoothing, NO beauty-filter aesthetic. Materials should look photographically captured, not 3D-rendered or AI-stylized. Slightly soft focus character with natural lens DOF, NOT digitally tack-sharp. Colors with realistic restraint, slight gray tone, NOT oversaturated, NOT HDR-pumped.
Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, beauty-filter skin, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default model aesthetic bias.`,yc="extraction_view_state_v1",Ix=kr({__name:"ExtractionView",setup(i){const e=Te([]),t=Te(null),n=Te([]),a=Te(!1),r=Te(!1),s=Te(0),o=Te(""),c=Te(""),l=Te("character"),d=Te([]),h=Te([]),u=Te([]),m=Te(""),v=Te(""),A=Te(""),p=Te("all");function f(T,_){const j=_.trim().toLowerCase();let fe=j?T.filter(ce=>ce.name.toLowerCase().includes(j)||(ce.aliases||[]).some(Ue=>Ue.toLowerCase().includes(j))):T;return p.value==="team"?fe=fe.filter(ce=>ce.remote_source==="team_asset"):p.value==="personal"&&(fe=fe.filter(ce=>ce.remote_source!=="team_asset")),[...fe].sort((ce,Ue)=>{const qe=ce.created_at||"",Mt=Ue.created_at||"";return qe!==Mt?Mt.localeCompare(qe):(Ue.id||0)-(ce.id||0)})}const y=It(()=>{const T=e.value.find(_=>_.id===t.value);return!!T&&T.mode==="team_script_sync"}),C=Te(!1),E=Te({current:0,total:0,success:0,failed:0,currentName:""});async function F(){if(!t.value)return;const T=t.value;C.value=!0,E.value={current:0,total:0,success:0,failed:0,currentName:"获取资产清单"};const _=[];try{const j=await zu(T);if(E.value.total=j.total||0,!j.total){const Ue=await pl(T,[]);await ut(T);const qe=Ue.removed>0?`云端暂无资产,已清理本地团队资产 ${Ue.removed} 个`:"云端暂无可同步资产";Z.warning(qe);return}for(const Ue of j.assets){E.value.currentName=Ue.name||`资产 ${Ue.assetId}`;try{await Gu(T,Ue.assetId),E.value.success+=1}catch(qe){E.value.failed+=1,_.push(`${Ue.name||Ue.assetId}: ${(qe==null?void 0:qe.message)||"未知错误"}`)}finally{E.value.current+=1}}E.value.currentName="清理本地差异";const fe=await pl(T,j.assets.map(Ue=>Ue.assetId));await ut(T);let ce=`团队资产同步完成 ${E.value.success}/${E.value.total} 个`;if(fe.removed>0&&(ce+=`; 已清理本地多余团队资产 ${fe.removed} 个`),E.value.failed>0){const Ue=_[0]||"";Z.warning(`${ce}; 失败 ${E.value.failed} 个${Ue?" ("+Ue+")":""}`)}else Z.success(ce)}catch(j){Z.error((j==null?void 0:j.message)||"同步团队资产失败")}finally{C.value=!1,E.value.currentName=""}}const D=Te(!1),k=Te([]),x=Te(null),w=Te(!1),L=Te([]),S=Te(!1),O=Te({current:0,total:0,success:0,failed:0,currentName:""}),H=Te(null),q=It(()=>l.value==="scene"?h.value:l.value==="prop"?u.value:d.value),ee=It(()=>l.value==="scene"?"场景":l.value==="prop"?"道具":"人物");async function J(){if(t.value){D.value=!0,L.value=[],O.value={current:0,total:0,success:0,failed:0,currentName:""},x.value=null,w.value=!0;try{const T=await Hu(t.value);k.value=T.groups||[],k.value.length===1&&(x.value=k.value[0].groupId)}catch(T){Z.error((T==null?void 0:T.message)||"拉取资产组失败"),k.value=[]}finally{w.value=!1}}}function Y(T){L.value=T}async function ve(){var j;if(!t.value||!x.value||L.value.length===0)return;S.value=!0;const T=[...L.value];O.value={current:0,total:T.length,success:0,failed:0,currentName:""};const _=[];try{for(const fe of T){O.value.currentName=fe.name||`元素 ${fe.id}`;const ce=await ku(t.value,x.value,[fe.id]);if(ce.failed>0){O.value.failed+=1;const Ue=((j=ce.results.find(qe=>!qe.ok))==null?void 0:j.error)||"未知错误";_.push(`${fe.name||fe.id}: ${Ue}`)}else{O.value.success+=ce.submitted||1;const Ue=(ce.results||[]).map(qe=>qe.audio).find(qe=>qe&&String(qe).startsWith("audio_failed"));Ue&&_.push(`${fe.name||fe.id} 音频未推送(${String(Ue).replace("audio_failed: ","")})`)}O.value.current+=1}if(O.value.currentName="",O.value.failed>0){const fe=_[0]||"";Z.warning(`已提交 ${O.value.success} 个待审,${O.value.failed} 个失败${fe?"("+fe+")":""}`)}else Z.success(`已提交 ${O.value.success} 个资产到团队待审池,审核通过后入库`),D.value=!1}catch(fe){Z.error((fe==null?void 0:fe.message)||"反推失败")}finally{S.value=!1}}const _e=It(()=>f(d.value,m.value)),Pe=It(()=>f(h.value,v.value)),ue=It(()=>f(u.value,A.value)),De=Te(!1),et=Te(null),nt=Te(!1),xt=Te(null);function se(T){xt.value=T,nt.value=!0}function Ae(T){t.value&&ut(t.value)}const te=Te(""),Se=Te([]),we=Te(null);async function Ge(){try{const T=window.electronAPI;if(!(T!=null&&T.openDataDir)){Z.warning("当前环境不支持打开本地目录");return}const _=await T.openDataDir("images");if(_!=null&&_.success)Z.success("已打开图片目录");else{const j=(_==null?void 0:_.error)||"打开失败";Z.error(`无法打开图片目录: ${j}${_!=null&&_.path?`
路径: `+_.path:""}`)}}catch(T){Z.error(`打开图片目录失败: ${(T==null?void 0:T.message)||T}`)}}async function ct(){if(we.value=null,!!t.value)try{const T=await _d(t.value);T!=null&&T.script_to_novel_template_id&&(we.value=await Md(T.script_to_novel_template_id))}catch{}}const Xe=Te([]),Je=Te([]),Ze=Te(null),tt=Te(!1),ht=Te(null),U=Te(null),_t=Te(null),gt=Te(!1),st=Te(new Set),ke=Te(new Set),b=Te(!1),g=Te({current:0,total:0,type:""});let z=null;function oe(){z||(z=setInterval(async()=>{if(t.value){if(st.value.size===0){pe();return}try{await ut(t.value)}catch{}st.value.size===0&&pe()}},15e3))}function pe(){z&&(clearInterval(z),z=null)}const re=Te(!1),Oe=Te("character"),be=Te("all"),N=Te({template_id:null,llm_config_id:null,chapter_ids:[]}),V=Te(!1),X=Te(!1),$=Te(null),me=Te("character"),Ce=Te(),ie=Te({name:"",description:"",aliases:[]}),Qe=Te(""),B=Te(!1),ye=Te("character"),ge=Te({prefix_prompt:"",suffix_prompt:""}),Be=Te(!1),xe=Te("");function le(T){return T?T.includes("古装电视剧剧照")||T.includes("真人电影级写实摄影")?"seedream":T.includes("【画质要求】")&&T.includes("多表情视图")?"gpt":"":""}async function ze(T){const _=Sn.find(j=>j.value===T);if(_&&(ge.value.prefix_prompt=_.content,t.value))try{await vs(t.value,"character",ge.value),Z.success(`已切换并保存:${_.label.split("(")[0]}`)}catch(j){console.warn("[preset] 自动保存失败:",j)}}const it=[{label:"彩铅风格(过人脸专用风格)",prompt:"彩铅风格"},"真人电影级写实摄影","古装电视剧剧照","影视演员","好莱坞大片","欧美电影感","韩剧高级感","日系电影风","法式电影","异域风情","超写实 CG 渲染","硬科幻机甲","赛博朋克","近未来真实感","霓虹光污染","东方水墨","仙侠飘逸","古风写真","奇幻写实","暗黑哥特","工业废土","非写实非真人","插画风格","游戏原画","2D 动漫","3D 国漫"],St=`【视觉风格】


【角色信息】
{角色信息}

【一致性约束·必须严格遵守】
所有视图中的角色为同一人,面部骨骼结构、眼型、鼻梁、唇形、脸型完全一致;
表情图中的每张脸与正视图面部特征 100% 相同,仅表情肌肉变化;
全图同一套光影逻辑、色温、透视角度,无风格突变;
色彩严格统一,无色偏,肤色/发色/服色与角色设定完全匹配。

【视图排布·按编号顺序排列在 16:9 画布内】
• ①全身正视图
• ②全身背视图
• ③全身侧视图
• ④全身 45 度角视图
• ⑤尺寸图+部件说明
• ⑥全图 RGB 色卡
• ⑦多表情视图(包含:平静 / 微笑 / 愤怒 / 惊讶 / 悲伤 / 冷峻)
• ⑧材质纹理特写
• ⑨面部极致特写

【画质要求】
4K 高精度渲染,320DPI,纯白底版,无畸变,文字与编号标注清晰可读,
整体排版工整对称,每个视图带数字编号+中文名称标注,分区明确,间距均匀。

${Rr}

=== END ===`,Tt=`古装电视剧剧照,真人电影级写实摄影

【角色信息】
{角色信息}

【一致性约束·必须严格遵守】
所有视图中的角色为同一人,面部骨骼结构、眼型、鼻梁、唇形、脸型完全一致;
表情图中的每张脸与正视图面部特征 100% 相同,仅表情肌肉变化;
全图同一套光影逻辑、色温、透视角度,无风格突变;
色彩严格统一,无色偏,肤色/发色/服色与角色设定完全匹配。

【视图排布·按编号顺序排列在 16:9 画布内】
• 面部极致特写 左侧1/3
• 全身正视图
• 全身背视图
• 全身侧视图

背景白底,不拿任何道具

${Rr}`,Sn=[{value:"gpt",label:"GPT image-2 风格(精细 9 视图,推荐 GPT-image-2 / Seedream)",content:St},{value:"seedream",label:"火山 doubao-Seedream-5.0-lite 风格(真人剧照,4 视图简化版)",content:Tt}],Cn=St,er=`场景背景图,不要出现人物。

【场景信息】
{场景信息}

【画面构图·单图氛围参考】
单张场景氛围图,自然透视,无分区无拼图;
画面包含场景主体建筑/环境、关键物件与空间关系;
以人物视线高度观察场景,留足前景/中景/远景层次,体现空间纵深。

【视觉风格】


【画质要求】
真实电影摄影质感,自然光影,无畸变,色彩克制还原准确,
无水印无文字无标注,单一画面完整呈现场景氛围。

${Rr}

=== END ===`,Aa=`【道具信息】
{道具信息}

【画面构图·产品级静物】
单张产品级静物图,道具占画面中央 70%,纯净背景,无分区无拼图;
主视角(正面或 45 度斜角)呈现道具全貌,
真实比例与体积感,材质细节清晰可辨。

【视觉风格】


【画质要求】
真实电影摄影质感,自然光影,纯白/浅灰底版,无畸变,色彩克制,
无水印无文字无标注,主体无遮挡。

${Rr}

=== END ===`;function wa(T){return T==="character"?Cn:T==="scene"?er:Aa}function Ca(T){return typeof T=="string"?T:T.label}function Ra(T){return typeof T=="string"?T:T.prompt}const Rn=/(【视觉风格】[ \t]*\r?\n)([^\r\n]*)/;function Wi(T){return T.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function Pa(T){const _=Ra(T),j=ge.value.prefix_prompt||"",fe=j.match(Rn);return fe?(fe[2]||"").includes(_):j.includes(_)}function tr(T){const _=Ra(T),j=ge.value.prefix_prompt||"";if(!Rn.test(j)){if(j.includes(_)){let fe=j.replace(new RegExp(`[、,，]?\\s*${Wi(_)}\\s*[、,，]?`),"、");fe=fe.replace(/^[\s、,，]+/,"").replace(/[ \t、,，]+(?=\r?\n)/g,"").replace(/[、,，]{2,}/g,"、"),ge.value.prefix_prompt=fe;return}ge.value.prefix_prompt=j?`${_}，${j}`:_;return}ge.value.prefix_prompt=j.replace(Rn,(fe,ce,Ue)=>{let qe=Ue||"";if(qe.includes(_))qe=qe.replace(new RegExp(`[、,，]?\\s*${Wi(_)}\\s*[、,，]?`),"、"),qe=qe.replace(/^[\s、,，]+/,"").replace(/[\s、,，]+$/,"").replace(/[、,，]{2,}/g,"、");else{const Mt=qe.trim().replace(/[、,，]$/,"");qe=Mt?`${Mt}、${_}`:_}return ce+qe})}function Xi(){ge.value.prefix_prompt=wa(ye.value),ge.value.suffix_prompt="",ye.value==="character"&&(xe.value="gpt")}const Ci=Te(!1),Pn=Te(null),Da=Te([]),Ri=Te([]),Ia=Te(!1),La=Te(!1),$r=Te(),$i=Te(null),qi=Te("character"),nr=Te(!1),M={name:[{required:!0,message:"请输入名称",trigger:"blur"}]},W=It(()=>`提取${{character:"人物",scene:"场景",prop:"道具"}[Oe.value]}`),ae=It(()=>{const T={character:"character_extraction",scene:"scene_extraction",prop:"prop_extraction"},_=Se.value.filter(j=>j.category===T[Oe.value]);return El(_,we.value)}),Q=It(()=>N.value.template_id&&N.value.llm_config_id&&(be.value==="all"||N.value.chapter_ids.length>0)),K=It(()=>{const T={character:"人物",scene:"场景",prop:"道具"};return`${X.value?"编辑":"添加"}${T[me.value]}`}),Ie={character:"角色",scene:"场景",prop:"道具"},Ve=It(()=>`${Ie[ye.value]}风格设置`),Le=It(()=>{const T=Se.value.filter(_=>_.category==="grid_image");return El(T,we.value)}),He=["deepseek"],$e=It(()=>Xe.value.filter(T=>{const _=(T.provider_code||"").toLowerCase();return!He.includes(_)})),ot=It(()=>U.value&&_t.value&&Ze.value),dt=It(()=>e.value.filter(T=>T.id!==t.value));function je(){try{const T=localStorage.getItem(yc);return T?JSON.parse(T):null}catch{return null}}function Et(){try{localStorage.setItem(yc,JSON.stringify({novelId:t.value,imageConfigId:Ze.value,activeTab:l.value}))}catch{}}Ec(async()=>{await Nt(),await Zt(),await We(),await ln();const T=je();T&&(T.novelId&&e.value.some(_=>_.id===T.novelId)&&(t.value=T.novelId,await kn(T.novelId)),T.imageConfigId&&Je.value.some(_=>_.id===T.imageConfigId)&&(Ze.value=T.imageConfigId),T.activeTab&&["character","scene","prop"].includes(T.activeTab)&&(l.value=T.activeTab)),t.value&&await ct()}),ci(t,async T=>{T?(await ct(),Ft(T).catch(()=>{})):we.value=null,Et()});async function Ft(T){const _=["character","scene","prop"];for(const j of _)try{const fe=await Sl(T,j);if(fe!=null&&fe.prefix_prompt&&fe.prefix_prompt.trim())continue;await vs(T,j,{prefix_prompt:wa(j),suffix_prompt:(fe==null?void 0:fe.suffix_prompt)||""})}catch{}}ci(Ze,()=>Et()),ci(l,()=>Et());async function Nt(){try{e.value=await gd()}catch{Z.error("加载小说列表失败")}}async function At(T){try{n.value=await vd(T)}catch{Z.error("加载章节列表失败")}}async function Zt(){try{Se.value=await xd()}catch{Z.error("加载模板列表失败")}}async function We(){try{Xe.value=await yl("llm")}catch{Z.error("加载大模型配置失败")}}async function ln(){try{Je.value=await yl("image")}catch{Z.error("加载图片模型配置失败")}}async function ut(T){var _,j;a.value=!0;try{const[fe,ce,Ue]=await Promise.all([Zi(T,"character"),Zi(T,"scene"),Zi(T,"prop")]),qe=Mt=>{for(const at of Mt)if((at.image_url||at.finished_image)&&at.image_status==="generating")at.image_status="success";else if(at.image_status==="generating"&&!st.value.has(at.id)&&!at.image_url&&!at.finished_image){const Ye=Date.parse(at.updated_at||at.created_at||"");Number.isFinite(Ye)&&Date.now()-Ye>Dx&&(at.image_status="failed")}};if(qe(fe),qe(ce),qe(Ue),d.value=cn(fe),h.value=cn(ce),u.value=cn(Ue),ke.value.size>0){const Mt=[...d.value,...h.value,...u.value];for(const at of[...ke.value]){const Ye=Mt.find(jt=>jt.id===at);Ye&&Ye.grid_image&&ke.value.delete(at)}for(const at of Mt)at.grid_generating=ke.value.has(at.id)}if(st.value.size>0){const Mt=[...fe,...ce,...Ue];for(const at of[...st.value]){const Ye=Mt.find(jt=>jt.id===at);Ye&&(Ye.image_status!=="generating"||Ye.image_url||Ye.finished_image)&&st.value.delete(at)}}}catch(fe){Z.error("加载提取结果失败: "+(((j=(_=fe==null?void 0:fe.response)==null?void 0:_.data)==null?void 0:j.detail)||(fe==null?void 0:fe.message)||"未知错误"))}finally{a.value=!1}}function Ot(T,_=Date.now()){if(!T)return T;const j=T.replace(/([?&])t=[^&]*(&?)/,(fe,ce,Ue)=>ce==="?"&&Ue?"?":ce==="?"&&!Ue?"":Ue?ce:"");return j.includes("?")?`${j}&t=${_}`:`${j}?t=${_}`}function cn(T,_){for(const j of T){const fe=j.updated_at?encodeURIComponent(String(j.updated_at)):Date.now();for(const ce of["reference_image","finished_image","grid_image","panorama_url","image_url"])j[ce]&&(j[ce]=Ot(j[ce],fe))}return T}async function kn(T){T?(await At(T),await ut(T),await ct()):(n.value=[],d.value=[],h.value=[],u.value=[],we.value=null)}function Vn(T){Oe.value=T,N.value={template_id:null,llm_config_id:null,chapter_ids:[]},be.value="all",re.value=!0}ci(be,T=>{T==="all"&&(N.value.chapter_ids=[])});async function wt(){if(!(!t.value||!N.value.template_id||!N.value.llm_config_id)){r.value=!0,s.value=0,o.value="",c.value="正在提取中...";try{const T=be.value==="all"?void 0:N.value.chapter_ids,_=await Zu({novel_id:t.value,element_type:Oe.value,template_id:N.value.template_id,llm_config_id:N.value.llm_config_id,chapter_ids:T});if(_.success)s.value=100,o.value="success",c.value=`提取完成！共提取 ${_.total_unique} 个唯一${Oe.value==="character"?"人物":Oe.value==="scene"?"场景":"道具"}`,Z.success(c.value),t.value&&await ut(t.value),setTimeout(()=>{re.value=!1,r.value=!1},1500);else throw new Error(_.message||"提取失败")}catch(T){s.value=100,o.value="exception",c.value=T.message||"提取失败",Z.error(c.value),r.value=!1}}}function Bt(T){if(!t.value){Z.warning("请先选择小说");return}X.value=!1,$.value=null,me.value=T,ie.value={name:"",description:"",aliases:[]},Qe.value="",V.value=!0}function yn(T){X.value=!0,$.value=T.id,me.value=T.element_type,ie.value={name:T.name,description:T.description,aliases:[...T.aliases||[]]},Qe.value="",V.value=!0}function kt(){const T=Qe.value.trim();T&&!ie.value.aliases.includes(T)&&ie.value.aliases.push(T),Qe.value=""}async function zn(){Ce.value&&await Ce.value.validate(async T=>{if(T){if(!t.value){Z.warning("请先选择小说");return}try{if(X.value&&$.value?(await ju($.value,{name:ie.value.name,description:ie.value.description,aliases:ie.value.aliases}),Z.success("更新成功")):(await Ml({novel_id:t.value,element_type:me.value,name:ie.value.name,description:ie.value.description,aliases:ie.value.aliases}),Z.success("添加成功")),V.value=!1,t.value){const _=await Zi(t.value,me.value);me.value==="character"?d.value=_:me.value==="scene"?h.value=_:u.value=_}}catch{Z.error(X.value?"更新失败":"添加失败")}}})}async function Gn(T){try{if(await ad(T.id),Z.success("删除成功"),t.value){const _=await Zi(t.value,T.element_type);T.element_type==="character"?d.value=_:T.element_type==="scene"?h.value=_:u.value=_}}catch{Z.error("删除失败")}}async function Yi(T){if(!Ze.value){Z.warning("请先选择图片模型");return}st.value.add(T.id),oe();let _=!1;try{const j=await rd(T.id,Ze.value);if(j.success)Z.success("图片生成成功"),T.image_url=Ot(j.image_url),T.image_status="success";else throw new Error(j.message||"生成失败")}catch(j){Z.error(j.message||"图片生成失败"),T.image_status="error",_=!0}finally{if(st.value.delete(T.id),t.value)try{if(await ut(t.value),_){const fe=[...d.value,...h.value,...u.value].find(ce=>ce.id===T.id);fe&&fe.image_status!=="error"&&fe.image_status!=="failed"&&!fe.image_url&&(fe.image_status="error")}}catch{}}}async function qr(T){try{await Fn.confirm(`只是让前端不再等结果(后端可能仍在生成)。
如果后端实际生成完成,刷新本页能看到。`,"停止等待",{type:"warning",confirmButtonText:"停止等待",cancelButtonText:"继续等"})}catch{return}st.value.delete(T.id),T.image_status==="generating"&&(T.image_status=null);try{await sd(T.id)}catch(_){console.warn("[stop-generating] 调后端 cancel-image 失败(不影响前端停止):",_)}Z.info(`已停止等待 #${T.name||T.id}`)}async function Yr(T){if(!Ze.value){Z.warning('请先在顶部选择"图片模型配置"');return}const _=!!T.panorama_url,fe=`720° 全景 VR 视图,2:1 高清。
等距柱状投影 ERP,360° 全视角,上下左右无缝,VR 漫游可用,720P。
场景:${(T.description||"").trim()}`;let ce=fe;try{ce=(await Fn.prompt(`${_?"⚠️ 覆盖现有全景图。":""}默认 prompt 已填充,可编辑后再生成`,_?"重新生成全景图":"生成全景图",{confirmButtonText:_?"覆盖重生成":"开始生成",cancelButtonText:"取消",inputType:"textarea",inputValue:fe,inputValidator:qe=>!!(qe&&qe.trim().length>5)||"至少 5 个字",customClass:"panorama-prompt-dialog"})).value||fe}catch{return}T.panorama_generating=!0;try{const{generatePanorama:Ue}=await Va(async()=>{const{generatePanorama:Mt}=await import("./extraction-BqPvoFgZ.js");return{generatePanorama:Mt}},__vite__mapDeps([2,0,1]),import.meta.url),qe=await Ue(T.id,Ze.value,ce);if(qe.success&&qe.panorama_url)T.panorama_url=Ot(qe.panorama_url),Z.success("全景图生成完成");else throw new Error(qe.message||"生成失败")}catch(Ue){Z.error(`全景图生成失败: ${(Ue==null?void 0:Ue.message)||Ue}`)}finally{T.panorama_generating=!1}}async function Kr(T,_){const j=(_==null?void 0:_.raw)||_;if(j){if(T.panorama_url)try{await Fn.confirm(`场景「${T.name}」已有全景图,继续会替换。`,"替换全景图",{type:"warning",confirmButtonText:"替换",cancelButtonText:"取消"})}catch{return}T.panorama_uploading=!0;try{const{uploadPanorama:fe}=await Va(async()=>{const{uploadPanorama:Ue}=await import("./extraction-BqPvoFgZ.js");return{uploadPanorama:Ue}},__vite__mapDeps([2,0,1]),import.meta.url),ce=await fe(T.id,j);if(ce.success&&ce.panorama_url)T.panorama_url=ce.panorama_url,Z.success("全景图上传成功");else throw new Error(ce.message||"上传失败")}catch(fe){Z.error(`全景图上传失败: ${(fe==null?void 0:fe.message)||fe}`)}finally{T.panorama_uploading=!1}}}async function Zr(T){if(!T.panorama_url){Z.warning("该场景还没全景图");return}if(T.grid_image)try{await Fn.confirm("该场景已有宫格图,继续会覆盖现有那张(VR 手动截图的也会被替换)","覆盖宫格图确认",{type:"warning",confirmButtonText:"覆盖",cancelButtonText:"取消"})}catch{return}T.panorama_grid_building=!0;try{const{panoramaToGrid:_}=await Va(async()=>{const{panoramaToGrid:fe}=await import("./extraction-BqPvoFgZ.js");return{panoramaToGrid:fe}},__vite__mapDeps([2,0,1]),import.meta.url),j=await _(T.id,12);if(j.success&&j.grid_image)T.grid_image=Ot(j.grid_image),Z.success(`已拆 ${j.view_count||12} 视角到宫格`);else throw new Error(j.message||"失败")}catch(_){Z.error(`一键拆视角失败: ${(_==null?void 0:_.message)||_}`)}finally{T.panorama_grid_building=!1}}function jr(T){if(!T.panorama_url){Z.warning("该场景还没全景图");return}et.value=T,te.value=pn(T.panorama_url),De.value=!0}function hu(T,_){const j=fe=>{const ce=fe.find(Ue=>Ue.id===T);ce&&(ce.grid_image=Ot(_))};j(h.value),j(d.value),j(u.value)}async function Jr(T){if(T.panorama_url){try{await Fn.confirm(`清除场景「${T.name}」的全景图?
(已拼好的宫格图 grid_image 不受影响,只是无法再调用"全景拼宫格")`,"清除全景图",{type:"warning",confirmButtonText:"清除",cancelButtonText:"取消"})}catch{return}try{const{deletePanorama:_}=await Va(async()=>{const{deletePanorama:fe}=await import("./extraction-BqPvoFgZ.js");return{deletePanorama:fe}},__vite__mapDeps([2,0,1]),import.meta.url),j=await _(T.id);if(j.success)T.panorama_url=null,Z.success("全景图已清除");else throw new Error(j.message||"清除失败")}catch(_){Z.error(`清除全景图失败: ${(_==null?void 0:_.message)||_}`)}}}async function Qr(T){try{const _=await od(T.id);if(_.success)Z.success("图片已删除"),T.image_url=null,T.image_status=null;else throw new Error(_.message||"删除失败")}catch(_){Z.error(_.message||"删除图片失败")}}async function es(T){if(!t.value){Z.warning("请先选择小说");return}ye.value=T,ge.value={prefix_prompt:"",suffix_prompt:""},B.value=!0;try{const _=await Sl(t.value,T);ge.value=_}catch{}(!ge.value.prefix_prompt||!ge.value.prefix_prompt.trim())&&(ge.value.prefix_prompt=wa(T)),T==="character"&&(xe.value=le(ge.value.prefix_prompt||""))}async function pu(){if(t.value){Be.value=!0;try{await vs(t.value,ye.value,ge.value),Z.success("风格设置已保存"),B.value=!1}catch{Z.error("保存失败")}finally{Be.value=!1}}}async function ts(T){if(!t.value){Z.warning("请先选择小说");return}if(!Ze.value){Z.warning("请先选择图片模型");return}const _={character:"人物",scene:"场景",prop:"道具"},fe=(T==="character"?d.value:T==="scene"?h.value:u.value).filter(qe=>!qe.finished_image&&!qe.image_url&&qe.image_status!=="generating");if(fe.length===0){Z.info(`所有${_[T]}已有图片或成品图`);return}try{await Fn.confirm(`将为 ${fe.length} 个${_[T]}批量生成图片,确认继续吗?

注:已有成品图/AI 生成图的会自动跳过。`,"批量生图确认",{confirmButtonText:`确认生成(${fe.length})`,cancelButtonText:"取消",type:"warning",distinguishCancelAndClose:!0})}catch{return}b.value=!0,g.value={current:0,total:fe.length,type:_[T]};let ce=0,Ue=0;try{fe.forEach(Dt=>st.value.add(Dt.id)),oe();const qe=Ze.value;let Mt=0;const at=Math.min(2,fe.length);let Ye=0;const jt=async Dt=>{try{const Ct=await Ju(Dt.id);return Object.assign(Dt,Ct),Ct.image_status==="generating"&&!Ct.image_url&&!Ct.finished_image}catch{return!1}},tn=async Dt=>{try{(await Qu(Dt.id,qe)).success?(Dt.image_status="generating",ce++,Ye++):await jt(Dt)?Ye++:(Dt.image_status="error",st.value.delete(Dt.id),Ue++)}catch{await jt(Dt)?Ye++:(Dt.image_status="error",st.value.delete(Dt.id),Ue++)}finally{g.value.current=ce+Ue}},En=Array.from({length:at},async()=>{for(;Mt<fe.length;){const Dt=fe[Mt++];await tn(Dt)}});await Promise.all(En),Ye>0?Z.warning(`批量生图已提交：已提交 ${ce}，提交失败 ${Ue}，后台生成中 ${Ye}`):Z.success(`批量生图提交完成：已提交 ${ce}，提交失败 ${Ue}`)}catch{Z.error("批量生图出错")}finally{if(b.value=!1,t.value)try{await ut(t.value)}catch{}}}async function ns(T,_){try{const j=_.raw;if(!j){Z.error("文件读取失败");return}if(!["image/jpeg","image/png","image/webp","image/gif","image/bmp"].includes(j.type)){Z.error("仅支持 JPG、PNG、WebP、GIF、BMP 格式的图片");return}const ce=10*1024*1024;if(j.size>ce){Z.error("文件大小不能超过 10MB");return}const Ue=await _l(T.id,j);Ue.success&&(T.reference_image=Ot(Ue.reference_image),Z.success("参考图上传成功"))}catch{Z.error("上传参考图失败")}}async function is(T){try{(await ld(T.id)).success&&(T.reference_image=null,Z.success("参考图已删除"))}catch{Z.error("删除参考图失败")}}async function as(T,_){try{const j=_.raw;if(!j){Z.error("文件读取失败");return}if(!["image/jpeg","image/png","image/webp","image/gif","image/bmp"].includes(j.type)){Z.error("仅支持 JPG、PNG、WebP、GIF、BMP 格式的图片");return}const ce=10*1024*1024;if(j.size>ce){Z.error("文件大小不能超过 10MB");return}const Ue=await xl(T.id,j);Ue.success&&(T.finished_image=Ot(Ue.finished_image),T.image_status=null,Z.success("成品图上传成功"))}catch{Z.error("上传成品图失败")}}async function rs(T){try{(await cd(T.id)).success&&(T.finished_image=null,Z.success("成品图已删除"))}catch{Z.error("删除成品图失败")}}function ss(T){if(!Ze.value){Z.warning("请先选择图片模型");return}if(!T.finished_image&&!T.image_url){Z.warning("该素材没有成品图或生成图，无法生成宫格图");return}ht.value=T,U.value=null,_t.value=null,tt.value=!0}function ul(){tt.value=!1,ht.value=null,U.value=null,_t.value=null,gt.value=!1}async function mu(){if(!ht.value||!ot.value)return;const T=ht.value,_=Ze.value,j=U.value,fe=_t.value;if(!_||!j||!fe){Z.warning("请确保已选择图片模型、宫格提示词模板和大语言模型");return}ul(),ke.value.add(T.id),T.grid_generating=!0;try{const ce=await ed(T.id,_,j,fe);if(ce.success)Z.success("宫格图生成成功"),T.grid_image=Ot(ce.grid_image);else throw new Error(ce.message||"生成失败")}catch(ce){const Ue=typeof ce=="string"?ce:(ce==null?void 0:ce.message)||(ce==null?void 0:ce.detail)||JSON.stringify(ce)||"宫格图生成失败";Z.error(typeof Ue=="string"?Ue:"宫格图生成失败")}finally{ke.value.delete(T.id),T.grid_generating=!1}}async function os(T){try{(await ud(T.id)).success&&(T.grid_image=null,Z.success("宫格图已删除"))}catch{Z.error("删除宫格图失败")}}async function ls(T,_){try{const j=_.raw;if(!j){Z.error("文件读取失败");return}if(!["image/jpeg","image/png","image/webp","image/gif","image/bmp"].includes(j.type)){Z.error("仅支持 JPG、PNG、WebP、GIF、BMP 格式的图片");return}const ce=10*1024*1024;if(j.size>ce){Z.error("文件大小不能超过 10MB");return}const Ue=await vl(T.id,j);Ue.success&&(T.grid_image=Ot(Ue.grid_image),Z.success("宫格图上传成功"))}catch{Z.error("上传宫格图失败")}}async function cs(T){if(!t.value){Z.warning("请先选择小说");return}const _={character:"人物",scene:"场景",prop:"道具"}[T];try{await Fn.confirm(`确定要清空所有${_}素材吗？此操作不可恢复。`,"确认清空",{confirmButtonText:"确定",cancelButtonText:"取消",type:"warning"})}catch{return}try{const j=await td(t.value,T);j.success&&(Z.success(j.message||"清空成功"),T==="character"?d.value=[]:T==="scene"?h.value=[]:u.value=[])}catch(j){Z.error((j==null?void 0:j.message)||"清空素材失败")}}async function us(T,_){try{const j=_.raw;if(!j){Z.error("文件读取失败");return}const fe=["audio/mpeg","audio/wav","audio/x-wav","audio/mp3","audio/ogg","audio/flac","audio/x-m4a","audio/mp4"],ce=[".mp3",".wav",".m4a",".ogg",".flac"],Ue=j.name.substring(j.name.lastIndexOf(".")).toLowerCase();if(!fe.includes(j.type)&&!ce.includes(Ue)){Z.error("仅支持 MP3、WAV、M4A、OGG、FLAC 格式的音频文件");return}const qe=50*1024*1024;if(j.size>qe){Z.error("文件大小不能超过 50MB");return}const Mt=await gl(T.id,j);Mt.success&&(T.audio_file=Mt.audio_file,Z.success("音频上传成功"))}catch{Z.error("上传音频失败")}}async function ds(T){try{(await dd(T.id)).success&&(T.audio_file=null,Z.success("音频已删除"))}catch{Z.error("删除音频失败")}}async function gu(T,_){if(!T)return;const j=_||T.split("/").pop()||"image.png";await Dc(pn(T),j)}async function _u(){if(!(!Pn.value||!t.value)){Ia.value=!0;try{const T=await nd(Pn.value,t.value);Da.value=T.elements}catch(T){Z.error("加载预览失败: "+T.message)}finally{Ia.value=!1}}}function vu(T){Ri.value=T.map(_=>_.id)}async function xu(){if(!(!Pn.value||!t.value)){La.value=!0;try{const T=await id({from_novel_id:Pn.value,to_novel_id:t.value,element_ids:Ri.value});Z.success(`成功同步 ${T.synced_count} 个元素`+(T.skipped_count>0?`，跳过 ${T.skipped_count} 个`:"")),Ci.value=!1,await ut(t.value)}catch(T){Z.error("同步失败: "+T.message)}finally{La.value=!1}}}function Mu(T){const _=T==="character"?"角色":T==="scene"?"场景":"道具",j=T==="character"?"张三":T==="scene"?"客厅":"玉佩",fe=[{file:`${_}_${j}.png`,slot:"成品图"},{file:`${_}_${j}_参考图.png`,slot:"参考图"}];T==="scene"?(fe.push({file:`${_}_${j}_宫格图.png`,slot:"宫格图"}),fe.push({file:`${_}_${j}_720.png`,slot:"全景图(720)"})):T==="prop"?fe.push({file:`${_}_${j}_宫格图.png`,slot:"宫格图"}):(fe.push({file:`${_}_${j}_战甲.png`,slot:"马甲「战甲」成品图"}),fe.push({file:`${_}_${j}_战甲_参考图.png`,slot:"马甲「战甲」参考图"}),fe.push({file:`音频_${j}.mp3`,slot:"音频(2~15秒,挂角色)"}),fe.push({file:`音频_${j}_战甲.mp3`,slot:"马甲「战甲」音频"}));const ce=fe.map(Ue=>`<tr><td style="padding:4px 10px;font-family:monospace;color:#409eff">${Ue.file}</td><td style="padding:4px 10px;color:#666">→ ${Ue.slot}</td></tr>`).join("");return`<div style="font-size:13px;line-height:1.7"><div style="margin-bottom:8px">文件名按 <b>「${_}_元素名_后缀」</b> 命名,导入时会自动归类到对应槽位:</div><table style="border-collapse:collapse;background:rgba(64,158,255,0.06);border-radius:6px">${ce}</table><div style="margin-top:10px;color:#999;font-size:12px">· 元素不存在会自动新建;同名马甲不存在会自动创建<br>· 不符合命名规范的文件 → 整个文件名作为元素名,导入为成品图<br>· 类型前缀与当前不符(如人物页导入「场景_…」)→ 自动跳过</div></div>`}async function fs(T){var j;if(!t.value){Z.warning("请先选择小说");return}const _=T==="character"?"人物":T==="scene"?"场景":"道具";try{await Fn.confirm(Mu(T),`批量导入${_} · 文件命名规格`,{confirmButtonText:"选择文件导入",cancelButtonText:"取消",dangerouslyUseHTMLString:!0,customClass:"batch-import-spec-box"})}catch{return}qi.value=T,$i.value&&($i.value.value=""),(j=$i.value)==null||j.click()}const Su={角色:"character",场景:"scene",道具:"prop"},yu=[".mp3",".wav",".m4a",".aac",".ogg",".flac"];function Eu(T,_,j){const fe=T.lastIndexOf("."),ce=fe>0?T.substring(0,fe):T,Ue=fe>0?T.substring(fe).toLowerCase():"";if(yu.includes(Ue)){const Ct=ce.match(/^音频_(.+)$/),gn=Ct?Ct[1]:ce;if(_!=="character")return{recognized:!0,typeMismatch:!0,role:"audio",elementName:gn};let Jt=gn,qt,fn=null;for(const Hn of j){if(Hn.name===gn){fn=Hn,qt=void 0;break}gn.startsWith(Hn.name+"_")&&(!fn||Hn.name.length>fn.name.length)&&(fn=Hn)}return fn&&(Jt=fn.name,fn.name!==gn&&(qt=gn.slice(fn.name.length+1))),{recognized:!0,role:"audio",elementName:Jt,variantName:qt}}const qe=ce.match(/^(角色|场景|道具)_(.+)$/);if(!qe)return{recognized:!1,role:"finished",elementName:ce};if(Su[qe[1]]!==_)return{recognized:!0,typeMismatch:!0,role:"finished",elementName:ce};let at=qe[2],Ye="finished";at.endsWith("_参考图")?(Ye="reference",at=at.slice(0,-4)):at.endsWith("_宫格图")?(Ye="grid",at=at.slice(0,-4)):at.endsWith("_720")&&(Ye="panorama",at=at.slice(0,-4));const jt=at;let tn=jt,En,Dt=null;for(const Ct of j){if(Ct.name===jt){Dt=Ct,En=void 0;break}jt.startsWith(Ct.name+"_")&&(!Dt||Ct.name.length>Dt.name.length)&&(Dt=Ct)}return Dt&&(tn=Dt.name,Dt.name!==jt&&(En=jt.slice(Dt.name.length+1))),En&&(Ye==="grid"||Ye==="panorama")?{recognized:!0,invalid:"马甲无宫格/全景槽位",role:Ye,elementName:tn,variantName:En}:Ye==="grid"&&_==="character"?{recognized:!0,invalid:"人物无宫格槽位",role:Ye,elementName:tn}:Ye==="panorama"&&_!=="scene"?{recognized:!0,invalid:"仅场景有全景(720)槽位",role:Ye,elementName:tn}:{recognized:!0,role:Ye,elementName:tn,variantName:En}}async function bu(T){var fn,Hn;const j=T.target.files;if(!j||j.length===0)return;if(!t.value){Z.warning("请先选择小说");return}const fe=t.value;nr.value=!0;const ce=qi.value;let Ue=0,qe=0,Mt=0;const at=[],Ye=[],jt=qi.value==="character"?d.value:qi.value==="scene"?h.value:u.value,tn=new Map;for(const Vt of jt)tn.set(Vt.name,Vt.id);const En=new Map,Dt={finished:"成品图",reference:"参考图",grid:"宫格图",panorama:"全景(720)",audio:"音频"},Ct=async Vt=>{const Wn=tn.get(Vt);if(Wn!=null)return Wn;const nn=await Ml({novel_id:fe,element_type:ce,name:Vt,description:"",aliases:[]});return tn.set(Vt,nn.id),Ue++,nn.id},gn=async(Vt,Wn)=>{let nn=En.get(Vt);nn||(nn=await Xo(Vt),En.set(Vt,nn));const Dn=nn.find(Rt=>Rt.variant_name===Wn);if(Dn)return Dn.id;const Pi=await Pc(Vt,{variant_name:Wn});return nn.push(Pi),Pi.id},Jt=Vt=>{if(Vt&&Vt.success===!1)throw new Error(Vt.message||"上传接口返回失败")},qt=Lu.service({lock:!0,text:`正在批量导入 0/${j.length}...`,background:"rgba(0, 0, 0, 0.7)"});try{const Vt={finished:0,reference:1,grid:2,panorama:3,audio:4},Wn=Array.from(j).map((Rt,I)=>({file:Rt,index:I,parsed:Eu(Rt.name,ce,Array.from(tn.keys()).map(rt=>({name:rt})))})).sort((Rt,I)=>{if(Rt.parsed.typeMismatch!==I.parsed.typeMismatch)return Rt.parsed.typeMismatch?1:-1;if(!!Rt.parsed.invalid!=!!I.parsed.invalid)return Rt.parsed.invalid?1:-1;const rt=Vt[Rt.parsed.role]-Vt[I.parsed.role];return rt!==0?rt:Rt.index-I.index});for(let Rt=0;Rt<Wn.length;Rt++){const{file:I,parsed:rt}=Wn[Rt];if(rt.typeMismatch){at.push(`${I.name}(类型不符)`);continue}if(rt.invalid){at.push(`${I.name}(${rt.invalid})`);continue}const Di=rt.recognized?`${rt.elementName}${rt.variantName?"·"+rt.variantName:""}·${Dt[rt.role]}`:rt.elementName;qt.setText(`正在批量导入 ${Rt+1}/${j.length}: ${Di}`);try{const Wt=await Ct(rt.elementName);if(rt.role==="audio")if(rt.variantName){const gi=await gn(Wt,rt.variantName);Jt(await qo(gi,I))}else Jt(await gl(Wt,I));else if(rt.variantName){const gi=await gn(Wt,rt.variantName);rt.role==="reference"?Jt(await $o(gi,I)):Jt(await Yo(gi,I))}else rt.role==="reference"?Jt(await _l(Wt,I)):rt.role==="grid"?Jt(await vl(Wt,I)):rt.role==="panorama"?Jt(await Ku(Wt,I)):Jt(await xl(Wt,I));qe++}catch(Wt){console.error(`导入 ${I.name} 失败:`,Wt);const gi=((Hn=(fn=Wt==null?void 0:Wt.response)==null?void 0:fn.data)==null?void 0:Hn.detail)||(Wt==null?void 0:Wt.detail)||(Wt==null?void 0:Wt.message)||"未知错误";Ye.push(`${I.name}(${gi})`),Mt++}}if(t.value){const Rt=cn(await Zi(t.value,ce));ce==="character"?d.value=Rt:ce==="scene"?h.value=Rt:u.value=Rt}const nn=ce==="character"?"人物":ce==="scene"?"场景":"道具",Dn=[];Ue>0&&Dn.push(`新建元素 ${Ue} 个`),qe>0&&Dn.push(`导入资产 ${qe} 张`),at.length>0&&Dn.push(`跳过 ${at.length} 张`),Mt>0&&Dn.push(`失败 ${Mt} 张`);const Pi=Dn.length?Dn.join("，"):"无可导入文件";if(at.length>0||Mt>0){const Rt=gi=>gi.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),I=at.slice(0,8).map(Rt);at.length>8&&I.push(`…等 ${at.length} 张`);const rt=Ye.slice(0,8).map(Rt);Ye.length>8&&rt.push(`…等 ${Ye.length} 张`);const Di=[];I.length&&Di.push(`被跳过的文件:<br>${I.join("<br>")}`),rt.length&&Di.push(`失败的文件:<br>${rt.join("<br>")}`);const Wt=Di.length?`<div style="margin-top:8px;color:#999;font-size:12px;max-height:220px;overflow:auto">${Di.join("<br><br>")}</div>`:"";Fn.alert(`<div>${nn}导入完成：${Rt(Pi)}</div>${Wt}`,"批量导入结果",{confirmButtonText:"知道了",dangerouslyUseHTMLString:!0,type:Mt>0?"warning":"info"}).catch(()=>{})}else Z.success(`${nn}导入完成：${Pi}`)}catch{Z.error("批量导入失败")}finally{qt.close(),nr.value=!1}}return(T,_)=>{const j=mt("el-option"),fe=mt("el-select"),ce=mt("el-button"),Ue=mt("el-tooltip"),qe=mt("el-progress"),Mt=mt("el-input"),at=mt("el-icon"),Ye=mt("el-tag"),jt=mt("el-popconfirm"),tn=mt("el-tab-pane"),En=mt("el-tabs"),Dt=mt("el-card"),Ct=mt("el-table-column"),gn=mt("el-table"),Jt=mt("el-dialog"),qt=mt("el-form-item"),fn=mt("el-radio"),Hn=mt("el-radio-group"),Vt=mt("el-checkbox"),Wn=mt("el-checkbox-group"),nn=mt("el-form"),Dn=mt("el-image"),Pi=mt("el-alert"),Rt=Vu("loading");return G(),Ee("div",f0,[R(Dt,{class:"page-card"},{header:P(()=>[de("div",h0,[de("div",p0,[_[54]||(_[54]=de("span",{class:"title"},"信息提取",-1)),R(fe,{modelValue:t.value,"onUpdate:modelValue":_[0]||(_[0]=I=>t.value=I),placeholder:"选择小说",clearable:"",style:{width:"240px","margin-left":"16px"},onChange:kn},{default:P(()=>[(G(!0),Ee(zt,null,Gt(e.value,I=>(G(),Me(j,{key:I.id,label:I.name,value:I.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])]),de("div",m0,[R(fe,{modelValue:Ze.value,"onUpdate:modelValue":_[1]||(_[1]=I=>Ze.value=I),placeholder:"选择图片模型",clearable:"",style:{width:"180px"}},{default:P(()=>[(G(!0),Ee(zt,null,Gt(Je.value,I=>(G(),Me(j,{key:I.id,label:I.name,value:I.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])]),de("div",g0,[R(ce,{type:"primary",icon:Re(Uu),disabled:!t.value||r.value,onClick:_[2]||(_[2]=I=>Vn("character"))},{default:P(()=>[..._[55]||(_[55]=[he(" 提取人物 ",-1)])]),_:1},8,["icon","disabled"]),R(ce,{type:"success",icon:Re(Nu),disabled:!t.value||r.value,onClick:_[3]||(_[3]=I=>Vn("scene"))},{default:P(()=>[..._[56]||(_[56]=[he(" 提取场景 ",-1)])]),_:1},8,["icon","disabled"]),R(ce,{type:"warning",icon:Re(Fu),disabled:!t.value||r.value,onClick:_[4]||(_[4]=I=>Vn("prop"))},{default:P(()=>[..._[57]||(_[57]=[he(" 提取道具 ",-1)])]),_:1},8,["icon","disabled"]),R(Ue,{content:"打开本地文件存储目录(按小说名分目录,内含角色/场景/道具/音频)",placement:"bottom"},{default:P(()=>[R(ce,{type:"info",icon:Re(Ou),plain:"",onClick:Ge},{default:P(()=>[..._[58]||(_[58]=[he(" 文件目录 ",-1)])]),_:1},8,["icon"])]),_:1}),y.value?(G(),Me(ce,{key:0,type:"success",plain:"",icon:Re(pa),loading:C.value,disabled:!t.value,onClick:F},{default:P(()=>[he(Ke(C.value?`同步 ${E.value.current}/${E.value.total||"?"}`:"同步团队资产"),1)]),_:1},8,["icon","loading","disabled"])):Fe("",!0),y.value?(G(),Me(ce,{key:1,type:"warning",plain:"",icon:Re(Ti),disabled:!t.value,onClick:J},{default:P(()=>[..._[59]||(_[59]=[he(" 反推资产 ",-1)])]),_:1},8,["icon","disabled"])):Fe("",!0)])])]),default:P(()=>[C.value?(G(),Ee("div",_0,[de("div",v0,[_[60]||(_[60]=de("span",null,"同步团队资产",-1)),de("span",null,Ke(E.value.current)+"/"+Ke(E.value.total),1)]),R(qe,{percentage:E.value.total?Math.round(E.value.current/E.value.total*100):0,status:"active"},null,8,["percentage"]),de("p",x0," 当前: "+Ke(E.value.currentName||"准备中")+"；成功 "+Ke(E.value.success)+"，失败 "+Ke(E.value.failed),1)])):Fe("",!0),r.value?(G(),Ee("div",M0,[R(qe,{percentage:s.value,status:o.value},null,8,["percentage","status"]),de("p",S0,Ke(c.value),1)])):Fe("",!0),b.value?(G(),Ee("div",y0,[R(qe,{percentage:Math.round(g.value.current/g.value.total*100),status:"active"},null,8,["percentage"]),de("p",E0," 正在生成 "+Ke(g.value.type)+" 图片：第 "+Ke(g.value.current)+" / "+Ke(g.value.total)+" 个 ",1)])):Fe("",!0),R(En,{modelValue:l.value,"onUpdate:modelValue":_[26]||(_[26]=I=>l.value=I),type:"border-card",class:"extraction-tabs"},{default:P(()=>[R(tn,{label:"人物",name:"character"},{default:P(()=>[de("div",b0,[de("div",T0,[de("span",A0,"人物列表 ("+Ke(m.value.trim()?_e.value.length+"/":"")+Ke(d.value.length)+")",1),R(Mt,{modelValue:m.value,"onUpdate:modelValue":_[5]||(_[5]=I=>m.value=I),placeholder:"搜索名称",clearable:"",size:"small",class:"tab-search","prefix-icon":Re(ps)},null,8,["modelValue","prefix-icon"]),y.value?(G(),Me(fe,{key:0,modelValue:p.value,"onUpdate:modelValue":_[6]||(_[6]=I=>p.value=I),size:"small",style:{width:"92px","margin-left":"8px"},title:"按来源筛选(个人/团队)"},{default:P(()=>[R(j,{label:"全部",value:"all"}),R(j,{label:"个人",value:"personal"}),R(j,{label:"团队",value:"team"})]),_:1},8,["modelValue"])):Fe("",!0)]),de("div",w0,[R(ce,{type:"default",icon:Re(ms),size:"small",disabled:!t.value,onClick:_[7]||(_[7]=I=>es("character"))},{default:P(()=>[..._[61]||(_[61]=[he(" 风格设置 ",-1)])]),_:1},8,["icon","disabled"]),R(ce,{type:"info",icon:Re(Ha),size:"small",disabled:!Ze.value||b.value,loading:b.value&&g.value.type==="人物",onClick:_[8]||(_[8]=I=>ts("character"))},{default:P(()=>[..._[62]||(_[62]=[he(" 批量生图 ",-1)])]),_:1},8,["icon","disabled","loading"]),R(ce,{size:"small",onClick:_[9]||(_[9]=I=>fs("character"))},{default:P(()=>[R(at,null,{default:P(()=>[R(Re(Ti))]),_:1}),_[63]||(_[63]=he(" 批量导入 ",-1))]),_:1}),t.value?(G(),Me(ce,{key:0,type:"danger",size:"small",plain:"",onClick:_[10]||(_[10]=I=>cs("character"))},{default:P(()=>[..._[64]||(_[64]=[he(" 全部清空 ",-1)])]),_:1})):Fe("",!0),R(ce,{type:"primary",icon:Re(Wa),size:"small",onClick:_[11]||(_[11]=I=>Bt("character"))},{default:P(()=>[..._[65]||(_[65]=[he(" 手动添加 ",-1)])]),_:1},8,["icon"])])]),ir((G(),Ee("div",C0,[(G(!0),Ee(zt,null,Gt(_e.value,I=>(G(),Ee("div",{key:I.id,class:"element-card"},[de("div",R0,[de("div",P0,[de("h4",D0,Ke(I.name),1),I.remote_source==="team_asset"?(G(),Me(Ye,{key:0,type:"success",size:"small",effect:"dark",style:{"margin-left":"6px"}},{default:P(()=>[..._[66]||(_[66]=[he("团队",-1)])]),_:1})):y.value?(G(),Me(Ye,{key:1,type:"info",size:"small",style:{"margin-left":"6px"}},{default:P(()=>[..._[67]||(_[67]=[he("个人",-1)])]),_:1})):Fe("",!0),de("div",I0,[R(ce,{type:"primary",icon:Re(gs),size:"small",onClick:rt=>yn(I)},null,8,["icon","onClick"]),R(jt,{title:"确定删除此人物吗？","confirm-button-text":"确定","cancel-button-text":"取消",onConfirm:rt=>Gn(I)},{reference:P(()=>[R(ce,{type:"danger",icon:Re(_s),size:"small"},null,8,["icon"])]),_:1},8,["onConfirm"])])]),de("p",L0,Ke(I.description||"暂无描述"),1),I.aliases&&I.aliases.length>0?(G(),Ee("div",U0,[(G(!0),Ee(zt,null,Gt(I.aliases,rt=>(G(),Me(Ye,{key:rt,type:"info",size:"small",style:{margin:"2px"}},{default:P(()=>[he(Ke(rt),1)]),_:2},1024))),128))])):Fe("",!0)]),R(xs,{element:I,"selected-image-config-id":Ze.value,"generating-elements":st.value,onGenerate:Yi,onDeleteImage:Qr,onUploadReference:ns,onDeleteReference:is,onUploadFinished:as,onDeleteFinished:rs,onGenerateGrid:ss,onDeleteGrid:os,onUploadGrid:ls,onUploadAudio:us,onDeleteAudio:ds,onStopGenerating:qr,onGeneratePanorama:Yr,onUploadPanorama:Kr,onOpenVrViewer:jr,onDeletePanorama:Jr,onPanoramaToGrid:Zr,onOpenVariants:se},null,8,["element","selected-image-config-id","generating-elements"])]))),128))])),[[Rt,a.value]])]),_:1}),R(tn,{label:"场景",name:"scene"},{default:P(()=>[de("div",N0,[de("div",F0,[de("span",O0,"场景列表 ("+Ke(v.value.trim()?Pe.value.length+"/":"")+Ke(h.value.length)+")",1),R(Mt,{modelValue:v.value,"onUpdate:modelValue":_[12]||(_[12]=I=>v.value=I),placeholder:"搜索名称",clearable:"",size:"small",class:"tab-search","prefix-icon":Re(ps)},null,8,["modelValue","prefix-icon"]),y.value?(G(),Me(fe,{key:0,modelValue:p.value,"onUpdate:modelValue":_[13]||(_[13]=I=>p.value=I),size:"small",style:{width:"92px","margin-left":"8px"},title:"按来源筛选(个人/团队)"},{default:P(()=>[R(j,{label:"全部",value:"all"}),R(j,{label:"个人",value:"personal"}),R(j,{label:"团队",value:"team"})]),_:1},8,["modelValue"])):Fe("",!0)]),de("div",B0,[R(ce,{type:"default",icon:Re(ms),size:"small",disabled:!t.value,onClick:_[14]||(_[14]=I=>es("scene"))},{default:P(()=>[..._[68]||(_[68]=[he(" 风格设置 ",-1)])]),_:1},8,["icon","disabled"]),R(ce,{type:"info",icon:Re(Ha),size:"small",disabled:!Ze.value||b.value,loading:b.value&&g.value.type==="场景",onClick:_[15]||(_[15]=I=>ts("scene"))},{default:P(()=>[..._[69]||(_[69]=[he(" 批量生图 ",-1)])]),_:1},8,["icon","disabled","loading"]),R(ce,{size:"small",onClick:_[16]||(_[16]=I=>fs("scene"))},{default:P(()=>[R(at,null,{default:P(()=>[R(Re(Ti))]),_:1}),_[70]||(_[70]=he(" 批量导入 ",-1))]),_:1}),t.value?(G(),Me(ce,{key:0,type:"danger",size:"small",plain:"",onClick:_[17]||(_[17]=I=>cs("scene"))},{default:P(()=>[..._[71]||(_[71]=[he(" 全部清空 ",-1)])]),_:1})):Fe("",!0),R(ce,{type:"primary",icon:Re(Wa),size:"small",onClick:_[18]||(_[18]=I=>Bt("scene"))},{default:P(()=>[..._[72]||(_[72]=[he(" 手动添加 ",-1)])]),_:1},8,["icon"])])]),ir((G(),Ee("div",k0,[(G(!0),Ee(zt,null,Gt(Pe.value,I=>(G(),Ee("div",{key:I.id,class:"element-card"},[de("div",V0,[de("div",z0,[de("h4",G0,Ke(I.name),1),I.remote_source==="team_asset"?(G(),Me(Ye,{key:0,type:"success",size:"small",effect:"dark",style:{"margin-left":"6px"}},{default:P(()=>[..._[73]||(_[73]=[he("团队",-1)])]),_:1})):y.value?(G(),Me(Ye,{key:1,type:"info",size:"small",style:{"margin-left":"6px"}},{default:P(()=>[..._[74]||(_[74]=[he("个人",-1)])]),_:1})):Fe("",!0),de("div",H0,[R(ce,{type:"primary",icon:Re(gs),size:"small",onClick:rt=>yn(I)},null,8,["icon","onClick"]),R(jt,{title:"确定删除此场景吗？","confirm-button-text":"确定","cancel-button-text":"取消",onConfirm:rt=>Gn(I)},{reference:P(()=>[R(ce,{type:"danger",icon:Re(_s),size:"small"},null,8,["icon"])]),_:1},8,["onConfirm"])])]),de("p",W0,Ke(I.description||"暂无描述"),1),I.aliases&&I.aliases.length>0?(G(),Ee("div",X0,[(G(!0),Ee(zt,null,Gt(I.aliases,rt=>(G(),Me(Ye,{key:rt,type:"info",size:"small",style:{margin:"2px"}},{default:P(()=>[he(Ke(rt),1)]),_:2},1024))),128))])):Fe("",!0)]),R(xs,{element:I,"selected-image-config-id":Ze.value,"generating-elements":st.value,onGenerate:Yi,onDeleteImage:Qr,onUploadReference:ns,onDeleteReference:is,onUploadFinished:as,onDeleteFinished:rs,onGenerateGrid:ss,onDeleteGrid:os,onUploadGrid:ls,onUploadAudio:us,onDeleteAudio:ds,onStopGenerating:qr,onGeneratePanorama:Yr,onUploadPanorama:Kr,onOpenVrViewer:jr,onDeletePanorama:Jr,onPanoramaToGrid:Zr,onOpenVariants:se},null,8,["element","selected-image-config-id","generating-elements"])]))),128))])),[[Rt,a.value]])]),_:1}),R(tn,{label:"道具",name:"prop"},{default:P(()=>[de("div",$0,[de("div",q0,[de("span",Y0,"道具列表 ("+Ke(A.value.trim()?ue.value.length+"/":"")+Ke(u.value.length)+")",1),R(Mt,{modelValue:A.value,"onUpdate:modelValue":_[19]||(_[19]=I=>A.value=I),placeholder:"搜索名称",clearable:"",size:"small",class:"tab-search","prefix-icon":Re(ps)},null,8,["modelValue","prefix-icon"]),y.value?(G(),Me(fe,{key:0,modelValue:p.value,"onUpdate:modelValue":_[20]||(_[20]=I=>p.value=I),size:"small",style:{width:"92px","margin-left":"8px"},title:"按来源筛选(个人/团队)"},{default:P(()=>[R(j,{label:"全部",value:"all"}),R(j,{label:"个人",value:"personal"}),R(j,{label:"团队",value:"team"})]),_:1},8,["modelValue"])):Fe("",!0)]),de("div",K0,[R(ce,{type:"default",icon:Re(ms),size:"small",disabled:!t.value,onClick:_[21]||(_[21]=I=>es("prop"))},{default:P(()=>[..._[75]||(_[75]=[he(" 风格设置 ",-1)])]),_:1},8,["icon","disabled"]),R(ce,{type:"info",icon:Re(Ha),size:"small",disabled:!Ze.value||b.value,loading:b.value&&g.value.type==="道具",onClick:_[22]||(_[22]=I=>ts("prop"))},{default:P(()=>[..._[76]||(_[76]=[he(" 批量生图 ",-1)])]),_:1},8,["icon","disabled","loading"]),R(ce,{size:"small",onClick:_[23]||(_[23]=I=>fs("prop"))},{default:P(()=>[R(at,null,{default:P(()=>[R(Re(Ti))]),_:1}),_[77]||(_[77]=he(" 批量导入 ",-1))]),_:1}),t.value?(G(),Me(ce,{key:0,type:"danger",size:"small",plain:"",onClick:_[24]||(_[24]=I=>cs("prop"))},{default:P(()=>[..._[78]||(_[78]=[he(" 全部清空 ",-1)])]),_:1})):Fe("",!0),R(ce,{type:"primary",icon:Re(Wa),size:"small",onClick:_[25]||(_[25]=I=>Bt("prop"))},{default:P(()=>[..._[79]||(_[79]=[he(" 手动添加 ",-1)])]),_:1},8,["icon"])])]),ir((G(),Ee("div",Z0,[(G(!0),Ee(zt,null,Gt(ue.value,I=>(G(),Ee("div",{key:I.id,class:"element-card"},[de("div",j0,[de("div",J0,[de("h4",Q0,Ke(I.name),1),I.remote_source==="team_asset"?(G(),Me(Ye,{key:0,type:"success",size:"small",effect:"dark",style:{"margin-left":"6px"}},{default:P(()=>[..._[80]||(_[80]=[he("团队",-1)])]),_:1})):y.value?(G(),Me(Ye,{key:1,type:"info",size:"small",style:{"margin-left":"6px"}},{default:P(()=>[..._[81]||(_[81]=[he("个人",-1)])]),_:1})):Fe("",!0),de("div",ex,[R(ce,{type:"primary",icon:Re(gs),size:"small",onClick:rt=>yn(I)},null,8,["icon","onClick"]),R(jt,{title:"确定删除此道具吗？","confirm-button-text":"确定","cancel-button-text":"取消",onConfirm:rt=>Gn(I)},{reference:P(()=>[R(ce,{type:"danger",icon:Re(_s),size:"small"},null,8,["icon"])]),_:1},8,["onConfirm"])])]),de("p",tx,Ke(I.description||"暂无描述"),1),I.aliases&&I.aliases.length>0?(G(),Ee("div",nx,[(G(!0),Ee(zt,null,Gt(I.aliases,rt=>(G(),Me(Ye,{key:rt,type:"info",size:"small",style:{margin:"2px"}},{default:P(()=>[he(Ke(rt),1)]),_:2},1024))),128))])):Fe("",!0)]),R(xs,{element:I,"selected-image-config-id":Ze.value,"generating-elements":st.value,onGenerate:Yi,onDeleteImage:Qr,onUploadReference:ns,onDeleteReference:is,onUploadFinished:as,onDeleteFinished:rs,onGenerateGrid:ss,onDeleteGrid:os,onUploadGrid:ls,onUploadAudio:us,onDeleteAudio:ds,onStopGenerating:qr,onGeneratePanorama:Yr,onUploadPanorama:Kr,onOpenVrViewer:jr,onDeletePanorama:Jr,onPanoramaToGrid:Zr,onOpenVariants:se},null,8,["element","selected-image-config-id","generating-elements"])]))),128))])),[[Rt,a.value]])]),_:1})]),_:1},8,["modelValue"])]),_:1}),R(Jt,{modelValue:D.value,"onUpdate:modelValue":_[29]||(_[29]=I=>D.value=I),title:"反推资产到团队(待审)",width:"660px","destroy-on-close":"","close-on-click-modal":!S.value,"close-on-press-escape":!S.value},{footer:P(()=>[R(ce,{disabled:S.value,onClick:_[28]||(_[28]=I=>D.value=!1)},{default:P(()=>[..._[94]||(_[94]=[he("取消",-1)])]),_:1},8,["disabled"]),R(ce,{type:"primary",loading:S.value,disabled:!x.value||L.value.length===0||S.value,onClick:ve},{default:P(()=>[he(Ke(S.value?`推送中 ${O.value.current}/${O.value.total}`:`推送 ${L.value.length} 个`),1)]),_:1},8,["loading","disabled"])]),default:P(()=>[de("div",ix,[_[82]||(_[82]=de("span",null,"目标资产组:",-1)),R(fe,{modelValue:x.value,"onUpdate:modelValue":_[27]||(_[27]=I=>x.value=I),placeholder:"选择资产组",size:"small",style:{width:"240px"},loading:w.value},{default:P(()=>[(G(!0),Ee(zt,null,Gt(k.value,I=>(G(),Me(j,{key:I.groupId,label:`${I.name}(${I.assetCount??0})`,value:I.groupId},null,8,["label","value"]))),128))]),_:1},8,["modelValue","loading"]),!w.value&&k.value.length===0?(G(),Ee("span",ax,"该剧未绑定资产组,需团队主先在网页绑定")):Fe("",!0)]),de("div",rx,[he(" 勾选要推送的"+Ke(ee.value)+" → 进团队",1),_[83]||(_[83]=de("strong",null,"待审池",-1)),_[84]||(_[84]=he(",owner/admin 审核通过才入库。 ",-1)),_[85]||(_[85]=de("br",null,null,-1)),_[86]||(_[86]=he("会随成品图一起推送:人物马甲;场景/道具参考图、宫格图;场景720全景图。 ",-1)),_[87]||(_[87]=de("br",null,null,-1)),_[88]||(_[88]=he("人物音频:角色/马甲有成品图且有音频的会一并推送(音频随角色一起进待审,审核通过角色后自动绑定)。 ",-1))]),S.value||O.value.total>0?(G(),Ee("div",sx,[de("div",ox,[de("span",null,Ke(S.value?"正在推送":"推送完成"),1),de("span",null,Ke(O.value.current)+"/"+Ke(O.value.total),1)]),R(qe,{percentage:O.value.total?Math.round(O.value.current/O.value.total*100):0,status:O.value.failed>0&&!S.value?"warning":O.value.current>=O.value.total&&O.value.total>0?"success":void 0},null,8,["percentage","status"]),de("div",lx,[de("span",null,"成功 "+Ke(O.value.success)+" 个",1),de("span",null,"失败 "+Ke(O.value.failed)+" 个",1),O.value.currentName?(G(),Ee("span",cx,"当前: "+Ke(O.value.currentName),1)):Fe("",!0)])])):Fe("",!0),R(gn,{data:q.value,onSelectionChange:Y,"max-height":"340",size:"small",ref_key:"pushTableRef",ref:H},{default:P(()=>[R(Ct,{type:"selection",width:"44",selectable:I=>!!(I.finished_image||I.image_url)},null,8,["selectable"]),R(Ct,{prop:"name",label:"名称","min-width":"140","show-overflow-tooltip":""}),R(Ct,{label:"成品图",width:"76",align:"center"},{default:P(({row:I})=>[I.finished_image||I.image_url?(G(),Me(Ye,{key:0,type:"success",size:"small"},{default:P(()=>[..._[89]||(_[89]=[he("有",-1)])]),_:1})):(G(),Me(Ye,{key:1,type:"info",size:"small"},{default:P(()=>[..._[90]||(_[90]=[he("无",-1)])]),_:1}))]),_:1}),l.value==="character"?(G(),Me(Ct,{key:0,label:"音频",width:"76",align:"center"},{default:P(({row:I})=>[I.audio_file?(G(),Me(Ye,{key:0,type:"success",size:"small"},{default:P(()=>[..._[91]||(_[91]=[he("有",-1)])]),_:1})):(G(),Ee("span",ux,"—"))]),_:1})):Fe("",!0),R(Ct,{label:"来源",width:"76",align:"center"},{default:P(({row:I})=>[I.remote_source==="team_asset"?(G(),Me(Ye,{key:0,type:"warning",size:"small"},{default:P(()=>[..._[92]||(_[92]=[he("团队",-1)])]),_:1})):(G(),Me(Ye,{key:1,type:"info",size:"small"},{default:P(()=>[..._[93]||(_[93]=[he("个人",-1)])]),_:1}))]),_:1})]),_:1},8,["data"])]),_:1},8,["modelValue","close-on-click-modal","close-on-press-escape"]),R(Jt,{modelValue:re.value,"onUpdate:modelValue":_[35]||(_[35]=I=>re.value=I),title:W.value,width:"600px","close-on-click-modal":!1},{footer:P(()=>[R(ce,{onClick:_[34]||(_[34]=I=>re.value=!1)},{default:P(()=>[..._[100]||(_[100]=[he("取消",-1)])]),_:1}),R(ce,{type:"primary",loading:r.value,disabled:!Q.value,onClick:wt},{default:P(()=>[..._[101]||(_[101]=[he(" 开始提取 ",-1)])]),_:1},8,["loading","disabled"])]),default:P(()=>[R(nn,{model:N.value,"label-width":"120px"},{default:P(()=>[R(qt,{label:"提示词模板",required:""},{default:P(()=>[R(fe,{modelValue:N.value.template_id,"onUpdate:modelValue":_[30]||(_[30]=I=>N.value.template_id=I),placeholder:"选择模板",style:{width:"100%"}},{default:P(()=>[(G(!0),Ee(zt,null,Gt(ae.value,I=>(G(),Me(j,{key:I.id,label:I.name,value:I.id},{default:P(()=>[de("span",null,Ke(I.name),1),Re(ar)(I,we.value)==="strong"?(G(),Me(Ye,{key:0,size:"small",type:"success",style:{"margin-left":"6px"}},{default:P(()=>[..._[95]||(_[95]=[he("🎯 推荐",-1)])]),_:1})):Re(ar)(I,we.value)==="weak"?(G(),Me(Ye,{key:1,size:"small",type:"warning",style:{"margin-left":"6px"}},{default:P(()=>[..._[96]||(_[96]=[he("👍 可选",-1)])]),_:1})):Fe("",!0),I.is_preset?(G(),Me(Ye,{key:2,size:"small",type:"primary",style:{"margin-left":"6px"}},{default:P(()=>[..._[97]||(_[97]=[he("系统",-1)])]),_:1})):Fe("",!0)]),_:2},1032,["label","value"]))),128))]),_:1},8,["modelValue"]),ae.value.length===0?(G(),Ee("div",dx,' 暂无可用模板，请先到"提示词模板"页面创建 '+Ke(Oe.value==="character"?"人物提取":Oe.value==="scene"?"场景提取":"道具提取")+" 模板 ",1)):Fe("",!0)]),_:1}),R(qt,{label:"大模型配置",required:""},{default:P(()=>[R(fe,{modelValue:N.value.llm_config_id,"onUpdate:modelValue":_[31]||(_[31]=I=>N.value.llm_config_id=I),placeholder:"选择大模型配置",style:{width:"100%"}},{default:P(()=>[(G(!0),Ee(zt,null,Gt(Xe.value,I=>(G(),Me(j,{key:I.id,label:I.name,value:I.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"]),Xe.value.length===0?(G(),Ee("div",fx,' 暂无可用配置，请先到"大模型配置"页面添加 ')):Fe("",!0)]),_:1}),R(qt,{label:"章节范围"},{default:P(()=>[R(Hn,{modelValue:be.value,"onUpdate:modelValue":_[32]||(_[32]=I=>be.value=I)},{default:P(()=>[R(fn,{label:"all"},{default:P(()=>[..._[98]||(_[98]=[he("全部章节",-1)])]),_:1}),R(fn,{label:"selected"},{default:P(()=>[..._[99]||(_[99]=[he("指定章节",-1)])]),_:1})]),_:1},8,["modelValue"])]),_:1}),be.value==="selected"?(G(),Me(qt,{key:0,label:"选择章节"},{default:P(()=>[R(Wn,{modelValue:N.value.chapter_ids,"onUpdate:modelValue":_[33]||(_[33]=I=>N.value.chapter_ids=I),class:"chapter-checkbox-group"},{default:P(()=>[(G(!0),Ee(zt,null,Gt(n.value,I=>(G(),Me(Vt,{key:I.id,label:I.id},{default:P(()=>[he(Ke(I.title),1)]),_:2},1032,["label"]))),128))]),_:1},8,["modelValue"])]),_:1})):Fe("",!0)]),_:1},8,["model"])]),_:1},8,["modelValue","title"]),R(Jt,{modelValue:V.value,"onUpdate:modelValue":_[40]||(_[40]=I=>V.value=I),title:K.value,width:"600px"},{footer:P(()=>[R(ce,{onClick:_[39]||(_[39]=I=>V.value=!1)},{default:P(()=>[..._[103]||(_[103]=[he("取消",-1)])]),_:1}),R(ce,{type:"primary",onClick:zn},{default:P(()=>[..._[104]||(_[104]=[he("保存",-1)])]),_:1})]),default:P(()=>[R(nn,{model:ie.value,"label-width":"100px",rules:M,ref_key:"editFormRef",ref:Ce},{default:P(()=>[R(qt,{label:"名称",prop:"name",required:""},{default:P(()=>[R(Mt,{modelValue:ie.value.name,"onUpdate:modelValue":_[36]||(_[36]=I=>ie.value.name=I),placeholder:"请输入名称"},null,8,["modelValue"])]),_:1}),R(qt,{label:"描述"},{default:P(()=>[R(Mt,{modelValue:ie.value.description,"onUpdate:modelValue":_[37]||(_[37]=I=>ie.value.description=I),type:"textarea",rows:4,placeholder:"请输入描述"},null,8,["modelValue"])]),_:1}),R(qt,{label:"别名"},{default:P(()=>[de("div",hx,[(G(!0),Ee(zt,null,Gt(ie.value.aliases,(I,rt)=>(G(),Me(Ye,{key:rt,closable:"",onClose:Di=>ie.value.aliases.splice(rt,1),type:"info"},{default:P(()=>[he(Ke(I),1)]),_:2},1032,["onClose"]))),128))]),de("div",px,[R(Mt,{modelValue:Qe.value,"onUpdate:modelValue":_[38]||(_[38]=I=>Qe.value=I),placeholder:"输入别名后按回车添加",size:"small",style:{width:"200px"},onKeyup:Bu(kt,["enter"])},null,8,["modelValue"]),R(ce,{type:"primary",size:"small",onClick:kt},{default:P(()=>[..._[102]||(_[102]=[he("添加",-1)])]),_:1})])]),_:1})]),_:1},8,["model"])]),_:1},8,["modelValue","title"]),R(Jt,{modelValue:B.value,"onUpdate:modelValue":_[44]||(_[44]=I=>B.value=I),title:Ve.value,width:"600px","close-on-click-modal":!1},{footer:P(()=>[R(ce,{onClick:_[43]||(_[43]=I=>B.value=!1)},{default:P(()=>[..._[109]||(_[109]=[he("取消",-1)])]),_:1}),R(ce,{type:"primary",loading:Be.value,onClick:pu},{default:P(()=>[..._[110]||(_[110]=[he("保存",-1)])]),_:1},8,["loading"])]),default:P(()=>[de("div",mx,[de("p",gx," 设置本作品的"+Ke(Ie[ye.value])+"生成风格，这些设置将应用于所有"+Ke(Ie[ye.value])+"生成 ",1),R(nn,{"label-width":"100px"},{default:P(()=>[ye.value==="character"?(G(),Me(qt,{key:0,label:"模板预设"},{default:P(()=>[R(fe,{modelValue:xe.value,"onUpdate:modelValue":_[41]||(_[41]=I=>xe.value=I),style:{width:"100%"},onChange:ze,placeholder:"选预设会覆盖下方完整提示词"},{default:P(()=>[(G(),Ee(zt,null,Gt(Sn,I=>R(j,{key:I.value,label:I.label,value:I.value},null,8,["label","value"])),64))]),_:1},8,["modelValue"]),_[105]||(_[105]=de("div",{class:"style-hint"},"切换预设会**覆盖**下方完整提示词;选完仍可自由编辑。",-1))]),_:1})):Fe("",!0),R(qt,{label:"视觉风格"},{default:P(()=>[de("div",_x,[(G(),Ee(zt,null,Gt(it,I=>R(Ye,{key:Ca(I),type:Pa(I)?"primary":"info",effect:Pa(I)?"dark":"plain",class:"visual-style-tag",onClick:rt=>tr(I)},{default:P(()=>[he(Ke(Ca(I)),1)]),_:2},1032,["type","effect","onClick"])),64))]),_[106]||(_[106]=de("div",{class:"style-hint"},'点击标签快速插入到"视觉风格"段落;下方模板可完整自由编辑。',-1))]),_:1}),R(qt,{label:"完整提示词"},{default:P(()=>[R(Mt,{modelValue:ge.value.prefix_prompt,"onUpdate:modelValue":_[42]||(_[42]=I=>ge.value.prefix_prompt=I),type:"textarea",rows:18,placeholder:"首次打开自动填入预制模板，你可以自由修改",class:"style-prompt-textarea"},null,8,["modelValue"]),de("div",vx,[_[108]||(_[108]=he(" 生成图片时会自动把【角色信息】/【场景信息】/【道具信息】替换为每个元素的描述，其余部分原样保留。 ",-1)),R(ce,{size:"small",link:"",type:"primary",onClick:Xi},{default:P(()=>[..._[107]||(_[107]=[he("恢复默认模板",-1)])]),_:1})])]),_:1})]),_:1})])]),_:1},8,["modelValue","title"]),R(Jt,{modelValue:tt.value,"onUpdate:modelValue":_[48]||(_[48]=I=>tt.value=I),title:"制作宫格图",width:"500px","close-on-click-modal":!1},{footer:P(()=>[R(ce,{onClick:ul,disabled:gt.value},{default:P(()=>[..._[115]||(_[115]=[he("取消",-1)])]),_:1},8,["disabled"]),R(ce,{type:"primary",loading:gt.value,disabled:!ot.value,onClick:mu},{default:P(()=>[he(Ke(gt.value?"生成中...":"确认生成"),1)]),_:1},8,["loading","disabled"])]),default:P(()=>[ht.value?(G(),Ee("div",xx,[de("div",Mx,[_[111]||(_[111]=de("div",{class:"grid-preview-label"},"素材图片预览：",-1)),de("div",Sx,[de("div",yx,[R(Dn,{src:(()=>{const I=ht.value.finished_image||ht.value.image_url;return Re(pn)(I)})(),"preview-src-list":(()=>{const I=ht.value.finished_image||ht.value.image_url;return I?[Re(pn)(I)]:[]})(),fit:"cover","preview-teleported":"",style:{width:"200px",height:"200px","border-radius":"8px",cursor:"pointer"}},null,8,["src","preview-src-list"]),de("div",{class:"grid-download-btn",onClick:_[45]||(_[45]=Nn(I=>gu(ht.value.finished_image||ht.value.image_url,ht.value.name+"_素材.png"),["stop"])),title:"下载素材"},[R(at,null,{default:P(()=>[R(Re(pa))]),_:1})])])])]),R(nn,{"label-width":"140px",style:{"margin-top":"20px"}},{default:P(()=>[R(qt,{label:"宫格提示词模板",required:""},{default:P(()=>[R(fe,{modelValue:U.value,"onUpdate:modelValue":_[46]||(_[46]=I=>U.value=I),placeholder:"选择宫格提示词模板",style:{width:"100%"}},{default:P(()=>[(G(!0),Ee(zt,null,Gt(Le.value,I=>(G(),Me(j,{key:I.id,label:I.name,value:I.id},{default:P(()=>[de("span",null,Ke(I.name),1),Re(ar)(I,we.value)==="strong"?(G(),Me(Ye,{key:0,size:"small",type:"success",style:{"margin-left":"6px"}},{default:P(()=>[..._[112]||(_[112]=[he("🎯 推荐",-1)])]),_:1})):Re(ar)(I,we.value)==="weak"?(G(),Me(Ye,{key:1,size:"small",type:"warning",style:{"margin-left":"6px"}},{default:P(()=>[..._[113]||(_[113]=[he("👍 可选",-1)])]),_:1})):Fe("",!0),I.is_preset?(G(),Me(Ye,{key:2,size:"small",type:"primary",style:{"margin-left":"6px"}},{default:P(()=>[..._[114]||(_[114]=[he("系统",-1)])]),_:1})):Fe("",!0)]),_:2},1032,["label","value"]))),128))]),_:1},8,["modelValue"]),Le.value.length===0?(G(),Ee("div",Ex,' 暂无可用模板，请先到"提示词模板"页面创建 category=grid_image 的模板 ')):Fe("",!0)]),_:1}),R(qt,{label:"大语言模型",required:""},{default:P(()=>[R(fe,{modelValue:_t.value,"onUpdate:modelValue":_[47]||(_[47]=I=>_t.value=I),placeholder:"选择大语言模型",style:{width:"100%"}},{default:P(()=>[(G(!0),Ee(zt,null,Gt($e.value,I=>(G(),Me(j,{key:I.id,label:I.name,value:I.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"]),$e.value.length===0?(G(),Ee("div",bx,' 暂无可用配置，请先到"大模型配置"页面添加 ')):Fe("",!0)]),_:1})]),_:1}),de("div",Tx,[R(Pi,{title:"生成流程说明",type:"info",closable:!1,description:"1. 使用LLM根据模板和素材描述生成详细图片提示词  2. 使用图片模型基于提示词和成品图生成宫格图"})])])):Fe("",!0)]),_:1},8,["modelValue"]),R(Jt,{modelValue:Ci.value,"onUpdate:modelValue":_[51]||(_[51]=I=>Ci.value=I),title:"从其他小说同步",width:"700px"},{footer:P(()=>[R(ce,{onClick:_[50]||(_[50]=I=>Ci.value=!1)},{default:P(()=>[..._[119]||(_[119]=[he("取消",-1)])]),_:1}),R(ce,{type:"primary",onClick:xu,disabled:Ri.value.length===0,loading:La.value},{default:P(()=>[he(" 同步 "+Ke(Ri.value.length)+" 个元素 ",1)]),_:1},8,["disabled","loading"])]),default:P(()=>[de("div",Ax,[_[116]||(_[116]=de("span",null,"来源小说：",-1)),R(fe,{modelValue:Pn.value,"onUpdate:modelValue":_[49]||(_[49]=I=>Pn.value=I),placeholder:"选择来源小说",onChange:_u,style:{width:"300px"}},{default:P(()=>[(G(!0),Ee(zt,null,Gt(dt.value,I=>(G(),Me(j,{key:I.id,label:I.name,value:I.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])]),ir((G(),Ee("div",null,[R(gn,{data:Da.value,onSelectionChange:vu,ref_key:"syncTableRef",ref:$r,style:{width:"100%"},"max-height":"400"},{default:P(()=>[R(Ct,{type:"selection",width:"50",selectable:I=>!I.exists_in_target},null,8,["selectable"]),R(Ct,{label:"类型",width:"80"},{default:P(({row:I})=>[R(Ye,{type:I.element_type==="character"?"primary":I.element_type==="scene"?"success":"warning",size:"small"},{default:P(()=>[he(Ke(I.element_type==="character"?"人物":I.element_type==="scene"?"场景":"道具"),1)]),_:2},1032,["type"])]),_:1}),R(Ct,{prop:"name",label:"名称",width:"120"}),R(Ct,{prop:"description",label:"描述","show-overflow-tooltip":""}),R(Ct,{label:"资源",width:"120"},{default:P(({row:I})=>[I.has_finished_image?(G(),Ee("span",wx,"🖼️")):Fe("",!0),I.has_grid_image?(G(),Ee("span",Cx,"📐")):Fe("",!0),I.has_audio?(G(),Ee("span",Rx,"🔊")):Fe("",!0),!I.has_finished_image&&!I.has_grid_image&&!I.has_audio?(G(),Ee("span",Px,"无")):Fe("",!0)]),_:1}),R(Ct,{label:"状态",width:"100"},{default:P(({row:I})=>[I.exists_in_target?(G(),Me(Ye,{key:0,type:"info",size:"small"},{default:P(()=>[..._[117]||(_[117]=[he("已存在",-1)])]),_:1})):(G(),Me(Ye,{key:1,type:"success",size:"small"},{default:P(()=>[..._[118]||(_[118]=[he("可同步",-1)])]),_:1}))]),_:1})]),_:1},8,["data"])])),[[Rt,Ia.value]])]),_:1},8,["modelValue"]),de("input",{ref_key:"batchFileInput",ref:$i,type:"file",multiple:"",accept:".png,.jpg,.jpeg,.webp,.gif,.bmp",style:{display:"none"},onChange:bu},null,544),et.value?(G(),Me(Nv,{key:0,modelValue:De.value,"onUpdate:modelValue":_[52]||(_[52]=I=>De.value=I),"element-id":et.value.id,"element-name":et.value.name,"panorama-url":te.value,"has-existing-grid":!!et.value.grid_image,onScreenshotSaved:hu},null,8,["modelValue","element-id","element-name","panorama-url","has-existing-grid"])):Fe("",!0),R(d0,{modelValue:nt.value,"onUpdate:modelValue":_[53]||(_[53]=I=>nt.value=I),element:xt.value,"selected-image-config-id":Ze.value,onChanged:Ae},null,8,["modelValue","element","selected-image-config-id"])])}}}),kx=Vr(Ix,[["__scopeId","data-v-0ba2f757"]]);export{kx as default};
