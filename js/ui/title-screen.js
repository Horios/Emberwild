/* The title is shown only after every save hydration layer has finished. */
(function(){
  let titleOpen=true,choosingCharacter=false,pendingCreation=null,approvedCreation=null;
  const gameRender=render,gameStart=start;

  function localSaveSnapshot(){
    try{return {primary:localStorage.getItem(KEY),backup:localStorage.getItem(BACKUP_KEY)};}
    catch(e){console.warn('無法檢查本地存檔',e);return null;}
  }
  function hasLocalSave(snapshot){return snapshot.primary!==null||snapshot.backup!==null;}
  function titleView(){
    const snapshot=localSaveSnapshot(),canContinue=!!(state&&party);
    $('wallet').textContent='';
    $('app').innerHTML=`<section class="title-screen"><div class="title-screen-card"><span class="eyebrow">${esc(resolveUIText(UI_TEXT.gameSubtitle))}</span><h1>${esc(resolveUIText(UI_TEXT.gameTitle))}</h1><p>${esc(resolveUIText(UI_TEXT.homeTitle))}</p><div class="title-actions"><button class="primary" onclick="${canContinue?'continueFromTitle()':'openCharacterCreation()'}">${canContinue?'繼續遊戲':'創建角色'}</button></div>${!canContinue&&snapshot&&hasLocalSave(snapshot)?'<p class="small">偵測到本地存檔，但目前無法載入。創建角色前會要求確認。</p>':!canContinue&&!snapshot?'<p class="small">無法檢查本地存檔，暫時無法建立角色。</p>':''}</div></section>`;
    applyUITextDOM();
  }
  render=function(){
    if(titleOpen)return titleView();
    if(state)choosingCharacter=false;
    gameRender();
    if(choosingCharacter&&!state){
      const start=$('app').querySelector('.start');
      if(start)start.insertAdjacentHTML('afterbegin','<button class="title-back" onclick="backToTitle()">返回標題</button>');
    }
  };
  function showCharacterSelection(snapshot){
    pendingCreation=null;
    closeModal();
    titleOpen=false;
    choosingCharacter=true;
    approvedCreation=snapshot;
    render();
  }
  start=function(job){
    if(!Number.isInteger(job)||!CLASSES[job])return;
    if(choosingCharacter&&!state){
      const current=localSaveSnapshot();
      if(!current){toast('無法確認本地存檔，已取消建立角色');return;}
      if(!approvedCreation||current.primary!==approvedCreation.primary||current.backup!==approvedCreation.backup){
        choosingCharacter=false;approvedCreation=null;titleOpen=true;
        render();openCharacterCreation();
        return;
      }
      approvedCreation=null;
      newGame();
    }
    return gameStart(job);
  };
  window.continueFromTitle=function(){
    if(!state||!party)return render();
    titleOpen=false;
    render();
  };
  window.openCharacterCreation=function(){
    const snapshot=localSaveSnapshot();
    if(!snapshot){toast('無法確認本地存檔，請檢查瀏覽器儲存權限');return;}
    if(!hasLocalSave(snapshot))return showCharacterSelection(snapshot);
    pendingCreation=snapshot;
    $('modal').innerHTML=`<h2>發現本地存檔</h2><p>此瀏覽器仍有存檔資料，即使目前無法正確讀取或解析。繼續創建角色會清除並覆寫原有進度；請先備份原始資料。</p><div class="actions">${snapshot.primary!==null?'<button onclick="downloadRawLocalSave(\'primary\')">下載原始主存檔</button>':''}${snapshot.backup!==null?'<button onclick="downloadRawLocalSave(\'backup\')">下載原始備份存檔</button>':''}<button class="danger" onclick="confirmTitleCreation()">仍要創建角色</button><button onclick="closeModal()">取消</button></div>`;
    $('modal').showModal();
  };
  window.confirmTitleCreation=function(){
    if(!pendingCreation)return;
    const current=localSaveSnapshot();
    if(!current){toast('無法確認本地存檔，已取消建立角色');return;}
    if(current.primary!==pendingCreation.primary||current.backup!==pendingCreation.backup){
      closeModal();pendingCreation=null;
      openCharacterCreation();
      return;
    }
    showCharacterSelection(current);
  };
  window.downloadRawLocalSave=function(which){
    const key=which==='primary'?KEY:which==='backup'?BACKUP_KEY:null;
    if(!key)return;
    let raw;
    try{raw=localStorage.getItem(key);}catch{toast('無法讀取本地存檔');return;}
    if(raw===null){toast('這份本地存檔已不存在');return;}
    const link=document.createElement('a');
    link.href=URL.createObjectURL(new Blob([raw],{type:'text/plain;charset=utf-8'}));
    link.download=`emberwild-${which}-raw-${new Date().toISOString().slice(0,10)}.txt`;
    link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  };
  window.backToTitle=function(){
    if(state)return;
    choosingCharacter=false;
    approvedCreation=null;
    titleOpen=true;
    render();
  };
  render();
})();
