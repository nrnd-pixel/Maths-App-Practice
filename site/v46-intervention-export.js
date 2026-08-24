/* V4.6A — Intervention Queue Export.
   Teacher-only presentation/workflow layer. Exports the current Action Center
   intervention queue scope without changing assignments, grading or analytics. */
(() => {
  'use strict';

  const BUTTON_CLASS = 'v46-export-queue';
  const STYLE_ID = 'v46-intervention-export-style';
  let wireAttempts = 0;

  function text(value){ return String(value ?? '').trim(); }
  function lower(value){ return text(value).toLowerCase(); }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${BUTTON_CLASS}{
        min-height:34px;
        padding:6px 10px;
        font-size:11px;
        border-radius:999px;
        white-space:nowrap;
      }
      @media(max-width:520px){
        .${BUTTON_CLASS}{width:100%}
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

  function interventionState(rowElement){
    const status = rowElement.querySelector('.v44c-intervention-status');
    if (status?.classList.contains('completed')) return {key:'completed',label:'Completed'};
    if (status?.classList.contains('not-started')) return {key:'not-started',label:'Not started'};
    if (status?.classList.contains('in-progress')) return {key:'in-progress',label:'In progress'};

    const assign = rowElement.querySelector('.v44a-assign-practice');
    if (assign && !assign.classList.contains('hidden')) return {key:'needs-assignment',label:'Needs assignment'};
    return {key:'pending',label:'Checking'};
  }

  function selectedQueueFilter(){
    const button = document.querySelector('#v45-intervention-queue-tools .v45-queue-filter[aria-pressed="true"]');
    return button?.dataset.filter || 'all';
  }

  function matchesFilter(state,filter){
    if (filter === 'all') return true;
    if (filter === 'needs-assignment') return state.key === 'needs-assignment';
    if (filter === 'outstanding') return state.key === 'not-started' || state.key === 'in-progress';
    if (filter === 'completed') return state.key === 'completed';
    return true;
  }

  function selectedLabel(id){
    const select = document.getElementById(id);
    if (!select) return '';
    return text(select.options?.[select.selectedIndex]?.textContent || select.value);
  }

  function analyticsScope(){
    return {
      period:selectedLabel('analytics-period'),
      class_scope:selectedLabel('analytics-class'),
      year_scope:selectedLabel('analytics-year'),
      mode_scope:selectedLabel('analytics-mode'),
      student_search:text(document.getElementById('analytics-search')?.value)
    };
  }

  function sessionForRowElement(rowElement){
    const id = text(rowElement.dataset.v45bOutcomeSession);
    if (!id || typeof teacherResults === 'undefined' || !Array.isArray(teacherResults)) return null;
    return teacherResults.find(session => String(session?.id) === id) || null;
  }

  function csvValue(value){
    const raw = value == null ? '' : String(value);
    return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g,'""')}"` : raw;
  }

  function localDateStamp(){
    const now = new Date();
    const pad = value => String(value).padStart(2,'0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  }

  function saveCsv(filename,csv){
    if (typeof download === 'function'){
      download(filename,csv);
      return;
    }
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url),1000);
  }

  function queueRows(){
    const root = document.getElementById('v42-support-list');
    if (!root) return [];
    return [...root.querySelectorAll(':scope > .v42-action-row')];
  }

  function exportRecords(){
    const scope = analyticsScope();
    const filter = selectedQueueFilter();
    const exportedAt = new Date().toISOString();

    return queueRows().map((rowElement,index) => {
      const profile = rowElement.querySelector('.v42-open-profile[data-key]');
      const row = rowForKey(profile?.dataset.key || '');
      const focus = row ? focusForRow(row) : null;
      const state = interventionState(rowElement);
      if (!row || !focus || !matchesFilter(state,filter)) return null;

      const session = sessionForRowElement(rowElement);
      const total = session ? Number(session.auto_total ?? session.total ?? 0) : '';
      return {
        exported_at:exportedAt,
        analytics_period:scope.period,
        analytics_class:scope.class_scope,
        analytics_year:scope.year_scope,
        analytics_mode:scope.mode_scope,
        analytics_student_search:scope.student_search,
        queue_filter:filter,
        priority_rank:index+1,
        student_name:text(row.student_name),
        student_id:text(row.student_id),
        class_name:text(row.class_name || row.class_group),
        year_level:text(row.year_level),
        focus_strand:strandForFocus(row,focus),
        focus_topic:text(focus.topic?.topic),
        focus_band:text(focus.band?.label),
        focus_percent:focus.topic?.percent ?? '',
        focus_scored_responses:focus.topic?.scored ?? '',
        focus_marks_awarded:focus.topic?.awarded ?? '',
        focus_marks_possible:focus.topic?.possible ?? '',
        intervention_status:state.label,
        outcome_mastery_percent:session?.mastery_percent ?? '',
        outcome_first_try_percent:session?.first_try_percent ?? '',
        outcome_question_count:total,
        outcome_hints_used:session?.hints_used ?? '',
        outcome_completed_at:session?.completed_at ?? ''
      };
    }).filter(Boolean);
  }

  async function waitForDecorations(){
    for (let i=0;i<18;i++){
      const rows = queueRows();
      const hasPending = rows.some(row => interventionState(row).key === 'pending');
      const completedMissingOutcome = rows.some(row =>
        interventionState(row).key === 'completed' &&
        !text(row.dataset.v45bOutcomeSession)
      );
      if (!hasPending && !completedMissingOutcome) return;
      await new Promise(resolve => window.setTimeout(resolve,180));
    }
  }

  async function exportQueue(button){
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'Preparing…';
    try {
      await waitForDecorations();
      const records = exportRecords();
      if (!records.length){
        alert('No priority learners match the current intervention queue filter.');
        return;
      }
      const headers = Object.keys(records[0]);
      const csv = headers.join(',') + '\n' +
        records.map(record => headers.map(key => csvValue(record[key])).join(',')).join('\n');
      saveCsv(`math-practice-intervention-queue-v4.6-${localDateStamp()}.csv`,csv);
      button.textContent = `Exported ${records.length}`;
      window.setTimeout(() => { button.textContent = old; },1500);
    } catch (error){
      console.warn('V4.6A intervention queue export failed.',error);
      alert(`Could not export the intervention queue. ${error?.message || ''}`.trim());
    } finally {
      button.disabled = false;
      if (button.textContent === 'Preparing…') button.textContent = old;
    }
  }

  function wireButton(){
    injectStyles();
    const tools = document.getElementById('v45-intervention-queue-tools');
    const summary = tools?.querySelector('.v45-queue-summary');
    if (!tools || !summary){
      if (wireAttempts++ < 20) window.setTimeout(wireButton,180);
      return;
    }
    if (summary.querySelector(`.${BUTTON_CLASS}`)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `outline ${BUTTON_CLASS}`;
    button.textContent = 'Export queue CSV';
    button.title = 'Export priority learners in the current Analytics scope and intervention queue filter.';
    button.addEventListener('click',() => exportQueue(button));

    const expand = summary.querySelector('.v45-queue-expand');
    if (expand) summary.insertBefore(button,expand);
    else summary.appendChild(button);
  }

  function wire(){
    wireButton();
    document.querySelector('#teacher .tab[data-panel="analytics-panel"]')?.addEventListener('click',() => {
      wireAttempts = 0;
      window.setTimeout(wireButton,120);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
