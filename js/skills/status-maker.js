
(()=>{
/* STATUS_PURE_START */
const STATUS_SCHEMA_VERSION=1;
const STATUS_TAGS=['periodic','control','modifier','instant'];
const STATUS_MODIFIER_KINDS=['attack','critical','guard','fracture','power','weaken','vulnerable','damageAmp','regen','followup'];
const STATUS_CONTROL_KINDS=['polymorph','freeze','frost','rage','fear','tauntRage'];
const STATUS_PERIODIC_KINDS=['damage','heal'];
const STATUS_BASIS=['fixed','casterAttack','casterMaxHp','casterCurrentHp','casterMissingHp','casterDefense','casterShield','casterLevel','targetAttack','targetMaxHp','targetCurrentHp','targetMissingHp','targetDefense','targetShield','targetLevel'];
const STATUS_DAMAGE_RESOLUTIONS=['fixed','defended','elemental','true'];
const STATUS_HEAL_RESOLUTIONS=['heal','overflowShield'];
const STATUS_ELEMENTS=['physical','fire','ice','wind','light','shadow'];
function statusNum(v,fallback=0){v=Number(v);return Number.isFinite(v)?v:fallback;}
function statusInt(v,fallback=0,min=0,max=99){return Math.max(min,Math.min(max,Math.round(statusNum(v,fallback))));}
function statusClamp01(v,fallback=0){return Math.max(0,Math.min(1,statusNum(v,fallback)));}
function normalizeStatusDefinition(raw,index=0){
  raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const tags=[...new Set((Array.isArray(raw.tags)?raw.tags:[]).filter(x=>STATUS_TAGS.includes(x)))];
  const modifiers=tags.includes('modifier')?(Array.isArray(raw.modifiers)?raw.modifiers:[]).slice(0,3).map(x=>({kind:STATUS_MODIFIER_KINDS.includes(x?.kind)?x.kind:'attack',value:statusNum(x?.value,0),element:STATUS_ELEMENTS.includes(x?.element)?x.element:'physical'})):[];
  let control=null;
  if(tags.includes('control')&&raw.control&&STATUS_CONTROL_KINDS.includes(raw.control.kind)){
    control={
      kind:raw.control.kind,
      bossDuration:statusInt(raw.control.bossDuration,Math.min(statusInt(raw.duration,1,1,99),1),0,99),
      slowPct:statusClamp01(raw.control.slowPct,.30),
      basicAttackBonus:statusClamp01(raw.control.basicAttackBonus,.20),
      damageReduction:statusClamp01(raw.control.damageReduction,.20),
      skipChance:statusClamp01(raw.control.skipChance,.30),
      bossSkipChance:statusClamp01(raw.control.bossSkipChance,.15)
    };
  }
  const periodic=tags.includes('periodic')?(Array.isArray(raw.periodic)?raw.periodic:[]).slice(0,3).map(x=>{
    const kind=STATUS_PERIODIC_KINDS.includes(x?.kind)?x.kind:'damage';
    const allowed=kind==='heal'?STATUS_HEAL_RESOLUTIONS:STATUS_DAMAGE_RESOLUTIONS;
    return {kind,basis:STATUS_BASIS.includes(x?.basis)?x.basis:'casterAttack',coefficient:Math.max(0,statusNum(x?.coefficient,0)),resolution:allowed.includes(x?.resolution)?x.resolution:allowed[0],element:STATUS_ELEMENTS.includes(x?.element)?x.element:'physical'};
  }):[];
  return {id:String(raw.id||('status-'+(index+1))).trim()||('status-'+(index+1)),name:String(raw.name||'未命名狀態').trim()||'未命名狀態',tags,duration:statusInt(raw.duration,1,1,99),modifiers,control,periodic};
}
function validateStatusDefinition(raw){
  const s=normalizeStatusDefinition(raw),issues=[];
  if(!s.id)issues.push('缺少狀態 ID');
  if(!s.name)issues.push('缺少狀態名稱');
  if(!Number.isInteger(s.duration)||s.duration<1||s.duration>99)issues.push('持續回合必須介於 1～99');
  if(s.modifiers.length>3)issues.push('增減益最多三種');
  if(s.periodic.length>3)issues.push('持續傷害／恢復最多三種');
  if(s.control&&!STATUS_CONTROL_KINDS.includes(s.control.kind))issues.push('控制類型無效');
  for(const fx of s.periodic){if(!STATUS_BASIS.includes(fx.basis)||fx.coefficient<0)issues.push('持續效果係數設定無效');}
  return issues;
}
function statusPureSelfTest(){
  const samples=[
    {id:'cap-test',name:'上限測試',tags:['modifier','control','periodic','instant'],duration:150,modifiers:[{kind:'attack',value:.1},{kind:'guard',value:.2},{kind:'critical',value:.3},{kind:'power',value:.4}],control:{kind:'freeze',bossDuration:2},periodic:[{kind:'damage',basis:'casterAttack',coefficient:.2,resolution:'fixed'},{kind:'damage',basis:'targetMaxHp',coefficient:.05,resolution:'elemental',element:'fire'},{kind:'heal',basis:'targetMissingHp',coefficient:.3,resolution:'overflowShield'},{kind:'heal',basis:'fixed',coefficient:5,resolution:'heal'}]},
    {id:'dot',name:'灼燒',tags:['periodic'],duration:3,periodic:[{kind:'damage',basis:'casterAttack',coefficient:.25,resolution:'defended',element:'fire'}]},
    {id:'hot',name:'再生',tags:['periodic','instant'],duration:4,periodic:[{kind:'heal',basis:'targetMaxHp',coefficient:.05,resolution:'heal'}]},
    {id:'cc',name:'冰封',tags:['control'],duration:2,control:{kind:'freeze',bossDuration:1}}
  ];
  const normalized=samples.map(normalizeStatusDefinition),issues=normalized.flatMap(validateStatusDefinition);
  return {schema:STATUS_SCHEMA_VERSION,ok:issues.length===0&&normalized[0].duration===99&&normalized[0].modifiers.length===3&&normalized[0].periodic.length===3,issues,summary:normalized.map(s=>({id:s.id,duration:s.duration,tags:s.tags,modifiers:s.modifiers.length,control:s.control?.kind||null,periodic:s.periodic.length}))};
}
/* STATUS_PURE_END */

const STATUS_TARGETS=['enemy','enemies','self','weakest','allies'];
const STATUS_TARGET_LABELS={enemy:'目前敵人',enemies:'敵方全體',self:'自己',weakest:'生命比例最低隊友',allies:'我方全體'};
const STATUS_HERO_ONLY_MODIFIERS=new Set(['attack','critical','guard','power','regen']);
const STATUS_ENEMY_ONLY_MODIFIERS=new Set(['fracture','weaken','vulnerable','damageAmp','followup']);
function statusAllowedTargetsForDefinition(def){
  if(!def)return STATUS_TARGETS.slice();
  const heroOnly=def.modifiers.some(m=>STATUS_HERO_ONLY_MODIFIERS.has(m.kind))||def.periodic.some(fx=>fx.kind==='heal'&&fx.resolution==='overflowShield'),enemyOnly=!!def.control||def.modifiers.some(m=>STATUS_ENEMY_ONLY_MODIFIERS.has(m.kind));
  if(heroOnly&&enemyOnly)return [];
  if(heroOnly)return ['self','weakest','allies'];
  if(enemyOnly)return ['enemy','enemies'];
  return STATUS_TARGETS.slice();
}
let statusDefinitions=[];
let activeStatuses=[];
let lastStatusTickClock=-1;
const deepClone=v=>JSON.parse(JSON.stringify(v));
const normalizeStatusList=list=>Array.isArray(list)?list.map((x,i)=>normalizeStatusDefinition(x,i)):[];
function statusById(id){return statusDefinitions.find(x=>x.id===id)||null;}
function statusTargetKey(target){return target&&Object.prototype.hasOwnProperty.call(target,'job')?heroKey(target):target?.id||null;}
function statusTargetByKey(key){if(!key)return null;if(String(key).startsWith('hero-'))return party?.members?.find(h=>heroKey(h)===key)||null;return foes?.find(e=>e.id===key)||null;}
function statusIsHero(target){return !!target&&Object.prototype.hasOwnProperty.call(target,'job');}
function statusMaxHp(target){return statusIsHero(target)?Math.max(1,Number(stats(target).hp)||1):Math.max(1,Number(target?.maxhp??target?.maxHp??target?.hp)||1);}
function statusAttack(target){return statusIsHero(target)?Math.max(0,Number(battleStats(target).atk)||0):Math.max(0,Number(target?.atk)||0);}
function statusDefense(target){return statusIsHero(target)?Math.max(0,Number(battleStats(target).def)||0):Math.max(0,Number(target?.def)||0);}
function statusBasisValue(kind,source,target){
  const who=kind.startsWith('caster')?source:target,suffix=kind.replace(/^caster|^target/,'');
  if(kind==='fixed')return 1;if(!who)return 0;
  if(suffix==='Attack')return statusAttack(who);
  if(suffix==='MaxHp')return statusMaxHp(who);
  if(suffix==='CurrentHp')return Math.max(0,Number(who.hp)||0);
  if(suffix==='MissingHp')return Math.max(0,statusMaxHp(who)-(Number(who.hp)||0));
  if(suffix==='Defense')return statusDefense(who);
  if(suffix==='Shield')return Math.max(0,Number(who.shield)||0);
  if(suffix==='Level')return Math.max(1,Number(who.lv)||1);
  return 0;
}
function statusApplyShieldAwareDamage(target,amount,bypassShield=false){
  amount=Math.max(0,Math.round(amount));if(amount<=0)return 0;
  const before=Math.max(0,Number(target.hp)||0);let hpDamage=amount;
  if(!bypassShield&&statusIsHero(target)){
    const absorb=Math.min(Math.max(0,Number(target.shield)||0),amount);target.shield=Math.max(0,(Number(target.shield)||0)-absorb);hpDamage=Math.max(0,amount-absorb);if(absorb>0&&typeof recordCombatContribution==='function')recordCombatContribution(target,'mitigation',absorb);
  }else if(!bypassShield&&!statusIsHero(target)){
    const api=globalThis.__EMBERWILD_CONTROL_TEST_API,p=api?.states?.[target.id]?.polymorph;
    if(p?.shield>0){const absorb=Math.min(p.shield,amount);p.shield=Math.max(0,p.shield-absorb);hpDamage=Math.max(0,amount-absorb);if(p.shield<=0){delete api.states[target.id].polymorph;note(combatEnemyName(target)+' 的變形護盾被持續效果打破，變形解除。');}}
  }
  target.hp=Math.max(0,before-hpDamage);return Math.max(0,before-target.hp);
}
function statusDamageAmount(raw,source,target,fx){
  const formula=GAMEPLAY_SETTINGS?.combat?.damageFormula||{},attackCoefficient=Number.isFinite(formula.attackCoefficient)?formula.attackCoefficient:1,defenseCoefficient=Number.isFinite(formula.defenseCoefficient)?formula.defenseCoefficient:(GAMEPLAY_SETTINGS?.combat?.defenseEffectiveness??.55),minimumDamage=Math.max(0,Number.isFinite(formula.minimumDamage)?formula.minimumDamage:1);
  if(fx.resolution==='fixed'||fx.resolution==='true')return Math.max(0,Math.round(raw));
  let defense=statusDefense(target);
  if(!statusIsHero(target)){
    const sourceStats=statusIsHero(source)?battleStats(source):source||{},fractureCap=GAMEPLAY_SETTINGS?.combat?.caps?.fracture??.75,fracture=Math.min(fractureCap,effectTotal(target.id,'fracture')),ignore=Math.min(GAME_BALANCE?.combat?.statCaps?.defenseIgnore??.75,Math.max(0,Number(sourceStats?.defenseIgnore)||0)),pierce=Math.min(GAME_BALANCE?.combat?.statCaps?.pierce??10000,Math.max(0,Number(sourceStats?.pierce)||0));
    defense=Math.max(0,target.def*(1-fracture)*(1-ignore)-pierce);
  }
  let out=Math.max(minimumDamage,Math.round(raw*attackCoefficient-defense*defenseCoefficient));
  if(statusIsHero(target))out=Math.max(minimumDamage,Math.round(out*(1-Math.min(GAMEPLAY_SETTINGS?.combat?.caps?.guard??.75,effectTotal(heroKey(target),'guard')))));
  else out=Math.max(minimumDamage,Math.round(out*(1+effectTotal(target.id,'damageAmp')+effectTotal(target.id,'vulnerable'))));
  if(fx.resolution==='elemental'){
    if(statusIsHero(target)){
      const v=battleStats(target),resist=Math.min(GAMEPLAY_SETTINGS?.combat?.caps?.resistance??.75,Math.max(0,Number(v.resist?.[fx.element])||0));out=Math.max(minimumDamage,Math.round(out*(1-resist)));
    }else{
      const v=statusIsHero(source)?battleStats(source):source||{},bonus=(v.elementDamage?.[fx.element]||0)+(fx.element==='physical'?0:(v.elementBonus||0));out=Math.max(minimumDamage,Math.round(out*elementFactor(fx.element,target.element)*(1+bonus)*(1+(v.raceDamage?.[target.race]||0))));
    }
  }
  return out;
}
function executeStatusPeriodic(inst,fx,immediate=false){
  const source=party?.members?.find(h=>h.job===inst.sourceJob)||null,target=statusTargetByKey(inst.targetKey);if(!target||target.hp<=0)return 0;
  const raw=Math.max(0,statusBasisValue(fx.basis,source,target)*fx.coefficient),prefix=immediate?'立即':'持續';
  if(fx.kind==='heal'){
    const max=statusMaxHp(target),before=target.hp;target.hp=Math.min(max,target.hp+Math.max(0,Math.round(raw)));let healed=Math.max(0,target.hp-before);
    if(fx.resolution==='overflowShield'&&raw>healed){const overflow=Math.max(0,Math.round(raw-healed));target.shield=Math.max(Number(target.shield)||0,overflow);}
    if(healed>0&&source&&typeof recordCombatContribution==='function')recordCombatContribution(source,'healing',healed);
    if(healed>0||fx.resolution==='overflowShield')note(inst.name+'・'+prefix+'恢復 → '+(statusIsHero(target)?characterName(target):combatEnemyName(target))+' '+healed+' 生命');
    return healed;
  }
  const amount=statusDamageAmount(raw,source,target,fx),dealt=statusApplyShieldAwareDamage(target,amount,fx.resolution==='true');
  if(dealt>0&&source&&typeof recordCombatContribution==='function')recordCombatContribution(source,'damage',dealt);
  if(dealt>0)note(inst.name+'・'+prefix+'傷害 → '+(statusIsHero(target)?characterName(target):combatEnemyName(target))+' '+dealt+' 傷害');
  return dealt;
}
function applyStatusControl(def,target,source){
  const c=def.control,api=globalThis.__EMBERWILD_CONTROL_TEST_API;if(!c||!api||statusIsHero(target))return;
  const meta={duration:def.duration,bossDuration:c.bossDuration,slowPct:c.slowPct,basicAttackBonus:c.basicAttackBonus,damageReduction:c.damageReduction,skipChance:c.skipChance,bossSkipChance:c.bossSkipChance};
  if(c.kind==='polymorph')api.applyPolymorph(target,Math.max(1,statusAttack(source)),meta);
  else if(c.kind==='freeze')api.applyFreeze(target,meta);
  else if(c.kind==='rage')api.applyRage(target,meta,null);
  else if(c.kind==='fear')api.applyFear(target,meta);
  else if(c.kind==='tauntRage')api.applyRage(target,meta,source?.job??null);
  // frost is handled by combatSpeed wrapper below so it expires with the custom status itself.
}
function applyCustomStatus(defOrId,source,target){
  const def=typeof defOrId==='string'?statusById(defOrId):normalizeStatusDefinition(defOrId);if(!def||!target||target.hp<=0)return false;
  const targetKey=statusTargetKey(target),sourceJob=Number.isInteger(source?.job)?source.job:null;if(!targetKey)return false;
  activeStatuses=activeStatuses.filter(x=>!(x.statusId===def.id&&x.sourceJob===sourceJob&&x.targetKey===targetKey));
  const inst={id:def.id+'@'+String(sourceJob)+'@'+targetKey,statusId:def.id,name:def.name,sourceJob,targetKey,appliedClock:partyClock,duration:def.duration,expiresClock:partyClock+def.duration,definition:deepClone(def)};
  activeStatuses.push(inst);applyStatusControl(def,target,source);
  const regenRate=def.modifiers.filter(m=>m.kind==='regen').reduce((sum,m)=>sum+Math.max(0,Number(m.value)||0),0);
  if(regenRate>0&&statusIsHero(target)){
    const max=statusMaxHp(target),before=target.hp;target.hp=Math.min(max,target.hp+max*regenRate);const healed=Math.max(0,target.hp-before);
    if(healed>0&&source&&typeof recordCombatContribution==='function')recordCombatContribution(source,'healing',healed);
    if(healed>0)note(def.name+'・再生 → '+characterName(target)+' '+Math.round(healed)+' 生命');
  }
  if(def.tags.includes('instant'))for(const fx of def.periodic)executeStatusPeriodic(inst,fx,true);
  note((source?characterName(source)+' → ':'')+(statusIsHero(target)?characterName(target):combatEnemyName(target))+' 獲得狀態「'+def.name+'」· '+def.duration+' 回合');
  return true;
}
function tickCustomStatuses(){
  if(lastStatusTickClock===partyClock)return;lastStatusTickClock=partyClock;
  const keep=[];
  for(const inst of activeStatuses){
    const target=statusTargetByKey(inst.targetKey),elapsed=partyClock-inst.appliedClock;if(!target||target.hp<=0)continue;
    if(elapsed>0&&elapsed<=inst.duration)for(const fx of inst.definition.periodic)executeStatusPeriodic(inst,fx,false);
    if(elapsed<inst.duration)keep.push(inst);
  }
  activeStatuses=keep;
}
function statusTargetsForSkill(h,meta){
  const mode=STATUS_TARGETS.includes(meta?.statusTarget)?meta.statusTarget:'enemy';
  if(mode==='self')return [h];if(mode==='allies')return living();if(mode==='weakest'){const xs=[...living()].sort((a,b)=>a.hp/statusMaxHp(a)-b.hp/statusMaxHp(b));return xs.length?[xs[0]]:[];}if(mode==='enemies')return foes.filter(e=>e.hp>0);const e=foes.find(enemyAvailableForSingleTarget);return e?[e]:[];
}
function customStatusSummary(def){
  if(!def)return '未指定狀態';const bits=[];
  if(def.modifiers.length)bits.push(def.modifiers.map(x=>x.kind+' '+Number((x.value*100).toFixed(2))+'%'+(x.kind==='followup'?' '+x.element:'' )).join('、'));
  if(def.control)bits.push('控制 '+def.control.kind);
  if(def.periodic.length)bits.push(def.periodic.map(x=>(x.kind==='heal'?'恢復':'傷害')+' '+x.basis+'×'+x.coefficient+' / '+x.resolution).join('、'));
  if(def.tags.includes('instant'))bits.push('套用時立即結算持續效果 1 次');return bits.join('；')||'純標記狀態';
}
function customStatusTooltip(def){
 if(!def)return '狀態效果';
 const pct=v=>Number((Math.max(0,Number(v)||0)*100).toFixed(1))+'%';
 const modifierLabels={attack:'攻擊增加',critical:'暴擊率增加',guard:'受到傷害減少',fracture:'防禦降低',power:'技能效果增加',weaken:'攻擊降低',vulnerable:'承受傷害增加',damageAmp:'承受傷害增加',regen:'每回合恢復最大生命'};
 const basisLabels={fixed:'固定值',casterAttack:'施術者攻擊',casterMaxHp:'施術者最大生命',casterCurrentHp:'施術者目前生命',casterMissingHp:'施術者已損生命',casterDefense:'施術者防禦',casterShield:'施術者護盾',casterLevel:'施術者等級',targetAttack:'目標攻擊',targetMaxHp:'目標最大生命',targetCurrentHp:'目標目前生命',targetMissingHp:'目標已損生命',targetDefense:'目標防禦',targetShield:'目標護盾',targetLevel:'目標等級'};
 const resolutionLabels={fixed:'固定傷害',defended:'受防禦減免',elemental:'屬性傷害',true:'真實傷害',heal:'治療',overflowShield:'溢出轉護盾'};
 const bits=[];
 for(const m of def.modifiers||[]){
  if(m.kind==='followup')bits.push('受到攻擊時追加 '+(ELEMENTS[m.element]||m.element||'無')+'屬性追打，倍率 '+pct(m.value));
  else bits.push((modifierLabels[m.kind]||m.kind)+' '+pct(m.value));
 }
 const c=def.control;
 if(c){
  if(c.kind==='polymorph')bits.push('無法行動且不會成為單體目標，護盾被打破時消失；BOSS 無效');
  else if(c.kind==='freeze')bits.push('無法行動'+(Number.isFinite(c.bossDuration)?'；BOSS 持續 '+c.bossDuration+' 回合':''));
  else if(c.kind==='frost')bits.push('速度降低 '+pct(c.slowPct));
  else if(c.kind==='rage')bits.push('無法使用技能，普攻傷害增加 '+pct(c.basicAttackBonus));
  else if(c.kind==='fear')bits.push('傷害降低 '+pct(c.damageReduction)+'，每回合 '+pct(c.skipChance)+' 機率無法行動'+(Number.isFinite(c.bossSkipChance)?'（BOSS '+pct(c.bossSkipChance)+'）':''));
  else if(c.kind==='tauntRage')bits.push('優先攻擊施術者，無法使用技能，普攻傷害增加 '+pct(c.basicAttackBonus));
 }
 for(const fx of def.periodic||[]){
  const basis=basisLabels[fx.basis]||fx.basis,coef=Number(fx.coefficient)||0,amount=fx.basis==='fixed'?String(coef):basis+' × '+Number(coef.toFixed(3));
  bits.push('每回合'+(fx.kind==='heal'?'恢復 ':'造成 ')+amount+(fx.kind==='damage'&&fx.element?' '+(ELEMENTS[fx.element]||fx.element)+'屬性':'')+'（'+(resolutionLabels[fx.resolution]||fx.resolution)+'）');
 }
 if(def.tags?.includes('instant')&&def.periodic?.length)bits.push('套用時立即結算持續效果 1 次');
 return bits.join('；')||'狀態效果';
}

function triggerCustomStatusFollowups(target){
  if(!target||target.hp<=0)return 0;let total=0;
  const entries=[];
  for(const inst of activeStatuses.filter(x=>x.targetKey===target.id&&partyClock<x.expiresClock)){
    for(const m of inst.definition.modifiers)if(m.kind==='followup')entries.push({inst,m});
  }
  for(const {inst,m} of entries){
    if(target.hp<=0)break;
    const caster=party?.members?.find(h=>h.job===inst.sourceJob);if(!caster)continue;
    const v=battleStats(caster),formula=GAMEPLAY_SETTINGS?.combat?.damageFormula||{},attackCoefficient=Number.isFinite(formula.attackCoefficient)?formula.attackCoefficient:1,defenseCoefficient=Number.isFinite(formula.defenseCoefficient)?formula.defenseCoefficient:(GAMEPLAY_SETTINGS?.combat?.defenseEffectiveness??.55),minimumDamage=Math.max(0,Number.isFinite(formula.minimumDamage)?formula.minimumDamage:1);
    const fracture=Math.min(GAMEPLAY_SETTINGS?.combat?.caps?.fracture??.75,effectTotal(target.id,'fracture')),ignore=Math.min(GAME_BALANCE?.combat?.statCaps?.defenseIgnore??.75,Math.max(0,Number(v.defenseIgnore)||0)),penetration=Math.min(GAME_BALANCE?.combat?.statCaps?.pierce??10000,Math.max(0,Number(v.pierce)||0));
    const effectiveDefense=Math.max(0,Math.max(0,Number(target.def)||0)*(1-fracture)*(1-ignore)-penetration);
    let amount=Math.max(minimumDamage,Math.round(statusAttack(caster)*Math.max(0,m.value)*attackCoefficient-effectiveDefense*defenseCoefficient));
    const crit=Math.random()<Math.max(0,Math.min(GAME_BALANCE?.combat?.statCaps?.crit??1,Number(v.crit)||0));if(crit)amount=Math.round(amount*Math.max(1,Number(v.critDamage)||1));
    amount=Math.max(minimumDamage,Math.round(amount*elementFactor(m.element||'physical',target.element)*(1-Math.min(GAMEPLAY_SETTINGS?.combat?.caps?.guard??.75,effectTotal(target.id,'guard')))));
    const dealt=statusApplyShieldAwareDamage(target,amount,false);if(dealt>0&&typeof recordCombatContribution==='function')recordCombatContribution(caster,'damage',dealt);total+=dealt;
    if(dealt>0)note(inst.name+'・受擊追打 ['+((typeof ELEMENTS==='object'&&ELEMENTS[m.element])||m.element||'physical')+'] → '+combatEnemyName(target)+' '+dealt+' 傷害'+(crit?'（暴擊）':''));
  }
  return total;
}
const statusResolveHitBase=resolveHit;
resolveHit=function(e,amount,h,element,crit,options={}){const dealt=statusResolveHitBase(e,amount,h,element,crit,options);if(dealt>0&&e?.hp>0)triggerCustomStatusFollowups(e);return dealt;};

// Add custom status modifiers to the same aggregation path used by existing buffs/debuffs.
const statusEffectTotalBase=effectTotal;
effectTotal=function(target,kind){return statusEffectTotalBase(target,kind)+activeStatuses.filter(x=>x.targetKey===target&&partyClock<x.expiresClock).reduce((sum,x)=>sum+x.definition.modifiers.filter(m=>m.kind===kind).reduce((n,m)=>n+m.value,0),0);};
const statusCombatSpeedBase=combatSpeed;
combatSpeed=function(e){let v=statusCombatSpeedBase(e);const frost=activeStatuses.some(x=>x.targetKey===e?.id&&partyClock<x.expiresClock&&x.definition.control?.kind==='frost');if(frost){const slow=Math.max(...activeStatuses.filter(x=>x.targetKey===e?.id&&partyClock<x.expiresClock&&x.definition.control?.kind==='frost').map(x=>x.definition.control.slowPct||.30));v=Math.max(1,Math.round(v*(1-Math.min(.95,slow))));}return v;};
const statusInitiativeBase=initiativeOrder;
initiativeOrder=function(){tickCustomStatuses();return statusInitiativeBase();};

const statusCastBase=castPartySkill;
castPartySkill=function(h,i,v){
  const sk=CLASSES[h.job]?.skills?.[i],meta=sk?.[6];if(!sk||sk[5]!=='applyStatus')return statusCastBase(h,i,v);
  const def=statusById(meta?.statusId);if(!def||!statusAllowedTargetsForDefinition(def).includes(meta?.statusTarget||'enemy'))return false;const targets=statusTargetsForSkill(h,meta);if(!targets.length)return false;
  let success=false;for(const target of targets)success=applyCustomStatus(def,h,target)||success;
  if(success&&h.sockets?.[i]===2&&sk[1]==='active'){const pv=v||battleStats(h),before=h.hp;h.hp=Math.min(pv.hp,h.hp+Math.round(pv.atk*GS('skills.gems.hybridActiveHealAttack',.10)));const recovered=Math.max(0,h.hp-before);if(recovered>0&&typeof recordCombatContribution==='function')recordCombatContribution(h,'healing',recovered);}
  if(success&&meta?.mastery&&typeof gainMastery==='function')gainMastery(h,meta.mastery,masterySettings().skillUseXp);
  return success;
};
const statusCoreDetailBase=coreSkillDetail;
coreSkillDetail=function(job,i,h=state){const sk=CLASSES[job]?.skills?.[i];if(sk?.[5]!=='applyStatus')return statusCoreDetailBase(job,i,h);const def=statusById(sk[6]?.statusId),target=STATUS_TARGET_LABELS[sk[6]?.statusTarget]||STATUS_TARGET_LABELS.enemy;return '套用狀態：'+(def?.name||'未指定')+' · 目標 '+target+' · '+(def?def.duration+' 回合 · '+customStatusSummary(def):'請在平衡設計器指定狀態');};

if(typeof effectBadges==='function'){
  const statusBadgesBase=effectBadges;
  effectBadges=function(key){let html=statusBadgesBase(key);for(const x of activeStatuses.filter(s=>s.targetKey===key&&partyClock<s.expiresClock)){const left=Math.max(0,x.expiresClock-partyClock);html+=combatStatusBadge(x.name,left,customStatusTooltip(x.definition));}return html;};
}
if(typeof battleBuffRows==='function'){
  const statusRowsBase=battleBuffRows;
  battleBuffRows=function(){const rows=activeStatuses.filter(x=>partyClock<x.expiresClock).map(x=>{const t=statusTargetByKey(x.targetKey),left=Math.max(0,x.expiresClock-partyClock);return '<tr><td>'+esc(t?(statusIsHero(t)?characterName(t):t.name):x.targetKey)+'</td><td>'+esc(x.name)+'</td><td>'+esc(customStatusSummary(x.definition))+'</td><td class="buff-time">'+left+' / '+x.duration+' 回合</td><td>自訂狀態</td></tr>';});const base=statusRowsBase();return rows.length?rows.join('')+(base.includes('no-buffs')?'':base):base;};
}

function attachStatusSkillExtras(raw){
  for(let job=0;job<(raw?.classes||[]).length;job++)for(let i=0;i<(raw.classes[job]?.skills||[]).length;i++){
    const src=raw.classes[job].skills[i],runtime=CLASSES[job]?.skills?.[i];if(!runtime||src?.effect!=='applyStatus')continue;runtime[6]??={};runtime[6].statusId=String(src.statusId||'');runtime[6].statusTarget=STATUS_TARGETS.includes(src.statusTarget)?src.statusTarget:'enemy';
  }
}
const statusValidateBase=validateBalanceConfig;
validateBalanceConfig=function(input){
  const out=statusValidateBase(input),defs=normalizeStatusList(input?.statusDefinitions),ids=new Set();
  for(const [i,d] of defs.entries()){const issues=validateStatusDefinition(d);if(issues.length)throw Error('自訂狀態 '+(i+1)+' 無效：'+issues.join('、'));if(ids.has(d.id))throw Error('自訂狀態 ID 重複：'+d.id);ids.add(d.id);}
  for(const [job,c] of (input?.classes||[]).entries())for(const [i,sk] of (c?.skills||[]).entries())if(sk?.effect==='applyStatus'){const def=defs.find(x=>x.id===String(sk.statusId||'')),target=sk.statusTarget||'enemy';if(!def)throw Error('技能 '+job+'-'+i+' 引用不存在的狀態');if(!STATUS_TARGETS.includes(target))throw Error('技能 '+job+'-'+i+' 的狀態目標無效');if(!statusAllowedTargetsForDefinition(def).includes(target))throw Error('技能 '+job+'-'+i+' 的狀態效果與套用目標方向不相容');}
  out.statusDefinitions=defs;return out;
};
const statusApplyBase=applyBalanceConfig;
applyBalanceConfig=function(input,{persist=true}={}){
  const raw=deepClone(input),out=statusApplyBase(raw,{persist:false});statusDefinitions=normalizeStatusList(raw.statusDefinitions);attachStatusSkillExtras(raw);activeStatuses=[];lastStatusTickClock=-1;
  if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));if(state)render();return out;
};
const statusExportBase=exportableBalance;
exportableBalance=function(){const out=statusExportBase();out.statusDefinitions=deepClone(statusDefinitions);for(let job=0;job<(out.classes||[]).length;job++)for(let i=0;i<(out.classes[job]?.skills||[]).length;i++){const runtime=CLASSES[job]?.skills?.[i],sk=out.classes[job].skills[i];if(runtime?.[5]==='applyStatus'){sk.effect='applyStatus';sk.statusId=runtime[6]?.statusId||'';sk.statusTarget=STATUS_TARGETS.includes(runtime[6]?.statusTarget)?runtime[6].statusTarget:'enemy';}}out.notes=[...(out.notes||[]),'statusDefinitions 為自訂狀態製作器資料；技能 effect=applyStatus 時以 statusId 引用，statusTarget 決定套用目標。','自訂狀態最多 3 個增減益、1 個控制、3 個持續效果；duration 1～99。instant 會在套用時額外立即結算一次 periodic，後續持續結算不受影響。'];return out;};

