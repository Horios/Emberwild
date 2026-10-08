/* Last adapter in the production load order. Existing actors remain the combat
   projection; buildSystem owns configuration and permanent progression only. */
(()=>{
  'use strict';
  const M=EmberwildTeams,copy=M.copy,mastery=__EMBERWILD_MASTERY;
  GAMEPLAY_SETTINGS_DEFAULTS.meta.teamBuildVersion=M.VERSION;
  let cfg=M.settings(),hydrating=false,suppressSave=false,resettingBalance=false;
  const classDocs=()=>CLASSES.map(c=>({skills:c.skills.map(sk=>({...sk[6],activation:sk[1]}))}));
  const build=()=>party?.buildSystem,player=()=>party?.members[0],plan=()=>build()?.plans.find(p=>p.id===build().activeId);
  const coreRule=(j,i)=>M.rules(mastery.coreMeta(j,i),cfg.defaultLearnCost),supportRule=(j,i)=>M.rules(SUPPORT[j]?.[i],cfg.defaultLearnCost);
  const costs=p=>p.job===null?0:M.spent(p,classDocs(),SUPPORT,cfg.defaultLearnCost);
  const budgets=()=>M.budget(player().lv,GAMEPLAY_SETTINGS.progression,build().permanent);
  function masteryView(h){
    if(h!==player()||!build())return null;
    const all=build().permanent.masteries,out={};
    for(const k of mastery.validMasteries(h.job)){all[k]??=0;Object.defineProperty(out,k,{enumerable:true,configurable:true,get:()=>all[k],set:v=>{all[k]=Math.max(0,Math.floor(Number(v)||0));}});}
    return out;
  }
  globalThis.__EMBERWILD_TEAM_MASTERY=masteryView;
  globalThis.__EMBERWILD_TEAM_GAIN=(h,n)=>{if(h!==player()||!build()||plan()?.job===null)return;const c=build().permanent.classes[h.job];if(c?.activated)c.xp+=n;refreshUnlocks();};
  function snapshot(p){
    const h=player();p.stats=copy(h.stats);p.skills=copy(h.skills);p.supportLevels=copy(h.supportLevels);p.active=copy(h.active);p.procSlots=copy(h.procSlots);p.supportSlots=copy(h.supportSlots);p.equipped=copy(h.equipped);
    p.playerActive=party.active.includes(memberKey(h));p.companions=party.active.filter(k=>k!==memberKey(h));p.enlisted=(party.enlisted||party.members.map(memberKey)).filter(k=>k!==memberKey(h));
    p.tokens=Object.fromEntries(party.members.slice(1).map(h=>[memberKey(h),h.tokenId??null]));
    p.sockets??=Array(h.skills.length).fill(null);
    if(p.job===null){Object.assign(p,M.blank(p.id,p.name));}
  }
  function migrate(){
    const h=player();if(!h)return;if(build())return;
    h.playerId??=h.job;
    const permanent={playerKey:memberKey(h),abilityCredit:0,skillCredit:0,classes:{},masteries:copy(h.mastery||{}),unlocks:{},payments:{},gemInstances:{},gemSerial:1};
    CLASSES.forEach((_,j)=>permanent.classes[j]={activated:j===h.job,xp:j===h.job?Object.values(h.mastery||{}).reduce((n,v)=>n+v,0):0,advanced:j===h.job&&h.advanced});
    const p=M.blank('team-1','隊伍 1',h.job,h.skills.length,h.supportLevels.length);party.buildSystem={version:M.VERSION,activeId:p.id,serial:2,plans:[p],permanent};snapshot(p);
    for(const [kind,list] of [['core',h.skills],['support',h.supportLevels]])list.forEach((v,i)=>{if(v)permanent.unlocks[M.key(h.job,kind,i)]=true;});
    h.sockets.forEach((type,i)=>{if(type!==null){const id='gem-'+permanent.gemSerial++;permanent.gemInstances[id]=type;p.sockets[i]=id;}});
    const total=budgets();permanent.abilityCredit=Math.max(0,(h.ap||0)+h.stats.reduce((a,v)=>a+v,0)-total.ap);
    // The original free starting core/support skills remain a one-time grant.
    permanent.skillCredit=Math.max(coreRule(h.job,0).learnCost+supportRule(h.job,0).learnCost,(h.sp||0)+costs(p)-total.sp,0);
    refreshUnlocks();syncPoints();
  }
  function syncPoints(){if(!build())return;const h=player(),p=plan(),t=budgets();h.ap=Math.max(0,t.ap-h.stats.reduce((a,v)=>a+v,0));h.sp=Math.max(0,t.sp-costs(p));}
  function capture(){
    if(!party||hydrating)return;migrate();const h=player(),p=plan();
    if(p.job!==null){p.job=h.job;const c=build().permanent.classes[h.job];if(c)c.advanced=h.advanced;}
    snapshot(p);refreshUnlocks();syncPoints();
  }
  function apply(p){
    const h=player(),hp=new Map(party.members.map(x=>[memberKey(x),x.hp]));h.playerId=build().permanent.playerKey;
    h.job=p.job??0;h.advanced=p.job!==null&&!!build().permanent.classes[p.job]?.advanced;
    for(const field of ['stats','skills','supportLevels','active','procSlots','supportSlots','equipped'])h[field]=copy(p[field]);
    if(p.job===null){h.skills=Array(CLASSES[0].skills.length).fill(0);h.supportLevels=SUPPORT[0].map(()=>0);}
    h.sockets=p.job===null?h.skills.map(()=>null):p.sockets.map(id=>id===null?null:build().permanent.gemInstances[id]);
    h.mastery=masteryView(h);party.active=[...(p.playerActive?[memberKey(h)]:[]),...p.companions];party.enlisted=[memberKey(h),...p.enlisted];party.selected=memberKey(h);state=h;
    for(const x of party.members.slice(1))x.tokenId=p.tokens[memberKey(x)]??null;
    pageHeroSelection.clear();forgeSelection=null;pendingAffix=null;
    for(const x of party.members){x.hp=Math.min(hp.get(memberKey(x))??0,stats(x).hp);if(x.hp<=0)x.hp=0;}
    syncPoints();
  }
  function unlockMissing(j,kind,i){
    const h=player(),perm=build().permanent,c=perm.classes[j],sk=kind==='core'?CLASSES[j]?.skills?.[i]:SUPPORT[j]?.[i],r=kind==='core'?coreRule(j,i):supportRule(j,i),meta=kind==='core'?mastery.coreMeta(j,i):sk,reasons=[];
    if(!sk)return ['技能不存在'];if(!c?.activated)reasons.push('尚未使用此職業');if(meta.partnerId!==null&&meta.partnerId!==undefined)reasons.push('指定夥伴專屬');
    const lv=kind==='core'?sk[2]:sk.level;if(h.lv<lv)reasons.push('主角 LV'+lv);
    if((kind==='core'?skillRequiresAdvanced(sk,i):i===2)&&!c?.advanced)reasons.push('完成二轉');
    if(meta.requiredMastery&&mastery.masteryLevelFromXp(perm.masteries[meta.requiredMastery]||0)<(meta.requiredMasteryLevel||0))reasons.push((mastery.masteryLabels[meta.requiredMastery]||meta.requiredMastery)+'精通 Lv'+meta.requiredMasteryLevel);
    if(mastery.masteryLevelFromXp(c?.xp||0)<r.unlockConditions.classMasteryLevel)reasons.push('職業精通 Lv'+r.unlockConditions.classMasteryLevel);
    for(const q of r.unlockConditions.quests)if(!(q==='tutorial'&&h.tutorial>=3)&&!h.claimed.includes(q))reasons.push('永久任務：'+q);
    for(const m of r.unlockConditions.materials)if(materialCount(m.name)<m.quantity)reasons.push(m.name+' ×'+m.quantity);
    return reasons;
  }
  function refreshUnlocks(){
    if(!build())return;const perm=build().permanent;
    CLASSES.forEach((c,j)=>{for(const [kind,list] of [['core',c.skills],['support',SUPPORT[j]]])list.forEach((_,i)=>{const k=M.key(j,kind,i),r=kind==='core'?coreRule(j,i):supportRule(j,i);if(!perm.unlocks[k]&&!r.unlockConditions.materials.length&&!unlockMissing(j,kind,i).length)perm.unlocks[k]=true;});});
  }
  function busy(){return !!(running||partyBusy||roundIterator||foes.some(e=>e.hp>0));}
  function safe(){if(busy()){toast('請先停止探索並結束目前遭遇，再修改隊伍配置');return false;}return !!party;}
  function valid(){return !!plan()&&plan().job!==null&&party.active.length>0&&heroes().every(h=>solo.canVisit(party.map,h));}
  function transaction(fn){
    if(!safe())return false;capture();const before=copy(build()),h=player(),members=party.members.slice(),profiles=copy(party.companionProfiles||{}),names=copy(party.companionNames||{}),old={hp:party.members.map(x=>x.hp),shield:party.members.map(x=>x.shield),potionCD:party.members.map(x=>x.healPotionCooldownRemaining||0),ac:copy(actorCooldowns),sc:copy(supportCooldowns),clock:partyClock,gold:h.gold,ore:h.ore,dust:h.dust,gems:copy(h.gems),materials:copy(h.materials)};
    const previousSuppress=suppressSave;try{suppressSave=true;fn();resetBattleState();suppressSave=previousSuppress;syncPoints();if(save()===false)throw Error('無法儲存');render();return true;}catch(e){suppressSave=previousSuppress;party.members=members;party.companionProfiles=profiles;party.companionNames=names;party.buildSystem=before;apply(plan());h.gold=old.gold;h.ore=old.ore;h.dust=old.dust;h.gems=old.gems;h.materials=old.materials;party.members.forEach((x,i)=>{x.hp=old.hp[i];x.shield=old.shield[i];x.healPotionCooldownRemaining=old.potionCD[i];});actorCooldowns=old.ac;supportCooldowns=old.sc;partyClock=old.clock;toast('操作未保存：'+e.message);return false;}
  }
  function activate(j){const c=build().permanent.classes[j]??={activated:false,xp:0,advanced:false};c.activated=true;}
  globalThis.changePlayerClass=function(j){j=Number(j);if(!safe()||!Number.isInteger(j)||!CLASSES[j]||plan().job===j)return false;
    if(plan().job!==null&&!confirm('轉為'+CLASSES[j].name+'？本隊能力與技能分配將返還，技能槽及寶石配置清空；不符職業的裝備將卸下。永久養成與其他隊伍保留。'))return false;
    return transaction(()=>{const p=plan(),gear=copy(p.equipped),members=copy(p.companions),playerActive=p.playerActive,enlisted=copy(p.enlisted),tokens=copy(p.tokens);releaseSockets(p);Object.assign(p,M.blank(p.id,p.name,j,CLASSES[j].skills.length,SUPPORT[j].length));p.companions=members;p.playerActive=playerActive;p.enlisted=enlisted;p.tokens=tokens;p.equipped=gear.map((id,i)=>{const g=findGear(id);return g&&gearWearableJobs(g).includes(j)&&gearEquipPositions(g).includes(i)?id:null;});activate(j);apply(p);refreshUnlocks();});
  };
  globalThis.addTeamPlan=function(){if(!safe()||build().plans.length>=cfg.maxPlans)return false;return transaction(()=>{const b=build(),id='team-'+b.serial++;b.plans.push(M.blank(id,'隊伍 '+id.slice(5)));});};
  globalThis.copyTeamPlan=function(id=build()?.activeId){if(!safe()||build().plans.length>=cfg.maxPlans)return false;return transaction(()=>{const b=build(),source=b.plans.find(p=>p.id===id);if(!source)throw Error('找不到隊伍');const p=copy(source);p.id='team-'+b.serial++;p.name=Array.from(source.name).slice(0,20).join('')+' 複本';b.plans.push(p);});};
  globalThis.renameTeamPlan=function(id,name){if(!safe())return false;if(name===undefined)name=prompt('隊伍名稱（最多 24 字）',build().plans.find(p=>p.id===id)?.name||'');if(typeof name!=='string'||!name.trim()||Array.from(name.trim()).length>24||/[\u0000-\u001f]/.test(name))return false;return transaction(()=>{const p=build().plans.find(p=>p.id===id);if(!p)throw Error('找不到隊伍');p.name=name.trim();});};
  globalThis.switchTeamPlan=function(id){if(!safe()||id===build().activeId||!build().plans.some(p=>p.id===id))return false;return transaction(()=>{build().activeId=id;apply(plan());refreshUnlocks();});};
  function releaseSockets(p){const ids=p.sockets.filter(Boolean);p.sockets=p.sockets.map(()=>null);for(const id of ids)if(!build().plans.some(other=>other.sockets.includes(id))){const type=build().permanent.gemInstances[id];player().gems[type]++;delete build().permanent.gemInstances[id];}}
  globalThis.resetSkills=function(){if(state!==player()||!safe()||!confirm('免費重置本隊所有技能學習與裝配？返還技能點；永久解鎖與精通保留。'))return false;return transaction(()=>{const p=plan();releaseSockets(p);p.skills.fill(0);p.supportLevels.fill(0);p.active.fill(null);p.procSlots.fill(null);p.supportSlots.fill(null);apply(p);});};
  const resetBase=resetStats;resetStats=function(){if(state!==player())return resetBase();if(!safe()||!confirm('免費重置本隊能力點？其他隊伍與永久成長保留。'))return false;return transaction(()=>{plan().stats=[0,0,0];apply(plan());});};
  function learnTeam(kind,i){if(state!==player()||!safe()||plan().job===null)return false;capture();const p=plan(),j=p.job,list=kind==='core'?player().skills:player().supportLevels,k=M.key(j,kind,i),r=kind==='core'?coreRule(j,i):supportRule(j,i);if(!Number.isInteger(i)||i<0||i>=list.length||list[i])return false;if(!build().permanent.unlocks[k]){toast('尚未永久解鎖：'+unlockMissing(j,kind,i).join('、'));return false;}if(player().sp<r.learnCost){toast('本隊技能點不足');return false;}return transaction(()=>{list[i]=1;});}
  const learnBase=learn,supportBase=learnSupport;
  learn=function(i){return state===player()?learnTeam('core',i):learnBase(i);};learnSupport=function(i){return state===player()?learnTeam('support',i):supportBase(i);};
  globalThis.unlockTeamSkill=function(kind,i){if(!safe()||!['core','support'].includes(kind)||plan().job===null)return false;const j=plan().job,k=M.key(j,kind,i);if(build().permanent.unlocks[k])return true;const missing=unlockMissing(j,kind,i);if(missing.length){toast('尚未達成：'+missing.join('、'));return false;}return transaction(()=>{const r=kind==='core'?coreRule(j,i):supportRule(j,i);for(const m of r.unlockConditions.materials)setMaterialCount(m.name,materialCount(m.name)-m.quantity);build().permanent.unlocks[k]=true;if(r.unlockConditions.materials.length)build().permanent.payments[k]=true;});};
  const socketBase=socket;socket=function(i,value){if(state!==player())return socketBase(i,value);if(!safe()||plan().job===null||!Number.isInteger(i)||!player().skills[i])return false;const type=Number(value),p=plan();if(!Number.isInteger(type)||type< -1||type>2)return false;if(type>=0&&player().gems[type]<1)return false;return transaction(()=>{const old=p.sockets[i];p.sockets[i]=null;if(old&&!build().plans.some(other=>other.sockets.includes(old))){player().gems[build().permanent.gemInstances[old]]++;delete build().permanent.gemInstances[old];}if(type>=0){const id='gem-'+build().permanent.gemSerial++;build().permanent.gemInstances[id]=type;player().gems[type]--;p.sockets[i]=id;}player().sockets=p.sockets.map(id=>id?build().permanent.gemInstances[id]:null);});};
  const baseSave=save;save=function(...args){if(suppressSave)return true;if(party&&!hydrating)capture();return baseSave(...args);};
  const basePack=packParty;packParty=function(){capture();const out=basePack();out.buildSystem=copy(build());return out;};
  function validateBuild(data,p){return M.validate(data,{classes:classDocs(),supports:SUPPORT,members:p.members,items:p.members.flatMap(h=>h.bag),progression:GAMEPLAY_SETTINGS.progression,level:p.members[0].lv,config:cfg,wearable:(g,j,i)=>!EmberwildTokens.isToken(g)&&gearWearableJobs(g).includes(j)&&gearEquipPositions(g).includes(i)&&gearRequiredLevelByTier(g.tier)<=p.members[0].lv});}
  const baseValidate=validateParty;validateParty=function(input){const d=M.prepareSave(input),p=baseValidate(d);if(d.buildSystem!==undefined)p.buildSystem=validateBuild(d.buildSystem,p);return p;};
  const baseLoad=loadParty;loadParty=function(input){
    const d=M.prepareSave(input);validateParty(d);hydrating=true;try{baseLoad(d);if(d.buildSystem)party.buildSystem=validateBuild(d.buildSystem,party);else delete party.buildSystem;}finally{hydrating=false;}
    migrate();apply(plan());if(party.enlisted.includes(d.selected)){party.selected=d.selected;state=partyMember(d.selected);}refreshUnlocks();syncPoints();return party;
  };
  const baseStart=start;start=function(...args){const out=baseStart(...args);migrate();capture();save();render();return out;};
  const xpBase=awardXP;awardXP=function(...args){const out=xpBase(...args);if(build()){syncPoints();refreshUnlocks();}return out;};
  const advanceBase=advance;advance=function(){if(!safe()||state===player()&&plan()?.job===null)return false;if(state!==player())return advanceBase();return transaction(()=>{advanceBase();build().permanent.classes[state.job].advanced=state.advanced;refreshUnlocks();});};
  const baseBalanceValidate=validateBalanceConfig;validateBalanceConfig=function(input){return baseBalanceValidate(M.normalizeDocument(input));};
  function applyRules(d){cfg=M.settings(d.teamSettings);d.classes.forEach((c,j)=>c.skills.forEach((sk,i)=>Object.assign(mastery.coreMeta(j,i),M.rules(sk,cfg.defaultLearnCost))));d.supportSkills.forEach((list,j)=>list.forEach((sk,i)=>Object.assign(SUPPORT[j][i],M.rules(sk,cfg.defaultLearnCost))));}
  const baseExport=exportableBalance;exportableBalance=function(){const d=baseExport();d.teamSettings=copy(cfg);d.balanceSettings.meta.teamBuildVersion=M.VERSION;for(const [j,c] of d.classes.entries())c.skills.forEach((sk,i)=>Object.assign(sk,coreRule(j,i)));d.supportSkills.forEach((list,j)=>list.forEach((sk,i)=>Object.assign(sk,supportRule(j,i))));d.notes=d.notes.filter(x=>!String(x).includes('技能點與技能等級不再'));d.notes.push('永久解鎖共用；學習投入與 2 主動／2 觸發／2 輔助槽由各隊伍獨立保存。');return d;};
  function stageBalanceBuild(d){
    if(!build())return null;
    const next=copy(build());
    for(const p of next.plans){
      if(p.job===null)continue;
      for(const [field,count,empty] of [['skills',d.classes[p.job].skills.length,0],['sockets',d.classes[p.job].skills.length,null],['supportLevels',d.supportSkills[p.job].length,0]]){
        if(p[field].slice(count).some(v=>v!==empty))throw Error('平衡設定會刪除「'+p.name+'」的已學習技能或寶石；請先調整方案');
        p[field]=Array.from({length:count},(_,i)=>p[field][i]??empty);
      }
    }
    try{return M.validate(next,{classes:d.classes,supports:d.supportSkills,members:party.members,items:player().bag,progression:d.balanceSettings.progression,level:player().lv,config:d.teamSettings,wearable:()=>true});}
    catch(e){throw Error('平衡設定不相容於已保存的隊伍：'+e.message+'。請先調整配置；原設定保留。');}
  }
  const balanceBase=applyBalanceConfig;
  applyBalanceConfig=function(input,{persist=true}={}){
    if(party&&!safe())return false;
    const d=validateBalanceConfig(input);
    // Earlier reset snapshots precede the later stock skills/status modules.
    // Validate the completed reset once the full existing reset chain returns.
    if(resettingBalance){balanceBase(d,{persist:false});applyRules(d);return d;}
    capture();
    const next=stageBalanceBuild(d),before=exportableBalance(),previousBuild=build()?copy(build()):null,previousCache=localStorage.getItem(BALANCE_KEY),previousSuppress=suppressSave;
    const battle=party?{heroes:party.members.map(h=>({hp:h.hp,shield:h.shield,potion:h.healPotionCooldownRemaining||0})),actors:copy(actorCooldowns),supports:copy(supportCooldowns),clock:partyClock}:null;
    try{
      suppressSave=true;balanceBase(d,{persist:false});applyRules(d);
      if(next){
        party.buildSystem=next;
        for(const p of next.plans)if(p.job!==null)p.equipped=p.equipped.map((id,i)=>{const g=findGear(id);return g&&gearWearableJobs(g).includes(p.job)&&gearEquipPositions(g).includes(i)&&gearRequiredLevelByTier(g.tier)<=player().lv?id:null;});
        apply(plan());capture();resetBattleState();
      }
      if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));
      suppressSave=previousSuppress;if(next&&save()===false)throw Error('無法儲存隊伍與平衡設定');
      if(party)render();return d;
    }catch(e){
      suppressSave=true;
      try{
        balanceBase(before,{persist:false});applyRules(before);
        if(previousBuild){party.buildSystem=previousBuild;apply(plan());}
        if(battle){party.members.forEach((h,i)=>{h.hp=battle.heroes[i].hp;h.shield=battle.heroes[i].shield;h.healPotionCooldownRemaining=battle.heroes[i].potion;});actorCooldowns=battle.actors;supportCooldowns=battle.supports;partyClock=battle.clock;}
        if(persist){if(previousCache===null)localStorage.removeItem(BALANCE_KEY);else localStorage.setItem(BALANCE_KEY,previousCache);}
      }
      finally{suppressSave=previousSuppress;}
      throw e;
    }
  };
  const resetBalanceBase=resetBalanceJSON;
  resetBalanceJSON=function(){
    if(party&&!safe())return false;capture();
    const before=exportableBalance(),oldBuild=build()?copy(build()):null,cache=localStorage.getItem(BALANCE_KEY),previousSuppress=suppressSave;
    const vitals=party?.members.map(h=>({hp:h.hp,shield:h.shield,potion:h.healPotionCooldownRemaining||0})),actors=copy(actorCooldowns),supports=copy(supportCooldowns),clock=partyClock;
    try{
      suppressSave=true;resettingBalance=true;const out=resetBalanceBase(),d=M.normalizeDocument(exportableBalance());
      if(oldBuild){party.buildSystem=oldBuild;apply(plan());}
      resettingBalance=false;suppressSave=previousSuppress;applyBalanceConfig(d,{persist:false});return out;
    }catch(e){
      resettingBalance=false;suppressSave=true;
      try{
        balanceBase(before,{persist:false});applyRules(before);if(oldBuild){party.buildSystem=oldBuild;apply(plan());}
        if(vitals){party.members.forEach((h,i)=>{h.hp=vitals[i].hp;h.shield=vitals[i].shield;h.healPotionCooldownRemaining=vitals[i].potion;});actorCooldowns=actors;supportCooldowns=supports;partyClock=clock;}
        if(cache===null)localStorage.removeItem(BALANCE_KEY);else localStorage.setItem(BALANCE_KEY,cache);
      }finally{suppressSave=previousSuppress;}
      throw e;
    }finally{resettingBalance=false;suppressSave=previousSuppress;}
  };
  // Configuration-changing legacy entry points all use the same exploration gate.
  for(const name of ['allocate','equipSkill','clearActiveSkill','slotProcSkill','clearProcSkill','slotSupport','equipGear','equipSharedGear','unequipSharedGear','toggleMember','setPartnerEnlisted','confirmMemberReplacement','recruitCompanion','equipCompanionToken','unequipCompanionToken','devMasterySetLevel','devMasterySetExp','devMasterySet','devMasteryAdjust','devMasteryReset','devMasteryToggleCore','devMasteryToggleSupport','devMasteryWeapon']){
    const fn=globalThis[name];if(typeof fn!=='function')continue;globalThis[name]=function(...args){if(!safe())return false;if(state===player()&&plan()?.job===null&&['allocate','equipSkill','slotProcSkill','slotSupport','equipGear','equipSharedGear'].includes(name)){toast('請先為本隊選擇主角職業');return false;}if(suppressSave)return fn(...args);let out;const ok=transaction(()=>{out=fn(...args);});return ok?out:false;};
  }
  const battleBase=toggleBattle;toggleBattle=function(...args){if(!running&&!valid()){toast('請先選擇主角職業，並完成符合地圖門檻的隊伍編成');return false;}return battleBase(...args);};
  const bossBase=globalThis.startBossChallenge;if(typeof bossBase==='function')globalThis.startBossChallenge=function(...args){if(!valid())return false;return bossBase(...args);};
  function resetBattleState(){
    running=false;if(roundIterator?.return)roundIterator.return();roundIterator=null;party.bossChallenge=null;resetEncounter();refillParty();mastery.resetBattleGain?.();
  }
  globalThis.stopTeamExploration=function(){
    if(!party)return false;running=false;if(roundIterator?.return)roundIterator.return();roundIterator=null;if(typeof activeBattleStat!=='undefined'&&activeBattleStat)finalizeBattleStatistics('abandoned');resetBattleState();save();render();return true;
  };
  globalThis.__EMBERWILD_TEAMS={build,plan,player,capture,apply,budgets,costs,busy,safe,valid,refreshUnlocks,unlockMissing,coreRule,supportRule,settings:()=>copy(cfg),validateBuild,resetBattleState};
  // Read the exact boot bytes after all late validators are installed.
  const boot=globalThis.__EMBERWILD_TEAM_BOOT_RAW;
  try{const d=M.normalizeDocument(JSON.parse(localStorage.getItem(BALANCE_KEY)||'null')||baseExport());applyRules(d);Object.assign(GAMEPLAY_SETTINGS.progression.starting,d.balanceSettings.progression.starting);Object.assign(GAMEPLAY_SETTINGS.progression.levelRewards,d.balanceSettings.progression.levelRewards);GAMEPLAY_SETTINGS.meta.teamBuildVersion=M.VERSION;
    if(boot)loadParty(JSON.parse(boot));else if(party){migrate();apply(plan());}
    globalThis.__EMBERWILD_TEAM_READY=true;delete globalThis.__EMBERWILD_TEAM_BOOT_RAW;if(party)render();
  }catch(e){globalThis.__EMBERWILD_TEAM_READY=true;globalThis.__EMBERWILD_BOOT_SAVE_ERROR=e.message;console.warn('隊伍方案載入失敗；原始存檔保留',e);if(boot){state=null;party=null;globalThis.__EMBERWILD_BOOT_SAVE_RAW=boot;}render();}
})();
