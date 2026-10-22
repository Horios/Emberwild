/* Expand old companion documents before late importers read positional skill metadata. */
(()=>{
  const validateBase=validateBalanceConfig,applyBase=applyBalanceConfig;
  validateBalanceConfig=function(input){return validateBase(prepareCompanionSkillDocument(input));};
  applyBalanceConfig=function(input,options){return applyBase(prepareCompanionSkillDocument(input),options);};
})();
