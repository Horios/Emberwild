
(function installInventoryControlFolds(){
  globalThis.inventoryFilterFoldOpen=globalThis.inventoryFilterFoldOpen??false;
  globalThis.inventoryDisposeFoldOpen=globalThis.inventoryDisposeFoldOpen??false;
  globalThis.setInventoryFoldState=function(kind,open){
    if(kind==='filters')globalThis.inventoryFilterFoldOpen=!!open;
    else if(kind==='dispose')globalThis.inventoryDisposeFoldOpen=!!open;
  };

  const foldGearFiltersBase=gearFilters;
  gearFilters=function(){
    return '<details class="inventory-control-fold inventory-filter-fold" '+(globalThis.inventoryFilterFoldOpen?'open':'')+' ontoggle="setInventoryFoldState(\'filters\',this.open)"><summary>篩選</summary><div class="inventory-control-fold-body">'+foldGearFiltersBase()+'</div></details>';
  };

  const foldBulkDisposeBase=bulkSalvageControls;
  bulkSalvageControls=function(){
    return '<details class="inventory-control-fold inventory-dispose-fold" '+(globalThis.inventoryDisposeFoldOpen?'open':'')+' ontoggle="setInventoryFoldState(\'dispose\',this.open)"><summary>批次分解／販售</summary><div class="inventory-control-fold-body">'+foldBulkDisposeBase()+'</div></details>';
  };

  if(state)render();
})();
