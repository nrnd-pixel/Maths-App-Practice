/* V5.6A — Question Bank response-type filter.
   Teacher-only browsing convenience for identifying drawing/manual-response questions
   before using the existing safe Practice eligibility controls. No question data,
   active status, Practice eligibility, grading, Exam Mode or Supabase schema changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v56aQuestionBankResponseFilterInstalled) return;
  ROOT.__v56aQuestionBankResponseFilterInstalled = true;

  const CONTROL_ID = 'v56a-response-filter-control';
  const FILTER_ID = 'v56a-response-type-filter';
  const SUMMARY_ID = 'v56a-response-filter-summary';
  const LOCK_TITLE = 'Clear the current Question Bank selection before changing response type.';
  let renderWrapped = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,'_');

  const FILTER_OPTIONS = Object.freeze([
    ['all','All response types'],
    ['teacher_review_practice','Requires teacher review — non-topical only'],
    ['drawing_practice','Drawing — non-topical only'],
    ['teacher_review','Requires teacher review — all sources'],
    ['drawing','Drawing — all sources'],
    ['manual','Manual / teacher response'],
    ['auto_graded','Auto-graded only'],
    ['text','Text / typed answer'],
    ['number','Number'],
    ['number_unit','Number + unit'],
    ['fraction','Fraction'],
    ['multi_blank','Multiple blanks'],
    ['multiple_choice','Multiple choice'],
    ['multi_select','Multiple select']
  ]);

  function responseType(row){
    return norm(row?.response_type) || 'text';
  }

  function sourceType(row){
    return norm(row?.source_type);
  }

  function isTopical(row){
    return sourceType(row) === 'topical_exercise';
  }

  function matchesResponseType(row,filter='all'){
    const value = norm(filter) || 'all';
    const type = responseType(row);
    if (value === 'all') return true;
    if (value === 'teacher_review_practice') return !isTopical(row) && (type === 'drawing' || type === 'manual');
    if (value === 'drawing_practice') return !isTopical(row) && type === 'drawing';
    if (value === 'teacher_review') return type === 'drawing' || type === 'manual';
    if (value === 'auto_graded') return type !== 'drawing' && type !== 'manual';
    return type === value;
  }

  function filterRows(rows,filter='all'){
    return Array.from(rows || []).filter(row => matchesResponseType(row,filter));
  }

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function selectedCount(rows=currentQuestions()){
    try {
      const selected = ROOT.V51QuestionBankBulkStatus?.buildPlan?.(rows,undefined,false)?.selected;
      return Array.isArray(selected) ? selected.length : 0;
    } catch { return 0; }
  }

  function currentFilter(){
    if (typeof document === 'undefined') return 'all';
    return document.getElementById(FILTER_ID)?.value || 'all';
  }

  function filterLabel(value=currentFilter()){
    return FILTER_OPTIONS.find(([key])=>key===value)?.[1] || 'All response types';
  }

  function ensureControl(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById(CONTROL_ID);
    if (root) return root;

    const grid = document.querySelector('#questions-panel .filtergrid');
    if (!grid) return null;

    root = document.createElement('section');
    root.id = CONTROL_ID;
    root.className = 'info';
    root.style.margin = '0 0 12px';
    root.innerHTML = `
      <div class="header" style="align-items:end;gap:12px;flex-wrap:wrap">
        <label style="min-width:min(100%,360px);margin:0">
          Response type
          <select id="${FILTER_ID}" aria-label="Filter Question Bank by response type">
            ${FILTER_OPTIONS.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}
          </select>
        </label>
        <div style="flex:1;min-width:240px">
          <div id="${SUMMARY_ID}" class="help"></div>
          <div class="help" style="margin-top:4px"><strong>Safe Practice workflow:</strong> choose Drawing — non-topical only (or Requires teacher review — non-topical only) → Select all filtered → Remove selected from Practice. Topical Exercise rows are excluded because their Practice availability is managed as whole resource sets.</div>
        </div>
      </div>`;
    grid.insertAdjacentElement('afterend',root);

    document.getElementById(FILTER_ID)?.addEventListener('change',()=>{
      if (selectedCount() > 0) return;
      try { if (typeof renderQuestions === 'function') renderQuestions(); } catch {}
      scheduleSummary();
    });
    return root;
  }

  function renderSummary(){
    const root = ensureControl();
    if (!root) return null;
    const rows = currentQuestions();
    const filter = currentFilter();
    const matchingRows = filterRows(rows,filter);
    const matching = matchingRows.length;
    const topicalMatches = matchingRows.filter(isTopical).length;
    const selected = selectedCount(rows);
    const select = document.getElementById(FILTER_ID);
    const summary = document.getElementById(SUMMARY_ID);

    if (select){
      select.disabled = selected > 0;
      select.title = selected > 0 ? LOCK_TITLE : '';
    }
    if (summary){
      const base = filter === 'all'
        ? `${rows.length} loaded questions · showing all response types`
        : `${matching} of ${rows.length} loaded questions match “${filterLabel(filter)}”`;
      const topicalWarning = topicalMatches && (filter === 'drawing' || filter === 'teacher_review')
        ? ` · ${topicalMatches} topical row${topicalMatches===1?' is':'s are'} included; use the non-topical option before bulk Practice changes`
        : '';
      summary.textContent = `${base}${topicalWarning}${selected?` · ${selected} selected · filter locked until selection is cleared`:''}`;
    }
    return Object.freeze({filter,matching,total:rows.length,topicalMatches,selected,locked:selected>0});
  }

  function scheduleSummary(){
    if (typeof window === 'undefined') return;
    [0,60,180,500].forEach(delay=>window.setTimeout(renderSummary,delay));
  }

  function prerequisitesReady(){
    return !!ROOT.__v52b1QuestionBankPerformanceInstalled
      && !!ROOT.__v54fBulkSelectionScopeSafetyInstalled
      && typeof renderQuestions === 'function';
  }

  function installRenderWrapper(){
    if (renderWrapped) return true;
    if (!prerequisitesReady()) return false;

    const previous = renderQuestions;
    renderQuestions = function(...args){
      const filter = currentFilter();
      if (filter === 'all'){
        const result = previous.apply(this,args);
        scheduleSummary();
        return result;
      }

      let original = null;
      let swapped = false;
      try {
        if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)){
          original = teacherQuestions;
          teacherQuestions = filterRows(original,filter);
          swapped = true;
        }
        return previous.apply(this,args);
      } finally {
        if (swapped) teacherQuestions = original;
        scheduleSummary();
      }
    };
    renderWrapped = true;
    ROOT.__v56aQuestionBankResponseFilterRenderWrapped = true;
    return true;
  }

  function wire(){
    if (typeof document === 'undefined') return;
    ensureControl();
    scheduleSummary();

    document.addEventListener('click',event=>{
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#v52b-refresh,#v51b2a-select-visible,#v51b2a-clear-selection,#v52b1-question-pagination button,.v54b-practice-toggle,#v54e-add-practice,#v54e-remove-practice')){
        scheduleSummary();
      }
    });
    document.addEventListener('change',event=>{
      if (event.target?.matches?.('.v51b2a-select') || event.target?.closest?.('#questions-panel .filtergrid')) scheduleSummary();
    });

    if (installRenderWrapper()) return;
    let tries = 0;
    const timer = window.setInterval(()=>{
      tries += 1;
      ensureControl();
      if (installRenderWrapper() || tries >= 60){
        window.clearInterval(timer);
        scheduleSummary();
      }
    },100);
  }

  const api = Object.freeze({
    FILTER_OPTIONS,
    responseType,
    sourceType,
    isTopical,
    matchesResponseType,
    filterRows,
    filterLabel,
    selectedCount,
    renderSummary,
    ensureControl
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V56AQuestionBankResponseFilter',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
