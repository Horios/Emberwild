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
  assert.equal(await p.locator('#battleAllyIcons>[data-hero-id]').count(),3);
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
   await p.setViewportSize(size);await p.evaluate(()=>render());const before=await p.locator('#battleEnemyIcons>[data-enemy-id]').evaluateAll(ns=>ns.map(n=>({w:n.offsetWidth,h:n.offsetHeight})));
   await p.evaluate(()=>{recordAction(heroKey(state),characterName(state),'技能');fxCapture(()=>foes.forEach(e=>resolveHit(e,50,state,'fire',false)));});await p.clock.runFor(100);
   assert.deepEqual(await p.locator('#battleEnemyIcons>[data-enemy-id]').evaluateAll(ns=>ns.map(n=>({w:n.offsetWidth,h:n.offsetHeight}))),before);
   assert.equal(await p.locator('#battleEnemyIcons .is-elite').count(),1);assert.equal(await p.locator('#battleAllyIcons .is-acting').count(),1);
   assert(await p.locator('[data-summary-hp]').isVisible());assert(await p.locator('#battleEnemyIcons').isVisible());
   await p.locator('#battleEnemyIcons').screenshot({path:'/tmp/emberwild-fx-icons-'+size.width+'.png'});await p.screenshot({path:'/tmp/emberwild-fx-'+size.width+'.png'});await p.clock.runFor(800);
  }
  await p.setViewportSize({width:1440,height:900});await p.evaluate(()=>{for(const h of heroes())h.hp=1;fxCapture(()=>{EmberwildBattleEffects.scope({mode:'skill'},()=>heroes()[1].hp+=10);applyPureShield(heroes()[0],300);});});await p.clock.runFor(100);await p.screenshot({path:'/tmp/emberwild-fx-recovery.png'});assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});

