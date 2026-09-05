/* V5.9A.3 — Student Home final layout and control polish.
   Presentation/navigation-only correction after real-device review. Targets the visible
   V5.7.4 class-challenge card, enforces the approved lower-dashboard order, removes the
   duplicate legacy feedback bubble from the redesigned Home, and keeps theme switching
   available through More on mobile. No learning/data authority is added. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59a3StudentHomeLayoutCorrectionInstalled) return;
  ROOT.__v59a3StudentHomeLayoutCorrectionInstalled = true;

  const STYLE_ID = 'v59a3-student-home-layout-correction-style';
  const THEME_ACTION_ID = 'v59a3-more-theme';
  const LEGACY_FEEDBACK_ID = 'v5761-feedback-icon';
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

      /* V5.9A profile owns student Home feedback visually. Keep the accepted source
         workflow underneath, but remove the historical floating proxy to avoid overlap. */
      body.v59a2-mobile-density #start #${LEGACY_FEEDBACK_ID}{display:none!important}
      body.v59a2-mobile-density #start #v59a-student-profile .v59a-profile-actions{
        position:relative;z-index:7;gap:8px!important
      }
      body.v59a2-mobile-density #start #v59a-student-profile .v59a-profile-action{
        position:relative;z-index:7
      }

      /* The visible challenge is V5.7.4. Force both generations full width safely and
         make CSS order agree with the approved DOM order. */
      body.v59a2-mobile-density #start #v574-class-challenge-card,
      body.v59a2-mobile-density #start #v573-class-challenge-card{
        grid-column:1/-1!important;
        order:60!important;
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
        justify-self:stretch!important;
        align-self:stretch!important;
      }
      body.v59a2-mobile-density #start #v572-weekly-missions-card,
      body.v59a2-mobile-density #start #v571b-latest-achievement{order:50!important}

      body.v59a2-mobile-density #start #v574-class-challenge-card{
        border-radius:21px!important;
        box-shadow:0 10px 28px rgba(36,76,132,.08)!important;
      }

      @media(max-width:760px){
        /* Remove the unused top theme strip on the student Home. Appearance remains
           available from More through a proxy to the existing theme toggle. */
        body.v59a2-mobile-density .app-theme-bar{display:none!important}
        body.v59a2-mobile-density .shell{margin-top:0!important}

        /* Slightly denser motivation row. */
        body.v59a2-mobile-density #start #v572-weekly-missions-card,
        body.v59a2-mobile-density #start #v571b-latest-achievement{
          min-height:166px!important;padding:11px!important;gap:6px!important
        }
        body.v59a2-mobile-density #start #v572-weekly-missions-card .v572-mission-head{gap:4px!important}
        body.v59a2-mobile-density #start #v572-weekly-missions-card .v59a-mission-streak{margin-top:2px!important;line-height:1.02!important}
        body.v59a2-mobile-density #start #v572-weekly-missions-card .v572-mission-list{gap:3px!important}
        body.v59a2-mobile-density #start #v59a-mission-toggle{
          margin:0!important;padding:0!important;align-self:start!important;justify-self:start!important
        }
        body.v59a2-mobile-density #start #v571b-latest-achievement .v571b-achievement-icon{
          width:62px!important;height:62px!important
        }
        body.v59a2-mobile-density #start #v571b-latest-achievement .v571b-achievements{
          margin-top:2px!important;padding-top:5px!important
        }

        /* Compact the cooperative challenge while retaining useful class context. */
        body.v59a2-mobile-density #start #v574-class-challenge-card{
          min-height:136px!important;
          padding:12px!important;
          border-radius:19px!important;
          gap:7px!important;
        }
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-challenge-head{gap:6px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-kicker{font-size:8.5px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-challenge-head h3{font-size:16px!important;line-height:1.12!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-challenge-head p{font-size:8px!important;line-height:1.25!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-week{font-size:7.5px!important;padding:3px 6px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-progress-head strong{font-size:10.5px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-phase{font-size:7.5px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-bar{height:8px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-milestones{font-size:7.5px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-foot{padding-top:3px!important;gap:5px!important}
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-foot p{
          font-size:7.5px!important;line-height:1.25!important;max-width:none!important;
          display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden
        }
        body.v59a2-mobile-density #start #v574-class-challenge-card .v574-foot button{font-size:8.5px!important;padding:6px 8px!important}
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

  function updateThemeActionLabel(){
    const button = document.getElementById(THEME_ACTION_ID);
    if (!button) return false;
    const dark = document.documentElement?.dataset?.theme === 'dark';
    button.innerHTML = `<span aria-hidden="true">${dark?'☀️':'🌙'}</span><span>${dark?'Switch to Light mode':'Switch to Dark mode'}</span>`;
    button.setAttribute('aria-label',dark?'Switch to Light mode':'Switch to Dark mode');
    return true;
  }

  function ensureThemeAction(){
    const sheet = document.getElementById('v59a-more-sheet');
    const card = sheet?.querySelector('.v59a-more-card');
    if (!card) return false;
    let button = document.getElementById(THEME_ACTION_ID);
    if (!button){
      button = document.createElement('button');
      button.id = THEME_ACTION_ID;
      button.type = 'button';
      button.className = 'v59a-more-action';
      button.addEventListener('click',event=>{
        event.preventDefault();
        document.getElementById('theme-toggle')?.click();
        window.setTimeout(updateThemeActionLabel,0);
      });
      const logout = card.querySelector('#v59a1-more-logout');
      if (logout) logout.insertAdjacentElement('beforebegin',button);
      else card.appendChild(button);
    }
    updateThemeActionLabel();
    return true;
  }

  function watchDashboard(){
    if (observer || typeof MutationObserver === 'undefined') return;
    const root = document.querySelector('#start .v40c3-home-dashboard');
    if (!root) return;
    observer = new MutationObserver(()=>{
      reorderLowerDashboard();
      ensureThemeAction();
    });
    observer.observe(root,{childList:true});
  }

  function apply(){
    injectStyles();
    if (!signedIn()) return false;
    const root = document.querySelector('#start .v40c3-home-dashboard.v59a-home-refresh');
    if (!root) return false;
    reorderLowerDashboard();
    ensureThemeAction();
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
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('[data-v59a-profile-action="more"],[data-v59a-nav="more"]')){
        window.setTimeout(ensureThemeAction,40);
      }
    },true);
    scheduleApply();
    return true;
  }

  const api = Object.freeze({STYLE_ID,THEME_ACTION_ID,signedIn,reorderLowerDashboard,ensureThemeAction,apply});

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V59A3StudentHomeLayoutCorrection',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();