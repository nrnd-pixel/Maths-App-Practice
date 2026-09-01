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

/* Historical V5.1 bootstrap title; the signed-off V5.4 production-polish layer
   applies the current stable identity once the staged modules are loaded. */
document.title = 'Math Practice V5.1';

/* Stable V3.9/V4.x/V5.x foundation plus the signed-off V5.4 release checkpoint.
   Legacy release-label-only scripts remain archived in the repository but are
   no longer executed; current staged loading remains coordinated by v40-release.js. */
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
    './v54-stable-release-checkpoint.js'
  ].forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  });
}, { once: true });
