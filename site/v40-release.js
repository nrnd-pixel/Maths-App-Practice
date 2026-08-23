/* V4.2 release presentation — Teacher Action & Practice Assignments.
   Loads the additive V4.1, V4.2 and staged V4.3 modules from the established release entry point. */
(() => {
  'use strict';

  function loadScriptOnce(src, dataKey){
    if (document.querySelector(`script[${dataKey}="1"]`)) return;

    const script = document.createElement('script');
    script.src = src;
    script.setAttribute(dataKey, '1');
    document.head.appendChild(script);
  }

  function applyV42Release(){
    document.title = 'Math Practice V4.2';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 4.2 • Teacher Action & Practice Assignments';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V4.2:</strong>
        Teacher Action Center, targeted Practice Assignments and safer roster tools help teachers turn learning insight into action.
        Student mastery and mistake recovery remain connected, and Exam Mode stays AI-free.
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
    loadScriptOnce('v43-combined-teacher-improvements.js', 'data-v43d-combined-teacher-improvements');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV42Release, { once:true });
  } else {
    applyV42Release();
  }
})();
