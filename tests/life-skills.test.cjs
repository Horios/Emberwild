const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs');
const root=path.resolve(__dirname,'..');
const json=(r,code)=>JSON.parse(r.run('JSON.stringify('+code+')'));
function game(){const r=loadRuntime(root);r.run('selectSaveSlot(1);start(0);closeModal();Math.random=()=>.99;');return r;}
function advance(r,ms,{combat=false}={}){
 r.advance(ms);
 // Standalone life skill tests advance their existing real-time heartbeat.
 // Headless combat tick can initiate asynchronous offline debt settlement,
 // which this VM test runner cannot flush and which blocks subsequent reloads.
 // Only the explicit combat-integration scenario requests that extra tick.
 r.run(combat?'emberwildLifeHeartbeat();tick();':'emberwildLifeHeartbeat();');
}

test('Gathering awards exactly once per five seconds and updates the accessible progress bar',()=>{
  const r=game();r.run('setTab("gather");startLifeGathering();');
  const initialHerb=r.run('materialCount("紅色草")'),initialBug=r.run('materialCount("小蟲")');
  assert.match(r.elements.get('app').innerHTML,/setTab\('gather'\)/);
  assert.match(r.run('gatheringView()'),/<progress[^>]+aria-label="採集進度"/);
  advance(r,4999);assert.equal(r.run('materialCount("紅色草")'),initialHerb);
  assert.equal(r.run('__EMBERWILD_LIFE_SKILLS.jobs.gather.elapsed'),4999);
  assert.match(r.run('gatheringView()'),/id="life-gather-progress"[^>]*value="4999"/);
  advance(r,1);assert.equal(r.run('materialCount("紅色草")'),initialHerb+1);
  assert.equal(r.run('__EMBERWILD_LIFE_SKILLS.jobs.gather.elapsed'),0);
  advance(r,15000);assert.equal(r.run('materialCount("紅色草")'),initialHerb+4);
  assert.equal(r.run('materialCount("小蟲")'),initialBug);
  r.run('Math.random=()=>.049;');advance(r,5000);assert.equal(r.run('materialCount("小蟲")'),initialBug+1);
  r.run('Math.random=()=>.05;');advance(r,5000);assert.equal(r.run('materialCount("小蟲")'),initialBug+1);
  r.run('stopLifeGathering();');advance(r,50000);assert.equal(r.run('materialCount("紅色草")'),initialHerb+6);
  assert.deepEqual(r.errors,[]);
});

test('The published herb/water/bottle recipe consumes its real inputs and yields one healing potion',()=>{
 const r=game();
 const beforeHerb=r.run('materialCount("紅色草")');
 r.run('startLifeGathering();');advance(r,5000);r.run('stopLifeGathering();');
 assert.equal(r.run('materialCount("紅色草")'),beforeHerb+1);
 const config=json(r,'__EMBERWILD_LIFE_SKILLS.design.recipes.alchemy');
 assert.deepEqual(config.inputs.map(([name,count])=>[name,count]),[['清水',1],['藥水瓶',1],['紅色草',1]]);
 const beforeWater=r.run('materialCount("清水")'),beforeBottle=r.run('materialCount("藥水瓶")');
 r.run('buyLifeMaterial("清水");buyLifeMaterial("藥水瓶");');
 assert.equal(r.run('materialCount("清水")'),beforeWater+1);
 assert.equal(r.run('materialCount("藥水瓶")'),beforeBottle+1);
 const potions=r.run('healPotionCount("heal_small")');
 assert.equal(r.run('startLifeWork("alchemy")'),true);
 advance(r,4999);assert.equal(r.run('healPotionCount("heal_small")'),potions);
 advance(r,1);
 assert.equal(r.run('materialCount("紅色草")'),beforeHerb);
 assert.equal(r.run('materialCount("清水")'),beforeWater);
 assert.equal(r.run('materialCount("藥水瓶")'),beforeBottle);
 assert.equal(r.run('healPotionCount("heal_small")'),potions+1);
 assert.deepEqual(r.errors,[]);
});

