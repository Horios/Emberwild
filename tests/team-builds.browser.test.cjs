const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {openRuntime}=require('./runtime.cjs'),root=path.resolve(__dirname,'..'),editorRoot=process.env.EMBERWILD_BALANCE_ROOT||path.resolve(root,'../Emberwild-Balance');
test('Chromium: create blank plans, choose classes, learn, allocate, copy, rename, safety gate and exact reload through actual UI',async t=>{
 const game=await openRuntime(root),p=game.page,warnings=[];p.setDefaultTimeout(10000);p.on('dialog',async d=>{warnings.push(d.message());await d.accept(d.type()==='prompt'?'法術編成':undefined);});
 try{
  await p.evaluate(()=>{selectSaveSlot(1);start(0);closeModal();clearInterval(timer);playerHero().lv=5;syncParty();save();setTab('roster');});await p.waitForTimeout(50);await p.evaluate(()=>closeModal());
  await t.test('new plan has no class, build, equipment or companions and uses the full level budget',async()=>{
   await p.getByRole('button',{name:'新增空白隊伍',exact:true}).click();await p.locator('.team-plan-card').nth(1).getByRole('button',{name:'切換',exact:true}).click();
   const a=await p.evaluate(()=>({plan:__EMBERWILD_TEAMS.plan(),ap:playerHero().ap,sp:playerHero().sp}));assert.equal(a.plan.job,null);assert.deepEqual(a.plan.skills,[]);assert.deepEqual(a.plan.stats,[0,0,0]);assert(a.plan.equipped.every(x=>x===null));assert.deepEqual(a.plan.companions,[]);assert.equal(a.ap,12);assert.equal(a.sp,12);
   await p.waitForFunction(()=>document.querySelector('.adventurer-summary > p')?.textContent==='尚未選擇職業');assert.equal(await p.locator('.adventurer-summary > p').textContent(),'尚未選擇職業');await p.evaluate(()=>toggleBattle());assert.equal(await p.evaluate(()=>running),false);
  });
  await t.test('actual class, attribute and skill controls save the current team independently',async()=>{
   await p.getByLabel('本隊主角職業',{exact:true}).selectOption('1');await p.evaluate(()=>setTab('character'));await p.locator('#stat-alloc-0').fill('4');await p.locator('#stat-alloc-0').locator('..').getByRole('button',{name:'分配',exact:true}).click();await p.evaluate(()=>setTab('skills'));
   const fire=p.locator('[data-team-skill="1:core:0"]');await fire.getByRole('button',{name:'學習',exact:true}).click();await fire.getByRole('button',{name:'設為主動槽 1',exact:true}).click();
   await p.waitForFunction(()=>document.querySelector('[data-team-skill="1:core:0"]')?.textContent.includes('本隊已裝配'));assert.match(await fire.textContent(),/本隊已裝配/);assert.match(await p.locator('[data-team-skill="1:core:2"]').textContent(),/尚未永久解鎖/);
   const a=await p.evaluate(()=>JSON.parse(localStorage.getItem(KEY)).buildSystem);assert.equal(a.activeId,'team-2');assert.equal(a.plans[0].job,0);assert.deepEqual(a.plans[0].stats,[0,0,0]);assert.equal(a.plans[1].job,1);assert.deepEqual(a.plans[1].stats,[4,0,0]);assert.equal(a.plans[1].skills[0],1);assert.equal(a.plans[1].active[0],0);
  });
  await t.test('copy and rename use actual controls without creating another item or companion',async()=>{
   const count=await p.evaluate(()=>{setTab('roster');return state.bag.length;});await p.locator('.team-plan-card.current').getByRole('button',{name:'複製',exact:true}).click();await p.locator('.team-plan-card.current').getByRole('button',{name:'改名',exact:true}).click();const a=await p.evaluate(()=>({count:state.bag.length,plans:party.buildSystem.plans}));assert.equal(a.count,count);assert.equal(a.plans[1].name,'法術編成');assert.deepEqual(a.plans[1].stats,a.plans[2].stats);assert.deepEqual(a.plans[1].equipped,a.plans[2].equipped);
  });
  await t.test('reset and class confirmation leave permanent progress and other plans intact',async()=>{
   await p.evaluate(()=>setTab('skills'));await p.getByRole('button',{name:'免費重置本隊技能',exact:true}).click();assert(warnings.some(s=>s.includes('永久解鎖與精通保留')));assert.equal(await p.evaluate(()=>party.buildSystem.plans[2].skills[0]),1);assert.equal(await p.evaluate(()=>party.buildSystem.permanent.unlocks['1:core:0']),true);await p.evaluate(()=>setTab('roster'));await p.getByLabel('本隊主角職業',{exact:true}).selectOption('0');assert(warnings.some(s=>s.includes('不符職業的裝備')));
  });
  await t.test('running and paused encounters disable UI; stopping and safe switching reset HP, cooldowns and the encounter',async()=>{
   await p.evaluate(()=>{setTab('battle');toggleBattle();playerHero().hp=4;actorCooldowns={'0-0':7};render();setTab('roster');});assert.equal(await p.getByLabel('本隊主角職業',{exact:true}).isDisabled(),true);assert.equal(await p.locator('.team-plan-card').first().getByRole('button',{name:'切換',exact:true}).isDisabled(),true);
   await p.evaluate(()=>{running=false;render();setTab('roster');});assert.equal(await p.getByLabel('本隊主角職業',{exact:true}).isDisabled(),true);await p.getByRole('button',{name:'停止探索並結束遭遇',exact:true}).click();await p.locator('.team-plan-card').first().getByRole('button',{name:'切換',exact:true}).click();const a=await p.evaluate(()=>({hp:playerHero().hp,max:stats(playerHero()).hp,cd:actorCooldowns['0-0']||0,foes:foes.length,clock:partyClock,job:playerHero().job}));assert.equal(a.hp,a.max);assert.equal(a.cd,0);assert.equal(a.foes,0);assert.equal(a.clock,0);assert.equal(a.job,0);
  });
  await t.test('actual save download and file import restore every team and shared resource',async()=>{
   const expected=await p.evaluate(()=>{save();return {build:party.buildSystem,ids:state.bag.map(g=>g.id).sort(),gold:state.gold};});
   const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'匯出存檔 JSON',exact:true}).click();const file=await (await downloadPromise).path();
   await p.evaluate(()=>renameTeamPlan('team-1','匯入前改名'));
   await p.locator('header input[type="file"]').setInputFiles({name:'party-roundtrip.json',mimeType:'application/json',buffer:fs.readFileSync(file)});
   await p.locator('#modal').getByRole('button',{name:'確認載入',exact:true}).click();
   assert.deepEqual(await p.evaluate(()=>({build:party.buildSystem,ids:state.bag.map(g=>g.id).sort(),gold:state.gold})),expected);
  });
  await t.test('browser reload restores all snapshots, global mastery and exactly the existing item UIDs',async()=>{
   const before=await p.evaluate(()=>{save();return {build:party.buildSystem,ids:state.bag.map(g=>g.id).sort()};});await p.reload();await p.waitForFunction(()=>globalThis.__EMBERWILD_TEAM_READY&&party?.buildSystem);const after=await p.evaluate(()=>({build:party.buildSystem,ids:state.bag.map(g=>g.id).sort()}));assert.deepEqual(after,before);
  });
  assert.deepEqual(game.errors,[]);
 }finally{await game.browser.close();}
});
test('Chromium: worn equipment can be force-sold after a native warning naming all plans, with cancellation and one reward',async()=>{
 const g=await openRuntime(root),p=g.page;p.setDefaultTimeout(10000);
 try{
  await p.evaluate(()=>{selectSaveSlot(1);start(0);clearInterval(timer);closeModal();copyTeamPlan();renameTeamPlan('team-1','戰士甲');renameTeamPlan('team-2','戰士乙');setTab('equipment');});
  await p.waitForTimeout(50);await p.evaluate(()=>closeModal());
  const before=await p.evaluate(()=>({id:state.equipped[0],gold:state.gold,price:equipmentSellPrice(findGear(state.equipped[0]))}));await p.evaluate(id=>selectInventoryGear(id),before.id);const button=p.locator('.inventory-detail-pane .sell-gear-button');
  assert.equal(await button.isDisabled(),false);let message='';p.once('dialog',async d=>{message=d.message();await d.dismiss();});await button.click();assert(message.includes('戰士甲')&&message.includes('戰士乙'));assert.equal(await p.evaluate(id=>!!findGear(id),before.id),true);
  p.once('dialog',d=>d.accept());await button.click();
  const after=await p.evaluate(id=>({owned:!!findGear(id),refs:__EMBERWILD_TEAM_EQUIPMENT.references(id),gold:state.gold,empty:party.buildSystem.plans.every(p=>p.equipped[0]===null)}),before.id);
  assert.equal(after.owned,false);assert.deepEqual(after.refs,[]);assert(after.empty);assert.equal(after.gold,before.gold+before.price);assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
test('Chromium: preview copies old saves once and never overwrites or resurrects the production slots',async()=>{
 const original=await openRuntime(root);let raw;
 try{raw=await original.page.evaluate(()=>{selectSaveSlot(1);start(0);clearInterval(timer);closeModal();const d=packParty();delete d.buildSystem;delete d.members[0].playerId;return JSON.stringify(d);});}finally{await original.browser.close();}
 const stats=JSON.stringify({maps:{}}),g=await openRuntime(root,'index.html',{'emberwild-save-v1':raw,'emberwild-save-v1-backup':raw,'emberwild-save-v1-slot-2':raw,'emberwild-battle-statistics-v1':stats,'emberwild-play-time-v1-slot-1':'90000'},{pathname:'/Emberwild/preview/'}),p=g.page;
 try{
  assert.equal(await p.evaluate(()=>KEY),'emberwild-preview-save-v1');assert.match(await p.locator('.title-screen').textContent(),/正式版進度保留/);
  await p.evaluate(()=>{continueFromTitle();clearInterval(timer);closeModal();addTeamPlan();switchTeamPlan('team-2');changePlayerClass(1);save();});
  assert.equal(await p.evaluate(()=>localStorage.getItem('emberwild-save-v1')),raw);assert.equal(await p.evaluate(()=>localStorage.getItem('emberwild-save-v1-backup')),raw);assert.equal(await p.evaluate(()=>localStorage.getItem('emberwild-battle-statistics-v1')),stats);assert.equal(await p.evaluate(()=>localStorage.getItem('emberwild-play-time-v1-slot-1')),'90000');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(KEY)).buildSystem.plans.length),2);
  await p.reload();assert.equal(await p.evaluate(()=>party.buildSystem.plans.length),2);assert.equal(await p.evaluate(()=>localStorage.getItem('emberwild-save-v1')),raw);
  await p.getByRole('button',{name:'刪除存檔欄位 1',exact:true}).click();await p.locator('#modal').getByRole('button',{name:'繼續刪除',exact:true}).click();await p.locator('#modal').getByRole('button',{name:'確認永久刪除',exact:true}).click();
  await p.reload();assert.equal(await p.evaluate(()=>localStorage.getItem(KEY)),null);assert.equal(await p.evaluate(()=>party),null);assert.equal(await p.evaluate(()=>localStorage.getItem('emberwild-save-v1')),raw);assert.equal(await p.evaluate(()=>localStorage.getItem(saveKeyForSlot(2))),raw);assert.deepEqual(g.errors,[]);
 }finally{await g.browser.close();}
});
test('Chromium: actual designer point rules, unlock/learning fields, download and game import use one contract',async t=>{
 const editor=await openRuntime(editorRoot,'balance-editor.html'),game=await openRuntime(root),p=editor.page;
 try{
  await t.test('embedded schema is byte-identical to the runtime model',async()=>{const html=fs.readFileSync(path.join(editorRoot,'balance-editor.html'),'utf8'),embedded=html.split('<script id="team-model-v1">\n')[1].split('\n</script>')[0];assert.equal(embedded,fs.readFileSync(path.join(root,'js/character/team-model.js'),'utf8'));});
  await p.locator('[data-sec="teamSettings"]').click();await p.locator('[data-team-setting="maxPlans"]').fill('4');await p.locator('[data-team-setting="maxPlans"]').blur();await p.locator('[data-team-point-group="levelRewards"][data-team-point-key="skillPoints"]').fill('3');await p.locator('[data-team-point-group="levelRewards"][data-team-point-key="skillPoints"]').blur();
  await p.evaluate(()=>{currentSection='skills';selected.skillTab='proc';selected.skillClass=1;selected.skill=2;render();});
  await p.locator('#teamLearnCost').fill('2');await p.locator('#teamLearnCost').blur();await p.locator('#teamClassMastery').fill('5');await p.locator('#teamClassMastery').blur();await p.locator('#teamUnlockQuests').fill('tutorial');await p.locator('#teamUnlockQuests').blur();await p.locator('#teamMaterialName').fill('測試徽章');await p.locator('#teamMaterialQuantity').fill('2');await p.locator('#teamAddMaterial').click();
  await t.test('all edited controls survive a real JSON download and are effective in the game',async()=>{
   const downloadPromise=p.waitForEvent('download');await p.locator('#exportBtn').click();const downloaded=await downloadPromise,file=await downloaded.path(),doc=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(doc.teamSettings.maxPlans,4);assert.equal(doc.balanceSettings.progression.levelRewards.skillPoints,3);assert.equal(doc.classes[1].skills[2].learnCost,2);assert.equal(doc.classes[1].skills[2].unlockConditions.classMasteryLevel,5);assert.deepEqual(doc.classes[1].skills[2].unlockConditions.materials,[{name:'測試徽章',quantity:2}]);
   await game.page.evaluate(d=>{selectSaveSlot(1);start(1);closeModal();clearInterval(timer);applyBalanceConfig(d);},doc);const out=await game.page.evaluate(()=>({cfg:__EMBERWILD_TEAMS.settings(),skill:__EMBERWILD_TEAMS.coreRule(1,2),json:exportableBalance()}));assert.equal(out.cfg.maxPlans,4);assert.equal(out.skill.learnCost,2);assert.equal(out.skill.unlockConditions.classMasteryLevel,5);assert.deepEqual(out.json.classes[1].skills[2].unlockConditions,doc.classes[1].skills[2].unlockConditions);assert.equal(out.json.balanceSettings.progression.levelRewards.skillPoints,3);
  });
  await t.test('the designer and game preserve an explicitly zero skill point rule',async()=>{const doc=await p.evaluate(()=>__EMBERWILD_TEAM_EDITOR.export());doc.balanceSettings.progression.starting.skillPoints=0;doc.balanceSettings.progression.levelRewards.skillPoints=0;const out=await game.page.evaluate(d=>{applyBalanceConfig(d);return exportableBalance();},doc);assert.equal(out.balanceSettings.progression.starting.skillPoints,0);assert.equal(out.balanceSettings.progression.levelRewards.skillPoints,0);});
  assert.deepEqual(editor.errors,[]);assert.deepEqual(game.errors,[]);
 }finally{await editor.browser.close();await game.browser.close();}
});
