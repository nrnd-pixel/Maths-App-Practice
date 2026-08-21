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
 * This file loads before supabase-js and before the app creates its Supabase
 * client. Keep the existing Supabase client for every normal request, but for
 * the student AI Edge Function strip optional client headers that can cause a
 * browser CORS preflight mismatch. The Edge Function uses the temporary
 * student token from the JSON body for authorization, so an Authorization
 * header is intentionally unnecessary here.
 */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const aiFunctionPath = '/functions/v1/student-ai-help-v38';

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (!url.includes(aiFunctionPath)) {
      return nativeFetch(input, init);
    }

    const sourceHeaders = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined)
    );
    const headers = new Headers();
    const apiKey = sourceHeaders.get('apikey') || window.MATH_APP_CONFIG.supabasePublishableKey;

    if (apiKey) headers.set('apikey', apiKey);
    headers.set('content-type', 'application/json');

    return nativeFetch(input, {
      ...init,
      headers
    });
  };
})();

/* V3.8.1 visible release version. */
document.title = 'Math Practice V3.8.1';

/* Optional V3.8/V3.8.1 feature modules load after the main app is ready. */
window.addEventListener('load', () => {
  [
    './v38-release.js',
    './v381-release.js',
    './v38-ai-help.js',
    './v38-ai-admin.js',
    './v38-ai-polish.js'
  ].forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  });
}, { once: true });
