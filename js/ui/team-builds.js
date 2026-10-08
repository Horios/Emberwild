(()=>{
  const T=__EMBERWILD_TEAMS,M=EmberwildTeams,mastery=__EMBERWILD_MASTERY;
  const pageHeroBase=pageHero;
  pageHero=function(page=tab){return ['character','skills'].includes(page)&&T.player()?T.player():pageHeroBase(page);};
  function panel(){if(!T.build())return '';const p=T.plan(),busy=T.busy(),limit=T.settings().maxPlans;return `<section class="panel team-plan-panel"><div class="row"><h2>隊伍方案 · ${esc(p.name)}</h2>${busy?'<button onclick="stopTeamExploration()">停止探索並結束遭遇</button>':''}</div><p class="small team-build-note">永久等級、精通、技能解鎖與背包共用；配點、學習、裝配及夥伴配置各隊獨立。${busy?'目前正在探索或遭遇中，請先停止探索。':''}</p><div class="team-plan-list">${T.build().plans.map(x=>`<article class="team-plan-card ${x.id===p.id?'current':''}"><b>${esc(x.name)}</b><p>${x.job===null?'尚未選擇職業':esc(CLASSES[x.job].name)} · ${x.id===p.id?'使用中':'候選方案'}</p><p class="small">夥伴：${x.companions.map(k=>esc(characterName(partyMember(k)))).join('、')||'未配置'}</p><div class="actions"><button onclick="switchTeamPlan('${x.id}')" ${busy||x.id===p.id?'disabled':''}>切換</button><button onclick="renameTeamPlan('${x.id}')" ${busy?'disabled':''}>改名</button><button onclick="copyTeamPlan('${x.id}')" ${busy||T.build().plans.length>=limit?'disabled':''}>複製</button></div></article>`).join('')}</div><div class="actions"><button onclick="addTeamPlan()" ${busy||T.build().plans.length>=limit?'disabled':''}>新增空白隊伍</button><label>本隊主角職業 <select aria-label="本隊主角職業" onchange="changePlayerClass(Number(this.value))" ${busy?'disabled':''}><option value="" ${p.job===null?'selected':''} disabled>請選擇職業</option>${CLASSES.map((c,j)=>`<option value="${j}" ${p.job===j?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label></div>${p.job===null?'<p>先選擇職業，再於人物、技能與背包配置此隊；完成前無法開始探索。</p>':''}</section>`;}
  function masteryPanel(){if(!T.build())return '';const perm=T.build().permanent;return `<section class="panel"><h2>各職業永久精通</h2><div class="class-mastery-grid">${CLASSES.map((c,j)=>{const v=perm.classes[j],p=mastery.masteryProgress(v?.xp||0);return `<div><b>${esc(c.name)} · Lv${p.level}</b><p class="small">${v?.activated?`${p.current} / ${p.next||'MAX'} EXP · 累積 ${p.xp}${v.advanced?' · 已二轉':''}`:'尚未使用 · EXP 0'}</p></div>`;}).join('')}</div><h3>武器與元素永久精通</h3><div class="class-mastery-grid">${Object.entries(perm.masteries).map(([k,xp])=>{const p=mastery.masteryProgress(xp);return `<div>${esc(mastery.masteryLabels[k]||k)} · Lv${p.level}<p class="small">${p.current} / ${p.next||'MAX'} EXP · 累積 ${p.xp}</p></div>`;}).join('')}</div></section>`;}
  function chooseClassNote(){return `<section class="panel"><h2>尚未選擇主角職業</h2><p>請先到隊伍編成選擇本隊主角職業，再配置能力與技能。</p><button onclick="setTab('roster')">前往隊伍編成</button></section>`;}
  const characterBase=characterView;
  characterView=function(){
    if(!T.build())return characterBase();
    const h=T.player();pageHeroSelection.set('character',memberKey(h));
    return T.plan().job===null?heading('ADVENTURER / 角色能力','角色能力')+chooseClassNote()+masteryPanel():withHero(h,characterBase)+masteryPanel();
  };
  let skillClass=null,skillContext=null;
  function viewedSkillClass(){
    const context=T.build().activeId+':'+T.plan().job;
    if(context!==skillContext){skillClass=null;skillContext=context;}
    return skillClass??T.plan().job??0;
  }
  globalThis.browsePlayerSkillClass=function(job){
    job=Number(job);if(!Number.isInteger(job)||!CLASSES[job]||!T.build())return false;
    viewedSkillClass();skillClass=job;render();return true;
  };
  function classTabs(job){return `<div class="actions player-skill-class-tabs" aria-label="主角技能職業">${CLASSES.map((c,j)=>`<button data-skill-class="${j}" aria-pressed="${job===j}" class="${job===j?'primary':''}" onclick="browsePlayerSkillClass(${j})">${esc(c.name)}${T.plan().job===j?' · 目前職業':''}</button>`).join('')}</div>`;}
  function previewHero(job){
    const h=T.player(),perm=T.build().permanent;
    // A catalog preview has no learned skills, equipped items or slots from the
    // active class. All calculations run against this detached protagonist.
    return {...h,job,advanced:!!perm.classes[job]?.advanced,stats:[0,0,0],skills:CLASSES[job].skills.map(()=>0),supportLevels:SUPPORT[job].map(()=>0),active:[null,null],procSlots:[null,null],supportSlots:[null,null],sockets:CLASSES[job].skills.map(()=>null),equipped:Array(5).fill(null),mastery:{...perm.masteries}};
  }
  function teamSkillRows(job,h,current){
    const perm=T.build().permanent,rows=[];
    for(const [kind,list] of [['core',CLASSES[job].skills],['support',SUPPORT[job]]])list.forEach((sk,i)=>{
      const isCore=kind==='core',meta=isCore?mastery.coreMeta(job,i):sk;
      if(meta?.partnerId!=null||isCore&&typeof coreSkillAvailableToHero==='function'&&!coreSkillAvailableToHero(job,i,T.player()))return;
      const r=isCore?T.coreRule(job,i):T.supportRule(job,i),k=M.key(job,kind,i),unlocked=!!perm.unlocks[k],learned=current&&!!(isCore?h.skills:h.supportLevels)[i],slots=isCore?(sk[1]==='proc'?h.procSlots:h.active):h.supportSlots,equipped=current&&slots.includes(i),missing=unlocked?[]:T.unlockMissing(job,kind,i),name=isCore?sk[0]:sk.name,slotFn=isCore?(sk[1]==='proc'?'slotProcSkill':'equipSkill'):'slotSupport',learnFn=isCore?'learn':'learnSupport',useMissing=learned?(isCore?mastery.coreMissingRequirements(h,i,true):mastery.supportMissingRequirements(h,i,true)):[],detail=isCore?coreSkillDetail(job,i,h):supportSkillDetail(job,i,h);
      const status=current?(equipped?'本隊已裝配':learned?'本隊已學習':unlocked?'已解鎖 · 本隊未學':'尚未永久解鎖'):(unlocked?'已永久解鎖':'尚未永久解鎖');
      const controls=current?`<div class="actions">${!unlocked?`<button onclick="unlockTeamSkill('${kind}',${i})" ${missing.length||T.busy()?'disabled':''}>永久解鎖</button>`:''}<button onclick="${learnFn}(${i})" ${learned||!unlocked||h.sp<r.learnCost||T.busy()?'disabled':''}>${learned?'本隊已學':'學習'}</button>${[0,1].map(slot=>`<button onclick="${slotFn}(${i},${slot})" ${!learned||T.busy()?'disabled':''}>${slots[slot]===i?'已裝配':'設為'}${isCore?(sk[1]==='proc'?'觸發':'主動'):'輔助'}槽 ${slot+1}</button>`).join('')}${isCore?`<label>寶石 <select aria-label="${esc(name)}寶石" onchange="socket(${i},this.value)" ${!learned||T.busy()?'disabled':''}><option value="-1" ${h.sockets[i]===null?'selected':''}>不鑲嵌</option>${GEMS.map((g,j)=>`<option value="${j}" ${h.sockets[i]===j?'selected':''} ${h.gems[j]<1&&h.sockets[i]!==j?'disabled':''}>${esc(g.name)} ×${h.gems[j]}</option>`).join('')}</select></label>`:''}</div>`:'';
      rows.push(`<article class="team-skill-row" data-team-skill="${k}"><div class="row"><h3>${__EMBERWILD_MASTERY_UI.skillIcon(job,kind,i)}${esc(name)}</h3><span class="tag">${status}</span></div>${skillTypeBadges(job,i,kind)}${skillMechanicsDetails(job,i,kind)}<p>${esc(detail)}</p><p class="small">學習 ${r.learnCost} 技能點 · ${unlocked?'永久條件已完成':missing.length?'尚缺：'+esc(missing.join('、')):'永久條件已達成'}${r.unlockConditions.materials.length?' · 一次性材料：'+esc(r.unlockConditions.materials.map(m=>m.name+' ×'+m.quantity).join('、')):''}</p>${useMissing.length?`<p class="small">目前使用限制：${esc(useMissing.join('、'))}</p>`:''}${controls}</article>`);
    });
    return `<div class="team-skill-list">${rows.join('')||'<p class="empty">此職業尚未設定主角技能。</p>'}</div>`;
  }
  const skillBase=globalThis.__EMBERWILD_MASTERY_UI.individual;
  globalThis.individualSkillsView=function(){
    if(state!==T.player()||!T.build())return skillBase();
    T.capture();const p=T.plan(),job=viewedSkillClass(),current=p.job===job,h=current?T.player():previewHero(job),tot=T.budgets();
    const summary=current?`<p>本隊剩餘技能點 ${h.sp} / 總額 ${tot.sp} · 已投入 ${T.costs(p)}</p><div class="actions"><button onclick="resetSkills()" ${T.busy()?'disabled':''}>免費重置本隊技能</button></div>${globalThis.__EMBERWILD_MASTERY_UI.loadout()}`:`<p>檢視此職業的主角技能與永久解鎖條件。要學習或裝配，請到隊伍編成選擇本隊主角職業。</p><button onclick="setTab('roster')">前往隊伍編成</button>`;
    return classTabs(job)+`<section class="panel player-class-skills" data-player-skill-class="${job}"><h2>${esc(CLASSES[job].name)} · 主角技能</h2>${summary}</section>`+withHero(h,()=>teamSkillRows(job,h,current))+(current?globalThis.__EMBERWILD_MASTERY_UI.devTools():'');
  };
  const skillsBase=skillsView;
  skillsView=function(){
    if(!T.build())return skillsBase();
    const h=T.player();pageHeroSelection.set('skills',memberKey(h));
    return heading('PLAYER SKILLS / 主角技能','主角技能',`<span class="tag">${esc(characterName(h))} · 技能點 ${h.sp}</span>`)+`<div class="player-skill-page">${ownerControls(withHero(h,globalThis.individualSkillsView),memberKey(h))}</div>`;
  };
  const rosterBase=rosterView;rosterView=function(){return panel()+rosterBase().replace('調整上陣會放棄目前遭遇。','請先停止探索再調整本隊編成。');};
  const battleBase=battleView;battleView=function(){return T.plan()?.job===null?`<section class="panel"><h2>建立此隊的探索配置</h2>${playerProgressView('team')}<p>尚未選擇主角職業。先選擇職業，再配置能力、技能、裝備及夥伴。</p><button onclick="setTab('roster')">前往隊伍編成</button></section>`:battleBase();};
  globalThis.__EMBERWILD_AFTER_RENDER=function(){if(!T.build())return;if(T.plan().job===null){const subtitle=document.querySelector('.adventurer-summary > p');if(subtitle)subtitle.textContent='尚未選擇職業';}if(T.busy())document.querySelectorAll('#app button[onclick], #app select[onchange], #modal button[onclick]').forEach(el=>{const action=el.getAttribute('onclick')||el.getAttribute('onchange')||'';if(/\b(?:switchTeamPlan|changePlayerClass|addTeamPlan|copyTeamPlan|renameTeamPlan|allocate|resetStats|resetSkills|advance|learn|learnSupport|equipSkill|clearActiveSkill|slotProcSkill|clearProcSkill|slotSupport|socket|equipGear|equipSharedGear|unequipSharedGear|toggleMember|setPartnerEnlisted|confirmMemberReplacement|recruitCompanion|equipCompanionToken|unequipCompanionToken|devMasterySetLevel|devMasteryToggleCore|devMasteryToggleSupport|devMasteryWeapon)\s*\(/.test(action))el.disabled=true;});};
  const renderBase=render;render=function(){const out=renderBase();globalThis.__EMBERWILD_AFTER_RENDER();return out;};
  if(party)render();
})();
