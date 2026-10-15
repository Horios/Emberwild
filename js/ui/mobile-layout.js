/* Mobile presentation reuses the game's navigation, journal and page data. */
(()=>{
  const mobile=matchMedia('(max-width:900px)');
  const primary=['battle','roster','equipment','character'];
  let menuOpen=false,journalOpen=false,journalScroll=0,menuScroll=0;
  function sync(){
    const nav=document.querySelector('#app>.layout>aside nav');
    if(nav&&!nav.querySelector('.mobile-more-toggle')){
      nav.setAttribute('aria-label','遊戲分頁');
      const pages=document.createElement('div');pages.id='mobileMorePages';pages.className='mobile-more-pages';pages.setAttribute('aria-label','其他功能');
      for(const [index,button] of [...nav.children].entries()){
        button.style.setProperty('--page-order',index);
        const id=button.dataset.statisticsTab?'statistics':button.getAttribute('onclick')?.match(/setTab\('([^']+)'\)/)?.[1];
        if(!id)continue;
        button.dataset.page=id;
        if(!primary.includes(id))pages.appendChild(button);
      }
      // Keep familiar, short labels in the four thumb-accessible shortcuts.
      for(const id of primary){const b=nav.querySelector(`[data-page="${id}"]`);if(b)nav.appendChild(b);}
      const more=document.createElement('button');more.type='button';more.className='mobile-more-toggle';more.setAttribute('aria-controls',pages.id);more.onclick=()=>{menuOpen=!menuOpen;sync();};nav.append(more,pages);
    }
    if(nav){
      nav.classList.toggle('mobile-menu-open',menuOpen);
      const more=nav.querySelector('.mobile-more-toggle');
      if(more){more.setAttribute('aria-expanded',String(menuOpen));more.textContent=menuOpen?'收起':primary.includes(tab)?'更多':'更多 · '+(nav.querySelector('.mobile-more-pages .active span')?.textContent||nav.querySelector('.mobile-more-pages .active')?.textContent||'');more.classList.toggle('active',!primary.includes(tab));}
      for(const b of nav.querySelectorAll('[data-page]')){
        if(b.dataset.page===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
      }
      const pages=nav.querySelector('.mobile-more-pages');
      pages?.setAttribute('aria-hidden',String(mobile.matches&&!menuOpen));
      if(pages&&menuOpen&&pages.scrollTop!==menuScroll)pages.scrollTop=menuScroll;
    }
    const journal=document.getElementById('globalBattleJournal');
    if(journal){
      journal.classList.toggle('mobile-journal-open',journalOpen);
      const button=journal.querySelector('.mobile-journal-toggle');
      if(button){button.setAttribute('aria-expanded',String(journalOpen));button.textContent=`全隊戰報 · ${journal.querySelector('.journal-title-row .tag')?.textContent||''}　${journalOpen?'收合 ▾':'展開 ▴'}`;}
      const body=journal.querySelector('.mobile-journal-body');
      body?.setAttribute('aria-hidden',String(mobile.matches&&!journalOpen));
      if(body&&journalOpen&&body.scrollTop!==journalScroll)body.scrollTop=journalScroll;
    }
  }
  globalThis.toggleMobileJournal=()=>{journalOpen=!journalOpen;sync();};
  const journalBase=sharedBattleJournal;
  sharedBattleJournal=function(){
    const html=journalBase();if(!html)return html;
    const at=html.indexOf('>')+1;
    return html.slice(0,at)+`<button type="button" class="mobile-journal-toggle" aria-controls="mobileJournalBody" aria-expanded="${journalOpen}" onclick="toggleMobileJournal()">全隊戰報</button><div id="mobileJournalBody" class="mobile-journal-body">`+html.slice(at,html.lastIndexOf('</section>'))+'</div></section>';
  };
  const renderBase=render;
  render=function(...args){const out=renderBase(...args);sync();return out;};
  const after=globalThis.__EMBERWILD_AFTER_RENDER;
  globalThis.__EMBERWILD_AFTER_RENDER=function(...args){after?.(...args);sync();};
  const refreshBase=refreshGlobalJournal;
  refreshGlobalJournal=function(...args){const out=refreshBase(...args);sync();return out;};
  const tabBase=setTab;
  setTab=function(id){
    const previous=tab;menuOpen=false;const out=tabBase(id);sync();
    if(mobile.matches&&tab!==previous)document.querySelector('.layout>main')?.scrollTo(0,0);
    return out;
  };
  document.getElementById('app').addEventListener('scroll',event=>{
    if(event.target.matches?.('.mobile-journal-body'))journalScroll=event.target.scrollTop;
    if(event.target.matches?.('.mobile-more-pages'))menuScroll=event.target.scrollTop;
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuOpen){menuOpen=false;sync();document.querySelector('.mobile-more-toggle')?.focus();}});
  document.addEventListener('click',event=>{if(menuOpen&&!event.target.closest('#app>.layout>aside')){menuOpen=false;sync();}});
  mobile.addEventListener('change',()=>{menuOpen=false;sync();});
  if(state)render();else sync();
})();
