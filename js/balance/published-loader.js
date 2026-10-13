/* Fetch one branch-owned design document before loading any game module. */
(async()=>{
  const app=document.getElementById('app');
  try{
    const response=await fetch('data/balance.json?build='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('平衡資料無法取得（HTTP '+response.status+'）');
    const published=await response.json();
    if(published.schema!=='emberwild-balance-v1'||published.schemaVersion!==1)throw Error('不支援的平衡資料版本');
    globalThis.__EMBERWILD_PUBLISHED_BALANCE=published;
    const version=JSON.stringify(published);
    globalThis.__EMBERWILD_BALANCE_SOURCE=published;
    // An explicit preview import survives reload only while the published base is unchanged.
    const preview=/(?:^|\/)preview(?:\/|$)/.test(location.pathname);
    const key=preview?'emberwild-preview-balance-test-v1':'emberwild-balance-test-v1';
    if(preview){try{if(localStorage.getItem(key+'-published-base')===version){const raw=localStorage.getItem(key);if(raw)globalThis.__EMBERWILD_BALANCE_SOURCE=JSON.parse(raw);}}catch{}}
    for(const node of document.querySelectorAll('script[data-balance-src]')){
      await new Promise((resolve,reject)=>{const script=document.createElement('script');const url=new URL(node.getAttribute('data-balance-src'),location.href);url.searchParams.set('balance-build',String(Date.now()));script.src=url.href;script.onload=resolve;script.onerror=()=>reject(Error('模組載入失敗：'+script.src));document.body.appendChild(script);});
    }
    applyBalanceConfig(globalThis.__EMBERWILD_BALANCE_SOURCE,{persist:false});
    const importBase=importBalanceJSON;
    importBalanceJSON=async ev=>{const result=await importBase(ev);if(result){globalThis.__EMBERWILD_BALANCE_SOURCE=exportableBalance();if(preview)localStorage.setItem(key+'-published-base',version);}return result;};
    resetBalanceJSON=()=>{globalThis.__EMBERWILD_BALANCE_SOURCE=published;localStorage.removeItem(key);localStorage.removeItem(key+'-published-base');applyBalanceConfig(published,{persist:false});toast('已恢復目前發布版本的平衡資料');};
    globalThis.__EMBERWILD_BALANCE_READY=true;
    app.style.visibility='';window.dispatchEvent(new Event('emberwild-balance-ready'));
  }catch(e){
    if(typeof timer!=='undefined')clearInterval(timer);
    app.style.visibility='';app.textContent='遊戲資料載入失敗：'+e.message+'。請重新整理重試；原有存檔保留。';
    globalThis.__EMBERWILD_BALANCE_LOAD_ERROR=e.message;
  }
})();
