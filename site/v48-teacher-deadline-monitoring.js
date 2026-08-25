/* V4.8A — Teacher Assignment Deadline Monitoring.
   Read-only teacher workflow layer. Reuses existing Practice assignment target dates,
   recipients and attempts. Target dates remain guidance only and do not block access.
   V5.0B2 hardening: selected-class reads and event-driven refreshes only. */
(() => {
  'use strict';

  const STYLE_ID = 'v48a-teacher-deadline-style';
  const PANEL_ID = 'v48a-deadline-monitoring';
  const ASSIGNMENT_SECTION_ID = 'v43b-practice-assignment-admin';
  const ASSIGNMENT_LIST_ID = 'v43b-list';
  const DUE_SOON_MS = 48 * 60 * 60 * 1000;

  let assignments = [];
  let recipients = [];
  let attempts = [];
  let busy = false;
  let queued = false;
  let refreshRequested = false;
  let refreshTimer = null;
  let listObserver = null;
  let teacherObserver = null;

  function text(value){ return String(value ?? '').trim(); }

  function html(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{
        margin:14px 0;
        border:1px solid var(--border);
        border-radius:15px;
        padding:14px;
        background:color-mix(in srgb,var(--soft) 28%,var(--card));
      }
      #${PANEL_ID} .v48a-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        flex-wrap:wrap;
      }
      #${PANEL_ID} .v48a-head h4{margin:0 0 4px}
      #${PANEL_ID} .v48a-summary{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;
        margin:12px 0;
      }
      #${PANEL_ID} .v48a-summary-card{
        border:1px solid var(--border);
        border-radius:12px;
        padding:10px;
        background:var(--card);
      }
      #${PANEL_ID} .v48a-summary-card strong{display:block;font-size:18px;line-height:1.1}
      #${PANEL_ID} .v48a-summary-card span{font-size:11px;color:var(--muted)}
      #${PANEL_ID} .v48a-list{display:grid;gap:8px}
      #${PANEL_ID} .v48a-row{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:12px;
        align-items:center;
        border:1px solid var(--border);
        border-radius:12px;
        padding:10px 11px;
        background:var(--card);
      }
      #${PANEL_ID} .v48a-row-main strong{display:block;margin-bottom:3px}
      #${PANEL_ID} .v48a-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}
      #${PANEL_ID} .v48a-status{font-weight:700}
      #${PANEL_ID} .v48a-status.overdue{color:var(--danger,#b42318)}
      #${PANEL_ID} .v48a-status.today{color:var(--warning,#a15c00)}
      #${PANEL_ID} .v48a-status.soon{color:var(--primary)}
      #${PANEL_ID} .v48a-status.upcoming{color:var(--muted)}
      #${PANEL_ID} .v48a-status.nodue{color:var(--muted)}
      #${PANEL_ID} .v48a-empty{
        padding:11px;
        border:1px dashed var(--border);
        border-radius:12px;
        color:var(--muted);
        font-size:12px;
      }
      @media(max-width:700px){
        #${PANEL_ID} .v48a-summary{grid-template-columns:1fr 1fr}
        #${PANEL_ID} .v48a-row{grid-template-columns:1fr}
        #${PANEL_ID} .v48a-row button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function selectedClass(){
    if (typeof teacherClasses === 'undefined' || typeof selectedClassId === 'undefined') return null;
    return (teacherClasses || []).find(row => String(row?.id) === String(selectedClassId)) || null;
  }

  function classStudents(cls){
    if (!cls || typeof teacherStudents === 'undefined') return [];
    return (teacherStudents || []).filter(student =>
      String(student?.class_id) === String(cls.id) && student?.active !== false
    );
  }

  function strandLabel(strand){
    return typeof STRANDS === 'object' && STRANDS
      ? (STRANDS[strand] || strand || 'Practice')
      : (strand || 'Practice');
  }

  function recipientsFor(assignmentId){
    return recipients.filter(row => String(row?.assignment_id) === String(assignmentId));
  }

  function attemptFor(assignmentId,studentId){
    return attempts.find(row =>
      String(row?.assignment_id) === String(assignmentId) &&
      String(row?.roster_student_id) === String(studentId)
    ) || null;
  }

  function relevantStudents(assignment,cls){
    const targetRows = recipientsFor(assignment.id);
    const students = classStudents(cls);
    if (!targetRows.length) return students;
    const ids = new Set(targetRows.map(row => String(row?.roster_student_id)));
    return students.filter(student => ids.has(String(student.id)));
  }

  function localDayKey(value){
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function dateTimeLabel(value){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  }

  function deadlineState(assignment,incompleteCount){
    if (!assignment?.active || incompleteCount < 1) return {key:'complete',label:'Complete',rank:99};

    const now = new Date();
    const opens = assignment.opens_at ? new Date(assignment.opens_at) : null;
    const due = assignment.closes_at ? new Date(assignment.closes_at) : null;
    const validOpens = opens && !Number.isNaN(opens.getTime()) ? opens : null;
    const validDue = due && !Number.isNaN(due.getTime()) ? due : null;

    if (validDue){
      if (validDue.getTime() < now.getTime()) return {key:'overdue',label:'Overdue',rank:0};
      if (localDayKey(validDue) === localDayKey(now)) return {key:'today',label:'Due today',rank:1};
      if (validDue.getTime() - now.getTime() <= DUE_SOON_MS) return {key:'soon',label:'Due soon',rank:2};
    }

    if (validOpens && validOpens.getTime() > now.getTime()) return {key:'upcoming',label:'Upcoming target start',rank:3};
    if (!validDue) return {key:'nodue',label:'No due date',rank:4};
    return {key:'later',label:'Due later',rank:5};
  }

  function materializeRows(cls){
    return assignments
      .filter(assignment => String(assignment?.class_id) === String(cls?.id) && assignment?.active !== false)
      .map(assignment => {
        const students = relevantStudents(assignment,cls);
        const completed = students.filter(student => attemptFor(assignment.id,student.id)?.status === 'completed').length;
        const incomplete = Math.max(0,students.length-completed);
        return {
          assignment,
          students,
          completed,
          incomplete,
          state:deadlineState(assignment,incomplete)
        };
      })
      .filter(item => item.incomplete > 0)
      .sort((a,b) =>
        a.state.rank-b.state.rank ||
        (Date.parse(a.assignment.closes_at || '9999-12-31') - Date.parse(b.assignment.closes_at || '9999-12-31')) ||
        text(a.assignment.topic).localeCompare(text(b.assignment.topic),undefined,{numeric:true})
      );
  }

  function ensurePanel(){
    const section = document.getElementById(ASSIGNMENT_SECTION_ID);
    const list = document.getElementById(ASSIGNMENT_LIST_ID);
    if (!section || !list) return null;

    let panel = document.getElementById(PANEL_ID);
    if (!panel){
      panel = document.createElement('section');
      panel.id = PANEL_ID;
      list.insertAdjacentElement('beforebegin',panel);
    }
    return panel;
  }

  function counts(rows,key){
    return rows.filter(row => row.state.key === key).length;
  }

  function outstandingLearners(rows,key){
    return rows
      .filter(row => row.state.key === key)
      .reduce((sum,row) => sum + row.incomplete,0);
  }

  function render(){
    const cls = selectedClass();
    const panel = ensurePanel();
    if (!cls || !panel) return;

    const rows = materializeRows(cls);
    const attention = rows.filter(row => ['overdue','today','soon','upcoming','nodue'].includes(row.state.key));
    const overdue = counts(rows,'overdue');
    const today = counts(rows,'today');
    const soon = counts(rows,'soon');
    const noDue = counts(rows,'nodue');

    panel.innerHTML = `
      <div class="v48a-head">
        <div>
          <h4>⏱️ Assignment deadline monitoring</h4>
          <div class="help">${html(cls.name)} · target dates guide follow-up only; students can still finish after a target due date.</div>
        </div>
        <span class="tag">V4.8A</span>
      </div>
      <div class="v48a-summary" aria-label="Practice assignment deadline summary">
        <div class="v48a-summary-card"><strong>${overdue}</strong><span>Overdue assignment${overdue===1?'':'s'} · ${outstandingLearners(rows,'overdue')} learner${outstandingLearners(rows,'overdue')===1?'':'s'}</span></div>
        <div class="v48a-summary-card"><strong>${today}</strong><span>Due today · ${outstandingLearners(rows,'today')} learner${outstandingLearners(rows,'today')===1?'':'s'}</span></div>
        <div class="v48a-summary-card"><strong>${soon}</strong><span>Due within 48 hours · ${outstandingLearners(rows,'soon')} learner${outstandingLearners(rows,'soon')===1?'':'s'}</span></div>
        <div class="v48a-summary-card"><strong>${noDue}</strong><span>Without a due date</span></div>
      </div>
      <div class="v48a-list">
        ${attention.length ? attention.map(item => {
          const assignment = item.assignment;
          const title = assignment.topic || `${strandLabel(assignment.strand)} — all topics`;
          const due = dateTimeLabel(assignment.closes_at);
          const starts = dateTimeLabel(assignment.opens_at);
          return `
            <article class="v48a-row" data-assignment-id="${html(assignment.id)}">
              <div class="v48a-row-main">
                <strong>${html(title)}</strong>
                <div class="help"><span class="v48a-status ${item.state.key}">${html(item.state.label)}</span>${due?` · Target due ${html(due)}`:''}${starts?` · Suggested start ${html(starts)}`:''}</div>
                <div class="v48a-meta">
                  <span class="tag">${item.incomplete} outstanding</span>
                  <span class="tag">${item.completed}/${item.students.length} completed</span>
                  <span class="tag">${Number(assignment.question_count||5)} questions</span>
                </div>
              </div>
              <button type="button" class="outline v48a-review" data-id="${html(assignment.id)}">Review assignment</button>
            </article>`;
        }).join('') : '<div class="v48a-empty">No active Practice assignments currently need deadline follow-up for this class.</div>'}
      </div>
    `;

    panel.querySelectorAll('.v48a-review[data-id]').forEach(button => {
      button.addEventListener('click',() => {
        const target = document.querySelector(`#${ASSIGNMENT_LIST_ID} .v43b-toggle[data-id="${CSS.escape(button.dataset.id || '')}"]`)?.closest('.v43b-card');
        if (!target) return;
        target.scrollIntoView({behavior:'smooth',block:'center'});
        target.animate?.([
          {outline:'2px solid color-mix(in srgb,var(--primary) 80%,transparent)'},
          {outline:'2px solid transparent'}
        ],{duration:1200,easing:'ease-out'});
      });
    });
  }

  async function loadData(){
    if (busy){
      refreshRequested = true;
      return;
    }
    if (typeof cloud === 'undefined' || !cloud || typeof teacherUser === 'undefined' || !teacherUser) return;

    const cls = selectedClass();
    if (!cls) return;
    const classId = String(cls.id);

    busy = true;
    try {
      const assignmentResult = await cloud.from('practice_assignments')
        .select('*')
        .eq('class_id',cls.id)
        .order('created_at',{ascending:false});
      if (assignmentResult.error) throw assignmentResult.error;

      const nextAssignments = assignmentResult.data || [];
      const assignmentIds = nextAssignments.map(row => row?.id).filter(Boolean);
      let nextRecipients = [];
      let nextAttempts = [];

      if (assignmentIds.length){
        const [recipientResult,attemptResult] = await Promise.all([
          cloud.from('practice_assignment_recipients').select('*').in('assignment_id',assignmentIds),
          cloud.from('practice_assignment_attempts').select('*').in('assignment_id',assignmentIds).order('started_at',{ascending:false})
        ]);
        if (recipientResult.error) throw recipientResult.error;
        if (attemptResult.error) throw attemptResult.error;
        nextRecipients = recipientResult.data || [];
        nextAttempts = attemptResult.data || [];
      }

      if (String(selectedClass()?.id || '') !== classId){
        refreshRequested = true;
        return;
      }

      assignments = nextAssignments;
      recipients = nextRecipients;
      attempts = nextAttempts;
      render();
    } catch (error){
      const panel = ensurePanel();
      if (panel) panel.innerHTML = `<div class="v48a-empty">Deadline monitoring could not load: ${html(error?.message || error)}</div>`;
    } finally {
      busy = false;
      if (refreshRequested){
        refreshRequested = false;
        queueRefresh(0);
      }
    }
  }

  function queueRefresh(delay=0){
    if (refreshTimer !== null) return;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      if (queued){
        refreshRequested = true;
        return;
      }
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        wireListObserver();
        loadData();
      });
    },delay);
  }

  function wireListObserver(){
    const list = document.getElementById(ASSIGNMENT_LIST_ID);
    if (!list) return false;
    if (list.dataset.v48aDeadlineWatch === '1') return true;

    list.dataset.v48aDeadlineWatch = '1';
    listObserver?.disconnect();
    listObserver = new MutationObserver(() => queueRefresh(80));
    listObserver.observe(list,{childList:true});
    return true;
  }

  function wireTeacherObserver(){
    const teacher = document.getElementById('teacher');
    if (!teacher || teacherObserver) return;

    teacherObserver = new MutationObserver(() => {
      if (!wireListObserver()) return;
      teacherObserver?.disconnect();
      teacherObserver = null;
      queueRefresh(60);
    });
    teacherObserver.observe(teacher,{childList:true,subtree:true});
  }

  function wire(){
    injectStyles();

    window.addEventListener('math-practice-assignments-changed',() => queueRefresh(40));

    if (wireListObserver()) queueRefresh(60);
    else wireTeacherObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
