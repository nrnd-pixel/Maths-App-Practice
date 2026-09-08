/* Phase 4 — consolidated V5.5 Past Paper Practice core.
   Replaces the active V5.5A + V5.5A.1 + V5.5B browser layers while preserving
   their public globals, flags, DOM contracts and Practice lifecycle behavior.
   Same-device resume and result attribution remain deliberately outside this
   module so V5.7A can continue to wrap the accepted V5.5C boundary. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__phase4PastPaperCoreInstalled) return;
  ROOT.__phase4PastPaperCoreInstalled = true;

  // Historical module-presence compatibility. These flags were set as soon as
  // the retired files loaded, before their delayed browser installers completed.
  ROOT.__v55aPastPaperPracticeInstalled = true;
  ROOT.__v55a1PracticeTypeGuardInstalled = true;
  ROOT.__v55bFullPaperPracticeInstalled = true;

  const STYLE_ID = 'v55a-past-paper-practice-style';
  const ROOT_ID = 'v55a-practice-source';
  const PAPER_PANEL_ID = 'v55a-paper-panel';
  const YEAR_ID = 'v55a-paper-year';
  const PAPER_ID = 'v55a-paper-name';
  const NOTE_ID = 'v55a-paper-note';
  const TYPE_BUTTON = 'v55a-practice-type';
  const SCOPE_SECTION_ID = 'v55b-paper-scope';
  const SCOPE_BUTTON = 'v55b-paper-scope-btn';
  const SCOPE_INFO_ID = 'v55b-paper-scope-info';
  const SCOPE_STYLE_ID = 'v55b-full-paper-practice-style';
  const TEMP_COUNT_VALUE = '999';

  let practiceType = 'mixed';
  let paperLibrary = [];
  let libraryCacheKey = '';
  let libraryLoading = false;
  let scope = 'quick';
  let fullRunActive = false;
  let installed = false;
  let wrappersInstalled = false;

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

  function currentType(){
    return practiceType;
  }

  function selectedYear(){
    return typeof document === 'undefined' ? 0 : Number(document.getElementById(YEAR_ID)?.value || 0);
  }

  function selectedPaper(){
    return typeof document === 'undefined' ? '' : trim(document.getElementById(PAPER_ID)?.value);
  }

  function selectedPaperMeta(){
    return { year:selectedYear(), paper:selectedPaper() };
  }

  function selectedLibraryEntry(){
    const year = selectedYear();
    const paper = norm(selectedPaper());
    return paperLibrary.find(entry =>
      entry.exam_year === year && norm(entry.paper) === paper
    ) || null;
  }

  function currentLibraryEntry(){
    return selectedLibraryEntry();
  }

  function isPastPaperPractice(){
    return practiceType === 'past_paper';
  }

  function selectionStackSettled(){
    // v40-release.js injects V53D5 after the staged V55 files have already been
    // queued. V53D5 assigns the global shuffle function while its RPC bridge is
    // installing, so V55 must capture/wrap it only after that owner is settled.
    // This preserves the historical intended chain: V53D5 -> V55A -> V55B.
    try{
      return ROOT.__v53d5PracticeSelectionInstalled === true
        && typeof cloud !== 'undefined'
        && !!cloud
        && cloud.__v53d5PracticeSelectionRpcBridge === true;
    } catch {
      return false;
    }
  }

  function topicSelectionReady(){
    if (typeof document === 'undefined') return false;
    const strand = document.getElementById('strand-filter')?.value || 'all';
    const topic = document.getElementById('topic-filter')?.value || 'all';
    return strand !== 'all' || topic !== 'all';
  }

  function isPastPaperItem(item){
    const rows = itemRows(item).filter(Boolean);
    return rows.length > 0 && rows.every(row => norm(row.source_type) === 'past_paper');
  }

  function openTopicSettings(){
    if (typeof document === 'undefined') return;
    const summary = document.querySelector('#start .v40c-practice-summary');
    if (!summary) return;
    summary.classList.add('v40c-settings-open');
    const change = summary.querySelector('.v40c-change-settings');
    if (change){
      change.setAttribute('aria-expanded','true');
      change.textContent = 'Hide settings';
    }
  }

  function polishPaperNote(){
    if (typeof document === 'undefined') return;
    const note = document.getElementById(NOTE_ID);
    if (!note) return;
    const next = String(note.textContent || '').replace(
      'marks in the source paper',
      'marks available in the Practice bank'
    );
    if (next !== note.textContent) note.textContent = next;
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

  function setNote(message, kind = 'info'){
    if (typeof document === 'undefined') return;
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

  function injectScopeStyles(){
    if (typeof document === 'undefined' || document.getElementById(SCOPE_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SCOPE_STYLE_ID;
    style.textContent = `
      #${SCOPE_SECTION_ID}{margin-top:12px;border-top:1px solid var(--border);padding-top:12px}
      #${SCOPE_SECTION_ID} .v55b-scope-label{font-size:12px;font-weight:900;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px}
      #${SCOPE_SECTION_ID} .v55b-scope-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #${SCOPE_SECTION_ID} .${SCOPE_BUTTON}{display:grid;gap:4px;text-align:left;min-height:72px;padding:11px 12px;border:1px solid var(--border);background:var(--card);color:var(--text)}
      #${SCOPE_SECTION_ID} .${SCOPE_BUTTON} strong{font-size:13px}
      #${SCOPE_SECTION_ID} .${SCOPE_BUTTON} span{font-size:11px;line-height:1.35;color:var(--muted);font-weight:650}
      #${SCOPE_SECTION_ID} .${SCOPE_BUTTON}[aria-pressed="true"]{border-color:var(--primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 18%,transparent);background:color-mix(in srgb,var(--soft) 45%,var(--card))}
      #${SCOPE_INFO_ID}{margin-top:9px;padding:9px 10px;border-radius:10px;background:var(--surface-muted,#f8fafc);color:var(--muted);font-size:12px;line-height:1.45}
      @media(max-width:700px){#${SCOPE_SECTION_ID} .v55b-scope-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function forceMixedFilters(){
    if (typeof document === 'undefined') return;
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
    if (typeof document === 'undefined') return;
    const past = practiceType === 'past_paper';
    ['practice-strand-wrap','practice-topic-wrap','practice-difficulty-wrap'].forEach(id => {
      document.getElementById(id)?.classList.toggle('hidden', past);
    });
  }

  function refreshTypeButtons(){
    if (typeof document === 'undefined') return;
    document.querySelectorAll(`#${ROOT_ID} .${TYPE_BUTTON}`).forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.type === practiceType));
    });
  }

  function refreshSummary(){
    if (typeof document === 'undefined') return;
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
    polishPaperNote();
    refreshSummary();
  }

  function fillPaperOptions(preferredPaper = ''){
    if (typeof document === 'undefined') return;
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
    refreshScopeInfo();
  }

  function renderPaperLibrary(preferredYear = 0, preferredPaper = ''){
    if (typeof document === 'undefined') return;
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

  function refreshScopeButtons(){
    if (typeof document === 'undefined') return;
    document.querySelectorAll(`#${SCOPE_SECTION_ID} .${SCOPE_BUTTON}`).forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.scope === scope));
    });
  }

  function refreshCountControl(){
    if (typeof document === 'undefined') return;
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

  function refreshScopeInfo(){
    if (typeof document === 'undefined') return;
    const info = document.getElementById(SCOPE_INFO_ID);
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
    refreshScopeButtons();
    refreshCountControl();
    refreshScopeInfo();
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

    if (typeof document !== 'undefined'){
      const panel = document.getElementById(PAPER_PANEL_ID);
      panel?.classList.toggle('hidden', practiceType !== 'past_paper');
    }
    setBaseFieldVisibility();
    refreshTypeButtons();
    refreshCountControl();
    refreshScopeInfo();
    if (typeof window !== 'undefined') window.setTimeout(refreshSummary, 0);
  }

  function buildSourceUi(){
    if (typeof document === 'undefined') return false;
    const summary = document.querySelector('#start .v40c-practice-summary');
    const head = summary?.querySelector('.v40c-summary-head');
    if (!summary || !head) return false;
    if (document.getElementById(ROOT_ID)) return true;

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
    document.getElementById(PAPER_ID)?.addEventListener('change', () => {
      refreshPaperNote();
      refreshScopeInfo();
    });
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

  function buildScopeUi(){
    if (typeof document === 'undefined') return false;
    const panel = document.getElementById(PAPER_PANEL_ID);
    if (!panel) return false;
    if (document.getElementById(SCOPE_SECTION_ID)) return true;

    const section = document.createElement('section');
    section.id = SCOPE_SECTION_ID;
    section.innerHTML = `
      <div class="v55b-scope-label">Session length</div>
      <div class="v55b-scope-grid" role="group" aria-label="Past Paper Practice session length">
        <button type="button" class="${SCOPE_BUTTON}" data-scope="quick" aria-pressed="true">
          <strong>⚡ Quick Session</strong>
          <span>Use the selected 5, 10, 15 or 20-question Practice length.</span>
        </button>
        <button type="button" class="${SCOPE_BUTTON}" data-scope="all" aria-pressed="false">
          <strong>📚 All Available Questions</strong>
          <span>Practise every currently available question from this paper in source order.</span>
        </button>
      </div>
      <div id="${SCOPE_INFO_ID}" class="v55b-scope-info"></div>
    `;
    panel.appendChild(section);
    section.querySelectorAll(`.${SCOPE_BUTTON}`).forEach(button => {
      button.addEventListener('click', () => setScope(button.dataset.scope));
    });
    document.getElementById(YEAR_ID)?.addEventListener('change', () => window.setTimeout(refreshScopeInfo, 0));
    document.getElementById(PAPER_ID)?.addEventListener('change', refreshScopeInfo);
    document.addEventListener('click', event => {
      if (event.target?.closest?.(`.${TYPE_BUTTON}`)){
        window.setTimeout(() => {
          refreshCountControl();
          refreshScopeInfo();
        }, 0);
      }
      if (event.target?.closest?.('#v40c-student-logout')) setScope('quick');
    }, true);
    return true;
  }

  function wireGuardUi(){
    if (typeof document === 'undefined') return false;
    if (document.documentElement?.dataset.v55a1GuardWired === '1') return true;
    if (document.documentElement) document.documentElement.dataset.v55a1GuardWired = '1';

    document.addEventListener('click', event => {
      const topic = event.target?.closest?.('.v55a-practice-type[data-type="topic"]');
      if (topic) window.setTimeout(openTopicSettings,0);
    }, true);

    const note = document.getElementById(NOTE_ID);
    if (note && note.dataset.v55a1Observed !== '1'){
      note.dataset.v55a1Observed = '1';
      if (typeof MutationObserver !== 'undefined'){
        new MutationObserver(polishPaperNote).observe(note,{childList:true,characterData:true,subtree:true});
      }
      polishPaperNote();
    }
    return true;
  }

  function annotateAfterCoreStart(){
    if (typeof document === 'undefined') return;
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
  }

  async function runFreshStart(baseStartPractice, thisArg, args){
    // Historical V55A.1 behavior sits outside V55A: Topic Practice is blocked
    // before V55A can delegate to the accepted Practice engine.
    if (practiceType === 'topic' && !topicSelectionReady()){
      openTopicSettings();
      window.alert('Choose a strand or topic before starting Topic Practice.');
      window.setTimeout(() => document.getElementById('strand-filter')?.focus(),0);
      return;
    }

    // Historical V55A behavior.
    if (practiceType === 'past_paper'){
      if (!selectedYear() || !selectedPaper()){
        window.alert('Choose a past paper year and paper before starting Practice.');
        return;
      }
      forceMixedFilters();
    }

    await baseStartPractice.apply(thisArg, args);
    annotateAfterCoreStart();
  }

  function installWrappers(){
    if (wrappersInstalled) return true;
    if (!selectionStackSettled()) return false;
    if (typeof startPractice !== 'function' || typeof getQuestions !== 'function' || typeof shuffle !== 'function') return false;

    const baseGetQuestions = getQuestions;
    const baseStartPractice = startPractice;
    const baseShuffle = shuffle;

    const wrappedGetQuestions = async function(...args){
      const items = await baseGetQuestions.apply(this, args);
      if (practiceType !== 'past_paper') return items;
      const year = selectedYear();
      const paper = selectedPaper();
      const matched = (Array.isArray(items) ? items : []).filter(item => matchesPaper(item, year, paper));
      return matched.filter(isPastPaperItem);
    };

    const wrappedShuffle = function(items){
      if (fullRunActive && isPastPaperPractice()) return sortSourceOrder(items);
      if (isPastPaperPractice()){
        const d3 = ROOT.V53D3PracticeSelection;
        if (d3 && typeof d3.orderPracticeItems === 'function'){
          return d3.orderPracticeItems(items, Math.random);
        }
      }
      return baseShuffle(items);
    };

    const wrappedStartPractice = async function(...args){
      const useAll = isPastPaperPractice() && scope === 'all';
      if (!useAll) return runFreshStart(baseStartPractice, this, args);

      // Historical V55B is the outermost V55A/B start layer: prepare the
      // temporary full-run count before invoking the V55A.1/V55A behavior.
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
        await runFreshStart(baseStartPractice, this, args);
        const quiz = document.getElementById('quiz');
        if (!quiz?.classList.contains('active')) return;
        try{
          if (typeof state !== 'undefined' && state){
            state.v55b_paper_scope = 'all_available';
            state.count = Array.isArray(state.questions)
              ? state.questions.length
              : Number(entry.logical_questions || 0);
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

    try { getQuestions = wrappedGetQuestions; } catch {}
    try { shuffle = wrappedShuffle; } catch {}
    try { startPractice = wrappedStartPractice; } catch {}
    try { ROOT.getQuestions = wrappedGetQuestions; } catch {}
    try { ROOT.shuffle = wrappedShuffle; } catch {}
    try { ROOT.startPractice = wrappedStartPractice; } catch {}

    ROOT.__v55aPastPaperPracticeWrappersInstalled = true;
    ROOT.__v55bFullPaperPracticeWrappersInstalled = true;
    ROOT.__phase4PastPaperCoreWrappersInstalled = true;
    wrappersInstalled = true;
    return true;
  }

  function install(){
    if (installed) return true;
    if (typeof document === 'undefined') return false;
    injectStyles();
    injectScopeStyles();
    const sourceReady = buildSourceUi();
    const scopeReady = sourceReady && buildScopeUi();
    const guardReady = sourceReady && wireGuardUi();
    const wrappersReady = installWrappers();
    if (!sourceReady || !scopeReady || !guardReady || !wrappersReady) return false;
    installed = true;
    setScope('quick');
    setPracticeType('mixed');
    return true;
  }

  function scheduleInstall(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 120) return;
      window.setTimeout(run,100);
    };
    run();
  }

  const paperApi = Object.freeze({
    derivePaperLibrary,
    itemPaperMeta,
    matchesPaper,
    getPracticeType:() => practiceType,
    getPaperLibrary:() => paperLibrary.map(entry => ({ ...entry })),
    setPracticeType,
    loadPaperLibrary
  });

  const guardApi = Object.freeze({
    topicSelectionReady,
    isPastPaperItem,
    openTopicSettings,
    polishPaperNote
  });

  const scopeApi = Object.freeze({
    questionOrderKey,
    sortSourceOrder,
    getScope:() => scope,
    setScope
  });

  const moduleApi = Object.freeze({
    V55APastPaperPractice:paperApi,
    V55A1PracticeTypeGuard:guardApi,
    V55BFullPaperPractice:scopeApi
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = moduleApi;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V55APastPaperPractice',{value:paperApi,writable:false,configurable:false});
    Object.defineProperty(window,'V55A1PracticeTypeGuard',{value:guardApi,writable:false,configurable:false});
    Object.defineProperty(window,'V55BFullPaperPractice',{value:scopeApi,writable:false,configurable:false});
    scheduleInstall();
  }
})();
