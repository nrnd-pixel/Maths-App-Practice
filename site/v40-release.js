/* V4.9 release presentation — Student Progress Experience.
   Loads the established V4.1–V4.8 foundation plus the tested student progress experience.
   V5.0B3 consolidates the former V4.9A/V4.9C top-level panels into one active overview. */
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

  function applyV49Release(){
    document.title = 'Math Practice V4.9';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 4.9 • Student Progress Experience';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V4.9:</strong>
        Students get a clearer progress snapshot, topic-level progress drill-downs, and practical next-step guidance that reuses the app's existing secure learning evidence and Practice assignment workflow.
        Secure Practice grading, teacher intervention tools, authentication and AI-free Exam boundaries remain unchanged.
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
    loadScriptOnce('v48-teacher-deadline-monitoring.js?v=48a-2', 'data-v48a-teacher-deadline-monitoring');
    loadScriptOnce('v48-student-deadline-experience.js?v=48b-2', 'data-v48b-student-deadline-experience');
    loadScriptOnce('v48-deadline-follow-up.js?v=48c-4', 'data-v48c-deadline-follow-up');
    loadScriptOnce('v49-student-topic-progress.js?v=49b-2', 'data-v49b-student-topic-progress');
    loadScriptOnce('v50-student-progress-overview.js?v=50b3-1', 'data-v50-student-progress-overview');
    loadScriptOnce('v50-accessibility-polish.js?v=50b4a-1', 'data-v50-accessibility-polish');
    loadScriptOnce('v50-teacher-class-report.js?v=50c1-2', 'data-v50-teacher-class-report');
    loadScriptOnce('v50-teacher-student-report.js?v=50c2-2', 'data-v50-teacher-student-report');
    loadScriptOnce('v50-reporting-export.js?v=50c3a-2', 'data-v50-reporting-export');
    loadScriptOnce('v50-report-archive.js?v=50c3b-1', 'data-v50-report-archive');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV49Release, { once:true });
  } else {
    applyV49Release();
  }
})();
