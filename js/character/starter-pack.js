(function starterModule(){
  const clone=value=>JSON.parse(JSON.stringify(value));
  const SLOT_BY_POSITION=[0,1,2,3,3];
  const POSITION_NAMES=['武器','護甲','副手','飾品 1','飾品 2'];

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

  function defaultStarterPacks(forms=ITEM_FORMS){
    return CLASSES.map((_,job)=>SLOT_BY_POSITION.map((slot,position)=>{
      const refs=candidateRefs(job,slot,forms);
      if(!refs.length)throw Error(`職業 ${job} 的${POSITION_NAMES[position]}沒有可用的新手禮包裝備`);
      return clone(position===4?(refs[1]||refs[0]):refs[0]);
    }));
  }

  function normalizeStarterPacks(value,forms=ITEM_FORMS){
    if(value===undefined||value===null)return defaultStarterPacks(forms);
    if(!Array.isArray(value)||value.length!==CLASSES.length)throw Error(`starterPacks 必須包含 ${CLASSES.length} 個職業`);
    return value.map((row,job)=>{
      if(!Array.isArray(row)||row.length!==SLOT_BY_POSITION.length)throw Error(`starterPacks[${job}] 必須包含 5 件裝備`);
      return row.map((raw,position)=>{
        const slot=SLOT_BY_POSITION[position];
        const ref={group:Number(raw?.group),slot:Number(raw?.slot),form:Number(raw?.form)};
        if(!Number.isInteger(ref.group)||!Number.isInteger(ref.slot)||!Number.isInteger(ref.form)||ref.slot!==slot||!formWearableByJob(forms,ref.group,ref.slot,ref.form,job)){
          throw Error(`starterPacks[${job}][${position}] 的${POSITION_NAMES[position]}設定無效`);
        }
        return ref;
      });
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
    data.notes=[...(data.notes||[]),'starterPacks 只在建立第一名初始職業時發放；後續招募角色不會取得此禮包。'];
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

  function createStarterGear(job,ref){
    const g=gear(1,ref.slot,0,job);
    g.job=job;
    g.formJob=ref.group;
    g.form=ref.form;
    g.rar=0;
    g.plus=0;
    g.affix=[];
    g.difficulty=0;
    g.powerTier=1;
    g.prefixId='';
    g.suffixId='';
    delete g.affixLock;
    delete g.boss;
    delete g.bossQualityRank;
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
      const g=createStarterGear(job,pack[position]);
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
