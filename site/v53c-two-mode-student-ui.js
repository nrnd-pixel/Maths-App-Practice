/* V5.3C — Two-mode student UI.
   Topical exercise provenance remains teacher-side/resource-bank metadata. Students
   now enter only Practice or Exam; the V5.2C topical route stays loaded as a
   rollback boundary but is suppressed from the student-facing Learn surface. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v53cTwoModeStudentUiInstalled) return;
  ROOT.__v53cTwoModeStudentUiInstalled = true;

  const MODE_BUTTON_ID='v52c-topical-mode-btn';
  const LIBRARY_ID='v52c-student-topical-library';
  const STYLE_ID='v53c-two-mode-student-ui-style';
  const RESULT_ID='result';
  const AGAIN_ID='again-btn';

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .mode-switch.v53c-two-modes{grid-template-columns:repeat(2,minmax(0,1fr));max-width:700px}
      #${MODE_BUTTON_ID},#${LIBRARY_ID}{display:none!important}
      @media(max-width:700px){.mode-switch.v53c-two-modes{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function suppressLegacyTopicalUi(){
    if (typeof document==='undefined') return;
    const modeSwitch=document.querySelector('.mode-switch');
    if (modeSwitch){
      modeSwitch.classList.remove('v52c-three-modes');
      modeSwitch.classList.add('v53c-two-modes');
    }

    const topical=document.getElementById(MODE_BUTTON_ID);
    if (topical){
      topical.hidden=true;
      topical.classList.remove('active');
      topical.setAttribute('aria-hidden','true');
      topical.tabIndex=-1;
    }

    const library=document.getElementById(LIBRARY_ID);
    if (library){
      library.hidden=true;
      library.classList.add('hidden');
      library.setAttribute('aria-hidden','true');
    }
  }

  function returnToPractice(){
    const result=document.getElementById(RESULT_ID);
    if (result) result.removeAttribute('data-v52c2-topical-result');

    try { if (typeof show==='function') show('start'); } catch {}
    try { if (typeof setStartMode==='function') setStartMode('practice'); } catch {}

    const practice=document.getElementById('practice-mode-btn');
    if (practice && !practice.classList.contains('active')) practice.click();
    suppressLegacyTopicalUi();
    document.getElementById('start')?.scrollIntoView?.({block:'start'});
  }

  function onWindowCapture(event){
    const target=event.target;
    const topical=target?.closest?.(`#${MODE_BUTTON_ID}`);
    if (topical){
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressLegacyTopicalUi();
      try { if (typeof setStartMode==='function') setStartMode('practice'); } catch {}
      return;
    }

    const again=target?.closest?.(`#${AGAIN_ID}`);
    if (!again) return;
    const result=document.getElementById(RESULT_ID);
    if (result?.dataset.v52c2TopicalResult!=='1') return;

    /* Window capture runs before the legacy V5.2C.2 document-capture handler,
       so an old topical result cannot reopen the hidden third student mode. */
    event.preventDefault();
    event.stopImmediatePropagation();
    returnToPractice();
  }

  function wire(){
    if (typeof document==='undefined') return;
    injectStyles();
    suppressLegacyTopicalUi();
    if (typeof window!=='undefined') window.addEventListener('click',onWindowCapture,true);

    /* One-shot follow-ups cover deferred Learn-shell assembly without adding a
       permanent MutationObserver to the page. CSS already suppresses late mounts. */
    window.setTimeout(suppressLegacyTopicalUi,0);
    window.setTimeout(suppressLegacyTopicalUi,250);
  }

  const api=Object.freeze({MODE_BUTTON_ID,LIBRARY_ID,suppressLegacyTopicalUi});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V53CTwoModeStudentUi',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
