/* V5.9A.2 — Student Home mobile-density and hierarchy pass.
   Presentation-only refinement over V5.9A/V5.9A.1. Uses the approved mobile
   dashboard reference and real-device screenshots to tighten hierarchy while
   preserving all existing learning, navigation and data ownership. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59a2StudentHomeMobileDensityInstalled) return;
  ROOT.__v59a2StudentHomeMobileDensityInstalled = true;

  const STYLE_ID = 'v59a2-student-home-mobile-density-style';
  const BODY_CLASS = 'v59a2-mobile-density';
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
      /* Global Home hierarchy: match the approved concept order. */
      body.${BODY_CLASS} #start .v57c-mini-card.v59a1-recent-card{display:none!important}
      body.${BODY_CLASS} #start #v572-weekly-missions-card{grid-column:1!important;order:50!important;min-width:0!important}
      body.${BODY_CLASS} #start #v571b-latest-achievement{grid-column:2!important;order:50!important;min-width:0!important}
      body.${BODY_CLASS} #start #v573-class-challenge-card{grid-column:1/-1!important;order:60!important;width:100%!important;max-width:none!important;justify-self:stretch!important}

      @media(max-width:760px){
        body.${BODY_CLASS}{padding-bottom:84px!important}
        body.${BODY_CLASS} #start.v40-shell-authenticated[data-v40-start-view="home"]{padding-bottom:12px!important}

        /* Keep teacher/release infrastructure available elsewhere, not in the normal student Home. */
        body.${BODY_CLASS} #start .v39-teacher-zone,
        body.${BODY_CLASS} #start .v40-teacher-access,
        body.${BODY_CLASS} #start > .info{display:none!important}

        /* Compact the profile without losing the identity / XP hierarchy. */
        body.${BODY_CLASS} #start #v59a-student-profile{
          grid-template-columns:64px minmax(0,1fr) auto!important;
          gap:10px!important;padding:14px 13px 72px!important;min-height:194px!important
        }
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-avatar{width:64px!important;height:64px!important;border-width:4px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-greeting{font-size:25px!important;line-height:1!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-year{font-size:9.5px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-level-pill{font-size:10px!important;padding:4px 7px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-xp-wrap{gap:6px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-xp-bar{height:10px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-xp-text{font-size:10px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-profile-action{width:36px!important;height:36px!important;border-radius:12px!important}
        body.${BODY_CLASS} #start .v59a-profile-mountains{width:220px!important;height:118px!important;right:-18px!important}
        body.${BODY_CLASS} #start .v59a-profile-motto{font-size:13px!important;right:15px!important;bottom:18px!important;width:90px!important}

        /* Hero: slightly denser so Today's Practice appears earlier on real phones. */
        body.${BODY_CLASS} #start .v57c-continue-card{margin-top:-48px!important;min-height:192px!important;padding:19px 17px!important;border-radius:23px!important}
        body.${BODY_CLASS} #start .v57c-continue-card>div:first-child{max-width:73%!important}
        body.${BODY_CLASS} #start .v57c-continue-card h2{font-size:24px!important;line-height:1.06!important}
        body.${BODY_CLASS} #start .v57c-continue-card p{font-size:11px!important;line-height:1.38!important}
        body.${BODY_CLASS} #start .v57c-primary{min-height:49px!important;width:60%!important;font-size:14px!important}
        body.${BODY_CLASS} #start .v59a-continue-slogan{font-size:11px!important;width:84px!important;right:6px!important;top:13px!important}

        /* Three quick actions stay one row, but use tighter real-phone proportions. */
        body.${BODY_CLASS} #start #v59a-practice-shortcuts{padding-top:8px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-shortcut-kicker{font-size:21px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-shortcut-note{font-size:11px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-shortcut-grid{gap:8px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile{min-height:128px!important;padding:12px 5px 11px!important;border-radius:19px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon{width:47px!important;height:47px!important;border-radius:14px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon svg{width:26px!important;height:26px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-main strong{font-size:11.5px!important;line-height:1.08!important;max-width:92px!important}

        /* Primary two-column row. */
        body.${BODY_CLASS} #start .v57c-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}
        body.${BODY_CLASS} #start .v57c-mini-card{min-height:142px!important;padding:12px!important;border-radius:18px!important}
        body.${BODY_CLASS} #start .v59a1-card-heading{gap:7px!important}
        body.${BODY_CLASS} #start .v59a1-card-icon{width:33px!important;height:33px!important;border-radius:11px!important}
        body.${BODY_CLASS} #start .v59a1-card-icon svg{width:18px!important;height:18px!important}
        body.${BODY_CLASS} #start .v59a1-card-heading .v57c-mini-kicker{font-size:13px!important;line-height:1.1!important}
        body.${BODY_CLASS} #start .v57c-mini-card>strong{font-size:12px!important;line-height:1.2!important}
        body.${BODY_CLASS} #start .v57c-mini-card>p{font-size:9px!important;line-height:1.35!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        body.${BODY_CLASS} #start .v57c-mini-card button{font-size:9.5px!important;min-height:26px!important}

        /* Weekly Missions: one clear mission, one bar, one details action. */
        body.${BODY_CLASS} #start #v572-weekly-missions-card{min-height:184px!important;padding:12px!important;border-radius:18px!important;align-self:stretch!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission-head{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:6px!important;align-items:start!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-kicker{font-size:14px!important;line-height:1.1!important;letter-spacing:-.01em!important;text-transform:none!important;color:#10205a!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission-head h3{display:none!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-week-meta{justify-content:flex-end!important;gap:4px!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-week-meta span:first-child{display:none!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-week-meta span{font-size:8px!important;padding:3px 5px!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v59a-mission-streak{font-size:20px!important;margin-top:5px!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission-list{gap:5px!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission:not(:first-child){display:none!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission{grid-template-columns:29px minmax(0,1fr)!important;gap:7px!important;padding:7px!important;border-radius:11px!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission-icon{width:29px!important;height:29px!important;border-radius:9px!important;font-size:15px!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission-main p,
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission-footer{display:none!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mission-title strong{font-size:9px!important;line-height:1.15!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-check{font-size:7px!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-mini-progress{height:7px!important}
        body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-progress-text{grid-column:2!important;font-size:8px!important;justify-self:start!important}
        body.${BODY_CLASS} #start #v59a-mission-toggle{font-size:9px!important;padding:2px 0!important;white-space:nowrap!important}

        /* Latest badge: visual first, remove chip overload from Home. */
        body.${BODY_CLASS} #start #v571b-latest-achievement{min-height:184px!important;padding:12px!important;border-radius:18px!important;grid-template-columns:58px minmax(0,1fr)!important;gap:9px!important;align-items:start!important}
        body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievement-icon{width:58px!important;height:58px!important;border-radius:16px!important;font-size:28px!important}
        body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-kicker{font-size:8px!important;line-height:1.1!important}
        body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievement-main h3{font-size:14px!important;line-height:1.15!important;margin-top:2px!important}
        body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievement-main p{font-size:8.5px!important;line-height:1.25!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievement-meta{display:none!important}
        body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievements{grid-column:1/-1!important;margin-top:5px!important;padding-top:7px!important}
        body.${BODY_CLASS} #start #v571b-latest-achievement .v571b-achievements summary{font-size:9px!important}

        /* Cooperative challenge returns to the concept's full-width position. */
        body.${BODY_CLASS} #start #v573-class-challenge-card{grid-column:1/-1!important;order:60!important;min-height:150px!important;padding:14px 108px 14px 14px!important;border-radius:19px!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card .v573-student-head h3{font-size:16px!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card .v573-student-head p{font-size:8.5px!important;line-height:1.3!important;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
        body.${BODY_CLASS} #start #v573-class-challenge-card .v573-class-progress strong{font-size:11px!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card .v573-class-progress span{font-size:8px!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card .v573-bar{height:9px!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card .v573-student-foot p{display:none!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card .v573-student-foot{border-top:0!important;padding-top:3px!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card .v573-student-foot button{font-size:9px!important;padding:6px 8px!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card::after{font-size:50px!important;right:25px!important;bottom:19px!important}
        body.${BODY_CLASS} #start #v573-class-challenge-card::before{font-size:9px!important;width:80px!important;right:5px!important;top:16px!important}

        /* Bottom navigation: compact but comfortably readable. */
        body.${BODY_CLASS} #v59a-mobile-nav{height:76px!important;padding-top:7px!important;padding-bottom:calc(7px + env(safe-area-inset-bottom))!important}
        body.${BODY_CLASS} #v59a-mobile-nav button{font-size:10.5px!important;gap:3px!important;min-height:54px!important}
        body.${BODY_CLASS} #v59a-mobile-nav button span:first-child{width:25px!important;height:25px!important}
        body.${BODY_CLASS} #v59a-mobile-nav button span:first-child svg{width:22px!important;height:22px!important}
      }

      @media(max-width:390px){
        body.${BODY_CLASS} #start #v59a-student-profile{grid-template-columns:56px minmax(0,1fr) auto!important;padding-left:10px!important;padding-right:10px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-avatar{width:56px!important;height:56px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-greeting{font-size:23px!important}
        body.${BODY_CLASS} #start #v59a-student-profile .v59a-profile-action{width:33px!important;height:33px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-practice-tile{min-height:118px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-icon{width:42px!important;height:42px!important}
        body.${BODY_CLASS} #start #v59a-practice-shortcuts .v59a-tile-main strong{font-size:10.5px!important}
      }

      @media(max-width:330px){
        body.${BODY_CLASS} #start #v572-weekly-missions-card,
        body.${BODY_CLASS} #start #v571b-latest-achievement{grid-column:1/-1!important}
      }

      /* Cohesive dark variant: avoid the mixed light/dark cards seen on real devices. */
      html[data-theme="dark"] body.${BODY_CLASS}{background:#08111f!important;--v59a-ink:#eef5ff;--v59a-muted:#a8b6cf;--v59a-surface:#111c31;--v59a-border:rgba(148,163,184,.18)}
      html[data-theme="dark"] body.${BODY_CLASS} #start.v40-shell-authenticated[data-v40-start-view="home"]{background:#0b1526!important;color:#eef5ff!important}
      html[data-theme="dark"] body.${BODY_CLASS} #start .v57c-mini-card,
      html[data-theme="dark"] body.${BODY_CLASS} #start #v572-weekly-missions-card,
      html[data-theme="dark"] body.${BODY_CLASS} #start #v571b-latest-achievement{background:#111c31!important;border-color:#22324d!important;color:#eef5ff!important}
      html[data-theme="dark"] body.${BODY_CLASS} #start .v59a1-card-heading .v57c-mini-kicker,
      html[data-theme="dark"] body.${BODY_CLASS} #start .v57c-mini-card>strong,
      html[data-theme="dark"] body.${BODY_CLASS} #start #v572-weekly-missions-card .v572-kicker,
      html[data-theme="dark"] body.${BODY_CLASS} #start #v571b-latest-achievement h3{color:#eef5ff!important}
      html[data-theme="dark"] body.${BODY_CLASS} #start .v57c-mini-card>p,
      html[data-theme="dark"] body.${BODY_CLASS} #start #v571b-latest-achievement p{color:#a8b6cf!important}
      html[data-theme="dark"] body.${BODY_CLASS} #start #v573-class-challenge-card{background:linear-gradient(145deg,#10243c,#0f1f35)!important;border-color:#22415c!important;color:#eef5ff!important}
      html[data-theme="dark"] body.${BODY_CLASS} #v59a-mobile-nav{background:rgba(9,18,32,.97)!important;border-top-color:#22324d!important}
      html[data-theme="dark"] body.${BODY_CLASS} #v59a-mobile-nav button{color:#a8b6cf!important}
      html[data-theme="dark"] body.${BODY_CLASS} #v59a-mobile-nav button[aria-current="page"]{color:#60a5fa!important}
      html[data-theme="dark"] body.${BODY_CLASS} #v59a-more-sheet .v59a-more-card{background:#111c31!important;color:#eef5ff!important}
    `;
    document.head.appendChild(style);
  }

  function apply(){
    injectStyles();
    if (!signedIn()){
      document.body?.classList.remove(BODY_CLASS);
      return false;
    }
    const root = document.querySelector('#start .v40c3-home-dashboard.v59a-home-refresh');
    if (!root || !document.getElementById('v59a-mobile-nav')) return false;
    document.body?.classList.add(BODY_CLASS);
    window.dispatchEvent(new CustomEvent('v59a2:mobile-density-applied'));
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
    ['v59a:home-refreshed','v59a1:design-system-applied','v57c:home-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated']
      .forEach(name=>window.addEventListener(name,()=>scheduleApply()));
    window.addEventListener('pageshow',()=>scheduleApply());
    window.addEventListener('focus',()=>scheduleApply());
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#v40c-student-logout')) document.body?.classList.remove(BODY_CLASS);
    },true);
    scheduleApply();
    return true;
  }

  const api = Object.freeze({STYLE_ID,BODY_CLASS,signedIn,apply});

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V59A2StudentHomeMobileDensity',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();