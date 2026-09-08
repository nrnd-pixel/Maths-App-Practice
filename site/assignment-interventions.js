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
  function isPracticeEligible(question){
    if (question?.practice_eligible === true) return true;
    return question?.practice_eligible == null && question?.active !== false;
  }

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
      .filter(question => isPracticeEligible(question) &&
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
    if (attempt >= 30){
      console.warn('V4.4A could not verify the target learner in the selected class assignment picker.');
      return;
    }
    window.setTimeout(() => waitForAssignmentBuilder(rosterId,classId,callback,attempt+1),100);
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

    waitForAssignmentBuilder(roster.id,cls.id,section => prefillAssignment(section,row,roster,focus));
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


/* V4.4C clarity patch — make Review Practice target unmistakable.
   Visual-only companion to v44-intervention-follow-through.js. It does not
   choose, create, update, or complete assignments. */
(() => {
  'use strict';

  const STYLE_ID = 'v44c-intervention-highlight-clarity-style';
  let sequence = 0;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v44c-highlight-strong{
        position:relative;
        outline:4px solid var(--primary) !important;
        outline-offset:4px !important;
        box-shadow:
          0 0 0 8px color-mix(in srgb,var(--primary) 16%,transparent),
          0 0 28px color-mix(in srgb,var(--primary) 36%,transparent) !important;
        scroll-margin-block:110px;
        animation:v44c-target-pulse 1s ease-in-out 3;
      }
      .v44c-target-label{
        position:absolute;
        z-index:4;
        top:-15px;
        right:12px;
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:6px 10px;
        border-radius:999px;
        background:var(--primary);
        color:#fff;
        font-size:11px;
        font-weight:900;
        line-height:1.2;
        box-shadow:0 6px 18px color-mix(in srgb,var(--primary) 28%,transparent);
        pointer-events:none;
      }
      @keyframes v44c-target-pulse{
        0%,100%{transform:translateZ(0);box-shadow:0 0 0 8px color-mix(in srgb,var(--primary) 14%,transparent),0 0 24px color-mix(in srgb,var(--primary) 30%,transparent)}
        50%{transform:translateZ(0);box-shadow:0 0 0 12px color-mix(in srgb,var(--primary) 22%,transparent),0 0 34px color-mix(in srgb,var(--primary) 44%,transparent)}
      }
      @media(max-width:520px){
        .v44c-target-label{
          position:static;
          width:max-content;
          max-width:100%;
          margin:0 0 10px auto;
        }
      }
      @media(prefers-reduced-motion:reduce){
        .v44c-highlight-strong{animation:none}
      }
    `;
    document.head.appendChild(style);
  }

  function clearStrongHighlight(card){
    if (!card) return;
    card.classList.remove('v44c-highlight-strong');
    card.querySelector(':scope > .v44c-target-label')?.remove();
  }

  function emphasize(card,token){
    if (!card || token !== sequence) return;

    document.querySelectorAll('.v44c-highlight-strong').forEach(other => {
      if (other !== card) clearStrongHighlight(other);
    });

    card.classList.add('v44c-highlight-strong');
    card.querySelector(':scope > .v44c-target-label')?.remove();

    const label = document.createElement('div');
    label.className = 'v44c-target-label';
    label.textContent = '✓ Matching Practice assignment';
    card.prepend(label);

    card.scrollIntoView({behavior:'smooth',block:'center'});

    window.setTimeout(() => {
      if (token === sequence) clearStrongHighlight(card);
    },5000);
  }

  function waitForTarget(token,attempt=0){
    if (token !== sequence) return;
    const card = document.querySelector('#v43b-practice-assignment-admin .v43b-card.v44c-highlight');
    if (card){
      emphasize(card,token);
      return;
    }
    if (attempt >= 35) return;
    window.setTimeout(() => waitForTarget(token,attempt+1),100);
  }

  function wire(){
    injectStyles();
    const teacher = document.getElementById('teacher');
    if (!teacher || teacher.dataset.v44cHighlightClarity === '1') return;
    teacher.dataset.v44cHighlightClarity = '1';

    teacher.addEventListener('click',event => {
      const button = event.target.closest?.('.v44c-review-practice');
      if (!button) return;
      sequence += 1;
      const token = sequence;
      window.setTimeout(() => waitForTarget(token),80);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
