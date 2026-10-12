const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs'),root=path.resolve(__dirname,'..');
const json=(r,s)=>JSON.parse(r.run('JSON.stringify('+s+')'));
function game(time){const r=loadRuntime(root,'index.html',{},time);r.run('selectSaveSlot(1);start(0);closeModal();recruitCompanion(10);closeModal()');return r;}
function task(r,source='gather',kind='gem'){
  r.run(`{const q=playerHero().board.tasks[0];q.source=${JSON.stringify(source)};q.mat=${JSON.stringify(source==='potion'?'簡易治療藥水':source==='alchemy'?'紅色草泥':source==='monster'?'黏稠凝膠':'紅色草')};q.n=3;q.kind=${JSON.stringify(kind)};q.done=false;delete q.item;if(q.source==='potion'){q.item='heal_small';setHealPotionCount(q.item,5);}else playerHero().materials[q.mat]=5;}`);
}
test('One daily commission survives six save/load cycles for every product, with exact shared-stock deductions',()=>{
 for(const source of ['gather','alchemy','potion']){
  let r=game();task(r,source);r.run('globalThis.id=state.board.tasks[0].id');const before=json(r,'({gold:state.gold,repeat:state.repeat})');
  assert.equal(r.run('claimBoard(id)'),true);assert.equal(r.run(source==='potion'?"healPotionCount('heal_small')":"state.materials[state.board.tasks[0].mat]"),2);
  assert.equal(r.run('claimBoard(id)'),false);assert.equal(r.run('state.repeat'),before.repeat+1);assert(r.run('state.gold')>before.gold);
  const finished=json(r,'state.board');
  for(let i=0;i<6;i++){
   r.run('loadParty(JSON.parse(JSON.stringify(packParty())));save()');r=loadRuntime(root,'index.html',Object.fromEntries(r.values));r.run('continueFromTitle();closeModal()');
   assert.deepEqual(json(r,'state.board'),finished);assert.equal(r.run('claimBoard(state.board.tasks[0].id)'),false);assert.equal(r.run('questReadyCount()'),0);assert.deepEqual(r.errors,[]);
  }
 }
});
test('Taipei midnight refreshes once; map/character switches, paid refresh and old repeat calls cannot reroll',()=>{
 const r=game(Date.parse('2026-10-12T15:59:59Z'));task(r);const before=r.run('JSON.stringify(state.board)');
 r.run('refreshBoard();confirmRefresh();buildBoard();claimRepeat();party.selected=memberKey(party.members[1]);state=party.members[1];questView()');assert.equal(r.run('JSON.stringify(state.board)'),before);
 r.run('party.map=1;questView()');assert.equal(r.run('JSON.stringify(state.board)'),before);r.run('party.map=0');
 r.advance(1000);assert.equal(r.run('ensureBoard()'),true);assert.equal(r.run('state.board.day'),'2026-10-13');assert.equal(r.run('state.board.tasks.length'),1);
 const next=r.run('JSON.stringify(state.board)');r.run('ensureBoard();buildBoard();questView()');assert.equal(r.run('JSON.stringify(state.board)'),next);
 r.advance(-86400000);r.run('ensureBoard()');assert.equal(r.run('JSON.stringify(state.board)'),next);assert.deepEqual(r.errors,[]);
});
test('Insufficient stock, full gear bags and failed persistence leave no rewards or daily claim',()=>{
 const r=game();task(r);r.run('state.materials["紅色草"]=2');const before=r.run('JSON.stringify(packParty())');assert.equal(r.run('claimBoard(state.board.tasks[0].id)'),false);assert.equal(r.run('JSON.stringify(packParty())'),before);
 task(r,'gather','gear');r.run('globalThis.cap=GAMEPLAY_SETTINGS.equipment.bagCapacity;GAMEPLAY_SETTINGS.equipment.bagCapacity=state.bag.length');assert.equal(r.run('claimBoard(state.board.tasks[0].id)'),false);assert.equal(r.run('state.materials["紅色草"]'),5);assert.equal(r.run('questReadyCount()'),0);r.run('GAMEPLAY_SETTINGS.equipment.bagCapacity=cap');
 for(const source of ['gather','potion']){task(r,source,'gear');const prior=r.run('JSON.stringify(packParty())');r.run('globalThis.originalSave=save;save=()=>false');assert.equal(r.run('claimBoard(state.board.tasks[0].id)'),false);assert.equal(r.run('JSON.stringify(packParty())'),prior);r.run('save=originalSave');assert.equal(r.run('claimBoard(state.board.tasks[0].id)'),true);}
});
test('Legacy three-task boards migrate once without duplicating shared tasks or losing side-quest progress',()=>{
 const r=game();r.run('globalThis.old=JSON.parse(JSON.stringify(packParty()));const b=old.members[0].board;delete b.dailyVersion;delete b.day;b.next=Date.now()+100000;b.tasks=MAPS[0].mobs.slice(0,3).map((mob,i)=>({id:"legacy-"+i,map:0,mat:mob[2],n:8,kind:"gem",gem:0,slot:0,rar:2,done:false}));old.members[0].claimed=[QUESTS[0].id];old.members[0].repeat=12;loadParty(old)');assert.equal(r.run('state.board.tasks.length'),1);assert.equal(r.run('state.board.dailyVersion'),1);assert.equal(r.run('state.repeat'),12);assert(r.run('state.claimed.includes(QUESTS[0].id)'));r.run('loadParty(packParty())');assert.equal(r.run('state.board.tasks.length'),1);
});
test('Malformed daily dates, sources, item references and extra tasks fail import atomically',()=>{
 const r=game();task(r,'potion');const before=r.run('JSON.stringify(packParty())');
 for(const change of ['b.day="2026-02-30"','b.next+=1000','b.dailyVersion=2','b.tasks.push({...b.tasks[0],id:"extra"})','b.tasks[0].item="heal_large"','b.tasks[0].job=99','b.tasks[0].source="unknown"','b.tasks[0].mat="紅色草"']){
  r.run('globalThis.bad=JSON.parse(JSON.stringify(packParty()));globalThis.b=bad.members[0].board;'+change);assert.throws(()=>r.run('loadParty(bad)'),/委託/);assert.equal(r.run('JSON.stringify(packParty())'),before);
 }
});
test('All page renderers remain valid with a companion selected; only actual item recipients retain selection',()=>{
 const r=game();r.run('party.selected=memberKey(party.members[1]);state=party.members[1];for(const page of ["character","quests","forge","bossCraft","equipment","shop"])pageHeroSelection.set(page,party.selected)');
 for(const v of ['questView','characterView','skillsView','equipmentView','forgeView','bossCraftView','shopView','lifeSkillsView','wornEquipmentView','rosterView','partnerRosterView','guideView','optionsView','mailboxView','achievementsView'])assert.doesNotMatch(r.run(v+'()'),/undefined|NaN/,v);
 for(const v of ['questView','characterView','skillsView','equipmentView','forgeView','bossCraftView','shopView','lifeSkillsView'])assert.doesNotMatch(r.run(v+'()'),/本頁操作角色|selectPageHero\('quests'/,v);
 assert.match(r.run('accountItemsView()'),/使用角色/);assert.match(r.run('bossCraftView()'),/BOSS 裝備職業/);assert.deepEqual(r.errors,[]);
});
test('Daily generation covers exploration, gathering, paste and healing potions across dates',()=>{
 const r=game(),sources=new Set();r.run('globalThis.seed=123456;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}');for(let i=0;i<80;i++){sources.add(r.run('state.board.tasks[0].source'));assert.equal(r.run('validateParty(packParty()).members[0].board.tasks.length'),1);r.advance(86400000);r.run('ensureBoard()');}
 assert.deepEqual([...sources].sort(),['alchemy','gather','monster','potion']);
});
