/* Platform V0.1 — preview-only sign-in ownership.
   Runs after the complete Maths stack and platform session/logout wrappers.
   It owns the Student sign-in interaction in capture phase so legacy Maths
   listeners cannot race a platform-first Science-only login. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const platformValidateStudentAccess = validateStudentAccess;
  let signInInFlight = false;

  function readPlatformSession(){
    try {
      const raw = sessionStorage.getItem(PLATFORM_KEY);
      return raw ? JSON.parse(raw) : null;
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

  async function runPlatformSignIn(){
    if (signInInFlight) return;
    signInInFlight = true;

    const button = document.getElementById('v40c-student-signin');
    const status = document.getElementById('v40c-session-status');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Signing you in securely…';

    try {
      await platformValidateStudentAccess('practice');

      /* Do not depend on a DOM mutation or another event listener for the
         Science-only transition. If platform authentication succeeded and the
         teacher allows Science but not Maths, go directly to Science now. */
      const platformSession = readPlatformSession();
      if (isScienceOnly(platformSession)) {
        window.location.assign('/science/');
        return;
      }
    } catch (error) {
      console.warn('Platform sign-in did not complete.', error);
      if (status) status.textContent = 'Sign in was not completed. Check your Student ID and PIN.';
    } finally {
      signInInFlight = false;
      if (button && window.location.pathname !== '/science/') button.disabled = false;
    }
  }

  function captureSignInClick(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    runPlatformSignIn();
  }

  function capturePinEnter(event){
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runPlatformSignIn();
  }

  function wire(){
    const button = document.getElementById('v40c-student-signin');
    if (button && button.dataset.platformSigninOwnerV01 !== 'true') {
      button.dataset.platformSigninOwnerV01 = 'true';
      button.addEventListener('click', captureSignInClick, { capture:true });
    }

    const pin = document.getElementById('student-pin');
    if (pin && pin.dataset.platformSigninOwnerV01 !== 'true') {
      pin.dataset.platformSigninOwnerV01 = 'true';
      pin.addEventListener('keydown', capturePinEnter, { capture:true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once:true });
  } else {
    wire();
  }
})();
