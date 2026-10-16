/* Shared SVG item slots. Lists keep their actions; details use the existing gear
   panel or a separate dialog so opening a mail attachment never replaces mail. */
(()=>{
  let selection=null,hovered=null;
  const attr=value=>esc(String(value??''));
  const fallback='<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4M12 11v10"/></svg>';
  function gearIdentity(g){return globalThis.__EMBERWILD_GEAR_CATALOGUE_KEY?.(g)||(globalThis.EmberwildTokens?.isToken(g)?{kind:'token',key:g.tokenId}:{kind:'equipment',key:g.boss!==undefined?'boss:'+g.region+':'+g.job:'form:'+(g.formJob??g.job)+':'+g.slot+':'+(g.form||0)});}
  function definition(kind,key){
    if(kind==='item')return globalThis.__EMBERWILD_INVENTORY_STOCK?.item(key);
    if(kind==='token')return exportableBalance().companionTokens?.catalog?.find(t=>t.id===key);
    return null;
  }
  function rawName(kind,key){
    if(kind==='gem')return GEMS[Number(key)]?.name||key;
    if(kind==='item'&&key.startsWith('companion-ticket-'))return (exportableBalance().companions?.find(p=>p.id===Number(key.slice(17)))?.name||'夥伴')+'招募券';
    if(kind==='equipment'){
      const ref=globalThis.EmberwildMonsterDesign?.equipmentRef(key,exportableBalance());
      if(ref?.form)return ref.form.name;
    }
    return definition(kind,key)?.name||key;
  }
  function name(kind,key,g){return g?equipmentDisplayName(g):globalThis.__EMBERWILD_ITEM_NAME?.(kind,key,rawName(kind,key))||rawName(kind,key);}
  function icon(kind,key,g){
    let glyph=kind==='material'?(/牙|骨/.test(key)?'bone':/翼|羽/.test(key)?'feather':'package'):kind==='gem'?'gem':kind==='token'?'medal':kind==='equipment'?['sword','shirt','shield','gem'][g?.slot??Number(key.split(':')[2])??0]:'package';
    const item=definition(kind,key);
    if(kind==='equipment'&&g?.slot===0)glyph=({staff:'wand-sparkles',holyStaff:'wand-sparkles',bow:'bow-arrow',crossbow:'crosshair',axe:'axe',hammer:'hammer',grimoire:'book-open'}[g.weaponType]||glyph);
    if(kind==='item')glyph=key==='level_scroll'||key.startsWith('companion-ticket-')||item?.type==='timedBoost'?'ticket':['healPotion','imbue','ward','elementTonic'].includes(item?.type)?'flask-round':item?.type==='gearTierReroll'?'sparkles':glyph;
    if(kind==='material')glyph=({'鍛鐵':'anvil','粉塵':'sparkles','以太鍛鐵':'anvil','光輝碎塊':'sparkles','紅色草':'leaf','紅色草泥':'flask-conical','清水':'droplet','藥水瓶':'flask-round','小蟲':'bug'})[key]||glyph;
    return globalThis.__EMBERWILD_INVENTORY_ICON?.(kind,key,'lucide:'+glyph,{size:32})||globalThis.__EMBERWILD_SKILL_ICONS?.svgFor('lucide:'+glyph,[],{size:32})||fallback;
  }
  function refFromNode(node){
    const d=node.dataset,mail=d.itemMail?party?.mailbox?.messages.find(m=>m.id===Number(d.itemMail))?.attachments[Number(d.itemIndex)]:null;
    if(mail){const g=mail.gear,id=g?gearIdentity(g):mail.type==='companionTicket'?{kind:'item',key:'companion-ticket-'+mail.companionId}:{kind:mail.kind,key:mail.key};return {...id,g,quantity:mail.quantity};}
    return {kind:d.itemKind,key:d.itemKey,g:d.itemPreview?JSON.parse(d.itemPreview):d.itemGear?(findGear(d.itemGear)||(typeof pendingGearLoot!=='undefined'?pendingGearLoot.find(g=>g.id===d.itemGear):null)):null,extra:d.itemExtra};
  }
  globalThis.itemSlotHTML=function(kind,key,options={}){
    key=String(key);const g=options.gear;
    if(g)({kind,key}=gearIdentity(g));
    const n=name(kind,key,g),label=n+(options.count!==undefined?' ×'+options.count:'');
    const data=`data-item-kind="${attr(kind)}" data-item-key="${attr(key)}"${g?.id?` data-item-gear="${attr(g.id)}"`:''}${options.preview?` data-item-preview="${attr(JSON.stringify(options.preview))}"`:''}${options.mailId?` data-item-mail="${options.mailId}" data-item-index="${options.mailIndex}"`:''}${options.extra?` data-item-extra="${attr(options.extra)}"`:''}`;
    const content=`<span class="item-slot-art" aria-hidden="true">${icon(kind,key,g)}</span>${options.count!==undefined?`<span class="item-slot-count">${attr(options.count)}</span>`:''}${g?.plus?`<span class="item-slot-plus">+${g.plus}</span>`:''}${g&&typeof gearWearer==='function'&&gearWearer(g.id)?'<span class="item-slot-worn" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7"/></svg></span>':''}`;
    const tag=options.contentOnly?'span':'button';
    return `<${tag} ${tag==='button'?'type="button" ':''}class="item-slot ${options.className||''}${options.selected?' selected':''}${g?' item-quality-'+gearQualityRank(g):''}" ${data} aria-label="${attr(label)}"${tag==='button'?` onclick="${options.onclick||'openItemSlotDetails(this)'}"`:''}${options.selected?' aria-pressed="true"':''}>${content}</${tag}>`;
  };
  globalThis.gearSlotHTML=(g,options={})=>itemSlotHTML('equipment','',{...options,gear:g});
  globalThis.itemCostHTML=function(g){const c=upgradeMaterials(g);return '<span class="item-cost-line">'+[['鍛鐵',c.ore],['粉塵',c.dust],['以太鍛鐵',c.ether]].filter(([,n])=>n>0).map(([key,count])=>itemSlotHTML('material',key,{count})).join(' ＋ ')+'</span>';};
  globalThis.mailAttachmentSlot=function(mailId,index){
    const a=party.mailbox.messages.find(m=>m.id===mailId)?.attachments[index];if(!a)return '';
    const id=a.gear?gearIdentity(a.gear):a.type==='companionTicket'?{kind:'item',key:'companion-ticket-'+a.companionId}:{kind:a.kind,key:a.key};
    return itemSlotHTML(id.kind,id.key,{gear:a.gear,count:a.quantity,mailId,mailIndex:index,className:'mailbox-attachment'});
  };
  function info(ref){
    const {kind,key,g}=ref,item=definition(kind,key),description=globalThis.__EMBERWILD_ITEM_DESCRIPTION?.(kind,key)||'';
    let detail='';
    if(g)detail=`<p>${globalThis.EmberwildTokens?.isToken(g)?esc(gearDesc(g)):esc(gearWearableJobsText(g)+' · LV '+gearRequiredLevelByTier(g.tier))}</p><p class="equipment-total-summary">${globalThis.equipmentTotalSummaryHTML?.(g)||esc(gearDesc(g))}</p>${globalThis.equipmentAttributeDetailsHTML?.(g)||''}${g.starterPack?'<p>可強化；不可洗鍊詞綴或重鑄基底。</p>':''}`;
    else if(kind==='item'&&key.startsWith('companion-ticket-'))detail='<p>領取後存入背包，使用可解鎖指定夥伴；重複取得依原規則轉換。</p>';
    else if(item)detail='<p>'+esc(key==='level_scroll'?'全隊共用等級 +1':supplyDetail(item))+'</p><p>持有 '+(state?__EMBERWILD_INVENTORY_STOCK.count(key):0)+' · 售價 '+(key==='level_scroll'?materialSellPrice('升級卷軸'):typeof itemSellPrice==='function'?itemSellPrice(key):0)+' 金幣／個</p>';
    else if(kind==='gem')detail='<p>'+esc(GEMS[Number(key)]?.desc||'技能鑲嵌寶石')+'</p>';
    else if(kind==='material')detail='<p>材料庫存：'+(state?materialCount(key).toLocaleString():'0')+' · 售價 '+(typeof materialSellPrice==='function'?materialSellPrice(key):0)+' 金幣／個</p>';
    if(g&&globalThis.EmberwildTokens?.isToken(g))detail+='<p>'+esc(globalThis.companionTokenAbilityText?.(g)||'')+'</p>';
    return `<h3>${esc(name(kind,key,g))}</h3>${description?'<p>'+esc(description)+'</p>':''}${detail}${ref.extra?'<p>'+esc(ref.extra)+'</p>':''}${ref.quantity!==undefined?'<p>附件數量：'+ref.quantity+'</p>':''}`;
  }
  function controls(ref){
    const {kind,key,g}=ref;if(ref.quantity!==undefined)return '';
    if(g){
      if(!findGear(g.id))return '';
      if(globalThis.EmberwildTokens?.isToken(g)){
        const h=gearWearer(g.id),list=party.members.filter(x=>x.companionId!==undefined);
        return `<div class="actions"><select id="item-detail-token-target" aria-label="信物穿戴對象">${list.map(x=>`<option value="${memberKey(x)}" ${h===x?'selected':''}>${esc(characterName(x))}</option>`).join('')}</select><button onclick="itemDetailsAction(()=>equipCompanionToken('${g.id}',Number(document.getElementById('item-detail-token-target').value)))" ${list.length?'':'disabled'}>穿戴</button>${h?`<button onclick="itemDetailsAction(()=>unequipCompanionToken(${memberKey(h)}))">卸下</button>`:''}<button onclick="closeItemDetails();openForge('${g.id}')">強化</button><button onclick="itemDetailsAction(()=>toggleGearLock('${g.id}'))">${g.locked?'解除鎖定':'鎖定'}</button><button class="danger" onclick="closeItemDetails();salvage('${g.id}')" ${h||g.locked?'disabled':''}>分解</button></div>`;
      }
      return `<button onclick="closeItemDetails();openForge('${g.id}')">前往強化／洗鍊</button>`;
    }
    const k=attr(JSON.stringify(key)),hero=memberKey(pageHero('equipment')||playerHero());
    if(kind==='material')return `<div class="actions"><input id="item-detail-quantity" type="number" min="1" value="1" max="${materialCount(key)}" aria-label="賣出數量"><button onclick="itemDetailsAction(()=>sellMaterial(${k},document.getElementById('item-detail-quantity').value))">賣出</button><button onclick="itemDetailsAction(()=>sellMaterial(${k},materialCount(${k})))">全部賣出</button></div>`;
    if(kind==='gem')return `<div class="actions"><button onclick="closeItemDetails();setTab('skills')">前往技能鑲嵌</button>${globalThis.__EMBERWILD_CAN_SELL?.('gem',key)?`<button onclick="itemDetailsAction(()=>sellCatalogueGem(${Number(key)},1))">賣出 1 個</button><button onclick="itemDetailsAction(()=>sellCatalogueGem(${Number(key)},state.gems[${Number(key)}]))">全部賣出</button>`:''}</div>`;
    if(kind==='item'&&key.startsWith('companion-ticket-'))return `<div class="actions"><button onclick="closeItemDetails();useCompanionRecruitmentTicket(${Number(key.slice(17))})">使用招募券</button>${globalThis.__EMBERWILD_CAN_SELL?.('item',key)?`<button onclick="itemDetailsAction(()=>sellCatalogueRecruitTicket(${Number(key.slice(17))},1))">賣出 1 張</button>`:''}</div>`;
    if(kind==='item'&&definition(kind,key))return `<div class="actions"><button onclick="closeItemDetails();useInventoryItem(${k},${hero})">${isHealPotion(definition(kind,key))?'自動喝水設定':key==='power_tier_reroll'?'前往強化':'使用'}</button><input id="item-detail-quantity" type="number" min="1" value="1" max="${__EMBERWILD_INVENTORY_STOCK.count(key)}" aria-label="賣出數量"><button onclick="itemDetailsAction(()=>sellInventoryItem(${k},document.getElementById('item-detail-quantity').value))">賣出</button><button onclick="itemDetailsAction(()=>sellInventoryItem(${k},__EMBERWILD_INVENTORY_STOCK.count(${k})))">全部賣出</button></div>`;
    return '';
  }
  function dialog(){let d=document.getElementById('item-detail-dialog');if(!d){d=document.createElement('dialog');d.id='item-detail-dialog';document.body.appendChild(d);}return d;}
  function renderDetail(){const d=dialog();if(selection)d.innerHTML=`<div class="item-detail-top"><span class="item-detail-art">${icon(selection.kind,selection.key,selection.g)}</span><button onclick="closeItemDetails()" aria-label="關閉道具詳細資料">關閉</button></div>${info(selection)}${controls(selection)}`;}
  globalThis.openItemSlotDetails=function(node){selection=refFromNode(node);if(!selection.kind)return;hideTooltip();renderDetail();const d=dialog();if(!d.open)d.showModal();};
  globalThis.closeItemDetails=function(){dialog().close();selection=null;};
  globalThis.itemDetailsAction=function(action){action();if(selection)renderDetail();};
  let tooltip;
  function hideTooltip(){if(tooltip){if(typeof tooltip.hidePopover==='function'&&tooltip.matches(':popover-open'))tooltip.hidePopover();tooltip.hidden=true;}hovered=null;}
  function showTooltip(node){
    if(!node)return;hovered=node;
    if(!tooltip){tooltip=document.createElement('div');tooltip.id='item-hover-tooltip';tooltip.className='item-hover-tooltip';tooltip.setAttribute('role','tooltip');document.body.appendChild(tooltip);}
    tooltip.innerHTML=info(refFromNode(node));tooltip.hidden=false;
    if(typeof tooltip.showPopover==='function'&&!tooltip.matches(':popover-open')){tooltip.setAttribute('popover','manual');tooltip.showPopover();}
    const rect=node.getBoundingClientRect(),tip=tooltip.getBoundingClientRect();
    tooltip.style.left=Math.max(8,Math.min(rect.right+10,innerWidth-tip.width-8))+'px';
    tooltip.style.top=Math.max(8,Math.min(rect.top,innerHeight-tip.height-8))+'px';
  }
  document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const node=e.target.closest?.('[data-item-kind]');if(node&&node!==hovered)showTooltip(node);});
  document.addEventListener('pointerout',e=>{if(hovered&&!hovered.contains?.(e.relatedTarget))hideTooltip();});
  document.addEventListener('focusin',e=>{const node=e.target.closest?.('[data-item-kind]');if(node)showTooltip(node);});
  document.addEventListener('focusout',hideTooltip);
  document.addEventListener('scroll',hideTooltip,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTooltip();});
})();
