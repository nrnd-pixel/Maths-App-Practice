/* V5.2B.1 — Question Bank mutation-observer gate compatibility shim.
   Phase 7C retired every production Question Bank observer that previously depended on
   global suppression. Keep the historical diagnostic API and install marker for compatibility,
   but do not replace MutationObserver, block observe(), or mark DOM targets as gated.
   All MutationObservers now remain native and unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52b1QuestionBankObserverGateInstalled) return;

  function callbackSource(callback){
    try { return Function.prototype.toString.call(callback); } catch { return ''; }
  }

  // Historical classifier retained for diagnostics only. A non-empty result no longer
  // suppresses the observer; native MutationObserver behavior is always preserved.
  function suppressionReason(target,callback){
    if (!target) return '';
    const id = String(target.id || '');
    if (id === 'questions-cards') return 'question-card-observer';
    if (id === 'questions-panel') return 'question-panel-observer';
    if (typeof document !== 'undefined' && target === document.body){
      const source = callbackSource(callback);
      if (source.includes('renderSelectionState') && source.includes('bind')) return 'question-history-body-observer';
    }
    return '';
  }

  ROOT.__v52b1QuestionBankObserverGateInstalled = true;
  ROOT.__v52b1QuestionBankObserverGateRetired = true;

  const api = Object.freeze({
    suppressionReason,
    callbackSource,
    retired:true,
    suppressionActive:false
  });
  Object.defineProperty(ROOT,'V52B1QuestionBankObserverGate',{value:api,writable:false,configurable:false});
})();
