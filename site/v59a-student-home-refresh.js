/* V5.9A — Student Home Refresh.
   Presentation/navigation-only layer over the accepted V5.8 student Home.
   Reuses Continue Learning, Practice type selection, assignments, progress,
   XP/levels, streaks, missions, achievements and class challenge ownership.
   No network calls, data writes, grading changes or new learning rules. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59aStudentHomeRefreshInstalled) return;
  ROOT.__v59aStudentHomeRefreshInstalled = true;

  const STYLE_ID = 'v59a-student-home-refresh-style';
  const SHORTCUTS_ID = 'v59a-practice-shortcuts';
  const HERO_KICKER_ID = 'v59a-home-kicker';
  const HERO_MOMENTUM_ID = 'v59a-home-momentum';
  const DASHBOARD_SELECTOR = '#start .v40c3-home-dashboard';
  let retryTimer = 0;
  let installed = false;

  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function dashboard(){
    return typeof document === 'undefined' ? null : document.querySelector(DASHBOARD_SELECTOR);
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start.v40-shell-authenticated[data-v40-start-view="home"] .v40-learning-hub-hero.v59a-hero-refresh{
        position:relative;overflow:hidden;border:1px solid color-mix(in srgb,#3b82f6 20%,var(--border));
        border-radius:24px;padding:20px 21px;background:
          radial-gradient(circle at 92% 18%,rgba(255,255,255,.62) 0 7%,transparent 8%),
          linear-gradient(135deg,color-mix(in srgb,#dff4ff 82%,var(--card)),color-mix(in srgb,#eef2ff 76%,var(--card)) 58%,var(--card));
        box-shadow:0 14px 34px rgba(30,64,175,.08)
      }
      #start .v59a-hero-refresh::after{content:'÷   △   ½';position:absolute;right:18px;bottom:12px;color:color-mix(in srgb,#2563eb 22%,transparent);font-size:22px;font-weight:900;letter-spacing:10px;pointer-events:none}
      #start #${HERO_KICKER_ID}{font-size:10px;font-weight:950;letter-spacing:.09em;text-transform:uppercase;color:#2563eb;margin:0 0 5px}
      #start .v59a-hero-refresh h2{position:relative;z-index:1;margin-bottom:5px!important;font-size:clamp(23px,3.5vw,31px)!important;letter-spacing:-.02em}
      #start .v59a-hero-refresh p{position:relative;z-index:1;max-width:720px!important;font-size:13px!important;line-height:1.55!important}
      #start #${HERO_MOMENTUM_ID}{position:relative;z-index:1;display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
      #start #${HERO_MOMENTUM_ID} span{display:inline-flex;align-items:center;min-height:29px;padding:5px 9px;border:1px solid rgba(37,99,235,.15);border-radius:999px;background:rgba(255,255,255,.66);font-size:10px;font-weight:900;color:#1e40af}

      #start .v40c3-home-dashboard.v59a-home-refresh{display:grid;gap:14px}
      #start .v59a-home-refresh > article,#start .v59a-home-refresh > section,#start .v59a-home-refresh > div{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}

      #start .v59a-home-refresh #v571a-gamification-card{
        border:1px solid color-mix(in srgb,#14b8a6 25%,var(--border));border-radius:22px;
        background:linear-gradient(135deg,color-mix(in srgb,#e6fffb 82%,var(--card)),color-mix(in srgb,#eff6ff 72%,var(--card)));
        box-shadow:0 10px 28px rgba(13,148,136,.08);padding:17px 18px
      }
      #start .v59a-home-refresh .v571a-level-badge{border-radius:18px;background:linear-gradient(145deg,#14b8a6,#2563eb);box-shadow:inset 0 0 0 4px rgba(255,255,255,.2),0 8px 18px rgba(37,99,235,.18)}
      #start .v59a-home-refresh .v571a-progress{height:12px;background:rgba(148,163,184,.22)}
      #start .v59a-home-refresh .v571a-progress>span{background:linear-gradient(90deg,#14b8a6,#3b82f6)}
      #start .v59a-home-refresh .v571b-streak-chip{background:color-mix(in srgb,#fff7ed 84%,var(--card));border-color:color-mix(in srgb,#fb923c 36%,var(--border));box-shadow:0 4px 11px rgba(234,88,12,.06)}
      #start .v59a-home-refresh .v571b-streak-note{border:0;background:rgba(255,255,255,.5);padding:9px 11px}

      #start .v59a-home-refresh #v58a-first-use-card{
        border:1px solid color-mix(in srgb,#8b5cf6 25%,var(--border));border-radius:22px;
        box-shadow:0 12px 30px rgba(124,58,237,.08)
      }

      #start .v59a-home-refresh .v57c-continue-card{
        position:relative;overflow:hidden;border:0;border-radius:24px;padding:20px 21px;
        background:linear-gradient(135deg,#4f46e5 0%,#6d28d9 58%,#7c3aed 100%);color:#fff;
        box-shadow:0 16px 36px rgba(79,70,229,.24);grid-template-columns:minmax(0,1fr) auto
      }
      #start .v59a-home-refresh .v57c-continue-card::after{content:'✦';position:absolute;right:25%;top:12px;font-size:64px;color:rgba(255,255,255,.08);transform:rotate(18deg);pointer-events:none}
      #start .v59a-home-refresh .v57c-kicker{color:#ddd6fe;font-size:10px;letter-spacing:.1em}
      #start .v59a-home-refresh .v57c-continue-card h2{position:relative;z-index:1;color:#fff;font-size:clamp(21px,3vw,28px)}
      #start .v59a-home-refresh .v57c-continue-card p{position:relative;z-index:1;color:rgba(255,255,255,.82);max-width:760px}
      #start .v59a-home-refresh .v57c-meta{position:relative;z-index:1}
      #start .v59a-home-refresh .v57c-meta span{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.12);color:#fff}
      #start .v59a-home-refresh .v57c-primary{position:relative;z-index:1;border-color:#fff;background:#fff;color:#4338ca;box-shadow:0 8px 18px rgba(30,27,75,.2);font-weight:950}
      #start .v59a-home-refresh .v57c-primary:hover:not(:disabled){transform:translateY(-1px);background:#f8fafc}

      #start #${SHORTCUTS_ID}{border:0;border-radius:22px;padding:16px;background:color-mix(in srgb,var(--soft) 22%,var(--card));display:grid;gap:11px}
      #start #${SHORTCUTS_ID} .v59a-shortcut-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #start #${SHORTCUTS_ID} .v59a-shortcut-kicker{font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--primary);margin-bottom:2px}
      #start #${SHORTCUTS_ID} h3{margin:0;font-size:18px;line-height:1.25}
      #start #${SHORTCUTS_ID} .v59a-shortcut-note{font-size:10px;color:var(--muted);font-weight:750}
      #start #${SHORTCUTS_ID} .v59a-shortcut-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      #start #${SHORTCUTS_ID} .v59a-practice-tile{position:relative;overflow:hidden;min-height:104px;border:1px solid var(--border);border-radius:18px;padding:13px;text-align:left;background:var(--card);color:var(--text);display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;cursor:pointer;box-shadow:0 7px 20px rgba(15,23,42,.04)}
      #start #${SHORTCUTS_ID} .v59a-practice-tile::after{content:'→';position:absolute;right:12px;bottom:10px;font-size:18px;font-weight:950;opacity:.55}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-type="mixed"]{background:linear-gradient(145deg,color-mix(in srgb,#dcfce7 72%,var(--card)),var(--card));border-color:color-mix(in srgb,#22c55e 28%,var(--border))}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-type="topic"]{background:linear-gradient(145deg,color-mix(in srgb,#dbeafe 74%,var(--card)),var(--card));border-color:color-mix(in srgb,#3b82f6 28%,var(--border))}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-type="past_paper"]{background:linear-gradient(145deg,color-mix(in srgb,#ffedd5 74%,var(--card)),var(--card));border-color:color-mix(in srgb,#f97316 28%,var(--border))}
      #start #${SHORTCUTS_ID} .v59a-practice-tile:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(15,23,42,.08)}
      #start #${SHORTCUTS_ID} .v59a-tile-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.72);font-size:21px;box-shadow:inset 0 0 0 1px rgba(148,163,184,.12)}
      #start #${SHORTCUTS_ID} .v59a-tile-main{min-width:0;padding-right:16px}
      #start #${SHORTCUTS_ID} .v59a-tile-main strong{display:block;font-size:13px;margin:2px 0 4px}
      #start #${SHORTCUTS_ID} .v59a-tile-main span{display:block;color:var(--muted);font-size:10px;line-height:1.4;font-weight:650}

      #start .v59a-home-refresh .v57c-home-grid{gap:11px}
      #start .v59a-home-refresh .v57c-mini-card{border:1px solid color-mix(in srgb,var(--border) 86%,transparent);border-radius:18px;padding:15px 15px 14px;box-shadow:0 7px 20px rgba(15,23,42,.04);position:relative;overflow:hidden}
      #start .v59a-home-refresh .v57c-mini-card::before{content:'';position:absolute;left:0;right:0;top:0;height:4px}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(1)::before{background:linear-gradient(90deg,#8b5cf6,#6366f1)}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(2)::before{background:linear-gradient(90deg,#14b8a6,#22c55e)}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(3)::before{background:linear-gradient(90deg,#f59e0b,#f97316)}
      #start .v59a-home-refresh .v57c-mini-card:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(15,23,42,.07)}
      #start .v59a-home-refresh .v57c-mini-kicker{margin-top:2px}
      #start .v59a-home-refresh .v57c-mini-card button{border-radius:11px;font-weight:900}

      #start .v59a-home-refresh #v572-weekly-missions-card,
      #start .v59a-home-refresh #v573-class-challenge-card,
      #start .v59a-home-refresh #v571b-latest-achievement{
        border-radius:21px;box-shadow:0 9px 24px rgba(15,23,42,.05)
      }
      #start .v59a-home-refresh #v572-weekly-missions-card{border-color:color-mix(in srgb,#6366f1 22%,var(--border));background:linear-gradient(135deg,color-mix(in srgb,#eef2ff 72%,var(--card)),var(--card))}
      #start .v59a-home-refresh #v573-class-challenge-card{border-color:color-mix(in srgb,#06b6d4 22%,var(--border));background:linear-gradient(135deg,color-mix(in srgb,#ecfeff 68%,var(--card)),var(--card))}
      #start .v59a-home-refresh #v571b-latest-achievement{border-color:color-mix(in srgb,#f59e0b 22%,var(--border));background:linear-gradient(135deg,color-mix(in srgb,#fff7ed 72%,var(--card)),var(--card))}
      #start .v59a-home-refresh .v571b-achievement-icon{background:linear-gradient(145deg,#f59e0b,#8b5cf6)}
      #start .v59a-home-refresh .v571b-kicker{color:#a16207}
      #start .v59a-home-refresh .v572-mini-progress{height:8px}
      #start .v59a-home-refresh .v573-bar{height:11px}

      #start .v59a-home-refresh .v57c-secondary{padding:2px 0 0;gap:9px}
      #start .v59a-home-refresh .v57c-secondary button{border-radius:12px;min-height:42px;font-weight:900}

      html[data-theme="dark"] #start .v59a-hero-refresh{background:linear-gradient(135deg,color-mix(in srgb,#1d4ed8 14%,var(--card)),color-mix(in srgb,#312e81 18%,var(--card)))}
      html[data-theme="dark"] #start #${HERO_MOMENTUM_ID} span{background:rgba(15,23,42,.45);color:#bfdbfe;border-color:rgba(96,165,250,.25)}
      html[data-theme="dark"] #start #${SHORTCUTS_ID}{background:color-mix(in srgb,var(--soft) 12%,var(--card))}
      html[data-theme="dark"] #start #${SHORTCUTS_ID} .v59a-tile-icon{background:rgba(15,23,42,.38)}
      html[data-theme="dark"] #start .v59a-home-refresh .v571b-streak-note{background:rgba(15,23,42,.22)}

      @media(max-width:760px){
        #start #${SHORTCUTS_ID} .v59a-shortcut-grid{grid-template-columns:1fr 1fr}
        #start #${SHORTCUTS_ID} .v59a-practice-tile:last-child{grid-column:1/-1}
        #start .v59a-home-refresh .v57c-continue-card{grid-template-columns:1fr;padding:18px}
        #start .v59a-home-refresh .v57c-primary{width:100%;min-width:0}
      }
      @media(max-width:520px){
        #start.v40-shell-authenticated[data-v40-start-view="home"] .v40-learning-hub-hero.v59a-hero-refresh{padding:17px 16px;border-radius:20px}
        #start .v59a-hero-refresh::after{font-size:18px;letter-spacing:7px;right:8px}
        #start #${SHORTCUTS_ID}{padding:13px;border-radius:19px}
        #start #${SHORTCUTS_ID} .v59a-shortcut-grid{grid-template-columns:1fr}
        #start #${SHORTCUTS_ID} .v59a-practice-tile:last-child{grid-column:auto}
        #start #${SHORTCUTS_ID} .v59a-practice-tile{min-height:86px}
        #start .v59a-home-refresh #v571a-gamification-card{padding:14px}
        #start .v59a-home-refresh .v57c-continue-card{border-radius:20px}
      }
      @media(prefers-reduced-motion:reduce){
        #start .v59a-home-refresh > article,#start .v59a-home-refresh > section,#start .v59a-home-refresh > div,#start #${SHORTCUTS_ID} .v59a-practice-tile{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceHero(){
    const hero = document.querySelector('#start .v40-learning-hub-hero');
    if (!hero || !signedIn()) return false;
    hero.classList.add('v59a-hero-refresh');

    if (!document.getElementById(HERO_KICKER_ID)){
      const kicker = document.createElement('div');
      kicker.id = HERO_KICKER_ID;
      kicker.textContent = 'Year 6 Maths · Keep building momentum';
      hero.insertAdjacentElement('afterbegin',kicker);
    }

    if (!document.getElementById(HERO_MOMENTUM_ID)){
      const momentum = document.createElement('div');
      momentum.id = HERO_MOMENTUM_ID;
      momentum.setAttribute('aria-label','Learning focus');
      momentum.innerHTML = '<span>✦ Practise</span><span>↗ Improve</span><span>🏅 Progress</span>';
      hero.appendChild(momentum);
    }
    return true;
  }

  function openLearn(){
    const nav = document.querySelector('#start .v40-student-nav [data-v40-nav="learn"]');
    if (nav){ nav.click(); return true; }
    const open = document.querySelector('#start .v40c-open-learn');
    if (open){ open.click(); return true; }
    const setup = document.querySelector('#start .v40c-learn-setup');
    setup?.scrollIntoView?.({behavior:'smooth',block:'start'});
    return !!setup;
  }

  function ensureSettingsOpen(){
    const summary = document.querySelector('#start .v40c-practice-summary');
    const button = summary?.querySelector('.v40c-change-settings');
    if (summary && button && !summary.classList.contains('v40c-settings-open')) button.click();
  }

  function setPracticeType(type){
    try {
      const api = ROOT.V55APastPaperPractice;
      if (api?.setPracticeType){ api.setPracticeType(type); return true; }
    } catch {}
    const button = document.querySelector(`#v55a-practice-source .v55a-practice-type[data-type="${type}"]`);
    if (button){ button.click(); return true; }
    return false;
  }

  function openPracticeShortcut(type){
    if (!signedIn()) return false;
    try { ROOT.V561PracticeFirstStudentExperience?.ensurePracticeSelection?.(); } catch {}
    setPracticeType(type);
    openLearn();
    window.setTimeout(() => {
      if (type === 'topic'){
        ensureSettingsOpen();
        document.getElementById('topic-filter')?.focus?.({preventScroll:true});
      } else if (type === 'past_paper'){
        document.getElementById('v55a-paper-year')?.focus?.({preventScroll:true});
      } else {
        document.querySelector('#start .v40c-practice-summary')?.scrollIntoView?.({behavior:'smooth',block:'center'});
      }
    },220);
    return true;
  }

  function shortcutMarkup(){
    return `
      <div class="v59a-shortcut-head">
        <div><div class="v59a-shortcut-kicker">Today's Practice</div><h3>Choose how you want to practise.</h3></div>
        <span class="v59a-shortcut-note">Same Practice engine · quicker entry</span>
      </div>
      <div class="v59a-shortcut-grid">
        <button type="button" class="v59a-practice-tile" data-type="mixed">
          <span class="v59a-tile-icon" aria-hidden="true">🔀</span>
          <span class="v59a-tile-main"><strong>Mixed Practice</strong><span>Build confidence with a balanced mix of questions.</span></span>
        </button>
        <button type="button" class="v59a-practice-tile" data-type="topic">
          <span class="v59a-tile-icon" aria-hidden="true">🎯</span>
          <span class="v59a-tile-main"><strong>Topic Practice</strong><span>Choose a topic and focus on one area at a time.</span></span>
        </button>
        <button type="button" class="v59a-practice-tile" data-type="past_paper">
          <span class="v59a-tile-icon" aria-hidden="true">📄</span>
          <span class="v59a-tile-main"><strong>Past Papers</strong><span>Practise real paper questions with normal Practice help.</span></span>
        </button>
      </div>`;
  }

  function ensureShortcuts(){
    const root = dashboard();
    const anchor = root?.querySelector('.v57c-continue-card');
    if (!root || !anchor || !signedIn()) return false;

    let shortcuts = document.getElementById(SHORTCUTS_ID);
    if (!shortcuts){
      shortcuts = document.createElement('section');
      shortcuts.id = SHORTCUTS_ID;
      shortcuts.setAttribute('aria-label','Practice shortcuts');
      shortcuts.innerHTML = shortcutMarkup();
      shortcuts.addEventListener('click',event => {
        const tile = event.target?.closest?.('.v59a-practice-tile[data-type]');
        if (!tile) return;
        event.preventDefault();
        openPracticeShortcut(tile.dataset.type || 'mixed');
      });
    }
    if (anchor.nextElementSibling !== shortcuts) anchor.insertAdjacentElement('afterend',shortcuts);
    return true;
  }

  function clearPresentation(){
    document.getElementById(SHORTCUTS_ID)?.remove();
    const hero = document.querySelector('#start .v40-learning-hub-hero');
    hero?.classList.remove('v59a-hero-refresh');
    document.getElementById(HERO_KICKER_ID)?.remove();
    document.getElementById(HERO_MOMENTUM_ID)?.remove();
    dashboard()?.classList.remove('v59a-home-refresh');
  }

  function apply(){
    injectStyles();
    if (!signedIn()){
      clearPresentation();
      return false;
    }
    const root = dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    root.classList.add('v59a-home-refresh');
    enhanceHero();
    ensureShortcuts();
    window.dispatchEvent(new CustomEvent('v59a:home-refreshed'));
    return true;
  }

  function scheduleApply(attempt=0){
    if (typeof window === 'undefined') return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      retryTimer = 0;
      if (!signedIn()){
        clearPresentation();
        return;
      }
      const ok = apply();
      if (!ok && attempt < 50) scheduleApply(attempt+1);
    }, attempt ? 140 : 40);
  }

  function wire(){
    if (installed || typeof document === 'undefined') return installed;
    installed = true;
    injectStyles();

    ['v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated']
      .forEach(name => window.addEventListener(name,()=>scheduleApply()));

    window.addEventListener('pageshow',()=>scheduleApply());
    window.addEventListener('focus',()=>{
      if (document.getElementById('start')?.classList.contains('active')) scheduleApply();
    });

    document.addEventListener('click',event => {
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleApply();
      if (event.target?.closest?.('#v40c-student-logout')) clearPresentation();
    },true);

    scheduleApply();
    return true;
  }

  const api = Object.freeze({
    SHORTCUTS_ID,HERO_KICKER_ID,HERO_MOMENTUM_ID,
    signedIn,openLearn,setPracticeType,openPracticeShortcut,ensureShortcuts,enhanceHero,apply
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V59AStudentHomeRefresh',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();