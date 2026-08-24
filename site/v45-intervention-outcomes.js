/* V4.5B — Completed Intervention Outcomes.
   Read-only teacher workflow layer. Shows the recorded Practice-session outcome
   for completed matching interventions without inventing an improvement score. */
(() => {
  'use strict';

  const STYLE_ID = 'v45b-intervention-outcomes-style';
  const CACHE_MS = 4000;
  let assignments = [];
  let recipients = [];
  let attempts = [];
  let loadedAt = 0;
  let loadBusy = null;
  let observer = null;
  let queued = false;

  function text(value){ return String(value ?? '').trim(); }
  function lower(value){ return text(value).toLowerCase(); }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v45b-outcome-detail{
        margin-top:5px;
        font-weight:650;
      }
      .v45b-outcome-chip{
        display:inline-flex;
        align-items:center;
        min-height:30px;
        padding:5px 8px;
        border:1px solid color-mix(in srgb,var(--primary) 24%,var(--border));
        border-radius:999px;
        background:color-mix(in srgb,var(--soft) 42%,var(--card));
        color:var(--primary);
        font-size:11px;
        font-weight:850;
        white-space:nowrap;
      }
      .v45b-open-results{
        min-height:36px;
        padding:7px 10px;
        font-size:12px;
        white-space:nowrap;
      }
      .v45b-result-highlight{
        outline:3px solid color-mix(in srgb,var(--primary) 52%,transparent);
        outline-offset:-3px;
        background:color-mix(in srgb,var(--soft) 42%,var(--card)) !important;
      }
      #v45b-results-note{
        margin:0 0 12px;
      }
      @media(max-width:520px){
        .v45b-outcome-chip,
        .v45b-open-results{
          width:100%;
          justify-content:center;
        }
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
    const wantedId = lower(row?.student_id);
    if (!wantedId) return null;
    return teacherStudents.find(student => lower(student?.student_id) === wantedId) || null;
  }

  function classForRoster(roster){
    if (!roster || typeof teacherClasses === 'undefined' || !Array.isArray(teacherClasses)) return null;
    return teacherClasses.find(cls => String(cls?.id) === String(roster?.class_id)) || null;
  }

  function answersForRow(row){
    const answers = typeof analyticsContext !== 'undefined' && Array.isArray(analyticsContext?.answers)
      ? analyticsContext.answers
      : [];
    if (typeof analyticsKey !== 'function') return [];
    return answers.filter(answer => {
      try { return analyticsKey(answer?.practice_sessions || {}) === row?.key; }
      catch { return false; }
    });
  }

  function focusForRow(row){
    if (typeof aggregateLearning !== 'function' || typeof learningBand !== 'function') return null;
    return aggregateLearning(answersForRow(row))
      .map(topic => ({topic,band:learningBand(topic)}))
      .filter(item => item.band?.key === 'needs-attention' || item.band?.key === 'developing')
      .sort((a,b) => {
        const rankA = a.band.key === 'needs-attention' ? 0 : 1;
        const rankB = b.band.key === 'needs-attention' ? 0 : 1;
        if (rankA !== rankB) return rankA-rankB;
        return Number(a.topic.percent ?? 101)-Number(b.topic.percent ?? 101) ||
          Number(b.topic.scored || 0)-Number(a.topic.scored || 0);
      })[0] || null;
  }

  function strandForFocus(row,focus){
    const topicName = lower(focus?.topic?.topic);
    if (!topicName) return '';

    const counts = new Map();
    answersForRow(row).forEach(answer => {
      const answerTopic = lower(answer?.topic) || lower(answer?.practice_sessions?.topic);
      const strand = text(answer?.strand || answer?.practice_sessions?.strand);
      if (answerTopic !== topicName || !strand) return;
      counts.set(strand,(counts.get(strand) || 0)+1);
    });
    if (counts.size){
      return [...counts.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0][0];
    }

    const questions = typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)
      ? teacherQuestions
      : [];
    const strands = [...new Set(questions
      .filter(question => question?.active !== false &&
        Number(question?.year_level) === Number(row?.year_level) &&
        lower(question?.topic) === topicName)
      .map(question => text(question?.strand))
      .filter(Boolean))];
    return strands.length === 1 ? strands[0] : '';
  }

  function recipientsFor(assignmentId){
    return recipients.filter(row => String(row?.assignment_id) === String(assignmentId));
  }

  function assignmentAppliesTo(assignment,roster){
    const targetRows = recipientsFor(assignment.id);
    if (!targetRows.length) return true;
    return targetRows.some(row => String(row?.roster_student_id) === String(roster?.id));
  }

  function completedAttemptFor(assignmentId,rosterId){
    return attempts.find(row =>
      String(row?.assignment_id) === String(assignmentId) &&
      String(row?.roster_student_id) === String(rosterId) &&
      row?.status === 'completed' &&
      row?.practice_session_id
    ) || null;
  }

  function completedMatchingIntervention(row){
    const roster = rosterForRow(row);
    const cls = classForRoster(roster);
    const focus = focusForRow(row);
    if (!roster || !cls || !focus) return null;

    const topic = text(focus?.topic?.topic);
    const strand = strandForFocus(row,focus);
    if (!topic || !strand) return null;

    const matches = assignments
      .filter(assignment =>
        assignment?.active !== false &&
        String(assignment?.class_id) === String(cls.id) &&
        lower(assignment?.strand) === lower(strand) &&
        (!text(assignment?.topic) || lower(assignment?.topic) === lower(topic)) &&
        assignmentAppliesTo(assignment,roster)
      )
      .map(assignment => ({
        assignment,
        attempt:completedAttemptFor(assignment.id,roster.id),
        exactTopic:lower(assignment?.topic) === lower(topic),
        roster,
        cls,
        focus,
        topic,
        strand
      }))
      .filter(item => item.attempt?.practice_session_id);

    if (!matches.length) return null;
    matches.sort((a,b) =>
      Number(b.exactTopic)-Number(a.exactTopic) ||
      Date.parse(b.attempt?.completed_at || b.attempt?.updated_at || 0)-Date.parse(a.attempt?.completed_at || a.attempt?.updated_at || 0) ||
      Date.parse(b.assignment?.created_at || 0)-Date.parse(a.assignment?.created_at || 0)
    );
    return matches[0];
  }

  function sessionForAttempt(attempt){
    if (!attempt?.practice_session_id || typeof teacherResults === 'undefined' || !Array.isArray(teacherResults)) return null;
    return teacherResults.find(session => String(session?.id) === String(attempt.practice_session_id)) || null;
  }

  async function loadData(force=false){
    if (!force && loadedAt && Date.now()-loadedAt < CACHE_MS) return true;
    if (loadBusy) return loadBusy;
    if (typeof cloud === 'undefined' || !cloud || typeof teacherUser === 'undefined' || !teacherUser) return false;

    loadBusy = (async() => {
      const [a,b,c] = await Promise.all([
        cloud.from('practice_assignments')
          .select('id,class_id,strand,topic,active,created_at')
          .order('created_at',{ascending:false}),
        cloud.from('practice_assignment_recipients')
          .select('assignment_id,roster_student_id'),
        cloud.from('practice_assignment_attempts')
          .select('assignment_id,roster_student_id,status,practice_session_id,completed_at,updated_at')
          .order('completed_at',{ascending:false})
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
      console.warn('V4.5B could not load completed Practice outcomes.',error);
      return false;
    }).finally(() => { loadBusy = null; });

    return loadBusy;
  }

  function cleanOutcome(rowElement){
    rowElement.querySelector('.v45b-outcome-detail')?.remove();
    rowElement.querySelector('.v45b-outcome-chip')?.remove();
    rowElement.querySelector('.v45b-open-results')?.remove();
    delete rowElement.dataset.v45bOutcomeSession;
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
    panel.querySelector('#v45b-results-note')?.remove();
    const note = document.createElement('div');
    note.id = 'v45b-results-note';
    note.className = 'info';
    const topic = text(session?.topic) || text(row?.student_name) || 'completed Practice';
    note.textContent = `Results filtered to ${text(session?.student_name) || text(row?.student_name) || 'this learner'} for the completed intervention (${topic}).`;
    const table = panel.querySelector('.tablewrap');
    if (table) table.insertAdjacentElement('beforebegin',note);
    else panel.prepend(note);
  }

  function highlightResultRow(session){
    const root = document.getElementById('results-body');
    if (!root) return;
    root.querySelectorAll('.v45b-result-highlight').forEach(row => row.classList.remove('v45b-result-highlight'));
    const targetDate = session?.completed_at ? new Date(session.completed_at).toLocaleString() : '';
    const targetName = text(session?.student_name);
    const row = [...root.querySelectorAll('tr')].find(tr => {
      const cells = tr.querySelectorAll('td');
      return cells.length >= 2 &&
        (!targetDate || text(cells[0]?.textContent) === targetDate) &&
        (!targetName || text(cells[1]?.textContent) === targetName);
    });
    if (!row) return;
    row.classList.add('v45b-result-highlight');
    row.scrollIntoView({behavior:'smooth',block:'center'});
    window.setTimeout(() => row.classList.remove('v45b-result-highlight'),5000);
  }

  function openResults(row,session){
    const search = document.getElementById('result-search');
    if (search) search.value = text(session?.student_id) || text(row?.student_id) || text(session?.student_name) || text(row?.student_name);
    setSelectIfAvailable(document.getElementById('result-year'),session?.year_level || row?.year_level);
    setSelectIfAvailable(document.getElementById('result-strand'),session?.strand);

    try {
      if (typeof renderResults === 'function') renderResults();
    } catch (error){
      console.warn('V4.5B could not prefilter Results.',error);
    }

    document.querySelector('#teacher .tab[data-panel="results-panel"]')?.click();
    showResultsNote(session,row);
    window.setTimeout(() => highlightResultRow(session),80);
  }

  function outcomeText(session){
    const mastery = Number(session?.mastery_percent);
    const first = Number(session?.first_try_percent);
    const total = Number(session?.auto_total ?? session?.total ?? 0);
    const hints = Number(session?.hints_used || 0);
    const when = session?.completed_at ? new Date(session.completed_at).toLocaleString() : '';
    const parts = [];
    if (Number.isFinite(mastery)) parts.push(`${mastery}% mastery`);
    if (Number.isFinite(first)) parts.push(`${first}% first try`);
    if (total > 0) parts.push(`${total} question${total===1?'':'s'}`);
    parts.push(`${hints} hint${hints===1?'':'s'}`);
    if (when) parts.push(`completed ${when}`);
    return parts.join(' · ');
  }

  function decoratePriorityRows(){
    const root = document.getElementById('v42-support-list');
    if (!root) return;

    root.querySelectorAll('.v42-action-row').forEach(rowElement => {
      const completedChip = rowElement.querySelector('.v44c-intervention-status.completed');
      const profile = rowElement.querySelector('.v42-open-profile[data-key]');
      const actions = rowElement.querySelector('.v44a-action-buttons');
      if (!completedChip || !profile || !actions){
        if (rowElement.dataset.v45bOutcomeSession) cleanOutcome(rowElement);
        return;
      }

      const analyticsRow = rowForKey(profile.dataset.key || '');
      const item = analyticsRow ? completedMatchingIntervention(analyticsRow) : null;
      const session = sessionForAttempt(item?.attempt);
      if (!item || !session){
        if (rowElement.dataset.v45bOutcomeSession) cleanOutcome(rowElement);
        return;
      }

      if (rowElement.dataset.v45bOutcomeSession === String(session.id) &&
          rowElement.querySelector('.v45b-outcome-detail') &&
          rowElement.querySelector('.v45b-open-results')) return;

      cleanOutcome(rowElement);
      rowElement.dataset.v45bOutcomeSession = String(session.id);

      const detail = document.createElement('div');
      detail.className = 'help v45b-outcome-detail';
      detail.textContent = `Completed Practice outcome: ${outcomeText(session)}`;
      const info = rowElement.firstElementChild;
      if (info) info.appendChild(detail);

      const mastery = Number(session?.mastery_percent);
      const outcomeChip = document.createElement('span');
      outcomeChip.className = 'v45b-outcome-chip';
      outcomeChip.textContent = Number.isFinite(mastery) ? `Outcome: ${mastery}% mastery` : 'Outcome recorded';
      outcomeChip.title = 'Recorded result from the completed assigned Practice session.';
      const assign = actions.querySelector('.v44a-assign-practice');
      actions.insertBefore(outcomeChip,assign || null);

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'outline v45b-open-results';
      open.textContent = 'Open Results';
      open.addEventListener('click',() => openResults(analyticsRow,session));
      actions.appendChild(open);
    });
  }

  async function refresh(force=false){
    const ok = await loadData(force);
    if (ok) decoratePriorityRows();
  }

  function queueRefresh(force=false){
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      wireObserver();
      refresh(force);
    });
  }

  function wireObserver(){
    const root = document.getElementById('v42-support-list');
    if (!root || root.dataset.v45bOutcomeWatch === '1') return;
    root.dataset.v45bOutcomeWatch = '1';
    observer?.disconnect();
    observer = new MutationObserver(() => queueRefresh(false));
    observer.observe(root,{childList:true,subtree:true});
  }

  function wire(){
    injectStyles();
    queueRefresh(true);
    window.setTimeout(() => queueRefresh(false),300);
    window.setTimeout(() => queueRefresh(false),800);
    document.querySelector('#teacher .tab[data-panel="analytics-panel"]')?.addEventListener('click',() => {
      window.setTimeout(() => queueRefresh(true),140);
    });
    document.getElementById('refresh-analytics')?.addEventListener('click',() => {
      window.setTimeout(() => queueRefresh(true),350);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
