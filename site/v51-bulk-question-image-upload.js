/* V5.1A2 — Bulk Question Image Upload.
   Teacher-side import companion for matching CSV image_url filenames to local image files,
   uploading matched files to the existing question-images Supabase bucket, and rewriting
   only the in-memory valid/non-duplicate import rows before the normal question import. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51BulkQuestionImageUploadInstalled) return;
  if (typeof window !== 'undefined') window.__v51BulkQuestionImageUploadInstalled = true;

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_IMAGE_TYPES = Object.freeze(['image/png','image/jpeg','image/webp']);
  const ACCEPTED_TYPE_SET = new Set(ACCEPTED_IMAGE_TYPES);

  const state = {
    rowsRef:null,
    files:[],
    uploading:false,
    uploaded:false,
    uploadedCount:0,
    uploadedPaths:[],
    message:'',
    messageKind:'try'
  };

  const trim = value => String(value ?? '').trim();
  const lower = value => trim(value).toLowerCase();

  function isRemoteImageRef(value){
    const ref = trim(value);
    return /^(?:https?:)?\/\//i.test(ref) || /^(?:data|blob):/i.test(ref);
  }

  function fileNameFromRef(value){
    const ref = trim(value).replace(/\\/g,'/').split('#')[0].split('?')[0];
    if (!ref) return '';
    const raw = ref.slice(ref.lastIndexOf('/') + 1);
    try { return decodeURIComponent(raw); } catch { return raw; }
  }

  function fileKey(value){
    return lower(fileNameFromRef(value));
  }

  function readyImportRows(rows){
    return (rows || []).filter(row => row && row._valid !== false && !row._duplicate);
  }

  function localImageRows(rows){
    return readyImportRows(rows).filter(row => trim(row.image_url) && !isRemoteImageRef(row.image_url));
  }

  function buildMatchReport(rows,files){
    const requiredMap = new Map();
    let remoteReferences = 0;

    for (const row of readyImportRows(rows)){
      const ref = trim(row.image_url);
      if (!ref) continue;
      if (isRemoteImageRef(ref)){
        remoteReferences += 1;
        continue;
      }
      const name = fileNameFromRef(ref);
      const key = fileKey(ref);
      if (!name || !key) continue;
      if (!requiredMap.has(key)) requiredMap.set(key,{key,fileName:name,refs:new Set(),rows:[]});
      const item = requiredMap.get(key);
      item.refs.add(ref);
      item.rows.push(row);
    }

    const selected = Array.from(files || []);
    const selectedMap = new Map();
    for (const file of selected){
      const key = lower(file?.name);
      if (!key) continue;
      if (!selectedMap.has(key)) selectedMap.set(key,[]);
      selectedMap.get(key).push(file);
    }

    const duplicateFileNames = [];
    for (const [key,group] of selectedMap){
      if (group.length > 1) duplicateFileNames.push(group[0]?.name || key);
    }

    const matched = [];
    const missing = [];
    const invalidMatches = [];
    for (const item of requiredMap.values()){
      const group = selectedMap.get(item.key) || [];
      if (!group.length){
        missing.push(item.fileName);
        continue;
      }
      if (group.length > 1) continue;
      const file = group[0];
      if (!ACCEPTED_TYPE_SET.has(String(file.type || '').toLowerCase())){
        invalidMatches.push({fileName:file.name,reason:'Use PNG, JPG or WebP.'});
        continue;
      }
      if (Number(file.size || 0) > MAX_IMAGE_BYTES){
        invalidMatches.push({fileName:file.name,reason:'File is larger than 5 MB.'});
        continue;
      }
      matched.push({...item,refs:[...item.refs],file});
    }

    const orphanFiles = selected
      .filter(file => !requiredMap.has(lower(file?.name)))
      .map(file => file.name);

    const required = [...requiredMap.values()].map(item => ({
      key:item.key,
      fileName:item.fileName,
      refs:[...item.refs],
      rowCount:item.rows.length
    }));

    return {
      required,
      requiredCount:required.length,
      remoteReferences,
      selectedCount:selected.length,
      matched,
      matchedCount:matched.length,
      missing,
      orphanFiles,
      duplicateFileNames,
      invalidMatches,
      requiresUpload:required.length > 0,
      readyToUpload:required.length > 0
        && missing.length === 0
        && duplicateFileNames.length === 0
        && invalidMatches.length === 0
        && matched.length === required.length
    };
  }

  function currentImportRows(){
    try {
      if (typeof importRows !== 'undefined' && Array.isArray(importRows)) return importRows;
    } catch {}
    return [];
  }

  function cloudContext(){
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

  function slug(value){
    return lower(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'item';
  }

  function safeStorageName(value){
    return trim(value).replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120) || 'image';
  }

  function htmlEsc(value){
    return trim(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function shortNames(values,limit=6){
    const list = [...new Set((values || []).filter(Boolean))];
    const shown = list.slice(0,limit).map(htmlEsc).join(', ');
    return list.length > limit ? `${shown}, +${list.length-limit} more` : shown;
  }

  function resetForRows(rows){
    if (state.rowsRef === rows) return;
    state.rowsRef = rows;
    state.uploading = false;
    state.uploaded = false;
    state.uploadedCount = 0;
    state.uploadedPaths = [];
    state.message = '';
    state.messageKind = 'try';
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v51a2-bulk-image-panel');
    if (panel) return panel;
    const dropzone = document.querySelector('#import-panel .dropzone');
    if (!dropzone) return null;

    panel = document.createElement('div');
    panel.id = 'v51a2-bulk-image-panel';
    panel.className = 'info';
    panel.innerHTML = `
      <strong>3. Add question images — V5.1A2</strong>
      <p class="muted" style="margin:7px 0 10px">Select all PNG, JPG or WebP files referenced by the CSV <code>image_url</code> column. Files are matched automatically by filename.</p>
      <input id="v51a2-image-files" type="file" multiple accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label="Question image files">
      <div id="v51a2-image-report" style="margin-top:10px"></div>
      <div class="buttons" style="margin-top:12px">
        <button id="v51a2-upload-images" class="outline" type="button">Upload Matched Images</button>
        <button id="v51a2-clear-images" class="secondary" type="button">Clear Image Selection</button>
      </div>
      <div class="help" style="margin-top:9px">Local/relative image references are locked from question import until every required image is matched and uploaded to the existing <code>question-images</code> bucket. Already-hosted HTTPS image URLs need no upload.</div>`;
    dropzone.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function updateImportGate(rows){
    if (typeof document === 'undefined') return false;
    const button = document.getElementById('import-btn');
    if (!button) return false;
    const blocked = state.uploading || localImageRows(rows).length > 0;
    button.dataset.v51a2Blocked = blocked ? '1' : '0';
    button.disabled = blocked;
    if (blocked) button.title = state.uploading
      ? 'Question import is locked while images upload.'
      : 'Upload all matched local question images before importing questions.';
    else button.removeAttribute('title');
    return blocked;
  }

  function render(){
    const panel = ensurePanel();
    if (!panel) return null;
    const rows = currentImportRows();
    resetForRows(rows);

    const input = document.getElementById('v51a2-image-files');
    if (input && !state.files.length && input.files?.length) state.files = Array.from(input.files);
    const report = buildMatchReport(rows,state.files);
    const reportEl = document.getElementById('v51a2-image-report');
    const uploadButton = document.getElementById('v51a2-upload-images');
    const clearButton = document.getElementById('v51a2-clear-images');
    const ctx = cloudContext();

    if (!rows.length){
      reportEl.innerHTML = '<span class="muted">Preview a CSV first. Image matching will appear here automatically.</span>';
      uploadButton.disabled = true;
      clearButton.disabled = !state.files.length;
      updateImportGate(rows);
      return report;
    }

    if (state.uploaded && !report.requiresUpload){
      reportEl.innerHTML = `<div class="feedback correct" style="margin:0"><strong>✅ ${state.uploadedCount} image${state.uploadedCount===1?'':'s'} uploaded.</strong> Ready import rows now use Supabase public image URLs.</div>`;
      uploadButton.disabled = true;
      clearButton.disabled = !state.files.length;
      updateImportGate(rows);
      return report;
    }

    if (!report.requiresUpload){
      reportEl.innerHTML = `<div class="feedback correct" style="margin:0"><strong>✅ No local image upload required.</strong> ${report.remoteReferences ? `${report.remoteReferences} ready row${report.remoteReferences===1?'':'s'} already use${report.remoteReferences===1?'s':''} hosted image URLs.` : 'Ready rows do not reference local images.'}</div>`;
      uploadButton.disabled = true;
      clearButton.disabled = !state.files.length;
      updateImportGate(rows);
      return report;
    }

    const issues = [];
    if (report.missing.length) issues.push(`<div>⚠ Missing: ${shortNames(report.missing)}</div>`);
    if (report.duplicateFileNames.length) issues.push(`<div>⚠ Duplicate selected filenames: ${shortNames(report.duplicateFileNames)}</div>`);
    if (report.invalidMatches.length) issues.push(`<div>⚠ Invalid matched files: ${report.invalidMatches.map(item=>`${htmlEsc(item.fileName)} — ${htmlEsc(item.reason)}`).join('; ')}</div>`);
    if (report.orphanFiles.length) issues.push(`<div class="muted">Unreferenced/orphan selection: ${shortNames(report.orphanFiles)}</div>`);

    const statusClass = report.readyToUpload ? 'correct' : 'try';
    const cloudNote = (!ctx.ready || !ctx.user || !ctx.client)
      ? '<div>⚠ Sign in as a Cloud Teacher before uploading images.</div>'
      : '';
    const progress = state.uploading ? `<div><strong>${htmlEsc(state.message || 'Uploading images…')}</strong></div>` : '';
    const stateMessage = state.message && !state.uploading
      ? `<div class="feedback ${state.messageKind}" style="margin:8px 0 0">${htmlEsc(state.message)}</div>`
      : '';

    reportEl.innerHTML = `
      <div class="feedback ${statusClass}" style="margin:0">
        <strong>${report.requiredCount}</strong> unique image${report.requiredCount===1?'':'s'} required •
        <strong>${report.matchedCount}</strong> matched •
        <strong>${report.missing.length}</strong> missing •
        <strong>${report.orphanFiles.length}</strong> orphan
        ${issues.length ? `<div style="margin-top:7px;display:grid;gap:4px">${issues.join('')}</div>` : ''}
        ${cloudNote}${progress}
      </div>${stateMessage}`;

    uploadButton.disabled = state.uploading || !report.readyToUpload || !ctx.ready || !ctx.user || !ctx.client;
    clearButton.disabled = state.uploading || !state.files.length;
    updateImportGate(rows);
    return report;
  }

  async function rollbackStorage(paths,ctx){
    if (!paths.length || !ctx.client) return '';
    try {
      const {error} = await ctx.client.storage.from(ctx.bucket).remove(paths);
      return error ? String(error.message || error) : '';
    } catch (error){
      return String(error?.message || error || 'Rollback failed.');
    }
  }

  async function uploadMatchedImages(){
    const rows = currentImportRows();
    resetForRows(rows);
    const report = buildMatchReport(rows,state.files);
    const ctx = cloudContext();

    if (!rows.length){ state.message='Preview a CSV first.'; state.messageKind='incorrect'; render(); return; }
    if (!report.requiresUpload){ state.message='No local question images require upload.'; state.messageKind='correct'; render(); return; }
    if (!report.readyToUpload){ state.message='Resolve missing, duplicate or invalid matched image files before upload.'; state.messageKind='incorrect'; render(); return; }
    if (!ctx.ready || !ctx.user || !ctx.client){ state.message='Image upload requires Cloud Teacher mode.'; state.messageKind='incorrect'; render(); return; }

    state.uploading = true;
    state.messageKind = 'try';
    state.message = `Uploading 0/${report.matchedCount} images…`;
    render();

    const uploaded = new Map();
    const uploadedPaths = [];
    const batchToken = Date.now();

    for (let index=0; index<report.matched.length; index++){
      const match = report.matched[index];
      const row = match.rows[0] || {};
      const year = slug(row.exam_year || `year-${row.year_level || 'unknown'}`);
      const paper = slug(row.paper || 'practice');
      const path = `v51-imports/${year}/${paper}/${batchToken}-${safeStorageName(match.file.name)}`;
      state.message = `Uploading ${index+1}/${report.matchedCount}: ${match.file.name}`;
      render();

      let data,error;
      try {
        ({data,error} = await ctx.client.storage.from(ctx.bucket).upload(path,match.file,{
          cacheControl:'3600',
          upsert:false,
          contentType:match.file.type
        }));
      } catch (caught){
        error = caught;
      }

      if (error || !data?.path){
        const rollbackError = await rollbackStorage(uploadedPaths,ctx);
        state.uploading = false;
        state.messageKind = 'incorrect';
        state.message = `Upload stopped at ${match.file.name}. ${String(error?.message || error || 'Storage upload failed.')}${rollbackError ? ` Rollback warning: ${rollbackError}` : ' Earlier files from this batch were rolled back.'}`;
        render();
        return;
      }

      uploadedPaths.push(data.path);
      const {data:urlData} = ctx.client.storage.from(ctx.bucket).getPublicUrl(data.path);
      const publicUrl = trim(urlData?.publicUrl);
      if (!publicUrl){
        const rollbackError = await rollbackStorage(uploadedPaths,ctx);
        state.uploading = false;
        state.messageKind = 'incorrect';
        state.message = `Upload stopped because a public URL could not be generated for ${match.file.name}.${rollbackError ? ` Rollback warning: ${rollbackError}` : ' Uploaded files from this batch were rolled back.'}`;
        render();
        return;
      }
      uploaded.set(match.key,{publicUrl,path,originalName:match.file.name});
    }

    for (const row of readyImportRows(rows)){
      const ref = trim(row.image_url);
      if (!ref || isRemoteImageRef(ref)) continue;
      const item = uploaded.get(fileKey(ref));
      if (!item) continue;
      row._v51a2_original_image_url = ref;
      row._v51a2_storage_path = item.path;
      row.image_url = item.publicUrl;
    }

    state.uploading = false;
    state.uploaded = true;
    state.uploadedCount = uploaded.size;
    state.uploadedPaths = uploadedPaths;
    state.message = `${uploaded.size} matched image${uploaded.size===1?'':'s'} uploaded successfully.`;
    state.messageKind = 'correct';
    try { window.V51PaperProfileValidator?.renderCurrentPreview?.(); } catch {}
    render();
  }

  function clearImageSelection(){
    if (state.uploading) return;
    state.files = [];
    const input = typeof document !== 'undefined' ? document.getElementById('v51a2-image-files') : null;
    if (input) input.value = '';
    render();
  }

  function importIsBlocked(){
    return state.uploading || localImageRows(currentImportRows()).length > 0;
  }

  function wire(){
    if (typeof document === 'undefined') return;
    const panel = ensurePanel();
    if (!panel) return;

    document.getElementById('v51a2-image-files')?.addEventListener('change',event => {
      state.files = Array.from(event.target.files || []);
      state.message = '';
      state.messageKind = 'try';
      render();
    });
    document.getElementById('v51a2-upload-images')?.addEventListener('click',uploadMatchedImages);
    document.getElementById('v51a2-clear-images')?.addEventListener('click',clearImageSelection);

    const summary = document.getElementById('import-summary');
    if (summary){
      const observer = new MutationObserver(() => window.requestAnimationFrame(render));
      observer.observe(summary,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }

    document.addEventListener('click',event => {
      const target = event.target?.closest?.('#import-btn');
      if (!target || !importIsBlocked()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      render();
      try { alert('Upload all matched local question images before importing the questions.'); } catch {}
    },true);

    document.addEventListener('click',event => {
      if (!event.target?.closest?.('#clear-import')) return;
      window.setTimeout(() => {
        state.rowsRef = null;
        state.files = [];
        state.uploading = false;
        state.uploaded = false;
        state.uploadedCount = 0;
        state.uploadedPaths = [];
        state.message = '';
        const input = document.getElementById('v51a2-image-files');
        if (input) input.value = '';
        render();
      },0);
    },true);

    render();
  }

  const api = Object.freeze({
    MAX_IMAGE_BYTES,
    ACCEPTED_IMAGE_TYPES,
    isRemoteImageRef,
    fileNameFromRef,
    readyImportRows,
    localImageRows,
    buildMatchReport,
    importIsBlocked,
    render
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51BulkQuestionImageUpload',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
