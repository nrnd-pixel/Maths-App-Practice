/* V3.8B — Student AI Learning Help UI
   Provider-independent frontend. All trusted question context and provider
   credentials remain server-side in Supabase. */
(() => {
  'use strict';

  const HELP_LEVELS = {
    nudge: {
      label: '✨ Give me a nudge',
      title: 'A small nudge'
    },
    guided_hint: {
      label: '🧭 Guide me one step',
      title: 'Your next step'
    },
    explain_mistake: {
      label: '🔍 Explain my mistake',
      title: 'Let’s check your thinking'
    },
    explain_method: {
      label: '📖 Explain the method',
      title: 'Method explanation'
    }
  };

  let aiModeV38 = 'practice';
  let statusCacheV38 = null;
  let statusTokenV38 = '';
  let statusModeV38 = '';
  let lastQuestionKeyV38 = '';
  let refreshTimerV38 = null;
  let requestBusyV38 = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function injectStyleV38() {
    if (byId('ai-help-style-v38')) return;
    const style = document.createElement('style');
    style.id = 'ai-help-style-v38';
    style.textContent = `
      .ai-help-v38{
        margin-top:14px;
        border:1px solid var(--border);
        border-radius:16px;
        padding:15px;
        background:var(--card);
      }
      .ai-help-head-v38{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        flex-wrap:wrap;
      }
      .ai-help-head-v38 h3{margin:0 0 4px}
      .ai-help-actions-v38{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
        margin-top:12px;
      }
      .ai-help-actions-v38 button{
        min-height:42px;
        text-align:left;
        padding:9px 12px;
      }
      .ai-help-actions-v38 button:disabled{
        cursor:not-allowed;
        opacity:.48;
      }
      .ai-help-part-v38{margin-top:12px}
      .ai-help-part-v38 select{margin-top:6px}
      .ai-help-response-v38{
        margin-top:12px;
        border:1px solid var(--border);
        border-radius:14px;
        padding:14px;
        background:var(--soft);
        line-height:1.55;
      }
      .ai-help-response-title-v38{
        font-weight:850;
        margin-bottom:5px;
      }
      .ai-help-loading-v38{color:var(--muted)}
      .ai-help-error-v38{
        background:var(--dangerbg);
        color:var(--danger);
        border-color:#f1b6b2;
      }
      .ai-help-foot-v38{
        margin-top:10px;
        font-size:12px;
        color:var(--muted);
        line-height:1.45;
      }
      @media(max-width:700px){
        .ai-help-actions-v38{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanelV38() {
    let panel = byId('ai-help-v38');
    if (panel) return panel;
    const hintBox = byId('hint-box');
    if (!hintBox) return null;

    panel = document.createElement('section');
    panel.id = 'ai-help-v38';
    panel.className = 'ai-help-v38 hidden';
    panel.innerHTML = `
      <div class="ai-help-head-v38">
        <div>
          <h3>✨ AI Learning Help</h3>
          <div class="muted">Choose the amount of help you need.</div>
        </div>
        <span id="ai-help-usage-v38" class="tag">AI Help</span>
      </div>

      <label id="ai-help-part-wrap-v38" class="ai-help-part-v38 hidden">
        Which part do you need help with?
        <select id="ai-help-part-v38"></select>
      </label>

      <div class="ai-help-actions-v38">
        <button type="button" class="outline" data-ai-help-level="nudge">✨ Give me a nudge</button>
        <button type="button" class="outline" data-ai-help-level="guided_hint">🧭 Guide me one step</button>
        <button type="button" class="outline" data-ai-help-level="explain_mistake">🔍 Explain my mistake</button>
        <button type="button" class="outline" data-ai-help-level="explain_method">📖 Explain the method</button>
      </div>

      <div id="ai-help-response-v38" class="ai-help-response-v38 hidden" aria-live="polite">
        <div id="ai-help-response-title-v38" class="ai-help-response-title-v38"></div>
        <div id="ai-help-response-text-v38"></div>
      </div>

      <div class="ai-help-foot-v38">
        Try the maths yourself first. AI Help is a learning guide and can make mistakes.
      </div>
    `;
    hintBox.insertAdjacentElement('afterend', panel);

    panel.querySelectorAll('[data-ai-help-level]').forEach(button => {
      button.addEventListener('click', () => requestHelpV38(button.dataset.aiHelpLevel));
    });

    const partSelect = byId('ai-help-part-v38');
    if (partSelect) {
      partSelect.addEventListener('change', () => {
        resetResponseV38();
        updateButtonsV38();
      });
    }

    return panel;
  }

  function currentAccessTokenV38() {
    try {
      return String(
        state?.accessToken ||
        activeStudentAccess?.access_token ||
        ''
      ).trim();
    } catch {
      return '';
    }
  }

  function isMultipartV38(item) {
    try {
      return typeof isMultipartItem === 'function' && isMultipartItem(item);
    } catch {
      return Boolean(item?._kind === 'multipart' && Array.isArray(item?.parts));
    }
  }

  function currentItemV38() {
    try {
      return state?.questions?.[state?.index ?? 0] || null;
    } catch {
      return null;
    }
  }

  function currentTargetV38() {
    const item = currentItemV38();
    if (!item) return null;

    if (!isMultipartV38(item)) {
      return {
        item,
        question: item,
        partIndex: null,
        attempts: Number(state?.attempt || 0),
        completed: Boolean(state?.done),
        correct: Boolean(state?.done && state?.answers?.some?.(a => String(a.questionId) === String(item.id) && a.correct))
      };
    }

    const select = byId('ai-help-part-v38');
    let index = Number(select?.value || 0);
    if (!Number.isInteger(index) || index < 0 || index >= item.parts.length) index = 0;
    const part = item.parts[index];
    const partState = state?.groupStatus?.[index] || {};

    return {
      item,
      question: part,
      partIndex: index,
      attempts: Number(partState.attempts || 0),
      completed: Boolean(partState.correct || partState.submitted || Number(partState.attempts || 0) >= 2 || state?.done),
      correct: Boolean(partState.correct)
    };
  }

  function questionKeyV38() {
    const target = currentTargetV38();
    if (!target?.question?.id) return '';
    return `${target.question.id}|${target.partIndex ?? 'single'}`;
  }

  function updatePartSelectorV38() {
    const item = currentItemV38();
    const wrap = byId('ai-help-part-wrap-v38');
    const select = byId('ai-help-part-v38');
    if (!wrap || !select) return;

    if (!isMultipartV38(item)) {
      wrap.classList.add('hidden');
      select.innerHTML = '';
      return;
    }

    const previous = select.value;
    select.innerHTML = '';
    item.parts.forEach((part, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const label = part.part_label ? `(${part.part_label})` : `Part ${index + 1}`;
      option.textContent = `${label} — ${part.question_text || 'Question part'}`;
      select.appendChild(option);
    });
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
    wrap.classList.remove('hidden');
  }

  function resetResponseV38() {
    const box = byId('ai-help-response-v38');
    if (!box) return;
    box.className = 'ai-help-response-v38 hidden';
    byId('ai-help-response-title-v38').textContent = '';
    byId('ai-help-response-text-v38').textContent = '';
  }

  function showResponseV38(level, message, isError = false) {
    const box = byId('ai-help-response-v38');
    if (!box) return;
    box.className = `ai-help-response-v38${isError ? ' ai-help-error-v38' : ''}`;
    byId('ai-help-response-title-v38').textContent = isError
      ? 'AI Help unavailable'
      : (HELP_LEVELS[level]?.title || 'AI Learning Help');
    byId('ai-help-response-text-v38').textContent = message || 'No guidance was returned.';
  }

  function showLoadingV38(level) {
    const box = byId('ai-help-response-v38');
    if (!box) return;
    box.className = 'ai-help-response-v38';
    byId('ai-help-response-title-v38').textContent = HELP_LEVELS[level]?.title || 'AI Learning Help';
    const text = byId('ai-help-response-text-v38');
    text.className = 'ai-help-loading-v38';
    text.textContent = 'Thinking about a helpful next step…';
  }

  function finishLoadingV38() {
    const text = byId('ai-help-response-text-v38');
    if (text) text.className = '';
  }

  function updateUsageV38() {
    const tag = byId('ai-help-usage-v38');
    if (!tag || !statusCacheV38) return;
    const used = Number(statusCacheV38.requests_used_today || 0);
    const limit = Number(statusCacheV38.daily_limit || 0);
    tag.textContent = limit > 0 ? `${used}/${limit} today` : 'AI Help';
  }

  function setButtonsBusyV38(busy) {
    requestBusyV38 = busy;
    byId('ai-help-v38')?.querySelectorAll('[data-ai-help-level]').forEach(button => {
      if (busy) button.disabled = true;
    });
    if (!busy) updateButtonsV38();
  }

  function updateButtonsV38() {
    const panel = byId('ai-help-v38');
    if (!panel || panel.classList.contains('hidden') || requestBusyV38) return;
    const target = currentTargetV38();
    if (!target) return;

    const canExplainMistake = target.attempts >= 1 && !target.correct && !target.completed;
    const canExplainMethod = target.completed;

    panel.querySelectorAll('[data-ai-help-level]').forEach(button => {
      const level = button.dataset.aiHelpLevel;
      if (level === 'explain_mistake') {
        button.disabled = !canExplainMistake;
        button.title = canExplainMistake ? '' : 'Available after an incorrect attempt.';
      } else if (level === 'explain_method') {
        button.disabled = !canExplainMethod;
        button.title = canExplainMethod ? '' : 'Available after this question is completed.';
      } else {
        button.disabled = target.completed;
        button.title = target.completed ? 'Use Explain the method after completing the question.' : '';
      }
    });
  }

  function responsePayloadV38(target) {
    try {
      const prefix = target.partIndex == null ? 'quiz' : `quiz-p${target.partIndex}`;
      const response = readResponse(target.question, prefix);
      if (!response || response.empty) return {};
      if (response.payload && typeof response.payload === 'object') return response.payload;
      return { display: String(response.display ?? '') };
    } catch {
      return {};
    }
  }

  async function loadStatusV38(force = false) {
    const token = currentAccessTokenV38();
    if (!token || !cloudReady || !cloud) return null;

    if (!force && statusCacheV38 && statusTokenV38 === token && statusModeV38 === aiModeV38) {
      return statusCacheV38;
    }

    const { data, error } = await cloud.rpc('get_student_ai_help_status', {
      p_access_token: token,
      p_mode: aiModeV38
    });
    if (error) throw error;

    statusCacheV38 = data || { enabled: false };
    statusTokenV38 = token;
    statusModeV38 = aiModeV38;
    return statusCacheV38;
  }

  async function refreshPanelV38(forceStatus = false) {
    const panel = ensurePanelV38();
    const quiz = byId('quiz');
    if (!panel || !quiz?.classList.contains('active')) {
      panel?.classList.add('hidden');
      return;
    }

    const token = currentAccessTokenV38();
    if (!token || !cloudReady || !currentItemV38()) {
      panel.classList.add('hidden');
      return;
    }

    try {
      const status = await loadStatusV38(forceStatus);
      if (!status?.enabled) {
        panel.classList.add('hidden');
        return;
      }

      panel.classList.remove('hidden');
      updatePartSelectorV38();

      const key = questionKeyV38();
      if (key !== lastQuestionKeyV38) {
        lastQuestionKeyV38 = key;
        resetResponseV38();
      }

      updateUsageV38();
      updateButtonsV38();
    } catch (error) {
      console.warn('Could not load V3.8 AI Help status.', error);
      panel.classList.add('hidden');
    }
  }

  async function requestHelpV38(level) {
    if (requestBusyV38 || !HELP_LEVELS[level]) return;
    const target = currentTargetV38();
    const token = currentAccessTokenV38();
    if (!target?.question?.id || !token || !cloudReady || !cloud) return;

    setButtonsBusyV38(true);
    showLoadingV38(level);

    try {
      const { data, error } = await cloud.functions.invoke('student-ai-help-v38', {
        body: {
          access_token: token,
          question_id: String(target.question.id),
          help_level: level,
          student_response: responsePayloadV38(target),
          mode: aiModeV38
        }
      });

      if (error) throw error;
      if (!data?.message) throw new Error(data?.error || 'No guidance was returned.');

      finishLoadingV38();
      showResponseV38(level, String(data.message));

      if (statusCacheV38) {
        statusCacheV38.requests_used_today = Number(statusCacheV38.requests_used_today || 0) + 1;
        updateUsageV38();
      }
    } catch (error) {
      console.warn('V3.8 AI Help request failed.', error);
      finishLoadingV38();
      const message = String(error?.message || 'AI Help could not respond right now. Please try again later.');
      showResponseV38(level, message, true);
      statusCacheV38 = null;
    } finally {
      setButtonsBusyV38(false);
    }
  }

  function scheduleRefreshV38(forceStatus = false) {
    clearTimeout(refreshTimerV38);
    refreshTimerV38 = setTimeout(() => refreshPanelV38(forceStatus), 80);
  }

  function wireModeDetectionV38() {
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button');
      if (!button) return;
      if (button.id === 'start-recommended-practice') {
        aiModeV38 = 'recommended_practice';
        statusCacheV38 = null;
        lastQuestionKeyV38 = '';
      } else if (button.id === 'start-btn' && document.querySelector('[data-mode="practice"].active, #practice-fields:not(.hidden)')) {
        aiModeV38 = 'practice';
        statusCacheV38 = null;
        lastQuestionKeyV38 = '';
      }
    }, true);
  }

  function wireObserversV38() {
    const quiz = byId('quiz');
    const qNumber = byId('q-number');
    const attempt = byId('attempt-text');
    const feedback = byId('feedback');

    if (quiz) {
      new MutationObserver(() => scheduleRefreshV38()).observe(quiz, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    if (qNumber) {
      new MutationObserver(() => scheduleRefreshV38()).observe(qNumber, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
    if (attempt) {
      new MutationObserver(() => scheduleRefreshV38()).observe(attempt, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
    if (feedback) {
      new MutationObserver(() => scheduleRefreshV38()).observe(feedback, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
      });
    }
  }

  function initV38() {
    injectStyleV38();
    ensurePanelV38();
    wireModeDetectionV38();
    wireObserversV38();
    scheduleRefreshV38(true);
  }

  if (document.readyState === 'complete') {
    initV38();
  } else {
    window.addEventListener('load', initV38, { once: true });
  }
})();
