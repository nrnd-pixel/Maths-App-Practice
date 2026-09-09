/* Phase 4 — V54 Resource Bank UI consolidated owner.
   Preserves the accepted V5.4A → V5.4B → V5.4C → V5.4D sequence exactly. */

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
    const filterGrid = status?.closest?.('.filtergrid') || status?.parentElement;
    if (!filterGrid) return null;

    select = document.createElement('select');
    select.id = FILTER_ID;
    select.setAttribute('aria-label','Practice resource eligibility filter');
    select.title = 'Filter the full resource bank by ordinary Practice availability.';
    select.innerHTML = `
      <option value="all">All Practice states</option>
      <option value="eligible">In Practice</option>
      <option value="ineligible">Not in Practice</option>`;
    filterGrid.appendChild(select);
    select.addEventListener('change',()=>{
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

  function statusBadge(meta,row){
    if (!meta) return null;
    let badge = meta.querySelector('.v54a-resource-badge');
    if (badge) return badge;

    // V5.3D6 owns topical-row status decoration. V5.4A may reuse that badge,
    // but never creates a second topical badge if D6 has not painted yet.
    if (sourceCategory(row) === 'topical'){
      badge = meta.querySelector('.v53d6-practice-eligibility-badge');
      if (!badge) return null;
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
    // Paint D6 topical status synchronously first so V5.4A can reuse it. D6 is
    // presentation-only and this avoids a timing race with D6's scheduled bursts.
    try { ROOT.V53D6ResourceBankStatusClarity?.decorate?.(); } catch {}
    const byId = new Map((rows || []).map(row=>[String(row?.id),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const row = byId.get(cardQuestionId(card));
      if (!row) return;
      const meta = card.querySelector('.qcard-meta');
      if (!meta) return;
      const badge = statusBadge(meta,row);
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

/* V5.4B — Teacher Practice eligibility controls.
   Adds safe Question Bank controls on top of V5.4A visibility:
   - topical resources remain whole-set managed in the Topical Exercise Resource Library;
   - non-topical multipart questions move as one logical group;
   - ordinary non-topical singles may be toggled individually.
   All writes use the teacher-only V5.4B RPC. Legacy active, student Practice and Exam
   behavior are unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54bPracticeEligibilityControlsInstalled) return;
  ROOT.__v54bPracticeEligibilityControlsInstalled = true;

  const FEEDBACK_ID = 'v54b-eligibility-feedback';
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');

  function isTopical(row){ return norm(row?.source_type) === 'topical_exercise'; }
  function isGrouped(row){ return !!nullIfBlank(row?.parent_question_number); }
  function isEligible(row){ return row?.practice_eligible === true; }
  function nullIfBlank(value){ const text=trim(value); return text || null; }

  function controlModel(row){
    if (!row) return Object.freeze({managed:true,disabled:true,grouped:false,eligible:false,target:false,label:'Unavailable'});
    const eligible=isEligible(row);
    const grouped=isGrouped(row);
    if (isTopical(row)){
      return Object.freeze({
        managed:true,
        disabled:true,
        grouped,
        eligible,
        target:eligible,
        label:'Managed by set'
      });
    }
    return Object.freeze({
      managed:false,
      disabled:false,
      grouped,
      eligible,
      target:!eligible,
      label: eligible
        ? (grouped?'Remove group from Practice':'Remove from Practice')
        : (grouped?'Add group to Practice':'Add to Practice')
    });
  }

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function cardQuestionId(card){
    try {
      const fromV54A=ROOT.V54AResourceBankVisibility?.cardQuestionId?.(card);
      if (fromV54A) return String(fromV54A);
    } catch {}
    return String(
      card?.dataset?.v51b2aId
      || card?.querySelector?.('.v51b2a-select')?.dataset?.id
      || card?.querySelector?.('[data-id]')?.dataset?.id
      || ''
    );
  }

  function questionById(id,rows=currentQuestions()){
    return Array.from(rows||[]).find(row=>String(row?.id||'')===String(id||'')) || null;
  }

  function ensureFeedback(){
    if (typeof document==='undefined') return null;
    let root=document.getElementById(FEEDBACK_ID);
    if (root) return root;
    root=document.createElement('div');
    root.id=FEEDBACK_ID;
    root.className='feedback hidden';
    const summary=document.getElementById('v54a-resource-bank-summary');
    const count=document.getElementById('question-bank-count');
    if (summary) summary.insertAdjacentElement('afterend',root);
    else if (count) count.insertAdjacentElement('beforebegin',root);
    return root;
  }

  function setFeedback(kind,message){
    const root=ensureFeedback();
    if (!root) return;
    root.className=`feedback ${kind}`;
    root.textContent=String(message||'');
  }

  function buttonTitle(row,model){
    if (model.managed){
      return 'Topical Practice eligibility is managed for the whole resource set in the Topical Exercise Resource Library.';
    }
    if (model.grouped){
      return model.target
        ? 'Add every part of this multipart logical question to ordinary Practice.'
        : 'Remove every part of this multipart logical question from ordinary Practice.';
    }
    return model.target
      ? 'Add this question to ordinary Practice.'
      : 'Remove this question from ordinary Practice.';
  }

  function decorateCards(rows=currentQuestions()){
    if (typeof document==='undefined') return;
    const byId=new Map(Array.from(rows||[]).map(row=>[String(row?.id||''),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const id=cardQuestionId(card);
      const row=byId.get(id);
      if (!row) return;
      const actions=card.querySelector('.qcard-actions');
      if (!actions) return;
      let button=actions.querySelector('.v54b-practice-toggle');
      if (!button){
        button=document.createElement('button');
        button.type='button';
        button.className='outline v54b-practice-toggle';
        actions.appendChild(button);
      }
      const model=controlModel(row);
      button.dataset.id=id;
      button.dataset.target=model.target?'true':'false';
      button.disabled=model.disabled;
      button.textContent=model.label;
      button.title=buttonTitle(row,model);
      button.setAttribute('aria-label',model.label);
      button.classList.remove('outline','warning','secondary');
      button.classList.add(model.managed?'secondary':model.eligible?'warning':'outline');
    });
  }

  function confirmationText(row,model){
    const identity=[
      row?.question_number?`Q${trim(row.question_number)}`:'this question',
      trim(row?.source)
    ].filter(Boolean).join(' · ');
    if (model.grouped){
      return `${model.target?'Add':'Remove'} this whole multipart question ${model.target?'to':'from'} ordinary Practice?\n\nAll parts will stay together. ${identity}`;
    }
    return `${model.target?'Add':'Remove'} ${identity} ${model.target?'to':'from'} ordinary Practice?`;
  }

  function teacherRpcReady(){
    try { return !!(cloudReady && teacherUser && cloud && typeof cloud.rpc==='function'); }
    catch { return false; }
  }

  async function saveEligibility(row,target){
    if (!row?.id) throw new Error('Question could not be identified.');
    if (isTopical(row)) throw new Error('Topical Practice eligibility is managed for the whole resource set. Use the Topical Exercise Resource Library.');
    if (!teacherRpcReady()) throw new Error('Teacher cloud access is not ready.');
    const {data,error}=await cloud.rpc('save_question_practice_eligibility_v54b',{
      p_question_id:row.id,
      p_eligible:!!target
    });
    if (error) throw error;
    return data||{};
  }

  async function handleToggle(button){
    const row=questionById(button?.dataset?.id);
    if (!row) return;
    const model=controlModel(row);
    if (model.managed || model.disabled) return;
    if (typeof window!=='undefined' && !window.confirm(confirmationText(row,model))) return;

    button.disabled=true;
    const previousText=button.textContent;
    button.textContent='Saving…';
    try {
      const result=await saveEligibility(row,model.target);
      const rows=Math.max(1,Number(result.logical_rows||result.updated_rows||1));
      setFeedback('correct',model.grouped
        ? `${model.target?'Added':'Removed'} the complete multipart question ${model.target?'to':'from'} Practice (${rows} physical part${rows===1?'':'s'} kept together).`
        : `${model.target?'Added':'Removed'} the question ${model.target?'to':'from'} ordinary Practice.`);
      if (typeof loadTeacher==='function') await loadTeacher();
      scheduleDecorate();
    } catch(error){
      console.warn('V5.4B Practice eligibility update failed.',error);
      setFeedback('incorrect',`Practice availability could not be changed. ${error?.message||''}`.trim());
      button.disabled=false;
      button.textContent=previousText;
    }
  }

  function scheduleDecorate(){
    if (typeof window==='undefined') return;
    [0,60,180,500].forEach(delay=>window.setTimeout(()=>{
      ensureFeedback();
      decorateCards();
    },delay));
  }

  function installRenderBridge(){
    try {
      if (typeof renderQuestions!=='function') return false;
      if (ROOT.__v54bPreviousRenderQuestions) return true;
      const previous=renderQuestions;
      ROOT.__v54bPreviousRenderQuestions=previous;
      renderQuestions=function(...args){
        const result=previous.apply(this,args);
        scheduleDecorate();
        return result;
      };
      return true;
    } catch {
      return false;
    }
  }

  function wire(){
    if (typeof document==='undefined') return;
    ensureFeedback();
    installRenderBridge();
    decorateCards();

    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('.v54b-practice-toggle');
      if (button){
        event.preventDefault();
        void handleToggle(button);
        return;
      }
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#v52b-refresh,.v53a-eligibility-toggle')) scheduleDecorate();
    });

    document.addEventListener('change',event=>{
      if (event.target?.closest?.('#questions-panel')) scheduleDecorate();
    });

    if (installRenderBridge()) return;
    let tries=0;
    const timer=window.setInterval(()=>{
      tries+=1;
      if (installRenderBridge() || tries>=40){
        window.clearInterval(timer);
        scheduleDecorate();
      }
    },50);
  }

  const api=Object.freeze({
    isTopical,
    isGrouped,
    isEligible,
    controlModel,
    cardQuestionId,
    questionById,
    confirmationText
  });

  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V54BPracticeEligibilityControls',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.4C — Compact Teacher Question Bank browsing.
   Presentation-only layer on top of the accepted V5.2B.1 50-card paging boundary,
   V5.4A resource visibility and V5.4B Practice eligibility controls.
   Compact view hides only secondary card detail while keeping question text,
   status badges and all card actions visible. No question data, Practice, grading,
   assignment or Exam behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54cCompactQuestionBankInstalled) return;
  ROOT.__v54cCompactQuestionBankInstalled = true;

  const STYLE_ID = 'v54c-compact-question-bank-style';
  const CONTROL_ID = 'v54c-question-bank-view';
  const PANEL_ID = 'questions-panel';
  let selectedView = 'compact';

  function normalizeView(value){
    return String(value || '').toLowerCase() === 'detailed' ? 'detailed' : 'compact';
  }

  function panel(){
    return typeof document !== 'undefined' ? document.getElementById(PANEL_ID) : null;
  }

  function currentView(){
    const target = panel();
    if (!target) return selectedView;
    return target.classList.contains('v54c-compact') ? 'compact' : 'detailed';
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}.v54c-compact .qcard{
        padding:12px 14px;
      }
      #${PANEL_ID}.v54c-compact .qcard-head{
        align-items:center;
      }
      #${PANEL_ID}.v54c-compact .qcard-title{
        display:-webkit-box;
        -webkit-box-orient:vertical;
        -webkit-line-clamp:2;
        overflow:hidden;
        margin:7px 0 0;
      }
      #${PANEL_ID}.v54c-compact .qcard-detail{
        display:none !important;
      }
      #${PANEL_ID}.v54c-compact .qcard-meta{
        gap:5px;
      }
      #${PANEL_ID}.v54c-compact .qcard-actions{
        align-items:center;
      }
      #${CONTROL_ID}{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
        margin:0 0 12px;
        padding:10px 12px;
        border:1px solid var(--border);
        border-radius:13px;
        background:var(--card);
      }
      #${CONTROL_ID} .v54c-view-buttons{
        display:flex;
        gap:6px;
        flex-wrap:wrap;
      }
      #${CONTROL_ID} button{
        min-height:36px;
        padding:7px 11px;
        font-size:13px;
      }
      #${CONTROL_ID} button[aria-pressed="true"]{
        background:var(--primary);
        color:#fff;
      }
      #${CONTROL_ID} .v54c-view-note{
        color:var(--muted);
        font-size:12px;
      }
      html[data-theme="dark"] #${CONTROL_ID}{
        background:var(--card);
        color:var(--text);
      }
      @media(max-width:760px){
        #${CONTROL_ID}{align-items:flex-start;}
        #${CONTROL_ID} .v54c-view-note{width:100%;}
      }
    `;
    document.head.appendChild(style);
  }

  function updateControls(view){
    if (typeof document === 'undefined') return;
    const root = document.getElementById(CONTROL_ID);
    if (!root) return;
    root.querySelectorAll('[data-v54c-view]').forEach(button => {
      const selected = button.dataset.v54cView === view;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    const note = root.querySelector('.v54c-view-note');
    if (note){
      note.textContent = view === 'compact'
        ? 'Compact view hides secondary metadata while keeping question text, Practice status and actions visible.'
        : 'Detailed view shows the full metadata for every card on this page.';
    }
  }

  function setView(value){
    selectedView = normalizeView(value);
    const target = panel();
    if (target){
      target.classList.toggle('v54c-compact', selectedView === 'compact');
      target.dataset.v54cView = selectedView;
    }
    updateControls(selectedView);
    return selectedView;
  }

  function controlAnchor(){
    if (typeof document === 'undefined') return null;
    return document.getElementById('v54b-eligibility-feedback')
      || document.getElementById('v54a-resource-bank-summary')
      || document.getElementById('question-bank-count')
      || document.getElementById('v52b1-question-pagination');
  }

  function ensureControls(){
    if (typeof document === 'undefined') return null;
    injectStyles();
    let root = document.getElementById(CONTROL_ID);
    if (root){
      updateControls(selectedView);
      return root;
    }

    const anchor = controlAnchor();
    if (!anchor) return null;

    root = document.createElement('section');
    root.id = CONTROL_ID;
    root.setAttribute('aria-label','Question card view');
    root.innerHTML = `
      <div>
        <strong>Question card view</strong>
        <div class="v54c-view-note"></div>
      </div>
      <div class="v54c-view-buttons" role="group" aria-label="Question card view options">
        <button type="button" class="outline" data-v54c-view="compact" aria-pressed="true">Compact</button>
        <button type="button" class="outline" data-v54c-view="detailed" aria-pressed="false">Detailed</button>
      </div>`;
    anchor.insertAdjacentElement('afterend',root);

    root.addEventListener('click',event => {
      const button = event.target?.closest?.('[data-v54c-view]');
      if (!button) return;
      setView(button.dataset.v54cView);
    });

    updateControls(selectedView);
    return root;
  }

  function apply(){
    if (typeof document === 'undefined') return;
    injectStyles();
    ensureControls();
    setView(selectedView);
  }

  function scheduleApply(){
    if (typeof window === 'undefined') return;
    [0,80,220,600].forEach(delay => window.setTimeout(apply,delay));
  }

  function wire(){
    if (typeof document === 'undefined') return;
    scheduleApply();

    document.addEventListener('click',event => {
      if (event.target?.closest?.('.tab[data-panel="questions-panel"],#v52b-refresh,#v52b1-question-pagination button')){
        scheduleApply();
      }
    });

    document.addEventListener('change',event => {
      if (event.target?.closest?.('#v54a-eligibility-filter,#questions-panel .filtergrid')) scheduleApply();
    });
  }

  const api = Object.freeze({normalizeView,currentView,setView,ensureControls,controlAnchor});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54CCompactQuestionBank',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.4D — Topical Resource Library simplification.
   Presentation-only cleanup on the accepted V5.4C baseline.
   Students use ordinary Practice for eligible topical-origin questions, so the
   legacy V5.2C publication panel and legacy locked Active button are hidden from
   normal teacher workflow. Their backend/guard code remains loaded as rollback
   infrastructure. Set-level Practice eligibility controls remain visible. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54dTopicalResourceSimplificationInstalled) return;
  ROOT.__v54dTopicalResourceSimplificationInstalled = true;

  const STYLE_ID = 'v54d-topical-resource-simplification-style';

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return false;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #v52b-topical-library .v52c-publication{display:none!important}
      #questions-cards .toggle-q[data-v52-topical-locked="1"]{display:none!important}
    `;
    document.head.appendChild(style);
    return true;
  }

  function install(){ injectStyles(); }

  const api = Object.freeze({injectStyles});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54DTopicalResourceSimplification',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
