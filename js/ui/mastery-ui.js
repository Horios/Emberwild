
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
  return `<section class="panel mastery-summary-panel"><div class="row"><div><h2>精通</h2><p class="small">精通 XP 由符合體系的實際戰鬥行為取得；移到圖示上可查看目前進度。</p></div><span class="tag">目前武器：${esc(weaponLabel(currentWeapon))}</span></div><div class="mastery-summary mastery-icon-summary">${masteryKeys().map(key=>{const p=M.masteryProgress(state.mastery[key]),name=`${masteryLabel(key)}精通`,xpText=p.next?`${p.current} / ${p.next} XP`:`${p.xp} XP · 已達上限`;return `<div class="mastery-icon-item" tabindex="0" aria-label="${esc(name)} LV.${p.level}，${esc(xpText)}"><span class="mastery-icon-level">${esc(name)} LV.${p.level}</span><span class="mastery-icon-box">${skillIconHTML(key)}</span><span class="mastery-icon-tooltip"><b>${esc(name)} LV.${p.level}</b><span>目前／最大經驗：${esc(xpText)}</span></span></div>`;}).join('')}</div></section>`;
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
const SKILL_ICON_PATHS={
sword:'<path d="M37 6l5 5-20 20-5-5L37 6zM15 24l9 9M18 30L7 41m5-5 5 5"/>',
axe:'<path d="M24 8C18 6 12 7 5 10c4 5 5 11 0 17 7 3 13 4 19 1l6-10z" fill="currentColor" stroke="none"/><path d="M26 23 39 42m-5-2 8-3"/>',
hammer:'<path d="M10 9h28v12H10zM24 21v22M14 9v12m20-12v12"/>',
bow:'<path d="M12 5c22 10 22 28 0 38M12 5v38M10 24h32m-7-6 7 6-7 6"/>',
crossbow:'<path d="M7 21h31v6H7z" fill="currentColor" stroke="none"/><path d="M32 6c11 10 11 26 0 36M32 6v36M16 27l-2 11h9l3-11m10-9 7 6-7 6"/>',
shield:'<path d="M24 5l15 6v12c0 9-6 16-15 20C15 39 9 32 9 23V11zM24 12v23"/>',
heal:'<path d="M24 41C17 36 8 28 8 19c0-7 9-11 16-4 7-7 16-3 16 4 0 9-9 17-16 22zM24 19v12m-6-6h12"/>',
fire:'<path d="M26 5c2 8-3 11-2 16 2-3 5-5 9-6 3 6 7 11 7 17 0 8-7 12-16 12S8 40 8 32c0-7 5-12 11-19 0 5 2 8 5 9M24 40c-4-4-3-8 1-13 0 4 5 5 5 9 0 3-3 5-6 4z"/>',
ice:'<path d="M24 5v38M8 15l32 18M40 15 8 33M19 10l5 5 5-5m-10 28 5-5 5 5M9 22l7 1-2-7m25 10-7-1 2 7m0-16-2 7 7-1M14 32l2-7-7 1"/>',
wind:'<path d="M6 17h23c7 0 7-9 1-9-3 0-5 2-5 4M6 24h35M6 31h22c7 0 7 9 1 9-3 0-5-2-5-4"/>',
light:'<circle cx="24" cy="24" r="8"/><path d="M24 4v9m0 22v9M4 24h9m22 0h9M10 10l7 7m14 14 7 7m0-28-7 7M17 31l-7 7"/>',
shadow:'<path d="M35 37A17 17 0 1 1 28 6c-7 6-9 16-4 23 3 5 7 7 11 8zM34 9v7m-3-4h6"/>',
magic:'<circle cx="24" cy="24" r="18"/><path d="M24 9l5 10 10 5-10 5-5 10-5-10-10-5 10-5z"/>',
buff:'<path d="M24 40V11m-10 11 10-11 10 11M10 40h28M9 10l3 3m27-3-3 3"/>',
debuff:'<path d="M24 8v29m-10-11 10 11 10-11M10 8h28M12 42l6-6m18 6-6-6"/>',
drain:'<path d="M24 5C20 12 11 23 11 31a13 13 0 0 0 26 0C37 23 28 12 24 5zM17 30c0 5 3 8 8 8"/>',
trigger:'<path d="M28 5 11 27h12l-3 16 17-23H25z"/>',
earthSlash:'<path d="M36 5l5 5-18 18-5-5L36 5zM17 22l8 8M17 29 9 37M6 42h11l4-5 5 5h16"/>',
counter:'<path d="M36 7l5 5-19 19-5-5zM16 25l7 7M17 31 8 40M7 18c-2-8 3-14 11-15m-4-2 4 2-1 5"/>',
bloodStrike:'<path d="M23 8C17 6 12 7 6 10c4 4 5 9 1 14 6 3 11 3 16 1l5-9z" fill="currentColor" stroke="none"/><path d="M23 21 11 43M34 27c-3 5-5 8-5 11a5 5 0 0 0 10 0c0-3-2-6-5-11z"/>',
steelJudgment:'<path d="M21 5h6v22l-3 8-3-8zM14 28h20M24 35v8m-4 0h8M8 9l5 5m27-5-5 5M24 5v-2"/>',
fortitude:'<path d="M24 5l14 6v12c0 9-5 15-14 19-9-4-14-10-14-19V11zM24 33V16m-7 7 7-7 7 7"/>',
fireArrow:'<path d="M5 24h36m-7-7 7 7-7 7M16 19c-3-4 2-8 2-13 7 5 8 9 5 13M16 29c-3 4 2 8 2 13 7-5 8-9 5-13"/>',
frostWard:'<path d="M24 5l14 6v12c0 9-5 15-14 19-9-4-14-10-14-19V11zM24 14v20m-9-15 18 10m0-10L15 29M20 17l4 4 4-4m-8 14 4-4 4 4"/>',
emberBurst:'<circle cx="24" cy="24" r="7"/><path d="M24 4v9m0 22v9M4 24h9m22 0h9M10 10l7 7m14 14 7 7m0-28-7 7M17 31l-7 7M24 19l3 5-3 5"/>',
arcaneDrain:'<path d="M32 8a17 17 0 1 0 8 17m-4-2 4 2 3-4M18 15l6-7 6 7-6 7zM24 25c-3 4-6 7-6 10a6 6 0 0 0 12 0c0-3-3-6-6-10z"/>',
meteor:'<path d="M7 11l14 14M5 21l12 9m2-25 9 12M32 18a10 10 0 1 1-14 14 10 10 0 0 1 14-14zM27 21l6 6"/>',
manaEcho:'<path d="M19 8l4 10 10 4-10 4-4 10-4-10-10-4 10-4zM36 31l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM32 6l2 4 4 2-4 2-2 4"/>',
pierce:'<circle cx="24" cy="24" r="10"/><path d="M4 24h40m-7-6 7 6-7 6"/>',
rest:'<path d="M10 37C8 19 16 9 38 8c-1 21-11 31-28 29zM10 37c8-10 17-17 28-29M39 30v10m-5-5h10"/>',
volley:'<path d="M6 12h32m-7-5 7 5-7 5M6 24h32m-7-5 7 5-7 5M6 36h32m-7-5 7 5-7 5"/>',
target:'<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="5"/><path d="M24 3v11m0 20v11M3 24h11m20 0h11"/>',
arrowRain:'<path d="M7 9c10-7 24-7 34 0M12 16v22m-5-7 5 7 5-7M24 12v27m-5-7 5 7 5-7M36 16v22m-5-7 5 7 5-7"/>',
lifeArrow:'<path d="M5 13h36m-7-6 7 6-7 6M24 42c-7-5-13-11-13-17 0-6 8-8 13-2 5-6 13-4 13 2 0 6-6 12-13 17zM24 27v8m-4-4h8"/>',
lightJudgment:'<circle cx="24" cy="12" r="5"/><path d="M24 2v3M12 7l4 3m20-3-4 3M18 23l6 19 6-19M12 42h24M8 27l5 4m27-4-5 4"/>',
smite:'<path d="M24 6l5 12 12 6-12 6-5 12-5-12-12-6 12-6zM24 16v16m-8-8h16"/>',
lifeSpring:'<path d="M10 37c6 5 22 5 28 0M12 33h24M24 8c-3 4-4 6-4 9a4 4 0 0 0 8 0c0-3-1-5-4-9zM24 22v8M14 20c0 5 2 8 6 10m14-10c0 5-2 8-6 10"/>',
dawnSeal:'<circle cx="24" cy="24" r="14"/><path d="M24 11l6 13-6 13-6-13zM10 24h28M24 3v5m0 32v5M3 24h5m32 0h5"/>',
holyWard:'<path d="M24 5l14 6v12c0 9-5 15-14 19-9-4-14-10-14-19V11zM24 15v18m-8-9h16"/>',
warcry:'<path d="M7 21h7l17-10v26L14 27H7zM14 27v11h7l-4-9M36 16c4 4 4 12 0 16m4-21c7 7 7 19 0 26"/>',
guardian:'<path d="M24 5l14 6v12c0 9-5 15-14 19-9-4-14-10-14-19V11zM24 32c-4-3-8-6-8-10 0-4 5-6 8-2 3-4 8-2 8 2 0 4-4 7-8 10z"/>',
armorBreak:'<path d="M24 5l14 6v12c0 9-5 15-14 19-9-4-14-10-14-19V11zM30 11l-7 11 6 5-10 15"/>',
resonance:'<circle cx="24" cy="24" r="5"/><path d="M12 12a17 17 0 0 0 0 24m24-24a17 17 0 0 1 0 24M7 7a24 24 0 0 0 0 34m34-34a24 24 0 0 1 0 34"/>',
time:'<circle cx="24" cy="24" r="17"/><path d="M24 12v12l8 5M7 8l4 4m30-4-4 4"/>',
brand:'<circle cx="24" cy="24" r="17"/><path d="M24 11c1 6-4 7-2 12 2-2 4-3 7-4 3 4 5 8 5 12a10 10 0 0 1-20 0c0-5 4-9 8-14 0 4 1 5 2 6M24 28c-2 3-3 5-3 7a3 3 0 0 0 6 0c0-2-1-4-3-7z"/>',
eagleEye:'<path d="M5 24c5-8 11-12 19-12s14 4 19 12c-5 8-11 12-19 12S10 32 5 24z"/><circle cx="24" cy="24" r="6"/><path d="M24 5v5m0 28v5"/>',
windWard:'<path d="M24 5l14 6v12c0 9-5 15-14 19-9-4-14-10-14-19V11zM15 22h15c5 0 5-6 1-6-2 0-3 1-3 2M15 28h15c5 0 5 6 1 6-2 0-3-1-3-2"/>',
dawnBless:'<circle cx="24" cy="23" r="11"/><path d="M24 4v6m0 26v8M5 23h8m22 0h8M10 9l5 5m18 18 5 5m0-28-5 5M15 32l-5 5M24 17v12m-6-6h12"/>',
lightPrayer:'<path d="M8 40c4-8 6-14 8-20l6 6-2 9m20 5c-4-8-6-14-8-20l-6 6 2 9M20 35h8M24 5v12m-5-6h10"/>'
};
// An explicit iconType from balance JSON wins. Named defaults give each built-in
// skill a recognizable image; renamed custom skills use the effect-based fallback.
const DEFAULT_CORE_ICONS={
  '裂地斬':'earthSlash','堅毅壁壘':'shield','反擊之刃':'counter','浴血重擊':'bloodStrike','聖鋼裁決':'steelJudgment','不屈戰意':'fortitude',
  '火焰箭':'fireArrow','冰霜護幕':'frostWard','餘燼爆發':'emberBurst','奧術汲取':'arcaneDrain','隕星墜落':'meteor','魔力迴響':'manaEcho',
  '穿透箭':'pierce','林間休憩':'rest','連射':'volley','獵手印記':'target','疾風箭雨':'arrowRain','生命之箭':'lifeArrow',
  '聖光審判':'lightJudgment','治癒禱言':'heal','懲戒':'smite','生命泉源':'lifeSpring','黎明聖印':'dawnSeal','神聖庇護':'holyWard'
};
const DEFAULT_SUPPORT_ICONS={
  '戰吼':'warcry','守護誓言':'guardian','破甲怒吼':'armorBreak',
  '奧術共鳴':'resonance','時間凝滯':'time','元素灼印':'brand',
  '鷹眼指引':'eagleEye','獵手標記':'target','風行庇佑':'windWard',
  '晨光祝福':'dawnBless','聖光庇護':'holyWard','光明祈願':'lightPrayer'
};
const SKILL_ICON_TONES={
  steel:['sword','axe','hammer','shield','earthSlash','counter','fortitude','steelJudgment','guardian','armorBreak'],
  ember:['fire','fireArrow','emberBurst','meteor','brand','bloodStrike'],
  frost:['ice','frostWard','time'],
  wind:['wind','windWard','arrowRain'],
  light:['light','heal','lightJudgment','smite','lifeSpring','dawnSeal','holyWard','dawnBless','lightPrayer'],
  shadow:['shadow','drain','arcaneDrain'],
  arcane:['magic','manaEcho','resonance'],
  nature:['rest','lifeArrow'],
  aim:['bow','crossbow','pierce','volley','target','eagleEye']
};
const SKILL_ICON_TONE=Object.fromEntries(Object.entries(SKILL_ICON_TONES).flatMap(([tone,keys])=>keys.map(key=>[key,tone])));
function skillTurnOfCore(sk,i){return skillRequiresAdvanced(sk,i)?2:1;}
function skillTurnOfSupport(sk,i){return i===2?2:1;}
function inferredCoreIcon(sk,i){
  const meta=M.coreMeta(state.job,i),explicit=meta?.iconType;
  if(explicit&&explicit!=='auto')return explicit;
  if(Object.hasOwn(DEFAULT_CORE_ICONS,sk[0]))return DEFAULT_CORE_ICONS[sk[0]];
  if(['shield','shieldLowest'].includes(sk[5]))return 'shield';
  if(sk[5]==='heal')return 'heal';
  if(sk[5]==='drain')return 'drain';
  const element=typeof coreSkillElement==='function'?coreSkillElement(state.job,i):(SKILL_ELEMENTS[state.job]?.[i]||'physical');
  if(['fire','ice','wind','light','shadow'].includes(element))return element;
  if(['sword','axe','hammer','bow','crossbow'].includes(meta?.mastery))return meta.mastery;
  if(sk[1]==='proc')return 'trigger';
  return 'magic';
}
function inferredSupportIcon(sk){
  const explicit=sk?.iconType;if(explicit&&explicit!=='auto')return explicit;
  if(Object.hasOwn(DEFAULT_SUPPORT_ICONS,sk?.name))return DEFAULT_SUPPORT_ICONS[sk.name];
  if(sk?.kind==='guard')return 'shield';
  if(sk?.kind==='regen')return 'heal';
  if(['fracture','weaken','vulnerable','damageAmp'].includes(sk?.kind))return 'debuff';
  if(['attack','power','critical'].includes(sk?.kind))return 'buff';
  if(['fire','ice','wind','light','shadow'].includes(sk?.element))return sk.element;
  return 'magic';
}
function skillIconHTML(type){const key=Object.hasOwn(SKILL_ICON_PATHS,type)?type:'magic';return `<span class="skill-icon-glyph icon-${key} tone-${SKILL_ICON_TONE[key]||'neutral'}" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false">${SKILL_ICON_PATHS[key]}</svg></span>`;}
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
  const kindClass=entry.type==='support'?'skill-kind-support':entry.sk[1]==='proc'?'skill-kind-proc':'skill-kind-active';
  const requirements=entry.type==='core'?coreRequirementParts(entry.sk,entry.i):supportRequirementParts(entry.sk,entry.i);
  return `<button type="button" class="skill-icon-tile ${kindClass} ${learned?'learned':'locked'} ${selected?'selected':''}" onclick="selectSkillTile('${entry.type}',${entry.i})" aria-label="${esc(entry.name)}">${skillIconHTML(entry.icon)}<span class="skill-icon-status" aria-hidden="true">${learned?'✓':''}</span><span class="skill-icon-tooltip"><b>${esc(entry.name)}</b><span>${esc(kind)} · LV${entry.level}</span><span>${esc(skillMasteryTooltip(entry.meta))}</span><span>學習條件：${esc(requirements.join(' · '))}</span>${missing.length?`<span class="missing">尚缺：${esc(missing.join('、'))}</span>`:''}</span></button>`;
}
function skillLevelBoardHTML(entries){
  if(!entries.length)return '<section class="panel"><p class="empty">此轉職階段目前沒有技能。</p></section>';
  const groups=new Map();for(const entry of entries){if(!groups.has(entry.level))groups.set(entry.level,[]);groups.get(entry.level).push(entry);}
  return `<div class="skill-level-board">${[...groups.entries()].map(([level,list])=>`<section class="skill-level-row"><div class="skill-level-label"><span>LV</span><strong>${level}</strong></div><div class="skill-level-icons">${list.map(skillTileHTML).join('')}</div></section>`).join('')}</div>`;
}
function coreSelectedDetail(i){
  const sk=CLASSES[state.job].skills[i];if(!sk)return '';
  const kind=sk[1],learned=learnedCore(i),missing=learned?M.coreMissingRequirements(state,i,true):M.coreMissingRequirements(state,i,false),usable=learned&&!M.coreMissingRequirements(state,i,true).length,gem=state.sockets[i]??null,parts=coreRequirementParts(sk,i);
  const slots=kind==='active'?Array.from({length:2},(_,slot)=>state.active?.[slot]??null):state.procSlots,slotFn=kind==='active'?'equipSkill':'slotProcSkill';
  return `<section class="panel skill-selected-panel ${kind==='proc'?'skill-kind-proc':'skill-kind-active'}"><div class="skill-selected-heading">${skillIconHTML(inferredCoreIcon(sk,i))}<div><h2>${esc(sk[0])}</h2><div class="skill-list-title"><span class="skill-state ${learned?'learned':'locked'}">${learned?'已學':'未學'}</span><span>${kind==='proc'?'普攻觸發':'主動'}</span></div></div></div>${skillTypeBadges(state.job,i)}${skillMechanicsDetails(state.job,i)}<p class="skill-flavor"><b>說明：</b>${esc(typeof coreSkillFlavor==='function'?coreSkillFlavor(state.job,i):'')}</p><p class="skill-detail"><b>詳細：</b>${esc(coreDetailText(i))}</p>${requirementHTML(parts,missing)}${learned&&!usable?`<p class="small">目前無法使用：${esc(M.coreMissingRequirements(state,i,true).join('、'))}</p>`:''}<div class="skill-selected-controls"><button onclick="learn(${i})" ${learned||missing.length?'disabled':''}>${learned?'已學會':missing.length?'尚未達成':'學習'}</button>${[0,1].map(slot=>`<button onclick="${slotFn}(${i},${slot})" ${learned?'':'disabled'}>${slots[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join('')}<label>寶石 <select aria-label="${esc(sk[0])}寶石" onchange="socket(${i},this.value)" ${learned?'':'disabled'}><option value="-1" ${gem===null?'selected':''}>不鑲嵌</option>${GEMS.map((g,j)=>`<option value="${j}" ${gem===j?'selected':''} ${state.gems[j]<1&&gem!==j?'disabled':''}>${esc(g.name)} ×${state.gems[j]} · ${esc(g.desc)}</option>`).join('')}</select></label></div></section>`;
}
function supportSelectedDetail(i){
  const sk=SUPPORT[state.job]?.[i];if(!sk)return '';
  const learned=learnedSupport(i),missing=learned?M.supportMissingRequirements(state,i,true):M.supportMissingRequirements(state,i,false),usable=learned&&!M.supportMissingRequirements(state,i,true).length,parts=supportRequirementParts(sk,i);
  let detail='';try{detail=supportSkillDetail(state.job,i,state);}catch{detail=`${TARGET_NAMES[sk.target]||sk.target} · ${EFFECT_NAMES[sk.kind]||sk.kind} ${Number((supportAmount(state.job,i)*100).toFixed(1))}% · 冷卻 ${sk.cooldown} 回合`;}
  if(sk.mastery)detail+=` · 使用時培養 ${masteryLabel(sk.mastery)}精通`;
  return `<section class="panel skill-selected-panel skill-kind-support"><div class="skill-selected-heading">${skillIconHTML(inferredSupportIcon(sk))}<div><h2>${esc(sk.name)}</h2><div class="skill-list-title"><span class="skill-state ${learned?'learned':'locked'}">${learned?'已學':'未學'}</span><span>輔助</span></div></div></div>${skillTypeBadges(state.job,i,'support')}${skillMechanicsDetails(state.job,i,'support')}<p class="skill-flavor"><b>說明：</b>${esc(sk.description||'')}</p><p class="skill-detail"><b>詳細：</b>${esc(detail)}</p>${requirementHTML(parts,missing)}${learned&&!usable?`<p class="small">目前無法使用：${esc(M.supportMissingRequirements(state,i,true).join('、'))}</p>`:''}<div class="skill-selected-controls"><button onclick="learnSupport(${i})" ${learned||missing.length?'disabled':''}>${learned?'已學會':missing.length?'尚未達成':'學習'}</button>${[0,1].map(slot=>`<button onclick="slotSupport(${i},${slot})" ${learned?'':'disabled'}>${state.supportSlots[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join('')}</div></section>`;
}
function selectedSkillDetailHTML(entries){
  if(skillSelectionJob!==memberKey(state)){skillSelectionJob=memberKey(state);skillSelection=null;skillTurn=1;}
  const visible=entries.filter(x=>x.turn===skillTurn);
  if(!visible.length){skillSelection=null;return '';}
  if(!skillSelection||!visible.some(x=>x.type===skillSelection.type&&x.i===skillSelection.i))skillSelection={type:visible[0].type,i:visible[0].i};
  return skillSelection.type==='core'?coreSelectedDetail(skillSelection.i):supportSelectedDetail(skillSelection.i);
}
globalThis.setSkillTurn=function(turn){turn=Number(turn);if(![1,2].includes(turn)||turn===skillTurn)return;skillTurn=turn;skillSelection=null;render();};
globalThis.selectSkillTile=function(type,i){i=Number(i);if(!['core','support'].includes(type)||!Number.isInteger(i))return;skillSelection={type,i};skillSelectionJob=memberKey(state);render();};

function skillLoadoutSummaryHTML(){
  syncHeroSkillArrays(state);ensureProcSlots(state);
  const active=Array.from({length:2},(_,slot)=>state.active?.[slot]??null),proc=Array.from({length:2},(_,slot)=>state.procSlots?.[slot]??null),support=Array.from({length:2},(_,slot)=>state.supportSlots?.[slot]??null);
  const coreName=id=>id===null?'未配置':CLASSES[state.job].skills[id]?.[0]||'未知技能',supportName=id=>id===null?'未配置':SUPPORT[state.job]?.[id]?.name||'未知技能';
  const group=(kind,label,slots,nameOf,clearFn)=>`<div class="skill-loadout-group ${kind}"><b>${label}</b><div class="skill-loadout-slots">${slots.map((id,slot)=>`<span class="skill-loadout-slot"><span>槽 ${slot+1}</span><strong>${esc(nameOf(id))}</strong><button onclick="${clearFn}(${slot})" ${id===null?'disabled':''}>清空</button></span>`).join('')}</div></div>`;
  return `<section class="skill-loadout-panel">${group('skill-kind-active','主動技能',active,coreName,'clearActiveSkill')}${group('skill-kind-proc','觸發技能',proc,coreName,'clearProcSkill')}${group('skill-kind-support','輔助技能',support,supportName,'slotSupport.bind(null,null)')}</section>`.replace(/slotSupport\.bind\(null,null\)\((\d+)\)/g,'slotSupport(null,$1)');
}

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
  return singlePagePanel('skills','技能',()=>{const entries=skillCatalogEntries();if(skillSelectionJob!==memberKey(state)){skillSelectionJob=memberKey(state);skillSelection=null;skillTurn=1;}const visible=entries.filter(x=>x.turn===skillTurn),detail=selectedSkillDetailHTML(entries);return `${skillLoadoutSummaryHTML()}<div class="actions skill-turn-tabs"><button class="${skillTurn===1?'primary':''}" onclick="setSkillTurn(1)">一轉</button><button class="${skillTurn===2?'primary':''}" onclick="setSkillTurn(2)">二轉</button></div>${masterySummaryHTML()}<p class="small skill-board-help">技能依學習角色等級分列；移到圖示上可查看精通與其他學習條件，點擊圖示可查看詳細資料與配置。</p><div class="skill-layout-split"><div class="skill-tree-pane">${skillLevelBoardHTML(visible)}</div><div class="skill-detail-pane">${detail}</div></div>${devToolHTML()}`;});
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
