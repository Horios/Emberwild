/* Test-build editor and balance JSON lifecycle for text rarity presets. */
(()=>{
  const TEXT_EFFECTS={
    glow:'光暈',shadow:'深色陰影',light:'浮雕高光',crisp:'細描邊',
    softGlow:'柔和光暈',hardShadow:'硬邊陰影',longShadow:'長陰影',emboss:'浮雕',engrave:'內刻',outlineLight:'亮色描邊',outlineDark:'暗色描邊',
    neon:'霓虹光',fire:'火焰光',ice:'冰霜光',chromatic:'紅藍色差',toxicGlow:'毒液光',voidGlow:'虛空光',holyGlow:'聖光',bloodGlow:'血色光',electricGlow:'電弧光',
    rainbow:'彩虹文字',flow:'彩色流光',aurora:'極光流動',gold:'金屬金',silver:'金屬銀',bronze:'青銅',copper:'紅銅',roseGold:'玫瑰金',chrome:'鉻金屬',holo:'全息幻彩',shimmer:'文字掃光',
    obsidian:'黑曜石',magma:'熔岩',frost:'冰晶',electric:'電流',toxic:'毒液',void:'虛空',sunset:'夕照',ocean:'海洋',forest:'翠綠',ruby:'紅寶石',sapphire:'藍寶石',emerald:'翡翠',candy:'糖果彩',plasma:'電漿',cosmic:'星雲',
    alphaDemo:'展示・半透明',warmGradientDemo:'展示・暖色漸層',movingRainbowDemo:'展示・動態彩虹',
    multiGlowDemo:'展示・多層光暈',breatheGoldDemo:'展示・金色呼吸光',goldShineDemo:'展示・黃金掃光',
    strokeShadowDemo:'展示・描邊＋陰影',ultimateDemo:'展示・終極彩光',maxEnhanceDemo:'展示・滿強化彩字',
    blink:'閃爍',flicker:'燈管閃動',pulse:'呼吸亮度',glitch:'科技故障',jitter:'微抖動',float:'上下浮動',shake:'震動',bounce:'彈跳',sway:'左右搖擺',swing:'鐘擺',tilt:'傾斜擺動',zoom:'縮放呼吸',heartbeat:'心跳',hue:'色相循環',blur:'失焦脈動',stretch:'水平伸縮',flip:'翻轉',
    ...globalThis.__EMBERWILD_GALLERY_EFFECTS
  };
  const BLOCK_EFFECTS={
    gradient:'漸層反光',stripes:'斜紋',inset:'內側微光',glass:'玻璃質感',
    grid:'科技網格',scanlines:'掃描線',dots:'點陣',carbon:'碳纖紋',
    aurora:'極光流動',shimmer:'流光掃過',spotlight:'聚光',checker:'棋盤格',
    radial:'放射光',vignette:'暗角',diagonal:'斜向光帶',crosshatch:'交叉網紋',hex:'蜂巢',circuit:'電路板',rings:'同心波紋',
    stars:'星點',sparkle:'閃爍星光',prism:'稜鏡彩光',rainbow:'彩虹漸層',holo:'全息薄膜',
    chrome:'鉻金屬',brushed:'拉絲金屬',gold:'金屬金',silver:'金屬銀',bronze:'青銅金屬',
    magma:'熔岩',frost:'冰霜',ocean:'水波',toxic:'毒霧',void:'虛空',plasma:'電漿',electric:'電流',
    matrix:'資料雨',glitch:'數位故障',warning:'警示斜紋',pulse:'呼吸光',movingStripes:'流動斜紋',waves:'波紋流動',noise:'顆粒雜訊',
    mesh:'漸層網格',sunset:'夕照',emerald:'翡翠流光',blood:'血色脈動',holy:'聖光',shadow:'暗影流動'
  };
  const BLOCK_PRESETS={
    midnightAurora:{label:'深夜極光',color:'#14213d',effect:'aurora'},
    stellarNight:{label:'星夜微光',color:'#11182f',effect:'stars'},
    cosmicVoid:{label:'星雲虛空',color:'#140d2d',effect:'void'},
    hologram:{label:'全息夜色',color:'#18243a',effect:'holo'},
    prism:{label:'稜鏡幻彩',color:'#28223d',effect:'prism'},
    neonCircuit:{label:'霓虹電路',color:'#0c2430',effect:'circuit'},
    electricBlue:{label:'電流藍',color:'#122846',effect:'electric'},
    matrixGreen:{label:'資料矩陣',color:'#10291d',effect:'matrix'},
    frostCrystal:{label:'冰晶霧藍',color:'#19354b',effect:'frost'},
    deepOcean:{label:'深海流光',color:'#12364a',effect:'ocean'},
    emerald:{label:'翡翠秘境',color:'#14382d',effect:'emerald'},
    toxicMist:{label:'毒霧幽綠',color:'#26351e',effect:'toxic'},
    holyGold:{label:'聖光鎏金',color:'#40341c',effect:'holy'},
    royalGold:{label:'皇家金屬',color:'#3d2e17',effect:'gold'},
    moonSilver:{label:'月銀金屬',color:'#303942',effect:'silver'},
    antiqueBronze:{label:'古銅遺物',color:'#422c20',effect:'bronze'},
    chrome:{label:'冷冽鉻銀',color:'#2b343b',effect:'chrome'},
    magma:{label:'熔岩核心',color:'#3a1712',effect:'magma'},
    bloodMoon:{label:'血月暗紅',color:'#36131b',effect:'blood'},
    plasma:{label:'電漿紫光',color:'#251b3e',effect:'plasma'},
    sunset:{label:'暮色霞光',color:'#44283e',effect:'sunset'},
    shadow:{label:'暗影紫霧',color:'#181420',effect:'shadow'},
    glass:{label:'夜色玻璃',color:'#213344',effect:'glass'},
    carbon:{label:'黑鋼碳纖',color:'#24282d',effect:'carbon'}
  };
  const BORDER_EFFECTS={
    glow:'外框光暈',dashed:'虛線',double:'雙線',dotted:'點線',groove:'凹槽',
    inset:'內凹',neon:'霓虹外框',rainbow:'彩虹循環',pulse:'光暈脈動',electric:'電流閃動',march:'行進虛線'
  };
  const COLOR_KEYS=['textColor','blockColor','borderColor'];
  const EFFECT_KEYS={textEffect1:TEXT_EFFECTS,textEffect2:TEXT_EFFECTS,blockEffect:BLOCK_EFFECTS,borderEffect:BORDER_EFFECTS};
  const empty=id=>({id,name:'',textColor:'',textEffect1:'',textEffect2:'',blockColor:'',blockEffect:'',borderColor:'',borderEffect:''});
  let selectedId='',draft=null,seenStyles=null;
  const current=()=>globalThis.__EMBERWILD_TEXT_STYLES||[];
  function validatedStyles(input){
    if(input===undefined)return [];
    if(!Array.isArray(input)||input.length>200)throw Error('文字稀有度資料無效');
    const ids=new Set();
    return input.map(raw=>{
      if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(raw.id)||ids.has(raw.id)||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>60)throw Error('文字稀有度 ID 或名稱無效／重複');
      ids.add(raw.id);
      const out=empty(raw.id);out.name=raw.name.trim();
      for(const key of COLOR_KEYS){const value=raw[key]??'';if(value!==''&&!(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)))throw Error('文字稀有度顏色無效：'+key);out[key]=value;}
      for(const [key,choices] of Object.entries(EFFECT_KEYS)){const value=raw[key]??'';if(value!==''&&!Object.hasOwn(choices,value))throw Error('文字稀有度特效無效：'+key);out[key]=value;}
      return out;
    });
  }
  function validateReferences(doc,styles){
    const ids=new Set(styles.map(x=>x.id));
    const check=(obj,label)=>{if(obj?.textStyleId!==undefined&&(typeof obj.textStyleId!=='string'||obj.textStyleId!==''&&!ids.has(obj.textStyleId)))throw Error(label+' 指向不存在的文字稀有度');};
    for(const [job,slots] of (doc.equipmentForms||[]).entries())for(const [slot,forms] of (slots||[]).entries())for(const [i,form] of (forms||[]).entries())check(form,`裝備 ${job}-${slot}-${i}`);
    for(const boss of doc.equipmentPowerSystem?.bossAffixes||[])check(boss,'BOSS 裝備 '+boss.id);
    check(doc.equipmentPowerSystem?.rerollItem,'強度重鑄石');
    for(const item of doc.items||[])check(item,'道具 '+item.id);
  }
  const baseValidate=validateBalanceConfig;
  validateBalanceConfig=function(input){const styles=validatedStyles(input?.textStyles);validateReferences(input,styles);const result=baseValidate(input);result.textStyles=styles;return result;};
  const baseExport=exportableBalance;
  exportableBalance=function(){const out=baseExport();out.textStyles=structuredClone(current());out.notes=[...(out.notes||[]),'textStyles 以 id 定義顯示樣式；equipmentForms / equipmentPowerSystem.bossAffixes / items 的 textStyleId 選擇套用。省略或空字串時使用原有外觀，既有存檔不會儲存樣式副本。'];return out;};
  const baseApply=applyBalanceConfig;
  applyBalanceConfig=function(input,options={}){
    const candidate=validateBalanceConfig(input),out=baseApply(candidate,{...options,persist:false});
    setTextRarityStyles(candidate.textStyles);
    if(options.persist!==false)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));
    if(state)render();
    return out;
  };
  const baseReset=resetBalanceJSON;
  resetBalanceJSON=function(){const out=baseReset();setTextRarityStyles([]);if(state)render();return out;};

  function styleForGear(g){
    if(!g)return null;
    let id='';
    if(g.boss!==undefined){
      const group=MAPS[g.region]?.parallel?'parallel':'legacy',family=Math.max(0,Math.min(5,Number(g.boss)||0)),high=(Number(g.tier)||1)>6?'high':'low';
      id=globalThis.__EMBERWILD_EQUIPMENT_POWER?.bossAffixes?.find(x=>x.id===`${group}_${high}_${family}`)?.textStyleId||'';
    }else id=g.starterPack?.textStyleId||itemForm(g)?.textStyleId||'';
    return textRarityStyleById(id);
  }
  globalThis.textRarityEquipmentRowColor=g=>textRarityBlockPresentation(styleForGear(g)).bg;
  globalThis.textRarityEquipmentBlockPresentation=g=>textRarityBlockPresentation(styleForGear(g));
  const baseNameHTML=equipmentNameHTML;
  equipmentNameHTML=function(g){
    const html=baseNameHTML(g),style=styleForGear(g);
    if(!style)return html;
    const {textClasses}=textRarityPresentation(style);
    const named=html.replace(/class="enhanced-name ([^"]*)"/,(_,original)=>`class="enhanced-name ${textClasses} ${original}"`);
    return textRarityFrameHTML(named,style);
  };
  function applyEquipmentBlockStyles(){
    if(typeof filteredGear!=='function'||!document.querySelectorAll)return;
    const rows=[...document.querySelectorAll('.inline-equipment-list > .inline-equipment')];
    if(!rows.length)return;
    const gear=filteredGear();
    rows.forEach((row,i)=>{
      const p=textRarityEquipmentBlockPresentation(gear[i]);
      if(!p||(!p.bg&&!p.block))return;
      row.classList.add('tr-rarity-row');
      if(p.block)row.classList.add('tr-block-'+p.block);
      if(p.bg)row.style.setProperty('--tr-row-bg',p.bg);
      if(p.animation)row.style.animation=p.animation;
    });
  }
  const textRarityRenderBase=render;
  render=function(){const out=textRarityRenderBase();applyEquipmentBlockStyles();return out;};

  function opts(values,value){
    const entries=Object.entries(values),option=([id,label])=>`<option value="${id}" ${value===id?'selected':''}>${label}</option>`;
    const usual=entries.filter(([id])=>!id.startsWith('gallery')).map(option).join('');
    const gallery=entries.filter(([id])=>id.startsWith('gallery')).map(option).join('');
    return `<option value="" ${!value?'selected':''}>無特效</option>`+usual+(gallery?`<optgroup label="文字特效圖鑑">${gallery}</optgroup>`:'');
  }
  function colorField(key,label,defaultColor){const value=draft[key];return `<label>${label}<span class="text-rarity-color"><input type="checkbox" data-color-on="${key}" ${value?'checked':''}> 自訂 <input type="color" data-color="${key}" value="${value||defaultColor}" ${value?'':'disabled'}></span></label>`;}
  function blockPresetId(style){return Object.entries(BLOCK_PRESETS).find(([,p])=>style?.blockColor===p.color&&style?.blockEffect===p.effect)?.[0]||'';}
  function blockPresetField(){const currentPreset=blockPresetId(draft);return `<label>裝備區塊背景預設<select data-block-preset><option value="">自訂／不套用預設</option>${Object.entries(BLOCK_PRESETS).map(([id,p])=>`<option value="${id}" ${currentPreset===id?'selected':''}>${p.label}</option>`).join('')}</select></label>`;}
  function field(key,label,choices){return `<label>${label}<select data-effect="${key}">${opts(choices,draft[key])}</select></label>`;}
  function preview(){
    const {textClasses}=textRarityPresentation(draft),name=`<span class="${textClasses}">${esc(draft.name||'預覽文字')}</span>`;
    const row=textRarityBlockPresentation(draft),sample=textRarityFrameHTML(name,draft);
    return `<div class="text-rarity-preview tr-preview-pair"><div class="tr-preview-section"><span class="small">左側裝備列表</span><div class="tr-preview-row ${row.classes}"${row.attrs}>${sample}<span class="small">普通</span></div></div><div class="tr-preview-section"><span class="small">右側裝備詳細</span><div class="tr-preview-detail">${sample}</div></div></div>`;
  }
  function referenceCount(id){const doc=exportableBalance();let n=0;for(const slots of doc.equipmentForms||[])for(const forms of slots||[])for(const x of forms||[])if(x.textStyleId===id)n++;for(const x of doc.equipmentPowerSystem?.bossAffixes||[])if(x.textStyleId===id)n++;for(const x of doc.items||[])if(x.textStyleId===id)n++;return n;}
  function view(){
    const list=current();if(list!==seenStyles){seenStyles=list;draft=null;}
    if(!draft&&list.length){selectedId=list.some(x=>x.id===selectedId)?selectedId:list[0].id;draft=structuredClone(list.find(x=>x.id===selectedId));}
    return heading('TEXT RARITY / 外觀設計','文字稀有度設計器')+`<section class="panel text-rarity-editor"><div class="text-rarity-head"><p class="small">建立樣式後，在平衡設計器的裝備、BOSS 裝備及各道具欄位套用；測試設定 JSON 可雙向匯入、匯出。未選顏色與特效的欄位沿用原有外觀。裝備區塊背景色與背景特效會套用到裝備列表的整個區塊，右側詳細頁不套用；文字外框只包住名稱。若選兩種彩色填色或兩種畫廊外觀，以文字特效 1 優先。</p><button onclick="newTextRarity()">新增新文字特效</button></div><div class="text-rarity-layout"><div class="text-rarity-list">${list.map(x=>`<button class="${selectedId===x.id?'primary':''}" onclick="selectTextRarity('${x.id}')">${esc(x.name)}</button>`).join('')||'<span class="small">目前沒有自訂特效</span>'}</div>${draft?`<div class="text-rarity-form"><label>特效命名<input id="textRarityName" maxlength="60" value="${esc(draft.name)}"></label>${colorField('textColor','文字顏色','#e8edf0')}${field('textEffect1','文字特效 1',TEXT_EFFECTS)}${field('textEffect2','文字特效 2',TEXT_EFFECTS)}${blockPresetField()}${colorField('blockColor','裝備區塊背景色','#263f55')}${field('blockEffect','裝備區塊背景特效',BLOCK_EFFECTS)}${colorField('borderColor','文字外框顏色','#8ecaff')}${field('borderEffect','文字外框特效',BORDER_EFFECTS)}<div id="textRarityPreview">${preview()}</div><div class="actions"><button class="primary" id="saveTextRarity">儲存</button>${list.some(x=>x.id===draft.id)?'<button class="danger" id="deleteTextRarity">刪除</button>':''}</div></div>`:'<div class="small">點選「新增新文字特效」開始設計。</div>'}</div></section>`;
  }
  function bind(){
    if(!draft)return;
    const app=$('app'),refresh=()=>{$('textRarityPreview').innerHTML=preview();};
    $('textRarityName').oninput=e=>{draft.name=e.target.value;refresh();};
    const syncBlockPreset=()=>{const el=app.querySelector('[data-block-preset]');if(el)el.value=blockPresetId(draft);};
    app.querySelectorAll('[data-effect]').forEach(el=>el.onchange=()=>{draft[el.dataset.effect]=el.value;if(el.dataset.effect==='blockEffect')syncBlockPreset();refresh();});
    const preset=app.querySelector('[data-block-preset]');if(preset)preset.onchange=()=>{const p=BLOCK_PRESETS[preset.value];if(!p)return;draft.blockColor=p.color;draft.blockEffect=p.effect;render();};
    app.querySelectorAll('[data-color-on]').forEach(el=>el.onchange=()=>{const key=el.dataset.colorOn,input=app.querySelector(`[data-color="${key}"]`);input.disabled=!el.checked;draft[key]=el.checked?input.value:'';if(key==='blockColor')syncBlockPreset();refresh();});
    app.querySelectorAll('[data-color]').forEach(el=>el.oninput=()=>{draft[el.dataset.color]=el.value;if(el.dataset.color==='blockColor')syncBlockPreset();refresh();});
    $('saveTextRarity').onclick=()=>{
      try{const next=current().filter(x=>x.id!==draft.id).concat(structuredClone(draft)),checked=validatedStyles(next);const old=current();setTextRarityStyles(checked);try{localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));}catch(e){setTextRarityStyles(old);throw e;}selectedId=draft.id;render();toast('文字稀有度已儲存');}catch(e){toast('儲存失敗：'+e.message);}
    };
    const del=$('deleteTextRarity');if(del)del.onclick=()=>{const n=referenceCount(draft.id);if(n)return toast(`已有 ${n} 件裝備／道具套用，請先移除引用`);if(!confirm(`刪除文字特效「${draft.name}」？`))return;const next=current().filter(x=>x.id!==draft.id),old=current();setTextRarityStyles(next);try{localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));}catch(e){setTextRarityStyles(old);return toast('刪除失敗：'+e.message);}selectedId='';draft=null;render();};
  }
  globalThis.newTextRarity=()=>{let id;do{id='rarity_'+Math.random().toString(36).slice(2,10);}while(current().some(x=>x.id===id));selectedId='';draft=empty(id);render();};
  globalThis.selectTextRarity=id=>{const style=current().find(x=>x.id===id);if(!style)return;selectedId=id;draft=structuredClone(style);render();};
  globalThis.textRarityView=()=>{const html=view();queueMicrotask(bind);return html;};
})();
