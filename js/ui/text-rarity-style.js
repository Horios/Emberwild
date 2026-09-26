/* Shared presentation for user-defined text rarity presets. */
(()=>{
  const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:'';
  const textShadows={glow:'0 0 7px currentColor, 0 0 14px currentColor',shadow:'2px 2px 3px #000',light:'-1px -1px 1px #fff8, 1px 1px 2px #000',crisp:'1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000'};
  const blocks=new Set(['gradient','stripes','inset']);
  const borders=new Set(['glow','dashed','double']);
  let styles=[];
  try{const saved=JSON.parse(localStorage.getItem(BALANCE_KEY)||'null');if(Array.isArray(saved?.textStyles))styles=saved.textStyles;}catch{}
  globalThis.__EMBERWILD_TEXT_STYLES=styles;
  globalThis.textRarityStyleById=id=>id&&styles.find(s=>s.id===id)||null;
  globalThis.setTextRarityStyles=next=>{styles=Array.isArray(next)?structuredClone(next):[];globalThis.__EMBERWILD_TEXT_STYLES=styles;};
  globalThis.textRarityPresentation=style=>{
    if(!style)return {classes:'',attrs:''};
    const tc=color(style.textColor),bg=color(style.blockColor),border=color(style.borderColor);
    const shadows=[style.textEffect1,style.textEffect2].filter(x=>Object.hasOwn(textShadows,x)).map(x=>textShadows[x]);
    const block=blocks.has(style.blockEffect)?style.blockEffect:'';
    const edge=borders.has(style.borderEffect)?style.borderEffect:'';
    const classes=['text-rarity-name',tc?'tr-custom-color':'',bg||border||block||edge?'tr-frame':'',block?'tr-block-'+block:'',edge?'tr-border-'+edge:'',shadows.length?'tr-text-effect':''].filter(Boolean).join(' ');
    const vars=[tc&&`--tr-color:${tc}`,bg&&`--tr-bg:${bg}`,border&&`--tr-border:${border}`,shadows.length&&`--tr-shadow:${shadows.join(',')}`].filter(Boolean).join(';');
    return {classes,attrs:vars?` style="${vars}"`:''};
  };
  globalThis.textRarityItemHTML=item=>{
    const style=textRarityStyleById(item?.textStyleId);
    if(!style)return esc(item?.name||'');
    const {classes,attrs}=textRarityPresentation(style);
    return `<span class="${classes}"${attrs}>${esc(item.name||'')}</span>`;
  };
})();
