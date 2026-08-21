/* V3.8C — Teacher/Admin AI Learning Help controls
   Provider credentials remain server-side. This UI only edits non-secret
   feature settings through teacher-authorized Supabase RPCs. */
(() => {
  'use strict';

  const PANEL_ID = 'ai-help-admin-panel-v38';
  const TAB_ID = 'ai-help-admin-tab-v38';

  function byId(id) {
    return document.getElementById(id);
  }

  function injectStyleV38Admin() {
    if (byId('ai-help-admin-style-v38')) return;

    const style = document.createElement('style');
    style.id = 'ai-help-admin-style-v38';
    style.textContent = `
      .ai-admin-card-v38{
        border:1px solid var(--border);
        border-radius:16px;
        background:var(--card);
        padding:18px;
        margin-top:14px;
      }
      .ai-admin-grid-v38{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:14px;
        margin-top:14px;
      }
      .ai-admin-toggle-v38{
        display:flex;
        align-items:flex-start;
        gap:10px;
        border:1px solid var(--border);
        border-radius:13px;
        padding:13px;
        background:#fff;
        font-weight:760;
      }
      .ai-admin-toggle-v38 input{
        width:auto;
        min-height:auto;
        margin-top:3px;
        accent-color:var(--primary);
      }
      .ai-admin-locked-v38{
        opacity:.7;
        background:#f8fafc;
      }
      .ai-admin-status-v38{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:10px;
      }
      .ai-admin-actions-v38{
        display:flex;
        gap:9px;
        flex-wrap:wrap;
        margin-top:16px;
      }
      .ai-admin-note-v38{
        margin-top:14px;
        border:1px solid var(--border);
        border-radius:13px;
        background:#f8fafc;
        padding:13px;
        color:var(--muted);
        font-size:13px;
        line-height:1.5;
      }
      @media(max-width:760px){
        .ai-admin-grid-v38{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTeacherTabV38() {
    const teacher = byId('teacher');
    const tabs = teacher?.querySelector('.tabs');
    const accessTab = tabs?.querySelector('[data-panel="access-panel"]');
    const accessPanel = byId('access-panel');

    if (!teacher || !tabs || !accessPanel) return false;

    let tab = byId(TAB_ID);
    if (!tab) {
      tab = document.createElement('button');
      tab.id = TAB_ID;
      tab.className = 'tab';
      tab.type = 'button';
      tab.dataset.panel = PANEL_ID;
      tab.textContent = 'AI Help';

      if (accessTab?.nextSibling) {
        tabs.insertBefore(tab, accessTab.nextSibling);
      } else {
        tabs.appendChild(tab);
      }
    }

    let panel = byId(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.className = 'panel';
      panel.innerHTML = `
        <div class="header">
          <div>
            <h2>✨ AI Learning Help</h2>
            <p class="muted">Control student AI tutoring, provider choice and usage limits.</p>
          </div>
          <button id="refresh-ai-help-settings-v38" class="secondary" type="button">Refresh</button>
        </div>

        <div id="ai-help-admin-feedback-v38" class="feedback hidden" aria-live="polite"></div>

        <div class="ai-admin-card-v38">
          <label class="ai-admin-toggle-v38">
            <input id="ai-help-enabled-v38" type="checkbox">
            <span>
              AI Learning Help enabled
              <span class="help">Global switch. Turn this off to stop student AI Help immediately.</span>
            </span>
          </label>

          <div class="ai-admin-grid-v38">
            <label>
              Provider
              <select id="ai-help-provider-v38">
                <option value="mock">Mock tutor — no API cost</option>
                <option value="openai" disabled>OpenAI — adapter not connected yet</option>
                <option value="google" disabled>Google / Gemini — adapter not connected yet</option>
                <option value="anthropic" disabled>Anthropic / Claude — adapter not connected yet</option>
                <option value="openrouter" disabled>OpenRouter — adapter not connected yet</option>
              </select>
              <span class="help">Provider credentials are never stored in this page.</span>
            </label>

            <label>
              Model
              <input id="ai-help-model-v38" type="text" maxlength="100" placeholder="mock-tutor-v1">
              <span class="help">Model identifier used by the selected provider.</span>
            </label>
          </div>

          <h3 style="margin:20px 0 8px">Where AI Help is allowed</h3>
          <div class="ai-admin-grid-v38">
            <label class="ai-admin-toggle-v38">
              <input id="ai-help-practice-v38" type="checkbox">
              <span>Practice Mode<span class="help">Students can use AI Help during normal practice.</span></span>
            </label>

            <label class="ai-admin-toggle-v38">
              <input id="ai-help-recommended-v38" type="checkbox">
              <span>Recommended Practice<span class="help">Students can use AI Help in recommended practice sets.</span></span>
            </label>

            <label class="ai-admin-toggle-v38 ai-admin-locked-v38">
              <input type="checkbox" disabled>
              <span>Exam Mode — OFF<span class="help">Locked off to protect assessment integrity.</span></span>
            </label>

            <label class="ai-admin-toggle-v38 ai-admin-locked-v38">
              <input type="checkbox" disabled>
              <span>Exam Assignments — OFF<span class="help">Locked off to protect assessment integrity.</span></span>
            </label>
          </div>

          <h3 style="margin:20px 0 8px">Usage limits</h3>
          <div class="ai-admin-grid-v38">
            <label>
              Requests per student per day
              <input id="ai-help-student-limit-v38" type="number" min="1" max="200" step="1">
              <span class="help">Allowed range: 1–200.</span>
            </label>

            <label>
              Requests per question per day
              <input id="ai-help-question-limit-v38" type="number" min="1" max="40" step="1">
              <span class="help">Allowed range: 1–40.</span>
            </label>
          </div>

          <div class="ai-admin-status-v38">
            <span id="ai-help-provider-status-v38" class="tag">Provider: —</span>
            <span id="ai-help-model-status-v38" class="tag">Model: —</span>
          </div>

          <div class="ai-admin-note-v38">
            <strong>Security:</strong> API keys and provider secrets stay in Supabase Edge Function secrets. This dashboard only stores non-secret settings such as provider name, model and limits. Future providers can be enabled here after their secure server adapter is installed.
          </div>

          <div class="ai-admin-actions-v38">
            <button id="save-ai-help-settings-v38" class="primary" type="button">Save AI Help Settings</button>
          </div>
        </div>
      `;

      accessPanel.insertAdjacentElement('afterend', panel);
    }

    tab.addEventListener('click', openPanelV38);
    byId('refresh-ai-help-settings-v38')?.addEventListener('click', loadSettingsV38);
    byId('save-ai-help-settings-v38')?.addEventListener('click', saveSettingsV38);

    return true;
  }

  function showFeedbackV38(message, type = 'info') {
    const feedback = byId('ai-help-admin-feedback-v38');
    if (!feedback) return;

    feedback.className = 'feedback';
    if (type === 'success') feedback.classList.add('correct');
    else if (type === 'error') feedback.classList.add('incorrect');
    else feedback.classList.add('try');
    feedback.textContent = message;
  }

  function clearFeedbackV38() {
    const feedback = byId('ai-help-admin-feedback-v38');
    if (!feedback) return;
    feedback.className = 'feedback hidden';
    feedback.textContent = '';
  }

  function activatePanelV38() {
    const teacher = byId('teacher');
    if (!teacher) return;

    teacher.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
    teacher.querySelectorAll('.panel').forEach(item => item.classList.remove('active'));

    byId(TAB_ID)?.classList.add('active');
    byId(PANEL_ID)?.classList.add('active');
  }

  async function openPanelV38() {
    activatePanelV38();
    await loadSettingsV38();
  }

  function addProviderOptionIfNeededV38(provider) {
    const select = byId('ai-help-provider-v38');
    if (!select || !provider) return;

    if (![...select.options].some(option => option.value === provider)) {
      const option = new Option(`${provider} — configured provider`, provider);
      select.add(option);
    }
  }

  function renderSettingsV38(settings) {
    if (!settings) return;

    const provider = String(settings.provider || 'mock');
    addProviderOptionIfNeededV38(provider);

    byId('ai-help-enabled-v38').checked = !!settings.enabled;
    byId('ai-help-provider-v38').value = provider;
    byId('ai-help-model-v38').value = String(settings.model || '');
    byId('ai-help-practice-v38').checked = !!settings.practice_enabled;
    byId('ai-help-recommended-v38').checked = !!settings.recommended_practice_enabled;
    byId('ai-help-student-limit-v38').value = String(settings.max_requests_per_student_day ?? 30);
    byId('ai-help-question-limit-v38').value = String(settings.max_requests_per_question_day ?? 8);

    byId('ai-help-provider-status-v38').textContent = `Provider: ${provider}`;
    byId('ai-help-model-status-v38').textContent = `Model: ${settings.model || '—'}`;
  }

  async function loadSettingsV38() {
    clearFeedbackV38();

    if (typeof cloud === 'undefined' || !cloud) {
      showFeedbackV38('Cloud connection is not ready.', 'error');
      return;
    }

    const refresh = byId('refresh-ai-help-settings-v38');
    if (refresh) {
      refresh.disabled = true;
      refresh.textContent = 'Loading…';
    }

    try {
      const { data, error } = await cloud.rpc('get_teacher_ai_help_settings');
      if (error) throw error;
      renderSettingsV38(data || {});
    } catch (error) {
      console.warn('Could not load V3.8 AI Help settings.', error);
      showFeedbackV38(`Could not load AI Help settings. ${error?.message || ''}`.trim(), 'error');
    } finally {
      if (refresh) {
        refresh.disabled = false;
        refresh.textContent = 'Refresh';
      }
    }
  }

  function readIntegerV38(id, min, max, label) {
    const value = Number(byId(id)?.value);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${label} must be between ${min} and ${max}.`);
    }
    return value;
  }

  async function saveSettingsV38() {
    clearFeedbackV38();

    if (typeof cloud === 'undefined' || !cloud) {
      showFeedbackV38('Cloud connection is not ready.', 'error');
      return;
    }

    const provider = String(byId('ai-help-provider-v38')?.value || 'mock').trim().toLowerCase();
    const model = String(byId('ai-help-model-v38')?.value || '').trim();
    const enabled = !!byId('ai-help-enabled-v38')?.checked;

    if (!model || model.length > 100) {
      showFeedbackV38('Enter a model identifier between 1 and 100 characters.', 'error');
      return;
    }

    /* Only mock is live in V3.8C. Avoid enabling a provider whose secure
       server adapter has not been installed yet. */
    if (enabled && provider !== 'mock') {
      showFeedbackV38('This provider is not connected yet. Choose Mock tutor or turn AI Help off before saving.', 'error');
      return;
    }

    let studentLimit;
    let questionLimit;
    try {
      studentLimit = readIntegerV38('ai-help-student-limit-v38', 1, 200, 'Daily student limit');
      questionLimit = readIntegerV38('ai-help-question-limit-v38', 1, 40, 'Daily question limit');
    } catch (error) {
      showFeedbackV38(error.message, 'error');
      return;
    }

    const save = byId('save-ai-help-settings-v38');
    if (save) {
      save.disabled = true;
      save.textContent = 'Saving…';
    }

    try {
      const { data, error } = await cloud.rpc('update_teacher_ai_help_settings', {
        p_enabled: enabled,
        p_provider: provider,
        p_model: model,
        p_practice_enabled: !!byId('ai-help-practice-v38')?.checked,
        p_recommended_practice_enabled: !!byId('ai-help-recommended-v38')?.checked,
        p_max_requests_per_student_day: studentLimit,
        p_max_requests_per_question_day: questionLimit
      });

      if (error) throw error;
      renderSettingsV38(data || {});
      showFeedbackV38('AI Help settings saved.', 'success');
    } catch (error) {
      console.warn('Could not save V3.8 AI Help settings.', error);
      showFeedbackV38(`Could not save AI Help settings. ${error?.message || ''}`.trim(), 'error');
    } finally {
      if (save) {
        save.disabled = false;
        save.textContent = 'Save AI Help Settings';
      }
    }
  }

  function initV38Admin() {
    injectStyleV38Admin();
    ensureTeacherTabV38();
  }

  if (document.readyState === 'complete') {
    initV38Admin();
  } else {
    window.addEventListener('load', initV38Admin, { once: true });
  }
})();
