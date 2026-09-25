'use strict';
function GS(path,fallback){
  let cur=globalThis.__EMBERWILD_GAMEPLAY_SETTINGS;
  if(!cur)return fallback;
  for(const part of String(path).split('.')){
    if(cur==null||!Object.prototype.hasOwnProperty.call(cur,part))return fallback;
    cur=cur[part];
  }
  return cur===undefined?fallback:cur;
}
function gearRequiredLevelByTier(tier){return Math.max(1,Math.round(GS('equipment.requiredLevel.base',1)+(Number(tier)-1)*GS('equipment.requiredLevel.perTier',5)));}

const CLASSES=[{name:'戰士',advanced:'破曉騎士',icon:'',desc:'堅守前線，以重擊與護盾承受攻勢。',hp:155,atk:19,def:9,main:'力量',skills:[['裂地斬','active',1,3,2.4,'damage'],['堅毅壁壘','active',4,6,1.6,'shield'],['反擊之刃','proc',7,0,.9,'damage'],['浴血重擊','proc',11,0,.45,'drain'],['聖鋼裁決','active',15,4,3.8,'damage'],['不屈戰意','proc',20,0,1.1,'shield']]},{name:'法師',advanced:'星火賢者',icon:'',desc:'法術普攻，以高倍率魔法突破敵人防線。',hp:105,atk:26,def:4,main:'智力',skills:[['火焰箭','active',1,3,2.8,'damage'],['冰霜護幕','active',4,5,1.5,'shield'],['餘燼爆發','proc',7,0,1.3,'damage'],['奧術汲取','proc',11,0,.5,'drain'],['隕星墜落','active',15,5,5.6,'damage'],['魔力迴響','proc',20,0,1.9,'damage']]},{name:'弓箭手',advanced:'逐風遊俠',icon:'',desc:'高暴擊遠程射擊，連續觸發追擊。',hp:120,atk:23,def:5,main:'敏捷',skills:[['穿透箭','active',1,3,2.6,'damage'],['林間休憩','active',4,5,1.3,'heal'],['連射','proc',7,0,1.2,'damage'],['獵手印記','proc',11,0,1.5,'damage'],['疾風箭雨','active',15,4,4,'damage'],['生命之箭','proc',20,0,.8,'drain']]},{name:'牧師',advanced:'晨光主教',icon:'',desc:'聖光普攻，治癒與庇護維持長期作戰。',hp:130,atk:20,def:7,main:'精神',skills:[['聖光審判','active',1,3,2.5,'damage'],['治癒禱言','active',4,4,1.8,'heal'],['懲戒','proc',7,0,1.1,'damage'],['生命泉源','proc',11,0,.8,'heal'],['黎明聖印','active',15,4,3.8,'damage'],['神聖庇護','proc',20,0,1.4,'shield']]}];
const MAPS=[{name:'苔光林地',min:1,max:5,icon:'',color:'#34483a',mobs:[['苔原史萊姆','','黏稠凝膠'],['林間野狼','','完整狼牙'],['迷路樹精','','活性樹芯']],boss:['古木守望者','','古木年輪']},{name:'風蝕礦坑',min:6,max:10,icon:'',color:'#494333',mobs:[['洞穴蝙蝠','','薄翼膜'],['岩背蜥蜴','','堅硬石鱗'],['礦坑魔偶','','魔偶齒輪']],boss:['礦脈巨人','','礦脈之心']},{name:'暮色沼澤',min:11,max:15,icon:'≋',color:'#3d394b',mobs:[['劇毒蛙','','劇毒腺體'],['幽光飛蛾','','微光鱗粉'],['沼地亡魂','','怨念碎片']],boss:['泥沼女巫','‍','女巫符印']},{name:'霜眠山脊',min:16,max:20,icon:'△',color:'#364956',mobs:[['霜牙雪狼','','霜牙'],['冰晶妖精','','冰晶翅片'],['雪原巨熊','‍','厚暖熊皮']],boss:['凜冬巨獸','','永凍結晶']},{name:'熔火遺跡',min:21,max:25,icon:'',color:'#57392e',mobs:[['熔岩蟲','','灼熱甲殼'],['火羽渡鴉','‍','不熄火羽'],['失控鎧甲','','焦黑鋼片']],boss:['熔爐暴君','','熔核']},{name:'星隕荒原',min:26,max:30,icon:'',color:'#3c3c53',mobs:[['虛空獵犬','','虛空尖牙'],['星塵水母','','星塵觸鬚'],['墜星魔像','','隕鐵核心']],boss:['星隕監視者','','星隕稜鏡']},{name:'終焉王座',min:40,max:40,icon:'',color:'#4a2c3b',mobs:[],boss:['噬日者・厄爾','','日蝕王冠']}];
const GEMS=[{name:'赤焰石',desc:'技能效果 +18%',icon:''},{name:'疾風石',desc:'主動冷卻 −1 回合（最低 2）／觸發率 +10%',icon:''},{name:'共鳴石',desc:'技能效果 +10%，觸發率 +5%／施放時回復攻擊力 15% 生命',icon:''}];
const SLOTS=['武器','護甲','副手','飾品'];const RARITY=['普通','精良','稀有','傳說'];const AFFIX=['攻擊','生命','防禦','暴擊'];
const KEY='emberwild-save-v1',BACKUP_KEY='emberwild-save-v1-backup';let state=null,tab='battle',running=false,enemy=null,round=0,cd={},logs=[],timer=null;let toastTimer;
// Do not persist a partially hydrated save while later modules are still loading.
let saveReady=false;
let migrateWorldSave=data=>data;
const $=x=>document.getElementById(x);const rand=n=>Math.floor(Math.random()*n);let uidSerial=0;const uid=()=>{let id;do{id=Date.now().toString(36)+'-'+(++uidSerial).toString(36)+'-'+Math.random().toString(36).slice(2,8);}while(party?.members.some(h=>h.bag.some(g=>g.id===id)));return id;};let need=l=>Math.round((45+l*18+l*l*2)*(2.2+l*.16));

function initial(job){let g=gear(1,0,0,job);return migrate({version:1,job,lv:1,xp:0,gold:150,ore:12,dust:0,hp:CLASSES[job].hp,shield:0,map:0,advanced:false,sp:2,ap:0,stats:[0,0,0],skills:[1,0,0,0,0,0],active:[0,null],procSlots:[null,null],gems:[0,0,0],sockets:[null,null,null,null,null,null],bag:[g],equipped:[g.id,null,null,null,null],materials:{},kills:{},totalKills:0,tutorial:0,claimed:[],repeat:0,won:false,autoPotion:true,potions:5,discovered:[],created:Date.now()});}
function equipment(s=state){return s.equipped.map(id=>s.bag.find(g=>g.id===id)).filter(Boolean);}

function note(t){logs.unshift(t);logs=logs.slice(0,65);}function toast(t){$('toast').textContent=t;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',2800);}function esc(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function save(show=false){if(!state)return;try{localStorage.setItem(KEY,JSON.stringify(state));if(show)toast('進度已儲存');}catch{toast('瀏覽器無法儲存，請匯出 JSON 備份');}}

function meter(n,max,cls=''){return `<div class="bar ${cls}"><i style="width:${Math.max(0,Math.min(100,n/max*100))}%"></i></div>`;}
function battleShieldValue(target){
  if(!target)return 0;
  if(target===state)return Math.max(0,Number(state.shield)||0);
  const own=Math.max(0,Number(target.shield)||0);
  const polymorph=Math.max(0,Number(globalThis.__EMBERWILD_CONTROL_TEST_API?.states?.[target.id]?.polymorph?.shield)||0);
  return Math.max(own,polymorph);
}
function battleHealthMeter(hp,max,shield=0){
  max=Math.max(1,Number(max)||1);
  hp=Math.max(0,Math.min(max,Number(hp)||0));
  shield=Math.max(0,Number(shield)||0);
  const hpPct=Math.max(0,Math.min(100,hp/max*100));
  const shieldPct=Math.max(0,Math.min(100,shield/max*100));
  return `<div class="battle-health-bar" role="img" aria-label="生命 ${Math.ceil(hp)} / ${Math.ceil(max)}${shield>0?'，護盾 '+Math.ceil(shield):''}"><i class="battle-health-fill" style="width:${hpPct}%"></i>${shieldPct>0?`<i class="battle-shield-fill" style="width:${shieldPct}%"></i>`:''}</div>`;
}

function pixel(index,extra=''){return '';}
function enemyArt(e){if(!e)return pixel(6);if(e.kind==='final')return pixel(7);if(/史萊姆/.test(e.name))return pixel(4);if(/狼|獵犬/.test(e.name))return pixel(5);if(/樹|古木/.test(e.name))return pixel(6);return `<span class="monster-symbol">${e.icon}</span>`;}

function render(){if(!state){$('app').innerHTML=`<section class="start"><span class="eyebrow">EMBERWILD · 選擇你的遠征者</span><h1>向荒野出發。</h1><p>一場沒有主線束縛的遠征。探索、收集、雕琢你的技能。<br>LV30 挑戰 40 級噬日者，通關後解鎖 LV60 與覺醒地圖。</p><div class="cards">${CLASSES.map((c,i)=>`<article class="card"><div class="class-art">${pixel(i)}</div><h2>${c.name}</h2><span class="tag">${c.main} · LV15 ${c.advanced}</span><p>${c.desc}</p><p class="small">生命 ${c.hp} / 攻擊 ${c.atk} / 防禦 ${c.def}</p><button class="primary" onclick="requestHeroName(${i},true)">選擇${c.name}</button></article>`).join('')}</div><p class="small">自動存檔 · 無離線戰鬥</p></section>`;return;}
let c=CLASSES[state.job],v=stats();$('wallet').textContent=`◈ ${state.gold.toLocaleString()} 金幣`;
$('app').innerHTML=`<div class="layout"><aside><div class="eyebrow">YOUR ADVENTURER</div><div class="portrait">${pixel(state.job)}</div><h2>${esc(characterName(state))}</h2><div class="row"><span class="level">LV. ${String(state.lv).padStart(2,'0')}</span><span class="small">${state.lv===levelCap(state)?'等級已達上限':`${state.xp} / ${need(state.lv)} EXP`}</span></div>${meter(state.lv===levelCap(state)?1:state.xp,state.lv===levelCap(state)?1:need(state.lv),'gold')}<nav>${[['battle','','荒野探索'],['roster','','隊伍編成'],['character','','角色能力'],['skills','','技能'],['equipment','▣','背包'],['worn','','已穿戴裝備'],['forge','','裝備強化'],['bossCraft','','BOSS 製作'],['quests','▤','委託手札'],['shop','◈','商店'],['guide','','冒險指南']].map(([id,icon,name])=>`<button class="${tab===id?'active':''}" onclick="setTab('${id}')">${name}</button>`).join('')}</nav><div class="aside-foot">遠征目標<br><span class="gold">${state.won?' 已突破 · 上限 LV60':'LV30 · 挑戰噬日者'}</span><div class="divider"></div>累計擊敗 ${state.totalKills} 隻<br>自動儲存 · 每 5 秒</div></aside><main>${tutorial()}${({battle:battleView,roster:rosterView,character:characterView,skills:skillsView,equipment:equipmentView,worn:wornEquipmentView,forge:forgeView,bossCraft:bossCraftView,quests:questView,shop:shopView,guide:guideView}[tab])()}</main>${sharedBattleJournal()}</div>`;}
function setTab(t){tab=t;render();}function heading(k,t,right=''){return `<div class="heading"><div><div class="eyebrow">${k}</div><h1>${t}</h1></div>${right}</div>`;}
function tutorial(){if(state.tutorial>=3)return '';let texts=[['01 / 初次狩獵','在苔光林地開始自動探索，擊敗 3 隻怪物。',state.totalKills>=3],['02 / 整理行囊','前往「裝備強化」，將任一裝備強化一次。',state.bag.some(g=>g.plus>0)],['03 / 學習技能','前往「技能」，將初始主動技能提升至 2 級。',state.skills[0]>=2]][state.tutorial];return `<div class="tutorial"><div><b>${texts[0]}</b><p>${texts[1]}</p></div><button ${texts[2]?'':'disabled'} onclick="claimTutorial()">領取獎勵</button></div>`;}
function claimTutorial(){if(state.tutorial===0&&state.bag.length>=RULES.bagCapacity)return toast('背包已滿，請先整理再領取新手護甲');let ok=[state.totalKills>=3,state.bag.some(g=>g.plus>0),state.skills[0]>=2][state.tutorial];if(!ok)return;state.tutorial++;state.gold+=100;state.ore+=10;if(state.tutorial===1){addGear(gear(1,1,1,state.job));toast('獲得精良護甲、100 金幣與 10 鍛鐵！');}else toast('獲得 100 金幣與 10 鍛鐵');save();render();}
function characterView(){let v=stats(),c=CLASSES[state.job];return heading('ADVENTURER / 角色能力',esc(characterName(state)),`<span class="tag">剩餘能力點 ${state.ap}</span>`)+`<div class="grid"><section class="panel"><h2>培養你的戰鬥風格</h2>${uiHelp('能力點說明','升級獲得 3 能力點、2 技能點；免費重置退還全部能力點。')}<div class="stat-grid"><span>生命上限 <b class="gold">${v.hp}</b></span><span>攻擊力 <b class="gold">${v.atk}</b></span><span>防禦力 <b class="gold">${v.def}</b></span><span>暴擊率 <b class="gold">${Math.round(v.crit*100)}%</b></span></div>${[c.main,'體質','韌性'].map((x,i)=>`<div class="mobdrop row"><div><b>${x} ${state.stats[i]}</b><div class="small">每點${['攻擊力 +2','生命上限 +12','防禦力 +1.3'][i]}</div></div><div class="stat-allocate"><input id="stat-alloc-${i}" type="number" min="1" max="${state.ap}" value="${state.ap>0?1:''}" inputmode="numeric" aria-label="分配${x}點數" ${state.ap<1?'disabled':''}><button onclick="allocate(${i},document.getElementById('stat-alloc-${i}').value)" ${state.ap<1?'disabled':''}>分配</button></div></div>`).join('')}<div class="actions"><button onclick="resetStats()">免費重置能力點</button></div></section><section class="panel"><div class="icon"></div><h2>LV15 · ${c.advanced}</h2><p>進階後生命 +18%、攻擊 +22%、防禦 +15%，開放兩項進階技能。</p><p class="small">需求：LV15、500 金幣、20 鍛鐵、怨念碎片 ×3。怨念碎片來自暮色沼澤的沼地亡魂。</p><button class="primary" onclick="advance()" ${state.advanced||state.lv<15?'disabled':''}>${state.advanced?'已完成職業進階':'完成二轉'}</button></section></div>`;}
function allocate(i,amount=1){if(![0,1,2].includes(i)||state.ap<1)return;const n=Math.floor(Number(amount));if(!Number.isFinite(n)||n<1)return toast('請輸入至少 1 點');if(n>state.ap)return toast('剩餘能力點不足');state.ap-=n;state.stats[i]+=n;save();render();}function resetStats(){state.ap+=state.stats.reduce((a,b)=>a+b,0);state.stats=[0,0,0];clampVitals();save();render();}function advance(){if(state.advanced||state.lv<15)return;if(state.gold<500||state.ore<20||(state.materials['怨念碎片']||0)<3)return toast('需要 500 金幣、20 鍛鐵、3 怨念碎片');state.gold-=500;state.ore-=20;state.materials['怨念碎片']-=3;state.advanced=true;state.hp=stats().hp;save();render();toast('二轉完成，進階技能已開放！');}
function skillsView(){let c=CLASSES[state.job];return heading('SKILLS / 技能','主動技能與普攻觸發技能',`<span class="tag">技能點 ${state.sp}</span>`)+`<p>兩個主動槽獨立計算冷卻；普攻觸發技能必須配置於觸發槽才會啟用。每項技能最高 10 級，每點增加基礎效果 40%、可鑲嵌 1 顆寶石，替換時退還舊寶石。</p><div class="panel" style="margin-bottom:20px"><div class="row"><span>${GEMS.map((g,i)=>` ${esc(equipmentDisplayName(g))} ×${state.gems[i]}`).join('　')}</span><button onclick="craftGem()">合成隨機寶石 · 12 寶石粉塵</button></div></div><div class="cards">${c.skills.map((sk,i)=>{let locked=state.lv<sk[2]||(i>=4&&!state.advanced),gem=state.sockets[i];return `<article class="card"><div class="row"><span class="icon">${sk[1]==='active'?'':'ϟ'}</span><span class="tag">${sk[1]==='active'?'主動':'普攻觸發'}</span></div><h2>${sk[0]} <span class="gold">${state.skills[i]}/${RULES.skillMax}</span></h2>${skillTypeBadges(state.job,i)}${skillMechanicsDetails(state.job,i)}<p>${skillDescription(i)}<br><span class="small">${sk[1]==='active'?`冷卻 ${skillCooldown(i)} 回合`:`每次普攻 ${Math.round(procChance(i)*100)}% 觸發`} · LV${sk[2]}${i>=4?' + 二轉':''}</span></p><button ${locked||state.sp<1||state.skills[i]>=skillCap()?'disabled':''} onclick="learn(${i})">${locked?'尚未解鎖':state.skills[i]?'升級1點':'學習'}</button>${sk[1]==='active'?`<button ${!state.skills[i]?'disabled':''} onclick="equipSkill(${i},0)">${state.active[0]===i?' 槽 1':'設為槽 1'}</button><button ${!state.skills[i]?'disabled':''} onclick="equipSkill(${i},1)">${state.active[1]===i?' 槽 2':'設為槽 2'}</button>`:'<p class="small">學會後需配置於觸發槽</p>'}<div class="divider"></div><div class="small">鑲嵌寶石</div><select aria-label="${sk[0]}寶石" style="width:100%;margin-top:8px" ${!state.skills[i]?'disabled':''} onchange="socket(${i},this.value)"><option value="-1">空插槽</option>${GEMS.map((g,j)=>`<option value="${j}" ${gem===j?'selected':''} ${state.gems[j]<1&&gem!==j?'disabled':''}>${esc(equipmentDisplayName(g))} · ${g.desc}</option>`).join('')}</select></article>`;}).join('')}</div>`;}
function skillDescription(i){let sk=CLASSES[state.job].skills[i];return `${{damage:'造成',heal:'恢復',shield:'獲得',drain:'造成傷害並吸取等量生命，倍率為'}[sk[5]]}攻擊力 ${Math.round(skillPower(i)*100)}%${{damage:'傷害',heal:'生命',shield:'護盾（無上限；重複施放與其他護盾來源只保留較高值）',drain:''}[sk[5]]}`;}
function equipSkill(i,slot){if(!Number.isInteger(i)||!CLASSES[state.job].skills[i]||CLASSES[state.job].skills[i][1]!=='active'||![0,1].includes(slot)||!state.skills[i])return;let other=1-slot;if(state.active[other]===i)state.active[other]=null;state.active[slot]=i;save();render();}function socket(i,value){let g=Number(value);if(!Number.isInteger(i)||i<0||i>=6||!state.skills[i]||!Number.isInteger(g)||g< -1||g>2)return;let old=state.sockets[i];if(g===old)return;if(g>=0&&state.gems[g]<1)return;if(old!==null)state.gems[old]++;state.sockets[i]=g<0?null:g;if(g>=0)state.gems[g]--;save();render();}function craftGem(){{const cost=Math.max(0,Math.round(GS('skills.gems.craftDust',12)));if(state.dust<cost)return toast('需要 '+cost+' 寶石粉塵');state.dust-=cost;}let i=rand(3);state.gems[i]++;save();render();toast('合成了'+GEMS[i].name);}
(function installEquipmentAttributePresentation(){
  if(globalThis.equipmentAttributeDetailsHTML)return;
  const labels={atk:'攻擊',hp:'生命',def:'防禦'};
  function fallbackBase(g){
    if(typeof globalThis.gearStatBreakdown==='function')return globalThis.gearStatBreakdown(g).total;
    if(typeof gearBaseStats==='function')return gearBaseStats(g);
    const f=(1+(Number(g?.rar)||0)*.25)*(1+(Number(g?.plus)||0)*.12),tier=Number(g?.tier)||1,slot=Number(g?.slot)||0;
    return {atk:slot===0?tier*11*f:[2,3].includes(slot)?tier*4*f:0,hp:slot===1?tier*45*f:[2,3].includes(slot)?tier*20*f:0,def:slot===1?tier*4*f:0};
  }
  function statSummary(v){
    const parts=[];
    for(const k of ['atk','hp','def'])if(Math.abs(Number(v?.[k])||0)>.00001)parts.push(`${labels[k]} ${(Number(v[k])>=0?'+':'')}${Math.round(Number(v[k])||0)}`);
    return parts.join(' / ')||'無數值';
  }
  function pushStatLines(lines,label,v){
    let any=false;
    for(const k of ['atk','hp','def']){
      const n=Number(v?.[k])||0;
      if(Math.abs(n)<=.00001)continue;
      any=true;
      lines.push(`<div class="equipment-attribute-line"><b>${esc(label)}</b><span>${labels[k]} ${n>=0?'+':''}${Math.round(n)}</span></div>`);
    }
    if(!any)lines.push(`<div class="equipment-attribute-line"><b>${esc(label)}</b><span class="small">無數值</span></div>`);
  }
  globalThis.equipmentTotalSummaryText=function(g){return statSummary(fallbackBase(g));};
  globalThis.equipmentAttributeDetailsHTML=function(g,options={}){
    if(!g)return '';
    const includeAffixes=options.includeAffixes!==false,lines=[];
    if(typeof globalThis.gearStatBreakdown==='function'){
      const b=globalThis.gearStatBreakdown(g),bodyName=(typeof itemForm==='function'&&itemForm(g)?.name)||CLASS_GEAR[g.job??0]?.[g.slot]||'裝備';
      const modeName=(typeof MODES!=='undefined'&&MODES[Math.max(0,Math.min(2,Number(g.difficulty)||0))]?.name)||'普通';
      pushStatLines(lines,bodyName+'本體',b.body);
      if(g.boss===undefined)pushStatLines(lines,b.prefix?.name||'無冠名',b.prefix);
      else pushStatLines(lines,b.seriesPrefix?.name||'BOSS 系列',b.series);
      pushStatLines(lines,`強度 T${b.powerTier||g.powerTier||1}（${modeName}來源 · ×${Number((b.mult||1).toFixed(3))}）`,b.grade);
      pushStatLines(lines,`+${g.plus||0} 強化`,b.enhance);
    }else{
      pushStatLines(lines,'能力值',fallbackBase(g));
    }
    if(typeof exclusiveEquipmentText==='function')for(const text of (exclusiveEquipmentText(g)||[]))lines.push(`<div class="equipment-attribute-line"><b>專屬額外屬性（不可變更）</b><span>${esc(text)}</span></div>`);
    if(includeAffixes){
      const affixes=Array.isArray(g.affix)?g.affix:[];
      if(affixes.length)for(const a of affixes)lines.push(`<div class="equipment-attribute-line equipment-affix-line"><b>隨機詞條</b><span>${affixHTML(a,g)}</span></div>`);
      else lines.push('<div class="equipment-attribute-line"><b>隨機詞條</b><span class="small">無詞條</span></div>');
    }
    return `<details class="equipment-attribute-details"><summary>${esc(options.summary||'詳細屬性')}</summary><div class="equipment-attribute-list">${lines.join('')}</div></details>`;
  };
  const style=document.createElement('style');
  style.id='equipment-attribute-collapse-style';
  style.textContent=`
    .equipment-total-summary{margin:3px 0;font-size:12px;color:#e5e7df}
    .equipment-attribute-details{margin:4px 0 0;font-size:12px}
    .equipment-attribute-details>summary{color:#cfd9d3;font-size:12px;line-height:1.6}
    .equipment-attribute-list{margin-top:5px;border-top:1px solid var(--line);max-height:min(460px,48dvh);overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;overscroll-behavior:contain;padding-right:3px}
    .equipment-attribute-line{display:grid;grid-template-columns:minmax(150px,.8fr) minmax(0,1.2fr);gap:8px;padding:4px 0;border-bottom:1px solid #2b373b;line-height:1.55;align-items:start}
    .equipment-attribute-line>b{font-size:11px;color:var(--muted);font-weight:500;overflow-wrap:anywhere}
    .equipment-attribute-line>span{min-width:0;overflow-wrap:anywhere}
    .equipment-affix-line .affix{display:inline;font-size:12px;line-height:1.55}
    @media(max-width:620px){.equipment-attribute-line{grid-template-columns:1fr;gap:1px}}
  `;
  document.head.appendChild(style);
})();
function gearDesc(g){let f=(1+g.rar*.25)*(1+g.plus*.12);return (g.slot===0?`攻擊 +${Math.round(g.tier*11*f)}`:g.slot===1?`生命 +${Math.round(g.tier*45*f)} / 防禦 +${Math.round(g.tier*4*f)}`:`攻擊 +${Math.round(g.tier*4*f)} / 生命 +${Math.round(g.tier*20*f)}`);}
function findGear(id){return state.bag.find(g=>g.id===id);}function equipGear(id){let g=findGear(id);if(!g||state.lv<gearRequiredLevelByTier(g.tier))return;state.equipped[g.slot]=id;clampVitals();save();render();}function enhanceCost(g){return g.tier*(g.plus+1)*2;}function enhance(id){let g=findGear(id);if(!g||g.plus>=RULES.enhanceMax)return;if(state.ore<enhanceCost(g))return toast('鍛鐵不足，狩獵或分解裝備可取得');state.ore-=enhanceCost(g);g.plus++;save();render();toast(`${esc(equipmentDisplayName(g))} 強化至 +${g.plus}`);}
let pendingAffix=null;
function acceptAffix(){if(pendingAffix){let g=findGear(pendingAffix.id);if(g)g.affix=pendingAffix.affix;}pendingAffix=null;clampVitals();save();closeModal();render();}function closeModal(){const m=$('modal');m.close();delete m.dataset.view;pendingAffix=null;}
function salvage(id){if(state.equipped.includes(id))return;let g=findGear(id);if(!g)return;state.ore+=g.tier*(3+g.rar*2+g.plus);state.dust+=1+g.rar;state.bag=state.bag.filter(x=>x.id!==id);save();render();}
const QUESTS=[{id:'wolves',title:'縫補獵人的披肩',desc:'林間野狼的狼牙，是獵人交換皮革的憑證。',mat:'完整狼牙',n:5,gold:300,ore:20},{id:'witch',title:'淨化沼澤',desc:'採集女巫符印，協助營地研究暮色詛咒。',mat:'女巫符印',n:2,gold:800,ore:55},{id:'stars',title:'鍛造師的最後一課',desc:'取得星隕監視者的稜鏡，準備迎戰噬日者。',mat:'星隕稜鏡',n:3,gold:2000,ore:120}];
function questView(){let m=MAPS[state.map===6?5:state.map],repeatMat=m.mobs[0][2];return heading('JOURNAL / 委託手札','荒野裡的小小約定。')+`<div class="cards">${QUESTS.map(q=>`<article class="card"><span class="tag">一次性支線</span><h2 style="margin-top:15px">${q.title}</h2><p>${q.desc}</p><p>${q.mat}　${state.materials[q.mat]||0} / ${q.n}</p><p class="gold">${q.gold} 金幣 · ${q.ore} 鍛鐵 · 隨機寶石 ×1</p><button class="primary" onclick="claimQuest('${q.id}')" ${state.claimed.includes(q.id)||(state.materials[q.mat]||0)<q.n?'disabled':''}>${state.claimed.includes(q.id)?'已完成':'交付材料'}</button></article>`).join('')}<article class="card"><span class="tag">可重複 · ${m.name}</span><h2 style="margin-top:15px">營地物資募集</h2><p>收集本地常見怪物的材料。切換地圖後會更新募集品項。</p><p>${repeatMat}　${state.materials[repeatMat]||0} / 8</p><p class="gold">${regionTier(questRegion())*150} 金幣 · 15 鍛鐵 · 3 粉塵</p><button class="primary" onclick="claimRepeat()" ${(state.materials[repeatMat]||0)<8?'disabled':''}>交付材料</button><p class="small">累計完成 ${state.repeat} 次</p></article></div>`;}
function claimQuest(id){let q=QUESTS.find(q=>q.id===id);if(!q||state.claimed.includes(id)||(state.materials[q.mat]||0)<q.n)return;state.materials[q.mat]-=q.n;state.gold+=q.gold;state.ore+=q.ore;state.gems[rand(3)]++;state.claimed.push(id);save();render();toast('委託完成，已領取獎勵');}
function guideView(){return heading('FIELD NOTES / 冒險指南','你的遠征，由你安排。')+`<section class="panel"><h2>完整遊戲流程</h2><p>選擇職業 → 完成三步教學 → 每 5 級前往新區域 → 收集專屬材料、裝備與寶石 → LV15 完成二轉 → LV30 打造星隕裝備與技能組合 → 挑戰 LV40 噬日者。</p><h3>戰鬥與越級</h3><p>1倍速每回合至少 6 秒。普攻每回合一次；兩個主動技在冷卻完成時各自施放，只有配置於普攻觸發槽的觸發技會在普攻時各自判定，不搶佔普攻。暴擊傷害 150%。傷害以攻擊減去 65% 防禦計算，最低 1。護盾可抵擋單一角色受到的所有來源傷害，沒有生命比例上限；新的護盾不與既有護盾相加，只保留兩者較高值。一般探索只會遇見不高於自己 5 級的敵人；傷害承受會隨越級增加，每級 +12%。噬日者不使用一般越級加成。</p><h3>探索與補給</h3><p>遭遇機率：普通 83%、菁英 12%、地圖首領 5%。首領等級為區域最高級，尚未達到越級條件時改遇普通怪。戰後回滿生命、清空護盾；下一場遭遇開始時技能冷卻重置。戰敗自動停戰並扣除 5% 金幣，不失去經驗或裝備。每次遭遇結束自動回滿生命；暫停不會重置敵人，切換地圖會放棄當前遭遇，但不會回復。</p><h3>掉落與鍛造</h3><p>專屬素材掉率：普通 65%、菁英與首領 100%。裝備掉率：普通 22%、菁英 55%、首領 100%。寶石掉率：普通 4%、菁英 12%、首領 35%。每次擊殺另有 0.15% 獨立機率取得本區傳說裝備。鍛鐵每次擊殺必掉。背包達 720 件時，新掉落裝備自動分解。裝備職業通用：武器會依職業作為近戰、弓箭或法術攻擊來源。</p><h3>終局挑戰</h3><p>噬日者擁有 85,000 生命、850 攻擊、110 防禦，每第 5 回合施放 1.65 倍日蝕打擊；第 46 回合起狂暴。建議完成二轉、分配能力點、核心技能 5 級、三件星隕稀有以上裝備 +10、洗鍊適合的雙詞綴，並為所有技能鑲嵌寶石。備足治療藥水。LV30 僅是挑戰起點；不同職業應調整輸出、治療與護盾組合。</p><h3>存檔</h3><p>每 5 秒與重要操作後存入此瀏覽器。匯出 JSON 可搬移到另一台裝置；匯入會先顯示確認，再覆蓋當前角色。只保存成長進度，不保存戰鬥中敵人；續玩從整備狀態開始。關閉頁面不會離線戰鬥。</p><button class="danger" onclick="confirmNew()">建立新角色</button></section>`;}
function makeBaseEnemy(map=state.map,s=state,rng=Math.random){let m=MAPS[map];if(map===6)return{name:m.boss[0],icon:m.boss[1],mat:m.boss[2],lv:40,hp:180000,maxhp:180000,atk:1000,def:110,kind:'final',turn:0};let r=rng(),kind=r<.05&&m.max<=s.lv+5?'boss':r<.17?'elite':'normal',mob=kind==='boss'?m.boss:m.mobs[Math.floor(rng()*m.mobs.length)],lv=kind==='boss'?m.max:m.min+Math.floor(rng()*(Math.min(m.max,s.lv+5)-m.min+1));let hp=Math.round((42+lv*15+lv*lv*.7)*(kind==='boss'?3:kind==='elite'?1.65:1)),atk=Math.round((8+lv*3.3)*(kind==='boss'?1.45:kind==='elite'?1.2:1));return{name:(kind==='elite'?'菁英・':'')+mob[0],icon:mob[1],mat:mob[2],lv,hp,maxhp:hp,atk,def:Math.round(lv*1.7),kind,turn:0};}

function toggleBattle(){if(state.hp<=0)return toast('請先戰後恢復生命');running=!running;if(running&&!enemy){enemy=makeEnemy();note(`遭遇 LV${enemy.lv} ${enemy.name}！`);}render();}function potion(quiet=false){if(state.potions<1)return;let v=stats();if(state.hp>=v.hp)return;state.potions--;state.hp=Math.min(v.hp,state.hp+v.hp*.45);note('使用治療藥水，恢復 45% 生命。');if(!quiet){save();render();}}function buyPotion(){if(state.gold<75)return toast('金幣不足');state.gold-=75;state.potions+=5;save();render();}
function damage(amount,critical=false){let d=Math.max(1,Math.round(amount-enemy.def*.65));if(critical)d=Math.round(d*1.5);enemy.hp=Math.max(0,enemy.hp-d);return d;}
function cast(i,v){let sk=CLASSES[state.job].skills[i],power=v.atk*skillPower(i),effect=sk[5];if(effect==='heal'){let h=Math.min(v.hp-state.hp,Math.round(power));state.hp+=h;note(`${sk[0]} · 回復 ${h} 生命`);}else if(effect==='shield'){const shieldResult=applyPureShield(state,power);note(shieldResult.upgraded?`${sk[0]} · 獲得護盾 ${shieldResult.generated}，目前護盾 ${Math.round(shieldResult.current)}`:`${sk[0]} · 產生護盾 ${shieldResult.generated}，現有護盾 ${Math.round(shieldResult.previous)} 較高，維持不變`);}else{let d=damage(power,Math.random()<v.crit);if(effect==='drain')state.hp=Math.min(v.hp,state.hp+d);note(`${sk[0]} · ${d} 傷害${effect==='drain'?'並吸取生命':''}`);}if(state.sockets[i]===2&&sk[1]==='active')state.hp=Math.min(v.hp,state.hp+Math.round(v.atk*GS('skills.gems.hybridActiveHealAttack',.15)));}
function addGear(g){if(state.bag.length>=RULES.bagCapacity){state.ore+=g.tier*(3+g.rar*2);state.dust+=1+g.rar;note('背包已滿，掉落裝備自動分解。');}else{state.bag.push(g);note(`獲得 ${RARITY[g.rar]} ${equipmentDisplayName(g)}`);}}
function exportSave(){if(!state)return toast('請先建立角色');save();let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`emberwild-lv${state.lv}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('已匯出角色 JSON');}

let pendingImport=null;async function importSave(ev){let f=ev.target.files[0];ev.target.value='';if(!f)return;try{if(f.size>16*1024*1024)throw Error('存檔超過 16 MiB，無法匯入');pendingImport=validateSave(JSON.parse(await f.text()));running=false;render();$('modal').innerHTML=`<h2>載入角色存檔？</h2><p>LV${pendingImport.lv} ${CLASSES[pendingImport.job].name} · ${pendingImport.totalKills} 次擊殺</p><p>這會取代此瀏覽器目前的角色。建議先匯出原角色備份。</p><div class="actions"><button class="primary" onclick="acceptImport()">確認載入</button><button onclick="pendingImport=null;closeModal()">取消</button></div>`;$('modal').showModal();}catch(e){pendingImport=null;toast('無法匯入：'+e.message);}}

function confirmNew(){running=false;$('modal').innerHTML='<h2>建立新角色？</h2><p>目前角色將被覆蓋。請先匯出 JSON 留存，再開始新旅程。</p><div class="actions"><button onclick="exportSave()">匯出目前角色</button><button class="danger" onclick="newGame()">確認重新開始</button><button onclick="closeModal()">取消</button></div>';$('modal').showModal();}
// Emberwild 2: progression, commissions and class loot.
const CLASS_GEAR=[['長劍','板甲','戰旗','飾品'],['法杖','法袍','魔典','飾品'],['長弓','皮甲','箭袋','飾品'],['權杖','聖衣','聖徽','飾品']];
const BOSS_GEAR=['古木誓約','礦脈共鳴','暮沼咒印','永凍之誓','熔核意志','隕星遺產'];
const AFFIX_RANK=['普通','精良','稀有','傳說'];let BOARD_INTERVAL=20*60*1000;
let filters={slot:'all',rar:'all',job:'own',effectRank:'all',special:false},motion={player:false,enemy:false,skill:false,heal:false},currentEvents=[],eventHistory=[],encounterId=0;
const originalNote=note,originalCast=cast,originalGuide=guideView;

function balanceQualityKeys(){return ['normal','fine','rare','legendary'];}
function balanceQualityKey(rank){return balanceQualityKeys()[Math.max(0,Math.min(3,Number(rank)||0))];}
function balanceRandomInt(range){const min=Math.floor(Number(range?.min)||0),max=Math.floor(Number(range?.max)||min);return min+rand(Math.max(1,max-min+1));}
function rankRoll(){const q=GAME_BALANCE.affixes.qualityChance,r=Math.random();let acc=0;for(let i=0;i<4;i++){acc+=Number(q[balanceQualityKeys()[i]])||0;if(r<acc)return i;}return 3;}
function rollAffixes(g){const cfg=GAME_BALANCE.affixes;return [0,1].map(()=>{const rank=rankRoll(),key=balanceQualityKey(rank),special=rank>=1&&Math.random()<cfg.skillSpecialChance,type=special?(Math.random()<cfg.skillEffectShare?4:5):rand(4),f=cfg.qualityMultiplier[key],a={type,rank,value:0};if(type===4){a.skill=rand(6);a.value=Math.round(cfg.skillEffectPercent[key]);}else if(type===5){a.skill=rand(6);a.value=Math.round(cfg.cooldownReduction[key]);}else if(type===0)a.value=Math.round(g.tier*balanceRandomInt(cfg.baseValues.attackPerTier)*f);else if(type===1)a.value=Math.round(g.tier*balanceRandomInt(cfg.baseValues.hpPerTier)*f);else if(type===2)a.value=Math.round(g.tier*balanceRandomInt(cfg.baseValues.defensePerTier)*f);else a.value=Math.min(cfg.baseValues.critPercent.cap,Math.round(balanceRandomInt(cfg.baseValues.critPercent)*f));return a;});};
function affixLabel(a,g){let sk=CLASSES[g.job??state.job].skills[a.skill??0];return a.type<4?`${AFFIX[a.type]} +${a.value}${a.type===3?'%':''}`:a.type===4?`${sk[0]} 效果 +${a.value}%`:`${sk[0]} ${sk[1]==='active'?`冷卻 −${a.value} 回合`:`觸發率 +${a.value*GAME_BALANCE.affixes.procChancePerPointPercent}%`}`;}
function affixHTML(a,g){return `<span class="affix effect-quality-${a.rank??0}">[${AFFIX_RANK[a.rank??0]}] ${affixLabel(a,g)}</span>`;}
function bonusFor(i,type,s=state){return equipment(s).filter(g=>g.job===s.job).flatMap(g=>g.affix).filter(a=>a.type===type&&a.skill===i).reduce((n,a)=>n+a.value,0);}
function skillPower(i,s=state){const sk=CLASSES[s.job].skills[i],perLevel=Number.isFinite(sk?.[6]?.powerPerLevel)?sk[6].powerPerLevel:GS('skills.core.effectPerExtraLevel',.4);return (sk[4]+Math.max(0,(Number(s.skills[i])||0)-1)*perLevel)*(s.sockets[i]===0?1.18:s.sockets[i]===2?1.10:1)*(1+bonusFor(i,4,s)/100);};
function skillCooldown(i,s=state){return Math.max(GAME_BALANCE.combat.minimumActiveCooldown,CLASSES[s.job].skills[i][3]-(s.sockets[i]===1?1:0)-bonusFor(i,5,s));};
function procChance(i,s=state){return Math.min(GAME_BALANCE.combat.statCaps.crit,.22+s.skills[i]*.025+(s.sockets[i]===1?.1:s.sockets[i]===2?.05:0)+bonusFor(i,5,s)*(GAME_BALANCE.affixes.procChancePerPointPercent/100));};
function learn(i){let sk=CLASSES[state.job].skills[i],cap=skillCap();if(state.skills[i]>=cap)return toast(`目前技能上限 ${cap} 級；角色每 ${GS('skills.core.capLevelsPerStep',3)} 級提高 1 級上限，最高 ${RULES.skillMax} 級`);if(state.sp<1||state.lv<sk[2]||(i>=4&&!state.advanced))return;state.sp--;state.skills[i]++;save();render();};

note=function(t){originalNote(t);currentEvents.push(t);};
cast=function(i,v){motion.skill=true;if(['heal','drain'].includes(CLASSES[state.job].skills[i][5]))motion.heal=true;originalCast(i,v);};
function logContent(){return `<div class="row"><h2>本回合戰況</h2><span class="tag">回合 ${round}</span></div><div class="current-events">${(currentEvents.length?currentEvents:logs.slice(0,3)).map(t=>`<div class="${/傷害/.test(t)?'event-damage':/恢復|回復|護盾/.test(t)?'event-heal':'event-loot'}">${esc(t)}</div>`).join('')}</div><details><summary>展開歷史紀錄（最近 65 則）</summary><div class="history-events">${logs.map(t=>`<div>${esc(t)}</div>`).join('')}</div></details>`;}
function buildBoard(s=state){let mi=s.map===6?5:s.map,m=MAPS[mi];s.board.serial++;s.board.next=Date.now()+BOARD_INTERVAL;s.board.tasks=m.mobs.slice(0,3).map((mob,i)=>({id:uid(),map:mi,mat:mob[2],n:8+rand(9)+(regionTier(mi)-1)*2,kind:i===2?'gear':'gem',gem:rand(3),slot:rand(4),rar:Math.random()<.2?3:2,done:false}));}
function ensureBoard(){if(!state.board||state.board.next<=Date.now()){if(!state.board)state.board={next:0,serial:0,tasks:[]};buildBoard();save();}}
function refreshBoard(){ensureBoard();let cost=boardRefreshCost();if(state.gold<cost)return toast(`需要 ${cost} 金幣`);$('modal').innerHTML=`<h2>刷新委託？</h2><p>消耗 ${cost} 金幣，取代目前三張委託，依目前地圖生成新委託。已持有的材料不受影響。</p><div class="actions"><button class="primary" onclick="confirmRefresh()">支付並刷新</button><button onclick="closeModal()">取消</button></div>`;$('modal').showModal();}
function confirmRefresh(){let cost=boardRefreshCost();if(state.gold<cost)return;state.gold-=cost;buildBoard();closeModal();save();render();}
function claimBoard(id){ensureBoard();let q=state.board.tasks.find(q=>q.id===id);if(!q||q.done||(state.materials[q.mat]||0)<q.n)return;if(q.kind==='gear'&&state.bag.length>=RULES.bagCapacity)return toast('背包已滿，請先整理再領取裝備獎勵');state.materials[q.mat]-=q.n;q.done=true;state.gold+=(regionTier(q.map))*180;state.ore+=(regionTier(q.map))*8;if(q.kind==='gear')addGear(gear(regionTier(q.map),q.slot,q.rar,q.job??rand(4)));else state.gems[q.gem]+=2;state.repeat++;save();render();toast('委託完成，獎勵已放入背包');}
const oldQuestView=questView;questView=function(){ensureBoard();let mins=Math.max(1,Math.ceil((state.board.next-Date.now())/60000));return heading('COMMISSION BOARD / 委託看板','荒野的新委託',`<span class="tag">第 ${state.board.serial} 批</span>`)+`<section class="panel board-bar"><div><b>${mins} 分鐘內自動刷新</b><p class="small">每 20 分鐘更換三張委託。刷新依目前地圖生成；切換地圖不會立即更換。過期未交付委託會移除，材料保留。</p></div><button onclick="refreshBoard()">立即刷新 · ${boardRefreshCost()}◈</button></section><div class="cards">${state.board.tasks.map(q=>`<article class="card"><span class="tag">${MAPS[q.map].name} · ${q.done?'已交付':'物資委託'}</span><h2 style="margin-top:16px">${q.mat}募集</h2>${q.kind==='gear'?equipmentArt({job:state.job,slot:q.slot,tier:regionTier(q.map)}):''}<p>${state.materials[q.mat]||0} / ${q.n} 份</p><p class="gold">${q.kind==='gear'?`${RARITY[q.rar]} ${esc(characterName(state))}${SLOTS[q.slot]} ×1`:`${GEMS[q.gem].name} ×2`}</p><p class="small">另獲 ${(regionTier(q.map))*180} 金幣、${(regionTier(q.map))*8} 鍛鐵</p><button class="primary" ${q.done||(state.materials[q.mat]||0)<q.n?'disabled':''} onclick="claimBoard('${q.id}')">${q.done?'已完成':'交付並領獎'}</button></article>`).join('')}</div><h2 style="margin-top:28px">支線手札與常駐募集</h2>`+oldQuestView().replace(/<div class="heading">[\s\S]*?<\/h1><\/div><\/div>/,'');};
function setFilter(k,v){filters[k]=v;render();}
function filteredGear(){return state.bag.filter(g=>(filters.slot==='all'||g.slot===Number(filters.slot))&&(filters.rar==='all'||g.rar===Number(filters.rar))&&(filters.job==='all'||filters.job==='own'&&(g.slot===1||g.job===state.job)||g.slot===1||g.job===Number(filters.job))&&(filters.effectRank==='all'||equipmentEffectRank(g)===Number(filters.effectRank))&&(!filters.special||g.boss!==undefined||g.affix.some(a=>[4,5].includes(a.type)))).sort((a,b)=>Number(state.equipped.includes(b.id))-Number(state.equipped.includes(a.id))||b.tier-a.tier||b.rar-a.rar);}
equipGear=function(id){let g=findGear(id);if(!g||g.job!==state.job)return toast('此裝備限定其他職業使用');if(state.lv<gearRequiredLevelByTier(g.tier))return toast('等級不足');state.equipped[g.slot]=id;clampVitals();save();render();};
function reroll(id){let g=findGear(id);if(!g)return;const cost=rerollCostFor(g);if(state.gold<cost.gold||state.ore<cost.ore)return toast(`需要 ${cost.gold} 金幣與 ${cost.ore} 鍛鐵`);state.gold-=cost.gold;state.ore-=cost.ore;pendingAffix={id,affix:rollAffixes(g)};save();render();$('modal').innerHTML=`${equipmentArt(g)}<h2>洗鍊 · ${equipmentNameHTML(g)}</h2><p>費用已扣除，可保留原有詞條。詞條品質：${qualityChanceText()}；精良以上有 ${Math.round(GAME_BALANCE.affixes.skillSpecialChance*100)}% 機會先抽技能類詞條。</p><h3>原詞條</h3>${g.affix.map(a=>affixHTML(a,g)).join('')||'無'}<h3 style="margin-top:20px">新詞條</h3>${pendingAffix.affix.map(a=>affixHTML(a,g)).join('')}<div class="actions"><button class="primary" onclick="acceptAffix()">採用新詞條</button><button onclick="closeModal()">保留原詞條</button></div>`;$('modal').showModal();};

guideView=function(){return `<section class="panel release-notes"><h2>2.0 · 成長與戰利品更新</h2><p>升級所需經驗依等級約為原版的 2.4–6.9 倍，打怪經驗維持原值。LV30 仍為上限；舊存檔等級、經驗、點數與物品全部保留。</p><p>技能上限提高為 10 級，每點增加該技能基礎效果 40%。角色每 3 級提高 1 級技能上限。稀有以上詞條可額外強化本職業特定技能的效果、冷卻或觸發率；效果加成加總、冷卻最低 2 回合、觸發率最高 85%。</p><p>委託每 20 分鐘刷新，亦可付費立即刷新。各區 BOSS 專屬材料保底掉落、25% 額外掉落專屬裝備；5 份材料可製造。既有裝備會轉為角色所屬職業，舊詞條列為尋常。</p><p>最終 BOSS 同步調整為 180,000 生命、1,000 攻擊。建議 LV30、二轉、10 級技能、星隕 +10、職業詞條與寶石配置，搭配治療藥水。</p></section>`+originalGuide().replace('85,000 生命、850 攻擊','180,000 生命、1,000 攻擊').replaceAll('核心技能 5 級','核心技能 10 級').replace('裝備職業通用：武器會依職業作為近戰、弓箭或法術攻擊來源。','裝備限定對應職業使用；劍／板甲／戰旗、法杖／法袍／魔典、弓／皮甲／箭袋、權杖／聖衣／聖徽分別對應四職業。');};

const priorToggle=toggleBattle;toggleBattle=function(){motion={};priorToggle();};
setInterval(()=>{if(state&&state.board?.next<=Date.now()&&MAPS[questRegion()]?.mobs?.length){ensureBoard();if(tab==='quests')render();}},1000);

// All portraits and bestiary art use the same pixel-art asset family.
let lastDefeatedEnemy=null;
function monsterPixel(index,mini=false,element='physical'){return '';}

const monsterArtByMaterial=new Map();
MAPS.forEach((m,mi)=>{m.mobs.concat([m.boss]).forEach((mob,j)=>{let index=mi===6?24:mi*4+j;monsterArtByMaterial.set(mob[2],index);mob[1]=monsterPixel(index,true);});});
enemyArt=function(e){let shown=e||lastDefeatedEnemy;if(!shown)return '<span class="waiting-art">尚未開始探索</span>';let index=monsterArtByMaterial.get(shown.mat);return monsterPixel(index??24,false,shown.element||species.get(shown.mat)?.element||'physical');};
CLASSES.forEach((c,i)=>{c.icon=pixel(i,'mini-portrait');});
GEMS.forEach((g,i)=>{g.icon='';});

chooseMap=function(i){lastDefeatedEnemy=null;imageSafeMap(i);};

function equipmentArt(g){return '';}

let forgeSelection=null;
function gearFilters(){return `<div class="filters"><label>部位<select onchange="setFilter('slot',this.value)">${[['all','全部部位'],[0,'武器'],[1,'護甲'],[2,'副手'],[3,'飾品']].map(([v,n])=>`<option value="${v}" ${String(v)===filters.slot?'selected':''}>${n}</option>`).join('')}</select></label><label>品質<select onchange="setFilter('rar',this.value)">${[['all','全部品質'],...RARITY.map((n,i)=>[i,n])].map(([v,n])=>`<option value="${v}" ${String(v)===filters.rar?'selected':''}>${n}</option>`).join('')}</select></label><label>最高詞條<select onchange="setFilter('effectRank',this.value)">${[['all','全部詞條'],[1,'綠字'],[2,'藍字'],[3,'黃字']].map(([v,n])=>`<option value="${v}" ${String(v)===String(filters.effectRank??'all')?'selected':''}>${n}</option>`).join('')}</select></label><label>職業<select onchange="setFilter('job',this.value)">${[['all','全部職業'],...CLASSES.map((c,i)=>[i,c.name])].map(([v,n])=>`<option value="${v}" ${String(v)===filters.job?'selected':''}>${n}</option>`).join('')}</select></label><label><input type="checkbox" ${filters.special?'checked':''} onchange="setFilter('special',this.checked)"> BOSS／技能詞條</label></div>`;}
function resourceLine(){return `<div class="resource-line">◈ ${state.gold.toLocaleString()} 金幣　▰ ${state.ore} 鍛鐵　 ${state.dust} 粉塵　光輝碎塊 ${state.materials['光輝碎塊']||0}</div>`;}
function materialView(){return `<details class="panel material-panel"><summary>材料庫存 · ${Object.values(state.materials).filter(n=>n>0).length} 種</summary><div class="material-tags">${Object.entries(state.materials).filter(([,n])=>n>0).map(([k,n])=>`<span class="tag">${esc(k)} ×${n}</span>`).join('')||'尚未取得材料'}</div></details>`;}
function equipmentView(){let items=filteredGear();return heading('INVENTORY / 背包','整理行囊',`<span class="tag">${items.length} / ${state.bag.length} 件</span>`)+`<section class="panel inventory-panel">${resourceLine()}${gearFilters()}<div class="row inventory-toolbar"><span class="small">點選裝備查看完整數值與詞條。</span><button onclick="salvageAll()">分解未養成普通裝備</button></div><p class="small">批次分解不受篩選影響；保留已強化、帶詞條與 BOSS 裝備。</p><div class="inventory-table" aria-label="裝備背包">${items.map(g=>`<button class="inventory-row rarity-row-${g.rar}" onclick="showGearDetail('${g.id}')" aria-label="查看 ${esc(equipmentDisplayName(g))}">${equipmentArt(g)}<span class="inventory-name"><b>${equipmentNameHTML(g)}</b><small>${gearWearableJobsText(g)} · ${CLASS_GEAR[g.job][g.slot]} · LV${gearRequiredLevelByTier(g.tier)}</small></span><span class="inventory-quality"><span class="rank-${g.rar}">${RARITY[g.rar]}</span>${g.boss!==undefined?'<small>BOSS 專屬</small>':''}</span><span class="inventory-summary">${gearDesc(g)}</span><span class="inventory-state">${state.equipped.includes(g.id)?'<span class="tag">已穿戴</span>':'查看詳情 ›'}</span></button>`).join('')||'<div class="empty">沒有符合篩選的裝備。</div>'}</div></section>${materialView()}`;};
function showGearDetail(id){let g=findGear(id);if(!g)return;let worn=state.equipped.includes(g.id);$('modal').innerHTML=`<div class="gear-detail-header">${equipmentArt(g)}<div><span class="tag">${RARITY[g.rar]}${g.boss!==undefined?' · BOSS 專屬':''}${worn?' · 已穿戴':''}</span><h2>${equipmentNameHTML(g)}</h2><p class="small">${g.slot===1?'全職業通用':CLASSES[g.job].name+'限定'} · ${CLASS_GEAR[g.job][g.slot]} · LV${gearRequiredLevelByTier(g.tier)}</p></div></div><div class="detail-stat"><h3>裝備能力</h3><p class="equipment-total-summary">${globalThis.equipmentTotalSummaryText(g)}</p>${globalThis.equipmentAttributeDetailsHTML(g)}</div>${g.boss!==undefined?`<p class="small">來自 ${MAPS[g.region??g.boss].boss[0]}，亦可收集 ${bossMaterial(g.region??g.boss,g.difficulty||0)} ×5 製造。</p>`:''}<div class="actions"><button class="primary" onclick="equipFromDetail('${id}')" ${worn||!gearWearableJobs(g).includes(state.job)||state.lv<gearRequiredLevelByTier(g.tier)?'disabled':''}>${worn?'已穿戴':'穿戴裝備'}</button><button onclick="openForge('${id}')">前往強化</button><button onclick="salvageFromDetail('${id}')" ${worn?'disabled':''}>分解</button><button onclick="closeModal()">關閉</button></div>`;$('modal').showModal();}
function equipFromDetail(id){equipGear(id);closeModal();showGearDetail(id);}
function salvageFromDetail(id){if(state.equipped.includes(id))return;closeModal();salvage(id);}
function openForge(id){if(!findGear(id))return;forgeSelection=id;closeModal();setTab('forge');}
function chooseForge(id){forgeSelection=id;render();}
function forgeView(){let g=findGear(forgeSelection)||equipment(state)[0]||state.bag[0];if(g)forgeSelection=g.id;return heading('FORGE / 裝備強化','強化與洗鍊')+`<section class="panel">${resourceLine()}${uiHelp('強化說明','強化必定成功，最高 +'+RULES.enhanceMax+'。')}${g?`<label class="forge-picker">選擇裝備<select aria-label="強化目標" onchange="chooseForge(this.value)">${forgeEquipmentOptions(g.id)}</select></label><div class="forge-layout"><article class="forge-preview"><div class="gear-detail-header">${equipmentArt(g)}<div><span class="tag">${RARITY[g.rar]}${g.boss!==undefined?' · BOSS 專屬':''}</span><h2>${equipmentNameHTML(g)}</h2><p class="small">${CLASSES[g.job].name} · LV${gearRequiredLevelByTier(g.tier)}</p></div></div><h3>目前能力</h3><p class="equipment-total-summary">${globalThis.equipmentTotalSummaryText(g)}</p>${globalThis.equipmentAttributeDetailsHTML(g)}</article><div class="forge-controls"><section class="forge-action"><h3>強化基礎能力</h3>${g.plus<RULES.enhanceMax?`<p class="green">下一級 +${g.plus+1}：${globalThis.equipmentTotalSummaryText({...g,plus:g.plus+1})}</p><p class="small">費用：${upgradeCostText(g)} · 成功率 100%</p><button class="primary" onclick="enhance('${g.id}')" ${!canEnhance(g)?'disabled':''}>強化至 +${g.plus+1}</button>`:'<p class="gold">已達 +10 強化上限。</p>'}</section><section class="forge-action"><h3>洗鍊隨機詞條</h3>${uiHelp('洗鍊說明','每條詞條品質：'+qualityChanceText()+'。重骰時逐次扣款；自動洗鍊會在至少出現一條指定品質以上詞條時停止，最後結果仍可選擇採用或保留。')}<p>◈ ${rerollCostFor(g).gold} 金幣 ＋ ${rerollCostFor(g).ore} 鍛鐵／次</p><div class="actions"><button onclick="reroll('${g.id}')" ${state.gold<rerollCostFor(g).gold||state.ore<rerollCostFor(g).ore?'disabled':''}>洗鍊一次</button><button onclick="autoReroll('${g.id}',2)" ${state.gold<rerollCostFor(g).gold||state.ore<rerollCostFor(g).ore?'disabled':''}>自動洗到稀有+</button><button onclick="autoReroll('${g.id}',3)" ${state.gold<rerollCostFor(g).gold||state.ore<rerollCostFor(g).ore?'disabled':''}>自動洗到傳說</button></div></section></div></div>`:'<div class="empty">背包沒有裝備，請先探索取得裝備。</div>'}</section>`;}

function battleView(){const m=MAPS[state.map],v=stats(),shown=enemy||lastDefeatedEnemy,c=CLASSES[state.job],dead=state.hp<=0,phase=dead?'戰敗 · 請先戰後恢復':enemy?(running?'交戰中':'戰鬥暫停'):lastDefeatedEnemy?(running?'勝利 · 搜尋下一個敵人':'戰鬥結束'):'整備 · 尚未探索',procCount=c.skills.filter((s,i)=>s[1]==='proc'&&state.skills[i]>0).length;return heading('EXPEDITION / 荒野遠征',m.name,`<span class="tag encounter-status">${phase}</span>`)+`<div class="combat-layout"><section class="panel encounter-panel"><div class="encounter-topline"><span>區域 LV ${m.min}${state.map===6?'':'–'+m.max}</span><span class="round-counter">第 <b>${round}</b> 回合</span><span>${shown?shown.kind==='final'?'終局首領':shown.kind==='boss'?'地圖首領':shown.kind==='elite'?'菁英遭遇':'普通遭遇':'等待出發'}</span></div><div class="battle-arena"><article class="combatant player-combatant"><div class="combatant-label"><b>${esc(characterName(state))}</b><span>LV ${state.lv}</span></div><div class="health-readout"><span>生命</span><b>${Math.ceil(state.hp)} <small>/ ${v.hp}</small></b></div>${battleHealthMeter(state.hp,v.hp,battleShieldValue(state))}<div class="combatant-art"><div class="sprite player-sprite ${running&&motion.player?'attack-pose':''} ${running&&motion.skill?'cast-pose':''}">${pixel(state.job)}</div></div><div class="combatant-foot"><span>攻擊 ${v.atk}</span><span>護盾 ${Math.ceil(state.shield)}</span></div></article><div class="combat-center"><span class="duel-mark"></span><span>${enemy?'交戰':lastDefeatedEnemy?'勝利':'遠征'}</span><small>${running?'自動戰鬥':dead?'需要休息':'等待指令'}</small></div><article class="combatant enemy-combatant"><div class="combatant-label"><b>${shown?esc(shown.name):'未知的相遇'}</b><span>${shown?'LV '+shown.lv:'—'}</span></div><div class="health-readout"><span>生命</span><b>${enemy?Math.ceil(enemy.hp):0} <small>/ ${shown?shown.maxhp:'—'}</small></b></div>${battleHealthMeter(enemy?enemy.hp:0,shown?shown.maxhp:1,battleShieldValue(enemy))}<div class="combatant-art"><div class="sprite enemy-sprite ${running&&enemy&&motion.enemy?'enemy-pose':''}">${enemyArt(enemy)}</div></div><div class="combatant-foot"><span>${shown?'防禦 '+shown.def:'探索時隨機遇敵'}</span><span>${shown?'攻擊 '+shown.atk:''}</span></div></article></div><div class="battle-command"><button class="primary battle-toggle" onclick="toggleBattle()" ${dead?'disabled':''}>${running?'Ⅱ 暫停探索':'▶ 開始自動探索'}</button><span class="small">1 秒／回合 · 對話框開啟時暫停</span></div><section class="battle-loadout"><div class="row"><h3>戰鬥技能</h3><span class="small">${procCount} 項普攻觸發技已啟用</span><button class="text-button" onclick="setTab('skills')">調整配置 ›</button></div><div class="skill-strip">${state.active.map((id,i)=>`<div class="skill-slot ${id!==null&&!cd[id]?'skill-ready':''}"><div class="row"><span class="small">主動槽 ${i+1}</span><span class="skill-cooldown">${id===null?'未配置':cd[id]>0?cd[id]+' 回合':'就緒'}</span></div><b>${id===null?'空的技能槽':c.skills[id][0]}</b><span class="small">${id===null?'前往技能頁選擇主動技能':'技能 Lv.'+state.skills[id]+(state.sockets[id]!==null?' · '+GEMS[state.sockets[id]].name:'')}</span></div>`).join('')}</div></section><section class="supply-bar"><div><b>治療藥水 <span class="gold">×${state.potions}</span></b><label><input type="checkbox" ${state.autoPotion?'checked':''} onchange="state.autoPotion=this.checked;save()"> 生命低於 35% 自動使用</label></div><div class="supply-actions"><button onclick="potion()" ${state.potions<1||state.hp>=v.hp?'disabled':''}>使用藥水</button><button onclick="buyPotion()" ${state.gold<75?'disabled':''}>補給 +5 · 75◈</button></div></section></section><section class="panel combat-journal"><div class="journal-heading"><span class="eyebrow">BATTLE JOURNAL</span><span class="small">即時紀錄</span></div><div id="liveLog" class="journal-content" role="log" aria-live="polite" aria-label="戰鬥紀錄">${logContent()}</div><div class="journal-note">戰鬥事件依普攻、技能與敵方行動順序列出。<br>展開歷史紀錄可回看掉落與升級。</div></section></div><section class="panel destination-panel"><div class="row"><div><span class="eyebrow">WORLD / 目的地</span><h2>選擇探索區域</h2></div><span class="small">切換地圖會停止探索並放棄當前遭遇</span></div><div class="destination-grid">${MAPS.map((x,i)=>`<button class="destination ${state.map===i?'selected':''}" onclick="chooseMap(${i})" ${!canVisit(i)?'disabled':''}><span class="destination-icon">${x.icon}</span><b>${x.name}</b><small>LV ${x.min}${i===6?' · 終局':'–'+x.max}</small></button>`).join('')}</div><details class="region-bestiary"><summary>${m.name} · 怪物與掉落圖鑑</summary><div class="bestiary-grid">${m.mobs.concat([m.boss]).map(x=>`<article class="bestiary-item">${x[1]}<div><b>${x[0]}</b><small>${x[2]}</small></div></article>`).join('')}</div><p class="small">專屬素材：普通怪 65%、菁英與首領 100%。一般裝備 22% 起、技能寶石 4% 起；地圖 BOSS 專屬裝備 25%，或以 5 份素材保底製作。</p></details></section>`;};

const MODES=[{name:'普通',hp:1,atk:1,def:1,xp:1,equip:[.22,.55,1],gem:[.04,.12,.35],boss:.25,ore:1,rare:.0015},{name:'困難',hp:1.8,atk:1.35,def:1.2,xp:1.3,equip:[.38,.75,1],gem:[.08,.22,.5],boss:.4,ore:1.5,rare:.004},{name:'地獄',hp:3,atk:1.8,def:1.45,xp:1.65,equip:[.55,.95,1],gem:[.13,.35,.7],boss:.6,ore:2,rare:.008}];
const ASCENDED_NAMES=['翠影秘境','深淵礦脈','幽冥水澤','極夜冰川','煉獄熔城','天隕聖域'];
for(let i=0;i<6;i++){let original=MAPS[i];let map={...original,name:ASCENDED_NAMES[i],min:31+i*5,max:35+i*5,family:i,mobs:original.mobs.map(x=>['覺醒・'+x[0],x[1],'覺醒'+x[2]]),boss:['覺醒・'+original.boss[0],original.boss[1],'覺醒'+original.boss[2]]};MAPS.push(map);map.mobs.concat([map.boss]).forEach((x,j)=>monsterArtByMaterial.set(x[2],i*4+j));}
function levelCap(s=state){return s?.won?60:30;}
function regionTier(mi){return mi===6?6:Math.ceil(MAPS[mi].min/5);}
function regionFamily(mi){return MAPS[mi].family??(mi>6?mi-7:Math.min(mi,5));}
function canVisit(mi,s=state){if(!s||!Number.isInteger(mi)||!MAPS[mi])return false;return mi===6?s.lv>=30:MAPS[mi].min>30?s.won&&MAPS[mi].min<=s.lv+5:MAPS[mi].min<=s.lv+5;}
function bossMaterial(mi,mode=state.difficulty||0){return (mode?'【'+MODES[mode].name+'】':'')+MAPS[mi].boss[2];}

const tierPrefixes=['旅人','礦紋','暮影','霜刻','熔火','星隕','翠影','深淵','幽冥','極夜','煉獄','天隕'];
function gearName(g){return (g.difficulty?'【'+MODES[g.difficulty].name+'】':'')+(g.boss!==undefined?(g.tier>6?'覺醒・':'')+BOSS_GEAR[g.boss]:tierPrefixes[g.tier-1])+CLASS_GEAR[g.job??state?.job??0][g.slot];};

function bossPower(g){return g.boss!==undefined?[1,1.25,1.55][g.difficulty||0]:1;}

function modeAffixes(g,mode){if(mode===0)return;g.difficulty=mode;g.name=gearName(g);if(g.affix.length||Math.random()<(mode===1?.65:.9)){g.affix=rollAffixes(g);let a=g.affix[0],r=Math.random();a.rank=mode===1?(r<.7?1:r<.95?2:3):(r<.35?1:r<.85?2:3);if(Math.random()<.4){a.type=4;a.skill=rand(6);a.value=[0,18,30,45][a.rank];}else{a.type=rand(4);a.value=a.type===0?Math.round(g.tier*5*[1,1.4,1.9,2.6][a.rank]):a.type===1?Math.round(g.tier*25*[1,1.4,1.9,2.6][a.rank]):a.type===2?g.tier*(3+a.rank):4+a.rank*3;}}}
function bossGear(mi,job=state.job,mode=state.difficulty||0){let family=regionFamily(mi),g=gear(regionTier(mi),bossEquipmentSlot(family),mode===2?3:2,job);g.boss=family;g.region=mi;g.difficulty=mode;g.name=gearName(g);g.affix[0]={type:4,rank:mode===2?3:2,skill:family,value:[30,40,55][mode]};return g;};
function craftBoss(mi){if(mi===6||!canVisit(mi))return;let mode=state.difficulty||0,mat=bossMaterial(mi,mode),cost=regionTier(mi)*250*(mode+1);if(state.lv<MAPS[mi].min||state.gold<cost||(state.materials[mat]||0)<5)return toast('等級、金幣或對應難度的 BOSS 素材不足');if(state.bag.length>=RULES.bagCapacity)return toast('背包已滿，請先整理再製作');state.gold-=cost;state.materials[mat]-=5;addGear(bossGear(mi));save();render();toast('已製作'+MODES[mode].name+' BOSS 專屬裝備');};
function makeEnemy(mi=state.map,s=state,rng=Math.random){let e=makeBaseEnemy(mi,s,rng),mode=s.difficulty||0,d=MODES[mode];if(e.lv>30&&e.kind!=='final'){let progress=e.lv-30;e.hp=Math.round(e.hp*(2+progress*.1));e.maxhp=e.hp;e.atk=Math.round(e.atk*(2+progress*.06));e.def=Math.round(e.def*1.6);}e.hp=Math.round(e.hp*d.hp);e.maxhp=e.hp;e.atk=Math.round(e.atk*d.atk);e.def=Math.round(e.def*d.def);e.difficulty=mode;e.region=mi;return e;};

function modePicker(){let mode=state.difficulty||0,d=MODES[mode];return `<section class="panel difficulty-panel"><div><span class="eyebrow">WORLD DIFFICULTY</span><label>探索難度 <select aria-label="探索難度" onchange="changeDifficulty(this.value)">${MODES.map((x,i)=>`<option value="${i}" ${mode===i?'selected':''}>${x.name}</option>`).join('')}</select></label></div><p>怪物生命 ×${d.hp} · 攻擊 ×${d.atk} · 防禦 ×${d.def}<br><span class="small">切換會結束目前遭遇；不會恢復生命。</span></p><p class="small">普通怪裝備 ${Math.round(d.equip[0]*100)}%／寶石 ${Math.round(d.gem[0]*100)}%<br>BOSS 專屬裝備 ${d.boss*100}% · 金幣／經驗 ×${d.xp}</p></section>`;}
const progressionBattleView=battleView;battleView=function(){let d=MODES[state.difficulty||0];return modePicker()+progressionBattleView().replace('專屬素材：普通怪 65%、菁英與首領 100%。一般裝備 22% 起、技能寶石 4% 起；地圖 BOSS 專屬裝備 25%，或以 5 份素材保底製作。',`目前模式：普通怪素材 ${Math.round((GAMEPLAY_SETTINGS.difficulty.materialChance[state.difficulty||0]??0)*100)}%、裝備 ${Math.round(d.equip[0]*100)}%、寶石 ${Math.round(d.gem[0]*100)}%。菁英與首領素材必掉，地圖 BOSS 專屬裝備 ${d.boss*100}%；${Math.round(GS('equipment.boss.craftMaterialCount',5))} 份對應難度素材可保底製作。`);};
function bossCraftView(){let mode=state.difficulty||0;return heading('BOSS WORKSHOP / 首領製作',MODES[mode].name+'模式專屬裝備')+modePicker()+`<section class="panel">${resourceLine()}${uiHelp('製作說明','須使用對應難度素材。困難：基礎能力 +25%、技能效果 +40%；地獄：基礎能力 +55%、傳說品質、技能效果 +55%。')}</section><div class="cards boss-recipes">${MAPS.map((m,i)=>{if(i===6)return '';let family=regionFamily(i),g={job:state.job,slot:bossEquipmentSlot(family),tier:regionTier(i),boss:family,region:i,difficulty:mode,rar:mode===2?3:2,plus:0,affix:[{type:4,rank:mode===2?3:2,skill:family,value:[30,40,55][mode]}]},mat=bossMaterial(i),n=state.materials[mat]||0,cost=g.tier*250*(mode+1),ready=canVisit(i)&&state.lv>=m.min&&state.gold>=cost&&n>=5;return `<article class="card boss-recipe">${equipmentArt(g)}<span class="tag">${m.name}</span><h3>${equipmentNameHTML(g)}</h3><p class="small">${esc(characterName(state))} · LV${m.min} · ${mode===2?'傳說':'稀有'}</p><p class="effect-quality-${mode===2?3:2}">${CLASSES[state.job].skills[family][0]} 效果 +${[30,40,55][mode]}%</p><div class="recipe-cost"><span>${mat} ${n}/5</span><span>◈ ${cost}</span></div><button class="primary" onclick="craftBoss(${i})" ${ready?'':'disabled'}>${!canVisit(i)?'尚未解鎖':ready?'製作裝備':'等級／材料不足'}</button></article>`;}).join('')}</div>`;};
function awardXP(amount){if(state.lv>=levelCap())return;state.xp+=amount;while(state.lv<levelCap()&&state.xp>=need(state.lv)){state.xp-=need(state.lv);state.lv++;state.ap+=3;state.sp+=2;state.hp=stats().hp;note(`升至 LV${state.lv}！能力點 +3、技能點 +2`);}if(state.lv===levelCap())state.xp=0;}
function victory(){let e=enemy;if(!e)return;lastDefeatedEnemy={...e};let mode=e.difficulty||0,d=MODES[mode],mi=e.region??state.map,tier=regionTier(mi),kindIndex=e.kind==='normal'?0:e.kind==='elite'?1:2,mult=[1,1.7,3][kindIndex],firstClear=e.kind==='final'&&!state.won;state.totalKills++;state.kills[e.mat]=(state.kills[e.mat]||0)+1;if(!state.discovered.includes(e.mat))state.discovered.push(e.mat);let gold=Math.round((12+e.lv*4)*mult*d.xp),xp=Math.round((15+e.lv*6)*mult*d.xp);state.gold+=gold;state.ore+=Math.ceil(tier*(kindIndex===0?1:3)*d.ore);if(Math.random()<[.65,.8,.95][mode]||kindIndex>0){let mat=e.kind==='boss'?bossMaterial(mi,mode):e.mat;state.materials[mat]=(state.materials[mat]||0)+1;note('獲得 '+mat+' ×1');}if(Math.random()<d.equip[kindIndex]){let g=gear(tier,rand(4),Math.random()<.18?2:Math.random()<.45?1:0);modeAffixes(g,mode);addGear(g);}if(Math.random()<d.rare){let g=gear(tier,rand(4),3);modeAffixes(g,mode);addGear(g);}if(e.kind==='boss'&&mi!==6&&Math.random()<d.boss)addGear(bossGear(mi,state.job,mode));if(Math.random()<d.gem[kindIndex]){let i=rand(3);state.gems[i]++;note('獲得 '+GEMS[i].name);}awardEther(e);if(Math.random()<.08)state.potions++;if(Math.random()<radiantDropChance(e.kind)){state.materials['光輝碎塊']=(state.materials['光輝碎塊']||0)+1;note('獲得極稀有道具：光輝碎塊 ×1');}if(e.kind==='final'){state.won=true;state.modeClears[mode]++;state.materials['日蝕王冠']=1;running=false;}awardXP(xp);state.hp=Math.min(stats().hp,state.hp+stats().hp*.12);state.shield=0;note(`擊敗 ${e.name}（${d.name}）· +${xp} EXP、${gold} 金幣`);enemy=null;if(e.kind==='final'){$('modal').innerHTML=`<h1>${firstClear?'等級界限已突破':'再次戰勝噬日者'}</h1><p>${d.name}模式通關。${firstClear?'等級上限提升至 LV60，開放 LV31～60 的六張覺醒地圖。':'可繼續探索覺醒地圖，或挑戰更高難度。'}</p><p>角色每次升級仍獲得 3 能力點與 2 技能點。高階裝備依區域掉落。</p><button class="primary" onclick="closeModal()">繼續旅程</button>`;$('modal').showModal();}save();};
const progressionGuide=guideView;guideView=function(){return `<section class="panel"><h2>難度與界限突破</h2><p>到達 LV30 並擊敗任一難度的噬日者後，等級上限解鎖至 LV60。既有已通關存檔會直接解鎖；不會自動贈送等級。未通關時仍停在 LV30。</p><table class="mode-table"><thead><tr><th>模式</th><th>生命／攻擊／防禦</th><th>普通怪裝備／寶石</th><th>BOSS 專屬</th></tr></thead><tbody>${MODES.map(d=>`<tr><td>${d.name}</td><td>×${d.hp}／×${d.atk}／×${d.def}</td><td>${d.equip[0]*100}%／${d.gem[0]*100}%</td><td>${d.boss*100}%</td></tr>`).join('')}</tbody></table><p>困難普通／精良裝備有 65% 機會直接附帶詞條，地獄為 90%；已有詞條的掉落也會重新套用難度詞條，其中至少一條為稀有以上，可能強化職業技能。洗鍊的機率與費用維持原設定。</p><p>困難 BOSS 裝備：基礎能力 ×1.25、固定技能效果 +40%。地獄 BOSS 裝備：基礎能力 ×1.55、傳說品質、固定技能效果 +55%。以相同品質比較倍率，品質加成另計。素材與裝備會標示難度；切換模式不影響已獲得裝備。</p><p>覺醒地圖覆蓋 31–35、36–40、41–45、46–50、51–55、56–60 級。每區三種普通怪與一隻 BOSS，沿用對應物種圖像，掉落新素材及階級 7–12 裝備；一般遇敵仍限制不高於玩家 5 級。</p></section>`+progressionGuide().replace('LV30 仍為上限','未通關上限為 LV30；通關後為 LV60').replace('等級的終點是 30','等級的終點是 60');};

function gear(tier=1,slot=rand(4),rar=0,job=null) {
  const owner=job??(state?(Math.random()<.75?state.job:rand(4)):0);
  const g={id:uid(),tier,slot,rar,plus:0,affix:[],job:owner,difficulty:0};
  g.name=gearName(g);
  if(rar>=2)g.affix=rollAffixes(g);
  return g;
}
// Shared rules: rewards, UI and validation use the same limits and region mapping.
const RULES = Object.freeze({get bagCapacity(){return Math.max(1,Math.floor(GS('equipment.bagCapacity',720)));},get maxLevel(){return Math.max(1,Math.floor(GS('progression.levelCaps.afterClear',60)));},get skillMax(){return Math.max(1,Math.floor(GS('skills.core.maxLevel',10)));},get enhanceMax(){return Math.max(0,Math.floor(GS('equipment.enhance.maxLevel',10)));},affixMax:10000});
function skillCap(s=state) { return Math.min(RULES.skillMax, Math.max(1,Math.floor(GS('skills.core.initialCap',2)))+Math.floor(s.lv/Math.max(1,GS('skills.core.capLevelsPerStep',3)))); }
function questRegion(s=state) { return s.map===6?5:s.map; }
function boardRefreshCost() { return regionTier(questRegion())*GS('quests.board.refreshGoldPerTier',150); }
function clampVitals() {
  const v=stats();
  state.hp=Math.max(0,Math.min(state.hp,v.hp));
  state.shield=Number.isFinite(state.shield)?Math.max(0,state.shield):0;
}
function applyPureShield(target,amount){
  const generated=Math.max(0,Math.round(Number(amount)||0));
  const previous=Number.isFinite(target.shield)?Math.max(0,target.shield):0;
  target.shield=Math.max(previous,generated);
  return {generated,previous,current:target.shield,upgraded:generated>previous};
}
function pureShieldCastLog(caster,skillName,result){
  if(result.upgraded)return `${characterName(caster)}・${skillName} → 獲得護盾 ${result.generated}，目前護盾 ${Math.round(result.current)}`;
  return `${characterName(caster)}・${skillName} → 產生護盾 ${result.generated}，現有護盾 ${Math.round(result.previous)} 較高，維持不變`;
}
function resetEncounter() {
  running=false; enemy=null; lastDefeatedEnemy=null; cd={}; round=0;
  motion={}; currentEvents=[];
  if(state) state.shield=0;
}
function resetSession() {
  resetEncounter(); logs=[]; eventHistory=[]; pendingAffix=null; pendingImport=null;
  forgeSelection=null; filters={slot:'all',job:'all',boss:'all',effectRank:'all'}; tab='battle';
  inlineAffixDrafts.clear();pageHeroSelection.clear();teamForgeSelection.clear();viewPositions.clear();previousViewKey=null;inventoryCategory='equipment';massSalvageIds=null;skillPanel='active';
}
function migrate(s) {
  if(s.version===1) {
    s.bag.forEach(g=>{g.job=s.job;g.affix.forEach(a=>a.rank=0);g.name=gearName(g);});
    s.version=2;
  }
  s.board??={next:0,serial:0,tasks:[]};
  s.difficulty??=0; s.modeClears??=[s.won?1:0,0,0];
  return s;
}
function gearBaseStats(g) {
  const f=(1+g.rar*.25)*(1+g.plus*.12)*bossPower(g), tier=g.tier;
  return {atk:g.slot===0?tier*11*f:[2,3].includes(g.slot)?tier*4*f:0,
    hp:g.slot===1?tier*45*f:[2,3].includes(g.slot)?tier*20*f:0,
    def:g.slot===1?tier*4*f:0};
}
function stats(s=state) {
  const c=CLASSES[s.job];
  const v={hp:c.hp+(s.lv-1)*20+s.stats[1]*12,atk:c.atk+(s.lv-1)*4+s.stats[0]*2,
    def:c.def+(s.lv-1)*2+s.stats[2]*1.3,crit:s.job===2?.17:.07};
  if(s.advanced){v.hp*=1.18;v.atk*=1.22;v.def*=1.15;}
  for(const g of equipment(s)) {
    const base=gearBaseStats(g);
    for(const key of ['hp','atk','def']) v[key]+=base[key];
    for(const a of g.affix) {
      const key=['atk','hp','def','crit'][a.type];
      if(key) v[key]+=a.value/(key==='crit'?100:1);
    }
  }
  v.crit=Math.min(.65,v.crit);
  for(const key of ['hp','atk','def'])v[key]=Math.round(v[key]);
  return v;
}
function gearDesc(g) {
  const v=gearBaseStats(g);
  return ['atk','hp','def'].filter(k=>v[k]).map(k=>`${{atk:'攻擊',hp:'生命',def:'防禦'}[k]} +${Math.round(v[k])}`).join(' / ');
}
function migrateLegacyEquipmentSlotsInSave(s){
 if(!s||!Array.isArray(s.bag))return s;
 for(const g of s.bag){if(g?.slot!==2||g.formJob!==undefined)continue;if(g.boss===5){g.slot=3;continue;}if(g.boss===undefined&&Number.isInteger(g.form)&&g.form>0){g.slot=3;g.form=Math.max(0,g.form-1);}}
 if(!Array.isArray(s.equipped)||s.equipped.length!==3)return s;const oldEquipped=[...s.equipped];
 s.equipped=[oldEquipped[0]??null,oldEquipped[1]??null,null,null,null];const oldThird=oldEquipped[2];if(oldThird!==null&&oldThird!==undefined){const gear=s.bag.find(g=>g.id===oldThird),positions=gearEquipPositions(gear);if(positions.length)s.equipped[positions[0]]=oldThird;}return s;
}
// Validate a private copy; migrations never modify an untrusted caller object.
function validateSave(input) {
  const fail=message=>{throw Error(message);};
  const int=(v,min=0,max=1e12)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const num=(v,min=0,max=1e12)=>Number.isFinite(v)&&v>=min&&v<=max;
  const array=(v,n)=>Array.isArray(v)&&v.length===n;
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  if(!object(input)||![1,2].includes(input.version))fail('存檔版本不符');
  const s=migrateLegacyEquipmentSlotsInSave(JSON.parse(JSON.stringify(input))),legacy=s.version===1;
  if(!int(s.job,0,3)||!int(s.lv,1,RULES.maxLevel)||!int(s.map,0,MAPS.length-1))fail('角色或地圖無效');
  for(const k of ['gold','ore','dust','sp','ap','totalKills','repeat','potions','xp'])if(!int(s[k]))fail('資源數值無效');
  for(const k of ['hp','shield'])if(!num(s[k]))fail('生命資料無效');
  const skillCount=CLASSES[s.job].skills.length,MAX_SAVE_SKILLS=64;
  // Boot-time validation runs before some late modules append their built-in skills.
  // Preserve a bounded trailing skill/socket segment here and validate it again after
  // those modules are installed; otherwise a save written by the same build cannot reload.
  if(Array.isArray(s.skills)&&s.skills.length<skillCount)while(s.skills.length<skillCount)s.skills.push(0);
  if(Array.isArray(s.sockets)&&s.sockets.length<skillCount)while(s.sockets.length<skillCount)s.sockets.push(null);
  if(!array(s.stats,3)||!s.stats.every(v=>int(v,0,100000)))fail('能力值陣列無效');
  if(!Array.isArray(s.skills)||s.skills.length<skillCount||s.skills.length>MAX_SAVE_SKILLS||!s.skills.every(v=>int(v,0,RULES.skillMax)))fail('技能陣列無效');
  if(!array(s.gems,3)||!s.gems.every(v=>int(v,0,1e9)))fail('寶石陣列無效');
  for(const k of ['advanced','won','autoPotion'])if(typeof s[k]!=='boolean')fail('角色狀態無效');
  if(!int(s.tutorial,0,3)||s.advanced&&s.lv<GS('progression.advance.level',15)||s.won&&s.lv<GS('progression.levelCaps.beforeClear',30))fail('角色進度無效');
  for(let i=0;i<skillCount;i++)if(s.skills[i]>0&&(s.lv<CLASSES[s.job].skills[i][2]||skillRequiresAdvanced(CLASSES[s.job].skills[i],i)&&!s.advanced))fail('尚未解鎖的技能');
  if(!array(s.active,2)||!s.active.every(i=>i===null||int(i,0,s.skills.length-1)&&s.skills[i]>0&&(i>=skillCount||CLASSES[s.job].skills[i][1]==='active'))||s.active[0]!==null&&s.active[0]===s.active[1])fail('主動槽無效');
  // Unknown trailing active slots belong to late-installed skills. Do not expose them
  // to early renderers; the original boot bytes are rehydrated after those skills exist.
  if(s.active.some(i=>i!==null&&i>=skillCount))s.active=s.active.map(i=>i!==null&&i>=skillCount?null:i);
  if(!Array.isArray(s.sockets)||s.sockets.length!==s.skills.length||s.sockets.length>MAX_SAVE_SKILLS||!s.sockets.every((v,i)=>v===null||int(v,0,2)&&s.skills[i]>0))fail('寶石插槽無效');
  if(!Array.isArray(s.bag)||s.bag.length>RULES.bagCapacity)fail('背包無效');
  const ids=new Set();
  for(const g of s.bag) {
    // Types 16/17 are persisted by later gameplay modules, so boot-time validation must accept them before those modules execute.
    if(!object(g)||typeof g.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(g.id)||ids.has(g.id)||typeof g.name!=='string'||g.name.length>80||/[<>]/.test(g.name)||!int(g.tier,1,12)||!int(g.slot,0,3)||!int(g.rar,0,3)||!int(g.plus,0,RULES.enhanceMax)||!Array.isArray(g.affix)||g.affix.length>2)fail('裝備資料無效');
    ids.add(g.id);
    if(g.rerolled!==undefined&&typeof g.rerolled!=='boolean')fail('洗鍊紀錄無效');
    if(g.affixLock!==undefined&&(!int(g.affixLock,0,1)||g.affixLock>=g.affix.length))fail('潛能鎖定資料無效');
    if(!legacy&&!int(g.job,0,3))fail('裝備職業無效');
    if(g.boss!==undefined&&!int(g.boss,0,5))fail('首領裝備無效');
    if(g.difficulty!==undefined&&!int(g.difficulty,0,2))fail('裝備難度無效');
    if(g.region!==undefined&&(!int(g.region,0,MAPS.length-1)||g.region===6||g.boss===undefined||regionFamily(g.region)!==g.boss||regionTier(g.region)!==g.tier))fail('裝備來源無效');
    for(const a of g.affix)if(!object(a)||!int(a.type,0,legacy?3:17)||!num(a.value,0,RULES.affixMax)||!legacy&&!int(a.rank,0,3)||[4,5].includes(a.type)&&!int(a.skill,0,MAX_SAVE_SKILLS-1)||[12,14].includes(a.type)&&!['fire','ice','wind','light','shadow'].includes(a.element)||a.type===13&&!['beast','plant','undead','construct','demon','spirit'].includes(a.race))fail('詞條資料無效');
  }
  if(!array(s.equipped,5)||new Set(s.equipped.filter(Boolean)).size!==s.equipped.filter(Boolean).length||!s.equipped.every((id,i)=>id===null||s.bag.some(g=>g.id===id&&gearEquipPositions(g).includes(i)&&(legacy||gearWearableJobs(g).includes(s.job))&&s.lv>=gearRequiredLevelByTier(g.tier))))fail('穿戴資料無效');
  for(const k of ['materials','kills'])if(!object(s[k])||Object.entries(s[k]).some(([key,n])=>key.length>80||/[<>]/.test(key)||['__proto__','constructor','prototype'].includes(key)||!int(n,0,1e9)))fail('素材資料無效');
  for(const k of ['claimed','discovered'])if(!Array.isArray(s[k])||s[k].length>200||!s[k].every(v=>typeof v==='string'&&v.length<100))fail('圖鑑資料無效');
  // A v1 save has no commission board; ignore unknown extension fields.
  if(legacy)delete s.board;
  migrate(s);
  const b=s.board,questIds=new Set();
  if(!object(b)||!int(b.next,0,8.64e15)||!int(b.serial)||!Array.isArray(b.tasks)||b.tasks.length>12)fail('委託看板無效');
  for(const q of b.tasks) {
    if(!object(q)||typeof q.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(q.id)||questIds.has(q.id)||!int(q.map,0,MAPS.length-1)||q.map===6||!MAPS[q.map].mobs.some(m=>m[2]===q.mat)||!int(q.n,1,100)||!['gear','gem'].includes(q.kind)||!int(q.gem,0,2)||!int(q.slot,0,3)||![2,3].includes(q.rar)||typeof q.done!=='boolean')fail('委託內容無效');
    questIds.add(q.id);
  }
  if(!int(s.difficulty,0,2)||!array(s.modeClears,3)||!s.modeClears.every(v=>int(v)))fail('難度資料無效');
  if(s.lv>levelCap(s)||!solo.canVisit(s.map,s))fail('尚未解鎖此等級或區域');
  return s;
}
function chooseMap(mi) { if(!canVisit(mi))return;resetEncounter();state.map=mi;save();render(); }
function changeDifficulty(value) {
  const mode=Number(value);
  if(!Number.isInteger(mode)||!MODES[mode]||mode===state.difficulty)return;
  resetEncounter();state.difficulty=mode;note('切換至'+MODES[mode].name+'模式，請重新開始探索。');save();render();
}
function acceptImport() {
  if(!pendingImport)return;
  const next=pendingImport; resetSession();state=next;clampVitals();closeModal();save();render();toast('存檔已載入');
}
function newGame() {
  resetSession();state=null;
  try{localStorage.removeItem(KEY);localStorage.removeItem(BACKUP_KEY);}catch{toast('瀏覽器無法移除舊存檔，請允許本機儲存');}
  closeModal();$('wallet').textContent='';render();
}
function start(job) {
  if(!Number.isInteger(job)||!CLASSES[job])return;
  resetSession();state=initial(job);note('抵達苔光林地。點擊「開始自動探索」展開第一場戰鬥。');save();render();
}
function claimRepeat() {
  const mi=questRegion(),mat=MAPS[mi].mobs[0][2];
  if((state.materials[mat]||0)<8)return;
  state.materials[mat]-=8;state.gold+=regionTier(mi)*150;state.ore+=15;state.dust+=3;state.gems[rand(3)]++;state.repeat++;save();render();
}
function salvageAll() {
  const targets=state.bag.filter(g=>g.rar===0&&g.plus===0&&!g.affix.length&&g.boss===undefined&&!state.equipped.includes(g.id));
  const ids=new Set(targets.map(g=>g.id));
  for(const g of targets){state.ore+=g.tier*3;state.dust++;}
  state.bag=state.bag.filter(g=>!ids.has(g.id));pruneGearSelections();save();render();toast(`已分解 ${ids.size} 件未養成普通裝備`);
}


// Party state owns persistence and expedition settings; state is the selected hero.
let party=null,foes=[],partyClock=0,actorCooldowns={},supportCooldowns={},effects=[],partyBusy=false;
const solo={render,initial,save,validateSave,resetEncounter,stats,canVisit,victory,skillsView,guideView,start,exportSave};
const SUPPORT=[
 [{name:'戰吼',target:'allies',kind:'attack',value:.18,duration:10,cooldown:16,level:1}, {name:'守護誓言',target:'weakest',kind:'guard',value:.30,duration:8,cooldown:14,level:7}, {name:'破甲怒吼',target:'enemies',kind:'fracture',value:.20,duration:8,cooldown:15,level:15}],
 [{name:'奧術共鳴',target:'allies',kind:'power',value:.20,duration:10,cooldown:17,level:1}, {name:'時間凝滯',target:'enemies',kind:'weaken',value:.18,duration:7,cooldown:14,level:7}, {name:'元素灼印',target:'enemy',kind:'followup',element:'fire',value:.25,duration:10,cooldown:16,level:15}],
 [{name:'鷹眼指引',target:'allies',kind:'critical',value:.10,duration:12,cooldown:18,level:1}, {name:'獵手標記',target:'enemy',kind:'damageAmp',element:'physical',value:.20,duration:10,cooldown:15,level:7}, {name:'風行庇佑',target:'allies',kind:'guard',value:.15,duration:8,cooldown:16,level:15}],
 [{name:'晨光祝福',target:'allies',kind:'regen',value:.025,duration:10,cooldown:16,level:1}, {name:'聖光庇護',target:'weakest',kind:'guard',value:.35,duration:8,cooldown:14,level:7}, {name:'光明祈願',target:'allies',kind:'attack',value:.22,duration:10,cooldown:18,level:15}]
];
const EFFECT_NAMES={attack:'攻擊',guard:'減傷',fracture:'破甲',power:'技能效果',weaken:'攻擊降低',vulnerable:'承傷增加',critical:'暴擊率',regen:'每回合回復生命'};
const TARGET_NAMES={allies:'我方全體',weakest:'生命比例最低的隊友',enemies:'敵方全體',enemy:'目前集火目標'};
function initHero(h){h.name??='';h.supportLevels??=[1,0,0];h.supportSlots??=[0,null];return h;}
initial=function(job){return initHero(solo.initial(job));};
function createParty(hero){return {version:3,members:[initHero(hero)],active:[hero.job],selected:hero.job,map:hero.map,difficulty:hero.difficulty||0,encounterMode:'group',etherBossClaims:[],cleared:hero.won};}
function heroes(){return party?party.active.map(job=>party.members.find(h=>h.job===job)):state?[state]:[];}
function living(){return heroes().filter(h=>h.hp>0);}
function withHero(hero,fn){const previous=state;state=hero;try{return fn();}finally{state=previous;}}
function syncParty(){if(!party)return;for(const h of party.members){h.map=party.map;h.difficulty=party.difficulty;if(party.cleared&&h.lv>=GS('progression.levelCaps.beforeClear',30))h.won=true;}}
function packParty(){syncParty();return party;}
save=function(show=false){
 if(!saveReady||!state||partyBusy)return;
 if(!party)party=createParty(state);
 let payload,previous=null,backupWritten=false;
 try{
  payload=JSON.stringify(packParty(),(key,value)=>{if(typeof value==='number'&&!Number.isFinite(value))throw Error('存檔包含非有限數值：'+key);return value;});
  previous=localStorage.getItem(KEY);
  if(previous&&previous!==payload){try{localStorage.setItem(BACKUP_KEY,previous);backupWritten=true;}catch{}}
  try{localStorage.setItem(KEY,payload);}catch(firstError){
   if(backupWritten){try{localStorage.removeItem(BACKUP_KEY);}catch{}}
   localStorage.setItem(KEY,payload);
  }
  globalThis.__EMBERWILD_BOOT_SAVE_RAW=payload;
  if(show)toast('隊伍進度已儲存');
  return true;
 }catch(e){
  console.warn('存檔寫入失敗',e);
  toast('無法自動儲存，舊存檔仍保留；請匯出 JSON 備份');
  return false;
 }
};
function validateParty(data){
 if(data?.version!==3){const h=initHero(solo.validateSave(data));return createParty(h);}
 if(!Array.isArray(data.members)||data.members.length<1||data.members.length>4||!Array.isArray(data.active)||data.active.length<1||data.active.length>3||new Set(data.active).size!==data.active.length||!['single','group'].includes(data.encounterMode)||!Number.isInteger(data.map)||!MAPS[data.map]||![0,1,2].includes(data.difficulty)||typeof data.cleared!=='boolean')throw Error('隊伍資料無效');
 const result={version:3,members:[],active:[...data.active],selected:data.selected,map:data.map,difficulty:data.difficulty,encounterMode:'group',cleared:data.cleared};
 for(const raw of data.members){
  // Reserves may be below the expedition level; validate their personal data at home.
  const h=solo.validateSave({...raw,map:0});initHero(h);
  if(!Array.isArray(h.supportLevels)||h.supportLevels.length!==3||h.supportLevels.some((n,i)=>!Number.isInteger(n)||n<0||n>Math.max(1,Math.floor(GS('skills.support.maxLevel',5)))||n>0&&(h.lv<SUPPORT[h.job][i].level||i===2&&!h.advanced))||!Array.isArray(h.supportSlots)||h.supportSlots.length!==2||h.supportSlots.some(i=>i!==null&&(!Number.isInteger(i)||i<0||i>2||h.supportLevels[i]<1))||h.supportSlots[0]!==null&&h.supportSlots[0]===h.supportSlots[1])throw Error('輔助技能資料無效');
  result.members.push(h);
 }
 if(new Set(result.members.map(h=>h.job)).size!==result.members.length||!result.members.some(h=>h.job===result.selected)||result.active.some(j=>!result.members.some(h=>h.job===j))||result.active.some(j=>!solo.canVisit(result.map,result.members.find(h=>h.job===j))))throw Error('隊伍職業或區域未解鎖');
 return result;
}
function loadParty(data){const validated=validateParty(data);resetSession();party=validated;ensureAccountResources();ensureSharedGear();ensureSharedItems();ensureAccountQuests();restorePendingAffixes(validated.pendingAffixes);delete party.pendingAffixes;state=party.members.find(h=>h.job===party.selected);syncParty();resetEncounter();for(const h of party.members)withHero(h,clampVitals);}
start=function(job){party=null;solo.start(job);party=createParty(state);save();render();};
resetEncounter=function(){solo.resetEncounter();foes=[];effects=[];partyClock=0;actorCooldowns={};supportCooldowns={};if(party)for(const h of party.members)h.shield=0;};
function selectHero(job){if(!party)return;const h=party.members.find(h=>h.job===job);if(!h)return;closeModal();party.selected=job;state=h;pendingAffix=null;forgeSelection=null;save();render();}
function recruitHero(job){if(!party||party.members.some(h=>h.job===job)||!CLASSES[job])return;if(state.bag.length>=RULES.bagCapacity)return toast('背包已滿，請先整理再招募並領取初始武器');resetEncounter();const h=initial(job),lv=Math.min(...heroes().map(x=>x.lv));h.lv=lv;h.ap=Math.round(GS('progression.starting.abilityPoints',0)+(lv-1)*GS('progression.levelRewards.abilityPoints',3));h.sp=Math.round(GS('progression.starting.skillPoints',2)+(lv-1)*GS('progression.levelRewards.skillPoints',2));h.won=party.cleared&&lv>=GS('progression.levelCaps.beforeClear',30);h.hp=solo.stats(h).hp;party.members.push(h);if(party.active.length<3)party.active.push(job);syncParty();save();render();toast('新同伴已加入；能力點、技能與裝備需獨立配置');}
function toggleMember(job){if(!party.members.some(h=>h.job===job))return;const present=party.active.includes(job);if(present&&party.active.length===1)return toast('至少需要一名出戰角色');if(!present&&party.active.length>=3)return toast('最多三名出戰角色，請先將一人移至候補');const h=party.members.find(h=>h.job===job);if(!present&&!solo.canVisit(party.map,h))return toast('此角色未達目前地圖門檻，請先切換較低級地圖');resetEncounter();if(present)party.active=party.active.filter(j=>j!==job);else party.active.push(job);save();render();}
canVisit=function(mi,s=state){return party?heroes().every(h=>solo.canVisit(mi,h)):solo.canVisit(mi,s);};
chooseMap=function(mi){if(!canVisit(mi))return;resetEncounter();party.map=mi;syncParty();save();render();};
changeDifficulty=function(value){const mode=Number(value);if(![0,1,2].includes(mode))return;resetEncounter();party.difficulty=mode;syncParty();save();render();};
function setEncounterMode(mode){if(mode!=='group')return;resetEncounter();party.encounterMode='group';save();render();}
function supportAmount(job,index){const h=party.members.find(h=>h.job===job),sk=SUPPORT[job][index],perLevel=Number.isFinite(sk.effectPerLevel)?sk.effectPerLevel:GS('skills.support.effectPerExtraLevel',.2);return sk.value+Math.max(0,(Number(h.supportLevels[index])||0)-1)*perLevel;}
function effectTotal(target,kind){return effects.filter(e=>e.target===target&&e.kind===kind&&e.until>partyClock).reduce((sum,e)=>sum+e.value,0);}
function heroKey(h){return 'hero-'+h.job;}
function battleStats(h){const v=solo.stats(h),key=heroKey(h);v.atk=Math.round(v.atk*(1+effectTotal(key,'attack')));v.crit=Math.min(GAME_BALANCE.combat.statCaps.crit,v.crit+effectTotal(key,'critical'));return v;}
function castSupport(h,index){const sk=SUPPORT[h.job][index];let targets=sk.target==='allies'?living().map(heroKey):sk.target==='weakest'?[heroKey([...living()].sort((a,b)=>a.hp/solo.stats(a).hp-b.hp/solo.stats(b).hp)[0])]:sk.target==='enemies'?foes.filter(e=>e.hp>0).map(e=>e.id):[foes.find(enemyAvailableForSingleTarget)?.id];for(const target of targets.filter(Boolean)){effects=effects.filter(e=>!(e.source===h.job&&e.skill===index&&e.target===target));effects.push({source:h.job,skill:index,target,kind:sk.kind,value:supportAmount(h.job,index),until:partyClock+sk.duration,name:sk.name});if(sk.kind==='regen'){const ally=party.members.find(a=>heroKey(a)===target);ally.hp=Math.min(solo.stats(ally).hp,ally.hp+solo.stats(ally).hp*supportAmount(h.job,index));}}note(characterName(h)+'施放 '+sk.name+' · '+sk.duration+' 回合');}
function learnSupport(i){const sk=SUPPORT[state.job][i];if(!sk||state.sp<1||state.supportLevels[i]>=Math.max(1,Math.floor(GS('skills.support.maxLevel',5)))||state.lv<sk.level||i===2&&!state.advanced||!skillPrerequisitesMet(sk,state))return;state.sp--;state.supportLevels[i]++;save();render();}
function slotSupport(i,slot){if(![0,1].includes(slot)||i!==null&&(!Number.isInteger(i)||!state.supportLevels[i]))return;if(i!==null&&state.supportSlots[1-slot]===i)state.supportSlots[1-slot]=null;state.supportSlots[slot]=i;save();render();}
function spawnGroup(){const weak=[...heroes()].sort((a,b)=>a.lv-b.lv)[0],n=3+rand(4);foes=[];effects=[];actorCooldowns={};supportCooldowns={};for(const h of heroes())h.shield=0;for(let i=0;i<n;i++){const mi=party.map===6&&i>0?5:party.map;const e=makeEnemy(mi,weak);e.id='foe-'+uid();e.rewarded=false;foes.push(e);}enemy=foes[0];round=0;note('遭遇 '+foes.length+' 隻敵人。');}
toggleBattle=function(){if(!living().length)return toast('請先戰後恢復');running=!running;if(running&&!foes.length)spawnGroup();render();};
function hitFoe(e,amount,crit){const def=e.def*(1-Math.min(.75,effectTotal(e.id,'fracture')));let d=Math.max(1,Math.round(amount-def*.65));if(crit)d=Math.round(d*1.5);d=Math.round(d*(1+effectTotal(e.id,'vulnerable')));const actual=Math.min(e.hp,d);e.hp=Math.max(0,e.hp-d);return actual;}
function castPartySkill(h,i,v){const sk=CLASSES[h.job].skills[i],power=v.atk*skillPower(i,h)*(1+effectTotal(heroKey(h),'power'));if(sk[5]==='heal'){const ally=[...living()].sort((a,b)=>a.hp/solo.stats(a).hp-b.hp/solo.stats(b).hp)[0];ally.hp=Math.min(solo.stats(ally).hp,ally.hp+Math.round(power));note(sk[0]+' → '+CLASSES[ally.job].name);}else if(sk[5]==='shield'){const shieldResult=applyPureShield(h,power);note(pureShieldCastLog(h,sk[0],shieldResult));}else{const e=foes.find(e=>e.hp>0);if(!e)return;const d=hitFoe(e,power,Math.random()<v.crit);if(sk[5]==='drain')h.hp=Math.min(v.hp,h.hp+d);note(characterName(h)+'・'+sk[0]+' → '+e.name+' '+d+' 傷害');}if(h.sockets[i]===2&&sk[1]==='active')h.hp=Math.min(v.hp,h.hp+Math.round(v.atk*GS('skills.gems.hybridActiveHealAttack',.15)));}
function rewardGroupKill(e){if(e.rewarded)return;e.rewarded=true;const members=heroes(),receiver=members[rand(members.length)],isFinal=e.kind==='final',mult=e.kind==='normal'?1:e.kind==='elite'?1.7:3,xp=Math.round((15+e.lv*6)*mult*MODES[e.difficulty].xp),hp=receiver.hp,shield=receiver.shield;
 // Existing loot rules run exactly once per enemy. XP and kill credit are shared.
 const oldAward=awardXP;awardXP=()=>{};enemy=e;partyBusy=true;
 try{withHero(receiver,()=>solo.victory());}finally{awardXP=oldAward;partyBusy=false;receiver.hp=hp;receiver.shield=shield;}
 if(isFinal){party.cleared=true;closeModal();running=true;}
 for(const h of members){if(h!==receiver){if(isFinal)h.modeClears[e.difficulty]++;h.totalKills++;h.kills[e.mat]=(h.kills[e.mat]||0)+1;if(!h.discovered.includes(e.mat))h.discovered.push(e.mat);}if(party.cleared&&h.lv>=GS('progression.levelCaps.beforeClear',30))h.won=true;const wasDead=h.hp<=0;withHero(h,()=>awardXP(Math.max(1,Math.round(xp/members.length))));if(wasDead)h.hp=0;if(party.cleared&&h.lv>=GS('progression.levelCaps.beforeClear',30))h.won=true;}
 enemy=foes.find(x=>x.hp>0)||null;
}
function* pacedRound(){if(!party||!running||$('modal').open)return;currentEvents=[];lastActionOrder=[];actionVisualTime=Date.now();partyClock++;round++;effects=effects.filter(e=>e.until>partyClock);if(!foes.some(e=>e.hp>0)){spawnGroup();if(tab==='battle'||!isEditingControl())render();else refreshGlobalJournal();return;}
 for(const h of living()){const v=battleStats(h),regen=effectTotal(heroKey(h),'regen');h.hp=Math.min(v.hp,h.hp+v.hp*regen);if(h.autoPotion&&h.hp<v.hp*GS('combat.autoPotionThreshold',.35)&&h.potions>0)withHero(h,()=>potion(true));}
 for(const h of living()){for(const i of h.supportSlots){if(i===null)continue;const key=h.job+'-'+i;if((supportCooldowns[key]||0)<=partyClock){castSupport(h,i);recordAction(heroKey(h),characterName(h),'輔助');supportCooldowns[key]=partyClock+SUPPORT[h.job][i].cooldown;yield;}}}

 // Active skills keep their own cooldown checks, independent of basic-attack initiative.
 for(const h of living()){for(const i of h.active){if(!foes.some(e=>e.hp>0))break;const key=h.job+'-'+i;if(i!==null&&(actorCooldowns[key]||0)<=partyClock){if(castPartySkill(h,i,battleStats(h))!==false){actorCooldowns[key]=partyClock+skillCooldown(i,h);recordAction(heroKey(h),characterName(h),'技能');yield;}}}}
 const order=initiativeOrder();
 for(const unit of order){if(!living().length||!foes.some(e=>e.hp>0))break;if(unit.actor.hp<=0)continue;if(unit.side==='hero'){const h=unit.actor;recordAction(unit.id,characterName(h),'普攻');performHeroBasic(h);}else{recordAction(unit.id,unit.actor.name,'攻擊');performEnemyBasic(unit.actor);}yield;}
 for(const e of foes)if(e.hp<=0)rewardGroupKill(e);

 if(!living().length){running=false;party.members[0].gold-=Math.floor(party.members[0].gold*GS('combat.defeatGoldLoss',.05));for(const h of heroes()){h.shield=0;}note('全隊戰敗，帳號失去 '+Math.round(GS('combat.defeatGoldLoss',.05)*10000)/100+'% 金幣。生命已全滿。');refillParty();foes=[];enemy=null;}else if(!foes.some(e=>e.hp>0)){refillParty();note('本次遭遇勝利，全隊生命已回滿。');if(foes.some(e=>e.kind==='final')){running=false;note('終局首領已倒下，本次終局遭遇結束。');}}
 save();if(tab==='battle'||!isEditingControl())render();else refreshGlobalJournal();
};
function partyPicker(){return `<section class="party-picker"><div class="row"><b>目前操作角色</b><span id="party-status">${running?'戰鬥 '+partyClock+' 秒':'整備中'} · 出戰 ${heroes().length}/3</span></div><div class="party-tabs">${party.members.map(h=>`<div><button class="${state.job===h.job?'primary':''}" onclick="selectHero(${h.job})">${esc(characterName(h))} LV${h.lv}</button><button onclick="toggleMember(${h.job})">${party.active.includes(h.job)?'出戰中 → 候補':'候補 → 出戰'}</button></div>`).join('')}</div><div class="row">${CLASSES.map((c,j)=>party.members.some(h=>h.job===j)?'':`<button onclick="requestHeroName(${j},false)">招募${c.name}</button>`).join('')}<small>每職業一人；招募同出戰最低等級。背包、資源為共用。</small></div></section>`;}
render=function(){solo.render();if(state&&party){const main=$('app');main.innerHTML=partyPicker()+main.innerHTML;}};
function combatStatusDetail(e){
 const pct=Number((Math.max(0,Number(e?.value)||0)*100).toFixed(1));
 const detail={
  attack:'攻擊增加 '+pct+'%',
  guard:'受到傷害減少 '+pct+'%',
  fracture:'防禦降低 '+pct+'%',
  power:'技能效果增加 '+pct+'%',
  weaken:'攻擊降低 '+pct+'%',
  vulnerable:'承受傷害增加 '+pct+'%',
  damageAmp:'承受傷害增加 '+pct+'%',
  critical:'暴擊率增加 '+pct+'%',
  regen:'每回合恢復最大生命 '+pct+'%（施放時也立即恢復一次）'
 }[e?.kind];
 if(detail)return detail;
 if(e?.kind==='followup')return '受到攻擊時追加來源角色攻擊力 '+pct+'% 的'+(ELEMENTS[e.element]||e.element||'無')+'屬性追打';
 return (EFFECT_NAMES[e?.kind]||e?.kind||'狀態效果')+(pct?' '+pct+'%':'');
}
function combatStatusBadge(name,turns,detail,labelExtra=''){
 const left=Number(turns),time=Number.isFinite(left)?' '+Math.max(0,Math.ceil(left))+'t':'';
 const label=String(name||'狀態')+(labelExtra?' '+labelExtra:'')+time;
 const tooltip=String(detail||name||'狀態效果');
 return `<span class="tag combat-status-badge" title="${esc(tooltip)}" aria-label="${esc(label+'：'+tooltip)}">${esc(label)}</span>`;
}
function effectBadges(key){return effects.filter(e=>e.target===key&&e.until>partyClock).map(e=>combatStatusBadge(e.name,e.until-partyClock,combatStatusDetail(e))).join('');}
battleView=function(){const m=MAPS[party.map];
const skillLine=(h,slots,list,cds)=>slots.map(i=>{if(i===null)return '未配置';const left=Math.max(0,Math.floor(cds[h.job+'-'+i]||0));return esc(Array.isArray(list[i])?list[i][0]:list[i].name)+' <em>'+(left?left+' 回合':'就緒')+'</em>';}).join(' ／ ');
return heading('EXPEDITION / 遠征手札',m.name,`<span class="tag">${running?'探索中':foes.length?'已暫停':'整備中'} · 第 ${partyClock} 秒</span>`)+modePicker()+`<div class="text-battle-layout"><section class="panel party-combat"><div class="actions"><span class="tag">群怪 · 3～6 隻</span><button class="primary" onclick="toggleBattle()">${running?'暫停探索':'開始探索'}</button></div><p class="small combat-rule">1倍速每回合至少 6 秒 · 技能冷卻按各單位回合 · 集火首位存活敵人 · 戰後全隊回滿生命</p><div class="squad-field"><section class="squad-allies"><h3>出戰隊員 <small>${heroes().length} / 3</small></h3>${heroes().map(h=>{const v=solo.stats(h);return `<article data-combat-id="${heroKey(h)}" class="unit ${h.hp<=0?'fallen':''}" ${actionVisualStyle(heroKey(h))}><div class="unit-title"><b>${esc(characterName(h))}</b><span>LV ${h.lv} · ${h.hp<=0?'倒下':'出戰'}</span></div><div class="unit-numbers"><span>生命 <b>${Math.ceil(h.hp)} / ${v.hp}</b></span><span>護盾 <b>${Math.round(h.shield)}</b> · ${ELEMENTS[weaponElement(h)]}普攻 · 速度 ${v.speed}</span></div>${battleHealthMeter(h.hp,v.hp,battleShieldValue(h))}<div class="unit-skills"><div>主動｜${skillLine(h,h.active,CLASSES[h.job].skills,actorCooldowns)}</div><div>輔助｜${skillLine(h,h.supportSlots,SUPPORT[h.job],supportCooldowns)}</div></div><div class="unit-effects">${effectBadges(heroKey(h))}<span class="small supply-countdown" data-job="${h.job}">${supplyStatus(h)}</span></div></article>`;}).join('')}</section><section class="squad-enemies"><h3>遭遇敵人 <small>${foes.filter(e=>e.hp>0).length} / ${foes.length}</small></h3>${foes.length?foes.map((e,i)=>`<article data-combat-id="${e.id}" class="unit ${e.hp<=0?'fallen':''}" ${actionVisualStyle(e.id)}><div class="unit-title"><b>${esc(enemyDisplayName(e))}</b><span>LV ${e.lv} · ${e.hp<=0?'已擊敗':e.kind==='boss'||e.kind==='final'?'首領':e.kind==='elite'?'菁英':'普通'}</span></div><div class="unit-numbers"><span>生命 <b>${Math.ceil(e.hp)} / ${e.maxhp}</b></span><span class="element-${e.element}">${ELEMENTS[e.element]} · ${RACES[e.race]} · 攻擊 ${e.atk} / 防禦 ${e.def} · 速度 ${combatSpeed(e)}</span></div>${battleHealthMeter(e.hp,e.maxhp,battleShieldValue(e))}<div class="unit-effects enemy-status-effects">${effectBadges(e.id)}</div><div class="enemy-action-status">${enemySkillStatus(e)}</div></article>`).join(''):'<p class="empty">尚無遭遇<br>開始探索，遭遇3～6隻敵人。</p>'}</section></div></section></div>${battleBuffPanel()}<section class="panel expedition-tools"><div class="compact-supplies"><b>補給 · ${esc(characterName(state))}</b><button onclick="setTab('shop')">商店</button><button onclick="potion()" ${state.potions<1?'disabled':''}>喝藥 (${state.potions})</button><button onclick="buyPotion()" ${state.gold<75?'disabled':''}>藥水 +5／75 金幣</button><label class="auto-potion"><input type="checkbox" ${state.autoPotion?'checked':''} onchange="state.autoPotion=this.checked;save()">生命低於 35% 自動喝藥</label></div><div class="map-list-heading"><h2>探索地圖</h2><button onclick="showRegionBestiary()">圖鑑</button><span class="small">目前：${m.name} · 出戰全員須符合門檻</span></div><div class="compact-map-list" aria-label="探索地圖">${MAPS.map((area,i)=>`<button class="map-list-row ${party.map===i?'selected':''}" ${canVisit(i)?'':'disabled'} onclick="chooseMap(${i})"><span class="map-level">LV ${area.min}–${area.max}</span><b>${area.name}</b><span class="map-access">${party.map===i?'目前區域':canVisit(i)?'前往':'未解鎖'}</span></button>`).join('')}</div><details><summary>區域圖鑑與掉落</summary>${m.mobs.concat([m.boss]).map(x=>`<p><b>${x[0]}</b> · ${ELEMENTS[species.get(x[2])?.element||'physical']}／${RACES[species.get(x[2])?.race||'beast']}<br>專屬掉落：${x[2]}</p>`).join('')}</details></section>`;};

skillsView=function(){return `<section class="panel"><h2>輔助技能 · 額外兩槽</h2><p>不占原本兩個主動槽。每回合檢查冷卻，自動施放；每級消耗 1 技能點，最高 5 級。每級增加基礎效果 20%，持續時間與冷卻不變。同來源同技能刷新時間，不重複疊加；不同來源可相加。此類技能暫不鑲嵌寶石。</p><div class="actions">${state.supportSlots.map((id,i)=>`<span>槽 ${i+1}：${id===null?'空':esc(SUPPORT[state.job][id].name)+skillTypeBadges(state.job,id,'support')}<button onclick="slotSupport(null,${i})">清空</button></span>`).join('')}</div><div class="cards">${SUPPORT[state.job].map((sk,i)=>`<article class="card"><h3>${sk.name} [${ELEMENTS[sk.element]}] Lv.${state.supportLevels[i]}/${Math.max(1,Math.floor(GS('skills.support.maxLevel',5)))}</h3>${skillTypeBadges(state.job,i,'support')}${skillMechanicsDetails(state.job,i,'support')}<p>${TARGET_NAMES[sk.target]} · ${EFFECT_NAMES[sk.kind]} ${+(sk.value*(1+Math.max(0,state.supportLevels[i]-1)*GS('skills.support.effectPerExtraLevel',.2))*100).toFixed(1)}%<br>持續 ${sk.duration} 戰鬥回合 / 冷卻 ${sk.cooldown} 回合<br>需求 LV${sk.level}${i===2?'＋二轉':''}</p><button onclick="learnSupport(${i})" ${state.sp<1||state.supportLevels[i]>=Math.max(1,Math.floor(GS('skills.support.maxLevel',5)))||state.lv<sk.level||i===2&&!state.advanced?'disabled':''}>${state.supportLevels[i]?'升級1點':'學習'}</button>${[0,1].map(slot=>`<button onclick="slotSupport(${i},${slot})" ${state.supportLevels[i]?'':'disabled'}>設定槽 ${slot+1}</button>`).join('')}</article>`).join('')}</div></section>`+solo.skillsView();};
guideView=function(){return `<section class="panel"><h2>3.0 · 小隊遠征</h2><p>可招募四職業各一位，最多三人出戰。角色操作頁可獨立切換對象；金幣、材料、寶石、消耗品與背包由帳號共用，角色保有各自的穿戴及技能，任務由帳號共用。招募者與出戰最低等級一致，需自行配置能力點、技能、二轉及裝備。</p><p>固定群怪模式，每場3～6隻。終焉王座群怪模式為噬日者及最多五隻星隕護衛。每隻怪物只結算一次戰利品，隨機交給一位出戰角色；經驗由出戰成員平分，倒下成員也分得經驗，候補不分得。治療技能自動支援生命比例最低的存活隊員，吸血僅回復本人且不計溢出傷害。</p><p>每人原有兩主動槽及全部已學觸發技，另加兩個輔助槽。輔助與冷卻結束的主動技能獨立施放，再依速度由高至低交錯進行雙方普攻及觸發技。速度決定每回合先後，不增加每回合普攻次數。BUFF／DEBUFF 以戰鬥回合計時，暫停和對話框不會推進；換圖、換出戰成員會清除遭遇及效果。全隊戰後回滿生命，倒下隊員可在戰後恢復。</p><p>多來源減傷最高 75%、破甲最高 75%、敵方攻擊降低最高 70%、戰鬥暴擊率最高 85%。存檔保存全隊養成、未確認洗鍊與消耗品剩餘回合；不保存當前敵人與戰鬥技能效果。</p></section>`+solo.guideView();};
exportSave=function(){if(!state)return toast('請先建立角色');save();const blob=new Blob([JSON.stringify(packParty(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='emberwild-party.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
importSave=async function(ev){const f=ev.target.files[0];ev.target.value='';if(!f)return;try{if(f.size>8e6)throw Error('存檔過大');const migrated=migrateWorldSave(JSON.parse(await f.text())),preview=validateParty(migrated);pendingImport=migrated;running=false;$('modal').innerHTML=`<h2>載入隊伍？</h2><p>${preview.members.map(h=>esc(characterName(h))+' LV'+h.lv).join('、')}</p><p>確認後取代目前全隊進度。</p><button onclick="acceptImport()">確認載入</button><button onclick="closeModal();pendingImport=null">取消</button>`;$('modal').showModal();}catch(e){pendingImport=null;console.warn('手動匯入存檔失敗',e);toast('匯入失敗：'+e.message);}};
acceptImport=function(){if(!pendingImport)return;const data=pendingImport;try{loadParty(data);closeModal();const stored=save();pendingImport=null;render();toast(stored===false?'存檔已載入，但瀏覽器無法寫入；請先匯出 JSON 備份':'存檔已匯入');}catch(e){pendingImport=null;console.warn('套用匯入存檔失敗',e);toast('匯入失敗：'+e.message);}};
newGame=function(){resetSession();party=null;state=null;try{localStorage.removeItem(KEY);localStorage.removeItem(BACKUP_KEY);}catch{}closeModal();$('wallet').textContent='';render();};


const partyGearDetail=showGearDetail;
showGearDetail=function(id){partyGearDetail(id);const g=findGear(id);if(!g||state.equipped.includes(id))return;const recipient=party.members.find(h=>h.job===g.job&&h.job!==state.job);if(recipient)$('modal').innerHTML+=`<div class="actions"><button onclick="transferGear('${g.id}',${recipient.job})">交給${esc(characterName(recipient))}</button></div>`;};
function transferGear(id,job){const item=findGear(id),target=party.members.find(h=>h.job===job);if(!item||!target||target===state||state.equipped.includes(id)||item.job!==job)return;if(target.bag.length>=RULES.bagCapacity)return toast('對方背包已滿');state.bag=state.bag.filter(g=>g.id!==id);target.bag.push(item);closeModal();save();render();toast('裝備已交給'+CLASSES[job].name);}


// Preserve in-panel scrolling and disclosure state across automatic redraws.
const stablePartyRender=render;
let previousViewKey=null;
const viewPositions=new Map();
const SCROLL_REGIONS='.layout>main,.layout>aside,.current-events,.history-events,.unit-effects,.unit-skills,.inventory-table,.buff-table-scroll,.compact-map-list,.member-content,.member-skill-content,.member-equipment-content,.page-owner-content,.inline-equipment-list,.worn-overview,.guide-scroll,.forge-detail-pane,.forge-gear-list';
render=function(){
 if(document.querySelectorAll&&previousViewKey){
  viewPositions.set(previousViewKey,{
   scroll:[...document.querySelectorAll(SCROLL_REGIONS)].map(el=>[el.scrollTop,el.scrollLeft]),
   details:[...document.querySelectorAll('.layout main details')].map(el=>el.open)
  });
 }
 stablePartyRender();
 const key=state?tab+':'+(party?pageHero(tab).job:state.job):'start',position=viewPositions.get(key);
 if(position&&document.querySelectorAll){
  [...document.querySelectorAll('.layout main details')].forEach((el,i)=>{el.open=!!position.details[i];});
  [...document.querySelectorAll(SCROLL_REGIONS)].forEach((el,i)=>{if(position.scroll[i]){el.scrollTop=position.scroll[i][0];el.scrollLeft=position.scroll[i][1];}});
 }
 previousViewKey=key;
};

// Elemental equipment, parallel regions and expedition supplies.
const ELEMENTS={physical:'無屬性',fire:'火',ice:'冰',wind:'風',light:'光',shadow:'暗'};
const RACES={beast:'野獸',plant:'植物',undead:'不死',construct:'構裝',demon:'惡魔',spirit:'精靈'};
const SKILL_ELEMENTS=[['physical','light','physical','shadow','light','light'],['fire','ice','fire','shadow','fire','wind'],['wind','wind','physical','physical','wind','light'],['light','light','light','light','light','light']];
const REGION_ELEMENTS=['wind','physical','shadow','ice','fire','shadow'];
const ORIGINAL_RACES=[['spirit','beast','plant','plant'],['beast','beast','construct','construct'],['beast','spirit','undead','undead'],['beast','spirit','beast','beast'],['beast','beast','construct','demon'],['demon','spirit','construct','construct']];
const SUPPORT_ELEMENTS=[['physical','light','physical'],['wind','ice','fire'],['wind','physical','wind'],['light','light','light']];
SUPPORT.forEach((list,job)=>list.forEach((sk,i)=>sk.element=SUPPORT_ELEMENTS[job][i]));
const species=new Map();
MAPS.forEach((map,mi)=>{const family=regionFamily(mi);map.mobs.concat([map.boss]).forEach((m,i)=>species.set(m[2],{element:mi===6?'shadow':REGION_ELEMENTS[family],race:mi===6?'demon':ORIGINAL_RACES[family][i]||'demon'}));});
const SIDE_REGIONS=[
 ['赤楓丘陵','fire',[['燼翼火蛾','燼翼粉',10,'spirit'],['赤鬃山狼','赤鬃毛皮',1,'beast'],['焦根樹人','焦根木髓',2,'plant'],['炭殼魔偶','炭殼碎片',6,'construct']],['赤楓炎靈','炎靈心木',3,'spirit']],
 ['潮汐洞窟','ice',[['潮影蝙蝠','潮影翼膜',4,'beast'],['寒潮蜥蜴','寒潮腺體',5,'beast'],['海霧幽魂','海霧結珠',11,'undead'],['鹽晶魔像','鹽晶塊',6,'construct']],['潮汐巨像','深潮齒輪',7,'construct']],
 ['白骨墓園','shadow',[['墓園亡魂','亡者殘響',11,'undead'],['噬骨獵犬','噬骨獠牙',20,'beast'],['墓火飛蛾','墓火鱗片',10,'spirit'],['腐枝守衛','腐枝黑核',2,'plant']],['白骨巫后','巫后骨印',11,'undead']],
 ['雷鳴高地','wind',[['雷牙蒼狼','雷牙',12,'beast'],['風暴妖精','風暴晶羽',13,'spirit'],['雷殼魔偶','雷殼銅片',6,'construct'],['高地巨熊','高地熊膽',14,'beast']],['雷鳴獸王','獸王雷角',15,'beast']],
 ['蒼翠聖所','light',[['聖樹幼靈','聖樹芽核',2,'plant'],['晶光妖精','晶光翼',13,'spirit'],['聖羽渡鴉','聖羽',17,'beast'],['失序聖鎧','聖鎧殘片',18,'construct']],['聖所守護者','聖所徽核',19,'construct']],
 ['幽冥邊境','shadow',[['冥界獵犬','冥犬黑牙',20,'demon'],['幽影水母','幽影觸鬚',21,'spirit'],['黑曜魔像','黑曜脊核',22,'construct'],['游蕩冤魂','邊境魂塵',11,'undead']],['幽冥觀測者','冥視之瞳',23,'demon']]
];
const HIGH_REGION_NAMES=['炎晶裂谷','深海祭壇','亡者王庭','風暴浮島','聖光禁林','日蝕深淵'];
for(let tier=1;tier<=12;tier++){
 const family=(tier-1)%6,def=SIDE_REGIONS[family],high=tier>6,tag=high?'上古・':'',mi=MAPS.length;
 const tuple=x=>[tag+x[0],monsterPixel(x[2],true),(high?'上古':'')+x[1]];
 const map={name:high?HIGH_REGION_NAMES[family]:def[0],min:(tier-1)*5+1,max:tier*5,family,icon:'',color:'#34324a',mobs:def[2].map(tuple),boss:tuple(def[3]),parallel:true};MAPS.push(map);
 [...def[2],def[3]].forEach((m,i)=>{const row=i===4?map.boss:map.mobs[i];monsterArtByMaterial.set(row[2],m[2]);species.set(row[2],{element:def[1],race:m[3]});});
}
const ITEM_FORMS=[
 [[{name:'闊刃劍',atk:1.2,critDamage:10},{name:'穿甲槍',atk:.95,pierce:12},{name:'汲血斧',atk:1.08,lifesteal:3}], [{name:'重型板甲',hp:1.15,def:1.25},{name:'決鬥鎧',hp:.9,def:.9,evasion:6}], [{name:'征戰旗',atk:1.2},{name:'守誓印',hp:1.3,exclusive:{attackPct:2}}]],
 [[{name:'炎晶杖',atk:1.15,element:'fire'},{name:'霜紋杖',atk:1,element:'ice',exclusive:{attackPct:3}},{name:'疾風法器',atk:.95,element:'wind',exclusive:{attackPct:2}}], [{name:'秘法袍',hp:1,exclusive:{attackPct:4}},{name:'月影袍',hp:.9,def:1,evasion:6}], [{name:'元素魔典',atk:1.15,elementBonus:8},{name:'回響符環',hp:1.1,exclusive:{attackPct:2}}]],
 [[{name:'狙擊長弓',atk:1.15,critDamage:12},{name:'穿雲弩',atk:1,pierce:12},{name:'風羽短弓',atk:.95,element:'wind',evasion:4}], [{name:'獵手皮甲',hp:1,def:1.1},{name:'輕羽衣',hp:.9,def:.9,evasion:8}], [{name:'破甲箭袋',atk:1,pierce:8},{name:'鷹眼指環',atk:1.1,critDamage:15}]],
 [[{name:'晨光權杖',atk:1.1,element:'light'},{name:'淨化槌',atk:1,pierce:10},{name:'祈禱法杖',atk:.95,exclusive:{attackPct:5}}], [{name:'祝禱聖衣',hp:1.15,exclusive:{attackPct:3}},{name:'守護祭袍',hp:1,def:1.2}], [{name:'聖光徽記',atk:1.1,elementBonus:8},{name:'生命念珠',hp:1.25,exclusive:{attackPct:2}}]]
];
const EQUIP_POSITION_NAMES=['武器','護甲','副手','飾品 1','飾品 2'];
const GLOBAL_EQUIPMENT_FORM_GROUP=CLASSES.length;
function normalizeEquipmentFormsArray(forms){
 if(!Array.isArray(forms))return forms;const classCount=CLASSES.length;
 while(forms.length<classCount)forms.push([[],[],[],[]]);
 for(let job=0;job<classCount;job++){let slots=Array.isArray(forms[job])?forms[job]:[];if(slots.length===3){const mixed=Array.isArray(slots[2])?slots[2]:[],offhand=mixed.length?[mixed[0]]:[],accessories=mixed.slice(1);if(!accessories.length&&mixed[0])accessories.push(JSON.parse(JSON.stringify(mixed[0])));slots=[Array.isArray(slots[0])?slots[0]:[],Array.isArray(slots[1])?slots[1]:[],offhand,accessories];}while(slots.length<4)slots.push([]);forms[job]=slots.slice(0,4);}
 let globalSlots=Array.isArray(forms[classCount])?forms[classCount]:[[],[],[],[]];if(globalSlots.length===3){const mixed=Array.isArray(globalSlots[2])?globalSlots[2]:[];globalSlots=[Array.isArray(globalSlots[0])?globalSlots[0]:[],Array.isArray(globalSlots[1])?globalSlots[1]:[],mixed.length?[mixed[0]]:[],mixed.slice(1)];}while(globalSlots.length<4)globalSlots.push([]);forms[classCount]=globalSlots.slice(0,4);forms.length=classCount+1;return forms;
}
normalizeEquipmentFormsArray(ITEM_FORMS);
function equipmentFormGroup(g){const group=Number.isInteger(g?.formJob)?g.formJob:Number(g?.job);return Number.isInteger(group)&&group>=0&&group<ITEM_FORMS.length?group:Number(g?.job)||0;}
function rollEquipmentForm(job,slot){const candidates=[];for(const group of [job,GLOBAL_EQUIPMENT_FORM_GROUP])for(let index=0;index<(ITEM_FORMS[group]?.[slot]?.length||0);index++)candidates.push({group,index});return candidates.length?candidates[rand(candidates.length)]:{group:job,index:0};}
function gearEquipPositions(g){return g?.slot===3?[3,4]:Number.isInteger(g?.slot)&&g.slot>=0&&g.slot<=2?[g.slot]:[];}
function bossEquipmentSlot(family){return [0,1,2,0,1,3][Math.max(0,Math.min(5,Number(family)||0))]??0;}
function normalizeEquipmentFormWearability(){
 const all=CLASSES.map((_,i)=>i);
 ITEM_FORMS.forEach((slots,job)=>slots.forEach((forms,slot)=>forms.forEach(form=>{
  if(!form||typeof form!=="object")return;
  const fallback=job>=CLASSES.length||slot===1?[...all]:[job],raw=Array.isArray(form.wearableJobs)?form.wearableJobs:fallback;
  const jobs=[...new Set(raw.map(Number).filter(j=>Number.isInteger(j)&&j>=0&&j<CLASSES.length))];
  form.wearableJobs=jobs.length?jobs:fallback;
 })));
}
normalizeEquipmentFormWearability();
function gearWearableJobs(g){
 if(!g)return [];
 const all=CLASSES.map((_,i)=>i),form=itemForm(g),fallback=g.slot===1?all:[Number(g.job)];
 const raw=Array.isArray(form?.wearableJobs)?form.wearableJobs:fallback;
 const jobs=[...new Set(raw.map(Number).filter(j=>Number.isInteger(j)&&j>=0&&j<CLASSES.length))];
 return jobs.length?jobs:fallback.filter(j=>Number.isInteger(j)&&j>=0&&j<CLASSES.length);
}
function gearWearableJobsText(g){const jobs=gearWearableJobs(g);return jobs.length===CLASSES.length?"全職業":jobs.map(j=>CLASSES[j]?.name).filter(Boolean).join("、")||"無";}
globalThis.equipmentWearableJobsDetailsHTML=function(g){
 const jobs=gearWearableJobs(g),all=jobs.length===CLASSES.length;
 return `<details class="equipment-attribute-details equipment-wearable-details"><summary>可穿戴職業（${all?"全職業":jobs.length+" 個"}）</summary><div class="equipment-attribute-list">${jobs.map(j=>`<div class="equipment-attribute-line"><b>職業</b><span>${esc(CLASSES[j]?.name||"未知")}</span></div>`).join("")}</div></details>`;
};
function normalizeEquippedWearability(){
 if(!party?.members)return;
 for(const h of party.members){while((h.equipped||[]).length<5)h.equipped.push(null);const seen=new Set();h.equipped=Array.from({length:5},(_,position)=>{const id=h.equipped[position];if(!id||seen.has(id))return null;const g=(h.bag||[]).find(x=>x.id===id);if(!g||!gearEquipPositions(g).includes(position)||!gearWearableJobs(g).includes(h.job))return null;seen.add(id);return id;});}
}
function itemForm(g){const group=equipmentFormGroup(g);return Number.isInteger(g?.form)?ITEM_FORMS[group]?.[g.slot]?.[g.form]||null:null;}
const oldEquipmentFactory=gear,oldEquipmentName=gearName,oldGearBase=gearBaseStats,oldAffixRoll=rollAffixes,oldAffixLabel=affixLabel,oldStats=stats,oldEnemyFactory=makeEnemy,oldHeroInit=initHero;
gearName=function(g){if(g.boss!==undefined&&MAPS[g.region]?.parallel)return (g.difficulty?'【'+MODES[g.difficulty].name+'】':'')+MAPS[g.region].boss[0]+'・'+CLASS_GEAR[g.job][g.slot];const name=oldEquipmentName(g),form=itemForm(g);return form?name.replace(CLASS_GEAR[g.job][g.slot],form.name):name;};
gear=function(tier=1,slot=rand(4),rar=0,job=null){const g=oldEquipmentFactory(tier,slot,rar,job),choice=rollEquipmentForm(g.job,slot);g.formJob=choice.group;g.form=choice.index;g.name=gearName(g);return g;};
gearBaseStats=function(g){const v=oldGearBase(g),form=itemForm(g);if(form)for(const key of ['atk','hp','def'])v[key]*=form[key]??1;return v;};
const EXTRA_AFFIX_NAMES={6:'暴擊傷害',7:'防禦穿透',8:'生命竊取',9:'閃避率',12:'屬性傷害',13:'種族增傷',14:'屬性抗性',15:'攻擊力'};
rollAffixes=function(g){return oldAffixRoll(g).map(a=>{if(Math.random()>.55)return a;const types=[6,7,8,9,12,13,14],type=types[rand(types.length)],value=type===8?1+a.rank:type===9?2+a.rank*2:5+a.rank*5;const result={type,rank:a.rank,value};if(type===12||type===14)result.element=['fire','ice','wind','light','shadow'][rand(5)];if(type===13)result.race=Object.keys(RACES)[rand(6)];return result;});};
affixLabel=function(a,g){if(a.type<6)return oldAffixLabel(a,g);return (a.element?ELEMENTS[a.element]+'屬性 ':a.race?'對'+RACES[a.race]+' ':'')+EXTRA_AFFIX_NAMES[a.type]+' +'+a.value+([10,11].includes(a.type)?'':'%');};
stats=function(h=state){const v=oldStats(h);Object.assign(v,{critDamage:1.5,pierce:0,lifesteal:0,evasion:0,elementBonus:0,elementDamage:{},raceDamage:{},resist:{}});
 for(const g of equipment(h)){const form=itemForm(g);if(form){for(const k of ['critDamage','pierce','lifesteal','evasion','elementBonus'])v[k]+=(form[k]||0)/100;}
 for(const a of g.affix){if(a.type>=6&&a.type<=9)v[{6:'critDamage',7:'pierce',8:'lifesteal',9:'evasion'}[a.type]]+=a.value/100;else if(a.type===12)v.elementDamage[a.element]=(v.elementDamage[a.element]||0)+a.value/100;else if(a.type===13)v.raceDamage[a.race]=(v.raceDamage[a.race]||0)+a.value/100;else if(a.type===14)v.resist[a.element]=(v.resist[a.element]||0)+a.value/100;}}
 v.pierce=Math.min(.65,v.pierce);v.evasion=Math.min(.45,v.evasion);v.lifesteal=Math.min(.25,v.lifesteal);return v;};
solo.stats=stats;
const PROC_SLOT_COUNT=2;
const PROC_ONLY_EFFECTS=new Set(['nextActiveDamage','advanceNextRound','shieldLowest']);
function legacyProcRates(settings=null){
 const p=settings?.skills?.proc,per=Math.max(0,Number.isFinite(Number(p?.perSkillLevel))?Number(p.perSkillLevel):GS('skills.proc.perSkillLevel',.025)),pre=Math.max(0,Number.isFinite(Number(p?.baseChance))?Number(p.baseChance):GS('skills.proc.baseChance',.22));
 return {base:Math.min(1,pre+per),per:Math.min(1,per)};
}
function ensureProcSkillMeta(job,i,settings=null){
 const sk=CLASSES[job]?.skills?.[i];if(!sk||sk[1]!=='proc')return null;
 if(!sk[6]||typeof sk[6]!=='object'||Array.isArray(sk[6]))sk[6]={};
 const d=legacyProcRates(settings);
 if(!Number.isFinite(sk[6].procBaseChance))sk[6].procBaseChance=d.base;
 if(!Number.isFinite(sk[6].procChancePerLevel))sk[6].procChancePerLevel=d.per;
 sk[6].procBaseChance=Math.max(0,Math.min(1,Number(sk[6].procBaseChance)));
 sk[6].procChancePerLevel=Math.max(0,Math.min(1,Number(sk[6].procChancePerLevel)));
 return sk[6];
}
function ensureAllProcSkillMeta(settings=null){for(let job=0;job<CLASSES.length;job++)for(let i=0;i<CLASSES[job].skills.length;i++)ensureProcSkillMeta(job,i,settings);}
function validProcIndex(h,i){return Number.isInteger(i)&&i>=0&&i<CLASSES[h.job].skills.length&&CLASSES[h.job].skills[i][1]==='proc'&&h.skills[i]>0;}
function ensureProcSlots(h){
 if(!h)return h;
 const had=Array.isArray(h.procSlots);let slots=had?h.procSlots.slice(0,PROC_SLOT_COUNT):[];
 if(!had){const learned=[];for(let i=0;i<CLASSES[h.job].skills.length;i++)if(validProcIndex(h,i))learned.push(i);slots=learned.slice(0,PROC_SLOT_COUNT);}
 while(slots.length<PROC_SLOT_COUNT)slots.push(null);
 slots=slots.map(i=>i===null||validProcIndex(h,i)?i:null);
 if(slots[0]!==null&&slots[0]===slots[1])slots[1]=null;
 h.procSlots=slots;return h;
}
function slotProcSkill(i,slot){
 ensureProcSlots(state);if(!Number.isInteger(slot)||slot<0||slot>=PROC_SLOT_COUNT)return;
 if(i!==null&&!validProcIndex(state,i))return;
 if(i!==null)for(let s=0;s<PROC_SLOT_COUNT;s++)if(s!==slot&&state.procSlots[s]===i)state.procSlots[s]=null;
 state.procSlots[slot]=i;save();render();
}
function clearProcSkill(slot){ensureProcSlots(state);if(!Number.isInteger(slot)||slot<0||slot>=PROC_SLOT_COUNT)return;state.procSlots[slot]=null;save();render();}
ensureAllProcSkillMeta();
initHero=function(h){oldHeroInit(h);h.consumables??={};h.imbue??=null;h.ward??=null;h.elementTonic??=null;delete h.mp;delete h.nextActiveDamageBonus;delete h.procAdvanceRound;delete h.procAdvanceSteps;ensureProcSlots(h);return h;};
makeEnemy=function(mi=state.map,h=state,rng=Math.random){const e=oldEnemyFactory(mi,h,rng),meta=species.get(e.mat)||{element:'physical',race:'beast'};return {...e,...meta};};
function elementFactor(attack,defend){
 const m=GAME_BALANCE.combat.elementMultipliers;
 if(attack==='physical'||defend==='physical')return m.neutral;
 if(attack===defend)return m.same;
 const strengths={fire:'wind',wind:'ice',ice:'fire',light:'shadow',shadow:'light'};
 if(strengths[attack]===defend)return m.strong;
 if(strengths[defend]===attack)return m.weak;
 return m.neutral;
}
function activeSupply(h,key){const buff=h[key];return buff&&Number.isFinite(buff.remainingTurns)&&buff.remainingTurns>0?buff:null;}
function weaponElement(h){return activeSupply(h,'imbue')?.element||itemForm(equipment(h).find(g=>g.slot===0)||{})?.element||'physical';}
function skillManaCost(){return 0;}
function refillParty(){for(const h of party.members){const v=stats(h);h.hp=v.hp;h.shield=0;}effects=[];}
function resolveHit(e,amount,h,element,crit){const v=battleStats(h),def=e.def*(1-Math.min(.75,effectTotal(e.id,'fracture')))*(1-v.pierce);let d=Math.max(1,Math.round(amount-def*.65));if(crit)d=Math.round(d*v.critDamage);const tonic=activeSupply(h,'elementTonic'),bonus=(v.elementDamage[element]||0)+(element==='physical'?0:v.elementBonus)+(tonic && tonic.element===element ? .2 : 0);d=Math.max(1,Math.round(d*elementFactor(element,e.element)*(1+bonus)*(1+(v.raceDamage[e.race]||0))*(1+effectTotal(e.id,'vulnerable'))));const actual=Math.min(e.hp,d);e.hp=Math.max(0,e.hp-d);h.hp=Math.min(v.hp,h.hp+Math.round(actual*v.lifesteal));return actual;}
castPartySkill=function(h,i,v){const sk=CLASSES[h.job].skills[i],power=v.atk*skillPower(i,h)*(1+effectTotal(heroKey(h),'power')),element=SKILL_ELEMENTS[h.job][i];if(sk[5]==='heal'){const ally=[...living()].sort((a,b)=>a.hp/stats(a).hp-b.hp/stats(b).hp)[0];ally.hp=Math.min(stats(ally).hp,ally.hp+Math.round(power));note(sk[0]+' → '+CLASSES[ally.job].name);}else if(sk[5]==='shield'){const shieldResult=applyPureShield(h,power);note(pureShieldCastLog(h,sk[0],shieldResult));}else{const e=foes.find(e=>e.hp>0);if(!e)return false;const d=resolveHit(e,power,h,element,Math.random()<v.crit);if(sk[5]==='drain')h.hp=Math.min(v.hp,h.hp+d);note(characterName(h)+'・'+sk[0]+' ['+ELEMENTS[element]+'] → '+e.name+' '+d+' 傷害');}if(h.sockets[i]===2&&sk[1]==='active')h.hp=Math.min(v.hp,h.hp+Math.round(v.atk*GS('skills.gems.hybridActiveHealAttack',.15)));return true;};
// Shops use per-hero gold and inventory. Supply effects use battle turns and survive saves.
const SHOP=[];
for(const element of ['fire','ice','wind','light','shadow'])for(const type of ['imbue','ward','elementTonic'])SHOP.push({id:type+'_'+element,element,type,cost:type==='imbue'?180:type==='ward'?140:200,duration:300,name:ELEMENTS[element]+{imbue:'屬性附魔藥水',ward:'屬性抗性藥水',elementTonic:'屬性增幅藥水'}[type],desc:{imbue:'普攻改為此屬性；不改變職業技能屬性',ward:'承受此屬性傷害減少 25%',elementTonic:'此屬性傷害增加 20%'}[type]});
function buySupply(id){const item=SHOP.find(x=>x.id===id);if(!item||state.gold<item.cost)return toast('金幣不足');state.gold-=item.cost;state.consumables[id]=(state.consumables[id]||0)+1;save();render();}
function useSupply(id){const item=SHOP.find(x=>x.id===id);if(!item||(state.consumables[id]||0)<1)return;state.consumables[id]--;const turns=Math.max(1,Math.round(Number(item.duration)||1));state[item.type]={element:item.element,remainingTurns:turns,totalTurns:turns,until:0};save();render();toast('已使用'+item.name);}
function supplyStatus(h){return ['imbue','ward','elementTonic'].map(key=>{const b=activeSupply(h,key);return b?ELEMENTS[b.element]+{imbue:'附魔',ward:'抗性',elementTonic:'增幅'}[key]+' '+Math.max(0,Math.ceil(b.remainingTurns))+' 回合':'';}).filter(Boolean).join(' ／ ');}
function shopView(){return heading('SUPPLIES / 商店','元素補給',`<span class="tag">${state.gold} 金幣</span>`)+`<section class="panel"><p>購買與使用均針對本區塊的隊員。附魔、抗性、增幅各保留一種，同類藥水覆蓋屬性並重設持續回合；不同類可同時生效。只有角色出戰的實際戰鬥回合會扣減，暫停或關閉遊戲不會消耗回合。</p><p id="supply-status">${supplyStatus(state)||'目前沒有道具增益'}</p></section><div class="cards">${SHOP.map(item=>`<article class="card supply-card"><h3>${item.name}</h3><p>${item.desc}</p><p>${item.duration?'持續 '+item.duration+' 回合':'立即生效'}</p><p>持有 ${state.consumables[item.id]||0} 瓶 · 單價 ${item.cost} 金幣</p><button onclick="buySupply('${item.id}')" ${state.gold<item.cost?'disabled':''}>購買</button><button onclick="useSupply('${item.id}')" ${(state.consumables[item.id]||0)<1?'disabled':''}>使用</button></article>`).join('')}</div>`;}
const expansionCharacterView=characterView,expansionSkillDescription=skillDescription,expansionGearDesc=gearDesc,expansionGuide=guideView;
characterView=function(){const v=stats();return expansionCharacterView()+`<section class="panel"><h2>進階能力</h2><div class="stat-grid"><span>暴擊傷害 ${Math.round(v.critDamage*100)}%</span><span>防禦穿透 ${Number((v.pierce||0).toFixed(1))}</span><span>防禦無視 ${Math.round((v.defenseIgnore||0)*100)}%</span><span>生命竊取 ${Math.round(v.lifesteal*100)}%</span><span>閃避 ${Math.round(v.evasion*100)}%</span><span>武器屬性 ${ELEMENTS[weaponElement(state)]}</span><span>全屬性增傷 ${Math.round(v.elementBonus*100)}%</span></div><p>${Object.entries(v.elementDamage).map(([k,n])=>ELEMENTS[k]+'傷害 +'+Math.round(n*100)+'%').join(' / ')}</p><p>${Object.entries(v.raceDamage).map(([k,n])=>'對'+RACES[k]+' +'+Math.round(n*100)+'%').join(' / ')}</p><p>${Object.entries(v.resist).map(([k,n])=>ELEMENTS[k]+'抗性 '+Math.round(n*100)+'%').join(' / ')}</p></section>`;};
skillDescription=function(i){return '['+ELEMENTS[SKILL_ELEMENTS[state.job][i]]+'] '+expansionSkillDescription(i);};
gearDesc=function(g){const form=itemForm(g);return expansionGearDesc(g)+(form?' / '+[form.element?ELEMENTS[form.element]+'屬性':'',...['critDamage','pierce','lifesteal','evasion','elementBonus'].filter(k=>form[k]).map(k=>({critDamage:'暴傷',pierce:'穿透',lifesteal:'吸血',evasion:'閃避',elementBonus:'屬傷'}[k])+' +'+form[k]+'%')].filter(Boolean).join('、'):'');};
guideView=function(){return `<section class="panel"><h2>元素遠征</h2><p>每次遭遇結束（勝利或全隊戰敗）後，全隊含候補回滿生命。暫停、換圖、換人、切換模式不視為戰鬥結束，不會回復。戰敗仍扣 5% 金幣並停止探索，恢復後可重新開始。</p><p>主動技能只受冷卻時間限制；冷卻完成後即可施放。觸發技能依普攻觸發率判定，輔助技能使用各自冷卻。</p><p>火剋風、風剋冰、冰剋火：傷害 ×1.3；逆向 ×0.85；同屬性 ×0.8。光暗互剋 ×1.3；無屬性不參與剋制。附魔只改普攻，技能使用標示屬性。種族增傷與屬性增傷相乘。抗性最高 75%、穿透最高 65%、閃避最高 45%、裝備吸血最高 25%。</p><p>新增 12 個同級區域，各有四種一般怪物及專屬首領；每 5 級有兩個地區可選。怪物有各自素材、種族和屬性。裝備以文字顯示職業、部位與變體。</p></section>`+expansionGuide();};
const expansionValidateParty=validateParty;
validateParty=function(data){const p=expansionValidateParty(data);for(const h of p.members){if(!h.consumables||Array.isArray(h.consumables)||typeof h.consumables!=='object'||Object.entries(h.consumables).some(([id,n])=>id!=='mana'&&id!=='power_tier_reroll'&&!SHOP.some(x=>x.id===id)||!Number.isInteger(n)||n<0||n>1e6))throw Error('道具資料無效');delete h.consumables.mana;delete h.mp;for(const key of ['imbue','ward','elementTonic']){const b=h[key];if(b!==null&&(!b||!Object.keys(ELEMENTS).includes(b.element)||b.element==='physical'||!Number.isFinite(b.until)||b.until<0||b.until>8.64e15))throw Error('附魔資料無效');}for(const g of h.bag){if(g.formJob!==undefined&&(!Number.isInteger(g.formJob)||g.formJob<0||g.formJob>=ITEM_FORMS.length))throw Error('裝備來源類別無效');if(g.form!==undefined&&(!Number.isInteger(g.form)||!itemForm(g)))throw Error('裝備類型無效');}}return p;};


const expansionClampVitals=clampVitals;
clampVitals=function(){expansionClampVitals();delete state.mp;};
// Imported defeated legacy parties can restart without the removed camp action.
const expansionLoadParty=loadParty;
loadParty=function(data){expansionLoadParty(data);if(!living().length)refillParty();};


setInterval(()=>{if(!state||!party)return;refreshBattleBuffTimers();const label=$('supply-status');if(label)label.textContent=supplyStatus(state)||'目前沒有道具增益';if(document.querySelectorAll)for(const el of document.querySelectorAll('.supply-countdown')){const hero=party.members.find(h=>h.job===Number(el.dataset.job));if(hero)el.textContent=supplyStatus(hero);}},1000);


// Refresh every prebuilt bestiary icon after region/species registration is complete.
for(const map of MAPS)for(const mob of map.mobs.concat([map.boss])){
 const index=monsterArtByMaterial.get(mob[2])??24;
 const element=species.get(mob[2])?.element||'physical';
 mob[1]=monsterPixel(index,true,element);
}

function battleBuffRows(){
 const rows=[];
 const row=(who,name,detail,time,clock)=>`<tr><td>${esc(who)}</td><td>${esc(name)}</td><td>${esc(detail)}</td><td class="buff-time">${esc(time)}</td><td>${esc(clock)}</td></tr>`;
 const names={attack:'攻擊提升',power:'技能威力提升',guard:'傷害減免',fracture:'防禦降低',weaken:'攻擊降低',vulnerable:'承受傷害增加',critical:'暴擊率提升',regen:'每回合恢復最大生命'};
 const heroName=h=>characterName(h);
 for(const e of effects.filter(e=>e.until>partyClock)){
  const h=party.members.find(h=>heroKey(h)===e.target), foe=foes.find(f=>f.id===e.target);
  if(!h&&!foe)continue;
  const sk=SUPPORT[e.source]?.[e.skill];
  rows.push(row(h?heroName(h):foe.name,e.name,(names[e.kind]||e.kind)+' '+Number((e.value*100).toFixed(1))+'%',Math.max(0,Math.ceil(e.until-partyClock))+' / '+(sk?.duration??'—')+' 回合','戰鬥回合'));
 }
 for(const h of party.members){
  const who=heroName(h)+(party.active.includes(h.job)?'':'（候補）');
  for(const key of ['imbue','ward','elementTonic']){
   const b=activeSupply(h,key);if(!b)continue;
   const labels={imbue:['附魔藥水','普攻改為'+ELEMENTS[b.element]+'屬性'],ward:['抗性藥水',ELEMENTS[b.element]+'傷害減免 25%'],elementTonic:['增幅藥水',ELEMENTS[b.element]+'傷害增加 20%']};
   rows.push(row(who,ELEMENTS[b.element]+labels[key][0],labels[key][1],Math.max(0,Math.ceil(b.remainingTurns))+' / '+Math.max(0,Math.ceil(b.totalTurns||b.remainingTurns))+' 回合','出戰回合'));
  }
  if(h.shield>0)rows.push(row(who,'護盾','可抵擋所有來源傷害 · 剩餘 '+Math.round(h.shield),'無回合期限','耗盡或戰鬥結束'));
 }
 return rows.join('')||'<tr><td colspan="5" class="no-buffs">目前沒有生效中的 BUFF、DEBUFF 或消耗品效果。</td></tr>';
}
function battleBuffPanel(){return `<section class="panel battle-buffs"><div class="row"><h2>生效效果與持續時間</h2><span class="small">剩餘／總回合</span></div><div class="buff-table-scroll"><table class="buff-table"><thead><tr><th>對象</th><th>效果</th><th>能力變化</th><th>持續時間</th><th>計時方式</th></tr></thead><tbody id="battle-buff-rows">${battleBuffRows()}</tbody></table></div></section>`;}
function refreshBattleBuffTimers(){if(!party)return;const body=$('battle-buff-rows');if(body)body.innerHTML=battleBuffRows();}

// Keep each generated control bound to its owner without changing global selection.
function ownerControls(html,job){return html.replace(/on(click|change)="([^"]*)"/g,(all,event,code)=>code.startsWith('heroMenuAction(')?all:`on${event}="heroMenuAction(${job},()=>{${code}})"`);}
function heroMenuAction(job,action){
 const hero=party?.members.find(h=>h.job===job);if(!hero)return;
 const priorTab=tab;
 withHero(hero,action);
 // Navigation to a single-character page carries the equipment owner along.
 if(tab!==priorTab&&!['skills','equipment'].includes(tab)){party.selected=job;state=hero;save();}
 if($('modal').open)$('modal').innerHTML=ownerControls($('modal').innerHTML,job);
 render();
}
const singleOwnerInventoryView=equipmentView;
const individualSkillsView=skillsView;
function memberMenuTitle(h){return `${esc(characterName(h))} · LV ${h.lv} · ${party.active.includes(h.job)?'出戰':'候補'}`;}
skillsView=function(){return heading('PARTY SKILLS / 全隊技能','隊伍技能')+`<p class="small">直接操作各隊員的技能、主動／輔助槽與寶石。技能點、寶石及材料仍由各角色分別持有。</p><div class="team-menus team-skills">${party.members.map(h=>withHero(h,()=>`<details class="team-member" open><summary><b>${memberMenuTitle(h)}</b><span>技能點 ${h.sp} · 寶石粉塵 ${h.dust}</span></summary><div class="member-skill-content">${ownerControls(individualSkillsView(),h.job)}</div></details>`)).join('')}</div>`;};
equipmentView=function(){return heading('PARTY INVENTORY / 全隊背包','隊伍裝備')+`<section class="panel team-inventory-filters">${gearFilters()}<p class="small">篩選套用到全隊；「本職業」依各背包主人的職業判定。點開裝備可穿戴、分解、轉交或前往強化。</p></section><div class="team-menus team-equipment">${party.members.map(h=>withHero(h,()=>{const items=filteredGear();return `<details class="team-member" open><summary><b>${memberMenuTitle(h)}</b><span>${items.length}／${h.bag.length} 件 · ${h.gold.toLocaleString()} 金幣</span></summary><div class="member-equipment-content"><div class="equipped-summary">${[0,1,2,3,4].map(position=>{const g=findGear(h.equipped[position]);return `<span>${EQUIP_POSITION_NAMES[position]}：${g?`<button onclick="heroMenuAction(${h.job},()=>showGearDetail('${g.id}'))">${equipmentNameHTML(g)}</button>`:'未穿戴'}</span>`;}).join('')}</div><div class="member-inventory-toolbar"><span class="small">鍛鐵 ${h.ore} · 粉塵 ${h.dust}</span><button onclick="heroMenuAction(${h.job},()=>salvageAll())">分解本角色未養成普通裝備</button></div><div class="inventory-table" aria-label="${esc(characterName(h))}背包">${items.map(g=>`<button class="inventory-row rarity-row-${g.rar}" onclick="heroMenuAction(${h.job},()=>showGearDetail('${g.id}'))"><span class="inventory-name"><b>${equipmentNameHTML(g)}</b><small>${gearWearableJobsText(g)} · ${CLASS_GEAR[g.job][g.slot]} · LV${gearRequiredLevelByTier(g.tier)}</small></span><span class="inventory-quality"><span class="rank-${g.rar}">${RARITY[g.rar]}</span>${g.boss!==undefined?'<small>BOSS 專屬</small>':''}</span><span class="inventory-summary">${gearDesc(g)}</span><span class="inventory-state">${h.equipped.includes(g.id)?'已穿戴':'查看詳情'}</span></button>`).join('')||'<p class="empty">沒有符合篩選的裝備。</p>'}</div>${materialView()}</div></details>`;})).join('')}</div>`;};
const singleCharacterPartyPicker=partyPicker;
partyPicker=function(){return ['skills','equipment'].includes(tab)?'':singleCharacterPartyPicker();};

const teamForgeSelection=new Map();
const originalOpenForge=openForge,originalChooseForge=chooseForge;
openForge=function(id){teamForgeSelection.set(state.job,id);originalOpenForge(id);};
chooseForge=function(id){teamForgeSelection.set(state.job,id);originalChooseForge(id);};
function unifiedMemberPage(title,view,kind){return heading('PARTY / 全隊管理',title)+`<div class="team-menus team-all team-${kind}">${party.members.map(h=>withHero(h,()=>{
 const previousForge=forgeSelection;
 if(kind==='forge')forgeSelection=teamForgeSelection.get(h.job)||null;
 let content;try{content=view();if(kind==='forge')teamForgeSelection.set(h.job,forgeSelection);}finally{forgeSelection=previousForge;}
 content=content.replace(/id="supply-status"/g,`class="supply-countdown" data-job="${h.job}"`);
 return `<details class="team-member" open><summary><b>${memberMenuTitle(h)}</b><span>能力點 ${h.ap} · 技能點 ${h.sp} · 金幣 ${h.gold}</span></summary><div class="member-content">${ownerControls(content,h.job)}</div></details>`;
})).join('')}</div>`;}
const memberCharacterView=characterView,memberForgeView=forgeView,memberBossView=bossCraftView,memberQuestView=questView,memberShopView=shopView;
characterView=function(){return unifiedMemberPage('全隊角色能力',memberCharacterView,'character');};
forgeView=function(){return unifiedMemberPage('全隊裝備強化與洗鍊',memberForgeView,'forge');};
bossCraftView=function(){return unifiedMemberPage('全隊 BOSS 裝備製作',memberBossView,'craft');};
questView=function(){return unifiedMemberPage('全隊委託',memberQuestView,'quests');};
shopView=function(){return unifiedMemberPage('商店',memberShopView,'shop');};
partyPicker=function(){return `<section class="party-picker team-roster"><b>出戰編成</b><span id="party-status">${running?'戰鬥 '+partyClock+' 秒':'整備中'}</span><div class="roster-controls">${party.members.map(h=>`<button onclick="toggleMember(${h.job})">${esc(characterName(h))} LV${h.lv} · ${party.active.includes(h.job)?'出戰 → 候補':'候補 → 出戰'}</button>`).join('')}${CLASSES.map((c,j)=>party.members.some(h=>h.job===j)?'':`<button onclick="requestHeroName(${j},false)">招募${c.name}</button>`).join('')}</div></section>`;};
const beforeSharedSupplies=battleView;
battleView=function(){return beforeSharedSupplies().replace(/<div class="compact-supplies">[\s\S]*?<div class="map-list-heading">/,`<div class="team-battle-supplies"><button onclick="setTab('shop')">商店</button>${party.members.map(h=>`<div class="compact-supplies"><b>${esc(characterName(h))}</b><button onclick="heroMenuAction(${h.job},()=>potion())" ${h.potions<1?'disabled':''}>喝藥 (${h.potions})</button><button onclick="heroMenuAction(${h.job},()=>buyPotion())" ${h.gold<GS('quests.potion.buyCost',75)?'disabled':''}>+${Math.round(GS('quests.potion.buyQuantity',5))} 瓶／${Math.round(GS('quests.potion.buyCost',75))} 金幣</button><label class="auto-potion"><input type="checkbox" ${h.autoPotion?'checked':''} onchange="heroMenuAction(${h.job},()=>{state.autoPotion=this.checked;save()})">低於${Math.round(GS('combat.autoPotionThreshold',.35)*10000)/100}%自動喝藥</label></div>`).join('')}</div><div class="map-list-heading">`);};
// Actions always retain their owner, including modal follow-up actions.
heroMenuAction=function(job,action){const hero=party?.members.find(h=>h.job===job);if(!hero)return;withHero(hero,action);if($('modal').open)$('modal').innerHTML=ownerControls($('modal').innerHTML,job);render();};
const allTeamRender=render;
render=function(){allTeamRender();if(party&&state){const wallet=$('wallet');if(wallet)wallet.textContent='全隊金幣 '+party.members[0].gold.toLocaleString();}};

function newcomerPartyGuide(){if(!party||party.members.length>=3)return '';return `<section class="panel" style="border-color:#b88a45"><h2>新手提示：先招募滿 3 人</h2><p>目前戰鬥固定為群怪遭遇，每場會同時出現 3～6 隻敵人。單人直接開始探索很容易反覆戰敗。</p><div class="actions"><button class="primary" onclick="setTab('roster')">前往隊伍編成</button><span class="small">目前已招募 ${party.members.length} / 3；建議先再招募 ${3-party.members.length} 名同伴並加入出戰。</span></div></section>`;}
const basePartyBattleView=battleView;
battleView=function(){return newcomerPartyGuide()+basePartyBattleView();}

function rosterView(){return heading('PARTY / 編成與招募','隊伍編成',`<span class="tag">出戰 ${heroes().length} / 3 · 已招募 ${party.members.length} / 4</span>`)+`<section class="panel roster-page">${uiHelp('編成說明','每職業一人，最多三人出戰。候補不獲經驗；招募等級依出戰最低等級。')}<p class="small">調整編成會放棄當前遭遇。</p><div class="roster-list">${CLASSES.map((c,job)=>{const h=party.members.find(h=>h.job===job),active=h&&party.active.includes(job);return `<article class="roster-row"><div><b>${h?esc(characterName(h)):c.name}</b><span class="tag">${h?'LV '+h.lv+' · '+(active?'出戰':'候補'):'尚未招募'}</span><p class="small">${c.desc}</p></div>${h?`<div class="roster-member-actions"><button onclick="toggleMember(${job})">${active?'移至候補':'加入出戰'}</button><button onclick="requestRename(${job})">改名</button></div>`:`<button class="primary" onclick="requestHeroName(${job},false)">招募${c.name}</button>`}</article>`;}).join('')}</div></section>`;}
partyPicker=function(){return '';};

const pageHeroSelection=new Map();
function pageHero(page=tab){return party.members.find(h=>h.job===pageHeroSelection.get(page))||party.members[0];}
function selectPageHero(page,job){if(!party.members.some(h=>h.job===job))return;pageHeroSelection.set(page,job);closeModal();render();}
function pageSelector(page){return `<div class="page-hero-tabs" aria-label="本頁操作角色">${party.members.map(h=>`<button class="${pageHero(page)===h?'primary':''}" onclick="selectPageHero('${page}',${h.job})">${esc(characterName(h))} LV${h.lv}</button>`).join('')}</div>`;}
function singlePagePanel(page,title,view){const h=pageHero(page);return heading('PARTY / 隊員操作',title)+pageSelector(page)+`<section class="panel page-owner-panel"><div class="page-owner-summary"><b>${memberMenuTitle(h)}</b><span>能力點 ${h.ap} · 技能點 ${h.sp} · 金幣 ${h.gold}</span></div><div class="page-owner-content">${withHero(h,()=>{const prior=forgeSelection;if(page==='forge')forgeSelection=teamForgeSelection.get(h.job)||null;let html;try{html=view();if(page==='forge')teamForgeSelection.set(h.job,forgeSelection);}finally{forgeSelection=prior;}return ownerControls(html,h.job);})}</div></section>`;}
characterView=function(){return singlePagePanel('character','角色能力',memberCharacterView);};
skillsView=function(){return singlePagePanel('skills','主動技能、普攻觸發技能',individualSkillsView);};
// The original inventory renderer already supplies filters, worn markers and detail actions.
equipmentView=function(){return singlePagePanel('equipment','裝備背包',singleOwnerInventoryView);};
forgeView=function(){return singlePagePanel('forge','裝備強化與洗鍊',memberForgeView);};
bossCraftView=function(){return singlePagePanel('bossCraft','BOSS 裝備製作',memberBossView);};
questView=function(){return singlePagePanel('quests','委託手札',memberQuestView);};
heroMenuAction=function(job,action){const h=party?.members.find(h=>h.job===job);if(!h)return;const before=tab;withHero(h,action);if(tab!==before)pageHeroSelection.set(tab,job);if($('modal').open)$('modal').innerHTML=ownerControls($('modal').innerHTML,job);render();};
// Runtime shared storage; saves write the inventory once to preserve old-save validation.
function ensureSharedItems(){if(!party)return;if(!party.sharedItems)Object.defineProperty(party,'sharedItems',{value:{consumables:{},potions:0,linked:new Set()},enumerable:false});const shared=party.sharedItems;for(const h of party.members){if(shared.linked.has(h))continue;for(const [id,n] of Object.entries(h.consumables||{}))shared.consumables[id]=(shared.consumables[id]||0)+n;shared.potions+=h.potions||0;Object.defineProperty(h,'consumables',{configurable:true,enumerable:true,get:()=>shared.consumables,set:v=>{shared.consumables=v;}});Object.defineProperty(h,'potions',{configurable:true,enumerable:true,get:()=>shared.potions,set:v=>{shared.potions=v;}});shared.linked.add(h);}}
const beforeSharedPack=packParty;
packParty=function(){ensureSharedItems();const data=beforeSharedPack();return {...data,members:data.members.map((h,i)=>({...h,consumables:i===0?{...party.sharedItems.consumables}:{},potions:i===0?party.sharedItems.potions:0}))};};
const beforeSharedRender=render;
render=function(){ensureSharedItems();beforeSharedRender();};
shopView=function(){const h=pageHero('shop');return heading('SUPPLIES / 全隊共用','商店')+pageSelector('shop')+`<section class="panel shared-shop-info"><b>使用對象／付款角色：${esc(characterName(h))} · ${h.gold} 金幣</b>${uiHelp('補給說明','道具與金幣共用，使用效果套用至選取角色。附魔、抗性、增幅各保留一種；同類覆蓋，不同類可並存。消耗品效果以戰鬥回合計時；只有角色出戰的實際戰鬥回合會扣減，暫停或關閉遊戲不會消耗回合。')}<div class="actions">${ownerControls(`<button onclick="buyPotion()" ${h.gold<GS('quests.potion.buyCost',75)?'disabled':''}>治療藥水 +${Math.round(GS('quests.potion.buyQuantity',5))}／${Math.round(GS('quests.potion.buyCost',75))} 金幣</button><button onclick="potion()" ${h.potions<1?'disabled':''}>使用治療藥水（共用 ${h.potions}）</button>`,h.job)}</div><p class="supply-countdown" data-job="${h.job}">${supplyStatus(h)||'目前無消耗品效果'}</p></section><div class="shared-shop-grid">${SHOP.map(item=>`<article class="card"><h3>${item.name}</h3><p class="small">${item.desc} · ${item.duration?item.duration+' 秒':'立即生效'}</p><div class="row"><span>共用 ${h.consumables[item.id]||0} 瓶</span><span>${item.cost} 金幣</span></div><div class="actions">${ownerControls(`<button onclick="buySupply('${item.id}')" ${h.gold<item.cost?'disabled':''}>購買</button><button onclick="useSupply('${item.id}')" ${!h.consumables[item.id]?'disabled':''}>對${esc(characterName(h))}使用</button>`,h.job)}</div></article>`).join('')}</div>`;};

function characterName(h){return typeof h.name==='string'&&h.name.trim()?h.name.trim():CLASSES[h.job].name;}
function validCharacterName(value){if(value===undefined)return '';if(typeof value!=='string'||Array.from(value.trim()).length>20||/[\u0000-\u001f\u007f]/.test(value))throw Error('角色名字需為 20 字以內的文字');return value.trim();}
const namesValidateParty=validateParty;
validateParty=function(data){const result=namesValidateParty(data);for(const h of result.members){const raw=data.version===3?data.members.find(x=>x.job===h.job):data;h.name=validCharacterName(raw?.name);}return result;};
function requestHeroName(job,first=false){if(!CLASSES[job]||!first&&party?.members.some(h=>h.job===job))return;$('modal').innerHTML=`<h2>${first?'建立角色':'招募'} · ${CLASSES[job].name}</h2><p>留白使用「${CLASSES[job].name}」，之後可改名。</p><label for="new-hero-name">角色名字（最多 20 字）</label><input id="new-hero-name" type="text" maxlength="40" autocomplete="off" placeholder="${CLASSES[job].name}"><div class="actions"><button class="primary" onclick="confirmHeroName(${job},${first})">確認${first?'建立':'招募'}</button><button onclick="closeModal()">取消</button></div>`;$('modal').showModal();}
function confirmHeroName(job,first){let name;try{name=validCharacterName($('new-hero-name').value||'');}catch(e){toast(e.message);return;}closeModal();if(first)start(job);else recruitHero(job);const h=party?.members.find(h=>h.job===job);if(h){h.name=name;save();render();}}

function requestRename(job){const h=party?.members.find(h=>h.job===job);if(!h)return;$('modal').innerHTML=`<h2>修改角色名字</h2><p>目前：${esc(characterName(h))} · ${CLASSES[job].name}<br>留白則恢復「${CLASSES[job].name}」。</p><label for="rename-hero-input">角色名字（最多 20 字）</label><input id="rename-hero-input" type="text" maxlength="40" autocomplete="off" value="${esc(h.name||'')}" placeholder="${CLASSES[job].name}"><div class="actions"><button class="primary" onclick="confirmRename(${job})">儲存名字</button><button onclick="closeModal()">取消</button></div>`;$('modal').showModal();}
function confirmRename(job){const h=party?.members.find(h=>h.job===job);if(!h)return;try{h.name=validCharacterName($('rename-hero-input').value||'');}catch(e){toast(e.message);return;}closeModal();save();render();toast('名字已更新');}

let lastActionOrder=[],actionVisualTime=0;
const beforeSpeedStats=stats;
stats=function(h=state){const v=beforeSpeedStats(h);v.speed=Math.round([102,108,116,96][h.job]+h.lv*.5+Math.min(5,(v.evasion||0)*10+(v.crit||0)*5));return v;};
solo.stats=stats;
function combatSpeed(e){return Math.round(106+e.lv*.5+({beast:5,plant:-4,undead:-2,construct:-5,demon:3,spirit:4}[e.race]||0)+(e.kind==='elite'?2:e.kind==='boss'?4:e.kind==='final'?6:0)+(e.difficulty||0)*2);}
function initiativeOrder(){return [...living().map(h=>({actor:h,id:heroKey(h),side:'hero',speed:stats(h).speed})),...foes.filter(e=>e.hp>0).map(e=>({actor:e,id:e.id,side:'enemy',speed:combatSpeed(e)}))].map((u,i)=>({...u,tie:i})).sort((a,b)=>b.speed-a.speed||a.tie-b.tie);}
function recordAction(id,name,type){lastActionOrder.push({id,name,type});actionVisualTime=Date.now();}
function actionVisualStyle(id){const last=lastActionOrder.at(-1),age=Date.now()-actionVisualTime;if(!last||last.id!==id||age>420||!running)return '';return `style="animation:${id.startsWith('foe-')?'enemy-strike':'combat-strike'} .42s ease ${-age/1000}s both !important"`;}

function performHeroBasic(h){const v=battleStats(h),target=foes.find(enemyAvailableForSingleTarget);const d=resolveHit(target,v.atk,h,weaponElement(h),Math.random()<v.crit);note(characterName(h)+' 普攻 → '+combatEnemyName(target)+' '+d+' 傷害');for(let i=0;i<6;i++)if(foes.some(e=>e.hp>0)&&CLASSES[h.job].skills[i][1]==='proc'&&h.skills[i]>0&&Math.random()<procChance(i,h))castPartySkill(h,i,v);}
function performEnemyBasic(e){e.turn++;const targets=living(),h=targets[rand(targets.length)],v=battleStats(h),multi=e.kind==='final'?(e.turn>45?4:e.turn%5===0?1.65:1):1+Math.max(0,e.lv-h.lv)*.12;let hit=Math.max(1,Math.round(e.atk*(1-Math.min(.7,effectTotal(e.id,'weaken')))*multi-v.def*.65));hit=Math.max(1,Math.round(hit*(1-Math.min(.75,effectTotal(heroKey(h),'guard')))));if(Math.random()<v.evasion){note(characterName(h)+'閃避了'+e.name+'的攻擊');return;}const ward=activeSupply(h,'ward'),resist=Math.min(.75,(v.resist[e.element]||0)+(ward && ward.element===e.element ? .25 : 0));hit=Math.max(1,Math.round(hit*(1-resist)));const absorb=Math.min(h.shield,hit);h.shield-=absorb;const hpDamage=Math.max(0,hit-absorb);h.hp=Math.max(0,h.hp-hpDamage);if(absorb>0&&hpDamage===0)note(e.name+' → '+characterName(h)+' 的護盾承受 '+Math.round(absorb)+' 傷害，剩餘 '+Math.round(h.shield));else if(absorb>0)note(e.name+' → '+characterName(h)+' 護盾承受 '+Math.round(absorb)+' 傷害，剩餘 '+Math.round(h.shield)+'；生命受到 '+Math.round(hpDamage)+' 傷害');else note(e.name+' → '+characterName(h)+' '+Math.round(hpDamage)+' 傷害');}
function enemyDisplayName(e){
  if(!e)return '';
  const same=foes.filter(x=>x.name===e.name);
  if(same.length<=1)return e.name;
  return e.name+(same.indexOf(e)+1);
}
function combatEnemyName(e){return enemyDisplayName(e)||e?.name||'敵人';}
function enemyAvailableForSingleTarget(e){
  if(!e||e.hp<=0)return false;
  return !globalThis.__EMBERWILD_CONTROL_TEST_API?.isPolymorphed?.(e);
}
function singleTargetEnemyPool(){return foes.filter(enemyAvailableForSingleTarget);}
function initiativeView(){
  const order=initiativeOrder();
  return `<section class="panel initiative-panel compact-initiative"><div class="row"><h2 title="依速度排序；速度相同時維持穩定順序。">行動順序</h2></div><div class="initiative-track initiative-name-line">${order.length?order.map(u=>`<span class="initiative-token ${u.side}"><b>${esc(u.side==='hero'?characterName(u.actor):enemyDisplayName(u.actor))}</b></span>`).join(''):'<span class="small">開始探索後顯示</span>'}</div></section>`;
}
const beforeInitiativeBattle=battleView;battleView=function(){return beforeInitiativeBattle().replace('<div class="text-battle-layout">',initiativeView()+'<div class="text-battle-layout">');};
const beforeSpeedCharacter=characterView;characterView=function(){const h=pageHero('character');return beforeSpeedCharacter().replace('<div class="page-owner-content">',`<div class="page-owner-content"><p class="speed-description">速度 <b>${stats(h).speed}</b></p>`);};
const speedReset=resetEncounter;resetEncounter=function(){speedReset();lastActionOrder=[];actionVisualTime=0;};

let battleRate=1,roundIterator=null,nextActionAt=0,roundStartedAt=0;
function toggleBattleRate(){const now=Date.now(),old=battleRate;battleRate=old===1?2:old===2?4:1;if(roundStartedAt)roundStartedAt=now-(now-roundStartedAt)*old/battleRate;nextActionAt=now+Math.max(0,nextActionAt-now)*old/battleRate;render();}
function tick(){if(!party||!running||$('modal').open)return;const now=Date.now();if(now<nextActionAt)return;if(!roundIterator){roundIterator=pacedRound();roundStartedAt=now;}const step=roundIterator.next();if(step.done){roundIterator=null;nextActionAt=Math.max(now+900/battleRate,roundStartedAt+6000/battleRate);}else{nextActionAt=now+900/battleRate;if(tab==='battle')render();}if(tab!=='battle')refreshGlobalJournal(); }
const beforePaceReset=resetEncounter;resetEncounter=function(){roundIterator=null;nextActionAt=0;roundStartedAt=0;beforePaceReset();};
const beforePaceBattle=battleView;battleView=function(){return beforePaceBattle().replace('<div class="text-battle-layout">',`<div class="panel pace-controls"><button class="${battleRate===2?'primary':''}" onclick="toggleBattleRate()">${battleRate} 倍速</button><button onclick="setTab('guide')">戰鬥說明</button></div><div class="text-battle-layout">`);};

function showRegionBestiary(){const m=MAPS[party.map];$('modal').innerHTML=`<h2>${m.name} · 怪物與掉落</h2>${m.mobs.concat([m.boss]).map(x=>`<p><b>${esc(x[0])}</b> · ${ELEMENTS[species.get(x[2])?.element||'physical']}／${RACES[species.get(x[2])?.race||'beast']}<br>專屬掉落：${esc(x[2])}</p>`).join('')}<button onclick="closeModal()">關閉</button>`;$('modal').showModal();}
function uiHelp(title,body){return `<details class="ui-help"><summary>${title}</summary><div>${body}</div></details>`;}
guideView=function(){return heading('FIELD NOTES / 冒險指南','冒險指南')+`<section class="guide-scroll panel">
${uiHelp('成長與隊伍','每職業可招募一人，最多三人出戰。出戰成員平分經驗，倒下成員仍可分得，候補不分得。LV15 可二轉；LV30 擊敗噬日者後解鎖 LV60 與覺醒地圖。背包、金幣、材料與道具共用，能力點、技能與穿戴各自配置。')}
${uiHelp('戰鬥與速度','普攻依速度排序；同速依隊伍／遭遇順序。主動與輔助技能獨立施放。1× 每次出手間隔 0.9 秒，每回合至少 6 秒；2×、4× 分別縮短為一半、四分之一。速度受職業、等級、暴擊率與閃避率影響。')}
${uiHelp('恢復與計時','遭遇結束後全隊回滿生命。戰敗扣除 5% 金幣並停止探索。暫停不會回復；換圖、換人或切換難度會放棄遭遇。BUFF／DEBUFF 持續時間使用戰鬥回合；消耗品只在角色出戰的戰鬥回合扣減。暫停與對話框都不會消耗回合。')}
${uiHelp('技能與寶石','主動技能、普攻觸發技能、輔助技能各自使用獨立槽位；普攻觸發技能只有配置於觸發槽時才會生效。主動技能耗魔，不足時暫緩施放。主動與觸發技能可鑲嵌寶石，替換時退還原寶石；輔助技能不鑲嵌寶石。效果、冷卻與需求請見技能頁。')}
${uiHelp('元素與能力上限','火剋風、風剋冰、冰剋火：×1.3；逆向 ×0.85；同屬性 ×0.8。光暗互剋 ×1.3，無屬性不參與剋制。附魔只改普攻。抗性、減傷與破甲上限 75%，穿透 65%，閃避 45%，裝備吸血 25%，敵方攻擊降低 70%，戰鬥暴擊率 85%。')}
${uiHelp('裝備與分解','護甲通用，武器與副手限職業；職業技能詞條只對標示職業生效。強化必定成功，最高 +10。洗鍊時扣款，可保留原詞條。批次分解涵蓋全部背包，不受篩選影響，排除已穿戴與待確認洗鍊裝備。背包滿時新掉落裝備自動分解。')}
${uiHelp('難度與掉落',`<table class="mode-table"><thead><tr><th>模式</th><th>生命／攻擊／防禦</th><th>普通怪裝備／寶石</th><th>BOSS 專屬</th></tr></thead><tbody>${MODES.map(d=>`<tr><td>${d.name}</td><td>×${d.hp}／×${d.atk}／×${d.def}</td><td>${d.equip[0]*100}%／${d.gem[0]*100}%</td><td>${d.boss*100}%</td></tr>`).join('')}</tbody></table>各難度 BOSS 裝備需用對應素材製作。地區怪物與專屬素材可在戰場查看。`)}
${uiHelp('存檔與備份','每 5 秒及重要操作後自動儲存。匯出可備份或搬移裝置；匯入會覆蓋目前隊伍。保存養成與未確認洗鍊，不保存當前敵人與戰鬥技能效果。關閉網頁後不會離線戰鬥。')}
${uiHelp('測試工具','<button onclick="showBalanceToolsAccess()">測試設定 JSON</button>')}
<button class="danger" onclick="confirmNew()">建立新角色</button></section>`;};

const beforeMapColumnBattle=battleView;
battleView=function(){let html=beforeMapColumnBattle();const start=html.indexOf('<section class="panel expedition-tools">');if(start<0)return html;const tail=html.slice(start),headingStart=tail.indexOf('<div class="map-list-heading">'),detailsStart=tail.indexOf('<details>');if(headingStart<0||detailsStart<0)return html;const maps=`<section class="panel battle-map-column">${tail.slice(headingStart,detailsStart)}</section>`;html=html.slice(0,start);const marker='</div><section class="panel battle-buffs">';return html.replace(marker,maps+marker);};
const beforeAutoPotionShop=shopView;
shopView=function(){const h=pageHero('shop');return beforeAutoPotionShop().replace('<div class="shared-shop-grid">',`<section class="panel auto-potion-settings"><b>自動喝藥 · ${esc(characterName(h))}</b><label><input type="checkbox" ${h.autoPotion?'checked':''} onchange="heroMenuAction(${h.job},()=>{state.autoPotion=this.checked;save()})">生命低於 35% 時使用共用治療藥水</label></section><div class="shared-shop-grid">`);};

function equipmentEffectRank(g){return Array.isArray(g.affix)&&g.affix.length?Math.max(...g.affix.map(a=>a.rank??0)):-1;}
function equipmentDisplayName(g){if(!Array.isArray(g.affix)&&g.slot===undefined)return g.name;return '+'+(g.plus||0)+' '+(g.name||gearName(g));}
function equipmentNameClass(g){const rank=equipmentEffectRank(g);return rank===3&&(g.plus||0)>=RULES.enhanceMax?'effect-rainbow':'effect-quality-'+Math.max(0,rank);}
function equipmentNameHTML(g){return `<span class="enhanced-name ${equipmentNameClass(g)}" title="特效品質：${equipmentEffectRank(g)<0?'無':AFFIX_RANK[equipmentEffectRank(g)]}；強化 +${g.plus||0}">${esc(equipmentDisplayName(g))}</span>`;}

const inlineAffixDrafts=new Map();
const autoRerollMeta=new Map();
function affixDraftKey(g){return state.job+':'+g.id;}
function inlineAffixComparison(g){const key=affixDraftKey(g),draft=inlineAffixDrafts.get(key);if(!draft)return affixLockControls(g);const meta=autoRerollMeta.get(key),title=meta?`自動洗鍊 ${meta.attempts} 次 · ${meta.reached?'已達'+AFFIX_RANK[meta.target]+'以上':'資源不足，未達'+AFFIX_RANK[meta.target]} · 共花費 ${meta.gold} 金幣／${meta.ore} 鍛鐵`:'費用已扣除';return `<section class="inline-affix-comparison"><h3>洗鍊結果 · ${title}</h3><div class="affix-compare-columns"><div><b>目前詞條</b>${g.affix.map(a=>affixHTML(a,g)).join('')||'<p>無詞條</p>'}</div><div><b>新詞條</b>${draft.map(a=>affixHTML(a,g)).join('')}</div></div><div class="actions"><button class="primary" onclick="resolveInlineAffix('${g.id}',true)">採用新詞條</button><button onclick="resolveInlineAffix('${g.id}',false)">保留原詞條</button></div></section>`;}
reroll=function(id){
 const g=findGear(id);if(!g)return;const key=affixDraftKey(g);
 if(inlineAffixDrafts.has(key))return toast('請先採用或保留這件裝備的詞條');
 const cost=rerollCostFor(g);if(state.gold<cost.gold||state.ore<cost.ore)return toast('金幣或鍛鐵不足');
 const locked=g.affixLock,hasLock=locked!==undefined,oldRerolled=g.rerolled;
 if(hasLock&&(!Number.isInteger(locked)||!g.affix[locked]))return toast('鎖定的潛能無效，請重新選擇');
 const shards=state.materials['光輝碎塊']||0;
 if(hasLock&&shards<1)return toast('光輝碎塊不足，請取消鎖定或取得碎塊');
 const draft=rollAffixes(g);if(hasLock)draft[locked]={...g.affix[locked]};
 autoRerollMeta.delete(key);
 state.gold-=cost.gold;state.ore-=cost.ore;
 if(hasLock){state.materials['光輝碎塊']=shards-1;delete g.affixLock;}
 inlineAffixDrafts.set(key,draft);g.rerolled=true;
 if(!save()){state.gold+=cost.gold;state.ore+=cost.ore;inlineAffixDrafts.delete(key);if(oldRerolled===undefined)delete g.rerolled;else g.rerolled=oldRerolled;if(hasLock){state.materials['光輝碎塊']=shards;g.affixLock=locked;}}
 render();
};
function autoReroll(id,targetRank){
 const g=findGear(id);if(!g)return;targetRank=Number(targetRank);if(![2,3].includes(targetRank))return;
 const key=affixDraftKey(g);if(inlineAffixDrafts.has(key))return toast('請先採用或保留這件裝備的詞條');
 if(g.affixLock!==undefined)return toast('自動洗鍊不支援鎖定詞條，請先取消鎖定');
 const cost=rerollCostFor(g),goldCost=cost.gold,oreCost=cost.ore,maxAttempts=Math.min(Math.floor(state.gold/goldCost),Math.floor(state.ore/oreCost),10000);
 if(maxAttempts<1)return toast('金幣或鍛鐵不足');
 let draft=null,attempts=0,reached=false;
 while(attempts<maxAttempts){draft=rollAffixes(g);attempts++;if(draft.some(a=>(a.rank??0)>=targetRank)){reached=true;break;}}
 const oldGold=state.gold,oldOre=state.ore,oldRerolled=g.rerolled;
 state.gold-=attempts*goldCost;state.ore-=attempts*oreCost;inlineAffixDrafts.set(key,draft);g.rerolled=true;
 autoRerollMeta.set(key,{attempts,target:targetRank,reached,gold:attempts*goldCost,ore:attempts*oreCost});
 if(!save()){state.gold=oldGold;state.ore=oldOre;inlineAffixDrafts.delete(key);autoRerollMeta.delete(key);if(oldRerolled===undefined)delete g.rerolled;else g.rerolled=oldRerolled;return;}
 render();toast(reached?`自動洗鍊 ${attempts} 次，已出現${AFFIX_RANK[targetRank]}以上詞條`:`資源用盡：已洗鍊 ${attempts} 次，尚未出現${AFFIX_RANK[targetRank]}以上詞條`);
}
function resolveInlineAffix(id,accept){const g=findGear(id);if(!g)return;const key=affixDraftKey(g),draft=inlineAffixDrafts.get(key);if(!draft)return;const old=g.affix;const vitals=party.members.map(h=>[h,h.hp,h.shield]);if(accept)g.affix=draft;inlineAffixDrafts.delete(key);autoRerollMeta.delete(key);for(const h of party.members)withHero(h,clampVitals);if(!save()){g.affix=old;inlineAffixDrafts.set(key,draft);for(const [h,hp,shield] of vitals)Object.assign(h,{hp,shield});}render();}
function inlineInventoryView(){return `<section class="panel">${resourceLine()}${gearFilters()}${bulkSalvageControls()}<div class="inline-equipment-list">${filteredGear().map(g=>{const wearer=gearWearer(g.id),worn=!!wearer,draft=inlineAffixDrafts.has(affixDraftKey(g)),locked=!!g.locked,receiver=null;return `<article class="inline-equipment"><div class="gear-inline-body"><div class="row"><b>${equipmentNameHTML(g)}</b><span class="tag">${RARITY[g.rar]}${worn?' · '+esc(characterName(wearer))+'已穿戴':''}${locked?' · 已鎖定':''}</span></div><p class="small">${gearWearableJobsText(g)} · ${CLASS_GEAR[g.job][g.slot]} · LV ${gearRequiredLevelByTier(g.tier)}${g.boss!==undefined?' · BOSS 專屬':''}</p><p class="inline-gear-stats equipment-total-summary">${globalThis.equipmentTotalSummaryText(g)}</p>${globalThis.equipmentAttributeDetailsHTML(g)}<div class="actions">${eligibleWearers(g).map(h=>`<button class="primary" onclick="previewEquip('${g.id}',${h.job})" ${h.equipped.includes(g.id)?'disabled':''}>${h.equipped.includes(g.id)?esc(characterName(h))+'已穿戴':'給'+esc(characterName(h))+'穿戴'}</button>`).join('')||'<span class="small">尚無可穿戴角色（需 '+CLASSES[g.job].name+' LV'+(gearRequiredLevelByTier(g.tier))+'）</span>'}<button onclick="enhance('${g.id}')" ${g.plus>=RULES.enhanceMax||!canEnhance(g)?'disabled':''}>${g.plus>=RULES.enhanceMax?'已達 +'+RULES.enhanceMax:'強化 +'+(g.plus+1)+'／'+upgradeCostText(g)}</button><button onclick="reroll('${g.id}')" ${(()=>{const c=rerollCostFor(g);return draft||state.gold<c.gold||state.ore<c.ore;})()?'disabled':''}>洗鍊／${rerollCostFor(g).gold} 金幣＋${rerollCostFor(g).ore} 鍛鐵</button><button onclick="toggleGearLock('${g.id}')">${locked?'解除鎖定':'鎖定'}</button><button onclick="salvage('${g.id}')" ${worn||draft||locked?'disabled':''}>分解</button>${receiver?`<button onclick="transferGear('${g.id}',${receiver.job})" ${worn||draft?'disabled':''}>交給${esc(characterName(receiver))}</button>`:''}</div></div>${inlineAffixComparison(g)}</article>`;}).join('')||'<p>沒有符合篩選的裝備。</p>'}</div></section>`;}
equipmentView=function(){return singlePagePanel('equipment','裝備背包',inlineInventoryView);};
forgeView=function(){return singlePagePanel('forge','裝備強化與洗鍊',()=>{const html=memberForgeView();const g=findGear(forgeSelection);return html+(g?inlineAffixComparison(g):'');});};
const inlineSafeSalvageAll=salvageAll;
salvageAll=function(){if([...inlineAffixDrafts.keys()].some(k=>k.startsWith(state.job+':')))return toast('請先確認本角色尚未決定的洗鍊結果');inlineSafeSalvageAll();};

function ensureSharedGear(){if(!party)return;if(!party.sharedGear)Object.defineProperty(party,'sharedGear',{value:{items:[],linked:new Set()},enumerable:false});const shared=party.sharedGear;for(const h of party.members){if(shared.linked.has(h))continue;const ids=new Set(shared.items.map(g=>g.id));for(const g of h.bag){if(!ids.has(g.id)){shared.items.push(g);ids.add(g.id);}}Object.defineProperty(h,'bag',{enumerable:true,configurable:true,get:()=>shared.items,set:v=>{shared.items=v;}});shared.linked.add(h);}}
function gearWearer(id){return party.members.find(h=>h.equipped.includes(id));}
function eligibleWearers(g){return party.members.filter(h=>gearWearableJobs(g).includes(h.job)&&h.lv>=gearRequiredLevelByTier(g.tier));}
function equipSharedGear(id,job,position=null){ensureSharedGear();const g=party.sharedGear.items.find(g=>g.id===id),h=party.members.find(h=>h.job===job);if(!g||!h||!eligibleWearers(g).includes(h))return;const positions=gearEquipPositions(g);let target=Number.isInteger(position)&&positions.includes(position)?position:positions.find(p=>!h.equipped[p]);if(target===undefined)target=positions[0];if(target===undefined)return;for(const member of party.members)member.equipped=member.equipped.map(x=>x===id?null:x);while(h.equipped.length<5)h.equipped.push(null);h.equipped[target]=id;for(const member of party.members)withHero(member,clampVitals);save();render();}
equipGear=function(id){equipSharedGear(id,state.job);};
const sharedGearPack=packParty;
packParty=function(){ensureSharedGear();const data=sharedGearPack();const equipped=new Set(party.members.flatMap(h=>h.equipped).filter(Boolean));return {...data,members:data.members.map((h,i)=>({...h,bag:party.sharedGear.items.filter(g=>h.equipped.includes(g.id)||(i===0&&!equipped.has(g.id)))}))};};
const sharedGearRender=render;render=function(){ensureSharedGear();sharedGearRender();};
affixDraftKey=function(g){return 'shared:'+g.id;};
const sharedGearSalvage=salvage;
salvage=function(id){const g=findGear(id);if(g?.locked)return toast('鎖定中的裝備不能分解');if(gearWearer(id)||inlineAffixDrafts.has('shared:'+id))return toast('已穿戴或等待洗鍊確認的裝備不能分解');sharedGearSalvage(id);pruneGearSelections();};
salvageAll=function(){const targets=state.bag.filter(g=>g.rar===0&&g.plus===0&&!g.affix.length&&g.boss===undefined&&!gearWearer(g.id)&&!inlineAffixDrafts.has('shared:'+g.id));const ids=new Set(targets.map(g=>g.id));for(const g of targets){state.ore+=g.tier*3;state.dust++;}state.bag=state.bag.filter(g=>!ids.has(g.id));pruneGearSelections();save();render();toast('已分解 '+ids.size+' 件未養成普通裝備');};
transferGear=function(){toast('裝備已由全隊共用，不需要轉交');};
equipmentView=function(){ensureSharedGear();if(filters.job==='own')filters.job='all';const h=pageHero('equipment');return heading('SHARED INVENTORY / 全隊共用','裝備背包',`<span class="tag">${h.bag.length} / ${RULES.bagCapacity} 件</span>`)+`<div class="shared-maintenance"><label>強化／洗鍊付款與分解材料歸屬 <select onchange="selectPageHero('equipment',Number(this.value))">${party.members.map(x=>`<option value="${x.job}" ${x===h?'selected':''}>${esc(characterName(x))}</option>`).join('')}</select></label><span class="small">穿戴按鈕僅列出符合職業與等級的角色。</span></div><section class="panel page-owner-panel"><div class="page-owner-content">${withHero(h,()=>ownerControls(inlineInventoryView(),h.job))}</div></section>`;};

function ensureAccountResources(){if(!party)return;if(!party.accountResources)Object.defineProperty(party,'accountResources',{value:{gold:0,ore:0,dust:0,gems:[0,0,0],materials:{},linked:new Set()},enumerable:false});const r=party.accountResources;for(const h of party.members){if(r.linked.has(h))continue;for(const k of ['gold','ore','dust'])r[k]+=h[k]||0;h.gems.forEach((n,i)=>r.gems[i]+=n);for(const [k,n] of Object.entries(h.materials))r.materials[k]=(r.materials[k]||0)+n;for(const k of ['gold','ore','dust','gems','materials'])Object.defineProperty(h,k,{enumerable:true,configurable:true,get:()=>r[k],set:v=>{r[k]=v;}});r.linked.add(h);}}
const beforeAccountPack=packParty;packParty=function(){ensureAccountResources();const data=beforeAccountPack();return {...data,members:data.members.map((h,i)=>({...h,gold:i===0?h.gold:0,ore:i===0?h.ore:0,dust:i===0?h.dust:0,gems:i===0?[...h.gems]:[0,0,0],materials:i===0?{...h.materials}:{}}))};};
const beforeAccountRender=render;render=function(){ensureAccountResources();beforeAccountRender();};
function armorProfile(){return null;}
const beforeArmorStats=stats;stats=function(h=state){const v=beforeArmorStats(h);for(const g of equipment(h)){const p=armorProfile(g);if(p)for(const k of ['hp','def','crit','evasion'])v[k]=(v[k]||0)+(p[k]||0);}v.crit=Math.min(.85,v.crit);v.evasion=Math.min(.45,v.evasion);v.speed=Math.round([102,108,116,96][h.job]+h.lv*.5+Math.min(5,v.evasion*10+v.crit*5));return v;};solo.stats=stats;
const beforeArmorDesc=gearDesc;gearDesc=function(g){const p=armorProfile(g);return beforeArmorDesc(g)+(p?' / '+p.name+'加成：'+Object.entries(p).filter(([k])=>k!=='name').map(([k,v])=>({hp:'生命',def:'防禦',crit:'暴擊率',evasion:'閃避率'}[k])+' +'+(['crit','evasion'].includes(k)?+(v*100).toFixed(1)+'%':v)).join('、'):'');};
const beforeArmorAffixLabel=affixLabel;affixLabel=function(a,g){return (g.slot===1&&[4,5].includes(a.type)?CLASSES[g.job].name+'專屬 · ':'')+beforeArmorAffixLabel(a,g);};
equipmentView=function(){ensureSharedGear();if(filters.job==='own')filters.job='all';const h=pageHero('equipment');return heading('ACCOUNT INVENTORY / 帳號共用','裝備背包',`<span class="tag">${h.bag.length} / ${RULES.bagCapacity} 件</span>`)+`${uiHelp('裝備規則','背包與資源共用。每件裝備依可穿戴職業設定判定；每名角色可裝備 1 件副手與 2 件飾品。')}<section class="panel page-owner-panel"><div class="page-owner-content">${withHero(h,()=>ownerControls(inlineInventoryView(),h.job))}</div></section>`;};
const accountShopView=shopView;shopView=function(){return accountShopView().replace('使用對象／付款角色：','道具使用對象：').replace('購買由上方角色付款，使用效果只施加到該角色；寶石及製作材料仍各自持有。','購買扣除帳號金幣，使用效果只施加到選取角色；寶石與製作材料也由帳號共用。');};

function equipmentComparison(h,g,position=null){const afterHero={...h,equipped:[...h.equipped]};while(afterHero.equipped.length<5)afterHero.equipped.push(null);const positions=gearEquipPositions(g);let target=Number.isInteger(position)&&positions.includes(position)?position:positions.find(p=>!afterHero.equipped[p]);if(target===undefined)target=positions[0];afterHero.equipped[target]=g.id;const before=stats(h),after=stats(afterHero),rows=[];
 const labels={hp:'生命上限',atk:'攻擊力',def:'防禦力',crit:'暴擊率',critDamage:'暴擊傷害',pierce:'防禦穿透',lifesteal:'生命竊取',evasion:'閃避率',elementBonus:'全屬性增傷',speed:'速度'};
 const percent=new Set(['crit','critDamage','pierce','lifesteal','evasion','elementBonus']);
 function add(label,a,b,isPercent=false,lowerBetter=false){const factor=isPercent?100:1;a=Number(((a||0)*factor).toFixed(2));b=Number(((b||0)*factor).toFixed(2));if(a===b)return;const d=Number((b-a).toFixed(2));rows.push({label,before:a,after:b,delta:d,percent:isPercent,good:lowerBetter?d<0:d>0});}
 for(const [key,label] of Object.entries(labels))add(label,before[key],after[key],percent.has(key));
 for(const key of ['elementDamage','raceDamage','resist'])for(const type of new Set([...Object.keys(before[key]||{}),...Object.keys(after[key]||{})]))add((key==='raceDamage'?RACES[type]:ELEMENTS[type])+' '+({elementDamage:'傷害',raceDamage:'種族增傷',resist:'抗性'}[key]),before[key]?.[type],after[key]?.[type],true);
 for(let i=0;i<6;i++){const skill=CLASSES[h.job].skills[i];if(!h.skills[i])continue;add(skill[0]+' 威力倍率',skillPower(i,h),skillPower(i,afterHero));if(skill[1]==='active')add(skill[0]+' 冷卻',skillCooldown(i,h),skillCooldown(i,afterHero),false,true);else add(skill[0]+' 觸發率',procChance(i,h),procChance(i,afterHero),true);}
 return rows;
}
function previewEquip(id,job,position=null){const h=party.members.find(h=>h.job===job),g=state.bag.find(g=>g.id===id);if(!h||!g||!eligibleWearers(g).includes(h))return;const positions=gearEquipPositions(g);while(h.equipped.length<5)h.equipped.push(null);if(g.slot===3&&position===null&&positions.every(p=>h.equipped[p]&&h.equipped[p]!==id)){$('modal').innerHTML=`<h2>${esc(characterName(h))} · 選擇飾品欄位</h2><p>兩個飾品欄位都已裝備物品，請選擇要替換哪一格。</p><div class="actions">${positions.map(p=>{const current=h.bag.find(x=>x.id===h.equipped[p]);return `<button onclick="previewEquip('${id}',${job},${p})">替換 ${EQUIP_POSITION_NAMES[p]}${current?' · '+esc(equipmentDisplayName(current)):''}</button>`;}).join('')}<button onclick="closeModal()">取消</button></div>`;$('modal').showModal();return;}let target=Number.isInteger(position)&&positions.includes(position)?position:positions.find(p=>!h.equipped[p]||h.equipped[p]===id);if(target===undefined)target=positions[0];const current=h.bag.find(x=>x.id===h.equipped[target]);if(!current){equipSharedGear(id,job,target);return;}if(current.id===id)return;const rows=equipmentComparison(h,g,target),wearer=gearWearer(id);$('modal').innerHTML=`<h2>${esc(characterName(h))} · 換裝比較</h2><div class="equip-compare-grid">${[[current,'目前穿戴'],[g,'準備穿戴']].map(([item,label])=>`<section><h3>${label}</h3><b>${equipmentNameHTML(item)}</b><p class="equipment-total-summary">${globalThis.equipmentTotalSummaryText(item)}</p>${globalThis.equipmentAttributeDetailsHTML(item)}</section>`).join('')}</div>${wearer&&wearer!==h?`<p class="gold">這件裝備目前由 ${esc(characterName(wearer))} 穿戴，確認後會轉移給 ${esc(characterName(h))}。</p>`:''}<h3>角色能力變化</h3><table class="equip-delta-table"><thead><tr><th>能力</th><th>目前</th><th>穿戴後</th><th>差異</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.label)}</td><td>${r.before}${r.percent?'%':''}</td><td>${r.after}${r.percent?'%':''}</td><td class="${r.good?'delta-up':'delta-down'}">${r.delta>0?'+':''}${r.delta}${r.percent?' 百分點':''}</td></tr>`).join('')||'<tr><td colspan="4">數值無變化</td></tr>'}</tbody></table><p class="small">僅列出有變化的能力；未學技能的詞條請見裝備說明。</p><div class="actions"><button class="primary" onclick="confirmEquipComparison('${id}',${job},${target})">確認穿戴</button><button onclick="closeModal()">取消</button></div>`;$('modal').showModal();}
function confirmEquipComparison(id,job,position=null){closeModal();equipSharedGear(id,job,position);}

function forgeEquipmentOptions(selectedId){const worn=[],spare=[];for(const g of state.bag)(gearWearer(g.id)?worn:spare).push(g);worn.sort((a,b)=>gearWearer(a.id).job-gearWearer(b.id).job||a.slot-b.slot);const option=g=>{const wearer=gearWearer(g.id);return `<option value="${g.id}" ${g.id===selectedId?'selected':''}>${wearer?'【'+esc(characterName(wearer))+'穿戴】':'【'+gearWearableJobsText(g)+'】'} ${esc(equipmentDisplayName(g))} · ${RARITY[g.rar]}</option>`;};return (worn.length?`<optgroup label="全隊已穿戴（${worn.length}）">${worn.map(option).join('')}</optgroup>`:'')+(spare.length?`<optgroup label="未穿戴（${spare.length}）">${spare.map(option).join('')}</optgroup>`:'');}
function wornEquipmentView(){return heading('PARTY EQUIPMENT / 穿戴總覽','已穿戴裝備',`<span class="tag">${party.members.length} 位角色</span>`)+`<div class="worn-overview">${party.members.map(h=>`<section class="panel worn-member"><div class="row"><h2>${esc(characterName(h))}</h2><span class="small">${CLASSES[h.job].name} · LV ${h.lv} · ${party.active.includes(h.job)?'出戰':'候補'}</span></div>${[0,1,2,3,4].map(position=>{const g=h.bag.find(x=>x.id===h.equipped[position]);return `<article class="worn-slot"><div class="worn-slot-head"><b class="slot-label">${EQUIP_POSITION_NAMES[position]}</b>${g?`<span>${equipmentNameHTML(g)}</span><button onclick="heroMenuAction(${h.job},()=>openForge('${g.id}'))">強化／洗鍊</button>`:'<span class="small">未穿戴</span>'}</div>${g?`<p class="small equipment-total-summary">${globalThis.equipmentTotalSummaryText(g)}</p>${globalThis.equipmentAttributeDetailsHTML(g)}`:''}</article>`;}).join('')}</section>`).join('')}</div>`;}

// Audit boundary: validate persistent shared data before replacing any live session.
function validateAffixList(list){
 if(!Array.isArray(list)||list.length>2)throw Error('待確認詞條數量無效');
 for(const a of list){if(!a||typeof a!=='object'||Array.isArray(a)||!Number.isInteger(a.type)||a.type<0||a.type>18||!Number.isInteger(a.rank)||a.rank<0||a.rank>3||!Number.isFinite(a.value)||a.value<0||a.value>RULES.affixMax||[4,5].includes(a.type)&&(!Number.isInteger(a.skill)||a.skill<0||a.skill>5)||[12,14].includes(a.type)&&!['fire','ice','wind','light','shadow'].includes(a.element)||a.type===13&&!Object.keys(RACES).includes(a.race))throw Error('待確認詞條資料無效');}
 return JSON.parse(JSON.stringify(list));
}
function restorePendingAffixes(data={}){inlineAffixDrafts.clear();for(const [id,list] of Object.entries(data))inlineAffixDrafts.set('shared:'+id,list);}
function pruneGearSelections(){const ids=new Set(state.bag.map(g=>g.id));if(!ids.has(forgeSelection))forgeSelection=null;for(const [job,id] of teamForgeSelection)if(!ids.has(id))teamForgeSelection.delete(job);}
const auditValidateParty=validateParty;
validateParty=function(data){
 const result=auditValidateParty(data),ids=new Set(),worn=new Set();
 for(const h of result.members){for(const g of h.bag){if(ids.has(g.id))throw Error('不同角色背包具有重複裝備 ID，請使用未損壞的備份');ids.add(g.id);}for(const id of h.equipped.filter(Boolean)){if(worn.has(id))throw Error('同一裝備不能由多人穿戴');worn.add(id);}}
 if(ids.size>RULES.bagCapacity)throw Error('共用背包超過容量');
 for(const key of ['gold','ore','dust','potions'])if(!Number.isSafeInteger(result.members.reduce((n,h)=>n+h[key],0))||result.members.reduce((n,h)=>n+h[key],0)>1e12)throw Error('帳號資源超出可保存範圍');
 for(let i=0;i<3;i++)if(result.members.reduce((n,h)=>n+h.gems[i],0)>1e9)throw Error('帳號寶石超出可保存範圍');
 for(const [field,limit] of [['materials',1e9],['consumables',1e6]]){const totals=new Map();for(const h of result.members)for(const [k,n] of Object.entries(h[field]))totals.set(k,(totals.get(k)||0)+n);if([...totals.values()].some(n=>n>limit))throw Error('帳號物品超出可保存範圍');}
 const pending=data.pendingAffixes??{};if(!pending||typeof pending!=='object'||Array.isArray(pending)||Object.keys(pending).length>RULES.bagCapacity)throw Error('待確認洗鍊資料無效');
 result.pendingAffixes={};for(const [id,list] of Object.entries(pending)){if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||['__proto__','constructor','prototype'].includes(id))throw Error('待確認裝備 ID 無效');const affixes=validateAffixList(list);if(ids.has(id)){if(result.members.some(h=>h.bag.some(g=>g.id===id&&g.affixLock!==undefined)))throw Error('待確認裝備不能另設潛能鎖定');result.pendingAffixes[id]=affixes;}}
 return result;
};
const auditPackParty=packParty;
packParty=function(){const data=auditPackParty(),ids=new Set(party.sharedGear.items.map(g=>g.id));const pendingAffixes={};for(const [key,list] of inlineAffixDrafts){const id=key.slice(7);if(ids.has(id))pendingAffixes[id]=list;}return {...data,pendingAffixes};};

// Presentation metadata only. New mechanics must be implemented in combat before
// supplying metadata here; names/elements never imply AoE, casting or control.
const SKILL_CONTROL_LABELS=Object.freeze({stun:'暈眩',freeze:'冰凍',silence:'沉默',root:'定身'});
const SKILL_STATUS_LABELS=Object.freeze({...SKILL_CONTROL_LABELS,burn:'燃燒',poison:'中毒'});
const SKILL_TYPE_RULES=[
 {id:'trigger',label:'觸發',match:m=>m.activation==='proc'},
 {id:'instant',label:'瞬發',match:m=>!['passive','proc'].includes(m.activation)&&!(m.castTimeSeconds>0)},
 {id:'cast',label:'吟唱',match:m=>m.castTimeSeconds>0},
 {id:'burst',label:'爆發',match:m=>m.delivery==='burst'},
 {id:'duration',label:'持續',match:m=>m.effects.some(e=>e.durationSeconds>0||e.periodic)},
 {id:'area',label:'範圍',match:m=>['allies','enemies','area'].includes(m.target)||m.maxTargets>1},
 {id:'control',label:'控制',match:m=>m.effects.some(e=>Object.hasOwn(SKILL_CONTROL_LABELS,e.kind))},
 {id:'support',label:'輔助',match:m=>m.effects.some(e=>['buff','debuff'].includes(e.kind))},
 {id:'heal',label:'治療',match:m=>m.effects.some(e=>['heal','drain','regen'].includes(e.kind))},
 {id:'shield',label:'護盾',match:m=>m.effects.some(e=>e.kind==='shield')},
 {id:'passive',label:'被動',match:m=>m.activation==='passive'}
];
function skillMechanics(job,index,group='core'){
 const sk=group==='support'?SUPPORT[job]?.[index]:CLASSES[job]?.skills?.[index];
 if(!sk)return {activation:'active',castTimeSeconds:0,target:'enemy',maxTargets:1,effects:[]};
 if(group==='support'){
  const meta=sk.mechanics&&typeof sk.mechanics==='object'&&!Array.isArray(sk.mechanics)?sk.mechanics:{};
  const fallbackEffects=[{kind:['fracture','weaken','vulnerable'].includes(sk.kind)?'debuff':'buff',durationSeconds:sk.duration},...(sk.kind==='regen'?[{kind:'regen',periodic:true,durationSeconds:sk.duration}]:[])];
  return {...meta,activation:meta.activation??'active',castTimeSeconds:Number(meta.castTimeSeconds)||0,target:meta.target??sk.target,maxTargets:Math.max(1,Number(meta.maxTargets)||1),effects:Array.isArray(meta.effects)?meta.effects:fallbackEffects};
 }
 const meta=sk[6]&&typeof sk[6]==='object'&&!Array.isArray(sk[6])?sk[6]:{};
 return {...meta,activation:meta.activation??sk[1],castTimeSeconds:Number(meta.castTimeSeconds)||0,target:meta.target??(sk[5]==='heal'?'weakest':sk[5]==='shield'?'self':'enemy'),maxTargets:Math.max(1,Number(meta.maxTargets)||1),effects:Array.isArray(meta.effects)?meta.effects:[{kind:sk[5]}]};
}
function skillTypeTags(mechanics){
 const tags=SKILL_TYPE_RULES.filter(rule=>rule.match(mechanics)).map(({id,label})=>({id,label}));
 const secondary=[...new Set(mechanics.effects.map(e=>e.kind))].filter(kind=>Object.hasOwn(SKILL_STATUS_LABELS,kind)).slice(0,2);
 return [...tags,...secondary.map(id=>({id,label:SKILL_STATUS_LABELS[id],secondary:true}))];
}
function skillTypeBadges(job,index,group='core'){
 return `<span class="skill-type-tags" aria-label="技能類型">${skillTypeTags(skillMechanics(job,index,group)).map(tag=>`<span class="skill-type-tag${tag.secondary?' skill-type-secondary':''}">【${esc(tag.label)}】</span>`).join('')}</span>`;
}
function skillMechanicsDetails(job,index,group='core'){
 const m=skillMechanics(job,index,group),details=[],timeUnit='戰鬥回合';
 if(m.castTimeSeconds>0)details.push('吟唱時間：'+m.castTimeSeconds+' '+timeUnit);
 for(const effect of m.effects)if(Object.hasOwn(SKILL_CONTROL_LABELS,effect.kind))details.push('控制效果：'+SKILL_CONTROL_LABELS[effect.kind]+' · 持續 '+effect.durationSeconds+' '+timeUnit);
 return details.length?`<p class="skill-mechanics-details">${details.map(esc).join('<br>')}</p>`:'';
}

// Account-wide rare consumable; drop rates do not scale with difficulty.
function radiantDropChance(kind){
 if(kind==='boss'||kind==='final')return 0.01;
 if(kind==='normal'||kind==='elite')return 0.0005;
 return 0;
}
function setAffixLock(id,value){
 const g=findGear(id),index=Number(value);if(!g||inlineAffixDrafts.has(affixDraftKey(g)))return;
 if(!Number.isInteger(index)||index< -1||index>=g.affix.length)return;
 const old=g.affixLock;if(index===-1)delete g.affixLock;else g.affixLock=index;
 if(!save()){if(old===undefined)delete g.affixLock;else g.affixLock=old;}render();
}
function affixLockControls(g){
 if(!g.affix.length)return '';
 return `<div class="affix-lock-controls"><label>下次洗鍊鎖定潛能 <select aria-label="${esc(equipmentDisplayName(g))}鎖定潛能" onchange="setAffixLock('${g.id}',this.value)"><option value="-1" ${g.affixLock===undefined?'selected':''}>不鎖定</option>${g.affix.map((a,i)=>`<option value="${i}" ${g.affixLock===i?'selected':''}>第 ${i+1} 條 · ${esc(AFFIX_RANK[a.rank])} · ${esc(affixLabel(a,g))}</option>`).join('')}</select></label><span class="small">共用光輝碎塊：${state.materials['光輝碎塊']||0}。洗鍊時消耗 1 個，保留指定潛能的品質與數值；僅生效一次。保留原詞條不退還碎塊。</span></div>`;
}

// Update 07: account testing supplies, grouped expeditions and tiered forging.
const TEST_CODES=Object.freeze({
 '781206':{name:'所有測試用道具'}
});
function showTestCodes(){if(!party)return;$('modal').innerHTML=`<h2>兌換碼</h2><label>兌換碼 <input id="test-code-input" maxlength="40" autocomplete="off" placeholder="輸入兌換碼" onkeydown="if(event.key==='Enter')redeemTestCode()"></label><button onclick="redeemTestCode()">兌換</button><button onclick="closeModal()">關閉</button>`;$('modal').showModal();}
function redeemTestCode(value){if(!party)return;const code=String(value??$('test-code-input')?.value??'').trim();if(code!=='781206')return toast('兌換碼無效');const prior={gold:state.gold,ore:state.ore,dust:state.dust,materials:{...state.materials}};state.gold+=999999;state.ore+=999;state.dust+=999;state.materials['以太鍛鐵']=(state.materials['以太鍛鐵']||0)+999;state.materials['升級卷軸']=(state.materials['升級卷軸']||0)+99;state.materials['光輝碎塊']=(state.materials['光輝碎塊']||0)+99;if(state.gold>1e12||state.ore>1e12||state.dust>1e12||Object.values(state.materials).some(n=>n>1e9)){state.gold=prior.gold;state.ore=prior.ore;state.dust=prior.dust;state.materials=prior.materials;return toast('資源已達保存上限');}if(!save()){state.gold=prior.gold;state.ore=prior.ore;state.dust=prior.dust;state.materials=prior.materials;return;}render();toast('已獲得所有測試用道具');}
function useLevelScroll(job){const h=party?.members.find(h=>h.job===job);if(!h)return;const count=state.materials['升級卷軸']||0;if(!count)return toast('沒有升級卷軸');if(h.lv>=levelCap(h))return toast(h.lv>=60?'已達60級':'需先擊敗最終BOSS解鎖等級上限');if(running||roundIterator)return toast('請先結束當前遭遇再使用升級卷軸');
 const old={lv:h.lv,xp:h.xp,ap:h.ap,sp:h.sp,hp:h.hp,won:h.won};withHero(h,()=>awardXP(Math.max(0,need(h.lv)-h.xp)));if(party.cleared&&h.lv>=GS('progression.levelCaps.beforeClear',30))h.won=true;state.materials['升級卷軸']=count-1;if(!save()){Object.assign(h,old);state.materials['升級卷軸']=count;}render();
}
function upgradeMaterials(g){const next=g.plus+1;return {ore:enhanceCost(g),dust:next>=6?g.tier*(next-5):0,ether:next>=10?1:0};}
function upgradeCostText(g){const c=upgradeMaterials(g);return c.ore+' 鍛鐵'+(c.dust?'＋'+c.dust+' 粉塵':'')+(c.ether?'＋'+c.ether+' 以太鍛鐵':'');}
function canEnhance(g){const c=upgradeMaterials(g);return g.plus<RULES.enhanceMax&&state.ore>=c.ore&&state.dust>=c.dust&&(state.materials['以太鍛鐵']||0)>=c.ether;}
enhance=function(id){const g=findGear(id);if(!g||g.plus>=RULES.enhanceMax)return;if(!canEnhance(g))return toast('材料不足：'+upgradeCostText(g));const c=upgradeMaterials(g),ether=state.materials['以太鍛鐵'];state.ore-=c.ore;state.dust-=c.dust;if(c.ether)state.materials['以太鍛鐵']=ether-c.ether;g.plus++;if(!save()){g.plus--;state.ore+=c.ore;state.dust+=c.dust;if(c.ether)state.materials['以太鍛鐵']=ether;return;}render();toast('已強化至 +'+g.plus);};
function etherDropChance(e){
 if(e.kind==='elite')return Math.min(0.30,0.05+0.02*(regionTier(e.region??party.map)-1));
 if(e.kind==='boss'||e.kind==='final')return 0.05;
 return 0;
}
function awardEther(e){if(!party)return;let n=0;const boss=e.kind==='boss'||e.kind==='final',key=(e.region??party.map)+':'+(e.difficulty||0);party.etherBossClaims??=[];if(boss&&!party.etherBossClaims.includes(key)){n=1+rand(2);party.etherBossClaims.push(key);}else if(Math.random()<etherDropChance(e))n=1;if(n){state.materials['以太鍛鐵']=(state.materials['以太鍛鐵']||0)+n;note('獲得以太鍛鐵 ×'+n);}}
let inventoryCategory='equipment',massSalvageIds=null;
function setInventoryCategory(category){if(!['equipment','materials','items','gems'].includes(category))return;inventoryCategory=category;render();}
function inventoryTabs(){return `<div class="actions inventory-category-tabs">${[['equipment','裝備'],['materials','材料'],['gems','寶石']].map(([id,name])=>`<button class="${inventoryCategory===id?'primary':''}" onclick="setInventoryCategory('${id}')">${name}</button>`).join('')}<button onclick="showTestCodes()">兌換碼</button></div>`;}
function accountMaterialsView(){const entries=[['鍛鐵',state.ore],['粉塵',state.dust],['以太鍛鐵',state.materials['以太鍛鐵']||0],...Object.entries(state.materials).filter(([k,n])=>k!=='以太鍛鐵'&&n>0)];return heading('MATERIALS / 帳號共用','材料庫存')+`<section class="panel account-material-list">${entries.map(([name,n])=>`<div class="row"><b>${esc(name)}</b><span>× ${n.toLocaleString()}</span></div>`).join('')}<p class="small">升級卷軸：每個升1級；目前上限30級，通關後60級。請先結束當前遭遇。</p><div class="actions">${party.members.map(h=>`<button onclick="useLevelScroll(${h.job})" ${!(state.materials['升級卷軸']>0)||h.lv>=levelCap(h)?'disabled':''}>對${esc(characterName(h))}使用 · LV${h.lv}</button>`).join('')}</div></section>`;}
function accountGemsView(){return heading('GEMS / 帳號共用','技能寶石')+`<section class="panel account-gem-list">${GEMS.map((g,i)=>`<div class="row"><b>${esc(g.name)} ×${state.gems[i]}</b><span>${esc(g.desc)}</span></div>`).join('')}<div class="actions"><button onclick="craftGem()" ${state.dust<GS('skills.gems.craftDust',12)?'disabled':''}>合成隨機寶石 · ${Math.round(GS('skills.gems.craftDust',12))} 粉塵</button><button onclick="setTab('skills')">前往技能鑲嵌</button></div></section>`;}
const categoriesEquipmentView=equipmentView;equipmentView=function(){return inventoryTabs()+(inventoryCategory==='materials'?accountMaterialsView():inventoryCategory==='gems'?accountGemsView():categoriesEquipmentView());};
function toggleGearLock(id){const g=findGear(id);if(!g)return;g.locked=!g.locked;if(!save()){g.locked=!g.locked;return;}render();toast(g.locked?'已鎖定 '+equipmentDisplayName(g):'已解除鎖定 '+equipmentDisplayName(g));}
function bulkSalvageControls(){return `<div class="small">分解範圍：全部背包（不受篩選影響）</div><div class="actions bulk-salvage-actions">${RARITY.map((name,rar)=>`<button onclick="requestMassSalvage(${rar})">分解所有${name}</button>`).join('')}</div>${uiHelp('分解規則','已鎖定、已穿戴、待確認洗鍊的裝備不會分解。含強化、潛能或 BOSS 裝備時會再次確認。')}`;}
function massSalvageTargets(ids){return state.bag.filter(g=>ids.includes(g.id)&&!g.locked&&!gearWearer(g.id)&&!inlineAffixDrafts.has(affixDraftKey(g)));}
function requestMassSalvage(rar){if(!Number.isInteger(rar)||rar<0||rar>3)return;const items=massSalvageTargets(state.bag.filter(g=>g.rar===rar).map(g=>g.id));if(!items.length)return toast('沒有可分解的'+RARITY[rar]+'裝備');massSalvageIds=items.map(g=>g.id);if(items.some(g=>g.plus>0||g.rerolled||g.affix.length||g.boss!==undefined)){$('modal').innerHTML=`<h2>再次確認批次分解</h2><p>將分解 ${items.length} 件${RARITY[rar]}裝備，包含強化、潛能或BOSS裝備。分解後無法復原。</p><div class="mass-salvage-list">${items.map(g=>`<p>${equipmentNameHTML(g)}</p>`).join('')}</div><button class="danger" onclick="confirmMassSalvage()">確認全部分解</button><button onclick="massSalvageIds=null;closeModal()">取消</button>`;$('modal').showModal();}else confirmMassSalvage();}
function confirmMassSalvage(){if(!massSalvageIds)return;const items=massSalvageTargets(massSalvageIds),ids=new Set(items.map(g=>g.id)),bag=state.bag,ore=state.ore,dust=state.dust;for(const g of items){state.ore+=g.tier*(3+g.rar*2+g.plus);state.dust+=1+g.rar;}state.bag=state.bag.filter(g=>!ids.has(g.id));if(!save()){state.bag=bag;state.ore=ore;state.dust=dust;return;}massSalvageIds=null;pruneGearSelections();closeModal();render();toast('已分解 '+items.length+' 件裝備');}
const update07ValidateParty=validateParty;validateParty=function(data){const p=update07ValidateParty(data);p.encounterMode='group';const claims=data.etherBossClaims??[];if(!Array.isArray(claims)||claims.length>MAPS.length*3||new Set(claims).size!==claims.length||claims.some(k=>typeof k!=='string'||!/^\d+:[012]$/.test(k)||!MAPS[Number(k.split(':')[0])]))throw Error('以太鍛鐵首領紀錄無效');p.etherBossClaims=[...claims];return p;};
const testShopView=shopView;shopView=function(){return `<div class="actions"><button onclick="showTestCodes()">兌換碼</button></div>`+testShopView();};

// Compact skill lists keep owner-bound controls and all existing skill mechanics.
let skillPanel='active';
function setSkillPanel(panel){if(!['active','proc','support'].includes(panel))return;skillPanel=panel;render();}
function clearActiveSkill(slot){if(![0,1].includes(slot))return;state.active[slot]=null;save();render();}
function coreSkillRows(){const activeSlots=Array.from({length:2},(_,i)=>state.active?.[i]??null);return `<div class="actions active-slot-summary">${activeSlots.map((id,i)=>`<span>槽 ${i+1}：${id===null?'未配置':esc(CLASSES[state.job].skills[id]?.[0]||'未知技能')+(id!==null?skillTypeBadges(state.job,id):'')} <button onclick="clearActiveSkill(${i})">清空</button></span>`).join('')}</div><div class="skill-list">${CLASSES[state.job].skills.map((sk,i)=>{const locked=state.lv<sk[2]||(i>=4&&!state.advanced),gem=state.sockets[i];return `<article class="skill-list-row"><div><div class="skill-list-title"><b>${esc(sk[0])}</b><span>Lv.${state.skills[i]}/${RULES.skillMax}</span><span>${sk[1]==='proc'?'普攻觸發':'主動'}</span></div>${skillTypeBadges(state.job,i)}${skillMechanicsDetails(state.job,i)}<p>${skillDescription(i)}</p><p>${sk[1]==='active'?'冷卻 '+skillCooldown(i)+' 回合':'普攻觸發率 '+Math.round(procChance(i)*100)+'%'} · 需求 LV${sk[2]}${i>=4?'／二轉':''}</p></div><div class="skill-list-controls"><button onclick="learn(${i})" ${locked||state.sp<1||state.skills[i]>=skillCap()?'disabled':''}>${locked?'尚未解鎖':state.skills[i]?'升級1點':'學習'}</button>${sk[1]==='active'?[0,1].map(slot=>`<button onclick="equipSkill(${i},${slot})" ${!state.skills[i]?'disabled':''}>${state.active[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join(''):'<span>需配置於觸發槽</span>'}<label>寶石 <select aria-label="${esc(sk[0])}寶石" onchange="socket(${i},this.value)" ${!state.skills[i]?'disabled':''}><option value="-1" ${gem===null?'selected':''}>不鑲嵌</option>${GEMS.map((g,j)=>`<option value="${j}" ${gem===j?'selected':''} ${state.gems[j]<1&&gem!==j?'disabled':''}>${esc(g.name)} ×${state.gems[j]} · ${esc(g.desc)}</option>`).join('')}</select></label></div></article>`;}).join('')}</div>`;}
function supportSkillRows(){return `<div class="actions">${state.supportSlots.map((id,i)=>`<span>槽 ${i+1}：${id===null?'未配置':esc(SUPPORT[state.job][id].name)+skillTypeBadges(state.job,id,'support')} <button onclick="slotSupport(null,${i})">清空</button></span>`).join('')}</div><div class="skill-list">${SUPPORT[state.job].map((sk,i)=>`<article class="skill-list-row"><div><div class="skill-list-title"><b>${esc(sk.name)}</b><span>Lv.${state.supportLevels[i]}/${Math.max(1,Math.floor(GS('skills.support.maxLevel',5)))}</span><span>${ELEMENTS[sk.element]}</span></div>${skillTypeBadges(state.job,i,'support')}${skillMechanicsDetails(state.job,i,'support')}<p>${TARGET_NAMES[sk.target]} · ${EFFECT_NAMES[sk.kind]} ${+(sk.value*(1+Math.max(0,state.supportLevels[i]-1)*GS('skills.support.effectPerExtraLevel',.2))*100).toFixed(1)}%</p><p>持續 ${sk.duration} 戰鬥回合／冷卻 ${sk.cooldown} 回合 · 需求 LV${sk.level}${i===2?'／二轉':''}</p></div><div class="skill-list-controls"><button onclick="learnSupport(${i})" ${state.sp<1||state.supportLevels[i]>=Math.max(1,Math.floor(GS('skills.support.maxLevel',5)))||state.lv<sk.level||i===2&&!state.advanced?'disabled':''}>${state.supportLevels[i]?'升級1點':'學習'}</button>${[0,1].map(slot=>`<button onclick="slotSupport(${i},${slot})" ${state.supportLevels[i]?'':'disabled'}>${state.supportSlots[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join('')}</div></article>`).join('')}</div>`;}
skillsView=function(){return singlePagePanel('skills','技能 <span class="skill-rules-help" tabindex="0" aria-label="技能規則說明" data-tooltip="1. 主動技能／輔助技能的冷卻只在該角色自己的回合推進；目前是在自身回合開始先減少 1，再檢查是否可施放，施放當回合不會另外再扣 1。&#10;2. 主動技能不會觸發普攻觸發技能；觸發技能只會在普攻後判定。&#10;3. 輔助技能不消耗原本行動；冷卻結束後會在該角色自己的回合自動施放。">?</span>',()=>`<div class="actions skill-subtabs"><button class="${skillPanel==='active'?'primary':''}" onclick="setSkillPanel('active')">主動技能</button><button class="${skillPanel==='proc'?'primary':''}" onclick="setSkillPanel('proc')">普攻觸發技能</button><button class="${skillPanel==='support'?'primary':''}" onclick="setSkillPanel('support')">輔助技能</button></div>${skillPanel==='active'?coreSkillRows():skillPanel==='proc'?procSkillRows():supportSkillRows()}`);};
// Shared quest accessors retain legacy callers; pack writes the account only once.
function ensureAccountQuests(){if(!party)return;if(!party.accountQuests)Object.defineProperty(party,'accountQuests',{enumerable:false,value:{claimed:[],repeat:0,board:{next:0,serial:0,tasks:[]},linked:new Set()}});const q=party.accountQuests;for(const h of party.members){if(q.linked.has(h))continue;q.claimed=[...new Set([...q.claimed,...h.claimed])];q.repeat+=h.repeat;const b=h.board;if(b){q.board.next=Math.max(q.board.next,b.next);q.board.serial=Math.max(q.board.serial,b.serial);for(const task of b.tasks){const old=q.board.tasks.find(x=>x.id===task.id);if(old)old.done=old.done||task.done;else q.board.tasks.push(task);}}for(const key of ['claimed','repeat','board'])Object.defineProperty(h,key,{enumerable:true,configurable:true,get:()=>q[key],set:value=>{q[key]=value;}});q.linked.add(h);}}
const questAccountPack=packParty;packParty=function(){ensureAccountQuests();const data=questAccountPack();return {...data,members:data.members.map((h,i)=>({...h,claimed:i===0?[...h.claimed]:[],repeat:i===0?h.repeat:0,board:i===0?JSON.parse(JSON.stringify(h.board)):{next:0,serial:0,tasks:[]}}))};};
const questAccountRender=render;render=function(){ensureAccountQuests();questAccountRender();};
buildBoard=function(s=state){ensureAccountQuests();const mi=party.map===6?5:party.map,m=MAPS[mi];s.board.serial++;s.board.next=Date.now()+BOARD_INTERVAL;s.board.tasks=m.mobs.slice(0,3).map(mob=>({id:uid(),map:mi,mat:mob[2],n:8+rand(9)+(regionTier(mi)-1)*2,kind:rand(2)?'gear':'gem',gem:rand(3),slot:rand(4),rar:Math.random()<.2?3:2,job:rand(4),done:false}));};
questView=function(){ensureAccountQuests();ensureBoard();const remaining=Math.max(1,Math.ceil((state.board.next-Date.now())/60000)),mat=MAPS[questRegion()].mobs[0][2];return heading('QUESTS / 帳號共用','任務')+`<section class="panel shared-quests"><div class="row"><span>${remaining} 分鐘內刷新 · 已完成募集 ${state.repeat} 次</span><button onclick="refreshBoard()">刷新委託 · ${boardRefreshCost()} 金幣</button></div>${uiHelp('委託規則','每 20 分鐘刷新 3 張，依當前地圖產生。刷新會替換未交付委託，材料保留。')}<div class="quest-list">${state.board.tasks.map(q=>`<article class="quest-list-row"><div><b>${esc(q.mat)}募集 · ${MAPS[q.map].name}</b><p>${state.materials[q.mat]||0}/${q.n} 份 · ${q.kind==='gear'?RARITY[q.rar]+' '+(q.job===undefined?'隨機職業':CLASSES[q.job].name)+' '+SLOTS[q.slot]+' ×1':GEMS[q.gem].name+' ×2'}</p><p>另獲 ${regionTier(q.map)*180} 金幣、${regionTier(q.map)*8} 鍛鐵</p></div><button onclick="claimBoard('${q.id}')" ${q.done||(state.materials[q.mat]||0)<q.n?'disabled':''}>${q.done?'已交付':'交付'}</button></article>`).join('')}</div><h3>支線</h3>${QUESTS.map(q=>`<article class="quest-list-row"><div><b>${q.title}</b><p>${q.desc} · ${q.mat} ${state.materials[q.mat]||0}/${q.n}</p><p>${q.gold} 金幣／${q.ore} 鍛鐵／隨機寶石 ×1</p></div><button onclick="claimQuest('${q.id}')" ${state.claimed.includes(q.id)||(state.materials[q.mat]||0)<q.n?'disabled':''}>${state.claimed.includes(q.id)?'已完成':'交付'}</button></article>`).join('')}<h3>重複募集</h3><article class="quest-list-row"><div><b>${esc(mat)} ${state.materials[mat]||0}/8</b><p>${regionTier(questRegion())*150} 金幣、15 鍛鐵、3 粉塵、隨機寶石 ×1</p></div><button onclick="claimRepeat()" ${(state.materials[mat]||0)<8?'disabled':''}>交付</button></article></section>`;};
let MARKET_REFRESH_COST=100;
function generateMarket(){const serial=(party.market?.serial||0)+1,tier=regionTier(party.map===6?5:party.map),pool=MAPS[party.map===6?5:party.map].mobs;return {serial,offers:Array.from({length:6},(_,i)=>{const kind=i===0?'ore':i===1?'dust':i===2?'gem':['ore','dust','gem','material'][rand(4)],key=kind==='gem'?String(rand(3)):kind==='material'?pool[rand(pool.length)][2]:'',qty=kind==='ore'?(8+rand(13))*tier:kind==='dust'?3+rand(6):kind==='gem'?1+rand(2):3+rand(4),unit=kind==='ore'?12:kind==='dust'?25:kind==='gem'?180:60*tier;return {id:serial+'-'+i,kind,key,qty,price:qty*unit,sold:false};})};}
function ensureMarket(){if(!party.market){party.market=generateMarket();save();}}
function refreshMarket(){ensureMarket();if(state.gold<MARKET_REFRESH_COST)return toast('刷新需要100金幣');const old=party.market;state.gold-=MARKET_REFRESH_COST;party.market=generateMarket();if(!save()){party.market=old;state.gold+=MARKET_REFRESH_COST;return;}render();toast('素材商品已刷新');}
function marketOfferName(o){return o.kind==='ore'?'鍛鐵':o.kind==='dust'?'粉塵':o.kind==='gem'?GEMS[Number(o.key)].name:o.key;}
function buyMarketOffer(id){const o=party.market?.offers.find(x=>x.id===id);if(!o||o.sold)return;if(state.gold<o.price)return toast('金幣不足');const prior={gold:state.gold,ore:state.ore,dust:state.dust,gems:[...state.gems],materials:{...state.materials}};state.gold-=o.price;if(o.kind==='ore'||o.kind==='dust')state[o.kind]+=o.qty;else if(o.kind==='gem')state.gems[Number(o.key)]+=o.qty;else state.materials[o.key]=(state.materials[o.key]||0)+o.qty;if(state.ore>1e12||state.dust>1e12||state.gems.some(n=>n>1e9)||Object.values(state.materials).some(n=>n>1e9)){Object.assign(state,prior);return toast('庫存已達上限');}o.sold=true;if(!save()){o.sold=false;Object.assign(state,prior);return;}render();toast('已購買 '+marketOfferName(o)+' ×'+o.qty);}
function marketCards(){return party.market.offers.map(o=>`<article class="card"><h3>${esc(marketOfferName(o))} ×${o.qty}</h3><p>${o.price} 金幣</p><button onclick="buyMarketOffer('${o.id}')" ${o.sold||state.gold<o.price?'disabled':''}>${o.sold?'已售完':'購買'}</button></article>`).join('');}
const materialShopView=shopView;shopView=function(){ensureMarket();return materialShopView().replace('<div class="shared-shop-grid">',`<div class="actions market-refresh"><span>素材商品 · 第 ${party.market.serial} 批</span><button onclick="refreshMarket()">刷新商店 · ${MARKET_REFRESH_COST} 金幣</button></div><div class="shared-shop-grid">${marketCards()}`);};
const update08ValidateParty=validateParty;validateParty=function(data){const p=update08ValidateParty(data);const tasks=p.members.flatMap(h=>h.board.tasks);if(new Set(tasks.map(q=>q.id)).size>12)throw Error('共用委託超過遷移容量');for(const q of tasks)if(q.job!==undefined&&(!Number.isInteger(q.job)||q.job<0||q.job>3))throw Error('委託裝備職業無效');const m=data.market;if(m!==undefined){const validMaterialKey=key=>typeof key==='string'&&key.length>0&&key.length<=80&&!/[<>]/.test(key)&&!['__proto__','constructor','prototype'].includes(key);if(!m||!Number.isSafeInteger(m.serial)||m.serial<1||!Array.isArray(m.offers)||m.offers.length>100)throw Error('商店資料無效');const ids=new Set();for(const o of m.offers){if(!o||typeof o.id!=='string'||!/^\d+-\d+$/.test(o.id)||ids.has(o.id)||!['ore','dust','gem','material'].includes(o.kind)||!Number.isInteger(o.qty)||o.qty<1||o.qty>10000||!Number.isInteger(o.price)||o.price<1||o.price>1e9||typeof o.sold!=='boolean'||typeof o.key!=='string'||o.kind==='gem'&&!['0','1','2'].includes(o.key)||o.kind==='material'&&!validMaterialKey(o.key)||['ore','dust'].includes(o.kind)&&o.key!=='')throw Error('素材商品無效');ids.add(o.id);}p.market=JSON.parse(JSON.stringify(m));}return p;};

// Combat-only counters are per open session; purchases and spending cannot alter totals.
let expeditionLoot={kills:0,items:new Map()};
function combatLootSnapshot(){const h=party.members[0];return {gold:h.gold,ore:h.ore,dust:h.dust,potions:h.potions,gems:[...h.gems],materials:{...h.materials},gear:new Set(h.bag.map(g=>g.id))};}
function itemRarity(name){return name==='光輝碎塊'?3:0;}
function addExpeditionLoot(name,n,rar=itemRarity(name)){if(n<=0)return;const old=expeditionLoot.items.get(name);expeditionLoot.items.set(name,{count:(old?.count||0)+n,rar:Math.max(old?.rar??0,rar)});}
const journalRewardGroupKill=rewardGroupKill;
rewardGroupKill=function(e){if(e.rewarded)return;const before=combatLootSnapshot();journalRewardGroupKill(e);const h=party.members[0];expeditionLoot.kills++;for(const [key,name] of [['gold','金幣'],['ore','鍛鐵'],['dust','寶石粉塵'],['potions','治療藥水']])addExpeditionLoot(name,h[key]-before[key]);h.gems.forEach((n,i)=>addExpeditionLoot(GEMS[i].name,n-before.gems[i]));for(const [name,n] of Object.entries(h.materials))addExpeditionLoot(name,n-(before.materials[name]||0));for(const g of h.bag)if(!before.gear.has(g.id))addExpeditionLoot(equipmentDisplayName(g),1,typeof gearQualityRank==='function'?gearQualityRank(g):Math.max(0,Math.min(3,Number(g.rar)||0)));};
const journalResetSession=resetSession;resetSession=function(){journalResetSession();expeditionLoot={kills:0,items:new Map()};};
function sharedBattleJournal(){if(!party)return '';const paused=$('modal').open;return `<section id="globalBattleJournal" class="global-battle-journal" aria-label="全隊共通戰報"><div class="global-journal-head"><div class="row"><h2>全隊戰報</h2><span class="tag">${running?(paused?'視窗暫停':'探索中'):'已暫停'} · ${battleRate}×</span></div><p>${esc(MAPS[party.map].name)} · ${MODES[party.difficulty||0].name}<br>存活隊員 ${living().length}/${heroes().length} · 敵人 ${foes.filter(e=>e.hp>0).length}/${foes.length}</p><button onclick="toggleBattle()">${running?'暫停探索':'開始探索'}</button> <button onclick="setTab('battle')">查看戰場</button></div><div id="liveLog" role="log" aria-label="即時戰鬥紀錄">${logContent()}</div><section class="journal-loot"><h3>累積戰利品 · 擊敗 ${expeditionLoot.kills} 隻</h3><div class="small">本次開啟遊戲累計</div><div id="journalLootList" class="journal-loot-list">${[...expeditionLoot.items].map(([name,item])=>`<div class="journal-loot-row"><span class="loot-rarity-${item.rar??0}">${esc(name)}</span><b>+${(item.count??item).toLocaleString()}</b></div>`).join('')||'<p class="small">尚無戰利品。</p>'}</div></section></section>`;}
const journalRender=render;render=function(){const live=$('liveLog'),list=$('journalLootList'),detail=live?.querySelector?.('details'),history=live?.querySelector?.('.history-events'),current=live?.querySelector?.('.current-events');const position={open:detail?.open,loot:list?.scrollTop||0,history:history?.scrollTop||0,current:current?.scrollTop||0};journalRender();const next=$('liveLog');if(next?.querySelector){const d=next.querySelector('details'),h=next.querySelector('.history-events'),c=next.querySelector('.current-events');if(d)d.open=!!position.open;if(h)h.scrollTop=position.history;if(c)c.scrollTop=position.current;}const l=$('journalLootList');if(l)l.scrollTop=position.loot;};

// Update the common journal without replacing controls the player is using.
function isEditingControl(){return !!document.activeElement?.matches?.('input,select,textarea,[contenteditable="true"]');}
function refreshGlobalJournal(){
 const panel=$('globalBattleJournal');if(!party||!panel)return;
 const live=$('liveLog'),list=$('journalLootList'),detail=live?.querySelector?.('details'),history=live?.querySelector?.('.history-events'),current=live?.querySelector?.('.current-events');
 const saved={open:detail?.open,loot:list?.scrollTop||0,history:history?.scrollTop||0,current:current?.scrollTop||0};
 const html=sharedBattleJournal();panel.innerHTML=html.slice(html.indexOf('>')+1,html.lastIndexOf('</section>'));
 const next=$('liveLog'),d=next?.querySelector?.('details'),h=next?.querySelector?.('.history-events'),c=next?.querySelector?.('.current-events');
 if(d)d.open=!!saved.open;if(h)h.scrollTop=saved.history;if(c)c.scrollTop=saved.current;
 const l=$('journalLootList');if(l)l.scrollTop=saved.loot;
 const wallet=$('wallet');if(wallet)wallet.textContent='全隊金幣 '+party.members[0].gold.toLocaleString();
}


// Update 09: data-driven test balance JSON and real multi-target core attacks.
// Test settings are stored separately from player saves and can add entries that reuse existing mechanics.
const BALANCE_KEY='emberwild-balance-test-v1',BALANCE_SCHEMA='emberwild-balance-v1';
const GAME_BALANCE_DEFAULTS={
  combat:{
    elementMultipliers:{neutral:1,same:.8,strong:1.3,weak:.85},
    statCaps:{crit:.85,pierce:.65,evasion:.45,lifesteal:.25},
    minimumActiveCooldown:2
  },
  affixes:{
    qualityChance:{normal:.60,fine:.27,rare:.10,legendary:.03},
    qualityMultiplier:{normal:1,fine:1.4,rare:1.9,legendary:2.6},
    skillSpecialChance:.40,
    skillEffectShare:.72,
    extendedPoolChance:.55,
    procChancePerPointPercent:6,
    baseValues:{
      attackPerTier:{min:3,max:6},
      hpPerTier:{min:15,max:30},
      defensePerTier:{min:2,max:4},
      critPercent:{min:3,max:6,cap:18}
    },
    skillEffectPercent:{normal:0,fine:18,rare:30,legendary:45},
    cooldownReduction:{normal:0,fine:1,rare:1,legendary:2},
    extendedValues:{
      critDamage:{normal:5,fine:10,rare:15,legendary:20},
      pierce:{normal:5,fine:10,rare:15,legendary:20},
      lifesteal:{normal:1,fine:2,rare:3,legendary:4},
      evasion:{normal:2,fine:4,rare:6,legendary:8},
      elementDamage:{normal:5,fine:10,rare:15,legendary:20},
      raceDamage:{normal:5,fine:10,rare:15,legendary:20},
      resist:{normal:5,fine:10,rare:15,legendary:20},
      attackPercent:{normal:0,fine:0,rare:3,legendary:5}
    },
    rerollCost:{goldPerTier:80,orePerTier:3}
  }
};
let GAME_BALANCE=JSON.parse(JSON.stringify(GAME_BALANCE_DEFAULTS));
function cloneBalance(v){return JSON.parse(JSON.stringify(v));}
function qualityChanceText(){const q=GAME_BALANCE.affixes.qualityChance;return `普通 ${Math.round(q.normal*100)}%、精良 ${Math.round(q.fine*100)}%、稀有 ${Math.round(q.rare*100)}%、傳說 ${Math.round(q.legendary*100)}%`;}
function rerollCostFor(g){return {gold:Math.round(g.tier*GAME_BALANCE.affixes.rerollCost.goldPerTier),ore:Math.round(g.tier*GAME_BALANCE.affixes.rerollCost.orePerTier)};}
function balanceReference(){return {
  purpose:'_reference 僅供閱讀，不參與任何計算；可保留、刪除或修改文字。真正生效的是 balance / classes / supportSkills / equipmentForms / items。',
  units:{chance:'0~1 小數，例如 0.03 = 3%',percent:'整數百分點，例如 5 = 5%',multiplier:'倍率，例如 1.3 = 130%',power:'技能基礎倍率，例如 2.8 = 280% 攻擊倍率',cooldown:'回合',duration:'BUFF／DEBUFF 為戰鬥回合；消耗品為角色出戰回合'},
  elements:{physical:'無屬性；不是物理屬性。攻擊方或防禦方為 physical 時不參與剋制，使用 neutral 倍率；全屬性增傷也不加成 physical。',fire:'火；剋 wind，被 ice 剋',ice:'冰；剋 fire，被 wind 剋',wind:'風；剋 ice，被 fire 剋',light:'光；與 shadow 互剋',shadow:'暗；與 light 互剋'},
  races:{beast:'野獸',plant:'植物',undead:'不死',construct:'構裝',demon:'惡魔',spirit:'精靈'},
  activations:{active:'主動技能；裝入主動槽，冷卻完成後施放',proc:'觸發技能；普通攻擊時各自判定觸發率'},
  effects:{damage:'造成傷害',heal:'治療生命比例最低的存活隊員',shield:'給予護盾',drain:'造成傷害並依技能機制回復生命'},
  qualities:{normal:'rank 0／普通',fine:'rank 1／精良',rare:'rank 2／稀有',legendary:'rank 3／傳說'},
  affixTypes:{'0':'固定攻擊','1':'固定生命','2':'固定防禦','3':'暴擊率 %','4':'指定技能效果 %','5':'主動技能冷卻減少；若該技能為 proc，則每 1 點依 procChancePerPointPercent 增加觸發率','6':'暴擊傷害 %','7':'防禦穿透 %','8':'生命竊取 %','9':'閃避率 %','12':'指定屬性傷害 %','13':'對指定種族增傷 %','14':'指定屬性抗性 %','15':'總攻擊力 %；目前只在稀有／傳說池出現'},
  equipmentExclusive:{gearAtkPct:'只增加該件裝備的基礎攻擊 %',gearHpPct:'只增加該件裝備的基礎生命 %',gearDefPct:'只增加該件裝備的基礎防禦 %',attackPct:'增加角色總攻擊力 %',crit:'暴擊率 %',critDamage:'暴擊傷害 %',pierce:'防禦穿透 %',lifesteal:'生命竊取 %',evasion:'閃避率 %',elementBonus:'全元素傷害 %；不含 physical 無屬性'},
  equipmentSlots:{'0':'武器','1':'護甲','2':'副手','3':'飾品'},
  balancePaths:{
    'balance.combat.elementMultipliers':'neutral=無剋制、same=同屬性、strong=剋制、weak=被剋制',
    'balance.combat.statCaps':'暴擊、閃避、吸血、防禦無視使用 0~1 小數；防禦穿透為固定防禦點數',
    'balance.combat.minimumActiveCooldown':'主動技能最低冷卻回合',
    'balance.affixes.qualityChance':'每一條詞條獨立抽品質，四項總和必須 = 1',
    'balance.affixes.qualityMultiplier':'普通四種基礎詞條（攻擊/生命/防禦/暴擊）的品質倍率',
    'balance.affixes.skillSpecialChance':'精良以上先改抽技能類詞條的機率',
    'balance.affixes.skillEffectShare':'進入技能類詞條後，抽到技能效果 % 的比例；其餘為冷卻/觸發率類',
    'balance.affixes.extendedPoolChance':'基礎詞條生成後，替換成暴傷/穿透/吸血/閃避/屬傷/種族增傷/抗性/攻擊%池的機率',
    'balance.affixes.baseValues':'固定攻擊/生命/防禦與暴擊的基礎隨機範圍；前三者再乘裝備階級與品質倍率',
    'balance.affixes.skillEffectPercent':'各品質技能效果詞條 %',
    'balance.affixes.cooldownReduction':'各品質冷卻減少點數；proc 技能會把點數轉為觸發率',
    'balance.affixes.extendedValues.attackPercent':'新攻擊力 % 詞條；目前稀有 3%、傳說 5%',
    'balance.affixes.rerollCost':'每次洗鍊費用 = 裝備階級 × 此數值；自動洗鍊逐次正常扣費'
  }
};}
function normalizeRuntimeBalance(input){
  const out=cloneBalance(GAME_BALANCE_DEFAULTS),src=input&&typeof input==='object'?input:{};
  function assignNumbers(target,source){if(!source||typeof source!=='object'||Array.isArray(source))return;for(const [k,v] of Object.entries(source)){if(target[k]&&typeof target[k]==='object'&&!Array.isArray(target[k]))assignNumbers(target[k],v);else if(Number.isFinite(v))target[k]=v;}}
  assignNumbers(out,src);
  const q=out.affixes.qualityChance,sum=Object.values(q).reduce((a,b)=>a+b,0);if(Object.values(q).some(v=>v<0||v>1)||Math.abs(sum-1)>1e-9)throw Error('qualityChance 四項必須介於 0~1 且總和為 1');
  for(const key of ['skillSpecialChance','skillEffectShare','extendedPoolChance'])if(out.affixes[key]<0||out.affixes[key]>1)throw Error(key+' 必須介於 0~1');
  if(out.combat.minimumActiveCooldown<0||!Number.isFinite(out.combat.minimumActiveCooldown))throw Error('minimumActiveCooldown 無效');
  for(const [k,v] of Object.entries(out.combat.elementMultipliers))if(!Number.isFinite(v)||v<0)throw Error('elementMultipliers.'+k+' 無效');
  for(const [k,v] of Object.entries(out.combat.statCaps)){const max=k==='pierce'?10000:1;if(!Number.isFinite(v)||v<0||v>max)throw Error('statCaps.'+k+' 必須介於 0~'+max);}
  for(const key of ['attackPerTier','hpPerTier','defensePerTier']){const r=out.affixes.baseValues[key];if(!Number.isFinite(r.min)||!Number.isFinite(r.max)||r.min<0||r.max<r.min)throw Error('baseValues.'+key+' 範圍無效');}
  const cr=out.affixes.baseValues.critPercent;if(!Number.isFinite(cr.min)||!Number.isFinite(cr.max)||!Number.isFinite(cr.cap)||cr.min<0||cr.max<cr.min||cr.cap<cr.max)throw Error('baseValues.critPercent 範圍無效');
  if(out.affixes.rerollCost.goldPerTier<0||out.affixes.rerollCost.orePerTier<0)throw Error('rerollCost 不可為負數');
  return out;
}
const BASE_BALANCE_SNAPSHOT={classes:JSON.parse(JSON.stringify(CLASSES)),skillElements:JSON.parse(JSON.stringify(SKILL_ELEMENTS)),support:JSON.parse(JSON.stringify(SUPPORT)),itemForms:JSON.parse(JSON.stringify(ITEM_FORMS))};
function replaceArray(target,source){target.splice(0,target.length,...JSON.parse(JSON.stringify(source)));}
function skillRequiresAdvanced(sk,index){return sk?.[6]?.requiresAdvanced ?? index>=4;}
function skillPrerequisites(sk){
  const meta=Array.isArray(sk)?(sk?.[6]||{}):(sk&&typeof sk==='object'?sk:{}),rows=Array.isArray(meta.prerequisites)?meta.prerequisites:(Number.isInteger(meta.prerequisiteSkill)?[{skill:meta.prerequisiteSkill,level:meta.prerequisiteLevel}]:[]);
  return rows.slice(0,3).map(req=>({type:req?.type==='support'?'support':'core',skill:Number(req?.skill),level:Number.isInteger(req?.level)&&req.level>0?req.level:1})).filter(req=>Number.isInteger(req.skill));
}
function skillPrerequisiteLevel(req,s=state){
  return req?.type==='support'?(s.supportLevels?.[req.skill]||0):(s.skills?.[req.skill]||0);
}
function skillPrerequisiteName(job,req){
  if(req?.type==='support')return '輔助：'+(SUPPORT[job]?.[req.skill]?.name||'技能 '+(req.skill+1));
  const sk=CLASSES[job]?.skills?.[req.skill],kind=sk?.[1]==='proc'?'觸發':'主動';
  return kind+'：'+(sk?.[0]||'技能 '+(req.skill+1));
}
function skillPrerequisitesMet(sk,s=state){
  return skillPrerequisites(sk).every(req=>{
    const list=req.type==='support'?SUPPORT[s.job]:CLASSES[s.job]?.skills;
    return req.skill>=0&&req.skill<(list?.length||0)&&skillPrerequisiteLevel(req,s)>=req.level;
  });
}
function skillPrerequisiteLabel(job,sk){
  return skillPrerequisites(sk).map(req=>skillPrerequisiteName(job,req)+' Lv.'+req.level).join('、');
}
function syncHeroSkillArrays(h){const n=CLASSES[h.job].skills.length;while(h.skills.length<n)h.skills.push(0);while(h.sockets.length<n)h.sockets.push(null);if(h.skills.length>n)h.skills.length=n;if(h.sockets.length>n)h.sockets.length=n;h.active=h.active.map(i=>Number.isInteger(i)&&i<n?i:null);ensureProcSlots(h);}
function syncAllHeroSkillArrays(){if(party)party.members.forEach(syncHeroSkillArrays);else if(state)syncHeroSkillArrays(state);}
function shuffleCopy(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function coreSkillTargets(sk){const alive=foes.filter(e=>e.hp>0),m=sk[6]||{},requested=m.target==='enemies'?alive.length:Math.max(1,Math.floor(Number(m.maxTargets)||1));if(m.target==='enemies'||requested>1)return requested>=alive.length?alive:shuffleCopy(alive).slice(0,requested);const eligible=alive.filter(enemyAvailableForSingleTarget);return eligible.length?shuffleCopy(eligible).slice(0,1):[];}
function coreSkillElement(job,i){return SKILL_ELEMENTS[job]?.[i]||'physical';}

// Core attacks now honor maxTargets. When fewer monsters exist, all are hit; otherwise targets are chosen randomly without replacement.
castPartySkill=function(h,i,v){
 const sk=CLASSES[h.job].skills[i];if(!sk)return false;
 if(sk[1]==='proc'&&PROC_ONLY_EFFECTS.has(sk[5])){
  if(sk[5]==='nextActiveDamage'){const bonus=Math.max(0,skillPower(i,h));h.nextActiveDamageBonus=Math.max(0,Number(h.nextActiveDamageBonus)||0)+bonus;note(characterName(h)+'・'+sk[0]+' → 下次主動技能傷害 +'+Number((bonus*100).toFixed(1))+'%');return true;}
  if(sk[5]==='advanceNextRound'){h.procAdvanceRound=round+1;h.procAdvanceSteps=Math.min(5,Math.max(0,Number(h.procAdvanceSteps)||0)+1);note(characterName(h)+'・'+sk[0]+' → 下回合行動提前 1 格');return true;}
  if(sk[5]==='shieldLowest'){const ally=[...living()].sort((a,b)=>a.hp/stats(a).hp-b.hp/stats(b).hp)[0];if(!ally)return false;const amount=v.atk*skillPower(i,h)*(1+effectTotal(heroKey(h),'power')),r=applyPureShield(ally,amount);note(characterName(h)+'・'+sk[0]+' → '+characterName(ally)+' 護盾 '+r.generated+(r.upgraded?'':'（現有護盾較高，維持不變）'));return true;}
 }
 const storedBonus=sk[1]==='active'?Math.max(0,Number(h.nextActiveDamageBonus)||0):0,basePower=v.atk*skillPower(i,h)*(1+effectTotal(heroKey(h),'power')),power=basePower*((storedBonus>0&&['damage','drain'].includes(sk[5]))?1+storedBonus:1),element=coreSkillElement(h.job,i);let success=false;
 if(sk[5]==='heal'){const ally=[...living()].sort((a,b)=>a.hp/stats(a).hp-b.hp/stats(b).hp)[0];if(!ally)return false;const maxHp=stats(ally).hp,beforeHp=ally.hp;ally.hp=Math.min(maxHp,beforeHp+Math.round(basePower));const recovered=Math.max(0,ally.hp-beforeHp);if(recovered>0)recordCombatContribution(h,'healing',recovered);note(characterName(h)+'・'+sk[0]+' → '+characterName(ally)+' 恢復 '+Math.round(recovered)+' 生命');success=true;}
 else if(sk[5]==='shield'){const shieldResult=applyPureShield(h,basePower);note(pureShieldCastLog(h,sk[0],shieldResult));success=true;}
 else{const targets=coreSkillTargets(sk);if(!targets.length)return false;let total=0;const results=[];for(const e of targets){const d=resolveHit(e,power,h,element,Math.random()<v.crit);total+=d;results.push(combatEnemyName(e)+' '+d);}if(sk[5]==='drain'){const beforeDrain=h.hp;h.hp=Math.min(v.hp,h.hp+total);const recovered=Math.max(0,h.hp-beforeDrain);if(recovered>0)recordCombatContribution(h,'healing',recovered);}note(characterName(h)+'・'+sk[0]+' ['+ELEMENTS[element]+'] → '+results.join('、')+' 傷害');success=true;}
 if(success&&sk[1]==='active'&&storedBonus>0)delete h.nextActiveDamageBonus;
 if(success&&h.sockets[i]===2&&sk[1]==='active'){const beforeGem=h.hp;h.hp=Math.min(v.hp,h.hp+Math.round(v.atk*GS('skills.gems.hybridActiveHealAttack',.15)));const recovered=Math.max(0,h.hp-beforeGem);if(recovered>0)recordCombatContribution(h,'healing',recovered);}
 return success;
};
const update09PerformHeroBasic=performHeroBasic;performHeroBasic=function(h){ensureProcSlots(h);const v=battleStats(h),target=foes.find(enemyAvailableForSingleTarget);if(!target)return;const d=resolveHit(target,v.atk,h,weaponElement(h),Math.random()<v.crit);note(characterName(h)+' 普攻 → '+combatEnemyName(target)+' '+d+' 傷害');for(const i of h.procSlots){if(!foes.some(e=>e.hp>0))break;if(i!==null&&validProcIndex(h,i)&&Math.random()<procChance(i,h))castPartySkill(h,i,v);}};
const update09Socket=socket;socket=function(i,value){let g=Number(value);if(!Number.isInteger(i)||i<0||i>=CLASSES[state.job].skills.length||!state.skills[i]||!Number.isInteger(g)||g< -1||g>2)return;let old=state.sockets[i]??null;if(g===old)return;if(g>=0&&state.gems[g]<1)return;if(old!==null)state.gems[old]++;state.sockets[i]=g<0?null:g;if(g>=0)state.gems[g]--;save();render();};
learn=function(i){let sk=CLASSES[state.job].skills[i],cap=skillCap();if(!sk)return;if(state.skills[i]>=cap)return toast(`目前技能上限 ${cap} 級；角色每 ${GS('skills.core.capLevelsPerStep',3)} 級提高 1 級上限，最高 ${RULES.skillMax} 級`);if(state.sp<1||state.lv<sk[2]||(skillRequiresAdvanced(sk,i)&&!state.advanced)||!skillPrerequisitesMet(sk,state))return;state.sp--;state.skills[i]++;save();render();};
coreSkillRows=function(){syncHeroSkillArrays(state);const activeSlots=Array.from({length:2},(_,i)=>state.active?.[i]??null);return `<div class="actions active-slot-summary">${activeSlots.map((id,i)=>`<span>槽 ${i+1}：${id===null?'未配置':esc(CLASSES[state.job].skills[id]?.[0]||'未知技能')+skillTypeBadges(state.job,id)} <button onclick="clearActiveSkill(${i})">清空</button></span>`).join('')}</div><div class="skill-list">${CLASSES[state.job].skills.map((sk,i)=>{const advanced=skillRequiresAdvanced(sk,i),prereqs=skillPrerequisites(sk),prereqsMet=skillPrerequisitesMet(sk,state),locked=state.lv<sk[2]||(advanced&&!state.advanced)||!prereqsMet,gem=state.sockets[i]??null;return `<article class="skill-list-row"><div><div class="skill-list-title"><b>${esc(sk[0])}</b><span>Lv.${state.skills[i]}/${RULES.skillMax}</span><span>${sk[1]==='proc'?'普攻觸發':'主動'}</span></div>${skillTypeBadges(state.job,i)}${skillMechanicsDetails(state.job,i)}<p>${skillDescription(i)}</p><p>${sk[1]==='active'?'冷卻 '+skillCooldown(i)+' 回合':'普攻觸發率 '+Math.round(procChance(i)*100)+'%'} · 需求 LV${sk[2]}${advanced?'／二轉':''}${prereqs.length?'／前置 '+esc(skillPrerequisiteLabel(state.job,sk)):''}</p></div><div class="skill-list-controls"><button onclick="learn(${i})" ${locked||state.sp<1||state.skills[i]>=skillCap()?'disabled':''}>${locked?'尚未解鎖':state.skills[i]?'升級1點':'學習'}</button>${sk[1]==='active'?[0,1].map(slot=>`<button onclick="equipSkill(${i},${slot})" ${!state.skills[i]?'disabled':''}>${state.active[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join(''):'<span>需配置於觸發槽</span>'}<label>寶石 <select aria-label="${esc(sk[0])}寶石" onchange="socket(${i},this.value)" ${!state.skills[i]?'disabled':''}><option value="-1" ${gem===null?'selected':''}>不鑲嵌</option>${GEMS.map((g,j)=>`<option value="${j}" ${gem===j?'selected':''} ${state.gems[j]<1&&gem!==j?'disabled':''}>${esc(g.name)} ×${state.gems[j]} · ${esc(g.desc)}</option>`).join('')}</select></label></div></article>`;}).join('')}</div>`;};

function exportableBalance(){return {schema:BALANCE_SCHEMA,_reference:balanceReference(),notes:['核心技能支援 active/proc；proc 另支援 nextActiveDamage、advanceNextRound、shieldLowest。','maxTargets > 1 時，從存活敵人隨機抽取且不重複；target=enemies 表示全部存活敵人。','可直接在 skills 或 equipmentForms 陣列新增資料；新增技能會自動建立技能等級與寶石插槽。','balance 內的數值會實際影響遊戲；_reference 僅為中文對照說明，不參與計算。','proc 技能使用 2 個觸發槽；只有配置技能會在普攻後判定。','procBaseChance 為 Lv1 基礎觸發率，procChancePerLevel 為每次升級增加率。','核心技能 powerPerLevel 為每次升級直接加到基礎倍率的數值；基礎倍率即 Lv1 倍率，實際倍率 = 基礎倍率 + (技能等級 - 1) × 每級倍率；缺少時沿用舊版全域 effectPerExtraLevel。','輔助技能 effectPerLevel 為每次升級直接加到基礎效果的數值；基礎效果即 Lv1 效果，實際效果 = 基礎效果 + (技能等級 - 1) × 每級倍率；缺少時沿用舊版全域 effectPerExtraLevel。','核心與輔助技能皆可設定最多 3 個前置技能，前置可來自主動、觸發或輔助技能，且必須同時滿足各自需求等級才可學習／升級。'],balance:cloneBalance(GAME_BALANCE),classes:CLASSES.map((c,job)=>({id:job,name:c.name,advanced:c.advanced,hp:c.hp,atk:c.atk,def:c.def,main:c.main,skills:c.skills.map((sk,i)=>({id:`job${job}-skill${i}`,name:sk[0],activation:sk[1],requiredLevel:sk[2],cooldown:sk[3],power:sk[4],powerPerLevel:Number.isFinite(sk[6]?.powerPerLevel)?sk[6].powerPerLevel:GS('skills.core.effectPerExtraLevel',.18),effect:sk[5],element:coreSkillElement(job,i),maxTargets:sk[6]?.target==='enemies'?99:(sk[6]?.maxTargets||1),requiresAdvanced:skillRequiresAdvanced(sk,i),prerequisites:skillPrerequisites(sk),...(sk[1]==='proc'?{procBaseChance:ensureProcSkillMeta(job,i).procBaseChance,procChancePerLevel:ensureProcSkillMeta(job,i).procChancePerLevel}:{})}))})),supportSkills:SUPPORT.map((list,job)=>list.map((sk,i)=>({id:`job${job}-support${i}`,...sk,prerequisites:skillPrerequisites(sk)}))),equipmentForms:ITEM_FORMS.map((jobs,job)=>jobs.map((slots,slot)=>slots.map((form,i)=>({id:`job${job}-slot${slot}-form${i}`,...form}))))};}
function balanceConfigPrerequisites(sk){return Array.isArray(sk?.prerequisites)?sk.prerequisites:(Number.isInteger(sk?.prerequisiteSkill)?[{skill:sk.prerequisiteSkill,level:sk.prerequisiteLevel}]:[]);}
function validateBalanceConfigCore(input){const data=JSON.parse(JSON.stringify(input));if(data&&Array.isArray(data.equipmentForms))normalizeEquipmentFormsArray(data.equipmentForms);if(!data||data.schema!==BALANCE_SCHEMA||!Array.isArray(data.classes)||data.classes.length!==CLASSES.length||!Array.isArray(data.equipmentForms)||data.equipmentForms.length!==ITEM_FORMS.length)throw Error('測試設定格式或版本不符');data.balance=normalizeRuntimeBalance(data.balance);const effects=new Set(['damage','heal','shield','drain','nextActiveDamage','advanceNextRound','shieldLowest','applyStatus','polymorph','freeze','frost','rage','summonMorphTrap','summonFreezeTrap','fear','tauntRage']),acts=new Set(['active','proc']),elements=new Set(Object.keys(ELEMENTS)),exclusiveKeys=new Set(['gearAtkPct','gearHpPct','gearDefPct','attackPct','crit','critDamage','pierce','defenseIgnore','lifesteal','evasion','elementBonus']),legacyNumeric=new Set(['atk','hp','def','mp','mpRegen','crit','critDamage','pierce','lifesteal','evasion','elementBonus']);const legacyProc=legacyProcRates(data.balanceSettings);data.classes.forEach((c,job)=>{if(!c||!Number.isFinite(c.hp)||c.hp<=0||!Number.isFinite(c.atk)||c.atk<=0||!Number.isFinite(c.def)||c.def<0||!Array.isArray(c.skills)||!c.skills.length)throw Error('職業資料無效：'+job);c.skills.forEach((sk,i)=>{if(sk&&!Number.isFinite(sk.powerPerLevel))sk.powerPerLevel=Number(data.balanceSettings?.skills?.core?.effectPerExtraLevel??.18);if(sk&&sk.powerPerLevel<0)throw Error(`技能每級倍率無效：${job}-${i}`);if(sk?.activation==='proc'){if(!Number.isFinite(sk.procBaseChance))sk.procBaseChance=legacyProc.base;if(!Number.isFinite(sk.procChancePerLevel))sk.procChancePerLevel=legacyProc.per;if(sk.procBaseChance<0||sk.procBaseChance>1||sk.procChancePerLevel<0||sk.procChancePerLevel>1)throw Error(`普攻觸發率設定無效：${job}-${i}`);}if(sk&&PROC_ONLY_EFFECTS.has(sk.effect)&&sk.activation!=='proc')throw Error(`觸發專屬效果只能用於 proc 技能：${job}-${i}`);if(!sk||typeof sk.name!=='string'||!acts.has(sk.activation)||!Number.isInteger(sk.requiredLevel)||sk.requiredLevel<1||!Number.isFinite(sk.cooldown)||sk.cooldown<0||!Number.isFinite(sk.power)||sk.power<0||!effects.has(sk.effect)||!elements.has(sk.element)||!Number.isFinite(sk.maxTargets)||sk.maxTargets<1)throw Error(`技能資料無效：${job}-${i}`);});});
for(let job=0;job<data.classes.length;job++){
  const core=data.classes[job].skills,support=Array.isArray(data.supportSkills?.[job])?data.supportSkills[job]:(SUPPORT[job]||[]);
  const owners=[...core.map((sk,index)=>({type:'core',index,sk})),...support.map((sk,index)=>({type:'support',index,sk}))];
  const listFor=type=>type==='support'?support:core;
  for(const owner of owners){
    const reqs=balanceConfigPrerequisites(owner.sk);
    if(reqs.length>3)throw Error('前置技能最多三個：'+job+'-'+owner.type+'-'+owner.index);
    const seen=new Set();
    for(const req of reqs){
      const type=req?.type==='support'?'support':'core',list=listFor(type),key=type+':'+req?.skill;
      if(!req||!Number.isInteger(req.skill)||req.skill<0||req.skill>=list.length||(type===owner.type&&req.skill===owner.index)||seen.has(key))throw Error('前置技能設定無效：'+job+'-'+owner.type+'-'+owner.index);
      if(!Number.isInteger(req.level)||req.level<1)throw Error('前置技能等級無效：'+job+'-'+owner.type+'-'+owner.index);
      seen.add(key);
    }
  }
  const getNode=key=>{const parts=key.split(':'),type=parts[0],index=Number(parts[1]),list=listFor(type);return Number.isInteger(index)&&index>=0&&index<list.length?list[index]:null;};
  const visit=(key,path)=>{
    if(path.has(key))throw Error('技能前置形成循環：'+job+'-'+key);
    const node=getNode(key);if(!node)return;
    const nextPath=new Set(path);nextPath.add(key);
    for(const req of balanceConfigPrerequisites(node)){
      const type=req?.type==='support'?'support':'core',next=type+':'+req?.skill;
      if(getNode(next))visit(next,nextPath);
    }
  };
  for(const owner of owners)visit(owner.type+':'+owner.index,new Set());
}
data.equipmentForms.forEach((jobs,job)=>{const global=job===CLASSES.length;if(!Array.isArray(jobs)||jobs.length!==4)throw Error('裝備部位資料無效：'+job);jobs.forEach((forms,slot)=>{if(!Array.isArray(forms)||(!global&&!forms.length))throw Error(`裝備類型不可為空：${job}-${slot}`);forms.forEach((f,i)=>{if(!f||typeof f.name!=='string')throw Error(`裝備資料無效：${job}-${slot}-${i}`);if(f.element!==undefined&&!elements.has(f.element))throw Error('裝備元素無效');if(f.wearableJobs!==undefined&&(!Array.isArray(f.wearableJobs)||!f.wearableJobs.length||f.wearableJobs.some(j=>!Number.isInteger(j)||j<0||j>=CLASSES.length)))throw Error(`裝備可穿戴職業無效：${job}-${slot}-${i}`);for(const [k,v] of Object.entries(f)){if(['id','name','element','wearableJobs','exclusive','fixedEffects'].includes(k))continue;if(!legacyNumeric.has(k)||!Number.isFinite(v))throw Error(`未知或無效裝備欄位：${job}-${slot}-${i}-${k}`);}if(f.exclusive!==undefined){if(!f.exclusive||typeof f.exclusive!=='object'||Array.isArray(f.exclusive))throw Error(`裝備專屬屬性無效：${job}-${slot}-${i}`);for(const [k,v] of Object.entries(f.exclusive))if(!exclusiveKeys.has(k)||!Number.isFinite(v)||v<-100||v>500)throw Error(`裝備專屬屬性無效：${job}-${slot}-${i}-${k}`);}});});});return data;}
function validateBalanceConfig(data){return validateBalanceConfigCore(data);}
function applyBalanceConfig(data,{persist=true}={}){data=validateBalanceConfig(JSON.parse(JSON.stringify(data)));GAME_BALANCE=cloneBalance(data.balance);data.classes.forEach((c,job)=>{const target=CLASSES[job];for(const k of ['name','advanced','hp','atk','def','main'])if(c[k]!==undefined)target[k]=c[k];target.skills=c.skills.map(sk=>[sk.name,sk.activation,sk.requiredLevel,sk.cooldown,sk.power,sk.effect,{target:sk.maxTargets>=99?'enemies':sk.effect==='heal'||sk.effect==='shieldLowest'?'weakest':sk.effect==='shield'||PROC_ONLY_EFFECTS.has(sk.effect)?'self':'enemy',maxTargets:Math.max(1,Math.floor(sk.maxTargets)),requiresAdvanced:!!sk.requiresAdvanced,powerPerLevel:sk.powerPerLevel,prerequisites:balanceConfigPrerequisites(sk).slice(0,3).map(req=>({type:req?.type==='support'?'support':'core',skill:req.skill,level:req.level})),effects:[{kind:sk.effect}],...(sk.activation==='proc'?{procBaseChance:sk.procBaseChance,procChancePerLevel:sk.procChancePerLevel}:{})}]);SKILL_ELEMENTS[job]=c.skills.map(sk=>sk.element);});if(Array.isArray(data.supportSkills)&&data.supportSkills.length===SUPPORT.length)data.supportSkills.forEach((list,job)=>{if(Array.isArray(list))SUPPORT[job]=list.map(({id,...sk})=>({...sk,prerequisites:balanceConfigPrerequisites(sk).slice(0,3).map(req=>({type:req?.type==='support'?'support':'core',skill:req.skill,level:req.level}))}));});normalizeEquipmentFormsArray(data.equipmentForms);data.equipmentForms.forEach((jobs,job)=>jobs.forEach((forms,slot)=>{ITEM_FORMS[job][slot]=forms.map(({id,...form})=>form);}));normalizeEquipmentFormsArray(ITEM_FORMS);normalizeEquipmentFormWearability();normalizeEquippedWearability();syncAllHeroSkillArrays();if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(data));if(state){for(const h of party?.members||[state])withHero(h,clampVitals);render();}}
function exportBalanceJSON(){const blob=new Blob([JSON.stringify(exportableBalance(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='emberwild-balance-test.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('已匯出測試設定 JSON');}
async function importBalanceJSON(ev){const f=ev.target.files[0];ev.target.value='';if(!f)return;try{if(f.size>4e6)throw Error('檔案過大');const data=JSON.parse(await f.text());applyBalanceConfig(data);toast('測試設定已套用；重新開啟仍會保留');}catch(e){toast('測試設定匯入失敗：'+e.message);}}
function resetBalanceJSON(){localStorage.removeItem(BALANCE_KEY);replaceArray(CLASSES,BASE_BALANCE_SNAPSHOT.classes);replaceArray(SKILL_ELEMENTS,BASE_BALANCE_SNAPSHOT.skillElements);replaceArray(SUPPORT,BASE_BALANCE_SNAPSHOT.support);replaceArray(ITEM_FORMS,BASE_BALANCE_SNAPSHOT.itemForms);normalizeEquipmentFormWearability();normalizeEquippedWearability();syncAllHeroSkillArrays();if(state)render();toast('已恢復 HTML 內建預設設定');}
function showBalanceToolsAccess(){const modal=$('modal');modal.innerHTML=`<h2>測試設定 JSON</h2><p class="small">請輸入密碼後開啟測試設定工具。</p><label>密碼 <input id="balance-tools-password" type="password" inputmode="numeric" autocomplete="off" onkeydown="if(event.key==='Enter')unlockBalanceTools()"></label><div class="actions"><button class="primary" onclick="unlockBalanceTools()">確認</button><button onclick="closeModal()">取消</button></div>`;modal.showModal();setTimeout(()=>$('balance-tools-password')?.focus(),0);}
function unlockBalanceTools(){const input=$('balance-tools-password');if(!input||input.value!=='781206')return toast('密碼錯誤');$('modal').innerHTML=`<h2>測試設定 JSON</h2><p class="small">可匯出／匯入測試平衡設定，或恢復 HTML 內建預設值。</p><div class="actions"><button onclick="exportBalanceJSON()">匯出測試設定</button><label class="button">匯入測試設定<input type="file" accept=".json" onchange="importBalanceJSON(event)" hidden></label><button onclick="resetBalanceJSON()">恢復預設設定</button><button onclick="closeModal()">關閉</button></div>`;}


// Save validation compatibility for skills appended by a test configuration.
const update09LegacyValidateSave=solo.validateSave;
function dynamicValidateSave(input){return update09LegacyValidateSave(input);}
solo.validateSave=dynamicValidateSave;validateSave=dynamicValidateSave;



// Update 10: fixed-row chronological battle journal with incremental DOM updates.
const BATTLE_LOG_VISIBLE_ROWS=12;
let battleLogGeneration=0;
function battleLogEntryClass(t){return /傷害/.test(t)?'event-damage':/恢復|回復|護盾/.test(t)?'event-heal':'event-loot';}
function lootRarityFromText(t){if(/極稀有|傳說/.test(t))return 3;if(/稀有/.test(t))return 2;if(/精良/.test(t))return 1;if(/獲得 /.test(t))return 0;return null;}
function battleLogTextHTML(t){const rar=lootRarityFromText(t);if(rar===null)return esc(t);const m=String(t).match(/^(.*?獲得(?:極稀有道具：)?\s*)(.*)$/);return m?esc(m[1])+`<span class="loot-rarity-${rar}">${esc(m[2])}</span>`:esc(t);}
function battleLogRowsHTML(){
 const ordered=logs.slice().reverse(), blanks=Math.max(0,BATTLE_LOG_VISIBLE_ROWS-ordered.length);
 return Array.from({length:blanks},()=>'<div class="battle-log-line battle-log-empty" aria-hidden="true">&nbsp;</div>').join('')+ordered.map(t=>`<div class="battle-log-line ${battleLogEntryClass(t)}">${battleLogTextHTML(t)}</div>`).join('');
}
logContent=function(){return `<div class="row battle-log-head"><h2>戰鬥紀錄</h2><span class="tag battle-log-round">回合 ${round}</span></div><div class="battle-log-stream" role="log" aria-live="polite" aria-label="戰鬥紀錄">${battleLogRowsHTML()}</div>`;};
function isBattleLogAtBottom(stream){
 return !stream||stream.scrollHeight-stream.clientHeight-stream.scrollTop<=2;
}
function ensureBattleLogScrollState(stream){
 if(!stream||stream.dataset.scrollStateReady==='1')return;
 stream.dataset.scrollStateReady='1';
 stream.dataset.autoScroll='1';
 stream.addEventListener('scroll',()=>{
  stream.dataset.autoScroll=isBattleLogAtBottom(stream)?'1':'0';
 },{passive:true});
}
function forceBattleLogBottom(stream){
 if(!stream)return;
 ensureBattleLogScrollState(stream);
 stream.dataset.autoScroll='1';
 const pin=()=>{stream.scrollTop=Math.max(0,stream.scrollHeight-stream.clientHeight);};
 pin();
 queueMicrotask(pin);
 requestAnimationFrame(()=>{pin();requestAnimationFrame(pin);});
}
function scrollBattleLogToBottom(root=document){
 const streams=[];
 if(root?.matches?.('.battle-log-stream'))streams.push(root);
 root?.querySelectorAll?.('.battle-log-stream').forEach(stream=>streams.push(stream));
 streams.forEach(forceBattleLogBottom);
}
function appendBattleLogLine(t){
 document.querySelectorAll('.battle-log-stream').forEach(stream=>{
  ensureBattleLogScrollState(stream);
  const shouldPin=stream.dataset.autoScroll!=='0';
  const oldScrollTop=stream.scrollTop;
  const blank=stream.querySelector('.battle-log-empty');if(blank)blank.remove();
  const line=document.createElement('div');line.className='battle-log-line '+battleLogEntryClass(t);line.innerHTML=battleLogTextHTML(t);stream.appendChild(line);
  const real=[...stream.children].filter(el=>!el.classList.contains('battle-log-empty'));
  while(real.length>65){const first=real.shift();first?.remove();}
  if(shouldPin){
   forceBattleLogBottom(stream);
  }else{
   // While the player is reading older entries, keep the scrollbar at the exact
   // position they chose. Do not compensate for old rows pruned from the top,
   // otherwise several new combat messages can walk scrollTop all the way to 0.
   const restore=()=>{
    const max=Math.max(0,stream.scrollHeight-stream.clientHeight);
    stream.scrollTop=Math.min(oldScrollTop,max);
    stream.dataset.autoScroll='0';
   };
   restore();
   queueMicrotask(restore);
   requestAnimationFrame(restore);
  }
 });
}
const stableBattleLogNote=note;
note=function(t){stableBattleLogNote(t);appendBattleLogLine(t);};
const stableBattleLogResetSession=resetSession;
resetSession=function(){battleLogGeneration++;stableBattleLogResetSession();};
function syncBattleLogHeader(live){const tag=live?.querySelector?.('.battle-log-round');if(tag)tag.textContent='回合 '+round;}
function markBattleLogGeneration(live){if(live)live.dataset.logGeneration=String(battleLogGeneration);}
const stableBattleLogRender=render;
render=function(){
 const oldLive=$('liveLog'),canKeep=oldLive&&oldLive.dataset.logGeneration===String(battleLogGeneration);
 stableBattleLogRender();
 const fresh=$('liveLog');
 if(canKeep&&fresh&&fresh!==oldLive){fresh.replaceWith(oldLive);syncBattleLogHeader(oldLive);}
 else if(fresh){markBattleLogGeneration(fresh);scrollBattleLogToBottom(fresh);}
};
const stableBattleLogRefreshGlobalJournal=refreshGlobalJournal;
refreshGlobalJournal=function(){
 const oldLive=$('liveLog'),canKeep=oldLive&&oldLive.dataset.logGeneration===String(battleLogGeneration);
 stableBattleLogRefreshGlobalJournal();
 const fresh=$('liveLog');
 if(canKeep&&fresh&&fresh!==oldLive){fresh.replaceWith(oldLive);syncBattleLogHeader(oldLive);}
 else if(fresh){markBattleLogGeneration(fresh);scrollBattleLogToBottom(fresh);}
};


// Update 11: JSON-editable hand-written descriptions with mechanics shown separately.
// description is presentation text only; combat values continue to come from structured fields.
const CORE_SKILL_DEFAULT_DESCRIPTIONS=[
 ['以沉重武器震裂地面，正面擊潰敵人。','架起堅固防勢，以護盾吸收來襲傷害。','抓住敵人攻勢的空隙，順勢追加一次反擊。','以兇猛重擊奪取敵人的生命力補充自身。','凝聚聖鋼之力，向敵人降下沉重裁決。','在持續作戰中激發意志，為自身形成護盾。'],
 ['射出凝聚火焰的魔法箭，灼穿眼前的敵人。','展開冰霜護幕，以護盾隔絕來襲傷害。','讓殘留的魔力驟然引爆，追加猛烈的法術攻勢。','以奧術迴路抽取敵人的生命力，回補自身。','召來高空隕星，以龐大魔力轟擊戰場。','讓殘存魔力再次共鳴，形成追加的法術打擊。'],
 ['以強勁箭矢貫穿目標，迅速壓制敵人。','藉由短暫喘息恢復傷勢，維持遠征節奏。','趁普攻命中時連續補上箭矢，延續攻勢。','鎖定獵物的破綻，在射擊間追加精準打擊。','引導疾風化作箭雨，覆蓋前方敵群。','將生命之力附著於箭矢，命中後回補自身。'],
 ['以聖光審判敵人，將信念化為直接攻勢。','以禱言治癒傷勢，優先扶起最需要支援的隊友。','在普通攻擊間引發聖光懲戒，追加神聖打擊。','喚起持續湧出的生命力，為受傷隊友提供治療。','刻下黎明聖印，以耀眼聖光壓制敵人。','以神聖力量庇護自身，形成護盾。']
];
const SUPPORT_SKILL_DEFAULT_DESCRIPTIONS=[
 ['以戰吼鼓舞隊伍，讓全員更積極地發動攻勢。','將守護誓言施加在最危急的隊友身上，替其承受壓力。','以怒吼動搖敵方防線，讓整個敵群更容易受到傷害。'],
 ['讓奧術能量在隊伍間共鳴，強化技能的發揮。','干擾敵人的時間感，使整個敵群的攻勢變得遲滯。','在集火目標上留下元素印記，放大後續攻擊的效果。'],
 ['以鷹眼般的視野指引隊伍，提高抓住致命破綻的機會。','標記目前鎖定的獵物，使隊伍更容易對其造成有效傷害。','以流動氣流環繞隊伍，減輕敵方攻擊造成的壓力。'],
 ['以晨光祝福全隊，讓生命力在戰鬥中持續回流。','將聖光集中在最危急的隊友身上，形成強力庇護。','向全隊獻上祈願，鼓舞眾人的攻擊意志。']
];
function ensureDescriptionMeta(){
 CLASSES.forEach((c,job)=>c.skills.forEach((sk,i)=>{if(!sk[6]||typeof sk[6]!=='object'||Array.isArray(sk[6]))sk[6]={};if(typeof sk[6].description!=='string')sk[6].description=CORE_SKILL_DEFAULT_DESCRIPTIONS[job]?.[i]||'';}));
 SUPPORT.forEach((list,job)=>list.forEach((sk,i)=>{if(typeof sk.description!=='string')sk.description=SUPPORT_SKILL_DEFAULT_DESCRIPTIONS[job]?.[i]||'';}));
 SHOP.forEach(item=>{if(typeof item.description!=='string')item.description=defaultShopDescription(item);item.desc=item.description;});
}
function defaultShopDescription(item){const element=ELEMENTS[item.element]||'';if(item.type==='imbue')return `讓武器暫時附著${element}之力，調整普通攻擊的屬性。`;if(item.type==='ward')return `以${element}之力形成短暫防護，降低對應屬性的威脅。`;if(item.type==='elementTonic')return `強化對${element}之力的運用，使對應屬性的攻勢更加集中。`;return '遠征途中可使用的消耗道具。';}
ensureDescriptionMeta();

function coreSkillFlavor(job,i){return CLASSES[job]?.skills?.[i]?.[6]?.description||'';}
function coreSkillTargetText(sk){const meta=sk?.[6]||{};if(sk?.[5]==='heal')return '生命比例最低的存活隊員';if(sk?.[5]==='shield')return '自己';if(meta.target==='enemies'||Number(meta.maxTargets)>=99)return '全部存活敵人';const n=Math.max(1,Math.floor(Number(meta.maxTargets)||1));return n===1?'1 名敵人':`隨機 ${n} 名敵人`;}
function coreSkillDetail(job,i,h=state){const sk=CLASSES[job]?.skills?.[i];if(!sk)return '';const old=state;if(h&&h!==state)state=h;let power=0,cdText='',proc=0;try{power=Math.round(skillPower(i,h)*100);if(sk[1]==='active')cdText=`冷卻 ${skillCooldown(i,h)} 回合`;else{proc=Math.round(procChance(i,h)*100);cdText=`普攻觸發率 ${proc}% · 冷卻 無`;}}finally{state=old;}const effectLabel={damage:'傷害倍率',heal:'治療倍率',shield:'護盾倍率',drain:'傷害／吸血倍率'}[sk[5]]||'效果倍率';return `${ELEMENTS[coreSkillElement(job,i)]}屬性 · ${effectLabel} ${power}% · 目標 ${coreSkillTargetText(sk)} · ${cdText} · 需求 LV${sk[2]}${skillRequiresAdvanced(sk,i)?'／二轉':''}`;}
function supportSkillDetail(job,i,h=state){const sk=SUPPORT[job]?.[i];if(!sk)return '';const level=Math.max(1,h?.supportLevels?.[i]||1),value=+((sk.value+Math.max(0,level-1)*(Number.isFinite(sk.effectPerLevel)?sk.effectPerLevel:GS('skills.support.effectPerExtraLevel',.2)))*100).toFixed(1);return `${ELEMENTS[sk.element]}屬性 · 目標 ${TARGET_NAMES[sk.target]} · ${EFFECT_NAMES[sk.kind]} ${value}% · 持續 ${sk.duration} 戰鬥回合 · 冷卻 ${sk.cooldown} 回合 · 需求 LV${sk.level}${i===2?'／二轉':''}`;}
function supplyDetail(item){const effect=item.type==='imbue'?`普通攻擊轉為${ELEMENTS[item.element]}屬性`:item.type==='ward'?`${ELEMENTS[item.element]}屬性傷害減少 25%`:item.type==='elementTonic'?`${ELEMENTS[item.element]}屬性傷害增加 20%`:'依道具效果生效';return `${effect} · ${item.duration?`持續 ${item.duration} 回合`:'立即生效'} · 單價 ${item.cost} 金幣`;}
// Keep legacy callers useful, but return only the hand-written description.
skillDescription=function(i){return esc(coreSkillFlavor(state.job,i));};

coreSkillRows=function(){syncHeroSkillArrays(state);const activeSlots=Array.from({length:2},(_,i)=>state.active?.[i]??null);return `<div class="actions active-slot-summary">${activeSlots.map((id,i)=>`<span>槽 ${i+1}：${id===null?'未配置':esc(CLASSES[state.job].skills[id]?.[0]||'未知技能')+skillTypeBadges(state.job,id)} <button onclick="clearActiveSkill(${i})">清空</button></span>`).join('')}</div><div class="skill-list">${CLASSES[state.job].skills.map((sk,i)=>{const advanced=skillRequiresAdvanced(sk,i),prereqMet=skillPrerequisitesMet(sk,state),locked=state.lv<sk[2]||(advanced&&!state.advanced)||!prereqMet,gem=state.sockets[i]??null;return `<article class="skill-list-row"><div><div class="skill-list-title"><b>${esc(sk[0])}</b><span>Lv.${state.skills[i]}/${RULES.skillMax}</span><span>${sk[1]==='proc'?'普攻觸發':'主動'}</span></div>${skillTypeBadges(state.job,i)}${skillMechanicsDetails(state.job,i)}<p class="skill-flavor"><b>說明：</b>${esc(coreSkillFlavor(state.job,i))||'<span class="small">尚未填寫</span>'}</p><p class="skill-detail"><b>詳細：</b>${esc(coreSkillDetail(state.job,i,state))}</p></div><div class="skill-list-controls"><button onclick="learn(${i})" ${locked||state.sp<1||state.skills[i]>=skillCap()?'disabled':''}>${locked?'尚未解鎖':state.skills[i]?'升級1點':'學習'}</button>${sk[1]==='active'?[0,1].map(slot=>`<button onclick="equipSkill(${i},${slot})" ${!state.skills[i]?'disabled':''}>${state.active[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join(''):'<span>需配置於觸發槽</span>'}<label>寶石 <select aria-label="${esc(sk[0])}寶石" onchange="socket(${i},this.value)" ${!state.skills[i]?'disabled':''}><option value="-1" ${gem===null?'selected':''}>不鑲嵌</option>${GEMS.map((g,j)=>`<option value="${j}" ${gem===j?'selected':''} ${state.gems[j]<1&&gem!==j?'disabled':''}>${esc(g.name)} ×${state.gems[j]} · ${esc(g.desc)}</option>`).join('')}</select></label></div></article>`;}).join('')}</div>`;};
supportSkillRows=function(){return `<div class="actions">${state.supportSlots.map((id,i)=>`<span>槽 ${i+1}：${id===null?'未配置':esc(SUPPORT[state.job][id].name)+skillTypeBadges(state.job,id,'support')} <button onclick="slotSupport(null,${i})">清空</button></span>`).join('')}</div><div class="skill-list">${SUPPORT[state.job].map((sk,i)=>`<article class="skill-list-row"><div><div class="skill-list-title"><b>${esc(sk.name)}</b><span>Lv.${state.supportLevels[i]}/${Math.max(1,Math.floor(GS('skills.support.maxLevel',5)))}</span><span>${ELEMENTS[sk.element]}</span></div>${skillTypeBadges(state.job,i,'support')}${skillMechanicsDetails(state.job,i,'support')}<p class="skill-flavor"><b>說明：</b>${esc(sk.description||'')||'<span class="small">尚未填寫</span>'}</p><p class="skill-detail"><b>詳細：</b>${esc(supportSkillDetail(state.job,i,state))}</p></div><div class="skill-list-controls"><button onclick="learnSupport(${i})" ${state.sp<1||state.supportLevels[i]>=Math.max(1,Math.floor(GS('skills.support.maxLevel',5)))||state.lv<sk.level||i===2&&!state.advanced?'disabled':''}>${state.supportLevels[i]?'升級1點':'學習'}</button>${[0,1].map(slot=>`<button onclick="slotSupport(${i},${slot})" ${state.supportLevels[i]?'':'disabled'}>${state.supportSlots[slot]===i?'已配置槽':'設為槽'} ${slot+1}</button>`).join('')}</div></article>`).join('')}</div>`;};

const update11DefaultItemShape=SHOP.map(item=>({id:item.id,type:item.type,element:item.element??null}));
function normalizeDescriptionBalance(input){const data=JSON.parse(JSON.stringify(input));if(Array.isArray(data.items))data.items=data.items.filter(item=>item?.id!=='mana'&&item?.type!=='mana');if(Array.isArray(data.classes))data.classes.forEach((c,job)=>{if(Array.isArray(c?.skills))c.skills.forEach((sk,i)=>{if(typeof sk.description!=='string')sk.description=coreSkillFlavor(job,i)||'';});});if(Array.isArray(data.supportSkills))data.supportSkills.forEach((list,job)=>{if(Array.isArray(list))list.forEach((sk,i)=>{if(typeof sk.description!=='string')sk.description=SUPPORT[job]?.[i]?.description||SUPPORT_SKILL_DEFAULT_DESCRIPTIONS[job]?.[i]||'';});});if(!Array.isArray(data.items))data.items=SHOP.map(item=>{const {desc,...rest}=item;return {...rest,description:item.description||desc||''};});return data;}
function validateDescriptionItems(items){
 if(!Array.isArray(items))throw Error('道具資料無效');
 // 治療藥水屬於可由平衡編輯器新增的動態品項。這段驗證會在後續
 // 治療藥水模組安裝前執行，因此啟動時就必須先接受並保留它們，
 // 否則自訂藥水的 balance JSON 會在讀取角色存檔前被當成無效設定清除。
 const fixed=items.filter(item=>item?.type!=='healPotion'),heals=items.filter(item=>item?.type==='healPotion');
 if(fixed.length!==update11DefaultItemShape.length)throw Error('道具資料無效');
 const expected=new Map(update11DefaultItemShape.map(x=>[x.id,x])),seen=new Set();
 for(const item of fixed){
  const base=expected.get(item?.id);
  if(!base||seen.has(item.id)||typeof item.name!=='string'||typeof item.description!=='string'||item.type!==base.type||(item.element??null)!==base.element||!Number.isFinite(item.cost)||item.cost<0||!Number.isFinite(item.duration??0)||(item.duration??0)<0)throw Error('道具資料無效：'+(item?.id||'未知'));
  seen.add(item.id);
 }
 for(const item of heals){
  if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(item.id)||seen.has(item.id)||typeof item.name!=='string'||!item.name.trim()||typeof item.description!=='string')throw Error('治療藥水基本資料無效：'+(item?.id||'未知'));
  seen.add(item.id);
  if(item.element!==undefined&&item.element!==null&&item.element!=='')throw Error('治療藥水不可設定元素：'+item.id);
  if(!Number.isFinite(item.cost)||item.cost<0||!Number.isFinite(item.healFraction)||item.healFraction<=0||item.healFraction>1||!Number.isInteger(item.cooldown)||item.cooldown<0||item.cooldown>99||!Number.isInteger(item.duration??0)||(item.duration??0)!==0)throw Error('治療藥水數值無效：'+item.id);
  if(item.sellPrice!==undefined&&(!Number.isFinite(item.sellPrice)||item.sellPrice<0))throw Error('治療藥水賣價無效：'+item.id);
 }
 return items;
}
const update11ExportableBalance=exportableBalance;
exportableBalance=function(){ensureDescriptionMeta();const data=update11ExportableBalance();data.notes=[...(data.notes||[]),'description 為完全手寫的顯示文字，不參與技能或道具效果計算。','技能的倍率、目標數、冷卻、觸發率等「詳細」文字由結構化參數自動產生，不要把這些數值重複寫進 description。','items 為商店消耗道具；description 可自由改寫，實際效果仍依 type / element / duration 等欄位與既有機制執行。'];data.classes.forEach((c,job)=>c.skills.forEach((sk,i)=>sk.description=coreSkillFlavor(job,i)));data.supportSkills=SUPPORT.map((list,job)=>list.map((sk,i)=>({id:`job${job}-support${i}`,...sk,description:sk.description||''})));data.items=SHOP.map(item=>{const {desc,...rest}=item;return {...rest,description:item.description||desc||''};});return data;};
const update11ApplyBalanceConfig=applyBalanceConfig;
applyBalanceConfig=function(input,{persist=true}={}){const data=normalizeDescriptionBalance(input);validateDescriptionItems(data.items);update11ApplyBalanceConfig(data,{persist:false});data.classes.forEach((c,job)=>c.skills.forEach((source,i)=>{const sk=CLASSES[job]?.skills?.[i];if(!sk)return;if(!sk[6]||typeof sk[6]!=='object'||Array.isArray(sk[6]))sk[6]={};sk[6].description=source.description||'';}));SUPPORT.forEach((list,job)=>list.forEach((sk,i)=>{sk.description=data.supportSkills?.[job]?.[i]?.description||'';}));replaceArray(SHOP,data.items.map(item=>{const copy={...item};copy.desc=copy.description||'';return copy;}));if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(data));if(state)render();};
const UPDATE11_DEFAULT_BALANCE=JSON.parse(JSON.stringify(exportableBalance()));
resetBalanceJSON=function(){localStorage.removeItem(BALANCE_KEY);applyBalanceConfig(UPDATE11_DEFAULT_BALANCE,{persist:false});toast('已恢復 HTML 內建預設設定');};
unlockBalanceTools=function(){const input=$('balance-tools-password');if(!input||input.value!=='781206')return toast('密碼錯誤');$('modal').innerHTML=`<h2>測試設定 JSON</h2><p class="small">可匯出／匯入完整測試設定。<b>balance</b> 會實際改變全域戰鬥與詞條參數，<b>_reference</b> 是中文代碼對照且不參與計算。技能與商店道具的 description 是完全手寫說明。</p><div class="actions"><button onclick="exportBalanceJSON()">匯出測試設定</button><label class="button">匯入測試設定<input type="file" accept=".json" onchange="importBalanceJSON(event)" hidden></label><button onclick="resetBalanceJSON()">恢復預設設定</button><button onclick="closeModal()">關閉</button></div>`;};
// Final shop renderer: hand-written description and generated mechanics are separate.
shopView=function(){ensureMarket();const h=pageHero('shop');return `<div class="actions"><button onclick="showTestCodes()">兌換碼</button></div>`+heading('SUPPLIES / 全隊共用','商店')+pageSelector('shop')+`<section class="panel shared-shop-info"><b>道具使用對象：${esc(characterName(h))} · ${h.gold} 金幣</b>${uiHelp('補給說明','購買扣除帳號金幣，使用效果只施加到選取角色。附魔、抗性、增幅各保留一種；同類覆蓋，不同類可並存。消耗品效果以戰鬥回合計時；只有角色出戰的實際戰鬥回合會扣減，暫停或關閉遊戲不會消耗回合。')}<div class="actions">${ownerControls(`<button onclick="buyPotion()" ${h.gold<GS('quests.potion.buyCost',75)?'disabled':''}>治療藥水 +${Math.round(GS('quests.potion.buyQuantity',5))}／${Math.round(GS('quests.potion.buyCost',75))} 金幣</button><button onclick="potion()" ${h.potions<1?'disabled':''}>使用治療藥水（共用 ${h.potions}）</button>`,h.job)}</div><p class="supply-countdown" data-job="${h.job}">${supplyStatus(h)||'目前無消耗品效果'}</p></section><div class="actions market-refresh"><span>素材商品 · 第 ${party.market.serial} 批</span><button onclick="refreshMarket()">刷新商店 · ${MARKET_REFRESH_COST} 金幣</button></div><div class="shared-shop-grid">${marketCards()}${SHOP.map(item=>`<article class="card"><h3>${esc(item.name)}</h3><p class="item-flavor"><b>說明：</b>${esc(item.description||item.desc||'')}</p><p class="item-detail small"><b>詳細：</b>${esc(supplyDetail(item))}</p><div class="row"><span>共用 ${h.consumables[item.id]||0} 瓶</span><span>${item.cost} 金幣</span></div><div class="actions">${ownerControls(`<button onclick="buySupply('${item.id}')" ${h.gold<item.cost?'disabled':''}>購買</button><button onclick="useSupply('${item.id}')" ${!h.consumables[item.id]?'disabled':''}>對${esc(characterName(h))}使用</button>`,h.job)}</div></article>`).join('')}</div>`;};


// Update 12: gameplay values formerly fixed in HTML are now exported/imported under balanceSettings.
const GAMEPLAY_SETTINGS_DEFAULTS={"progression":{"xpCurve":{"base":45,"linear":18,"quadratic":2,"multiplierBase":2.2,"multiplierPerLevel":0.16},"starting":{"gold":150,"ore":12,"dust":0,"skillPoints":2,"abilityPoints":0,"potions":5},"levelCaps":{"beforeClear":30,"afterClear":60},"levelRewards":{"abilityPoints":3,"skillPoints":2},"statsPerLevel":{"hp":20,"attack":4,"defense":2},"statsPerPoint":{"hp":12,"attack":2,"defense":1.3},"baseCrit":{"default":0.07,"archer":0.17},"advance":{"level":15,"gold":500,"ore":20,"materialCount":3,"hpMultiplier":1.18,"attackMultiplier":1.22,"defenseMultiplier":1.15},"regionTierLevels":5,"mapAheadAllowance":5},"skills":{"core":{"maxLevel":10,"initialCap":2,"capLevelsPerStep":3,"effectPerExtraLevel":0.4},"proc":{"baseChance":0.22,"perSkillLevel":0.025},"support":{"maxLevel":5,"effectPerExtraLevel":0.2},"gems":{"craftDust":12,"effectMultiplier":1.18,"cooldownReduction":1,"cooldownProcBonus":0.1,"hybridMultiplier":1.1,"hybridProcBonus":0.05,"hybridActiveHealAttack":0.15}},"equipment":{"bagCapacity":720,"requiredLevel":{"base":1,"perTier":5},"baseStats":{"weaponAttackPerTier":11,"armorHpPerTier":45,"armorDefensePerTier":4,"accessoryAttackPerTier":4,"accessoryHpPerTier":20},"enhance":{"maxLevel":10,"statPerLevel":0.12,"orePerTierPerLevel":2,"dustStartLevel":6,"dustPerTierPerLevelAboveStart":1,"etherStartLevel":10,"etherCost":1},"salvage":{"oreBasePerTier":3,"orePerQualityPerTier":2,"orePerEnhancePerTier":1,"dustBase":1,"dustPerQuality":1},"lootOwnerSameJobChance":0.75,"boss":{"powerByDifficulty":[1,1.25,1.55],"skillEffectByDifficulty":[30,40,55],"affixRankByDifficulty":[2,2,3],"craftGoldPerTier":250,"craftMaterialCount":5},"difficultyAffix":{"hardChance":0.65,"hellChance":0.9,"hardFineThreshold":0.7,"hardRareThreshold":0.95,"hellFineThreshold":0.35,"hellRareThreshold":0.85,"skillChance":0.4,"baseAttackPerTier":5,"baseHpPerTier":25,"defenseBasePerTier":3,"defensePerRankPerTier":1,"critBase":4,"critPerRank":3}},"monsters":{"encounter":{"bossChance":0.05,"eliteChance":0.12},"normal":{"hpBase":42,"hpPerLevel":15,"hpQuadratic":0.7,"attackBase":8,"attackPerLevel":3.3,"defensePerLevel":1.7},"kindMultipliers":{"bossHp":3,"eliteHp":1.65,"bossAttack":1.45,"eliteAttack":1.2},"finalBoss":{"level":40,"hp":180000,"attack":1000,"defense":110},"awakened":{"threshold":30,"hpBaseMultiplier":2,"hpPerLevel":0.1,"attackBaseMultiplier":2,"attackPerLevel":0.06,"defenseMultiplier":1.6}},"difficulty":{"modes":[{"hp":1,"attack":1,"defense":1,"reward":1,"equipmentChance":[0.22,0.55,1],"gemChance":[0.04,0.12,0.35],"bossGearChance":0.25,"ore":1,"legendaryGearChance":0.0015},{"hp":1.8,"attack":1.35,"defense":1.2,"reward":1.3,"equipmentChance":[0.38,0.75,1],"gemChance":[0.08,0.22,0.5],"bossGearChance":0.4,"ore":1.5,"legendaryGearChance":0.004},{"hp":3,"attack":1.8,"defense":1.45,"reward":1.65,"equipmentChance":[0.55,0.95,1],"gemChance":[0.13,0.35,0.7],"bossGearChance":0.6,"ore":2,"legendaryGearChance":0.008}],"materialChance":[0.65,0.8,0.95]},"rewards":{"kindMultiplier":{"normal":1,"elite":1.7,"boss":3},"gold":{"base":12,"perLevel":4},"xp":{"base":15,"perLevel":6},"ore":{"normalKindMultiplier":1,"eliteBossKindMultiplier":3},"equipmentQuality":{"rareChance":0.18,"fineConditionalChance":0.45},"potionDropChance":0.08,"postVictoryHeal":0.12,"radiant":{"normalElite":0.0005,"bossFinal":0.01},"ether":{"eliteBase":0.05,"elitePerTier":0.02,"eliteCap":0.3,"bossRepeat":0.05,"firstBossMin":1,"firstBossMax":2}},"combat":{"defenseEffectiveness":0.65,"baseCritDamage":1.5,"caps":{"fracture":0.75,"guard":0.75,"weaken":0.7,"resistance":0.75},"levelGapDamagePerLevel":0.12,"finalBoss":{"enrageAfterTurn":45,"enrageMultiplier":4,"specialEveryTurns":5,"specialMultiplier":1.65},"autoPotionThreshold":0.35,"defeatGoldLoss":0.05,"groupSize":{"min":3,"max":6},"speed":{"heroBase":[102,108,116,96],"heroPerLevel":0.5,"bonusCap":5,"evasionWeight":10,"critWeight":5,"enemyBase":106,"enemyPerLevel":0.5,"race":{"beast":5,"plant":-4,"undead":-2,"construct":-5,"demon":3,"spirit":4},"kind":{"normal":0,"elite":2,"boss":4,"final":6},"difficultyBonus":2},"pacing":{"actionIntervalMs":900,"roundMinimumMs":6000,"rates":[1,2,4]},"supply":{"wardResistance":0.25,"elementTonicDamage":0.2}},"quests":{"tutorial":{"killRequirement":3,"skillLevelRequirement":2,"rewardGold":100,"rewardOre":10,"armorTier":1,"armorSlot":1,"armorQuality":1},"side":[{"required":5,"gold":300,"ore":20,"gem":1},{"required":2,"gold":800,"ore":55,"gem":1},{"required":3,"gold":2000,"ore":120,"gem":1}],"repeat":{"required":8,"goldPerTier":150,"ore":15,"dust":3,"gem":1},"board":{"refreshMinutes":20,"refreshGoldPerTier":150,"taskBase":8,"taskRandomRange":9,"taskPerTier":2,"goldPerTier":180,"orePerTier":8,"gemReward":2,"legendaryGearChance":0.2},"market":{"refreshCost":100,"offerCount":6,"oreMin":8,"oreRandomRange":13,"dustMin":3,"dustRandomRange":6,"gemMin":1,"gemRandomRange":2,"materialMin":3,"materialRandomRange":4,"oreUnit":12,"dustUnit":25,"gemUnit":180,"materialUnitPerTier":60},"potion":{"healFraction":0.45,"buyCost":75,"buyQuantity":5}}};
GAMEPLAY_SETTINGS_DEFAULTS.equipment.baseStats.offhandAttackPerTier??=GAMEPLAY_SETTINGS_DEFAULTS.equipment.baseStats.accessoryAttackPerTier;GAMEPLAY_SETTINGS_DEFAULTS.equipment.baseStats.offhandHpPerTier??=GAMEPLAY_SETTINGS_DEFAULTS.equipment.baseStats.accessoryHpPerTier;
GAMEPLAY_SETTINGS_DEFAULTS.maps={levelRanges:MAPS.map(m=>({min:m.min,max:m.max}))};
function cloneGameplaySettings(v){return JSON.parse(JSON.stringify(v));}
function mergeGameplayShape(def,src){
  if(Array.isArray(def))return def.map((v,i)=>mergeGameplayShape(v,Array.isArray(src)?src[i]:undefined));
  if(def&&typeof def==='object'){const out={};for(const k of Object.keys(def))out[k]=mergeGameplayShape(def[k],src&&typeof src==='object'?src[k]:undefined);return out;}
  if(typeof def==='number')return typeof src==='number'&&Number.isFinite(src)?src:def;
  return typeof src===typeof def?src:def;
}
function gameplayAt(root,path){return String(path).split('.').reduce((v,k)=>v?.[k],root);}
function validateGameplaySettings(cfg){
  const probs=[
   'equipment.lootOwnerSameJobChance','equipment.difficultyAffix.hardChance','equipment.difficultyAffix.hellChance','equipment.difficultyAffix.hardFineThreshold','equipment.difficultyAffix.hardRareThreshold','equipment.difficultyAffix.hellFineThreshold','equipment.difficultyAffix.hellRareThreshold','equipment.difficultyAffix.skillChance',
   'monsters.encounter.bossChance','monsters.encounter.eliteChance','rewards.equipmentQuality.rareChance','rewards.equipmentQuality.fineConditionalChance','rewards.potionDropChance','rewards.postVictoryHeal','rewards.radiant.normalElite','rewards.radiant.bossFinal','rewards.ether.eliteBase','rewards.ether.elitePerTier','rewards.ether.eliteCap','rewards.ether.bossRepeat','combat.autoPotionThreshold','combat.defeatGoldLoss','combat.supply.wardResistance','combat.supply.elementTonicDamage'
  ];
  for(const p of probs){const n=gameplayAt(cfg,p);if(!Number.isFinite(n)||n<0||n>1)throw Error('平衡設定機率需介於 0~1：'+p);}
  for(const mode of cfg.difficulty.modes)for(const p of [...mode.equipmentChance,...mode.gemChance,mode.bossGearChance,mode.legendaryGearChance])if(!Number.isFinite(p)||p<0||p>1)throw Error('難度掉落率需介於 0~1');
  for(const p of cfg.difficulty.materialChance)if(!Number.isFinite(p)||p<0||p>1)throw Error('素材掉落率需介於 0~1');
  if(cfg.monsters.encounter.bossChance+cfg.monsters.encounter.eliteChance>1)throw Error('BOSS 與菁英遭遇率合計不可超過 1');
  if(cfg.combat.groupSize.min<1||cfg.combat.groupSize.max<cfg.combat.groupSize.min)throw Error('群怪數量範圍無效');
  if(cfg.equipment.enhance.maxLevel<0||!Number.isInteger(cfg.equipment.enhance.maxLevel))throw Error('強化上限必須是非負整數');
  if(cfg.progression.levelCaps.beforeClear<1||cfg.progression.levelCaps.afterClear<cfg.progression.levelCaps.beforeClear)throw Error('等級上限設定無效');
  if(cfg.rewards.ether.firstBossMax<cfg.rewards.ether.firstBossMin)throw Error('首次 BOSS 以太鍛鐵範圍無效');
  cfg.maps.levelRanges.forEach((m,i)=>{if(!Number.isFinite(m.min)||!Number.isFinite(m.max)||m.min<1||m.max<m.min)throw Error('地圖等級範圍無效：'+i);});
  return cfg;
}
function normalizeGameplaySettings(input){return validateGameplaySettings(mergeGameplayShape(GAMEPLAY_SETTINGS_DEFAULTS,input||{}));}
let GAMEPLAY_SETTINGS=normalizeGameplaySettings();
globalThis.__EMBERWILD_GAMEPLAY_SETTINGS=GAMEPLAY_SETTINGS;
function applyGameplaySettingsSideEffects(){
  const g=GAMEPLAY_SETTINGS;
  BOARD_INTERVAL=Math.max(1000,g.quests.board.refreshMinutes*60000);
  MARKET_REFRESH_COST=Math.max(0,Math.round(g.quests.market.refreshCost));
  g.difficulty.modes.forEach((m,i)=>{if(!MODES[i])return;Object.assign(MODES[i],{hp:m.hp,atk:m.attack,def:m.defense,xp:m.reward,equip:[...m.equipmentChance],gem:[...m.gemChance],boss:m.bossGearChance,ore:m.ore,rare:m.legendaryGearChance});});
  g.maps.levelRanges.forEach((r,i)=>{if(MAPS[i]){MAPS[i].min=Math.max(1,Math.round(r.min));MAPS[i].max=Math.max(MAPS[i].min,Math.round(r.max));}});
  g.quests.side.forEach((q,i)=>{if(QUESTS[i])Object.assign(QUESTS[i],{n:Math.max(1,Math.round(q.required)),gold:Math.max(0,Math.round(q.gold)),ore:Math.max(0,Math.round(q.ore))});});
  GEMS[0].desc='技能效果 +'+Math.round((g.skills.gems.effectMultiplier-1)*10000)/100+'%';
  GEMS[1].desc='主動冷卻 −'+g.skills.gems.cooldownReduction+' 回合／觸發率 +'+Math.round(g.skills.gems.cooldownProcBonus*10000)/100+'%';
  GEMS[2].desc='技能效果 +'+Math.round((g.skills.gems.hybridMultiplier-1)*10000)/100+'%，觸發率 +'+Math.round(g.skills.gems.hybridProcBonus*10000)/100+'%／施放時回復攻擊力 '+Math.round(g.skills.gems.hybridActiveHealAttack*10000)/100+'% 生命';
  for(const item of SHOP){if(item.type==='ward')item.desc='承受此屬性傷害減少 '+Math.round(g.combat.supply.wardResistance*10000)/100+'%';if(item.type==='elementTonic')item.desc='此屬性傷害增加 '+Math.round(g.combat.supply.elementTonicDamage*10000)/100+'%';}
}
applyGameplaySettingsSideEffects();

const update12ExportableBalance=exportableBalance;
exportableBalance=function(){const data=update12ExportableBalance();data.balanceSettings=cloneGameplaySettings(GAMEPLAY_SETTINGS);data.notes=[...(data.notes||[]),'balanceSettings 為原先寫死在 HTML 的遊戲平衡數值；缺少欄位時使用 HTML 內建預設值。'];return data;};
const update12ValidateBalanceConfig=validateBalanceConfig;
validateBalanceConfig=function(input){const copy=JSON.parse(JSON.stringify(input));copy.balanceSettings=normalizeGameplaySettings(copy.balanceSettings);const data=update12ValidateBalanceConfig(copy);data.balanceSettings=copy.balanceSettings;return data;};
const update12ApplyBalanceConfig=applyBalanceConfig;
applyBalanceConfig=function(input,{persist=true}={}){
  const copy=JSON.parse(JSON.stringify(input));copy.balanceSettings=normalizeGameplaySettings(copy.balanceSettings);
  const result=update12ApplyBalanceConfig(copy,{persist:false});
  GAMEPLAY_SETTINGS=cloneGameplaySettings(copy.balanceSettings);globalThis.__EMBERWILD_GAMEPLAY_SETTINGS=GAMEPLAY_SETTINGS;applyGameplaySettingsSideEffects();
  if(persist)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));
  if(state)render();return result;
};

/* mastery-overhaul-preload-v1: make new learned-skill saves valid before late modules hydrate. */
const MASTERY_OVERHAUL_OLD_CORE_LEVELS=[1,4,7,11,15,20],MASTERY_OVERHAUL_CORE_LEVELS=[1,3,5,7,15,20];
const MASTERY_OVERHAUL_OLD_SUPPORT_LEVELS=[1,7,15],MASTERY_OVERHAUL_SUPPORT_LEVELS=[1,4,15];
function migrateMasteryRequiredLevelsDocument(doc){
  if(!doc||typeof doc!=='object')return doc;
  for(const cls of doc.classes||[]){const list=cls?.skills||[];if(list.length>=6&&list.slice(0,6).every((sk,i)=>Number(sk?.requiredLevel)===MASTERY_OVERHAUL_OLD_CORE_LEVELS[i]))for(let i=0;i<6;i++)list[i].requiredLevel=MASTERY_OVERHAUL_CORE_LEVELS[i];}
  for(const list of doc.supportSkills||[]){if(Array.isArray(list)&&list.length===3&&list.every((sk,i)=>Number(sk?.level)===MASTERY_OVERHAUL_OLD_SUPPORT_LEVELS[i]))for(let i=0;i<3;i++)list[i].level=MASTERY_OVERHAUL_SUPPORT_LEVELS[i];}
  doc.balanceSettings??={};doc.balanceSettings.meta??={};doc.balanceSettings.meta.masteryOverhaulVersion=Math.max(1,Number(doc.balanceSettings.meta.masteryOverhaulVersion)||0);
  return doc;
}
function applyMasteryRequiredLevelBootstrap(){
  for(const cls of CLASSES){const list=cls.skills||[];if(list.length>=6&&list.slice(0,6).every((sk,i)=>Number(sk?.[2])===MASTERY_OVERHAUL_OLD_CORE_LEVELS[i]))for(let i=0;i<6;i++)list[i][2]=MASTERY_OVERHAUL_CORE_LEVELS[i];}
  for(const list of SUPPORT){if(Array.isArray(list)&&list.length===3&&list.every((sk,i)=>Number(sk?.level)===MASTERY_OVERHAUL_OLD_SUPPORT_LEVELS[i]))for(let i=0;i<3;i++)list[i].level=MASTERY_OVERHAUL_SUPPORT_LEVELS[i];}
}
applyMasteryRequiredLevelBootstrap();
const masteryPreloadApplyBalanceBase=applyBalanceConfig;
applyBalanceConfig=function(input,options={}){const copy=migrateMasteryRequiredLevelsDocument(JSON.parse(JSON.stringify(input)));return masteryPreloadApplyBalanceBase(copy,options);};

// Load persisted test balance before validating the player save.
try{const savedBalance=localStorage.getItem(BALANCE_KEY);if(savedBalance)applyBalanceConfig(JSON.parse(savedBalance),{persist:false});}catch(e){console.warn('早期測試設定載入失敗，保留原資料並等待後續模組重試',e);}

try{const raw=localStorage.getItem(KEY);globalThis.__EMBERWILD_BOOT_SAVE_RAW=raw;if(raw){loadParty(JSON.parse(raw));note('隊伍存檔已載入。');}}catch(e){state=null;party=null;toast('存檔未能載入：'+e.message+'；可匯入備份。');}
render();window.emberwildBootComplete=true;timer=setInterval(tick,50);setInterval(()=>save(),5000);window.addEventListener('beforeunload',()=>save());

/* Unified equipment quality: equipment itself has no rarity; quality comes from highest affix rank. */
function gearQualityRank(g){return Array.isArray(g.affix)&&g.affix.length?Math.max(...g.affix.map(a=>Math.max(0,Math.min(3,Number(a.rank)||0)))):0;}
equipmentEffectRank=function(g){return gearQualityRank(g);};
equipmentNameClass=function(g){const rank=gearQualityRank(g);return rank===3&&(g.plus||0)>=RULES.enhanceMax?'effect-rainbow':'effect-quality-'+rank;};
equipmentNameHTML=function(g){const rank=gearQualityRank(g);return `<span class="enhanced-name ${equipmentNameClass(g)}" title="最高詞條：${AFFIX_RANK[rank]}；強化 +${g.plus||0}">${esc(equipmentDisplayName(g))}</span>`;};

// Legacy rar is retained only for save compatibility. It no longer changes equipment power or presentation.
gearBaseStats=function(g){const f=(1+(g.plus||0)*.12)*bossPower(g),tier=g.tier;return {atk:g.slot===0?tier*11*f:[2,3].includes(g.slot)?tier*4*f:0,hp:g.slot===1?tier*45*f:[2,3].includes(g.slot)?tier*20*f:0,def:g.slot===1?tier*4*f:0};};
gearDesc=function(g){const p=armorProfile(g),f=(1+(g.plus||0)*.12)*bossPower(g),tier=g.tier;let text=g.slot===0?`攻擊 +${Math.round(tier*11*f)}`:g.slot===1?`生命 +${Math.round(tier*45*f)} / 防禦 +${Math.round(tier*4*f)}`:`攻擊 +${Math.round(tier*4*f)} / 生命 +${Math.round(tier*20*f)}`;return text+(p?' / '+p.name+'加成：'+Object.entries(p).filter(([k])=>k!=='name').map(([k,v])=>({hp:'生命',def:'防禦',crit:'暴擊率',evasion:'閃避率'}[k])+' +'+(['crit','evasion'].includes(k)?+(v*100).toFixed(1)+'%':v)).join('、'):'');};

{
const previousFilters=filters||{};
const normalizedSlot=['all','0','1','2','3'].includes(String(previousFilters.slot))?String(previousFilters.slot):'all';
const normalizedJob=['all','0','1','2','3'].includes(String(previousFilters.job))?String(previousFilters.job):'all';
const normalizedEffectRank=['all','0','1','2','3'].includes(String(previousFilters.effectRank))?String(previousFilters.effectRank):'all';
const normalizedHideEquipped=previousFilters.hideEquipped===true;
filters={slot:normalizedSlot,job:normalizedJob,boss:'all',effectRank:normalizedEffectRank,hideEquipped:normalizedHideEquipped};
}
filteredGear=function(){return state.bag.filter(g=>(filters.slot==='all'||g.slot===Number(filters.slot))&&(filters.job==='all'||gearWearableJobs(g).includes(Number(filters.job)))&&(filters.boss==='all'||(filters.boss==='boss')===(g.boss!==undefined))&&(filters.effectRank==='all'||gearQualityRank(g)===Number(filters.effectRank))&&(!filters.hideEquipped||!gearWearer(g.id))).sort((a,b)=>Number(!!gearWearer(b.id))-Number(!!gearWearer(a.id))||b.tier-a.tier||gearQualityRank(b)-gearQualityRank(a));};
gearFilters=function(){return `<div class="filters"><label>部位<select onchange="setFilter('slot',this.value)">${[['all','全部部位'],[0,'武器'],[1,'護甲'],[2,'副手'],[3,'飾品']].map(([v,n])=>`<option value="${v}" ${String(v)===String(filters.slot)?'selected':''}>${n}</option>`).join('')}</select></label><label>職業<select onchange="setFilter('job',this.value)">${[['all','全部職業'],...CLASSES.map((c,i)=>[i,c.name])].map(([v,n])=>`<option value="${v}" ${String(v)===String(filters.job)?'selected':''}>${n}</option>`).join('')}</select></label><label>BOSS裝<select onchange="setFilter('boss',this.value)">${[['all','全部'],['normal','非 BOSS 裝'],['boss','BOSS 專屬裝']].map(([v,n])=>`<option value="${v}" ${String(v)===String(filters.boss)?'selected':''}>${n}</option>`).join('')}</select></label><label>最高詞條<select onchange="setFilter('effectRank',this.value)">${[['all','全部'],...AFFIX_RANK.map((n,i)=>[i,n])].map(([v,n])=>`<option value="${v}" ${String(v)===String(filters.effectRank)?'selected':''}>${n}</option>`).join('')}</select></label><label><input type="checkbox" ${filters.hideEquipped?'checked':''} onchange="setFilter('hideEquipped',this.checked)"> 隱藏已穿戴裝備</label></div>`;};

function qualityTag(g){return `${AFFIX_RANK[gearQualityRank(g)]}${g.boss!==undefined?' · BOSS 專屬':''}`;}
inlineInventoryView=function(){return `<section class="panel">${resourceLine()}${gearFilters()}${bulkSalvageControls()}<div class="inline-equipment-list">${filteredGear().map(g=>{const wearer=gearWearer(g.id),worn=!!wearer,draft=inlineAffixDrafts.has(affixDraftKey(g)),locked=!!g.locked;return `<article class="inline-equipment"><div class="gear-inline-body"><div class="row"><b>${equipmentNameHTML(g)}</b><span class="tag">${qualityTag(g)}${worn?' · '+esc(characterName(wearer))+'已穿戴':''}${locked?' · 已鎖定':''}</span></div><p class="small">${gearWearableJobsText(g)} · ${CLASS_GEAR[g.job][g.slot]} · LV ${gearRequiredLevelByTier(g.tier)}</p><p class="inline-gear-stats equipment-total-summary">${globalThis.equipmentTotalSummaryText(g)}</p>${globalThis.equipmentAttributeDetailsHTML(g)}<div class="actions">${eligibleWearers(g).map(h=>`<button class="primary" onclick="previewEquip('${g.id}',${h.job})" ${h.equipped.includes(g.id)?'disabled':''}>${h.equipped.includes(g.id)?esc(characterName(h))+'已穿戴':'給'+esc(characterName(h))+'穿戴'}</button>`).join('')||'<span class="small">尚無可穿戴角色</span>'}<button onclick="enhance('${g.id}')" ${g.plus>=RULES.enhanceMax||!canEnhance(g)?'disabled':''}>${g.plus>=RULES.enhanceMax?'已達 +'+RULES.enhanceMax:'強化 +'+(g.plus+1)+'／'+upgradeCostText(g)}</button><button onclick="reroll('${g.id}')" ${(()=>{const c=rerollCostFor(g);return draft||state.gold<c.gold||state.ore<c.ore;})()?'disabled':''}>洗鍊／${rerollCostFor(g).gold} 金幣＋${rerollCostFor(g).ore} 鍛鐵</button><button onclick="toggleGearLock('${g.id}')">${locked?'解除鎖定':'鎖定'}</button><button onclick="salvage('${g.id}')" ${worn||draft||locked?'disabled':''}>分解</button></div></div>${inlineAffixComparison(g)}</article>`;}).join('')||'<p>沒有符合篩選的裝備。</p>'}</div></section>`;};

bulkSalvageControls=function(){return `<div class="small">分解範圍：全部背包（不受篩選影響）；依最高詞條品質判定，無詞條視為普通。</div><div class="actions bulk-salvage-actions">${AFFIX_RANK.map((name,rank)=>`<button onclick="requestMassSalvage(${rank})">分解所有${name}</button>`).join('')}</div>${uiHelp('分解規則','已鎖定、已穿戴、待確認洗鍊的裝備不會分解。BOSS 專屬裝備會再次確認。')}`;};
requestMassSalvage=function(rank){if(!Number.isInteger(rank)||rank<0||rank>3)return;const items=massSalvageTargets(state.bag.filter(g=>gearQualityRank(g)===rank).map(g=>g.id));if(!items.length)return toast('沒有可分解的'+AFFIX_RANK[rank]+'裝備');massSalvageIds=items.map(g=>g.id);if(items.some(g=>g.plus>0||g.rerolled||g.affix.length||g.boss!==undefined)){$('modal').innerHTML=`<h2>再次確認批次分解</h2><p>將分解 ${items.length} 件最高詞條為${AFFIX_RANK[rank]}的裝備。含強化、詞條或 BOSS 專屬裝備時請再次確認；分解後無法復原。</p><div class="mass-salvage-list">${items.map(g=>`<p>${equipmentNameHTML(g)}</p>`).join('')}</div><button class="danger" onclick="confirmMassSalvage()">確認全部分解</button><button onclick="massSalvageIds=null;closeModal()">取消</button>`;$('modal').showModal();}else confirmMassSalvage();};
confirmMassSalvage=function(){if(!massSalvageIds)return;const items=massSalvageTargets(massSalvageIds),ids=new Set(items.map(g=>g.id)),bag=state.bag,ore=state.ore,dust=state.dust;for(const g of items){const q=gearQualityRank(g);state.ore+=g.tier*(3+q*2+(g.plus||0));state.dust+=1+q;}state.bag=state.bag.filter(g=>!ids.has(g.id));if(!save()){state.bag=bag;state.ore=ore;state.dust=dust;return;}massSalvageIds=null;pruneGearSelections();closeModal();render();toast('已分解 '+items.length+' 件裝備');};
salvage=function(id){const g=findGear(id);if(!g||g.locked||gearWearer(g.id)||inlineAffixDrafts.has(affixDraftKey(g)))return;const q=gearQualityRank(g);state.ore+=g.tier*(3+q*2+(g.plus||0));state.dust+=1+q;state.bag=state.bag.filter(x=>x.id!==id);pruneGearSelections();save();render();};

addGear=function(g){g.rar=0;const q=gearQualityRank(g);if(state.bag.length>=RULES.bagCapacity){state.ore+=g.tier*(3+q*2);state.dust+=1+q;note('背包已滿，掉落裝備自動分解。');}else{state.bag.push(g);note(`獲得 ${AFFIX_RANK[q]} ${equipmentDisplayName(g)}${g.boss!==undefined?'（BOSS 專屬）':''}`);}};
forgeEquipmentOptions=function(selectedId){const worn=[],spare=[];for(const g of state.bag)(gearWearer(g.id)?worn:spare).push(g);worn.sort((a,b)=>gearWearer(a.id).job-gearWearer(b.id).job||a.slot-b.slot);const option=g=>{const wearer=gearWearer(g.id);return `<option value="${g.id}" ${g.id===selectedId?'selected':''}>${wearer?'【'+esc(characterName(wearer))+'穿戴】':'【'+gearWearableJobsText(g)+'】'} ${esc(equipmentDisplayName(g))} · ${AFFIX_RANK[gearQualityRank(g)]}${g.boss!==undefined?' · BOSS':''}</option>`;};return (worn.length?`<optgroup label="全隊已穿戴（${worn.length}）">${worn.map(option).join('')}</optgroup>`:'')+(spare.length?`<optgroup label="未穿戴（${spare.length}）">${spare.map(option).join('')}</optgroup>`:'');};

// Normalize old saves in memory: legacy equipment rarity no longer has gameplay meaning.
if(state?.bag)state.bag.forEach(g=>g.rar=0);

