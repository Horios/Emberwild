const test=require('node:test');
const assert=require('node:assert/strict');
const curve=require('../js/balance/progression-model.js');
function settings(){return structuredClone(curve.defaults.settings);}
test('LV1–60 class curves stay integer, distinct and monotonic',()=>{
  for(const cls of curve.defaults.classes){let before;for(let level=1;level<=60;level++){
    const v=curve.naturalStats(cls,level);for(const k of ['hp','atk','def']){assert(Number.isSafeInteger(v[k]));if(before)assert(v[k]>=before[k]);}
    assert(v.hp<1000&&v.atk<1000&&v.def<1000);before=v;
  }}
  const warrior=curve.naturalStats(curve.defaults.classes[0],60),mage=curve.naturalStats(curve.defaults.classes[1],60),archer=curve.naturalStats(curve.defaults.classes[2],60),priest=curve.naturalStats(curve.defaults.classes[3],60);
  assert(warrior.hp>mage.hp&&warrior.def>mage.def&&mage.atk>warrior.atk&&archer.atk>warrior.atk&&priest.atk>50);
});
test('LV30→31 has no awakening step and low-attack builds can damage every ordinary foe',()=>{
  const s=settings();for(const mode of [0,1,2])for(const kind of ['normal','elite','boss']){
    const before=curve.monsterStats(s,30,kind,mode),after=curve.monsterStats(s,31,kind,mode);
    for(const k of ['hp','atk','def'])assert(after[k]<=before[k]*1.13,`${kind}/${mode}/${k}`);
  }
  for(let l=1;l<=60;l++)for(const c of curve.defaults.classes){const v=curve.naturalStats(c,l),e=curve.monsterStats(s,l,'normal',2);assert(v.atk-e.def*.55>1);}
});
test('Actual three-person XP share keeps the final level below thirty ordinary encounters',()=>{
  const s=settings();assert.equal(curve.requiredXp(s,1),48);assert.equal(curve.requiredXp(s,59),21972);
  assert.equal(curve.enemyXp(s,59),549);assert.equal(curve.xpShare(549,3),183);
  assert(curve.requiredXp(s,59)/curve.xpShare(curve.enemyXp(s,59),3)/4.5<30);
  let previous=0;for(let l=1;l<60;l++){const fights=curve.requiredXp(s,l)/curve.xpShare(curve.enemyXp(s,l),3)/4.5;assert(fights>=previous);previous=fights;}
  assert(curve.enemyXp(s,59,'boss')>curve.enemyXp(s,59,'elite')&&curve.enemyXp(s,59,'elite')>curve.enemyXp(s,59));
});
test('Direct equipment stats and each displayed contribution are integral and monotonic',()=>{
  for(const raw of [{atk:3,hp:0,def:0},{atk:0,hp:8,def:2},{atk:1,hp:3,def:0},{atk:36,hp:0,def:0}]){
    let previous;for(const power of curve.defaults.powerMultipliers){const out=curve.gearStats(raw,{atk:15},power,0,.05);
      for(const k of ['atk','hp','def']){assert(Number.isSafeInteger(out.total[k]));if(previous)assert(out.total[k]>=previous[k]);}previous=out.total;
    }
    const base=curve.gearStats(raw,{},1,0,.05),enhanced=curve.gearStats(raw,{},1,10,.05);
    for(const k of ['atk','hp','def'])assert(enhanced.total[k]>=base.total[k]);
    assert(curve.gearStats(raw,{},1.72,10,.05).total.atk<200);
  }
});
test('Stair validation rejects zero periods, fractions, negative and non-finite contributions',()=>{
  for(const step of [{every:0,hp:0,atk:1,def:0},{every:2.5,hp:0,atk:1,def:0},{every:2,hp:-1,atk:1,def:0},{every:2,hp:0,atk:NaN,def:0}])assert(!curve.validSteps([step]));
  assert(curve.validSteps([]));assert(curve.validSteps(curve.defaults.classes[2].growthSteps));
});
test('Monster level lead opens gradually and the editor can restore the legacy fixed limit',()=>{
  const s=settings();s.progression.mapAheadAllowance=5;
  assert.deepEqual([1,5,6,11,26,60].map(l=>curve.encounterLevelLead(s,l)),[0,0,1,2,5,5]);
  s.monsters.encounter.levelLeadInterval=0;assert.equal(curve.encounterLevelLead(s,1),5);
  s.monsters.encounter.levelLeadInterval=5;s.progression.mapAheadAllowance=2;assert.equal(curve.encounterLevelLead(s,60),2);
});
