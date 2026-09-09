/* Phase 4 — V54 Resource Bank bulk consolidated owner.
   Preserves the accepted V5.4E → V5.4F sequence exactly. */

/* V5.4E — Bulk Practice eligibility controls.
   Reuses the established V5.1 Question Bank selection and V5.3D1 logical-question
   identity. One teacher RPC applies the whole bulk change atomically. Topical rows
   remain whole-set managed, multipart logical questions remain all-or-none, legacy
   active is untouched, and student Practice / Exam behavior is unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54eBulkPracticeEligibilityInstalled) return;
  ROOT.__v54eBulkPracticeEligibilityInstalled = true;

  const PANEL_ID = 'v54e-bulk-practice-eligibility';
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  let busy = false;

  function isTopical(row){ return norm(row?.source_type) === 'topical_exercise'; }
  function isEligible(row){ return row?.practice_eligible === true; }

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function bulkSelectionApi(){
    try { return ROOT.V51QuestionBankBulkStatus || null; } catch { return null; }
  }

  function logicalQuestionKey(row){
    try {
      const fn = ROOT.V53D1TeacherPracticePoolAlignment?.logicalQuestionKey;
      return typeof fn === 'function' ? String(fn(row) || '') : '';
    } catch { return ''; }
  }

  function selectedRows(rows=currentQuestions()){
    try {
      const selection = bulkSelectionApi()?.buildPlan?.(rows,undefined,false)?.selected;
      return Array.isArray(selection) ? selection.slice() : [];
    } catch { return []; }
  }

  function buildPlan(rows=currentQuestions(),selected=selectedRows(rows),target=true,keyFn=logicalQuestionKey){
    const allRows = Array.from(rows || []);
    const selectedList = Array.from(selected || []);
    const topical = selectedList.filter(isTopical);
    const nonTopical = selectedList.filter(row => !isTopical(row));
    const allByKey = new Map();

    for (const row of allRows){
      if (isTopical(row)) continue;
      const key = String(keyFn(row) || '');
      if (!key) continue;
      if (!allByKey.has(key)) allByKey.set(key,[]);
      allByKey.get(key).push(row);
    }

    const selectedByKey = new Map();
    for (const row of nonTopical){
      const key = String(keyFn(row) || '');
      if (!key) continue;
      if (!selectedByKey.has(key)) selectedByKey.set(key,row);
    }

    const groups = [...selectedByKey.entries()].map(([key,representative])=>({
      key,
      representative,
      rows:(allByKey.get(key) || [representative]).slice()
    }));
    const changingGroups = groups.filter(group => group.rows.some(row => isEligible(row) !== !!target));
    const logicalRows = groups.reduce((sum,group)=>sum+group.rows.length,0);
    const changingRows = changingGroups.reduce((sum,group)=>sum+group.rows.filter(row=>isEligible(row)!==!!target).length,0);

    return Object.freeze({
      target:!!target,
      selected:Object.freeze(selectedList.slice()),
      topical:Object.freeze(topical.slice()),
      logicalQuestions:groups.length,
      logicalRows,
      changingLogicalQuestions:changingGroups.length,
      changingRows,
      representativeIds:Object.freeze(groups.map(group=>group.representative?.id).filter(Boolean)),
      keyReady:nonTopical.length === 0 || groups.length > 0,
      canRun:selectedList.length > 0 && topical.length === 0 && groups.length > 0 && changingRows > 0
    });
  }

  function teacherRpcReady(){
    try { return !!(cloudReady && teacherUser && cloud && typeof cloud.rpc === 'function'); }
    catch { return false; }
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById(PANEL_ID);
    if (root) return root;
    const bulk = document.getElementById('v51b2a-bulk-status');
    if (!bulk) return null;

    root = document.createElement('div');
    root.id = PANEL_ID;
    root.style.marginTop = '12px';
    root.style.paddingTop = '10px';
    root.style.borderTop = '1px solid var(--border)';
    root.innerHTML = `
      <div class="header" style="align-items:center;gap:10px">
        <div>
          <strong>Practice resource bank</strong>
          <div class="help">Use the same Question Bank selection to add or remove non-topical logical questions from ordinary Practice.</div>
        </div>
      </div>
      <div class="toolbar" style="margin-top:8px">
        <button id="v54e-add-practice" class="outline" type="button">Add selected to Practice</button>
        <button id="v54e-remove-practice" class="warning" type="button">Remove selected from Practice</button>
      </div>
      <div id="v54e-practice-summary" class="help" style="margin-top:8px">0 selected</div>
      <div id="v54e-practice-feedback" class="feedback hidden" role="status" aria-live="polite"></div>`;
    bulk.appendChild(root);
    return root;
  }

  function setFeedback(kind,message){
    const root = document.getElementById('v54e-practice-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = String(message || '');
  }

  function clearFeedback(){
    const root = document.getElementById('v54e-practice-feedback');
    if (!root) return;
    root.className = 'feedback hidden';
    root.textContent = '';
  }

  function summaryText(plan,rpcReady=teacherRpcReady()){
    if (!plan.selected.length) return '0 selected • use the existing Question Bank Select checkboxes';
    if (plan.topical.length){
      return `${plan.selected.length} selected • ${plan.topical.length} topical row${plan.topical.length===1?'':'s'} selected • topical Practice is managed by whole resource set`;
    }
    if (!plan.keyReady) return `${plan.selected.length} selected • logical-question grouping is still loading`;
    const parts = [
      `${plan.selected.length} selected row${plan.selected.length===1?'':'s'}`,
      `${plan.logicalQuestions} logical question${plan.logicalQuestions===1?'':'s'}`,
      `${plan.logicalRows} physical row${plan.logicalRows===1?'':'s'} after multipart expansion`
    ];
    if (!rpcReady) parts.push('teacher cloud write unavailable');
    return parts.join(' • ');
  }

  function render(){
    if (!ensurePanel()) return null;
    const rows = currentQuestions();
    const selected = selectedRows(rows);
    const add = buildPlan(rows,selected,true);
    const remove = buildPlan(rows,selected,false);
    const rpcReady = teacherRpcReady();
    const summary = document.getElementById('v54e-practice-summary');
    const addBtn = document.getElementById('v54e-add-practice');
    const removeBtn = document.getElementById('v54e-remove-practice');

    if (summary) summary.textContent = summaryText(add,rpcReady);
    if (addBtn){
      addBtn.disabled = busy || !rpcReady || !add.canRun;
      addBtn.textContent = add.changingLogicalQuestions
        ? `Add ${add.changingLogicalQuestions} to Practice`
        : 'Add selected to Practice';
    }
    if (removeBtn){
      removeBtn.disabled = busy || !rpcReady || !remove.canRun;
      removeBtn.textContent = remove.changingLogicalQuestions
        ? `Remove ${remove.changingLogicalQuestions} from Practice`
        : 'Remove selected from Practice';
    }
    return {add,remove,rpcReady};
  }

  function confirmationText(plan){
    const action = plan.target ? 'Add' : 'Remove';
    const direction = plan.target ? 'to' : 'from';
    return [
      `${action} ${plan.changingLogicalQuestions} logical question${plan.changingLogicalQuestions===1?'':'s'} ${direction} ordinary Practice?`,
      '',
      `${plan.changingRows} physical row${plan.changingRows===1?'':'s'} will change after multipart expansion.`,
      'All parts of a multipart logical question stay together.',
      'Only practice_eligible changes; legacy active remains unchanged.',
      'Topical resource questions cannot be changed here.'
    ].join('\n');
  }

  async function runBulk(target){
    if (busy) return;
    const rows = currentQuestions();
    const plan = buildPlan(rows,selectedRows(rows),!!target);

    if (!teacherRpcReady()){
      setFeedback('incorrect','Bulk Practice changes require Teacher cloud access.');
      return;
    }
    if (plan.topical.length){
      setFeedback('incorrect','Deselect topical rows first. Topical Practice eligibility is managed for whole sets in the Topical Exercise Resource Library.');
      return;
    }
    if (!plan.keyReady || !plan.logicalQuestions){
      setFeedback('incorrect','Logical-question grouping is not ready. Refresh the Question Bank and try again.');
      return;
    }
    if (!plan.changingRows){
      setFeedback('try',`The selected logical questions are already ${target?'in':'out of'} Practice.`);
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm(confirmationText(plan))) return;

    busy = true;
    render();
    setFeedback('try',`${target?'Adding':'Removing'} ${plan.changingLogicalQuestions} logical question${plan.changingLogicalQuestions===1?'':'s'}…`);
    try {
      const {data,error} = await cloud.rpc('save_questions_practice_eligibility_v54e',{
        p_question_ids:plan.representativeIds,
        p_eligible:!!target
      });
      if (error) throw error;
      const result = data || {};
      const logical = Number(result.logical_questions || plan.logicalQuestions) || plan.logicalQuestions;
      const updated = Number(result.updated_rows ?? plan.changingRows);
      try { bulkSelectionApi()?.clearSelection?.(); } catch {}
      if (typeof loadTeacher === 'function') await loadTeacher();
      setFeedback('correct',`${target?'Added':'Removed'} ${logical} logical question${logical===1?'':'s'} ${target?'to':'from'} Practice (${updated} physical row${updated===1?'':'s'} changed).`);
    } catch(error){
      console.warn('V5.4E bulk Practice eligibility update failed.',error);
      setFeedback('incorrect',`Bulk Practice availability could not be changed. ${error?.message||''}`.trim());
    } finally {
      busy = false;
      scheduleRender();
    }
  }

  function scheduleRender(){
    if (typeof window === 'undefined') return;
    [0,60,180,500].forEach(delay=>window.setTimeout(render,delay));
  }

  function wire(){
    if (typeof document === 'undefined') return;
    ensurePanel();
    render();

    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#v54e-add-practice')){
        event.preventDefault();
        void runBulk(true);
        return;
      }
      if (event.target?.closest?.('#v54e-remove-practice')){
        event.preventDefault();
        void runBulk(false);
        return;
      }
      if (event.target?.closest?.('#v51b2a-select-visible,#v51b2a-clear-selection,#v52b1-question-pagination button,.v54b-practice-toggle,.tab[data-panel="questions-panel"],#v52b-refresh')){
        scheduleRender();
      }
    });

    document.addEventListener('change',event=>{
      if (event.target?.matches?.('.v51b2a-select') || event.target?.closest?.('#questions-panel')) scheduleRender();
    });
    document.addEventListener('input',event=>{
      if (event.target?.closest?.('#questions-panel')) scheduleRender();
    });
    [80,220,600].forEach(delay=>window.setTimeout(render,delay));
  }

  const api = Object.freeze({
    isTopical,
    isEligible,
    logicalQuestionKey,
    selectedRows,
    buildPlan,
    summaryText,
    confirmationText
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54EBulkPracticeEligibility',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.4F — Bulk selection scope safety.
   Locks Question Bank search/filter and topical-set scope while the established V5.1
   bulk selection is non-empty, preventing hidden/stale rows from remaining armed for
   bulk status, metadata, review or Practice actions. No database or student behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54fBulkSelectionScopeSafetyInstalled) return;
  ROOT.__v54fBulkSelectionScopeSafetyInstalled = true;

  const NOTICE_ID = 'v54f-selection-scope-safety';
  const STYLE_ID = 'v54f-selection-scope-safety-style';
  const LOCK_TITLE = 'Clear the current Question Bank selection before changing this scope.';
  const FILTER_IDS = Object.freeze([
    'question-search','question-year','question-strand','question-exam-year','question-paper','question-status',
    'v51b1-qa-filter','v51b1-source-filter','v51b2c-review-filter','v54a-eligibility-filter'
  ]);
  const SCOPE_BUTTON_SELECTOR = '.v52b-view,.v52b-select,#v52b-clear-focus';

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function bulkApi(){
    try { return ROOT.V51QuestionBankBulkStatus || null; } catch { return null; }
  }

  function selectionCount(rows=currentQuestions()){
    try {
      const selected = bulkApi()?.buildPlan?.(rows,undefined,false)?.selected;
      return Array.isArray(selected) ? selected.length : 0;
    } catch { return 0; }
  }

  function lockModel(count=0){
    const safeCount = Math.max(0,Number(count) || 0);
    return Object.freeze({
      locked:safeCount > 0,
      count:safeCount,
      message:safeCount > 0
        ? `${safeCount} selected. Clear selection before changing Question Bank filters/search or switching topical set scope.`
        : 'Bulk selection safety: Question Bank filters and topical set scope lock while questions are selected.'
    });
  }

  function ensureStyle(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #questions-panel.v54f-selection-locked ${SCOPE_BUTTON_SELECTOR}{opacity:.55;cursor:not-allowed}
      #${NOTICE_ID}{margin-top:8px}
    `;
    document.head.appendChild(style);
  }

  function ensureNotice(){
    if (typeof document === 'undefined') return null;
    ensureStyle();
    let root = document.getElementById(NOTICE_ID);
    if (root) return root;
    const summary = document.getElementById('v51b2a-summary');
    const bulk = document.getElementById('v51b2a-bulk-status');
    if (!summary && !bulk) return null;
    root = document.createElement('div');
    root.id = NOTICE_ID;
    root.className = 'help';
    if (summary) summary.insertAdjacentElement('afterend',root);
    else bulk.appendChild(root);
    return root;
  }

  function rememberAndLockControl(node){
    if (!node) return;
    if (node.dataset.v54fScopeLocked !== '1'){
      node.dataset.v54fScopeLocked = '1';
      node.dataset.v54fPrevDisabled = node.disabled ? '1' : '0';
      node.dataset.v54fPrevTitle = node.hasAttribute('title') ? node.getAttribute('title') : '__none__';
    }
    node.disabled = true;
    node.title = LOCK_TITLE;
  }

  function restoreControl(node){
    if (!node || node.dataset.v54fScopeLocked !== '1') return;
    node.disabled = node.dataset.v54fPrevDisabled === '1';
    const previousTitle = node.dataset.v54fPrevTitle;
    if (previousTitle === '__none__') node.removeAttribute('title');
    else node.setAttribute('title',previousTitle || '');
    delete node.dataset.v54fScopeLocked;
    delete node.dataset.v54fPrevDisabled;
    delete node.dataset.v54fPrevTitle;
  }

  function decorateScopeButtons(locked){
    if (typeof document === 'undefined') return;
    document.querySelectorAll(SCOPE_BUTTON_SELECTOR).forEach(button=>{
      if (locked){
        if (button.dataset.v54fPrevScopeTitle === undefined){
          button.dataset.v54fPrevScopeTitle = button.hasAttribute('title') ? button.getAttribute('title') : '__none__';
        }
        button.setAttribute('aria-disabled','true');
        button.title = LOCK_TITLE;
      } else {
        button.removeAttribute('aria-disabled');
        if (button.dataset.v54fPrevScopeTitle !== undefined){
          const previousTitle = button.dataset.v54fPrevScopeTitle;
          if (previousTitle === '__none__') button.removeAttribute('title');
          else button.setAttribute('title',previousTitle || '');
          delete button.dataset.v54fPrevScopeTitle;
        }
      }
    });
  }

  function renderLock(){
    if (typeof document === 'undefined') return lockModel(0);
    const model = lockModel(selectionCount());
    const panel = document.getElementById('questions-panel');
    panel?.classList?.toggle('v54f-selection-locked',model.locked);

    FILTER_IDS.forEach(id=>{
      const node = document.getElementById(id);
      if (model.locked) rememberAndLockControl(node);
      else restoreControl(node);
    });
    decorateScopeButtons(model.locked);

    const notice = ensureNotice();
    if (notice){
      notice.innerHTML = model.locked
        ? `<strong>Selection scope locked.</strong> ${model.message}`
        : model.message;
    }
    return model;
  }

  function setGuardMessage(message){
    const notice = ensureNotice();
    if (!notice) return;
    notice.innerHTML = `<strong>Selection scope locked.</strong> ${String(message || LOCK_TITLE)}`;
  }

  function clearViaEstablishedControl(){
    if (!selectionCount()) return false;
    const button = typeof document !== 'undefined' ? document.getElementById('v51b2a-clear-selection') : null;
    if (button && !button.disabled){
      button.click();
      return true;
    }
    try {
      bulkApi()?.clearSelection?.();
      return true;
    } catch { return false; }
  }

  function scheduleRender(){
    if (typeof window === 'undefined') return;
    [0,60,180,500].forEach(delay=>window.setTimeout(renderLock,delay));
  }

  function wire(){
    if (typeof document === 'undefined') return;
    ensureNotice();
    renderLock();

    document.addEventListener('click',event=>{
      const count = selectionCount();
      const tab = event.target?.closest?.('.tab[data-panel]');
      if (tab && tab.dataset.panel !== 'questions-panel' && count > 0){
        clearViaEstablishedControl();
        scheduleRender();
        return;
      }

      const scopeButton = event.target?.closest?.(SCOPE_BUTTON_SELECTOR);
      if (scopeButton && count > 0){
        event.preventDefault();
        event.stopImmediatePropagation();
        setGuardMessage('Clear the current selection before viewing, selecting or leaving a topical resource-set scope.');
        scheduleRender();
      }
    },true);

    document.addEventListener('click',event=>{
      if (event.target?.closest?.(
        '#v51b2a-select-visible,#v51b2a-clear-selection,#v51b2a-activate,#v51b2a-deactivate,'+
        '#v51b2b-apply,#v51b2c-apply,#v54e-add-practice,#v54e-remove-practice,.v52b-select,.v52b-view,#v52b-clear-focus'
      )) scheduleRender();
    });

    document.addEventListener('change',event=>{
      if (event.target?.matches?.('.v51b2a-select')) scheduleRender();
    });

    [80,220,600].forEach(delay=>window.setTimeout(renderLock,delay));
  }

  const api = Object.freeze({
    FILTER_IDS,
    SCOPE_BUTTON_SELECTOR,
    selectionCount,
    lockModel
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54FBulkSelectionScopeSafety',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
