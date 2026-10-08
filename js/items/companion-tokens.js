/* Single companion slot, existing stat/loot/save paths, bounded combat events. */
(()=>{
  'use strict';
  const M=EmberwildTokens,copy=M.copy;
  let config=M.normalize(),context=null,extraDepth=0,preparingRound=false;
  const combat=new Map();
  const companion=h=>!!h&&h.companionId!==undefined;
  const item=h=>companion(h)?h.bag.find(g=>M.isToken(g)&&g.id===h.tokenId):null;
  function clear(h){if(h){combat.delete(memberKey(h));effects=effects.filter(e=>e.tokenOwner!==memberKey(h));}else{combat.clear();effects=effects.filter(e=>e.tokenOwner===undefined);}}
  function runtime(h){const key=memberKey(h);if(!combat.has(key))combat.set(key,{round:partyClock,started:false,count:0,used:0,next:0,target:null,hits:0});return combat.get(key);}
  const eventClock=()=>partyClock+(preparingRound?1:0);
  function ready(h,event){const g=item(h),a=g?.snapshot.ability;if(!a||a.event!==event||h.hp<=0)return null;const r=runtime(h);if(eventClock()<r.next||a.maxTriggers>0&&r.used>=a.maxTriggers)return null;if(a.chance<=0||Math.random()>=a.chance)return null;r.used++;r.next=eventClock()+a.cooldown;return {g,a,r};}
  function trigger(h,event,target=null){
    const hit=ready(h,event);if(!hit)return false;const {g,a}=hit,v=battleStats(h),before=h.hp;
    if(['attack','guard','critical','power'].includes(a.action)){
      effects=effects.filter(e=>!(e.tokenOwner===memberKey(h)&&e.tokenId===g.id));
      effects.push({source:heroKey(h),skill:-1,target:heroKey(h),kind:a.action,value:a.value,until:eventClock()+a.duration,name:g.snapshot.name,tokenOwner:memberKey(h),tokenId:g.id});
    }else if(a.action==='heal'){h.hp=Math.min(v.hp,h.hp+Math.round(v.hp*a.value));if(h.hp>before)recordCombatContribution(h,'healing',h.hp-before);}
    else if(a.action==='shield')applyPureShield(h,v.hp*a.value);
    else if(a.action==='extraDamage'&&target?.hp>0&&!extraDepth){
      extraDepth++;try{const dealt=resolveHit(target,v.atk*a.value,h,weaponElement(h),false,{tokenExtra:true});note(g.snapshot.name+'・追擊 → '+combatEnemyName(target)+' '+dealt+' 傷害','playerDamage');}finally{extraDepth--;}
    }
    note(characterName(h)+'・'+g.snapshot.name+' 觸發','playerAction');return true;
  }
  function ensureBattle(h){if(!companion(h)||h.hp<=0||!foes.some(e=>e.hp>0))return;const r=runtime(h);if(!r.started){r.started=true;r.round=eventClock();trigger(h,'battleStart');}}
  function afterDamage(h,e,before,after){
    if(!companion(h)||before<=0)return;if(after<=0){clear(h);return;}if(after>=before)return;
    ensureBattle(h);trigger(h,'receivedHit',e);const a=item(h)?.snapshot.ability;if(a?.event==='lowHealth'&&h.hp/stats(h).hp<=a.threshold)trigger(h,'lowHealth',e);
  }
  globalThis.EmberwildTokenRuntime={afterDamage};
  const baseResolve=resolveHit;
  resolveHit=function(e,amount,h,element,crit,options={}){
    if(!e||!h)return 0;ensureBattle(h);const before=e.hp,g=item(h),a=g?.snapshot.ability;
    if(!extraDepth&&a){
      if(a.event==='sameTarget'&&context?.kind==='basic'&&context.h===h){const r=runtime(h);if(r.target===e.id)r.hits++;else{r.target=e.id;r.hits=1;}if(r.hits>=a.threshold&&ready(h,'sameTarget'))amount*=1+a.value;}
      if(context?.h===h&&a.action==='damageBonus'&&a.event===(context.kind==='active'?'activeSkill':context.kind==='proc'?'procSkill':'')){if(context.bonus===undefined)context.bonus=!!ready(h,a.event);if(context.bonus)amount*=1+a.value;}
    }
    const dealt=baseResolve(e,amount,h,element,crit,options);
    if(!extraDepth&&companion(h)&&dealt>0){trigger(h,'damage',e);if(context?.kind==='basic'&&context.h===h)trigger(h,'basicHit',e);if(before>0&&e.hp<=0)trigger(h,'kill',e);}
    return dealt;
  };
  const baseBasic=performHeroBasic;
  performHeroBasic=function(h){ensureBattle(h);const previous=context;context={h,kind:'basic'};try{return baseBasic(h);}finally{context=previous;}};
  const baseCast=castPartySkill;
  castPartySkill=function(h,i,v){
    ensureBattle(h);const sk=CLASSES[h?.job]?.skills[i],previous=context;context={h,kind:sk?.[1]==='active'?'active':'proc'};
    try{
      const a=item(h)?.snapshot.ability,healing=['heal','shield','shieldLowest'].includes(sk?.[5]);let reserved=null;
      if(healing&&a?.action==='healingBonus'&&a.event===(context.kind==='active'?'activeSkill':'procSkill')){const r=runtime(h),before={used:r.used,next:r.next};if(ready(h,a.event)){reserved={r,before};v={...(v||battleStats(h)),atk:(v||battleStats(h)).atk*(1+a.value)};}}
      const out=baseCast(h,i,v);if(out!==false)trigger(h,'skillCast');else if(reserved)Object.assign(reserved.r,reserved.before);return out;
    }finally{context=previous;}
  };
  const baseRound=pacedRound;
  pacedRound=function*(){if(running&&!$('modal').open){preparingRound=true;try{for(const h of living()){ensureBattle(h);const r=companion(h)?runtime(h):null,a=item(h)?.snapshot.ability;if(r?.started&&a?.event==='round'&&eventClock()-r.round+1>=a.threshold)trigger(h,'round');}}finally{preparingRound=false;}}yield* baseRound();if(!foes.some(e=>e.hp>0)||!living().length)clear();};
  const baseReset=resetEncounter;
  resetEncounter=function(){clear();return baseReset();};
  function makeToken(id,quality=null){const d=config.catalog.find(x=>x.id===id);if(!d)return null;const q=quality??d.quality;const g={id:uid(),type:M.TYPE,tokenId:d.id,name:d.name,slot:4,job:0,tier:1,rar:q,plus:0,affix:[],locked:false,snapshot:copy(d),qualityMultipliers:copy(config.qualityMultipliers)};M.validateItem(g,RULES.enhanceMax);return g;}
  function addToken(g){ensureSharedGear();if(state.bag.length<RULES.bagCapacity)state.bag.push(g);else pendingGearLoot.push(g);note(`獲得 ${AFFIX_RANK[g.rar]} ${g.snapshot.name}${state.bag.includes(g)?'':'（待結算）'}`,'item');if(typeof addExpeditionLoot==='function')addExpeditionLoot(g.snapshot.name,1,g.rar);if(typeof addBattleStatDrop==='function')addBattleStatDrop(g.snapshot.name+' · '+AFFIX_RANK[g.rar],1);}
  function rollTokens(e,rng=Math.random){
    if(!e||e.__tokenDropRolled)return [];e.__tokenDropRolled=true;
    const d=config.drop;if(!M.eligible(d,e)||(monsterCatalogEntry(e.monsterId)?.maxDrops??e.maxDrops??99)===0)return [];
    const pool=config.catalog.filter(t=>M.eligible(t.drop,e));if(!pool.length)return [];
    const rule={chanceByDifficulty:d.chanceByDifficulty};if(rng()>=effectiveDropChance(rule,e))return [];
    const def=M.weighted(pool,pool.map(t=>t.drop.weight),rng),quality=M.weighted([0,1,2,3],d.qualityWeights,rng);if(!def||quality===null)return [];
    const g=makeToken(def.id,def.qualityFixed?def.quality:quality);addToken(g);return [g];
  }
  const baseDrops=rollConfiguredDrops;
  rollConfiguredDrops=function(e,rng=Math.random){const result=baseDrops(e,rng);rollTokens(e,rng);return result;};
  const basePack=packParty;
  packParty=function(){const d=basePack();d.companionEquipmentVersion=M.VERSION;for(const h of d.members){h.tokenId??=null;if(h.companionId!==undefined)h.equipped=Array(5).fill(null);}return d;};
  const baseLoad=loadParty;
  loadParty=function(data){const out=baseLoad(M.prepareSave(data,RULES.bagCapacity));syncTokens();for(const h of party.members.filter(companion))withHero(h,clampVitals);return out;};
  function syncTokens(){if(!party)return;for(const g of [...state.bag,...pendingGearLoot].filter(M.isToken)){const d=config.catalog.find(x=>x.id===g.tokenId);if(d){g.snapshot=copy(d);g.name=d.name;g.qualityMultipliers=copy(config.qualityMultipliers);}}}
  const baseValidate=validateBalanceConfig;
  validateBalanceConfig=function(input){const next=M.normalize(input?.companionTokens),out=baseValidate(input);for(const d of [next.drop,...next.catalog.map(x=>x.drop)])if(d.maps.some(i=>!out.balanceSettings.maps.catalog[i])||d.monsters.some(id=>!out.balanceSettings.monsters.catalog.some(m=>m.id===id)))throw Error('信物掉落指定了不存在的地圖或怪物');out.companionTokens=next;return out;};
  const baseExport=exportableBalance;
  exportableBalance=function(){const out=baseExport();out.companionTokens=copy(config);out.companions=out.companions.map(p=>{const d=EmberwildCompanions.definition(p,out.classes,out.balanceSettings);return {...p,...d,equipmentInternalized:1};});return out;};
  const baseApply=applyBalanceConfig;
  applyBalanceConfig=function(input,{persist=true}={}){const full=validateBalanceConfig(input),next=M.normalize(full.companionTokens),out=baseApply(full,{persist:false});config=next;syncTokens();clear();if(state){for(const h of party.members)withHero(h,clampVitals);save();render();}if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));return out;};
  const baseResetBalance=resetBalanceJSON;
  resetBalanceJSON=function(){const out=baseResetBalance();config=M.normalize();clear();if(state)render();return out;};
  function equipToken(id,key){
    const h=partyMember(key),g=findGear(id);if(!companion(h)||!M.isToken(g)||gearWearer(id)&&gearWearer(id)!==h)return false;
    if(foes.some(e=>e.hp>0))resetEncounter();const previous=h.tokenId,previousHp=h.hp;h.tokenId=id;clear(h);withHero(h,clampVitals);
    if(save()===false){h.tokenId=previous;h.hp=previousHp;return false;}render();return true;
  }
  function unequipToken(key){const h=partyMember(key);if(!companion(h))return false;if(foes.some(e=>e.hp>0))resetEncounter();const previous=h.tokenId,hp=h.hp;h.tokenId=null;clear(h);withHero(h,clampVitals);if(save()===false){h.tokenId=previous;h.hp=hp;return false;}render();return true;}
  globalThis.equipCompanionToken=equipToken;globalThis.unequipCompanionToken=unequipToken;
  const baseUnequip=unequipSharedGear;
  unequipSharedGear=function(id){const h=gearWearer(id);return M.isToken(findGear(id))?h&&unequipToken(memberKey(h)):baseUnequip(id);};
  const basePositions=gearEquipPositions,baseJobs=gearWearableJobs;
  gearEquipPositions=function(g){return M.isToken(g)?[]:basePositions(g);};gearWearableJobs=function(g){return M.isToken(g)?[]:baseJobs(g);};
  const baseFilter=filteredGear;
  filteredGear=function(){return baseFilter().filter(g=>!M.isToken(g));};
  const baseNameHTML=equipmentNameHTML,baseDisplay=equipmentDisplayName,baseDesc=gearDesc;
  equipmentDisplayName=function(g){return M.isToken(g)?`+${g.plus} ${g.snapshot.name}`:baseDisplay(g);};
  equipmentNameHTML=function(g){return M.isToken(g)?`<span class="effect-quality-${g.rar}">${esc(equipmentDisplayName(g))} · ${esc(AFFIX_RANK[g.rar])}信物</span>`:baseNameHTML(g);};
  gearDesc=function(g){return M.isToken(g)?M.effectsFor(g,GS('equipment.enhance.statPerLevel',.05)).map(equipmentIdentityEffectText).join(' / '):baseDesc(g);};
  for(const name of ['reroll','rerollGear','rerollAffix','autoReroll','rerollEquipmentPowerTier','setAffixLock','toggleAffixLock']){const base=globalThis[name];if(typeof base==='function')globalThis[name]=function(id,...args){if(M.isToken(findGear(id)))return toast('信物使用固定複合屬性');return base(id,...args);};}
  const baseEnhance=enhance;
  enhance=function(id){const h=gearWearer(id),out=baseEnhance(id);if(h)withHero(h,clampVitals);return out;};
  try{const saved=JSON.parse(localStorage.getItem(BALANCE_KEY)||'null');if(saved?.companionTokens)config=M.normalize(saved.companionTokens);}catch(e){console.warn('信物設定載入失敗',e);}
  globalThis.__EMBERWILD_TOKEN_TEST={makeToken,rollTokens,trigger,ensureBattle,clear,item,ready,get config(){return copy(config);},get combat(){return combat;}};
  // UI is below so all controls use the same validated mutations above.
  const eventNames={battleStart:'戰鬥開始',kill:'擊殺',receivedHit:'受到傷害',basicHit:'普攻命中',activeSkill:'主動技能',procSkill:'觸發技能',skillCast:'施放技能後',sameTarget:'連續普攻同一目標',lowHealth:'低血量受擊',damage:'造成傷害',round:'戰鬥回合'};
  const actionNames={attack:'攻擊增益',guard:'減傷增益',critical:'暴擊增益',power:'技能威力增益',heal:'回復生命上限比例',shield:'生命上限比例護盾',extraDamage:'攻擊倍率追擊',damageBonus:'傷害增幅',healingBonus:'治療／護盾增幅'};
  function abilityText(g){const a=g.snapshot.ability;return `${eventNames[a.event]}${a.threshold?`（門檻 ${a.threshold}）`:''} → ${actionNames[a.action]} ${Number((a.value*100).toFixed(2))}% · 機率 ${a.chance*100}%${a.duration?' · '+a.duration+' 回合':''} · 冷卻 ${a.cooldown} 回合${a.maxTriggers?' · 每場最多 '+a.maxTriggers+' 次':''}`;}
  function detail(g){return `<b>${equipmentNameHTML(g)}</b><p>${esc(g.snapshot.description)}</p><p class="small">${esc(gearDesc(g))}</p><p class="token-special">${esc(abilityText(g))}</p>`;}
  function companionCards(){return `<section class="panel companion-token-panel"><h2>夥伴信物</h2><p class="small">夥伴依自身等級成長，只使用一件信物；後備與名冊夥伴保留穿戴。更換或卸下信物會放棄目前遭遇。</p><div class="token-grid">${party.members.filter(companion).map(h=>{const g=item(h);return `<article class="card token-slot" data-token-owner="${memberKey(h)}"><h3>${esc(characterName(h))} · ${esc(CLASSES[h.job].name)}</h3>${g?detail(g):'<p class="empty">未穿戴信物</p>'}<div class="actions"><button onclick="showCompanionTokens(${memberKey(h)})">更換信物</button>${g?`<button onclick="unequipCompanionToken(${memberKey(h)})">卸下</button><button onclick="openForge('${g.id}')">強化</button>`:''}</div></article>`;}).join('')||'<p>招募夥伴後即可使用信物。</p>'}</div></section>`;}
  globalThis.showCompanionTokens=function(key){const h=partyMember(key);if(!companion(h))return;const current=item(h);$('modal').innerHTML=`<h2>${esc(characterName(h))} · 信物管理</h2>${current?detail(current):'<p>目前未穿戴信物</p>'}<div class="token-grid">${state.bag.filter(g=>M.isToken(g)&&(!gearWearer(g.id)||gearWearer(g.id)===h)).map(g=>`<article class="card">${detail(g)}${comparison(h,g)}<button data-token-id="${g.id}" onclick="equipCompanionToken('${g.id}',${key});closeModal()" ${g===current?'disabled':''}>${g===current?'已穿戴':'穿戴'}</button></article>`).join('')||'<p>背包目前沒有可穿戴的信物。</p>'}</div><button onclick="closeModal()">關閉</button>`;$('modal').showModal();};
  function comparison(h,g){const before=stats(h),after=stats({...h,tokenId:g.id});return `<p class="small">換裝比較：${['hp','atk','def','crit','critDamage','speed','pierce','defenseIgnore','lifesteal','evasion'].filter(k=>before[k]!==after[k]).map(k=>`${({hp:'HP',atk:'攻擊',def:'防禦',crit:'暴擊',critDamage:'暴傷',speed:'速度',pierce:'穿透',defenseIgnore:'無視',lifesteal:'竊取',evasion:'閃避'})[k]} ${Number(before[k].toFixed(3))} → ${Number(after[k].toFixed(3))}`).join(' / ')||'面板相同，請比較特殊效果'}</p>`;}
  let tokenSort='quality';
  function tokenInventory(){const list=state.bag.filter(M.isToken).sort((a,b)=>tokenSort==='name'?a.snapshot.name.localeCompare(b.snapshot.name):tokenSort==='enhance'?b.plus-a.plus:b.rar-a.rar||b.plus-a.plus);return heading('COMPANION TOKENS / 共用背包','夥伴信物')+`<div class="actions"><label>排序 <select onchange="setTokenSort(this.value)"><option value="quality" ${tokenSort==='quality'?'selected':''}>品質</option><option value="enhance" ${tokenSort==='enhance'?'selected':''}>強化</option><option value="name" ${tokenSort==='name'?'selected':''}>名稱</option></select></label><span>背包 ${state.bag.length} / ${RULES.bagCapacity}</span></div><div class="token-grid">${list.map(g=>{const h=gearWearer(g.id);return `<article class="card">${detail(g)}<p>穿戴者：${h?esc(characterName(h)):'無'}</p><div class="actions"><select id="token-target-${g.id}" aria-label="信物穿戴對象">${party.members.filter(companion).map(x=>`<option value="${memberKey(x)}">${esc(characterName(x))}</option>`).join('')}</select><button onclick="equipCompanionToken('${g.id}',Number(document.getElementById('token-target-${g.id}').value))" ${h?'disabled':''}>穿戴</button>${h?`<button onclick="unequipCompanionToken(${memberKey(h)})">卸下</button>`:''}<button onclick="toggleGearLock('${g.id}')">${g.locked?'解鎖':'鎖定'}</button><button onclick="openForge('${g.id}')">強化</button><button onclick="salvage('${g.id}')" ${h||g.locked?'disabled':''}>分解</button></div></article>`;}).join('')||'<p class="empty">尚未取得信物；正常戰鬥有獨立掉落機會。</p>'}</div>`;}
  globalThis.setTokenSort=value=>{tokenSort=value;render();};
  const baseTabs=inventoryTabs;
  inventoryTabs=function(){return baseTabs().replace('</div>',`<button onclick="setInventoryCategory('tokens')" class="${inventoryCategory==='tokens'?'primary':''}">信物</button></div>`);};
  const baseCategory=setInventoryCategory;
  setInventoryCategory=function(value){if(value==='tokens'){inventoryCategory=value;render();return;}return baseCategory(value);};
  const baseInventory=equipmentView;
  equipmentView=function(){return inventoryCategory==='tokens'?inventoryTabs()+`<div class="companion-management-page">${pendingGearLootView()+tokenInventory()}</div>`:baseInventory();};
  const baseWorn=wornEquipmentView;
  wornEquipmentView=function(){pageHeroSelection.set('worn',memberKey(party.members[0]));return `<div class="companion-management-page worn-token-page">${baseWorn()+companionCards()}</div>`;};
  for(const name of ['rosterView','partnerRosterView']){const base=globalThis[name];globalThis[name]=function(){return `<div class="companion-management-page">${base()}</div>`;};}
  const baseForge=openForge;
  openForge=function(id){const g=findGear(id);if(!M.isToken(g))return baseForge(id);$('modal').innerHTML=`<h2>信物強化</h2>${detail(g)}<p>每級屬性 +${GS('equipment.enhance.statPerLevel',.05)*100}%；特殊能力保持原參數。</p><p>${esc(upgradeCostText(g))}</p><div class="actions"><button onclick="enhance('${g.id}');closeModal();openForge('${g.id}')" ${g.plus>=RULES.enhanceMax||!canEnhance(g)?'disabled':''}>強化</button><button onclick="closeModal()">關閉</button></div>`;$('modal').showModal();};
  globalThis.__EMBERWILD_TOKEN_READY=true;
  if(state&&party){syncTokens();for(const h of party.members.filter(companion)){h.equipped=Array(5).fill(null);h.tokenId??=null;withHero(h,clampVitals);}render();}
})();
