/* Save progress and source documentation for the LV1–60 curves. */
(()=>{
  const copy=v=>JSON.parse(JSON.stringify(v));
  const sameBuiltinCurve=()=>JSON.stringify(GAMEPLAY_SETTINGS.progression.xpCurve)===JSON.stringify(EmberwildProgression.defaults.settings.progression.xpCurve)&&GS('skills.mastery.characterXpMultiplier',1)===1;
  const legacyNeed=l=>Math.max(1,Math.round(Math.round((45+l*18+l*l*2)*(2.2+l*.16))*1.35));
  const builtinLegacy=data=>data?.progressionXpRequirements===undefined&&data?.progressionCurveVersion===undefined&&sameBuiltinCurve()&&!localStorage.getItem(BALANCE_KEY);
  function migrateProgress(data){
    const out=copy(data);if(!Array.isArray(out?.members))return out;
    const snapshot=out.progressionXpRequirements;
    if(snapshot!==undefined&&(!Array.isArray(snapshot)||snapshot.length!==out.members.length||snapshot.some(n=>!Number.isSafeInteger(n)||n<=0)))throw Error('存檔 EXP 曲線快照無效');
    const legacy=builtinLegacy(out);
    out.members.forEach((h,i)=>{
      const before=snapshot?.[i]??(legacy?legacyNeed(h.lv):need(h.lv)),after=need(h.lv);
      if(before!==after)h.xp=Math.max(0,Math.floor(Math.min(.999999,Math.max(0,h.xp)/before)*after));
    });
    out.progressionCurveVersion=2;out.progressionXpRequirements=out.members.map(h=>need(h.lv));return out;
  }
  const packBase=packParty;
  packParty=function(){const out=packBase();if(out){out.progressionCurveVersion=2;out.progressionXpRequirements=out.members.map(h=>need(h.lv));}return out;};
  const loadBase=loadParty;
  loadParty=function(data){const legacy=builtinLegacy(data),out=loadBase(migrateProgress(data));if(legacy)refillParty();return out;};
  // The core loader runs before the last growth modules have been installed.
  // A built-in v1 save gets one refill because HP uses a larger scale in v2.
  if(party){const legacy=builtinLegacy(party),migrated=migrateProgress(party);party.members.forEach((h,i)=>h.xp=migrated.members[i].xp);party.progressionCurveVersion=2;party.progressionXpRequirements=migrated.progressionXpRequirements;if(legacy)refillParty();}
  const validateBase=validateGameplaySettings;
  validateGameplaySettings=function(cfg){
    const out=validateBase(cfg),x=out.rewards.xp.kindMultiplier;
    if(!x||['normal','elite','boss'].some(k=>!Number.isFinite(x[k])||x[k]<=0))throw Error('EXP 遭遇倍率必須大於 0');
    if(out.difficulty.modes.some(d=>!Number.isFinite(d.xpMultiplier)||d.xpMultiplier<=0))throw Error('難度 EXP 倍率必須大於 0');
    const interval=out.monsters.encounter.levelLeadInterval;
    if(!Number.isInteger(interval)||interval<0||interval>60)throw Error('怪物領先等級間隔必須為 0～60 整數');
    for(const [path,min] of [['progression.statsPerPoint.hp',0],['progression.statsPerPoint.attack',0],['progression.statsPerPoint.defense',0],['rewards.xp.base',0],['rewards.xp.perLevel',0],['progression.xpCurve.base',0],['progression.xpCurve.linear',0],['progression.xpCurve.quadratic',0],['progression.xpCurve.multiplierBase',.000001],['progression.xpCurve.multiplierPerLevel',0]])if(!Number.isFinite(gameplayAt(out,path))||gameplayAt(out,path)<min)throw Error('成長／EXP 設定無效：'+path);
    return out;
  };
  const referenceBase=balanceReference;
  balanceReference=function(){
    const out=referenceBase();out.balancePaths??={};out.legacySettings??={};
    Object.assign(out.balancePaths,{
      'classes[].initialStats':'LV1 裸裝自然能力，與舊 hp/atk/def 同步。',
      'classes[].growthPerLevel':'各職業每級自然增加量；HP／攻擊／防禦取整。',
      'classes[].growthSteps':'整數階梯：每 every 級額外增加 hp/atk/def；以 (LV−1) 計算。',
      'balanceSettings.rewards.xp.kindMultiplier':'EXP 專用普通／菁英／BOSS 倍率；final 沿用 boss。',
      'balanceSettings.rewards.kindMultiplier':'金幣等既有獎勵的遭遇倍率；EXP 使用 rewards.xp.kindMultiplier。',
      'balanceSettings.difficulty.modes[].xpMultiplier':'EXP 專用難度倍率；reward 仍控制金幣等既有獎勵。',
      'balanceSettings.monsters.encounter.levelLeadInterval':'怪物每此間隔可領先 1 級，最多 progression.mapAheadAllowance 級；0 沿用固定上限。只限制隨機怪物等級，BOSS 固定為地圖上限。',
      'balanceSettings.progression.xpCurve':'升級需求多項式，最後乘 skills.mastery.characterXpMultiplier；主角每隻怪取得 round(怪物總 EXP / 出戰人數) 一次，夥伴等級同步主角，不獨立累積 EXP。'
    });
    out.legacySettings['balanceSettings.progression.statsPerLevel']={status:'fallback',replacement:'classes[].growthPerLevel',note:'只有缺少該職業獨立成長的舊 JSON 使用。'};
    return out;
  };
  globalThis.__EMBERWILD_PROGRESSION_TEST={migrateProgress};
})();
