/* Compact utility dialogs and account-owned number reminders. */
(()=>{
  const A=EmberwildAchievements,labels={mailbox:'信箱',achievements:'成就',equipment:'背包',quests:'委託手札'},utilityIds=['mailbox','achievements','options'];
  const settings=()=>party?(party.numberReminders??=A.numberReminderDefaults()):A.numberReminderDefaults();
  function counts(){
    if(!party||!state)return {mailbox:0,achievements:0,equipment:0,quests:0};
    __EMBERWILD_COMPANION_UNLOCK_TEST.syncUnlocks();
    const a=party.achievements,read=new Set(a.readCompleted),gearIds=new Set((pendingGearLoot||[]).map(g=>g.id));
    for(const g of party.sharedGear?.items||state.bag||[])if(inlineAffixDrafts.has(affixDraftKey(g))||pendingAffix?.id===g.id)gearIds.add(g.id);
    const materials=state.materials||{},board=state.board;
    let quests=board&&board.next>Date.now()?board.tasks.filter(q=>!q.done&&(materials[q.mat]||0)>=q.n&&(q.kind!=='gear'||state.bag.length<RULES.bagCapacity)).length:0;
    quests+=QUESTS.filter(q=>!state.claimed.includes(q.id)&&(materials[q.mat]||0)>=q.n).length;
    const mat=MAPS[questRegion()]?.mobs?.[0]?.[2];if(mat&&(materials[mat]||0)>=8)quests++;
    return {mailbox:party.mailbox.messages.filter(m=>!m.read||!m.claimed).length,achievements:a.completed.filter(id=>!read.has(id)).length,equipment:gearIds.size,quests};
  }
  globalThis.numberBadgeCounts=counts;
  globalThis.numberBadgeHTML=function(id){if(!Object.hasOwn(labels,id))return '';const n=settings()[id]?counts()[id]:0;return `<span id="navReminder-${id}" class="number-badge" ${n?'':'hidden'} aria-label="${labels[id]}提醒 ${n}">${n||''}</span>`;};
  globalThis.numberReminderOptionsView=function(){return `<section class="panel number-reminder-options"><h2>數字提醒開關</h2><p class="small">各入口的紅色數字可分別開關；關閉不影響信件、成就、裝備或任務功能。</p><div class="number-reminder-settings">${Object.entries(labels).map(([id,label])=>`<label><input type="checkbox" data-number-reminder="${id}" onchange="setNumberReminder('${id}',this.checked)" ${settings()[id]?'checked':''}> ${label}</label>`).join('')}</div></section>`;};
  globalThis.setNumberReminder=function(id,enabled){if(!party||!Object.hasOwn(labels,id)||typeof enabled!=='boolean')return false;const old={...settings()};party.numberReminders[id]=enabled;if(!save()){party.numberReminders=old;lastDialogHTML='';render();return false;}render();return true;};
  const svg=name=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${(__EMBERWILD_LUCIDE.nodes[name]||[]).map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).map(([key,value])=>`${key}="${esc(value)}"`).join(' ')}></${tag}>`).join('')}</svg>`;
  const container=$('utilityNavigation');
  container.innerHTML=utilityIds.map(id=>`<button id="utilityButton-${id}" type="button" class="utility-icon-button" data-utility="${id}" title="${labels[id]||'選項'}" aria-label="${labels[id]||'選項'}" onclick="openUtilityPanel('${id}')">${svg({mailbox:'mail',achievements:'medal',options:'settings'}[id])}<span id="utilityReminder-${id}" class="number-badge" hidden></span></button>`).join('');
  globalThis.isUtilityDialogOpen=id=>$('modal').open&&$('modal').dataset.view==='utility-'+id;
  let lastDialogHTML='';
  function clearUtilityMarker(){const modal=$('modal');if(String(modal.dataset.view||'').startsWith('utility-'))delete modal.dataset.view;modal.classList.remove('utility-dialog');lastDialogHTML='';}
  function refreshDialog(){const modal=$('modal');if(!modal.open||!String(modal.dataset.view||'').startsWith('utility-'))return;const id=modal.dataset.view.slice(8),view={mailbox:mailboxView,achievements:achievementsView,options:optionsView}[id];if(!view)return;const html=`<div class="utility-dialog-controls"><button onclick="closeModal()" aria-label="關閉彈窗">關閉</button></div>`+view();if(html!==lastDialogHTML){modal.innerHTML=html;lastDialogHTML=html;}}
  globalThis.openUtilityPanel=function(id){
    if(!party||!state||!utilityIds.includes(id)||isEmberwildTitleOpen())return false;
    __EMBERWILD_COMPANION_UNLOCK_TEST.syncUnlocks();
    if(id==='achievements'){const old=[...party.achievements.readCompleted];party.achievements.readCompleted=[...party.achievements.completed];if(!save())party.achievements.readCompleted=old;}
    const modal=$('modal');modal.dataset.view='utility-'+id;modal.classList.add('utility-dialog');modal.setAttribute('aria-label',labels[id]||'選項');lastDialogHTML='';if(!modal.open)modal.showModal();refreshDialog();refreshBadges();return true;
  };
  function refreshBadges(){
    const active=!!party&&!!state&&!isEmberwildTitleOpen();container.hidden=!active;if(!active)return;
    const current=counts(),preferences=settings();
    for(const id of Object.keys(labels)){
      const n=preferences[id]?current[id]:0;
      for(const prefix of ['navReminder-','utilityReminder-']){const badge=document.getElementById(prefix+id);if(!badge)continue;badge.hidden=n===0;badge.textContent=n?String(n):'';badge.setAttribute('aria-label',labels[id]+'提醒 '+n);}
    }
    for(const id of utilityIds){const button=$('utilityButton-'+id),n=preferences[id]?current[id]||0:0;button.setAttribute('aria-pressed',String(isUtilityDialogOpen(id)));button.setAttribute('aria-label',(labels[id]||'選項')+(n?'，'+n+' 項提醒':''));}
  }
  const baseSetTab=setTab;setTab=function(id){if(utilityIds.includes(id))return openUtilityPanel(id);return baseSetTab(id);};
  const baseRender=render;render=function(...args){const out=baseRender(...args);if(!globalThis.isEmberwildUIInteracting?.()){refreshBadges();refreshDialog();}return out;};
  const after=globalThis.__EMBERWILD_AFTER_RENDER;globalThis.__EMBERWILD_AFTER_RENDER=function(...args){after?.(...args);refreshBadges();refreshDialog();};
  const baseClose=closeModal;closeModal=function(...args){clearUtilityMarker();const out=baseClose(...args);refreshBadges();return out;};
  $('modal').addEventListener('close',()=>{clearUtilityMarker();refreshBadges();});
  const baseCodes=showTestCodes;showTestCodes=function(...args){clearUtilityMarker();return baseCodes(...args);};
  const baseReturn=returnToTitle;globalThis.returnToTitle=function(...args){closeModal();return baseReturn(...args);};
  const baseSave=save;save=function(...args){const out=baseSave(...args);queueMicrotask(refreshBadges);return out;};
  const baseTabs=inventoryTabs;inventoryTabs=function(){return baseTabs().replace(/<button\b[^>]*onclick="showTestCodes\(\)"[^>]*>兌換碼<\/button>/g,'');};
  setInterval(()=>{if(!globalThis.isEmberwildUIInteracting?.())refreshBadges();},500);
  refreshBadges();
})();
