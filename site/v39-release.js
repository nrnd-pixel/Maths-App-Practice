/* V3.9 release housekeeping — Student Experience Polish. */
(() => {
  'use strict';

  function applyV39Release(){
    document.title = 'Math Practice V3.9';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge){
      versionBadge.textContent = 'Version 3.9 • Student Experience Polish';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote){
      releaseNote.innerHTML = `
        <strong>V3.9:</strong>
        The student experience is now clearer and easier to use, with a student-first home screen,
        a more guided Practice flow, improved AI Learning Help placement, clearer Progress and
        Assignments screens, and better mobile presentation and touch-friendly controls.
        Exam Mode and Exam Assignments continue to keep AI Help switched off.
      `;
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV39Release, { once:true });
  } else {
    applyV39Release();
  }
})();
