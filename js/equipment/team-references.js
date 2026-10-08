/* All manual disposal paths share the existing prices/reward functions and the
   same reference audit. Automatic overflow handles only newly dropped items. */
(()=>{
  const T=__EMBERWILD_TEAMS,M=EmberwildTeams,copy=M.copy;
  const disposable=g=>g&&!g.locked&&!inlineAffixDrafts.has(affixDraftKey(g));
  function dispose(ids,mode,includeEnhance=true){
    if(!T.safe())return false;T.capture();const items=[...new Set(ids)].map(findGear).filter(disposable);if(!items.length)return false;
    const refs=new Map();for(const g of items)for(const p of M.references(T.build(),g.id))refs.set(p.id,p.name);
    const verb=mode==='sell'?'販售':'分解';
    if(refs.size&&!confirm(`此${items.length>1?'批裝備':'裝備'}被以下隊伍使用：${[...refs.values()].join('、')}。\n確認${verb}後將失去物品實體，所有相關裝備／信物欄位會空置，不自動補裝。確定強制${verb}？`))return false;
    if(!refs.size&&items.length>1&&!confirm(`確定${verb} ${items.length} 件裝備？物品實體將失去，無法復原。`))return false;
    const b=copy(T.build()),bag=state.bag,selected=party.selected,hp=party.members.map(h=>h.hp),h=T.player(),resource={};
    for(const k of ['gold','ore','dust','gems','materials','potions','consumables'])resource[k]=copy(h[k]);
    const removed=new Set(items.map(g=>g.id));
    try{
      M.clearReferences(T.build(),[...removed]);
      for(const x of party.members){x.equipped=x.equipped.map(id=>removed.has(id)?null:id);if(removed.has(x.tokenId))x.tokenId=null;}
      let total=0;for(const g of items){if(mode==='sell'){const price=equipmentSellPrice(g);h.gold+=price;total+=price;}else grantSalvageRewards(g,includeEnhance);}
      state.bag=bag.filter(g=>!removed.has(g.id));
      for(const x of party.members)x.hp=Math.min(x.hp,stats(x).hp);
      if(save()===false)throw Error('儲存失敗');pruneGearSelections();render();toast(`已${verb} ${items.length} 件装備${mode==='sell'?'，獲得 '+total+' 金幣':''}`);return true;
    }catch(e){party.buildSystem=b;state.bag=bag;for(const k of Object.keys(resource))h[k]=resource[k];T.apply(T.plan());party.selected=selected;state=partyMember(selected)||h;party.members.forEach((x,i)=>x.hp=hp[i]);toast('操作未保存：'+e.message);return false;}
  }
  salvage=id=>dispose([id],'salvage');globalThis.sellGear=id=>dispose([id],'sell');
  globalThis.sellAllGearByQuality=q=>Number.isInteger(q)&&q>=0&&q<=3&&dispose(state.bag.filter(g=>gearQualityRank(g)===q).map(g=>g.id),'sell');
  salvageAll=()=>dispose(state.bag.filter(g=>!MToken(g)&&gearQualityRank(g)===0&&(g.plus||0)===0&&!g.affix.length&&g.boss===undefined).map(g=>g.id),'salvage',false);
  const MToken=g=>EmberwildTokens.isToken(g);
  massSalvageTargets=ids=>state.bag.filter(g=>ids.includes(g.id)&&disposable(g));
  requestMassSalvage=q=>Number.isInteger(q)&&q>=0&&q<=3&&dispose(state.bag.filter(g=>!MToken(g)&&gearQualityRank(g)===q).map(g=>g.id),'salvage');
  confirmMassSalvage=()=>{if(!massSalvageIds)return false;const ok=dispose(massSalvageIds,'salvage');if(ok){massSalvageIds=null;closeModal();}return ok;};
  // Existing detail UI disabled worn gear. References now have a force-confirm
  // path, while locks and uncommitted affixes keep their existing protection.
  const detailBase=inventoryGearDetail;inventoryGearDetail=function(g){let html=detailBase(g);if(disposable(g))html=html.replace(/(<button\b[^>]*onclick="(?:sellGear|salvage)\([^\"]*"[^>]*)\sdisabled/g,'$1');const refs=T.build()?M.references(T.build(),g.id):[];if(refs.length)html+=`<p class="small">隊伍引用：${refs.map(p=>esc(p.name)).join('、')} · 出售或分解會先確認並清空所有引用。</p>`;return html;};
  const equipmentBase=equipmentView;equipmentView=function(){let html=equipmentBase();html=html.replace(/(<button\b[^>]*onclick="salvage\('([^']+)'\)"[^>]*)\sdisabled/g,(full,prefix,id)=>disposable(findGear(id))?prefix:full);return html;};
  globalThis.__EMBERWILD_TEAM_EQUIPMENT={dispose,references:id=>M.references(T.build(),id)};
})();
