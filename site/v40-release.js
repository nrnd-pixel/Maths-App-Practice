/* V4.6 release presentation — Intervention Records.
   Loads the established V4.1–V4.5 foundation plus the completed V4.6 export workflow. */
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

  function applyV46Release(){
    document.title = 'Math Practice V4.6';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 4.6 • Intervention Records';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V4.6:</strong>
        Teachers can export the current Action Center intervention queue as a practical record of learner priorities, intervention state and completed Practice outcomes while preserving the established guided-intervention workflow.
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
    loadScriptOnce('v46-intervention-export.js?v=46a-1', 'data-v46a-intervention-export');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV46Release, { once:true });
  } else {
    applyV46Release();
  }
})();
