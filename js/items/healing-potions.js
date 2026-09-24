
/* Update 31: configurable automatic healing potions. Healing potions are buy-only;
   the selected potion is consumed automatically at the start of that hero's own
   basic-action turn when HP is at/below the configured threshold. */
(function installHealingPotionSystem(){
  const HEAL_POTION_TYPE='healPotion';
  const HEAL_POTION_DEFAULTS=[
    {id:'heal_small',type:HEAL_POTION_TYPE,cost:8,sellPrice:2,duration:0,cooldown:2,healFraction:.25,name:'簡易治療藥水',description:'少量恢復生命，價格低廉，適合日常探索。'},
    {id:'heal_standard',type:HEAL_POTION_TYPE,cost:15,sellPrice:4,duration:0,cooldown:3,healFraction:.45,name:'治療藥水',description:'標準遠征治療藥水，在恢復量與成本之間取得平衡。'},
    {id:'heal_greater',type:HEAL_POTION_TYPE,cost:28,sellPrice:7,duration:0,cooldown:4,healFraction:.70,name:'強效治療藥水',description:'一次恢復較多生命，適合高壓戰鬥，但價格與冷卻較高。'},
    {id:'heal_supreme',type:HEAL_POTION_TYPE,cost:50,sellPrice:12,duration:0,cooldown:5,healFraction:1.00,name:'特級治療藥水',description:'可將生命大幅拉回安全線，主要用於危急狀況。'}
  ];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const isHealPotion=item=>item?.type===HEAL_POTION_TYPE;
  const healPotionItems=()=>SHOP.filter(isHealPotion);
  const pct=v=>Math.round(Number(v)*10000)/100;
  const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);

  function addDefaultHealPotionsTo(items){
    const out=Array.isArray(items)?items:[];
    if(!out.some(isHealPotion))out.push(...HEAL_POTION_DEFAULTS.map(clone));
    return out;
  }
  addDefaultHealPotionsTo(SHOP);

  if(typeof normalizeDescriptionBalance==='function'){
    const baseNormalize=normalizeDescriptionBalance;
    normalizeDescriptionBalance=function(input){const out=baseNormalize(input);addDefaultHealPotionsTo(out.items);return out;};
  }
  if(typeof validateDescriptionItems==='function'){
    const baseValidate=validateDescriptionItems;
    validateDescriptionItems=function(items){
      if(!Array.isArray(items))throw Error('道具資料無效');
      const fixed=items.filter(x=>!isHealPotion(x));
      baseValidate(fixed);
      const heals=items.filter(isHealPotion),ids=new Set(fixed.map(x=>x.id));
      if(!heals.length)throw Error('至少需要 1 種治療藥水');
      for(const item of heals){
        if(!item||!validId(item.id)||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||typeof item.description!=='string')throw Error('治療藥水基本資料無效：'+(item?.id||'未知'));
        ids.add(item.id);
        if(item.element!==undefined&&item.element!==null&&item.element!=='')throw Error('治療藥水不可設定元素：'+item.id);
        if(!Number.isFinite(item.cost)||item.cost<0||!Number.isFinite(item.healFraction)||item.healFraction<=0||item.healFraction>1||!Number.isInteger(item.cooldown)||item.cooldown<0||item.cooldown>99||!Number.isInteger(item.duration??0)||(item.duration??0)!==0)throw Error('治療藥水數值無效：'+item.id);
        if(item.sellPrice!==undefined&&(!Number.isFinite(item.sellPrice)||item.sellPrice<0))throw Error('治療藥水賣價無效：'+item.id);
      }
      return items;
    };
  }
  if(typeof balanceReference==='function'){
    const baseReference=balanceReference;
    balanceReference=function(){const r=baseReference();r.itemTypes={...(r.itemTypes||{}),healPotion:'治療藥水；healFraction=最大生命恢復比例，cooldown=使用後等待的回合數；只能由自動喝藥機制使用。'};return r;};
  }
  if(typeof exportableBalance==='function'){
    const baseExport=exportableBalance;
    exportableBalance=function(){const out=baseExport();out.notes=[...(out.notes||[]),'items 中 type=healPotion 為治療藥水；healFraction 使用 0~1 比例，cooldown 使用回合。治療藥水沒有手動使用按鈕，只會依角色自動喝藥設定觸發。'];return out;};
  }

  function defaultHealPotionId(){return healPotionItems().find(x=>x.id==='heal_standard')?.id||healPotionItems()[0]?.id||'';}
  function healingInventory(){
    if(party?.members?.length){const owner=party.members[0];if(!owner.healingPotions||Array.isArray(owner.healingPotions)||typeof owner.healingPotions!=='object')owner.healingPotions={};return owner.healingPotions;}
    if(state){if(!state.healingPotions||Array.isArray(state.healingPotions)||typeof state.healingPotions!=='object')state.healingPotions={};return state.healingPotions;}
    return {};
  }
  function normalizeHeroHealingSettings(h){
    if(!h)return;
    if(typeof h.autoPotion!=='boolean')h.autoPotion=true;
    if(!Number.isFinite(h.autoPotionThresholdPct))h.autoPotionThresholdPct=Math.round((typeof GS==='function'?GS('combat.autoPotionThreshold',.35):.35)*100);
    h.autoPotionThresholdPct=Math.max(1,Math.min(99,Math.round(h.autoPotionThresholdPct)));
    if(typeof h.autoPotionId!=='string'||!healPotionItems().some(x=>x.id===h.autoPotionId))h.autoPotionId=defaultHealPotionId();
    if(!Number.isInteger(h.healPotionCooldownRemaining)||h.healPotionCooldownRemaining<0)h.healPotionCooldownRemaining=0;
  }
  const baseEnsureSharedItems=typeof ensureSharedItems==='function'?ensureSharedItems:null;
  function ensureHealingPotionState(){
    if(!party?.members?.length){if(state)normalizeHeroHealingSettings(state);return;}
    const owner=party.members[0],inv=healingInventory();
    for(let i=1;i<party.members.length;i++){
      const src=party.members[i].healingPotions;
      if(src&&typeof src==='object'&&!Array.isArray(src)){for(const [id,n] of Object.entries(src))if(Number.isInteger(n)&&n>0)inv[id]=(inv[id]||0)+n;delete party.members[i].healingPotions;}
    }
    if(party.sharedItems&&Number.isInteger(party.sharedItems.potions)&&party.sharedItems.potions>0){inv[defaultHealPotionId()]=(inv[defaultHealPotionId()]||0)+party.sharedItems.potions;party.sharedItems.potions=0;}
    for(const [id,n] of Object.entries(inv))if(!validId(id)||!Number.isInteger(n)||n<0||!healPotionItems().some(x=>x.id===id))delete inv[id];
    for(const h of party.members)normalizeHeroHealingSettings(h);
    owner.healingPotions=inv;
  }
  if(baseEnsureSharedItems){ensureSharedItems=function(){const out=baseEnsureSharedItems();ensureHealingPotionState();return out;};}

  function selectedHealPotion(h){normalizeHeroHealingSettings(h);return healPotionItems().find(x=>x.id===h.autoPotionId)||healPotionItems()[0]||null;}
  function healPotionCount(id){return Math.max(0,Math.floor(Number(healingInventory()[id])||0));}
  function setHealPotionCount(id,n){healingInventory()[id]=Math.max(0,Math.floor(Number(n)||0));}
  function useAutoHealingPotion(h){
    normalizeHeroHealingSettings(h);
    if(h.healPotionCooldownRemaining>0){h.healPotionCooldownRemaining--;return false;}
    if(!h.autoPotion||h.hp<=0)return false;
    const item=selectedHealPotion(h);if(!item||healPotionCount(item.id)<1)return false;
    const v=battleStats(h),threshold=Math.max(1,Math.min(99,h.autoPotionThresholdPct))/100;
    if(h.hp/v.hp>threshold||h.hp>=v.hp)return false;
    setHealPotionCount(item.id,healPotionCount(item.id)-1);
    const before=h.hp,amount=Math.max(1,Math.round(v.hp*item.healFraction));h.hp=Math.min(v.hp,h.hp+amount);
    const actual=Math.max(0,Math.round(h.hp-before));if(actual>0)recordCombatContribution(h,'healing',actual);h.healPotionCooldownRemaining=Math.max(0,Math.round(item.cooldown));
    note(`${characterName(h)}自動使用${item.name} · 恢復 ${actual} 生命（最大生命 ${pct(item.healFraction)}%）· 冷卻 ${item.cooldown} 回合`);
    return true;
  }
  globalThis.useAutoHealingPotion=useAutoHealingPotion;
  globalThis.setHeroAutoPotion=function(job,on){const h=party?.members.find(x=>x.job===job);if(!h)return;h.autoPotion=!!on;save();render();refreshHealingSettingsModal();};
  globalThis.setHeroAutoPotionThreshold=function(job,value){const h=party?.members.find(x=>x.job===job);if(!h)return;const n=Number(value);h.autoPotionThresholdPct=Number.isFinite(n)?Math.max(1,Math.min(99,Math.round(n))):35;save();render();refreshHealingSettingsModal();};
  globalThis.setHeroAutoPotionItem=function(job,id){const h=party?.members.find(x=>x.job===job);if(!h||!healPotionItems().some(x=>x.id===id))return;h.autoPotionId=id;save();render();refreshHealingSettingsModal();};
  globalThis.buyHealingPotion=function(id){const item=healPotionItems().find(x=>x.id===id);if(!item)return;if(state.gold<item.cost)return toast('金幣不足');state.gold-=item.cost;setHealPotionCount(id,healPotionCount(id)+1);save();render();};

  if(typeof tickHeroCooldowns==='function'){
    const baseTickHeroCooldowns=tickHeroCooldowns;
    tickHeroCooldowns=function(h){useAutoHealingPotion(h);return baseTickHeroCooldowns(h);};
  }
  if(typeof resetEncounter==='function'){
    const baseReset=resetEncounter;
    resetEncounter=function(){const out=baseReset();if(party)for(const h of party.members){normalizeHeroHealingSettings(h);h.healPotionCooldownRemaining=0;}return out;};
  }
  if(typeof spawnGroup==='function'){
    const baseSpawn=spawnGroup;
    spawnGroup=function(){const out=baseSpawn();if(party)for(const h of heroes()){normalizeHeroHealingSettings(h);h.healPotionCooldownRemaining=0;}return out;};
  }

  if(typeof supplyDetail==='function'){
    const baseSupplyDetail=supplyDetail;
    supplyDetail=function(item){if(isHealPotion(item))return `恢復最大生命 ${pct(item.healFraction)}% · 自動使用冷卻 ${Math.round(item.cooldown)} 回合 · 單價 ${Math.round(item.cost)} 金幣`;return baseSupplyDetail(item);};
  }
  if(typeof useSupply==='function'){
    const baseUseSupply=useSupply;
    useSupply=function(id){const item=SHOP.find(x=>x.id===id);if(isHealPotion(item))return toast('治療藥水僅由自動喝藥設定使用');return baseUseSupply(id);};
  }

  function healingSettingsRows(){
    const items=healPotionItems();
    return party.members.map(h=>{
      normalizeHeroHealingSettings(h);
      const item=selectedHealPotion(h);
      return `<div class="heal-auto-row"><b>${esc(characterName(h))}</b><label><input type="checkbox" ${h.autoPotion?'checked':''} onchange="setHeroAutoPotion(${h.job},this.checked)">自動喝藥</label><label>HP ≤ <input type="number" min="1" max="99" step="1" value="${h.autoPotionThresholdPct}" onchange="setHeroAutoPotionThreshold(${h.job},this.value)">%</label><label>使用 <select onchange="setHeroAutoPotionItem(${h.job},this.value)">${items.map(x=>`<option value="${esc(x.id)}" ${x.id===h.autoPotionId?'selected':''}>${esc(x.name)} ×${healPotionCount(x.id)}</option>`).join('')}</select></label><span class="heal-auto-detail">${item?`${esc(item.name)}：恢復最大生命 ${pct(item.healFraction)}% · 冷卻 ${item.cooldown} 回合 · <span class="heal-stock">共用庫存 ${healPotionCount(item.id)}</span>`:'沒有可用治療藥水'}${h.healPotionCooldownRemaining>0?`<br><span class="heal-auto-cd">目前冷卻剩餘 ${h.healPotionCooldownRemaining} 回合</span>`:''}</span></div>`;
    }).join('');
  }

  globalThis.openHealingSettings=function(refresh=false){
    if(!party)return;
    ensureHealingPotionState();
    const modal=$('modal');
    modal.dataset.view='healing-settings';
    modal.innerHTML=`<h2>自動喝水設定</h2><p class="small">設定各角色的 HP 門檻與使用藥水。介面中的「回合」定義可由探索控制右上角的「？」查看。</p><div class="heal-settings-modal">${healingSettingsRows()}</div><div class="actions"><button class="primary" onclick="closeModal()">完成</button></div>`;
    if(!modal.open)modal.showModal();
  };

  function refreshHealingSettingsModal(){
    const modal=$('modal');
    if(modal?.open&&modal.dataset.view==='healing-settings')openHealingSettings(true);
  }

  function healingControlPanel(){
    if(!party)return '';
    ensureHealingPotionState();
    let enabled=0;
    const chips=party.members.map(h=>{
      normalizeHeroHealingSettings(h);
      const item=selectedHealPotion(h);
      if(h.autoPotion)enabled++;
      const text=h.autoPotion?`${esc(characterName(h))} ≤${h.autoPotionThresholdPct}% · ${item?esc(item.name):'無藥水'}`:`${esc(characterName(h))} 關閉`;
      return `<span class="heal-auto-chip ${h.autoPotion?'':'off'}" title="${text}">${text}</span>`;
    }).join('');
    return `<section class="panel heal-auto-panel" aria-label="自動喝水設定摘要"><div class="heal-auto-title"><h2>自動喝水</h2><span class="heal-auto-state">${enabled}/${party.members.length} 啟用</span><div class="heal-auto-summary">${chips}</div><button class="heal-auto-settings-button" onclick="openHealingSettings()">設定</button></div></section>`;
  }

  if(typeof battleView==='function'){
    const baseBattleView=battleView;
    battleView=function(){
      let html=baseBattleView();
      html=html.replace(/<details><summary>隊伍補給<\/summary>[\s\S]*?<\/details>/g,'');
      html=html.replace(/<label class="auto-potion">[\s\S]*?<\/label>/g,'');
      html=html.replace(/<button[^>]*onclick="[^"]*(?:buyPotion|\bpotion\()[^"]*"[^>]*>[\s\S]*?<\/button>/g,'');
      const panel=healingControlPanel(),marker='<div class="text-battle-layout">';
      return html.includes(marker)?html.replace(marker,panel+marker):panel+html;
    };
  }
  if(typeof shopView==='function'){
    shopView=function(){
      ensureHealingPotionState();if(typeof ensureMarket==='function')ensureMarket();const h=pageHero('shop'),inv=healingInventory();
      const healCards=healPotionItems().map(item=>`<article class="card heal-shop-card"><h3>${esc(item.name)}</h3><p class="item-flavor"><b>說明：</b>${esc(item.description||item.desc||'')}</p><p class="heal-spec"><b>詳細：</b>恢復最大生命 ${pct(item.healFraction)}% · 冷卻 ${item.cooldown} 回合</p><div class="row"><span>共用 ${healPotionCount(item.id)} 瓶</span><span>${item.cost} 金幣／瓶</span></div><div class="actions">${ownerControls(`<button onclick="buyHealingPotion('${item.id}')" ${h.gold<item.cost?'disabled':''}>購買 1 瓶</button>`,h.job)}</div><p class="heal-no-manual">治療藥水沒有手動使用按鈕；由戰鬥頁的角色自動治療設定觸發。</p></article>`).join('');
      const supplyCards=SHOP.filter(x=>!isHealPotion(x)).map(item=>`<article class="card"><h3>${esc(item.name)}</h3><p class="item-flavor"><b>說明：</b>${esc(item.description||item.desc||'')}</p><p class="item-detail small"><b>詳細：</b>${esc(supplyDetail(item))}</p><div class="row"><span>共用 ${h.consumables[item.id]||0} 瓶</span><span>${item.cost} 金幣</span></div><div class="actions">${ownerControls(`<button onclick="buySupply('${item.id}')" ${h.gold<item.cost?'disabled':''}>購買</button><button onclick="useSupply('${item.id}')" ${!h.consumables[item.id]?'disabled':''}>對${esc(characterName(h))}使用</button>`,h.job)}</div></article>`).join('');
      const market=typeof marketCards==='function'?marketCards():'';
      const marketHead=party?.market?`<div class="actions market-refresh"><span>素材商品 · 第 ${party.market.serial} 批</span><button onclick="refreshMarket()">刷新商店 · ${MARKET_REFRESH_COST} 金幣</button></div>`:'';
      return `<div class="actions"><button onclick="showTestCodes()">兌換碼</button></div>`+heading('SUPPLIES / 全隊共用','商店')+pageSelector('shop')+`<section class="panel shared-shop-info"><b>道具設定角色：${esc(characterName(h))} · ${h.gold} 金幣</b>${uiHelp('補給說明','治療藥水購買後進入全隊共用庫存，只能在角色回合開始時依自動治療設定使用；沒有手動喝藥。元素附魔、抗性與增幅藥水仍可手動使用，效果以角色出戰回合計時。')}<p class="supply-countdown" data-job="${h.job}">${supplyStatus(h)||'目前無持續型消耗品效果'}</p></section>${marketHead}<div class="shared-shop-grid">${healCards}${market}${supplyCards}</div>`;
    };
  }

  if(typeof guideView==='function'){
    const baseGuide=guideView;
    guideView=function(){return `<section class="panel"><h2>自動治療藥水</h2><p>每名角色可設定自動喝藥開關、HP 百分比門檻與指定治療藥水。判定只發生在該角色回合開始時；使用治療藥水不會取消該回合原本的攻擊。治療藥水使用後依品項進入回合冷卻，冷卻期間不會再喝。治療藥水不提供手動使用按鈕。</p></section>`+baseGuide();};
  }

  if(typeof save==='function'){
    const baseSave=save;
    save=function(show=false){ensureHealingPotionState();return baseSave(show);};
  }

  // Recover a balance file containing healing potions even if an earlier boot pass
  // rejected its extended item list before this module was installed.
  try{
    ensureHealingPotionState();
    const raw=localStorage.getItem(BALANCE_KEY);
    if(raw){const cfg=JSON.parse(raw);applyBalanceConfig(cfg,{persist:false});}
    ensureHealingPotionState();
    if(state)save();
  }catch(e){console.warn('治療藥水設定載入失敗，使用內建預設值',e);addDefaultHealPotionsTo(SHOP);ensureHealingPotionState();}
  // Expose the healing inventory helpers for later shop / inventory UI modules.
  globalThis.ensureHealingPotionState=ensureHealingPotionState;
  globalThis.healPotionItems=healPotionItems;
  globalThis.isHealPotion=isHealPotion;
  globalThis.healPotionCount=healPotionCount;
  globalThis.setHealPotionCount=setHealPotionCount;
  globalThis.healingInventory=healingInventory;
  if(state)render();
})();
