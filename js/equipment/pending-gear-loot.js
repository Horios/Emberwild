
/* Battle equipment drops stay outside the inventory until the player settles them. */
let pendingGearLoot=[];
let collectingBattleGear=false;

const pendingLootBaseAddGear=addGear;
addGear=function(g){
  if(!collectingBattleGear)return pendingLootBaseAddGear(g);
  g.rar=0;
  pendingGearLoot.push(g);
  const q=typeof gearQualityRank==='function'?gearQualityRank(g):0;
  note(`獲得 ${AFFIX_RANK[q]} ${equipmentDisplayName(g)}${g.boss!==undefined?'（BOSS 專屬）':''}（待結算）`);
  if(typeof addExpeditionLoot==='function')addExpeditionLoot(equipmentDisplayName(g),1,q);
};

const pendingLootBaseRewardGroupKill=rewardGroupKill;
rewardGroupKill=function(e){
  if(e?.rewarded)return;
  collectingBattleGear=true;
  try{return pendingLootBaseRewardGroupKill(e);}
  finally{collectingBattleGear=false;}
};

function pendingGearLootView(){
  const n=pendingGearLoot.length;
  return `<section class="panel pending-gear-loot"><div class="pending-gear-head"><div><b>待結算裝備 ${n} 件</b><span class="small">　戰鬥掉落先存放於此，不會改變背包中的裝備順序。</span></div><button class="primary" onclick="claimPendingGearLoot()" ${n?'':'disabled'}>結算並領取</button></div>${n?`<div class="pending-gear-list">${pendingGearLoot.map(g=>`<span class="pending-gear-chip">${equipmentNameHTML(g)}${g.boss!==undefined?' · BOSS':''}</span>`).join('')}</div>`:'<p class="small">目前沒有待結算裝備。</p>'}</section>`;
}

function claimPendingGearLoot(){
  ensureSharedGear();
  if(!pendingGearLoot.length)return toast('目前沒有待結算裝備');
  const free=Math.max(0,RULES.bagCapacity-state.bag.length);
  if(free<=0)return toast('背包已滿，請先整理裝備');
  const claimed=pendingGearLoot.splice(0,free);
  state.bag.push(...claimed);
  save();render();
  toast(pendingGearLoot.length?`已領取 ${claimed.length} 件；背包已滿，尚有 ${pendingGearLoot.length} 件待結算`:`已領取 ${claimed.length} 件裝備`);
}

const pendingLootBaseEquipmentView=equipmentView;
equipmentView=function(){return pendingGearLootView()+pendingLootBaseEquipmentView();};

const pendingLootBasePackParty=packParty;
packParty=function(){const data=pendingLootBasePackParty();return {...data,pendingGearLoot:pendingGearLoot.map(g=>JSON.parse(JSON.stringify(g)))};};

const pendingLootBaseLoadParty=loadParty;
loadParty=function(data){
  const queued=Array.isArray(data?.pendingGearLoot)?data.pendingGearLoot.map(g=>JSON.parse(JSON.stringify(g))):[];
  pendingLootBaseLoadParty(data);
  pendingGearLoot=queued;
};
