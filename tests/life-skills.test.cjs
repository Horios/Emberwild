const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs');
const root=path.resolve(__dirname,'..');
const json=(r,code)=>JSON.parse(r.run('JSON.stringify('+code+')'));
function game(){const r=loadRuntime(root);r.run('selectSaveSlot(1);start(0);closeModal();Math.random=()=>.99;');return r;}
function advance(r,ms){r.advance(ms);r.run('tick();');}

test('Gathering awards exactly once per five seconds and updates the accessible progress bar',()=>{
  const r=game();r.run('setTab("lifeSkills");startLifeGathering();');
  assert.match(r.elements.get('app').innerHTML,/setTab\('lifeSkills'\)/);
  assert.match(r.elements.get('app').innerHTML,/<progress[^>]+aria-label="採集進度"/);
  advance(r,4999);assert.equal(r.run('materialCount("紅色草")'),0);
  assert.equal(r.elements.get('life-gather-progress').value,4999);
  advance(r,1);assert.equal(r.run('materialCount("紅色草")'),1);
  assert.equal(r.elements.get('life-gather-progress').value,0);
  advance(r,15000);assert.equal(r.run('materialCount("紅色草")'),4);
  assert.equal(r.run('materialCount("小蟲")'),0);
  r.run('Math.random=()=>.049;');advance(r,5000);assert.equal(r.run('materialCount("小蟲")'),1);
  r.run('Math.random=()=>.05;');advance(r,5000);assert.equal(r.run('materialCount("小蟲")'),1);
  r.run('stopLifeGathering();');advance(r,50000);assert.equal(r.run('materialCount("紅色草")'),6);
  assert.deepEqual(r.errors,[]);
});

test('The full gather/process/alchemy chain consumes one of each input and produces the existing shop potion',()=>{
  const r=game();r.run('startLifeGathering();');advance(r,5000);r.run('stopLifeGathering();');
  assert.equal(r.run('startLifeWork("process")'),true);
  advance(r,4999);assert.equal(r.run('materialCount("紅色草")'),1);assert.equal(r.run('materialCount("紅色草泥")'),0);
  advance(r,1);assert.equal(r.run('materialCount("紅色草")'),0);assert.equal(r.run('materialCount("紅色草泥")'),1);
  assert.equal(r.run('startLifeWork("alchemy")'),false);
  const gold=r.run('state.gold');r.run('buyLifeMaterial("藥水瓶");buyLifeMaterial("清水");');assert.equal(r.run('state.gold'),gold-2);
  const stock=r.run('healPotionCount("heal_small")');assert.equal(r.run('startLifeWork("alchemy")'),true);advance(r,5000);
  for(const name of ['紅色草泥','藥水瓶','清水'])assert.equal(r.run('materialCount('+JSON.stringify(name)+')'),0);
  assert.equal(r.run('healPotionCount("heal_small")'),stock+1);
  assert.equal(r.run('SHOP.find(x=>x.id==="heal_small").cost'),8);
  assert.match(r.run('accountItemsView()'),/data-inventory-item="heal_small"/);
  assert.deepEqual(r.errors,[]);
});

test('Gathering and alchemy continue on other pages alongside actual exploration at every battle speed',()=>{
  for(const rate of [1,2,4]){
    const r=game();r.run(`recruitCompanion(10);closeModal();recruitCompanion(11);closeModal();state.materials['紅色草泥']=10;buyLifeMaterial('藥水瓶',10);buyLifeMaterial('清水',10);spawnGroup();foes.forEach(f=>{f.hp=f.maxhp=1e9;f.atk=0;});running=true;setBattleSpeed(${rate});startLifeGathering();startLifeWork('alchemy');setTab('equipment');`);
    const stock=r.run('healPotionCount("heal_small")');
    for(let i=0;i<100;i++)advance(r,100);
    assert.equal(r.run('materialCount("紅色草")'),2);assert.equal(r.run('healPotionCount("heal_small")'),stock+2);
    assert.equal(r.run('running'),true);assert(r.run('foes.some(f=>f.hp<f.maxhp)'));
    assert.deepEqual(r.errors,[]);
  }
});

