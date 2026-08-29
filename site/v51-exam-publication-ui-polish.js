/* V5.1B3 — Exam Settings presentation polish.
   Makes the guarded V5.1B3 layer visibly own the legacy V4.3D bulk controls
   once Exam Paper Publication Safety is active. No save or publication logic lives here. */
(() => {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__v51ExamPublicationUiPolishInstalled) return;
  window.__v51ExamPublicationUiPolishInstalled = true;

  const TOOLS_ID = 'v43d-exam-tools';
  const SUMMARY_ID = 'v51b3-exam-publication-summary';
  let queued = false;

  function safetyIsActive(){
    return !!(
      window.V51ExamPublicationSafety &&
      typeof window.loadExamSettingsEditor === 'function' &&
      window.loadExamSettingsEditor.name === 'hardenedLoadExamSettingsEditor'
    );
  }

  function setText(node,value){
    if (node && node.textContent !== value) node.textContent = value;
  }

  function upgradeExamSettingsPresentation(){
    if (!safetyIsActive()) return false;

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
      upgradeExamSettingsPresentation();
    },0);
  }

  window.V51ExamPublicationUiPolish = Object.freeze({
    safetyIsActive,
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
