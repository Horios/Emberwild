// Combat updates must not replace a control between pointerdown and click.
(function(){
  const gameRender=render,gameRefreshJournal=refreshGlobalJournal;
  const pointers=new Set();
  let interacting=false,pendingRender=false,pendingJournal=false,releaseTimer=null,activeSelect=null;

  function finishInteraction(){
    if(pointers.size||activeSelect)return;
    clearTimeout(releaseTimer);releaseTimer=null;
    interacting=false;
    if(pendingRender){pendingRender=false;pendingJournal=false;gameRender();}
    else if(pendingJournal){pendingJournal=false;gameRefreshJournal();}
  }
  function scheduleRelease(delay){
    clearTimeout(releaseTimer);
    releaseTimer=setTimeout(finishInteraction,delay);
  }
  function holdSelect(select){
    activeSelect=select;
    interacting=true;
    clearTimeout(releaseTimer);releaseTimer=null;
  }
  function releaseSelect(event){
    if(event.target!==activeSelect)return;
    activeSelect=null;
    if(!pointers.size)scheduleRelease(0);
  }

  render=function(){
    if(interacting){pendingRender=true;return;}
    return gameRender();
  };
  refreshGlobalJournal=function(){
    if(interacting){pendingJournal=true;return;}
    return gameRefreshJournal();
  };

  document.addEventListener('pointerdown',event=>{
    if(activeSelect&&!activeSelect.contains(event.target)){
      activeSelect=null;
      scheduleRelease(0);
    }
    const select=event.target.closest?.('#app select');
    if(select)holdSelect(select);
    if(event.target.closest?.('#app button, #app a, #app input, #app select, #app textarea, #app label, #app summary, #app [role="button"]')){
      clearTimeout(releaseTimer);releaseTimer=null;
      pointers.add(event.pointerId);
      interacting=true;
    }
  },true);
  document.addEventListener('pointerup',event=>{
    if(!pointers.delete(event.pointerId))return;
    // A touch click can arrive after pointerup; click below releases immediately.
    if(!pointers.size)scheduleRelease(500);
  },true);
  document.addEventListener('click',()=>{
    if(interacting&&!pointers.size&&!activeSelect)scheduleRelease(0);
  },true);
  document.addEventListener('keydown',event=>{
    if(!event.target.matches?.('#app select'))return;
    if(event.key==='Escape')releaseSelect(event);
    else if([' ','Enter','ArrowDown','ArrowUp','Home','End','PageUp','PageDown'].includes(event.key))holdSelect(event.target);
  },true);
  document.addEventListener('change',releaseSelect,true);
  document.addEventListener('focusout',releaseSelect,true);
  document.addEventListener('pointercancel',event=>{
    if(pointers.delete(event.pointerId))scheduleRelease(0);
  },true);
  window.addEventListener('blur',()=>{pointers.clear();scheduleRelease(0);});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){activeSelect=null;pointers.clear();scheduleRelease(0);}
  });
})();
