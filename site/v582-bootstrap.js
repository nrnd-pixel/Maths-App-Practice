/* V5.8.2 — Application Bootstrap Consolidation (test branch).
   Centralises the established post-load module manifest without changing module
   order, feature logic, grading, authentication, Supabase RPC contracts, writes,
   content, or Exam behaviour. The existing modules remain authoritative. */
(() => {
  'use strict';

  const ROOT = window;
  if (ROOT.__v582BootstrapInstalled) return;
  ROOT.__v582BootstrapInstalled = true;

  const MANIFEST = Object.freeze([
    './v38-ai-help.js',
    './v38-ai-admin.js',
    './v38-ai-polish.js',
    './v39-student-polish.js',
    './v39-practice-polish.js',
    './v39-dashboard-polish.js',
    './v39-state-polish.js',
    './v40-student-platform.js',
    './v40-student-nav.js',
    './v40-student-session.js',
    './v40-learn-setup.js',
    './v40-learning-priorities.js',
    './v40-platform-polish.js',
    './v40-release.js',
    './v40-start-shell.js',
    './v54-stable-release-checkpoint.js',
    './v55a-past-paper-practice.js',
    './v55a1-practice-type-guard.js',
    './v55b-full-paper-practice.js',
    './v55c-resume-past-paper-practice.js',
    './v55c1-resume-button-bridge.js',
    './v55d-past-paper-result-attribution.js',
    './v55-stable-release-checkpoint.js',
    './v56a-question-bank-response-filter.js',
    './v56a1-bulk-practice-confirmation-bridge.js',
    './v56b-teacher-assigned-past-paper-practice.js',
    './v56c-student-past-paper-progress.js',
    './v56d-teacher-past-paper-analytics.js',
    './v56-stable-release-checkpoint.js',
    './v561-practice-first-student-experience.js',
    './v57a-cross-device-past-paper-resume.js',
    './v57a1-cross-device-local-bridge.js',
    './v57a2-stale-local-checkpoint-cleanup.js',
    './v57b-teacher-assignment-management.js',
    './v57c-student-continue-learning-home.js',
    './v57d-past-paper-analytics-actions.js',
    './v57d1-focus-plan-copy-fallback.js',
    './v57-stable-release-checkpoint.js',
    './v571a-gamification-foundation.js',
    './v571b-streaks-achievements.js',
    './v572-weekly-missions.js',
    './v573-class-challenges-teacher-gamification.js',
    './v574-gamification-polish-teacher-controls.js',
    './v575-gamification-stable-checkpoint.js',
    './v576-classroom-feedback-support.js',
    './v5761-feedback-trigger-position.js',
    './v5763-teacher-feedback-header-icon.js',
    './v58a-student-first-use-experience.js',
    './v58b-teacher-workspace-consolidation.js',
    './v58c-parent-friendly-student-report.js',
    './v58c-parent-summary-workspace-shortcut.js',
    './v58d-content-workflow-consolidation.js',
    './v58-stable-release-checkpoint.js'
  ]);

  const startedAt = Date.now();
  const state = {
    phase: 'loading',
    loaded: 0,
    failed: [],
    readyAt: null,
    stableSeenAt: null
  };

  let resolveReady;
  const readyPromise = new Promise(resolve => { resolveReady = resolve; });

  const style = document.createElement('style');
  style.setAttribute('data-v582-bootstrap-ui', '1');
  style.textContent = `
    #v582-bootstrap-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: grid;
      place-items: center;
      padding: 24px;
      background: linear-gradient(180deg,#eaf3ff 0,#f4f7fb 72%);
      color: #172033;
      font-family: Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
    }
    #v582-bootstrap-overlay .v582-card {
      width: min(420px,100%);
      text-align: center;
      background: rgba(255,255,255,.96);
      border: 1px solid #d8e0ec;
      border-radius: 24px;
      padding: 30px 24px;
      box-shadow: 0 18px 54px rgba(32,57,96,.14);
    }
    #v582-bootstrap-overlay .v582-logo { font-size: 42px; margin-bottom: 12px; }
    #v582-bootstrap-overlay h1 { margin: 0 0 8px; font-size: 24px; }
    #v582-bootstrap-overlay p { margin: 0; color: #667085; line-height: 1.5; }
    #v582-bootstrap-overlay .v582-track {
      height: 8px;
      margin-top: 20px;
      border-radius: 999px;
      overflow: hidden;
      background: #e7ebf0;
    }
    #v582-bootstrap-overlay .v582-bar {
      width: 18%;
      height: 100%;
      border-radius: inherit;
      background: #2563eb;
      animation: v582-loading 1.15s ease-in-out infinite alternate;
    }
    @keyframes v582-loading { from { transform: translateX(-15%); } to { transform: translateX(455%); } }
    @media (prefers-reduced-motion: reduce) {
      #v582-bootstrap-overlay .v582-bar { animation: none; width: 62%; }
    }
    html[data-theme="dark"] #v582-bootstrap-overlay {
      background: #111827;
      color: #f9fafb;
    }
    html[data-theme="dark"] #v582-bootstrap-overlay .v582-card {
      background: #1f2937;
      border-color: #374151;
      box-shadow: none;
    }
    html[data-theme="dark"] #v582-bootstrap-overlay p { color: #cbd5e1; }
    html[data-theme="dark"] #v582-bootstrap-overlay .v582-track { background: #374151; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'v582-bootstrap-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <div class="v582-card">
      <div class="v582-logo" aria-hidden="true">🧮</div>
      <h1>Maths Practice</h1>
      <p id="v582-bootstrap-message">Loading your learning space…</p>
      <div class="v582-track" aria-hidden="true"><div class="v582-bar"></div></div>
    </div>
  `;
  document.body.appendChild(overlay);

  function legacyV58Ready(){
    try {
      return !!ROOT.V58StableReleaseCheckpoint?.getStatus?.().ready;
    } catch {
      return false;
    }
  }

  function setMessage(text){
    const message = document.getElementById('v582-bootstrap-message');
    if (message) message.textContent = text;
  }

  function finish(reason){
    if (state.phase === 'ready') return;
    state.phase = 'ready';
    state.readyAt = Date.now();
    overlay.remove();
    style.remove();
    resolveReady({
      reason,
      loaded: state.loaded,
      failed: [...state.failed],
      elapsedMs: state.readyAt - startedAt
    });
    ROOT.dispatchEvent(new CustomEvent('math-app:boot-ready', {
      detail: { reason, loaded: state.loaded, failed: [...state.failed] }
    }));
  }

  function waitForStableIdentity(){
    /*
     * V5.8.1 still contains historical release-identity timers below the final
     * stable checkpoint. Keep those internal transitions behind the neutral
     * loading screen until the accepted V5.8 checkpoint has had time to finish
     * its final authoritative identity pass. This changes presentation only.
     */
    const settleMs = 5350;
    const deadline = Date.now() + 12000;

    const check = () => {
      if (!state.stableSeenAt && ROOT.V58StableReleaseCheckpoint) {
        state.stableSeenAt = Date.now();
      }

      const stableSettled = state.stableSeenAt !== null
        && (Date.now() - state.stableSeenAt) >= settleMs;

      if (legacyV58Ready() && stableSettled) {
        finish('v58-settled');
        return;
      }

      if (Date.now() >= deadline) {
        console.warn('V5.8.2 bootstrap: stable-release readiness was not confirmed before the safety timeout.');
        finish('safety-timeout');
        return;
      }

      window.setTimeout(check, 100);
    };

    check();
  }

  MANIFEST.forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.setAttribute('data-v582-managed', '1');
    script.addEventListener('load', () => {
      state.loaded += 1;
      if (state.loaded + state.failed.length === MANIFEST.length) {
        if (state.failed.length) {
          setMessage('Finishing setup…');
        }
        waitForStableIdentity();
      }
    }, { once: true });
    script.addEventListener('error', () => {
      state.failed.push(src);
      console.error(`V5.8.2 bootstrap: failed to load ${src}`);
      if (state.loaded + state.failed.length === MANIFEST.length) {
        setMessage('Finishing setup…');
        waitForStableIdentity();
      }
    }, { once: true });
    document.body.appendChild(script);
  });

  const existingMathApp = ROOT.MathApp && typeof ROOT.MathApp === 'object'
    ? ROOT.MathApp
    : {};

  existingMathApp.version = '5.8.2-preview';
  existingMathApp.boot = Object.freeze({
    manifest: MANIFEST,
    whenReady: () => readyPromise,
    getStatus: () => Object.freeze({
      phase: state.phase,
      loaded: state.loaded,
      failed: [...state.failed],
      total: MANIFEST.length,
      stableV58Ready: legacyV58Ready(),
      stableSeenAt: state.stableSeenAt,
      elapsedMs: Date.now() - startedAt
    })
  });
  ROOT.MathApp = existingMathApp;
})();
