window.MATH_APP_CONFIG = {
  supabaseUrl: 'https://lmveznstltjxzpalcmid.supabase.co',
  supabasePublishableKey: 'sb_publishable_0ArG2t1Zgln135ctDR6pQw_QY_z3yf8',
  // Optional. Leave blank to use the current deployed page URL.
  // Example: 'https://your-site.netlify.app/'
  authRedirectUrl: ''
};

/* V3.8 visible release version. */
document.title = 'Math Practice V3.8';

/* Optional V3.8 feature modules load after the main app is ready. */
window.addEventListener('load', () => {
  ['./v38-release.js', './v38-ai-help.js', './v38-ai-admin.js', './v38-ai-polish.js'].forEach(src => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
  });
}, { once: true });
