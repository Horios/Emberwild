
(()=>{
  function classInitial(cls,job){
    const own=cls?.initialStats||{};
    return {
      hp:Number.isFinite(Number(own.hp))?Number(own.hp):Number(cls?.hp||0),
      atk:Number.isFinite(Number(own.atk))?Number(own.atk):Number(cls?.atk||0),
      def:Number.isFinite(Number(own.def))?Number(own.def):Number(cls?.def||0),
      crit:Number.isFinite(Number(own.crit))?Number(own.crit):Number(job===2?GS('progression.baseCrit.archer',.17):GS('progression.baseCrit.default',.07)),
      critDamage:Number.isFinite(Number(own.critDamage))?Number(own.critDamage):Number(GS('combat.baseCritDamage',1.5))
    };
  }
  function classGrowth(cls){
    const own=cls?.growthPerLevel||{};
    return {
      hp:Number.isFinite(Number(own.hp))?Number(own.hp):Number(GS('progression.statsPerLevel.hp',.9)),
      atk:Number.isFinite(Number(own.atk))?Number(own.atk):Number(GS('progression.statsPerLevel.attack',.18)),
      def:Number.isFinite(Number(own.def))?Number(own.def):Number(GS('progression.statsPerLevel.defense',.1)),
      crit:Number.isFinite(Number(own.crit))?Number(own.crit):0,
      critDamage:Number.isFinite(Number(own.critDamage))?Number(own.critDamage):0
    };
  }
  const classStatsValidateBase=validateBalanceConfig;
  validateBalanceConfig=function(input){
    for(const [job,cls] of (input?.classes||[]).entries())for(const field of ['initialStats','growthPerLevel']){
      if(cls?.[field]===undefined)continue;
      const values=cls[field];
      if(!values||typeof values!=='object'||Array.isArray(values)||['hp','atk','def','crit','critDamage'].some(key=>!Number.isFinite(values[key])||values[key]<0)||(field==='initialStats'&&(values.hp<=0||values.atk<=0)))throw Error('職業初始／成長資料無效：'+job);
    }
    const out=classStatsValidateBase(input);
    for(const [job,cls] of (input?.classes||[]).entries())for(const field of ['initialStats','growthPerLevel'])if(cls?.[field]!==undefined)out.classes[job][field]={...cls[field]};
    return out;
  };
  const classStatsApplyBase=applyBalanceConfig;
  applyBalanceConfig=function(input,{persist=true}={}){
    const checked=validateBalanceConfig(input),out=classStatsApplyBase(checked,{persist:false});
    for(const [job,cls] of checked.classes.entries())for(const field of ['initialStats','growthPerLevel']){
      if(cls[field]===undefined)delete CLASSES[job][field];else CLASSES[job][field]={...cls[field]};
    }
    if(state){for(const h of party?.members||[state])withHero(h,clampVitals);render();}
    if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));
    return out;
  };
  const classStatsExportBase=exportableBalance;
  exportableBalance=function(){
    const out=classStatsExportBase();
    out.classes.forEach((cls,job)=>{cls.initialStats=classInitial(CLASSES[job],job);cls.growthPerLevel=classGrowth(CLASSES[job]);});
    const skills=out.balanceSettings?.skills;
    if(skills){
      for(const key of ['maxLevel','initialCap','capLevelsPerStep','effectPerExtraLevel'])delete skills.core?.[key];
      delete skills.proc?.perSkillLevel;
      for(const key of ['maxLevel','effectPerExtraLevel'])delete skills.support?.[key];
    }
    return out;
  };
  globalThis.classInitialStats=classInitial;
  globalThis.classGrowthPerLevel=classGrowth;
  // The early balance loader runs before this module installs its class fields.
  try{
    const saved=JSON.parse(localStorage.getItem(BALANCE_KEY)||'null');
    if(saved?.schema===BALANCE_SCHEMA){
      const checked=validateBalanceConfig(saved);
      checked.classes.forEach((cls,job)=>{for(const field of ['initialStats','growthPerLevel'])if(cls[field]!==undefined)CLASSES[job][field]={...cls[field]};});
      if(state){for(const h of party?.members||[state])withHero(h,clampVitals);render();}
    }
  }catch(e){console.warn('職業初始／成長資料還原失敗',e);}
})();
