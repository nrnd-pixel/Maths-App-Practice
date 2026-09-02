/* Platform V0.1 — preview-only sign-in ownership.
   Runs after the complete Maths stack and platform session/logout wrappers.
   It owns the Student sign-in interaction in capture phase so legacy Maths
   listeners cannot race a platform-first Science-only login.

   Science-only students use an explicit, normal navigation link after secure
   authentication. This avoids async programmatic-navigation stalls seen in
   deploy-preview browsers while preserving the same platform session. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const READY_ID = 'platform-v01-science-ready';
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

  function removeReadyState(){
    document.getElementById(READY_ID)?.remove();
  }

  function showScienceReady(session){
    const start = document.getElementById('start');
    const panel = document.querySelector('#start .v40c-session-panel');
    if (!start || !panel || !isScienceOnly(session)) return false;

    try {
      if (typeof show === 'function') show('start');
    } catch {}

    panel.classList.add('v40c-authenticated');
    start.classList.add('v40-shell-authenticated');
    start.classList.remove('v40-shell-logged-out');

    const identityText = panel.querySelector('.v40c-session-identity-text');
    if (identityText) {
      identityText.innerHTML = `
        <strong>✓ Signed in as ${esc(session.identity?.student_name || 'Student')}</strong>
        <div class="help">Year ${Number(session.identity?.year_level || 4)} · ${esc(session.identity?.class_name || '')} · Student ID ${esc(session.identity?.student_id || '—')}</div>
        <div class="help">Subject access: Science</div>
      `;
    }

    const pin = document.getElementById('student-pin');
    if (pin) {
      pin.value = '';
      pin.disabled = true;
    }
    const studentId = document.getElementById('student-id');
    if (studentId) studentId.disabled = true;

    let ready = document.getElementById(READY_ID);
    if (!ready) {
      ready = document.createElement('section');
      ready.id = READY_ID;
      ready.setAttribute('aria-label','Science ready');
      ready.style.cssText = [
        'margin:14px 0 18px',
        'padding:18px',
        'border:1px solid color-mix(in srgb,var(--success) 35%,var(--border))',
        'border-radius:16px',
        'background:var(--successbg)',
        'display:grid',
        'gap:10px'
      ].join(';');
      panel.insertAdjacentElement('afterend',ready);
    }

    ready.innerHTML = `
      <div style="font-size:12px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--success)">Science access confirmed</div>
      <div style="font-size:20px;font-weight:900">Science is ready, ${esc(session.identity?.student_name || 'Student')}</div>
      <div class="help">Your Student ID and PIN have been verified. Mathematics is not enabled for this account.</div>
      <div><a id="platform-v01-open-science" href="/science/" class="primary" style="display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:11px 17px;border-radius:13px;text-decoration:none;font-weight:820">Open Science →</a></div>
    `;

    const status = document.getElementById('v40c-session-status');
    if (status) status.textContent = 'Signed in securely. Science is ready.';

    return true;
  }

  async function runPlatformSignIn(){
    if (signInInFlight) return;
    signInInFlight = true;
    removeReadyState();

    const button = document.getElementById('v40c-student-signin');
    const status = document.getElementById('v40c-session-status');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Signing you in securely…';

    try {
      await platformValidateStudentAccess('practice');

      const platformSession = readPlatformSession();
      if (isScienceOnly(platformSession)) {
        showScienceReady(platformSession);
        return;
      }

      if (status && platformSession) {
        status.textContent = 'Signed in securely. Choose a subject from My Learning.';
      }
    } catch (error) {
      console.warn('Platform sign-in did not complete.', error);
      if (status) status.textContent = 'Sign in was not completed. Check your Student ID and PIN.';
    } finally {
      signInInFlight = false;
      if (button) button.disabled = false;
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

    const existing = readPlatformSession();
    if (isScienceOnly(existing)) showScienceReady(existing);
  }

  window.addEventListener('platformsubjectaccesschange', event => {
    const session = event?.detail || readPlatformSession();
    if (isScienceOnly(session)) showScienceReady(session);
    else removeReadyState();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once:true });
  } else {
    wire();
  }
})();
