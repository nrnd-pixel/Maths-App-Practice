/* V5.5C.1 — Resume checkpoint button bridge.
   The legacy shell binds #next-btn directly to the pre-wrapper nextQuestion
   function during boot. V5.5C replaces nextQuestion later, so this bridge
   intentionally rebinds only the Practice Next button after the V5.5C wrapper
   is installed. Exam navigation and all other buttons are untouched. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v55c1ResumeButtonBridgeInstalled) return;
  ROOT.__v55c1ResumeButtonBridgeInstalled = true;

  function install(){
    if (typeof document === 'undefined') return true;
    if (!ROOT.__v55cResumePastPaperPracticeWrappersInstalled) return false;
    const button = document.getElementById('next-btn');
    if (!button || typeof ROOT.nextQuestion !== 'function') return false;

    button.onclick = () => ROOT.nextQuestion();
    button.dataset.v55cResumeBridge = 'true';
    return true;
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined'){
    let tries = 0;
    const run = () => {
      tries += 1;
      if (install() || tries >= 120) return;
      window.setTimeout(run, 100);
    };
    run();
  }

  if (typeof module !== 'undefined' && module.exports){
    module.exports = Object.freeze({ install });
  }
})();
