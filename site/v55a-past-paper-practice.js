/* V5.5A — Past Paper Practice Library.
   Adds a third Practice source inside Practice Mode: Mixed, Topic, or Past Paper.
   Existing Exam Mode, grading, hints, AI Help, student auth and Practice eligibility
   remain unchanged. Past Paper Practice filters the already-authorized unified
   Practice pool by exam year + paper and keeps normal Practice feedback behavior. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v55aPastPaperPracticeInstalled) return;
  ROOT.__v55aPastPaperPracticeInstalled = true;

  const STYLE_ID = 'v55a-past-paper-practice-style';
  const ROOT_ID = 'v55a-practice-source';
  const PAPER_PANEL_ID = 'v55a-paper-panel';
  const YEAR_ID = 'v55a-paper-year';
  const PAPER_ID = 'v55a-paper-name';
  const NOTE_ID = 'v55a-paper-note';
  const TYPE_BUTTON = 'v55a-practice-type';

  let practiceType = 'mixed';
  let paperLibrary = [];
  let libraryCacheKey = '';
  let libraryLoading = false;
  let installed = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g, ' ');
  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function itemRows(item){
    return item?._kind === 'multipart' && Array.isArray(item.parts) && item.parts.length
      ? item.parts
      : [item];
  }

  function itemPaperMeta(item){
    const rows = itemRows(item).filter(Boolean);
    const row = rows.find(part => part.exam_year && trim(part.paper)) || rows[0] || {};
    return {
      examYear:Number(row.exam_year || item?.exam_year || 0),
      paper:trim(row.paper || item?.paper)
    };
  }

  function matchesPaper(item, examYear, paper){
    const targetYear = Number(examYear || 0);
    const targetPaper = norm(paper);
    if (!targetYear || !targetPaper) return false;
    const meta = itemPaperMeta(item);
    return meta.examYear === targetYear && norm(meta.paper) === targetPaper;
  }

  function logicalKey(row){
    return trim(row?.parent_question_number)
      || trim(row?.question_number)
      || trim(row?.id);
  }

  function derivePaperLibrary(rows){
    const groups = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const examYear = Number(row?.exam_year || 0);
      const paper = trim(row?.paper);
      if (!examYear || !paper || norm(row?.source_type) !== 'past_paper') return;
      const key = `${examYear}|${norm(paper)}`;
      let entry = groups.get(key);
      if (!entry){
        entry = {
          exam_year:examYear,
          paper,
          physical_rows:0,
          marks:0,
          logical_keys:new Set()
        };
        groups.set(key, entry);
      }
      entry.physical_rows += 1;
      entry.marks += Number(row?.marks || 0);
      entry.logical_keys.add(logicalKey(row));
    });

    return [...groups.values()].map(entry => ({
      exam_year:entry.exam_year,
      paper:entry.paper,
      physical_rows:entry.physical_rows,
      logical_questions:entry.logical_keys.size,
      marks:entry.marks
    })).sort((a,b) =>
      b.exam_year - a.exam_year
      || a.paper.localeCompare(b.paper, undefined, { numeric:true, sensitivity:'base' })
    );
  }

  function selectedYear(){
    return Number(document.getElementById(YEAR_ID)?.value || 0);
  }

  function selectedPaper(){
    return trim(document.getElementById(PAPER_ID)?.value);
  }

  function selectedLibraryEntry(){
    const year = selectedYear();
    const paper = norm(selectedPaper());
    return paperLibrary.find(entry =>
      entry.exam_year === year && norm(entry.paper) === paper
    ) || null;
  }

  function setNote(message, kind = 'info'){
    const note = document.getElementById(NOTE_ID);
    if (!note) return;
    note.className = `v55a-paper-note ${kind}`;
    note.textContent = message;
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}{margin-top:14px;border-top:1px solid var(--border);padding-top:14px}
      #${ROOT_ID} .v55a-source-label{display:block;margin-bottom:8px;font-size:12px;font-weight:900;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
      #${ROOT_ID} .v55a-source-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      #${ROOT_ID} .${TYPE_BUTTON}{display:grid;gap:4px;text-align:left;min-height:76px;padding:11px 12px;border:1px solid var(--border);background:var(--card);color:var(--text)}
      #${ROOT_ID} .${TYPE_BUTTON} strong{font-size:13px}
      #${ROOT_ID} .${TYPE_BUTTON} span{font-size:11px;line-height:1.35;color:var(--muted);font-weight:650}
      #${ROOT_ID} .${TYPE_BUTTON}[aria-pressed="true"]{border-color:var(--primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 18%,transparent);background:color-mix(in srgb,var(--soft) 45%,var(--card))}
      #${PAPER_PANEL_ID}{margin-top:12px;border:1px solid var(--border);border-radius:14px;padding:13px;background:var(--surface-soft,var(--card))}
      #${PAPER_PANEL_ID}.hidden{display:none!important}
      #${PAPER_PANEL_ID} .v55a-paper-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${PAPER_PANEL_ID} label{font-size:12px}
      #${PAPER_PANEL_ID} select{min-height:44px}
      #${NOTE_ID}{margin-top:10px;border-radius:10px;padding:9px 10px;font-size:12px;line-height:1.4}
      #${NOTE_ID}.info{background:var(--surface-muted,#f8fafc);color:var(--muted)}
      #${NOTE_ID}.success{background:var(--successbg);color:var(--success)}
      #${NOTE_ID}.warning{background:var(--warnbg);color:var(--warn)}
      @media(max-width:700px){
        #${ROOT_ID} .v55a-source-grid,#${PAPER_PANEL_ID} .v55a-paper-grid{grid-template-columns:1fr}
        #${ROOT_ID} .${TYPE_BUTTON}{min-height:64px}
      }
    `;
    document.head.appendChild(style);
  }

  function forceMixedFilters(){
    const strand = document.getElementById('strand-filter');
    const topic = document.getElementById('topic-filter');
    const difficulty = document.getElementById('difficulty-filter');
    if (strand){
      strand.value = 'all';
      strand.dispatchEvent(new Event('change', { bubbles:true }));
    }
    if (topic) topic.value = 'all';
    if (difficulty) difficulty.value = 'all';
  }

  function setBaseFieldVisibility(){
    const past = practiceType === 'past_paper';
    ['practice-strand-wrap','practice-topic-wrap','practice-difficulty-wrap'].forEach(id => {
      document.getElementById(id)?.classList.toggle('hidden', past);
    });
  }

  function refreshTypeButtons(){
    document.querySelectorAll(`#${ROOT_ID} .${TYPE_BUTTON}`).forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.type === practiceType));
    });
  }

  function refreshSummary(){
    const strandPill = document.querySelector('[data-v40-summary="strand"]');
    const topicPill = document.querySelector('[data-v40-summary="topic"]');
    const difficultyPill = document.querySelector('[data-v40-summary="difficulty"]');

    if (practiceType === 'past_paper'){
      if (strandPill) strandPill.textContent = 'Past Paper Practice';
      if (topicPill) topicPill.textContent = selectedYear() && selectedPaper()
        ? `${selectedYear()} · ${selectedPaper()}`
        : 'Choose a paper';
      difficultyPill?.classList.add('hidden');
      return;
    }

    difficultyPill?.classList.remove('hidden');
    if (practiceType === 'mixed' && strandPill) strandPill.textContent = 'Mixed Practice';
    if (practiceType === 'topic' && strandPill) strandPill.textContent = 'Topic Practice';
  }

  function refreshPaperNote(){
    const entry = selectedLibraryEntry();
    if (!entry){
      setNote('Choose a year and paper to practise.', 'info');
      refreshSummary();
      return;
    }
    setNote(
      `${entry.logical_questions} questions available · ${entry.marks} marks in the source paper. `+
      'Your selected Practice session length will be used, with hints, second attempts and feedback.',
      'success'
    );
    refreshSummary();
  }

  function fillPaperOptions(preferredPaper = ''){
    const paperSelect = document.getElementById(PAPER_ID);
    if (!paperSelect) return;
    const year = selectedYear();
    const entries = paperLibrary.filter(entry => entry.exam_year === year);
    paperSelect.innerHTML = entries.length
      ? entries.map(entry => `<option value="${esc(entry.paper)}">${esc(entry.paper)} · ${entry.logical_questions} questions</option>`).join('')
      : '<option value="">No paper available</option>';
    if (preferredPaper && entries.some(entry => norm(entry.paper) === norm(preferredPaper))){
      paperSelect.value = entries.find(entry => norm(entry.paper) === norm(preferredPaper)).paper;
    }
    refreshPaperNote();
  }

  function renderPaperLibrary(preferredYear = 0, preferredPaper = ''){
    const yearSelect = document.getElementById(YEAR_ID);
    if (!yearSelect) return;
    const years = [...new Set(paperLibrary.map(entry => entry.exam_year))].sort((a,b) => b-a);
    yearSelect.innerHTML = years.length
      ? years.map(year => `<option value="${year}">${year}</option>`).join('')
      : '<option value="">No past papers available</option>';
    const chosenYear = Number(preferredYear || years[0] || 0);
    if (chosenYear && years.includes(chosenYear)) yearSelect.value = String(chosenYear);
    fillPaperOptions(preferredPaper);
  }

  async function loadPaperLibrary(force = false){
    if (libraryLoading) return;
    if (typeof cloudReady !== 'undefined' && !cloudReady){
      setNote('Past papers require cloud access. Please check your connection.', 'warning');
      return;
    }

    libraryLoading = true;
    setNote('Loading available past papers…', 'info');
    try{
      const access = typeof validateStudentAccess === 'function'
        ? await validateStudentAccess('practice')
        : null;
      if (!access?.access_token) throw new Error('Student sign-in is required.');
      const yearLevel = Number(access.year_level || document.getElementById('year-level')?.value || 6);
      const cacheKey = `${access.access_token}|${yearLevel}`;
      if (!force && cacheKey === libraryCacheKey && paperLibrary.length){
        renderPaperLibrary(selectedYear(), selectedPaper());
        return;
      }

      const { data, error } = await cloud.rpc('get_student_practice_questions_v53d3', {
        p_access_token:access.access_token,
        p_year_level:yearLevel
      });
      if (error) throw error;
      paperLibrary = derivePaperLibrary(data || []);
      libraryCacheKey = cacheKey;
      renderPaperLibrary();
      if (!paperLibrary.length){
        setNote('No past-paper questions are currently available in Practice Mode.', 'warning');
      }
    } catch (error){
      console.warn('V5.5A past-paper library could not be loaded.', error);
      paperLibrary = [];
      libraryCacheKey = '';
      renderPaperLibrary();
      setNote(`Could not load past papers. ${error?.message || ''}`.trim(), 'warning');
    } finally{
      libraryLoading = false;
    }
  }

  function setPracticeType(next, options = {}){
    const allowed = ['mixed','topic','past_paper'];
    practiceType = allowed.includes(next) ? next : 'mixed';

    if (practiceType === 'mixed' && options.keepFilters !== true){
      forceMixedFilters();
    }
    if (practiceType === 'past_paper'){
      forceMixedFilters();
      void loadPaperLibrary(false);
    }

    const panel = document.getElementById(PAPER_PANEL_ID);
    panel?.classList.toggle('hidden', practiceType !== 'past_paper');
    setBaseFieldVisibility();
    refreshTypeButtons();
    window.setTimeout(refreshSummary, 0);
  }

  function buildUi(){
    const summary = document.querySelector('#start .v40c-practice-summary');
    const head = summary?.querySelector('.v40c-summary-head');
    if (!summary || !head || document.getElementById(ROOT_ID)) return false;

    const root = document.createElement('section');
    root.id = ROOT_ID;
    root.innerHTML = `
      <span class="v55a-source-label">Choose Practice type</span>
      <div class="v55a-source-grid" role="group" aria-label="Choose Practice type">
        <button type="button" class="${TYPE_BUTTON}" data-type="mixed" aria-pressed="true">
          <strong>🔀 Mixed Practice</strong>
          <span>A balanced mix from the Practice bank.</span>
        </button>
        <button type="button" class="${TYPE_BUTTON}" data-type="topic" aria-pressed="false">
          <strong>🎯 Topic Practice</strong>
          <span>Focus on a strand or topic using the existing filters.</span>
        </button>
        <button type="button" class="${TYPE_BUTTON}" data-type="past_paper" aria-pressed="false">
          <strong>📄 Past Paper Practice</strong>
          <span>Practise questions from a specific year and paper with normal Practice help.</span>
        </button>
      </div>
      <div id="${PAPER_PANEL_ID}" class="hidden">
        <div class="v55a-paper-grid">
          <label>Exam year<select id="${YEAR_ID}"><option value="">Loading…</option></select></label>
          <label>Paper<select id="${PAPER_ID}"><option value="">Choose a year first</option></select></label>
        </div>
        <div id="${NOTE_ID}" class="v55a-paper-note info">Choose Past Paper Practice to load available papers.</div>
      </div>
    `;

    head.insertAdjacentElement('afterend', root);

    root.querySelectorAll(`.${TYPE_BUTTON}`).forEach(button => {
      button.addEventListener('click', () => setPracticeType(button.dataset.type || 'mixed'));
    });
    document.getElementById(YEAR_ID)?.addEventListener('change', () => fillPaperOptions());
    document.getElementById(PAPER_ID)?.addEventListener('change', refreshPaperNote);

    document.getElementById('strand-filter')?.addEventListener('change', () => {
      const strand = document.getElementById('strand-filter')?.value || 'all';
      if (practiceType !== 'past_paper' && strand !== 'all') setPracticeType('topic', { keepFilters:true });
      else window.setTimeout(refreshSummary, 0);
    });
    document.getElementById('topic-filter')?.addEventListener('change', () => {
      const topic = document.getElementById('topic-filter')?.value || 'all';
      if (practiceType !== 'past_paper' && topic !== 'all') setPracticeType('topic', { keepFilters:true });
      else window.setTimeout(refreshSummary, 0);
    });

    document.addEventListener('click', event => {
      if (event.target?.closest?.('#v40c-student-logout')){
        paperLibrary = [];
        libraryCacheKey = '';
        setPracticeType('mixed');
      }
    }, true);

    return true;
  }

  function installWrappers(){
    if (ROOT.__v55aPastPaperPracticeWrappersInstalled) return true;
    if (typeof startPractice !== 'function' || typeof getQuestions !== 'function' || typeof shuffle !== 'function') return false;

    const baseGetQuestions = getQuestions;
    const baseStartPractice = startPractice;
    const baseShuffle = shuffle;

    getQuestions = async function(...args){
      const items = await baseGetQuestions.apply(this, args);
      if (practiceType !== 'past_paper') return items;
      const year = selectedYear();
      const paper = selectedPaper();
      return (Array.isArray(items) ? items : []).filter(item => matchesPaper(item, year, paper));
    };

    shuffle = function(items){
      if (practiceType === 'past_paper'){
        const d3 = ROOT.V53D3PracticeSelection;
        if (d3 && typeof d3.orderPracticeItems === 'function'){
          return d3.orderPracticeItems(items, Math.random);
        }
      }
      return baseShuffle(items);
    };
    try { ROOT.shuffle = shuffle; } catch {}

    startPractice = async function(...args){
      if (practiceType === 'past_paper'){
        if (!selectedYear() || !selectedPaper()){
          window.alert('Choose a past paper year and paper before starting Practice.');
          return;
        }
        forceMixedFilters();
      }

      await baseStartPractice.apply(this, args);

      const quiz = document.getElementById('quiz');
      if (!quiz?.classList.contains('active')) return;

      try{
        if (typeof state !== 'undefined' && state){
          state.v55a_practice_type = practiceType;
          if (practiceType === 'past_paper'){
            state.v55a_exam_year = selectedYear();
            state.v55a_paper = selectedPaper();
          }
        }
      } catch {}

      const path = document.getElementById('path-pill');
      if (path && practiceType === 'past_paper'){
        path.textContent = `${selectedYear()} · ${selectedPaper()} Practice`;
      } else if (path && practiceType === 'topic'){
        path.title = 'Topic Practice';
      }
    };

    ROOT.__v55aPastPaperPracticeWrappersInstalled = true;
    return true;
  }

  function install(){
    if (installed) return true;
    injectStyles();
    const uiReady = buildUi() || !!document.getElementById(ROOT_ID);
    const wrappersReady = installWrappers();
    if (!uiReady || !wrappersReady) return false;
    installed = true;
    setPracticeType('mixed');
    return true;
  }

  function scheduleInstall(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 100) return;
      window.setTimeout(run, 100);
    };
    run();
  }

  const api = Object.freeze({
    derivePaperLibrary,
    itemPaperMeta,
    matchesPaper,
    getPracticeType:() => practiceType,
    getPaperLibrary:() => paperLibrary.map(entry => ({ ...entry })),
    setPracticeType,
    loadPaperLibrary
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window, 'V55APastPaperPractice', {
      value:api,
      writable:false,
      configurable:false
    });
    scheduleInstall();
  }
})();
