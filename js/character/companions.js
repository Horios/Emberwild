/* Recruitable people have their own identity, name and fixed growth plan. */
(()=>{
  const Model=EmberwildCompanions,DEFAULT_PLANS=Model.defaultPlans;
  const copy=value=>JSON.parse(JSON.stringify(value));
  function checkPlan(p,{classes=CLASSES,supportSkills=SUPPORT,checkSkills=true}={}){
    if(!p||!Number.isInteger(p.id)||p.id<10||p.id>1000000000||!Number.isInteger(p.job)||p.job<0||p.job>=classes.length)throw Error('夥伴 ID 或職業無效');
    if(typeof p.role!=='string'||!p.role.trim()||p.role.length>40||typeof p.description!=='string'||p.description.length>200||typeof p.weapon!=='string'||p.weapon.length>80)throw Error('夥伴說明或武器無效：'+p.id);
    if(!Array.isArray(p.names)||!p.names.length||p.names.length>30||p.names.some(name=>typeof name!=='string'||!name.trim()||name!==name.trim()||Array.from(name).length>20||/[\u0000-\u001f\u007f]/.test(name)))throw Error('夥伴隨機名字無效：'+p.id);
    if(!Array.isArray(p.points)||!p.points.length||p.points.length>32||p.points.some(n=>!Number.isInteger(n)||n<0||n>2))throw Error('夥伴配點順序無效：'+p.id);
    for(const key of ['core','active','proc','support'])if(!Array.isArray(p[key])||p[key].length>64||new Set(p[key]).size!==p[key].length||p[key].some(n=>!Number.isInteger(n)||n<0||n>63))throw Error('夥伴技能索引無效：'+p.id+' '+key);
    if(checkSkills){
      const skills=classes[p.job]?.skills||[],supports=supportSkills[p.job]||[];
      const type=sk=>Array.isArray(sk)?sk[1]:sk?.activation;
      if(p.core.some(i=>!skills[i])||p.active.some(i=>!p.core.includes(i)||type(skills[i])!=='active')||p.proc.some(i=>!p.core.includes(i)||type(skills[i])!=='proc')||p.support.some(i=>!supports[i]))throw Error('夥伴技能與職業技能池不相容：'+p.id);
    }
    return Model.validatePlanStats(p);
  }
  function parsePlans(input,doc){
    if(input===undefined)return copy(DEFAULT_PLANS);
    if(!Array.isArray(input)||input.length>512)throw Error('夥伴角色數量無效');
    const plans=input.map(p=>checkPlan(p,{classes:doc?.classes||CLASSES,supportSkills:doc?.supportSkills||SUPPORT}));
    const ids=new Set(plans.map(p=>p.id));
    if(ids.size!==plans.length)throw Error('夥伴 ID 重複');
    return plans;
  }
  function storedPlans(raw){
    if(raw===undefined)return {};
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>512)throw Error('存檔夥伴模板無效');
    const out=Object.create(null);
    for(const [key,p] of Object.entries(raw)){
      if(!/^[1-9]\d{1,9}$/.test(key)||Number(key)!==p?.id)throw Error('存檔夥伴模板識別無效');
      out[key]=checkPlan(p,{checkSkills:false});
    }
    return out;
  }
  function storedNames(raw){
    if(raw===undefined)return {};
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>1024)throw Error('存檔夥伴名字無效');
    const out=Object.create(null);
    for(const [key,name] of Object.entries(raw)){
      if(!/^[1-9]\d{1,9}$/.test(key)||!name||validCharacterName(name)!==name)throw Error('存檔夥伴名字無效');
      out[key]=name;
    }
    return out;
  }
  let plans=copy(DEFAULT_PLANS),config=Model.defaults(CLASSES,GAMEPLAY_SETTINGS);
  try{const saved=JSON.parse(localStorage.getItem(BALANCE_KEY)||'null');if(saved?.companions)plans=parsePlans(saved.companions,saved);if(saved)config=Model.normalizeSettings(saved.companionSettings,saved.classes||CLASSES,saved.balanceSettings||GAMEPLAY_SETTINGS);}catch(e){console.warn('夥伴平衡設定無法載入，使用內建角色',e);}
  const byId=()=>new Map(plans.map(p=>[p.id,p]));
  function companionPlan(h){const current=byId().get(h?.companionId);return current?.job===h?.job?current:party?.companionProfiles?.[h?.companionId]?.job===h?.job?party.companionProfiles[h.companionId]:null;}
  function rosterPlans(){return rosterPlansFor(party);}
  function ensureRoster(p){
    if(p.enlisted===undefined)p.enlisted=p.members.map(memberKey);
    p.companionProfiles=storedPlans(p.companionProfiles);
    p.companionNames=storedNames(p.companionNames);
    // Preserve only acquired snapshots; new recruits come from the live catalog.
    const owned=new Set(p.members.map(h=>h.companionId).filter(id=>id!==undefined));
    for(const id of Object.keys(p.companionProfiles))if(!owned.has(Number(id)))delete p.companionProfiles[id];
    const known=new Set([...owned,...plans.map(plan=>plan.id)]);
    for(const id of Object.keys(p.companionNames))if(!known.has(Number(id)))delete p.companionNames[id];
    for(const plan of plans){
      const member=p.members.find(h=>h.companionId===plan.id);
      if(!member)continue;
      // A recruited person's class is part of the save. Keep that person's old
      // template if a later balance file reuses the ID for another class.
      if(member&&member.job!==plan.job&&p.companionProfiles[plan.id]?.job===member.job)continue;
      p.companionProfiles[plan.id]=copy(plan);
    }
    for(const plan of rosterPlansFor(p)){
      const member=p.members.find(h=>h.companionId===plan.id);
      if(member?.name?.trim())p.companionNames[plan.id]=validCharacterName(member.name);
      else if(!p.companionNames[plan.id]){
        const unused=plan.names.filter(n=>!Object.values(p.companionNames).includes(n));
        p.companionNames[plan.id]=(unused.length?unused:plan.names)[rand((unused.length?unused:plan.names).length)];
      }
      if(member&&!member.name)member.name=p.companionNames[plan.id];
    }
  }
  function rosterPlansFor(p){return [...new Map([...plans,...Object.values(p?.companionProfiles||{})].map(x=>[x.id,x])).values()].sort((a,b)=>a.id-b.id);}
  function applyPlan(h,{fullHealth=false}={}){
    const plan=companionPlan(h);if(!plan)return;
    h.advanced=h.lv>=Math.round(GS('progression.advance.level',15));
    const points=Math.max(0,Math.round(GS('progression.starting.abilityPoints',0)+(h.lv-1)*GS('progression.levelRewards.abilityPoints',3)));
    h.stats=[0,0,0];for(let n=0;n<points;n++)h.stats[plan.points[n%plan.points.length]]++;
    h.ap=0;h.sp=0;
    syncHeroSkillArrays(h);
    h.skills=h.skills.map((_,i)=>Number(plan.core.includes(i)&&!!CLASSES[h.job].skills[i]&&h.lv>=CLASSES[h.job].skills[i][2]&&skillAllowedForPartner(h,CLASSES[h.job].skills[i][6])&&(!skillRequiresAdvanced(CLASSES[h.job].skills[i],i)||h.advanced)));
    h.supportLevels=SUPPORT[h.job].map((sk,i)=>Number(plan.support.includes(i)&&h.lv>=sk.level&&skillAllowedForPartner(h,sk)&&(i!==2||h.advanced)));
    h.active=plan.active.filter(i=>h.skills[i]&&CLASSES[h.job].skills[i]?.[1]==='active').slice(0,2);
    while(h.active.length<2)h.active.push(null);
    h.procSlots=plan.proc.filter(i=>h.skills[i]&&CLASSES[h.job].skills[i]?.[1]==='proc').slice(0,PROC_SLOT_COUNT);
    while(h.procSlots.length<PROC_SLOT_COUNT)h.procSlots.push(null);
    h.supportSlots=plan.support.filter(i=>h.supportLevels[i]).slice(-2);
    while(h.supportSlots.length<2)h.supportSlots.push(null);
    if(fullHealth)h.hp=stats(h).hp;else h.hp=Math.min(h.hp,stats(h).hp);
  }
  function baseGear(job,slot,weapon){
    const g=gear(1,slot,0,job);
    if(slot===0){const i=ITEM_FORMS[job]?.[0]?.findIndex(form=>form.weaponType===weapon);if(i>=0){g.formJob=job;g.form=i;g.weaponType=weapon;}}
    g.powerTier=1;g.plus=0;g.rar=0;g.affix=[];g.prefixId='';g.suffixId='';g.difficulty=0;
    delete g.starterPack;delete g.boss;delete g.bossQualityRank;delete g.affixLock;
    g.name=gearName(g);return g;
  }
  window.recruitCompanion=function(id){
    const plan=plans.find(p=>p.id===id);if(!party||!plan||partyMember(id)||party.members.length>=513)return;
    ensureSharedGear();ensureAccountResources();ensureSharedItems();ensureAccountQuests();ensureRoster(party);
    if(state.bag.length+5>RULES.bagCapacity)return toast('背包需要 5 個空位才能招募夥伴');
    const full=party.active.length>=3;
    resetEncounter();const h=initial(plan.job);h.companionId=id;
    h.name=party.companionNames[id];h.lv=Math.min(...heroes().map(x=>x.lv));
    h.won=party.cleared&&h.lv>=GS('progression.levelCaps.beforeClear',30);
    h.bag=[0,1,2,3,3].map(slot=>baseGear(plan.job,slot,plan.weapon));h.equipped=h.bag.map(g=>g.id);
    h.gold=0;h.ore=0;h.dust=0;h.gems=[0,0,0];h.materials={};h.potions=0;h.consumables={};
    party.members.push(h);party.companionProfiles[id]=copy(plan);applyPlan(h,{fullHealth:true});
    ensureAccountResources();ensureSharedGear();ensureSharedItems();ensureAccountQuests();
    if(party.enlisted.length<config.activeLimit){party.enlisted.push(id);if(party.active.length<3)party.active.push(id);}
    syncParty();save();render();
    if(full&&party.enlisted.includes(id))requestMemberReplacement(id);
    toast(h.name+(party.enlisted.includes(id)?'已編入現役':'已加入名冊；現役夥伴已達上限'));return h;
  };
  globalThis.acquireCompanion=id=>recruitCompanion(id);
  function requestMemberReplacement(key){
    const incoming=partyMember(key);
    if(!party||!incoming||!isEnlisted(incoming)||party.active.includes(key)||party.active.length!==3)return;
    if(!solo.canVisit(party.map,incoming))return toast('此角色未達目前地圖門檻，請先切換較低級地圖');
    $('modal').innerHTML=`<h2>替換出戰隊員</h2><p>讓 <b>${esc(characterName(incoming))}</b> <span class="tag">${esc(CLASSES[incoming.job].name)}</span> 出戰，請選擇要移至候補的隊員。</p><div class="roster-replace-list">${party.active.map(outKey=>{const h=partyMember(outKey);return `<button onclick="confirmMemberReplacement(${key},${outKey})"><span>替換 ${esc(characterName(h))}</span><span class="tag">${esc(CLASSES[h.job].name)}</span></button>`;}).join('')}</div><div class="actions"><button onclick="closeModal()">保留候補</button></div>`;
    $('modal').showModal();
  }
  window.confirmMemberReplacement=function(inKey,outKey){
    if(!party)return;
    const incoming=partyMember(inKey),index=party.active.indexOf(outKey);
    if(!incoming||!isEnlisted(incoming)||!partyMember(outKey)||party.active.length!==3||party.active.includes(inKey)||index<0)return closeModal();
    if(!solo.canVisit(party.map,incoming)){closeModal();return toast('此角色未達目前地圖門檻，請先切換較低級地圖');}
    resetEncounter();party.active[index]=inKey;closeModal();save();render();
  };
  const originalToggleMember=toggleMember;
  toggleMember=function(key){
    if(!isEnlisted(partyMember(key)))return toast('請先將夥伴編入現役');
    if(party?.active.length===3&&partyMember(key)&&!party.active.includes(key))return requestMemberReplacement(key);
    return originalToggleMember(key);
  };
  recruitHero=function(){toast('請在隊伍編成選擇夥伴');};
  const originalRequestHeroName=requestHeroName;
  requestHeroName=function(job,first=false){if(!first)return toast('請在隊伍編成選擇夥伴');return originalRequestHeroName(job,true);};
  const originalRequestRename=requestRename;
  requestRename=function(key){if(partyMember(key)?.companionId)return requestCompanionRename(key);return originalRequestRename(key);};
  window.requestCompanionRename=function(id){
    const plan=rosterPlans().find(p=>p.id===id);if(!party||!plan)return;
    const name=partyMember(id)?.name||party.companionNames?.[id]||'';
    $('modal').innerHTML=`<h2>修改夥伴名字</h2><p>${esc(plan.role)} · ${esc(CLASSES[plan.job].name)}</p><label for="companion-rename-input">名字（最多 20 字）</label><input id="companion-rename-input" maxlength="40" autocomplete="off" value="${esc(name)}"><div class="actions"><button class="primary" onclick="confirmCompanionRename(${id})">儲存名字</button><button onclick="closeModal()">取消</button></div>`;
    $('modal').showModal();
  };
  window.confirmCompanionRename=function(id){
    if(!party||!rosterPlans().some(p=>p.id===id))return;
    let name;try{name=validCharacterName($('companion-rename-input').value);if(!name)throw Error('夥伴名字不可留白');}catch(e){toast(e.message);return;}
    party.companionNames[id]=name;const h=partyMember(id);if(h)h.name=name;
    closeModal();save();render();toast('名字已更新');
  };
  function status(h){return party.active.includes(memberKey(h))?'上陣':isEnlisted(h)?'現役':'名冊';}
  function memberRow(h,manage=false){const key=memberKey(h),plan=companionPlan(h);return `<article class="roster-row" data-member-key="${key}"><div><b>${esc(characterName(h))}</b><span class="tag">${esc(CLASSES[h.job].name)} · Lv.${h.lv} · 評級 ${partnerRating(h)} · ${status(h)}</span>${plan?`<p class="small">${esc(plan.description)}</p>`:''}</div><div class="roster-member-actions">${manage?`<button onclick="setPartnerEnlisted(${key},${!isEnlisted(h)})" ${party.active.includes(key)?'disabled':''}>${isEnlisted(h)?'移出現役':'編入現役'}</button>`:`<button onclick="toggleMember(${key})">${party.active.includes(key)?'移至後備':'加入上陣'}</button>`}<button onclick="requestRename(${key})">改名</button></div></article>`;}
  rosterView=function(){return heading('PARTY / 隊伍編成','隊伍編成',`<span class="tag">上陣 ${heroes().length} / 3 · 現役 ${enlistedHeroes().length} / ${config.activeLimit}</span>`)+`<section class="panel roster-page"><p class="small">後備不獲經驗；調整上陣會放棄目前遭遇。</p><div class="actions"><button onclick="setTab('partnerRoster')">管理夥伴名冊</button><button onclick="showCompanionRecruitment()">招募夥伴</button></div><div class="roster-list">${sortedEnlistedHeroes().map(h=>memberRow(h)).join('')}</div></section>`;};
  globalThis.partnerRosterView=function(){return heading('PARTNER ROSTER / 已取得夥伴','夥伴名冊',`<span class="tag">持有 ${party.members.length} · 現役 ${enlistedHeroes().length} / ${config.activeLimit}</span>`)+`<section class="panel roster-page partner-roster-page"><p class="small">移出現役會保留所有養成與裝備。上陣夥伴須先移至後備，才能移出現役。評級代表夥伴本身的設計。</p><div class="actions"><button onclick="setTab('roster')">隊伍編成</button><button onclick="showCompanionRecruitment()">招募夥伴</button></div><div class="roster-list partner-owned-list">${party.members.map(h=>memberRow(h,true)).join('')}</div></section>`;};
  globalThis.showCompanionRecruitment=function(){const available=rosterPlans().filter(p=>!partyMember(p.id));$('modal').innerHTML=`<h2>招募夥伴</h2><p class="small">招募等級依上陣最低等級；現役額滿時，新夥伴會留在名冊。</p><div class="roster-list">${available.map(p=>`<article class="roster-row"><div><b>${esc(party.companionNames[p.id])}</b><span class="tag">${esc(CLASSES[p.job].name)} · 評級 ${p.rating||'D'}</span><p class="small">${esc(p.description)}</p></div><button onclick="closeModal();recruitCompanion(${p.id})">招募</button></article>`).join('')||'<p>目前沒有可招募的夥伴。</p>'}</div><button onclick="closeModal()">關閉</button>`;$('modal').showModal();};
  const originalValidateParty=validateParty;
  validateParty=function(data){const out=originalValidateParty(data);out.companionProfiles=storedPlans(data?.companionProfiles);out.companionNames=storedNames(data?.companionNames);const keys=out.members.map(memberKey);out.enlisted=data?.enlisted===undefined?[...keys]:data.enlisted;if(!Array.isArray(out.enlisted)||out.enlisted.length<1||new Set(out.enlisted).size!==out.enlisted.length||out.enlisted.some(k=>!keys.includes(k))||out.active.some(k=>!out.enlisted.includes(k)))throw Error('現役夥伴資料無效');out.enlisted=[...out.enlisted];if(!out.enlisted.includes(out.selected))out.selected=out.enlisted[0];return out;};
  const originalAwardXP=awardXP;
  awardXP=function(amount){const h=state,before=h?.lv,out=originalAwardXP(amount);if(companionPlan(h)&&h.lv!==before)applyPlan(h,{fullHealth:true});return out;};
  const originalStart=start;
  start=function(job){originalStart(job);if(party){ensureRoster(party);save();render();}};
  const originalLoadParty=loadParty;
  loadParty=function(data){const out=originalLoadParty(data);if(party){ensureRoster(party);for(const h of party.members)cleanPartnerSkillSlots(h);}return out;};
  if(party)ensureRoster(party);
  function isEnlisted(h){return !!h&&!!party&&(party.enlisted??party.members.map(memberKey)).includes(memberKey(h));}
  function enlistedHeroes(){return party?.members.filter(isEnlisted)||[];}
  function sortedEnlistedHeroes(){return [...enlistedHeroes()].sort((a,b)=>Number(party.active.includes(memberKey(b)))-Number(party.active.includes(memberKey(a)))||a.job-b.job||memberKey(a)-memberKey(b));}
  function partnerRating(h){return companionPlan(h)?.rating??'D';}
  function skillAllowedForPartner(h,meta){return meta?.partnerId==null||h?.companionId===meta.partnerId;}
  function validatePartnerSkills(doc){for(let j=0;j<doc.classes.length;j++)for(const sk of [...doc.classes[j].skills,...doc.supportSkills[j]])if(sk.partnerId!=null&&!doc.companions.some(p=>p.id===sk.partnerId&&p.job===j))throw Error('技能指定夥伴不存在或職業不符：'+sk.name);}
  function cleanPartnerSkillSlots(h){h.active=h.active.map(i=>i===null||skillAllowedForPartner(h,CLASSES[h.job].skills[i]?.[6])?i:null);h.procSlots=h.procSlots.map(i=>i===null||skillAllowedForPartner(h,CLASSES[h.job].skills[i]?.[6])?i:null);h.supportSlots=h.supportSlots.map(i=>i===null||skillAllowedForPartner(h,SUPPORT[h.job][i])?i:null);}
  function installPartnerSkills(doc){for(let j=0;j<doc.classes.length;j++){for(let i=0;i<doc.classes[j].skills.length;i++){CLASSES[j].skills[i][6]??={};CLASSES[j].skills[i][6].partnerId=doc.classes[j].skills[i].partnerId??null;}for(let i=0;i<doc.supportSkills[j].length;i++)SUPPORT[j][i].partnerId=doc.supportSkills[j][i].partnerId??null;}}
  globalThis.isPartnerEnlisted=isEnlisted;globalThis.enlistedHeroes=enlistedHeroes;globalThis.sortedEnlistedHeroes=sortedEnlistedHeroes;globalThis.partnerRating=partnerRating;globalThis.skillAllowedForPartner=skillAllowedForPartner;
  globalThis.heroGrowthDefinition=function(h){const plan=companionPlan(h)||{job:h.job};return Model.definition(plan,CLASSES,GAMEPLAY_SETTINGS);};
  globalThis.setPartnerEnlisted=function(key,enabled){const h=partyMember(key);if(!h||isEnlisted(h)===enabled)return false;if(!enabled&&party.active.includes(key)){toast('請先取消上陣或替換隊伍');return false;}if(enabled&&party.enlisted.length>=config.activeLimit){toast('現役夥伴已達上限');return false;}party.enlisted=enabled?[...party.enlisted,key]:party.enlisted.filter(k=>k!==key);if(!party.enlisted.includes(party.selected)){party.selected=party.enlisted[0];state=partyMember(party.selected);}for(const [page,id] of pageHeroSelection)if(!party.enlisted.includes(id))pageHeroSelection.delete(page);save();render();return true;};
  const originalValidateBalance=validateBalanceConfig;
  let restoringDefaults=false;
  validateBalanceConfig=function(input){const next=restoringDefaults?copy(DEFAULT_PLANS):parsePlans(input?.companions,input);const result=originalValidateBalance(input);result.companions=next;result.companionSettings=Model.normalizeSettings(input?.companionSettings,result.classes,result.balanceSettings||GAMEPLAY_SETTINGS);validatePartnerSkills(result);return result;};
  const originalApplyBalance=applyBalanceConfig;
  applyBalanceConfig=function(input,{persist=true}={}){
    const next=restoringDefaults?copy(DEFAULT_PLANS):parsePlans(input?.companions,input);
    const checked=validateBalanceConfig(input);originalApplyBalance(checked,{persist:false});plans=next;config=checked.companionSettings;installPartnerSkills(checked);
    if(party){ensureRoster(party);for(const h of party.members)cleanPartnerSkillSlots(h);save();}
    if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));
    if(state)render();
  };
  const originalExportBalance=exportableBalance;
  exportableBalance=function(){const doc=originalExportBalance();doc.companions=copy(plans);doc.companionSettings=copy(config);for(let j=0;j<doc.classes.length;j++)for(let i=0;i<doc.classes[j].skills.length;i++)doc.classes[j].skills[i].partnerId=CLASSES[j].skills[i][6]?.partnerId??null;doc.notes=[...(doc.notes||[]),'companions 是可招募夥伴模板：名字於創角時抽取；points 循環配點，core/support 自動學習，active/proc 依順序配置。'];return doc;};
  const originalResetBalance=resetBalanceJSON;
  resetBalanceJSON=function(){restoringDefaults=true;try{originalResetBalance();}finally{restoringDefaults=false;}plans=copy(DEFAULT_PLANS);config=Model.defaults(CLASSES,GAMEPLAY_SETTINGS);if(party){ensureRoster(party);for(const h of party.members)cleanPartnerSkillSlots(h);save();}if(state)render();};
  for(const name of ['allocate','resetStats','learn','learnSupport','equipSkill','clearActiveSkill','slotProcSkill','clearProcSkill','slotSupport','socket','advance']){
    const original=globalThis[name];if(typeof original!=='function')continue;
    globalThis[name]=function(...args){if(companionPlan(state))return toast('夥伴的技能與配點依固定走向自動成長');return original(...args);};
  }
  function companionCharacterView(){
    const h=state,plan=companionPlan(h),v=stats(h),c=CLASSES[h.job],advanceLevel=Math.round(GS('progression.advance.level',15));
    const percentage=n=>Math.round((n||0)*100);
    const detail=(items,labels)=>Object.entries(items||{}).map(([key,value])=>`${esc(labels[key]||key)} +${percentage(value)}%`).join(' / ');
    return `<p class="companion-ability-intro">${esc(plan?.description||'原有隊員')} ${plan?'<span>升級後自動配點與二轉。</span>':''}</p><div class="companion-key-stats"><span>生命 <b>${v.hp}</b></span><span>攻擊 <b>${v.atk}</b></span><span>防禦 <b>${v.def}</b></span><span>暴擊 <b>${percentage(v.crit)}%</b></span><span>速度 <b>${v.speed}</b></span></div><div class="companion-growth-line"><b>能力配點</b>${[c.main,'體質','韌性'].map((name,i)=>`<span>${esc(name)} ${h.stats[i]}</span>`).join('')}</div><div class="companion-advance-line"><b>職業進階</b><span>LV${advanceLevel} · ${esc(c.advanced)} · ${h.advanced?(plan?'已自動完成':'已完成'):(plan?'達到等級後自動完成':'尚未完成')}</span></div><details class="companion-ability-extra"><summary>查看進階詳細屬性</summary><div class="companion-extra-stats"><span>暴擊傷害 ${percentage(v.critDamage)}%</span><span>防禦穿透 ${Number((v.pierce||0).toFixed(1))}</span><span>防禦無視 ${percentage(v.defenseIgnore)}%</span><span>生命竊取 ${percentage(v.lifesteal)}%</span><span>閃避 ${percentage(v.evasion)}%</span><span>武器屬性 ${esc(ELEMENTS[weaponElement(h)])}</span><span>全屬性增傷 ${percentage(v.elementBonus)}%</span></div><p>${detail(v.elementDamage,ELEMENTS)}</p><p>${detail(v.raceDamage,RACES)}</p><p>${Object.entries(v.resist||{}).map(([key,value])=>`${esc(ELEMENTS[key]||key)}抗性 ${percentage(value)}%`).join(' / ')}</p></details>`;
  }
  const baseSinglePagePanel=singlePagePanel;
  singlePagePanel=function(page,title,view){const h=pageHero(page),plan=companionPlan(h),html=baseSinglePagePanel(page,title,view);return plan&&page==='skills'?html.replace('<div class="page-owner-content">','<div class="page-owner-content"><p class="companion-fixed-note">固定培養：'+esc(plan.description)+' 升級後自動配點、學習及配置技能。</p>'):html;};
  const baseCharacterView=characterView;
  characterView=function(){
    const player=party.members[0];
    pageHeroSelection.set('character',memberKey(isEnlisted(player)?player:enlistedHeroes()[0]));
    const playerView=isEnlisted(player)?withHero(player,baseCharacterView):'';
    const others=enlistedHeroes().filter(h=>h!==player);
    return heading('PARTY / 角色能力','角色能力')+`<div class="character-ability-scroll ${others.length?'has-companions':''}">${isEnlisted(player)?`<section class="player-character-section"><div class="character-card-title"><h2>${esc(characterName(player))} · ${esc(CLASSES[player.job].name)} · 評級 ${partnerRating(player)}</h2><span class="tag">剩餘能力點 ${player.ap}</span></div><div class="player-character-content">${playerView}</div></section>`:''}${others.length?`<section class="companion-character-section"><h2>夥伴能力</h2><div class="companion-card-grid">${others.map(h=>`<article class="panel companion-character-card"><div class="character-card-title"><div><h3>${esc(characterName(h))} · Lv.${h.lv}</h3><span class="small">${esc(CLASSES[h.job].name)} · 評級 ${partnerRating(h)} · ${status(h)}</span></div></div>${withHero(h,companionCharacterView)}</article>`).join('')}</div></section>`:''}</div>`;
  };
  const baseRender=render;
  render=function(){baseRender();if(!state||!party||!['character','skills'].includes(tab))return;const h=pageHero(tab);if(!companionPlan(h))return;
    for(const input of document.querySelectorAll('.page-owner-content input[id^="stat-alloc-"]'))input.disabled=true;
    const locked=/\b(?:allocate|resetStats|advance|learn|learnSupport|equipSkill|clearActiveSkill|slotProcSkill|clearProcSkill|slotSupport|socket)\s*\(/;
    for(const control of document.querySelectorAll('.page-owner-content button,.page-owner-content select'))if(locked.test(control.getAttribute('onclick')||control.getAttribute('onchange')||'')){control.disabled=true;control.title='夥伴依固定走向自動成長';}
  };
  globalThis.__EMBERWILD_COMPANION_TEST_API={get plans(){return copy(plans);},get config(){return copy(config);},parsePlans,ensureRoster,companionPlan,applyPlan};
  try{const raw=JSON.parse(localStorage.getItem(BALANCE_KEY)||'null');if(raw){installPartnerSkills(raw);if(party)for(const h of party.members)cleanPartnerSkillSlots(h);}}catch(e){console.warn('專屬技能載入失敗',e);}
  if(state&&party)render();
})();
