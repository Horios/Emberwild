/* One loadout view and one equipment socket editor use the canonical catalog. */
(()=>{
 'use strict';
 const S=__EMBERWILD_SKILLS,E=__EMBERWILD_EQUIPMENT_SKILLS;
 const labels={active:'主動',proc:'觸發',support:'輔助',passive:'被動'},sources={class:'職業',advanced:'二轉',quest:'任務',equipment:'裝備',companion:'夥伴'};
 function detail(sk,h=state){
  const a=EmberwildSkillSystem.adapterFor(sk,h.job);
  if(sk.systemEffect)return `持續 ${sk.duration} 回合 · 冷卻 ${sk.cooldown} 回合${['guard','slow'].includes(sk.systemEffect)?' · '+Math.round(sk.power*100)+'%':sk.systemEffect==='regen'?' · 每回合最大生命 '+Math.round(sk.power*10000)/100+'%':''}`;
  return a.kind==='core'?coreSkillDetail(a.job,a.index,h):supportSkillDetail(a.job,a.index,h);
 }
 function icon(sk){return __EMBERWILD_MASTERY_UI.skillIcon(sk.adapter.job,sk.adapter.kind,sk.adapter.index);}
 function equipmentPicker(h){const worn=equipment(h).filter(g=>g.skillId&&S.byId(g.skillId)?.jobs.includes(h.job));return `<section class="panel equipment-skill-picker"><h2>裝備技能</h2><div class="skill-equipment-list"><button type="button" aria-pressed="${!h.activeSkillEquipmentId}" onclick="selectSkillEquipment(null)">不啟用裝備技能</button>${worn.map(g=>{const sk=S.byId(g.skillId),chosen=g.id===h.activeSkillEquipmentId,slotted=Object.values(h.skillLoadout).some(a=>a.includes(sk.id));return `<button type="button" data-skill-equipment="${esc(g.id)}" aria-pressed="${chosen}" onclick="selectSkillEquipment('${esc(g.id)}')"><b>${equipmentNameHTML(g)}</b><span class="equipment-skill-name">${esc(sk.name)} · ${labels[sk.type]}${chosen?' · '+(slotted?'已配置':'待配置'):''}</span><small class="equipment-skill-effect">${esc(sk.description||detail(sk,h))}</small></button>`;}).join('')}</div></section>`;}
 skillsView=function(){
  const h=party.members[0];if(__EMBERWILD_TEAMS.plan()?.job===null)return heading('SKILLS / 技能','尚未選擇職業')+`<section class="panel"><button onclick="setTab('roster')">前往隊伍編成</button></section>`;return withHero(h,()=>{S.refreshHero(h);return heading('SKILLS / 技能','目前技能配置',`<span class="tag">${esc(characterName(h))} · ${h.advanced?'二轉':'一轉'}</span>`)+`<div class="skill-system-page">${['active','proc','support'].map(type=>`<section class="panel"><h2>${labels[type]}技能</h2><div class="skill-system-slots">${h.skillLoadout[type].map((id,n)=>{const sk=S.byId(id);return `<button type="button" class="skill-system-slot skill-kind-${type}" data-skill-slot="${type}:${n}" onclick="openSkillSlot('${type}',${n})"><span class="small">${labels[type]}槽 ${n+1}</span>${sk?`<span class="skill-slot-name">${icon(sk)}<b>${esc(sk.name)}</b></span><span>${esc(sk.description||detail(sk,h))}</span>`:'<b>選擇技能</b>'}</button>`;}).join('')}</div></section>`).join('')}${equipmentPicker(h)}</div>`;});
 };
 globalThis.openSkillSlot=function(type,n){
  const h=party.members[0];if(!h.skillLoadout?.[type]||n<0||n>=h.skillLoadout[type].length)return false;
  const list=S.system().definitions.filter(sk=>sk.type===type&&S.learned(h,sk)),modal=$('modal');modal.classList.add('skill-system-dialog');
  modal.innerHTML=`<h2>${labels[type]}槽 ${n+1}</h2><div class="skill-candidate-list">${list.map(sk=>`<article class="skill-candidate" data-skill-id="${esc(sk.id)}"><div class="skill-slot-name">${icon(sk)}<b>${esc(sk.name)}</b><span class="tag">${esc(sk.sources.map(x=>sources[x.type]).join('／'))}</span></div><p>${esc(sk.description||'')}</p><p class="small">${esc(detail(sk,h))}</p><p class="small">需求 LV${sk.requiredLevel??sk.level??1}${sk.sources.some(s=>s.type==='advanced')?' · 二轉':''}</p><button type="button" onclick="chooseSkillSlot('${type}',${n},'${esc(sk.id)}')">${h.skillLoadout[type][n]===sk.id?'目前配置':'裝入技能'}</button></article>`).join('')||'<p>尚未取得符合此類型的技能。</p>'}</div><div class="actions"><button type="button" onclick="chooseSkillSlot('${type}',${n},null)">清空技能槽</button><button type="button" onclick="closeModal()">關閉</button></div>`;if(!modal.open)modal.showModal();return true;
 };
 globalThis.chooseSkillSlot=function(t,n,id){const h=party.members[0];return withHero(h,()=>{if(!configureSkill(t,n,id))return false;closeModal();return true;});};
 $('modal').addEventListener('close',()=>$('modal').classList.remove('skill-system-dialog'));
 const statNames={atk:'攻擊',hp:'生命',def:'防禦',speed:'速度',crit:'暴擊'};
 function gemText(h,g,id,n){const def=S.system().gems.find(x=>x.kind===id%5),tier=Math.floor(id/5),base=E.mode(h||{},{...g,skillSockets:{...g.skillSockets,gems:g.skillSockets.gems.map((value,index)=>index===n?id:value)}},n)==='base';if(base){const b=def.base,value=b.values[tier];return statNames[b.stat]+' +'+(b.unit==='ratio'?Math.round(value*10000)/100+'%':value);}return ({effect:'技能效果',cooldown:'冷卻縮短機率',procChance:'觸發率',heal:'額外治療',shield:'額外護盾'})[def.skill.key]+' +'+Math.round(def.skill.values[tier]*10000)/100+'%';}
 let socketSelection=null;
 globalThis.selectEquipmentSocket=function(id,n){
  const g=findGear(id);if(!g?.skillSockets||!Number.isInteger(n)||n<0||n>=g.skillSockets.count)return false;
  socketSelection={id,n};render();return true;
 };
 function socketIcon(id){return id===null?'<span aria-hidden="true">＋</span>':inventoryGemIcon(id);}
 function sockets(g){
  if(EmberwildTokens.isToken(g))return '';const sk=S.byId(g.skillId),h=party.members[0],active=!!sk&&h.activeSkillEquipmentId===g.id,x=g.skillSockets;
  if(!x)return '';
  if(socketSelection?.id!==g.id)socketSelection=null;
  const selected=socketSelection&&socketSelection.n<x.count?socketSelection.n:-1,id=selected<0?null:x.gems[selected],canSwitch=active&&x.count>0;
  const owned=GEMS.map((gem,type)=>({gem,type})).filter(({type})=>h.gems[type]>0);
  const slots=x.gems.map((gem,n)=>`<button type="button" class="equipment-socket-slot ${gem===null?'empty':''}" data-equipment-socket="${n}" aria-label="第 ${n+1} 孔：${gem===null?'空孔':esc(GEMS[gem].name)}" aria-pressed="${selected===n}" title="${gem===null?'空孔':esc(GEMS[gem].name)+' · '+esc(gemText(h,g,gem,n))}" onclick="selectEquipmentSocket('${esc(g.id)}',${n})">${socketIcon(gem)}<small>第 ${n+1} 孔</small></button>`).join('');
  const choices=selected>=0?`<div class="equipment-socket-choices" aria-label="第 ${selected+1} 孔寶石"><p class="small">第 ${selected+1} 孔 · ${id===null?'空孔':esc(GEMS[id].name)+' · '+esc(gemText(h,g,id,selected))}</p><div class="equipment-gem-grid">${owned.map(({gem,type})=>{const incompatible=selected===0&&sk&&x.firstMode==='skill'&&!E.compatible(type,sk,selected);return `<button type="button" class="equipment-gem-choice" data-equipment-gem="${type}" aria-label="鑲嵌${esc(gem.name)}" aria-pressed="${id===type}" title="${esc(gemText(h,g,type,selected))}${incompatible?' · 不適用於此裝備技能':''}" onclick="socketEquipmentGem('${esc(g.id)}',${selected},${type})" ${(incompatible||id===type)?'disabled':''}>${socketIcon(type)}<span>${esc(gem.name)}</span><small>×${h.gems[type]}</small></button>`;}).join('')||'<p class="small">目前沒有可鑲嵌的已持有寶石。</p>'}</div><button type="button" class="equipment-gem-remove" onclick="socketEquipmentGem('${esc(g.id)}',${selected},-1)" ${id===null?'disabled':''}>免費拆除第 ${selected+1} 孔寶石</button></div>`:'';
  const mode=x.count?`<div class="equipment-socket-mode"><label>第一孔效果<select aria-label="第一孔效果模式" onchange="setEquipmentGemMode('${esc(g.id)}',this.value)" ${canSwitch?'':'disabled'}><option value="base" ${!canSwitch||x.firstMode==='base'?'selected':''}>基礎數值</option><option value="skill" ${canSwitch&&x.firstMode==='skill'?'selected':''} ${canSwitch?'':'disabled'}>技能加成</option></select></label>${!sk?'<small>無附帶技能，僅提供基礎數值。</small>':!active?'<small>裝備技能啟用後可切換；目前採用基礎數值。</small>':''}</div>`:'';
  return `<section class="equipment-socket-editor" data-socket-equipment="${esc(g.id)}">${sk?'':'<h3>裝備技能</h3><p class="small">無附帶技能</p>'}${globalThis.__EMBERWILD_STORY?.protectedGear(g)?'<p class="small">教學進行中，完成後可出售或分解此裝備。</p>':''}<h3>鑲嵌孔 ${x.gems.filter(id=>id!==null).length}／${x.count}</h3><div class="equipment-socket-list">${slots||'<p class="small">此裝備沒有鑲嵌孔。</p>'}</div>${mode}${choices}<p class="small">點選孔位後選擇寶石。只有第一孔可切換技能／基礎數值；第二、第三孔固定加基礎數值。拆除與替換免費；出售或分解時，寶石會退回庫存。</p></section>`;
 }

 const attributeBase=globalThis.equipmentAttributeDetailsHTML;
 globalThis.equipmentAttributeDetailsHTML=function(g,...args){
  const html=attributeBase(g,...args),sk=!EmberwildTokens.isToken(g)&&S.byId(g?.skillId);
  if(!sk)return html;
  const h=party.members[0],active=h.activeSkillEquipmentId===g.id;
  return html+`<section class="equipment-skill-description"><h3>裝備技能${active?' · 已啟用':''}</h3><b class="equipment-skill-name">${esc(sk.name)} · ${labels[sk.type]}</b><p class="equipment-skill-effect">${esc(sk.description||detail(sk,h))}</p></section>`;
 };
 const detailBase=inventoryGearDetail;inventoryGearDetail=function(g){return detailBase(g)+sockets(g);};
 const slotBase=gearSlotHTML;gearSlotHTML=function(g,options){const html=slotBase(g,options);if(!g?.skillSockets)return html;const text=(g.skillId?'技能 · ':'')+g.skillSockets.gems.filter(x=>x!==null).length+'/'+g.skillSockets.count+' 孔';return html.replace(/(<\/button>)$/,`<small class="equipment-socket-badge">${esc(text)}</small>$1`);};
 globalThis.__EMBERWILD_SKILL_SYSTEM_UI={detail,sockets};
})();
