/* V5.9A.3 — Student Home layout correction.
   Presentation-only correction after real-device review. Targets the visible V5.7.4
   class-challenge card, enforces the approved lower-dashboard order, and restores
   readable profile contrast in dark mode. No learning/data authority is added. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59a3StudentHomeLayoutCorrectionInstalled) return;
  ROOT.__v59a3StudentHomeLayoutCorrectionInstalled = true;

  const STYLE_ID = 'v59a3-student-home-layout-correction-style';
  let observer = null;
  let retryTimer = 0;
  let installed = false;

  function signedIn(){
    return typeof document !== 'undefined' &&
      !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Student Home should stay focused on student learning at every viewport. */
      body.v59a2-mobile-density #start .v39-teacher-zone,
      body.v59a2-mobile-density #start .v40-teacher-access,
      body.v59a2-mobile-density #start > .info{display:none!important}

      /* The visible challenge is V5.7.4. Force both generations full width safely. */
      body.v59a2-mobile-density #start #v574-class-challenge-card,
      body.v59a2-mobile-density #start #v573-class-challenge-card{
        grid-column:1/-1!important;
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
        justify-self:stretch!important;
        align-self:stretch!important;
      }

      body.v59a2-mobile-density #start #v574-class-challenge-card{
        border-radius:21px!important;
        box-shadow:0 10px 28px rgba(36,76,132,.08)!important;
      }

      @media(max-width:760px){
        body.v59a2-mobile-density #start #v574-class-challenge-card{
          min-height:150px!important;
          padding:14px!important;
          border-radius:19px!important;
          gap:9px!important;
        }
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-challenge-head{gap:7px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-kicker{font-size:9px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-challenge-head h3{font-size:17px!important;line-height:1.15!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-challenge-head p{font-size:8.5px!important;line-height:1.3!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-week{font-size:8px!important;padding:4px 6px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-progress-head strong{font-size:11px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-phase{font-size:8px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-bar{height:9px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-milestones{font-size:8px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-foot{padding-top:6px!important;gap:6px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-foot p{font-size:8px!important;line-height:1.3!important;max-width:none!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-foot button{font-size:9px!important;padding:7px 9px!important}
      }

      /* Header stays light even in dark mode, so its text must remain dark and legible. */
      html[data-theme="dark"] body.v59a2-mobile-density #start #v59a-student-profile .v59a-greeting,
      html[data-theme="dark"] body.v59a2-mobile-density #start #v59a-student-profile .v59a-xp-text{color:#10205a!important}
      html[data-theme="dark"] body.v59a2-mobile-density #start #v59a-student-profile .v59a-year{color:#526a9a!important}
      html[data-theme="dark"] body.v59a2-mobile-density #start #v59a-student-profile .v59a-level-pill{color:#213b82!important;background:rgba(255,255,255,.72)!important;border-color:rgba(37,99,235,.12)!important}
      html[data-theme="dark"] body.v59a2-mobile-density #start #v59a-student-profile .v59a-profile-action{color:#17356f!important;background:rgba(255,255,255,.75)!important}

      html[data-theme="dark"] body.v59a2-mobile-density #start #v574-class-challenge-card{
        background:linear-gradient(145deg,#10243c,#0f1f35)!important;
        border-color:#22415c!important;
        color:#eef5ff!important;
      }
      html[data-theme="dark"] body.v59a2-mobile-density #start #v574-class-challenge-card .v574-challenge-head p,
      html[data-theme="dark"] body.v59a2-mobile-density #start #v574-class-challenge-card .v574-foot p,
      html[data-theme="dark"] body.v59a2-mobile-density #start #v574-class-challenge-card .v574-milestones{color:#a8b6cf!important}
      html[data-theme="dark"] body.v59a2-mobile-density #start #v574-class-challenge-card .v574-bar{background:#2b3a50!important}
    `;
    document.head.appendChild(style);
  }

  function reorderLowerDashboard(){
    const root = document.querySelector('#start .v40c3-home-dashboard.v59a-home-refresh');
    if (!root) return false;

    const primaryGrid = root.querySelector('.v57c-home-grid');
    const missions = document.getElementById('v572-weekly-missions-card');
    const achievement = document.getElementById('v571b-latest-achievement');
    const visibleChallenge = document.getElementById('v574-class-challenge-card') || document.getElementById('v573-class-challenge-card');

    if (primaryGrid && missions && primaryGrid.nextElementSibling !== missions){
      primaryGrid.insertAdjacentElement('afterend', missions);
    }
    if (missions && achievement && missions.nextElementSibling !== achievement){
      missions.insertAdjacentElement('afterend', achievement);
    }
    if (achievement && visibleChallenge && achievement.nextElementSibling !== visibleChallenge){
      achievement.insertAdjacentElement('afterend', visibleChallenge);
    }

    return !!(missions && achievement && visibleChallenge);
  }

  function watchDashboard(){
    if (observer || typeof MutationObserver === 'undefined') return;
    const root = document.querySelector('#start .v40c3-home-dashboard');
    if (!root) return;
    observer = new MutationObserver(()=>reorderLowerDashboard());
    observer.observe(root,{childList:true});
  }

  function apply(){
    injectStyles();
    if (!signedIn()) return false;
    const root = document.querySelector('#start .v40c3-home-dashboard.v59a-home-refresh');
    if (!root) return false;
    reorderLowerDashboard();
    watchDashboard();
    window.dispatchEvent(new CustomEvent('v59a3:layout-corrected'));
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

  function wire(){
    if (installed || typeof document === 'undefined') return installed;
    installed = true;
    injectStyles();
    ['v59a:home-refreshed','v59a1:design-system-applied','v59a2:mobile-density-applied','v57c:home-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated']
      .forEach(name=>window.addEventListener(name,()=>scheduleApply()));
    window.addEventListener('pageshow',()=>scheduleApply());
    window.addEventListener('focus',()=>scheduleApply());
    scheduleApply();
    return true;
  }

  const api = Object.freeze({STYLE_ID,signedIn,reorderLowerDashboard,apply});

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V59A3StudentHomeLayoutCorrection',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();