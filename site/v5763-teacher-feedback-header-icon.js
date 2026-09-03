/* V5.7.6.3 — Teacher feedback header icon polish.
   Keeps the accepted V5.7.6 teacher Feedback Inbox workflow unchanged while
   presenting a compact icon beside the Teacher Dashboard title. The original
   inbox trigger remains in its existing host and is hidden rather than reparented. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if(ROOT.__v5763TeacherFeedbackHeaderIconInstalled) return;
  ROOT.__v5763TeacherFeedbackHeaderIconInstalled=true;

  const SOURCE_ID='v576-feedback-inbox';
  const ICON_ID='v5763-teacher-feedback-icon';
  const STYLE_ID='v5763-teacher-feedback-header-icon-style';
  const TITLE_BLOCK_SELECTOR='#teacher > .header > div:first-child';

  function injectStyles(){
    if(typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #teacher > .header > .v5763-teacher-title-block{
        display:grid;
        grid-template-columns:minmax(0,auto) auto;
        grid-template-areas:'title feedback' 'subtitle subtitle';
        justify-content:start;
        align-items:center;
        column-gap:9px;
      }
      #teacher > .header > .v5763-teacher-title-block > h1{grid-area:title}
      #teacher > .header > .v5763-teacher-title-block > #teacher-subtitle{grid-area:subtitle}
      #teacher #${SOURCE_ID}.v5763-feedback-source{display:none!important}
      #teacher #${ICON_ID}{
        grid-area:feedback;
        width:38px;height:38px;min-width:38px;min-height:38px;padding:0;
        display:grid;place-items:center;border-radius:50%;
        font-size:17px;line-height:1;box-shadow:0 5px 14px rgba(15,23,42,.12);
        margin-top:-3px;
      }
      #teacher #${ICON_ID}:hover{transform:translateY(-1px)}
      #teacher #${ICON_ID}:focus-visible{outline:3px solid color-mix(in srgb,var(--primary) 35%,transparent);outline-offset:2px}
      @media(max-width:520px){
        #teacher > .header > .v5763-teacher-title-block{column-gap:7px}
        #teacher #${ICON_ID}{width:36px;height:36px;min-width:36px;min-height:36px;font-size:16px}
      }
    `;
    document.head.appendChild(style);
  }

  function positionTeacherTrigger(){
    if(typeof document==='undefined') return false;
    const source=document.getElementById(SOURCE_ID);
    const titleBlock=document.querySelector(TITLE_BLOCK_SELECTOR);
    const title=titleBlock?.querySelector('h1');
    let icon=document.getElementById(ICON_ID);

    if(!source || !titleBlock || !title || !/Teacher Dashboard/i.test(title.textContent||'')){
      icon?.remove();
      return false;
    }

    source.classList.add('v5763-feedback-source');
    titleBlock.classList.add('v5763-teacher-title-block');

    if(!icon){
      icon=document.createElement('button');
      icon.id=ICON_ID;
      icon.type='button';
      icon.className='outline';
      icon.textContent='💬';
      icon.setAttribute('aria-label','Feedback Inbox');
      icon.setAttribute('title','Feedback Inbox');
      icon.addEventListener('click',event=>{
        event.preventDefault();
        const currentSource=document.getElementById(SOURCE_ID);
        if(currentSource) currentSource.click();
        else ROOT.V576ClassroomFeedbackSupport?.openTeacherFeedback?.();
      });
      titleBlock.appendChild(icon);
    }
    return true;
  }

  function wire(){
    if(typeof document==='undefined') return false;
    injectStyles();
    positionTeacherTrigger();
    window.addEventListener('pageshow',()=>setTimeout(positionTeacherTrigger,80));
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('#teacher-btn,.back-home')) setTimeout(positionTeacherTrigger,100);
    },true);
    if(typeof MutationObserver!=='undefined'){
      let queued=false;
      new MutationObserver(()=>{
        if(queued) return;
        queued=true;
        queueMicrotask(()=>{queued=false;positionTeacherTrigger();});
      }).observe(document.body,{childList:true,subtree:true});
    }
    return true;
  }

  const api=Object.freeze({positionTeacherTrigger});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(typeof window!=='undefined'){
    Object.defineProperty(window,'V5763TeacherFeedbackHeaderIcon',{value:api,writable:false,configurable:false});
    wire();
  }
})();