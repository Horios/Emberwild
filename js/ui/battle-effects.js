/* Read-only presentation of the existing live timeline. No timers schedule combat.
   Nested scopes checkpoint actual HP/shield/status writes exactly once, including
   heals and procs inside damage resolvers. Offline events never open a frame. */
(()=>{
 'use strict';
 const storageKey='emberwild-battle-effects',choices=['full','simple','off'];
 let preference='full',frame=null,pending=null,owner=null,encounter=null,sequence=0;
 const activeNodes=new Map(),markedNodes=new Set(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 try{const saved=localStorage.getItem(storageKey);if(choices.includes(saved))preference=saved;}catch{}
 const id=u=>u?.job!==undefined?heroKey(u):u?.id;
 const visible=()=>!!party&&running&&tab==='battle'&&!document.hidden&&!$('modal')?.open&&!globalThis.isEmberwildTitleOpen?.()&&!globalThis.EmberwildOffline?.busy&&!party.offlineExploration?.receipt;
 const mode=()=>preference==='full'&&(motion.matches||battleRate>2)?'simple':preference;
 const control=u=>globalThis.__EMBERWILD_CONTROL_TEST_API?.states?.[u.id]||{};
 function shields(u){return Math.max(0,Number(u.shield)||0)+Math.max(0,Number(control(u).polymorph?.shield)||0);}
 function statuses(){
  const rows=new Map(),add=(key,target,polarity,ref)=>rows.set(key,{target,polarity,ref});
  for(const e of effects)if(e.until>partyClock)add(e,e.target,['weaken','fracture','vulnerable','damageAmp','followup','dotAttack','dotMaxHp','skillTaunt','slow'].includes(e.kind)?'debuff':'buff',e);
  for(const e of globalThis.EmberwildStatusCombatState?.pack().active||[])if(e.expiresClock>partyClock&&(e.remainingUses===null||e.remainingUses>0)){
   // Pure controls are represented by their actual control state below. A
   // persisted status record alone does not mean an immune boss was frozen.
   if(e.definition.control&&!e.definition.modifiers?.length&&!e.definition.periodic?.length)continue;
   add(e.id,e.targetKey,globalThis.__EMBERWILD_STATUS_TEST_API.polarity(e.definition),e);
  }
  for(const u of foes)for(const [kind,v] of Object.entries(control(u)))if(v&&(v.turns===undefined||v.turns>0))add(u.id+':'+kind,u.id,'debuff',v);
  return rows;
 }
 function units(){return [...heroes(),...foes];}
 function sample(){return new Map(units().map(u=>[u,{hp:u.hp,shield:shields(u)}]));}
 function enqueue(type,target,extra={}){
  if(!frame||!target)return;
  const key=String(target)+'|'+type;
  // Coalesce repeated multi-hit particles per unit/type, keeping the latest
  // occurrence in resolution order. Later AoE targets and shield breaks survive.
  frame.events.delete(key);
  if(frame.events.size>=256)frame.events.delete(frame.events.keys().next().value);
  frame.events.set(key,{type,target:String(target),source:frame.context.source?String(id(frame.context.source)):null,...extra});
 }
 function attackType(ctx){
  const element=ctx.element;
  if(element&&element!=='physical')return ['fire','ice','lightning','thunder','wind','light','shadow'].includes(element)?(element==='thunder'?'lightning':element):'magic';
  return ctx.ranged?'ranged':element==='physical'?'slash':'impact';
 }
 function checkpoint(){
  if(!frame)return;
  const ctx=frame.context;
  for(const u of units()){
   const before=frame.vitals.get(u),after={hp:u.hp,shield:shields(u)};frame.vitals.set(u,after);if(!before)continue;
   const target=id(u);if(!target)continue;
   if(after.shield>before.shield)enqueue('shield',target);
   if(after.shield<before.shield){
    const hit=ctx.mode==='damage';enqueue(hit?'absorb':'dissolve',target);
    if(hit&&after.shield<=0)enqueue('break',target);
   }
   if(after.hp<before.hp){enqueue(attackType(ctx),target);enqueue('hit',target);}
   else if(after.hp>before.hp)enqueue(ctx.mode==='potion'?'potion':ctx.mode==='damage'||ctx.effect==='drain'?'drain':ctx.mode==='regen'?'regen':'heal',target);
   // A shield-only attack has an impact on the shield, never a red HP hit.

  }
  const next=statuses();
  for(const [key,row] of next)if(frame.statuses.get(key)?.ref!==row.ref&&row.polarity!=='neutral'){
   const unit=units().find(u=>String(id(u))===String(row.target));
   if(unit?.hp>0)enqueue(row.polarity,row.target);
  }
  frame.statuses=next;
 }
 function scope(context,fn){
  if(!frame)return fn();
  checkpoint();const current=frame,old=current.context;current.context={...old,...context};
  try{return fn();}finally{if(frame===current){checkpoint();current.context=old;}}
 }
 function begin(){
  pending=null;
  if(preference==='off'||!visible()){frame=null;return;}
  owner=party;encounter=foes;
  frame={events:new Map(),vitals:sample(),statuses:statuses(),context:{mode:'regen'},at:performance.now(),owner:party,encounter:foes};
 }
 function end(){if(!frame)return;checkpoint();pending=frame;frame=null;}
 function result(type,target,source){if(frame)enqueue(type,id(target),{source:source?id(source):null});}
 function cleanNode(node){const entries=activeNodes.get(node);if(entries)for(const row of entries.values()){clearTimeout(row.timer);row.element.remove();}activeNodes.delete(node);}
 function clear(){frame=null;pending=null;for(const node of activeNodes.keys())cleanNode(node);for(const node of markedNodes){node.querySelector('.battle-fx-status')?.remove();delete node.dataset.fxShield;}markedNodes.clear();owner=null;encounter=null;}
 const colors={slash:'#ffe4bb',ranged:'#ffc166',impact:'#e9b4fa',magic:'#cda5ff',fire:'#ff834d',ice:'#9ee7ff',lightning:'#eeceff',wind:'#a5f0ce',light:'#fff0a5',shadow:'#be8fe9',hit:'#ff796f',heal:'#87efad',regen:'#b3f6c9',potion:'#74e7bd',drain:'#f28ea3',buff:'#f4d58b',debuff:'#c495f0',shield:'#72d9ff',absorb:'#a6edff',break:'#d5f6ff',dissolve:'#89bed9','shield-impact':'#a6edff',evade:'#d1dbe6',resist:'#e8f3ff',cast:'#d1a8ff',attack:'#ffe4bb'};
 const graphics={
  slash:'<path d="M9 49Q20 9 55 12Q30 20 9 49Z" fill="currentColor"/><path d="M10 53L53 10"/>',
  ranged:'<path d="M7 49L53 14M38 14H53V29M9 36L19 46M15 30L25 40"/>',
  fire:'<path d="M32 5C42 24 53 25 48 43C44 58 18 60 14 43C9 29 26 28 25 15L32 27Z" fill="currentColor" stroke="none"/><path d="M32 32Q46 49 30 54Q18 48 32 32" stroke="#ffeab0"/><path d="M9 14L5 6M52 13L58 5M56 42L62 46"/>',
  ice:'<path d="M32 4L43 24L32 58L21 24ZM5 28L20 38L10 55ZM52 26L61 42L46 55Z"/><path d="M4 14L15 20M50 8L45 18"/>',
  lightning:'<path d="M40 3L15 33L32 30L22 61L51 23L34 26Z" fill="currentColor"/><path d="M8 9L14 19M51 47L59 55"/>',
  heal:'<path d="M28 17H36V26H45V34H36V43H28V34H19V26H28Z" fill="currentColor" stroke="none"/><path d="M10 49V42M52 47V37M21 58V52M43 57V51"/><circle cx="32" cy="32" r="27" opacity=".45"/>',
  shield:'<path d="M32 5L54 13V31Q53 49 32 59Q11 49 10 31V13Z" fill="currentColor" fill-opacity=".15"/><path d="M32 12L46 18V31Q45 43 32 51"/>',
  absorb:'<ellipse cx="32" cy="32" rx="27" ry="23"/><circle cx="32" cy="32" r="15"/><path d="M23 32H41M32 23V41"/>',
  break:'<path d="M22 8L28 23L12 21ZM39 7L53 19L36 24ZM8 34L24 30L18 51ZM39 31L57 39L45 55ZM28 43L36 47L30 61Z" fill="currentColor" fill-opacity=".6"/>',
  buff:'<path d="M13 48V23M7 29L13 22L19 29M32 54V9M25 17L32 9L39 17M51 48V23M45 29L51 22L57 29"/><circle cx="23" cy="38" r="2"/><circle cx="42" cy="35" r="2"/>',
  debuff:'<path d="M6 16Q32 4 58 16M12 30Q32 18 52 30M20 44Q32 36 44 44M32 31V55M25 47L32 55L39 47"/>',
  evade:'<path d="M7 18H30M3 32H23M7 46H30M35 14L51 32L35 50"/>',
  resist:'<path d="M32 5L53 13V32Q50 48 32 58Q14 48 11 32V13Z"/><path d="M21 31L29 39L44 23"/>',
  magic:'<circle cx="32" cy="32" r="23"/><path d="M32 4L37 26L59 32L37 38L32 60L26 38L4 32L26 26Z"/>',
  cast:'<circle cx="32" cy="32" r="25"/><path d="M13 13L20 20M51 13L44 20M13 51L20 44M51 51L44 44"/>'
 };
 function art(type){return graphics[type]||graphics[{hit:'magic',impact:'magic',wind:'magic',light:'magic',shadow:'magic',regen:'heal',potion:'heal',drain:'heal',dissolve:'shield','shield-impact':'absorb'}[type]]||graphics.magic;}
 function play(node,event,sourceNode){
  let entries=activeNodes.get(node);if(!entries){entries=new Map();activeNodes.set(node,entries);}
  const type=event.type,channel=type==='break'?'break':['heal','regen','potion','drain'].includes(type)?'recovery':['shield','absorb','break','dissolve','shield-impact'].includes(type)?'shield':type==='hit'?'hit':['buff','debuff'].includes(type)?type:type==='cast'?'cast':'action';
  if(entries.has(channel)){const old=entries.get(channel);clearTimeout(old.timer);old.element.remove();entries.delete(channel);}
  const element=document.createElement('span');element.className='battle-fx battle-fx-'+type+(node.dataset.combatId?' battle-fx-health':'');
  element.dataset.fx=type;element.dataset.detail=mode();element.setAttribute('aria-hidden','true');
  const base=['hit','absorb','shield-impact','evade','resist','regen'].includes(type)?270:['slash','ranged'].includes(type)?380:510;
  const duration=Math.max(100,Math.round(base/Math.max(1,battleRate)*(motion.matches?.65:1)));
  element.style.setProperty('--fx-time',duration+'ms');element.style.setProperty('--fx-color',colors[type]||colors.magic);
  element.style.setProperty('--fx-direction',String(++sequence%2?-1:1));
  element.innerHTML='<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+art(type)+'</svg>';
  if(['evade','resist'].includes(type))element.innerHTML+='<b>'+({evade:'閃避',resist:'抵抗'}[type])+'</b>';
  if(mode()==='full'&&sourceNode&&sourceNode!==node&&['fire','ice','lightning','wind','light','shadow','magic','ranged'].includes(type)){
   const a=sourceNode.getBoundingClientRect(),b=node.getBoundingClientRect(),dx=a.x-b.x,dy=a.y-b.y,length=Math.hypot(dx,dy)||1;
   element.style.setProperty('--fx-from-x',Math.round(dx/length*24)+'px');element.style.setProperty('--fx-from-y',Math.round(dy/length*24)+'px');
   const trail=document.createElement('i');trail.className='battle-fx-projectile';element.append(trail);
  }
  node.append(element);
  const row={element,timer:null},remove=()=>{if(entries.get(channel)!==row)return;clearTimeout(row.timer);element.remove();entries.delete(channel);if(!entries.size)activeNodes.delete(node);};
  row.timer=setTimeout(remove,duration+80);entries.set(channel,row);element.addEventListener('animationend',e=>{if(e.target===element)remove();});
 }
 function sync(s){
  if(preference==='off'||!visible()||s.result||owner&&owner!==party||encounter&&encounter!==foes){clear();return;}
  for(const node of activeNodes.keys())if(!node.isConnected||node.classList.contains('is-dead')||node.classList.contains('fallen'))cleanNode(node);
  for(const node of markedNodes)if(!node.isConnected){node.querySelector('.battle-fx-status')?.remove();delete node.dataset.fxShield;markedNodes.delete(node);}
  const rows=[...s.allies,...s.units],byId=new Map(rows.map(row=>[String(row.id),row]));
  const nodes=new Map();document.querySelectorAll('#battleAllyIcons > [data-hero-id],#battleEnemyIcons > [data-enemy-id]').forEach(node=>nodes.set(node.dataset.heroId||node.dataset.enemyId,node));
  const healthNodes=new Map();document.querySelectorAll('.squad-field .unit[data-combat-id]').forEach(node=>healthNodes.set(node.dataset.combatId,node));
  const playUnit=(key,event,sourceKey)=>{for(const surfaces of [nodes,healthNodes]){const node=surfaces.get(key);if(node)play(node,event,surfaces.get(sourceKey));}};
  const currentStatuses=statuses();
  for(const [key,node] of nodes){
   const row=byId.get(key);let badge=node.querySelector('.battle-fx-status');
   if(!row?.alive){badge?.remove();delete node.dataset.fxShield;markedNodes.delete(node);continue;}
   if(shields(row.unit)>0)node.dataset.fxShield='true';else delete node.dataset.fxShield;
   const tags=new Set([...currentStatuses.values()].filter(x=>String(x.target)===key).map(x=>x.polarity));
   const labels=[shields(row.unit)>0?'shield':null,tags.has('buff')?'buff':null,tags.has('debuff')?'debuff':null].filter(Boolean);
   if(!labels.length){badge?.remove();markedNodes.delete(node);continue;}
   markedNodes.add(node);
   if(!badge){badge=document.createElement('span');badge.className='battle-fx-status';node.append(badge);}
   const html=labels.map(tag=>'<i class="fx-status-'+tag+'" title="'+({shield:'護盾',buff:'增益',debuff:'減益'}[tag])+'"></i>').join('');if(badge.innerHTML!==html)badge.innerHTML=html;
  }
  const batch=pending;pending=null;
  if(!batch||batch.owner!==party||batch.encounter!==foes||performance.now()-batch.at>700)return;
  // Per-unit event channels are bounded; preserve insertion/resolution order.
  const sources=new Set();
  for(const event of batch.events.values()){
   const row=byId.get(event.target);if(!row?.alive)continue;
   const source=nodes.get(event.source)||healthNodes.get(event.source);
   if(source&&event.source!==event.target&&!sources.has(event.source)&&['slash','ranged','fire','ice','lightning','wind','light','shadow','magic','impact','evade','absorb'].includes(event.type)&&byId.get(event.source)?.alive){sources.add(event.source);playUnit(event.source,{type:['slash','ranged','impact'].includes(event.type)?'attack':'cast'});}
   playUnit(event.target,event,event.source);
  }
 }
 function wrap(name,context){const base=globalThis[name];if(typeof base!=='function')return;globalThis[name]=function(...args){if(!frame)return base.apply(this,args);return scope(context(...args),()=>base.apply(this,args));};}
 wrap('performHeroBasic',h=>({source:h,mode:'damage',element:weaponElement(h),ranged:h.job===2}));
 wrap('performEnemyBasic',e=>({source:e,mode:'damage',element:e.element}));
 wrap('resolveHit',(e,amount,h,element)=>({source:h,mode:'damage',element}));
 wrap('sharedEnemySkillDamage',(e,h,amount,element)=>({source:e,mode:'damage',element}));
 wrap('castPartySkill',(h,i)=>{const effect=CLASSES[h.job]?.skills?.[i]?.[5];return {source:h,mode:['damage','drain'].includes(effect)?'damage':'skill',element:coreSkillElement(h.job,i),effect,ranged:h.job===2};});
 wrap('castEnemySharedSkill',(e,sk)=>({source:e,mode:['damage','drain'].includes(sk.effect)?'damage':'skill',element:sk.element,effect:sk.effect}));
 wrap('castSupport',h=>({source:h,mode:'skill',element:null}));
 wrap('potion',()=>({source:state,mode:'potion',element:null}));
 wrap('applyPureShield',()=>({mode:'shield'}));
 // Cast glows are derived only from successful casts, never attempted cooldowns.
 for(const name of ['castPartySkill','castEnemySharedSkill']){const base=globalThis[name];globalThis[name]=function(...args){const out=base.apply(this,args);if(frame&&out!==false){const source=args[0];enqueue('cast',id(source));}return out;};}
 for(const name of ['resetEncounter','resetSession','loadParty','spawnGroup','refillParty']){const base=globalThis[name];if(typeof base==='function')globalThis[name]=function(...args){clear();return base.apply(this,args);};}
 globalThis.EmberwildBattleEffects={begin,end,scope,result,sync,clear,get capturing(){return !!frame;},get preference(){return preference;},get pendingEvents(){return pending?[...pending.events.values()].map(e=>({...e})):[];},get activeCount(){return [...activeNodes.values()].reduce((n,m)=>n+m.size,0);}};
 globalThis.setBattleEffects=function(value){if(!choices.includes(value))return false;preference=value;clear();try{localStorage.setItem(storageKey,value);}catch{toast('特效已套用，但瀏覽器無法保存設定。');}document.querySelectorAll('[data-battle-effects]').forEach(select=>select.value=value);EmberwildBattleSummary.sync({animate:false});return true;};
 globalThis.battleEffectsOptionsView=()=>'<section class="panel option-row"><div><h2>戰鬥特效</h2><p class="small">調整探索圖示與血條區塊動畫；保留目前行動者金框。依戰鬥倍速縮短，減少動態效果時自動簡化。</p></div><select data-battle-effects aria-label="戰鬥特效" onchange="setBattleEffects(this.value)">'+choices.map((value,i)=>'<option value="'+value+'" '+(preference===value?'selected':'')+'>'+['完整','簡化','關閉'][i]+'</option>').join('')+'</select></section>';
 const modal=document.getElementById('modal');if(modal)new MutationObserver(()=>{if(modal.open)clear();}).observe(modal,{attributes:true,attributeFilter:['open']});
 addEventListener('visibilitychange',clear);addEventListener('pagehide',clear);
 addEventListener('storage',e=>{if(e.key===storageKey||e.key===null){preference=choices.includes(e.newValue)?e.newValue:'full';clear();}});
 // Navigation and paused exploration already render through this existing entry point.
 const renderBase=render;render=function(...args){if(!visible())clear();return renderBase.apply(this,args);};
})();
