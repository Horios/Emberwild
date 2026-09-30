const {openRuntime}=require('./runtime.cjs');
const path=require('node:path');
const fs=require('node:fs');
async function simulate(page,{samples=24,geared=true}={}) {
 const doc=await page.evaluate(()=>exportableBalance());
 return page.evaluate(({doc,geared,samples})=>{
  applyBalanceConfig(doc,{persist:false});
  const levels=[1,10,15,30,31,45,60],classRows=[],partnerRows=[],xpRows=[];
  const mapFor=l=>MAPS.findIndex((m,i)=>i!==6&&m.min<=l&&m.max>=l);
  const makeHero=(job,l,points)=>{const h=initial(job);initHero(h);h.name='測試'+job;h.lv=l;h.advanced=l>=15;h.won=l>=30;h.autoPotion=false;h.ap=0;h.sp=0;h.stats=[0,0,0];for(let n=0;n<(l-1)*3;n++)h.stats[points[n%points.length]]++;h.skills=CLASSES[job].skills.map(sk=>Number(l>=sk[2]));h.active=l>=15?[4,0]:[0,null];h.procSlots=[2,null];h.supportLevels=SUPPORT[job].map(sk=>Number(l>=sk.level));h.supportSlots=l>=7?[0,1]:[0,null];h.mastery=Object.fromEntries(['sword','axe','hammer','bow','crossbow','fire','ice','wind','light','shadow'].map(k=>[k,100000]));h.bag=[0,1,2,3,3].map(slot=>{const g=gear(Math.min(12,Math.ceil(l/5)),slot,0,job);g.powerTier=1;g.plus=0;g.prefixId='';g.suffixId='';g.affix=[];return g;});h.equipped=h.bag.map(g=>g.id);return h;};
  const baseEnemy=(l,kind,mode)=>{
   const mi=mapFor(l),h={lv:l,difficulty:mode},oldMap={min:MAPS[mi].min,max:MAPS[mi].max};
   MAPS[mi].min=MAPS[mi].max=l;
   let e;
   if(kind==='boss'){
    party.bossChallenge={active:true,mapIndex:mi,mapId:worldMapConfig(mi).id,stagePaid:true};spawnGroup();e=foes.find(x=>x.kind==='boss');party.bossChallenge=null;
   }else e=makeEnemy(mi,h,()=>kind==='elite'?.01:.9);
   Object.assign(MAPS[mi],oldMap);
   return e;
  };
  for(const l of levels)for(let j=0;j<4;j++){const h=makeHero(j,l,[0,0,1]);h.equipped=[];const allocated=stats(h);h.stats=[0,0,0];classRows.push({level:l,job:j,bare:stats(h),allocated});}
  for(const l of levels)for(const p of doc.companions){const h=makeHero(p.job,l,p.points);h.equipped=[];partnerRows.push({level:l,id:p.id,stats:stats(h)});}
  for(const l of [1,5,10,15,20,30,40,50,59]){const r=doc.balanceSettings.rewards,xp=Math.round((r.xp.base+l*r.xp.perLevel)*(r.xp.kindMultiplier?.normal??r.kindMultiplier.normal)),share=Math.max(1,Math.round(xp/3));xpRows.push({level:l,need:need(l),xp,share,kills:Math.ceil(need(l)/share),encounters:need(l)/share/4.5});}
  // Fixed companion skills are applied by the real recruit/load path.
  const teams=[{name:'安全',job:1,ids:[11,13],points:[0,0,1]},{name:'平衡',job:0,ids:[12,13],points:[0,0,1]},{name:'高輸出',job:1,ids:[10,14],points:[0,0,1]},{name:'高防禦',job:0,ids:[11,13],points:[2,1,2]},{name:'三戰士',job:0,ids:[10,11],points:[0,0,1]},{name:'雙法師',job:1,ids:[12,14],points:[0,0,1]}],battles=[];
  const original={save,render,rewardGroupKill,note,MathRandom:Math.random};save=()=>true;render=()=>{};note=()=>{};rewardGroupKill=e=>{e.rewarded=true;};
  let seed=1;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const l of levels)for(const t of teams)for(const mode of [0,1,2])for(const encounter of ['normal3','normal6','elite','boss',...(l===30?['finalGate']:[])]){
   const trials=[];
   for(let sample=0;sample<samples;sample++){
    seed=1+sample*104729;
    const player=makeHero(t.job,l,t.points);player.bag=[];player.equipped=[];
    party=createParty(player);state=player;party.cleared=l>=30;party.map=mapFor(l);party.difficulty=mode;party.active=[t.job];syncParty();
    for(const id of t.ids)recruitCompanion(id);
    player.bag=[...player.bag,...[0,1,2,3,3].map(slot=>{const g=gear(Math.min(12,Math.ceil(l/5)),slot,0,t.job);g.powerTier=1;g.plus=0;g.prefixId='';g.suffixId='';g.affix=[];return g;})];player.equipped=player.bag.slice(-5).map(g=>g.id);
    ensureSharedGear();syncParty();
    for(const h of heroes()){h.mastery=Object.fromEntries(['sword','axe','hammer','bow','crossbow','fire','ice','wind','light','shadow'].map(k=>[k,100000]));h.autoPotion=false;for(const g of equipment(h)){g.tier=Math.min(12,Math.ceil(l/5));g.powerTier=geared?[2,5,9][mode]:1;g.plus=geared?[0,5,10][mode]:0;g.prefixId='';g.suffixId='';g.affix=[];}h.hp=stats(h).hp;}
    closeModal();resetEncounter();running=true;spawnGroup();
    const kind=encounter==='boss'?'boss':encounter==='elite'?'elite':'normal',count=encounter==='normal6'?6:encounter==='normal3'?3:1;
    if(encounter==='finalGate'){party.map=worldProgressionGateIndex();party.bossChallenge=null;syncParty();resetEncounter();running=true;spawnGroup();}
    else foes=Array.from({length:count},(_,i)=>{const e=baseEnemy(l,kind,mode);e.id='sim-'+i;return e;});enemy=foes[0];effects=[];actorCooldowns={};supportCooldowns={};round=0;
    const totalHp=heroes().reduce((n,h)=>n+stats(h).hp,0),atk=heroes().reduce((n,h)=>n+stats(h).atk,0);let minHp=totalHp,deaths=0,actions=0;
    for(let r=0;r<70&&foes.some(e=>e.hp>0)&&running;r++){const it=pacedRound();while(!it.next().done){actions++;minHp=Math.min(minHp,heroes().reduce((n,h)=>n+Math.max(0,h.hp),0));deaths=Math.max(deaths,heroes().filter(h=>h.hp<=0).length);}}
    trials.push({win:foes.length>0&&foes.every(e=>e.hp<=0),rounds:round,actions,totalHp,atk,loss:1-minHp/totalHp,deaths});running=false;
   }
   const avg=k=>trials.reduce((n,x)=>n+x[k],0)/trials.length;
   battles.push({level:l,team:t.name,mode,encounter,winRate:avg('win'),rounds:avg('rounds'),actions:avg('actions'),hp:avg('totalHp'),atk:avg('atk'),pressure:avg('loss'),deaths:avg('deaths')});
  }
  Object.assign(globalThis,{save:original.save,render:original.render,rewardGroupKill:original.rewardGroupKill,note:original.note});Math.random=original.MathRandom;
  return {classRows,partnerRows,xpRows,battles};
 },{doc,geared,samples});
}
async function simulateStarters(page,{samples=256}={}) {
 return page.evaluate(samples=>{
  const teams=[{name:'安全',job:1,ids:[11,13]},{name:'平衡',job:0,ids:[12,13]},{name:'高輸出',job:1,ids:[10,14]},{name:'高防禦',job:0,ids:[11,13]},{name:'三戰士',job:0,ids:[10,11]},{name:'雙法師',job:1,ids:[12,14]}],out=[];
  const original={save,render,note,rewardGroupKill,random:Math.random};save=()=>true;render=()=>{};note=()=>{};rewardGroupKill=e=>{e.rewarded=true;};
  let seed=1;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  try{for(const t of teams){const trials=[];
   for(let sample=0;sample<samples;sample++){
    seed=1+sample*104729;party=null;state=null;start(t.job);party.map=0;party.difficulty=0;syncParty();
    for(const id of t.ids)recruitCompanion(id);
    for(const h of heroes()){h.autoPotion=false;h.hp=stats(h).hp;}
    closeModal();resetEncounter();running=true;spawnGroup();
    const count=foes.length,maxLevel=Math.max(...foes.map(e=>e.lv)),hp=heroes().reduce((n,h)=>n+stats(h).hp,0);let minHp=hp;
    for(let tick=0;tick<70&&foes.some(e=>e.hp>0)&&running;tick++){const it=pacedRound();while(!it.next().done)minHp=Math.min(minHp,heroes().reduce((n,h)=>n+Math.max(0,h.hp),0));}
    trials.push({win:foes.length>0&&foes.every(e=>e.hp<=0),rounds:round,pressure:1-minHp/hp,hp,maxLevel,count});running=false;
   }
   const avg=k=>trials.reduce((n,x)=>n+x[k],0)/trials.length;
   out.push({team:t.name,samples,winRate:avg('win'),rounds:avg('rounds'),pressure:avg('pressure'),hp:avg('hp'),maxEnemyLevel:Math.max(...trials.map(t=>t.maxLevel)),minEnemies:Math.min(...trials.map(t=>t.count)),maxEnemies:Math.max(...trials.map(t=>t.count))});
  }}finally{Object.assign(globalThis,{save:original.save,render:original.render,note:original.note,rewardGroupKill:original.rewardGroupKill});Math.random=original.random;running=false;resetEncounter();}
  return out;
 },samples);
}
module.exports={simulate,simulateStarters};
if(require.main===module)(async()=>{const r=await openRuntime(path.resolve(__dirname,'..'));try{
 const geared=!process.argv.includes('--ungeared'),results=await simulate(r.page,{geared});results.starters=await simulateStarters(r.page);
 const output=process.argv[process.argv.indexOf('--output')+1];if(process.argv.includes('--output'))fs.writeFileSync(output,JSON.stringify(results,null,2));
 const failures=results.battles.filter(x=>x.winRate<1),starterFailures=results.starters.filter(x=>x.winRate<1);
 console.log(JSON.stringify({errors:r.errors,cases:results.battles.length,samples:24,failures,starters:results.starters,xp:results.xpRows}));
 if(r.errors.length||starterFailures.length||(geared&&(failures.length||results.battles.some(x=>x.rounds>25))))process.exitCode=1;
}finally{await r.browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
