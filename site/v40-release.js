/* V4.1 release presentation — Mastery & Mistake Recovery.
   V4.2 feature slices remain additive until the final V4.2 release pass. */
(() => {
  'use strict';

  function loadScriptOnce(src, dataKey){
    if (document.querySelector(`script[${dataKey}="1"]`)) return;

    const script = document.createElement('script');
    script.src = src;
    script.setAttribute(dataKey, '1');
    document.head.appendChild(script);
  }

  function applyV41Release(){
    document.title = 'Math Practice V4.1';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 4.1 • Mastery & Mistake Recovery';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V4.1:</strong>
        Focus Areas, mistake recovery and Mastery Progress now connect directly to your next Practice step.
        Exam Mode and Exam Assignments remain AI-free.
      `;
    }

    loadScriptOnce('v41-signin-guard.js', 'data-v41-signin-guard');
    loadScriptOnce('v41-mastery-progress.js', 'data-v41c-mastery-progress');
    loadScriptOnce('v42-teacher-action-center.js', 'data-v42a-teacher-action-center');
    loadScriptOnce('v42-practice-assignments.js', 'data-v42b-practice-assignments');
    loadScriptOnce('v42-roster-cleanup.js', 'data-v42c-roster-cleanup');
    loadScriptOnce('v42-quick-add-student.js', 'data-v42d-quick-add-student');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV41Release, { once:true });
  } else {
    applyV41Release();
  }
})();
