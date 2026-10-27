'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openRuntime}=require('./runtime.cjs');const root=path.resolve(__dirname,'..');
async function setup(){
 const g=await openRuntime(root,'index.html',{}, {clockTime:new Date('2026-10-27T02:00:00Z')});
 await g.page.evaluate(()=>{selectSaveSlot(1);start(0);closeModal();clearInterval(timer);spawnGroup();running=true;const base=foes[0];foes=[{...base,id:'summary-a',name:'測試怪物',hp:25,maxhp:100},{...base,id:'summary-b',name:'測試怪物',hp:450,maxhp:900}];enemy=foes[0];beginBattleStatistics();render();});return g;
}
const state=p=>p.locator('[data-summary-state]').textContent();
const hp=p=>p.locator('[data-summary-hp]').textContent();
test('combat icons and aggregate HP update in place for damage, healing, revive, summon and phase replacement',async()=>{
 const g=await setup(),p=g.page;
 try{
  assert.equal(await hp(p),'475 / 1,000');assert.equal(await p.locator('[data-summary-percent]').textContent(),'47.5%');assert.equal(await p.locator('#battleEnemyIcons svg').count(),2);
  await p.evaluate(()=>{globalThis.savedIcon=$('battleEnemyIcons').firstElementChild;globalThis.savedArt=savedIcon.firstElementChild;globalThis.savedSummary=$('battleSummary');foes[0].hp=0;EmberwildBattleSummary.sync();});
  assert.equal(await hp(p),'450 / 1,000');assert.equal(await p.locator('[data-enemy-id="summary-a"].is-dead').count(),1);
  await p.evaluate(()=>{foes[1].hp=600;EmberwildBattleSummary.sync();});assert.equal(await hp(p),'600 / 1,000');assert.equal(await state(p),'敵方治療');assert.equal(await p.locator('[data-enemy-id="summary-b"]').getAttribute('data-effect'),'healed');
  await p.evaluate(()=>{foes[0].hp=40;EmberwildBattleSummary.sync();});assert.equal(await state(p),'敵方復活');assert.equal(await p.locator('[data-enemy-id="summary-a"].is-dead').count(),0);
  assert(await p.evaluate(()=>$('battleEnemyIcons').firstElementChild===savedIcon&&savedIcon.firstElementChild===savedArt));
  await p.evaluate(()=>{foes.push({...foes[0],id:'summary-c',hp:200,maxhp:200});EmberwildBattleSummary.sync();});assert.equal(await hp(p),'840 / 1,200');assert.equal(await state(p),'援軍加入');assert.equal(await p.locator('#battleEnemyIcons>div').count(),3);
  await p.evaluate(()=>{foes.splice(2,1);EmberwildBattleSummary.sync();render();});assert.equal(await hp(p),'640 / 1,000');assert.equal(await p.locator('#battleEnemyIcons>div').count(),2);assert(await p.evaluate(()=>$('battleEnemyIcons').firstElementChild===savedIcon&&$('battleSummary')===savedSummary));
  await p.evaluate(()=>{foes=[{...foes[0],id:'phase-2',hp:800,maxhp:1200,kind:'boss'}];enemy=foes[0];EmberwildBattleSummary.sync();});assert.equal(await hp(p),'800 / 1,200');assert.equal(await p.locator('#battleEnemyIcons>div').count(),1);assert.equal(await p.locator('[data-enemy-id="phase-2"].is-boss').count(),1);
  await p.evaluate(()=>{foes[0].shield=99999;foes[0].maxhp=1400;EmberwildBattleSummary.sync();});assert.equal(await hp(p),'800 / 1,400');
  await p.evaluate(()=>{EmberwildBattleSummary.finish('wipe');foes=[];enemy=null;running=false;render();});assert.equal(await state(p),'戰鬥失敗');assert.equal(await hp(p),'800 / 1,400');
  await p.evaluate(()=>{spawnGroup();foes.forEach(e=>e.hp=0);EmberwildBattleSummary.finish('victory');foes=[];render();});assert.equal(await state(p),'戰鬥勝利');assert.match(await hp(p),/^0 \/ /);
  assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
test('shared summary stays visible while operating pages and collapsing desktop/mobile reports, without log scrolling or overflow',async()=>{
 const g=await setup(),p=g.page;
 try{
  await p.setViewportSize({width:1440,height:900});
  await p.evaluate(()=>{for(let i=0;i<65;i++)note('紀錄 '+i+' '+'.'.repeat(80),'playerDamage');globalThis.originalRows=$('liveLog').querySelectorAll('[data-event-type]').length;});
  for(const size of [{width:1440,height:900},{width:1024,height:768},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
   await p.setViewportSize(size);await p.evaluate(()=>render());
   for(const tab of ['equipment','forge','skills','lifeSkills','gather','alchemy','story','battle']){
    await p.evaluate(id=>setTab(id),tab);assert(await p.locator('#battleSummary').isVisible(),tab+' summary');
    await p.evaluate(()=>{foes[1].hp=Math.max(1,foes[1].hp-1);EmberwildBattleSummary.sync();});
    assert.equal(await p.locator('#battleSummary').count(),1);
    const layout=await p.evaluate(()=>{const s=$('battleSummary').getBoundingClientRect(),main=document.querySelector('.layout>main').getBoundingClientRect(),nav=document.querySelector('.layout>aside').getBoundingClientRect();return {right:s.right,bottom:s.bottom,top:s.top,mainHeight:main.height,navTop:nav.top,overflow:document.documentElement.scrollWidth>innerWidth};});
    assert(layout.right<=size.width+1&&!layout.overflow,JSON.stringify({size,layout}));assert(layout.top>=0&&layout.bottom<=size.height,JSON.stringify({size,layout}));assert(layout.mainHeight>40,JSON.stringify({size,layout}));
    if(size.width<=900)assert(layout.bottom<=layout.navTop+1,'summary must not overlap mobile navigation');
   }
   if(size.width>900){await p.evaluate(()=>EmberwildBattleSummary.toggleDetails());assert(!await p.locator('#liveLog').isVisible());assert(await p.locator('#battleSummary').isVisible());await p.evaluate(()=>EmberwildBattleSummary.toggleDetails());}
   else{await p.evaluate(()=>toggleMobileJournal());assert(await p.locator('#liveLog').isVisible());assert(await p.locator('#battleSummary').isVisible());await p.evaluate(()=>toggleMobileJournal());assert(!await p.locator('#liveLog').isVisible());}
   assert.equal(await p.locator('#liveLog [data-event-type]').count(),await p.evaluate(()=>originalRows));
  }
  await p.setViewportSize({width:1440,height:900});await p.evaluate(()=>{render();const stream=$('liveLog').querySelector('.battle-log-stream');stream.scrollTop=150;stream.dataset.autoScroll='0';globalThis.beforeTop=stream.scrollTop;for(let i=0;i<10;i++){foes[1].hp--;EmberwildBattleSummary.sync();}});
  assert(await p.evaluate(()=>$('liveLog').querySelector('.battle-log-stream').scrollTop===beforeTop));
  await p.evaluate(()=>{const input=document.createElement('input');input.id='summary-editing';document.querySelector('main').appendChild(input);input.focus();foes[1].hp=123;render();});assert.equal(await hp(p),'148 / 1,000');assert(await p.locator('#summary-editing').evaluate(e=>e===document.activeElement));await p.evaluate(()=>{$('summary-editing').blur();$('summary-editing').remove();});
  await p.evaluate(()=>{globalThis.iconBefore=$('battleEnemyIcons').firstElementChild;for(let i=0;i<100;i++){foes[1].hp=10+i%20;EmberwildBattleSummary.sync();}save();loadParty(JSON.parse(localStorage.getItem(KEY)));render();});
  assert.equal(await p.locator('#battleEnemyIcons>div').count(),await p.evaluate(()=>EmberwildBattleSummary.snapshot().total));assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
test('offline replay skips icon rendering and settles to the effective encounter, then live 2x updates continue across pages',async()=>{
 const g=await setup(),p=g.page;
 try{
  await p.evaluate(()=>{resetEncounter();refillParty();running=false;startSelectedExploration();globalThis.iconMutations=0;new MutationObserver(rows=>{iconMutations+=rows.filter(r=>r.target.closest?.('#battleEnemyIcons')).length}).observe($('app'),{childList:true,subtree:true});});
  await p.clock.fastForward(60000);
  await p.evaluate(async()=>{await EmberwildOffline.settle(undefined,false);EmberwildBattleSummary.sync();});
  assert(await p.evaluate(()=>iconMutations<100),'offline simulation must not build icons for every encounter');
  assert(await p.evaluate(()=>{const s=EmberwildBattleSummary.snapshot();return $('battleSummary').querySelector('[role="progressbar"]').getAttribute('aria-valuenow')===String(s.percent)}));
  await p.evaluate(()=>{acknowledgeOfflineExploration();resetEncounter();running=false;startSelectedExploration();state.consumables.speed2_30m=1;useSupply('speed2_30m');setBattleSpeed(2);for(const h of heroes())h.shield=1e9;foes.forEach(e=>{e.hp=1e6;e.maxhp=1e6;e.atk=1});setTab('equipment');});
  assert.equal(await p.evaluate(()=>battleRate),2);
  for(let i=0;i<12;i++){await p.clock.runFor(1000);await p.evaluate(()=>tick());}
  await p.evaluate(async()=>{if(EmberwildOffline.busy)await EmberwildOffline.settle(undefined,false);EmberwildBattleSummary.sync();});
  assert(await p.evaluate(()=>round>0&&lastActionOrder.length>0));assert(await p.evaluate(()=>{const s=EmberwildBattleSummary.snapshot();return s.hp<s.max&&Number($('battleSummary').querySelector('[role="progressbar"]').getAttribute('aria-valuenow'))===s.percent}));
  assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
