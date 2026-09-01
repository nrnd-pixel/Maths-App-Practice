/* V5.4D — Topical Resource Library simplification.
   Presentation-only cleanup on the accepted V5.4C baseline.
   Students use ordinary Practice for eligible topical-origin questions, so the
   legacy V5.2C publication panel and legacy locked Active button are hidden from
   normal teacher workflow. Their backend/guard code remains loaded as rollback
   infrastructure. Set-level Practice eligibility controls remain visible. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v54dTopicalResourceSimplificationInstalled) return;
  ROOT.__v54dTopicalResourceSimplificationInstalled = true;

  const STYLE_ID = 'v54d-topical-resource-simplification-style';

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return false;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #v52b-topical-library .v52c-publication{display:none!important}
      #questions-cards .toggle-q[data-v52-topical-locked="1"]{display:none!important}
    `;
    document.head.appendChild(style);
    return true;
  }

  function install(){ injectStyles(); }

  const api = Object.freeze({injectStyles});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V54DTopicalResourceSimplification',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
