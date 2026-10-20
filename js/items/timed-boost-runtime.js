/* Consumables and expedition time share one active exploration clock; there is no offline combat. */
(function installTimedBoostRuntime(){
  const api=EmberwildTimedBoosts,copy=v=>JSON.parse(JSON.stringify(v));
  let lastBoostState='',clockParty=null,lastClockAt=Date.now(),wasActive=false,pacePausedAt=null,lastStatusKey='';
  const isActive=()=>!!party&&running&&!$('modal')?.open;
  function session(){if(!party)return null;return party.combatSession??={idleTimeMs:0,speed:1,reportPaused:false,filter:'all',pauseBoostsOnSpeedEnd:false};}
  function syncCombatClock(now=Date.now()){
    if(clockParty===party&&wasActive&&party){const s=session(),elapsed=Math.max(0,now-lastClockAt);s.idleTimeMs=Math.min(Number.MAX_SAFE_INTEGER,s.idleTimeMs+elapsed);const elemental=party.members.map(h=>api.ELEMENTAL_TYPES.flatMap(k=>api.buffRows(h[k])).filter(b=>b.enabled));api.consume(party,elapsed);party.members.forEach((h,i)=>{if(elemental[i].some(b=>!b.enabled))withHero(h,clampVitals);});}
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
    const before=JSON.stringify([battleRate,(party.timedBoosts||[]).map(b=>b.enabled)]);
    party.timedBoosts=(party.timedBoosts||[]).map(b=>api.migrateBuff(b,now,b.boostType!=='speed2'||battleRate===2));
    const speedOn=api.active(party,now).some(b=>b.boostType==='speed2');
    if(battleRate===2&&!speedOn||![1,2].includes(battleRate))changeRate(1,now);
    let elementalExpired=false;
    for(const h of party.members)for(const key of api.ELEMENTAL_TYPES){
      const rows=api.buffRows(h[key]);h[key]=api.compactBuffs(rows.map(b=>api.migrateBuff(b,now)));
      if(rows.some(b=>b.enabled&&api.remainingMs(b,now)<=0)){withHero(h,clampVitals);elementalExpired=true;}
    }
    return before!==JSON.stringify([battleRate,party.timedBoosts.map(b=>b.enabled)])||elementalExpired;
  }
  function restoreSession(){
    if(party){const s=session();party.timedBoosts=(party.timedBoosts||[]).map(b=>api.migrateBuff(b,Date.now(),b.boostType!=='speed2'||s.speed===2));s.pauseBoostsOnSpeedEnd??=false;battleRate=s.speed;battleReportPaused=s.reportPaused;battleLogFilter=s.filter;expireBoosts();}
    else{battleRate=1;battleReportPaused=false;battleLogFilter='all';}
    clockParty=party;lastClockAt=Date.now();wasActive=isActive();pacePausedAt=wasActive?null:lastClockAt;
    lastStatusKey='';battleLogGeneration++;
  }
  globalThis.setBattleSpeed=function(rate){
    syncCombatClock();expireBoosts();
    if(![1,2].includes(rate)||rate===2&&!api.unlocked(party))return toast('2× 尚未解鎖，請先使用兩倍速解鎖券');
    for(const b of party?.timedBoosts||[])if(b.boostType==='speed2')b.enabled=rate===2&&api.remainingMs(b)>0;
    changeRate(rate);save();render();return true;
  };
  toggleBattleRate=function(){const rates=api.unlocked(party)?[1,2]:[1],index=rates.indexOf(battleRate);return setBattleSpeed(rates[(index+1)%rates.length]);};
  globalThis.battleSpeedButtons=function(){return `<div class="battle-speed-buttons">${[1,2].map(rate=>{const locked=rate===2&&!api.unlocked(party);return `<button type="button" class="${battleRate===rate?'primary':''}" onclick="setBattleSpeed(${rate})" aria-pressed="${battleRate===rate}" ${locked?'disabled aria-label="2倍速（鎖定）" title="使用兩倍速解鎖券後可選擇"':''}>${rate}×${locked?'（鎖定）':''}</button>`;}).join('')}</div>`;};
  const useBase=useSupply;
  useSupply=function(id){
    syncCombatClock();const item=SHOP.find(x=>x.id===id);if(!api.isItem(item))return useBase(id);
    if(!party||(state.consumables[id]||0)<1)return;
    api.validateItem(item);expireBoosts();const before=copy(party.timedBoosts||[]),count=state.consumables[id];
    const now=Date.now();
    try{party.timedBoosts=api.stackBuff(party.timedBoosts||[],{itemId:item.id,name:item.name,boostType:item.boostType,bonusPercent:item.bonusPercent,durationMinutes:item.durationMinutes,remainingMs:api.expiryTime(item.durationMinutes,0),enabled:item.boostType!=='speed2'||battleRate===2},now);}
    catch(e){return toast(e.message);}
    state.consumables[id]--;
    if(save()===false){party.timedBoosts=before;state.consumables[id]=count;return;}
    render();toast('已使用'+item.name+'；同名同效果累加時間，單一狀態上限 24 小時');
  };
  const detailBase=supplyDetail;
  supplyDetail=function(item){if(!api.isItem(item))return detailBase(item);return (item.boostType==='speed2'?'解鎖 2× 戰鬥倍速':api.LABELS[item.boostType]+'＋'+item.bonusPercent+'%')+' · 持續 '+item.durationMinutes+' 分鐘（有效探索時間） · 同名同效果累加時間；不同倍率獨立計時；單一狀態上限 24 小時';};
  const awardBase=awardXP;
  awardXP=function(amount,{applyExpBoost=true}={}){
    const h=playerHero(),capped=h.lv>=levelCap(h),earned=Math.max(0,Math.round(amount*(applyExpBoost?1+api.bonus(party,'exp')/100:1)));
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
  tick=function(){syncCombatClock();const changed=expireBoosts(),key=JSON.stringify([battleRate,party?.timedBoosts?.map(b=>b.enabled)]);if((changed||key!==lastBoostState)&&state){lastBoostState=key;render();}try{return tickBase();}finally{syncCombatClock();refreshJournalRealtime();}};
  new MutationObserver(()=>{syncCombatClock();refreshJournalRealtime(true);}).observe($('modal'),{attributes:true,attributeFilter:['open']});

  const timeText=api.timeText;
  const boostState=b=>api.remainingMs(b)<=0?'時間已耗盡':!b.enabled?'已停用':isActive()?'啟用・消耗中':'啟用・等待探索';
  function sources(){return [...(party?.timedBoosts||[]).map((b,i)=>({b,key:'team:'+i,owner:'全隊'})),...(party?.members||[]).flatMap((h,i)=>api.ELEMENTAL_TYPES.flatMap(k=>api.buffRows(h[k]).map((b,j)=>({b,key:i+':'+k+':'+j,owner:characterName(h)}))))];}
  function source(key){return sources().find(x=>x.key===key);}
  globalThis.setTimedBoostEnabled=function(key,on){
    syncCombatClock();const row=source(key);if(!row||on&&api.remainingMs(row.b)<=0)return false;
    row.b.enabled=!!on;
    if(row.b.boostType==='speed2'){
      changeRate(api.active(party).some(b=>b.boostType==='speed2')?2:1);
    }
    if(!row.b.boostType){const h=party.members[Number(key.split(':')[0])];withHero(h,clampVitals);}
    save();render();return true;
  };
  globalThis.setPauseBoostsOnSpeedEnd=function(on){syncCombatClock();session().pauseBoostsOnSpeedEnd=!!on;save();};
  function effectText(b){return b.boostType==='speed2'?'2× 戰鬥倍速':b.boostType?api.LABELS[b.boostType]+'＋'+b.bonusPercent+'%':ELEMENTS[b.element]+' '+b.effectPercent+'%';}
  globalThis.timedBoostManagement=function(){
    const rows=sources();return `<details class="exploration-secondary" id="explorationBoostSettings"><summary>倍速與限時增益 · ${battleRate}×</summary>${battleSpeedButtons()}<p class="small">只消耗有效探索時間；暫停、停止與離線保留時間。</p><div class="boost-management-list">${rows.map(({b,key,owner})=>`<div class="boost-management-row"><b>${esc(b.name)}</b><small>${esc(owner)} · ${esc(effectText(b))}</small><span data-boost-time="${key}">${timeText(api.remainingMs(b))}</span><span data-boost-state="${key}">${boostState(b)}</span><button data-boost-toggle="${key}" onclick="setTimedBoostEnabled('${key}',${!b.enabled})" ${api.remainingMs(b)<=0?'disabled':''} aria-pressed="${!!b.enabled}">${b.enabled?'停用':'啟用'}</button></div>`).join('')||'<p class="small">尚未使用增益道具。</p>'}</div><label class="boost-link-setting"><input type="checkbox" ${session()?.pauseBoostsOnSpeedEnd?'checked':''} onchange="setPauseBoostsOnSpeedEnd(this.checked)">2 倍速結束時，自動暫停其他加倍效果</label></details>`;
  };
  globalThis.battleJournalStatus=function(){
    const rows=sources().filter(({b})=>api.remainingMs(b)>0),groups=[...api.KINDS,'elemental'].map(kind=>{
      const entries=rows.filter(({b})=>(b.boostType||'elemental')===kind);if(!entries.length)return '';
      const active=entries.filter(({b})=>b.enabled),shown=active.length?active:entries,left=Math.min(...shown.map(({b})=>api.remainingMs(b))),name=kind==='elemental'?'屬性藥水':api.LABELS[kind],effect=kind==='speed2'?battleRate+'×':kind==='elemental'?entries.length+' 個狀態':'＋'+api.bonus(party,kind)+'%',status=active.length?(isActive()?'消耗中':'等待探索'):'已停用',title=entries.map(({b,owner})=>owner+'・'+b.name+' '+timeText(api.remainingMs(b))+' '+boostState(b)).join('；');
      return `<div class="journal-boost-row" title="${esc(title)}"><span>${name} ${effect} · ${status}</span><b>${timeText(left)}</b>${entries.length>1?'<small>下一筆剩餘時間 · '+entries.length+' 個來源</small>':''}</div>`;
    }).join('');
    return `<div id="journalRealtimeStatus" class="journal-realtime-status"><div>已掛機時間：<b>${timeText(session()?.idleTimeMs||0,true)}</b></div><div class="journal-boosts">${groups||'<span class="small">目前增益：無</span>'}</div></div>`;
  }

  function refreshJournalRealtime(force=false){
    const key=JSON.stringify([Math.floor((session()?.idleTimeMs||0)/1000),isActive(),sources().map(({b})=>[b.name,b.enabled,Math.ceil(api.remainingMs(b)/1000)])]);
    if(!force&&lastStatusKey===key)return;lastStatusKey=key;
    const node=$('journalRealtimeStatus');if(node){const fresh=document.createElement('template');fresh.innerHTML=battleJournalStatus();const next=fresh.content.firstElementChild;if(next&&node.innerHTML!==next.innerHTML)node.innerHTML=next.innerHTML;}
    for(const {b,key} of sources()){
      const time=document.querySelector('[data-boost-time="'+key+'"]'),status=document.querySelector('[data-boost-state="'+key+'"]'),button=document.querySelector('[data-boost-toggle="'+key+'"]');
      if(time)time.textContent=timeText(api.remainingMs(b));if(status)status.textContent=boostState(b);
      if(button){button.disabled=api.remainingMs(b)<=0;button.textContent=b.enabled?'停用':'啟用';button.setAttribute('aria-pressed',String(!!b.enabled));button.setAttribute('onclick',"setTimedBoostEnabled('"+key+"',"+!b.enabled+")");}
    }
    globalThis.refreshExplorationStatus?.();
  }
  // Flush the same clock before page freeze/unload; no wall-clock debt is saved.
  addEventListener('pagehide',()=>{syncCombatClock();save();wasActive=false;});
  addEventListener('pageshow',()=>{lastClockAt=Date.now();wasActive=isActive();});
  document.addEventListener('visibilitychange',()=>{syncCombatClock();if(party)save();});
  const referenceBase=balanceReference;
  balanceReference=function(){const out=referenceBase();out.itemTypes={...(out.itemTypes||{}),timedBoost:'全隊有效探索時間增益；boostType=speed2/exp/drop，bonusPercent 為加算百分比，durationMinutes 為正整數分鐘；同名同效果累加時間；不同倍率獨立計時；單一狀態上限 24 小時。'};out.units={...(out.units||{}),timedBoostDuration:'有效探索分鐘；暫停、停止與離線不扣時'};out.balancePaths={...(out.balancePaths||{}),'items[].bonusPercent':'各限時來源的加算百分比，經驗與掉寶各自先相加。','items[].durationMinutes':'抗性／屬性增幅與限時增益的有效探索分鐘；元素藥水可輸入小數，不使用 duration 的戰鬥回合。','combat.pacing.rates':'固定 1/2；2× 需要有效解鎖效果。'};out.dropAlgorithm='掉落率 = 基礎機率 × (1 + 全隊裝備加成 + 各有效限時來源加成)，封頂 100%；首殺保底不變。';return out;};
  const exportBase=exportableBalance;
  exportableBalance=function(){const out=exportBase();out.timeUnits={...(out.timeUnits||{}),timedBoostDuration:'realMinutes',consumableClock:'exploration'};out.notes=[...(out.notes||[]),'type=timedBoost 使用 boostType / bonusPercent / durationMinutes；各類來源加算，同名同效果累加剩餘時間，不同倍率狀態各自計時；單一狀態上限 24 小時，超過時不消耗道具。'];return out;};
  const guideBase=guideView;
  guideView=function(){return `<section class="panel"><h2>倍速與限時增益</h2><p>日常探索為 1×；2× 需要兩倍速券，效果到期時自動回到 1×。倍速只影響進行速度，單場獎勵不變。經驗與掉寶的百分比各自加算，不同類型可同時生效；同名同效果的道具重新使用會累加剩餘時間，不同倍率保留各自狀態並獨立計時；每個狀態最多累積 24 小時，若本次使用會超過上限則提醒且不消耗道具。</p><p>限時券只按有效探索時間消耗，各項效果可獨立啟用、停用並保留時間；暫停、停止或關閉遊戲不扣時。已掛機時間只計實際探索時間；暫停戰鬥或對話框暫停時停止。戰報暫停與篩選只影響紀錄顯示。</p></section>`+guideBase();};
  restoreSession();if(state)render();
  globalThis.__EMBERWILD_TIMED_BOOST_TEST={sources,isActive,syncCombatClock,expireBoosts,restoreSession,refreshJournalRealtime};
})();
