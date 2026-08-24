/* V4.7B — Follow-Up From Intervention History.
   Adds deliberate "Assign again" workflow to completed learner intervention history.
   Reuses the established V4.3 assignment builder and never auto-creates Practice. */
(() => {
  'use strict';

  const CACHE_MS = 4000;
  let assignments = [];
  let recipients = [];
  let attempts = [];
  let loadedAt = 0;
  let loadBusy = null;
  let historyObserver = null;
  let queued = false;

  function text(value){ return String(value ?? '').trim(); }
  function lower(value){ return text(value).toLowerCase(); }

  function activeRows(){
    return typeof analyticsVisibleRows !== 'undefined' && Array.isArray(analyticsVisibleRows)
      ? analyticsVisibleRows
      : [];
  }

  function selectedRow(){
    const key = typeof selectedAnalyticsStudentKey !== 'undefined' ? selectedAnalyticsStudentKey : '';
    return key ? activeRows().find(row => String(row?.key) === String(key)) || null : null;
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

  function assignmentAppliesTo(assignment,roster){
    const targetRows = recipientsFor(assignment?.id);
    if (targetRows.length){
      return targetRows.some(row => String(row?.roster_student_id) === String(roster?.id));
    }
    return String(assignment?.class_id) === String(roster?.class_id);
  }

  function attemptFor(assignmentId,rosterId){
    return attempts.find(row =>
      String(row?.assignment_id) === String(assignmentId) &&
      String(row?.roster_student_id) === String(rosterId)
    ) || null;
  }

  function historyForRow(row){
    const roster = rosterForRow(row);
    if (!roster) return [];
    return assignments
      .filter(assignment => assignmentAppliesTo(assignment,roster))
      .map(assignment => ({
        assignment,
        attempt:attemptFor(assignment.id,roster.id),
        roster,
        cls:classForAssignment(assignment,roster)
      }))
      .sort((a,b) =>
        Date.parse(b.assignment?.created_at || b.attempt?.started_at || 0) -
        Date.parse(a.assignment?.created_at || a.attempt?.started_at || 0)
      );
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
      console.warn('V4.7B could not load intervention history for reassignment.',error);
      return false;
    }).finally(() => { loadBusy = null; });

    return loadBusy;
  }

  function selectOptionByValue(select,value){
    if (!select) return false;
    const wanted = lower(value);
    if (!wanted){
      select.value = '';
      return true;
    }
    const option = [...select.options].find(item =>
      lower(item.value) === wanted || lower(item.textContent) === wanted
    );
    if (!option) return false;
    select.value = option.value;
    return true;
  }

  function assignmentBuilderReady(section,rosterId,classId){
    if (!section) return false;
    const options = section.querySelector('#v43b-student-options');
    if (!options || String(options.dataset.classId || '') !== String(classId)) return false;
    return [...options.querySelectorAll('input[type="checkbox"]')]
      .some(input => String(input.value) === String(rosterId));
  }

  function waitForAssignmentBuilder(rosterId,classId,callback,attempt=0){
    const section = document.getElementById('v43b-practice-assignment-admin');
    if (assignmentBuilderReady(section,rosterId,classId)){
      callback(section);
      return;
    }
    if (attempt >= 35){
      console.warn('V4.7B could not verify the learner in the selected class assignment picker.');
      document.getElementById('v43b-practice-assignment-admin')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    window.setTimeout(() => waitForAssignmentBuilder(rosterId,classId,callback,attempt+1),100);
  }

  function showPrefillNote(section,item,complete){
    section.querySelector('#v47b-prefill-note')?.remove();
    section.querySelector('#v44a-prefill-note')?.remove();
    section.querySelector('#v44b-prefill-note')?.remove();
    section.querySelector('#v44c-review-note')?.remove();
    section.querySelector('#v47-history-review-note')?.remove();

    const note = document.createElement('div');
    note.id = 'v47b-prefill-note';
    note.className = 'info';
    const student = text(item?.roster?.student_name) || 'Student';
    const topic = text(item?.assignment?.topic) || text(item?.assignment?.strand) || 'historical Practice';
    note.textContent = complete
      ? `Prefilled from ${student}'s intervention history: ${topic}. This creates a new assignment only after you review the settings and click Assign Practice.`
      : `Opened from ${student}'s intervention history. The learner is selected, but the historical strand/topic is no longer fully available in the current question bank. Review the settings before assigning.`;

    const grid = section.querySelector('.v43b-grid');
    if (grid) grid.insertAdjacentElement('beforebegin',note);
    else section.prepend(note);
  }

  function prefillAssignment(section,item){
    const assignment = item.assignment || {};
    const roster = item.roster;

    const audience = section.querySelector('#v43b-audience');
    if (!audience) return;
    audience.value = 'students';
    audience.dispatchEvent(new Event('change',{bubbles:true}));

    section.querySelectorAll('#v43b-student-options input[type="checkbox"]').forEach(input => {
      input.checked = String(input.value) === String(roster.id);
    });

    const strand = section.querySelector('#v43b-strand');
    const strandReady = selectOptionByValue(strand,assignment.strand);
    if (strandReady) strand.dispatchEvent(new Event('change',{bubbles:true}));

    const topic = section.querySelector('#v43b-topic');
    const topicReady = strandReady && selectOptionByValue(topic,assignment.topic || '');
    if (topicReady) topic.dispatchEvent(new Event('change',{bubbles:true}));

    const count = section.querySelector('#v43b-count');
    const historicalCount = Number(assignment.question_count || 5);
    if (count && Number.isFinite(historicalCount) && historicalCount > 0) {
      count.value = String(historicalCount);
    }

    showPrefillNote(section,item,Boolean(strandReady && topicReady));
    section.scrollIntoView({behavior:'smooth',block:'start'});
    window.setTimeout(() => count?.focus({preventScroll:true}),220);
  }

  function assignAgain(item){
    if (!item?.assignment || !item?.roster || !item?.cls) return;
    try {
      if (typeof selectedClassId !== 'undefined') selectedClassId = item.cls.id;
    } catch {}

    document.querySelector('#teacher .tab[data-panel="classes-panel"]')?.click();
    try {
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
    } catch (error){
      console.warn('V4.7B could not refresh class admin before reassignment.',error);
    }

    waitForAssignmentBuilder(item.roster.id,item.cls.id,section => prefillAssignment(section,item));
  }

  async function decorate(force=false){
    const row = selectedRow();
    const list = document.querySelector('#v47-intervention-history .v47-history-list');
    if (!row?.registered || !list) return;
    const ok = await loadData(force);
    if (!ok) return;

    const items = historyForRow(row);
    const cards = [...list.querySelectorAll('.v47-history-card')];
    cards.forEach((card,index) => {
      card.querySelector('.v47b-assign-again')?.remove();
      const item = items[index];
      if (!item || item.attempt?.status !== 'completed' || !item.cls) return;

      const actions = card.querySelector('.v47-history-actions');
      if (!actions) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline v47b-assign-again';
      button.textContent = 'Assign again';
      button.title = 'Prefill a new individual Practice assignment from this completed intervention';
      button.addEventListener('click',() => assignAgain(item));
      actions.appendChild(button);
    });
  }

  function queueDecorate(force=false){
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      wireHistoryObserver();
      decorate(force);
    });
  }

  function wireHistoryObserver(){
    const list = document.querySelector('#v47-intervention-history .v47-history-list');
    if (!list || list.dataset.v47bWatch === '1') return;
    list.dataset.v47bWatch = '1';
    historyObserver?.disconnect();
    historyObserver = new MutationObserver(() => queueDecorate(false));
    historyObserver.observe(list,{childList:true});
  }

  function wireAnalyticsTab(){
    const tab = document.querySelector('#teacher .tab[data-panel="analytics-panel"]');
    if (!tab || tab.dataset.v47bFollowup === '1') return;
    tab.dataset.v47bFollowup = '1';
    tab.addEventListener('click',() => window.setTimeout(() => queueDecorate(true),180));
  }

  function wire(){
    wireAnalyticsTab();
    window.setTimeout(() => queueDecorate(true),260);
    window.setTimeout(() => queueDecorate(false),700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
