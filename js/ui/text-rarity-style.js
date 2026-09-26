/* Shared presentation for user-defined text rarity presets. */
(()=>{
  const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:'';
  const textShadows={
    glow:'0 0 7px currentColor, 0 0 14px currentColor',shadow:'2px 2px 3px #000',
    light:'-1px -1px 1px #fff8, 1px 1px 2px #000',crisp:'1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000',
    neon:'0 0 3px currentColor, 0 0 10px #80ecff, 0 0 18px currentColor',
    fire:'0 0 5px #ffc45e, 0 0 11px #ff651e, 0 0 18px #e72d1e',
    ice:'0 0 5px #e6ffff, 0 0 12px #6de2ff, 0 0 19px #4d91ff',
    chromatic:'-2px 0 #ff5a86, 2px 0 #62eaff',glitch:'-2px 0 #ff5a86, 2px 0 #62eaff'
  };
  const fills=new Set(['rainbow','flow','aurora','gold','silver','holo','shimmer']);
  const motions=new Set(['blink','flicker','pulse','glitch','jitter','float']);
  const blocks=new Set(['gradient','stripes','inset','glass','grid','scanlines','dots','carbon','aurora','shimmer','spotlight','checker']);
  const borders=new Set(['glow','dashed','double','dotted','groove','inset','neon','rainbow','pulse','electric','march']);
  const blockAnimation={scanlines:'tr-block-scan 3s linear infinite',aurora:'tr-block-flow 6s ease-in-out infinite alternate',shimmer:'tr-block-flow 3s ease-in-out infinite'};
  const borderAnimation={rainbow:'tr-border-rainbow 4s linear infinite',pulse:'tr-border-pulse 2s ease-in-out infinite',electric:'tr-border-electric 2.3s steps(1,end) infinite'};
  let styles=[];
  try{const saved=JSON.parse(localStorage.getItem(BALANCE_KEY)||'null');if(Array.isArray(saved?.textStyles))styles=saved.textStyles;}catch{}
  globalThis.__EMBERWILD_TEXT_STYLES=styles;
  globalThis.textRarityStyleById=id=>id&&styles.find(s=>s.id===id)||null;
  globalThis.setTextRarityStyles=next=>{styles=Array.isArray(next)?structuredClone(next):[];globalThis.__EMBERWILD_TEXT_STYLES=styles;};
  globalThis.textRarityPresentation=style=>{
    if(!style)return {classes:'',attrs:'',textClasses:'',motionClasses:[]};
    const tc=color(style.textColor),bg=color(style.blockColor),border=color(style.borderColor);
    const effects=[style.textEffect1,style.textEffect2];
    const shadows=effects.filter(x=>Object.hasOwn(textShadows,x)).map(x=>textShadows[x]);
    const fill=effects.find(x=>fills.has(x))||'';
    const motionClasses=effects.filter(x=>motions.has(x)).map(x=>'tr-motion-'+x);
    const block=blocks.has(style.blockEffect)?style.blockEffect:'';
    const edge=borders.has(style.borderEffect)?style.borderEffect:'';
    const classes=['text-rarity-name',bg||border||block||edge?'tr-frame':'',block?'tr-block-'+block:'',edge?'tr-border-'+edge:''].filter(Boolean).join(' ');
    const textClasses=['tr-text',tc?'tr-custom-color':'',fill?'tr-fill-'+fill:'',shadows.length?'tr-text-effect':''].filter(Boolean).join(' ');
    const animations=[blockAnimation[block],borderAnimation[edge]].filter(Boolean);
    const vars=[tc&&`--tr-color:${tc}`,bg&&`--tr-bg:${bg}`,border&&`--tr-border:${border}`,shadows.length&&`--tr-shadow:${shadows.join(',')}`,animations.length&&`animation:${animations.join(',')}`].filter(Boolean).join(';');
    return {classes,attrs:vars?` style="${vars}"`:'',textClasses,motionClasses};
  };
  globalThis.textRarityFrameHTML=(content,style)=>{
    const {classes,attrs,motionClasses}=textRarityPresentation(style);
    return `<span class="${classes}"${attrs}>${motionClasses.map(x=>`<span class="tr-motion ${x}">`).join('')}${content}${'</span>'.repeat(motionClasses.length)}</span>`;
  };
  globalThis.textRarityItemHTML=item=>{
    const style=textRarityStyleById(item?.textStyleId);
    if(!style)return esc(item?.name||'');
    const {textClasses}=textRarityPresentation(style);
    return textRarityFrameHTML(`<span class="${textClasses}">${esc(item.name||'')}</span>`,style);
  };
})();