test('each resolved effect is mirrored once on the matching HP block, including same-name AoE and special outcomes',async()=>{
 const g=await setup(),p=g.page;try{
  async function check(code,expected,target='fx-1'){
   await p.clock.runFor(800);
   await p.evaluate(code=>{fxCapture(()=>{(0,eval)(code);});},code);
   const both=await p.evaluate(()=>{
    const collect=(selector,key)=>Object.fromEntries([...document.querySelectorAll(selector)].map(n=>[n.dataset[key],[...n.querySelectorAll(':scope > .battle-fx')].map(e=>e.dataset.fx).sort()]));
    return {icons:{...collect('#battleAllyIcons>[data-hero-id]','heroId'),...collect('#battleEnemyIcons>[data-enemy-id]','enemyId')},health:collect('.squad-field .unit[data-combat-id]','combatId')};
   });
   assert.deepEqual(both.health,both.icons,code);
   for(const type of expected)assert(both.health[target].includes(type),type+' on '+target);
   for(const [key,types] of Object.entries(both.health))assert.equal(new Set(types).size,types.length,'no duplicate effect on '+key);
   return both;
  }
  const hero=await p.evaluate(()=>heroKey(state));
  for(const element of ['physical','fire','ice','wind','light','shadow'])await check(`resolveHit(foes[1],50,state,'${element}',false)`,[element==='physical'?'slash':element,'hit']);
  await check(`EmberwildBattleEffects.scope({ranged:true},()=>resolveHit(foes[1],50,state,'physical',false))`,['ranged','hit']);
  await check(`EmberwildBattleEffects.scope({mode:'damage',element:null},()=>foes[1].hp-=1)`,['impact','hit']);
  const aoe=await check(`foes.forEach(e=>resolveHit(e,50,state,'fire',false))`,['fire','hit']);for(const key of ['fx-0','fx-1','fx-2'])assert(aoe.health[key].includes('fire'));
  await check(`applyPureShield(state,10000)`,['shield'],hero);
  await p.evaluate(()=>heroes().forEach(h=>h.shield=10000));const blocked=await check(`castEnemySharedSkill(foes[0],{name:'測試魔法',effect:'damage',element:'fire',activation:'active',power:1,maxTargets:1,meta:{}})`,[],hero);
  assert(Object.values(blocked.health).some(types=>types.includes('absorb')));assert(!Object.values(blocked.health).some(types=>types.includes('hit')));
  await p.evaluate(()=>{foes[1].shield=1;});await check(`resolveHit(foes[1],50,state,'fire',false)`,['absorb','break','fire','hit']);
  await p.evaluate(()=>{state.shield=500;});await check(`EmberwildBattleEffects.scope({mode:'skill'},()=>state.shield=0)`,['dissolve'],hero);
  await p.evaluate(()=>state.hp=1);
  await check(`EmberwildBattleEffects.scope({mode:'skill'},()=>state.hp+=2)`,['heal'],hero);
  await check(`EmberwildBattleEffects.scope({mode:'regen'},()=>state.hp+=2)`,['regen'],hero);
  await check(`EmberwildBattleEffects.scope({mode:'damage'},()=>state.hp+=2)`,['drain'],hero);
  await p.evaluate(()=>{state.hp=1;state.healingPotions.heal_small=3;state.healPotionCooldownRemaining=0;});await check(`useAutoHealingPotion(state)`,['potion'],hero);
  await check(`__EMBERWILD_STATUS_TEST_API.apply({id:'hpfx-buff',name:'強化',tags:['modifier'],polarity:'buff',duration:3,modifiers:[{kind:'guard',value:.1}]},state,state)`,['buff'],hero);
  await check(`__EMBERWILD_STATUS_TEST_API.apply({id:'hpfx-debuff',name:'弱化',tags:['modifier'],polarity:'debuff',duration:3,modifiers:[{kind:'weaken',value:.1}]},state,foes[1])`,['debuff']);
  await p.evaluate(()=>foes[1].kind='boss');const resisted=await check(`__EMBERWILD_CONTROL_TEST_API.applyPolymorph(foes[1],500,{duration:3})`,['resist']);assert(!resisted.health['fx-1'].includes('debuff'));
  await p.evaluate(()=>{const base=enemyBattleStats;enemyBattleStats=e=>({...base(e),evasion:1});});const dodged=await check(`resolveHit(foes[1],50,state,'fire',false)`,['evade']);assert(!dodged.health['fx-1'].includes('hit'));
  await p.evaluate(()=>stopTeamExploration());assert.equal(await p.locator('.battle-fx').count(),0);assert.equal(await p.evaluate(()=>EmberwildBattleEffects.activeCount),0);assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});

test('HP block effects preserve layout and readable bars at desktop/mobile widths, and expire across redraw/encounter changes',async()=>{
 const g=await setup(),p=g.page;try{
  for(const width of [1440,390,320]){
   await p.setViewportSize({width,height:900});await p.evaluate(()=>render());
   const rects=()=>p.locator('.squad-field .unit[data-combat-id]').evaluateAll(ns=>ns.map(n=>({w:n.offsetWidth,h:n.offsetHeight})));
   const before=await rects();await p.evaluate(()=>fxCapture(()=>resolveHit(foes[1],50,state,'fire',false)));assert.deepEqual(await rects(),before);
   const card=p.locator('.squad-field .unit[data-combat-id="fx-1"]');await card.scrollIntoViewIfNeeded();await p.clock.runFor(100);
   const box=await card.locator('.battle-fx-health[data-fx="fire"]').boundingBox(),cardBox=await card.boundingBox();assert(box.width>=cardBox.width-6&&box.height>=Math.min(70,cardBox.height-2),'effect spans HP information area: '+JSON.stringify({width,box,cardBox}));
   const glyph=await card.locator('.battle-fx-health[data-fx="fire"]>svg').boundingBox();assert(glyph.y+glyph.height<=box.y+box.height+1,'effect glyph fits short HP blocks');
   const bar=card.locator('.battle-health-bar');assert(await bar.isVisible());assert.equal(await bar.evaluate(n=>getComputedStyle(n).zIndex),'2');
   await card.screenshot({path:'/tmp/emberwild-hpfx-'+width+'.png'});await p.clock.runFor(800);assert.equal(await card.locator('.battle-fx').count(),0);
  }
  await p.evaluate(()=>{fxCapture(()=>resolveHit(foes[0],50,state,'ice',false));render();EmberwildBattleSummary.sync();});await p.clock.runFor(800);assert.equal(await p.evaluate(()=>EmberwildBattleEffects.activeCount),0);
  await p.evaluate(()=>{fxCapture(()=>resolveHit(foes[0],50,state,'fire',false));spawnGroup();render();});assert.equal(await p.locator('.battle-fx').count(),0);
  await p.evaluate(()=>{setBattleEffects('off');fxCapture(()=>resolveHit(foes[0],50,state,'fire',false));});assert.equal(await p.locator('.battle-fx').count(),0);assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