test('Gathering and alchemy continue on other pages alongside actual exploration at every battle speed',()=>{
  for(const rate of [1,2,4]){
    const r=game();r.run(`recruitCompanion(10);closeModal();recruitCompanion(11);closeModal();state.materials['紅色草泥']=10;buyLifeMaterial('藥水瓶',10);buyLifeMaterial('清水',10);spawnGroup();foes.forEach(f=>{f.hp=f.maxhp=1e9;f.atk=0;});running=true;setBattleSpeed(${rate});startLifeGathering();startLifeWork('alchemy');setTab('equipment');`);
    const stock=r.run('healPotionCount("heal_small")');
    for(let i=0;i<100;i++)advance(r,100,{combat:true});
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
  assert.match(r.run('lifeSkillsView()'),/尚無用途/);
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
  assert.doesNotMatch(r.run('accountItemsView()'),/data-inventory-item="(?:heal_|imbue_|ward_|elementTonic_)/);assert.doesNotMatch(r.run('accountItemsView()'),/data-inventory-item="power_tier_reroll"/);
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

test('Shop categories render only their own products and preserve purchases and active jobs',()=>{
  const r=game();r.run('setTab("shop");startLifeGathering();');advance(r,2500);
  const jobs=json(r,'__EMBERWILD_LIFE_SKILLS.jobs'),market=json(r,'party.market');
  for(const [id,section] of [['life','life-shop-section'],['random','shop-random-section'],['fixed','shop-fixed-section']]){
    assert.equal(r.run('setShopCategory('+JSON.stringify(id)+')'),true);
    const view=r.run('shopView()');assert.match(view,new RegExp('data-shop-category="'+id+'"'));
    assert.equal((view.match(/class="shop-section /g)||[]).length,1);assert(view.includes(section));
    assert.equal((view.match(/onclick="setShopCategory/g)||[]).length,3);
    assert.deepEqual(json(r,'__EMBERWILD_LIFE_SKILLS.jobs'),jobs);assert.deepEqual(json(r,'party.market'),market);
  }
  r.run('setShopCategory("life");buyLifeMaterial("清水",10);');
  assert.match(r.run('shopView()'),/data-shop-category="life"/);assert.equal(r.run('materialCount("清水")'),10);
  assert.equal(r.run('setShopCategory("missing")'),false);assert.match(r.run('shopView()'),/data-shop-category="life"/);
  advance(r,2500);assert.equal(r.run('materialCount("紅色草")'),1);assert.deepEqual(r.errors,[]);
});

test('Life stock shows uses and quantities and sells through the shared inventory with save rollback',()=>{
  const r=game();r.run('setTab("gather");state.materials["紅色草"]=4;state.materials["小蟲"]=2;');
  const view=r.run('gatheringView()'),alchemy=r.run('alchemyView()');assert.match(view,/目前材料庫存/);assert.match(view,/id="life-gather"/);assert.doesNotMatch(view,/id="life-alchemy"/);assert.match(alchemy,/id="life-alchemy"/);assert.doesNotMatch(alchemy,/id="life-gather"/);
  assert.equal((view.match(/class="life-stock-row /g)||[]).length,5);
  const gold=r.run('state.gold');
  r.run(`sellMaterialFromControl({closest:()=>({dataset:{material:'紅色草'},querySelector:()=>({value:'3'})})});sellAllMaterialFromControl({closest:()=>({dataset:{material:'小蟲'}})});`);
  assert.equal(r.run('state.gold'),gold+9);assert.equal(r.run('materialCount("紅色草")'),1);assert.equal(r.run('materialCount("小蟲")'),0);
  const savedGold=r.run('state.gold');r.run('globalThis.originalSave=save;save=()=>false;sellMaterial("紅色草",1);save=originalSave;');
  assert.equal(r.run('state.gold'),savedGold);assert.equal(r.run('materialCount("紅色草")'),1);
  const gatherPanel=view.split('<div class="life-skill-grid life-skill-single">')[1].split('</section>')[0];
  assert.doesNotMatch(gatherPanel,/賣價|尚無用途|後續再新增/);assert.deepEqual(r.errors,[]);
});

test('Gather target selection rejects unsupported targets and cannot change an active cycle',()=>{
  const r=game();assert.equal(r.run('selectLifeGatheringTarget("herb")'),true);
  assert.equal(r.run('selectLifeGatheringTarget("bug")'),false);assert.equal(r.run('startLifeGathering("bug")'),false);
  assert.equal(r.run('startLifeGathering()'),true);advance(r,2500);
  const job=json(r,'__EMBERWILD_LIFE_SKILLS.jobs');assert.equal(job.gather.target,'herb');
  assert.equal(r.run('selectLifeGatheringTarget("herb")'),false);assert.deepEqual(json(r,'__EMBERWILD_LIFE_SKILLS.jobs'),job);
  assert.match(r.run('lifeSkillsView()'),/<select aria-label="採集對象"[^>]+disabled>/);
  advance(r,2500);assert.equal(r.run('materialCount("紅色草")'),1);
  r.run('stopLifeGathering();');assert.equal(r.run('selectLifeGatheringTarget("herb")'),true);assert.deepEqual(r.errors,[]);
});
