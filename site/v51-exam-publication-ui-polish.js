/* V5.1B3 — Exam Settings presentation and entry-point ownership.
   Makes the guarded V5.1B3 layer visibly own the legacy V4.3D bulk controls
   and ensures every Exam Settings open/refresh runs the hardened B3 loader.
   Publication/save logic remains in v51-exam-publication-safety.js. */
(() => {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__v51ExamPublicationUiPolishInstalled) return;
  window.__v51ExamPublicationUiPolishInstalled = true;

  const TOOLS_ID = 'v43d-exam-tools';
  const SUMMARY_ID = 'v51b3-exam-publication-summary';
  const REFRESH_ID = 'refresh-exam-settings';
  const PANEL_ID = 'exam-settings-panel';
  let queued = false;
  let loadBusy = false;

  function guardedLoader(){
    const fn = window.loadExamSettingsEditor;
    return typeof fn === 'function' && fn.name === 'hardenedLoadExamSettingsEditor' ? fn : null;
  }

  function safetyIsActive(){
    return !!(window.V51ExamPublicationSafety && guardedLoader());
  }

  function setText(node,value){
    if (node && node.textContent !== value) node.textContent = value;
  }

  function activateExamSettingsPanel(tab){
    document.querySelectorAll('.tab').forEach(node=>node.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(node=>node.classList.remove('active'));
    if (tab) tab.classList.add('active');
    document.getElementById(PANEL_ID)?.classList.add('active');
  }

  async function runGuardedLoad(){
    const loader = guardedLoader();
    if (!loader || loadBusy) return false;
    loadBusy = true;
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.dataset.v51b3LoadState = 'loading';
    try {
      await loader();
      if (panel) panel.dataset.v51b3LoadState = 'ready';
      upgradeExamSettingsPresentation();
      return true;
    } catch (error){
      if (panel) panel.dataset.v51b3LoadState = 'error';
      const feedback = document.getElementById('exam-settings-feedback');
      if (feedback){
        feedback.className = 'feedback incorrect';
        feedback.textContent = `Could not load guarded Exam Settings. ${error?.message || String(error)}`.trim();
      }
      console.error('V5.1B3 guarded Exam Settings load failed.',error);
      return false;
    } finally {
      loadBusy = false;
    }
  }

  function wireGuardedEntryPoints(){
    if (!safetyIsActive()) return false;

    const refresh = document.getElementById(REFRESH_ID);
    if (refresh && refresh.dataset.v51b3EntryGuard !== '1'){
      refresh.dataset.v51b3EntryGuard = '1';
      refresh.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        runGuardedLoad();
      },true);
    }

    const tab = document.querySelector(`.tab[data-panel="${PANEL_ID}"]`);
    if (tab && tab.dataset.v51b3EntryGuard !== '1'){
      tab.dataset.v51b3EntryGuard = '1';
      tab.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        activateExamSettingsPanel(tab);
        runGuardedLoad();
      },true);
    }

    return !!(refresh || tab);
  }

  function upgradeExamSettingsPresentation(){
    if (!safetyIsActive()) return false;

    wireGuardedEntryPoints();

    const tools = document.getElementById(TOOLS_ID);
    if (!tools) return false;

    tools.dataset.v51b3Presentation = '1';
    setText(tools.querySelector('.v43d-head h3'),'Manage exam papers safely');
    setText(
      tools.querySelector('.v43d-head .help'),
      'Filter papers, select several, then apply shared settings. Publishing is protected by V5.1B3 server readiness checks.'
    );

    const badge = tools.querySelector('.v43d-head .tag');
    if (badge){
      setText(badge,'V5.1B3');
      badge.title = 'Exam Paper Publication Safety';
      badge.setAttribute('aria-label','V5.1B3 Exam Paper Publication Safety');
    }

    const summary = document.getElementById(SUMMARY_ID);
    if (summary && summary.nextElementSibling !== tools){
      tools.insertAdjacentElement('beforebegin',summary);
    }

    return true;
  }

  function schedule(){
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      wireGuardedEntryPoints();
      upgradeExamSettingsPresentation();
    },0);
  }

  window.V51ExamPublicationUiPolish = Object.freeze({
    safetyIsActive,
    guardedLoader,
    runGuardedLoad,
    wireGuardedEntryPoints,
    upgradeExamSettingsPresentation
  });

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  } else {
    schedule();
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
