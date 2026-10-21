/* Data-driven desktop navigation. Page identities stay fixed so saved progress
   and direct links keep working; the balance document controls grouping
   and labels. Players can locally reorder the top-level groups. */
(()=>{
  const VERSION=1,copy=value=>structuredClone(value);
  const PAGES={
    battle:'荒野探索',statistics:'戰鬥統計',shop:'商店',guide:'冒險指南',
    roster:'隊伍編成',partnerRoster:'夥伴名冊',character:'角色能力',skills:'技能',
    equipment:'背包',worn:'裝備與信物',forge:'裝備強化',bossCraft:'BOSS 製作',
    'story-main':'主線','story-side':'支線','story-npc':'NPC 任務',quests:'委託',
    gather:'採集',alchemy:'煉金'
  };
  const DEFAULTS={version:VERSION,groups:[
    {id:'missions',label:'主線',expanded:false,pages:[['story-main','主線'],['story-side','支線'],['story-npc','NPC 任務'],['quests','委託']]},
    {id:'adventure',label:'冒險',expanded:false,pages:[['battle','荒野探索'],['statistics','戰鬥統計'],['guide','冒險指南'],['roster','隊伍編成'],['partnerRoster','夥伴名冊'],['character','角色能力'],['skills','技能']]},
    {id:'equipment',label:'背包',expanded:false,pages:[['equipment','背包'],['worn','裝備與信物'],['forge','裝備強化'],['bossCraft','BOSS 製作']]},
    {id:'shop',label:'商店',expanded:false,pages:[['shop','商品列表']]},
    {id:'life',label:'生活',expanded:false,pages:[['gather','採集'],['alchemy','煉金']]}
  ].map(group=>({...group,pages:group.pages.map(([id,label])=>({id,label}))}))};
  const validText=(value,max)=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=max;
  function normalize(raw){
    if(raw===undefined||raw===null)return copy(DEFAULTS);
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==VERSION||!Array.isArray(raw.groups)||raw.groups.length<1||raw.groups.length>12)throw Error('導覽列表格式或版本無效');
    const groupIds=new Set(),pageIds=new Set(),groups=raw.groups.map((group,index)=>{
      if(!group||typeof group!=='object'||Array.isArray(group)||!validText(group.id,48)||groupIds.has(group.id)||!validText(group.label,24)||typeof group.expanded!=='boolean'||!Array.isArray(group.pages)||group.pages.length>24)throw Error('導覽群組無效：'+index);
      groupIds.add(group.id);
      return {id:group.id,label:group.label,expanded:group.expanded,pages:group.pages.map((page,pageIndex)=>{
        if(!page||typeof page!=='object'||Array.isArray(page)||!Object.hasOwn(PAGES,page.id)||pageIds.has(page.id)||!validText(page.label,24))throw Error('導覽頁籤無效：'+index+'-'+pageIndex);
        pageIds.add(page.id);return {id:page.id,label:page.label};
      })};
    });
    const missing=Object.keys(PAGES).filter(id=>!pageIds.has(id));
    if(missing.length)throw Error('導覽列表缺少頁籤：'+missing.join('、'));
    return {version:VERSION,groups};
  }
  let design=normalize(JSON.parse(balanceSourceText()||'null')?.navigation),openState=new Map();
  // Ordering is a local preference, separate from balance data and character saves.
  // The environment key keeps preview and production choices independent.
  const ORDER_KEY=typeof environmentStorageKey==='function'?environmentStorageKey('emberwild-navigation-group-order-v1'):'emberwild-navigation-group-order-v1';
  function readOrder(){
    try{
      const value=JSON.parse(localStorage.getItem(ORDER_KEY)||'null');
      return Array.isArray(value)&&value.every(id=>typeof id==='string')&&new Set(value).size===value.length?value:null;
    }catch{return null;}
  }
  let preferredOrder=readOrder();
  function orderedGroups(){
    if(!preferredOrder)return design.groups;
    const positions=new Map(preferredOrder.map((id,index)=>[id,index]));
    return [...design.groups].sort((a,b)=>(positions.get(a.id)??Infinity)-(positions.get(b.id)??Infinity));
  }
  function reorderVisibleGroups(){
    const nav=document.querySelector?.('#app>.layout>aside nav');
    if(!nav)return;
    const nodes=[...nav.querySelectorAll('details[data-nav-group]')];
    for(const group of orderedGroups()){
      const node=nodes.find(element=>element.dataset.navGroup===group.id);
      if(node)nav.appendChild(node);
    }
  }
  function moveGroup(source,target,after=false){
    if(!source||source===target)return false;
    const ids=orderedGroups().map(group=>group.id);
    if(!ids.includes(source)||!ids.includes(target))return false;
    const next=ids.filter(id=>id!==source);
    next.splice(next.indexOf(target)+(after?1:0),0,source);
    if(next.every((id,index)=>id===ids[index]))return false;
    preferredOrder=next;
    try{localStorage.setItem(ORDER_KEY,JSON.stringify(next));}catch{}
    reorderVisibleGroups();
    return true;
  }
  let draggingId=null;
  function clearDrag(){
    draggingId=null;
    document.querySelectorAll?.('#app>.layout>aside nav .game-nav-group').forEach(group=>group.classList.remove('nav-drop-before','nav-drop-after','nav-dragging'));
  }
  function dragGroup(target){return target?.closest?.('#app>.layout>aside nav details[data-nav-group]')||null;}
  function dropAfter(group,y){
    const rect=(group.querySelector('summary')||group).getBoundingClientRect();
    return y>rect.top+rect.height/2;
  }
  document.addEventListener('dragstart',event=>{
    if(!event.target.closest?.('#app>.layout>aside nav [data-nav-drag]'))return;
    const group=dragGroup(event.target);if(!group)return;
    draggingId=group.dataset.navGroup;
    group.classList.add('nav-dragging');
    if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggingId);}
  });
  document.addEventListener('dragover',event=>{
    const group=dragGroup(event.target);
    if(!draggingId||!group||group.dataset.navGroup===draggingId)return;
    event.preventDefault();
    const after=dropAfter(group,event.clientY);
    document.querySelectorAll?.('#app>.layout>aside nav .game-nav-group').forEach(el=>el.classList.remove('nav-drop-before','nav-drop-after'));
    group.classList.add(after?'nav-drop-after':'nav-drop-before');
    if(event.dataTransfer)event.dataTransfer.dropEffect='move';
  });
  document.addEventListener('drop',event=>{
    const group=dragGroup(event.target);
    if(!draggingId||!group)return;
    event.preventDefault();
    moveGroup(draggingId,group.dataset.navGroup,dropAfter(group,event.clientY));
    clearDrag();
  });
  document.addEventListener('dragend',clearDrag);
  // A drag handle inside <summary> must not toggle the section when clicked.
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#app>.layout>aside nav [data-nav-drag]')){event.preventDefault();event.stopPropagation();}
  },true);
  document.addEventListener('keydown',event=>{
    const handle=event.target.closest?.('#app>.layout>aside nav [data-nav-drag]');
    if(!handle||!['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    const ids=orderedGroups().map(group=>group.id),id=handle.dataset.navDrag,index=ids.indexOf(id);
    const target=ids[index+(event.key==='ArrowUp'?-1:1)];
    if(target&&moveGroup(id,target,event.key==='ArrowDown'))handle.focus();
  },true);
  function storyType(){return globalThis.currentStoryCategory?.()||'main';}
  function active(page,current){
    if(page.id.startsWith('story-'))return current==='story'&&storyType()===page.id.slice(6);
    return current===page.id||current==='lifeSkills'&&page.id==='gather';
  }
  function action(page){
    if(page.id.startsWith('story-'))return `openStory('','${page.id.slice(6)}')`;
    return `setTab('${page.id}')`;
  }
  function rememberOpenState(){
    document.querySelectorAll?.('#app>.layout>aside nav details[data-nav-group]').forEach(group=>openState.set(group.dataset.navGroup,group.open));
  }
  globalThis.taskReminderHTML=function(id){const status=id.startsWith('story-')?globalThis.storyCategoryReminder?.(id.slice(6)):id==='quests'?globalThis.dailyQuestReminder?.():null;if(!status)return '';return `${status.ready?`<span class="number-badge" aria-label="可完成任務 ${status.ready}">${status.ready}</span>`:''}${status.new?'<span class="quest-new" aria-label="有未開始任務">N</span>':''}`;};
  function pageBadge(page){return ['story-main','story-side','story-npc','quests'].includes(page.id)?taskReminderHTML(page.id):globalThis.numberBadgeHTML?.(page.id)||'';}
  globalThis.gameNavigationHTML=function(current){
    rememberOpenState();
    return orderedGroups().map(group=>{
      const groupActive=group.pages.some(page=>active(page,current));
      const open=openState.has(group.id)?openState.get(group.id):group.expanded;
      const storyBadge='';
      return `<details class="game-nav-group ${groupActive?'has-active':''}" data-nav-group="${esc(group.id)}" ${open?'open':''}><summary><span>${esc(group.label)}</span>${storyBadge}<button type="button" class="game-nav-drag" data-nav-drag="${esc(group.id)}" draggable="true" aria-label="調整${esc(group.label)}順序，拖曳或使用上下方向鍵" title="拖曳排序，或用上下方向鍵">⠿</button><span class="game-nav-chevron" aria-hidden="true">›</span></summary><div class="game-nav-items">${group.pages.map(page=>`<button type="button" data-page="${esc(page.id)}" class="${active(page,current)?'active':''}" onclick="${action(page)}" ${active(page,current)?'aria-current="page"':''}><span>${esc(page.label)}</span>${pageBadge(page)}</button>`).join('')}</div></details>`;
    }).join('');
  };
  globalThis.EmberwildNavigation=Object.freeze({VERSION,PAGES:Object.freeze({...PAGES}),defaults:()=>copy(DEFAULTS),normalize,get design(){return copy(design);},get order(){return orderedGroups().map(g=>g.id);},moveGroup});

  const exportBase=exportableBalance;
  exportableBalance=function(){return {...exportBase(),navigation:copy(design)};};
  const validateBase=validateBalanceConfig;
  validateBalanceConfig=function(input){const doc=validateBase(input);doc.navigation=normalize(input?.navigation);return doc;};
  const applyBase=applyBalanceConfig;
  applyBalanceConfig=function(input,options={}){
    const doc=validateBalanceConfig(input),result=applyBase(doc,options);design=copy(doc.navigation);openState=new Map();
    if(options.persist!==false)localStorage.setItem(BALANCE_KEY,JSON.stringify(exportableBalance()));
    if(state)render();return result;
  };
  if(state)render();
})();
