/* Science V0.1 — student-friendly subject-access denial screen.
   Distinguishes an intentional teacher restriction from genuine app errors. */
(() => {
  'use strict';

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const screen = document.getElementById('errorScreen');
  const button = document.getElementById('errorBackBtn');
  if (!screen || !button) return;

  function readPlatformSession(){
    try {
      const raw = sessionStorage.getItem(PLATFORM_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (
        session?.version !== 1 ||
        !session?.token ||
        !session?.identity?.student_id ||
        Number(session?.expiresAt || 0) <= Date.now()
      ) return null;
      return session;
    } catch {
      return null;
    }
  }

  function applyAccessDeniedCopy(){
    if (!screen.classList.contains('active')) return;

    const platform = readPlatformSession();
    if (!platform || platform?.subjects?.science?.allowed === true) {
      button.dataset.scienceAccessDenied = 'false';
      return;
    }

    const title = screen.querySelector('h2');
    const message = document.getElementById('errorMessage');
    if (title) title.textContent = 'Science is not available for your account';
    if (message) message.textContent = 'Your teacher has not enabled Science for you.';
    button.textContent = '← Return to My Learning';
    button.dataset.scienceAccessDenied = 'true';
  }

  button.addEventListener('click', (event) => {
    if (button.dataset.scienceAccessDenied !== 'true') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign('../');
  }, true);

  new MutationObserver(applyAccessDeniedCopy)
    .observe(screen, { attributes:true, attributeFilter:['class'] });

  applyAccessDeniedCopy();
})();
