/* V5.9A.4 — Student Home concept enrichment.
   Presentation-only visual enrichment using the approved mobile reference as the
   student-UI source of truth. Reuses the already-rendered assignment, recommendation,
   achievement, mission and class-challenge state. No learning/data authority. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59a4StudentHomeConceptEnrichmentInstalled) return;
  ROOT.__v59a4StudentHomeConceptEnrichmentInstalled = true;

  const STYLE_ID = 'v59a4-student-home-concept-enrichment-style';
  const BODY_CLASS = 'v59a4-concept-richness';
  let observer = null;
  let retryTimer = 0;
  let installed = false;

  function signedIn(){
    return typeof document !== 'undefined' &&
      !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function premiumIcon(type){
    if (type === 'mixed') return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="5" y="5" width="38" height="38" rx="12" fill="#12bfa7"/>
      <path d="M15 17h10M20 12v10M29 17h8M15 32h10M17 29l6 6M23 29l-6 6M30 30h8M34 26v1M34 34v1" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 10c7-4 20-5 28-1" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
    if (type === 'topic') return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="23" cy="25" r="17" fill="#2497f2"/>
      <circle cx="23" cy="25" r="10" fill="none" stroke="#dff2ff" stroke-width="3"/>
      <circle cx="23" cy="25" r="4" fill="#fff"/>
      <path d="M25 23l12-12M32 10h7v7" fill="none" stroke="#0d68d8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 14c7-6 18-7 25-3" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
    return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="8" y="5" width="32" height="38" rx="10" fill="#ff7048"/>
      <path d="M17 14h14M17 21h14M17 28h10M17 35h12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path d="M12 10c7-4 16-5 24-2" fill="none" stroke="#fff" stroke-opacity=".34" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  function trophySvg(){
    return `<svg viewBox="0 0 120 110" aria-hidden="true" focusable="false">
      <path d="M43 20h35v36c0 15-8 24-18 24S43 71 43 56z" fill="#ffc928"/>
      <path d="M49 24h23v32c0 10-5 17-12 17s-11-7-11-17z" fill="#ffde58"/>
      <path d="M43 31H27c0 18 7 29 22 31M78 31h16c0 18-7 29-22 31" fill="none" stroke="#f2a80d" stroke-width="7" stroke-linecap="round"/>
      <path d="M58 80v11M43 96h34" fill="none" stroke="#d58b08" stroke-width="7" stroke-linecap="round"/>
      <path d="M60 33l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#f59e0b"/>
      <circle cx="91" cy="22" r="4" fill="#60a5fa"/><circle cx="101" cy="39" r="3" fill="#f472b6"/><circle cx="24" cy="16" r="3" fill="#34d399"/>
      <path d="M95 58l8-8M20 48l8 7M30 30l-3-10M88 75l11 2" fill="none" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon{
        overflow:visible!important;background:transparent!important;box-shadow:none!important;
        width:64px!important;height:64px!important
      }
      body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon svg{
        width:64px!important;height:64px!important;filter:drop-shadow(0 7px 8px rgba(25,60,110,.18))
      }

      body.${BODY_CLASS} #start .v59a1-assignment-card .v59a4-assignment-summary{
        display:grid;grid-template-columns:46px minmax(0,1fr);gap:11px;align-items:center;
        border:1px solid rgba(109,142,190,.13);border-radius:16px;padding:10px 11px;
        background:rgba(255,255,255,.72);box-shadow:0 5px 14px rgba(36,76,132,.05)
      }
      body.${BODY_CLASS} #start .v59a4-assignment-symbol{
        width:46px;height:46px;border-radius:14px;display:grid;place-items:center;
        background:#eef5ff;color:#1d4ed8;font-size:23px;box-shadow:inset 0 0 0 1px rgba(37,99,235,.08)
      }
      body.${BODY_CLASS} #start .v59a4-assignment-copy{min-width:0;display:grid;gap:4px}
      body.${BODY_CLASS} #start .v59a4-assignment-copy strong{font-size:14px!important;line-height:1.2!important}
      body.${BODY_CLASS} #start .v59a4-assignment-copy p{margin:0!important;font-size:10px!important;color:#526a9a!important}
      body.${BODY_CLASS} #start .v59a4-status-pill{
        justify-self:start;display:inline-flex;align-items:center;min-height:23px;padding:3px 9px;
        border-radius:999px;background:#dcfce7;color:#08765a;font-size:9px;font-weight:900
      }
      body.${BODY_CLASS} #start .v59a4-status-pill[data-state="overdue"]{background:#fff1f0;color:#b42318}
      body.${BODY_CLASS} #start .v59a4-status-pill[data-state="upcoming"]{background:#eff6ff;color:#1d4ed8}
      body.${BODY_CLASS} #start .v59a4-status-pill[data-state="complete"]{background:#ecfdf3;color:#16713d}

      body.${BODY_CLASS} #start .v59a1-recommend-card .v59a4-recommend-shell{
        display:grid;grid-template-columns:58px minmax(0,1fr);gap:12px;align-items:center;min-height:72px
      }
      body.${BODY_CLASS} #start .v59a4-rec-emblem{
        width:58px;height:64px;display:grid;place-items:center;color:#fff;font-size:21px;font-weight:900;
        background:linear-gradient(145deg,#e5e7eb,#8b94a6);clip-path:polygon(50% 0,88% 20%,88% 72%,50% 100%,12% 72%,12% 20%);
        filter:drop-shadow(0 7px 8px rgba(51,65,85,.18));position:relative
      }
      body.${BODY_CLASS} #start .v59a4-rec-emblem::before{
        content:'★';width:32px;height:32px;border-radius:50%;display:grid;place-items:center;
        background:linear-gradient(145deg,#f8fafc,#cbd5e1);color:#64748b;box-shadow:inset 0 0 0 2px rgba(255,255,255,.65)
      }
      body.${BODY_CLASS} #start .v59a4-recommend-copy{min-width:0;display:grid;gap:4px}
      body.${BODY_CLASS} #start .v59a4-recommend-copy strong{font-size:15px!important;line-height:1.15!important}
      body.${BODY_CLASS} #start .v59a4-recommend-copy p{margin:0!important;font-size:10px!important;line-height:1.35!important}

      body.${BODY_CLASS} #start #v571b-latest-achievement{
        position:relative;overflow:hidden;isolation:isolate
      }
      body.${BODY_CLASS} #start #v571b-latest-achievement::before{
        content:'✦  ·  ✧  ·  ✦';position:absolute;right:10px;top:8px;color:rgba(168,85,247,.28);
        font-size:15px;letter-spacing:5px;z-index:0
      }
      body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievement-icon{
        width:72px!important;height:78px!important;border-radius:0!important;
        clip-path:polygon(50% 0,90% 20%,90% 72%,50% 100%,10% 72%,10% 20%);
        background:linear-gradient(145deg,#7c3aed 0%,#a855f7 60%,#f59e0b 100%)!important;
        box-shadow:none!important;filter:drop-shadow(0 8px 10px rgba(124,58,237,.22));font-size:31px!important;z-index:1
      }
      body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievement-main{position:relative;z-index:1}
      body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievement-main h3{font-weight:950!important}
      body.${BODY_CLASS} #start #v571b-latest-achievement .v59a4-earned-note{
        color:#7c3aed;font-size:10px;font-weight:900;margin-top:1px
      }

      body.${BODY_CLASS} #start #v574-class-challenge-card{position:relative;overflow:hidden;isolation:isolate}
      body.${BODY_CLASS} #start #v574-class-challenge-card .v59a4-trophy-art{
        position:absolute;right:16px;bottom:8px;width:112px;height:102px;z-index:0;pointer-events:none;
        filter:drop-shadow(0 9px 10px rgba(28,81,130,.12))
      }
      body.${BODY_CLASS} #start #v574-class-challenge-card .v59a4-trophy-art svg{width:100%;height:100%}
      body.${BODY_CLASS} #start #v574-class-challenge-card .v574-challenge-head,
      body.${BODY_CLASS} #start #v574-class-challenge-card .v574-progress-head,
      body.${BODY_CLASS} #start #v574-class-challenge-card .v574-bar,
      body.${BODY_CLASS} #start #v574-class-challenge-card .v574-milestones,
      body.${BODY_CLASS} #start #v574-class-challenge-card .v574-foot{position:relative;z-index:1}
      body.${BODY_CLASS} #start #v574-class-challenge-card .v574-foot p{max-width:calc(100% - 130px)!important}
      body.${BODY_CLASS} #start #v574-class-challenge-card .v59a4-team-note{
        display:inline-flex;align-items:center;gap:4px;color:#2563eb;font-size:9px;font-weight:900
      }

      html[data-theme="dark"] body.${BODY_CLASS} #start .v59a1-assignment-card .v59a4-assignment-summary{
        background:rgba(15,23,42,.28);border-color:#243755
      }
      html[data-theme="dark"] body.${BODY_CLASS} #start .v59a4-assignment-copy p{color:#9fb0c9!important}
      html[data-theme="dark"] body.${BODY_CLASS} #start .v59a4-status-pill{background:#123f32;color:#6ee7b7}

      @media(max-width:760px){
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon,
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon svg{width:54px!important;height:54px!important}
        body.${BODY_CLASS} #start .v59a1-assignment-card .v59a4-assignment-summary{grid-template-columns:40px minmax(0,1fr);gap:8px;padding:8px}
        body.${BODY_CLASS} #start .v59a4-assignment-symbol{width:40px;height:40px;border-radius:12px;font-size:20px}
        body.${BODY_CLASS} #start .v59a1-recommend-card .v59a4-recommend-shell{grid-template-columns:48px minmax(0,1fr);gap:8px;min-height:60px}
        body.${BODY_CLASS} #start .v59a4-rec-emblem{width:48px;height:54px}
        body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievement-icon{width:64px!important;height:70px!important;font-size:28px!important}
        body.${BODY_CLASS} #start #v574-class-challenge-card .v59a4-trophy-art{right:8px;bottom:8px;width:82px;height:76px;opacity:.94}
        body.${BODY_CLASS} #start #v574-class-challenge-card .v574-foot p{max-width:calc(100% - 88px)!important}
      }
      @media(max-width:390px){
        body.${BODY_CLASS} #start #v574-class-challenge-card .v59a4-trophy-art{width:70px;height:66px;opacity:.86}
        body.${BODY_CLASS} #start #v574-class-challenge-card .v574-foot p{max-width:calc(100% - 72px)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function upgradePracticeIcons(){
    let count = 0;
    document.querySelectorAll('#v59a-practice-shortcuts .v59a-practice-tile[data-type]').forEach(tile => {
      const icon = tile.querySelector('.v59a-tile-icon');
      if (!icon) return;
      const type = tile.dataset.type || 'mixed';
      icon.innerHTML = premiumIcon(type);
      icon.dataset.v59a4Premium = 'true';
      count += 1;
    });
    return count === 3;
  }

  function assignmentState(text){
    const value = String(text || '').toLowerCase();
    if (value.includes('overdue')) return ['Overdue','overdue'];
    if (value.includes('upcoming')) return ['Upcoming','upcoming'];
    if (value.includes('all caught up') || value.includes('no active')) return ['Complete','complete'];
    return ['Available','available'];
  }

  function upgradeAssignment(){
    const card = document.querySelector('#start .v59a1-assignment-card');
    if (!card) return false;
    const heading = card.querySelector('.v59a1-card-heading');
    const strong = [...card.children].find(node => node.tagName === 'STRONG');
    const paragraph = [...card.children].find(node => node.tagName === 'P');
    const button = card.querySelector('button');
    if (!strong || !paragraph) return false;

    let summary = card.querySelector('.v59a4-assignment-summary');
    if (!summary){
      summary = document.createElement('div');
      summary.className = 'v59a4-assignment-summary';
      const symbol = document.createElement('div');
      symbol.className = 'v59a4-assignment-symbol';
      symbol.setAttribute('aria-hidden','true');
      symbol.textContent = '📋';
      const copy = document.createElement('div');
      copy.className = 'v59a4-assignment-copy';
      summary.append(symbol,copy);
      heading?.insertAdjacentElement('afterend',summary);
    }
    const copy = summary.querySelector('.v59a4-assignment-copy');
    if (strong.parentElement !== copy) copy.appendChild(strong);
    if (paragraph.parentElement !== copy) copy.appendChild(paragraph);
    let pill = copy.querySelector('.v59a4-status-pill');
    if (!pill){ pill = document.createElement('span'); pill.className = 'v59a4-status-pill'; copy.appendChild(pill); }
    const [label,state] = assignmentState(`${strong.textContent} ${paragraph.textContent}`);
    pill.textContent = label;
    pill.dataset.state = state;
    if (button) button.textContent = 'View all ›';
    return true;
  }

  function upgradeRecommendation(){
    const card = document.querySelector('#start .v59a1-recommend-card');
    if (!card) return false;
    const heading = card.querySelector('.v59a1-card-heading');
    const strong = [...card.children].find(node => node.tagName === 'STRONG');
    const paragraph = [...card.children].find(node => node.tagName === 'P');
    const button = card.querySelector('button');
    if (!strong || !paragraph) return false;

    let shell = card.querySelector('.v59a4-recommend-shell');
    if (!shell){
      shell = document.createElement('div');
      shell.className = 'v59a4-recommend-shell';
      const emblem = document.createElement('div');
      emblem.className = 'v59a4-rec-emblem';
      emblem.setAttribute('aria-hidden','true');
      const copy = document.createElement('div');
      copy.className = 'v59a4-recommend-copy';
      shell.append(emblem,copy);
      heading?.insertAdjacentElement('afterend',shell);
    }
    const copy = shell.querySelector('.v59a4-recommend-copy');
    if (strong.parentElement !== copy) copy.appendChild(strong);
    if (paragraph.parentElement !== copy) copy.appendChild(paragraph);
    const title = String(strong.textContent || '').trim();
    if (title && !/practice$/i.test(title) && !/all caught up/i.test(title)) strong.textContent = `${title} Practice`;
    const match = String(paragraph.textContent || '').match(/(\d+)\s+questions/i);
    if (match) paragraph.textContent = `${match[1]} questions ready`;
    if (button && !button.disabled) button.textContent = 'Start ›';
    return true;
  }

  function upgradeAchievement(){
    const card = document.getElementById('v571b-latest-achievement');
    if (!card) return false;
    const main = card.querySelector('.v571b-achievement-main');
    if (main && !main.querySelector('.v59a4-earned-note')){
      const note = document.createElement('div');
      note.className = 'v59a4-earned-note';
      note.textContent = 'You earned this!';
      const paragraph = main.querySelector('p');
      paragraph?.insertAdjacentElement('beforebegin',note);
    }
    return true;
  }

  function upgradeChallenge(){
    const card = document.getElementById('v574-class-challenge-card');
    if (!card) return false;
    if (!card.querySelector('.v59a4-trophy-art')){
      const art = document.createElement('div');
      art.className = 'v59a4-trophy-art';
      art.innerHTML = trophySvg();
      card.appendChild(art);
    }
    const head = card.querySelector('.v574-challenge-head>div:first-child');
    if (head && !head.querySelector('.v59a4-team-note')){
      const note = document.createElement('div');
      note.className = 'v59a4-team-note';
      note.innerHTML = '<span aria-hidden="true">👥</span><span>Stronger together</span>';
      head.appendChild(note);
    }
    return true;
  }

  function apply(){
    injectStyles();
    if (!signedIn()){
      document.body?.classList.remove(BODY_CLASS);
      return false;
    }
    const root = document.querySelector('#start .v40c3-home-dashboard.v59a-home-refresh');
    if (!root) return false;
    document.body?.classList.add(BODY_CLASS);
    upgradePracticeIcons();
    upgradeAssignment();
    upgradeRecommendation();
    upgradeAchievement();
    upgradeChallenge();
    window.dispatchEvent(new CustomEvent('v59a4:concept-enriched'));
    return true;
  }

  function scheduleApply(attempt=0){
    if (typeof window === 'undefined') return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(()=>{
      retryTimer = 0;
      const ok = apply();
      if (!ok && signedIn() && attempt < 50) scheduleApply(attempt+1);
    },attempt ? 120 : 40);
  }

  function watch(){
    if (observer || typeof MutationObserver === 'undefined') return;
    const root = document.querySelector('#start .v40c3-home-dashboard');
    if (!root) return;
    let queued = false;
    observer = new MutationObserver(()=>{
      if (queued) return;
      queued = true;
      queueMicrotask(()=>{ queued = false; apply(); });
    });
    observer.observe(root,{childList:true,subtree:true});
  }

  function wire(){
    if (installed || typeof document === 'undefined') return installed;
    installed = true;
    injectStyles();
    ['v59a:home-refreshed','v59a1:design-system-applied','v59a2:mobile-density-applied','v59a3:layout-corrected','v57c:home-updated','v571b:achievements-updated','v572:missions-updated']
      .forEach(name=>window.addEventListener(name,()=>scheduleApply()));
    window.addEventListener('pageshow',()=>scheduleApply());
    window.addEventListener('focus',()=>scheduleApply());
    scheduleApply();
    window.setTimeout(watch,300);
    return true;
  }

  const api = Object.freeze({STYLE_ID,BODY_CLASS,signedIn,upgradePracticeIcons,upgradeAssignment,upgradeRecommendation,upgradeAchievement,upgradeChallenge,apply});

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V59A4StudentHomeConceptEnrichment',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();