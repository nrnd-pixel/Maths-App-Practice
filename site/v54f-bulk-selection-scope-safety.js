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
