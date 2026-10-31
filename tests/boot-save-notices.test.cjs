const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs'),root=path.resolve(__dirname,'..'),seed=require('../data/balance.json');

test('published saves defer hydration until the final loader, without provisional warnings or backup recovery',()=>{
 const r=loadRuntime(root);r.run('selectSaveSlot(1);start(0);closeModal();state.consumables.speed2_120m=3;save()');
 const key=r.run('KEY'),raw=r.values.get(key),backup=r.values.get(key+'-backup');
 for(const withBackup of [false,true]){
  const storage={[key]:raw,...(withBackup?{[key+'-backup']:backup}:{})};
  const cold=loadRuntime(root,'index.html',storage,r.now,{transformSource:(file,code)=>file==='js/core/core-game.js'?
   'globalThis.__EMBERWILD_BALANCE_SOURCE='+JSON.stringify(seed)+';\n'+code+`
;globalThis.bootNotices=[];{const original=toast;toast=message=>{bootNotices.push(message);return original(message);};}`:code});
  assert(cold.run('!!state&&!!party'));assert.equal(cold.ctx.__EMBERWILD_BOOT_SAVE_ERROR,null);
  assert.equal(cold.run('state.consumables.speed2_120m'),3);
  assert(!cold.warnings.some(w=>w.includes('道具資料無效')),'published saves must not run provisional validation');
  assert(!cold.ctx.bootNotices.some(m=>/存檔未能載入|已自動恢復/.test(m)));
  for(const [k,v] of Object.entries(storage))assert.equal(cold.values.get(k),v);
 }
});
