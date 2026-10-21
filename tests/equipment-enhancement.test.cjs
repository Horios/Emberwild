const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs');
const curve=require('../js/balance/progression-model.js');
const root=path.resolve(__dirname,'..'),flat={atk:.5,hp:1,def:.2},growth={atk:.02,hp:.08,def:.015};
const json=(r,code)=>JSON.parse(r.run('JSON.stringify('+code+')'));
function game(){const r=loadRuntime(root);r.run('selectSaveSlot(1);start(0);closeModal();');return r;}

test('refinement depends only on equipment level, adds after T and never creates absent stats',()=>{
  assert.deepEqual(curve.enhancedGearStats({atk:3,hp:0,def:0},10,1),{hp:0,atk:8,def:0});
  assert.deepEqual(curve.enhancedGearStats({atk:0,hp:8,def:2},10,1),{hp:18,atk:0,def:4});
  for(const [level,atk,hp,def] of [[1,5,10,2],[10,7,17,3],[30,11,33,6],[60,17,57,11]]){
    for(const base of [1,3,36,100]){
      const out=curve.enhancedGearStats({atk:base,hp:base,def:base},10,level);
      assert.deepEqual(out,{hp:base+hp,atk:base+atk,def:base+def});
    }
  }
  assert.deepEqual([0,1,2,3,4,5,10,15].map(p=>curve.enhancedGearStats({atk:3},p,1).atk),[3,4,4,5,5,6,8,11]);
});

test('actual enhancement, preview, combat stats and an existing +10 save use the same growth without changing base/T',()=>{
  const r=game(),out=json(r,`(()=>{
    const g=gear(1,0,0,0);Object.assign(g,{formJob:0,form:0,prefixId:'',suffixId:'',affix:[],powerTier:7,plus:0,baseSnapshot:{version:1,mult:1.08,raw:{hp:0,atk:3,def:0},body:{hp:0,atk:3,def:0},base:{hp:0,atk:3,def:0}}});
    state.bag.push(g);equipSharedGear(g.id,memberKey(playerHero()),0);state.ore=100000;state.dust=100000;state.materials['以太鍛鐵']=100;
    const before=stats(playerHero()).atk,base=JSON.stringify(g.baseSnapshot),id=g.id,cost=upgradeMaterials(g),ore=state.ore;
    const preview=equipmentTotalSummaryText({...g,plus:1});enhance(id);const first={plus:g.plus,spent:ore-state.ore,attack:gearBaseStats(g).atk};
    for(let i=1;i<10;i++)enhance(id);
    const after=stats(playerHero()).atk,ledger=equipmentStatContributions(g),saved=packParty();loadParty(saved);const restored=findGear(id);
    return {before,after,base,preview,cost,first,total:gearBaseStats(restored),plus:restored.plus,t:restored.powerTier,reloadedBase:JSON.stringify(restored.baseSnapshot),ledger,html:(openForge(id),forgeView())};
  })()`);
  assert.equal(out.first.plus,1);assert.equal(out.first.spent,out.cost.ore);assert.equal(out.first.attack,4);assert.match(out.preview,/攻擊 \+4/);
  assert.equal(out.plus,10);assert.equal(out.t,7);assert.equal(out.total.atk,8);assert.equal(out.after-out.before,5);assert.equal(out.base,out.reloadedBase);
  assert.equal(out.ledger.rows.find(x=>x.label==='強化加成（+10）').stats.atk,5);assert.match(out.html,/固定值/);
  for(const k of ['atk','hp','def','speed'])assert.equal(out.ledger.rows.reduce((n,row)=>n+row.stats[k],0),out.ledger.total[k]);
  assert.deepEqual(r.errors,[]);
});

