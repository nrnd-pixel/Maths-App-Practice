/* Platform V0.1 — preview-only platform-first student session controller.
   This is the single owner of Student sign-in, platform session rendering and
   coordinated logout. It delegates to the established Mathematics validator
   only after the platform ticket explicitly grants Mathematics access. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const MATH_KEY = 'mathStudentSessionV40';
  const START_VIEW_KEY = 'v40StartView';
  const EXPIRY_SAFETY_MS = 15 * 1000;
  const RPC_TIMEOUT_MS = 15 * 1000;
  const PLATFORM_RPC_PATHS = Object.freeze({
    validate_platform_student_access: '/api/platform/validate-student',
    exchange_math_access_for_platform: '/api/platform/exchange-math',
    get_student_subject_access: '/api/platform/subject-access'
  });
  const mathValidateStudentAccess = validateStudentAccess;
  const mathAccessTransforms = [];
  let platformSignInPromise = null;
  let logoutInProgress = false;

  function platformSessionIsValid(session){
    return !!(
      session?.version === 1 &&
      session?.token &&
      session?.identity?.student_name &&
      session?.identity?.student_id &&
      Number(session?.expiresAt || 0) > Date.now() + EXPIRY_SAFETY_MS
    );
  }

  function readPlatformSession(){
    try {
      const raw = sessionStorage.getItem(PLATFORM_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return platformSessionIsValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function readMathSession(){
    try {
      const raw = sessionStorage.getItem(MATH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed?.version !== 1 ||
        !parsed?.tokens?.practice ||
        !parsed?.identity?.student_id ||
        Number(parsed?.expiresAt || 0) <= Date.now()
      ) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function identityFromPayload(payload){
    return {
      access_mode: payload?.access_mode || 'student_pin',
      registered: !!payload?.registered,
      roster_student_id: payload?.roster_student_id || payload?.student?.roster_student_id || null,
      class_id: payload?.class_id || payload?.student?.class_id || null,
      student_name: payload?.student_name || payload?.student?.student_name || 'Student',
      student_id: payload?.student_id || payload?.student?.student_id || null,
      year_level: Number(payload?.year_level || payload?.student?.year_level || 6),
      class_name: payload?.class_name || payload?.student?.class_name || 'Other'
    };
  }

  function normalizedSubjects(payload){
    return {
      maths: {
        allowed: payload?.subjects?.maths?.allowed === true,
        source: payload?.subjects?.maths?.source || 'deny_default'
      },
      science: {
        allowed: payload?.subjects?.science?.allowed === true,
        source: payload?.subjects?.science?.source || 'deny_default'
      }
    };
  }

  function emitSession(session){
    window.dispatchEvent(new CustomEvent('platformsubjectaccesschange', { detail: session }));
  }

  function savePlatformPayload(payload){
    const token = String(payload?.platform_access_token || payload?.token || '').trim();
    const expiresAt = Date.parse(payload?.expires_at || '');
    const session = {
      version: 1,
      token,
      createdAt: Date.now(),
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0,
      identity: identityFromPayload(payload),
      subjects: normalizedSubjects(payload)
    };

    if (!platformSessionIsValid(session)) {
      throw new Error('Learning Platform access could not be verified.');
    }

    sessionStorage.setItem(PLATFORM_KEY, JSON.stringify(session));
    renderPlatformUi(session);
    emitSession(session);
    return session;
  }

  function clearPlatformSession(){
    try { sessionStorage.removeItem(PLATFORM_KEY); } catch {}
    emitSession(null);
  }

  function credentialsFromForm(){
    return {
      displayName: document.getElementById('student-name')?.value.trim() || '',
      studentId: document.getElementById('student-id')?.value.trim() || '',
      pin: document.getElementById('student-pin')?.value || '',
      selectedYear: Number(document.getElementById('year-level')?.value || 6),
      classGroup: document.getElementById('class-group')?.value || 'Other'
    };
  }

  function setStatus(message){
    const status = document.getElementById('v40c-session-status');
    if (status) status.textContent = message;
  }

  function callPlatformRpc(name, args){
    const publishableKey = String(window.MATH_APP_CONFIG?.supabasePublishableKey || '');
    const endpoint = PLATFORM_RPC_PATHS[name];
    if (!endpoint || !publishableKey || typeof XMLHttpRequest !== 'function') {
      return Promise.reject(new Error('Learning Platform is not ready.'));
    }

    if (name === 'validate_platform_student_access') {
      setStatus('Contacting the Learning Platform…');
    }

    return new Promise((resolve,reject) => {
      const request = new XMLHttpRequest();
      request.open('POST',endpoint,true);
      request.timeout = RPC_TIMEOUT_MS;
      request.setRequestHeader('apikey',publishableKey);
      request.setRequestHeader('Content-Type','application/json');

      request.onload = () => {
        let data = null;
        try { data = request.responseText ? JSON.parse(request.responseText) : null; } catch {}
        if (request.status < 200 || request.status >= 300) {
          reject(new Error(data?.message || data?.details || `Learning Platform request failed (${request.status}).`));
          return;
        }
        if (name === 'validate_platform_student_access') {
          setStatus('Access confirmed. Preparing My Learning…');
        }
        resolve(data);
      };
      request.onerror = () => reject(new Error('Learning Platform could not be reached. Please check the connection and try again.'));
      request.ontimeout = () => reject(new Error('Learning Platform verification timed out. Please check the connection and try again.'));
      request.onabort = () => reject(new Error('Learning Platform verification was cancelled. Please try again.'));
      request.send(JSON.stringify(args || {}));
    });
  }

  async function loginPlatformWithPin(){
    const credentials = credentialsFromForm();

    if (studentAccessPolicy?.student_id_required && !credentials.studentId) {
      throw new Error('Enter your registered Student ID.');
    }
    if (studentAccessPolicy?.pin_required && !/^[0-9]{4,8}$/.test(credentials.pin)) {
      throw new Error('Enter your 4–8 digit student PIN.');
    }
    if (studentAccessPolicy?.access_mode === 'open' && !credentials.displayName) {
      throw new Error('Please enter the student name.');
    }

    const data = await callPlatformRpc('validate_platform_student_access', {
      p_student_id: credentials.studentId,
      p_pin: credentials.pin,
      p_display_name: credentials.displayName,
      p_selected_year: credentials.selectedYear,
      p_class_group: credentials.classGroup
    });
    if (!data?.allowed) throw new Error(data?.message || 'Student access could not be verified.');
    return savePlatformPayload(data);
  }

  async function bootstrapPlatformFromMath(){
    const mathSession = readMathSession();
    if (!mathSession?.tokens?.practice) return null;

    const data = await callPlatformRpc('exchange_math_access_for_platform', {
      p_math_access_token: mathSession.tokens.practice
    });
    if (!data?.allowed) return null;
    return savePlatformPayload(data);
  }

  async function refreshPlatformAccess(){
    const current = readPlatformSession();
    if (!current) return current;
    try {
      const data = await callPlatformRpc('get_student_subject_access', {
        p_platform_access_token: current.token
      });
      if (!data?.allowed) throw new Error('Platform session expired.');
      const refreshed = {
        ...current,
        expiresAt: Date.parse(data?.expires_at || '') || current.expiresAt,
        identity: identityFromPayload(data),
        subjects: normalizedSubjects(data)
      };
      sessionStorage.setItem(PLATFORM_KEY, JSON.stringify(refreshed));
      renderPlatformUi(refreshed);
      emitSession(refreshed);
      return refreshed;
    } catch {
      clearPlatformSession();
      return null;
    }
  }

  async function ensurePlatformSession(){
    const current = readPlatformSession();
    if (current) return current;

    const bootstrapped = await bootstrapPlatformFromMath();
    if (bootstrapped) return bootstrapped;

    return loginPlatformWithPin();
  }

  function mathsAllowed(session = readPlatformSession()){
    return session?.subjects?.maths?.allowed === true;
  }

  function enterPlatformHome(){
    const start = document.getElementById('start');
    if (!start) return;

    try {
      if (typeof show === 'function') show('start');
    } catch {}

    start.classList.add('v40-shell-authenticated');
    start.classList.remove('v40-shell-logged-out');
    start.dataset.v40StartView = 'home';
    try { sessionStorage.setItem(START_VIEW_KEY, 'home'); } catch {}

    document.querySelectorAll('#start [data-v40-nav]').forEach(button => {
      if (button.dataset.v40Nav === 'home') button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
  }

  function renderPlatformUi(session = readPlatformSession()){
    const panel = document.querySelector('#start .v40c-session-panel');
    if (!panel || !platformSessionIsValid(session)) return;

    panel.classList.add('v40c-authenticated');
    const identityText = panel.querySelector('.v40c-session-identity-text');
    if (identityText) {
      const subjects = [
        session.subjects?.maths?.allowed ? 'Mathematics' : '',
        session.subjects?.science?.allowed ? 'Science' : ''
      ].filter(Boolean).join(' + ') || 'No subject assigned';
      identityText.innerHTML = `
        <strong>✓ Signed in as ${esc(session.identity.student_name || 'Student')}</strong>
        <div class="help">Year ${Number(session.identity.year_level || 6)} · ${esc(session.identity.class_name || 'Other')} · Student ID ${esc(session.identity.student_id || '—')}</div>
        <div class="help">Subject access: ${esc(subjects)}</div>
      `;
    }

    const id = document.getElementById('student-id');
    const pin = document.getElementById('student-pin');
    if (id) id.disabled = true;
    if (pin) pin.disabled = true;

    if (!mathsAllowed(session)) {
      activeStudentAccess = null;
      document.getElementById('my-progress-btn')?.classList.add('hidden');
      document.getElementById('my-assignments-btn')?.classList.add('hidden');
      enterPlatformHome();
    }
  }

  function setSigningState(isSigning){
    const button = document.getElementById('v40c-student-signin');
    if (button) button.disabled = isSigning;
    if (isSigning) {
      const status = document.getElementById('v40c-session-status');
      if (status) status.textContent = 'Signing you in securely…';
    }
  }

  async function transformMathAccess(access, purpose){
    let transformed = access;
    for (const transform of mathAccessTransforms) {
      transformed = await transform(transformed, purpose);
    }
    return transformed;
  }

  async function platformFirstStudentAccess(purpose){
    if (logoutInProgress) return null;

    setSigningState(true);
    let session = null;
    try {
      if (!platformSignInPromise) {
        platformSignInPromise = ensurePlatformSession().finally(() => {
          platformSignInPromise = null;
        });
      }
      session = await platformSignInPromise;

      if (!mathsAllowed(session)) {
        const pin = document.getElementById('student-pin');
        if (pin) pin.value = '';
        activeStudentAccess = null;
        renderPlatformUi(session);
        const status = document.getElementById('v40c-session-status');
        if (status) status.textContent = session?.subjects?.science?.allowed
          ? 'Signed in securely. Choose Science from My Learning.'
          : 'Signed in securely. No subjects are currently enabled.';
        return null;
      }

      const mathAccess = await mathValidateStudentAccess(purpose);
      return transformMathAccess(mathAccess, purpose);
    } catch (error) {
      console.warn('Platform student sign-in failed.', error);
      const pin = document.getElementById('student-pin');
      if (pin) pin.value = '';
      setStatus(error?.message || 'Sign in was not completed. Check your Student ID and PIN.');
      alert(error?.message || 'Student access could not be verified.');
      return null;
    } finally {
      setSigningState(false);
    }
  }

  validateStudentAccess = async function(purpose){
    return platformFirstStudentAccess(purpose);
  };

  function captureSignIn(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    void platformFirstStudentAccess('practice');
  }

  function capturePinEnter(event){
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void platformFirstStudentAccess('practice');
  }

  function captureLogout(){
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen?.id === 'quiz' || activeScreen?.id === 'exam') return;

    logoutInProgress = true;
    clearPlatformSession();
    setTimeout(() => {
      logoutInProgress = false;
    }, 0);
  }

  function wireInteractionOwner(){
    const signIn = document.getElementById('v40c-student-signin');
    if (signIn && signIn.dataset.platformSessionOwnerV01 !== 'true') {
      signIn.dataset.platformSessionOwnerV01 = 'true';
      signIn.addEventListener('click', captureSignIn, { capture:true });
      const status = document.getElementById('v40c-session-status');
      if (status && !readPlatformSession()) status.textContent = 'Secure platform sign-in is ready.';
    }

    const pin = document.getElementById('student-pin');
    if (pin && pin.dataset.platformSessionOwnerV01 !== 'true') {
      pin.dataset.platformSessionOwnerV01 = 'true';
      pin.addEventListener('keydown', capturePinEnter, { capture:true });
    }

    const logout = document.getElementById('v40c-student-logout');
    if (logout && logout.dataset.platformSessionOwnerV01 !== 'true') {
      logout.dataset.platformSessionOwnerV01 = 'true';
      logout.addEventListener('click', captureLogout, { capture:true });
    }
  }

  async function apply(){
    wireInteractionOwner();
    const current = readPlatformSession();
    if (current) {
      renderPlatformUi(current);
      emitSession(current);
      return;
    }

    if (readMathSession()) {
      try { await bootstrapPlatformFromMath(); } catch {}
    }
  }

  window.platformStudentSessionV01 = {
    read: readPlatformSession,
    refresh: refreshPlatformAccess,
    clear: clearPlatformSession,
    signIn: platformFirstStudentAccess,
    whenIdle: () => platformSignInPromise || Promise.resolve(),
    addMathAccessTransform(transform){
      if (typeof transform !== 'function' || mathAccessTransforms.includes(transform)) return false;
      mathAccessTransforms.push(transform);
      return true;
    }
  };
  window.dispatchEvent(new CustomEvent('platformsessioncontrollerready'));

  window.addEventListener('focus', () => refreshPlatformAccess());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
