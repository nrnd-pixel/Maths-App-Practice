/* V5.9A — Student Home Refresh successor.
   One presentation/navigation layer over the accepted consolidated V5.8.1 runtime.
   Reuses Continue Learning, Practice selection, assignments, progress, feedback,
   XP/levels, streaks, missions, achievements, class challenge and first-use owners.
   No network calls, persistence, grading, recommendation or learning-rule authority. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59aStudentHomeRefreshInstalled) return;
  ROOT.__v59aStudentHomeRefreshInstalled = true;

  const STYLE_ID = 'v59a-student-home-refresh-style';
  const PROFILE_ID = 'v59a-student-profile';
  const SHORTCUTS_ID = 'v59a-practice-shortcuts';
  const MOBILE_NAV_ID = 'v59a-mobile-nav';
  const MORE_SHEET_ID = 'v59a-more-sheet';
  const MISSION_TOGGLE_ID = 'v59a-mission-toggle';
  const DASHBOARD_SELECTOR = '#start .v40c3-home-dashboard';
  let retryTimer = 0;
  let installed = false;
  let badgesOpenRequested = false;

  const trim = value => String(value ?? '').trim();
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function signedIn(){
    return typeof document !== 'undefined' &&
      !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function dashboard(){
    return typeof document === 'undefined' ? null : document.querySelector(DASHBOARD_SELECTOR);
  }

  function identity(){
    try {
      const access = typeof activeStudentAccess !== 'undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (access?.student_name) return access;
    } catch {}
    const strong = document.querySelector('#start .v40c-session-identity-text strong')?.textContent || '';
    const name = trim(strong.replace(/^✓?\s*Signed in as\s*/i,''));
    return { student_name:name || 'Student', year_level:6, class_name:'' };
  }

  function gamificationSnapshot(){
    const card = document.getElementById('v571a-gamification-card');
    const levelText = trim(card?.querySelector('.v571a-level-title')?.textContent) || 'Level 1';
    const xpText = trim(card?.querySelector('.v571a-xp-label')?.textContent).replace(/^⭐\s*/,'') || '0 XP';
    const progress = Math.max(0,Math.min(100,Number(card?.querySelector('.v571a-progress')?.getAttribute('aria-valuenow') || 0)));
    const streakText = trim(card?.querySelector('.v571b-streak-chip')?.textContent) || '🔥 Start a Streak';
    return { levelText,xpText,progress,streakText };
  }

  function avatarSvg(){
    return `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <defs><linearGradient id="v59a-avatar-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dbeafe"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs>
      <rect width="80" height="80" rx="40" fill="url(#v59a-avatar-bg)"/>
      <path d="M17 78c3-17 11-25 23-25s21 8 24 25" fill="#4f46e5"/>
      <ellipse cx="40" cy="36" rx="18" ry="20" fill="#f2c49f"/>
      <path d="M22 34c1-16 8-24 20-24 12 0 19 8 19 22-7-7-16-10-26-8-5 1-9 5-13 10z" fill="#3f2b28"/>
      <circle cx="34" cy="38" r="2" fill="#172554"/><circle cx="47" cy="38" r="2" fill="#172554"/>
      <path d="M35 47c3 3 8 3 11 0" fill="none" stroke="#9a5138" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }

  function mountainSvg(){
    return `<svg viewBox="0 0 280 150" aria-hidden="true" focusable="false">
      <defs><linearGradient id="v59a-mountain" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#34d399"/><stop offset="1" stop-color="#059669"/></linearGradient></defs>
      <path d="M28 146 112 51l39 44 42-55 75 106z" fill="url(#v59a-mountain)" opacity=".96"/>
      <path d="m95 70 17-19 13 15-13-6zM176 61l17-21 18 23-18-13z" fill="#f8fafc" opacity=".9"/>
      <path d="M193 41V17" stroke="#7c2d12" stroke-width="2"/><path d="m194 18 29 8-29 10z" fill="#f59e0b"/>
    </svg>`;
  }

  function continueArt(){
    return `<svg viewBox="0 0 300 190" aria-hidden="true" focusable="false">
      <path d="M68 190 176 55l37 49 39-48 48 134z" fill="#312e81" opacity=".82"/>
      <path d="m155 190 40-59 18-13 8 12-18 14-31 46z" fill="#c4b5fd" opacity=".9"/>
      <path d="m194 134 22 1m-30 11 22 1m-31 11 22 1m-30 11 22 1" stroke="#f5f3ff" stroke-width="4" stroke-linecap="round"/>
      <path d="M249 59V31" stroke="#fde68a" stroke-width="3"/><path d="m250 32 27 8-27 10z" fill="#fbbf24"/>
      <path d="m250 11 5 12 13 1-10 8 3 13-11-7-11 7 3-13-10-8 13-1z" fill="#fde047"/>
    </svg>`;
  }

  function iconSvg(name){
    const common = 'viewBox="0 0 48 48" aria-hidden="true" focusable="false"';
    if (name === 'mixed') return `<svg ${common}><rect x="4" y="4" width="40" height="40" rx="13" fill="#10b981"/><path d="M13 17h12m-6-6v12m10-6h7M13 32h12m-9-5 7 10m0-10-7 10m14-5h7" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
    if (name === 'topic') return `<svg ${common}><circle cx="23" cy="25" r="18" fill="#3b82f6"/><circle cx="23" cy="25" r="10" fill="none" stroke="#dbeafe" stroke-width="3"/><circle cx="23" cy="25" r="4" fill="#fff"/><path d="m25 23 13-13m-5 0h6v6" fill="none" stroke="#1d4ed8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<svg ${common}><rect x="8" y="4" width="32" height="40" rx="10" fill="#f97316"/><path d="M16 14h16M16 21h16M16 28h11M16 35h13" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.v59a-student-active{--v59a-ink:#052e16;--v59a-muted:#166534;--v59a-purple:#059669;--v59a-blue:#0891b2;--v59a-shadow:0 10px 28px rgba(36,76,132,.09);padding-bottom:0}
      #start.v40-shell-authenticated[data-v40-start-view="home"]>.header{display:none!important}
      #start.v40-shell-authenticated[data-v40-start-view="home"] .v39-teacher-zone,
      #start.v40-shell-authenticated[data-v40-start-view="home"]> .info{display:none!important}

      #start .v40-learning-hub-hero.v59a-hero-refresh{position:relative;overflow:hidden;min-height:184px;padding:0;border:1px solid rgba(5,150,105,.18);border-radius:27px;background:linear-gradient(145deg,#d1fae5,#ecfdf5 56%,#f0fdfa);box-shadow:0 16px 38px rgba(5,150,105,.11)}
      #start .v59a-hero-refresh>.v40-learning-cycle,#start .v59a-hero-refresh>.v59a-original-hero-copy{display:none!important}
      #start #${PROFILE_ID}{position:relative;z-index:2;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;min-height:184px;padding:18px 20px 54px}
      #start #${PROFILE_ID} .v59a-avatar{width:78px;height:78px;border-radius:50%;overflow:hidden;background:#fff;border:5px solid rgba(255,255,255,.9);box-shadow:0 10px 24px rgba(5,150,105,.2)}
      #start #${PROFILE_ID} .v59a-avatar svg{width:100%;height:100%;display:block}
      #start #${PROFILE_ID} .v59a-profile-main{min-width:0;display:grid;gap:7px;max-width:630px}
      #start #${PROFILE_ID} .v59a-greeting{font-size:clamp(26px,4vw,34px);font-weight:950;line-height:1.04;letter-spacing:-.025em;color:var(--v59a-ink)}
      #start #${PROFILE_ID} .v59a-year{font-size:11px;font-weight:850;color:var(--v59a-muted)}
      #start #${PROFILE_ID} .v59a-level-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #start #${PROFILE_ID} [data-v59a-level]{display:inline-flex;align-items:center;min-height:29px;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.76);border:1px solid rgba(5,150,105,.2);font-size:11px;font-weight:900;color:#052e16}
      #start #${PROFILE_ID} .v59a-xp-wrap{display:flex;align-items:center;gap:7px;min-width:min(320px,100%);flex:1}
      #start #${PROFILE_ID} [data-v59a-xp-progress]{height:11px;min-width:100px;flex:1;border-radius:999px;overflow:hidden;background:rgba(148,163,184,.26)}
      #start #${PROFILE_ID} [data-v59a-xp-progress]>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#059669,#34d399)}
      #start #${PROFILE_ID} [data-v59a-xp]{font-size:11px;font-weight:900;color:#172554;white-space:nowrap}
      #start #${PROFILE_ID} [data-v59a-streak]{font-size:10px;font-weight:850;color:#475569}
      #start #${PROFILE_ID} .v59a-profile-actions{display:flex;gap:8px;align-self:start;position:relative;z-index:4}
      #start #${PROFILE_ID} .v59a-profile-action{width:42px;height:42px;padding:0;border:0;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.76);color:#1e3a8a;font-size:18px;box-shadow:0 6px 18px rgba(5,150,105,.1)}
      #start #${PROFILE_ID} .v59a-mountains{position:absolute;right:-18px;bottom:-5px;width:250px;height:132px;pointer-events:none;z-index:-1}
      #start #${PROFILE_ID} .v59a-mountains svg{width:100%;height:100%}
      #start #${PROFILE_ID} .v59a-motto{position:absolute;right:20px;bottom:20px;width:108px;color:#fff;font-size:14px;font-weight:950;line-height:1.05;transform:rotate(-4deg);text-shadow:0 2px 7px rgba(30,64,175,.32)}

      #start .v40c3-home-dashboard.v59a-home-refresh{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:13px}
      #start .v59a-home-refresh>.v57c-continue-card,#start .v59a-home-refresh>#${SHORTCUTS_ID},#start .v59a-home-refresh>.v57c-home-grid,#start .v59a-home-refresh>#v58a-first-use-card,#start .v59a-home-refresh>#v571a-gamification-card,#start .v59a-home-refresh>#v574-class-challenge-card,#start .v59a-home-refresh>#v573-class-challenge-card,#start .v59a-home-refresh>.v57c-secondary{grid-column:1/-1}
      #start .v59a-home-refresh>#v572-weekly-missions-card{grid-column:1;order:50}
      #start .v59a-home-refresh>#v571b-latest-achievement{grid-column:2;order:50}
      #start .v59a-home-refresh>#v574-class-challenge-card,#start .v59a-home-refresh>#v573-class-challenge-card{order:60}
      #start .v59a-home-refresh>.v57c-secondary{order:70}
      #start .v59a-home-refresh .v57c-home-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #start .v59a-home-refresh .v57c-home-grid [data-v57c-card="recent"]{display:none!important}
      #start .v59a-home-refresh .v57c-mini-card{min-height:150px;border-radius:20px;padding:15px;border-color:rgba(109,142,190,.16);box-shadow:var(--v59a-shadow)}
      #start .v59a-home-refresh .v57c-mini-kicker{font-size:14px;letter-spacing:-.01em;text-transform:none;color:var(--v59a-ink)}

      #start .v59a-home-refresh .v57c-continue-card{position:relative;overflow:hidden;min-height:202px;padding:22px 23px;border:0;border-radius:26px;background:linear-gradient(135deg,#065f46,#059669 58%,#0891b2);color:#fff;box-shadow:0 18px 40px rgba(5,150,105,.22);grid-template-columns:minmax(0,1fr) auto;isolation:isolate}
      #start .v59a-home-refresh .v57c-continue-card>div:first-child{position:relative;z-index:3;max-width:70%}
      #start .v59a-home-refresh .v57c-continue-card h2{color:#fff;font-size:clamp(25px,3.4vw,31px);line-height:1.08}
      #start .v59a-home-refresh .v57c-continue-card p{color:rgba(255,255,255,.9);font-size:13px;line-height:1.42}
      #start .v59a-home-refresh .v57c-kicker{color:#ddd6fe}
      #start .v59a-home-refresh .v57c-meta span{color:#fff;background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.18)}
      #start .v59a-home-refresh .v57c-primary{position:relative;z-index:4;min-width:220px;min-height:54px;border-radius:999px;background:#fff;color:#065f46;box-shadow:0 9px 20px rgba(40,20,96,.2)}
      #start .v59a-continue-art{position:absolute;right:0;inset-block:0;width:43%;z-index:1;pointer-events:none}
      #start .v59a-continue-art svg{width:100%;height:100%}
      #start .v59a-continue-slogan{position:absolute;right:17px;top:16px;width:110px;text-align:center;color:#fff;font-size:14px;font-weight:950;line-height:1.05;transform:rotate(-5deg);text-shadow:0 2px 6px rgba(30,27,75,.35)}

      #start #${SHORTCUTS_ID}{display:grid;gap:10px;padding:10px 0 4px}
      #start #${SHORTCUTS_ID} .v59a-quick5-btn{width:100%;display:flex;align-items:center;gap:12px;padding:13px 16px;border:none;border-radius:18px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-size:14px;font-weight:900;cursor:pointer;margin-bottom:8px;text-align:left}
      #start #${SHORTCUTS_ID} .v59a-quick5-btn span:first-child{font-size:22px;flex-shrink:0}
      #start #${SHORTCUTS_ID} .v59a-quick5-label{flex:1;font-size:13px;font-weight:900}
      #start #${SHORTCUTS_ID} .v59a-quick5-sub{font-size:10px;color:rgba(255,255,255,.8);white-space:nowrap}
      #start #${SHORTCUTS_ID} .v59a-shortcut-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      #start #${SHORTCUTS_ID} .v59a-shortcut-head strong{font-size:23px;color:var(--v59a-ink);letter-spacing:-.02em}
      #start #${SHORTCUTS_ID} .v59a-shortcut-head span{font-size:11px;color:var(--v59a-blue);font-weight:850}
      #start #${SHORTCUTS_ID} .v59a-shortcut-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      #start #${SHORTCUTS_ID} .v59a-practice-tile{position:relative;min-height:145px;padding:15px 9px;border:0;border-radius:21px;display:grid;justify-items:center;align-content:center;gap:8px;text-align:center;color:#10204e;box-shadow:0 9px 23px rgba(36,76,132,.09)}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-v59a-practice-type="mixed"]{background:linear-gradient(145deg,#6ee7b7,#d1fae5)}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-v59a-practice-type="topic"]{background:linear-gradient(145deg,#a7f3d0,#ecfdf5)}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-v59a-practice-type="past_paper"]{background:linear-gradient(145deg,#fcd34d,#fef3c7)}
      #start #${SHORTCUTS_ID} .v59a-tile-icon{width:57px;height:57px;filter:drop-shadow(0 7px 8px rgba(25,60,110,.18))}
      #start #${SHORTCUTS_ID} .v59a-tile-icon svg{width:100%;height:100%}
      #start #${SHORTCUTS_ID} .v59a-practice-tile strong{font-size:14px;line-height:1.1}
      #start #${SHORTCUTS_ID} .v59a-practice-tile small{font-size:9px;color:#526a82;line-height:1.25}

      #start .v59a-home-refresh>#v571a-gamification-card,#start .v59a-home-refresh>#v572-weekly-missions-card,#start .v59a-home-refresh>#v571b-latest-achievement,#start .v59a-home-refresh>#v574-class-challenge-card,#start .v59a-home-refresh>#v573-class-challenge-card{border-radius:20px!important;box-shadow:var(--v59a-shadow)!important}
      #start .v59a-home-refresh>#v572-weekly-missions-card.v59a-mission-compact:not(.v59a-expanded) .v572-mission:not(:first-child){display:none!important}
      #start .v59a-home-refresh>#v572-weekly-missions-card.v59a-mission-compact:not(.v59a-expanded) .v572-mission-footer{display:none!important}
      #start #${MISSION_TOGGLE_ID}{min-height:30px;padding:4px 7px;border:0;background:transparent;color:var(--v59a-blue);font-size:10px}
      #start #v571b-latest-achievement .v571b-achievement-icon{filter:drop-shadow(0 7px 8px rgba(124,58,237,.18))}
      #start #v574-class-challenge-card,#start #v573-class-challenge-card{position:relative;overflow:hidden}
      #start #v574-class-challenge-card::after,#start #v573-class-challenge-card::after{content:'🏆';position:absolute;right:24px;bottom:16px;font-size:54px;opacity:.86;pointer-events:none}

      #${MOBILE_NAV_ID}{position:fixed;z-index:46;left:0;right:0;bottom:0;height:78px;padding:7px max(10px,env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));display:none;grid-template-columns:repeat(5,1fr);gap:3px;background:color-mix(in srgb,var(--card) 94%,transparent);border-top:1px solid var(--border);box-shadow:0 -9px 28px rgba(15,23,42,.09);backdrop-filter:blur(14px)}
      #${MOBILE_NAV_ID}.hidden{display:none!important}
      #${MOBILE_NAV_ID} button{min-width:0;min-height:55px;padding:4px 2px;border:0;border-radius:12px;background:transparent;color:var(--muted);display:grid;place-items:center;align-content:center;gap:2px;font-size:10px;font-weight:850}
      #${MOBILE_NAV_ID} button span:first-child{font-size:20px;line-height:1}
      #${MOBILE_NAV_ID} button[aria-current="page"]{color:var(--v59a-purple);background:color-mix(in srgb,var(--soft) 72%,transparent)}
      #${MOBILE_NAV_ID} button:disabled{opacity:.45}

      #${MORE_SHEET_ID}{position:fixed;inset:0;z-index:60;display:grid;place-items:end center;padding:16px;background:rgba(15,23,42,.48)}
      #${MORE_SHEET_ID}.hidden{display:none!important}
      #${MORE_SHEET_ID} .v59a-more-card{width:min(520px,100%);display:grid;gap:8px;padding:16px;border-radius:24px 24px 16px 16px;background:var(--card);box-shadow:0 24px 70px rgba(15,23,42,.28)}
      #${MORE_SHEET_ID} .v59a-more-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      #${MORE_SHEET_ID} .v59a-more-head h3{margin:0;font-size:21px}
      #${MORE_SHEET_ID} .v59a-more-close{width:40px;height:40px;min-height:40px;padding:0;border-radius:50%;font-size:22px;background:var(--soft)}
      #${MORE_SHEET_ID} .v59a-more-action{width:100%;text-align:left;background:var(--soft);color:var(--text);min-height:48px}

      html[data-theme="dark"] #start .v40-learning-hub-hero.v59a-hero-refresh{background:linear-gradient(145deg,#d1fae5,#ecfdf5 56%,#f0fdfa)}
      html[data-theme="dark"] #start #${PROFILE_ID} .v59a-greeting,html[data-theme="dark"] #start #${PROFILE_ID} [data-v59a-xp]{color:#052e16}
      html[data-theme="dark"] #start #${PROFILE_ID} .v59a-year,html[data-theme="dark"] #start #${PROFILE_ID} [data-v59a-streak]{color:#166534}

      @media(max-width:760px){
        body.v59a-student-active{padding-bottom:84px}
        #start.v40-shell-authenticated[data-v40-start-view="home"]>.v40-student-nav{display:none!important}
        #${MOBILE_NAV_ID}{display:grid}
        #start.v40-shell-authenticated[data-v40-start-view="home"]{padding-top:0!important}
        #start #${PROFILE_ID}{grid-template-columns:62px minmax(0,1fr) auto;gap:9px;min-height:190px;padding:13px 12px 72px}
        #start #${PROFILE_ID} .v59a-avatar{width:62px;height:62px;border-width:4px}
        #start #${PROFILE_ID} .v59a-greeting{font-size:24px}
        #start #${PROFILE_ID} .v59a-year{font-size:9.5px}
        #start #${PROFILE_ID} [data-v59a-level],#start #${PROFILE_ID} [data-v59a-xp]{font-size:9px}
        #start #${PROFILE_ID} .v59a-profile-action{width:36px;height:36px;min-height:36px;border-radius:12px}
        #start #${PROFILE_ID} .v59a-mountains{width:214px;height:116px}
        #start #${PROFILE_ID} .v59a-motto{right:14px;bottom:17px;font-size:12px;width:88px}
        #start .v59a-home-refresh .v57c-continue-card{margin-top:-43px;min-height:190px;padding:18px 16px;border-radius:23px}
        #start .v59a-home-refresh .v57c-continue-card>div:first-child{max-width:73%}
        #start .v59a-home-refresh .v57c-continue-card h2{font-size:23px}
        #start .v59a-home-refresh .v57c-continue-card p{font-size:10.5px}
        #start .v59a-home-refresh .v57c-primary{width:60%;min-width:0;min-height:48px;font-size:13px}
        #start .v59a-continue-slogan{right:5px;top:12px;width:84px;font-size:10.5px}
        #start #${SHORTCUTS_ID} .v59a-shortcut-head strong{font-size:21px}
        #start #${SHORTCUTS_ID} .v59a-shortcut-grid{gap:7px}
        #start #${SHORTCUTS_ID} .v59a-practice-tile{min-height:123px;padding:10px 4px;border-radius:18px}
        #start #${SHORTCUTS_ID} .v59a-tile-icon{width:47px;height:47px}
        #start #${SHORTCUTS_ID} .v59a-practice-tile strong{font-size:10.5px}
        #start #${SHORTCUTS_ID} .v59a-practice-tile small{display:none}
        #start .v59a-home-refresh .v57c-mini-card{min-height:135px;padding:11px;border-radius:17px}
        #start .v59a-home-refresh .v57c-mini-kicker{font-size:12px}
        #start .v59a-home-refresh .v57c-mini-card>strong{font-size:12px}
        #start .v59a-home-refresh .v57c-mini-card>p{font-size:9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        #start .v59a-home-refresh>#v572-weekly-missions-card,#start .v59a-home-refresh>#v571b-latest-achievement{min-height:168px;padding:11px!important}
        #start #v574-class-challenge-card,#start #v573-class-challenge-card{padding-right:88px!important}
        #start #v574-class-challenge-card::after,#start #v573-class-challenge-card::after{right:15px;font-size:46px}
      }
      @media(max-width:350px){#start .v59a-home-refresh>#v572-weekly-missions-card,#start .v59a-home-refresh>#v571b-latest-achievement{grid-column:1/-1}}
      @media(prefers-reduced-motion:reduce){#start .v59a-home-refresh *,#start #${PROFILE_ID} *,#${MOBILE_NAV_ID} *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function enhanceHero(){
    const hero = document.querySelector('#start .v40-learning-hub-hero');
    if (!hero || !signedIn()) return false;
    hero.classList.add('v59a-hero-refresh');
    [...hero.children].forEach(node => {
      if (node.id !== PROFILE_ID && !node.classList.contains('v40-learning-cycle')) node.classList.add('v59a-original-hero-copy');
    });

    const who = identity();
    const game = gamificationSnapshot();
    const year = Number(who?.year_level || 6);
    const className = trim(who?.class_name);
    let profile = document.getElementById(PROFILE_ID);
    if (!profile){
      profile = document.createElement('section');
      profile.id = PROFILE_ID;
      profile.dataset.v59aSurface = 'profile';
      profile.setAttribute('aria-label','Student profile and learning progress');
      hero.insertAdjacentElement('afterbegin',profile);
    }
    profile.innerHTML = `
      <div class="v59a-avatar">${avatarSvg()}</div>
      <div class="v59a-profile-main">
        <div class="v59a-greeting">Hi <span data-v59a-student-name>${esc(who?.student_name || 'Student')}</span>! 👋</div>
        <div class="v59a-year" data-v59a-year-class>Year ${year}${className ? ` · ${esc(className)}` : ''} · Maths Practice</div>
        <div class="v59a-level-row">
          <span data-v59a-level>👑 ${esc(game.levelText)}</span>
          <div class="v59a-xp-wrap"><div data-v59a-xp-progress role="progressbar" aria-label="XP progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${game.progress}"><span style="width:${game.progress}%"></span></div><span data-v59a-xp>${esc(game.xpText)}</span></div>
        </div>
        <div data-v59a-streak>${esc(game.streakText)}</div>
      </div>
      <div class="v59a-profile-actions">
        <button type="button" class="v59a-profile-action" data-v59a-profile-action="feedback" aria-label="Send feedback">💬</button>
        <button type="button" class="v59a-profile-action" data-v59a-profile-action="more" aria-label="More student options">⚙️</button>
      </div>
      <div class="v59a-mountains">${mountainSvg()}</div><div class="v59a-motto">Small Steps,<br>Big Progress</div>`;
    return true;
  }

  function enhanceContinue(){
    const card = dashboard()?.querySelector('.v57c-continue-card');
    if (!card) return false;
    card.dataset.v59aSurface = 'continue';
    const button = card.querySelector('.v57c-primary');
    if (button) button.dataset.v59aAction = 'continue';
    if (!card.querySelector('.v59a-continue-art')){
      const art = document.createElement('div');
      art.className = 'v59a-continue-art';
      art.innerHTML = `${continueArt()}<div class="v59a-continue-slogan">Same learning.<br>A brighter you.</div>`;
      card.appendChild(art);
    }
    return true;
  }

  function openLearn(){
    const nav = document.querySelector('#start .v40-student-nav [data-v40-nav="learn"]');
    if (nav){ nav.click(); return true; }
    const open = document.querySelector('#start .v40c-open-learn');
    if (open){ open.click(); return true; }
    return false;
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
    if (!setPracticeType(type)) return false;
    openLearn();
    window.setTimeout(() => {
      if (type === 'topic') document.querySelector('#start .v40c-change-settings')?.click();
      if (type === 'past_paper') document.getElementById('v55a-paper-year')?.focus?.({preventScroll:true});
    },120);
    return true;
  }

  function ensureShortcuts(){
    const root = dashboard();
    const anchor = root?.querySelector('.v57c-continue-card');
    if (!root || !anchor || !signedIn()) return false;
    let section = document.getElementById(SHORTCUTS_ID);
    if (!section){
      section = document.createElement('section');
      section.id = SHORTCUTS_ID;
      section.dataset.v59aSurface = 'practice';
      section.setAttribute('aria-label',"Today's Practice");
      section.innerHTML = `<div class="v59a-shortcut-head"><strong>Today’s Practice</strong><span>Choose your route</span></div><button type="button" class="v59a-quick5-btn" data-v59a-quick5="true"><span>⚡</span><span class="v59a-quick5-label">Quick 5 — just 5 questions</span><span class="v59a-quick5-sub">~3 minutes</span></button><div class="v59a-shortcut-grid">
        <button type="button" class="v59a-practice-tile" data-v59a-practice-type="mixed"><span class="v59a-tile-icon">${iconSvg('mixed')}</span><strong>Start Mixed Practice</strong><small>A balanced Maths mix.</small></button>
        <button type="button" class="v59a-practice-tile" data-v59a-practice-type="topic"><span class="v59a-tile-icon">${iconSvg('topic')}</span><strong>Topic Practice</strong><small>Focus on one topic.</small></button>
        <button type="button" class="v59a-practice-tile" data-v59a-practice-type="past_paper"><span class="v59a-tile-icon">${iconSvg('paper')}</span><strong>Past Papers</strong><small>Practise paper questions.</small></button>
      </div>`;
      section.addEventListener('click',event => {
        const tile = event.target?.closest?.('[data-v59a-practice-type],[data-v59a-quick5]');
        if (!tile) return;
        event.preventDefault();
        openPracticeShortcut(tile.dataset.v59aPracticeType || 'mixed');
      });
    }
    if (anchor.nextElementSibling !== section) anchor.insertAdjacentElement('afterend',section);
    return true;
  }

  function enhanceDashboardCards(){
    const root = dashboard();
    const grid = root?.querySelector('.v57c-home-grid');
    if (!root || !grid) return false;
    grid.querySelector('[data-v57c-card="assignments"] .v57c-mini-kicker')?.replaceChildren('Assignments');
    grid.querySelector('[data-v57c-card="recommendation"] .v57c-mini-kicker')?.replaceChildren('Recommended Next Step');
    return true;
  }

  function enhanceMissions(){
    const card = document.getElementById('v572-weekly-missions-card');
    if (!card) return false;
    card.classList.add('v59a-mission-compact');
    let button = document.getElementById(MISSION_TOGGLE_ID);
    if (!button){
      const head = card.querySelector('.v572-mission-head');
      if (!head) return false;
      button = document.createElement('button');
      button.id = MISSION_TOGGLE_ID;
      button.type = 'button';
      button.dataset.v59aAction = 'missions-toggle';
      button.textContent = 'See details';
      button.addEventListener('click',() => {
        const expanded = card.classList.toggle('v59a-expanded');
        button.textContent = expanded ? 'Show less' : 'See details';
      });
      head.appendChild(button);
    } else {
      button.dataset.v59aAction = 'missions-toggle';
    }
    return true;
  }

  function activeQuiz(){
    return !!document.getElementById('quiz')?.classList.contains('active');
  }

  function returnHome(){
    if (document.getElementById('start')?.classList.contains('active')){
      document.querySelector('#start .v40-student-nav [data-v40-nav="home"]')?.click();
      return true;
    }
    const visibleBack = [...document.querySelectorAll('.back-home')].find(button => button.offsetParent !== null);
    if (visibleBack){ visibleBack.click(); return true; }
    return false;
  }

  function openProgress(){
    if (activeQuiz()) return false;
    const button = document.getElementById('my-progress-btn');
    if (button){ button.click(); return true; }
    return false;
  }

  function openAssignments(){
    if (activeQuiz()) return false;
    const button = document.getElementById('my-assignments-btn');
    if (button){ button.click(); return true; }
    return false;
  }

  function openReviewed(){
    if (activeQuiz()) return false;
    const button = document.getElementById('check-reviewed-btn');
    if (button){ button.click(); return true; }
    return false;
  }

  function openFeedback(){
    if (activeQuiz()) return false;
    const button = document.getElementById('v576-send-feedback');
    if (button){ button.click(); return true; }
    return false;
  }

  function revealBadges(scroll=false){
    const card = document.getElementById('v571b-latest-achievement');
    if (!card) return false;
    const details = card.querySelector('details');
    if (details) details.open = true;
    if (scroll) card.scrollIntoView?.({behavior:'smooth',block:'center'});
    return true;
  }

  function openBadges(){
    if (activeQuiz()) return false;
    badgesOpenRequested = true;
    const go = () => revealBadges(true);
    if (document.getElementById('start')?.classList.contains('active')) return go();
    returnHome();
    window.setTimeout(go,100);
    return true;
  }

  function closeMore(){
    document.getElementById(MORE_SHEET_ID)?.classList.add('hidden');
  }

  function ensureMoreSheet(){
    let sheet = document.getElementById(MORE_SHEET_ID);
    if (sheet) return sheet;
    sheet = document.createElement('div');
    sheet.id = MORE_SHEET_ID;
    sheet.className = 'hidden';
    sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    sheet.setAttribute('aria-label','More student options');
    sheet.innerHTML = `<div class="v59a-more-card"><div class="v59a-more-head"><h3>More</h3><button type="button" class="v59a-more-close" data-v59a-more-close aria-label="Close">×</button></div>
      <button type="button" class="v59a-more-action" data-v59a-more="assignments">📚 Assignments</button>
      <button type="button" class="v59a-more-action" data-v59a-more="reviewed">✅ Reviewed Work</button>
      <button type="button" class="v59a-more-action" data-v59a-more="feedback">💬 Send Feedback</button></div>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click',event => {
      if (event.target === sheet || event.target?.closest?.('[data-v59a-more-close]')){ closeMore(); return; }
      const key = event.target?.closest?.('[data-v59a-more]')?.dataset?.v59aMore;
      if (!key) return;
      closeMore();
      if (key === 'assignments') openAssignments();
      if (key === 'reviewed') openReviewed();
      if (key === 'feedback') openFeedback();
    });
    return sheet;
  }

  function openMore(){
    if (activeQuiz()) return false;
    ensureMoreSheet()?.classList.remove('hidden');
    return true;
  }

  function navAction(key){
    if (activeQuiz() && key !== 'practice') return false;
    if (key !== 'badges') badgesOpenRequested = false;
    if (key === 'home') return returnHome();
    if (key === 'practice'){
      if (!document.getElementById('start')?.classList.contains('active')){
        returnHome();
        window.setTimeout(openLearn,80);
        return true;
      }
      return openLearn();
    }
    if (key === 'progress') return openProgress();
    if (key === 'badges') return openBadges();
    if (key === 'more') return openMore();
    return false;
  }

  function syncMobileNav(){
    const nav = document.getElementById(MOBILE_NAV_ID);
    if (!nav) return;
    const quiz = activeQuiz();
    let active = 'home';
    if (quiz) active = 'practice';
    else if (document.getElementById('student-dashboard')?.classList.contains('active')) active = 'progress';
    else if (document.getElementById('start')?.classList.contains('active') && document.getElementById('start')?.dataset?.v40StartView === 'learn') active = 'practice';
    nav.querySelectorAll('[data-v59a-nav]').forEach(button => {
      const key = button.dataset.v59aNav;
      if (key === active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
      button.disabled = quiz && key !== 'practice';
    });
  }

  function ensureMobileNav(){
    let nav = document.getElementById(MOBILE_NAV_ID);
    if (!nav){
      nav = document.createElement('nav');
      nav.id = MOBILE_NAV_ID;
      nav.setAttribute('aria-label','Student app navigation');
      nav.innerHTML = `<button type="button" data-v59a-nav="home"><span>🏠</span><span>Home</span></button><button type="button" data-v59a-nav="practice"><span>✏️</span><span>Practice</span></button><button type="button" data-v59a-nav="progress"><span>📊</span><span>Progress</span></button><button type="button" data-v59a-nav="badges"><span>🏅</span><span>Badges</span></button><button type="button" data-v59a-nav="more"><span>•••</span><span>More</span></button>`;
      document.body.appendChild(nav);
      nav.addEventListener('click',event => {
        const button = event.target?.closest?.('[data-v59a-nav]');
        if (!button) return;
        event.preventDefault();
        navAction(button.dataset.v59aNav || 'home');
        window.setTimeout(syncMobileNav,30);
      });
    }
    nav.classList.toggle('hidden',!signedIn());
    syncMobileNav();
    return nav;
  }

  function clearPresentation(){
    badgesOpenRequested = false;
    document.getElementById(PROFILE_ID)?.remove();
    document.getElementById(SHORTCUTS_ID)?.remove();
    document.getElementById(MOBILE_NAV_ID)?.classList.add('hidden');
    closeMore();
    document.body?.classList.remove('v59a-student-active');
    dashboard()?.classList.remove('v59a-home-refresh');
    const hero = document.querySelector('#start .v40-learning-hub-hero');
    hero?.classList.remove('v59a-hero-refresh');
    hero?.querySelectorAll('.v59a-original-hero-copy').forEach(node => node.classList.remove('v59a-original-hero-copy'));
    document.querySelector('#start .v57c-primary')?.removeAttribute('data-v59a-action');
  }

  function apply(){
    injectStyles();
    if (!signedIn()) { clearPresentation(); return false; }
    const root = dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    document.body?.classList.add('v59a-student-active');
    root.classList.add('v59a-home-refresh');
    enhanceHero();
    enhanceContinue();
    ensureShortcuts();
    enhanceDashboardCards();
    enhanceMissions();
    ensureMoreSheet();
    ensureMobileNav();
    if (badgesOpenRequested) revealBadges(false);
    window.dispatchEvent(new CustomEvent('v59a:home-refreshed'));
    return true;
  }

  function scheduleApply(attempt=0){
    if (typeof window === 'undefined') return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      retryTimer = 0;
      if (!signedIn()){ clearPresentation(); return; }
      const ok = apply();
      if (!ok && attempt < 50) scheduleApply(attempt + 1);
    },attempt ? 120 : 35);
  }

  function wire(){
    if (installed || typeof document === 'undefined') return installed;
    installed = true;
    injectStyles();
    ['v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated']
      .forEach(name => window.addEventListener(name,() => scheduleApply()));
    window.addEventListener('pageshow',() => scheduleApply());
    window.addEventListener('focus',() => {
      if (document.getElementById('start')?.classList.contains('active')) scheduleApply();
    });
    document.addEventListener('click',event => {
      const profileAction = event.target?.closest?.('[data-v59a-profile-action]')?.dataset?.v59aProfileAction;
      if (profileAction === 'feedback'){ event.preventDefault(); openFeedback(); }
      if (profileAction === 'more'){ event.preventDefault(); openMore(); }
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleApply();
      if (event.target?.closest?.('#my-assignments-btn,#my-progress-btn,#check-reviewed-btn')) window.setTimeout(syncMobileNav,30);
      if (event.target?.closest?.('#v40c-student-logout')) clearPresentation();
    },true);
    scheduleApply();
    return true;
  }

  const api = Object.freeze({
    STYLE_ID,PROFILE_ID,SHORTCUTS_ID,MOBILE_NAV_ID,MORE_SHEET_ID,MISSION_TOGGLE_ID,
    signedIn,identity,gamificationSnapshot,setPracticeType,openPracticeShortcut,
    navAction,openBadges,openMore,apply
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V59AStudentHomeRefresh',{value:api,writable:false,configurable:false});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();
