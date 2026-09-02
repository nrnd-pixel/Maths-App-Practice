/* Platform V0.1 — preview-only atomic logout guard.
   Clears the platform session before the legacy Maths logout handler runs and
   suppresses any sign-in validation triggered during that logout transition. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const platformValidateStudentAccess = validateStudentAccess;
  let logoutInProgress = false;

  function clearPlatformBeforeMathLogout(){
    logoutInProgress = true;

    try {
      if (window.platformStudentSessionV01?.clear) {
        window.platformStudentSessionV01.clear();
      } else {
        sessionStorage.removeItem(PLATFORM_KEY);
        window.dispatchEvent(new CustomEvent('platformsubjectaccesschange', { detail: null }));
      }
    } catch {
      try { sessionStorage.removeItem(PLATFORM_KEY); } catch {}
    }

    /* Keep the guard active through synchronous logout rendering and any
       microtasks it schedules, then allow normal sign-in again. */
    setTimeout(() => {
      logoutInProgress = false;
    }, 0);
  }

  validateStudentAccess = async function(purpose){
    if (logoutInProgress) return null;
    return platformValidateStudentAccess(purpose);
  };

  function wire(){
    const button = document.getElementById('v40c-student-logout');
    if (!button || button.dataset.platformLogoutGuardV01 === 'true') return;
    button.dataset.platformLogoutGuardV01 = 'true';

    /* Capture phase intentionally runs before the existing V4.0 target/bubble
       logout listener, so there is never a platform-only signed-in gap. */
    button.addEventListener('click', clearPlatformBeforeMathLogout, { capture:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once:true });
  } else {
    wire();
  }
})();
