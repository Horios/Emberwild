from pathlib import Path

def rw(path):
    p=Path(path); return p,p.read_text(encoding='utf-8')
def once(t,old,new,label):
    n=t.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1, got {n}')
    return t.replace(old,new,1)

p,t=rw('tests/team-builds.browser.test.cjs')
old="const a=await p.evaluate(()=>({plan:__EMBERWILD_TEAMS.plan(),ap:playerHero().ap,sp:playerHero().sp}));assert.equal(a.plan.job,null);assert.deepEqual(a.plan.skills,[]);assert.deepEqual(a.plan.stats,[0,0,0]);assert(a.plan.equipped.every(x=>x===null));assert.deepEqual(a.plan.companions,[]);assert.equal(a.ap,12);assert.equal(a.sp,12);"
new="const a=await p.evaluate(()=>({plan:__EMBERWILD_TEAMS.plan(),ap:playerHero().ap,hasSp:Object.hasOwn(playerHero(),'sp')}));assert.equal(a.plan.job,null);assert.deepEqual(a.plan.skills,[]);assert.deepEqual(a.plan.stats,[0,0,0]);assert(a.plan.equipped.every(x=>x===null));assert.deepEqual(a.plan.companions,[]);assert.equal(a.ap,12);assert.equal(a.hasSp,false);"
t=once(t,old,new,'browser no skill points')
start=t.index("test('Chromium: actual designer point rules")
new_test=r'''test('Chromium: designer achievement gates export one no-skill-point contract and game imports it',async t=>{
 const editor=await openRuntime(editorRoot,'balance-editor.html'),game=await openRuntime(root),p=editor.page;
 try{
  await t.test('embedded schema is byte-identical to the runtime model',async()=>{const html=fs.readFileSync(path.join(editorRoot,'balance-editor.html'),'utf8'),embedded=html.split('<script id="team-model-v1">\n')[1].split('\n</script>')[0];assert.equal(embedded,fs.readFileSync(path.join(root,'js/character/team-model.js'),'utf8'));});
  await p.evaluate(()=>{currentSection='skills';selected.skillTab='active';selected.skillClass=0;selected.skill=1;render();});
  assert.equal(await p.locator('#teamLearnCost').count(),0);assert.equal(await p.locator('[data-team-point-key="skillPoints"]').count(),0);
  await p.locator('#skillAddBossKill').click();await p.locator('[data-unlock-kind="bossKills"] select').last().selectOption('0');await p.locator('[data-unlock-kind="bossKills"] input[type="number"]').last().fill('2');await p.locator('[data-unlock-kind="bossKills"] input[type="number"]').last().blur();
  await p.locator('#skillAddEliteKill').click();await p.locator('[data-unlock-kind="eliteKills"] select').last().selectOption('0');await p.locator('[data-unlock-kind="eliteKills"] input[type="number"]').last().fill('5');await p.locator('[data-unlock-kind="eliteKills"] input[type="number"]').last().blur();
  await p.locator('#skillAddBossEquipment').click();await p.locator('[data-unlock-kind="bossEquipment"] select').last().selectOption('1');await p.locator('[data-unlock-kind="bossEquipment"] input[type="number"]').last().fill('1');await p.locator('[data-unlock-kind="bossEquipment"] input[type="number"]').last().blur();
  await t.test('download omits skill-point fields and keeps all achievement conditions',async()=>{
   const downloadPromise=p.waitForEvent('download');await p.locator('#exportBtn').click();const file=await (await downloadPromise).path(),doc=JSON.parse(fs.readFileSync(file,'utf8')),sk=doc.classes[0].skills[1];assert.equal(doc.teamSettings?.defaultLearnCost,undefined);assert.equal(doc.balanceSettings.progression.starting.skillPoints,undefined);assert.equal(doc.balanceSettings.progression.levelRewards.skillPoints,undefined);assert.equal(sk.learnCost,undefined);assert.deepEqual(sk.unlockConditions.bossKills,[{mapIndex:0,count:2}]);assert.deepEqual(sk.unlockConditions.eliteKills,[{mapIndex:0,count:5}]);assert.deepEqual(sk.unlockConditions.bossEquipment,[{mapIndex:1,quantity:1}]);
   await game.page.evaluate(d=>{selectSaveSlot(1);start(0);closeModal();clearInterval(timer);applyBalanceConfig(d);},doc);const out=await game.page.evaluate(()=>({rule:__EMBERWILD_TEAMS.coreRule(0,1),json:exportableBalance(),hasSp:Object.hasOwn(playerHero(),'sp')}));assert.deepEqual(out.rule.unlockConditions,sk.unlockConditions);assert.equal(out.rule.learnCost,undefined);assert.equal(out.json.balanceSettings.progression.starting.skillPoints,undefined);assert.equal(out.json.balanceSettings.progression.levelRewards.skillPoints,undefined);assert.equal(out.hasSp,false);
  });
  assert.deepEqual(editor.errors,[]);assert.deepEqual(game.errors,[]);
 }finally{await editor.browser.close();await game.browser.close();}
});
'''
t=t[:start]+new_test
p.write_text(t,encoding='utf-8')

