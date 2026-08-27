/* V5.1A2 — cleanup guard for uncommitted bulk image uploads.
   If a teacher abandons a CSV preview after uploading its matched images, Clear Preview
   removes only the Storage paths recorded on those in-memory import rows. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51BulkQuestionImageCleanupInstalled) return;
  if (typeof window !== 'undefined') window.__v51BulkQuestionImageCleanupInstalled = true;

  function currentRows(){
    try {
      if (typeof importRows !== 'undefined' && Array.isArray(importRows)) return importRows;
    } catch {}
    return [];
  }

  function uncommittedPaths(rows=currentRows()){
    return [...new Set((rows || [])
      .map(row => String(row?._v51a2_storage_path || '').trim())
      .filter(Boolean))];
  }

  function storageContext(){
    try {
      return {
        ready:typeof cloudReady !== 'undefined' && !!cloudReady,
        user:typeof teacherUser !== 'undefined' ? teacherUser : null,
        client:typeof cloud !== 'undefined' ? cloud : null,
        bucket:typeof IMAGE_BUCKET !== 'undefined' ? IMAGE_BUCKET : 'question-images'
      };
    } catch {
      return {ready:false,user:null,client:null,bucket:'question-images'};
    }
  }

  async function clearPreviewWithCleanup(){
    const paths = uncommittedPaths();
    const ctx = storageContext();
    if (paths.length){
      if (!ctx.ready || !ctx.user || !ctx.client){
        try { alert('Cannot clear this preview safely while its uploaded image batch cannot be removed. Sign in as a Cloud Teacher and try again.'); } catch {}
        return false;
      }
      let error = null;
      try {
        ({error} = await ctx.client.storage.from(ctx.bucket).remove(paths));
      } catch (caught){ error = caught; }
      if (error){
        try { alert(`Could not remove the uncommitted image batch. Preview was kept so the image URLs are not lost. ${String(error?.message || error)}`); } catch {}
        return false;
      }
    }

    try {
      if (typeof clearImport === 'function') clearImport();
    } catch {}
    try { window.V51BulkQuestionImageUpload?.render?.(); } catch {}
    return true;
  }

  function wire(){
    if (typeof document === 'undefined') return;

    document.addEventListener('click',event => {
      if (!event.target?.closest?.('#clear-import')) return;
      const paths = uncommittedPaths();
      if (!paths.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clearPreviewWithCleanup();
    },true);

    document.addEventListener('click',event => {
      if (!event.target?.closest?.('#preview-csv')) return;
      if (!uncommittedPaths().length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try { alert('Clear the current preview first. Its uncommitted uploaded image batch will be removed safely before another CSV is previewed.'); } catch {}
    },true);
  }

  const api = Object.freeze({uncommittedPaths,clearPreviewWithCleanup});
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51BulkQuestionImageCleanup',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
