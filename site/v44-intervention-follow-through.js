/* V4.4C — Intervention Follow-Through.
   Shows existing matching targeted Practice beside priority learners so teachers
   can review outstanding work before creating another assignment. Read-only
   workflow layer; assignment creation/completion remain on established V4.3 paths. */
(() => {
  'use strict';

  const STYLE_ID = 'v44c-intervention-follow-through-style';
  const CACHE_MS = 4000;
  let assignments = [];
  let recipients = [];
  let attempts = [];
  let loadedAt = 0;
  let loadBusy = null;
  let renderQueued = false;
  let supportObserver = null;

  function text(value){ return String(value ?? '').trim(); }
  function lower(value){ return text(value).toLowerCase(); }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v44c-intervention-status{
        display:inline-flex;
        align-items:center;
        min-height:30px;
        padding:5px 8px;
        border:1px solid var(--border);
        border-radius:999px;
        font-size:11px;
        font-weight:800;
        white-space:nowrap;
      }
      .v44c-intervention-status.not-started{
        background:var(--surface-muted,var(--card));
        color:var(--muted);
      }
      .v44c-intervention-status.in-progress{
        background:var(--warnbg);
        color:var(--warn);
        border-color:color-mix(in srgb,var(--warn) 25%,var(--border));
      }
      .v44c-intervention-status.completed{
        background:var(--successbg);
        color:var(--success);
        border-color:color-mix(in srgb,var(--success) 25%,var(--border));
      }
      .v44c-review-practice{
        min-height:36px;
        padding:7px 10px;
        font-size:12px;
        white-space:nowrap;
      }
      .v44c-highlight{
        outline:3px solid color-mix(in srgb,var(--primary) 32%,transparent);
        outline-offset:3px;
      }
      #v44c-review-note{margin:0 0 14px}
      @media(max-width:520px){
        .v44c-intervention-status,
        .v44c-review-practice{
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

  function attemptFor(assignmentId,rosterId){
    return attempts.find(row =>
      String(row?.assignment_id) === String(assignmentId) &&
      String(row?.roster_student_id) === String(rosterId)
    ) || null;
  }

  function statusFor(assignment,roster){
    const attempt = attemptFor(assignment.id,roster.id);
    if (attempt?.status === 'completed') return {key:'completed',label:'Completed',attempt};
    if (attempt) return {key:'in-progress',label:'In progress',attempt};
    return {key:'not-started',label:'Not started',attempt:null};
  }

  function matchingIntervention(row){
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
        roster,
        cls,
        focus,
        topic,
        strand,
        exactTopic:lower(assignment?.topic) === lower(topic),
        status:statusFor(assignment,roster)
      }));

    if (!matches.length) return null;

    const rank = {'in-progress':0,'not-started':1,'completed':2};
    matches.sort((a,b) =>
      rank[a.status.key]-rank[b.status.key] ||
      Number(b.exactTopic)-Number(a.exactTopic) ||
      Date.parse(b.assignment?.created_at || 0)-Date.parse(a.assignment?.created_at || 0)
    );
    return matches[0];
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
          .select('assignment_id,roster_student_id,status,started_at,completed_at,updated_at')
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
      console.warn('V4.4C could not load Practice intervention status.',error);
      return false;
    }).finally(() => { loadBusy = null; });

    return loadBusy;
  }

  function showReviewNote(section,item){
    section.querySelector('#v44a-prefill-note')?.remove();
    section.querySelector('#v44b-prefill-note')?.remove();
    section.querySelector('#v44c-review-note')?.remove();
    const note = document.createElement('div');
    note.id = 'v44c-review-note';
    note.className = 'info';
    note.textContent = `${text(item.roster?.student_name) || 'This learner'} already has matching ${item.exactTopic ? item.topic : item.strand} Practice ${item.status.label.toLowerCase()}. Review the existing assignment before creating another one.`;
    const grid = section.querySelector('.v43b-grid');
    if (grid) grid.insertAdjacentElement('beforebegin',note);
    else section.prepend(note);
  }

  function findAssignmentCard(assignmentId){
    return [...document.querySelectorAll('#v43b-practice-assignment-admin .v43b-toggle[data-id]')]
      .find(button => String(button.dataset.id) === String(assignmentId))
      ?.closest('.v43b-card') || null;
  }

  function waitForAssignmentCard(item,attempt=0){
    const card = findAssignmentCard(item.assignment.id);
    if (card){
      const section = document.getElementById('v43b-practice-assignment-admin');
      if (section) showReviewNote(section,item);
      card.classList.add('v44c-highlight');
      card.scrollIntoView({behavior:'smooth',block:'center'});
      window.setTimeout(() => card.classList.remove('v44c-highlight'),2200);
      return;
    }
    if (attempt >= 30){
      document.getElementById('v43b-practice-assignment-admin')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    window.setTimeout(() => waitForAssignmentCard(item,attempt+1),100);
  }

  function openExistingAssignment(item){
    if (!item?.assignment || !item?.cls) return;
    try {
      if (typeof selectedClassId !== 'undefined') selectedClassId = item.cls.id;
    } catch {}

    document.querySelector('#teacher .tab[data-panel="classes-panel"]')?.click();
    try {
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
    } catch (error){
      console.warn('V4.4C could not refresh class admin before reviewing Practice.',error);
    }
    waitForAssignmentCard(item);
  }

  function decoratePriorityRows(){
    const root = document.getElementById('v42-support-list');
    if (!root) return;

    root.querySelectorAll('.v42-action-row').forEach(rowElement => {
      const profile = rowElement.querySelector('.v42-open-profile[data-key]');
      const actions = rowElement.querySelector('.v44a-action-buttons');
      if (!profile || !actions) return;

      actions.querySelector('.v44c-intervention-status')?.remove();
      actions.querySelector('.v44c-review-practice')?.remove();

      const assignButton = actions.querySelector('.v44a-assign-practice');
      if (assignButton) assignButton.classList.remove('hidden');

      const analyticsRow = rowForKey(profile.dataset.key || '');
      if (!analyticsRow?.registered) return;
      const item = matchingIntervention(analyticsRow);
      if (!item) return;

      const chip = document.createElement('span');
      chip.className = `v44c-intervention-status ${item.status.key}`;
      chip.textContent = `Practice: ${item.status.label}`;
      chip.title = item.exactTopic
        ? `Matching ${item.topic} targeted Practice`
        : `Broader ${item.strand} Practice includes this focus topic`;
      actions.insertBefore(chip,assignButton || null);

      if (item.status.key === 'completed') return;

      if (assignButton) assignButton.classList.add('hidden');
      const review = document.createElement('button');
      review.type = 'button';
      review.className = 'outline v44c-review-practice';
      review.textContent = 'Review Practice';
      review.addEventListener('click',() => openExistingAssignment(item));
      actions.appendChild(review);
    });
  }

  async function refresh(force=false){
    const ok = await loadData(force);
    if (ok) decoratePriorityRows();
  }

  function queueRefresh(force=false){
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(() => {
      renderQueued = false;
      wireSupportObserver();
      refresh(force);
    });
  }

  function wireSupportObserver(){
    const root = document.getElementById('v42-support-list');
    if (!root || root.dataset.v44cWatch === '1') return;
    root.dataset.v44cWatch = '1';
    supportObserver?.disconnect();
    supportObserver = new MutationObserver(() => queueRefresh(false));
    supportObserver.observe(root,{childList:true});
  }

  function wrapAnalyticsRenderer(){
    try {
      if (typeof renderAnalytics !== 'function' || renderAnalytics.__v44cWrapped) return;
      const previous = renderAnalytics;
      const wrapped = function(...args){
        const result = previous.apply(this,args);
        window.setTimeout(() => queueRefresh(true),100);
        window.setTimeout(() => queueRefresh(false),260);
        return result;
      };
      wrapped.__v44cWrapped = true;
      renderAnalytics = wrapped;
    } catch (error){
      console.warn('V4.4C could not wrap analytics renderer.',error);
    }
  }

  function wireAnalyticsTab(){
    const tab = document.querySelector('#teacher .tab[data-panel="analytics-panel"]');
    if (!tab || tab.dataset.v44cFollowthrough === '1') return;
    tab.dataset.v44cFollowthrough = '1';
    tab.addEventListener('click',() => window.setTimeout(() => queueRefresh(true),120));
  }

  function wire(){
    injectStyles();
    wrapAnalyticsRenderer();
    wireAnalyticsTab();
    window.setTimeout(() => queueRefresh(true),180);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
