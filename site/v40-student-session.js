/* V4.0C1 — Sign-in-once student session.
   Reuses the existing temporary student access-ticket architecture.
   The student PIN is used only during sign-in and is never stored. */
(() => {
  'use strict';

  const STYLE_ID = 'v40-student-session-style';
  const STORAGE_KEY = 'mathStudentSessionV40';
  const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

  let studentSessionV40 = null;
  let signInPromiseV40 = null;

  /*
    Item 2 — credentials handoff: populated just before the PIN field is cleared
    in the finally block, so v40-platform-polish.js can initialise the Practice
    ticket pool without re-reading a now-empty DOM field.
    Cleared once the pool initialisation window closes (sign-in promise settles).
  */
  let lastSignInCredentialsV40 = null;

  const validateStudentAccessV40Base = validateStudentAccess;
  const renderStudentAccessPolicyV40Base = renderStudentAccessPolicy;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .v40c-session-panel{
        border:1px solid var(--border);
        border-radius:18px;
        padding:16px;
        margin:18px 0 20px;
        background:color-mix(in srgb,var(--soft) 28%,var(--card));
      }

      #start .v40c-session-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:14px;
      }

      #start .v40c-session-head h3{
        margin:0 0 4px;
        font-size:17px;
      }

      #start .v40c-session-head p{
        margin:0;
        color:var(--muted);
        font-size:13px;
        line-height:1.45;
      }

      #start .v40c-login-fields{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
        margin-top:14px;
      }

      #start .v40c-login-fields > label{
        min-width:0;
      }

      #start .v40c-login-fields #student-access-note{
        grid-column:1/-1;
        margin-top:0;
      }

      #start .v40c-login-actions{
        display:flex;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
        margin-top:12px;
      }

      #start .v40c-login-actions button{
        min-height:44px;
      }

      #start .v40c-session-status{
        color:var(--muted);
        font-size:12px;
        line-height:1.4;
      }

      #start .v40c-session-identity{
        display:none;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        margin-top:14px;
        padding:13px 14px;
        border:1px solid color-mix(in srgb,var(--success) 28%,var(--border));
        border-radius:14px;
        background:var(--successbg);
      }

      #start .v40c-session-identity strong{
        display:block;
        color:var(--success);
        margin-bottom:2px;
      }

      #start .v40c-session-identity .help{
        color:color-mix(in srgb,var(--success) 68%,var(--text));
      }

      #start .v40c-session-panel.v40c-authenticated .v40c-login-fields,
      #start .v40c-session-panel.v40c-authenticated .v40c-login-actions{
        display:none;
      }

      #start .v40c-session-panel.v40c-authenticated .v40c-session-identity{
        display:flex;
      }

      .v40c-nav-identity{
        flex:0 0 auto;
        margin-left:auto;
        display:inline-flex;
        align-items:center;
        gap:6px;
        min-height:34px;
        padding:6px 9px;
        border:1px solid var(--border);
        border-radius:999px;
        color:var(--muted);
        background:var(--card);
        font-size:11px;
        font-weight:800;
        white-space:nowrap;
      }

      html[data-theme="dark"] #start .v40c-session-panel{
        background:color-mix(in srgb,var(--soft) 18%,var(--card));
      }

      @media(max-width:620px){
        #start .v40c-login-fields{
          grid-template-columns:1fr;
        }

        #start .v40c-session-head,
        #start .v40c-session-identity{
          align-items:stretch;
          flex-direction:column;
        }

        #start .v40c-session-identity button{
          width:100%;
        }

        .v40c-nav-identity{
          margin-left:0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function sessionIsValid(session = studentSessionV40){
    return !!(
      session &&
      session.version === 1 &&
      session.tokens?.practice &&
      session.tokens?.exam &&
      session.identity?.student_name &&
      Number(session.expiresAt || 0) > Date.now()
    );
  }

  function identityFromAccess(access){
    return {
      access_mode: access?.access_mode || studentAccessPolicy?.access_mode || 'open',
      registered: !!access?.registered,
      roster_student_id: access?.roster_student_id || null,
      class_id: access?.class_id || null,
      student_name: access?.student_name || 'Student',
      student_id: access?.student_id || null,
      year_level: Number(access?.year_level || 6),
      class_name: access?.class_name || 'Other'
    };
  }

  function accessForPurpose(purpose){
    if (!sessionIsValid()) return null;

    const key = purpose === 'exam' ? 'exam' : 'practice';
    return {
      allowed: true,
      ...studentSessionV40.identity,
      access_token: studentSessionV40.tokens[key],
      purpose: key
    };
  }

  function saveSession(){
    if (!sessionIsValid()) return;

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(studentSessionV40)
      );
    } catch {}
  }

  function readStoredSession(){
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return sessionIsValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function removeStoredSession(){
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function revealVerifiedStudentActions(signedIn){
    const progress = document.getElementById('my-progress-btn');
    const assignments = document.getElementById('my-assignments-btn');

    [progress, assignments].forEach(button => {
      if (!button) return;
      if (signedIn && cloudReady) button.classList.remove('hidden');
      if (!signedIn) button.classList.add('hidden');
    });
  }

  function formatIdentity(identity){
    if (!identity) return '';

    const yearClass = typeof formatYearClassV331 === 'function'
      ? formatYearClassV331(identity.year_level, identity.class_name)
      : `Year ${identity.year_level}${identity.class_name ? ` · ${identity.class_name}` : ''}`;

    return `${identity.student_name} · ${yearClass}`;
  }

  function renderNavIdentity(){
    document.querySelectorAll('.v40-student-nav').forEach(nav => {
      let chip = nav.querySelector('.v40c-nav-identity');

      if (!sessionIsValid()) {
        chip?.remove();
        return;
      }

      if (!chip) {
        chip = document.createElement('span');
        chip.className = 'v40c-nav-identity';
        nav.appendChild(chip);
      }

      chip.innerHTML = `<span aria-hidden="true">👤</span><span>${esc(studentSessionV40.identity.student_name || 'Student')}</span>`;
      chip.title = formatIdentity(studentSessionV40.identity);
    });
  }

  /*
    Item 3 — explicit auth-state contract: dispatch a CustomEvent so that
    v40-start-shell.js (and any future listener) can react to auth changes
    without coupling to the v40c-authenticated CSS class on the session panel.
    This makes the dependency between the two files explicit and survives any
    future rename of the CSS class.
  */
  function dispatchAuthState(signedIn){
    try {
      document.dispatchEvent(
        new CustomEvent('v40:authStateChanged', {
          bubbles: false,
          detail: { signedIn: !!signedIn }
        })
      );
    } catch {}
  }

  function renderSessionUi(){
    const panel = document.querySelector('#start .v40c-session-panel');
    if (!panel) return;

    const signedIn = sessionIsValid();
    panel.classList.toggle('v40c-authenticated', signedIn);

    const identityText = panel.querySelector('.v40c-session-identity-text');
    if (identityText && signedIn) {
      identityText.innerHTML = `
        <strong>✓ Signed in as ${esc(studentSessionV40.identity.student_name || 'Student')}</strong>
        <div class="help">${esc(formatIdentity(studentSessionV40.identity).replace(`${studentSessionV40.identity.student_name} · `, ''))} · Student ID ${esc(studentSessionV40.identity.student_id || '—')}</div>
        <div class="help">You can move between Learn, Assignments, Progress and Reviewed Work without entering your PIN again.</div>
      `;
    }

    const id = document.getElementById('student-id');
    const pin = document.getElementById('student-pin');

    if (id) id.disabled = signedIn;
    if (pin) {
      pin.disabled = signedIn;
      if (signedIn) pin.value = '';
    }

    if (signedIn) {
      const access = accessForPurpose('practice');
      activeStudentAccess = access;
      applyVerifiedStudent(access);
      showVerifiedStudentV331(access);
    }

    revealVerifiedStudentActions(signedIn);
    renderNavIdentity();
    dispatchAuthState(signedIn);
  }

  function buildSessionPanel(){
    const start = document.getElementById('start');
    const panel = start?.querySelector('.v40c-session-panel');
    const fields = panel?.querySelector('.v40c-login-fields');
    const studentId = document.getElementById('student-id');
    const studentPin = document.getElementById('student-pin');
    const studentPinWrap = document.getElementById('student-pin-wrap');
    const accessNote = document.getElementById('student-access-note');
    const signIn = document.getElementById('v40c-student-signin');
    const logout = document.getElementById('v40c-student-logout');

    if (
      !start ||
      !panel ||
      !fields ||
      !studentId ||
      !studentPin ||
      !studentPinWrap ||
      !accessNote ||
      !signIn ||
      !logout
    ) return;

    const idLabel = studentId.closest('label');
    const staticNodesAreInPlace = !!(
      idLabel &&
      idLabel.parentElement === fields &&
      studentPinWrap.parentElement === fields &&
      accessNote.parentElement === fields
    );

    if (!staticNodesAreInPlace) {
      console.warn('V4.0 static student sign-in shell is incomplete.');
      return;
    }

    if (panel.dataset.v40SessionEnhanced === 'true') return;
    panel.dataset.v40SessionEnhanced = 'true';

    signIn.addEventListener('click', () => validateStudentAccess('practice'));
    logout.addEventListener('click', logoutStudentV40);

    studentPin.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !sessionIsValid()) {
        event.preventDefault();
        validateStudentAccess('practice');
      }
    });
  }

  function clearStudentUi(){
    const id = document.getElementById('student-id');
    const pin = document.getElementById('student-pin');
    const name = document.getElementById('student-name');
    const year = document.getElementById('year-level');
    const cls = document.getElementById('class-group');

    if (id) {
      id.disabled = false;
      id.value = '';
    }

    if (pin) {
      pin.disabled = false;
      pin.value = '';
    }

    if (name) name.value = '';
    if (year) year.disabled = false;
    if (cls) cls.disabled = false;

    activeStudentAccess = null;
    renderStudentAccessPolicyV40Base();
    renderSessionUi();
  }

  function logoutStudentV40(){
    const activeScreen = document.querySelector('.screen.active');

    if (activeScreen?.id === 'quiz') {
      alert('Finish or end Practice before logging out.');
      return;
    }

    if (activeScreen?.id === 'exam') {
      alert('Exit or submit the Exam before logging out.');
      return;
    }

    studentSessionV40 = null;
    removeStoredSession();
    clearStudentUi();
    dispatchAuthState(false);

    if (activeScreen?.id !== 'start') {
      const home = activeScreen?.querySelector('.back-home');
      if (home) home.click();
    }
  }

  async function requestTicket(purpose, credentials){
    const { data, error } = await cloud.rpc(
      'validate_student_access',
      {
        p_student_id: credentials.studentId,
        p_pin: credentials.pin,
        p_purpose: purpose,
        p_display_name: credentials.displayName,
        p_selected_year: credentials.selectedYear,
        p_class_group: credentials.classGroup
      }
    );

    if (error) throw error;
    if (!data?.allowed) {
      throw new Error(data?.message || 'Student access could not be verified.');
    }

    return data;
  }

  async function createStudentSessionV40(requestedPurpose){
    if (!cloudReady) {
      return validateStudentAccessV40Base(requestedPurpose);
    }

    if (!studentAccessPolicyReady) {
      await loadStudentAccessPolicy();
    }

    if (!studentAccessPolicyReady) {
      alert('Student access is not ready. Please refresh and try again.');
      return null;
    }

    const credentials = {
      displayName: document.getElementById('student-name')?.value.trim() || '',
      studentId: document.getElementById('student-id')?.value.trim() || '',
      pin: document.getElementById('student-pin')?.value || '',
      selectedYear: Number(document.getElementById('year-level')?.value || 6),
      classGroup: document.getElementById('class-group')?.value || 'Other'
    };

    if (studentAccessPolicy.student_id_required && !credentials.studentId) {
      alert('Enter your registered Student ID.');
      return null;
    }

    if (studentAccessPolicy.pin_required && !/^[0-9]{4,8}$/.test(credentials.pin)) {
      alert('Enter your 4–8 digit student PIN.');
      return null;
    }

    if (studentAccessPolicy.access_mode === 'open' && !credentials.displayName) {
      alert('Please enter the student name.');
      return null;
    }

    const status = document.getElementById('v40c-session-status');
    const signIn = document.getElementById('v40c-student-signin');

    if (signIn) signIn.disabled = true;
    if (status) status.textContent = 'Signing you in securely…';

    try {
      /*
        Validate once from the student's perspective, then issue both existing
        purpose-specific tickets while the PIN exists only in this local variable.
        A failed PIN attempt stops after the first RPC so it is counted once.
      */
      const practiceAccess = await requestTicket('practice', credentials);
      const examAccess = await requestTicket('exam', credentials);

      if (
        practiceAccess.roster_student_id &&
        examAccess.roster_student_id &&
        String(practiceAccess.roster_student_id) !== String(examAccess.roster_student_id)
      ) {
        throw new Error('Student session identity did not match. Please sign in again.');
      }

      studentSessionV40 = {
        version: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_MAX_AGE_MS,
        identity: identityFromAccess(practiceAccess),
        tokens: {
          practice: practiceAccess.access_token,
          exam: examAccess.access_token
        }
      };

      saveSession();

      const access = accessForPurpose(requestedPurpose);
      activeStudentAccess = access;
      applyVerifiedStudent(access);
      showVerifiedStudentV331(access);
      renderSessionUi();

      return access;
    } catch (error) {
      console.warn('V4.0 student sign-in failed.', error);
      studentSessionV40 = null;
      removeStoredSession();
      if (status) status.textContent = 'Sign in was not completed. Check your Student ID and PIN.';
      alert(error?.message || 'Student access could not be verified.');
      return null;
    } finally {
      const pin = document.getElementById('student-pin');
      /*
        Store credentials before wiping the PIN field so v40-platform-polish.js
        can read lastSignInCredentialsV40 when initialising the Practice ticket
        pool. The PIN is a local-variable copy here — clearing the DOM field is
        safe and the copy in lastSignInCredentialsV40 is short-lived.
      */
      lastSignInCredentialsV40 = {
        displayName: credentials?.displayName || '',
        studentId:   credentials?.studentId   || '',
        pin:         credentials?.pin         || '',
        selectedYear: credentials?.selectedYear ?? 6,
        classGroup:  credentials?.classGroup  || 'Other'
      };
      if (pin) pin.value = '';
      if (signIn) signIn.disabled = false;
    }
  }

  async function ensureStudentSessionV40(purpose){
    const requestedPurpose = purpose === 'exam' ? 'exam' : 'practice';

    if (sessionIsValid()) {
      const access = accessForPurpose(requestedPurpose);
      activeStudentAccess = access;
      applyVerifiedStudent(access);
      showVerifiedStudentV331(access);
      renderSessionUi();
      return access;
    }

    if (studentSessionV40) {
      studentSessionV40 = null;
      removeStoredSession();
      renderSessionUi();
    }

    if (!signInPromiseV40) {
      signInPromiseV40 = createStudentSessionV40(requestedPurpose)
        .finally(() => {
          signInPromiseV40 = null;
          // Wipe the handoff credentials once the sign-in flow (and pool
          // initialisation in v40-platform-polish) has had its chance to run.
          lastSignInCredentialsV40 = null;
        });
    }

    await signInPromiseV40;
    return accessForPurpose(requestedPurpose);
  }

  validateStudentAccess = async function(purpose){
    return ensureStudentSessionV40(purpose);
  };

  // Expose the handoff accessor for v40-platform-polish.js (item 2).
  // Returns a snapshot copy so the caller cannot mutate the live object.
  // Guard against double-define (e.g. test environments that reload the script).
  if (!Object.getOwnPropertyDescriptor(window, '__v40LastSignInCredentials')) {
    Object.defineProperty(window, '__v40LastSignInCredentials', {
      get() { return lastSignInCredentialsV40 ? Object.assign({}, lastSignInCredentialsV40) : null; },
      configurable: false,
      enumerable: false
    });
  }

  renderStudentAccessPolicy = function(){
    renderStudentAccessPolicyV40Base();
    renderSessionUi();
  };

  function restoreSession(){
    const stored = readStoredSession();

    if (!stored) {
      removeStoredSession();
      return;
    }

    studentSessionV40 = stored;
    const access = accessForPurpose('practice');
    activeStudentAccess = access;
    applyVerifiedStudent(access);
    showVerifiedStudentV331(access);
  }

  function applyV40C1(){
    injectStyles();
    buildSessionPanel();
    restoreSession();
    renderSessionUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV40C1, { once: true });
  } else {
    applyV40C1();
  }
})();
