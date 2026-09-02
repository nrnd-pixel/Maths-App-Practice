/* Science V0.1 — platform-session compatibility adapter.
   The current Science shell still reads the historical Maths session key. For a
   Science-only student, expose a page-local synthetic session backed by the new
   platform capability. It is removed when leaving /science/. */
(() => {
  'use strict';

  const PLATFORM_KEY = 'learningPlatformSessionV01';
  const LEGACY_KEY = 'mathStudentSessionV40';
  const MARKER = 'platformScienceAdapterV01';

  function validPlatformSession(){
    try {
      const raw = sessionStorage.getItem(PLATFORM_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (
        session?.version !== 1 ||
        !session?.token ||
        !session?.identity?.student_id ||
        !session?.identity?.student_name ||
        Number(session?.expiresAt || 0) <= Date.now()
      ) return null;
      return session;
    } catch {
      return null;
    }
  }

  function existingMathSession(){
    try {
      const raw = sessionStorage.getItem(LEGACY_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (
        session?.version !== 1 ||
        !session?.tokens?.practice ||
        !session?.identity?.student_id ||
        Number(session?.expiresAt || 0) <= Date.now()
      ) return null;
      return session;
    } catch {
      return null;
    }
  }

  function installSyntheticSession(){
    if (existingMathSession()) return;
    const platform = validPlatformSession();
    if (!platform) return;

    const synthetic = {
      version: 1,
      createdAt: Date.now(),
      expiresAt: platform.expiresAt,
      identity: platform.identity,
      tokens: {
        // The Science exchange gateway accepts a platform capability on its
        // compatibility input path. No Maths exam ticket is fabricated.
        practice: platform.token
      },
      [MARKER]: true
    };

    try { sessionStorage.setItem(LEGACY_KEY,JSON.stringify(synthetic)); } catch {}
  }

  function cleanup(){
    try {
      const raw = sessionStorage.getItem(LEGACY_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (session?.[MARKER] === true) sessionStorage.removeItem(LEGACY_KEY);
    } catch {}
  }

  installSyntheticSession();
  window.addEventListener('pagehide',cleanup,{once:true});
})();
