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
    document.head.appendChild(script);
  }

  function applyV51StableRelease(){
    document.title = 'Math Practice V5.1';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 5.1 • Stable Release';
    }

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
    loadScriptOnce('v42-practice-assignments.js', 'data-v42b-practice-assignments');
    loadScriptOnce('v42-roster-cleanup.js', 'data-v42c-roster-cleanup');
    loadScriptOnce('v42-quick-add-student.js', 'data-v42d-quick-add-student');
    loadScriptOnce('v43-individual-practice-assignments.js', 'data-v43a-individual-practice-assignments');
    loadScriptOnce('v43-multi-recipient-practice-assignments.js', 'data-v43b-multi-recipient-practice-assignments');
    loadScriptOnce('v43-teacher-dashboard-polish.js', 'data-v43c-teacher-dashboard-polish');
    loadScriptOnce('v43-combined-teacher-improvements.js?v=43d-1', 'data-v43d-combined-teacher-improvements');
    loadScriptOnce('v44-action-center-practice.js?v=44a-2', 'data-v44a-action-center-practice');
    loadScriptOnce('v44-shared-focus-groups.js?v=44b-2', 'data-v44b-shared-focus-groups');
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
    loadScriptOnce('v50-student-launch-readiness.js?v=50d1-1', 'data-v50-student-launch-readiness');
    loadScriptOnce('v50-teacher-operations.js?v=50d2-1', 'data-v50-teacher-operations');
    loadScriptOnce('v50-roster-edit.js?v=50launch-1', 'data-v50-roster-edit');
    loadScriptOnce('v51-paper-profile-validator.js?v=51a-1', 'data-v51-paper-profile-validator');
    loadScriptOnce('v51-bulk-question-image-upload.js?v=51a2-1', 'data-v51-bulk-question-image-upload');
    loadScriptOnce('v51-bulk-question-image-cleanup.js?v=51a2-1', 'data-v51-bulk-question-image-cleanup');
    loadScriptOnce('v51-bulk-question-image-safety.js?v=51a2-1', 'data-v51-bulk-question-image-safety');
    loadScriptOnce('v51-paper-package-preview.js?v=51a4-1', 'data-v51-paper-package-preview');
    loadScriptOnce('v51-paper-package-preview-status.js?v=51a4-1', 'data-v51-paper-package-preview-status');
    loadScriptOnce('v51-one-confirmation-paper-import.js?v=51a5-1', 'data-v51-one-confirmation-paper-import');
    loadScriptOnce('v51-post-import-integrity.js?v=51a6-1', 'data-v51-post-import-integrity');
    loadScriptOnce('v52-topical-exercise-foundation.js?v=52a-1', 'data-v52a-topical-exercise-foundation');
    loadScriptOnce('v52b1-question-bank-observer-gate.js?v=52b1-2', 'data-v52b1-question-bank-observer-gate');
    loadScriptOnce('v51-question-bank-qa.js?v=51b1-1', 'data-v51-question-bank-qa');
    loadScriptOnce('v51-question-bank-bulk-status.js?v=51b2a-1', 'data-v51-question-bank-bulk-status');
    loadScriptOnce('v52-topical-activation-guard.js?v=52a-1', 'data-v52a-topical-activation-guard');
    loadScriptOnce('v51-question-bank-bulk-metadata.js?v=51b2b-1', 'data-v51-question-bank-bulk-metadata');
    loadScriptOnce('v51-question-review-workflow.js?v=51b2c-1', 'data-v51-question-review-workflow');
    loadScriptOnce('v52-teacher-topical-library.js?v=52b-1', 'data-v52b-teacher-topical-library');
    loadScriptOnce('v51-question-change-history.js?v=51b2d-1', 'data-v51b2d-question-change-history');
    loadScriptOnce('v51-multipart-question-management.js?v=51b2e-1', 'data-v51b2e-multipart-question-management');
    loadScriptOnce('v51-exam-publication-safety.js?v=51b3-1', 'data-v51b3-exam-publication-safety');
    loadScriptOnce('v51-exam-publication-ui-polish.js?v=51b3-ui-3', 'data-v51b3-exam-publication-ui-polish');
    loadScriptOnce('v51-student-exam-paper-library.js?v=51c1-1', 'data-v51c1-student-exam-paper-library');
    loadScriptOnce('v51-student-exam-resume-progress.js?v=51c2-1', 'data-v51c2-student-exam-resume-progress');
    loadScriptOnce('v50-security-hardening.js?v=50rc2-1', 'data-v50-security-hardening');
    loadScriptOnce('v50-production-polish.js?v=51stable-1', 'data-v50-production-polish');
    loadScriptOnce('v50-release-audit.js?v=50rc2-1', 'data-v50-release-audit');
    loadScriptOnce('v50-rc2-empty-result-code-polish.js?v=50rc2-empty-1', 'data-v50-rc2-empty-result-code-polish');
    loadScriptOnce('v50-release-audit-rc3.js?v=51stable-1', 'data-v50-release-audit-rc3');
    loadScriptOnce('v52b1-question-bank-performance.js?v=52b1-2', 'data-v52b1-question-bank-performance');
    loadScriptOnce('v52b1-large-import-timeout-recovery.js?v=52b1-1', 'data-v52b1-large-import-timeout-recovery');
    loadScriptOnce('v52c-topical-publication.js?v=52c-1', 'data-v52c-topical-publication');
    loadScriptOnce('v52c-student-topical-library.js?v=52c-1', 'data-v52c-student-topical-library');
    loadScriptOnce('v52c1-topical-library-mount-hotfix.js?v=52c1-1', 'data-v52c1-topical-library-mount-hotfix');
    loadScriptOnce('v52c-topical-hint-bridge.js?v=52c-1', 'data-v52c-topical-hint-bridge');
    loadScriptOnce('v52c2-topical-result-ux.js?v=52c2-1', 'data-v52c2-topical-result-ux');
    loadScriptOnce('v53a-practice-eligibility.js?v=53a-1', 'data-v53a-practice-eligibility');
    loadScriptOnce('v53b-unified-practice-retrieval.js?v=53b-1', 'data-v53b-unified-practice-retrieval');
    loadScriptOnce('v53c-two-mode-student-ui.js?v=53c-1', 'data-v53c-two-mode-student-ui');
    loadScriptOnce('v53d1-teacher-practice-pool-alignment.js?v=53d1-3', 'data-v53d1-teacher-practice-pool-alignment');
    loadScriptOnce('v53d3-practice-selection-quality.js?v=53d3-1', 'data-v53d3-practice-selection-quality');
    loadScriptOnce('v53d4-student-recommendation-alignment.js?v=53d4-1', 'data-v53d4-student-recommendation-alignment');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV51StableRelease, { once:true });
  } else {
    applyV51StableRelease();
  }
})();
