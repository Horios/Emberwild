const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const json=(r,code)=>JSON.parse(r.run('JSON.stringify('+code+')'));
const {loadRuntime}=require('./headless-runtime.cjs');
const root=path.resolve(__dirname,'..');
const game=job=>{
 const r=loadRuntime(root);
 r.run('selectSaveSlot(1);start('+job+');closeModal();');
 return r;
};

test('five identities, three tiers, color mappings and reduced first-tier drop tables',()=>{
 const r=game(0);
 const gems=JSON.parse(r.run('JSON.stringify(GEMS)'));
 assert.equal(gems.length,15);
 assert.deepEqual(gems.slice(0,5).map(g=>g.name.split('・')[0]),['赤焰石','疾風石','靈巧石','生息石','守護石']);
 for(let tier=0;tier<3;tier++)for(let type=0;type<5;type++){
  const id=tier*5+type;
  assert.equal(gems[id].tier,tier+1);
  assert.equal(gems[id].kind,type);
 }
 const doc=JSON.parse(r.run('JSON.stringify(exportableBalance())'));
 const colors=['#EF5D5D','#49B976','#AE83EC','#E8EDF7','#64AAF0'];
 for(let id=0;id<15;id++)assert.equal(doc.inventoryIcons.find(x=>x.kind==='gem'&&x.key===String(id)).color,colors[id%5]);
 const drops=doc.balanceSettings.drops.entries.filter(x=>x.type==='gem');
 assert.deepEqual(drops.find(x=>x.id==='gem_normal').chanceByDifficulty,[.03,.06,.10]);
 assert.deepEqual(drops.find(x=>x.id==='gem_elite').chanceByDifficulty,[.09,.17,.27]);
 assert.deepEqual(drops.find(x=>x.id==='gem_boss').chanceByDifficulty,[.27,.40,.55]);
 assert.deepEqual(r.errors,[]);
});

test('canonical player skills use first equipment socket for compatible three-tier gem effects only',()=>{
 for(let job=0;job<4;job++){
  const r=game(job);
  const rows=json(r,`(()=>{
   const h=playerHero(),S=__EMBERWILD_SKILLS,E=__EMBERWILD_EQUIPMENT_SKILLS;
   h.lv=60;h.advanced=true;h.mastery=Object.fromEntries(Object.keys(h.mastery).map(k=>[k,100000]));
   const g=gear(1,3,0,h.job);Object.assign(g,{id:'gem-matrix',formJob:h.job,form:0,affix:[],prefixId:'',suffixId:'',skillSockets:{version:1,count:3,gems:[null,null,null],firstMode:'skill'}});state.bag.push(g);h.equipped[3]=g.id;
   const rows=[],originalRandom=Math.random;
   try{for(const sk of S.system().definitions.filter(sk=>sk.jobs.includes(h.job)&&sk.partnerId==null&&sk.type!=='passive'&&sk.adapter.kind==='core')){
    const i=EmberwildSkillSystem.adapterFor(sk,h.job).index;
    g.skillId=sk.id;h.activeSkillEquipmentId=g.id;g.skillSockets.gems=[null,null,null];E.refresh(h);
    const base=skillPower(i,h),baseline=procChance(i,h),baseCooldown=skillCooldown(i,h),power=[],procs=[],rates=[];
    const socket=id=>{g.skillSockets.gems[0]=id;E.refresh(h);};
    for(const id of [0,5,10]){socket(id);power.push(skillPower(i,h));rates.push(gemRate(h,i,0));}
    for(const id of [2,7,12]){socket(id);procs.push(procChance(i,h));}
    socket(11);Math.random=()=>0;const cdOn=gemCooldownOnCast(i,h);Math.random=()=>.999;const cdOff=gemCooldownOnCast(i,h);
    socket(3);h.hp=1;const beforeHeal=h.hp;applyGemAfterSkill(h,i,{atk:1000});const lifeHeal=h.hp-beforeHeal;
    socket(4);h.hp=1;h.shield=20;applyGemAfterSkill(h,i,battleStats(h));const shieldAdded=h.shield-20;
    socket(0);const enabled=gemRate(h,i,0);g.skillSockets.gems=[null,0,10];E.refresh(h);const otherSockets=gemRate(h,i,0),secondMode=E.mode(h,g,1),thirdMode=E.mode(h,g,2);
    g.skillSockets.gems=[0,null,null];h.activeSkillEquipmentId=null;E.refresh(h);const inactive=gemRate(h,i,0);
    h.activeSkillEquipmentId=g.id;g.skillSockets.firstMode='base';E.refresh(h);const baseMode=gemRate(h,i,0);g.skillSockets.firstMode='skill';
    rows.push({id:sk.id,isActive:sk.type==='active',isProc:sk.type==='proc',compatible:[0,1,2,3,4].map(id=>gemCompatible(id,h.job,i)),base,power,rates,baseline,procs,baseCooldown,cdOn,cdOff,lifeHeal,shieldAdded,enabled,otherSockets,secondMode,thirdMode,inactive,baseMode});
   }}finally{Math.random=originalRandom;}return rows;
  })()`);
  assert(rows.length>0,'no canonical player core skills for class '+job);
  for(const x of rows){
   assert.deepEqual(x.compatible,[true,x.isActive,x.isProc,true,true],x.id+' compatibility');
   assert.deepEqual(x.rates,[.02,.04,.06],x.id+' red tiers');
   if(x.base>0)assert(x.power[0]>x.base&&x.power[1]>x.power[0]&&x.power[2]>x.power[1],x.id+' red power');
   if(x.isProc)assert(x.procs[0]>x.baseline&&x.procs[1]>x.procs[0]&&x.procs[2]>x.procs[1],x.id+' proc tiers');
   else assert.deepEqual(x.procs,[x.baseline,x.baseline,x.baseline],x.id+' active immune to proc gem');
   assert.equal(x.cdOff,x.baseCooldown,x.id+' failed wind roll');
   assert.equal(x.cdOn,x.isActive?Math.max(1,x.baseCooldown-1):x.baseCooldown,x.id+' wind roll');
   assert.equal(x.lifeHeal,30,x.id+' life gem applies once');assert(x.shieldAdded>0,x.id+' guard gem stacks');
   assert.equal(x.enabled,.02);assert.equal(x.otherSockets,0);assert.equal(x.secondMode,'base');assert.equal(x.thirdMode,'base');assert.equal(x.inactive,0);assert.equal(x.baseMode,0);
  }
  assert.deepEqual(r.errors,[]);
 }
});

