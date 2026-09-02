/* V5.5B — Full Available Past-Paper Practice.
   Extends V5.5A Past Paper Practice with a safe session-scope choice:
   Quick Session uses the existing Practice question-count selector, while
   All Available Questions practises every currently eligible logical question
   from the selected paper in source question-number order. This remains Practice
   Mode: normal hints, second attempts, AI Help and Practice grading are unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v55bFullPaperPracticeInstalled) return;
  ROOT.__v55bFullPaperPracticeInstalled = true;

  const SECTION_ID = 'v55b-paper-scope';
  const MODE_BUTTON = 'v55b-paper-scope-btn';
  const INFO_ID = 'v55b-paper-scope-info';
  const TEMP_COUNT_VALUE = '999';

  let scope = 'quick';
  let installed = false;
  let fullRunActive = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g, ' ');

  function isPastPaperPractice(){
    try {
      return ROOT.V55APastPaperPractice?.getPracticeType?.() === 'past_paper';
    } catch {
      return false;
    }
  }

  function selectedPaperMeta(){
    const year = Number(document.getElementById('v55a-paper-year')?.value || 0);
    const paper = trim(document.getElementById('v55a-paper-name')?.value);
    return { year, paper };
  }

  function currentLibraryEntry(){
    const { year, paper } = selectedPaperMeta();
    if (!year || !paper) return null;
    const library = ROOT.V55APastPaperPractice?.getPaperLibrary?.() || [];
    return library.find(entry =>
      Number(entry?.exam_year || 0) === year && norm(entry?.paper) === norm(paper)
    ) || null;
  }

  function questionOrderKey(item){
    const raw = trim(item?.question_number || item?.parent_question_number);
    const cleaned = raw.replace(/^question\s*/i, '').trim();
    const match = cleaned.match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (!match){
      return { number:Number.POSITIVE_INFINITY, suffix:cleaned, raw };
    }
    return {
      number:Number(match[1]),
      suffix:trim(match[2]).replace(/^[-.:\s]+/, ''),
      raw
    };
  }

  function sortSourceOrder(items){
    return (Array.isArray(items) ? items : [])
      .map((item, index) => ({ item, index, key:questionOrderKey(item) }))
      .sort((a,b) =>
        a.key.number - b.key.number
        || a.key.suffix.localeCompare(b.key.suffix, undefined, { numeric:true, sensitivity:'base' })
        || a.key.raw.localeCompare(b.key.raw, undefined, { numeric:true, sensitivity:'base' })
        || a.index - b.index
      )
      .map(row => row.item);
  }

  function refreshButtons(){
    document.querySelectorAll(`#${SECTION_ID} .${MODE_BUTTON}`).forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.scope === scope));
    });
  }

  function refreshCountControl(){
    const wrap = document.getElementById('practice-count-wrap');
    const select = document.getElementById('question-count');
    if (!wrap || !select) return;
    const full = isPastPaperPractice() && scope === 'all';
    select.disabled = full;
    wrap.style.opacity = full ? '.58' : '';
    wrap.title = full
      ? 'All Available Questions ignores the quick-session question count.'
      : '';
  }

  function refreshInfo(){
    const info = document.getElementById(INFO_ID);
    if (!info) return;
    const entry = currentLibraryEntry();
    if (!entry){
      info.textContent = scope === 'all'
        ? 'Choose a year and paper. Every available logical question will be used in source order.'
        : 'Quick Session uses the Number of questions setting above.';
      return;
    }

    if (scope === 'all'){
      info.innerHTML = `<strong>All Available Questions:</strong> ${Number(entry.logical_questions || 0)} `+
        `question${Number(entry.logical_questions || 0) === 1 ? '' : 's'} currently available in the Practice bank. `+
        'They will be shown in source question-number order. This remains Practice Mode, not Exam Mode.';
    } else {
      info.innerHTML = '<strong>Quick Session:</strong> uses the Number of questions setting above and keeps the existing Practice ordering.';
    }
  }

  function setScope(next){
    scope = next === 'all' ? 'all' : 'quick';
    refreshButtons();
    refreshCountControl();
    refreshInfo();
  }

  function buildUi(){
    const panel = document.getElementById('v55a-paper-panel');
    if (!panel || document.getElementById(SECTION_ID)) return !!document.getElementById(SECTION_ID);

    const section = document.createElement('section');
    section.id = SECTION_ID;
    section.innerHTML = `
      <div class="v55b-scope-label">Session length</div>
      <div class="v55b-scope-grid" role="group" aria-label="Past Paper Practice session length">
        <button type="button" class="${MODE_BUTTON}" data-scope="quick" aria-pressed="true">
          <strong>⚡ Quick Session</strong>
          <span>Use the selected 5, 10, 15 or 20-question Practice length.</span>
        </button>
        <button type="button" class="${MODE_BUTTON}" data-scope="all" aria-pressed="false">
          <strong>📚 All Available Questions</strong>
          <span>Practise every currently available question from this paper in source order.</span>
        </button>
      </div>
      <div id="${INFO_ID}" class="v55b-scope-info"></div>
    `;
    panel.appendChild(section);

    section.querySelectorAll(`.${MODE_BUTTON}`).forEach(button => {
      button.addEventListener('click', () => setScope(button.dataset.scope));
    });
    document.getElementById('v55a-paper-year')?.addEventListener('change', () => window.setTimeout(refreshInfo, 0));
    document.getElementById('v55a-paper-name')?.addEventListener('change', refreshInfo);

    document.addEventListener('click', event => {
      if (event.target?.closest?.('.v55a-practice-type')){
        window.setTimeout(() => {
          refreshCountControl();
          refreshInfo();
        }, 0);
      }
      if (event.target?.closest?.('#v40c-student-logout')) setScope('quick');
    }, true);

    injectStyles();
    setScope('quick');
    return true;
  }

  function injectStyles(){
    if (document.getElementById('v55b-full-paper-practice-style')) return;
    const style = document.createElement('style');
    style.id = 'v55b-full-paper-practice-style';
    style.textContent = `
      #${SECTION_ID}{margin-top:12px;border-top:1px solid var(--border);padding-top:12px}
      #${SECTION_ID} .v55b-scope-label{font-size:12px;font-weight:900;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px}
      #${SECTION_ID} .v55b-scope-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #${SECTION_ID} .${MODE_BUTTON}{display:grid;gap:4px;text-align:left;min-height:72px;padding:11px 12px;border:1px solid var(--border);background:var(--card);color:var(--text)}
      #${SECTION_ID} .${MODE_BUTTON} strong{font-size:13px}
      #${SECTION_ID} .${MODE_BUTTON} span{font-size:11px;line-height:1.35;color:var(--muted);font-weight:650}
      #${SECTION_ID} .${MODE_BUTTON}[aria-pressed="true"]{border-color:var(--primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 18%,transparent);background:color-mix(in srgb,var(--soft) 45%,var(--card))}
      #${INFO_ID}{margin-top:9px;padding:9px 10px;border-radius:10px;background:var(--surface-muted,#f8fafc);color:var(--muted);font-size:12px;line-height:1.45}
      @media(max-width:700px){#${SECTION_ID} .v55b-scope-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function installWrappers(){
    if (ROOT.__v55bFullPaperPracticeWrappersInstalled) return true;
    if (typeof startPractice !== 'function' || typeof shuffle !== 'function') return false;

    const baseStartPractice = startPractice;
    const baseShuffle = shuffle;

    shuffle = function(items){
      if (fullRunActive && isPastPaperPractice()) return sortSourceOrder(items);
      return baseShuffle(items);
    };
    try { ROOT.shuffle = shuffle; } catch {}

    startPractice = async function(...args){
      const useAll = isPastPaperPractice() && scope === 'all';
      if (!useAll) return baseStartPractice.apply(this, args);

      const entry = currentLibraryEntry();
      if (!entry || Number(entry.logical_questions || 0) < 1){
        window.alert('Choose an available past paper before starting Practice.');
        return;
      }

      const countSelect = document.getElementById('question-count');
      const previousValue = countSelect?.value || '10';
      let tempOption = null;

      if (countSelect){
        tempOption = document.createElement('option');
        tempOption.value = TEMP_COUNT_VALUE;
        tempOption.textContent = 'All available';
        countSelect.appendChild(tempOption);
        countSelect.disabled = false;
        countSelect.value = TEMP_COUNT_VALUE;
      }

      fullRunActive = true;
      try{
        await baseStartPractice.apply(this, args);

        const quiz = document.getElementById('quiz');
        if (!quiz?.classList.contains('active')) return;

        try {
          if (typeof state !== 'undefined' && state){
            state.v55b_paper_scope = 'all_available';
            state.count = Array.isArray(state.questions) ? state.questions.length : Number(entry.logical_questions || 0);
          }
        } catch {}

        const path = document.getElementById('path-pill');
        if (path){
          const { year, paper } = selectedPaperMeta();
          path.textContent = `${year} · ${paper} · All Available Practice`;
        }
      } finally {
        fullRunActive = false;
        if (countSelect){
          countSelect.value = previousValue;
          tempOption?.remove();
        }
        refreshCountControl();
      }
    };

    try { ROOT.startPractice = startPractice; } catch {}
    ROOT.__v55bFullPaperPracticeWrappersInstalled = true;
    return true;
  }

  function install(){
    if (installed) return true;
    const uiReady = buildUi();
    const wrappersReady = installWrappers();
    if (!uiReady || !wrappersReady) return false;
    installed = true;
    return true;
  }

  function scheduleInstall(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 120) return;
      window.setTimeout(run, 100);
    };
    run();
  }

  const api = Object.freeze({
    questionOrderKey,
    sortSourceOrder,
    getScope:() => scope,
    setScope
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window, 'V55BFullPaperPractice', {
      value:api,
      writable:false,
      configurable:false
    });
    scheduleInstall();
  }
})();
