/* V5.7.6.3 — Teacher feedback toolbar polish.
   Keeps the accepted V5.7.6 teacher Feedback Inbox workflow unchanged while
   presenting Feedback as a normal Teacher Dashboard utility action. The original
   inbox trigger remains the workflow owner and is hidden rather than reparented. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if(ROOT.__v5763TeacherFeedbackHeaderIconInstalled) return;
  ROOT.__v5763TeacherFeedbackHeaderIconInstalled=true;

  const SOURCE_ID='v576-feedback-inbox';
  const ICON_ID='v5763-teacher-feedback-icon';
  const STYLE_ID='v5763-teacher-feedback-header-icon-style';
  const HEADER_SELECTOR='#teacher > .header';
  const TOOLBAR_SELECTOR='#teacher > .header > .toolbar';
  const PRIMARY_GROUP_ID='v5763-teacher-primary-actions';
  const ACCOUNT_GROUP_ID='v5763-teacher-account-actions';

  function injectStyles(){
    if(typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #teacher > .header.v5763-teacher-header{
        display:grid;
        grid-template-columns:minmax(230px,.8fr) minmax(0,1.4fr);
        gap:20px;
        align-items:start;
      }
      #teacher > .header > .toolbar.v5763-teacher-toolbar{
        display:grid;
        gap:10px;
        justify-items:end;
        align-content:start;
        min-width:0;
      }
      #teacher #${PRIMARY_GROUP_ID},
      #teacher #${ACCOUNT_GROUP_ID}{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        justify-content:flex-end;
        align-items:center;
      }
      #teacher #${SOURCE_ID}.v5763-feedback-source{display:none!important}
      #teacher #${ICON_ID}{
        min-height:46px;
        padding:11px 15px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        white-space:nowrap;
      }
      #teacher #${ICON_ID} .v5763-feedback-symbol{font-size:16px;line-height:1}
      #teacher #${ICON_ID}:hover{transform:translateY(-1px)}
      #teacher #${ICON_ID}:focus-visible{outline:3px solid color-mix(in srgb,var(--primary) 35%,transparent);outline-offset:2px}
      @media(max-width:760px){
        #teacher > .header.v5763-teacher-header{grid-template-columns:1fr;gap:14px}
        #teacher > .header > .toolbar.v5763-teacher-toolbar{justify-items:start;width:100%}
        #teacher #${PRIMARY_GROUP_ID},#teacher #${ACCOUNT_GROUP_ID}{justify-content:flex-start}
      }
      @media(max-width:520px){
        #teacher #${ICON_ID}{
          width:42px;height:42px;min-width:42px;min-height:42px;padding:0;
          border-radius:13px;
        }
        #teacher #${ICON_ID} .v5763-feedback-label{display:none}
        #teacher #${ICON_ID} .v5763-feedback-symbol{font-size:17px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureGroup(toolbar,id){
    let group=document.getElementById(id);
    if(!group){
      group=document.createElement('div');
      group.id=id;
      toolbar.appendChild(group);
    }
    return group;
  }

  function moveInto(node,group){
    if(node && group && node.parentElement!==group) group.appendChild(node);
  }

  function organizeToolbar(){
    if(typeof document==='undefined') return null;
    const header=document.querySelector(HEADER_SELECTOR);
    const toolbar=document.querySelector(TOOLBAR_SELECTOR);
    if(!header || !toolbar) return null;

    header.classList.add('v5763-teacher-header');
    toolbar.classList.add('v5763-teacher-toolbar');

    const primary=ensureGroup(toolbar,PRIMARY_GROUP_ID);
    const account=ensureGroup(toolbar,ACCOUNT_GROUP_ID);

    moveInto(document.getElementById('teacher-mode'),primary);
    moveInto(document.getElementById('refresh-btn'),primary);
    moveInto(toolbar.querySelector('.back-home'),primary);
    moveInto(document.getElementById('change-password-btn'),account);
    moveInto(document.getElementById('signout-btn'),account);

    return {toolbar,primary,account};
  }

  function positionTeacherTrigger(){
    if(typeof document==='undefined') return false;
    const source=document.getElementById(SOURCE_ID);
    const groups=organizeToolbar();
    let icon=document.getElementById(ICON_ID);

    if(!source || !groups?.primary){
      icon?.remove();
      return false;
    }

    source.classList.add('v5763-feedback-source');

    if(!icon){
      icon=document.createElement('button');
      icon.id=ICON_ID;
      icon.type='button';
      icon.className='outline';
      icon.innerHTML='<span class="v5763-feedback-symbol" aria-hidden="true">💬</span><span class="v5763-feedback-label">Feedback</span>';
      icon.setAttribute('aria-label','Feedback Inbox');
      icon.setAttribute('title','Feedback Inbox');
      icon.addEventListener('click',event=>{
        event.preventDefault();
        const currentSource=document.getElementById(SOURCE_ID);
        if(currentSource) currentSource.click();
        else ROOT.V576ClassroomFeedbackSupport?.openTeacherFeedback?.();
      });
    }

    const home=groups.primary.querySelector('.back-home');
    if(icon.parentElement!==groups.primary){
      if(home) home.insertAdjacentElement('beforebegin',icon);
      else groups.primary.appendChild(icon);
    }else if(home && icon.nextElementSibling!==home){
      home.insertAdjacentElement('beforebegin',icon);
    }
    return true;
  }

  function wire(){
    if(typeof document==='undefined') return false;
    injectStyles();
    organizeToolbar();
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

  const api=Object.freeze({organizeToolbar,positionTeacherTrigger});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(typeof window!=='undefined'){
    Object.defineProperty(window,'V5763TeacherFeedbackHeaderIcon',{value:api,writable:false,configurable:false});
    wire();
  }
})();