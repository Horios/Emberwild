
/* Update 32: shop catalog configuration, escalating daily refresh cost, and inventory-only manual item use. */
(function installShopInventoryOverhaul(){
  const clone=v=>JSON.parse(JSON.stringify(v));
  const pctText=v=>Math.round((Number(v)||0)*10000)/100;
  const DEFAULT_SHOP_SETTINGS={
    randomOffers:{
      offerCount:6,
      refreshBaseCost:100,
      refreshCostStep:50,
      entries:[
        {id:'ore',enabled:true,type:'ore',key:'',name:'鍛鐵',description:'裝備強化常用素材。',quantityMin:8,quantityMax:20,unitPrice:12,weight:1,quantityScalesWithTier:true,priceScalesWithTier:false},
        {id:'dust',enabled:true,type:'dust',key:'',name:'粉塵',description:'裝備洗鍊與寶石相關用途的基礎素材。',quantityMin:3,quantityMax:8,unitPrice:25,weight:1,quantityScalesWithTier:false,priceScalesWithTier:false},
        {id:'gem',enabled:true,type:'gem',key:'random',name:'隨機技能寶石',description:'隨機出現一種技能寶石。',quantityMin:1,quantityMax:2,unitPrice:180,weight:.7,quantityScalesWithTier:false,priceScalesWithTier:false},
        {id:'region_material',enabled:true,type:'material',key:'region',name:'地區素材',description:'從目前探索區域的怪物素材中隨機挑選。',quantityMin:3,quantityMax:6,unitPrice:60,weight:1.3,quantityScalesWithTier:false,priceScalesWithTier:true}
      ]
    }
  };
  const SHOP_RULE_TYPES=new Set(['ore','dust','gem','material']);
  function normalizeRule(src,i){
    const type=SHOP_RULE_TYPES.has(src?.type)?src.type:'material';
    return {
      id:typeof src?.id==='string'&&src.id.trim()?src.id.trim():'rule_'+i,
      enabled:src?.enabled!==false,
      type,
      key:typeof src?.key==='string'?src.key:(type==='gem'?'random':type==='material'?'region':''),
      name:typeof src?.name==='string'?src.name:'',
      description:typeof src?.description==='string'?src.description:'',
      quantityMin:Number.isFinite(src?.quantityMin)?Math.max(1,Math.floor(src.quantityMin)):1,
      quantityMax:Number.isFinite(src?.quantityMax)?Math.max(1,Math.floor(src.quantityMax)):1,
      unitPrice:Number.isFinite(src?.unitPrice)?Math.max(0,Math.round(src.unitPrice)):1,
      weight:Number.isFinite(src?.weight)&&src.weight>0?src.weight:1,
      quantityScalesWithTier:!!src?.quantityScalesWithTier,
      priceScalesWithTier:!!src?.priceScalesWithTier
    };
  }
  function normalizeShopSettings(src){
    const raw=src?.randomOffers||{},fallback=DEFAULT_SHOP_SETTINGS.randomOffers;
    const entries=Array.isArray(raw.entries)&&raw.entries.length?raw.entries.map(normalizeRule):fallback.entries.map((x,i)=>normalizeRule(x,i));
    for(const r of entries)if(r.quantityMax<r.quantityMin)r.quantityMax=r.quantityMin;
    return {randomOffers:{
      offerCount:Number.isFinite(raw.offerCount)?Math.max(1,Math.min(24,Math.floor(raw.offerCount))):fallback.offerCount,
      refreshBaseCost:Number.isFinite(raw.refreshBaseCost)?Math.max(0,Math.round(raw.refreshBaseCost)):fallback.refreshBaseCost,
      refreshCostStep:Number.isFinite(raw.refreshCostStep)?Math.max(0,Math.round(raw.refreshCostStep)):fallback.refreshCostStep,
      entries
    }};
  }
  function validateShopSettings(x){
    const s=normalizeShopSettings(x),ids=new Set();
    for(const r of s.randomOffers.entries){
      if(!/^[A-Za-z0-9_-]{1,100}$/.test(r.id)||ids.has(r.id))throw Error('商店隨機商品規則 ID 無效或重複：'+r.id);ids.add(r.id);
      if(!SHOP_RULE_TYPES.has(r.type)||r.quantityMin<1||r.quantityMax<r.quantityMin||r.unitPrice<0||r.weight<=0)throw Error('商店隨機商品規則數值無效：'+r.id);
      if(r.type==='gem'&&!['random','0','1','2'].includes(String(r.key)))throw Error('隨機技能寶石 key 僅可為 random / 0 / 1 / 2：'+r.id);
      if(r.type==='material'&&typeof r.key!=='string')throw Error('隨機素材 key 無效：'+r.id);
    }
    return s;
  }
  let SHOP_SETTINGS=normalizeShopSettings();
  globalThis.__EMBERWILD_SHOP_SETTINGS=SHOP_SETTINGS;
  function syncItemShopFlags(items){
    const byId=new Map((items||[]).map(x=>[x.id,x]));
    for(const item of SHOP){const src=byId.get(item.id);item.shopEnabled=src?.shopEnabled===undefined?(item.shopEnabled!==false):src.shopEnabled!==false;}
  }
  for(const item of SHOP)if(typeof item.shopEnabled!=='boolean')item.shopEnabled=true;

  if(typeof validateBalanceConfig==='function'){
    const baseValidate=validateBalanceConfig;
    validateBalanceConfig=function(input){
      const copy=clone(input);copy.shopSettings=validateShopSettings(copy.shopSettings);
      if(Array.isArray(copy.items))for(const item of copy.items)if(item.shopEnabled===undefined)item.shopEnabled=true;else if(typeof item.shopEnabled!=='boolean')throw Error('商店上架設定必須為布林值：'+(item.id||'未知'));
      const out=baseValidate(copy);out.shopSettings=copy.shopSettings;
      if(Array.isArray(out.items)&&Array.isArray(copy.items)){const flags=new Map(copy.items.map(x=>[x.id,x.shopEnabled!==false]));for(const item of out.items)item.shopEnabled=flags.get(item.id)!==false;}
      return out;
    };
  }
  if(typeof applyBalanceConfig==='function'){
    const baseApply=applyBalanceConfig;
    applyBalanceConfig=function(input,{persist=true}={}){
      const copy=clone(input);copy.shopSettings=validateShopSettings(copy.shopSettings);if(Array.isArray(copy.items))for(const item of copy.items)if(item.shopEnabled===undefined)item.shopEnabled=true;
      const out=baseApply(copy,{persist:false});SHOP_SETTINGS=clone(copy.shopSettings);globalThis.__EMBERWILD_SHOP_SETTINGS=SHOP_SETTINGS;syncItemShopFlags(copy.items);
      if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));if(state)render();return out;
    };
  }
  if(typeof exportableBalance==='function'){
    const baseExport=exportableBalance;
    exportableBalance=function(){const out=baseExport();out.shopSettings=clone(SHOP_SETTINGS);if(Array.isArray(out.items)){const byId=new Map(SHOP.map(x=>[x.id,x]));for(const item of out.items)item.shopEnabled=byId.get(item.id)?.shopEnabled!==false;}out.notes=[...(out.notes||[]),'shopSettings.randomOffers 控制商店頂端隨機商品、刷新起始價格與每次刷新加價。刷新次數依玩家本機日期於每日 0 點重置。','items[].shopEnabled 控制固定消耗品是否在商店上架；description 為商店與背包顯示說明。'];return out;};
  }
  try{const raw=localStorage.getItem(BALANCE_KEY);if(raw){const parsed=JSON.parse(raw);SHOP_SETTINGS=normalizeShopSettings(parsed.shopSettings);globalThis.__EMBERWILD_SHOP_SETTINGS=SHOP_SETTINGS;syncItemShopFlags(parsed.items);}}catch(e){console.warn('商店設定載入失敗，使用內建預設值',e);}

  function localDayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function syncMarketDay(){if(!party?.market)return false;const today=localDayKey();if(party.market.dayKey!==today){party.market.dayKey=today;party.market.refreshCount=0;return true;}if(!Number.isInteger(party.market.refreshCount)||party.market.refreshCount<0)party.market.refreshCount=0;return false;}
  function currentRefreshCost(){syncMarketDay();const s=SHOP_SETTINGS.randomOffers;return Math.max(0,Math.round(s.refreshBaseCost+s.refreshCostStep*(party?.market?.refreshCount||0)));}
  globalThis.currentRefreshCost=currentRefreshCost;
  function regionMaterialPool(){
    const mi=party?.map??0,cat=GAMEPLAY_SETTINGS?.monsters?.catalog||[];let pool=cat.filter(x=>x?.mapIndex===mi&&x?.enabled!==false&&typeof x?.material==='string'&&x.material.trim()).map(x=>x.material.trim());
    if(!pool.length)pool=(MAPS?.[mi]?.mobs||[]).map(x=>x?.[2]).filter(Boolean);return [...new Set(pool.length?pool:['鍛鐵'])];
  }
  function weightedRule(){const rows=SHOP_SETTINGS.randomOffers.entries.filter(x=>x.enabled!==false&&x.weight>0);if(!rows.length)return null;const total=rows.reduce((n,x)=>n+x.weight,0);let roll=Math.random()*total;for(const r of rows){roll-=r.weight;if(roll<=0)return r;}return rows[rows.length-1];}
  function offerFromRule(rule,serial,i,tier){
    let key=rule.key||'';if(rule.type==='gem'&&key==='random')key=String(rand(3));if(rule.type==='material'&&(!key||key==='region')){const pool=regionMaterialPool();key=pool[rand(pool.length)];}
    let min=rule.quantityMin,max=rule.quantityMax;if(rule.quantityScalesWithTier){min*=tier;max*=tier;}const qty=Math.max(1,Math.floor(min+Math.random()*(max-min+1)));const unit=rule.unitPrice*(rule.priceScalesWithTier?tier:1);return {id:serial+'-'+i,kind:rule.type,key:String(key),qty,price:Math.max(1,Math.round(qty*unit)),sold:false,ruleId:rule.id};
  }
  generateMarket=function(){
    const oldSerial=Number.isSafeInteger(party?.market?.serial)?party.market.serial:0,serial=oldSerial+1,tier=regionTier((typeof worldIsFinalMap==='function'&&worldIsFinalMap(party.map))?Math.max(0,party.map-1):party.map),count=SHOP_SETTINGS.randomOffers.offerCount,offers=[];
    for(let i=0;i<count;i++){const rule=weightedRule();if(!rule)break;offers.push(offerFromRule(rule,serial,i,Math.max(1,tier)));}
    return {serial,offers,dayKey:localDayKey(),refreshCount:party?.market?.refreshCount||0};
  };
  ensureMarket=function(){if(!party.market){party.market=generateMarket();save();return;}if(syncMarketDay())save();};
  refreshMarket=function(){
    ensureMarket();syncMarketDay();const cost=currentRefreshCost();if(state.gold<cost)return toast('刷新需要 '+cost+' 金幣');const old=clone(party.market),gold=state.gold,count=party.market.refreshCount||0;state.gold-=cost;const next=generateMarket();next.refreshCount=count+1;next.dayKey=localDayKey();party.market=next;if(!save()){party.market=old;state.gold=gold;return;}render();toast(`素材商品已刷新；下次刷新 ${currentRefreshCost()} 金幣`);
  };
  function marketRule(o){return SHOP_SETTINGS.randomOffers.entries.find(x=>x.id===o?.ruleId)||SHOP_SETTINGS.randomOffers.entries.find(x=>x.type===o?.kind&&(o.kind!=='material'||x.key==='region'||x.key===o.key))||null;}
  const rawOfferName=o=>o.kind==='ore'?'鍛鐵':o.kind==='dust'?'粉塵':o.kind==='gem'?(GEMS[Number(o.key)]?.name||'技能寶石'):o.key;
  marketOfferName=function(o){const raw=rawOfferName(o),r=marketRule(o);if(!r?.name)return raw;if((o.kind==='material'&&r.key==='region')||(o.kind==='gem'&&r.key==='random'))return `${r.name} · ${raw}`;return r.name;};
  function marketOfferDescription(o){return marketRule(o)?.description||'本批隨機商品。';}
  marketCards=function(){if(!party.market?.offers?.length)return `<div class="shop-empty">目前沒有啟用的隨機商品規則。</div>`;return party.market.offers.map(o=>`<article class="card shop-product-card random-shop-card"><h3 title="${esc(marketOfferName(o))}">${esc(marketOfferName(o))} ×${o.qty}</h3><p class="shop-card-description" title="${esc(marketOfferDescription(o))}">${esc(marketOfferDescription(o))}</p><div class="shop-card-spacer"></div><div class="row"><span>數量 ${o.qty}</span><span>${o.price} 金幣</span></div><div class="actions"><button onclick="buyMarketOffer('${o.id}')" ${o.sold||state.gold<o.price?'disabled':''}>${o.sold?'已售完':'購買'}</button></div></article>`).join('');};
  const validatePartyBase=typeof validateParty==='function'?validateParty:null;
  if(validatePartyBase)validateParty=function(input){const p=validatePartyBase(input);if(p.market){const raw=input?.market||{};p.market.dayKey=typeof raw.dayKey==='string'?raw.dayKey:localDayKey();p.market.refreshCount=Number.isInteger(raw.refreshCount)&&raw.refreshCount>=0?raw.refreshCount:0;for(const [i,o] of p.market.offers.entries())if(typeof raw.offers?.[i]?.ruleId==='string')o.ruleId=raw.offers[i].ruleId;}return p;};

  function itemVisibleInShop(item){return item?.shopEnabled!==false;}
  function fixedShopCard(item){
    const heal=typeof isHealPotion==='function'&&isHealPotion(item),count=heal?healPotionCount(item.id):(state.consumables[item.id]||0),detail=heal?`恢復最大生命 ${pctText(item.healFraction)}% · 冷卻 ${item.cooldown} 回合`:supplyDetail(item),buy=heal?`buyHealingPotion('${item.id}')`:`buySupply('${item.id}')`;
    return `<article class="card shop-product-card fixed-shop-card"><h3 title="${esc(item.name)}">${textRarityItemHTML(item)}</h3><p class="shop-card-description" title="${esc(item.description||item.desc||'')}">${esc(item.description||item.desc||'')}</p><p class="shop-card-detail" title="${esc(detail)}">${esc(detail)}</p><div class="shop-card-spacer"></div><div class="row"><span>共用 ${count} ${heal?'瓶':'個'}</span><span>${item.cost} 金幣</span></div><div class="actions"><button onclick="${buy}" ${state.gold<item.cost?'disabled':''}>購買</button></div></article>`;
  }
  shopView=function(){
    ensureHealingPotionState();ensureMarket();syncMarketDay();const fixed=SHOP.filter(itemVisibleInShop).map(fixedShopCard).join(''),cost=currentRefreshCost(),rc=party.market?.refreshCount||0;
    return `<div class="actions"><button onclick="showTestCodes()">兌換碼</button></div>`+heading('SUPPLIES / 全隊共用','商店')+
      `<div class="shop-catalog-scroll"><section class="shop-section shop-random-section"><div class="shop-section-head"><h2>隨機商品</h2><div class="shop-refresh-meta"><span>第 ${party.market.serial} 批</span><span>今日已刷新 <b>${rc}</b> 次</span><span>每日 0 點重置刷新價格</span></div><div class="actions"><button onclick="refreshMarket()" ${state.gold<cost?'disabled':''}>刷新 · ${cost} 金幣</button></div></div><div class="shop-product-grid">${marketCards()}</div></section>`+
      `<section class="shop-section shop-fixed-section"><div class="shop-section-head"><h2>固定商品</h2><span class="small">購買後進入帳號共用背包；手動使用請到「背包 → 道具」。</span></div><div class="shop-product-grid">${fixed||'<div class="shop-empty">目前沒有上架固定商品。</div>'}</div></section></div>`;
  };

  function inventoryItemCount(item){return (typeof isHealPotion==='function'&&isHealPotion(item))?healPotionCount(item.id):(state.consumables[item.id]||0);}
  function setInventoryItemCount(item,n){n=Math.max(0,Math.floor(Number(n)||0));if(typeof isHealPotion==='function'&&isHealPotion(item))setHealPotionCount(item.id,n);else state.consumables[item.id]=n;}
  globalThis.useInventoryItem=function(id,job){const item=SHOP.find(x=>x.id===id),h=party?.members.find(x=>x.job===job);if(!item||!h)return;if(typeof isHealPotion==='function'&&isHealPotion(item)){openHealingSettings();return;}if(inventoryItemCount(item)<1)return toast('道具數量不足');pageHeroSelection.set('equipment',job);withHero(h,()=>useSupply(id));render();};
  globalThis.sellInventoryItem=function(id,qty){const item=SHOP.find(x=>x.id===id);if(!item)return;const have=inventoryItemCount(item),n=Math.max(0,Math.min(have,Math.floor(Number(qty)||0)));if(n<1)return toast('請輸入要販售的數量');const price=itemSellPrice(id),gold=state.gold;setInventoryItemCount(item,have-n);state.gold+=price*n;if(!save()){setInventoryItemCount(item,have);state.gold=gold;return;}render();toast(`已販售 ${item.name} ×${n}，獲得 ${price*n} 金幣`);};
  globalThis.sellInventoryItemFromButton=function(btn,id,all=false){const item=SHOP.find(x=>x.id===id);if(!item)return;const row=btn.closest('[data-inventory-item]'),input=row?.querySelector('input[data-sell-qty]'),qty=all?inventoryItemCount(item):input?.value;sellInventoryItem(id,qty);};
  accountItemsView=function(){
    ensureHealingPotionState();const target=pageHero('equipment')||party.members[0],rows=SHOP;
    return heading('ITEMS / 帳號共用','道具庫存')+`<section class="panel"><div class="inventory-item-controls"><label>使用角色 <select onchange="selectPageHero('equipment',Number(this.value))">${party.members.map(h=>`<option value="${h.job}" ${h===target?'selected':''}>${esc(characterName(h))} LV${h.lv}</option>`).join('')}</select></label><span class="small">治療藥水仍只由自動喝水使用；其他消耗道具的手動使用統一在此操作。</span></div><div class="inventory-supply-status">${esc(characterName(target))}目前效果：${esc(supplyStatus(target)||'無')}</div><div class="account-item-list">${rows.map(item=>{const n=inventoryItemCount(item),heal=typeof isHealPotion==='function'&&isHealPotion(item),detail=heal?`恢復最大生命 ${pctText(item.healFraction)}% · 冷卻 ${item.cooldown} 回合`:supplyDetail(item);return `<div class="account-item-row" data-inventory-item="${esc(item.id)}"><div class="account-item-main"><b>${textRarityItemHTML(item)}</b><span class="small">${heal?'自動治療藥水':'可手動使用消耗品'}</span></div><div class="account-item-desc">${esc(item.description||item.desc||'')}<span class="detail">${esc(detail)}</span></div><div class="account-item-count">× ${n.toLocaleString()}<br><span class="small">賣 ${itemSellPrice(item.id)}</span></div><div class="account-item-actions">${heal?`<button onclick="openHealingSettings()">自動設定</button>`:`<button onclick="useInventoryItem('${item.id}',${target.job})" ${n<1?'disabled':''}>對${esc(characterName(target))}使用</button>`}<input data-sell-qty type="number" min="1" max="${n}" value="1" ${n<1?'disabled':''}><button onclick="sellInventoryItemFromButton(this,'${item.id}',false)" ${n<1?'disabled':''}>賣出</button><button onclick="sellInventoryItemFromButton(this,'${item.id}',true)" ${n<1?'disabled':''}>全部</button></div></div>`;}).join('')}</div></section>`;
  };
  globalThis.accountItemsView=accountItemsView;
  const shopInventoryEquipmentBase=equipmentView;
  equipmentView=function(){if(inventoryCategory==='items')return inventoryTabs()+accountItemsView();return shopInventoryEquipmentBase();};
  if(state)render();
})();
