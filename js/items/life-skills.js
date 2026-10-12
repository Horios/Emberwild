/* Online gathering and a shared processing/alchemy lane. Outputs use existing
   account material and healing-potion stores, including their save/export path. */
(()=>{
  const PERIOD=5000,BUG_CHANCE=.05,LIMIT=1e9;
  const MATERIALS={herb:'紅色草',bug:'小蟲',paste:'紅色草泥',water:'清水',bottle:'藥水瓶'};
  const PRODUCTS=[
    {name:MATERIALS.bottle,description:'煉金用的空藥水瓶，每份配方消耗 1 個。'},
    {name:MATERIALS.water,description:'煉金用的清水，每份配方消耗 1 份。'}
  ];
  const RECIPES={
    process:{name:'加工紅色草',inputs:[[MATERIALS.herb,1]],output:MATERIALS.paste},
    alchemy:{name:'煉製簡易治療藥水',inputs:[[MATERIALS.paste,1],[MATERIALS.water,1],[MATERIALS.bottle,1]],output:'heal_small'}
  };
  let owner=null,gather=null,work=null,lastTick=Date.now();
  const copy=v=>JSON.parse(JSON.stringify(v));
  const count=name=>Number(playerHero()?.materials?.[name])||0;
  function resetJobs(){owner=party;gather=null;work=null;lastTick=Date.now();}
  function ready(){
    if(owner!==party)resetJobs();
    return !!party&&!!state;
  }
  function alchemyItem(){return healPotionItems().find(item=>item.id==='heal_small');}
  function outputCount(mode){return mode==='alchemy'?healPotionCount('heal_small'):count(MATERIALS.paste);}
  function canMake(mode){
    const recipe=RECIPES[mode];
    return !!recipe&&(mode!=='alchemy'||!!alchemyItem())&&outputCount(mode)<LIMIT&&recipe.inputs.every(([name,n])=>count(name)>=n);
  }
  function stoppedReason(mode){
    if(mode==='alchemy'&&!alchemyItem())return '目前設定沒有簡易治療藥水配方的成品';
    if(outputCount(mode)>=LIMIT)return '成品庫存已達上限';
    return '材料不足：'+RECIPES[mode].inputs.filter(([name,n])=>count(name)<n).map(([name,n])=>name+' ×'+n).join('、');
  }

  globalThis.buyLifeMaterial=function(name,quantity=1){
    if(!ready()||!PRODUCTS.some(p=>p.name===name))return false;
    const n=Number(quantity),h=playerHero();
    if(!Number.isSafeInteger(n)||n<1||n>10000)return false;
    if(h.gold<n){toast('金幣不足');return false;}
    if(count(name)+n>LIMIT){toast('材料庫存已達上限');return false;}
    const old=count(name),had=Object.hasOwn(h.materials,name),gold=h.gold;
    h.materials[name]=old+n;h.gold-=n;
    if(save()!==true){if(had)h.materials[name]=old;else delete h.materials[name];h.gold=gold;return false;}
    render();toast('已購買 '+name+' ×'+n);return true;
  };
  globalThis.startLifeGathering=function(){
    if(!ready()||gather)return false;
    if(count(MATERIALS.herb)>=LIMIT){toast('紅色草庫存已達上限');return false;}
    tickLifeSkills();gather={elapsed:0};render();return true;
  };
  globalThis.stopLifeGathering=function(){if(!ready())return;tickLifeSkills();gather=null;render();};
  globalThis.startLifeWork=function(mode){
    if(!ready()||!RECIPES[mode])return false;
    tickLifeSkills();
    if(work){toast('請先停止目前的加工或煉金');return false;}
    if(!canMake(mode)){toast(stoppedReason(mode));return false;}
    work={mode,elapsed:0};render();return true;
  };
  globalThis.stopLifeWork=function(){if(!ready())return;tickLifeSkills();work=null;render();};

  function tickLifeSkills(){
    if(!ready())return;
    const now=Date.now(),elapsed=Math.max(0,now-lastTick);lastTick=now;
    if(!gather&&!work)return;
    const h=playerHero(),before={materials:{...h.materials},potions:{...healingInventory()}};
    let changed=false,message='';
    if(gather){
      gather.elapsed+=elapsed;
      // A delayed background timer may cover multiple full five-second cycles.
      for(let i=0;gather&&gather.elapsed>=PERIOD&&i<1000;i++){
        if(count(MATERIALS.herb)>=LIMIT){gather=null;message='紅色草庫存已達上限，採集已停止';break;}
        gather.elapsed-=PERIOD;h.materials[MATERIALS.herb]=count(MATERIALS.herb)+1;
        if(Math.random()<BUG_CHANCE&&count(MATERIALS.bug)<LIMIT)h.materials[MATERIALS.bug]=count(MATERIALS.bug)+1;
        changed=true;
      }
    }
    if(work){
      work.elapsed+=elapsed;
      for(let i=0;work&&work.elapsed>=PERIOD&&i<1000;i++){
        const mode=work.mode,recipe=RECIPES[mode];
        if(!canMake(mode)){message=stoppedReason(mode)+'，'+recipe.name+'已停止';work=null;break;}
        for(const [name,n] of recipe.inputs)h.materials[name]=count(name)-n;
        if(mode==='alchemy')setHealPotionCount('heal_small',healPotionCount('heal_small')+1);
        else h.materials[recipe.output]=count(recipe.output)+1;
        work.elapsed-=PERIOD;changed=true;
        if(!canMake(mode)){message=stoppedReason(mode)+'，'+recipe.name+'已停止';work=null;}
      }
    }
    if(changed&&save()!==true){
      h.materials=before.materials;h.healingPotions=before.potions;
      gather=null;work=null;message='生活技能產物未能儲存，已回復庫存並停止動作';
    }
    if(message)toast(message);
    if(changed||message){if(tab==='lifeSkills'||tab==='equipment'||tab==='shop')render();}
    updateLifeProgress();
  }
  globalThis.tickLifeSkills=tickLifeSkills;

  function progress(kind,job){
    const ms=job?Math.min(PERIOD,job.elapsed):0;
    return `<div class="life-progress"><progress id="life-${kind}-progress" max="${PERIOD}" value="${ms}" aria-label="${kind==='gather'?'採集':'加工或煉金'}進度"></progress><span id="life-${kind}-time">${job?(ms/1000).toFixed(1)+' / 5.0 秒':'尚未開始'}</span></div>`;
  }
  function updateLifeProgress(){
    if(tab!=='lifeSkills')return;
    for(const [kind,job] of [['gather',gather],['work',work]]){
      const bar=document.getElementById('life-'+kind+'-progress'),label=document.getElementById('life-'+kind+'-time');
      const ms=job?Math.min(PERIOD,job.elapsed):0;
      if(bar)bar.value=ms;
      if(label)label.textContent=job?(ms/1000).toFixed(1)+' / 5.0 秒':'尚未開始';
    }
  }
  globalThis.lifeSkillsView=function(){
    ready();
    const item=alchemyItem(),workName=work?RECIPES[work.mode].name:'製作中：無';
    const stock=Object.values(MATERIALS).map(name=>`<span><b>${esc(name)}</b> ×${count(name).toLocaleString()}</span>`).join('');
    return heading('LIFE SKILLS / 生活技能測試','生活技能')+`<div class="life-skills-page">
      <section class="panel life-rules"><p>採集、煉金與探索可同時進行。加工與煉金共用製作動作，無法同時進行。</p><p class="small">每次動作固定 5 秒，不受探索倍速影響；開始後連續執行，材料不足時停止。切換頁面仍會繼續。停止動作會清除該次進度；返回標題或關閉遊戲後停止，不計算離線產物。</p></section>
      <section class="panel life-stock"><h2>共用材料</h2><div class="life-materials">${stock}</div><p class="small">簡易治療藥水 ×${healPotionCount('heal_small').toLocaleString()} · 材料可在背包的材料頁查看，藥水可在道具頁查看。</p><button onclick="setTab('shop')">購買藥水瓶、清水</button></section>
      <div class="life-skill-grid"><section class="panel"><div class="row"><h2>採集</h2><span class="tag">${gather?'採集中':'待命'}</span></div><h3>紅色草</h3><p>每 5 秒取得紅色草 ×1，每次採集另有 5% 機率獲得小蟲 ×1。</p><p class="small">紅色草賣價 1 金幣，小蟲賣價 3 金幣。小蟲暫無其他用途，後續再新增。</p>${progress('gather',gather)}<div class="actions"><button class="primary" onclick="startLifeGathering()" ${gather?'disabled':''}>開始採集</button><button onclick="stopLifeGathering()" ${!gather?'disabled':''}>停止採集</button></div></section>
      <section class="panel"><div class="row"><h2>煉金</h2><span class="tag">${work?esc(workName):'待命'}</span></div>${progress('work',work)}
      <article class="life-recipe"><h3>加工紅色草</h3><p>紅色草 ×1 → 紅色草泥 ×1</p><span class="small">5 秒／份</span><button onclick="startLifeWork('process')" ${work||!canMake('process')?'disabled':''}>開始加工</button></article>
      <article class="life-recipe"><h3>簡易治療藥水</h3><p>紅色草泥 ×1 ＋ 清水 ×1 ＋ 藥水瓶 ×1 → 簡易治療藥水 ×1</p><p class="small">5 秒／瓶 · ${item?'與商店 8 金幣藥水相同，恢復最大生命 '+Math.round(item.healFraction*100)+'%，冷卻 '+item.cooldown+' 回合。':'目前設定未提供此成品。'}</p><button onclick="startLifeWork('alchemy')" ${work||!canMake('alchemy')?'disabled':''}>開始煉金</button></article><div class="actions"><button onclick="stopLifeWork()" ${!work?'disabled':''}>停止${work?esc(RECIPES[work.mode].name):'製作'}</button></div></section></div></div>`;
  };
  const baseShop=shopView;
  shopView=function(){
    const products=PRODUCTS.map(p=>`<article class="shop-product-row fixed-shop-row life-shop-row" data-life-material="${esc(p.name)}"><div class="shop-product-name"><b>${esc(p.name)}</b><span class="small">每份 1</span></div><div class="shop-product-copy"><p class="shop-card-description"><b>說明：</b><span>${esc(p.description)}</span></p><p class="shop-card-detail"><b>效果：</b><span>煉金材料；無法直接使用。</span></p></div><div class="shop-product-meta"><b>1 金幣／份</b><span class="small">共用 ${count(p.name).toLocaleString()}</span></div><div class="actions"><button onclick="buyLifeMaterial('${p.name}',1)" ${state.gold<1?'disabled':''}>購買 1 份</button><button onclick="buyLifeMaterial('${p.name}',10)" ${state.gold<10?'disabled':''}>購買 10 份</button></div></article>`).join('');
    const section=`<section class="shop-section life-shop-section"><div class="shop-section-head"><h2>生活技能材料</h2><span class="small">存入全隊共用材料庫。</span></div><div class="shop-product-grid">${products}</div></section>`;
    return baseShop().replace('<div class="shop-catalog-scroll">','<div class="shop-catalog-scroll">'+section);
  };
  const baseTick=tick;tick=function(...args){tickLifeSkills();return baseTick(...args);};
  const baseLoad=loadParty;loadParty=function(...args){const result=baseLoad(...args);resetJobs();return result;};
  const baseStart=start;start=function(...args){const result=baseStart(...args);resetJobs();return result;};
  const baseReturn=returnToTitle;globalThis.returnToTitle=function(...args){tickLifeSkills();resetJobs();return baseReturn(...args);};
  globalThis.__EMBERWILD_LIFE_SKILLS={get jobs(){return copy({gather,work});},period:PERIOD,bugChance:BUG_CHANCE};
  resetJobs();
  if(state)render();
})();
