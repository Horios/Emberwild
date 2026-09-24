
/* Move pending equipment settlement below the equipment inventory. Collapsed
   mode intentionally keeps only one quality-count summary line visible. */
let pendingGearPanelCollapsed=true;
function pendingGearQualityCounts(){
  const names=(typeof AFFIX_RANK!=='undefined'&&Array.isArray(AFFIX_RANK))?AFFIX_RANK:['普通','精良','稀有','傳說'];
  return names.map((name,q)=>({name,q,list:(Array.isArray(pendingGearLoot)?pendingGearLoot:[]).filter(g=>gearQualityRank(g)===q)}));
}
function pendingGearBottomView(){
  const rows=pendingGearQualityCounts(),total=rows.reduce((n,r)=>n+r.list.length,0);
  const summary=rows.map(r=>`<span class="pending-gear-summary-count effect-quality-${r.q}">${esc(r.name)} ${r.list.length} 件</span>`).join('');
  const groups=rows.map(r=>{
    const totalSell=r.list.reduce((n,g)=>n+(typeof equipmentSellPrice==='function'?equipmentSellPrice(g):0),0);
    const unit=r.list.length&&typeof equipmentSellPrice==='function'?equipmentSellPrice(r.list[0]):0;
    return `<section class="pending-quality-group effect-quality-${r.q}"><div class="row"><b>${esc(r.name)} ${r.list.length} 件</b><span class="small">${r.list.length?`販售 ${unit}／件`:'—'}</span></div><div class="small">${r.list.slice(0,3).map(g=>esc(equipmentDisplayName(g))).join('、')}${r.list.length>3?'…':''}</div><div class="actions"><button onclick="claimPendingQuality(${r.q})" ${r.list.length?'':'disabled'}>領取</button><button onclick="salvagePendingQuality(${r.q})" ${r.list.length?'':'disabled'}>分解</button><button onclick="sellPendingQuality(${r.q})" ${r.list.length?'':'disabled'}>販售${r.list.length?' '+totalSell+'金':''}</button></div></section>`;
  }).join('');
  return `<details class="panel pending-gear-panel pending-gear-bottom" ${pendingGearPanelCollapsed?'':'open'} ontoggle="pendingGearPanelCollapsed=!this.open"><summary><span class="pending-gear-summary-title">待結算裝備 ${total} 件</span><span class="pending-gear-summary-counts">${summary}</span></summary><div class="pending-gear-expanded"><div class="row"><span class="small">可依品質直接領取、分解或販售；戰鬥掉落在結算前不會改變背包順序。</span><button onclick="claimPendingGearLoot()" ${!total||state.bag.length>=RULES.bagCapacity?'disabled':''}>全部結算並領取</button></div>${groups}</div></details>`;
}

// The legacy pending-loot wrapper prepended this block before the inventory.
// Empty it, then append the new compact block after the equipment inventory.
pendingGearLootView=function(){return '';};
const pendingGearBottomEquipmentBase=equipmentView;
equipmentView=function(){
  const html=pendingGearBottomEquipmentBase();
  return inventoryCategory==='equipment'?html+pendingGearBottomView():html;
};
if(state)render();
