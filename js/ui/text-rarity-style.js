/* Shared presentation for user-defined text rarity presets. */
(()=>{
  const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:'';
  const textShadows={
    glow:'0 0 7px currentColor, 0 0 14px currentColor',shadow:'2px 2px 3px #000',
    light:'-1px -1px 1px #fff8, 1px 1px 2px #000',crisp:'1px 0 #000, -1px 0 #000, 0 1px #000, 0 -1px #000',
    softGlow:'0 0 4px currentColor, 0 0 8px currentColor',hardShadow:'3px 3px 0 #000',longShadow:'1px 1px #000,2px 2px #000,3px 3px #000,4px 4px #000',
    emboss:'-1px -1px 0 #fff8,1px 1px 0 #000b',engrave:'1px 1px 0 #fff5,-1px -1px 0 #000b',
    outlineLight:'1px 0 #fff,-1px 0 #fff,0 1px #fff,0 -1px #fff',outlineDark:'1px 0 #111,-1px 0 #111,0 1px #111,0 -1px #111',
    neon:'0 0 3px currentColor, 0 0 10px #80ecff, 0 0 18px currentColor',
    fire:'0 0 5px #ffc45e, 0 0 11px #ff651e, 0 0 18px #e72d1e',
    ice:'0 0 5px #e6ffff, 0 0 12px #6de2ff, 0 0 19px #4d91ff',
    chromatic:'-2px 0 #ff5a86, 2px 0 #62eaff',glitch:'-2px 0 #ff5a86, 2px 0 #62eaff',
    toxicGlow:'0 0 5px #dfff6b,0 0 12px #7cff45,0 0 18px #2dff88',
    voidGlow:'0 0 5px #c49bff,0 0 12px #7b52ff,0 0 20px #351a79',
    holyGlow:'0 0 4px #fff,0 0 10px #ffe79a,0 0 18px #ffc84d',
    bloodGlow:'0 0 5px #ff8b8b,0 0 12px #e62828,0 0 19px #711010',
    electricGlow:'-1px 0 4px #7bf6ff,1px 0 7px #8c7bff,0 0 16px #48cfff'
  };
  const fills=new Set(['rainbow','flow','aurora','gold','silver','bronze','copper','roseGold','chrome','holo','shimmer','obsidian','magma','frost','electric','toxic','void','sunset','ocean','forest','ruby','sapphire','emerald','candy','plasma','cosmic']);
  const motions=new Set(['blink','flicker','pulse','glitch','jitter','float','shake','bounce','sway','swing','tilt','zoom','heartbeat','hue','blur','stretch','flip']);
  const specials=new Set(['alphaDemo','warmGradientDemo','movingRainbowDemo','multiGlowDemo','breatheGoldDemo','goldShineDemo','strokeShadowDemo','ultimateDemo','maxEnhanceDemo']);
  const galleryEffects={
    gallerySolid:'畫廊・純色',galleryAlpha:'畫廊・透明色',galleryGradient:'畫廊・靜態漸層',galleryRainbow:'畫廊・靜態彩虹',galleryMetal:'畫廊・金屬銀',galleryGold:'畫廊・金屬金',galleryHolo:'畫廊・全息／珠光',galleryFire:'畫廊・火焰色階',galleryIce:'畫廊・冰晶',galleryPoison:'畫廊・毒性',
    galleryGlow:'畫廊・單色發光',galleryMultiglow:'畫廊・多層光暈',galleryNeon:'畫廊・霓虹',galleryStroke:'畫廊・描邊',galleryOutlineOnly:'畫廊・空心描邊',galleryDoubleStroke:'畫廊・厚外框',galleryEmboss:'畫廊・浮雕',galleryEngrave:'畫廊・刻印',galleryShadow:'畫廊・陰影偏移',galleryChromatic:'畫廊・RGB 色差',
    galleryMove:'畫廊・流動彩虹',galleryShine:'畫廊・掃光',galleryBreathe:'畫廊・呼吸',galleryBlink:'畫廊・閃爍',galleryHue:'畫廊・色相循環',galleryFloat:'畫廊・上下浮動',galleryShake:'畫廊・震動',galleryScale:'畫廊・脈衝縮放',galleryLetter:'畫廊・字距呼吸',galleryBlur:'畫廊・模糊脈衝',galleryReveal:'畫廊・文字揭露',galleryUnderline:'畫廊・底線展開',galleryScan:'畫廊・掃描線',gallerySparkle:'畫廊・閃光點',galleryGlitch:'畫廊・故障抖動'
  };
  globalThis.__EMBERWILD_GALLERY_EFFECTS=galleryEffects;
  const blocks=new Set(['gradient','stripes','inset','glass','grid','scanlines','dots','carbon','aurora','shimmer','spotlight','checker','radial','vignette','diagonal','crosshatch','hex','circuit','rings','stars','sparkle','prism','rainbow','holo','chrome','brushed','gold','silver','bronze','magma','frost','ocean','toxic','void','plasma','electric','matrix','glitch','warning','pulse','movingStripes','waves','noise','mesh','sunset','emerald','blood','holy','shadow']);
  const borders=new Set(['glow','dashed','double','dotted','groove','inset','neon','rainbow','pulse','electric','march']);
  const blockAnimation={scanlines:'tr-block-scan 3s linear infinite',aurora:'tr-block-flow 6s ease-in-out infinite alternate',shimmer:'tr-block-flow 3s ease-in-out infinite',diagonal:'tr-block-drift 4s linear infinite',stars:'tr-block-stars 14s linear infinite',sparkle:'tr-block-sparkle 2.6s ease-in-out infinite',prism:'tr-block-flow 6s linear infinite',rainbow:'tr-block-flow 7s linear infinite',holo:'tr-block-flow 5s linear infinite',magma:'tr-block-lava 6s ease-in-out infinite',ocean:'tr-block-wave 6s linear infinite',toxic:'tr-block-drift 7s linear infinite',void:'tr-block-breathe 5s ease-in-out infinite',plasma:'tr-block-flow 5s ease-in-out infinite alternate',electric:'tr-block-electric 1.7s linear infinite',matrix:'tr-block-matrix 2.8s linear infinite',glitch:'tr-block-glitch 2.4s steps(1,end) infinite',pulse:'tr-block-breathe 2.8s ease-in-out infinite',movingStripes:'tr-block-drift 2.5s linear infinite',waves:'tr-block-wave 4.5s linear infinite',noise:'tr-block-drift 18s linear infinite',mesh:'tr-block-flow 8s ease-in-out infinite alternate',emerald:'tr-block-flow 6s linear infinite',blood:'tr-block-breathe 4s ease-in-out infinite',holy:'tr-block-breathe 3.5s ease-in-out infinite',shadow:'tr-block-flow 8s ease-in-out infinite alternate'};
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
    const galleryEffect=effects.find(x=>Object.hasOwn(galleryEffects,x));
    const specialClasses=effects.filter(x=>specials.has(x)).map(x=>'tr-special-'+x);
    if(galleryEffect)specialClasses.push('tr-special-'+galleryEffect);
    const block=blocks.has(style.blockEffect)?style.blockEffect:'';
    const edge=borders.has(style.borderEffect)?style.borderEffect:'';
    const classes=['text-rarity-name',border||edge?'tr-frame':'',edge?'tr-border-'+edge:''].filter(Boolean).join(' ');
    const textClasses=['tr-text',tc?'tr-custom-color':'',fill?'tr-fill-'+fill:'',shadows.length?'tr-text-effect':'',...specialClasses].filter(Boolean).join(' ');
    const animations=[borderAnimation[edge]].filter(Boolean);
    const vars=[tc&&`--tr-color:${tc}`,border&&`--tr-border:${border}`,shadows.length&&`--tr-shadow:${shadows.join(',')}`,animations.length&&`animation:${animations.join(',')}`].filter(Boolean).join(';');
    return {classes,attrs:vars?` style="${vars}"`:'',textClasses,motionClasses};
  };
  globalThis.textRarityBlockPresentation=style=>{
    if(!style)return {classes:'',attrs:'',bg:'',block:'',animation:''};
    const bg=color(style.blockColor),block=blocks.has(style.blockEffect)?style.blockEffect:'',animation=blockAnimation[block]||'';
    const classes=['tr-rarity-row',block?'tr-block-'+block:''].filter(Boolean).join(' ');
    const vars=[bg&&`--tr-row-bg:${bg}`,animation&&`animation:${animation}`].filter(Boolean).join(';');
    return {classes,attrs:vars?` style="${vars}"`:'',bg,block,animation};
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
