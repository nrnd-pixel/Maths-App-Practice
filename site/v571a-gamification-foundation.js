/* V5.7.1A — Student Gamification Foundation.
   Adds read-only XP + level motivation to the accepted V5.7 Continue Learning Home.
   XP is derived server-side from already saved Practice evidence, so this layer makes
   no gamification writes and cannot duplicate awards. Exam activity never earns XP. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v571aGamificationFoundationInstalled) return;
  ROOT.__v571aGamificationFoundationInstalled = true;

  const RPC_NAME = 'get_student_gamification_v571a';
  const CARD_ID = 'v571a-gamification-card';
  const STYLE_ID = 'v571a-gamification-style';
  const DASHBOARD_SELECTOR = '#start .v40c3-home-dashboard';
  const CACHE_MS = 15000;

  const LEVELS = Object.freeze([
    Object.freeze({number:1,title:'Maths Starter',start:0,next:100}),
    Object.freeze({number:2,title:'Number Explorer',start:100,next:250}),
    Object.freeze({number:3,title:'Problem Solver',start:250,next:500}),
    Object.freeze({number:4,title:'Maths Challenger',start:500,next:900}),
    Object.freeze({number:5,title:'Maths Master',start:900,next:null})
  ]);

  let cached = null;
  let lastLoadedAt = 0;
  let loading = false;
  let retryTimer = 0;
  let installed = false;

  const trim = value => String(value ?? '').trim();
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const integer = value => Math.max(0,Math.round(Number(value)||0));
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function passivePracticeAccess(){
    if (!signedIn()) return null;
    try {
      const fromHome = ROOT.V57CStudentContinueLearningHome?.passivePracticeAccess?.();
      if (fromHome?.access_token) return fromHome;
      const fromResume = ROOT.V57ACrossDevicePastPaperResume?.passivePracticeAccess?.();
      if (fromResume?.access_token) return fromResume;
      const access = typeof activeStudentAccess !== 'undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose !== 'practice') return null;
      return access;
    } catch { return null; }
  }

  function levelForXp(value){
    const xp = integer(value);
    const level = [...LEVELS].reverse().find(row => xp >= row.start) || LEVELS[0];
    const progress = level.next == null
      ? 100
      : clamp(Math.round(100 * (xp-level.start) / Math.max(1,level.next-level.start)),0,100);
    return Object.freeze({
      number:level.number,
      title:level.title,
      start_xp:level.start,
      next_level_xp:level.next,
      progress_percent:progress
    });
  }

  function normalizePayload(payload){
    const xp = integer(payload?.xp?.total);
    const fallback = levelForXp(xp);
    const serverLevel = integer(payload?.level?.number);
    const known = LEVELS.find(row => row.number===serverLevel);
    const level = known ? {
      number:known.number,
      title:trim(payload?.level?.title) || known.title,
      start_xp:Number.isFinite(Number(payload?.level?.start_xp)) ? integer(payload.level.start_xp) : known.start,
      next_level_xp:payload?.level?.next_level_xp == null ? null : integer(payload.level.next_level_xp),
      progress_percent:clamp(integer(payload?.level?.progress_percent),0,100)
    } : fallback;
    return Object.freeze({
      xp,
      level:Object.freeze(level),
      activity:Object.freeze({
        first_try_correct:integer(payload?.activity?.first_try_correct),
        second_try_correct:integer(payload?.activity?.second_try_correct),
        completed_sessions:integer(payload?.activity?.completed_sessions),
        completed_past_papers:integer(payload?.activity?.completed_past_papers),
        completed_assignments:integer(payload?.activity?.completed_assignments)
      }),
      rules:Object.freeze({
        first_try_correct_xp:integer(payload?.rules?.first_try_correct_xp || 10),
        second_try_correct_xp:integer(payload?.rules?.second_try_correct_xp || 6),
        completed_session_xp:integer(payload?.rules?.completed_session_xp || 10),
        past_paper_extra_xp:integer(payload?.rules?.past_paper_extra_xp || 20),
        completed_assignment_xp:integer(payload?.rules?.completed_assignment_xp || 20)
      })
    });
  }

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #start #${CARD_ID}{border:1px solid color-mix(in srgb,#18a999 38%,var(--border));border-radius:20px;padding:16px 18px;background:linear-gradient(135deg,color-mix(in srgb,#e8fbf7 78%,var(--card)),var(--card));display:grid;grid-template-columns:auto minmax(0,1fr);gap:15px;align-items:center;box-shadow:0 7px 22px rgba(15,85,80,.06)}
      #start .v571a-level-badge{width:68px;height:68px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(145deg,#20b7a5,#0d7f86);color:white;box-shadow:inset 0 0 0 4px rgba(255,255,255,.2),0 7px 15px rgba(12,107,111,.18);font-size:29px;font-weight:950;position:relative}
      #start .v571a-level-badge::after{content:'★';position:absolute;right:-6px;bottom:-6px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#ffc342;color:#704500;font-size:13px;border:3px solid var(--card)}
      #start .v571a-level-main{min-width:0;display:grid;gap:7px}
      #start .v571a-level-head{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
      #start .v571a-level-kicker{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.07em;color:#087a75}
      #start .v571a-level-title{margin:1px 0 0;font-size:clamp(17px,2.5vw,22px);line-height:1.25}
      #start .v571a-xp-label{font-size:13px;font-weight:900;white-space:nowrap;color:var(--text)}
      #start .v571a-progress{height:11px;border-radius:999px;background:color-mix(in srgb,var(--border) 72%,transparent);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}
      #start .v571a-progress>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#16b7a3,#36cdb3);transition:width .35s ease}
      #start .v571a-level-note{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:11px;line-height:1.4}
      #start .v571a-level-note strong{color:#087a75}
      #start .v571a-rules{font-size:11px;color:var(--muted)}
      #start .v571a-rules summary{cursor:pointer;font-weight:850;color:var(--primary);width:max-content;max-width:100%;list-style:none}
      #start .v571a-rules summary::-webkit-details-marker{display:none}
      #start .v571a-rule-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      #start .v571a-rule-chips span{display:inline-flex;padding:5px 8px;border-radius:999px;border:1px solid var(--border);background:var(--card);font-size:10px;font-weight:800}
      html[data-theme="dark"] #start #${CARD_ID}{background:linear-gradient(135deg,color-mix(in srgb,#0c6f69 18%,var(--card)),var(--card))}
      @media(max-width:520px){#start #${CARD_ID}{grid-template-columns:56px minmax(0,1fr);padding:14px;gap:12px}#start .v571a-level-badge{width:56px;height:56px;border-radius:17px;font-size:24px}#start .v571a-xp-label{white-space:normal}}
    `;
    document.head.appendChild(style);
  }

  function dashboard(){
    return typeof document==='undefined' ? null : document.querySelector(DASHBOARD_SELECTOR);
  }

  function render(payload){
    const root=dashboard();
    const anchor=root?.querySelector('.v57c-continue-card');
    if (!root || !anchor || !signedIn()) return false;

    const model=normalizePayload(payload);
    const {xp,level,rules}=model;
    const next=level.next_level_xp;
    const remaining=next==null ? 0 : Math.max(0,next-xp);
    const xpText=next==null ? `${xp} XP` : `${xp} / ${next} XP`;
    const note=next==null
      ? '<strong>Top starter level reached</strong><span>Keep practising to build your Maths record.</span>'
      : xp===0
        ? `<strong>Start earning XP</strong><span>${remaining} XP to Level ${level.number+1}.</span>`
        : `<strong>${remaining} XP to Level ${level.number+1}</strong><span>XP comes from verified Practice already saved in the app.</span>`;

    let card=document.getElementById(CARD_ID);
    if (!card){
      card=document.createElement('article');
      card.id=CARD_ID;
      anchor.insertAdjacentElement('beforebegin',card);
    } else if (card.nextElementSibling!==anchor){
      anchor.insertAdjacentElement('beforebegin',card);
    }

    card.dataset.level=String(level.number);
    card.dataset.xp=String(xp);
    card.innerHTML=`
      <div class="v571a-level-badge" aria-label="Level ${level.number}">${level.number}</div>
      <div class="v571a-level-main">
        <div class="v571a-level-head">
          <div><div class="v571a-level-kicker">XP &amp; Level</div><h2 class="v571a-level-title">Level ${level.number} — ${html(level.title)}</h2></div>
          <div class="v571a-xp-label">⭐ ${html(xpText)}</div>
        </div>
        <div class="v571a-progress" role="progressbar" aria-label="XP progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${level.progress_percent}"><span style="width:${level.progress_percent}%"></span></div>
        <div class="v571a-level-note">${note}</div>
        <details class="v571a-rules">
          <summary>How XP works ▾</summary>
          <div class="v571a-rule-chips">
            <span>+${rules.first_try_correct_xp} First Try correct</span>
            <span>+${rules.second_try_correct_xp} Second Try correct</span>
            <span>+${rules.completed_session_xp} Completed Practice</span>
            <span>+${rules.past_paper_extra_xp} Past Paper bonus</span>
            <span>+${rules.completed_assignment_xp} Assignment bonus</span>
          </div>
        </details>
      </div>`;

    root.classList.add('v571a-gamified-home');
    window.dispatchEvent(new CustomEvent('v571a:gamification-updated',{detail:{xp,level:level.number}}));
    return true;
  }

  async function rpc(token){
    const {data,error}=await cloud.rpc(RPC_NAME,{p_access_token:token});
    if (error) throw error;
    return data || {};
  }

  async function load(force=false){
    if (loading || !signedIn()) return false;
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;

    if (!force && cached && lastLoadedAt && Date.now()-lastLoadedAt<CACHE_MS){
      return render(cached);
    }

    const access=passivePracticeAccess();
    if (!access?.access_token) return false;

    loading=true;
    try {
      const data=await rpc(access.access_token);
      if (!signedIn()) return false;
      cached=data;
      lastLoadedAt=Date.now();
      return render(data);
    } catch(error){
      console.warn('V5.7.1A gamification summary could not be refreshed.',error);
      return cached ? render(cached) : false;
    } finally { loading=false; }
  }

  function scheduleLoad(force=false,attempt=0){
    if (typeof window==='undefined') return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer=window.setTimeout(async()=>{
      retryTimer=0;
      if (!signedIn()) return;
      const ok=await load(force);
      if (!ok && attempt<24) scheduleLoad(force,attempt+1);
    },attempt?180:60);
  }

  function clear(){
    cached=null;
    lastLoadedAt=0;
    document.getElementById(CARD_ID)?.remove();
  }

  function wire(){
    if (installed || typeof document==='undefined') return installed;
    injectStyles();
    installed=true;

    window.addEventListener('v57c:home-updated',()=>{
      if (cached) render(cached);
      scheduleLoad(true);
    });
    window.addEventListener('pageshow',()=>{ if (signedIn()) scheduleLoad(false); });
    window.addEventListener('focus',()=>{
      if (signedIn() && document.getElementById('start')?.classList.contains('active')) scheduleLoad(false);
    });
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleLoad(true);
      if (event.target?.closest?.('#v40c-student-logout')) clear();
    },true);

    scheduleLoad(true);
    return true;
  }

  const api=Object.freeze({
    RPC_NAME,LEVELS,levelForXp,normalizePayload,passivePracticeAccess,render,load,clear
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V571AGamificationFoundation',{value:api,writable:false,configurable:false});
    wire();
  }
})();
