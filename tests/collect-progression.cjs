/* Read final browser formulas, including companion recruitment and fixed BOSS stages. */
const {openRuntime}=require('./runtime.cjs');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{const r=await openRuntime(path.resolve(__dirname,'..'));try{
 const result=await r.page.evaluate(()=>{
  const original={save,render,note};save=()=>true;render=()=>{};note=()=>{};
  const classes=[],companions=[],monsters=[],xp=[],gearRows=[],pick=v=>({hp:v.hp,atk:v.atk,def:v.def,speed:v.speed});
  const defaults=exportableBalance();
  try{for(let level=1;level<=60;level++){
   for(let job=0;job<4;job++){
    const h=initial(job);h.lv=level;h.won=true;h.advanced=level>=15;h.bag=[];h.equipped=[];h.stats=[0,0,0];const bare=pick(stats(h));
    for(let n=0;n<(level-1)*3;n++)h.stats[[0,0,1][n%3]]++;
    classes.push({level,job,bare,allocated:pick(stats(h))});
   }
   const h=initial(0);h.lv=level;h.won=true;h.advanced=level>=15;party=createParty(h);state=h;party.cleared=true;party.map=MAPS.findIndex((m,i)=>!worldIsFinalMap(i)&&m.min<=level&&m.max>=level);syncParty();
   for(const plan of defaults.companions){recruitCompanion(plan.id);closeModal();const p=partyMember(plan.id);p.equipped=[];companions.push({level,id:plan.id,role:plan.role,stats:pick(stats(p))});}
   const mi=party.map,range={min:MAPS[mi].min,max:MAPS[mi].max};MAPS[mi].min=MAPS[mi].max=level;
   for(const mode of [0,1,2]){
    party.difficulty=mode;syncParty();
    for(const kind of ['normal','elite','boss']){
     let e;if(kind==='boss'){party.bossChallenge={active:true,mapIndex:mi,mapId:worldMapConfig(mi).id,stagePaid:true};spawnGroup();e=foes.find(e=>e.kind==='boss');party.bossChallenge=null;}else e=makeEnemy(mi,state,()=>kind==='elite'?.01:.9);
     monsters.push({level,mode,kind,hp:e.maxhp,atk:e.atk,def:e.def,xp:EmberwildProgression.enemyXp(GAMEPLAY_SETTINGS,level,kind,mode)});
    }
   }
   Object.assign(MAPS[mi],range);
   const requirement=need(level),normal=EmberwildProgression.enemyXp(GAMEPLAY_SETTINGS,level,'normal',0),share=EmberwildProgression.xpShare(normal,3);
   xp.push({level,requirement:level===60?null:requirement,normal,share,kills:level===60?null:Math.ceil(requirement/share),encounters:level===60?null:requirement/share/4.5,eliteShare:EmberwildProgression.xpShare(EmberwildProgression.enemyXp(GAMEPLAY_SETTINGS,level,'elite',0),3),bossShare:EmberwildProgression.xpShare(EmberwildProgression.enemyXp(GAMEPLAY_SETTINGS,level,'boss',0),3)});
  }
  for(const tier of [1,6,12])for(const slot of [0,1,2,3])for(const powerTier of [1,5,10])for(const plus of [0,5,10]){
   const g=gear(tier,slot,0,0);g.formJob=0;g.form=0;g.prefixId='';g.suffixId='';g.affix=[];g.powerTier=powerTier;g.plus=plus;
   gearRows.push({tier,slot,powerTier,plus,...gearStatBreakdown(g)});
  }
  }finally{Object.assign(globalThis,original);running=false;resetEncounter();}
  return {defaults,classes,companions,monsters,xp,gearRows};
 });
 if(r.errors.length)throw Error(r.errors.join('\n'));
 const output=process.argv[2];if(!output)throw Error('Usage: node tests/collect-progression.cjs output.json');fs.writeFileSync(output,JSON.stringify(result,null,2));
 console.log(JSON.stringify({classes:result.classes.length,companions:result.companions.length,monsters:result.monsters.length,xp:result.xp.length,gear:result.gearRows.length,errors:r.errors}));
 }finally{await r.browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
