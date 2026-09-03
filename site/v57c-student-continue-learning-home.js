/* V5.7C — Student Continue Learning Home.
   Makes the signed-in Home dashboard Practice-first and action-oriented by surfacing
   cross-device Past Paper resume, teacher Practice assignments, recommended Practice
   and the latest Practice result. Uses the existing temporary Practice access ticket;
   no Exam access, grading authority, answer keys or student write path is added. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57cStudentContinueLearningHomeInstalled) return;
  ROOT.__v57cStudentContinueLearningHomeInstalled = true;

  const STYLE_ID = 'v57c-student-continue-learning-style';
  const DASHBOARD_SELECTOR = '#start .v40c3-home-dashboard';
  const CACHE_MS = 15000;
  let lastLoadedAt = 0;
  let loading = false;
  let renderBusy = false;
  let installDone = false;
  let retryTimer = 0;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function passivePracticeAccess(){
    if (!signedIn()) return null;
    try {
      const fromV57A = ROOT.V57ACrossDevicePastPaperResume?.passivePracticeAccess?.();
      if (fromV57A?.access_token) return fromV57A;
      const access = typeof activeStudentAccess !== 'undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose !== 'practice') return null;
      return access;
    } catch { return null; }
  }

  function checkpointRows(value){
    if (value instanceof Map) return [...value.values()];
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.checkpoints)) return value.checkpoints;
    return [];
  }

  function validCheckpoint(row){
    const total = Array.isArray(row?.questionIds) ? row.questionIds.length : 0;
    const done = Math.max(0,Number(row?.nextIndex)||0);
    return Number(row?.examYear)>0 && !!trim(row?.paper) && total>0 && done<total;
  }

  function selectCheckpoint(rows){
    return checkpointRows(rows)
      .filter(validCheckpoint)
      .sort((a,b)=>Date.parse(b?.savedAt||0)-Date.parse(a?.savedAt||0))[0] || null;
  }

  function assignmentDueRank(row,now=Date.now()){
    const due = Date.parse(row?.closes_at || '');
    if (!Number.isFinite(due)) return Number.MAX_SAFE_INTEGER;
    return Math.max(0,due-now);
  }

  function selectAssignment(rows,now=Date.now()){
    const assignments = (Array.isArray(rows)?rows:[]).filter(row=>norm(row?.status)!=='completed');
    const rank = row => {
      const status = norm(row?.status);
      const timing = norm(row?.timing_status);
      if (status==='in_progress' && timing!=='upcoming') return 0;
      if (timing==='due_passed') return 1;
      if (timing==='active') return 2;
      return 3;
    };
    return assignments.sort((a,b)=>rank(a)-rank(b) || assignmentDueRank(a,now)-assignmentDueRank(b,now) || Date.parse(b?.created_at||0)-Date.parse(a?.created_at||0))[0] || null;
  }

  function recommendationTitle(rec){
    if (!rec || Number(rec.recommended_count||0)<1) return '';
    if (norm(rec.practice_scope)==='topic' && trim(rec.focus_topic)) return trim(rec.focus_topic);
    if (norm(rec.practice_scope)==='strand' && trim(rec.focus_strand)) return trim(rec.focus_strand);
    return 'Mixed Practice';
  }

  function recentPractice(progress){
    return (Array.isArray(progress?.recent)?progress.recent:[])
      .filter(row=>norm(row?.mode)==='practice')
      .sort((a,b)=>Date.parse(b?.completed_at||0)-Date.parse(a?.completed_at||0))[0] || null;
  }

  function dueLabel(value,now=Date.now()){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = date.toLocaleDateString([],{day:'numeric',month:'short'});
    return date.getTime()<now ? `Overdue · ${day}` : `Due ${day}`;
  }

  function savedLabel(value){
    if (!value) return 'Saved recently';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Saved recently';
    return `Saved ${date.toLocaleDateString([],{day:'numeric',month:'short'})}`;
  }

  function chooseContinuePriority(model,now=Date.now()){
    const checkpoint = selectCheckpoint(model?.checkpoints);
    if (checkpoint){
      const total = checkpoint.questionIds.length;
      const done = Math.max(0,Math.min(total,Number(checkpoint.nextIndex)||0));
      return {
        kind:'checkpoint',
        icon:'☁',
        title:`Continue ${Number(checkpoint.examYear)} · ${trim(checkpoint.paper)}`,
        text:`Pick up your saved Past Paper Practice from question ${Math.min(total,done+1)}. Your progress is available on your other signed-in devices too.`,
        action:'Continue Practice',
        meta:[`${done}/${total} completed`,savedLabel(checkpoint.savedAt),checkpoint.assignmentContext?'Teacher assignment':'Saved across devices'].filter(Boolean),
        checkpoint
      };
    }

    const assignment = selectAssignment(model?.assignments,now);
    if (assignment && norm(assignment.timing_status)!=='upcoming'){
      const status = norm(assignment.status);
      const overdue = norm(assignment.timing_status)==='due_passed';
      const paper = assignment.assignment_type==='past_paper'
        ? `${Number(assignment.exam_year)} · ${trim(assignment.paper)}`
        : trim(assignment.topic || assignment.strand || 'Practice');
      return {
        kind:'assignment',
        icon:overdue?'⏰':'📚',
        title:`${status==='in_progress'?'Continue':overdue?'Check':'Start'} ${paper}`,
        text:overdue
          ? 'This teacher assignment has passed its target due date. Open it to review its status and next action.'
          : status==='in_progress'
            ? 'Your teacher assignment is already in progress. Continue it before starting optional Practice.'
            : 'Your teacher has Practice ready for you. Complete assigned work before optional Practice.',
        action:status==='in_progress'?'Continue Assignment':'Open Assignment',
        meta:[status==='in_progress'?'In progress':'Teacher assignment',dueLabel(assignment.closes_at,now)].filter(Boolean),
        assignment
      };
    }

    const rec = model?.recommendation || {};
    if (Number(rec.recommended_count||0)>0){
      const title = recommendationTitle(rec);
      const pct = Number(rec.performance_percent);
      return {
        kind:'recommendation',
        icon:'🌱',
        title:title==='Mixed Practice'?'Start Mixed Practice':`Strengthen ${title}`,
        text:norm(rec.reason)==='needs_attention'
          ? `A short focused set in ${title} is your strongest next learning step.`
          : norm(rec.reason)==='developing'
            ? `Keep building ${title} with a short focused Practice set.`
            : 'A short Practice set will keep your learning moving forward.',
        action:'Start Recommended Practice',
        meta:[`${Number(rec.recommended_count)} questions`,Number.isFinite(pct)?`${Math.round(pct)}% current performance`:null].filter(Boolean),
        recommendation:rec
      };
    }

    return {
      kind:'learn',icon:'✏️',title:'Choose your next Maths activity',
      text:'Open Learn to choose Mixed, Topic or Past Paper Practice.',
      action:'Open Learn',meta:[]
    };
  }

  function assignmentSummary(rows,now=Date.now()){
    const assignments = Array.isArray(rows)?rows:[];
    const incomplete = assignments.filter(row=>norm(row?.status)!=='completed');
    const overdue = incomplete.filter(row=>norm(row?.timing_status)==='due_passed').length;
    const active = incomplete.filter(row=>norm(row?.timing_status)==='active').length;
    const upcoming = incomplete.filter(row=>norm(row?.timing_status)==='upcoming').length;
    const completed = assignments.filter(row=>norm(row?.status)==='completed').length;
    return {total:assignments.length,incomplete:incomplete.length,overdue,active,upcoming,completed,now};
  }

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #start .v40c3-home-dashboard.v57c-ready{display:grid;gap:12px}
      #start .v57c-continue-card{border:1px solid color-mix(in srgb,var(--primary) 42%,var(--border));border-radius:20px;padding:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--soft) 62%,var(--card)),var(--card));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}
      #start .v57c-kicker{font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:var(--primary);margin-bottom:5px}
      #start .v57c-continue-card h2{margin:0 0 5px;font-size:clamp(19px,2.7vw,26px);line-height:1.25}
      #start .v57c-continue-card p{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
      #start .v57c-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
      #start .v57c-meta span{display:inline-flex;align-items:center;min-height:29px;padding:5px 8px;border:1px solid var(--border);border-radius:999px;background:var(--card);font-size:11px;font-weight:800}
      #start .v57c-primary{min-width:190px;min-height:49px}
      #start .v57c-home-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      #start .v57c-mini-card{border:1px solid var(--border);border-radius:16px;padding:14px;background:var(--card);display:grid;gap:7px;min-width:0}
      #start .v57c-mini-card .v57c-mini-kicker{font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
      #start .v57c-mini-card strong{font-size:16px;line-height:1.3}
      #start .v57c-mini-card p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}
      #start .v57c-mini-card button{justify-self:start;min-height:36px;padding:7px 10px;font-size:11px;margin-top:auto}
      #start .v57c-recent-metrics{display:flex;gap:7px;flex-wrap:wrap}
      #start .v57c-recent-metrics span{font-size:11px;font-weight:800}
      #start .v57c-secondary{display:flex;gap:8px;flex-wrap:wrap}
      #start .v57c-secondary button{min-height:38px;padding:7px 11px;font-size:12px}
      html[data-theme="dark"] #start .v57c-continue-card{background:linear-gradient(135deg,color-mix(in srgb,var(--soft) 24%,var(--card)),var(--card))}
      @media(max-width:820px){#start .v57c-home-grid{grid-template-columns:1fr 1fr}#start .v57c-home-grid .v57c-mini-card:last-child{grid-column:1/-1}}
      @media(max-width:680px){#start .v57c-continue-card{grid-template-columns:1fr}#start .v57c-primary{width:100%;min-width:0}}
      @media(max-width:520px){#start .v57c-home-grid{grid-template-columns:1fr}#start .v57c-home-grid .v57c-mini-card:last-child{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function dashboard(){ return typeof document==='undefined'?null:document.querySelector(DASHBOARD_SELECTOR); }

  function openLearn(){
    const button=document.querySelector('#start .v40c-open-learn');
    if (button){ button.click(); return; }
    const start=document.getElementById('start');
    if (start) start.dataset.v40StartView='learn';
    document.querySelector('#start .v40c-learn-setup')?.scrollIntoView?.({behavior:'smooth',block:'start'});
  }

  function openAssignments(){ document.getElementById('my-assignments-btn')?.click(); }
  function openProgress(){ document.getElementById('my-progress-btn')?.click(); }

  function openResult(code){
    if (!code) return;
    try { if (typeof openStudentReview==='function'){ openStudentReview(code); return; } } catch {}
    const input=document.getElementById('review-code');
    if (input) input.value=code;
    document.getElementById('check-reviewed-btn')?.click();
  }

  async function startRecommendation(rec){
    if (!rec || Number(rec.recommended_count||0)<1){ openLearn(); return; }
    try {
      if (typeof studentPracticeRecommendationV35 !== 'undefined' && typeof startRecommendedPracticeV35==='function'){
        studentPracticeRecommendationV35=rec;
        await startRecommendedPracticeV35();
        return;
      }
    } catch(error){ console.warn('V5.7C recommended Practice could not start.',error); }
    openProgress();
  }

  async function runPriority(priority,button){
    if (!priority) return;
    const original=button?.textContent;
    if (button) button.disabled=true;
    try {
      if (priority.kind==='checkpoint'){
        if (typeof show==='function') show('start');
        const api=ROOT.V57ACrossDevicePastPaperResume;
        if (!api?.restoreFromServer) throw new Error('Saved Practice resume is not ready.');
        const ok=await api.restoreFromServer(priority.checkpoint);
        if (!ok) openLearn();
        return;
      }
      if (priority.kind==='assignment'){ openAssignments(); return; }
      if (priority.kind==='recommendation'){ await startRecommendation(priority.recommendation); return; }
      openLearn();
    } catch(error){
      console.warn('V5.7C priority action could not be completed.',error);
      if (typeof window!=='undefined') window.alert(error?.message || 'This learning activity could not be opened.');
    } finally {
      if (button && document.contains(button)){ button.disabled=false; button.textContent=original; }
    }
  }

  function render(model){
    const root=dashboard();
    if (!root) return false;
    const now=Date.now();
    const priority=chooseContinuePriority(model,now);
    const assignmentStats=assignmentSummary(model?.assignments,now);
    const rec=model?.recommendation || {};
    const recTitle=recommendationTitle(rec) || 'Mixed Practice';
    const recent=recentPractice(model?.progress);
    const mastery=Number(recent?.mastery_percent);
    const first=Number(recent?.first_try_percent);
    const recentDate=recent?.completed_at ? new Date(recent.completed_at) : null;
    const recentWhen=recentDate && !Number.isNaN(recentDate.getTime()) ? recentDate.toLocaleDateString([],{day:'numeric',month:'short'}) : '';
    const student=model?.progress?.student || model?.student || {};

    renderBusy=true;
    root.innerHTML=`
      <article class="v57c-continue-card" data-v57c-kind="${html(priority.kind)}">
        <div>
          <div class="v57c-kicker">Continue Learning</div>
          <h2>${html(priority.icon)} ${html(priority.title)}</h2>
          <p>${html(priority.text)}</p>
          ${priority.meta.length?`<div class="v57c-meta">${priority.meta.map(item=>`<span>${html(item)}</span>`).join('')}</div>`:''}
        </div>
        <button type="button" class="primary v57c-primary">${html(priority.action)}</button>
      </article>
      <div class="v57c-home-grid">
        <article class="v57c-mini-card">
          <div class="v57c-mini-kicker">Teacher work</div>
          <strong>${assignmentStats.incomplete?`${assignmentStats.incomplete} assignment${assignmentStats.incomplete===1?'':'s'} to check`:'All caught up'}</strong>
          <p>${assignmentStats.overdue?`${assignmentStats.overdue} overdue. `:''}${assignmentStats.active?`${assignmentStats.active} currently available.`:assignmentStats.upcoming?`${assignmentStats.upcoming} upcoming.`:'No active teacher Practice right now.'}</p>
          <button type="button" class="outline v57c-assignments">My Assignments</button>
        </article>
        <article class="v57c-mini-card">
          <div class="v57c-mini-kicker">Recommended next</div>
          <strong>${html(recTitle)}</strong>
          <p>${Number(rec.recommended_count||0)>0?`${Number(rec.recommended_count)} questions selected from your current learning evidence.`:'Complete some Practice and recommendations will appear here.'}</p>
          <button type="button" class="outline v57c-recommend" ${Number(rec.recommended_count||0)>0?'':'disabled'}>Practice Recommendation</button>
        </article>
        <article class="v57c-mini-card">
          <div class="v57c-mini-kicker">Recent Practice</div>
          <strong>${recent?html(recent.title||'Practice result'):'No completed Practice yet'}</strong>
          ${recent?`<div class="v57c-recent-metrics"><span>First try ${Number.isFinite(first)?`${Math.round(first)}%`:'—'}</span><span>Mastery ${Number.isFinite(mastery)?`${Math.round(mastery)}%`:'—'}</span></div><p>${recentWhen?`Completed ${html(recentWhen)}.`:''}</p>`:'<p>Your latest completed Practice result will appear here.</p>'}
          ${recent?.result_code?'<button type="button" class="outline v57c-result">View Result</button>':'<button type="button" class="outline v57c-progress">My Progress</button>'}
        </article>
      </div>
      <div class="v57c-secondary">
        <button type="button" class="outline v57c-learn">Open Learn</button>
        <button type="button" class="outline v57c-progress">My Progress</button>
      </div>`;
    root.classList.add('v40c3-ready','v57c-ready');
    root.dataset.v57cRendered='true';
    renderBusy=false;

    root.querySelector('.v57c-primary')?.addEventListener('click',event=>runPriority(priority,event.currentTarget));
    root.querySelector('.v57c-assignments')?.addEventListener('click',openAssignments);
    root.querySelector('.v57c-recommend')?.addEventListener('click',()=>startRecommendation(rec));
    root.querySelector('.v57c-result')?.addEventListener('click',()=>openResult(recent?.result_code));
    root.querySelectorAll('.v57c-progress').forEach(button=>button.addEventListener('click',openProgress));
    root.querySelector('.v57c-learn')?.addEventListener('click',openLearn);

    const hero=document.querySelector('#start .v40-learning-hub-hero');
    const heading=hero?.querySelector('h2');
    const paragraph=hero?.querySelector('p');
    if (heading && student?.student_name) heading.textContent=`Welcome back, ${student.student_name}.`;
    if (paragraph) paragraph.textContent='Continue where you left off, complete teacher work, or follow your recommended Practice.';
    window.dispatchEvent(new CustomEvent('v57c:home-updated',{detail:{kind:priority.kind}}));
    return true;
  }

  async function rpc(name,token){
    const {data,error}=await cloud.rpc(name,{p_access_token:token});
    if (error) throw error;
    return data || {};
  }

  async function load(force=false){
    if (loading || !signedIn()) return false;
    const root=dashboard();
    if (!root) return false;
    if (!force && lastLoadedAt && Date.now()-lastLoadedAt<CACHE_MS && root.dataset.v57cRendered==='true') return true;
    const access=passivePracticeAccess();
    if (!access?.access_token) return false;

    loading=true;
    try {
      const results=await Promise.allSettled([
        rpc('get_student_practice_assignments_v56b',access.access_token),
        rpc('get_student_past_paper_checkpoints_v57a',access.access_token),
        rpc('get_student_learning_dashboard',access.access_token),
        rpc('get_student_practice_recommendation',access.access_token)
      ]);
      if (!signedIn()) return false;
      const value=index=>results[index].status==='fulfilled'?results[index].value:{};
      if (results.every(result=>result.status==='rejected')) throw new Error('Continue Learning data is unavailable.');
      const assignmentsData=value(0);
      const checkpointsData=value(1);
      const progress=value(2);
      const recommendation=value(3);
      render({
        student:progress?.student || assignmentsData?.student || checkpointsData?.student || {},
        assignments:Array.isArray(assignmentsData?.assignments)?assignmentsData.assignments:[],
        checkpoints:checkpointRows(checkpointsData),
        progress,
        recommendation
      });
      lastLoadedAt=Date.now();
      return true;
    } catch(error){
      console.warn('V5.7C Continue Learning Home could not be refreshed.',error);
      return false;
    } finally { loading=false; }
  }

  function scheduleLoad(force=false,attempt=0){
    if (typeof window==='undefined') return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryTimer=window.setTimeout(async()=>{
      retryTimer=0;
      if (!signedIn()) return;
      const ok=await load(force);
      if (!ok && attempt<20) scheduleLoad(force,attempt+1);
    },attempt?220:90);
  }

  function watchDashboard(){
    const root=dashboard();
    if (!root || root.dataset.v57cWatch==='true' || typeof MutationObserver==='undefined') return;
    root.dataset.v57cWatch='true';
    new MutationObserver(()=>{
      if (renderBusy || !signedIn()) return;
      if (!root.querySelector('.v57c-continue-card')){
        root.dataset.v57cRendered='false';
        scheduleLoad(true);
      }
    }).observe(root,{childList:true,subtree:false});
  }

  function watchSession(){
    const panel=document.querySelector('#start .v40c-session-panel');
    if (!panel || panel.dataset.v57cWatch==='true' || typeof MutationObserver==='undefined') return;
    panel.dataset.v57cWatch='true';
    new MutationObserver(()=>{
      lastLoadedAt=0;
      if (signedIn()) scheduleLoad(true);
      else {
        const root=dashboard();
        if (root){ root.dataset.v57cRendered='false'; root.classList.remove('v57c-ready'); }
      }
    }).observe(panel,{attributes:true,attributeFilter:['class']});
  }

  function wire(){
    if (typeof document==='undefined') return false;
    injectStyles();
    watchDashboard();
    watchSession();
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')){
        lastLoadedAt=0;
        scheduleLoad(true);
      }
      if (event.target?.closest?.('#my-assignments-btn,#my-progress-btn')) lastLoadedAt=0;
      if (event.target?.closest?.('#v40c-student-logout')) lastLoadedAt=0;
    },true);
    window.addEventListener('v57a:checkpoints-updated',()=>{ lastLoadedAt=0; scheduleLoad(true); });
    window.addEventListener('pageshow',()=>{ if (signedIn()) scheduleLoad(true); });
    window.addEventListener('focus',()=>{
      if (signedIn() && document.getElementById('start')?.classList.contains('active')) scheduleLoad(false);
    });
    if (signedIn()) scheduleLoad(true);
    return true;
  }

  function install(){
    if (installDone) return true;
    const root=dashboard();
    if (!root) return false;
    installDone=wire();
    return installDone;
  }

  function scheduleInstall(){
    if (typeof window==='undefined' || typeof document==='undefined') return;
    let tries=0;
    const run=()=>{
      tries+=1;
      if (install() || tries>=160) return;
      window.setTimeout(run,100);
    };
    run();
  }

  const api=Object.freeze({
    checkpointRows,validCheckpoint,selectCheckpoint,assignmentDueRank,selectAssignment,
    recommendationTitle,recentPractice,dueLabel,chooseContinuePriority,assignmentSummary,
    passivePracticeAccess,load,render
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V57CStudentContinueLearningHome',{value:api,writable:false,configurable:false});
    scheduleInstall();
  }
})();
