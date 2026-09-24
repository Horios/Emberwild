
(function(){
  window.emberwildBootComplete=false;
  window.addEventListener('error',function(event){
    if(window.emberwildBootComplete)return;
    var app=document.getElementById('app');if(!app)return;
    app.textContent='';var panel=document.createElement('section');panel.className='panel';panel.style.margin='32px';
    var title=document.createElement('h1');title.textContent='遊戲啟動失敗';panel.appendChild(title);
    var detail=document.createElement('pre');detail.style.whiteSpace='pre-wrap';detail.textContent=String(event.message||'未知錯誤')+'\n位置：'+event.lineno+':'+event.colno;panel.appendChild(detail);
    var help=document.createElement('p');help.textContent='請將這段錯誤訊息截圖提供給我。原有存檔不會被此錯誤畫面刪除。';panel.appendChild(help);app.appendChild(panel);
  });
})();
