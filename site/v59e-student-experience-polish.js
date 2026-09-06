/* V5.9E Student Experience Polish — test-only safety and UX cleanup.
   Loaded only with ?v59-student-home-preview=1. This layer does not add any
   network, Supabase, grading or persistence path. It only hardens presentation
   labels and delegates actions back to the established V5.8 controls. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PARAM = 'v59-student-home-preview';
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get(PARAM) !== '1') return;
  if (ROOT.__v59eStudentExperiencePolishInstalled) return;
  ROOT.__v59eStudentExperiencePolishInstalled = true;

  const HOME_ID = 'v59-student-home-preview';
  const PRACTICE_ID = 'v59b-student-practice-preview';
  const EXPERIENCE_ID = 'v59d-student-experience-preview';
  const STYLE_ID = 'v59e-student-experience-polish-style';
  let timer = 0;
  let paperPending = false;

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${EXPERIENCE_ID} .v59e-signout{color:#8d312b}
      #${EXPERIENCE_ID} .v59e-signout .v59d-list-icon{background:#fff0ed;color:#9a342b}
      #v59d-quiz-save{white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function ensurePracticeMode(){
    const practice = document.getElementById('practice-mode-btn');
    if (practice && !practice.classList.contains('active')) practice.click();
  }

  function setPracticeType(type){
    try { ROOT.V55APastPaperPractice?.setPracticeType?.(type); } catch {}
  }

  function restoreAction(button, original){
    window.setTimeout(() => {
      if (button?.isConnected) button.dataset.v59Action = original;
    }, 0);
  }

  function prepareHomeLearn(button, type){
    if (!button) return false;
    ensurePracticeMode();
    setPracticeType(type);
    const original = button.dataset.v59Action || type;
    button.dataset.v59Action = 'learn';
    restoreAction(button, original);
    return true;
  }

  function closePracticePreview(){
    document.body.classList.remove('v59b-practice-open');
    document.getElementById(PRACTICE_ID)?.remove();
  }

  function openPreparedLearn(type){
    const button = document.querySelector(`#${HOME_ID} [data-v59-action="${type}"]`);
    if (button) {
      prepareHomeLearn(button, type);
      button.click();
      return true;
    }
    ensurePracticeMode();
    setPracticeType(type);
    const fallback = document.querySelector('#start .v57c-learn,[data-v40-nav="learn"]');
    if (fallback && !fallback.disabled && !fallback.classList.contains('hidden')) {
      fallback.click();
      return true;
    }
    return false;
  }

  function selectPaperWhenReady(yearValue, paperName, attempt = 0){
    const paper = document.getElementById('v55a-paper-name');
    const optionReady = paper && [...paper.options].some(option => option.value === paperName);
    if (optionReady) {
      paper.value = paperName;
      paper.dispatchEvent(new Event('change', { bubbles:true }));
      paperPending = false;
      closePracticePreview();
      window.setTimeout(() => openPreparedLearn('past_paper'), 0);
      return;
    }

    if (attempt >= 24) {
      paperPending = false;
      closePracticePreview();
      window.setTimeout(() => openPreparedLearn('past_paper'), 0);
      return;
    }

    window.setTimeout(() => selectPaperWhenReady(yearValue, paperName, attempt + 1), 120);
  }

  function beginPaperSelection(button){
    if (!button || paperPending) return;
    paperPending = true;
    ensurePracticeMode();
    setPracticeType('past_paper');

    const yearValue = String(button.dataset.v59bPaperYear || '');
    const paperName = String(button.dataset.v59bPaperName || '');
    const year = document.getElementById('v55a-paper-year');
    if (year && yearValue) {
      year.value = yearValue;
      year.dispatchEvent(new Event('change', { bubbles:true }));
    }

    try { ROOT.V55APastPaperPractice?.loadPaperLibrary?.(); } catch {}
    selectPaperWhenReady(yearValue, paperName, 0);
  }

  function capture(event){
    const mixed = event.target?.closest?.(`#${HOME_ID} [data-v59-action="mixed"]`);
    if (mixed) {
      prepareHomeLearn(mixed, 'mixed');
      return;
    }

    const paper = event.target?.closest?.(`#${PRACTICE_ID} .v59b-paper[data-v59b-paper-year]`);
    if (paper) {
      event.preventDefault();
      event.stopImmediatePropagation();
      beginPaperSelection(paper);
    }
  }

  function patchQuizLabel(){
    const button = document.getElementById('v59d-quiz-save');
    if (!button) return;
    if (button.textContent.trim() !== 'End & save') button.textContent = 'End & save';
    button.setAttribute('aria-label','End practice and save completed questions');
    button.setAttribute('title','End practice and save completed questions');
  }

  function logout(){
    const target = document.getElementById('v40c-student-logout');
    if (!target || target.disabled || target.classList.contains('hidden')) return;
    document.body.classList.remove('v59d-open');
    document.getElementById(EXPERIENCE_ID)?.remove();
    target.click();
  }

  function patchMore(){
    const root = document.getElementById(EXPERIENCE_ID);
    if (!root) return;
    const heading = root.querySelector('.v59d-head h1');
    if (heading?.textContent.trim() !== 'More') return;
    const list = root.querySelector('.v59d-list');
    if (!list || list.querySelector('[data-v59e-logout]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v59d-list-btn v59e-signout';
    button.dataset.v59eLogout = '1';
    button.innerHTML = '<span class="v59d-list-icon" aria-hidden="true">↪</span><span class="v59d-list-copy"><strong>Sign out</strong><span>Sign out of this student session</span></span><span aria-hidden="true">→</span>';
    button.addEventListener('click', logout);
    list.appendChild(button);
  }

  function patchProgressLabels(){
    const root = document.getElementById(EXPERIENCE_ID);
    if (!root) return;
    const heading = root.querySelector('.v59d-head h1');
    if (heading?.textContent.trim() !== 'Your progress') return;

    const ringLabel = root.querySelector('.v59d-progress-hero .v59d-ring small');
    if (ringLabel) {
      const current = ringLabel.textContent.trim();
      ringLabel.textContent = /unavailable/i.test(current) ? 'Latest score unavailable' : 'latest practice score';
    }

    const summary = root.querySelector('.v59d-progress-hero p.v59d-muted');
    if (summary) {
      summary.textContent = summary.textContent
        .replace(/latest visible Practice accuracy/gi, 'latest visible Practice score')
        .replace(/latest Practice accuracy/gi, 'latest Practice score');
    }
  }

  function polish(){
    injectStyles();
    patchQuizLabel();
    patchMore();
    patchProgressLabels();
  }

  function schedule(){
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => { timer = 0; polish(); }, 40);
  }

  function wire(){
    injectStyles();
    polish();
    window.addEventListener('click', capture, true);
    window.addEventListener('pageshow', schedule);
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => schedule());
      observer.observe(document.body, { subtree:true, childList:true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once:true });
  else wire();
})();