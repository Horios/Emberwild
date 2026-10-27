const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs'),root=path.resolve(__dirname,'..'),seed=require('../data/balance.json');
const json=(r,s)=>JSON.parse(r.run('JSON.stringify('+s+')'));
function game(){const r=loadRuntime(root);r.ctx.seed=seed;r.ctx.setTimeout=fn=>setImmediate(fn);r.run('applyBalanceConfig(seed,{persist:false});selectSaveSlot(1);start(0);closeModal();globalThis.auditRng=123456;Math.random=()=>{auditRng=(Math.imul(auditRng,1664525)+1013904223)>>>0;return auditRng/4294967296;};startSelectedExploration();save()');return r;}
test('invalid resumed token state is rejected before replacing a valid live party',()=>{
 const r=game(),before=json(r,'packParty()');r.run('globalThis.originalParty=party');const bad=structuredClone(before);bad.offlineExploration.combat.states[3]=[null];r.ctx.bad=bad;
 assert.throws(()=>r.run('loadParty(bad)'));assert.equal(r.run('party===originalParty'),true);assert.deepEqual(json(r,'packParty()'),before);
});
test('malformed resumable cursor references are rejected without publishing partial state',()=>{
 const r=game(),before=json(r,'packParty()');r.run('globalThis.originalParty=party');
 for(const order of [[null],[{side:'alien',id:'hero-0'}],[{side:'hero',id:'missing'}]]){
  const bad=structuredClone(before);bad.offlineExploration.combat.progress={order,index:0,unit:null};r.ctx.bad=bad;assert.throws(()=>r.run('loadParty(bad)'),/離線/);assert.equal(r.run('party===originalParty'),true);assert.deepEqual(json(r,'packParty()'),before);
 }
});
test('combined storage read and write failure keeps a recoverable checkpoint and retry pays time once',async()=>{
 const r=game(),key=r.run('KEY'),raw=r.values.get(key),read=r.ctx.localStorage.getItem,write=r.ctx.localStorage.setItem;
 r.ctx.localStorage.getItem=k=>{if(k===key)throw Error('storage denied');return read(k);};r.ctx.localStorage.setItem=()=>{throw Error('storage denied');};r.advance(60000);
 await assert.doesNotReject(r.run('EmberwildOffline.settle()'));assert.equal(r.run('EmberwildOffline.failed'),true);assert.equal(r.values.get(key),raw);assert.equal(r.run('party.offlineExploration.lastAt'),JSON.parse(raw).offlineExploration.lastAt);
 r.ctx.localStorage.getItem=read;r.ctx.localStorage.setItem=write;await r.run('retryOfflineExploration()');assert.equal(r.run('EmberwildOffline.failed'),false);assert.equal(r.run('party.offlineExploration.lastAt'),r.now);const kills=r.run('state.totalKills');await r.run('EmberwildOffline.settle()');assert.equal(r.run('state.totalKills'),kills);
});

test('changing difficulty cannot clear an encounter before its elapsed time has settled',async()=>{
 const a=game(),b=game();a.advance(60000);b.advance(60000);
 b.run('changeDifficulty(1)');assert.equal(b.run('party.difficulty'),0);assert.equal(b.run('EmberwildOffline.busy'),true);
 await Promise.all([a.run('EmberwildOffline.settle()'),b.run('EmberwildOffline.settle()')]);
 for(const value of ['state.totalKills','state.gold','state.xp','party.offlineExploration.lastAt'])assert.equal(b.run(value),a.run(value),value);
 b.run('changeDifficulty(1)');assert.equal(b.run('party.difficulty'),1);assert.equal(b.run('running'),false);
});
test('speed-expiry linking changes apply after elapsed time, never retroactively',async()=>{
 const r=game();r.run(`for(const id of ['speed2_30m','exp_100_30m']){state.consumables[id]=1;useSupply(id);}setBattleSpeed(2);party.timedBoosts[0].remainingMs=1000;party.timedBoosts[1].remainingMs=10000;save();`);r.advance(5000);
 // A short foreground gap now settles wall-clock boosts synchronously before
 // applying the UI change; it no longer has to reject the action for replay.
 r.run('setPauseBoostsOnSpeedEnd(true)');assert.equal(r.run('party.combatSession.pauseBoostsOnSpeedEnd'),true);await r.run('EmberwildOffline.settle()');assert.equal(r.run('party.timedBoosts[1].remainingMs'),5000);assert.equal(r.run('party.timedBoosts[1].enabled'),true);
 r.run('setPauseBoostsOnSpeedEnd(true)');assert.equal(r.run('party.combatSession.pauseBoostsOnSpeedEnd'),true);
});

test('shop purchases wait for the old timeline instead of supplying items retroactively',async()=>{
 const r=game();r.run(`state.gold=10000;save();globalThis.auditOffer=exportableBalance().shopSettings.fixedOffers.entries.find(o=>o.enabled&&o.type==='item'&&SHOP.some(i=>i.id===o.key&&i.type==='healPotion'));`);assert(r.run('!!auditOffer'));const gold=r.run('state.gold'),stock=r.run('healPotionCount(auditOffer.key)');r.advance(60000);
 r.run('buyFixedShopOffer(auditOffer.id)');assert.equal(r.run('state.gold'),gold);assert.equal(r.run('healPotionCount(auditOffer.key)'),stock);await r.run('EmberwildOffline.settle()');const after=r.run('healPotionCount(auditOffer.key)');r.run('buyFixedShopOffer(auditOffer.id)');assert.equal(r.run('healPotionCount(auditOffer.key)'),after+r.run('auditOffer.quantity'));
});

