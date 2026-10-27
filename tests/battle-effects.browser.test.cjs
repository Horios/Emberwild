'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openRuntime}=require('./runtime.cjs'),root=path.resolve(__dirname,'..');
async function setup(){const g=await openRuntime(root,'index.html',{}, {clockTime:new Date('2026-10-27T02:00:00Z')});await g.page.evaluate(()=>{
 selectSaveSlot(1);start(1);closeModal();clearInterval(timer);state.lv=8;syncParty();recruitCompanion(10);recruitCompanion(11);closeModal();party.active=party.members.map(h=>memberKey(h));startSelectedExploration();clearInterval(timer);spawnGroup();running=true;
 const base=foes[0];foes=Array.from({length:3},(_,i)=>({...base,name:'測試史萊姆',id:'fx-'+i,kind:i===2?'elite':'normal',hp:10000,maxhp:10000,shield:0}));enemy=foes[0];beginBattleStatistics();for(const h of heroes()){h.hp=stats(h).hp;h.shield=0;}render();
 globalThis.fxCapture=function(fn){EmberwildBattleEffects.begin();fn();EmberwildBattleEffects.end();globalThis.fxEvents=EmberwildBattleEffects.pendingEvents;EmberwildBattleSummary.sync();};
 });return g;}
const effects=p=>p.locator('#battleEnemyIcons .battle-fx').evaluateAll(nodes=>nodes.map(n=>({target:n.parentNode.dataset.enemyId,type:n.dataset.fx})));
test('actual hits, misses, AoE and shield outcomes reach only their own SVG icon and retain actor/elite identity',async()=>{
 const g=await setup(),p=g.page;try{
  await p.evaluate(()=>{recordAction(heroKey(state),characterName(state),'技能');fxCapture(()=>resolveHit(foes[1],50,state,'fire',false));});
  let rows=await effects(p);assert(rows.some(e=>e.target==='fx-1'&&e.type==='fire'));assert(!rows.some(e=>e.target!=='fx-1'));assert.equal(await p.locator('#battleEnemyIcons .battle-fx-projectile').count(),1);assert.equal(await p.locator('#battleAllyIcons .is-acting').count(),1);assert.equal(await p.locator('#battleEnemyIcons [data-enemy-id="fx-2"].is-elite .enemy-icon-elite').count(),1);
  await p.clock.runFor(800);assert.equal(await p.locator('.battle-fx').count(),0);
  await p.evaluate(()=>fxCapture(()=>castPartySkill(state,state.active[0],battleStats(state))));assert((await effects(p)).some(e=>e.type==='fire'));assert.equal(await p.locator('#battleAllyIcons [data-fx="cast"]').count(),1);await p.clock.runFor(800);
  await p.evaluate(()=>fxCapture(()=>foes.forEach(e=>resolveHit(e,50,state,'ice',false))));rows=await effects(p);assert.deepEqual(rows.filter(e=>e.type==='ice').map(e=>e.target),['fx-0','fx-1','fx-2']);
  await p.clock.runFor(800);await p.evaluate(()=>{foes[1].shield=10000;fxCapture(()=>resolveHit(foes[1],50,state,'fire',false));});rows=await effects(p);assert(rows.some(e=>e.type==='absorb'));assert(!rows.some(e=>e.type==='hit'||e.type==='fire'));
  await p.clock.runFor(800);await p.evaluate(()=>{foes[1].shield=1;fxCapture(()=>resolveHit(foes[1],50,state,'fire',false));});rows=await effects(p);for(const type of ['absorb','break','hit','fire'])assert(rows.some(e=>e.type===type),type);
  await p.clock.runFor(800);await p.evaluate(()=>{const base=enemyBattleStats;enemyBattleStats=e=>({...base(e),evasion:1});fxCapture(()=>resolveHit(foes[1],50,state,'fire',false));});rows=await effects(p);assert(rows.some(e=>e.type==='evade'));assert(!rows.some(e=>e.type==='fire'||e.type==='hit'));assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
test('healing and coexisting buff/debuff/shield markers use party IDs and expire cleanly',async()=>{
 const g=await setup(),p=g.page;try{
  assert.equal(await p.locator('#battleAllyIcons>div').count(),3);
  await p.evaluate(()=>{for(const h of heroes())h.hp=1;fxCapture(()=>EmberwildBattleEffects.scope({mode:'skill'},()=>heroes()[1].hp+=10));});
  const target=await p.evaluate(()=>heroKey(heroes()[1]));assert.equal(await p.locator('#battleAllyIcons [data-hero-id="'+target+'"] [data-fx="heal"]').count(),1);assert.equal(await p.locator('#battleAllyIcons [data-fx="heal"]').count(),1);
  await p.clock.runFor(800);await p.evaluate(()=>fxCapture(()=>{applyPureShield(heroes()[1],300);__EMBERWILD_STATUS_TEST_API.apply({id:'fx-b',name:'強化',polarity:'buff',duration:2,modifiers:[{kind:'guard',value:.1}]},state,heroes()[1]);__EMBERWILD_STATUS_TEST_API.apply({id:'fx-d',name:'弱化',polarity:'debuff',duration:2,modifiers:[{kind:'weaken',value:.1}]},foes[0],heroes()[1]);}));
  const icon=p.locator('#battleAllyIcons [data-hero-id="'+target+'"]');for(const type of ['shield','buff','debuff'])assert.equal(await icon.locator('[data-fx="'+type+'"]').count(),1,type);assert.equal(await icon.locator('.battle-fx-status>i').count(),3);
  await p.clock.runFor(800);assert.equal(await icon.locator('.battle-fx').count(),0);assert.equal(await icon.locator('.battle-fx-status>i').count(),3);
  await p.evaluate(()=>{partyClock+=3;heroes()[1].shield=0;EmberwildBattleSummary.sync();});assert.equal(await icon.locator('.battle-fx-status').count(),0);
  await p.evaluate(()=>fxCapture(()=>EmberwildBattleEffects.scope({mode:'regen'},()=>heroes()[1].hp+=1)));assert.equal(await icon.locator('[data-fx="regen"]').count(),1);assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
test('speed, reduced motion, settings persistence, bounded bursts, stale/dead targets and lifecycle cleanup',async()=>{
 const g=await setup(),p=g.page;try{
  for(const rate of [1,2]){await p.evaluate(rate=>{battleRate=rate;fxCapture(()=>resolveHit(foes[1],50,state,'fire',false));},rate);assert.equal(await p.locator('#battleEnemyIcons [data-fx="fire"]').evaluate(n=>n.style.getPropertyValue('--fx-time')),Math.round(510/rate)+'ms');await p.clock.runFor(800);}
  await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>fxCapture(()=>resolveHit(foes[1],50,state,'fire',false)));assert.equal(await p.locator('#battleEnemyIcons [data-fx="fire"]').getAttribute('data-detail'),'simple');assert.equal(await p.locator('.battle-fx-projectile').count(),0);
  await p.emulateMedia({reducedMotion:'no-preference'});
  await p.evaluate(()=>{for(let i=0;i<100;i++)fxCapture(()=>resolveHit(foes[1],1,state,'physical',false));});assert(await p.evaluate(()=>EmberwildBattleEffects.activeCount)<=12);await p.clock.runFor(1000);assert.equal(await p.locator('.battle-fx').count(),0);assert.equal(await p.evaluate(()=>EmberwildBattleEffects.activeCount),0);
  await p.evaluate(()=>{EmberwildBattleEffects.begin();resolveHit(foes[1],50,state,'fire',false);EmberwildBattleEffects.end();});await p.clock.runFor(800);await p.evaluate(()=>EmberwildBattleSummary.sync());assert.equal(await p.locator('.battle-fx').count(),0);
  await p.evaluate(()=>{fxCapture(()=>{resolveHit(foes[1],50000,state,'fire',false);});});assert.equal(await p.locator('#battleEnemyIcons [data-enemy-id="fx-1"] .battle-fx').count(),0);
  await p.evaluate(()=>fxCapture(()=>resolveHit(foes[0],50,state,'fire',false)));await p.evaluate(()=>setTab('options'));assert.equal(await p.locator('.battle-fx').count(),0);assert.equal(await p.locator('[data-battle-effects]').count(),1);
  await p.locator('[data-battle-effects]').selectOption('off');assert.equal(await p.evaluate(()=>EmberwildBattleEffects.preference),'off');assert.equal(await p.evaluate(()=>localStorage.getItem('emberwild-battle-effects')),'off');await p.evaluate(()=>{setTab('battle');fxCapture(()=>resolveHit(foes[0],50,state,'fire',false));});assert.equal(await p.locator('.battle-fx').count(),0);
  await p.reload();assert.equal(await p.evaluate(()=>EmberwildBattleEffects.preference),'off');assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
test('desktop/mobile animation frames preserve icon boxes and readable HP; capture visual QA frames',async()=>{
 const g=await setup(),p=g.page;try{
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]){
   await p.setViewportSize(size);await p.evaluate(()=>render());const before=await p.locator('#battleEnemyIcons>div').evaluateAll(ns=>ns.map(n=>({w:n.offsetWidth,h:n.offsetHeight})));
   await p.evaluate(()=>{recordAction(heroKey(state),characterName(state),'技能');fxCapture(()=>foes.forEach(e=>resolveHit(e,50,state,'fire',false)));});await p.clock.runFor(100);
   assert.deepEqual(await p.locator('#battleEnemyIcons>div').evaluateAll(ns=>ns.map(n=>({w:n.offsetWidth,h:n.offsetHeight}))),before);
   assert.equal(await p.locator('#battleEnemyIcons .is-elite').count(),1);assert.equal(await p.locator('#battleAllyIcons .is-acting').count(),1);
   assert(await p.locator('[data-summary-hp]').isVisible());assert(await p.locator('#battleEnemyIcons').isVisible());
   await p.locator('#battleEnemyIcons').screenshot({path:'/tmp/emberwild-fx-icons-'+size.width+'.png'});await p.screenshot({path:'/tmp/emberwild-fx-'+size.width+'.png'});await p.clock.runFor(800);
  }
  await p.setViewportSize({width:1440,height:900});await p.evaluate(()=>{for(const h of heroes())h.hp=1;fxCapture(()=>{EmberwildBattleEffects.scope({mode:'skill'},()=>heroes()[1].hp+=10);applyPureShield(heroes()[0],300);});});await p.clock.runFor(100);await p.screenshot({path:'/tmp/emberwild-fx-recovery.png'});assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
