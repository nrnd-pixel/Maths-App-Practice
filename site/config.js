window.MATH_APP_CONFIG = {
  supabaseUrl: 'https://lmveznstltjxzpalcmid.supabase.co',
  supabasePublishableKey: 'sb_publishable_0ArG2t1Zgln135ctDR6pQw_QY_z3yf8',
  // Optional. Leave blank to use the current deployed page URL.
  // Example: 'https://your-site.netlify.app/'
  authRedirectUrl: ''
};

/*
 * V3.8.1 AI Help connectivity hotfix.
 *
 * Keep the normal Supabase client unchanged for the rest of the app. AI Help
 * requests are routed through a small compatibility Edge Function whose only
 * job is to handle browser CORS robustly, then forward the unchanged JSON body
 * to the protected V3.8 AI Help function. Student authorization remains the
 * temporary practice token inside the request body; no protected content or
 * service-role credential is exposed to the browser.
 */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const oldPath = '/functions/v1/student-ai-help-v38';
  const compatibilityPath = '/functions/v1/student-ai-help-v381';

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string'
      ? input
      : (input instanceof Request ? input.url : String(input?.url || input || ''));

    if (!url.includes(oldPath)) {
      return nativeFetch(input, init);
    }

    const redirectedUrl = url.replace(oldPath, compatibilityPath);

    if (input instanceof Request) {
      const redirectedRequest = new Request(redirectedUrl, input);
      return nativeFetch(redirectedRequest, init);
    }

    return nativeFetch(redirectedUrl, init);
  };
})();

/* Historical V5.1 bootstrap title; stable-release checkpoint layers apply the
   current release identity once the staged modules are loaded. */
document.title = 'Math Practice V5.1';

/* Stable V3.9/V4.x/V5.x foundation plus signed-off V5.4, V5.5, V5.6 and V5.7
   checkpoints. V5.6.1 keeps the student entry Practice-first. V5.7A adds secure
   cross-device Past Paper Practice checkpoints over the accepted V5.5C same-device
   fallback, including stale local-checkpoint cleanup after completion elsewhere.
   V5.7B adds teacher assignment scheduling, close/reopen, reassign-as-new and
   student completion management without changing student grading or Exam Mode.
   V5.7C makes signed-in Home Practice-first: resume saved Past Paper work, surface
   teacher assignments, recommended Practice and the latest Practice result without
   requiring Exam access. V5.7D turns Past Paper Analytics into safe teacher actions:
   prepare targeted cohorts in the existing assignment form, open assignment
   management, or open/copy a teaching focus plan. V5.7D.1 provides the selectable
   in-app focus-plan fallback for restricted clipboard contexts. V5.7E consolidates
   these accepted layers as the V5.7 stable release identity and audit checkpoint.
   The checkpoint itself performs no network calls or automatic assignment writes.
   Legacy release-label-only scripts remain archived in the repository; current
   staged loading remains coordinated by v40-release.js. */
window.addEventListener('load', () => {
  [
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
    './v57-stable-release-checkpoint.js'
  ].forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  });
}, { once: true });
