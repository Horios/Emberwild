// Shared by the game and the standalone balance editor. Keep the embedded copy in
// balance-editor.html identical when changing this library.
(()=>{
  const paths={
    sword:'<path d="M29 5 34 10 22 30l-4-4z" fill="currentColor" stroke="none"/><path d="M15 27l10 6M20 30l-6 10M11 39l6 3"/>',
    axe:'<path d="M30 8 18 43M14 43h8"/><path d="M29 9c-7-3-14-2-21 2l4 12c7-1 12-4 17-9z" fill="currentColor" stroke="none"/>',
    hammer:'<path d="M9 9h30v12H9zM14 12h20M24 21v22M20 43h8"/>',
    bow:'<path d="M13 5c21 9 21 29 0 38M13 5v38"/>',
    crossbow:'<path d="M6 13c8-6 28-6 36 0M6 13c8 8 28 8 36 0M6 13h36M24 13v25M18 38h12M20 38l-3 5M28 38l3 5"/>',
    staff:'<circle cx="24" cy="10" r="6"/><path d="M24 16v27M20 43h8M18 10h-5M30 10h5"/>',
    grimoire:'<path d="M11 10h22l5 5v26H16l-5-5zM16 10v31M16 16h16M16 23h16M16 30h12"/>',
    prayerBook:'<path d="M24 15c-5-4-10-5-16-4v25c6-1 11 0 16 4M24 15c5-4 10-5 16-4v25c-6-1-11 0-16 4zM24 15v25M14 18h6m8 0h6"/>',
    holyStaff:'<circle cx="24" cy="10" r="6"/><path d="M24 4v12M18 10h12M24 16v27M20 43h8"/>',
    shield:'<path d="M24 5l15 6v12c0 9-6 16-15 20C15 39 9 32 9 23V11zM24 12v23"/>',
    heal:'<path d="M24 41C16 35 8 28 8 19c0-7 9-11 16-4 7-7 16-3 16 4 0 9-8 16-16 22zM24 20v11m-5-5.5h10"/>',
    fire:'<path d="M27 5c1 8-7 11-5 20 2-4 5-7 9-10 1 6 9 10 9 19 0 7-7 11-16 11S8 40 8 33c0-8 6-14 12-21-1 7 1 11 5 14-2-8 5-12 2-21z"/><path d="M24 40c-4-3-3-7 1-12 0 4 5 5 5 9 0 3-3 5-6 3z"/>',
    ice:'<path d="M24 5v38M8 15l32 18M40 15 8 33M19 10l5 5 5-5m-10 28 5-5 5 5M9 22l7 1-2-7m25 10-7-1 2 7m0-16-2 7 7-1M14 32l2-7-7 1"/>',
    wind:'<path d="M6 17h23c7 0 7-9 1-9-3 0-5 2-5 4M6 24h35M6 31h22c7 0 7 9 1 9-3 0-5-2-5-4"/>',
    light:'<circle cx="24" cy="24" r="8"/><path d="M24 4v9m0 22v9M4 24h9m22 0h9M10 10l7 7m14 14 7 7m0-28-7 7M17 31l-7 7"/>',
    shadow:'<path d="M35 37A17 17 0 1 1 28 6c-7 6-9 16-4 23 3 5 7 7 11 8zM34 9v7m-3-4h6"/>',
    magic:'<circle cx="24" cy="24" r="18"/><path d="M24 9l5 10 10 5-10 5-5 10-5-10-10-5 10-5z"/>',
    buff:'<path d="M24 40V11m-10 11 10-11 10 11M10 40h28"/>',
    debuff:'<path d="M24 8v29m-10-11 10 11 10-11M10 8h28"/>',
    drain:'<path d="M24 5C20 12 11 23 11 31a13 13 0 0 0 26 0C37 23 28 12 24 5zM17 30c0 5 3 8 8 8"/>',
    trigger:'<path d="M28 5 11 27h12l-3 16 17-23H25z"/>',
    blood:'<path d="M24 5C19 14 11 23 11 31a13 13 0 0 0 26 0C37 23 29 14 24 5z" fill="currentColor" stroke="none"/><path d="M17 31c0 4 2 7 6 8"/>',
    arrow:'<path d="M5 24h37m-9-9 9 9-9 9M10 20v8"/>',
    pierce:'<circle cx="23" cy="24" r="12"/><path d="M4 24h40m-8-8 8 8-8 8"/>',
    volley:'<path d="M6 12h35m-8-6 8 6-8 6M6 24h35m-8-6 8 6-8 6M6 36h35m-8-6 8 6-8 6"/>',
    eagleEye:'<path d="M5 24c5-8 12-12 19-12s14 4 19 12c-5 8-12 12-19 12S10 32 5 24z"/><circle cx="24" cy="24" r="6"/><circle cx="24" cy="24" r="2" fill="currentColor" stroke="none"/>',
    trap:'<path d="M7 17c7-11 27-11 34 0M7 31c7 11 27 11 34 0M7 17l6 8 5-9 6 9 6-9 5 9 6-8M7 31l6-8 5 9 6-9 6 9 5-9 6 8M7 17v14m34-14v14"/>',
    holy:'<path d="M24 5v38M12 18h24M20 5h8M20 43h8M8 8l3 3m29-3-3 3"/>',
    swordBlood:'<g transform="translate(-5 -4) scale(.82)"><path d="M29 5 34 10 22 30l-4-4z" fill="currentColor" stroke="none"/><path d="M15 27l10 6M20 30l-6 10M11 39l6 3"/></g><g transform="translate(17 21) scale(.65)" color="#e98184" stroke="currentColor"><path d="M24 5C19 14 11 23 11 31a13 13 0 0 0 26 0C37 23 29 14 24 5z" fill="currentColor" stroke="none"/></g>',
    axeBlood:'<g transform="translate(-5 -4) scale(.82)"><path d="M30 8 18 43M14 43h8"/><path d="M29 9c-7-3-14-2-21 2l4 12c7-1 12-4 17-9z" fill="currentColor" stroke="none"/></g><g transform="translate(17 21) scale(.65)" color="#e98184" stroke="currentColor"><path d="M24 5C19 14 11 23 11 31a13 13 0 0 0 26 0C37 23 29 14 24 5z" fill="currentColor" stroke="none"/></g>'
  };
  const labels={sword:'劍',axe:'斧',hammer:'槌',bow:'弓',crossbow:'弩',staff:'法杖',grimoire:'法書',prayerBook:'祈禱書',holyStaff:'聖杖',shield:'盾牌',heal:'治療',fire:'火',ice:'冰',wind:'風',light:'光',shadow:'暗',magic:'魔法',buff:'強化',debuff:'弱化',drain:'吸取',trigger:'觸發',blood:'血滴',arrow:'箭矢',pierce:'穿透',volley:'連射',eagleEye:'鷹眼',trap:'陷阱',holy:'神聖',swordBlood:'劍＋血滴',axeBlood:'斧＋血滴'};
  const tones={steel:['sword','axe','hammer','staff','shield','swordBlood','axeBlood'],ember:['fire'],blood:['blood'],frost:['ice'],wind:['wind'],light:['light','heal','holy','prayerBook','holyStaff'],shadow:['shadow','drain'],arcane:['magic','trigger','grimoire'],aim:['bow','crossbow','arrow','pierce','volley','eagleEye','trap'],neutral:['buff','debuff']};
  const colors={steel:'#cdd8df',ember:'#f2a47f',blood:'#e98184',frost:'#a9dcf4',wind:'#a9dfd6',light:'#f0d893',shadow:'#c9adea',arcane:'#d0c6f1',aim:'#dbc69e',neutral:'#d8ded5'};
  const toneByKey=Object.fromEntries(Object.entries(tones).flatMap(([tone,keys])=>keys.map(key=>[key,tone])));
  const keys=Object.keys(paths);
  const shapeKinds=['icon','line','rect','ellipse','arc','polygon'];
  const bound=(n,min,max,fallback)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
  const num=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
  const toneColor=(tone,fallbackKey='magic')=>colors[tone]||colors[toneByKey[fallbackKey]]||colors.neutral;
  const escAttr=v=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function normalizeLayer(layer){
    if(!layer||typeof layer!=='object')return null;
    if(!layer.kind&&layer.icon)layer.kind='icon';
    if(!shapeKinds.includes(layer.kind||''))layer.kind='icon';
    if(layer.kind==='icon'){
      return {kind:'icon',icon:Object.hasOwn(paths,layer.icon)?layer.icon:'magic',x:bound(num(layer.x),-24,24,0),y:bound(num(layer.y),-24,24,0),scale:bound(num(layer.scale,1),.25,2.5,1),rotation:bound(num(layer.rotation),-180,180,0),tone:layer.tone&&Object.hasOwn(colors,layer.tone)?layer.tone:undefined};
    }
    if(layer.kind==='line'){
      return {kind:'line',x:bound(num(layer.x),-24,24,0),y:bound(num(layer.y),-24,24,0),length:bound(num(layer.length,18),2,64,18),rotation:bound(num(layer.rotation),-180,180,0),strokeWidth:bound(num(layer.strokeWidth,2.7),.4,10,2.7),tone:layer.tone&&Object.hasOwn(colors,layer.tone)?layer.tone:'neutral'};
    }
    if(layer.kind==='rect'){
      return {kind:'rect',x:bound(num(layer.x),-24,24,0),y:bound(num(layer.y),-24,24,0),w:bound(num(layer.w,16),1,64,16),h:bound(num(layer.h,16),1,64,16),radius:bound(num(layer.radius),0,24,0),rotation:bound(num(layer.rotation),-180,180,0),strokeWidth:bound(num(layer.strokeWidth,2.4),.4,10,2.4),strokeTone:layer.strokeTone&&Object.hasOwn(colors,layer.strokeTone)?layer.strokeTone:'neutral',filled:!!layer.filled,fillTone:layer.fillTone&&Object.hasOwn(colors,layer.fillTone)?layer.fillTone:(!!layer.filled?'neutral':'')};
    }
    if(layer.kind==='ellipse'){
      return {kind:'ellipse',x:bound(num(layer.x),-24,24,0),y:bound(num(layer.y),-24,24,0),rx:bound(num(layer.rx,8),.5,32,8),ry:bound(num(layer.ry,8),.5,32,8),rotation:bound(num(layer.rotation),-180,180,0),strokeWidth:bound(num(layer.strokeWidth,2.4),.4,10,2.4),strokeTone:layer.strokeTone&&Object.hasOwn(colors,layer.strokeTone)?layer.strokeTone:'neutral',filled:!!layer.filled,fillTone:layer.fillTone&&Object.hasOwn(colors,layer.fillTone)?layer.fillTone:(!!layer.filled?'neutral':'')};
    }
    if(layer.kind==='arc'){
      return {kind:'arc',x:bound(num(layer.x),-24,24,0),y:bound(num(layer.y),-24,24,0),r:bound(num(layer.r,10),.5,32,10),start:bound(num(layer.start,-110),-360,360,-110),end:bound(num(layer.end,110),-360,360,110),rotation:bound(num(layer.rotation),-180,180,0),strokeWidth:bound(num(layer.strokeWidth,2.4),.4,10,2.4),tone:layer.tone&&Object.hasOwn(colors,layer.tone)?layer.tone:'neutral'};
    }
    const points=String(layer.points||'-6,-10 8,0 -6,10').trim().replace(/[^0-9, .\-]/g,'').replace(/\s+/g,' ');
    return {kind:'polygon',x:bound(num(layer.x),-24,24,0),y:bound(num(layer.y),-24,24,0),points:points||'-6,-10 8,0 -6,10',scale:bound(num(layer.scale,1),.2,4,1),rotation:bound(num(layer.rotation),-180,180,0),strokeWidth:bound(num(layer.strokeWidth,2.4),.4,10,2.4),strokeTone:layer.strokeTone&&Object.hasOwn(colors,layer.strokeTone)?layer.strokeTone:'neutral',filled:!!layer.filled,fillTone:layer.fillTone&&Object.hasOwn(colors,layer.fillTone)?layer.fillTone:(!!layer.filled?'neutral':'')};
  }
  function polygonBounds(points){
    const nums=String(points||'').trim().split(/\s+/).map(pair=>pair.split(',').map(Number)).filter(pair=>pair.length===2&&pair.every(Number.isFinite));
    if(!nums.length)return {x:-8,y:-8,w:16,h:16};
    const xs=nums.map(([x])=>x),ys=nums.map(([,y])=>y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    return {x:minX,y:minY,w:maxX-minX||1,h:maxY-minY||1};
  }
  function arcPath(r,start,end){
    const s=(start-90)*Math.PI/180,e=(end-90)*Math.PI/180;
    const sx=(Math.cos(s)*r).toFixed(2),sy=(Math.sin(s)*r).toFixed(2),ex=(Math.cos(e)*r).toFixed(2),ey=(Math.sin(e)*r).toFixed(2);
    let delta=((end-start)%360+360)%360;if(delta>359.5)delta=359.5;
    const large=delta>180?1:0,sweep=delta>=0?1:0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} ${sweep} ${ex} ${ey}`;
  }
  function layerBounds(layer){
    const L=normalizeLayer(layer);if(!L)return {x:4,y:4,w:40,h:40};
    if(L.kind==='icon')return {x:4,y:4,w:40,h:40};
    if(L.kind==='line')return {x:24+L.x-L.length/2,y:24+L.y-L.strokeWidth,w:L.length,h:L.strokeWidth*2};
    if(L.kind==='rect')return {x:24+L.x-L.w/2,y:24+L.y-L.h/2,w:L.w,h:L.h};
    if(L.kind==='ellipse')return {x:24+L.x-L.rx,y:24+L.y-L.ry,w:L.rx*2,h:L.ry*2};
    if(L.kind==='arc')return {x:24+L.x-L.r,y:24+L.y-L.r,w:L.r*2,h:L.r*2};
    const b=polygonBounds(L.points);return {x:24+L.x+b.x*L.scale,y:24+L.y+b.y*L.scale,w:b.w*L.scale,h:b.h*L.scale};
  }
  function layerMarkup(rawLayer){
    const layer=normalizeLayer(rawLayer);if(!layer)return '';
    if(layer.kind==='icon'){
      const color=toneColor(layer.tone,layer.icon);
      return `<g transform="translate(${layer.x} ${layer.y}) translate(24 24) rotate(${layer.rotation}) scale(${layer.scale}) translate(-24 -24)" color="${color}" stroke="currentColor">${paths[layer.icon]}</g>`;
    }
    if(layer.kind==='line')return `<g transform="translate(${24+layer.x} ${24+layer.y}) rotate(${layer.rotation})" color="${toneColor(layer.tone)}"><line x1="${-layer.length/2}" y1="0" x2="${layer.length/2}" y2="0" stroke="currentColor" stroke-width="${layer.strokeWidth}" stroke-linecap="round"/></g>`;
    if(layer.kind==='rect')return `<g transform="translate(${24+layer.x} ${24+layer.y}) rotate(${layer.rotation})"><rect x="${-layer.w/2}" y="${-layer.h/2}" width="${layer.w}" height="${layer.h}" rx="${layer.radius}" fill="${layer.filled?toneColor(layer.fillTone||layer.strokeTone):'none'}" stroke="${toneColor(layer.strokeTone)}" stroke-width="${layer.strokeWidth}"/></g>`;
    if(layer.kind==='ellipse')return `<g transform="translate(${24+layer.x} ${24+layer.y}) rotate(${layer.rotation})"><ellipse cx="0" cy="0" rx="${layer.rx}" ry="${layer.ry}" fill="${layer.filled?toneColor(layer.fillTone||layer.strokeTone):'none'}" stroke="${toneColor(layer.strokeTone)}" stroke-width="${layer.strokeWidth}"/></g>`;
    if(layer.kind==='arc')return `<g transform="translate(${24+layer.x} ${24+layer.y}) rotate(${layer.rotation})" color="${toneColor(layer.tone)}"><path d="${arcPath(layer.r,layer.start,layer.end)}" fill="none" stroke="currentColor" stroke-width="${layer.strokeWidth}"/></g>`;
    return `<g transform="translate(${24+layer.x} ${24+layer.y}) rotate(${layer.rotation}) scale(${layer.scale})"><polygon points="${escAttr(layer.points)}" fill="${layer.filled?toneColor(layer.fillTone||layer.strokeTone):'none'}" stroke="${toneColor(layer.strokeTone)}" stroke-width="${layer.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/></g>`;
  }
  function markupFor(type,definitions=[]){
    if(Object.hasOwn(paths,type))return paths[type];
    if(typeof type!=='string'||!type.startsWith('custom:'))return paths.magic;
    const icon=definitions.find(item=>item?.id===type.slice(7));
    if(!icon||!Array.isArray(icon.layers))return paths.magic;
    return icon.layers.slice(0,8).map(layerMarkup).join('')||paths.magic;
  }
  function svgFor(type,definitions=[]){return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${markupFor(type,definitions)}</svg>`;}
  globalThis.__EMBERWILD_SKILL_ICONS=Object.freeze({paths:Object.freeze(paths),labels:Object.freeze(labels),keys:Object.freeze(keys),tones:Object.freeze(tones),colors:Object.freeze(colors),toneByKey:Object.freeze(toneByKey),shapeKinds:Object.freeze(shapeKinds),normalizeLayer,layerBounds,layerMarkup,markupFor,svgFor});
})();
