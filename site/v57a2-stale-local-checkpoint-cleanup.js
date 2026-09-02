/* V5.7A.2 — Stale same-device checkpoint cleanup.
   When a Past Paper Practice is completed on another device, the authoritative
   completed session can outlive an older V5.5C local fallback on this browser.
   This token-gated metadata check removes only local checkpoints older than the
   latest completed Past Paper session for the same signed-in roster student. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.__v57a2StaleLocalCheckpointCleanupInstalled) return;
  ROOT.__v57a2StaleLocalCheckpointCleanupInstalled = true;

  const RPC_NAME = 'get_student_past_paper_completion_watermarks_v57a';
  const CACHE_MS = 12000;
  let lastLoadedAt = 0;
  let loading = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const paperKey = (examYear,paper) => `${Number(examYear)||0}|${norm(paper)}`;

  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function passivePracticeAccess(){
    const shared = ROOT.V57ACrossDevicePastPaperResume?.passivePracticeAccess?.();
    if (shared?.access_token) return shared;
    if (!signedIn()) return null;
    try {
      const access = typeof activeStudentAccess !== 'undefined'
        ? activeStudentAccess
        : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose !== 'practice') return null;
      return access;
    } catch {
      return null;
    }
  }

  function matchesStudent(snapshot,student){
    if (!snapshot || !student) return false;
    const currentId = norm(student.student_id);
    const savedId = norm(snapshot.studentId);
    if (currentId) return !!savedId && savedId === currentId;
    const currentName = norm(student.student_name);
    return !!currentName && norm(snapshot.studentName) === currentName
      && Number(snapshot.yearLevel||0) === Number(student.year_level||0);
  }

  function pruneStaleLocalCheckpoints(data,storage){
    const api = ROOT.V55CResumePastPaperPractice;
    if (!api || !storage || !data?.student) return 0;
    const completions = new Map();
    for (const row of Array.isArray(data?.completions) ? data.completions : []){
      const when = Date.parse(row?.completedAt || '');
      if (!Number.isFinite(when)) continue;
      const key = paperKey(row?.examYear,row?.paper);
      const existing = completions.get(key) || 0;
      if (when > existing) completions.set(key,when);
    }
    if (!completions.size) return 0;

    let store;
    try { store = api.pruneStore(api.readStore(storage)); }
    catch { return 0; }
    let removed = 0;
    for (const [key,snapshot] of Object.entries(store)){
      if (!matchesStudent(snapshot,data.student)) continue;
      const completedAt = completions.get(paperKey(snapshot?.examYear,snapshot?.paper)) || 0;
      const savedAt = Date.parse(snapshot?.savedAt || '');
      if (!completedAt || !Number.isFinite(savedAt) || completedAt < savedAt) continue;
      delete store[key];
      removed += 1;
    }
    if (!removed) return 0;
    try { api.writeStore(storage,store); } catch { return 0; }

    window.setTimeout(()=>{
      document.getElementById('v55a-paper-name')?.dispatchEvent(new Event('change',{bubbles:true}));
      window.dispatchEvent(new CustomEvent('v57a:local-fallback-pruned',{detail:{removed}}));
    },0);
    return removed;
  }

  async function refresh(force=false){
    if (loading || !signedIn()) return 0;
    if (!force && lastLoadedAt && Date.now()-lastLoadedAt<CACHE_MS) return 0;
    const access = passivePracticeAccess();
    if (!access?.access_token) return 0;
    loading = true;
    try {
      const {data,error} = await cloud.rpc(RPC_NAME,{p_access_token:access.access_token});
      if (error) throw error;
      lastLoadedAt = Date.now();
      return typeof localStorage === 'undefined' ? 0 : pruneStaleLocalCheckpoints(data,localStorage);
    } catch(error){
      console.warn('V5.7A stale same-device checkpoint cleanup could not run.',error);
      return 0;
    } finally { loading = false; }
  }

  function wire(){
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    window.addEventListener('v57a:checkpoints-updated',()=>void refresh(true));
    window.addEventListener('pageshow',()=>{ if (signedIn()) void refresh(true); });
    window.addEventListener('focus',()=>{ if (signedIn()) void refresh(false); });
    document.addEventListener('click',event=>{
      if (event.target?.closest?.('#my-progress-btn,#my-assignments-btn,.v40c-open-learn')){
        window.setTimeout(()=>void refresh(true),90);
      }
      if (event.target?.closest?.('#v40c-student-logout')) lastLoadedAt = 0;
    },true);
    window.setTimeout(()=>{ if (signedIn()) void refresh(true); },350);
  }

  const api = Object.freeze({RPC_NAME,paperKey,passivePracticeAccess,matchesStudent,pruneStaleLocalCheckpoints,refresh});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V57A2StaleLocalCheckpointCleanup',{
      value:api,writable:false,configurable:false
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();
