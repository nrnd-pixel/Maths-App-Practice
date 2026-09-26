/* V5.9O — P2.2 Runtime observability.
   Installs window.onerror and window.onunhandledrejection early in the page
   lifecycle so runtime errors and unhandled promise rejections are visible in
   structured form. Works in concert with the script-load onerror handlers in
   v40-release.js (item 5 from PR #353).

   Design constraints:
   - Must be silent in production unless something genuinely breaks
   - Must never throw itself (wrapped in try/catch throughout)
   - Must not interfere with existing error handling
   - Must not make network requests on its own
   - Exposes window.MathAppObservability for future consumers (e.g. Supabase error log)
*/
(() => {
  'use strict';

  // Prevent double-install (e.g. script reloaded in the same page context).
  if (window.__v59oObservabilityInstalled) return;
  window.__v59oObservabilityInstalled = true;

  const MAX_STORED = 50; // keep at most 50 errors in memory
  const errors = [];

  function record(entry) {
    try {
      errors.push(Object.assign({ ts: Date.now() }, entry));
      if (errors.length > MAX_STORED) errors.shift();
    } catch (_) {}
  }

  function safeString(val, maxLen) {
    try {
      const s = String(val == null ? '' : val);
      return maxLen ? s.slice(0, maxLen) : s;
    } catch (_) {
      return '[unserializable]';
    }
  }

  // window.onerror — catches synchronous runtime errors and script load failures
  // from tags without their own onerror (belt-and-suspenders alongside v40-release.js).
  const prevOnerror = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    try {
      const entry = {
        type:    'onerror',
        message: safeString(message, 500),
        source:  safeString(source, 200),
        lineno:  lineno || 0,
        colno:   colno  || 0,
        stack:   error?.stack ? safeString(error.stack, 1000) : null,
      };
      record(entry);
      console.error('[MathApp] Runtime error:', entry.message,
        entry.source ? `(${entry.source}:${entry.lineno})` : '');
    } catch (_) {}
    // Call any previously installed handler (don't suppress default browser behaviour).
    if (typeof prevOnerror === 'function') {
      return prevOnerror.apply(this, arguments);
    }
    return false; // false = don't suppress the default console error
  };

  // window.onunhandledrejection — catches unhandled Promise rejections.
  const prevUnhandled = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    try {
      const reason = event?.reason;
      const entry = {
        type:    'unhandledrejection',
        message: reason instanceof Error
          ? safeString(reason.message, 500)
          : safeString(reason, 500),
        stack:   reason instanceof Error && reason.stack
          ? safeString(reason.stack, 1000)
          : null,
      };
      record(entry);
      console.error('[MathApp] Unhandled rejection:', entry.message);
    } catch (_) {}
    if (typeof prevUnhandled === 'function') {
      return prevUnhandled.apply(this, arguments);
    }
  };

  // Public API — read-only, frozen.
  // Future consumers (e.g. a Supabase error-log RPC) can read window.MathAppObservability.errors.
  Object.defineProperty(window, 'MathAppObservability', {
    value: Object.freeze({
      // Returns a snapshot copy of recorded errors — safe to iterate without
      // worrying about concurrent mutation.
      get errors() { return errors.slice(); },
      // Convenience: how many errors have been recorded since page load.
      get count() { return errors.length; },
      // Reset — useful in tests.
      clear() { errors.length = 0; },
    }),
    writable: false,
    configurable: false,
    enumerable: false,
  });
})();
