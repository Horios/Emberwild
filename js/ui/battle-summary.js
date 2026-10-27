/* Read-only combat presentation. HP and membership always come from combat units.
   Only previous visual samples, DOM nodes and a finished encounter's references
   are retained here; none of these values are saved or used by combat. */
(()=>{
 'use strict';
 let owner=null,terminal=null,previous=new Map(),flashes=new Map(),detailCollapsed=false;
 let retainedSummary=null,retainedRoster=null,retainedAllies=null,openingAction=null,serial=0;
 const fallbackIds=new WeakMap();
 const monsterArtwork=new Map(),usedArtwork=new Set();let artworkOwner=null;
 const iconPool=[...new Set(['ghost','paw-print','sprout','skull','bot','flame','bug','bird','cat','dog','fish','rabbit','rat','snail','turtle','worm','squirrel',...(globalThis.__EMBERWILD_LUCIDE?.names||[])])];
 const key=e=>{if(e.id!=null)return String(e.id);if(!fallbackIds.has(e))fallbackIds.set(e,'visual-'+(++serial));return fallbackIds.get(e);};
 const finite=n=>Number.isFinite(Number(n))?Number(n):0;
 const fmt=n=>n.toLocaleString('zh-TW',{maximumFractionDigits:1});
 function clear(){terminal=null;previous.clear();flashes.clear();owner=party;openingAction=lastActionOrder.at(-1)||null;}
 function finish(result){
  // Keep the actual array, including its final HP, even if result cleanup clears
  // the global foes binding. This is O(1), including during offline simulation.
  terminal={owner:party,units:foes,name:currentExplorationName(),result};
 }
 function snapshot(){
  if(owner!==party)clear();
  const ended=terminal?.owner===party&&(!foes.length||terminal.units===foes)?terminal:null;
  const source=party?(ended?.units||foes):[];
  const action=lastActionOrder.at(-1),actingId=!ended&&running&&!$('modal')?.open&&action!==openingAction?action?.id:null;
  const allies=party?heroes().map(h=>({id:heroKey(h),unit:h,alive:h.hp>0,acting:h.hp>0&&heroKey(h)===actingId})):[];
  const units=source.map(e=>{
   // maxhp is also the cap used by enemy healing, lifesteal and individual bars.
   const max=Math.max(0,finite(e.maxhp)),hp=Math.min(max,Math.max(0,finite(e.hp)));
   return {id:key(e),unit:e,hp,max,alive:hp>0,acting:hp>0&&key(e)===actingId};
  });
  const hp=units.reduce((n,e)=>n+e.hp,0),max=units.reduce((n,e)=>n+e.max,0);
  let name=ended?.name||currentExplorationName();
  const boss=source.find(e=>e.kind==='boss'||e.kind==='final');if(boss&&!name.includes(boss.name))name+=' · '+boss.name;
  return {units,allies,hp,max,percent:max?hp/max*100:0,alive:units.filter(e=>e.alive).length,total:units.length,
   result:ended?.result||null,name};
 }
 function summaryHTML(){return `<section id="battleSummary" class="battle-summary" aria-label="即時戰鬥摘要"><div class="battle-summary-heading"><b data-summary-name></b><span data-summary-state></span></div><div id="journalEnemyIcons" class="battle-enemy-icons journal-enemy-icons" aria-label="戰報怪物圖示"></div><div class="battle-summary-hp"><b>敵方總血量</b><span data-summary-hp></span></div><div class="battle-summary-meter" role="progressbar" aria-label="敵方剩餘生命值" aria-valuemin="0" aria-valuemax="100"><span></span></div><div class="battle-summary-foot"><span data-summary-count></span><span data-summary-percent></span><button type="button" class="battle-details-toggle" onclick="EmberwildBattleSummary.toggleDetails()"></button></div></section>`;}
 function rosterHTML(){return '<div id="battleEnemyIcons" class="battle-enemy-icons" aria-label="參戰怪物圖示"></div>';}
 const baseMonsterName=e=>{const name=String(e.name||e.monsterId||'怪物');return e.kind==='elite'?name.replace(/^菁英[・·．\s]*/,''):name;};
 function artwork(e){
  if(artworkOwner!==party){monsterArtwork.clear();usedArtwork.clear();artworkOwner=party;}
  const name=baseMonsterName(e);if(monsterArtwork.has(name))return monsterArtwork.get(name);
  let html=enemyArt(e);
  // Cache visual assignments only. Different names never share the same SVG;
  // elite variants share their base monster's artwork and receive a badge.
  if(!html||usedArtwork.has(html)){
   const preferred={beast:'paw-print',plant:'sprout',undead:'skull',construct:'bot',demon:'flame',spirit:'ghost'}[e.race]||'ghost';
   for(const glyph of [preferred,...iconPool]){
    const icons=globalThis.__EMBERWILD_SKILL_ICONS;if(!icons?.hasIcon('lucide:'+glyph))continue;
    html=icons.svgFor('lucide:'+glyph,[],{size:32});if(!usedArtwork.has(html))break;html='';
   }
  }
  html=html||esc(name);monsterArtwork.set(name,html);usedArtwork.add(html);return html;
 }
 const put=(root,selector,value)=>{const n=root.querySelector(selector);if(n&&n.textContent!==value)n.textContent=value;};
 function sample(s,animate){
  let event='';const next=new Map(),now=Date.now();
  for(const row of s.units){
   const before=previous.get(row.id);let effect='',label='';
   if(animate&&!s.result){
    if(!before&&previous.size){effect='joined';label='援軍加入';}
    else if(before){
     if(!before.alive&&row.alive){effect='revived';label='復活';}
     else if(before.alive&&!row.alive){effect='dead';label='已擊敗';}
     else if(row.hp>before.hp){effect='healed';label='+'+fmt(row.hp-before.hp)+' HP';}
     else if(row.hp<before.hp){effect='hit';}
    }
   }
   if(effect){flashes.set(row.id,{effect,label,until:now+800});if(effect!=='hit')event=effect==='joined'?'援軍加入':effect==='revived'?'敵方復活':effect==='healed'?'敵方治療':event;}
   if(flashes.get(row.id)?.until<=now)flashes.delete(row.id);
   next.set(row.id,{hp:row.hp,alive:row.alive});
  }
  for(const id of flashes.keys())if(!next.has(id))flashes.delete(id);
  previous=next;
  return event||([...flashes.values()].some(x=>x.effect==='joined')?'援軍加入':[...flashes.values()].some(x=>x.effect==='revived')?'敵方復活':[...flashes.values()].some(x=>x.effect==='healed')?'敵方治療':'');
 }
 function updateRoster(root,s,ally=false){
  const rows=ally?s.allies:s.units,attribute=ally?'heroId':'enemyId';
  const nodes=new Map([...root.children].map(n=>[n.dataset[attribute],n]));
  const names=new Map();for(const row of rows)names.set(row.unit.name,(names.get(row.unit.name)||0)+1);
  const indices=new Map();
  rows.forEach((row,index)=>{
   const e=row.unit,num=(indices.get(e.name)||0)+1;indices.set(e.name,num);
   const name=ally?characterName(e):e.name+(names.get(e.name)>1?num:'');
   let node=nodes.get(row.id);
   if(!node){node=document.createElement('div');node.dataset[attribute]=row.id;node.className='battle-enemy-icon'+(ally?' battle-ally-icon':'');node.innerHTML='<span class="enemy-icon-art"></span><small></small><span class="enemy-icon-event"></span><span class="enemy-icon-elite" aria-hidden="true">◆</span>';}
   const artKey=ally?EmberwildAvatars.resolvedId(e):[baseMonsterName(e),e.monsterId,e.mat,e.element,e.icon,e.race].join('|');
   if(node.dataset.artKey!==artKey){node.querySelector('.enemy-icon-art').innerHTML=ally?EmberwildAvatars.control(e):artwork(e);node.dataset.artKey=artKey;}
   const flash=ally?null:flashes.get(row.id),state=row.alive?(row.acting?'目前行動':'存活'):ally?'倒下':'已擊敗';
   node.classList.toggle('is-dead',!row.alive);node.classList.toggle('is-acting',row.acting);node.classList.toggle('is-boss',!ally&&(e.kind==='boss'||e.kind==='final'));
   node.classList.toggle('is-elite',!ally&&e.kind==='elite');
   node.dataset.effect=flash?.effect||'';
   node.title=name+' · '+state+(ally?'':' · '+fmt(row.hp)+' / '+fmt(row.max)+' HP');node.setAttribute('aria-label',node.title);
   put(node,'small',!ally&&names.get(e.name)>1?String(num):'');put(node,'.enemy-icon-event',flash?.label||(!row.alive?state:''));
   if(root.children[index]!==node)root.insertBefore(node,root.children[index]||null);
   nodes.delete(row.id);
  });
  for(const node of nodes.values())node.remove();
 }
 function sync({animate=true}={}){
  if(globalThis.__EMBERWILD_OFFLINE_SILENT||document.hidden)return;
  const summary=document.getElementById('battleSummary'),roster=document.getElementById('battleEnemyIcons'),allies=document.getElementById('battleAllyIcons'),journalIcons=document.getElementById('journalEnemyIcons');
  if(!party||!summary?.isConnected&&!roster?.isConnected&&!allies?.isConnected)return;
  const s=snapshot(),event=sample(s,animate);
  const status=s.result==='victory'?'戰鬥勝利':s.result==='wipe'?'戰鬥失敗':!s.total?(running?'搜尋敵人':'尚未探索'):!running?'戰鬥暫停':$('modal')?.open?'視窗暫停':event||'戰鬥中';
  if(summary){
   put(summary,'[data-summary-name]',s.name);summary.querySelector('[data-summary-name]').title=s.name;put(summary,'[data-summary-state]',status);
   put(summary,'[data-summary-hp]',fmt(s.hp)+' / '+fmt(s.max));
   put(summary,'[data-summary-count]','存活怪物：'+s.alive+' / '+s.total);
   put(summary,'[data-summary-percent]',s.percent.toFixed(1).replace(/\.0$/,'')+'%');
   const meter=summary.querySelector('[role="progressbar"]'),fill=meter.querySelector('span');
   const width=s.percent+'%';if(fill.style.width!==width)fill.style.width=width;
   meter.setAttribute('aria-valuenow',String(s.percent));meter.setAttribute('aria-valuetext',fmt(s.hp)+' / '+fmt(s.max)+' HP');
   summary.dataset.result=s.result||'';
   const button=summary.querySelector('.battle-details-toggle');button.textContent=detailCollapsed?'展開戰報':'收合戰報';button.setAttribute('aria-expanded',String(!detailCollapsed));
   summary.closest('.global-battle-journal')?.classList.toggle('journal-details-collapsed',detailCollapsed);
  }
  if(roster)updateRoster(roster,s);
  if(allies)updateRoster(allies,s,true);
  if(journalIcons)updateRoster(journalIcons,s);
 }
 function toggleDetails(){detailCollapsed=!detailCollapsed;sync({animate:false});}
 globalThis.EmberwildBattleSummary={snapshot,sync,finish,toggleDetails};
 const journalBase=sharedBattleJournal;
 sharedBattleJournal=function(){const html=journalBase();return html.replace('<div class="journal-resizer"',summaryHTML()+'<div class="journal-resizer"');};
 const battleBase=battleView;
 battleView=function(){
  const s=snapshot();
  let html=battleBase().replace(/<section class="squad-enemies"><h3>[\s\S]*?<\/h3>/,
   `<section class="squad-enemies"><h3>遭遇敵人 <small>${s.alive} / ${s.total}</small></h3>`+rosterHTML());
  html=html.replace(/<button\b[^>]*class="character-avatar-control[^\"]*"[\s\S]*?<\/button>/g,'')
   .replace(/(<section class="squad-allies"><h3>[\s\S]*?<\/h3>)/,'$1<div id="battleAllyIcons" class="battle-enemy-icons battle-ally-icons" aria-label="出戰隊員圖示"></div>');
  if(s.result&&!foes.length)html=html.replace(/<p class="empty">尚無遭遇[\s\S]*?<\/p>/,
   `<p class="empty">${s.result==='victory'?'戰鬥勝利':'戰鬥失敗'}<br>本場怪物狀態保留至下一場遭遇。</p>`);
  return html;
 };
 const beginBase=beginBattleStatistics;
 beginBattleStatistics=function(...args){clear();return beginBase(...args);};
 for(const name of ['resetEncounter','resetSession','loadParty']){
  const base=globalThis[name];globalThis[name]=function(...args){clear();const out=base.apply(this,args);clear();return out;};
 }
 const renderBase=render;
 render=function(...args){
  if(globalThis.__EMBERWILD_OFFLINE_SILENT)return renderBase(...args);
  retainedSummary=document.getElementById('battleSummary')||retainedSummary;
  retainedRoster=document.getElementById('battleEnemyIcons')||retainedRoster;
  retainedAllies=document.getElementById('battleAllyIcons')||retainedAllies;
  const out=renderBase(...args);
  for(const [id,old] of [['battleSummary',retainedSummary],['battleEnemyIcons',retainedRoster],['battleAllyIcons',retainedAllies]]){
   const fresh=document.getElementById(id);if(fresh&&old&&fresh!==old)fresh.replaceWith(old);
  }
  sync();return out;
 };
 const refreshBase=refreshGlobalJournal;
 refreshGlobalJournal=function(...args){const out=refreshBase(...args);sync();return out;};
 const tickBase=tick;
 tick=function(...args){const out=tickBase(...args);if(!globalThis.EmberwildOffline?.busy)sync();return out;};
 if(party)render();
})();
