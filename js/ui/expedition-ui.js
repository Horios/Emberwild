
/* Update 27: compact expedition controls + lower-density battle journal. */
(function installExpeditionUiTidy(){
  const style=document.createElement('style');
  style.textContent=`
  /* Main battle: keep the battlefield dominant and use one compact control card on the lower-right. */
  .text-battle-layout{grid-template-columns:minmax(0,1.78fr) minmax(215px,.72fr)!important;grid-template-rows:minmax(0,1fr)!important;gap:8px!important}
  .party-combat{grid-column:1;grid-row:1}
  .battle-map-column.expedition-control-card{grid-column:2;grid-row:1;align-self:end;max-height:min(520px,72vh);overflow:auto;padding:10px!important}
  .expedition-control-card .control-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
  .expedition-control-card .control-head h2{font-size:15px;margin:0}
  .expedition-control-card .control-grid{display:grid;gap:6px}
  .expedition-control-card .control-row{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:6px}
  .expedition-control-card .control-row>span{font-size:11px;color:var(--muted)}
  .expedition-control-card select,.expedition-control-card button{min-width:0;height:30px;padding:3px 7px;font-size:12px}
  .expedition-control-card .control-row select{width:100%}
  .expedition-control-card .icon-help{width:28px!important;min-width:28px!important;padding:0!important;border-radius:999px;font-weight:700}
  .expedition-control-card .boss-compact{margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
  .expedition-control-card .boss-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:5px}
  .expedition-control-card .boss-head b{font-size:12px}
  .expedition-control-card .boss-meter{height:6px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;margin:5px 0}
  .expedition-control-card .boss-meter>span{display:block;height:100%;background:currentColor;opacity:.72}
  .expedition-control-card .boss-meta{display:flex;gap:5px 8px;flex-wrap:wrap;font-size:11px;color:var(--muted);line-height:1.4}
  .expedition-control-card .boss-actions{display:flex;gap:6px;align-items:center;margin-top:7px}
  .expedition-control-card .boss-actions button{flex:1}
  .expedition-control-card details{margin-top:7px}
  .expedition-control-card details>summary{cursor:pointer;color:var(--muted);font-size:11px}
  .expedition-control-card .supply-list{display:grid;gap:5px;margin-top:6px}
  .expedition-control-card .supply-row{border:1px solid rgba(255,255,255,.08);padding:6px;border-radius:7px;display:grid;gap:5px}
  .expedition-control-card .supply-row-head{display:flex;justify-content:space-between;gap:6px;align-items:center}
  .expedition-control-card .supply-actions{display:flex;gap:4px;flex-wrap:wrap}
  .expedition-control-card .supply-actions button{height:27px;font-size:11px;padding:2px 5px}
  .expedition-control-card .supply-actions label{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--muted)}
  .party-combat>.actions>.icon-help{width:28px!important;height:28px!important;min-width:28px!important;padding:0!important;border-radius:999px;font-size:11px;flex:0 0 28px!important}
  /* Remove the superseded standalone panels that used to repeat the same controls. */
  .difficulty-panel,.pace-controls,.boss-meter-panel,.expedition-tools{display:none!important}

  /* Journal: show the useful live log first, move secondary data behind one disclosure. */
  #app>.layout{grid-template-columns:150px minmax(0,1fr) clamp(235px,20vw,310px)!important}
  .global-battle-journal{grid-template-rows:auto minmax(0,1fr) auto!important;gap:5px!important;padding:7px!important}
  .global-journal-head{max-height:none!important;overflow:visible!important}
  .global-journal-head .journal-title-row{display:flex;align-items:center;justify-content:space-between;gap:6px}
  .global-journal-head h2{font-size:14px!important}
  .global-journal-head .journal-summary{font-size:11px;color:var(--muted);margin:3px 0 5px;white-space:normal;line-height:1.35}
  .global-journal-head .journal-actions{display:flex;gap:5px}
  .global-journal-head .journal-actions button{height:28px;min-height:28px;width:auto!important;padding:3px 7px;font-size:11px}
  .global-battle-journal #liveLog{min-height:0!important;overflow:hidden!important}
  .battle-log-stream{--battle-log-visible-rows:8!important;--battle-log-row-height:21px!important}
  .global-battle-journal .journal-loot-compact{border-top:1px solid var(--line);padding-top:5px;margin:0;min-height:0}
  .global-battle-journal .journal-loot-compact>summary{height:auto!important;cursor:pointer;font-size:11px;color:var(--muted)}
  .global-battle-journal .journal-loot-list{max-height:145px;overflow:auto;margin-top:5px}
  .global-battle-journal .journal-loot-row{font-size:11px;padding:2px 0}
  @media(max-width:1100px){
    #app>.layout{grid-template-columns:116px minmax(0,1fr) 245px!important}
    .text-battle-layout{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto!important}
    .battle-map-column.expedition-control-card{grid-column:1;grid-row:2;max-height:none}
  }
  `;
  document.head.appendChild(style);

  const safeEsc=s=>typeof esc==='function'?esc(String(s)):String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const isFinal=mi=>typeof globalThis.isFinalMap==='function'?globalThis.isFinalMap(mi):GAMEPLAY_SETTINGS?.maps?.catalog?.[mi]?.mapType==='final';
  const mapCfg=mi=>typeof globalThis.worldMapConfig==='function'?globalThis.worldMapConfig(mi):GAMEPLAY_SETTINGS?.maps?.catalog?.[mi];
  const progressEntry=mi=>typeof globalThis.bossProgressEntry==='function'?globalThis.bossProgressEntry(mi):(party?.bossProgress?.[mapCfg(mi)?.id]||{progress:0,charges:0});
  const bossRows=mi=>typeof globalThis.configuredBossStageRows==='function'?globalThis.configuredBossStageRows(mi):[];
  const finalRows=mi=>typeof globalThis.configuredFinalStageRows==='function'?globalThis.configuredFinalStageRows(mi):[];
  const fmt=n=>Math.round((Number(n)||0)*100)/100;
  function tooltip(label,text){return `<button type="button" class="icon-help" title="${safeEsc(text)}" aria-label="${safeEsc(label+'：'+text)}">?</button>`;}

  function compactSupply(){
    const pc=Math.round(GS('quests.potion.buyCost',75)),pq=Math.round(GS('quests.potion.buyQuantity',5)),th=Math.round(GS('combat.autoPotionThreshold',.35)*10000)/100;
    return `<details><summary>隊伍補給</summary><div class="supply-list">${party.members.map(h=>`<div class="supply-row"><div class="supply-row-head"><b>${safeEsc(characterName(h))}</b><span class="small">藥水 ${h.potions}</span></div><div class="supply-actions"><button onclick="heroMenuAction(${h.job},()=>potion())" ${h.potions<1?'disabled':''}>喝藥</button><button onclick="heroMenuAction(${h.job},()=>buyPotion())" ${h.gold<pc?'disabled':''}>+${pq}／${pc}金</button><label title="生命低於 ${th}% 時自動使用治療藥水"><input type="checkbox" ${h.autoPotion?'checked':''} onchange="heroMenuAction(${h.job},()=>{state.autoPotion=this.checked;save()})">自動</label></div></div>`).join('')}</div></details>`;
  }

  function bossBlock(mi){
    if(isFinal(mi)){
      const rows=finalRows(mi),total=rows.reduce((n,x)=>n+(x.count||0),0)||1;
      return `<div class="boss-compact"><div class="boss-head"><b>終局關卡</b><span class="tag">${total} 隻</span></div><div class="boss-meta"><span>固定編成</span><span>${party?.bossChallenge?.active?'挑戰中':'直接由探索進入'}</span></div></div>`;
    }
    const cfg=mapCfg(mi),bm=GAMEPLAY_SETTINGS.monsters.bossMeter,entry=progressEntry(mi),enabled=cfg?.bossEnabled!==false,active=party?.bossChallenge?.active&&party.bossChallenge.mapIndex===mi,total=enabled?bossRows(mi).reduce((n,x)=>n+(x.count||0),0):0,pct=entry.charges>=bm.maxCharges?100:Math.max(0,Math.min(100,(Number(entry.progress)||0)/bm.progressPerCharge*100));
    return `<div class="boss-compact"><div class="boss-head"><b>${active?'BOSS 關卡':'BOSS 進度'}</b><span class="tag">${entry.charges}/${bm.maxCharges} 次</span></div><div class="boss-meter"><span style="width:${pct}%"></span></div><div class="boss-meta"><span>${fmt(entry.progress)}/${bm.progressPerCharge}%</span><span>普通 +${bm.normalProgress}%</span><span>菁英 ×${bm.eliteMultiplier}</span><span>${total} 隻／場</span></div><div class="boss-actions">${active?`<button class="danger" onclick="leaveBossChallenge()" title="離開會放棄目前已消耗的一次，剩餘次數保留。">離開關卡</button>`:`<button class="primary" onclick="startBossChallenge()" ${!enabled||entry.charges<1?'disabled':''} title="${enabled?'使用 1 次累積挑戰進入本地圖 BOSS 關卡。':'此地圖 BOSS 挑戰已停用。'}">挑戰 BOSS</button>`}${tooltip('BOSS 規則','普通與菁英怪擊殺會累積進度；進度滿後增加一次挑戰，次數用完會自動返回一般探索。')}</div></div>`;
  }

  function expeditionControlCard(){
    const mi=party.map,mode=party.difficulty||0;
    return `<section class="panel battle-map-column expedition-control-card"><div class="control-head"><div><span class="eyebrow">EXPEDITION CONTROL</span><h2>探索控制</h2></div>${tooltip('探索控制','地圖、難度與倍速共用此面板。切換地圖或難度會結束目前遭遇。介面中的「回合」是指該角色每次輪到自己行動一次；技能與治療藥水等冷卻只在該角色行動時遞減 1，不受戰鬥倍速影響。自動喝水在角色回合開始時判定，且不會取消原本的攻擊。')}</div><div class="control-grid"><label class="control-row"><span>地圖</span><select aria-label="探索地圖" onchange="chooseMap(Number(this.value))">${MAPS.map((m,i)=>`<option value="${i}" ${i===mi?'selected':''} ${canVisit(i)?'':'disabled'}>${safeEsc(m.name)} · LV${m.min}${isFinal(i)?' 終局':'–'+m.max}</option>`).join('')}</select><button onclick="showRegionBestiary()" title="查看目前區域怪物、BOSS 關卡與掉落">圖鑑</button></label><label class="control-row"><span>難度</span><select aria-label="探索難度" onchange="changeDifficulty(this.value)">${MODES.map((d,i)=>`<option value="${i}" ${i===mode?'selected':''}>${safeEsc(d.name)}</option>`).join('')}</select>${tooltip('難度','切換難度會結束目前遭遇；不會恢復生命。詳細倍率可在冒險指南查看。')}</label><div class="control-row"><span>倍速</span><button onclick="toggleBattleRate()" title="點擊循環切換可用戰鬥倍速">${battleRate}×</button>${tooltip('戰鬥節奏','倍速只影響等待時間，不改變回合制冷卻與行動順序。')}</div></div>${bossBlock(mi)}${compactSupply()}${combatContributionPanel()}</section>`;
  }

  if(typeof battleView==='function'){
    const compactBattleViewBase=battleView;
    battleView=function(){
      let html=compactBattleViewBase();
      if(!party)return html;
      /* Replace the existing right-side map list with the unified control card. */
      html=html.replace(/<section class="panel battle-map-column">[\s\S]*?<\/section>/,expeditionControlCard());
      /* In case an older wrapper failed to create that column, inject before the battle grid closes. */
      if(!html.includes('expedition-control-card')){
        const marker='</div><section class="panel battle-buffs">';
        if(html.includes(marker))html=html.replace(marker,expeditionControlCard()+marker);
        else html+=expeditionControlCard();
      }
      /* Keep combat rules available without occupying a separate row. */
      html=html.replace(/<p class="small combat-rule">[\s\S]*?<\/p>/,'');
      html=html.replace(/(<button class="primary" onclick="toggleBattle\(\)">[\s\S]*?<\/button>)/,`$1${tooltip('戰鬥規則','• 冷卻：技能與治療藥水等只在對應角色完成自己的行動時遞減 1，不受戰鬥倍速影響。\n• 自動攻擊：集中攻擊敵方隊列中第一名仍存活的敵人，擊倒後再依序切換下一名。\n• 遭遇結束：全隊生命回滿並清空護盾。\n• 技能冷卻：每次新遭遇開始時重置。')}`);
      return html;
    };
  }

  if(typeof sharedBattleJournal==='function'){
    sharedBattleJournal=function(){
      if(!party)return '';
      const paused=$('modal').open,alive=living().length,total=heroes().length,enemies=foes.filter(e=>e.hp>0).length,allEnemies=foes.length,lootKinds=expeditionLoot.items.size;
      return `<section id="globalBattleJournal" class="global-battle-journal" aria-label="全隊共通戰報"><div class="global-journal-head"><div class="journal-title-row"><h2>全隊戰報</h2><span class="tag">${running?(paused?'視窗暫停':'探索中'):'已暫停'} · ${battleRate}×</span></div><div class="journal-summary">${safeEsc(MAPS[party.map].name)} · ${safeEsc(MODES[party.difficulty||0].name)} · 隊員 ${alive}/${total} · 敵人 ${enemies}/${allEnemies}</div><div class="journal-actions"><button onclick="toggleBattle()">${running?'暫停':'開始'}</button>${tab==='battle'?'':`<button onclick="setTab('battle')">戰場</button>`}</div></div><div id="liveLog" role="log" aria-label="即時戰鬥紀錄">${logContent()}</div><div class="journal-resizer" title="拖曳調整戰報與累積戰利品高度" onpointerdown="startJournalResize(event)"></div><details class="journal-loot-compact" ${globalThis.journalLootOpen?'open':''} ontoggle="globalThis.journalLootOpen=this.open"><summary>累積戰利品 · 擊敗 ${expeditionLoot.kills} · ${lootKinds} 種</summary><div id="journalLootList" class="journal-loot-list">${[...expeditionLoot.items].map(([name,item])=>`<div class="journal-loot-row"><span class="loot-rarity-${item.rar??0}">${safeEsc(name)}</span><b>+${(item.count??item).toLocaleString()}</b></div>`).join('')||'<p class="small">尚無戰利品。</p>'}</div></details></section>`;
    };
  }

  if(typeof render==='function'&&typeof party!=='undefined'&&party)render();
})();
