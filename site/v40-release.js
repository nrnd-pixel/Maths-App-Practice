/* V4.0 release housekeeping — Full Student Learning Platform.
   V4.1 feature slices stay additive until the final V4.1 release pass. */
(() => {
  'use strict';

  function loadV41MasteryProgress(){
    if (document.querySelector('script[data-v41c-mastery-progress="1"]')) return;

    const script = document.createElement('script');
    script.src = 'v41-mastery-progress.js';
    script.dataset.v41cMasteryProgress = '1';
    document.head.appendChild(script);
  }

  function applyV40Release(){
    document.title = 'Math Practice V4.0';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 4.0 • Full Student Learning Platform';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V4.0:</strong>
        Sign in once, then use Home, Learn, Assignments, Progress and Reviewed Work from one student platform.
        Exam Mode and Exam Assignments remain AI-free.
      `;
    }

    loadV41MasteryProgress();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV40Release, { once:true });
  } else {
    applyV40Release();
  }
})();
