/* V4.4A — Action Center → Prefilled Practice Intervention.
   Presentation/workflow bridge only. Reuses the established V4.3 assignment UI
   and server-authoritative assignment creation path; never auto-creates work. */
(() => {
  'use strict';

  const STYLE_ID = 'v44a-action-center-practice-style';
  let supportObserver = null;
  let decorateQueued = false;

  function text(value){ return String(value ?? '').trim(); }
  function lower(value){ return text(value).toLowerCase(); }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v44a-action-buttons{
        display:flex;
        gap:7px;
        flex-wrap:wrap;
        justify-content:flex-end;
        align-items:center;
      }
      .v44a-action-buttons button{
        min-height:36px;
        padding:7px 10px;
        font-size:12px;
        white-space:nowrap;
      }
      .v44a-assign-practice{
        background:var(--primary);
        color:#fff;
      }
      #v44a-prefill-note{
        margin:0 0 14px;
      }
      @media(max-width:520px){
        .v44a-action-buttons{
          display:grid;
          grid-template-columns:1fr;
          width:100%;
        }
        .v44a-action-buttons button{width:100%}
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
    const topics = aggregateLearning(answersForRow(row))
      .map(topic => ({topic, band:learningBand(topic)}))
      .filter(item => item.band?.key === 'needs-attention' || item.band?.key === 'developing')
      .sort((a,b) => {
        const rankA = a.band.key === 'needs-attention' ? 0 : 1;
        const rankB = b.band.key === 'needs-attention' ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
        return Number(a.topic.percent ?? 101) - Number(b.topic.percent ?? 101) ||
          Number(b.topic.scored || 0) - Number(a.topic.scored || 0);
      });
    return topics[0] || null;
  }

  function strandForFocus(row,focus){
    const topicName = lower(focus?.topic?.topic);
    if (!topicName) return '';

    const counts = new Map();
    answersForRow(row).forEach(answer => {
      const answerTopic = lower(answer?.topic) || lower(answer?.practice_sessions?.topic);
      const strand = text(answer?.strand || answer?.practice_sessions?.strand);
      if (answerTopic !== topicName || !strand) return;
      counts.set(strand,(counts.get(strand) || 0) + 1);
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

  function selectOptionByValue(select,value){
    if (!select || !value) return false;
    const wanted = lower(value);
    const option = [...select.options].find(item => lower(item.value) === wanted || lower(item.textContent) === wanted);
    if (!option) return false;
    select.value = option.value;
    return true;
  }

  function showPrefillNote(section,row,focus,complete){
    section.querySelector('#v44a-prefill-note')?.remove();
    const note = document.createElement('div');
    note.id = 'v44a-prefill-note';
    note.className = 'info';
    const student = text(row?.student_name) || 'Student';
    const topic = text(focus?.topic?.topic) || 'the identified focus area';
    note.textContent = complete
      ? `Prefilled from Teacher Action Center for ${student}: ${topic}. Review the settings, then click Assign Practice.`
      : `Opened from Teacher Action Center for ${student}: ${topic}. The learner is selected; choose the strand/topic if needed, then click Assign Practice.`;
    const grid = section.querySelector('.v43b-grid');
    if (grid) grid.insertAdjacentElement('beforebegin',note);
    else section.prepend(note);
  }

  function waitForAssignmentBuilder(callback,attempt=0){
    const section = document.getElementById('v43b-practice-assignment-admin');
    if (section){ callback(section); return; }
    if (attempt >= 24) return;
    window.setTimeout(() => waitForAssignmentBuilder(callback,attempt+1),100);
  }

  function prefillAssignment(section,row,roster,focus){
    const audience = section.querySelector('#v43b-audience');
    if (!audience) return;
    audience.value = 'students';
    audience.dispatchEvent(new Event('change',{bubbles:true}));

    section.querySelectorAll('#v43b-student-options input[type="checkbox"]').forEach(input => {
      input.checked = String(input.value) === String(roster.id);
    });

    const strandValue = strandForFocus(row,focus);
    const strand = section.querySelector('#v43b-strand');
    const strandReady = selectOptionByValue(strand,strandValue);
    if (strandReady) strand.dispatchEvent(new Event('change',{bubbles:true}));

    const topic = section.querySelector('#v43b-topic');
    const topicReady = strandReady && selectOptionByValue(topic,focus?.topic?.topic);
    if (topicReady) topic.dispatchEvent(new Event('change',{bubbles:true}));

    const count = section.querySelector('#v43b-count');
    if (count) count.value = '5';

    showPrefillNote(section,row,focus,Boolean(strandReady && topicReady));
    section.scrollIntoView({behavior:'smooth',block:'start'});
    window.setTimeout(() => section.querySelector('#v43b-count')?.focus({preventScroll:true}),250);
  }

  function openPracticeIntervention(key){
    const row = rowForKey(key);
    if (!row || row?.registered !== true) return;
    const roster = rosterForRow(row);
    const cls = classForRoster(roster);
    const focus = focusForRow(row);
    if (!roster || !cls || !focus) return;

    try {
      if (typeof selectedClassId !== 'undefined') selectedClassId = cls.id;
    } catch {}

    const tab = document.querySelector('#teacher .tab[data-panel="classes-panel"]');
    tab?.click();
    try {
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
    } catch (error){
      console.warn('V4.4A could not refresh class admin before intervention prefill.',error);
    }

    waitForAssignmentBuilder(section => prefillAssignment(section,row,roster,focus));
  }

  function decoratePriorityRows(){
    const root = document.getElementById('v42-support-list');
    if (!root) return;

    root.querySelectorAll('.v42-action-row').forEach(row => {
      if (row.dataset.v44aDecorated === '1') return;
      const profile = row.querySelector('.v42-open-profile[data-key]');
      if (!profile) return;
      const analyticsRow = rowForKey(profile.dataset.key || '');
      if (!analyticsRow?.registered || !focusForRow(analyticsRow)) return;

      row.dataset.v44aDecorated = '1';
      const actions = document.createElement('div');
      actions.className = 'v44a-action-buttons';
      profile.insertAdjacentElement('beforebegin',actions);
      actions.appendChild(profile);

      const assign = document.createElement('button');
      assign.type = 'button';
      assign.className = 'v44a-assign-practice';
      assign.textContent = 'Assign Practice';
      assign.addEventListener('click',() => openPracticeIntervention(profile.dataset.key || ''));
      actions.appendChild(assign);
    });
  }

  function queueDecorate(){
    if (decorateQueued) return;
    decorateQueued = true;
    window.requestAnimationFrame(() => {
      decorateQueued = false;
      wireSupportObserver();
      decoratePriorityRows();
    });
  }

  function wireSupportObserver(){
    const root = document.getElementById('v42-support-list');
    if (!root || root.dataset.v44aWatch === '1') return;
    root.dataset.v44aWatch = '1';
    supportObserver?.disconnect();
    supportObserver = new MutationObserver(queueDecorate);
    supportObserver.observe(root,{childList:true});
  }

  function wrapAnalyticsRenderer(){
    try {
      if (typeof renderAnalytics !== 'function' || renderAnalytics.__v44aWrapped) return;
      const previous = renderAnalytics;
      const wrapped = function(...args){
        const result = previous.apply(this,args);
        window.setTimeout(queueDecorate,60);
        window.setTimeout(queueDecorate,180);
        return result;
      };
      wrapped.__v44aWrapped = true;
      renderAnalytics = wrapped;
    } catch (error){
      console.warn('V4.4A could not wrap analytics renderer.',error);
    }
  }

  function wire(){
    injectStyles();
    wrapAnalyticsRenderer();
    queueDecorate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
