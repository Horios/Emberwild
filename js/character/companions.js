/* Recruitable people have their own identity, name and fixed growth plan. */
(()=>{
  const DEFAULT_PLANS=[
    {id:10,job:0,role:'攻擊戰士',description:'劍術輸出、戰吼與破甲；優先提升攻擊。',names:['洛恩','雷昂','凱斯','艾伯'],points:[0,0,1],core:[0,2,4],active:[4,0],proc:[2],support:[0,2],weapon:'sword'},
    {id:11,job:0,role:'保護戰士',description:'堅毅壁壘、守護誓言與嘲諷；優先提升防禦與生命。',names:['維恩','瑟琳','賽德','塔莉'],points:[2,1,2],core:[0,1,2,6],active:[6,1,0],proc:[2],support:[1],weapon:'sword'},
    {id:12,job:1,role:'法師',description:'火焰箭、餘燼爆發與奧術共鳴；優先提升攻擊。',names:['伊瑟','梅洛','席昂','菲娜'],points:[0,0,1],core:[0,2,4],active:[4,0],proc:[2],support:[0,1],weapon:'staff'},
    {id:13,job:3,role:'祭司',description:'治癒禱言、晨光祝福與聖光庇護；偏重續航。',names:['艾琳','露薇','諾雅','米菈'],points:[1,1,0],core:[0,1,3,5],active:[1,0],proc:[3,5],support:[0,1],weapon:'holyStaff'},
    {id:14,job:2,role:'弓箭手',description:'穿透箭、連射與鷹眼指引；優先提升攻擊。',names:['希雅','凜羽','緹亞','菲爾'],points:[0,0,1],core:[0,2,4],active:[4,0],proc:[2],support:[0,1],weapon:'bow'}
  ];
  const copy=value=>JSON.parse(JSON.stringify(value));
  function checkPlan(p,{classes=CLASSES,supportSkills=SUPPORT,checkSkills=true}={}){
    if(!p||!Number.isInteger(p.id)||p.id<10||p.id>999||!Number.isInteger(p.job)||p.job<0||p.job>=4)throw Error('夥伴 ID 或職業無效');
    if(typeof p.role!=='string'||!p.role.trim()||p.role.length>40||typeof p.description!=='string'||p.description.length>200||typeof p.weapon!=='string'||p.weapon.length>80)throw Error('夥伴說明或武器無效：'+p.id);
    if(!Array.isArray(p.names)||!p.names.length||p.names.length>30||p.names.some(name=>typeof name!=='string'||!name.trim()||name!==name.trim()||Array.from(name).length>20||/[\u0000-\u001f\u007f]/.test(name)))throw Error('夥伴隨機名字無效：'+p.id);
    if(!Array.isArray(p.points)||!p.points.length||p.points.length>32||p.points.some(n=>!Number.isInteger(n)||n<0||n>2))throw Error('夥伴配點順序無效：'+p.id);
    for(const key of ['core','active','proc','support'])if(!Array.isArray(p[key])||p[key].length>64||new Set(p[key]).size!==p[key].length||p[key].some(n=>!Number.isInteger(n)||n<0||n>63))throw Error('夥伴技能索引無效：'+p.id+' '+key);
    if(checkSkills){
      const skills=classes[p.job]?.skills||[],supports=supportSkills[p.job]||[];
      const type=sk=>Array.isArray(sk)?sk[1]:sk?.activation;
      if(p.core.some(i=>!skills[i])||p.active.some(i=>!p.core.includes(i)||type(skills[i])!=='active')||p.proc.some(i=>!p.core.includes(i)||type(skills[i])!=='proc')||p.support.some(i=>!supports[i]))throw Error('夥伴技能與職業技能池不相容：'+p.id);
    }
    return copy(p);
  }
  function parsePlans(input,doc){
    if(input===undefined)return copy(DEFAULT_PLANS);
    if(!Array.isArray(input)||input.length<5||input.length>64)throw Error('夥伴角色數量無效');
    const plans=input.map(p=>checkPlan(p,{classes:doc?.classes||CLASSES,supportSkills:doc?.supportSkills||SUPPORT}));
    const ids=new Set(plans.map(p=>p.id));
    if(ids.size!==plans.length||DEFAULT_PLANS.some(p=>!ids.has(p.id)))throw Error('夥伴 ID 重複或缺少初始五位角色');
    return plans;
  }
  function storedPlans(raw){
    if(raw===undefined)return {};
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>64)throw Error('存檔夥伴模板無效');
    const out=Object.create(null);
    for(const [key,p] of Object.entries(raw)){
      if(!/^\d{2,3}$/.test(key)||Number(key)!==p?.id)throw Error('存檔夥伴模板識別無效');
      out[key]=checkPlan(p,{checkSkills:false});
    }
    return out;
  }
  function storedNames(raw){
    if(raw===undefined)return {};
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>64)throw Error('存檔夥伴名字無效');
    const out=Object.create(null);
    for(const [key,name] of Object.entries(raw)){
      if(!/^\d{2,3}$/.test(key)||!name||validCharacterName(name)!==name)throw Error('存檔夥伴名字無效');
      out[key]=name;
    }
    return out;
  }
  let plans=copy(DEFAULT_PLANS);
  try{const saved=JSON.parse(localStorage.getItem(BALANCE_KEY)||'null');if(saved?.companions)plans=parsePlans(saved.companions,saved);}catch(e){console.warn('夥伴平衡設定無法載入，使用內建角色',e);}
  const byId=()=>new Map(plans.map(p=>[p.id,p]));
  function companionPlan(h){const current=byId().get(h?.companionId);return current?.job===h?.job?current:party?.companionProfiles?.[h?.companionId]?.job===h?.job?party.companionProfiles[h.companionId]:null;}
  function rosterPlans(){return [...new Map([...Object.values(party?.companionProfiles||{}),...plans].map(p=>[p.id,p])).values()].sort((a,b)=>a.id-b.id);}
  function ensureRoster(p){
    p.companionProfiles=storedPlans(p.companionProfiles);
    p.companionNames=storedNames(p.companionNames);
    for(const plan of plans){
      const member=p.members.find(h=>h.companionId===plan.id);
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
  function rosterPlansFor(p){return [...new Map([...Object.values(p.companionProfiles||{}),...plans].map(x=>[x.id,x])).values()].sort((a,b)=>a.id-b.id);}
  function applyPlan(h,{fullHealth=false}={}){
    const plan=companionPlan(h);if(!plan)return;
    h.advanced=h.lv>=Math.round(GS('progression.advance.level',15));
    const points=Math.max(0,Math.round(GS('progression.starting.abilityPoints',0)+(h.lv-1)*GS('progression.levelRewards.abilityPoints',3)));
    h.stats=[0,0,0];for(let n=0;n<points;n++)h.stats[plan.points[n%plan.points.length]]++;
    h.ap=0;h.sp=0;
    syncHeroSkillArrays(h);
    h.skills=h.skills.map((_,i)=>Number(plan.core.includes(i)&&!!CLASSES[h.job].skills[i]&&h.lv>=CLASSES[h.job].skills[i][2]&&(!skillRequiresAdvanced(CLASSES[h.job].skills[i],i)||h.advanced)));
    h.supportLevels=SUPPORT[h.job].map((sk,i)=>Number(plan.support.includes(i)&&h.lv>=sk.level&&(i!==2||h.advanced)));
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
    const plan=rosterPlans().find(p=>p.id===id);if(!party||!plan||partyMember(id)||party.members.length>=65)return;
    ensureSharedGear();ensureAccountResources();ensureSharedItems();ensureAccountQuests();ensureRoster(party);
    if(state.bag.length+5>RULES.bagCapacity)return toast('背包需要 5 個空位才能招募夥伴');
    resetEncounter();const h=initial(plan.job);h.companionId=id;
    h.name=party.companionNames[id];h.lv=Math.min(...heroes().map(x=>x.lv));
    h.won=party.cleared&&h.lv>=GS('progression.levelCaps.beforeClear',30);
    h.bag=[0,1,2,3,3].map(slot=>baseGear(plan.job,slot,plan.weapon));h.equipped=h.bag.map(g=>g.id);
    h.gold=0;h.ore=0;h.dust=0;h.gems=[0,0,0];h.materials={};h.potions=0;h.consumables={};
    party.members.push(h);applyPlan(h,{fullHealth:true});
    ensureAccountResources();ensureSharedGear();ensureSharedItems();ensureAccountQuests();
    if(party.active.length<3)party.active.push(id);
    syncParty();save();render();toast(h.name+'已加入隊伍');
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
  rosterView=function(){
    const legacy=party.members.filter(h=>!companionPlan(h));
    const memberRow=h=>{const plan=companionPlan(h);return `<article class="roster-row"><div><b>${esc(characterName(h))}</b><span class="tag">${plan?`${CLASSES[h.job].name} · 已招募`:`${h===party.members[0]?'玩家角色':'原有隊員'} · ${CLASSES[h.job].name} · LV ${h.lv} · ${party.active.includes(memberKey(h))?'出戰':'候補'}`}</span>${plan?`<p class="small">${plan.role!==CLASSES[h.job].name?esc(plan.role)+'：':''}${esc(plan.description)}</p>`:''}</div><div class="roster-member-actions"><button onclick="toggleMember(${memberKey(h)})">${party.active.includes(memberKey(h))?'移至候補':'加入出戰'}</button><button onclick="requestRename(${memberKey(h)})">改名</button></div></article>`;};
    return heading('PARTY / 編成與招募','隊伍編成',`<span class="tag">出戰 ${heroes().length} / 3 · 隊員 ${party.members.length}</span>`)+`<section class="panel roster-page">${uiHelp('夥伴說明','第一位玩家角色維持自由培養。夥伴名字在創角時隨機決定，之後可改名；招募後其配點、技能與技能槽隨等級自動配置，LV15 自動二轉。候補不獲經驗，出戰最多三人。')}<p class="small">招募等級依目前出戰最低等級；調整編成會放棄當前遭遇。</p><div class="roster-list">${legacy.map(memberRow).join('')}${rosterPlans().map(plan=>{const h=partyMember(plan.id);return h?memberRow(h):`<article class="roster-row"><div><b>${esc(party.companionNames[plan.id])}</b><span class="tag">${CLASSES[plan.job].name} · 尚未招募</span><p class="small">${plan.role!==CLASSES[plan.job].name?esc(plan.role)+'：':''}${esc(plan.description)}</p></div><div class="roster-member-actions"><button onclick="requestCompanionRename(${plan.id})">改名</button><button class="primary" onclick="recruitCompanion(${plan.id})" ${state.bag.length+5>RULES.bagCapacity||party.members.length>=65?'disabled':''}>招募夥伴</button></div></article>`;}).join('')}</div></section>`;
  };
  const originalValidateParty=validateParty;
  validateParty=function(data){const out=originalValidateParty(data);out.companionProfiles=storedPlans(data?.companionProfiles);out.companionNames=storedNames(data?.companionNames);for(const h of out.members)if(h.companionId!==undefined&&COMPANION_JOBS[h.companionId]!==h.job&&out.companionProfiles[h.companionId]?.job!==h.job)throw Error('存檔夥伴模板與職業不符');return out;};
  const originalAwardXP=awardXP;
  awardXP=function(amount){const h=state,before=h?.lv,out=originalAwardXP(amount);if(companionPlan(h)&&h.lv!==before)applyPlan(h,{fullHealth:true});return out;};
  const originalStart=start;
  start=function(job){originalStart(job);if(party){ensureRoster(party);save();render();}};
  const originalLoadParty=loadParty;
  loadParty=function(data){const out=originalLoadParty(data);if(party){ensureRoster(party);for(const h of party.members)applyPlan(h);}return out;};
  if(party){ensureRoster(party);for(const h of party.members)applyPlan(h);}
  const originalValidateBalance=validateBalanceConfig;
  let restoringDefaults=false;
  validateBalanceConfig=function(input){const next=restoringDefaults?copy(DEFAULT_PLANS):parsePlans(input?.companions,input);const result=originalValidateBalance(input);result.companions=next;return result;};
  const originalApplyBalance=applyBalanceConfig;
  applyBalanceConfig=function(input,{persist=true}={}){
    const next=restoringDefaults?copy(DEFAULT_PLANS):parsePlans(input?.companions,input);
    originalApplyBalance(input,{persist:false});plans=next;
    if(party){ensureRoster(party);for(const h of party.members)applyPlan(h);save();}
    if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));
    if(state)render();
  };
  const originalExportBalance=exportableBalance;
  exportableBalance=function(){const doc=originalExportBalance();doc.companions=copy(plans);doc.notes=[...(doc.notes||[]),'companions 是可招募夥伴模板：名字於創角時抽取；points 循環配點，core/support 自動學習，active/proc 依順序配置。'];return doc;};
  const originalResetBalance=resetBalanceJSON;
  resetBalanceJSON=function(){restoringDefaults=true;try{originalResetBalance();}finally{restoringDefaults=false;}plans=copy(DEFAULT_PLANS);if(party){ensureRoster(party);for(const h of party.members)applyPlan(h);save();}if(state)render();};
  for(const name of ['allocate','resetStats','learn','learnSupport','equipSkill','clearActiveSkill','slotProcSkill','clearProcSkill','slotSupport','socket','advance']){
    const original=globalThis[name];if(typeof original!=='function')continue;
    globalThis[name]=function(...args){if(companionPlan(state))return toast('夥伴的技能與配點依固定走向自動成長');return original(...args);};
  }
  const baseSinglePagePanel=singlePagePanel;
  singlePagePanel=function(page,title,view){const h=pageHero(page),html=baseSinglePagePanel(page,title,view);return companionPlan(h)&&['character','skills'].includes(page)?html.replace('<div class="page-owner-content">','<div class="page-owner-content"><p class="companion-fixed-note">固定培養：'+esc(companionPlan(h).description)+' 升級後自動配點、學習及配置技能。</p>'):html;};
  const baseRender=render;
  render=function(){baseRender();if(!state||!party||!['character','skills'].includes(tab))return;const h=pageHero(tab);if(!companionPlan(h))return;
    for(const input of document.querySelectorAll('.page-owner-content input[id^="stat-alloc-"]'))input.disabled=true;
    const locked=/\b(?:allocate|resetStats|advance|learn|learnSupport|equipSkill|clearActiveSkill|slotProcSkill|clearProcSkill|slotSupport|socket)\s*\(/;
    for(const control of document.querySelectorAll('.page-owner-content button,.page-owner-content select'))if(locked.test(control.getAttribute('onclick')||control.getAttribute('onchange')||'')){control.disabled=true;control.title='夥伴依固定走向自動成長';}
  };
  globalThis.__EMBERWILD_COMPANION_TEST_API={get plans(){return copy(plans);},parsePlans,ensureRoster,companionPlan,applyPlan};
  if(state&&party)render();
})();
