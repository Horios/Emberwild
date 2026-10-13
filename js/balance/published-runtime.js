/* Installed last: one import/export boundary for published design documents. */
(()=>{
 const M=EmberwildBalanceDocument,baseExport=exportableBalance,baseApply=applyBalanceConfig,baseValidate=validateBalanceConfig;
 let extras={schemaVersion:1,lifeSkills:structuredClone(globalThis.__EMBERWILD_BALANCE_SOURCE?.lifeSkills||{periodMs:5000,bugChance:.05,materialBuyPrices:{'清水':1,'藥水瓶':1},recipes:{process:{name:'加工紅色草',inputs:[['紅色草',1]],output:'紅色草泥'},alchemy:{name:'煉製簡易治療藥水',inputs:[['紅色草泥',1],['清水',1],['藥水瓶',1]],output:'heal_small'}}})};
 const defaults={...baseExport(),...structuredClone(extras)};
 let validationDepth=0;
 exportableBalance=()=>({...baseExport(),...structuredClone(extras)});
 validateBalanceConfig=input=>{
  if(validationDepth)return baseValidate(input);
  const d=M.validate(input,null,defaults);validationDepth++;
  try{return {...baseValidate(d),schemaVersion:1,lifeSkills:d.lifeSkills};}finally{validationDepth--;}
 };
 applyBalanceConfig=(input,options={})=>{
  const d=validateBalanceConfig(input);validationDepth++;
  try{const result=baseApply(d,options);extras={schemaVersion:1,lifeSkills:structuredClone(d.lifeSkills)};
   if(options.persist!==false&&globalThis.__EMBERWILD_PUBLISHED_BALANCE&&IS_PREVIEW){globalThis.__EMBERWILD_BALANCE_SOURCE=exportableBalance();localStorage.setItem(BALANCE_KEY,JSON.stringify(globalThis.__EMBERWILD_BALANCE_SOURCE));localStorage.setItem(BALANCE_KEY+'-published-base',JSON.stringify(globalThis.__EMBERWILD_PUBLISHED_BALANCE));}
   return result;}finally{validationDepth--;}
 };
 const resetBase=resetBalanceJSON;resetBalanceJSON=()=>resetBase(globalThis.__EMBERWILD_PUBLISHED_BALANCE||defaults);
 const designKeys=['balance','balanceSettings','balanceConfig','gameBalance'];
 function stripDesign(save){const d=structuredClone(save);for(const obj of [d,...(d?.members||[])])for(const key of designKeys)delete obj?.[key];return d;}
 const loadBase=loadParty;loadParty=(input,...args)=>loadBase(stripDesign(input),...args);
 const packBase=packParty;packParty=(...args)=>{const p=packBase(...args);for(const obj of [p,...(p?.members||[])])for(const key of designKeys)delete obj?.[key];return p;};
})();
