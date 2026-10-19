const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {loadRuntime}=require('./headless-runtime.cjs');
const root=path.resolve(__dirname,'..'),key='emberwild-item-display';

test('item slots always include names and the display preference is UI-only and persistent',()=>{
  const r=loadRuntime(root);r.run('selectSaveSlot(1);start(0);closeModal()');
  const before=r.run('JSON.stringify(packParty())'),balance=r.run('JSON.stringify(exportableBalance())');
  const slot=r.run("itemSlotHTML('material','鍛鐵',{count:12,context:'inventory'})");
  assert.match(slot,/class="item-slot-art"/);assert.match(slot,/class="item-slot-name">鍛鐵</);assert.match(slot,/class="item-slot-count"[^>]*>×12</);
  assert.match(r.run('itemDisplayOptionsView()'),/圖示＋名稱/);assert.match(r.run('itemDisplayOptionsView()'),/僅顯示名稱/);
  assert.equal(r.run("setItemDisplayMode('name')"),true);assert.equal(r.ctx.document.documentElement.dataset.itemDisplay,'name');assert.equal(r.values.get(key),'name');
  assert.equal(r.run('JSON.stringify(packParty())'),before);assert.equal(r.run('JSON.stringify(exportableBalance())'),balance);
  assert.equal(r.run("setItemDisplayMode('unknown')"),false);
  const reload=loadRuntime(root,'index.html',Object.fromEntries(r.values));assert.equal(reload.ctx.document.documentElement.dataset.itemDisplay,'name');
  const invalid=loadRuntime(root,'index.html',{[key]:'retired-mode'});assert.equal(invalid.ctx.document.documentElement.dataset.itemDisplay,'icon-name');
  assert.deepEqual(r.errors,[]);assert.deepEqual(reload.errors,[]);assert.deepEqual(invalid.errors,[]);
});
