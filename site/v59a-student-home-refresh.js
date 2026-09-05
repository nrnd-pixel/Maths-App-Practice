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
  const PROFILE_ID = 'v59a-student-profile';
  const MOBILE_NAV_ID = 'v59a-mobile-nav';
  const MORE_SHEET_ID = 'v59a-more-sheet';
  const MISSION_TOGGLE_ID = 'v59a-mission-toggle';
  const DASHBOARD_SELECTOR = '#start .v40c3-home-dashboard';
  let retryTimer = 0;
  let installed = false;

  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const trim = value => String(value ?? '').trim();

  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
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

  function firstName(value){
    return trim(value).split(/\s+/)[0] || 'Student';
  }

  function gamificationSnapshot(){
    const card = document.getElementById('v571a-gamification-card');
    const level = Math.max(1,Number(card?.dataset?.level || 1));
    const xp = Math.max(0,Number(card?.dataset?.xp || 0));
    const progress = Math.max(0,Math.min(100,Number(card?.querySelector('.v571a-progress')?.getAttribute('aria-valuenow') || 0)));
    const levelTitle = trim(card?.querySelector('.v571a-level-title')?.textContent).replace(/^Level\s+\d+\s*[—-]\s*/i,'');
    const xpLabel = trim(card?.querySelector('.v571a-xp-label')?.textContent).replace(/^⭐\s*/,'') || `${xp} XP`;
    const streak = trim(card?.querySelector('.v571b-streak-chip')?.textContent) || '🔥 Build a streak';
    return { level,xp,progress,levelTitle,xpLabel,streak };
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start.v40-shell-authenticated[data-v40-start-view="home"] .v40-learning-hub-hero.v59a-hero-refresh{
        position:relative;overflow:hidden;border:1px solid rgba(56,189,248,.22);border-radius:27px;
        padding:0;background:linear-gradient(145deg,#dff5ff 0%,#edf5ff 50%,#f7f8ff 100%);
        box-shadow:0 16px 38px rgba(30,64,175,.11);display:block;min-height:178px
      }
      #start .v59a-hero-refresh>.v40-learning-cycle,#start .v59a-hero-refresh>.v59a-original-hero-copy{display:none!important}
      #start #${PROFILE_ID}{position:relative;z-index:2;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding:18px 20px 20px;min-height:178px}
      #start #${PROFILE_ID} .v59a-avatar{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#fff,#dbeafe);border:5px solid rgba(255,255,255,.92);box-shadow:0 10px 24px rgba(37,99,235,.17);font-size:38px;position:relative}
      #start #${PROFILE_ID} .v59a-avatar::after{content:'★';position:absolute;right:-3px;bottom:-2px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#fbbf24;color:#713f12;border:3px solid #fff;font-size:11px}
      #start #${PROFILE_ID} .v59a-profile-main{min-width:0;display:grid;gap:7px;max-width:620px}
      #start #${PROFILE_ID} .v59a-greeting{font-size:clamp(25px,4vw,34px);font-weight:950;line-height:1.05;letter-spacing:-.025em;color:#172554}
      #start #${PROFILE_ID} .v59a-year{font-size:11px;font-weight:850;color:#475569}
      #start #${PROFILE_ID} .v59a-level-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
      #start #${PROFILE_ID} .v59a-level-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.74);border:1px solid rgba(59,130,246,.14);font-size:11px;font-weight:950;color:#1e3a8a;white-space:nowrap}
      #start #${PROFILE_ID} .v59a-xp-wrap{display:flex;align-items:center;gap:8px;min-width:min(330px,100%);flex:1}
      #start #${PROFILE_ID} .v59a-xp-bar{height:11px;min-width:110px;flex:1;border-radius:999px;overflow:hidden;background:rgba(148,163,184,.25);box-shadow:inset 0 1px 2px rgba(15,23,42,.07)}
      #start #${PROFILE_ID} .v59a-xp-bar>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#14b8a6,#22c55e);transition:width .35s ease}
      #start #${PROFILE_ID} .v59a-xp-text{font-size:11px;font-weight:950;color:#172554;white-space:nowrap}
      #start #${PROFILE_ID} .v59a-profile-chips{display:flex;gap:7px;flex-wrap:wrap}
      #start #${PROFILE_ID} .v59a-profile-chips span{display:inline-flex;align-items:center;min-height:27px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.6);font-size:9px;font-weight:850;color:#475569}
      #start #${PROFILE_ID} .v59a-profile-actions{display:flex;gap:8px;align-self:start}
      #start #${PROFILE_ID} .v59a-profile-action{width:42px;height:42px;border:0;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.72);color:#1e3a8a;font-size:19px;box-shadow:0 6px 18px rgba(30,64,175,.08);cursor:pointer}
      #start #${PROFILE_ID} .v59a-profile-action:hover{transform:translateY(-1px);background:#fff}
      #start .v59a-profile-mountains{position:absolute;right:-20px;bottom:-7px;width:250px;height:130px;opacity:.96;pointer-events:none;z-index:0}
      #start .v59a-profile-motto{position:absolute;right:22px;bottom:25px;z-index:1;width:108px;color:#fff;font-size:15px;font-weight:950;line-height:1.05;transform:rotate(-4deg);text-shadow:0 2px 7px rgba(30,64,175,.36);pointer-events:none}
      #start .v59a-profile-motto::after{content:'';display:block;width:72px;height:4px;border-radius:999px;background:#facc15;margin-top:7px;transform:rotate(-4deg)}

      #start .v40c3-home-dashboard.v59a-home-refresh{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:13px}
      #start .v59a-home-refresh>.v57c-continue-card,#start .v59a-home-refresh>#${SHORTCUTS_ID},#start .v59a-home-refresh>.v57c-home-grid,#start .v59a-home-refresh>#v58a-first-use-card,#start .v59a-home-refresh>#v573-class-challenge-card,#start .v59a-home-refresh>.v57c-secondary,#start .v59a-home-refresh>#v571a-gamification-card{grid-column:1/-1}
      #start .v59a-home-refresh>#v572-weekly-missions-card{grid-column:1;order:50}
      #start .v59a-home-refresh>#v571b-latest-achievement{grid-column:2;order:50}
      #start .v59a-home-refresh>#v573-class-challenge-card{order:60}
      #start .v59a-home-refresh>.v57c-secondary{order:70}
      #start .v59a-home-refresh>#v571a-gamification-card{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:0!important;border:0!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}
      #start .v59a-home-refresh>article,#start .v59a-home-refresh>section,#start .v59a-home-refresh>div{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}

      #start .v59a-home-refresh #v58a-first-use-card{border:1px solid rgba(124,58,237,.18);border-radius:22px;box-shadow:0 11px 28px rgba(124,58,237,.08);background:linear-gradient(135deg,#f5f3ff,#fff)}

      #start .v59a-home-refresh .v57c-continue-card{position:relative;overflow:hidden;border:0;border-radius:25px;padding:21px 22px;min-height:190px;background:linear-gradient(135deg,#4f46e5 0%,#6d28d9 58%,#7c3aed 100%);color:#fff;box-shadow:0 17px 40px rgba(79,70,229,.24);grid-template-columns:minmax(0,1fr) auto;isolation:isolate}
      #start .v59a-home-refresh .v57c-continue-card>div:first-child{position:relative;z-index:3;max-width:70%}
      #start .v59a-home-refresh .v57c-kicker{color:#ddd6fe;font-size:10px;letter-spacing:.1em}
      #start .v59a-home-refresh .v57c-continue-card h2{color:#fff;font-size:clamp(23px,3.2vw,30px);margin-bottom:6px}
      #start .v59a-home-refresh .v57c-continue-card p{color:rgba(255,255,255,.84);max-width:680px;font-size:12px}
      #start .v59a-home-refresh .v57c-meta{position:relative;z-index:3}
      #start .v59a-home-refresh .v57c-meta span{border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.11);color:#fff}
      #start .v59a-home-refresh .v57c-primary{position:relative;z-index:4;align-self:end;min-width:230px;border-color:#fff;background:#fff;color:#4338ca;box-shadow:0 8px 18px rgba(30,27,75,.22);font-weight:950;border-radius:999px}
      #start .v59a-home-refresh .v57c-primary:hover:not(:disabled){transform:translateY(-1px);background:#f8fafc}
      #start .v59a-continue-art{position:absolute;right:0;top:0;bottom:0;width:42%;z-index:1;pointer-events:none;overflow:hidden}
      #start .v59a-continue-art svg{position:absolute;right:-8px;bottom:-3px;width:100%;height:100%}
      #start .v59a-continue-slogan{position:absolute;right:20px;top:18px;width:112px;color:#fff;font-weight:950;font-size:15px;line-height:1.05;transform:rotate(-5deg);text-align:center;text-shadow:0 2px 6px rgba(30,27,75,.35)}
      #start .v59a-continue-slogan::after{content:'';display:block;width:76px;height:4px;background:#fde047;border-radius:999px;margin:7px auto 0;transform:rotate(-4deg)}

      #start #${SHORTCUTS_ID}{border:0;border-radius:22px;padding:15px 15px 16px;background:transparent;display:grid;gap:10px}
      #start #${SHORTCUTS_ID} .v59a-shortcut-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      #start #${SHORTCUTS_ID} .v59a-shortcut-kicker{font-size:21px;font-weight:950;letter-spacing:-.02em;color:var(--text);text-transform:none}
      #start #${SHORTCUTS_ID} .v59a-shortcut-note{font-size:10px;color:#2563eb;font-weight:900}
      #start #${SHORTCUTS_ID} .v59a-shortcut-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      #start #${SHORTCUTS_ID} .v59a-practice-tile{position:relative;overflow:hidden;min-height:118px;border:0;border-radius:19px;padding:13px 12px 14px;text-align:center;color:#0f172a;display:grid;grid-template-rows:auto 1fr;gap:8px;align-items:center;justify-items:center;cursor:pointer;box-shadow:0 8px 22px rgba(15,23,42,.07)}
      #start #${SHORTCUTS_ID} .v59a-practice-tile::after{content:'→';position:absolute;right:10px;bottom:9px;font-size:18px;font-weight:950;opacity:.72}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-type="mixed"]{background:linear-gradient(145deg,#bbf7d0,#ecfdf5)}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-type="topic"]{background:linear-gradient(145deg,#bfdbfe,#eff6ff)}
      #start #${SHORTCUTS_ID} .v59a-practice-tile[data-type="past_paper"]{background:linear-gradient(145deg,#fde68a,#fff7ed)}
      #start #${SHORTCUTS_ID} .v59a-practice-tile:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(15,23,42,.1)}
      #start #${SHORTCUTS_ID} .v59a-tile-icon{width:49px;height:49px;border-radius:15px;display:grid;place-items:center;background:rgba(255,255,255,.72);font-size:25px;box-shadow:0 6px 14px rgba(15,23,42,.08)}
      #start #${SHORTCUTS_ID} .v59a-tile-main{min-width:0;padding:0 6px 4px}
      #start #${SHORTCUTS_ID} .v59a-tile-main strong{display:block;font-size:13px;line-height:1.15;margin:0 auto 3px;max-width:110px}
      #start #${SHORTCUTS_ID} .v59a-tile-main span{display:block;color:#475569;font-size:9px;line-height:1.3;font-weight:700}

      #start .v59a-home-refresh .v57c-home-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      #start .v59a-home-refresh .v57c-mini-card{border:1px solid rgba(148,163,184,.17);border-radius:19px;padding:14px 15px;box-shadow:0 8px 23px rgba(15,23,42,.05);position:relative;overflow:hidden;background:#fff}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(1){background:linear-gradient(145deg,#fff,#f8fafc)}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(2){background:linear-gradient(145deg,#faf5ff,#fff)}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(3){grid-column:1/-1;background:linear-gradient(145deg,#fff7ed,#fff)}
      #start .v59a-home-refresh .v57c-mini-card::before{content:'';position:absolute;left:0;right:0;top:0;height:4px}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(1)::before{background:linear-gradient(90deg,#2563eb,#60a5fa)}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(2)::before{background:linear-gradient(90deg,#8b5cf6,#d946ef)}
      #start .v59a-home-refresh .v57c-mini-card:nth-child(3)::before{background:linear-gradient(90deg,#f59e0b,#f97316)}
      #start .v59a-home-refresh .v57c-mini-kicker{font-size:10px;color:#475569}
      #start .v59a-home-refresh .v57c-mini-card strong{font-size:14px}
      #start .v59a-home-refresh .v57c-mini-card p{font-size:10px}
      #start .v59a-home-refresh .v57c-mini-card button{border-radius:10px;font-weight:900;min-height:35px}

      #start .v59a-home-refresh #v572-weekly-missions-card,#start .v59a-home-refresh #v571b-latest-achievement{border:1px solid rgba(148,163,184,.16);border-radius:21px;padding:14px;box-shadow:0 9px 25px rgba(15,23,42,.06);min-height:200px;background:#fff;align-self:stretch}
      #start .v59a-home-refresh #v572-weekly-missions-card{background:linear-gradient(145deg,#fff,#f7fee7);border-color:rgba(34,197,94,.15)}
      #start .v59a-home-refresh #v571b-latest-achievement{background:linear-gradient(145deg,#fff7ed,#faf5ff);border-color:rgba(245,158,11,.16);position:relative;overflow:hidden}
      #start .v59a-home-refresh #v571b-latest-achievement::after{content:'✦  ·  ✧  ·  ✦';position:absolute;right:12px;top:12px;color:rgba(168,85,247,.2);font-size:14px;letter-spacing:4px}
      #start .v59a-home-refresh .v571b-achievement-icon{background:linear-gradient(145deg,#7c3aed,#f59e0b);box-shadow:0 8px 18px rgba(124,58,237,.16)}
      #start .v59a-home-refresh .v571b-kicker{color:#7c3aed}
      #start .v59a-home-refresh #v572-weekly-missions-card.v59a-mission-compact:not(.v59a-expanded) .v572-mission:not(:first-child){display:none}
      #start .v59a-home-refresh #v572-weekly-missions-card.v59a-mission-compact:not(.v59a-expanded) .v572-mission-main p{display:none}
      #start .v59a-home-refresh #v572-weekly-missions-card.v59a-mission-compact:not(.v59a-expanded) .v572-mission-footer{display:none}
      #start .v59a-home-refresh .v59a-mission-streak{display:block;font-size:20px;font-weight:950;color:#ea580c;margin-top:5px;line-height:1.1}
      #start #${MISSION_TOGGLE_ID}{border:0;background:transparent;color:#2563eb;font:inherit;font-size:10px;font-weight:950;padding:4px 0;cursor:pointer}
      #start .v59a-home-refresh .v572-mission{padding:9px;border-radius:13px;grid-template-columns:34px minmax(0,1fr) auto}
      #start .v59a-home-refresh .v572-mission-icon{width:34px;height:34px;font-size:18px}
      #start .v59a-home-refresh .v572-mini-progress{height:8px}

      #start .v59a-home-refresh #v573-class-challenge-card{position:relative;overflow:hidden;border:1px solid rgba(56,189,248,.18);border-radius:22px;padding:15px 150px 15px 16px;background:linear-gradient(145deg,#f0f9ff,#e0f2fe 58%,#fff);box-shadow:0 9px 25px rgba(14,116,144,.08);min-height:150px}
      #start .v59a-home-refresh #v573-class-challenge-card::after{content:'🏆';position:absolute;right:32px;bottom:17px;font-size:68px;filter:drop-shadow(0 8px 10px rgba(245,158,11,.18));transform:rotate(4deg)}
      #start .v59a-home-refresh #v573-class-challenge-card::before{content:'Stronger together!';position:absolute;right:12px;top:18px;width:112px;color:#1d4ed8;font-size:13px;font-weight:950;line-height:1.05;transform:rotate(-6deg);text-align:center}
      #start .v59a-home-refresh .v573-bar{height:12px;background:rgba(148,163,184,.2)}
      #start .v59a-home-refresh .v573-bar>span{background:linear-gradient(90deg,#2563eb,#38bdf8)}

      #start .v59a-home-refresh .v57c-secondary{padding:2px 0 0;gap:8px}
      #start .v59a-home-refresh .v57c-secondary button{border-radius:12px;min-height:40px;font-weight:900}

      #${MOBILE_NAV_ID}{display:none}
      #${MORE_SHEET_ID}{position:fixed;inset:0;z-index:170;background:rgba(15,23,42,.52);padding:16px;align-items:flex-end;justify-content:center}
      #${MORE_SHEET_ID}.hidden{display:none!important}
      #${MORE_SHEET_ID}:not(.hidden){display:flex}
      #${MORE_SHEET_ID} .v59a-more-card{width:min(470px,100%);background:var(--card);border-radius:24px 24px 18px 18px;padding:16px;box-shadow:0 22px 70px rgba(15,23,42,.25);display:grid;gap:9px}
      #${MORE_SHEET_ID} .v59a-more-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:3px}
      #${MORE_SHEET_ID} .v59a-more-head h3{margin:0;font-size:18px}
      #${MORE_SHEET_ID} .v59a-more-close{width:35px;height:35px;border:1px solid var(--border);border-radius:11px;background:var(--card);font-size:17px}
      #${MORE_SHEET_ID} .v59a-more-action{width:100%;min-height:48px;border:1px solid var(--border);border-radius:14px;background:color-mix(in srgb,var(--soft) 22%,var(--card));color:var(--text);font:inherit;font-weight:900;text-align:left;padding:10px 12px}

      html[data-theme="dark"] #start .v59a-hero-refresh{background:linear-gradient(145deg,#12233e,#172554 55%,#1e1b4b)}
      html[data-theme="dark"] #start #${PROFILE_ID} .v59a-greeting,html[data-theme="dark"] #start #${PROFILE_ID} .v59a-xp-text{color:#eff6ff}
      html[data-theme="dark"] #start #${PROFILE_ID} .v59a-year{color:#cbd5e1}
      html[data-theme="dark"] #start #${PROFILE_ID} .v59a-level-pill,html[data-theme="dark"] #start #${PROFILE_ID} .v59a-profile-chips span{background:rgba(15,23,42,.44);color:#bfdbfe;border-color:rgba(96,165,250,.18)}
      html[data-theme="dark"] #start #${PROFILE_ID} .v59a-profile-action{background:rgba(15,23,42,.48);color:#bfdbfe}
      html[data-theme="dark"] #start .v59a-home-refresh .v57c-mini-card,html[data-theme="dark"] #start .v59a-home-refresh #v572-weekly-missions-card,html[data-theme="dark"] #start .v59a-home-refresh #v571b-latest-achievement{background:color-mix(in srgb,var(--soft) 12%,var(--card))}

      @media(max-width:760px){
        body{padding-bottom:76px}
        #start.v40-shell-authenticated .v40c-session-panel{display:none!important}
        #start>.v40-student-nav{display:none!important}
        #start.v40-shell-authenticated[data-v40-start-view="home"] .v40-learning-hub-hero.v59a-hero-refresh{border-radius:0;margin-left:-12px;margin-right:-12px;margin-top:0;border-left:0;border-right:0;box-shadow:none}
        #start #${PROFILE_ID}{grid-template-columns:62px minmax(0,1fr) auto;gap:11px;padding:15px 14px 82px;min-height:205px}
        #start #${PROFILE_ID} .v59a-avatar{width:62px;height:62px;font-size:31px;border-width:4px}
        #start #${PROFILE_ID} .v59a-greeting{font-size:27px}
        #start #${PROFILE_ID} .v59a-profile-actions{gap:5px}
        #start #${PROFILE_ID} .v59a-profile-action{width:38px;height:38px;border-radius:12px;font-size:17px}
        #start #${PROFILE_ID} .v59a-year{font-size:10px}
        #start #${PROFILE_ID} .v59a-level-row{gap:6px}
        #start #${PROFILE_ID} .v59a-xp-wrap{min-width:0;flex-basis:100%;max-width:290px}
        #start #${PROFILE_ID} .v59a-profile-chips{display:none}
        #start .v59a-profile-mountains{width:230px;height:120px;right:-17px;bottom:-4px}
        #start .v59a-profile-motto{right:20px;bottom:21px;font-size:14px}
        #start .v59a-home-refresh .v57c-continue-card{grid-template-columns:1fr;padding:18px;min-height:190px;margin-top:-54px;z-index:4}
        #start .v59a-home-refresh .v57c-continue-card>div:first-child{max-width:74%}
        #start .v59a-home-refresh .v57c-primary{width:min(270px,72%);min-width:0;justify-self:start}
        #start .v59a-continue-art{width:48%}
        #start #${SHORTCUTS_ID}{padding:9px 0 2px}
        #start #${SHORTCUTS_ID} .v59a-shortcut-head{padding:0 2px}
        #start #${SHORTCUTS_ID} .v59a-shortcut-kicker{font-size:20px}
        #start #${SHORTCUTS_ID} .v59a-shortcut-note{font-size:9px}
        #start #${SHORTCUTS_ID} .v59a-shortcut-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        #start #${SHORTCUTS_ID} .v59a-practice-tile{min-height:128px;padding:12px 7px 13px}
        #start #${SHORTCUTS_ID} .v59a-tile-main span{display:none}
        #start #${SHORTCUTS_ID} .v59a-tile-main strong{font-size:12px;max-width:90px}
        #start .v59a-home-refresh .v57c-home-grid{grid-template-columns:1fr 1fr;gap:9px}
        #start .v59a-home-refresh .v57c-mini-card{padding:13px 12px}
        #start .v59a-home-refresh .v57c-mini-card:nth-child(3){grid-column:1/-1}
        #start .v59a-home-refresh #v572-weekly-missions-card,#start .v59a-home-refresh #v571b-latest-achievement{padding:12px;min-height:190px}
        #start .v59a-home-refresh #v573-class-challenge-card{padding-right:115px}
        #start .v59a-home-refresh #v573-class-challenge-card::after{right:24px;font-size:54px}
        #start .v59a-home-refresh #v573-class-challenge-card::before{right:5px;width:96px;font-size:11px}
        #${MOBILE_NAV_ID}{position:fixed;left:0;right:0;bottom:0;z-index:155;height:70px;padding:7px max(10px,env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));background:color-mix(in srgb,var(--card) 94%,transparent);border-top:1px solid var(--border);box-shadow:0 -10px 32px rgba(15,23,42,.1);backdrop-filter:blur(16px)}
        #${MOBILE_NAV_ID}.hidden{display:none!important}
        #${MOBILE_NAV_ID} button{border:0;background:transparent;color:#64748b;display:grid;gap:2px;place-items:center;align-content:center;font:inherit;font-size:9px;font-weight:850;min-width:0;padding:3px}
        #${MOBILE_NAV_ID} button span:first-child{font-size:21px;line-height:1}
        #${MOBILE_NAV_ID} button[aria-current="page"]{color:#2563eb}
        #${MOBILE_NAV_ID} button:disabled{opacity:.38}
      }
      @media(max-width:520px){
        #start .v40c3-home-dashboard.v59a-home-refresh{gap:10px}
        #start .v59a-home-refresh .v57c-continue-card{border-radius:21px}
        #start .v59a-home-refresh .v57c-continue-card h2{font-size:21px}
        #start .v59a-home-refresh .v57c-continue-card p{font-size:10px}
        #start .v59a-home-refresh .v57c-meta{display:none}
        #start .v59a-home-refresh .v57c-primary{min-height:45px;font-size:12px}
        #start .v59a-continue-slogan{font-size:12px;width:90px;right:7px;top:15px}
        #start .v59a-home-refresh .v57c-home-grid{gap:8px}
        #start .v59a-home-refresh .v57c-mini-card strong{font-size:12px}
        #start .v59a-home-refresh .v57c-mini-card p{font-size:9px}
        #start .v59a-home-refresh #v572-weekly-missions-card,#start .v59a-home-refresh #v571b-latest-achievement{min-height:178px}
        #start .v59a-home-refresh .v571b-achievement-icon{width:46px;height:46px;font-size:23px}
        #start .v59a-home-refresh .v571b-achievement-main h3{font-size:14px}
        #start .v59a-home-refresh .v571b-achievement-main p{font-size:9px}
      }
      @media(max-width:390px){
        #start #${PROFILE_ID}{grid-template-columns:54px minmax(0,1fr) auto;padding-left:11px;padding-right:11px}
        #start #${PROFILE_ID} .v59a-avatar{width:54px;height:54px;font-size:27px}
        #start #${PROFILE_ID} .v59a-greeting{font-size:23px}
        #start #${PROFILE_ID} .v59a-profile-action{width:34px;height:34px;font-size:15px}
        #start #${SHORTCUTS_ID} .v59a-practice-tile{min-height:116px}
        #start #${SHORTCUTS_ID} .v59a-tile-icon{width:43px;height:43px;font-size:21px}
        #start .v59a-home-refresh #v572-weekly-missions-card,#start .v59a-home-refresh #v571b-latest-achievement{grid-column:1/-1}
      }
      @media(prefers-reduced-motion:reduce){
        #start .v59a-home-refresh>article,#start .v59a-home-refresh>section,#start .v59a-home-refresh>div,#start #${SHORTCUTS_ID} .v59a-practice-tile,#start #${PROFILE_ID} .v59a-xp-bar>span{transition:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function mountainSvg(){
    return `<svg viewBox="0 0 260 140" aria-hidden="true" focusable="false">
      <defs><linearGradient id="v59aSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7dd3fc"/><stop offset="1" stop-color="#dbeafe"/></linearGradient><linearGradient id="v59aMountain" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#60a5fa"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs>
      <path d="M40 134 L116 45 L154 86 L190 36 L252 134 Z" fill="url(#v59aMountain)" opacity=".95"/>
      <path d="M98 66 L116 45 L127 61 L116 56 Z" fill="#eff6ff" opacity=".9"/><path d="M174 54 L190 36 L206 56 L191 48 Z" fill="#eff6ff" opacity=".9"/>
      <path d="M187 38 L187 16" stroke="#7c2d12" stroke-width="2"/><path d="M188 17 L215 24 L188 32 Z" fill="#f97316"/>
      <circle cx="216" cy="34" r="23" fill="#fff" opacity=".18"/>
    </svg>`;
  }

  function continueSvg(){
    return `<svg viewBox="0 0 300 190" aria-hidden="true" focusable="false">
      <defs><linearGradient id="v59aHeroM" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4338ca"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient><linearGradient id="v59aPath" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#a78bfa"/><stop offset="1" stop-color="#f5d0fe"/></linearGradient></defs>
      <path d="M72 190 L174 55 L212 105 L245 70 L300 190 Z" fill="url(#v59aHeroM)" opacity=".86"/>
      <path d="M153 190 L190 135 L208 120 L215 130 L197 144 L168 190 Z" fill="url(#v59aPath)" opacity=".9"/>
      <path d="M191 136 L212 136 M184 147 L205 147 M176 159 L198 159 M168 171 L190 171" stroke="#ede9fe" stroke-width="4" stroke-linecap="round" opacity=".88"/>
      <path d="M245 71 L245 38" stroke="#fde68a" stroke-width="3"/><path d="M247 39 L273 47 L247 56 Z" fill="#fbbf24"/>
      <path d="M245 18 l5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1z" fill="#fde047" filter="drop-shadow(0 0 8px rgba(253,224,71,.65))"/>
      <circle cx="262" cy="20" r="35" fill="#fff" opacity=".08"/>
    </svg>`;
  }

  function enhanceHero(){
    const hero = document.querySelector('#start .v40-learning-hub-hero');
    if (!hero || !signedIn()) return false;
    hero.classList.add('v59a-hero-refresh');
    const original = [...hero.children].find(node => !node.classList.contains('v40-learning-cycle') && node.id !== PROFILE_ID);
    original?.classList.add('v59a-original-hero-copy');

    const who = identity();
    const game = gamificationSnapshot();
    const year = Number(who?.year_level || 6);
    const className = trim(who?.class_name);
    const avatar = '🧑‍🎓';

    let profile = document.getElementById(PROFILE_ID);
    if (!profile){
      profile = document.createElement('section');
      profile.id = PROFILE_ID;
      profile.setAttribute('aria-label','Student profile and learning progress');
      hero.insertAdjacentElement('afterbegin',profile);
    }

    profile.innerHTML = `
      <div class="v59a-avatar" aria-hidden="true">${avatar}</div>
      <div class="v59a-profile-main">
        <div class="v59a-greeting">Hi ${esc(firstName(who?.student_name))}! 👋</div>
        <div class="v59a-year">Year ${year}${className ? ` · ${esc(className)}` : ''} · Year 6 Maths</div>
        <div class="v59a-level-row">
          <span class="v59a-level-pill">👑 Level ${game.level}${game.levelTitle ? ` · ${esc(game.levelTitle)}` : ''}</span>
          <div class="v59a-xp-wrap"><div class="v59a-xp-bar" role="progressbar" aria-label="XP progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${game.progress}"><span style="width:${game.progress}%"></span></div><span class="v59a-xp-text">${esc(game.xpLabel)}</span></div>
        </div>
        <div class="v59a-profile-chips"><span>${esc(game.streak)}</span><span>✦ Small steps, big progress</span></div>
      </div>
      <div class="v59a-profile-actions">
        <button type="button" class="v59a-profile-action" data-v59a-profile-action="feedback" aria-label="Send feedback" title="Send feedback">💬</button>
        <button type="button" class="v59a-profile-action" data-v59a-profile-action="more" aria-label="More student options" title="More">⚙️</button>
      </div>
      <div class="v59a-profile-mountains">${mountainSvg()}</div>
      <div class="v59a-profile-motto">Small Steps,<br>Big Progress</div>`;
    return true;
  }

  function enhanceContinueCard(){
    const card = dashboard()?.querySelector('.v57c-continue-card');
    if (!card) return false;
    if (!card.querySelector('.v59a-continue-art')){
      const art = document.createElement('div');
      art.className = 'v59a-continue-art';
      art.innerHTML = `${continueSvg()}<div class="v59a-continue-slogan">Same learning.<br>A brighter you.</div>`;
      card.appendChild(art);
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
      <div class="v59a-shortcut-head"><div class="v59a-shortcut-kicker">Today’s Practice</div><span class="v59a-shortcut-note">See all ›</span></div>
      <div class="v59a-shortcut-grid">
        <button type="button" class="v59a-practice-tile" data-type="mixed">
          <span class="v59a-tile-icon" aria-hidden="true">➕➗</span>
          <span class="v59a-tile-main"><strong>Start Mixed Practice</strong><span>A balanced mix from your Practice bank.</span></span>
        </button>
        <button type="button" class="v59a-practice-tile" data-type="topic">
          <span class="v59a-tile-icon" aria-hidden="true">🎯</span>
          <span class="v59a-tile-main"><strong>Topic Practice</strong><span>Focus on one topic at a time.</span></span>
        </button>
        <button type="button" class="v59a-practice-tile" data-type="past_paper">
          <span class="v59a-tile-icon" aria-hidden="true">📄</span>
          <span class="v59a-tile-main"><strong>Past Papers</strong><span>Practise real paper questions.</span></span>
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

  function enhanceMiniCards(){
    const cards = dashboard()?.querySelectorAll('.v57c-home-grid .v57c-mini-card');
    if (!cards?.length) return false;
    const labels = ['Assignments','Recommended Next Step','Recent Practice'];
    cards.forEach((card,index) => {
      const kicker = card.querySelector('.v57c-mini-kicker');
      if (kicker && labels[index]) kicker.textContent = labels[index];
    });
    return true;
  }

  function enhanceMissions(){
    const card = document.getElementById('v572-weekly-missions-card');
    if (!card) return false;
    card.classList.add('v59a-mission-compact');
    const game = gamificationSnapshot();
    const headCopy = card.querySelector('.v572-mission-head>div');
    if (headCopy){
      let streak = headCopy.querySelector('.v59a-mission-streak');
      if (!streak){ streak=document.createElement('span'); streak.className='v59a-mission-streak'; headCopy.appendChild(streak); }
      streak.textContent = game.streak;
    }
    const head = card.querySelector('.v572-mission-head');
    if (head && !document.getElementById(MISSION_TOGGLE_ID)){
      const button=document.createElement('button');
      button.id=MISSION_TOGGLE_ID;
      button.type='button';
      button.textContent='See details';
      button.addEventListener('click',()=>{
        const expanded=card.classList.toggle('v59a-expanded');
        button.textContent=expanded?'Show less':'See details';
      });
      head.appendChild(button);
    }
    return true;
  }

  function activeQuiz(){
    return !!document.getElementById('quiz')?.classList.contains('active');
  }

  function returnHome(){
    if (document.getElementById('start')?.classList.contains('active')) return true;
    const visibleBack=[...document.querySelectorAll('.back-home')].find(button=>button.offsetParent!==null);
    if (visibleBack){ visibleBack.click(); return true; }
    const home=[...document.querySelectorAll('.v40-student-nav [data-v40-nav="home"]')].find(button=>button.offsetParent!==null);
    if (home){ home.click(); return true; }
    return false;
  }

  function openProgress(){
    if (activeQuiz()) return false;
    const button=document.getElementById('my-progress-btn');
    if (button){ button.click(); return true; }
    return false;
  }

  function openAssignments(){
    if (activeQuiz()) return false;
    const button=document.getElementById('my-assignments-btn');
    if (button){ button.click(); return true; }
    return false;
  }

  function openReviewed(){
    if (activeQuiz()) return false;
    const button=document.getElementById('check-reviewed-btn');
    if (button){ button.click(); return true; }
    return false;
  }

  function openFeedback(){
    const button=document.getElementById('v576-send-feedback');
    if (button){ button.click(); return true; }
    return false;
  }

  function openBadges(){
    if (activeQuiz()) return false;
    const go=()=>{
      const card=document.getElementById('v571b-latest-achievement');
      if (!card) return false;
      card.scrollIntoView?.({behavior:'smooth',block:'center'});
      const details=card.querySelector('.v571b-achievements');
      if (details) details.open=true;
      return true;
    };
    if (document.getElementById('start')?.classList.contains('active')) return go();
    returnHome();
    window.setTimeout(go,120);
    return true;
  }

  function closeMore(){
    document.getElementById(MORE_SHEET_ID)?.classList.add('hidden');
  }

  function ensureMoreSheet(){
    let sheet=document.getElementById(MORE_SHEET_ID);
    if (sheet) return sheet;
    sheet=document.createElement('div');
    sheet.id=MORE_SHEET_ID;
    sheet.className='hidden';
    sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    sheet.setAttribute('aria-label','More student options');
    sheet.innerHTML=`<div class="v59a-more-card">
      <div class="v59a-more-head"><h3>More</h3><button type="button" class="v59a-more-close" aria-label="Close">×</button></div>
      <button type="button" class="v59a-more-action" data-v59a-more="assignments">📚 Assignments</button>
      <button type="button" class="v59a-more-action" data-v59a-more="reviewed">✅ Reviewed Work</button>
      <button type="button" class="v59a-more-action" data-v59a-more="feedback">💬 Send Feedback</button>
    </div>`;
    document.body.appendChild(sheet);
    sheet.querySelector('.v59a-more-close')?.addEventListener('click',closeMore);
    sheet.addEventListener('click',event=>{
      if (event.target===sheet){ closeMore(); return; }
      const key=event.target?.closest?.('[data-v59a-more]')?.dataset?.v59aMore;
      if (!key) return;
      closeMore();
      if (key==='assignments') openAssignments();
      if (key==='reviewed') openReviewed();
      if (key==='feedback') openFeedback();
    });
    return sheet;
  }

  function openMore(){
    if (activeQuiz()) return false;
    ensureMoreSheet()?.classList.remove('hidden');
    return true;
  }

  function navAction(key){
    if (activeQuiz() && key!=='practice') return false;
    if (key==='home') return returnHome();
    if (key==='practice'){
      if (!document.getElementById('start')?.classList.contains('active')){ returnHome(); window.setTimeout(openLearn,100); return true; }
      return openLearn();
    }
    if (key==='progress') return openProgress();
    if (key==='badges') return openBadges();
    if (key==='more') return openMore();
    return false;
  }

  function ensureMobileNav(){
    let nav=document.getElementById(MOBILE_NAV_ID);
    if (!nav){
      nav=document.createElement('nav');
      nav.id=MOBILE_NAV_ID;
      nav.setAttribute('aria-label','Student app navigation');
      nav.innerHTML=`
        <button type="button" data-v59a-nav="home"><span>🏠</span><span>Home</span></button>
        <button type="button" data-v59a-nav="practice"><span>▦</span><span>Practice</span></button>
        <button type="button" data-v59a-nav="progress"><span>▥</span><span>Progress</span></button>
        <button type="button" data-v59a-nav="badges"><span>☆</span><span>Badges</span></button>
        <button type="button" data-v59a-nav="more"><span>•••</span><span>More</span></button>`;
      document.body.appendChild(nav);
      nav.addEventListener('click',event=>{
        const button=event.target?.closest?.('[data-v59a-nav]');
        if (!button) return;
        event.preventDefault();
        navAction(button.dataset.v59aNav || 'home');
        window.setTimeout(syncMobileNav,40);
      });
    }
    nav.classList.toggle('hidden',!signedIn());
    syncMobileNav();
    return nav;
  }

  function syncMobileNav(){
    const nav=document.getElementById(MOBILE_NAV_ID);
    if (!nav) return;
    const quiz=activeQuiz();
    let active='home';
    if (quiz) active='practice';
    else if (document.getElementById('student-dashboard')?.classList.contains('active')) active='progress';
    else if (!document.getElementById('start')?.classList.contains('active')) active='more';
    nav.querySelectorAll('[data-v59a-nav]').forEach(button=>{
      const key=button.dataset.v59aNav;
      if (key===active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
      button.disabled=quiz && key!=='practice';
    });
  }

  function clearPresentation(){
    document.getElementById(SHORTCUTS_ID)?.remove();
    document.getElementById(PROFILE_ID)?.remove();
    document.getElementById(MOBILE_NAV_ID)?.classList.add('hidden');
    closeMore();
    const hero=document.querySelector('#start .v40-learning-hub-hero');
    hero?.classList.remove('v59a-hero-refresh');
    hero?.querySelector('.v59a-original-hero-copy')?.classList.remove('v59a-original-hero-copy');
    dashboard()?.classList.remove('v59a-home-refresh');
  }

  function apply(){
    injectStyles();
    if (!signedIn()){
      clearPresentation();
      return false;
    }
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    root.classList.add('v59a-home-refresh');
    enhanceHero();
    enhanceContinueCard();
    ensureShortcuts();
    enhanceMiniCards();
    enhanceMissions();
    ensureMobileNav();
    window.dispatchEvent(new CustomEvent('v59a:home-refreshed'));
    return true;
  }

  function scheduleApply(attempt=0){
    if (typeof window==='undefined') return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer=window.setTimeout(()=>{
      retryTimer=0;
      if (!signedIn()){
        clearPresentation();
        return;
      }
      const ok=apply();
      if (!ok && attempt<50) scheduleApply(attempt+1);
    },attempt?140:40);
  }

  function wire(){
    if (installed || typeof document==='undefined') return installed;
    installed=true;
    injectStyles();
    ['v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated']
      .forEach(name=>window.addEventListener(name,()=>scheduleApply()));
    window.addEventListener('pageshow',()=>scheduleApply());
    window.addEventListener('focus',()=>{
      if (document.getElementById('start')?.classList.contains('active')) scheduleApply();
    });
    document.addEventListener('click',event=>{
      const profileAction=event.target?.closest?.('[data-v59a-profile-action]')?.dataset?.v59aProfileAction;
      if (profileAction==='feedback'){ event.preventDefault(); openFeedback(); }
      if (profileAction==='more'){ event.preventDefault(); openMore(); }
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleApply();
      if (event.target?.closest?.('#my-assignments-btn,#my-progress-btn,#check-reviewed-btn')) window.setTimeout(syncMobileNav,40);
      if (event.target?.closest?.('#v40c-student-logout')) clearPresentation();
    },true);
    scheduleApply();
    return true;
  }

  const api=Object.freeze({
    SHORTCUTS_ID,PROFILE_ID,MOBILE_NAV_ID,MORE_SHEET_ID,
    signedIn,identity,gamificationSnapshot,openLearn,setPracticeType,openPracticeShortcut,
    ensureShortcuts,enhanceHero,enhanceContinueCard,enhanceMissions,ensureMobileNav,
    navAction,openBadges,openMore,apply
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V59AStudentHomeRefresh',{value:api,writable:false,configurable:false});
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();