const statusResetEncounterBase=resetEncounter;
resetEncounter=function(){activeStatuses=[];lastStatusTickClock=-1;return statusResetEncounterBase();};
const statusSpawnBase=spawnGroup;
spawnGroup=function(...args){activeStatuses=[];lastStatusTickClock=-1;if(party)refillParty();return statusSpawnBase(...args);};
if(typeof resetBalanceJSON==='function'){
  const statusResetBalanceBase=resetBalanceJSON;
  resetBalanceJSON=function(){statusDefinitions=[];activeStatuses=[];lastStatusTickClock=-1;return statusResetBalanceBase();};
}

// A saved balance file may have been loaded by earlier compatibility layers before this extension installed.
try{const saved=JSON.parse(localStorage.getItem(BALANCE_KEY)||'null');if(saved?.schema===BALANCE_SCHEMA){statusDefinitions=normalizeStatusList(saved.statusDefinitions);attachStatusSkillExtras(saved);}}catch(e){console.warn('自訂狀態資料還原失敗',e);}

globalThis.__EMBERWILD_STATUS_TEST_API={schema:STATUS_SCHEMA_VERSION,normalize:normalizeStatusDefinition,validate:validateStatusDefinition,selfTest:statusPureSelfTest,get definitions(){return deepClone(statusDefinitions);},get active(){return deepClone(activeStatuses);},apply:applyCustomStatus,tick:tickCustomStatuses};
if(state)render();
})();
