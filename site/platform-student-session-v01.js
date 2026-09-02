/* Platform V0.1 — preview-only Student ID/PIN platform session.
   Separates Learning Hub identity from Mathematics subject access so a student
   can be Maths-only, Science-only, both, or neither without storing the PIN. */
(() => {
  'use strict';

  const host = String(location.hostname || '').toLowerCase();
  const isDeployPreview = host.startsWith('deploy-preview-') &&
    host.endsWith('--magical-pixie-a61111.netlify.app');
  if (!isDeployPreview) return;

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const MATH_KEY = 'mathStudentSessionV40';
  const EXPIRY_SAFETY_MS = 15 * 1000;
  const mathValidateStudentAccess = validateStudentAccess;
  let platformSignInPromise = null;

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
    window.dispatchEvent(new CustomEvent('platformsubjectaccesschange', { detail: session }));
    renderPlatformUi();
    return session;
  }

  function clearPlatformSession(){
    try { sessionStorage.removeItem(PLATFORM_KEY); } catch {}
    window.dispatchEvent(new CustomEvent('platformsubjectaccesschange', { detail: null }));
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

  async function loginPlatformWithPin(){
    if (!cloudReady || !cloud) throw new Error('Learning Platform is not ready.');
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

    const { data, error } = await cloud.rpc('validate_platform_student_access', {
      p_student_id: credentials.studentId,
      p_pin: credentials.pin,
      p_display_name: credentials.displayName,
      p_selected_year: credentials.selectedYear,
      p_class_group: credentials.classGroup
    });
    if (error) throw error;
    if (!data?.allowed) throw new Error(data?.message || 'Student access could not be verified.');
    return savePlatformPayload(data);
  }

  async function bootstrapPlatformFromMath(){
    const mathSession = readMathSession();
    if (!mathSession?.tokens?.practice || !cloudReady || !cloud) return null;

    const { data, error } = await cloud.rpc('exchange_math_access_for_platform', {
      p_math_access_token: mathSession.tokens.practice
    });
    if (error || !data?.allowed) return null;
    return savePlatformPayload(data);
  }

  async function refreshPlatformAccess(){
    const current = readPlatformSession();
    if (!current || !cloudReady || !cloud) return current;
    try {
      const { data, error } = await cloud.rpc('get_student_subject_access', {
        p_platform_access_token: current.token
      });
      if (error || !data?.allowed) throw error || new Error('Platform session expired.');
      const refreshed = {
        ...current,
        expiresAt: Date.parse(data?.expires_at || '') || current.expiresAt,
        identity: identityFromPayload(data),
        subjects: normalizedSubjects(data)
      };
      sessionStorage.setItem(PLATFORM_KEY, JSON.stringify(refreshed));
      window.dispatchEvent(new CustomEvent('platformsubjectaccesschange', { detail: refreshed }));
      renderPlatformUi();
      return refreshed;
    } catch {
      clearPlatformSession();
      renderPlatformUi();
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

  function renderPlatformUi(){
    const session = readPlatformSession();
    const panel = document.querySelector('#start .v40c-session-panel');
    if (!panel) return;

    if (!session) return;

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
    if (pin) {
      /*
        Do not clear the PIN here during the initial platform sign-in. The
        existing V4.0 Maths session immediately reuses the in-memory form value
        to issue its practice/exam tickets, then clears it in its own finally
        block. Science-only access clears the PIN explicitly below. The PIN is
        never copied to sessionStorage or any other persistent browser state.
      */
      pin.disabled = true;
    }

    if (!mathsAllowed(session)) {
      activeStudentAccess = null;
      document.getElementById('my-progress-btn')?.classList.add('hidden');
      document.getElementById('my-assignments-btn')?.classList.add('hidden');
    }
  }

  validateStudentAccess = async function(purpose){
    if (!platformSignInPromise) {
      platformSignInPromise = ensurePlatformSession().finally(() => {
        platformSignInPromise = null;
      });
    }

    let platformSession;
    try {
      platformSession = await platformSignInPromise;
    } catch (error) {
      const status = document.getElementById('v40c-session-status');
      if (status) status.textContent = 'Sign in was not completed. Check your Student ID and PIN.';
      alert(error?.message || 'Student access could not be verified.');
      return null;
    }

    if (!mathsAllowed(platformSession)) {
      const pin = document.getElementById('student-pin');
      if (pin) pin.value = '';
      activeStudentAccess = null;
      renderPlatformUi();
      const status = document.getElementById('v40c-session-status');
      if (status) status.textContent = 'Signed in. Choose an available subject from My Learning.';
      window.dispatchEvent(new CustomEvent('platformsubjectaccesschange', { detail: platformSession }));
      /*
        This is a successful Learning Hub sign-in, but deliberately returns no
        Mathematics access object. Maths callers therefore remain denied while
        the subject-aware home can render Science immediately.
      */
      return null;
    }

    return mathValidateStudentAccess(purpose);
  };

  function wireLogout(){
    const button = document.getElementById('v40c-student-logout');
    if (!button || button.dataset.platformV01Logout === 'true') return;
    button.dataset.platformV01Logout = 'true';
    button.addEventListener('click', () => {
      clearPlatformSession();
    });
  }

  async function apply(){
    wireLogout();
    renderPlatformUi();

    if (!readPlatformSession() && readMathSession()) {
      try { await bootstrapPlatformFromMath(); } catch {}
    }

    renderPlatformUi();
  }

  window.platformStudentSessionV01 = {
    read: readPlatformSession,
    refresh: refreshPlatformAccess,
    clear: clearPlatformSession
  };

  window.addEventListener('focus', () => refreshPlatformAccess());
  window.addEventListener('platformsubjectaccesschange', renderPlatformUi);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
