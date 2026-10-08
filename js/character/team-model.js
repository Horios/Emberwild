/* Shared, DOM-free contract. Embedded verbatim in the private balance editor. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.EmberwildTeams=api;})(globalThis,()=>{
  'use strict';
  const VERSION=1,copy=v=>JSON.parse(JSON.stringify(v));
  const defaults={maxPlans:6,defaultLearnCost:1};
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const int=(v,min=0,max=1e12)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  function settings(raw){const out={...defaults,...raw};if(!int(out.maxPlans,1,12)||!int(out.defaultLearnCost,0,10000))throw Error('隊伍數量或學習成本無效');return out;}
  function rules(raw,defaultCost=1){
    const r=raw||{},out={learnCost:r.learnCost??defaultCost,unlockConditions:copy(r.unlockConditions??{classMasteryLevel:0,quests:[],materials:[]})},u=out.unlockConditions;
    if(!int(out.learnCost,0,10000)||!object(u)||!int(u.classMasteryLevel??0,0,100)||!Array.isArray(u.quests??[])||!Array.isArray(u.materials??[]))throw Error('技能學習或永久解鎖設定無效');
    u.classMasteryLevel??=0;u.quests??=[];u.materials??=[];
    const safe=s=>typeof s==='string'&&s.length>0&&s.length<=80&&!/[<>\u0000-\u001f]/.test(s)&&!['__proto__','constructor','prototype'].includes(s);
    if(u.quests.length>32||new Set(u.quests).size!==u.quests.length||u.quests.some(s=>!safe(s))||u.materials.length>32||u.materials.some(m=>!object(m)||!safe(m.name)||!int(m.quantity,1,1e9))||new Set(u.materials.map(m=>m.name)).size!==u.materials.length)throw Error('技能永久任務或材料條件無效');
    return out;
  }
  function normalizeDocument(input){
    const d=copy(input);d.teamSettings=settings(d.teamSettings);d.balanceSettings??={};d.balanceSettings.meta??={};
    // Restore the pre-mastery starting/per-level point rules once. A marked JSON
    // may intentionally set either budget to zero; never overwrite it again.
    const p=d.balanceSettings.progression??={};p.starting??={};p.levelRewards??={};
    if(!d.balanceSettings.meta.teamBuildVersion){if(!p.starting.skillPoints)p.starting.skillPoints=2;if(!p.levelRewards.skillPoints)p.levelRewards.skillPoints=2;}
    d.balanceSettings.meta.teamBuildVersion=VERSION;
    for(const n of [p.starting.skillPoints,p.levelRewards.skillPoints,p.starting.abilityPoints??0,p.levelRewards.abilityPoints??3])if(!int(n,0,100000))throw Error('隊伍點數額度無效');
    for(const cls of d.classes||[])for(const sk of cls.skills||[])Object.assign(sk,rules(sk,d.teamSettings.defaultLearnCost));
    for(const list of d.supportSkills||[])for(const sk of list)Object.assign(sk,rules(sk,d.teamSettings.defaultLearnCost));
    return d;
  }
  function budget(level,progression,permanent){return {ap:Math.round((progression.starting.abilityPoints||0)+(level-1)*(progression.levelRewards.abilityPoints||0))+(permanent.abilityCredit||0),sp:Math.round((progression.starting.skillPoints||0)+(level-1)*(progression.levelRewards.skillPoints||0))+(permanent.skillCredit||0)};}
  const key=(job,kind,i)=>`${job}:${kind}:${i}`;
  function blank(id,name,job=null,coreCount=0,supportCount=0){return {id,name,job,stats:[0,0,0],skills:Array(coreCount).fill(0),supportLevels:Array(supportCount).fill(0),active:[null,null],procSlots:[null,null],supportSlots:[null,null],equipped:Array(5).fill(null),sockets:Array(coreCount).fill(null),companions:[],enlisted:[],tokens:{}};}
  function spent(plan,classes,supports,cost=1){return plan.skills.reduce((n,v,i)=>n+(v?rules(classes[plan.job]?.skills[i],cost).learnCost:0),0)+plan.supportLevels.reduce((n,v,i)=>n+(v?rules(supports[plan.job]?.[i],cost).learnCost:0),0);}
  function references(build,id){return build.plans.filter(p=>p.equipped.includes(id)||Object.values(p.tokens).includes(id)).map(p=>({id:p.id,name:p.name}));}
  function clearReferences(build,ids){const set=new Set(ids);for(const p of build.plans){p.equipped=p.equipped.map(id=>set.has(id)?null:id);for(const k of Object.keys(p.tokens))if(set.has(p.tokens[k]))p.tokens[k]=null;}}
  function prepareSave(input){
    const d=copy(input),rows=d?.version===3?d.members:[d];if(!Array.isArray(rows))return d;
    const ids=new Set(rows.flatMap(h=>Array.isArray(h?.bag)?h.bag.map(g=>g.id):[]));
    for(const h of rows){if(Array.isArray(h?.equipped))h.equipped=h.equipped.map(id=>id!==null&&!ids.has(id)?null:id);if(h?.tokenId!==null&&h?.tokenId!==undefined&&!ids.has(h.tokenId))h.tokenId=null;}
    return d;
  }
  function validate(build,{classes,supports,members,items,progression,level,config=defaults,wearable=()=>true}){
    const b=copy(build),cfg=settings(config),fail=message=>{throw Error(message);},perm=b?.permanent;
    if(b?.version!==VERSION||!int(b.serial,2,1e9)||!Array.isArray(b.plans)||!b.plans.length||b.plans.length>12||!object(perm)||!int(perm.playerKey,0,1e9)||!int(perm.abilityCredit)||!int(perm.skillCredit)||!object(perm.classes)||!object(perm.masteries)||!object(perm.unlocks)||!object(perm.payments)||!object(perm.gemInstances)||!int(perm.gemSerial,1,1e9))fail('永久養成或隊伍資料無效');
    const skillKeys=new Set();classes.forEach((c,j)=>{c.skills.forEach((_,i)=>skillKeys.add(key(j,'core',i)));(supports[j]||[]).forEach((_,i)=>skillKeys.add(key(j,'support',i)));});
    for(const [k,v] of Object.entries(perm.unlocks))if(!skillKeys.has(k)||v!==true)fail('永久技能解鎖無效');
    for(const [k,v] of Object.entries(perm.payments))if(!skillKeys.has(k)||v!==true||!perm.unlocks[k])fail('技能材料消耗成果無效');
    for(const [k,v] of Object.entries(perm.classes))if(!/^\d+$/.test(k)||!classes[Number(k)]||!object(v)||typeof v.activated!=='boolean'||typeof v.advanced!=='boolean'||!int(v.xp)||!v.activated&&(v.xp||v.advanced))fail('職業永久成長無效');
    for(const [k,v] of Object.entries(perm.masteries))if(!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(k)||!int(v))fail('武器／元素精通無效');
    for(const [k,v] of Object.entries(perm.gemInstances))if(!/^gem-\d+$/.test(k)||!int(v,0,2))fail('技能寶石實體無效');
    const owned=new Map(items.map(g=>[g.id,g])),people=new Set(members.slice(1).map(h=>h.companionId??h.job)),ids=new Set(),totals=budget(level,progression,perm);
    for(const p of b.plans){
      if(!p||!/^team-\d+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||Array.from(p.name).length>24||/[\u0000-\u001f]/.test(p.name)||p.job!==null&&(!int(p.job,0,classes.length-1)||!perm.classes[p.job]?.activated))fail('隊伍名稱或職業無效');ids.add(p.id);
      const c=p.job===null?0:classes[p.job].skills.length,s=p.job===null?0:(supports[p.job]||[]).length;
      if(!Array.isArray(p.stats)||p.stats.length!==3||p.stats.some(n=>!int(n,0,100000))||p.stats.reduce((a,v)=>a+v,0)>totals.ap||!Array.isArray(p.skills)||p.skills.length!==c||p.skills.some(n=>!int(n,0,1))||!Array.isArray(p.supportLevels)||p.supportLevels.length!==s||p.supportLevels.some(n=>!int(n,0,1))||spent(p,classes,supports,cfg.defaultLearnCost)>totals.sp)fail('隊伍配點超出額度');
      for(const [kind,list] of [['core',p.skills],['support',p.supportLevels]])if(list.some((v,i)=>v&&!perm.unlocks[key(p.job,kind,i)]))fail('隊伍學習了尚未永久解鎖的技能');
      for(const [field,list,type] of [['active',p.skills,'active'],['procSlots',p.skills,'proc'],['supportSlots',p.supportLevels,null]]){const slots=p[field];if(!Array.isArray(slots)||slots.length!==2||new Set(slots.filter(v=>v!==null)).size!==slots.filter(v=>v!==null).length||slots.some(i=>i!==null&&(!int(i,0,list.length-1)||!list[i]||type&&classes[p.job].skills[i].activation!==type)))fail('隊伍技能槽無效');}
      if(!Array.isArray(p.equipped)||p.equipped.length!==5||!object(p.tokens)||!Array.isArray(p.companions)||p.companions.length>2||!Array.isArray(p.enlisted)||p.enlisted.length>512||new Set(p.enlisted).size!==p.enlisted.length||new Set(p.companions).size!==p.companions.length||p.enlisted.some(k=>!people.has(k))||p.companions.some(k=>!p.enlisted.includes(k)))fail('隊伍編成無效');
      p.equipped=p.equipped.map((id,i)=>{if(id===null)return null;if(typeof id!=='string')fail('装備 UID 無效');const g=owned.get(id);if(!g)return null;if(p.job===null||!wearable(g,p.job,i))fail('隊伍裝備不符職業或位置');return id;});
      for(const [k,id] of Object.entries(p.tokens)){if(!people.has(Number(k))||id!==null&&typeof id!=='string')fail('隊伍信物引用無效');if(id!==null&&!owned.has(id))p.tokens[k]=null;else if(id!==null&&owned.get(id).type!=='companionToken')fail('隊伍信物類型無效');}
      const used=[...p.equipped.filter(Boolean),...Object.values(p.tokens).filter(Boolean)];if(new Set(used).size!==used.length)fail('同一隊伍重複使用物品實體');
      if(!Array.isArray(p.sockets)||p.sockets.length!==c||p.sockets.some((id,i)=>id!==null&&(!p.skills[i]||!Object.hasOwn(perm.gemInstances,id)))||new Set(p.sockets.filter(Boolean)).size!==p.sockets.filter(Boolean).length)fail('隊伍技能寶石引用無效');
      if(p.job===null&&(p.stats.some(Boolean)||p.skills.some(Boolean)||p.equipped.some(Boolean)||p.companions.length||p.enlisted.length||Object.values(p.tokens).some(Boolean)))fail('空白隊伍含有配置');
    }
    if(!ids.has(b.activeId)||Number(b.plans.reduce((n,p)=>Math.max(n,Number(p.id.slice(5))),0))>=b.serial)fail('目前隊伍或序號無效');
    return b;
  }
  return {VERSION,defaults,copy,settings,rules,normalizeDocument,budget,key,blank,spent,references,clearReferences,prepareSave,validate};
});
