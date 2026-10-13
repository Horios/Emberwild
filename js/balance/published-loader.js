/* Fetch one branch-owned design document before loading any game module. */
(async()=>{
  const app=document.getElementById('app');
  const guard=document.createElement('style');guard.textContent='#app{visibility:hidden!important}body{pointer-events:none}';document.head.appendChild(guard);
  try{
    const metadataResponse=await fetch('data/build.json?build='+Date.now(),{cache:'no-store'});
    if(!metadataResponse.ok)throw Error('版本資訊無法取得');
    const build=await metadataResponse.json(),runtimeVersion=build.commit==='development'?String(Date.now()):build.commit;
    const response=await fetch('data/balance.json?build='+runtimeVersion,{cache:'no-store'});
    if(!response.ok)throw Error('平衡資料無法取得（HTTP '+response.status+'）');
    const published=await response.json();
    if(published.schema!=='emberwild-balance-v1'||published.schemaVersion!==1)throw Error('不支援的平衡資料版本');
    const issues=EmberwildBalanceDocument.inspect(published);if(issues.length)throw Error(issues.map(x=>x.field+'：'+x.reason).join('；'));
    globalThis.__EMBERWILD_PUBLISHED_BALANCE=published;
    const version=JSON.stringify(published);
    globalThis.__EMBERWILD_BALANCE_SOURCE=published;
    // An explicit preview import survives reload only while the published base is unchanged.
    const preview=/(?:^|\/)preview(?:\/|$)/.test(location.pathname);
    const key=preview?'emberwild-preview-balance-test-v1':'emberwild-balance-test-v1';
    if(preview){try{if(localStorage.getItem(key+'-published-base')===version){const raw=localStorage.getItem(key);if(raw)globalThis.__EMBERWILD_BALANCE_SOURCE=JSON.parse(raw);}}catch{}}
    for(const node of document.querySelectorAll('script[data-balance-src]')){
      await new Promise((resolve,reject)=>{const script=document.createElement('script');const url=new URL(node.getAttribute('data-balance-src'),location.href);url.searchParams.set('balance-build',runtimeVersion);script.src=url.href;script.onload=resolve;script.onerror=()=>reject(Error('模組載入失敗：'+script.src));document.body.appendChild(script);});
    }
    applyBalanceConfig(globalThis.__EMBERWILD_BALANCE_SOURCE,{persist:false});
    const playerBytes=globalThis.__EMBERWILD_TEAM_BOOT_RAW||globalThis.__EMBERWILD_BOOT_SAVE_RAW;
    if(playerBytes){try{loadParty(JSON.parse(playerBytes));globalThis.__EMBERWILD_BOOT_SAVE_ERROR=null;}catch(error){party=null;state=null;running=false;globalThis.__EMBERWILD_BOOT_SAVE_ERROR=String(error.message||error);if(typeof backToTitle==='function')backToTitle();else render();}}
    const importBase=importBalanceJSON;
    importBalanceJSON=async ev=>{const result=await importBase(ev);if(result){globalThis.__EMBERWILD_BALANCE_SOURCE=exportableBalance();if(preview)localStorage.setItem(key+'-published-base',version);}return result;};
    const resetBase=resetBalanceJSON;resetBalanceJSON=()=>{const result=resetBase();if(result!==false){globalThis.__EMBERWILD_BALANCE_SOURCE=published;localStorage.removeItem(key);localStorage.removeItem(key+'-published-base');toast('已恢復目前發布版本的平衡資料');}return result;};
    globalThis.__EMBERWILD_BALANCE_READY=true;
    guard.remove();window.emberwildBootComplete=true;app.style.visibility='';window.dispatchEvent(new Event('emberwild-balance-ready'));
  }catch(e){
    if(typeof timer!=='undefined')clearInterval(timer);
    guard.remove();app.style.visibility='';app.textContent='遊戲資料載入失敗：'+e.message+'。請重新整理重試；原有存檔保留。';
    globalThis.__EMBERWILD_BALANCE_LOAD_ERROR=e.message;
  }
})();
