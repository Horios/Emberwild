const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs');
const root=path.resolve(__dirname,'..');
const json=(r,code)=>JSON.parse(r.run(`JSON.stringify(${code})`));
function game(){const r=loadRuntime(root);r.run('selectSaveSlot(1);start(0);closeModal();');return r;}
function listIds(html){return [...html.matchAll(/class="forge-gear-item [^"]*" onclick="chooseForge\('([^']+)'\)"/g)].map(m=>m[1]).sort();}

test('Forge lists all five initially equipped starter items, with previews and fixed-item restrictions',()=>{
  const r=game(),out=json(r,`(()=>{
    const ids=state.equipped.filter(Boolean),html=forgeView();
    chooseForge(ids[0]);const selected=forgeView(),g=findGear(ids[0]);
    state.gold=10000;state.ore=10000;state.dust=10000;state.materials['以太鍛鐵']=1000;
    state.consumables.power_tier_reroll=3;
    const before={gear:structuredClone(g),gold:state.gold,ore:state.ore,dust:state.dust,materials:structuredClone(state.materials),consumables:structuredClone(state.consumables)};
    enhance(g.id);reroll(g.id);autoReroll(g.id,3);rerollEquipmentPowerTier(g.id);openForge(g.id);
    return {ids,html,selected,selection:forgeSelection,canEnhance:canEnhance(g),before,after:{gear:g,gold:state.gold,ore:state.ore,dust:state.dust,materials:state.materials,consumables:state.consumables}};
  })()`);
  assert.equal(out.ids.length,5);
  assert.deepEqual(listIds(out.html),out.ids.sort());
  assert.match(out.html,/已穿戴 5/);
  assert.equal(out.selection,out.ids[0]);
  assert.match(out.selected,/目前能力/);
  assert.match(out.selected,/新手專屬裝備無法強化/);
  assert.match(out.selected,/無法洗鍊或重鑄基底/);
  assert.doesNotMatch(out.selected,/onclick="(?:enhance|reroll|autoReroll|rerollEquipmentPowerTier)\(/);
  assert.equal(out.canEnhance,false);
  assert.deepEqual(out.after,out.before);
  assert.deepEqual(r.errors,[]);
});

test('Forge equipped and spare counts follow real shared ownership, including an unequipped starter',()=>{
  const r=game(),out=json(r,`(()=>{
    const starter=state.equipped[0],drop=gear(1,0,0,0);state.bag.push(drop);
    unequipSharedGear(starter);const worn=state.equipped.filter(Boolean),equipped=forgeView();
    setForgeWearFilter('unequipped');const spare=forgeView();
    openForge(drop.id);const opened=forgeView();
    return {starter,drop:drop.id,worn,equipped,spare,opened,selection:forgeSelection};
  })()`);
  assert.deepEqual(listIds(out.equipped),out.worn.sort());
  assert.match(out.equipped,/已穿戴 4/);assert.match(out.equipped,/未穿戴 2/);
  assert.deepEqual(listIds(out.spare),[out.starter,out.drop].sort());
  assert.equal(out.selection,out.drop);
  assert.match(out.opened,/未穿戴 · 2 件/);
  assert.deepEqual(r.errors,[]);
});

test('Ordinary equipped gear retains enhancement costs and random-affix reroll controls',()=>{
  const r=game(),out=json(r,`(()=>{
    const g=gear(1,0,0,0);state.bag.push(g);equipSharedGear(g.id,memberKey(playerHero()),0);
    state.gold=10000;state.ore=10000;state.dust=10000;state.materials['以太鍛鐵']=1000;
    openForge(g.id);const html=forgeView(),ore=state.ore,cost=upgradeMaterials(g),gold=state.gold,rerollCost=rerollCostFor(g);
    enhance(g.id);reroll(g.id);
    return {id:g.id,html,cost,ore,afterOre:state.ore,gold,afterGold:state.gold,rerollCost,plus:g.plus,draft:inlineAffixDrafts.has(affixDraftKey(g)),worn:state.equipped[0]};
  })()`);
  assert(listIds(out.html).includes(out.id));
  assert.match(out.html,new RegExp(`onclick="enhance\\('${out.id}'\\)"`));
  assert.match(out.html,new RegExp(`onclick="reroll\\('${out.id}'\\)"`));
  assert.equal(out.plus,1);assert.equal(out.worn,out.id);assert(out.draft);
  assert.equal(out.ore-out.afterOre,out.cost.ore+out.rerollCost.ore);
  assert.equal(out.gold-out.afterGold,out.rerollCost.gold);
  assert.deepEqual(r.errors,[]);
});

test('Equipped tokens remain visible on non-enlisted roster companions with their own enhancement flow',()=>{
  const r=game(),out=json(r,`(()=>{
    recruitCompanion(10);closeModal();const g=__EMBERWILD_TOKEN_TEST.makeToken('arcane',2);state.bag.push(g);equipCompanionToken(g.id,10);
    party.active=[memberKey(playerHero())];setPartnerEnlisted(10,false);
    state.ore=10000;state.dust=10000;state.materials['以太鍛鐵']=1000;
    chooseForge(g.id);const html=forgeView();openForge(g.id);const modal=$('modal').innerHTML;
    const before={affix:structuredClone(g.affix),powerTier:g.powerTier,gold:state.gold,ore:state.ore};
    reroll(g.id);autoReroll(g.id,3);rerollEquipmentPowerTier(g.id);
    const afterBlocked={affix:g.affix,powerTier:g.powerTier,gold:state.gold,ore:state.ore};enhance(g.id);
    return {id:g.id,html,modal,enlisted:isPartnerEnlisted(partyMember(10)),owner:gearWearer(g.id).companionId,plus:g.plus,before,afterBlocked};
  })()`);
  assert.equal(out.enlisted,false);assert.equal(out.owner,10);
  assert(listIds(out.html).includes(out.id));assert.match(out.html,/已穿戴 6/);
  assert.match(out.html,/夥伴通用 · 信物/);assert.match(out.html,/目前能力<\/h3><p>此裝備攻擊力/);
  assert.match(out.html,/信物無法洗鍊或重鑄基底/);
  assert.doesNotMatch(out.html,/undefined|forge-power-reroll|onclick="(?:reroll|autoReroll|rerollEquipmentPowerTier)\(/);
  assert.match(out.modal,/信物強化/);assert.equal(out.plus,1);
  assert.deepEqual(out.afterBlocked,out.before);
  assert.deepEqual(r.errors,[]);
});

test('BOSS gear remains enhanceable while its exclusive affixes stay fixed',()=>{
  const r=game(),out=json(r,`(()=>{
    const g=bossGear(0,0,0);state.bag.push(g);equipSharedGear(g.id,memberKey(playerHero()),gearEquipPositions(g)[0]);
    state.ore=10000;state.dust=10000;state.materials['以太鍛鐵']=1000;openForge(g.id);
    return {id:g.id,boss:g.boss,html:forgeView(),canEnhance:canEnhance(g)};
  })()`);
  assert.notEqual(out.boss,undefined);assert(out.canEnhance);
  assert.match(out.html,/BOSS 專屬詞綴/);assert.match(out.html,/forge-power-reroll/);
  assert.doesNotMatch(out.html,/onclick="(?:reroll|autoReroll)\(/);
  assert.deepEqual(r.errors,[]);
});