test('delayed ticks still advance and persist gathering and alchemy after asynchronous catch-up',async()=>{
 const r=game();r.run('stopTeamExploration();Math.random=()=>.99;startLifeGathering();');const before=r.run('materialCount("紅色草")');
 for(let i=0;i<5;i++){r.advance(1001);r.run('tick()');await r.run('EmberwildOffline.settle(undefined,false)');}
 assert.equal(r.run('materialCount("紅色草")'),before+1);assert.equal(JSON.parse(r.values.get(r.run('KEY'))).members[0].materials['紅色草'],before+1);
 r.run('stopLifeGathering();for(const name of ["紅色草","清水","藥水瓶"])setMaterialCount(name,3);startLifeWork("alchemy");');const potions=r.run('healPotionCount("heal_small")');
 for(let i=0;i<5;i++){r.advance(1001);r.run('tick()');await r.run('EmberwildOffline.settle(undefined,false)');}
 assert.equal(r.run('healPotionCount("heal_small")'),potions+1);assert.equal(r.run('materialCount("清水")'),2);assert.equal(JSON.parse(r.values.get(r.run('KEY'))).members[0].healingPotions.heal_small,potions+1);
});

test('an old completed empty receipt cannot hide every future valid receipt',async()=>{
 const r=game(),raw=json(r,'packParty()');raw.offlineExploration.version=1;raw.offlineExploration.resumeRunning=true;raw.offlineExploration.receipt={id:'legacy-empty',start:r.now-1000,end:r.now,complete:true,levels:[],gear:[],items:{},boosts:{},effectiveMs:1000,kills:0,xp:0,goldGained:0,goldSpent:0};r.ctx.saved=raw;r.run('loadParty(saved)');r.advance(60000);await r.run('EmberwildOffline.settle()');
 assert.notEqual(r.run('party.offlineExploration.receipt?.id'),'legacy-empty');assert(r.run('party.offlineExploration.receipt?.xp>0'));assert.equal(r.elements.get('offline-settlement').hidden,false);
});

test('starting a daily task waits for prior battles so their kills cannot count retroactively',async()=>{
 const r=game();r.run("globalThis.auditTask=state.board.tasks[0];");assert(r.run('!!auditTask'));r.advance(60000);
 r.run('startDailyCommission(auditTask.id)');assert.equal(r.run('auditTask.started'),false);await r.run('EmberwildOffline.settle()');r.run('startDailyCommission(auditTask.id)');assert.equal(r.run('auditTask.started'),true);assert.equal(r.run('auditTask.objectives[0].progress||0'),0);
});

test('auto-potion changes wait for old combat and cannot mutate a save owned by another tab',async()=>{
 const r=game(),before=r.run('playerHero().autoPotionThresholdPct');r.advance(60000);r.run('setHeroAutoPotionThreshold(memberKey(playerHero()),99)');assert.equal(r.run('playerHero().autoPotionThresholdPct'),before);await r.run('EmberwildOffline.settle()');r.run('setHeroAutoPotionThreshold(memberKey(playerHero()),99)');assert.equal(r.run('playerHero().autoPotionThresholdPct'),99);
 r.run('__EMBERWILD_SAVE_OWNER=false;setHeroAutoPotionThreshold(memberKey(playerHero()),1)');assert.equal(r.run('playerHero().autoPotionThresholdPct'),99);
});

test('enhancing worn equipment cannot change the stats used for earlier elapsed battles',async()=>{
 const r=game();r.run('state.ore=100000;state.dust=100000;globalThis.auditGear=state.bag.find(g=>state.equipped.includes(g.id));save();');assert(r.run('!!auditGear'));const plus=r.run('auditGear.plus');r.advance(60000);r.run('enhance(auditGear.id)');assert.equal(r.run('auditGear.plus'),plus);await r.run('EmberwildOffline.settle()');r.run('enhance(auditGear.id)');assert.equal(r.run('auditGear.plus'),plus+1);
});

test('failed settings persistence restores health, shields, cooldowns and the original rules',()=>{
 const r=game();r.run('stopTeamExploration();playerHero().hp=4;playerHero().shield=3;actorCooldowns={"0-0":8};save();globalThis.beforeImport=structuredClone(packParty());globalThis.rulesBefore=exportableBalance();globalThis.saveBefore=save;save=()=>false;');
 assert.throws(()=>r.run('const candidate=exportableBalance();candidate.teamSettings.maxPlans=4;applyBalanceConfig(candidate)'),/儲存/);assert.deepEqual(json(r,'packParty()'),json(r,'beforeImport'));assert.deepEqual(json(r,'exportableBalance()'),json(r,'rulesBefore'));assert.equal(r.run('actorCooldowns["0-0"]'),8);r.run('save=saveBefore');
});
