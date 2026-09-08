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


/* Phase 4 checkpoint 2 boundary: V48B */

/* V4.8B — Student Deadline Experience.
   Adds student-facing deadline urgency around the already-rendered secure
   Practice assignment cards. Does not make a second assignment-data request. */
(() => {
  'use strict';

  const STYLE_ID = 'v48b-student-deadline-style';
  const SUMMARY_ID = 'v48b-student-deadline-summary';
  let lastSignature = '';

  function text(value){ return String(value ?? '').trim(); }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SUMMARY_ID}{
        border:1px solid var(--border);
        border-radius:14px;
        padding:12px 14px;
        background:var(--surface-soft,var(--card));
        margin:0 0 12px;
      }
      #${SUMMARY_ID} .v48b-summary-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
      #${SUMMARY_ID} h3{margin:0 0 3px;font-size:1rem}
      #${SUMMARY_ID} .v48b-summary-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      .v48b-deadline-chip{display:inline-flex;align-items:center;gap:5px;font-weight:700;white-space:nowrap}
      .v48b-deadline-overdue{border-color:color-mix(in srgb,var(--danger,#c0392b) 48%,var(--border))!important;background:color-mix(in srgb,var(--danger,#c0392b) 7%,var(--card))!important}
      .v48b-deadline-today{border-color:color-mix(in srgb,var(--warning,#b7791f) 45%,var(--border))!important}
      .v48b-deadline-soon{border-color:color-mix(in srgb,var(--primary) 38%,var(--border))!important}
      .v48b-deadline-note{margin-top:7px}
      @media(max-width:700px){
        #${SUMMARY_ID} .v48b-summary-head{display:block}
        .v48b-deadline-chip{white-space:normal}
      }
    `;
    document.head.appendChild(style);
  }

  function localDayKey(value){
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function dueTextFromCard(card){
    const helpText = [...card.querySelectorAll('.help')].map(node => text(node.textContent)).join(' · ');
    const matches = [...helpText.matchAll(/Target due\s+(?!passed\b)([^·\n]+)/gi)];
    return matches.length ? text(matches[matches.length-1][1]) : '';
  }

  function deadlineState(card, nowMs=Date.now()){
    const cardText = text(card?.textContent);
    const dueText = dueTextFromCard(card);
    const dueMs = dueText ? Date.parse(dueText) : NaN;

    if (/Target due passed/i.test(cardText)){
      return {key:'overdue',label:'Overdue',dueText,dueMs:Number.isFinite(dueMs)?dueMs:null};
    }
    if (!dueText || !Number.isFinite(dueMs)){
      return {key:'none',label:'No due date',dueText:'',dueMs:null};
    }

    const diff = dueMs - nowMs;
    if (diff < 0) return {key:'overdue',label:'Overdue',dueText,dueMs};
    if (localDayKey(dueMs) === localDayKey(nowMs)) return {key:'today',label:'Due today',dueText,dueMs};
    if (diff <= 48 * 60 * 60 * 1000) return {key:'soon',label:'Due soon',dueText,dueMs};
    return {key:'later',label:'Due later',dueText,dueMs};
  }

  function cardSignature(){
    const section = document.getElementById('v42b-student-practice-assignments');
    if (!section) return '';
    const cards = [...section.querySelectorAll('.v42b-student-card')];
    return cards.map(card => {
      const button = card.querySelector('.v42b-start-practice-assignment[data-id]');
      const result = card.querySelector('.v42b-view-practice-result');
      const help = [...card.querySelectorAll('.help')].map(node => text(node.textContent)).join('|');
      return `${button?.dataset.id || ''}:${result?'done':'open'}:${help}`;
    }).join('||');
  }

  function renderSummary(states){
    const section = document.getElementById('v42b-student-practice-assignments');
    const grid = section?.querySelector('.v42b-assignment-grid');
    if (!section || !grid) return;

    let root = document.getElementById(SUMMARY_ID);
    if (!root){
      root = document.createElement('div');
      root.id = SUMMARY_ID;
      grid.insertAdjacentElement('beforebegin',root);
    }

    const overdue = states.filter(state => state.key === 'overdue').length;
    const today = states.filter(state => state.key === 'today').length;
    const soon = states.filter(state => state.key === 'soon').length;
    const noDue = states.filter(state => state.key === 'none').length;

    root.innerHTML = `
      <div class="v48b-summary-head">
        <div>
          <h3>⏱️ Your Practice deadlines</h3>
          <div class="help">Target dates help you decide what to finish first.</div>
        </div>
        <span class="tag">${states.length} outstanding</span>
      </div>
      <div class="v48b-summary-chips">
        <span class="tag">${overdue} overdue</span>
        <span class="tag">${today} due today</span>
        <span class="tag">${soon} due soon</span>
        <span class="tag">${noDue} without due date</span>
      </div>
      ${overdue ? '<div class="help v48b-deadline-note">An overdue Practice target is still available to complete.</div>' : ''}
    `;
  }

  function decorate(){
    const section = document.getElementById('v42b-student-practice-assignments');
    if (!section) return;

    const openCards = [...section.querySelectorAll('.v42b-student-card')]
      .filter(card => card.querySelector('.v42b-start-practice-assignment[data-id]'));

    const states = [];
    openCards.forEach(card => {
      card.querySelector('.v48b-deadline-chip')?.remove();
      card.classList.remove('v48b-deadline-overdue','v48b-deadline-today','v48b-deadline-soon');

      const state = deadlineState(card);
      states.push(state);

      const chip = document.createElement('span');
      chip.className = 'tag v48b-deadline-chip';
      chip.textContent = state.key === 'none'
        ? 'No due date'
        : `${state.label}${state.dueText ? ` · ${state.dueText}` : ''}`;

      if (state.key === 'overdue'){
        chip.classList.add('availability-off');
        card.classList.add('v48b-deadline-overdue');
      } else if (state.key === 'today'){
        card.classList.add('v48b-deadline-today');
      } else if (state.key === 'soon'){
        card.classList.add('v48b-deadline-soon');
      }

      card.querySelector('.v42b-student-card-head')?.appendChild(chip);
    });

    renderSummary(states);
  }

  function refreshIfChanged(force=false){
    const signature = cardSignature();
    if (!signature) return;
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    decorate();
  }

  function watch(){
    injectStyles();

    let tries = 0;
    const finder = setInterval(() => {
      tries += 1;
      const section = document.getElementById('v42b-student-practice-assignments');
      if (!section){
        if (tries >= 120) clearInterval(finder);
        return;
      }

      clearInterval(finder);
      refreshIfChanged(true);

      const grid = section.querySelector('.v42b-assignment-grid');
      if (grid){
        const observer = new MutationObserver(() => setTimeout(() => refreshIfChanged(),60));
        observer.observe(grid,{childList:true});
      }

      setInterval(() => refreshIfChanged(true),60 * 1000);
    },250);
  }

  watch();
})();


/* Phase 4 checkpoint 2 boundary: V48C */

/* V4.8C — Practice Deadline Follow-Up.
   Adds teacher-controlled target-date adjustment to the existing V4.8A deadline
   monitor. Reuses practice_assignments.closes_at; target dates remain guidance only.
   V5.0B2 hardening: event-driven refresh/decorate after meaningful assignment changes. */
(() => {
  'use strict';

  const STYLE_ID = 'v48c-deadline-follow-up-style';
  const PANEL_ID = 'v48a-deadline-monitoring';
  const DIALOG_ID = 'v48c-target-dialog';
  let panelObserver = null;
  let teacherObserver = null;
  let decorateQueued = false;

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
      #${PANEL_ID} .v48c-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
      #${DIALOG_ID}{
        width:min(620px,calc(100vw - 28px));
        max-width:620px;
        border:1px solid var(--border);
        border-radius:16px;
        padding:0;
        background:var(--card);
        color:inherit;
        box-shadow:0 18px 60px rgba(0,0,0,.24);
      }
      #${DIALOG_ID}::backdrop{background:rgba(0,0,0,.38)}
      #${DIALOG_ID} .v48c-dialog-inner{padding:18px}
      #${DIALOG_ID} .v48c-editor-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}
      #${DIALOG_ID} .v48c-editor-head h3{margin:0 0 4px}
      #${DIALOG_ID} .v48c-editor-grid{display:grid;gap:12px}
      #${DIALOG_ID} label{margin:0}
      #${DIALOG_ID} .v48c-target-input{width:100%;box-sizing:border-box}
      #${DIALOG_ID} .v48c-editor-buttons{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      #${DIALOG_ID} .v48c-editor-feedback{margin-top:9px;font-size:12px;min-height:18px}
      #${DIALOG_ID} .v48c-editor-feedback.error{color:var(--danger,#b42318)}
      #${DIALOG_ID} .v48c-editor-feedback.ok{color:var(--success,#1f7a45)}
      @media(max-width:700px){
        #${PANEL_ID} .v48c-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}
        #${PANEL_ID} .v48c-actions button{width:100%}
        #${DIALOG_ID} .v48c-editor-buttons{display:grid;grid-template-columns:1fr 1fr}
        #${DIALOG_ID} .v48c-editor-buttons .v48c-cancel{grid-column:1/-1}
        #${DIALOG_ID} .v48c-editor-buttons button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function localInputValue(value){
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,16);
  }

  function displayDate(value){
    if (!value) return 'No due date';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'No due date' : date.toLocaleString();
  }

  function setFeedback(dialog,message,kind=''){
    const root = dialog?.querySelector('.v48c-editor-feedback');
    if (!root) return;
    root.className = `v48c-editor-feedback ${kind}`.trim();
    root.textContent = message || '';
  }

  function closeDialog(dialog){
    if (!dialog) return;
    try { if (dialog.open) dialog.close(); } catch (_) {}
    dialog.remove();
  }

  async function fetchAssignment(id){
    if (typeof cloud === 'undefined' || !cloud) throw new Error('Teacher connection is unavailable.');
    const {data,error} = await cloud.from('practice_assignments')
      .select('id,opens_at,closes_at,active')
      .eq('id',id)
      .limit(1);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) throw new Error('Practice assignment could not be found.');
    return row;
  }

  async function refreshExistingAssignmentUI(){
    try {
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
    } catch (error){
      console.warn('V4.8C could not refresh class admin.',error);
    }
    queueDecorate(120);
  }

  async function saveTarget(dialog,assignment,value){
    const save = dialog.querySelector('.v48c-save');
    const clear = dialog.querySelector('.v48c-clear');
    const cancel = dialog.querySelector('.v48c-cancel');
    [save,clear,cancel].forEach(button => { if (button) button.disabled = true; });
    setFeedback(dialog,value ? 'Saving target date…' : 'Clearing target date…');

    try {
      const payload = {
        closes_at:value,
        updated_at:new Date().toISOString()
      };
      const {error} = await cloud.from('practice_assignments')
        .update(payload)
        .eq('id',assignment.id);
      if (error) throw error;
      setFeedback(dialog,value ? 'Target due date updated.' : 'Target due date cleared.','ok');
      window.dispatchEvent(new CustomEvent('math-practice-assignments-changed',{
        detail:{source:'deadline-target',assignmentId:String(assignment.id)}
      }));
      await refreshExistingAssignmentUI();
      window.setTimeout(() => closeDialog(dialog),650);
    } catch (error){
      setFeedback(dialog,error?.message || String(error),'error');
      [save,clear,cancel].forEach(button => { if (button) button.disabled = false; });
    }
  }

  async function openEditor(button){
    document.getElementById(DIALOG_ID)?.remove();

    button.disabled = true;
    const previousLabel = button.textContent;
    button.textContent = 'Loading…';

    try {
      const assignment = await fetchAssignment(button.dataset.id || '');
      const dialog = document.createElement('dialog');
      dialog.id = DIALOG_ID;
      dialog.innerHTML = `
        <div class="v48c-dialog-inner">
          <div class="v48c-editor-head">
            <div>
              <h3>Adjust Practice target</h3>
              <div class="help">Current target: ${html(displayDate(assignment.closes_at))}</div>
            </div>
            <span class="tag">Target only — access stays open</span>
          </div>
          <div class="v48c-editor-grid">
            <label>New target due date
              <input class="v48c-target-input" type="datetime-local" value="${html(localInputValue(assignment.closes_at))}">
              <span class="help">Choose a revised target, or clear it completely. Students can still complete Practice after a target passes.</span>
            </label>
          </div>
          <div class="v48c-editor-buttons">
            <button type="button" class="primary v48c-save">Save target</button>
            <button type="button" class="outline v48c-clear">Clear due date</button>
            <button type="button" class="outline v48c-cancel">Cancel</button>
          </div>
          <div class="v48c-editor-feedback" aria-live="polite"></div>
        </div>`;

      document.body.appendChild(dialog);
      dialog.addEventListener('cancel',event => {
        event.preventDefault();
        closeDialog(dialog);
      });
      dialog.querySelector('.v48c-cancel')?.addEventListener('click',() => closeDialog(dialog));
      dialog.querySelector('.v48c-clear')?.addEventListener('click',() => saveTarget(dialog,assignment,null));
      dialog.querySelector('.v48c-save')?.addEventListener('click',() => {
        const raw = text(dialog.querySelector('.v48c-target-input')?.value);
        if (!raw){
          setFeedback(dialog,'Choose a target date and time, or use Clear due date.','error');
          return;
        }
        const due = new Date(raw);
        if (Number.isNaN(due.getTime())){
          setFeedback(dialog,'Choose a valid target date and time.','error');
          return;
        }
        if (assignment.opens_at){
          const opens = new Date(assignment.opens_at);
          if (!Number.isNaN(opens.getTime()) && due.getTime() <= opens.getTime()){
            setFeedback(dialog,'Target due date must be after the suggested start.','error');
            return;
          }
        }
        saveTarget(dialog,assignment,due.toISOString());
      });

      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open','');
      dialog.querySelector('.v48c-target-input')?.focus();
    } catch (error){
      window.alert?.(`Could not open target editor: ${error?.message || error}`);
    } finally {
      if (document.contains(button)){
        button.disabled = false;
        button.textContent = previousLabel;
      }
    }
  }

  function decorate(){
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.querySelectorAll('.v48a-row[data-assignment-id]').forEach(row => {
      if (row.dataset.v48cFollowUp === '1') return;
      const review = row.querySelector('.v48a-review[data-id]');
      if (!review) return;

      row.dataset.v48cFollowUp = '1';
      const actions = document.createElement('div');
      actions.className = 'v48c-actions';
      review.replaceWith(actions);
      actions.appendChild(review);

      const adjust = document.createElement('button');
      adjust.type = 'button';
      adjust.className = 'outline v48c-adjust';
      adjust.dataset.id = review.dataset.id || row.dataset.assignmentId || '';
      adjust.textContent = 'Adjust target';
      adjust.addEventListener('click',() => openEditor(adjust));
      actions.appendChild(adjust);
    });
  }

  function queueDecorate(delay=0){
    window.setTimeout(() => {
      if (decorateQueued) return;
      decorateQueued = true;
      window.requestAnimationFrame(() => {
        decorateQueued = false;
        wirePanelObserver();
        decorate();
      });
    },delay);
  }

  function wirePanelObserver(){
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return false;
    if (panel.dataset.v48cWatch === '1') return true;

    panel.dataset.v48cWatch = '1';
    panelObserver?.disconnect();
    panelObserver = new MutationObserver(() => queueDecorate(40));
    panelObserver.observe(panel,{childList:true,subtree:true});
    return true;
  }

  function wireTeacherObserver(){
    const teacher = document.getElementById('teacher');
    if (!teacher || teacherObserver) return;
    if (wirePanelObserver()) return;

    teacherObserver = new MutationObserver(() => {
      if (!wirePanelObserver()) return;
      teacherObserver?.disconnect();
      teacherObserver = null;
      queueDecorate(40);
    });
    teacherObserver.observe(teacher,{childList:true,subtree:true});
  }

  function wire(){
    injectStyles();
    wireTeacherObserver();
    queueDecorate(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
