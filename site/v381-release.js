/* V3.8.1 release housekeeping — AI Help connectivity hotfix. */
(() => {
  'use strict';

  const applyReleaseV381 = () => {
    document.title = 'Math Practice V3.8.1';

    const versionBadge = document.querySelector('#start .brand .badge');
    if (versionBadge) {
      versionBadge.textContent = 'Version 3.8.1 • AI Help Hotfix';
    }

    const releaseNote = document.querySelector('#start > .info');
    if (releaseNote) {
      releaseNote.innerHTML = `
        <strong>V3.8.1:</strong>
        AI Learning Help connectivity has been improved for the live app.
        Practice and Recommended Practice keep the same staged AI support,
        while Exam Mode and Exam Assignments continue to keep AI Help switched off.
      `;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyReleaseV381, { once: true });
  } else {
    applyReleaseV381();
  }
})();