test('all slots and T grades stay monotonic and additive; BOSS percentages do not multiply refinement gains',()=>{
  const r=game(),out=json(r,`(()=>{
    const issues=[];let checked=0;
    for(let job=0;job<4;job++)for(let slot=0;slot<4;slot++)for(const tier of [1,2,6,12]){
      let previousT,firstGain;for(let t=1;t<=10;t++){
        const g=gear(tier,slot,0,job);Object.assign(g,{powerTier:t,formJob:job,form:0,prefixId:'',suffixId:'',affix:[]});delete g.baseSnapshot;
        let previous;for(let plus=0;plus<=10;plus++){
          g.plus=plus;const b=gearStatBreakdown(g),ledger=equipmentStatContributions(g);checked++;
          for(const k of ['atk','hp','def'])if(!Number.isSafeInteger(b.total[k])||b.total[k]!==b.body[k]+b.grade[k]+b.enhance[k]||(previous&&b.total[k]<previous[k])||(b.body[k]===0&&b.total[k]!==0))issues.push('growth');
          for(const k of ['atk','hp','def','speed'])if(ledger.total[k]!==ledger.rows.reduce((n,row)=>n+row.stats[k],0))issues.push('ledger');
          previous=b.total;
        }
        const b=gearStatBreakdown(g);if(!firstGain)firstGain=b.enhance;if(JSON.stringify(b.enhance)!==JSON.stringify(firstGain))issues.push('T changed refinement');
        if(previousT&&['atk','hp','def'].some(k=>previous[k]<previousT[k]))issues.push('T');previousT=previous;
      }
    }
    const b=bossGear(0,0,0);b.plus=10;const total=gearBaseStats(b),base=b.baseSnapshot.base,ledger=equipmentStatContributions(b),profile=exportableBalance().equipmentPowerSystem.bossAffixes.find(x=>x.id==='legacy_low_0'),pct=profile.effects.find(e=>e.key==='gearAtkPct').value;
    return {issues,checked,boss:{total,base,ledger,pct}};
  })()`);
  assert.deepEqual(out.issues,[]);assert.equal(out.checked,7040);
  const effect=out.boss.ledger.rows.find(x=>x.effect?.ruleEffect?.key==='gearAtkPct');
  assert.equal(effect.stats.atk,Math.round(out.boss.base.atk*out.boss.pct/100));assert.deepEqual(r.errors,[]);
});

test('fixed refinement settings roundtrip, older JSON receives defaults and invalid negative growth is rejected',()=>{
  const r=game(),out=json(r,`(()=>{
    const doc=exportableBalance(),oldDoc=structuredClone(doc);delete oldDoc.balanceSettings.equipment.enhance.flatStatsPerLevel;delete oldDoc.balanceSettings.equipment.enhance.flatStatsPerEquipmentLevel;
    applyBalanceConfig(oldDoc,{persist:false});const old=structuredClone(GAMEPLAY_SETTINGS.equipment.enhance);
    doc.balanceSettings.equipment.enhance.flatStatsPerLevel={atk:1,hp:2,def:1};doc.balanceSettings.equipment.enhance.flatStatsPerEquipmentLevel={atk:0,hp:0,def:0};doc.balanceSettings.equipment.enhance.statPerLevel=10;applyBalanceConfig(doc,{persist:false});
    const g=createEquipmentShopGear('equipment_lv1','job0-slot0-form0');g.plus=10;const attack=gearBaseStats(g).atk,exported=exportableBalance().balanceSettings.equipment.enhance;
    doc.balanceSettings.equipment.enhance.flatStatsPerLevel.atk=-1;let error='';try{applyBalanceConfig(doc,{persist:false})}catch(e){error=e.message}
    return {old,exported,attack,error};
  })()`);
  assert.deepEqual(out.old.flatStatsPerLevel,flat);assert.deepEqual(out.old.flatStatsPerEquipmentLevel,growth);
  assert.deepEqual(out.exported.flatStatsPerLevel,{atk:1,hp:2,def:1});assert.deepEqual(out.exported.flatStatsPerEquipmentLevel,{atk:0,hp:0,def:0});
  assert.equal(out.attack,13);assert.match(out.error,/精煉成長|不得為負值/);assert.deepEqual(r.errors,[]);
});
