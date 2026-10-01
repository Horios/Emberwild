/* Shop pools, compact descriptions/effects, daily refresh prices and account inventory. */
(function installShopInventoryOverhaul(){
  const clone=v=>JSON.parse(JSON.stringify(v));
  const pctText=v=>Math.round((Number(v)||0)*10000)/100;
  const catalog=globalThis.EmberwildShopCatalog;
  const catalogOptions=items=>({items:items||SHOP,rerollItem:globalThis.__EMBERWILD_EQUIPMENT_POWER?.rerollItem});
  let SHOP_SETTINGS=catalog.validate(undefined,catalogOptions());
  const publishSettings=()=>{globalThis.__EMBERWILD_SHOP_SETTINGS=SHOP_SETTINGS;};
  publishSettings();

  const baseValidate=validateBalanceConfig;
  validateBalanceConfig=function(input){
    const copy=clone(input),items=normalizeDescriptionBalance(copy).items;
    copy.shopSettings=catalog.validate(copy.shopSettings,catalogOptions(items));
    if(Array.isArray(copy.items))for(const item of copy.items)if(item.shopEnabled!==undefined&&typeof item.shopEnabled!=='boolean')throw Error('商店上架設定必須為布林值：'+item.id);
    const out=baseValidate(copy);out.shopSettings=copy.shopSettings;return out;
  };
  const baseApply=applyBalanceConfig;
  applyBalanceConfig=function(input,{persist=true}={}){
    const copy=validateBalanceConfig(input),oldRandom=JSON.stringify(SHOP_SETTINGS.randomOffers);
    const out=baseApply(copy,{persist:false});SHOP_SETTINGS=clone(copy.shopSettings);publishSettings();
    if(party&&state&&oldRandom!==JSON.stringify(SHOP_SETTINGS.randomOffers))party.market=generateMarket();
    if(persist){localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));if(party&&state)save();}
    if(state)render();return out;
  };
  const baseExport=exportableBalance;
  exportableBalance=function(){
    const out=baseExport();out.shopSettings=clone(SHOP_SETTINGS);
    const fixedIds=catalog.fixedItemIds(SHOP_SETTINGS);
    if(Array.isArray(out.items))for(const item of out.items)item.shopEnabled=fixedIds.has(item.id);
    out.notes=(out.notes||[]).filter(x=>!String(x).startsWith('shopSettings.')&&!String(x).startsWith('items[].shopEnabled'));
    out.notes.push('shopSettings.schemaVersion=2；randomOffers.entries 與 fixedOffers.entries 是隨機／固定商店的有效商品池。空陣列表示不上架任何商品，移除池中商品不刪除玩家庫存。',
      'randomOffers.entries 的 selection=weighted 依 weight 抽選；selection=extra 依 chance 每批額外判定一次。重鑄石也由這個商品池控制。',
      '商品 type=item 的 key 引用 items[].id；unitPrice=null 沿用 items[].cost。名稱與說明留空時沿用道具本身；實際效果由結構化能力自動產生。',
      'items[].shopEnabled 與 equipmentPowerSystem.rerollItem.shopChance/shopPrice 僅用於舊 JSON 遷移；新版商店由 shopSettings 控制。');
    return out;
  };
  const baseReference=balanceReference;
  balanceReference=function(){const out=baseReference();out.balancePaths={...(out.balancePaths||{}),'shopSettings.randomOffers.entries':'隨機商品池：抽選規則、數量、單價與顯示說明。','shopSettings.fixedOffers.entries':'固定商品池：上架項目、數量、單價與顯示說明。'};return out;};
  try{const raw=localStorage.getItem(BALANCE_KEY);if(raw){const parsed=JSON.parse(raw);SHOP_SETTINGS=catalog.validate(parsed.shopSettings,catalogOptions());publishSettings();}}catch(e){console.warn('商店設定載入失敗，使用內建預設值',e);}

  function localDayKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function syncMarketDay(){if(!party?.market)return false;const today=localDayKey();if(party.market.dayKey!==today){party.market.dayKey=today;party.market.refreshCount=0;return true;}if(!Number.isInteger(party.market.refreshCount)||party.market.refreshCount<0)party.market.refreshCount=0;return false;}
  function currentRefreshCost(){syncMarketDay();const s=SHOP_SETTINGS.randomOffers;return Math.min(1e9,Math.round(s.refreshBaseCost+s.refreshCostStep*(party?.market?.refreshCount||0)));}
  globalThis.currentRefreshCost=currentRefreshCost;
  function regionMaterialPool(){
    const mi=party?.map??0,cat=GAMEPLAY_SETTINGS?.monsters?.catalog||[];let pool=cat.filter(x=>x?.mapIndex===mi&&x?.enabled!==false&&typeof x?.material==='string'&&x.material.trim()).map(x=>x.material.trim());
    if(!pool.length)pool=(MAPS?.[mi]?.mobs||[]).map(x=>x?.[2]).filter(Boolean);return [...new Set(pool.length?pool:['鍛鐵'])];
  }
  function unitPrice(rule){return rule.unitPrice===null?Number(SHOP.find(x=>x.id===rule.key)?.cost)||0:rule.unitPrice;}
  function weightedRule(){
    const rows=SHOP_SETTINGS.randomOffers.entries.filter(x=>x.enabled&&x.selection==='weighted'),total=rows.reduce((n,x)=>n+x.weight,0);
    if(!rows.length)return null;let roll=Math.random()*total;for(const rule of rows){roll-=rule.weight;if(roll<=0)return rule;}return rows[rows.length-1];
  }
  function offerFromRule(rule,serial,index,tier){
    let key=rule.key;if(rule.type==='gem'&&key==='random')key=String(rand(3));if(rule.type==='material'&&key==='region'){const pool=regionMaterialPool();key=pool[rand(pool.length)];}
    const scale=rule.quantityScalesWithTier?tier:1,min=rule.quantityMin*scale,max=rule.quantityMax*scale;
    const qty=Math.min(10000,Math.floor(min+Math.random()*(max-min+1))),price=Math.min(1e9,Math.round(qty*unitPrice(rule)*(rule.priceScalesWithTier?tier:1)));
    return {id:serial+'-'+index,kind:rule.type,key,qty,price,sold:false,ruleId:rule.id};
  }
  generateMarket=function(){
    const serial=(Number.isSafeInteger(party?.market?.serial)?party.market.serial:0)+1;
    const tier=Math.max(1,regionTier((typeof worldIsFinalMap==='function'&&worldIsFinalMap(party.map))?Math.max(0,party.map-1):party.map)),offers=[];
    for(let i=0;i<SHOP_SETTINGS.randomOffers.offerCount;i++){const rule=weightedRule();if(!rule)break;offers.push(offerFromRule(rule,serial,offers.length,tier));}
    for(const rule of SHOP_SETTINGS.randomOffers.entries)if(rule.enabled&&rule.selection==='extra'&&Math.random()<rule.chance)offers.push(offerFromRule(rule,serial,offers.length,tier));
    return {serial,offers,dayKey:localDayKey(),refreshCount:party?.market?.refreshCount||0};
  };
  ensureMarket=function(){if(!party.market){party.market=generateMarket();save();return;}if(syncMarketDay())save();};
  const hasRandomRules=()=>SHOP_SETTINGS.randomOffers.entries.some(x=>x.enabled&&(x.selection==='weighted'||x.chance>0));
  refreshMarket=function(){
    if(!hasRandomRules())return toast('目前沒有啟用的隨機商品');
    ensureMarket();syncMarketDay();const cost=currentRefreshCost();if(state.gold<cost)return toast('刷新需要 '+cost+' 金幣');
    const old=clone(party.market),gold=state.gold,count=party.market.refreshCount||0;state.gold-=cost;const next=generateMarket();next.refreshCount=count+1;next.dayKey=localDayKey();party.market=next;
    if(!save()){party.market=old;state.gold=gold;return;}render();toast(`商品已刷新；下次刷新 ${currentRefreshCost()} 金幣`);
  };
  function resolvedOffer(offer){return offer?.ruleId==='__gear_tier_reroll__'?{...offer,kind:'item',key:'power_tier_reroll'}:offer;}
  function marketRule(offer){return SHOP_SETTINGS.randomOffers.entries.find(x=>x.id===offer?.ruleId)||null;}
  function offerItem(offer){return offer.kind==='item'?SHOP.find(x=>x.id===offer.key):null;}
  function rawOfferName(offer){return offer.kind==='ore'?'鍛鐵':offer.kind==='dust'?'粉塵':offer.kind==='gem'?(GEMS[Number(offer.key)]?.name||'技能寶石'):offerItem(offer)?.name||offer.key;}
  function offerName(offer,rule){
    const raw=rawOfferName(offer);if(!rule?.name)return raw;
    if(offer.kind==='gem'&&['技能寶石','隨機技能寶石'].includes(rule.name)||offer.kind==='material'&&rule.name==='地區素材')return raw;
    if(offer.kind==='gem'&&rule.key==='random'||offer.kind==='material'&&rule.key==='region')return rule.name+' · '+raw;
    return rule.name;
  }
  marketOfferName=function(input){const offer=resolvedOffer(input);return offerName(offer,marketRule(offer));};
  function offerDescription(offer,rule){
    const item=offerItem(offer);
    if(rule?.description)return item?(globalThis.equipmentPlayerItemDescription?.({...item,description:rule.description})||rule.description):rule.description;
    if(item)return globalThis.equipmentPlayerItemDescription?.(item)||item.description||item.desc||'冒險途中使用的補給道具。';
    if(offer.kind==='ore')return '裝備強化常用的金屬素材。';
    if(offer.kind==='dust')return '由裝備分解取得的細碎素材。';
    if(offer.kind==='gem')return '可鑲嵌於技能插槽，強化技能的寶石。';
    const source=GAMEPLAY_SETTINGS?.monsters?.catalog?.find(x=>x.material===offer.key);return source?'取自'+source.name+'的探索素材。':'探索途中收集的製作素材。';
  }
  function offerEffect(offer){
    const item=offerItem(offer);
    if(item)return String(supplyDetail(item)).replace(/ · (?:單價|賣價) [\d.,]+ 金幣/g,'');
    if(offer.kind==='ore')return '用於裝備強化與升階。';
    if(offer.kind==='dust')return '用於裝備洗鍊與寶石合成。';
    if(offer.kind==='gem')return GEMS[Number(offer.key)]?.desc||'鑲嵌於技能插槽，強化技能效果。';
    return '存入材料庫，可依製作配方或委託需求消耗。';
  }
  function stockSlot(offer){
    if(offer.kind==='ore'||offer.kind==='dust')return {object:state,key:offer.kind,limit:1e12};
    if(offer.kind==='gem')return {object:state.gems,key:Number(offer.key),limit:1e9};
    if(offer.kind==='material')return {object:state.materials,key:offer.key,limit:1e9};
    const item=offerItem(offer);if(!item)return null;
    ensureHealingPotionState();const object=isHealPotion(item)?party.members[0].healingPotions:state.consumables;return {object,key:item.id,limit:1e9};
  }
  function purchase(offer,name,onSold){
    const slot=stockSlot(offer);if(!slot)return toast('找不到此商品對應的道具');
    if(state.gold<offer.price)return toast('金幣不足');
    const had=Object.prototype.hasOwnProperty.call(slot.object,slot.key),old=Number(slot.object[slot.key])||0,next=old+offer.qty,gold=state.gold;
    if(!Number.isSafeInteger(next)||next>slot.limit)return toast('庫存已達上限');
    slot.object[slot.key]=next;state.gold-=offer.price;if(onSold)onSold(true);
    if(!save()){if(had)slot.object[slot.key]=old;else delete slot.object[slot.key];state.gold=gold;if(onSold)onSold(false);return;}
    render();toast('已購買 '+name+' ×'+offer.qty);
  }
  buyMarketOffer=function(id){const raw=party?.market?.offers?.find(x=>x.id===id);if(!raw||raw.sold)return;const offer=resolvedOffer(raw);purchase(offer,marketOfferName(raw),value=>{raw.sold=value;});};
  function fixedOffer(rule){return {kind:rule.type,key:rule.key,qty:rule.quantity,price:Math.min(1e9,Math.round(rule.quantity*unitPrice(rule)))};}
  globalThis.buyFixedShopOffer=function(id){const rule=SHOP_SETTINGS.fixedOffers.entries.find(x=>x.id===id&&x.enabled);if(!rule)return;const offer=fixedOffer(rule);purchase(offer,offerName(offer,rule));};
  function productRow(input,rule,random){
    const offer=resolvedOffer(input),item=offerItem(offer),name=offerName(offer,rule),description=offerDescription(offer,rule),effect=offerEffect(offer),slot=stockSlot(offer),count=Number(slot?.object?.[slot.key])||0;
    const title=item&&!rule?.name?textRarityItemHTML(item):esc(name),disabled=input.sold||state.gold<offer.price;
    return `<article class="shop-product-row ${random?'random-shop-row':'fixed-shop-row'}"><div class="shop-product-name"><b title="${esc(name)}">${title}</b><span class="small">${random?'數量':'每份'} ${offer.qty}${random&&input.sold?' · 已售完':''}</span></div><div class="shop-product-copy"><p class="shop-card-description"><b>說明：</b><span>${esc(description)}</span></p><p class="shop-card-detail"><b>效果：</b><span>${esc(effect)}</span></p></div><div class="shop-product-meta"><b>${offer.price} 金幣</b><span class="small">共用 ${count.toLocaleString()}</span></div><button onclick="${random?`buyMarketOffer('${input.id}')`:`buyFixedShopOffer('${rule.id}')`}" ${disabled?'disabled':''}>${input.sold?'已售完':'購買'}</button></article>`;
  }
  marketCards=function(){return party.market?.offers?.length?party.market.offers.map(o=>productRow(o,marketRule(resolvedOffer(o)),true)).join(''):'<div class="shop-empty">本批沒有隨機商品。</div>';};
  const baseValidateParty=validateParty;
  validateParty=function(input){
    const p=baseValidateParty(input);if(p.market){const raw=input.market||{};p.market.dayKey=typeof raw.dayKey==='string'?raw.dayKey:localDayKey();p.market.refreshCount=Number.isInteger(raw.refreshCount)&&raw.refreshCount>=0?raw.refreshCount:0;
      for(const [i,offer] of p.market.offers.entries()){if(offer.kind==='item'&&!SHOP.some(x=>x.id===offer.key))throw Error('商店存檔引用不存在的道具：'+offer.key);if(typeof raw.offers?.[i]?.ruleId==='string')offer.ruleId=raw.offers[i].ruleId;}
    }return p;
  };
  shopView=function(){
    ensureHealingPotionState();ensureMarket();syncMarketDay();const fixed=SHOP_SETTINGS.fixedOffers.entries.filter(x=>x.enabled).map(rule=>productRow(fixedOffer(rule),rule,false)).join(''),cost=currentRefreshCost(),rc=party.market?.refreshCount||0;
    return heading('SUPPLIES / 全隊共用','商店')+`<div class="shop-catalog-scroll"><section class="shop-section shop-random-section"><div class="shop-section-head"><h2>隨機商品</h2><div class="shop-refresh-meta"><span>第 ${party.market.serial} 批</span><span>今日已刷新 <b>${rc}</b> 次</span><span>每日 0 點重置刷新價格</span></div><div class="actions"><button onclick="refreshMarket()" ${state.gold<cost||!hasRandomRules()?'disabled':''}>刷新 · ${cost} 金幣</button></div></div><div class="shop-product-grid">${marketCards()}</div></section><section class="shop-section shop-fixed-section"><div class="shop-section-head"><h2>固定商品</h2><span class="small">購買後進入共用背包；使用請到「背包 → 道具」。</span></div><div class="shop-product-grid">${fixed||'<div class="shop-empty">目前沒有上架固定商品。</div>'}</div></section></div>`;
  };

  function inventoryItemCount(item){return (typeof isHealPotion==='function'&&isHealPotion(item))?healPotionCount(item.id):(state.consumables[item.id]||0);}
  function setInventoryItemCount(item,n){n=Math.max(0,Math.floor(Number(n)||0));if(typeof isHealPotion==='function'&&isHealPotion(item))setHealPotionCount(item.id,n);else state.consumables[item.id]=n;}
  globalThis.useInventoryItem=function(id,key){const item=SHOP.find(x=>x.id===id),h=partyMember(key);if(!item||!h)return;if(id==='power_tier_reroll'){setTab('forge');toast('請選擇裝備後使用'+item.name);return;}if(typeof isHealPotion==='function'&&isHealPotion(item)){openHealingSettings();return;}if(inventoryItemCount(item)<1)return toast('道具數量不足');pageHeroSelection.set('equipment',key);withHero(h,()=>useSupply(id));render();};
  globalThis.sellInventoryItem=function(id,qty){const item=SHOP.find(x=>x.id===id);if(!item)return;const have=inventoryItemCount(item),n=Math.max(0,Math.min(have,Math.floor(Number(qty)||0)));if(n<1)return toast('請輸入要販售的數量');const price=itemSellPrice(id),gold=state.gold;setInventoryItemCount(item,have-n);state.gold+=price*n;if(!save()){setInventoryItemCount(item,have);state.gold=gold;return;}render();toast(`已販售 ${item.name} ×${n}，獲得 ${price*n} 金幣`);};
  globalThis.sellInventoryItemFromButton=function(btn,id,all=false){const item=SHOP.find(x=>x.id===id);if(!item)return;const row=btn.closest('[data-inventory-item]'),input=row?.querySelector('input[data-sell-qty]'),qty=all?inventoryItemCount(item):input?.value;sellInventoryItem(id,qty);};
  accountItemsView=function(){
    ensureHealingPotionState();const target=pageHero('equipment')||party.members[0],rows=SHOP;
    return heading('ITEMS / 帳號共用','道具庫存')+`<section class="panel"><div class="inventory-item-controls"><label>使用角色 <select onchange="selectPageHero('equipment',Number(this.value))">${party.members.map(h=>`<option value="${memberKey(h)}" ${h===target?'selected':''}>${esc(characterName(h))} LV${h.lv}</option>`).join('')}</select></label><span class="small">治療藥水仍只由自動喝水使用；其他消耗道具的手動使用統一在此操作。</span></div><div class="inventory-supply-status">${esc(characterName(target))}目前效果：${esc(supplyStatus(target)||'無')}</div><div class="account-item-list">${rows.map(item=>{const n=inventoryItemCount(item),heal=typeof isHealPotion==='function'&&isHealPotion(item),detail=heal?`恢復最大生命 ${pctText(item.healFraction)}% · 冷卻 ${item.cooldown} 回合`:supplyDetail(item);return `<div class="account-item-row" data-inventory-item="${esc(item.id)}"><div class="account-item-main"><b>${textRarityItemHTML(item)}</b><span class="small">${heal?'自動治療藥水':'可手動使用消耗品'}</span></div><div class="account-item-desc">${esc(globalThis.equipmentPlayerItemDescription?.(item)??(item.description||item.desc||''))}<span class="detail">${esc(detail)}</span></div><div class="account-item-count">× ${n.toLocaleString()}<br><span class="small">賣 ${itemSellPrice(item.id)}</span></div><div class="account-item-actions">${heal?`<button onclick="openHealingSettings()">自動設定</button>`:`<button onclick="useInventoryItem('${item.id}',${memberKey(target)})" ${n<1?'disabled':''}>${EmberwildTimedBoosts.isItem(item)?'使用（全隊）':'對'+esc(characterName(target))+'使用'}</button>`}<input data-sell-qty type="number" min="1" max="${n}" value="1" ${n<1?'disabled':''}><button onclick="sellInventoryItemFromButton(this,'${item.id}',false)" ${n<1?'disabled':''}>賣出</button><button onclick="sellInventoryItemFromButton(this,'${item.id}',true)" ${n<1?'disabled':''}>全部</button></div></div>`;}).join('')}</div></section>`;
  };
  globalThis.accountItemsView=accountItemsView;
  const shopInventoryEquipmentBase=equipmentView;
  equipmentView=function(){if(inventoryCategory==='items')return inventoryTabs()+accountItemsView();return shopInventoryEquipmentBase();};
  if(state)render();
})();
