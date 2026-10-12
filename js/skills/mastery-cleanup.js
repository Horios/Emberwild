
(()=>{
const masterySinglePageBase=singlePagePanel;
singlePagePanel=function(page,title,view){
  return masterySinglePageBase(page,title,view).replace(/ · 技能點 \d+/g,'').replace(/技能點 \d+ · /g,'');
};
const masteryAwardXpBase=awardXP;
awardXP=function(amount){
  const originalNote=note;
  note=function(message,type){
    return originalNote(String(message).replace(/、技能點 \+0/g,'').replace(/技能點 \+0、?/g,''),type);
  };
  try{return masteryAwardXpBase(amount);}finally{note=originalNote;}
};
if(state)render();
})();
