
(()=>{
const M=globalThis.__EMBERWILD_MASTERY;if(!M)return;
const weaponLabel=k=>M.weaponTypes[k]||k||'未設定';
const masteryLabel=k=>M.masteryLabels[k]||k||'無';
const DEV_WEAPONS_BY_JOB=[['sword','axe','hammer'],['staff','grimoire'],['bow','crossbow'],['prayerBook','holyStaff']];
const masteryKeys=()=>M.validMasteries(state.job);
function learnedCore(i){return Number(state.skills?.[i])>0;}
function learnedSupport(i){return Number(state.supportLevels?.[i])>0;}
function masteryRequirementText(meta){
  const parts=[];
  if(meta?.requiredMastery)parts.push(`${masteryLabel(meta.requiredMastery)}精通 Lv${Math.max(0,Math.floor(Number(meta.requiredMasteryLevel)||0))}`);
  if(Array.isArray(meta?.weaponTypes)&&meta.weaponTypes.length)parts.push('武器 '+meta.weaponTypes.map(weaponLabel).join('／'));
  return parts;
}
function coreRequirementParts(sk,i){
  const meta=M.coreMeta(state.job,i),parts=[`角色 LV${sk[2]}`];
  if(skillRequiresAdvanced(sk,i))parts.push('完成二轉');
  return parts.concat(masteryRequirementText(meta));
}
function supportRequirementParts(sk,i){
  const parts=[`角色 LV${sk.level}`];if(i===2)parts.push('完成二轉');
  return parts.concat(masteryRequirementText(sk));
}
function requirementHTML(parts,missing){
  const misses=new Set(missing||[]);
  return `<div class="skill-requirements">${parts.map(x=>`<span class="tag ${[...misses].some(m=>x.includes(m)||m.includes(x.replace(/^角色 /,'')))?'missing':''}">${esc(x)}</span>`).join('')}</div>`;
}
function masterySummaryHTML(){
  M.ensureHero(state);const currentWeapon=M.currentWeaponType(state);
  return `<section class="panel"><div class="row"><div><h2>精通</h2><p class="small">精通 XP 由符合體系的實際戰鬥行為取得；等級由共用 XP 曲線即時計算。</p></div><span class="tag">目前武器：${esc(weaponLabel(currentWeapon))}</span></div><div class="mastery-summary">${masteryKeys().map(key=>{const p=M.masteryProgress(state.mastery[key]);return `<div class="mastery-card"><div class="row"><b>${esc(masteryLabel(key))}精通</b><span>Lv${p.level}</span></div>${p.next?meter(p.current,p.next,'gold'):'<div class="bar gold"><i style="width:100%"></i></div>'}<span class="small">${p.next?`${p.current} / ${p.next} XP`:`${p.xp} XP · 已達上限`}</span></div>`;}).join('')}</div></section>`;
}
function coreDetailText(i){
  const sk=CLASSES[state.job].skills[i],meta=M.coreMeta(state.job,i),gain=meta.mastery?` · 使用時培養 ${masteryLabel(meta.mastery)}精通`:'';
  try{return coreSkillDetail(state.job,i,state)+gain;}catch{return (sk[1]==='active'?`冷卻 ${skillCooldown(i,state)} 回合`:`觸發率 ${Number((procChance(i,state)*100).toFixed(1))}%`)+gain;}
}
function renderCoreRows(kind){
  syncHeroSkillArrays(state);ensureProcSlots(state);
  const slots=kind==='active'?Array.from({length:2},(_,i)=>state.active?.[i]??null):state.procSlots;
  const clearFn=kind==='active'?'clearActiveSkill':'clearProcSkill',slotFn=kind==='active'?'equipSkill':'slotProcSkill';
  const rows=CLASSES[state.job].skills.map((sk,i)=>({sk,i})).filter(x=>x.sk[1]===kind&&(typeof coreSkillAvailableToHero!=='function'||coreSkillAvailableToHero(state.job,x.i)));
  return `<div class="actions active-slot-summary">${slots.map((id,slot)=>`<span>槽 ${slot+1}：${id===null?'未配置':esc(CLASSES[state.job].skills[id]?.[0]||'未知技能')} <button onclick="${clearFn}(${slot})">清空</button></span>`).join('')}</div><div class="skill-list">${rows.map(({sk,i})=>{
    const learned=learnedCore(i),missing=learned?M.coreMissingRequirements(state,i,true):M.coreMissingRequirements(state,i,false),meta=M.coreMeta(state.job,i),gem=state.sockets[i]??null,parts=coreRequirementParts(sk,i);
    const usable=learned&&!M.coreMissingRequirements(state,i,true).length;
    return `<article class="skill-list-row"><div><div class="skill-list-title"><b>${esc(sk[0])}</b><span class="skill-state ${learned?'learned':'locked'}">${learned?'已學':'未學'}</span><span>${kind==='proc'?'普攻觸發':'主動'}</span></div>${skillTypeBadges(state.job,i)}${skillMechanicsDetails(state.job,i)}<p class="skill-flavor"><b>說明：</b>${esc(typeof coreSkillFlavor==='function'?coreSkillFlavor(state.job,i):'')}</p><p class="skill-detail"><b>詳細：</b>${esc(coreDetailText(i))}</p>${requirementHTML(parts,missing)}${learned&&!usable?`<p class="small">目前無法使用：${esc(M.coreMissingRequirements(state,i,true).join('、'))}</p>`:''}</div><div class="skill-list-controls"><button onclick="learn(${i})" ${learned||missing.length?'disabled':''}>${learned?'已學會':missing.length?'尚未達成':'學習'}</button>${[0,1].map(slot=>`<button onclick="${slotFn}(${i},${slot})" ${learned?'':'disabled'}>${slots[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join('')}<label>寶石 <select aria-label="${esc(sk[0])}寶石" onchange="socket(${i},this.value)" ${learned?'':'disabled'}><option value="-1" ${gem===null?'selected':''}>不鑲嵌</option>${GEMS.map((g,j)=>`<option value="${j}" ${gem===j?'selected':''} ${state.gems[j]<1&&gem!==j?'disabled':''}>${esc(g.name)} ×${state.gems[j]} · ${esc(g.desc)}</option>`).join('')}</select></label></div></article>`;
  }).join('')}</div>`;
}
coreSkillRows=function(){return renderCoreRows('active');};
globalThis.procSkillRows=function(){return renderCoreRows('proc');};

supportSkillRows=function(){
  M.ensureHero(state);
  return `<div class="actions">${state.supportSlots.map((id,slot)=>`<span>槽 ${slot+1}：${id===null?'未配置':esc(SUPPORT[state.job][id]?.name||'未知技能')} <button onclick="slotSupport(null,${slot})">清空</button></span>`).join('')}</div><div class="skill-list">${SUPPORT[state.job].map((sk,i)=>{
    const learned=learnedSupport(i),missing=learned?M.supportMissingRequirements(state,i,true):M.supportMissingRequirements(state,i,false),parts=supportRequirementParts(sk,i),usable=learned&&!M.supportMissingRequirements(state,i,true).length;
    let detail='';try{detail=supportSkillDetail(state.job,i,state);}catch{detail=`${TARGET_NAMES[sk.target]||sk.target} · ${EFFECT_NAMES[sk.kind]||sk.kind} ${Number((supportAmount(state.job,i)*100).toFixed(1))}% · 冷卻 ${sk.cooldown} 回合`;}
    if(sk.mastery)detail+=` · 使用時培養 ${masteryLabel(sk.mastery)}精通`;
    return `<article class="skill-list-row"><div><div class="skill-list-title"><b>${esc(sk.name)}</b><span class="skill-state ${learned?'learned':'locked'}">${learned?'已學':'未學'}</span><span>${esc(ELEMENTS[sk.element]||sk.element)}</span></div>${skillTypeBadges(state.job,i,'support')}${skillMechanicsDetails(state.job,i,'support')}<p class="skill-flavor"><b>說明：</b>${esc(sk.description||'')}</p><p class="skill-detail"><b>詳細：</b>${esc(detail)}</p>${requirementHTML(parts,missing)}${learned&&!usable?`<p class="small">目前無法使用：${esc(M.supportMissingRequirements(state,i,true).join('、'))}</p>`:''}</div><div class="skill-list-controls"><button onclick="learnSupport(${i})" ${learned||missing.length?'disabled':''}>${learned?'已學會':missing.length?'尚未達成':'學習'}</button>${[0,1].map(slot=>`<button onclick="slotSupport(${i},${slot})" ${learned?'':'disabled'}>${state.supportSlots[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join('')}</div></article>`;
  }).join('')}</div>`;
};


let skillTurn=1,skillSelection=null,skillSelectionJob=null;
const SKILL_ICON_GLYPHS={sword:'⚔',axe:'🪓',hammer:'🔨',bow:'🏹',crossbow:'⌖',shield:'🛡',heal:'✚',fire:'🔥',ice:'❄',wind:'≋',light:'☀',shadow:'☾',magic:'✦',buff:'↑',debuff:'↓',drain:'◒',trigger:'ϟ'};
function skillTurnOfCore(sk,i){return skillRequiresAdvanced(sk,i)?2:1;}
function skillTurnOfSupport(sk,i){return i===2?2:1;}
function inferredCoreIcon(sk,i){
  const meta=M.coreMeta(state.job,i),explicit=meta?.iconType;
  if(explicit&&explicit!=='auto')return explicit;
  if(['shield','shieldLowest'].includes(sk[5]))return 'shield';
  if(sk[5]==='heal')return 'heal';
  const element=typeof coreSkillElement==='function'?coreSkillElement(state.job,i):(SKILL_ELEMENTS[state.job]?.[i]||'physical');
  if(['fire','ice','wind','light','shadow'].includes(element))return element;
  if(['sword','axe','hammer','bow','crossbow'].includes(meta?.mastery))return meta.mastery;
  if(sk[5]==='drain')return 'drain';
  if(sk[1]==='proc')return 'trigger';
  return 'magic';
}
function inferredSupportIcon(sk){
  const explicit=sk?.iconType;if(explicit&&explicit!=='auto')return explicit;
  if(sk?.kind==='guard')return 'shield';
  if(sk?.kind==='regen')return 'heal';
  if(['fire','ice','wind','light','shadow'].includes(sk?.element))return sk.element;
  if(['fracture','weaken','vulnerable','damageAmp'].includes(sk?.kind))return 'debuff';
  if(['attack','power','critical'].includes(sk?.kind))return 'buff';
  return 'magic';
}
function skillIconHTML(type){return `<span class="skill-icon-glyph icon-${esc(type)}" aria-hidden="true">${esc(SKILL_ICON_GLYPHS[type]||SKILL_ICON_GLYPHS.magic)}</span>`;}
function skillMasteryTooltip(meta){
  if(!meta?.requiredMastery)return '精通要求：無';
  const lv=Math.max(0,Math.floor(Number(meta.requiredMasteryLevel)||0)),current=M.masteryLevelFromXp(state.mastery?.[meta.requiredMastery]||0);
  return `精通要求：${masteryLabel(meta.requiredMastery)}精通 Lv${lv}（目前 Lv${current}）`;
}
function skillCatalogEntries(){
  M.ensureHero(state);syncHeroSkillArrays(state);ensureProcSlots(state);
  const core=CLASSES[state.job].skills.map((sk,i)=>({type:'core',i,sk,name:sk[0],level:Math.max(1,Math.floor(Number(sk[2])||1)),turn:skillTurnOfCore(sk,i),icon:inferredCoreIcon(sk,i),meta:M.coreMeta(state.job,i)})).filter(x=>typeof coreSkillAvailableToHero!=='function'||coreSkillAvailableToHero(state.job,x.i));
  const support=SUPPORT[state.job].map((sk,i)=>({type:'support',i,sk,name:sk.name,level:Math.max(1,Math.floor(Number(sk.level)||1)),turn:skillTurnOfSupport(sk,i),icon:inferredSupportIcon(sk),meta:sk}));
  return [...core,...support].sort((a,b)=>a.level-b.level||a.type.localeCompare(b.type)||a.i-b.i);
}
function skillTileHTML(entry){
  const learned=entry.type==='core'?learnedCore(entry.i):learnedSupport(entry.i),selected=skillSelection?.type===entry.type&&skillSelection?.i===entry.i;
  const missing=entry.type==='core'?M.coreMissingRequirements(state,entry.i,false):M.supportMissingRequirements(state,entry.i,false);
  const kind=entry.type==='support'?'輔助技能':entry.sk[1]==='proc'?'普攻觸發技能':'主動技能';
  const requirements=entry.type==='core'?coreRequirementParts(entry.sk,entry.i):supportRequirementParts(entry.sk,entry.i);
  return `<button type="button" class="skill-icon-tile ${learned?'learned':'locked'} ${selected?'selected':''}" onclick="selectSkillTile('${entry.type}',${entry.i})" aria-label="${esc(entry.name)}">${skillIconHTML(entry.icon)}<span class="skill-icon-status" aria-hidden="true">${learned?'✓':''}</span><span class="skill-icon-tooltip"><b>${esc(entry.name)}</b><span>${esc(kind)} · LV${entry.level}</span><span>${esc(skillMasteryTooltip(entry.meta))}</span><span>學習條件：${esc(requirements.join(' · '))}</span>${missing.length?`<span class="missing">尚缺：${esc(missing.join('、'))}</span>`:''}</span></button>`;
}
function skillLevelBoardHTML(entries){
  if(!entries.length)return '<section class="panel"><p class="empty">此轉職階段目前沒有技能。</p></section>';
  const groups=new Map();for(const entry of entries){if(!groups.has(entry.level))groups.set(entry.level,[]);groups.get(entry.level).push(entry);}
  return `<div class="skill-level-board">${[...groups.entries()].map(([level,list])=>`<section class="skill-level-row"><div class="skill-level-label"><span>LV</span><strong>${level}</strong></div><div class="skill-level-icons">${list.map(skillTileHTML).join('')}</div></section>`).join('')}</div>`;
}
function coreSelectedDetail(i){
  const sk=CLASSES[state.job].skills[i];if(!sk)return '';
  const kind=sk[1],learned=learnedCore(i),missing=learned?M.coreMissingRequirements(state,i,true):M.coreMissingRequirements(state,i,false),usable=learned&&!M.coreMissingRequirements(state,i,true).length,gem=state.sockets[i]??null,parts=coreRequirementParts(sk,i);
  const slots=kind==='active'?Array.from({length:2},(_,slot)=>state.active?.[slot]??null):state.procSlots,clearFn=kind==='active'?'clearActiveSkill':'clearProcSkill',slotFn=kind==='active'?'equipSkill':'slotProcSkill';
  return `<section class="panel skill-selected-panel"><div class="skill-selected-heading">${skillIconHTML(inferredCoreIcon(sk,i))}<div><h2>${esc(sk[0])}</h2><div class="skill-list-title"><span class="skill-state ${learned?'learned':'locked'}">${learned?'已學':'未學'}</span><span>${kind==='proc'?'普攻觸發':'主動'}</span></div></div></div>${skillTypeBadges(state.job,i)}${skillMechanicsDetails(state.job,i)}<p class="skill-flavor"><b>說明：</b>${esc(typeof coreSkillFlavor==='function'?coreSkillFlavor(state.job,i):'')}</p><p class="skill-detail"><b>詳細：</b>${esc(coreDetailText(i))}</p>${requirementHTML(parts,missing)}${learned&&!usable?`<p class="small">目前無法使用：${esc(M.coreMissingRequirements(state,i,true).join('、'))}</p>`:''}<div class="actions active-slot-summary">${slots.map((id,slot)=>`<span>槽 ${slot+1}：${id===null?'未配置':esc(CLASSES[state.job].skills[id]?.[0]||'未知技能')} <button onclick="${clearFn}(${slot})">清空</button></span>`).join('')}</div><div class="skill-selected-controls"><button onclick="learn(${i})" ${learned||missing.length?'disabled':''}>${learned?'已學會':missing.length?'尚未達成':'學習'}</button>${[0,1].map(slot=>`<button onclick="${slotFn}(${i},${slot})" ${learned?'':'disabled'}>${slots[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join('')}<label>寶石 <select aria-label="${esc(sk[0])}寶石" onchange="socket(${i},this.value)" ${learned?'':'disabled'}><option value="-1" ${gem===null?'selected':''}>不鑲嵌</option>${GEMS.map((g,j)=>`<option value="${j}" ${gem===j?'selected':''} ${state.gems[j]<1&&gem!==j?'disabled':''}>${esc(g.name)} ×${state.gems[j]} · ${esc(g.desc)}</option>`).join('')}</select></label></div></section>`;
}
function supportSelectedDetail(i){
  const sk=SUPPORT[state.job]?.[i];if(!sk)return '';
  const learned=learnedSupport(i),missing=learned?M.supportMissingRequirements(state,i,true):M.supportMissingRequirements(state,i,false),usable=learned&&!M.supportMissingRequirements(state,i,true).length,parts=supportRequirementParts(sk,i);
  let detail='';try{detail=supportSkillDetail(state.job,i,state);}catch{detail=`${TARGET_NAMES[sk.target]||sk.target} · ${EFFECT_NAMES[sk.kind]||sk.kind} ${Number((supportAmount(state.job,i)*100).toFixed(1))}% · 冷卻 ${sk.cooldown} 回合`;}
  if(sk.mastery)detail+=` · 使用時培養 ${masteryLabel(sk.mastery)}精通`;
  return `<section class="panel skill-selected-panel"><div class="skill-selected-heading">${skillIconHTML(inferredSupportIcon(sk))}<div><h2>${esc(sk.name)}</h2><div class="skill-list-title"><span class="skill-state ${learned?'learned':'locked'}">${learned?'已學':'未學'}</span><span>輔助</span></div></div></div>${skillTypeBadges(state.job,i,'support')}${skillMechanicsDetails(state.job,i,'support')}<p class="skill-flavor"><b>說明：</b>${esc(sk.description||'')}</p><p class="skill-detail"><b>詳細：</b>${esc(detail)}</p>${requirementHTML(parts,missing)}${learned&&!usable?`<p class="small">目前無法使用：${esc(M.supportMissingRequirements(state,i,true).join('、'))}</p>`:''}<div class="actions active-slot-summary">${state.supportSlots.map((id,slot)=>`<span>槽 ${slot+1}：${id===null?'未配置':esc(SUPPORT[state.job][id]?.name||'未知技能')} <button onclick="slotSupport(null,${slot})">清空</button></span>`).join('')}</div><div class="skill-selected-controls"><button onclick="learnSupport(${i})" ${learned||missing.length?'disabled':''}>${learned?'已學會':missing.length?'尚未達成':'學習'}</button>${[0,1].map(slot=>`<button onclick="slotSupport(${i},${slot})" ${learned?'':'disabled'}>${state.supportSlots[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join('')}</div></section>`;
}
function selectedSkillDetailHTML(entries){
  if(skillSelectionJob!==state.job){skillSelectionJob=state.job;skillSelection=null;skillTurn=1;}
  const visible=entries.filter(x=>x.turn===skillTurn);
  if(!visible.length){skillSelection=null;return '';}
  if(!skillSelection||!visible.some(x=>x.type===skillSelection.type&&x.i===skillSelection.i))skillSelection={type:visible[0].type,i:visible[0].i};
  return skillSelection.type==='core'?coreSelectedDetail(skillSelection.i):supportSelectedDetail(skillSelection.i);
}
globalThis.setSkillTurn=function(turn){turn=Number(turn);if(![1,2].includes(turn)||turn===skillTurn)return;skillTurn=turn;skillSelection=null;render();};
globalThis.selectSkillTile=function(type,i){i=Number(i);if(!['core','support'].includes(type)||!Number.isInteger(i))return;skillSelection={type,i};skillSelectionJob=state.job;render();};

function masteryGainHTML(source){
  const entries=Object.entries(source||{}).filter(([key])=>key.startsWith(state.job+':'));
  return entries.length?`<div class="mastery-gain-list">${entries.map(([key,xp])=>`<span class="tag">${esc(masteryLabel(key.split(':')[1]))} +${xp} XP</span>`).join('')}</div>`:'<span class="small">尚無紀錄</span>';
}
function devToolHTML(){
  const weaponTypes=DEV_WEAPONS_BY_JOB[state.job]||[];
  return `<details class="panel mastery-dev-tools"><summary>測試版開發工具</summary><p class="small">只存在 chatgpt-dev。直接改測試角色資料；長時間模擬會實際推進戰鬥、EXP、掉落與精通。</p><div class="mastery-dev-grid">
    <div class="mastery-dev-box"><b>角色進度</b><div class="actions"><label>LV <input id="dev-mastery-level" type="number" min="1" max="${RULES.maxLevel}" value="${state.lv}"></label><button onclick="devMasterySetLevel()">設定</button></div><div class="actions"><label>EXP <input id="dev-mastery-exp" type="number" min="0" value="${state.xp}"></label><button onclick="devMasterySetExp()">設定</button></div></div>
    <div class="mastery-dev-box"><b>精通 XP</b>${masteryKeys().map(key=>`<div class="actions"><span style="min-width:54px">${esc(masteryLabel(key))}</span><button onclick="devMasteryAdjust('${key}',-10)">−10</button><input id="dev-mastery-${key}" type="number" min="0" value="${state.mastery[key]}"><button onclick="devMasterySet('${key}')">設定</button><button onclick="devMasteryAdjust('${key}',10)">+10</button></div>`).join('')}<button onclick="devMasteryReset()">重置此角色精通</button></div>
    <div class="mastery-dev-box"><b>武器切換</b><div class="actions">${weaponTypes.map(type=>`<button onclick="devMasteryWeapon('${type}')">${esc(weaponLabel(type))}</button>`).join('')||'<span class="small">目前資料沒有可切換武器。</span>'}</div><p class="small">沒有對應武器時會建立一件 T1 測試武器並直接穿戴。</p></div>
    <div class="mastery-dev-box"><b>戰鬥模擬</b><div class="actions"><label>回合 <input id="dev-mastery-rounds" type="number" min="1" max="2000" value="100"></label><button onclick="devMasterySimulate()">模擬</button></div><p class="small">上次完整遭遇精通：${masteryGainHTML(M.lastBattleGain())}</p><p class="small">目前遭遇精通：${masteryGainHTML(M.currentBattleGain())}</p></div>
  </div><div class="divider"></div><b>技能測試開關</b><div class="actions">${CLASSES[state.job].skills.map((sk,i)=>`<button onclick="devMasteryToggleCore(${i})">${learnedCore(i)?'取消':'學會'} ${esc(sk[0])}</button>`).join('')}</div><div class="actions">${SUPPORT[state.job].map((sk,i)=>`<button onclick="devMasteryToggleSupport(${i})">${learnedSupport(i)?'取消':'學會'} ${esc(sk.name)}</button>`).join('')}</div></details>`;
}
skillsView=function(){
  M.ensureHero(state);
  return singlePagePanel('skills','技能',()=>{const entries=skillCatalogEntries();if(skillSelectionJob!==state.job){skillSelectionJob=state.job;skillSelection=null;skillTurn=1;}const visible=entries.filter(x=>x.turn===skillTurn),detail=selectedSkillDetailHTML(entries);return `<div class="actions skill-turn-tabs"><button class="${skillTurn===1?'primary':''}" onclick="setSkillTurn(1)">一轉</button><button class="${skillTurn===2?'primary':''}" onclick="setSkillTurn(2)">二轉</button></div>${masterySummaryHTML()}<p class="small skill-board-help">技能依學習角色等級分列；移到圖示上可查看精通與其他學習條件，點擊圖示可查看詳細資料與配置。</p>${skillLevelBoardHTML(visible)}${detail}${devToolHTML()}`;});
};

function stopForDev(){running=false;partyBusy=false;}
globalThis.devMasterySetLevel=function(){
  stopForDev();const el=$('dev-mastery-level'),lv=Math.max(1,Math.min(RULES.maxLevel,Math.floor(Number(el?.value)||1)));state.lv=lv;state.xp=Math.min(state.xp,Math.max(0,need(lv)-1));state.hp=stats().hp;save();render();
};
globalThis.devMasterySetExp=function(){
  stopForDev();const el=$('dev-mastery-exp'),xp=Math.max(0,Math.floor(Number(el?.value)||0));state.xp=state.lv>=levelCap(state)?0:Math.min(xp,Math.max(0,need(state.lv)-1));save();render();
};
globalThis.devMasterySet=function(key){
  if(!masteryKeys().includes(key))return;stopForDev();const el=$('dev-mastery-'+key);state.mastery[key]=Math.max(0,Math.floor(Number(el?.value)||0));save();render();
};
globalThis.devMasteryAdjust=function(key,delta){
  if(!masteryKeys().includes(key))return;stopForDev();state.mastery[key]=Math.max(0,Math.floor((Number(state.mastery[key])||0)+Number(delta||0)));save();render();
};
globalThis.devMasteryReset=function(){stopForDev();for(const key of masteryKeys())state.mastery[key]=0;save();render();toast('已重置此角色精通');};
function clearCoreConfig(i){
  state.active=state.active.map(x=>x===i?null:x);ensureProcSlots(state);state.procSlots=state.procSlots.map(x=>x===i?null:x);
  const gem=state.sockets?.[i];if(gem!==null&&gem!==undefined){state.gems[gem]=(state.gems[gem]||0)+1;state.sockets[i]=null;}
}
globalThis.devMasteryToggleCore=function(i){stopForDev();if(!CLASSES[state.job]?.skills?.[i])return;if(state.skills[i]){state.skills[i]=0;clearCoreConfig(i);}else state.skills[i]=1;save();render();};
globalThis.devMasteryToggleSupport=function(i){stopForDev();if(!SUPPORT[state.job]?.[i])return;if(state.supportLevels[i]){state.supportLevels[i]=0;state.supportSlots=state.supportSlots.map(x=>x===i?null:x);}else state.supportLevels[i]=1;save();render();};
globalThis.devMasteryWeapon=function(type){
  stopForDev();if(!M.weaponTypes[type])return;let g=state.bag?.find(x=>Number(x.slot)===0&&x.weaponType===type);
  if(!g){
    let index=(ITEM_FORMS[state.job]?.[0]||[]).findIndex(x=>x.weaponType===type),synthetic=index<0;
    if(state.bag.length>=RULES.bagCapacity)return toast('背包已滿');
    if(index<0)index=0;
    g=gear(1,0,0,state.job);g.formJob=state.job;g.form=index;g.weaponType=type;g.name=(synthetic?'【測試】'+weaponLabel(type)+' · ':'')+gearName(g);if(synthetic)g.devWeaponTypeOverride=true;addGear(g);
  }
  equipGear(g.id);save();render();toast('已切換為 '+weaponLabel(type));
};
globalThis.devMasterySimulate=function(){
  stopForDev();const el=$('dev-mastery-rounds'),target=Math.max(1,Math.min(2000,Math.floor(Number(el?.value)||100)));let completed=0,actions=0;
  running=true;if(!foes.some(e=>e.hp>0))spawnGroup();
  try{
    for(;completed<target;completed++){
      if($('modal')?.open)break;
      const gen=pacedRound();let guard=0,step;
      do{step=gen.next();guard++;actions++;if(guard>200)throw Error('單回合動作超過安全上限');}while(!step.done);
    }
  }catch(e){console.warn('長時間戰鬥模擬中止',e);toast('模擬中止：'+e.message);}
  running=false;save();render();if(completed)toast(`已模擬 ${completed} 個戰鬥回合`);
};

if(GAMEPLAY_SETTINGS.quests?.tutorial)GAMEPLAY_SETTINGS.quests.tutorial.skillLevelRequirement=1;
if(GAMEPLAY_SETTINGS_DEFAULTS.quests?.tutorial)GAMEPLAY_SETTINGS_DEFAULTS.quests.tutorial.skillLevelRequirement=1;
tutorial=function(){
  if(state.tutorial>=3)return '';const t=GAMEPLAY_SETTINGS.quests.tutorial;
  const texts=[['01 / 初次狩獵',`在苔光林地開始自動探索，擊敗 ${Math.round(t.killRequirement)} 隻怪物。`,state.totalKills>=t.killRequirement],['02 / 整理行囊','前往「裝備強化」，將任一裝備強化一次。',state.bag.some(g=>g.plus>0)],['03 / 技能配置','前往「技能」確認初始技能，並開始累積精通。',state.skills[0]>0]][state.tutorial];
  return `<div class="tutorial"><div><b>${texts[0]}</b><p>${texts[1]}</p></div><button ${texts[2]?'':'disabled'} onclick="claimTutorial()">領取獎勵</button></div>`;
};

const masteryCharacterViewBase=characterView;
characterView=function(){
  const h=typeof pageHero==='function'?pageHero('character'):state;M.ensureHero(h);let html=masteryCharacterViewBase();
  html=html.replace(/升級獲得\s*\d+\s*能力點[、，]\s*\d+\s*技能點；?/g,'升級獲得能力點；').replace(/技能點\s*\+\s*\d+/g,'');
  const req=M.masterySettings().advanceRequiredLevel,best=Math.max(0,...M.validMasteries(h.job).map(k=>M.masteryLevelFromXp(h.mastery[k]))),a=GAMEPLAY_SETTINGS.progression.advance,disabled=h.advanced||h.lv<a.level||best<req;
  html=html.replace(/<button class="primary" onclick="heroMenuAction\((\d+),\(\)=>\{advance\(\)\}\)"\s*(?:disabled)?\s*>/,(_,job)=>`<button class="primary" onclick="heroMenuAction(${job},()=>{advance()})"${disabled?' disabled':''}>`);
  return html+`<section class="panel"><h2>二轉精通條件</h2><p>除既有角色等級與資源外，需要本職任一主要精通達 Lv${req}。</p><p class="small">目前最高精通 Lv${best}。不要求所有精通平均培養。</p></section>`;
};
const masteryGuideBase=guideView;
guideView=function(){
  let html=masteryGuideBase();
  html=html.replace(/每級獲得\s*([\d.]+)\s*能力點[、，]\s*[\d.]+\s*技能點/g,'每級獲得 $1 能力點').replace(/每級增加[^。<]*。/g,'').replace(/技能上限[^。<]*。/g,'').replace(/每級消耗 1 技能點[^。<]*。/g,'').replace(/技能點/g,'');
  return `<section class="panel"><h2>角色成長與精通</h2><p>角色升級改為較慢的重大階段；技能學會即完整，不再升技能等級。戰士／弓箭手靠對應武器普攻與技能培養武器精通；法師／牧師依實際施放技能的魔法體系培養元素／光暗精通。精通主要用於解鎖技能與二轉條件。</p></section>`+html;
};
if(state){save();render();}
})();
