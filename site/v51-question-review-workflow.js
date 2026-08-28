/* V5.1B2C — Persistent Question Bank review workflow.
   Uses B2A selection. Only review_status/review_note may change.
   Needs Review requires inactive questions and blocks B2A activation until resolved. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51QuestionReviewWorkflowInstalled) return;
  if (typeof window !== 'undefined') window.__v51QuestionReviewWorkflowInstalled = true;

  const REVIEW_STATES = Object.freeze(['none','needs_review','reviewed']);
  let busy = false;
  let lastPlan = null;

  const trim = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function normalizeReviewStatus(value){
    const status = trim(value).toLowerCase();
    return REVIEW_STATES.includes(status) ? status : 'none';
  }

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function selectedIdsFromUi(){
    if (typeof document === 'undefined') return new Set();
    return new Set([...document.querySelectorAll('.v51b2a-select:checked')]
      .map(box=>String(box.dataset.id || box.closest('.qcard')?.dataset?.v51b2aId || ''))
      .filter(Boolean));
  }

  function selectedRows(rows=currentQuestions(), ids=selectedIdsFromUi()){
    return rows.filter(row=>ids.has(String(row.id)));
  }

  function questionLabel(row){
    const exam = [row?.exam_year,row?.paper,row?.question_number ? `Q${row.question_number}` : ''].filter(Boolean).join(' ');
    return exam || trim(row?.question_text).slice(0,70) || String(row?.id || 'Question');
  }

  function buildReviewPlan(rows=currentQuestions(), ids=selectedIdsFromUi(), action='needs_review', note=''){
    const target = normalizeReviewStatus(action);
    const selected = rows.filter(row=>ids.has(String(row.id)));
    const cleanNote = trim(note);
    const blockers = [];

    if (!REVIEW_STATES.includes(target)) blockers.push('Unknown review action.');
    if (target === 'needs_review' && !cleanNote) blockers.push('A review note is required when marking Needs Review.');

    const activeTargets = target === 'needs_review' ? selected.filter(row=>row.active !== false) : [];
    if (activeTargets.length) blockers.push(`${activeTargets.length} selected question${activeTargets.length===1?' is':'s are'} active. Deactivate before marking Needs Review.`);

    const patch = {review_status:target};
    if (target === 'needs_review') patch.review_note = cleanNote;
    else if (target === 'reviewed' && cleanNote) patch.review_note = cleanNote;
    else if (target === 'none') patch.review_note = '';

    const changing = selected.filter(row=>{
      if (normalizeReviewStatus(row.review_status) !== target) return true;
      if (Object.prototype.hasOwnProperty.call(patch,'review_note') && trim(row.review_note) !== patch.review_note) return true;
      return false;
    });

    return Object.freeze({
      action:target,
      note:cleanNote,
      patch:Object.freeze({...patch}),
      selected:Object.freeze(selected.slice()),
      changing:Object.freeze(changing.slice()),
      activeTargets:Object.freeze(activeTargets.slice()),
      blockers:Object.freeze(blockers.slice()),
      canRun:selected.length>0 && changing.length>0 && blockers.length===0
    });
  }

  function confirmationText(plan){
    const label = plan.action === 'needs_review' ? 'Mark Needs Review'
      : plan.action === 'reviewed' ? 'Mark Reviewed' : 'Clear review state';
    return [
      `${label} for ${plan.changing.length} question${plan.changing.length===1?'':'s'}?`,
      '',
      'Only review_status and, when applicable, review_note will change.',
      'Active status, answers, marks, metadata, images, exam identity, multipart structure and Exam Settings will not change.',
      plan.action === 'reviewed' ? 'Marking Reviewed does not activate an inactive question.' : '',
      '',
      'This writes to the configured Supabase question bank.'
    ].filter((line,index)=>line || index===1 || index===5).join('\n');
  }

  function reviewStats(rows=currentQuestions()){
    let none=0, needsReview=0, reviewed=0;
    for (const row of rows){
      const state = normalizeReviewStatus(row.review_status);
      if (state === 'needs_review') needsReview++;
      else if (state === 'reviewed') reviewed++;
      else none++;
    }
    return {none,needsReview,reviewed,total:rows.length};
  }

  function ensureReviewFilter(){
    if (typeof document === 'undefined') return null;
    let select = document.getElementById('v51b2c-review-filter');
    if (select) return select;
    const filterGrid = document.getElementById('question-status')?.closest('.filtergrid') || document.getElementById('question-status')?.parentElement;
    if (!filterGrid) return null;
    select = document.createElement('select');
    select.id = 'v51b2c-review-filter';
    select.setAttribute('aria-label','Question review state filter');
    select.innerHTML = '<option value="all">All review states</option><option value="needs_review">Needs review</option><option value="reviewed">Reviewed</option><option value="none">No review state</option>';
    filterGrid.appendChild(select);
    select.addEventListener('change',()=>{
      try { if (typeof renderQuestions === 'function') renderQuestions(); } catch { window.requestAnimationFrame(renderAll); }
    });
    return select;
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v51b2c-review-workflow');
    if (panel) return panel;
    const metadataPanel = document.getElementById('v51b2b-bulk-metadata');
    const statusPanel = document.getElementById('v51b2a-bulk-status');
    const anchor = metadataPanel || statusPanel;
    if (!anchor) return null;

    panel = document.createElement('section');
    panel.id = 'v51b2c-review-workflow';
    panel.className = 'info';
    panel.style.marginBottom = '12px';
    panel.innerHTML = `
      <div class="header" style="align-items:center;gap:10px">
        <div>
          <strong>V5.1B2C — Question review</strong>
          <div class="help">Uses the B2A selection. Needs Review requires an inactive question and blocks later activation until resolved.</div>
        </div>
        <button id="v51b2c-reset" class="outline" type="button">Reset review form</button>
      </div>
      <div id="v51b2c-stats" class="pills" style="margin-top:10px"></div>
      <div class="filtergrid" style="margin-top:10px">
        <label><strong>Review action</strong>
          <select id="v51b2c-action">
            <option value="needs_review">Mark Needs Review</option>
            <option value="reviewed">Mark Reviewed</option>
            <option value="none">Clear review state</option>
          </select>
        </label>
        <label style="grid-column:span 2"><strong>Review note</strong>
          <textarea id="v51b2c-note" rows="2" placeholder="Required for Needs Review; optional when marking Reviewed"></textarea>
        </label>
      </div>
      <div class="toolbar" style="margin-top:10px">
        <button id="v51b2c-preview" class="outline" type="button">Preview review changes</button>
        <button id="v51b2c-apply" class="primary" type="button">Apply review changes</button>
      </div>
      <div id="v51b2c-summary" class="help" style="margin-top:8px">0 selected</div>
      <div id="v51b2c-preview-root" class="info hidden" style="margin-top:10px"></div>
      <div id="v51b2c-feedback" class="feedback hidden" role="status" aria-live="polite"></div>`;
    anchor.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function setFeedback(kind,message){
    const root = document.getElementById('v51b2c-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.innerHTML = message;
  }

  function clearFeedback(){
    const root = document.getElementById('v51b2c-feedback');
    if (!root) return;
    root.className = 'feedback hidden';
    root.innerHTML = '';
  }

  function currentFormPlan(){
    const action = document.getElementById('v51b2c-action')?.value || 'needs_review';
    const note = document.getElementById('v51b2c-note')?.value || '';
    return buildReviewPlan(currentQuestions(),selectedIdsFromUi(),action,note);
  }

  function renderPreview(plan=currentFormPlan()){
    lastPlan = plan;
    const root = document.getElementById('v51b2c-preview-root');
    if (!root) return plan;
    root.className = 'info';
    if (!plan.selected.length){
      root.innerHTML = '<strong>No questions selected.</strong>';
      return plan;
    }
    if (plan.blockers.length){
      root.innerHTML = `<strong>Review change blocked.</strong><br>${plan.blockers.map(esc).join('<br>')}`;
      return plan;
    }
    const actionLabel = plan.action === 'needs_review' ? 'Needs Review' : plan.action === 'reviewed' ? 'Reviewed' : 'No review state';
    const examples = plan.changing.slice(0,5).map(row=>esc(questionLabel(row))).join('<br>');
    root.innerHTML = plan.changing.length
      ? `<strong>${plan.changing.length} question${plan.changing.length===1?'':'s'} will change</strong><br>Review status → ${esc(actionLabel)}${Object.prototype.hasOwnProperty.call(plan.patch,'review_note')?`<br>Review note → ${esc(plan.patch.review_note || '(cleared)')}`:''}<div style="margin-top:8px"><strong>Examples</strong><br>${examples}${plan.changing.length>5?'<br>…':''}</div>`
      : '<strong>No selected questions need this review change.</strong>';
    return plan;
  }

  function decorateCards(rows=currentQuestions()){
    if (typeof document === 'undefined') return;
    const byId = new Map(rows.map(row=>[String(row.id),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const id = card.dataset.v51b2aId || card.querySelector('.v51b2a-select')?.dataset?.id || card.querySelector('[data-id]')?.dataset?.id || '';
      const row = byId.get(String(id));
      if (!row) return;
      let badge = card.querySelector('.v51b2c-review-badge');
      const state = normalizeReviewStatus(row.review_status);
      if (state === 'none'){
        badge?.remove();
        return;
      }
      if (!badge){
        badge = document.createElement('div');
        badge.className = 'v51b2c-review-badge help';
        badge.style.margin = '4px 0 8px';
        const select = card.querySelector('.v51b2a-select-wrap');
        if (select) select.insertAdjacentElement('afterend',badge); else card.prepend(badge);
      }
      const label = state === 'needs_review' ? '⚠ Needs review' : '✅ Reviewed';
      const note = trim(row.review_note);
      badge.innerHTML = `<strong>${label}</strong>${note?` — ${esc(note)}`:''}`;
    });
  }

  function applyReviewFilter(rows=currentQuestions()){
    if (typeof document === 'undefined') return;
    const filter = document.getElementById('v51b2c-review-filter')?.value || 'all';
    if (filter === 'all') return;
    const byId = new Map(rows.map(row=>[String(row.id),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const id = card.dataset.v51b2aId || card.querySelector('.v51b2a-select')?.dataset?.id || card.querySelector('[data-id]')?.dataset?.id || '';
      const row = byId.get(String(id));
      if (row && normalizeReviewStatus(row.review_status) !== filter) card.classList.add('hidden');
    });
  }

  function unresolvedSelectedRows(rows=currentQuestions()){
    const ids = selectedIdsFromUi();
    return rows.filter(row=>ids.has(String(row.id)) && row.active === false && normalizeReviewStatus(row.review_status)==='needs_review');
  }

  function updateActivationGuard(){
    if (typeof document === 'undefined') return 0;
    const blocked = unresolvedSelectedRows();
    const btn = document.getElementById('v51b2a-activate');
    if (btn && blocked.length) btn.disabled = true;
    const summary = document.getElementById('v51b2a-summary');
    if (summary && blocked.length && !summary.textContent.includes('unresolved review blocker')){
      summary.textContent += ` • ${blocked.length} unresolved review blocker${blocked.length===1?'':'s'}`;
    }
    return blocked.length;
  }

  function renderAll(){
    const panel = ensurePanel();
    if (!panel) return;
    ensureReviewFilter();
    const rows = currentQuestions();
    const stats = reviewStats(rows);
    const statsRoot = document.getElementById('v51b2c-stats');
    if (statsRoot) statsRoot.innerHTML = [`${stats.needsReview} needs review`,`${stats.reviewed} reviewed`,`${stats.none} no review state`]
      .map(text=>`<span class="tag">${esc(text)}</span>`).join('');
    decorateCards(rows);
    applyReviewFilter(rows);
    const plan = currentFormPlan();
    const summary = document.getElementById('v51b2c-summary');
    if (summary){
      const details = [`${plan.selected.length} selected`,`${plan.changing.length} would change`];
      if (plan.blockers.length) details.push(`${plan.blockers.length} blocker${plan.blockers.length===1?'':'s'}`);
      if (!cloudTeacherReady()) details.push('writes require Cloud Teacher');
      summary.textContent = details.join(' • ');
    }
    const apply = document.getElementById('v51b2c-apply');
    if (apply) apply.disabled = busy || !cloudTeacherReady() || !plan.canRun;
    const preview = document.getElementById('v51b2c-preview');
    if (preview) preview.disabled = busy || !plan.selected.length;
    updateActivationGuard();
  }

  async function applyReviewChanges(){
    if (busy) return;
    const plan = currentFormPlan();
    lastPlan = plan;
    if (!cloudTeacherReady()){
      setFeedback('incorrect','Review changes require Cloud Teacher mode.');
      return;
    }
    if (plan.blockers.length){
      setFeedback('incorrect',`<strong>Review change blocked.</strong><br>${plan.blockers.map(esc).join('<br>')}`);
      renderPreview(plan);
      return;
    }
    if (!plan.changing.length){
      setFeedback('try','No selected questions need this review change.');
      return;
    }
    if (!window.confirm(confirmationText(plan))) return;

    busy = true;
    renderAll();
    setFeedback('try',`Updating review state for ${plan.changing.length} question${plan.changing.length===1?'':'s'}…`);
    const ids = plan.changing.map(row=>row.id);
    let error = null;
    try {
      ({error} = await cloud.from('questions').update(plan.patch).in('id',ids));
    } catch (err){ error = err; }
    if (error){
      busy = false;
      setFeedback('incorrect',esc(error.message || String(error)));
      renderAll();
      return;
    }

    try { window.V51QuestionBankBulkStatus?.clearSelection?.(); } catch {}
    try { await loadTeacher(); } catch (err){ console.warn('Question Bank refresh failed after review update:',err); }
    busy = false;
    lastPlan = null;
    const previewRoot = document.getElementById('v51b2c-preview-root');
    if (previewRoot) previewRoot.className = 'info hidden';
    setFeedback('correct',`${plan.changing.length} question${plan.changing.length===1?'':'s'} review state updated successfully.`);
    window.requestAnimationFrame(renderAll);
  }

  function resetForm(){
    const action = document.getElementById('v51b2c-action');
    const note = document.getElementById('v51b2c-note');
    if (action) action.value = 'needs_review';
    if (note) note.value = '';
    lastPlan = null;
    clearFeedback();
    const preview = document.getElementById('v51b2c-preview-root');
    if (preview) preview.className = 'info hidden';
    renderAll();
  }

  function guardActivationClick(event){
    const button = event.target?.closest?.('#v51b2a-activate');
    if (!button) return;
    const blocked = unresolvedSelectedRows();
    if (!blocked.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const feedback = document.getElementById('v51b2a-feedback');
    if (feedback){
      feedback.className = 'feedback incorrect';
      feedback.innerHTML = `<strong>Activation blocked.</strong> ${blocked.length} selected question${blocked.length===1?' is':'s are'} still marked Needs Review. Mark Reviewed or clear the review state first.`;
    }
    updateActivationGuard();
  }

  function wire(){
    if (typeof document === 'undefined') return;
    if (!ensurePanel()) return;
    ensureReviewFilter();

    document.getElementById('v51b2c-preview')?.addEventListener('click',()=>{ clearFeedback(); renderPreview(); renderAll(); });
    document.getElementById('v51b2c-apply')?.addEventListener('click',applyReviewChanges);
    document.getElementById('v51b2c-reset')?.addEventListener('click',resetForm);
    ['v51b2c-action','v51b2c-note'].forEach(id=>{
      document.getElementById(id)?.addEventListener(id==='v51b2c-note'?'input':'change',()=>{
        lastPlan = null;
        clearFeedback();
        renderAll();
      });
    });

    document.addEventListener('click',guardActivationClick,true);
    document.addEventListener('change',event=>{
      if (event.target?.classList?.contains('v51b2a-select')) window.requestAnimationFrame(renderAll);
    });

    const previousRender = typeof renderQuestions === 'function' ? renderQuestions : null;
    if (previousRender && !window.__v51QuestionReviewRenderWrapped){
      window.__v51QuestionReviewRenderWrapped = true;
      renderQuestions = function(){
        const result = previousRender.apply(this,arguments);
        window.requestAnimationFrame(renderAll);
        return result;
      };
    }

    const cards = document.getElementById('questions-cards');
    if (cards && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(()=>window.requestAnimationFrame(renderAll));
      observer.observe(cards,{childList:true});
    }
    renderAll();
  }

  const api = Object.freeze({
    REVIEW_STATES,
    normalizeReviewStatus,
    buildReviewPlan,
    confirmationText,
    reviewStats,
    unresolvedSelectedRows,
    renderAll
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51QuestionReviewWorkflow',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
