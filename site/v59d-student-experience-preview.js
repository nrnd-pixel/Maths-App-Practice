/* V5.9D Student Experience Preview — concept-fidelity completion layer.
   Loaded only with ?v59-student-home-preview=1. It reads already-rendered V5.8
   student state and delegates real actions to accepted controls. It adds no
   direct network, grading, Supabase, or persistence path. Exam Mode is untouched. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PARAM = 'v59-student-home-preview';
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get(PARAM) !== '1') return;
  if (ROOT.__v59dStudentExperiencePreviewInstalled) return;
  ROOT.__v59dStudentExperiencePreviewInstalled = true;

  const ROOT_ID = 'v59d-student-experience-preview';
  const STYLE_ID = 'v59d-student-experience-preview-style';
  const HOME_ID = 'v59-student-home-preview';
  const PRACTICE_ID = 'v59b-student-practice-preview';
  let route = '';
  let timer = 0;
  let observer = null;
  const settings = { large:false, quiet:false };

  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const text = (node, fallback='') => String(node?.textContent || fallback).replace(/\s+/g,' ').trim();
  const number = value => Math.max(0,Math.round(Number(value)||0));
  const clamp = value => Math.max(0,Math.min(100,Number(value)||0));
  const percent = value => clamp(parseFloat(String(value ?? '').replace('%','')) || 0);

  function icon(name,size=22){
    const common=`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
    const paths={
      home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V21h14V9.8"/><path d="M9 21v-6h6v6"/>',
      practice:'<path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m14.5 7.5 3 3"/>',
      progress:'<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
      badge:'<circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/>',
      more:'<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>',
      bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
      settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20.3h-3v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.06 15a1.7 1.7 0 0 0-1.55-1H5.4v-3h.11a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V4.7h3v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.55 1h.11v3h-.11a1.7 1.7 0 0 0-1.55 1Z"/>',
      target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m16 8 5-5"/><path d="M17 3h4v4"/>',
      paper:'<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 12h6M9 16h6"/>',
      mixed:'<path d="M4 7h16M4 17h16M8 3v8M16 13v8"/>',
      book:'<path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 3Z"/><path d="M20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 3Z"/>',
      spark:'<path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/>',
      team:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/><path d="M15 15c3 0 5 1.5 5 5"/>',
      info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
      message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A7 7 0 1 1 21 15Z"/>',
      arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
      back:'<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
      star:'<path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9L12 2.5Z"/>',
      flame:'<path d="M13 3s1 4-2 6c-2 1.4-3 3-3 5a4 4 0 0 0 8 0c0-2-1-3.5-3-5 0 2-1 3-2 3-1.5 0-2-1.2-1-3 1-2 3-3 3-6Z"/>',
      check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
      type:'<path d="M4 6V4h16v2"/><path d="M10 20h4"/><path d="M12 4v16"/>',
      palette:'<path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h3a6 6 0 0 0 0-12Z"/><circle cx="7.5" cy="10" r=".5" fill="currentColor"/><circle cx="9" cy="6.5" r=".5" fill="currentColor"/><circle cx="14" cy="6" r=".5" fill="currentColor"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>'
    };
    return `<svg ${common}>${paths[name]||paths.info}</svg>`;
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      body.v59d-open{background:#f4f8ff}
      body.v59d-open .screen.active{display:none!important}
      body.v59d-open #${HOME_ID},body.v59d-open #${PRACTICE_ID}{display:none!important}
      #${ROOT_ID}{--ink:#16264c;--muted:#52627e;--line:#e2eaf4;--blue:#1454d4;--green:#087657;--purple:#6136d5;--gold:#d77022;color:var(--ink);font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif;padding:0 0 92px;min-width:0}
      #${ROOT_ID} *{box-sizing:border-box}#${ROOT_ID} button{font:inherit;color:inherit;border:0;cursor:pointer}#${ROOT_ID} button:focus-visible{outline:3px solid #ea8600;outline-offset:3px}
      #${ROOT_ID}.v59d-large{font-size:19px}#${ROOT_ID}.v59d-quiet .v59d-decor{display:none!important}
      #${ROOT_ID} .v59d-layout{min-width:0}#${ROOT_ID} .v59d-brand{display:none}#${ROOT_ID} .v59d-page{display:grid;gap:18px;min-width:0}
      #${ROOT_ID} .v59d-head{padding:18px 0 2px}#${ROOT_ID} .v59d-head h1{margin:0;font-size:clamp(28px,5vw,35px);line-height:1.15;letter-spacing:-.04em}#${ROOT_ID} .v59d-head p{margin:8px 0 0;color:var(--muted);font-size:13px;line-height:1.5;max-width:650px}
      #${ROOT_ID} .v59d-back{display:inline-flex;align-items:center;gap:7px;min-height:42px;padding:0 10px 0 0;background:transparent;color:var(--blue);font-size:12px;font-weight:900;margin-bottom:6px}
      #${ROOT_ID} .v59d-card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:19px;box-shadow:0 5px 20px rgba(27,60,114,.06);min-width:0}
      #${ROOT_ID} .v59d-card h2,#${ROOT_ID} .v59d-card h3{margin:0}#${ROOT_ID} .v59d-muted{color:var(--muted);font-size:12px;line-height:1.5}
      #${ROOT_ID} .v59d-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}#${ROOT_ID} .v59d-section-head h2{font-size:18px}#${ROOT_ID} .v59d-kicker{font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);margin-bottom:4px}
      #${ROOT_ID} .v59d-grid{display:grid;gap:12px}#${ROOT_ID} .v59d-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${ROOT_ID} .v59d-stat{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px;min-height:100px;display:grid;align-content:center;gap:4px}#${ROOT_ID} .v59d-stat strong{font-size:25px;line-height:1;color:#215dbe}#${ROOT_ID} .v59d-stat span{font-size:11px;color:var(--muted);font-weight:800}
      #${ROOT_ID} .v59d-progress-hero{display:grid;grid-template-columns:118px minmax(0,1fr);gap:18px;align-items:center;background:linear-gradient(135deg,#eaf7ff,#f2efff)}
      #${ROOT_ID} .v59d-ring{--p:0;width:112px;height:112px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#1fa98d calc(var(--p)*1%),#dce8f3 0);position:relative}#${ROOT_ID} .v59d-ring:after{content:'';position:absolute;inset:12px;border-radius:50%;background:#fff}#${ROOT_ID} .v59d-ring strong{position:relative;z-index:1;font-size:26px}#${ROOT_ID} .v59d-ring small{position:absolute;z-index:1;margin-top:36px;font-size:9px;color:var(--muted);font-weight:800}
      #${ROOT_ID} .v59d-journey{display:grid;gap:11px}#${ROOT_ID} .v59d-topic-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px 12px;align-items:center}#${ROOT_ID} .v59d-topic-row strong{font-size:13px}#${ROOT_ID} .v59d-topic-row em{font-style:normal;color:var(--muted);font-size:11px;font-weight:850}#${ROOT_ID} .v59d-bar{grid-column:1/-1;height:9px;border-radius:999px;background:#dee7f4;overflow:hidden}#${ROOT_ID} .v59d-bar span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2979da,#25af98)}
      #${ROOT_ID} .v59d-week{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center}#${ROOT_ID} .v59d-week-icon{width:48px;height:48px;border-radius:15px;background:#fff0dd;color:#b9650b;display:grid;place-items:center}#${ROOT_ID} .v59d-week strong{font-size:16px}
      #${ROOT_ID} .v59d-badge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}#${ROOT_ID} .v59d-badge{background:#fff;border:1px solid var(--line);border-radius:19px;padding:16px;display:grid;gap:9px;min-height:145px}#${ROOT_ID} .v59d-badge.locked{opacity:.55}#${ROOT_ID} .v59d-badge-mark{width:54px;height:60px;display:grid;place-items:center;color:#fff4b8;background:linear-gradient(145deg,#8656e6,#5834b7);clip-path:polygon(50% 0,94% 25%,94% 75%,50% 100%,6% 75%,6% 25%)}#${ROOT_ID} .v59d-badge h3{font-size:14px}#${ROOT_ID} .v59d-badge p{margin:0;color:var(--muted);font-size:10px;line-height:1.4}
      #${ROOT_ID} .v59d-mission{background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px;display:grid;grid-template-columns:42px minmax(0,1fr);gap:11px}#${ROOT_ID} .v59d-mission-icon{width:42px;height:42px;border-radius:13px;background:#eeefff;color:#5257c6;display:grid;place-items:center}#${ROOT_ID} .v59d-mission h3{font-size:14px;margin:0 0 4px}#${ROOT_ID} .v59d-mission p{margin:0 0 8px;color:var(--muted);font-size:10px;line-height:1.4}
      #${ROOT_ID} .v59d-challenge{background:linear-gradient(135deg,#e8fbfa,#eef6ff)}#${ROOT_ID} .v59d-challenge-main{display:grid;grid-template-columns:54px minmax(0,1fr);gap:14px;align-items:center}#${ROOT_ID} .v59d-challenge-icon{width:54px;height:54px;border-radius:17px;background:#fff;color:#168d87;display:grid;place-items:center}
      #${ROOT_ID} .v59d-list{display:grid;gap:10px}#${ROOT_ID} .v59d-list-btn{width:100%;min-height:72px;padding:14px;border:1px solid var(--line);border-radius:17px;background:#fff;display:flex;align-items:center;gap:13px;text-align:left}#${ROOT_ID} .v59d-list-icon{width:42px;height:42px;border-radius:13px;background:#edf1ff;color:#315eaa;display:grid;place-items:center;flex:none}#${ROOT_ID} .v59d-list-copy{min-width:0;flex:1}#${ROOT_ID} .v59d-list-copy strong{display:block;font-size:13px}#${ROOT_ID} .v59d-list-copy span{display:block;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}
      #${ROOT_ID} .v59d-help{background:linear-gradient(115deg,#5a2dcd,#7751e1);color:#fff;border:0}#${ROOT_ID} .v59d-help .v59d-muted{color:#eee9ff}#${ROOT_ID} .v59d-help button{margin-top:12px;min-height:44px;border-radius:13px;background:#fff;color:#4c27aa;padding:10px 15px;font-weight:900}
      #${ROOT_ID} .v59d-setting{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0;border-bottom:1px solid var(--line)}#${ROOT_ID} .v59d-setting:last-child{border-bottom:0}#${ROOT_ID} .v59d-toggle{min-width:78px;min-height:40px;border-radius:999px;background:#e7edf8;color:#415571;font-size:11px;font-weight:950}#${ROOT_ID} .v59d-toggle[aria-pressed="true"]{background:#dff6ea;color:#087657}
      #${ROOT_ID} .v59d-notice{padding:14px;border:1px solid var(--line);border-radius:16px;background:#fafdff}#${ROOT_ID} .v59d-notice strong{display:block;font-size:13px}#${ROOT_ID} .v59d-notice span{display:block;margin-top:4px;color:var(--muted);font-size:10px;line-height:1.4}
      #${ROOT_ID} .v59d-primary{min-height:47px;border-radius:14px;padding:11px 17px;background:var(--blue);color:#fff;font-weight:900}#${ROOT_ID} .v59d-secondary{min-height:47px;border-radius:14px;padding:11px 17px;background:#eef3ff;color:#214da8;font-weight:900}
      #${ROOT_ID} .v59d-nav{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:grid;grid-template-columns:repeat(5,1fr);background:rgba(255,255,255,.95);border-top:1px solid #e1e9f5;padding:7px 8px calc(7px + env(safe-area-inset-bottom));backdrop-filter:blur(10px)}#${ROOT_ID} .v59d-nav button{min-width:0;min-height:58px;border-radius:14px;background:transparent;color:#65718a;font-size:10px;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}#${ROOT_ID} .v59d-nav svg{width:20px;height:20px}#${ROOT_ID} .v59d-nav button.active{color:var(--blue);background:#eaf2ff;font-weight:950}
      .v59d-line-icon{display:inline-grid;place-items:center}.v59d-line-icon svg{display:block}
      #${PRACTICE_ID} .v59d-practice-continue{position:relative;overflow:hidden;border-radius:24px;padding:20px;background:linear-gradient(115deg,#5a2dcd,#7751e1);color:#fff;box-shadow:0 8px 22px rgba(96,56,180,.16)}#${PRACTICE_ID} .v59d-practice-continue h2{margin:4px 0 7px;font-size:22px}#${PRACTICE_ID} .v59d-practice-continue p{margin:0;color:#efeaff;font-size:12px;line-height:1.45;max-width:70ch}#${PRACTICE_ID} .v59d-practice-continue .v59d-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}#${PRACTICE_ID} .v59d-practice-continue .v59d-meta span{font-size:9px;font-weight:850;border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:5px 7px;background:rgba(255,255,255,.1)}#${PRACTICE_ID} .v59d-practice-continue button{margin-top:14px;min-height:45px;border-radius:13px;background:#fff;color:#43219a;padding:10px 15px;font-weight:950}
      html[data-v59-student-home-preview="true"] #quiz.v59c-concept-quiz .quizbar{display:none!important}html[data-v59-student-home-preview="true"] #quiz.v59c-concept-quiz .v59c-quiz-head{margin-bottom:8px}html[data-v59-student-home-preview="true"] #quiz.v59c-concept-quiz .v59c-quiz-head h1{font-size:clamp(24px,5vw,31px)}
      #v59d-quiz-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 2px 10px;font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif}#v59d-quiz-top strong{font-size:12px;color:#52627e}#v59d-quiz-save{min-height:40px;border:1px solid #d7e0ed;border-radius:12px;background:#fff;color:#315eaa;padding:8px 12px;font-size:11px;font-weight:900}#quiz.v59c-concept-quiz #progress-text{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}#quiz.v59c-concept-quiz #quit-btn{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}#v59d-quiz-reassure{margin:12px 2px 0;padding:12px 14px;border-radius:14px;background:#edf6ff;color:#47617e;font-size:11px;text-align:center;font-family:ui-rounded,"Trebuchet MS",system-ui,sans-serif}
      #result.v59c-concept-result #result-score,#result.v59c-concept-result #result-score+.muted{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important}#v59d-result-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin:20px 0}#v59d-result-summary .v59d-result-stat{background:#fff;border:1px solid #e2eaf4;border-radius:18px;padding:16px;text-align:center}#v59d-result-summary strong{display:block;font-size:25px;color:#215dbe}#v59d-result-summary span{font-size:10px;color:#52627e;font-weight:800}#v59d-result-reflection{margin:14px 0 7px;text-align:left;font-size:17px;color:#16264c}#v59d-result-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:14px 0 4px}#v59d-result-actions button{min-height:47px;border-radius:14px;padding:11px 17px;font-weight:900;border:0}#v59d-result-progress{background:#1454d4;color:#fff}#v59d-result-home{background:#eef3ff;color:#214da8}#v59d-result-review-title{margin:22px 0 9px;text-align:left;font-size:18px;color:#16264c}
      @media(min-width:650px){#${ROOT_ID} .v59d-stats{grid-template-columns:repeat(4,minmax(0,1fr))}#${ROOT_ID} .v59d-badge-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(min-width:980px){#${ROOT_ID}{padding:0 26px 50px}#${ROOT_ID} .v59d-layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:26px}#${ROOT_ID} .v59d-brand{display:flex;grid-column:1;grid-row:1;flex-direction:column;gap:12px;padding:24px 0;position:sticky;top:10px;height:max-content}#${ROOT_ID} .v59d-mark{font-size:38px;font-weight:950;letter-spacing:-.11em;color:var(--blue)}#${ROOT_ID} .v59d-mark em{font-style:normal;color:var(--green)}#${ROOT_ID} .v59d-brand small{font-size:12px;color:var(--muted)}#${ROOT_ID} .v59d-page{grid-column:2;grid-row:1}#${ROOT_ID} .v59d-nav{position:sticky;grid-column:1;grid-row:1;align-self:start;top:225px;left:auto;right:auto;bottom:auto;display:flex;flex-direction:column;gap:7px;width:180px;margin-top:225px;background:transparent;border:0;padding:0;backdrop-filter:none;z-index:3}#${ROOT_ID} .v59d-nav button{min-height:52px;flex-direction:row;justify-content:flex-start;gap:14px;padding:12px 18px;font-size:13px}}
      @media(max-width:520px){#${ROOT_ID} .v59d-progress-hero{grid-template-columns:1fr;text-align:center}#${ROOT_ID} .v59d-ring{margin:auto}#v59d-result-summary{grid-template-columns:1fr 1fr}#v59d-result-summary .v59d-result-stat:last-child{grid-column:1/-1}}
      @media(prefers-reduced-motion:reduce){#${ROOT_ID} *,#v59d-quiz-top,#v59d-quiz-reassure{scroll-behavior:auto!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function signedIn(){ return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated'); }

  function removePracticePreview(){
    document.body.classList.remove('v59b-practice-open');
    document.getElementById(PRACTICE_ID)?.remove();
  }

  function studentIdentity(){
    try{
      const access=typeof activeStudentAccess!=='undefined'?activeStudentAccess:ROOT.activeStudentAccess;
      if(access) return access;
    }catch{}
    return {};
  }

  function readBaseModel(){
    const access=studentIdentity();
    const xp=document.getElementById('v571a-gamification-card');
    const achievement=document.getElementById('v571b-latest-achievement');
    const missions=document.getElementById('v572-weekly-missions-card');
    const challenge574=document.getElementById('v574-class-challenge-card');
    const challenge573=document.getElementById('v573-class-challenge-card');
    const challenge=challenge574||challenge573;
    const badges=[...(achievement?.querySelectorAll('.v571b-badge')||[])].map(row=>({
      title:text(row.querySelector('strong'),'Achievement'),
      description:text(row.querySelector('small'),''),
      icon:text(row.querySelector('.v571b-badge-icon'),'★'),
      earned:!row.classList.contains('locked')
    }));
    const missionRows=[...(missions?.querySelectorAll('.v572-mission')||[])].map(row=>({
      title:text(row.querySelector('.v572-mission-title strong'),'Weekly mission'),
      description:text(row.querySelector('.v572-mission-main p'),''),
      progress:text(row.querySelector('.v572-progress-text'),''),
      percent:percent(row.querySelector('.v572-mini-progress')?.getAttribute('aria-valuenow') || row.querySelector('.v572-mini-progress span')?.style?.width),
      complete:row.classList.contains('complete')
    }));
    const challengeProgress=percent(challenge?.querySelector('.v574-bar')?.getAttribute('aria-valuenow') || challenge?.querySelector('.v573-bar')?.getAttribute('aria-valuenow') || challenge?.querySelector('.v574-bar span')?.style?.width);
    const recent=[...document.querySelectorAll('#start .v57c-mini-card')].find(card=>/recent/i.test(text(card.querySelector('.v57c-mini-kicker'))));
    return {
      name:String(access?.student_name||access?.studentName||'Student').trim()||'Student',
      year:number(access?.year_level||access?.yearLevel||document.getElementById('year-level')?.value||6),
      className:String(access?.class_name||access?.className||document.getElementById('class-group')?.value||'').trim(),
      xp:number(xp?.dataset?.xp),
      level:Math.max(1,number(xp?.dataset?.level||1)),
      xpLabel:text(xp?.querySelector('.v571a-xp-label'),'0 XP'),
      streak:text(xp?.querySelector('.v571b-streak-chip'),'Start a Practice streak'),
      badges,
      achievementTitle:text(achievement?.querySelector('h3'),'Your first badge is waiting'),
      achievementText:text(achievement?.querySelector('p'),'Complete Practice to unlock achievements.'),
      missions:missionRows,
      missionsMeta:text(missions?.querySelector('.v572-overall'),''),
      challenge:{
        available:!!challenge,
        title:text(challenge?.querySelector('.v574-challenge-head h3')||challenge?.querySelector('.v573-student-head h3'),'Class challenge'),
        description:text(challenge?.querySelector('.v574-challenge-head p')||challenge?.querySelector('.v573-student-head p'),'Work together through Practice.'),
        progressText:text(challenge?.querySelector('.v574-progress-head strong')||challenge?.querySelector('.v573-class-progress strong'),'No active class challenge right now.'),
        phase:text(challenge?.querySelector('.v574-phase'),''),
        footer:text(challenge?.querySelector('.v574-foot p')||challenge?.querySelector('.v573-student-foot p'),'Every Practice question helps your class.'),
        progress:challengeProgress
      },
      recentTitle:text(recent?.querySelector('strong'),'Latest Practice'),
      recentText:text(recent?.querySelector('p'),'Your recent Practice will appear here.')
    };
  }

  function progressTopics(){
    const rows=[...document.querySelectorAll('#student-progress-strengths .insight-card,#student-progress-focus .insight-card')];
    return rows.map(row=>({
      title:text(row.querySelector('strong'),'Topic'),
      percent:percent(row.querySelector('.insight-bar span')?.style?.width),
      status:row.classList.contains('secure')?'Secure':row.classList.contains('needs-attention')?'Keep building':'Developing'
    })).filter((row,index,array)=>array.findIndex(other=>other.title===row.title)===index).slice(0,8);
  }

  function progressModel(){
    const base=readBaseModel();
    const dashboard=document.getElementById('student-dashboard');
    const recent=[...(dashboard?.querySelectorAll('#student-progress-recent .student-insight-activity')||[])];
    const latest=recent[0];
    const latestText=text(latest,'');
    const pctMatches=[...latestText.matchAll(/(\d{1,3})%/g)].map(match=>clamp(match[1]));
    const latestAccuracy=pctMatches[1]??pctMatches[0]??null;
    const weeklyQuestionMission=base.missions.find(m=>/question/i.test(`${m.title} ${m.description} ${m.progress}`));
    return {
      ...base,
      meta:text(document.getElementById('student-dashboard-meta'),`${base.name} · Year ${base.year}`),
      practiceSessions:text(document.getElementById('student-progress-practice'),'—'),
      examPapers:text(document.getElementById('student-progress-exams'),'—'),
      topicsPractised:text(document.getElementById('student-progress-topics'),'—'),
      lastActivity:text(document.getElementById('student-progress-last'),'—'),
      accuracy:latestAccuracy,
      topics:progressTopics(),
      latestActivity:latestText || base.recentText,
      weekly:weeklyQuestionMission
    };
  }

  function nav(active){
    const activeKey=['settings','notifications','about','missions','challenge'].includes(active)?'more':active;
    const items=[['home','home','Home'],['practice','practice','Practice'],['progress','progress','Progress'],['badges','badge','Badges'],['more','more','More']];
    return `<nav class="v59d-nav" aria-label="V5.9 student navigation">${items.map(([key,ico,label])=>`<button type="button" data-v59d-nav="${key}" class="${activeKey===key?'active':''}">${icon(ico,20)}${label}</button>`).join('')}</nav>`;
  }

  function shell(active,content){
    return `<div class="v59d-layout"><aside class="v59d-brand" aria-hidden="true"><div class="v59d-mark">m<em>+</em></div><strong>Maths Practice</strong><small>Small steps. Big progress.</small></aside><main class="v59d-page">${content}</main>${nav(active)}</div>`;
  }

  function head(title,subtitle,back=''){
    return `<header class="v59d-head">${back?`<button type="button" class="v59d-back" data-v59d-route="${back}">${icon('back',18)} Back</button>`:''}<h1>${html(title)}</h1><p>${html(subtitle)}</p></header>`;
  }

  function renderProgress(){
    const m=progressModel();
    const accuracy=m.accuracy;
    const ringValue=accuracy==null?0:accuracy;
    const ringLabel=accuracy==null?'—':`${accuracy}%`;
    const topics=m.topics.length?m.topics.map(t=>`<div class="v59d-topic-row"><strong>${html(t.title)}</strong><em>${html(t.status)} · ${Math.round(t.percent)}%</em><div class="v59d-bar"><span style="width:${t.percent}%"></span></div></div>`).join(''):'<div class="v59d-muted">Complete more marked Practice to build your topic journey.</div>';
    const weekly=m.weekly?`<div class="v59d-week"><div class="v59d-week-icon">${icon('flame',24)}</div><div><strong>${html(m.weekly.title)}</strong><div class="v59d-muted">${html(m.weekly.progress||m.missionsMeta||'This week')}</div><div class="v59d-bar" style="margin-top:9px"><span style="width:${m.weekly.percent}%"></span></div></div></div>`:'<div class="v59d-muted">Weekly question progress appears here when the current mission data provides it.</div>';
    return shell('progress',`${head('Your progress','See how your Practice is growing over time.')}
      <section class="v59d-card v59d-progress-hero"><div class="v59d-ring" style="--p:${ringValue}"><strong>${html(ringLabel)}</strong><small>${accuracy==null?'Latest accuracy unavailable':'latest accuracy'}</small></div><div><div class="v59d-kicker">Learning snapshot</div><h2 style="margin:0 0 7px">Keep building, ${html(m.name)}.</h2><p class="v59d-muted" style="margin:0">${accuracy==null?'V5.8 does not expose one overall accuracy figure, so this preview will not invent one. Your real Practice summary is shown below.':`Your latest visible Practice accuracy is ${accuracy}%. Keep going one question at a time.`}</p></div></section>
      <div class="v59d-stats"><div class="v59d-stat"><strong>${html(m.practiceSessions)}</strong><span>Practice sessions</span></div><div class="v59d-stat"><strong>${html(m.topicsPractised)}</strong><span>Topics practised</span></div><div class="v59d-stat"><strong>${html(m.streak.replace(/^🔥\s*/,''))}</strong><span>Current streak</span></div><div class="v59d-stat"><strong>${html(m.xpLabel)}</strong><span>XP</span></div></div>
      <section class="v59d-card"><div class="v59d-section-head"><div><div class="v59d-kicker">Your topic journey</div><h2>What you’re building</h2></div></div><div class="v59d-journey">${topics}</div></section>
      <section class="v59d-card"><div class="v59d-section-head"><div><div class="v59d-kicker">This week</div><h2>Practice momentum</h2></div></div>${weekly}</section>
      <section class="v59d-card"><div class="v59d-section-head"><div><div class="v59d-kicker">Latest practice</div><h2>Recent learning</h2></div><span class="v59d-muted">${html(m.lastActivity)}</span></div><p class="v59d-muted" style="margin:0">${html(m.latestActivity||'Your latest completed work will appear here.')}</p></section>`);
  }

  function renderBadges(){
    const m=readBaseModel();
    const badges=m.badges.length?m.badges:[{title:m.achievementTitle,description:m.achievementText,earned:false}];
    const earned=badges.filter(b=>b.earned).length;
    return shell('badges',`${head('Your badges','Celebrate the progress you have already earned.')}
      <section class="v59d-card"><div class="v59d-section-head"><div><div class="v59d-kicker">Badge collection</div><h2>${earned} of ${badges.length} earned</h2></div><span class="v59d-muted">Level ${m.level}</span></div><div class="v59d-badge-grid">${badges.map(b=>`<article class="v59d-badge ${b.earned?'':'locked'}"><div class="v59d-badge-mark">${icon(b.earned?'star':'badge',22)}</div><h3>${html(b.title)}</h3><p>${html(b.description||(b.earned?'Earned through Practice.':'Keep practising to unlock this badge.'))}</p></article>`).join('')}</div></section>`);
  }

  function renderMissions(){
    const m=readBaseModel();
    const rows=m.missions.length?m.missions:[{title:'Weekly missions',description:'Mission progress is loading from V5.8.',progress:'—',percent:0,complete:false}];
    const done=rows.filter(x=>x.complete).length;
    return shell('missions',`${head('Weekly missions','Small goals for this week.','more')}
      <section class="v59d-card"><div class="v59d-section-head"><div><div class="v59d-kicker">This week</div><h2>${done} of ${rows.length} complete</h2></div><span class="v59d-muted">${html(m.missionsMeta||'Resets Monday')}</span></div><div class="v59d-grid">${rows.map(row=>`<article class="v59d-mission"><div class="v59d-mission-icon">${icon(row.complete?'check':'target',21)}</div><div><h3>${html(row.title)}</h3><p>${html(row.description)}</p><div class="v59d-topic-row"><em>${html(row.progress||'Keep going')}</em><div></div><div class="v59d-bar"><span style="width:${row.percent}%"></span></div></div></div></article>`).join('')}</div><button type="button" class="v59d-primary" style="margin-top:14px" data-v59d-action="practice">Keep practising</button></section>`);
  }

  function renderChallenge(){
    const m=readBaseModel(),c=m.challenge;
    return shell('challenge',`${head('Class challenge','Work together. Every Practice question helps.','more')}
      <section class="v59d-card v59d-challenge"><div class="v59d-challenge-main"><div class="v59d-challenge-icon">${icon('team',26)}</div><div><div class="v59d-kicker">Cooperative class challenge</div><h2 style="margin:0 0 5px">${html(c.title)}</h2><p class="v59d-muted" style="margin:0">${html(c.description)}</p></div></div><div style="margin-top:18px"><div class="v59d-topic-row"><strong>${html(c.progressText)}</strong><em>${html(c.phase||`${Math.round(c.progress)}% complete`)}</em><div class="v59d-bar"><span style="width:${c.progress}%"></span></div></div><p class="v59d-muted" style="margin:12px 0 0">${html(c.footer)}</p></div><button type="button" class="v59d-primary" style="margin-top:15px" data-v59d-action="practice">Help my class</button></section>`);
  }

  function renderNotifications(){
    const m=readBaseModel();
    const assignment=[...document.querySelectorAll('#start .v57c-mini-card')][0];
    const rec=[...document.querySelectorAll('#start .v57c-mini-card')][1];
    const rows=[
      ['book',text(assignment?.querySelector('strong'),'Assignments'),text(assignment?.querySelector('p'),'Your assignments are up to date.')],
      ['target',text(rec?.querySelector('strong'),'Recommended next'),text(rec?.querySelector('p'),'Your next recommendation will appear here.')],
      ['badge',m.achievementTitle,m.achievementText],
      ['team',m.challenge.title,m.challenge.progressText]
    ];
    return shell('notifications',`${head('Notifications','Your current learning updates.','more')}<section class="v59d-card"><div class="v59d-list">${rows.map(([ico,title,body])=>`<div class="v59d-notice"><strong><span class="v59d-line-icon" style="vertical-align:middle;margin-right:7px">${icon(ico,18)}</span>${html(title)}</strong><span>${html(body)}</span></div>`).join('')}</div></section>`);
  }

  function renderSettings(){
    return shell('settings',`${head('Settings','Make the preview comfortable to use.','more')}<section class="v59d-card"><div class="v59d-setting"><div style="display:flex;align-items:center;gap:12px"><span class="v59d-list-icon">${icon('type',21)}</span><div><strong>Larger text</strong><div class="v59d-muted">Increase text size across the V5.9 preview.</div></div></div><button type="button" class="v59d-toggle" data-v59d-setting="large" aria-pressed="${settings.large}">${settings.large?'On':'Off'}</button></div><div class="v59d-setting"><div style="display:flex;align-items:center;gap:12px"><span class="v59d-list-icon">${icon('palette',21)}</span><div><strong>Calmer colours</strong><div class="v59d-muted">Reduce decorative artwork while keeping the same learning content.</div></div></div><button type="button" class="v59d-toggle" data-v59d-setting="quiet" aria-pressed="${settings.quiet}">${settings.quiet?'On':'Off'}</button></div><p class="v59d-muted" style="margin:14px 0 0">Preview-only display options. They are not saved.</p></section>`);
  }

  function renderAbout(){
    return shell('about',`${head('About this preview','What this V5.9 test changes — and what it does not.','more')}<section class="v59d-card"><div class="v59d-section-head"><div><div class="v59d-kicker">V5.9 student experience</div><h2>Concept-fidelity test</h2></div></div><p class="v59d-muted">This preview changes the student presentation while keeping the existing V5.8 sign-in, Practice engine, grading, saving, assignments, progress, XP, missions, badges, class challenge, result codes and teacher-review flows as the source of truth.</p><p class="v59d-muted">Exam Mode and Exam Result presentation are intentionally unchanged in this test.</p></section>`);
  }

  function renderMore(){
    const items=[
      ['settings','settings','Settings','Text size and calmer display options'],
      ['notifications','bell','Notifications','Assignments, recommendations and achievements'],
      ['missions','target','Weekly Missions','See this week’s small goals'],
      ['challenge','team','Class Challenge','See how your class is progressing'],
      ['about','info','About','About this V5.9 student preview']
    ];
    return shell('more',`${head('More','A few extra places to help you learn your way.')}<section class="v59d-card"><div class="v59d-list">${items.map(([routeName,ico,title,desc])=>`<button type="button" class="v59d-list-btn" data-v59d-route="${routeName}"><span class="v59d-list-icon">${icon(ico,21)}</span><span class="v59d-list-copy"><strong>${html(title)}</strong><span>${html(desc)}</span></span>${icon('arrow',18)}</button>`).join('')}</div></section><section class="v59d-card v59d-help"><div class="v59d-kicker" style="color:#dfd5ff">Need a hand?</div><h2 style="margin:0 0 7px">Tell your teacher what happened.</h2><p class="v59d-muted" style="margin:0">Use the existing secure feedback form if something is confusing or not working.</p><button type="button" data-v59d-action="feedback">Send feedback</button></section>`);
  }

  function routeMarkup(){
    if(route==='progress') return renderProgress();
    if(route==='badges') return renderBadges();
    if(route==='missions') return renderMissions();
    if(route==='challenge') return renderChallenge();
    if(route==='settings') return renderSettings();
    if(route==='notifications') return renderNotifications();
    if(route==='about') return renderAbout();
    return renderMore();
  }

  function applySettings(){
    const root=document.getElementById(ROOT_ID);
    root?.classList.toggle('v59d-large',settings.large);
    root?.classList.toggle('v59d-quiet',settings.quiet);
    ['v59-student-home-preview','v59b-student-practice-preview'].forEach(id=>{
      const el=document.getElementById(id);if(!el)return;el.classList.toggle('v59-large',settings.large);el.classList.toggle('v59-quiet',settings.quiet);
    });
    document.documentElement.classList.toggle('v59d-large-preview',settings.large);
    document.documentElement.classList.toggle('v59d-quiet-preview',settings.quiet);
  }

  function primeProgress(){
    const dashboard=document.getElementById('student-dashboard');
    if(dashboard?.classList.contains('active')) return;
    const button=document.getElementById('my-progress-btn');
    if(button && !button.disabled && !button.classList.contains('hidden')) button.click();
    else document.querySelector('#start .v57c-progress')?.click();
  }

  function render(){
    if(!signedIn()) { closeRoute(false); return false; }
    let root=document.getElementById(ROOT_ID);
    if(!root){
      root=document.createElement('section');root.id=ROOT_ID;root.setAttribute('aria-label','V5.9 student experience preview');
      const host=document.querySelector('.shell')||document.body;host.appendChild(root);
    }
    root.innerHTML=routeMarkup();
    wireRoot(root);document.body.classList.add('v59d-open');applySettings();window.scrollTo({top:0,behavior:'smooth'});return true;
  }

  function openRoute(next){
    route=['progress','badges','missions','challenge','more','settings','notifications','about'].includes(next)?next:'more';
    removePracticePreview();
    if(route==='progress'){
      primeProgress();
      window.setTimeout(render,80);window.setTimeout(render,260);window.setTimeout(render,700);
    }
    render();
  }

  function returnHome(){
    const dashboard=document.getElementById('student-dashboard');
    if(dashboard?.classList.contains('active')) dashboard.querySelector('.back-home')?.click();
    document.body.classList.remove('v59d-open');document.getElementById(ROOT_ID)?.remove();route='';
  }

  function closeRoute(returnToHome=true){
    document.body.classList.remove('v59d-open');document.getElementById(ROOT_ID)?.remove();route='';
    if(returnToHome) returnHome();
  }

  function openPractice(){ returnHome();window.setTimeout(()=>document.querySelector(`#${HOME_ID} [data-v59-action="practice"]`)?.click(),40); }
  function sendFeedback(){ returnHome();window.setTimeout(()=>{const source=document.getElementById('v576-send-feedback')||document.getElementById('v5761-feedback-icon');source?.click?.();},50); }

  function wireRoot(root){
    root.querySelectorAll('[data-v59d-route]').forEach(button=>button.addEventListener('click',()=>openRoute(button.dataset.v59dRoute)));
    root.querySelectorAll('[data-v59d-nav]').forEach(button=>button.addEventListener('click',()=>{
      const dest=button.dataset.v59dNav;if(dest==='home') returnHome();else if(dest==='practice') openPractice();else openRoute(dest);
    }));
    root.querySelectorAll('[data-v59d-setting]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.v59dSetting;settings[key]=!settings[key];render();}));
    root.querySelectorAll('[data-v59d-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.v59dAction;if(action==='practice')openPractice();else if(action==='feedback')sendFeedback();}));
  }

  function replaceIcon(button,name){
    const span=button?.querySelector(':scope > span');if(!span||span.dataset.v59dIcon==='1')return;span.innerHTML=icon(name,20);span.dataset.v59dIcon='1';span.classList.add('v59d-line-icon');
  }

  function enhanceHome(){
    const home=document.getElementById(HOME_ID);if(!home)return;
    const map={home:'home',practice:'practice',progress:'progress',badges:'badge',more:'more'};
    home.querySelectorAll('.v59-bottom [data-v59-action]').forEach(button=>replaceIcon(button,map[button.dataset.v59Action]||'more'));
    const notif=home.querySelector('[data-v59-action="notifications"]');if(notif&&!notif.dataset.v59dIcon){const dot=notif.querySelector('.v59-dot');notif.innerHTML=icon('bell',20)+(dot?dot.outerHTML:'');notif.dataset.v59dIcon='1';}
    const set=home.querySelector('[data-v59-action="settings"]');if(set&&!set.dataset.v59dIcon){set.innerHTML=icon('settings',20);set.dataset.v59dIcon='1';}
    const practiceIcons=[['mixed','mixed'],['topic','target'],['past_paper','paper']];practiceIcons.forEach(([action,ico])=>{const button=home.querySelector(`[data-v59-action="${action}"]`);const span=button?.querySelector('.v59-path-icon');if(span&&!span.dataset.v59dIcon){span.innerHTML=icon(ico,21);span.dataset.v59dIcon='1';}});
    home.querySelectorAll('.v59-card').forEach(card=>{const label=text(card.querySelector('.v59-card-head h2')).toLowerCase();const span=card.querySelector('.v59-soft-icon');if(!span||span.dataset.v59dIcon)return;const ico=label.includes('assignment')?'book':label.includes('recommend')?'target':label.includes('mission')?'spark':label.includes('challenge')?'team':'';if(ico){span.innerHTML=icon(ico,21);span.dataset.v59dIcon='1';}});
    const level=home.querySelector('.v59-level-pill');if(level&&!level.dataset.v59dIcon){level.innerHTML=`${icon('star',16)} Level ${html(level.textContent.replace(/[^0-9]+/g,'')||'1')}`;level.dataset.v59dIcon='1';}
    const challenge=home.querySelector('.v59-challenge [data-v59-action="practice"]');if(challenge) challenge.dataset.v59Action='challenge';
  }

  function resumableContinue(){
    const card=document.querySelector('#start .v57c-continue-card');const button=card?.querySelector('.v57c-primary');if(!card||!button)return null;
    const kind=card.dataset.v57cKind||'';const action=text(button,'');const resumable=['checkpoint','assignment'].includes(kind)||/continue|resume/i.test(action);
    if(!resumable)return null;
    return {title:text(card.querySelector('h2'),'Continue learning'),body:text(card.querySelector('p'),'Pick up where you left off.'),meta:[...(card.querySelectorAll('.v57c-meta span')||[])].map(x=>text(x)).filter(Boolean).slice(0,3),action};
  }

  function enhancePracticeHub(){
    const root=document.getElementById(PRACTICE_ID);if(!root)return;
    const map={home:'home',practice:'practice',progress:'progress',badges:'badge',more:'more'};root.querySelectorAll('.v59b-nav [data-v59b-nav]').forEach(button=>replaceIcon(button,map[button.dataset.v59bNav]||'more'));
    [['mixed','mixed'],['topics','target'],['papers','paper']].forEach(([key,ico])=>{const button=key==='mixed'?root.querySelector('[data-v59b-action="mixed"]'):root.querySelector(`[data-v59b-route="${key}"]`);const span=button?.querySelector('.v59b-path-icon');if(span&&!span.dataset.v59dIcon){span.innerHTML=icon(ico,21);span.dataset.v59dIcon='1';}});
    root.querySelectorAll('.v59b-hub-action').forEach(button=>{const span=button.querySelector('.v59b-soft-icon');if(!span||span.dataset.v59dIcon)return;span.innerHTML=icon(button.dataset.v59bAction==='assignments'?'book':'target',21);span.dataset.v59dIcon='1';});
    root.querySelectorAll('.v59b-topic .v59b-soft-icon').forEach(span=>{if(span.dataset.v59dIcon)return;span.innerHTML=icon('target',21);span.dataset.v59dIcon='1';});
    root.querySelectorAll('.v59b-paper .v59b-soft-icon').forEach(span=>{if(span.dataset.v59dIcon)return;span.innerHTML=icon('paper',21);span.dataset.v59dIcon='1';});
    const page=root.querySelector('.v59b-page');if(!page||text(page.querySelector('.v59b-head h1'))!=='Your practice space')return;
    const active=resumableContinue();let hero=root.querySelector('.v59d-practice-continue');
    if(!active){hero?.remove();return;}
    if(!hero){hero=document.createElement('article');hero.className='v59d-practice-continue';const firstSection=page.querySelector('.v59b-section');firstSection?.insertAdjacentElement('beforebegin',hero);}
    hero.innerHTML=`<div class="v59d-kicker" style="color:#e5dcff">Continue learning</div><h2>${html(active.title)}</h2><p>${html(active.body)}</p><div class="v59d-meta">${active.meta.map(x=>`<span>${html(x)}</span>`).join('')}</div><button type="button" data-v59d-practice-continue>${html(active.action||'Continue')} ${icon('arrow',16)}</button>`;
    hero.querySelector('[data-v59d-practice-continue]')?.addEventListener('click',()=>{removePracticePreview();document.querySelector('#start .v57c-primary')?.click();});
  }

  function enhanceQuiz(){
    const quiz=document.getElementById('quiz');if(!quiz?.classList.contains('v59c-concept-quiz'))return;
    const path=text(document.getElementById('path-pill'),'Practice');const progress=text(document.getElementById('progress-text'),'Question');
    const head=quiz.querySelector('.v59c-quiz-head');if(head){const eyebrow=head.querySelector('.v59c-eyebrow');const h1=head.querySelector('h1');const p=head.querySelector('p');if(eyebrow)eyebrow.textContent='Practice';if(h1)h1.textContent=path||'Practice';if(p)p.textContent='Take one question at a time. Use a hint whenever you need one.';}
    let top=document.getElementById('v59d-quiz-top');if(!top){top=document.createElement('div');top.id='v59d-quiz-top';quiz.querySelector(':scope > .progress')?.insertAdjacentElement('beforebegin',top);}
    top.innerHTML=`<strong>${html(progress)}</strong><button type="button" id="v59d-quiz-save">Save &amp; leave</button>`;top.querySelector('#v59d-quiz-save')?.addEventListener('click',()=>document.getElementById('quit-btn')?.click());
    let reassure=document.getElementById('v59d-quiz-reassure');if(!reassure){reassure=document.createElement('div');reassure.id='v59d-quiz-reassure';document.getElementById('v59c-question-card')?.insertAdjacentElement('afterend',reassure);}if(reassure)reassure.textContent='Take your time. It’s okay to use a hint.';
  }

  function parseFractionLabel(value){const match=String(value||'').match(/(\d+)\s*\/\s*(\d+)/);return match?{a:number(match[1]),b:number(match[2])}:null;}

  function enhanceResult(){
    const result=document.getElementById('result');if(!result?.classList.contains('v59c-concept-result'))return;
    const trophy=result.querySelector(':scope > div:first-child');if(trophy&&!trophy.dataset.v59dIcon){trophy.innerHTML=icon('star',34);trophy.dataset.v59dIcon='1';}
    const mastery=parseFractionLabel(text(document.getElementById('res-mastery')));const score=parseFractionLabel(text(document.getElementById('result-score')));const correct=mastery?.a??score?.a??'—';const total=mastery?.b??score?.b??'—';
    let summary=document.getElementById('v59d-result-summary');if(!summary){summary=document.createElement('div');summary.id='v59d-result-summary';document.getElementById('result-name')?.insertAdjacentElement('afterend',summary);}if(summary)summary.innerHTML=`<div class="v59d-result-stat"><strong>${html(correct)}</strong><span>Correct answers</span></div><div class="v59d-result-stat"><strong>${html(total)}</strong><span>Questions practised</span></div><div class="v59d-result-stat"><strong>XP ✓</strong><span>Updates on Home</span></div>`;
    const message=document.getElementById('result-message');let reflection=document.getElementById('v59d-result-reflection');if(message&&!reflection){reflection=document.createElement('h2');reflection.id='v59d-result-reflection';reflection.textContent='A little reflection';message.insertAdjacentElement('beforebegin',reflection);}
    let actions=document.getElementById('v59d-result-actions');if(message&&!actions){actions=document.createElement('div');actions.id='v59d-result-actions';actions.innerHTML='<button type="button" id="v59d-result-progress">My progress</button><button type="button" id="v59d-result-home">Home</button>';message.insertAdjacentElement('afterend',actions);}if(actions&&!actions.dataset.v59dWired){actions.dataset.v59dWired='1';actions.querySelector('#v59d-result-home')?.addEventListener('click',()=>result.querySelector('.back-home')?.click());actions.querySelector('#v59d-result-progress')?.addEventListener('click',()=>{result.querySelector('.back-home')?.click();window.setTimeout(()=>openRoute('progress'),100);});}
    const review=document.getElementById('review');let title=document.getElementById('v59d-result-review-title');if(review&&!title){title=document.createElement('h2');title.id='v59d-result-review-title';title.textContent='Your answers';review.insertAdjacentElement('beforebegin',title);}
  }

  function capture(event){
    const homeButton=event.target?.closest?.(`#${HOME_ID} [data-v59-action]`);if(homeButton){const action=homeButton.dataset.v59Action;if(['progress','badges','missions','more','settings','notifications','challenge'].includes(action)){event.preventDefault();event.stopImmediatePropagation();openRoute(action);return;}}
    const practiceNav=event.target?.closest?.(`#${PRACTICE_ID} [data-v59b-nav]`);if(practiceNav){const dest=practiceNav.dataset.v59bNav;if(['progress','badges','more'].includes(dest)){event.preventDefault();event.stopImmediatePropagation();openRoute(dest);return;}}
  }

  function schedule(){if(timer)window.clearTimeout(timer);timer=window.setTimeout(()=>{timer=0;enhanceHome();enhancePracticeHub();enhanceQuiz();enhanceResult();if(route)render();},60);}

  function wire(){
    injectStyles();enhanceHome();enhancePracticeHub();enhanceQuiz();enhanceResult();document.addEventListener('click',capture,true);
    ['v57c:home-updated','v571a:gamification-updated','v571b:achievements-updated','v572:missions-updated','v573:class-challenge-updated','v574:class-challenge-updated'].forEach(name=>window.addEventListener(name,schedule));
    if(typeof MutationObserver!=='undefined'){observer=new MutationObserver(mutations=>{const external=mutations.some(m=>{const target=m.target?.nodeType===1?m.target:m.target?.parentElement;if(!target)return true;return !target.closest?.(`#${ROOT_ID},#v59d-quiz-top,#v59d-quiz-reassure,#v59d-result-summary,#v59d-result-actions,#v59d-result-reflection,#v59d-result-review-title,.v59d-practice-continue,.v59d-line-icon`);});if(external)schedule();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-valuenow','data-v57c-kind']});}
    window.addEventListener('pageshow',schedule);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
