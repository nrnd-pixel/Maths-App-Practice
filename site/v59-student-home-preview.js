/* V5.9 Student Home Preview — concept-fidelity integration experiment.
   Loaded only when ?v59-student-home-preview=1 is present.
   Reuses accepted V5.8 student data and actions as the source of truth.
   This module is presentation/delegation only: it adds no direct network or
   persistence path and does not replace the existing Practice engine. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PARAM = 'v59-student-home-preview';
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get(PARAM) !== '1') return;
  if (ROOT.__v59StudentHomePreviewInstalled) return;
  ROOT.__v59StudentHomePreviewInstalled = true;

  const STYLE_ID = 'v59-student-home-preview-style';
  const SHELL_ID = 'v59-student-home-preview';
  const BANNER_ID = 'v59-student-home-preview-banner';
  const PANEL_ID = 'v59-student-panel';
  let timer = 0;
  let observer = null;
  let suspended = false;
  let lastSignature = '';
  const previewSettings = { large:false, quiet:false };

  const text = (node, fallback = '') => String(node?.textContent || fallback).replace(/\s+/g, ' ').trim();
  const html = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const number = value => Math.max(0, Math.round(Number(value) || 0));
  const clamp = value => Math.max(0, Math.min(100, Number(value) || 0));

  function markNoIndex(){
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex,nofollow';
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html[data-v59-student-home-preview="true"] body{background:#f4f8ff}
      #${BANNER_ID}{position:sticky;top:0;z-index:9998;margin:-1px -1px 14px;padding:9px 14px;background:#fff7d8;border:1px solid #f2d46b;border-radius:14px;color:#6e5510;font-size:11px;font-weight:850;line-height:1.35;text-align:center}
      body.v59-preview-home-ready #start>.v40-student-nav,
      body.v59-preview-home-ready #start .v40-learning-hub-hero,
      body.v59-preview-home-ready #start .v40c3-home-dashboard,
      body.v59-preview-home-ready #start .v40c-session-panel.v40c-authenticated{display:none!important}
      #${SHELL_ID}.v59-suspended{display:none!important}
      #${SHELL_ID}{--v59-ink:#16264c;--v59-muted:#52627e;--v59-line:#e2eaf4;--v59-blue:#1454d4;--v59-purple:#6136d5;--v59-green:#087657;color:var(--v59-ink);font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif;display:grid;gap:0;padding:0 0 92px;position:relative}
      #${SHELL_ID} *{box-sizing:border-box}
      #${SHELL_ID} button{font:inherit;cursor:pointer;color:inherit;border:0}
      #${SHELL_ID} button:focus-visible{outline:3px solid #ea8600;outline-offset:3px}
      #${SHELL_ID}.v59-large{font-size:19px}
      #${SHELL_ID}.v59-quiet .v59-math-art{display:none}
      #${SHELL_ID}.v59-quiet .v59-hero{background:#6035c5}
      #${SHELL_ID} .v59-desktop-brand{display:none}
      #${SHELL_ID} .v59-main{min-width:0}
      #${SHELL_ID} .v59-welcome-wrap{background:linear-gradient(135deg,#d7f4ff,#e8f1ff);margin:0 -18px;padding:22px 18px 25px;border-radius:0 0 32px 32px}
      #${SHELL_ID} .v59-top{display:flex;align-items:center;gap:12px}
      #${SHELL_ID} .v59-avatar{width:60px;height:60px;border-radius:22px;display:grid;place-items:center;background:#175dd6;color:#fff;border:4px solid #fff;font-size:22px;font-weight:950;box-shadow:0 4px 12px rgba(20,84,212,.16);flex:none}
      #${SHELL_ID} .v59-welcome-copy{min-width:0;flex:1}
      #${SHELL_ID} .v59-welcome-copy h1{margin:0;font-size:clamp(25px,5vw,31px);line-height:1.15;letter-spacing:-.04em}
      #${SHELL_ID} .v59-welcome-copy p{margin:3px 0 0;color:var(--v59-muted);font-size:13px}
      #${SHELL_ID} .v59-tools{display:flex;gap:4px;align-items:center}
      #${SHELL_ID} .v59-iconbtn{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.68);display:grid;place-items:center;position:relative;font-size:19px}
      #${SHELL_ID} .v59-dot{position:absolute;right:8px;top:7px;width:9px;height:9px;border-radius:50%;background:#ee645a;border:2px solid #fff}
      #${SHELL_ID} .v59-level{margin-top:18px;display:grid;grid-template-columns:auto 1fr;gap:9px 16px;align-items:center}
      #${SHELL_ID} .v59-level-pill{font-size:13px;font-weight:900;color:#4c32a0;display:flex;align-items:center;gap:6px}
      #${SHELL_ID} .v59-xp{font-size:12px;font-weight:850;color:#405475;text-align:right}
      #${SHELL_ID} .v59-track{grid-column:1/-1;height:9px;border-radius:999px;background:#dee7f4;overflow:hidden}
      #${SHELL_ID} .v59-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0ca499,#16c690)}
      #${SHELL_ID} .v59-content{display:grid;gap:20px;padding-top:18px}
      #${SHELL_ID} .v59-hero{position:relative;isolation:isolate;overflow:hidden;border-radius:26px;padding:23px;background:linear-gradient(115deg,#5a2dcd,#7751e1);color:#fff;box-shadow:0 8px 22px rgba(96,56,180,.17);min-height:225px;display:flex;align-items:center}
      #${SHELL_ID} .v59-hero-copy{position:relative;z-index:2;max-width:79%}
      #${SHELL_ID} .v59-kicker{font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#e5dcff;margin-bottom:8px}
      #${SHELL_ID} .v59-hero h2{margin:0;font-size:clamp(24px,5vw,31px);line-height:1.15;letter-spacing:-.025em}
      #${SHELL_ID} .v59-hero p{margin:10px 0 0;color:#f0eaff;font-size:13px;line-height:1.5}
      #${SHELL_ID} .v59-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
      #${SHELL_ID} .v59-meta span{font-size:10px;font-weight:850;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)}
      #${SHELL_ID} .v59-main-cta{margin-top:18px;min-width:156px;min-height:48px;border-radius:14px;padding:12px 18px;background:#fff;color:#43219a;font-weight:900}
      #${SHELL_ID} .v59-math-art{position:absolute;right:-26px;top:0;height:100%;width:140px;opacity:.78;transform:rotate(-12deg);pointer-events:none;background:radial-gradient(circle at center,rgba(173,141,255,.55),transparent 70%)}
      #${SHELL_ID} .v59-math-art span{position:absolute;display:grid;place-items:center;width:68px;height:68px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.25);border-radius:20px;color:#fff;font-size:31px;font-weight:950}
      #${SHELL_ID} .v59-math-art span:nth-child(1){top:20px;right:24px;transform:rotate(15deg)}
      #${SHELL_ID} .v59-math-art span:nth-child(2){top:96px;right:0;transform:rotate(30deg)}
      #${SHELL_ID} .v59-math-art span:nth-child(3){top:167px;right:50px;transform:rotate(-6deg)}
      #${SHELL_ID} .v59-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
      #${SHELL_ID} .v59-section-head h2{margin:0;font-size:19px;letter-spacing:-.02em}
      #${SHELL_ID} .v59-section-head button{min-height:42px;padding:8px 2px;background:transparent;color:var(--v59-blue);font-size:12px;font-weight:850}
      #${SHELL_ID} .v59-practice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      #${SHELL_ID} .v59-path{border-radius:21px;padding:16px 10px 14px;text-align:left;min-height:156px;display:flex;flex-direction:column;align-items:flex-start;gap:14px;font-weight:900;line-height:1.15;font-size:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.63)}
      #${SHELL_ID} .v59-path:nth-child(1){background:#d5f7e9}#${SHELL_ID} .v59-path:nth-child(2){background:#d8edff}#${SHELL_ID} .v59-path:nth-child(3){background:#fff0c9}
      #${SHELL_ID} .v59-path-icon{width:45px;height:45px;border-radius:15px;color:#fff;display:grid;place-items:center;font-size:21px}
      #${SHELL_ID} .v59-path:nth-child(1) .v59-path-icon{background:#079373}#${SHELL_ID} .v59-path:nth-child(2) .v59-path-icon{background:#2979da}#${SHELL_ID} .v59-path:nth-child(3) .v59-path-icon{background:#d77022}
      #${SHELL_ID} .v59-path-arrow{margin-top:auto;align-self:flex-end;font-size:20px}
      #${SHELL_ID} .v59-home-grid{display:grid;gap:14px}
      #${SHELL_ID} .v59-card{background:#fff;border:1px solid var(--v59-line);border-radius:22px;padding:19px;box-shadow:0 5px 20px rgba(27,60,114,.06);min-width:0}
      #${SHELL_ID} .v59-card-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px}
      #${SHELL_ID} .v59-card-head h2{margin:0;font-size:17px}
      #${SHELL_ID} .v59-card-head button{background:transparent;color:var(--v59-blue);font-size:11px;font-weight:850;min-height:36px}
      #${SHELL_ID} .v59-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 10px;font-size:10px;font-weight:900;background:#eaf0ff;color:#315eaa}
      #${SHELL_ID} .v59-pill.green{background:#d9f6e9;color:#08724f}#${SHELL_ID} .v59-pill.purple{background:#eee7ff;color:#623bb3}
      #${SHELL_ID} .v59-compact{display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;width:100%;background:transparent;padding:0;min-height:64px}
      #${SHELL_ID} .v59-soft-icon{width:46px;height:46px;border-radius:14px;background:#edf1ff;color:#405cc0;display:grid;place-items:center;flex:none;font-size:21px}
      #${SHELL_ID} .v59-compact-main{min-width:0;flex:1}
      #${SHELL_ID} .v59-compact-main h3{margin:0;font-size:15px;line-height:1.3}
      #${SHELL_ID} .v59-compact-main p{margin:5px 0 0;color:var(--v59-muted);font-size:12px;line-height:1.45}
      #${SHELL_ID} .v59-recommend{border-color:#e8ddff;background:#fcfaff}
      #${SHELL_ID} .v59-recommend .v59-soft-icon{background:#f3e6c4;color:#8b6100}
      #${SHELL_ID} .v59-mission-stat{font-size:22px;font-weight:950;color:#c55116}
      #${SHELL_ID} .v59-progress-caption{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--v59-muted);margin:10px 0 7px}
      #${SHELL_ID} .v59-progress{height:9px;border-radius:999px;background:#dee7f4;overflow:hidden}
      #${SHELL_ID} .v59-progress span{display:block;height:100%;border-radius:inherit;background:var(--v59-blue)}
      #${SHELL_ID} .v59-badge-mark{width:70px;height:78px;display:grid;place-items:center;flex:none;color:#fff4b8;font-size:28px;background:linear-gradient(145deg,#8656e6,#5834b7);clip-path:polygon(50% 0,94% 25%,94% 75%,50% 100%,6% 75%,6% 25%)}
      #${SHELL_ID} .v59-challenge{background:linear-gradient(110deg,#edf9ff,#dbeeff)}
      #${SHELL_ID} .v59-challenge .v59-soft-icon{background:#fff;color:#3372be}
      #${SHELL_ID} .v59-challenge .v59-progress span{background:#2d92ed}
      #${SHELL_ID} .v59-note{font-size:11px;color:var(--v59-muted);margin-top:11px;line-height:1.45}
      #${SHELL_ID} .v59-bottom{position:fixed;bottom:0;left:0;right:0;z-index:9997;display:grid;grid-template-columns:repeat(5,1fr);justify-content:center;background:rgba(255,255,255,.94);border-top:1px solid #e1e9f5;padding:7px 8px calc(7px + env(safe-area-inset-bottom));backdrop-filter:blur(10px)}
      #${SHELL_ID} .v59-bottom button{min-width:0;min-height:58px;border-radius:14px;background:transparent;color:#65718a;font-size:10px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
      #${SHELL_ID} .v59-bottom button span{font-size:21px;line-height:1}
      #${SHELL_ID} .v59-bottom button[data-v59-action="home"]{color:var(--v59-blue);background:#eaf2ff;font-weight:950}
      #${PANEL_ID}{position:fixed;inset:0;z-index:10020;background:rgba(20,38,73,.45);display:grid;place-items:end center;padding:18px}
      #${PANEL_ID} .v59-panel-sheet{width:min(520px,100%);max-height:82dvh;overflow:auto;background:#fff;border:1px solid var(--v59-line);border-radius:24px;padding:20px;box-shadow:0 25px 80px rgba(18,39,84,.25)}
      #${PANEL_ID} .v59-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
      #${PANEL_ID} .v59-panel-head h2{margin:0;font-size:21px}#${PANEL_ID} .v59-panel-head p{margin:5px 0 0;color:var(--v59-muted);font-size:12px}
      #${PANEL_ID} .v59-panel-close{width:42px;height:42px;border-radius:13px;background:#eef3ff;color:#315eaa;font-weight:950}
      #${PANEL_ID} .v59-panel-list{display:grid;gap:10px}
      #${PANEL_ID} .v59-panel-item{padding:13px;border:1px solid var(--v59-line);border-radius:16px;background:#fafdff}
      #${PANEL_ID} .v59-panel-item strong{display:block;font-size:13px}#${PANEL_ID} .v59-panel-item span{display:block;margin-top:3px;color:var(--v59-muted);font-size:11px;line-height:1.4}
      #${PANEL_ID} .v59-panel-action{width:100%;min-height:48px;border-radius:14px;background:#eef3ff;color:#214da8;font-weight:900;padding:11px 14px;text-align:left}
      #${PANEL_ID} .v59-setting{display:flex;align-items:center;justify-content:space-between;gap:15px;min-height:64px;border-bottom:1px solid var(--v59-line);padding:10px 0}
      #${PANEL_ID} .v59-setting:last-child{border-bottom:0}#${PANEL_ID} .v59-setting button{min-width:92px;min-height:40px;border-radius:12px;background:#eef3ff;color:#214da8;font-size:11px;font-weight:900}
      @media(min-width:600px){#${SHELL_ID} .v59-welcome-wrap{margin:0 -28px;padding:26px 28px}#${SHELL_ID} .v59-home-grid{grid-template-columns:1fr 1fr}#${SHELL_ID} .v59-challenge{grid-column:1/-1}#${SHELL_ID} .v59-practice-grid{gap:14px}#${SHELL_ID} .v59-path{min-height:150px;padding:20px;flex-direction:row;align-items:center;flex-wrap:wrap}#${SHELL_ID} .v59-path-arrow{margin-left:auto}#${SHELL_ID} .v59-math-art{width:240px;right:20px}#${SHELL_ID} .v59-math-art span{width:88px;height:88px}#${SHELL_ID} .v59-math-art span:nth-child(1){right:80px}#${SHELL_ID} .v59-math-art span:nth-child(2){right:0;top:85px}#${SHELL_ID} .v59-math-art span:nth-child(3){right:112px;top:154px}}
      @media(min-width:980px){#${SHELL_ID}{grid-template-columns:190px minmax(0,1fr);gap:26px;padding:0 26px 50px}#${SHELL_ID} .v59-desktop-brand{display:flex;grid-column:1;grid-row:1;flex-direction:column;gap:12px;padding:24px 0;position:sticky;top:10px;height:max-content}#${SHELL_ID} .v59-brand-mark{font-size:38px;font-weight:950;letter-spacing:-.11em;color:var(--v59-blue)}#${SHELL_ID} .v59-brand-mark em{font-style:normal;color:var(--v59-green)}#${SHELL_ID} .v59-desktop-brand small{font-size:12px;color:var(--v59-muted)}#${SHELL_ID} .v59-main{grid-column:2;grid-row:1}#${SHELL_ID} .v59-welcome-wrap{margin:0;border-radius:26px;padding:26px}#${SHELL_ID} .v59-bottom{position:sticky;grid-column:1;grid-row:1;align-self:start;top:225px;left:auto;right:auto;bottom:auto;display:flex;flex-direction:column;gap:7px;width:180px;margin-top:225px;background:transparent;border:0;padding:0;backdrop-filter:none;z-index:3}#${SHELL_ID} .v59-bottom button{min-height:52px;flex-direction:row;justify-content:flex-start;gap:14px;padding:12px 18px;font-size:13px}#${SHELL_ID} .v59-bottom button span{font-size:20px}}
      @media(max-width:390px){#${SHELL_ID} .v59-welcome-wrap{margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}#${SHELL_ID} .v59-avatar{width:50px;height:50px;border-radius:18px}#${SHELL_ID} .v59-welcome-copy h1{font-size:22px}#${SHELL_ID} .v59-top{gap:8px}#${SHELL_ID} .v59-tools{gap:0}#${SHELL_ID} .v59-hero{padding:20px}#${SHELL_ID} .v59-practice-grid{gap:8px}#${SHELL_ID} .v59-path{padding:14px 9px;font-size:12px}}
      @media(prefers-reduced-motion:reduce){#${SHELL_ID} *,#${PANEL_ID} *{scroll-behavior:auto!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function signedIn(){ return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated'); }

  function studentAccess(){
    try {
      const access = typeof activeStudentAccess !== 'undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (access) return access;
    } catch {}
    const identity = document.querySelector('#start .v40c-session-identity-text');
    const strong = text(identity?.querySelector('strong')).replace(/^✓\s*Signed in as\s*/i,'');
    return { student_name: strong || 'Student' };
  }

  function miniCards(){ return [...document.querySelectorAll('#start .v57c-mini-card')]; }

  function readModel(){
    const access = studentAccess();
    const xpCard = document.getElementById('v571a-gamification-card');
    const continueCard = document.querySelector('#start .v57c-continue-card');
    const minis = miniCards();
    const achievement = document.getElementById('v571b-latest-achievement');
    const missions = document.getElementById('v572-weekly-missions-card');
    const challenge = document.getElementById('v573-class-challenge-card');
    const badgeRows = [...(achievement?.querySelectorAll('.v571b-badge') || [])];
    const missionRows = [...(missions?.querySelectorAll('.v572-mission') || [])];
    const progress = clamp(xpCard?.querySelector('.v571a-progress')?.getAttribute('aria-valuenow'));
    const levelNumber = Math.max(1,number(xpCard?.dataset?.level || 1));
    const xpTotal = number(xpCard?.dataset?.xp);
    const levelTitle = text(xpCard?.querySelector('.v571a-level-title'),`Level ${levelNumber}`);
    const xpLabel = text(xpCard?.querySelector('.v571a-xp-label'),xpTotal ? `${xpTotal} XP` : '0 XP');
    const streak = text(xpCard?.querySelector('.v571b-streak-chip'),'Build a Practice streak');
    const challengeProgress = clamp(challenge?.querySelector('.v573-bar')?.getAttribute('aria-valuenow'));
    return {
      name:String(access?.student_name || access?.studentName || 'Student').trim() || 'Student',
      year:number(access?.year_level || access?.yearLevel || document.getElementById('year-level')?.value || 6),
      className:String(access?.class_name || access?.className || document.getElementById('class-group')?.value || '').trim(),
      levelNumber,levelTitle,xpTotal,xpLabel,levelProgress:progress,streak,
      continueTitle:text(continueCard?.querySelector('h2'),'Choose your next Maths activity'),
      continueText:text(continueCard?.querySelector('p'),'Continue learning with your existing V5.8 Practice tools.'),
      continueMeta:[...(continueCard?.querySelectorAll('.v57c-meta span') || [])].map(node=>text(node)).filter(Boolean).slice(0,3),
      assignmentTitle:text(minis[0]?.querySelector('strong'),'My Assignments'),
      assignmentText:text(minis[0]?.querySelector('p'),'Check teacher-assigned Practice.'),
      recommendationTitle:text(minis[1]?.querySelector('strong'),'Recommended Practice'),
      recommendationText:text(minis[1]?.querySelector('p'),'Your next recommendation will appear here.'),
      achievementTitle:text(achievement?.querySelector('h3'),'Your first badge is waiting'),
      achievementText:text(achievement?.querySelector('p'),'Complete Practice to unlock achievements.'),
      achievementMeta:text(achievement?.querySelector('.v571b-achievement-meta'),''),
      badges:badgeRows.map(row=>({title:text(row.querySelector('strong'),'Achievement'),description:text(row.querySelector('small'),''),icon:text(row.querySelector('.v571b-badge-icon'),'🏅'),earned:!row.classList.contains('locked')})),
      missionsTitle:text(missions?.querySelector('.v572-mission-head h3'),"This Week's Missions"),
      missionsMeta:text(missions?.querySelector('.v572-overall'),''),
      missions:missionRows.map(row=>({icon:text(row.querySelector('.v572-mission-icon'),'⭐'),title:text(row.querySelector('.v572-mission-title strong'),'Weekly Mission'),progress:text(row.querySelector('.v572-progress-text'),''),complete:row.classList.contains('complete')})),
      challenge:{available:!!challenge,title:text(challenge?.querySelector('.v573-student-head h3'),'Class challenge'),progressText:text(challenge?.querySelector('.v573-class-progress strong'),'No active class challenge right now.'),footer:text(challenge?.querySelector('.v573-student-foot p'),'Every Practice question helps your class learn together.'),progress:challengeProgress}
    };
  }

  function initials(name){ return String(name || 'Student').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase() || '').join('') || 'S'; }

  function delegate(selector){
    const target = document.querySelector(selector);
    if (!target || target.disabled || target.classList.contains('hidden')) return false;
    target.click();
    return true;
  }

  function closePanel(){ document.getElementById(PANEL_ID)?.remove(); }
  function suspendPreview(){ suspended=true;document.body.classList.remove('v59-preview-home-ready');document.getElementById(SHELL_ID)?.classList.add('v59-suspended');closePanel(); }
  function resumePreview(){ suspended=false;document.getElementById(SHELL_ID)?.classList.remove('v59-suspended');lastSignature='';schedule(0,true); }
  function ensurePracticeMode(){ const practice=document.getElementById('practice-mode-btn');if(practice&&!practice.classList.contains('active')) practice.click(); }

  function openLearn(type=''){
    suspendPreview();
    ensurePracticeMode();
    if(type&&ROOT.V55APastPaperPractice?.setPracticeType) ROOT.V55APastPaperPractice.setPracticeType(type);
    if(!delegate('#start .v57c-learn')) delegate('[data-v40-nav="learn"]');
    if(type==='topic') window.setTimeout(()=>{const change=document.querySelector('#start .v40c-change-settings');if(change&&change.getAttribute('aria-expanded')!=='true') change.click();document.getElementById('strand-filter')?.focus?.({preventScroll:false});},100);
  }

  function handoff(selector){ suspendPreview();if(!delegate(selector)){resumePreview();return false;}return true; }

  function panelShell(title,subtitle,content){
    closePanel();
    const panel=document.createElement('div');panel.id=PANEL_ID;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.innerHTML=`<div class="v59-panel-sheet"><div class="v59-panel-head"><div><h2>${html(title)}</h2><p>${html(subtitle)}</p></div><button type="button" class="v59-panel-close" data-v59-panel-close aria-label="Close">✕</button></div>${content}</div>`;
    document.body.appendChild(panel);panel.addEventListener('click',event=>{if(event.target===panel||event.target.closest('[data-v59-panel-close]')) closePanel();});panel.querySelector('.v59-panel-close')?.focus?.();return panel;
  }

  function openNotifications(model){
    const items=[`<div class="v59-panel-item"><strong>📚 ${html(model.assignmentTitle)}</strong><span>${html(model.assignmentText)}</span></div>`,`<div class="v59-panel-item"><strong>🏅 ${html(model.achievementTitle)}</strong><span>${html(model.achievementText)}</span></div>`,`<div class="v59-panel-item"><strong>🤝 ${html(model.challenge.title)}</strong><span>${html(model.challenge.progressText)}</span></div>`].join('');
    panelShell('Your updates','Current information from the existing V5.8 student Home.',`<div class="v59-panel-list">${items}</div>`);
  }

  function applyPreviewSettings(){ const shell=document.getElementById(SHELL_ID);if(!shell)return;shell.classList.toggle('v59-large',previewSettings.large);shell.classList.toggle('v59-quiet',previewSettings.quiet); }

  function openSettings(){
    const panel=panelShell('Make yourself comfortable','Preview-only display options. They are not saved.',`<div class="v59-setting"><div><strong>Larger text</strong><div class="v59-note">Make this preview easier to read.</div></div><button type="button" data-v59-setting="large">${previewSettings.large?'On':'Off'}</button></div><div class="v59-setting"><div><strong>Calmer colours</strong><div class="v59-note">Reduce decorative maths artwork.</div></div><button type="button" data-v59-setting="quiet">${previewSettings.quiet?'On':'Off'}</button></div>`);
    panel.querySelectorAll('[data-v59-setting]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.v59Setting;previewSettings[key]=!previewSettings[key];applyPreviewSettings();button.textContent=previewSettings[key]?'On':'Off';}));
  }

  function openBadges(model){
    const rows=model.badges.length?model.badges:[{title:model.achievementTitle,description:model.achievementText,icon:'🏅',earned:true}];
    panelShell('Your badge collection','Achievements already provided by V5.8.',`<div class="v59-panel-list">${rows.map(badge=>`<div class="v59-panel-item"><strong>${html(badge.earned?badge.icon:'🔒')} ${html(badge.title)}</strong><span>${html(badge.description || (badge.earned?'Earned':'Keep practising to unlock this badge.'))}</span></div>`).join('')}</div>`);
  }

  function openMissions(model){
    const rows=model.missions.length?model.missions:[{title:'Weekly missions',progress:'Loading from V5.8',icon:'⭐',complete:false}];
    panelShell('Your weekly missions',model.missionsMeta || 'Small steps add up.',`<div class="v59-panel-list">${rows.map(mission=>`<div class="v59-panel-item"><strong>${html(mission.complete?'✅':mission.icon)} ${html(mission.title)}</strong><span>${html(mission.progress || (mission.complete?'Complete':'Keep going'))}</span></div>`).join('')}</div>`);
  }

  function openMore(model){
    const panel=panelShell('A little more','Settings, updates and account actions.',`<div class="v59-panel-list"><button type="button" class="v59-panel-action" data-v59-panel-action="notifications">🔔 Notifications</button><button type="button" class="v59-panel-action" data-v59-panel-action="settings">⚙️ Settings</button><button type="button" class="v59-panel-action" data-v59-panel-action="missions">✨ Weekly missions</button><button type="button" class="v59-panel-action" data-v59-panel-action="badges">🏅 Badges</button><button type="button" class="v59-panel-action" data-v59-panel-action="logout">↪ Sign out</button></div>`);
    panel.querySelectorAll('[data-v59-panel-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.v59PanelAction;closePanel();window.setTimeout(()=>runAction(action,model),0);}));
  }

  function runAction(action,model=readModel()){
    if(action==='continue') handoff('#start .v57c-primary');
    else if(action==='mixed') openLearn('mixed');
    else if(action==='topic') openLearn('topic');
    else if(action==='past_paper') openLearn('past_paper');
    else if(action==='learn'||action==='practice') openLearn();
    else if(action==='assignments'){suspendPreview();if(!(delegate('#start .v57c-assignments')||delegate('#my-assignments-btn'))) resumePreview();}
    else if(action==='progress'){suspendPreview();if(!(delegate('#start .v57c-progress')||delegate('#my-progress-btn'))) resumePreview();}
    else if(action==='recommend'){suspendPreview();if(!(delegate('#start .v57c-recommend')||delegate('#start .v57c-learn')||delegate('[data-v40-nav="learn"]'))) resumePreview();}
    else if(action==='notifications') openNotifications(model);
    else if(action==='settings') openSettings();
    else if(action==='badges') openBadges(model);
    else if(action==='missions') openMissions(model);
    else if(action==='more') openMore(model);
    else if(action==='logout') handoff('#v40c-student-logout');
    else if(action==='home') window.scrollTo({top:0,behavior:'smooth'});
  }

  function signatureFor(model){
    return JSON.stringify({name:model.name,year:model.year,className:model.className,levelNumber:model.levelNumber,xp:model.xpTotal,levelProgress:model.levelProgress,streak:model.streak,continueTitle:model.continueTitle,continueText:model.continueText,assignmentTitle:model.assignmentTitle,assignmentText:model.assignmentText,recommendationTitle:model.recommendationTitle,achievementTitle:model.achievementTitle,achievementMeta:model.achievementMeta,missionsMeta:model.missionsMeta,missionRows:model.missions.map(row=>[row.title,row.progress,row.complete]),challenge:[model.challenge.available,model.challenge.title,model.challenge.progressText,model.challenge.progress]});
  }

  function render(){
    const start=document.getElementById('start');const dashboard=document.querySelector('#start .v40c3-home-dashboard');if(!start)return false;
    if(!signedIn()){suspended=false;document.body.classList.remove('v59-preview-home-ready');document.getElementById(SHELL_ID)?.remove();closePanel();return false;}
    if(suspended){document.body.classList.remove('v59-preview-home-ready');document.getElementById(SHELL_ID)?.classList.add('v59-suspended');return true;}
    if(!dashboard?.querySelector('.v57c-continue-card'))return false;
    const model=readModel(),signature=signatureFor(model);let shell=document.getElementById(SHELL_ID);
    if(shell&&signature===lastSignature){shell.classList.remove('v59-suspended');document.body.classList.add('v59-preview-home-ready');applyPreviewSettings();return true;}
    if(!shell){shell=document.createElement('section');shell.id=SHELL_ID;shell.setAttribute('aria-label','V5.9 student home preview');dashboard.insertAdjacentElement('beforebegin',shell);}
    const classLine=[model.year?`Year ${model.year}`:'',model.className?`Class ${model.className}`:''].filter(Boolean).join(' · ');
    const meta=model.continueMeta.length?model.continueMeta:['Uses your existing V5.8 learning data'];
    const missionDone=model.missions.filter(row=>row.complete).length,missionTotal=model.missions.length,missionPct=missionTotal?Math.round(100*missionDone/missionTotal):0;
    const challengePct=model.challenge.available?model.challenge.progress:0,challengePill=model.challenge.available?`${Math.round(challengePct)}%`:'Teamwork',hasAssignment=!/^all caught up$/i.test(model.assignmentTitle);

    shell.innerHTML=`<aside class="v59-desktop-brand" aria-hidden="true"><div class="v59-brand-mark">m<em>+</em></div><strong>Maths Practice</strong><small>Small steps. Big progress.</small></aside><div class="v59-main"><header class="v59-welcome-wrap"><div class="v59-top"><div class="v59-avatar" aria-label="${html(model.name)} avatar">${html(initials(model.name))}</div><div class="v59-welcome-copy"><h1>Hi, ${html(model.name)}!</h1><p>${html(classLine || 'Signed in student')}</p></div><div class="v59-tools"><button type="button" class="v59-iconbtn" data-v59-action="notifications" aria-label="Notifications">🔔${hasAssignment?'<span class="v59-dot"></span>':''}</button><button type="button" class="v59-iconbtn" data-v59-action="settings" aria-label="Settings">⚙️</button></div></div><div class="v59-level"><span class="v59-level-pill">⭐ Level ${model.levelNumber}</span><span class="v59-xp">${html(model.xpLabel)}</span><div class="v59-track" role="progressbar" aria-label="XP towards next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${model.levelProgress}"><span style="width:${model.levelProgress}%"></span></div></div></header><div class="v59-content"><article class="v59-hero"><div class="v59-hero-copy"><div class="v59-kicker">Continue learning</div><h2>${html(model.continueTitle)}</h2><p>${html(model.continueText)}</p><div class="v59-meta">${meta.map(item=>`<span>${html(item)}</span>`).join('')}</div><button type="button" class="v59-main-cta" data-v59-action="continue">Continue →</button></div><div class="v59-math-art" aria-hidden="true"><span>½</span><span>+</span><span>×</span></div></article><section><div class="v59-section-head"><h2>Today's practice</h2><button type="button" data-v59-action="practice">See all</button></div><div class="v59-practice-grid"><button type="button" class="v59-path" data-v59-action="mixed"><span class="v59-path-icon">➗</span><span>Mixed<br>Practice</span><span class="v59-path-arrow">→</span></button><button type="button" class="v59-path" data-v59-action="topic"><span class="v59-path-icon">🎯</span><span>Topic<br>Practice</span><span class="v59-path-arrow">→</span></button><button type="button" class="v59-path" data-v59-action="past_paper"><span class="v59-path-icon">📄</span><span>Past<br>Papers</span><span class="v59-path-arrow">→</span></button></div></section><div class="v59-home-grid"><section class="v59-card"><div class="v59-card-head"><h2>Assignments</h2><span class="v59-pill ${hasAssignment?'':'green'}">${hasAssignment?'To check':'All caught up'}</span></div><button type="button" class="v59-compact" data-v59-action="assignments"><span class="v59-soft-icon">📚</span><span class="v59-compact-main"><h3>${html(model.assignmentTitle)}</h3><p>${html(model.assignmentText)}</p></span><span>→</span></button></section><section class="v59-card v59-recommend"><div class="v59-card-head"><h2>Recommended next</h2><span>💡</span></div><button type="button" class="v59-compact" data-v59-action="recommend"><span class="v59-soft-icon">🎯</span><span class="v59-compact-main"><h3>${html(model.recommendationTitle)}</h3><p>${html(model.recommendationText)}</p></span><span>→</span></button><p class="v59-note">A small challenge chosen from your current learning evidence.</p></section><section class="v59-card"><div class="v59-card-head"><h2>Weekly missions</h2><button type="button" data-v59-action="missions">Details</button></div><div style="display:flex;align-items:center;gap:12px"><span class="v59-soft-icon" style="background:#fff0dd;color:#b9650b">✨</span><span class="v59-mission-stat">${html(model.streak)}</span></div><div class="v59-progress-caption"><span>${html(model.missionsTitle)}</span><strong>${missionTotal?`${missionDone} / ${missionTotal}`:(model.missionsMeta || '—')}</strong></div><div class="v59-progress" role="progressbar" aria-label="Weekly missions completed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${missionPct}"><span style="width:${missionPct}%"></span></div><p class="v59-note">Every little bit of Practice counts.</p></section><section class="v59-card"><div class="v59-card-head"><h2>Latest badge</h2><button type="button" data-v59-action="badges">See all</button></div><button type="button" class="v59-compact" data-v59-action="badges"><span class="v59-badge-mark">★</span><span class="v59-compact-main"><h3>${html(model.achievementTitle)}</h3><p>${html(model.achievementText)}</p>${model.achievementMeta?`<span class="v59-pill purple" style="margin-top:7px">${html(model.achievementMeta)}</span>`:''}</span></button></section><section class="v59-card v59-challenge"><div class="v59-card-head"><h2>Class challenge</h2><span class="v59-pill">${html(challengePill)}</span></div><button type="button" class="v59-compact" data-v59-action="practice"><span class="v59-soft-icon">🤝</span><span class="v59-compact-main"><h3>${html(model.challenge.title)}</h3><p>${html(model.challenge.progressText)}</p></span><span>→</span></button><div class="v59-progress-caption"><span>Every question helps</span><strong>${html(model.challenge.available?`${Math.round(challengePct)}% complete`:'No active challenge')}</strong></div><div class="v59-progress" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${challengePct}"><span style="width:${challengePct}%"></span></div><p class="v59-note">${html(model.challenge.footer)}</p></section></div></div></div><nav class="v59-bottom" aria-label="V5.9 student preview navigation"><button type="button" data-v59-action="home"><span>🏠</span>Home</button><button type="button" data-v59-action="practice"><span>✏️</span>Practice</button><button type="button" data-v59-action="progress"><span>📊</span>Progress</button><button type="button" data-v59-action="badges"><span>🏅</span>Badges</button><button type="button" data-v59-action="more"><span>•••</span>More</button></nav>`;
    shell.querySelectorAll('[data-v59-action]').forEach(button=>button.addEventListener('click',()=>runAction(button.dataset.v59Action,model)));
    lastSignature=signature;shell.classList.remove('v59-suspended');document.body.classList.add('v59-preview-home-ready');applyPreviewSettings();return true;
  }

  function banner(){ const start=document.getElementById('start');if(!start||document.getElementById(BANNER_ID))return;const bar=document.createElement('div');bar.id=BANNER_ID;bar.textContent='V5.9 STUDENT HOME PREVIEW · Real signed-in V5.8 data · Existing V5.8 actions · Not production';start.insertAdjacentElement('afterbegin',bar); }
  function schedule(attempt=0,force=false){ if(timer)window.clearTimeout(timer);timer=window.setTimeout(()=>{timer=0;banner();if(force)lastSignature='';const ok=render();if(!ok&&!suspended&&attempt<40)schedule(attempt+1,force);},attempt?180:40); }
  function mutationBelongsToPreview(mutation){ const target=mutation.target?.nodeType===1?mutation.target:mutation.target?.parentElement;return !!target?.closest?.(`#${SHELL_ID},#${PANEL_ID},#${BANNER_ID}`); }
  function watch(){ if(observer||typeof MutationObserver==='undefined')return;const start=document.getElementById('start');if(!start)return;observer=new MutationObserver(mutations=>{if(mutations.length&&mutations.every(mutationBelongsToPreview))return;schedule();});observer.observe(start,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-v57c-rendered','data-xp','data-level']}); }
  function wire(){ document.documentElement.dataset.v59StudentHomePreview='true';markNoIndex();injectStyles();banner();watch();['v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated'].forEach(name=>window.addEventListener(name,()=>schedule()));window.addEventListener('pageshow',()=>schedule());document.addEventListener('click',event=>{if(event.target?.closest?.('[data-v40-nav="home"],.back-home'))window.setTimeout(resumePreview,0);if(event.target?.closest?.('#v40c-student-logout'))window.setTimeout(()=>{suspended=false;schedule(0,true);},0);},true);schedule(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();