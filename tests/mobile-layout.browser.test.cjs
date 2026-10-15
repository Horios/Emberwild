const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openRuntime}=require('./runtime.cjs');
const root=path.resolve(__dirname,'..');
const pages=['battle','roster','partnerRoster','character','skills','equipment','worn','forge','bossCraft','quests','shop','lifeSkills','guide','statistics'];
async function start(page){
 await page.evaluate(()=>{selectSaveSlot(1);start(0);clearInterval(timer);closeModal();recruitCompanion(10);closeModal();recruitCompanion(12);closeModal();});
 await page.waitForTimeout(60);await page.evaluate(()=>closeModal());
}
async function fits(page,label){
 const b=await page.evaluate(()=>{
  const m=document.querySelector('.layout>main'),layout=document.querySelector('#app>.layout'),nav=document.querySelector('.layout>aside'),journal=document.querySelector('#globalBattleJournal');
  return {viewport:innerWidth,layoutWidth:layout.getBoundingClientRect().width,mainWidth:m.clientWidth,mainScroll:m.scrollWidth,mainHeight:m.clientHeight,mainBottom:m.getBoundingClientRect().bottom,journalTop:journal.getBoundingClientRect().top,journalBottom:journal.getBoundingClientRect().bottom,navTop:nav.getBoundingClientRect().top,navBottom:nav.getBoundingClientRect().bottom,height:innerHeight};
 });
 assert(b.layoutWidth<=b.viewport+1,label+' layout width '+JSON.stringify(b));
 assert(b.mainScroll<=b.mainWidth+1,label+' horizontal overflow '+JSON.stringify(b));
 assert(b.mainHeight>=90,label+' readable main height '+JSON.stringify(b));
 assert(b.mainBottom<=b.journalTop+1,label+' journal overlaps content');
 assert(b.journalBottom<=b.navTop+1,label+' nav overlaps journal');
 assert(Math.abs(b.navBottom-b.height)<=1,label+' nav at viewport bottom');
}

test('Mobile: all game pages fit small phones, larger phones, tablets and landscape',async()=>{
 const g=await openRuntime(root),p=g.page;
 try{
  await start(p);
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:844,height:390}]){
   await p.setViewportSize(viewport);
   for(const id of pages){
    await p.evaluate(t=>{setTab(t);document.querySelectorAll('main details').forEach(d=>d.open=true);},id);
    await fits(p,viewport.width+' '+id);
    const scroll=await p.locator('main').evaluate(e=>{e.scrollTop=e.scrollHeight;return {at:e.scrollTop,max:e.scrollHeight-e.clientHeight};});
    assert(Math.abs(scroll.at-scroll.max)<=1,id+' can reach page bottom');
   }
  }
  assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});

