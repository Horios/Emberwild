const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {openRuntime}=require('./runtime.cjs');
const root=path.resolve(__dirname,'..');

test('equipment sockets: horizontal icons, icon gem choices, modes and disabled skillless gear on desktop/mobile',async()=>{
 const r=await openRuntime(root),p=r.page;
 try{
  await p.evaluate(()=>{
   selectSaveSlot(1);start(0);closeModal();
   const h=playerHero(),g=gear(1,3,0,h.job);
   Object.assign(g,{id:'socket-ui',skillId:'tutorial_echo',skillSockets:{version:1,count:3,gems:[null,null,null],firstMode:'skill'}});
   h.bag.push(g);h.gems=Array(15).fill(0);h.gems[0]=h.gems[1]=h.gems[12]=3;equipSharedGear(g.id,memberKey(h),3);selectSkillEquipment(g.id);
   setTab('equipment');selectInventoryGear(g.id);
  });
  const editor=p.locator('[data-socket-equipment="socket-ui"]'),mode=editor.getByLabel('第一孔效果模式');
  assert.equal(await editor.locator('.equipment-socket-choices').count(),0);
  for(const width of [1280,390]){
   await p.setViewportSize({width,height:900});
   const boxes=await editor.locator('[data-equipment-socket]').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,right:b.right};}));
   assert.equal(boxes.length,3);assert(boxes.every(b=>b.y===boxes[0].y));assert(boxes[2].x>boxes[1].x&&boxes[1].x>boxes[0].x);
   assert(boxes[2].right<=width,'socket row fits viewport');
   await editor.locator('[data-equipment-socket="0"]').click();
   assert.equal(await editor.locator('[data-equipment-gem] svg').count(),3);
   assert.equal(await editor.locator('[data-equipment-gem="14"]').count(),0);
   const bottom=await editor.evaluate(el=>{
    const wrap=el.closest('.inventory-detail-wrap'),main=el.closest('main');
    wrap.scrollTop=wrap.scrollHeight;main.scrollTop=main.scrollHeight;
    const footer=el.lastElementChild.getBoundingClientRect(),pane=wrap.getBoundingClientRect(),viewport=main.getBoundingClientRect();
    return {overflow:getComputedStyle(wrap).overflowY,at:wrap.scrollTop,max:wrap.scrollHeight-wrap.clientHeight,footerTop:footer.top,footerBottom:footer.bottom,paneTop:pane.top,paneBottom:pane.bottom,mainTop:viewport.top,mainBottom:viewport.bottom};
   });
   if(width>760){
    assert.equal(bottom.overflow,'auto');
    assert(Math.abs(bottom.at-bottom.max)<=1,'detail reaches its true bottom');
    assert(bottom.footerTop>=bottom.paneTop&&bottom.footerBottom<=bottom.paneBottom+1,'last socket instructions fit inside detail viewport');
   }else{
    assert.equal(bottom.overflow,'visible');
    assert(bottom.footerTop>=bottom.mainTop&&bottom.footerBottom<=bottom.mainBottom+1,'mobile main scroll reaches the last socket instructions');
   }

   if(width>760){
    await p.evaluate(()=>{globalThis.socketDetailDescription=__EMBERWILD_SKILLS.byId('tutorial_echo').description;__EMBERWILD_SKILLS.byId('tutorial_echo').description+=' 捲動測試內容。'.repeat(150);render();});
    const before=await editor.evaluate(el=>{const pane=el.closest('.inventory-detail-wrap');pane.scrollTop=Math.min(180,pane.scrollHeight-pane.clientHeight);return pane.scrollTop;});
    assert(before>0,'fixture must actually scroll');
    await p.evaluate(()=>{for(let n=0;n<4;n++)render();});
    assert.equal(await editor.evaluate(el=>el.closest('.inventory-detail-wrap').scrollTop),before,'automatic redraw preserves detail scroll');
    await p.evaluate(()=>{__EMBERWILD_SKILLS.byId('tutorial_echo').description=socketDetailDescription;render();});
   }
   assert.equal(await editor.locator('.equipment-socket-list select').count(),0);
   assert(await mode.evaluate(el=>el.closest('.equipment-socket-mode').previousElementSibling.classList.contains('equipment-socket-list')));
   assert.equal(await mode.isDisabled(),false);
   await editor.locator('[data-equipment-socket="0"]').click();
   await mode.selectOption('skill');
   assert.equal(await editor.locator('[data-equipment-gem="1"]').isDisabled(),true,'proc skill rejects cooldown gem');
   await editor.locator('[data-equipment-gem="0"]').click();
   assert.equal(await editor.locator('[data-equipment-socket="0"] svg').count(),1);
   assert.equal(await p.evaluate(()=>playerHero().gems[0]),2);
   await mode.selectOption('base');
   assert.equal(await editor.locator('[data-equipment-gem="1"]').isDisabled(),false);
   await editor.locator('[data-equipment-gem="1"]').click();
   assert.equal(await p.evaluate(()=>playerHero().gems[0]),3,'replacing refunds prior gem');
   assert.equal(await p.evaluate(()=>playerHero().gems[1]),2);
   await editor.locator('[data-equipment-socket="2"]').click();
   await editor.locator('[data-equipment-gem="12"]').click();
   assert.equal(await editor.locator('[data-equipment-socket="2"] svg').count(),1);
   assert.equal(await p.evaluate(()=>__EMBERWILD_EQUIPMENT_SKILLS.mode(playerHero(),findGear('socket-ui'),2)),'base');
   await editor.locator('.equipment-gem-remove').click();
   await editor.locator('[data-equipment-socket="0"]').click();
   await editor.locator('.equipment-gem-remove').click();
   assert.equal(await p.evaluate(()=>playerHero().gems[1]),3);
  }
  await p.evaluate(()=>{selectSkillEquipment(null);});
  assert.equal(await mode.isDisabled(),true);
  assert.equal(await mode.inputValue(),'base');
  await p.evaluate(()=>{delete findGear('socket-ui').skillId;render();});
  assert.equal(await mode.isDisabled(),true);
  assert.equal(await mode.locator('option[value="skill"]').isDisabled(),true);
  assert.equal(await p.evaluate(()=>{playerHero().activeSkillEquipmentId='socket-ui';return setEquipmentGemMode('socket-ui','skill');}),false,'API rejects skillless equipment even with stale active ID');
  await p.evaluate(()=>{playerHero().activeSkillEquipmentId=null;const g=findGear('socket-ui');g.skillSockets={version:1,count:0,gems:[],firstMode:'skill'};render();});
  assert.equal(await editor.locator('[data-equipment-socket]').count(),0);
  assert.equal(await mode.count(),0);
  assert.match(await editor.textContent(),/沒有鑲嵌孔/);
  assert.deepEqual(r.errors,[]);
 }finally{await r.browser.close();}
});
