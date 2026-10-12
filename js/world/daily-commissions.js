/* One account commission per Taipei calendar day; side quests stay one-time. */
(()=>{
  const C=EmberwildCommissions,copy=v=>JSON.parse(JSON.stringify(v));
  const current=b=>b?.dailyVersion===1&&b.day>=C.day(Date.now())&&C.validBoard(b);
  function stock(q){return q.source==='potion'?healPotionCount(q.item):(playerHero().materials[q.mat]||0);}
  function setStock(q,n){if(q.source==='potion')setHealPotionCount(q.item,n);else playerHero().materials[q.mat]=n;}
  function ready(q){return !!q&&!q.done&&stock(q)>=q.n&&(q.kind!=='gear'||playerHero().bag.length<RULES.bagCapacity);}
  function generate(){
    const mi=questRegion(playerHero()),m=MAPS[mi],b=GAMEPLAY_SETTINGS.quests.board;
    const pools=[];
    if(m?.mobs?.length)pools.push(m.mobs.map(mob=>({source:'monster',mat:mob[2]})));
    pools.push([{source:'gather',mat:'紅色草'}]);
    const alchemy=[{source:'alchemy',mat:'紅色草泥'}];
    if(healPotionItems().some(item=>item.id==='heal_small'))alchemy.push({source:'potion',mat:'簡易治療藥水',item:'heal_small'});
    pools.push(alchemy);
    const pool=pools[rand(pools.length)],product=pool[rand(pool.length)];
    const base=Math.max(1,Math.min(100,Math.round(b.taskBase+rand(Math.max(1,Math.round(b.taskRandomRange)))+(regionTier(mi)-1)*b.taskPerTier)));
    return {dailyVersion:1,day:C.day(Date.now()),next:C.next(Date.now()),serial:(playerHero().board?.serial||0)+1,tasks:[{id:uid(),map:mi,...product,n:product.source==='potion'?Math.max(1,Math.ceil(base/4)):product.source==='alchemy'?Math.max(1,Math.ceil(base/2)):base,kind:rand(2)?'gear':'gem',gem:rand(3),slot:rand(4),rar:Math.random()<b.legendaryGearChance?3:2,job:rand(4),done:false}]};
  }
  ensureBoard=function(){
    if(!party||!state)return false;
    ensureAccountQuests();const h=playerHero();if(current(h.board))return true;
    const old=h.board;h.board=generate();
    if(save()!==true){h.board=old;return false;}return true;
  };
  // Old paid-refresh and repeat APIs must not bypass the daily allowance.
  buildBoard=function(){return ensureBoard();};
  refreshBoard=confirmRefresh=function(){toast('每日限一張委託，台灣時間 00:00 更新');return false;};
  claimRepeat=function(){toast('常駐募集已改為每日委託');return false;};
  claimBoard=function(id){
    if(!ensureBoard())return false;
    const h=playerHero(),board=h.board,q=board.tasks.find(q=>q.id===id);
    if(!ready(q))return false;
    const before={board:copy(board),gold:h.gold,ore:h.ore,gems:[...h.gems],repeat:h.repeat,bag:[...h.bag],count:stock(q)};
    const b=GAMEPLAY_SETTINGS.quests.board;
    try{
      setStock(q,before.count-q.n);q.done=true;
      h.gold+=Math.round(regionTier(q.map)*b.goldPerTier);h.ore+=Math.round(regionTier(q.map)*b.orePerTier);
      if(q.kind==='gear')withHero(h,()=>addGear(gear(regionTier(q.map),q.slot,q.rar,q.job)));
      else h.gems[q.gem]+=Math.round(b.gemReward);
      h.repeat++;
      if(save()!==true)throw Error('儲存失敗');
    }catch(e){h.board=before.board;h.gold=before.gold;h.ore=before.ore;h.gems=before.gems;h.repeat=before.repeat;h.bag=before.bag;setStock(q,before.count);toast('委託未能儲存，材料與獎勵已回復');return false;}
    render();toast('每日委託完成，明日可接取新委託');return true;
  };
  globalThis.questReadyCount=function(){
    if(!party||!state)return 0;
    const h=playerHero();
    return (current(h.board)?h.board.tasks.filter(ready).length:0)+QUESTS.filter(q=>!h.claimed.includes(q.id)&&(h.materials[q.mat]||0)>=q.n).length;
  };
  questView=function(){
    ensureBoard();const h=playerHero(),b=GAMEPLAY_SETTINGS.quests.board,board=h.board;
    const tasks=current(board)?board.tasks:[];
    const labels={monster:'探索物資',gather:'採集產物',alchemy:'煉金產物',potion:'煉金產物'};
    const daily=tasks.map(q=>`<article class="card"><span class="tag">${labels[q.source]||'探索物資'} · ${q.done?'今日已完成':'每日委託'}</span><h2>${esc(q.mat)}募集</h2><p>${stock(q)} / ${q.n} 份</p><p class="gold">${q.kind==='gear'?`${RARITY[q.rar]} ${CLASSES[q.job].name}${SLOTS[q.slot]} ×1`:`${GEMS[q.gem].name} ×${Math.round(b.gemReward)}`}</p><p class="small">另獲 ${Math.round(regionTier(q.map)*b.goldPerTier)} 金幣、${Math.round(regionTier(q.map)*b.orePerTier)} 鍛鐵</p>${q.kind==='gear'&&h.bag.length>=RULES.bagCapacity&&!q.done?'<p class="small">背包已滿，請先整理再交付。</p>':''}<button class="primary" onclick="claimBoard('${q.id}')" ${ready(q)?'':'disabled'}>${q.done?'今日已完成':'交付並領獎'}</button></article>`).join('');
    const side=QUESTS.map((q,i)=>`<article class="card"><span class="tag">一次性支線</span><h2>${esc(q.title)}</h2><p>${esc(q.desc)}</p><p>${esc(q.mat)}　${h.materials[q.mat]||0} / ${q.n}</p><p class="gold">${q.gold} 金幣 · ${q.ore} 鍛鐵 · 隨機寶石 ×${Math.round(GAMEPLAY_SETTINGS.quests.side[i]?.gem??1)}</p><button class="primary" onclick="claimQuest('${q.id}')" ${h.claimed.includes(q.id)||(h.materials[q.mat]||0)<q.n?'disabled':''}>${h.claimed.includes(q.id)?'已完成':'交付材料'}</button></article>`).join('');
    return heading('JOURNAL / 帳號共用','委託手札')+`<section class="panel"><b>每日委託 · 今日 ${tasks.some(q=>q.done)?1:0} / 1</b><p class="small">每天限完成一張，全隊共用。台灣時間 00:00 更新；切換角色或地圖不會更換委託。需求可能為探索素材、紅色草、紅色草泥或簡易治療藥水。未交付的材料仍保留在庫存。</p></section><div class="cards">${daily||'<p>委託未能儲存，請稍後重新開啟手札。</p>'}</div><h2>一次性支線</h2><div class="cards">${side}</div>`;
  };
  const baseStart=start;start=function(...args){const out=baseStart(...args);ensureBoard();render();return out;};
  const baseLoad=loadParty;loadParty=function(...args){const out=baseLoad(...args);ensureBoard();return out;};
  if(state){ensureBoard();render();}
})();
