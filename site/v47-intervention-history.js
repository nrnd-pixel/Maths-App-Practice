/* V4.7A — Learner Intervention History.
   Read-only teacher workflow layer. Reuses existing Practice assignment, recipient,
   attempt and completed-session data to show a longitudinal learner intervention record. */
(() => {
  'use strict';

  const STYLE_ID = 'v47-intervention-history-style';
  const SECTION_ID = 'v47-intervention-history';
  const CACHE_MS = 4000;
  let assignments = [];
  let recipients = [];
  let attempts = [];
  let loadedAt = 0;
  let loadBusy = null;
  let supportObserver = null;
  let queued = false;

  function text(value){ return String(value ?? '').trim(); }
  function lower(value){ return text(value).toLowerCase(); }
  function html(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }
  function dateLabel(value){
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  }
  function strandLabel(value){
    const raw = text(value);
    if (!raw) return 'Practice';
    try {
      if (typeof STRANDS === 'object' && STRANDS && STRANDS[raw]) return STRANDS[raw];
    } catch {}
    return raw;
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${SECTION_ID}{margin-top:20px}
      .v47-history-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:10px;
      }
      .v47-history-head h3{margin:0 0 4px}
      .v47-history-list{display:grid;gap:10px}
      .v47-history-card{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:12px;
        align-items:start;
        border:1px solid var(--border);
        border-radius:14px;
        padding:13px;
        background:var(--card);
      }
      .v47-history-card strong{line-height:1.35}
      .v47-history-meta{display:grid;gap:3px;margin-top:5px}
      .v47-history-actions{
        display:flex;
        gap:7px;
        flex-wrap:wrap;
        justify-content:flex-end;
        align-items:center;
      }
      .v47-history-actions button,
      .v47-history-button{
        min-height:34px;
        padding:6px 9px;
        font-size:11px;
        white-space:nowrap;
      }
      .v47-history-status{
        display:inline-flex;
        align-items:center;
        min-height:30px;
        padding:5px 8px;
        border:1px solid var(--border);
        border-radius:999px;
        font-size:11px;
        font-weight:850;
        white-space:nowrap;
      }
      .v47-history-status.completed{
        background:var(--successbg);
        color:var(--success);
        border-color:color-mix(in srgb,var(--success) 25%,var(--border));
      }
      .v47-history-status.in-progress{
        background:var(--warnbg);
        color:var(--warn);
        border-color:color-mix(in srgb,var(--warn) 25%,var(--border));
      }
      .v47-history-status.not-started,
      .v47-history-status.inactive{
        background:var(--surface-muted,var(--card));
        color:var(--muted);
      }
      .v47-history-outcome{
        margin-top:6px;
        font-weight:650;
      }
      .v47-history-highlight{
        outline:3px solid color-mix(in srgb,var(--primary) 48%,transparent);
        outline-offset:3px;
      }
      .v47-history-empty{
        border:1px dashed var(--border);
        border-radius:13px;
        padding:14px;
        color:var(--muted);
        font-size:12px;
      }
      #v47-history-review-note,
      #v47-history-results-note{margin:0 0 12px}
      @media(max-width:620px){
        .v47-history-card{grid-template-columns:1fr}
        .v47-history-actions{justify-content:stretch}
        .v47-history-actions button,
        .v47-history-status,
        .v47-history-button{width:100%;justify-content:center}
      }
    `;
    document.head.appendChild(style);
  }

  function activeRows(){
    return typeof analyticsVisibleRows !== 'undefined' && Array.isArray(analyticsVisibleRows)
      ? analyticsVisibleRows
      : [];
  }
  function rowForKey(key){
    return activeRows().find(row => String(row?.key) === String(key)) || null;
  }
  function rosterForRow(row){
    try {
      if (typeof analyticsRosterFor === 'function') {
        const roster = analyticsRosterFor(row);
        if (roster) return roster;
      }
    } catch {}
    if (typeof teacherStudents === 'undefined' || !Array.isArray(teacherStudents)) return null;
    const wanted = lower(row?.student_id);
    if (!wanted) return null;
    return teacherStudents.find(student => lower(student?.student_id) === wanted) || null;
  }
  function classForAssignment(assignment,roster){
    if (typeof teacherClasses === 'undefined' || !Array.isArray(teacherClasses)) return null;
    const classId = assignment?.class_id || roster?.class_id;
    return teacherClasses.find(cls => String(cls?.id) === String(classId)) || null;
  }
  function recipientsFor(assignmentId){
    return recipients.filter(row => String(row?.assignment_id) === String(assignmentId));
  }
  function attemptFor(assignmentId,rosterId){
    return attempts.find(row =>
      String(row?.assignment_id) === String(assignmentId) &&
      String(row?.roster_student_id) === String(rosterId)
    ) || null;
  }
  function assignmentAppliesTo(assignment,roster){
    const targetRows = recipientsFor(assignment?.id);
    if (targetRows.length){
      return targetRows.some(row => String(row?.roster_student_id) === String(roster?.id));
    }
    return String(assignment?.class_id) === String(roster?.class_id);
  }
  function sessionForAttempt(attempt){
    if (!attempt?.practice_session_id || typeof teacherResults === 'undefined' || !Array.isArray(teacherResults)) return null;
    return teacherResults.find(session => String(session?.id) === String(attempt.practice_session_id)) || null;
  }
  function statusFor(assignment,attempt){
    if (attempt?.status === 'completed') return {key:'completed',label:'Completed'};
    if (attempt) return {key:'in-progress',label:'In progress'};
    if (assignment?.active === false) return {key:'inactive',label:'Inactive'};
    return {key:'not-started',label:'Not started'};
  }
  function audienceFor(assignment){
    const rows = recipientsFor(assignment?.id);
    if (!rows.length) return 'Whole class';
    if (rows.length === 1) return 'Individual';
    return 'Selected students';
  }

  function historyForRow(row){
    const roster = rosterForRow(row);
    if (!roster) return {roster:null,items:[]};
    const items = assignments
      .filter(assignment => assignmentAppliesTo(assignment,roster))
      .map(assignment => {
        const attempt = attemptFor(assignment.id,roster.id);
        return {
          assignment,
          attempt,
          session:sessionForAttempt(attempt),
          roster,
          cls:classForAssignment(assignment,roster),
          status:statusFor(assignment,attempt),
          audience:audienceFor(assignment)
        };
      })
      .sort((a,b) =>
        Date.parse(b.assignment?.created_at || b.attempt?.started_at || 0) -
        Date.parse(a.assignment?.created_at || a.attempt?.started_at || 0)
      );
    return {roster,items};
  }

  async function loadData(force=false){
    if (!force && loadedAt && Date.now()-loadedAt < CACHE_MS) return true;
    if (loadBusy) return loadBusy;
    if (typeof cloud === 'undefined' || !cloud || typeof teacherUser === 'undefined' || !teacherUser) return false;

    loadBusy = (async() => {
      const [a,b,c] = await Promise.all([
        cloud.from('practice_assignments').select('*').order('created_at',{ascending:false}),
        cloud.from('practice_assignment_recipients').select('*'),
        cloud.from('practice_assignment_attempts').select('*').order('started_at',{ascending:false})
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      if (c.error) throw c.error;
      assignments = a.data || [];
      recipients = b.data || [];
      attempts = c.data || [];
      loadedAt = Date.now();
      return true;
    })().catch(error => {
      console.warn('V4.7A could not load learner intervention history.',error);
      return false;
    }).finally(() => { loadBusy = null; });

    return loadBusy;
  }

  function ensureProfileSection(){
    const profile = document.getElementById('analytics-student-detail');
    if (!profile) return null;
    let section = document.getElementById(SECTION_ID);
    if (section) return section;

    section = document.createElement('section');
    section.id = SECTION_ID;
    section.innerHTML = `
      <div class="v47-history-head">
        <div>
          <h3>Practice intervention history</h3>
          <div class="help">Assigned Practice that applied to this learner. History is not limited by the current Analytics date filter.</div>
        </div>
        <span class="tag">V4.7A</span>
      </div>
      <div class="v47-history-list"><div class="v47-history-empty">Open a registered learner profile to view intervention history.</div></div>
    `;
    const recent = document.getElementById('student-insight-recent');
    if (recent && profile.contains(recent)) recent.insertAdjacentElement('afterend',section);
    else profile.appendChild(section);
    return section;
  }

  function outcomeText(session){
    if (!session) return '';
    const parts = [];
    const mastery = Number(session?.mastery_percent);
    const first = Number(session?.first_try_percent);
    const total = Number(session?.auto_total ?? session?.total ?? 0);
    const hints = Number(session?.hints_used || 0);
    if (Number.isFinite(mastery)) parts.push(`${mastery}% mastery`);
    if (Number.isFinite(first)) parts.push(`${first}% first try`);
    if (total > 0) parts.push(`${total} question${total===1?'':'s'}`);
    parts.push(`${hints} hint${hints===1?'':'s'}`);
    const completed = dateLabel(session?.completed_at);
    if (completed) parts.push(`completed ${completed}`);
    return parts.join(' · ');
  }

  function findAssignmentCard(assignmentId){
    return [...document.querySelectorAll('#v43b-practice-assignment-admin .v43b-toggle[data-id]')]
      .find(button => String(button.dataset.id) === String(assignmentId))
      ?.closest('.v43b-card') || null;
  }
  function waitForAssignmentCard(item,attempt=0){
    const card = findAssignmentCard(item?.assignment?.id);
    if (card){
      const section = document.getElementById('v43b-practice-assignment-admin');
      if (section){
        section.querySelector('#v47-history-review-note')?.remove();
        const note = document.createElement('div');
        note.id = 'v47-history-review-note';
        note.className = 'info';
        note.textContent = `Opened from intervention history for ${text(item.roster?.student_name) || 'this learner'}.`;
        const grid = section.querySelector('.v43b-grid');
        if (grid) grid.insertAdjacentElement('beforebegin',note);
        else section.prepend(note);
      }
      card.classList.add('v47-history-highlight');
      card.scrollIntoView({behavior:'smooth',block:'center'});
      window.setTimeout(() => card.classList.remove('v47-history-highlight'),4200);
      return;
    }
    if (attempt >= 30){
      document.getElementById('v43b-practice-assignment-admin')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    window.setTimeout(() => waitForAssignmentCard(item,attempt+1),100);
  }
  function openAssignment(item){
    if (!item?.assignment || !item?.cls) return;
    try {
      if (typeof selectedClassId !== 'undefined') selectedClassId = item.cls.id;
    } catch {}
    document.querySelector('#teacher .tab[data-panel="classes-panel"]')?.click();
    try {
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
    } catch (error){
      console.warn('V4.7A could not refresh class admin before reviewing Practice.',error);
    }
    waitForAssignmentCard(item);
  }

  function setSelectIfAvailable(select,value){
    if (!select || value == null) return;
    const wanted = String(value);
    const option = [...select.options].find(item => String(item.value) === wanted);
    if (option) select.value = option.value;
  }
  function showResultsNote(session,row){
    const panel = document.getElementById('results-panel');
    if (!panel) return;
    panel.querySelector('#v47-history-results-note')?.remove();
    const note = document.createElement('div');
    note.id = 'v47-history-results-note';
    note.className = 'info';
    note.textContent = `Results filtered to ${text(session?.student_name) || text(row?.student_name) || 'this learner'} from intervention history.`;
    const table = panel.querySelector('.tablewrap');
    if (table) table.insertAdjacentElement('beforebegin',note);
    else panel.prepend(note);
  }
  function highlightResultRow(session){
    const root = document.getElementById('results-body');
    if (!root) return;
    root.querySelectorAll('.v47-history-highlight').forEach(row => row.classList.remove('v47-history-highlight'));
    const targetDate = session?.completed_at ? new Date(session.completed_at).toLocaleString() : '';
    const targetName = text(session?.student_name);
    const row = [...root.querySelectorAll('tr')].find(tr => {
      const cells = tr.querySelectorAll('td');
      return cells.length >= 2 &&
        (!targetDate || text(cells[0]?.textContent) === targetDate) &&
        (!targetName || text(cells[1]?.textContent) === targetName);
    });
    if (!row) return;
    row.classList.add('v47-history-highlight');
    row.scrollIntoView({behavior:'smooth',block:'center'});
    window.setTimeout(() => row.classList.remove('v47-history-highlight'),4200);
  }
  function openResults(row,session){
    if (!session) return;
    const search = document.getElementById('result-search');
    if (search) search.value = text(session?.student_id) || text(row?.student_id) || text(session?.student_name) || text(row?.student_name);
    setSelectIfAvailable(document.getElementById('result-year'),session?.year_level || row?.year_level);
    setSelectIfAvailable(document.getElementById('result-strand'),session?.strand);
    try {
      if (typeof renderResults === 'function') renderResults();
    } catch (error){
      console.warn('V4.7A could not prefilter Results.',error);
    }
    document.querySelector('#teacher .tab[data-panel="results-panel"]')?.click();
    showResultsNote(session,row);
    window.setTimeout(() => highlightResultRow(session),80);
  }

  function renderHistoryCards(section,row,items){
    const root = section?.querySelector('.v47-history-list');
    if (!root) return;
    if (!items.length){
      root.innerHTML = '<div class="v47-history-empty">No assigned Practice history was found for this learner.</div>';
      return;
    }

    root.innerHTML = items.map((item,index) => {
      const assignment = item.assignment || {};
      const title = text(assignment.topic) || `${strandLabel(assignment.strand)} — all topics`;
      const assigned = dateLabel(assignment.created_at) || 'Date unavailable';
      const questions = Number(assignment.question_count || 5);
      const started = dateLabel(item.attempt?.started_at);
      const completed = dateLabel(item.attempt?.completed_at);
      const due = dateLabel(assignment.closes_at);
      const outcome = outcomeText(item.session);
      const action = item.status.key === 'completed' && item.session
        ? `<button type="button" class="outline v47-open-results" data-index="${index}">Open Results</button>`
        : item.cls
          ? `<button type="button" class="outline v47-review-practice" data-index="${index}">Review Practice</button>`
          : '';
      return `
        <article class="v47-history-card">
          <div>
            <strong>${html(title)}</strong>
            <div class="v47-history-meta help">
              <span>${html(strandLabel(assignment.strand))} · ${questions} question target · ${html(item.audience)}</span>
              <span>Assigned ${html(assigned)}${due ? ` · target due ${html(due)}` : ''}</span>
              ${started ? `<span>Started ${html(started)}${completed ? ` · completed ${html(completed)}` : ''}</span>` : ''}
            </div>
            ${outcome ? `<div class="help v47-history-outcome">Recorded outcome: ${html(outcome)}</div>` : ''}
          </div>
          <div class="v47-history-actions">
            <span class="v47-history-status ${html(item.status.key)}">Practice: ${html(item.status.label)}</span>
            ${action}
          </div>
        </article>`;
    }).join('');

    root.querySelectorAll('.v47-review-practice').forEach(button => {
      button.addEventListener('click',() => openAssignment(items[Number(button.dataset.index)]));
    });
    root.querySelectorAll('.v47-open-results').forEach(button => {
      button.addEventListener('click',() => openResults(row,items[Number(button.dataset.index)]?.session));
    });
  }

  async function renderProfileHistory(row,options={}){
    const section = ensureProfileSection();
    if (!section) return;
    const root = section.querySelector('.v47-history-list');
    if (!row?.registered){
      if (root) root.innerHTML = '<div class="v47-history-empty">Intervention history is available for registered roster learners.</div>';
      return;
    }
    if (root) root.innerHTML = '<div class="v47-history-empty">Loading Practice intervention history…</div>';
    const ok = await loadData(Boolean(options.force));
    if (!ok){
      if (root) root.innerHTML = '<div class="v47-history-empty">Intervention history could not be loaded right now.</div>';
      return;
    }
    const history = historyForRow(row);
    renderHistoryCards(section,row,history.items);
    if (options.scroll){
      window.setTimeout(() => section.scrollIntoView({behavior:'smooth',block:'start'}),40);
    }
  }

  function openHistoryForKey(key){
    const rows = activeRows();
    const index = rows.findIndex(row => String(row?.key) === String(key));
    if (index < 0 || typeof openStudentAnalytics !== 'function') return;
    openStudentAnalytics(index);
    const row = rows[index];
    window.setTimeout(() => renderProfileHistory(row,{force:true,scroll:true}),80);
  }

  function decoratePriorityRows(){
    const root = document.getElementById('v42-support-list');
    if (!root) return;
    root.querySelectorAll('.v42-action-row').forEach(rowElement => {
      const profile = rowElement.querySelector('.v42-open-profile[data-key]');
      const actions = rowElement.querySelector('.v44a-action-buttons');
      if (!profile || !actions || actions.querySelector('.v47-history-button')) return;
      const analyticsRow = rowForKey(profile.dataset.key || '');
      if (!analyticsRow?.registered) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline v47-history-button';
      button.textContent = 'History';
      button.addEventListener('click',() => openHistoryForKey(profile.dataset.key || ''));
      const assign = actions.querySelector('.v44a-assign-practice');
      actions.insertBefore(button,assign || null);
    });
  }

  function wrapStudentProfile(){
    try {
      if (typeof openStudentAnalytics !== 'function' || openStudentAnalytics.__v47Wrapped) return;
      const previous = openStudentAnalytics;
      const wrapped = function(...args){
        const result = previous.apply(this,args);
        const index = Number(args[0]);
        const row = activeRows()[index] || null;
        window.setTimeout(() => renderProfileHistory(row,{force:false,scroll:false}),40);
        return result;
      };
      wrapped.__v47Wrapped = true;
      openStudentAnalytics = wrapped;
    } catch (error){
      console.warn('V4.7A could not extend the learner analytics profile.',error);
    }
  }

  function queueDecorate(){
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      wireSupportObserver();
      decoratePriorityRows();
    });
  }
  function wireSupportObserver(){
    const root = document.getElementById('v42-support-list');
    if (!root || root.dataset.v47HistoryWatch === '1') return;
    root.dataset.v47HistoryWatch = '1';
    supportObserver?.disconnect();
    supportObserver = new MutationObserver(queueDecorate);
    supportObserver.observe(root,{childList:true,subtree:true});
  }
  function wireAnalyticsTab(){
    const tab = document.querySelector('#teacher .tab[data-panel="analytics-panel"]');
    if (!tab || tab.dataset.v47History === '1') return;
    tab.dataset.v47History = '1';
    tab.addEventListener('click',() => {
      window.setTimeout(queueDecorate,100);
      const key = typeof selectedAnalyticsStudentKey !== 'undefined' ? selectedAnalyticsStudentKey : '';
      const row = key ? rowForKey(key) : null;
      if (row) window.setTimeout(() => renderProfileHistory(row,{force:true,scroll:false}),140);
    });
  }

  function wire(){
    injectStyles();
    ensureProfileSection();
    wrapStudentProfile();
    wireAnalyticsTab();
    queueDecorate();
    window.setTimeout(queueDecorate,220);
    window.setTimeout(queueDecorate,650);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
