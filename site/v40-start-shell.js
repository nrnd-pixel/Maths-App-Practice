/* V4.0D — Final start-page shell.
   Presentation-only: separates logged-out sign-in, logged-in Home Learning Hub,
   and the Learn setup while preserving all existing secure controls and handlers.

   V4.1B keeps an explicit fresh student sign-in on Home even if another legacy
   start handler resumes after authentication. */
(() => {
  'use strict';

  const STYLE_ID = 'v40-start-shell-style';
  const START_VIEW_KEY = 'v40StartView';

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Logged out: keep the landing page intentionally simple. */
      #start.v40-shell-logged-out > .v40-student-nav,
      #start.v40-shell-logged-out .v40c-learn-setup,
      #start.v40-shell-logged-out .v40-learning-hub-hero,
      #start.v40-shell-logged-out .v40c3-home-dashboard,
      #start.v40-shell-logged-out .v40-platform-section,
      #start.v40-shell-logged-out .v40-section-note{
        display:none!important;
      }

      #start.v40-shell-logged-out .v39-home-hub{
        margin-top:14px;
        gap:0;
      }

      #start.v40-shell-logged-out .v40c-session-panel{
        max-width:760px;
        margin:20px auto 10px;
      }

      /* Signed in: collapse the large login panel into a compact identity bar. */
      #start.v40-shell-authenticated .v40c-session-panel{
        margin:14px 0 10px;
        padding:0;
        border:0;
        background:transparent;
      }

      #start.v40-shell-authenticated .v40c-session-head{
        display:none!important;
      }

      #start.v40-shell-authenticated .v40c-session-identity{
        margin:0;
        padding:11px 13px;
        border-radius:14px;
      }

      #start.v40-shell-authenticated .v40c-session-identity-text .help:last-child{
        display:none;
      }

      #start.v40-shell-authenticated .v40c-session-identity button{
        min-height:40px;
        padding:7px 12px;
      }

      /* Home is the Learning Hub overview; Learn owns the activity form. */
      #start.v40-shell-authenticated[data-v40-start-view="home"] .v40c-learn-setup{
        display:none!important;
      }

      #start.v40-shell-authenticated[data-v40-start-view="home"] .v40-platform-section,
      #start.v40-shell-authenticated[data-v40-start-view="home"] .v40-section-note{
        display:none!important;
      }

      #start.v40-shell-authenticated[data-v40-start-view="learn"] .v39-home-hub{
        display:none!important;
      }

      #start.v40-shell-authenticated[data-v40-start-view="learn"] .v40c-learn-setup{
        margin-top:14px;
      }

      /* The Home hero/dashboard should feel like one concise student dashboard. */
      #start.v40-shell-authenticated[data-v40-start-view="home"] .v40-learning-hub-hero{
        margin-top:12px;
      }

      #start.v40-shell-authenticated[data-v40-start-view="home"] .v40c3-home-dashboard{
        margin-top:12px;
      }

      /* Teacher controls remain available, but clearly secondary. */
      #start .v39-teacher-zone{
        margin-top:18px;
        padding-top:14px;
      }

      #start .v40-teacher-access{
        border:1px solid var(--border);
        border-radius:14px;
        background:color-mix(in srgb,var(--soft) 10%,var(--card));
        overflow:hidden;
      }

      #start .v40-teacher-access > summary{
        cursor:pointer;
        list-style:none;
        padding:11px 13px;
        color:var(--muted);
        font-size:12px;
        font-weight:850;
        user-select:none;
      }

      #start .v40-teacher-access > summary::-webkit-details-marker{
        display:none;
      }

      #start .v40-teacher-access > summary::after{
        content:'▾';
        float:right;
      }

      #start .v40-teacher-access[open] > summary::after{
        content:'▴';
      }

      #start .v40-teacher-access .v39-teacher-actions{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
        padding:0 11px 11px;
      }

      #start .v40-teacher-access .v39-teacher-actions button{
        width:100%;
        min-height:42px;
      }

      /* Keep release information present but unobtrusive for students. */
      #start > .info{
        margin-top:14px;
        padding:10px 12px;
        border-radius:12px;
        font-size:11px;
        line-height:1.45;
        color:var(--muted);
      }

      @media(max-width:620px){
        #start.v40-shell-authenticated .v40c-session-identity{
          flex-direction:row;
          align-items:center;
        }

        #start.v40-shell-authenticated .v40c-session-identity button{
          width:auto;
          flex:0 0 auto;
        }

        #start .v40-teacher-access .v39-teacher-actions{
          grid-template-columns:1fr;
        }
      }

      @media(max-width:430px){
        #start.v40-shell-authenticated .v40c-session-identity{
          flex-direction:column;
          align-items:stretch;
        }

        #start.v40-shell-authenticated .v40c-session-identity button{
          width:100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function startScreen(){
    return document.getElementById('start');
  }

  function sessionPanel(){
    return document.querySelector('#start .v40c-session-panel');
  }

  function isSignedIn(){
    return !!sessionPanel()?.classList.contains('v40c-authenticated');
  }

  function startNav(){
    return document.querySelector('#start .v40-student-nav');
  }

  function setTabCurrent(view){
    const nav = startNav();
    if (!nav) return;

    nav.querySelectorAll('[data-v40-nav]').forEach(button => {
      const key = button.dataset.v40Nav;
      const current = key === view;
      if (current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function setStartView(view, options = {}){
    const start = startScreen();
    if (!start || !isSignedIn()) return;

    const next = view === 'learn' ? 'learn' : 'home';
    start.dataset.v40StartView = next;
    setTabCurrent(next);

    try {
      sessionStorage.setItem(START_VIEW_KEY, next);
    } catch {}

    if (options.scroll !== false) {
      const target = next === 'learn'
        ? start.querySelector('.v40c-learn-setup')
        : start.querySelector('.v40-learning-hub-hero');
      window.setTimeout(() => target?.scrollIntoView({ behavior:'smooth', block:'start' }), 0);
    }
  }

  function clearStoredView(){
    try {
      sessionStorage.removeItem(START_VIEW_KEY);
    } catch {}
  }

  function preferredView(){
    try {
      return sessionStorage.getItem(START_VIEW_KEY) === 'learn' ? 'learn' : 'home';
    } catch {
      return 'home';
    }
  }

  function moveStartNav(){
    const panel = sessionPanel();
    const nav = startNav();
    if (!panel || !nav) return;
    if (panel.nextElementSibling !== nav) panel.insertAdjacentElement('afterend', nav);
  }

  function compactTeacherTools(){
    const zone = document.querySelector('#start .v39-teacher-zone');
    if (!zone || zone.querySelector('.v40-teacher-access')) return;

    const head = zone.querySelector('.v39-teacher-zone-head');
    const actions = zone.querySelector('.v39-teacher-actions');
    if (!actions) return;

    const details = document.createElement('details');
    details.className = 'v40-teacher-access';

    const summary = document.createElement('summary');
    summary.textContent = '🔒 Teacher access';

    details.append(summary, actions);
    head?.remove();
    zone.appendChild(details);
  }

  function applyShellState({ resetView = false, preserveInitialLoggedOut = false } = {}){
    const start = startScreen();
    if (!start) return;

    const signedIn = isSignedIn();
    start.classList.toggle('v40-shell-authenticated', signedIn);

    if (signedIn) {
      start.classList.remove('v40-shell-logged-out');
    } else if (!preserveInitialLoggedOut) {
      start.classList.add('v40-shell-logged-out');
    }

    if (!signedIn) {
      delete start.dataset.v40StartView;
      clearStoredView();
      return;
    }

    setStartView(resetView ? 'home' : preferredView(), { scroll:false });
  }

  function keepFreshSignInOnHome(){
    /*
      The sign-in button is authentication only. If a legacy caller finishes an
      awaited Practice start after the session class flips to authenticated, let
      that microtask finish first, then restore the intended Learning Hub Home.
    */
    window.setTimeout(() => {
      if (!isSignedIn()) return;
      if (typeof show === 'function') show('start');
      applyShellState({ resetView:true });
      setStartView('home', { scroll:false });
    }, 0);
  }

  function watchSessionPanel(){
    const panel = sessionPanel();
    if (!panel || panel.dataset.v40ShellWatch === 'true') return;
    panel.dataset.v40ShellWatch = 'true';

    let previousSignedIn = isSignedIn();

    new MutationObserver(() => {
      const signedIn = isSignedIn();
      const justSignedIn = signedIn && !previousSignedIn;
      previousSignedIn = signedIn;
      applyShellState({ resetView: justSignedIn });
      if (justSignedIn) keepFreshSignInOnHome();
    }).observe(panel, {
      attributes:true,
      attributeFilter:['class']
    });
  }

  function handleNavigationClick(event){
    const navButton = event.target.closest?.('[data-v40-nav]');
    if (navButton) {
      const key = navButton.dataset.v40Nav;
      if (key === 'home' || key === 'learn') {
        setStartView(key, { scroll:true });
      }
      return;
    }

    if (event.target.closest?.('.v40c-open-learn')) {
      setStartView('learn', { scroll:false });
      return;
    }

    if (event.target.closest?.('.back-home')) {
      setStartView('home', { scroll:false });
    }
  }

  function applyV40StartShell(){
    injectStyles();
    moveStartNav();
    compactTeacherTools();
    watchSessionPanel();
    applyShellState({ preserveInitialLoggedOut:true });

    document.addEventListener('click', handleNavigationClick, true);

    /*
      Item 3 — explicit auth-state contract: listen for the CustomEvent that
      v40-student-session.js dispatches whenever auth state changes. This makes
      the coupling between the two files explicit and means shell state updates
      survive any future rename of the v40c-authenticated CSS class (which the
      MutationObserver above depends on). The two listeners are complementary:
      the MutationObserver fires on DOM class changes; this fires on the semantic
      event. Either alone is sufficient; both together are belt-and-suspenders.
    */
    document.addEventListener('v40:authStateChanged', event => {
      const signedIn = !!event.detail?.signedIn;
      const wasSignedIn = isSignedIn();
      const justSignedIn = signedIn && !wasSignedIn;
      applyShellState({ resetView: justSignedIn });
      if (justSignedIn) keepFreshSignInOnHome();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyV40StartShell, { once:true });
  } else {
    applyV40StartShell();
  }
})();
