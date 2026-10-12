/* Account boosts use wall-clock expiry; the expedition clock accrues only while combat runs. */
(function installTimedBoostRuntime(){
  const api=EmberwildTimedBoosts,copy=v=>JSON.parse(JSON.stringify(v));
  let clockParty=null,lastClockAt=Date.now(),wasActive=false,pacePausedAt=null,lastStatusKey='';
  const isActive=()=>!!party&&running&&!$('modal')?.open;
  function session(){if(!party)return null;return party.combatSession??={idleTimeMs:0,speed:1,reportPaused:false,filter:'all'};}
  function syncCombatClock(now=Date.now()){
    if(clockParty===party&&wasActive&&party){const s=session();s.idleTimeMs=Math.min(Number.MAX_SAFE_INTEGER,s.idleTimeMs+Math.max(0,now-lastClockAt));}
    const active=isActive();
    if(clockParty===party){
      if(wasActive&&!active)pacePausedAt=now;
      else if(!wasActive&&active&&pacePausedAt!==null){const delay=Math.max(0,now-pacePausedAt);if(nextActionAt)nextActionAt+=delay;if(roundStartedAt)roundStartedAt+=delay;pacePausedAt=null;}
    }else pacePausedAt=active?null:now;
    clockParty=party;lastClockAt=now;wasActive=active;
  }
  function changeRate(rate,now=Date.now()){
    const old=battleRate,timelineNow=pacePausedAt??now;
    if(old===rate)return;
    if(roundStartedAt)roundStartedAt=timelineNow-(timelineNow-roundStartedAt)*old/rate;
    nextActionAt=timelineNow+Math.max(0,nextActionAt-timelineNow)*old/rate;
    battleRate=rate;if(party)session().speed=rate;
  }
  function expireBoosts(now=Date.now()){
    if(!party)return false;
    const prior=party.timedBoosts?.length||0;party.timedBoosts=api.active(party,now);
    const invalid=battleRate===4&&!api.unlocked(party,now)||![1,2,4].includes(battleRate);
    if(invalid)changeRate(2,now);
    let elementalExpired=false;
    for(const h of party.members){let changed=false;for(const key of api.ELEMENTAL_TYPES)if(h[key]&&api.remainingMs(h[key],now)<=0){h[key]=null;changed=true;}if(changed){withHero(h,clampVitals);elementalExpired=true;}}
    return prior!==party.timedBoosts.length||invalid||elementalExpired;
  }
  function restoreSession(){
    if(party){const s=session();party.timedBoosts??=[];battleRate=s.speed;battleReportPaused=s.reportPaused;battleLogFilter=s.filter;expireBoosts();}
    else{battleRate=1;battleReportPaused=false;battleLogFilter='all';}
    clockParty=party;lastClockAt=Date.now();wasActive=isActive();pacePausedAt=wasActive?null:lastClockAt;
    lastStatusKey='';battleLogGeneration++;
  }
  globalThis.setBattleSpeed=function(rate){
    syncCombatClock();expireBoosts();
    if(![1,2,4].includes(rate)||rate===4&&!api.unlocked(party))return toast('4× 尚未解鎖，請先使用四倍速解鎖券');
    changeRate(rate);save();render();return true;
  };
  toggleBattleRate=function(){const rates=api.unlocked(party)?[1,2,4]:[1,2],index=rates.indexOf(battleRate);return setBattleSpeed(rates[(index+1)%rates.length]);};
  globalThis.battleSpeedButtons=function(){return `<div class="battle-speed-buttons">${[1,2,4].map(rate=>{const locked=rate===4&&!api.unlocked(party);return `<button type="button" class="${battleRate===rate?'primary':''}" onclick="setBattleSpeed(${rate})" aria-pressed="${battleRate===rate}" ${locked?'disabled aria-label="4倍速（鎖定）" title="使用四倍速解鎖券後可選擇"':''}>${rate}×${locked?'（鎖定）':''}</button>`;}).join('')}</div>`;};
  const useBase=useSupply;
  useSupply=function(id){
    const item=SHOP.find(x=>x.id===id);if(!api.isItem(item))return useBase(id);
    if(!party||(state.consumables[id]||0)<1)return;
    api.validateItem(item);expireBoosts();const before=copy(party.timedBoosts||[]),count=state.consumables[id];
    party.timedBoosts=(party.timedBoosts||[]).filter(b=>b.name!==item.name);
    if(party.timedBoosts.length>=200)return toast('有效增益來源已達上限');
    party.timedBoosts.push({itemId:item.id,name:item.name,boostType:item.boostType,bonusPercent:item.bonusPercent,durationMinutes:item.durationMinutes,expiresAt:api.expiryTime(item.durationMinutes)});
    state.consumables[id]--;
    if(save()===false){party.timedBoosts=before;state.consumables[id]=count;return;}
    render();toast('已使用'+item.name+'；同名效果刷新持續時間');
  };
  const detailBase=supplyDetail;
  supplyDetail=function(item){if(!api.isItem(item))return detailBase(item);return (item.boostType==='speed4'?'解鎖 4× 戰鬥倍速':api.LABELS[item.boostType]+'＋'+item.bonusPercent+'%')+' · 持續 '+item.durationMinutes+' 分鐘（現實時間） · 同名刷新';};
  const awardBase=awardXP;
  awardXP=function(amount){
    const h=playerHero(),capped=h.lv>=levelCap(h),earned=Math.max(0,Math.round(amount*(1+api.bonus(party,'exp')/100)));
    const result=awardBase(earned);if(!capped&&earned>0)note(characterName(h)+' 獲得 '+earned+' EXP','exp');return result;
  };
  const dropBase=partyDropRateBonus;
  partyDropRateBonus=function(){return dropBase()+api.bonus(party,'drop')/100;};
  const etherBase=etherDropChance;
  etherDropChance=function(e){return Math.min(1,etherBase(e)*(1+Math.max(0,partyDropRateBonus())));};

  function wrapClock(name){const base=globalThis[name];globalThis[name]=function(...args){syncCombatClock();try{return base.apply(this,args);}finally{syncCombatClock();}};}
  for(const name of ['toggleBattle','resetEncounter','restartExploration','closeModal','returnToTitle'])wrapClock(name);
  const resetBase=resetSession;
  resetSession=function(){syncCombatClock();const out=resetBase();clockParty=null;wasActive=false;pacePausedAt=null;battleRate=1;battleReportPaused=false;battleLogFilter='all';lastStatusKey='';return out;};
  const loadBase=loadParty;
  loadParty=function(data){const out=loadBase(data);restoreSession();return out;};
  const packBase=packParty;
  packParty=function(){syncCombatClock();expireBoosts();const out=packBase();if(out){const s=session();s.speed=battleRate;s.reportPaused=battleReportPaused;s.filter=battleLogFilter;out.timedBoosts=copy(party.timedBoosts);out.combatSession=copy(s);}return out;};
  const tickBase=tick;
  tick=function(){syncCombatClock();const changed=expireBoosts();if(changed&&state)render();try{return tickBase();}finally{syncCombatClock();refreshJournalRealtime();}};
  new MutationObserver(()=>{syncCombatClock();refreshJournalRealtime(true);}).observe($('modal'),{attributes:true,attributeFilter:['open']});

  const timeText=api.timeText;
  function boostRow(kind,now){
    const rows=api.active(party,now).filter(b=>b.boostType===kind);if(!rows.length)return '';
    const nearest=Math.min(...rows.map(b=>b.expiresAt)),summary=kind==='speed4'?timeText(Math.max(...rows.map(b=>b.expiresAt))-now):'＋'+api.bonus(party,kind,now)+'%｜'+timeText(nearest-now);
    const sources=rows.map(b=>b.name+'：'+timeText(b.expiresAt-now)).join('；');
    return `<div class="journal-boost-row" title="${esc(sources)}"><span>${api.LABELS[kind]}：</span><b>${summary}</b>${kind!=='speed4'&&rows.length>1?`<small>（下一筆到期）</small><details><summary>${rows.length} 個來源</summary>${rows.map(b=>`<div>${esc(b.name)}｜${timeText(b.expiresAt-now)}</div>`).join('')}</details>`:''}</div>`;
  }
  globalThis.battleJournalStatus=function(){
    const now=Date.now(),rows=api.KINDS.map(k=>boostRow(k,now)).join('');
    return `<div id="journalRealtimeStatus" class="journal-realtime-status"><div>已掛機時間：<b>${timeText(Math.floor((session()?.idleTimeMs||0)/1000)*1000,true)}</b></div><div class="journal-boosts">${rows||'<span class="small">目前增益：無</span>'}</div></div>`;
  };
  function refreshJournalRealtime(force=false){
    const now=Date.now(),key=JSON.stringify([Math.floor((session()?.idleTimeMs||0)/1000),api.active(party,now).map(b=>[b.name,b.boostType,b.bonusPercent,Math.ceil((b.expiresAt-now)/1000)])]);
    if(!force&&lastStatusKey===key)return;lastStatusKey=key;
    const node=$('journalRealtimeStatus');if(node){const fresh=document.createElement('template');fresh.innerHTML=battleJournalStatus();const next=fresh.content.firstElementChild;if(node.innerHTML!==next.innerHTML){const opened=[...node.querySelectorAll('details')].map(x=>x.open);node.innerHTML=next.innerHTML;node.querySelectorAll('details').forEach((d,i)=>{d.open=opened[i]||false;});}}
  }
  const referenceBase=balanceReference;
  balanceReference=function(){const out=referenceBase();out.itemTypes={...(out.itemTypes||{}),timedBoost:'全隊現實時間增益；boostType=speed4/exp/drop，bonusPercent 為加算百分比，durationMinutes 為正整數分鐘；同名刷新。'};out.units={...(out.units||{}),timedBoostDuration:'現實分鐘；暫停與關閉頁面仍會到期'};out.balancePaths={...(out.balancePaths||{}),'items[].bonusPercent':'各限時來源的加算百分比，經驗與掉寶各自先相加。','items[].durationMinutes':'抗性／屬性增幅與限時增益的現實分鐘；元素藥水可輸入小數，不使用 duration 的戰鬥回合。','combat.pacing.rates':'固定 1/2/4；4× 需要有效解鎖效果。'};out.dropAlgorithm='掉落率 = 基礎機率 × (1 + 全隊裝備加成 + 各有效限時來源加成)，封頂 100%；首殺保底不變。';return out;};
  const exportBase=exportableBalance;
  exportableBalance=function(){const out=exportBase();out.timeUnits={...(out.timeUnits||{}),timedBoostDuration:'realMinutes'};out.notes=[...(out.notes||[]),'type=timedBoost 使用 boostType / bonusPercent / durationMinutes；各類來源加算，同名效果刷新，不累積倍率或時間。'];return out;};
  const guideBase=guideView;
  guideView=function(){return `<section class="panel"><h2>倍速與限時增益</h2><p>日常探索可使用 1×／2×；4× 需要解鎖券，效果到期時自動回到 2×。倍速只影響進行速度，單場獎勵不變。經驗與掉寶的百分比各自加算，不同類型可同時生效；同名道具重新使用會刷新完整時間。</p><p>限時券按現實時間到期，暫停或關閉遊戲仍會扣時。已掛機時間只計實際探索時間；暫停戰鬥或對話框暫停時停止。戰報暫停與篩選只影響紀錄顯示。</p></section>`+guideBase();};
  restoreSession();if(state)render();
  globalThis.__EMBERWILD_TIMED_BOOST_TEST={syncCombatClock,expireBoosts,restoreSession,refreshJournalRealtime};
})();
