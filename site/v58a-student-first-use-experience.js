/* V5.8A — Student First-Use Experience.
   Gives genuinely new students one clear first action without creating a second
   Practice engine or onboarding datastore. Completion is inferred from the
   existing server-derived First Practice achievement. The CTA configures the
   established Practice controls for a 5-question Mixed session and clicks the
   existing Start Practice button so authentication, retrieval, grading, hints,
   submission, XP and achievements remain owned by their accepted workflows. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if(ROOT.__v58aStudentFirstUseExperienceInstalled) return;
  ROOT.__v58aStudentFirstUseExperienceInstalled=true;

  const CARD_ID='v58a-first-use-card';
  const STYLE_ID='v58a-first-use-style';
  const BADGE_SELECTOR='#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]';
  const HOME_SELECTOR='#start .v40c3-home-dashboard';
  const BLOCKING_PRIORITIES=new Set(['assignment','checkpoint']);
  let retryTimer=0;
  let installed=false;

  function signedIn(){
    if(typeof document==='undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function dashboard(){
    return typeof document==='undefined'?null:document.querySelector(HOME_SELECTOR);
  }

  function firstPracticeState(){
    if(typeof document==='undefined') return 'unknown';
    const badge=document.querySelector(BADGE_SELECTOR);
    if(!badge) return 'unknown';
    return badge.classList.contains('earned')?'earned':'not_earned';
  }

  function priorityKind(){
    return String(dashboard()?.querySelector('.v57c-continue-card')?.dataset?.v57cKind || '').trim().toLowerCase();
  }

  function studentName(){
    try {
      const access=typeof activeStudentAccess!=='undefined'?activeStudentAccess:ROOT.activeStudentAccess;
      const direct=String(access?.student_name || access?.studentName || '').trim();
      if(direct) return direct;
    } catch {}
    const heading=document.querySelector('#start .v40-learning-hub-hero h2')?.textContent || '';
    const match=String(heading).match(/^Welcome back,\s*(.+?)\.?$/i);
    return String(match?.[1] || '').replace(/\.$/,'').trim();
  }

  function injectStyles(){
    if(typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #start #${CARD_ID}{
        border:1px solid color-mix(in srgb,#7c3aed 42%,var(--border));
        border-radius:21px;
        padding:18px;
        background:linear-gradient(135deg,color-mix(in srgb,#f3e8ff 72%,var(--card)),var(--card));
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        gap:15px;
        align-items:center;
      }
      #start #${CARD_ID} .v58a-icon{
        width:54px;height:54px;border-radius:17px;display:grid;place-items:center;
        background:linear-gradient(145deg,#8b5cf6,#6d28d9);font-size:27px;
        box-shadow:inset 0 0 0 3px rgba(255,255,255,.16)
      }
      #start #${CARD_ID} .v58a-main{min-width:0}
      #start #${CARD_ID} .v58a-kicker{
        color:#6d28d9;font-size:10px;font-weight:950;letter-spacing:.07em;
        text-transform:uppercase;margin-bottom:4px
      }
      #start #${CARD_ID} h2{margin:0 0 5px;font-size:clamp(19px,2.6vw,25px);line-height:1.25}
      #start #${CARD_ID} p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
      #start #${CARD_ID} .v58a-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      #start #${CARD_ID} .v58a-meta span{
        display:inline-flex;align-items:center;min-height:28px;padding:5px 8px;
        border:1px solid var(--border);border-radius:999px;background:var(--card);
        font-size:10px;font-weight:850
      }
      #start #${CARD_ID} .v58a-start{min-width:190px;min-height:49px;white-space:nowrap}
      html[data-theme="dark"] #start #${CARD_ID}{
        background:linear-gradient(135deg,color-mix(in srgb,#6d28d9 17%,var(--card)),var(--card))
      }
      html[data-theme="dark"] #start #${CARD_ID} .v58a-kicker{color:#c4b5fd}
      @media(max-width:720px){
        #start #${CARD_ID}{grid-template-columns:48px minmax(0,1fr)}
        #start #${CARD_ID} .v58a-icon{width:48px;height:48px;border-radius:15px;font-size:24px}
        #start #${CARD_ID} .v58a-start{grid-column:1/-1;width:100%;min-width:0}
      }
    `;
    document.head.appendChild(style);
  }

  function setSelectValue(id,value){
    const select=document.getElementById(id);
    if(!select) return false;
    const option=[...select.options].find(row=>String(row.value)===String(value));
    if(!option) return false;
    select.value=String(value);
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function configureFirstPractice(){
    try { ROOT.V561PracticeFirstStudentExperience?.ensurePracticeSelection?.(); } catch {}
    const strandOk=setSelectValue('strand-filter','all');
    const topicOk=setSelectValue('topic-filter','all');
    const countOk=setSelectValue('question-count','5');
    const difficultyOk=setSelectValue('difficulty-filter','all');
    return strandOk && topicOk && countOk && difficultyOk;
  }

  function openLearnFallback(){
    const open=document.querySelector('#start .v40c-open-learn');
    if(open){ open.click(); return; }
    document.querySelector('#start .v40c-learn-setup')?.scrollIntoView?.({behavior:'smooth',block:'start'});
  }

  function restoreStartButton(button,original){
    if(!button || !document.contains(button)) return;
    button.disabled=false;
    button.textContent=original || 'Start My First 5 Questions';
  }

  function startFirstPractice(button){
    if(!signedIn()) return;
    const original=button?.textContent || '';
    if(button){ button.disabled=true; button.textContent='Starting…'; }
    try {
      const configured=configureFirstPractice();
      const start=document.getElementById('start-btn');
      if(!configured || !start) throw new Error('Practice setup is not ready yet.');
      start.click();
      window.setTimeout(()=>{
        if(document.getElementById('start')?.classList.contains('active')) restoreStartButton(button,original);
      },1400);
    } catch(error){
      console.warn('V5.8A first Practice could not start directly.',error);
      openLearnFallback();
      restoreStartButton(button,original);
    }
  }

  function removeCard(){
    document.getElementById(CARD_ID)?.remove();
  }

  function eligible(){
    if(!signedIn()) return false;
    if(firstPracticeState()!=='not_earned') return false;
    const kind=priorityKind();
    if(BLOCKING_PRIORITIES.has(kind)) return false;
    return !!dashboard()?.querySelector('.v57c-continue-card');
  }

  function render(){
    injectStyles();
    const root=dashboard();
    const anchor=root?.querySelector('.v57c-continue-card');
    if(!root || !anchor || !eligible()){
      removeCard();
      return false;
    }

    let card=document.getElementById(CARD_ID);
    if(!card){
      card=document.createElement('article');
      card.id=CARD_ID;
      card.setAttribute('aria-label','First Practice');
    }
    if(card.nextElementSibling!==anchor) anchor.insertAdjacentElement('beforebegin',card);

    const name=studentName();
    card.innerHTML=`
      <div class="v58a-icon" aria-hidden="true">👋</div>
      <div class="v58a-main">
        <div class="v58a-kicker">Your first step</div>
        <h2>${name?`Welcome, ${escapeHtml(name)}! `:''}Ready for 5 quick questions?</h2>
        <p>Start with a short Mixed Practice. Hints and a second try are available, and finishing unlocks your First Practice achievement.</p>
        <div class="v58a-meta"><span>5 questions</span><span>Mixed Practice</span><span>Hints available</span><span>Earn XP + first badge</span></div>
      </div>
      <button type="button" class="primary v58a-start">Start My First 5 Questions</button>`;
    card.querySelector('.v58a-start')?.addEventListener('click',event=>startFirstPractice(event.currentTarget));
    return true;
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function scheduleRender(attempt=0){
    if(typeof window==='undefined') return;
    if(retryTimer) window.clearTimeout(retryTimer);
    retryTimer=window.setTimeout(()=>{
      retryTimer=0;
      if(!signedIn()){ removeCard(); return; }
      const state=firstPracticeState();
      if(state==='unknown' && attempt<35){ scheduleRender(attempt+1); return; }
      render();
    },attempt?140:50);
  }

  function wire(){
    if(installed || typeof document==='undefined') return installed;
    installed=true;
    injectStyles();
    window.addEventListener('v57c:home-updated',()=>scheduleRender());
    window.addEventListener('v571b:achievements-updated',()=>scheduleRender());
    window.addEventListener('pageshow',()=>scheduleRender());
    window.addEventListener('focus',()=>{
      if(document.getElementById('start')?.classList.contains('active')) scheduleRender();
    });
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleRender();
      if(event.target?.closest?.('#v40c-student-logout')) removeCard();
    },true);
    scheduleRender();
    return true;
  }

  const api=Object.freeze({
    CARD_ID,BADGE_SELECTOR,BLOCKING_PRIORITIES,
    firstPracticeState,priorityKind,eligible,configureFirstPractice,render
  });

  if(typeof module!=='undefined' && module.exports) module.exports=api;
  if(typeof window!=='undefined'){
    Object.defineProperty(window,'V58AStudentFirstUseExperience',{value:api,writable:false,configurable:false});
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();