/* V5.8B — Teacher Workspace Consolidation.
   Presentation/navigation only. Groups established teacher tools by task without
   creating another analytics, assignment, reporting, content or support system.
   Existing tabs, overlays, RPCs, grading, Practice/Exam and data ownership stay
   with their accepted feature layers. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if(ROOT.__v58bTeacherWorkspaceInstalled) return;
  ROOT.__v58bTeacherWorkspaceInstalled=true;

  const WORKSPACE_ID='v58b-teacher-workspace';
  const STYLE_ID='v58b-teacher-workspace-style';
  const STATUS_ID='v58b-teacher-workspace-status';
  const ALL_TOOLS_ID='v58b-all-tools-label';
  const SUBTITLE='Plan, monitor, support and manage learning in one workspace.';
  let retryTimer=0;
  let statusTimer=0;
  let installed=false;

  const GROUPS=Object.freeze([
    Object.freeze({
      key:'monitor',icon:'📊',title:'Monitor',description:'See participation, learning evidence and priority follow-up.',
      tools:Object.freeze([
        Object.freeze({key:'analytics',label:'Analytics',description:'Participation and learning evidence',panel:'analytics-panel'}),
        Object.freeze({key:'action-center',label:'Action Center',description:'Priority learners and next actions',panel:'analytics-panel',anchor:'.v42-action-center'}),
        Object.freeze({key:'past-paper-analytics',label:'Past Paper Analytics',description:'Practice-mode paper evidence',trigger:'v56d-open-past-paper-analytics'})
      ])
    }),
    Object.freeze({
      key:'teach',icon:'🎯',title:'Teach',description:'Assign work, review responses and support motivation.',
      tools:Object.freeze([
        Object.freeze({key:'assignments',label:'Classes & Assignments',description:'Class and assignment tools',panel:'classes-panel'}),
        Object.freeze({key:'review',label:'Review Queue',description:'Teacher-marked responses',panel:'review-panel'}),
        Object.freeze({key:'motivation',label:'Class Motivation',description:'XP, streaks and weekly missions',trigger:'v573-open-class-motivation'})
      ])
    }),
    Object.freeze({
      key:'students',icon:'👥',title:'Students',description:'Manage access, roster operations and launch preparation.',
      tools:Object.freeze([
        Object.freeze({key:'student-access',label:'Student Access',description:'Access mode and PIN controls',panel:'access-panel'}),
        Object.freeze({key:'operations',label:'Teacher Operations',description:'Roster, transfers and assignment admin',panel:'teacher-operations-panel'}),
        Object.freeze({key:'launch-readiness',label:'Launch Readiness',description:'Roster, PIN and launch checks',panel:'launch-readiness-panel'})
      ])
    }),
    Object.freeze({
      key:'content',icon:'🧩',title:'Content',description:'Maintain the existing question and import workflows.',
      tools:Object.freeze([
        Object.freeze({key:'question-bank',label:'Question Bank',description:'Questions, QA and publication controls',panel:'questions-panel'}),
        Object.freeze({key:'bulk-import',label:'Bulk Import',description:'Import paper and exercise content',panel:'import-panel'})
      ])
    }),
    Object.freeze({
      key:'reports-support',icon:'📄',title:'Reports & Support',description:'Open established reports, archive and feedback tools.',
      tools:Object.freeze([
        Object.freeze({key:'class-report',label:'Class Report',description:'Current Analytics scope',trigger:'v50c1-open-class-report'}),
        Object.freeze({key:'student-reports',label:'Student Reports',description:'Choose a learner from Analytics',custom:'student-reports'}),
        Object.freeze({key:'report-archive',label:'Report Archive',description:'Saved report snapshots',panel:'report-archive-panel'}),
        Object.freeze({key:'feedback',label:'Feedback Inbox',description:'Student problems, questions and suggestions',trigger:'v5763-teacher-feedback-icon',fallbackTrigger:'v576-feedback-inbox'})
      ])
    })
  ]);

  function teacherRoot(){
    return typeof document==='undefined'?null:document.getElementById('teacher');
  }

  function injectStyles(){
    if(typeof document==='undefined' || document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #teacher #${WORKSPACE_ID}{
        margin:18px 0 12px;border:1px solid color-mix(in srgb,var(--primary) 24%,var(--border));
        border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--soft) 34%,var(--card)),var(--card));
        overflow:hidden
      }
      #teacher #${WORKSPACE_ID}>summary{
        list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:14px;align-items:center;
        padding:15px 16px;font-weight:900
      }
      #teacher #${WORKSPACE_ID}>summary::-webkit-details-marker{display:none}
      #teacher .v58b-summary-main{display:grid;gap:2px;min-width:0}
      #teacher .v58b-summary-main strong{font-size:16px;line-height:1.3}
      #teacher .v58b-summary-main span{font-size:11px;color:var(--muted);font-weight:650;line-height:1.4}
      #teacher .v58b-summary-toggle{font-size:11px;color:var(--primary);white-space:nowrap}
      #teacher #${WORKSPACE_ID}[open] .v58b-summary-toggle::after{content:'Hide'}
      #teacher #${WORKSPACE_ID}:not([open]) .v58b-summary-toggle::after{content:'Show'}
      #teacher .v58b-body{padding:0 14px 14px}
      #teacher .v58b-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
      #teacher .v58b-group{border:1px solid var(--border);border-radius:15px;padding:13px;background:var(--card);min-width:0}
      #teacher .v58b-group-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:start;margin-bottom:10px}
      #teacher .v58b-group-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:var(--soft);font-size:17px}
      #teacher .v58b-group h3{margin:0 0 2px;font-size:14px;line-height:1.25}
      #teacher .v58b-group p{margin:0;color:var(--muted);font-size:10px;line-height:1.4}
      #teacher .v58b-tools{display:grid;gap:7px}
      #teacher .v58b-tool{width:100%;min-height:48px;padding:9px 10px;text-align:left;border:1px solid var(--border);background:color-mix(in srgb,var(--soft) 12%,var(--card));color:var(--text);display:grid;gap:2px}
      #teacher .v58b-tool:hover{border-color:color-mix(in srgb,var(--primary) 45%,var(--border));background:color-mix(in srgb,var(--soft) 42%,var(--card))}
      #teacher .v58b-tool strong{font-size:11px;line-height:1.3}
      #teacher .v58b-tool span{font-size:9px;color:var(--muted);font-weight:600;line-height:1.35}
      #teacher .v58b-tool[data-v58b-ready="false"]{opacity:.72}
      #teacher #${STATUS_ID}{min-height:18px;margin-top:9px;font-size:10px;color:var(--muted);font-weight:700}
      #teacher #${STATUS_ID}.v58b-warn{color:var(--warn)}
      #teacher .v58b-workspace-note{margin:8px 2px 0;color:var(--muted);font-size:9px;line-height:1.45}
      #teacher #${ALL_TOOLS_ID}{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:15px 0 5px;font-size:10px;color:var(--muted);font-weight:750}
      #teacher #${ALL_TOOLS_ID} strong{color:var(--text);font-size:11px}
      #teacher> .tabs.v58b-all-tools-tabs{margin-top:7px}
      html[data-theme="dark"] #teacher #${WORKSPACE_ID}{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 9%,var(--card)),var(--card))}
      @media(max-width:760px){
        #teacher #${WORKSPACE_ID}>summary{padding:13px}
        #teacher .v58b-body{padding:0 11px 11px}
        #teacher .v58b-grid{grid-template-columns:1fr}
        #teacher #${ALL_TOOLS_ID}{align-items:flex-start;flex-direction:column;gap:2px}
      }
      @media(max-width:480px){
        #teacher .v58b-summary-main span{display:none}
        #teacher .v58b-group{padding:11px}
      }
    `;
    document.head.appendChild(style);
  }

  function toolButtonMarkup(tool){
    return `<button type="button" class="v58b-tool" data-v58b-tool="${tool.key}"><strong>${tool.label}</strong><span>${tool.description}</span></button>`;
  }

  function workspaceMarkup(){
    return `
      <summary aria-label="Teacher Workspace shortcuts">
        <span class="v58b-summary-main"><strong>Teacher Workspace</strong><span>Quick access grouped by what you want to do.</span></span>
        <span class="v58b-summary-toggle" aria-hidden="true"></span>
      </summary>
      <div class="v58b-body">
        <div class="v58b-grid">${GROUPS.map(group=>`
          <section class="v58b-group" data-v58b-group="${group.key}">
            <div class="v58b-group-head"><span class="v58b-group-icon" aria-hidden="true">${group.icon}</span><div><h3>${group.title}</h3><p>${group.description}</p></div></div>
            <div class="v58b-tools">${group.tools.map(toolButtonMarkup).join('')}</div>
          </section>`).join('')}</div>
        <div id="${STATUS_ID}" role="status" aria-live="polite"></div>
        <div class="v58b-workspace-note">These are shortcuts to existing teacher tools. Exam Settings and other specialist tools remain available in the full tab row below.</div>
      </div>`;
  }

  function ensureWorkspace(){
    const root=teacherRoot();
    const header=root?.querySelector(':scope > .header');
    const tabs=root?.querySelector(':scope > .tabs');
    if(!root || !header || !tabs) return false;

    let workspace=document.getElementById(WORKSPACE_ID);
    if(!workspace){
      workspace=document.createElement('details');
      workspace.id=WORKSPACE_ID;
      workspace.open=true;
      workspace.innerHTML=workspaceMarkup();
      header.insertAdjacentElement('afterend',workspace);
    } else if(workspace.previousElementSibling!==header){
      header.insertAdjacentElement('afterend',workspace);
    }

    tabs.classList.add('v58b-all-tools-tabs');
    let label=document.getElementById(ALL_TOOLS_ID);
    if(!label){
      label=document.createElement('div');
      label.id=ALL_TOOLS_ID;
      label.innerHTML='<strong>All teacher tools</strong><span>Use the original tabs anytime for the complete toolset.</span>';
      tabs.insertAdjacentElement('beforebegin',label);
    } else if(label.nextElementSibling!==tabs){
      tabs.insertAdjacentElement('beforebegin',label);
    }

    const subtitle=document.getElementById('teacher-subtitle');
    if(subtitle && subtitle.textContent!==SUBTITLE) subtitle.textContent=SUBTITLE;
    refreshAvailability();
    return true;
  }

  function allTools(){
    return GROUPS.flatMap(group=>Array.from(group.tools));
  }

  function toolByKey(key){
    return allTools().find(tool=>tool.key===key) || null;
  }

  function triggerElement(tool){
    if(!tool) return null;
    return (tool.trigger && document.getElementById(tool.trigger))
      || (tool.fallbackTrigger && document.getElementById(tool.fallbackTrigger))
      || null;
  }

  function panelTab(tool){
    if(!tool?.panel) return null;
    return document.querySelector(`#teacher .tab[data-panel="${tool.panel}"]`);
  }

  function toolReady(tool){
    if(!tool) return false;
    if(tool.custom==='student-reports') return !!panelTab({panel:'analytics-panel'});
    if(tool.trigger || tool.fallbackTrigger) return !!triggerElement(tool);
    if(tool.panel) return !!panelTab(tool);
    return false;
  }

  function refreshAvailability(){
    if(typeof document==='undefined') return;
    document.querySelectorAll(`#${WORKSPACE_ID} [data-v58b-tool]`).forEach(button=>{
      const tool=toolByKey(button.dataset.v58bTool || '');
      const ready=toolReady(tool);
      button.dataset.v58bReady=ready?'true':'false';
      button.title=ready ? `${tool?.label || 'Tool'} — open existing teacher workflow` : `${tool?.label || 'Tool'} is still loading`;
    });
  }

  function setStatus(message,kind=''){
    const root=document.getElementById(STATUS_ID);
    if(!root) return;
    if(statusTimer) window.clearTimeout(statusTimer);
    root.className=kind==='warn'?'v58b-warn':'';
    root.textContent=message || '';
    if(message){
      statusTimer=window.setTimeout(()=>{
        if(document.getElementById(STATUS_ID)===root){ root.textContent=''; root.className=''; }
      },3200);
    }
  }

  function scrollToTarget(selector){
    if(!selector) return;
    window.setTimeout(()=>{
      document.querySelector(selector)?.scrollIntoView?.({behavior:'smooth',block:'start'});
    },90);
  }

  function openPanel(tool){
    const tab=panelTab(tool);
    if(!tab) return false;
    tab.click();
    scrollToTarget(tool.anchor || `#${tool.panel}`);
    return true;
  }

  function openStudentReports(){
    const analytics=toolByKey('analytics');
    if(!openPanel(analytics)) return false;
    scrollToTarget('#analytics-students-body');
    setStatus('Choose a student in Analytics, then open the existing Student report from that learner profile.');
    return true;
  }

  function invokeTool(tool,attempt=0){
    if(!tool) return;
    if(tool.custom==='student-reports'){
      if(openStudentReports()) return;
    } else if(tool.trigger || tool.fallbackTrigger){
      const trigger=triggerElement(tool);
      if(trigger){ trigger.click(); return; }
    } else if(tool.panel && openPanel(tool)){
      return;
    }

    if(attempt<12){
      window.setTimeout(()=>invokeTool(tool,attempt+1),100);
      return;
    }
    setStatus(`${tool.label} is not ready yet. Use the full teacher tabs below or try again after Refresh.`,'warn');
    refreshAvailability();
  }

  function wireWorkspace(){
    const workspace=document.getElementById(WORKSPACE_ID);
    if(!workspace || workspace.dataset.v58bWired==='1') return;
    workspace.dataset.v58bWired='1';
    workspace.addEventListener('click',event=>{
      const button=event.target.closest('[data-v58b-tool]');
      if(!button || !workspace.contains(button)) return;
      invokeTool(toolByKey(button.dataset.v58bTool || ''));
    });
  }

  function scheduleEnsure(){
    if(typeof window==='undefined') return;
    if(retryTimer) window.clearTimeout(retryTimer);
    retryTimer=window.setTimeout(()=>{
      retryTimer=0;
      if(ensureWorkspace()) wireWorkspace();
      refreshAvailability();
    },60);
  }

  function wire(){
    if(installed || typeof document==='undefined') return installed;
    installed=true;
    injectStyles();
    ensureWorkspace();
    wireWorkspace();

    const root=teacherRoot();
    if(root){
      const observer=new MutationObserver(scheduleEnsure);
      observer.observe(root,{childList:true,subtree:true});
    }
    window.addEventListener('pageshow',scheduleEnsure);
    document.addEventListener('click',event=>{
      if(event.target?.closest?.('#teacher-btn,.back-home,#refresh-btn')) scheduleEnsure();
    },true);
    scheduleEnsure();
    return true;
  }

  const api=Object.freeze({WORKSPACE_ID,GROUPS,toolByKey,toolReady,ensureWorkspace,openPanel,invokeTool,refreshAvailability});
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  if(typeof window!=='undefined'){
    Object.defineProperty(window,'V58BTeacherWorkspaceConsolidation',{value:api,writable:false,configurable:false});
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();