const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openRuntime}=require('./runtime.cjs');
const root=path.resolve(__dirname,'..'),editorRoot=path.resolve(root,'../Emberwild-Balance');
test('Chromium: real roster buttons lock, toggle, persist across reload and match designer JSON',async()=>{
 const g=await openRuntime(root),e=await openRuntime(editorRoot,'balance-editor.html');const page=g.page;page.setDefaultTimeout(10000);
 try{
  await page.evaluate(()=>{selectSaveSlot(1);start(0);closeModal();for(const id of [10,11,13]){recruitCompanion(id);closeModal();}setTab('partnerRoster');});
  await page.getByRole('button',{name:'前往隊伍編成招募夥伴'}).click();await page.evaluate(()=>setTab('partnerRoster'));
  const row=page.locator('[data-member-key="10"]'),details=row.locator('.companion-roster-skills');await details.locator('summary').click();
  const controls=row.locator('[data-companion-toggle]');assert.equal(await controls.count(),3);assert.equal(await controls.nth(1).isDisabled(),true);assert.equal(await controls.nth(2).isDisabled(),true);
  await controls.nth(0).click();await controls.nth(0).filter({hasText:'啟用'}).waitFor();assert.match(await row.innerText(),/已禁用/);assert.equal(await page.evaluate(()=>partyMember(10).active[0]),null);
  await page.evaluate(()=>{playerHero().lv=3;syncParty();render();});assert.equal(await controls.nth(1).isDisabled(),false);await controls.nth(1).click();await controls.nth(1).filter({hasText:'啟用'}).waitFor();
  await page.evaluate(()=>{playerHero().lv=8;syncParty();render();});assert.equal(await controls.nth(2).isDisabled(),false);await controls.nth(2).click();await controls.nth(2).filter({hasText:'啟用'}).waitFor();
  const before=await page.evaluate(()=>structuredClone(partyMember(10).disabledCompanionSkills));assert.equal(before.core.length,2);assert.equal(before.passive.length,1);
  await page.reload();await page.evaluate(()=>{continueFromTitle();closeModal();setTab('partnerRoster');});await details.locator('summary').click();
  assert.deepEqual(await page.evaluate(()=>partyMember(10).disabledCompanionSkills),before);assert.equal(await controls.nth(0).getAttribute('aria-pressed'),'false');assert.equal(await controls.nth(0).innerText(),'啟用');
  await controls.nth(0).click();await controls.nth(0).filter({hasText:'禁用'}).waitFor();assert.equal(await controls.nth(0).getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>partyMember(10).active[0]!==null),true);
  const modalSnapshot=await page.evaluate(()=>{showCompanionRecruitment();const text=$('modal').innerText;closeModal();return text;});assert.match(modalSnapshot,/LV3/);assert.match(modalSnapshot,/LV8/);
  await e.page.evaluate(()=>selectCompanionDesign(15));assert.equal(await e.page.locator('#companionAvailability').inputValue(),'hidden');assert.equal(await e.page.locator('[data-companion]').count(),20);
  await e.page.locator('#companionAvailability').selectOption('visible');assert.equal(await e.page.evaluate(()=>data.companions.find(p=>p.id===15).availability),'visible');
  await e.page.evaluate(()=>{selectCompanionUnlock(15);document.getElementById('companionUnlockType').value='elite';document.getElementById('companionUnlockType').dispatchEvent(new Event('change'));openCompanionSkillPage(10,'active');});assert.equal(await e.page.locator('[data-key="requiredLevel"]').inputValue(),'1');
  const designer=await e.page.evaluate(()=>__EMBERWILD_MASTERY_EDITOR.cleanExport());assert.deepEqual(await e.page.evaluate(()=>validateData()),[]);
  await page.evaluate(d=>{applyBalanceConfig(d);save();loadParty(structuredClone(packParty()));setTab('partnerRoster');},designer);assert.equal(await page.evaluate(()=>partyMember(10).disabledCompanionSkills.core.length),1);
  await page.evaluate(()=>showCompanionRecruitment());const locked=page.locator('#modal .roster-row').filter({hasText:'雷昂'});assert.equal(await locked.count(),1);assert.equal(await locked.getByRole('button',{name:'未解鎖',exact:true}).isDisabled(),true);assert.equal(await page.locator('#modal .roster-row').filter({hasText:'凱斯'}).count(),0);await page.evaluate(()=>closeModal());
  assert.deepEqual(g.errors,[]);assert.deepEqual(e.errors,[]);
 }finally{await g.browser.close();await e.browser.close();}
});
