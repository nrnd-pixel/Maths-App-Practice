/* V5.6.1 — Practice-first student experience.
   Temporarily removes the student Exam entry point while retaining the complete
   Exam engine, publication controls, attempts and historical results as a rollback
   boundary. Students are always returned to Practice before the main Start action.
   No database, grading, authentication, question or Exam data changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v561PracticeFirstStudentExperienceInstalled) return;
  ROOT.__v561PracticeFirstStudentExperienceInstalled = true;

  const STYLE_ID = 'v561-practice-first-style';
  const NOTICE_ATTR = 'v561PracticeFirstNotice';
  const PRACTICE_NOTE = 'Practice Mode is active. Choose Mixed, Topic or Past Paper Practice below.';

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .mode-switch{display:none!important}
      #exam-mode-btn,
      #exam-year-wrap,
      #exam-paper-wrap,
      #exam-paper-note,
      #exam-instructions,
      #v51c1-exam-paper-library,
      #v51c2-exam-resume-status{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function hideExamSurface(){
    if (typeof document === 'undefined') return;

    const modeSwitch = document.querySelector('#start .mode-switch');
    if (modeSwitch){
      modeSwitch.hidden = true;
      modeSwitch.setAttribute('aria-hidden','true');
      modeSwitch.classList.add('v561-practice-first');
    }

    const examButton = document.getElementById('exam-mode-btn');
    if (examButton){
      examButton.hidden = true;
      examButton.classList.remove('active');
      examButton.setAttribute('aria-hidden','true');
      examButton.tabIndex = -1;
    }

    [
      'exam-year-wrap',
      'exam-paper-wrap',
      'exam-paper-note',
      'exam-instructions',
      'v51c1-exam-paper-library',
      'v51c2-exam-resume-status'
    ].forEach(id => {
      const node = document.getElementById(id);
      if (!node) return;
      node.hidden = true;
      node.classList.add('hidden');
      node.setAttribute('aria-hidden','true');
    });
  }

  function ensurePracticeSelection(){
    if (typeof document === 'undefined') return false;

    try {
      if (typeof ROOT.setStartMode === 'function') ROOT.setStartMode('practice');
      else if (typeof setStartMode === 'function') setStartMode('practice');
    } catch {}

    const practiceButton = document.getElementById('practice-mode-btn');
    const examButton = document.getElementById('exam-mode-btn');
    if (practiceButton && !practiceButton.classList.contains('active')){
      try { practiceButton.click(); } catch {}
    }
    practiceButton?.classList.add('active');
    examButton?.classList.remove('active');

    const note = document.getElementById('mode-note');
    if (note){
      note.textContent = PRACTICE_NOTE;
      note.dataset.v561PracticeFirst = '1';
    }

    const startButton = document.getElementById('start-btn');
    if (startButton && /exam/i.test(String(startButton.textContent || ''))){
      startButton.textContent = 'Start Practice';
      startButton.removeAttribute('aria-label');
    }

    return true;
  }

  function appendRolloutNotice(){
    if (typeof document === 'undefined') return false;
    const note = document.querySelector('#start > .info');
    if (!note) return false;
    if (note.dataset[NOTICE_ATTR] === '1') return true;

    const extra = document.createElement('div');
    extra.className = 'help';
    extra.style.marginTop = '8px';
    extra.innerHTML = '<strong>Practice-first rollout:</strong> Exam Mode is temporarily hidden while students explore Practice, Past Papers, assignments and progress. Existing Exam data and teacher publication controls are retained.';
    note.appendChild(extra);
    note.dataset[NOTICE_ATTR] = '1';
    return true;
  }

  function apply(){
    injectStyles();
    hideExamSurface();
    ensurePracticeSelection();
    if (typeof document !== 'undefined') document.documentElement.dataset.v561PracticeFirst = '1';
    return true;
  }

  function onCapture(event){
    const target = event.target;
    if (!target?.closest) return;

    if (target.closest('#exam-mode-btn, #v51c1-exam-paper-library, #v51c2-exam-resume-status')){
      event.preventDefault();
      event.stopImmediatePropagation();
      apply();
      return;
    }

    if (target.closest('#start-btn')){
      /* Capture runs before the core Start handler, so stale client mode cannot
         accidentally start an Exam while the student Exam entry point is hidden. */
      ensurePracticeSelection();
      hideExamSurface();
    }
  }

  function isPracticeFirst(){
    if (typeof document === 'undefined') return false;
    const examButton = document.getElementById('exam-mode-btn');
    const modeSwitch = document.querySelector('#start .mode-switch');
    const practiceButton = document.getElementById('practice-mode-btn');
    return document.documentElement.dataset.v561PracticeFirst === '1'
      && !!practiceButton?.classList.contains('active')
      && !!examButton?.hidden
      && !!modeSwitch?.hidden;
  }

  function wire(){
    if (typeof document === 'undefined') return;
    apply();
    if (typeof window !== 'undefined'){
      window.addEventListener('click',onCapture,true);
      window.addEventListener('pageshow',apply);
      window.addEventListener('focus',apply);
    }

    /* Finite follow-ups cover late student-shell and V5.6 stable identity work.
       The final pass appends the rollout note after the V5.6 identity reapply burst. */
    [0,100,300,800,1600,2300].forEach(delay => {
      window.setTimeout(() => {
        apply();
        if (delay === 2300) appendRolloutNotice();
      },delay);
    });
  }

  const api = Object.freeze({
    apply,
    hideExamSurface,
    ensurePracticeSelection,
    appendRolloutNotice,
    isPracticeFirst,
    PRACTICE_NOTE
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V561PracticeFirstStudentExperience',{
      value:api,
      writable:false,
      configurable:false
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();
