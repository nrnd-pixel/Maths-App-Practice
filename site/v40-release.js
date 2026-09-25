/* V5.1 Stable Release presentation.
   Loads the established V4.1–V5.0 foundation plus the signed-off V5.1 feature set. */
(() => {
  'use strict';

  function loadScriptOnce(src, dataKey){
    if (document.querySelector(`script[${dataKey}="1"]`)) return;

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.setAttribute(dataKey, '1');
    /*
      Item 5 — script load error visibility: a 404 or network failure on any of
      the ~35 scripts loaded here is completely silent without this handler. The
      app continues with a missing feature and no indication of the problem.
      console.error surfaces it in browser devtools and will be caught by the
      P2.2 window.onerror handler when that ships. This complements the roadmap
      observability work without depending on it.
    */
    script.onerror = function() {
      console.error('V5.1 Release loader: failed to load script — ' + src);
    };
    document.head.appendChild(script);
  }

  function applyV51StableRelease(){
    // Release identity is owned by version.js and derived from config.js's staged list.
    window.MathAppVersion?.applyIdentity?.();

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V5.1 Stable Release:</strong>
        Safer past-paper import, Question Bank QA and publication controls, plus the student Exam paper library and resume clarity are now released together on the stable V5.0 foundation.
        Secure deterministic grading, teacher review boundaries, explicit Exam publication and AI-free Exam Mode remain unchanged.
      `;
    }

    loadScriptOnce('v41-signin-guard.js', 'data-v41-signin-guard');
    loadScriptOnce('v41-mastery-progress.js', 'data-v41c-mastery-progress');
    loadScriptOnce('v42-teacher-action-center.js', 'data-v42a-teacher-action-center');
    loadScriptOnce('assignments-core.js', 'data-assignments-core');
    loadScriptOnce('assignments-student.js', 'data-assignments-student');
    loadScriptOnce('assignments-teacher.js', 'data-assignments-teacher');
    loadScriptOnce('v42-roster-cleanup.js', 'data-v42c-roster-cleanup');
    loadScriptOnce('v42-quick-add-student.js', 'data-v42d-quick-add-student');
    loadScriptOnce('v43-teacher-dashboard-polish.js', 'data-v43c-teacher-dashboard-polish');
    loadScriptOnce('v43-combined-teacher-improvements.js?v=43d-1', 'data-v43d-combined-teacher-improvements');
    loadScriptOnce('assignment-interventions.js', 'data-assignment-interventions');
    loadScriptOnce('v45-intervention-queue.js?v=45a-1', 'data-v45a-intervention-queue');
    loadScriptOnce('assignment-intervention-queue-support.js', 'data-assignment-intervention-queue-support');
    loadScriptOnce('assignment-intervention-history.js', 'data-assignment-intervention-history');
    loadScriptOnce('assignment-deadlines.js', 'data-assignment-deadlines');
    loadScriptOnce('v49-student-topic-progress.js?v=49b-2', 'data-v49b-student-topic-progress');
    loadScriptOnce('v50-student-progress-overview.js?v=50b3-1', 'data-v50-student-progress-overview');
    loadScriptOnce('v50-accessibility-polish.js?v=50b4a-1', 'data-v50-accessibility-polish');
    loadScriptOnce('teacher-reporting.js', 'data-teacher-reporting');
    loadScriptOnce('teacher-launch-operations.js', 'data-teacher-launch-operations');
    loadScriptOnce('paper-import-management.js', 'data-paper-import-management');
    loadScriptOnce('v52-topical-exercise-foundation.js?v=52a-1', 'data-v52a-topical-exercise-foundation');
    loadScriptOnce('v52b1-question-bank-observer-gate.js?v=52b1-2', 'data-v52b1-question-bank-observer-gate');
    loadScriptOnce('question-bank-selection-qa.js', 'data-question-bank-selection-qa');
    loadScriptOnce('v52-topical-activation-guard.js?v=52a-1', 'data-v52a-topical-activation-guard');
    loadScriptOnce('question-bank-metadata-review.js', 'data-question-bank-metadata-review');
    loadScriptOnce('v52-teacher-topical-library.js?v=52b-1', 'data-v52b-teacher-topical-library');
    loadScriptOnce('question-bank-audit-multipart.js', 'data-question-bank-audit-multipart');
    loadScriptOnce('v51-exam-publication-safety.js?v=51b3-1', 'data-v51-exam-publication-safety');
    loadScriptOnce('v51-exam-publication-ui-polish.js?v=51b3-ui-3', 'data-v51-exam-publication-ui-polish');
    loadScriptOnce('student-exam-ui.js', 'data-student-exam-ui');
    loadScriptOnce('v50-security-hardening.js?v=50rc2-1', 'data-v50-security-hardening');
    loadScriptOnce('release-audit-ui.js', 'data-release-audit-ui');
    loadScriptOnce('v52b1-question-bank-performance.js?v=52b1-3', 'data-v52b1-question-bank-performance');
    loadScriptOnce('v52b1-large-import-timeout-recovery.js?v=52b1-1', 'data-v52b1-large-import-timeout-recovery');
    loadScriptOnce('topical-legacy-student-route.js', 'data-topical-legacy-student-route');
    loadScriptOnce('practice-eligibility-ui.js', 'data-practice-eligibility-ui');
    loadScriptOnce('practice-selection-engine.js', 'data-practice-selection-engine');
    loadScriptOnce('practice-ui-resource-clarity.js', 'data-practice-ui-resource-clarity');
    loadScriptOnce('resource-bank-ui.js', 'data-resource-bank-ui');
    loadScriptOnce('resource-bank-bulk.js', 'data-resource-bank-bulk');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV51StableRelease, { once:true });
  } else {
    applyV51StableRelease();
  }
})();