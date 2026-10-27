const test=require('node:test'),assert=require('node:assert/strict');
const {runtime,fixture,reset,replay,json}=require('./offline-fast-validation.cjs');
const r=runtime(),base=json(r,'packParty()');
function receipt(){return json(r,'party.offlineExploration.receipt||party.offlineExploration.pendingReceipt');}
function summary(){return json(r,'({kills:state.totalKills,gold:state.gold,xp:state.xp,bag:state.bag.length,lastAt:party.offlineExploration.lastAt})');}
test('three real hours precede fast replay; original drops, progress and durable receipt agree',async()=>{
 const save=fixture(r,base,'high'),phases=new Set(),schedule=r.ctx.setTimeout;
 r.ctx.setTimeout=fn=>{const html=r.elements.get('offline-settlement').innerHTML;if(html.includes('<progress')){const match=html.match(/max="(\d+)" value="(\d+)"/);assert(Number(match[2])<Number(match[1]));if(html.includes('正在分析'))phases.add('analysis');if(html.includes('正在快速'))phases.add('fast');if(html.includes('正在生成'))phases.add('drops');}return setImmediate(fn);};
 const out=await replay(r,save,8,123456,false);r.ctx.setTimeout=schedule;
 assert(out.metrics.fastBattles>0);assert.equal(out.metrics.hours.length,3);assert(out.metrics.fastMs<=5*3600000);assert.deepEqual([...phases].sort(),['analysis','drops','fast']);
 const rec=receipt();assert.equal(rec.kills,r.run('state.totalKills'));assert.equal(rec.gear.length,r.run('state.bag.length')-save.members[0].bag.length);assert.equal(rec.xp,out.xp);assert.equal(rec.effectiveMs,8*3600000);
 const committed=json(r,'packParty()'),before=summary();reset(r,committed);await r.run('EmberwildOffline.settle()');assert.deepEqual(summary(),before);assert.equal(r.run('acknowledgeOfflineExploration()'),true);assert.equal(r.run('acknowledgeOfflineExploration()'),false);assert.deepEqual(summary(),before);
});
test('a fast drop exception restores the atomic checkpoint and finishes in full mode',async()=>{
 const save=fixture(r,base,'high');r.run(`globalThis.fastFault=false;globalThis.originalKillForTest=rewardGroupKill;rewardGroupKill=function(e){const out=originalKillForTest(e);if(!fastFault&&EmberwildOffline.metrics?.phase==='正在生成掉落物品'){fastFault=true;throw Error('injected fast drop failure');}return out;};`);
 let out;try{out=await replay(r,save,8,123456,false);}finally{r.run('rewardGroupKill=originalKillForTest');}
 assert.equal(r.run('fastFault'),true);assert.equal(out.metrics.fallbacks['fast-error'],1);assert.match(out.metrics.lastFastError,/injected/);assert.equal(receipt().kills,r.run('state.totalKills'));assert.equal(receipt().gear.length,r.run('state.bag.length')-save.members[0].bag.length);
 const persisted=json(r,'packParty()'),before=summary();reset(r,persisted);await r.run('EmberwildOffline.settle()');assert.deepEqual(summary(),before);
});
test('a level boundary exits fast replay and rebuilds stats, points and overflow XP',async()=>{
 let save=fixture(r,base,'high');const one=await replay(r,save,1,123456,true);assert(one.xp>0);reset(r,save);r.ctx.hourXP=one.xp;r.run('state.xp=Math.max(0,need(state.lv)-hourXP*4);save()');save=json(r,'packParty()');
 const full=await replay(r,save,8,123456,true),fast=await replay(r,save,8,123456,false);
 assert(fast.metrics.fastBattles>0);assert(fast.metrics.fallbacks['level-boundary']>0);assert(fast.metrics.fallbacks['combat-state-change']>0);assert.equal(fast.lv,60);assert.equal(fast.lv,full.lv);assert.equal(r.run('state.xp'),0);assert.equal(r.run('state.ap'),r.run('EmberwildTeams.budget(state.lv,GAMEPLAY_SETTINGS.progression,party.buildSystem.permanent).ap-state.stats.reduce((a,b)=>a+b,0)'));
});
test('speed, XP and drop boosts expire at four hours and force fresh full samples',async()=>{
 const save=fixture(r,base,'boosts'),out=await replay(r,save,8,123456,false);assert(out.metrics.fastBattles>0);assert(out.metrics.fallbacks['time-boundary']>0);assert(out.metrics.fallbacks['combat-state-change']>0);assert.equal(r.run('battleRate'),1);assert(r.run('party.timedBoosts.every(b=>b.remainingMs===0)'));
 assert.deepEqual(Object.values(receipt().boosts).map(b=>b.ms),[4*3600000,4*3600000,4*3600000]);
});
test('inventory capacity still stops an encounter, and generated gear is preserved',async()=>{
 const save=fixture(r,base,'high');const warm=await replay(r,save,3,123456,true);r.run('GAMEPLAY_SETTINGS.equipment.bagCapacity='+String(warm.bag+1));
 const out=await replay(r,save,24,123456,false);assert(out.metrics.fastBattles>0);assert.equal(out.running,false);assert(out.bag>=warm.bag+1);assert.match(receipt().reason,/背包已滿/);assert(receipt().effectiveMs<24*3600000);assert.equal(receipt().gear.length,out.bag-save.members[0].bag.length);assert.equal(receipt().kills,r.run('state.totalKills'));r.run('GAMEPLAY_SETTINGS.equipment.bagCapacity=10000');
});
