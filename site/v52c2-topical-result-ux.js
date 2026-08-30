/* V5.2C.2 — Topical Practice result UX polish.
   Presentation/navigation-only layer for completed topical sessions. It keeps ordinary
   Practice results unchanged and reopens the same set only through the published V5.2C library. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v52c2TopicalResultUxInstalled) return;
  ROOT.__v52c2TopicalResultUxInstalled = true;

  const RESULT_ID = 'result';
  const AGAIN_ID = 'again-btn';
  const MODE_BUTTON_ID = 'v52c-topical-mode-btn';
  const LIBRARY_ID = 'v52c-student-topical-library';
  const STYLE_ID = 'v52c2-topical-result-ux-style';
  const lastTopical = { source:'', year:0, count:0 };

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const isStruggleAction = text => /^(?:practice|practise) what i struggled with$/i.test(trim(text));

  function injectStyles(){
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html[data-theme="dark"] #${LIBRARY_ID} .v52c-set-card{
        background:var(--card);
        color:var(--text);
      }
      html[data-theme="dark"] #${LIBRARY_ID} .v52c-set-card.selected{
        background:var(--soft);
      }
    `;
    document.head.appendChild(style);
  }

  function topicalContext(){
    try {
      const source = trim(state?.topicalSource);
      if (!source) return null;
      return {
        source,
        year:Number(state?.year || document.getElementById('year-level')?.value || 0),
        count:Number(state?.count || document.getElementById('question-count')?.value || 5)
      };
    } catch { return null; }
  }

  function rememberText(node,key){
    if (!node || node.dataset[key] != null) return;
    node.dataset[key] = node.textContent || '';
  }

  function setTextIfChanged(node,text){
    if (node && node.textContent !== text) node.textContent = text;
  }

  function restoreText(node,key){
    if (!node || node.dataset[key] == null) return;
    setTextIfChanged(node,node.dataset[key]);
    delete node.dataset[key];
  }

  function topicalPrivacyText(){
    return 'Treat this code as private. Anyone with the code can view this Topical Practice result.';
  }

  function restoreOrdinaryResult(result){
    result.removeAttribute('data-v52c2-topical-result');
    const heading=result.querySelector('h1');
    const again=document.getElementById(AGAIN_ID);
    const privacy=document.querySelector('#result-code-box .help');
    restoreText(heading,'v52c2OriginalText');
    restoreText(again,'v52c2OriginalText');
    restoreText(privacy,'v52c2OriginalText');
    result.querySelectorAll('[data-v52c2-topical-hidden="1"]').forEach(node=>{
      node.classList.remove('hidden');
      delete node.dataset.v52c2TopicalHidden;
    });
  }

  function decorateResult(){
    if (typeof document === 'undefined') return;
    const result=document.getElementById(RESULT_ID);
    if (!result || !result.classList.contains('active')) return;

    const context=topicalContext();
    if (!context){
      restoreOrdinaryResult(result);
      return;
    }

    Object.assign(lastTopical,context);
    result.dataset.v52c2TopicalResult='1';

    const heading=result.querySelector('h1');
    const again=document.getElementById(AGAIN_ID);
    const privacy=document.querySelector('#result-code-box .help');
    rememberText(heading,'v52c2OriginalText');
    rememberText(again,'v52c2OriginalText');
    rememberText(privacy,'v52c2OriginalText');
    setTextIfChanged(heading,'Topical Practice Complete');
    setTextIfChanged(again,'Practise this topical set again');
    setTextIfChanged(privacy,topicalPrivacyText());

    result.querySelectorAll('button').forEach(button=>{
      if (button.id===AGAIN_ID || !isStruggleAction(button.textContent)) return;
      if (button.dataset.v52c2TopicalHidden==='1') return;
      button.dataset.v52c2TopicalHidden='1';
      button.classList.add('hidden');
    });
  }

  function waitForPublishedSet(source,timeoutMs=7000){
    return new Promise(resolve=>{
      const started=Date.now();
      const tick=()=>{
        const root=document.getElementById(LIBRARY_ID);
        const cards=[...(root?.querySelectorAll('.v52c-set-card') || [])];
        const match=cards.find(card=>norm(card.dataset.source)===norm(source));
        if (match) return resolve(match);
        if (Date.now()-started>=timeoutMs) return resolve(null);
        window.setTimeout(tick,100);
      };
      tick();
    });
  }

  async function reopenLastTopical(){
    const context={...lastTopical};
    if (!context.source) return false;

    if (typeof show === 'function') show('start');
    const year=document.getElementById('year-level');
    const count=document.getElementById('question-count');
    if (year && context.year) year.value=String(context.year);
    if (count && context.count) count.value=String(context.count);

    const topical=document.getElementById(MODE_BUTTON_ID);
    if (!topical){
      window.alert('Topical Practice is not available right now. Please return to Learn and try again.');
      return false;
    }

    topical.click();
    const card=await waitForPublishedSet(context.source);
    if (!card){
      window.alert('This topical exercise is no longer available. Choose another teacher-published topical exercise.');
      return false;
    }

    card.click();
    if (count && context.count) count.value=String(context.count);
    card.scrollIntoView?.({behavior:'smooth',block:'center'});
    return true;
  }

  function onCaptureClick(event){
    const again=event.target?.closest?.(`#${AGAIN_ID}`);
    if (!again) return;
    const result=document.getElementById(RESULT_ID);
    if (result?.dataset.v52c2TopicalResult!=='1') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void reopenLastTopical();
  }

  function wire(){
    if (typeof document === 'undefined') return;
    injectStyles();
    const result=document.getElementById(RESULT_ID);
    if (!result) return;
    document.addEventListener('click',onCaptureClick,true);
    if (typeof MutationObserver !== 'undefined'){
      new MutationObserver(decorateResult).observe(result,{
        attributes:true,
        attributeFilter:['class']
      });
    }
    decorateResult();
  }

  const api=Object.freeze({norm,isStruggleAction,topicalPrivacyText});
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V52C2TopicalResultUx',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
