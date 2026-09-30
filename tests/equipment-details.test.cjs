const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {openRuntime}=require('./runtime.cjs');
const regression=require('./fixtures/equipment-panel-regression.json');
const legacy=require('./fixtures/legacy-progression.json');
const root=path.resolve(__dirname,'..');

test('Equipment ratings, source contributions and existing equipment flows',async t=>{
  const r=await openRuntime(root);
  try{
    await r.page.evaluate(()=>{
      clearInterval(timer);
      globalThis.__equipmentDefaults=exportableBalance();
      globalThis.__equipmentTestGear=(extra={})=>({id:'equipment-test',job:0,slot:0,tier:10,formJob:0,form:0,powerTier:1,plus:0,rar:0,difficulty:0,prefixId:'',suffixId:'',affix:[],...extra});
      globalThis.__equipmentTestHero=()=>{
        closeModal();state=initial(0);state.lv=60;state.won=true;state.bag=[];state.equipped=[null,null,null,null,null];
        party=createParty(state);party.cleared=true;syncParty();state.hp=stats(state).hp;continueFromTitle();
        return state;
      };
    });
    await t.test('All ten tiers map correctly, and only tier ten has SSS',async()=>{
      const rows=await r.page.evaluate(()=>Array.from({length:10},(_,i)=>{
        const g=__equipmentTestGear({powerTier:i+1});
        const rating=equipmentBaseRating(g);
        g.plus=15;g.affix=[{type:0,rank:3,value:30}];g.prefixId='radiant';g.suffixId='vanguard';
        return [rating,equipmentBaseRating(g),equipmentBaseRating({...g,tier:1,starterPack:{}}),equipmentBaseRatingHTML(g)];
      }));
      assert.deepEqual(rows.map(x=>x[0]),['D','D','C','C','B','B','A','S','SS','SSS']);
      for(const [a,b,starter,html] of rows){assert.equal(a,b);assert.equal(starter,'—');assert.match(html,/基底評級：/);}
      assert.equal(rows.filter(x=>x[0]==='SSS').length,1);
    });
    await t.test('Raw attack 30 with an equipment 30% rule displays 39 and a contribution of 9',async()=>{
      const out=await r.page.evaluate(()=>{
        ITEM_FORMS[0][0][0].fixedEffects=[{key:'gearAtkPct',value:30},{key:'attackPct',value:10}];
        const h=__equipmentTestHero(),g=__equipmentTestGear(),naked=stats(h);h.bag=[g];h.equipped[0]=g.id;
        const ledger=equipmentStatContributions(g),equipped=stats(h);
        return {ledger,summary:equipmentTotalSummaryText(g),naked,equipped,html:equipmentAttributeDetailsHTML(g)};
      });
      assert.equal(out.summary,'攻擊 +39');assert.equal(out.ledger.total.atk,39);
      assert.equal(out.ledger.rows.find(x=>x.label==='基底數值').stats.atk,30);
      assert.equal(out.ledger.rows.find(x=>x.label==='基底效果 1').stats.atk,9);
      assert.equal(out.ledger.rows.find(x=>x.label==='基底效果 2').stats.atk,0);
      assert.equal(out.equipped.atk,Math.round((out.naked.atk+39)*1.1));
      assert.match(out.html,/角色總攻擊力 \+10%/);assert.doesNotMatch(out.html,/不套用|無效|不計算/);
    });
    await t.test('Flat stats, speed and legacy affixes count once; percentages and combat effects remain active',async()=>{
      const out=await r.page.evaluate(()=>{
        ITEM_FORMS[0][0][0].fixedEffects=[{key:'flatAttack',value:20},{key:'flatHp',value:12},{key:'flatDefense',value:3},{key:'speed',value:4},{key:'bossDamagePct',value:15}];
        const h=__equipmentTestHero(),g=__equipmentTestGear({prefixId:'keen',suffixId:'fury',affix:[{type:0,rank:3,value:5},{type:15,rank:3,value:10}]}),naked=stats(h);
        h.bag=[g];h.equipped[0]=g.id;
        return {ledger:equipmentStatContributions(g),naked,equipped:stats(h),html:equipmentAttributeDetailsHTML(g)};
      });
      assert.deepEqual(out.ledger.total,{atk:55,hp:12,def:3,speed:4});
      assert.equal(out.equipped.atk,Math.round((out.naked.atk+55)*1.1));
      assert.equal(out.equipped.hp-out.naked.hp,12);assert.equal(out.equipped.def-out.naked.def,3);
      assert.ok(out.equipped.crit>out.naked.crit);assert.ok(out.equipped.critDamage>out.naked.critDamage);
      assert.equal(out.equipped.bossDamage,.15);assert.ok(out.equipped.speed>=out.naked.speed+4);
      for(const label of ['前綴加成','後綴加成','詞綴 2 加成'])assert.deepEqual(out.ledger.rows.find(x=>x.label===label).stats,{atk:0,hp:0,def:0,speed:0});
      assert.match(out.html,/角色總攻擊力 \+10%/);
    });
    await t.test('Supported prefix/suffix equipment percentages feed the actual game calculation',async()=>{
      const out=await r.page.evaluate(()=>{
        const doc=structuredClone(__equipmentDefaults);
        doc.equipmentPowerSystem.prefixes.find(x=>x.id==='piercing').effect={key:'gearHpPct',value:25};
        doc.equipmentPowerSystem.suffixes.find(x=>x.id==='vanguard').effect={key:'gearDefPct',value:20};
        applyBalanceConfig(doc,{persist:false});
        ITEM_FORMS[0][1][0].fixedEffects=[{key:'flatAttack',value:0}];
        const h=__equipmentTestHero(),g=__equipmentTestGear({slot:1,prefixId:'piercing',suffixId:'vanguard'}),before=stats(h);
        h.bag=[g];h.equipped[1]=g.id;
        return {ledger:equipmentStatContributions(g),before,after:stats(h),raw:gearStatBreakdown(g).raw};
      });
      assert.equal(out.ledger.total.hp,100);assert.equal(out.ledger.total.def,24);
      assert.equal(out.after.hp-out.before.hp,100);assert.equal(out.after.def-out.before.def,24);
      assert.equal(out.ledger.rows.find(x=>x.label==='前綴加成').stats.hp,20);
      assert.equal(out.ledger.rows.find(x=>x.label==='後綴加成').stats.def,4);
    });
    await t.test('Element, skill, cooldown and drop rules remain effective without becoming equipment attack',async()=>{
      const out=await r.page.evaluate(()=>{
        applyBalanceConfig(structuredClone(__equipmentDefaults),{persist:false});
        ITEM_FORMS[0][0][0].fixedEffects=[{key:'skillEffectPct',value:20,skill:0},{key:'skillCooldownReduction',value:1,skill:0},{key:'basicElement',value:'fire'},{key:'basicAdvanceNextRound',value:1},{key:'dropRateBonus',value:10}];
        const h=__equipmentTestHero(),g=__equipmentTestGear({affix:[{type:4,rank:3,value:30,skill:0},{type:16,rank:3,value:1}]}),power=skillPower(0,h),cooldown=skillCooldown(0,h);
        h.bag=[g];h.equipped[0]=g.id;
        return {ledger:equipmentStatContributions(g),power,buffedPower:skillPower(0,h),cooldown,buffedCooldown:skillCooldown(0,h),element:weaponElement(h),drop:heroDropRateBonus(h)};
      });
      assert.deepEqual(out.ledger.total,{atk:30,hp:0,def:0,speed:0});
      for(const row of out.ledger.rows.filter(x=>x.effect||x.affix))assert.deepEqual(row.stats,{atk:0,hp:0,def:0,speed:0});
      assert.equal(out.element,'fire');assert.equal(out.drop,.1);assert.ok(out.buffedPower>out.power);assert.ok(out.buffedCooldown<out.cooldown);
    });
    await t.test('Every source sums to the summary through rounding, power grades, enhancement and boss profiles',async()=>{
      const out=await r.page.evaluate(()=>{
        applyBalanceConfig(structuredClone(__equipmentDefaults),{persist:false});
        const issues=[];let checked=0;
        const check=g=>{
          const ledger=equipmentStatContributions(g);checked++;
          for(const k of ['hp','atk','def','speed']){
            if(ledger.rows.reduce((n,row)=>n+row.stats[k],0)!==ledger.total[k])issues.push('sum '+k);
            if(!Number.isSafeInteger(ledger.total[k])||ledger.rows.some(row=>!Number.isSafeInteger(row.stats[k])))issues.push('integer '+k);
          }
        };
        for(let job=0;job<4;job++)for(let slot=0;slot<4;slot++)for(const tier of [1,6,12])for(let powerTier=1;powerTier<=10;powerTier++)for(const plus of [0,10,15])check(__equipmentTestGear({job,slot,tier,powerTier,plus}));
        for(const region of MAPS.map((m,i)=>i).filter(i=>i!==6))for(const mode of [0,1,2]){
          const g=bossGear(region,0,mode);g.powerTier=10;g.plus=10;check(g);
        }
        ITEM_FORMS[0][0][0].fixedEffects=[{key:'gearAtkPct',value:16.3},{key:'gearAtkPct',value:-8.7},{key:'flatAttack',value:1.4},{key:'flatAttack',value:-.9},{key:'crit',value:5}];
        for(const tier of [1,3,12])for(const powerTier of [1,7,10])for(const plus of [0,10,15])check(__equipmentTestGear({tier,powerTier,plus}));
        return {issues,checked};
      });
      assert.deepEqual(out.issues,[]);assert.ok(out.checked>1500);t.diagnostic('Checked '+out.checked+' additive equipment source ledgers.');
    });
    await t.test('All 336 pre-change character stat snapshots remain identical with shipped defaults',async()=>{
      const issues=await r.page.evaluate(fixtures=>{
        applyBalanceConfig(structuredClone(__equipmentDefaults),{persist:false});
        const issues=[];
        for(const {gear:g,stats:expected} of fixtures){
          const h=initial(g.job);h.lv=60;h.stats=[35,10,14];h.advanced=true;h.bag=[structuredClone(g)];h.equipped=[];h.equipped[g.slot]=g.id;
          if(JSON.stringify(stats(h))!==JSON.stringify(expected))issues.push(g);
        }
        return issues;
      },regression);
      assert.deepEqual(issues,[]);
    });
    await t.test('All starter jobs stay ungraded, keep locked actions, and include growth in one ledger',async()=>{
      const out=await r.page.evaluate(()=>{
        const issues=[];let checked=0;
        for(let job=0;job<4;job++){
          closeModal();start(job);closeModal();
          for(const g of equipment(state)){
            checked++;if(equipmentBaseRating(g)!=='—'||canEnhance(g)||!equipmentBaseRatingHTML(g).includes('此裝備不適用基底評級。'))issues.push('starter '+job);
            if((equipmentAttributeDetailsHTML(g).match(/<details /g)||[]).length!==1)issues.push('fold '+job);
            const before=JSON.stringify(g);enhance(g.id);rerollEquipmentPowerTier(g.id);reroll(g.id);
            if(JSON.stringify(g)!==before)issues.push('locked '+job);
          }
        }
        const g=equipment(state).find(x=>x.slot===0);
        g.starterPack.fixedEffects=[{key:'gearAtkPct',value:30}];
        g.starterPack.growth={enabled:true,startLevel:1,maxLevel:60,effects:[{key:'flatAttack',value:1},{key:'attackPct',value:.5}]};
        state.lv=10;
        const ledger=equipmentStatContributions(g),growthRows=ledger.rows.filter(x=>x.label.startsWith('成長加成'));
        if(growthRows[0].stats.atk!==9||growthRows[1].stats.atk!==0||ledger.total.atk!==13)issues.push('growth');
        for(const k of ['hp','atk','def','speed'])if(ledger.rows.reduce((n,row)=>n+row.stats[k],0)!==ledger.total[k])issues.push('growth sum');
        return {issues,checked};
      });
      assert.equal(out.checked,20);assert.deepEqual(out.issues,[]);
    });
    await t.test('Summary hides rule text until expanded, keeps empty sources and footer, and fits narrow displays',async()=>{
      await r.page.evaluate(()=>{
        applyBalanceConfig(structuredClone(__equipmentDefaults),{persist:false});__equipmentTestHero();
        const g=__equipmentTestGear({powerTier:7,plus:10,affix:[{type:15,rank:3,value:10}]});state.bag.push(g);
        document.getElementById('modal').innerHTML=inventoryGearDetail(g);document.getElementById('modal').showModal();
      });
      const detail=r.page.locator('#modal .equipment-attribute-details');
      assert.equal(await detail.getAttribute('open'),null);assert.equal(await r.page.locator('#modal .equipment-attribute-rule').first().isVisible(),false);
      assert.equal(await r.page.locator('#modal .equipment-base-rating').innerText(),'基底評級：A');
      await detail.locator('summary').click();
      assert.equal(await r.page.locator('#modal .equipment-attribute-rule').first().isVisible(),true);
      const rows=await r.page.locator('#modal .equipment-attribute-line').evaluateAll(rows=>rows.map(row=>({label:row.querySelector('b').textContent,value:row.querySelector('.equipment-source-value').textContent})));
      for(const label of ['前綴加成','後綴加成','詞綴 1 加成','詞綴 2 加成'])assert.equal(rows.find(x=>x.label===label).value,'—');
      assert.match(await r.page.locator('#modal .equipment-source-note').innerText(),/皆已計入上方數值.*「—」表示該效果不直接影響裝備能力值/);
      await r.page.setViewportSize({width:390,height:844});
      assert.ok(await detail.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await r.page.setViewportSize({width:1280,height:800});await r.page.evaluate(()=>{closeModal();setTab('equipment');});
      const listName=r.page.locator('.inventory-list-name').first();
      assert.match(await listName.innerText(),/\+10[\s\S]*基底評級：A/);
      assert.ok(await listName.evaluate(el=>el.scrollHeight<=el.clientHeight+1));
      await r.page.evaluate(()=>openForge(state.bag[0].id));
      assert.ok(await r.page.locator('.forge-gear-name').first().evaluate(el=>el.scrollHeight<=el.clientHeight+1));
    });
    await t.test('Inventory, forge, pending loot, recipes and item descriptions contain no player-visible T tiers',async()=>{
      const out=await r.page.evaluate(()=>{
        __equipmentTestHero();const g=__equipmentTestGear({tier:12,powerTier:10,plus:10,affix:[{type:0,rank:3,value:3}]});state.bag.push(g);state.equipped[0]=g.id;forgeSelection=g.id;
        pendingGearLoot=[__equipmentTestGear({id:'pending-1',powerTier:1}),__equipmentTestGear({id:'pending-2',powerTier:2}),__equipmentTestGear({id:'pending-3',powerTier:10})];
        state.consumables.power_tier_reroll=1;
        const text=[inventoryGearDetail(g),forgeView(),pendingGearBottomView(),update12BossMemberView(),accountItemsView(),supplyDetail(SHOP.find(x=>x.id==='power_tier_reroll'))].join('\n');
        const host=document.createElement('div');host.innerHTML=text;
        const description=equipmentPlayerItemDescription({id:'power_tier_reroll',description:'重新抽選 T1～T10 強度階級。'});
        return {text:host.textContent,description,pending:pendingGearBottomView()};
      });
      assert.doesNotMatch(out.text,/\bT(?:10|[1-9])\b|T 階|T 級/);
      assert.doesNotMatch(out.description,/\bT(?:10|[1-9])\b/);assert.match(out.description,/基底評級/);
      assert.match(out.pending,/基底評級：D ×2/);assert.match(out.pending,/基底評級：SSS ×1/);
    });
    await t.test('Equipment comparison, wear, enhancement to configured +15, reroll and save/load still work',async()=>{
      const out=await r.page.evaluate(()=>{
        applyBalanceConfig(structuredClone(__equipmentDefaults),{persist:false});
        const h=__equipmentTestHero(),first=__equipmentTestGear({id:'worn-test'}),next=__equipmentTestGear({id:'next-test',powerTier:10,plus:10,affix:[{type:0,rank:3,value:5},{type:15,rank:3,value:10}]});
        h.bag.push(first,next);equipSharedGear(first.id,memberKey(h),0);
        const before=stats(h),comparison=equipmentComparison(h,next,0);
        previewEquip(next.id,memberKey(h),0);
        const previewText=$('modal').textContent,unchanged=h.equipped[0]===first.id;
        confirmEquipComparison(next.id,memberKey(h),0);
        const after=stats(h),worn=h.equipped[0]===next.id;
        const doc=exportableBalance();doc.balanceSettings.equipment.enhance.maxLevel=15;applyBalanceConfig(doc,{persist:true});
        h.ore=h.dust=100000;h.materials['以太鍛鐵']=100000;
        for(let i=0;i<5;i++)enhance(next.id);
        const enhanced=next.plus,baseRating=equipmentBaseRating(next);
        h.consumables.power_tier_reroll=1;rerollEquipmentPowerTier(next.id);
        const rerolled=h.consumables.power_tier_reroll===0&&next.plus===15&&next.affix[1].type===15;
        const saveResult=save(),packed=structuredClone(packParty()),beforeLoad=stats(h),gearJSON=JSON.stringify(next),summary=equipmentTotalSummaryText(next);
        loadParty(packed);
        const loaded=state.bag.find(x=>x.id===next.id);
        return {comparison,previewText,unchanged,worn,before,after,enhanced,baseRating,rerolled,saveResult,gearEqual:JSON.stringify(loaded)===gearJSON,statsEqual:JSON.stringify(stats(state))===JSON.stringify(beforeLoad),summaryEqual:equipmentTotalSummaryText(loaded)===summary,gearId:loaded.id,gearJSON,summary,stats:beforeLoad,storage:{...localStorage}};
      });
      assert.ok(out.comparison.some(x=>x.label==='攻擊力'));assert.match(out.previewText,/角色能力變化/);
      assert.ok(out.unchanged&&out.worn);assert.ok(out.after.atk>out.before.atk);
      assert.equal(out.enhanced,15);assert.equal(out.baseRating,'SSS');
      for(const key of ['rerolled','saveResult','gearEqual','statsEqual','summaryEqual'])assert.equal(out[key],true,key);
      const reopened=await openRuntime(root,'index.html',out.storage);
      try{
        const restored=await reopened.page.evaluate(id=>{continueFromTitle();const g=state.bag.find(x=>x.id===id);return {gear:JSON.stringify(g),summary:equipmentTotalSummaryText(g),stats:stats(state)};},out.gearId);
        assert.equal(restored.gear,out.gearJSON);assert.equal(restored.summary,out.summary);assert.deepEqual(restored.stats,out.stats);assert.deepEqual(reopened.errors,[]);
      }finally{await reopened.browser.close();}
    });
    await t.test('Six legacy saves keep equipment identity, character stats and source totals through round trips',async()=>{
      const issues=await r.page.evaluate(fixtures=>{
        applyBalanceConfig(structuredClone(__equipmentDefaults),{persist:false});const issues=[];
        for(const raw of fixtures){
          loadParty(structuredClone(raw));const before=party.members.map(h=>stats(h)),packed=structuredClone(packParty());
          loadParty(packed);
          if(JSON.stringify(party.members.map(h=>stats(h)))!==JSON.stringify(before))issues.push('stats '+state.lv);
          for(const g of state.bag){const ledger=equipmentStatContributions(g);for(const k of ['hp','atk','def','speed'])if(ledger.rows.reduce((n,row)=>n+row.stats[k],0)!==ledger.total[k])issues.push('source '+g.id);}
        }
        return issues;
      },legacy);
      assert.deepEqual(issues,[]);
    });
    assert.deepEqual(r.errors,[]);
  }finally{await r.browser.close();}
});
