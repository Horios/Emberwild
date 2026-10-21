/* Data-driven desktop navigation. Page identities stay fixed so saved progress
   and direct links keep working; the balance document controls grouping,
   labels, order and the default expanded state. */
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
    {id:'adventure',label:'探索',expanded:true,pages:[['battle','荒野探索'],['statistics','戰鬥統計'],['guide','冒險指南'],['roster','隊伍編成'],['partnerRoster','夥伴名冊'],['character','角色能力'],['skills','技能']]},
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
    return design.groups.map(group=>{
      const groupActive=group.pages.some(page=>active(page,current));
      const open=openState.has(group.id)?openState.get(group.id):group.expanded;
      const storyBadge='';
      return `<details class="game-nav-group ${groupActive?'has-active':''}" data-nav-group="${esc(group.id)}" ${open?'open':''}><summary><span>${esc(group.label)}</span>${storyBadge}<span class="game-nav-chevron" aria-hidden="true">›</span></summary><div class="game-nav-items">${group.pages.map(page=>`<button type="button" data-page="${esc(page.id)}" class="${active(page,current)?'active':''}" onclick="${action(page)}" ${active(page,current)?'aria-current="page"':''}><span>${esc(page.label)}</span>${pageBadge(page)}</button>`).join('')}</div></details>`;
    }).join('');
  };
  globalThis.EmberwildNavigation=Object.freeze({VERSION,PAGES:Object.freeze({...PAGES}),defaults:()=>copy(DEFAULTS),normalize,get design(){return copy(design);}});

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
