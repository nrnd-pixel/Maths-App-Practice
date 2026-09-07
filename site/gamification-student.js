/* Phase 4 Checkpoint 2 — consolidated student gamification.
   Coordinates XP/levels, streaks/achievements, weekly missions and the polished
   cooperative class challenge in one direct student lifecycle. Historical DOM
   contracts, V571A/B/V572 compatibility APIs and V571A/B/V572/V573 events remain
   available for downstream features. Supabase contracts are unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const CORE = (typeof module !== 'undefined' && module.exports)
    ? require('./gamification-core.js')
    : ROOT.GamificationCore;
  if (!CORE) throw new Error('gamification-core.js must load before gamification-student.js');

  if (typeof window !== 'undefined' && ROOT.__gamificationStudentInstalled) return;
  if (typeof window !== 'undefined') {
    ROOT.__gamificationStudentInstalled = true;
    // Historical checkpoint flags retained for V5.7.5 and downstream compatibility.
    ROOT.__v571aGamificationFoundationInstalled = true;
    ROOT.__v571bStreaksAchievementsInstalled = true;
    ROOT.__v572WeeklyMissionsInstalled = true;
  }

  const {RPC,IDS,LEVELS,html,integer,clamp,signedIn,dashboard,passivePracticeAccess}=CORE;
  const CACHE_MS = CORE.CACHE_MS;
  const CELEBRATION_WINDOW_MS = 10 * 60 * 1000;
  const FIRST_PRACTICE_BADGE_SELECTOR = '#v571b-latest-achievement .v571b-badge[data-badge-id="first_practice"]';

  const xpCache=CORE.createCache(CACHE_MS);
  const achievementsCache=CORE.createCache(CACHE_MS);
  const missionsCache=CORE.createCache(CACHE_MS);
  const classChallengeCache=CORE.createCache(CACHE_MS);
  let xpLoading=false;
  let achievementsLoading=false;
  let missionsLoading=false;
  let classChallengeLoading=false;
  let retryTimer=0;
  let installed=false;

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

  function renderXp(payload){
    const root=dashboard();
    const anchor=root?.querySelector('.v57c-continue-card');
    if (!root || !anchor || !signedIn()) return false;

    const model=CORE.normalizeXpPayload(payload);
    const {xp,level,rules}=model;
    const next=level.next_level_xp;
    const remaining=next==null ? 0 : Math.max(0,next-xp);
    const xpText=next==null ? `${xp} XP` : `${xp} / ${next} XP`;
    const note=next==null
      ? '<strong>Top starter level reached</strong><span>Keep practising to build your Maths record.</span>'
      : xp===0
        ? `<strong>Start earning XP</strong><span>${remaining} XP to Level ${level.number+1}.</span>`
        : `<strong>${remaining} XP to Level ${level.number+1}</strong><span>XP comes from verified Practice already saved in the app.</span>`;

    let card=document.getElementById(IDS.xpCard);
    if (!card){
      card=document.createElement('article');
      card.id=IDS.xpCard;
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('v571a:gamification-updated',{detail:{xp,level:level.number}}));
    }
    return true;
  }

  function renderStreak(model){
    const card=document.getElementById(IDS.xpCard);
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
    const when=earned ? CORE.dateLabel(badge.earned_at) : '';
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

    let card=document.getElementById(IDS.achievementCard);
    if (!card){
      card=document.createElement('article');
      card.id=IDS.achievementCard;
      anchor.insertAdjacentElement('beforebegin',card);
    } else if (card.nextElementSibling!==anchor){
      anchor.insertAdjacentElement('beforebegin',card);
    }

    const latestDate=latest?.earned_at ? CORE.dateLabel(latest.earned_at) : '';
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

  function maybeCelebrateAchievement(model){
    if (typeof window==='undefined') return;
    const badge=celebrationCandidate(model);
    if (!badge) return;
    const key=`v571b:${badge.id}:${badge.earned_at}`;
    try {
      if (window.sessionStorage.getItem(key)==='1') return;
      window.sessionStorage.setItem(key,'1');
    } catch {}
    document.getElementById(IDS.achievementToast)?.remove();
    const toast=document.createElement('div');
    toast.id=IDS.achievementToast;
    toast.setAttribute('role','status');
    toast.innerHTML=`<div class="v571b-toast-icon">${html(badge.icon)}</div><div><strong>Achievement unlocked! ${html(badge.title)}</strong><span>${html(badge.description)}</span></div>`;
    document.body.appendChild(toast);
    window.setTimeout(()=>toast.remove(),4800);
  }

  function renderAchievements(payload){
    if (!signedIn()) return false;
    const model=CORE.normalizeAchievementsPayload(payload);
    const streakOk=renderStreak(model);
    const badgeOk=renderAchievement(model);
    if (!streakOk || !badgeOk) return false;
    maybeCelebrateAchievement(model);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('v571b:achievements-updated',{detail:{currentStreak:model.streak.current,earnedBadges:model.earned_count}}));
    }
    return true;
  }

  function progressPercent(mission){
    return clamp(Math.round(100*integer(mission?.progress)/Math.max(1,integer(mission?.target))),0,100);
  }

  function missionProgressText(mission){
    if (mission.complete) return 'Complete';
    const unit=mission.unit;
    const label=unit==='questions' ? 'questions' : unit==='days' ? 'days' : unit==='challenge' ? 'challenge' : unit;
    return `${mission.progress}/${mission.target} ${label}`;
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

  function maybeCelebrateMissions(model){
    if (!model?.summary?.all_complete || typeof window==='undefined') return;
    const key=`v572:all-complete:${model.week.start_date||'week'}`;
    try {
      if (window.sessionStorage.getItem(key)==='1') return;
      window.sessionStorage.setItem(key,'1');
    } catch {}
    document.getElementById(IDS.missionsToast)?.remove();
    const toast=document.createElement('div');
    toast.id=IDS.missionsToast;
    toast.setAttribute('role','status');
    toast.innerHTML='<div class="v572-toast-icon">🌟</div><div><strong>Weekly missions complete!</strong><span>Great work — you completed all three missions this week.</span></div>';
    document.body.appendChild(toast);
    window.setTimeout(()=>toast.remove(),4800);
  }

  function renderMissions(payload){
    if (!signedIn()) return false;
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    const model=CORE.normalizeMissionsPayload(payload);
    const achievement=document.getElementById(IDS.achievementCard);
    const fallback=root.querySelector('.v57c-secondary');
    const anchor=achievement || fallback;
    if (!anchor) return false;

    let card=document.getElementById(IDS.missionsCard);
    if (!card){
      card=document.createElement('article');
      card.id=IDS.missionsCard;
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
        <div class="v572-week-meta"><span>${html(CORE.weekLabel(model))}</span><span class="v572-overall">${done}/${total} complete</span></div>
      </div>
      <div class="v572-mission-list">${model.missions.map(missionMarkup).join('')}</div>
      <div class="v572-mission-footer">
        <p>${html(footer)}</p>
        <div class="v572-actions">
          <button type="button" data-v572-action="assignments">My Assignments</button>
          <button type="button" class="primary" data-v572-action="learn">Keep Practising</button>
        </div>
      </div>`;

    maybeCelebrateMissions(model);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('v572:missions-updated',{detail:{completed:done,total,allComplete:model.summary.all_complete}}));
    }
    return true;
  }

  function maybeCelebrateClassChallenge(model){
    if (!model?.challenge?.complete || typeof window==='undefined') return;
    const key=`v574:class-complete:${model.class.class_id}:${model.week.start_date||'week'}`;
    try {
      if (window.sessionStorage.getItem(key)==='1') return;
      window.sessionStorage.setItem(key,'1');
    } catch {}
    document.getElementById(IDS.classChallengeToast)?.remove();
    const toast=document.createElement('div');
    toast.id=IDS.classChallengeToast;
    toast.setAttribute('role','status');
    toast.innerHTML='<div class="v574-toast-icon">🎉</div><div><strong>Class challenge complete!</strong><span>Great teamwork — your class reached this week\'s Practice target.</span></div>';
    document.body.appendChild(toast);
    window.setTimeout(()=>toast.remove(),5000);
  }

  function emitClassChallengeCompatibility(model){
    if (typeof window==='undefined') return;
    const c=model.challenge;
    window.dispatchEvent(new CustomEvent('v573:class-challenge-updated',{
      detail:{complete:c.complete,progress:c.progress_percent,questions:c.questions_completed,target:c.target_questions}
    }));
  }

  function renderClassChallenge(payload){
    if (!signedIn()) return false;
    const model=CORE.normalizeClassChallengeV574(payload);
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    document.documentElement.classList.add('v574-class-challenge-ready');

    let card=document.getElementById(IDS.classChallengeCard);
    if (!model.challenge.enabled){
      card?.remove();
      emitClassChallengeCompatibility(model);
      return true;
    }

    const missions=document.getElementById(IDS.missionsCard);
    const achievement=document.getElementById(IDS.achievementCard);
    const fallback=root.querySelector('.v57c-secondary');
    const anchor=missions || achievement || fallback;
    if (!anchor) return false;
    if (!card){ card=document.createElement('article'); card.id=IDS.classChallengeCard; }
    if (missions){
      if (missions.nextElementSibling!==card) missions.insertAdjacentElement('afterend',card);
    } else if (card.nextElementSibling!==anchor){
      anchor.insertAdjacentElement('beforebegin',card);
    }

    const c=model.challenge;
    const remaining=Math.max(0,c.target_questions-c.questions_completed);
    const classLabel=model.class.year_level?`${model.class.class_name} · Year ${model.class.year_level}`:model.class.class_name;
    const footer=c.complete
      ? `Target reached! ${c.contributors} classmates contributed this week.`
      : `${remaining} question${remaining===1?'':'s'} to go. ${c.contributors} of ${model.class.active_students} classmates have contributed so far.`;

    card.innerHTML=`
      <div class="v574-challenge-head">
        <div><div class="v574-kicker">Cooperative Class Challenge</div><h3>${c.complete?'🎉':'🤝'} ${html(model.class.class_name)} Class Question Quest</h3><p>${html(classLabel)} · Work together — no student rankings.</p></div>
        <span class="v574-week">${html(CORE.weekLabel(model))}</span>
      </div>
      <div class="v574-progress-head"><strong>${c.questions_completed} / ${c.target_questions} Practice questions</strong><span class="v574-phase">${html(CORE.phaseLabel(model))} · ${c.progress_percent}%</span></div>
      <div class="v574-bar" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.progress_percent}"><span style="width:${c.progress_percent}%"></span></div>
      <div class="v574-milestones"><span>Start</span><span>25%</span><span>50%</span><span>Goal</span></div>
      <div class="v574-foot"><p>${html(footer)} Current target: ${model.settings.questions_per_active_student} questions × each active student.</p><button type="button" data-v574-action="learn">Keep Practising</button></div>`;

    maybeCelebrateClassChallenge(model);
    emitClassChallengeCompatibility(model);
    return true;
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

  async function rpc(name,token){
    const {data,error}=await cloud.rpc(name,{p_access_token:token});
    if (error) throw error;
    return data || {};
  }

  async function loadXp(force=false){
    if (xpLoading || !signedIn()) return false;
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    if (!force && xpCache.isFresh()) return renderXp(xpCache.peek());
    const access=passivePracticeAccess();
    if (!access?.access_token) return false;
    xpLoading=true;
    try {
      const data=await rpc(RPC.xp,access.access_token);
      if (!signedIn()) return false;
      xpCache.set(data);
      return renderXp(data);
    } catch(error){
      console.warn('V5.7.1A gamification summary could not be refreshed.',error);
      return xpCache.peek() ? renderXp(xpCache.peek()) : false;
    } finally { xpLoading=false; }
  }

  async function loadAchievements(force=false){
    if (achievementsLoading || !signedIn()) return false;
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card') || !document.getElementById(IDS.xpCard)) return false;
    if (!force && achievementsCache.isFresh()) return renderAchievements(achievementsCache.peek());
    const access=passivePracticeAccess();
    if (!access?.access_token) return false;
    achievementsLoading=true;
    try {
      const data=await rpc(RPC.achievements,access.access_token);
      if (!signedIn()) return false;
      achievementsCache.set(data);
      return renderAchievements(data);
    } catch(error){
      console.warn('V5.7.1B streaks and achievements could not be refreshed.',error);
      return achievementsCache.peek() ? renderAchievements(achievementsCache.peek()) : false;
    } finally { achievementsLoading=false; }
  }

  async function loadMissions(force=false){
    if (missionsLoading || !signedIn()) return false;
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    if (!force && missionsCache.isFresh()) return renderMissions(missionsCache.peek());
    const access=passivePracticeAccess();
    if (!access?.access_token) return false;
    missionsLoading=true;
    try {
      const data=await rpc(RPC.missions,access.access_token);
      if (!signedIn()) return false;
      missionsCache.set(data);
      return renderMissions(data);
    } catch(error){
      console.warn('V5.7.2 weekly missions could not be refreshed.',error);
      return missionsCache.peek() ? renderMissions(missionsCache.peek()) : false;
    } finally { missionsLoading=false; }
  }

  async function loadClassChallenge(force=false){
    if (classChallengeLoading || !signedIn()) return false;
    const root=dashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    if (!force && classChallengeCache.isFresh()) return renderClassChallenge(classChallengeCache.peek());
    const access=passivePracticeAccess();
    if (!access?.access_token) return false;
    classChallengeLoading=true;
    try {
      // V574 wraps the V573 student RPC and returns the same aggregate evidence plus
      // the teacher-configurable challenge state, so one request replaces both layers.
      const data=await rpc(RPC.classChallengeV574,access.access_token);
      if (!signedIn()) return false;
      classChallengeCache.set(data);
      return renderClassChallenge(data);
    } catch(error){
      console.warn('V5.7.4 class challenge could not be refreshed.',error);
      return classChallengeCache.peek() ? renderClassChallenge(classChallengeCache.peek()) : false;
    } finally { classChallengeLoading=false; }
  }

  // Direct orchestration replaces the former V571A -> V571B -> V572 -> V573/V574
  // listener/patch chain. The legacy events are outputs only, not internal triggers.
  async function refresh(force=false){
    if (!signedIn()) return false;
    const xpOk=await loadXp(force);
    if (!xpOk) return false;
    const achievementsOk=await loadAchievements(force);
    if (!achievementsOk) return false;
    const missionsOk=await loadMissions(force);
    if (!missionsOk) return false;
    return loadClassChallenge(force);
  }

  function renderCached(){
    const xp=xpCache.peek();
    const achievements=achievementsCache.peek();
    const missions=missionsCache.peek();
    const classChallenge=classChallengeCache.peek();
    let ok=false;
    if (xp) ok=renderXp(xp) || ok;
    if (achievements && document.getElementById(IDS.xpCard)) ok=renderAchievements(achievements) || ok;
    if (missions) ok=renderMissions(missions) || ok;
    if (classChallenge) ok=renderClassChallenge(classChallenge) || ok;
    return ok;
  }

  function scheduleRefresh(force=false,attempt=0){
    if (typeof window==='undefined') return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer=window.setTimeout(async()=>{
      retryTimer=0;
      if (!signedIn()) return;
      const ok=await refresh(force);
      if (!ok && attempt<28) scheduleRefresh(force,attempt+1);
    },attempt?180:70);
  }

  function clearXp(){
    xpCache.clear();
    document.getElementById(IDS.xpCard)?.remove();
  }

  function clearAchievements(){
    achievementsCache.clear();
    document.querySelector('.v571b-streak-chip')?.remove();
    document.querySelector('.v571b-streak-note')?.remove();
    document.getElementById(IDS.achievementCard)?.remove();
    document.getElementById(IDS.achievementToast)?.remove();
  }

  function clearMissions(){
    missionsCache.clear();
    document.getElementById(IDS.missionsCard)?.remove();
    document.getElementById(IDS.missionsToast)?.remove();
  }

  function clearClassChallenge(){
    classChallengeCache.clear();
    document.getElementById(IDS.classChallengeCard)?.remove();
    document.getElementById(IDS.classChallengeToast)?.remove();
    document.documentElement?.classList?.remove('v574-class-challenge-ready');
  }

  function clear(){
    clearClassChallenge();
    clearMissions();
    clearAchievements();
    clearXp();
  }

  function hasFirstPracticeAchievement(){
    if (typeof document==='undefined') return false;
    return !!document.querySelector(FIRST_PRACTICE_BADGE_SELECTOR)?.classList.contains('earned');
  }

  function wire(){
    if (installed || typeof document==='undefined') return installed;
    CORE.injectStyles();
    installed=true;

    window.addEventListener('v57c:home-updated',()=>{
      renderCached();
      scheduleRefresh(true);
    });
    window.addEventListener('pageshow',()=>{ if (signedIn()) scheduleRefresh(false); });
    window.addEventListener('focus',()=>{
      if (signedIn() && document.getElementById('start')?.classList.contains('active')) scheduleRefresh(false);
    });
    document.addEventListener('click',event=>{
      const missionAction=event.target?.closest?.('[data-v572-action]')?.dataset?.v572Action;
      if (missionAction==='learn'){ event.preventDefault(); openLearn(); }
      if (missionAction==='assignments'){ event.preventDefault(); openAssignments(); }
      if (event.target?.closest?.('[data-v574-action="learn"]')){ event.preventDefault(); openLearn(); }
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleRefresh(true);
      if (event.target?.closest?.('#v40c-student-logout')) clear();
    },true);

    scheduleRefresh(true);
    return true;
  }

  const xpApi=Object.freeze({
    RPC_NAME:RPC.xp,LEVELS,levelForXp:CORE.levelForXp,normalizePayload:CORE.normalizeXpPayload,
    passivePracticeAccess,render:renderXp,load:loadXp,clear:clearXp
  });
  const achievementsApi=Object.freeze({
    RPC_NAME:RPC.achievements,normalizeBadge:CORE.normalizeBadge,normalizePayload:CORE.normalizeAchievementsPayload,
    streakMessage,celebrationCandidate,passivePracticeAccess,render:renderAchievements,load:loadAchievements,clear:clearAchievements
  });
  const missionsApi=Object.freeze({
    RPC_NAME:RPC.missions,normalizeMission:CORE.normalizeMission,normalizePayload:CORE.normalizeMissionsPayload,
    progressPercent,weekLabel:CORE.weekLabel,missionProgressText,passivePracticeAccess,
    render:renderMissions,load:loadMissions,clear:clearMissions,openLearn,openAssignments
  });
  const classChallengeApi=Object.freeze({
    RPC_NAME:RPC.classChallengeV574,
    RPC_V573:RPC.classChallengeV573,
    normalize:CORE.normalizeClassChallengeV574,
    normalizeV573:CORE.normalizeClassChallengeV573,
    phaseLabel:CORE.phaseLabel,
    weekLabel:CORE.weekLabel,
    passivePracticeAccess,
    render:renderClassChallenge,
    load:loadClassChallenge,
    clear:clearClassChallenge,
    openLearn
  });
  const api=Object.freeze({
    FIRST_PRACTICE_BADGE_SELECTOR,xp:xpApi,achievements:achievementsApi,missions:missionsApi,
    classChallenge:classChallengeApi,passivePracticeAccess,refresh,renderCached,clear,
    hasFirstPracticeAchievement,openLearn,openAssignments
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'GamificationStudent',{value:api,writable:false,configurable:false});
    // Preserve the public APIs retained from Checkpoint 1.
    Object.defineProperty(window,'V571AGamificationFoundation',{value:xpApi,writable:false,configurable:false});
    Object.defineProperty(window,'V571BStreaksAchievements',{value:achievementsApi,writable:false,configurable:false});
    Object.defineProperty(window,'V572WeeklyMissions',{value:missionsApi,writable:false,configurable:false});
    wire();
  }
})();
