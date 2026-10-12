/* Online gathering and a shared processing/alchemy lane. Outputs use existing
   account material and healing-potion stores, including their save/export path. */
(()=>{
  const PERIOD=5000,BUG_CHANCE=.05,LIMIT=1e9;
  const MATERIALS={herb:'紅色草',bug:'小蟲',paste:'紅色草泥',water:'清水',bottle:'藥水瓶'};
  const DESCRIPTIONS={
    [MATERIALS.herb]:'可加工製作紅色草泥。',
    [MATERIALS.paste]:'可搭配清水、藥水瓶製作簡易治療藥水。',
    [MATERIALS.bug]:'尚無用途。',
    [MATERIALS.water]:'製作簡易治療藥水的煉金材料，每份配方消耗 1 份。',
    [MATERIALS.bottle]:'製作簡易治療藥水的空瓶，每份配方消耗 1 個。'
  };
  const GATHER_TARGETS=[{id:'herb',name:MATERIALS.herb,output:MATERIALS.herb}];
  let gatherTarget='herb';
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
  function resetJobs(){owner=party;gather=null;work=null;gatherTarget='herb';lastTick=Date.now();}
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
  globalThis.selectLifeGatheringTarget=function(id){
    if(!ready()||gather||!GATHER_TARGETS.some(target=>target.id===id))return false;
    gatherTarget=id;render();return true;
  };
  globalThis.startLifeGathering=function(id=gatherTarget){
    if(!ready()||gather)return false;
    const target=GATHER_TARGETS.find(target=>target.id===id);if(!target)return false;
    gatherTarget=id;
    if(count(target.output)>=LIMIT){toast('紅色草庫存已達上限');return false;}
    tickLifeSkills();gather={target:id,elapsed:0};render();return true;
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
      const target=GATHER_TARGETS.find(target=>target.id===gather.target);
      gather.elapsed+=elapsed;
      // A delayed background timer may cover multiple full five-second cycles.
      for(let i=0;gather&&gather.elapsed>=PERIOD&&i<1000;i++){
        if(count(target.output)>=LIMIT){gather=null;message='紅色草庫存已達上限，採集已停止';break;}
        gather.elapsed-=PERIOD;h.materials[target.output]=count(target.output)+1;
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
    const stock=Object.values(MATERIALS).map(name=>{
      const n=count(name);
      return `<article class="life-stock-row"><div class="life-stock-info"><b>${esc(name)}</b><p class="small">${esc(DESCRIPTIONS[name])}</p></div><div class="life-stock-count"><b>×${n.toLocaleString()}</b><span class="small">${materialSellPrice(name)} 金幣／件</span></div><div class="life-stock-actions" data-material="${esc(name)}"><input aria-label="${esc(name)}賣出數量" type="number" min="1" max="${n}" value="1" ${n<1?'disabled':''}><button onclick="sellMaterialFromControl(this)" ${n<1?'disabled':''}>賣出</button><button onclick="sellAllMaterialFromControl(this)" ${n<1?'disabled':''}>全部賣出</button></div></article>`;
    }).join('');
    return heading('LIFE SKILLS / 生活技能測試','生活技能')+`<div class="life-skills-page">
      <section class="panel life-rules"><p>採集、煉金與探索可同時進行。加工與煉金共用製作動作，無法同時進行。</p><p class="small">每次動作固定 5 秒，不受探索倍速影響；開始後連續執行，材料不足時停止。切換頁面仍會繼續。停止動作會清除該次進度；返回標題或關閉遊戲後停止，不計算離線產物。</p></section>
      <section class="panel life-stock"><h2>目前材料庫存</h2><div class="life-materials">${stock}</div><p class="small">簡易治療藥水 ×${healPotionCount('heal_small').toLocaleString()} · 材料為全隊共用；藥水可在背包的道具頁查看。</p><button onclick="setShopCategory('life');setTab('shop')">購買藥水瓶、清水</button></section>
      <div class="life-skill-grid"><section class="panel"><div class="row"><h2>採集</h2><span class="tag">${gather?'採集中':'待命'}</span></div><label class="life-gather-selector">採集對象 <select aria-label="採集對象" onchange="selectLifeGatheringTarget(this.value)" ${gather?'disabled':''}>${GATHER_TARGETS.map(target=>`<option value="${target.id}" ${target.id===gatherTarget?'selected':''}>${esc(target.name)}</option>`).join('')}</select></label><p>每 5 秒取得紅色草 ×1，每次採集另有 5% 機率獲得小蟲 ×1。</p>${progress('gather',gather)}<div class="actions"><button class="primary" onclick="startLifeGathering()" ${gather?'disabled':''}>開始採集</button><button onclick="stopLifeGathering()" ${!gather?'disabled':''}>停止採集</button></div></section>
      <section class="panel"><div class="row"><h2>煉金</h2><span class="tag">${work?esc(workName):'待命'}</span></div>${progress('work',work)}
      <article class="life-recipe"><h3>加工紅色草</h3><p>紅色草 ×1 → 紅色草泥 ×1</p><span class="small">5 秒／份</span><button onclick="startLifeWork('process')" ${work||!canMake('process')?'disabled':''}>開始加工</button></article>
      <article class="life-recipe"><h3>簡易治療藥水</h3><p>紅色草泥 ×1 ＋ 清水 ×1 ＋ 藥水瓶 ×1 → 簡易治療藥水 ×1</p><p class="small">5 秒／瓶 · ${item?'與商店 8 金幣藥水相同，恢復最大生命 '+Math.round(item.healFraction*100)+'%，冷卻 '+item.cooldown+' 回合。':'目前設定未提供此成品。'}</p><button onclick="startLifeWork('alchemy')" ${work||!canMake('alchemy')?'disabled':''}>開始煉金</button></article><div class="actions"><button onclick="stopLifeWork()" ${!work?'disabled':''}>停止${work?esc(RECIPES[work.mode].name):'製作'}</button></div></section></div></div>`;
  };
  globalThis.lifeShopMaterialsView=function(){
    const products=PRODUCTS.map(p=>`<article class="shop-product-row fixed-shop-row life-shop-row" data-life-material="${esc(p.name)}"><div class="shop-product-name"><b>${esc(p.name)}</b><span class="small">每份 1</span></div><div class="shop-product-copy"><p class="shop-card-description"><b>說明：</b><span>${esc(p.description)}</span></p><p class="shop-card-detail"><b>效果：</b><span>煉金材料；無法直接使用。</span></p></div><div class="shop-product-meta"><b>1 金幣／份</b><span class="small">共用 ${count(p.name).toLocaleString()}</span></div><div class="actions"><button onclick="buyLifeMaterial('${p.name}',1)" ${state.gold<1?'disabled':''}>購買 1 份</button><button onclick="buyLifeMaterial('${p.name}',10)" ${state.gold<10?'disabled':''}>購買 10 份</button></div></article>`).join('');
    const section=`<section class="shop-section life-shop-section"><div class="shop-section-head"><h2>生活技能材料</h2><span class="small">存入全隊共用材料庫。</span></div><div class="shop-product-grid">${products}</div></section>`;
    return section;
  };
  const baseTick=tick;tick=function(...args){tickLifeSkills();return baseTick(...args);};
  const baseLoad=loadParty;loadParty=function(...args){const result=baseLoad(...args);resetJobs();return result;};
  const baseStart=start;start=function(...args){const result=baseStart(...args);resetJobs();return result;};
  const baseReturn=returnToTitle;globalThis.returnToTitle=function(...args){tickLifeSkills();resetJobs();return baseReturn(...args);};
  globalThis.__EMBERWILD_LIFE_SKILLS={get jobs(){return copy({gather,work});},period:PERIOD,bugChance:BUG_CHANCE};
  resetJobs();
  if(state)render();
})();
