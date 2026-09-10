const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-Cga1Ymz8.js","./index-B-9RxFvC.css","./extraction-Dj9Fe4Cz.js"])))=>i.map(i=>d[i]);
import{d as Ba,I as pr,a as L,f as ve,w as b,b as B,c as me,t as be,h as M,s as Q,F as Tt,g as we,C as yn,z as Rt,W as Sc,j as lt,r as re,E as W,A as ei,k as ft,_ as ka,i as Rn,T as Fn,v as oi,o as Vu,x as Bf,p as Fe,y as Cn,a0 as da,a1 as kf,a2 as $i,a3 as Pa,a4 as ls,B as cs,a5 as ur,a6 as Mc,a7 as Ec,N as Ti,M as Vf,Y as zf,a8 as Gf,D as zu,a9 as ss,aa as Hf,l as Wf,ab as $f,ac as Xf,ad as qf,ae as no,af as io,K as Ds,ag as Yf,ah as Kf,ai as Zf,aj as jf,ak as Jf,al as Qf,V as eh,am as ao,Z as Is,an as th,ao as bc,ap as nh,aq as ih}from"./index-Cga1Ymz8.js";import{getVoiceSourceRecommendation as ah,prepareVoiceSource as sh,cleanupVoiceSource as Tc,extractVoiceFromVideo as rh,importCustomVoiceAudio as oh,bindVariantVoice as wc,bindVoice as Ac,listVoices as Gu,deleteCustomVoice as lh,previewVoice as ch,listVariants as Ul,setActiveVariant as Hu,generateVariantImage as Wu,deleteVariantFinishedImage as $u,deleteVariantImage as uh,deleteVariantAudio as Xu,uploadVariantReferenceImage as Nl,deleteVariantReferenceImage as qu,uploadVariantAudio as Fl,uploadVariantFinishedImage as Ol,addVariantWatermark as dh,addElementWatermark as fh,appendVrScreenshotToGrid as hh,createVariant as Yu,updateVariant as Cc,deleteVariant as ph,getExtractionBatch as Rc,getActiveExtractionBatch as mh,getNovelElements as fa,uploadAudio as Pc,uploadReferenceImage as Dc,uploadGridImage as Ic,uploadPanorama as gh,uploadFinishedImage as Lc,createElement as Uc,saveImageStyle as Ja,stopExtractionBatch as vh,getImageStyle as Ls,analyzeStyleReference as _h,extractElements as xh,polishElementDescription as yh,updateElement as Nc,startExtractionBatch as Fc,getElement as Sh,submitElementImageGeneration as Mh,generateGridImage as Eh,deleteNovelElements as bh,syncPreview as Th,syncElements as wh,deleteElement as Ah,generateElementImage as Ch,cancelElementImage as Rh,deleteElementImage as Ph,deleteReferenceImage as Dh,deleteFinishedImage as Ih,deleteGridImage as Lh,deleteAudio as Uh}from"./extraction-Dj9Fe4Cz.js";import{d as Ku}from"./download-image-B3fgqpU9.js";import{getVolcConfig as Go,getVolcAssetStatus as Nh,safeDecrypt as Zu,uploadVolcAsset as Fh,uploadVolcVariant as Oh,getVolcVariantStatus as Bh}from"./extra-6J0jt3Z_.js";import{a as kh,x as Vh,d as zh}from"./novels-LmvSusht.js";import{g as Gh,a as Oc,m as Hh,b as Wh,c as so,d as ro,s as Bc}from"./llm_configs-C4L9Xiib.js";const $h={key:0,class:"vve-source-panel"},Xh={class:"vve-source-copy"},qh={class:"vve-drop-desc"},Yh={class:"vve-source-actions"},Kh={class:"vve-editor-grid"},Zh={class:"vve-video-shell"},jh=["src"],Jh={class:"vve-source-summary"},Qh=["title"],ep={class:"vve-summary-actions"},tp={key:0,class:"vve-preparing"},np={class:"vve-timeline-panel"},ip={class:"vve-range-head"},ap={key:0,class:"vve-wave-empty"},sp={class:"vve-timeline-actions"},rp={key:0,class:"vve-progress"},op=Ba({__name:"VideoVoiceExtractorDialog",props:{modelValue:{type:Boolean},elementId:{},variantId:{},characterName:{}},emits:["update:modelValue","extracted"],setup(i,{emit:e}){const t=i,n=e,a=lt({get:()=>t.modelValue,set:se=>n("update:modelValue",se)}),s=re(null),r=re(null),l=re(""),c=re(!1),u=re(""),h=re(""),m=re(0),d=re([]),g=re(0),x=re([0,5]),w=re(!1),v=re(!1),p=re(!1),T=re(!1),D=re(null),P=re(!1);let G=0;const U=lt(()=>v.value||p.value),K=lt(()=>Math.max(0,Number(x.value[0]||0))),y=lt(()=>Math.min(m.value,Number(x.value[1]||0))),C=lt(()=>Math.max(0,y.value-K.value)),de=lt(()=>C.value>=1.799&&C.value<=30.201),H=lt(()=>m.value?`${Math.min(100,Math.max(0,g.value/m.value*100))}%`:"0%"),ie=lt(()=>C.value>=5?"当前选区已达到 5 秒，不需要补足":w.value?"输出约 5.0 秒，原片段将按顺序重复并做短淡化衔接":`输出 ${C.value.toFixed(1)} 秒原始选区`),ae=lt(()=>P.value?"正在定位该人物最早出现的章节目录…":D.value?`推荐目录：${D.value.chapter_title?`${D.value.novel_name} / ${D.value.chapter_title}`:D.value.novel_name}；也可以切换到其他目录`:"可从任意目录选择，工具会先读取音轨波形供精确截取");async function oe(){P.value=!0;try{D.value=await ah(t.elementId)}catch{D.value=null}finally{P.value=!1}}function te(se){const q=Math.min(Math.max(se,0),5);x.value=[0,q],g.value=0}function F(){c.value&&l.value&&URL.revokeObjectURL(l.value),l.value="",c.value=!1}function O(){const se=h.value;h.value="",se&&Tc(se).catch(()=>{})}function he(){G+=1,O(),F(),u.value="",m.value=0,d.value=[],g.value=0,x.value=[0,5],w.value=!1,T.value=!1,s.value&&(s.value.value="")}function V(){he(),p.value=!1,v.value=!1}async function $(se){var We,et,k;if(U.value)return;const q=(We=window.electronAPI)==null?void 0:We.pickVideoFile;if(!q){(et=s.value)==null||et.click();return}const Te=await q(se?(k=D.value)==null?void 0:k.default_path:void 0);if(!Te.cancelled){if(!Te.success||!Te.path){W.error("选择视频失败: "+(Te.error||"未知错误"));return}he(),u.value=Te.name||Te.path.split(/[\\/]/).pop()||"视频素材",l.value=Te.url||"",c.value=!1,await _e({localPath:Te.path})}}async function Me(se){var We;const q=se.target,Te=((We=q.files)==null?void 0:We[0])||null;if(Te){if(Te.size>1024*1024*1024){W.error("视频文件超过 1GB，请先裁出包含对白的片段"),q.value="";return}he(),u.value=Te.name,l.value=URL.createObjectURL(Te),c.value=!0,await _e({file:Te})}}async function _e(se){const q=++G;p.value=!0;try{const Te=await sh({file:se.file,local_path:se.localPath});if(q!==G){Tc(Te.source_token).catch(()=>{});return}h.value=Te.source_token,u.value=Te.filename||u.value,m.value=Number(Te.duration||0),d.value=Te.waveform||[],F(),l.value=ei(Te.media_url),te(m.value),m.value<2&&W.warning("视频有效音轨不足 2 秒，无法作为即梦人物音色")}catch(Te){q===G&&(W.error("读取音轨失败: "+((Te==null?void 0:Te.message)||Te)),he(),p.value=!1)}finally{q===G&&(p.value=!1)}}function Ie(){var q;const se=Number(((q=r.value)==null?void 0:q.duration)||0);Number.isFinite(se)&&se>0&&!m.value&&(m.value=se,te(se))}function ke(){var se,q;g.value=Number(((se=r.value)==null?void 0:se.currentTime)||0),T.value&&g.value>=y.value-.03&&((q=r.value)==null||q.pause(),T.value=!1)}function mt(){var se;T.value=!1,(se=r.value)==null||se.pause(),r.value&&(r.value.currentTime=K.value)}function pe(){const se=Math.min(g.value,Math.max(0,y.value-2));x.value=[Number(se.toFixed(1)),y.value],mt()}function Pe(){const se=Math.max(g.value,Math.min(m.value,K.value+2));x.value=[K.value,Number(Math.min(se,m.value).toFixed(1))],mt()}async function Le(){if(!(!r.value||!de.value)){if(T.value){r.value.pause(),T.value=!1;return}r.value.currentTime=K.value,T.value=!0;try{await r.value.play()}catch{T.value=!1}}}function ut(se){if(!r.value||!m.value)return;const q=se.currentTarget.getBoundingClientRect(),Te=Math.min(1,Math.max(0,(se.clientX-q.left)/Math.max(q.width,1)));r.value.currentTime=Te*m.value}function xe(se){if(!d.value.length||!m.value)return!1;const q=(se+.5)/d.value.length*m.value;return q>=K.value&&q<=y.value}function Ye(se){const q=Math.max(0,Number(se)||0),Te=Math.floor(q/60),We=q-Te*60;return`${Te}:${We.toFixed(1).padStart(4,"0")}`}async function It(){var se;if(!(!h.value||!de.value)){v.value=!0,T.value=!1,(se=r.value)==null||se.pause();try{const q=await rh({element_id:t.elementId,variant_id:t.variantId,source_token:h.value,start_time:K.value,duration:C.value,repeat_to_seconds:w.value&&C.value<5?5:null});n("extracted",q);const Te=q.report.repeated?"，已循环补足到 5 秒":"";W.success(`已去除背景音并绑定${Te}，有效人声覆盖约 ${Math.round(q.report.speech_ratio*100)}%`),a.value=!1}catch(q){W.error("提取失败: "+((q==null?void 0:q.message)||q))}finally{v.value=!1}}}return pr(he),(se,q)=>{const Te=ft("el-button"),We=ft("el-slider"),et=ft("el-checkbox"),k=ft("el-alert"),_t=ft("el-dialog");return L(),ve(_t,{modelValue:a.value,"onUpdate:modelValue":q[7]||(q[7]=Ve=>a.value=Ve),title:`从视频提取人物音色${i.characterName?" · "+i.characterName:""}`,width:"min(920px, calc(100vw - 32px))",top:"3vh","append-to-body":"","destroy-on-close":"","close-on-click-modal":!U.value,"close-on-press-escape":!U.value,"show-close":!U.value,class:"video-voice-extractor-dialog",onOpen:oe,onClosed:V},{footer:b(()=>[v.value?(L(),me("span",rp,"正在分离人声，CPU 处理可能需要数分钟，请勿关闭窗口…")):we("",!0),M(Te,{disabled:U.value,onClick:q[6]||(q[6]=Ve=>a.value=!1)},{default:b(()=>[...q[22]||(q[22]=[Q("取消",-1)])]),_:1},8,["disabled"]),M(Te,{type:"primary",loading:v.value,disabled:!h.value||!de.value||p.value,onClick:It},{default:b(()=>[...q[23]||(q[23]=[Q(" 提取人声、去背景音并绑定 ",-1)])]),_:1},8,["loading","disabled"])]),default:b(()=>[B("input",{ref_key:"videoInput",ref:s,type:"file",accept:"video/*,.mkv,.ts",class:"vve-file-input",onChange:Me},null,544),l.value?(L(),me(Tt,{key:1},[B("div",Kh,[B("div",Zh,[B("video",{ref_key:"videoEl",ref:r,src:l.value,controls:"",preload:"metadata",onLoadedmetadata:Ie,onTimeupdate:ke},null,40,jh)]),B("aside",Jh,[q[15]||(q[15]=B("span",{class:"vve-kicker"},"当前素材",-1)),B("strong",{class:"vve-file-name",title:u.value},be(u.value),9,Qh),B("span",null,be(Ye(m.value))+" · "+be(d.value.length)+" 个波形采样",1),B("div",ep,[M(Te,{size:"small",disabled:U.value,onClick:q[2]||(q[2]=Ve=>$(!0))},{default:b(()=>[...q[12]||(q[12]=[Q("章节目录",-1)])]),_:1},8,["disabled"]),M(Te,{size:"small",disabled:U.value,onClick:q[3]||(q[3]=Ve=>$(!1))},{default:b(()=>[...q[13]||(q[13]=[Q("更换视频",-1)])]),_:1},8,["disabled"])]),p.value?(L(),me("div",tp,[...q[14]||(q[14]=[B("span",{class:"vve-pulse"},null,-1),Q("正在读取音轨并生成波形… ",-1)])])):we("",!0)])]),B("section",np,[B("div",ip,[B("div",null,[q[16]||(q[16]=B("span",{class:"vve-kicker"},"对白音轨选区",-1)),B("strong",null,be(Ye(K.value))+" - "+be(Ye(y.value)),1)]),B("div",{class:yn(["vve-range-stats",{"is-invalid":!de.value}])}," 已选 "+be(C.value.toFixed(1))+" 秒 ",3)]),B("div",{class:"vve-waveform",onClick:ut},[(L(!0),me(Tt,null,Rt(d.value,(Ve,yt)=>(L(),me("span",{key:yt,class:yn(["vve-wave-bar",{"is-selected":xe(yt)}]),style:Sc({height:`${Math.max(8,Ve*88)}%`})},null,6))),128)),p.value||!d.value.length?(L(),me("div",ap,be(p.value?"正在分析音轨…":"等待音轨波形"),1)):we("",!0),B("div",{class:"vve-playhead",style:Sc({left:H.value})},null,4)]),M(We,{modelValue:x.value,"onUpdate:modelValue":q[4]||(q[4]=Ve=>x.value=Ve),range:"",min:0,max:Math.max(m.value,.1),step:.1,disabled:U.value||!h.value,"format-tooltip":Ye,class:"vve-range-slider",onChange:mt},null,8,["modelValue","max","disabled"]),B("div",sp,[M(Te,{size:"small",disabled:U.value||!h.value,onClick:pe},{default:b(()=>[...q[17]||(q[17]=[Q(" 当前播放位置设为起点 ",-1)])]),_:1},8,["disabled"]),M(Te,{size:"small",disabled:U.value||!h.value,onClick:Pe},{default:b(()=>[...q[18]||(q[18]=[Q(" 当前播放位置设为终点 ",-1)])]),_:1},8,["disabled"]),M(Te,{size:"small",disabled:U.value||!de.value,onClick:Le},{default:b(()=>[Q(be(T.value?"停止试听":"试听选区"),1)]),_:1},8,["disabled"]),q[19]||(q[19]=B("span",{class:"vve-range-help"},"单次选区 2–30 秒；Seedance 2.0 提交时仍按 15 秒上限复核",-1))]),B("div",{class:yn(["vve-repeat-row",{"is-active":w.value&&C.value<5}])},[M(et,{modelValue:w.value,"onUpdate:modelValue":q[5]||(q[5]=Ve=>w.value=Ve),disabled:U.value||C.value>=5},{default:b(()=>[...q[20]||(q[20]=[Q(" 选区不足 5 秒时循环补足到 5 秒 ",-1)])]),_:1},8,["modelValue","disabled"]),B("span",null,be(ie.value),1)],2)])],64)):(L(),me("div",$h,[B("div",Xh,[q[8]||(q[8]=B("div",{class:"vve-drop-title"},"选择只有目标人物清晰开口的视频",-1)),B("div",qh,be(ae.value),1)]),B("div",Yh,[M(Te,{type:"primary",loading:P.value||p.value,onClick:q[0]||(q[0]=Ve=>$(!0))},{default:b(()=>[...q[9]||(q[9]=[Q(" 从推荐目录选择 ",-1)])]),_:1},8,["loading"]),M(Te,{disabled:p.value,onClick:q[1]||(q[1]=Ve=>$(!1))},{default:b(()=>[...q[10]||(q[10]=[Q("从其他位置选择",-1)])]),_:1},8,["disabled"])]),q[11]||(q[11]=B("div",{class:"vve-format-note"},"支持 MP4、MOV、MKV、WebM 等格式，视频总时长不限，单文件不超过 1GB",-1))])),M(k,{class:"vve-note",type:"info",closable:!1,"show-icon":"",title:"本地 AI 会分离人声并尽量去除背景音乐、环境声和伴奏"},{default:b(()=>[...q[21]||(q[21]=[Q(" 全程在本机处理。多人重叠说话无法可靠拆成单个人，请在波形上选择只有目标人物开口的区域；循环补足只是重复选中片段，不会生成新台词。 ",-1)])]),_:1})]),_:1},8,["modelValue","title","close-on-click-modal","close-on-press-escape","show-close"])}}}),lp=ka(op,[["__scopeId","data-v-63e41ebc"]]),cp={class:"vp-toolbar"},up={key:0,class:"vp-import-panel"},dp=["title"],fp={class:"vp-video-panel"},hp={key:1,class:"vp-empty"},pp={key:2,class:"vp-empty"},mp={key:3,class:"vp-list"},gp=["onClick"],vp={class:"vp-item-main"},_p={class:"vp-item-head"},xp={class:"vp-item-name"},yp={class:"vp-item-desc"},Sp={class:"vp-item-actions"},Mp={class:"vp-footer-sel"},Ep=Ba({__name:"VoicePickerDialog",props:{modelValue:{type:Boolean},elementId:{},variantId:{},characterName:{},boundVoiceId:{}},emits:["update:modelValue","bound"],setup(i,{emit:e}){const t=i,n=e,a=lt({get:()=>t.modelValue,set:F=>n("update:modelValue",F)}),s=re([]),r=re(!1),l=re(""),c=re("all"),u=re(""),h=re(null),m=re(null),d=re(t.boundVoiceId??null),g=re(null),x=re(!1),w=re(!1),v=re(!1);let p=null;const T=lt(()=>{const F=l.value.trim().toLowerCase();return s.value.filter(O=>{const he=O.source||(O.is_custom?"custom":"preset");if(c.value==="custom"){if(he!=="custom")return!1}else if(c.value!=="all"&&(O.gender||"")!==c.value)return!1;return!(F&&!`${O.label} ${O.voice_id}`.toLowerCase().includes(F))})}),D=lt(()=>{const F=s.value.find(O=>O.voice_id===d.value);return F?F.label:d.value||""});async function P(){r.value=!0;try{if(s.value=(await Gu(t.elementId)).voices||[],!d.value){const F=s.value.find(O=>O.current_audio);F&&(d.value=F.voice_id)}d.value&&!s.value.find(F=>F.voice_id===d.value)&&s.value.unshift({voice_id:d.value,label:"已绑定音色",gender:"",source:"custom",is_custom:!0})}catch(F){s.value=[],W.error("加载音色库失败: "+((F==null?void 0:F.message)||F))}finally{r.value=!1}}async function G(){d.value=t.boundVoiceId??null,l.value="",c.value="all",u.value="",h.value=null,m.value&&(m.value.value=""),await P()}function U(F){d.value=F.voice_id}function K(){var F;(F=m.value)==null||F.click()}function y(F){var he;const O=F.target;h.value=((he=O.files)==null?void 0:he[0])||null,h.value&&!u.value.trim()&&(u.value=h.value.name.replace(/\.[^.]+$/,""))}async function C(){var O;const F=u.value.trim();if(!F){W.warning("请填写音色名称");return}if(!h.value){W.warning("请选择音频文件");return}w.value=!0;try{const he=await oh({element_id:t.elementId,label:F,file:h.value});s.value=he.voices||[],d.value=((O=he.voice)==null?void 0:O.voice_id)||null,c.value="custom",u.value="",h.value=null,m.value&&(m.value.value=""),W.success("已导入到我的音色")}catch(he){W.error("导入失败: "+((he==null?void 0:he.message)||he))}finally{w.value=!1}}function de(F){s.value=F.voices||[],d.value=F.voice_id,c.value="custom",n("bound",F.voice_id,F.audio_file,F.updated_at)}function H(F){const O=F.source||(F.is_custom?"custom":"preset");if(O==="custom"&&(F.kind==="audio"||F.audio_file))return F.auto_audio?"我的 · 角色已有音频":"我的 · 外部音频";const he={male:"男声",female:"女声",child:"童声"};return O==="custom"?`我的 · ${he[F.gender||""]||"音色"}`:he[F.gender||""]||"预制音色"}async function ie(F){try{await Fn.confirm("删除后不会自动解绑已绑定角色,确定删除这个自定义音色吗?","删除我的音色",{type:"warning",confirmButtonText:"删除",cancelButtonText:"取消"})}catch{return}try{const O=await lh(F);s.value=O.voices||[],d.value===F&&!s.value.find(he=>he.voice_id===F)&&(d.value=null),W.success("已删除")}catch(O){W.error("删除失败: "+((O==null?void 0:O.message)||O))}}async function ae(F){g.value=F;try{const O=await ch(t.elementId,F),he=ei(O.audio_url)+"?t="+Date.now();p||(p=new Audio),p.pause(),p.src=he,await p.play()}catch(O){W.error("试听失败: "+((O==null?void 0:O.message)||O))}finally{g.value=null}}async function oe(){if(d.value){x.value=!0;try{const F=t.variantId?await wc(t.variantId,d.value):await Ac(t.elementId,d.value);d.value=F.voice_id,n("bound",F.voice_id,F.audio_file,F.updated_at),W.success("已绑定音色"),a.value=!1}catch(F){W.error("绑定失败: "+((F==null?void 0:F.message)||F))}finally{x.value=!1}}}async function te(){x.value=!0;try{await(t.variantId?wc(t.variantId,null):Ac(t.elementId,null)),n("bound",null,null,new Date().toISOString()),W.success("已清除音色绑定"),a.value=!1}catch(F){W.error("清除失败: "+((F==null?void 0:F.message)||F))}finally{x.value=!1}}return(F,O)=>{const he=ft("el-input"),V=ft("el-radio-button"),$=ft("el-radio-group"),Me=ft("el-button"),_e=ft("el-dialog");return L(),me(Tt,null,[M(_e,{modelValue:a.value,"onUpdate:modelValue":O[5]||(O[5]=Ie=>a.value=Ie),title:`音色库${i.characterName?" · "+i.characterName:""}`,width:"720px",top:"5vh","destroy-on-close":"","append-to-body":"",class:"voice-picker-dialog",onOpen:G},{footer:b(()=>[B("span",Mp,be(d.value?"已选: "+D.value:"未选择"),1),M(Me,{onClick:O[4]||(O[4]=Ie=>a.value=!1)},{default:b(()=>[...O[19]||(O[19]=[Q("取消",-1)])]),_:1}),i.boundVoiceId?(L(),ve(Me,{key:0,onClick:te},{default:b(()=>[...O[20]||(O[20]=[Q("清除绑定",-1)])]),_:1})):we("",!0),M(Me,{type:"primary",disabled:!d.value,loading:x.value,onClick:oe},{default:b(()=>[...O[21]||(O[21]=[Q(" 确认绑定 ",-1)])]),_:1},8,["disabled","loading"])]),default:b(()=>{var Ie;return[B("div",cp,[M(he,{modelValue:l.value,"onUpdate:modelValue":O[0]||(O[0]=ke=>l.value=ke),placeholder:"搜索音色名…",clearable:"",size:"small",class:"vp-search"},null,8,["modelValue"]),M($,{modelValue:c.value,"onUpdate:modelValue":O[1]||(O[1]=ke=>c.value=ke),size:"small"},{default:b(()=>[M(V,{label:"all"},{default:b(()=>[...O[7]||(O[7]=[Q("全部",-1)])]),_:1}),M(V,{label:"male"},{default:b(()=>[...O[8]||(O[8]=[Q("男声",-1)])]),_:1}),M(V,{label:"female"},{default:b(()=>[...O[9]||(O[9]=[Q("女声",-1)])]),_:1}),M(V,{label:"child"},{default:b(()=>[...O[10]||(O[10]=[Q("童声",-1)])]),_:1}),M(V,{label:"custom"},{default:b(()=>[...O[11]||(O[11]=[Q("我的",-1)])]),_:1})]),_:1},8,["modelValue"])]),c.value==="custom"?(L(),me("div",up,[O[14]||(O[14]=B("div",{class:"vp-import-title"},"导入外部音色",-1)),M(he,{modelValue:u.value,"onUpdate:modelValue":O[2]||(O[2]=ke=>u.value=ke),placeholder:"给这段音频命名",clearable:"",size:"small"},null,8,["modelValue"]),B("input",{ref_key:"audioInputRef",ref:m,class:"vp-file-input",type:"file",accept:".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/*",onChange:y},null,544),M(Me,{size:"small",onClick:K},{default:b(()=>[...O[12]||(O[12]=[Q("选择音频",-1)])]),_:1}),B("span",{class:"vp-file-name",title:((Ie=h.value)==null?void 0:Ie.name)||""},be(h.value?h.value.name:"未选择音频"),9,dp),M(Me,{type:"primary",size:"small",disabled:!u.value.trim()||!h.value,loading:w.value,onClick:C},{default:b(()=>[...O[13]||(O[13]=[Q(" 导入 ",-1)])]),_:1},8,["disabled","loading"])])):we("",!0),B("div",fp,[O[16]||(O[16]=B("div",null,[B("div",{class:"vp-import-title"},"从视频提取人物音色"),B("div",{class:"vp-video-desc"},"选择约 5 秒单人对白，本地 AI 自动去除背景音乐和环境声并直接绑定。")],-1)),M(Me,{type:"success",plain:"",size:"small",onClick:O[3]||(O[3]=ke=>v.value=!0)},{default:b(()=>[...O[15]||(O[15]=[Q("从视频提取",-1)])]),_:1})]),r.value?(L(),me("div",hp,"加载音色库中…")):T.value.length?(L(),me("div",mp,[(L(!0),me(Tt,null,Rt(T.value,ke=>(L(),me("div",{key:`${ke.source||"preset"}:${ke.voice_id}`,class:yn(["vp-item",{"is-selected":d.value===ke.voice_id}]),onClick:mt=>U(ke)},[B("div",vp,[B("div",_p,[B("span",xp,be(ke.label),1),B("span",{class:yn(["vp-tag",ke.source==="custom"?"is-custom":"is-preset"])},be(ke.source==="custom"?"我的":"预制"),3)]),B("span",yp,be(H(ke)),1)]),B("div",Sp,[M(Me,{size:"small",text:"",loading:g.value===ke.voice_id,onClick:Rn(mt=>ae(ke.voice_id),["stop"])},{default:b(()=>[...O[17]||(O[17]=[Q("▶ 试听",-1)])]),_:1},8,["loading","onClick"]),ke.source==="custom"&&!ke.auto_audio?(L(),ve(Me,{key:0,size:"small",text:"",type:"danger",onClick:Rn(mt=>ie(ke.voice_id),["stop"])},{default:b(()=>[...O[18]||(O[18]=[Q("删除",-1)])]),_:1},8,["onClick"])):we("",!0)])],10,gp))),128))])):(L(),me("div",pp," 没有匹配的音色。 "))]}),_:1},8,["modelValue","title"]),M(lp,{modelValue:v.value,"onUpdate:modelValue":O[6]||(O[6]=Ie=>v.value=Ie),"element-id":i.elementId,"variant-id":i.variantId,"character-name":i.characterName,onExtracted:de},null,8,["modelValue","element-id","variant-id","character-name"])],64)}}}),ju=ka(Ep,[["__scopeId","data-v-8f8d828c"]]),bp={class:"element-image-section"},Tp={key:0,class:"variant-bar"},wp=["title"],Ap={class:"images-row"},Cp={class:"image-item main-item"},Rp={class:"image-label"},Pp=["title"],Dp=["title"],Ip={key:0,class:"stop-overlay"},Lp=["title"],Up={key:0,class:"image-item grid-item"},Np={key:1,class:"image-placeholder generating"},Fp={class:"image-item ref-item"},Op=["title"],Bp={key:1,class:"image-item panorama-item"},kp={key:1,class:"image-placeholder generating"},Vp={key:2,class:"image-placeholder"},zp={key:2,class:"image-item audio-item"},Gp=["title"],Hp={class:"audio-content voice-entry-content"},Wp={key:0,class:"voice-bound-mark"},$p=["title"],Xp=["title"],qp={class:"actions-row"},Yp={key:0},Kp=["src"],Zp=3e4,jp=Ba({__name:"ElementImageSection",props:{element:{},selectedImageConfigId:{},generatingElements:{}},emits:["generate","deleteImage","uploadReference","deleteReference","uploadFinished","deleteFinished","generateGrid","deleteGrid","uploadGrid","uploadAudio","deleteAudio","stopGenerating","generatePanorama","uploadPanorama","openVrViewer","deletePanorama","panoramaToGrid","openVariants","variantsChanged"],setup(i,{expose:e,emit:t}){const n=new Map;async function a(N,I=!1){const Y=Number(N.novel_id||0);I&&n.delete(Y);const ue=n.get(Y);if(ue&&ue.expiresAt>Date.now())return ue.promise;const Ce=Gu(N.id).then(st=>{const De={};for(const Ht of st.voices||[])De[Ht.voice_id]=Ht.label;return De}).catch(st=>{throw n.delete(Y),st});return n.set(Y,{expiresAt:Date.now()+Zp,promise:Ce}),Ce}const s=i,r=t,l=re([]),c=lt(()=>{if(s.element.element_type!=="character")return null;const N=s.element.active_variant_id;return N&&l.value.find(I=>I.id===N)||null});function u(N,I=Date.now()){return N&&(N.includes("?")?`${N}&t=${I}`:`${N}?t=${I}`)}const h=lt(()=>{var N;return((N=c.value)==null?void 0:N.reference_image)||s.element.reference_image}),m=lt(()=>{var N,I;return(N=c.value)!=null&&N.reference_image?(I=c.value)==null?void 0:I.updated_at:s.element.updated_at}),d=lt(()=>{var N;return((N=c.value)==null?void 0:N.audio_file)||s.element.audio_file}),g=lt(()=>{var N,I;return(N=c.value)!=null&&N.audio_file?(I=c.value)==null?void 0:I.updated_at:s.element.updated_at}),x=lt(()=>{const N=c.value;return N!=null&&N.finished_image?{url:N.finished_image,source:"variant",field:"finished_image",version:N.updated_at}:N!=null&&N.image_url?{url:N.image_url,source:"variant",field:"image_url",version:N.updated_at}:s.element.finished_image?{url:s.element.finished_image,source:"body",field:"finished_image",version:s.element.updated_at}:s.element.image_url?{url:s.element.image_url,source:"body",field:"image_url",version:s.element.updated_at}:null}),w=lt(()=>{const N=x.value,I=c.value;return N?N.source==="variant"?I==null?void 0:I.image_status:s.element.image_status:I&&I.image_status?I.image_status:s.element.image_status}),v=lt(()=>{const N=c.value;return!!(N&&N.reference_image)}),p=lt(()=>{const N=c.value;return!!(N&&N.audio_file)}),T=lt(()=>{const N=c.value;return N?!!N.finished_image:!!s.element.finished_image}),D=lt(()=>{const N=c.value;return N?!!N.image_url:!!s.element.image_url}),P=lt(()=>{const N=c.value;return N&&N.image_status==="generating"?"variant":s.generatingElements.has(s.element.id)||s.element.image_status==="generating"?"body":null}),G=re(!1);async function U(N=!1){if(s.element.element_type!=="character"){l.value=[],G.value=!0;return}if(!(G.value&&!N))try{l.value=await Ul(s.element.id)}catch{l.value=[]}finally{G.value=!0}}function K(N){N&&U()}oi(()=>[s.element.id,s.element.variant_count,s.element.active_variant_id],([N,I,Y],ue)=>{(!ue||N!==ue[0])&&(G.value=!1),Number(I||0)>0||Number(Y||0)>0||G.value?U(!0):l.value=[]});async function y(N){const I=N&&N>0?N:null;try{if(await Hu(s.element.id,I),s.element.active_variant_id=I,I===null)s.element.active_variant_name=null,W.success("已切回本体形象");else{const Y=l.value.find(ue=>ue.id===I);s.element.active_variant_name=(Y==null?void 0:Y.variant_name)||null,W.success(`已切到「${Y==null?void 0:Y.variant_name}」 — 之后视频生成都用此形象`)}r("variantsChanged",s.element)}catch(Y){W.error(`切换马甲失败: ${(Y==null?void 0:Y.message)||Y}`)}}function C(){r("openVariants",s.element)}const de=re(null),H=re(!1),ie=re(null),ae=re(null),oe=re(!1),te=re(!1);let F=null,O=null,he=null;async function V(){if(he!==null){oe.value=he;return}if(O){oe.value=await O;return}O=(async()=>{try{he=!!(await Go()).has_credentials}catch{he=!1}return he})(),oe.value=await O}async function $(){try{const N=await Go();if(!N.has_credentials)return null;const I=await Zu(N.sk_encrypted);return I?{ak:N.ak,sk:I,project:N.project_name||"default"}:null}catch(N){return console.error("[volc-asset] 拿凭证失败",N),null}}async function Me(){var N,I;if(!te.value){te.value=!0;try{const Y=await $();if(!Y){W.warning("请先到「设置 → 通用设置 → 火山方舟素材库」配置 AK/SK");return}const ue=await Fh({element_id:s.element.id,ak:Y.ak,sk:Y.sk,project_name:Y.project});ue.success?(s.element.volc_asset_id=ue.asset_id,s.element.volc_asset_uri=ue.asset_uri,s.element.volc_asset_status=ue.status,W.success(ue.message||"已提交,审核中..."),_e()):W.error("加白失败")}catch(Y){W.error("加白失败: "+(((I=(N=Y==null?void 0:Y.response)==null?void 0:N.data)==null?void 0:I.detail)||(Y==null?void 0:Y.message)||Y))}finally{te.value=!1}}}function _e(){Ie(),F=setInterval(async()=>{if(s.element.volc_asset_status!=="Processing"){Ie();return}try{const I=await $();if(!I){Ie();return}const Y=await Nh({asset_id:s.element.id,ak:I.ak,sk:I.sk,project_name:I.project});Y.status&&Y.status!=="Processing"&&(s.element.volc_asset_status=Y.status,Y.status==="Active"?W.success(`${s.element.name} 已加白入库 ✅`):Y.status==="Failed"&&W.error(`${s.element.name} 加白审核失败`),Ie())}catch{}},3e3)}function Ie(){F&&(clearInterval(F),F=null)}Vu(()=>{V(),s.element.volc_asset_status==="Processing"&&_e(),(Number(s.element.variant_count||0)>0||Number(s.element.active_variant_id||0)>0)&&U(),fe()}),e({reloadVariants:U}),Bf(()=>{Ie()});function ke(){var N,I,Y;(Y=(I=(N=ie.value)==null?void 0:N.$el)==null?void 0:I.querySelector("input"))==null||Y.click()}function mt(N,I){return I?zu(N,I):ei(N)}async function pe(){const N=c.value;if(N){if(!s.selectedImageConfigId){W.warning('请先在顶部选择"图片模型配置"');return}N.image_status="generating";try{const I=Date.now(),Y=await Wu(N.id,s.selectedImageConfigId);if(Y.success){N.image_url=u(Y.image_url,I),N.image_status="success",W.success(`马甲「${N.variant_name}」生图成功`),await U();const ue=l.value.find(Ce=>Ce.id===N.id);ue!=null&&ue.image_url&&(ue.image_url=u(ue.image_url,I))}else N.image_status="error",W.error("生成失败: "+(Y.message||"未知错误"))}catch(I){N.image_status="error",W.error("生成失败: "+((I==null?void 0:I.message)||I))}return}r("generate",s.element)}function Pe(){r("stopGenerating",s.element)}function Le(){r("deleteImage",s.element)}async function ut(){const N=x.value;if(N){if(N.source==="variant"){const I=c.value;try{N.field==="finished_image"?(await $u(I.id),I.finished_image=null):(await uh(I.id),I.image_url=null,I.image_status=null),W.success(`已删除马甲「${I.variant_name}」${N.field==="finished_image"?"成品":"生成"}图`),await U()}catch(Y){W.error("删除马甲图失败: "+((Y==null?void 0:Y.message)||Y))}return}N.field==="finished_image"?q():Le()}}async function xe(){const N=c.value;if(N&&N.audio_file){try{const I=await Xu(N.id);N.audio_file=null,N.updated_at=I.updated_at||new Date().toISOString(),W.success(`已删除马甲「${N.variant_name}」音频`),await U()}catch(I){W.error("删除马甲音频失败: "+((I==null?void 0:I.message)||I))}return}Ae()}async function Ye(N){const I=c.value;if(I){const Y=(N==null?void 0:N.raw)||N;if(!Y)return;try{const ue=Date.now(),Ce=await Nl(I.id,Y);I.reference_image=u(Ce.reference_image,ue),W.success(`已为马甲「${I.variant_name}」上传参考图`),await U();const st=l.value.find(De=>De.id===I.id);st!=null&&st.reference_image&&(st.reference_image=u(st.reference_image,ue))}catch(ue){W.error("上传参考图失败: "+((ue==null?void 0:ue.message)||ue))}return}r("uploadReference",s.element,N)}async function It(){const N=c.value;if(N&&N.reference_image){try{await qu(N.id),N.reference_image=null,W.success(`已删除马甲「${N.variant_name}」参考图`),await U()}catch(I){W.error("删除马甲参考图失败: "+((I==null?void 0:I.message)||I))}return}r("deleteReference",s.element)}async function se(N){const I=c.value;if(I){const Y=(N==null?void 0:N.raw)||N;if(!Y)return;try{const ue=Date.now(),Ce=await Ol(I.id,Y);I.finished_image=u(Ce.finished_image,ue),W.success(`已为马甲「${I.variant_name}」导入成品图`),await U();const st=l.value.find(De=>De.id===I.id);st!=null&&st.finished_image&&(st.finished_image=u(st.finished_image,ue))}catch(ue){W.error("上传成品图失败: "+((ue==null?void 0:ue.message)||ue))}return}r("uploadFinished",s.element,N)}function q(){r("deleteFinished",s.element)}function Te(){r("generateGrid",s.element)}function We(){r("generatePanorama",s.element)}function et(N){r("uploadPanorama",s.element,N)}function k(){r("openVrViewer",s.element)}function _t(){r("deletePanorama",s.element)}function Ve(){r("panoramaToGrid",s.element)}function yt(){r("deleteGrid",s.element)}function Ke(N){r("uploadGrid",s.element,N)}function R(N,I){if(!N)return"";if(!I)return ei(N);const Y=N.includes("?")?"&":"?";return ei(`${N}${Y}t=${encodeURIComponent(I)}`)}const _=re(!1),j=re(s.element.voice_id??null),ge=re({});oi(()=>s.element.voice_id,N=>{j.value=N??null});const ye=lt(()=>{const N=j.value;return N?ge.value[N]||N:d.value?"已导入音频":"未配置音色"});async function fe(N=!1){if(s.element.element_type==="character")try{ge.value=await a(s.element,N)}catch{ge.value={}}}function je(N,I,Y){j.value=N,c.value||(s.element.voice_id=N),I!==void 0&&(c.value?(c.value.audio_file=I,c.value.updated_at=Y||new Date().toISOString()):(s.element.audio_file=I,s.element.updated_at=Y||new Date().toISOString())),fe(!0)}function Oe(){_.value=!0}function Qe(){H.value=!1}async function rt(N){const I=c.value;if(I){const Y=(N==null?void 0:N.raw)||N;if(!Y)return;try{const ue=await Fl(I.id,Y);I.audio_file=ue.audio_file,I.updated_at=ue.updated_at||new Date().toISOString(),W.success(`已为马甲「${I.variant_name}」上传音频`),await U()}catch(ue){W.error("上传音频失败: "+((ue==null?void 0:ue.message)||ue))}return}r("uploadAudio",s.element,N)}function Ae(){r("deleteAudio",s.element),H.value=!1}const Re=re(!1);async function qe(){var I,Y;if(Re.value)return;let N=!1;try{await Fn.confirm(`是否启用「面部覆盖模式」?

• 单脸图(常规人物立绘): 关 → 居中红色"此图由AI生成"水印
• 多脸图(三视图/表情图): 开 → 每张人脸单独打小"AI"标识

不知道选哪个就关。`,"打 AI 合规标识",{confirmButtonText:"开启面部覆盖",cancelButtonText:"关闭(默认)",type:"info",distinguishCancelAndClose:!0}),N=!0}catch(ue){if(ue==="close")return;N=!1}Re.value=!0;try{const ue=c.value,Ce=ue?await dh(ue.id,{face_mode:N}):await fh(s.element.id,{face_mode:N});if(Ce.success){W.success((ue?`马甲「${ue.variant_name}」`:"")+(Ce.message||"已打 AI 合规标识"));const st=Date.now();if(ue)Ce.updated_at&&(ue.updated_at=Ce.updated_at),Ce.target_field==="finished_image"&&ue.finished_image?ue.finished_image=ue.finished_image.includes("?")?ue.finished_image:`${ue.finished_image}?t=${st}`:Ce.target_field==="image_url"&&ue.image_url&&(ue.image_url=ue.image_url.includes("?")?ue.image_url:`${ue.image_url}?t=${st}`),await U();else if(Ce.updated_at&&(s.element.updated_at=Ce.updated_at),Ce.target_field==="finished_image"&&s.element.finished_image){const De=s.element.finished_image;s.element.finished_image=De.includes("?")?De:`${De}?t=${st}`}else if(Ce.target_field==="image_url"&&s.element.image_url){const De=s.element.image_url;s.element.image_url=De.includes("?")?De:`${De}?t=${st}`}}else W.error("打标失败")}catch(ue){W.error("打标失败: "+(((Y=(I=ue==null?void 0:ue.response)==null?void 0:I.data)==null?void 0:Y.detail)||(ue==null?void 0:ue.message)||ue))}finally{Re.value=!1}}async function tt(){try{const{request:N}=await ss(async()=>{const{request:Ce}=await import("./index-Cga1Ymz8.js").then(st=>st.aL);return{request:Ce}},__vite__mapDeps([0,1]),import.meta.url),I=c.value,Y=I?`/api/extraction/element/${s.element.id}/full-prompt?variant_id=${I.id}`:`/api/extraction/element/${s.element.id}/full-prompt`,ue=await N(Y,{method:"GET"});if(!ue.success||!ue.prompt){W.warning(ue.message||(I?"该马甲和本体都没有描述,无法复制":"该元素没有描述,无法复制"));return}try{await navigator.clipboard.writeText(ue.prompt),W.success((I?`马甲「${I.variant_name}」`:"")+"提示词已复制,可粘贴到豆包/MidJourney 等工具")}catch{const Ce=document.createElement("textarea");Ce.value=ue.prompt,Ce.style.position="fixed",Ce.style.opacity="0",document.body.appendChild(Ce),Ce.select(),document.execCommand("copy"),document.body.removeChild(Ce),W.success("提示词已复制")}}catch(N){W.error("复制失败: "+(N.message||"未知错误"))}}async function Ge(N,I){if(!N)return;const Y=I||N.split("/").pop()||"image.png";await Ku(ei(N),Y)}function ct(){const N=x.value;if(!N)return;const I=N.source==="variant"&&c.value?`_${c.value.variant_name}`:"",Y=N.field==="finished_image"?"成品图":"生成图";Ge(N.url,`${s.element.name}${I}_${Y}.png`)}function Z(){s.element.grid_image&&Ge(s.element.grid_image,`${s.element.name}_宫格图.png`)}function Se(){s.element.panorama_url&&Ge(s.element.panorama_url,`${s.element.name}_全景图.png`)}function Ue(){const N=h.value;if(!N)return;const I=c.value?`_${c.value.variant_name}`:"";Ge(N,`${s.element.name}${I}_参考图.png`)}return(N,I)=>{var kn,wt,Yt,hn,cn,un,dn,qt;const Y=ft("el-option"),ue=ft("el-select"),Ce=ft("el-link"),st=ft("el-image"),De=ft("el-icon"),Ht=ft("el-upload"),Vt=ft("el-tag");return L(),me("div",bp,[i.element.element_type==="character"?(L(),me("div",Tp,[I[2]||(I[2]=B("span",{class:"variant-label"},"马甲:",-1)),M(ue,{"model-value":i.element.active_variant_id??0,size:"small",class:"variant-select",onVisibleChange:K,onChange:y},{default:b(()=>[M(Y,{value:0,label:"本体"}),(L(!0),me(Tt,null,Rt(l.value,En=>(L(),ve(Y,{key:En.id,value:En.id,label:En.variant_name},null,8,["value","label"]))),128))]),_:1},8,["model-value"]),M(Ce,{type:"primary",underline:!1,size:"small",onClick:C,class:"variant-manage"},{default:b(()=>[Q(" 管理("+be(l.value.length)+") ",1)]),_:1}),i.element.active_variant_name?(L(),me("span",{key:0,class:"variant-tag",title:`当前生成使用「${i.element.active_variant_name}」的素材`}," 🎭 "+be(i.element.active_variant_name),9,wp)):we("",!0)])):we("",!0),B("div",Ap,[B("div",Cp,[B("div",Rp,[Q(be(((kn=x.value)==null?void 0:kn.field)==="finished_image"?"成品":"生成"),1),((wt=x.value)==null?void 0:wt.source)==="variant"?(L(),me("span",{key:0,class:"display-mark",title:`显示马甲「${(Yt=c.value)==null?void 0:Yt.variant_name}」`},"🎭",8,Pp)):we("",!0)]),B("div",{class:yn(["image-box main-box",{"has-image":!!x.value}])},[x.value?(L(),ve(st,{key:0,src:mt(x.value.url,x.value.version),fit:"cover",lazy:"","scroll-container":".main-content","preview-src-list":[mt(x.value.url,x.value.version)],"preview-teleported":"",class:"element-image"},null,8,["src","preview-src-list"])):P.value?(L(),me("div",{key:1,class:"image-placeholder generating",onClick:I[0]||(I[0]=Rn(En=>P.value==="body"?Pe():void 0,["stop"])),title:P.value==="variant"?`马甲「${(hn=c.value)==null?void 0:hn.variant_name}」生图中,暂不支持取消`:"点击停止生成"},[M(De,{class:"is-loading gen-loading"},{default:b(()=>[M(Fe(Cn))]),_:1}),P.value==="body"?(L(),me("div",Ip,[M(De,null,{default:b(()=>[M(Fe(da))]),_:1}),I[3]||(I[3]=B("span",null,"停止",-1))])):we("",!0)],8,Dp)):w.value==="error"||w.value==="failed"?(L(),me("div",{key:2,class:"image-placeholder error",onClick:pe,title:"点击重试"},[M(De,null,{default:b(()=>[M(Fe(kf))]),_:1})])):(L(),me("div",{key:3,class:"image-placeholder",onClick:pe},[M(De,null,{default:b(()=>[M(Fe($i))]),_:1})])),x.value?(L(),me("div",{key:4,class:"download-btn",onClick:Rn(ct,["stop"]),title:"下载图片"},[M(De,null,{default:b(()=>[M(Fe(Pa))]),_:1})])):we("",!0),x.value?(L(),me("div",{key:5,class:"delete-btn",onClick:Rn(ut,["stop"]),title:x.value.source==="variant"?`删除马甲「${(cn=c.value)==null?void 0:cn.variant_name}」${x.value.field==="finished_image"?"成品":"生成"}图`:x.value.field==="finished_image"?"删除成品图":"删除生成图"},[M(De,null,{default:b(()=>[M(Fe(da))]),_:1})],8,Lp)):we("",!0)],2)]),i.element.element_type!=="character"?(L(),me("div",Up,[I[5]||(I[5]=B("div",{class:"image-label grid-label-text"},"宫格",-1)),B("div",{class:yn(["image-box grid-box",{"has-image":i.element.grid_image}])},[i.element.grid_image&&!i.element.grid_generating?(L(),ve(st,{key:0,src:mt(i.element.grid_image,i.element.updated_at),fit:"cover",lazy:"","scroll-container":".main-content","preview-src-list":[mt(i.element.grid_image,i.element.updated_at)],"preview-teleported":"",class:"grid-image"},null,8,["src","preview-src-list"])):i.element.grid_generating?(L(),me("div",Np,[M(De,{class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1}),I[4]||(I[4]=B("span",{class:"generating-text"},"生成中...",-1))])):(L(),me("div",{key:2,class:"image-placeholder",onClick:Te},[M(De,null,{default:b(()=>[M(Fe(ls))]),_:1})])),i.element.grid_image?(L(),me("div",{key:3,class:"download-btn",onClick:Rn(Z,["stop"]),title:"下载宫格图"},[M(De,null,{default:b(()=>[M(Fe(Pa))]),_:1})])):we("",!0),i.element.grid_image?(L(),me("div",{key:4,class:"delete-btn",onClick:Rn(yt,["stop"]),title:"删除宫格图"},[M(De,null,{default:b(()=>[M(Fe(da))]),_:1})])):we("",!0)],2)])):we("",!0),B("div",Fp,[I[6]||(I[6]=B("div",{class:"image-label ref-label-text"},"参考",-1)),B("div",{class:yn(["image-box ref-box",{"has-image":h.value}])},[h.value?(L(),ve(st,{key:0,src:mt(h.value,m.value),fit:"cover",lazy:"","scroll-container":".main-content","preview-src-list":[mt(h.value,m.value)],"preview-teleported":"",class:"reference-image"},null,8,["src","preview-src-list"])):(L(),me("div",{key:1,class:"image-placeholder upload-trigger",onClick:ke},[M(De,null,{default:b(()=>[M(Fe(cs))]),_:1})])),h.value?(L(),me("div",{key:2,class:"download-btn",onClick:Rn(Ue,["stop"]),title:"下载参考图"},[M(De,null,{default:b(()=>[M(Fe(Pa))]),_:1})])):we("",!0),h.value?(L(),me("div",{key:3,class:"delete-btn",onClick:Rn(It,["stop"]),title:v.value?`删除马甲「${(un=c.value)==null?void 0:un.variant_name}」参考图`:"删除参考图"},[M(De,null,{default:b(()=>[M(Fe(da))]),_:1})],8,Op)):we("",!0)],2)]),i.element.element_type==="scene"?(L(),me("div",Bp,[I[8]||(I[8]=B("div",{class:"image-label"},"全景",-1)),B("div",{class:yn(["image-box pano-box",{"has-image":i.element.panorama_url}])},[i.element.panorama_url&&!i.element.panorama_generating?(L(),ve(st,{key:0,src:mt(i.element.panorama_url,i.element.updated_at),fit:"cover",lazy:"","scroll-container":".main-content","preview-src-list":[mt(i.element.panorama_url,i.element.updated_at)],"preview-teleported":"",class:"pano-image"},null,8,["src","preview-src-list"])):i.element.panorama_generating?(L(),me("div",kp,[M(De,{class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1}),I[7]||(I[7]=B("span",{class:"generating-text"},"生成中...",-1))])):(L(),me("div",Vp,[M(De,null,{default:b(()=>[M(Fe(ur))]),_:1})])),i.element.panorama_url?(L(),me("div",{key:3,class:"vr-btn",onClick:Rn(k,["stop"]),title:"VR 360° 查看"},[M(De,null,{default:b(()=>[M(Fe(Mc))]),_:1})])):we("",!0),i.element.panorama_url?(L(),me("div",{key:4,class:"download-btn",onClick:Rn(Se,["stop"]),title:"下载全景图"},[M(De,null,{default:b(()=>[M(Fe(Pa))]),_:1})])):we("",!0)],2)])):we("",!0),i.element.element_type==="character"?(L(),me("div",zp,[I[9]||(I[9]=B("div",{class:"image-label audio-label-text"},"音频",-1)),B("div",{class:yn(["image-box audio-box voice-entry-box",{"has-audio":d.value,"has-voice":!!j.value}]),title:`点击选择/绑定音色。参考音频请用下方「导入音频」。当前音色:${ye.value}`,onClick:Oe},[B("div",Hp,[M(De,{class:yn(["audio-icon",{"has-voice":!!j.value}])},{default:b(()=>[M(Fe(Ec))]),_:1},8,["class"]),j.value?(L(),me("span",Wp,"✓")):we("",!0)]),d.value?(L(),me("div",{key:0,class:"delete-btn audio-delete-btn",onClick:Rn(xe,["stop"]),title:p.value?`删除马甲「${(dn=c.value)==null?void 0:dn.variant_name}」音频`:"删除音频"},[M(De,null,{default:b(()=>[M(Fe(da))]),_:1})],8,$p)):we("",!0)],10,Gp),B("div",{class:"audio-voice-label",title:ye.value},be(ye.value),9,Xp)])):we("",!0)]),i.element.element_type==="character"?(L(),ve(ju,{key:1,modelValue:_.value,"onUpdate:modelValue":I[1]||(I[1]=En=>_.value=En),"element-id":i.element.id,"variant-id":((qt=c.value)==null?void 0:qt.id)||null,"character-name":i.element.name,"bound-voice-id":j.value,onBound:je},null,8,["modelValue","element-id","variant-id","character-name","bound-voice-id"])):we("",!0),B("div",qp,[(c.value?c.value.reference_image:i.element.reference_image)?we("",!0):(L(),ve(Ht,{key:0,ref_key:"referenceUploadRef",ref:ie,"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:Ye,class:"action-link"},{default:b(()=>[M(Ce,{type:"success",underline:!1,size:"small"},{default:b(()=>[M(De,null,{default:b(()=>[M(Fe(cs))]),_:1}),I[10]||(I[10]=Q("上传参考图 ",-1))]),_:1})]),_:1},512)),T.value?we("",!0):(L(),ve(Ht,{key:1,"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:se,class:"action-link"},{default:b(()=>[M(Ce,{type:"info",underline:!1,size:"small"},{default:b(()=>[M(De,null,{default:b(()=>[M(Fe(Ti))]),_:1}),I[11]||(I[11]=Q("导入成品图 ",-1))]),_:1})]),_:1})),!T.value&&(!D.value||w.value==="error"||w.value==="failed")?(L(),ve(Ce,{key:2,type:"primary",underline:!1,size:"small",disabled:!i.selectedImageConfigId||P.value!==null,onClick:pe,class:"action-link",title:c.value?`给马甲「${c.value.variant_name}」生图`:""},{default:b(()=>[P.value===null?(L(),ve(De,{key:0},{default:b(()=>[M(Fe($i))]),_:1})):(L(),ve(De,{key:1,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})),Q(" "+be(w.value==="error"||w.value==="failed"?"重试生成":"生成图片"),1)]),_:1},8,["disabled","title"])):we("",!0),i.element.element_type!=="character"&&(i.element.finished_image||i.element.image_url)?(L(),ve(Ce,{key:3,type:"warning",underline:!1,size:"small",disabled:i.element.grid_generating,onClick:Te,class:"action-link"},{default:b(()=>[i.element.grid_generating?(L(),ve(De,{key:1,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})):(L(),ve(De,{key:0},{default:b(()=>[M(Fe(ls))]),_:1})),I[12]||(I[12]=Q(" 制作宫格图 ",-1))]),_:1},8,["disabled"])):we("",!0),i.element.element_type!=="character"&&!i.element.grid_image?(L(),ve(Ht,{key:4,"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:Ke,class:"action-link"},{default:b(()=>[M(Ce,{type:"warning",underline:!1,size:"small"},{default:b(()=>[M(De,null,{default:b(()=>[M(Fe(Ti))]),_:1}),I[13]||(I[13]=Q("导入宫格图 ",-1))]),_:1})]),_:1})):we("",!0),i.element.element_type==="scene"&&!i.element.panorama_url?(L(),ve(Ce,{key:5,type:"primary",underline:!1,size:"small",disabled:i.element.panorama_generating||i.element.panorama_uploading,onClick:We,class:"action-link",title:"用 AI 试出全景图(通用模型仅供尝试,质量推荐用 LibTV 等专业工具产出后上传)"},{default:b(()=>[i.element.panorama_generating?(L(),ve(De,{key:1,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})):(L(),ve(De,{key:0},{default:b(()=>[M(Fe(ur))]),_:1})),I[14]||(I[14]=Q(" 生成全景图 ",-1))]),_:1},8,["disabled"])):we("",!0),i.element.element_type==="scene"&&!i.element.panorama_url?(L(),ve(Ht,{key:6,"show-file-list":!1,"auto-upload":!1,accept:"image/png,image/jpeg,image/webp",onChange:et,class:"action-link"},{default:b(()=>[M(Ce,{type:"primary",underline:!1,size:"small",disabled:i.element.panorama_uploading||i.element.panorama_generating},{default:b(()=>[i.element.panorama_uploading?(L(),ve(De,{key:1,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})):(L(),ve(De,{key:0},{default:b(()=>[M(Fe(Ti))]),_:1})),I[15]||(I[15]=Q(" 上传全景图 ",-1))]),_:1},8,["disabled"])]),_:1})):we("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(L(),ve(Ce,{key:7,type:"primary",underline:!1,size:"small",disabled:i.element.panorama_grid_building||i.element.panorama_generating||i.element.panorama_uploading,onClick:Ve,class:"action-link",title:"按每 40° 自动拆 9 张透视图,拼成 3×3 宫格写到 grid_image"},{default:b(()=>[i.element.panorama_grid_building?(L(),ve(De,{key:1,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})):(L(),ve(De,{key:0},{default:b(()=>[M(Fe(ls))]),_:1})),I[16]||(I[16]=Q(" 一键拆9视图 ",-1))]),_:1},8,["disabled"])):we("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(L(),ve(Ce,{key:8,type:"success",underline:!1,size:"small",disabled:i.element.vr_capturing||i.element.panorama_generating||i.element.panorama_uploading,onClick:k,class:"action-link",title:"进入 360° 查看器,自己选视角截图累加到宫格"},{default:b(()=>[M(De,null,{default:b(()=>[M(Fe(Mc))]),_:1}),I[17]||(I[17]=Q(" VR 查看截图 ",-1))]),_:1},8,["disabled"])):we("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(L(),ve(Ce,{key:9,type:"primary",underline:!1,size:"small",disabled:i.element.panorama_generating||i.element.panorama_uploading,onClick:We,class:"action-link",title:"重新生成一张全景图"},{default:b(()=>[i.element.panorama_generating?(L(),ve(De,{key:1,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})):(L(),ve(De,{key:0},{default:b(()=>[M(Fe(Vf))]),_:1})),I[18]||(I[18]=Q(" 重新生成 ",-1))]),_:1},8,["disabled"])):we("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(L(),ve(Ht,{key:10,"show-file-list":!1,"auto-upload":!1,accept:"image/png,image/jpeg,image/webp",onChange:et,class:"action-link"},{default:b(()=>[M(Ce,{type:"primary",underline:!1,size:"small",disabled:i.element.panorama_uploading||i.element.panorama_generating,title:"用新的全景图替换"},{default:b(()=>[i.element.panorama_uploading?(L(),ve(De,{key:1,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})):(L(),ve(De,{key:0},{default:b(()=>[M(Fe(Ti))]),_:1})),I[19]||(I[19]=Q(" 上传替换 ",-1))]),_:1},8,["disabled"])]),_:1})):we("",!0),i.element.element_type==="scene"&&i.element.panorama_url?(L(),ve(Ce,{key:11,type:"danger",underline:!1,size:"small",disabled:i.element.panorama_generating||i.element.panorama_uploading,onClick:_t,class:"action-link"},{default:b(()=>[M(De,null,{default:b(()=>[M(Fe(da))]),_:1}),I[20]||(I[20]=Q(" 清除全景 ",-1))]),_:1},8,["disabled"])):we("",!0),(i.element.finished_image||i.element.image_url)&&oe.value&&(!i.element.volc_asset_status||i.element.volc_asset_status==="Failed")?(L(),ve(Ce,{key:12,type:"primary",underline:!1,size:"small",disabled:te.value,onClick:Me,class:"action-link"},{default:b(()=>[te.value?(L(),ve(De,{key:1,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})):(L(),me("span",Yp,"🔐 "+be(i.element.volc_asset_status==="Failed"?"重试加白":"加白入库"),1))]),_:1},8,["disabled"])):i.element.volc_asset_status==="Processing"?(L(),ve(Vt,{key:13,type:"warning",size:"small",class:"action-link",title:"火山审核中,自动 2 秒轮询..."},{default:b(()=>[...I[21]||(I[21]=[Q(" ⏳ 加白审核中 ",-1)])]),_:1})):i.element.volc_asset_status==="Active"?(L(),ve(Vt,{key:14,type:"success",size:"small",class:"action-link",title:"已加白入库,视频生成时会自动用 "+i.element.volc_asset_uri},{default:b(()=>[...I[22]||(I[22]=[Q(" 🔒 已加白 ",-1)])]),_:1},8,["title"])):we("",!0),i.element.element_type==="character"&&!i.element.audio_file?(L(),ve(Ht,{key:15,ref_key:"audioUploadRef",ref:ae,"show-file-list":!1,"auto-upload":!1,accept:"audio/*",onChange:rt,class:"action-link"},{default:b(()=>[M(Ce,{type:"success",underline:!1,size:"small"},{default:b(()=>[M(De,null,{default:b(()=>[M(Fe(Ec))]),_:1}),I[23]||(I[23]=Q("导入音频 ",-1))]),_:1})]),_:1},512)):we("",!0),M(Ce,{type:"info",underline:!1,size:"small",onClick:tt,class:"action-link",title:"复制风格+描述的完整提示词,粘贴到豆包/MidJourney 等外部工具"},{default:b(()=>[M(De,null,{default:b(()=>[M(Fe(zf))]),_:1}),I[24]||(I[24]=Q("复制提示词 ",-1))]),_:1}),i.element.element_type==="character"&&(i.element.finished_image||i.element.image_url)?(L(),ve(Ce,{key:16,type:"warning",underline:!1,size:"small",onClick:qe,disabled:Re.value,class:"action-link",title:"给当前人物图打『此图由AI生成』红色半透明水印,规避即梦真人审核(多脸图选面部覆盖模式)"},{default:b(()=>[Re.value?(L(),ve(De,{key:0,class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1})):(L(),ve(De,{key:1},{default:b(()=>[M(Fe(Gf))]),_:1})),Q(" "+be(Re.value?"打标中...":"打 AI 标"),1)]),_:1},8,["disabled"])):we("",!0)]),M(Ht,{ref_key:"referenceUploadRef",ref:ie,"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:Ye,style:{display:"none"}},null,512),M(Ht,{ref_key:"audioUploadRef",ref:ae,"show-file-list":!1,"auto-upload":!1,accept:"audio/*",onChange:rt,style:{display:"none"}},null,512),(L(),me("audio",{ref_key:"audioPlayer",ref:de,key:d.value?R(d.value,g.value):"",src:d.value?R(d.value,g.value):"",onEnded:Qe,style:{display:"none"}},null,40,Kp))])}}}),oo=ka(jp,[["__scopeId","data-v-2d2496b6"]]);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Bl="183",Jp=0,kc=1,Qp=2,ar=1,em=2,rs=3,Yi=0,Pn=1,wi=2,Ci=0,Da=1,Vc=2,zc=3,Gc=4,tm=5,aa=100,nm=101,im=102,am=103,sm=104,rm=200,om=201,lm=202,cm=203,Ho=204,Wo=205,um=206,dm=207,fm=208,hm=209,pm=210,mm=211,gm=212,vm=213,_m=214,$o=0,Xo=1,qo=2,La=3,Yo=4,Ko=5,Zo=6,jo=7,Ju=0,xm=1,ym=2,ui=0,Qu=1,ed=2,td=3,nd=4,id=5,ad=6,sd=7,rd=300,la=301,Ua=302,lo=303,co=304,mr=306,Jo=1e3,Ai=1001,Qo=1002,vn=1003,Sm=1004,Us=1005,Sn=1006,uo=1007,ra=1008,Xn=1009,od=1010,ld=1011,fs=1012,kl=1013,hi=1014,li=1015,Pi=1016,Vl=1017,zl=1018,hs=1020,cd=35902,ud=35899,dd=1021,fd=1022,ti=1023,Di=1026,oa=1027,hd=1028,Gl=1029,Na=1030,Hl=1031,Wl=1033,sr=33776,rr=33777,or=33778,lr=33779,el=35840,tl=35841,nl=35842,il=35843,al=36196,sl=37492,rl=37496,ol=37488,ll=37489,cl=37490,ul=37491,dl=37808,fl=37809,hl=37810,pl=37811,ml=37812,gl=37813,vl=37814,_l=37815,xl=37816,yl=37817,Sl=37818,Ml=37819,El=37820,bl=37821,Tl=36492,wl=36494,Al=36495,Cl=36283,Rl=36284,Pl=36285,Dl=36286,Mm=3200,Em=0,bm=1,Xi="",On="srgb",Fa="srgb-linear",dr="linear",kt="srgb",ha=7680,Hc=519,Tm=512,wm=513,Am=514,$l=515,Cm=516,Rm=517,Xl=518,Pm=519,Wc=35044,$c="300 es",ci=2e3,fr=2001;function Dm(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function ps(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Im(){const i=ps("canvas");return i.style.display="block",i}const Xc={};function qc(...i){const e="THREE."+i.shift();console.log(e,...i)}function pd(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function vt(...i){i=pd(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Nt(...i){i=pd(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function hr(...i){const e=i.join(" ");e in Xc||(Xc[e]=!0,vt(...i))}function Lm(i,e,t){return new Promise(function(n,a){function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}const Um={[$o]:Xo,[qo]:Zo,[Yo]:jo,[La]:Ko,[Xo]:$o,[Zo]:qo,[jo]:Yo,[Ko]:La};class Va{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const a=n[e];if(a!==void 0){const s=a.indexOf(t);s!==-1&&a.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const a=n.slice(0);for(let s=0,r=a.length;s<r;s++)a[s].call(this,e);e.target=null}}}const _n=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Yc=1234567;const us=Math.PI/180,ms=180/Math.PI;function za(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(_n[i&255]+_n[i>>8&255]+_n[i>>16&255]+_n[i>>24&255]+"-"+_n[e&255]+_n[e>>8&255]+"-"+_n[e>>16&15|64]+_n[e>>24&255]+"-"+_n[t&63|128]+_n[t>>8&255]+"-"+_n[t>>16&255]+_n[t>>24&255]+_n[n&255]+_n[n>>8&255]+_n[n>>16&255]+_n[n>>24&255]).toLowerCase()}function Dt(i,e,t){return Math.max(e,Math.min(t,i))}function ql(i,e){return(i%e+e)%e}function Nm(i,e,t,n,a){return n+(i-e)*(a-n)/(t-e)}function Fm(i,e,t){return i!==e?(t-i)/(e-i):0}function ds(i,e,t){return(1-t)*i+t*e}function Om(i,e,t,n){return ds(i,e,1-Math.exp(-t*n))}function Bm(i,e=1){return e-Math.abs(ql(i,e*2)-e)}function km(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Vm(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function zm(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Gm(i,e){return i+Math.random()*(e-i)}function Hm(i){return i*(.5-Math.random())}function Wm(i){i!==void 0&&(Yc=i);let e=Yc+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function $m(i){return i*us}function Xm(i){return i*ms}function qm(i){return(i&i-1)===0&&i!==0}function Ym(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Km(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Zm(i,e,t,n,a){const s=Math.cos,r=Math.sin,l=s(t/2),c=r(t/2),u=s((e+n)/2),h=r((e+n)/2),m=s((e-n)/2),d=r((e-n)/2),g=s((n-e)/2),x=r((n-e)/2);switch(a){case"XYX":i.set(l*h,c*m,c*d,l*u);break;case"YZY":i.set(c*d,l*h,c*m,l*u);break;case"ZXZ":i.set(c*m,c*d,l*h,l*u);break;case"XZX":i.set(l*h,c*x,c*g,l*u);break;case"YXY":i.set(c*g,l*h,c*x,l*u);break;case"ZYZ":i.set(c*x,c*g,l*h,l*u);break;default:vt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+a)}}function Ra(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function Tn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const Kc={DEG2RAD:us,RAD2DEG:ms,generateUUID:za,clamp:Dt,euclideanModulo:ql,mapLinear:Nm,inverseLerp:Fm,lerp:ds,damp:Om,pingpong:Bm,smoothstep:km,smootherstep:Vm,randInt:zm,randFloat:Gm,randFloatSpread:Hm,seededRandom:Wm,degToRad:$m,radToDeg:Xm,isPowerOfTwo:qm,ceilPowerOfTwo:Ym,floorPowerOfTwo:Km,setQuaternionFromProperEuler:Zm,normalize:Tn,denormalize:Ra};class Gt{constructor(e=0,t=0){Gt.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,a=e.elements;return this.x=a[0]*t+a[3]*n+a[6],this.y=a[1]*t+a[4]*n+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Dt(this.x,e.x,t.x),this.y=Dt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Dt(this.x,e,t),this.y=Dt(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Dt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Dt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),a=Math.sin(t),s=this.x-e.x,r=this.y-e.y;return this.x=s*n-r*a+e.x,this.y=s*a+r*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ga{constructor(e=0,t=0,n=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=a}static slerpFlat(e,t,n,a,s,r,l){let c=n[a+0],u=n[a+1],h=n[a+2],m=n[a+3],d=s[r+0],g=s[r+1],x=s[r+2],w=s[r+3];if(m!==w||c!==d||u!==g||h!==x){let v=c*d+u*g+h*x+m*w;v<0&&(d=-d,g=-g,x=-x,w=-w,v=-v);let p=1-l;if(v<.9995){const T=Math.acos(v),D=Math.sin(T);p=Math.sin(p*T)/D,l=Math.sin(l*T)/D,c=c*p+d*l,u=u*p+g*l,h=h*p+x*l,m=m*p+w*l}else{c=c*p+d*l,u=u*p+g*l,h=h*p+x*l,m=m*p+w*l;const T=1/Math.sqrt(c*c+u*u+h*h+m*m);c*=T,u*=T,h*=T,m*=T}}e[t]=c,e[t+1]=u,e[t+2]=h,e[t+3]=m}static multiplyQuaternionsFlat(e,t,n,a,s,r){const l=n[a],c=n[a+1],u=n[a+2],h=n[a+3],m=s[r],d=s[r+1],g=s[r+2],x=s[r+3];return e[t]=l*x+h*m+c*g-u*d,e[t+1]=c*x+h*d+u*m-l*g,e[t+2]=u*x+h*g+l*d-c*m,e[t+3]=h*x-l*m-c*d-u*g,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,a){return this._x=e,this._y=t,this._z=n,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,a=e._y,s=e._z,r=e._order,l=Math.cos,c=Math.sin,u=l(n/2),h=l(a/2),m=l(s/2),d=c(n/2),g=c(a/2),x=c(s/2);switch(r){case"XYZ":this._x=d*h*m+u*g*x,this._y=u*g*m-d*h*x,this._z=u*h*x+d*g*m,this._w=u*h*m-d*g*x;break;case"YXZ":this._x=d*h*m+u*g*x,this._y=u*g*m-d*h*x,this._z=u*h*x-d*g*m,this._w=u*h*m+d*g*x;break;case"ZXY":this._x=d*h*m-u*g*x,this._y=u*g*m+d*h*x,this._z=u*h*x+d*g*m,this._w=u*h*m-d*g*x;break;case"ZYX":this._x=d*h*m-u*g*x,this._y=u*g*m+d*h*x,this._z=u*h*x-d*g*m,this._w=u*h*m+d*g*x;break;case"YZX":this._x=d*h*m+u*g*x,this._y=u*g*m+d*h*x,this._z=u*h*x-d*g*m,this._w=u*h*m-d*g*x;break;case"XZY":this._x=d*h*m-u*g*x,this._y=u*g*m-d*h*x,this._z=u*h*x+d*g*m,this._w=u*h*m+d*g*x;break;default:vt("Quaternion: .setFromEuler() encountered an unknown order: "+r)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,a=Math.sin(n);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],a=t[4],s=t[8],r=t[1],l=t[5],c=t[9],u=t[2],h=t[6],m=t[10],d=n+l+m;if(d>0){const g=.5/Math.sqrt(d+1);this._w=.25/g,this._x=(h-c)*g,this._y=(s-u)*g,this._z=(r-a)*g}else if(n>l&&n>m){const g=2*Math.sqrt(1+n-l-m);this._w=(h-c)/g,this._x=.25*g,this._y=(a+r)/g,this._z=(s+u)/g}else if(l>m){const g=2*Math.sqrt(1+l-n-m);this._w=(s-u)/g,this._x=(a+r)/g,this._y=.25*g,this._z=(c+h)/g}else{const g=2*Math.sqrt(1+m-n-l);this._w=(r-a)/g,this._x=(s+u)/g,this._y=(c+h)/g,this._z=.25*g}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Dt(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const a=Math.min(1,t/n);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,a=e._y,s=e._z,r=e._w,l=t._x,c=t._y,u=t._z,h=t._w;return this._x=n*h+r*l+a*u-s*c,this._y=a*h+r*c+s*l-n*u,this._z=s*h+r*u+n*c-a*l,this._w=r*h-n*l-a*c-s*u,this._onChangeCallback(),this}slerp(e,t){let n=e._x,a=e._y,s=e._z,r=e._w,l=this.dot(e);l<0&&(n=-n,a=-a,s=-s,r=-r,l=-l);let c=1-t;if(l<.9995){const u=Math.acos(l),h=Math.sin(u);c=Math.sin(c*u)/h,t=Math.sin(t*u)/h,this._x=this._x*c+n*t,this._y=this._y*c+a*t,this._z=this._z*c+s*t,this._w=this._w*c+r*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+a*t,this._z=this._z*c+s*t,this._w=this._w*c+r*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),a=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(a*Math.sin(e),a*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class ce{constructor(e=0,t=0,n=0){ce.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Zc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Zc.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,a=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*a,this.y=s[1]*t+s[4]*n+s[7]*a,this.z=s[2]*t+s[5]*n+s[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,a=this.z,s=e.elements,r=1/(s[3]*t+s[7]*n+s[11]*a+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*a+s[12])*r,this.y=(s[1]*t+s[5]*n+s[9]*a+s[13])*r,this.z=(s[2]*t+s[6]*n+s[10]*a+s[14])*r,this}applyQuaternion(e){const t=this.x,n=this.y,a=this.z,s=e.x,r=e.y,l=e.z,c=e.w,u=2*(r*a-l*n),h=2*(l*t-s*a),m=2*(s*n-r*t);return this.x=t+c*u+r*m-l*h,this.y=n+c*h+l*u-s*m,this.z=a+c*m+s*h-r*u,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,a=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*a,this.y=s[1]*t+s[5]*n+s[9]*a,this.z=s[2]*t+s[6]*n+s[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Dt(this.x,e.x,t.x),this.y=Dt(this.y,e.y,t.y),this.z=Dt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Dt(this.x,e,t),this.y=Dt(this.y,e,t),this.z=Dt(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Dt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,a=e.y,s=e.z,r=t.x,l=t.y,c=t.z;return this.x=a*c-s*l,this.y=s*r-n*c,this.z=n*l-a*r,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return fo.copy(this).projectOnVector(e),this.sub(fo)}reflect(e){return this.sub(fo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Dt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,a=this.z-e.z;return t*t+n*n+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const a=Math.sin(t)*e;return this.x=a*Math.sin(n),this.y=Math.cos(t)*e,this.z=a*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const fo=new ce,Zc=new Ga;class Mt{constructor(e,t,n,a,s,r,l,c,u){Mt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,a,s,r,l,c,u)}set(e,t,n,a,s,r,l,c,u){const h=this.elements;return h[0]=e,h[1]=a,h[2]=l,h[3]=t,h[4]=s,h[5]=c,h[6]=n,h[7]=r,h[8]=u,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,a=t.elements,s=this.elements,r=n[0],l=n[3],c=n[6],u=n[1],h=n[4],m=n[7],d=n[2],g=n[5],x=n[8],w=a[0],v=a[3],p=a[6],T=a[1],D=a[4],P=a[7],G=a[2],U=a[5],K=a[8];return s[0]=r*w+l*T+c*G,s[3]=r*v+l*D+c*U,s[6]=r*p+l*P+c*K,s[1]=u*w+h*T+m*G,s[4]=u*v+h*D+m*U,s[7]=u*p+h*P+m*K,s[2]=d*w+g*T+x*G,s[5]=d*v+g*D+x*U,s[8]=d*p+g*P+x*K,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],a=e[2],s=e[3],r=e[4],l=e[5],c=e[6],u=e[7],h=e[8];return t*r*h-t*l*u-n*s*h+n*l*c+a*s*u-a*r*c}invert(){const e=this.elements,t=e[0],n=e[1],a=e[2],s=e[3],r=e[4],l=e[5],c=e[6],u=e[7],h=e[8],m=h*r-l*u,d=l*c-h*s,g=u*s-r*c,x=t*m+n*d+a*g;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);const w=1/x;return e[0]=m*w,e[1]=(a*u-h*n)*w,e[2]=(l*n-a*r)*w,e[3]=d*w,e[4]=(h*t-a*c)*w,e[5]=(a*s-l*t)*w,e[6]=g*w,e[7]=(n*c-u*t)*w,e[8]=(r*t-n*s)*w,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,a,s,r,l){const c=Math.cos(s),u=Math.sin(s);return this.set(n*c,n*u,-n*(c*r+u*l)+r+e,-a*u,a*c,-a*(-u*r+c*l)+l+t,0,0,1),this}scale(e,t){return this.premultiply(ho.makeScale(e,t)),this}rotate(e){return this.premultiply(ho.makeRotation(-e)),this}translate(e,t){return this.premultiply(ho.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let a=0;a<9;a++)if(t[a]!==n[a])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const ho=new Mt,jc=new Mt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Jc=new Mt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function jm(){const i={enabled:!0,workingColorSpace:Fa,spaces:{},convert:function(a,s,r){return this.enabled===!1||s===r||!s||!r||(this.spaces[s].transfer===kt&&(a.r=Ri(a.r),a.g=Ri(a.g),a.b=Ri(a.b)),this.spaces[s].primaries!==this.spaces[r].primaries&&(a.applyMatrix3(this.spaces[s].toXYZ),a.applyMatrix3(this.spaces[r].fromXYZ)),this.spaces[r].transfer===kt&&(a.r=Ia(a.r),a.g=Ia(a.g),a.b=Ia(a.b))),a},workingToColorSpace:function(a,s){return this.convert(a,this.workingColorSpace,s)},colorSpaceToWorking:function(a,s){return this.convert(a,s,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===Xi?dr:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,s=this.workingColorSpace){return a.fromArray(this.spaces[s].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,s,r){return a.copy(this.spaces[s].toXYZ).multiply(this.spaces[r].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,s){return hr("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,s)},toWorkingColorSpace:function(a,s){return hr("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Fa]:{primaries:e,whitePoint:n,transfer:dr,toXYZ:jc,fromXYZ:Jc,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:On},outputColorSpaceConfig:{drawingBufferColorSpace:On}},[On]:{primaries:e,whitePoint:n,transfer:kt,toXYZ:jc,fromXYZ:Jc,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:On}}}),i}const Ut=jm();function Ri(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ia(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let pa;class Jm{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{pa===void 0&&(pa=ps("canvas")),pa.width=e.width,pa.height=e.height;const a=pa.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),n=pa}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ps("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const a=n.getImageData(0,0,e.width,e.height),s=a.data;for(let r=0;r<s.length;r++)s[r]=Ri(s[r]/255)*255;return n.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Ri(t[n]/255)*255):t[n]=Ri(t[n]);return{data:t,width:e.width,height:e.height}}else return vt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Qm=0;class Yl{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Qm++}),this.uuid=za(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},a=this.data;if(a!==null){let s;if(Array.isArray(a)){s=[];for(let r=0,l=a.length;r<l;r++)a[r].isDataTexture?s.push(po(a[r].image)):s.push(po(a[r]))}else s=po(a);n.url=s}return t||(e.images[this.uuid]=n),n}}function po(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Jm.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(vt("Texture: Unable to serialize Texture."),{})}let eg=0;const mo=new ce;class Mn extends Va{constructor(e=Mn.DEFAULT_IMAGE,t=Mn.DEFAULT_MAPPING,n=Ai,a=Ai,s=Sn,r=ra,l=ti,c=Xn,u=Mn.DEFAULT_ANISOTROPY,h=Xi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:eg++}),this.uuid=za(),this.name="",this.source=new Yl(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=a,this.magFilter=s,this.minFilter=r,this.anisotropy=u,this.format=l,this.internalFormat=null,this.type=c,this.offset=new Gt(0,0),this.repeat=new Gt(1,1),this.center=new Gt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Mt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(mo).x}get height(){return this.source.getSize(mo).y}get depth(){return this.source.getSize(mo).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){vt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){vt(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&n&&a.isVector2&&n.isVector2||a&&n&&a.isVector3&&n.isVector3||a&&n&&a.isMatrix3&&n.isMatrix3?a.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==rd)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Jo:e.x=e.x-Math.floor(e.x);break;case Ai:e.x=e.x<0?0:1;break;case Qo:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Jo:e.y=e.y-Math.floor(e.y);break;case Ai:e.y=e.y<0?0:1;break;case Qo:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Mn.DEFAULT_IMAGE=null;Mn.DEFAULT_MAPPING=rd;Mn.DEFAULT_ANISOTROPY=1;class Qt{constructor(e=0,t=0,n=0,a=1){Qt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,a){return this.x=e,this.y=t,this.z=n,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,a=this.z,s=this.w,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*a+r[12]*s,this.y=r[1]*t+r[5]*n+r[9]*a+r[13]*s,this.z=r[2]*t+r[6]*n+r[10]*a+r[14]*s,this.w=r[3]*t+r[7]*n+r[11]*a+r[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,a,s;const c=e.elements,u=c[0],h=c[4],m=c[8],d=c[1],g=c[5],x=c[9],w=c[2],v=c[6],p=c[10];if(Math.abs(h-d)<.01&&Math.abs(m-w)<.01&&Math.abs(x-v)<.01){if(Math.abs(h+d)<.1&&Math.abs(m+w)<.1&&Math.abs(x+v)<.1&&Math.abs(u+g+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const D=(u+1)/2,P=(g+1)/2,G=(p+1)/2,U=(h+d)/4,K=(m+w)/4,y=(x+v)/4;return D>P&&D>G?D<.01?(n=0,a=.707106781,s=.707106781):(n=Math.sqrt(D),a=U/n,s=K/n):P>G?P<.01?(n=.707106781,a=0,s=.707106781):(a=Math.sqrt(P),n=U/a,s=y/a):G<.01?(n=.707106781,a=.707106781,s=0):(s=Math.sqrt(G),n=K/s,a=y/s),this.set(n,a,s,t),this}let T=Math.sqrt((v-x)*(v-x)+(m-w)*(m-w)+(d-h)*(d-h));return Math.abs(T)<.001&&(T=1),this.x=(v-x)/T,this.y=(m-w)/T,this.z=(d-h)/T,this.w=Math.acos((u+g+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Dt(this.x,e.x,t.x),this.y=Dt(this.y,e.y,t.y),this.z=Dt(this.z,e.z,t.z),this.w=Dt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Dt(this.x,e,t),this.y=Dt(this.y,e,t),this.z=Dt(this.z,e,t),this.w=Dt(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Dt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class tg extends Va{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Sn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Qt(0,0,e,t),this.scissorTest=!1,this.viewport=new Qt(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:n.depth},s=new Mn(a),r=n.count;for(let l=0;l<r;l++)this.textures[l]=s.clone(),this.textures[l].isRenderTargetTexture=!0,this.textures[l].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:Sn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let a=0,s=this.textures.length;a<s;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=n,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Yl(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class di extends tg{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class md extends Mn{constructor(e=null,t=1,n=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:a},this.magFilter=vn,this.minFilter=vn,this.wrapR=Ai,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class ng extends Mn{constructor(e=null,t=1,n=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:a},this.magFilter=vn,this.minFilter=vn,this.wrapR=Ai,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class an{constructor(e,t,n,a,s,r,l,c,u,h,m,d,g,x,w,v){an.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,a,s,r,l,c,u,h,m,d,g,x,w,v)}set(e,t,n,a,s,r,l,c,u,h,m,d,g,x,w,v){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=a,p[1]=s,p[5]=r,p[9]=l,p[13]=c,p[2]=u,p[6]=h,p[10]=m,p[14]=d,p[3]=g,p[7]=x,p[11]=w,p[15]=v,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new an().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinant()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinant()===0)return this.identity();const t=this.elements,n=e.elements,a=1/ma.setFromMatrixColumn(e,0).length(),s=1/ma.setFromMatrixColumn(e,1).length(),r=1/ma.setFromMatrixColumn(e,2).length();return t[0]=n[0]*a,t[1]=n[1]*a,t[2]=n[2]*a,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*r,t[9]=n[9]*r,t[10]=n[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,a=e.y,s=e.z,r=Math.cos(n),l=Math.sin(n),c=Math.cos(a),u=Math.sin(a),h=Math.cos(s),m=Math.sin(s);if(e.order==="XYZ"){const d=r*h,g=r*m,x=l*h,w=l*m;t[0]=c*h,t[4]=-c*m,t[8]=u,t[1]=g+x*u,t[5]=d-w*u,t[9]=-l*c,t[2]=w-d*u,t[6]=x+g*u,t[10]=r*c}else if(e.order==="YXZ"){const d=c*h,g=c*m,x=u*h,w=u*m;t[0]=d+w*l,t[4]=x*l-g,t[8]=r*u,t[1]=r*m,t[5]=r*h,t[9]=-l,t[2]=g*l-x,t[6]=w+d*l,t[10]=r*c}else if(e.order==="ZXY"){const d=c*h,g=c*m,x=u*h,w=u*m;t[0]=d-w*l,t[4]=-r*m,t[8]=x+g*l,t[1]=g+x*l,t[5]=r*h,t[9]=w-d*l,t[2]=-r*u,t[6]=l,t[10]=r*c}else if(e.order==="ZYX"){const d=r*h,g=r*m,x=l*h,w=l*m;t[0]=c*h,t[4]=x*u-g,t[8]=d*u+w,t[1]=c*m,t[5]=w*u+d,t[9]=g*u-x,t[2]=-u,t[6]=l*c,t[10]=r*c}else if(e.order==="YZX"){const d=r*c,g=r*u,x=l*c,w=l*u;t[0]=c*h,t[4]=w-d*m,t[8]=x*m+g,t[1]=m,t[5]=r*h,t[9]=-l*h,t[2]=-u*h,t[6]=g*m+x,t[10]=d-w*m}else if(e.order==="XZY"){const d=r*c,g=r*u,x=l*c,w=l*u;t[0]=c*h,t[4]=-m,t[8]=u*h,t[1]=d*m+w,t[5]=r*h,t[9]=g*m-x,t[2]=x*m-g,t[6]=l*h,t[10]=w*m+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(ig,e,ag)}lookAt(e,t,n){const a=this.elements;return Un.subVectors(e,t),Un.lengthSq()===0&&(Un.z=1),Un.normalize(),ki.crossVectors(n,Un),ki.lengthSq()===0&&(Math.abs(n.z)===1?Un.x+=1e-4:Un.z+=1e-4,Un.normalize(),ki.crossVectors(n,Un)),ki.normalize(),Ns.crossVectors(Un,ki),a[0]=ki.x,a[4]=Ns.x,a[8]=Un.x,a[1]=ki.y,a[5]=Ns.y,a[9]=Un.y,a[2]=ki.z,a[6]=Ns.z,a[10]=Un.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,a=t.elements,s=this.elements,r=n[0],l=n[4],c=n[8],u=n[12],h=n[1],m=n[5],d=n[9],g=n[13],x=n[2],w=n[6],v=n[10],p=n[14],T=n[3],D=n[7],P=n[11],G=n[15],U=a[0],K=a[4],y=a[8],C=a[12],de=a[1],H=a[5],ie=a[9],ae=a[13],oe=a[2],te=a[6],F=a[10],O=a[14],he=a[3],V=a[7],$=a[11],Me=a[15];return s[0]=r*U+l*de+c*oe+u*he,s[4]=r*K+l*H+c*te+u*V,s[8]=r*y+l*ie+c*F+u*$,s[12]=r*C+l*ae+c*O+u*Me,s[1]=h*U+m*de+d*oe+g*he,s[5]=h*K+m*H+d*te+g*V,s[9]=h*y+m*ie+d*F+g*$,s[13]=h*C+m*ae+d*O+g*Me,s[2]=x*U+w*de+v*oe+p*he,s[6]=x*K+w*H+v*te+p*V,s[10]=x*y+w*ie+v*F+p*$,s[14]=x*C+w*ae+v*O+p*Me,s[3]=T*U+D*de+P*oe+G*he,s[7]=T*K+D*H+P*te+G*V,s[11]=T*y+D*ie+P*F+G*$,s[15]=T*C+D*ae+P*O+G*Me,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],a=e[8],s=e[12],r=e[1],l=e[5],c=e[9],u=e[13],h=e[2],m=e[6],d=e[10],g=e[14],x=e[3],w=e[7],v=e[11],p=e[15],T=c*g-u*d,D=l*g-u*m,P=l*d-c*m,G=r*g-u*h,U=r*d-c*h,K=r*m-l*h;return t*(w*T-v*D+p*P)-n*(x*T-v*G+p*U)+a*(x*D-w*G+p*K)-s*(x*P-w*U+v*K)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],a=e[2],s=e[3],r=e[4],l=e[5],c=e[6],u=e[7],h=e[8],m=e[9],d=e[10],g=e[11],x=e[12],w=e[13],v=e[14],p=e[15],T=t*l-n*r,D=t*c-a*r,P=t*u-s*r,G=n*c-a*l,U=n*u-s*l,K=a*u-s*c,y=h*w-m*x,C=h*v-d*x,de=h*p-g*x,H=m*v-d*w,ie=m*p-g*w,ae=d*p-g*v,oe=T*ae-D*ie+P*H+G*de-U*C+K*y;if(oe===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const te=1/oe;return e[0]=(l*ae-c*ie+u*H)*te,e[1]=(a*ie-n*ae-s*H)*te,e[2]=(w*K-v*U+p*G)*te,e[3]=(d*U-m*K-g*G)*te,e[4]=(c*de-r*ae-u*C)*te,e[5]=(t*ae-a*de+s*C)*te,e[6]=(v*P-x*K-p*D)*te,e[7]=(h*K-d*P+g*D)*te,e[8]=(r*ie-l*de+u*y)*te,e[9]=(n*de-t*ie-s*y)*te,e[10]=(x*U-w*P+p*T)*te,e[11]=(m*P-h*U-g*T)*te,e[12]=(l*C-r*H-c*y)*te,e[13]=(t*H-n*C+a*y)*te,e[14]=(w*D-x*G-v*T)*te,e[15]=(h*G-m*D+d*T)*te,this}scale(e){const t=this.elements,n=e.x,a=e.y,s=e.z;return t[0]*=n,t[4]*=a,t[8]*=s,t[1]*=n,t[5]*=a,t[9]*=s,t[2]*=n,t[6]*=a,t[10]*=s,t[3]*=n,t[7]*=a,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,a))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),a=Math.sin(t),s=1-n,r=e.x,l=e.y,c=e.z,u=s*r,h=s*l;return this.set(u*r+n,u*l-a*c,u*c+a*l,0,u*l+a*c,h*l+n,h*c-a*r,0,u*c-a*l,h*c+a*r,s*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,a,s,r){return this.set(1,n,s,0,e,1,r,0,t,a,1,0,0,0,0,1),this}compose(e,t,n){const a=this.elements,s=t._x,r=t._y,l=t._z,c=t._w,u=s+s,h=r+r,m=l+l,d=s*u,g=s*h,x=s*m,w=r*h,v=r*m,p=l*m,T=c*u,D=c*h,P=c*m,G=n.x,U=n.y,K=n.z;return a[0]=(1-(w+p))*G,a[1]=(g+P)*G,a[2]=(x-D)*G,a[3]=0,a[4]=(g-P)*U,a[5]=(1-(d+p))*U,a[6]=(v+T)*U,a[7]=0,a[8]=(x+D)*K,a[9]=(v-T)*K,a[10]=(1-(d+w))*K,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,n){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const s=this.determinant();if(s===0)return n.set(1,1,1),t.identity(),this;let r=ma.set(a[0],a[1],a[2]).length();const l=ma.set(a[4],a[5],a[6]).length(),c=ma.set(a[8],a[9],a[10]).length();s<0&&(r=-r),Zn.copy(this);const u=1/r,h=1/l,m=1/c;return Zn.elements[0]*=u,Zn.elements[1]*=u,Zn.elements[2]*=u,Zn.elements[4]*=h,Zn.elements[5]*=h,Zn.elements[6]*=h,Zn.elements[8]*=m,Zn.elements[9]*=m,Zn.elements[10]*=m,t.setFromRotationMatrix(Zn),n.x=r,n.y=l,n.z=c,this}makePerspective(e,t,n,a,s,r,l=ci,c=!1){const u=this.elements,h=2*s/(t-e),m=2*s/(n-a),d=(t+e)/(t-e),g=(n+a)/(n-a);let x,w;if(c)x=s/(r-s),w=r*s/(r-s);else if(l===ci)x=-(r+s)/(r-s),w=-2*r*s/(r-s);else if(l===fr)x=-r/(r-s),w=-r*s/(r-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+l);return u[0]=h,u[4]=0,u[8]=d,u[12]=0,u[1]=0,u[5]=m,u[9]=g,u[13]=0,u[2]=0,u[6]=0,u[10]=x,u[14]=w,u[3]=0,u[7]=0,u[11]=-1,u[15]=0,this}makeOrthographic(e,t,n,a,s,r,l=ci,c=!1){const u=this.elements,h=2/(t-e),m=2/(n-a),d=-(t+e)/(t-e),g=-(n+a)/(n-a);let x,w;if(c)x=1/(r-s),w=r/(r-s);else if(l===ci)x=-2/(r-s),w=-(r+s)/(r-s);else if(l===fr)x=-1/(r-s),w=-s/(r-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+l);return u[0]=h,u[4]=0,u[8]=0,u[12]=d,u[1]=0,u[5]=m,u[9]=0,u[13]=g,u[2]=0,u[6]=0,u[10]=x,u[14]=w,u[3]=0,u[7]=0,u[11]=0,u[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let a=0;a<16;a++)if(t[a]!==n[a])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const ma=new ce,Zn=new an,ig=new ce(0,0,0),ag=new ce(1,1,1),ki=new ce,Ns=new ce,Un=new ce,Qc=new an,eu=new Ga;class Ii{constructor(e=0,t=0,n=0,a=Ii.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,a=this._order){return this._x=e,this._y=t,this._z=n,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const a=e.elements,s=a[0],r=a[4],l=a[8],c=a[1],u=a[5],h=a[9],m=a[2],d=a[6],g=a[10];switch(t){case"XYZ":this._y=Math.asin(Dt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,g),this._z=Math.atan2(-r,s)):(this._x=Math.atan2(d,u),this._z=0);break;case"YXZ":this._x=Math.asin(-Dt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(l,g),this._z=Math.atan2(c,u)):(this._y=Math.atan2(-m,s),this._z=0);break;case"ZXY":this._x=Math.asin(Dt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-m,g),this._z=Math.atan2(-r,u)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-Dt(m,-1,1)),Math.abs(m)<.9999999?(this._x=Math.atan2(d,g),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-r,u));break;case"YZX":this._z=Math.asin(Dt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,u),this._y=Math.atan2(-m,s)):(this._x=0,this._y=Math.atan2(l,g));break;case"XZY":this._z=Math.asin(-Dt(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(d,u),this._y=Math.atan2(l,s)):(this._x=Math.atan2(-h,g),this._y=0);break;default:vt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Qc.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Qc,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return eu.setFromEuler(this),this.setFromQuaternion(eu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Ii.DEFAULT_ORDER="XYZ";class gd{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let sg=0;const tu=new ce,ga=new Ga,yi=new an,Fs=new ce,Qa=new ce,rg=new ce,og=new Ga,nu=new ce(1,0,0),iu=new ce(0,1,0),au=new ce(0,0,1),su={type:"added"},lg={type:"removed"},va={type:"childadded",child:null},go={type:"childremoved",child:null};class Bn extends Va{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:sg++}),this.uuid=za(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Bn.DEFAULT_UP.clone();const e=new ce,t=new Ii,n=new Ga,a=new ce(1,1,1);function s(){n.setFromEuler(t,!1)}function r(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new an},normalMatrix:{value:new Mt}}),this.matrix=new an,this.matrixWorld=new an,this.matrixAutoUpdate=Bn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Bn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new gd,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ga.setFromAxisAngle(e,t),this.quaternion.multiply(ga),this}rotateOnWorldAxis(e,t){return ga.setFromAxisAngle(e,t),this.quaternion.premultiply(ga),this}rotateX(e){return this.rotateOnAxis(nu,e)}rotateY(e){return this.rotateOnAxis(iu,e)}rotateZ(e){return this.rotateOnAxis(au,e)}translateOnAxis(e,t){return tu.copy(e).applyQuaternion(this.quaternion),this.position.add(tu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(nu,e)}translateY(e){return this.translateOnAxis(iu,e)}translateZ(e){return this.translateOnAxis(au,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(yi.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Fs.copy(e):Fs.set(e,t,n);const a=this.parent;this.updateWorldMatrix(!0,!1),Qa.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?yi.lookAt(Qa,Fs,this.up):yi.lookAt(Fs,Qa,this.up),this.quaternion.setFromRotationMatrix(yi),a&&(yi.extractRotation(a.matrixWorld),ga.setFromRotationMatrix(yi),this.quaternion.premultiply(ga.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Nt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(su),va.child=e,this.dispatchEvent(va),va.child=null):Nt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(lg),go.child=e,this.dispatchEvent(go),go.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),yi.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),yi.multiply(e.parent.matrixWorld)),e.applyMatrix4(yi),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(su),va.child=e,this.dispatchEvent(va),va.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,a=this.children.length;n<a;n++){const r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const a=this.children;for(let s=0,r=a.length;s<r;s++)a[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qa,e,rg),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qa,og,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,a=t.length;n<a;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,a=t.length;n<a;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,a=e.z,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*n-s[8]*a,s[13]+=n-s[1]*t-s[5]*n-s[9]*a,s[14]+=a-s[2]*t-s[6]*n-s[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,a=t.length;n<a;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const a=this.children;for(let s=0,r=a.length;s<r;s++)a[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(l=>({...l,boundingBox:l.boundingBox?l.boundingBox.toJSON():void 0,boundingSphere:l.boundingSphere?l.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(l=>({...l})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function s(l,c){return l[c.uuid]===void 0&&(l[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=s(e.geometries,this.geometry);const l=this.geometry.parameters;if(l!==void 0&&l.shapes!==void 0){const c=l.shapes;if(Array.isArray(c))for(let u=0,h=c.length;u<h;u++){const m=c[u];s(e.shapes,m)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const l=[];for(let c=0,u=this.material.length;c<u;c++)l.push(s(e.materials,this.material[c]));a.material=l}else a.material=s(e.materials,this.material);if(this.children.length>0){a.children=[];for(let l=0;l<this.children.length;l++)a.children.push(this.children[l].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let l=0;l<this.animations.length;l++){const c=this.animations[l];a.animations.push(s(e.animations,c))}}if(t){const l=r(e.geometries),c=r(e.materials),u=r(e.textures),h=r(e.images),m=r(e.shapes),d=r(e.skeletons),g=r(e.animations),x=r(e.nodes);l.length>0&&(n.geometries=l),c.length>0&&(n.materials=c),u.length>0&&(n.textures=u),h.length>0&&(n.images=h),m.length>0&&(n.shapes=m),d.length>0&&(n.skeletons=d),g.length>0&&(n.animations=g),x.length>0&&(n.nodes=x)}return n.object=a,n;function r(l){const c=[];for(const u in l){const h=l[u];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),e.pivot!==null&&(this.pivot=e.pivot.clone()),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const a=e.children[n];this.add(a.clone())}return this}}Bn.DEFAULT_UP=new ce(0,1,0);Bn.DEFAULT_MATRIX_AUTO_UPDATE=!0;Bn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Os extends Bn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const cg={type:"move"};class vo{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Os,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Os,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ce,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ce),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Os,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ce,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ce),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let a=null,s=null,r=null;const l=this._targetRay,c=this._grip,u=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(u&&e.hand){r=!0;for(const w of e.hand.values()){const v=t.getJointPose(w,n),p=this._getHandJoint(u,w);v!==null&&(p.matrix.fromArray(v.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=v.radius),p.visible=v!==null}const h=u.joints["index-finger-tip"],m=u.joints["thumb-tip"],d=h.position.distanceTo(m.position),g=.02,x=.005;u.inputState.pinching&&d>g+x?(u.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!u.inputState.pinching&&d<=g-x&&(u.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));l!==null&&(a=t.getPose(e.targetRaySpace,n),a===null&&s!==null&&(a=s),a!==null&&(l.matrix.fromArray(a.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,a.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(a.linearVelocity)):l.hasLinearVelocity=!1,a.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(a.angularVelocity)):l.hasAngularVelocity=!1,this.dispatchEvent(cg)))}return l!==null&&(l.visible=a!==null),c!==null&&(c.visible=s!==null),u!==null&&(u.visible=r!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Os;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const vd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Vi={h:0,s:0,l:0},Bs={h:0,s:0,l:0};function _o(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class zt{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=On){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ut.colorSpaceToWorking(this,t),this}setRGB(e,t,n,a=Ut.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ut.colorSpaceToWorking(this,a),this}setHSL(e,t,n,a=Ut.workingColorSpace){if(e=ql(e,1),t=Dt(t,0,1),n=Dt(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,r=2*n-s;this.r=_o(r,s,e+1/3),this.g=_o(r,s,e),this.b=_o(r,s,e-1/3)}return Ut.colorSpaceToWorking(this,a),this}setStyle(e,t=On){function n(s){s!==void 0&&parseFloat(s)<1&&vt("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const r=a[1],l=a[2];switch(r){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(l))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(l))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(l))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:vt("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=a[1],r=s.length;if(r===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(r===6)return this.setHex(parseInt(s,16),t);vt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=On){const n=vd[e.toLowerCase()];return n!==void 0?this.setHex(n,t):vt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ri(e.r),this.g=Ri(e.g),this.b=Ri(e.b),this}copyLinearToSRGB(e){return this.r=Ia(e.r),this.g=Ia(e.g),this.b=Ia(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=On){return Ut.workingToColorSpace(xn.copy(this),e),Math.round(Dt(xn.r*255,0,255))*65536+Math.round(Dt(xn.g*255,0,255))*256+Math.round(Dt(xn.b*255,0,255))}getHexString(e=On){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ut.workingColorSpace){Ut.workingToColorSpace(xn.copy(this),t);const n=xn.r,a=xn.g,s=xn.b,r=Math.max(n,a,s),l=Math.min(n,a,s);let c,u;const h=(l+r)/2;if(l===r)c=0,u=0;else{const m=r-l;switch(u=h<=.5?m/(r+l):m/(2-r-l),r){case n:c=(a-s)/m+(a<s?6:0);break;case a:c=(s-n)/m+2;break;case s:c=(n-a)/m+4;break}c/=6}return e.h=c,e.s=u,e.l=h,e}getRGB(e,t=Ut.workingColorSpace){return Ut.workingToColorSpace(xn.copy(this),t),e.r=xn.r,e.g=xn.g,e.b=xn.b,e}getStyle(e=On){Ut.workingToColorSpace(xn.copy(this),e);const t=xn.r,n=xn.g,a=xn.b;return e!==On?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(a*255)})`}offsetHSL(e,t,n){return this.getHSL(Vi),this.setHSL(Vi.h+e,Vi.s+t,Vi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Vi),e.getHSL(Bs);const n=ds(Vi.h,Bs.h,t),a=ds(Vi.s,Bs.s,t),s=ds(Vi.l,Bs.l,t);return this.setHSL(n,a,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,a=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*a,this.g=s[1]*t+s[4]*n+s[7]*a,this.b=s[2]*t+s[5]*n+s[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const xn=new zt;zt.NAMES=vd;class ug extends Bn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ii,this.environmentIntensity=1,this.environmentRotation=new Ii,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const jn=new ce,Si=new ce,xo=new ce,Mi=new ce,_a=new ce,xa=new ce,ru=new ce,yo=new ce,So=new ce,Mo=new ce,Eo=new Qt,bo=new Qt,To=new Qt;class Qn{constructor(e=new ce,t=new ce,n=new ce){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,a){a.subVectors(n,t),jn.subVectors(e,t),a.cross(jn);const s=a.lengthSq();return s>0?a.multiplyScalar(1/Math.sqrt(s)):a.set(0,0,0)}static getBarycoord(e,t,n,a,s){jn.subVectors(a,t),Si.subVectors(n,t),xo.subVectors(e,t);const r=jn.dot(jn),l=jn.dot(Si),c=jn.dot(xo),u=Si.dot(Si),h=Si.dot(xo),m=r*u-l*l;if(m===0)return s.set(0,0,0),null;const d=1/m,g=(u*c-l*h)*d,x=(r*h-l*c)*d;return s.set(1-g-x,x,g)}static containsPoint(e,t,n,a){return this.getBarycoord(e,t,n,a,Mi)===null?!1:Mi.x>=0&&Mi.y>=0&&Mi.x+Mi.y<=1}static getInterpolation(e,t,n,a,s,r,l,c){return this.getBarycoord(e,t,n,a,Mi)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,Mi.x),c.addScaledVector(r,Mi.y),c.addScaledVector(l,Mi.z),c)}static getInterpolatedAttribute(e,t,n,a,s,r){return Eo.setScalar(0),bo.setScalar(0),To.setScalar(0),Eo.fromBufferAttribute(e,t),bo.fromBufferAttribute(e,n),To.fromBufferAttribute(e,a),r.setScalar(0),r.addScaledVector(Eo,s.x),r.addScaledVector(bo,s.y),r.addScaledVector(To,s.z),r}static isFrontFacing(e,t,n,a){return jn.subVectors(n,t),Si.subVectors(e,t),jn.cross(Si).dot(a)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,a){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,n,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return jn.subVectors(this.c,this.b),Si.subVectors(this.a,this.b),jn.cross(Si).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Qn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Qn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,a,s){return Qn.getInterpolation(e,this.a,this.b,this.c,t,n,a,s)}containsPoint(e){return Qn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Qn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,a=this.b,s=this.c;let r,l;_a.subVectors(a,n),xa.subVectors(s,n),yo.subVectors(e,n);const c=_a.dot(yo),u=xa.dot(yo);if(c<=0&&u<=0)return t.copy(n);So.subVectors(e,a);const h=_a.dot(So),m=xa.dot(So);if(h>=0&&m<=h)return t.copy(a);const d=c*m-h*u;if(d<=0&&c>=0&&h<=0)return r=c/(c-h),t.copy(n).addScaledVector(_a,r);Mo.subVectors(e,s);const g=_a.dot(Mo),x=xa.dot(Mo);if(x>=0&&g<=x)return t.copy(s);const w=g*u-c*x;if(w<=0&&u>=0&&x<=0)return l=u/(u-x),t.copy(n).addScaledVector(xa,l);const v=h*x-g*m;if(v<=0&&m-h>=0&&g-x>=0)return ru.subVectors(s,a),l=(m-h)/(m-h+(g-x)),t.copy(a).addScaledVector(ru,l);const p=1/(v+w+d);return r=w*p,l=d*p,t.copy(n).addScaledVector(_a,r).addScaledVector(xa,l)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class vs{constructor(e=new ce(1/0,1/0,1/0),t=new ce(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Jn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Jn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Jn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let r=0,l=s.count;r<l;r++)e.isMesh===!0?e.getVertexPosition(r,Jn):Jn.fromBufferAttribute(s,r),Jn.applyMatrix4(e.matrixWorld),this.expandByPoint(Jn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),ks.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ks.copy(n.boundingBox)),ks.applyMatrix4(e.matrixWorld),this.union(ks)}const a=e.children;for(let s=0,r=a.length;s<r;s++)this.expandByObject(a[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Jn),Jn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(es),Vs.subVectors(this.max,es),ya.subVectors(e.a,es),Sa.subVectors(e.b,es),Ma.subVectors(e.c,es),zi.subVectors(Sa,ya),Gi.subVectors(Ma,Sa),ji.subVectors(ya,Ma);let t=[0,-zi.z,zi.y,0,-Gi.z,Gi.y,0,-ji.z,ji.y,zi.z,0,-zi.x,Gi.z,0,-Gi.x,ji.z,0,-ji.x,-zi.y,zi.x,0,-Gi.y,Gi.x,0,-ji.y,ji.x,0];return!wo(t,ya,Sa,Ma,Vs)||(t=[1,0,0,0,1,0,0,0,1],!wo(t,ya,Sa,Ma,Vs))?!1:(zs.crossVectors(zi,Gi),t=[zs.x,zs.y,zs.z],wo(t,ya,Sa,Ma,Vs))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Jn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Jn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ei[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ei[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ei[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ei[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ei[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ei[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ei[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ei[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ei),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Ei=[new ce,new ce,new ce,new ce,new ce,new ce,new ce,new ce],Jn=new ce,ks=new vs,ya=new ce,Sa=new ce,Ma=new ce,zi=new ce,Gi=new ce,ji=new ce,es=new ce,Vs=new ce,zs=new ce,Ji=new ce;function wo(i,e,t,n,a){for(let s=0,r=i.length-3;s<=r;s+=3){Ji.fromArray(i,s);const l=a.x*Math.abs(Ji.x)+a.y*Math.abs(Ji.y)+a.z*Math.abs(Ji.z),c=e.dot(Ji),u=t.dot(Ji),h=n.dot(Ji);if(Math.max(-Math.max(c,u,h),Math.min(c,u,h))>l)return!1}return!0}const nn=new ce,Gs=new Gt;let dg=0;class fi{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:dg++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Wc,this.updateRanges=[],this.gpuType=li,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let a=0,s=this.itemSize;a<s;a++)this.array[e+a]=t.array[n+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Gs.fromBufferAttribute(this,t),Gs.applyMatrix3(e),this.setXY(t,Gs.x,Gs.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)nn.fromBufferAttribute(this,t),nn.applyMatrix3(e),this.setXYZ(t,nn.x,nn.y,nn.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)nn.fromBufferAttribute(this,t),nn.applyMatrix4(e),this.setXYZ(t,nn.x,nn.y,nn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)nn.fromBufferAttribute(this,t),nn.applyNormalMatrix(e),this.setXYZ(t,nn.x,nn.y,nn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)nn.fromBufferAttribute(this,t),nn.transformDirection(e),this.setXYZ(t,nn.x,nn.y,nn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ra(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Tn(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ra(t,this.array)),t}setX(e,t){return this.normalized&&(t=Tn(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ra(t,this.array)),t}setY(e,t){return this.normalized&&(t=Tn(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ra(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Tn(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ra(t,this.array)),t}setW(e,t){return this.normalized&&(t=Tn(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Tn(t,this.array),n=Tn(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,a){return e*=this.itemSize,this.normalized&&(t=Tn(t,this.array),n=Tn(n,this.array),a=Tn(a,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=a,this}setXYZW(e,t,n,a,s){return e*=this.itemSize,this.normalized&&(t=Tn(t,this.array),n=Tn(n,this.array),a=Tn(a,this.array),s=Tn(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=a,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Wc&&(e.usage=this.usage),e}}class _d extends fi{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class xd extends fi{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class qn extends fi{constructor(e,t,n){super(new Float32Array(e),t,n)}}const fg=new vs,ts=new ce,Ao=new ce;class Kl{constructor(e=new ce,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):fg.setFromPoints(e).getCenter(n);let a=0;for(let s=0,r=e.length;s<r;s++)a=Math.max(a,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;ts.subVectors(e,this.center);const t=ts.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),a=(n-this.radius)*.5;this.center.addScaledVector(ts,a/n),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ao.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(ts.copy(e.center).add(Ao)),this.expandByPoint(ts.copy(e.center).sub(Ao))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let hg=0;const Wn=new an,Co=new Bn,Ea=new ce,Nn=new vs,ns=new vs,fn=new ce;class gi extends Va{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:hg++}),this.uuid=za(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Dm(e)?xd:_d)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Mt().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Wn.makeRotationFromQuaternion(e),this.applyMatrix4(Wn),this}rotateX(e){return Wn.makeRotationX(e),this.applyMatrix4(Wn),this}rotateY(e){return Wn.makeRotationY(e),this.applyMatrix4(Wn),this}rotateZ(e){return Wn.makeRotationZ(e),this.applyMatrix4(Wn),this}translate(e,t,n){return Wn.makeTranslation(e,t,n),this.applyMatrix4(Wn),this}scale(e,t,n){return Wn.makeScale(e,t,n),this.applyMatrix4(Wn),this}lookAt(e){return Co.lookAt(e),Co.updateMatrix(),this.applyMatrix4(Co.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ea).negate(),this.translate(Ea.x,Ea.y,Ea.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let a=0,s=e.length;a<s;a++){const r=e[a];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new qn(n,3))}else{const n=Math.min(e.length,t.count);for(let a=0;a<n;a++){const s=e[a];t.setXYZ(a,s.x,s.y,s.z||0)}e.length>t.count&&vt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new vs);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new ce(-1/0,-1/0,-1/0),new ce(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,a=t.length;n<a;n++){const s=t[n];Nn.setFromBufferAttribute(s),this.morphTargetsRelative?(fn.addVectors(this.boundingBox.min,Nn.min),this.boundingBox.expandByPoint(fn),fn.addVectors(this.boundingBox.max,Nn.max),this.boundingBox.expandByPoint(fn)):(this.boundingBox.expandByPoint(Nn.min),this.boundingBox.expandByPoint(Nn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Nt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Kl);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Nt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new ce,1/0);return}if(e){const n=this.boundingSphere.center;if(Nn.setFromBufferAttribute(e),t)for(let s=0,r=t.length;s<r;s++){const l=t[s];ns.setFromBufferAttribute(l),this.morphTargetsRelative?(fn.addVectors(Nn.min,ns.min),Nn.expandByPoint(fn),fn.addVectors(Nn.max,ns.max),Nn.expandByPoint(fn)):(Nn.expandByPoint(ns.min),Nn.expandByPoint(ns.max))}Nn.getCenter(n);let a=0;for(let s=0,r=e.count;s<r;s++)fn.fromBufferAttribute(e,s),a=Math.max(a,n.distanceToSquared(fn));if(t)for(let s=0,r=t.length;s<r;s++){const l=t[s],c=this.morphTargetsRelative;for(let u=0,h=l.count;u<h;u++)fn.fromBufferAttribute(l,u),c&&(Ea.fromBufferAttribute(e,u),fn.add(Ea)),a=Math.max(a,n.distanceToSquared(fn))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Nt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Nt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,a=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new fi(new Float32Array(4*n.count),4));const r=this.getAttribute("tangent"),l=[],c=[];for(let y=0;y<n.count;y++)l[y]=new ce,c[y]=new ce;const u=new ce,h=new ce,m=new ce,d=new Gt,g=new Gt,x=new Gt,w=new ce,v=new ce;function p(y,C,de){u.fromBufferAttribute(n,y),h.fromBufferAttribute(n,C),m.fromBufferAttribute(n,de),d.fromBufferAttribute(s,y),g.fromBufferAttribute(s,C),x.fromBufferAttribute(s,de),h.sub(u),m.sub(u),g.sub(d),x.sub(d);const H=1/(g.x*x.y-x.x*g.y);isFinite(H)&&(w.copy(h).multiplyScalar(x.y).addScaledVector(m,-g.y).multiplyScalar(H),v.copy(m).multiplyScalar(g.x).addScaledVector(h,-x.x).multiplyScalar(H),l[y].add(w),l[C].add(w),l[de].add(w),c[y].add(v),c[C].add(v),c[de].add(v))}let T=this.groups;T.length===0&&(T=[{start:0,count:e.count}]);for(let y=0,C=T.length;y<C;++y){const de=T[y],H=de.start,ie=de.count;for(let ae=H,oe=H+ie;ae<oe;ae+=3)p(e.getX(ae+0),e.getX(ae+1),e.getX(ae+2))}const D=new ce,P=new ce,G=new ce,U=new ce;function K(y){G.fromBufferAttribute(a,y),U.copy(G);const C=l[y];D.copy(C),D.sub(G.multiplyScalar(G.dot(C))).normalize(),P.crossVectors(U,C);const H=P.dot(c[y])<0?-1:1;r.setXYZW(y,D.x,D.y,D.z,H)}for(let y=0,C=T.length;y<C;++y){const de=T[y],H=de.start,ie=de.count;for(let ae=H,oe=H+ie;ae<oe;ae+=3)K(e.getX(ae+0)),K(e.getX(ae+1)),K(e.getX(ae+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new fi(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,g=n.count;d<g;d++)n.setXYZ(d,0,0,0);const a=new ce,s=new ce,r=new ce,l=new ce,c=new ce,u=new ce,h=new ce,m=new ce;if(e)for(let d=0,g=e.count;d<g;d+=3){const x=e.getX(d+0),w=e.getX(d+1),v=e.getX(d+2);a.fromBufferAttribute(t,x),s.fromBufferAttribute(t,w),r.fromBufferAttribute(t,v),h.subVectors(r,s),m.subVectors(a,s),h.cross(m),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,w),u.fromBufferAttribute(n,v),l.add(h),c.add(h),u.add(h),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(w,c.x,c.y,c.z),n.setXYZ(v,u.x,u.y,u.z)}else for(let d=0,g=t.count;d<g;d+=3)a.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),r.fromBufferAttribute(t,d+2),h.subVectors(r,s),m.subVectors(a,s),h.cross(m),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)fn.fromBufferAttribute(e,t),fn.normalize(),e.setXYZ(t,fn.x,fn.y,fn.z)}toNonIndexed(){function e(l,c){const u=l.array,h=l.itemSize,m=l.normalized,d=new u.constructor(c.length*h);let g=0,x=0;for(let w=0,v=c.length;w<v;w++){l.isInterleavedBufferAttribute?g=c[w]*l.data.stride+l.offset:g=c[w]*h;for(let p=0;p<h;p++)d[x++]=u[g++]}return new fi(d,h,m)}if(this.index===null)return vt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new gi,n=this.index.array,a=this.attributes;for(const l in a){const c=a[l],u=e(c,n);t.setAttribute(l,u)}const s=this.morphAttributes;for(const l in s){const c=[],u=s[l];for(let h=0,m=u.length;h<m;h++){const d=u[h],g=e(d,n);c.push(g)}t.morphAttributes[l]=c}t.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let l=0,c=r.length;l<c;l++){const u=r[l];t.addGroup(u.start,u.count,u.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const u in c)c[u]!==void 0&&(e[u]=c[u]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const u=n[c];e.data.attributes[c]=u.toJSON(e.data)}const a={};let s=!1;for(const c in this.morphAttributes){const u=this.morphAttributes[c],h=[];for(let m=0,d=u.length;m<d;m++){const g=u[m];h.push(g.toJSON(e.data))}h.length>0&&(a[c]=h,s=!0)}s&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(e.data.groups=JSON.parse(JSON.stringify(r)));const l=this.boundingSphere;return l!==null&&(e.data.boundingSphere=l.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const a=e.attributes;for(const u in a){const h=a[u];this.setAttribute(u,h.clone(t))}const s=e.morphAttributes;for(const u in s){const h=[],m=s[u];for(let d=0,g=m.length;d<g;d++)h.push(m[d].clone(t));this.morphAttributes[u]=h}this.morphTargetsRelative=e.morphTargetsRelative;const r=e.groups;for(let u=0,h=r.length;u<h;u++){const m=r[u];this.addGroup(m.start,m.count,m.materialIndex)}const l=e.boundingBox;l!==null&&(this.boundingBox=l.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}let pg=0;class gr extends Va{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:pg++}),this.uuid=za(),this.name="",this.type="Material",this.blending=Da,this.side=Yi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ho,this.blendDst=Wo,this.blendEquation=aa,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new zt(0,0,0),this.blendAlpha=0,this.depthFunc=La,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Hc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ha,this.stencilZFail=ha,this.stencilZPass=ha,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){vt(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){vt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(n):a&&a.isVector3&&n&&n.isVector3?a.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Da&&(n.blending=this.blending),this.side!==Yi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Ho&&(n.blendSrc=this.blendSrc),this.blendDst!==Wo&&(n.blendDst=this.blendDst),this.blendEquation!==aa&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==La&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Hc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ha&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ha&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ha&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function a(s){const r=[];for(const l in s){const c=s[l];delete c.metadata,r.push(c)}return r}if(t){const s=a(e.textures),r=a(e.images);s.length>0&&(n.textures=s),r.length>0&&(n.images=r)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const a=t.length;n=new Array(a);for(let s=0;s!==a;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const bi=new ce,Ro=new ce,Hs=new ce,Hi=new ce,Po=new ce,Ws=new ce,Do=new ce;class mg{constructor(e=new ce,t=new ce(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,bi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=bi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(bi.copy(this.origin).addScaledVector(this.direction,t),bi.distanceToSquared(e))}distanceSqToSegment(e,t,n,a){Ro.copy(e).add(t).multiplyScalar(.5),Hs.copy(t).sub(e).normalize(),Hi.copy(this.origin).sub(Ro);const s=e.distanceTo(t)*.5,r=-this.direction.dot(Hs),l=Hi.dot(this.direction),c=-Hi.dot(Hs),u=Hi.lengthSq(),h=Math.abs(1-r*r);let m,d,g,x;if(h>0)if(m=r*c-l,d=r*l-c,x=s*h,m>=0)if(d>=-x)if(d<=x){const w=1/h;m*=w,d*=w,g=m*(m+r*d+2*l)+d*(r*m+d+2*c)+u}else d=s,m=Math.max(0,-(r*d+l)),g=-m*m+d*(d+2*c)+u;else d=-s,m=Math.max(0,-(r*d+l)),g=-m*m+d*(d+2*c)+u;else d<=-x?(m=Math.max(0,-(-r*s+l)),d=m>0?-s:Math.min(Math.max(-s,-c),s),g=-m*m+d*(d+2*c)+u):d<=x?(m=0,d=Math.min(Math.max(-s,-c),s),g=d*(d+2*c)+u):(m=Math.max(0,-(r*s+l)),d=m>0?s:Math.min(Math.max(-s,-c),s),g=-m*m+d*(d+2*c)+u);else d=r>0?-s:s,m=Math.max(0,-(r*d+l)),g=-m*m+d*(d+2*c)+u;return n&&n.copy(this.origin).addScaledVector(this.direction,m),a&&a.copy(Ro).addScaledVector(Hs,d),g}intersectSphere(e,t){bi.subVectors(e.center,this.origin);const n=bi.dot(this.direction),a=bi.dot(bi)-n*n,s=e.radius*e.radius;if(a>s)return null;const r=Math.sqrt(s-a),l=n-r,c=n+r;return c<0?null:l<0?this.at(c,t):this.at(l,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,a,s,r,l,c;const u=1/this.direction.x,h=1/this.direction.y,m=1/this.direction.z,d=this.origin;return u>=0?(n=(e.min.x-d.x)*u,a=(e.max.x-d.x)*u):(n=(e.max.x-d.x)*u,a=(e.min.x-d.x)*u),h>=0?(s=(e.min.y-d.y)*h,r=(e.max.y-d.y)*h):(s=(e.max.y-d.y)*h,r=(e.min.y-d.y)*h),n>r||s>a||((s>n||isNaN(n))&&(n=s),(r<a||isNaN(a))&&(a=r),m>=0?(l=(e.min.z-d.z)*m,c=(e.max.z-d.z)*m):(l=(e.max.z-d.z)*m,c=(e.min.z-d.z)*m),n>c||l>a)||((l>n||n!==n)&&(n=l),(c<a||a!==a)&&(a=c),a<0)?null:this.at(n>=0?n:a,t)}intersectsBox(e){return this.intersectBox(e,bi)!==null}intersectTriangle(e,t,n,a,s){Po.subVectors(t,e),Ws.subVectors(n,e),Do.crossVectors(Po,Ws);let r=this.direction.dot(Do),l;if(r>0){if(a)return null;l=1}else if(r<0)l=-1,r=-r;else return null;Hi.subVectors(this.origin,e);const c=l*this.direction.dot(Ws.crossVectors(Hi,Ws));if(c<0)return null;const u=l*this.direction.dot(Po.cross(Hi));if(u<0||c+u>r)return null;const h=-l*Hi.dot(Do);return h<0?null:this.at(h/r,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Zl extends gr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new zt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ii,this.combine=Ju,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const ou=new an,Qi=new mg,$s=new Kl,lu=new ce,Xs=new ce,qs=new ce,Ys=new ce,Io=new ce,Ks=new ce,cu=new ce,Zs=new ce;class pi extends Bn{constructor(e=new gi,t=new Zl){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const a=t[n[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,r=a.length;s<r;s++){const l=a[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[l]=s}}}}getVertexPosition(e,t){const n=this.geometry,a=n.attributes.position,s=n.morphAttributes.position,r=n.morphTargetsRelative;t.fromBufferAttribute(a,e);const l=this.morphTargetInfluences;if(s&&l){Ks.set(0,0,0);for(let c=0,u=s.length;c<u;c++){const h=l[c],m=s[c];h!==0&&(Io.fromBufferAttribute(m,e),r?Ks.addScaledVector(Io,h):Ks.addScaledVector(Io.sub(t),h))}t.add(Ks)}return t}raycast(e,t){const n=this.geometry,a=this.material,s=this.matrixWorld;a!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),$s.copy(n.boundingSphere),$s.applyMatrix4(s),Qi.copy(e.ray).recast(e.near),!($s.containsPoint(Qi.origin)===!1&&(Qi.intersectSphere($s,lu)===null||Qi.origin.distanceToSquared(lu)>(e.far-e.near)**2))&&(ou.copy(s).invert(),Qi.copy(e.ray).applyMatrix4(ou),!(n.boundingBox!==null&&Qi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Qi)))}_computeIntersections(e,t,n){let a;const s=this.geometry,r=this.material,l=s.index,c=s.attributes.position,u=s.attributes.uv,h=s.attributes.uv1,m=s.attributes.normal,d=s.groups,g=s.drawRange;if(l!==null)if(Array.isArray(r))for(let x=0,w=d.length;x<w;x++){const v=d[x],p=r[v.materialIndex],T=Math.max(v.start,g.start),D=Math.min(l.count,Math.min(v.start+v.count,g.start+g.count));for(let P=T,G=D;P<G;P+=3){const U=l.getX(P),K=l.getX(P+1),y=l.getX(P+2);a=js(this,p,e,n,u,h,m,U,K,y),a&&(a.faceIndex=Math.floor(P/3),a.face.materialIndex=v.materialIndex,t.push(a))}}else{const x=Math.max(0,g.start),w=Math.min(l.count,g.start+g.count);for(let v=x,p=w;v<p;v+=3){const T=l.getX(v),D=l.getX(v+1),P=l.getX(v+2);a=js(this,r,e,n,u,h,m,T,D,P),a&&(a.faceIndex=Math.floor(v/3),t.push(a))}}else if(c!==void 0)if(Array.isArray(r))for(let x=0,w=d.length;x<w;x++){const v=d[x],p=r[v.materialIndex],T=Math.max(v.start,g.start),D=Math.min(c.count,Math.min(v.start+v.count,g.start+g.count));for(let P=T,G=D;P<G;P+=3){const U=P,K=P+1,y=P+2;a=js(this,p,e,n,u,h,m,U,K,y),a&&(a.faceIndex=Math.floor(P/3),a.face.materialIndex=v.materialIndex,t.push(a))}}else{const x=Math.max(0,g.start),w=Math.min(c.count,g.start+g.count);for(let v=x,p=w;v<p;v+=3){const T=v,D=v+1,P=v+2;a=js(this,r,e,n,u,h,m,T,D,P),a&&(a.faceIndex=Math.floor(v/3),t.push(a))}}}}function gg(i,e,t,n,a,s,r,l){let c;if(e.side===Pn?c=n.intersectTriangle(r,s,a,!0,l):c=n.intersectTriangle(a,s,r,e.side===Yi,l),c===null)return null;Zs.copy(l),Zs.applyMatrix4(i.matrixWorld);const u=t.ray.origin.distanceTo(Zs);return u<t.near||u>t.far?null:{distance:u,point:Zs.clone(),object:i}}function js(i,e,t,n,a,s,r,l,c,u){i.getVertexPosition(l,Xs),i.getVertexPosition(c,qs),i.getVertexPosition(u,Ys);const h=gg(i,e,t,n,Xs,qs,Ys,cu);if(h){const m=new ce;Qn.getBarycoord(cu,Xs,qs,Ys,m),a&&(h.uv=Qn.getInterpolatedAttribute(a,l,c,u,m,new Gt)),s&&(h.uv1=Qn.getInterpolatedAttribute(s,l,c,u,m,new Gt)),r&&(h.normal=Qn.getInterpolatedAttribute(r,l,c,u,m,new ce),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a:l,b:c,c:u,normal:new ce,materialIndex:0};Qn.getNormal(Xs,qs,Ys,d.normal),h.face=d,h.barycoord=m}return h}class vg extends Mn{constructor(e=null,t=1,n=1,a,s,r,l,c,u=vn,h=vn,m,d){super(null,r,l,c,u,h,a,s,m,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Lo=new ce,_g=new ce,xg=new Mt;class ia{constructor(e=new ce(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,a){return this.normal.set(e,t,n),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const a=Lo.subVectors(n,t).cross(_g.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Lo),a=this.normal.dot(n);if(a===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/a;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||xg.getNormalMatrix(e),a=this.coplanarPoint(Lo).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-a.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const ea=new Kl,yg=new Gt(.5,.5),Js=new ce;class yd{constructor(e=new ia,t=new ia,n=new ia,a=new ia,s=new ia,r=new ia){this.planes=[e,t,n,a,s,r]}set(e,t,n,a,s,r){const l=this.planes;return l[0].copy(e),l[1].copy(t),l[2].copy(n),l[3].copy(a),l[4].copy(s),l[5].copy(r),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=ci,n=!1){const a=this.planes,s=e.elements,r=s[0],l=s[1],c=s[2],u=s[3],h=s[4],m=s[5],d=s[6],g=s[7],x=s[8],w=s[9],v=s[10],p=s[11],T=s[12],D=s[13],P=s[14],G=s[15];if(a[0].setComponents(u-r,g-h,p-x,G-T).normalize(),a[1].setComponents(u+r,g+h,p+x,G+T).normalize(),a[2].setComponents(u+l,g+m,p+w,G+D).normalize(),a[3].setComponents(u-l,g-m,p-w,G-D).normalize(),n)a[4].setComponents(c,d,v,P).normalize(),a[5].setComponents(u-c,g-d,p-v,G-P).normalize();else if(a[4].setComponents(u-c,g-d,p-v,G-P).normalize(),t===ci)a[5].setComponents(u+c,g+d,p+v,G+P).normalize();else if(t===fr)a[5].setComponents(c,d,v,P).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ea.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ea.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ea)}intersectsSprite(e){ea.center.set(0,0,0);const t=yg.distanceTo(e.center);return ea.radius=.7071067811865476+t,ea.applyMatrix4(e.matrixWorld),this.intersectsSphere(ea)}intersectsSphere(e){const t=this.planes,n=e.center,a=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const a=t[n];if(Js.x=a.normal.x>0?e.max.x:e.min.x,Js.y=a.normal.y>0?e.max.y:e.min.y,Js.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Js)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Sd extends Mn{constructor(e=[],t=la,n,a,s,r,l,c,u,h){super(e,t,n,a,s,r,l,c,u,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class gs extends Mn{constructor(e,t,n=hi,a,s,r,l=vn,c=vn,u,h=Di,m=1){if(h!==Di&&h!==oa)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:m};super(d,a,s,r,l,c,h,n,u),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Yl(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Sg extends gs{constructor(e,t=hi,n=la,a,s,r=vn,l=vn,c,u=Di){const h={width:e,height:e,depth:1},m=[h,h,h,h,h,h];super(e,e,t,n,a,s,r,l,c,u),this.image=m,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Md extends Mn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class _s extends gi{constructor(e=1,t=1,n=1,a=1,s=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:a,heightSegments:s,depthSegments:r};const l=this;a=Math.floor(a),s=Math.floor(s),r=Math.floor(r);const c=[],u=[],h=[],m=[];let d=0,g=0;x("z","y","x",-1,-1,n,t,e,r,s,0),x("z","y","x",1,-1,n,t,-e,r,s,1),x("x","z","y",1,1,e,n,t,a,r,2),x("x","z","y",1,-1,e,n,-t,a,r,3),x("x","y","z",1,-1,e,t,n,a,s,4),x("x","y","z",-1,-1,e,t,-n,a,s,5),this.setIndex(c),this.setAttribute("position",new qn(u,3)),this.setAttribute("normal",new qn(h,3)),this.setAttribute("uv",new qn(m,2));function x(w,v,p,T,D,P,G,U,K,y,C){const de=P/K,H=G/y,ie=P/2,ae=G/2,oe=U/2,te=K+1,F=y+1;let O=0,he=0;const V=new ce;for(let $=0;$<F;$++){const Me=$*H-ae;for(let _e=0;_e<te;_e++){const Ie=_e*de-ie;V[w]=Ie*T,V[v]=Me*D,V[p]=oe,u.push(V.x,V.y,V.z),V[w]=0,V[v]=0,V[p]=U>0?1:-1,h.push(V.x,V.y,V.z),m.push(_e/K),m.push(1-$/y),O+=1}}for(let $=0;$<y;$++)for(let Me=0;Me<K;Me++){const _e=d+Me+te*$,Ie=d+Me+te*($+1),ke=d+(Me+1)+te*($+1),mt=d+(Me+1)+te*$;c.push(_e,Ie,mt),c.push(Ie,ke,mt),he+=6}l.addGroup(g,he,C),g+=he,d+=O}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new _s(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class vr extends gi{constructor(e=1,t=1,n=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:a};const s=e/2,r=t/2,l=Math.floor(n),c=Math.floor(a),u=l+1,h=c+1,m=e/l,d=t/c,g=[],x=[],w=[],v=[];for(let p=0;p<h;p++){const T=p*d-r;for(let D=0;D<u;D++){const P=D*m-s;x.push(P,-T,0),w.push(0,0,1),v.push(D/l),v.push(1-p/c)}}for(let p=0;p<c;p++)for(let T=0;T<l;T++){const D=T+u*p,P=T+u*(p+1),G=T+1+u*(p+1),U=T+1+u*p;g.push(D,P,U),g.push(P,G,U)}this.setIndex(g),this.setAttribute("position",new qn(x,3)),this.setAttribute("normal",new qn(w,3)),this.setAttribute("uv",new qn(v,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vr(e.width,e.height,e.widthSegments,e.heightSegments)}}class jl extends gi{constructor(e=1,t=32,n=16,a=0,s=Math.PI*2,r=0,l=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:a,phiLength:s,thetaStart:r,thetaLength:l},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(r+l,Math.PI);let u=0;const h=[],m=new ce,d=new ce,g=[],x=[],w=[],v=[];for(let p=0;p<=n;p++){const T=[],D=p/n;let P=0;p===0&&r===0?P=.5/t:p===n&&c===Math.PI&&(P=-.5/t);for(let G=0;G<=t;G++){const U=G/t;m.x=-e*Math.cos(a+U*s)*Math.sin(r+D*l),m.y=e*Math.cos(r+D*l),m.z=e*Math.sin(a+U*s)*Math.sin(r+D*l),x.push(m.x,m.y,m.z),d.copy(m).normalize(),w.push(d.x,d.y,d.z),v.push(U+P,1-D),T.push(u++)}h.push(T)}for(let p=0;p<n;p++)for(let T=0;T<t;T++){const D=h[p][T+1],P=h[p][T],G=h[p+1][T],U=h[p+1][T+1];(p!==0||r>0)&&g.push(D,P,U),(p!==n-1||c<Math.PI)&&g.push(P,G,U)}this.setIndex(g),this.setAttribute("position",new qn(x,3)),this.setAttribute("normal",new qn(w,3)),this.setAttribute("uv",new qn(v,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new jl(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function Oa(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const a=i[t][n];a&&(a.isColor||a.isMatrix3||a.isMatrix4||a.isVector2||a.isVector3||a.isVector4||a.isTexture||a.isQuaternion)?a.isRenderTargetTexture?(vt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=a.clone():Array.isArray(a)?e[t][n]=a.slice():e[t][n]=a}}return e}function wn(i){const e={};for(let t=0;t<i.length;t++){const n=Oa(i[t]);for(const a in n)e[a]=n[a]}return e}function Mg(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ed(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ut.workingColorSpace}const Eg={clone:Oa,merge:wn};var bg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Tg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class mi extends gr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=bg,this.fragmentShader=Tg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Oa(e.uniforms),this.uniformsGroups=Mg(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const r=this.uniforms[a].value;r&&r.isTexture?t.uniforms[a]={type:"t",value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[a]={type:"c",value:r.getHex()}:r&&r.isVector2?t.uniforms[a]={type:"v2",value:r.toArray()}:r&&r.isVector3?t.uniforms[a]={type:"v3",value:r.toArray()}:r&&r.isVector4?t.uniforms[a]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?t.uniforms[a]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?t.uniforms[a]={type:"m4",value:r.toArray()}:t.uniforms[a]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const a in this.extensions)this.extensions[a]===!0&&(n[a]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class wg extends mi{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Ag extends gr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Mm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Cg extends gr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Uo={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(uu(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!uu(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function uu(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class Rg{constructor(e,t,n){const a=this;let s=!1,r=0,l=0,c;const u=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){l++,s===!1&&a.onStart!==void 0&&a.onStart(h,r,l),s=!0},this.itemEnd=function(h){r++,a.onProgress!==void 0&&a.onProgress(h,r,l),r===l&&(s=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(h){a.onError!==void 0&&a.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,m){return u.push(h,m),this},this.removeHandler=function(h){const m=u.indexOf(h);return m!==-1&&u.splice(m,2),this},this.getHandler=function(h){for(let m=0,d=u.length;m<d;m+=2){const g=u[m],x=u[m+1];if(g.global&&(g.lastIndex=0),g.test(h))return x}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const Pg=new Rg;class Jl{constructor(e){this.manager=e!==void 0?e:Pg,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const n=this;return new Promise(function(a,s){n.load(e,a,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Jl.DEFAULT_MATERIAL_NAME="__DEFAULT";const ba=new WeakMap;class Dg extends Jl{constructor(e){super(e)}load(e,t,n,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,r=Uo.get(`image:${e}`);if(r!==void 0){if(r.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(r),s.manager.itemEnd(e)},0);else{let m=ba.get(r);m===void 0&&(m=[],ba.set(r,m)),m.push({onLoad:t,onError:a})}return r}const l=ps("img");function c(){h(),t&&t(this);const m=ba.get(this)||[];for(let d=0;d<m.length;d++){const g=m[d];g.onLoad&&g.onLoad(this)}ba.delete(this),s.manager.itemEnd(e)}function u(m){h(),a&&a(m),Uo.remove(`image:${e}`);const d=ba.get(this)||[];for(let g=0;g<d.length;g++){const x=d[g];x.onError&&x.onError(m)}ba.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function h(){l.removeEventListener("load",c,!1),l.removeEventListener("error",u,!1)}return l.addEventListener("load",c,!1),l.addEventListener("error",u,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(l.crossOrigin=this.crossOrigin),Uo.add(`image:${e}`,l),s.manager.itemStart(e),l.src=e,l}}class Ig extends Jl{constructor(e){super(e)}load(e,t,n,a){const s=new Mn,r=new Dg(this.manager);return r.setCrossOrigin(this.crossOrigin),r.setPath(this.path),r.load(e,function(l){s.image=l,s.needsUpdate=!0,t!==void 0&&t(s)},n,a),s}}const Qs=new ce,er=new Ga,ai=new ce;class bd extends Bn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new an,this.projectionMatrix=new an,this.projectionMatrixInverse=new an,this.coordinateSystem=ci,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Qs,er,ai),ai.x===1&&ai.y===1&&ai.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Qs,er,ai.set(1,1,1)).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorld.decompose(Qs,er,ai),ai.x===1&&ai.y===1&&ai.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Qs,er,ai.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Wi=new ce,du=new Gt,fu=new Gt;class $n extends bd{constructor(e=50,t=1,n=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=ms*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(us*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return ms*2*Math.atan(Math.tan(us*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Wi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Wi.x,Wi.y).multiplyScalar(-e/Wi.z),Wi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Wi.x,Wi.y).multiplyScalar(-e/Wi.z)}getViewSize(e,t){return this.getViewBounds(e,du,fu),t.subVectors(fu,du)}setViewOffset(e,t,n,a,s,r){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=a,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(us*.5*this.fov)/this.zoom,n=2*t,a=this.aspect*n,s=-.5*a;const r=this.view;if(this.view!==null&&this.view.enabled){const c=r.fullWidth,u=r.fullHeight;s+=r.offsetX*a/c,t-=r.offsetY*n/u,a*=r.width/c,n*=r.height/u}const l=this.filmOffset;l!==0&&(s+=e*l/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+a,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Td extends bd{constructor(e=-1,t=1,n=1,a=-1,s=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=a,this.near=s,this.far=r,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,a,s,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=a,this.view.width=s,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let s=n-e,r=n+e,l=a+t,c=a-t;if(this.view!==null&&this.view.enabled){const u=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=u*this.view.offsetX,r=s+u*this.view.width,l-=h*this.view.offsetY,c=l-h*this.view.height}this.projectionMatrix.makeOrthographic(s,r,l,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const Ta=-90,wa=1;class Lg extends Bn{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new $n(Ta,wa,e,t);a.layers=this.layers,this.add(a);const s=new $n(Ta,wa,e,t);s.layers=this.layers,this.add(s);const r=new $n(Ta,wa,e,t);r.layers=this.layers,this.add(r);const l=new $n(Ta,wa,e,t);l.layers=this.layers,this.add(l);const c=new $n(Ta,wa,e,t);c.layers=this.layers,this.add(c);const u=new $n(Ta,wa,e,t);u.layers=this.layers,this.add(u)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,a,s,r,l,c]=t;for(const u of t)this.remove(u);if(e===ci)n.up.set(0,1,0),n.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),l.up.set(0,1,0),l.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===fr)n.up.set(0,-1,0),n.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),l.up.set(0,-1,0),l.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const u of t)this.add(u),u.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,r,l,c,u,h]=this.children,m=e.getRenderTarget(),d=e.getActiveCubeFace(),g=e.getActiveMipmapLevel(),x=e.xr.enabled;e.xr.enabled=!1;const w=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let v=!1;e.isWebGLRenderer===!0?v=e.state.buffers.depth.getReversed():v=e.reversedDepthBuffer,e.setRenderTarget(n,0,a),v&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,1,a),v&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,2,a),v&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,3,a),v&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,a),v&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),n.texture.generateMipmaps=w,e.setRenderTarget(n,5,a),v&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(m,d,g),e.xr.enabled=x,n.texture.needsPMREMUpdate=!0}}class Ug extends $n{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}function hu(i,e,t,n){const a=Ng(n);switch(t){case dd:return i*e;case hd:return i*e/a.components*a.byteLength;case Gl:return i*e/a.components*a.byteLength;case Na:return i*e*2/a.components*a.byteLength;case Hl:return i*e*2/a.components*a.byteLength;case fd:return i*e*3/a.components*a.byteLength;case ti:return i*e*4/a.components*a.byteLength;case Wl:return i*e*4/a.components*a.byteLength;case sr:case rr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case or:case lr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case tl:case il:return Math.max(i,16)*Math.max(e,8)/4;case el:case nl:return Math.max(i,8)*Math.max(e,8)/2;case al:case sl:case ol:case ll:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case rl:case cl:case ul:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case dl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case fl:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case hl:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case pl:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case ml:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case gl:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case vl:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case _l:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case xl:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case yl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Sl:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Ml:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case El:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case bl:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Tl:case wl:case Al:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Cl:case Rl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Pl:case Dl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ng(i){switch(i){case Xn:case od:return{byteLength:1,components:1};case fs:case ld:case Pi:return{byteLength:2,components:1};case Vl:case zl:return{byteLength:2,components:4};case hi:case kl:case li:return{byteLength:4,components:1};case cd:case ud:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Bl}}));typeof window<"u"&&(window.__THREE__?vt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Bl);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function wd(){let i=null,e=!1,t=null,n=null;function a(s,r){t(s,r),n=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(a),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function Fg(i){const e=new WeakMap;function t(l,c){const u=l.array,h=l.usage,m=u.byteLength,d=i.createBuffer();i.bindBuffer(c,d),i.bufferData(c,u,h),l.onUploadCallback();let g;if(u instanceof Float32Array)g=i.FLOAT;else if(typeof Float16Array<"u"&&u instanceof Float16Array)g=i.HALF_FLOAT;else if(u instanceof Uint16Array)l.isFloat16BufferAttribute?g=i.HALF_FLOAT:g=i.UNSIGNED_SHORT;else if(u instanceof Int16Array)g=i.SHORT;else if(u instanceof Uint32Array)g=i.UNSIGNED_INT;else if(u instanceof Int32Array)g=i.INT;else if(u instanceof Int8Array)g=i.BYTE;else if(u instanceof Uint8Array)g=i.UNSIGNED_BYTE;else if(u instanceof Uint8ClampedArray)g=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:d,type:g,bytesPerElement:u.BYTES_PER_ELEMENT,version:l.version,size:m}}function n(l,c,u){const h=c.array,m=c.updateRanges;if(i.bindBuffer(u,l),m.length===0)i.bufferSubData(u,0,h);else{m.sort((g,x)=>g.start-x.start);let d=0;for(let g=1;g<m.length;g++){const x=m[d],w=m[g];w.start<=x.start+x.count+1?x.count=Math.max(x.count,w.start+w.count-x.start):(++d,m[d]=w)}m.length=d+1;for(let g=0,x=m.length;g<x;g++){const w=m[g];i.bufferSubData(u,w.start*h.BYTES_PER_ELEMENT,h,w.start,w.count)}c.clearUpdateRanges()}c.onUploadCallback()}function a(l){return l.isInterleavedBufferAttribute&&(l=l.data),e.get(l)}function s(l){l.isInterleavedBufferAttribute&&(l=l.data);const c=e.get(l);c&&(i.deleteBuffer(c.buffer),e.delete(l))}function r(l,c){if(l.isInterleavedBufferAttribute&&(l=l.data),l.isGLBufferAttribute){const h=e.get(l);(!h||h.version<l.version)&&e.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}const u=e.get(l);if(u===void 0)e.set(l,t(l,c));else if(u.version<l.version){if(u.size!==l.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(u.buffer,l,c),u.version=l.version}}return{get:a,remove:s,update:r}}var Og=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Bg=`#ifdef USE_ALPHAHASH
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
#endif`,kg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Vg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,zg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Gg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Hg=`#ifdef USE_AOMAP
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
#endif`,Wg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,$g=`#ifdef USE_BATCHING
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
#endif`,Xg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,qg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Yg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Kg=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Zg=`#ifdef USE_IRIDESCENCE
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
#endif`,jg=`#ifdef USE_BUMPMAP
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
#endif`,Jg=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Qg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,ev=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,tv=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,nv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,iv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,av=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,sv=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,rv=`#define PI 3.141592653589793
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
} // validated`,ov=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,lv=`vec3 transformedNormal = objectNormal;
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
#endif`,cv=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,uv=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,dv=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,fv=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,hv="gl_FragColor = linearToOutputTexel( gl_FragColor );",pv=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,mv=`#ifdef USE_ENVMAP
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
#endif`,gv=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,vv=`#ifdef USE_ENVMAP
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
#endif`,_v=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,xv=`#ifdef USE_ENVMAP
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
#endif`,yv=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Sv=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Mv=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Ev=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,bv=`#ifdef USE_GRADIENTMAP
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
}`,Tv=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,wv=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Av=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Cv=`uniform bool receiveShadow;
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
#endif`,Rv=`#ifdef USE_ENVMAP
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
#endif`,Pv=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Dv=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Iv=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Lv=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Uv=`PhysicalMaterial material;
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
#endif`,Nv=`uniform sampler2D dfgLUT;
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
}`,Fv=`
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
#endif`,Ov=`#if defined( RE_IndirectDiffuse )
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
#endif`,Bv=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,kv=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Vv=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,zv=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Gv=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Hv=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Wv=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,$v=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Xv=`#if defined( USE_POINTS_UV )
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
#endif`,qv=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Yv=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Kv=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Zv=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,jv=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Jv=`#ifdef USE_MORPHTARGETS
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
#endif`,Qv=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,e_=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,t_=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,n_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,i_=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,a_=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,s_=`#ifdef USE_NORMALMAP
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
#endif`,r_=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,o_=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,l_=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,c_=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,u_=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,d_=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,f_=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,h_=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,p_=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,m_=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,g_=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,v_=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,__=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,x_=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,y_=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,S_=`float getShadowMask() {
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
}`,M_=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,E_=`#ifdef USE_SKINNING
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
#endif`,b_=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,T_=`#ifdef USE_SKINNING
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
#endif`,w_=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,A_=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,C_=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,R_=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,P_=`#ifdef USE_TRANSMISSION
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
#endif`,D_=`#ifdef USE_TRANSMISSION
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
#endif`,I_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,L_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,U_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,N_=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const F_=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,O_=`uniform sampler2D t2D;
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
}`,B_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,k_=`#ifdef ENVMAP_TYPE_CUBE
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
}`,V_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,z_=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,G_=`#include <common>
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
}`,H_=`#if DEPTH_PACKING == 3200
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
}`,W_=`#define DISTANCE
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
}`,$_=`#define DISTANCE
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
}`,X_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,q_=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Y_=`uniform float scale;
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
}`,K_=`uniform vec3 diffuse;
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
}`,Z_=`#include <common>
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
}`,j_=`uniform vec3 diffuse;
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
}`,J_=`#define LAMBERT
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
}`,Q_=`#define LAMBERT
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
}`,e0=`#define MATCAP
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
}`,t0=`#define MATCAP
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
}`,n0=`#define NORMAL
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
}`,i0=`#define NORMAL
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
}`,a0=`#define PHONG
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
}`,s0=`#define PHONG
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
}`,r0=`#define STANDARD
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
}`,o0=`#define STANDARD
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
}`,l0=`#define TOON
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
}`,c0=`#define TOON
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
}`,u0=`uniform float size;
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
}`,d0=`uniform vec3 diffuse;
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
}`,f0=`#include <common>
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
}`,h0=`uniform vec3 color;
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
}`,p0=`uniform float rotation;
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
}`,m0=`uniform vec3 diffuse;
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
}`,bt={alphahash_fragment:Og,alphahash_pars_fragment:Bg,alphamap_fragment:kg,alphamap_pars_fragment:Vg,alphatest_fragment:zg,alphatest_pars_fragment:Gg,aomap_fragment:Hg,aomap_pars_fragment:Wg,batching_pars_vertex:$g,batching_vertex:Xg,begin_vertex:qg,beginnormal_vertex:Yg,bsdfs:Kg,iridescence_fragment:Zg,bumpmap_pars_fragment:jg,clipping_planes_fragment:Jg,clipping_planes_pars_fragment:Qg,clipping_planes_pars_vertex:ev,clipping_planes_vertex:tv,color_fragment:nv,color_pars_fragment:iv,color_pars_vertex:av,color_vertex:sv,common:rv,cube_uv_reflection_fragment:ov,defaultnormal_vertex:lv,displacementmap_pars_vertex:cv,displacementmap_vertex:uv,emissivemap_fragment:dv,emissivemap_pars_fragment:fv,colorspace_fragment:hv,colorspace_pars_fragment:pv,envmap_fragment:mv,envmap_common_pars_fragment:gv,envmap_pars_fragment:vv,envmap_pars_vertex:_v,envmap_physical_pars_fragment:Rv,envmap_vertex:xv,fog_vertex:yv,fog_pars_vertex:Sv,fog_fragment:Mv,fog_pars_fragment:Ev,gradientmap_pars_fragment:bv,lightmap_pars_fragment:Tv,lights_lambert_fragment:wv,lights_lambert_pars_fragment:Av,lights_pars_begin:Cv,lights_toon_fragment:Pv,lights_toon_pars_fragment:Dv,lights_phong_fragment:Iv,lights_phong_pars_fragment:Lv,lights_physical_fragment:Uv,lights_physical_pars_fragment:Nv,lights_fragment_begin:Fv,lights_fragment_maps:Ov,lights_fragment_end:Bv,logdepthbuf_fragment:kv,logdepthbuf_pars_fragment:Vv,logdepthbuf_pars_vertex:zv,logdepthbuf_vertex:Gv,map_fragment:Hv,map_pars_fragment:Wv,map_particle_fragment:$v,map_particle_pars_fragment:Xv,metalnessmap_fragment:qv,metalnessmap_pars_fragment:Yv,morphinstance_vertex:Kv,morphcolor_vertex:Zv,morphnormal_vertex:jv,morphtarget_pars_vertex:Jv,morphtarget_vertex:Qv,normal_fragment_begin:e_,normal_fragment_maps:t_,normal_pars_fragment:n_,normal_pars_vertex:i_,normal_vertex:a_,normalmap_pars_fragment:s_,clearcoat_normal_fragment_begin:r_,clearcoat_normal_fragment_maps:o_,clearcoat_pars_fragment:l_,iridescence_pars_fragment:c_,opaque_fragment:u_,packing:d_,premultiplied_alpha_fragment:f_,project_vertex:h_,dithering_fragment:p_,dithering_pars_fragment:m_,roughnessmap_fragment:g_,roughnessmap_pars_fragment:v_,shadowmap_pars_fragment:__,shadowmap_pars_vertex:x_,shadowmap_vertex:y_,shadowmask_pars_fragment:S_,skinbase_vertex:M_,skinning_pars_vertex:E_,skinning_vertex:b_,skinnormal_vertex:T_,specularmap_fragment:w_,specularmap_pars_fragment:A_,tonemapping_fragment:C_,tonemapping_pars_fragment:R_,transmission_fragment:P_,transmission_pars_fragment:D_,uv_pars_fragment:I_,uv_pars_vertex:L_,uv_vertex:U_,worldpos_vertex:N_,background_vert:F_,background_frag:O_,backgroundCube_vert:B_,backgroundCube_frag:k_,cube_vert:V_,cube_frag:z_,depth_vert:G_,depth_frag:H_,distance_vert:W_,distance_frag:$_,equirect_vert:X_,equirect_frag:q_,linedashed_vert:Y_,linedashed_frag:K_,meshbasic_vert:Z_,meshbasic_frag:j_,meshlambert_vert:J_,meshlambert_frag:Q_,meshmatcap_vert:e0,meshmatcap_frag:t0,meshnormal_vert:n0,meshnormal_frag:i0,meshphong_vert:a0,meshphong_frag:s0,meshphysical_vert:r0,meshphysical_frag:o0,meshtoon_vert:l0,meshtoon_frag:c0,points_vert:u0,points_frag:d0,shadow_vert:f0,shadow_frag:h0,sprite_vert:p0,sprite_frag:m0},Xe={common:{diffuse:{value:new zt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Mt},alphaMap:{value:null},alphaMapTransform:{value:new Mt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Mt}},envmap:{envMap:{value:null},envMapRotation:{value:new Mt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Mt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Mt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Mt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Mt},normalScale:{value:new Gt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Mt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Mt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Mt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Mt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new zt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new zt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Mt},alphaTest:{value:0},uvTransform:{value:new Mt}},sprite:{diffuse:{value:new zt(16777215)},opacity:{value:1},center:{value:new Gt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Mt},alphaMap:{value:null},alphaMapTransform:{value:new Mt},alphaTest:{value:0}}},ri={basic:{uniforms:wn([Xe.common,Xe.specularmap,Xe.envmap,Xe.aomap,Xe.lightmap,Xe.fog]),vertexShader:bt.meshbasic_vert,fragmentShader:bt.meshbasic_frag},lambert:{uniforms:wn([Xe.common,Xe.specularmap,Xe.envmap,Xe.aomap,Xe.lightmap,Xe.emissivemap,Xe.bumpmap,Xe.normalmap,Xe.displacementmap,Xe.fog,Xe.lights,{emissive:{value:new zt(0)},envMapIntensity:{value:1}}]),vertexShader:bt.meshlambert_vert,fragmentShader:bt.meshlambert_frag},phong:{uniforms:wn([Xe.common,Xe.specularmap,Xe.envmap,Xe.aomap,Xe.lightmap,Xe.emissivemap,Xe.bumpmap,Xe.normalmap,Xe.displacementmap,Xe.fog,Xe.lights,{emissive:{value:new zt(0)},specular:{value:new zt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:bt.meshphong_vert,fragmentShader:bt.meshphong_frag},standard:{uniforms:wn([Xe.common,Xe.envmap,Xe.aomap,Xe.lightmap,Xe.emissivemap,Xe.bumpmap,Xe.normalmap,Xe.displacementmap,Xe.roughnessmap,Xe.metalnessmap,Xe.fog,Xe.lights,{emissive:{value:new zt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:bt.meshphysical_vert,fragmentShader:bt.meshphysical_frag},toon:{uniforms:wn([Xe.common,Xe.aomap,Xe.lightmap,Xe.emissivemap,Xe.bumpmap,Xe.normalmap,Xe.displacementmap,Xe.gradientmap,Xe.fog,Xe.lights,{emissive:{value:new zt(0)}}]),vertexShader:bt.meshtoon_vert,fragmentShader:bt.meshtoon_frag},matcap:{uniforms:wn([Xe.common,Xe.bumpmap,Xe.normalmap,Xe.displacementmap,Xe.fog,{matcap:{value:null}}]),vertexShader:bt.meshmatcap_vert,fragmentShader:bt.meshmatcap_frag},points:{uniforms:wn([Xe.points,Xe.fog]),vertexShader:bt.points_vert,fragmentShader:bt.points_frag},dashed:{uniforms:wn([Xe.common,Xe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:bt.linedashed_vert,fragmentShader:bt.linedashed_frag},depth:{uniforms:wn([Xe.common,Xe.displacementmap]),vertexShader:bt.depth_vert,fragmentShader:bt.depth_frag},normal:{uniforms:wn([Xe.common,Xe.bumpmap,Xe.normalmap,Xe.displacementmap,{opacity:{value:1}}]),vertexShader:bt.meshnormal_vert,fragmentShader:bt.meshnormal_frag},sprite:{uniforms:wn([Xe.sprite,Xe.fog]),vertexShader:bt.sprite_vert,fragmentShader:bt.sprite_frag},background:{uniforms:{uvTransform:{value:new Mt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:bt.background_vert,fragmentShader:bt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Mt}},vertexShader:bt.backgroundCube_vert,fragmentShader:bt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:bt.cube_vert,fragmentShader:bt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:bt.equirect_vert,fragmentShader:bt.equirect_frag},distance:{uniforms:wn([Xe.common,Xe.displacementmap,{referencePosition:{value:new ce},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:bt.distance_vert,fragmentShader:bt.distance_frag},shadow:{uniforms:wn([Xe.lights,Xe.fog,{color:{value:new zt(0)},opacity:{value:1}}]),vertexShader:bt.shadow_vert,fragmentShader:bt.shadow_frag}};ri.physical={uniforms:wn([ri.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Mt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Mt},clearcoatNormalScale:{value:new Gt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Mt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Mt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Mt},sheen:{value:0},sheenColor:{value:new zt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Mt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Mt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Mt},transmissionSamplerSize:{value:new Gt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Mt},attenuationDistance:{value:0},attenuationColor:{value:new zt(0)},specularColor:{value:new zt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Mt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Mt},anisotropyVector:{value:new Gt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Mt}}]),vertexShader:bt.meshphysical_vert,fragmentShader:bt.meshphysical_frag};const tr={r:0,b:0,g:0},ta=new Ii,g0=new an;function v0(i,e,t,n,a,s){const r=new zt(0);let l=a===!0?0:1,c,u,h=null,m=0,d=null;function g(T){let D=T.isScene===!0?T.background:null;if(D&&D.isTexture){const P=T.backgroundBlurriness>0;D=e.get(D,P)}return D}function x(T){let D=!1;const P=g(T);P===null?v(r,l):P&&P.isColor&&(v(P,1),D=!0);const G=i.xr.getEnvironmentBlendMode();G==="additive"?t.buffers.color.setClear(0,0,0,1,s):G==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,s),(i.autoClear||D)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function w(T,D){const P=g(D);P&&(P.isCubeTexture||P.mapping===mr)?(u===void 0&&(u=new pi(new _s(1,1,1),new mi({name:"BackgroundCubeMaterial",uniforms:Oa(ri.backgroundCube.uniforms),vertexShader:ri.backgroundCube.vertexShader,fragmentShader:ri.backgroundCube.fragmentShader,side:Pn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(G,U,K){this.matrixWorld.copyPosition(K.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(u)),ta.copy(D.backgroundRotation),ta.x*=-1,ta.y*=-1,ta.z*=-1,P.isCubeTexture&&P.isRenderTargetTexture===!1&&(ta.y*=-1,ta.z*=-1),u.material.uniforms.envMap.value=P,u.material.uniforms.flipEnvMap.value=P.isCubeTexture&&P.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=D.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=D.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(g0.makeRotationFromEuler(ta)),u.material.toneMapped=Ut.getTransfer(P.colorSpace)!==kt,(h!==P||m!==P.version||d!==i.toneMapping)&&(u.material.needsUpdate=!0,h=P,m=P.version,d=i.toneMapping),u.layers.enableAll(),T.unshift(u,u.geometry,u.material,0,0,null)):P&&P.isTexture&&(c===void 0&&(c=new pi(new vr(2,2),new mi({name:"BackgroundMaterial",uniforms:Oa(ri.background.uniforms),vertexShader:ri.background.vertexShader,fragmentShader:ri.background.fragmentShader,side:Yi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=P,c.material.uniforms.backgroundIntensity.value=D.backgroundIntensity,c.material.toneMapped=Ut.getTransfer(P.colorSpace)!==kt,P.matrixAutoUpdate===!0&&P.updateMatrix(),c.material.uniforms.uvTransform.value.copy(P.matrix),(h!==P||m!==P.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,h=P,m=P.version,d=i.toneMapping),c.layers.enableAll(),T.unshift(c,c.geometry,c.material,0,0,null))}function v(T,D){T.getRGB(tr,Ed(i)),t.buffers.color.setClear(tr.r,tr.g,tr.b,D,s)}function p(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return r},setClearColor:function(T,D=1){r.set(T),l=D,v(r,l)},getClearAlpha:function(){return l},setClearAlpha:function(T){l=T,v(r,l)},render:x,addToRenderList:w,dispose:p}}function _0(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},a=d(null);let s=a,r=!1;function l(H,ie,ae,oe,te){let F=!1;const O=m(H,oe,ae,ie);s!==O&&(s=O,u(s.object)),F=g(H,oe,ae,te),F&&x(H,oe,ae,te),te!==null&&e.update(te,i.ELEMENT_ARRAY_BUFFER),(F||r)&&(r=!1,P(H,ie,ae,oe),te!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(te).buffer))}function c(){return i.createVertexArray()}function u(H){return i.bindVertexArray(H)}function h(H){return i.deleteVertexArray(H)}function m(H,ie,ae,oe){const te=oe.wireframe===!0;let F=n[ie.id];F===void 0&&(F={},n[ie.id]=F);const O=H.isInstancedMesh===!0?H.id:0;let he=F[O];he===void 0&&(he={},F[O]=he);let V=he[ae.id];V===void 0&&(V={},he[ae.id]=V);let $=V[te];return $===void 0&&($=d(c()),V[te]=$),$}function d(H){const ie=[],ae=[],oe=[];for(let te=0;te<t;te++)ie[te]=0,ae[te]=0,oe[te]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:ie,enabledAttributes:ae,attributeDivisors:oe,object:H,attributes:{},index:null}}function g(H,ie,ae,oe){const te=s.attributes,F=ie.attributes;let O=0;const he=ae.getAttributes();for(const V in he)if(he[V].location>=0){const Me=te[V];let _e=F[V];if(_e===void 0&&(V==="instanceMatrix"&&H.instanceMatrix&&(_e=H.instanceMatrix),V==="instanceColor"&&H.instanceColor&&(_e=H.instanceColor)),Me===void 0||Me.attribute!==_e||_e&&Me.data!==_e.data)return!0;O++}return s.attributesNum!==O||s.index!==oe}function x(H,ie,ae,oe){const te={},F=ie.attributes;let O=0;const he=ae.getAttributes();for(const V in he)if(he[V].location>=0){let Me=F[V];Me===void 0&&(V==="instanceMatrix"&&H.instanceMatrix&&(Me=H.instanceMatrix),V==="instanceColor"&&H.instanceColor&&(Me=H.instanceColor));const _e={};_e.attribute=Me,Me&&Me.data&&(_e.data=Me.data),te[V]=_e,O++}s.attributes=te,s.attributesNum=O,s.index=oe}function w(){const H=s.newAttributes;for(let ie=0,ae=H.length;ie<ae;ie++)H[ie]=0}function v(H){p(H,0)}function p(H,ie){const ae=s.newAttributes,oe=s.enabledAttributes,te=s.attributeDivisors;ae[H]=1,oe[H]===0&&(i.enableVertexAttribArray(H),oe[H]=1),te[H]!==ie&&(i.vertexAttribDivisor(H,ie),te[H]=ie)}function T(){const H=s.newAttributes,ie=s.enabledAttributes;for(let ae=0,oe=ie.length;ae<oe;ae++)ie[ae]!==H[ae]&&(i.disableVertexAttribArray(ae),ie[ae]=0)}function D(H,ie,ae,oe,te,F,O){O===!0?i.vertexAttribIPointer(H,ie,ae,te,F):i.vertexAttribPointer(H,ie,ae,oe,te,F)}function P(H,ie,ae,oe){w();const te=oe.attributes,F=ae.getAttributes(),O=ie.defaultAttributeValues;for(const he in F){const V=F[he];if(V.location>=0){let $=te[he];if($===void 0&&(he==="instanceMatrix"&&H.instanceMatrix&&($=H.instanceMatrix),he==="instanceColor"&&H.instanceColor&&($=H.instanceColor)),$!==void 0){const Me=$.normalized,_e=$.itemSize,Ie=e.get($);if(Ie===void 0)continue;const ke=Ie.buffer,mt=Ie.type,pe=Ie.bytesPerElement,Pe=mt===i.INT||mt===i.UNSIGNED_INT||$.gpuType===kl;if($.isInterleavedBufferAttribute){const Le=$.data,ut=Le.stride,xe=$.offset;if(Le.isInstancedInterleavedBuffer){for(let Ye=0;Ye<V.locationSize;Ye++)p(V.location+Ye,Le.meshPerAttribute);H.isInstancedMesh!==!0&&oe._maxInstanceCount===void 0&&(oe._maxInstanceCount=Le.meshPerAttribute*Le.count)}else for(let Ye=0;Ye<V.locationSize;Ye++)v(V.location+Ye);i.bindBuffer(i.ARRAY_BUFFER,ke);for(let Ye=0;Ye<V.locationSize;Ye++)D(V.location+Ye,_e/V.locationSize,mt,Me,ut*pe,(xe+_e/V.locationSize*Ye)*pe,Pe)}else{if($.isInstancedBufferAttribute){for(let Le=0;Le<V.locationSize;Le++)p(V.location+Le,$.meshPerAttribute);H.isInstancedMesh!==!0&&oe._maxInstanceCount===void 0&&(oe._maxInstanceCount=$.meshPerAttribute*$.count)}else for(let Le=0;Le<V.locationSize;Le++)v(V.location+Le);i.bindBuffer(i.ARRAY_BUFFER,ke);for(let Le=0;Le<V.locationSize;Le++)D(V.location+Le,_e/V.locationSize,mt,Me,_e*pe,_e/V.locationSize*Le*pe,Pe)}}else if(O!==void 0){const Me=O[he];if(Me!==void 0)switch(Me.length){case 2:i.vertexAttrib2fv(V.location,Me);break;case 3:i.vertexAttrib3fv(V.location,Me);break;case 4:i.vertexAttrib4fv(V.location,Me);break;default:i.vertexAttrib1fv(V.location,Me)}}}}T()}function G(){C();for(const H in n){const ie=n[H];for(const ae in ie){const oe=ie[ae];for(const te in oe){const F=oe[te];for(const O in F)h(F[O].object),delete F[O];delete oe[te]}}delete n[H]}}function U(H){if(n[H.id]===void 0)return;const ie=n[H.id];for(const ae in ie){const oe=ie[ae];for(const te in oe){const F=oe[te];for(const O in F)h(F[O].object),delete F[O];delete oe[te]}}delete n[H.id]}function K(H){for(const ie in n){const ae=n[ie];for(const oe in ae){const te=ae[oe];if(te[H.id]===void 0)continue;const F=te[H.id];for(const O in F)h(F[O].object),delete F[O];delete te[H.id]}}}function y(H){for(const ie in n){const ae=n[ie],oe=H.isInstancedMesh===!0?H.id:0,te=ae[oe];if(te!==void 0){for(const F in te){const O=te[F];for(const he in O)h(O[he].object),delete O[he];delete te[F]}delete ae[oe],Object.keys(ae).length===0&&delete n[ie]}}}function C(){de(),r=!0,s!==a&&(s=a,u(s.object))}function de(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:l,reset:C,resetDefaultState:de,dispose:G,releaseStatesOfGeometry:U,releaseStatesOfObject:y,releaseStatesOfProgram:K,initAttributes:w,enableAttribute:v,disableUnusedAttributes:T}}function x0(i,e,t){let n;function a(u){n=u}function s(u,h){i.drawArrays(n,u,h),t.update(h,n,1)}function r(u,h,m){m!==0&&(i.drawArraysInstanced(n,u,h,m),t.update(h,n,m))}function l(u,h,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,u,0,h,0,m);let g=0;for(let x=0;x<m;x++)g+=h[x];t.update(g,n,1)}function c(u,h,m,d){if(m===0)return;const g=e.get("WEBGL_multi_draw");if(g===null)for(let x=0;x<u.length;x++)r(u[x],h[x],d[x]);else{g.multiDrawArraysInstancedWEBGL(n,u,0,h,0,d,0,m);let x=0;for(let w=0;w<m;w++)x+=h[w]*d[w];t.update(x,n,1)}}this.setMode=a,this.render=s,this.renderInstances=r,this.renderMultiDraw=l,this.renderMultiDrawInstances=c}function y0(i,e,t,n){let a;function s(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const K=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(K.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function r(K){return!(K!==ti&&n.convert(K)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function l(K){const y=K===Pi&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(K!==Xn&&n.convert(K)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&K!==li&&!y)}function c(K){if(K==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";K="mediump"}return K==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let u=t.precision!==void 0?t.precision:"highp";const h=c(u);h!==u&&(vt("WebGLRenderer:",u,"not supported, using",h,"instead."),u=h);const m=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),g=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),w=i.getParameter(i.MAX_TEXTURE_SIZE),v=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),T=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),D=i.getParameter(i.MAX_VARYING_VECTORS),P=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),G=i.getParameter(i.MAX_SAMPLES),U=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:r,textureTypeReadable:l,precision:u,logarithmicDepthBuffer:m,reversedDepthBuffer:d,maxTextures:g,maxVertexTextures:x,maxTextureSize:w,maxCubemapSize:v,maxAttributes:p,maxVertexUniforms:T,maxVaryings:D,maxFragmentUniforms:P,maxSamples:G,samples:U}}function S0(i){const e=this;let t=null,n=0,a=!1,s=!1;const r=new ia,l=new Mt,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(m,d){const g=m.length!==0||d||n!==0||a;return a=d,n=m.length,g},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(m,d){t=h(m,d,0)},this.setState=function(m,d,g){const x=m.clippingPlanes,w=m.clipIntersection,v=m.clipShadows,p=i.get(m);if(!a||x===null||x.length===0||s&&!v)s?h(null):u();else{const T=s?0:n,D=T*4;let P=p.clippingState||null;c.value=P,P=h(x,d,D,g);for(let G=0;G!==D;++G)P[G]=t[G];p.clippingState=P,this.numIntersection=w?this.numPlanes:0,this.numPlanes+=T}};function u(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(m,d,g,x){const w=m!==null?m.length:0;let v=null;if(w!==0){if(v=c.value,x!==!0||v===null){const p=g+w*4,T=d.matrixWorldInverse;l.getNormalMatrix(T),(v===null||v.length<p)&&(v=new Float32Array(p));for(let D=0,P=g;D!==w;++D,P+=4)r.copy(m[D]).applyMatrix4(T,l),r.normal.toArray(v,P),v[P+3]=r.constant}c.value=v,c.needsUpdate=!0}return e.numPlanes=w,e.numIntersection=0,v}}const qi=4,pu=[.125,.215,.35,.446,.526,.582],sa=20,M0=256,is=new Td,mu=new zt;let No=null,Fo=0,Oo=0,Bo=!1;const E0=new ce;class gu{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,a=100,s={}){const{size:r=256,position:l=E0}=s;No=this._renderer.getRenderTarget(),Fo=this._renderer.getActiveCubeFace(),Oo=this._renderer.getActiveMipmapLevel(),Bo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(r);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,a,c,l),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=xu(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=_u(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(No,Fo,Oo),this._renderer.xr.enabled=Bo,e.scissorTest=!1,Aa(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===la||e.mapping===Ua?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),No=this._renderer.getRenderTarget(),Fo=this._renderer.getActiveCubeFace(),Oo=this._renderer.getActiveMipmapLevel(),Bo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Sn,minFilter:Sn,generateMipmaps:!1,type:Pi,format:ti,colorSpace:Fa,depthBuffer:!1},a=vu(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=vu(e,t,n);const{_lodMax:s}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=b0(s)),this._blurMaterial=w0(s,e,t),this._ggxMaterial=T0(s,e,t)}return a}_compileMaterial(e){const t=new pi(new gi,e);this._renderer.compile(t,is)}_sceneToCubeUV(e,t,n,a,s){const c=new $n(90,1,t,n),u=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],m=this._renderer,d=m.autoClear,g=m.toneMapping;m.getClearColor(mu),m.toneMapping=ui,m.autoClear=!1,m.state.buffers.depth.getReversed()&&(m.setRenderTarget(a),m.clearDepth(),m.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new pi(new _s,new Zl({name:"PMREM.Background",side:Pn,depthWrite:!1,depthTest:!1})));const w=this._backgroundBox,v=w.material;let p=!1;const T=e.background;T?T.isColor&&(v.color.copy(T),e.background=null,p=!0):(v.color.copy(mu),p=!0);for(let D=0;D<6;D++){const P=D%3;P===0?(c.up.set(0,u[D],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x+h[D],s.y,s.z)):P===1?(c.up.set(0,0,u[D]),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y+h[D],s.z)):(c.up.set(0,u[D],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y,s.z+h[D]));const G=this._cubeSize;Aa(a,P*G,D>2?G:0,G,G),m.setRenderTarget(a),p&&m.render(w,c),m.render(e,c)}m.toneMapping=g,m.autoClear=d,e.background=T}_textureToCubeUV(e,t){const n=this._renderer,a=e.mapping===la||e.mapping===Ua;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=xu()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=_u());const s=a?this._cubemapMaterial:this._equirectMaterial,r=this._lodMeshes[0];r.material=s;const l=s.uniforms;l.envMap.value=e;const c=this._cubeSize;Aa(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(r,is)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let s=1;s<a;s++)this._applyGGXFilter(e,s-1,s);t.autoClear=n}_applyGGXFilter(e,t,n){const a=this._renderer,s=this._pingPongRenderTarget,r=this._ggxMaterial,l=this._lodMeshes[n];l.material=r;const c=r.uniforms,u=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),m=Math.sqrt(u*u-h*h),d=0+u*1.25,g=m*d,{_lodMax:x}=this,w=this._sizeLods[n],v=3*w*(n>x-qi?n-x+qi:0),p=4*(this._cubeSize-w);c.envMap.value=e.texture,c.roughness.value=g,c.mipInt.value=x-t,Aa(s,v,p,3*w,2*w),a.setRenderTarget(s),a.render(l,is),c.envMap.value=s.texture,c.roughness.value=0,c.mipInt.value=x-n,Aa(e,v,p,3*w,2*w),a.setRenderTarget(e),a.render(l,is)}_blur(e,t,n,a,s){const r=this._pingPongRenderTarget;this._halfBlur(e,r,t,n,a,"latitudinal",s),this._halfBlur(r,e,n,n,a,"longitudinal",s)}_halfBlur(e,t,n,a,s,r,l){const c=this._renderer,u=this._blurMaterial;r!=="latitudinal"&&r!=="longitudinal"&&Nt("blur direction must be either latitudinal or longitudinal!");const h=3,m=this._lodMeshes[a];m.material=u;const d=u.uniforms,g=this._sizeLods[n]-1,x=isFinite(s)?Math.PI/(2*g):2*Math.PI/(2*sa-1),w=s/x,v=isFinite(s)?1+Math.floor(h*w):sa;v>sa&&vt(`sigmaRadians, ${s}, is too large and will clip, as it requested ${v} samples when the maximum is set to ${sa}`);const p=[];let T=0;for(let K=0;K<sa;++K){const y=K/w,C=Math.exp(-y*y/2);p.push(C),K===0?T+=C:K<v&&(T+=2*C)}for(let K=0;K<p.length;K++)p[K]=p[K]/T;d.envMap.value=e.texture,d.samples.value=v,d.weights.value=p,d.latitudinal.value=r==="latitudinal",l&&(d.poleAxis.value=l);const{_lodMax:D}=this;d.dTheta.value=x,d.mipInt.value=D-n;const P=this._sizeLods[a],G=3*P*(a>D-qi?a-D+qi:0),U=4*(this._cubeSize-P);Aa(t,G,U,3*P,2*P),c.setRenderTarget(t),c.render(m,is)}}function b0(i){const e=[],t=[],n=[];let a=i;const s=i-qi+1+pu.length;for(let r=0;r<s;r++){const l=Math.pow(2,a);e.push(l);let c=1/l;r>i-qi?c=pu[r-i+qi-1]:r===0&&(c=0),t.push(c);const u=1/(l-2),h=-u,m=1+u,d=[h,h,m,h,m,m,h,h,m,m,h,m],g=6,x=6,w=3,v=2,p=1,T=new Float32Array(w*x*g),D=new Float32Array(v*x*g),P=new Float32Array(p*x*g);for(let U=0;U<g;U++){const K=U%3*2/3-1,y=U>2?0:-1,C=[K,y,0,K+2/3,y,0,K+2/3,y+1,0,K,y,0,K+2/3,y+1,0,K,y+1,0];T.set(C,w*x*U),D.set(d,v*x*U);const de=[U,U,U,U,U,U];P.set(de,p*x*U)}const G=new gi;G.setAttribute("position",new fi(T,w)),G.setAttribute("uv",new fi(D,v)),G.setAttribute("faceIndex",new fi(P,p)),n.push(new pi(G,null)),a>qi&&a--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function vu(i,e,t){const n=new di(i,e,t);return n.texture.mapping=mr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Aa(i,e,t,n,a){i.viewport.set(e,t,n,a),i.scissor.set(e,t,n,a)}function T0(i,e,t){return new mi({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:M0,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:_r(),fragmentShader:`

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
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function w0(i,e,t){const n=new Float32Array(sa),a=new ce(0,1,0);return new mi({name:"SphericalGaussianBlur",defines:{n:sa,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:_r(),fragmentShader:`

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
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function _u(){return new mi({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:_r(),fragmentShader:`

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
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function xu(){return new mi({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:_r(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Ci,depthTest:!1,depthWrite:!1})}function _r(){return`

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
	`}class Ad extends di{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},a=[n,n,n,n,n,n];this.texture=new Sd(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},a=new _s(5,5,5),s=new mi({name:"CubemapFromEquirect",uniforms:Oa(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Pn,blending:Ci});s.uniforms.tEquirect.value=t;const r=new pi(a,s),l=t.minFilter;return t.minFilter===ra&&(t.minFilter=Sn),new Lg(1,10,this).update(e,r),t.minFilter=l,r.geometry.dispose(),r.material.dispose(),this}clear(e,t=!0,n=!0,a=!0){const s=e.getRenderTarget();for(let r=0;r<6;r++)e.setRenderTarget(this,r),e.clear(t,n,a);e.setRenderTarget(s)}}function A0(i){let e=new WeakMap,t=new WeakMap,n=null;function a(d,g=!1){return d==null?null:g?r(d):s(d)}function s(d){if(d&&d.isTexture){const g=d.mapping;if(g===lo||g===co)if(e.has(d)){const x=e.get(d).texture;return l(x,d.mapping)}else{const x=d.image;if(x&&x.height>0){const w=new Ad(x.height);return w.fromEquirectangularTexture(i,d),e.set(d,w),d.addEventListener("dispose",u),l(w.texture,d.mapping)}else return null}}return d}function r(d){if(d&&d.isTexture){const g=d.mapping,x=g===lo||g===co,w=g===la||g===Ua;if(x||w){let v=t.get(d);const p=v!==void 0?v.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==p)return n===null&&(n=new gu(i)),v=x?n.fromEquirectangular(d,v):n.fromCubemap(d,v),v.texture.pmremVersion=d.pmremVersion,t.set(d,v),v.texture;if(v!==void 0)return v.texture;{const T=d.image;return x&&T&&T.height>0||w&&T&&c(T)?(n===null&&(n=new gu(i)),v=x?n.fromEquirectangular(d):n.fromCubemap(d),v.texture.pmremVersion=d.pmremVersion,t.set(d,v),d.addEventListener("dispose",h),v.texture):null}}}return d}function l(d,g){return g===lo?d.mapping=la:g===co&&(d.mapping=Ua),d}function c(d){let g=0;const x=6;for(let w=0;w<x;w++)d[w]!==void 0&&g++;return g===x}function u(d){const g=d.target;g.removeEventListener("dispose",u);const x=e.get(g);x!==void 0&&(e.delete(g),x.dispose())}function h(d){const g=d.target;g.removeEventListener("dispose",h);const x=t.get(g);x!==void 0&&(t.delete(g),x.dispose())}function m(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:a,dispose:m}}function C0(i){const e={};function t(n){if(e[n]!==void 0)return e[n];const a=i.getExtension(n);return e[n]=a,a}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const a=t(n);return a===null&&hr("WebGLRenderer: "+n+" extension not supported."),a}}}function R0(i,e,t,n){const a={},s=new WeakMap;function r(m){const d=m.target;d.index!==null&&e.remove(d.index);for(const x in d.attributes)e.remove(d.attributes[x]);d.removeEventListener("dispose",r),delete a[d.id];const g=s.get(d);g&&(e.remove(g),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function l(m,d){return a[d.id]===!0||(d.addEventListener("dispose",r),a[d.id]=!0,t.memory.geometries++),d}function c(m){const d=m.attributes;for(const g in d)e.update(d[g],i.ARRAY_BUFFER)}function u(m){const d=[],g=m.index,x=m.attributes.position;let w=0;if(x===void 0)return;if(g!==null){const T=g.array;w=g.version;for(let D=0,P=T.length;D<P;D+=3){const G=T[D+0],U=T[D+1],K=T[D+2];d.push(G,U,U,K,K,G)}}else{const T=x.array;w=x.version;for(let D=0,P=T.length/3-1;D<P;D+=3){const G=D+0,U=D+1,K=D+2;d.push(G,U,U,K,K,G)}}const v=new(x.count>=65535?xd:_d)(d,1);v.version=w;const p=s.get(m);p&&e.remove(p),s.set(m,v)}function h(m){const d=s.get(m);if(d){const g=m.index;g!==null&&d.version<g.version&&u(m)}else u(m);return s.get(m)}return{get:l,update:c,getWireframeAttribute:h}}function P0(i,e,t){let n;function a(d){n=d}let s,r;function l(d){s=d.type,r=d.bytesPerElement}function c(d,g){i.drawElements(n,g,s,d*r),t.update(g,n,1)}function u(d,g,x){x!==0&&(i.drawElementsInstanced(n,g,s,d*r,x),t.update(g,n,x))}function h(d,g,x){if(x===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,g,0,s,d,0,x);let v=0;for(let p=0;p<x;p++)v+=g[p];t.update(v,n,1)}function m(d,g,x,w){if(x===0)return;const v=e.get("WEBGL_multi_draw");if(v===null)for(let p=0;p<d.length;p++)u(d[p]/r,g[p],w[p]);else{v.multiDrawElementsInstancedWEBGL(n,g,0,s,d,0,w,0,x);let p=0;for(let T=0;T<x;T++)p+=g[T]*w[T];t.update(p,n,1)}}this.setMode=a,this.setIndex=l,this.render=c,this.renderInstances=u,this.renderMultiDraw=h,this.renderMultiDrawInstances=m}function D0(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,r,l){switch(t.calls++,r){case i.TRIANGLES:t.triangles+=l*(s/3);break;case i.LINES:t.lines+=l*(s/2);break;case i.LINE_STRIP:t.lines+=l*(s-1);break;case i.LINE_LOOP:t.lines+=l*s;break;case i.POINTS:t.points+=l*s;break;default:Nt("WebGLInfo: Unknown draw mode:",r);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:n}}function I0(i,e,t){const n=new WeakMap,a=new Qt;function s(r,l,c){const u=r.morphTargetInfluences,h=l.morphAttributes.position||l.morphAttributes.normal||l.morphAttributes.color,m=h!==void 0?h.length:0;let d=n.get(l);if(d===void 0||d.count!==m){let C=function(){K.dispose(),n.delete(l),l.removeEventListener("dispose",C)};d!==void 0&&d.texture.dispose();const g=l.morphAttributes.position!==void 0,x=l.morphAttributes.normal!==void 0,w=l.morphAttributes.color!==void 0,v=l.morphAttributes.position||[],p=l.morphAttributes.normal||[],T=l.morphAttributes.color||[];let D=0;g===!0&&(D=1),x===!0&&(D=2),w===!0&&(D=3);let P=l.attributes.position.count*D,G=1;P>e.maxTextureSize&&(G=Math.ceil(P/e.maxTextureSize),P=e.maxTextureSize);const U=new Float32Array(P*G*4*m),K=new md(U,P,G,m);K.type=li,K.needsUpdate=!0;const y=D*4;for(let de=0;de<m;de++){const H=v[de],ie=p[de],ae=T[de],oe=P*G*4*de;for(let te=0;te<H.count;te++){const F=te*y;g===!0&&(a.fromBufferAttribute(H,te),U[oe+F+0]=a.x,U[oe+F+1]=a.y,U[oe+F+2]=a.z,U[oe+F+3]=0),x===!0&&(a.fromBufferAttribute(ie,te),U[oe+F+4]=a.x,U[oe+F+5]=a.y,U[oe+F+6]=a.z,U[oe+F+7]=0),w===!0&&(a.fromBufferAttribute(ae,te),U[oe+F+8]=a.x,U[oe+F+9]=a.y,U[oe+F+10]=a.z,U[oe+F+11]=ae.itemSize===4?a.w:1)}}d={count:m,texture:K,size:new Gt(P,G)},n.set(l,d),l.addEventListener("dispose",C)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",r.morphTexture,t);else{let g=0;for(let w=0;w<u.length;w++)g+=u[w];const x=l.morphTargetsRelative?1:1-g;c.getUniforms().setValue(i,"morphTargetBaseInfluence",x),c.getUniforms().setValue(i,"morphTargetInfluences",u)}c.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:s}}function L0(i,e,t,n,a){let s=new WeakMap;function r(u){const h=a.render.frame,m=u.geometry,d=e.get(u,m);if(s.get(d)!==h&&(e.update(d),s.set(d,h)),u.isInstancedMesh&&(u.hasEventListener("dispose",c)===!1&&u.addEventListener("dispose",c),s.get(u)!==h&&(t.update(u.instanceMatrix,i.ARRAY_BUFFER),u.instanceColor!==null&&t.update(u.instanceColor,i.ARRAY_BUFFER),s.set(u,h))),u.isSkinnedMesh){const g=u.skeleton;s.get(g)!==h&&(g.update(),s.set(g,h))}return d}function l(){s=new WeakMap}function c(u){const h=u.target;h.removeEventListener("dispose",c),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:r,dispose:l}}const U0={[Qu]:"LINEAR_TONE_MAPPING",[ed]:"REINHARD_TONE_MAPPING",[td]:"CINEON_TONE_MAPPING",[nd]:"ACES_FILMIC_TONE_MAPPING",[ad]:"AGX_TONE_MAPPING",[sd]:"NEUTRAL_TONE_MAPPING",[id]:"CUSTOM_TONE_MAPPING"};function N0(i,e,t,n,a){const s=new di(e,t,{type:i,depthBuffer:n,stencilBuffer:a}),r=new di(e,t,{type:Pi,depthBuffer:!1,stencilBuffer:!1}),l=new gi;l.setAttribute("position",new qn([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new qn([0,2,0,0,2,0],2));const c=new wg({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),u=new pi(l,c),h=new Td(-1,1,1,-1,0,1);let m=null,d=null,g=!1,x,w=null,v=[],p=!1;this.setSize=function(T,D){s.setSize(T,D),r.setSize(T,D);for(let P=0;P<v.length;P++){const G=v[P];G.setSize&&G.setSize(T,D)}},this.setEffects=function(T){v=T,p=v.length>0&&v[0].isRenderPass===!0;const D=s.width,P=s.height;for(let G=0;G<v.length;G++){const U=v[G];U.setSize&&U.setSize(D,P)}},this.begin=function(T,D){if(g||T.toneMapping===ui&&v.length===0)return!1;if(w=D,D!==null){const P=D.width,G=D.height;(s.width!==P||s.height!==G)&&this.setSize(P,G)}return p===!1&&T.setRenderTarget(s),x=T.toneMapping,T.toneMapping=ui,!0},this.hasRenderPass=function(){return p},this.end=function(T,D){T.toneMapping=x,g=!0;let P=s,G=r;for(let U=0;U<v.length;U++){const K=v[U];if(K.enabled!==!1&&(K.render(T,G,P,D),K.needsSwap!==!1)){const y=P;P=G,G=y}}if(m!==T.outputColorSpace||d!==T.toneMapping){m=T.outputColorSpace,d=T.toneMapping,c.defines={},Ut.getTransfer(m)===kt&&(c.defines.SRGB_TRANSFER="");const U=U0[d];U&&(c.defines[U]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=P.texture,T.setRenderTarget(w),T.render(u,h),w=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){s.dispose(),r.dispose(),l.dispose(),c.dispose()}}const Cd=new Mn,Il=new gs(1,1),Rd=new md,Pd=new ng,Dd=new Sd,yu=[],Su=[],Mu=new Float32Array(16),Eu=new Float32Array(9),bu=new Float32Array(4);function Ha(i,e,t){const n=i[0];if(n<=0||n>0)return i;const a=e*t;let s=yu[a];if(s===void 0&&(s=new Float32Array(a),yu[a]=s),e!==0){n.toArray(s,0);for(let r=1,l=0;r!==e;++r)l+=t,i[r].toArray(s,l)}return s}function on(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function ln(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function xr(i,e){let t=Su[e];t===void 0&&(t=new Int32Array(e),Su[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function F0(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function O0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(on(t,e))return;i.uniform2fv(this.addr,e),ln(t,e)}}function B0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(on(t,e))return;i.uniform3fv(this.addr,e),ln(t,e)}}function k0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(on(t,e))return;i.uniform4fv(this.addr,e),ln(t,e)}}function V0(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(on(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),ln(t,e)}else{if(on(t,n))return;bu.set(n),i.uniformMatrix2fv(this.addr,!1,bu),ln(t,n)}}function z0(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(on(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),ln(t,e)}else{if(on(t,n))return;Eu.set(n),i.uniformMatrix3fv(this.addr,!1,Eu),ln(t,n)}}function G0(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(on(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),ln(t,e)}else{if(on(t,n))return;Mu.set(n),i.uniformMatrix4fv(this.addr,!1,Mu),ln(t,n)}}function H0(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function W0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(on(t,e))return;i.uniform2iv(this.addr,e),ln(t,e)}}function $0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(on(t,e))return;i.uniform3iv(this.addr,e),ln(t,e)}}function X0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(on(t,e))return;i.uniform4iv(this.addr,e),ln(t,e)}}function q0(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function Y0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(on(t,e))return;i.uniform2uiv(this.addr,e),ln(t,e)}}function K0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(on(t,e))return;i.uniform3uiv(this.addr,e),ln(t,e)}}function Z0(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(on(t,e))return;i.uniform4uiv(this.addr,e),ln(t,e)}}function j0(i,e,t){const n=this.cache,a=t.allocateTextureUnit();n[0]!==a&&(i.uniform1i(this.addr,a),n[0]=a);let s;this.type===i.SAMPLER_2D_SHADOW?(Il.compareFunction=t.isReversedDepthBuffer()?Xl:$l,s=Il):s=Cd,t.setTexture2D(e||s,a)}function J0(i,e,t){const n=this.cache,a=t.allocateTextureUnit();n[0]!==a&&(i.uniform1i(this.addr,a),n[0]=a),t.setTexture3D(e||Pd,a)}function Q0(i,e,t){const n=this.cache,a=t.allocateTextureUnit();n[0]!==a&&(i.uniform1i(this.addr,a),n[0]=a),t.setTextureCube(e||Dd,a)}function ex(i,e,t){const n=this.cache,a=t.allocateTextureUnit();n[0]!==a&&(i.uniform1i(this.addr,a),n[0]=a),t.setTexture2DArray(e||Rd,a)}function tx(i){switch(i){case 5126:return F0;case 35664:return O0;case 35665:return B0;case 35666:return k0;case 35674:return V0;case 35675:return z0;case 35676:return G0;case 5124:case 35670:return H0;case 35667:case 35671:return W0;case 35668:case 35672:return $0;case 35669:case 35673:return X0;case 5125:return q0;case 36294:return Y0;case 36295:return K0;case 36296:return Z0;case 35678:case 36198:case 36298:case 36306:case 35682:return j0;case 35679:case 36299:case 36307:return J0;case 35680:case 36300:case 36308:case 36293:return Q0;case 36289:case 36303:case 36311:case 36292:return ex}}function nx(i,e){i.uniform1fv(this.addr,e)}function ix(i,e){const t=Ha(e,this.size,2);i.uniform2fv(this.addr,t)}function ax(i,e){const t=Ha(e,this.size,3);i.uniform3fv(this.addr,t)}function sx(i,e){const t=Ha(e,this.size,4);i.uniform4fv(this.addr,t)}function rx(i,e){const t=Ha(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function ox(i,e){const t=Ha(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function lx(i,e){const t=Ha(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function cx(i,e){i.uniform1iv(this.addr,e)}function ux(i,e){i.uniform2iv(this.addr,e)}function dx(i,e){i.uniform3iv(this.addr,e)}function fx(i,e){i.uniform4iv(this.addr,e)}function hx(i,e){i.uniform1uiv(this.addr,e)}function px(i,e){i.uniform2uiv(this.addr,e)}function mx(i,e){i.uniform3uiv(this.addr,e)}function gx(i,e){i.uniform4uiv(this.addr,e)}function vx(i,e,t){const n=this.cache,a=e.length,s=xr(t,a);on(n,s)||(i.uniform1iv(this.addr,s),ln(n,s));let r;this.type===i.SAMPLER_2D_SHADOW?r=Il:r=Cd;for(let l=0;l!==a;++l)t.setTexture2D(e[l]||r,s[l])}function _x(i,e,t){const n=this.cache,a=e.length,s=xr(t,a);on(n,s)||(i.uniform1iv(this.addr,s),ln(n,s));for(let r=0;r!==a;++r)t.setTexture3D(e[r]||Pd,s[r])}function xx(i,e,t){const n=this.cache,a=e.length,s=xr(t,a);on(n,s)||(i.uniform1iv(this.addr,s),ln(n,s));for(let r=0;r!==a;++r)t.setTextureCube(e[r]||Dd,s[r])}function yx(i,e,t){const n=this.cache,a=e.length,s=xr(t,a);on(n,s)||(i.uniform1iv(this.addr,s),ln(n,s));for(let r=0;r!==a;++r)t.setTexture2DArray(e[r]||Rd,s[r])}function Sx(i){switch(i){case 5126:return nx;case 35664:return ix;case 35665:return ax;case 35666:return sx;case 35674:return rx;case 35675:return ox;case 35676:return lx;case 5124:case 35670:return cx;case 35667:case 35671:return ux;case 35668:case 35672:return dx;case 35669:case 35673:return fx;case 5125:return hx;case 36294:return px;case 36295:return mx;case 36296:return gx;case 35678:case 36198:case 36298:case 36306:case 35682:return vx;case 35679:case 36299:case 36307:return _x;case 35680:case 36300:case 36308:case 36293:return xx;case 36289:case 36303:case 36311:case 36292:return yx}}class Mx{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=tx(t.type)}}class Ex{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Sx(t.type)}}class bx{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const a=this.seq;for(let s=0,r=a.length;s!==r;++s){const l=a[s];l.setValue(e,t[l.id],n)}}}const ko=/(\w+)(\])?(\[|\.)?/g;function Tu(i,e){i.seq.push(e),i.map[e.id]=e}function Tx(i,e,t){const n=i.name,a=n.length;for(ko.lastIndex=0;;){const s=ko.exec(n),r=ko.lastIndex;let l=s[1];const c=s[2]==="]",u=s[3];if(c&&(l=l|0),u===void 0||u==="["&&r+2===a){Tu(t,u===void 0?new Mx(l,i,e):new Ex(l,i,e));break}else{let m=t.map[l];m===void 0&&(m=new bx(l),Tu(t,m)),t=m}}}class cr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const l=e.getActiveUniform(t,r),c=e.getUniformLocation(t,l.name);Tx(l,c,this)}const a=[],s=[];for(const r of this.seq)r.type===e.SAMPLER_2D_SHADOW||r.type===e.SAMPLER_CUBE_SHADOW||r.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(r):s.push(r);a.length>0&&(this.seq=a.concat(s))}setValue(e,t,n,a){const s=this.map[t];s!==void 0&&s.setValue(e,n,a)}setOptional(e,t,n){const a=t[n];a!==void 0&&this.setValue(e,n,a)}static upload(e,t,n,a){for(let s=0,r=t.length;s!==r;++s){const l=t[s],c=n[l.id];c.needsUpdate!==!1&&l.setValue(e,c.value,a)}}static seqWithValue(e,t){const n=[];for(let a=0,s=e.length;a!==s;++a){const r=e[a];r.id in t&&n.push(r)}return n}}function wu(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const wx=37297;let Ax=0;function Cx(i,e){const t=i.split(`
`),n=[],a=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let r=a;r<s;r++){const l=r+1;n.push(`${l===e?">":" "} ${l}: ${t[r]}`)}return n.join(`
`)}const Au=new Mt;function Rx(i){Ut._getMatrix(Au,Ut.workingColorSpace,i);const e=`mat3( ${Au.elements.map(t=>t.toFixed(4))} )`;switch(Ut.getTransfer(i)){case dr:return[e,"LinearTransferOETF"];case kt:return[e,"sRGBTransferOETF"];default:return vt("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Cu(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),s=(i.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const r=/ERROR: 0:(\d+)/.exec(s);if(r){const l=parseInt(r[1]);return t.toUpperCase()+`

`+s+`

`+Cx(i.getShaderSource(e),l)}else return s}function Px(i,e){const t=Rx(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const Dx={[Qu]:"Linear",[ed]:"Reinhard",[td]:"Cineon",[nd]:"ACESFilmic",[ad]:"AgX",[sd]:"Neutral",[id]:"Custom"};function Ix(i,e){const t=Dx[e];return t===void 0?(vt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const nr=new ce;function Lx(){Ut.getLuminanceCoefficients(nr);const i=nr.x.toFixed(4),e=nr.y.toFixed(4),t=nr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ux(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(os).join(`
`)}function Nx(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Fx(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<n;a++){const s=i.getActiveAttrib(e,a),r=s.name;let l=1;s.type===i.FLOAT_MAT2&&(l=2),s.type===i.FLOAT_MAT3&&(l=3),s.type===i.FLOAT_MAT4&&(l=4),t[r]={type:s.type,location:i.getAttribLocation(e,r),locationSize:l}}return t}function os(i){return i!==""}function Ru(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Pu(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Ox=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ll(i){return i.replace(Ox,kx)}const Bx=new Map;function kx(i,e){let t=bt[e];if(t===void 0){const n=Bx.get(e);if(n!==void 0)t=bt[n],vt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Ll(t)}const Vx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Du(i){return i.replace(Vx,zx)}function zx(i,e,t,n){let a="";for(let s=parseInt(e);s<parseInt(t);s++)a+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return a}function Iu(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}const Gx={[ar]:"SHADOWMAP_TYPE_PCF",[rs]:"SHADOWMAP_TYPE_VSM"};function Hx(i){return Gx[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Wx={[la]:"ENVMAP_TYPE_CUBE",[Ua]:"ENVMAP_TYPE_CUBE",[mr]:"ENVMAP_TYPE_CUBE_UV"};function $x(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Wx[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const Xx={[Ua]:"ENVMAP_MODE_REFRACTION"};function qx(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Xx[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const Yx={[Ju]:"ENVMAP_BLENDING_MULTIPLY",[xm]:"ENVMAP_BLENDING_MIX",[ym]:"ENVMAP_BLENDING_ADD"};function Kx(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Yx[i.combine]||"ENVMAP_BLENDING_NONE"}function Zx(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function jx(i,e,t,n){const a=i.getContext(),s=t.defines;let r=t.vertexShader,l=t.fragmentShader;const c=Hx(t),u=$x(t),h=qx(t),m=Kx(t),d=Zx(t),g=Ux(t),x=Nx(s),w=a.createProgram();let v,p,T=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(v=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(os).join(`
`),v.length>0&&(v+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(os).join(`
`),p.length>0&&(p+=`
`)):(v=[Iu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(os).join(`
`),p=[Iu(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",t.envMap?"#define "+m:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ui?"#define TONE_MAPPING":"",t.toneMapping!==ui?bt.tonemapping_pars_fragment:"",t.toneMapping!==ui?Ix("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",bt.colorspace_pars_fragment,Px("linearToOutputTexel",t.outputColorSpace),Lx(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(os).join(`
`)),r=Ll(r),r=Ru(r,t),r=Pu(r,t),l=Ll(l),l=Ru(l,t),l=Pu(l,t),r=Du(r),l=Du(l),t.isRawShaderMaterial!==!0&&(T=`#version 300 es
`,v=[g,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+v,p=["#define varying in",t.glslVersion===$c?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===$c?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const D=T+v+r,P=T+p+l,G=wu(a,a.VERTEX_SHADER,D),U=wu(a,a.FRAGMENT_SHADER,P);a.attachShader(w,G),a.attachShader(w,U),t.index0AttributeName!==void 0?a.bindAttribLocation(w,0,t.index0AttributeName):t.morphTargets===!0&&a.bindAttribLocation(w,0,"position"),a.linkProgram(w);function K(H){if(i.debug.checkShaderErrors){const ie=a.getProgramInfoLog(w)||"",ae=a.getShaderInfoLog(G)||"",oe=a.getShaderInfoLog(U)||"",te=ie.trim(),F=ae.trim(),O=oe.trim();let he=!0,V=!0;if(a.getProgramParameter(w,a.LINK_STATUS)===!1)if(he=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,w,G,U);else{const $=Cu(a,G,"vertex"),Me=Cu(a,U,"fragment");Nt("THREE.WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(w,a.VALIDATE_STATUS)+`

Material Name: `+H.name+`
Material Type: `+H.type+`

Program Info Log: `+te+`
`+$+`
`+Me)}else te!==""?vt("WebGLProgram: Program Info Log:",te):(F===""||O==="")&&(V=!1);V&&(H.diagnostics={runnable:he,programLog:te,vertexShader:{log:F,prefix:v},fragmentShader:{log:O,prefix:p}})}a.deleteShader(G),a.deleteShader(U),y=new cr(a,w),C=Fx(a,w)}let y;this.getUniforms=function(){return y===void 0&&K(this),y};let C;this.getAttributes=function(){return C===void 0&&K(this),C};let de=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return de===!1&&(de=a.getProgramParameter(w,wx)),de},this.destroy=function(){n.releaseStatesOfProgram(this),a.deleteProgram(w),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Ax++,this.cacheKey=e,this.usedTimes=1,this.program=w,this.vertexShader=G,this.fragmentShader=U,this}let Jx=0;class Qx{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,a=this._getShaderStage(t),s=this._getShaderStage(n),r=this._getShaderCacheForMaterial(e);return r.has(a)===!1&&(r.add(a),a.usedTimes++),r.has(s)===!1&&(r.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new ey(e),t.set(e,n)),n}}class ey{constructor(e){this.id=Jx++,this.code=e,this.usedTimes=0}}function ty(i,e,t,n,a,s){const r=new gd,l=new Qx,c=new Set,u=[],h=new Map,m=n.logarithmicDepthBuffer;let d=n.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(y){return c.add(y),y===0?"uv":`uv${y}`}function w(y,C,de,H,ie){const ae=H.fog,oe=ie.geometry,te=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?H.environment:null,F=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,O=e.get(y.envMap||te,F),he=O&&O.mapping===mr?O.image.height:null,V=g[y.type];y.precision!==null&&(d=n.getMaxPrecision(y.precision),d!==y.precision&&vt("WebGLProgram.getParameters:",y.precision,"not supported, using",d,"instead."));const $=oe.morphAttributes.position||oe.morphAttributes.normal||oe.morphAttributes.color,Me=$!==void 0?$.length:0;let _e=0;oe.morphAttributes.position!==void 0&&(_e=1),oe.morphAttributes.normal!==void 0&&(_e=2),oe.morphAttributes.color!==void 0&&(_e=3);let Ie,ke,mt,pe;if(V){const De=ri[V];Ie=De.vertexShader,ke=De.fragmentShader}else Ie=y.vertexShader,ke=y.fragmentShader,l.update(y),mt=l.getVertexShaderID(y),pe=l.getFragmentShaderID(y);const Pe=i.getRenderTarget(),Le=i.state.buffers.depth.getReversed(),ut=ie.isInstancedMesh===!0,xe=ie.isBatchedMesh===!0,Ye=!!y.map,It=!!y.matcap,se=!!O,q=!!y.aoMap,Te=!!y.lightMap,We=!!y.bumpMap,et=!!y.normalMap,k=!!y.displacementMap,_t=!!y.emissiveMap,Ve=!!y.metalnessMap,yt=!!y.roughnessMap,Ke=y.anisotropy>0,R=y.clearcoat>0,_=y.dispersion>0,j=y.iridescence>0,ge=y.sheen>0,ye=y.transmission>0,fe=Ke&&!!y.anisotropyMap,je=R&&!!y.clearcoatMap,Oe=R&&!!y.clearcoatNormalMap,Qe=R&&!!y.clearcoatRoughnessMap,rt=j&&!!y.iridescenceMap,Ae=j&&!!y.iridescenceThicknessMap,Re=ge&&!!y.sheenColorMap,qe=ge&&!!y.sheenRoughnessMap,tt=!!y.specularMap,Ge=!!y.specularColorMap,ct=!!y.specularIntensityMap,Z=ye&&!!y.transmissionMap,Se=ye&&!!y.thicknessMap,Ue=!!y.gradientMap,N=!!y.alphaMap,I=y.alphaTest>0,Y=!!y.alphaHash,ue=!!y.extensions;let Ce=ui;y.toneMapped&&(Pe===null||Pe.isXRRenderTarget===!0)&&(Ce=i.toneMapping);const st={shaderID:V,shaderType:y.type,shaderName:y.name,vertexShader:Ie,fragmentShader:ke,defines:y.defines,customVertexShaderID:mt,customFragmentShaderID:pe,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:d,batching:xe,batchingColor:xe&&ie._colorsTexture!==null,instancing:ut,instancingColor:ut&&ie.instanceColor!==null,instancingMorph:ut&&ie.morphTexture!==null,outputColorSpace:Pe===null?i.outputColorSpace:Pe.isXRRenderTarget===!0?Pe.texture.colorSpace:Fa,alphaToCoverage:!!y.alphaToCoverage,map:Ye,matcap:It,envMap:se,envMapMode:se&&O.mapping,envMapCubeUVHeight:he,aoMap:q,lightMap:Te,bumpMap:We,normalMap:et,displacementMap:k,emissiveMap:_t,normalMapObjectSpace:et&&y.normalMapType===bm,normalMapTangentSpace:et&&y.normalMapType===Em,metalnessMap:Ve,roughnessMap:yt,anisotropy:Ke,anisotropyMap:fe,clearcoat:R,clearcoatMap:je,clearcoatNormalMap:Oe,clearcoatRoughnessMap:Qe,dispersion:_,iridescence:j,iridescenceMap:rt,iridescenceThicknessMap:Ae,sheen:ge,sheenColorMap:Re,sheenRoughnessMap:qe,specularMap:tt,specularColorMap:Ge,specularIntensityMap:ct,transmission:ye,transmissionMap:Z,thicknessMap:Se,gradientMap:Ue,opaque:y.transparent===!1&&y.blending===Da&&y.alphaToCoverage===!1,alphaMap:N,alphaTest:I,alphaHash:Y,combine:y.combine,mapUv:Ye&&x(y.map.channel),aoMapUv:q&&x(y.aoMap.channel),lightMapUv:Te&&x(y.lightMap.channel),bumpMapUv:We&&x(y.bumpMap.channel),normalMapUv:et&&x(y.normalMap.channel),displacementMapUv:k&&x(y.displacementMap.channel),emissiveMapUv:_t&&x(y.emissiveMap.channel),metalnessMapUv:Ve&&x(y.metalnessMap.channel),roughnessMapUv:yt&&x(y.roughnessMap.channel),anisotropyMapUv:fe&&x(y.anisotropyMap.channel),clearcoatMapUv:je&&x(y.clearcoatMap.channel),clearcoatNormalMapUv:Oe&&x(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Qe&&x(y.clearcoatRoughnessMap.channel),iridescenceMapUv:rt&&x(y.iridescenceMap.channel),iridescenceThicknessMapUv:Ae&&x(y.iridescenceThicknessMap.channel),sheenColorMapUv:Re&&x(y.sheenColorMap.channel),sheenRoughnessMapUv:qe&&x(y.sheenRoughnessMap.channel),specularMapUv:tt&&x(y.specularMap.channel),specularColorMapUv:Ge&&x(y.specularColorMap.channel),specularIntensityMapUv:ct&&x(y.specularIntensityMap.channel),transmissionMapUv:Z&&x(y.transmissionMap.channel),thicknessMapUv:Se&&x(y.thicknessMap.channel),alphaMapUv:N&&x(y.alphaMap.channel),vertexTangents:!!oe.attributes.tangent&&(et||Ke),vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!oe.attributes.color&&oe.attributes.color.itemSize===4,pointsUvs:ie.isPoints===!0&&!!oe.attributes.uv&&(Ye||N),fog:!!ae,useFog:y.fog===!0,fogExp2:!!ae&&ae.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||oe.attributes.normal===void 0&&et===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:m,reversedDepthBuffer:Le,skinning:ie.isSkinnedMesh===!0,morphTargets:oe.morphAttributes.position!==void 0,morphNormals:oe.morphAttributes.normal!==void 0,morphColors:oe.morphAttributes.color!==void 0,morphTargetsCount:Me,morphTextureStride:_e,numDirLights:C.directional.length,numPointLights:C.point.length,numSpotLights:C.spot.length,numSpotLightMaps:C.spotLightMap.length,numRectAreaLights:C.rectArea.length,numHemiLights:C.hemi.length,numDirLightShadows:C.directionalShadowMap.length,numPointLightShadows:C.pointShadowMap.length,numSpotLightShadows:C.spotShadowMap.length,numSpotLightShadowsWithMaps:C.numSpotLightShadowsWithMaps,numLightProbes:C.numLightProbes,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&de.length>0,shadowMapType:i.shadowMap.type,toneMapping:Ce,decodeVideoTexture:Ye&&y.map.isVideoTexture===!0&&Ut.getTransfer(y.map.colorSpace)===kt,decodeVideoTextureEmissive:_t&&y.emissiveMap.isVideoTexture===!0&&Ut.getTransfer(y.emissiveMap.colorSpace)===kt,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===wi,flipSided:y.side===Pn,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:ue&&y.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ue&&y.extensions.multiDraw===!0||xe)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return st.vertexUv1s=c.has(1),st.vertexUv2s=c.has(2),st.vertexUv3s=c.has(3),c.clear(),st}function v(y){const C=[];if(y.shaderID?C.push(y.shaderID):(C.push(y.customVertexShaderID),C.push(y.customFragmentShaderID)),y.defines!==void 0)for(const de in y.defines)C.push(de),C.push(y.defines[de]);return y.isRawShaderMaterial===!1&&(p(C,y),T(C,y),C.push(i.outputColorSpace)),C.push(y.customProgramCacheKey),C.join()}function p(y,C){y.push(C.precision),y.push(C.outputColorSpace),y.push(C.envMapMode),y.push(C.envMapCubeUVHeight),y.push(C.mapUv),y.push(C.alphaMapUv),y.push(C.lightMapUv),y.push(C.aoMapUv),y.push(C.bumpMapUv),y.push(C.normalMapUv),y.push(C.displacementMapUv),y.push(C.emissiveMapUv),y.push(C.metalnessMapUv),y.push(C.roughnessMapUv),y.push(C.anisotropyMapUv),y.push(C.clearcoatMapUv),y.push(C.clearcoatNormalMapUv),y.push(C.clearcoatRoughnessMapUv),y.push(C.iridescenceMapUv),y.push(C.iridescenceThicknessMapUv),y.push(C.sheenColorMapUv),y.push(C.sheenRoughnessMapUv),y.push(C.specularMapUv),y.push(C.specularColorMapUv),y.push(C.specularIntensityMapUv),y.push(C.transmissionMapUv),y.push(C.thicknessMapUv),y.push(C.combine),y.push(C.fogExp2),y.push(C.sizeAttenuation),y.push(C.morphTargetsCount),y.push(C.morphAttributeCount),y.push(C.numDirLights),y.push(C.numPointLights),y.push(C.numSpotLights),y.push(C.numSpotLightMaps),y.push(C.numHemiLights),y.push(C.numRectAreaLights),y.push(C.numDirLightShadows),y.push(C.numPointLightShadows),y.push(C.numSpotLightShadows),y.push(C.numSpotLightShadowsWithMaps),y.push(C.numLightProbes),y.push(C.shadowMapType),y.push(C.toneMapping),y.push(C.numClippingPlanes),y.push(C.numClipIntersection),y.push(C.depthPacking)}function T(y,C){r.disableAll(),C.instancing&&r.enable(0),C.instancingColor&&r.enable(1),C.instancingMorph&&r.enable(2),C.matcap&&r.enable(3),C.envMap&&r.enable(4),C.normalMapObjectSpace&&r.enable(5),C.normalMapTangentSpace&&r.enable(6),C.clearcoat&&r.enable(7),C.iridescence&&r.enable(8),C.alphaTest&&r.enable(9),C.vertexColors&&r.enable(10),C.vertexAlphas&&r.enable(11),C.vertexUv1s&&r.enable(12),C.vertexUv2s&&r.enable(13),C.vertexUv3s&&r.enable(14),C.vertexTangents&&r.enable(15),C.anisotropy&&r.enable(16),C.alphaHash&&r.enable(17),C.batching&&r.enable(18),C.dispersion&&r.enable(19),C.batchingColor&&r.enable(20),C.gradientMap&&r.enable(21),y.push(r.mask),r.disableAll(),C.fog&&r.enable(0),C.useFog&&r.enable(1),C.flatShading&&r.enable(2),C.logarithmicDepthBuffer&&r.enable(3),C.reversedDepthBuffer&&r.enable(4),C.skinning&&r.enable(5),C.morphTargets&&r.enable(6),C.morphNormals&&r.enable(7),C.morphColors&&r.enable(8),C.premultipliedAlpha&&r.enable(9),C.shadowMapEnabled&&r.enable(10),C.doubleSided&&r.enable(11),C.flipSided&&r.enable(12),C.useDepthPacking&&r.enable(13),C.dithering&&r.enable(14),C.transmission&&r.enable(15),C.sheen&&r.enable(16),C.opaque&&r.enable(17),C.pointsUvs&&r.enable(18),C.decodeVideoTexture&&r.enable(19),C.decodeVideoTextureEmissive&&r.enable(20),C.alphaToCoverage&&r.enable(21),y.push(r.mask)}function D(y){const C=g[y.type];let de;if(C){const H=ri[C];de=Eg.clone(H.uniforms)}else de=y.uniforms;return de}function P(y,C){let de=h.get(C);return de!==void 0?++de.usedTimes:(de=new jx(i,C,y,a),u.push(de),h.set(C,de)),de}function G(y){if(--y.usedTimes===0){const C=u.indexOf(y);u[C]=u[u.length-1],u.pop(),h.delete(y.cacheKey),y.destroy()}}function U(y){l.remove(y)}function K(){l.dispose()}return{getParameters:w,getProgramCacheKey:v,getUniforms:D,acquireProgram:P,releaseProgram:G,releaseShaderCache:U,programs:u,dispose:K}}function ny(){let i=new WeakMap;function e(r){return i.has(r)}function t(r){let l=i.get(r);return l===void 0&&(l={},i.set(r,l)),l}function n(r){i.delete(r)}function a(r,l,c){i.get(r)[l]=c}function s(){i=new WeakMap}return{has:e,get:t,remove:n,update:a,dispose:s}}function iy(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Lu(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Uu(){const i=[];let e=0;const t=[],n=[],a=[];function s(){e=0,t.length=0,n.length=0,a.length=0}function r(d){let g=0;return d.isInstancedMesh&&(g+=2),d.isSkinnedMesh&&(g+=1),g}function l(d,g,x,w,v,p){let T=i[e];return T===void 0?(T={id:d.id,object:d,geometry:g,material:x,materialVariant:r(d),groupOrder:w,renderOrder:d.renderOrder,z:v,group:p},i[e]=T):(T.id=d.id,T.object=d,T.geometry=g,T.material=x,T.materialVariant=r(d),T.groupOrder=w,T.renderOrder=d.renderOrder,T.z=v,T.group=p),e++,T}function c(d,g,x,w,v,p){const T=l(d,g,x,w,v,p);x.transmission>0?n.push(T):x.transparent===!0?a.push(T):t.push(T)}function u(d,g,x,w,v,p){const T=l(d,g,x,w,v,p);x.transmission>0?n.unshift(T):x.transparent===!0?a.unshift(T):t.unshift(T)}function h(d,g){t.length>1&&t.sort(d||iy),n.length>1&&n.sort(g||Lu),a.length>1&&a.sort(g||Lu)}function m(){for(let d=e,g=i.length;d<g;d++){const x=i[d];if(x.id===null)break;x.id=null,x.object=null,x.geometry=null,x.material=null,x.group=null}}return{opaque:t,transmissive:n,transparent:a,init:s,push:c,unshift:u,finish:m,sort:h}}function ay(){let i=new WeakMap;function e(n,a){const s=i.get(n);let r;return s===void 0?(r=new Uu,i.set(n,[r])):a>=s.length?(r=new Uu,s.push(r)):r=s[a],r}function t(){i=new WeakMap}return{get:e,dispose:t}}function sy(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new ce,color:new zt};break;case"SpotLight":t={position:new ce,direction:new ce,color:new zt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ce,color:new zt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ce,skyColor:new zt,groundColor:new zt};break;case"RectAreaLight":t={color:new zt,position:new ce,halfWidth:new ce,halfHeight:new ce};break}return i[e.id]=t,t}}}function ry(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Gt};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Gt};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Gt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let oy=0;function ly(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function cy(i){const e=new sy,t=ry(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let u=0;u<9;u++)n.probe.push(new ce);const a=new ce,s=new an,r=new an;function l(u){let h=0,m=0,d=0;for(let C=0;C<9;C++)n.probe[C].set(0,0,0);let g=0,x=0,w=0,v=0,p=0,T=0,D=0,P=0,G=0,U=0,K=0;u.sort(ly);for(let C=0,de=u.length;C<de;C++){const H=u[C],ie=H.color,ae=H.intensity,oe=H.distance;let te=null;if(H.shadow&&H.shadow.map&&(H.shadow.map.texture.format===Na?te=H.shadow.map.texture:te=H.shadow.map.depthTexture||H.shadow.map.texture),H.isAmbientLight)h+=ie.r*ae,m+=ie.g*ae,d+=ie.b*ae;else if(H.isLightProbe){for(let F=0;F<9;F++)n.probe[F].addScaledVector(H.sh.coefficients[F],ae);K++}else if(H.isDirectionalLight){const F=e.get(H);if(F.color.copy(H.color).multiplyScalar(H.intensity),H.castShadow){const O=H.shadow,he=t.get(H);he.shadowIntensity=O.intensity,he.shadowBias=O.bias,he.shadowNormalBias=O.normalBias,he.shadowRadius=O.radius,he.shadowMapSize=O.mapSize,n.directionalShadow[g]=he,n.directionalShadowMap[g]=te,n.directionalShadowMatrix[g]=H.shadow.matrix,T++}n.directional[g]=F,g++}else if(H.isSpotLight){const F=e.get(H);F.position.setFromMatrixPosition(H.matrixWorld),F.color.copy(ie).multiplyScalar(ae),F.distance=oe,F.coneCos=Math.cos(H.angle),F.penumbraCos=Math.cos(H.angle*(1-H.penumbra)),F.decay=H.decay,n.spot[w]=F;const O=H.shadow;if(H.map&&(n.spotLightMap[G]=H.map,G++,O.updateMatrices(H),H.castShadow&&U++),n.spotLightMatrix[w]=O.matrix,H.castShadow){const he=t.get(H);he.shadowIntensity=O.intensity,he.shadowBias=O.bias,he.shadowNormalBias=O.normalBias,he.shadowRadius=O.radius,he.shadowMapSize=O.mapSize,n.spotShadow[w]=he,n.spotShadowMap[w]=te,P++}w++}else if(H.isRectAreaLight){const F=e.get(H);F.color.copy(ie).multiplyScalar(ae),F.halfWidth.set(H.width*.5,0,0),F.halfHeight.set(0,H.height*.5,0),n.rectArea[v]=F,v++}else if(H.isPointLight){const F=e.get(H);if(F.color.copy(H.color).multiplyScalar(H.intensity),F.distance=H.distance,F.decay=H.decay,H.castShadow){const O=H.shadow,he=t.get(H);he.shadowIntensity=O.intensity,he.shadowBias=O.bias,he.shadowNormalBias=O.normalBias,he.shadowRadius=O.radius,he.shadowMapSize=O.mapSize,he.shadowCameraNear=O.camera.near,he.shadowCameraFar=O.camera.far,n.pointShadow[x]=he,n.pointShadowMap[x]=te,n.pointShadowMatrix[x]=H.shadow.matrix,D++}n.point[x]=F,x++}else if(H.isHemisphereLight){const F=e.get(H);F.skyColor.copy(H.color).multiplyScalar(ae),F.groundColor.copy(H.groundColor).multiplyScalar(ae),n.hemi[p]=F,p++}}v>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Xe.LTC_FLOAT_1,n.rectAreaLTC2=Xe.LTC_FLOAT_2):(n.rectAreaLTC1=Xe.LTC_HALF_1,n.rectAreaLTC2=Xe.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=m,n.ambient[2]=d;const y=n.hash;(y.directionalLength!==g||y.pointLength!==x||y.spotLength!==w||y.rectAreaLength!==v||y.hemiLength!==p||y.numDirectionalShadows!==T||y.numPointShadows!==D||y.numSpotShadows!==P||y.numSpotMaps!==G||y.numLightProbes!==K)&&(n.directional.length=g,n.spot.length=w,n.rectArea.length=v,n.point.length=x,n.hemi.length=p,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.pointShadow.length=D,n.pointShadowMap.length=D,n.spotShadow.length=P,n.spotShadowMap.length=P,n.directionalShadowMatrix.length=T,n.pointShadowMatrix.length=D,n.spotLightMatrix.length=P+G-U,n.spotLightMap.length=G,n.numSpotLightShadowsWithMaps=U,n.numLightProbes=K,y.directionalLength=g,y.pointLength=x,y.spotLength=w,y.rectAreaLength=v,y.hemiLength=p,y.numDirectionalShadows=T,y.numPointShadows=D,y.numSpotShadows=P,y.numSpotMaps=G,y.numLightProbes=K,n.version=oy++)}function c(u,h){let m=0,d=0,g=0,x=0,w=0;const v=h.matrixWorldInverse;for(let p=0,T=u.length;p<T;p++){const D=u[p];if(D.isDirectionalLight){const P=n.directional[m];P.direction.setFromMatrixPosition(D.matrixWorld),a.setFromMatrixPosition(D.target.matrixWorld),P.direction.sub(a),P.direction.transformDirection(v),m++}else if(D.isSpotLight){const P=n.spot[g];P.position.setFromMatrixPosition(D.matrixWorld),P.position.applyMatrix4(v),P.direction.setFromMatrixPosition(D.matrixWorld),a.setFromMatrixPosition(D.target.matrixWorld),P.direction.sub(a),P.direction.transformDirection(v),g++}else if(D.isRectAreaLight){const P=n.rectArea[x];P.position.setFromMatrixPosition(D.matrixWorld),P.position.applyMatrix4(v),r.identity(),s.copy(D.matrixWorld),s.premultiply(v),r.extractRotation(s),P.halfWidth.set(D.width*.5,0,0),P.halfHeight.set(0,D.height*.5,0),P.halfWidth.applyMatrix4(r),P.halfHeight.applyMatrix4(r),x++}else if(D.isPointLight){const P=n.point[d];P.position.setFromMatrixPosition(D.matrixWorld),P.position.applyMatrix4(v),d++}else if(D.isHemisphereLight){const P=n.hemi[w];P.direction.setFromMatrixPosition(D.matrixWorld),P.direction.transformDirection(v),w++}}}return{setup:l,setupView:c,state:n}}function Nu(i){const e=new cy(i),t=[],n=[];function a(h){u.camera=h,t.length=0,n.length=0}function s(h){t.push(h)}function r(h){n.push(h)}function l(){e.setup(t)}function c(h){e.setupView(t,h)}const u={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:a,state:u,setupLights:l,setupLightsView:c,pushLight:s,pushShadow:r}}function uy(i){let e=new WeakMap;function t(a,s=0){const r=e.get(a);let l;return r===void 0?(l=new Nu(i),e.set(a,[l])):s>=r.length?(l=new Nu(i),r.push(l)):l=r[s],l}function n(){e=new WeakMap}return{get:t,dispose:n}}const dy=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,fy=`uniform sampler2D shadow_pass;
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
}`,hy=[new ce(1,0,0),new ce(-1,0,0),new ce(0,1,0),new ce(0,-1,0),new ce(0,0,1),new ce(0,0,-1)],py=[new ce(0,-1,0),new ce(0,-1,0),new ce(0,0,1),new ce(0,0,-1),new ce(0,-1,0),new ce(0,-1,0)],Fu=new an,as=new ce,Vo=new ce;function my(i,e,t){let n=new yd;const a=new Gt,s=new Gt,r=new Qt,l=new Ag,c=new Cg,u={},h=t.maxTextureSize,m={[Yi]:Pn,[Pn]:Yi,[wi]:wi},d=new mi({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Gt},radius:{value:4}},vertexShader:dy,fragmentShader:fy}),g=d.clone();g.defines.HORIZONTAL_PASS=1;const x=new gi;x.setAttribute("position",new fi(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const w=new pi(x,d),v=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ar;let p=this.type;this.render=function(U,K,y){if(v.enabled===!1||v.autoUpdate===!1&&v.needsUpdate===!1||U.length===0)return;this.type===em&&(vt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=ar);const C=i.getRenderTarget(),de=i.getActiveCubeFace(),H=i.getActiveMipmapLevel(),ie=i.state;ie.setBlending(Ci),ie.buffers.depth.getReversed()===!0?ie.buffers.color.setClear(0,0,0,0):ie.buffers.color.setClear(1,1,1,1),ie.buffers.depth.setTest(!0),ie.setScissorTest(!1);const ae=p!==this.type;ae&&K.traverse(function(oe){oe.material&&(Array.isArray(oe.material)?oe.material.forEach(te=>te.needsUpdate=!0):oe.material.needsUpdate=!0)});for(let oe=0,te=U.length;oe<te;oe++){const F=U[oe],O=F.shadow;if(O===void 0){vt("WebGLShadowMap:",F,"has no shadow.");continue}if(O.autoUpdate===!1&&O.needsUpdate===!1)continue;a.copy(O.mapSize);const he=O.getFrameExtents();a.multiply(he),s.copy(O.mapSize),(a.x>h||a.y>h)&&(a.x>h&&(s.x=Math.floor(h/he.x),a.x=s.x*he.x,O.mapSize.x=s.x),a.y>h&&(s.y=Math.floor(h/he.y),a.y=s.y*he.y,O.mapSize.y=s.y));const V=i.state.buffers.depth.getReversed();if(O.camera._reversedDepth=V,O.map===null||ae===!0){if(O.map!==null&&(O.map.depthTexture!==null&&(O.map.depthTexture.dispose(),O.map.depthTexture=null),O.map.dispose()),this.type===rs){if(F.isPointLight){vt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}O.map=new di(a.x,a.y,{format:Na,type:Pi,minFilter:Sn,magFilter:Sn,generateMipmaps:!1}),O.map.texture.name=F.name+".shadowMap",O.map.depthTexture=new gs(a.x,a.y,li),O.map.depthTexture.name=F.name+".shadowMapDepth",O.map.depthTexture.format=Di,O.map.depthTexture.compareFunction=null,O.map.depthTexture.minFilter=vn,O.map.depthTexture.magFilter=vn}else F.isPointLight?(O.map=new Ad(a.x),O.map.depthTexture=new Sg(a.x,hi)):(O.map=new di(a.x,a.y),O.map.depthTexture=new gs(a.x,a.y,hi)),O.map.depthTexture.name=F.name+".shadowMap",O.map.depthTexture.format=Di,this.type===ar?(O.map.depthTexture.compareFunction=V?Xl:$l,O.map.depthTexture.minFilter=Sn,O.map.depthTexture.magFilter=Sn):(O.map.depthTexture.compareFunction=null,O.map.depthTexture.minFilter=vn,O.map.depthTexture.magFilter=vn);O.camera.updateProjectionMatrix()}const $=O.map.isWebGLCubeRenderTarget?6:1;for(let Me=0;Me<$;Me++){if(O.map.isWebGLCubeRenderTarget)i.setRenderTarget(O.map,Me),i.clear();else{Me===0&&(i.setRenderTarget(O.map),i.clear());const _e=O.getViewport(Me);r.set(s.x*_e.x,s.y*_e.y,s.x*_e.z,s.y*_e.w),ie.viewport(r)}if(F.isPointLight){const _e=O.camera,Ie=O.matrix,ke=F.distance||_e.far;ke!==_e.far&&(_e.far=ke,_e.updateProjectionMatrix()),as.setFromMatrixPosition(F.matrixWorld),_e.position.copy(as),Vo.copy(_e.position),Vo.add(hy[Me]),_e.up.copy(py[Me]),_e.lookAt(Vo),_e.updateMatrixWorld(),Ie.makeTranslation(-as.x,-as.y,-as.z),Fu.multiplyMatrices(_e.projectionMatrix,_e.matrixWorldInverse),O._frustum.setFromProjectionMatrix(Fu,_e.coordinateSystem,_e.reversedDepth)}else O.updateMatrices(F);n=O.getFrustum(),P(K,y,O.camera,F,this.type)}O.isPointLightShadow!==!0&&this.type===rs&&T(O,y),O.needsUpdate=!1}p=this.type,v.needsUpdate=!1,i.setRenderTarget(C,de,H)};function T(U,K){const y=e.update(w);d.defines.VSM_SAMPLES!==U.blurSamples&&(d.defines.VSM_SAMPLES=U.blurSamples,g.defines.VSM_SAMPLES=U.blurSamples,d.needsUpdate=!0,g.needsUpdate=!0),U.mapPass===null&&(U.mapPass=new di(a.x,a.y,{format:Na,type:Pi})),d.uniforms.shadow_pass.value=U.map.depthTexture,d.uniforms.resolution.value=U.mapSize,d.uniforms.radius.value=U.radius,i.setRenderTarget(U.mapPass),i.clear(),i.renderBufferDirect(K,null,y,d,w,null),g.uniforms.shadow_pass.value=U.mapPass.texture,g.uniforms.resolution.value=U.mapSize,g.uniforms.radius.value=U.radius,i.setRenderTarget(U.map),i.clear(),i.renderBufferDirect(K,null,y,g,w,null)}function D(U,K,y,C){let de=null;const H=y.isPointLight===!0?U.customDistanceMaterial:U.customDepthMaterial;if(H!==void 0)de=H;else if(de=y.isPointLight===!0?c:l,i.localClippingEnabled&&K.clipShadows===!0&&Array.isArray(K.clippingPlanes)&&K.clippingPlanes.length!==0||K.displacementMap&&K.displacementScale!==0||K.alphaMap&&K.alphaTest>0||K.map&&K.alphaTest>0||K.alphaToCoverage===!0){const ie=de.uuid,ae=K.uuid;let oe=u[ie];oe===void 0&&(oe={},u[ie]=oe);let te=oe[ae];te===void 0&&(te=de.clone(),oe[ae]=te,K.addEventListener("dispose",G)),de=te}if(de.visible=K.visible,de.wireframe=K.wireframe,C===rs?de.side=K.shadowSide!==null?K.shadowSide:K.side:de.side=K.shadowSide!==null?K.shadowSide:m[K.side],de.alphaMap=K.alphaMap,de.alphaTest=K.alphaToCoverage===!0?.5:K.alphaTest,de.map=K.map,de.clipShadows=K.clipShadows,de.clippingPlanes=K.clippingPlanes,de.clipIntersection=K.clipIntersection,de.displacementMap=K.displacementMap,de.displacementScale=K.displacementScale,de.displacementBias=K.displacementBias,de.wireframeLinewidth=K.wireframeLinewidth,de.linewidth=K.linewidth,y.isPointLight===!0&&de.isMeshDistanceMaterial===!0){const ie=i.properties.get(de);ie.light=y}return de}function P(U,K,y,C,de){if(U.visible===!1)return;if(U.layers.test(K.layers)&&(U.isMesh||U.isLine||U.isPoints)&&(U.castShadow||U.receiveShadow&&de===rs)&&(!U.frustumCulled||n.intersectsObject(U))){U.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,U.matrixWorld);const ae=e.update(U),oe=U.material;if(Array.isArray(oe)){const te=ae.groups;for(let F=0,O=te.length;F<O;F++){const he=te[F],V=oe[he.materialIndex];if(V&&V.visible){const $=D(U,V,C,de);U.onBeforeShadow(i,U,K,y,ae,$,he),i.renderBufferDirect(y,null,ae,$,U,he),U.onAfterShadow(i,U,K,y,ae,$,he)}}}else if(oe.visible){const te=D(U,oe,C,de);U.onBeforeShadow(i,U,K,y,ae,te,null),i.renderBufferDirect(y,null,ae,te,U,null),U.onAfterShadow(i,U,K,y,ae,te,null)}}const ie=U.children;for(let ae=0,oe=ie.length;ae<oe;ae++)P(ie[ae],K,y,C,de)}function G(U){U.target.removeEventListener("dispose",G);for(const y in u){const C=u[y],de=U.target.uuid;de in C&&(C[de].dispose(),delete C[de])}}}function gy(i,e){function t(){let Z=!1;const Se=new Qt;let Ue=null;const N=new Qt(0,0,0,0);return{setMask:function(I){Ue!==I&&!Z&&(i.colorMask(I,I,I,I),Ue=I)},setLocked:function(I){Z=I},setClear:function(I,Y,ue,Ce,st){st===!0&&(I*=Ce,Y*=Ce,ue*=Ce),Se.set(I,Y,ue,Ce),N.equals(Se)===!1&&(i.clearColor(I,Y,ue,Ce),N.copy(Se))},reset:function(){Z=!1,Ue=null,N.set(-1,0,0,0)}}}function n(){let Z=!1,Se=!1,Ue=null,N=null,I=null;return{setReversed:function(Y){if(Se!==Y){const ue=e.get("EXT_clip_control");Y?ue.clipControlEXT(ue.LOWER_LEFT_EXT,ue.ZERO_TO_ONE_EXT):ue.clipControlEXT(ue.LOWER_LEFT_EXT,ue.NEGATIVE_ONE_TO_ONE_EXT),Se=Y;const Ce=I;I=null,this.setClear(Ce)}},getReversed:function(){return Se},setTest:function(Y){Y?Pe(i.DEPTH_TEST):Le(i.DEPTH_TEST)},setMask:function(Y){Ue!==Y&&!Z&&(i.depthMask(Y),Ue=Y)},setFunc:function(Y){if(Se&&(Y=Um[Y]),N!==Y){switch(Y){case $o:i.depthFunc(i.NEVER);break;case Xo:i.depthFunc(i.ALWAYS);break;case qo:i.depthFunc(i.LESS);break;case La:i.depthFunc(i.LEQUAL);break;case Yo:i.depthFunc(i.EQUAL);break;case Ko:i.depthFunc(i.GEQUAL);break;case Zo:i.depthFunc(i.GREATER);break;case jo:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}N=Y}},setLocked:function(Y){Z=Y},setClear:function(Y){I!==Y&&(I=Y,Se&&(Y=1-Y),i.clearDepth(Y))},reset:function(){Z=!1,Ue=null,N=null,I=null,Se=!1}}}function a(){let Z=!1,Se=null,Ue=null,N=null,I=null,Y=null,ue=null,Ce=null,st=null;return{setTest:function(De){Z||(De?Pe(i.STENCIL_TEST):Le(i.STENCIL_TEST))},setMask:function(De){Se!==De&&!Z&&(i.stencilMask(De),Se=De)},setFunc:function(De,Ht,Vt){(Ue!==De||N!==Ht||I!==Vt)&&(i.stencilFunc(De,Ht,Vt),Ue=De,N=Ht,I=Vt)},setOp:function(De,Ht,Vt){(Y!==De||ue!==Ht||Ce!==Vt)&&(i.stencilOp(De,Ht,Vt),Y=De,ue=Ht,Ce=Vt)},setLocked:function(De){Z=De},setClear:function(De){st!==De&&(i.clearStencil(De),st=De)},reset:function(){Z=!1,Se=null,Ue=null,N=null,I=null,Y=null,ue=null,Ce=null,st=null}}}const s=new t,r=new n,l=new a,c=new WeakMap,u=new WeakMap;let h={},m={},d=new WeakMap,g=[],x=null,w=!1,v=null,p=null,T=null,D=null,P=null,G=null,U=null,K=new zt(0,0,0),y=0,C=!1,de=null,H=null,ie=null,ae=null,oe=null;const te=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let F=!1,O=0;const he=i.getParameter(i.VERSION);he.indexOf("WebGL")!==-1?(O=parseFloat(/^WebGL (\d)/.exec(he)[1]),F=O>=1):he.indexOf("OpenGL ES")!==-1&&(O=parseFloat(/^OpenGL ES (\d)/.exec(he)[1]),F=O>=2);let V=null,$={};const Me=i.getParameter(i.SCISSOR_BOX),_e=i.getParameter(i.VIEWPORT),Ie=new Qt().fromArray(Me),ke=new Qt().fromArray(_e);function mt(Z,Se,Ue,N){const I=new Uint8Array(4),Y=i.createTexture();i.bindTexture(Z,Y),i.texParameteri(Z,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(Z,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let ue=0;ue<Ue;ue++)Z===i.TEXTURE_3D||Z===i.TEXTURE_2D_ARRAY?i.texImage3D(Se,0,i.RGBA,1,1,N,0,i.RGBA,i.UNSIGNED_BYTE,I):i.texImage2D(Se+ue,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,I);return Y}const pe={};pe[i.TEXTURE_2D]=mt(i.TEXTURE_2D,i.TEXTURE_2D,1),pe[i.TEXTURE_CUBE_MAP]=mt(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),pe[i.TEXTURE_2D_ARRAY]=mt(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),pe[i.TEXTURE_3D]=mt(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),r.setClear(1),l.setClear(0),Pe(i.DEPTH_TEST),r.setFunc(La),We(!1),et(kc),Pe(i.CULL_FACE),q(Ci);function Pe(Z){h[Z]!==!0&&(i.enable(Z),h[Z]=!0)}function Le(Z){h[Z]!==!1&&(i.disable(Z),h[Z]=!1)}function ut(Z,Se){return m[Z]!==Se?(i.bindFramebuffer(Z,Se),m[Z]=Se,Z===i.DRAW_FRAMEBUFFER&&(m[i.FRAMEBUFFER]=Se),Z===i.FRAMEBUFFER&&(m[i.DRAW_FRAMEBUFFER]=Se),!0):!1}function xe(Z,Se){let Ue=g,N=!1;if(Z){Ue=d.get(Se),Ue===void 0&&(Ue=[],d.set(Se,Ue));const I=Z.textures;if(Ue.length!==I.length||Ue[0]!==i.COLOR_ATTACHMENT0){for(let Y=0,ue=I.length;Y<ue;Y++)Ue[Y]=i.COLOR_ATTACHMENT0+Y;Ue.length=I.length,N=!0}}else Ue[0]!==i.BACK&&(Ue[0]=i.BACK,N=!0);N&&i.drawBuffers(Ue)}function Ye(Z){return x!==Z?(i.useProgram(Z),x=Z,!0):!1}const It={[aa]:i.FUNC_ADD,[nm]:i.FUNC_SUBTRACT,[im]:i.FUNC_REVERSE_SUBTRACT};It[am]=i.MIN,It[sm]=i.MAX;const se={[rm]:i.ZERO,[om]:i.ONE,[lm]:i.SRC_COLOR,[Ho]:i.SRC_ALPHA,[pm]:i.SRC_ALPHA_SATURATE,[fm]:i.DST_COLOR,[um]:i.DST_ALPHA,[cm]:i.ONE_MINUS_SRC_COLOR,[Wo]:i.ONE_MINUS_SRC_ALPHA,[hm]:i.ONE_MINUS_DST_COLOR,[dm]:i.ONE_MINUS_DST_ALPHA,[mm]:i.CONSTANT_COLOR,[gm]:i.ONE_MINUS_CONSTANT_COLOR,[vm]:i.CONSTANT_ALPHA,[_m]:i.ONE_MINUS_CONSTANT_ALPHA};function q(Z,Se,Ue,N,I,Y,ue,Ce,st,De){if(Z===Ci){w===!0&&(Le(i.BLEND),w=!1);return}if(w===!1&&(Pe(i.BLEND),w=!0),Z!==tm){if(Z!==v||De!==C){if((p!==aa||P!==aa)&&(i.blendEquation(i.FUNC_ADD),p=aa,P=aa),De)switch(Z){case Da:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Vc:i.blendFunc(i.ONE,i.ONE);break;case zc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Gc:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Nt("WebGLState: Invalid blending: ",Z);break}else switch(Z){case Da:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Vc:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case zc:Nt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Gc:Nt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Nt("WebGLState: Invalid blending: ",Z);break}T=null,D=null,G=null,U=null,K.set(0,0,0),y=0,v=Z,C=De}return}I=I||Se,Y=Y||Ue,ue=ue||N,(Se!==p||I!==P)&&(i.blendEquationSeparate(It[Se],It[I]),p=Se,P=I),(Ue!==T||N!==D||Y!==G||ue!==U)&&(i.blendFuncSeparate(se[Ue],se[N],se[Y],se[ue]),T=Ue,D=N,G=Y,U=ue),(Ce.equals(K)===!1||st!==y)&&(i.blendColor(Ce.r,Ce.g,Ce.b,st),K.copy(Ce),y=st),v=Z,C=!1}function Te(Z,Se){Z.side===wi?Le(i.CULL_FACE):Pe(i.CULL_FACE);let Ue=Z.side===Pn;Se&&(Ue=!Ue),We(Ue),Z.blending===Da&&Z.transparent===!1?q(Ci):q(Z.blending,Z.blendEquation,Z.blendSrc,Z.blendDst,Z.blendEquationAlpha,Z.blendSrcAlpha,Z.blendDstAlpha,Z.blendColor,Z.blendAlpha,Z.premultipliedAlpha),r.setFunc(Z.depthFunc),r.setTest(Z.depthTest),r.setMask(Z.depthWrite),s.setMask(Z.colorWrite);const N=Z.stencilWrite;l.setTest(N),N&&(l.setMask(Z.stencilWriteMask),l.setFunc(Z.stencilFunc,Z.stencilRef,Z.stencilFuncMask),l.setOp(Z.stencilFail,Z.stencilZFail,Z.stencilZPass)),_t(Z.polygonOffset,Z.polygonOffsetFactor,Z.polygonOffsetUnits),Z.alphaToCoverage===!0?Pe(i.SAMPLE_ALPHA_TO_COVERAGE):Le(i.SAMPLE_ALPHA_TO_COVERAGE)}function We(Z){de!==Z&&(Z?i.frontFace(i.CW):i.frontFace(i.CCW),de=Z)}function et(Z){Z!==Jp?(Pe(i.CULL_FACE),Z!==H&&(Z===kc?i.cullFace(i.BACK):Z===Qp?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Le(i.CULL_FACE),H=Z}function k(Z){Z!==ie&&(F&&i.lineWidth(Z),ie=Z)}function _t(Z,Se,Ue){Z?(Pe(i.POLYGON_OFFSET_FILL),(ae!==Se||oe!==Ue)&&(ae=Se,oe=Ue,r.getReversed()&&(Se=-Se),i.polygonOffset(Se,Ue))):Le(i.POLYGON_OFFSET_FILL)}function Ve(Z){Z?Pe(i.SCISSOR_TEST):Le(i.SCISSOR_TEST)}function yt(Z){Z===void 0&&(Z=i.TEXTURE0+te-1),V!==Z&&(i.activeTexture(Z),V=Z)}function Ke(Z,Se,Ue){Ue===void 0&&(V===null?Ue=i.TEXTURE0+te-1:Ue=V);let N=$[Ue];N===void 0&&(N={type:void 0,texture:void 0},$[Ue]=N),(N.type!==Z||N.texture!==Se)&&(V!==Ue&&(i.activeTexture(Ue),V=Ue),i.bindTexture(Z,Se||pe[Z]),N.type=Z,N.texture=Se)}function R(){const Z=$[V];Z!==void 0&&Z.type!==void 0&&(i.bindTexture(Z.type,null),Z.type=void 0,Z.texture=void 0)}function _(){try{i.compressedTexImage2D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function j(){try{i.compressedTexImage3D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function ge(){try{i.texSubImage2D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function ye(){try{i.texSubImage3D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function fe(){try{i.compressedTexSubImage2D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function je(){try{i.compressedTexSubImage3D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function Oe(){try{i.texStorage2D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function Qe(){try{i.texStorage3D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function rt(){try{i.texImage2D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function Ae(){try{i.texImage3D(...arguments)}catch(Z){Nt("WebGLState:",Z)}}function Re(Z){Ie.equals(Z)===!1&&(i.scissor(Z.x,Z.y,Z.z,Z.w),Ie.copy(Z))}function qe(Z){ke.equals(Z)===!1&&(i.viewport(Z.x,Z.y,Z.z,Z.w),ke.copy(Z))}function tt(Z,Se){let Ue=u.get(Se);Ue===void 0&&(Ue=new WeakMap,u.set(Se,Ue));let N=Ue.get(Z);N===void 0&&(N=i.getUniformBlockIndex(Se,Z.name),Ue.set(Z,N))}function Ge(Z,Se){const N=u.get(Se).get(Z);c.get(Se)!==N&&(i.uniformBlockBinding(Se,N,Z.__bindingPointIndex),c.set(Se,N))}function ct(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),r.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},V=null,$={},m={},d=new WeakMap,g=[],x=null,w=!1,v=null,p=null,T=null,D=null,P=null,G=null,U=null,K=new zt(0,0,0),y=0,C=!1,de=null,H=null,ie=null,ae=null,oe=null,Ie.set(0,0,i.canvas.width,i.canvas.height),ke.set(0,0,i.canvas.width,i.canvas.height),s.reset(),r.reset(),l.reset()}return{buffers:{color:s,depth:r,stencil:l},enable:Pe,disable:Le,bindFramebuffer:ut,drawBuffers:xe,useProgram:Ye,setBlending:q,setMaterial:Te,setFlipSided:We,setCullFace:et,setLineWidth:k,setPolygonOffset:_t,setScissorTest:Ve,activeTexture:yt,bindTexture:Ke,unbindTexture:R,compressedTexImage2D:_,compressedTexImage3D:j,texImage2D:rt,texImage3D:Ae,updateUBOMapping:tt,uniformBlockBinding:Ge,texStorage2D:Oe,texStorage3D:Qe,texSubImage2D:ge,texSubImage3D:ye,compressedTexSubImage2D:fe,compressedTexSubImage3D:je,scissor:Re,viewport:qe,reset:ct}}function vy(i,e,t,n,a,s,r){const l=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),u=new Gt,h=new WeakMap;let m;const d=new WeakMap;let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(R,_){return g?new OffscreenCanvas(R,_):ps("canvas")}function w(R,_,j){let ge=1;const ye=Ke(R);if((ye.width>j||ye.height>j)&&(ge=j/Math.max(ye.width,ye.height)),ge<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){const fe=Math.floor(ge*ye.width),je=Math.floor(ge*ye.height);m===void 0&&(m=x(fe,je));const Oe=_?x(fe,je):m;return Oe.width=fe,Oe.height=je,Oe.getContext("2d").drawImage(R,0,0,fe,je),vt("WebGLRenderer: Texture has been resized from ("+ye.width+"x"+ye.height+") to ("+fe+"x"+je+")."),Oe}else return"data"in R&&vt("WebGLRenderer: Image in DataTexture is too big ("+ye.width+"x"+ye.height+")."),R;return R}function v(R){return R.generateMipmaps}function p(R){i.generateMipmap(R)}function T(R){return R.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:R.isWebGL3DRenderTarget?i.TEXTURE_3D:R.isWebGLArrayRenderTarget||R.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function D(R,_,j,ge,ye=!1){if(R!==null){if(i[R]!==void 0)return i[R];vt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let fe=_;if(_===i.RED&&(j===i.FLOAT&&(fe=i.R32F),j===i.HALF_FLOAT&&(fe=i.R16F),j===i.UNSIGNED_BYTE&&(fe=i.R8)),_===i.RED_INTEGER&&(j===i.UNSIGNED_BYTE&&(fe=i.R8UI),j===i.UNSIGNED_SHORT&&(fe=i.R16UI),j===i.UNSIGNED_INT&&(fe=i.R32UI),j===i.BYTE&&(fe=i.R8I),j===i.SHORT&&(fe=i.R16I),j===i.INT&&(fe=i.R32I)),_===i.RG&&(j===i.FLOAT&&(fe=i.RG32F),j===i.HALF_FLOAT&&(fe=i.RG16F),j===i.UNSIGNED_BYTE&&(fe=i.RG8)),_===i.RG_INTEGER&&(j===i.UNSIGNED_BYTE&&(fe=i.RG8UI),j===i.UNSIGNED_SHORT&&(fe=i.RG16UI),j===i.UNSIGNED_INT&&(fe=i.RG32UI),j===i.BYTE&&(fe=i.RG8I),j===i.SHORT&&(fe=i.RG16I),j===i.INT&&(fe=i.RG32I)),_===i.RGB_INTEGER&&(j===i.UNSIGNED_BYTE&&(fe=i.RGB8UI),j===i.UNSIGNED_SHORT&&(fe=i.RGB16UI),j===i.UNSIGNED_INT&&(fe=i.RGB32UI),j===i.BYTE&&(fe=i.RGB8I),j===i.SHORT&&(fe=i.RGB16I),j===i.INT&&(fe=i.RGB32I)),_===i.RGBA_INTEGER&&(j===i.UNSIGNED_BYTE&&(fe=i.RGBA8UI),j===i.UNSIGNED_SHORT&&(fe=i.RGBA16UI),j===i.UNSIGNED_INT&&(fe=i.RGBA32UI),j===i.BYTE&&(fe=i.RGBA8I),j===i.SHORT&&(fe=i.RGBA16I),j===i.INT&&(fe=i.RGBA32I)),_===i.RGB&&(j===i.UNSIGNED_INT_5_9_9_9_REV&&(fe=i.RGB9_E5),j===i.UNSIGNED_INT_10F_11F_11F_REV&&(fe=i.R11F_G11F_B10F)),_===i.RGBA){const je=ye?dr:Ut.getTransfer(ge);j===i.FLOAT&&(fe=i.RGBA32F),j===i.HALF_FLOAT&&(fe=i.RGBA16F),j===i.UNSIGNED_BYTE&&(fe=je===kt?i.SRGB8_ALPHA8:i.RGBA8),j===i.UNSIGNED_SHORT_4_4_4_4&&(fe=i.RGBA4),j===i.UNSIGNED_SHORT_5_5_5_1&&(fe=i.RGB5_A1)}return(fe===i.R16F||fe===i.R32F||fe===i.RG16F||fe===i.RG32F||fe===i.RGBA16F||fe===i.RGBA32F)&&e.get("EXT_color_buffer_float"),fe}function P(R,_){let j;return R?_===null||_===hi||_===hs?j=i.DEPTH24_STENCIL8:_===li?j=i.DEPTH32F_STENCIL8:_===fs&&(j=i.DEPTH24_STENCIL8,vt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===hi||_===hs?j=i.DEPTH_COMPONENT24:_===li?j=i.DEPTH_COMPONENT32F:_===fs&&(j=i.DEPTH_COMPONENT16),j}function G(R,_){return v(R)===!0||R.isFramebufferTexture&&R.minFilter!==vn&&R.minFilter!==Sn?Math.log2(Math.max(_.width,_.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?_.mipmaps.length:1}function U(R){const _=R.target;_.removeEventListener("dispose",U),y(_),_.isVideoTexture&&h.delete(_)}function K(R){const _=R.target;_.removeEventListener("dispose",K),de(_)}function y(R){const _=n.get(R);if(_.__webglInit===void 0)return;const j=R.source,ge=d.get(j);if(ge){const ye=ge[_.__cacheKey];ye.usedTimes--,ye.usedTimes===0&&C(R),Object.keys(ge).length===0&&d.delete(j)}n.remove(R)}function C(R){const _=n.get(R);i.deleteTexture(_.__webglTexture);const j=R.source,ge=d.get(j);delete ge[_.__cacheKey],r.memory.textures--}function de(R){const _=n.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),n.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let ge=0;ge<6;ge++){if(Array.isArray(_.__webglFramebuffer[ge]))for(let ye=0;ye<_.__webglFramebuffer[ge].length;ye++)i.deleteFramebuffer(_.__webglFramebuffer[ge][ye]);else i.deleteFramebuffer(_.__webglFramebuffer[ge]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[ge])}else{if(Array.isArray(_.__webglFramebuffer))for(let ge=0;ge<_.__webglFramebuffer.length;ge++)i.deleteFramebuffer(_.__webglFramebuffer[ge]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let ge=0;ge<_.__webglColorRenderbuffer.length;ge++)_.__webglColorRenderbuffer[ge]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[ge]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}const j=R.textures;for(let ge=0,ye=j.length;ge<ye;ge++){const fe=n.get(j[ge]);fe.__webglTexture&&(i.deleteTexture(fe.__webglTexture),r.memory.textures--),n.remove(j[ge])}n.remove(R)}let H=0;function ie(){H=0}function ae(){const R=H;return R>=a.maxTextures&&vt("WebGLTextures: Trying to use "+R+" texture units while this GPU supports only "+a.maxTextures),H+=1,R}function oe(R){const _=[];return _.push(R.wrapS),_.push(R.wrapT),_.push(R.wrapR||0),_.push(R.magFilter),_.push(R.minFilter),_.push(R.anisotropy),_.push(R.internalFormat),_.push(R.format),_.push(R.type),_.push(R.generateMipmaps),_.push(R.premultiplyAlpha),_.push(R.flipY),_.push(R.unpackAlignment),_.push(R.colorSpace),_.join()}function te(R,_){const j=n.get(R);if(R.isVideoTexture&&Ve(R),R.isRenderTargetTexture===!1&&R.isExternalTexture!==!0&&R.version>0&&j.__version!==R.version){const ge=R.image;if(ge===null)vt("WebGLRenderer: Texture marked for update but no image data found.");else if(ge.complete===!1)vt("WebGLRenderer: Texture marked for update but image is incomplete");else{pe(j,R,_);return}}else R.isExternalTexture&&(j.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,j.__webglTexture,i.TEXTURE0+_)}function F(R,_){const j=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&j.__version!==R.version){pe(j,R,_);return}else R.isExternalTexture&&(j.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,j.__webglTexture,i.TEXTURE0+_)}function O(R,_){const j=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&j.__version!==R.version){pe(j,R,_);return}t.bindTexture(i.TEXTURE_3D,j.__webglTexture,i.TEXTURE0+_)}function he(R,_){const j=n.get(R);if(R.isCubeDepthTexture!==!0&&R.version>0&&j.__version!==R.version){Pe(j,R,_);return}t.bindTexture(i.TEXTURE_CUBE_MAP,j.__webglTexture,i.TEXTURE0+_)}const V={[Jo]:i.REPEAT,[Ai]:i.CLAMP_TO_EDGE,[Qo]:i.MIRRORED_REPEAT},$={[vn]:i.NEAREST,[Sm]:i.NEAREST_MIPMAP_NEAREST,[Us]:i.NEAREST_MIPMAP_LINEAR,[Sn]:i.LINEAR,[uo]:i.LINEAR_MIPMAP_NEAREST,[ra]:i.LINEAR_MIPMAP_LINEAR},Me={[Tm]:i.NEVER,[Pm]:i.ALWAYS,[wm]:i.LESS,[$l]:i.LEQUAL,[Am]:i.EQUAL,[Xl]:i.GEQUAL,[Cm]:i.GREATER,[Rm]:i.NOTEQUAL};function _e(R,_){if(_.type===li&&e.has("OES_texture_float_linear")===!1&&(_.magFilter===Sn||_.magFilter===uo||_.magFilter===Us||_.magFilter===ra||_.minFilter===Sn||_.minFilter===uo||_.minFilter===Us||_.minFilter===ra)&&vt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(R,i.TEXTURE_WRAP_S,V[_.wrapS]),i.texParameteri(R,i.TEXTURE_WRAP_T,V[_.wrapT]),(R===i.TEXTURE_3D||R===i.TEXTURE_2D_ARRAY)&&i.texParameteri(R,i.TEXTURE_WRAP_R,V[_.wrapR]),i.texParameteri(R,i.TEXTURE_MAG_FILTER,$[_.magFilter]),i.texParameteri(R,i.TEXTURE_MIN_FILTER,$[_.minFilter]),_.compareFunction&&(i.texParameteri(R,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(R,i.TEXTURE_COMPARE_FUNC,Me[_.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===vn||_.minFilter!==Us&&_.minFilter!==ra||_.type===li&&e.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){const j=e.get("EXT_texture_filter_anisotropic");i.texParameterf(R,j.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,a.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Ie(R,_){let j=!1;R.__webglInit===void 0&&(R.__webglInit=!0,_.addEventListener("dispose",U));const ge=_.source;let ye=d.get(ge);ye===void 0&&(ye={},d.set(ge,ye));const fe=oe(_);if(fe!==R.__cacheKey){ye[fe]===void 0&&(ye[fe]={texture:i.createTexture(),usedTimes:0},r.memory.textures++,j=!0),ye[fe].usedTimes++;const je=ye[R.__cacheKey];je!==void 0&&(ye[R.__cacheKey].usedTimes--,je.usedTimes===0&&C(_)),R.__cacheKey=fe,R.__webglTexture=ye[fe].texture}return j}function ke(R,_,j){return Math.floor(Math.floor(R/j)/_)}function mt(R,_,j,ge){const fe=R.updateRanges;if(fe.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,j,ge,_.data);else{fe.sort((Ae,Re)=>Ae.start-Re.start);let je=0;for(let Ae=1;Ae<fe.length;Ae++){const Re=fe[je],qe=fe[Ae],tt=Re.start+Re.count,Ge=ke(qe.start,_.width,4),ct=ke(Re.start,_.width,4);qe.start<=tt+1&&Ge===ct&&ke(qe.start+qe.count-1,_.width,4)===Ge?Re.count=Math.max(Re.count,qe.start+qe.count-Re.start):(++je,fe[je]=qe)}fe.length=je+1;const Oe=i.getParameter(i.UNPACK_ROW_LENGTH),Qe=i.getParameter(i.UNPACK_SKIP_PIXELS),rt=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let Ae=0,Re=fe.length;Ae<Re;Ae++){const qe=fe[Ae],tt=Math.floor(qe.start/4),Ge=Math.ceil(qe.count/4),ct=tt%_.width,Z=Math.floor(tt/_.width),Se=Ge,Ue=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,ct),i.pixelStorei(i.UNPACK_SKIP_ROWS,Z),t.texSubImage2D(i.TEXTURE_2D,0,ct,Z,Se,Ue,j,ge,_.data)}R.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,Oe),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Qe),i.pixelStorei(i.UNPACK_SKIP_ROWS,rt)}}function pe(R,_,j){let ge=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(ge=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(ge=i.TEXTURE_3D);const ye=Ie(R,_),fe=_.source;t.bindTexture(ge,R.__webglTexture,i.TEXTURE0+j);const je=n.get(fe);if(fe.version!==je.__version||ye===!0){t.activeTexture(i.TEXTURE0+j);const Oe=Ut.getPrimaries(Ut.workingColorSpace),Qe=_.colorSpace===Xi?null:Ut.getPrimaries(_.colorSpace),rt=_.colorSpace===Xi||Oe===Qe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,rt);let Ae=w(_.image,!1,a.maxTextureSize);Ae=yt(_,Ae);const Re=s.convert(_.format,_.colorSpace),qe=s.convert(_.type);let tt=D(_.internalFormat,Re,qe,_.colorSpace,_.isVideoTexture);_e(ge,_);let Ge;const ct=_.mipmaps,Z=_.isVideoTexture!==!0,Se=je.__version===void 0||ye===!0,Ue=fe.dataReady,N=G(_,Ae);if(_.isDepthTexture)tt=P(_.format===oa,_.type),Se&&(Z?t.texStorage2D(i.TEXTURE_2D,1,tt,Ae.width,Ae.height):t.texImage2D(i.TEXTURE_2D,0,tt,Ae.width,Ae.height,0,Re,qe,null));else if(_.isDataTexture)if(ct.length>0){Z&&Se&&t.texStorage2D(i.TEXTURE_2D,N,tt,ct[0].width,ct[0].height);for(let I=0,Y=ct.length;I<Y;I++)Ge=ct[I],Z?Ue&&t.texSubImage2D(i.TEXTURE_2D,I,0,0,Ge.width,Ge.height,Re,qe,Ge.data):t.texImage2D(i.TEXTURE_2D,I,tt,Ge.width,Ge.height,0,Re,qe,Ge.data);_.generateMipmaps=!1}else Z?(Se&&t.texStorage2D(i.TEXTURE_2D,N,tt,Ae.width,Ae.height),Ue&&mt(_,Ae,Re,qe)):t.texImage2D(i.TEXTURE_2D,0,tt,Ae.width,Ae.height,0,Re,qe,Ae.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Z&&Se&&t.texStorage3D(i.TEXTURE_2D_ARRAY,N,tt,ct[0].width,ct[0].height,Ae.depth);for(let I=0,Y=ct.length;I<Y;I++)if(Ge=ct[I],_.format!==ti)if(Re!==null)if(Z){if(Ue)if(_.layerUpdates.size>0){const ue=hu(Ge.width,Ge.height,_.format,_.type);for(const Ce of _.layerUpdates){const st=Ge.data.subarray(Ce*ue/Ge.data.BYTES_PER_ELEMENT,(Ce+1)*ue/Ge.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,I,0,0,Ce,Ge.width,Ge.height,1,Re,st)}_.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,I,0,0,0,Ge.width,Ge.height,Ae.depth,Re,Ge.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,I,tt,Ge.width,Ge.height,Ae.depth,0,Ge.data,0,0);else vt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Z?Ue&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,I,0,0,0,Ge.width,Ge.height,Ae.depth,Re,qe,Ge.data):t.texImage3D(i.TEXTURE_2D_ARRAY,I,tt,Ge.width,Ge.height,Ae.depth,0,Re,qe,Ge.data)}else{Z&&Se&&t.texStorage2D(i.TEXTURE_2D,N,tt,ct[0].width,ct[0].height);for(let I=0,Y=ct.length;I<Y;I++)Ge=ct[I],_.format!==ti?Re!==null?Z?Ue&&t.compressedTexSubImage2D(i.TEXTURE_2D,I,0,0,Ge.width,Ge.height,Re,Ge.data):t.compressedTexImage2D(i.TEXTURE_2D,I,tt,Ge.width,Ge.height,0,Ge.data):vt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Z?Ue&&t.texSubImage2D(i.TEXTURE_2D,I,0,0,Ge.width,Ge.height,Re,qe,Ge.data):t.texImage2D(i.TEXTURE_2D,I,tt,Ge.width,Ge.height,0,Re,qe,Ge.data)}else if(_.isDataArrayTexture)if(Z){if(Se&&t.texStorage3D(i.TEXTURE_2D_ARRAY,N,tt,Ae.width,Ae.height,Ae.depth),Ue)if(_.layerUpdates.size>0){const I=hu(Ae.width,Ae.height,_.format,_.type);for(const Y of _.layerUpdates){const ue=Ae.data.subarray(Y*I/Ae.data.BYTES_PER_ELEMENT,(Y+1)*I/Ae.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Y,Ae.width,Ae.height,1,Re,qe,ue)}_.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,Ae.width,Ae.height,Ae.depth,Re,qe,Ae.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,tt,Ae.width,Ae.height,Ae.depth,0,Re,qe,Ae.data);else if(_.isData3DTexture)Z?(Se&&t.texStorage3D(i.TEXTURE_3D,N,tt,Ae.width,Ae.height,Ae.depth),Ue&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,Ae.width,Ae.height,Ae.depth,Re,qe,Ae.data)):t.texImage3D(i.TEXTURE_3D,0,tt,Ae.width,Ae.height,Ae.depth,0,Re,qe,Ae.data);else if(_.isFramebufferTexture){if(Se)if(Z)t.texStorage2D(i.TEXTURE_2D,N,tt,Ae.width,Ae.height);else{let I=Ae.width,Y=Ae.height;for(let ue=0;ue<N;ue++)t.texImage2D(i.TEXTURE_2D,ue,tt,I,Y,0,Re,qe,null),I>>=1,Y>>=1}}else if(ct.length>0){if(Z&&Se){const I=Ke(ct[0]);t.texStorage2D(i.TEXTURE_2D,N,tt,I.width,I.height)}for(let I=0,Y=ct.length;I<Y;I++)Ge=ct[I],Z?Ue&&t.texSubImage2D(i.TEXTURE_2D,I,0,0,Re,qe,Ge):t.texImage2D(i.TEXTURE_2D,I,tt,Re,qe,Ge);_.generateMipmaps=!1}else if(Z){if(Se){const I=Ke(Ae);t.texStorage2D(i.TEXTURE_2D,N,tt,I.width,I.height)}Ue&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Re,qe,Ae)}else t.texImage2D(i.TEXTURE_2D,0,tt,Re,qe,Ae);v(_)&&p(ge),je.__version=fe.version,_.onUpdate&&_.onUpdate(_)}R.__version=_.version}function Pe(R,_,j){if(_.image.length!==6)return;const ge=Ie(R,_),ye=_.source;t.bindTexture(i.TEXTURE_CUBE_MAP,R.__webglTexture,i.TEXTURE0+j);const fe=n.get(ye);if(ye.version!==fe.__version||ge===!0){t.activeTexture(i.TEXTURE0+j);const je=Ut.getPrimaries(Ut.workingColorSpace),Oe=_.colorSpace===Xi?null:Ut.getPrimaries(_.colorSpace),Qe=_.colorSpace===Xi||je===Oe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Qe);const rt=_.isCompressedTexture||_.image[0].isCompressedTexture,Ae=_.image[0]&&_.image[0].isDataTexture,Re=[];for(let Y=0;Y<6;Y++)!rt&&!Ae?Re[Y]=w(_.image[Y],!0,a.maxCubemapSize):Re[Y]=Ae?_.image[Y].image:_.image[Y],Re[Y]=yt(_,Re[Y]);const qe=Re[0],tt=s.convert(_.format,_.colorSpace),Ge=s.convert(_.type),ct=D(_.internalFormat,tt,Ge,_.colorSpace),Z=_.isVideoTexture!==!0,Se=fe.__version===void 0||ge===!0,Ue=ye.dataReady;let N=G(_,qe);_e(i.TEXTURE_CUBE_MAP,_);let I;if(rt){Z&&Se&&t.texStorage2D(i.TEXTURE_CUBE_MAP,N,ct,qe.width,qe.height);for(let Y=0;Y<6;Y++){I=Re[Y].mipmaps;for(let ue=0;ue<I.length;ue++){const Ce=I[ue];_.format!==ti?tt!==null?Z?Ue&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ue,0,0,Ce.width,Ce.height,tt,Ce.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ue,ct,Ce.width,Ce.height,0,Ce.data):vt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Z?Ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ue,0,0,Ce.width,Ce.height,tt,Ge,Ce.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ue,ct,Ce.width,Ce.height,0,tt,Ge,Ce.data)}}}else{if(I=_.mipmaps,Z&&Se){I.length>0&&N++;const Y=Ke(Re[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,N,ct,Y.width,Y.height)}for(let Y=0;Y<6;Y++)if(Ae){Z?Ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,0,0,Re[Y].width,Re[Y].height,tt,Ge,Re[Y].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,ct,Re[Y].width,Re[Y].height,0,tt,Ge,Re[Y].data);for(let ue=0;ue<I.length;ue++){const st=I[ue].image[Y].image;Z?Ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ue+1,0,0,st.width,st.height,tt,Ge,st.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ue+1,ct,st.width,st.height,0,tt,Ge,st.data)}}else{Z?Ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,0,0,tt,Ge,Re[Y]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0,ct,tt,Ge,Re[Y]);for(let ue=0;ue<I.length;ue++){const Ce=I[ue];Z?Ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ue+1,0,0,tt,Ge,Ce.image[Y]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ue+1,ct,tt,Ge,Ce.image[Y])}}}v(_)&&p(i.TEXTURE_CUBE_MAP),fe.__version=ye.version,_.onUpdate&&_.onUpdate(_)}R.__version=_.version}function Le(R,_,j,ge,ye,fe){const je=s.convert(j.format,j.colorSpace),Oe=s.convert(j.type),Qe=D(j.internalFormat,je,Oe,j.colorSpace),rt=n.get(_),Ae=n.get(j);if(Ae.__renderTarget=_,!rt.__hasExternalTextures){const Re=Math.max(1,_.width>>fe),qe=Math.max(1,_.height>>fe);ye===i.TEXTURE_3D||ye===i.TEXTURE_2D_ARRAY?t.texImage3D(ye,fe,Qe,Re,qe,_.depth,0,je,Oe,null):t.texImage2D(ye,fe,Qe,Re,qe,0,je,Oe,null)}t.bindFramebuffer(i.FRAMEBUFFER,R),_t(_)?l.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ge,ye,Ae.__webglTexture,0,k(_)):(ye===i.TEXTURE_2D||ye>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ye<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,ge,ye,Ae.__webglTexture,fe),t.bindFramebuffer(i.FRAMEBUFFER,null)}function ut(R,_,j){if(i.bindRenderbuffer(i.RENDERBUFFER,R),_.depthBuffer){const ge=_.depthTexture,ye=ge&&ge.isDepthTexture?ge.type:null,fe=P(_.stencilBuffer,ye),je=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;_t(_)?l.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,k(_),fe,_.width,_.height):j?i.renderbufferStorageMultisample(i.RENDERBUFFER,k(_),fe,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,fe,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,je,i.RENDERBUFFER,R)}else{const ge=_.textures;for(let ye=0;ye<ge.length;ye++){const fe=ge[ye],je=s.convert(fe.format,fe.colorSpace),Oe=s.convert(fe.type),Qe=D(fe.internalFormat,je,Oe,fe.colorSpace);_t(_)?l.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,k(_),Qe,_.width,_.height):j?i.renderbufferStorageMultisample(i.RENDERBUFFER,k(_),Qe,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,Qe,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function xe(R,_,j){const ge=_.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,R),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const ye=n.get(_.depthTexture);if(ye.__renderTarget=_,(!ye.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),ge){if(ye.__webglInit===void 0&&(ye.__webglInit=!0,_.depthTexture.addEventListener("dispose",U)),ye.__webglTexture===void 0){ye.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,ye.__webglTexture),_e(i.TEXTURE_CUBE_MAP,_.depthTexture);const rt=s.convert(_.depthTexture.format),Ae=s.convert(_.depthTexture.type);let Re;_.depthTexture.format===Di?Re=i.DEPTH_COMPONENT24:_.depthTexture.format===oa&&(Re=i.DEPTH24_STENCIL8);for(let qe=0;qe<6;qe++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+qe,0,Re,_.width,_.height,0,rt,Ae,null)}}else te(_.depthTexture,0);const fe=ye.__webglTexture,je=k(_),Oe=ge?i.TEXTURE_CUBE_MAP_POSITIVE_X+j:i.TEXTURE_2D,Qe=_.depthTexture.format===oa?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===Di)_t(_)?l.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Qe,Oe,fe,0,je):i.framebufferTexture2D(i.FRAMEBUFFER,Qe,Oe,fe,0);else if(_.depthTexture.format===oa)_t(_)?l.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Qe,Oe,fe,0,je):i.framebufferTexture2D(i.FRAMEBUFFER,Qe,Oe,fe,0);else throw new Error("Unknown depthTexture format")}function Ye(R){const _=n.get(R),j=R.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==R.depthTexture){const ge=R.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),ge){const ye=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,ge.removeEventListener("dispose",ye)};ge.addEventListener("dispose",ye),_.__depthDisposeCallback=ye}_.__boundDepthTexture=ge}if(R.depthTexture&&!_.__autoAllocateDepthBuffer)if(j)for(let ge=0;ge<6;ge++)xe(_.__webglFramebuffer[ge],R,ge);else{const ge=R.texture.mipmaps;ge&&ge.length>0?xe(_.__webglFramebuffer[0],R,0):xe(_.__webglFramebuffer,R,0)}else if(j){_.__webglDepthbuffer=[];for(let ge=0;ge<6;ge++)if(t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[ge]),_.__webglDepthbuffer[ge]===void 0)_.__webglDepthbuffer[ge]=i.createRenderbuffer(),ut(_.__webglDepthbuffer[ge],R,!1);else{const ye=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,fe=_.__webglDepthbuffer[ge];i.bindRenderbuffer(i.RENDERBUFFER,fe),i.framebufferRenderbuffer(i.FRAMEBUFFER,ye,i.RENDERBUFFER,fe)}}else{const ge=R.texture.mipmaps;if(ge&&ge.length>0?t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),ut(_.__webglDepthbuffer,R,!1);else{const ye=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,fe=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,fe),i.framebufferRenderbuffer(i.FRAMEBUFFER,ye,i.RENDERBUFFER,fe)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function It(R,_,j){const ge=n.get(R);_!==void 0&&Le(ge.__webglFramebuffer,R,R.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),j!==void 0&&Ye(R)}function se(R){const _=R.texture,j=n.get(R),ge=n.get(_);R.addEventListener("dispose",K);const ye=R.textures,fe=R.isWebGLCubeRenderTarget===!0,je=ye.length>1;if(je||(ge.__webglTexture===void 0&&(ge.__webglTexture=i.createTexture()),ge.__version=_.version,r.memory.textures++),fe){j.__webglFramebuffer=[];for(let Oe=0;Oe<6;Oe++)if(_.mipmaps&&_.mipmaps.length>0){j.__webglFramebuffer[Oe]=[];for(let Qe=0;Qe<_.mipmaps.length;Qe++)j.__webglFramebuffer[Oe][Qe]=i.createFramebuffer()}else j.__webglFramebuffer[Oe]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){j.__webglFramebuffer=[];for(let Oe=0;Oe<_.mipmaps.length;Oe++)j.__webglFramebuffer[Oe]=i.createFramebuffer()}else j.__webglFramebuffer=i.createFramebuffer();if(je)for(let Oe=0,Qe=ye.length;Oe<Qe;Oe++){const rt=n.get(ye[Oe]);rt.__webglTexture===void 0&&(rt.__webglTexture=i.createTexture(),r.memory.textures++)}if(R.samples>0&&_t(R)===!1){j.__webglMultisampledFramebuffer=i.createFramebuffer(),j.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,j.__webglMultisampledFramebuffer);for(let Oe=0;Oe<ye.length;Oe++){const Qe=ye[Oe];j.__webglColorRenderbuffer[Oe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,j.__webglColorRenderbuffer[Oe]);const rt=s.convert(Qe.format,Qe.colorSpace),Ae=s.convert(Qe.type),Re=D(Qe.internalFormat,rt,Ae,Qe.colorSpace,R.isXRRenderTarget===!0),qe=k(R);i.renderbufferStorageMultisample(i.RENDERBUFFER,qe,Re,R.width,R.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Oe,i.RENDERBUFFER,j.__webglColorRenderbuffer[Oe])}i.bindRenderbuffer(i.RENDERBUFFER,null),R.depthBuffer&&(j.__webglDepthRenderbuffer=i.createRenderbuffer(),ut(j.__webglDepthRenderbuffer,R,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(fe){t.bindTexture(i.TEXTURE_CUBE_MAP,ge.__webglTexture),_e(i.TEXTURE_CUBE_MAP,_);for(let Oe=0;Oe<6;Oe++)if(_.mipmaps&&_.mipmaps.length>0)for(let Qe=0;Qe<_.mipmaps.length;Qe++)Le(j.__webglFramebuffer[Oe][Qe],R,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Oe,Qe);else Le(j.__webglFramebuffer[Oe],R,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Oe,0);v(_)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(je){for(let Oe=0,Qe=ye.length;Oe<Qe;Oe++){const rt=ye[Oe],Ae=n.get(rt);let Re=i.TEXTURE_2D;(R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(Re=R.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Re,Ae.__webglTexture),_e(Re,rt),Le(j.__webglFramebuffer,R,rt,i.COLOR_ATTACHMENT0+Oe,Re,0),v(rt)&&p(Re)}t.unbindTexture()}else{let Oe=i.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(Oe=R.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Oe,ge.__webglTexture),_e(Oe,_),_.mipmaps&&_.mipmaps.length>0)for(let Qe=0;Qe<_.mipmaps.length;Qe++)Le(j.__webglFramebuffer[Qe],R,_,i.COLOR_ATTACHMENT0,Oe,Qe);else Le(j.__webglFramebuffer,R,_,i.COLOR_ATTACHMENT0,Oe,0);v(_)&&p(Oe),t.unbindTexture()}R.depthBuffer&&Ye(R)}function q(R){const _=R.textures;for(let j=0,ge=_.length;j<ge;j++){const ye=_[j];if(v(ye)){const fe=T(R),je=n.get(ye).__webglTexture;t.bindTexture(fe,je),p(fe),t.unbindTexture()}}}const Te=[],We=[];function et(R){if(R.samples>0){if(_t(R)===!1){const _=R.textures,j=R.width,ge=R.height;let ye=i.COLOR_BUFFER_BIT;const fe=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,je=n.get(R),Oe=_.length>1;if(Oe)for(let rt=0;rt<_.length;rt++)t.bindFramebuffer(i.FRAMEBUFFER,je.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+rt,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,je.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+rt,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,je.__webglMultisampledFramebuffer);const Qe=R.texture.mipmaps;Qe&&Qe.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,je.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,je.__webglFramebuffer);for(let rt=0;rt<_.length;rt++){if(R.resolveDepthBuffer&&(R.depthBuffer&&(ye|=i.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&(ye|=i.STENCIL_BUFFER_BIT)),Oe){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,je.__webglColorRenderbuffer[rt]);const Ae=n.get(_[rt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ae,0)}i.blitFramebuffer(0,0,j,ge,0,0,j,ge,ye,i.NEAREST),c===!0&&(Te.length=0,We.length=0,Te.push(i.COLOR_ATTACHMENT0+rt),R.depthBuffer&&R.resolveDepthBuffer===!1&&(Te.push(fe),We.push(fe),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,We)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Te))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),Oe)for(let rt=0;rt<_.length;rt++){t.bindFramebuffer(i.FRAMEBUFFER,je.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+rt,i.RENDERBUFFER,je.__webglColorRenderbuffer[rt]);const Ae=n.get(_[rt]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,je.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+rt,i.TEXTURE_2D,Ae,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,je.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.resolveDepthBuffer===!1&&c){const _=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function k(R){return Math.min(a.maxSamples,R.samples)}function _t(R){const _=n.get(R);return R.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function Ve(R){const _=r.render.frame;h.get(R)!==_&&(h.set(R,_),R.update())}function yt(R,_){const j=R.colorSpace,ge=R.format,ye=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||j!==Fa&&j!==Xi&&(Ut.getTransfer(j)===kt?(ge!==ti||ye!==Xn)&&vt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Nt("WebGLTextures: Unsupported texture color space:",j)),_}function Ke(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(u.width=R.naturalWidth||R.width,u.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(u.width=R.displayWidth,u.height=R.displayHeight):(u.width=R.width,u.height=R.height),u}this.allocateTextureUnit=ae,this.resetTextureUnits=ie,this.setTexture2D=te,this.setTexture2DArray=F,this.setTexture3D=O,this.setTextureCube=he,this.rebindTextures=It,this.setupRenderTarget=se,this.updateRenderTargetMipmap=q,this.updateMultisampleRenderTarget=et,this.setupDepthRenderbuffer=Ye,this.setupFrameBufferTexture=Le,this.useMultisampledRTT=_t,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function _y(i,e){function t(n,a=Xi){let s;const r=Ut.getTransfer(a);if(n===Xn)return i.UNSIGNED_BYTE;if(n===Vl)return i.UNSIGNED_SHORT_4_4_4_4;if(n===zl)return i.UNSIGNED_SHORT_5_5_5_1;if(n===cd)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===ud)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===od)return i.BYTE;if(n===ld)return i.SHORT;if(n===fs)return i.UNSIGNED_SHORT;if(n===kl)return i.INT;if(n===hi)return i.UNSIGNED_INT;if(n===li)return i.FLOAT;if(n===Pi)return i.HALF_FLOAT;if(n===dd)return i.ALPHA;if(n===fd)return i.RGB;if(n===ti)return i.RGBA;if(n===Di)return i.DEPTH_COMPONENT;if(n===oa)return i.DEPTH_STENCIL;if(n===hd)return i.RED;if(n===Gl)return i.RED_INTEGER;if(n===Na)return i.RG;if(n===Hl)return i.RG_INTEGER;if(n===Wl)return i.RGBA_INTEGER;if(n===sr||n===rr||n===or||n===lr)if(r===kt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===sr)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===rr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===or)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===lr)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===sr)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===rr)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===or)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===lr)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===el||n===tl||n===nl||n===il)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===el)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===tl)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===nl)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===il)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===al||n===sl||n===rl||n===ol||n===ll||n===cl||n===ul)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===al||n===sl)return r===kt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===rl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(n===ol)return s.COMPRESSED_R11_EAC;if(n===ll)return s.COMPRESSED_SIGNED_R11_EAC;if(n===cl)return s.COMPRESSED_RG11_EAC;if(n===ul)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===dl||n===fl||n===hl||n===pl||n===ml||n===gl||n===vl||n===_l||n===xl||n===yl||n===Sl||n===Ml||n===El||n===bl)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===dl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===fl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===hl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===pl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===ml)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===gl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===vl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===_l)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===xl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===yl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Sl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Ml)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===El)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===bl)return r===kt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Tl||n===wl||n===Al)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===Tl)return r===kt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===wl)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Al)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Cl||n===Rl||n===Pl||n===Dl)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===Cl)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Rl)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Pl)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Dl)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===hs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const xy=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,yy=`
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

}`;class Sy{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Md(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new mi({vertexShader:xy,fragmentShader:yy,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new pi(new vr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class My extends Va{constructor(e,t){super();const n=this;let a=null,s=1,r=null,l="local-floor",c=1,u=null,h=null,m=null,d=null,g=null,x=null;const w=typeof XRWebGLBinding<"u",v=new Sy,p={},T=t.getContextAttributes();let D=null,P=null;const G=[],U=[],K=new Gt;let y=null;const C=new $n;C.viewport=new Qt;const de=new $n;de.viewport=new Qt;const H=[C,de],ie=new Ug;let ae=null,oe=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(pe){let Pe=G[pe];return Pe===void 0&&(Pe=new vo,G[pe]=Pe),Pe.getTargetRaySpace()},this.getControllerGrip=function(pe){let Pe=G[pe];return Pe===void 0&&(Pe=new vo,G[pe]=Pe),Pe.getGripSpace()},this.getHand=function(pe){let Pe=G[pe];return Pe===void 0&&(Pe=new vo,G[pe]=Pe),Pe.getHandSpace()};function te(pe){const Pe=U.indexOf(pe.inputSource);if(Pe===-1)return;const Le=G[Pe];Le!==void 0&&(Le.update(pe.inputSource,pe.frame,u||r),Le.dispatchEvent({type:pe.type,data:pe.inputSource}))}function F(){a.removeEventListener("select",te),a.removeEventListener("selectstart",te),a.removeEventListener("selectend",te),a.removeEventListener("squeeze",te),a.removeEventListener("squeezestart",te),a.removeEventListener("squeezeend",te),a.removeEventListener("end",F),a.removeEventListener("inputsourceschange",O);for(let pe=0;pe<G.length;pe++){const Pe=U[pe];Pe!==null&&(U[pe]=null,G[pe].disconnect(Pe))}ae=null,oe=null,v.reset();for(const pe in p)delete p[pe];e.setRenderTarget(D),g=null,d=null,m=null,a=null,P=null,mt.stop(),n.isPresenting=!1,e.setPixelRatio(y),e.setSize(K.width,K.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(pe){s=pe,n.isPresenting===!0&&vt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(pe){l=pe,n.isPresenting===!0&&vt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return u||r},this.setReferenceSpace=function(pe){u=pe},this.getBaseLayer=function(){return d!==null?d:g},this.getBinding=function(){return m===null&&w&&(m=new XRWebGLBinding(a,t)),m},this.getFrame=function(){return x},this.getSession=function(){return a},this.setSession=async function(pe){if(a=pe,a!==null){if(D=e.getRenderTarget(),a.addEventListener("select",te),a.addEventListener("selectstart",te),a.addEventListener("selectend",te),a.addEventListener("squeeze",te),a.addEventListener("squeezestart",te),a.addEventListener("squeezeend",te),a.addEventListener("end",F),a.addEventListener("inputsourceschange",O),T.xrCompatible!==!0&&await t.makeXRCompatible(),y=e.getPixelRatio(),e.getSize(K),w&&"createProjectionLayer"in XRWebGLBinding.prototype){let Le=null,ut=null,xe=null;T.depth&&(xe=T.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Le=T.stencil?oa:Di,ut=T.stencil?hs:hi);const Ye={colorFormat:t.RGBA8,depthFormat:xe,scaleFactor:s};m=this.getBinding(),d=m.createProjectionLayer(Ye),a.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),P=new di(d.textureWidth,d.textureHeight,{format:ti,type:Xn,depthTexture:new gs(d.textureWidth,d.textureHeight,ut,void 0,void 0,void 0,void 0,void 0,void 0,Le),stencilBuffer:T.stencil,colorSpace:e.outputColorSpace,samples:T.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const Le={antialias:T.antialias,alpha:!0,depth:T.depth,stencil:T.stencil,framebufferScaleFactor:s};g=new XRWebGLLayer(a,t,Le),a.updateRenderState({baseLayer:g}),e.setPixelRatio(1),e.setSize(g.framebufferWidth,g.framebufferHeight,!1),P=new di(g.framebufferWidth,g.framebufferHeight,{format:ti,type:Xn,colorSpace:e.outputColorSpace,stencilBuffer:T.stencil,resolveDepthBuffer:g.ignoreDepthValues===!1,resolveStencilBuffer:g.ignoreDepthValues===!1})}P.isXRRenderTarget=!0,this.setFoveation(c),u=null,r=await a.requestReferenceSpace(l),mt.setContext(a),mt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return v.getDepthTexture()};function O(pe){for(let Pe=0;Pe<pe.removed.length;Pe++){const Le=pe.removed[Pe],ut=U.indexOf(Le);ut>=0&&(U[ut]=null,G[ut].disconnect(Le))}for(let Pe=0;Pe<pe.added.length;Pe++){const Le=pe.added[Pe];let ut=U.indexOf(Le);if(ut===-1){for(let Ye=0;Ye<G.length;Ye++)if(Ye>=U.length){U.push(Le),ut=Ye;break}else if(U[Ye]===null){U[Ye]=Le,ut=Ye;break}if(ut===-1)break}const xe=G[ut];xe&&xe.connect(Le)}}const he=new ce,V=new ce;function $(pe,Pe,Le){he.setFromMatrixPosition(Pe.matrixWorld),V.setFromMatrixPosition(Le.matrixWorld);const ut=he.distanceTo(V),xe=Pe.projectionMatrix.elements,Ye=Le.projectionMatrix.elements,It=xe[14]/(xe[10]-1),se=xe[14]/(xe[10]+1),q=(xe[9]+1)/xe[5],Te=(xe[9]-1)/xe[5],We=(xe[8]-1)/xe[0],et=(Ye[8]+1)/Ye[0],k=It*We,_t=It*et,Ve=ut/(-We+et),yt=Ve*-We;if(Pe.matrixWorld.decompose(pe.position,pe.quaternion,pe.scale),pe.translateX(yt),pe.translateZ(Ve),pe.matrixWorld.compose(pe.position,pe.quaternion,pe.scale),pe.matrixWorldInverse.copy(pe.matrixWorld).invert(),xe[10]===-1)pe.projectionMatrix.copy(Pe.projectionMatrix),pe.projectionMatrixInverse.copy(Pe.projectionMatrixInverse);else{const Ke=It+Ve,R=se+Ve,_=k-yt,j=_t+(ut-yt),ge=q*se/R*Ke,ye=Te*se/R*Ke;pe.projectionMatrix.makePerspective(_,j,ge,ye,Ke,R),pe.projectionMatrixInverse.copy(pe.projectionMatrix).invert()}}function Me(pe,Pe){Pe===null?pe.matrixWorld.copy(pe.matrix):pe.matrixWorld.multiplyMatrices(Pe.matrixWorld,pe.matrix),pe.matrixWorldInverse.copy(pe.matrixWorld).invert()}this.updateCamera=function(pe){if(a===null)return;let Pe=pe.near,Le=pe.far;v.texture!==null&&(v.depthNear>0&&(Pe=v.depthNear),v.depthFar>0&&(Le=v.depthFar)),ie.near=de.near=C.near=Pe,ie.far=de.far=C.far=Le,(ae!==ie.near||oe!==ie.far)&&(a.updateRenderState({depthNear:ie.near,depthFar:ie.far}),ae=ie.near,oe=ie.far),ie.layers.mask=pe.layers.mask|6,C.layers.mask=ie.layers.mask&-5,de.layers.mask=ie.layers.mask&-3;const ut=pe.parent,xe=ie.cameras;Me(ie,ut);for(let Ye=0;Ye<xe.length;Ye++)Me(xe[Ye],ut);xe.length===2?$(ie,C,de):ie.projectionMatrix.copy(C.projectionMatrix),_e(pe,ie,ut)};function _e(pe,Pe,Le){Le===null?pe.matrix.copy(Pe.matrixWorld):(pe.matrix.copy(Le.matrixWorld),pe.matrix.invert(),pe.matrix.multiply(Pe.matrixWorld)),pe.matrix.decompose(pe.position,pe.quaternion,pe.scale),pe.updateMatrixWorld(!0),pe.projectionMatrix.copy(Pe.projectionMatrix),pe.projectionMatrixInverse.copy(Pe.projectionMatrixInverse),pe.isPerspectiveCamera&&(pe.fov=ms*2*Math.atan(1/pe.projectionMatrix.elements[5]),pe.zoom=1)}this.getCamera=function(){return ie},this.getFoveation=function(){if(!(d===null&&g===null))return c},this.setFoveation=function(pe){c=pe,d!==null&&(d.fixedFoveation=pe),g!==null&&g.fixedFoveation!==void 0&&(g.fixedFoveation=pe)},this.hasDepthSensing=function(){return v.texture!==null},this.getDepthSensingMesh=function(){return v.getMesh(ie)},this.getCameraTexture=function(pe){return p[pe]};let Ie=null;function ke(pe,Pe){if(h=Pe.getViewerPose(u||r),x=Pe,h!==null){const Le=h.views;g!==null&&(e.setRenderTargetFramebuffer(P,g.framebuffer),e.setRenderTarget(P));let ut=!1;Le.length!==ie.cameras.length&&(ie.cameras.length=0,ut=!0);for(let se=0;se<Le.length;se++){const q=Le[se];let Te=null;if(g!==null)Te=g.getViewport(q);else{const et=m.getViewSubImage(d,q);Te=et.viewport,se===0&&(e.setRenderTargetTextures(P,et.colorTexture,et.depthStencilTexture),e.setRenderTarget(P))}let We=H[se];We===void 0&&(We=new $n,We.layers.enable(se),We.viewport=new Qt,H[se]=We),We.matrix.fromArray(q.transform.matrix),We.matrix.decompose(We.position,We.quaternion,We.scale),We.projectionMatrix.fromArray(q.projectionMatrix),We.projectionMatrixInverse.copy(We.projectionMatrix).invert(),We.viewport.set(Te.x,Te.y,Te.width,Te.height),se===0&&(ie.matrix.copy(We.matrix),ie.matrix.decompose(ie.position,ie.quaternion,ie.scale)),ut===!0&&ie.cameras.push(We)}const xe=a.enabledFeatures;if(xe&&xe.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&w){m=n.getBinding();const se=m.getDepthInformation(Le[0]);se&&se.isValid&&se.texture&&v.init(se,a.renderState)}if(xe&&xe.includes("camera-access")&&w){e.state.unbindTexture(),m=n.getBinding();for(let se=0;se<Le.length;se++){const q=Le[se].camera;if(q){let Te=p[q];Te||(Te=new Md,p[q]=Te);const We=m.getCameraImage(q);Te.sourceTexture=We}}}}for(let Le=0;Le<G.length;Le++){const ut=U[Le],xe=G[Le];ut!==null&&xe!==void 0&&xe.update(ut,Pe,u||r)}Ie&&Ie(pe,Pe),Pe.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Pe}),x=null}const mt=new wd;mt.setAnimationLoop(ke),this.setAnimationLoop=function(pe){Ie=pe},this.dispose=function(){}}}const na=new Ii,Ey=new an;function by(i,e){function t(v,p){v.matrixAutoUpdate===!0&&v.updateMatrix(),p.value.copy(v.matrix)}function n(v,p){p.color.getRGB(v.fogColor.value,Ed(i)),p.isFog?(v.fogNear.value=p.near,v.fogFar.value=p.far):p.isFogExp2&&(v.fogDensity.value=p.density)}function a(v,p,T,D,P){p.isMeshBasicMaterial?s(v,p):p.isMeshLambertMaterial?(s(v,p),p.envMap&&(v.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(s(v,p),m(v,p)):p.isMeshPhongMaterial?(s(v,p),h(v,p),p.envMap&&(v.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(s(v,p),d(v,p),p.isMeshPhysicalMaterial&&g(v,p,P)):p.isMeshMatcapMaterial?(s(v,p),x(v,p)):p.isMeshDepthMaterial?s(v,p):p.isMeshDistanceMaterial?(s(v,p),w(v,p)):p.isMeshNormalMaterial?s(v,p):p.isLineBasicMaterial?(r(v,p),p.isLineDashedMaterial&&l(v,p)):p.isPointsMaterial?c(v,p,T,D):p.isSpriteMaterial?u(v,p):p.isShadowMaterial?(v.color.value.copy(p.color),v.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(v,p){v.opacity.value=p.opacity,p.color&&v.diffuse.value.copy(p.color),p.emissive&&v.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(v.map.value=p.map,t(p.map,v.mapTransform)),p.alphaMap&&(v.alphaMap.value=p.alphaMap,t(p.alphaMap,v.alphaMapTransform)),p.bumpMap&&(v.bumpMap.value=p.bumpMap,t(p.bumpMap,v.bumpMapTransform),v.bumpScale.value=p.bumpScale,p.side===Pn&&(v.bumpScale.value*=-1)),p.normalMap&&(v.normalMap.value=p.normalMap,t(p.normalMap,v.normalMapTransform),v.normalScale.value.copy(p.normalScale),p.side===Pn&&v.normalScale.value.negate()),p.displacementMap&&(v.displacementMap.value=p.displacementMap,t(p.displacementMap,v.displacementMapTransform),v.displacementScale.value=p.displacementScale,v.displacementBias.value=p.displacementBias),p.emissiveMap&&(v.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,v.emissiveMapTransform)),p.specularMap&&(v.specularMap.value=p.specularMap,t(p.specularMap,v.specularMapTransform)),p.alphaTest>0&&(v.alphaTest.value=p.alphaTest);const T=e.get(p),D=T.envMap,P=T.envMapRotation;D&&(v.envMap.value=D,na.copy(P),na.x*=-1,na.y*=-1,na.z*=-1,D.isCubeTexture&&D.isRenderTargetTexture===!1&&(na.y*=-1,na.z*=-1),v.envMapRotation.value.setFromMatrix4(Ey.makeRotationFromEuler(na)),v.flipEnvMap.value=D.isCubeTexture&&D.isRenderTargetTexture===!1?-1:1,v.reflectivity.value=p.reflectivity,v.ior.value=p.ior,v.refractionRatio.value=p.refractionRatio),p.lightMap&&(v.lightMap.value=p.lightMap,v.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,v.lightMapTransform)),p.aoMap&&(v.aoMap.value=p.aoMap,v.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,v.aoMapTransform))}function r(v,p){v.diffuse.value.copy(p.color),v.opacity.value=p.opacity,p.map&&(v.map.value=p.map,t(p.map,v.mapTransform))}function l(v,p){v.dashSize.value=p.dashSize,v.totalSize.value=p.dashSize+p.gapSize,v.scale.value=p.scale}function c(v,p,T,D){v.diffuse.value.copy(p.color),v.opacity.value=p.opacity,v.size.value=p.size*T,v.scale.value=D*.5,p.map&&(v.map.value=p.map,t(p.map,v.uvTransform)),p.alphaMap&&(v.alphaMap.value=p.alphaMap,t(p.alphaMap,v.alphaMapTransform)),p.alphaTest>0&&(v.alphaTest.value=p.alphaTest)}function u(v,p){v.diffuse.value.copy(p.color),v.opacity.value=p.opacity,v.rotation.value=p.rotation,p.map&&(v.map.value=p.map,t(p.map,v.mapTransform)),p.alphaMap&&(v.alphaMap.value=p.alphaMap,t(p.alphaMap,v.alphaMapTransform)),p.alphaTest>0&&(v.alphaTest.value=p.alphaTest)}function h(v,p){v.specular.value.copy(p.specular),v.shininess.value=Math.max(p.shininess,1e-4)}function m(v,p){p.gradientMap&&(v.gradientMap.value=p.gradientMap)}function d(v,p){v.metalness.value=p.metalness,p.metalnessMap&&(v.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,v.metalnessMapTransform)),v.roughness.value=p.roughness,p.roughnessMap&&(v.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,v.roughnessMapTransform)),p.envMap&&(v.envMapIntensity.value=p.envMapIntensity)}function g(v,p,T){v.ior.value=p.ior,p.sheen>0&&(v.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),v.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(v.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,v.sheenColorMapTransform)),p.sheenRoughnessMap&&(v.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,v.sheenRoughnessMapTransform))),p.clearcoat>0&&(v.clearcoat.value=p.clearcoat,v.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(v.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,v.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(v.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,v.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(v.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,v.clearcoatNormalMapTransform),v.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Pn&&v.clearcoatNormalScale.value.negate())),p.dispersion>0&&(v.dispersion.value=p.dispersion),p.iridescence>0&&(v.iridescence.value=p.iridescence,v.iridescenceIOR.value=p.iridescenceIOR,v.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],v.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(v.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,v.iridescenceMapTransform)),p.iridescenceThicknessMap&&(v.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,v.iridescenceThicknessMapTransform))),p.transmission>0&&(v.transmission.value=p.transmission,v.transmissionSamplerMap.value=T.texture,v.transmissionSamplerSize.value.set(T.width,T.height),p.transmissionMap&&(v.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,v.transmissionMapTransform)),v.thickness.value=p.thickness,p.thicknessMap&&(v.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,v.thicknessMapTransform)),v.attenuationDistance.value=p.attenuationDistance,v.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(v.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(v.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,v.anisotropyMapTransform))),v.specularIntensity.value=p.specularIntensity,v.specularColor.value.copy(p.specularColor),p.specularColorMap&&(v.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,v.specularColorMapTransform)),p.specularIntensityMap&&(v.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,v.specularIntensityMapTransform))}function x(v,p){p.matcap&&(v.matcap.value=p.matcap)}function w(v,p){const T=e.get(p).light;v.referencePosition.value.setFromMatrixPosition(T.matrixWorld),v.nearDistance.value=T.shadow.camera.near,v.farDistance.value=T.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:a}}function Ty(i,e,t,n){let a={},s={},r=[];const l=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(T,D){const P=D.program;n.uniformBlockBinding(T,P)}function u(T,D){let P=a[T.id];P===void 0&&(x(T),P=h(T),a[T.id]=P,T.addEventListener("dispose",v));const G=D.program;n.updateUBOMapping(T,G);const U=e.render.frame;s[T.id]!==U&&(d(T),s[T.id]=U)}function h(T){const D=m();T.__bindingPointIndex=D;const P=i.createBuffer(),G=T.__size,U=T.usage;return i.bindBuffer(i.UNIFORM_BUFFER,P),i.bufferData(i.UNIFORM_BUFFER,G,U),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,D,P),P}function m(){for(let T=0;T<l;T++)if(r.indexOf(T)===-1)return r.push(T),T;return Nt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(T){const D=a[T.id],P=T.uniforms,G=T.__cache;i.bindBuffer(i.UNIFORM_BUFFER,D);for(let U=0,K=P.length;U<K;U++){const y=Array.isArray(P[U])?P[U]:[P[U]];for(let C=0,de=y.length;C<de;C++){const H=y[C];if(g(H,U,C,G)===!0){const ie=H.__offset,ae=Array.isArray(H.value)?H.value:[H.value];let oe=0;for(let te=0;te<ae.length;te++){const F=ae[te],O=w(F);typeof F=="number"||typeof F=="boolean"?(H.__data[0]=F,i.bufferSubData(i.UNIFORM_BUFFER,ie+oe,H.__data)):F.isMatrix3?(H.__data[0]=F.elements[0],H.__data[1]=F.elements[1],H.__data[2]=F.elements[2],H.__data[3]=0,H.__data[4]=F.elements[3],H.__data[5]=F.elements[4],H.__data[6]=F.elements[5],H.__data[7]=0,H.__data[8]=F.elements[6],H.__data[9]=F.elements[7],H.__data[10]=F.elements[8],H.__data[11]=0):(F.toArray(H.__data,oe),oe+=O.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,ie,H.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function g(T,D,P,G){const U=T.value,K=D+"_"+P;if(G[K]===void 0)return typeof U=="number"||typeof U=="boolean"?G[K]=U:G[K]=U.clone(),!0;{const y=G[K];if(typeof U=="number"||typeof U=="boolean"){if(y!==U)return G[K]=U,!0}else if(y.equals(U)===!1)return y.copy(U),!0}return!1}function x(T){const D=T.uniforms;let P=0;const G=16;for(let K=0,y=D.length;K<y;K++){const C=Array.isArray(D[K])?D[K]:[D[K]];for(let de=0,H=C.length;de<H;de++){const ie=C[de],ae=Array.isArray(ie.value)?ie.value:[ie.value];for(let oe=0,te=ae.length;oe<te;oe++){const F=ae[oe],O=w(F),he=P%G,V=he%O.boundary,$=he+V;P+=V,$!==0&&G-$<O.storage&&(P+=G-$),ie.__data=new Float32Array(O.storage/Float32Array.BYTES_PER_ELEMENT),ie.__offset=P,P+=O.storage}}}const U=P%G;return U>0&&(P+=G-U),T.__size=P,T.__cache={},this}function w(T){const D={boundary:0,storage:0};return typeof T=="number"||typeof T=="boolean"?(D.boundary=4,D.storage=4):T.isVector2?(D.boundary=8,D.storage=8):T.isVector3||T.isColor?(D.boundary=16,D.storage=12):T.isVector4?(D.boundary=16,D.storage=16):T.isMatrix3?(D.boundary=48,D.storage=48):T.isMatrix4?(D.boundary=64,D.storage=64):T.isTexture?vt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):vt("WebGLRenderer: Unsupported uniform value type.",T),D}function v(T){const D=T.target;D.removeEventListener("dispose",v);const P=r.indexOf(D.__bindingPointIndex);r.splice(P,1),i.deleteBuffer(a[D.id]),delete a[D.id],delete s[D.id]}function p(){for(const T in a)i.deleteBuffer(a[T]);r=[],a={},s={}}return{bind:c,update:u,dispose:p}}const wy=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let si=null;function Ay(){return si===null&&(si=new vg(wy,16,16,Na,Pi),si.name="DFG_LUT",si.minFilter=Sn,si.magFilter=Sn,si.wrapS=Ai,si.wrapT=Ai,si.generateMipmaps=!1,si.needsUpdate=!0),si}class Cy{constructor(e={}){const{canvas:t=Im(),context:n=null,depth:a=!0,stencil:s=!1,alpha:r=!1,antialias:l=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:u=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:m=!1,reversedDepthBuffer:d=!1,outputBufferType:g=Xn}=e;this.isWebGLRenderer=!0;let x;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");x=n.getContextAttributes().alpha}else x=r;const w=g,v=new Set([Wl,Hl,Gl]),p=new Set([Xn,hi,fs,hs,Vl,zl]),T=new Uint32Array(4),D=new Int32Array(4);let P=null,G=null;const U=[],K=[];let y=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ui,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const C=this;let de=!1;this._outputColorSpace=On;let H=0,ie=0,ae=null,oe=-1,te=null;const F=new Qt,O=new Qt;let he=null;const V=new zt(0);let $=0,Me=t.width,_e=t.height,Ie=1,ke=null,mt=null;const pe=new Qt(0,0,Me,_e),Pe=new Qt(0,0,Me,_e);let Le=!1;const ut=new yd;let xe=!1,Ye=!1;const It=new an,se=new ce,q=new Qt,Te={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let We=!1;function et(){return ae===null?Ie:1}let k=n;function _t(E,J){return t.getContext(E,J)}try{const E={alpha:!0,depth:a,stencil:s,antialias:l,premultipliedAlpha:c,preserveDrawingBuffer:u,powerPreference:h,failIfMajorPerformanceCaveat:m};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Bl}`),t.addEventListener("webglcontextlost",ue,!1),t.addEventListener("webglcontextrestored",Ce,!1),t.addEventListener("webglcontextcreationerror",st,!1),k===null){const J="webgl2";if(k=_t(J,E),k===null)throw _t(J)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw Nt("WebGLRenderer: "+E.message),E}let Ve,yt,Ke,R,_,j,ge,ye,fe,je,Oe,Qe,rt,Ae,Re,qe,tt,Ge,ct,Z,Se,Ue,N;function I(){Ve=new C0(k),Ve.init(),Se=new _y(k,Ve),yt=new y0(k,Ve,e,Se),Ke=new gy(k,Ve),yt.reversedDepthBuffer&&d&&Ke.buffers.depth.setReversed(!0),R=new D0(k),_=new ny,j=new vy(k,Ve,Ke,_,yt,Se,R),ge=new A0(C),ye=new Fg(k),Ue=new _0(k,ye),fe=new R0(k,ye,R,Ue),je=new L0(k,fe,ye,Ue,R),Ge=new I0(k,yt,j),Re=new S0(_),Oe=new ty(C,ge,Ve,yt,Ue,Re),Qe=new by(C,_),rt=new ay,Ae=new uy(Ve),tt=new v0(C,ge,Ke,je,x,c),qe=new my(C,je,yt),N=new Ty(k,R,yt,Ke),ct=new x0(k,Ve,R),Z=new P0(k,Ve,R),R.programs=Oe.programs,C.capabilities=yt,C.extensions=Ve,C.properties=_,C.renderLists=rt,C.shadowMap=qe,C.state=Ke,C.info=R}I(),w!==Xn&&(y=new N0(w,t.width,t.height,a,s));const Y=new My(C,k);this.xr=Y,this.getContext=function(){return k},this.getContextAttributes=function(){return k.getContextAttributes()},this.forceContextLoss=function(){const E=Ve.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=Ve.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return Ie},this.setPixelRatio=function(E){E!==void 0&&(Ie=E,this.setSize(Me,_e,!1))},this.getSize=function(E){return E.set(Me,_e)},this.setSize=function(E,J,le=!0){if(Y.isPresenting){vt("WebGLRenderer: Can't change size while VR device is presenting.");return}Me=E,_e=J,t.width=Math.floor(E*Ie),t.height=Math.floor(J*Ie),le===!0&&(t.style.width=E+"px",t.style.height=J+"px"),y!==null&&y.setSize(t.width,t.height),this.setViewport(0,0,E,J)},this.getDrawingBufferSize=function(E){return E.set(Me*Ie,_e*Ie).floor()},this.setDrawingBufferSize=function(E,J,le){Me=E,_e=J,Ie=le,t.width=Math.floor(E*le),t.height=Math.floor(J*le),this.setViewport(0,0,E,J)},this.setEffects=function(E){if(w===Xn){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(E){for(let J=0;J<E.length;J++)if(E[J].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}y.setEffects(E||[])},this.getCurrentViewport=function(E){return E.copy(F)},this.getViewport=function(E){return E.copy(pe)},this.setViewport=function(E,J,le,ee){E.isVector4?pe.set(E.x,E.y,E.z,E.w):pe.set(E,J,le,ee),Ke.viewport(F.copy(pe).multiplyScalar(Ie).round())},this.getScissor=function(E){return E.copy(Pe)},this.setScissor=function(E,J,le,ee){E.isVector4?Pe.set(E.x,E.y,E.z,E.w):Pe.set(E,J,le,ee),Ke.scissor(O.copy(Pe).multiplyScalar(Ie).round())},this.getScissorTest=function(){return Le},this.setScissorTest=function(E){Ke.setScissorTest(Le=E)},this.setOpaqueSort=function(E){ke=E},this.setTransparentSort=function(E){mt=E},this.getClearColor=function(E){return E.copy(tt.getClearColor())},this.setClearColor=function(){tt.setClearColor(...arguments)},this.getClearAlpha=function(){return tt.getClearAlpha()},this.setClearAlpha=function(){tt.setClearAlpha(...arguments)},this.clear=function(E=!0,J=!0,le=!0){let ee=0;if(E){let ne=!1;if(ae!==null){const ze=ae.texture.format;ne=v.has(ze)}if(ne){const ze=ae.texture.type,$e=p.has(ze),Be=tt.getClearColor(),nt=tt.getClearAlpha(),He=Be.r,ht=Be.g,gt=Be.b;$e?(T[0]=He,T[1]=ht,T[2]=gt,T[3]=nt,k.clearBufferuiv(k.COLOR,0,T)):(D[0]=He,D[1]=ht,D[2]=gt,D[3]=nt,k.clearBufferiv(k.COLOR,0,D))}else ee|=k.COLOR_BUFFER_BIT}J&&(ee|=k.DEPTH_BUFFER_BIT),le&&(ee|=k.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),ee!==0&&k.clear(ee)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ue,!1),t.removeEventListener("webglcontextrestored",Ce,!1),t.removeEventListener("webglcontextcreationerror",st,!1),tt.dispose(),rt.dispose(),Ae.dispose(),_.dispose(),ge.dispose(),je.dispose(),Ue.dispose(),N.dispose(),Oe.dispose(),Y.dispose(),Y.removeEventListener("sessionstart",hn),Y.removeEventListener("sessionend",cn),un.stop()};function ue(E){E.preventDefault(),qc("WebGLRenderer: Context Lost."),de=!0}function Ce(){qc("WebGLRenderer: Context Restored."),de=!1;const E=R.autoReset,J=qe.enabled,le=qe.autoUpdate,ee=qe.needsUpdate,ne=qe.type;I(),R.autoReset=E,qe.enabled=J,qe.autoUpdate=le,qe.needsUpdate=ee,qe.type=ne}function st(E){Nt("WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function De(E){const J=E.target;J.removeEventListener("dispose",De),Ht(J)}function Ht(E){Vt(E),_.remove(E)}function Vt(E){const J=_.get(E).programs;J!==void 0&&(J.forEach(function(le){Oe.releaseProgram(le)}),E.isShaderMaterial&&Oe.releaseShaderCache(E))}this.renderBufferDirect=function(E,J,le,ee,ne,ze){J===null&&(J=Te);const $e=ne.isMesh&&ne.matrixWorld.determinant()<0,Be=yr(E,J,le,ee,ne);Ke.setMaterial(ee,$e);let nt=le.index,He=1;if(ee.wireframe===!0){if(nt=fe.getWireframeAttribute(le),nt===void 0)return;He=2}const ht=le.drawRange,gt=le.attributes.position;let it=ht.start*He,Lt=(ht.start+ht.count)*He;ze!==null&&(it=Math.max(it,ze.start*He),Lt=Math.min(Lt,(ze.start+ze.count)*He)),nt!==null?(it=Math.max(it,0),Lt=Math.min(Lt,nt.count)):gt!=null&&(it=Math.max(it,0),Lt=Math.min(Lt,gt.count));const Wt=Lt-it;if(Wt<0||Wt===1/0)return;Ue.setup(ne,ee,Be,le,nt);let Ft,At=ct;if(nt!==null&&(Ft=ye.get(nt),At=Z,At.setIndex(Ft)),ne.isMesh)ee.wireframe===!0?(Ke.setLineWidth(ee.wireframeLinewidth*et()),At.setMode(k.LINES)):At.setMode(k.TRIANGLES);else if(ne.isLine){let en=ee.linewidth;en===void 0&&(en=1),Ke.setLineWidth(en*et()),ne.isLineSegments?At.setMode(k.LINES):ne.isLineLoop?At.setMode(k.LINE_LOOP):At.setMode(k.LINE_STRIP)}else ne.isPoints?At.setMode(k.POINTS):ne.isSprite&&At.setMode(k.TRIANGLES);if(ne.isBatchedMesh)if(ne._multiDrawInstances!==null)hr("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),At.renderMultiDrawInstances(ne._multiDrawStarts,ne._multiDrawCounts,ne._multiDrawCount,ne._multiDrawInstances);else if(Ve.get("WEBGL_multi_draw"))At.renderMultiDraw(ne._multiDrawStarts,ne._multiDrawCounts,ne._multiDrawCount);else{const en=ne._multiDrawStarts,at=ne._multiDrawCounts,pn=ne._multiDrawCount,Et=nt?ye.get(nt).bytesPerElement:1,An=_.get(ee).currentProgram.getUniforms();for(let Vn=0;Vn<pn;Vn++)An.setValue(k,"_gl_DrawID",Vn),At.render(en[Vn]/Et,at[Vn])}else if(ne.isInstancedMesh)At.renderInstances(it,Wt,ne.count);else if(le.isInstancedBufferGeometry){const en=le._maxInstanceCount!==void 0?le._maxInstanceCount:1/0,at=Math.min(le.instanceCount,en);At.renderInstances(it,Wt,at)}else At.render(it,Wt)};function kn(E,J,le){E.transparent===!0&&E.side===wi&&E.forceSinglePass===!1?(E.side=Pn,E.needsUpdate=!0,Ni(E,J,le),E.side=Yi,E.needsUpdate=!0,Ni(E,J,le),E.side=wi):Ni(E,J,le)}this.compile=function(E,J,le=null){le===null&&(le=E),G=Ae.get(le),G.init(J),K.push(G),le.traverseVisible(function(ne){ne.isLight&&ne.layers.test(J.layers)&&(G.pushLight(ne),ne.castShadow&&G.pushShadow(ne))}),E!==le&&E.traverseVisible(function(ne){ne.isLight&&ne.layers.test(J.layers)&&(G.pushLight(ne),ne.castShadow&&G.pushShadow(ne))}),G.setupLights();const ee=new Set;return E.traverse(function(ne){if(!(ne.isMesh||ne.isPoints||ne.isLine||ne.isSprite))return;const ze=ne.material;if(ze)if(Array.isArray(ze))for(let $e=0;$e<ze.length;$e++){const Be=ze[$e];kn(Be,le,ne),ee.add(Be)}else kn(ze,le,ne),ee.add(ze)}),G=K.pop(),ee},this.compileAsync=function(E,J,le=null){const ee=this.compile(E,J,le);return new Promise(ne=>{function ze(){if(ee.forEach(function($e){_.get($e).currentProgram.isReady()&&ee.delete($e)}),ee.size===0){ne(E);return}setTimeout(ze,10)}Ve.get("KHR_parallel_shader_compile")!==null?ze():setTimeout(ze,10)})};let wt=null;function Yt(E){wt&&wt(E)}function hn(){un.stop()}function cn(){un.start()}const un=new wd;un.setAnimationLoop(Yt),typeof self<"u"&&un.setContext(self),this.setAnimationLoop=function(E){wt=E,Y.setAnimationLoop(E),E===null?un.stop():un.start()},Y.addEventListener("sessionstart",hn),Y.addEventListener("sessionend",cn),this.render=function(E,J){if(J!==void 0&&J.isCamera!==!0){Nt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(de===!0)return;const le=Y.enabled===!0&&Y.isPresenting===!0,ee=y!==null&&(ae===null||le)&&y.begin(C,ae);if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),J.parent===null&&J.matrixWorldAutoUpdate===!0&&J.updateMatrixWorld(),Y.enabled===!0&&Y.isPresenting===!0&&(y===null||y.isCompositing()===!1)&&(Y.cameraAutoUpdate===!0&&Y.updateCamera(J),J=Y.getCamera()),E.isScene===!0&&E.onBeforeRender(C,E,J,ae),G=Ae.get(E,K.length),G.init(J),K.push(G),It.multiplyMatrices(J.projectionMatrix,J.matrixWorldInverse),ut.setFromProjectionMatrix(It,ci,J.reversedDepth),Ye=this.localClippingEnabled,xe=Re.init(this.clippingPlanes,Ye),P=rt.get(E,U.length),P.init(),U.push(P),Y.enabled===!0&&Y.isPresenting===!0){const $e=C.xr.getDepthSensingMesh();$e!==null&&dn($e,J,-1/0,C.sortObjects)}dn(E,J,0,C.sortObjects),P.finish(),C.sortObjects===!0&&P.sort(ke,mt),We=Y.enabled===!1||Y.isPresenting===!1||Y.hasDepthSensing()===!1,We&&tt.addToRenderList(P,E),this.info.render.frame++,xe===!0&&Re.beginShadows();const ne=G.state.shadowsArray;if(qe.render(ne,E,J),xe===!0&&Re.endShadows(),this.info.autoReset===!0&&this.info.reset(),(ee&&y.hasRenderPass())===!1){const $e=P.opaque,Be=P.transmissive;if(G.setupLights(),J.isArrayCamera){const nt=J.cameras;if(Be.length>0)for(let He=0,ht=nt.length;He<ht;He++){const gt=nt[He];En($e,Be,E,gt)}We&&tt.render(E);for(let He=0,ht=nt.length;He<ht;He++){const gt=nt[He];qt(P,E,gt,gt.viewport)}}else Be.length>0&&En($e,Be,E,J),We&&tt.render(E),qt(P,E,J)}ae!==null&&ie===0&&(j.updateMultisampleRenderTarget(ae),j.updateRenderTargetMipmap(ae)),ee&&y.end(C),E.isScene===!0&&E.onAfterRender(C,E,J),Ue.resetDefaultState(),oe=-1,te=null,K.pop(),K.length>0?(G=K[K.length-1],xe===!0&&Re.setGlobalState(C.clippingPlanes,G.state.camera)):G=null,U.pop(),U.length>0?P=U[U.length-1]:P=null};function dn(E,J,le,ee){if(E.visible===!1)return;if(E.layers.test(J.layers)){if(E.isGroup)le=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(J);else if(E.isLight)G.pushLight(E),E.castShadow&&G.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||ut.intersectsSprite(E)){ee&&q.setFromMatrixPosition(E.matrixWorld).applyMatrix4(It);const $e=je.update(E),Be=E.material;Be.visible&&P.push(E,$e,Be,le,q.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||ut.intersectsObject(E))){const $e=je.update(E),Be=E.material;if(ee&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),q.copy(E.boundingSphere.center)):($e.boundingSphere===null&&$e.computeBoundingSphere(),q.copy($e.boundingSphere.center)),q.applyMatrix4(E.matrixWorld).applyMatrix4(It)),Array.isArray(Be)){const nt=$e.groups;for(let He=0,ht=nt.length;He<ht;He++){const gt=nt[He],it=Be[gt.materialIndex];it&&it.visible&&P.push(E,$e,it,le,q.z,gt)}}else Be.visible&&P.push(E,$e,Be,le,q.z,null)}}const ze=E.children;for(let $e=0,Be=ze.length;$e<Be;$e++)dn(ze[$e],J,le,ee)}function qt(E,J,le,ee){const{opaque:ne,transmissive:ze,transparent:$e}=E;G.setupLightsView(le),xe===!0&&Re.setGlobalState(C.clippingPlanes,le),ee&&Ke.viewport(F.copy(ee)),ne.length>0&&Li(ne,J,le),ze.length>0&&Li(ze,J,le),$e.length>0&&Li($e,J,le),Ke.buffers.depth.setTest(!0),Ke.buffers.depth.setMask(!0),Ke.buffers.color.setMask(!0),Ke.setPolygonOffset(!1)}function En(E,J,le,ee){if((le.isScene===!0?le.overrideMaterial:null)!==null)return;if(G.state.transmissionRenderTarget[ee.id]===void 0){const it=Ve.has("EXT_color_buffer_half_float")||Ve.has("EXT_color_buffer_float");G.state.transmissionRenderTarget[ee.id]=new di(1,1,{generateMipmaps:!0,type:it?Pi:Xn,minFilter:ra,samples:Math.max(4,yt.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ut.workingColorSpace})}const ze=G.state.transmissionRenderTarget[ee.id],$e=ee.viewport||F;ze.setSize($e.z*C.transmissionResolutionScale,$e.w*C.transmissionResolutionScale);const Be=C.getRenderTarget(),nt=C.getActiveCubeFace(),He=C.getActiveMipmapLevel();C.setRenderTarget(ze),C.getClearColor(V),$=C.getClearAlpha(),$<1&&C.setClearColor(16777215,.5),C.clear(),We&&tt.render(le);const ht=C.toneMapping;C.toneMapping=ui;const gt=ee.viewport;if(ee.viewport!==void 0&&(ee.viewport=void 0),G.setupLightsView(ee),xe===!0&&Re.setGlobalState(C.clippingPlanes,ee),Li(E,le,ee),j.updateMultisampleRenderTarget(ze),j.updateRenderTargetMipmap(ze),Ve.has("WEBGL_multisampled_render_to_texture")===!1){let it=!1;for(let Lt=0,Wt=J.length;Lt<Wt;Lt++){const Ft=J[Lt],{object:At,geometry:en,material:at,group:pn}=Ft;if(at.side===wi&&At.layers.test(ee.layers)){const Et=at.side;at.side=Pn,at.needsUpdate=!0,Ui(At,le,ee,en,at,pn),at.side=Et,at.needsUpdate=!0,it=!0}}it===!0&&(j.updateMultisampleRenderTarget(ze),j.updateRenderTargetMipmap(ze))}C.setRenderTarget(Be,nt,He),C.setClearColor(V,$),gt!==void 0&&(ee.viewport=gt),C.toneMapping=ht}function Li(E,J,le){const ee=J.isScene===!0?J.overrideMaterial:null;for(let ne=0,ze=E.length;ne<ze;ne++){const $e=E[ne],{object:Be,geometry:nt,group:He}=$e;let ht=$e.material;ht.allowOverride===!0&&ee!==null&&(ht=ee),Be.layers.test(le.layers)&&Ui(Be,J,le,nt,ht,He)}}function Ui(E,J,le,ee,ne,ze){E.onBeforeRender(C,J,le,ee,ne,ze),E.modelViewMatrix.multiplyMatrices(le.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),ne.onBeforeRender(C,J,le,ee,E,ze),ne.transparent===!0&&ne.side===wi&&ne.forceSinglePass===!1?(ne.side=Pn,ne.needsUpdate=!0,C.renderBufferDirect(le,J,ee,ne,E,ze),ne.side=Yi,ne.needsUpdate=!0,C.renderBufferDirect(le,J,ee,ne,E,ze),ne.side=wi):C.renderBufferDirect(le,J,ee,ne,E,ze),E.onAfterRender(C,J,le,ee,ne,ze)}function Ni(E,J,le){J.isScene!==!0&&(J=Te);const ee=_.get(E),ne=G.state.lights,ze=G.state.shadowsArray,$e=ne.state.version,Be=Oe.getParameters(E,ne.state,ze,J,le),nt=Oe.getProgramCacheKey(Be);let He=ee.programs;ee.environment=E.isMeshStandardMaterial||E.isMeshLambertMaterial||E.isMeshPhongMaterial?J.environment:null,ee.fog=J.fog;const ht=E.isMeshStandardMaterial||E.isMeshLambertMaterial&&!E.envMap||E.isMeshPhongMaterial&&!E.envMap;ee.envMap=ge.get(E.envMap||ee.environment,ht),ee.envMapRotation=ee.environment!==null&&E.envMap===null?J.environmentRotation:E.envMapRotation,He===void 0&&(E.addEventListener("dispose",De),He=new Map,ee.programs=He);let gt=He.get(nt);if(gt!==void 0){if(ee.currentProgram===gt&&ee.lightsStateVersion===$e)return vi(E,Be),gt}else Be.uniforms=Oe.getUniforms(E),E.onBeforeCompile(Be,C),gt=Oe.acquireProgram(Be,nt),He.set(nt,gt),ee.uniforms=Be.uniforms;const it=ee.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(it.clippingPlanes=Re.uniform),vi(E,Be),ee.needsLights=$a(E),ee.lightsStateVersion=$e,ee.needsLights&&(it.ambientLightColor.value=ne.state.ambient,it.lightProbe.value=ne.state.probe,it.directionalLights.value=ne.state.directional,it.directionalLightShadows.value=ne.state.directionalShadow,it.spotLights.value=ne.state.spot,it.spotLightShadows.value=ne.state.spotShadow,it.rectAreaLights.value=ne.state.rectArea,it.ltc_1.value=ne.state.rectAreaLTC1,it.ltc_2.value=ne.state.rectAreaLTC2,it.pointLights.value=ne.state.point,it.pointLightShadows.value=ne.state.pointShadow,it.hemisphereLights.value=ne.state.hemi,it.directionalShadowMatrix.value=ne.state.directionalShadowMatrix,it.spotLightMatrix.value=ne.state.spotLightMatrix,it.spotLightMap.value=ne.state.spotLightMap,it.pointShadowMatrix.value=ne.state.pointShadowMatrix),ee.currentProgram=gt,ee.uniformsList=null,gt}function Fi(E){if(E.uniformsList===null){const J=E.currentProgram.getUniforms();E.uniformsList=cr.seqWithValue(J.seq,E.uniforms)}return E.uniformsList}function vi(E,J){const le=_.get(E);le.outputColorSpace=J.outputColorSpace,le.batching=J.batching,le.batchingColor=J.batchingColor,le.instancing=J.instancing,le.instancingColor=J.instancingColor,le.instancingMorph=J.instancingMorph,le.skinning=J.skinning,le.morphTargets=J.morphTargets,le.morphNormals=J.morphNormals,le.morphColors=J.morphColors,le.morphTargetsCount=J.morphTargetsCount,le.numClippingPlanes=J.numClippingPlanes,le.numIntersection=J.numClipIntersection,le.vertexAlphas=J.vertexAlphas,le.vertexTangents=J.vertexTangents,le.toneMapping=J.toneMapping}function yr(E,J,le,ee,ne){J.isScene!==!0&&(J=Te),j.resetTextureUnits();const ze=J.fog,$e=ee.isMeshStandardMaterial||ee.isMeshLambertMaterial||ee.isMeshPhongMaterial?J.environment:null,Be=ae===null?C.outputColorSpace:ae.isXRRenderTarget===!0?ae.texture.colorSpace:Fa,nt=ee.isMeshStandardMaterial||ee.isMeshLambertMaterial&&!ee.envMap||ee.isMeshPhongMaterial&&!ee.envMap,He=ge.get(ee.envMap||$e,nt),ht=ee.vertexColors===!0&&!!le.attributes.color&&le.attributes.color.itemSize===4,gt=!!le.attributes.tangent&&(!!ee.normalMap||ee.anisotropy>0),it=!!le.morphAttributes.position,Lt=!!le.morphAttributes.normal,Wt=!!le.morphAttributes.color;let Ft=ui;ee.toneMapped&&(ae===null||ae.isXRRenderTarget===!0)&&(Ft=C.toneMapping);const At=le.morphAttributes.position||le.morphAttributes.normal||le.morphAttributes.color,en=At!==void 0?At.length:0,at=_.get(ee),pn=G.state.lights;if(xe===!0&&(Ye===!0||E!==te)){const Xt=E===te&&ee.id===oe;Re.setState(ee,E,Xt)}let Et=!1;ee.version===at.__version?(at.needsLights&&at.lightsStateVersion!==pn.state.version||at.outputColorSpace!==Be||ne.isBatchedMesh&&at.batching===!1||!ne.isBatchedMesh&&at.batching===!0||ne.isBatchedMesh&&at.batchingColor===!0&&ne.colorTexture===null||ne.isBatchedMesh&&at.batchingColor===!1&&ne.colorTexture!==null||ne.isInstancedMesh&&at.instancing===!1||!ne.isInstancedMesh&&at.instancing===!0||ne.isSkinnedMesh&&at.skinning===!1||!ne.isSkinnedMesh&&at.skinning===!0||ne.isInstancedMesh&&at.instancingColor===!0&&ne.instanceColor===null||ne.isInstancedMesh&&at.instancingColor===!1&&ne.instanceColor!==null||ne.isInstancedMesh&&at.instancingMorph===!0&&ne.morphTexture===null||ne.isInstancedMesh&&at.instancingMorph===!1&&ne.morphTexture!==null||at.envMap!==He||ee.fog===!0&&at.fog!==ze||at.numClippingPlanes!==void 0&&(at.numClippingPlanes!==Re.numPlanes||at.numIntersection!==Re.numIntersection)||at.vertexAlphas!==ht||at.vertexTangents!==gt||at.morphTargets!==it||at.morphNormals!==Lt||at.morphColors!==Wt||at.toneMapping!==Ft||at.morphTargetsCount!==en)&&(Et=!0):(Et=!0,at.__version=ee.version);let An=at.currentProgram;Et===!0&&(An=Ni(ee,J,ne));let Vn=!1,Dn=!1,sn=!1;const dt=An.getUniforms(),Kt=at.uniforms;if(Ke.useProgram(An.program)&&(Vn=!0,Dn=!0,sn=!0),ee.id!==oe&&(oe=ee.id,Dn=!0),Vn||te!==E){Ke.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),dt.setValue(k,"projectionMatrix",E.projectionMatrix),dt.setValue(k,"viewMatrix",E.matrixWorldInverse);const In=dt.map.cameraPosition;In!==void 0&&In.setValue(k,se.setFromMatrixPosition(E.matrixWorld)),yt.logarithmicDepthBuffer&&dt.setValue(k,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(ee.isMeshPhongMaterial||ee.isMeshToonMaterial||ee.isMeshLambertMaterial||ee.isMeshBasicMaterial||ee.isMeshStandardMaterial||ee.isShaderMaterial)&&dt.setValue(k,"isOrthographic",E.isOrthographicCamera===!0),te!==E&&(te=E,Dn=!0,sn=!0)}if(at.needsLights&&(pn.state.directionalShadowMap.length>0&&dt.setValue(k,"directionalShadowMap",pn.state.directionalShadowMap,j),pn.state.spotShadowMap.length>0&&dt.setValue(k,"spotShadowMap",pn.state.spotShadowMap,j),pn.state.pointShadowMap.length>0&&dt.setValue(k,"pointShadowMap",pn.state.pointShadowMap,j)),ne.isSkinnedMesh){dt.setOptional(k,ne,"bindMatrix"),dt.setOptional(k,ne,"bindMatrixInverse");const Xt=ne.skeleton;Xt&&(Xt.boneTexture===null&&Xt.computeBoneTexture(),dt.setValue(k,"boneTexture",Xt.boneTexture,j))}ne.isBatchedMesh&&(dt.setOptional(k,ne,"batchingTexture"),dt.setValue(k,"batchingTexture",ne._matricesTexture,j),dt.setOptional(k,ne,"batchingIdTexture"),dt.setValue(k,"batchingIdTexture",ne._indirectTexture,j),dt.setOptional(k,ne,"batchingColorTexture"),ne._colorsTexture!==null&&dt.setValue(k,"batchingColorTexture",ne._colorsTexture,j));const zn=le.morphAttributes;if((zn.position!==void 0||zn.normal!==void 0||zn.color!==void 0)&&Ge.update(ne,le,An),(Dn||at.receiveShadow!==ne.receiveShadow)&&(at.receiveShadow=ne.receiveShadow,dt.setValue(k,"receiveShadow",ne.receiveShadow)),(ee.isMeshStandardMaterial||ee.isMeshLambertMaterial||ee.isMeshPhongMaterial)&&ee.envMap===null&&J.environment!==null&&(Kt.envMapIntensity.value=J.environmentIntensity),Kt.dfgLUT!==void 0&&(Kt.dfgLUT.value=Ay()),Dn&&(dt.setValue(k,"toneMappingExposure",C.toneMappingExposure),at.needsLights&&Wa(Kt,sn),ze&&ee.fog===!0&&Qe.refreshFogUniforms(Kt,ze),Qe.refreshMaterialUniforms(Kt,ee,Ie,_e,G.state.transmissionRenderTarget[E.id]),cr.upload(k,Fi(at),Kt,j)),ee.isShaderMaterial&&ee.uniformsNeedUpdate===!0&&(cr.upload(k,Fi(at),Kt,j),ee.uniformsNeedUpdate=!1),ee.isSpriteMaterial&&dt.setValue(k,"center",ne.center),dt.setValue(k,"modelViewMatrix",ne.modelViewMatrix),dt.setValue(k,"normalMatrix",ne.normalMatrix),dt.setValue(k,"modelMatrix",ne.matrixWorld),ee.isShaderMaterial||ee.isRawShaderMaterial){const Xt=ee.uniformsGroups;for(let In=0,Zt=Xt.length;In<Zt;In++){const Ln=Xt[In];N.update(Ln,An),N.bind(Ln,An)}}return An}function Wa(E,J){E.ambientLightColor.needsUpdate=J,E.lightProbe.needsUpdate=J,E.directionalLights.needsUpdate=J,E.directionalLightShadows.needsUpdate=J,E.pointLights.needsUpdate=J,E.pointLightShadows.needsUpdate=J,E.spotLights.needsUpdate=J,E.spotLightShadows.needsUpdate=J,E.rectAreaLights.needsUpdate=J,E.hemisphereLights.needsUpdate=J}function $a(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return H},this.getActiveMipmapLevel=function(){return ie},this.getRenderTarget=function(){return ae},this.setRenderTargetTextures=function(E,J,le){const ee=_.get(E);ee.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,ee.__autoAllocateDepthBuffer===!1&&(ee.__useRenderToTexture=!1),_.get(E.texture).__webglTexture=J,_.get(E.depthTexture).__webglTexture=ee.__autoAllocateDepthBuffer?void 0:le,ee.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,J){const le=_.get(E);le.__webglFramebuffer=J,le.__useDefaultFramebuffer=J===void 0};const Sr=k.createFramebuffer();this.setRenderTarget=function(E,J=0,le=0){ae=E,H=J,ie=le;let ee=null,ne=!1,ze=!1;if(E){const Be=_.get(E);if(Be.__useDefaultFramebuffer!==void 0){Ke.bindFramebuffer(k.FRAMEBUFFER,Be.__webglFramebuffer),F.copy(E.viewport),O.copy(E.scissor),he=E.scissorTest,Ke.viewport(F),Ke.scissor(O),Ke.setScissorTest(he),oe=-1;return}else if(Be.__webglFramebuffer===void 0)j.setupRenderTarget(E);else if(Be.__hasExternalTextures)j.rebindTextures(E,_.get(E.texture).__webglTexture,_.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const ht=E.depthTexture;if(Be.__boundDepthTexture!==ht){if(ht!==null&&_.has(ht)&&(E.width!==ht.image.width||E.height!==ht.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");j.setupDepthRenderbuffer(E)}}const nt=E.texture;(nt.isData3DTexture||nt.isDataArrayTexture||nt.isCompressedArrayTexture)&&(ze=!0);const He=_.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(He[J])?ee=He[J][le]:ee=He[J],ne=!0):E.samples>0&&j.useMultisampledRTT(E)===!1?ee=_.get(E).__webglMultisampledFramebuffer:Array.isArray(He)?ee=He[le]:ee=He,F.copy(E.viewport),O.copy(E.scissor),he=E.scissorTest}else F.copy(pe).multiplyScalar(Ie).floor(),O.copy(Pe).multiplyScalar(Ie).floor(),he=Le;if(le!==0&&(ee=Sr),Ke.bindFramebuffer(k.FRAMEBUFFER,ee)&&Ke.drawBuffers(E,ee),Ke.viewport(F),Ke.scissor(O),Ke.setScissorTest(he),ne){const Be=_.get(E.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_CUBE_MAP_POSITIVE_X+J,Be.__webglTexture,le)}else if(ze){const Be=J;for(let nt=0;nt<E.textures.length;nt++){const He=_.get(E.textures[nt]);k.framebufferTextureLayer(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0+nt,He.__webglTexture,le,Be)}}else if(E!==null&&le!==0){const Be=_.get(E.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,Be.__webglTexture,le)}oe=-1},this.readRenderTargetPixels=function(E,J,le,ee,ne,ze,$e,Be=0){if(!(E&&E.isWebGLRenderTarget)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let nt=_.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&$e!==void 0&&(nt=nt[$e]),nt){Ke.bindFramebuffer(k.FRAMEBUFFER,nt);try{const He=E.textures[Be],ht=He.format,gt=He.type;if(E.textures.length>1&&k.readBuffer(k.COLOR_ATTACHMENT0+Be),!yt.textureFormatReadable(ht)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!yt.textureTypeReadable(gt)){Nt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}J>=0&&J<=E.width-ee&&le>=0&&le<=E.height-ne&&k.readPixels(J,le,ee,ne,Se.convert(ht),Se.convert(gt),ze)}finally{const He=ae!==null?_.get(ae).__webglFramebuffer:null;Ke.bindFramebuffer(k.FRAMEBUFFER,He)}}},this.readRenderTargetPixelsAsync=async function(E,J,le,ee,ne,ze,$e,Be=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let nt=_.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&$e!==void 0&&(nt=nt[$e]),nt)if(J>=0&&J<=E.width-ee&&le>=0&&le<=E.height-ne){Ke.bindFramebuffer(k.FRAMEBUFFER,nt);const He=E.textures[Be],ht=He.format,gt=He.type;if(E.textures.length>1&&k.readBuffer(k.COLOR_ATTACHMENT0+Be),!yt.textureFormatReadable(ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!yt.textureTypeReadable(gt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const it=k.createBuffer();k.bindBuffer(k.PIXEL_PACK_BUFFER,it),k.bufferData(k.PIXEL_PACK_BUFFER,ze.byteLength,k.STREAM_READ),k.readPixels(J,le,ee,ne,Se.convert(ht),Se.convert(gt),0);const Lt=ae!==null?_.get(ae).__webglFramebuffer:null;Ke.bindFramebuffer(k.FRAMEBUFFER,Lt);const Wt=k.fenceSync(k.SYNC_GPU_COMMANDS_COMPLETE,0);return k.flush(),await Lm(k,Wt,4),k.bindBuffer(k.PIXEL_PACK_BUFFER,it),k.getBufferSubData(k.PIXEL_PACK_BUFFER,0,ze),k.deleteBuffer(it),k.deleteSync(Wt),ze}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,J=null,le=0){const ee=Math.pow(2,-le),ne=Math.floor(E.image.width*ee),ze=Math.floor(E.image.height*ee),$e=J!==null?J.x:0,Be=J!==null?J.y:0;j.setTexture2D(E,0),k.copyTexSubImage2D(k.TEXTURE_2D,le,0,0,$e,Be,ne,ze),Ke.unbindTexture()};const Ki=k.createFramebuffer(),_i=k.createFramebuffer();this.copyTextureToTexture=function(E,J,le=null,ee=null,ne=0,ze=0){let $e,Be,nt,He,ht,gt,it,Lt,Wt;const Ft=E.isCompressedTexture?E.mipmaps[ze]:E.image;if(le!==null)$e=le.max.x-le.min.x,Be=le.max.y-le.min.y,nt=le.isBox3?le.max.z-le.min.z:1,He=le.min.x,ht=le.min.y,gt=le.isBox3?le.min.z:0;else{const Kt=Math.pow(2,-ne);$e=Math.floor(Ft.width*Kt),Be=Math.floor(Ft.height*Kt),E.isDataArrayTexture?nt=Ft.depth:E.isData3DTexture?nt=Math.floor(Ft.depth*Kt):nt=1,He=0,ht=0,gt=0}ee!==null?(it=ee.x,Lt=ee.y,Wt=ee.z):(it=0,Lt=0,Wt=0);const At=Se.convert(J.format),en=Se.convert(J.type);let at;J.isData3DTexture?(j.setTexture3D(J,0),at=k.TEXTURE_3D):J.isDataArrayTexture||J.isCompressedArrayTexture?(j.setTexture2DArray(J,0),at=k.TEXTURE_2D_ARRAY):(j.setTexture2D(J,0),at=k.TEXTURE_2D),k.pixelStorei(k.UNPACK_FLIP_Y_WEBGL,J.flipY),k.pixelStorei(k.UNPACK_PREMULTIPLY_ALPHA_WEBGL,J.premultiplyAlpha),k.pixelStorei(k.UNPACK_ALIGNMENT,J.unpackAlignment);const pn=k.getParameter(k.UNPACK_ROW_LENGTH),Et=k.getParameter(k.UNPACK_IMAGE_HEIGHT),An=k.getParameter(k.UNPACK_SKIP_PIXELS),Vn=k.getParameter(k.UNPACK_SKIP_ROWS),Dn=k.getParameter(k.UNPACK_SKIP_IMAGES);k.pixelStorei(k.UNPACK_ROW_LENGTH,Ft.width),k.pixelStorei(k.UNPACK_IMAGE_HEIGHT,Ft.height),k.pixelStorei(k.UNPACK_SKIP_PIXELS,He),k.pixelStorei(k.UNPACK_SKIP_ROWS,ht),k.pixelStorei(k.UNPACK_SKIP_IMAGES,gt);const sn=E.isDataArrayTexture||E.isData3DTexture,dt=J.isDataArrayTexture||J.isData3DTexture;if(E.isDepthTexture){const Kt=_.get(E),zn=_.get(J),Xt=_.get(Kt.__renderTarget),In=_.get(zn.__renderTarget);Ke.bindFramebuffer(k.READ_FRAMEBUFFER,Xt.__webglFramebuffer),Ke.bindFramebuffer(k.DRAW_FRAMEBUFFER,In.__webglFramebuffer);for(let Zt=0;Zt<nt;Zt++)sn&&(k.framebufferTextureLayer(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,_.get(E).__webglTexture,ne,gt+Zt),k.framebufferTextureLayer(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,_.get(J).__webglTexture,ze,Wt+Zt)),k.blitFramebuffer(He,ht,$e,Be,it,Lt,$e,Be,k.DEPTH_BUFFER_BIT,k.NEAREST);Ke.bindFramebuffer(k.READ_FRAMEBUFFER,null),Ke.bindFramebuffer(k.DRAW_FRAMEBUFFER,null)}else if(ne!==0||E.isRenderTargetTexture||_.has(E)){const Kt=_.get(E),zn=_.get(J);Ke.bindFramebuffer(k.READ_FRAMEBUFFER,Ki),Ke.bindFramebuffer(k.DRAW_FRAMEBUFFER,_i);for(let Xt=0;Xt<nt;Xt++)sn?k.framebufferTextureLayer(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,Kt.__webglTexture,ne,gt+Xt):k.framebufferTexture2D(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,Kt.__webglTexture,ne),dt?k.framebufferTextureLayer(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,zn.__webglTexture,ze,Wt+Xt):k.framebufferTexture2D(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,zn.__webglTexture,ze),ne!==0?k.blitFramebuffer(He,ht,$e,Be,it,Lt,$e,Be,k.COLOR_BUFFER_BIT,k.NEAREST):dt?k.copyTexSubImage3D(at,ze,it,Lt,Wt+Xt,He,ht,$e,Be):k.copyTexSubImage2D(at,ze,it,Lt,He,ht,$e,Be);Ke.bindFramebuffer(k.READ_FRAMEBUFFER,null),Ke.bindFramebuffer(k.DRAW_FRAMEBUFFER,null)}else dt?E.isDataTexture||E.isData3DTexture?k.texSubImage3D(at,ze,it,Lt,Wt,$e,Be,nt,At,en,Ft.data):J.isCompressedArrayTexture?k.compressedTexSubImage3D(at,ze,it,Lt,Wt,$e,Be,nt,At,Ft.data):k.texSubImage3D(at,ze,it,Lt,Wt,$e,Be,nt,At,en,Ft):E.isDataTexture?k.texSubImage2D(k.TEXTURE_2D,ze,it,Lt,$e,Be,At,en,Ft.data):E.isCompressedTexture?k.compressedTexSubImage2D(k.TEXTURE_2D,ze,it,Lt,Ft.width,Ft.height,At,Ft.data):k.texSubImage2D(k.TEXTURE_2D,ze,it,Lt,$e,Be,At,en,Ft);k.pixelStorei(k.UNPACK_ROW_LENGTH,pn),k.pixelStorei(k.UNPACK_IMAGE_HEIGHT,Et),k.pixelStorei(k.UNPACK_SKIP_PIXELS,An),k.pixelStorei(k.UNPACK_SKIP_ROWS,Vn),k.pixelStorei(k.UNPACK_SKIP_IMAGES,Dn),ze===0&&J.generateMipmaps&&k.generateMipmap(at),Ke.unbindTexture()},this.initRenderTarget=function(E){_.get(E).__webglFramebuffer===void 0&&j.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?j.setTextureCube(E,0):E.isData3DTexture?j.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?j.setTexture2DArray(E,0):j.setTexture2D(E,0),Ke.unbindTexture()},this.resetState=function(){H=0,ie=0,ae=null,Ke.reset(),Ue.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ci}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Ut._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ut._getUnpackColorSpace()}}const Ry={class:"pv-wrap"},Py={class:"pv-main"},Dy={class:"pv-side"},Iy={class:"pv-side-header"},Ly={class:"pv-side-count"},Uy={key:0,class:"pv-side-empty"},Ny={key:1,class:"pv-side-list"},Fy=["src"],Oy={class:"pv-side-idx"},By={class:"pv-toolbar"},ky={class:"pv-info"},Ca=640,ir=16,Vy="#ffffff",zy=Ba({__name:"PanoramaViewer",props:{modelValue:{type:Boolean},elementId:{},elementName:{},panoramaUrl:{},hasExistingGrid:{type:Boolean}},emits:["update:modelValue","screenshot-saved"],setup(i,{emit:e}){const t=i,n=e,a=lt({get:()=>t.modelValue,set:se=>n("update:modelValue",se)}),s=lt(()=>`VR 360° 查看 — ${t.elementName||"未命名场景"}`),r=re(),l=re(!1),c=re("loading"),u=re(""),h=re([]);let m=null,d=null,g=null,x=0,w=null,v=0,p=null,T=0,D=0,P=!1,G=0,U=0;const K=re(75),y=re(0),C=re(0);function de(){d&&(K.value=Math.round(d.fov),y.value=Math.round(T),C.value=Math.round(D))}function H(){if(!r.value)return;if(!t.panoramaUrl){c.value="error",u.value="全景图 URL 为空,父组件没传 panoramaUrl(可能 joinBackendUrl 失败 / vrViewerUrl 没塞)";return}const se=r.value,q=se.clientWidth||1280,Te=se.clientHeight||720;m=new ug,d=new $n(75,q/Te,.1,1100),d.position.set(0,0,.01),g=new Cy({antialias:!0,preserveDrawingBuffer:!0}),g.setSize(q,Te),g.setPixelRatio(window.devicePixelRatio),se.appendChild(g.domElement);const We=new jl(500,64,32);We.scale(-1,1,1),oe(We);const et=g.domElement;et.style.cursor="grab",et.addEventListener("pointerdown",te),et.addEventListener("pointermove",F),et.addEventListener("pointerup",O),et.addEventListener("pointerleave",O),et.addEventListener("wheel",V,{passive:!1}),w=new ResizeObserver(()=>$()),w.observe(se),Me()}function ie(se,q){if(q<=0)return se;const Te=se.includes("?")?"&":"?";return`${se}${Te}vr_retry=${Date.now()}_${q}`}function ae(){p&&(clearTimeout(p),p=null)}function oe(se,q=0){const Te=++v;ae(),c.value="loading",u.value="";const We=new Ig;We.setCrossOrigin("anonymous");const et=ie(t.panoramaUrl,q),k=q===0?3e3:7e3,_t=We.load(et,Ve=>{if(Te!==v||!m){Ve.dispose();return}ae(),Ve.colorSpace=On;const yt=new Zl({map:Ve}),Ke=new pi(se,yt);m.add(Ke),c.value="success",console.log("[PanoramaViewer] 全景贴图加载成功:",et)},Ve=>{console.log("[PanoramaViewer] 加载进度:",Ve.loaded,"/",Ve.total)},Ve=>{if(Te===v){if(ae(),q<2){console.warn("[PanoramaViewer] 全景贴图加载失败,准备重试:",et,Ve),oe(se,q+1);return}console.error("[PanoramaViewer] 全景贴图加载失败:",et,Ve),c.value="error",u.value=`URL=${et}  错误=${(Ve==null?void 0:Ve.message)||Ve}`,W.error("全景图加载失败,请检查图片是否可访问")}});p=setTimeout(()=>{if(!(Te!==v||c.value!=="loading")){if(_t.dispose(),q<2){console.warn("[PanoramaViewer] 全景贴图加载超时,准备重试:",et),oe(se,q+1);return}c.value="error",u.value=`URL=${et}  错误=加载超时`,W.error("全景图加载超时,请稍后重试")}},k)}function te(se){if(P=!0,G=se.clientX,U=se.clientY,g){g.domElement.style.cursor="grabbing";try{g.domElement.setPointerCapture(se.pointerId)}catch{}}}function F(se){if(!P)return;const q=se.clientX-G,Te=se.clientY-U;G=se.clientX,U=se.clientY;const We=((d==null?void 0:d.fov)||75)/200;T-=q*We,D+=Te*We,D>89&&(D=89),D<-89&&(D=-89),T>180&&(T-=360),T<-180&&(T+=360)}function O(se){if(P=!1,g){g.domElement.style.cursor="grab";try{(se==null?void 0:se.pointerId)!==void 0&&g.domElement.releasePointerCapture(se.pointerId)}catch{}}}function he(){if(!d)return;const se=Kc.degToRad(90-D),q=Kc.degToRad(T),Te=new ce(500*Math.sin(se)*Math.cos(q),500*Math.cos(se),500*Math.sin(se)*Math.sin(q));d.lookAt(Te)}function V(se){if(!d)return;se.preventDefault(),se.stopPropagation();const q=se.deltaY>0?3:-3;d.fov=Math.max(20,Math.min(130,d.fov+q)),d.updateProjectionMatrix()}function $(){if(!d||!g||!r.value)return;const se=r.value.clientWidth,q=r.value.clientHeight;d.aspect=se/q,d.updateProjectionMatrix(),g.setSize(se,q)}function Me(){!g||!m||!d||(x=requestAnimationFrame(Me),he(),de(),g.render(m,d))}function _e(){d&&(d.fov=75,d.updateProjectionMatrix(),T=0,D=0)}function Ie(se){if(d){switch(se){case"top":D=-75,d.fov=85;break;case"front":D=0,d.fov=75;break;case"bottom":D=75,d.fov=85;break}d.updateProjectionMatrix()}}function ke(se){return se<=1?{cols:1,rows:1}:se<=4?{cols:2,rows:Math.ceil(se/2)}:{cols:3,rows:Math.ceil(se/3)}}function mt(se){return new Promise((q,Te)=>{const{cols:We,rows:et}=ke(se.length),k=document.createElement("canvas");k.width=Ca*We+ir*Math.max(0,We-1),k.height=Ca*et+ir*Math.max(0,et-1);const _t=k.getContext("2d");if(!_t)return Te(new Error("canvas 2d context 不可用"));_t.fillStyle=Vy,_t.fillRect(0,0,k.width,k.height);let Ve=0,yt=!1;se.forEach((Ke,R)=>{const _=new Image;_.onload=()=>{if(yt)return;const j=Math.floor(R/We),ye=R%We*(Ca+ir),fe=j*(Ca+ir),je=_.naturalWidth,Oe=_.naturalHeight,Qe=Math.min(je,Oe),rt=(je-Qe)/2,Ae=(Oe-Qe)/2;_t.drawImage(_,rt,Ae,Qe,Qe,ye,fe,Ca,Ca),Ve++,Ve===se.length&&q(k.toDataURL("image/png"))},_.onerror=()=>{yt=!0,Te(new Error(`第 ${R+1} 张截图加载失败`))},_.src=Ke})})}const pe=re(!1);async function Pe(){var se,q;if(!g||!t.elementId){W.warning("视图未就绪");return}if(h.value.length===0&&t.hasExistingGrid&&!pe.value)try{await Fn.confirm(`该场景已有宫格图。继续截图会**重新生成宫格图**(覆盖现有那张)。
若要保留旧宫格图,请先取消,然后导出/备份旧图后再来。`,"覆盖宫格图确认",{type:"warning",confirmButtonText:"覆盖,继续截图",cancelButtonText:"取消"}),pe.value=!0}catch{return}l.value=!0;try{let Te="";if(m&&d&&g){const Ve=((se=r.value)==null?void 0:se.clientWidth)||1280,yt=((q=r.value)==null?void 0:q.clientHeight)||720,Ke=d.aspect;try{g.setSize(1280,1280,!1),d.aspect=1,d.updateProjectionMatrix(),g.render(m,d),Te=g.domElement.toDataURL("image/png")}finally{g.setSize(Ve,yt,!1),d.aspect=Ke,d.updateProjectionMatrix(),g.render(m,d)}}const We=Te||g.domElement.toDataURL("image/png"),et=[...h.value,We],k=await mt(et),_t=await hh(t.elementId,k);if(_t.success&&_t.grid_image)h.value=et,W.success(`截图已加入宫格(共 ${h.value.length} 张)`),n("screenshot-saved",t.elementId,_t.grid_image);else throw new Error(_t.message||"保存失败")}catch(Te){W.error(`截图保存失败: ${(Te==null?void 0:Te.message)||Te}`)}finally{l.value=!1}}function Le(){if(v++,ae(),Ye&&(clearTimeout(Ye),Ye=null),x&&(cancelAnimationFrame(x),x=0),w&&(w.disconnect(),w=null),g){const se=g.domElement;se.removeEventListener("pointerdown",te),se.removeEventListener("pointermove",F),se.removeEventListener("pointerup",O),se.removeEventListener("pointerleave",O),se.removeEventListener("wheel",V),g.dispose(),se.parentNode&&se.parentNode.removeChild(se),g=null}P=!1,m&&(m.traverse(se=>{if(se.geometry&&se.geometry.dispose(),se.material){const q=se.material;q.map&&q.map.dispose(),q.dispose()}}),m=null),d=null}function ut(){Le(),h.value=[],pe.value=!1}let xe=!1,Ye=null;function It(){!a.value||!t.panoramaUrl||xe||(xe=!0,Ye&&clearTimeout(Ye),Ye=setTimeout(async()=>{Ye=null,await Hf(),H()},350))}return oi(a,se=>{se?(xe=!1,It()):(xe=!1,Ye&&(clearTimeout(Ye),Ye=null))}),oi(()=>t.panoramaUrl,(se,q)=>{if(!a.value||!se){It();return}se!==q&&(Le(),xe=!1),It()}),pr(()=>Le()),(se,q)=>{const Te=ft("el-button"),We=ft("el-dialog");return L(),ve(We,{modelValue:a.value,"onUpdate:modelValue":q[4]||(q[4]=et=>a.value=et),title:s.value,width:"90%",top:"3vh","destroy-on-close":"","close-on-click-modal":!1,onClosed:ut},{default:b(()=>[B("div",Ry,[q[13]||(q[13]=B("div",{class:"pv-tip"}," 鼠标拖拽旋转视角,滚轮缩放(FOV 20°-130°) · 对准想要的角度后点「📷 截图保存」 → 自动累加到该场景的宫格图 ",-1)),c.value!=="success"?(L(),me("div",{key:0,class:yn(["pv-status",{"is-error":c.value==="error"}])},be(c.value==="loading"?`加载中: ${i.panoramaUrl}`:`加载失败: ${u.value}`),3)):we("",!0),B("div",Py,[B("div",{ref_key:"containerRef",ref:r,class:"pv-canvas"},null,512),B("div",Dy,[B("div",Iy,[q[5]||(q[5]=Q(" 本次截图 ",-1)),B("span",Ly,"("+be(h.value.length)+")",1)]),h.value.length===0?(L(),me("div",Uy,[...q[6]||(q[6]=[Q(" 旋转到想要的角度后",-1),B("br",null,null,-1),Q("点「截图保存」",-1),B("br",null,null,-1),Q("缩略图会出现在这里 ",-1)])])):(L(),me("div",Ny,[(L(!0),me(Tt,null,Rt(h.value,(et,k)=>(L(),me("div",{key:k,class:"pv-side-item"},[B("img",{src:et,class:"pv-side-thumb"},null,8,Fy),B("div",Oy,"#"+be(k+1),1)]))),128))]))])]),B("div",By,[B("span",ky,"FOV: "+be(K.value)+"° · Yaw: "+be(y.value)+"° · Pitch: "+be(C.value)+"°",1),M(Te,{size:"small",onClick:q[0]||(q[0]=et=>Ie("top"))},{default:b(()=>[...q[7]||(q[7]=[Q("俯视",-1)])]),_:1}),M(Te,{size:"small",onClick:q[1]||(q[1]=et=>Ie("front"))},{default:b(()=>[...q[8]||(q[8]=[Q("平视",-1)])]),_:1}),M(Te,{size:"small",onClick:q[2]||(q[2]=et=>Ie("bottom"))},{default:b(()=>[...q[9]||(q[9]=[Q("仰视",-1)])]),_:1}),M(Te,{size:"small",onClick:_e},{default:b(()=>[...q[10]||(q[10]=[Q("复位",-1)])]),_:1}),M(Te,{type:"primary",loading:l.value,onClick:Pe},{default:b(()=>[...q[11]||(q[11]=[Q(" 📷 截图保存到宫格 ",-1)])]),_:1},8,["loading"]),M(Te,{onClick:q[3]||(q[3]=et=>a.value=!1)},{default:b(()=>[...q[12]||(q[12]=[Q("关闭",-1)])]),_:1})])])]),_:1},8,["modelValue","title"])}}}),Gy=ka(zy,[["__scopeId","data-v-e7f30b4e"]]),Hy={class:"cvd-wrap"},Wy={class:"cvd-toolbar"},$y={key:0,class:"cvd-loading"},Xy={key:1,class:"cvd-empty"},qy={key:2,class:"cvd-list"},Yy={class:"cvd-item-head"},Ky={class:"cvd-assets"},Zy={class:"cvd-asset"},jy={class:"cvd-asset-box"},Jy={key:1,class:"cvd-asset-empty"},Qy={class:"cvd-asset-actions"},eS={class:"cvd-asset"},tS={class:"cvd-asset-box"},nS={key:1,class:"cvd-asset-empty"},iS={class:"cvd-asset-actions"},aS={class:"cvd-asset"},sS={class:"cvd-asset-box cvd-gen-box"},rS={key:1,class:"cvd-asset-empty"},oS={key:2,class:"cvd-loading-overlay"},lS={class:"cvd-asset-actions"},cS={class:"cvd-asset cvd-asset-audio"},uS={class:"cvd-asset-box cvd-audio"},dS=["src"],fS={key:1,class:"cvd-asset-empty"},hS={key:2,class:"cvd-audio-badge"},pS={key:3,class:"cvd-audio-badge is-fallback"},mS={class:"cvd-asset-actions"},gS={class:"cvd-volc"},vS={key:4,class:"cvd-volc-hint"},_S={key:5,class:"cvd-volc-id"},xS=Ba({__name:"CharacterVariantsDialog",props:{modelValue:{type:Boolean},element:{},selectedImageConfigId:{}},emits:["update:modelValue","changed"],setup(i,{emit:e}){const t=i,n=e,a=lt({get:()=>t.modelValue,set:V=>n("update:modelValue",V)}),s=re([]),r=re(!1),l=re(""),c=re(!1),u=re(null);function h(V){return V?`local-audio:${encodeURIComponent(V)}`:null}function m(V){var $;return V.audio_file||(($=t.element)==null?void 0:$.audio_file)||null}function d(V){return V!=null&&V.audio_file?h(V.audio_file):null}function g(V){u.value=V,c.value=!0}function x(V,$,Me){u.value&&$!==void 0&&(u.value.audio_file=$||null,u.value.updated_at=Me||new Date().toISOString()),n("changed",t.element)}function w(V,$=Date.now()){return V&&(V.includes("?")?`${V}&t=${$}`:`${V}?t=${$}`)}function v(V,$=Date.now()){V.updated_at=String($)}function p(V,$){return zu(V[$],V.updated_at||V.id)}async function T(){if(t.element){r.value=!0;try{s.value=await Ul(t.element.id)}catch(V){W.error(`加载马甲失败: ${(V==null?void 0:V.message)||V}`),s.value=[]}finally{r.value=!1}}}oi(()=>t.modelValue,V=>{V&&t.element&&(T(),l.value="")});async function D(){if(!(!t.element||!l.value.trim()))try{const V=await Yu(t.element.id,{variant_name:l.value.trim()});s.value.push(V),l.value="",W.success("新建马甲成功"),n("changed",t.element)}catch(V){W.error(`新建失败: ${(V==null?void 0:V.message)||V}`)}}async function P(V){try{await Cc(V.id,{variant_name:V.variant_name}),n("changed",t.element)}catch($){W.error(`改名失败: ${($==null?void 0:$.message)||$}`)}}async function G(V){try{await Cc(V.id,{description:V.description})}catch($){W.error(`保存描述失败: ${($==null?void 0:$.message)||$}`)}}async function U(V){if(t.element)try{await Hu(t.element.id,V.id),t.element.active_variant_id=V.id,t.element.active_variant_name=V.variant_name,W.success(`已切到「${V.variant_name}」 — 之后视频生成都用此形象`),n("changed",t.element)}catch($){W.error(`设为默认失败: ${($==null?void 0:$.message)||$}`)}}async function K(V){try{await ph(V.id),s.value=s.value.filter($=>$.id!==V.id),t.element&&t.element.active_variant_id===V.id&&(t.element.active_variant_id=null,t.element.active_variant_name=null),W.success("马甲已删除"),n("changed",t.element)}catch($){W.error(`删除失败: ${($==null?void 0:$.message)||$}`)}}async function y(V,$,Me){const _e=(Me==null?void 0:Me.raw)||Me;if(_e)try{if($==="finished"){const Ie=await Ol(V.id,_e);V.finished_image=w(Ie.finished_image),v(V)}else if($==="reference"){const Ie=await Nl(V.id,_e);V.reference_image=w(Ie.reference_image),v(V)}else{const Ie=await Fl(V.id,_e);V.audio_file=Ie.audio_file,V.updated_at=Ie.updated_at||new Date().toISOString()}W.success("上传成功"),n("changed",t.element)}catch(Ie){W.error(`上传失败: ${(Ie==null?void 0:Ie.message)||Ie}`)}}async function C(V,$){try{if($==="finished")await $u(V.id),V.finished_image=null,v(V);else if($==="reference")await qu(V.id),V.reference_image=null,v(V);else{const Me=await Xu(V.id);V.audio_file=null,V.updated_at=Me.updated_at||new Date().toISOString()}n("changed",t.element)}catch(Me){W.error(`删除失败: ${(Me==null?void 0:Me.message)||Me}`)}}async function de(V){if(!t.selectedImageConfigId){W.warning('请先在顶部选择"图片模型配置"');return}V.image_status="generating";try{const $=await Wu(V.id,t.selectedImageConfigId);if($.success)V.image_url=w($.image_url),V.image_status="success",v(V),W.success("马甲图生成成功"),n("changed",t.element);else throw V.image_status="error",new Error($.message||"生成失败")}catch($){V.image_status="error",W.error(`生成失败: ${($==null?void 0:$.message)||$}`)}}const H=Wf({}),ie=new Map;async function ae(){try{const V=await Go();if(!V.has_credentials)return null;const $=await Zu(V.sk_encrypted);return $?{ak:V.ak,sk:$,project:V.project_name||"default"}:null}catch(V){return console.error("[variant-volc] 拿凭证失败",V),null}}async function oe(V){var $,Me;if(!H[V.id]){if(!V.finished_image){W.warning("该马甲还没有成品图,无法加白");return}H[V.id]=!0;try{const _e=await ae();if(!_e){W.warning("请先到「设置 → 通用设置 → 火山方舟素材库」配置 AK/SK");return}const Ie=await Oh({variant_id:V.id,ak:_e.ak,sk:_e.sk,project_name:_e.project});Ie.success?(V.volc_asset_id=Ie.asset_id,V.volc_asset_uri=Ie.asset_uri,V.volc_asset_status=Ie.status,W.success(Ie.message||"已提交,审核中…"),te(V),n("changed",t.element)):W.error("加白失败")}catch(_e){W.error("加白失败: "+(((Me=($=_e==null?void 0:_e.response)==null?void 0:$.data)==null?void 0:Me.detail)||(_e==null?void 0:_e.message)||_e))}finally{H[V.id]=!1}}}function te(V){F(V.id);const $=window.setInterval(async()=>{if(V.volc_asset_status!=="Processing"){F(V.id);return}try{const Me=await ae();if(!Me){F(V.id);return}const _e=await Bh({variant_id:V.id,ak:Me.ak,sk:Me.sk,project_name:Me.project});_e.status&&_e.status!=="Processing"&&(V.volc_asset_status=_e.status,_e.status==="Active"?W.success(`马甲「${V.variant_name}」已加白入库 ✅`):_e.status==="Failed"&&W.error(`马甲「${V.variant_name}」加白审核失败`),F(V.id),n("changed",t.element))}catch{}},3e3);ie.set(V.id,$)}function F(V){const $=ie.get(V);$&&(clearInterval($),ie.delete(V))}function O(){ie.forEach(V=>clearInterval(V)),ie.clear()}oi(s,V=>{for(const $ of V)$.volc_asset_status==="Processing"&&!ie.has($.id)&&te($)}),pr(()=>{O()});function he(){O(),s.value=[],l.value="",c.value=!1,u.value=null}return(V,$)=>{var ut;const Me=ft("el-input"),_e=ft("el-button"),Ie=ft("el-icon"),ke=ft("el-tag"),mt=ft("el-popconfirm"),pe=ft("el-image"),Pe=ft("el-upload"),Le=ft("el-dialog");return L(),ve(Le,{modelValue:a.value,"onUpdate:modelValue":$[3]||($[3]=xe=>a.value=xe),title:`马甲管理 — ${((ut=i.element)==null?void 0:ut.name)||""}`,width:"900px","destroy-on-close":"","append-to-body":"",onClosed:he},{footer:b(()=>[M(_e,{onClick:$[2]||($[2]=xe=>a.value=!1)},{default:b(()=>[...$[27]||($[27]=[Q("关闭",-1)])]),_:1})]),default:b(()=>[B("div",Hy,[B("div",Wy,[M(Me,{modelValue:l.value,"onUpdate:modelValue":$[0]||($[0]=xe=>l.value=xe),placeholder:"新马甲名称(青年/战甲/受伤...)",size:"small",class:"cvd-input"},null,8,["modelValue"]),M(_e,{type:"primary",size:"small",disabled:!l.value.trim(),onClick:D},{default:b(()=>[...$[4]||($[4]=[Q("+ 新建马甲",-1)])]),_:1},8,["disabled"]),$[5]||($[5]=B("span",{class:"cvd-hint"},'提示:切换"当前默认马甲"后,后续视频生成都用该形象。重跑旧分镜也会用新马甲。',-1))]),r.value?(L(),me("div",$y,[M(Ie,{class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1}),$[6]||($[6]=Q(" 加载中... ",-1))])):s.value.length===0?(L(),me("div",Xy," 还没有马甲。点上面 [+ 新建马甲] 来添加该角色的不同形象(青年/战甲/受伤...)。 ")):(L(),me("div",qy,[(L(!0),me(Tt,null,Rt(s.value,xe=>{var Ye,It,se;return L(),me("div",{key:xe.id,class:yn(["cvd-item",{"is-active":xe.id===((Ye=i.element)==null?void 0:Ye.active_variant_id)}])},[B("div",Yy,[M(Me,{modelValue:xe.variant_name,"onUpdate:modelValue":q=>xe.variant_name=q,size:"small",class:"cvd-name-input",onChange:q=>P(xe)},null,8,["modelValue","onUpdate:modelValue","onChange"]),xe.id===((It=i.element)==null?void 0:It.active_variant_id)?(L(),ve(ke,{key:0,type:"success",size:"small"},{default:b(()=>[...$[7]||($[7]=[Q("当前默认",-1)])]),_:1})):(L(),ve(_e,{key:1,size:"small",onClick:q=>U(xe)},{default:b(()=>[...$[8]||($[8]=[Q("设为默认",-1)])]),_:1},8,["onClick"])),M(mt,{title:"确定删除该马甲?",onConfirm:q=>K(xe)},{reference:b(()=>[M(_e,{size:"small",type:"danger",plain:""},{default:b(()=>[...$[9]||($[9]=[Q("删除",-1)])]),_:1})]),_:1},8,["onConfirm"])]),M(Me,{modelValue:xe.description,"onUpdate:modelValue":q=>xe.description=q,type:"textarea",rows:2,size:"small",placeholder:"该形象的描述(战甲、墨黑色锁甲、肩甲带云纹...) — 留空时 fallback 本体描述",onChange:q=>G(xe),class:"cvd-desc-input"},null,8,["modelValue","onUpdate:modelValue","onChange"]),B("div",Ky,[B("div",Zy,[$[12]||($[12]=B("div",{class:"cvd-asset-label"},"成品图",-1)),B("div",jy,[xe.finished_image?(L(),ve(pe,{key:0,src:p(xe,"finished_image"),fit:"cover","preview-src-list":[p(xe,"finished_image")],"preview-teleported":""},null,8,["src","preview-src-list"])):(L(),me("div",Jy,"无"))]),B("div",Qy,[M(Pe,{"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:q=>y(xe,"finished",q)},{default:b(()=>[M(_e,{size:"small",link:""},{default:b(()=>[...$[10]||($[10]=[Q("上传",-1)])]),_:1})]),_:1},8,["onChange"]),xe.finished_image?(L(),ve(_e,{key:0,size:"small",link:"",type:"danger",onClick:q=>C(xe,"finished")},{default:b(()=>[...$[11]||($[11]=[Q("删",-1)])]),_:1},8,["onClick"])):we("",!0)])]),B("div",eS,[$[15]||($[15]=B("div",{class:"cvd-asset-label"},"参考图",-1)),B("div",tS,[xe.reference_image?(L(),ve(pe,{key:0,src:p(xe,"reference_image"),fit:"cover","preview-src-list":[p(xe,"reference_image")],"preview-teleported":""},null,8,["src","preview-src-list"])):(L(),me("div",nS,"无"))]),B("div",iS,[M(Pe,{"show-file-list":!1,"auto-upload":!1,accept:"image/*",onChange:q=>y(xe,"reference",q)},{default:b(()=>[M(_e,{size:"small",link:""},{default:b(()=>[...$[13]||($[13]=[Q("上传",-1)])]),_:1})]),_:1},8,["onChange"]),xe.reference_image?(L(),ve(_e,{key:0,size:"small",link:"",type:"danger",onClick:q=>C(xe,"reference")},{default:b(()=>[...$[14]||($[14]=[Q("删",-1)])]),_:1},8,["onClick"])):we("",!0)])]),B("div",aS,[$[17]||($[17]=B("div",{class:"cvd-asset-label"},"AI 生图",-1)),B("div",sS,[xe.image_url?(L(),ve(pe,{key:0,src:p(xe,"image_url"),fit:"cover","preview-src-list":[p(xe,"image_url")],"preview-teleported":""},null,8,["src","preview-src-list"])):(L(),me("div",rS,"未生成")),xe.image_status==="generating"?(L(),me("div",oS,[M(Ie,{class:"is-loading"},{default:b(()=>[M(Fe(Cn))]),_:1}),$[16]||($[16]=B("span",{class:"cvd-loading-text"},"生成中",-1))])):we("",!0)]),B("div",lS,[M(_e,{size:"small",link:"",loading:xe.image_status==="generating",disabled:xe.image_status==="generating"||!i.selectedImageConfigId,onClick:q=>de(xe)},{default:b(()=>[Q(be(xe.image_status==="generating"?"生成中":xe.image_url?"重生":"生图"),1)]),_:2},1032,["loading","disabled","onClick"])])]),B("div",cS,[$[21]||($[21]=B("div",{class:"cvd-asset-label"},"音频",-1)),B("div",uS,[m(xe)?(L(),me("audio",{key:0,src:Fe(ei)(m(xe)),controls:"",preload:"none",class:"cvd-audio-player"},null,8,dS)):(L(),me("div",fS,"无")),xe.audio_file?(L(),me("span",hS,"马甲")):(se=i.element)!=null&&se.audio_file?(L(),me("span",pS,"沿用本体")):we("",!0)]),B("div",mS,[M(_e,{size:"small",link:"",onClick:q=>g(xe)},{default:b(()=>[...$[18]||($[18]=[Q("选择",-1)])]),_:1},8,["onClick"]),M(Pe,{"show-file-list":!1,"auto-upload":!1,accept:"audio/*",onChange:q=>y(xe,"audio",q)},{default:b(()=>[M(_e,{size:"small",link:""},{default:b(()=>[...$[19]||($[19]=[Q("上传",-1)])]),_:1})]),_:1},8,["onChange"]),xe.audio_file?(L(),ve(_e,{key:0,size:"small",link:"",type:"danger",onClick:q=>C(xe,"audio")},{default:b(()=>[...$[20]||($[20]=[Q("删",-1)])]),_:1},8,["onClick"])):we("",!0)])])]),B("div",gS,[$[26]||($[26]=B("span",{class:"cvd-volc-label"},"火山方舟素材库:",-1)),xe.volc_asset_status==="Active"?(L(),ve(ke,{key:0,type:"success",size:"small"},{default:b(()=>[...$[22]||($[22]=[Q("已加白 ✅",-1)])]),_:1})):xe.volc_asset_status==="Processing"?(L(),ve(ke,{key:1,type:"warning",size:"small"},{default:b(()=>[...$[23]||($[23]=[Q("审核中…",-1)])]),_:1})):xe.volc_asset_status==="Failed"?(L(),ve(ke,{key:2,type:"danger",size:"small"},{default:b(()=>[...$[24]||($[24]=[Q("审核失败",-1)])]),_:1})):(L(),ve(ke,{key:3,type:"info",size:"small"},{default:b(()=>[...$[25]||($[25]=[Q("未加白",-1)])]),_:1})),M(_e,{size:"small",type:"primary",plain:"",disabled:!xe.finished_image||xe.volc_asset_status==="Active"||H[xe.id],onClick:q=>oe(xe)},{default:b(()=>[Q(be(xe.volc_asset_status==="Processing"?"已提交,等待中…":xe.volc_asset_status==="Active"?"已加白":"加白入库"),1)]),_:2},1032,["disabled","onClick"]),xe.finished_image?we("",!0):(L(),me("span",vS,"需先有成品图")),xe.volc_asset_id?(L(),me("span",_S,"asset_id: "+be(xe.volc_asset_id),1)):we("",!0)])],2)}),128))]))]),i.element&&u.value?(L(),ve(ju,{key:0,modelValue:c.value,"onUpdate:modelValue":$[1]||($[1]=xe=>c.value=xe),"element-id":i.element.id,"variant-id":u.value.id,"character-name":`${i.element.name}·${u.value.variant_name}`,"bound-voice-id":d(u.value),onBound:x},null,8,["modelValue","element-id","variant-id","character-name","bound-voice-id"])):we("",!0)]),_:1},8,["modelValue","title"])}}}),yS=ka(xS,[["__scopeId","data-v-5d2b368f"]]),SS={class:"page-container"},MS={class:"card-header"},ES={class:"header-left"},bS={class:"header-model"},TS={class:"header-right"},wS={key:0,class:"progress-section team-asset-sync-progress"},AS={class:"team-asset-sync-row"},CS={class:"progress-text"},RS={key:1,class:"progress-section"},PS={class:"progress-text"},DS={key:2,class:"progress-section"},IS={class:"batch-progress-head"},LS={class:"progress-text"},US={key:0},NS={class:"tab-header"},FS={class:"tab-header-left"},OS={class:"tab-title"},BS={class:"selection-tools"},kS={class:"selection-count"},VS={class:"tab-actions"},zS={class:"element-grid"},GS={class:"element-header-section"},HS={class:"element-header"},WS={class:"element-title-group"},$S={class:"element-name"},XS={class:"element-actions"},qS={class:"chapter-source-row"},YS={class:"chapter-source-tags"},KS={class:"element-description"},ZS={class:"description-actions"},jS={key:0,class:"element-aliases"},JS={class:"tab-header"},QS={class:"tab-header-left"},eM={class:"tab-title"},tM={class:"selection-tools"},nM={class:"selection-count"},iM={class:"tab-actions"},aM={class:"element-grid"},sM={class:"element-header-section"},rM={class:"element-header"},oM={class:"element-title-group"},lM={class:"element-name"},cM={class:"element-actions"},uM={class:"chapter-source-row"},dM={class:"chapter-source-tags"},fM={class:"element-description"},hM={class:"description-actions"},pM={key:0,class:"element-aliases"},mM={class:"tab-header"},gM={class:"tab-header-left"},vM={class:"tab-title"},_M={class:"selection-tools"},xM={class:"selection-count"},yM={class:"tab-actions"},SM={class:"element-grid"},MM={class:"element-header-section"},EM={class:"element-header"},bM={class:"element-title-group"},TM={class:"element-name"},wM={class:"element-actions"},AM={class:"chapter-source-row"},CM={class:"chapter-source-tags"},RM={class:"element-description"},PM={key:0,class:"element-aliases"},DM={style:{"margin-bottom":"10px",display:"flex","align-items":"center",gap:"8px","flex-wrap":"wrap"}},IM={key:0,style:{color:"#e6a23c","font-size":"12px"}},LM={style:{color:"#909399","font-size":"12px","margin-bottom":"8px","line-height":"1.6"}},UM={key:0,class:"push-progress-panel"},NM={class:"push-progress-head"},FM={class:"push-progress-meta"},OM={key:0},BM={key:1,style:{color:"#c0c4cc"}},kM={key:0,class:"form-tip"},VM={key:0,class:"form-tip"},zM={class:"description-edit-block"},GM={key:0,class:"description-edit-actions"},HM={style:{display:"flex","flex-wrap":"wrap",gap:"4px","margin-bottom":"8px"}},WM={style:{display:"flex",gap:"8px"}},$M={class:"polish-dialog"},XM={class:"polish-target"},qM={key:0,class:"form-tip"},YM={class:"style-dialog-content"},KM={class:"style-dialog-tip"},ZM={class:"style-reference-entry"},jM={class:"visual-style-tags"},JM={class:"style-hint"},QM={class:"style-reference-workspace"},e1={class:"style-reference-section style-reference-source"},t1={class:"style-reference-section-head"},n1={class:"style-reference-count"},i1={key:0,class:"style-reference-thumbnails"},a1=["title"],s1={class:"style-reference-section style-reference-controls"},r1={class:"style-reference-control"},o1={key:0,class:"style-reference-model-empty"},l1={class:"style-reference-layout-option"},c1={class:"style-reference-section style-reference-result-editor"},u1={class:"style-reference-section-head"},d1={class:"style-reference-adapt-grid"},f1={class:"style-reference-section style-reference-preview"},h1={class:"style-reference-section-head"},p1={key:0,class:"grid-dialog-content"},m1={class:"grid-preview-section"},g1={class:"grid-preview-image"},v1={class:"grid-image-wrapper"},_1={key:0,class:"form-tip"},x1={key:0,class:"form-tip"},y1={class:"grid-dialog-tip"},S1={class:"batch-grid-dialog"},M1={class:"batch-selection-summary"},E1={key:0,class:"form-tip"},b1={style:{"margin-bottom":"16px"}},T1={key:0},w1={key:1},A1={key:2},C1={key:3,style:{color:"#909399"}},zo="extraction_view_state_v1",R1=2700*1e3,Ou="extraction_style_reference_llm_id",P1=`【真实质感 · 降噪(反 AI 塑料感)】
This image is a film still captured during a real shoot - it should appear slightly soft and imperfect like a real photograph, this softness is intentional and desired. Soft natural lighting with realistic falloff, not punchy HDR. Subtle organic film grain only, NOT heavy digital noise, NOT artificial grain overlay. Skin texture must be natural with visible pores and imperfections, NO plastic smoothing, NO beauty-filter aesthetic. Materials should look photographically captured, not 3D-rendered or AI-stylized. Slightly soft focus character with natural lens DOF, NOT digitally tack-sharp. Colors with realistic restraint, slight gray tone, NOT oversaturated, NOT HDR-pumped.
Avoid: oversharpening, artificial sharpness, heavy digital grain, HDR effect, beauty-filter skin, AI-generated aesthetic, overpolished studio look, plastic smoothing, oversaturation, glossy highlight blowout, generic AI image quality, default model aesthetic bias.`,D1=`【真实质感 · 通用降噪 · 反 AI 塑料感】

The image should feel naturally produced within its chosen visual style, with believable material texture, soft and restrained lighting, and no over-polished AI look. Keep the overall image slightly soft, organic, and visually coherent, not digitally over-sharpened.

Use natural light falloff, gentle contrast, realistic shadow transitions, and restrained colors with a slight gray cinematic tone. Avoid punchy HDR, excessive saturation, glossy highlight blowout, or artificial studio perfection.

Skin, fabric, hair, metal, wood, stone, and other materials should have clear but natural texture. Skin should not look plastic, waxy, airbrushed, or beauty-filtered. Fabric should show believable weave, folds, thickness, and weight. Hair should have natural strand structure, not helmet-like or overly smooth.

For 3D realistic / cinematic style: make it feel like a real photographed subject with subtle lens depth of field, slight optical softness, and natural imperfections.

For 3D Chinese animation style: keep the stylized character design, but materials, lighting, skin, hair, and clothing should have believable physical texture and avoid game-render plastic, cheap CG gloss, or overly smooth surfaces.

For 2D Chinese animation style: keep clean 2D line art and painted surfaces, but avoid flat generic AI coloring, excessive digital sharpness, over-smooth gradients, fake texture overlays, and overly glossy highlights. The image should feel hand-crafted, layered, and naturally painted.

Subtle organic grain or texture is allowed only when it fits the chosen style. Do not add heavy digital noise, artificial grain overlay, dirty compression artifacts, or random speckles.

Avoid: oversharpening, artificial sharpness, punchy HDR, heavy digital grain, fake noise overlay, beauty-filter skin, plastic smoothing, waxy skin, glossy CG highlights, oversaturation, overexposed highlights, cheap game-render look, generic AI image quality, default model aesthetic bias, over-polished studio look, flat lifeless coloring.`,I1=`画面风格要求:
柔焦边缘,克制的细节表达,
大色块优先
材质统一干净,避免堆砌细碎纹理,整体通透高级。参考电影摄影质感:浅景深柔光、自然胶片颗粒、Kodak Portra 400 色调,像一张精心打光的电影剧照,而不是高清数码照片。`,L1=`【视觉风格】


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

=== END ===`,Bu=`古装电视剧剧照,真人电影级写实摄影

【角色信息】
{角色信息}

【一致性约束·必须严格遵守】
所有视图中的角色为同一人,面部骨骼结构、眼型、鼻梁、唇形、脸型完全一致;
表情图中的每张脸与正视图面部特征 100% 相同,仅表情肌肉变化;
全图同一套光影逻辑、色温、透视角度,无风格突变;
色彩严格统一,无色偏,肤色/发色/服色与角色设定完全匹配。

【视图排布·按编号顺序排列在 16:9 画布内】
• 面部极致正视特写 左侧1/3
• 全身正视图
• 全身背视图
• 全身侧视图

背景白底,不拿任何道具`,ku=`场景背景图,不要出现人物。

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

=== END ===`,U1=`【道具信息】
{道具信息}

【画面构图·产品级静物】
单张产品级静物图,道具占画面中央 70%,纯净背景,无分区无拼图;
主视角(正面或 45 度斜角)呈现道具全貌,
真实比例与体积感,材质细节清晰可辨。

【视觉风格】


【画质要求】
真实电影摄影质感,自然光影,纯白/浅灰底版,无畸变,色彩克制,
无水印无文字无标注,主体无遮挡。

=== END ===`,N1=Ba({__name:"ExtractionView",setup(i){const e=re([]),t=re(null),n=re([]),a=re(!1),s=re(!1),r=re(0),l=re(""),c=re("");function u(){try{const f=JSON.parse(localStorage.getItem(zo)||"{}");if(["character","scene","prop"].includes(f.activeTab))return f.activeTab}catch{}return"character"}const h=re(u()),m=re([]),d=re([]),g=re([]),x=re(""),w=re(""),v=re(""),p=re("all"),T=re("all"),D=lt(()=>[...n.value].sort((f,o)=>f.sort_order!==o.sort_order?f.sort_order-o.sort_order:f.id-o.id)),P=lt(()=>{const f=new Map;return D.value.forEach((o,A)=>{const X=String(o.title||"").trim();f.set(Number(o.id),X?`${A+1}. ${X}`:`章节 ${A+1}`)}),f});function G(f){let o=f.chapter_ids;if(typeof o=="string")try{o=JSON.parse(o)}catch{o=[]}if(!Array.isArray(o))return[];const A=o.map(X=>Number(X)).filter(X=>Number.isSafeInteger(X)&&X>0);return[...new Set(A)]}function U(f){return P.value.get(Number(f.id))||`章节 #${f.id}`}function K(f){return P.value.get(f)||`已删除章节 #${f}`}function y(f){return f.length>18?`${f.slice(0,17)}…`:f}function C(f){const o=G(f);return o.length?o.slice(0,2).map(A=>({key:String(A),label:y(K(A))})):[{key:"unassigned",label:"未标记来源"}]}function de(f){return Math.max(0,G(f).length-2)}function H(f){const o=G(f);return o.length?`来源章节：${o.map(K).join("、")}`:"未标记来源（手工添加或旧版本素材）"}function ie(f){return!!f.trim()||p.value!=="all"||T.value!=="all"}function ae(f,o){const A=o.trim().toLowerCase();let X=A?f.filter(z=>z.name.toLowerCase().includes(A)||(z.aliases||[]).some(Ee=>Ee.toLowerCase().includes(A))):f;if(p.value==="team"?X=X.filter(z=>z.remote_source==="team_asset"):p.value==="personal"&&(X=X.filter(z=>z.remote_source!=="team_asset")),T.value==="unassigned")X=X.filter(z=>G(z).length===0);else if(typeof T.value=="number"){const z=T.value;X=X.filter(Ee=>G(Ee).includes(z))}return[...X].sort((z,Ee)=>{const Je=z.created_at||"",ot=Ee.created_at||"";return Je!==ot?ot.localeCompare(Je):(Ee.id||0)-(z.id||0)})}const oe=lt(()=>{const f=e.value.find(o=>o.id===t.value);return!!f&&f.mode==="team_script_sync"}),te=re(!1),F=re({current:0,total:0,success:0,failed:0,currentName:""});async function O(){if(!t.value)return;const f=t.value;te.value=!0,F.value={current:0,total:0,success:0,failed:0,currentName:"获取资产清单"};const o=[];try{const A=await th(f);if(F.value.total=A.total||0,!A.total){const Ee=await bc(f,[]);await Gn(f);const Je=Ee.removed>0?`云端暂无资产,已清理本地团队资产 ${Ee.removed} 个`:"云端暂无可同步资产";W.warning(Je);return}for(const Ee of A.assets){F.value.currentName=Ee.name||`资产 ${Ee.assetId}`;try{await nh(f,Ee.assetId),F.value.success+=1}catch(Je){F.value.failed+=1,o.push(`${Ee.name||Ee.assetId}: ${(Je==null?void 0:Je.message)||"未知错误"}`)}finally{F.value.current+=1}}F.value.currentName="清理本地差异";const X=await bc(f,A.assets.map(Ee=>Ee.assetId));await Gn(f);let z=`团队资产同步完成 ${F.value.success}/${F.value.total} 个`;if(X.removed>0&&(z+=`; 已清理本地多余团队资产 ${X.removed} 个`),F.value.failed>0){const Ee=o[0]||"";W.warning(`${z}; 失败 ${F.value.failed} 个${Ee?" ("+Ee+")":""}`)}else W.success(z)}catch(A){W.error((A==null?void 0:A.message)||"同步团队资产失败")}finally{te.value=!1,F.value.currentName=""}}const he=re(!1),V=re([]),$=re(null),Me=re(!1),_e=re([]),Ie=re(!1),ke=re({current:0,total:0,success:0,failed:0,currentName:""}),mt=re(null),pe=lt(()=>h.value==="scene"?d.value:h.value==="prop"?g.value:m.value),Pe=lt(()=>h.value==="scene"?"场景":h.value==="prop"?"道具":"人物");async function Le(){if(t.value){he.value=!0,_e.value=[],ke.value={current:0,total:0,success:0,failed:0,currentName:""},$.value=null,Me.value=!0;try{const f=await ih(t.value);V.value=f.groups||[],V.value.length===1&&($.value=V.value[0].groupId)}catch(f){W.error((f==null?void 0:f.message)||"拉取资产组失败"),V.value=[]}finally{Me.value=!1}}}function ut(f){_e.value=f}async function xe(){var A;if(!t.value||!$.value||_e.value.length===0)return;Ie.value=!0;const f=[..._e.value];ke.value={current:0,total:f.length,success:0,failed:0,currentName:""};const o=[];try{for(const X of f){ke.value.currentName=X.name||`元素 ${X.id}`;const z=await Qf(t.value,$.value,[X.id]);if(z.failed>0){ke.value.failed+=1;const Ee=((A=z.results.find(Je=>!Je.ok))==null?void 0:A.error)||"未知错误";o.push(`${X.name||X.id}: ${Ee}`)}else{ke.value.success+=z.submitted||1;const Ee=(z.results||[]).map(Je=>Je.audio).find(Je=>Je&&String(Je).startsWith("audio_failed"));Ee&&o.push(`${X.name||X.id} 音频未推送(${String(Ee).replace("audio_failed: ","")})`)}ke.value.current+=1}if(ke.value.currentName="",ke.value.failed>0){const X=o[0]||"";W.warning(`已提交 ${ke.value.success} 个待审,${ke.value.failed} 个失败${X?"("+X+")":""}`)}else W.success(`已提交 ${ke.value.success} 个资产到团队待审池,审核通过后入库`),he.value=!1}catch(X){W.error((X==null?void 0:X.message)||"反推失败")}finally{Ie.value=!1}}const Ye=lt(()=>ae(m.value,x.value)),It=lt(()=>ae(d.value,w.value)),se=lt(()=>ae(g.value,v.value)),q=re({character:new Set,scene:new Set,prop:new Set});function Te(f){return f==="character"?m.value:f==="scene"?d.value:g.value}function We(f){return f==="character"?Ye.value:f==="scene"?It.value:se.value}function et(f,o){q.value={...q.value,[f]:o}}function k(f,o){return q.value[f].has(o)}function _t(f,o,A){const X=new Set(q.value[f]);A?X.add(o):X.delete(o),et(f,X)}function Ve(f){return q.value[f].size}function yt(f){const o=We(f);return o.length>0&&o.every(A=>k(f,A.id))}function Ke(f){const o=We(f),A=o.filter(X=>k(f,X.id)).length;return A>0&&A<o.length}function R(f,o){const A=new Set(q.value[f]);for(const X of We(f))o?A.add(X.id):A.delete(X.id);et(f,A)}function _(f){if(f){et(f,new Set);return}q.value={character:new Set,scene:new Set,prop:new Set}}function j(f){const o=q.value[f],A=We(f).filter(Ee=>o.has(Ee.id)),X=new Set(A.map(Ee=>Ee.id)),z=Te(f).filter(Ee=>o.has(Ee.id)&&!X.has(Ee.id));return[...A,...z]}function ge(){for(const f of["character","scene","prop"]){const o=new Set(Te(f).map(A=>A.id));et(f,new Set([...q.value[f]].filter(A=>o.has(A))))}}const ye=re(!1),fe=re(null),je=re(!1),Oe=re(null);function Qe(f){Oe.value=f,je.value=!0}function rt(f){t.value&&Gn(t.value)}const Ae=re(""),Re=re([]),qe=re(null);async function tt(){try{const f=window.electronAPI;if(!(f!=null&&f.openDataDir)){W.warning("当前环境不支持打开本地目录");return}const o=await f.openDataDir("images");if(o!=null&&o.success)W.success("已打开图片目录");else{const A=(o==null?void 0:o.error)||"打开失败";W.error(`无法打开图片目录: ${A}${o!=null&&o.path?`
路径: `+o.path:""}`)}}catch(f){W.error(`打开图片目录失败: ${(f==null?void 0:f.message)||f}`)}}async function Ge(){if(qe.value=null,!!t.value)try{const f=await Vh(t.value),o=Hh(f==null?void 0:f.novel_tag_genres,"novel_tags");o?qe.value=o:f!=null&&f.script_to_novel_template_id&&(qe.value=await Wh(f.script_to_novel_template_id))}catch{}}const ct=re([]),Z=re([]),Se=re(null),Ue=re(!1),N=re(null),I=re(null),Y=re(null),ue=re(!1),Ce=re(!1),st=re("scene"),De=re(null),Ht=re(null),Vt=re(new Set),kn=re(new Set),wt=re(!1),Yt=re(null),hn=re(null),cn=re(!1),un=re(!1),dn=re(null),qt=re({current:0,total:0,type:"",currentName:"",success:0,failed:0});let En=null,Li=!1,Ui=null,Ni=!1,Fi=-1;function vi(f,o){const A=new Set(Vt.value);(o?!A.has(f):A.has(f))&&(o?A.add(f):A.delete(f),Vt.value=A,!o&&A.size===0&&!Wa()&&_i())}function yr(f,o){const A=new Set(Vt.value);let X=!1;for(const z of f)A.has(z)||(A.add(z),X=!0);X&&(Vt.value=A)}function Wa(){return[...m.value,...d.value,...g.value].some(f=>!!f.panorama_generating)}function $a(){return Vt.value.size>0||Wa()}async function Sr(){if(!Li&&t.value){if(!$a()){_i();return}Li=!0;try{await Gn(t.value)}catch{}finally{Li=!1}$a()||_i()}}function Ki(){En||(En=setInterval(Sr,5e3))}function _i(){En&&(clearInterval(En),En=null)}const E=re(!1),J=re("character"),le=re("all"),ee=re({template_id:null,llm_config_id:null,chapter_ids:[]}),ne=re(!1),ze=re(!1),$e=re(null),Be=re("character"),nt=re(),He=re({name:"",description:"",aliases:[]}),ht=re(""),gt=re(!1),it=re(null),Lt=re(""),Wt=re(""),Ft=re(""),At=re(null),en=re(!1),at=re(!1),pn=re("card"),Et=re(null),An=lt(()=>{var f;return((f=it.value)==null?void 0:f.element_type)==="scene"?"场景":"人物"}),Vn=lt(()=>{var f;return((f=it.value)==null?void 0:f.element_type)==="scene"?"例如：强化雨后庭院的湿润石板、檐下暖光、远处冷雾和前中后景层次，氛围更精致，但不要改变原地点与时段":"例如：人再帅一点，身材更好一点，气质更贵气，但不要改变原本身份和服装风格"}),Dn=re(!1),sn=re("character"),dt=re({prefix_prompt:"",suffix_prompt:""}),Kt=re(!1),zn=["character","scene","prop"],Xt=re(!1),In=re(null),Zt=re([]),Ln=re(null),Xa=re(!1),xs=re(!1),ys=re(!1),$t=re(null),qa=re([...zn]),Mr=re("character"),Ss=re({character:{prefix_prompt:"",suffix_prompt:""},scene:{prefix_prompt:"",suffix_prompt:""},prop:{prefix_prompt:"",suffix_prompt:""}}),Ya=re("");function Ql(f){return f?f.includes("古装电视剧剧照")||f.includes("真人电影级写实摄影")?"seedream":f.includes("【画质要求】")&&f.includes("多表情视图")?"gpt":"":""}async function Id(f){const o=nc.find(A=>A.value===f);if(o&&(dt.value.prefix_prompt=o.content,t.value))try{await Ja(t.value,"character",dt.value),W.success(`已切换并保存:${o.label.split("(")[0]}`)}catch(A){console.warn("[preset] 自动保存失败:",A)}}const Ld=[{label:"彩铅风格(过人脸专用风格)",prompt:"彩铅风格"},"真人电影级写实摄影","古装电视剧剧照","影视演员","好莱坞大片","欧美电影感","韩剧高级感","日系电影风","法式电影","异域风情","超写实 CG 渲染","硬科幻机甲","赛博朋克","近未来真实感","霓虹光污染","东方水墨","仙侠飘逸","古风写真","奇幻写实","暗黑哥特","工业废土","非写实非真人","插画风格","游戏原画","2D 动漫","3D 国漫"];function Ms(f){let o=(f||"").replace(/\r\n/g,`
`);if(!o)return o;for(const A of[I1,D1,P1])o=o.split(A).join("");return o.replace(/\n{3,}/g,`

`).trim()}function ec(f){return f.action==="panorama"?"批量全景 + 自动拆 9 视图":`${f.element_type==="scene"?"场景":"道具"}批量宫格图`}function Oi(f){const o=f.status==="running"||f.status==="stopping";dn.value=o?f.job_id:null,wt.value=o,Yt.value=f.action,hn.value=f.element_type,cn.value=f.stop_requested||f.status==="stopping",un.value=!1,qt.value={current:f.current,total:f.total,type:ec(f),currentName:f.current_name||"",success:f.success,failed:f.failed};const A=new Set([...f.failed_ids,...f.remaining_ids,...f.current_element_id?[f.current_element_id]:[]]);et(f.element_type,A)}function Ka(){Ui&&(clearInterval(Ui),Ui=null)}async function tc(f){if(Ka(),Oi(f),wt.value=!1,Yt.value=null,hn.value=null,cn.value=!1,dn.value=null,t.value===f.novel_id)try{await Gn(f.novel_id)}catch{}const o=Ef(f.failures||[]);f.status==="stopped"?W.warning(`批次已停止：成功 ${f.success}，失败 ${f.failed}，未处理 ${f.remaining_ids.length}`):f.failed>0||f.status==="failed"?W.warning(`批次完成：成功 ${f.success}，失败 ${f.failed}${o?`。${o}`:""}`):W.success(`${ec(f)}完成：共 ${f.success} 项`)}async function Ud(){if(!(Ni||!dn.value)){Ni=!0;try{const{job:f}=await Rc(dn.value),o=f.current!==Fi;if(Oi(f),o&&t.value===f.novel_id){Fi=f.current;try{await Gn(f.novel_id)}catch{}Oi(f)}["running","stopping"].includes(f.status)||await tc(f)}catch(f){Ka(),dn.value=null,wt.value=!1,un.value=!1,W.warning((f==null?void 0:f.message)||"批量任务状态已失效，请刷新素材状态")}finally{Ni=!1}}}function Za(){Ui||!dn.value||(Ui=setInterval(Ud,1500))}async function Er(){const f=t.value;if(!(!f||wt.value&&Yt.value==="image"))try{if(dn.value){const{job:A}=await Rc(dn.value);["running","stopping"].includes(A.status)?(Oi(A),Za()):await tc(A);return}const{job:o}=await mh(f);if(!o){Yt.value!=="image"&&(wt.value=!1,Yt.value=null,hn.value=null,cn.value=!1);return}Fi=o.current,Oi(o),Za()}catch{}}async function Nd(){if(!(un.value||cn.value)){if(cn.value=!0,!dn.value){W.info("已停止派发后续任务，正在等待当前项收尾");return}un.value=!0;try{const{job:f}=await vh(dn.value);Oi(f),W.info("停止请求已生效，当前项结束后不再执行后续卡片"),Za()}catch(f){cn.value=!1,W.error(`停止失败：${(f==null?void 0:f.message)||f}`)}finally{un.value=!1}}}const nc=[{value:"gpt",label:"人物设计稿风格模版",content:L1},{value:"seedream",label:"人物通用三视图模版",content:Bu}],Fd=Bu;function Zi(f){return f==="character"?Fd:f==="scene"?ku:U1}const Od={character:"character_visual_style",scene:"scene_visual_style",prop:"prop_visual_style"},Bd={character:"{角色信息}",scene:"{场景信息}",prop:"{道具信息}"};function kd(f){const o=$t.value;if(!o)return"";const A=(o.shared_visual_style||"").trim(),X=String(o[Od[f]]||"").trim(),z=(o.negative_prompt||"").trim(),Ee=[A];return X&&X!==A&&Ee.push(X),z&&Ee.push(/^(避免|负面约束)[：:]/.test(z)?z:`避免：${z}`),Ee.filter(Boolean).join(`
`)}function Vd(f,o,A){var Ze;const z=(f||"").replace(/\r\n/g,`
`).split(`
`),Ee=/^【[^】\r\n]+】\s*$/,Je=z.findIndex(Pt=>Pt.trim()==="【视觉风格】"),ot=o.trim().split(`
`);if(Je>=0){let Pt=Je+1;for(;Pt<z.length&&!Ee.test(z[Pt].trim());)Pt+=1;return[...z.slice(0,Je+1),...ot,"",...z.slice(Pt)].join(`
`)}let pt=[...z];if(A==="character"&&((Ze=pt[0])==null?void 0:Ze.trim())==="古装电视剧剧照,真人电影级写实摄影")for(pt.shift();pt[0]!==void 0&&!pt[0].trim();)pt.shift();const St=pt.findIndex(Pt=>Ee.test(Pt.trim()));return St>=0?[...pt.slice(0,St),"【视觉风格】",...ot,"",...pt.slice(St)].join(`
`):["【视觉风格】",...ot,"",...pt].join(`
`)}function Es(f){const o=Ss.value[f],A=((o==null?void 0:o.prefix_prompt)||"").trim()||Zi(f),X=Vd(A,kd(f),f),z=Bd[f];if(A.includes(z)&&!X.includes(z))throw new Error(`${ua[f]}模板占位符校验失败，已停止覆盖`);return X}function br(){Zt.value.forEach(f=>URL.revokeObjectURL(f.url)),Zt.value=[],In.value&&(In.value.value="")}function zd(){br(),$t.value=null,xs.value=!1,ys.value=!1}function Gd(){var f;(f=In.value)==null||f.click()}function Hd(f){var Ee;const o=f.target,A=Array.from(o.files||[]),X=Math.max(0,4-Zt.value.length),z=[];for(const Je of A.slice(0,X)){const ot=((Ee=Je.name.split(".").pop())==null?void 0:Ee.toLowerCase())||"";if(!(["image/png","image/jpeg","image/webp"].includes(Je.type)||["png","jpg","jpeg","webp"].includes(ot))){W.warning(`${Je.name} 不是支持的图片格式`);continue}if(Je.size>10*1024*1024){W.warning(`${Je.name} 超过 10MB`);continue}z.push({id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,file:Je,url:URL.createObjectURL(Je)})}Zt.value.push(...z),A.length>X&&W.warning("最多上传 4 张参考截图"),o.value=""}function Wd(f){const o=Zt.value.find(A=>A.id===f);o&&URL.revokeObjectURL(o.url),Zt.value=Zt.value.filter(A=>A.id!==f)}function $d(){var X;const f=Cr.value;if(Ln.value&&f.some(z=>z.id===Ln.value))return;const o=Number(localStorage.getItem(Ou)||"");if(o&&f.some(z=>z.id===o)){Ln.value=o;return}const A=mc();Ln.value=f.some(z=>z.id===A)?A:((X=f[0])==null?void 0:X.id)||null}async function Xd(){var f;if(!t.value){W.warning("请先选择小说");return}br(),$t.value=null,qa.value=[...zn],Mr.value=sn.value,Xa.value=!1,Xt.value=!0,ct.value.length||await pc(),$d();try{const o=await Promise.all(zn.map(async X=>{try{const z=await Ls(t.value,X),Ee=Ms(z.prefix_prompt||"");return[X,{prefix_prompt:Ee.trim()?Ee:Zi(X),suffix_prompt:z.suffix_prompt||""}]}catch{return[X,{prefix_prompt:Zi(X),suffix_prompt:""}]}})),A=Object.fromEntries(o);A[sn.value]={prefix_prompt:(f=dt.value.prefix_prompt)!=null&&f.trim()?dt.value.prefix_prompt:Zi(sn.value),suffix_prompt:dt.value.suffix_prompt||""},Ss.value=A}catch(o){W.error(`加载现有风格模板失败：${(o==null?void 0:o.message)||o}`),Xt.value=!1}}async function qd(){if(!(!t.value||!Ln.value)){if(!Zt.value.length){W.warning("请先上传参考截图");return}xs.value=!0;try{localStorage.setItem(Ou,String(Ln.value)),$t.value=await _h(t.value,Ln.value,Xa.value,Zt.value.map(f=>f.file)),W.success("截图风格分析完成，请核对融合预览")}catch(f){W.error((f==null?void 0:f.message)||"截图风格分析失败")}finally{xs.value=!1}}}async function Yd(){if(!t.value||!$t.value)return;const f=[...qa.value];if(!f.length){W.warning("请至少选择一种要应用的模板");return}ys.value=!0;const o=[];try{for(const A of f){const X=Ss.value[A],z={prefix_prompt:Es(A),suffix_prompt:X.suffix_prompt||""};await Ja(t.value,A,z),Ss.value[A]={...z},o.push(A),sn.value===A&&(dt.value={...z},A==="character"&&(Ya.value=Ql(z.prefix_prompt)))}W.success(`已融合到${o.map(A=>ua[A]).join("、")}模板`),Xt.value=!1}catch(A){const X=o.length?`；已完成：${o.map(z=>ua[z]).join("、")}`:"";W.error(`应用风格失败：${(A==null?void 0:A.message)||A}${X}`)}finally{ys.value=!1}}function Kd(f,o,A){const z={character:"{角色信息}",scene:"{场景信息}",prop:"{道具信息}"}[o];return f&&f.includes(z)?f.replace(z,A):f?`${f}
${A}`:A}async function Zd(f){if(!t.value)return"";try{const o=await Ls(t.value,"scene");let A=Ms(((o==null?void 0:o.prefix_prompt)||"").trim());const X=((o==null?void 0:o.suffix_prompt)||"").trim();return A||(A=ku),["【场景描述与风格】","以下内容按场景成品图同口径生成:风格设置模板中的【场景信息】已替换为当前场景描述;只用于定义场景结构、材质、色彩、光影和画面质感,不得改变上方 2:1 等距柱状投影、720° VR 全景、无人物空景要求。",Kd(A,"scene",f),X].filter(Boolean).join(`
`)}catch(o){return console.warn("[panorama] 加载场景风格提示词失败,将使用基础场景描述:",o),["【场景描述与风格】",f].join(`
`)}}function ic(f){return typeof f=="string"?f:f.label}function ac(f){return typeof f=="string"?f:f.prompt}const Tr=/(【视觉风格】[ \t]*\r?\n)([^\r\n]*)/;function sc(f){return f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function rc(f){const o=ac(f),A=dt.value.prefix_prompt||"",X=A.match(Tr);return X?(X[2]||"").includes(o):A.includes(o)}function jd(f){const o=ac(f),A=dt.value.prefix_prompt||"";if(!Tr.test(A)){if(A.includes(o)){let X=A.replace(new RegExp(`[、,，]?\\s*${sc(o)}\\s*[、,，]?`),"、");X=X.replace(/^[\s、,，]+/,"").replace(/[ \t、,，]+(?=\r?\n)/g,"").replace(/[、,，]{2,}/g,"、"),dt.value.prefix_prompt=X;return}dt.value.prefix_prompt=A?`${o}，${A}`:o;return}dt.value.prefix_prompt=A.replace(Tr,(X,z,Ee)=>{let Je=Ee||"";if(Je.includes(o))Je=Je.replace(new RegExp(`[、,，]?\\s*${sc(o)}\\s*[、,，]?`),"、"),Je=Je.replace(/^[\s、,，]+/,"").replace(/[\s、,，]+$/,"").replace(/[、,，]{2,}/g,"、");else{const ot=Je.trim().replace(/[、,，]$/,"");Je=ot?`${ot}、${o}`:o}return z+Je})}function Jd(){dt.value.prefix_prompt=Zi(sn.value),dt.value.suffix_prompt="",sn.value==="character"&&(Ya.value="seedream")}const bs=re(!1),ca=re(null),oc=re([]),Ts=re([]),wr=re(!1),Ar=re(!1),Qd=re(),ws=re(null),As=re("character"),lc=re(!1),ef={name:[{required:!0,message:"请输入名称",trigger:"blur"}]},tf=lt(()=>`提取${{character:"人物",scene:"场景",prop:"道具"}[J.value]}`),cc=lt(()=>{const f={character:"character_extraction",scene:"scene_extraction",prop:"prop_extraction"},o=Re.value.filter(A=>A.category===f[J.value]);return Bc(o,qe.value)}),nf=lt(()=>ee.value.template_id&&ee.value.llm_config_id&&(le.value==="all"||ee.value.chapter_ids.length>0)),af=lt(()=>{const f={character:"人物",scene:"场景",prop:"道具"};return`${ze.value?"编辑":"添加"}${f[Be.value]}`}),ua={character:"角色",scene:"场景",prop:"道具"},sf=lt(()=>`${ua[sn.value]}风格设置`),Cs=lt(()=>{const f=Re.value.filter(o=>o.category==="grid_image");return Bc(f,qe.value)}),rf=["deepseek"],Rs=lt(()=>ct.value.filter(f=>{const o=(f.provider_code||"").toLowerCase();return!rf.includes(o)})),Cr=lt(()=>ct.value.filter(f=>{const o=(f.provider_code||"").toLowerCase(),A=(f.model_name||"").toLowerCase(),X=(f.api_style||"").toLowerCase();return!(o==="deepseek"||A.includes("deepseek")||X==="gemini_native"||X==="wuyinkeji_chat"||o==="wuyinkeji"||o==="wuyinkeji_llm")})),of=lt(()=>{var f;return((f=Z.value.find(o=>o.id===Se.value))==null?void 0:f.name)||""}),uc=lt(()=>I.value&&Y.value&&Se.value),dc=lt(()=>j(st.value)),ja=lt(()=>dc.value.filter(f=>!!(f.finished_image||f.image_url)&&!f.grid_generating)),fc=lt(()=>dc.value.length-ja.value.length),lf=lt(()=>st.value==="scene"?"场景":"道具"),hc=lt(()=>!!(ja.value.length>0&&De.value&&Ht.value&&Se.value&&!wt.value)),cf=lt(()=>e.value.filter(f=>f.id!==t.value));function uf(){try{const f=localStorage.getItem(zo);return f?JSON.parse(f):null}catch{return null}}function Rr(){try{localStorage.setItem(zo,JSON.stringify({novelId:t.value,imageConfigId:Se.value,activeTab:h.value}))}catch{}}Vu(async()=>{await ff(),await pf(),await pc(),await mf();const f=uf();f&&(f.novelId&&e.value.some(o=>o.id===f.novelId)&&(t.value=f.novelId,await vc(f.novelId)),f.imageConfigId&&Z.value.some(o=>o.id===f.imageConfigId)&&(Se.value=f.imageConfigId),f.activeTab&&["character","scene","prop"].includes(f.activeTab)&&(h.value=f.activeTab)),t.value&&(await Ge(),await Er())}),pr(()=>{_i(),Ka(),br()}),$f(()=>{t.value&&Er()}),Xf(()=>{Ka()}),oi(t,async f=>{f?(await Ge(),df(f).catch(()=>{})):qe.value=null,Rr()});async function df(f){const o=["character","scene","prop"];for(const A of o)try{const X=await Ls(f,A);if(X!=null&&X.prefix_prompt&&X.prefix_prompt.trim()){const z=Ms(X.prefix_prompt);z!==X.prefix_prompt&&await Ja(f,A,{prefix_prompt:z,suffix_prompt:(X==null?void 0:X.suffix_prompt)||""});continue}await Ja(f,A,{prefix_prompt:Zi(A),suffix_prompt:(X==null?void 0:X.suffix_prompt)||""})}catch{}}oi(Se,()=>Rr()),oi(h,()=>Rr());async function ff(){try{e.value=await kh()}catch{W.error("加载小说列表失败")}}async function hf(f){try{n.value=await zh(f)}catch{W.error("加载章节列表失败")}}async function pf(){try{Re.value=await Gh()}catch{W.error("加载模板列表失败")}}async function pc(){try{ct.value=await Oc("llm"),gc()}catch{W.error("加载大模型配置失败")}}function mc(){var X;const f=ct.value||[];if(!f.length)return null;const o=Number(localStorage.getItem("polish_llm_config_id")||"");return o&&f.some(z=>z.id===o)?o:((X=f.find(z=>z.is_default===1||z.isDefault===1||z.isDefault===!0)||f[0])==null?void 0:X.id)||null}function gc(){const f=ct.value||[];At.value&&f.some(o=>o.id===At.value)||(At.value=mc())}async function mf(){try{Z.value=await Oc("image")}catch{W.error("加载图片模型配置失败")}}async function Gn(f){var o,A;a.value=!0;try{const[X,z,Ee]=await Promise.all([fa(f,"character"),fa(f,"scene"),fa(f,"prop")]),Je=St=>{for(const Ze of St)if((Ze.image_url||Ze.finished_image)&&Ze.image_status==="generating")Ze.image_status="success";else if(Ze.image_status==="generating"&&!Vt.value.has(Ze.id)&&!Ze.image_url&&!Ze.finished_image){const Pt=Date.parse(Ze.updated_at||Ze.created_at||"");Number.isFinite(Pt)&&Date.now()-Pt>R1&&(Ze.image_status="failed")}};if(Je(X),Je(z),Je(Ee),m.value=Ps(X),d.value=Ps(z),g.value=Ps(Ee),ge(),Wa()?Ki():Vt.value.size===0&&_i(),kn.value.size>0){const St=[...m.value,...d.value,...g.value];for(const Ze of[...kn.value]){const Pt=St.find(Ot=>Ot.id===Ze);Pt&&Pt.grid_image&&kn.value.delete(Ze)}for(const Ze of St)Ze.grid_generating=kn.value.has(Ze.id)}const ot=[...X,...z,...Ee],pt=ot.filter(St=>St.image_status==="generating"&&!St.image_url&&!St.finished_image).map(St=>St.id);if(pt.length>0&&yr(pt,!0),Vt.value.size>0){const St=new Set(Vt.value);let Ze=!1;for(const Pt of[...Vt.value]){const Ot=ot.find(xt=>xt.id===Pt),mn=wt.value&&Yt.value==="image"&&Ot&&!Ot.image_status&&!Ot.image_url&&!Ot.finished_image;Ot&&!mn&&(Ot.image_status!=="generating"||!!Ot.image_url||!!Ot.finished_image)&&(St.delete(Pt),Ze=!0)}Ze&&(Vt.value=St),Vt.value.size>0?Ki():_i()}}catch(X){W.error("加载提取结果失败: "+(((A=(o=X==null?void 0:X.response)==null?void 0:o.data)==null?void 0:A.detail)||(X==null?void 0:X.message)||"未知错误"))}finally{a.value=!1}}function xi(f,o=Date.now()){if(!f)return f;const A=f.replace(/([?&])t=[^&]*(&?)/,(X,z,Ee)=>z==="?"&&Ee?"?":z==="?"&&!Ee?"":Ee?z:"");return A.includes("?")?`${A}&t=${o}`:`${A}?t=${o}`}function Ps(f,o){for(const A of f){const X=A.updated_at?encodeURIComponent(String(A.updated_at)):Date.now();for(const z of["reference_image","finished_image","grid_image","panorama_url","image_url"])A[z]&&(A[z]=xi(A[z],X))}return f}async function vc(f){Ka(),dn.value=null,p.value="all",T.value="all",Yt.value!=="image"&&(wt.value=!1,Yt.value=null,hn.value=null,cn.value=!1),_(),f?(await hf(f),await Gn(f),await Ge(),await Er()):(n.value=[],m.value=[],d.value=[],g.value=[],qe.value=null)}function Pr(f){J.value=f,ee.value={template_id:null,llm_config_id:null,chapter_ids:[]},le.value="all",E.value=!0}oi(le,f=>{f==="all"&&(ee.value.chapter_ids=[])});async function gf(){if(!(!t.value||!ee.value.template_id||!ee.value.llm_config_id)){s.value=!0,r.value=0,l.value="",c.value="正在提取中...";try{const f=le.value==="all"?void 0:ee.value.chapter_ids,o=await xh({novel_id:t.value,element_type:J.value,template_id:ee.value.template_id,llm_config_id:ee.value.llm_config_id,chapter_ids:f});if(o.success)r.value=100,l.value="success",c.value=`提取完成！共提取 ${o.total_unique} 个唯一${J.value==="character"?"人物":J.value==="scene"?"场景":"道具"}`,W.success(c.value),t.value&&await Gn(t.value),setTimeout(()=>{E.value=!1,s.value=!1},1500);else throw o.code==="NO_CONVERTED_SCRIPT"?new Error(o.message||"所选章节没有转换后的剧本，请先去「剧本转换」完成转换后再提取"):new Error(o.message||"提取失败")}catch(f){r.value=100,l.value="exception",c.value=f.message||"提取失败",W.error(c.value),s.value=!1}}}function Dr(f){if(!t.value){W.warning("请先选择小说");return}ze.value=!1,$e.value=null,Be.value=f,He.value={name:"",description:"",aliases:[]},ht.value="",ne.value=!0}function Ir(f){ze.value=!0,$e.value=f.id,Be.value=f.element_type,He.value={name:f.name,description:f.description,aliases:[...f.aliases||[]]},ht.value="",ne.value=!0}function vf(f){const o=A=>{const X=A.findIndex(z=>z.id===f.id);X>=0&&(A[X]={...A[X],...f})};o(m.value),o(d.value),o(g.value)}function Lr(f,o="card",A){if(f.element_type!=="character"&&f.element_type!=="scene"){W.warning("目前仅人物和场景描述支持 AI 润色");return}const X=(A??f.description??"").trim();if(!X){W.warning(`${f.element_type==="scene"?"场景":"人物"}描述为空，无法润色`);return}it.value=f,pn.value=o,Lt.value="",Wt.value=X,Ft.value="",gc(),gt.value=!0}function _f(){if(!$e.value)return;const o=(Be.value==="scene"?d.value:m.value).find(A=>A.id===$e.value);if(!o){W.warning(`未找到当前${Be.value==="scene"?"场景":"人物"}，请刷新后重试`);return}Lr(o,"edit",He.value.description)}async function xf(){const f=it.value;if(f){if(!Wt.value.trim()){W.warning("当前描述为空，无法润色");return}if(!At.value){W.warning("请先选择大模型配置");return}en.value=!0,Et.value=f.id;try{localStorage.setItem("polish_llm_config_id",String(At.value));const o=await yh(f.id,{instruction:Lt.value.trim(),current_description:Wt.value.trim(),llm_config_id:At.value});Ft.value=o.description||"",Ft.value.trim()||W.warning("AI 润色结果为空，请重试")}catch(o){W.error((o==null?void 0:o.message)||"AI 润色失败")}finally{en.value=!1,Et.value=null}}}async function yf(){const f=it.value,o=Ft.value.trim();if(!(!f||!o)){if(pn.value==="edit"){He.value.description=o,gt.value=!1,W.success("已应用到编辑框");return}at.value=!0,Et.value=f.id;try{const A=await Nc(f.id,{description:o});vf(A),gt.value=!1,W.success(`${f.element_type==="scene"?"场景":"人物"}描述已润色并保存`)}catch(A){W.error((A==null?void 0:A.message)||"保存润色结果失败")}finally{at.value=!1,Et.value=null}}}function _c(){const f=ht.value.trim();f&&!He.value.aliases.includes(f)&&He.value.aliases.push(f),ht.value=""}async function Sf(){nt.value&&await nt.value.validate(async f=>{if(f){if(!t.value){W.warning("请先选择小说");return}try{if(ze.value&&$e.value?(await Nc($e.value,{name:He.value.name,description:He.value.description,aliases:He.value.aliases}),W.success("更新成功")):(await Uc({novel_id:t.value,element_type:Be.value,name:He.value.name,description:He.value.description,aliases:He.value.aliases}),W.success("添加成功")),ne.value=!1,t.value){const o=await fa(t.value,Be.value);Be.value==="character"?m.value=o:Be.value==="scene"?d.value=o:g.value=o}}catch{W.error(ze.value?"更新失败":"添加失败")}}})}async function Ur(f){try{if(await Ah(f.id),W.success("删除成功"),t.value){const o=await fa(t.value,f.element_type);f.element_type==="character"?m.value=o:f.element_type==="scene"?d.value=o:g.value=o}}catch{W.error("删除失败")}}async function Nr(f){if(!Se.value){W.warning("请先选择图片模型");return}vi(f.id,!0),Ki();let o=!1;try{const A=await Ch(f.id,Se.value);if(A.success)W.success("图片生成成功"),f.image_url=xi(A.image_url),f.image_status="success";else throw new Error(A.message||"生成失败")}catch(A){W.error(A.message||"图片生成失败"),f.image_status="error",o=!0}finally{if(vi(f.id,!1),t.value)try{if(await Gn(t.value),o){const X=[...m.value,...d.value,...g.value].find(z=>z.id===f.id);X&&X.image_status!=="error"&&X.image_status!=="failed"&&!X.image_url&&(X.image_status="error")}}catch{}}}async function Fr(f){try{await Fn.confirm(`只是让前端不再等结果(后端可能仍在生成)。
如果后端实际生成完成,刷新本页能看到。`,"停止等待",{type:"warning",confirmButtonText:"停止等待",cancelButtonText:"继续等"})}catch{return}vi(f.id,!1),f.image_status==="generating"&&(f.image_status=null);try{await Rh(f.id)}catch(o){console.warn("[stop-generating] 调后端 cancel-image 失败(不影响前端停止):",o)}W.info(`已停止等待 #${f.name||f.id}`)}async function Mf(f){const o=(f.description||"").trim();return["720° 全景 VR 视图,2:1 高清。","等距柱状投影 ERP,360° 全视角,上下左右无缝,VR 漫游可用,720P。","纯场景环境空镜,不要出现任何人物/角色/肢体/人脸,只渲染建筑/场景/物件/光影氛围。",await Zd(o)||`【场景描述与风格】
${o}`].filter(Boolean).join(`
`)}async function Or(f){if(!Se.value){W.warning('请先在顶部选择"图片模型配置"');return}const o=!!f.panorama_url,A=await Mf(f);let X=A;try{X=(await Fn.prompt(`${o?"⚠️ 覆盖现有全景图。":""}默认 prompt 已填充,可编辑后再生成`,o?"重新生成全景图":"生成全景图",{confirmButtonText:o?"覆盖重生成":"开始生成",cancelButtonText:"取消",inputType:"textarea",inputValue:A,inputValidator:Ee=>!!(Ee&&Ee.trim().length>5)||"至少 5 个字",customClass:"panorama-prompt-dialog"})).value||A}catch{return}f.panorama_generating=!0,Ki();try{const{generatePanorama:z}=await ss(async()=>{const{generatePanorama:Je}=await import("./extraction-Dj9Fe4Cz.js");return{generatePanorama:Je}},__vite__mapDeps([2,0,1]),import.meta.url),Ee=await z(f.id,Se.value,X);if(Ee.success&&Ee.panorama_url)f.panorama_url=xi(Ee.panorama_url),W.success("全景图生成完成");else throw new Error(Ee.message||"生成失败")}catch(z){W.error(`全景图生成失败: ${(z==null?void 0:z.message)||z}`)}finally{f.panorama_generating=!1,t.value===f.novel_id?await Gn(f.novel_id):$a()||_i()}}async function Br(f,o){const A=(o==null?void 0:o.raw)||o;if(A){if(f.panorama_url)try{await Fn.confirm(`场景「${f.name}」已有全景图,继续会替换。`,"替换全景图",{type:"warning",confirmButtonText:"替换",cancelButtonText:"取消"})}catch{return}f.panorama_uploading=!0;try{const{uploadPanorama:X}=await ss(async()=>{const{uploadPanorama:Ee}=await import("./extraction-Dj9Fe4Cz.js");return{uploadPanorama:Ee}},__vite__mapDeps([2,0,1]),import.meta.url),z=await X(f.id,A);if(z.success&&z.panorama_url)f.panorama_url=z.panorama_url,W.success("全景图上传成功");else throw new Error(z.message||"上传失败")}catch(X){W.error(`全景图上传失败: ${(X==null?void 0:X.message)||X}`)}finally{f.panorama_uploading=!1}}}async function kr(f){if(!f.panorama_url){W.warning("该场景还没全景图");return}if(f.grid_image)try{await Fn.confirm("该场景已有宫格图,继续会覆盖现有那张(VR 手动截图的也会被替换)","覆盖宫格图确认",{type:"warning",confirmButtonText:"覆盖",cancelButtonText:"取消"})}catch{return}f.panorama_grid_building=!0;try{const{panoramaToGrid:o}=await ss(async()=>{const{panoramaToGrid:X}=await import("./extraction-Dj9Fe4Cz.js");return{panoramaToGrid:X}},__vite__mapDeps([2,0,1]),import.meta.url),A=await o(f.id,9);if(A.success&&A.grid_image)f.grid_image=xi(A.grid_image),W.success(`已拆 ${A.view_count||9} 视图到宫格`);else throw new Error(A.message||"失败")}catch(o){W.error(`一键拆视角失败: ${(o==null?void 0:o.message)||o}`)}finally{f.panorama_grid_building=!1}}function Ef(f){if(!f.length)return"";const o=f.slice(0,2).join("；");return f.length>2?`${o}；另有 ${f.length-2} 项失败`:o}async function bf(){if(!Se.value){W.warning("请先选择图片模型");return}const f=j("scene");if(!f.length){W.warning("请先勾选场景卡片");return}const o=f.filter(z=>!z.panorama_generating&&!z.panorama_uploading&&!z.panorama_grid_building);if(!o.length){W.info("所选场景正在处理全景或九视图");return}const A=o.filter(z=>!!z.panorama_url).length,X=o.filter(z=>!!z.grid_image).length;try{await Fn.confirm(`将串行处理 ${o.length} 个场景：每个场景先生成全景图，再自动拆成 9 视图。${A?`
其中 ${A} 个已有全景图会被覆盖。`:""}${X?`
其中 ${X} 个已有宫格图会被覆盖。`:""}`,"批量全景 + 9 视图确认",{type:"warning",confirmButtonText:`开始生成 (${o.length})`,cancelButtonText:"取消"})}catch{return}try{const{job:z}=await Fc({novel_id:t.value,action:"panorama",element_type:"scene",element_ids:o.map(Ee=>Ee.id),config_id:Se.value});Fi=z.current,Oi(z),Za(),W.success("批量全景任务已转入后台，刷新或切换菜单不会中断")}catch(z){W.error(`批量全景启动失败：${(z==null?void 0:z.message)||z}`)}}function xc(f){var A;if(!Se.value){W.warning("请先选择图片模型");return}st.value=f;const o=j(f);if(!o.length){W.warning(`请先勾选要生成宫格图的${f==="scene"?"场景":"道具"}卡片`);return}if(!o.some(X=>!!(X.finished_image||X.image_url)&&!X.grid_generating)){W.warning("所选卡片没有可用于生成宫格的成品图/生成图");return}De.value=((A=Cs.value[0])==null?void 0:A.id)||null,Ht.value=null,Ce.value=!0}async function Tf(){if(!hc.value)return;const f=st.value,o=[...ja.value],A=Se.value,X=De.value,z=Ht.value;Ce.value=!1;try{const{job:Ee}=await Fc({novel_id:t.value,action:"grid",element_type:f,element_ids:o.map(Je=>Je.id),config_id:A,template_id:X,llm_config_id:z});Fi=Ee.current,Oi(Ee),Za(),W.success("批量宫格任务已转入后台，刷新或切换菜单不会中断")}catch(Ee){W.error(`批量宫格启动失败：${(Ee==null?void 0:Ee.message)||Ee}`)}}function Vr(f){if(!f.panorama_url){W.warning("该场景还没全景图");return}fe.value=f,Ae.value=ei(f.panorama_url),ye.value=!0}function wf(f,o){const A=X=>{const z=X.find(Ee=>Ee.id===f);z&&(z.grid_image=xi(o))};A(d.value),A(m.value),A(g.value)}async function zr(f){if(f.panorama_url){try{await Fn.confirm(`清除场景「${f.name}」的全景图?
(已拼好的宫格图 grid_image 不受影响,只是无法再调用"全景拼宫格")`,"清除全景图",{type:"warning",confirmButtonText:"清除",cancelButtonText:"取消"})}catch{return}try{const{deletePanorama:o}=await ss(async()=>{const{deletePanorama:X}=await import("./extraction-Dj9Fe4Cz.js");return{deletePanorama:X}},__vite__mapDeps([2,0,1]),import.meta.url),A=await o(f.id);if(A.success)f.panorama_url=null,W.success("全景图已清除");else throw new Error(A.message||"清除失败")}catch(o){W.error(`清除全景图失败: ${(o==null?void 0:o.message)||o}`)}}}async function Gr(f){try{const o=await Ph(f.id);if(o.success)W.success("图片已删除"),f.image_url=null,f.image_status=null;else throw new Error(o.message||"删除失败")}catch(o){W.error(o.message||"删除图片失败")}}async function Hr(f){if(!t.value){W.warning("请先选择小说");return}sn.value=f,dt.value={prefix_prompt:"",suffix_prompt:""},Dn.value=!0;try{const o=await Ls(t.value,f);dt.value=o}catch{}!dt.value.prefix_prompt||!dt.value.prefix_prompt.trim()?dt.value.prefix_prompt=Zi(f):dt.value.prefix_prompt=Ms(dt.value.prefix_prompt),f==="character"&&(Ya.value=Ql(dt.value.prefix_prompt||""))}async function Af(){if(t.value){Kt.value=!0;try{await Ja(t.value,sn.value,dt.value),W.success("风格设置已保存"),Dn.value=!1}catch{W.error("保存失败")}finally{Kt.value=!1}}}async function Wr(f){if(!t.value){W.warning("请先选择小说");return}if(!Se.value){W.warning("请先选择图片模型");return}const o={character:"人物",scene:"场景",prop:"道具"},A=j(f);if(A.length===0){W.warning(`请先勾选要生成的${o[f]}卡片`);return}const X=A.filter(ot=>!ot.finished_image&&!ot.image_url&&ot.image_status!=="generating"),z=A.length-X.length;if(X.length===0){W.info(`所选${o[f]}已有图片或正在生成`);return}try{await Fn.confirm(`已选 ${A.length} 个${o[f]}，本次生成 ${X.length} 个${z?`，跳过 ${z} 个已有图/生成中卡片`:""}。确认继续吗?`,"批量生图确认",{confirmButtonText:`确认生成(${X.length})`,cancelButtonText:"取消",type:"warning",distinguishCancelAndClose:!0})}catch{return}wt.value=!0,Yt.value="image",hn.value=f,cn.value=!1,qt.value={current:0,total:X.length,type:`${o[f]}批量生图`,currentName:"",success:0,failed:0};let Ee=0,Je=0;try{Ki();const ot=Se.value;let pt=0;const St=Math.min(2,X.length);let Ze=0,Pt=0;const Ot=async xt=>{try{const jt=await Sh(xt.id);return Object.assign(xt,jt),jt.image_status==="generating"&&!jt.image_url&&!jt.finished_image}catch{return!1}},mn=async xt=>{qt.value.currentName=xt.name||`元素 ${xt.id}`,vi(xt.id,!0);try{(await Mh(xt.id,ot)).success?(xt.image_status="generating",Ee++,Ze++,_t(f,xt.id,!1)):await Ot(xt)?(Ze++,_t(f,xt.id,!1)):(xt.image_status="error",vi(xt.id,!1),Je++)}catch{await Ot(xt)?(Ze++,_t(f,xt.id,!1)):(xt.image_status="error",vi(xt.id,!1),Je++)}finally{Pt++,qt.value.current=Pt,qt.value.success=Ze,qt.value.failed=Je}},bn=Array.from({length:St},async()=>{for(;pt<X.length&&!cn.value;){const xt=X[pt++];await mn(xt)}});await Promise.all(bn),cn.value?W.warning(`已停止后续提交：后台生成中 ${Ze}，提交失败 ${Je}，未处理 ${X.length-Pt}`):Ze>0?W.warning(`批量生图已提交：已提交 ${Ee}，提交失败 ${Je}，后台生成中 ${Ze}`):W.success(`批量生图提交完成：已提交 ${Ee}，提交失败 ${Je}`)}catch{W.error("批量生图出错")}finally{if(wt.value=!1,Yt.value=null,hn.value=null,qt.value.currentName="",t.value)try{await Gn(t.value)}catch{}}}async function $r(f,o){try{const A=o.raw;if(!A){W.error("文件读取失败");return}if(!["image/jpeg","image/png","image/webp","image/gif","image/bmp"].includes(A.type)){W.error("仅支持 JPG、PNG、WebP、GIF、BMP 格式的图片");return}const z=10*1024*1024;if(A.size>z){W.error("文件大小不能超过 10MB");return}const Ee=await Dc(f.id,A);Ee.success&&(f.reference_image=xi(Ee.reference_image),W.success("参考图上传成功"))}catch{W.error("上传参考图失败")}}async function Xr(f){try{(await Dh(f.id)).success&&(f.reference_image=null,W.success("参考图已删除"))}catch{W.error("删除参考图失败")}}async function qr(f,o){try{const A=o.raw;if(!A){W.error("文件读取失败");return}if(!["image/jpeg","image/png","image/webp","image/gif","image/bmp"].includes(A.type)){W.error("仅支持 JPG、PNG、WebP、GIF、BMP 格式的图片");return}const z=10*1024*1024;if(A.size>z){W.error("文件大小不能超过 10MB");return}const Ee=await Lc(f.id,A);Ee.success&&(f.finished_image=xi(Ee.finished_image),f.image_status=null,W.success("成品图上传成功"))}catch{W.error("上传成品图失败")}}async function Yr(f){try{(await Ih(f.id)).success&&(f.finished_image=null,W.success("成品图已删除"))}catch{W.error("删除成品图失败")}}function Kr(f){if(!Se.value){W.warning("请先选择图片模型");return}if(!f.finished_image&&!f.image_url){W.warning("该素材没有成品图或生成图，无法生成宫格图");return}N.value=f,I.value=null,Y.value=null,Ue.value=!0}function yc(){Ue.value=!1,N.value=null,I.value=null,Y.value=null,ue.value=!1}async function Cf(){if(!N.value||!uc.value)return;const f=N.value,o=Se.value,A=I.value,X=Y.value;if(!o||!A||!X){W.warning("请确保已选择图片模型、宫格提示词模板和大语言模型");return}yc(),kn.value.add(f.id),f.grid_generating=!0;try{const z=await Eh(f.id,o,A,X);if(z.success)W.success("宫格图生成成功"),f.grid_image=xi(z.grid_image);else throw new Error(z.message||"生成失败")}catch(z){const Ee=typeof z=="string"?z:(z==null?void 0:z.message)||(z==null?void 0:z.detail)||JSON.stringify(z)||"宫格图生成失败";W.error(typeof Ee=="string"?Ee:"宫格图生成失败")}finally{kn.value.delete(f.id),f.grid_generating=!1}}async function Zr(f){try{(await Lh(f.id)).success&&(f.grid_image=null,W.success("宫格图已删除"))}catch{W.error("删除宫格图失败")}}async function jr(f,o){try{const A=o.raw;if(!A){W.error("文件读取失败");return}if(!["image/jpeg","image/png","image/webp","image/gif","image/bmp"].includes(A.type)){W.error("仅支持 JPG、PNG、WebP、GIF、BMP 格式的图片");return}const z=10*1024*1024;if(A.size>z){W.error("文件大小不能超过 10MB");return}const Ee=await Ic(f.id,A);Ee.success&&(f.grid_image=xi(Ee.grid_image),W.success("宫格图上传成功"))}catch{W.error("上传宫格图失败")}}async function Jr(f){if(!t.value){W.warning("请先选择小说");return}const o={character:"人物",scene:"场景",prop:"道具"}[f];try{await Fn.confirm(`确定要清空所有${o}素材吗？此操作不可恢复。`,"确认清空",{confirmButtonText:"确定",cancelButtonText:"取消",type:"warning"})}catch{return}try{const A=await bh(t.value,f);A.success&&(W.success(A.message||"清空成功"),f==="character"?m.value=[]:f==="scene"?d.value=[]:g.value=[])}catch(A){W.error((A==null?void 0:A.message)||"清空素材失败")}}async function Qr(f,o){try{const A=o.raw;if(!A){W.error("文件读取失败");return}const X=["audio/mpeg","audio/wav","audio/x-wav","audio/mp3","audio/ogg","audio/flac","audio/x-m4a","audio/mp4"],z=[".mp3",".wav",".m4a",".ogg",".flac"],Ee=A.name.substring(A.name.lastIndexOf(".")).toLowerCase();if(!X.includes(A.type)&&!z.includes(Ee)){W.error("仅支持 MP3、WAV、M4A、OGG、FLAC 格式的音频文件");return}const Je=50*1024*1024;if(A.size>Je){W.error("文件大小不能超过 50MB");return}const ot=await Pc(f.id,A);ot.success&&(f.audio_file=ot.audio_file,f.updated_at=ot.updated_at||new Date().toISOString(),W.success("音频上传成功"))}catch{W.error("上传音频失败")}}async function eo(f){try{const o=await Uh(f.id);o.success&&(f.audio_file=null,f.voice_id=null,f.updated_at=o.updated_at||new Date().toISOString(),W.success("音频已删除"))}catch{W.error("删除音频失败")}}async function Rf(f,o){if(!f)return;const A=o||f.split("/").pop()||"image.png";await Ku(ei(f),A)}async function Pf(){if(!(!ca.value||!t.value)){wr.value=!0;try{const f=await Th(ca.value,t.value);oc.value=f.elements}catch(f){W.error("加载预览失败: "+f.message)}finally{wr.value=!1}}}function Df(f){Ts.value=f.map(o=>o.id)}async function If(){if(!(!ca.value||!t.value)){Ar.value=!0;try{const f=await wh({from_novel_id:ca.value,to_novel_id:t.value,element_ids:Ts.value});W.success(`成功同步 ${f.synced_count} 个元素`+(f.skipped_count>0?`，跳过 ${f.skipped_count} 个`:"")),bs.value=!1,await Gn(t.value)}catch(f){W.error("同步失败: "+f.message)}finally{Ar.value=!1}}}function Lf(f){const o=f==="character"?"角色":f==="scene"?"场景":"道具",A=f==="character"?"张三":f==="scene"?"客厅":"玉佩",X=[{file:`${o}_${A}.png`,slot:"成品图"},{file:`${o}_${A}_参考图.png`,slot:"参考图"}];f==="scene"?(X.push({file:`${o}_${A}_宫格图.png`,slot:"宫格图"}),X.push({file:`${o}_${A}_720.png`,slot:"全景图(720)"})):f==="prop"?X.push({file:`${o}_${A}_宫格图.png`,slot:"宫格图"}):(X.push({file:`${o}_${A}_战甲.png`,slot:"马甲「战甲」成品图"}),X.push({file:`${o}_${A}_战甲_参考图.png`,slot:"马甲「战甲」参考图"}),X.push({file:`音频_${A}.mp3`,slot:"音频(2~30秒,挂角色；生成时按模型复核)"}),X.push({file:`音频_${A}_战甲.mp3`,slot:"马甲「战甲」音频"}));const z=X.map(Ee=>`<tr><td style="padding:4px 10px;font-family:monospace;color:#409eff">${Ee.file}</td><td style="padding:4px 10px;color:#666">→ ${Ee.slot}</td></tr>`).join("");return`<div style="font-size:13px;line-height:1.7"><div style="margin-bottom:8px">文件名按 <b>「${o}_元素名_后缀」</b> 命名,导入时会自动归类到对应槽位:</div><table style="border-collapse:collapse;background:rgba(64,158,255,0.06);border-radius:6px">${z}</table><div style="margin-top:10px;color:#999;font-size:12px">· 元素不存在会自动新建;同名马甲不存在会自动创建<br>· 不符合命名规范的文件 → 整个文件名作为元素名,导入为成品图<br>· 类型前缀与当前不符(如人物页导入「场景_…」)→ 自动跳过</div></div>`}async function to(f){var A;if(!t.value){W.warning("请先选择小说");return}const o=f==="character"?"人物":f==="scene"?"场景":"道具";try{await Fn.confirm(Lf(f),`批量导入${o} · 文件命名规格`,{confirmButtonText:"选择文件导入",cancelButtonText:"取消",dangerouslyUseHTMLString:!0,customClass:"batch-import-spec-box"})}catch{return}As.value=f,ws.value&&(ws.value.value=""),(A=ws.value)==null||A.click()}const Uf={角色:"character",场景:"scene",道具:"prop"},Nf=[".mp3",".wav",".m4a",".aac",".ogg",".flac"];function Ff(f,o,A){const X=f.lastIndexOf("."),z=X>0?f.substring(0,X):f,Ee=X>0?f.substring(X).toLowerCase():"";if(Nf.includes(Ee)){const bn=z.match(/^音频_(.+)$/),xt=bn?bn[1]:z;if(o!=="character")return{recognized:!0,typeMismatch:!0,role:"audio",elementName:xt};let jt=xt,gn,Ct=null;for(const Yn of A){if(Yn.name===xt){Ct=Yn,gn=void 0;break}xt.startsWith(Yn.name+"_")&&(!Ct||Yn.name.length>Ct.name.length)&&(Ct=Yn)}return Ct&&(jt=Ct.name,Ct.name!==xt&&(gn=xt.slice(Ct.name.length+1))),{recognized:!0,role:"audio",elementName:jt,variantName:gn}}const Je=z.match(/^(角色|场景|道具)_(.+)$/);if(!Je)return{recognized:!1,role:"finished",elementName:z};if(Uf[Je[1]]!==o)return{recognized:!0,typeMismatch:!0,role:"finished",elementName:z};let pt=Je[2],St="finished";pt.endsWith("_参考图")?(St="reference",pt=pt.slice(0,-4)):pt.endsWith("_宫格图")?(St="grid",pt=pt.slice(0,-4)):pt.endsWith("_720")&&(St="panorama",pt=pt.slice(0,-4));const Ze=pt;let Pt=Ze,Ot,mn=null;for(const bn of A){if(bn.name===Ze){mn=bn,Ot=void 0;break}Ze.startsWith(bn.name+"_")&&(!mn||bn.name.length>mn.name.length)&&(mn=bn)}return mn&&(Pt=mn.name,mn.name!==Ze&&(Ot=Ze.slice(mn.name.length+1))),Ot&&(St==="grid"||St==="panorama")?{recognized:!0,invalid:"马甲无宫格/全景槽位",role:St,elementName:Pt,variantName:Ot}:St==="grid"&&o==="character"?{recognized:!0,invalid:"人物无宫格槽位",role:St,elementName:Pt}:St==="panorama"&&o!=="scene"?{recognized:!0,invalid:"仅场景有全景(720)槽位",role:St,elementName:Pt}:{recognized:!0,role:St,elementName:Pt,variantName:Ot}}async function Of(f){var Ct,Yn;const A=f.target.files;if(!A||A.length===0)return;if(!t.value){W.warning("请先选择小说");return}const X=t.value;lc.value=!0;const z=As.value;let Ee=0,Je=0,ot=0;const pt=[],St=[],Ze=As.value==="character"?m.value:As.value==="scene"?d.value:g.value,Pt=new Map;for(const Jt of Ze)Pt.set(Jt.name,Jt.id);const Ot=new Map,mn={finished:"成品图",reference:"参考图",grid:"宫格图",panorama:"全景(720)",audio:"音频"},bn=async Jt=>{const Kn=Pt.get(Jt);if(Kn!=null)return Kn;const rn=await Uc({novel_id:X,element_type:z,name:Jt,description:"",aliases:[]});return Pt.set(Jt,rn.id),Ee++,rn.id},xt=async(Jt,Kn)=>{let rn=Ot.get(Jt);rn||(rn=await Ul(Jt),Ot.set(Jt,rn));const Hn=rn.find(Bt=>Bt.variant_name===Kn);if(Hn)return Hn.id;const ni=await Yu(Jt,{variant_name:Kn});return rn.push(ni),ni.id},jt=Jt=>{if(Jt&&Jt.success===!1)throw new Error(Jt.message||"上传接口返回失败")},gn=qf.service({lock:!0,text:`正在批量导入 0/${A.length}...`,background:"rgba(0, 0, 0, 0.7)"});try{const Jt={finished:0,reference:1,grid:2,panorama:3,audio:4},Kn=Array.from(A).map((Bt,S)=>({file:Bt,index:S,parsed:Ff(Bt.name,z,Array.from(Pt.keys()).map(Ne=>({name:Ne})))})).sort((Bt,S)=>{if(Bt.parsed.typeMismatch!==S.parsed.typeMismatch)return Bt.parsed.typeMismatch?1:-1;if(!!Bt.parsed.invalid!=!!S.parsed.invalid)return Bt.parsed.invalid?1:-1;const Ne=Jt[Bt.parsed.role]-Jt[S.parsed.role];return Ne!==0?Ne:Bt.index-S.index});for(let Bt=0;Bt<Kn.length;Bt++){const{file:S,parsed:Ne}=Kn[Bt];if(Ne.typeMismatch){pt.push(`${S.name}(类型不符)`);continue}if(Ne.invalid){pt.push(`${S.name}(${Ne.invalid})`);continue}const ii=Ne.recognized?`${Ne.elementName}${Ne.variantName?"·"+Ne.variantName:""}·${mn[Ne.role]}`:Ne.elementName;gn.setText(`正在批量导入 ${Bt+1}/${A.length}: ${ii}`);try{const tn=await bn(Ne.elementName);if(Ne.role==="audio")if(Ne.variantName){const Bi=await xt(tn,Ne.variantName);jt(await Fl(Bi,S))}else jt(await Pc(tn,S));else if(Ne.variantName){const Bi=await xt(tn,Ne.variantName);Ne.role==="reference"?jt(await Nl(Bi,S)):jt(await Ol(Bi,S))}else Ne.role==="reference"?jt(await Dc(tn,S)):Ne.role==="grid"?jt(await Ic(tn,S)):Ne.role==="panorama"?jt(await gh(tn,S)):jt(await Lc(tn,S));Je++}catch(tn){console.error(`导入 ${S.name} 失败:`,tn);const Bi=((Yn=(Ct=tn==null?void 0:tn.response)==null?void 0:Ct.data)==null?void 0:Yn.detail)||(tn==null?void 0:tn.detail)||(tn==null?void 0:tn.message)||"未知错误";St.push(`${S.name}(${Bi})`),ot++}}if(t.value){const Bt=Ps(await fa(t.value,z));z==="character"?m.value=Bt:z==="scene"?d.value=Bt:g.value=Bt}const rn=z==="character"?"人物":z==="scene"?"场景":"道具",Hn=[];Ee>0&&Hn.push(`新建元素 ${Ee} 个`),Je>0&&Hn.push(`导入资产 ${Je} 张`),pt.length>0&&Hn.push(`跳过 ${pt.length} 张`),ot>0&&Hn.push(`失败 ${ot} 张`);const ni=Hn.length?Hn.join("，"):"无可导入文件";if(pt.length>0||ot>0){const Bt=Bi=>Bi.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),S=pt.slice(0,8).map(Bt);pt.length>8&&S.push(`…等 ${pt.length} 张`);const Ne=St.slice(0,8).map(Bt);St.length>8&&Ne.push(`…等 ${St.length} 张`);const ii=[];S.length&&ii.push(`被跳过的文件:<br>${S.join("<br>")}`),Ne.length&&ii.push(`失败的文件:<br>${Ne.join("<br>")}`);const tn=ii.length?`<div style="margin-top:8px;color:#999;font-size:12px;max-height:220px;overflow:auto">${ii.join("<br><br>")}</div>`:"";Fn.alert(`<div>${rn}导入完成：${Bt(ni)}</div>${tn}`,"批量导入结果",{confirmButtonText:"知道了",dangerouslyUseHTMLString:!0,type:ot>0?"warning":"info"}).catch(()=>{})}else W.success(`${rn}导入完成：${ni}`)}catch{W.error("批量导入失败")}finally{gn.close(),lc.value=!1}}return(f,o)=>{const A=ft("el-option"),X=ft("el-select"),z=ft("el-button"),Ee=ft("el-tooltip"),Je=ft("el-progress"),ot=ft("el-input"),pt=ft("el-checkbox"),St=ft("el-icon"),Ze=ft("el-tag"),Pt=ft("el-popconfirm"),Ot=ft("el-tab-pane"),mn=ft("el-tabs"),bn=ft("el-card"),xt=ft("el-table-column"),jt=ft("el-table"),gn=ft("el-dialog"),Ct=ft("el-form-item"),Yn=ft("el-radio"),Jt=ft("el-radio-group"),Kn=ft("el-checkbox-group"),rn=ft("el-form"),Hn=ft("el-image"),ni=ft("el-alert"),Bt=eh("loading");return L(),me("div",SS,[M(bn,{class:"page-card"},{header:b(()=>[B("div",MS,[B("div",ES,[o[88]||(o[88]=B("span",{class:"title"},"信息提取",-1)),M(X,{modelValue:t.value,"onUpdate:modelValue":o[0]||(o[0]=S=>t.value=S),placeholder:"选择小说",clearable:"",style:{width:"240px","margin-left":"16px"},onChange:vc},{default:b(()=>[(L(!0),me(Tt,null,Rt(e.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])]),B("div",bS,[M(X,{modelValue:Se.value,"onUpdate:modelValue":o[1]||(o[1]=S=>Se.value=S),placeholder:"选择图片模型",clearable:"",style:{width:"180px"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(Z.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])]),B("div",TS,[M(z,{type:"primary",icon:Fe(Yf),disabled:!t.value||s.value,onClick:o[2]||(o[2]=S=>Pr("character"))},{default:b(()=>[...o[89]||(o[89]=[Q(" 提取人物 ",-1)])]),_:1},8,["icon","disabled"]),M(z,{type:"success",icon:Fe(Kf),disabled:!t.value||s.value,onClick:o[3]||(o[3]=S=>Pr("scene"))},{default:b(()=>[...o[90]||(o[90]=[Q(" 提取场景 ",-1)])]),_:1},8,["icon","disabled"]),M(z,{type:"warning",icon:Fe(Zf),disabled:!t.value||s.value,onClick:o[4]||(o[4]=S=>Pr("prop"))},{default:b(()=>[...o[91]||(o[91]=[Q(" 提取道具 ",-1)])]),_:1},8,["icon","disabled"]),M(Ee,{content:"打开本地文件存储目录(按小说名分目录,内含角色/场景/道具/音频)",placement:"bottom"},{default:b(()=>[M(z,{type:"info",icon:Fe(jf),plain:"",onClick:tt},{default:b(()=>[...o[92]||(o[92]=[Q(" 文件目录 ",-1)])]),_:1},8,["icon"])]),_:1}),oe.value?(L(),ve(z,{key:0,type:"success",plain:"",icon:Fe(Pa),loading:te.value,disabled:!t.value,onClick:O},{default:b(()=>[Q(be(te.value?`同步 ${F.value.current}/${F.value.total||"?"}`:"同步团队资产"),1)]),_:1},8,["icon","loading","disabled"])):we("",!0),oe.value?(L(),ve(z,{key:1,type:"warning",plain:"",icon:Fe(Ti),disabled:!t.value,onClick:Le},{default:b(()=>[...o[93]||(o[93]=[Q(" 反推资产 ",-1)])]),_:1},8,["icon","disabled"])):we("",!0)])])]),default:b(()=>[te.value?(L(),me("div",wS,[B("div",AS,[o[94]||(o[94]=B("span",null,"同步团队资产",-1)),B("span",null,be(F.value.current)+"/"+be(F.value.total),1)]),M(Je,{percentage:F.value.total?Math.round(F.value.current/F.value.total*100):0,status:"active"},null,8,["percentage"]),B("p",CS," 当前: "+be(F.value.currentName||"准备中")+"；成功 "+be(F.value.success)+"，失败 "+be(F.value.failed),1)])):we("",!0),s.value?(L(),me("div",RS,[M(Je,{percentage:r.value,status:l.value},null,8,["percentage","status"]),B("p",PS,be(c.value),1)])):we("",!0),wt.value?(L(),me("div",DS,[B("div",IS,[B("span",null,be(qt.value.type),1),M(z,{size:"small",type:"danger",plain:"",loading:un.value,disabled:un.value||cn.value,onClick:Nd},{default:b(()=>[Q(be(cn.value?"停止中（当前项完成后停止）":"停止后续"),1)]),_:1},8,["loading","disabled"])]),M(Je,{percentage:qt.value.total?Math.round(qt.value.current/qt.value.total*100):0,status:"active"},null,8,["percentage"]),B("p",LS,[Q(be(qt.value.current)+" / "+be(qt.value.total)+" ",1),qt.value.currentName?(L(),me("span",US," · "+be(qt.value.currentName),1)):we("",!0),B("span",null," · 成功 "+be(qt.value.success)+"，失败 "+be(qt.value.failed),1)])])):we("",!0),M(mn,{modelValue:h.value,"onUpdate:modelValue":o[37]||(o[37]=S=>h.value=S),type:"border-card",class:"extraction-tabs"},{default:b(()=>[M(Ot,{label:"人物",name:"character",lazy:""},{default:b(()=>[B("div",NS,[B("div",FS,[B("span",OS,"人物列表 ("+be(ie(x.value)?Ye.value.length+"/":"")+be(m.value.length)+")",1),M(ot,{modelValue:x.value,"onUpdate:modelValue":o[5]||(o[5]=S=>x.value=S),placeholder:"搜索名称",clearable:"",size:"small",class:"tab-search","prefix-icon":Fe(no)},null,8,["modelValue","prefix-icon"]),oe.value?(L(),ve(X,{key:0,modelValue:p.value,"onUpdate:modelValue":o[6]||(o[6]=S=>p.value=S),size:"small",style:{width:"92px","margin-left":"8px"},title:"按来源筛选(个人/团队)"},{default:b(()=>[M(A,{label:"全部",value:"all"}),M(A,{label:"个人",value:"personal"}),M(A,{label:"团队",value:"team"})]),_:1},8,["modelValue"])):we("",!0),t.value?(L(),ve(X,{key:1,modelValue:T.value,"onUpdate:modelValue":o[7]||(o[7]=S=>T.value=S),class:"chapter-source-filter",size:"small",filterable:"",title:"按素材提取时记录的章节 ID 筛选"},{default:b(()=>[M(A,{label:"全部章节",value:"all"}),M(A,{label:"未标记来源",value:"unassigned"}),(L(!0),me(Tt,null,Rt(D.value,S=>(L(),ve(A,{key:S.id,label:U(S),value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])):we("",!0),B("div",BS,[M(pt,{"model-value":yt("character"),indeterminate:Ke("character"),disabled:Ye.value.length===0||wt.value,onChange:o[8]||(o[8]=S=>R("character",S))},{default:b(()=>[...o[95]||(o[95]=[Q("全选",-1)])]),_:1},8,["model-value","indeterminate","disabled"]),B("span",kS,"已选 "+be(Ve("character")),1),Ve("character")?(L(),ve(z,{key:0,link:"",type:"info",onClick:o[9]||(o[9]=S=>_("character"))},{default:b(()=>[...o[96]||(o[96]=[Q("清空",-1)])]),_:1})):we("",!0)])]),B("div",VS,[M(z,{type:"default",icon:Fe(io),size:"small",disabled:!t.value,onClick:o[10]||(o[10]=S=>Hr("character"))},{default:b(()=>[...o[97]||(o[97]=[Q(" 风格设置 ",-1)])]),_:1},8,["icon","disabled"]),M(z,{type:"info",icon:Fe($i),size:"small",disabled:!Se.value||wt.value||Ve("character")===0,loading:wt.value&&Yt.value==="image"&&hn.value==="character",onClick:o[11]||(o[11]=S=>Wr("character"))},{default:b(()=>[Q(" 批量生图 ("+be(Ve("character"))+") ",1)]),_:1},8,["icon","disabled","loading"]),M(z,{size:"small",onClick:o[12]||(o[12]=S=>to("character"))},{default:b(()=>[M(St,null,{default:b(()=>[M(Fe(Ti))]),_:1}),o[98]||(o[98]=Q(" 批量导入 ",-1))]),_:1}),t.value?(L(),ve(z,{key:0,type:"danger",size:"small",plain:"",onClick:o[13]||(o[13]=S=>Jr("character"))},{default:b(()=>[...o[99]||(o[99]=[Q(" 全部清空 ",-1)])]),_:1})):we("",!0),M(z,{type:"primary",icon:Fe(cs),size:"small",onClick:o[14]||(o[14]=S=>Dr("character"))},{default:b(()=>[...o[100]||(o[100]=[Q(" 手动添加 ",-1)])]),_:1},8,["icon"])])]),Ds((L(),me("div",zS,[(L(!0),me(Tt,null,Rt(Ye.value,S=>(L(),me("div",{key:S.id,class:yn(["element-card",{"is-selected":k("character",S.id)}])},[B("div",GS,[B("div",HS,[B("div",WS,[M(pt,{class:"card-select","model-value":k("character",S.id),disabled:wt.value,"aria-label":`选择人物 ${S.name}`,onChange:Ne=>_t("character",S.id,Ne)},null,8,["model-value","disabled","aria-label","onChange"]),B("h4",$S,be(S.name),1),S.remote_source==="team_asset"?(L(),ve(Ze,{key:0,type:"success",size:"small",effect:"dark"},{default:b(()=>[...o[101]||(o[101]=[Q("团队",-1)])]),_:1})):oe.value?(L(),ve(Ze,{key:1,type:"info",size:"small"},{default:b(()=>[...o[102]||(o[102]=[Q("个人",-1)])]),_:1})):we("",!0)]),B("div",XS,[M(z,{type:"primary",icon:Fe(ao),size:"small",onClick:Ne=>Ir(S)},null,8,["icon","onClick"]),M(Pt,{title:"确定删除此人物吗？","confirm-button-text":"确定","cancel-button-text":"取消",onConfirm:Ne=>Ur(S)},{reference:b(()=>[M(z,{type:"danger",icon:Fe(Is),size:"small"},null,8,["icon"])]),_:1},8,["onConfirm"])])]),B("div",qS,[o[103]||(o[103]=B("span",{class:"chapter-source-caption"},"来源",-1)),M(Ee,{content:H(S),placement:"top","show-after":350},{default:b(()=>[B("div",YS,[(L(!0),me(Tt,null,Rt(C(S),Ne=>(L(),ve(Ze,{key:Ne.key,size:"small",type:"info",effect:"plain",class:"chapter-source-tag"},{default:b(()=>[Q(be(Ne.label),1)]),_:2},1024))),128)),de(S)>0?(L(),ve(Ze,{key:0,size:"small",type:"info",effect:"plain",class:"chapter-source-more"},{default:b(()=>[Q(" +"+be(de(S)),1)]),_:2},1024)):we("",!0)])]),_:2},1032,["content"])]),B("p",KS,be(S.description||"暂无描述"),1),B("div",ZS,[M(z,{class:"description-polish-btn",type:"primary",plain:"",round:"",size:"small",icon:Fe($i),loading:Et.value===S.id,title:"润色人物描述，不是图片 AI 合规打标",onClick:Ne=>Lr(S,"card")},{default:b(()=>[...o[104]||(o[104]=[Q(" AI润色描述 ",-1)])]),_:1},8,["icon","loading","onClick"])]),S.aliases&&S.aliases.length>0?(L(),me("div",jS,[(L(!0),me(Tt,null,Rt(S.aliases,Ne=>(L(),ve(Ze,{key:Ne,type:"info",size:"small",style:{margin:"2px"}},{default:b(()=>[Q(be(Ne),1)]),_:2},1024))),128))])):we("",!0)]),M(oo,{element:S,"selected-image-config-id":Se.value,"generating-elements":Vt.value,onGenerate:Nr,onDeleteImage:Gr,onUploadReference:$r,onDeleteReference:Xr,onUploadFinished:qr,onDeleteFinished:Yr,onGenerateGrid:Kr,onDeleteGrid:Zr,onUploadGrid:jr,onUploadAudio:Qr,onDeleteAudio:eo,onStopGenerating:Fr,onGeneratePanorama:Or,onUploadPanorama:Br,onOpenVrViewer:Vr,onDeletePanorama:zr,onPanoramaToGrid:kr,onOpenVariants:Qe},null,8,["element","selected-image-config-id","generating-elements"])],2))),128))])),[[Bt,a.value]])]),_:1}),M(Ot,{label:"场景",name:"scene",lazy:""},{default:b(()=>[B("div",JS,[B("div",QS,[B("span",eM,"场景列表 ("+be(ie(w.value)?It.value.length+"/":"")+be(d.value.length)+")",1),M(ot,{modelValue:w.value,"onUpdate:modelValue":o[15]||(o[15]=S=>w.value=S),placeholder:"搜索名称",clearable:"",size:"small",class:"tab-search","prefix-icon":Fe(no)},null,8,["modelValue","prefix-icon"]),oe.value?(L(),ve(X,{key:0,modelValue:p.value,"onUpdate:modelValue":o[16]||(o[16]=S=>p.value=S),size:"small",style:{width:"92px","margin-left":"8px"},title:"按来源筛选(个人/团队)"},{default:b(()=>[M(A,{label:"全部",value:"all"}),M(A,{label:"个人",value:"personal"}),M(A,{label:"团队",value:"team"})]),_:1},8,["modelValue"])):we("",!0),t.value?(L(),ve(X,{key:1,modelValue:T.value,"onUpdate:modelValue":o[17]||(o[17]=S=>T.value=S),class:"chapter-source-filter",size:"small",filterable:"",title:"按素材提取时记录的章节 ID 筛选"},{default:b(()=>[M(A,{label:"全部章节",value:"all"}),M(A,{label:"未标记来源",value:"unassigned"}),(L(!0),me(Tt,null,Rt(D.value,S=>(L(),ve(A,{key:S.id,label:U(S),value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])):we("",!0),B("div",tM,[M(pt,{"model-value":yt("scene"),indeterminate:Ke("scene"),disabled:It.value.length===0||wt.value,onChange:o[18]||(o[18]=S=>R("scene",S))},{default:b(()=>[...o[105]||(o[105]=[Q("全选",-1)])]),_:1},8,["model-value","indeterminate","disabled"]),B("span",nM,"已选 "+be(Ve("scene")),1),Ve("scene")?(L(),ve(z,{key:0,link:"",type:"info",onClick:o[19]||(o[19]=S=>_("scene"))},{default:b(()=>[...o[106]||(o[106]=[Q("清空",-1)])]),_:1})):we("",!0)])]),B("div",iM,[M(z,{type:"default",icon:Fe(io),size:"small",disabled:!t.value,onClick:o[20]||(o[20]=S=>Hr("scene"))},{default:b(()=>[...o[107]||(o[107]=[Q(" 风格设置 ",-1)])]),_:1},8,["icon","disabled"]),M(z,{type:"info",icon:Fe($i),size:"small",disabled:!Se.value||wt.value||Ve("scene")===0,loading:wt.value&&Yt.value==="image"&&hn.value==="scene",onClick:o[21]||(o[21]=S=>Wr("scene"))},{default:b(()=>[Q(" 批量生图 ("+be(Ve("scene"))+") ",1)]),_:1},8,["icon","disabled","loading"]),M(z,{type:"primary",icon:Fe(ur),size:"small",disabled:!Se.value||wt.value||Ve("scene")===0,loading:wt.value&&Yt.value==="panorama",onClick:bf},{default:b(()=>[Q(" 批量全景+9视图 ("+be(Ve("scene"))+") ",1)]),_:1},8,["icon","disabled","loading"]),M(z,{type:"warning",icon:Fe(ls),size:"small",disabled:!Se.value||wt.value||Ve("scene")===0,loading:wt.value&&Yt.value==="grid"&&hn.value==="scene",onClick:o[22]||(o[22]=S=>xc("scene"))},{default:b(()=>[Q(" 批量宫格 ("+be(Ve("scene"))+") ",1)]),_:1},8,["icon","disabled","loading"]),M(z,{size:"small",onClick:o[23]||(o[23]=S=>to("scene"))},{default:b(()=>[M(St,null,{default:b(()=>[M(Fe(Ti))]),_:1}),o[108]||(o[108]=Q(" 批量导入 ",-1))]),_:1}),t.value?(L(),ve(z,{key:0,type:"danger",size:"small",plain:"",onClick:o[24]||(o[24]=S=>Jr("scene"))},{default:b(()=>[...o[109]||(o[109]=[Q(" 全部清空 ",-1)])]),_:1})):we("",!0),M(z,{type:"primary",icon:Fe(cs),size:"small",onClick:o[25]||(o[25]=S=>Dr("scene"))},{default:b(()=>[...o[110]||(o[110]=[Q(" 手动添加 ",-1)])]),_:1},8,["icon"])])]),Ds((L(),me("div",aM,[(L(!0),me(Tt,null,Rt(It.value,S=>(L(),me("div",{key:S.id,class:yn(["element-card",{"is-selected":k("scene",S.id)}])},[B("div",sM,[B("div",rM,[B("div",oM,[M(pt,{class:"card-select","model-value":k("scene",S.id),disabled:wt.value,"aria-label":`选择场景 ${S.name}`,onChange:Ne=>_t("scene",S.id,Ne)},null,8,["model-value","disabled","aria-label","onChange"]),B("h4",lM,be(S.name),1),S.remote_source==="team_asset"?(L(),ve(Ze,{key:0,type:"success",size:"small",effect:"dark"},{default:b(()=>[...o[111]||(o[111]=[Q("团队",-1)])]),_:1})):oe.value?(L(),ve(Ze,{key:1,type:"info",size:"small"},{default:b(()=>[...o[112]||(o[112]=[Q("个人",-1)])]),_:1})):we("",!0)]),B("div",cM,[M(z,{type:"primary",icon:Fe(ao),size:"small",onClick:Ne=>Ir(S)},null,8,["icon","onClick"]),M(Pt,{title:"确定删除此场景吗？","confirm-button-text":"确定","cancel-button-text":"取消",onConfirm:Ne=>Ur(S)},{reference:b(()=>[M(z,{type:"danger",icon:Fe(Is),size:"small"},null,8,["icon"])]),_:1},8,["onConfirm"])])]),B("div",uM,[o[113]||(o[113]=B("span",{class:"chapter-source-caption"},"来源",-1)),M(Ee,{content:H(S),placement:"top","show-after":350},{default:b(()=>[B("div",dM,[(L(!0),me(Tt,null,Rt(C(S),Ne=>(L(),ve(Ze,{key:Ne.key,size:"small",type:"info",effect:"plain",class:"chapter-source-tag"},{default:b(()=>[Q(be(Ne.label),1)]),_:2},1024))),128)),de(S)>0?(L(),ve(Ze,{key:0,size:"small",type:"info",effect:"plain",class:"chapter-source-more"},{default:b(()=>[Q(" +"+be(de(S)),1)]),_:2},1024)):we("",!0)])]),_:2},1032,["content"])]),B("p",fM,be(S.description||"暂无描述"),1),B("div",hM,[M(z,{class:"description-polish-btn",type:"primary",plain:"",round:"",size:"small",icon:Fe($i),loading:Et.value===S.id,title:"强化空间层次、材质光影和环境氛围，不改变原场景设定",onClick:Ne=>Lr(S,"card")},{default:b(()=>[...o[114]||(o[114]=[Q(" AI润色描述 ",-1)])]),_:1},8,["icon","loading","onClick"])]),S.aliases&&S.aliases.length>0?(L(),me("div",pM,[(L(!0),me(Tt,null,Rt(S.aliases,Ne=>(L(),ve(Ze,{key:Ne,type:"info",size:"small",style:{margin:"2px"}},{default:b(()=>[Q(be(Ne),1)]),_:2},1024))),128))])):we("",!0)]),M(oo,{element:S,"selected-image-config-id":Se.value,"generating-elements":Vt.value,onGenerate:Nr,onDeleteImage:Gr,onUploadReference:$r,onDeleteReference:Xr,onUploadFinished:qr,onDeleteFinished:Yr,onGenerateGrid:Kr,onDeleteGrid:Zr,onUploadGrid:jr,onUploadAudio:Qr,onDeleteAudio:eo,onStopGenerating:Fr,onGeneratePanorama:Or,onUploadPanorama:Br,onOpenVrViewer:Vr,onDeletePanorama:zr,onPanoramaToGrid:kr,onOpenVariants:Qe},null,8,["element","selected-image-config-id","generating-elements"])],2))),128))])),[[Bt,a.value]])]),_:1}),M(Ot,{label:"道具",name:"prop",lazy:""},{default:b(()=>[B("div",mM,[B("div",gM,[B("span",vM,"道具列表 ("+be(ie(v.value)?se.value.length+"/":"")+be(g.value.length)+")",1),M(ot,{modelValue:v.value,"onUpdate:modelValue":o[26]||(o[26]=S=>v.value=S),placeholder:"搜索名称",clearable:"",size:"small",class:"tab-search","prefix-icon":Fe(no)},null,8,["modelValue","prefix-icon"]),oe.value?(L(),ve(X,{key:0,modelValue:p.value,"onUpdate:modelValue":o[27]||(o[27]=S=>p.value=S),size:"small",style:{width:"92px","margin-left":"8px"},title:"按来源筛选(个人/团队)"},{default:b(()=>[M(A,{label:"全部",value:"all"}),M(A,{label:"个人",value:"personal"}),M(A,{label:"团队",value:"team"})]),_:1},8,["modelValue"])):we("",!0),t.value?(L(),ve(X,{key:1,modelValue:T.value,"onUpdate:modelValue":o[28]||(o[28]=S=>T.value=S),class:"chapter-source-filter",size:"small",filterable:"",title:"按素材提取时记录的章节 ID 筛选"},{default:b(()=>[M(A,{label:"全部章节",value:"all"}),M(A,{label:"未标记来源",value:"unassigned"}),(L(!0),me(Tt,null,Rt(D.value,S=>(L(),ve(A,{key:S.id,label:U(S),value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])):we("",!0),B("div",_M,[M(pt,{"model-value":yt("prop"),indeterminate:Ke("prop"),disabled:se.value.length===0||wt.value,onChange:o[29]||(o[29]=S=>R("prop",S))},{default:b(()=>[...o[115]||(o[115]=[Q("全选",-1)])]),_:1},8,["model-value","indeterminate","disabled"]),B("span",xM,"已选 "+be(Ve("prop")),1),Ve("prop")?(L(),ve(z,{key:0,link:"",type:"info",onClick:o[30]||(o[30]=S=>_("prop"))},{default:b(()=>[...o[116]||(o[116]=[Q("清空",-1)])]),_:1})):we("",!0)])]),B("div",yM,[M(z,{type:"default",icon:Fe(io),size:"small",disabled:!t.value,onClick:o[31]||(o[31]=S=>Hr("prop"))},{default:b(()=>[...o[117]||(o[117]=[Q(" 风格设置 ",-1)])]),_:1},8,["icon","disabled"]),M(z,{type:"info",icon:Fe($i),size:"small",disabled:!Se.value||wt.value||Ve("prop")===0,loading:wt.value&&Yt.value==="image"&&hn.value==="prop",onClick:o[32]||(o[32]=S=>Wr("prop"))},{default:b(()=>[Q(" 批量生图 ("+be(Ve("prop"))+") ",1)]),_:1},8,["icon","disabled","loading"]),M(z,{type:"warning",icon:Fe(ls),size:"small",disabled:!Se.value||wt.value||Ve("prop")===0,loading:wt.value&&Yt.value==="grid"&&hn.value==="prop",onClick:o[33]||(o[33]=S=>xc("prop"))},{default:b(()=>[Q(" 批量宫格 ("+be(Ve("prop"))+") ",1)]),_:1},8,["icon","disabled","loading"]),M(z,{size:"small",onClick:o[34]||(o[34]=S=>to("prop"))},{default:b(()=>[M(St,null,{default:b(()=>[M(Fe(Ti))]),_:1}),o[118]||(o[118]=Q(" 批量导入 ",-1))]),_:1}),t.value?(L(),ve(z,{key:0,type:"danger",size:"small",plain:"",onClick:o[35]||(o[35]=S=>Jr("prop"))},{default:b(()=>[...o[119]||(o[119]=[Q(" 全部清空 ",-1)])]),_:1})):we("",!0),M(z,{type:"primary",icon:Fe(cs),size:"small",onClick:o[36]||(o[36]=S=>Dr("prop"))},{default:b(()=>[...o[120]||(o[120]=[Q(" 手动添加 ",-1)])]),_:1},8,["icon"])])]),Ds((L(),me("div",SM,[(L(!0),me(Tt,null,Rt(se.value,S=>(L(),me("div",{key:S.id,class:yn(["element-card",{"is-selected":k("prop",S.id)}])},[B("div",MM,[B("div",EM,[B("div",bM,[M(pt,{class:"card-select","model-value":k("prop",S.id),disabled:wt.value,"aria-label":`选择道具 ${S.name}`,onChange:Ne=>_t("prop",S.id,Ne)},null,8,["model-value","disabled","aria-label","onChange"]),B("h4",TM,be(S.name),1),S.remote_source==="team_asset"?(L(),ve(Ze,{key:0,type:"success",size:"small",effect:"dark"},{default:b(()=>[...o[121]||(o[121]=[Q("团队",-1)])]),_:1})):oe.value?(L(),ve(Ze,{key:1,type:"info",size:"small"},{default:b(()=>[...o[122]||(o[122]=[Q("个人",-1)])]),_:1})):we("",!0)]),B("div",wM,[M(z,{type:"primary",icon:Fe(ao),size:"small",onClick:Ne=>Ir(S)},null,8,["icon","onClick"]),M(Pt,{title:"确定删除此道具吗？","confirm-button-text":"确定","cancel-button-text":"取消",onConfirm:Ne=>Ur(S)},{reference:b(()=>[M(z,{type:"danger",icon:Fe(Is),size:"small"},null,8,["icon"])]),_:1},8,["onConfirm"])])]),B("div",AM,[o[123]||(o[123]=B("span",{class:"chapter-source-caption"},"来源",-1)),M(Ee,{content:H(S),placement:"top","show-after":350},{default:b(()=>[B("div",CM,[(L(!0),me(Tt,null,Rt(C(S),Ne=>(L(),ve(Ze,{key:Ne.key,size:"small",type:"info",effect:"plain",class:"chapter-source-tag"},{default:b(()=>[Q(be(Ne.label),1)]),_:2},1024))),128)),de(S)>0?(L(),ve(Ze,{key:0,size:"small",type:"info",effect:"plain",class:"chapter-source-more"},{default:b(()=>[Q(" +"+be(de(S)),1)]),_:2},1024)):we("",!0)])]),_:2},1032,["content"])]),B("p",RM,be(S.description||"暂无描述"),1),S.aliases&&S.aliases.length>0?(L(),me("div",PM,[(L(!0),me(Tt,null,Rt(S.aliases,Ne=>(L(),ve(Ze,{key:Ne,type:"info",size:"small",style:{margin:"2px"}},{default:b(()=>[Q(be(Ne),1)]),_:2},1024))),128))])):we("",!0)]),M(oo,{element:S,"selected-image-config-id":Se.value,"generating-elements":Vt.value,onGenerate:Nr,onDeleteImage:Gr,onUploadReference:$r,onDeleteReference:Xr,onUploadFinished:qr,onDeleteFinished:Yr,onGenerateGrid:Kr,onDeleteGrid:Zr,onUploadGrid:jr,onUploadAudio:Qr,onDeleteAudio:eo,onStopGenerating:Fr,onGeneratePanorama:Or,onUploadPanorama:Br,onOpenVrViewer:Vr,onDeletePanorama:zr,onPanoramaToGrid:kr,onOpenVariants:Qe},null,8,["element","selected-image-config-id","generating-elements"])],2))),128))])),[[Bt,a.value]])]),_:1})]),_:1},8,["modelValue"])]),_:1}),M(gn,{modelValue:he.value,"onUpdate:modelValue":o[40]||(o[40]=S=>he.value=S),title:"反推资产到团队(待审)",width:"660px","destroy-on-close":"","close-on-click-modal":!Ie.value,"close-on-press-escape":!Ie.value},{footer:b(()=>[M(z,{disabled:Ie.value,onClick:o[39]||(o[39]=S=>he.value=!1)},{default:b(()=>[...o[136]||(o[136]=[Q("取消",-1)])]),_:1},8,["disabled"]),M(z,{type:"primary",loading:Ie.value,disabled:!$.value||_e.value.length===0||Ie.value,onClick:xe},{default:b(()=>[Q(be(Ie.value?`推送中 ${ke.value.current}/${ke.value.total}`:`推送 ${_e.value.length} 个`),1)]),_:1},8,["loading","disabled"])]),default:b(()=>[B("div",DM,[o[124]||(o[124]=B("span",null,"目标资产组:",-1)),M(X,{modelValue:$.value,"onUpdate:modelValue":o[38]||(o[38]=S=>$.value=S),placeholder:"选择资产组",size:"small",style:{width:"240px"},loading:Me.value},{default:b(()=>[(L(!0),me(Tt,null,Rt(V.value,S=>(L(),ve(A,{key:S.groupId,label:`${S.name}(${S.assetCount??0})`,value:S.groupId},null,8,["label","value"]))),128))]),_:1},8,["modelValue","loading"]),!Me.value&&V.value.length===0?(L(),me("span",IM,"该剧未绑定资产组,需团队主先在网页绑定")):we("",!0)]),B("div",LM,[Q(" 勾选要推送的"+be(Pe.value)+" → 进团队",1),o[125]||(o[125]=B("strong",null,"待审池",-1)),o[126]||(o[126]=Q(",owner/admin 审核通过才入库。 ",-1)),o[127]||(o[127]=B("br",null,null,-1)),o[128]||(o[128]=Q("会随成品图一起推送:人物马甲;场景/道具参考图、宫格图;场景720全景图。 ",-1)),o[129]||(o[129]=B("br",null,null,-1)),o[130]||(o[130]=Q("人物音频:角色/马甲有成品图且有音频的会一并推送(音频随角色一起进待审,审核通过角色后自动绑定)。 ",-1))]),Ie.value||ke.value.total>0?(L(),me("div",UM,[B("div",NM,[B("span",null,be(Ie.value?"正在推送":"推送完成"),1),B("span",null,be(ke.value.current)+"/"+be(ke.value.total),1)]),M(Je,{percentage:ke.value.total?Math.round(ke.value.current/ke.value.total*100):0,status:ke.value.failed>0&&!Ie.value?"warning":ke.value.current>=ke.value.total&&ke.value.total>0?"success":void 0},null,8,["percentage","status"]),B("div",FM,[B("span",null,"成功 "+be(ke.value.success)+" 个",1),B("span",null,"失败 "+be(ke.value.failed)+" 个",1),ke.value.currentName?(L(),me("span",OM,"当前: "+be(ke.value.currentName),1)):we("",!0)])])):we("",!0),M(jt,{data:pe.value,onSelectionChange:ut,"max-height":"340",size:"small",ref_key:"pushTableRef",ref:mt},{default:b(()=>[M(xt,{type:"selection",width:"44",selectable:S=>!!(S.finished_image||S.image_url)},null,8,["selectable"]),M(xt,{prop:"name",label:"名称","min-width":"140","show-overflow-tooltip":""}),M(xt,{label:"成品图",width:"76",align:"center"},{default:b(({row:S})=>[S.finished_image||S.image_url?(L(),ve(Ze,{key:0,type:"success",size:"small"},{default:b(()=>[...o[131]||(o[131]=[Q("有",-1)])]),_:1})):(L(),ve(Ze,{key:1,type:"info",size:"small"},{default:b(()=>[...o[132]||(o[132]=[Q("无",-1)])]),_:1}))]),_:1}),h.value==="character"?(L(),ve(xt,{key:0,label:"音频",width:"76",align:"center"},{default:b(({row:S})=>[S.audio_file?(L(),ve(Ze,{key:0,type:"success",size:"small"},{default:b(()=>[...o[133]||(o[133]=[Q("有",-1)])]),_:1})):(L(),me("span",BM,"—"))]),_:1})):we("",!0),M(xt,{label:"来源",width:"76",align:"center"},{default:b(({row:S})=>[S.remote_source==="team_asset"?(L(),ve(Ze,{key:0,type:"warning",size:"small"},{default:b(()=>[...o[134]||(o[134]=[Q("团队",-1)])]),_:1})):(L(),ve(Ze,{key:1,type:"info",size:"small"},{default:b(()=>[...o[135]||(o[135]=[Q("个人",-1)])]),_:1}))]),_:1})]),_:1},8,["data"])]),_:1},8,["modelValue","close-on-click-modal","close-on-press-escape"]),M(gn,{modelValue:E.value,"onUpdate:modelValue":o[46]||(o[46]=S=>E.value=S),title:tf.value,width:"600px","close-on-click-modal":!1},{footer:b(()=>[M(z,{onClick:o[45]||(o[45]=S=>E.value=!1)},{default:b(()=>[...o[140]||(o[140]=[Q("取消",-1)])]),_:1}),M(z,{type:"primary",loading:s.value,disabled:!nf.value,onClick:gf},{default:b(()=>[...o[141]||(o[141]=[Q(" 开始提取 ",-1)])]),_:1},8,["loading","disabled"])]),default:b(()=>[M(rn,{model:ee.value,"label-width":"120px"},{default:b(()=>[M(Ct,{label:"提示词模板",required:""},{default:b(()=>[M(X,{modelValue:ee.value.template_id,"onUpdate:modelValue":o[41]||(o[41]=S=>ee.value.template_id=S),placeholder:"选择模板",style:{width:"100%"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(cc.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},{default:b(()=>[B("span",null,be(S.name),1),(L(!0),me(Tt,null,Rt(Fe(so)(S,qe.value),Ne=>(L(),ve(Ze,{key:`${S.id}-${Ne}`,size:"small",type:Fe(ro)(Ne),class:"genre-tag-chip",style:{"margin-left":"6px"}},{default:b(()=>[Q(be(Ne),1)]),_:2},1032,["type"]))),128)),S.is_preset?(L(),ve(Ze,{key:0,size:"small",type:"primary",style:{"margin-left":"6px"}},{default:b(()=>[...o[137]||(o[137]=[Q("系统",-1)])]),_:1})):we("",!0)]),_:2},1032,["label","value"]))),128))]),_:1},8,["modelValue"]),cc.value.length===0?(L(),me("div",kM,' 暂无可用模板，请先到"提示词模板"页面创建 '+be(J.value==="character"?"人物提取":J.value==="scene"?"场景提取":"道具提取")+" 模板 ",1)):we("",!0)]),_:1}),M(Ct,{label:"大模型配置",required:""},{default:b(()=>[M(X,{modelValue:ee.value.llm_config_id,"onUpdate:modelValue":o[42]||(o[42]=S=>ee.value.llm_config_id=S),placeholder:"选择大模型配置",style:{width:"100%"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(ct.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"]),ct.value.length===0?(L(),me("div",VM,' 暂无可用配置，请先到"大模型配置"页面添加 ')):we("",!0)]),_:1}),M(Ct,{label:"章节范围"},{default:b(()=>[M(Jt,{modelValue:le.value,"onUpdate:modelValue":o[43]||(o[43]=S=>le.value=S)},{default:b(()=>[M(Yn,{label:"all"},{default:b(()=>[...o[138]||(o[138]=[Q("全部章节",-1)])]),_:1}),M(Yn,{label:"selected"},{default:b(()=>[...o[139]||(o[139]=[Q("指定章节",-1)])]),_:1})]),_:1},8,["modelValue"])]),_:1}),le.value==="selected"?(L(),ve(Ct,{key:0,label:"选择章节"},{default:b(()=>[M(Kn,{modelValue:ee.value.chapter_ids,"onUpdate:modelValue":o[44]||(o[44]=S=>ee.value.chapter_ids=S),class:"chapter-checkbox-group"},{default:b(()=>[(L(!0),me(Tt,null,Rt(n.value,S=>(L(),ve(pt,{key:S.id,label:S.id},{default:b(()=>[Q(be(S.title),1)]),_:2},1032,["label"]))),128))]),_:1},8,["modelValue"])]),_:1})):we("",!0)]),_:1},8,["model"])]),_:1},8,["modelValue","title"]),M(gn,{modelValue:ne.value,"onUpdate:modelValue":o[51]||(o[51]=S=>ne.value=S),title:af.value,width:"600px"},{footer:b(()=>[M(z,{onClick:o[50]||(o[50]=S=>ne.value=!1)},{default:b(()=>[...o[144]||(o[144]=[Q("取消",-1)])]),_:1}),M(z,{type:"primary",onClick:Sf},{default:b(()=>[...o[145]||(o[145]=[Q("保存",-1)])]),_:1})]),default:b(()=>[M(rn,{model:He.value,"label-width":"100px",rules:ef,ref_key:"editFormRef",ref:nt},{default:b(()=>[M(Ct,{label:"名称",prop:"name",required:""},{default:b(()=>[M(ot,{modelValue:He.value.name,"onUpdate:modelValue":o[47]||(o[47]=S=>He.value.name=S),placeholder:"请输入名称"},null,8,["modelValue"])]),_:1}),M(Ct,{label:"描述"},{default:b(()=>[B("div",zM,[M(ot,{modelValue:He.value.description,"onUpdate:modelValue":o[48]||(o[48]=S=>He.value.description=S),type:"textarea",rows:Be.value==="character"?8:4,placeholder:"请输入描述"},null,8,["modelValue","rows"]),Be.value==="character"||Be.value==="scene"?(L(),me("div",GM,[M(z,{type:"primary",plain:"",size:"small",icon:Fe($i),disabled:!ze.value||!$e.value,loading:Et.value===$e.value,onClick:_f},{default:b(()=>[...o[142]||(o[142]=[Q(" AI润色 ",-1)])]),_:1},8,["icon","disabled","loading"])])):we("",!0)])]),_:1}),M(Ct,{label:"别名"},{default:b(()=>[B("div",HM,[(L(!0),me(Tt,null,Rt(He.value.aliases,(S,Ne)=>(L(),ve(Ze,{key:Ne,closable:"",onClose:ii=>He.value.aliases.splice(Ne,1),type:"info"},{default:b(()=>[Q(be(S),1)]),_:2},1032,["onClose"]))),128))]),B("div",WM,[M(ot,{modelValue:ht.value,"onUpdate:modelValue":o[49]||(o[49]=S=>ht.value=S),placeholder:"输入别名后按回车添加",size:"small",style:{width:"200px"},onKeyup:Jf(_c,["enter"])},null,8,["modelValue"]),M(z,{type:"primary",size:"small",onClick:_c},{default:b(()=>[...o[143]||(o[143]=[Q("添加",-1)])]),_:1})])]),_:1})]),_:1},8,["model"])]),_:1},8,["modelValue","title"]),M(gn,{modelValue:gt.value,"onUpdate:modelValue":o[57]||(o[57]=S=>gt.value=S),title:`AI润色${An.value}描述`,width:"680px","close-on-click-modal":!1},{footer:b(()=>[M(z,{onClick:o[56]||(o[56]=S=>gt.value=!1)},{default:b(()=>[...o[146]||(o[146]=[Q("取消",-1)])]),_:1}),M(z,{loading:en.value,disabled:ct.value.length===0||!At.value,onClick:xf},{default:b(()=>[...o[147]||(o[147]=[Q(" 生成润色结果 ",-1)])]),_:1},8,["loading","disabled"]),M(z,{type:"primary",disabled:!Ft.value.trim(),loading:at.value,onClick:yf},{default:b(()=>[Q(be(pn.value==="edit"?"应用到编辑框":"应用并保存"),1)]),_:1},8,["disabled","loading"])]),default:b(()=>{var S;return[B("div",$M,[B("div",XM,[B("span",null,be(An.value),1),B("strong",null,be(((S=it.value)==null?void 0:S.name)||"未选择"),1)]),M(rn,{"label-position":"top"},{default:b(()=>[M(Ct,{label:"大模型配置"},{default:b(()=>[M(X,{modelValue:At.value,"onUpdate:modelValue":o[52]||(o[52]=Ne=>At.value=Ne),placeholder:"选择本次润色使用的大模型",filterable:"",style:{width:"100%"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(ct.value,Ne=>(L(),ve(A,{key:Ne.id,label:`${Ne.name} - ${Ne.model_name}`,value:Ne.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"]),ct.value.length===0?(L(),me("div",qM," 暂无可用大模型配置，请先到“设置 - 大模型配置”添加。 ")):we("",!0)]),_:1}),M(Ct,{label:"润色要求"},{default:b(()=>[M(ot,{modelValue:Lt.value,"onUpdate:modelValue":o[53]||(o[53]=Ne=>Lt.value=Ne),type:"textarea",rows:3,placeholder:Vn.value},null,8,["modelValue","placeholder"])]),_:1}),M(Ct,{label:"当前描述"},{default:b(()=>[M(ot,{modelValue:Wt.value,"onUpdate:modelValue":o[54]||(o[54]=Ne=>Wt.value=Ne),type:"textarea",rows:4,disabled:""},null,8,["modelValue"])]),_:1}),M(Ct,{label:"润色结果"},{default:b(()=>[M(ot,{modelValue:Ft.value,"onUpdate:modelValue":o[55]||(o[55]=Ne=>Ft.value=Ne),type:"textarea",rows:6,placeholder:"点击“生成润色结果”后在这里预览，可手动微调后再应用。"},null,8,["modelValue"])]),_:1})]),_:1})])]}),_:1},8,["modelValue","title"]),M(gn,{modelValue:Dn.value,"onUpdate:modelValue":o[61]||(o[61]=S=>Dn.value=S),title:sf.value,width:"600px","close-on-click-modal":!1},{footer:b(()=>[M(z,{onClick:o[60]||(o[60]=S=>Dn.value=!1)},{default:b(()=>[...o[154]||(o[154]=[Q("取消",-1)])]),_:1}),M(z,{type:"primary",loading:Kt.value,onClick:Af},{default:b(()=>[...o[155]||(o[155]=[Q("保存",-1)])]),_:1},8,["loading"])]),default:b(()=>[B("div",YM,[B("p",KM," 设置本作品的"+be(ua[sn.value])+"生成风格，这些设置将应用于所有"+be(ua[sn.value])+"生成 ",1),B("div",ZM,[o[149]||(o[149]=B("div",null,[B("strong",null,"不知道截图对应什么风格？"),B("span",null,"上传参考截图，分析后可同步融合到人物、场景、道具模板。")],-1)),M(z,{type:"primary",plain:"",icon:Fe(ur),onClick:Xd},{default:b(()=>[...o[148]||(o[148]=[Q(" 截图反推风格 ",-1)])]),_:1},8,["icon"])]),M(rn,{"label-width":"100px"},{default:b(()=>[sn.value==="character"?(L(),ve(Ct,{key:0,label:"模板预设"},{default:b(()=>[M(X,{modelValue:Ya.value,"onUpdate:modelValue":o[58]||(o[58]=S=>Ya.value=S),style:{width:"100%"},onChange:Id,placeholder:"选预设会覆盖下方完整提示词"},{default:b(()=>[(L(),me(Tt,null,Rt(nc,S=>M(A,{key:S.value,label:S.label,value:S.value},null,8,["label","value"])),64))]),_:1},8,["modelValue"]),o[150]||(o[150]=B("div",{class:"style-hint"},"切换预设会**覆盖**下方完整提示词;选完仍可自由编辑。",-1))]),_:1})):we("",!0),M(Ct,{label:"视觉风格"},{default:b(()=>[B("div",jM,[(L(),me(Tt,null,Rt(Ld,S=>M(Ze,{key:ic(S),type:rc(S)?"primary":"info",effect:rc(S)?"dark":"plain",class:"visual-style-tag",onClick:Ne=>jd(S)},{default:b(()=>[Q(be(ic(S)),1)]),_:2},1032,["type","effect","onClick"])),64))]),o[151]||(o[151]=B("div",{class:"style-hint"},'点击标签快速插入到"视觉风格"段落;下方模板可完整自由编辑。',-1))]),_:1}),M(Ct,{label:"完整提示词"},{default:b(()=>[M(ot,{modelValue:dt.value.prefix_prompt,"onUpdate:modelValue":o[59]||(o[59]=S=>dt.value.prefix_prompt=S),type:"textarea",rows:18,placeholder:"首次打开自动填入预制模板，你可以自由修改",class:"style-prompt-textarea"},null,8,["modelValue"]),B("div",JM,[o[153]||(o[153]=Q(" 生成图片时会自动把【角色信息】/【场景信息】/【道具信息】替换为每个元素的描述，其余部分原样保留。 ",-1)),M(z,{size:"small",link:"",type:"primary",onClick:Jd},{default:b(()=>[...o[152]||(o[152]=[Q("恢复默认模板",-1)])]),_:1})])]),_:1})]),_:1})])]),_:1},8,["modelValue","title"]),M(gn,{modelValue:Xt.value,"onUpdate:modelValue":o[74]||(o[74]=S=>Xt.value=S),title:"截图反推风格预设",width:"min(1080px, 94vw)","close-on-click-modal":!1,"append-to-body":"",class:"style-reference-dialog",onClosed:zd},{footer:b(()=>[M(z,{onClick:o[73]||(o[73]=S=>Xt.value=!1)},{default:b(()=>[...o[167]||(o[167]=[Q("取消",-1)])]),_:1}),M(z,{loading:xs.value,disabled:!Zt.value.length||!Ln.value,onClick:qd},{default:b(()=>[Q(be($t.value?"重新分析":"分析截图"),1)]),_:1},8,["loading","disabled"]),M(z,{type:"primary",loading:ys.value,disabled:!$t.value||!qa.value.length,onClick:Yd},{default:b(()=>[...o[168]||(o[168]=[Q(" 应用到选中模板 ",-1)])]),_:1},8,["loading","disabled"])]),default:b(()=>[B("div",QM,[B("section",e1,[B("div",t1,[o[156]||(o[156]=B("div",null,[B("h3",null,"参考截图"),B("p",null,"支持 PNG、JPEG、WebP，最多 4 张，每张不超过 10MB。图片只用于本次分析，不写入素材库。")],-1)),B("span",n1,be(Zt.value.length)+"/4",1)]),B("input",{ref_key:"styleReferenceFileInput",ref:In,class:"style-reference-file-input",type:"file",accept:"image/png,image/jpeg,image/webp",multiple:"",onChange:Hd},null,544),B("button",{type:"button",class:"style-reference-dropzone",onClick:Gd},[M(St,null,{default:b(()=>[M(Fe(Ti))]),_:1}),o[157]||(o[157]=B("span",null,"选择参考截图",-1)),o[158]||(o[158]=B("small",null,"优先上传能看清主体、光影、材质和色彩关系的画面",-1))]),Zt.value.length?(L(),me("div",i1,[(L(!0),me(Tt,null,Rt(Zt.value,(S,Ne)=>(L(),me("div",{key:S.id,class:"style-reference-thumbnail"},[M(Hn,{src:S.url,"preview-src-list":Zt.value.map(ii=>ii.url),"initial-index":Ne,fit:"cover","preview-teleported":""},null,8,["src","preview-src-list","initial-index"]),B("div",{class:"style-reference-file-name",title:S.file.name},be(S.file.name),9,a1),M(z,{class:"style-reference-remove",icon:Fe(Is),circle:"",size:"small",type:"danger","aria-label":"移除截图",onClick:Rn(ii=>Wd(S.id),["stop"])},null,8,["icon","onClick"])]))),128))])):we("",!0)]),B("section",s1,[B("div",r1,[o[159]||(o[159]=B("label",null,"视觉大语言模型",-1)),M(X,{modelValue:Ln.value,"onUpdate:modelValue":o[62]||(o[62]=S=>Ln.value=S),filterable:"",placeholder:"选择能识别图片的大语言模型"},{default:b(()=>[(L(!0),me(Tt,null,Rt(Cr.value,S=>(L(),ve(A,{key:S.id,label:`${S.name} - ${S.model_name}`,value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"]),Cr.value.length?we("",!0):(L(),me("span",o1," 暂无可用视觉模型，请先配置支持图片输入的 OpenAI 兼容大语言模型。 "))]),B("div",l1,[M(pt,{modelValue:Xa.value,"onUpdate:modelValue":o[63]||(o[63]=S=>Xa.value=S)},{default:b(()=>[...o[160]||(o[160]=[Q("同时分析版式语言",-1)])]),_:1},8,["modelValue"]),o[161]||(o[161]=B("span",null,"默认关闭；开启后只输出版式建议，不会覆盖人物视图、场景单图或道具静物的现有排版。",-1))])]),$t.value?(L(),me(Tt,{key:0},[B("section",c1,[B("div",u1,[o[162]||(o[162]=B("div",null,[B("h3",null,"分析结果"),B("p",null,"可先修改分析文字，下方融合预览会同步更新。")],-1)),M(Ze,{type:"success",effect:"plain"},{default:b(()=>[Q(be($t.value.preset_name||"截图风格预设"),1)]),_:1})]),M(rn,{"label-position":"top"},{default:b(()=>[M(Ct,{label:"风格摘要"},{default:b(()=>[M(ot,{modelValue:$t.value.summary,"onUpdate:modelValue":o[64]||(o[64]=S=>$t.value.summary=S),maxlength:"600","show-word-limit":""},null,8,["modelValue"])]),_:1}),M(Ct,{label:"共享视觉母版"},{default:b(()=>[M(ot,{modelValue:$t.value.shared_visual_style,"onUpdate:modelValue":o[65]||(o[65]=S=>$t.value.shared_visual_style=S),type:"textarea",rows:4},null,8,["modelValue"])]),_:1}),B("div",d1,[M(Ct,{label:"人物适配"},{default:b(()=>[M(ot,{modelValue:$t.value.character_visual_style,"onUpdate:modelValue":o[66]||(o[66]=S=>$t.value.character_visual_style=S),type:"textarea",rows:3},null,8,["modelValue"])]),_:1}),M(Ct,{label:"场景适配"},{default:b(()=>[M(ot,{modelValue:$t.value.scene_visual_style,"onUpdate:modelValue":o[67]||(o[67]=S=>$t.value.scene_visual_style=S),type:"textarea",rows:3},null,8,["modelValue"])]),_:1}),M(Ct,{label:"道具适配"},{default:b(()=>[M(ot,{modelValue:$t.value.prop_visual_style,"onUpdate:modelValue":o[68]||(o[68]=S=>$t.value.prop_visual_style=S),type:"textarea",rows:3},null,8,["modelValue"])]),_:1})]),M(Ct,{label:"通用负面约束"},{default:b(()=>[M(ot,{modelValue:$t.value.negative_prompt,"onUpdate:modelValue":o[69]||(o[69]=S=>$t.value.negative_prompt=S),type:"textarea",rows:2},null,8,["modelValue"])]),_:1}),Xa.value||$t.value.layout_style?(L(),ve(Ct,{key:0,label:"版式建议（仅供参考，不自动写入模板）"},{default:b(()=>[M(ot,{modelValue:$t.value.layout_style,"onUpdate:modelValue":o[70]||(o[70]=S=>$t.value.layout_style=S),type:"textarea",rows:2},null,8,["modelValue"])]),_:1})):we("",!0)]),_:1}),$t.value.warnings.length?(L(),ve(ni,{key:0,type:"warning",closable:!1,"show-icon":"",title:$t.value.warnings.join("；")},null,8,["title"])):we("",!0)]),B("section",f1,[B("div",h1,[o[166]||(o[166]=B("div",null,[B("h3",null,"融合预览"),B("p",null,"只替换对应模板的【视觉风格】段；占位符、一致性、视图排版、构图和画质段全部保留。")],-1)),M(Kn,{modelValue:qa.value,"onUpdate:modelValue":o[71]||(o[71]=S=>qa.value=S),class:"style-reference-scopes"},{default:b(()=>[M(pt,{value:"character"},{default:b(()=>[...o[163]||(o[163]=[Q("人物",-1)])]),_:1}),M(pt,{value:"scene"},{default:b(()=>[...o[164]||(o[164]=[Q("场景",-1)])]),_:1}),M(pt,{value:"prop"},{default:b(()=>[...o[165]||(o[165]=[Q("道具",-1)])]),_:1})]),_:1},8,["modelValue"])]),M(mn,{modelValue:Mr.value,"onUpdate:modelValue":o[72]||(o[72]=S=>Mr.value=S)},{default:b(()=>[M(Ot,{label:"人物模板",name:"character"},{default:b(()=>[M(ot,{"model-value":Es("character"),type:"textarea",rows:14,readonly:""},null,8,["model-value"])]),_:1}),M(Ot,{label:"场景模板",name:"scene"},{default:b(()=>[M(ot,{"model-value":Es("scene"),type:"textarea",rows:14,readonly:""},null,8,["model-value"])]),_:1}),M(Ot,{label:"道具模板",name:"prop"},{default:b(()=>[M(ot,{"model-value":Es("prop"),type:"textarea",rows:14,readonly:""},null,8,["model-value"])]),_:1})]),_:1},8,["modelValue"])])],64)):we("",!0)])]),_:1},8,["modelValue"]),M(gn,{modelValue:Ue.value,"onUpdate:modelValue":o[78]||(o[78]=S=>Ue.value=S),title:"制作宫格图",width:"500px","close-on-click-modal":!1},{footer:b(()=>[M(z,{onClick:yc,disabled:ue.value},{default:b(()=>[...o[171]||(o[171]=[Q("取消",-1)])]),_:1},8,["disabled"]),M(z,{type:"primary",loading:ue.value,disabled:!uc.value,onClick:Cf},{default:b(()=>[Q(be(ue.value?"生成中...":"确认生成"),1)]),_:1},8,["loading","disabled"])]),default:b(()=>[N.value?(L(),me("div",p1,[B("div",m1,[o[169]||(o[169]=B("div",{class:"grid-preview-label"},"素材图片预览：",-1)),B("div",g1,[B("div",v1,[M(Hn,{src:(()=>{const S=N.value.finished_image||N.value.image_url;return Fe(ei)(S)})(),"preview-src-list":(()=>{const S=N.value.finished_image||N.value.image_url;return S?[Fe(ei)(S)]:[]})(),fit:"cover","preview-teleported":"",style:{width:"200px",height:"200px","border-radius":"8px",cursor:"pointer"}},null,8,["src","preview-src-list"]),B("div",{class:"grid-download-btn",onClick:o[75]||(o[75]=Rn(S=>Rf(N.value.finished_image||N.value.image_url,N.value.name+"_素材.png"),["stop"])),title:"下载素材"},[M(St,null,{default:b(()=>[M(Fe(Pa))]),_:1})])])])]),M(rn,{"label-width":"140px",style:{"margin-top":"20px"}},{default:b(()=>[M(Ct,{label:"宫格提示词模板",required:""},{default:b(()=>[M(X,{modelValue:I.value,"onUpdate:modelValue":o[76]||(o[76]=S=>I.value=S),placeholder:"选择宫格提示词模板",style:{width:"100%"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(Cs.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},{default:b(()=>[B("span",null,be(S.name),1),(L(!0),me(Tt,null,Rt(Fe(so)(S,qe.value),Ne=>(L(),ve(Ze,{key:`${S.id}-${Ne}`,size:"small",type:Fe(ro)(Ne),class:"genre-tag-chip",style:{"margin-left":"6px"}},{default:b(()=>[Q(be(Ne),1)]),_:2},1032,["type"]))),128)),S.is_preset?(L(),ve(Ze,{key:0,size:"small",type:"primary",style:{"margin-left":"6px"}},{default:b(()=>[...o[170]||(o[170]=[Q("系统",-1)])]),_:1})):we("",!0)]),_:2},1032,["label","value"]))),128))]),_:1},8,["modelValue"]),Cs.value.length===0?(L(),me("div",_1,' 暂无可用模板，请先到"提示词模板"页面创建 category=grid_image 的模板 ')):we("",!0)]),_:1}),M(Ct,{label:"大语言模型",required:""},{default:b(()=>[M(X,{modelValue:Y.value,"onUpdate:modelValue":o[77]||(o[77]=S=>Y.value=S),placeholder:"选择大语言模型",style:{width:"100%"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(Rs.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"]),Rs.value.length===0?(L(),me("div",x1,' 暂无可用配置，请先到"大模型配置"页面添加 ')):we("",!0)]),_:1})]),_:1}),B("div",y1,[M(ni,{title:"生成流程说明",type:"info",closable:!1,description:"1. 使用LLM根据模板和素材描述生成详细图片提示词  2. 使用图片模型基于提示词和成品图生成宫格图"})])])):we("",!0)]),_:1},8,["modelValue"]),M(gn,{modelValue:Ce.value,"onUpdate:modelValue":o[82]||(o[82]=S=>Ce.value=S),title:"批量生成宫格图",width:"560px","close-on-click-modal":!1,"close-on-press-escape":!wt.value},{footer:b(()=>[M(z,{onClick:o[81]||(o[81]=S=>Ce.value=!1),disabled:wt.value},{default:b(()=>[...o[174]||(o[174]=[Q("取消",-1)])]),_:1},8,["disabled"]),M(z,{type:"warning",loading:wt.value&&Yt.value==="grid",disabled:!hc.value,onClick:Tf},{default:b(()=>[Q(" 生成所选宫格 ("+be(ja.value.length)+") ",1)]),_:1},8,["loading","disabled"])]),default:b(()=>[B("div",S1,[B("div",M1,[B("div",null,[o[172]||(o[172]=B("span",{class:"summary-label"},"生成对象",-1)),B("strong",null,be(lf.value)+" · "+be(ja.value.length)+" 张",1)]),B("div",null,[o[173]||(o[173]=B("span",{class:"summary-label"},"图片模型",-1)),B("strong",null,be(of.value||"未选择"),1)])]),fc.value>0?(L(),ve(ni,{key:0,type:"warning",closable:!1,title:`${fc.value} 个所选卡片没有成品图/生成图，将自动跳过`,style:{"margin-bottom":"16px"}},null,8,["title"])):we("",!0),M(rn,{"label-width":"130px"},{default:b(()=>[M(Ct,{label:"宫格提示词模板",required:""},{default:b(()=>[M(X,{modelValue:De.value,"onUpdate:modelValue":o[79]||(o[79]=S=>De.value=S),placeholder:"选择宫格提示词模板",style:{width:"100%"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(Cs.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},{default:b(()=>[B("span",null,be(S.name),1),(L(!0),me(Tt,null,Rt(Fe(so)(S,qe.value),Ne=>(L(),ve(Ze,{key:`batch-${S.id}-${Ne}`,size:"small",type:Fe(ro)(Ne),class:"genre-tag-chip",style:{"margin-left":"6px"}},{default:b(()=>[Q(be(Ne),1)]),_:2},1032,["type"]))),128))]),_:2},1032,["label","value"]))),128))]),_:1},8,["modelValue"])]),_:1}),M(Ct,{label:"大语言模型",required:""},{default:b(()=>[M(X,{modelValue:Ht.value,"onUpdate:modelValue":o[80]||(o[80]=S=>Ht.value=S),placeholder:"选择用于分析素材图的大语言模型",style:{width:"100%"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(Rs.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"]),Rs.value.length===0?(L(),me("div",E1,"暂无可用视觉大语言模型，请先到大模型配置添加")):we("",!0)]),_:1})]),_:1}),M(ni,{title:"所选卡片将严格串行处理，已有宫格图会被新结果覆盖；失败项保留勾选，便于再次执行。",type:"info",closable:!1})])]),_:1},8,["modelValue","close-on-press-escape"]),M(gn,{modelValue:bs.value,"onUpdate:modelValue":o[85]||(o[85]=S=>bs.value=S),title:"从其他小说同步",width:"700px"},{footer:b(()=>[M(z,{onClick:o[84]||(o[84]=S=>bs.value=!1)},{default:b(()=>[...o[178]||(o[178]=[Q("取消",-1)])]),_:1}),M(z,{type:"primary",onClick:If,disabled:Ts.value.length===0,loading:Ar.value},{default:b(()=>[Q(" 同步 "+be(Ts.value.length)+" 个元素 ",1)]),_:1},8,["disabled","loading"])]),default:b(()=>[B("div",b1,[o[175]||(o[175]=B("span",null,"来源小说：",-1)),M(X,{modelValue:ca.value,"onUpdate:modelValue":o[83]||(o[83]=S=>ca.value=S),placeholder:"选择来源小说",onChange:Pf,style:{width:"300px"}},{default:b(()=>[(L(!0),me(Tt,null,Rt(cf.value,S=>(L(),ve(A,{key:S.id,label:S.name,value:S.id},null,8,["label","value"]))),128))]),_:1},8,["modelValue"])]),Ds((L(),me("div",null,[M(jt,{data:oc.value,onSelectionChange:Df,ref_key:"syncTableRef",ref:Qd,style:{width:"100%"},"max-height":"400"},{default:b(()=>[M(xt,{type:"selection",width:"50",selectable:S=>!S.exists_in_target},null,8,["selectable"]),M(xt,{label:"类型",width:"80"},{default:b(({row:S})=>[M(Ze,{type:S.element_type==="character"?"primary":S.element_type==="scene"?"success":"warning",size:"small"},{default:b(()=>[Q(be(S.element_type==="character"?"人物":S.element_type==="scene"?"场景":"道具"),1)]),_:2},1032,["type"])]),_:1}),M(xt,{prop:"name",label:"名称",width:"120"}),M(xt,{prop:"description",label:"描述","show-overflow-tooltip":""}),M(xt,{label:"资源",width:"120"},{default:b(({row:S})=>[S.has_finished_image?(L(),me("span",T1,"🖼️")):we("",!0),S.has_grid_image?(L(),me("span",w1,"📐")):we("",!0),S.has_audio?(L(),me("span",A1,"🔊")):we("",!0),!S.has_finished_image&&!S.has_grid_image&&!S.has_audio?(L(),me("span",C1,"无")):we("",!0)]),_:1}),M(xt,{label:"状态",width:"100"},{default:b(({row:S})=>[S.exists_in_target?(L(),ve(Ze,{key:0,type:"info",size:"small"},{default:b(()=>[...o[176]||(o[176]=[Q("已存在",-1)])]),_:1})):(L(),ve(Ze,{key:1,type:"success",size:"small"},{default:b(()=>[...o[177]||(o[177]=[Q("可同步",-1)])]),_:1}))]),_:1})]),_:1},8,["data"])])),[[Bt,wr.value]])]),_:1},8,["modelValue"]),B("input",{ref_key:"batchFileInput",ref:ws,type:"file",multiple:"",accept:".png,.jpg,.jpeg,.webp,.gif,.bmp",style:{display:"none"},onChange:Of},null,544),fe.value?(L(),ve(Gy,{key:Ae.value,modelValue:ye.value,"onUpdate:modelValue":o[86]||(o[86]=S=>ye.value=S),"element-id":fe.value.id,"element-name":fe.value.name,"panorama-url":Ae.value,"has-existing-grid":!!fe.value.grid_image,onScreenshotSaved:wf},null,8,["modelValue","element-id","element-name","panorama-url","has-existing-grid"])):we("",!0),M(yS,{modelValue:je.value,"onUpdate:modelValue":o[87]||(o[87]=S=>je.value=S),element:Oe.value,"selected-image-config-id":Se.value,onChanged:rt},null,8,["modelValue","element","selected-image-config-id"])])}}}),G1=ka(N1,[["__scopeId","data-v-80c1d708"]]);export{G1 as default};
