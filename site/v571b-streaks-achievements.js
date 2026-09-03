/* V5.7.1B — Practice Streaks + Achievement Badges.
   Adds a gentle Practice streak and read-only achievement badges to the accepted
   V5.7.1A XP/Level Home. All motivation data is derived server-side from saved
   non-Exam Practice evidence; this layer creates no streak/badge write path. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v571bStreaksAchievementsInstalled) return;
  ROOT.__v571bStreaksAchievementsInstalled = true;

  const RPC_NAME = 'get_student_gamification_achievements_v571b';
  const CARD_ID = 'v571b-latest-achievement';
  const STYLE_ID = 'v571b-streaks-achievements-style';
  const TOAST_ID = 'v571b-achievement-toast';
  const CACHE_MS = 15000;
  const CELEBRATION_WINDOW_MS = 10 * 60 * 1000;

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

  function signedIn(){
    if (typeof document==='undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function passivePracticeAccess(){
    if (!signedIn()) return null;
    try {
      const fromV571A = ROOT.V571AGamificationFoundation?.passivePracticeAccess?.();
      if (fromV571A?.access_token) return fromV571A;
      const fromHome = ROOT.V57CStudentContinueLearningHome?.passivePracticeAccess?.();
      if (fromHome?.access_token) return fromHome;
      const access = typeof activeStudentAccess !== 'undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose !== 'practice') return null;
      return access;
    } catch { return null; }
  }

  function normalizeBadge(row){
    if (!row || !trim(row.id)) return null;
    const earnedAt = row.earned_at ? trim(row.earned_at) : '';
    return Object.freeze({
      id:trim(row.id),
      title:trim(row.title) || 'Achievement',
      description:trim(row.description),
      icon:trim(row.icon) || '🏅',
      earned:row.earned===true || !!earnedAt,
      earned_at:earnedAt || null
    });
  }

  function normalizePayload(payload){
    const badges=(Array.isArray(payload?.badges)?payload.badges:[]).map(normalizeBadge).filter(Boolean);
    const earned=badges.filter(row=>row.earned);
    const latest=normalizeBadge(payload?.latest_badge) || earned
      .slice()
      .sort((a,b)=>Date.parse(b.earned_at||0)-Date.parse(a.earned_at||0))[0] || null;
    return Object.freeze({
      streak:Object.freeze({
        current:integer(payload?.streak?.current),
        longest:integer(payload?.streak?.longest),
        days_this_week:integer(payload?.streak?.days_this_week),
        meaningful_days:integer(payload?.streak?.meaningful_days),
        today_qualified:payload?.streak?.today_qualified===true,
        today_questions:integer(payload?.streak?.today_questions),
        last_qualified_day:trim(payload?.streak?.last_qualified_day) || null
      }),
      badges:Object.freeze(badges),
      latest_badge:latest,
      earned_count:earned.length,
      rules:Object.freeze({
        meaningful_questions_per_day:Math.max(1,integer(payload?.rules?.meaningful_questions_per_day || 5)),
        past_paper_completes_day:payload?.rules?.past_paper_completes_day!==false,
        assignment_completes_day:payload?.rules?.assignment_completes_day!==false,
        timezone:trim(payload?.rules?.timezone) || 'Asia/Brunei'
      })
    });
  }

  function streakMessage(model){
    const streak=model?.streak || {};
    const target=Math.max(1,integer(model?.rules?.meaningful_questions_per_day || 5));
    const current=integer(streak.current);
    const today=integer(streak.today_questions);
    if (streak.today_qualified){
      return current>0
        ? `Streak secured today · ${integer(streak.days_this_week)} day${integer(streak.days_this_week)===1?'':'s'} practised this week.`
        : 'Meaningful Practice completed today.';
    }
    if (current>0) return `Practise today to keep your ${current}-day streak going.`;
    if (today>0 && today<target) return `${today}/${target} questions today · ${target-today} more to start a streak.`;
    return `Complete ${target} questions today to start a Practice streak.`;
  }

  function celebrationCandidate(model,now=Date.now()){
    const badge=model?.latest_badge;
    if (!badge?.earned || !badge.earned_at) return null;
    const earned=Date.parse(badge.earned_at);
    if (!Number.isFinite(earned)) return null;
    const age=now-earned;
    return age>=0 && age<=CELEBRATION_WINDOW_MS ? badge : null;
  }

  function dateLabel(value){
    if (!value) return '';
    const date=new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString([],{day:'numeric',month:'short'});
  }

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #start .v571b-streak-chip{display:inline-flex;align-items:center;gap:6px;min-height:31px;padding:5px 9px;border-radius:999px;border:1px solid color-mix(in srgb,#ff8a24 42%,var(--border));background:color-mix(in srgb,#fff1df 72%,var(--card));color:#b45608;font-size:11px;font-weight:950;white-space:nowrap}
      #start .v571b-streak-note{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,#fff3e4 60%,var(--card));border:1px solid color-mix(in srgb,#ff9a35 24%,var(--border));font-size:11px;line-height:1.4;color:var(--muted)}
      #start .v571b-streak-note strong{color:#a94f08}
      #start #${CARD_ID}{border:1px solid color-mix(in srgb,#20a875 34%,var(--border));border-radius:18px;padding:15px 16px;background:linear-gradient(135deg,color-mix(in srgb,#ebfbf3 72%,var(--card)),var(--card));display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center}
      #start .v571b-achievement-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(145deg,#25b67e,#168969);font-size:29px;box-shadow:inset 0 0 0 3px rgba(255,255,255,.18)}
      #start .v571b-achievement-main{min-width:0;display:grid;gap:4px}
      #start .v571b-kicker{font-size:10px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;color:#16805d}
      #start .v571b-achievement-main h3{margin:0;font-size:18px;line-height:1.25}
      #start .v571b-achievement-main p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}
      #start .v571b-achievement-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:3px}
      #start .v571b-achievement-meta span{font-size:10px;font-weight:850;padding:4px 7px;border-radius:999px;border:1px solid var(--border);background:var(--card)}
      #start .v571b-achievements{grid-column:1/-1;border-top:1px solid var(--border);padding-top:9px;margin-top:2px}
      #start .v571b-achievements summary{cursor:pointer;font-size:11px;font-weight:900;color:var(--primary);list-style:none;width:max-content;max-width:100%}
      #start .v571b-achievements summary::-webkit-details-marker{display:none}
      #start .v571b-badge-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}
      #start .v571b-badge{border:1px solid var(--border);border-radius:13px;padding:9px;background:var(--card);display:grid;gap:4px;min-width:0}
      #start .v571b-badge.locked{opacity:.58}
      #start .v571b-badge-icon{font-size:21px}
      #start .v571b-badge strong{font-size:11px;line-height:1.25}
      #start .v571b-badge small{font-size:9px;color:var(--muted);line-height:1.35}
      #${TOAST_ID}{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(330px,calc(100vw - 36px));border:1px solid rgba(32,168,117,.38);border-radius:18px;padding:14px 15px;background:var(--card,#fff);box-shadow:0 18px 45px rgba(0,0,0,.18);display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;animation:v571b-pop .28s ease-out}
      #${TOAST_ID} .v571b-toast-icon{font-size:31px} #${TOAST_ID} strong{display:block;font-size:13px} #${TOAST_ID} span{display:block;font-size:11px;color:var(--muted);margin-top:2px}
      @keyframes v571b-pop{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
      html[data-theme="dark"] #start .v571b-streak-chip,html[data-theme="dark"] #start .v571b-streak-note{background:color-mix(in srgb,#8c4a13 18%,var(--card))}
      html[data-theme="dark"] #start #${CARD_ID}{background:linear-gradient(135deg,color-mix(in srgb,#167354 16%,var(--card)),var(--card))}
      @media(max-width:760px){#start .v571b-badge-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){#start #${CARD_ID}{grid-template-columns:48px minmax(0,1fr);padding:13px}#start .v571b-achievement-icon{width:48px;height:48px;border-radius:15px;font-size:24px}#start .v571b-badge-grid{grid-template-columns:1fr 1fr}}
      @media(prefers-reduced-motion:reduce){#${TOAST_ID}{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function dashboard(){
    return typeof document==='undefined' ? null : document.querySelector('#start .v40c3-home-dashboard');
  }

  function renderStreak(model){
    const card=document.getElementById('v571a-gamification-card');
    if (!card || !signedIn()) return false;
    const head=card.querySelector('.v571a-level-head');
    const main=card.querySelector('.v571a-level-main');
    const rules=card.querySelector('.v571a-rules');
    if (!head || !main) return false;

    let chip=card.querySelector('.v571b-streak-chip');
    if (!chip){ chip=document.createElement('span'); chip.className='v571b-streak-chip'; head.appendChild(chip); }
    chip.textContent=model.streak.current>0 ? `🔥 ${model.streak.current}-Day Streak` : '🔥 Start a Streak';
    chip.title=`Longest streak: ${model.streak.longest} day${model.streak.longest===1?'':'s'}`;

    let note=card.querySelector('.v571b-streak-note');
    if (!note){
      note=document.createElement('div');
      note.className='v571b-streak-note';
      if (rules) rules.insertAdjacentElement('beforebegin',note); else main.appendChild(note);
    }
    note.innerHTML=`<strong>${model.streak.current>0?`${model.streak.current}-day Practice streak`:'Build a Practice habit'}</strong><span>${html(streakMessage(model))}</span>`;
    return true;
  }

  function badgeMarkup(badge){
    const earned=badge.earned;
    const when=earned ? dateLabel(badge.earned_at) : '';
    return `<div class="v571b-badge ${earned?'earned':'locked'}" data-badge-id="${html(badge.id)}">
      <div class="v571b-badge-icon">${earned?html(badge.icon):'🔒'}</div>
      <strong>${html(badge.title)}</strong>
      <small>${earned && when?`Earned ${html(when)}`:html(badge.description)}</small>
    </div>`;
  }

  function renderAchievement(model){
    const root=dashboard();
    const anchor=root?.querySelector('.v57c-secondary');
    if (!root || !anchor || !signedIn()) return false;
    const latest=model.latest_badge;
    const total=model.badges.length;
    const earned=model.earned_count;

    let card=document.getElementById(CARD_ID);
    if (!card){
      card=document.createElement('article');
      card.id=CARD_ID;
      anchor.insertAdjacentElement('beforebegin',card);
    } else if (card.nextElementSibling!==anchor){
      anchor.insertAdjacentElement('beforebegin',card);
    }

    const latestDate=latest?.earned_at ? dateLabel(latest.earned_at) : '';
    card.innerHTML=`
      <div class="v571b-achievement-icon">${latest?html(latest.icon):'🏅'}</div>
      <div class="v571b-achievement-main">
        <div class="v571b-kicker">Latest Achievement</div>
        <h3>${latest?html(latest.title):'Your first badge is waiting'}</h3>
        <p>${latest?html(latest.description):'Complete Practice to start unlocking achievement badges.'}</p>
        <div class="v571b-achievement-meta">
          <span>${earned}/${total || 8} badges earned</span>
          <span>Longest streak ${model.streak.longest} day${model.streak.longest===1?'':'s'}</span>
          ${latestDate?`<span>Earned ${html(latestDate)}</span>`:''}
        </div>
      </div>
      <details class="v571b-achievements">
        <summary>View achievements ▾</summary>
        <div class="v571b-badge-grid">${model.badges.map(badgeMarkup).join('')}</div>
      </details>`;
    return true;
  }

  function maybeCelebrate(model){
    if (typeof window==='undefined') return;
    const badge=celebrationCandidate(model);
    if (!badge) return;
    const key=`v571b:${badge.id}:${badge.earned_at}`;
    try {
      if (window.sessionStorage.getItem(key)==='1') return;
      window.sessionStorage.setItem(key,'1');
    } catch {}
    document.getElementById(TOAST_ID)?.remove();
    const toast=document.createElement('div');
    toast.id=TOAST_ID;
    toast.setAttribute('role','status');
    toast.innerHTML=`<div class="v571b-toast-icon">${html(badge.icon)}</div><div><strong>Achievement unlocked! ${html(badge.title)}</strong><span>${html(badge.description)}</span></div>`;
    document.body.appendChild(toast);
    window.setTimeout(()=>toast.remove(),4800);
  }

  function render(payload){
    if (!signedIn()) return false;
    const model=normalizePayload(payload);
    const streakOk=renderStreak(model);
    const badgeOk=renderAchievement(model);
    if (!streakOk || !badgeOk) return false;
    maybeCelebrate(model);
    window.dispatchEvent(new CustomEvent('v571b:achievements-updated',{detail:{currentStreak:model.streak.current,earnedBadges:model.earned_count}}));
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
    if (!root?.querySelector('.v57c-continue-card') || !document.getElementById('v571a-gamification-card')) return false;
    if (!force && cached && lastLoadedAt && Date.now()-lastLoadedAt<CACHE_MS) return render(cached);

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
      console.warn('V5.7.1B streaks and achievements could not be refreshed.',error);
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
      if (!ok && attempt<28) scheduleLoad(force,attempt+1);
    },attempt?180:70);
  }

  function clear(){
    cached=null;
    lastLoadedAt=0;
    document.querySelector('.v571b-streak-chip')?.remove();
    document.querySelector('.v571b-streak-note')?.remove();
    document.getElementById(CARD_ID)?.remove();
    document.getElementById(TOAST_ID)?.remove();
  }

  function wire(){
    if (installed || typeof document==='undefined') return installed;
    injectStyles();
    installed=true;

    window.addEventListener('v571a:gamification-updated',()=>{
      if (cached) render(cached);
      scheduleLoad(false);
    });
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
    RPC_NAME,normalizeBadge,normalizePayload,streakMessage,celebrationCandidate,
    passivePracticeAccess,render,load,clear
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V571BStreaksAchievements',{value:api,writable:false,configurable:false});
    wire();
  }
})();
