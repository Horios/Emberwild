/* Shared display-only inventory icon contract. Uses the existing SVG library. */
(function(root){
  const kinds=['item','material','gem','token'],copy=x=>structuredClone(x);
  const materialGlyphs={'鍛鐵':'anvil','粉塵':'sparkles','以太鍛鐵':'anvil','光輝碎塊':'sparkles','紅色草':'leaf','紅色草泥':'flask-conical','小蟲':'bug','清水':'droplet','藥水瓶':'flask-round','升級卷軸':'scroll-text'};
  const tokenGlyphs={berserk:'swords',guardian:'shield',pursuit:'crosshair',arcane:'wand-sparkles',echo:'audio-lines',hunt:'bow-arrow',prayer:'hand-heart',revival:'heart-pulse',plunder:'droplets',endurance:'hourglass'};
  function fallback(kind,key,item){
    if(kind==='material')return 'lucide:'+(materialGlyphs[key]||(/牙|骨/.test(key)?'bone':/翼|羽/.test(key)?'feather':/晶|石/.test(key)?'gem':/齒輪/.test(key)?'cog':'package'));
    if(kind==='gem')return 'lucide:gem';if(kind==='token')return 'lucide:'+(tokenGlyphs[key]||'medal');
    const type=item?.type||'',ticket=key==='level_scroll'||key.startsWith('companion-ticket-')||type==='levelScroll'||type==='timedBoost';
    return 'lucide:'+(ticket?'ticket':['healPotion','imbue','ward','elementTonic'].includes(type)?'flask-round':type==='gearTierReroll'?'sparkles':'package');
  }
  function entries(doc){
    const out=[],seen=new Set(),add=(kind,key,name,item)=>{key=String(key);const id=kind+':'+key;if(!key||seen.has(id))return;seen.add(id);out.push({id,kind,key,name:name||key,fallback:fallback(kind,key,item)});};
    for(const item of doc.items||[])add('item',item.id,item.name,item);add('item','level_scroll','升級卷軸');
    for(const p of doc.companions||[])if(p.unlockCondition?.type==='ticket')add('item','companion-ticket-'+p.id,p.name+'招募券');
    for(const key of ['鍛鐵','粉塵','以太鍛鐵','光輝碎塊','紅色草','紅色草泥','小蟲','清水','藥水瓶'])add('material',key,key);
    for(const r of doc.balanceSettings?.economy?.materialPrices||[])if(r.key!=='升級卷軸')add('material',r.key,r.key);
    for(const m of doc.balanceSettings?.monsters?.catalog||[])if(m.material)add('material',m.material,m.material);
    for(const r of [...(doc.balanceSettings?.drops?.entries||[]),...(doc.balanceSettings?.equipment?.salvage?.extraRewards||[])])if(r.type==='material')add('material',r.key,r.key);
    for(const r of [...(doc.lifeSkills?.gathering||[]),...Object.values(doc.lifeSkills?.recipes||{})]){
      for(const p of [r,...(r.bonusDrops||[])])if(p.outputType==='material')add('material',p.output,p.output);
      for(const [key,,type='material'] of r.inputs||[])if(type==='material')add('material',key,key);
    }
    ['赤焰石','疾風石','共鳴石'].forEach((name,i)=>add('gem',i,name));
    for(const t of doc.companionTokens?.catalog||[])add('token',t.id,t.name);
    for(const r of doc.inventoryIcons||[])if(r.kind==='material')add('material',r.key,r.key);
    return out;
  }
  function issues(doc,library=root.__EMBERWILD_SKILL_ICONS){
    if(doc.inventoryIcons===undefined)return [];
    if(!Array.isArray(doc.inventoryIcons)||doc.inventoryIcons.length>2000)return ['道具圖示必須是最多 2000 筆的陣列'];
    const errors=[],seen=new Set(),custom=new Set((doc.skillIcons||[]).map(x=>x.id));
    const known=new Set(entries({...doc,inventoryIcons:[]}).map(x=>x.id));
    for(const [i,r] of doc.inventoryIcons.entries()){
      if(!r||!kinds.includes(r.kind)||typeof r.key!=='string'||!r.key.trim()||r.key.length>100||['__proto__','constructor','prototype'].includes(r.key)){errors.push('道具圖示第 '+(i+1)+' 筆種類或名稱無效');continue;}
      const id=r.kind+':'+r.key;if(seen.has(id))errors.push('道具圖示重複：'+id);seen.add(id);
      if(r.kind!=='material'&&!known.has(id))errors.push('道具圖示引用不存在的道具：'+id);
      const type=r.iconType,valid=typeof type==='string'&&(type==='auto'||(type.startsWith('custom:')?custom.has(type.slice(7)):library?(type==='none'||library.hasIcon(type)):/^(?:lucide:)?[a-z][a-z0-9-]*$/.test(type)));
      if(!valid)errors.push('道具圖示引用不存在或無效的圖示：'+id);
    }
    return errors;
  }
  function validate(doc,library){const errors=issues(doc,library);if(errors.length)throw Error(errors.join('\n'));return doc.inventoryIcons===undefined?undefined:copy(doc.inventoryIcons);}
  const api={VERSION:1,kinds,entries,fallback,issues,validate};root.EmberwildInventoryIcons=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
