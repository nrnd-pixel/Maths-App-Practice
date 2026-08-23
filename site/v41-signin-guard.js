/* V4.1C preview regression guard.
   V3.2F.3 still binds Enter on #student-pin to click Start Practice.
   V4 sign-in owns that key now, so intercept it before the legacy target handler
   can run. Authentication remains unchanged and the PIN is never stored. */
(() => {
  'use strict';

  if (window.__v41StudentPinEnterGuardInstalled) return;
  window.__v41StudentPinEnterGuardInstalled = true;

  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.key !== 'Enter' || target?.id !== 'student-pin') return;

    const panel = document.querySelector('#start .v40c-session-panel');
    if (!panel || panel.classList.contains('v40c-authenticated')) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (typeof validateStudentAccess === 'function') {
      validateStudentAccess('practice');
      return;
    }

    document.getElementById('v40c-student-signin')?.click();
  }, true);
})();
