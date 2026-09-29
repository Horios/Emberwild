// Shared by the game and the standalone balance editor. Keep the embedded copy in
// balance-editor.html identical when changing this library.
(()=>{
  const paths={
    sword:'<path d="M36 6l6 6-19 19-6-6L36 6zM17 25l6 6M13 29l6 6M16 32 8 8m-11-5-5 5m-2 2 5-5"/>',
    axe:'<path d="M15 42 28 8m-17 34h8"/><path d="M28 8c6 0 10 2 14 6l-4 13c-6 0-10-2-14-6z" fill="currentColor" stroke="none"/>',
    hammer:'<path d="M7 9h34v12H7zM15 9v12m18-12v12M24 21v22m-4 0h8"/>',
    bow:'<path d="M12 5c21 10 21 28 0 38M12 5v38M10 24h31m-7-6 7 6-7 6"/>',
    crossbow:'<path d="M6 22h35l-6-5m6 5-6 5M35 6c10 9 10 27 0 36M35 6v36M12 26v13h12V26m-6 0v13"/>',
    staff:'<path d="M23 17v26m-5 0h10M24 5l6 6-6 6-6-6zM13 11h5m12 0h5"/>',
    shield:'<path d="M24 5l15 6v12c0 9-6 16-15 20C15 39 9 32 9 23V11zM24 12v23"/>',
    heal:'<path d="M24 41C16 35 8 28 8 19c0-7 9-11 16-4 7-7 16-3 16 4 0 9-8 16-16 22zM24 20v11m-5-5.5h10"/>',
    fire:'<path d="M25 5c2 8-3 11-2 17 3-3 5-5 9-7 4 6 8 11 8 18 0 7-7 11-16 11S8 40 8 33c0-7 5-12 11-19 0 5 2 8 4 10M24 40c-4-3-3-7 1-12 0 4 5 5 5 9 0 3-3 5-6 3z"/>',
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
    swordBlood:'<g transform="translate(-4 -5) scale(.82)"><path d="M36 6l6 6-19 19-6-6L36 6zM17 25l6 6M13 29l6 6M16 32l8 8m-11-5-5 5"/></g><g transform="translate(17 21) scale(.65)" color="#e98184" stroke="currentColor"><path d="M24 5C19 14 11 23 11 31a13 13 0 0 0 26 0C37 23 29 14 24 5z" fill="currentColor" stroke="none"/></g>',
    axeBlood:'<g transform="translate(-4 -5) scale(.82)"><path d="M15 42 28 8m-17 34h8"/><path d="M28 8c6 0 10 2 14 6l-4 13c-6 0-10-2-14-6z" fill="currentColor" stroke="none"/></g><g transform="translate(17 21) scale(.65)" color="#e98184" stroke="currentColor"><path d="M24 5C19 14 11 23 11 31a13 13 0 0 0 26 0C37 23 29 14 24 5z" fill="currentColor" stroke="none"/></g>'
  };
  const labels={sword:'劍',axe:'斧',hammer:'槌',bow:'弓',crossbow:'弩',staff:'法杖',shield:'盾牌',heal:'治療',fire:'火',ice:'冰',wind:'風',light:'光',shadow:'暗',magic:'魔法',buff:'強化',debuff:'弱化',drain:'吸取',trigger:'觸發',blood:'血滴',arrow:'箭矢',pierce:'穿透',volley:'連射',eagleEye:'鷹眼',trap:'陷阱',holy:'神聖',swordBlood:'劍＋血滴',axeBlood:'斧＋血滴'};
  const tones={steel:['sword','axe','hammer','staff','shield','swordBlood','axeBlood'],ember:['fire'],blood:['blood'],frost:['ice'],wind:['wind'],light:['light','heal','holy'],shadow:['shadow','drain'],arcane:['magic','trigger'],aim:['bow','crossbow','arrow','pierce','volley','eagleEye','trap'],neutral:['buff','debuff']};
  const colors={steel:'#cdd8df',ember:'#f2a47f',blood:'#e98184',frost:'#a9dcf4',wind:'#a9dfd6',light:'#f0d893',shadow:'#c9adea',arcane:'#d0c6f1',aim:'#dbc69e',neutral:'#d8ded5'};
  const toneByKey=Object.fromEntries(Object.entries(tones).flatMap(([tone,keys])=>keys.map(key=>[key,tone])));
  const keys=Object.keys(paths);
  const bound=(n,min,max,fallback)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
  function markupFor(type,definitions=[]){
    if(Object.hasOwn(paths,type))return paths[type];
    if(typeof type!=='string'||!type.startsWith('custom:'))return paths.magic;
    const icon=definitions.find(item=>item?.id===type.slice(7));
    if(!icon||!Array.isArray(icon.layers))return paths.magic;
    return icon.layers.slice(0,8).map(layer=>{
      if(!Object.hasOwn(paths,layer.icon))return '';
      const x=bound(layer.x,-24,24,0),y=bound(layer.y,-24,24,0),scale=bound(layer.scale,.25,2.5,1);
      const color=colors[layer.tone]||colors[toneByKey[layer.icon]]||colors.neutral;
      return `<g transform="translate(${x} ${y}) translate(24 24) scale(${scale}) translate(-24 -24)" color="${color}" stroke="currentColor">${paths[layer.icon]}</g>`;
    }).join('')||paths.magic;
  }
  function svgFor(type,definitions=[]){return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${markupFor(type,definitions)}</svg>`;}
  globalThis.__EMBERWILD_SKILL_ICONS=Object.freeze({paths:Object.freeze(paths),labels:Object.freeze(labels),keys:Object.freeze(keys),tones:Object.freeze(tones),colors:Object.freeze(colors),toneByKey:Object.freeze(toneByKey),markupFor,svgFor});
})();
