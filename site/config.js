window.MATH_APP_CONFIG = {
  supabaseUrl: 'https://lmveznstltjxzpalcmid.supabase.co',
  supabasePublishableKey: 'sb_publishable_0ArG2t1Zgln135ctDR6pQw_QY_z3yf8',
  // Optional. Leave blank to use the current deployed page URL.
  // Example: 'https://your-site.netlify.app/'
  authRedirectUrl: ''
};

/* Optional feature modules load after the main app is ready. */
window.addEventListener('load', () => {
  const script = document.createElement('script');
  script.src = './v38-ai-help.js';
  script.async = false;
  document.body.appendChild(script);
}, { once: true });
