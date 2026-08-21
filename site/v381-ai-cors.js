/* V3.8.1 AI Help connectivity hotfix.
   The current Supabase browser client may add request headers that are newer
   than the Edge Function's original CORS allow-list. For the AI Help function
   only, use a minimal direct fetch with the browser-safe publishable key and
   the custom student access token in the JSON body. Protected question data
   remains server-side. */
(() => {
  'use strict';

  let attempts = 0;
  const MAX_ATTEMPTS = 120;

  function patchInvokeV381() {
    attempts += 1;

    if (typeof cloud === 'undefined' || !cloud?.functions?.invoke) {
      if (attempts < MAX_ATTEMPTS) setTimeout(patchInvokeV381, 100);
      return;
    }

    if (cloud.functions.__v381AiCorsPatched) return;

    const originalInvoke = cloud.functions.invoke.bind(cloud.functions);
    const config = window.MATH_APP_CONFIG || {};
    const supabaseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
    const publishableKey = String(config.supabasePublishableKey || '');

    cloud.functions.invoke = async function invokeV381(functionName, options = {}) {
      if (functionName !== 'student-ai-help-v38' || !supabaseUrl || !publishableKey) {
        return originalInvoke(functionName, options);
      }

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/student-ai-help-v38`, {
          method: 'POST',
          headers: {
            'apikey': publishableKey,
            'content-type': 'application/json'
          },
          body: JSON.stringify(options?.body ?? {})
        });

        let data = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          const message = data?.error || `AI Help request failed (${response.status}).`;
          const error = new Error(message);
          error.status = response.status;
          return { data: null, error };
        }

        return { data, error: null };
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error('Failed to send AI Help request.');
        return { data: null, error };
      }
    };

    cloud.functions.__v381AiCorsPatched = true;
  }

  patchInvokeV381();
})();
