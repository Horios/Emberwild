const test=require('node:test'),assert=require('node:assert/strict');
const {game,drive,json,report}=require('./realtime-combat-validation.cjs');
const duration=r=>r.run('Math.round(GS("combat.pacing.actionIntervalMs",900)/battleRate)');
test('5-minute foreground timeline at every supported rate presents each independent action once',()=>{
 for(const rate of [1,2]){const r=game({rate,durable:true});drive(r,300000);const out=report(r);
  assert(out.actions>100);assert.equal(out.maxActionsPerFrame,1);assert(out.minActionMs>=900/rate);assert(out.maxActionMs<=6000/rate);assert.equal(out.busy,false);assert.equal(r.run('party.offlineExploration.lastAt'),r.now);assert.deepEqual(r.errors,[]);
 }
});
test('short foreground stalls and save/UI syncs cannot overwrite an unpainted independent action',()=>{
 for(const rate of [1,2]){const r=game({rate,durable:true});drive(r,3000);const n=r.run('paceActions.length'),before=r.run('party.combatSession.idleTimeMs');r.advance(2300);r.run('save();EmberwildOffline.sync();tick()');
  assert(r.run('paceActions.length')-n<=1);assert.equal(r.run('EmberwildOffline.busy'),false);assert.equal(r.run('party.combatSession.idleTimeMs')-before,2300);
  const count=r.run('paceEvents.length'),wait=r.run('nextActionAt')-r.now;drive(r,wait-50);assert.equal(r.run('paceEvents.length'),count);drive(r,50);assert.equal(r.run('paceEvents.length'),count+1);assert.equal(report(r).maxActionsPerFrame,1);
 }
});
test('one lethal AoE stays one action; settlement and encounter spawn do not wait out the round minimum',()=>{
 for(const rate of [1,2]){const r=game({rate});r.run(`foes=foes.slice(0,3);foes.forEach(e=>{e.hp=1;e.maxhp=1;});initiativeOrder=()=>[{side:'hero',id:heroKey(state),actor:state}];`);
  const gap=duration(r);drive(r,50);assert.equal(r.run('paceActions.length'),1);assert.equal(r.run('paceActions[0].kind'),'技能');assert.equal(r.run('combatRoundProgress'),null);assert.equal(r.run('roundIterator'),null);assert.equal(r.run('state.totalKills'),3);assert.equal(r.run('activeBattleStat'),null);assert.equal(r.run('EmberwildBattleSummary.snapshot().hp'),0);assert.equal(r.run('nextActionAt')-r.now,gap);
  drive(r,gap);assert.equal(r.run('round'),0);assert(r.run('foes.some(e=>e.hp>0)'));assert.equal(r.run('nextActionAt')-r.now,gap);assert.equal(r.run('EmberwildBattleSummary.snapshot().result'),null);
  drive(r,gap);assert.equal(r.run('paceActions.length'),2);
 }
});
test('three independent single-target actions remain spaced while normal attacks, enemy initiative and companions retain order',()=>{
 const r=game();r.run(`foes=foes.slice(0,3);foes.forEach(e=>{e.hp=1;e.maxhp=1;});initiativeOrder=()=>[{side:'hero',id:heroKey(state),actor:state}];state.active=[];state.supportSlots=[];castPartySkill=()=>false;castSupport=()=>false;performHeroBasic=()=>{foes.find(e=>e.hp>0).hp=0;};`);
 drive(r,50);assert.equal(r.run('foes.filter(e=>e.hp<=0).length'),1);drive(r,900);assert.equal(r.run('foes.filter(e=>e.hp<=0).length'),1); // round completion
 drive(r,5100);assert.equal(r.run('foes.filter(e=>e.hp<=0).length'),2);drive(r,6000);assert.equal(r.run('state.totalKills'),3);assert.equal(report(r).maxActionsPerFrame,1);
 const team=game({durable:true});team.run(`running=false;resetEncounter();state.lv=8;syncParty();recruitCompanion(10);recruitCompanion(11);closeModal();party.active=party.members.map(h=>memberKey(h));refillParty();for(const h of heroes()){h.shield=1e12;h.active=[];h.supportSlots=[];}resetEncounter();spawnGroup();foes.forEach(e=>{e.hp=1e12;e.maxhp=1e12;e.atk=1;});combatRoundProgress=null;roundIterator=null;nextActionAt=0;running=true;EmberwildOffline.sync();globalThis.expectedOrder=initiativeOrder().map(u=>u.id);paceActions=[];castPartySkill=()=>false;castSupport=()=>false;`);
 assert.equal(team.run('heroes().length'),3);drive(team,12000);assert.deepEqual(json(team,'paceActions.slice(0,expectedOrder.length).map(a=>a.id)'),json(team,'expectedOrder'));assert.equal(report(team).maxActionsPerFrame,1);assert(team.run('foes.some(e=>e.hp<e.maxhp)'));
});
test('background replay and visibility resume remain unrestricted, quiet and do not open an offline receipt',async()=>{
 const r=game();r.ctx.document.hidden=true;r.dispatch('visibilitychange','document');r.advance(60000);await r.run('EmberwildOffline.settle(undefined,false)');assert(r.run('paceEvents.length')>5);assert.equal(r.run('party.offlineExploration.receipt'),null);
 r.ctx.document.hidden=false;r.dispatch('visibilitychange','document');await r.run('EmberwildOffline.settle(undefined,false)');r.run('paceActions=[];paceEvents=[];paceFrames=[];');drive(r,10000);assert.equal(report(r).maxActionsPerFrame,1);assert.equal(r.run('party.offlineExploration.pendingReceipt'),null);assert.notEqual(r.elements.get('offline-settlement').hidden,false);assert.deepEqual(r.errors,[]);
});
test('100 consecutive victories have one payout and only the encounter interval before each new spawn',()=>{
 const r=game();r.run(`initiativeOrder=()=>[{side:'hero',id:heroKey(state),actor:state}];state.active=[];state.supportSlots=[];castPartySkill=()=>false;castSupport=()=>false;performHeroBasic=()=>{foes.forEach(e=>e.hp=0);};globalThis.paceWins=[];const paceFinalize=finalizeBattleStatistics;finalizeBattleStatistics=function(result){if(activeBattleStat&&result==='victory')paceWins.push({at:Date.now(),count:foes.length,kills:state.totalKills});return paceFinalize(result);};`);
 drive(r,180000);const wins=json(r,'paceWins');assert(wins.length>=100);assert.equal(r.run('state.totalKills'),wins.reduce((n,x)=>n+x.count,0));for(let i=1;i<wins.length;i++)assert.equal(wins[i].at-wins[i-1].at,1800);assert.equal(report(r).maxActionsPerFrame,1);
});
test('hidden ticks keep the original coarse batching cadence and do not render every 50ms',async()=>{
 const r=game({rate:2,durable:true});r.ctx.document.hidden=true;r.dispatch('visibilitychange','document');
 await r.run('EmberwildOffline.settle(undefined,false)');r.run('paceActions=[];paceFrames=[];paceEvents=[];');
 r.advance(1000);r.run('tick()');const last=r.run('party.offlineExploration.lastAt');assert.equal(last,r.now);assert.equal(r.run('paceFrames.length'),0);assert(r.run('paceEvents.length')>=2);
 r.advance(50);r.run('tick()');assert.equal(r.run('party.offlineExploration.lastAt'),last);assert.equal(r.run('EmberwildOffline.busy'),false);
 r.ctx.document.hidden=false;r.dispatch('visibilitychange','document');await r.run('EmberwildOffline.settle(undefined,false)');assert.equal(r.run('party.offlineExploration.receipt'),null);r.run('paceActions=[];paceFrames=[];paceEvents=[];');drive(r,5000);assert.equal(report(r).maxActionsPerFrame,1);
});
test('a saved lethal action and encounter gap resume without duplicate payouts or minimum-round debt',()=>{
 const a=game();a.run(`initiativeOrder=()=>[{side:'hero',id:heroKey(state),actor:state}];castPartySkill=()=>false;castSupport=()=>false;performHeroBasic=()=>{foes.forEach(e=>e.hp=0);};`);drive(a,50);a.run('save()');const stored=json(a,'packParty()'),kills=a.run('state.totalKills'),gold=a.run('state.gold');
 assert.equal(stored.offlineExploration.combat.progress,null);assert.equal(stored.offlineExploration.nextAt-a.now,900);assert(stored.offlineExploration.combat.foes.every(e=>e.rewarded));
 const b=game();b.advance(a.now-b.now);b.ctx.paceSave=stored;b.ctx.nextSeed=a.run('paceSeed');b.ctx.nextSerial=a.run('uidSerial');b.run('loadParty(paceSave);paceSeed=nextSeed;uidSerial=nextSerial;');
 drive(a,900);drive(b,900);assert.equal(b.run('state.totalKills'),kills);assert.equal(b.run('state.gold'),gold);assert.deepEqual(json(b,'foes'),json(a,'foes'));assert.equal(b.run('nextActionAt')-b.now,900);assert.deepEqual(b.errors,[]);
});