test('Processing and alchemy are mutually exclusive; stopping resets progress and inputs are charged on completion',()=>{
  const r=game();r.run('state.materials["紅色草"]=3;state.materials["紅色草泥"]=3;buyLifeMaterial("藥水瓶",3);buyLifeMaterial("清水",3);');
  assert.equal(r.run('startLifeWork("process")'),true);advance(r,2500);
  const before=json(r,'__EMBERWILD_LIFE_SKILLS.jobs');assert.equal(r.run('startLifeWork("alchemy")'),false);assert.deepEqual(json(r,'__EMBERWILD_LIFE_SKILLS.jobs'),before);
  r.run('stopLifeWork();startLifeWork("alchemy");');advance(r,2500);assert.equal(r.run('healPotionCount("heal_small")'),0);
  advance(r,2500);assert.equal(r.run('healPotionCount("heal_small")'),1);
  assert.equal(r.run('startLifeWork("process")'),false);
  r.run('stopLifeWork();startLifeWork("process");');advance(r,5000);
  assert.equal(r.run('materialCount("紅色草")'),2);
  assert.deepEqual(r.errors,[]);
});

test('Missing inputs or full output stock stop cleanly without consuming partial recipes',()=>{
  const r=game();r.run('state.materials["紅色草泥"]=1;buyLifeMaterial("藥水瓶");buyLifeMaterial("清水");startLifeWork("alchemy");sellMaterial("清水",1);');advance(r,5000);
  assert.equal(r.run('materialCount("紅色草泥")'),1);assert.equal(r.run('materialCount("藥水瓶")'),1);assert.equal(r.run('healPotionCount("heal_small")'),0);assert.equal(r.run('__EMBERWILD_LIFE_SKILLS.jobs.work'),null);
  r.run('state.materials["紅色草"]=1;state.materials["紅色草泥"]=1e9;');assert.equal(r.run('startLifeWork("process")'),false);
  r.run('state.materials["紅色草"]=1e9;');assert.equal(r.run('startLifeGathering()'),false);
  assert.deepEqual(r.errors,[]);
});

test('New materials can be sold at requested prices, including after old balance JSON is applied',()=>{
  const r=game();r.run('state.materials["紅色草"]=4;state.materials["小蟲"]=2;');
  assert.equal(r.run('materialSellPrice("紅色草")'),1);assert.equal(r.run('materialSellPrice("小蟲")'),3);
  assert.match(r.run('accountMaterialsView()'),/data-material="紅色草"/);assert.match(r.run('accountMaterialsView()'),/data-material="小蟲"/);
  r.run('{const d=exportableBalance();d.balanceSettings.economy.materialPrices=d.balanceSettings.economy.materialPrices.filter(x=>!["紅色草","小蟲","清水","藥水瓶"].includes(x.key));applyBalanceConfig(d);}');
  const gold=r.run('state.gold');r.run('sellMaterial("紅色草",4);sellMaterial("小蟲",2);');assert.equal(r.run('state.gold'),gold+10);
  for(const name of ['清水','藥水瓶'])assert(r.run('materialSellPrice('+JSON.stringify(name)+')')<=1);
  assert.match(r.run('lifeSkillsView()'),/小蟲暫無其他用途/);
});

test('Purchases and timed rewards roll back when saving fails',()=>{
  const r=game();r.run('startLifeGathering();');const gold=r.run('state.gold');
  r.run('globalThis.originalSave=save;save=()=>false;');assert.equal(r.run('buyLifeMaterial("清水",10)'),false);assert.equal(r.run('state.gold'),gold);assert.equal(r.run('materialCount("清水")'),0);
  advance(r,5000);assert.equal(r.run('materialCount("紅色草")'),0);assert.equal(r.run('__EMBERWILD_LIFE_SKILLS.jobs.gather'),null);
  r.run('save=originalSave;state.materials["紅色草泥"]=1;buyLifeMaterial("清水");buyLifeMaterial("藥水瓶");startLifeWork("alchemy");save=()=>false;');advance(r,5000);
  assert.equal(r.run('materialCount("紅色草泥")'),1);assert.equal(r.run('materialCount("清水")'),1);assert.equal(r.run('materialCount("藥水瓶")'),1);assert.equal(r.run('healPotionCount("heal_small")'),0);
  r.run('save=originalSave;');assert.deepEqual(r.errors,[]);
});

