'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openRuntime}=require('./runtime.cjs');
test('skill previews, catalog and passive switches work on desktop/mobile and persist encounter separation after reload',async()=>{
 const r=await openRuntime(path.resolve(__dirname,'..'),'index.html',{}, {clockTime:Date.parse('2026-10-30T02:00:00Z')}),p=r.page;
 p.on('dialog',async d=>d.accept());
 try{
  await p.evaluate(async()=>{selectSaveSlot(1);start(2);closeModal();continueFromTitle();clearInterval(timer);await EmberwildOffline.settle(undefined,false);setTab('skills');});
  for(const width of [1440,390,320]){
   await p.setViewportSize({width,height:900});await p.locator('[data-skill-slot="active:0"]').click();
   const rain=p.locator('[data-skill-id="archer-arrow-rain"]');assert(await rain.isVisible());assert(await rain.getByRole('button').isDisabled());assert.match(await rain.innerText(),/LV3/);
   assert.equal(await p.locator('[data-skill-id="job2-core4"]').count(),0);assert(await p.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   await p.getByRole('button',{name:'關閉',exact:true}).click();await p.getByRole('button',{name:'技能圖鑑',exact:true}).click();
   assert(await p.locator('[data-skill-id="job2-core4"]').isVisible());assert.equal(await p.locator('[data-skill-id^="partner"]').count(),0);assert.match(await p.locator('#modal').innerText(),/啟程護符/);
   assert(await p.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await p.getByRole('button',{name:'關閉',exact:true}).click();
  }
  await p.evaluate(()=>{awardXP(need(1)+need(2));save();render();});await p.locator('[data-skill-slot="active:0"]').click();
  await p.locator('[data-skill-id="archer-arrow-rain"]').getByRole('button',{name:'裝入技能',exact:true}).click();assert.equal(await p.evaluate(()=>state.skillLoadout.active[0]),'archer-arrow-rain');
  const status=await p.evaluate(()=>{const switched=changePlayerClass(0);const started=switched&&startSelectedExploration();running=false;setTab('skills');globalThis.battleBefore=EmberwildBattleConfiguration.pack();return {switched,started,job:state.job,level:state.lv,learned:__EMBERWILD_SKILLS.learned(state,__EMBERWILD_SKILLS.byId('warrior-cleave-chain')),tab};});
  assert.equal(status.switched,true,JSON.stringify(status));assert.equal(status.job,0,JSON.stringify(status));assert.equal(status.learned,true,JSON.stringify(status));
  const passive=p.locator('[data-passive-id="warrior-cleave-chain"]');await passive.getByRole('switch').click();assert.equal(await passive.getByRole('switch').getAttribute('aria-checked'),'false');
  assert.equal(await p.evaluate(()=>state.passiveEnabled['warrior-cleave-chain']),false);assert.equal(await p.evaluate(()=>EmberwildBattleConfiguration.combat(()=>state.passiveEnabled['warrior-cleave-chain'])),true);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await p.reload();await p.evaluate(()=>clearInterval(timer));assert.equal(await p.evaluate(()=>state.passiveEnabled['warrior-cleave-chain']),false);assert.equal(await p.evaluate(()=>EmberwildBattleConfiguration.combat(()=>state.passiveEnabled['warrior-cleave-chain'])),true);
  await p.evaluate(()=>{spawnGroup();running=false;});assert.equal(await p.evaluate(()=>EmberwildBattleConfiguration.combat(()=>state.passiveEnabled['warrior-cleave-chain'])),false);assert.deepEqual(r.errors,[]);
 }finally{await r.browser.close();}
});
