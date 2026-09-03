/* V5.7.6.1 — Student feedback trigger position polish.
   Keeps the accepted V5.7.6 feedback workflow unchanged while moving the student
   trigger to a compact top-right icon on the signed-in Home hero. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if(ROOT.__v5761FeedbackTriggerPositionInstalled) return;
  ROOT.__v5761FeedbackTriggerPositionInstalled=true;

  const TRIGGER_ID='v576-send-feedback';
  const STYLE_ID='v5761-feedback-trigger-position-style';
  const HERO_SELECTOR='#start .v40-learning-hub-hero';

  function injectStyles(){
    if(typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #start .v40-learning-hub-hero.v5761-feedback-host{position:relative;padding-right:max(64px,calc(1rem + 48px))}
      #start #${TRIGGER_ID}.v5761-feedback-icon{
        position:absolute;top:10px;right:10px;z-index:4;
        width:42px;height:42px;min-width:42px;min-height:42px;padding:0;
        display:grid;place-items:center;border-radius:50%;
        font-size:18px;line-height:1;box-shadow:0 6px 18px rgba(15,23,42,.14);
      }
      #start #${TRIGGER_ID}.v5761-feedback-icon:hover{transform:translateY(-1px)}
      #start #${TRIGGER_ID}.v5761-feedback-icon:focus-visible{outline:3px solid color-mix(in srgb,var(--primary) 35%,transparent);outline-offset:2px}
      @media(max-width:520px){
        #start .v40-learning-hub-hero.v5761-feedback-host{padding-right:58px}
        #start #${TRIGGER_ID}.v5761-feedback-icon{top:8px;right:8px;width:40px;height:40px;min-width:40px;min-height:40px}
      }
    `;
    document.head.appendChild(style);
  }

  function positionTrigger(){
    if(typeof document==='undefined') return false;
    const button=document.getElementById(TRIGGER_ID);
    if(!button) return false;
    const hero=document.querySelector(HERO_SELECTOR);
    button.textContent='💬';
    button.setAttribute('aria-label','Send feedback');
    button.setAttribute('title','Send feedback');
    button.classList.add('v5761-feedback-icon');
    if(hero){
      hero.classList.add('v5761-feedback-host');
      if(button.parentElement!==hero) hero.appendChild(button);
    }
    return true;
  }

  function wire(){
    if(typeof document==='undefined') return false;
    injectStyles();
    positionTrigger();
    window.addEventListener('v57c:home-updated',()=>setTimeout(positionTrigger,0));
    window.addEventListener('pageshow',()=>setTimeout(positionTrigger,80));
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('[data-v40-nav="home"],.back-home')) setTimeout(positionTrigger,100);
    },true);
    if(typeof MutationObserver!=='undefined'){
      new MutationObserver(()=>positionTrigger()).observe(document.body,{childList:true,subtree:true});
    }
    return true;
  }

  const api=Object.freeze({positionTrigger});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(typeof window!=='undefined'){
    Object.defineProperty(window,'V5761FeedbackTriggerPosition',{value:api,writable:false,configurable:false});
    wire();
  }
})();