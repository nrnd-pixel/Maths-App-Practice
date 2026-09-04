/* V5.8C — Parent Summary Teacher Workspace shortcut.
   Navigation-only bridge into the existing V5.8B workspace. */
(() => {
  'use strict';

  const ROOT=typeof window!=='undefined'?window:globalThis;
  if(ROOT.__v58cParentSummaryWorkspaceShortcutInstalled) return;
  ROOT.__v58cParentSummaryWorkspaceShortcutInstalled=true;

  const SHORTCUT_ID='v58c-workspace-parent-summary';
  let timer=0;

  function workspaceTools(){
    return typeof document==='undefined' ? null : document.querySelector('#v58b-teacher-workspace [data-v58b-group="reports-support"] .v58b-tools');
  }

  function showStatus(message){
    const status=document.getElementById('v58b-teacher-workspace-status');
    if(!status) return;
    status.className='';
    status.textContent=message;
    window.setTimeout(()=>{
      if(document.getElementById('v58b-teacher-workspace-status')===status && status.textContent===message) status.textContent='';
    },3600);
  }

  function openLearnerSelection(){
    const tab=document.querySelector('#teacher .tab[data-panel="analytics-panel"]');
    if(!tab){
      showStatus('Analytics is still loading. Try again after Refresh.');
      return;
    }
    tab.click();
    window.setTimeout(()=>{
      document.getElementById('analytics-students-body')?.scrollIntoView?.({behavior:'smooth',block:'start'});
      showStatus('Choose a student in Analytics, then use 👪 Parent summary in that learner profile.');
    },90);
  }

  function ensureShortcut(){
    if(typeof document==='undefined' || document.getElementById(SHORTCUT_ID)) return true;
    const tools=workspaceTools();
    if(!tools) return false;
    const button=document.createElement('button');
    button.id=SHORTCUT_ID;
    button.type='button';
    button.className='v58b-tool';
    button.innerHTML='<strong>Parent Summary</strong><span>Simple printable family progress view</span>';
    button.title='Choose a learner and open the parent-friendly progress summary';
    button.addEventListener('click',openLearnerSelection);
    const studentReports=tools.querySelector('[data-v58b-tool="student-reports"]');
    if(studentReports) studentReports.insertAdjacentElement('afterend',button);
    else tools.appendChild(button);
    return true;
  }

  function schedule(){
    if(timer) window.clearTimeout(timer);
    timer=window.setTimeout(()=>{
      timer=0;
      ensureShortcut();
    },60);
  }

  function wire(){
    ensureShortcut();
    const teacher=document.getElementById('teacher');
    if(teacher){
      const observer=new MutationObserver(schedule);
      observer.observe(teacher,{childList:true,subtree:true});
    }
  }

  if(typeof document==='undefined') return;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();