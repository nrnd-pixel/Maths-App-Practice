/* V5.1A2 — cleanup guard for uncommitted bulk image uploads.
   If a teacher abandons a CSV preview after uploading its matched images, Clear Preview
   removes only Storage paths that are not already referenced by committed question rows. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51BulkQuestionImageCleanupInstalled) return;
  if (typeof window !== 'undefined') window.__v51BulkQuestionImageCleanupInstalled = true;

  const trim = value => String(value ?? '').trim();

  function currentRows(){
    try {
      if (typeof importRows !== 'undefined' && Array.isArray(importRows)) return importRows;
    } catch {}
    return [];
  }

  function currentTeacherQuestions(){
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function committedImageUrls(questions=currentTeacherQuestions()){
    return new Set((questions || [])
      .map(question => trim(question?.image_url))
      .filter(Boolean));
  }

  function uncommittedPaths(rows=currentRows(),questions=currentTeacherQuestions()){
    const committedUrls = committedImageUrls(questions);
    const protectedPaths = new Set();

    for (const row of rows || []){
      const path = trim(row?._v51a2_storage_path);
      const imageUrl = trim(row?.image_url);
      if (path && imageUrl && committedUrls.has(imageUrl)) protectedPaths.add(path);
    }

    return [...new Set((rows || [])
      .map(row => trim(row?._v51a2_storage_path))
      .filter(path => path && !protectedPaths.has(path)))];
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

  const api = Object.freeze({committedImageUrls,uncommittedPaths,clearPreviewWithCleanup});
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51BulkQuestionImageCleanup',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
