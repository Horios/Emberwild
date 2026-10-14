/* Optional presentation data shares the published balance document and icon library. */
(()=>{
  const M=EmberwildInventoryIcons,baseExport=exportableBalance,baseValidate=validateBalanceConfig,baseApply=applyBalanceConfig;
  let definitions,customIcons=baseExport().skillIcons||[],lookup=new Map();
  const saved=balanceSourceText();if(saved){definitions=M.validate(JSON.parse(saved),__EMBERWILD_SKILL_ICONS);lookup=new Map((definitions||[]).map(r=>[r.kind+':'+r.key,r]));}
  exportableBalance=()=>{const out=baseExport();if(definitions!==undefined)out.inventoryIcons=structuredClone(definitions);return out;};
  validateBalanceConfig=input=>{M.validate(input,__EMBERWILD_SKILL_ICONS);return baseValidate(input);};
  applyBalanceConfig=(input,options={})=>{
    const next=M.validate(input,__EMBERWILD_SKILL_ICONS),out=baseApply(input,options);
    definitions=next;customIcons=structuredClone(input.skillIcons||[]);lookup=new Map((next||[]).map(r=>[r.kind+':'+r.key,r]));
    if(options.persist!==false){const doc=exportableBalance();localStorage.setItem(BALANCE_KEY,JSON.stringify(doc));if(globalThis.__EMBERWILD_PUBLISHED_BALANCE&&IS_PREVIEW){globalThis.__EMBERWILD_BALANCE_SOURCE=doc;localStorage.setItem(BALANCE_KEY+'-published-base',JSON.stringify(globalThis.__EMBERWILD_PUBLISHED_BALANCE));}}
    if(party)render();return out;
  };
  globalThis.__EMBERWILD_INVENTORY_ICON=(kind,key,fallback,options={})=>{
    const row=lookup.get(kind+':'+String(key)),type=row?.iconType;
    const svg=__EMBERWILD_SKILL_ICONS.svgFor(!type||type==='auto'?fallback:type,customIcons,{...options,color:row?.color});
    return row?.color?'<span style="display:inline-flex;color:'+row.color+'">'+svg+'</span>':svg;
  };
  const description=(kind,key)=>lookup.get(kind+':'+key)?.description;
  const materialDescription=inventoryMaterialDescription;
  globalThis.inventoryMaterialDescription=name=>description('material',name)??materialDescription(name);
  const lifeDescription=lifeMaterialDescription;
  globalThis.lifeMaterialDescription=name=>description('material',name)??lifeDescription(name);
  function gearKey(g){return g.boss!==undefined?'boss:'+g.region+':'+g.job:'form:'+equipmentFormGroup(g)+':'+g.slot+':'+g.form;}
  const gearNameHTML=equipmentNameHTML;
  equipmentNameHTML=function(g){const key=gearKey(g),row=lookup.get('equipment:'+key);if(!row)return gearNameHTML(g);const glyph=globalThis.__EMBERWILD_INVENTORY_ICON('equipment',key,'lucide:'+(['sword','shirt','shield','gem'][g.slot]),{size:22});return '<span class="inventory-item-icon" style="display:inline-flex;vertical-align:middle;margin-right:6px">'+glyph+'</span>'+gearNameHTML(g);};
  const attributes=globalThis.equipmentAttributeDetailsHTML;
  globalThis.equipmentAttributeDetailsHTML=function(g,...args){const text=description('equipment',gearKey(g));return (text?'<p class="small">'+esc(text)+'</p>':'')+attributes(g,...args);};
  globalThis.__EMBERWILD_INVENTORY_ICONS={version:2,entries:()=>M.entries(exportableBalance())};
})();
