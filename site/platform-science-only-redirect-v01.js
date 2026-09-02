/* Platform V0.1 — preview-only direct route for Science-only students.
   A verified Science-only learner should not depend on the legacy Maths shell
   to expose the shared subject home. The platform session remains the source of
   truth; this module only chooses the next page after authentication. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const EXPIRY_SAFETY_MS = 15 * 1000;
  let redirecting = false;

  function readSession(){
    try {
      const raw = sessionStorage.getItem(PLATFORM_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (
        session?.version !== 1 ||
        !session?.token ||
        !session?.identity?.student_id ||
        Number(session?.expiresAt || 0) <= Date.now() + EXPIRY_SAFETY_MS
      ) return null;
      return session;
    } catch {
      return null;
    }
  }

  function isScienceOnly(session){
    return !!(
      session?.subjects?.science?.allowed === true &&
      session?.subjects?.maths?.allowed !== true
    );
  }

  function routeScienceOnly(){
    if (redirecting) return;
    const session = readSession();
    if (!isScienceOnly(session)) return;

    redirecting = true;
    try {
      sessionStorage.setItem('v40StartView', 'home');
    } catch {}

    window.location.assign('/science/');
  }

  window.addEventListener('platformsubjectaccesschange', routeScienceOnly);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', routeScienceOnly, { once:true });
  } else {
    routeScienceOnly();
  }
})();
