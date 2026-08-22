/* V4.0 release housekeeping — Full Student Learning Platform. */
(() => {
  'use strict';

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
        Students can now sign in once and use a unified Learning Hub with persistent navigation
        across Learn, Assignments, Progress and Reviewed Work. Home highlights the most useful
        next step, Learn provides a cleaner Practice/Exam setup, and the student experience is
        more consistent across desktop and mobile. Exam Mode and Exam Assignments remain AI-free.
      `;
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyV40Release, { once:true });
  } else {
    applyV40Release();
  }
})();
