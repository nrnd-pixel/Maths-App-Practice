/* V5.2B.1 — Question Bank mutation-observer gate.
   Older V5.1/V5.2 Question Bank modules already refresh from renderQuestions wrappers or
   document-level selection events. Their additional broad MutationObservers multiply the
   same work whenever cards, badges, QA summaries or management panels change. This gate
   suppresses only those redundant Question Bank observers; the performance coordinator
   explicitly refreshes topical safety and multipart decoration after each card render.
   All unrelated MutationObservers remain native and unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const NativeMutationObserver = ROOT.MutationObserver;
  if (typeof NativeMutationObserver !== 'function' || ROOT.__v52b1QuestionBankObserverGateInstalled) return;

  function callbackSource(callback){
    try { return Function.prototype.toString.call(callback); } catch { return ''; }
  }

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

  function WrappedMutationObserver(callback){
    const observer = new NativeMutationObserver(callback);
    const nativeObserve = observer.observe.bind(observer);
    observer.observe = function(target,options){
      const reason = suppressionReason(target,callback);
      if (reason){
        try {
          target?.setAttribute?.('data-v52b1-observer-gated','1');
        } catch {}
        return undefined;
      }
      return nativeObserve(target,options);
    };
    return observer;
  }

  try { Object.setPrototypeOf(WrappedMutationObserver,NativeMutationObserver); } catch {}
  try { WrappedMutationObserver.prototype = NativeMutationObserver.prototype; } catch {}

  ROOT.MutationObserver = WrappedMutationObserver;
  ROOT.__v52b1QuestionBankObserverGateInstalled = true;

  const api = Object.freeze({suppressionReason,callbackSource});
  Object.defineProperty(ROOT,'V52B1QuestionBankObserverGate',{value:api,writable:false,configurable:false});
})();
