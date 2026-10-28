const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openRuntime}=require('./runtime.cjs'),root=path.resolve(__dirname,'..');
async function setup(rate=1,controlled=true){
 const g=await openRuntime(root,'index.html',{},controlled?{clockTime:new Date('2026-10-27T02:00:00Z')}:{});
 await g.page.evaluate(rate=>{
  selectSaveSlot(1);start(1);closeModal();startSelectedExploration();
  if(rate===2){state.consumables.speed2_30m=1;useSupply('speed2_30m');setBattleSpeed(2);}
  for(const h of heroes())h.shield=1e12;foes.forEach(e=>{e.hp=1e12;e.maxhp=1e12;e.atk=1;});
  globalThis.paceBrowser={actions:[],frames:[],ticks:[],saves:[],longTasks:[]};
  const paceStart=performance.now();new PerformanceObserver(rows=>paceBrowser.longTasks.push(...rows.getEntries().filter(e=>e.startTime>=paceStart).map(e=>e.duration))).observe({type:'longtask',buffered:true});
  const action=recordAction;recordAction=function(...args){const out=action(...args);paceBrowser.actions.push({at:Date.now(),resolvedAt:performance.now(),id:args[0],round});return out;};
  const draw=render;render=function(...args){const t=performance.now(),out=draw(...args),s=EmberwildBattleSummary.snapshot();
   paceBrowser.frames.push({at:performance.now(),actions:paceBrowser.actions.length,ms:performance.now()-t,acting:[...document.querySelectorAll('#battleAllyIcons .is-acting,#battleEnemyIcons .is-acting')].map(e=>e.dataset.heroId||e.dataset.enemyId),expected:[...s.allies,...s.units].filter(e=>e.acting).map(e=>e.id),hp:Number($('battleSummary').querySelector('[role="progressbar"]').getAttribute('aria-valuenow')),expectedHp:(EmberwildBattleEffects.present(s)).percent});return out;};
  const step=tick;tick=function(...args){const t=performance.now(),before=paceBrowser.actions.length,out=step(...args);paceBrowser.ticks.push({ms:performance.now()-t,count:paceBrowser.actions.length-before});return out;};
  const store=save;save=function(...args){const t=performance.now(),out=store(...args);paceBrowser.saves.push(performance.now()-t);return out;};
 },rate);return g;
}
function inspect(m,rate){
 const frames=m.frames,changes=frames.map((f,i)=>f.actions-(frames[i-1]?.actions||0)),deltas=m.actions.slice(1).map((a,i)=>a.at-m.actions[i].at);
 assert(m.actions.length>5);assert(Math.max(...changes)<=1);assert(Math.max(...m.ticks.map(t=>t.count))<=1);
 for(const f of frames){assert.deepEqual(f.acting,f.expected);assert.equal(f.hp,f.expectedHp);}
 // Date.now here is the shared event's start, before variable skill/render cost.
 // Completion-to-completion intervals additionally include that variable cost.
 // Independent actions can also straddle an intentional minimum-round wait.
 assert(Math.min(...deltas)>=900/rate-2,JSON.stringify({rate,min:Math.min(...deltas),small:deltas.filter(d=>d<900/rate-2)}));
 return {rate,actions:m.actions.length,frames:frames.length,minActionMs:Math.min(...deltas),maxActionMs:Math.max(...deltas),minCompletionMs:Math.min(...m.actions.slice(1).map((a,i)=>a.resolvedAt-m.actions[i].resolvedAt)),maxActionsPerTick:Math.max(...m.ticks.map(t=>t.count)),maxActionsPerFrame:Math.max(...changes),maxRenderMs:Math.max(...frames.map(f=>f.ms)),maxTickMs:Math.max(...m.ticks.map(t=>t.ms)),maxSaveMs:Math.max(0,...m.saves),maxLongTaskMs:Math.max(0,...m.longTasks)};
}
test('browser HP, current actor, portraits and journal update together at 1x and 2x',async t=>{
 for(const rate of [1,2]){const g=await setup(rate);try{await g.page.clock.runFor(30000);const m=await g.page.evaluate(()=>paceBrowser);t.diagnostic(JSON.stringify(inspect(m,rate)));assert.deepEqual(g.errors,[]);}finally{await g.browser.close();}}
});
test('a real foreground long task does not produce a burst of independent actions',async()=>{
 const g=await setup(2);try{
  await g.page.clock.runFor(3000);
  const before=await g.page.evaluate(()=>paceBrowser.actions.length);
  // fastForward fires throttled periodic timers once, matching a blocked tab.
  await g.page.clock.fastForward(2300);const after=await g.page.evaluate(()=>paceBrowser.actions.length);assert(after-before<=1);
  await g.page.clock.runFor(10000);inspect(await g.page.evaluate(()=>paceBrowser),2);assert.equal(await g.page.evaluate(()=>EmberwildOffline.busy),false);assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
test('a save before a blocked publication still leaves a full interval between visible actions',async t=>{
 for(const rate of [1,2]){const g=await setup(rate),p=g.page;try{
  await p.evaluate(()=>clearInterval(timer));await p.clock.runFor(50);await p.evaluate(()=>tick());
  const gap=900/rate;await p.clock.runFor(gap);await p.evaluate(()=>save());
  assert.equal(await p.evaluate(()=>paceBrowser.actions.length),2);assert.equal(await p.evaluate(()=>paceBrowser.frames.at(-1).actions),1);
  await p.clock.fastForward(2300);await p.evaluate(()=>tick());const published=await p.evaluate(()=>Date.now());
  assert.equal(await p.evaluate(()=>nextActionAt-Date.now()),gap);assert.equal(await p.evaluate(()=>paceBrowser.frames.at(-1).actions),2);
  await p.clock.runFor(gap-50);await p.evaluate(()=>tick());assert.equal(await p.evaluate(()=>paceBrowser.actions.length),2);
  await p.clock.runFor(50);await p.evaluate(()=>tick());assert.equal(await p.evaluate(()=>paceBrowser.actions.length),3);
  const elapsed=await p.evaluate(at=>Date.now()-at,published);assert.equal(elapsed,gap);t.diagnostic(JSON.stringify({rate,publicationGapMs:elapsed,blockMs:2300}));
  assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}}
});
test('five real minutes of browser foreground play, actual rendering, saves and a 2300ms main-thread block', {skip:!process.env.EMBERWILD_PACE_REALTIME,timeout:420000},async t=>{
 await Promise.all([1,2].map(async rate=>{const g=await setup(rate,false);try{
  const start=Date.now();let blocked=false;
  while(Date.now()-start<300000){await g.page.waitForTimeout(1000);if(!blocked&&Date.now()-start>20000){blocked=true;await g.page.evaluate(()=>{const end=performance.now()+2300;while(performance.now()<end){}});}}
  const m=await g.page.evaluate(()=>paceBrowser);t.diagnostic(JSON.stringify(inspect(m,rate)));assert.deepEqual(g.errors,[]);assert.equal(await g.page.evaluate(()=>party.offlineExploration.receipt),null);
 }finally{await g.browser.close();}}));
});
