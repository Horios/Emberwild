/* Test-build editor and balance JSON lifecycle for text rarity presets. */
(()=>{
  const TEXT_EFFECTS={glow:'光暈',shadow:'深色陰影',light:'浮雕高光',crisp:'細描邊'};
  const BLOCK_EFFECTS={gradient:'漸層反光',stripes:'斜紋',inset:'內側微光'};
  const BORDER_EFFECTS={glow:'外框光暈',dashed:'虛線',double:'雙線'};
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
  const baseNameHTML=equipmentNameHTML;
  equipmentNameHTML=function(g){
    const html=baseNameHTML(g),style=styleForGear(g);
    if(!style)return html;
    const {classes,attrs}=textRarityPresentation(style);
    return html.replace(/class="enhanced-name ([^"]*)"/,(_,original)=>`class="enhanced-name ${classes} ${original}"${attrs}`);
  };

  function opts(values,value){return `<option value="" ${!value?'selected':''}>無特效</option>`+Object.entries(values).map(([id,label])=>`<option value="${id}" ${value===id?'selected':''}>${label}</option>`).join('');}
  function colorField(key,label,defaultColor){const value=draft[key];return `<label>${label}<span class="text-rarity-color"><input type="checkbox" data-color-on="${key}" ${value?'checked':''}> 自訂 <input type="color" data-color="${key}" value="${value||defaultColor}" ${value?'':'disabled'}></span></label>`;}
  function field(key,label,choices){return `<label>${label}<select data-effect="${key}">${opts(choices,draft[key])}</select></label>`;}
  function preview(){const {classes,attrs}=textRarityPresentation(draft);return `<div class="text-rarity-preview"><span class="${classes}"${attrs}>${esc(draft.name||'預覽文字')}</span><span class="small">裝備／道具名稱預覽</span></div>`;}
  function referenceCount(id){const doc=exportableBalance();let n=0;for(const slots of doc.equipmentForms||[])for(const forms of slots||[])for(const x of forms||[])if(x.textStyleId===id)n++;for(const x of doc.equipmentPowerSystem?.bossAffixes||[])if(x.textStyleId===id)n++;for(const x of doc.items||[])if(x.textStyleId===id)n++;return n;}
  function view(){
    const list=current();if(list!==seenStyles){seenStyles=list;draft=null;}
    if(!draft&&list.length){selectedId=list.some(x=>x.id===selectedId)?selectedId:list[0].id;draft=structuredClone(list.find(x=>x.id===selectedId));}
    return heading('TEXT RARITY / 外觀設計','文字稀有度設計器')+`<section class="panel text-rarity-editor"><div class="text-rarity-head"><p class="small">建立樣式後，在平衡設計器的裝備、BOSS 裝備及各道具欄位套用；測試設定 JSON 可雙向匯入、匯出。未選顏色與特效的欄位沿用原有外觀。</p><button onclick="newTextRarity()">新增新文字特效</button></div><div class="text-rarity-layout"><div class="text-rarity-list">${list.map(x=>`<button class="${selectedId===x.id?'primary':''}" onclick="selectTextRarity('${x.id}')">${esc(x.name)}</button>`).join('')||'<span class="small">目前沒有自訂特效</span>'}</div>${draft?`<div class="text-rarity-form"><label>特效命名<input id="textRarityName" maxlength="60" value="${esc(draft.name)}"></label>${colorField('textColor','文字底色（字色）','#e8edf0')}${field('textEffect1','文字特效 1',TEXT_EFFECTS)}${field('textEffect2','文字特效 2',TEXT_EFFECTS)}${colorField('blockColor','區塊底色','#263f55')}${field('blockEffect','區塊特效',BLOCK_EFFECTS)}${colorField('borderColor','外框顏色','#8ecaff')}${field('borderEffect','外框特效',BORDER_EFFECTS)}<div id="textRarityPreview">${preview()}</div><div class="actions"><button class="primary" id="saveTextRarity">儲存</button>${list.some(x=>x.id===draft.id)?'<button class="danger" id="deleteTextRarity">刪除</button>':''}</div></div>`:'<div class="small">點選「新增新文字特效」開始設計。</div>'}</div></section>`;
  }
  function bind(){
    if(!draft)return;
    const app=$('app'),refresh=()=>{$('textRarityPreview').innerHTML=preview();};
    $('textRarityName').oninput=e=>{draft.name=e.target.value;refresh();};
    app.querySelectorAll('[data-effect]').forEach(el=>el.onchange=()=>{draft[el.dataset.effect]=el.value;refresh();});
    app.querySelectorAll('[data-color-on]').forEach(el=>el.onchange=()=>{const key=el.dataset.colorOn,input=app.querySelector(`[data-color="${key}"]`);input.disabled=!el.checked;draft[key]=el.checked?input.value:'';refresh();});
    app.querySelectorAll('[data-color]').forEach(el=>el.oninput=()=>{draft[el.dataset.color]=el.value;refresh();});
    $('saveTextRarity').onclick=()=>{
      try{const next=current().filter(x=>x.id!==draft.id).concat(structuredClone(draft)),checked=validatedStyles(next);const old=current();setTextRarityStyles(checked);try{localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));}catch(e){setTextRarityStyles(old);throw e;}selectedId=draft.id;render();toast('文字稀有度已儲存');}catch(e){toast('儲存失敗：'+e.message);}
    };
    const del=$('deleteTextRarity');if(del)del.onclick=()=>{const n=referenceCount(draft.id);if(n)return toast(`已有 ${n} 件裝備／道具套用，請先移除引用`);if(!confirm(`刪除文字特效「${draft.name}」？`))return;const next=current().filter(x=>x.id!==draft.id),old=current();setTextRarityStyles(next);try{localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));}catch(e){setTextRarityStyles(old);return toast('刪除失敗：'+e.message);}selectedId='';draft=null;render();};
  }
  globalThis.newTextRarity=()=>{let id;do{id='rarity_'+Math.random().toString(36).slice(2,10);}while(current().some(x=>x.id===id));selectedId='';draft=empty(id);render();};
  globalThis.selectTextRarity=id=>{const style=current().find(x=>x.id===id);if(!style)return;selectedId=id;draft=structuredClone(style);render();};
  globalThis.textRarityView=()=>{const html=view();queueMicrotask(bind);return html;};
})();
