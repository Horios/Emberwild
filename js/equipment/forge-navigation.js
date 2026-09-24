
(()=>{
  let forgeSortKey='equipped';
  let forgeSortDirection='desc';

  function forgeSortValue(g,key){
    if(key==='equipped')return gearWearer(g.id)?1:0;
    if(key==='tier')return Number(g.tier)||0;
    if(key==='plus')return Number(g.plus)||0;
    if(key==='quality')return gearQualityRank(g);
    if(key==='slot')return Number(g.slot)||0;
    if(key==='job')return g.slot===1?-1:(Number(g.job)||0);
    return 0;
  }
  function forgeSortedGear(){
    const items=[...state.bag];
    items.sort((a,b)=>{
      let diff=0;
      if(forgeSortKey==='name')diff=equipmentDisplayName(a).localeCompare(equipmentDisplayName(b),'zh-Hant');
      else diff=forgeSortValue(a,forgeSortKey)-forgeSortValue(b,forgeSortKey);
      if(diff!==0)return forgeSortDirection==='asc'?diff:-diff;
      const wornDiff=Number(!!gearWearer(b.id))-Number(!!gearWearer(a.id));
      if(wornDiff)return wornDiff;
      const qualityDiff=gearQualityRank(b)-gearQualityRank(a);if(qualityDiff)return qualityDiff;
      const tierDiff=(b.tier||0)-(a.tier||0);if(tierDiff)return tierDiff;
      const plusDiff=(b.plus||0)-(a.plus||0);if(plusDiff)return plusDiff;
      return equipmentDisplayName(a).localeCompare(equipmentDisplayName(b),'zh-Hant');
    });
    return items;
  }
  function forgeSortLabel(){
    return forgeSortDirection==='desc'?'高 → 低':'低 → 高';
  }
  globalThis.setForgeSort=function(key){
    if(!['equipped','tier','plus','quality','slot','job','name'].includes(key))return;
    forgeSortKey=key;render();
  };
  globalThis.toggleForgeSortDirection=function(){forgeSortDirection=forgeSortDirection==='desc'?'asc':'desc';render();};

  function forgeListItem(g,selected){
    const wearer=gearWearer(g.id),quality=gearQualityRank(g);
    const role=gearWearableJobsText(g);
    const meta=[role,CLASS_GEAR[g.job][g.slot],`LV ${gearRequiredLevelByTier(g.tier)}`,wearer?`${characterName(wearer)}已穿戴`:'未穿戴',g.boss!==undefined?'BOSS 專屬':''].filter(Boolean).join(' · ');
    return `<button type="button" class="forge-gear-item ${selected?'selected':''}" onclick="chooseForge('${g.id}')" title="${esc(equipmentDisplayName(g))}"><span class="forge-gear-name">${equipmentNameHTML(g)}</span><span class="forge-gear-quality effect-quality-${quality}">${qualityTag(g)}</span><span class="forge-gear-meta">${esc(meta)}</span></button>`;
  }

  function forgeDetail(g){
    if(!g)return `<div class="empty">背包沒有裝備，請先探索取得裝備。</div>`;
    const wearer=gearWearer(g.id),draft=inlineAffixDrafts.has(affixDraftKey(g)),cost=rerollCostFor(g);
    const role=gearWearableJobsText(g);
    return `<div class="gear-detail-header"><div><span class="tag">${qualityTag(g)}</span><h2>${equipmentNameHTML(g)}</h2><p class="small">${role} · ${CLASS_GEAR[g.job][g.slot]} · LV${gearRequiredLevelByTier(g.tier)}${wearer?' · '+esc(characterName(wearer))+'已穿戴':''}</p></div></div><div class="forge-layout"><article class="forge-preview"><h3>目前能力</h3><p class="equipment-total-summary">${globalThis.equipmentTotalSummaryText(g)}</p>${globalThis.equipmentAttributeDetailsHTML(g)}</article><div class="forge-controls"><section class="forge-action"><h3>強化基礎能力</h3>${g.plus<RULES.enhanceMax?`<p class="green">下一級 +${g.plus+1}：${globalThis.equipmentTotalSummaryText({...g,plus:g.plus+1})}</p><p class="small">費用：${upgradeCostText(g)} · 成功率 100%</p><button class="primary" onclick="enhance('${g.id}')" ${!canEnhance(g)?'disabled':''}>強化至 +${g.plus+1}</button>`:`<p class="gold">已達 +${RULES.enhanceMax} 強化上限。</p>`}</section><section class="forge-action"><h3>洗鍊隨機詞條</h3>${uiHelp('洗鍊說明','每條詞條品質：'+qualityChanceText()+'。重骰時逐次扣款；自動洗鍊會在至少出現一條指定品質以上詞條時停止，每個未達條件的結果停留 1 秒。')}<p>◈ ${cost.gold} 金幣 ＋ ${cost.ore} 鍛鐵／次</p><div class="actions"><button onclick="reroll('${g.id}')" ${draft||state.gold<cost.gold||state.ore<cost.ore?'disabled':''}>洗鍊一次</button><button onclick="autoReroll('${g.id}',2)" ${draft||state.gold<cost.gold||state.ore<cost.ore?'disabled':''}>自動洗到稀有+</button><button onclick="autoReroll('${g.id}',3)" ${draft||state.gold<cost.gold||state.ore<cost.ore?'disabled':''}>自動洗到傳說</button></div></section></div></div>${inlineAffixComparison(g)}`;
  }

  // Backpack no longer performs strengthening or rerolling directly. All such
  // actions preserve the selected gear and move to the dedicated forge page.
  inventoryGearDetail=function(g){
    if(!g)return `<div class="inventory-detail-empty"><b>沒有可顯示的裝備</b><p class="small">調整左側篩選條件後選擇裝備。</p></div>`;
    const wearer=gearWearer(g.id),worn=!!wearer,draft=inlineAffixDrafts.has(affixDraftKey(g)),locked=!!g.locked;
    const wearButtons=eligibleWearers(g).map(h=>`<button class="primary" onclick="previewEquip('${g.id}',${h.job})" ${h.equipped.includes(g.id)?'disabled':''}>${h.equipped.includes(g.id)?esc(characterName(h))+'已穿戴':'給 '+esc(characterName(h))+' 穿戴'}</button>`).join('');
    return `<div class="inventory-detail-pane"><div class="inventory-detail-heading"><div><div class="eyebrow">EQUIPMENT DETAIL / 裝備詳細</div><h2>${equipmentNameHTML(g)}</h2></div><span class="tag">${qualityTag(g)}${locked?' · 已鎖定':''}</span></div><div class="inventory-detail-meta">${gearWearableJobsText(g)} · ${CLASS_GEAR[g.job][g.slot]} · LV ${gearRequiredLevelByTier(g.tier)}${worn?' · 目前由 '+esc(characterName(wearer))+' 穿戴':''}</div><section class="inventory-detail-section"><h3>裝備能力</h3><p class="inventory-detail-stats equipment-total-summary">${globalThis.equipmentTotalSummaryText(g)}</p>${globalThis.equipmentAttributeDetailsHTML(g)}</section><section class="inventory-detail-section"><h3>操作</h3><div class="actions inventory-detail-actions">${wearButtons||'<span class="small">尚無可穿戴角色</span>'}<button onclick="openForge('${g.id}')">強化／洗鍊</button><button onclick="toggleGearLock('${g.id}')">${locked?'解除鎖定':'鎖定'}</button><button class="danger" onclick="salvage('${g.id}')" ${worn||draft||locked?'disabled':''}>分解</button></div>${draft?'<p class="inventory-detail-forge-note">這件裝備有待確認的洗鍊結果，請前往「裝備強化」處理。</p>':''}</section></div>`;
  };

  // Forge is now an account-level workbench: no character tabs, a sortable
  // equipment list on the left, and the selected equipment controls on right.
  forgeView=function(){
    ensureSharedGear();ensureAccountResources();
    const items=forgeSortedGear();
    if(items.length&&!items.some(g=>g.id===forgeSelection))forgeSelection=items[0].id;
    if(!items.length)forgeSelection=null;
    const selected=items.find(g=>g.id===forgeSelection)||null;
    const sortOptions=[['equipped','穿戴狀態'],['tier','裝備階級'],['plus','強化等級'],['quality','詞條品質'],['slot','部位'],['job','職業'],['name','名稱']];
    return heading('FORGE / 裝備強化','強化與洗鍊',`<span class="tag">${items.length} 件裝備</span>`)+`<section class="panel forge-account-shell">${resourceLine()}${uiHelp('強化說明','背包與強化資源皆為帳號共用；此頁直接從左側裝備列表選擇目標，不需要先選角色。強化必定成功，最高 +'+RULES.enhanceMax+'。')}<div class="forge-workbench"><section class="forge-gear-pane"><div class="forge-gear-toolbar"><div class="row"><b>選擇裝備</b><span class="small">${items.length} 件</span></div><div class="row"><label>排序 <select onchange="setForgeSort(this.value)">${sortOptions.map(([value,label])=>`<option value="${value}" ${forgeSortKey===value?'selected':''}>${label}</option>`).join('')}</select></label><button class="forge-sort-direction" onclick="toggleForgeSortDirection()">${forgeSortLabel()}</button></div></div><div class="forge-gear-list">${items.map(g=>forgeListItem(g,g===selected)).join('')||'<p class="inventory-list-empty">背包沒有裝備。</p>'}</div></section><section class="forge-detail-pane">${forgeDetail(selected)}</section></div></section>`;
  };

  if(state)render();
})();
