const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{openRuntime}=require('./runtime.cjs'),D=require('../js/balance/balance-diff.js');
const root=process.cwd(),published=JSON.parse(fs.readFileSync('data/balance.json'));
test('production ignores old browser balance and player-save design snapshots; preview overrides expire on a new published base',async()=>{
 const old=structuredClone(published);old.items[0].cost=99999;
 const main=await openRuntime(root,'index.html',{'emberwild-balance-test-v1':JSON.stringify(old)});
 try{assert.equal(await main.page.evaluate(()=>exportableBalance().items[0].cost),published.items[0].cost);await main.page.evaluate(()=>{selectSaveSlot(1);start(0);closeModal();const d=structuredClone(packParty());d.balanceSettings={combat:{baseCritDamage:999}};d.members[0].balance={evil:true};loadParty(d);save();});const out=await main.page.evaluate(()=>({price:exportableBalance().items[0].cost,save:packParty()}));assert.equal(out.price,published.items[0].cost);assert.equal(out.save.balanceSettings,undefined);assert.equal(out.save.members[0].balance,undefined);assert.deepEqual(main.errors,[]);}finally{await main.browser.close();}
 const preview=await openRuntime(root,'index.html',{}, {pathname:'/preview/'});
 try{await preview.page.evaluate(()=>{const d=exportableBalance();d.items[0].cost+=7;applyBalanceConfig(d);});await preview.page.reload();assert.equal(await preview.page.evaluate(()=>exportableBalance().items[0].cost),published.items[0].cost+7);
  const updated=structuredClone(published);updated.items[0].cost+=9;await preview.page.route('http://emberwild.test/preview/data/balance.json?*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(updated)}));await preview.page.reload();assert.equal(await preview.page.evaluate(()=>exportableBalance().items[0].cost),updated.items[0].cost);assert.deepEqual(preview.errors,[]);
 }finally{await preview.browser.close();}
});
test('production can interpret a committed preview design without discarding any effective fields',async()=>{
 const r=await openRuntime('../Emberwild-main');try{await r.page.route('http://emberwild.test/data/balance.json?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(published)}));await r.page.reload();const actual=await r.page.evaluate(()=>exportableBalance());assert.equal(D.diff(published,actual).total,0);assert.equal(await r.page.evaluate(()=>!!GAMEPLAY_SETTINGS.quests.design),true);assert.deepEqual(r.errors,[]);}finally{await r.browser.close();}
});
test('unsupported published schema stops before game scripts and keeps saved bytes intact',async()=>{
 const r=await openRuntime(root);try{const before=await r.page.evaluate(()=>{localStorage.setItem('emberwild-save-probe','unchanged');return localStorage.getItem('emberwild-save-probe');});await r.page.route('http://emberwild.test/data/balance.json?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({...published,schemaVersion:999})}));await r.page.reload();assert.match(await r.page.locator('#app').innerText(),/資料載入失敗/);assert.equal(await r.page.evaluate(()=>typeof selectSaveSlot),'undefined');assert.equal(await r.page.evaluate(()=>localStorage.getItem('emberwild-save-probe')),before);}finally{await r.browser.close();}
});
