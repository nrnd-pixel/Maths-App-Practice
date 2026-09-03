/* V5.7.2 — Student Weekly Missions.
   Adds three simple weekly Practice missions to the accepted gamified Home.
   Mission progress is derived server-side from saved non-Exam Practice evidence,
   resets every Monday in Asia/Brunei, and introduces no mission write path. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v572WeeklyMissionsInstalled) return;
  ROOT.__v572WeeklyMissionsInstalled = true;

  const RPC_NAME = 'get_student_weekly_missions_v572';
  const CARD_ID = 'v572-weekly-missions-card';
  const STYLE_ID = 'v572-weekly-missions-style';
  const TOAST_ID = 'v572-weekly-missions-toast';
  const CACHE_MS = 15000;

  let cached = null;
  let lastLoadedAt = 0;
  let loading = false;
  let retryTimer = 0;
  let installed = false;

  const trim = value => String(value ?? '').trim();
  const integer = value => Math.max(0,Math.round(Number(value)||0));
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function signedIn(){
    if (typeof document==='undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function passivePracticeAccess(){
    if (!signedIn()) return null;
    try {
      const fromB=ROOT.V571BStreaksAchievements?.passivePracticeAccess?.();
      if (fromB?.access_token) return fromB;
      const fromA=ROOT.V571AGamificationFoundation?.passivePracticeAccess?.();
      if (fromA?.access_token) return fromA;
      const fromHome=ROOT.V57CStudentContinueLearningHome?.passivePracticeAccess?.();
      if (fromHome?.access_token) return fromHome;
      const access=typeof activeStudentAccess!=='undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose!=='practice') return null;
      return access;
    } catch { return null; }
  }

  function normalizeMission(row){
    const target=Math.max(1,integer(row?.target || 1));
    const raw=integer(row?.raw_progress ?? row?.progress);
    const progress=Math.min(target,integer(row?.progress ?? raw));
    return Object.freeze({
      id:trim(row?.id) || 'mission',
      title:trim(row?.title) || 'Weekly Mission',
      description:trim(row?.description),
      icon:trim(row?.icon) || '⭐',
      progress,
      raw_progress:raw,
      target,
      unit:trim(row?.unit) || 'step',
      complete:row?.complete===true || raw>=target,
      action:trim(row?.action) || 'learn',
      assignment_completions:integer(row?.assignment_completions),
      past_paper_completions:integer(row?.past_paper_completions)
    });
  }

  function normalizePayload(payload){
    const missions=(Array.isArray(payload?.missions)?payload.missions:[]).map(normalizeMission);
    const completed=missions.filter(row=>row.complete).length;
    const total=missions.length || integer(payload?.summary?.total || 3);
    return Object.freeze({
      week:Object.freeze({
        start_date:trim(payload?.week?.start_date) || null,
        end_date:trim(payload?.week?.end_date) || null,
        today:trim(payload?.week?.today) || null,
        timezone:trim(payload?.week?.timezone) || 'Asia/Brunei'
      }),
      summary:Object.freeze({
        completed,
        total,
        all_complete:total>0 && completed>=total
      }),
      missions:Object.freeze(missions),
      rules:Object.freeze({
        question_target:Math.max(1,integer(payload?.rules?.question_target || 10)),
        practice_day_target:Math.max(1,integer(payload?.rules?.practice_day_target || 2)),
        meaningful_questions_per_day:Math.max(1,integer(payload?.rules?.meaningful_questions_per_day || 5)),
        challenge_target:Math.max(1,integer(payload?.rules?.challenge_target || 1)),
        week_starts:trim(payload?.rules?.week_starts) || 'Monday',
        timezone:trim(payload?.rules?.timezone) || 'Asia/Brunei',
        exam_activity_counts:payload?.rules?.exam_activity_counts===true
      })
    });
  }

  function progressPercent(mission){
    return clamp(Math.round(100*integer(mission?.progress)/Math.max(1,integer(mission?.target))),0,100);
  }

  function dateLabel(value){
    if (!value) return '';
    const date=new Date(`${value}T12:00:00+08:00`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString([],{day:'numeric',month:'short'});
  }

  function weekLabel(model){
    const start=dateLabel(model?.week?.start_date);
    const end=dateLabel(model?.week?.end_date);
    return start && end ? `${start} – ${end}` : 'This week';
  }

  function missionProgressText(mission){
    if (mission.complete) return 'Complete';
    const unit=mission.unit;
    const label=unit==='questions' ? 'questions' : unit==='days' ? 'days' : unit==='challenge' ? 'challenge' : unit;
    return `${mission.progress}/${mission.target} ${label}`;
  }

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #start #${CARD_ID}{border:1px solid color-mix(in srgb,#5f63dc 30%,var(--border));border-radius:19px;padding:15px 16px;background:linear-gradient(135deg,color-mix(in srgb,#f1f1ff 70%,var(--card)),var(--card));display:grid;gap:12px}
      #start .v572-mission-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #start .v572-kicker{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.06em;color:#5257c6}
      #start .v572-mission-head h3{margin:2px 0 0;font-size:19px;line-height:1.25}
      #start .v572-week-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
      #start .v572-week-meta span{font-size:10px;font-weight:850;padding:5px 8px;border-radius:999px;border:1px solid var(--border);background:var(--card)}
      #start .v572-overall{color:#5257c6!important;border-color:color-mix(in srgb,#5f63dc 35%,var(--border))!important}
      #start .v572-mission-list{display:grid;gap:8px}
      #start .v572-mission{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 11px;border:1px solid var(--border);border-radius:14px;background:var(--card)}
      #start .v572-mission.complete{border-color:color-mix(in srgb,#25a875 35%,var(--border));background:color-mix(in srgb,#ecfbf4 45%,var(--card))}
      #start .v572-mission-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,#edeefe 70%,var(--card));font-size:20px}
      #start .v572-mission.complete .v572-mission-icon{background:color-mix(in srgb,#dbf7e9 72%,var(--card))}
      #start .v572-mission-main{min-width:0;display:grid;gap:5px}
      #start .v572-mission-title{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      #start .v572-mission-title strong{font-size:12px}
      #start .v572-check{font-size:10px;font-weight:950;color:#16805d}
      #start .v572-mission-main p{margin:0;font-size:10px;line-height:1.4;color:var(--muted)}
      #start .v572-mini-progress{height:7px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--border) 72%,transparent)}
      #start .v572-mini-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#6268df,#8388ef);transition:width .3s ease}
      #start .v572-mission.complete .v572-mini-progress span{background:linear-gradient(90deg,#20a875,#3dc58f)}
      #start .v572-progress-text{font-size:10px;font-weight:900;white-space:nowrap;color:var(--muted)}
      #start .v572-mission-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:10px}
      #start .v572-mission-footer p{margin:0;font-size:10px;color:var(--muted);line-height:1.4}
      #start .v572-actions{display:flex;gap:7px;flex-wrap:wrap}
      #start .v572-actions button{border:1px solid var(--border);border-radius:10px;padding:7px 10px;background:var(--card);color:var(--text);font:inherit;font-size:10px;font-weight:900;cursor:pointer}
      #start .v572-actions button.primary{background:var(--primary);border-color:var(--primary);color:white}
      #${TOAST_ID}{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(330px,calc(100vw - 36px));border:1px solid rgba(95,99,220,.35);border-radius:18px;padding:14px 15px;background:var(--card,#fff);box-shadow:0 18px 45px rgba(0,0,0,.18);display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;animation:v572-pop .28s ease-out}
      #${TOAST_ID} .v572-toast-icon{font-size:31px} #${TOAST_ID} strong{display:block;font-size:13px} #${TOAST_ID} span{display:block;font-size:11px;color:var(--muted);margin-top:2px}
      @keyframes v572-pop{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
      html[data-theme="dark"] #start #${CARD_ID}{background:linear-gradient(135deg,color-mix(in srgb,#585fcf 14%,var(--card)),var(--card))}
      html[data-theme="dark"] #start .v572-mission.complete{background:color-mix(in srgb,#16805d 13%,var(--card))}
      @media(max-width:560px){#start .v572-mission{grid-template-columns:34px minmax(0,1fr);gap:9px}#start .v572-mission-icon{width:34px;height:34px}.v572-progress-text{grid-column:2;justify-self:start}#start .v572-week-meta{justify-content:flex-start}}
      @media(prefers-reduced-motion:reduce){#${TOAST_ID}{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function dashboard(){
    return typeof document==='undefined' ? null : document.querySelector('#start .v40c3-home-dashboard');
  }

  function missionMarkup(mission){
    const pct=progressPercent(mission);
    return `<div class="v572-mission ${mission.complete?'complete':''}" data-mission-id="${html(mission.id)}">
      <div class="v572-mission-icon">${mission.complete?'✅':html(mission.icon)}</div>
      <div class="v572-mission-main">
        <div class="v572-mission-title"><strong>${html(mission.title)}</strong>${mission.complete?'<span class="v572-check">MISSION COMPLETE</span>':''}</div>
        <p>${html(mission.description)}</p>
        <div class="v572-mini-progress" role="progressbar" aria-label="${html(mission.title)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
      </div>
      <div class="v572-progress-text">${html(missionProgressText(mission))}</div>
    </div>`;
  }

  function render(payload){
    if (!signedIn()) return false;
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    const model=normalizePayload(payload);
    const achievement=document.getElementById('v571b-latest-achievement');
    const fallback=root.querySelector('.v57c-secondary');
    const anchor=achievement || fallback;
    if (!anchor) return false;

    let card=document.getElementById(CARD_ID);
    if (!card){
      card=document.createElement('article');
      card.id=CARD_ID;
      anchor.insertAdjacentElement('beforebegin',card);
    } else if (card.nextElementSibling!==anchor){
      anchor.insertAdjacentElement('beforebegin',card);
    }

    const done=model.summary.completed;
    const total=model.summary.total || 3;
    const footer=model.summary.all_complete
      ? 'Excellent work — all three weekly missions are complete.'
      : `${total-done} mission${total-done===1?'':'s'} remaining. Missions reset every Monday.`;

    card.innerHTML=`
      <div class="v572-mission-head">
        <div><div class="v572-kicker">Weekly Missions</div><h3>${model.summary.all_complete?'🎉 Weekly missions complete!':'This Week\'s Missions'}</h3></div>
        <div class="v572-week-meta"><span>${html(weekLabel(model))}</span><span class="v572-overall">${done}/${total} complete</span></div>
      </div>
      <div class="v572-mission-list">${model.missions.map(missionMarkup).join('')}</div>
      <div class="v572-mission-footer">
        <p>${html(footer)}</p>
        <div class="v572-actions">
          <button type="button" data-v572-action="assignments">My Assignments</button>
          <button type="button" class="primary" data-v572-action="learn">Keep Practising</button>
        </div>
      </div>`;

    maybeCelebrate(model);
    window.dispatchEvent(new CustomEvent('v572:missions-updated',{detail:{completed:done,total,allComplete:model.summary.all_complete}}));
    return true;
  }

  function maybeCelebrate(model){
    if (!model?.summary?.all_complete || typeof window==='undefined') return;
    const key=`v572:all-complete:${model.week.start_date||'week'}`;
    try {
      if (window.sessionStorage.getItem(key)==='1') return;
      window.sessionStorage.setItem(key,'1');
    } catch {}
    document.getElementById(TOAST_ID)?.remove();
    const toast=document.createElement('div');
    toast.id=TOAST_ID;
    toast.setAttribute('role','status');
    toast.innerHTML='<div class="v572-toast-icon">🌟</div><div><strong>Weekly missions complete!</strong><span>Great work — you completed all three missions this week.</span></div>';
    document.body.appendChild(toast);
    window.setTimeout(()=>toast.remove(),4800);
  }

  function openLearn(){
    const learn=document.querySelector('[data-v40-nav="learn"]');
    if (learn){ learn.click(); return true; }
    document.getElementById('learn-btn')?.click?.();
    return true;
  }

  function openAssignments(){
    const button=document.getElementById('my-assignments-btn');
    if (button){ button.click(); return true; }
    return openLearn();
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
      console.warn('V5.7.2 weekly missions could not be refreshed.',error);
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
    },attempt?180:80);
  }

  function clear(){
    cached=null;
    lastLoadedAt=0;
    document.getElementById(CARD_ID)?.remove();
    document.getElementById(TOAST_ID)?.remove();
  }

  function wire(){
    if (installed || typeof document==='undefined') return installed;
    injectStyles();
    installed=true;

    window.addEventListener('v571b:achievements-updated',()=>{
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
      const action=event.target?.closest?.('[data-v572-action]')?.dataset?.v572Action;
      if (action==='learn'){ event.preventDefault(); openLearn(); }
      if (action==='assignments'){ event.preventDefault(); openAssignments(); }
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleLoad(true);
      if (event.target?.closest?.('#v40c-student-logout')) clear();
    },true);

    scheduleLoad(true);
    return true;
  }

  const api=Object.freeze({
    RPC_NAME,normalizeMission,normalizePayload,progressPercent,weekLabel,missionProgressText,
    passivePracticeAccess,render,load,clear,openLearn,openAssignments
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V572WeeklyMissions',{value:api,writable:false,configurable:false});
    wire();
  }
})();
