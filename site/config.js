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

/*
 * V5.8.2 bootstrap consolidation.
 *
 * Keep configuration and the AI Help compatibility boundary here, but delegate
 * staged application loading to one bootstrap entry point. The bootstrap owns
 * the established module manifest and preserves its exact execution order.
 *
 * The base HTML still contains historical V4.0 presentation text. Neutralise
 * that text immediately, before the staged modules begin, so students never
 * need to see internal release identities while the app is starting.
 */
document.title = 'Math Practice';

(() => {
  const badge = document.querySelector('#start .brand .badge');
  if (badge) badge.textContent = 'Maths Practice • Starting';

  const note = document.querySelector('#start > .info');
  if (note) {
    note.innerHTML = '<strong>Maths Practice:</strong> Getting your learning space ready…';
  }
})();

window.addEventListener('load', () => {
  const script = document.createElement('script');
  script.src = './v582-bootstrap.js';
  script.async = false;
  script.setAttribute('data-v582-bootstrap-entry', '1');
  document.body.appendChild(script);
}, { once: true });
