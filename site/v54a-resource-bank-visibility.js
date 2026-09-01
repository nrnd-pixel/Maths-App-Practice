/* V5.4A — Unified Teacher Resource Bank visibility.
   Read-only Question Bank overlay for practice_eligible state. Adds a compact
   resource-bank summary, full-bank eligibility filter and per-question Practice
   resource status. Composes with V5.2B.1 paging and V5.3D6 topical status clarity.
   No question, publication, grading, assignment, Practice or Exam data is changed. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54aResourceBankVisibilityInstalled) return;
  ROOT.__v54aResourceBankVisibilityInstalled = true;

  const FILTER_ID = 'v54a-eligibility-filter';
  const SUMMARY_ID = 'v54a-resource-bank-summary';
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const esc = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function isEligible(row){ return row?.practice_eligible === true; }

  function sourceCategory(row){
    const source = norm(row?.source_type);
    if (source === 'topical' || source === 'topical_exercise') return 'topical';
    if (source === 'past_paper') return 'past_paper';
    if (source === 'practice') return 'practice';
    if (source === 'teacher') return 'teacher';
    return source || 'other';
  }

  function reviewState(row){
    const value = norm(row?.review_status);
    return ['reviewed','needs_review'].includes(value) ? value : 'none';
  }

  function resourceStats(rows=currentQuestions()){
    const list = Array.isArray(rows) ? rows : [];
    let eligible=0, ineligible=0, eligibleReviewed=0, eligibleTopical=0, activeTopical=0;
    for (const row of list){
      const topical = sourceCategory(row) === 'topical';
      if (isEligible(row)){
        eligible += 1;
        if (reviewState(row) === 'reviewed') eligibleReviewed += 1;
        if (topical) eligibleTopical += 1;
      } else {
        ineligible += 1;
      }
      if (topical && row?.active !== false) activeTopical += 1;
    }
    return Object.freeze({
      total:list.length,
      eligible,
      ineligible,
      eligibleReviewed,
      eligibleTopical,
      activeTopical
    });
  }

  function matchesEligibility(row,value='all'){
    const filter = norm(value || 'all');
    if (filter === 'eligible') return isEligible(row);
    if (filter === 'ineligible') return !isEligible(row);
    return true;
  }

  function filterRowsByEligibility(rows,value='all'){
    const list = Array.from(rows || []);
    const filter = norm(value || 'all');
    return filter === 'all' ? list : list.filter(row=>matchesEligibility(row,filter));
  }

  function cardQuestionId(card){
    return String(
      card?.dataset?.v51b2aId
      || card?.querySelector?.('.v51b2a-select')?.dataset?.id
      || card?.querySelector?.('[data-id]')?.dataset?.id
      || ''
    );
  }

  function currentFilter(){
    if (typeof document === 'undefined') return 'all';
    return document.getElementById(FILTER_ID)?.value || 'all';
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById('v54a-resource-bank-style')) return;
    const style = document.createElement('style');
    style.id = 'v54a-resource-bank-style';
    style.textContent = `
      .v54a-practice-resource{background:var(--successbg);color:var(--success)}
      .v54a-not-practice-resource{background:var(--warnbg);color:var(--warn)}
      #v54a-eligibility-filter-wrap .help{display:block;margin-top:2px}
      @media(min-width:761px){#questions-panel .filtergrid{grid-template-columns:2fr repeat(6,minmax(120px,1fr))}}
      @media(max-width:760px){#questions-panel .filtergrid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureControls(){
    if (typeof document === 'undefined') return null;
    injectStyles();
    let select = document.getElementById(FILTER_ID);
    if (select) return select;

    const status = document.getElementById('question-status');
    const statusLabel = status?.closest?.('label');
    if (!statusLabel) return null;

    const label = document.createElement('label');
    label.id = 'v54a-eligibility-filter-wrap';
    label.innerHTML = `Practice resource
      <select id="${FILTER_ID}" aria-label="Practice resource eligibility filter">
        <option value="all">All Practice states</option>
        <option value="eligible">In Practice</option>
        <option value="ineligible">Not in Practice</option>
      </select>
      <span class="help">Filters the full resource bank before paging.</span>`;
    statusLabel.insertAdjacentElement('afterend',label);
    select = label.querySelector('select');
    select?.addEventListener('change',()=>{
      try { if (typeof renderQuestions === 'function') renderQuestions(); }
      catch { renderAll(); }
    });
    return select;
  }

  function ensureSummary(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById(SUMMARY_ID);
    if (root) return root;
    const count = document.getElementById('question-bank-count');
    if (!count) return null;
    root = document.createElement('section');
    root.id = SUMMARY_ID;
    root.className = 'info';
    root.style.marginBottom = '12px';
    count.insertAdjacentElement('beforebegin',root);
    return root;
  }

  function renderSummary(rows=currentQuestions()){
    const root = ensureSummary();
    if (!root) return;
    const stats = resourceStats(rows);
    const safety = stats.activeTopical === 0
      ? '<span class="tag">✓ 0 active topical rows</span>'
      : `<span class="tag" style="background:var(--dangerbg);color:var(--danger)">⚠ ${esc(stats.activeTopical)} active topical row${stats.activeTopical===1?'':'s'}</span>`;
    root.innerHTML = `
      <div>
        <strong>Unified Practice resource bank</strong>
        <div class="help">Practice eligibility is independent of source type and legacy Active status. These counts show what ordinary Practice can draw from.</div>
      </div>
      <div class="pills" style="margin-top:9px">
        <span class="tag">${esc(stats.eligible)} in Practice</span>
        <span class="tag">${esc(stats.ineligible)} not in Practice</span>
        <span class="tag">${esc(stats.eligibleReviewed)} eligible + reviewed</span>
        <span class="tag">${esc(stats.eligibleTopical)} topical-origin eligible</span>
        ${safety}
      </div>`;
  }

  function statusBadge(meta){
    if (!meta) return null;
    let badge = meta.querySelector('.v54a-resource-badge');
    if (badge) return badge;

    // V5.3D6 already adds a Practice-status badge to topical rows. Reuse that
    // element instead of showing two eligibility badges on the same card.
    badge = meta.querySelector('.v53d6-practice-eligibility-badge');
    if (badge){
      badge.classList.add('v54a-resource-badge');
      return badge;
    }

    badge = document.createElement('span');
    badge.className = 'tag v54a-resource-badge';
    meta.appendChild(badge);
    return badge;
  }

  function decorateCards(rows=currentQuestions()){
    if (typeof document === 'undefined') return;
    const byId = new Map((rows || []).map(row=>[String(row?.id),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const row = byId.get(cardQuestionId(card));
      if (!row) return;
      const meta = card.querySelector('.qcard-meta');
      if (!meta) return;
      const badge = statusBadge(meta);
      if (!badge) return;
      const eligible = isEligible(row);
      badge.classList.remove('v54a-practice-resource','v54a-not-practice-resource');
      badge.classList.add(eligible?'v54a-practice-resource':'v54a-not-practice-resource');
      badge.textContent = eligible ? 'Practice resource' : 'Not in Practice';
      badge.title = eligible
        ? 'This question may be served through ordinary Practice.'
        : 'This question remains in the Question Bank but is not currently served through ordinary Practice.';
    });
  }

  function filteredLabel(value){
    return value === 'eligible' ? 'In Practice' : 'Not in Practice';
  }

  function updateFilteredUi(renderResult,totalLoaded,filterValue){
    if (typeof document === 'undefined' || filterValue === 'all') return;
    const page = renderResult?.page;
    if (!page) return;
    const label = filteredLabel(filterValue);
    const count = document.getElementById('question-bank-count');
    if (count){
      if (page.renderAll) count.textContent=`Showing all ${page.total} matching questions · ${totalLoaded} loaded · ${label}`;
      else if (!page.total) count.textContent=`Showing 0 matching questions · ${totalLoaded} loaded · ${label}`;
      else count.textContent=`Showing ${page.start}–${page.end} of ${page.total} matching questions · ${totalLoaded} loaded · ${label}`;
    }
    const pagerHelp = document.querySelector('#v52b1-question-pagination .help');
    if (pagerHelp){
      pagerHelp.textContent=`${page.total} matching question${page.total===1?'':'s'} from ${totalLoaded} loaded. Practice resource filter: ${label}.`;
    }
  }

  function renderAll(rows=currentQuestions()){
    ensureControls();
    renderSummary(rows);
    decorateCards(rows);
  }

  function installRenderBridge(){
    try {
      if (typeof renderQuestions !== 'function') return false;
      if (ROOT.__v54aPreviousRenderQuestions) return true;
      const previous = renderQuestions;
      ROOT.__v54aPreviousRenderQuestions = previous;
      renderQuestions = function(...args){
        const filterValue = currentFilter();
        const allRows = currentQuestions();
        const eligibleRows = filterRowsByEligibility(allRows,filterValue);
        let original = null;
        let swapped = false;
        let result;
        try {
          if (filterValue !== 'all'
              && typeof teacherQuestions !== 'undefined'
              && Array.isArray(teacherQuestions)){
            original = teacherQuestions;
            teacherQuestions = eligibleRows;
            swapped = true;
          }
          result = previous.apply(this,args);
        } finally {
          if (swapped) teacherQuestions = original;
        }
        renderSummary(allRows);
        decorateCards(allRows);
        if (filterValue !== 'all'){
          ROOT.requestAnimationFrame?.(()=>ROOT.requestAnimationFrame?.(()=>{
            updateFilteredUi(result,allRows.length,filterValue);
            decorateCards(allRows);
          }));
        }
        return result;
      };
      return true;
    } catch {
      return false;
    }
  }

  function wire(){
    if (typeof document === 'undefined') return;
    ensureControls();
    installRenderBridge();
    renderAll();
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('.tab[data-panel="questions-panel"]')){
        ROOT.setTimeout?.(()=>{
          ensureControls();
          renderAll();
        },0);
      }
    });
  }

  const api = Object.freeze({
    isEligible,
    sourceCategory,
    reviewState,
    resourceStats,
    matchesEligibility,
    filterRowsByEligibility,
    cardQuestionId
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54AResourceBankVisibility',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
