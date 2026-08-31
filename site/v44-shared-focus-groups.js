/* V4.4B — Shared Focus Group Intervention.
   Groups registered priority learners only when they share the same safely
   resolved class + strand + topic, then prefills the existing V4.3 selected-
   students Practice assignment builder. Never auto-creates assignments. */
(() => {
  'use strict';

  const STYLE_ID = 'v44b-shared-focus-groups-style';
  const SECTION_ID = 'v44b-shared-focus-groups';
  let supportObserver = null;
  let renderQueued = false;
  let groupsByKey = new Map();

  function text(value){ return String(value ?? '').trim(); }
  function lower(value){ return text(value).toLowerCase(); }
  function isPracticeEligible(question){
    if (question?.practice_eligible === true) return true;
    return question?.practice_eligible == null && question?.active !== false;
  }
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
      #${SECTION_ID}{
        margin-top:13px;
        border:1px solid var(--border);
        border-radius:14px;
        padding:14px;
        background:var(--card);
      }
      #${SECTION_ID} .v44b-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        flex-wrap:wrap;
      }
      #${SECTION_ID} .v44b-head h4{margin:0 0 4px}
      #${SECTION_ID} .v44b-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
        margin-top:11px;
      }
      #${SECTION_ID} .v44b-card{
        border:1px solid var(--border);
        border-radius:12px;
        padding:11px;
        background:var(--surface-muted,var(--card));
        min-width:0;
      }
      #${SECTION_ID} .v44b-card-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:9px;
        flex-wrap:wrap;
      }
      #${SECTION_ID} .v44b-card strong{line-height:1.35}
      #${SECTION_ID} .v44b-names{
        margin-top:7px;
        color:var(--muted);
        font-size:12px;
        line-height:1.45;
      }
      #${SECTION_ID} .v44b-assign{
        min-height:36px;
        padding:7px 10px;
        font-size:12px;
        background:var(--primary);
        color:#fff;
        white-space:nowrap;
      }
      #v44b-prefill-note{margin:0 0 14px}
      @media(max-width:700px){
        #${SECTION_ID} .v44b-grid{grid-template-columns:1fr}
      }
      @media(max-width:520px){
        #${SECTION_ID} .v44b-assign{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function activeRows(){
    return typeof analyticsVisibleRows !== 'undefined' && Array.isArray(analyticsVisibleRows)
      ? analyticsVisibleRows
      : [];
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
      .map(topic => ({topic,band:learningBand(topic)}))
      .filter(item => item.band?.key === 'needs-attention' || item.band?.key === 'developing')
      .sort((a,b) => {
        const rankA = a.band.key === 'needs-attention' ? 0 : 1;
        const rankB = b.band.key === 'needs-attention' ? 0 : 1;
        if (rankA !== rankB) return rankA-rankB;
        return Number(a.topic.percent ?? 101)-Number(b.topic.percent ?? 101) ||
          Number(b.topic.scored || 0)-Number(a.topic.scored || 0);
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
      counts.set(strand,(counts.get(strand) || 0)+1);
    });
    if (counts.size){
      return [...counts.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0][0];
    }

    const questions = typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)
      ? teacherQuestions
      : [];
    const strands = [...new Set(questions
      .filter(question => isPracticeEligible(question) &&
        Number(question?.year_level) === Number(row?.year_level) &&
        lower(question?.topic) === topicName)
      .map(question => text(question?.strand))
      .filter(Boolean))];
    return strands.length === 1 ? strands[0] : '';
  }

  function topicAvailable(cls,strand,topic){
    const questions = typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)
      ? teacherQuestions
      : [];
    return questions.some(question =>
      isPracticeEligible(question) &&
      Number(question?.year_level) === Number(cls?.year_level) &&
      lower(question?.strand) === lower(strand) &&
      lower(question?.topic) === lower(topic)
    );
  }

  function buildGroups(){
    const map = new Map();

    activeRows().forEach(row => {
      if (row?.registered !== true || row?.active === false) return;
      const roster = rosterForRow(row);
      const cls = classForRoster(roster);
      const focus = focusForRow(row);
      if (!roster || !cls || !focus) return;

      const topic = text(focus?.topic?.topic);
      const strand = strandForFocus(row,focus);
      if (!topic || !strand || !topicAvailable(cls,strand,topic)) return;

      const key = [String(cls.id),lower(strand),lower(topic)].join('|');
      if (!map.has(key)) {
        map.set(key,{key,cls,strand,topic,learners:[]});
      }
      map.get(key).learners.push({row,roster,focus});
    });

    return [...map.values()]
      .filter(group => group.learners.length >= 2)
      .map(group => {
        group.learners.sort((a,b) => {
          const rankA = a.focus.band.key === 'needs-attention' ? 0 : 1;
          const rankB = b.focus.band.key === 'needs-attention' ? 0 : 1;
          return rankA-rankB ||
            Number(a.focus.topic.percent ?? 101)-Number(b.focus.topic.percent ?? 101) ||
            text(a.row.student_name).localeCompare(text(b.row.student_name),undefined,{numeric:true});
        });
        return group;
      })
      .sort((a,b) =>
        b.learners.length-a.learners.length ||
        text(a.cls.name).localeCompare(text(b.cls.name),undefined,{numeric:true}) ||
        a.topic.localeCompare(b.topic,undefined,{numeric:true})
      );
  }

  function ensureSection(){
    const center = document.querySelector('.v42-action-center');
    if (!center) return null;
    let section = document.getElementById(SECTION_ID);
    if (section) return section;

    section = document.createElement('section');
    section.id = SECTION_ID;
    const columns = center.querySelector('.v42-action-columns');
    if (columns) columns.insertAdjacentElement('beforebegin',section);
    else center.appendChild(section);
    return section;
  }

  function renderGroups(){
    const section = ensureSection();
    if (!section) return;

    const groups = buildGroups();
    groupsByKey = new Map(groups.map(group => [group.key,group]));

    section.innerHTML = `
      <div class="v44b-head">
        <div>
          <h4>👥 Shared focus groups</h4>
          <div class="help">Learners are grouped only when they are in the same class and share the same resolved focus topic.</div>
        </div>
        <span class="tag">V4.4B</span>
      </div>
      ${groups.length ? `<div class="v44b-grid">${groups.slice(0,8).map(group => {
        const needs = group.learners.filter(item => item.focus.band.key === 'needs-attention').length;
        const developing = group.learners.length-needs;
        const names = group.learners.slice(0,5).map(item => text(item.row.student_name)).join(', ');
        const more = group.learners.length > 5 ? ` +${group.learners.length-5} more` : '';
        return `
          <article class="v44b-card">
            <div class="v44b-card-head">
              <div>
                <strong>${html(group.topic)}</strong>
                <div class="help">${html(group.cls.name)} · ${html(group.strand)} · ${group.learners.length} learners</div>
                <div class="help">${needs} needs attention${developing ? ` · ${developing} developing` : ''}</div>
              </div>
              <button type="button" class="v44b-assign" data-group-key="${html(group.key)}">Assign to ${group.learners.length}</button>
            </div>
            <div class="v44b-names">${html(names+more)}</div>
          </article>`;
      }).join('')}</div>` : '<div class="empty">No same-class shared focus group is currently identified in this analytics view.</div>'}
    `;

    section.querySelectorAll('.v44b-assign[data-group-key]').forEach(button => {
      button.addEventListener('click',() => openGroupIntervention(button.dataset.groupKey || ''));
    });
  }

  function selectOptionByValue(select,value){
    if (!select || !value) return false;
    const wanted = lower(value);
    const option = [...select.options].find(item => lower(item.value) === wanted || lower(item.textContent) === wanted);
    if (!option) return false;
    select.value = option.value;
    return true;
  }

  function assignmentBuilderReady(section,group){
    if (!section || !group) return false;
    const options = section.querySelector('#v43b-student-options');
    if (!options || String(options.dataset.classId || '') !== String(group.cls.id)) return false;
    const values = new Set([...options.querySelectorAll('input[type="checkbox"]')].map(input => String(input.value)));
    return group.learners.every(item => values.has(String(item.roster.id)));
  }

  function waitForAssignmentBuilder(group,callback,attempt=0){
    const section = document.getElementById('v43b-practice-assignment-admin');
    if (assignmentBuilderReady(section,group)) {
      callback(section);
      return;
    }
    if (attempt >= 30) {
      console.warn('V4.4B could not verify all shared-focus learners in the selected class picker.');
      return;
    }
    window.setTimeout(() => waitForAssignmentBuilder(group,callback,attempt+1),100);
  }

  function showPrefillNote(section,group,complete){
    section.querySelector('#v44a-prefill-note')?.remove();
    section.querySelector('#v44b-prefill-note')?.remove();
    const note = document.createElement('div');
    note.id = 'v44b-prefill-note';
    note.className = 'info';
    note.textContent = complete
      ? `Prefilled from Teacher Action Center for ${group.learners.length} learners in ${text(group.cls.name)}: ${group.topic}. Review the selected learners and settings, then click Assign Practice.`
      : `Opened from Teacher Action Center for ${group.learners.length} learners in ${text(group.cls.name)}: ${group.topic}. Learners are selected; choose the strand/topic if needed, then click Assign Practice.`;
    const grid = section.querySelector('.v43b-grid');
    if (grid) grid.insertAdjacentElement('beforebegin',note);
    else section.prepend(note);
  }

  function prefillGroup(section,group){
    const audience = section.querySelector('#v43b-audience');
    if (!audience) return;
    audience.value = 'students';
    audience.dispatchEvent(new Event('change',{bubbles:true}));

    const wanted = new Set(group.learners.map(item => String(item.roster.id)));
    section.querySelectorAll('#v43b-student-options input[type="checkbox"]').forEach(input => {
      input.checked = wanted.has(String(input.value));
    });

    const strand = section.querySelector('#v43b-strand');
    const strandReady = selectOptionByValue(strand,group.strand);
    if (strandReady) strand.dispatchEvent(new Event('change',{bubbles:true}));

    const topic = section.querySelector('#v43b-topic');
    const topicReady = strandReady && selectOptionByValue(topic,group.topic);
    if (topicReady) topic.dispatchEvent(new Event('change',{bubbles:true}));

    const count = section.querySelector('#v43b-count');
    if (count) count.value = '5';

    showPrefillNote(section,group,Boolean(strandReady && topicReady));
    section.scrollIntoView({behavior:'smooth',block:'start'});
    window.setTimeout(() => section.querySelector('#v43b-count')?.focus({preventScroll:true}),250);
  }

  function openGroupIntervention(key){
    const group = groupsByKey.get(key);
    if (!group || group.learners.length < 2) return;

    try {
      if (typeof selectedClassId !== 'undefined') selectedClassId = group.cls.id;
    } catch {}

    document.querySelector('#teacher .tab[data-panel="classes-panel"]')?.click();
    try {
      if (typeof renderClassAdmin === 'function') renderClassAdmin();
    } catch (error){
      console.warn('V4.4B could not refresh class admin before shared-focus prefill.',error);
    }

    waitForAssignmentBuilder(group,section => prefillGroup(section,group));
  }

  function queueRender(){
    if (renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(() => {
      renderQueued = false;
      wireSupportObserver();
      renderGroups();
    });
  }

  function wireSupportObserver(){
    const root = document.getElementById('v42-support-list');
    if (!root || root.dataset.v44bWatch === '1') return;
    root.dataset.v44bWatch = '1';
    supportObserver?.disconnect();
    supportObserver = new MutationObserver(queueRender);
    supportObserver.observe(root,{childList:true});
  }

  function waitForActionCenter(attempt=0){
    if (document.querySelector('.v42-action-center') && document.getElementById('v42-support-list')) {
      wireSupportObserver();
      queueRender();
      return;
    }
    if (attempt >= 30) return;
    window.setTimeout(() => waitForActionCenter(attempt+1),100);
  }

  function wire(){
    injectStyles();
    waitForActionCenter();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();