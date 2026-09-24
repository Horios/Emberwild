/* Monster skill pool + per-monster assignment extension.
   Ordinary monster catalog entries may configure at most two candidate skills.
   Each candidate rolls independently when an enemy instance is spawned. */
(function installMonsterSkillPool(){
  const clone=v=>JSON.parse(JSON.stringify(v));

  function normalizeSkill(sk){
    if(!sk||typeof sk!=='object')return sk;
    sk.enabled=sk.enabled!==false;
    sk.requiredLevel=Math.max(1,Math.floor(Number.isFinite(Number(sk.requiredLevel))?Number(sk.requiredLevel):(Number(sk.minLevel)||1)));
    sk.minLevel=sk.requiredLevel; // legacy validator/runtime compatibility
    sk.effect=['damage','heal','drain'].includes(sk.effect)?sk.effect:'damage';
    sk.power=Math.max(0,Number(sk.power)||0);
    const legacyCd=Number.isFinite(Number(sk.cooldown))?Number(sk.cooldown):
      Number.isFinite(Number(sk.cooldownMin))?Number(sk.cooldownMin):0;
    sk.cooldown=Math.max(0,Math.floor(legacyCd));
    sk.cooldownMin=sk.cooldown;
    sk.cooldownMax=sk.cooldown;
    sk.element=(sk.element==='inherit'||Object.prototype.hasOwnProperty.call(ELEMENTS,sk.element))?sk.element:'inherit';
    sk.target=['random','weakest'].includes(sk.target)?sk.target:'random';
    sk.maxTargets=Math.max(1,Math.floor(Number(sk.maxTargets)||1));
    sk.description=typeof sk.description==='string'?sk.description:'';
    sk.weight=Number.isFinite(Number(sk.weight))&&Number(sk.weight)>0?Number(sk.weight):1;
    sk.kind=['all','normal','elite','boss','final'].includes(sk.kind)?sk.kind:'all';
    sk.race=(sk.race==='all'||Object.prototype.hasOwnProperty.call(RACES,sk.race))?sk.race:'all';
    return sk;
  }

  function defaultAssignments(row){
    if(row?.kind==='normal')return [
      {skillId:'heavy_strike',chance:.30},
      {skillId:'feral_rush',chance:.65}
    ];
    if(row?.kind==='boss')return [{skillId:'boss_crush',chance:1}];
    if(row?.kind==='final')return [{skillId:'heavy_strike',chance:1}];
    return [];
  }

  function normalizeAssignments(row,source){
    const raw=Array.isArray(source)?source:defaultAssignments(row);
    const seen=new Set(),out=[];
    for(const a of raw){
      if(!a||typeof a.skillId!=='string'||!a.skillId.trim()||seen.has(a.skillId))continue;
      const chance=Number(a.chance);
      if(!Number.isFinite(chance))continue;
      seen.add(a.skillId);
      out.push({skillId:a.skillId.trim(),chance:Math.max(0,Math.min(1,chance))});
      if(row?.kind==='normal'&&out.length>=2)break;
    }
    return out;
  }

  for(const sk of GAMEPLAY_SETTINGS_DEFAULTS.monsters.skills||[])normalizeSkill(sk);
  for(const row of GAMEPLAY_SETTINGS_DEFAULTS.monsters.catalog||[])row.skillAssignments=normalizeAssignments(row,row.skillAssignments);
  for(const sk of GAMEPLAY_SETTINGS.monsters.skills||[])normalizeSkill(sk);
  for(const row of GAMEPLAY_SETTINGS.monsters.catalog||[])row.skillAssignments=normalizeAssignments(row,row.skillAssignments);

  const normalizeGameplaySettingsBase=normalizeGameplaySettings;
  normalizeGameplaySettings=function(input){
    const sourceRows=new Map((input?.monsters?.catalog||[]).map(r=>[r?.id,r]));
    const cfg=normalizeGameplaySettingsBase(input);
    for(const sk of cfg.monsters.skills||[])normalizeSkill(sk);
    const skillIds=new Set((cfg.monsters.skills||[]).map(sk=>sk.id));
    for(const row of cfg.monsters.catalog||[]){
      const src=sourceRows.get(row.id);
      row.skillAssignments=normalizeAssignments(row,src?.skillAssignments??row.skillAssignments)
        .filter(a=>skillIds.has(a.skillId));
      if(row.kind==='normal'&&row.skillAssignments.length>2)row.skillAssignments=row.skillAssignments.slice(0,2);
    }
    return cfg;
  };

  function catalogRowForEnemy(e){
    return (GAMEPLAY_SETTINGS.monsters.catalog||[]).find(row=>row.id===e?.monsterId)||null;
  }
  function skillKey(e,skillId){return e.id+':'+skillId;}
  function currentEnemySkills(e){
    const ids=Array.isArray(e?.enemySkillIds)?e.enemySkillIds:(e?.enemySkillId?[e.enemySkillId]:[]);
    return ids.map(id=>enemySkillPool().find(sk=>sk.id===id)).filter(sk=>sk&&enemySkillEligible(e,sk));
  }
  function refreshAggregateCooldown(e){
    const skills=currentEnemySkills(e);
    enemySkillCooldowns[e.id]=skills.length?Math.min(...skills.map(sk=>cooldownLeft(enemySkillCooldowns,skillKey(e,sk.id)))):0;
  }

  enemySkillEligible=function(e,sk){
    const required=Math.max(1,Math.floor(Number(sk?.requiredLevel??sk?.minLevel??1)));
    return !!sk&&sk.enabled!==false&&e.lv>=required&&
      (sk.kind==='all'||sk.kind===e.kind)&&
      (sk.race==='all'||sk.race===e.race);
  };

  rollEnemySkillCooldown=function(sk){
    if(Number.isFinite(Number(sk?.cooldown)))return Math.max(0,Math.floor(Number(sk.cooldown)));
    const lo=Math.max(0,Math.floor(sk?.cooldownMin||0)),hi=Math.max(lo,Math.floor(sk?.cooldownMax||lo));
    return lo+rand(hi-lo+1);
  };

  assignEnemySkill=function(e){
    e.enemySkillIds=[];
    delete e.enemySkillId;
    delete enemySkillCooldowns[e.id];
    const row=catalogRowForEnemy(e);
    const assignments=normalizeAssignments(row,row?.skillAssignments);
    for(const a of assignments){
      const sk=enemySkillPool().find(x=>x.id===a.skillId);
      if(!sk||!enemySkillEligible(e,sk)||Math.random()>=a.chance)continue;
      e.enemySkillIds.push(sk.id);
      enemySkillCooldowns[skillKey(e,sk.id)]=rollEnemySkillCooldown(sk);
    }
    if(e.enemySkillIds.length)e.enemySkillId=e.enemySkillIds[0]; // legacy consumers
    refreshAggregateCooldown(e);
  };

  enemySkillFor=function(e){return currentEnemySkills(e)[0]||null;};

  enemySkillStatus=function(e){
    if(!e||e.hp<=0)return '';
    const skills=currentEnemySkills(e);
    return skills.map(sk=>{
      const left=cooldownLeft(enemySkillCooldowns,skillKey(e,sk.id));
      return `<span class="tag">技能 ${esc(sk.name)} · ${left?`冷卻 ${left} 回合`:'就緒'}</span>`;
    }).join('');
  };

  function enemySkillTargets(sk){
    const alive=living();
    if(!alive.length)return [];
    const count=Math.max(1,Math.min(alive.length,Math.floor(Number(sk.maxTargets)||1)));
    if(sk.target==='weakest')return [...alive].sort((a,b)=>a.hp/battleStats(a).hp-b.hp/battleStats(b).hp).slice(0,count);
    const pool=[...alive],picked=[];
    while(pool.length&&picked.length<count)picked.push(pool.splice(rand(pool.length),1)[0]);
    return picked;
  }

  performEnemySkill=function(e,sk){
    e.turn=(e.turn||0)+1;
    const effect=['damage','heal','drain'].includes(sk.effect)?sk.effect:'damage';
    const power=Number.isFinite(Number(sk.power))?Number(sk.power):1;
    if(effect==='heal'){
      const before=e.hp,amount=Math.max(1,Math.round(e.atk*power));
      e.hp=Math.min(e.maxhp,e.hp+amount);
      note(combatEnemyName(e)+'・'+sk.name+' → 回復 '+Math.max(0,e.hp-before)+' 生命');
      return;
    }
    const targets=enemySkillTargets(sk);
    if(!targets.length)return;
    let totalHpDamage=0;
    for(const h of targets){
      const beforeHp=h.hp,v=battleStats(h),c=GAMEPLAY_SETTINGS.combat,fb=c.finalBoss;
      const levelMulti=e.kind==='final'?(e.turn>fb.enrageAfterTurn?fb.enrageMultiplier:1):1+Math.max(0,e.lv-h.lv)*c.levelGapDamagePerLevel;
      let hit=Math.max(1,Math.round(e.atk*power*(1-Math.min(c.caps.weaken,effectTotal(e.id,'weaken')))*levelMulti-v.def*c.defenseEffectiveness));
      hit=Math.max(1,Math.round(hit*(1-Math.min(c.caps.guard,effectTotal(heroKey(h),'guard')))));
      if(Math.random()<v.evasion){note(characterName(h)+'閃避了'+combatEnemyName(e)+'的「'+sk.name+'」');continue;}
      const element=sk.element==='inherit'?e.element:sk.element,ward=activeSupply(h,'ward'),resist=Math.min(c.caps.resistance,(v.resist[element]||0)+(ward&&ward.element===element?c.supply.wardResistance:0));
      hit=Math.max(1,Math.round(hit*(1-resist)));
      const absorb=Math.min(h.shield,hit);h.shield-=absorb;
      if(absorb>0)recordCombatContribution(h,'mitigation',absorb);
      const hpDamage=Math.max(0,hit-absorb);totalHpDamage+=hpDamage;h.hp=Math.max(0,h.hp-hpDamage);
      if(absorb>0&&hpDamage===0)note(combatEnemyName(e)+'・'+sk.name+' → '+characterName(h)+' 的護盾 '+absorb+' 傷害（剩餘 '+Math.round(h.shield)+'）');
      else note(combatEnemyName(e)+'・'+sk.name+' → '+characterName(h)+' '+hpDamage+' 傷害'+(absorb?`（護盾吸收 ${absorb}，剩餘 ${Math.round(h.shield)}）`:''));
      if(beforeHp>0&&h.hp<=0&&typeof recordBattleDeath==='function')recordBattleDeath(h,e,sk.name);
    }
    if(effect==='drain'&&totalHpDamage>0)e.hp=Math.min(e.maxhp,e.hp+totalHpDamage);
  };

  performEnemyAction=function(e){
    const skills=currentEnemySkills(e);
    for(const sk of skills){
      const key=skillKey(e,sk.id);
      enemySkillCooldowns[key]=Math.max(0,cooldownLeft(enemySkillCooldowns,key)-1);
    }
    const ready=skills.find(sk=>cooldownLeft(enemySkillCooldowns,skillKey(e,sk.id))<=0);
    if(ready){
      performEnemySkill(e,ready);
      enemySkillCooldowns[skillKey(e,ready.id)]=rollEnemySkillCooldown(ready);
      refreshAggregateCooldown(e);
      return 'skill';
    }
    refreshAggregateCooldown(e);
    performEnemyBasic(e);
    return 'basic';
  };

  const validateGameplaySettingsBase=validateGameplaySettings;
  validateGameplaySettings=function(cfg){
    cfg=validateGameplaySettingsBase(cfg);
    const skillIds=new Set((cfg.monsters.skills||[]).map(sk=>sk.id));
    for(const sk of cfg.monsters.skills||[]){
      normalizeSkill(sk);
      if(!['damage','heal','drain'].includes(sk.effect))throw Error('怪物技能效果無效：'+sk.id);
      if(!Number.isInteger(sk.maxTargets)||sk.maxTargets<1)throw Error('怪物技能目標數無效：'+sk.id);
    }
    for(const row of cfg.monsters.catalog||[]){
      row.skillAssignments=normalizeAssignments(row,row.skillAssignments);
      if(row.kind==='normal'&&row.skillAssignments.length>2)throw Error('普通怪物最多只能設定 2 種技能：'+row.id);
      const seen=new Set();
      for(const a of row.skillAssignments){
        if(!skillIds.has(a.skillId))throw Error('怪物引用不存在的技能：'+row.id+' → '+a.skillId);
        if(seen.has(a.skillId))throw Error('同一怪物不可重複設定相同技能：'+row.id+' → '+a.skillId);
        seen.add(a.skillId);
        if(!Number.isFinite(a.chance)||a.chance<0||a.chance>1)throw Error('怪物技能出現機率需介於 0~1：'+row.id+' → '+a.skillId);
      }
    }
    return cfg;
  };

  // Re-normalize the already loaded runtime settings so the new fields are immediately available.
  GAMEPLAY_SETTINGS=normalizeGameplaySettings(GAMEPLAY_SETTINGS);
  globalThis.__EMBERWILD_GAMEPLAY_SETTINGS=GAMEPLAY_SETTINGS;
  applyGameplaySettingsSideEffects();
})();
