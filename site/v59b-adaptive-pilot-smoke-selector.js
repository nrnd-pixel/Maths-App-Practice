/* V5.9B adaptive pilot deploy-preview smoke selector.
   Temporary manual-test aid for PR #271 only.

   Safety boundary:
   - Active only on Netlify deploy-preview hosts AND ?adaptivePilot=2.
   - Calls the existing ordinary startPractice() owner; never replaces it.
   - Uses existing Practice filters to load the normal eligible pool.
   - Pins one already-loaded Practice item before any answer is submitted.
   - No direct question-table access, adaptive RPC calls, grading changes or data writes.
*/
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const INSTALL_MARKER = '__v59bAdaptivePilotSmokeSelectorInstalled';
  const PANEL_ID = 'v59b2-smoke-selector';
  const STYLE_ID = 'v59b2-smoke-selector-style';

  const params = typeof location !== 'undefined'
    ? new URLSearchParams(location.search)
    : new URLSearchParams();
  const previewHost =
    typeof location !== 'undefined' &&
    /^deploy-preview-\d+--.+\.netlify\.app$/i.test(location.hostname);
  const enabled = previewHost && params.get('adaptivePilot') === '2';

  if (!enabled || ROOT[INSTALL_MARKER]) return;
  ROOT[INSTALL_MARKER] = true;

  const TARGETS = Object.freeze({
    q9b: Object.freeze({
      id: 'c4feda04-6c85-4123-baf6-8e38deb1d1fa',
      label: '2025 P1 Q9(b)',
      strand: 'number',
      topic: 'Decimals',
      difficulty: 'standard',
    }),
    q4: Object.freeze({
      id: 'c2041abf-d204-47b3-ba92-3129c97681ae',
      label: '2025 P2 Q4',
      strand: 'number',
      topic: 'Fractions',
      difficulty: 'standard',
    }),
    q30: Object.freeze({
      id: '077872ec-2c3c-402f-9c51-491c77500791',
      label: '2025 P2 Q30',
      strand: 'number',
      topic: 'Percentages',
      difficulty: 'standard',
    }),
  });

  function setStatus(text, tone = ''){
    const status = document.getElementById(`${PANEL_ID}-status`);
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone;
  }

  function selectByValueOrText(id, wanted){
    const select = document.getElementById(id);
    if (!select) return false;
    const target = [...select.options].find(option =>
      String(option.value) === String(wanted) ||
      String(option.textContent || '').trim() === String(wanted)
    );
    if (!target) return false;
    select.value = target.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function snapshotControls(){
    const ids = ['year-level','strand-filter','topic-filter','difficulty-filter','question-count'];
    return Object.fromEntries(ids.map(id => [id, document.getElementById(id)?.value ?? null]));
  }

  function restoreControls(snapshot){
    if (!snapshot) return;
    const year = document.getElementById('year-level');
    if (year && snapshot['year-level'] !== null) year.value = snapshot['year-level'];

    const strand = document.getElementById('strand-filter');
    if (strand && snapshot['strand-filter'] !== null) {
      strand.value = snapshot['strand-filter'];
      strand.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const topic = document.getElementById('topic-filter');
    if (topic && snapshot['topic-filter'] !== null) topic.value = snapshot['topic-filter'];

    const difficulty = document.getElementById('difficulty-filter');
    if (difficulty && snapshot['difficulty-filter'] !== null) difficulty.value = snapshot['difficulty-filter'];

    const count = document.getElementById('question-count');
    if (count && snapshot['question-count'] !== null) count.value = snapshot['question-count'];
  }

  function itemContainsTarget(item, targetId){
    if (!item) return false;
    if (String(item.id || '') === targetId) return true;
    return item?._kind === 'multipart' &&
      Array.isArray(item.parts) &&
      item.parts.some(part => String(part?.id || '') === targetId);
  }

  async function configureNormalPractice(target){
    document.getElementById('practice-mode-btn')?.click();

    if (!selectByValueOrText('year-level', '6')) {
      throw new Error('Year 6 control is unavailable.');
    }
    if (!selectByValueOrText('strand-filter', target.strand)) {
      throw new Error('Number strand is unavailable.');
    }

    // Existing strand-change ownership may rebuild topic options synchronously or
    // on the next task depending on the active presentation layer.
    await new Promise(resolve => setTimeout(resolve, 0));

    if (!selectByValueOrText('topic-filter', target.topic)) {
      throw new Error(`${target.topic} topic is unavailable.`);
    }
    if (!selectByValueOrText('difficulty-filter', target.difficulty)) {
      throw new Error('Standard difficulty is unavailable.');
    }

    const count = document.getElementById('question-count');
    if (!count) throw new Error('Question-count control is unavailable.');
    let temporary = count.querySelector('option[data-v59b2-smoke-count="true"]');
    if (!temporary) {
      temporary = document.createElement('option');
      temporary.value = '500';
      temporary.textContent = '500';
      temporary.dataset.v59b2SmokeCount = 'true';
      count.appendChild(temporary);
    }
    count.value = '500';
    count.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function launchTarget(key){
    const target = TARGETS[key];
    if (!target) return;
    if (typeof startPractice !== 'function' || typeof renderQuestion !== 'function') {
      setStatus('Normal Practice is not ready yet. Try again in a moment.', 'error');
      return;
    }

    const snapshot = snapshotControls();
    setStatus(`Loading ${target.label} through normal Practice…`);

    try {
      await configureNormalPractice(target);
      await startPractice();

      if (typeof state === 'undefined' || !Array.isArray(state?.questions)) {
        throw new Error('Normal Practice did not start.');
      }

      const item = state.questions.find(question => itemContainsTarget(question, target.id));
      if (!item) {
        throw new Error(`${target.label} was not returned by the normal eligible Practice pool.`);
      }

      // No answer has been submitted at this point. Keep the exact ordinary
      // Practice item object, but make this smoke session deterministic and short.
      state.questions = [item];
      state.index = 0;
      state.count = 1;
      renderQuestion();
      setStatus(`${target.label} loaded. Complete it through the normal Practice controls.`, 'ok');
    } catch (error) {
      console.warn('V5.9B smoke selector could not launch target.', error);
      try {
        if (typeof show === 'function') show('start');
      } catch {}
      setStatus(error?.message || 'Could not launch the selected pilot target.', 'error');
    } finally {
      document.querySelector('#question-count option[data-v59b2-smoke-count="true"]')?.remove();
      restoreControls(snapshot);
    }
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{
        margin:0 18px 18px;padding:14px;border:1px dashed var(--primary,#2563eb);
        border-radius:14px;background:color-mix(in srgb,var(--soft,#eaf2ff) 55%,var(--card,#fff));
      }
      #${PANEL_ID} strong{display:block;margin-bottom:4px}
      #${PANEL_ID} p{margin:0 0 10px;color:var(--muted,#667085);font-size:12px;line-height:1.45}
      #${PANEL_ID} .v59b2-smoke-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${PANEL_ID} button{min-height:40px;padding:8px 12px}
      #${PANEL_ID}-status{margin-top:10px;margin-bottom:0;font-weight:700}
      #${PANEL_ID}-status[data-tone="error"]{color:var(--danger,#b42318)}
      #${PANEL_ID}-status[data-tone="ok"]{color:var(--success,#16713d)}
    `;
    document.head.appendChild(style);
  }

  function installPanel(){
    if (document.getElementById(PANEL_ID)) return true;
    const setup = document.querySelector('#start .v40c-learn-setup');
    const actions = setup?.querySelector('.v40c-learn-actions');
    if (!setup || !actions) return false;

    injectStyles();
    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-label', 'Adaptive pilot smoke-test targets');
    panel.innerHTML = `
      <strong>Deploy-preview pilot smoke test</strong>
      <p>Launch an exact pilot target through the existing normal Practice engine. Preview only.</p>
      <div class="v59b2-smoke-actions">
        <button type="button" class="outline" data-v59b2-smoke-target="q9b">2025 P1 Q9(b)</button>
        <button type="button" class="outline" data-v59b2-smoke-target="q4">2025 P2 Q4</button>
        <button type="button" class="outline" data-v59b2-smoke-target="q30">2025 P2 Q30</button>
      </div>
      <p id="${PANEL_ID}-status" aria-live="polite"></p>
    `;

    panel.querySelectorAll('[data-v59b2-smoke-target]').forEach(button => {
      button.addEventListener('click', () => launchTarget(button.dataset.v59b2SmokeTarget));
    });
    actions.insertAdjacentElement('beforebegin', panel);
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (installPanel() || attempts >= 80) clearInterval(timer);
  }, 100);

  Object.defineProperty(ROOT, 'V59BAdaptivePilotSmokeSelector', {
    value: Object.freeze({
      enabled: true,
      targets: Object.freeze(Object.fromEntries(
        Object.entries(TARGETS).map(([key, target]) => [key, target.id])
      )),
    }),
    writable: false,
    configurable: false,
  });
})();
