/* Optional presentation data shares the published balance document and icon library. */
(()=>{
  const M=EmberwildInventoryIcons,baseExport=exportableBalance,baseValidate=validateBalanceConfig,baseApply=applyBalanceConfig;
  let definitions,customIcons=baseExport().skillIcons||[],lookup=new Map();
  const saved=balanceSourceText();if(saved){definitions=M.validate(JSON.parse(saved),__EMBERWILD_SKILL_ICONS);lookup=new Map((definitions||[]).map(r=>[r.kind+':'+r.key,r.iconType]));}
  exportableBalance=()=>{const out=baseExport();if(definitions!==undefined)out.inventoryIcons=structuredClone(definitions);return out;};
  validateBalanceConfig=input=>{M.validate(input,__EMBERWILD_SKILL_ICONS);return baseValidate(input);};
  applyBalanceConfig=(input,options={})=>{
    const next=M.validate(input,__EMBERWILD_SKILL_ICONS),out=baseApply(input,options);
    definitions=next;customIcons=structuredClone(input.skillIcons||[]);lookup=new Map((next||[]).map(r=>[r.kind+':'+r.key,r.iconType]));
    if(options.persist!==false){const doc=exportableBalance();localStorage.setItem(BALANCE_KEY,JSON.stringify(doc));if(globalThis.__EMBERWILD_PUBLISHED_BALANCE&&IS_PREVIEW){globalThis.__EMBERWILD_BALANCE_SOURCE=doc;localStorage.setItem(BALANCE_KEY+'-published-base',JSON.stringify(globalThis.__EMBERWILD_PUBLISHED_BALANCE));}}
    if(party)render();return out;
  };
  globalThis.__EMBERWILD_INVENTORY_ICON=(kind,key,fallback,options={})=>{
    const type=lookup.get(kind+':'+String(key));return __EMBERWILD_SKILL_ICONS.svgFor(!type||type==='auto'?fallback:type,customIcons,options);
  };
  globalThis.__EMBERWILD_INVENTORY_ICONS={version:1,entries:()=>M.entries(exportableBalance())};
})();
