
/* Update 16b: restore the shared expedition journal after later rewardGroupKill wrappers. */
const update16bRewardGroupKillBase=rewardGroupKill;
rewardGroupKill=function(e){
  if(e?.rewarded)return;
  const before=typeof combatLootSnapshot==='function'?combatLootSnapshot():null;
  const result=update16bRewardGroupKillBase(e);
  if(before&&party?.members?.[0]&&typeof addExpeditionLoot==='function'){
    const h=party.members[0];expeditionLoot.kills++;
    for(const [key,name] of [['gold','金幣'],['ore','鍛鐵'],['dust','寶石粉塵'],['potions','治療藥水']])addExpeditionLoot(name,h[key]-before[key]);
    h.gems.forEach((n,i)=>addExpeditionLoot(GEMS[i].name,n-before.gems[i]));
    for(const [name,n] of Object.entries(h.materials))addExpeditionLoot(name,n-(before.materials[name]||0));
    for(const gearItem of h.bag)if(!before.gear.has(gearItem.id))addExpeditionLoot(equipmentDisplayName(gearItem),1,typeof gearQualityRank==='function'?gearQualityRank(gearItem):Math.max(0,Math.min(3,Number(gearItem.rar)||0)));
  }
  return result;
};
