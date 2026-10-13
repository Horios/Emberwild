/* Installed last: one import/export boundary for published design documents. */
(()=>{
 const M=EmberwildBalanceDocument,baseExport=exportableBalance,baseApply=applyBalanceConfig,baseValidate=validateBalanceConfig;
 let extras={schemaVersion:1,lifeSkills:structuredClone(globalThis.__EMBERWILD_BALANCE_SOURCE?.lifeSkills||{periodMs:5000,bugChance:.05,materialBuyPrices:{'清水':1,'藥水瓶':1},recipes:{process:{name:'加工紅色草',inputs:[['紅色草',1]],output:'紅色草泥'},alchemy:{name:'煉製簡易治療藥水',inputs:[['紅色草泥',1],['清水',1],['藥水瓶',1]],output:'heal_small'}}})};
 exportableBalance=()=>({...baseExport(),...structuredClone(extras)});
 validateBalanceConfig=input=>{const d=M.validate(input,baseValidate,exportableBalance());return {...baseValidate(d),schemaVersion:1,lifeSkills:d.lifeSkills};};
 applyBalanceConfig=(input,options={})=>{const d=validateBalanceConfig(input),result=baseApply(d,options);extras={schemaVersion:1,lifeSkills:structuredClone(d.lifeSkills)};return result;};
})();
