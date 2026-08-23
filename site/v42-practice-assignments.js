/* V4.2B — Targeted Practice Assignments.
   Adds teacher-created strand/topic Practice assignments while reusing the
   existing secure Practice ticket, question-selection, grading, result and
   mastery flows. Assignment completion is verified server-side. */
(() => {
  'use strict';

  const STYLE_ID = 'v42b-practice-assignments-style';
  const STUDENT_SECTION_ID = 'v42b-student-practice-assignments';
  const TEACHER_SECTION_ID = 'v42b-practice-assignment-admin';
  let teacherPracticeAssignments = [];
  let teacherPracticeAttempts = [];
  let activeAssignmentContext = null;
  let homeRefreshBusy = false;
  let studentOpenBusy = false;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v42b-practice-admin{
        margin-top:22px;
        border-top:1px solid var(--border);
        padding-top:20px;
      }
      .v42b-practice-admin-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
        margin:14px 0;
      }
      .v42b-practice-admin-grid .wide{grid-column:1/-1}
      .v42b-practice-list{display:grid;gap:12px;margin-top:14px}
      .v42b-practice-card{
        border:1px solid var(--border);
        border-radius:15px;
        padding:14px;
        background:var(--surface-soft,var(--card));
      }
      .v42b-practice-card-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        flex-wrap:wrap;
      }
      .v42b-practice-card h4{margin:0 0 4px}
      .v42b-practice-stats{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      .v42b-practice-student-list{margin-top:10px}
      .v42b-practice-feedback{margin-top:10px}
      #${STUDENT_SECTION_ID}{
        grid-column:1/-1;
        display:grid;
        gap:12px;
        margin-bottom:4px;
      }
      #${STUDENT_SECTION_ID} .v42b-section-head{
        border-bottom:1px solid var(--border);
        padding-bottom:10px;
      }
      #${STUDENT_SECTION_ID} .v42b-section-head h2{margin:0 0 4px}
      #${STUDENT_SECTION_ID} .v42b-assignment-grid{display:grid;gap:12px}
      #${STUDENT_SECTION_ID} .v42b-student-card{
        border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));
        border-radius:17px;
        padding:16px;
        background:color-mix(in srgb,var(--soft) 35%,var(--card));
      }
      #${STUDENT_SECTION_ID} .v42b-student-card-head{
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:flex-start;
        flex-wrap:wrap;
      }
      #${STUDENT_SECTION_ID} .v42b-student-card h3{margin:0 0 5px}
      #${STUDENT_SECTION_ID} .v42b-student-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:12px;
      }
      .v42b-assignment-result-note{
        border:1px solid color-mix(in srgb,var(--primary) 30%,var(--border));
        border-radius:14px;
        padding:12px 13px;
        margin:12px 0;
        background:color-mix(in srgb,var(--soft) 40%,var(--card));
        text-align:left;
      }
      .v42b-assignment-result-note strong{display:block;margin-bottom:3px}
      @media(max-width:700px){
        .v42b-practice-admin-grid{grid-template-columns:1fr}
        .v42b-practice-admin-grid .wide{grid-column:auto}
        #${STUDENT_SECTION_ID} .v42b-student-actions button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function strandLabel(strand){
    return typeof STRANDS === 'object' && STRANDS
      ? (STRANDS[strand] || strand || 'Practice')
      : (strand || 'Practice');
  }

  function text(value){
    return String(value ?? '').trim();
  }

  function lower(value){
    return text(value).toLowerCase();
  }

  function dateLabel(value, prefix){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${prefix} ${date.toLocaleString()}`;
  }

  function timingLabel(row){
    if (row?.timing_status === 'upcoming') return 'Upcoming';
    if (row?.timing_status === 'due_passed') return 'Target due passed';
    return 'Active';
  }

  function logicalQuestionKey(question){
    const parent = text(question?.parent_question_number);
    const paper = text(question?.paper);
    const year = Number(question?.exam_year);
    if (parent && paper && Number.isFinite(year) && year > 0) {
      return `group|${year}|${lower(paper).replace(/\s+/g,'')}|${lower(parent).replace(/\s+/g,'')}`;
    }
    return `single|${text(question?.id)}`;
  }

  function matchingTeacherQuestions(cls, strand, topic){
    const questions = typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)
      ? teacherQuestions
      : [];
    return questions.filter(q =>
      q?.active !== false &&
      Number(q?.year_level) === Number(cls?.year_level) &&
      lower(q?.strand) === lower(strand) &&
      (!topic || lower(q?.topic) === lower(topic))
    );
  }

  function availableTeacherItems(cls, strand, topic){
    return new Set(matchingTeacherQuestions(cls, strand, topic).map(logicalQuestionKey)).size;
  }

  function selectedTeacherClass(){
    if (typeof selectedClassId === 'undefined' || typeof teacherClasses === 'undefined') return null;
    return (teacherClasses || []).find(c => String(c.id) === String(selectedClassId)) || null;
  }

  async function loadTeacherPracticeData(){
    if (typeof cloud === 'undefined' || !cloud || typeof teacherUser === 'undefined' || !teacherUser) {
      teacherPracticeAssignments = [];
      teacherPracticeAttempts = [];
      return;
    }
    const [assignmentsResult, attemptsResult] = await Promise.all([
      cloud.from('practice_assignments').select('*').order('created_at',{ascending:false}),
      cloud.from('practice_assignment_attempts').select('*').order('started_at',{ascending:false})
    ]);
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (attemptsResult.error) throw attemptsResult.error;
    teacherPracticeAssignments = assignmentsResult.data || [];
    teacherPracticeAttempts = attemptsResult.data || [];
  }

  function teacherFeedback(kind, message){
    const root = document.getElementById('v42b-practice-feedback');
    if (!root) return;
    root.className = `feedback ${kind} v42b-practice-feedback`;
    root.textContent = message;
    root.classList.remove('hidden');
  }

  function populateTeacherTopics(){
    const cls = selectedTeacherClass();
    const strand = document.getElementById('v42b-practice-strand')?.value || '';
    const topicSelect = document.getElementById('v42b-practice-topic');
    const availability = document.getElementById('v42b-practice-availability');
    if (!cls || !topicSelect) return;

    const topics = [...new Set(
      matchingTeacherQuestions(cls, strand, '')
        .map(q => text(q.topic))
        .filter(Boolean)
    )].sort((a,b) => a.localeCompare(b,undefined,{numeric:true}));

    const previous = topicSelect.value;
    topicSelect.innerHTML = '<option value="">All topics in this strand</option>' +
      topics.map(topic => `<option value="${esc(topic)}">${esc(topic)}</option>`).join('');
    topicSelect.value = topics.includes(previous) ? previous : '';

    if (availability) {
      const count = availableTeacherItems(cls, strand, topicSelect.value);
      availability.textContent = count
        ? `${count} logical question${count===1?'':'s'} currently available for this selection.`
        : 'No active questions currently match this selection.';
    }
  }

  function practiceAttemptFor(assignmentId, studentId){
    return teacherPracticeAttempts.find(a =>
      String(a.assignment_id) === String(assignmentId) &&
      String(a.roster_student_id) === String(studentId)
    ) || null;
  }

  function renderTeacherPracticeList(){
    const root = document.getElementById('v42b-practice-list');
    const cls = selectedTeacherClass();
    if (!root || !cls) return;

    const assignments = teacherPracticeAssignments.filter(a => String(a.class_id) === String(cls.id));
    const students = (typeof teacherStudents !== 'undefined' ? teacherStudents : [])
      .filter(s => String(s.class_id) === String(cls.id) && s.active !== false);

    if (!assignments.length) {
      root.innerHTML = '<div class="empty">No targeted Practice assignments for this class yet.</div>';
      return;
    }

    root.innerHTML = assignments.map(a => {
      const attempts = students.map(student => ({student, attempt:practiceAttemptFor(a.id,student.id)}));
      const started = attempts.filter(x => x.attempt).length;
      const completed = attempts.filter(x => x.attempt?.status === 'completed').length;
      const inProgress = attempts.filter(x => x.attempt?.status === 'in_progress').length;
      const pct = students.length ? Math.round(started / students.length * 100) : 0;
      const title = a.topic || `${strandLabel(a.strand)} — all topics`;
      const available = availableTeacherItems(cls,a.strand,a.topic || '');
      return `
        <article class="v42b-practice-card">
          <div class="v42b-practice-card-head">
            <div>
              <h4>✏️ ${esc(title)}</h4>
              <div class="help">${esc(strandLabel(a.strand))} · ${Number(a.question_count||5)} question target · ${available} currently available</div>
              <div class="help">${esc(dateLabel(a.opens_at,'Starts') || 'Available immediately')} · ${esc(dateLabel(a.closes_at,'Target due') || 'No target due date')}</div>
            </div>
            <span class="tag ${a.active?'availability-on':'availability-off'}">${a.active?'Active':'Inactive'}</span>
          </div>
          <div class="v42b-practice-stats">
            <span class="tag">${started}/${students.length} started</span>
            <span class="tag">${completed} completed</span>
            <span class="tag">${inProgress} in progress</span>
            <span class="tag">${students.length-started} not started</span>
          </div>
          <div class="participation-bar"><span style="width:${pct}%"></span></div>
          <details class="v42b-practice-student-list">
            <summary>Student participation</summary>
            ${attempts.map(({student,attempt}) => {
              const status = attempt?.status === 'completed' ? 'Completed' : attempt ? 'In progress' : 'Not started';
              const className = attempt?.status === 'completed' ? 'completed' : attempt ? 'in-progress' : 'incomplete';
              const session = attempt?.practice_session_id && typeof teacherResults !== 'undefined'
                ? (teacherResults || []).find(r => String(r.id) === String(attempt.practice_session_id))
                : null;
              const detail = session && Number.isFinite(Number(session.mastery_percent))
                ? ` · ${Number(session.mastery_percent)}% mastery`
                : '';
              return `<div class="roster-row"><div><strong>${esc(student.student_name)}</strong><div class="help">${esc(student.student_id)}${esc(detail)}</div></div><span class="attempt-status ${className}">${status}</span></div>`;
            }).join('') || '<div class="empty">No active students.</div>'}
          </details>
          <div class="buttons">
            <button class="outline v42b-toggle-practice-assignment" data-id="${esc(a.id)}" data-active="${a.active?'true':'false'}" type="button">${a.active?'Deactivate':'Activate'}</button>
          </div>
        </article>
      `;
    }).join('');

    root.querySelectorAll('.v42b-toggle-practice-assignment').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        const nextActive = button.dataset.active !== 'true';
        const {error} = await cloud.from('practice_assignments')
          .update({active:nextActive,updated_at:new Date().toISOString()})
          .eq('id',button.dataset.id);
        if (error) teacherFeedback('incorrect',error.message);
        else {
          teacherFeedback('correct',nextActive?'Practice assignment activated.':'Practice assignment deactivated.');
          await loadTeacherPracticeData();
          renderTeacherPracticeList();
        }
        button.disabled = false;
      });
    });
  }

  function ensureTeacherPracticeAdmin(){
    const anchor = document.getElementById('assignment-list');
    if (!anchor || document.getElementById(TEACHER_SECTION_ID)) return;

    const section = document.createElement('section');
    section.id = TEACHER_SECTION_ID;
    section.className = 'v42b-practice-admin';
    section.innerHTML = `
      <div class="header">
        <div>
          <h3>Assign targeted Practice</h3>
          <p class="muted">Set a short strand or topic Practice target for this class. Students complete it through the normal secure Practice engine.</p>
        </div>
        <span class="tag">V4.2B</span>
      </div>
      <div class="info">Opening and due dates are learning targets, not hard access blocks. If fewer matching questions are available than requested, the assignment safely uses the available number.</div>
      <div class="v42b-practice-admin-grid">
        <label>Strand<select id="v42b-practice-strand"></select></label>
        <label>Topic<select id="v42b-practice-topic"><option value="">All topics in this strand</option></select></label>
        <label>Question target<input id="v42b-practice-count" type="number" min="1" max="20" value="5"><span class="help">Usually 5 or 10 questions.</span></label>
        <label>Suggested start<input id="v42b-practice-opens" type="datetime-local"><span class="help">Does not restrict access.</span></label>
        <label>Target due date<input id="v42b-practice-closes" type="datetime-local"><span class="help">Students can still complete it afterwards.</span></label>
        <div class="wide help" id="v42b-practice-availability"></div>
      </div>
      <button id="v42b-save-practice-assignment" class="primary" type="button">Assign Practice</button>
      <div id="v42b-practice-feedback" class="feedback hidden"></div>
      <div id="v42b-practice-list" class="v42b-practice-list"></div>
    `;
    anchor.insertAdjacentElement('afterend',section);

    const strand = section.querySelector('#v42b-practice-strand');
    const entries = typeof STRANDS === 'object' && STRANDS ? Object.entries(STRANDS) : [];
    strand.innerHTML = entries.map(([key,label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join('');
    if (!strand.value && entries.length) strand.value = entries[0][0];

    strand.addEventListener('change',populateTeacherTopics);
    section.querySelector('#v42b-practice-topic').addEventListener('change',populateTeacherTopics);
    section.querySelector('#v42b-save-practice-assignment').addEventListener('click',saveTeacherPracticeAssignment);
    populateTeacherTopics();
  }

  async function saveTeacherPracticeAssignment(){
    const cls = selectedTeacherClass();
    if (!cls) {
      teacherFeedback('try','Select a class first.');
      return;
    }
    const strand = document.getElementById('v42b-practice-strand')?.value || '';
    const topic = document.getElementById('v42b-practice-topic')?.value || '';
    const requested = Math.max(1,Math.min(20,Number(document.getElementById('v42b-practice-count')?.value)||5));
    const opens = document.getElementById('v42b-practice-opens')?.value || '';
    const closes = document.getElementById('v42b-practice-closes')?.value || '';
    const available = availableTeacherItems(cls,strand,topic);

    if (!strand) {
      teacherFeedback('try','Choose a strand.');
      return;
    }
    if (available < 1) {
      teacherFeedback('try','No active questions match this strand/topic for the selected class year.');
      return;
    }
    if (opens && closes && Date.parse(closes) <= Date.parse(opens)) {
      teacherFeedback('try','Target due date must be after the suggested start.');
      return;
    }

    const payload = {
      class_id:cls.id,
      strand,
      topic:topic || null,
      question_count:requested,
      opens_at:opens ? new Date(opens).toISOString() : null,
      closes_at:closes ? new Date(closes).toISOString() : null,
      active:true,
      updated_at:new Date().toISOString()
    };
    if (typeof teacherUser !== 'undefined' && teacherUser?.id) payload.created_by = teacherUser.id;

    const button = document.getElementById('v42b-save-practice-assignment');
    button.disabled = true;
    const {error} = await cloud.from('practice_assignments').insert(payload);
    if (error) teacherFeedback('incorrect',error.message);
    else {
      const actual = Math.min(requested,available);
      teacherFeedback('correct',`Practice assigned. Students will receive ${actual} matching question${actual===1?'':'s'}.`);
      await loadTeacherPracticeData();
      renderTeacherPracticeList();
    }
    button.disabled = false;
  }

  async function refreshTeacherPracticeAdmin(){
    ensureTeacherPracticeAdmin();
    const section = document.getElementById(TEACHER_SECTION_ID);
    if (!section || !selectedTeacherClass()) return;
    populateTeacherTopics();
    try {
      await loadTeacherPracticeData();
      renderTeacherPracticeList();
    } catch (error) {
      teacherFeedback('incorrect',`Could not load targeted Practice assignments. ${error?.message || ''}`.trim());
    }
  }

  function practiceAssignmentTitle(a){
    return a?.topic || `${strandLabel(a?.strand)} Practice`;
  }

  function practiceAssignmentStatus(a){
    if (a?.status === 'completed') return 'Completed';
    if (a?.status === 'in_progress') return 'In progress';
    return 'Not started';
  }

  async function rpcPracticeAssignments(token){
    const {data,error} = await cloud.rpc('get_student_practice_assignments',{p_access_token:token});
    if (error) throw error;
    return data || {assignments:[]};
  }

  function renderStudentPracticeAssignments(data){
    const root = document.getElementById('student-assignments-list');
    if (!root) return;

    document.getElementById(STUDENT_SECTION_ID)?.remove();
    const section = document.createElement('section');
    section.id = STUDENT_SECTION_ID;
    section.innerHTML = `
      <div class="v42b-section-head">
        <h2>✏️ Practice Assignments</h2>
        <p class="muted">Short focused Practice sets assigned by your teacher.</p>
      </div>
      <div class="v42b-assignment-grid"></div>
    `;
    root.prepend(section);

    const list = section.querySelector('.v42b-assignment-grid');
    const assignments = Array.isArray(data?.assignments) ? data.assignments : [];
    if (!assignments.length) {
      list.innerHTML = '<div class="empty">No targeted Practice assignments right now.</div>';
      return;
    }

    list.innerHTML = assignments.map(a => {
      const completed = a.status === 'completed';
      const inProgress = a.status === 'in_progress';
      const result = a.attempt || {};
      const due = dateLabel(a.closes_at,'Target due');
      const count = Number(a.recommended_count || 0);
      const label = practiceAssignmentTitle(a);
      const mastery = Number(result.mastery_percent);
      return `
        <article class="v42b-student-card">
          <div class="v42b-student-card-head">
            <div>
              <h3>${completed?'✅':'✏️'} ${esc(label)}</h3>
              <div class="help">${esc(strandLabel(a.strand))}${a.topic?` · ${esc(a.topic)}`:''} · ${count || Number(a.question_count||0)} question${count===1?'':'s'}</div>
              <div class="help">${esc(timingLabel(a))}${due?` · ${esc(due)}`:''}${completed&&Number.isFinite(mastery)?` · ${mastery}% mastery`:''}</div>
            </div>
            <span class="tag">${esc(practiceAssignmentStatus(a))}</span>
          </div>
          <p class="muted" style="margin:10px 0 0">${inProgress?'Your previous assigned set was not completed. Start the focused set again to finish the assignment.':completed?'This assigned Practice has been completed.':'Complete this focused set using the normal Practice feedback and learning tools.'}</p>
          <div class="v42b-student-actions">
            ${completed && result.result_code
              ? `<button type="button" class="outline v42b-view-practice-result" data-code="${esc(result.result_code)}">View Result</button>`
              : `<button type="button" class="primary v42b-start-practice-assignment" data-id="${esc(a.assignment_id)}" ${count<1?'disabled':''}>${inProgress?'Continue Assignment':'Start Assignment'}</button>`}
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('.v42b-start-practice-assignment').forEach(button => {
      button.addEventListener('click',() => startPracticeAssignment(button.dataset.id,button));
    });
    list.querySelectorAll('.v42b-view-practice-result').forEach(button => {
      button.addEventListener('click',() => {
        if (typeof openStudentReview === 'function') openStudentReview(button.dataset.code || '');
        else document.getElementById('check-reviewed-btn')?.click();
      });
    });
  }

  async function loadStudentPracticeAssignments(practiceAccess){
    try {
      const data = await rpcPracticeAssignments(practiceAccess.access_token);
      renderStudentPracticeAssignments(data);
    } catch (error) {
      const root = document.getElementById('student-assignments-list');
      if (!root) return;
      const section = document.createElement('section');
      section.id = STUDENT_SECTION_ID;
      section.innerHTML = `<div class="feedback incorrect">Could not load Practice assignments. ${esc(error?.message || '')}</div>`;
      root.prepend(section);
    }
  }

  async function openCombinedAssignments(){
    if (studentOpenBusy) return;
    studentOpenBusy = true;
    try {
      const examAccess = await validateStudentAccess('exam');
      if (!examAccess?.access_token) return;
      if (typeof show === 'function') show('student-assignments');
      if (typeof loadStudentAssignmentsV36 === 'function') {
        await loadStudentAssignmentsV36(examAccess.access_token);
      }
      const practiceAccess = await validateStudentAccess('practice');
      if (practiceAccess?.access_token) await loadStudentPracticeAssignments(practiceAccess);
    } finally {
      studentOpenBusy = false;
    }
  }

  async function startPracticeAssignment(assignmentOrId, button){
    const assignmentId = typeof assignmentOrId === 'object'
      ? assignmentOrId.assignment_id
      : assignmentOrId;
    if (!assignmentId) return;

    const original = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Starting…';
    }

    try {
      const access = await validateStudentAccess('practice');
      if (!access?.access_token) return;

      const {data,error} = await cloud.rpc('start_student_practice_assignment',{
        p_access_token:access.access_token,
        p_assignment_id:assignmentId
      });
      if (error) throw error;
      if (data?.already_completed) {
        alert('This Practice assignment is already completed.');
        await openCombinedAssignments();
        return;
      }
      if (!Number(data?.recommended_count || 0)) {
        throw new Error('No matching Practice questions are currently available.');
      }

      activeAssignmentContext = {
        assignmentId:data.assignment_id,
        attemptId:data.attempt_id,
        accessToken:access.access_token,
        title:data.topic || `${strandLabel(data.strand)} Practice`,
        completing:false
      };

      if (typeof startRecommendedPracticeV35 !== 'function') {
        throw new Error('Practice is not available yet.');
      }
      studentPracticeRecommendationV35 = {
        practice_scope:data.topic ? 'topic' : 'strand',
        practice_strand:data.strand,
        practice_topic:data.topic || 'all',
        focus_strand:data.strand,
        focus_topic:data.topic || null,
        recommended_count:Number(data.recommended_count),
        reason:'teacher_assignment',
        assignment_id:data.assignment_id
      };
      await startRecommendedPracticeV35();
    } catch (error) {
      console.warn('Could not start Practice assignment.',error);
      alert(`Practice assignment could not start. ${error?.message || ''}`.trim());
      activeAssignmentContext = null;
    } finally {
      if (button && document.contains(button)) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  window.startPracticeAssignmentV42B = startPracticeAssignment;

  function assignmentResultNote(kind, title, body){
    document.querySelector('.v42b-assignment-result-note')?.remove();
    const result = document.getElementById('result');
    const anchor = result?.querySelector('.v41-recovery-panel') || document.getElementById('review');
    if (!result || !anchor) return;
    const note = document.createElement('div');
    note.className = `v42b-assignment-result-note ${kind||''}`;
    note.innerHTML = `<strong>${esc(title)}</strong><span>${esc(body)}</span>`;
    anchor.insertAdjacentElement('beforebegin',note);
  }

  async function completeActivePracticeAssignment(){
    const context = activeAssignmentContext;
    if (!context || context.completing) return;
    const result = document.getElementById('result');
    if (!result?.classList.contains('active')) return;

    const code = text(document.getElementById('result-code')?.textContent);
    if (!code) {
      assignmentResultNote('','Assignment still in progress','This Practice result did not sync to the cloud, so the teacher assignment could not be completed yet.');
      activeAssignmentContext = null;
      return;
    }

    context.completing = true;
    try {
      const {data,error} = await cloud.rpc('complete_student_practice_assignment',{
        p_access_token:context.accessToken,
        p_attempt_id:context.attemptId,
        p_result_code:code
      });
      if (error) throw error;
      assignmentResultNote(
        'correct',
        '✅ Teacher Practice Assignment completed',
        Number.isFinite(Number(data?.mastery_percent))
          ? `${context.title} is complete with ${Number(data.mastery_percent)}% mastery.`
          : `${context.title} is complete and has been recorded for your teacher.`
      );
    } catch (error) {
      console.warn('Could not complete Practice assignment.',error);
      assignmentResultNote('try','Assignment still in progress',error?.message || 'Complete the full assigned set to finish this assignment.');
    } finally {
      activeAssignmentContext = null;
    }
  }

  function wireResultCompletion(){
    const result = document.getElementById('result');
    if (!result || result.dataset.v42bAssignmentObserver === '1') return;
    result.dataset.v42bAssignmentObserver = '1';
    const observer = new MutationObserver(() => {
      if (result.classList.contains('active')) completeActivePracticeAssignment();
    });
    observer.observe(result,{attributes:true,attributeFilter:['class']});
  }

  async function practiceAssignmentForHome(){
    const access = await validateStudentAccess('practice');
    if (!access?.access_token) return null;
    const data = await rpcPracticeAssignments(access.access_token);
    const rows = Array.isArray(data?.assignments) ? data.assignments : [];
    return rows
      .filter(a => a?.timing_status === 'active' && a?.status !== 'completed' && Number(a?.recommended_count || 0) > 0)
      .sort((a,b) =>
        (a.status === 'in_progress' ? 0 : 1) - (b.status === 'in_progress' ? 0 : 1) ||
        (Date.parse(a.closes_at || '9999-12-31') - Date.parse(b.closes_at || '9999-12-31'))
      )[0] || null;
  }

  async function promotePracticeAssignmentOnHome(){
    if (homeRefreshBusy) return;
    const dashboard = document.querySelector('#start .v40c3-home-dashboard.v40c3-ready');
    if (!dashboard) return;
    const currentButton = dashboard.querySelector('.v40c3-priority-action');
    if (!currentButton) return;

    // Existing Exam assignments remain higher priority than Practice assignments.
    const currentAction = text(currentButton.textContent);
    if (currentAction === 'Continue Assignment' || currentAction === 'Open Assignment') return;

    homeRefreshBusy = true;
    try {
      const assignment = await practiceAssignmentForHome();
      if (!assignment) return;
      const card = dashboard.querySelector('.v40c3-priority-card');
      if (!card || card.dataset.v42bAssignmentId === String(assignment.assignment_id)) return;
      card.dataset.v42bAssignmentId = assignment.assignment_id;
      const label = practiceAssignmentTitle(assignment);
      const due = assignment.closes_at ? dateLabel(assignment.closes_at,'Target due') : '';
      const inProgress = assignment.status === 'in_progress';
      card.innerHTML = `
        <div>
          <div class="v40c3-priority-kicker">Teacher Practice Assignment</div>
          <h2 class="v40c3-priority-title">✏️ ${esc(inProgress?`Continue ${label}`:`Complete ${label}`)}</h2>
          <p class="v40c3-priority-text">${esc(inProgress?'Your assigned focused Practice is still in progress. Complete the full set before moving to optional practice.':'Your teacher has assigned a focused Practice set. Assigned work comes before optional Focus or Recommended Practice.')}</p>
          <div class="v40c3-priority-meta">
            <span>${Number(assignment.recommended_count||0)} questions</span>
            <span>${esc(assignment.topic || strandLabel(assignment.strand))}</span>
            ${due?`<span>${esc(due)}</span>`:''}
          </div>
        </div>
        <button type="button" class="primary v40c3-priority-action">${inProgress?'Continue Assignment':'Start Assignment'}</button>
      `;
      card.querySelector('.v40c3-priority-action')?.addEventListener('click',event => startPracticeAssignment(assignment,event.currentTarget));
    } catch (error) {
      console.warn('Could not refresh Practice assignment priority.',error);
    } finally {
      homeRefreshBusy = false;
    }
  }

  function wireHomePriority(){
    const root = document.querySelector('#start .v40c3-home-dashboard');
    if (!root || root.dataset.v42bHomeObserver === '1') return;
    root.dataset.v42bHomeObserver = '1';
    const observer = new MutationObserver(() => {
      if (root.classList.contains('v40c3-ready')) setTimeout(promotePracticeAssignmentOnHome,0);
    });
    observer.observe(root,{childList:true,subtree:false,attributes:true,attributeFilter:['class']});
    if (root.classList.contains('v40c3-ready')) promotePracticeAssignmentOnHome();
  }

  function wireStudentAssignments(){
    const button = document.getElementById('my-assignments-btn');
    if (button) button.onclick = openCombinedAssignments;
  }

  function wireTeacherAdmin(){
    const assignmentList = document.getElementById('assignment-list');
    if (assignmentList && assignmentList.dataset.v42bObserver !== '1') {
      assignmentList.dataset.v42bObserver = '1';
      const observer = new MutationObserver(() => setTimeout(refreshTeacherPracticeAdmin,0));
      observer.observe(assignmentList,{childList:true});
    }
    document.querySelector('[data-panel="classes-panel"]')?.addEventListener('click',() => setTimeout(refreshTeacherPracticeAdmin,0));
    document.getElementById('refresh-classes')?.addEventListener('click',() => setTimeout(refreshTeacherPracticeAdmin,300));
    setTimeout(refreshTeacherPracticeAdmin,0);
  }

  function boot(){
    injectStyles();
    wireStudentAssignments();
    wireTeacherAdmin();
    wireResultCompletion();
    wireHomePriority();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
