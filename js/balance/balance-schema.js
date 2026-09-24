
/* Update 16: validation hardening for monster/drop editor round-trip. */
function validateMonsterDropDynamicInput(input){
  const bs=input?.balanceSettings;
  if(!bs||typeof bs!=='object')return;
  const cat=bs.monsters?.catalog;
  if(cat!==undefined){
    if(!Array.isArray(cat)||!cat.length)throw Error('怪物設計清單不可為空');
    const ids=new Set(),elements=new Set(Object.keys(ELEMENTS)),races=new Set(Object.keys(RACES)),kinds=new Set(['normal','boss','final']);
    for(const [i,m] of cat.entries()){
      if(!m||typeof m.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(m.id)||ids.has(m.id))throw Error('怪物 ID 無效或重複：'+i);ids.add(m.id);
      if(typeof m.name!=='string'||!m.name.trim()||!Number.isInteger(m.mapIndex)||m.mapIndex<0||m.mapIndex>=MAPS.length||!kinds.has(m.kind)||typeof m.material!=='string'||!m.material.trim()||!elements.has(m.element)||!races.has(m.race)||!Number.isInteger(m.maxDrops)||m.maxDrops<0||m.maxDrops>100)throw Error('怪物設計資料無效：'+m.id);
      const expected=(bs.maps?.catalog?.[m.mapIndex]?.mapType==='final'||(!bs.maps?.catalog&&m.mapIndex===6))?'final':'boss';
      if(m.kind!=='normal'&&m.kind!==expected)throw Error('怪物類型與地圖不相容：'+m.id);
    }
  }
  const drops=bs.drops?.entries;
  if(drops!==undefined){
    if(!Array.isArray(drops))throw Error('掉落表必須是陣列');
    if(!Array.isArray(cat)||!cat.length)throw Error('掉落表需要有效怪物設計清單');
    const monsterById=new Map(cat.map(m=>[m.id,m])),dropIds=new Set(),types=new Set(['sourceMaterial','material','ore','dust','gem','potion','item','gear','gearLegendary','bossGear']),encKinds=new Set(['normal','elite','boss','final']);
    for(const [i,d] of drops.entries()){
      if(!d||typeof d.id!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(d.id)||dropIds.has(d.id))throw Error('掉落規則 ID 無效或重複：'+i);dropIds.add(d.id);
      if(typeof d.name!=='string'||!d.name.trim()||typeof d.enabled!=='boolean'||!types.has(d.type)||!Array.isArray(d.kinds)||!d.kinds.length||d.kinds.some(k=>!encKinds.has(k))||!Array.isArray(d.chanceByDifficulty)||d.chanceByDifficulty.length!==3||d.chanceByDifficulty.some(v=>!Number.isFinite(v)||v<0||v>1)||!Number.isInteger(d.quantityMin)||!Number.isInteger(d.quantityMax)||d.quantityMin<1||d.quantityMax<d.quantityMin||d.quantityMax>999||!Array.isArray(d.sources)||!d.sources.length||d.sources.some(id=>!monsterById.has(id)))throw Error('掉落規則資料無效：'+d.id);
      if(d.type==='material'&&(typeof d.key!=='string'||!d.key.trim()))throw Error('材料掉落需要材料名稱：'+d.id);
      if(d.type==='gem'&&d.key!=='random'&&![0,1,2,'0','1','2'].includes(d.key))throw Error('寶石掉落 key 需為 random/0/1/2：'+d.id);
      if(d.type==='item'&&!SHOP.some(x=>x.id===d.key))throw Error('商店道具掉落 key 無效：'+d.id);
      const ruleKinds=new Set(d.kinds);
      for(const id of d.sources){
        const m=monsterById.get(id),compatible=m.kind==='normal'?['normal','elite']:[m.kind];
        if(!compatible.some(k=>ruleKinds.has(k)))throw Error('掉落規則來源與遭遇種類不相容：'+d.id+' → '+id);
      }
    }
  }
}
const update16NormalizeGameplayBase=normalizeGameplaySettings;
normalizeGameplaySettings=function(input){validateMonsterDropDynamicInput({balanceSettings:input});return update16NormalizeGameplayBase(input);};
const update16ValidateGameplayBase=validateGameplaySettings;
validateGameplaySettings=function(cfg){
  cfg=update16ValidateGameplayBase(cfg);
  const byId=new Map(cfg.monsters.catalog.map(m=>[m.id,m]));
  for(const m of cfg.monsters.catalog){const expected=(cfg.maps?.catalog?.[m.mapIndex]?.mapType==='final'||(!cfg.maps?.catalog&&m.mapIndex===6))?'final':'boss';if(m.kind!=='normal'&&m.kind!==expected)throw Error('怪物類型與地圖不相容：'+m.id);}
  for(const d of cfg.drops.entries){const kinds=new Set(d.kinds);for(const id of d.sources){const m=byId.get(id),compatible=m.kind==='normal'?['normal','elite']:[m.kind];if(!compatible.some(k=>kinds.has(k)))throw Error('掉落規則來源與遭遇種類不相容：'+d.id+' → '+id);}}
  return cfg;
};
// Rebind the normalizer after wrapping the validator above.
normalizeGameplaySettings=function(input){validateMonsterDropDynamicInput({balanceSettings:input});return validateGameplaySettings(mergeGameplayShape(GAMEPLAY_SETTINGS_DEFAULTS,input||{}));};
