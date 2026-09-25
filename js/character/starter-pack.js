(function starterModule(){
  const clone=value=>JSON.parse(JSON.stringify(value));
  const SLOT_BY_POSITION=[0,1,2,3,3];
  const POSITION_NAMES=['武器','護甲','副手','飾品 1','飾品 2'];
  const SKILL_EFFECT_KEYS=new Set(['skillEffectPct','skillCooldownReduction']);

  function defaultGrowth(){
    return {enabled:false,startLevel:1,maxLevel:60,levelsPerTier:0,maxPowerTier:10,effects:[]};
  }

  function formWearableByJob(forms,group,slot,formIndex,job){
    const form=forms?.[group]?.[slot]?.[formIndex];
    if(!form)return false;
    const all=CLASSES.map((_,i)=>i);
    const fallback=group>=CLASSES.length||slot===1?all:[group];
    const raw=Array.isArray(form.wearableJobs)?form.wearableJobs:fallback;
    return raw.map(Number).includes(job);
  }

  function candidateRefs(job,slot,forms=ITEM_FORMS){
    const refs=[];
    for(let group=0;group<(forms?.length||0);group++){
      const list=forms?.[group]?.[slot];
      if(!Array.isArray(list))continue;
      for(let form=0;form<list.length;form++){
        if(formWearableByJob(forms,group,slot,form,job))refs.push({group,slot,form});
      }
    }
    refs.sort((a,b)=>{
      const priority=ref=>ref.group===job?0:ref.group===CLASSES.length?1:2;
      return priority(a)-priority(b)||a.group-b.group||a.form-b.form;
    });
    return refs;
  }

  function defaultStarterEntry(job,slot,position,forms=ITEM_FORMS){
    const refs=candidateRefs(job,slot,forms);
    if(!refs.length)throw Error(`職業 ${job} 的${POSITION_NAMES[position]}沒有可用的新手禮包裝備`);
    return {...clone(position===4?(refs[1]||refs[0]):refs[0]),powerTier:1,plus:0,fixedEffects:null,growth:defaultGrowth()};
  }

  function defaultStarterPacks(forms=ITEM_FORMS){
    return CLASSES.map((_,job)=>SLOT_BY_POSITION.map((slot,position)=>defaultStarterEntry(job,slot,position,forms)));
  }

  function normalizeStarterEffect(raw,job,{growth=false}={}){
    const effect=typeof normalizeFixedEquipmentEffect==='function'?normalizeFixedEquipmentEffect(raw):null;
    if(!effect)throw Error(`starterPacks 的裝備屬性無效`);
    if(growth&&effect.key==='basicElement')throw Error('成長屬性不能使用普通攻擊屬性');
    if(effect.key!=='basicElement'&&!Number.isFinite(Number(effect.value)))throw Error('新手禮包裝備屬性數值無效');
    if(SKILL_EFFECT_KEYS.has(effect.key)){
      const skillCount=CLASSES[job]?.skills?.length||0;
      if(!Number.isInteger(effect.skill)||effect.skill<0||effect.skill>=skillCount)throw Error('新手禮包指定技能屬性無效');
    }
    return effect;
  }

  function normalizeStarterEffects(raw,job,{growth=false,allowNull=false}={}){
    if(raw===undefined||raw===null){
      if(allowNull)return null;
      return [];
    }
    if(!Array.isArray(raw))throw Error('新手禮包裝備屬性必須是陣列');
    if(raw.length>(growth?5:5)||(!growth&&raw.length<1))throw Error(growth?'成長屬性最多 5 條':'自訂固定屬性必須為 1～5 條');
    return raw.map(effect=>normalizeStarterEffect(effect,job,{growth}));
  }

  function normalizeGrowth(raw,job,basePowerTier){
    const maxLevel=Math.max(1,Math.floor(Number(typeof RULES!=='undefined'?RULES.maxLevel:60)));
    const src=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    const enabled=!!src.enabled;
    const startLevel=Number.isInteger(Number(src.startLevel))?Number(src.startLevel):1;
    const stopLevel=Number.isInteger(Number(src.maxLevel))?Number(src.maxLevel):maxLevel;
    const levelsPerTier=Number.isInteger(Number(src.levelsPerTier))?Number(src.levelsPerTier):0;
    const maxPowerTier=Number.isInteger(Number(src.maxPowerTier))?Number(src.maxPowerTier):10;
    if(startLevel<1||startLevel>maxLevel||stopLevel<startLevel||stopLevel>maxLevel)throw Error('新手禮包成長等級範圍無效');
    if(levelsPerTier<0||levelsPerTier>maxLevel)throw Error('新手禮包 T 階成長間隔無效');
    if(maxPowerTier<basePowerTier||maxPowerTier>10)throw Error('新手禮包成長最高 T 階無效');
    return {enabled,startLevel,maxLevel:stopLevel,levelsPerTier,maxPowerTier,effects:normalizeStarterEffects(src.effects,job,{growth:true})};
  }

  function normalizeStarterEntry(raw,job,position,forms=ITEM_FORMS){
    const slot=SLOT_BY_POSITION[position];
    const ref={group:Number(raw?.group),slot:Number(raw?.slot),form:Number(raw?.form)};
    if(!Number.isInteger(ref.group)||!Number.isInteger(ref.slot)||!Number.isInteger(ref.form)||ref.slot!==slot||!formWearableByJob(forms,ref.group,ref.slot,ref.form,job)){
      throw Error(`starterPacks[${job}][${position}] 的${POSITION_NAMES[position]}設定無效`);
    }
    const enhanceMax=Math.max(0,Math.floor(Number(typeof RULES!=='undefined'?RULES.enhanceMax:10)));
    const powerTier=raw?.powerTier===undefined?1:Number(raw.powerTier);
    const plus=raw?.plus===undefined?0:Number(raw.plus);
    if(!Number.isInteger(powerTier)||powerTier<1||powerTier>10)throw Error(`starterPacks[${job}][${position}] 的初始 T 階無效`);
    if(!Number.isInteger(plus)||plus<0||plus>enhanceMax)throw Error(`starterPacks[${job}][${position}] 的初始強化值無效`);
    return {
      ...ref,
      powerTier,
      plus,
      fixedEffects:normalizeStarterEffects(raw?.fixedEffects,job,{allowNull:true}),
      growth:normalizeGrowth(raw?.growth,job,powerTier)
    };
  }

  function normalizeStarterPacks(value,forms=ITEM_FORMS){
    if(value===undefined||value===null)return defaultStarterPacks(forms);
    if(!Array.isArray(value)||value.length!==CLASSES.length)throw Error(`starterPacks 必須包含 ${CLASSES.length} 個職業`);
    return value.map((row,job)=>{
      if(!Array.isArray(row)||row.length!==SLOT_BY_POSITION.length)throw Error(`starterPacks[${job}] 必須包含 5 件裝備`);
      return row.map((raw,position)=>normalizeStarterEntry(raw,job,position,forms));
    });
  }

  let starterPacks=defaultStarterPacks();
  try{
    const raw=localStorage.getItem(BALANCE_KEY);
    if(raw){
      const saved=JSON.parse(raw);
      starterPacks=normalizeStarterPacks(saved.starterPacks,saved.equipmentForms||ITEM_FORMS);
    }
  }catch(error){
    console.warn('新手禮包設定載入失敗，改用目前裝備資料的預設整套裝備',error);
    starterPacks=defaultStarterPacks();
  }

  const starterValidateBase=validateBalanceConfig;
  validateBalanceConfig=function(input){
    const data=starterValidateBase(input);
    data.starterPacks=normalizeStarterPacks(data.starterPacks,data.equipmentForms);
    return data;
  };

  const starterExportBase=exportableBalance;
  exportableBalance=function(){
    const data=starterExportBase();
    data.starterPacks=clone(starterPacks);
    data.notes=[...(data.notes||[]),
      'starterPacks 只在建立第一名初始職業時發放；後續招募角色不會取得此禮包。',
      'starterPacks 每件可設定 powerTier、plus、fixedEffects；fixedEffects=null 表示沿用基底裝備固定屬性。',
      'starterPacks.growth 可依角色等級提高 T 階並逐級增加固定屬性；成長設定會寫入該件新手裝備存檔。'
    ];
    return data;
  };

  const starterApplyBase=applyBalanceConfig;
  applyBalanceConfig=function(input,options={}){
    const copy=clone(input);
    const next=normalizeStarterPacks(copy.starterPacks,copy.equipmentForms||ITEM_FORMS);
    copy.starterPacks=clone(next);
    const previous=starterPacks;
    starterPacks=clone(next);
    try{
      return starterApplyBase(copy,options);
    }catch(error){
      starterPacks=previous;
      throw error;
    }
  };

  const starterResetBase=resetBalanceJSON;
  resetBalanceJSON=function(){
    const result=starterResetBase();
    starterPacks=defaultStarterPacks();
    return result;
  };

  function starterGearOwner(g){
    if(!g?.starterPack)return null;
    const members=party?.members||[];
    const byId=members.find(h=>(h.bag||[]).some(x=>x.id===g.id));
    if(byId)return byId;
    if(state?.bag?.some(x=>x.id===g.id))return state;
    return members.find(h=>h.job===g.starterPack.job)||null;
  }

  function growthLevels(meta,owner){
    const growth=meta?.growth;
    if(!growth?.enabled||!owner)return 0;
    const capped=Math.max(growth.startLevel,Math.min(growth.maxLevel,Number(owner.lv)||1));
    return Math.max(0,capped-growth.startLevel);
  }

  function syncStarterGearGrowth(g,owner=starterGearOwner(g)){
    const meta=g?.starterPack,growth=meta?.growth;
    if(!meta||!growth?.enabled||!owner)return g;
    if(growth.levelsPerTier>0){
      const levels=growthLevels(meta,owner);
      const desired=Math.min(growth.maxPowerTier,meta.basePowerTier+Math.floor(levels/growth.levelsPerTier));
      if(Number.isInteger(desired)&&desired>=1&&desired<=10)g.powerTier=desired;
    }
    return g;
  }

  const starterItemFormBase=itemForm;
  itemForm=function(g){
    const base=starterItemFormBase(g);
    const meta=g?.starterPack;
    if(!base||!meta)return base;
    const out=clone(base);
    let effects=Array.isArray(meta.fixedEffects)?clone(meta.fixedEffects):clone(base.fixedEffects||[]);
    const owner=starterGearOwner(g),levels=growthLevels(meta,owner);
    if(levels>0&&Array.isArray(meta.growth?.effects)){
      for(const effect of meta.growth.effects){
        const extra=clone(effect);
        extra.value=(Number(extra.value)||0)*levels;
        effects.push(extra);
      }
    }
    out.fixedEffects=effects;
    return out;
  };

  const starterGearBaseStatsBase=gearBaseStats;
  gearBaseStats=function(g){
    syncStarterGearGrowth(g);
    return starterGearBaseStatsBase(g);
  };

  if(typeof globalThis.gearStatBreakdown==='function'){
    const starterBreakdownBase=globalThis.gearStatBreakdown;
    globalThis.gearStatBreakdown=function(g){
      syncStarterGearGrowth(g);
      return starterBreakdownBase(g);
    };
  }

  if(typeof globalThis.equipmentAttributeDetailsHTML==='function'){
    const starterDetailsBase=globalThis.equipmentAttributeDetailsHTML;
    globalThis.equipmentAttributeDetailsHTML=function(g,options={}){
      const html=starterDetailsBase(g,options);
      const meta=g?.starterPack,growth=meta?.growth;
      if(!meta)return html;
      const owner=starterGearOwner(g),level=owner?.lv||1,levels=growthLevels(meta,owner);
      const tierText=growth?.enabled&&growth.levelsPerTier>0?` · 成長 T${g.powerTier}/${growth.maxPowerTier}`:'';
      const effectText=growth?.enabled&&growth.effects?.length?` · 每級成長 ${growth.effects.length} 項屬性`:'';
      return html+`<div class="small">新手專屬裝備${growth?.enabled?` · 成長等級 ${Math.min(level,growth.maxLevel)} / ${growth.maxLevel}（已成長 ${levels} 級）`:''}${tierText}${effectText}</div>`;
    };
  }

  if(typeof globalThis.rerollEquipmentPowerTier==='function'){
    const starterPowerRerollBase=globalThis.rerollEquipmentPowerTier;
    globalThis.rerollEquipmentPowerTier=function(id){
      const g=typeof findGear==='function'?findGear(id):null;
      if(g?.starterPack?.growth?.enabled&&g.starterPack.growth.levelsPerTier>0){
        return toast('此成長裝備的 T 階由角色等級決定，不能使用強度重鑄石');
      }
      return starterPowerRerollBase(id);
    };
  }

  function createStarterGear(job,position,entry){
    const g=gear(1,entry.slot,0,job);
    g.job=job;
    g.formJob=entry.group;
    g.form=entry.form;
    g.rar=0;
    g.plus=entry.plus;
    g.affix=[];
    g.difficulty=0;
    g.powerTier=entry.powerTier;
    g.prefixId='';
    g.suffixId='';
    g.starterPack={
      version:2,
      job,
      position,
      basePowerTier:entry.powerTier,
      fixedEffects:entry.fixedEffects===null?null:clone(entry.fixedEffects),
      growth:clone(entry.growth)
    };
    delete g.affixLock;
    delete g.boss;
    delete g.bossQualityRank;
    syncStarterGearGrowth(g);
    g.name=gearName(g);
    return g;
  }

  function grantStarterPack(hero,job){
    const pack=starterPacks[job];
    if(!hero||!Array.isArray(pack)||pack.length!==5)return;
    const oldEquipped=new Set((hero.equipped||[]).filter(Boolean));
    hero.bag=(hero.bag||[]).filter(g=>!oldEquipped.has(g.id));
    hero.equipped=[null,null,null,null,null];
    for(let position=0;position<pack.length;position++){
      const g=createStarterGear(job,position,pack[position]);
      hero.bag.push(g);
      hero.equipped[position]=g.id;
    }
    normalizeEquippedWearability();
    hero.hp=stats(hero).hp;
    hero.shield=0;
    note(`已領取 ${CLASSES[job].name} 專屬新手禮包，完整裝備已自動穿戴。`);
  }

  const starterStartBase=start;
  start=function(job){
    const result=starterStartBase(job);
    if(state&&party&&party.members?.length===1&&state.job===job){
      grantStarterPack(state,job);
      save();
      render();
    }
    return result;
  };
})();