p,t=rw('tests/team-runtime.test.cjs')
old="for(const edit of [d=>d.balanceSettings.progression.levelRewards.abilityPoints=0,d=>d.classes[0].skills[0].learnCost=1000]){const d=structuredClone(settings);edit(d);try{applyBalanceConfig(d)}catch{rejected++}}"
new="for(const edit of [d=>d.balanceSettings.progression.levelRewards.abilityPoints=0,d=>d.classes[0].skills[0].unlockConditions={classMasteryLevel:0,quests:[],materials:[],bossKills:[{mapIndex:0,count:0}],eliteKills:[],bossEquipment:[]}]){const d=structuredClone(settings);edit(d);try{applyBalanceConfig(d)}catch{rejected++}}"
t=once(t,old,new,'runtime invalid unlock rollback')
p.write_text(t,encoding='utf-8')

p,t=rw('tests/team-save-compatibility.test.cjs')
old="const r=loadRuntime(root);r.ctx.legacy=structuredClone(legacy);const expected=expectedPlans(r),original=JSON.stringify(legacy);"
new="const r=loadRuntime(root);r.ctx.legacy=structuredClone(legacy);const expected=expectedPlans(r),expectedPermanent=structuredClone(legacy.buildSystem.permanent),original=JSON.stringify(legacy);delete expectedPermanent.skillCredit;"
t=once(t,old,new,'headless expected permanent')
t=once(t,"assert.deepEqual(json(r,'party.buildSystem.plans'),expected);assert.deepEqual(json(r,'party.buildSystem.permanent'),legacy.buildSystem.permanent);","assert.deepEqual(json(r,'party.buildSystem.plans'),expected);assert.deepEqual(json(r,'party.buildSystem.permanent'),expectedPermanent);",'headless migrated permanent')
p.write_text(t,encoding='utf-8')

p,t=rw('tests/team-save-compatibility.browser.test.cjs')
old="const r=await openRuntime(root,'index.html',{'emberwild-save-v1':JSON.stringify(legacy)}),p=r.page;"
new="const expectedPermanent=structuredClone(legacy.buildSystem.permanent);delete expectedPermanent.skillCredit;const r=await openRuntime(root,'index.html',{'emberwild-save-v1':JSON.stringify(legacy)}),p=r.page;"
t=once(t,old,new,'browser expected permanent')
t=once(t,"assert.deepEqual(before.plans.map(p=>p.stats),legacy.buildSystem.plans.map(p=>p.stats));assert.deepEqual(before.permanent,legacy.buildSystem.permanent);","assert.deepEqual(before.plans.map(p=>p.stats),legacy.buildSystem.plans.map(p=>p.stats));assert.deepEqual(before.permanent,expectedPermanent);",'browser migrated permanent')
p.write_text(t,encoding='utf-8')
