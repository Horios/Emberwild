/* Catalog rules are global; achievements, tickets and unlocks belong to one player save. */
(()=>{
  const model=EmberwildCompanionSkills,A=EmberwildAchievements,copy=A.copy||((x)=>JSON.parse(JSON.stringify(x)));
  const plans=()=>__EMBERWILD_COMPANION_TEST_API.plans,validateProgress=model.validateUnlockProgress;
  const catalog=()=>A.catalog(GAMEPLAY_SETTINGS.maps.catalog);
  let syncing=false;
  const announced=new Set(party?.achievements?.notifications.map(n=>n.id)||[]);
  function notice(title,text){const a=party.achievements;a.noticeSerial++;a.notifications.push({id:a.noticeSerial,title,text,at:Date.now(),seen:false});a.notifications=a.notifications.slice(-100);}
  function syncUnlocks(){
    if(!party||syncing)return;syncing=true;
    try{
      const progress=party.companionUnlocks??=validateProgress(),a=party.achievements??=A.migrate(undefined,progress);
      for(const h of party.members.slice(1))if(h.companionId!==undefined&&!progress.unlocked.includes(h.companionId))progress.unlocked.push(h.companionId);
      MAPS.forEach((m,i)=>{if(solo.canVisit(i,playerHero())&&!progress.regions.includes(i))progress.regions.push(i);});
      const completed=new Set(a.completed);
      for(const entry of catalog()){
        const value=entry.kind==='open'?Number(progress.regions.includes(entry.mapIndex)):(entry.kind==='elite'?a.eliteKills:a.bossKills)[entry.mapIndex]||0;
        if(!completed.has(entry.id)&&value>=(entry.kind==='open'?1:entry.count)){completed.add(entry.id);a.completed.push(entry.id);notice('成就達成',entry.name);}
      }
      for(const p of plans()){
        if(p.availability==='hidden'||progress.unlocked.includes(p.id))continue;
        const c=p.unlockCondition;
        if(c.type==='initial')progress.unlocked.push(p.id);
        else if(c.type==='achievement'&&!a.rewardCompanions.includes(p.id)&&c.achievementIds.some(id=>completed.has(id))){
          a.rewardCompanions.push(p.id);
          if(!a.tickets[p.id]){a.tickets[p.id]=1;notice('獲得夥伴招募券',`${p.name}招募券 ×1 已送到背包 → 道具，使用後開放招募。`);}
        }
      }
    }finally{syncing=false;}
  }
  function flushNotices(){const list=party?.achievements?.notifications.filter(n=>!announced.has(n.id))||[];if(!list.length)return;for(const n of list){announced.add(n.id);note(`${n.title}：${n.text}`);}const rewards=list.filter(n=>n.title==='獲得夥伴招募券');toast(rewards.length?rewards.map(n=>n.text).join('；'):list.length===1?`成就達成：${list[0].text}`:`達成 ${list.length} 項成就，可到成就頁查看通知`);}
  globalThis.companionUnlocked=function(id){syncUnlocks();return !!party?.companionUnlocks?.unlocked.includes(id);};
  globalThis.companionTicketCount=function(id){syncUnlocks();return party?.achievements?.tickets[id]||0;};
  globalThis.companionUnlockText=function(p){
    syncUnlocks();if(companionUnlocked(p.id))return '已解鎖，可招募';if(companionTicketCount(p.id))return '已持有招募券，請到背包 → 道具使用';
    const c=p.unlockCondition;
    if(c.type==='achievement'){const names=new Map(catalog().map(x=>[x.id,x.name]));return '達成任一成就可獲得招募券：'+c.achievementIds.map(id=>names.get(id)||id).join('、');}
    return c.type==='ticket'?`購買商店隨機刷出的「${p.name}招募券」，到背包使用後解鎖`:'初始開放';
  };
  const baseValidate=validateParty;
  validateParty=function(raw){const progress=validateProgress(raw?.companionUnlocks),achievements=A.migrate(raw?.achievements,progress),out=baseValidate(raw);out.companionUnlocks=progress;out.achievements=achievements;return out;};
  const basePack=packParty;
  packParty=function(){syncUnlocks();return {...basePack(),companionUnlocks:copy(party.companionUnlocks),achievements:copy(party.achievements)};};
  const baseSave=save;
  save=function(...args){syncUnlocks();const result=baseSave(...args);if(result===true)flushNotices();return result;};
  const baseLoad=loadParty;
  loadParty=function(...args){const out=baseLoad(...args);announced.clear();for(const n of party?.achievements?.notifications||[])announced.add(n.id);syncUnlocks();return out;};
  const baseStart=start;
  start=function(...args){announced.clear();return baseStart(...args);};
  const baseReward=rewardGroupKill;
  rewardGroupKill=function(e){
    if(!e||e.rewarded||!party)return baseReward(e);
    syncUnlocks();const a=party.achievements,before=a.noticeSerial,region=e.region??party.map;
    if(Number.isInteger(region)&&MAPS[region]){
      if(e.kind==='elite'){a.eliteKills[region]=Math.min(1e12,(a.eliteKills[region]||0)+1);party.companionUnlocks.eliteKills[region]=a.eliteKills[region];}
      if(['boss','final'].includes(e.kind))a.bossKills[region]=Math.min(1e12,(a.bossKills[region]||0)+1);
    }
    const out=baseReward(e);syncUnlocks();if(a.noticeSerial>before)save();return out;
  };
  globalThis.useCompanionRecruitmentTicket=function(id){
    const p=plans().find(p=>p.id===id)||party?.companionProfiles?.[id],duplicate=companionUnlocked(id);
    if(!p||companionTicketCount(id)<1||p.availability==='hidden'&&!duplicate)return false;
    const old=copy(party.achievements),progress=copy(party.companionUnlocks),gold=state.gold,value=model.duplicateTicketGold(p);
    if(duplicate&&gold+value>1e12){toast('金幣已達上限，招募券已保留');return false;}
    party.achievements.tickets[id]--;if(!party.achievements.tickets[id])delete party.achievements.tickets[id];
    if(duplicate)state.gold+=value;else party.companionUnlocks.unlocked.push(id);
    if(!save()){party.achievements=old;party.companionUnlocks=progress;state.gold=gold;return false;}
    render();
    if(duplicate){$('modal').innerHTML=`<h2>夥伴已解鎖</h2><p>「${esc(p.name)}」已解鎖，${esc(p.name)}招募券 ×1 已轉換為 <b>${value} 金幣</b>。</p><button onclick="closeModal()">確認</button>`;$('modal').showModal();toast(`夥伴已解鎖，招募券已轉換為 ${value} 金幣`);}
    else toast(`已解鎖 ${p.name}，可到夥伴名冊招募`);return true;
  };
  const candidates=()=>plans().filter(p=>p.availability==='visible'&&p.unlockCondition.type==='ticket'&&!companionUnlocked(p.id)&&!companionTicketCount(p.id));
  globalThis.hasCompanionRecruitmentOffers=()=>!!party&&candidates().length>0;
  const baseGenerate=generateMarket;
  generateMarket=function(){const market=baseGenerate();for(const p of candidates()){if(market.offers.length>=100)break;const c=p.unlockCondition;if(Math.random()<c.chance)market.offers.push({id:`${market.serial}-${market.offers.length}`,kind:'material',key:`夥伴招募券-${p.id}`,qty:1,price:c.price,sold:false,ruleId:`companion-recruit-${p.id}`});}return market;};
  function ticketPlan(o){return o?.ruleId?.startsWith('companion-recruit-')?plans().find(p=>p.id===Number(o.ruleId.slice(18))&&p.availability==='visible'&&p.unlockCondition.type==='ticket'&&o.kind==='material'&&o.key===`夥伴招募券-${p.id}`&&o.qty===1&&o.price===p.unlockCondition.price):null;}
  const baseCards=marketCards;
  marketCards=function(){const extra=(party.market?.offers||[]).map(o=>{const p=ticketPlan(o);if(!p)return '';const done=o.sold||companionUnlocked(p.id)||companionTicketCount(p.id);return `<article class="shop-product-row random-shop-row"><div class="shop-product-name"><b>${esc(p.name)}招募券</b><span class="small">數量 1</span></div><div class="shop-product-copy"><p>購買後放入背包 → 道具，使用後解鎖${esc(p.name)}。</p></div><div class="shop-product-meta"><b>${o.price} 金幣</b></div><button onclick="buyMarketOffer('${esc(o.id)}')" ${done||state.gold<o.price?'disabled':''}>${done?'已取得':'購買'}</button></article>`;}).join('');const base=baseCards();return (extra&&base.includes('本批沒有隨機商品')?'':base)+extra;};
  const baseBuy=buyMarketOffer;
  buyMarketOffer=function(id){const o=party?.market?.offers.find(o=>o.id===id);if(!o?.ruleId?.startsWith('companion-recruit-'))return baseBuy(id);const p=ticketPlan(o);if(!p||o.sold||companionUnlocked(p.id)||companionTicketCount(p.id))return;if(state.gold<o.price)return toast('金幣不足');const gold=state.gold,old=copy(party.achievements);state.gold-=o.price;o.sold=true;party.achievements.tickets[p.id]=1;if(!save()){state.gold=gold;o.sold=false;party.achievements=old;return;}render();toast(`${p.name}招募券已放入背包，使用後解鎖`);};
  const baseInventory=accountItemsView;
  accountItemsView=function(){syncUnlocks();const items=Object.entries(party.achievements.tickets).filter(([,n])=>n>0);if(!items.length)return baseInventory();return baseInventory()+`<section class="panel"><h2>夥伴招募券</h2><div class="account-item-list">${items.map(([id,n])=>{const p=plans().find(p=>p.id===Number(id))||party.companionProfiles?.[id],duplicate=companionUnlocked(Number(id)),disabled=!p||p.availability==='hidden'&&!duplicate;return `<article class="account-item-row" data-companion-ticket="${id}"><div class="account-item-main"><b>${esc(p?.name||'夥伴 '+id)}招募券</b><span class="small">指定角色招募券</span></div><div class="account-item-desc">使用後開放該夥伴招募，再到夥伴名冊加入隊伍。</div><div class="account-item-count">× ${n}</div><div class="account-item-actions"><button onclick="useCompanionRecruitmentTicket(${id})" ${disabled?'disabled':''}>${disabled?'目前不可使用':duplicate?'轉換金幣':'使用招募券'}</button></div></article>`;}).join('')}</div></section>`;};
  globalThis.accountItemsView=accountItemsView;
  let regionFilter=String(party?.map??0),kindFilter='all',statusFilter='all';
  globalThis.setAchievementFilter=function(key,value){if(key==='region'&&(value==='all'||/^\d+$/.test(value)&&MAPS[Number(value)]))regionFilter=value;else if(key==='kind'&&['all','open','elite','boss'].includes(value))kindFilter=value;else if(key==='status'&&['all','done','pending'].includes(value))statusFilter=value;else return false;render();return true;};
  globalThis.markAchievementNotificationsRead=function(){syncUnlocks();const old=copy(party.achievements);for(const n of party.achievements.notifications)n.seen=true;if(!save()){party.achievements=old;return false;}render();return true;};
  globalThis.achievementsView=function(){
    syncUnlocks();const a=party.achievements,all=catalog(),done=new Set(a.completed),owners=plans().filter(p=>p.availability==='visible'&&p.unlockCondition.type==='achievement'),rows=all.filter(x=>(regionFilter==='all'||x.mapIndex===Number(regionFilter))&&(kindFilter==='all'||x.kind===kindFilter)&&(statusFilter==='all'||done.has(x.id)===(statusFilter==='done')));
    const select=(key,value,list)=>`<select aria-label="${key==='region'?'地區':key==='kind'?'成就類型':'達成狀態'}" onchange="setAchievementFilter('${key}',this.value)">${list.map(([id,label])=>`<option value="${id}" ${value===id?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
    return heading('ACHIEVEMENTS / 玩家成就','成就',`<span class="tag">達成 ${all.filter(x=>done.has(x.id)).length} / ${all.length}</span>`)+`<section class="panel"><p class="small">各地區獨立計數，各難度合計；菁英與 BOSS 每 50 隻一階，最高 1000。終局首領計入 BOSS。綁定成就達成時，指定夥伴招募券自動送入背包，每位夥伴只發一次。</p><div class="achievement-filters">${select('region',regionFilter,[['all','全部地區'],...MAPS.map((m,i)=>[String(i),m.name])])}${select('kind',kindFilter,[['all','全部類型'],['open','地區開放'],['elite','菁英擊殺'],['boss','BOSS 擊殺']])}${select('status',statusFilter,[['all','全部狀態'],['done','已達成'],['pending','未達成']])}</div><div class="achievement-list">${rows.map(x=>{const count=x.kind==='open'?Number(party.companionUnlocks.regions.includes(x.mapIndex)):(x.kind==='elite'?a.eliteKills:a.bossKills)[x.mapIndex]||0,target=x.kind==='open'?1:x.count,rewards=owners.filter(p=>p.unlockCondition.achievementIds.includes(x.id));return `<article class="achievement-row ${done.has(x.id)?'done':''}" data-achievement="${x.id}"><div><b>${esc(x.name)}</b><span class="small">${done.has(x.id)?'已達成':'未達成'} · ${Math.min(count,target)} / ${target}</span><progress max="${target}" value="${Math.min(count,target)}" aria-label="${esc(x.name)}進度"></progress></div><div class="small">${rewards.map(p=>`${esc(p.name)}招募券${a.rewardCompanions.includes(p.id)?' · 已發送':''}`).join('<br>')||'無夥伴招募券獎勵'}</div></article>`;}).join('')||'<p class="empty">沒有符合篩選的成就。</p>'}</div></section><section class="panel"><div class="row"><h2>成就與獎勵通知</h2><button onclick="markAchievementNotificationsRead()">全部標為已讀</button></div><div class="achievement-notices">${[...a.notifications].reverse().map(n=>`<article class="achievement-notice ${n.seen?'':'unread'}"><b>${esc(n.title)}${n.seen?'':' · 未讀'}</b><p>${esc(n.text)}</p><span class="small">${esc(new Date(n.at).toLocaleString('zh-TW'))}</span></article>`).join('')||'<p class="small">尚無通知。</p>'}</div></section>`;
  };
  const baseApply=applyBalanceConfig;
  applyBalanceConfig=function(input,options={}){const before=JSON.stringify(plans().map(p=>[p.id,p.availability,p.unlockCondition])),out=baseApply(input,{persist:false});syncUnlocks();if(party&&before!==JSON.stringify(plans().map(p=>[p.id,p.availability,p.unlockCondition])))party.market=generateMarket();if(options.persist!==false){localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));if(party)save();}if(state)render();return out;};
  if(party)syncUnlocks();
  globalThis.__EMBERWILD_COMPANION_UNLOCK_TEST={validateProgress,syncUnlocks,ticketPlan,catalog};
})();
