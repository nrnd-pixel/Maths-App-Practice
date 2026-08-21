/* V3.8 release housekeeping — visible version and start-screen release note. */
(() => {
  'use strict';

  const applyReleaseV38 = () => {
    document.title = 'Math Practice V3.8';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge) {
      versionBadge.textContent = 'Version 3.8 • AI Learning Help';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote) {
      releaseNote.innerHTML = `
        <strong>V3.8:</strong>
        AI Learning Help is now available in Practice and Recommended Practice,
        with staged support such as nudges, guided next steps, mistake explanations
        and method explanations. Teachers can control availability, provider settings
        and daily usage limits. Exam Mode and Exam Assignments keep AI Help switched off.
      `;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyReleaseV38, { once: true });
  } else {
    applyReleaseV38();
  }
})();
