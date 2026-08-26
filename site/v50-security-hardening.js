/* V5.0RC2 — browser-side security hardening.
   Removes the legacy pre-auth Student-ID-only Exam assignment lookup from the active UI.
   Real Exam access and assignment tracking remain enforced by the verified server-side start flow. */
(() => {
  'use strict';

  if (window.__v50SecurityHardeningInstalled) return;
  window.__v50SecurityHardeningInstalled = true;

  function secureExamAccessNote(){
    const root = document.getElementById('exam-access-status');
    if (!root) return;
    root.innerHTML = '<div class="help">Student access and class participation will be verified securely when you start the paper.</div>';
  }

  function install(){
    try {
      window.refreshStudentAssignmentAccess = secureExamAccessNote;
    } catch (error) {
      console.warn('Could not replace the legacy pre-auth Exam participation check.',error);
    }
    secureExamAccessNote();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