test('Mobile: all existing navigation works through shortcuts and the More menu during redraws',async()=>{
 const g=await openRuntime(root),p=g.page;
 try{
  await p.setViewportSize({width:390,height:844});await start(p);
  assert.equal(await p.locator('aside nav>button:visible').count(),5);
  for(const id of pages){
   const b=p.locator(`aside nav [data-page="${id}"]`);
   if(!await b.isVisible())await p.locator('.mobile-more-toggle').click();
   await b.click();await p.waitForFunction(t=>tab===t,id);
   assert.equal(await p.locator('.mobile-more-pages').isVisible(),false);
   assert.equal(await p.locator('aside nav>button:visible').count(),5);
  }
  await p.locator('.mobile-more-toggle').click();
  await p.evaluate(()=>render());
  assert.equal(await p.locator('.mobile-more-pages').isVisible(),true);
  await p.keyboard.press('Escape');assert.equal(await p.locator('.mobile-more-pages').isVisible(),false);
  await p.locator('.mobile-more-toggle').click();await p.locator('main h1').click();
  assert.equal(await p.locator('.mobile-more-pages').isVisible(),false);
  assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});

test('Mobile: folding the live journal preserves combat, filters, loot and page scrolling',async()=>{
 const g=await openRuntime(root),p=g.page;
 try{
  await p.setViewportSize({width:390,height:844});await start(p);
  await p.evaluate(()=>{setTab('guide');document.querySelector('main').scrollTop=220;});
  assert.equal(await p.locator('#mobileJournalBody').isVisible(),false);
  await p.locator('.mobile-journal-toggle').click();
  assert.equal(await p.locator('#mobileJournalBody').isVisible(),true);
  await p.locator('.journal-filter select').selectOption('item');
  await p.evaluate(()=>render());
  assert.equal(await p.locator('.mobile-journal-toggle').getAttribute('aria-expanded'),'true');
  assert.equal(await p.locator('.journal-filter select').inputValue(),'item');
  assert.equal(await p.locator('main').evaluate(e=>e.scrollTop),220);
  await p.locator('.journal-loot-compact summary').click();
  await p.waitForFunction(()=>!isEmberwildUIInteracting()&&journalLootOpen);
  await p.evaluate(()=>{expeditionLoot.items.set('手機測試素材',{count:3,rar:1});refreshGlobalJournal();});
  assert.equal(await p.locator('.journal-loot-compact').getAttribute('open'),'');
  await p.waitForFunction(()=>document.querySelector('#journalLootList').textContent.includes('手機測試素材'));
  await p.locator('#mobileJournalBody').evaluate(e=>e.scrollTop=e.scrollHeight);
  await p.waitForTimeout(30);
  const journalScroll=await p.locator('#mobileJournalBody').evaluate(e=>e.scrollTop);
  await p.evaluate(()=>refreshGlobalJournal());
  assert.equal(await p.locator('#mobileJournalBody').evaluate(e=>e.scrollTop),journalScroll);
  await p.locator('.mobile-journal-toggle').click();
  assert.equal(await p.locator('#mobileJournalBody').isVisible(),false);
  await p.evaluate(()=>{toggleBattle();clearInterval(timer);render();});
  assert.equal(await p.evaluate(()=>running),true);
  assert.equal(await p.locator('#mobileJournalBody').isVisible(),false);
  await p.locator('.mobile-journal-toggle').click();
  await p.locator('.journal-actions button[onclick="stopTeamExploration()"]').click();
  await p.waitForFunction(()=>!running);
  await p.setViewportSize({width:844,height:390});await fits(p,'landscape open journal');
  assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});

test('Responsive: title, creation, utility dialogs and desktop layout stay usable',async()=>{
 const g=await openRuntime(root),p=g.page;
 try{
  await p.setViewportSize({width:320,height:640});
  assert.equal(await p.locator('.title-screen').isVisible(),true);
  assert.equal(await p.locator('.mobile-journal-toggle').count(),0);
  await p.evaluate(()=>selectSaveSlot(1));
  assert.equal(await p.locator('.start').isVisible(),true);
  assert(await p.locator('.start').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await p.evaluate(()=>{start(0);clearInterval(timer);closeModal();});await p.waitForTimeout(60);await p.evaluate(()=>closeModal());
  for(const id of ['mailbox','achievements','options']){
   await p.locator('#utilityButton-'+id).click();
   const b=await p.locator('#modal').boundingBox();assert(b.x>=0&&b.x+b.width<=320&&b.height<=640,id+' fits');
   await p.getByRole('button',{name:'關閉彈窗',exact:true}).click();
  }
  await p.setViewportSize({width:1440,height:900});await p.evaluate(()=>setTab('battle'));
  assert.equal(await p.locator('.mobile-journal-toggle').isVisible(),false);
  assert.equal(await p.locator('.mobile-more-toggle').isVisible(),false);
  assert.equal(await p.locator('#mobileJournalBody').isVisible(),true);
  assert.equal(await p.locator('aside nav [data-page]:visible').count(),pages.length);
  const order=await p.locator('aside nav [data-page]').evaluateAll(nodes=>nodes.map(e=>({id:e.dataset.page,y:e.getBoundingClientRect().y})).sort((a,b)=>a.y-b.y).map(e=>e.id));
  assert.deepEqual(order,pages);
  const rects=await p.evaluate(()=>['aside','main','#globalBattleJournal'].map(s=>{const r=document.querySelector('.layout').querySelector(s).getBoundingClientRect();return {x:r.x,right:r.right};}));
  assert(rects[0].right<=rects[1].x&&rects[1].right<=rects[2].x,'desktop retains three columns');
  await p.evaluate(()=>returnToTitle());assert.equal(await p.locator('.mobile-more-toggle').count(),0);
  assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
