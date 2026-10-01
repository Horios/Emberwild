/* Account actions live in Options; balance imports are visible only in Preview. */
(function(){
  globalThis.isEmberwildPreview=function(){return /(?:^|\/)preview(?:\/|$)/.test(location.pathname)||!!document.getElementById('preview-build-banner');};
  globalThis.optionsView=function(){
    return heading('OPTIONS / 選項','選項')+`<div class="options-list">
      <section class="panel option-row"><div><h2>兌換碼</h2><p class="small">輸入兌換碼並領取獎勵。</p></div><button onclick="showTestCodes()">兌換碼</button></section>
      <section class="panel option-row"><div><h2>返回標題</h2><p class="small">儲存目前進度、暫停探索，返回存檔選擇畫面。</p></div><button onclick="returnToTitle()">返回標題</button></section>
      ${isEmberwildPreview()?`<section class="panel option-row"><div><h2>載入 JSON</h2><p class="small">套用平衡設計器匯出的測試設定。</p></div><label class="button">載入 JSON<input id="options-test-json-import" type="file" accept=".json,application/json" onchange="importBalanceJSON(event)" hidden></label></section>`:''}
    </div>`;
  };
})();
