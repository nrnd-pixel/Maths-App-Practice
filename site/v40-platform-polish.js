/* V4.0D — Platform polish.
   V4.1B also keeps sign-in-once Practice sessions usable across multiple
   completed Practice sets by rotating pre-issued temporary Practice tickets.
   The student PIN is captured only while signing in and is never stored. */
(() => {
  'use strict';

  const STYLE_ID = 'v40-platform-polish-style';
  const BASE_SESSION_KEY = 'mathStudentSessionV40';
  const PRACTICE_POOL_KEY = 'mathPracticeTicketPoolV41B';
  const PRACTICE_RESERVE_COUNT = 5;

  function applyV40DPolish(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Persistent student navigation reads as the primary tab bar. */
      .v40-student-nav{
        position:sticky;
        top:0;
        z-index:30;
        margin:0 0 20px;
        padding:8px 4px 10px;
        background:color-mix(in srgb,var(--card) 94%,transparent);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        border-bottom:1px solid var(--border);
      }

      .v40-student-nav button{
        min-height:44px;
        border-radius:12px;
      }

      .v40-student-nav button[aria-current="page"]{
        box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary) 10%,transparent);
      }

      /* Keep student identity compact beside the tabs. */
      .v40c-nav-identity{
        min-height:36px;
        padding:7px 10px;
      }

      /* Consistent vertical rhythm across the dedicated student areas. */
      #student-assignments,
      #student-dashboard,
      #student-review,
      #result,
      #exam-result,
      #quiz{
        scroll-margin-top:74px;
      }

      #student-assignments > h1,
      #student-dashboard > h1,
      #student-review > h1{
        margin-top:4px;
      }

      #student-assignments .student-assignment-card,
      #student-dashboard .practice-recommendation-card,
      #student-dashboard .insight-card,
      #student-dashboard .student-achievement-card,
      #student-dashboard .student-message-card-v37,
      #student-review .student-review-card,
      #student-review .student-result-head{
        border-radius:16px;
      }

      #student-assignments .student-assignment-card,
      #student-dashboard .practice-recommendation-card,
      #student-dashboard .insight-card,
      #student-dashboard .student-achievement-card,
      #student-dashboard .student-message-card-v37,
      #student-review .student-review-card{
        overflow-wrap:anywhere;
      }

      #student-assignments .student-assignment-action button,
      #student-dashboard .practice-recommendation-action button,
      #student-dashboard button,
      #student-review button,
      #result button,
      #exam-result button{
        min-height:44px;
      }

      /* Make the Learning Hub feel like an overview, not another form. */
      #start .v40c-session-panel.v40c-authenticated{
        margin-bottom:16px;
      }

      #start .v40c3-home-dashboard{
        margin-bottom:6px;
      }

      #start .v40c3-secondary-row{
        padding-bottom:2px;
      }

      #start .v40c-learn-setup{
        scroll-margin-top:78px;
      }

      /* Practice remains focused on the question and answer path. */
      #quiz .question-card,
      #quiz .answerbox,
      #quiz .feedback,
      #quiz .hint-box{
        overflow-wrap:anywhere;
      }

      #quiz img{
        max-width:100%;
        height:auto;
      }

      /* Keyboard users should always see where they are. */
      .v40-student-nav button:focus-visible,
      #start .v40c3-home-dashboard button:focus-visible,
      #start .v40c-learn-setup button:focus-visible,
      #student-assignments button:focus-visible,
      #student-dashboard button:focus-visible,
      #student-review button:focus-visible{
        outline:3px solid color-mix(in srgb,var(--primary) 42%,transparent);
        outline-offset:2px;
      }

      @media(max-width:760px){
        .v40-student-nav{
          margin-left:-2px;
          margin-right:-2px;
          padding-top:6px;
          padding-bottom:8px;
        }

        .v40-student-nav button{
          min-height:46px;
          padding:9px 12px;
        }

        .v40c-nav-identity{
          display:none;
        }

        #start .v40c3-priority-card,
        #start .v40-learning-hub-hero,
        #start .v40c-learn-setup,
        #start .v40c-session-panel{
          border-radius:16px;
        }

        #student-assignments .student-assignment-action,
        #student-dashboard .practice-recommendation-action{
          display:grid;
          grid-template-columns:1fr;
        }

        #student-assignments .student-assignment-action button,
        #student-dashboard .practice-recommendation-action button,
        #student-dashboard .buttons button,
        #student-review .buttons button{
          width:100%;
        }
      }

      @media(max-width:520px){
        .v40-student-nav{
          gap:4px;
        }

        .v40-student-nav button{
          gap:5px;
          padding:8px 10px;
          font-size:12px;
        }

        #start .v40c3-priority-card,
        #start .v40-learning-hub-hero{
          padding:15px;
        }

        #start .v40c3-glance{
          gap:7px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function readJson(key){
    try {
      return JSON.parse(sessionStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  function readBaseSession(){
    return readJson(BASE_SESSION_KEY);
  }

  function clearPracticePool(){
    try {
      sessionStorage.removeItem(PRACTICE_POOL_KEY);
    } catch {}
  }

  function writePracticePool(pool){
    try {
      sessionStorage.setItem(PRACTICE_POOL_KEY, JSON.stringify(pool));
    } catch {}
  }

  function readPracticePool(){
    const base = readBaseSession();
    const pool = readJson(PRACTICE_POOL_KEY);

    if (!base || !pool || pool.version !== 1) {
      if (!base) clearPracticePool();
      return null;
    }

    if (Number(pool.baseCreatedAt || 0) !== Number(base.createdAt || 0)) {
      clearPracticePool();
      return null;
    }

    if (Number(base.expiresAt || 0) <= Date.now()) {
      clearPracticePool();
      return null;
    }

    return pool;
  }

  function practiceIdentityMatches(reference, candidate){
    if (!reference || !candidate) return false;

    if (reference.roster_student_id && candidate.roster_student_id) {
      return String(reference.roster_student_id) === String(candidate.roster_student_id);
    }

    return (
      String(reference.student_id || '').trim().toLowerCase() ===
        String(candidate.student_id || '').trim().toLowerCase() &&
      Number(reference.year_level || 0) === Number(candidate.year_level || 0)
    );
  }

  async function requestReservePracticeTicket(credentials){
    const { data, error } = await cloud.rpc(
      'validate_student_access',
      {
        p_student_id: credentials.studentId,
        p_pin: credentials.pin,
        p_purpose: 'practice',
        p_display_name: credentials.displayName,
        p_selected_year: credentials.selectedYear,
        p_class_group: credentials.classGroup
      }
    );

    if (error) throw error;
    if (!data?.allowed || !data?.access_token) {
      throw new Error(data?.message || 'Could not prepare the next Practice session.');
    }

    return data;
  }

  async function initializePracticePool(credentials, firstAccess){
    if (!cloudReady) return null;

    const base = readBaseSession();
    if (!base) return null;

    const existing = readPracticePool();
    if (existing) return existing;

    let practiceAccess =
      firstAccess?.purpose === 'practice'
        ? firstAccess
        : (activeStudentAccess?.purpose === 'practice' ? activeStudentAccess : null);

    if (!practiceAccess?.access_token) {
      practiceAccess = await requestReservePracticeTicket(credentials);
    }

    const pool = {
      version: 1,
      baseCreatedAt: Number(base.createdAt || Date.now()),
      currentToken: practiceAccess.access_token,
      reserveTokens: [],
      exhausted: false,
      lastRotatedSession: '',
      createdAt: Date.now()
    };

    for (let index = 0; index < PRACTICE_RESERVE_COUNT; index += 1) {
      try {
        const ticket = await requestReservePracticeTicket(credentials);
        if (!practiceIdentityMatches(practiceAccess, ticket)) {
          throw new Error('Practice ticket identity did not match the signed-in student.');
        }
        pool.reserveTokens.push(ticket.access_token);
      } catch (error) {
        console.warn('Could not prepare an additional Practice ticket.', error);
        break;
      }
    }

    writePracticePool(pool);
    return pool;
  }

  function pooledPracticeAccess(baseAccess){
    const pool = readPracticePool();
    if (!pool?.currentToken || pool.exhausted) return baseAccess || null;

    const source = baseAccess || activeStudentAccess;
    if (!source) return null;

    return {
      ...source,
      access_token: pool.currentToken,
      purpose: 'practice'
    };
  }

  function rotatePracticeTicket(){
    if (!cloudReady) return;

    const pool = readPracticePool();
    if (!pool) return;

    const sessionKey = String(state?.clientSessionKey || state?.startedAt || '');
    if (sessionKey && pool.lastRotatedSession === sessionKey) return;

    if (pool.reserveTokens.length) {
      pool.currentToken = pool.reserveTokens.shift();
      pool.exhausted = false;
      pool.lastRotatedSession = sessionKey;
      writePracticePool(pool);

      if (activeStudentAccess) {
        activeStudentAccess = {
          ...activeStudentAccess,
          access_token: pool.currentToken,
          purpose: 'practice'
        };
      }
      return;
    }

    pool.exhausted = true;
    pool.lastRotatedSession = sessionKey;
    writePracticePool(pool);
    activeStudentAccess = null;
  }

  function requireFreshStudentSignIn(){
    try {
      sessionStorage.removeItem(BASE_SESSION_KEY);
      sessionStorage.removeItem(PRACTICE_POOL_KEY);
    } catch {}

    activeStudentAccess = null;
    alert('For security, please sign in again before starting another Practice session.');
    window.location.reload();
    return null;
  }

  async function ensurePooledPracticeAccess(){
    const pool = readPracticePool();

    if (pool?.exhausted) {
      return requireFreshStudentSignIn();
    }

    if (pool?.currentToken && activeStudentAccess) {
      const access = pooledPracticeAccess(activeStudentAccess);
      activeStudentAccess = access;
      return access;
    }

    const base = readBaseSession();
    if (base && !pool) {
      return requireFreshStudentSignIn();
    }

    return validateStudentAccess('practice');
  }

  function installPracticeTicketRotation(){
    if (window.__v41PracticeTicketRotationInstalled) return;
    window.__v41PracticeTicketRotationInstalled = true;

    const validateBase = validateStudentAccess;
    validateStudentAccess = async function(purpose){
      const requestedPurpose = purpose === 'exam' ? 'exam' : 'practice';
      const credentials = {
        displayName: document.getElementById('student-name')?.value.trim() || '',
        studentId: document.getElementById('student-id')?.value.trim() || '',
        pin: document.getElementById('student-pin')?.value || '',
        selectedYear: Number(document.getElementById('year-level')?.value || 6),
        classGroup: document.getElementById('class-group')?.value || 'Other'
      };

      const canPreparePool = !!(
        credentials.pin ||
        (studentAccessPolicy?.access_mode === 'open' && credentials.displayName)
      );

      const access = await validateBase(purpose);
      if (!access) return null;

      if (!readPracticePool() && canPreparePool && cloudReady) {
        try {
          await initializePracticePool(
            credentials,
            requestedPurpose === 'practice' ? access : null
          );
        } catch (error) {
          console.warn('Practice ticket pool could not be prepared.', error);
        }
      }

      if (requestedPurpose === 'practice') {
        const pooled = pooledPracticeAccess(access);
        activeStudentAccess = pooled;
        return pooled;
      }

      return access;
    };

    if (typeof startRecommendedPracticeV35 === 'function') {
      const startRecommendedBase = startRecommendedPracticeV35;
      startRecommendedPracticeV35 = async function(...args){
        const access = await ensurePooledPracticeAccess();
        if (!access) return;
        return startRecommendedBase.apply(this, args);
      };
    }

    if (typeof finishPractice === 'function') {
      const finishPracticeBase = finishPractice;
      finishPractice = async function(early){
        const result = await finishPracticeBase(early);

        if (
          cloudReady &&
          document.getElementById('result')?.classList.contains('active')
        ) {
          rotatePracticeTicket();
        }

        return result;
      };
    }

    const base = readBaseSession();
    const pool = readPracticePool();

    /*
      Existing V4.0 sessions contain only one Practice ticket. That ticket may
      already have been consumed by a completed Practice session. Force a clean
      one-time sign-in after this upgrade rather than silently reusing it.
    */
    if (base && !pool) {
      try {
        sessionStorage.removeItem(BASE_SESSION_KEY);
      } catch {}
      activeStudentAccess = null;
      window.location.reload();
      return;
    }

    if (pool?.currentToken && activeStudentAccess) {
      activeStudentAccess = pooledPracticeAccess(activeStudentAccess);
    }
  }

  function applyV41Runtime(){
    applyV40DPolish();
    installPracticeTicketRotation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV41Runtime, { once:true });
  } else {
    applyV41Runtime();
  }
})();
