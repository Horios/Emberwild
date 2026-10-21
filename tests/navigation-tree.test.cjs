const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs');
const root=path.resolve(__dirname,'..');
const json=(runtime,code)=>JSON.parse(runtime.run('JSON.stringify('+code+')'));

test('navigation defaults group every page once and expose the requested mission and life trees',()=>{
  const runtime=loadRuntime(root),design=json(runtime,'EmberwildNavigation.design');
  assert.deepEqual(design.groups.map(group=>group.label),['主線','冒險','背包','商店','生活']);
  assert(design.groups.every(group=>group.expanded===false));
  assert.deepEqual(design.groups.find(group=>group.id==='missions').pages.map(page=>page.label),['主線','支線','NPC 任務','委託']);
  assert.deepEqual(design.groups.find(group=>group.id==='life').pages.map(page=>page.label),['採集','煉金']);
  const pageIds=design.groups.flatMap(group=>group.pages.map(page=>page.id));
  assert.equal(new Set(pageIds).size,pageIds.length);
  assert.deepEqual(pageIds.sort(),Object.keys(json(runtime,'EmberwildNavigation.PAGES')).sort());
  assert.deepEqual(runtime.errors,[]);
});

test('tree navigation renders virtual story categories and independent gathering and alchemy pages',()=>{
  const runtime=loadRuntime(root);runtime.run('selectSaveSlot(1);start(0);closeModal()');
  const html=runtime.elements.get('app').innerHTML;
  assert.match(html,/data-nav-group="missions"[^]*data-page="story-main"[^]*data-page="story-side"[^]*data-page="story-npc"[^]*data-page="quests"/);
  assert.match(html,/data-nav-group="life"[^]*data-page="gather"[^]*data-page="alchemy"/);
  runtime.run("openStory('','side')");
  assert.equal(runtime.run('tab'),'story');
  assert.match(runtime.elements.get('app').innerHTML,/data-page="story-side" class="active"/);
  runtime.run("setTab('gather')");assert.match(runtime.elements.get('app').innerHTML,/<h1>採集<\/h1>/);assert.doesNotMatch(runtime.elements.get('app').innerHTML,/id="life-alchemy"/);
  runtime.run("setTab('alchemy')");assert.match(runtime.elements.get('app').innerHTML,/<h1>煉金<\/h1>/);assert.doesNotMatch(runtime.elements.get('app').innerHTML,/id="life-gather"/);
  assert.deepEqual(runtime.errors,[]);
});

test('navigation begins collapsed and supports persistent independent group ordering',()=>{
  const runtime=loadRuntime(root);
  runtime.run('selectSaveSlot(1);start(0);closeModal()');
  const html=runtime.elements.get('app').innerHTML;
  const groups=[...html.matchAll(/<details class="game-nav-group[^"]*" data-nav-group="([^"]+)"([^>]*)>/g)];
  assert.deepEqual(groups.map(match=>match[1]),['missions','adventure','equipment','shop','life']);
  assert(groups.every(match=>!match[2].includes(' open')),'all sections begin collapsed');
  assert.equal((html.match(/class="game-nav-drag"/g)||[]).length,5);
  assert.match(html,/data-nav-drag="missions" draggable="true"/);
  assert.equal(runtime.run("EmberwildNavigation.moveGroup('life','missions')"),true);
  assert.deepEqual(json(runtime,'EmberwildNavigation.order'),['life','missions','adventure','equipment','shop']);
  assert.equal(runtime.run("EmberwildNavigation.moveGroup('life','life')"),false);
  const reordered=runtime.run("gameNavigationHTML('battle')");
  assert(reordered.indexOf('data-nav-group="life"')<reordered.indexOf('data-nav-group="missions"'));
  assert.deepEqual(JSON.parse(runtime.values.get('emberwild-navigation-group-order-v1')),['life','missions','adventure','equipment','shop']);
  const reloaded=loadRuntime(root,'index.html',Object.fromEntries(runtime.values));
  assert.deepEqual(json(reloaded,'EmberwildNavigation.order'),['life','missions','adventure','equipment','shop']);
  assert.deepEqual(reloaded.errors,[]);
});

test('balance navigation changes round-trip and malformed page lists are rejected atomically',()=>{
  const runtime=loadRuntime(root),before=json(runtime,'exportableBalance()'),custom=structuredClone(before);
  custom.navigation.groups[0].label='冒險總覽';
  const life=custom.navigation.groups.find(group=>group.id==='life');
  life.pages.reverse();
  runtime.ctx.custom=custom;runtime.run('applyBalanceConfig(custom,{persist:true})');
  assert.equal(json(runtime,'exportableBalance().navigation').groups[0].label,'冒險總覽');
  assert.match(runtime.run("gameNavigationHTML('alchemy')"),/冒險總覽/);
  assert(runtime.run("gameNavigationHTML('alchemy')").indexOf('data-page="alchemy"')<runtime.run("gameNavigationHTML('alchemy')").indexOf('data-page="gather"'));
  const bad=structuredClone(custom);bad.navigation.groups.find(group=>group.id==='life').pages.pop();runtime.ctx.bad=bad;
  assert.throws(()=>runtime.run('applyBalanceConfig(bad)'),/導覽列表缺少頁籤/);
  assert.deepEqual(json(runtime,'exportableBalance().navigation'),custom.navigation);
  assert.deepEqual(runtime.errors,[]);
});
