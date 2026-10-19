const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs'),root=path.resolve(__dirname,'..');
function game(){const r=loadRuntime(root);r.ctx.seed=require('../data/balance.json');r.run('applyBalanceConfig(seed,{persist:false});selectSaveSlot(1);start(0);closeModal()');return r;}
test('only one and ticket-locked two speeds exist; legacy tickets, inventory, live expiry and session migrate without resetting time',()=>{
 const r=game();r.run('setBattleSpeed(2)');assert.equal(r.run('battleRate'),1);r.run('setBattleSpeed(4)');assert.equal(r.run('battleRate'),1);assert.doesNotMatch(r.run('battleSpeedButtons()'),/4×/);
 r.run("state.consumables.speed2_30m=3;useSupply('speed2_30m');setBattleSpeed(2);globalThis.old=JSON.parse(JSON.stringify(packParty()).replaceAll('speed2','speed4').replaceAll('兩倍速','四倍速'));old.combatSession.speed=4;globalThis.expiry=old.timedBoosts[0].expiresAt;loadParty(old)");assert.equal(r.run('state.consumables.speed2_30m'),2);assert.equal(r.run('state.consumables.speed4_30m'),undefined);assert.equal(r.run('party.timedBoosts[0].expiresAt'),r.run('expiry'));assert.equal(r.run('battleRate'),2);
 r.advance(1800000);r.run('tick()');assert.equal(r.run('battleRate'),1);r.run('setBattleSpeed(2)');assert.equal(r.run('battleRate'),1);assert.deepEqual(r.errors,[]);
});
test('boss bases gain seven equivalent levels while equip requirements remain; every difficulty floats and affixes never fall below rare',()=>{
 const r=game();const out=JSON.parse(r.run(`JSON.stringify((()=>{const rows=[];for(const mode of [0,1,2]){const set=new Set();for(let i=0;i<30;i++){const g=bossGear(1,0,mode);set.add(g.powerTier);if(gearQualityRank(g)<2)throw Error('品質不足');}rows.push(set.size);}const g=bossGear(1,0,0),required=gearRequiredLevelByTier(g.tier),up=gearStatBreakdown(g).raw;GAMEPLAY_SETTINGS.equipment.boss.baseLevelBonus=0;const old=gearStatBreakdown(g).raw;return {rows,required,old,up,help:bossCraftView()};})())`));assert(out.rows.every(n=>n>1));assert.equal(out.required,6);assert(out.up.hp>out.old.hp);assert(out.up.def>out.old.def);assert.deepEqual(r.errors,[]);
});