test('alchemy spends five tier-one gems and ten tier-two gems in the existing five-second work lane',async()=>{
 const r=game(0);
 // Resolve the offline manager's asynchronous persistence in this headless clock.
 r.ctx.setTimeout=fn=>setImmediate(fn);
 r.run('playerHero().gems[0]=5;setTab("alchemy");');
 assert.match(r.elements.get('app').innerHTML,/赤焰石・1階 ×5/);
 assert.equal(r.run("startLifeWork('gem_0')"),true);
 // The combat tick performs asynchronous offline catch-up after a simulated
 // five-second clock jump. Exercise the life-work heartbeat directly here.
 r.advance(4999);r.run('tickLifeSkills()');
 assert.equal(r.run('playerHero().gems[0]'),5);
 assert.equal(r.run('__EMBERWILD_LIFE_SKILLS.jobs.work.elapsed'),4999);
 r.advance(1);r.run('tickLifeSkills()');
 await r.run('EmberwildOffline.settle()');
 assert.equal(r.run('playerHero().gems[0]'),0);
 assert.equal(r.run('playerHero().gems[5]'),1);
 assert.equal(r.run('__EMBERWILD_LIFE_SKILLS.jobs.work'),null);
 r.run('playerHero().gems[5]=10;');
 assert.equal(r.run("startLifeWork('gem_5')"),true);
 r.advance(5000);r.run('tickLifeSkills()');
 await r.run('EmberwildOffline.settle()');
 assert.equal(r.run('playerHero().gems[5]'),0);
 assert.equal(r.run('playerHero().gems[10]'),1);
 assert.equal(r.run("startLifeWork('gem_10')"),false,'no fourth tier recipe');
 const persisted=loadRuntime(root,'index.html',Object.fromEntries(r.values),r.now);
 persisted.run('continueFromTitle();closeModal()');
 assert.equal(persisted.run('playerHero().gems[0]'),0);
 assert.equal(persisted.run('playerHero().gems[10]'),1);
 assert.deepEqual(r.errors,[]);
 assert.deepEqual(persisted.errors,[]);
});

