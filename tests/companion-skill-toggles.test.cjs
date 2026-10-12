const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs');
const root=path.resolve(__dirname,'..'),editorRoot=path.resolve(root,'../Emberwild-Balance');
const json=(r,s)=>JSON.parse(r.run('JSON.stringify('+s+')'));
test('Default recruitment contains exactly five unlocked roles; hidden/locked entries cannot be acquired and states round-trip',()=>{
 const r=loadRuntime(root);r.run('selectSaveSlot(1);start(0);closeModal();showCompanionRecruitment();');const doc=json(r,'exportableBalance()');
 assert.deepEqual(doc.companions.filter(p=>p.availability==='unlocked').map(p=>p.id),[10,11,12,13,14]);assert.equal(doc.companions.filter(p=>p.availability==='hidden').length,15);
 const modal=r.elements.get('modal').innerHTML;assert.equal((modal.match(/recruitCompanion\(/g)||[]).length,5);assert(!modal.includes('雷昂'));
 r.run('closeModal();recruitCompanion(15);acquireCompanion(16);');assert.equal(r.run('party.members.length'),1);
 r.run(`{const d=exportableBalance();d.companions.find(p=>p.id===11).availability='locked';d.companions.find(p=>p.id===15).availability='unlocked';applyBalanceConfig(d);showCompanionRecruitment();}`);
 assert.match(r.elements.get('modal').innerHTML,/disabled>未解鎖/);assert.match(r.elements.get('modal').innerHTML,/雷昂/);r.run('closeModal();acquireCompanion(11);acquireCompanion(15);save();loadParty(structuredClone(packParty()));');assert.equal(r.run('partyMember(11)'),undefined);assert.equal(r.run('partyMember(15).name'),'雷昂');
 r.run("recruitCompanion(10);closeModal();party.active=[10,15];party.enlisted=[10,15];party.selected=15;state=partyMember(15);{const d=exportableBalance();d.companions.find(p=>p.id===15).availability='hidden';applyBalanceConfig(d);setTab('partnerRoster');save();}");assert.notEqual(r.run('party.selected'),15);assert.equal(r.run('party.enlisted.includes(party.selected)'),true);assert(!r.elements.get('app').innerHTML.includes('雷昂'));assert.equal(r.run('party.active.includes(15)'),false);assert.equal(r.run('party.enlisted.includes(15)'),false);assert.equal(r.run('setPartnerEnlisted(15,true)'),false);assert.equal(r.run('toggleMember(15)'),false);
 const before=r.run('JSON.stringify(exportableBalance())');assert.throws(()=>r.run(`{const d=exportableBalance();d.companions[0].availability='bad';applyBalanceConfig(d);}`),/解鎖狀態無效/);assert.equal(r.run('JSON.stringify(exportableBalance())'),before);
 const reload=loadRuntime(root,'index.html',Object.fromEntries(r.values));assert.equal(reload.run('__EMBERWILD_COMPANION_TEST_API.plans.find(p=>p.id===11).availability'),'locked');assert.equal(reload.run('partyMember(15).name'),'雷昂');
 const e=loadRuntime(editorRoot,'balance-editor.html');e.run(`selectCompanionDesign(15);document.getElementById('companionAvailability').onchange({target:{value:'locked'}});`);assert.equal(e.run('data.companions.find(p=>p.id===15).availability'),'locked');assert.deepEqual(json(e,'validateData()'),[]);assert.deepEqual(r.errors,[]);assert.deepEqual(reload.errors,[]);
});
function game(){const r=loadRuntime(root);r.run('selectSaveSlot(1);start(0);closeModal();globalThis.__initialCatalog=exportableBalance();const unlocked=exportableBalance();for(const p of unlocked.companions)p.availability="unlocked";applyBalanceConfig(unlocked);for(const p of __EMBERWILD_COMPANION_TEST_API.plans){recruitCompanion(p.id);closeModal();}');return r;}

test('All 20 built-in companions have three focused skills unlocking exactly at levels 1, 3 and 8',()=>{
 const r=game(),doc=json(r,'__initialCatalog');assert.equal(doc.companions.length,20);
 for(const p of doc.companions){assert.equal(p.core.length+p.support.length+p.passives.length,3);assert.deepEqual(p.core.map(i=>doc.classes[p.job].skills[i].requiredLevel),[1,3]);assert.equal(doc.passiveDefinitions.find(d=>d.id===p.passives[0]).requiredLevel,8);assert.equal(doc.classes[p.job].skills[p.core[0]].activation,'active');}
 for(const lv of [1,2,3,7,8,2,1]){
  r.run(`playerHero().lv=${lv};syncParty();`);
  for(const row of json(r,'party.members.slice(1).map(h=>{const p=__EMBERWILD_COMPANION_TEST_API.companionPlan(h);return {skills:p.core.map(i=>h.skills[i]),passives:__EMBERWILD_COMPANION_TEST_API.passivesFor(h).length};})')){assert.deepEqual(row.skills,[1,Number(lv>=3)]);assert.equal(row.passives,Number(lv>=8));}
 }
 const tank=doc.companions.find(p=>p.id===11),priest=doc.companions.find(p=>p.id===13);assert.deepEqual(tank.core.map(i=>doc.classes[0].skills[i].effect),['tauntRage','shield']);assert(priest.core.every(i=>doc.classes[3].skills[i].effect==='heal'));
 const e=loadRuntime(editorRoot,'balance-editor.html'),editor=json(e,'__EMBERWILD_MASTERY_EDITOR.cleanExport()');assert.deepEqual(json(e,'validateData()'),[]);
 for(const p of doc.companions){const other=editor.companions.find(x=>x.id===p.id);for(const k of ['name','description','core','active','proc','support','passives','availability'])assert.deepEqual(other[k],p[k]);}
 assert.deepEqual(r.errors,[]);assert.deepEqual(e.errors,[]);
});

test('Toggles stop actual active/proc casts and stat passives, preserve learning, and survive levels, saves and cold boot',()=>{
 const r=game();r.run('playerHero().lv=8;syncParty();globalThis.h=partyMember(10);globalThis.p=__EMBERWILD_COMPANION_TEST_API.companionPlan(h);globalThis.before=stats(h).atk;');
 assert.equal(r.run("setCompanionSkillEnabled(10,'core',p.core[0],false)"),true);assert.equal(r.run("setCompanionSkillEnabled(10,'core',p.core[1],false)"),true);assert.equal(r.run("setCompanionSkillEnabled(10,'passive',p.passives[0],false)"),true);
 assert.deepEqual(json(r,'h.active'),[null,null]);assert.deepEqual(json(r,'h.procSlots'),[null,null]);assert.deepEqual(json(r,'p.core.map(i=>h.skills[i])'),[1,1]);assert(r.run('stats(h).atk<before'));
 r.run(`foes=[{id:'dummy',hp:10000,maxhp:10000,def:0,atk:1,lv:1,kind:'normal',element:'physical',race:'beast'}];`);
 for(const i of json(r,'p.core')){assert.equal(r.run(`castPartySkill(h,${i},battleStats(h))`),false);}
 const disabled=json(r,'h.disabledCompanionSkills');
 r.run('playerHero().lv=2;syncParty();playerHero().lv=9;syncParty();render();save();loadParty(structuredClone(packParty()));save();');
 assert.deepEqual(json(r,'partyMember(10).disabledCompanionSkills'),disabled);
 const reload=loadRuntime(root,'index.html',Object.fromEntries(r.values));assert.deepEqual(json(reload,'partyMember(10).disabledCompanionSkills'),disabled);assert.deepEqual(json(reload,'partyMember(10).active'),[null,null]);assert.equal(reload.run('__EMBERWILD_COMPANION_TEST_API.passivesFor(partyMember(10)).length'),0);
 reload.ctx.disabled=disabled;reload.run(`const p=__EMBERWILD_COMPANION_TEST_API.companionPlan(partyMember(10));for(const i of p.core)setCompanionSkillEnabled(10,'core',i,true);setCompanionSkillEnabled(10,'passive',p.passives[0],true);`);
 assert.deepEqual(json(reload,'partyMember(10).disabledCompanionSkills'),{core:[],support:[],passive:[]});assert.equal(reload.run('__EMBERWILD_COMPANION_TEST_API.passivesFor(partyMember(10)).length'),1);assert.deepEqual(r.errors,[]);assert.deepEqual(reload.errors,[]);
});

test('Locked, foreign and invalid selections fail without changing the save; malformed settings reject atomically',()=>{
 const r=game(),before=r.run('JSON.stringify(packParty())');
 for(const code of ["setCompanionSkillEnabled(0,'core',0,false)","setCompanionSkillEnabled(10,'core',0,false)","setCompanionSkillEnabled(10,'core',__EMBERWILD_COMPANION_TEST_API.plans[0].core[1],false)","setCompanionSkillEnabled(10,'passive',__EMBERWILD_COMPANION_TEST_API.plans[0].passives[0],false)","setCompanionSkillEnabled(10,'wrong',1,false)"]){assert.equal(r.run(code),false);assert.equal(r.run('JSON.stringify(packParty())'),before);}
 for(const raw of [null,[],{core:[64]},{core:[7,7]},{passive:['bad id']},{unknown:[]}]){r.ctx.bad=raw;assert.throws(()=>r.run('{const raw=structuredClone(packParty());raw.members[1].disabledCompanionSkills=bad;loadParty(raw);}'),/啟用設定無效/);assert.equal(r.run('JSON.stringify(packParty())'),before);}
 r.run('const old=structuredClone(packParty());for(const h of old.members)delete h.disabledCompanionSkills;loadParty(old);');assert.deepEqual(json(r,'partyMember(10).disabledCompanionSkills'),{core:[],support:[],passive:[]});assert.equal(r.run('partyMember(10).active[0]!==null'),true);
});

test('Imported support and aura toggles work, and explicitly disabled induction targets cannot execute',()=>{
 const r=game();r.run(`playerHero().lv=8;syncParty();const d=exportableBalance(),p=d.companions.find(p=>p.id===10);p.support=[d.supportSkills[0].findIndex(s=>s.partnerId===10)];d.supportSkills[0][p.support[0]].level=1;d.passiveDefinitions.push({id:'toggle-aura',partnerId:10,name:'光環',requiredLevel:1,target:'allies',effects:[{key:'flatAttack',value:10}]});p.passives=['toggle-aura'];d.classes[0].skills[p.core[0]].tags=['induce'];d.classes[0].skills[p.core[0]].induction={targets:[{kind:'skill',skillId:d.classes[0].skills[p.core[1]].id,chance:1}]};applyBalanceConfig(d);party.active=[0,10];globalThis.h=partyMember(10);globalThis.p=__EMBERWILD_COMPANION_TEST_API.companionPlan(h);globalThis.before=stats(playerHero()).atk;`);
 assert.equal(r.run("setCompanionSkillEnabled(10,'passive','toggle-aura',false)"),true);assert.equal(r.run('stats(playerHero()).atk'),r.run('before-10'));
 r.run("setCompanionSkillEnabled(10,'support',p.support[0],false)");assert.deepEqual(json(r,'h.supportSlots'),[null,null]);assert.equal(r.run('castSupport(h,p.support[0])'),false);
 r.run(`setCompanionSkillEnabled(10,'core',p.core[1],false);foes=[{id:'dummy',hp:10000,maxhp:10000,def:0,atk:1,lv:1,kind:'normal',element:'physical',race:'beast'}];Math.random=()=>0;globalThis.damage=()=>{foes[0].hp=10000;castPartySkill(h,p.core[0],battleStats(h));return 10000-foes[0].hp;};globalThis.onlyActive=damage();setCompanionSkillEnabled(10,'core',p.core[1],true);`);
 assert(r.run('damage()>onlyActive'));r.run("setCompanionSkillEnabled(10,'support',p.support[0],true)");assert.equal(r.run('h.supportSlots[0]'),r.run('p.support[0]'));assert.deepEqual(r.errors,[]);
});
