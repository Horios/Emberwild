/* Catalog visibility belongs to balance data; unlock progress belongs to a player save. */
(()=>{
  const model=EmberwildCompanionSkills,copy=x=>JSON.parse(JSON.stringify(x));
  const plans=()=>__EMBERWILD_COMPANION_TEST_API.plans;
  const validateProgress=model.validateUnlockProgress;
  function syncUnlocks(){
    if(!party)return;
    const progress=party.companionUnlocks??=validateProgress();
    for(const h of party.members.slice(1))if(h.companionId!==undefined&&!progress.unlocked.includes(h.companionId))progress.unlocked.push(h.companionId);
    const player=playerHero();
    MAPS.forEach((m,i)=>{if(solo.canVisit(i,player)&&!progress.regions.includes(i))progress.regions.push(i);});
    for(const p of plans()){
      if(p.availability==='hidden'||progress.unlocked.includes(p.id))continue;
      const c=p.unlockCondition;
      if(c.type==='initial'||c.type==='region'&&progress.regions.includes(c.mapIndex)||c.type==='elite'&&(progress.eliteKills[c.mapIndex]||0)>=c.count)progress.unlocked.push(p.id);
    }
  }
  globalThis.companionUnlocked=function(id){syncUnlocks();return !!party?.companionUnlocks?.unlocked.includes(id);};
  globalThis.companionUnlockText=function(p){
    syncUnlocks();const c=p.unlockCondition;if(companionUnlocked(p.id))return '已解鎖，可招募';
    const map=MAPS[c.mapIndex]?.name||'指定地區';
    return c.type==='region'?`開啟「${map}」後解鎖`:c.type==='elite'?`擊敗「${map}」菁英 ${Math.min(party?.companionUnlocks?.eliteKills[c.mapIndex]||0,c.count)} / ${c.count} 隻`:c.type==='ticket'?`購買商店隨機刷出的「${p.name}招募券」後解鎖`:'初始開放';
  };
  const baseValidate=validateParty;
  validateParty=function(raw){const progress=validateProgress(raw?.companionUnlocks),out=baseValidate(raw);out.companionUnlocks=progress;return out;};
  const basePack=packParty;
  packParty=function(){syncUnlocks();return {...basePack(),companionUnlocks:copy(party.companionUnlocks)};};
  const baseSave=save;
  save=function(...args){syncUnlocks();return baseSave(...args);};
  const baseReward=rewardGroupKill;
  rewardGroupKill=function(e){
    if(!e||e.rewarded)return baseReward(e);
    syncUnlocks();const progress=party.companionUnlocks;
    // region is captured on the defeated enemy, never inferred from a later map selection.
    const region=e.region??party.map;
    if(e.kind==='elite'&&Number.isInteger(region)&&MAPS[region])progress.eliteKills[region]=Math.min(1e12,(progress.eliteKills[region]||0)+1);
    const out=baseReward(e);syncUnlocks();return out;
  };
  const candidates=()=>plans().filter(p=>p.availability==='visible'&&p.unlockCondition.type==='ticket'&&!companionUnlocked(p.id));
  globalThis.hasCompanionRecruitmentOffers=()=>!!party&&candidates().length>0;
  const baseGenerate=generateMarket;
  generateMarket=function(){const market=baseGenerate();for(const p of candidates()){if(market.offers.length>=100)break;const c=p.unlockCondition;if(Math.random()<c.chance)market.offers.push({id:`${market.serial}-${market.offers.length}`,kind:'material',key:`夥伴招募券-${p.id}`,qty:1,price:c.price,sold:false,ruleId:`companion-recruit-${p.id}`});}return market;};
  function ticketPlan(o){return o?.ruleId?.startsWith('companion-recruit-')?plans().find(p=>p.id===Number(o.ruleId.slice(18))&&p.availability==='visible'&&p.unlockCondition.type==='ticket'&&o.kind==='material'&&o.key===`夥伴招募券-${p.id}`&&o.qty===1&&o.price===p.unlockCondition.price):null;}
  const baseCards=marketCards;
  marketCards=function(){const extra=(party.market?.offers||[]).map(o=>{const p=ticketPlan(o);if(!p)return '';const done=o.sold||companionUnlocked(p.id);return `<article class="shop-product-row random-shop-row"><div class="shop-product-name"><b>${esc(p.name)}招募券</b><span class="small">數量 1</span></div><div class="shop-product-copy"><p>購買後立即解鎖${esc(p.name)}，可到夥伴名冊招募。</p></div><div class="shop-product-meta"><b>${o.price} 金幣</b></div><button onclick="buyMarketOffer('${esc(o.id)}')" ${done||state.gold<o.price?'disabled':''}>${done?'已解鎖':'購買'}</button></article>`;}).join('');const base=baseCards();return (extra&&base.includes('本批沒有隨機商品')?'':base)+extra;};
  const baseBuy=buyMarketOffer;
  buyMarketOffer=function(id){const o=party?.market?.offers.find(o=>o.id===id);if(!o?.ruleId?.startsWith('companion-recruit-'))return baseBuy(id);const p=ticketPlan(o);if(!p||o.sold||companionUnlocked(p.id))return;if(state.gold<o.price)return toast('金幣不足');const gold=state.gold,old=copy(party.companionUnlocks);state.gold-=o.price;o.sold=true;party.companionUnlocks.unlocked.push(p.id);if(!save()){state.gold=gold;o.sold=false;party.companionUnlocks=old;return;}render();toast('已解鎖 '+p.name+'，可到夥伴名冊招募');};
  const baseApply=applyBalanceConfig;
  applyBalanceConfig=function(input,options={}){
    const before=JSON.stringify(plans().map(p=>[p.id,p.availability,p.unlockCondition]));const out=baseApply(input,{persist:false});syncUnlocks();
    if(party&&before!==JSON.stringify(plans().map(p=>[p.id,p.availability,p.unlockCondition])))party.market=generateMarket();
    if(options.persist!==false){localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));if(party)save();}if(state)render();return out;
  };
  // Startup may have loaded a save before this module was installed.
  if(party)syncUnlocks();
  globalThis.__EMBERWILD_COMPANION_UNLOCK_TEST={validateProgress,syncUnlocks,ticketPlan};
})();
