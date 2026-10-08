/* Boss recipes belong to equipment classes, independent of recruited actors. */
(()=>{
  let selectedClass=null;
  function recipeClass(){
    return Number.isInteger(selectedClass)&&CLASSES[selectedClass]?selectedClass:playerHero().job;
  }
  globalThis.setBossCraftClass=function(job){
    if(!Number.isInteger(job)||!CLASSES[job])return;
    selectedClass=job;render();
  };
  const craftBase=craftBoss;
  craftBoss=function(mapIndex,job=recipeClass()){
    const player=playerHero();
    if(!player||!Number.isInteger(job)||!CLASSES[job])return;
    ensureSharedGear();ensureAccountResources();
    return withHero(player,()=>craftBase(mapIndex,job));
  };
  bossCraftView=function(){
    const player=playerHero(),job=recipeClass();
    const tabs=`<div class="actions boss-class-tabs" role="group" aria-label="BOSS 裝備職業">${CLASSES.map((c,j)=>`<button type="button" class="${job===j?'primary':''}" aria-pressed="${job===j}" data-boss-class="${j}" onclick="setBossCraftClass(${j})">${esc(c.name)}</button>`).join('')}</div>`;
    return heading('BOSS CRAFT / 職業裝備','BOSS 製作')+tabs+withHero(player,()=>update12BossMemberView(job));
  };
})();