test('legacy three-kind gems refund from shared skill instances once and survive validated reloads',()=>{
 const r=game(0);
 r.ctx.legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/legacy-skills-job0.json'),'utf8'));
 const out=json(r,`(()=>{
  const raw=structuredClone(legacy),h=raw.members[0],b=raw.buildSystem;
  h.gems=[4,8,12];h.sockets[0]=2;
  b.permanent.gemInstances={'old-red':0,'old-green':1,'old-resonance':2};
  const plan=b.plans[0];plan.sockets[0]='old-resonance';plan.sockets[2]='old-green';plan.sockets[4]='old-red';
  const converted=migrateLegacyGemSave(raw),valid=validateParty(raw);
  loadParty(raw);const first=structuredClone(state.gems);save();loadParty(structuredClone(packParty()));
  return {converted:converted.buildSystem.permanent.gemInstances,valid:valid.members[0].gems,first,again:state.gems,sockets:state.sockets,instances:party.buildSystem.permanent.gemInstances,rawStock:raw.members[0].gems,rawInstances:raw.buildSystem.permanent.gemInstances};
 })()`);
 assert.deepEqual(out.converted,{'old-red':0,'old-green':2,'old-resonance':3});
 assert.deepEqual(out.valid,[5,8,13,1,...Array(11).fill(0)]);assert.deepEqual(out.first,out.valid);assert.deepEqual(out.again,out.valid);
 assert(out.sockets.every(id=>id===null));assert.deepEqual(out.instances,{});assert.deepEqual(out.rawStock,[4,8,12]);assert.deepEqual(out.rawInstances,{'old-red':0,'old-green':1,'old-resonance':2});assert.deepEqual(r.errors,[]);
});

test('actual equipped and configured casts heal the lowest-HP ally and add guard shield exactly once',()=>{
 const r=game(0);
 const out=json(r,`(()=>{
  const h=playerHero();h.lv=20;syncParty();recruitCompanion(10);closeModal();party.active=[memberKey(h),10];
  const ally=partyMember(10),g=gear(1,3,0,h.job),results=[];
  Object.assign(g,{id:'cast-gem-item',skillId:'class0-initial0',skillSockets:{version:1,count:3,gems:[null,null,null],firstMode:'skill'}});state.bag.push(g);equipSharedGear(g.id,memberKey(h),3);
  const target=()=>{foes=[{id:'gem-target',name:'假想敵',monsterId:'map0_mob0',kind:'normal',hp:999999,maxhp:999999,shield:0,atk:1,def:0,element:'physical',race:'beast',lv:1,turn:0,crit:0,evasion:0}];enemy=foes[0];};
  h.gems[3]=h.gems[4]=1;
  for(const id of ['class0-initial0','class0-initial2']){
  foes=[];enemy=null;g.skillId=id;const selected=selectSkillEquipment(g.id),configured=configureSkill('active',0,id),i=h.active[0];h.hp=stats(h).hp;ally.hp=1;
  const lifeSocket=socketEquipmentGem(g.id,0,3);target();const before=ally.hp,v=battleStats(h),wantHeal=Math.min(stats(ally).hp-before,Math.max(1,Math.round(v.atk*.03))),lifeCast=castPartySkill(h,i,v),recovered=ally.hp-before;
  foes=[];enemy=null;const guardSocket=socketEquipmentGem(g.id,0,4);target();ally.hp=1;ally.shield=55;h.shield=0;const wantShield=Math.max(1,Math.round(stats(h).def*.01)),guardCast=castPartySkill(h,i,battleStats(h)),shieldAdded=ally.shield-55;
  const bad=castPartySkill(h,0,battleStats(h)),afterFailed=ally.shield;
  results.push({id,selected,configured,lifeSocket,guardSocket,lifeCast,guardCast,wantHeal,recovered,wantShield,shieldAdded,casterShield:h.shield,bad,afterFailed});
  }return results;
 })()`);
 assert.equal(out.length,2);
 for(const row of out){for(const key of ['selected','configured','lifeSocket','guardSocket','lifeCast','guardCast'])assert.equal(row[key],true,row.id+' '+key);
 assert(row.wantHeal>0);assert.equal(row.recovered,row.wantHeal,row.id+' heals once');assert.equal(row.shieldAdded,row.wantShield,row.id+' shields once');assert.equal(row.casterShield,0);assert.equal(row.bad,false);assert.equal(row.afterFailed,55+row.wantShield);}
 assert.deepEqual(r.errors,[]);
});
