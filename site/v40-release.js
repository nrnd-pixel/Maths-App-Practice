/* V4.4 release presentation — Guided Practice Interventions.
   Loads the established V4.1–V4.3 foundation, completed V4.4 intervention workflow modules,
   and staged V4.5 teacher workflow improvements. */
(() => {
  'use strict';

  function loadScriptOnce(src, dataKey){
    if (document.querySelector(`script[${dataKey}="1"]`)) return;

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.setAttribute(dataKey, '1');
    document.head.appendChild(script);
  }

  function applyV44Release(){
    document.title = 'Math Practice V4.4';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 4.4 • Guided Practice Interventions';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V4.4:</strong>
        Teachers can turn Action Center insights into reviewed targeted Practice for individual learners or shared-focus groups, while seeing existing intervention status before assigning duplicate work.
        Secure Practice, mastery recovery and AI-free Exam boundaries remain unchanged.
      `;
    }

    loadScriptOnce('v41-signin-guard.js', 'data-v41-signin-guard');
    loadScriptOnce('v41-mastery-progress.js', 'data-v41c-mastery-progress');
    loadScriptOnce('v42-teacher-action-center.js', 'data-v42a-teacher-action-center');
    loadScriptOnce('v42-practice-assignments.js', 'data-v42b-practice-assignments');
    loadScriptOnce('v42-roster-cleanup.js', 'data-v42c-roster-cleanup');
    loadScriptOnce('v42-quick-add-student.js', 'data-v42d-quick-add-student');
    loadScriptOnce('v43-individual-practice-assignments.js', 'data-v43a-individual-practice-assignments');
    loadScriptOnce('v43-multi-recipient-practice-assignments.js', 'data-v43b-multi-recipient-practice-assignments');
    loadScriptOnce('v43-teacher-dashboard-polish.js', 'data-v43c-teacher-dashboard-polish');
    loadScriptOnce('v43-combined-teacher-improvements.js?v=43d-1', 'data-v43d-combined-teacher-improvements');
    loadScriptOnce('v44-action-center-practice.js?v=44a-1', 'data-v44a-action-center-practice');
    loadScriptOnce('v44-shared-focus-groups.js?v=44b-1', 'data-v44b-shared-focus-groups');
    loadScriptOnce('v44-intervention-follow-through.js?v=44c-1', 'data-v44c-intervention-follow-through');
    loadScriptOnce('v44-intervention-highlight-clarity.js?v=44c-clarity-1', 'data-v44c-intervention-highlight-clarity');
    loadScriptOnce('v45-intervention-queue.js?v=45a-1', 'data-v45a-intervention-queue');
    loadScriptOnce('v45-intervention-outcomes.js?v=45b-1', 'data-v45b-intervention-outcomes');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV44Release, { once:true });
  } else {
    applyV44Release();
  }
})();
