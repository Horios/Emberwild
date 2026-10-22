const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openRuntime}=require('./runtime.cjs'),root=path.resolve(__dirname,'..'),editorRoot=process.env.EMBERWILD_BALANCE_ROOT||path.resolve(root,'../Emberwild-Balance');
test('Chromium: one-hop induction editing, pure/combined effects, ownership and deletion guards import into real game',async()=>{
 const e=await openRuntime(editorRoot,'balance-editor.html'),g=await openRuntime(root);const p=e.page;p.setDefaultTimeout(10000);const dialogs=[];p.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
 try{
  await p.evaluate(()=>{currentSection='skills';selected.skillClass=0;selected.skillTab='active';selected.skill=0;render();});
  await p.locator('#inductionEnabled').check();await p.locator('[data-induction-kind]').selectOption('skill');
  const source=await p.evaluate(()=>data.classes[0].skills[selected.skill].id),target=await p.locator('[data-induction-value]').inputValue();assert.notEqual(source,target);
  assert.equal(await p.locator('[data-induction-value] option[value="'+source+'"]').count(),0);
  await p.locator('[data-induction-chance]').fill('0');await p.locator('[data-induction-chance]').blur();await p.locator('#addInductionTarget').click();assert.equal(await p.locator('[data-induction-row]').count(),2);assert(await p.locator('#addInductionTarget').isDisabled());
  const combined=await p.evaluate(()=>__EMBERWILD_MASTERY_EDITOR.cleanExport());assert.equal(combined.classes[0].skills[0].effect,'damage');assert.equal(combined.classes[0].skills[0].induction.targets[0].chance,0);
  await p.locator('[data-key="effect"]').selectOption('induceSkill');assert.equal(await p.locator('[data-common-effect]').count(),0);assert(await p.locator('#inductionEnabled').isChecked());
  await p.locator('[data-induction-delete="1"]').click();assert.equal(await p.locator('[data-induction-row]').count(),1);
  const doc=await p.evaluate(()=>__EMBERWILD_MASTERY_EDITOR.cleanExport());assert.deepEqual(await p.evaluate(()=>validateData()),[]);
  await g.page.evaluate(doc=>applyBalanceConfig(doc,{persist:true}),doc);assert.equal(await g.page.evaluate(()=>CLASSES[0].skills[0][5]),'induceSkill');
  await p.evaluate(target=>{selected.skill=data.classes[0].skills.findIndex(s=>s.id===target);selected.skillTab=data.classes[0].skills[selected.skill].activation;render();},target);
  await p.locator('#delSkill').click();assert(dialogs.at(-1).includes('仍有技能誘發引用'));
  await p.evaluate(()=>{selected.skill=0;selected.skillTab='active';render();});await p.locator('#inductionEnabled').uncheck();assert.equal(await p.evaluate(()=>data.classes[0].skills[0].effect),'damage');
  await p.evaluate(()=>openCompanionSkillPage(data.companions[0].id,'active'));await p.locator('#inductionEnabled').check();await p.locator('[data-induction-kind]').selectOption('skill');
  const candidateIds=await p.locator('[data-induction-value] option').evaluateAll(els=>els.map(el=>el.value));
  assert(candidateIds.length);assert(await p.evaluate(ids=>ids.every(id=>data.classes[selected.skillClass].skills.find(s=>s.id===id).partnerId===companionSkillOwner().id),candidateIds));
  assert.deepEqual(await p.evaluate(()=>validateData()),[]);assert.deepEqual(e.errors,[]);assert.deepEqual(g.errors,[]);
 }finally{await e.browser.close();await g.browser.close();}
});
