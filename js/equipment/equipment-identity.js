
/* Equipment identity v2.
   Normal gear: prefix + suffix + base + hidden T grade.
   - Raw ATK/HP/DEF comes from the base form and T grade; prefix/suffix never add raw base stats.
   - Prefix/suffix each carry one explicit gameplay effect.
   Boss gear: no prefix/suffix and no random reroll affixes; one boss-exclusive profile supplies exactly three fixed effects.
*/
(()=>{
  const clone=v=>JSON.parse(JSON.stringify(v));
  const POWER_ITEM_TYPE='gearTierReroll';
  const POWER_ITEM_ID='power_tier_reroll';
  const VALID_ELEMENTS=new Set(['physical','fire','ice','wind','light','shadow']);
  const REGULAR_EFFECT_KEYS=new Set(['basicElement','basicAdvanceNextRound','attackPct','crit','critDamage','pierce','defenseIgnore','lifesteal','evasion','elementBonus','allCooldownReduction','dropRateBonus']);
  const BASE_EFFECT_KEYS=new Set([...EQUIPMENT_FIXED_EFFECT_KEYS]);
  const BOSS_EFFECT_KEYS=new Set([...REGULAR_EFFECT_KEYS,'gearAtkPct','gearHpPct','gearDefPct','bossDamagePct']);
  const EFFECT_LABELS={
    flatAttack:'固定攻擊',flatHp:'固定生命',flatDefense:'固定防禦',basicElement:'普通攻擊屬性',basicAdvanceNextRound:'普攻後下回合前移',gearAtkPct:'此裝備基礎攻擊',gearHpPct:'此裝備基礎生命',gearDefPct:'此裝備基礎防禦',
    attackPct:'攻擊力',crit:'暴擊率',critDamage:'暴擊傷害',pierce:'防禦穿透',defenseIgnore:'防禦無視',lifesteal:'生命竊取',evasion:'閃避率',elementBonus:'全屬性增傷',bossDamagePct:'對 BOSS 傷害',speed:'速度',
    allCooldownReduction:'全主動／輔助技能冷卻',dropRateBonus:'掉寶率',elementDamagePct:'屬性傷害',elementResistPct:'屬性抗性',raceDamagePct:'種族增傷',skillEffectPct:'核心技能效果',skillCooldownReduction:'核心技能冷卻／觸發'
  };
  const LEGACY_BOSS_SERIES=['古木誓約','礦脈共鳴','暮沼咒印','永凍之誓','熔核意志','隕星遺產'];
  const PARALLEL_BOSS_SERIES=['赤楓炎靈','潮汐巨像','白骨巫后','雷鳴獸王','聖所守護者','幽冥觀測者'];

  function fx(key,value){return {key,value};}
  const DEFAULT_PREFIXES=[
    {id:'redmaple',name:'赤楓',tierMin:1,tierMax:10,weight:1,slots:[0],effect:fx('basicElement','fire')},
    {id:'frostcarved',name:'霜刻',tierMin:1,tierMax:10,weight:1,slots:[0],effect:fx('basicElement','ice')},
    {id:'verdant',name:'翠影',tierMin:1,tierMax:10,weight:1,slots:[0],effect:fx('basicElement','wind')},
    {id:'radiant',name:'聖輝',tierMin:1,tierMax:10,weight:1,slots:[0],effect:fx('basicElement','light')},
    {id:'nether',name:'幽冥',tierMin:1,tierMax:10,weight:1,slots:[0],effect:fx('basicElement','shadow')},
    {id:'piercing',name:'穿甲',tierMin:1,tierMax:10,weight:1,slots:[0,1,2],effect:fx('pierce',6)},
    {id:'bloodbound',name:'血契',tierMin:3,tierMax:10,weight:.8,slots:[0],effect:fx('lifesteal',3)},
    {id:'starfall',name:'星隕',tierMin:3,tierMax:10,weight:.9,slots:[0,2],effect:fx('critDamage',12)},
    {id:'echoing',name:'回響',tierMin:4,tierMax:10,weight:.65,slots:[0,1,2],effect:fx('allCooldownReduction',1)},
    {id:'seeker',name:'尋珍',tierMin:4,tierMax:10,weight:.7,slots:[0,1,2],effect:fx('dropRateBonus',8)},
    {id:'arcane',name:'秘能',tierMin:5,tierMax:10,weight:.7,slots:[0,1,2],effect:fx('elementBonus',8)},
    {id:'keen',name:'銳眼',tierMin:5,tierMax:10,weight:.7,slots:[0,2],effect:fx('crit',5)}
  ];
  const DEFAULT_SUFFIXES=[
    {id:'traveler',name:'旅人',tierMin:1,tierMax:10,weight:1,slots:[0],effect:fx('basicAdvanceNextRound',1)},
    {id:'vanguard',name:'先鋒',tierMin:1,tierMax:10,weight:1,slots:[0,1,2],effect:fx('attackPct',4)},
    {id:'swift',name:'迅捷',tierMin:1,tierMax:10,weight:1,slots:[0,1,2],effect:fx('evasion',5)},
    {id:'eagleeye',name:'鷹眼',tierMin:2,tierMax:10,weight:1,slots:[0,2],effect:fx('crit',4)},
    {id:'breaker',name:'破城',tierMin:2,tierMax:10,weight:.9,slots:[0,2],effect:fx('pierce',6)},
    {id:'leeching',name:'汲血',tierMin:3,tierMax:10,weight:.75,slots:[0],effect:fx('lifesteal',3)},
    {id:'resonant',name:'共鳴',tierMin:3,tierMax:10,weight:.75,slots:[0,1,2],effect:fx('elementBonus',7)},
    {id:'quickcast',name:'疾詠',tierMin:4,tierMax:10,weight:.6,slots:[0,1,2],effect:fx('allCooldownReduction',1)},
    {id:'hunter',name:'獵手',tierMin:4,tierMax:10,weight:.7,slots:[0,1,2],effect:fx('dropRateBonus',7)},
    {id:'fury',name:'狂擊',tierMin:5,tierMax:10,weight:.7,slots:[0,2],effect:fx('critDamage',12)},
    {id:'assault',name:'強襲',tierMin:5,tierMax:10,weight:.65,slots:[0,1,2],effect:fx('attackPct',5)},
    {id:'phantom',name:'幻步',tierMin:5,tierMax:10,weight:.65,slots:[0,1,2],effect:fx('evasion',6)}
  ];

  const FAMILY_BOSS_EFFECTS=[
    [fx('gearAtkPct',10),fx('lifesteal',4),fx('bossDamagePct',8)],
    [fx('gearDefPct',12),fx('pierce',8),fx('allCooldownReduction',1)],
    [fx('gearHpPct',12),fx('basicElement','shadow'),fx('evasion',6)],
    [fx('gearAtkPct',10),fx('basicElement','ice'),fx('critDamage',18)],
    [fx('gearHpPct',12),fx('basicElement','fire'),fx('elementBonus',10)],
    [fx('gearAtkPct',15),fx('crit',7),fx('bossDamagePct',12)]
  ];
  function boostedEffect(effect,high,parallel){
    const out=clone(effect);
    if(typeof out.value==='number'){
      if(out.key==='allCooldownReduction')out.value=Math.min(2,out.value+(high?1:0));
      else out.value=Number((out.value*(high?1.35:1)*(parallel?1.08:1)).toFixed(2));
    }
    return out;
  }
  function makeBossProfiles(group,names,high=false){
    return names.map((baseName,family)=>({
      id:group+'_'+(high?'high':'low')+'_'+family,group,family,high,
      name:(high?(group==='legacy'?'覺醒・':'上古・'):'')+baseName,
      effects:FAMILY_BOSS_EFFECTS[family].map(e=>boostedEffect(e,high,group==='parallel'))
    }));
  }
  const DEFAULT_BOSS_AFFIXES=[
    ...makeBossProfiles('legacy',LEGACY_BOSS_SERIES,false),
    ...makeBossProfiles('legacy',LEGACY_BOSS_SERIES,true),
    ...makeBossProfiles('parallel',PARALLEL_BOSS_SERIES,false),
    ...makeBossProfiles('parallel',PARALLEL_BOSS_SERIES,true)
  ];
  const DEFAULT_POWER={
    schemaVersion:4,
    prefixes:DEFAULT_PREFIXES,
    suffixes:DEFAULT_SUFFIXES,
    bossAffixes:DEFAULT_BOSS_AFFIXES,
    strength:{
      multipliers:[1,1.06,1.12,1.19,1.25,1.31,1.37,1.43,1.49,1.55],
      weightsByDifficulty:[
        [70,20,8,2,0,0,0,0,0,0],
        [0,0,5,20,55,15,5,0,0,0],
        [0,0,0,0,0,2,5,10,23,60]
      ]
    },
    rerollItem:{id:POWER_ITEM_ID,name:'強度重鑄石',description:'重新抽選一件裝備的 T1～T10 強度階級；抽選分布依該裝備原始掉落難度決定。',cost:0,sellPrice:80,shopEnabled:false,shopChance:.06,shopPrice:650,dropRuleInitialized:false}
  };

  function finite(v,d,min=-Infinity,max=Infinity){v=Number(v);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):d;}
  function normalizeSlots(v,def=[0,1,2,3],legacy=false){
    const out=Array.isArray(v)?[...new Set(v.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=3))]:clone(def);
    if(legacy&&out.includes(2)&&!out.includes(3))out.push(3);
    return out.length?out:clone(def);
  }
  function normalizeEffect(src,allowed,def){
    const fallback=clone(def);
    if(!src||typeof src!=='object'||Array.isArray(src)||!allowed.has(src.key))return fallback;
    const key=src.key;
    if(key==='basicElement'){
      const value=VALID_ELEMENTS.has(src.value)&&src.value!=='physical'?src.value:fallback.value;
      return {key,value};
    }
    let min=-100,max=500;
    if(key==='basicAdvanceNextRound'){min=1;max=5;}
    if(key==='allCooldownReduction'){min=0;max=5;}
    if(key==='dropRateBonus'||key==='bossDamagePct'){min=0;max=500;}
    return {key,value:finite(src.value,fallback.value,min,max)};
  }
  function normalizeAffixChances(src,legacyWeight,tierMin,tierMax){
    const fallback=finite(legacyWeight,0,0,100),has=Array.isArray(src);
    return Array.from({length:10},(_,i)=>{
      const tier=i+1,def=tier>=tierMin&&tier<=tierMax?fallback:0;
      return finite(has?src[i]:def,def,0,100);
    });
  }
  function affixChanceAtTier(x,tier){
    if(!x||tier<1||tier>10)return 0;
    const v=Array.isArray(x.chanceByTier)?x.chanceByTier[tier-1]:x.weight;
    return finite(v,0,0,100);
  }
  function normalizeAffixRows(rows,defaults,legacySlots=false){
    if(!Array.isArray(rows)||!rows.some(x=>x&&x.effect))rows=clone(defaults);
    const seen=new Set();
    const out=[];
    for(let i=0;i<rows.length;i++){
      const x=rows[i]&&typeof rows[i]==='object'?rows[i]:{};
      const d=defaults[i%defaults.length];
      let id=typeof x.id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x.id)?x.id:d.id+'_'+(i+1);
      if(seen.has(id))id=id+'_'+(i+1);seen.add(id);
      const tierMin=Math.max(1,Math.min(10,Math.round(finite(x.tierMin,d.tierMin,1,10))));
      const tierMax=Math.max(tierMin,Math.min(10,Math.round(finite(x.tierMax,d.tierMax,tierMin,10))));
      const weight=finite(x.weight,d.weight,0,100);
      const chanceByTier=normalizeAffixChances(x.chanceByTier,weight,tierMin,tierMax);
      out.push({id,name:typeof x.name==='string'&&x.name.trim()?x.name.trim():d.name,tierMin,tierMax,weight,chanceByTier,slots:normalizeSlots(x.slots,d.slots,legacySlots),effect:normalizeEffect(x.effect,REGULAR_EFFECT_KEYS,d.effect)});
    }
    return out.length?out:clone(defaults);
  }
  function normalizeBossAffixes(rows,legacySeries){
    const byId=new Map((Array.isArray(rows)?rows:[]).filter(Boolean).map(x=>[x.id,x]));
    const legacyById=new Map((Array.isArray(legacySeries)?legacySeries:[]).filter(Boolean).map(x=>[x.id,x]));
    return DEFAULT_BOSS_AFFIXES.map(def=>{
      const x=byId.get(def.id)||{};
      const legacy=legacyById.get(def.id)||{};
      const name=typeof x.name==='string'&&x.name.trim()?x.name.trim():typeof legacy.name==='string'&&legacy.name.trim()?legacy.name.trim():def.name;
      const src=Array.isArray(x.effects)?x.effects:[];
      const effects=Array.from({length:3},(_,i)=>normalizeEffect(src[i],BOSS_EFFECT_KEYS,def.effects[i]));
      const used=new Set();
      for(let i=0;i<effects.length;i++){
        if(used.has(effects[i].key)){
          const replacement=def.effects.find(d=>!used.has(d.key))||DEFAULT_BOSS_AFFIXES[0].effects.find(d=>!used.has(d.key));
          if(replacement)effects[i]=clone(replacement);
        }
        used.add(effects[i].key);
      }
      return {...def,name,effects,textStyleId:typeof x.textStyleId==='string'?x.textStyleId:''};
    });
  }
  function normalizePower(src){
    src=src&&typeof src==='object'&&!Array.isArray(src)?src:{};
    const legacySlots=Number(src.schemaVersion||0)<4,out=clone(DEFAULT_POWER);
    out.schemaVersion=4;
    out.prefixes=normalizeAffixRows(src.prefixes,DEFAULT_PREFIXES,legacySlots);
    out.suffixes=normalizeAffixRows(src.suffixes,DEFAULT_SUFFIXES,legacySlots);
    out.bossAffixes=normalizeBossAffixes(src.bossAffixes,src.seriesPrefixes);
    const st=src.strength&&typeof src.strength==='object'?src.strength:{};
    out.strength.multipliers=Array.from({length:10},(_,i)=>finite(st.multipliers?.[i],DEFAULT_POWER.strength.multipliers[i],.01,100));
    out.strength.weightsByDifficulty=Array.from({length:3},(_,d)=>Array.from({length:10},(_,i)=>finite(st.weightsByDifficulty?.[d]?.[i],DEFAULT_POWER.strength.weightsByDifficulty[d][i],0,1e9)));
    const r=src.rerollItem&&typeof src.rerollItem==='object'?src.rerollItem:{};
    out.rerollItem={id:POWER_ITEM_ID,name:typeof r.name==='string'&&r.name.trim()?r.name.trim():DEFAULT_POWER.rerollItem.name,description:typeof r.description==='string'?r.description:DEFAULT_POWER.rerollItem.description,cost:0,sellPrice:finite(r.sellPrice,80,0,1e9),shopEnabled:false,shopChance:finite(r.shopChance,.06,0,1),shopPrice:Math.round(finite(r.shopPrice,650,1,1e9)),dropRuleInitialized:!!r.dropRuleInitialized,textStyleId:typeof r.textStyleId==='string'?r.textStyleId:''};
    return out;
  }

  let EQUIPMENT_POWER=normalizePower((()=>{try{return JSON.parse(localStorage.getItem(BALANCE_KEY)||'null')?.equipmentPowerSystem;}catch{return null;}})());
  globalThis.__EMBERWILD_EQUIPMENT_POWER=EQUIPMENT_POWER;

  function normalizeBaseFormsV2(){
    for(let job=0;job<ITEM_FORMS.length;job++)for(let slot=0;slot<ITEM_FORMS[job].length;slot++)for(let i=0;i<ITEM_FORMS[job][slot].length;i++)normalizeEquipmentFormObject(ITEM_FORMS[job][slot][i]);
    const broad=ITEM_FORMS?.[0]?.[0]?.[0];
    if(broad){const hit=broad.fixedEffects?.find(e=>e.key==='gearAtkPct');if(hit&&Math.abs(Number(hit.value)-20)<.001)hit.value=5;}
  }
  normalizeBaseFormsV2();

  function rerollItemData(power=EQUIPMENT_POWER){const r=power.rerollItem;return {id:POWER_ITEM_ID,type:POWER_ITEM_TYPE,cost:0,sellPrice:r.sellPrice,duration:0,name:r.name,description:r.description,desc:r.description,shopEnabled:false,textStyleId:r.textStyleId||''};}
  function syncRerollItem(){
    const src=rerollItemData(),i=SHOP.findIndex(x=>x.id===POWER_ITEM_ID);
    if(i<0)SHOP.push(src);else Object.assign(SHOP[i],src);
    if(state?.consumables&&state.consumables[POWER_ITEM_ID]===undefined)state.consumables[POWER_ITEM_ID]=0;
    for(const h of party?.members||[])if(h?.consumables&&h.consumables[POWER_ITEM_ID]===undefined)h.consumables[POWER_ITEM_ID]=0;
  }
  syncRerollItem();

  if(typeof validateDescriptionItems==='function'){
    const identityValidateItemsBase=validateDescriptionItems;
    validateDescriptionItems=function(items){
      if(!Array.isArray(items))throw Error('道具資料無效');
      const special=items.filter(x=>x?.type===POWER_ITEM_TYPE||x?.id===POWER_ITEM_ID),base=items.filter(x=>x?.type!==POWER_ITEM_TYPE&&x?.id!==POWER_ITEM_ID);
      identityValidateItemsBase(base);
      if(special.length>1)throw Error('強度重鑄石只能有 1 筆');
      for(const x of special)if(x.id!==POWER_ITEM_ID||typeof x.name!=='string'||!x.name.trim()||typeof x.description!=='string'||!Number.isFinite(x.sellPrice)||x.sellPrice<0||Number(x.duration)!==0)throw Error('強度重鑄石資料無效');
      return items;
    };
  }

  function ensurePowerDropRule(settings=GAMEPLAY_SETTINGS){
    const r=EQUIPMENT_POWER.rerollItem;
    if(r.dropRuleInitialized)return;
    const entries=settings?.drops?.entries;if(!Array.isArray(entries))return;
    if(!entries.some(x=>x?.type==='item'&&x?.key===POWER_ITEM_ID)){
      const cat=settings?.monsters?.catalog||[],sources=cat.filter(x=>x?.enabled!==false).map(x=>x.id).filter(Boolean);
      entries.push({id:'power_tier_reroll_drop',name:r.name,enabled:true,type:'item',key:POWER_ITEM_ID,kinds:['elite','boss','final'],chanceByDifficulty:[.002,.01,.03],quantityMin:1,quantityMax:1,sources});
    }
    r.dropRuleInitialized=true;
  }
  ensurePowerDropRule();

  function validatePowerInput(raw){
    const p=normalizePower(raw);
    const checkRows=(rows,label)=>{
      const ids=new Set();
      for(const x of rows){
        if(ids.has(x.id))throw Error(label+' ID 重複：'+x.id);ids.add(x.id);
        if(!x.name||!x.slots.length||x.tierMin<1||x.tierMax>10||x.tierMax<x.tierMin||!Array.isArray(x.chanceByTier)||x.chanceByTier.length!==10||x.chanceByTier.some(v=>!Number.isFinite(v)||v<0||v>100))throw Error(label+'資料無效：'+x.id);
        if(!REGULAR_EFFECT_KEYS.has(x.effect.key))throw Error(label+'效果無效：'+x.id);
      }
      for(let tier=1;tier<=10;tier++)for(let slot=0;slot<4;slot++){
        const total=rows.filter(x=>tier>=x.tierMin&&tier<=x.tierMax&&x.slots.includes(slot)).reduce((n,x)=>n+affixChanceAtTier(x,tier),0);
        if(total>100+1e-9)throw Error(label+' T'+tier+' '+['武器','護甲','副手','飾品'][slot]+'機率合計超過 100%');
      }
    };
    checkRows(p.prefixes,'前綴');checkRows(p.suffixes,'後綴');
    if(p.bossAffixes.length!==DEFAULT_BOSS_AFFIXES.length)throw Error('BOSS 專屬詞綴資料不完整');
    for(const x of p.bossAffixes){
      if(!Array.isArray(x.effects)||x.effects.length!==3)throw Error('BOSS 專屬詞綴必須正好 3 條：'+x.id);
      const keys=x.effects.map(e=>e.key);
      if(new Set(keys).size!==3||keys.some(k=>!BOSS_EFFECT_KEYS.has(k)))throw Error('BOSS 專屬詞綴三條屬性必須有效且互不重複：'+x.id);
    }
    return p;
  }

  if(typeof exportableBalance==='function'){
    const identityExportBase=exportableBalance;
    exportableBalance=function(){
      normalizeBaseFormsV2();syncRerollItem();
      const out=identityExportBase();
      out.equipmentPowerSystem=clone(EQUIPMENT_POWER);
      if(Array.isArray(out.items)&&!out.items.some(x=>x.id===POWER_ITEM_ID))out.items.push(rerollItemData());
      out._reference??={};out._reference.equipmentIdentity={
        naming:'一般裝備名稱 = 前綴 + 後綴 + 基底；前綴或後綴可為空；BOSS 裝備只使用 BOSS 專屬名稱。',
        stats:'一般裝備 ATK/HP/DEF 只由基底、T1~T10 與既有 +N 強化計算；前後綴不提供 raw ATK/HP/DEF。',
        affixChance:'prefixes / suffixes 的 chanceByTier[0..9] 分別代表 T1～T10 的實際百分比機率（0~100）；同一 T 級與部位合計不足 100% 時，剩餘機率為無該類詞綴。舊版 weight 只作匯入相容。',
        boss:'BOSS 專屬裝備沒有前後綴與隨機洗鍊詞條；bossAffixes 每筆固定 3 條效果。',
        effects:[...BOSS_EFFECT_KEYS]
      };
      out.notes=[...(out.notes||[]),'equipmentPowerSystem schemaVersion=4：prefixes / suffixes 各一條效果；chanceByTier[0..9] 分別控制 T1～T10 實際百分比機率，舊版 weight 會自動轉入有效 T 級。','同一 T 級與部位的前綴／後綴機率池各自以 100% 為上限；不足 100% 的剩餘機率會生成無前綴／無後綴裝備。','一般裝備 raw ATK/HP/DEF 不受前後綴影響；由 equipmentForms 基底、T 階級與既有強化計算。','BOSS 專屬裝備不抽前後綴，也不使用隨機洗鍊詞條。'];
      return out;
    };
  }
  if(typeof applyBalanceConfig==='function'){
    const identityApplyBase=applyBalanceConfig;
    applyBalanceConfig=function(input,{persist=true}={}){
      const copy=clone(input);
      const nextPower=validatePowerInput(copy.equipmentPowerSystem);
      if(!Array.isArray(copy.items))copy.items=[];
      const item=rerollItemData(nextPower),idx=copy.items.findIndex(x=>x?.id===POWER_ITEM_ID||x?.type===POWER_ITEM_TYPE);
      if(idx<0)copy.items.push(item);else copy.items[idx]={...copy.items[idx],...item};
      copy.equipmentPowerSystem=clone(nextPower);
      // Validate the complete candidate before changing the live equipment rules.
      validateDescriptionItems(normalizeDescriptionBalance(copy).items);validateBalanceConfig(copy);
      EQUIPMENT_POWER=nextPower;globalThis.__EMBERWILD_EQUIPMENT_POWER=EQUIPMENT_POWER;
      syncRerollItem();ensurePowerDropRule(copy.balanceSettings);copy.equipmentPowerSystem=clone(EQUIPMENT_POWER);
      const out=identityApplyBase(copy,{persist:false});
      normalizeBaseFormsV2();syncRerollItem();normalizeAllGearIdentity();
      if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));
      if(state){for(const h of party?.members||[state])withHero(h,clampVitals);render();}
      return out;
    };
  }
  if(typeof validateBalanceConfig==='function'){
    const identityValidateBalanceBase=validateBalanceConfig;
    validateBalanceConfig=function(input){const copy=clone(input);copy.equipmentPowerSystem=validatePowerInput(copy.equipmentPowerSystem);return identityValidateBalanceBase(copy);};
  }

  function prefixById(id){return EQUIPMENT_POWER.prefixes.find(x=>x.id===id)||null;}
  function suffixById(id){return EQUIPMENT_POWER.suffixes.find(x=>x.id===id)||null;}
  function eligibleRows(rows,tier,slot){return rows.filter(x=>tier>=x.tierMin&&tier<=x.tierMax&&affixChanceAtTier(x,tier)>0&&x.slots.includes(slot));}
  function deterministicRow(rows,tier,slot,offset=0){const eligible=eligibleRows(rows,tier,slot);return eligible.length?eligible[(Math.max(1,Number(tier)||1)+slot+offset)%eligible.length]:null;}
  function rollWeighted(rows){const total=rows.reduce((n,x)=>n+Math.max(0,Number(x.weight)||0),0);if(total<=0)return rows[0]||null;let r=Math.random()*total;for(const x of rows){r-=Math.max(0,Number(x.weight)||0);if(r<=0)return x;}return rows.at(-1)||null;}
  function rollNamedAffix(rows,tier,slot){const eligible=eligibleRows(rows,tier,slot);let r=Math.random()*100;for(const x of eligible){r-=affixChanceAtTier(x,tier);if(r<0)return x;}return null;}
  function bossProfileId(g){const group=MAPS[g?.region]?.parallel?'parallel':'legacy',family=Math.max(0,Math.min(5,Number(g?.boss)||0)),high=(Number(g?.tier)||1)>6;return group+'_'+(high?'high':'low')+'_'+family;}
  function bossProfileForGear(g){if(!g||g.boss===undefined)return null;const id=bossProfileId(g);return EQUIPMENT_POWER.bossAffixes.find(x=>x.id===id)||DEFAULT_BOSS_AFFIXES.find(x=>x.id===id)||null;}
  function strengthAnchor(mode){return mode===2?10:mode===1?5:1;}
  function rollStrengthTier(mode){mode=Math.max(0,Math.min(2,Number(mode)||0));const w=EQUIPMENT_POWER.strength.weightsByDifficulty[mode]||[],rows=Array.from({length:10},(_,i)=>({tier:i+1,weight:Number(w[i])||0})),hit=rollWeighted(rows);return hit?.tier||strengthAnchor(mode);}
  function strengthMultiplier(g){const t=Math.max(1,Math.min(10,Number(g?.powerTier)||strengthAnchor(g?.difficulty)));return Number(EQUIPMENT_POWER.strength.multipliers[t-1])||1;}

  function ensureGearIdentityMeta(g,{freshNames=false,freshPower=false,mode=null}={}){
    if(!g||typeof g!=='object'||g.slot===undefined)return g;
    const sourceMode=mode===null?Math.max(0,Math.min(2,Number(g.difficulty)||0)):Math.max(0,Math.min(2,Number(mode)||0));
    if(freshPower||!Number.isInteger(g.powerTier)||g.powerTier<1||g.powerTier>10)g.powerTier=freshPower?rollStrengthTier(sourceMode):strengthAnchor(sourceMode);
    const tier=Math.max(1,Math.min(10,Number(g.powerTier)||strengthAnchor(sourceMode))),slot=Math.max(0,Math.min(2,Number(g.slot)||0));
    if(g.boss===undefined){
      const hasPrefix=Object.prototype.hasOwnProperty.call(g,'prefixId'),hasSuffix=Object.prototype.hasOwnProperty.call(g,'suffixId');
      if(freshNames||!hasPrefix||(g.prefixId!==''&&(!prefixById(g.prefixId)||!prefixById(g.prefixId).slots.includes(slot))))g.prefixId=(freshNames?rollNamedAffix(EQUIPMENT_POWER.prefixes,tier,slot):deterministicRow(EQUIPMENT_POWER.prefixes,tier,slot,0))?.id||'';
      if(freshNames||!hasSuffix||(g.suffixId!==''&&(!suffixById(g.suffixId)||!suffixById(g.suffixId).slots.includes(slot))))g.suffixId=(freshNames?rollNamedAffix(EQUIPMENT_POWER.suffixes,tier,slot):deterministicRow(EQUIPMENT_POWER.suffixes,tier,slot,3))?.id||'';
    }else{
      g.prefixId='';g.suffixId='';g.affix=[];delete g.affixLock;
      g.bossQualityRank=Math.max(0,Math.min(3,Number(GS('equipment.boss.affixRankByDifficulty',[2,2,3])[g.difficulty||0])||2));
    }
    return g;
  }
  function allKnownGear(){const out=[];for(const h of party?.members||[])for(const g of h?.bag||[])out.push(g);if(state&&!party?.members?.includes(state))for(const g of state.bag||[])out.push(g);if(Array.isArray(globalThis.pendingGearLoot))out.push(...globalThis.pendingGearLoot);else if(typeof pendingGearLoot!=='undefined'&&Array.isArray(pendingGearLoot))out.push(...pendingGearLoot);return [...new Map(out.filter(Boolean).map(g=>[g.id,g])).values()];}
  function normalizeAllGearIdentity(){for(const g of allKnownGear()){ensureGearIdentityMeta(g);g.name=gearName(g);}}

  function baseFormForGear(g){return g&&g.boss===undefined&&Number.isInteger(g.form)?itemForm(g):null;}
  function baseEffectEntries(g){
    const form=baseFormForGear(g);if(!form)return [];
    normalizeEquipmentFormObject(form);
    return (form.fixedEffects||[]).map(e=>({...e,source:'base'}));
  }
  function identityEffectEntriesForGear(g){
    ensureGearIdentityMeta(g);
    if(g.boss!==undefined)return (bossProfileForGear(g)?.effects||[]).map(e=>({...e,source:'boss'}));
    const out=baseEffectEntries(g),p=prefixById(g.prefixId),s=suffixById(g.suffixId);
    if(p?.effect)out.push({...p.effect,source:'prefix'});
    if(s?.effect)out.push({...s.effect,source:'suffix'});
    return out;
  }
  function identityEffectsForHero(h){return equipment(h).flatMap(identityEffectEntriesForGear);}
  function effectNumberForHero(h,key){return identityEffectsForHero(h).filter(e=>e.key===key).reduce((n,e)=>n+(Number(e.value)||0),0);}

  function effectText(effect){
    if(!effect)return '無效果';
    const key=effect.key,value=effect.value,label=EFFECT_LABELS[key]||key;
    if(key==='basicElement')return '普通攻擊改為'+(ELEMENTS[value]||value)+'屬性';
    if(key==='basicAdvanceNextRound')return '普攻後，下回合行動往前 '+Math.round(Number(value)||0)+' 格';
    if(key==='allCooldownReduction'||key==='skillCooldownReduction')return (key==='skillCooldownReduction'?'核心技能 '+((effect.skill??0)+1)+' ':'')+label+' −'+Number(value)+' 回合';
    if(['flatAttack','flatHp','flatDefense','pierce','speed'].includes(key))return label+' '+(Number(value)>=0?'+':'')+Number(value);
    if(key==='elementDamagePct')return (ELEMENTS[effect.element]||effect.element)+' '+label+' '+(Number(value)>=0?'+':'')+Number(value)+'%';
    if(key==='elementResistPct')return (ELEMENTS[effect.element]||effect.element)+' '+label+' '+(Number(value)>=0?'+':'')+Number(value)+'%';
    if(key==='raceDamagePct')return '對'+(RACES[effect.race]||effect.race)+' '+label+' '+(Number(value)>=0?'+':'')+Number(value)+'%';
    if(key==='skillEffectPct')return '核心技能 '+((effect.skill??0)+1)+' '+label+' '+(Number(value)>=0?'+':'')+Number(value)+'%';
    return label+' '+(Number(value)>=0?'+':'')+Number(value)+'%';
  }
  globalThis.equipmentIdentityEffectText=effectText;

  const identityGearNameBase=gearName;
  const identityEquipmentDisplayBase=equipmentDisplayName;
  gearName=function(g){
    if(!g||g.slot===undefined)return identityGearNameBase(g);
    ensureGearIdentityMeta(g);
    const body=g.boss===undefined?(baseFormForGear(g)?.name||CLASS_GEAR[g.job??state?.job??0]?.[g.slot]||'裝備'):(CLASS_GEAR[g.job??state?.job??0]?.[g.slot]||'裝備');
    if(g.boss!==undefined)return (bossProfileForGear(g)?.name||'BOSS專屬')+body;
    return (prefixById(g.prefixId)?.name||'')+(suffixById(g.suffixId)?.name||'')+body;
  };
  equipmentDisplayName=function(g){if(!g||g.slot===undefined)return identityEquipmentDisplayBase(g);ensureGearIdentityMeta(g);return '+'+(g.plus||0)+' '+gearName(g);};

  const identityGearFactoryBase=gear;
  gear=function(tier=1,slot=rand(4),rar=0,job=null){const g=identityGearFactoryBase(tier,slot,rar,job);ensureGearIdentityMeta(g,{freshNames:true,freshPower:true,mode:0});g.name=gearName(g);return g;};
  const identityModeAffixesBase=modeAffixes;
  modeAffixes=function(g,mode){const out=identityModeAffixesBase(g,mode);if(g){g.difficulty=Math.max(0,Math.min(2,Number(mode)||0));ensureGearIdentityMeta(g,{freshNames:true,freshPower:true,mode:g.difficulty});g.name=gearName(g);}return out;};
  const identityBossGearBase=bossGear;
  bossGear=function(mi,job=state.job,mode=state.difficulty||0){const g=identityBossGearBase(mi,job,mode);g.affix=[];delete g.affixLock;ensureGearIdentityMeta(g,{freshPower:true,mode});g.name=gearName(g);return g;};

  const identityQualityBase=gearQualityRank;
  gearQualityRank=function(g){if(g?.boss!==undefined)return Math.max(0,Math.min(3,Number(g.bossQualityRank??GS('equipment.boss.affixRankByDifficulty',[2,2,3])[g.difficulty||0])||2));return identityQualityBase(g);};

  bossPower=function(){return 1;};
  function rawTierStats(g){const tier=Math.max(1,Number(g?.tier)||1),atkPer=g.slot===2?GS('equipment.baseStats.offhandAttackPerTier',GS('equipment.baseStats.accessoryAttackPerTier',4)):GS('equipment.baseStats.accessoryAttackPerTier',4),hpPer=g.slot===2?GS('equipment.baseStats.offhandHpPerTier',GS('equipment.baseStats.accessoryHpPerTier',20)):GS('equipment.baseStats.accessoryHpPerTier',20);return {atk:g.slot===0?tier*GS('equipment.baseStats.weaponAttackPerTier',11):[2,3].includes(g.slot)?tier*atkPer:0,hp:g.slot===1?tier*GS('equipment.baseStats.armorHpPerTier',45):[2,3].includes(g.slot)?tier*hpPer:0,def:g.slot===1?tier*GS('equipment.baseStats.armorDefensePerTier',4):0};}
  function statAdd(a,b){return {atk:(a.atk||0)+(b.atk||0),hp:(a.hp||0)+(b.hp||0),def:(a.def||0)+(b.def||0)};}
  function statMul(a,m){return {atk:(a.atk||0)*m,hp:(a.hp||0)*m,def:(a.def||0)*m};}
  function baseStatPct(g,key){
    const effects=g.boss!==undefined?(bossProfileForGear(g)?.effects||[]):baseEffectEntries(g);
    return effects.filter(e=>e.key===key).reduce((n,e)=>n+(Number(e.value)||0),0);
  }
  function gearStatBreakdown(g){
    ensureGearIdentityMeta(g);
    const raw=rawTierStats(g);
    const base={atk:raw.atk*(1+baseStatPct(g,'gearAtkPct')/100),hp:raw.hp*(1+baseStatPct(g,'gearHpPct')/100),def:raw.def*(1+baseStatPct(g,'gearDefPct')/100)};
    const mult=strengthMultiplier(g),grade=statMul(base,mult-1),graded=statAdd(base,grade),enhance=statMul(graded,(g.plus||0)*GS('equipment.enhance.statPerLevel',.12)),total=statAdd(graded,enhance);
    return {raw,body:base,grade,enhance,total,mult,powerTier:g.powerTier||1,prefix:prefixById(g.prefixId),suffix:suffixById(g.suffixId),bossProfile:bossProfileForGear(g)};
  }
  globalThis.gearStatBreakdown=gearStatBreakdown;
  gearBaseStats=function(g){return gearStatBreakdown(g).total;};

  function applyIdentityStatEffect(v,e,attackBox){
    const n=Number(e.value)||0;
    if(e.key==='attackPct')attackBox.value+=n;
    else if(e.key==='crit')v.crit+=n/100;
    else if(e.key==='critDamage')v.critDamage+=n/100;
    else if(e.key==='pierce')v.pierce+=n;
    else if(e.key==='defenseIgnore')v.defenseIgnore+=n/100;
    else if(e.key==='lifesteal')v.lifesteal+=n/100;
    else if(e.key==='evasion')v.evasion+=n/100;
    else if(e.key==='elementBonus')v.elementBonus+=n/100;
    else if(e.key==='bossDamagePct')v.bossDamage+=n/100;
  }
  stats=function(h=state){
    const cls=CLASSES[h.job],initial=typeof globalThis.classInitialStats==='function'?classInitialStats(cls,h.job):{hp:cls.hp,atk:cls.atk,def:cls.def,crit:h.job===2?GS('progression.baseCrit.archer',.17):GS('progression.baseCrit.default',.07),critDamage:GS('combat.baseCritDamage',1.5)},growth=typeof globalThis.classGrowthPerLevel==='function'?classGrowthPerLevel(cls):{hp:GS('progression.statsPerLevel.hp',20),atk:GS('progression.statsPerLevel.attack',4),def:GS('progression.statsPerLevel.defense',2),crit:0,critDamage:0},v={hp:initial.hp+(h.lv-1)*growth.hp+h.stats[1]*GS('progression.statsPerPoint.hp',12),atk:initial.atk+(h.lv-1)*growth.atk+h.stats[0]*GS('progression.statsPerPoint.attack',2),def:initial.def+(h.lv-1)*growth.def+h.stats[2]*GS('progression.statsPerPoint.defense',1.3),crit:initial.crit+(h.lv-1)*growth.crit,critDamage:initial.critDamage+(h.lv-1)*growth.critDamage,pierce:0,defenseIgnore:0,lifesteal:0,evasion:0,elementBonus:0,bossDamage:0,elementDamage:{},raceDamage:{},resist:{}};
    if(h.advanced){v.hp*=GS('progression.advance.hpMultiplier',1.18);v.atk*=GS('progression.advance.attackMultiplier',1.22);v.def*=GS('progression.advance.defenseMultiplier',1.15);}
    const attackBox={value:0};let fixedSpeed=0;
    for(const g of equipment(h)){
      const base=gearBaseStats(g);v.atk+=base.atk;v.hp+=base.hp;v.def+=base.def;
      for(const e of identityEffectEntriesForGear(g)){
        const n=Number(e.value)||0;
        if(e.key==='flatAttack')v.atk+=n;
        else if(e.key==='flatHp')v.hp+=n;
        else if(e.key==='flatDefense')v.def+=n;
        else if(e.key==='speed')fixedSpeed+=n;
        else if(e.key==='elementDamagePct'&&e.element)v.elementDamage[e.element]=(v.elementDamage[e.element]||0)+n/100;
        else if(e.key==='elementResistPct'&&e.element)v.resist[e.element]=(v.resist[e.element]||0)+n/100;
        else if(e.key==='raceDamagePct'&&e.race)v.raceDamage[e.race]=(v.raceDamage[e.race]||0)+n/100;
        else if(!['gearAtkPct','gearHpPct','gearDefPct','basicElement','basicAdvanceNextRound','allCooldownReduction','dropRateBonus','skillEffectPct','skillCooldownReduction'].includes(e.key))applyIdentityStatEffect(v,e,attackBox);
      }
      for(const a0 of g.affix||[]){
        const a=convertLegacyManaAffix(a0,g);
        if(a.type<=3){const key=['atk','hp','def','crit'][a.type];v[key]+=a.value/(key==='crit'?100:1);}
        else if(a.type===6)v.critDamage+=a.value/100;
        else if(a.type===7)v.pierce+=a.value;
        else if(a.type===8)v.lifesteal+=a.value/100;
        else if(a.type===9)v.evasion+=a.value/100;
        else if(a.type===12)v.elementDamage[a.element]=(v.elementDamage[a.element]||0)+a.value/100;
        else if(a.type===13)v.raceDamage[a.race]=(v.raceDamage[a.race]||0)+a.value/100;
        else if(a.type===14)v.resist[a.element]=(v.resist[a.element]||0)+a.value/100;
        else if(a.type===15)attackBox.value+=a.value;
        else if(a.type===18)v.defenseIgnore+=a.value/100;
      }
    }
    if(attackBox.value)v.atk*=1+attackBox.value/100;
    v.crit=Math.min(GAME_BALANCE.combat.statCaps.crit,v.crit);v.pierce=Math.min(GAME_BALANCE.combat.statCaps.pierce,v.pierce);v.defenseIgnore=Math.min(GAME_BALANCE.combat.statCaps.defenseIgnore??.75,v.defenseIgnore);v.evasion=Math.min(GAME_BALANCE.combat.statCaps.evasion,v.evasion);v.lifesteal=Math.min(GAME_BALANCE.combat.statCaps.lifesteal,v.lifesteal);
    const heroBase=GS('combat.speed.heroBase',[102,108,116,96]);v.speed=Math.round((heroBase[h.job]??100)+h.lv*GS('combat.speed.heroPerLevel',.5)+Math.min(GS('combat.speed.bonusCap',5),(v.evasion||0)*GS('combat.speed.evasionWeight',10)+(v.crit||0)*GS('combat.speed.critWeight',5))+fixedSpeed);
    for(const k of ['hp','atk','def'])v[k]=Math.round(v[k]);
    return v;
  };
  solo.stats=stats;

  weaponElement=function(h){
    const imbue=activeSupply(h,'imbue');if(imbue&&VALID_ELEMENTS.has(imbue.element))return imbue.element;
    const ordered=[...equipment(h)].sort((a,b)=>a.slot-b.slot);
    for(const g of ordered){const hit=identityEffectEntriesForGear(g).find(e=>e.key==='basicElement'&&VALID_ELEMENTS.has(e.value));if(hit)return hit.value;}
    return 'physical';
  };
  function basicAdvanceSteps(h){return Math.max(0,Math.min(5,Math.round(effectNumberForHero(h,'basicAdvanceNextRound'))));}
  const identityInitiativeOrderBase=initiativeOrder;
  initiativeOrder=function(){
    const order=identityInitiativeOrderBase();
    for(let i=1;i<order.length;i++){
      const u=order[i];if(u.side!=='hero')continue;
      const h=u.actor,basic=h.basicAdvanceRound===round?basicAdvanceSteps(h):0,proc=h.procAdvanceRound===round?Math.max(0,Math.min(5,Number(h.procAdvanceSteps)||0)):0,steps=Math.min(5,basic+proc);
      if(steps){const to=Math.max(0,i-steps);if(to!==i){order.splice(i,1);order.splice(to,0,u);}}
      if(proc){delete h.procAdvanceRound;delete h.procAdvanceSteps;}
    }
    return order;
  };
  const identityPerformHeroBasicBase=performHeroBasic;
  performHeroBasic=function(h){const out=identityPerformHeroBasicBase(h),steps=basicAdvanceSteps(h);if(steps)h.basicAdvanceRound=round+1;else delete h.basicAdvanceRound;return out;};
  const identityResetEncounterBase=resetEncounter;
  resetEncounter=function(){for(const h of party?.members||[]){delete h.basicAdvanceRound;delete h.procAdvanceRound;delete h.procAdvanceSteps;delete h.nextActiveDamageBonus;}return identityResetEncounterBase();};

  function fixedSkillEffectNumber(h,key,i){return identityEffectsForHero(h).filter(e=>e.key===key&&Number(e.skill)===Number(i)).reduce((n,e)=>n+(Number(e.value)||0),0);}
  const identitySkillPowerBase=skillPower;
  skillPower=function(i,h=state){return identitySkillPowerBase(i,h)*(1+fixedSkillEffectNumber(h,'skillEffectPct',i)/100);};
  const identitySkillCooldownBase=skillCooldown;
  skillCooldown=function(i,h=state){const base=identitySkillCooldownBase(i,h),sk=CLASSES[h.job]?.skills?.[i],n=Math.max(0,Math.round(fixedSkillEffectNumber(h,'skillCooldownReduction',i)));return sk?.[1]==='active'?Math.max(GAME_BALANCE.combat.minimumActiveCooldown,base-n):base;};
  const identityProcChanceBase=procChance;
  procChance=function(i,h=state){const base=identityProcChanceBase(i,h),sk=CLASSES[h.job]?.skills?.[i],n=Math.max(0,fixedSkillEffectNumber(h,'skillCooldownReduction',i));return sk?.[1]==='proc'?Math.min(GAME_BALANCE.combat.statCaps.crit,base+n*(GAME_BALANCE.affixes.procChancePerPointPercent/100)):base;};

  const identityAllCdBase=allSkillCooldownReduction;
  allSkillCooldownReduction=function(h=state){return identityAllCdBase(h)+Math.max(0,Math.round(effectNumberForHero(h,'allCooldownReduction')));};
  heroDropRateBonus=function(h){const random=(equipment(h).flatMap(g=>g.affix||[]).filter(a=>a.type===17).reduce((n,a)=>n+(Number(a.value)||0),0))/100;return random+Math.max(0,effectNumberForHero(h,'dropRateBonus'))/100;};
  partyDropRateBonus=function(){const hs=party?heroes():(state?[state]:[]);return hs.reduce((n,h)=>n+heroDropRateBonus(h),0);};

  const identityResolveHitBase=resolveHit;
  resolveHit=function(e,amount,h,element,crit){
    const bonus=(e?.kind==='boss'||e?.kind==='final')?(battleStats(h).bossDamage||0):0;
    return identityResolveHitBase(e,amount*(1+bonus),h,element,crit);
  };

  function sourceDifficulty(g){return MODES[Math.max(0,Math.min(2,Number(g?.difficulty)||0))]?.name||'普通';}
  function statText(v){const labels={atk:'攻擊',hp:'生命',def:'防禦'},parts=[];for(const k of ['atk','hp','def'])if(Math.abs(Number(v?.[k])||0)>.00001)parts.push(labels[k]+' '+((Number(v[k])>=0)?'+':'')+Math.round(v[k]));return parts.join(' / ')||'無數值';}
  globalThis.equipmentTotalSummaryText=function(g){return statText(gearStatBreakdown(g).total);};
  globalThis.equipmentAttributeDetailsHTML=function(g,options={}){
    if(!g)return '';
    ensureGearIdentityMeta(g);
    const b=gearStatBreakdown(g),lines=[],form=baseFormForGear(g),
      push=(label,text,cls='')=>lines.push('<div class="equipment-attribute-line '+cls+'"><b>'+esc(label)+'</b><span>'+esc(text)+'</span></div>'),
      pushRaw=(label,html,cls='')=>lines.push('<div class="equipment-attribute-line '+cls+'"><b>'+esc(label)+'</b><span>'+html+'</span></div>');

    push('基底數值',statText(b.body));
    const baseEffects=baseEffectEntries(g);
    if(baseEffects.length)baseEffects.forEach((effect,i)=>push('基底效果'+(baseEffects.length>1?' '+(i+1):''),effectText(effect)));

    if(g.boss===undefined){
      const p=prefixById(g.prefixId),s=suffixById(g.suffixId);
      push('前綴加成',p?(p.name+' · '+effectText(p.effect)):'無');
      push('後綴加成',s?(s.name+' · '+effectText(s.effect)):'無');
      const affixes=Array.isArray(g.affix)?g.affix:[];
      for(let i=0;i<2;i++){
        const a=affixes[i];
        if(a)pushRaw('詞綴加成 '+(i+1),affixHTML(a,g));
        else push('詞綴加成 '+(i+1),'無');
      }
    }else{
      const profile=b.bossProfile;
      (profile?.effects||[]).forEach((effect,i)=>push('BOSS 專屬 '+(i+1),effectText(effect)));
    }

    push('強度 T'+b.powerTier+'（'+sourceDifficulty(g)+'來源 · ×'+Number(b.mult.toFixed(3))+'）',statText(b.grade));
    push('強化 +'+(g.plus||0),statText(b.enhance));

    let summaryRows='';
    if(g.boss===undefined){
      const affixes=Array.isArray(g.affix)?g.affix:[];
      summaryRows=[0,1].map(i=>'<div class="equipment-affix-summary-line">'+(affixes[i]?affixHTML(affixes[i],g):'<span class="affix effect-quality-0">[無] 無詞綴</span>')+'</div>').join('');
    }else{
      const profile=b.bossProfile;
      summaryRows=(profile?.effects||[]).map(effect=>'<div class="equipment-affix-summary-line"><span class="affix">[專屬] '+esc(effectText(effect))+'</span></div>').join('');
    }

    const summaryBlock='<div class="equipment-affix-summary">'+summaryRows+'</div>';
    const detailBlock='<details class="equipment-attribute-details"><summary>'+esc(options.summary||'裝備數值詳細')+'</summary><div class="equipment-attribute-list">'+lines.join('')+'</div></details>';
    const wearable=typeof gearWearableJobsText==='function'?gearWearableJobsText(g):'無';
    const wearabilityBlock='<div class="equipment-wearable-inline"><b>可穿戴職業：</b><span>'+esc(wearable)+'</span></div>';
    return summaryBlock+detailBlock+wearabilityBlock;
  };
  if(!document.getElementById('equipment-effect-summary-style')){
    const style=document.createElement('style');
    style.id='equipment-effect-summary-style';
    style.textContent='.equipment-affix-summary{display:grid;gap:3px;margin:5px 0 7px}.equipment-affix-summary-line{min-height:20px}.equipment-affix-summary-line .affix{display:inline;font-size:12px;line-height:1.55}.equipment-wearable-inline{display:flex;gap:6px;align-items:baseline;margin-top:6px;font-size:12px}.equipment-wearable-inline b{color:var(--muted);font-weight:700}.equipment-wearable-inline span{color:var(--text)}';
    document.head.appendChild(style);
  }
  exclusiveEquipmentText=function(g){
    const out=[];if(!g)return out;
    if(g.boss!==undefined){for(const e of bossProfileForGear(g)?.effects||[])out.push(effectText(e));return out;}
    for(const e of baseEffectEntries(g))out.push(effectText(e));
    const p=prefixById(g.prefixId),s=suffixById(g.suffixId);if(p)out.push('前綴 '+p.name+'：'+effectText(p.effect));if(s)out.push('後綴 '+s.name+'：'+effectText(s.effect));
    return out;
  };
  gearDesc=function(g){return globalThis.equipmentTotalSummaryText(g)+(exclusiveEquipmentText(g).length?' / '+exclusiveEquipmentText(g).join('、'):'');};

  const identityRerollBase=reroll;
  reroll=function(id){const g=findGear(id);if(g?.boss!==undefined)return toast('BOSS 專屬裝備固定三條專屬詞綴，不能洗鍊隨機詞條');return identityRerollBase(id);};
  const identityAutoRerollBase=autoReroll;
  autoReroll=function(id,targetRank){const g=findGear(id);if(g?.boss!==undefined)return toast('BOSS 專屬裝備不能自動洗鍊');return identityAutoRerollBase(id,targetRank);};

  const identityForgeViewBase=forgeView;
  forgeView=function(){
    let html=identityForgeViewBase();
    const g=typeof findGear==='function'?findGear(forgeSelection):null;
    if(!g)return html;
    ensureGearIdentityMeta(g);
    if(g.boss!==undefined){
      const profile=bossProfileForGear(g),body='<section class="forge-action boss-exclusive-note"><h3>BOSS 專屬詞綴</h3><p class="small">固定三條，沒有前綴／後綴，也不能洗鍊隨機詞條。</p>'+(profile?.effects||[]).map((e,i)=>'<p><b>'+(i+1)+'.</b> '+esc(effectText(e))+'</p>').join('')+'</section>';
      html=html.replace(/<section class="forge-action"><h3>洗鍊隨機詞條<\/h3>[\s\S]*?<\/section>/,body);
    }
    const n=state?.consumables?.[POWER_ITEM_ID]||0,b=gearStatBreakdown(g);
    const card='<section class="forge-power-reroll"><h3>強度階級重鑄</h3><p>目前 <b>T'+g.powerTier+'</b>（'+esc(sourceDifficulty(g))+'來源，基礎能力 ×'+Number(b.mult.toFixed(3))+'）。T 級不顯示在裝備名稱。</p><p class="small">'+esc(EQUIPMENT_POWER.rerollItem.name)+' ×'+n+' · 重骰依原始掉落難度的 T1～T10 權重。</p><div class="actions"><button onclick="rerollEquipmentPowerTier(\''+g.id+'\')" '+(n<1?'disabled':'')+'>消耗 1 個重骰階級</button></div></section>';
    const tail=html.lastIndexOf('</section>');return tail>=0?html.slice(0,tail)+card+html.slice(tail):html+card;
  };

  globalThis.rerollEquipmentPowerTier=function(id){
    const g=typeof findGear==='function'?findGear(id):allKnownGear().find(x=>x.id===id);if(!g)return toast('找不到裝備');
    syncRerollItem();state.consumables??={};if((state.consumables[POWER_ITEM_ID]||0)<1)return toast(EQUIPMENT_POWER.rerollItem.name+'不足');
    const old=g.powerTier||strengthAnchor(g.difficulty),weights=EQUIPMENT_POWER.strength.weightsByDifficulty[Math.max(0,Math.min(2,g.difficulty||0))]||[],choices=weights.filter(x=>x>0).length;let next=rollStrengthTier(g.difficulty||0);
    if(choices>1)for(let n=0;n<8&&next===old;n++)next=rollStrengthTier(g.difficulty||0);
    state.consumables[POWER_ITEM_ID]--;g.powerTier=next;g.name=gearName(g);for(const h of party?.members||[state])withHero(h,clampVitals);save();render();toast('強度階級 T'+old+' → T'+next);
  };

  if(typeof supplyDetail==='function'){const identitySupplyDetailBase=supplyDetail;supplyDetail=function(item){if(item?.id===POWER_ITEM_ID)return '裝備強度階級 T1～T10 重骰道具 · 在裝備強化頁使用 · 賣價 '+Math.round(item.sellPrice||0)+' 金幣';return identitySupplyDetailBase(item);};}
  if(typeof useSupply==='function'){const identityUseSupplyBase=useSupply;useSupply=function(id){if(id===POWER_ITEM_ID)return toast('請在「裝備強化」頁選擇裝備後使用'+EQUIPMENT_POWER.rerollItem.name);return identityUseSupplyBase(id);};}
  if(typeof globalThis.useInventoryItem==='function'){const identityInventoryUseBase=globalThis.useInventoryItem;globalThis.useInventoryItem=function(id,job){if(id===POWER_ITEM_ID){if(typeof setTab==='function')setTab('forge');toast('請選擇裝備後使用'+EQUIPMENT_POWER.rerollItem.name);return;}return identityInventoryUseBase(id,job);};}

  const POWER_MARKET_RULE='__gear_tier_reroll__';
  function proxyMaterialKey(){for(const m of MAPS||[])for(const mob of m.mobs||[])if(mob?.[2])return mob[2];return '素材';}
  if(typeof generateMarket==='function'){const identityMarketBase=generateMarket;generateMarket=function(){const market=identityMarketBase(),r=EQUIPMENT_POWER.rerollItem;if(Math.random()<r.shopChance&&market?.offers&&market.offers.length<99)market.offers.push({id:market.serial+'-'+market.offers.length,kind:'material',key:proxyMaterialKey(),qty:1,price:r.shopPrice,sold:false,ruleId:POWER_MARKET_RULE});return market;};}
  if(typeof marketOfferName==='function'){const identityMarketNameBase=marketOfferName;marketOfferName=function(o){return o?.ruleId===POWER_MARKET_RULE?EQUIPMENT_POWER.rerollItem.name:identityMarketNameBase(o);};}
  if(typeof buyMarketOffer==='function'){const identityBuyMarketBase=buyMarketOffer;buyMarketOffer=function(id){const o=party?.market?.offers?.find(x=>x.id===id);if(o?.ruleId!==POWER_MARKET_RULE)return identityBuyMarketBase(id);if(o.sold)return;if(state.gold<o.price)return toast('金幣不足');const gold=state.gold,have=state.consumables?.[POWER_ITEM_ID]||0;state.gold-=o.price;state.consumables??={};state.consumables[POWER_ITEM_ID]=have+1;o.sold=true;if(!save()){state.gold=gold;state.consumables[POWER_ITEM_ID]=have;o.sold=false;return;}render();toast('已購買 '+EQUIPMENT_POWER.rerollItem.name+' ×1');};}

  if(typeof update12BossMemberView==='function'){
    update12BossMemberView=function(){
      const mode=state.difficulty||0,b=GAMEPLAY_SETTINGS.equipment.boss,needMat=Math.max(0,Math.round(b.craftMaterialCount));
      return heading('BOSS WORKSHOP / 首領製作',MODES[mode].name+'模式專屬裝備')+modePicker()+'<section class="panel">'+resourceLine()+uiHelp('製作說明','BOSS 專屬裝備固定三條專屬詞綴，不抽前綴／後綴，也不能洗鍊隨機詞條；T 級仍依難度抽選。')+'</section><div class="cards boss-recipes">'+MAPS.map((m,i)=>{if(i===6)return '';const family=regionFamily(i),tier=regionTier(i),g={job:state.job,slot:bossEquipmentSlot(family),tier,boss:family,region:i,difficulty:mode,rar:0,plus:0,affix:[],powerTier:strengthAnchor(mode)},profile=bossProfileForGear(g),mat=bossMaterial(i,mode),n=state.materials[mat]||0,cost=Math.round(tier*b.craftGoldPerTier*(mode+1)),ready=canVisit(i)&&state.lv>=m.min&&state.gold>=cost&&n>=needMat;return '<article class="card boss-recipe">'+equipmentArt(g)+'<span class="tag">'+esc(m.name)+'</span><h3>'+equipmentNameHTML(g)+'</h3><p class="small">'+esc(characterName(state))+' · LV'+m.min+'</p><p class="small">'+(profile?.effects||[]).map(effectText).map(esc).join('<br>')+'</p><div class="recipe-cost"><span>'+esc(mat)+' '+n+'/'+needMat+'</span><span>◈ '+cost+'</span></div><button class="primary" onclick="craftBoss('+i+')" '+(ready?'':'disabled')+'>'+(!canVisit(i)?'尚未解鎖':ready?'製作裝備':'等級／材料不足')+'</button></article>';}).join('')+'</div>';
    };
  }

  try{
    const raw=localStorage.getItem(BALANCE_KEY);
    if(raw){const saved=JSON.parse(raw);if(saved?.equipmentPowerSystem)applyBalanceConfig(saved,{persist:false});}
  }catch(e){console.warn('裝備前綴／後綴設定載入失敗，使用內建設定',e);}

  syncRerollItem();normalizeAllGearIdentity();
  // Rehydrate the original bytes once all save validators and migrations exist.
  // Earlier passes must never overwrite the only complete copy of late fields.
  const candidates=[];
  try{const primary=globalThis.__EMBERWILD_BOOT_SAVE_RAW??localStorage.getItem(KEY);if(primary)candidates.push({raw:primary,label:'主要存檔'});}catch{}
  try{const backup=localStorage.getItem(BACKUP_KEY);if(backup&&!candidates.some(x=>x.raw===backup))candidates.push({raw:backup,label:'備份存檔'});}catch{}
  if(candidates.length){
    state=null;party=null;
    // A custom form may be unavailable until its test JSON is imported; keep the primary save intact.
    for(const candidate of candidates){try{loadParty(migrateWorldSave(JSON.parse(candidate.raw)));normalizeAllGearIdentity();normalizeEquippedWearability();globalThis.__EMBERWILD_PRE_CONTROL_SAVE_RAW=candidate.raw;if(candidate.label==='備份存檔')toast('主要存檔無法載入，已自動恢復上一份備份');break;}catch(e){state=null;party=null;console.warn(candidate.label+'最終載入失敗',e);if(candidate.label==='主要存檔'&&String(e?.message||e).startsWith('裝備類型無效：'))break;}}
  }
  saveReady=true;
  window.__EMBERWILD_EQUIPMENT_IDENTITY={schemaVersion:2,effectKeys:[...BOSS_EFFECT_KEYS],prefixes:()=>clone(EQUIPMENT_POWER.prefixes),suffixes:()=>clone(EQUIPMENT_POWER.suffixes),bossAffixes:()=>clone(EQUIPMENT_POWER.bossAffixes),effectText};
  if(state){save();render();}
})();
