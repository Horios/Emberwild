
(function(){
  const style=document.createElement('style');
  style.textContent=`
  .initiative-panel.compact-initiative{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:30px;align-items:center;gap:8px;max-height:42px!important;height:42px!important;padding:4px 7px!important;overflow:hidden!important}
  .initiative-panel.compact-initiative .row{margin:0;white-space:nowrap}
  .initiative-panel.compact-initiative .row h2{font-size:11px;margin:0}
  .initiative-panel.compact-initiative .initiative-track.initiative-name-line{display:flex;height:30px!important;margin:0!important;padding:0 2px!important;gap:4px;align-items:center;white-space:nowrap;overflow-x:auto;overflow-y:hidden}
  .initiative-panel.compact-initiative .initiative-token{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-width:72px;max-width:150px;height:26px;min-height:26px;padding:1px 7px;font-size:10px;line-height:1;border:1px solid #5e8e7b;overflow:hidden}
  .initiative-panel.compact-initiative .initiative-token.enemy{border-color:#a47868}
  .initiative-panel.compact-initiative .initiative-token b{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .initiative-panel.compact-initiative .last-actions{display:none!important}
  .battle-buffs.empty-buffs{flex:0 0 34px!important;height:34px!important;min-height:34px!important;padding:5px 7px!important;display:flex;align-items:center;justify-content:space-between;gap:8px}
  .battle-buffs.empty-buffs h2{font-size:11px;margin:0}.battle-buffs.empty-buffs .small{font-size:10px}
  `;
  document.head.appendChild(style);

  if(typeof battleBuffPanel==='function'){
    const detailed=battleBuffPanel;
    battleBuffPanel=function(){
      const rows=battleBuffRows();
      if(rows.includes('目前沒有生效中的'))return `<section class="panel battle-buffs empty-buffs"><h2>生效效果</h2><span class="small">目前沒有 BUFF／DEBUFF</span></section>`;
      return detailed();
    };
  }
  if(typeof render==='function'&&typeof party!=='undefined'&&party)render();
})();
