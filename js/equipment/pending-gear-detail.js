
(function installPendingGearDetailedList(){
  if(!globalThis.__pendingQualityFoldOpen)globalThis.__pendingQualityFoldOpen={0:true,1:true,2:true,3:true};
  globalThis.setPendingQualityFold=function(q,open){globalThis.__pendingQualityFoldOpen[q]=!!open;};

  function namedAffixName(kind,id){
    if(!id)return kind==='prefix'?'無前綴':'無後綴';
    var power=globalThis.__EMBERWILD_EQUIPMENT_POWER||{};
    var rows=kind==='prefix'?(power.prefixes||[]):(power.suffixes||[]);
    var row=rows.find(function(x){return x&&x.id===id;});
    return row&&row.name?String(row.name):String(id);
  }

  function qualityName(q){
    return (Array.isArray(AFFIX_RANK)&&AFFIX_RANK[q])||(Array.isArray(QUALITY_NAMES)&&QUALITY_NAMES[q])||('品質 '+q);
  }

  function pendingGearGroupMeta(g){
    var boss=!!(g&&g.boss!==undefined);
    var quality=Math.max(0,Math.min(3,typeof gearQualityRank==='function'?gearQualityRank(g):0));
    var name=typeof gearName==='function'?String(gearName(g)||g&&g.name||'裝備'):String(g&&g.name||'裝備');
    var prefixId=boss?'':String(g&&g.prefixId||'');
    var suffixId=boss?'':String(g&&g.suffixId||'');
    var key=[
      quality,
      boss?'boss':'normal',
      g&&g.job!==undefined?g.job:'',
      g&&g.slot!==undefined?g.slot:'',
      g&&g.form!==undefined?g.form:'',
      prefixId,
      suffixId,
      name
    ].join('|');
    return {
      key:key,
      quality:quality,
      name:name,
      boss:boss,
      prefix:namedAffixName('prefix',prefixId),
      suffix:namedAffixName('suffix',suffixId)
    };
  }

  function pendingGearGroups(source){
    var map=new Map(),rows=Array.isArray(source)?source:pendingGearLoot;
    for(const g of rows){
      var meta=pendingGearGroupMeta(g),group=map.get(meta.key);
      if(group)group.list.push(g);
      else map.set(meta.key,{meta:meta,list:[g]});
    }
    return Array.from(map.values());
  }

  function pendingQualityRows(){
    var rows=[];
    for(var q=0;q<4;q++){
      var list=pendingGearLoot.filter(function(g){return gearQualityRank(g)===q;});
      if(list.length)rows.push({q:q,name:qualityName(q),list:list,groups:pendingGearGroups(list)});
    }
    return rows;
  }

  function tierSummary(list){
    var counts=new Map();
    for(const g of list){
      var tier=Number.isInteger(g&&g.powerTier)?g.powerTier:null;
      var key=tier===null?'T?':'T'+tier;
      counts.set(key,(counts.get(key)||0)+1);
    }
    return Array.from(counts.entries()).sort(function(a,b){
      var na=Number(a[0].slice(1)),nb=Number(b[0].slice(1));
      if(Number.isNaN(na)&&Number.isNaN(nb))return 0;
      if(Number.isNaN(na))return 1;
      if(Number.isNaN(nb))return -1;
      return na-nb;
    }).map(function(x){return x[0]+' ×'+x[1];}).join(' · ');
  }

  function clonePlain(v){return JSON.parse(JSON.stringify(v||{}));}
  function economySnapshot(){
    return {
      gold:state.gold,ore:state.ore,dust:state.dust,potions:state.potions,
      materials:clonePlain(state.materials),consumables:clonePlain(state.consumables),
      gems:Array.isArray(state.gems)?state.gems.slice():[]
    };
  }
  function restoreObject(target,source){
    for(const k of Object.keys(target||{}))delete target[k];
    Object.assign(target,source||{});
  }
  function restoreEconomy(s){
    state.gold=s.gold;state.ore=s.ore;state.dust=s.dust;state.potions=s.potions;
    restoreObject(state.materials,s.materials);
    restoreObject(state.consumables,s.consumables);
    if(Array.isArray(state.gems))state.gems.splice(0,state.gems.length,...s.gems);
  }

  function findPendingGroup(key){
    return pendingGearGroups().find(function(x){return x.meta.key===key;})||null;
  }
  function pendingNeedsConfirm(list){
    return list.some(function(g){return gearQualityRank(g)>=1||g.boss!==undefined;});
  }
  function confirmPendingDispose(list,mode,label){
    if(!pendingNeedsConfirm(list))return true;
    var verb=mode==='sell'?'販售':'分解';
    var total=mode==='sell'?list.reduce(function(n,g){return n+(typeof equipmentSellPrice==='function'?equipmentSellPrice(g):0);},0):0;
    var boss=list.some(function(g){return g.boss!==undefined;});
    return confirm('確定要'+verb+' '+list.length+' 件'+label+'？'+(mode==='sell'?'\n可獲得 '+total+' 金幣。':'')+'\n精良、稀有、傳說裝備的'+verb+'需要再次確認，操作後無法復原。'+(boss?'\n其中包含 BOSS 專屬裝備。':''));
  }

  function claimPendingList(list,label){
    if(!list.length)return toast('沒有可領取的'+label);
    var room=Math.max(0,RULES.bagCapacity-state.bag.length);
    if(!room)return toast('裝備背包已滿');
    var take=list.slice(0,room),ids=new Set(take.map(function(g){return g.id;}));
    var oldPending=pendingGearLoot.slice(),oldBag=state.bag.slice();
    state.bag.push.apply(state.bag,take);
    pendingGearLoot=pendingGearLoot.filter(function(g){return !ids.has(g.id);});
    if(!save()){
      state.bag.splice(0,state.bag.length,...oldBag);
      pendingGearLoot=oldPending;
      return toast('領取失敗：儲存失敗');
    }
    render();
    toast('已領取 '+take.length+' 件'+label+(take.length<list.length?'；背包已滿':''));
  }

  function disposePendingList(list,mode,label){
    if(!list.length)return toast('沒有可處理的'+label);
    if(!confirmPendingDispose(list,mode,label))return;
    var oldPending=pendingGearLoot.slice(),snap=economySnapshot();
    try{
      if(mode==='sell'){
        var total=list.reduce(function(n,g){return n+(typeof equipmentSellPrice==='function'?equipmentSellPrice(g):0);},0);
        state.gold+=total;
      }else{
        for(const g of list)grantSalvageRewards(g,false);
      }
      var ids=new Set(list.map(function(g){return g.id;}));
      pendingGearLoot=pendingGearLoot.filter(function(g){return !ids.has(g.id);});
      if(!save())throw Error('儲存失敗');
      render();
      toast('已'+(mode==='sell'?'販售 ':'分解 ')+list.length+' 件'+label+(mode==='sell'?'，獲得 '+total+' 金幣':''));
    }catch(e){
      pendingGearLoot=oldPending;
      restoreEconomy(snap);
      toast('操作失敗：'+e.message);
    }
  }

  globalThis.claimPendingGearGroup=function(key){
    var group=findPendingGroup(key);
    if(!group)return toast('這組待領取裝備已不存在');
    claimPendingList(group.list,group.meta.name);
  };
  globalThis.sellPendingGearGroup=function(key){
    var group=findPendingGroup(key);
    if(!group)return toast('這組待領取裝備已不存在');
    disposePendingList(group.list,'sell',group.meta.name);
  };
  globalThis.salvagePendingGearGroup=function(key){
    var group=findPendingGroup(key);
    if(!group)return toast('這組待領取裝備已不存在');
    disposePendingList(group.list,'salvage',group.meta.name);
  };

  globalThis.claimPendingQuality=function(q){
    var row=pendingQualityRows().find(function(x){return x.q===Number(q);});
    if(!row)return toast('沒有'+qualityName(Number(q))+'待領取裝備');
    claimPendingList(row.list,qualityName(row.q)+'裝備');
  };
  globalThis.sellPendingQuality=function(q){
    var row=pendingQualityRows().find(function(x){return x.q===Number(q);});
    if(!row)return toast('沒有'+qualityName(Number(q))+'待領取裝備');
    disposePendingList(row.list,'sell',qualityName(row.q)+'裝備');
  };
  globalThis.salvagePendingQuality=function(q){
    var row=pendingQualityRows().find(function(x){return x.q===Number(q);});
    if(!row)return toast('沒有'+qualityName(Number(q))+'待領取裝備');
    disposePendingList(row.list,'salvage',qualityName(row.q)+'裝備');
  };

  function groupHtml(group){
    var g=group.list[0],meta=group.meta;
    var affixText=meta.boss?'BOSS 專屬':('前綴：'+meta.prefix+' · 後綴：'+meta.suffix);
    var claimDisabled=state.bag.length>=RULES.bagCapacity?' disabled':'';
    var totalSell=group.list.reduce(function(n,x){return n+(typeof equipmentSellPrice==='function'?equipmentSellPrice(x):0);},0);
    return '<section class="pending-affix-group"><div class="pending-affix-group-main"><div class="pending-affix-group-name">'+equipmentNameHTML(g)+'<div class="pending-affix-group-meta"><span>'+esc(affixText)+'</span><span>'+esc(tierSummary(group.list))+'</span></div></div><span class="pending-affix-group-count">×'+group.list.length+'</span><div class="pending-affix-group-actions"><button data-group="'+esc(meta.key)+'" onclick="claimPendingGearGroup(this.dataset.group)"'+claimDisabled+'>全領</button><button data-group="'+esc(meta.key)+'" onclick="salvagePendingGearGroup(this.dataset.group)">全分解</button><button data-group="'+esc(meta.key)+'" onclick="sellPendingGearGroup(this.dataset.group)">全賣 · '+totalSell+'金</button></div></div></section>';
  }

  pendingGearBottomView=function(){
    var qualityRows=pendingQualityRows();
    var total=qualityRows.reduce(function(n,r){return n+r.list.length;},0);
    var groupCount=qualityRows.reduce(function(n,r){return n+r.groups.length;},0);
    var qualityHtml=qualityRows.map(function(row){
      var totalSell=row.list.reduce(function(n,g){return n+(typeof equipmentSellPrice==='function'?equipmentSellPrice(g):0);},0);
      var claimDisabled=state.bag.length>=RULES.bagCapacity?' disabled':'';
      var open=globalThis.__pendingQualityFoldOpen[row.q]?' open':'';
      return '<details class="pending-color-group effect-quality-'+row.q+'"'+open+' ontoggle="setPendingQualityFold('+row.q+',this.open)"><summary><span class="pending-color-group-count">'+row.list.length+' 件 · '+row.groups.length+' 組</span><span class="pending-color-group-title">'+esc(row.name)+'</span><span class="pending-color-group-tier">'+esc(tierSummary(row.list))+'</span></summary><div class="pending-color-group-body"><div class="pending-color-group-actions"><button onclick="claimPendingQuality('+row.q+')"'+claimDisabled+'>全領</button><button onclick="salvagePendingQuality('+row.q+')">全分解</button><button onclick="sellPendingQuality('+row.q+')">全賣 · '+totalSell+'金</button><span class="pending-quality-total">依最高詞條等級分組</span></div><div class="pending-affix-groups">'+row.groups.map(groupHtml).join('')+'</div></div></details>';
    }).join('');

    var outerOpen=pendingGearPanelCollapsed?'':' open';
    var claimAllDisabled=!total||state.bag.length>=RULES.bagCapacity?' disabled':'';
    return '<details class="panel pending-gear-panel pending-gear-bottom"'+outerOpen+' ontoggle="pendingGearPanelCollapsed=!this.open"><summary><span class="pending-gear-summary-title">待領取裝備 '+total+' 件 · '+groupCount+' 組</span></summary><div class="pending-gear-expanded"><div class="pending-gear-top-actions"><span class="small">先依最高詞條等級（裝備顏色）分組，各色內仍依前綴＋後綴與裝備名稱分組。精良以上販售／分解會再次確認。</span><button onclick="claimPendingGearLoot()"'+claimAllDisabled+'>全部領取</button></div><div class="pending-quality-groups">'+(qualityHtml||'<p class="small">目前沒有待領取裝備。</p>')+'</div></div></details>';
  };

  if(state)render();
})();
