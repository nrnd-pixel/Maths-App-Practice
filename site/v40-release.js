/* V4.8 release presentation — Practice Deadlines & Follow-Up.
   Loads the established V4.1–V4.8 foundation plus staged V4.9 student progress improvements. */
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

  function applyV48Release(){
    document.title = 'Math Practice V4.8';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 4.8 • Practice Deadlines & Follow-Up';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V4.8:</strong>
        Teachers can monitor Practice deadlines, adjust follow-up target dates, and see overdue or due-soon work by class. Students receive clear Practice deadline priorities while overdue Practice remains available to complete.
        Secure Practice grading, intervention history, authentication and AI-free Exam boundaries remain unchanged.
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
    loadScriptOnce('v47-intervention-history.js?v=47a-1', 'data-v47a-intervention-history');
    loadScriptOnce('v47-follow-up-from-history.js?v=47b-1', 'data-v47b-follow-up-from-history');
    loadScriptOnce('v47-class-intervention-overview.js?v=47c-1', 'data-v47c-class-intervention-overview');
    loadScriptOnce('v48-teacher-deadline-monitoring.js?v=48a-1', 'data-v48a-teacher-deadline-monitoring');
    loadScriptOnce('v48-student-deadline-experience.js?v=48b-2', 'data-v48b-student-deadline-experience');
    loadScriptOnce('v48-deadline-follow-up.js?v=48c-3', 'data-v48c-deadline-follow-up');
    loadScriptOnce('v49-student-progress-snapshot.js?v=49a-1', 'data-v49a-student-progress-snapshot');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV48Release, { once:true });
  } else {
    applyV48Release();
  }
})();
