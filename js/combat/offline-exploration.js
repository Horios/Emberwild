/* One event timeline for visible play, background throttling and cold saves.
   Party, combat cursor and pending receipt are committed by one KEY setItem. */
(()=>{
 'use strict';
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v)),api=EmberwildTimedBoosts;
 const hooks=()=>[EmberwildControlCombatState,EmberwildEnemyCombatState,EmberwildStatusCombatState,EmberwildTokenCombatState];
 const transient=['hp','shield','basicAdvanceRound','procAdvanceRound','procAdvanceSteps','nextActiveDamageBonus','healPotionCooldownRemaining'];
 let internal=false,stepping=false,job=null,failed=false,restoring=false,lastMode=false,actionSerial=0,lastRendered=0,gearPage=0,lastCheck=0,requestedAt=0,renderedReceipt=null,jobOffline=false,lastCommitted=globalThis.__EMBERWILD_BOOT_SAVE_RAW||null;
 let settlementProgress=null;
 const atTitle=()=>!!globalThis.isEmberwildTitleOpen?.();
 const nowReal=Date.now.bind(Date),basePack=packParty,baseSave=save,baseLoad=loadParty,baseValidate=validateParty;
 const active=()=>!!party&&running&&!$('modal')?.open&&!globalThis.isEmberwildTitleOpen?.();
 const clock=()=>party?.offlineExploration;
 function fresh(){return {version:2,startedAt:nowReal(),lastAt:nowReal(),status:'stopped',nextAt:0,roundAt:0,combat:null,receipt:null,pendingReceipt:null};}
 function migrate(c){
  if(c.version===1){
   if(c.receipt?.complete){c.status=c.resumeRunning?'running':c.status==='paused'?'paused':'stopped';c.receipt.legacy=true;}
   else if(c.receipt){c.pendingReceipt=c.receipt;c.receipt=null;}
   delete c.resumeRunning;c.version=2;
  }
  // Earlier versions could save a visible but empty completed receipt.
  if(c.receipt?.complete&&!hasRewards(c.receipt))c.receipt=null;
  c.pendingReceipt??=null;if(c.pendingReceipt)c.pendingReceipt.battles??=0;
  return c;
 }
 function ensure(){if(party&&!party.offlineExploration)party.offlineExploration=fresh();return clock()?migrate(clock()):null;}
 function snapshot(){return copy({foes,enemyId:enemy?.id,round,partyClock,effects,actorCooldowns,supportCooldowns,progress:combatRoundProgress,activeBattleStat,questChallenge:party.questChallenge||null,states:hooks().map(h=>h.pack()),heroes:party.members.map(h=>Object.fromEntries(transient.filter(k=>h[k]!==undefined).map(k=>[k,h[k]])))});}
 function hydrate(c){
  migrate(c);
  roundIterator=null;nextActionAt=c.nextAt;roundStartedAt=c.roundAt;
  running=c.status==='running';lastMode=running;
  const b=c.combat;if(!b)return;
  foes=copy(b.foes);enemy=foes.find(e=>e.id===b.enemyId)||null;round=b.round;partyClock=b.partyClock;effects=copy(b.effects);
  actorCooldowns=copy(b.actorCooldowns);supportCooldowns=copy(b.supportCooldowns);combatRoundProgress=copy(b.progress);activeBattleStat=copy(b.activeBattleStat);party.questChallenge=copy(b.questChallenge);
  hooks().forEach((h,i)=>h.restore(copy(b.states[i])));
  party.members.forEach((h,i)=>{for(const k of transient){if(b.heroes[i]?.[k]===undefined)delete h[k];else h[k]=b.heroes[i][k];}});
  running=c.status==='running';lastMode=running;
 }
 function validateCombat(b,members){
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),count=n=>Number.isSafeInteger(n)&&n>=0;
  const counters=v=>object(v)&&Object.values(v).every(n=>Number.isFinite(n)&&n>=0);
  const ids=new Set(b.foes.map(e=>e.id)),heroIds=new Set(members.map(h=>'hero-'+memberKey(h)));
  if(ids.size!==b.foes.length||!counters(b.actorCooldowns)||!counters(b.supportCooldowns)||b.effects.some(e=>!object(e)||typeof e.target!=='string'||typeof e.kind!=='string'||!Number.isFinite(e.value)||!Number.isFinite(e.until)))throw Error('離線戰鬥狀態無效');
  const [control,enemies,status,tokens]=b.states;
  if(!object(control)||!object(control.states)||!Array.isArray(control.summons)||control.summons.some(v=>!object(v))||!object(enemies)||Object.values(enemies).some(v=>!counters(v))||!object(status)||!Array.isArray(status.active)||status.active.some(v=>!object(v))||!Number.isSafeInteger(status.clock)||status.clock< -1||!count(status.serial)||!Array.isArray(tokens)||tokens.some(row=>!Array.isArray(row)||row.length!==2||!['number','string'].includes(typeof row[0])||!object(row[1])))throw Error('離線戰鬥效果快照無效');
  if(b.activeBattleStat&&(!object(b.activeBattleStat)||!Array.isArray(b.activeBattleStat.deaths)||!counters(b.activeBattleStat.drops)||!Number.isFinite(b.activeBattleStat.xp)||b.activeBattleStat.xp<0))throw Error('離線戰鬥統計無效');
  const p=b.progress;if(!p)return;
  if(p.order.some(ref=>!object(ref)||!['hero','enemy'].includes(ref.side)||typeof ref.id!=='string'||!(ref.side==='hero'?heroIds:ids).has(ref.id)))throw Error('離線回合角色引用無效');
  if(p.unit){const ref=p.order[p.index],h=ref?.side==='hero'?members.find(h=>'hero-'+memberKey(h)===ref.id):null,u=p.unit;
   if(!h||!object(u)||!Array.isArray(u.support)||!Array.isArray(u.active)||!count(u.index)||u.index>u.support.length||u.support.some(i=>!count(i)||!SUPPORT[h.job]?.[i])||u.active.some(i=>!count(i)||!CLASSES[h.job]?.skills[i]))throw Error('離線回合技能游標無效');
  }
 }
 function validate(raw,members=[]){
  if(raw===undefined)return null;
  const c=copy(raw),validTime=n=>Number.isSafeInteger(n)&&n>=0&&n<=8.64e15;
  if(![1,2].includes(c.version)||!validTime(c.lastAt)||!validTime(c.startedAt)||!['running','paused','stopped'].includes(c.status)||![c.nextAt,c.roundAt].every(n=>Number.isFinite(n)&&n>=0))throw Error('離線探索時間或狀態無效');
  if(c.combat){const b=c.combat;if(!Array.isArray(b.foes)||!Array.isArray(b.states)||b.states.length!==4||!Array.isArray(b.heroes)||!Array.isArray(b.effects)||!Number.isSafeInteger(b.round)||!Number.isSafeInteger(b.partyClock))throw Error('離線戰鬥進度無效');
   if(b.heroes.length!==members.length||b.heroes.some(h=>!Number.isFinite(h.hp)||h.hp<0||!Number.isFinite(h.shield)||h.shield<0)||b.foes.some(e=>!e||typeof e.id!=='string'||!Number.isFinite(e.hp)||e.hp<0||!Number.isFinite(e.maxhp)||e.maxhp<=0))throw Error('離線戰鬥角色資料無效');
   if(b.questChallenge&&(typeof b.questChallenge.key!=='string'||typeof b.questChallenge.name!=='string'||!Number.isInteger(b.questChallenge.mapIndex)))throw Error('離線任務關卡無效');
   if(b.progress&&(!Array.isArray(b.progress.order)||!Number.isInteger(b.progress.index)||b.progress.index<0||b.progress.index>b.progress.order.length))throw Error('離線回合游標無效');
   validateCombat(b,members);
  }
  for(const r of [c.receipt,c.pendingReceipt].filter(Boolean)){if(!validTime(r.start)||!validTime(r.end)||r.end<r.start||typeof r.id!=='string'||typeof r.complete!=='boolean'||!Array.isArray(r.levels)||!Array.isArray(r.gear)||!r.items||!r.boosts||![r.effectiveMs,r.kills,r.xp,r.goldGained,r.goldSpent].every(n=>Number.isFinite(n)&&n>=0))throw Error('離線收益紀錄無效');
   if(c.version===2&&((r===c.receipt&&!r.complete)||(r===c.pendingReceipt&&r.complete)))throw Error('離線收益紀錄狀態無效');
   if(r.battles!==undefined&&(!Number.isSafeInteger(r.battles)||r.battles<0))throw Error('離線戰鬥完成數無效');
   if(r.intervals!==undefined&&(!Array.isArray(r.intervals)||r.intervals.some((x,i)=>!validTime(x.start)||!validTime(x.end)||x.end<x.start||i>0&&x.start<r.intervals[i-1].end)))throw Error('離線收益時間區間無效');
  }
  function finite(v){if(typeof v==='number'&&!Number.isFinite(v))throw Error('離線存檔包含無效數值');if(v&&typeof v==='object')for(const x of Object.values(v))finite(x);}finite(c);
  return migrate(c);
 }
 validateParty=function(raw){const c=validate(raw?.offlineExploration,raw?.members),p=baseValidate(raw);if(c)p.offlineExploration=c;return p;};
 loadParty=function(raw){
  if(job&&!restoring)throw Error('離線結算進行中，請完成後再讀取存檔');
  restoring=true;try{const out=baseLoad(raw);const c=ensure();hydrate(c);failed=false;lastCheck=nowReal();renderedReceipt=null;return out;}finally{restoring=false;}
 };
 packParty=function(){
  const c=ensure();if(c&&!restoring){c.buffDeadlines=buffs().map(b=>({name:b.name,expiresAt:c.lastAt+b.remainingMs,enabled:b.enabled}));c.status=running?'running':foes.length?'paused':'stopped';c.nextAt=c.status==='stopped'?0:nextActionAt;c.roundAt=c.status==='stopped'?0:roundStartedAt;c.combat=c.status==='stopped'?null:snapshot();}
  const out=basePack();if(c)out.offlineExploration=copy(c);return out;
 };
 save=function(...args){
  if(stepping||restoring)return true;
  if(!internal){sync();if(job)return true;}
  if(failed||globalThis.__EMBERWILD_SAVE_OWNER===false)return false;
  // Never move lastAt just because a save ran: it represents settled events only.
  const saved=baseSave(...args);if(saved===true&&typeof globalThis.__EMBERWILD_BOOT_SAVE_RAW==='string')lastCommitted=globalThis.__EMBERWILD_BOOT_SAVE_RAW;return saved;
 };
 function virtual(at,fn){const prev=Date.now;Date.now=()=>at;try{return fn();}finally{Date.now=prev;}}
 function quiet(fn){
  const originals={render,note,toast,refreshGlobalJournal},fake={open:false,innerHTML:'',showModal(){},close(){}};
  globalThis.__EMBERWILD_OFFLINE_SILENT=true;globalThis.__EMBERWILD_OFFLINE_RULE_CACHE={};render=()=>{};note=()=>{};toast=()=>{};refreshGlobalJournal=()=>{};
  globalThis.__EMBERWILD_SIMULATION_MODAL=fake;
  try{return fn();}finally{({render,note,toast,refreshGlobalJournal}=originals);globalThis.__EMBERWILD_SIMULATION_MODAL=null;globalThis.__EMBERWILD_OFFLINE_RULE_CACHE=null;globalThis.__EMBERWILD_OFFLINE_SILENT=false;}
 }
 function buffs(){return [...(party?.timedBoosts||[]),...party.members.flatMap(h=>api.ELEMENTAL_TYPES.flatMap(k=>api.buffRows(h[k])))];}
 function receipt(start,end){const p=playerHero();return {id:String(start)+'-'+String(end)+'-'+String(p.created),start,end,map:MAPS[party.map]?.name||'',stage:party.questChallenge?.name||(party.bossChallenge?.active?'BOSS 難關':'一般探索'),intervals:[],battles:0,effectiveMs:0,kills:0,xp:0,goldGained:0,goldSpent:0,items:{},consumed:{},gear:[],boosts:{},levels:party.members.map(h=>({key:memberKey(h),name:characterName(h),before:h.lv,after:h.lv})),complete:false,reason:'',stoppedAt:null};}
 function stock(){const h=playerHero();return Object.fromEntries([['material:鍛鐵',h.ore],['material:粉塵',h.dust],['item:legacy-potion',h.potions],...h.gems.map((n,i)=>['gem:'+i,n]),...Object.entries(h.materials).map(([k,n])=>['material:'+k,n]),...Object.entries(h.healingPotions||{}).map(([k,n])=>['item:'+k,n]),...Object.entries(h.consumables||{}).map(([k,n])=>['item:'+k,n])]);}
 function captureResources(){return {gold:playerHero().gold,gained:clock()?.pendingReceipt?.goldGained||0,items:stock(),ids:new Set(playerHero().bag.map(g=>g.id))};}
 function collect(before){
  const r=clock()?.pendingReceipt;if(!r||r.complete)return;
  const delta=playerHero().gold-before.gold-(r.goldGained-before.gained);r.goldGained+=Math.max(0,delta);r.goldSpent+=Math.max(0,-delta);
  const after=stock();for(const k of new Set([...Object.keys(before.items),...Object.keys(after)])){const n=(after[k]||0)-(before.items[k]||0);if(n>0)r.items[k]=(r.items[k]||0)+n;else if(n<0){r.consumed??={};r.consumed[k]=(r.consumed[k]||0)-n;}}
  for(const g of playerHero().bag)if(!before.ids.has(g.id))r.gear.push(copy(g));
  for(const l of r.levels)l.after=partyMember(l.key)?.lv??l.after;
 }
 const award=awardXP;
 awardXP=function(...args){const h=playerHero(),level=h?.lv,xp=h?.xp,out=award(...args),r=clock()?.pendingReceipt;if(stepping&&r&&!r.complete&&h){let gained=h.xp-xp;for(let lv=level;lv<h.lv;lv++)gained+=need(lv);r.xp+=Math.max(0,gained);}return out;};
 const reward=rewardGroupKill;
 rewardGroupKill=function(e){const eligible=e&&!e.rewarded,before=playerHero()?.gold||0,out=reward(e),r=clock()?.pendingReceipt;if(stepping&&eligible&&e.rewarded&&r&&!r.complete){r.kills++;r.goldGained+=Math.max(0,playerHero().gold-before);}return out;};
 const finalize=finalizeBattleStatistics;
 finalizeBattleStatistics=function(result){
  const finished=!!activeBattleStat&&(result==='victory'||result==='wipe'),out=finalize(result),r=clock()?.pendingReceipt;
  if(stepping&&finished&&r){r.battles++;r.lastBattleAt=Date.now();}return out;
 };
 function hasRewards(r){return !!r&&(r.xp>0||r.goldGained>0||r.gear.length>0||Object.values(r.items).some(n=>n>0));}
 function eligible(r){return hasRewards(r)&&(r.battles>0||r.legacy===true);}
 function track(target){
  const c=ensure();if(!c.pendingReceipt&&lastMode&&target>c.lastAt)c.pendingReceipt=receipt(c.lastAt,target);
 }
 function recordInterval(r,start,end){
  if(!r||end<=start)return;r.intervals??=[{start:r.start,end:Math.min(start,r.end)}];
  const tail=r.intervals.at(-1);if(tail&&tail.end===start)tail.end=end;else r.intervals.push({start,end});
 }
 function promote(){
  const c=clock(),r=c?.pendingReceipt;if(c&&!c.receipt&&eligible(r)){r.complete=true;c.receipt=r;c.pendingReceipt=null;gearPage=0;}
 }
 function consumeTo(at,combatActive){
  const c=clock(),elapsed=at-c.lastAt;if(elapsed<=0)return;
  const r=c.pendingReceipt,rows=buffs(),disabled=rows.filter(b=>!b.enabled);
  if(r&&!r.complete&&combatActive){r.effectiveMs+=elapsed;for(const b of rows.filter(b=>b.enabled&&b.remainingMs>0)){
   const key=api.sourceKey(b);const entry=r.boosts[key]??={name:b.name,effect:b.boostType==='speed2'?'兩倍速':b.boostType==='exp'?'經驗＋'+b.bonusPercent+'%':b.boostType==='drop'?'掉寶＋'+b.bonusPercent+'%':'屬性藥水',ms:0};entry.ms+=Math.min(elapsed,b.remainingMs);
  }}
  if(combatActive)party.combatSession.idleTimeMs+=elapsed;
  api.consume(party,elapsed);
  // Disabled effects also retain their actual wall-clock deadline.
  for(const b of disabled)b.remainingMs=Math.max(0,b.remainingMs-elapsed);
  if(r&&!r.complete)r.end=at;
  c.lastAt=at;
  virtual(at,()=>__EMBERWILD_TIMED_BOOST_TEST.expireBoosts(at));
 }
 function event(at){
  actionSerial++;stepping=true;
  try{virtual(at,()=>{
   if(!roundIterator){globalThis.__EMBERWILD_RESUMING_ROUND=!!combatRoundProgress;roundIterator=pacedRound();if(!combatRoundProgress)roundStartedAt=at;}
   let result;try{result=roundIterator.next();}finally{globalThis.__EMBERWILD_RESUMING_ROUND=false;}
   const actionMs=Math.max(1,Math.round(GS('combat.pacing.actionIntervalMs',900)/battleRate)),roundMs=Math.max(actionMs,Math.round(GS('combat.pacing.roundMinimumMs',6000)/battleRate));
   if(result.done){roundIterator=null;nextActionAt=Math.max(at+actionMs,roundStartedAt+roundMs);}else nextActionAt=at+actionMs;
  });}finally{stepping=false;}
 }
 // Finite batches yield to the browser; no cap is imposed on owed game time.
 function advance(target,maxEvents=150){
  const c=ensure();if(globalThis.__EMBERWILD_SAVE_OWNER===false)throw Error('存檔已由另一分頁接手');
  if(!c||target<c.lastAt)return false;
  let count=0;const batchStart=performance.now();
  quiet(()=>{while(c.lastAt<target&&count<maxEvents&&(count===0||performance.now()-batchStart<12)){
   if(!lastMode||!running){const wait=target-c.lastAt;if(nextActionAt)nextActionAt+=wait;if(roundStartedAt)roundStartedAt+=wait;consumeTo(target,false);break;}
   const expiry=Math.min(...buffs().filter(b=>b.enabled&&b.remainingMs>0).map(b=>c.lastAt+b.remainingMs),Infinity);
   const at=Math.min(target,Math.max(c.lastAt,nextActionAt),expiry);consumeTo(at,true);
   if(at===expiry){count++;continue;}
   if(nextActionAt<=at){const before=captureResources();event(at);collect(before);count++;if(!running){lastMode=false;const r=c.pendingReceipt;if(r&&!r.complete){r.stoppedAt=at;r.reason=playerHero().bag.length>=RULES.bagCapacity?'背包已滿，掉落已保留':globalThis.expeditionChallengeResult?(expeditionChallengeResult.success?'任務關卡完成':'任務關卡戰敗'):'本次探索已依戰鬥規則結束';}}}
   if(at===target)break;
  }});
  c.status=running?'running':foes.length?'paused':'stopped';return c.lastAt<target;
 }
 function commit(){internal=true;try{if(save()!==true)throw Error('無法儲存結算進度，原存檔與未補算時間仍保留');}finally{internal=false;}}
 function rollback(message){
  let raw=null;try{raw=localStorage.getItem(KEY);}catch{}
  restoring=true;try{for(const candidate of new Set([raw,lastCommitted]))if(candidate){try{loadParty(JSON.parse(candidate));break;}catch{}}}finally{restoring=false;}failed=true;
  showProgress(message,true);
 }
 function showProgress(message,error=false){
  const box=document.getElementById('offline-settlement');if(!box||atTitle())return;
  const c=clock(),p=settlementProgress;
  const total=p?Math.max(1,p.target-p.start):0,done=p?Math.max(0,Math.min(total,c.lastAt-p.start)):0,percent=total?Math.floor(done/total*1000)/10:0;box.hidden=false;renderedReceipt=null;
  box.innerHTML=`<section role="status" aria-live="polite" aria-busy="${!error}"><h2>離線探索收益</h2><p>${esc(message)}</p>${p?`<progress max="${total}" value="${done}" aria-label="離線結算進度"></progress><p class="offline-progress-value">${percent}% · 已計算 ${api.timeText(done,true)} / ${api.timeText(total,true)}</p>`:''}${error?'<button onclick="retryOfflineExploration()">重試結算</button>':''}</section>`;
 }
 function showReceipt(){
  const r=clock()?.receipt,box=document.getElementById('offline-settlement');if(!r?.complete||!eligible(r)||!box||atTitle()||document.hidden)return;
  if(renderedReceipt===r.id&&!box.hidden)return;renderedReceipt=r.id;
  box.hidden=false;const fmt=n=>Math.round(n).toLocaleString('zh-TW'),time=t=>new Date(t).toLocaleString('zh-TW',{hour12:false});
  const group=(kind,title)=>{const rows=Object.entries(r.items).filter(([k,n])=>k.startsWith(kind+':')&&n>0);return rows.length?`<h3>${title}</h3><div class="offline-items">${rows.map(([k,n])=>itemSlotHTML(kind,k.slice(kind.length+1),{count:n,detailLabel:'本次獲得'})).join('')}</div>`:'';};
  box.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="offline-heading"><h2 id="offline-heading">離線探索收益</h2><p>${esc(r.map)} · ${esc(r.stage||'一般探索')} · ${r.reason?esc(r.reason):'正常完成補算'}</p><p class="small">開始 ${time(r.start)}<br>結束 ${time(r.end)}${r.stoppedAt?'<br>探索終止 '+time(r.stoppedAt):''}</p><div class="offline-summary"><div>實際離線<b>${api.timeText(r.intervals?.reduce((n,x)=>n+x.end-x.start,0)??r.end-r.start,true)}</b></div><div>有效掛機<b>${api.timeText(r.effectiveMs,true)}</b></div><div>擊殺怪物<b>${fmt(r.kills)} 隻</b></div><div>經驗值<b>＋${fmt(r.xp)}</b></div><div>金錢獲得<b>＋${fmt(r.goldGained)}</b></div><div>金錢消耗<b>−${fmt(r.goldSpent)}</b></div><div>金錢淨增加<b>${fmt(r.goldGained-r.goldSpent)}</b></div></div><p class="small">夥伴沿用現有規則，與主角同步等級，沒有獨立經驗槽。</p><div>${r.levels.map(l=>`<p>${esc(l.name)}：Lv.${l.before} → Lv.${l.after}（升級 ${l.after-l.before} 次）</p>`).join('')}</div>${group('material','素材收益')}${group('item','消耗品收益')}${group('gem','寶石收益')}${r.gear.length?'<h3>裝備收益 · '+r.gear.length+' 件</h3><div class="offline-items">'+r.gear.slice(gearPage*30,gearPage*30+30).map((g,j)=>{const i=gearPage*30+j;return `<button class="offline-gear" onclick="showOfflineGear(${i})">${gearSlotHTML(g,{preview:g,count:1,contentOnly:true})}<span class="q${gearQualityRank(g)}">${AFFIX_RANK[gearQualityRank(g)]}</span></button>`;}).join('')+'</div>'+ (r.gear.length>30?`<div class="actions"><button onclick="changeOfflineGearPage(-1)" ${gearPage===0?'disabled':''}>上一頁</button><span>${gearPage+1} / ${Math.ceil(r.gear.length/30)}</span><button onclick="changeOfflineGearPage(1)" ${(gearPage+1)*30>=r.gear.length?'disabled':''}>下一頁</button></div>`:''):''}<h3>增益實際生效時間</h3>${Object.values(r.boosts).map(b=>`<p>${esc(b.name)} · ${esc(b.effect)}：${api.timeText(b.ms,true)}</p>`).join('')||'<p>無限時增益</p>'}${Object.keys(r.consumed||{}).length?'<h3>道具消耗</h3>'+Object.entries(r.consumed).map(([k,n])=>'<p>'+esc(k.split(':').slice(1).join(':'))+' × '+fmt(n)+'</p>').join(''):''}<p class="small">收益已存入角色與背包；視窗僅顯示已保存的收益，探索仍會持續進行。此遊戲使用裝置時間，無法完全防止改時鐘作弊。</p><button class="primary" onclick="acknowledgeOfflineExploration()">確認／關閉</button></section>`;box.querySelector('[onclick="acknowledgeOfflineExploration()"]')?.focus();
 }
 globalThis.changeOfflineGearPage=function(delta){renderedReceipt=null;gearPage=Math.max(0,Math.min(Math.ceil((clock()?.receipt?.gear.length||1)/30)-1,gearPage+delta));showReceipt();};
 globalThis.showOfflineGear=function(i){const g=clock()?.receipt?.gear[i];if(!g)return;$('modal').innerHTML='<h2>'+equipmentNameHTML(g)+'</h2>'+equipmentAttributeDetailsHTML(g)+'<button onclick="closeModal()">關閉</button>';$('modal').showModal();};
 globalThis.acknowledgeOfflineExploration=function(){
  const c=clock();if(job||failed||!c?.receipt?.complete||globalThis.__EMBERWILD_SAVE_OWNER===false)return false;
  const previous=copy(c);c.receipt=null;promote();
  try{commit();}catch(e){Object.assign(c,previous);return false;}
  renderedReceipt=null;document.getElementById('offline-settlement').hidden=true;showReceipt();return true;
 };
 function settle(target=nowReal(),offline=true){
  if(!party||restoring||atTitle()||globalThis.__EMBERWILD_SAVE_OWNER===false)return Promise.resolve();
  if(job){if(Number.isSafeInteger(target)){requestedAt=Math.max(requestedAt,target);if(offline){jobOffline=true;track(target);}}return job;}
  const c=ensure();if(!Number.isSafeInteger(target)||target<0||target>8.64e15||target<c.lastAt){failed=true;settlementProgress=null;showProgress('裝置時間無效或早於最後結算時間；收益與時間已保留，請校正時間後重試。',true);return Promise.resolve();}
  requestedAt=target;jobOffline=offline;if(offline)track(target);
  failed=false;settlementProgress={start:c.lastAt,target};
  job=Promise.resolve().then(async()=>{
   try{
    const show=settlementProgress.target-settlementProgress.start>1000;
    if(show)showProgress('正在計算掛機收益，請稍候…');commit();
    // Paint the overlay before starting CPU-intensive combat replay.
    if(show)await new Promise(resolve=>setTimeout(resolve,0));
    let lastProgress=performance.now();
    do{
     const end=requestedAt;settlementProgress.target=end;
     let more;
     do{const start=c.lastAt,r=c.pendingReceipt;more=advance(end);if(jobOffline)recordInterval(r,start,c.lastAt);commit();if(show&&(performance.now()-lastProgress>=100||!more)){showProgress('正在計算掛機收益，請稍候…');lastProgress=performance.now();}if(more)await new Promise(resolve=>setTimeout(resolve,0));}while(more);
    }while(c.lastAt<requestedAt);
    // A throttled tick takes this async path; do not starve online life jobs.
    internal=true;try{globalThis.emberwildLifeHeartbeat?.();}finally{internal=false;}
    if(!document.hidden)promote();commit();render();showReceipt();
    if(!c.receipt)document.getElementById('offline-settlement').hidden=true;
   }catch(e){rollback(String(e.message||e));}
   finally{job=null;lastMode=atTitle()?false:running;lastCheck=nowReal();}
  });return job;
 }
 globalThis.retryOfflineExploration=function(){failed=false;return settle();};
 function sync(now=nowReal()){
  if(internal||stepping||restoring||!party||failed||atTitle()||globalThis.__EMBERWILD_SAVE_OWNER===false)return;
  if(job){requestedAt=Math.max(requestedAt,now);if(document.hidden){jobOffline=true;track(now);}return;}
  const c=ensure();if(now<c.lastAt){void settle(now);return;}
  if(now-c.lastAt>1000){void settle(now,!!document.hidden);return;}
  if(document.hidden)track(now);
  const start=c.lastAt,r=c.pendingReceipt;
  internal=true;try{advance(now,50);if(document.hidden)recordInterval(r,start,c.lastAt);if(!document.hidden)promote();}finally{internal=false;}
  lastMode=active();c.status=running?'running':foes.length?'paused':'stopped';
  if(c.receipt&&renderedReceipt!==c.receipt.id){try{commit();showReceipt();}catch(e){rollback(String(e.message||e));}}
 }
 tick=function(){
  if(failed||atTitle()||globalThis.__EMBERWILD_SAVE_OWNER===false)return;
  const now=nowReal();if(now-lastCheck<1000)return;lastCheck=now;sync(now);
  if(!job&&!document.hidden){globalThis.emberwildLifeHeartbeat?.();__EMBERWILD_TIMED_BOOST_TEST.refreshJournalRealtime();if(lastRendered!==actionSerial){lastRendered=actionSerial;render();}}
 };
 // UI actions are already synchronous. Flush debt before changing the team/map,
 // and persist the new running/paused/stopped state after the operation.
 for(const name of [
  'toggleBattle','stopTeamExploration','restartExploration','startSelectedExploration','startBossChallenge','startQuestEncounter','leaveBossChallenge',
  'chooseMap','changeDifficulty','setEncounterMode','returnToTitle','setBattleSpeed','setTimedBoostEnabled','setPauseBoostsOnSpeedEnd','useSupply','closeModal',
  'buyFixedShopOffer','buyMarketOffer','buyHealingPotion','buySupply','buyLifeMaterial','sellInventoryItem',
  'setHeroAutoPotion','setHeroAutoPotionThreshold','setHeroAutoPotionItem','potion',
  'enhance','reroll','autoReroll','acceptAffix','resolveInlineAffix','rerollEquipmentPowerTier','socket',
  'salvage','salvageAll','sellGear','sellAllGearByQuality','confirmMassSalvage','confirmGearInventoryBatch','confirmTokenBatch','sellMaterial','sellCatalogueGem',
  'startDailyCommission','claimBoard','claimDailyBonus','startSideQuest','claimQuest','completeStoryStage','claimMailboxAttachments','claimAllMailboxAttachments','useLevelScroll'
 ]){
  const base=globalThis[name];if(typeof base!=='function')continue;
  globalThis[name]=function(...args){if(!stepping){if(globalThis.__EMBERWILD_SAVE_OWNER===false)return false;sync();if(job||failed)return false;}const wasRunning=running,wasEncounter=foes.length;const out=base.apply(this,args);if(!stepping){if(!wasRunning&&running&&!wasEncounter)ensure().startedAt=nowReal();sync();save();if(atTitle()){document.getElementById('offline-settlement').hidden=true;renderedReceipt=null;}}return out;};
 }
 const continueBase=continueFromTitle;
 continueFromTitle=function(...args){const out=continueBase(...args);if(party){const c=ensure();lastMode=c.status==='running';void settle();}return out;};
 const ui=document.createElement('div');ui.id='offline-settlement';ui.className='offline-settlement';ui.hidden=true;document.body.appendChild(ui);ui.tabIndex=-1;
 ui.addEventListener('keydown',event=>{if($('modal').open)return;if(event.key==='Escape'&&clock()?.receipt?.complete){event.preventDefault();acknowledgeOfflineExploration();}else if(event.key==='Tab'){const buttons=[...ui.querySelectorAll('button:not([disabled])')];if(!buttons.length){event.preventDefault();ui.focus();return;}const index=buttons.indexOf(document.activeElement),next=event.shiftKey?(index<=0?buttons.length-1:index-1):(index+1)%buttons.length;event.preventDefault();buttons[next].focus();}});
 document.addEventListener('visibilitychange',()=>{if(!party||atTitle())return;if(document.hidden){sync();save();}else{if(!job)lastMode=clock()?.status==='running';void settle();}});
 addEventListener('pagehide',()=>{if(party&&!job&&!failed&&!atTitle())save();});
 if(party){ensure();}lastCheck=nowReal();
 globalThis.EmberwildOffline={sync,settle,advance,snapshot,hydrate,validate,get busy(){return !!job;},get failed(){return failed;},get active(){return lastMode;}};
})();
