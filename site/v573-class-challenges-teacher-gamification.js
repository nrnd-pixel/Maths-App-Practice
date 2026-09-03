/* V5.7.3 — Cooperative Class Challenge + Teacher Gamification View.
   Students see aggregate class progress only; teachers get an alphabetical,
   read-only class motivation view. No leaderboard, Exam activity or gamification
   write path is introduced. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v573ClassChallengesTeacherGamificationInstalled) return;
  ROOT.__v573ClassChallengesTeacherGamificationInstalled = true;

  const RPC_STUDENT = 'get_student_class_challenge_v573';
  const RPC_TEACHER = 'get_teacher_class_gamification_v573';
  const STUDENT_CARD_ID = 'v573-class-challenge-card';
  const TEACHER_TRIGGER_ID = 'v573-open-class-motivation';
  const TEACHER_OVERLAY_ID = 'v573-class-motivation-overlay';
  const TEACHER_CLASS_ID = 'v573-teacher-class';
  const TEACHER_CONTENT_ID = 'v573-teacher-content';
  const STYLE_ID = 'v573-gamification-style';
  const CACHE_MS = 15000;

  let studentCache = null;
  let studentLoadedAt = 0;
  let studentLoading = false;
  let studentRetry = 0;
  let teacherData = null;
  let teacherLoading = false;
  let teacherFilter = 'all';
  let teacherReturnFocus = null;
  let previousOverflow = '';
  let installed = false;

  const trim = value => String(value ?? '').trim();
  const integer = value => Math.max(0,Math.round(Number(value)||0));
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function normalizeChallenge(payload){
    const activeStudents=integer(payload?.class?.active_students ?? payload?.challenge?.active_students);
    const questions=integer(payload?.challenge?.questions_completed);
    const target=Math.max(1,integer(payload?.challenge?.target_questions || Math.max(10,activeStudents*10)));
    const contributors=integer(payload?.challenge?.contributors);
    const percent=clamp(integer(payload?.challenge?.progress_percent ?? Math.round(100*questions/target)),0,100);
    return Object.freeze({
      class:Object.freeze({
        class_id:trim(payload?.class?.class_id),
        class_name:trim(payload?.class?.class_name) || 'Your class',
        year_level:integer(payload?.class?.year_level),
        active_students:activeStudents
      }),
      week:Object.freeze({
        start_date:trim(payload?.week?.start_date) || null,
        end_date:trim(payload?.week?.end_date) || null,
        today:trim(payload?.week?.today) || null,
        timezone:trim(payload?.week?.timezone) || 'Asia/Brunei'
      }),
      challenge:Object.freeze({
        title:trim(payload?.challenge?.title) || 'Class Question Quest',
        description:trim(payload?.challenge?.description) || 'Work together to complete Practice questions this week.',
        questions_completed:questions,
        target_questions:target,
        contributors,
        progress_percent:percent,
        complete:payload?.challenge?.complete===true || questions>=target
      }),
      rules:Object.freeze({
        questions_per_active_student:Math.max(1,integer(payload?.rules?.questions_per_active_student || 10)),
        week_starts:trim(payload?.rules?.week_starts) || 'Monday',
        timezone:trim(payload?.rules?.timezone) || 'Asia/Brunei',
        exam_activity_counts:payload?.rules?.exam_activity_counts===true,
        student_rankings:payload?.rules?.student_rankings===true
      })
    });
  }

  function normalizeTeacherStudent(row){
    return Object.freeze({
      roster_student_id:trim(row?.roster_student_id),
      student_id:trim(row?.student_id),
      student_name:trim(row?.student_name) || 'Student',
      xp_total:integer(row?.xp_total),
      level_number:Math.max(1,integer(row?.level_number || 1)),
      level_title:trim(row?.level_title) || 'Maths Starter',
      current_streak:integer(row?.current_streak),
      weekly_questions:integer(row?.weekly_questions),
      weekly_practice_days:integer(row?.weekly_practice_days),
      weekly_challenges:integer(row?.weekly_challenges),
      missions_completed:clamp(integer(row?.missions_completed),0,3),
      all_missions_complete:row?.all_missions_complete===true || integer(row?.missions_completed)>=3
    });
  }

  function normalizeTeacherPayload(payload){
    const challenge=normalizeChallenge(payload);
    const students=(Array.isArray(payload?.students)?payload.students:[]).map(normalizeTeacherStudent)
      .sort((a,b)=>a.student_name.localeCompare(b.student_name,undefined,{numeric:true,sensitivity:'base'}) || a.student_id.localeCompare(b.student_id,undefined,{numeric:true,sensitivity:'base'}));
    const summary=payload?.summary || {};
    return Object.freeze({
      class:challenge.class,
      week:challenge.week,
      challenge:challenge.challenge,
      summary:Object.freeze({
        active_students:integer(summary.active_students ?? students.length),
        active_this_week:integer(summary.active_this_week),
        all_missions_complete:integer(summary.all_missions_complete),
        active_streaks:integer(summary.active_streaks),
        average_xp:integer(summary.average_xp),
        level_distribution:Object.freeze({...summary.level_distribution})
      }),
      students:Object.freeze(students),
      rules:challenge.rules
    });
  }

  function teacherRowsForFilter(model,filter=teacherFilter){
    const rows=Array.from(model?.students || []);
    if (filter==='nudge') return rows.filter(row=>row.weekly_questions===0 && row.weekly_challenges===0);
    if (filter==='active') return rows.filter(row=>row.weekly_questions>0 || row.weekly_challenges>0);
    if (filter==='missions') return rows.filter(row=>row.all_missions_complete);
    return rows;
  }

  function studentSignedIn(){
    if (typeof document==='undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function passivePracticeAccess(){
    if (!studentSignedIn()) return null;
    try {
      const fromMissions=ROOT.V572WeeklyMissions?.passivePracticeAccess?.();
      if (fromMissions?.access_token) return fromMissions;
      const fromBadges=ROOT.V571BStreaksAchievements?.passivePracticeAccess?.();
      if (fromBadges?.access_token) return fromBadges;
      const access=typeof activeStudentAccess!=='undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose!=='practice') return null;
      return access;
    } catch { return null; }
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

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #start #${STUDENT_CARD_ID}{border:1px solid color-mix(in srgb,#14a0a8 34%,var(--border));border-radius:19px;padding:15px 16px;background:linear-gradient(135deg,color-mix(in srgb,#e9fbfb 66%,var(--card)),var(--card));display:grid;gap:11px}
      #start .v573-student-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap}
      #start .v573-kicker{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.06em;color:#0c7f86}
      #start .v573-student-head h3{margin:2px 0 2px;font-size:18px;line-height:1.3}
      #start .v573-student-head p{margin:0;color:var(--muted);font-size:10px;line-height:1.4}
      #start .v573-week{font-size:10px;font-weight:850;padding:5px 8px;border:1px solid var(--border);border-radius:999px;background:var(--card)}
      #start .v573-class-progress{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
      #start .v573-class-progress strong{font-size:13px}.v573-class-progress span{font-size:10px;color:var(--muted);font-weight:850}
      #start .v573-bar{grid-column:1/-1;height:10px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--border) 72%,transparent)}
      #start .v573-bar>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#16a0a8,#36c0a8);transition:width .3s ease}
      #start .v573-student-foot{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:9px}
      #start .v573-student-foot p{margin:0;font-size:10px;color:var(--muted)}
      #start .v573-student-foot button{border:1px solid var(--primary);border-radius:10px;padding:7px 10px;background:var(--primary);color:white;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
      html[data-theme="dark"] #start #${STUDENT_CARD_ID}{background:linear-gradient(135deg,color-mix(in srgb,#15969d 13%,var(--card)),var(--card))}

      #${TEACHER_TRIGGER_ID}{white-space:nowrap}
      #${TEACHER_OVERLAY_ID}{position:fixed;inset:0;z-index:128;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${TEACHER_OVERLAY_ID}.hidden{display:none!important}
      #${TEACHER_OVERLAY_ID} .v573-sheet{width:min(1180px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:22px}
      #${TEACHER_OVERLAY_ID} .v573-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
      #${TEACHER_OVERLAY_ID} .v573-head h2{margin:0 0 4px;font-size:24px}
      #${TEACHER_OVERLAY_ID} .v573-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
      #${TEACHER_OVERLAY_ID} .v573-head-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #${TEACHER_OVERLAY_ID} .v573-controls{display:grid;grid-template-columns:minmax(210px,.8fr) auto;gap:10px;align-items:end;margin:16px 0}
      #${TEACHER_OVERLAY_ID} .v573-controls label{margin:0}
      #${TEACHER_OVERLAY_ID} .v573-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:12px 0}
      #${TEACHER_OVERLAY_ID} .v573-stat{border:1px solid var(--border);border-radius:13px;padding:11px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${TEACHER_OVERLAY_ID} .v573-stat strong{display:block;font-size:21px;margin-bottom:3px}
      #${TEACHER_OVERLAY_ID} .v573-stat span{font-size:10px;color:var(--muted);line-height:1.3}
      #${TEACHER_OVERLAY_ID} .v573-class-challenge{border:1px solid color-mix(in srgb,#14a0a8 35%,var(--border));border-radius:15px;padding:13px 14px;background:color-mix(in srgb,#e9fbfb 45%,var(--card));display:grid;gap:8px}
      #${TEACHER_OVERLAY_ID} .v573-class-challenge-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}
      #${TEACHER_OVERLAY_ID} .v573-class-challenge h3{margin:0;font-size:16px}
      #${TEACHER_OVERLAY_ID} .v573-class-challenge p{margin:0;color:var(--muted);font-size:10px}
      #${TEACHER_OVERLAY_ID} .v573-filters{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0 8px}
      #${TEACHER_OVERLAY_ID} .v573-filter{min-height:34px;padding:6px 10px;font-size:11px;border:1px solid var(--border);background:var(--card)}
      #${TEACHER_OVERLAY_ID} .v573-filter[aria-pressed="true"]{border-color:var(--primary);color:var(--primary);background:color-mix(in srgb,var(--soft) 40%,var(--card))}
      #${TEACHER_OVERLAY_ID} .v573-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:13px}
      #${TEACHER_OVERLAY_ID} table{width:100%;border-collapse:collapse;background:var(--card)}
      #${TEACHER_OVERLAY_ID} th,#${TEACHER_OVERLAY_ID} td{padding:9px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle;font-size:11px;white-space:nowrap}
      #${TEACHER_OVERLAY_ID} th{background:color-mix(in srgb,var(--soft) 35%,var(--card));color:var(--muted);font-size:10px}
      #${TEACHER_OVERLAY_ID} td.v573-name{white-space:normal;min-width:170px}
      #${TEACHER_OVERLAY_ID} tr.v573-nudge td{background:color-mix(in srgb,#fff7e8 35%,var(--card))}
      #${TEACHER_OVERLAY_ID} .v573-pill{display:inline-block;padding:3px 7px;border:1px solid var(--border);border-radius:999px;font-size:9px;font-weight:900}
      #${TEACHER_OVERLAY_ID} .v573-mission-ok{color:#147a58;border-color:color-mix(in srgb,#25a875 35%,var(--border))}
      #${TEACHER_OVERLAY_ID} .v573-empty,#${TEACHER_OVERLAY_ID} .v573-loading{padding:22px;text-align:center;color:var(--muted);font-size:12px}
      #${TEACHER_OVERLAY_ID} .v573-note{margin:9px 0 0;color:var(--muted);font-size:10px;line-height:1.45}
      html[data-theme="dark"] #${TEACHER_OVERLAY_ID} .v573-class-challenge{background:color-mix(in srgb,#15969d 12%,var(--card))}
      @media(max-width:900px){#${TEACHER_OVERLAY_ID} .v573-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:650px){#${TEACHER_OVERLAY_ID}{padding:8px}#${TEACHER_OVERLAY_ID} .v573-sheet{padding:15px;border-radius:16px}#${TEACHER_OVERLAY_ID} .v573-controls{grid-template-columns:1fr}#${TEACHER_OVERLAY_ID} .v573-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function studentDashboard(){
    return typeof document==='undefined' ? null : document.querySelector('#start .v40c3-home-dashboard');
  }

  function renderStudent(payload){
    if (!studentSignedIn()) return false;
    const root=studentDashboard();
    if (!root?.querySelector('.v57c-continue-card')) return false;
    const model=normalizeChallenge(payload);
    const missions=document.getElementById('v572-weekly-missions-card');
    const achievement=document.getElementById('v571b-latest-achievement');
    const fallback=root.querySelector('.v57c-secondary');
    if (!missions && !achievement && !fallback) return false;

    let card=document.getElementById(STUDENT_CARD_ID);
    if (!card){ card=document.createElement('article'); card.id=STUDENT_CARD_ID; }
    if (missions){
      if (missions.nextElementSibling!==card) missions.insertAdjacentElement('afterend',card);
    } else {
      const anchor=achievement || fallback;
      if (card.nextElementSibling!==anchor) anchor.insertAdjacentElement('beforebegin',card);
    }

    const c=model.challenge;
    const classLabel=model.class.year_level ? `${model.class.class_name} · Year ${model.class.year_level}` : model.class.class_name;
    const remaining=Math.max(0,c.target_questions-c.questions_completed);
    const footer=c.complete
      ? 'Class challenge complete — great teamwork!'
      : `${remaining} question${remaining===1?'':'s'} to go. Every Practice question helps your class.`;

    card.innerHTML=`
      <div class="v573-student-head">
        <div><div class="v573-kicker">Class Challenge</div><h3>${c.complete?'🎉':'🤝'} ${html(model.class.class_name)} Class Question Quest</h3><p>${html(classLabel)} · Cooperative challenge — no student rankings.</p></div>
        <span class="v573-week">${html(weekLabel(model))}</span>
      </div>
      <div class="v573-class-progress">
        <strong>${c.questions_completed} / ${c.target_questions} Practice questions</strong>
        <span>${c.progress_percent}%</span>
        <div class="v573-bar" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.progress_percent}"><span style="width:${c.progress_percent}%"></span></div>
      </div>
      <div class="v573-student-foot"><p>${html(footer)} ${c.contributors} of ${model.class.active_students} students have contributed questions this week.</p><button type="button" data-v573-action="learn">Keep Practising</button></div>`;

    window.dispatchEvent(new CustomEvent('v573:class-challenge-updated',{detail:{complete:c.complete,progress:c.progress_percent,questions:c.questions_completed,target:c.target_questions}}));
    return true;
  }

  async function studentRpc(token){
    const {data,error}=await cloud.rpc(RPC_STUDENT,{p_access_token:token});
    if (error) throw error;
    return data || {};
  }

  async function loadStudent(force=false){
    if (studentLoading || !studentSignedIn()) return false;
    if (!force && studentCache && studentLoadedAt && Date.now()-studentLoadedAt<CACHE_MS) return renderStudent(studentCache);
    const access=passivePracticeAccess();
    if (!access?.access_token) return false;
    studentLoading=true;
    try {
      const data=await studentRpc(access.access_token);
      if (!studentSignedIn()) return false;
      studentCache=data;
      studentLoadedAt=Date.now();
      return renderStudent(data);
    } catch(error){
      console.warn('V5.7.3 class challenge could not be refreshed.',error);
      return studentCache ? renderStudent(studentCache) : false;
    } finally { studentLoading=false; }
  }

  function scheduleStudent(force=false,attempt=0){
    if (typeof window==='undefined') return;
    if (studentRetry) clearTimeout(studentRetry);
    studentRetry=setTimeout(async()=>{
      studentRetry=0;
      if (!studentSignedIn()) return;
      const ok=await loadStudent(force);
      if (!ok && attempt<28) scheduleStudent(force,attempt+1);
    },attempt?180:80);
  }

  function openLearn(){
    if (ROOT.V572WeeklyMissions?.openLearn) return ROOT.V572WeeklyMissions.openLearn();
    const learn=document.querySelector('[data-v40-nav="learn"]');
    if (learn){ learn.click(); return true; }
    document.getElementById('learn-btn')?.click?.();
    return true;
  }

  function currentTeacherClasses(){
    try {
      return Array.isArray(teacherClasses)
        ? teacherClasses.filter(row=>row?.active!==false).slice().sort((a,b)=>Number(a.year_level)-Number(b.year_level) || trim(a.name).localeCompare(trim(b.name),undefined,{numeric:true}))
        : [];
    } catch { return []; }
  }

  function preferredTeacherClassId(){
    try {
      if (selectedClassId && currentTeacherClasses().some(row=>String(row.id)===String(selectedClassId))) return String(selectedClassId);
    } catch {}
    const pastPaper=document.getElementById('v56d-class');
    if (pastPaper?.value && currentTeacherClasses().some(row=>String(row.id)===String(pastPaper.value))) return String(pastPaper.value);
    return String(currentTeacherClasses()[0]?.id || '');
  }

  function ensureTeacherTrigger(){
    if (typeof document==='undefined' || document.getElementById(TEACHER_TRIGGER_ID)) return false;
    const exportButton=document.getElementById('export-analytics');
    if (!exportButton) return false;
    const button=document.createElement('button');
    button.id=TEACHER_TRIGGER_ID;
    button.type='button';
    button.className='secondary';
    button.textContent='🎮 Class Motivation';
    button.addEventListener('click',openTeacher);
    const pastPaper=document.getElementById('v56d-open-past-paper-analytics');
    (pastPaper || exportButton).insertAdjacentElement('beforebegin',button);
    return true;
  }

  function ensureTeacherOverlay(){
    if (typeof document==='undefined') return null;
    let overlay=document.getElementById(TEACHER_OVERLAY_ID);
    if (overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id=TEACHER_OVERLAY_ID;
    overlay.className='hidden';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','v573-teacher-title');
    overlay.innerHTML=`<div class="v573-sheet">
      <div class="v573-head">
        <div><h2 id="v573-teacher-title">🎮 Class Motivation</h2><p>XP, streaks, weekly missions and the cooperative class challenge. Students are shown alphabetically — there is no leaderboard.</p></div>
        <div class="v573-head-actions"><span class="tag">V5.7.3</span><button type="button" class="outline" id="v573-teacher-close">Close</button></div>
      </div>
      <div class="v573-controls">
        <label>Class<select id="${TEACHER_CLASS_ID}"></select></label>
        <button type="button" class="secondary" id="v573-teacher-refresh">Refresh</button>
      </div>
      <div id="${TEACHER_CONTENT_ID}"><div class="v573-loading">Choose a class.</div></div>
    </div>`;
    document.body.appendChild(overlay);
    document.getElementById('v573-teacher-close')?.addEventListener('click',closeTeacher);
    document.getElementById('v573-teacher-refresh')?.addEventListener('click',()=>loadTeacher(true));
    document.getElementById(TEACHER_CLASS_ID)?.addEventListener('change',()=>loadTeacher(true));
    overlay.addEventListener('click',event=>{ if (event.target===overlay) closeTeacher(); });
    overlay.addEventListener('keydown',event=>{ if (event.key==='Escape'){ event.preventDefault(); closeTeacher(); } });
    return overlay;
  }

  function populateTeacherClasses(){
    const select=document.getElementById(TEACHER_CLASS_ID);
    if (!select) return;
    const classes=currentTeacherClasses();
    const preferred=select.value || preferredTeacherClassId();
    select.innerHTML=classes.length
      ? classes.map(row=>`<option value="${html(row.id)}">${html(row.name)} · Year ${Number(row.year_level)||''}</option>`).join('')
      : '<option value="">No active classes</option>';
    if (classes.some(row=>String(row.id)===String(preferred))) select.value=String(preferred);
  }

  function teacherFilterButton(id,label,count){
    const pressed=teacherFilter===id;
    return `<button type="button" class="v573-filter" data-v573-filter="${id}" aria-pressed="${pressed?'true':'false'}">${html(label)}${Number.isFinite(count)?` · ${count}`:''}</button>`;
  }

  function renderTeacher(payload){
    teacherData=normalizeTeacherPayload(payload);
    const model=teacherData;
    const content=document.getElementById(TEACHER_CONTENT_ID);
    if (!content) return false;
    const c=model.challenge;
    const nudge=model.students.filter(row=>row.weekly_questions===0 && row.weekly_challenges===0).length;
    const active=model.students.filter(row=>row.weekly_questions>0 || row.weekly_challenges>0).length;
    const missions=model.students.filter(row=>row.all_missions_complete).length;
    const rows=teacherRowsForFilter(model);

    content.innerHTML=`
      <div class="v573-class-challenge">
        <div class="v573-class-challenge-head"><div><div class="v573-kicker">Cooperative Class Challenge</div><h3>${c.complete?'🎉 ': '🤝 '}${html(model.class.class_name)} · Class Question Quest</h3></div><strong>${c.questions_completed} / ${c.target_questions} questions · ${c.progress_percent}%</strong></div>
        <div class="v573-bar" role="progressbar" aria-label="Class challenge progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.progress_percent}"><span style="width:${c.progress_percent}%"></span></div>
        <p>${c.contributors} of ${model.summary.active_students} students have contributed questions this week. Target = 10 questions × each active student.</p>
      </div>
      <div class="v573-summary">
        <div class="v573-stat"><strong>${model.summary.active_this_week}/${model.summary.active_students}</strong><span>Students active this week</span></div>
        <div class="v573-stat"><strong>${model.summary.all_missions_complete}</strong><span>Completed all 3 weekly missions</span></div>
        <div class="v573-stat"><strong>${model.summary.active_streaks}</strong><span>Students with an active streak</span></div>
        <div class="v573-stat"><strong>${model.summary.average_xp}</strong><span>Average class XP</span></div>
        <div class="v573-stat"><strong>${c.contributors}</strong><span>Class challenge contributors</span></div>
      </div>
      <div class="v573-filters">
        ${teacherFilterButton('all','All students',model.students.length)}
        ${teacherFilterButton('nudge','Needs a nudge',nudge)}
        ${teacherFilterButton('active','Active this week',active)}
        ${teacherFilterButton('missions','All missions complete',missions)}
      </div>
      ${rows.length ? `<div class="v573-tablewrap"><table>
        <thead><tr><th>Student</th><th>XP</th><th>Level</th><th>Streak</th><th>Questions this week</th><th>Practice days</th><th>Weekly missions</th></tr></thead>
        <tbody>${rows.map(row=>`<tr class="${row.weekly_questions===0 && row.weekly_challenges===0?'v573-nudge':''}">
          <td class="v573-name"><strong>${html(row.student_name)}</strong><div class="help">${html(row.student_id)}</div></td>
          <td>${row.xp_total}</td>
          <td>Level ${row.level_number} · ${html(row.level_title)}</td>
          <td>${row.current_streak>0?`🔥 ${row.current_streak}`:'—'}</td>
          <td>${row.weekly_questions}</td>
          <td>${row.weekly_practice_days}</td>
          <td><span class="v573-pill ${row.all_missions_complete?'v573-mission-ok':''}">${row.missions_completed}/3${row.all_missions_complete?' ✓':''}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<div class="v573-empty">No students match this filter.</div>'}
      <p class="v573-note">Motivation data is read-only and based on saved Practice evidence. Exam activity is excluded. This view intentionally avoids ranking students against one another.</p>`;
    return true;
  }

  async function teacherRpc(classId){
    if (!classId) throw new Error('Choose a class.');
    if (typeof cloud==='undefined' || !cloud?.rpc) throw new Error('Teacher connection is not ready.');
    const {data,error}=await cloud.rpc(RPC_TEACHER,{p_class_id:classId});
    if (error) throw error;
    return data || {};
  }

  async function loadTeacher(force=false){
    if (teacherLoading) return false;
    const classId=document.getElementById(TEACHER_CLASS_ID)?.value || '';
    const content=document.getElementById(TEACHER_CONTENT_ID);
    if (!classId || !content) return false;
    teacherLoading=true;
    content.innerHTML='<div class="v573-loading">Loading class motivation…</div>';
    try {
      const data=await teacherRpc(classId);
      teacherFilter=force ? 'all' : teacherFilter;
      return renderTeacher(data);
    } catch(error){
      content.innerHTML=`<div class="v573-empty">${html(error?.message || 'Class motivation could not be loaded.')}</div>`;
      return false;
    } finally { teacherLoading=false; }
  }

  function openTeacher(){
    const overlay=ensureTeacherOverlay();
    if (!overlay) return false;
    teacherReturnFocus=document.activeElement;
    populateTeacherClasses();
    teacherFilter='all';
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    overlay.classList.remove('hidden');
    loadTeacher(true);
    setTimeout(()=>document.getElementById(TEACHER_CLASS_ID)?.focus(),0);
    return true;
  }

  function closeTeacher(){
    const overlay=document.getElementById(TEACHER_OVERLAY_ID);
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.style.overflow=previousOverflow;
    teacherReturnFocus?.focus?.();
    teacherReturnFocus=null;
  }

  function clearStudent(){
    studentCache=null;
    studentLoadedAt=0;
    document.getElementById(STUDENT_CARD_ID)?.remove();
  }

  function wire(){
    if (installed || typeof document==='undefined') return installed;
    injectStyles();
    installed=true;
    ensureTeacherTrigger();

    window.addEventListener('v572:missions-updated',()=>scheduleStudent(false));
    window.addEventListener('v57c:home-updated',()=>scheduleStudent(true));
    window.addEventListener('pageshow',()=>{ if (studentSignedIn()) scheduleStudent(false); });
    window.addEventListener('focus',()=>{ if (studentSignedIn() && document.getElementById('start')?.classList.contains('active')) scheduleStudent(false); });

    document.addEventListener('click',event=>{
      if (event.target?.closest?.('[data-v573-action="learn"]')){ event.preventDefault(); openLearn(); }
      const filter=event.target?.closest?.('[data-v573-filter]')?.dataset?.v573Filter;
      if (filter){ event.preventDefault(); teacherFilter=filter; if (teacherData) renderTeacher(teacherData); }
      if (event.target?.closest?.('[data-v40-nav="home"],.back-home')) scheduleStudent(true);
      if (event.target?.closest?.('#v40c-student-logout')) clearStudent();
    },true);

    new MutationObserver(()=>ensureTeacherTrigger()).observe(document.body,{childList:true,subtree:true});
    scheduleStudent(true);
    return true;
  }

  const api=Object.freeze({
    RPC_STUDENT,RPC_TEACHER,normalizeChallenge,normalizeTeacherStudent,normalizeTeacherPayload,
    teacherRowsForFilter,passivePracticeAccess,weekLabel,renderStudent,loadStudent,renderTeacher,
    openTeacher,closeTeacher,openLearn
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V573ClassChallengesTeacherGamification',{value:api,writable:false,configurable:false});
    wire();
  }
})();