test('Produced materials/potions survive JSON round-trip and cold reload; tasks stop at load or title without offline rewards',()=>{
  const r=game();r.run('state.materials["紅色草泥"]=2;buyLifeMaterial("清水",2);buyLifeMaterial("藥水瓶",2);startLifeGathering();startLifeWork("alchemy");');advance(r,5000);
  const before=json(r,'({materials:state.materials,potions:healingInventory()})');r.run('loadParty(structuredClone(packParty()));save();');
  assert.deepEqual(json(r,'({materials:state.materials,potions:healingInventory()})'),before);assert.deepEqual(json(r,'__EMBERWILD_LIFE_SKILLS.jobs'),{gather:null,work:null});
  const reload=loadRuntime(root,'index.html',Object.fromEntries(r.values),r.now+86400000);reload.run('continueFromTitle();tick();');
  assert.deepEqual(json(reload,'({materials:state.materials,potions:healingInventory()})'),before);
  reload.run('startLifeGathering();startLifeWork("alchemy");returnToTitle();');advance(reload,10000);assert.deepEqual(json(reload,'({materials:state.materials,potions:healingInventory()})'),before);
  assert.deepEqual(reload.errors,[]);
});

test('Zero-stock potion rows hide, appear after acquisition, and hide again after consumption or selling',()=>{
  const r=game();r.run('for(const item of SHOP){if(isHealPotion(item))setHealPotionCount(item.id,0);else state.consumables[item.id]=0;}');
  assert.doesNotMatch(r.run('accountItemsView()'),/data-inventory-item="(?:heal_|imbue_|ward_|elementTonic_)/);assert.match(r.run('accountItemsView()'),/data-inventory-item="power_tier_reroll"/);
  r.run('setHealPotionCount("heal_small",1);state.consumables.imbue_fire=1;');
  assert.match(r.run('accountItemsView()'),/data-inventory-item="heal_small"/);assert.match(r.run('accountItemsView()'),/data-inventory-item="imbue_fire"/);
  r.run('sellInventoryItem("heal_small",1);useInventoryItem("imbue_fire",memberKey(playerHero()));');assert.doesNotMatch(r.run('accountItemsView()'),/data-inventory-item="(?:heal_|imbue_|ward_|elementTonic_)/);
  assert.deepEqual(r.errors,[]);
});

test('Companions use canonical names across UI, rename entry points, old saves and reload; the player can still rename',()=>{
  const r=game();r.run('recruitCompanion(10);closeModal();');const name=r.run('partyMember(10).name');
  assert.doesNotMatch(r.run('partnerRosterView()'),/requestRename/);assert.doesNotMatch(r.run('rosterView()'),/requestRename\(10\)/);assert.match(r.run('rosterView()'),/requestRename\(0\)/);
  r.run('requestRename(10);');assert.equal(r.elements.get('modal').open,false);
  r.run(`$('rename-hero-input').value='無法改名';`);r.run('confirmRename(10);');assert.equal(r.run('partyMember(10).name'),name);
  r.run('requestRename(0);');r.run(`$('rename-hero-input').value='主角名字';`);r.run('confirmRename(0);');assert.equal(r.run('playerHero().name'),'主角名字');
  r.run('{const old=structuredClone(packParty());old.members[1].name="舊夥伴別名";old.companionNames[10]="舊夥伴別名";loadParty(old);save();}');assert.equal(r.run('partyMember(10).name'),name);
  const reload=loadRuntime(root,'index.html',Object.fromEntries(r.values));assert.equal(reload.run('partyMember(10).name'),name);assert.equal(reload.run('playerHero().name'),'主角名字');assert.deepEqual(reload.errors,[]);
});
