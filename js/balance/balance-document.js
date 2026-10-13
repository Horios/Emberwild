/* Shared document preflight. Runtime/editor validators remain the domain authorities. */
(function(root){
 const VERSION=1,SCHEMA='emberwild-balance-v1';
 const REQUIRED=['balance','classes','supportSkills','equipmentForms','items','balanceSettings','equipmentPowerSystem','statusDefinitions','companions','passiveDefinitions','companionSettings','shopSettings','companionTokens','teamSettings','lifeSkills'];
 const copy=x=>structuredClone(x);
 function issue(path,reason,object){return {system:path.split('.')[0],object:object?.name||object?.title||object?.id||'',field:path,reason};}
 function inspect(d,{complete=true}={}){
  const errors=[],add=(p,r,o)=>errors.push(issue(p,r,o));
  if(!d||typeof d!=='object'||Array.isArray(d))return [issue('$','必須為 JSON 物件')];
  if(d.schema!==SCHEMA)add('schema','不支援的 schema');
  if(d.schemaVersion!==undefined&&d.schemaVersion!==VERSION)add('schemaVersion','不支援此版本；禁止自動降版');
  if(complete)for(const k of REQUIRED)if(d[k]===undefined)add(k,'缺少必要設定');
  const arrays=['classes','supportSkills','equipmentForms','items','statusDefinitions','companions','passiveDefinitions'];
  for(const k of arrays)if(d[k]!==undefined&&!Array.isArray(d[k]))add(k,'必須為陣列');
  const chanceKey=/^(?:chance|.*Chance|.*ChancePerLevel|healFraction|critChance)$/;
  const nonnegative=/^(?:hp|atk|def|cost|sellPrice|unitPrice|cooldown|duration|durationMinutes|periodMs|requiredLevel|requiredMasteryLevel|power|powerPerLevel|quantity|quantityMin|quantityMax|minLevel|maxLevel|weight|hitCount|delayTurns|intervalTurns)$/;
  const enums={activation:['active','proc'],availability:['visible','locked','hidden'],kind:null};
  function walk(x,p='',owner=null){
   if(typeof x==='number'){if(!Number.isFinite(x))add(p,'必須為有限數值',owner);return;}
   if(x===undefined||typeof x==='function'||typeof x==='bigint'){add(p,'不是合法 JSON 值',owner);return;}
   if(!x||typeof x!=='object')return;
   if(Array.isArray(x)){
    const ids=new Set();for(let i=0;i<x.length;i++){const row=x[i];if(row&&typeof row==='object'&&!Array.isArray(row)&&row.id!==undefined){if(!['string','number'].includes(typeof row.id)||ids.has(row.id))add(p+'.'+i+'.id','ID 無效或重複',row);ids.add(row.id);}walk(row,p+'.'+i,row?.id!==undefined?row:owner);}return;
   }
   for(const [k,v] of Object.entries(x)){
    const field=p?p+'.'+k:k;
    if(['__proto__','constructor','prototype'].includes(k))add(field,'禁止的物件鍵',owner);
    if(typeof v==='number'&&nonnegative.test(k)&&v<0)add(field,'不得為負值',owner);
    const chanceMax=field.startsWith('balance.affixes.poolBySlotRank.')&&k==='chance'?100:1;
    if(chanceKey.test(k)&&typeof v==='number'&&(v<0||v>chanceMax))add(field,'機率必須介於 0～'+chanceMax,owner);
    if(k==='chanceByDifficulty'&&(!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(n)||n<0||n>1)))add(field,'三個難度機率必須介於 0～1',owner);
    if(k==='chanceByTier'&&(!Array.isArray(v)||v.length!==10||v.some(n=>!Number.isFinite(n)||n<0||n>100)))add(field,'十階機率必須介於 0～100',owner);
    if(enums[k]&&!enums[k].includes(v))add(field,'未知 enum：'+v,owner);
    walk(v,field,owner);
   }
  }walk(d);
  const life=d.lifeSkills;
  if(life){if(!Number.isInteger(life.periodMs)||life.periodMs<50)add('lifeSkills.periodMs','必須為至少 50 毫秒的整數');if(!Number.isFinite(life.bugChance)||life.bugChance<0||life.bugChance>1)add('lifeSkills.bugChance','必須介於 0～1');
   for(const k of ['清水','藥水瓶'])if(!Number.isFinite(life.materialBuyPrices?.[k])||life.materialBuyPrices[k]<0)add('lifeSkills.materialBuyPrices.'+k,'購買價格必須為非負數');
   for(const k of ['process','alchemy']){const r=life.recipes?.[k],p='lifeSkills.recipes.'+k;if(!r||typeof r.name!=='string'||!r.name.trim()||typeof r.output!=='string'||!Array.isArray(r.inputs)||!r.inputs.length||r.inputs.some(x=>!Array.isArray(x)||x.length!==2||typeof x[0]!=='string'||!Number.isInteger(x[1])||x[1]<1))add(p,'配方名稱、成品或材料數量無效');}
   if(life.recipes?.alchemy?.output!=='heal_small'||life.recipes?.process?.output!=='紅色草泥')add('lifeSkills.recipes','目前執行器只支援既有兩種成品');
  }
  return errors;
 }
 function migrate(input,defaults){
  const errors=inspect(input,{complete:input?.schemaVersion!==undefined});if(errors.length)throw Object.assign(Error(errors.map(x=>x.field+'：'+x.reason).join('\n')),{issues:errors});
  const d=copy(input);if(d.schemaVersion===undefined){if(!defaults)throw Error('舊 JSON 需要有效的遷移基準');for(const k of REQUIRED)if(d[k]===undefined)d[k]=copy(defaults[k]);d.schemaVersion=VERSION;}
  const full=inspect(d);if(full.length)throw Object.assign(Error(full.map(x=>x.field+'：'+x.reason).join('\n')),{issues:full});return d;
 }
 function validate(input,domainValidate,defaults){const d=migrate(input,defaults);
  const typeErrors=[];
  function types(v,b,p){if(b===null||b===undefined||v===undefined)return;if(Array.isArray(b)){if(!Array.isArray(v)){typeErrors.push(issue(p,'必須為陣列'));return;}for(let i=0;i<v.length;i++)types(v[i],b[i]??b[0],p+'.'+i);return;}if(typeof b==='object'){if(!v||typeof v!=='object'||Array.isArray(v)){typeErrors.push(issue(p,'必須為物件'));return;}for(const k of Object.keys(v))types(v[k],b[k],p+'.'+k);return;}if(typeof v!==typeof b)typeErrors.push(issue(p,'型別必須為 '+typeof b));}
  if(defaults)types(d,defaults,'$');if(typeErrors.length)throw Object.assign(Error(typeErrors.map(x=>x.field+'：'+x.reason).join('\n')),{issues:typeErrors});
if(domainValidate){try{domainValidate(copy(d));}catch(e){throw Object.assign(Error(e.message),{issues:e.issues||[issue('domain',e.message)]});}}return d;}
 const api={VERSION,SCHEMA,REQUIRED,copy,inspect,migrate,validate};root.EmberwildBalanceDocument=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
