/* V5.8D — Content Workflow Consolidation.
   Presentation/navigation only. Connects the established import, QA, review,
   Practice-eligibility, topical publication and correction-history tools into one
   source-aware teacher workflow without moving or duplicating their authority. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if(ROOT.__v58dContentWorkflowInstalled) return;
  ROOT.__v58dContentWorkflowInstalled=true;

  const STYLE_ID='v58d-content-workflow-style';
  const IMPORT_ID='v58d-content-workflow-import';
  const QUESTIONS_ID='v58d-content-workflow-questions';
  const WORKSPACE_SHORTCUT_ID='v58d-workspace-content-workflow';
  const STATUS_ID='v58d-content-workflow-status';
  let retryTimer=0;
  let highlightTimer=0;

  const STEPS=Object.freeze([
    Object.freeze({
      key:'import',number:'1',title:'Import',badge:'Start here',panel:'import-panel',
      description:'Preview the permanent paper package or CSV with the existing import tools.',
      anchors:Object.freeze(['#v51a4-package-panel','#import-panel .dropzone','#import-summary'])
    }),
    Object.freeze({
      key:'validate',number:'2',title:'Validate',badge:'Existing QA',panel:'import-panel',
      description:'Run package preview, paper-profile checks and post-import integrity verification.',
      anchors:Object.freeze(['#v51a4-package-panel','#v51-paper-profile-audit','#v51a6-integrity-panel','#import-summary'])
    }),
    Object.freeze({
      key:'review',number:'3',title:'Review',badge:'Question Bank',panel:'questions-panel',
      description:'Use QA flags, filters and the established Needs Review / Reviewed workflow.',
      anchors:Object.freeze(['#v51b1-question-bank-qa','#v51b2c-review-workflow','#question-bank-count'])
    }),
    Object.freeze({
      key:'practice',number:'4',title:'Practice availability',badge:'Practice-first',panel:'questions-panel',
      description:'Control which reviewed resources can appear in ordinary Practice.',
      anchors:Object.freeze(['#v54a-resource-bank-summary','#v54b-eligibility-feedback','#question-bank-count'])
    }),
    Object.freeze({
      key:'publish',number:'5',title:'Publish topical set',badge:'Topical only',panel:'questions-panel',
      description:'For topical exercises, use the existing whole-set publication gate after review.',
      anchors:Object.freeze(['#v52b-topical-library','#v52b-cards','#question-bank-count'])
    }),
    Object.freeze({
      key:'audit',number:'6',title:'Audit history',badge:'Read only',panel:'questions-panel',
      description:'Select one question and inspect its database-tracked correction history.',
      anchors:Object.freeze(['#v51b2d-question-history','#v51b2c-review-workflow','#question-bank-count'])
    })
  ]);

  const byId=id=>typeof document==='undefined'?null:document.getElementById(id);
  const teacherRoot=()=>byId('teacher');

  function injectStyles(){
    if(typeof document==='undefined' || byId(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${IMPORT_ID},#${QUESTIONS_ID}{
        margin:14px 0 16px;border:1px solid color-mix(in srgb,var(--primary) 24%,var(--border));
        border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--soft) 28%,var(--card)),var(--card));overflow:hidden
      }
      .v58d-workflow-summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 14px;font-weight:900}
      .v58d-workflow-summary::-webkit-details-marker{display:none}
      .v58d-workflow-summary-main{display:grid;gap:2px;min-width:0}
      .v58d-workflow-summary-main strong{font-size:14px;line-height:1.3}
      .v58d-workflow-summary-main span{font-size:10px;color:var(--muted);font-weight:650;line-height:1.4}
      .v58d-workflow-toggle{font-size:10px;color:var(--primary);white-space:nowrap}
      details[open]>.v58d-workflow-summary .v58d-workflow-toggle::after{content:'Hide'}
      details:not([open])>.v58d-workflow-summary .v58d-workflow-toggle::after{content:'Show'}
      .v58d-workflow-body{padding:0 12px 12px}
      .v58d-workflow-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .v58d-step{min-height:88px;padding:10px;text-align:left;border:1px solid var(--border);background:var(--card);color:var(--text);display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:start}
      .v58d-step:hover{border-color:color-mix(in srgb,var(--primary) 46%,var(--border));background:color-mix(in srgb,var(--soft) 32%,var(--card))}
      .v58d-step-number{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--soft);color:var(--primary);font-size:12px;font-weight:950}
      .v58d-step-copy{display:grid;gap:2px;min-width:0}
      .v58d-step-title{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;font-weight:900;line-height:1.3}
      .v58d-step-badge{display:inline-flex;border-radius:999px;padding:2px 6px;background:var(--surface-chip,var(--soft));color:var(--muted);font-size:8px;font-weight:800}
      .v58d-step-desc{font-size:9px;color:var(--muted);font-weight:600;line-height:1.4}
      .v58d-route-notes{display:grid;gap:5px;margin-top:9px;padding:9px 10px;border:1px dashed var(--border);border-radius:11px;background:color-mix(in srgb,var(--soft) 13%,var(--card));font-size:9px;color:var(--muted);line-height:1.45}
      .v58d-route-notes strong{color:var(--text)}
      #${STATUS_ID}{min-height:16px;margin-top:8px;font-size:9px;color:var(--muted);font-weight:700}
      #${STATUS_ID}.warn{color:var(--warn)}
      .v58d-highlight{outline:3px solid color-mix(in srgb,var(--primary) 34%,transparent)!important;outline-offset:4px!important;border-radius:10px}
      @media(max-width:820px){.v58d-workflow-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.v58d-workflow-grid{grid-template-columns:1fr}.v58d-workflow-summary-main span{display:none}.v58d-step{min-height:0}}
    `;
    document.head.appendChild(style);
  }

  function stepMarkup(step){
    return `<button type="button" class="v58d-step" data-v58d-step="${step.key}">
      <span class="v58d-step-number">${step.number}</span>
      <span class="v58d-step-copy"><span class="v58d-step-title">${step.title}<span class="v58d-step-badge">${step.badge}</span></span><span class="v58d-step-desc">${step.description}</span></span>
    </button>`;
  }

  function workflowMarkup(){
    return `
      <summary class="v58d-workflow-summary" aria-label="Content workflow">
        <span class="v58d-workflow-summary-main"><strong>Content Workflow</strong><span>One route through the existing import, QA, availability and audit tools.</span></span>
        <span class="v58d-workflow-toggle" aria-hidden="true"></span>
      </summary>
      <div class="v58d-workflow-body">
        <div class="v58d-workflow-grid">${STEPS.map(stepMarkup).join('')}</div>
        <div class="v58d-route-notes">
          <div><strong>Ordinary Practice / past-paper Practice:</strong> after review, Practice eligibility is the student-availability control. Skip Step 5.</div>
          <div><strong>Topical exercises:</strong> use Step 5 to publish the reviewed whole set through the existing Topical Exercise Library.</div>
          <div><strong>Exam papers:</strong> Exam publication remains under Exam Settings and is intentionally not promoted here while Exam Mode is deferred.</div>
        </div>
        <div id="${STATUS_ID}" role="status" aria-live="polite"></div>
      </div>`;
  }

  function ensureHub(panelId,id){
    const panel=byId(panelId);
    if(!panel) return null;
    let hub=byId(id);
    if(!hub){
      hub=document.createElement('details');
      hub.id=id;
      hub.open=true;
      hub.innerHTML=workflowMarkup();
      if(panelId==='questions-panel'){
        const header=panel.querySelector(':scope > .header');
        if(header) header.insertAdjacentElement('afterend',hub); else panel.prepend(hub);
      }else{
        const intro=panel.querySelector(':scope > p.muted');
        if(intro) intro.insertAdjacentElement('afterend',hub); else panel.prepend(hub);
      }
    }
    return hub;
  }

  function ensureWorkspaceShortcut(){
    if(typeof document==='undefined' || byId(WORKSPACE_SHORTCUT_ID)) return;
    const tools=document.querySelector('#v58b-teacher-workspace [data-v58b-group="content"] .v58b-tools');
    if(!tools) return;
    const button=document.createElement('button');
    button.id=WORKSPACE_SHORTCUT_ID;
    button.type='button';
    button.className='v58b-tool';
    button.innerHTML='<strong>Content Workflow</strong><span>Import → QA → Practice availability → audit</span>';
    button.title='Open the consolidated content workflow';
    button.addEventListener('click',()=>openStep('review'));
    tools.prepend(button);
  }

  function tabFor(panel){
    return typeof document==='undefined'?null:document.querySelector(`#teacher .tab[data-panel="${panel}"]`);
  }

  function stepByKey(key){ return STEPS.find(step=>step.key===key) || null; }

  function firstTarget(step){
    for(const selector of step?.anchors || []){
      const node=document.querySelector(selector);
      if(node) return node;
    }
    return byId(step?.panel || '');
  }

  function setStatus(message,kind=''){
    const nodes=document.querySelectorAll(`#${IMPORT_ID} #${STATUS_ID},#${QUESTIONS_ID} #${STATUS_ID}`);
    nodes.forEach(node=>{ node.textContent=message||''; node.className=kind==='warn'?'warn':''; });
  }

  function highlight(node){
    if(!node) return;
    document.querySelectorAll('.v58d-highlight').forEach(item=>item.classList.remove('v58d-highlight'));
    node.classList.add('v58d-highlight');
    if(highlightTimer) window.clearTimeout(highlightTimer);
    highlightTimer=window.setTimeout(()=>node.classList.remove('v58d-highlight'),2200);
  }

  function openStep(key,attempt=0){
    const step=stepByKey(key);
    if(!step) return false;
    const tab=tabFor(step.panel);
    if(tab) tab.click();

    window.setTimeout(()=>{
      const target=firstTarget(step);
      if(target && target!==byId(step.panel)){
        target.scrollIntoView?.({behavior:'smooth',block:'start'});
        highlight(target);
        setStatus(`Opened Step ${step.number}: ${step.title}.`);
        return;
      }
      if(attempt<14){
        openStep(key,attempt+1);
        return;
      }
      const panel=byId(step.panel);
      panel?.scrollIntoView?.({behavior:'smooth',block:'start'});
      setStatus(`${step.title} is still loading. The correct teacher panel is open; try again after Refresh if the existing tool does not appear.`,'warn');
    },attempt?100:70);
    return true;
  }

  function wireHub(hub){
    if(!hub || hub.dataset.v58dWired==='1') return;
    hub.dataset.v58dWired='1';
    hub.addEventListener('click',event=>{
      const button=event.target.closest('[data-v58d-step]');
      if(!button || !hub.contains(button)) return;
      openStep(button.dataset.v58dStep||'');
    });
  }

  function ensureAll(){
    injectStyles();
    wireHub(ensureHub('import-panel',IMPORT_ID));
    wireHub(ensureHub('questions-panel',QUESTIONS_ID));
    ensureWorkspaceShortcut();
  }

  function scheduleEnsure(){
    if(typeof window==='undefined') return;
    if(retryTimer) window.clearTimeout(retryTimer);
    retryTimer=window.setTimeout(()=>{retryTimer=0;ensureAll();},70);
  }

  function wire(){
    if(typeof document==='undefined') return;
    ensureAll();
    const root=teacherRoot();
    if(root && typeof MutationObserver!=='undefined'){
      new MutationObserver(scheduleEnsure).observe(root,{childList:true,subtree:true});
    }
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('.tab[data-panel="questions-panel"],.tab[data-panel="import-panel"]')) scheduleEnsure();
    });
  }

  const api=Object.freeze({STEPS,stepByKey,openStep});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(typeof window!=='undefined'){
    Object.defineProperty(window,'V58DContentWorkflow',{value:api,writable:false,configurable:false});
    if(typeof document!=='undefined'){
      if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
