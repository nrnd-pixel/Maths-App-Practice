/* V5.6B — Teacher-assigned Past Paper Practice.
   Extends the established secure Practice Assignment workflow with a Past Paper target.
   Teacher recipients, student assignment visibility and completion remain server-enforced.
   Past-paper sessions reuse the accepted V5.5A-D Practice engine, including same-device
   resume, Practice feedback and result attribution. Exam Mode is not changed. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v56bTeacherAssignedPastPaperPracticeInstalled) return;
  ROOT.__v56bTeacherAssignedPastPaperPracticeInstalled = true;

  const SECTION_ID = 'v56b-past-paper-assignment-admin';
  const STYLE_ID = 'v56b-past-paper-assignment-style';
  const CONTEXT_KEY = 'mathPastPaperAssignmentV56B';
  const CONTEXT_VERSION = 1;
  const CONTEXT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  const RPC_MAP = Object.freeze({
    get_student_practice_assignments:'get_student_practice_assignments_v56b',
    get_student_practice_assignments_v53d1:'get_student_practice_assignments_v56b',
    start_student_practice_assignment:'start_student_practice_assignment_v56b',
    start_student_practice_assignment_v53d1:'start_student_practice_assignment_v56b',
    complete_student_practice_assignment:'complete_student_practice_assignment_v56b',
    complete_student_practice_assignment_v53d1:'complete_student_practice_assignment_v56b'
  });

  let teacherAssignments = [];
  let teacherAttempts = [];
  let teacherRecipients = [];
  let currentTeacherPaperLibrary = [];
  let teacherRefreshBusy = false;
  let rpcWrapped = false;
  let recommendedWrapped = false;
  let resultCompletionBusy = false;
  let studentMeta = null;
  const studentAssignments = new Map();
  const lastStartByAssignment = new Map();

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const compact = value => norm(value).replace(/\s+/g,'');
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function isPastPaperAssignment(row){
    return norm(row?.assignment_type) === 'past_paper';
  }

  function paperKey(examYear,paper){
    return `${Number(examYear)||0}|${norm(paper)}`;
  }

  function logicalQuestionKey(row){
    try {
      const fn = ROOT.V53D1TeacherPracticePoolAlignment?.logicalQuestionKey;
      if (typeof fn === 'function') return String(fn(row) || '');
    } catch {}
    const parent = trim(row?.parent_question_number);
    if (!parent) return `single|${trim(row?.id)}`;
    const examYear = trim(row?.exam_year);
    const paper = compact(row?.paper);
    if (examYear && paper) return `group|exam|${examYear}|${paper}|${compact(parent)}`;
    return `group|resource|${norm(row?.source_type || 'unknown')}|${norm(row?.source || 'unknown')}|${compact(parent)}`;
  }

  function derivePaperLibrary(rows,yearLevel){
    const groups = new Map();
    for (const row of Array.from(rows || [])){
      if (row?.practice_eligible !== true) continue;
      if (norm(row?.source_type) !== 'past_paper') continue;
      if (Number(yearLevel || 0) && Number(row?.year_level) !== Number(yearLevel)) continue;
      const examYear = Number(row?.exam_year || 0);
      const paper = trim(row?.paper);
      if (!examYear || !paper) continue;
      const key = paperKey(examYear,paper);
      if (!groups.has(key)) groups.set(key,{key,exam_year:examYear,paper,logical:new Set(),physical_rows:0});
      const entry = groups.get(key);
      entry.physical_rows += 1;
      entry.logical.add(logicalQuestionKey(row));
    }
    return [...groups.values()].map(entry => ({
      key:entry.key,
      exam_year:entry.exam_year,
      paper:entry.paper,
      logical_questions:[...entry.logical].filter(Boolean).length,
      physical_rows:entry.physical_rows
    })).sort((a,b)=>b.exam_year-a.exam_year || a.paper.localeCompare(b.paper,undefined,{numeric:true,sensitivity:'base'}));
  }

  function scopeLabel(mode){
    return norm(mode) === 'all_available' ? 'All Available Questions' : 'Quick Session';
  }

  function assignmentLabel(row){
    return isPastPaperAssignment(row)
      ? `${Number(row?.exam_year || 0)} · ${trim(row?.paper)}`
      : trim(row?.topic || row?.strand || 'Practice');
  }

  function routeStudentRpc(name){
    return RPC_MAP[String(name || '')] || String(name || '');
  }

  function selectedClass(){
    try {
      if (!Array.isArray(teacherClasses)) return null;
      return teacherClasses.find(row => String(row?.id) === String(selectedClassId)) || null;
    } catch { return null; }
  }

  function classStudents(cls,activeOnly=false){
    try {
      if (!cls || !Array.isArray(teacherStudents)) return [];
      return teacherStudents.filter(student =>
        String(student?.class_id) === String(cls.id) && (!activeOnly || student?.active !== false)
      );
    } catch { return []; }
  }

  function sameYearClasses(cls){
    try {
      if (!cls || !Array.isArray(teacherClasses)) return [];
      return teacherClasses.filter(row => row?.active !== false && Number(row?.year_level) === Number(cls.year_level));
    } catch { return []; }
  }

  function checkedValues(selector){
    if (typeof document === 'undefined') return [];
    return [...document.querySelectorAll(selector)].filter(input => input.checked).map(input => input.value);
  }

  function setAll(selector,checked){
    if (typeof document === 'undefined') return;
    document.querySelectorAll(selector).forEach(input => { input.checked = !!checked; });
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SECTION_ID}{margin-top:22px;border-top:1px solid var(--border);padding-top:20px}
      #${SECTION_ID} .v56b-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
      #${SECTION_ID} .v56b-wide{grid-column:1/-1}
      #${SECTION_ID} .v56b-target-wrap.hidden{display:none!important}
      #${SECTION_ID} .v56b-picker{border:1px solid var(--border);border-radius:14px;padding:12px;background:var(--surface-soft,var(--card))}
      #${SECTION_ID} .v56b-picker-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:9px}
      #${SECTION_ID} .v56b-picker-actions{display:flex;gap:7px;flex-wrap:wrap}
      #${SECTION_ID} .v56b-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:230px;overflow:auto}
      #${SECTION_ID} .v56b-option{display:flex;align-items:flex-start;gap:9px;border:1px solid var(--border);border-radius:11px;padding:9px 10px;background:var(--card);cursor:pointer}
      #${SECTION_ID} .v56b-option input{width:auto;margin-top:2px;flex:0 0 auto}
      #${SECTION_ID} .v56b-option strong{display:block}
      #${SECTION_ID} .v56b-list{display:grid;gap:12px;margin-top:14px}
      #${SECTION_ID} .v56b-card{border:1px solid var(--border);border-radius:15px;padding:14px;background:var(--surface-soft,var(--card))}
      #${SECTION_ID} .v56b-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      #${SECTION_ID} .v56b-card h4{margin:0 0 4px}
      #${SECTION_ID} .v56b-stats{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      #${SECTION_ID} .v56b-audience{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:7px}
      #${SECTION_ID} .v56b-student-list{margin-top:10px}
      .v56b-assigned-paper-tag{background:color-mix(in srgb,var(--primary) 12%,var(--card));color:var(--primary)}
      #v55c-resume-card .v56b-resume-note{font-size:12px;font-weight:750;color:var(--primary)}
      @media(max-width:700px){
        #${SECTION_ID} .v56b-grid{grid-template-columns:1fr}
        #${SECTION_ID} .v56b-wide{grid-column:auto}
        #${SECTION_ID} .v56b-options{grid-template-columns:1fr;max-height:280px}
        #${SECTION_ID} #v56b-save{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function teacherFeedback(kind,message){
    const root = document.getElementById('v56b-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = String(message || '');
    root.classList.remove('hidden');
  }

  function populateAudiencePickers(){
    const cls = selectedClass();
    if (!cls || typeof document === 'undefined') return;
    const studentRoot = document.getElementById('v56b-student-options');
    const classRoot = document.getElementById('v56b-class-options');
    if (studentRoot){
      const changed = studentRoot.dataset.classId !== String(cls.id);
      const previous = changed ? new Set() : new Set(checkedValues('#v56b-student-options input[type="checkbox"]'));
      const students = classStudents(cls,true).sort((a,b)=>trim(a.student_name).localeCompare(trim(b.student_name),undefined,{numeric:true}));
      studentRoot.innerHTML = students.map(student => `
        <label class="v56b-option">
          <input type="checkbox" value="${html(student.id)}" ${previous.has(String(student.id))?'checked':''}>
          <span><strong>${html(student.student_name)}</strong><span class="help">${html(student.student_id)}</span></span>
        </label>`).join('') || '<div class="empty">No active students in this class.</div>';
      studentRoot.dataset.classId = String(cls.id);
    }
    if (classRoot){
      const contextKey = `${cls.id}|${cls.year_level}`;
      const changed = classRoot.dataset.contextKey !== contextKey;
      const previous = changed ? new Set([String(cls.id)]) : new Set(checkedValues('#v56b-class-options input[type="checkbox"]'));
      const classes = sameYearClasses(cls).sort((a,b)=>trim(a.name).localeCompare(trim(b.name),undefined,{numeric:true}));
      classRoot.innerHTML = classes.map(row => `
        <label class="v56b-option">
          <input type="checkbox" value="${html(row.id)}" ${previous.has(String(row.id))?'checked':''}>
          <span><strong>${html(row.name)}</strong><span class="help">Year ${Number(row.year_level)}</span></span>
        </label>`).join('') || '<div class="empty">No active classes in this year level.</div>';
      classRoot.dataset.contextKey = contextKey;
    }
  }

  function updateAudienceControls(){
    const audience = document.getElementById('v56b-audience')?.value || 'class';
    document.getElementById('v56b-student-target-wrap')?.classList.toggle('hidden',audience !== 'students');
    document.getElementById('v56b-class-target-wrap')?.classList.toggle('hidden',audience !== 'classes');
  }

  function selectedTeacherPaper(){
    const key = document.getElementById('v56b-paper')?.value || '';
    return currentTeacherPaperLibrary.find(entry => entry.key === key) || null;
  }

  function refreshTeacherPaperOptions(){
    const cls = selectedClass();
    const select = document.getElementById('v56b-paper');
    const availability = document.getElementById('v56b-availability');
    if (!cls || !select) return;
    let questions=[];
    try { questions = Array.isArray(teacherQuestions) ? teacherQuestions : []; } catch {}
    const previous = select.value;
    currentTeacherPaperLibrary = derivePaperLibrary(questions,cls.year_level);
    select.innerHTML = currentTeacherPaperLibrary.length
      ? currentTeacherPaperLibrary.map(entry => `<option value="${html(entry.key)}">${entry.exam_year} · ${html(entry.paper)} · ${entry.logical_questions} available</option>`).join('')
      : '<option value="">No Practice-eligible past papers</option>';
    if (currentTeacherPaperLibrary.some(entry => entry.key === previous)) select.value = previous;
    refreshTeacherAvailability();
    if (availability && !currentTeacherPaperLibrary.length){
      availability.textContent = 'No Practice-eligible past-paper questions are available for this class year.';
    }
  }

  function refreshTeacherAvailability(){
    const entry = selectedTeacherPaper();
    const mode = document.getElementById('v56b-scope')?.value || 'quick';
    const count = Number(document.getElementById('v56b-count')?.value || 5);
    const countWrap = document.getElementById('v56b-count-wrap');
    const availability = document.getElementById('v56b-availability');
    if (countWrap) countWrap.classList.toggle('hidden',mode === 'all_available');
    if (!availability) return;
    if (!entry){ availability.textContent = 'Choose a past paper.'; return; }
    const target = mode === 'all_available' ? entry.logical_questions : Math.min(count,entry.logical_questions);
    availability.textContent = mode === 'all_available'
      ? `${entry.logical_questions} Practice-eligible logical questions will be assigned from ${entry.exam_year} · ${entry.paper}. Drawing/manual questions already excluded from Practice stay excluded.`
      : `${target} of ${entry.logical_questions} currently available logical questions will be used for this Quick Session.`;
  }

  function ensureTeacherSection(){
    if (typeof document === 'undefined') return null;
    injectStyles();
    let section = document.getElementById(SECTION_ID);
    if (section) return section;
    const anchor = document.getElementById('v43b-practice-assignment-admin') || document.getElementById('assignment-list');
    if (!anchor) return null;
    section = document.createElement('section');
    section.id = SECTION_ID;
    section.innerHTML = `
      <div class="header">
        <div>
          <h3>Assign Past Paper Practice</h3>
          <p class="muted">Assign one Practice-eligible past paper to a class, selected students or multiple same-year classes.</p>
        </div>
        <span class="tag">V5.6B</span>
      </div>
      <div class="info">This remains Practice Mode: normal feedback, hints and resume are available. Only currently Practice-eligible questions from the chosen paper are used; Exam publication is unchanged.</div>
      <div class="v56b-grid">
        <label>Assign to
          <select id="v56b-audience">
            <option value="class">Whole selected class</option>
            <option value="students">Selected students</option>
            <option value="classes">Multiple classes</option>
          </select>
        </label>
        <label>Past paper<select id="v56b-paper"><option value="">Loading…</option></select></label>
        <div id="v56b-student-target-wrap" class="v56b-target-wrap v56b-wide hidden">
          <div class="v56b-picker"><div class="v56b-picker-head"><strong>Choose students</strong><div class="v56b-picker-actions"><button type="button" class="outline" id="v56b-students-all">Select all</button><button type="button" class="outline" id="v56b-students-clear">Clear</button></div></div><div id="v56b-student-options" class="v56b-options"></div></div>
        </div>
        <div id="v56b-class-target-wrap" class="v56b-target-wrap v56b-wide hidden">
          <div class="v56b-picker"><div class="v56b-picker-head"><div><strong>Choose classes</strong><div class="help">Only active classes in the selected class year are shown.</div></div><div class="v56b-picker-actions"><button type="button" class="outline" id="v56b-classes-all">Select all</button><button type="button" class="outline" id="v56b-classes-clear">Clear</button></div></div><div id="v56b-class-options" class="v56b-options"></div></div>
        </div>
        <label>Session length
          <select id="v56b-scope"><option value="quick">Quick Session</option><option value="all_available">All Available Questions</option></select>
        </label>
        <label id="v56b-count-wrap">Quick Session questions
          <select id="v56b-count"><option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option></select>
        </label>
        <label>Suggested start<input id="v56b-opens" type="datetime-local"><span class="help">Does not restrict access.</span></label>
        <label>Target due date<input id="v56b-closes" type="datetime-local"><span class="help">Students can still complete it afterwards.</span></label>
        <div class="v56b-wide help" id="v56b-availability"></div>
      </div>
      <button id="v56b-save" class="primary" type="button">Assign Past Paper Practice</button>
      <div id="v56b-feedback" class="feedback hidden"></div>
      <div id="v56b-list" class="v56b-list"></div>`;
    anchor.insertAdjacentElement('afterend',section);

    section.querySelector('#v56b-audience')?.addEventListener('change',updateAudienceControls);
    section.querySelector('#v56b-paper')?.addEventListener('change',refreshTeacherAvailability);
    section.querySelector('#v56b-scope')?.addEventListener('change',refreshTeacherAvailability);
    section.querySelector('#v56b-count')?.addEventListener('change',refreshTeacherAvailability);
    section.querySelector('#v56b-save')?.addEventListener('click',saveTeacherAssignment);
    section.querySelector('#v56b-students-all')?.addEventListener('click',()=>setAll('#v56b-student-options input[type="checkbox"]',true));
    section.querySelector('#v56b-students-clear')?.addEventListener('click',()=>setAll('#v56b-student-options input[type="checkbox"]',false));
    section.querySelector('#v56b-classes-all')?.addEventListener('click',()=>setAll('#v56b-class-options input[type="checkbox"]',true));
    section.querySelector('#v56b-classes-clear')?.addEventListener('click',()=>setAll('#v56b-class-options input[type="checkbox"]',false));

    populateAudiencePickers();
    updateAudienceControls();
    refreshTeacherPaperOptions();
    return section;
  }

  async function saveTeacherAssignment(){
    const cls = selectedClass();
    const entry = selectedTeacherPaper();
    if (!cls){ teacherFeedback('try','Select a class first.'); return; }
    if (!entry){ teacherFeedback('try','Choose an available past paper.'); return; }

    const audience = document.getElementById('v56b-audience')?.value || 'class';
    let classIds = [String(cls.id)];
    let studentIds = [];
    if (audience === 'students') studentIds = checkedValues('#v56b-student-options input[type="checkbox"]');
    if (audience === 'classes') classIds = checkedValues('#v56b-class-options input[type="checkbox"]');
    if (audience === 'students' && !studentIds.length){ teacherFeedback('try','Choose at least one student.'); return; }
    if (audience === 'classes' && !classIds.length){ teacherFeedback('try','Choose at least one class.'); return; }

    const mode = document.getElementById('v56b-scope')?.value || 'quick';
    const count = Number(document.getElementById('v56b-count')?.value || 5);
    const opens = document.getElementById('v56b-opens')?.value || '';
    const closes = document.getElementById('v56b-closes')?.value || '';
    if (opens && closes && Date.parse(closes) <= Date.parse(opens)){
      teacherFeedback('try','Target due date must be after the suggested start.');
      return;
    }

    const button = document.getElementById('v56b-save');
    if (!button) return;
    button.disabled = true;
    button.textContent = 'Assigning…';
    try {
      const {data,error} = await cloud.rpc('create_teacher_past_paper_assignments_v56b',{
        p_class_ids:classIds,
        p_exam_year:entry.exam_year,
        p_paper:entry.paper,
        p_selection_mode:mode,
        p_question_count:count,
        p_opens_at:opens ? new Date(opens).toISOString() : null,
        p_closes_at:closes ? new Date(closes).toISOString() : null,
        p_target_student_ids:studentIds.length ? studentIds : null
      });
      if (error) throw error;
      let who = 'the selected class';
      if (data?.audience === 'individual') who = '1 selected student';
      else if (data?.audience === 'students') who = `${Number(data?.student_count || studentIds.length)} selected students`;
      else if (data?.audience === 'classes') who = `${Number(data?.class_count || classIds.length)} classes`;
      teacherFeedback('correct',`${entry.exam_year} · ${entry.paper} assigned to ${who} · ${scopeLabel(mode)} · ${Number(data?.recommended_count || 0)} question${Number(data?.recommended_count || 0)===1?'':'s'}.`);
      await refreshTeacher(true);
    } catch (error){
      teacherFeedback('incorrect',error?.message || String(error));
    } finally {
      button.disabled = false;
      button.textContent = 'Assign Past Paper Practice';
    }
  }

  async function loadTeacherData(){
    if (typeof cloud === 'undefined' || !cloud || typeof teacherUser === 'undefined' || !teacherUser){
      teacherAssignments=[]; teacherAttempts=[]; teacherRecipients=[]; return;
    }
    const [a,b,c] = await Promise.all([
      cloud.from('practice_assignments').select('*').eq('assignment_type','past_paper').order('created_at',{ascending:false}),
      cloud.from('practice_assignment_attempts').select('*').order('started_at',{ascending:false}),
      cloud.from('practice_assignment_recipients').select('*')
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    if (c.error) throw c.error;
    teacherAssignments = a.data || [];
    teacherAttempts = b.data || [];
    teacherRecipients = c.data || [];
  }

  function recipientsFor(assignmentId){
    return teacherRecipients.filter(row => String(row?.assignment_id) === String(assignmentId));
  }

  function attemptFor(assignmentId,studentId){
    return teacherAttempts.find(row => String(row?.assignment_id) === String(assignmentId) && String(row?.roster_student_id) === String(studentId)) || null;
  }

  function relevantStudentsFor(assignment,cls){
    const targetRows = recipientsFor(assignment.id);
    if (!targetRows.length) return classStudents(cls,true);
    const ids = new Set(targetRows.map(row=>String(row.roster_student_id)));
    return classStudents(cls,false).filter(student=>ids.has(String(student.id)));
  }

  function dateLabel(value,prefix){
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : `${prefix} ${date.toLocaleString()}`;
  }

  function renderTeacherList(){
    const root = document.getElementById('v56b-list');
    const cls = selectedClass();
    if (!root || !cls) return;
    const rows = teacherAssignments.filter(row=>String(row.class_id)===String(cls.id));
    if (!rows.length){ root.innerHTML='<div class="empty">No Past Paper Practice assignments for this class yet.</div>'; hideLegacyPastPaperCards(); return; }

    root.innerHTML = rows.map(assignment => {
      const targetRows = recipientsFor(assignment.id);
      const students = relevantStudentsFor(assignment,cls);
      const participation = students.map(student=>({student,attempt:attemptFor(assignment.id,student.id)}));
      const started = participation.filter(row=>row.attempt).length;
      const completed = participation.filter(row=>row.attempt?.status==='completed').length;
      const inProgress = participation.filter(row=>row.attempt?.status==='in_progress').length;
      const pct = students.length ? Math.round(started/students.length*100) : 0;
      const audienceTag = targetRows.length===0 ? 'Whole class' : targetRows.length===1 ? 'Individual' : 'Selected students';
      const audienceText = targetRows.length
        ? (students.map(student=>student.student_name).join(', ') || `${targetRows.length} selected student${targetRows.length===1?'':'s'}`)
        : `${students.length} active student${students.length===1?'':'s'} in ${cls.name}`;
      return `
        <article class="v56b-card">
          <div class="v56b-card-head">
            <div>
              <h4>📄 ${html(assignmentLabel(assignment))}</h4>
              <div class="help">Past Paper Practice · ${html(scopeLabel(assignment.selection_mode))}${assignment.selection_mode==='all_available'?'':` · ${Number(assignment.question_count||5)} question target`}</div>
              <div class="help">${html(dateLabel(assignment.opens_at,'Starts') || 'Available immediately')} · ${html(dateLabel(assignment.closes_at,'Target due') || 'No target due date')}</div>
              <div class="v56b-audience"><span class="tag">${audienceTag}</span><span class="help">${html(audienceText)}</span></div>
            </div>
            <span class="tag ${assignment.active?'availability-on':'availability-off'}">${assignment.active?'Active':'Inactive'}</span>
          </div>
          <div class="v56b-stats"><span class="tag">${started}/${students.length} started</span><span class="tag">${completed} completed</span><span class="tag">${inProgress} in progress</span><span class="tag">${Math.max(0,students.length-started)} not started</span></div>
          <div class="participation-bar"><span style="width:${pct}%"></span></div>
          <details class="v56b-student-list"><summary>${targetRows.length?'Assigned students':'Student participation'}</summary>
            ${participation.map(({student,attempt})=>{
              const status=attempt?.status==='completed'?'Completed':attempt?'In progress':'Not started';
              const className=attempt?.status==='completed'?'completed':attempt?'in-progress':'incomplete';
              let score='';
              try {
                const session=attempt?.practice_session_id && Array.isArray(teacherResults) ? teacherResults.find(result=>String(result?.id)===String(attempt.practice_session_id)) : null;
                if (session) score=` · ${Number(session.first_try_percent||0)}% first try · ${Number(session.mastery_percent||0)}% mastery`;
              } catch {}
              return `<div class="roster-row"><div><strong>${html(student.student_name)}</strong><div class="help">${html(student.student_id)}${html(score)}${student.active===false?' · inactive roster':''}</div></div><span class="attempt-status ${className}">${status}</span></div>`;
            }).join('') || '<div class="empty">No assigned students are available.</div>'}
          </details>
          <div class="buttons"><button class="outline v56b-toggle" data-id="${html(assignment.id)}" data-active="${assignment.active?'true':'false'}" type="button">${assignment.active?'Deactivate':'Activate'}</button></div>
        </article>`;
    }).join('');

    root.querySelectorAll('.v56b-toggle').forEach(button=>button.addEventListener('click',async()=>{
      const next = button.dataset.active !== 'true';
      button.disabled = true;
      try {
        const {error}=await cloud.from('practice_assignments').update({active:next,updated_at:new Date().toISOString()}).eq('id',button.dataset.id);
        if (error) throw error;
        teacherFeedback('correct',next?'Past Paper Practice assignment activated.':'Past Paper Practice assignment deactivated.');
        await refreshTeacher(true);
      } catch(error){ teacherFeedback('incorrect',error?.message || String(error)); }
      finally { button.disabled=false; }
    }));
    hideLegacyPastPaperCards();
  }

  function hideLegacyPastPaperCards(){
    if (typeof document === 'undefined') return;
    const ids = new Set(teacherAssignments.map(row=>String(row.id)));
    document.querySelectorAll('#v43b-list .v43b-card').forEach(card=>{
      const id = card.querySelector('.v43b-toggle[data-id]')?.dataset?.id || '';
      card.classList.toggle('hidden',ids.has(String(id)));
    });
  }

  async function refreshTeacher(load=true){
    if (teacherRefreshBusy) return;
    const cls = selectedClass();
    if (!cls) return;
    const section = ensureTeacherSection();
    if (!section) return;
    populateAudiencePickers();
    updateAudienceControls();
    refreshTeacherPaperOptions();
    teacherRefreshBusy = true;
    try {
      if (load) await loadTeacherData();
      renderTeacherList();
    } catch(error){ teacherFeedback('incorrect',`Could not load Past Paper Practice assignments. ${error?.message || ''}`.trim()); }
    finally { teacherRefreshBusy=false; }
  }

  function scheduleTeacherRefresh(load=true){
    [0,120,400].forEach(delay=>window.setTimeout(()=>refreshTeacher(load),delay));
  }

  function validContext(context,now=Date.now()){
    if (!context || Number(context.version)!==CONTEXT_VERSION) return false;
    const saved=Date.parse(context.savedAt || context.startedAt || '');
    return Number.isFinite(saved) && now>=saved && now-saved<=CONTEXT_MAX_AGE_MS && !!context.assignmentId && !!context.attemptId;
  }

  function readAssignmentContext(){
    if (typeof localStorage === 'undefined') return null;
    try {
      const value=JSON.parse(localStorage.getItem(CONTEXT_KEY)||'null');
      if (validContext(value)) return value;
      if (value) localStorage.removeItem(CONTEXT_KEY);
    } catch {}
    return null;
  }

  function writeAssignmentContext(data){
    if (typeof localStorage === 'undefined' || !data) return false;
    const context={
      version:CONTEXT_VERSION,
      assignmentId:trim(data.assignment_id || data.assignmentId),
      attemptId:trim(data.attempt_id || data.attemptId),
      studentId:trim(studentMeta?.student_id || data.studentId),
      examYear:Number(data.exam_year || data.examYear || 0),
      paper:trim(data.paper),
      selectionMode:norm(data.selection_mode || data.selectionMode)==='all_available'?'all_available':'quick',
      target:Math.max(1,Number(data.recommended_count || data.target || 1)),
      startedAt:new Date().toISOString(),
      savedAt:new Date().toISOString()
    };
    if (!context.assignmentId || !context.attemptId || !context.examYear || !context.paper) return false;
    try { localStorage.setItem(CONTEXT_KEY,JSON.stringify(context)); return true; } catch { return false; }
  }

  function clearAssignmentContext(assignmentId=''){
    if (typeof localStorage === 'undefined') return;
    const current=readAssignmentContext();
    if (!current || !assignmentId || String(current.assignmentId)===String(assignmentId)) localStorage.removeItem(CONTEXT_KEY);
  }

  function cacheStudentList(data){
    studentMeta = data?.student || studentMeta;
    studentAssignments.clear();
    (Array.isArray(data?.assignments)?data.assignments:[]).forEach(row=>studentAssignments.set(String(row.assignment_id),row));
    window.setTimeout(()=>{ decorateStudentAssignments(); decorateHomePriority(); decorateResumeCard(); },0);
  }

  function handleRpcResponse(name,response){
    if (response?.error) return response;
    const data=response?.data;
    if (name==='get_student_practice_assignments_v56b') cacheStudentList(data);
    if (name==='start_student_practice_assignment_v56b' && isPastPaperAssignment(data) && !data?.already_completed){
      lastStartByAssignment.set(String(data.assignment_id),data);
      writeAssignmentContext(data);
    }
    if (name==='complete_student_practice_assignment_v56b' && data?.completed){
      clearAssignmentContext(data.assignment_id);
      lastStartByAssignment.delete(String(data.assignment_id));
    }
    return response;
  }

  function installRpcBridge(){
    if (rpcWrapped) return true;
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      if (!cloud.__v53d1PracticeAssignmentRpcBridge) return false;
      const previous=cloud.rpc.bind(cloud);
      cloud.rpc=function(name,args,options){
        const routed=routeStudentRpc(name);
        const result=previous(routed,args,options);
        if (!Object.values(RPC_MAP).includes(routed)) return result;
        return Promise.resolve(result).then(response=>handleRpcResponse(routed,response));
      };
      Object.defineProperty(cloud,'__v56bPastPaperAssignmentRpcBridge',{value:true,writable:false,configurable:false});
      rpcWrapped=true;
      return true;
    } catch(error){ console.warn('V5.6B assignment RPC bridge could not be installed.',error); return false; }
  }

  async function waitForStudentPaper(examYear,paper){
    const api=ROOT.V55APastPaperPractice;
    if (!api) return null;
    api.setPracticeType?.('past_paper');
    try { void api.loadPaperLibrary?.(false); } catch {}
    for (let i=0;i<60;i+=1){
      const entry=(api.getPaperLibrary?.() || []).find(row=>Number(row?.exam_year)===Number(examYear) && norm(row?.paper)===norm(paper));
      if (entry) return entry;
      await new Promise(resolve=>window.setTimeout(resolve,100));
    }
    return null;
  }

  async function configureAssignedPaper(assignment,startData=null){
    const source=startData || assignment || {};
    const examYear=Number(source.exam_year || assignment?.exam_year || 0);
    const paper=trim(source.paper || assignment?.paper);
    const selectionMode=norm(source.selection_mode || assignment?.selection_mode)==='all_available'?'all_available':'quick';
    const target=Math.max(1,Number(source.recommended_count || assignment?.recommended_count || assignment?.question_count || 5));
    const entry=await waitForStudentPaper(examYear,paper);
    if (!entry) throw new Error('The assigned past paper is no longer available in Practice.');

    const yearSelect=document.getElementById('v55a-paper-year');
    const paperSelect=document.getElementById('v55a-paper-name');
    if (!yearSelect || !paperSelect) throw new Error('Past Paper Practice controls are not ready.');
    yearSelect.value=String(examYear);
    yearSelect.dispatchEvent(new Event('change',{bubbles:true}));
    const option=[...paperSelect.options].find(row=>norm(row.value)===norm(paper));
    if (!option) throw new Error('The assigned paper could not be selected.');
    paperSelect.value=option.value;
    paperSelect.dispatchEvent(new Event('change',{bubbles:true}));
    ROOT.V55BFullPaperPractice?.setScope?.(selectionMode==='all_available'?'all':'quick');
    return {examYear,paper:option.value,selectionMode,target};
  }

  async function launchAssignedPastPaper(assignment,startData){
    const configured=await configureAssignedPaper(assignment,startData);
    const countSelect=document.getElementById('question-count');
    const previous=countSelect?.value || '10';
    let temporary=null;
    if (configured.selectionMode!=='all_available' && countSelect){
      if (![...countSelect.options].some(option=>Number(option.value)===configured.target)){
        temporary=document.createElement('option');
        temporary.value=String(configured.target);
        temporary.textContent=`${configured.target} assigned`;
        countSelect.appendChild(temporary);
      }
      countSelect.disabled=false;
      countSelect.value=String(configured.target);
    }
    try {
      const starter=typeof ROOT.startPractice==='function' ? ROOT.startPractice : (typeof startPractice==='function' ? startPractice : null);
      if (!starter) throw new Error('Practice is not ready.');
      await starter();
      const quiz=document.getElementById('quiz');
      if (quiz?.classList.contains('active')){
        const path=document.getElementById('path-pill');
        if (path) path.textContent=`Assigned · ${configured.examYear} · ${configured.paper} · ${scopeLabel(configured.selectionMode)}`;
        decorateResumeCard();
      }
    } finally {
      if (countSelect && configured.selectionMode!=='all_available'){
        countSelect.value=previous;
        temporary?.remove();
      }
    }
  }

  function currentRecommendation(){
    try { return typeof studentPracticeRecommendationV35 !== 'undefined' ? studentPracticeRecommendationV35 : null; }
    catch { return null; }
  }

  function installRecommendedPracticeBridge(){
    if (recommendedWrapped) return true;
    try {
      if (typeof startRecommendedPracticeV35 !== 'function') return false;
      const previous=startRecommendedPracticeV35;
      startRecommendedPracticeV35=async function(...args){
        const recommendation=currentRecommendation();
        const id=String(recommendation?.assignment_id || '');
        const assignment=studentAssignments.get(id);
        if (!id || !isPastPaperAssignment(assignment)) return previous.apply(this,args);
        const started=lastStartByAssignment.get(id) || assignment;
        return launchAssignedPastPaper(assignment,started);
      };
      try { ROOT.startRecommendedPracticeV35=startRecommendedPracticeV35; } catch {}
      recommendedWrapped=true;
      return true;
    } catch(error){ console.warn('V5.6B could not bridge assigned Practice launch.',error); return false; }
  }

  function studentCardAssignment(index,card){
    const button=card.querySelector('.v42b-start-practice-assignment[data-id]');
    if (button) return studentAssignments.get(String(button.dataset.id)) || null;
    const rows=[...studentAssignments.values()];
    return rows[index] || null;
  }

  function decorateStudentAssignments(){
    if (typeof document==='undefined') return;
    const section=document.getElementById('v42b-student-practice-assignments');
    if (!section) return;
    section.querySelectorAll('.v42b-student-card').forEach((card,index)=>{
      const assignment=studentCardAssignment(index,card);
      if (!isPastPaperAssignment(assignment)) return;
      card.dataset.v56bPastPaperAssignment=String(assignment.assignment_id);
      const title=card.querySelector('h3');
      if (title) title.textContent=`${assignment.status==='completed'?'✅':'📄'} ${assignmentLabel(assignment)}`;
      const helps=card.querySelectorAll('.help');
      if (helps[0]) helps[0].textContent=`Past Paper Practice · ${scopeLabel(assignment.selection_mode)} · ${Number(assignment.recommended_count||0)} question${Number(assignment.recommended_count||0)===1?'':'s'}`;
      const head=card.querySelector('.v42b-student-card-head');
      if (head && !head.querySelector('.v56b-assigned-paper-tag')){
        const tag=document.createElement('span'); tag.className='tag v56b-assigned-paper-tag'; tag.textContent='Teacher Past Paper'; head.appendChild(tag);
      }
    });
  }

  function decorateHomePriority(){
    if (typeof document==='undefined') return;
    const card=document.querySelector('#start .v40c3-priority-card[data-v42b-assignment-id]');
    const id=String(card?.dataset?.v42bAssignmentId || '');
    const assignment=studentAssignments.get(id);
    if (!card || !isPastPaperAssignment(assignment)) return;
    const kicker=card.querySelector('.v40c3-priority-kicker');
    const title=card.querySelector('.v40c3-priority-title');
    const textNode=card.querySelector('.v40c3-priority-text');
    if (kicker) kicker.textContent='Teacher Past Paper Assignment';
    if (title) title.textContent=`📄 ${assignment.status==='in_progress'?'Continue':'Complete'} ${assignmentLabel(assignment)}`;
    if (textNode) textNode.textContent=assignment.status==='in_progress'
      ? 'Your assigned past-paper Practice is in progress. Continue it before optional practice.'
      : 'Your teacher assigned a specific past paper. Complete it using normal Practice feedback and learning tools.';
    const meta=card.querySelector('.v40c3-priority-meta');
    if (meta) meta.innerHTML=`<span>${Number(assignment.recommended_count||0)} questions</span><span>${html(scopeLabel(assignment.selection_mode))}</span>${assignment.closes_at?`<span>${html(dateLabel(assignment.closes_at,'Target due'))}</span>`:''}`;
  }

  function matchingResumeCheckpoint(context){
    const api=ROOT.V55CResumePastPaperPractice;
    if (!api || !context || typeof localStorage==='undefined') return null;
    try {
      const store=api.pruneStore(api.readStore(localStorage));
      return Object.values(store).find(snapshot=>Number(snapshot?.examYear)===Number(context.examYear) && norm(snapshot?.paper)===norm(context.paper) && (!context.studentId || norm(snapshot?.studentId)===norm(context.studentId))) || null;
    } catch { return null; }
  }

  function decorateResumeCard(){
    if (typeof document==='undefined') return;
    const context=readAssignmentContext();
    if (!context || !matchingResumeCheckpoint(context)) return;
    const card=document.querySelector('#v55c-resume-card .v55c-card');
    if (!card || card.querySelector('.v56b-resume-note')) return;
    const note=document.createElement('div');
    note.className='v56b-resume-note';
    note.textContent='📄 This saved Past Paper Practice belongs to your teacher assignment. Completing it will update the assignment automatically.';
    card.querySelector('.v55c-help')?.insertAdjacentElement('afterend',note);
  }

  function resultMatchesContext(context){
    if (!context) return false;
    try {
      return state?.v55a_practice_type==='past_paper'
        && Number(state?.v55a_exam_year)===Number(context.examYear)
        && norm(state?.v55a_paper)===norm(context.paper);
    } catch { return false; }
  }

  function resultCode(){
    return trim(document.getElementById('result-code')?.textContent);
  }

  function assignmentResultNote(kind,title,body){
    if (typeof document==='undefined') return;
    if (document.querySelector('.v42b-assignment-result-note')) return;
    document.getElementById('v56b-assignment-result-note')?.remove();
    const result=document.getElementById('result');
    const anchor=result?.querySelector('.v41-recovery-panel') || document.getElementById('review');
    if (!result || !anchor) return;
    const note=document.createElement('div');
    note.id='v56b-assignment-result-note';
    note.className=`v42b-assignment-result-note ${kind||''}`;
    note.innerHTML=`<strong>${html(title)}</strong><span>${html(body)}</span>`;
    anchor.insertAdjacentElement('beforebegin',note);
  }

  async function completeStoredAssignmentFromResult(){
    if (resultCompletionBusy) return;
    const result=document.getElementById('result');
    const context=readAssignmentContext();
    if (!result?.classList.contains('active') || !validContext(context) || !resultMatchesContext(context)) return;
    const code=resultCode();
    if (!code) return;
    resultCompletionBusy=true;
    try {
      const access=typeof validateStudentAccess==='function' ? await validateStudentAccess('practice') : null;
      if (!access?.access_token) return;
      if (context.studentId && access.student_id && norm(context.studentId)!==norm(access.student_id)) return;
      const {data,error}=await cloud.rpc('complete_student_practice_assignment_v56b',{
        p_access_token:access.access_token,p_attempt_id:context.attemptId,p_result_code:code
      });
      if (error) throw error;
      clearAssignmentContext(context.assignmentId);
      assignmentResultNote('correct','✅ Teacher Past Paper Assignment completed',Number.isFinite(Number(data?.mastery_percent))
        ? `${context.examYear} · ${context.paper} is complete with ${Number(data.mastery_percent)}% mastery.`
        : `${context.examYear} · ${context.paper} is complete and has been recorded for your teacher.`);
    } catch(error){
      console.warn('V5.6B could not complete stored Past Paper assignment.',error);
      assignmentResultNote('try','Assignment still in progress',error?.message || 'Complete the full assigned Past Paper Practice set to finish this assignment.');
    } finally { resultCompletionBusy=false; }
  }

  function wireRuntime(){
    if (typeof document==='undefined') return;
    injectStyles();
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('.class-select,.tab[data-panel="classes-panel"],#refresh-btn,#refresh-classes')) scheduleTeacherRefresh(true);
      if (event.target?.closest?.('#my-assignments-btn,.v42b-start-practice-assignment,.v40c3-priority-action')) window.setTimeout(()=>{decorateStudentAssignments();decorateHomePriority();decorateResumeCard();},150);
    },true);
    document.addEventListener('change',event=>{
      if (event.target?.matches?.('#v56b-audience,#v56b-paper,#v56b-scope,#v56b-count')) window.setTimeout(()=>{updateAudienceControls();refreshTeacherAvailability();},0);
    });

    const selected=document.getElementById('selected-class-content');
    if (selected && typeof MutationObserver!=='undefined') new MutationObserver(()=>scheduleTeacherRefresh(false)).observe(selected,{childList:true});
    const assignments=document.getElementById('student-assignments-list');
    if (assignments && typeof MutationObserver!=='undefined') new MutationObserver(()=>window.setTimeout(decorateStudentAssignments,0)).observe(assignments,{childList:true,subtree:true});
    const home=document.querySelector('#start .v40c3-home-dashboard');
    if (home && typeof MutationObserver!=='undefined') new MutationObserver(()=>window.setTimeout(decorateHomePriority,0)).observe(home,{childList:true,subtree:true});
    const resume=document.getElementById('v55c-resume-card');
    if (resume && typeof MutationObserver!=='undefined') new MutationObserver(()=>window.setTimeout(decorateResumeCard,0)).observe(resume,{childList:true,subtree:true});
    const result=document.getElementById('result');
    if (result && typeof MutationObserver!=='undefined') new MutationObserver(()=>{
      if (result.classList.contains('active')) window.setTimeout(completeStoredAssignmentFromResult,120);
    }).observe(result,{attributes:true,attributeFilter:['class']});

    window.addEventListener('pageshow',()=>{decorateResumeCard();scheduleTeacherRefresh(false);});
    scheduleTeacherRefresh(true);
  }

  function install(){
    const rpcReady=installRpcBridge();
    const startReady=installRecommendedPracticeBridge();
    if (!rpcReady || !startReady) return false;
    ensureTeacherSection();
    wireRuntime();
    return true;
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
    RPC_MAP,routeStudentRpc,isPastPaperAssignment,paperKey,logicalQuestionKey,derivePaperLibrary,
    scopeLabel,assignmentLabel,validContext,readAssignmentContext,writeAssignmentContext,
    matchingResumeCheckpoint
  });

  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V56BTeacherAssignedPastPaperPractice',{value:api,writable:false,configurable:false});
    scheduleInstall();
  }
})();
