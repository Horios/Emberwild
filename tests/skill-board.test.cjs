const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs'),root=path.resolve(__dirname,'..');
function game(){const r=loadRuntime(root);r.run("selectSaveSlot(1);start(0);closeModal();setTab('skills')");return r;}
const html=r=>r.elements.get('app').innerHTML;
test('Player skills use sorted level groups with SVG tiles and show only the clicked skill detail',()=>{
 const r=game(),before=html(r),levels=[...before.matchAll(/data-skill-level="(\d+)"/g)].map(x=>Number(x[1]));
 assert(levels.length>1);assert.deepEqual(levels,[...levels].sort((a,b)=>a-b));assert.match(before,/data-team-skill="0:core:0"[\s\S]*?><span[^>]*>[\s\S]*?<svg/);assert(!before.includes('data-team-skill-detail='));assert(!before.includes('class="team-skill-list"'));
 assert.equal(r.run("selectTeamSkill('core',1)"),true);assert.match(html(r),/data-team-skill-detail="0:core:1"/);assert.equal((html(r).match(/data-team-skill-detail=/g)||[]).length,1);assert.equal(r.run("selectTeamSkill('core',999)"),false);assert.match(html(r),/data-team-skill-detail="0:core:1"/);assert.deepEqual(r.errors,[]);
});
test('Learning, equipping and gem changes refresh the selected detail while keeping real team state',()=>{
 const r=game();r.run("playerHero().lv=5;save();__EMBERWILD_MASTERY.gainMastery(playerHero(),'sword',10);selectTeamSkill('core',1);learn(1);equipSkill(1,1)");
 assert.equal(r.run('playerHero().skills[1]'),1);assert.equal(r.run('playerHero().active[1]'),1);assert.match(html(r),/data-team-skill-detail="0:core:1"/);assert.match(html(r),/本隊已裝配/);
 r.run("playerHero().gems[0]=1;socket(1,0)");assert.equal(r.run('playerHero().sockets[1]'),0);assert.match(html(r),/data-team-skill-detail="0:core:1"/);
 r.run('resetSkills()');assert.equal(r.run('playerHero().skills[1]'),0);assert.match(html(r),/data-team-skill-detail="0:core:1"/);assert.deepEqual(r.errors,[]);
});
test('Other class previews have no mutation controls and switching classes or plans clears stale selection',()=>{
 const r=game(),before=r.run('JSON.stringify(party.buildSystem)');r.run("selectTeamSkill('core',0);browsePlayerSkillClass(1)");assert(!html(r).includes('data-team-skill-detail='));r.run("selectTeamSkill('core',0)");assert.match(html(r),/data-team-skill-detail="1:core:0"/);assert(!html(r).includes('onclick="heroMenuAction(0,()=>{learn('));assert.equal(r.run('JSON.stringify(party.buildSystem)'),before);
 r.run("browsePlayerSkillClass(0);selectTeamSkill('core',1);copyTeamPlan();switchTeamPlan('team-2')");assert(!html(r).includes('data-team-skill-detail='));assert.deepEqual(r.errors,[]);
});
test('Redraws replace the actual skills scroll region but restore its position through learn and equip actions',()=>{
 const r=game();r.run(`
 globalThis.skillScroll={scrollTop:0,scrollLeft:0};
 const app=document.getElementById('app');let appHTML=app.innerHTML;
 Object.defineProperty(app,'innerHTML',{get:()=>appHTML,set:value=>{appHTML=value;skillScroll={scrollTop:0,scrollLeft:0};}});
 document.querySelectorAll=selector=>selector.split(',').includes('.player-skill-page')?[skillScroll]:[];
 render();playerHero().lv=5;save();__EMBERWILD_MASTERY.gainMastery(playerHero(),'sword',10);skillScroll.scrollTop=186;skillScroll.scrollLeft=7;
 heroMenuAction(memberKey(playerHero()),()=>{selectTeamSkill('core',1)});
 `);
 for(const action of ['learn(1)','equipSkill(1,1)','slotSupport(0,1)','render()']){
  r.run(`heroMenuAction(memberKey(playerHero()),()=>{${action}})`);assert.equal(r.run('skillScroll.scrollTop'),186,action);assert.equal(r.run('skillScroll.scrollLeft'),7,action);
 }
 assert.equal(r.run('playerHero().skills[1]'),1);assert.equal(r.run('playerHero().active[1]'),1);
 assert.deepEqual(r.errors,[]);
});
test('Three colored gem choices share one slot; replacing, removing and reloading preserve physical inventory',()=>{
 const r=game();r.run("selectTeamSkill('core',0)");assert.match(html(r),/鑲嵌槽：空/);assert.equal((html(r).match(/data-team-gem=/g)||[]).length,3);assert.equal(new Set([...html(r).matchAll(/skill-gem-icon" style="color:([^\"]+)/g)].map(x=>x[1])).size,3);
 r.run('playerHero().gems=[1,1,1];save();render()');
 for(const type of [0,1,2]){r.run(`heroMenuAction(memberKey(playerHero()),()=>socket(0,${type}))`);assert.equal(r.run('playerHero().sockets[0]'),type);assert.match(html(r),new RegExp('鑲嵌槽：'+r.run(`GEMS[${type}].name`)));assert.equal(r.run(`playerHero().gems[${type}]`),0);assert.equal(r.run('playerHero().gems.reduce((a,b)=>a+b,0)'),2);}
 const cold=loadRuntime(root,'index.html',Object.fromEntries(r.values));cold.run("continueFromTitle();closeModal();setTab('skills');selectTeamSkill('core',0)");assert.equal(cold.run('playerHero().sockets[0]'),2);assert.match(html(cold),/鑲嵌槽：共鳴石/);
 r.run('socket(0,-1)');assert.equal(r.run('playerHero().sockets[0]'),null);assert.equal(r.run('playerHero().gems.reduce((a,b)=>a+b,0)'),3);assert.match(html(r),/鑲嵌槽：空/);assert.deepEqual(r.errors,[]);assert.deepEqual(cold.errors,[]);
});
