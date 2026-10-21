const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
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

test('all core skills of all classes respect each gem compatibility and three-tier effect',()=>{
 for(let job=0;job<4;job++){
  const r=game(job);
  const records=JSON.parse(r.run('JSON.stringify((()=>{'+
   'const h=playerHero(),rows=[];h.lv=60;h.advanced=true;h.skills=CLASSES[h.job].skills.map(()=>1);h.sockets=CLASSES[h.job].skills.map(()=>null);'+
   'const originalRandom=Math.random;'+
   'for(let i=0;i<CLASSES[h.job].skills.length;i++){'+
    'const sk=CLASSES[h.job].skills[i],isActive=sk[1]==="active",isProc=sk[1]==="proc";'+
    'let base=skillPower(i,h),power=[];for(const id of [0,5,10]){h.sockets[i]=id;power.push(skillPower(i,h));}'+
    'h.sockets[i]=null;const baseline=procChance(i,h),procs=[];for(const id of [2,7,12]){h.sockets[i]=id;procs.push(procChance(i,h));}'+
    'const baseCooldown=skillCooldown(i,h);h.sockets[i]=11;Math.random=()=>0;const cdOn=gemCooldownOnCast(i,h);Math.random=()=>.999;const cdOff=gemCooldownOnCast(i,h);'+
    'h.sockets[i]=3;h.hp=Math.floor(stats(h).hp/3);const beforeHeal=h.hp;applyGemAfterSkill(h,i,{atk:battleStats(h).atk});const lifeHeal=h.hp-beforeHeal;'+
    'h.sockets[i]=4;h.shield=20;applyGemAfterSkill(h,i,{atk:battleStats(h).atk});const shieldAdded=h.shield-20;'+
    'rows.push({skill:sk[0],isActive,isProc,compatible:[0,1,2,3,4].map(g=>gemCompatible(g,h.job,i)),base,power,baseline,procs,baseCooldown,cdOn,cdOff,lifeHeal,shieldAdded});h.sockets[i]=null;'+
   '}Math.random=originalRandom;return rows;})())'));
  assert(records.length>0,'no core skills for class '+job);
  for(const x of records){
   assert.deepEqual(x.compatible,[true,x.isActive,x.isProc,true,true],job+' '+x.skill+' compatibility');
   assert(x.power[0]>x.base&&x.power[1]>x.power[0]&&x.power[2]>x.power[1],job+' '+x.skill+' red tier progression');
   if(x.isProc)assert(x.procs[0]>=x.baseline&&x.procs[1]>=x.procs[0]&&x.procs[2]>=x.procs[1],job+' '+x.skill+' proc tiers');
   else assert.equal(x.procs[0],x.baseline,job+' '+x.skill+' active immune to proc gem');
   assert.equal(x.cdOff,x.baseCooldown,job+' '+x.skill+' failed wind roll');
   assert.equal(x.cdOn,x.isActive?Math.max(1,x.baseCooldown-1):x.baseCooldown,job+' '+x.skill+' wind roll');
   assert(x.lifeHeal>0,job+' '+x.skill+' life gem should heal');
   assert(x.shieldAdded>0,job+' '+x.skill+' guard gem should stack shields');
  }
  assert.deepEqual(r.errors,[]);
 }
});

test('alchemy spends five tier-one gems and ten tier-two gems in the existing five-second work lane',()=>{
 const r=game(0);
 r.run('playerHero().gems[0]=5;setTab("alchemy");');
 assert.match(r.elements.get('app').innerHTML,/赤焰石・1階 ×5/);
 assert.equal(r.run("startLifeWork('gem_0')"),true);
 r.advance(4999);r.run('tick()');assert.equal(r.run('playerHero().gems[0]'),5);
 r.advance(1);r.run('tick()');assert.equal(r.run('playerHero().gems[0]'),0);
 assert.equal(r.run('playerHero().gems[5]'),1);
 r.run('playerHero().gems[5]=10;');
 assert.equal(r.run("startLifeWork('gem_5')"),true);
 r.advance(5000);r.run('tick()');
 assert.equal(r.run('playerHero().gems[5]'),0);
 assert.equal(r.run('playerHero().gems[10]'),1);
 assert.equal(r.run("startLifeWork('gem_10')"),false,'no fourth tier recipe');
 assert.deepEqual(r.errors,[]);
});

test('existing saves migrate gem inventory and attached old gems without losing quantities',()=>{
 const r=game(0);
 const migrated=JSON.parse(r.run('JSON.stringify((()=>{const raw=JSON.parse(JSON.stringify(packParty()));raw.members[0].gems=[4,8,12];raw.members[0].sockets[0]=2;const valid=validateParty(raw);return {gems:valid.members[0].gems,socket:valid.members[0].sockets[0]};})())'));
 assert.equal(migrated.gems.length,15);
 assert.deepEqual(migrated.gems.slice(0,3),[4,8,12]);
 assert.equal(migrated.socket,3,'old resonance on active skill becomes life gem');
 assert.deepEqual(r.errors,[]);
});

test('a successful real core cast applies lowest-HP life gem and additive guard shield',()=>{
 const r=game(0);
 const values=JSON.parse(r.run('JSON.stringify((()=>{'+
  'const h=playerHero();h.skills[0]=1;h.lv=20;h.hp=Math.floor(stats(h).hp/2);'+
  'const foe={id:"gem-target",name:"假想敵",monsterId:"gem-target",kind:"normal",hp:999999,maxhp:999999,shield:0,atk:1,def:0,element:"physical",race:"beast",lv:1,turn:0,crit:0,evasion:0};'+
  'foes=[foe];h.sockets[0]=3;const before=h.hp;const a=castPartySkill(h,0,battleStats(h));const recovered=h.hp-before;'+
  'h.sockets[0]=4;h.shield=55;const b=castPartySkill(h,0,battleStats(h));return {a,b,recovered,shieldAdded:h.shield-55};'+
  '})())'));
 assert.equal(values.a,true);
 assert.equal(values.b,true);
 assert(values.recovered>0,'cast life gem');
 assert(values.shieldAdded>0,'cast guard gem adds to preexisting shield');
 assert.deepEqual(r.errors,[]);
});
