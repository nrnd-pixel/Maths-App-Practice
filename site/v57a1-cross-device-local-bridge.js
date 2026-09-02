/* V5.7A.1 — Cross-device resume bridge.
   Mirrors authenticated server checkpoints into the accepted V5.5C local
   checkpoint shape so existing Past Paper Progress / Continue filters work
   without duplicating that UI. Server evidence wins only when it is at least as
   new as the same-device fallback. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57a1CrossDeviceLocalBridgeInstalled) return;
  ROOT.__v57a1CrossDeviceLocalBridgeInstalled = true;

  let syncing = false;
  const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');

  function localApi(){ return ROOT.V55CResumePastPaperPractice || null; }
  function serverApi(){ return ROOT.V57ACrossDevicePastPaperResume || null; }

  function currentIdentity(snapshot){
    return {
      studentId:String(snapshot?.studentId || document.getElementById('student-id')?.value || '').trim(),
      studentName:String(snapshot?.studentName || document.getElementById('student-name')?.value || '').trim(),
      yearLevel:Number(snapshot?.yearLevel || document.getElementById('year-level')?.value || 0)
    };
  }

  function mirror(snapshot){
    const local=localApi();
    if (!local || !snapshot || typeof localStorage==='undefined') return false;
    try {
      const identity=currentIdentity(snapshot);
      const key=local.identityKey(identity.studentId,identity.studentName,identity.yearLevel,snapshot.examYear,snapshot.paper);
      const store=local.pruneStore(local.readStore(localStorage));
      const existing=store[key];
      const serverSaved=Date.parse(snapshot.savedAt||'') || 0;
      const localSaved=Date.parse(existing?.savedAt||'') || 0;
      if (existing && localSaved>serverSaved) return false;
      store[key]={...snapshot,version:1,...identity};
      local.writeStore(localStorage,store);
      return true;
    } catch { return false; }
  }

  async function syncFromServer(){
    if (syncing) return false;
    const server=serverApi();
    const local=localApi();
    const papers=ROOT.V55APastPaperPractice;
    if (!server || !local || !papers) return false;
    syncing=true;
    try {
      try { await papers.loadPaperLibrary?.(false); } catch {}
      const library=papers.getPaperLibrary?.() || [];
      let changed=false;
      for (const row of library){
        const snapshot=server.checkpointFor?.(row?.exam_year,row?.paper);
        if (snapshot) changed=mirror(snapshot) || changed;
      }
      if (changed){
        window.setTimeout(()=>{
          const year=document.getElementById('v55a-paper-year');
          year?.dispatchEvent(new Event('change',{bubbles:true}));
          const paper=document.getElementById('v55a-paper-name');
          paper?.dispatchEvent(new Event('change',{bubbles:true}));
        },0);
      }
      return changed;
    } finally { syncing=false; }
  }

  function currentServerCheckpoint(){
    const server=serverApi();
    if (!server) return null;
    const year=Number(document.getElementById('v55a-paper-year')?.value||0);
    const paper=String(document.getElementById('v55a-paper-name')?.value||'').trim();
    return year&&paper ? server.checkpointFor?.(year,paper) || null : null;
  }

  function interceptLocalResume(event){
    const button=event.target?.closest?.('#v55c-resume-card [data-v55c-resume]');
    if (!button) return;
    const snapshot=currentServerCheckpoint();
    if (!snapshot) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void serverApi()?.restoreFromServer?.(snapshot);
  }

  function wire(){
    window.addEventListener('v57a:checkpoints-updated',()=>void syncFromServer());
    document.addEventListener('click',interceptLocalResume,true);
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#my-progress-btn,#my-assignments-btn,.v40c-open-learn')){
        window.setTimeout(()=>void syncFromServer(),120);
      }
    },true);
    window.setTimeout(()=>void syncFromServer(),300);
  }

  const api=Object.freeze({mirror,syncFromServer,currentServerCheckpoint});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V57A1CrossDeviceLocalBridge',{value:api,writable:false,configurable:false});
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();
