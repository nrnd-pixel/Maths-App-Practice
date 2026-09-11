/* V5.9B — Adaptive Diagnostic Pilot (test-only, isolated).
   Activates only when ?adaptivePilot=2 is present in the URL.
   Server-side pilot gate separately restricts access to approved pilot targets.

   Safety contract:
   - Does not replace startPractice, getQuestions or finishPractice.
   - Does not read from the question bank.
   - Does not use the normal Practice grading RPC for diagnostic answers.
   - Does not modify Practice score, attempts, XP, mastery or grading history.
   - The diagnostic overlay is self-contained; the normal Practice DOM is left
     intact underneath and resumes exactly when the overlay closes or is skipped.

   Target questions (2025 P1 Q9b, 2025 P2 Q4, 2025 P2 Q30) and allow-listing
   are enforced server-side by student_adaptive_trigger_check_v1. */

(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v59bAdaptiveDiagnosticPilotInstalled) return;
  ROOT.__v59bAdaptiveDiagnosticPilotInstalled = true;

  // ── URL gate ──────────────────────────────────────────────────────────────
  const enabled =
    typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('adaptivePilot') === '2';

  if (!enabled) {
    Object.defineProperty(ROOT, 'V59BAdaptiveDiagnosticPilot', {
      value: Object.freeze({ enabled: false }),
      writable: false, configurable: false
    });
    return;
  }

  // ── State machine ─────────────────────────────────────────────────────────
  const State = Object.freeze({
    DORMANT:      'dormant',
    WATCHING:     'watching',
    LOADING_PLAN: 'loading_plan',
    DIAGNOSTIC:   'diagnostic',
    GRADING:      'grading',
    TARGET_RETRY: 'target_retry',
    EXITING:      'exiting'
  });

  let state = State.DORMANT;

  // ── Session state ─────────────────────────────────────────────────────────
  // incorrectCounts: Map<questionId, number>
  const incorrectCounts = new Map();
  // handled: questions where the pilot has already triggered this session
  const handledQuestions = new Set();
  // skipped: questions where the student pressed Return to Practice mid-diagnostic
  const skippedQuestions = new Set();
  // current diagnostic session
  let session = null; // { diagnosticSessionId, targetQuestionId, targetSnapshot, items, currentIndex }

  const trim = v => String(v ?? '').trim();
  const byId = id => (typeof document === 'undefined' ? null : document.getElementById(id));

  // ── Access token helper ───────────────────────────────────────────────────
  function currentAccessToken() {
    try {
      if (typeof validateStudentAccess === 'function') return null; // async path used below
      // Try session storage / window state as last resort
      return ROOT.__currentStudentAccessToken || null;
    } catch { return null; }
  }

  async function getAccessToken() {
    try {
      if (typeof validateStudentAccess === 'function') {
        const ticket = await validateStudentAccess('practice');
        return ticket?.access_token || null;
      }
      return null;
    } catch { return null; }
  }

  // ── cloud.rpc wrapper ─────────────────────────────────────────────────────
  let rpcWrapped = false;

  function installRpcWrapper() {
    if (rpcWrapped) return true;
    try {
      if (typeof cloud === 'undefined' || !cloud || typeof cloud.rpc !== 'function') return false;
      const previous = cloud.rpc.bind(cloud);

      cloud.rpc = async function(name, args, options) {
        const rpcName = trim(name);
        const result = await previous(name, args, options);

        // Intercept grading responses to count incorrect attempts
        if (
          state === State.WATCHING &&
          (rpcName === 'grade_practice_response_v53b' ||
           rpcName === 'grade_practice_response_v3') &&
          result?.data
        ) {
          await handleGradeResponse(result.data, args || {});
        }

        return result;
      };

      rpcWrapped = true;
      return true;
    } catch (error) {
      console.warn('V5.9B could not install RPC wrapper.', error);
      return false;
    }
  }

  // ── Grading response handler ──────────────────────────────────────────────
  async function handleGradeResponse(data, args) {
    if (data?.correct !== false) return; // only track incorrect

    const questionId = trim(data?.question_id || args?.p_question_id || '');
    if (!questionId) return;
    if (handledQuestions.has(questionId)) return;
    if (skippedQuestions.has(questionId)) return;

    const count = (incorrectCounts.get(questionId) || 0) + 1;
    incorrectCounts.set(questionId, count);

    if (count < 2) return; // wait for second incorrect

    // Mark handled immediately to prevent re-entry
    handledQuestions.add(questionId);

    await checkAndOpenDiagnostic(questionId, data, args);
  }

  // ── Trigger check and overlay open ───────────────────────────────────────
  async function checkAndOpenDiagnostic(questionId, gradeData, gradeArgs) {
    state = State.LOADING_PLAN;
    showLoadingOverlay();

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) { abortAndRestore('no_access_token'); return; }

      // Check whether a diagnostic plan exists for this question
      const { data: trigger, error: triggerError } = await cloud.rpc(
        'student_adaptive_trigger_check_v1',
        { p_access_token: accessToken, p_question_id: questionId }
      );

      if (triggerError || !trigger?.triggered) {
        abortAndRestore('trigger_not_confirmed');
        return;
      }

      // Fetch the diagnostic plan (returns render-ready question content)
      const { data: plan, error: planError } = await cloud.rpc(
        'student_adaptive_diagnostic_plan_v1',
        { p_access_token: accessToken, p_question_id: questionId,
          p_diagnostic_session_id: trigger.diagnostic_session_id }
      );

      if (planError || !plan?.items?.length) {
        abortAndRestore('plan_unavailable');
        return;
      }

      // Capture the original target question snapshot for the retry screen
      const targetSnapshot = {
        questionId,
        questionText: trim(gradeData?.question_text || gradeArgs?.p_question_text || ''),
        options:      Array.isArray(gradeData?.options) ? gradeData.options : [],
        accessToken
      };

      session = {
        diagnosticSessionId: trim(trigger.diagnostic_session_id || plan.diagnostic_session_id || ''),
        targetQuestionId:    questionId,
        targetSnapshot,
        accessToken,
        items:               plan.items,
        currentIndex:        0
      };

      state = State.DIAGNOSTIC;
      renderDiagnosticQuestion();

    } catch (error) {
      console.warn('V5.9B diagnostic pilot error.', error);
      abortAndRestore('exception');
    }
  }

  // ── Loading overlay ───────────────────────────────────────────────────────
  function showLoadingOverlay() {
    ensureQuizRelative();
    const existing = byId('adaptive-diagnostic-overlay');
    if (existing) existing.remove();

    const overlay = buildOverlayShell();
    overlay.innerHTML = `
      <div class="adaptive-body">
        <p class="adaptive-loading-text">Preparing help activity…</p>
      </div>
    `;
    attachOverlay(overlay);
  }

  // ── Diagnostic question rendering ─────────────────────────────────────────
  function renderDiagnosticQuestion() {
    if (!session) return;
    const { items, currentIndex } = session;
    const item = items[currentIndex];
    if (!item) { renderRetryScreen(); return; }

    const total   = items.length;
    const current = currentIndex + 1;

    const overlay = buildOverlayShell();
    overlay.innerHTML = `
      <div class="adaptive-header">
        <span class="adaptive-label">A little extra help</span>
        <span class="adaptive-progress">Diagnostic ${current} of ${total}</span>
      </div>
      <div class="adaptive-body">
        <p class="adaptive-question-text" id="adaptive-q-text">${escHtml(item.questionText || '')}</p>
        ${item.imageUrl ? `<img class="adaptive-image" src="${escAttr(item.imageUrl)}" alt="">` : ''}
        <div class="adaptive-options" role="group" aria-labelledby="adaptive-q-text">
          ${renderOptions(item.options, 'adaptive-option')}
        </div>
        <div class="adaptive-feedback hidden" id="adaptive-feedback" aria-live="polite"></div>
      </div>
      <div class="adaptive-actions">
        <button type="button" id="adaptive-check-btn" class="adaptive-primary-action" disabled>
          Check answer
        </button>
        <button type="button" id="adaptive-return-btn" class="adaptive-secondary-action">
          ← Return to Practice
        </button>
      </div>
    `;

    replaceOverlay(overlay);
    wireOptionSelection('adaptive-option', 'adaptive-check-btn');
    byId('adaptive-check-btn').addEventListener('click', submitDiagnosticAnswer);
    byId('adaptive-return-btn').addEventListener('click', () =>
      exitAdaptivePilot({ reason: 'student_skip' })
    );
  }

  // ── Diagnostic answer submission ──────────────────────────────────────────
  async function submitDiagnosticAnswer() {
    if (state !== State.DIAGNOSTIC || !session) return;
    state = State.GRADING;

    const checkBtn = byId('adaptive-check-btn');
    const returnBtn = byId('adaptive-return-btn');
    if (checkBtn) checkBtn.disabled = true;
    if (returnBtn) returnBtn.disabled = true;

    const item     = session.items[session.currentIndex];
    const selected = getSelectedOption('adaptive-option');

    try {
      const { data: gradeResult, error } = await cloud.rpc(
        'student_adaptive_diagnostic_grade_v1',
        {
          p_access_token:        session.accessToken,
          p_diagnostic_session_id: session.diagnosticSessionId,
          p_diagnostic_item_id:  item.diagnosticItemId,
          p_response:            selected
        }
      );

      if (error) throw error;

      const feedback = byId('adaptive-feedback');
      if (feedback) {
        feedback.textContent = trim(gradeResult?.feedback || 'Answer recorded.');
        feedback.classList.remove('hidden');
      }

      // Pause briefly then advance
      await pause(1200);
      state = State.DIAGNOSTIC;
      session.currentIndex += 1;

      if (session.currentIndex >= session.items.length) {
        renderRetryScreen();
      } else {
        renderDiagnosticQuestion();
      }

    } catch (error) {
      console.warn('V5.9B diagnostic grading error.', error);
      state = State.DIAGNOSTIC;
      if (checkBtn) checkBtn.disabled = false;
      if (returnBtn) returnBtn.disabled = false;
      const feedback = byId('adaptive-feedback');
      if (feedback) {
        feedback.textContent = 'Could not record answer — please try again.';
        feedback.classList.remove('hidden');
      }
    }
  }

  // ── Unscored retry screen ─────────────────────────────────────────────────
  function renderRetryScreen() {
    if (!session) return;
    state = State.TARGET_RETRY;
    const snap = session.targetSnapshot;

    const overlay = buildOverlayShell();
    overlay.innerHTML = `
      <div class="adaptive-header">
        <span class="adaptive-label">Now try the original question again</span>
      </div>
      <div class="adaptive-body">
        ${snap.questionText
          ? `<p class="adaptive-question-text" id="adaptive-retry-q-text">${escHtml(snap.questionText)}</p>`
          : `<p class="adaptive-question-text" id="adaptive-retry-q-text">
               Try the original question again.
             </p>`}
        ${snap.options?.length
          ? `<div class="adaptive-options" role="group" aria-labelledby="adaptive-retry-q-text">
               ${renderOptions(snap.options, 'adaptive-retry-option')}
             </div>`
          : ''}
        <p class="adaptive-unscored-note">This retry does not affect your score.</p>
      </div>
      <div class="adaptive-actions">
        <button type="button" id="adaptive-finish-retry-btn" class="adaptive-primary-action">
          Finish retry
        </button>
        <button type="button" id="adaptive-return-btn" class="adaptive-secondary-action">
          ← Return to Practice
        </button>
      </div>
    `;

    replaceOverlay(overlay);
    if (snap.options?.length) {
      wireOptionSelection('adaptive-retry-option', 'adaptive-finish-retry-btn');
    }
    byId('adaptive-finish-retry-btn').addEventListener('click', finishRetry);
    byId('adaptive-return-btn').addEventListener('click', () =>
      exitAdaptivePilot({ reason: 'student_skip_retry' })
    );
  }

  function finishRetry() {
    // Collect selection transiently — no RPC, no score mutation
    exitAdaptivePilot({ reason: 'completed' });
  }

  // ── Exit / abort ──────────────────────────────────────────────────────────
  function exitAdaptivePilot({ reason }) {
    state = State.EXITING;

    if (reason === 'student_skip' || reason === 'student_skip_retry') {
      // Suppress re-trigger for this question in this session
      if (session?.targetQuestionId) {
        skippedQuestions.add(session.targetQuestionId);
        try {
          sessionStorage.setItem(
            `adaptivePilotSkipped:${session.targetQuestionId}`, '1'
          );
        } catch { /* sessionStorage not available */ }
      }
    }

    removeOverlay();
    restoreNormalPracticeInteraction();
    session = null;
    state = State.WATCHING;
  }

  function abortAndRestore(reason) {
    console.info('V5.9B diagnostic not shown:', reason);
    removeOverlay();
    restoreNormalPracticeInteraction();
    state = State.WATCHING;
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function ensureQuizRelative() {
    const quiz = byId('quiz');
    if (!quiz) return;
    const pos = getComputedStyle(quiz).position;
    if (pos === 'static' || !pos) quiz.style.position = 'relative';
  }

  function buildOverlayShell() {
    const el = document.createElement('section');
    el.id = 'adaptive-diagnostic-overlay';
    el.className = 'adaptive-diagnostic-overlay';
    el.setAttribute('aria-label', 'Maths help activity');
    el.setAttribute('aria-modal', 'false');
    injectStyles();
    return el;
  }

  function attachOverlay(overlay) {
    const quiz = byId('quiz');
    if (!quiz) return;
    disableNormalPracticeInteraction();
    quiz.appendChild(overlay);
  }

  function replaceOverlay(overlay) {
    const existing = byId('adaptive-diagnostic-overlay');
    if (existing) {
      existing.replaceWith(overlay);
    } else {
      attachOverlay(overlay);
    }
  }

  function removeOverlay() {
    byId('adaptive-diagnostic-overlay')?.remove();
  }

  function disableNormalPracticeInteraction() {
    const quiz = byId('quiz');
    if (!quiz) return;
    quiz.querySelectorAll(
      'button:not(#adaptive-diagnostic-overlay button),' +
      'input:not(#adaptive-diagnostic-overlay input),' +
      'select:not(#adaptive-diagnostic-overlay select)'
    ).forEach(el => {
      if (!el.closest('#adaptive-diagnostic-overlay')) {
        el.dataset.adaptiveDisabled = el.disabled ? '1' : '0';
        el.disabled = true;
      }
    });
  }

  function restoreNormalPracticeInteraction() {
    const quiz = byId('quiz');
    if (!quiz) return;
    quiz.querySelectorAll('[data-adaptive-disabled]').forEach(el => {
      el.disabled = el.dataset.adaptiveDisabled === '1';
      delete el.dataset.adaptiveDisabled;
    });
  }

  function renderOptions(options, namePrefix) {
    if (!Array.isArray(options) || !options.length) return '';
    return options.map((opt, i) => {
      const id  = `${namePrefix}-${i}`;
      const val = escAttr(trim(opt?.value ?? String(i)));
      const lbl = escHtml(trim(opt?.label ?? opt?.text ?? String(opt)));
      return `<label class="adaptive-option-label" for="${id}">
        <input type="radio" id="${id}" name="${namePrefix}" value="${val}">
        <span>${lbl}</span>
      </label>`;
    }).join('');
  }

  function wireOptionSelection(namePrefix, checkBtnId) {
    const overlay = byId('adaptive-diagnostic-overlay');
    if (!overlay) return;
    overlay.querySelectorAll(`input[name="${namePrefix}"]`).forEach(input => {
      input.addEventListener('change', () => {
        const btn = byId(checkBtnId);
        if (btn) btn.disabled = false;
      });
    });
  }

  function getSelectedOption(namePrefix) {
    const overlay = byId('adaptive-diagnostic-overlay');
    if (!overlay) return '';
    const checked = overlay.querySelector(`input[name="${namePrefix}"]:checked`);
    return checked ? trim(checked.value) : '';
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) { return escHtml(s); }

  function pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Styles (injected once) ────────────────────────────────────────────────
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected || typeof document === 'undefined') return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .adaptive-diagnostic-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        background: #fff;
        display: flex;
        flex-direction: column;
        padding: 1.25rem;
        box-sizing: border-box;
        overflow-y: auto;
        font-family: inherit;
      }
      .adaptive-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 1rem;
      }
      .adaptive-label {
        font-weight: 600;
        font-size: 1rem;
      }
      .adaptive-progress {
        font-size: 0.85rem;
        color: #666;
      }
      .adaptive-body {
        flex: 1;
      }
      .adaptive-question-text {
        font-size: 1rem;
        line-height: 1.5;
        margin: 0 0 1rem;
      }
      .adaptive-image {
        max-width: 100%;
        margin-bottom: 1rem;
        display: block;
      }
      .adaptive-options {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .adaptive-option-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.95rem;
      }
      .adaptive-option-label:has(input:checked) {
        border-color: #1a73e8;
        background: #e8f0fe;
      }
      .adaptive-feedback {
        padding: 0.6rem 0.75rem;
        border-radius: 6px;
        background: #f1f3f4;
        font-size: 0.9rem;
        margin-top: 0.5rem;
      }
      .adaptive-feedback.hidden { display: none; }
      .adaptive-loading-text {
        color: #666;
        font-size: 0.95rem;
      }
      .adaptive-unscored-note {
        font-size: 0.85rem;
        color: #888;
        margin-top: 0.75rem;
        font-style: italic;
      }
      .adaptive-actions {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding-top: 1rem;
      }
      .adaptive-primary-action {
        padding: 0.65rem 1.25rem;
        background: #1a73e8;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
      }
      .adaptive-primary-action:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .adaptive-secondary-action {
        padding: 0.5rem 0.75rem;
        background: none;
        color: #1a73e8;
        border: 1px solid #1a73e8;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        align-self: flex-start;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Runtime wiring ────────────────────────────────────────────────────────
  function tryInstall() {
    if (state !== State.DORMANT) return;
    if (installRpcWrapper()) {
      state = State.WATCHING;

      // Restore skipped suppressions from this tab's sessionStorage
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('adaptivePilotSkipped:')) {
            const questionId = key.replace('adaptivePilotSkipped:', '');
            if (questionId) skippedQuestions.add(questionId);
          }
        }
      } catch { /* sessionStorage not available */ }
    }
  }

  // Retry installation until cloud is ready (mirrors v581a pattern)
  let tries = 0;
  const timer = setInterval(() => {
    tryInstall();
    tries += 1;
    if (state === State.WATCHING || tries >= 80) clearInterval(timer);
  }, 100);

  // ── Public API ────────────────────────────────────────────────────────────
  const api = Object.freeze({
    enabled:    true,
    getState:   () => state,
    getSession: () => session ? Object.assign({}, session) : null,
    exit:       () => {
      if (state !== State.DORMANT && state !== State.WATCHING) {
        exitAdaptivePilot({ reason: 'external_exit' });
      }
    }
  });

  Object.defineProperty(ROOT, 'V59BAdaptiveDiagnosticPilot', {
    value: api, writable: false, configurable: false
  });

  console.info('V5.9B adaptive diagnostic pilot initialised (adaptivePilot=2 active).');
})();
