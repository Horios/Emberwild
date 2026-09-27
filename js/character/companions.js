/* Five recruitable companions. Their class data stays in CLASSES; companionId
   identifies the person when several heroes share a class. */
(()=>{
  const PLANS={
    10:{job:0,role:'攻擊戰士',description:'劍術輸出、戰吼與破甲；優先提升攻擊。',names:['洛恩','雷昂','凱斯','艾伯'],points:[0,0,1],core:[0,2,4],active:[4,0],proc:[2],support:[0,2],weapon:'sword'},
    11:{job:0,role:'保護戰士',description:'堅毅壁壘、守護誓言與嘲諷；優先提升防禦與生命。',names:['維恩','瑟琳','賽德','塔莉'],points:[2,1,2],core:[0,1,2,6],active:[6,1,0],proc:[2],support:[1],weapon:'sword'},
    12:{job:1,role:'法師',description:'火焰箭、餘燼爆發與奧術共鳴；優先提升攻擊。',names:['伊瑟','梅洛','席昂','菲娜'],points:[0,0,1],core:[0,2,4],active:[4,0],proc:[2],support:[0,1],weapon:'staff'},
    13:{job:3,role:'祭司',description:'治癒禱言、晨光祝福與聖光庇護；偏重續航。',names:['艾琳','露薇','諾雅','米菈'],points:[1,1,0],core:[0,1,3,5],active:[1,0],proc:[3,5],support:[0,1],weapon:'holyStaff'},
    14:{job:2,role:'弓箭手',description:'穿透箭、連射與鷹眼指引；優先提升攻擊。',names:['希雅','凜羽','緹亞','菲爾'],points:[0,0,1],core:[0,2,4],active:[4,0],proc:[2],support:[0,1],weapon:'bow'}
  };
  const ids=Object.keys(PLANS).map(Number);
  function companionPlan(h){return PLANS[h?.companionId]||null;}
  function applyPlan(h,{fullHealth=false}={}){
    const plan=companionPlan(h);if(!plan)return;
    h.advanced=h.lv>=Math.round(GS('progression.advance.level',15));
    const points=Math.max(0,Math.round(GS('progression.starting.abilityPoints',0)+(h.lv-1)*GS('progression.levelRewards.abilityPoints',3)));
    h.stats=[0,0,0];for(let n=0;n<points;n++)h.stats[plan.points[n%plan.points.length]]++;
    h.ap=0;h.sp=0;
    syncHeroSkillArrays(h);
    h.skills=h.skills.map((_,i)=>Number(plan.core.includes(i)&&h.lv>=CLASSES[h.job].skills[i][2]&&(!skillRequiresAdvanced(CLASSES[h.job].skills[i],i)||h.advanced)));
    h.supportLevels=SUPPORT[h.job].map((sk,i)=>Number(plan.support.includes(i)&&h.lv>=sk.level&&(i!==2||h.advanced)));
    h.active=plan.active.filter(i=>h.skills[i]&&CLASSES[h.job].skills[i][1]==='active').slice(0,2);
    while(h.active.length<2)h.active.push(null);
    h.procSlots=plan.proc.filter(i=>h.skills[i]&&CLASSES[h.job].skills[i][1]==='proc').slice(0,PROC_SLOT_COUNT);
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
    g.name=gearName(g);
    return g;
  }
  window.recruitCompanion=function(id){
    const plan=PLANS[id];if(!party||!plan||partyMember(id)||party.members.length>=9)return;
    ensureSharedGear();ensureAccountResources();ensureSharedItems();ensureAccountQuests();
    if(state.bag.length+5>RULES.bagCapacity)return toast('背包需要 5 個空位才能招募夥伴');
    resetEncounter();
    const h=initial(plan.job);h.companionId=id;
    h.name=plan.names[rand(plan.names.length)];h.lv=Math.min(...heroes().map(x=>x.lv));
    h.won=party.cleared&&h.lv>=GS('progression.levelCaps.beforeClear',30);
    h.bag=[0,1,2,3,3].map(slot=>baseGear(plan.job,slot,plan.weapon));
    h.equipped=h.bag.map(g=>g.id);
    h.gold=0;h.ore=0;h.dust=0;h.gems=[0,0,0];h.materials={};h.potions=0;h.consumables={};
    applyPlan(h,{fullHealth:true});
    party.members.push(h);
    ensureAccountResources();ensureSharedGear();ensureSharedItems();ensureAccountQuests();
    if(party.active.length<3)party.active.push(id);
    syncParty();save();render();toast(h.name+'已加入隊伍');
  };
  // The old free-class recruitment route is no longer offered.
  recruitHero=function(){toast('請在隊伍編成選擇固定走向的夥伴');};
  const originalRequestHeroName=requestHeroName;
  requestHeroName=function(job,first=false){if(!first)return toast('請在隊伍編成選擇夥伴');return originalRequestHeroName(job,true);};
  const originalRequestRename=requestRename,originalConfirmRename=confirmRename;
  requestRename=function(key){if(partyMember(key)?.companionId)return;return originalRequestRename(key);};
  confirmRename=function(key){if(partyMember(key)?.companionId)return;return originalConfirmRename(key);};

  rosterView=function(){
    const legacy=party.members.filter(h=>!companionPlan(h));
    const memberRow=h=>`<article class="roster-row"><div><b>${esc(characterName(h))}</b><span class="tag">${h===party.members[0]?'玩家角色':companionPlan(h)?.role||'原有隊員'} · ${CLASSES[h.job].name} · LV ${h.lv} · ${party.active.includes(memberKey(h))?'出戰':'候補'}</span>${companionPlan(h)?`<p class="small">${esc(companionPlan(h).description)}</p>`:''}</div><div class="roster-member-actions"><button onclick="toggleMember(${memberKey(h)})">${party.active.includes(memberKey(h))?'移至候補':'加入出戰'}</button>${!companionPlan(h)?`<button onclick="requestRename(${memberKey(h)})">改名</button>`:''}</div></article>`;
    return heading('PARTY / 編成與招募','隊伍編成',`<span class="tag">出戰 ${heroes().length} / 3 · 隊員 ${party.members.length}</span>`)+`<section class="panel roster-page">${uiHelp('夥伴說明','第一位玩家角色維持自由培養。五位夥伴各能招募一次，名字加入時隨機決定並固定；配點、技能及技能槽隨等級自動配置，LV15 自動二轉。每位帶來五件 T1、+0、無詞綴的普通裝備；候補不獲經驗，出戰最多三人。')}<p class="small">招募等級依目前出戰最低等級；調整編成會放棄當前遭遇。</p><div class="roster-list">${legacy.map(memberRow).join('')}${ids.map(id=>{const plan=PLANS[id],h=partyMember(id);return h?memberRow(h):`<article class="roster-row"><div><b>${esc(plan.role)}</b><span class="tag">${CLASSES[plan.job].name} · 尚未招募</span><p class="small">${esc(plan.description)}<br>隨機固定名字 · 五件普通白板裝備</p></div><button class="primary" onclick="recruitCompanion(${id})" ${state.bag.length+5>RULES.bagCapacity||party.members.length>=9?'disabled':''}>招募夥伴</button></article>`;}).join('')}</div></section>`;
  };

  const originalAwardXP=awardXP;
  awardXP=function(amount){const h=state,before=h?.lv,out=originalAwardXP(amount);if(companionPlan(h)&&h.lv!==before)applyPlan(h,{fullHealth:true});return out;};
  const originalLoadParty=loadParty;
  loadParty=function(data){const out=originalLoadParty(data);for(const h of party?.members||[])applyPlan(h);return out;};
  for(const h of party?.members||[])applyPlan(h);

  for(const name of ['allocate','resetStats','learn','learnSupport','equipSkill','clearActiveSkill','slotProcSkill','clearProcSkill','slotSupport','socket','advance']){
    const original=globalThis[name];
    if(typeof original!=='function')continue;
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
  if(state&&party)render();
})();
