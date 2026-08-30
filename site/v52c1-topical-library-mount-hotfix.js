/* V5.2C.1 — Student Topical Library mount hotfix.
   V4.0 Learn setup moves #start-btn out of the legacy .buttons container. Create
   the V5.2C library root beside the current Learn controls so the accepted
   topical selection/RPC engine can render into it unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52c1TopicalLibraryMountInstalled) return;
  ROOT.__v52c1TopicalLibraryMountInstalled = true;

  const LIBRARY_ID = 'v52c-student-topical-library';
  const STYLE_ID = 'v52c1-topical-library-mount-style';

  function currentLearnAnchor(){
    if (typeof document === 'undefined') return null;
    const setup = document.querySelector('#start .v40c-learn-setup');
    return setup?.querySelector('.v40c-practice-summary')
      || setup?.querySelector('.v40c-learn-actions')
      || document.getElementById('start-btn')?.closest('.buttons')
      || null;
  }

  function createLibraryRoot(){
    const root = document.createElement('section');
    root.id = LIBRARY_ID;
    root.className = 'info hidden';
    root.setAttribute('aria-label', 'Available topical exercise sets');
    return root;
  }

  function ensureMounted(){
    if (typeof document === 'undefined') return null;
    const anchor = currentLearnAnchor();
    if (!anchor) return null;

    let root = document.getElementById(LIBRARY_ID);
    if (!root) root = createLibraryRoot();

    /* Prefer immediately before Practice setup. This matches the V5.2C mode
       note (“Choose a teacher-published set below”) and keeps the question-count
       control below the set chooser. The legacy .buttons anchor remains a safe
       fallback for older shells. */
    if (root.parentElement !== anchor.parentElement || root.nextElementSibling !== anchor){
      anchor.insertAdjacentElement('beforebegin', root);
    }
    return root;
  }

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #start .v40c-learn-setup #${LIBRARY_ID}{margin:0 18px 18px}
      @media(max-width:700px){#start .v40c-learn-setup #${LIBRARY_ID}{margin:0 18px 18px}}
    `;
    document.head.appendChild(style);
  }

  function install(){
    if (typeof document === 'undefined') return;
    injectStyles();
    if (ensureMounted()) return;

    /* Fail softly if a future shell is still being assembled. Stop observing as
       soon as a supported anchor appears; do not introduce a permanent page-wide
       observer. */
    if (typeof MutationObserver === 'undefined') return;
    const start = document.getElementById('start');
    if (!start) return;
    const observer = new MutationObserver(() => {
      if (ensureMounted()) observer.disconnect();
    });
    observer.observe(start, {childList:true, subtree:true});
  }

  const api = Object.freeze({LIBRARY_ID});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window, 'V52C1TopicalLibraryMount', {value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
      else install();
    }
  }
})();
