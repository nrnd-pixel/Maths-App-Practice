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
  const BANNER_ID = 'v59-student-home-preview-banner';
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

      /* Stage 1.1 — make the V5.9 student experience the visible app shell. */
      html[data-v59-student-home-preview="true"] body.v59-preview-home-ready{background:#f4f8ff}
      html[data-v59-student-home-preview="true"][data-theme="dark"] body.v59-preview-home-ready{background:#0d1729}
      html[data-v59-student-home-preview="true"] body.v59-preview-home-ready>.shell{
        width:min(1180px,100%);margin:0 auto;padding:0 18px 98px
      }
      html[data-v59-student-home-preview="true"] body.v59-preview-home-ready .app-theme-bar,
      html[data-v59-student-home-preview="true"] body.v59-preview-home-ready #start>.header,
      html[data-v59-student-home-preview="true"] body.v59-preview-home-ready #start .v39-teacher-zone,
      html[data-v59-student-home-preview="true"] body.v59-preview-home-ready #start>.info{
        display:none!important
      }
      html[data-v59-student-home-preview="true"] body.v59-preview-home-ready #start.card{
        background:transparent!important;border:0!important;border-radius:0!important;
        box-shadow:none!important;padding:0!important;overflow:visible!important
      }

      /* Keep the safety marker without letting it cut through student content. */
      #${BANNER_ID}{
        position:fixed!important;top:max(8px,env(safe-area-inset-top));right:10px;left:auto;z-index:10020;
        width:max-content;max-width:120px;margin:0!important;padding:5px 8px!important;border-radius:999px!important;
        background:rgba(255,247,216,.94)!important;border:1px solid #e9c95d!important;color:#6e5510!important;
        font-size:9px!important;font-weight:900!important;line-height:1.1!important;letter-spacing:.04em;text-align:center;
        box-shadow:0 4px 16px rgba(74,57,10,.1);pointer-events:none
      }

      /* Bring the concept hierarchy closer to the approved student UI. */
      #${HOME_ID} .v59-avatar{width:68px;height:68px;border-radius:23px;font-size:25px}
      #${HOME_ID} .v59-path{font-size:15px}
      #${HOME_ID} .v59-path-icon{width:54px;height:54px;border-radius:17px;font-size:25px}
      #${HOME_ID} .v59-badge-mark{width:84px;height:92px;font-size:32px}
      #${HOME_ID} .v59e-badge-card{position:relative;overflow:hidden}
      #${HOME_ID} .v59e-badge-card:after{content:'✦';position:absolute;right:18px;bottom:15px;color:#d9c8ff;font-size:34px;opacity:.55;pointer-events:none}
      #${HOME_ID} .v59e-earned{display:inline-flex;margin-top:7px;padding:4px 9px;border-radius:999px;background:#f2ebff;color:#6336bb;font-size:10px;font-weight:900}
      #${HOME_ID} .v59e-mission-complete .v59-mission-stat{color:#087657;font-size:19px}
      #${HOME_ID} .v59-challenge .v59-soft-icon{width:54px;height:54px;font-size:25px}

      /* The concept cards stay colourful in dark mode; fix surrounding text contrast. */
      html[data-theme="dark"] #${HOME_ID} .v59-section-head h2,
      html[data-theme="dark"] #${HOME_ID} .v59-desktop-brand>strong{color:#f3f6ff}
      html[data-theme="dark"] #${HOME_ID} .v59-desktop-brand small{color:#b6c3d8}
      html[data-theme="dark"] #${HOME_ID} .v59-bottom button:not([data-v59-action="home"]){color:#d0d8e8}
      @media(min-width:980px){
        html[data-theme="dark"] #${HOME_ID} .v59-bottom button:not([data-v59-action="home"]){background:rgba(255,255,255,.04)}
      }
      @media(max-width:979px){
        html[data-theme="dark"] #${HOME_ID} .v59-bottom button:not([data-v59-action="home"]){color:#65718a}
      }
      @media(max-width:620px){
        html[data-v59-student-home-preview="true"] body.v59-preview-home-ready>.shell{padding-left:14px;padding-right:14px}
        #${HOME_ID} .v59-avatar{width:60px;height:60px;border-radius:21px;font-size:22px}
        #${HOME_ID} .v59-path-icon{width:49px;height:49px;font-size:22px}
        #${HOME_ID} .v59-path{font-size:13px}
      }

      /* Appearance is now controlled from the V5.9 Settings screen. */
      #${EXPERIENCE_ID} .v59e-theme-row .v59d-list-icon{background:#edf3ff;color:#315eaa}
      #${EXPERIENCE_ID} .v59e-theme-row button{min-width:96px}
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

  function patchPreviewBanner(){
    const banner = document.getElementById(BANNER_ID);
    if (!banner) return;
    if (banner.textContent.trim() !== 'TEST PREVIEW') banner.textContent = 'TEST PREVIEW';
    banner.setAttribute('aria-label','V5.9 test preview, not production');
    banner.setAttribute('title','V5.9 test preview · Real V5.8 student data · Not production');
  }

  function patchHomeConceptDetails(){
    const home = document.getElementById(HOME_ID);
    if (!home) return;

    const cards = [...home.querySelectorAll('.v59-card')];
    const mission = cards.find(card => card.querySelector('.v59-card-head h2')?.textContent.trim() === 'Weekly missions');
    if (mission) {
      const count = mission.querySelector('.v59-progress-caption strong')?.textContent.trim() || '';
      const parts = count.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (parts && Number(parts[2]) > 0 && Number(parts[1]) >= Number(parts[2])) {
        mission.classList.add('v59e-mission-complete');
        const stat = mission.querySelector('.v59-mission-stat');
        if (stat) stat.textContent = '🎉 Weekly Missions Complete!';
        const note = mission.querySelector('.v59-note');
        if (note) note.textContent = 'Great work — keep practising to build your streak.';
      }
    }

    const badge = cards.find(card => card.querySelector('.v59-card-head h2')?.textContent.trim() === 'Latest badge');
    if (badge) {
      badge.classList.add('v59e-badge-card');
      const title = badge.querySelector('.v59-compact-main h3')?.textContent.trim() || '';
      const copy = badge.querySelector('.v59-compact-main');
      if (copy && title && !/no badge|locked|not earned/i.test(title) && !copy.querySelector('.v59e-earned')) {
        const earned = document.createElement('span');
        earned.className = 'v59e-earned';
        earned.textContent = 'You earned this!';
        copy.insertBefore(earned, copy.querySelector('p'));
      }
    }

    const challenge = cards.find(card => card.querySelector('.v59-card-head h2')?.textContent.trim() === 'Class challenge');
    const challengeIcon = challenge?.querySelector('.v59-soft-icon');
    if (challengeIcon && challengeIcon.textContent.trim() === '🤝') challengeIcon.textContent = '🏆';
  }

  function currentThemeLabel(){
    const explicit = document.documentElement.dataset.theme;
    if (explicit === 'dark') return 'Dark';
    if (explicit === 'light') return 'Light';
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'System · Dark' : 'System · Light'; }
    catch { return 'System'; }
  }

  function useExistingThemeToggle(){
    const target = document.getElementById('theme-toggle');
    if (!target || target.disabled) return;
    target.click();
    window.setTimeout(() => {
      const button = document.querySelector(`#${EXPERIENCE_ID} [data-v59e-theme-toggle]`);
      if (button) button.textContent = currentThemeLabel();
    }, 0);
  }

  function patchAppearanceSetting(){
    const root = document.getElementById(EXPERIENCE_ID);
    if (!root) return;
    const heading = root.querySelector('.v59d-head h1');
    if (heading?.textContent.trim() !== 'Settings') return;
    const card = root.querySelector('.v59d-card');
    if (!card) return;

    let row = card.querySelector('[data-v59e-theme-row]');
    if (!row) {
      row = document.createElement('div');
      row.className = 'v59d-setting v59e-theme-row';
      row.dataset.v59eThemeRow = '1';
      row.innerHTML = '<div style="display:flex;align-items:center;gap:12px"><span class="v59d-list-icon" aria-hidden="true">◐</span><div><strong>Appearance</strong><div class="v59d-muted">Switch between the app’s existing light and dark themes.</div></div></div><button type="button" class="v59d-toggle" data-v59e-theme-toggle></button>';
      const note = card.querySelector('p.v59d-muted');
      if (note) card.insertBefore(row, note);
      else card.appendChild(row);
      row.querySelector('[data-v59e-theme-toggle]')?.addEventListener('click', useExistingThemeToggle);
    }
    const button = row.querySelector('[data-v59e-theme-toggle]');
    if (button) button.textContent = currentThemeLabel();
  }

  function polish(){
    injectStyles();
    patchQuizLabel();
    patchMore();
    patchProgressLabels();
    patchPreviewBanner();
    patchHomeConceptDetails();
    patchAppearanceSetting();
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
      observer.observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['class','data-theme'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once:true });
  else wire();
})();