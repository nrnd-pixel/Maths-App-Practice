/* V5.2A — Topical Exercise Activation Guard.
   Keeps staged topical_exercise rows inactive until the dedicated student topical
   library exists. This is presentation/safety interception only: no database writes. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v52TopicalActivationGuardInstalled) return;
  if (typeof window !== 'undefined') window.__v52TopicalActivationGuardInstalled = true;

  const TOPICAL_SOURCE_TYPE = 'topical_exercise';
  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase();
  const isTopical = row => norm(row?.source_type) === TOPICAL_SOURCE_TYPE;

  function currentQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function rowById(id,rows=currentQuestions()){
    return Array.from(rows || []).find(row => String(row?.id) === String(id)) || null;
  }

  function selectedTopicalRows(rows=currentQuestions(),checkedIds=null){
    let ids = checkedIds;
    if (!ids && typeof document !== 'undefined'){
      ids = [...document.querySelectorAll('.v51b2a-select:checked')]
        .map(input => String(input.dataset.id || ''))
        .filter(Boolean);
    }
    const selected = new Set(Array.from(ids || []).map(String));
    return Array.from(rows || []).filter(row => selected.has(String(row?.id)) && isTopical(row) && row?.active === false);
  }

  function blockedIndividualActivation(target,rows=currentQuestions()){
    const button = target?.closest?.('.toggle-q');
    if (!button || button.dataset.active !== 'false') return null;
    const row = rowById(button.dataset.id,rows);
    return row && isTopical(row) && row.active === false ? row : null;
  }

  function blockMessage(count=1){
    return count === 1
      ? 'This topical exercise is staged safely and must remain inactive in V5.2A. Student exposure will be enabled only through the later dedicated Topical Practice library.'
      : `${count} selected topical exercises are staged safely and must remain inactive in V5.2A. Deselect them before activating other questions.`;
  }

  function guardClick(event){
    const individual = blockedIndividualActivation(event.target);
    if (individual){
      event.preventDefault();
      event.stopImmediatePropagation();
      window.alert(blockMessage(1));
      return;
    }

    const bulk = event.target?.closest?.('#v51b2a-activate');
    if (!bulk) return;
    const topical = selectedTopicalRows();
    if (!topical.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.alert(blockMessage(topical.length));
  }

  function decorate(){
    if (typeof document === 'undefined') return;
    const rows = currentQuestions();
    const byId = new Map(rows.map(row => [String(row?.id),row]));

    document.querySelectorAll('#questions-cards .toggle-q[data-active="false"]').forEach(button => {
      const row = byId.get(String(button.dataset.id));
      if (!row || !isTopical(row) || row.active !== false) return;
      button.dataset.v52TopicalLocked = '1';
      button.textContent = 'Staged — inactive';
      button.title = 'V5.2A keeps topical exercises inactive until the dedicated student Topical Practice library is released.';
      button.setAttribute('aria-label','Topical exercise staged and inactive');
    });

    const selected = selectedTopicalRows(rows);
    const bulk = document.getElementById('v51b2a-activate');
    if (bulk){
      if (selected.length){
        bulk.dataset.v52TopicalBlocked = '1';
        bulk.title = blockMessage(selected.length);
      } else if (bulk.dataset.v52TopicalBlocked === '1'){
        delete bulk.dataset.v52TopicalBlocked;
        bulk.removeAttribute('title');
      }
    }
  }

  function scheduleDecorate(){
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(decorate);
  }

  function wire(){
    if (typeof document === 'undefined') return;
    document.addEventListener('click',guardClick,true);
    document.addEventListener('change',event => {
      if (event.target?.matches?.('.v51b2a-select')) scheduleDecorate();
    });
    decorate();
  }

  const api = Object.freeze({
    TOPICAL_SOURCE_TYPE,
    isTopical,
    rowById,
    selectedTopicalRows,
    blockedIndividualActivation,
    blockMessage,
    decorate
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V52TopicalActivationGuard',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();