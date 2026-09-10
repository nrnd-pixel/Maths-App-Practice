/* V4.0B — Persistent student navigation.
   Option 2C keeps the navigation structure in source HTML and progressively
   enhances those exact nodes. Dynamic creation remains only as a compatibility
   fallback. Existing Home, Assignments, Progress and Reviewed Work controls,
   active-Practice protection and Exam behavior remain unchanged. */
(() => {
  'use strict';

  const STYLE_ID = 'v40-student-nav-style';

  const SCREEN_CONFIG = {
    start: 'home',
    quiz: 'learn',
    result: 'learn',
    'exam-result': 'learn',
    'student-assignments': 'assignments',
    'student-dashboard': 'progress',
    'student-review': 'reviewed'
  };

  const NAV_ITEMS = [
    { key: 'home', icon: '🏠', label: 'Home' },
    { key: 'learn', icon: '✏️', label: 'Learn', sourceId: 'start-btn' },
    { key: 'assignments', icon: '📚', label: 'Assignments', sourceId: 'my-assignments-btn' },
    { key: 'progress', icon: '📊', label: 'Progress', sourceId: 'my-progress-btn' },
    { key: 'reviewed', icon: '✅', label: 'Reviewed', sourceId: 'check-reviewed-btn' }
  ];

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .v40-student-nav{
        display:flex;
        gap:7px;
        align-items:center;
        overflow-x:auto;
        scrollbar-width:thin;
        margin:0 0 18px;
        padding:4px 2px 9px;
        border-bottom:1px solid var(--border);
      }

      .v40-student-nav button{
        flex:0 0 auto;
        display:inline-flex;
        align-items:center;
        gap:7px;
        min-height:42px;
        padding:8px 12px;
        border:1px solid transparent;
        border-radius:12px;
        background:transparent;
        color:var(--muted);
        font-size:13px;
        font-weight:820;
      }

      .v40-student-nav button:hover:not(:disabled){
        background:var(--soft);
        color:var(--text);
      }

      .v40-student-nav button[aria-current="page"]{
        background:var(--soft);
        color:var(--primary);
        border-color:color-mix(in srgb,var(--primary) 24%,var(--border));
      }

      .v40-student-nav button:disabled{
        opacity:.48;
        cursor:not-allowed;
      }

      .v40-student-nav-note{
        margin:-10px 0 16px;
        color:var(--muted);
        font-size:12px;
        line-height:1.45;
      }

      @media(max-width:620px){
        .v40-student-nav{
          margin-bottom:14px;
          padding-bottom:8px;
        }

        .v40-student-nav button{
          min-height:44px;
          padding:8px 11px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function returnHome(screen){
    const homeButton = screen?.querySelector('.back-home');
    if (homeButton) {
      homeButton.click();
      return true;
    }
    return false;
  }

  function focusLearnCard(){
    const setup = document.querySelector('#start .v40c-learn-setup');
    const button = document.getElementById('start-btn');

    if (setup) {
      setup.scrollIntoView({ behavior:'smooth', block:'start' });
      window.setTimeout(() => {
        document.getElementById('practice-mode-btn')?.focus({ preventScroll:true });
      }, 250);
      return;
    }

    const card = document.querySelector('#start [data-action-for="start-btn"]');
    if (!card || !button || button.classList.contains('hidden')) return;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => button.focus({ preventScroll: true }), 250);
  }

  function openExistingDestination(sourceId, screen){
    const source = document.getElementById(sourceId);
    if (!source || source.classList.contains('hidden')) return;

    if (screen?.id !== 'start') {
      if (!returnHome(screen)) return;
      window.setTimeout(() => source.click(), 0);
      return;
    }

    source.click();
  }

  function navigate(key, screen){
    if (!screen) return;

    if (key === 'home') {
      if (screen.id !== 'start') returnHome(screen);
      return;
    }

    if (key === 'learn') {
      if (screen.id !== 'start') {
        if (!returnHome(screen)) return;
        window.setTimeout(focusLearnCard, 0);
      } else {
        focusLearnCard();
      }
      return;
    }

    const item = NAV_ITEMS.find(entry => entry.key === key);
    if (item?.sourceId) openExistingDestination(item.sourceId, screen);
  }

  function syncAvailability(nav){
    NAV_ITEMS.forEach(item => {
      if (!item.sourceId) return;
      const source = document.getElementById(item.sourceId);
      const button = nav.querySelector(`[data-v40-nav="${item.key}"]`);
      if (!source || !button) return;
      button.classList.toggle('hidden', source.classList.contains('hidden'));
    });
  }

  function watchSourceAvailability(nav){
    if (nav.dataset.v40AvailabilityWatched === 'true') return;
    nav.dataset.v40AvailabilityWatched = 'true';

    NAV_ITEMS.forEach(item => {
      if (!item.sourceId) return;
      const source = document.getElementById(item.sourceId);
      if (!source) return;
      new MutationObserver(() => syncAvailability(nav)).observe(source, {
        attributes: true,
        attributeFilter: ['class']
      });
    });
  }

  function makeButton(item, screen, activeKey){
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.v40Nav = item.key;
    button.innerHTML = `<span aria-hidden="true">${item.icon}</span><span>${item.label}</span>`;
    if (item.key === activeKey) button.setAttribute('aria-current', 'page');
    return button;
  }

  function makeFallbackNav(screen, activeKey){
    const nav = document.createElement('nav');
    nav.className = 'v40-student-nav';
    nav.dataset.v40Fallback = 'true';
    nav.setAttribute('aria-label', 'Student learning navigation');
    NAV_ITEMS.forEach(item => nav.appendChild(makeButton(item, screen, activeKey)));
    screen.insertAdjacentElement('afterbegin', nav);
    return nav;
  }

  function ensureQuizNote(screen, nav){
    if (screen.id !== 'quiz') return;
    let note = screen.querySelector(':scope > .v40-student-nav-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'v40-student-nav-note';
      note.textContent = 'Finish or end this Practice session before switching to another learning section.';
      nav.insertAdjacentElement('afterend', note);
    }
  }

  function enhanceNav(screen, activeKey){
    let nav = screen.querySelector(':scope > .v40-student-nav');
    if (!nav) nav = makeFallbackNav(screen, activeKey);

    nav.setAttribute('aria-label', 'Student learning navigation');

    NAV_ITEMS.forEach(item => {
      let button = nav.querySelector(`[data-v40-nav="${item.key}"]`);
      if (!button) {
        button = makeButton(item, screen, activeKey);
        nav.appendChild(button);
      }

      if (item.key === activeKey) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');

      const lockedInPractice = screen.id === 'quiz' && item.key !== 'learn';
      button.disabled = lockedInPractice;
      if (lockedInPractice) button.title = 'End Practice before switching sections.';
      else if (button.title === 'End Practice before switching sections.') button.removeAttribute('title');

      if (button.dataset.v40NavBound !== 'true' && !lockedInPractice) {
        button.dataset.v40NavBound = 'true';
        button.addEventListener('click', () => navigate(item.key, screen));
      }
    });

    syncAvailability(nav);
    watchSourceAvailability(nav);
    ensureQuizNote(screen, nav);
    nav.dataset.v40NavEnhanced = 'true';
    return nav;
  }

  function addStudentNavigation(){
    Object.entries(SCREEN_CONFIG).forEach(([screenId, activeKey]) => {
      const screen = document.getElementById(screenId);
      if (!screen) return;
      enhanceNav(screen, activeKey);
    });
  }

  function applyV40B(){
    injectStyles();
    addStudentNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV40B, { once: true });
  } else {
    applyV40B();
  }
})();
