/* V5.9B — Adaptive Diagnostic Pilot V2 (Issue #266).
   Test-only browser integration over the accepted Practice engine.

   Activation and safety contract:
   - Dormant unless ?adaptivePilot=2 is present in the URL.
   - Wraps only the final ordinary Practice submit function after staged loading.
   - Does not replace startPractice, getQuestions, nextQuestion or finishPractice.
   - Does not wrap cloud.rpc and does not read question/metadata tables directly.
   - Reuses the already-active Practice access ticket; never reacquires a PIN/ticket.
   - Ordinary Practice grading remains authoritative and completes first.
   - Adaptive offer requires BOTH the existing pilot trigger/allow-list and the
     Metadata V2 readiness RPC.
   - Diagnostic checks and target retry use only the dedicated server-side
     diagnostic grader, so Practice score/mastery/XP/session answers are untouched.
   - Any adaptive RPC/DOM failure restores ordinary Practice interaction.
*/
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const API_NAME = 'V59BAdaptiveDiagnosticPilotV2';
  const INSTALL_MARKER = '__v59bAdaptiveDiagnosticPilotV2Installed';
  const OVERLAY_ID = 'v59b2-adaptive-overlay';
  const STYLE_ID = 'v59b2-adaptive-style';
  const RESPONSE_PREFIX = 'v59b2-response';

  if (ROOT[INSTALL_MARKER]) return;
  ROOT[INSTALL_MARKER] = true;

  const enabled =
    typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('adaptivePilot') === '2';

  if (!enabled) {
    Object.defineProperty(ROOT, API_NAME, {
      value: Object.freeze({ enabled: false, installed: false }),
      writable: false,
      configurable: false,
    });
    return;
  }

  const Phase = Object.freeze({
    WATCHING: 'watching',
    CHECKING: 'checking',
    OFFER: 'offer',
    LOADING_PLAN: 'loading_plan',
    DIAGNOSTIC: 'diagnostic',
    TARGET_RETRY: 'target_retry',
    EXITING: 'exiting',
  });

  let phase = Phase.WATCHING;
  let adaptiveSession = null;
  const handledQuestions = new Set();
  let installed = false;
  let baseSubmit = null;

  function practiceState(){
    try {
      return typeof state !== 'undefined' ? state : null;
    } catch {
      return null;
    }
  }

  function activeQuestion(){
    const s = practiceState();
    return s?.questions?.[s.index] || null;
  }

  function currentAccessToken(){
    try {
      const s = practiceState();
      return String(
        s?.accessToken ||
        (typeof activeStudentAccess !== 'undefined'
          ? activeStudentAccess?.access_token
          : '') ||
        ''
      ).trim();
    } catch {
      return '';
    }
  }

  function rpcReady(){
    try {
      return !!(
        typeof cloud !== 'undefined' &&
        cloud &&
        typeof cloud.rpc === 'function' &&
        typeof cloudReady !== 'undefined' &&
        cloudReady
      );
    } catch {
      return false;
    }
  }

  async function rpc(name, args){
    if (!rpcReady()) throw new Error('Adaptive help is not connected.');
    const { data, error } = await cloud.rpc(name, args);
    if (error) throw error;
    return data;
  }

  function normaliseQuestionId(value){
    return String(value || '').trim();
  }

  function activeItemQuestionIds(question){
    if (!question) return [];
    if (question?._kind === 'multipart' && Array.isArray(question.parts)) {
      return question.parts
        .map(part => normaliseQuestionId(part?.id))
        .filter(Boolean);
    }
    const id = normaliseQuestionId(question.id);
    return id ? [id] : [];
  }

  function captureBeforeSubmit(){
    const s = practiceState();
    const q = activeQuestion();
    if (!s || !q) return null;
    const questionIds = activeItemQuestionIds(q);
    if (!questionIds.length) return null;
    return {
      index: Number(s.index),
      questionIds,
      answersLength: Array.isArray(s.answers) ? s.answers.length : 0,
    };
  }

  function sameQuestionStillActive(snapshot){
    const s = practiceState();
    const q = activeQuestion();
    if (
      !snapshot ||
      !s ||
      !q ||
      Number(s.index) !== snapshot.index ||
      !document.getElementById('quiz')?.classList.contains('active')
    ) return false;

    const currentIds = activeItemQuestionIds(q);
    return currentIds.length === snapshot.questionIds.length &&
      currentIds.every((id, index) => id === snapshot.questionIds[index]);
  }

  function completedWrongCandidates(snapshot){
    const s = practiceState();
    if (!s?.done || !Array.isArray(s.answers)) return [];
    if (s.answers.length <= snapshot.answersLength) return [];

    const allowedIds = new Set(snapshot.questionIds);
    return s.answers
      .slice(snapshot.answersLength)
      .map(answer => ({
        answer,
        questionId: normaliseQuestionId(answer?.questionId),
      }))
      .filter(({ answer, questionId }) =>
        questionId &&
        allowedIds.has(questionId) &&
        !answer?.manualReview &&
        answer?.correct === false
      );
  }

  async function maybeOfferAfterOrdinarySubmit(snapshot){
    if (!snapshot || phase !== Phase.WATCHING) return;
    if (!sameQuestionStillActive(snapshot)) return;

    const candidates = completedWrongCandidates(snapshot);
    if (!candidates.length) return;

    const token = currentAccessToken();
    if (!token) return;

    phase = Phase.CHECKING;

    try {
      for (const candidate of candidates) {
        const questionId = candidate.questionId;
        if (handledQuestions.has(questionId)) continue;
        handledQuestions.add(questionId);

        const trigger = await rpc('student_adaptive_trigger_check_v1', {
          p_access_token: token,
          p_question_id: questionId,
        });

        if (
          trigger?.status !== 'READY' ||
          trigger?.should_offer !== true
        ) {
          continue;
        }

        const readiness = await rpc('student_adaptive_question_readiness_v2', {
          p_access_token: token,
          p_question_id: questionId,
          p_require_diagnostic_route: true,
        });

        if (readiness?.status !== 'READY') {
          continue;
        }

        adaptiveSession = {
          accessToken: token,
          targetQuestionId: questionId,
          plan: null,
          stepIndex: 0,
        };

        phase = Phase.OFFER;
        renderOffer();
        return;
      }

      phase = Phase.WATCHING;
    } catch (error) {
      console.warn('V5.9B V2 adaptive readiness check failed closed.', error);
      phase = Phase.WATCHING;
    }
  }

  async function wrappedSubmit(...args){
    const snapshot = captureBeforeSubmit();
    const result = await baseSubmit.apply(this, args);

    try {
      await maybeOfferAfterOrdinarySubmit(snapshot);
    } catch (error) {
      console.warn('V5.9B V2 post-grade check failed closed.', error);
      restoreNormalPractice();
    }

    return result;
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID}{
        position:absolute;inset:0;z-index:28;overflow:auto;
        display:flex;flex-direction:column;gap:14px;
        padding:clamp(16px,3vw,26px);box-sizing:border-box;
        background:var(--card,#fff);color:var(--text,#172033);
      }
      #${OVERLAY_ID} .v59b2-card{
        width:min(720px,100%);margin:auto;border:1px solid var(--border,#d9deea);
        border-radius:20px;padding:clamp(16px,3vw,24px);box-sizing:border-box;
        background:var(--card,#fff);box-shadow:0 16px 42px rgba(30,41,59,.10);
      }
      #${OVERLAY_ID} .v59b2-kicker{
        margin:0 0 6px;color:var(--primary,#5b4ae8);font-size:12px;
        font-weight:900;letter-spacing:.05em;text-transform:uppercase;
      }
      #${OVERLAY_ID} h2{margin:0 0 8px;font-size:clamp(20px,4vw,27px);line-height:1.2}
      #${OVERLAY_ID} p{line-height:1.5}
      #${OVERLAY_ID} .v59b2-muted{color:var(--muted,#667085);font-size:13px}
      #${OVERLAY_ID} .v59b2-step{
        margin:12px 0;padding:10px 12px;border-radius:12px;
        background:var(--soft,#f6f3ff);font-weight:800;font-size:13px;
      }
      #${OVERLAY_ID} .v59b2-question{font-size:17px;font-weight:800;line-height:1.5;margin:14px 0}
      #${OVERLAY_ID} .v59b2-image{display:block;max-width:100%;height:auto;margin:12px auto;border-radius:12px}
      #${OVERLAY_ID} .v59b2-response{margin:14px 0}
      #${OVERLAY_ID} .v59b2-feedback{
        margin:12px 0;padding:12px;border-radius:12px;
        background:var(--soft,#f6f3ff);line-height:1.45;
      }
      #${OVERLAY_ID} .v59b2-feedback.error{background:#fff4f2;color:#9a3412}
      #${OVERLAY_ID} .v59b2-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
      #${OVERLAY_ID} .v59b2-actions button{min-height:44px}
      @media(max-width:560px){
        #${OVERLAY_ID}{padding:10px}
        #${OVERLAY_ID} .v59b2-card{border-radius:16px;padding:16px}
        #${OVERLAY_ID} .v59b2-actions{display:grid;grid-template-columns:1fr}
        #${OVERLAY_ID} .v59b2-actions button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function quizRoot(){
    return document.getElementById('quiz');
  }

  function disableNormalPractice(){
    const quiz = quizRoot();
    if (!quiz) return;
    if (getComputedStyle(quiz).position === 'static') {
      quiz.dataset.v59b2Position = quiz.style.position || '';
      quiz.style.position = 'relative';
    }

    quiz.querySelectorAll('button,input,select,textarea').forEach(element => {
      if (element.closest(`#${OVERLAY_ID}`)) return;
      if (element.hasAttribute('data-v59b2-was-disabled')) return;
      element.setAttribute('data-v59b2-was-disabled', element.disabled ? '1' : '0');
      element.disabled = true;
    });
  }

  function restoreNormalPractice(){
    document.getElementById(OVERLAY_ID)?.remove();
    const quiz = quizRoot();
    if (quiz) {
      quiz.querySelectorAll('[data-v59b2-was-disabled]').forEach(element => {
        element.disabled = element.getAttribute('data-v59b2-was-disabled') === '1';
        element.removeAttribute('data-v59b2-was-disabled');
      });
      if (Object.prototype.hasOwnProperty.call(quiz.dataset, 'v59b2Position')) {
        quiz.style.position = quiz.dataset.v59b2Position;
        delete quiz.dataset.v59b2Position;
      }
    }
    adaptiveSession = null;
    phase = Phase.WATCHING;
  }

  function overlayCard(){
    injectStyles();
    document.getElementById(OVERLAY_ID)?.remove();
    const overlay = document.createElement('section');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('aria-label', 'Optional Maths skill check');
    const card = document.createElement('div');
    card.className = 'v59b2-card';
    overlay.appendChild(card);
    quizRoot()?.appendChild(overlay);
    disableNormalPractice();
    return card;
  }

  function button(text, className = 'primary'){
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = text;
    return element;
  }

  function addReturnAction(actions, label = 'Continue Practice'){
    const back = button(label, 'outline');
    back.dataset.v59b2Action = 'return';
    back.addEventListener('click', restoreNormalPractice);
    actions.appendChild(back);
    return back;
  }

  function renderOffer(){
    const card = overlayCard();
    card.innerHTML = `
      <p class="v59b2-kicker">Optional skill check</p>
      <h2>Want a little extra help?</h2>
      <p>You have finished this Practice question. A short skill check can help find the step that needs more practice.</p>
      <p class="v59b2-muted">This activity does not change your Practice score, XP, mastery or assignment result.</p>
    `;
    const actions = document.createElement('div');
    actions.className = 'v59b2-actions';
    const start = button('Start skill check');
    start.dataset.v59b2Action = 'start';
    start.addEventListener('click', loadPlan);
    actions.appendChild(start);
    addReturnAction(actions);
    card.appendChild(actions);
  }

  async function loadPlan(){
    if (!adaptiveSession || phase !== Phase.OFFER) return;
    phase = Phase.LOADING_PLAN;
    const card = overlayCard();
    card.innerHTML = `
      <p class="v59b2-kicker">Preparing help</p>
      <h2>Loading your skill check…</h2>
      <p class="v59b2-muted">If the connection is interrupted, you can return to normal Practice.</p>
    `;

    try {
      const plan = await rpc('student_adaptive_diagnostic_plan_v1', {
        p_access_token: adaptiveSession.accessToken,
        p_target_question_id: adaptiveSession.targetQuestionId,
      });

      if (
        plan?.status !== 'READY' ||
        !plan?.target ||
        !Array.isArray(plan?.steps) ||
        !plan.steps.length
      ) {
        restoreNormalPractice();
        return;
      }

      adaptiveSession.plan = plan;
      adaptiveSession.stepIndex = 0;
      phase = Phase.DIAGNOSTIC;
      renderDiagnosticStep();
    } catch (error) {
      console.warn('V5.9B V2 diagnostic plan unavailable.', error);
      restoreNormalPractice();
    }
  }

  function safeQuestion(stepOrQuestion){
    return stepOrQuestion?.question || stepOrQuestion || null;
  }

  function renderQuestionBody(card, question){
    const text = document.createElement('div');
    text.className = 'v59b2-question';
    text.textContent = String(question?.question_text || 'Question');
    card.appendChild(text);

    if (question?.image_url) {
      const image = document.createElement('img');
      image.className = 'v59b2-image';
      image.src = question.image_url;
      image.alt = 'Maths question diagram';
      card.appendChild(image);
    }

    const response = document.createElement('div');
    response.className = 'v59b2-response';
    response.id = 'v59b2-response-input';
    card.appendChild(response);

    if (typeof renderResponseInput !== 'function') {
      throw new Error('Practice response renderer is unavailable.');
    }
    renderResponseInput(question, response, false, RESPONSE_PREFIX);
  }

  function readAdaptiveResponse(question){
    if (typeof readResponse !== 'function') {
      throw new Error('Practice response reader is unavailable.');
    }
    return readResponse(question, RESPONSE_PREFIX);
  }

  function feedbackBox(card, text, error = false){
    let box = card.querySelector('.v59b2-feedback');
    if (!box) {
      box = document.createElement('div');
      box.className = 'v59b2-feedback';
      card.appendChild(box);
    }
    box.classList.toggle('error', error);
    box.textContent = text;
    return box;
  }

  function renderDiagnosticStep(){
    if (!adaptiveSession?.plan || phase !== Phase.DIAGNOSTIC) return;
    const steps = adaptiveSession.plan.steps;
    const step = steps[adaptiveSession.stepIndex];
    const question = safeQuestion(step);
    if (!step || !question) {
      restoreNormalPractice();
      return;
    }

    const card = overlayCard();
    card.innerHTML = `
      <p class="v59b2-kicker">Skill check</p>
      <h2>Step ${adaptiveSession.stepIndex + 1} of ${steps.length}</h2>
      <div class="v59b2-step"></div>
    `;
    card.querySelector('.v59b2-step').textContent = String(step.step_label || 'Check this skill');

    try {
      renderQuestionBody(card, question);
    } catch (error) {
      console.warn('V5.9B V2 could not render diagnostic question.', error);
      restoreNormalPractice();
      return;
    }

    const actions = document.createElement('div');
    actions.className = 'v59b2-actions';
    const check = button('Check answer');
    check.dataset.v59b2Action = 'check-diagnostic';
    check.addEventListener('click', () => gradeDiagnostic(step, question, card, check));
    actions.appendChild(check);
    addReturnAction(actions, 'Skip and continue Practice');
    card.appendChild(actions);
  }

  async function gradeDiagnostic(step, question, card, checkButton){
    if (!adaptiveSession || phase !== Phase.DIAGNOSTIC) return;

    let response;
    try {
      response = readAdaptiveResponse(question);
    } catch (error) {
      feedbackBox(card, 'This skill check could not read your answer. Return to Practice and continue.', true);
      return;
    }

    if (response?.empty) {
      feedbackBox(card, 'Enter or select an answer first.');
      return;
    }

    checkButton.disabled = true;
    try {
      const result = await rpc('student_adaptive_diagnostic_grade_v1', {
        p_access_token: adaptiveSession.accessToken,
        p_target_question_id: adaptiveSession.targetQuestionId,
        p_question_id: question.question_id,
        p_stage: 'diagnostic',
        p_response: response,
      });

      if (result?.status !== 'READY') throw new Error('Diagnostic grading was not ready.');

      const details = [result.feedback];
      if (!result.correct && result.hint_1) details.push(`Hint: ${result.hint_1}`);
      if (!result.correct && result.hint_2) details.push(`Next hint: ${result.hint_2}`);
      feedbackBox(card, details.filter(Boolean).join(' '));

      const actions = card.querySelector('.v59b2-actions');
      actions.innerHTML = '';
      const nextLabel = adaptiveSession.stepIndex + 1 < adaptiveSession.plan.steps.length
        ? 'Next skill check'
        : 'Try the original question again';
      const next = button(nextLabel);
      next.dataset.v59b2Action = 'next-diagnostic';
      next.addEventListener('click', () => {
        adaptiveSession.stepIndex += 1;
        if (adaptiveSession.stepIndex < adaptiveSession.plan.steps.length) {
          renderDiagnosticStep();
        } else {
          phase = Phase.TARGET_RETRY;
          renderTargetRetry();
        }
      });
      actions.appendChild(next);
      addReturnAction(actions, 'Skip and continue Practice');
    } catch (error) {
      console.warn('V5.9B V2 diagnostic grading failed.', error);
      checkButton.disabled = false;
      feedbackBox(card, 'Could not record this skill check. You can retry or return to normal Practice.', true);
    }
  }

  function renderTargetRetry(){
    if (!adaptiveSession?.plan?.target || phase !== Phase.TARGET_RETRY) {
      restoreNormalPractice();
      return;
    }

    const question = adaptiveSession.plan.target;
    const card = overlayCard();
    card.innerHTML = `
      <p class="v59b2-kicker">Unscored retry</p>
      <h2>Try the original question once more</h2>
      <p class="v59b2-muted">This retry is for learning only and does not change your Practice result.</p>
    `;

    try {
      renderQuestionBody(card, question);
    } catch (error) {
      console.warn('V5.9B V2 could not render target retry.', error);
      restoreNormalPractice();
      return;
    }

    const actions = document.createElement('div');
    actions.className = 'v59b2-actions';
    const check = button('Check unscored retry');
    check.dataset.v59b2Action = 'check-target-retry';
    check.addEventListener('click', () => gradeTargetRetry(question, card, check));
    actions.appendChild(check);
    addReturnAction(actions, 'Skip and continue Practice');
    card.appendChild(actions);
  }

  async function gradeTargetRetry(question, card, checkButton){
    if (!adaptiveSession || phase !== Phase.TARGET_RETRY) return;

    let response;
    try {
      response = readAdaptiveResponse(question);
    } catch {
      feedbackBox(card, 'This retry could not read your answer. Return to Practice and continue.', true);
      return;
    }

    if (response?.empty) {
      feedbackBox(card, 'Enter or select an answer first.');
      return;
    }

    checkButton.disabled = true;
    try {
      const result = await rpc('student_adaptive_diagnostic_grade_v1', {
        p_access_token: adaptiveSession.accessToken,
        p_target_question_id: adaptiveSession.targetQuestionId,
        p_question_id: adaptiveSession.targetQuestionId,
        p_stage: 'target_retry',
        p_response: response,
      });

      if (result?.status !== 'READY') throw new Error('Target retry grading was not ready.');

      feedbackBox(card, result.feedback || (result.correct
        ? 'Good — this skill looks secure.'
        : 'Keep practising this skill.'));

      const actions = card.querySelector('.v59b2-actions');
      actions.innerHTML = '';
      addReturnAction(actions, 'Return to Practice');
    } catch (error) {
      console.warn('V5.9B V2 target retry grading failed.', error);
      checkButton.disabled = false;
      feedbackBox(card, 'Could not record this retry. You can retry or return to normal Practice.', true);
    }
  }

  function installSubmitWrapper(){
    if (installed) return true;
    try {
      if (typeof submit !== 'function') return false;
      const checkButton = document.getElementById('check-btn');
      if (!checkButton || typeof checkButton.onclick !== 'function') return false;

      baseSubmit = submit;
      if (checkButton.onclick !== baseSubmit) {
        console.warn('V5.9B V2 did not install: final Check handler does not match final submit owner.');
        return false;
      }

      submit = wrappedSubmit;
      checkButton.onclick = wrappedSubmit;
      installed = true;
      return true;
    } catch (error) {
      console.warn('V5.9B V2 could not install submit wrapper.', error);
      return false;
    }
  }

  let attempts = 0;
  const installTimer = setInterval(() => {
    attempts += 1;
    if (installSubmitWrapper() || attempts >= 80) {
      clearInterval(installTimer);
    }
  }, 100);

  Object.defineProperty(ROOT, API_NAME, {
    value: Object.freeze({
      enabled: true,
      isInstalled: () => installed,
      getPhase: () => phase,
      getSession: () => adaptiveSession ? {
        targetQuestionId: adaptiveSession.targetQuestionId,
        stepIndex: adaptiveSession.stepIndex,
      } : null,
      exit: restoreNormalPractice,
    }),
    writable: false,
    configurable: false,
  });
})();