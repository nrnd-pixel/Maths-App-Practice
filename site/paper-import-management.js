/* V5.1A — Paper Profile Validator.
   Read-only import QA overlay. It does not import, modify, activate or publish questions.
   Profiles the resulting active past-paper state after adding valid, non-duplicate preview rows. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51PaperProfileValidatorInstalled) return;
  if (typeof window !== 'undefined') window.__v51PaperProfileValidatorInstalled = true;

  const PAPER_PROFILES = Object.freeze({
    paper1:Object.freeze({key:'paper1',label:'Paper 1',expectedLogicalQuestions:40,expectedMarks:90}),
    paper2:Object.freeze({key:'paper2',label:'Paper 2',expectedLogicalQuestions:30,expectedMarks:90,typicalLogicalMarks:3})
  });

  const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');

  function paperProfile(value){
    const text = norm(value).replace(/[._-]+/g,' ');
    if (/^(?:paper\s*)?1$/.test(text) || /^p\s*1$/.test(text)) return PAPER_PROFILES.paper1;
    if (/^(?:paper\s*)?2$/.test(text) || /^p\s*2$/.test(text)) return PAPER_PROFILES.paper2;
    return null;
  }

  function logicalQuestionNumber(row){
    const parent = String(row?.parent_question_number ?? '').trim();
    if (parent) return parent.replace(/^q\s*/i,'').trim().toLowerCase();

    const raw = String(row?.question_number ?? '').trim().replace(/^q\s*/i,'');
    const multipart = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
    if (multipart) return multipart[1];
    return raw.toLowerCase();
  }

  function looksLikeMultipartNumber(value){
    const raw = String(value ?? '').trim().replace(/^q\s*/i,'');
    return /^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i.test(raw);
  }

  function activePastPaperRow(row){
    return !!row
      && row.active !== false
      && norm(row.source_type) === 'past_paper'
      && Number.isFinite(Number(row.exam_year))
      && !!paperProfile(row.paper)
      && !!String(row.question_number ?? '').trim();
  }

  function groupKey(row){
    const profile = paperProfile(row?.paper);
    if (!profile) return '';
    return `${Number(row.year_level) || ''}|${Number(row.exam_year) || ''}|${profile.key}`;
  }

  function groupRows(rows){
    const groups = new Map();
    for (const row of rows || []){
      if (!activePastPaperRow(row)) continue;
      const key = groupKey(row);
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
    }
    return groups;
  }

  function auditGroup(key,rows){
    const first = rows[0] || {};
    const profile = paperProfile(first.paper);
    const logicalMarks = new Map();
    let marks = 0;
    let ungroupedMultipartRows = 0;

    for (const row of rows){
      const rowMarks = Number(row.marks);
      const safeMarks = Number.isFinite(rowMarks) ? rowMarks : 0;
      marks += safeMarks;
      const logical = logicalQuestionNumber(row);
      logicalMarks.set(logical,(logicalMarks.get(logical) || 0) + safeMarks);
      if (!String(row.parent_question_number ?? '').trim() && looksLikeMultipartNumber(row.question_number)){
        ungroupedMultipartRows += 1;
      }
    }

    const logicalQuestions = logicalMarks.size;
    const countDelta = logicalQuestions - profile.expectedLogicalQuestions;
    const marksDelta = marks - profile.expectedMarks;
    const typicalMarkAnomalies = profile.typicalLogicalMarks
      ? [...logicalMarks.values()].filter(value => value !== profile.typicalLogicalMarks).length
      : 0;

    let status = 'pass';
    if (countDelta < 0 || marksDelta < 0) status = 'incomplete';
    if (countDelta > 0 || marksDelta > 0 || ungroupedMultipartRows > 0) status = 'attention';
    if (countDelta === 0 && marksDelta === 0 && ungroupedMultipartRows === 0) status = 'pass';

    return Object.freeze({
      key,
      yearLevel:Number(first.year_level) || null,
      examYear:Number(first.exam_year) || null,
      paper:profile.label,
      profileKey:profile.key,
      expectedLogicalQuestions:profile.expectedLogicalQuestions,
      expectedMarks:profile.expectedMarks,
      physicalRows:rows.length,
      logicalQuestions,
      totalMarks:marks,
      countDelta,
      marksDelta,
      ungroupedMultipartRows,
      typicalLogicalMarks:profile.typicalLogicalMarks || null,
      typicalMarkAnomalies,
      status,
      readyForPaperQA:status === 'pass'
    });
  }

  function buildProfiles(existingRows,importedRows){
    const readyImports = (importedRows || []).filter(row => row?._valid !== false && !row?._duplicate && activePastPaperRow(row));
    const touchedKeys = new Set((importedRows || [])
      .filter(row => row && Number.isFinite(Number(row.exam_year)) && paperProfile(row.paper))
      .map(groupKey)
      .filter(Boolean));

    if (!touchedKeys.size) return Object.freeze([]);

    const combined = [
      ...(existingRows || []).filter(activePastPaperRow),
      ...readyImports
    ];
    const groups = groupRows(combined);
    const results = [];
    for (const key of touchedKeys){
      const rows = groups.get(key) || [];
      if (rows.length) results.push(auditGroup(key,rows));
    }
    return Object.freeze(results.sort((a,b)=>(a.examYear-b.examYear)||a.paper.localeCompare(b.paper)));
  }

  function currentRows(name){
    try {
      if (name === 'import' && typeof importRows !== 'undefined' && Array.isArray(importRows)) return importRows;
      if (name === 'existing' && typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions;
    } catch {}
    return [];
  }

  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function statusText(item){
    if (item.status === 'pass') return '✅ Paper profile pass';
    if (item.status === 'incomplete') return '🟠 Incomplete paper profile';
    return '⚠ Paper profile needs attention';
  }

  function detailText(item){
    const details = [
      `${item.logicalQuestions}/${item.expectedLogicalQuestions} logical questions`,
      `${item.totalMarks}/${item.expectedMarks} marks`,
      `${item.physicalRows} active row${item.physicalRows===1?'':'s'}`
    ];
    if (item.ungroupedMultipartRows){
      details.push(`${item.ungroupedMultipartRows} multipart-looking row${item.ungroupedMultipartRows===1?'':'s'} without parent grouping`);
    }
    if (item.typicalLogicalMarks && item.typicalMarkAnomalies){
      details.push(`${item.typicalMarkAnomalies} logical question${item.typicalMarkAnomalies===1?'':'s'} not exactly ${item.typicalLogicalMarks} marks (advisory)`);
    }
    return details.join(' • ');
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v51-paper-profile-audit');
    if (panel) return panel;
    const summary = document.getElementById('import-summary');
    if (!summary) return null;
    panel = document.createElement('div');
    panel.id = 'v51-paper-profile-audit';
    panel.className = 'info hidden';
    panel.setAttribute('role','status');
    panel.setAttribute('aria-live','polite');
    summary.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function renderCurrentPreview(){
    const panel = ensurePanel();
    if (!panel) return [];
    const imports = currentRows('import');
    if (!imports.length){ panel.classList.add('hidden'); panel.innerHTML=''; return []; }

    const profiles = buildProfiles(currentRows('existing'),imports);
    if (!profiles.length){
      panel.classList.add('hidden');
      panel.innerHTML='';
      return [];
    }

    panel.classList.remove('hidden');
    panel.innerHTML = `
      <strong>V5.1A paper-profile QA</strong>
      <div style="margin-top:8px;display:grid;gap:8px">
        ${profiles.map(item=>`<div><strong>${esc(item.examYear)} ${esc(item.paper)} — ${esc(statusText(item))}</strong><br><span>${esc(detailText(item))}</span></div>`).join('')}
      </div>
      <div class="help" style="margin-top:8px">Advisory during import: incomplete profiles do not block a deliberate partial/correction import. Treat a profile pass as a QA requirement before making that Exam paper available to students.</div>`;
    return profiles;
  }

  function wire(){
    if (typeof document === 'undefined') return;
    const summary = document.getElementById('import-summary');
    if (!summary) return;
    ensurePanel();
    const observer = new MutationObserver(() => window.requestAnimationFrame(renderCurrentPreview));
    observer.observe(summary,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    document.getElementById('clear-import')?.addEventListener('click',() => window.setTimeout(renderCurrentPreview,0));
  }

  const api = Object.freeze({
    PAPER_PROFILES,
    paperProfile,
    logicalQuestionNumber,
    buildProfiles,
    renderCurrentPreview
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51PaperProfileValidator',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

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

/* V5.1A2 — persistent image-reference and stale-selection safety guard.
   Keeps imported question image URLs durable and prevents a previous CSV file selection
   from being silently reused after the preview rows are replaced. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51BulkQuestionImageSafetyInstalled) return;
  if (typeof window !== 'undefined') window.__v51BulkQuestionImageSafetyInstalled = true;

  const trim = value => String(value ?? '').trim();

  function isPersistentHttpsRef(value){
    return /^https:\/\//i.test(trim(value));
  }

  function isNonPersistentRemoteRef(value){
    const ref = trim(value);
    if (!ref || isPersistentHttpsRef(ref)) return false;
    return /^\/\//.test(ref) || /^[a-z][a-z0-9+.-]*:/i.test(ref);
  }

  function readyRows(rows){
    return (rows || []).filter(row => row && row._valid !== false && !row._duplicate);
  }

  function unsafePersistentRows(rows){
    return readyRows(rows).filter(row => isNonPersistentRemoteRef(row.image_url));
  }

  function currentRows(){
    try {
      if (typeof importRows !== 'undefined' && Array.isArray(importRows)) return importRows;
    } catch {}
    return [];
  }

  function warningHost(){
    if (typeof document === 'undefined') return null;
    const panel = document.getElementById('v51a2-bulk-image-panel');
    if (!panel) return null;
    let warning = document.getElementById('v51a2-persistent-url-warning');
    if (!warning){
      warning = document.createElement('div');
      warning.id = 'v51a2-persistent-url-warning';
      warning.className = 'feedback incorrect hidden';
      warning.style.margin = '10px 0 0';
      const report = document.getElementById('v51a2-image-report');
      if (report) report.insertAdjacentElement('afterend',warning);
      else panel.appendChild(warning);
    }
    return warning;
  }

  function refreshPersistentGuard(){
    if (typeof document === 'undefined') return [];
    const unsafe = unsafePersistentRows(currentRows());
    const button = document.getElementById('import-btn');
    const warning = warningHost();

    if (unsafe.length){
      if (button){
        button.disabled = true;
        button.dataset.v51a2PersistentBlocked = '1';
        button.title = 'Replace temporary/non-HTTPS image URLs before importing questions.';
      }
      if (warning){
        const sample = [...new Set(unsafe.map(row => trim(row.image_url)).filter(Boolean))].slice(0,3);
        warning.classList.remove('hidden');
        warning.innerHTML = `<strong>⚠ Persistent image URL required.</strong> ${unsafe.length} ready row${unsafe.length===1?'':'s'} use${unsafe.length===1?'s':''} a temporary or non-HTTPS image reference. Use a relative filename for bulk upload, a blank image field, or a permanent <code>https://</code> URL.${sample.length ? `<div class="muted" style="margin-top:5px">Example: ${sample.map(value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join(', ')}</div>` : ''}`;
      }
    } else {
      if (button?.dataset.v51a2PersistentBlocked === '1'){
        delete button.dataset.v51a2PersistentBlocked;
        if (button.title === 'Replace temporary/non-HTTPS image URLs before importing questions.') button.removeAttribute('title');
      }
      if (warning){
        warning.classList.add('hidden');
        warning.textContent = '';
      }
    }
    return unsafe;
  }

  function clearStaleImageSelection(){
    if (typeof document === 'undefined') return false;
    const clearButton = document.getElementById('v51a2-clear-images');
    const input = document.getElementById('v51a2-image-files');
    if (!clearButton || !input?.files?.length) return false;
    clearButton.click();
    return true;
  }

  function deferRefresh(){
    if (typeof window === 'undefined') return;
    const raf = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : callback => window.setTimeout(callback,0);
    raf(() => raf(refreshPersistentGuard));
  }

  function wire(){
    if (typeof document === 'undefined') return;
    let lastRows = currentRows();

    const summary = document.getElementById('import-summary');
    if (summary && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(() => {
        const rows = currentRows();
        if (rows !== lastRows){
          lastRows = rows;
          clearStaleImageSelection();
        }
        deferRefresh();
      });
      observer.observe(summary,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }

    const importButton = document.getElementById('import-btn');
    if (importButton && typeof MutationObserver !== 'undefined'){
      const buttonObserver = new MutationObserver(() => {
        if (unsafePersistentRows(currentRows()).length && !importButton.disabled){
          importButton.disabled = true;
          importButton.dataset.v51a2PersistentBlocked = '1';
        }
      });
      buttonObserver.observe(importButton,{attributes:true,attributeFilter:['disabled']});
    }

    document.addEventListener('change',event => {
      if (!event.target?.matches?.('#v51a2-image-files')) return;
      deferRefresh();
    },true);

    document.addEventListener('click',event => {
      if (!event.target?.closest?.('#v51a2-upload-images')) return;
      deferRefresh();
    },true);

    document.addEventListener('click',event => {
      if (!event.target?.closest?.('#import-btn')) return;
      const unsafe = unsafePersistentRows(currentRows());
      if (!unsafe.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      refreshPersistentGuard();
      try { alert('Question import is blocked because one or more image URLs are temporary or non-HTTPS. Use a relative filename for bulk upload or a permanent HTTPS URL.'); } catch {}
    },true);

    deferRefresh();
  }

  const api = Object.freeze({
    isPersistentHttpsRef,
    isNonPersistentRemoteRef,
    unsafePersistentRows,
    refreshPersistentGuard,
    clearStaleImageSelection
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51BulkQuestionImageSafety',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.1A4 — Paper Import Package Preview.
   Read-only orchestration layer for the permanent digitisation package format.
   It identifies questions.csv, manifest.json, audit_report.xlsx and question images,
   then reuses the existing CSV preview, A1 paper profile and A2 image matcher.
   No question rows or Storage objects are written by this module. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51PaperPackagePreviewInstalled) return;
  if (typeof window !== 'undefined') window.__v51PaperPackagePreviewInstalled = true;

  const IMAGE_EXT_RE = /\.(?:png|jpe?g|webp)$/i;
  const state = {
    files:[],
    inventory:null,
    manifest:null,
    manifestError:'',
    packageRows:[],
    previewing:false,
    message:'',
    messageKind:'try'
  };

  const trim = value => String(value ?? '').trim();
  const lower = value => trim(value).toLowerCase();
  const normPaper = value => lower(value).replace(/[._-]+/g,' ').replace(/\s+/g,' ');

  function filePath(file){
    return trim(file?.webkitRelativePath || file?.relativePath || file?.path || file?.name).replace(/\\/g,'/');
  }

  function baseName(value){
    const path = trim(value).replace(/\\/g,'/');
    return path.slice(path.lastIndexOf('/')+1);
  }

  function classifyPackageFiles(files){
    const selected = Array.from(files || []).filter(Boolean);
    const inventory = {
      files:selected,
      questions:[],
      manifests:[],
      audits:[],
      images:[],
      other:[],
      duplicateImageNames:[]
    };

    for (const file of selected){
      const path = filePath(file);
      const name = lower(baseName(path));
      if (name === 'questions.csv') inventory.questions.push(file);
      else if (name === 'manifest.json') inventory.manifests.push(file);
      else if (name === 'audit_report.xlsx') inventory.audits.push(file);
      else if (IMAGE_EXT_RE.test(name)) inventory.images.push(file);
      else inventory.other.push(file);
    }

    const imageNameGroups = new Map();
    for (const file of inventory.images){
      const key = lower(baseName(filePath(file)));
      if (!imageNameGroups.has(key)) imageNameGroups.set(key,[]);
      imageNameGroups.get(key).push(file);
    }
    inventory.duplicateImageNames = [...imageNameGroups.values()]
      .filter(group => group.length > 1)
      .map(group => baseName(filePath(group[0])));
    return inventory;
  }

  function logicalQuestionNumber(row){
    try {
      const fn = window?.V51PaperProfileValidator?.logicalQuestionNumber;
      if (typeof fn === 'function') return fn(row);
    } catch {}
    const parent = trim(row?.parent_question_number);
    if (parent) return parent.replace(/^q\s*/i,'').trim().toLowerCase();
    const raw = trim(row?.question_number).replace(/^q\s*/i,'');
    const multipart = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
    return (multipart ? multipart[1] : raw).toLowerCase();
  }

  function isRemoteImageRef(value){
    try {
      const fn = window?.V51BulkQuestionImageUpload?.isRemoteImageRef;
      if (typeof fn === 'function') return fn(value);
    } catch {}
    const ref = trim(value);
    return /^(?:https?:)?\/\//i.test(ref) || /^(?:data|blob):/i.test(ref);
  }

  function imageNameFromRef(value){
    try {
      const fn = window?.V51BulkQuestionImageUpload?.fileNameFromRef;
      if (typeof fn === 'function') return fn(value);
    } catch {}
    const ref = trim(value).replace(/\\/g,'/').split('#')[0].split('?')[0];
    const raw = ref.slice(ref.lastIndexOf('/')+1);
    try { return decodeURIComponent(raw); } catch { return raw; }
  }

  function packageCsvStats(rows){
    const list = Array.from(rows || []);
    const logical = new Set();
    const imageRefs = new Map();
    const years = new Set();
    const levels = new Set();
    const papers = new Set();
    let marks = 0;

    for (const row of list){
      const qno = logicalQuestionNumber(row);
      if (qno) logical.add(qno);
      const mark = Number(row?.marks);
      if (Number.isFinite(mark)) marks += mark;
      if (Number.isFinite(Number(row?.exam_year))) years.add(Number(row.exam_year));
      if (Number.isFinite(Number(row?.year_level))) levels.add(Number(row.year_level));
      if (trim(row?.paper)) papers.add(trim(row.paper));
      const ref = trim(row?.image_url);
      if (ref && !isRemoteImageRef(ref)){
        const name = imageNameFromRef(ref);
        if (name) imageRefs.set(lower(name),name);
      }
    }

    return {
      rowCount:list.length,
      logicalQuestions:logical.size,
      marks,
      examYears:[...years],
      yearLevels:[...levels],
      papers:[...papers],
      requiredImageNames:[...imageRefs.values()],
      requiredImageCount:imageRefs.size
    };
  }

  function packageImageCoverage(rows,inventory){
    const stats = packageCsvStats(rows);
    const selected = new Map();
    for (const file of inventory?.images || []){
      const name = baseName(filePath(file));
      const key = lower(name);
      if (!selected.has(key)) selected.set(key,[]);
      selected.get(key).push(file);
    }
    const missing = stats.requiredImageNames.filter(name => !selected.has(lower(name)));
    const matched = stats.requiredImageNames.filter(name => (selected.get(lower(name)) || []).length === 1);
    const duplicateRequired = stats.requiredImageNames.filter(name => (selected.get(lower(name)) || []).length > 1);
    const referenced = new Set(stats.requiredImageNames.map(lower));
    const extras = [...selected.entries()].filter(([key]) => !referenced.has(key)).map(([,group]) => baseName(filePath(group[0])));
    return {
      requiredCount:stats.requiredImageCount,
      matchedCount:matched.length,
      missing,
      duplicateRequired,
      extras
    };
  }

  function comparablePaper(value){
    const text = normPaper(value);
    if (/^(?:paper\s*)?1$/.test(text) || /^p\s*1$/.test(text)) return 'paper 1';
    if (/^(?:paper\s*)?2$/.test(text) || /^p\s*2$/.test(text)) return 'paper 2';
    return text;
  }

  function manifestAudit(manifest,rows,inventory){
    const stats = packageCsvStats(rows);
    const checks = [];
    const warnings = [];
    const errors = [];

    function check(label,actual,expected,normalizer=value=>value){
      if (expected === undefined || expected === null || expected === '') return;
      const a = normalizer(actual), e = normalizer(expected);
      const pass = Array.isArray(a) ? a.length === 1 && String(a[0]) === String(e) : String(a) === String(e);
      checks.push({label,actual,expected,pass});
      if (!pass) errors.push(`${label} does not match the package manifest`);
    }

    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)){
      errors.push('manifest.json is missing or invalid');
      return {checks,warnings,errors,stats};
    }

    check('Year level',stats.yearLevels,manifest.year_level,value => Array.isArray(value) ? value.map(Number) : Number(value));
    check('Exam year',stats.examYears,manifest.exam_year,value => Array.isArray(value) ? value.map(Number) : Number(value));
    check('Paper',stats.papers,manifest.paper,value => Array.isArray(value) ? value.map(comparablePaper) : comparablePaper(value));
    check('CSV rows',stats.rowCount,manifest.csv_rows_generated,Number);
    check('Logical questions',stats.logicalQuestions,manifest.questions_detected,Number);
    check('CSV marks',stats.marks,manifest.csv_marks_total,Number);
    check('Paper marks',stats.marks,manifest.paper_total_marks,Number);
    check('Images required',stats.requiredImageCount,manifest.images_required,Number);
    check('Images generated',(inventory?.images || []).length,manifest.images_generated,Number);

    const validation = manifest.validation_results;
    if (validation && typeof validation === 'object' && !Array.isArray(validation)){
      const failed = Object.entries(validation).filter(([,value]) => value === false).map(([key]) => key);
      if (failed.length) errors.push(`Manifest reports failed validation: ${failed.join(', ')}`);
    }
    const auditErrors = Number(manifest?.audit_counts?.ERROR || 0);
    if (auditErrors > 0) errors.push(`Manifest reports ${auditErrors} audit error${auditErrors===1?'':'s'}`);
    const reviews = Number(manifest?.audit_counts?.REVIEW || 0) || (Array.isArray(manifest.review_items) ? manifest.review_items.length : 0);
    if (reviews > 0) warnings.push(`${reviews} manifest review item${reviews===1?'':'s'} require teacher awareness`);
    const finalStatus = trim(manifest.final_status);
    if (/^(?:fail|error)/i.test(finalStatus)) errors.push(`Manifest final status is ${finalStatus}`);
    else if (finalStatus && !/^pass$/i.test(finalStatus) && !/^pass_with_review_items$/i.test(finalStatus)) warnings.push(`Manifest final status: ${finalStatus}`);

    return {checks,warnings,errors,stats};
  }

  function importCounts(rows){
    const list = Array.from(rows || []);
    return {
      total:list.length,
      ready:list.filter(row => row?._valid !== false && !row?._duplicate).length,
      duplicates:list.filter(row => !!row?._duplicate).length,
      invalid:list.filter(row => row?._valid === false).length
    };
  }

  function evaluateReadiness({inventory,manifestAuditResult,imageCoverage,imageReport,rows}){
    const blockers = [];
    const warnings = [];
    if ((inventory?.questions || []).length !== 1) blockers.push('Package must contain exactly one questions.csv');
    if ((inventory?.manifests || []).length !== 1) blockers.push('Package must contain exactly one manifest.json');
    if ((inventory?.audits || []).length !== 1) blockers.push('Package must contain exactly one audit_report.xlsx');
    if ((inventory?.duplicateImageNames || []).length) blockers.push('Package contains duplicate image filenames');
    blockers.push(...(manifestAuditResult?.errors || []));
    warnings.push(...(manifestAuditResult?.warnings || []));
    if ((imageCoverage?.missing || []).length) blockers.push('One or more CSV image references are missing from the package');
    if ((imageCoverage?.duplicateRequired || []).length) blockers.push('One or more required image filenames occur more than once');
    const counts = importCounts(rows);
    if (counts.invalid) blockers.push(`${counts.invalid} CSV row${counts.invalid===1?' needs':'s need'} attention`);
    if (imageReport){
      if ((imageReport.missing || []).length) blockers.push('One or more images required by ready rows are not matched');
      if ((imageReport.duplicateFileNames || []).length) blockers.push('Duplicate selected image filenames block upload');
      if ((imageReport.invalidMatches || []).length) blockers.push('One or more matched images are unsupported or oversized');
      if ((imageReport.orphanFiles || []).length) warnings.push(`${imageReport.orphanFiles.length} selected image${imageReport.orphanFiles.length===1?' is':'s are'} not needed by the current ready rows`);
    }
    return {ready:blockers.length===0,blockers:[...new Set(blockers)],warnings:[...new Set(warnings)],counts};
  }

  function currentImportRows(){
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

  function esc(value){
    return trim(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function shortList(values,limit=5){
    const list = [...new Set((values || []).filter(Boolean))];
    const shown = list.slice(0,limit).map(esc).join(', ');
    return list.length > limit ? `${shown}, +${list.length-limit} more` : shown;
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v51a4-package-panel');
    if (panel) return panel;
    const dropzone = document.querySelector('#import-panel .dropzone');
    if (!dropzone) return null;
    panel = document.createElement('div');
    panel.id = 'v51a4-package-panel';
    panel.className = 'info';
    panel.innerHTML = `
      <strong>0. Preview digitisation package — V5.1A4</strong>
      <p class="muted" style="margin:7px 0 10px">Choose the extracted paper-package folder once. The app will identify <code>questions.csv</code>, <code>manifest.json</code>, <code>audit_report.xlsx</code> and the image files, then reuse the existing CSV, paper-profile and image checks.</p>
      <label style="font-weight:700">Package folder
        <input id="v51a4-package-folder" type="file" webkitdirectory directory multiple aria-label="Digitisation package folder">
      </label>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">Fallback: select package files manually</summary><input id="v51a4-package-files" type="file" multiple accept=".csv,.json,.xlsx,.png,.jpg,.jpeg,.webp,text/csv,application/json,image/png,image/jpeg,image/webp" style="margin-top:8px" aria-label="Digitisation package files"></details>
      <div class="buttons" style="margin-top:12px">
        <button id="v51a4-preview-package" class="outline" type="button">Preview Package</button>
        <button id="v51a4-clear-package" class="secondary" type="button">Clear Package</button>
      </div>
      <div id="v51a4-package-report" style="margin-top:10px"><span class="muted">No package selected yet.</span></div>
      <div class="help" style="margin-top:9px">A4 is preview-only. It does not upload images or import questions automatically; those existing actions remain separate until V5.1A5.</div>`;
    dropzone.insertAdjacentElement('beforebegin',panel);
    return panel;
  }

  function basicInventoryProblems(inventory){
    const blockers = [];
    if (inventory.questions.length !== 1) blockers.push(`questions.csv: ${inventory.questions.length} found`);
    if (inventory.manifests.length !== 1) blockers.push(`manifest.json: ${inventory.manifests.length} found`);
    if (inventory.audits.length !== 1) blockers.push(`audit_report.xlsx: ${inventory.audits.length} found`);
    if (inventory.duplicateImageNames.length) blockers.push(`duplicate image filenames: ${shortList(inventory.duplicateImageNames)}`);
    return blockers;
  }

  function render(){
    const panel = ensurePanel();
    if (!panel) return null;
    const reportEl = document.getElementById('v51a4-package-report');
    const previewButton = document.getElementById('v51a4-preview-package');
    const clearButton = document.getElementById('v51a4-clear-package');
    const inventory = state.inventory || classifyPackageFiles(state.files);
    state.inventory = inventory;
    previewButton.disabled = state.previewing || !state.files.length;
    clearButton.disabled = state.previewing || !state.files.length;

    if (!state.files.length){
      reportEl.innerHTML = '<span class="muted">No package selected yet.</span>';
      return null;
    }

    const inventoryProblems = basicInventoryProblems(inventory);
    const fileSummary = `<div><strong>${inventory.files.length}</strong> files selected • <strong>${inventory.questions.length}</strong> questions.csv • <strong>${inventory.manifests.length}</strong> manifest.json • <strong>${inventory.audits.length}</strong> audit_report.xlsx • <strong>${inventory.images.length}</strong> images</div>`;

    if (!state.packageRows.length){
      reportEl.innerHTML = `<div class="feedback ${inventoryProblems.length?'try':'correct'}" style="margin:0">${fileSummary}${inventoryProblems.length?`<div style="margin-top:6px">⚠ ${inventoryProblems.map(esc).join('<br>⚠ ')}</div>`:'<div style="margin-top:6px">✅ Standard package components detected. Click Preview Package to run the existing import checks.</div>'}${state.message?`<div style="margin-top:6px"><strong>${esc(state.message)}</strong></div>`:''}</div>`;
      return {inventory};
    }

    const rows = currentImportRows();
    const counts = importCounts(rows);
    const manifestResult = manifestAudit(state.manifest,state.packageRows,inventory);
    const coverage = packageImageCoverage(state.packageRows,inventory);
    let imageReport = null;
    try { imageReport = window.V51BulkQuestionImageUpload?.buildMatchReport?.(rows,inventory.images) || null; } catch {}
    let profiles = [];
    try { profiles = window.V51PaperProfileValidator?.buildProfiles?.(currentTeacherQuestions(),rows) || []; } catch {}
    const readiness = evaluateReadiness({inventory,manifestAuditResult:manifestResult,imageCoverage:coverage,imageReport,rows});

    const manifestPassed = manifestResult.checks.filter(check => check.pass).length;
    const manifestTotal = manifestResult.checks.length;
    const profileHtml = profiles.length
      ? profiles.map(item => `${esc(item.examYear)} ${esc(item.paper)}: <strong>${esc(item.logicalQuestions)}/${esc(item.expectedLogicalQuestions)} questions · ${esc(item.totalMarks)}/${esc(item.expectedMarks)} marks · ${esc(item.status.toUpperCase())}</strong>`).join('<br>')
      : '<span class="muted">No Paper 1/2 profile required for this package.</span>';
    const imageStage = imageReport
      ? `${imageReport.requiredCount} required for new rows · ${imageReport.matchedCount} matched · ${imageReport.missing.length} missing · ${imageReport.orphanFiles.length} currently not needed`
      : 'A2 image matcher unavailable';
    const issues = [
      ...readiness.blockers.map(item=>`<div>⚠ ${esc(item)}</div>`),
      ...readiness.warnings.map(item=>`<div class="muted">ℹ ${esc(item)}</div>`)
    ].join('');

    reportEl.innerHTML = `
      <div class="feedback ${readiness.ready?'correct':'try'}" style="margin:0">
        <div><strong>${readiness.ready?'✅ Package ready for staged import':'⚠ Package needs attention'}</strong></div>
        <div style="margin-top:8px;display:grid;gap:7px">
          ${fileSummary}
          <div><strong>CSV:</strong> ${counts.total} rows · ${counts.ready} ready · ${counts.duplicates} duplicates skipped · ${counts.invalid} need attention</div>
          <div><strong>Manifest:</strong> ${manifestTotal ? `${manifestPassed}/${manifestTotal} consistency checks passed` : 'no comparable fields found'}${state.manifestError?` · ${esc(state.manifestError)}`:''}</div>
          <div><strong>Package images:</strong> ${coverage.requiredCount} referenced · ${coverage.matchedCount} present · ${coverage.missing.length} missing${coverage.extras.length?` · ${coverage.extras.length} extra`:''}</div>
          <div><strong>Current image upload stage:</strong> ${esc(imageStage)}</div>
          <div><strong>Paper profile:</strong><br>${profileHtml}</div>
          ${issues ? `<div style="display:grid;gap:4px">${issues}</div>` : ''}
        </div>
      </div>`;
    return {inventory,counts,manifestResult,coverage,imageReport,profiles,readiness};
  }

  function setSelectedFiles(files,sourceId){
    state.files = Array.from(files || []);
    state.inventory = classifyPackageFiles(state.files);
    state.manifest = null;
    state.manifestError = '';
    state.packageRows = [];
    state.message = '';
    const otherId = sourceId === 'v51a4-package-folder' ? 'v51a4-package-files' : 'v51a4-package-folder';
    const other = typeof document !== 'undefined' ? document.getElementById(otherId) : null;
    if (other) other.value = '';
    render();
  }

  function assignFilesToInput(input,files){
    if (!input) throw new Error('Required file input is not available.');
    if (typeof DataTransfer === 'undefined') throw new Error('This browser cannot transfer package files into the existing importer. Use the normal CSV/image controls instead.');
    const transfer = new DataTransfer();
    for (const file of files || []) transfer.items.add(file);
    input.files = transfer.files;
  }

  function sleep(ms){ return new Promise(resolve => window.setTimeout(resolve,ms)); }

  async function waitForCsvPreview(previousRows,timeoutMs=5000){
    const started = Date.now();
    while (Date.now()-started < timeoutMs){
      const rows = currentImportRows();
      if (rows !== previousRows && rows.length) return rows;
      const summary = document.getElementById('import-summary');
      if (summary && !summary.classList.contains('hidden') && /missing columns/i.test(summary.textContent || '')) return [];
      await sleep(40);
    }
    return currentImportRows();
  }

  async function previewPackage(){
    if (state.previewing) return;
    const inventory = state.inventory || classifyPackageFiles(state.files);
    state.inventory = inventory;
    const problems = basicInventoryProblems(inventory);
    if (problems.length){
      state.message = 'Fix the package structure before previewing.';
      state.messageKind = 'incorrect';
      render();
      return;
    }

    try {
      const uncommitted = window.V51BulkQuestionImageCleanup?.uncommittedPaths?.() || [];
      if (uncommitted.length){
        state.message = 'Clear the current CSV preview first so its uncommitted image batch can be removed safely.';
        state.messageKind = 'incorrect';
        render();
        return;
      }
    } catch {}

    state.previewing = true;
    state.message = 'Reading package files…';
    state.messageKind = 'try';
    render();

    try {
      try {
        state.manifest = JSON.parse(await inventory.manifests[0].text());
        state.manifestError = '';
      } catch (error){
        state.manifest = null;
        state.manifestError = `manifest.json could not be parsed: ${String(error?.message || error)}`;
      }

      const csvInput = document.getElementById('csv-file');
      const previousRows = currentImportRows();
      assignFilesToInput(csvInput,[inventory.questions[0]]);
      document.getElementById('preview-csv')?.click();
      const rows = await waitForCsvPreview(previousRows);
      if (!rows.length){
        state.packageRows = [];
        state.message = 'The CSV preview did not produce valid preview rows. Check the existing CSV message below.';
        state.messageKind = 'incorrect';
        return;
      }

      state.packageRows = rows.map(row => ({...row,response_config:row?.response_config && typeof row.response_config === 'object' ? JSON.parse(JSON.stringify(row.response_config)) : row?.response_config}));

      const imageInput = document.getElementById('v51a2-image-files');
      if (imageInput){
        assignFilesToInput(imageInput,inventory.images);
        imageInput.dispatchEvent(new Event('change',{bubbles:true}));
      }
      try { window.V51PaperProfileValidator?.renderCurrentPreview?.(); } catch {}
      try { window.V51BulkQuestionImageUpload?.render?.(); } catch {}
      state.message = 'Package preview complete.';
      state.messageKind = 'correct';
    } catch (error){
      state.message = String(error?.message || error || 'Package preview failed.');
      state.messageKind = 'incorrect';
    } finally {
      state.previewing = false;
      render();
    }
  }

  async function clearPackage(){
    if (state.previewing) return;
    try {
      if (window.V51BulkQuestionImageCleanup?.uncommittedPaths?.().length){
        const cleared = await window.V51BulkQuestionImageCleanup.clearPreviewWithCleanup();
        if (!cleared) return;
      } else if (typeof clearImport === 'function'){
        clearImport();
      }
    } catch {}
    state.files = [];
    state.inventory = null;
    state.manifest = null;
    state.manifestError = '';
    state.packageRows = [];
    state.message = '';
    for (const id of ['v51a4-package-folder','v51a4-package-files']){
      const input = document.getElementById(id);
      if (input) input.value = '';
    }
    render();
  }

  function wire(){
    if (typeof document === 'undefined') return;
    const panel = ensurePanel();
    if (!panel) return;
    document.getElementById('v51a4-package-folder')?.addEventListener('change',event => setSelectedFiles(event.target.files,'v51a4-package-folder'));
    document.getElementById('v51a4-package-files')?.addEventListener('change',event => setSelectedFiles(event.target.files,'v51a4-package-files'));
    document.getElementById('v51a4-preview-package')?.addEventListener('click',previewPackage);
    document.getElementById('v51a4-clear-package')?.addEventListener('click',clearPackage);

    const summary = document.getElementById('import-summary');
    if (summary && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(() => window.requestAnimationFrame(render));
      observer.observe(summary,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    const a2Panel = document.getElementById('v51a2-bulk-image-panel');
    if (a2Panel && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(() => window.requestAnimationFrame(render));
      observer.observe(a2Panel,{childList:true,subtree:true});
    }
    render();
  }

  const api = Object.freeze({
    filePath,
    baseName,
    classifyPackageFiles,
    packageCsvStats,
    packageImageCoverage,
    manifestAudit,
    importCounts,
    evaluateReadiness,
    render
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51PaperPackagePreview',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.1A4 — package-preview status wording polish.
   Distinguishes a fully validated package with no new rows from one ready for staged import.
   Presentation-only: no import, Storage, grading or database behavior changes. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51PaperPackagePreviewStatusInstalled) return;
  if (typeof window !== 'undefined') window.__v51PaperPackagePreviewStatusInstalled = true;

  function statusLabel({ready,readyRows=0,invalidRows=0}={}){
    if (!ready) return '⚠ Package needs attention';
    if (Number(readyRows) === 0 && Number(invalidRows) === 0) return '✅ Package validated — already fully imported';
    return '✅ Package ready for staged import';
  }

  function reportCounts(text){
    const value = String(text || '');
    const ready = value.match(/CSV:\s*\d+\s+rows\s*·\s*(\d+)\s+ready/i);
    const invalid = value.match(/·\s*(\d+)\s+need attention/i);
    return {
      readyRows:ready ? Number(ready[1]) : null,
      invalidRows:invalid ? Number(invalid[1]) : null
    };
  }

  function refresh(){
    if (typeof document === 'undefined') return;
    const report = document.getElementById('v51a4-package-report');
    if (!report) return;
    const feedback = report.querySelector('.feedback');
    const headline = feedback?.querySelector('div > strong');
    if (!feedback || !headline) return;

    const text = report.textContent || '';
    const ready = /Package ready for staged import|Package validated — already fully imported/i.test(headline.textContent || '');
    if (!ready && /Package needs attention/i.test(headline.textContent || '')) return;

    const counts = reportCounts(text);
    if (counts.readyRows == null || counts.invalidRows == null) return;
    const nextLabel = statusLabel({ready:true,...counts});
    if (headline.textContent !== nextLabel) headline.textContent = nextLabel;
  }

  function wire(){
    if (typeof document === 'undefined') return;
    const attach = () => {
      const report = document.getElementById('v51a4-package-report');
      if (!report) return false;
      refresh();
      if (typeof MutationObserver !== 'undefined'){
        const observer = new MutationObserver(() => refresh());
        observer.observe(report,{childList:true,subtree:true,characterData:true});
      }
      return true;
    };
    if (!attach()){
      const timer = window.setInterval(() => { if (attach()) window.clearInterval(timer); },100);
      window.setTimeout(() => window.clearInterval(timer),5000);
    }
  }

  const api = Object.freeze({statusLabel,reportCounts,refresh});
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51PaperPackagePreviewStatus',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.1A5 — One-confirmation validated paper import.
   Orchestrates the production-validated A4 package preview, A2 image upload and existing
   CSV importer behind one deliberate teacher confirmation. It does not implement a new
   Storage upload or questions-table write path. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51OneConfirmationPaperImportInstalled) return;
  if (typeof window !== 'undefined') window.__v51OneConfirmationPaperImportInstalled = true;

  const state = {
    running:false,
    message:'',
    messageKind:'try',
    lastPlan:null
  };

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

  function cloudTeacherReady(){
    try {
      return typeof cloudReady !== 'undefined' && !!cloudReady && typeof teacherUser !== 'undefined' && !!teacherUser;
    } catch {
      return false;
    }
  }

  function packagePreviewReady(){
    if (typeof document === 'undefined') return false;
    const report = document.getElementById('v51a4-package-report');
    if (!report) return false;
    const text = report.textContent || '';
    const feedback = report.querySelector('.feedback.correct');
    return !!feedback && /CSV:/i.test(text) && /Manifest:/i.test(text) && /Package images:/i.test(text) && !/Package needs attention/i.test(text);
  }

  function importCounts(rows=currentRows()){
    try {
      const fn = window.V51PaperPackagePreview?.importCounts;
      if (typeof fn === 'function') return fn(rows);
    } catch {}
    const list = Array.from(rows || []);
    return {
      total:list.length,
      ready:list.filter(row => row?._valid !== false && !row?._duplicate).length,
      duplicates:list.filter(row => !!row?._duplicate).length,
      invalid:list.filter(row => row?._valid === false).length
    };
  }

  function selectedImageFiles(){
    if (typeof document === 'undefined') return [];
    return Array.from(document.getElementById('v51a2-image-files')?.files || []);
  }

  function imageReport(rows=currentRows(),files=selectedImageFiles()){
    try {
      return window.V51BulkQuestionImageUpload?.buildMatchReport?.(rows,files) || null;
    } catch {
      return null;
    }
  }

  function paperIdentity(rows=currentRows()){
    const list = Array.from(rows || []);
    const first = list.find(row => row?._valid !== false && !row?._duplicate) || list[0] || {};
    return {
      yearLevel:Number(first.year_level) || null,
      examYear:Number(first.exam_year) || null,
      paper:trim(first.paper),
      sourceType:trim(first.source_type)
    };
  }

  function standardPastPaper(identity=paperIdentity()){
    if (trim(identity.sourceType).toLowerCase() !== 'past_paper') return false;
    try {
      return !!window.V51PaperProfileValidator?.paperProfile?.(identity.paper);
    } catch {
      return /^(?:paper\s*)?[12]$/i.test(trim(identity.paper));
    }
  }

  function packageProfile(rows=currentRows()){
    const identity = paperIdentity(rows);
    if (!standardPastPaper(identity)){
      return {required:false,pass:true,status:'not_required',identity};
    }

    let profile = null;
    let stats = null;
    try { profile = window.V51PaperProfileValidator?.paperProfile?.(identity.paper) || null; } catch {}
    try { stats = window.V51PaperPackagePreview?.packageCsvStats?.(rows) || null; } catch {}

    if (!profile || !stats){
      return {required:true,pass:false,status:'unavailable',identity,profile,stats};
    }

    const logicalQuestions = Number(stats.logicalQuestions || 0);
    const totalMarks = Number(stats.marks || 0);
    const expectedLogicalQuestions = Number(profile.expectedLogicalQuestions || 0);
    const expectedMarks = Number(profile.expectedMarks || 0);
    const countDelta = logicalQuestions - expectedLogicalQuestions;
    const marksDelta = totalMarks - expectedMarks;
    let status = 'pass';
    if (countDelta < 0 || marksDelta < 0) status = 'incomplete';
    if (countDelta > 0 || marksDelta > 0) status = 'attention';

    return {
      required:true,
      pass:status === 'pass',
      status,
      identity,
      logicalQuestions,
      totalMarks,
      expectedLogicalQuestions,
      expectedMarks,
      countDelta,
      marksDelta
    };
  }

  function logicalQuestionNumber(row){
    try {
      const fn = window.V51PaperProfileValidator?.logicalQuestionNumber;
      if (typeof fn === 'function') return trim(fn(row));
    } catch {}
    const parent = trim(row?.parent_question_number);
    if (parent) return parent.replace(/^q\s*/i,'').trim();
    const raw = trim(row?.question_number).replace(/^q\s*/i,'');
    const multipart = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
    return multipart ? multipart[1] : raw;
  }

  function inactiveLogicalQuestions(rows=currentRows()){
    const set = new Set();
    for (const row of rows || []){
      if (row?._valid === false || row?.active !== false) continue;
      const logical = logicalQuestionNumber(row);
      if (logical) set.add(logical);
    }
    return [...set]
      .sort((a,b) => {
        const na = Number(a), nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na-nb;
        return String(a).localeCompare(String(b));
      })
      .map(value => /^q/i.test(String(value)) ? String(value) : `Q${value}`);
  }

  function currentPaperProfiles(rows=currentRows()){
    try {
      const fn = window.V51PaperProfileValidator?.buildProfiles;
      if (typeof fn === 'function') return Array.from(fn(currentTeacherQuestions(),rows) || []);
    } catch {}
    return [];
  }

  function packageCompletenessIssues(rows=currentRows(),profile=packageProfile(rows)){
    if (!profile.required) return [];
    if (profile.status === 'unavailable') return ['Full-package Paper 1/2 profile QA is unavailable'];
    if (profile.pass) return [];
    const label = [profile.identity?.examYear,profile.identity?.paper].filter(Boolean).join(' ') || 'Paper';
    return [
      `${label} digitisation package must contain the complete paper before one-confirmation import ` +
      `(${profile.logicalQuestions}/${profile.expectedLogicalQuestions} logical questions · ${profile.totalMarks}/${profile.expectedMarks} marks)`
    ];
  }

  function imageBlockingIssues(report){
    if (!report) return ['V5.1A2 image matcher is unavailable'];
    const issues = [];
    if ((report.missing || []).length) issues.push(`${report.missing.length} required image${report.missing.length===1?' is':'s are'} missing`);
    if ((report.duplicateFileNames || []).length) issues.push('duplicate selected image filenames must be resolved');
    if ((report.invalidMatches || []).length) issues.push('one or more matched images are unsupported or oversized');
    return issues;
  }

  function buildPlan({rows=currentRows(),packageReady=packagePreviewReady(),cloudReadyForTeacher=cloudTeacherReady(),files=selectedImageFiles()}={}){
    const counts = importCounts(rows);
    const images = imageReport(rows,files);
    const identity = paperIdentity(rows);
    const fullPackageProfile = packageProfile(rows);
    const packageIssues = packageCompletenessIssues(rows,fullPackageProfile);
    const activeProfiles = currentPaperProfiles(rows);
    const inactiveQuestions = inactiveLogicalQuestions(rows);
    const examReady = !standardPastPaper(identity) || (activeProfiles.length>0 && activeProfiles.every(item => item?.status === 'pass'));
    const blockers = [];
    if (!packageReady) blockers.push('Run a clean V5.1A4 package preview first');
    if (counts.invalid) blockers.push(`${counts.invalid} CSV row${counts.invalid===1?' needs':'s need'} attention`);
    if (!counts.ready && counts.total) blockers.push('No new valid rows are ready to import');
    if (!counts.total) blockers.push('No CSV preview rows are loaded');
    blockers.push(...packageIssues);
    blockers.push(...imageBlockingIssues(images));
    if (!cloudReadyForTeacher) blockers.push('Cloud Teacher mode is required');

    const localRows = (() => {
      try { return window.V51BulkQuestionImageUpload?.localImageRows?.(rows) || []; }
      catch { return []; }
    })();
    const imagesToUpload = images?.requiresUpload ? Number(images.matchedCount || 0) : 0;

    return {
      ready:blockers.length===0,
      alreadyImported:counts.total>0 && counts.ready===0 && counts.invalid===0 && packageReady,
      counts,
      images,
      imagesToUpload,
      localImageRows:localRows.length,
      identity,
      packageProfile:fullPackageProfile,
      packageProfilePass:!fullPackageProfile.required || fullPackageProfile.pass,
      activeProfiles,
      examReady,
      inactiveLogicalQuestions:inactiveQuestions,
      blockers
    };
  }

  function paperLabel(identity={}){
    const parts = [];
    if (identity.examYear) parts.push(String(identity.examYear));
    if (identity.paper) parts.push(identity.paper);
    return parts.join(' ') || 'this paper package';
  }

  function profileSummary(profile){
    if (!profile?.required) return '';
    return `${profile.logicalQuestions}/${profile.expectedLogicalQuestions} logical questions · ${profile.totalMarks}/${profile.expectedMarks} marks`;
  }

  function activeProfileSummary(plan){
    const item = (plan?.activeProfiles || [])[0];
    if (!item) return '';
    return `${item.logicalQuestions}/${item.expectedLogicalQuestions} logical questions · ${item.totalMarks}/${item.expectedMarks} marks`;
  }

  function confirmationText(plan){
    const rows = Number(plan?.counts?.ready || 0);
    const images = Number(plan?.imagesToUpload || 0);
    const label = paperLabel(plan?.identity || {});
    const lines = [
      `Import ${label} now?`,
      '',
      `${rows} new question row${rows===1?'':'s'} will be added${images ? ` after uploading ${images} matched image${images===1?'':'s'}` : ''}.`
    ];

    if (plan?.packageProfile?.required){
      lines.push(`Digitisation package is complete: ${profileSummary(plan.packageProfile)}.`);
    }
    if ((plan?.inactiveLogicalQuestions || []).length){
      const q = plan.inactiveLogicalQuestions.join(', ');
      lines.push(`Review warning: ${q} ${plan.inactiveLogicalQuestions.length===1?'is':'are'} inactive and will stay inactive after import.`);
      if (!plan.examReady){
        const activeSummary = activeProfileSummary(plan);
        lines.push(`Active exam-profile QA remains incomplete${activeSummary ? ` (${activeSummary})` : ''} until the review item${plan.inactiveLogicalQuestions.length===1?' is':'s are'} resolved and activated.`);
      }
    }
    lines.push(
      'This writes to the configured Supabase question bank. Existing duplicates remain skipped.',
      'No Exam Setting will be created or enabled automatically.'
    );
    return lines.join('\n');
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById('v51a5-import-panel');
    if (root) return root;
    const a4 = document.getElementById('v51a4-package-panel');
    if (!a4) return null;
    root = document.createElement('div');
    root.id = 'v51a5-import-panel';
    root.className = 'info';
    root.style.marginTop = '12px';
    root.innerHTML = `
      <strong>V5.1A5 — Validated paper import</strong>
      <p class="muted" style="margin:7px 0 10px">After A4 validates a complete digitisation package, one confirmation runs the existing image-upload and question-import stages in order. Inactive review rows may be imported safely and remain inactive.</p>
      <div class="buttons">
        <button id="v51a5-import-paper" class="primary" type="button" disabled>Import Paper</button>
      </div>
      <div id="v51a5-import-status" class="help" style="margin-top:8px">Run Preview Package first.</div>`;
    a4.appendChild(root);
    return root;
  }

  function render(){
    const root = ensurePanel();
    if (!root) return null;
    const button = document.getElementById('v51a5-import-paper');
    const status = document.getElementById('v51a5-import-status');
    const plan = buildPlan();
    state.lastPlan = plan;

    if (state.running){
      button.disabled = true;
      button.textContent = 'Importing Paper…';
      status.className = `feedback ${state.messageKind}`;
      status.textContent = state.message || 'Import in progress…';
      return plan;
    }

    if (state.message){
      status.className = `feedback ${state.messageKind}`;
      status.textContent = state.message;
    } else if (plan.alreadyImported){
      status.className = 'feedback correct';
      status.textContent = 'Package is already fully imported. No new question rows are required.';
    } else if (plan.ready){
      const packageNote = plan.packageProfile?.required ? ` • package complete ${profileSummary(plan.packageProfile)}` : '';
      const reviewNote = plan.inactiveLogicalQuestions.length
        ? ` • ⚠ ${plan.inactiveLogicalQuestions.join(', ')} inactive; active exam-profile QA remains incomplete until reviewed`
        : '';
      status.className = plan.inactiveLogicalQuestions.length ? 'feedback try' : 'feedback correct';
      status.textContent = `${plan.counts.ready} new row${plan.counts.ready===1?'':'s'} ready${plan.imagesToUpload?` • ${plan.imagesToUpload} image${plan.imagesToUpload===1?'':'s'} will be uploaded first`:''}${packageNote}${reviewNote}.`;
    } else {
      status.className = plan.packageProfilePass ? 'help' : 'feedback try';
      status.textContent = plan.blockers[0] || 'Run Preview Package first.';
    }

    button.disabled = !plan.ready;
    if (plan.alreadyImported) button.textContent = 'Already Imported';
    else if (!plan.packageProfilePass && plan.counts.ready>0) button.textContent = 'Package Incomplete';
    else button.textContent = `Import Paper${plan.ready ? ` (${plan.counts.ready})` : ''}`;
    return plan;
  }

  function sleep(ms){ return new Promise(resolve => window.setTimeout(resolve,ms)); }

  async function waitForImageStage(timeoutMs=120000){
    const started = Date.now();
    while (Date.now()-started < timeoutMs){
      const rows = currentRows();
      const api = window.V51BulkQuestionImageUpload;
      const local = api?.localImageRows?.(rows) || [];
      if (rows.length && !api?.importIsBlocked?.() && local.length===0) return true;
      const panelText = document.getElementById('v51a2-bulk-image-panel')?.textContent || '';
      if (/Upload stopped|requires Cloud Teacher|Resolve missing, duplicate or invalid|could not be generated/i.test(panelText)){
        throw new Error(trim(panelText).replace(/\s+/g,' '));
      }
      await sleep(60);
    }
    throw new Error('Image upload did not finish within two minutes. The preview was kept so you can inspect or retry it safely.');
  }

  async function runExistingImageUpload(plan){
    const api = window.V51BulkQuestionImageUpload;
    const local = api?.localImageRows?.(currentRows()) || [];
    if (!local.length) return 0;
    if (!plan.images?.readyToUpload) throw new Error('Matched images are not ready for upload.');
    const button = document.getElementById('v51a2-upload-images');
    if (!button || button.disabled) throw new Error('The existing V5.1A2 image upload action is not available.');
    state.message = `Uploading ${plan.imagesToUpload} matched image${plan.imagesToUpload===1?'':'s'}…`;
    state.messageKind = 'try';
    render();
    button.click();
    await waitForImageStage();
    return plan.imagesToUpload;
  }

  async function waitForQuestionImport({beforeTeacherCount,readyCount,timeoutMs=120000}){
    const button = document.getElementById('import-btn');
    const started = Date.now();
    let sawDisabled = !!button?.disabled;
    while (Date.now()-started < timeoutMs){
      if (!currentRows().length){
        const refreshStarted = Date.now();
        while (Date.now()-refreshStarted < 20000){
          if (currentTeacherQuestions().length >= beforeTeacherCount + readyCount) return {success:true,refreshed:true};
          await sleep(80);
        }
        return {success:true,refreshed:false};
      }
      if (button?.disabled) sawDisabled = true;
      if (sawDisabled && button && !button.disabled && currentRows().length) return {success:false,refreshed:false};
      await sleep(60);
    }
    return {success:false,timeout:true,refreshed:false};
  }

  async function runExistingQuestionImport(plan){
    const button = document.getElementById('import-btn');
    if (!button || button.disabled) throw new Error('The existing question import action is not ready.');
    const beforeTeacherCount = currentTeacherQuestions().length;
    const readyCount = plan.counts.ready;
    const capturedAlerts = [];
    const originalAlert = window.alert;
    window.alert = message => capturedAlerts.push(String(message || ''));
    try {
      state.message = `Importing ${readyCount} question row${readyCount===1?'':'s'}…`;
      state.messageKind = 'try';
      render();
      button.click();
      const result = await waitForQuestionImport({beforeTeacherCount,readyCount});
      const alertText = capturedAlerts.join(' ').trim();
      if (!result.success){
        throw new Error(alertText || (result.timeout ? 'Question import did not finish within two minutes.' : 'The existing question importer stopped before completion.'));
      }
      return {...result,alertText};
    } finally {
      window.alert = originalAlert;
    }
  }

  async function importPaper(){
    if (state.running) return false;
    const plan = buildPlan();
    state.lastPlan = plan;
    if (!plan.ready){
      state.message = plan.blockers[0] || 'Package is not ready for import.';
      state.messageKind = 'incorrect';
      render();
      return false;
    }

    const approved = window.confirm(confirmationText(plan));
    if (!approved){
      state.message = 'Import cancelled. No changes were made.';
      state.messageKind = 'try';
      render();
      return false;
    }

    state.running = true;
    state.message = 'Starting validated paper import…';
    state.messageKind = 'try';
    render();

    let uploadedCount = 0;
    try {
      uploadedCount = await runExistingImageUpload(plan);
      const importResult = await runExistingQuestionImport(plan);
      state.messageKind = 'correct';
      const inactiveNote = plan.inactiveLogicalQuestions.length
        ? ` ${plan.inactiveLogicalQuestions.join(', ')} ${plan.inactiveLogicalQuestions.length===1?'was':'were'} imported inactive for teacher review.`
        : '';
      state.message = `${plan.counts.ready} new question row${plan.counts.ready===1?'':'s'} imported successfully${uploadedCount?` after uploading ${uploadedCount} image${uploadedCount===1?'':'s'}`:''}.${inactiveNote}${importResult.refreshed?'':' Question-bank refresh is still catching up; use Refresh if needed.'}`;
      return true;
    } catch (error){
      state.messageKind = 'incorrect';
      state.message = `${String(error?.message || error || 'Paper import failed.')} The current preview was kept. Retry after resolving the issue, or use Clear Preview to invoke the existing safe image cleanup.`;
      return false;
    } finally {
      state.running = false;
      try { window.V51PaperPackagePreview?.render?.(); } catch {}
      try { window.V51PaperProfileValidator?.renderCurrentPreview?.(); } catch {}
      try { window.V51BulkQuestionImageUpload?.render?.(); } catch {}
      render();
    }
  }

  function wire(){
    if (typeof document === 'undefined') return;
    if (!ensurePanel()) return;
    document.getElementById('v51a5-import-paper')?.addEventListener('click',importPaper);
    for (const id of ['v51a4-package-report','import-summary','v51a2-bulk-image-panel','v51-paper-profile-audit']){
      const node = document.getElementById(id);
      if (node && typeof MutationObserver !== 'undefined'){
        const observer = new MutationObserver(() => window.requestAnimationFrame(render));
        observer.observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      }
    }
    render();
  }

  const api = Object.freeze({
    importCounts,
    paperIdentity,
    packageProfile,
    inactiveLogicalQuestions,
    currentPaperProfiles,
    packageCompletenessIssues,
    buildPlan,
    confirmationText,
    packagePreviewReady,
    importPaper,
    render
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51OneConfirmationPaperImport',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* V5.1A6 — Post-import integrity check.
   Read-only verification of the actual teacher question bank after a validated A5 import.
   It does not insert/update/delete questions, Storage objects, or Exam Settings. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51PostImportIntegrityInstalled) return;
  if (typeof window !== 'undefined') window.__v51PostImportIntegrityInstalled = true;

  const state = {
    running:false,
    message:'',
    messageKind:'try',
    lastReport:null,
    pendingContext:null,
    consumedToken:''
  };

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const normPaper = value => norm(value).replace(/[._-]+/g,' ');

  function currentImportRows(){
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

  function cloudTeacherReady(){
    try {
      return typeof cloudReady !== 'undefined' && !!cloudReady && typeof teacherUser !== 'undefined' && !!teacherUser && typeof cloud !== 'undefined' && !!cloud;
    } catch {
      return false;
    }
  }

  function logicalQuestionNumber(row){
    try {
      const fn = window.V51PaperProfileValidator?.logicalQuestionNumber;
      if (typeof fn === 'function') return trim(fn(row));
    } catch {}
    const parent = trim(row?.parent_question_number);
    if (parent) return parent.replace(/^q\s*/i,'').trim();
    const raw = trim(row?.question_number).replace(/^q\s*/i,'');
    const multipart = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
    return multipart ? multipart[1] : raw;
  }

  function qLabel(value){
    const raw = trim(value).replace(/^q\s*/i,'');
    return raw ? `Q${raw}` : '';
  }

  function sortedQuestionLabels(values){
    return [...new Set(Array.from(values || []).map(value => trim(value).replace(/^q\s*/i,'')).filter(Boolean))]
      .sort((a,b) => {
        const na = Number(a), nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na-nb;
        return String(a).localeCompare(String(b),undefined,{numeric:true});
      })
      .map(qLabel);
  }

  function sameList(a,b){
    const left = Array.from(a || []).map(norm).sort();
    const right = Array.from(b || []).map(norm).sort();
    return left.length === right.length && left.every((value,index) => value === right[index]);
  }

  function sumMarks(rows){
    return Array.from(rows || []).reduce((total,row) => {
      const marks = Number(row?.marks);
      return total + (Number.isFinite(marks) ? marks : 0);
    },0);
  }

  function packageExpectations(rows=currentImportRows()){
    const list = Array.from(rows || []).filter(row => row?._valid !== false);
    const active = list.filter(row => row?.active !== false);
    const logical = new Set(list.map(logicalQuestionNumber).filter(Boolean));
    const activeLogical = new Set(active.map(logicalQuestionNumber).filter(Boolean));
    const imageRefs = new Set(list.map(row => trim(row?.image_url)).filter(Boolean).map(norm));
    const multipart = sortedQuestionLabels(list.map(row => row?.parent_question_number).filter(value => trim(value)));
    const inactive = list.filter(row => row?.active === false);
    const inactiveLogical = sortedQuestionLabels(inactive.map(logicalQuestionNumber));

    return Object.freeze({
      physicalRows:list.length,
      activeRows:active.length,
      totalMarks:sumMarks(list),
      activeMarks:sumMarks(active),
      logicalQuestions:logical.size,
      activeLogicalQuestions:activeLogical.size,
      imageReferences:imageRefs.size,
      multipartGroups:multipart,
      inactiveRows:inactive.length,
      inactiveLogicalQuestions:inactiveLogical
    });
  }

  function standardPaperProfile(identity={}){
    if (norm(identity.sourceType) !== 'past_paper') return null;
    try {
      return window.V51PaperProfileValidator?.paperProfile?.(identity.paper) || null;
    } catch {
      const paper = normPaper(identity.paper);
      if (/^(?:paper\s*)?1$/.test(paper)) return {expectedLogicalQuestions:40,expectedMarks:90,label:'Paper 1'};
      if (/^(?:paper\s*)?2$/.test(paper)) return {expectedLogicalQuestions:30,expectedMarks:90,label:'Paper 2'};
      return null;
    }
  }

  function identityMatches(row,identity={}){
    return Number(row?.year_level) === Number(identity.yearLevel)
      && Number(row?.exam_year) === Number(identity.examYear)
      && normPaper(row?.paper) === normPaper(identity.paper);
  }

  function rowsForPaper(questions,identity){
    return Array.from(questions || []).filter(row => identityMatches(row,identity));
  }

  function auditPaperRows(rows,identity={}){
    const list = Array.from(rows || []);
    const active = list.filter(row => row?.active !== false);
    const logical = new Set(list.map(logicalQuestionNumber).filter(Boolean));
    const activeLogical = new Set(active.map(logicalQuestionNumber).filter(Boolean));
    const imageRows = list.filter(row => trim(row?.image_url));
    const distinctImageUrls = new Set(imageRows.map(row => trim(row.image_url)));
    const nonHttpsImageRows = imageRows
      .filter(row => !/^https:\/\//i.test(trim(row.image_url)))
      .map(row => qLabel(row.question_number || logicalQuestionNumber(row)));

    const qnoCounts = new Map();
    for (const row of list){
      const key = norm(row?.question_number);
      if (!key) continue;
      qnoCounts.set(key,(qnoCounts.get(key) || 0) + 1);
    }
    const duplicateQuestionNumbers = [...qnoCounts.entries()]
      .filter(([,count]) => count > 1)
      .map(([value,count]) => ({questionNumber:qLabel(value),count}));

    const multipartGroups = sortedQuestionLabels(list.map(row => row?.parent_question_number).filter(value => trim(value)));
    const inactive = list.filter(row => row?.active === false);
    const inactiveRows = inactive.map(row => ({
      questionNumber:qLabel(row.question_number || logicalQuestionNumber(row)),
      logicalQuestion:qLabel(logicalQuestionNumber(row)),
      marks:Number(row?.marks) || 0
    }));
    const inactiveLogicalQuestions = sortedQuestionLabels(inactive.map(logicalQuestionNumber));

    const profile = standardPaperProfile(identity);
    const missingLogicalQuestions = [];
    if (profile?.expectedLogicalQuestions){
      for (let number=1; number<=Number(profile.expectedLogicalQuestions); number+=1){
        if (!logical.has(String(number))) missingLogicalQuestions.push(`Q${number}`);
      }
    }

    return Object.freeze({
      physicalRows:list.length,
      activeRows:active.length,
      totalMarks:sumMarks(list),
      activeMarks:sumMarks(active),
      logicalQuestions:logical.size,
      activeLogicalQuestions:activeLogical.size,
      imageReferenceRows:imageRows.length,
      distinctImageUrls:distinctImageUrls.size,
      nonHttpsImageRows,
      duplicateQuestionNumbers,
      multipartGroups,
      inactiveRows,
      inactiveLogicalQuestions,
      missingLogicalQuestions
    });
  }

  function check(label,actual,expected,{severity='core',pass=null}={}){
    const ok = pass === null ? actual === expected : !!pass;
    return Object.freeze({label,actual,expected,severity,pass:ok});
  }

  function buildIntegrityReport({identity,expected,rows,examSettings=[],settingsError='',strictActiveState=false}={}){
    const actual = auditPaperRows(rows,identity);
    const profile = standardPaperProfile(identity);
    const checks = [];

    if (expected){
      checks.push(check('Physical rows',actual.physicalRows,expected.physicalRows));
      checks.push(check('Logical questions',actual.logicalQuestions,expected.logicalQuestions));
      checks.push(check('Total marks',actual.totalMarks,expected.totalMarks));
      checks.push(check('Distinct image URLs',actual.distinctImageUrls,expected.imageReferences));
      checks.push(check('Multipart groups',actual.multipartGroups.join(', ') || 'None',expected.multipartGroups.join(', ') || 'None',{pass:sameList(actual.multipartGroups,expected.multipartGroups)}));
      checks.push(check('Active rows',actual.activeRows,expected.activeRows,{severity:'state'}));
      checks.push(check('Active logical questions',actual.activeLogicalQuestions,expected.activeLogicalQuestions,{severity:'state'}));
      checks.push(check('Active marks',actual.activeMarks,expected.activeMarks,{severity:'state'}));
      checks.push(check('Inactive logical questions',actual.inactiveLogicalQuestions.join(', ') || 'None',expected.inactiveLogicalQuestions.join(', ') || 'None',{severity:'state',pass:sameList(actual.inactiveLogicalQuestions,expected.inactiveLogicalQuestions)}));
    }

    if (profile){
      checks.push(check('Paper logical profile',actual.logicalQuestions,Number(profile.expectedLogicalQuestions)));
      checks.push(check('Paper marks profile',actual.totalMarks,Number(profile.expectedMarks)));
    }
    checks.push(check('Non-HTTPS image rows',actual.nonHttpsImageRows.length,0));
    checks.push(check('Duplicate question-number groups',actual.duplicateQuestionNumbers.length,0));
    if (profile) checks.push(check('Missing logical questions',actual.missingLogicalQuestions.length,0));

    const settingRows = Array.from(examSettings || []);
    const settingExists = settingRows.length === 1;
    const settingAvailable = settingRows.some(row => row?.is_available === true);
    const activePaperComplete = profile
      ? actual.activeLogicalQuestions === Number(profile.expectedLogicalQuestions) && actual.activeMarks === Number(profile.expectedMarks)
      : actual.activeRows === actual.physicalRows;
    const availabilityConflict = settingAvailable && !activePaperComplete;

    const coreFailures = checks.filter(item => !item.pass && (item.severity === 'core' || (strictActiveState && item.severity === 'state')));
    const stateDifferences = checks.filter(item => !item.pass && item.severity === 'state');
    const settingsProblems = [];
    if (settingsError) settingsProblems.push(settingsError);
    if (settingRows.length > 1) settingsProblems.push(`${settingRows.length} Exam Setting rows found for one paper`);
    if (availabilityConflict) settingsProblems.push('Exam Setting is available while the active paper profile is incomplete');

    let status = 'pass';
    if (coreFailures.length) status = 'fail';
    else if (settingsProblems.length || (!strictActiveState && stateDifferences.length)) status = 'attention';
    else if (actual.inactiveRows.length) status = 'pass_with_review';

    return Object.freeze({
      identity:{...identity},
      expected:expected ? {...expected} : null,
      actual,
      profile,
      checks,
      coreFailures,
      stateDifferences,
      settingsError,
      settingRows:settingRows.length,
      settingExists,
      settingAvailable,
      activePaperComplete,
      availabilityConflict,
      settingsProblems,
      strictActiveState,
      status,
      integrityPass:coreFailures.length === 0,
      examReady:coreFailures.length === 0 && activePaperComplete && settingAvailable && !settingsProblems.length
    });
  }

  function currentA5Plan(){
    try { return window.V51OneConfirmationPaperImport?.buildPlan?.() || null; }
    catch { return null; }
  }

  function contextFromCurrentPackage({strictActiveState=false}={}){
    const plan = currentA5Plan();
    const identity = plan?.identity || {};
    if (!identity.examYear || !trim(identity.paper)) return null;
    const rows = currentImportRows();
    if (!rows.length) return null;
    return {
      token:`${Date.now()}-${Math.random().toString(36).slice(2)}`,
      identity:{...identity},
      expected:packageExpectations(rows),
      strictActiveState
    };
  }

  async function loadExamSettings(identity){
    if (!cloudTeacherReady()) return {rows:[],error:'Cloud Teacher mode is required for Exam Setting verification'};
    try {
      const {data,error} = await cloud.from('exam_paper_settings')
        .select('*')
        .eq('year_level',Number(identity.yearLevel))
        .eq('exam_year',Number(identity.examYear))
        .eq('paper',identity.paper);
      if (error) return {rows:[],error:error.message || String(error)};
      return {rows:Array.isArray(data) ? data : [],error:''};
    } catch (error){
      return {rows:[],error:String(error?.message || error || 'Exam Setting lookup failed')};
    }
  }

  async function refreshTeacherIfNeeded(identity,expected){
    let rows = rowsForPaper(currentTeacherQuestions(),identity);
    if (!expected?.physicalRows || rows.length >= expected.physicalRows) return rows;
    try {
      if (typeof loadTeacher === 'function') await loadTeacher();
    } catch {}
    rows = rowsForPaper(currentTeacherQuestions(),identity);
    return rows;
  }

  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function paperLabel(identity={}){
    return [identity.examYear,identity.paper].filter(Boolean).join(' ') || 'Current paper';
  }

  function statusTitle(report){
    if (report.status === 'fail') return '❌ Post-import integrity FAILED';
    if (report.status === 'attention') return '⚠ Post-import integrity needs attention';
    if (report.status === 'pass_with_review') return '✅ Import integrity PASS · ⚠ Review item remains';
    return '✅ Post-import integrity PASS';
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById('v51a6-integrity-panel');
    if (root) return root;
    const a5 = document.getElementById('v51a5-import-panel');
    if (!a5) return null;
    root = document.createElement('div');
    root.id = 'v51a6-integrity-panel';
    root.className = 'info';
    root.style.marginTop = '12px';
    root.innerHTML = `
      <strong>V5.1A6 — Post-import integrity</strong>
      <p class="muted" style="margin:7px 0 10px">Read-only verification of the actual question bank and Exam Setting after import. It runs automatically after A5 and can also verify the currently previewed paper.</p>
      <div class="buttons">
        <button id="v51a6-verify-paper" class="outline" type="button" disabled>Verify Current Paper</button>
      </div>
      <div id="v51a6-integrity-status" class="help" style="margin-top:8px">Preview a paper package first.</div>`;
    a5.insertAdjacentElement('afterend',root);
    return root;
  }

  function render(){
    const root = ensurePanel();
    if (!root) return null;
    const button = document.getElementById('v51a6-verify-paper');
    const status = document.getElementById('v51a6-integrity-status');
    const currentContext = contextFromCurrentPackage();
    button.disabled = state.running || !currentContext || !cloudTeacherReady();
    button.textContent = state.running ? 'Verifying…' : 'Verify Current Paper';

    if (state.running){
      status.className = 'feedback try';
      status.textContent = state.message || 'Checking the actual question bank…';
      return state.lastReport;
    }

    const report = state.lastReport;
    if (!report){
      status.className = state.message ? `feedback ${state.messageKind}` : 'help';
      status.textContent = state.message || (currentContext ? 'Ready for a read-only integrity check.' : 'Preview a paper package first.');
      return null;
    }

    const actual = report.actual;
    const checkRows = report.checks.map(item => `<div>${item.pass?'✅':'⚠'} <strong>${esc(item.label)}:</strong> ${esc(item.actual)}${item.expected !== undefined ? ` / expected ${esc(item.expected)}` : ''}</div>`).join('');
    const inactive = actual.inactiveRows.length
      ? actual.inactiveRows.map(item => `${esc(item.questionNumber)} (${esc(item.marks)} mark${Number(item.marks)===1?'':'s'})`).join(', ')
      : 'None';
    const multipart = actual.multipartGroups.length ? actual.multipartGroups.map(esc).join(', ') : 'None';
    const duplicates = actual.duplicateQuestionNumbers.length
      ? actual.duplicateQuestionNumbers.map(item => `${esc(item.questionNumber)} ×${esc(item.count)}`).join(', ')
      : 'None';
    const missing = actual.missingLogicalQuestions.length ? actual.missingLogicalQuestions.map(esc).join(', ') : 'None';
    const settingText = report.settingRows === 0
      ? 'No setting row · unavailable in cloud Exam Mode'
      : `${report.settingRows} setting row${report.settingRows===1?'':'s'} · ${report.settingAvailable?'AVAILABLE':'unavailable'}`;
    const settingIssues = report.settingsProblems.length ? `<div style="margin-top:6px">⚠ ${report.settingsProblems.map(esc).join('<br>⚠ ')}</div>` : '';

    status.className = `feedback ${report.status === 'fail' ? 'incorrect' : report.status === 'pass' ? 'correct' : 'try'}`;
    status.innerHTML = `
      <div><strong>${esc(statusTitle(report))}</strong></div>
      <div style="margin-top:8px;display:grid;gap:6px">
        <div><strong>${esc(paperLabel(report.identity))}</strong></div>
        ${checkRows}
        <div><strong>Active state:</strong> ${actual.activeRows}/${actual.physicalRows} rows · ${actual.activeLogicalQuestions}/${actual.logicalQuestions} logical questions · ${actual.activeMarks}/${actual.totalMarks} marks</div>
        <div><strong>Images:</strong> ${actual.imageReferenceRows} row references · ${actual.distinctImageUrls} distinct HTTPS URLs · ${actual.nonHttpsImageRows.length} non-HTTPS</div>
        <div><strong>Multipart groups:</strong> ${multipart}</div>
        <div><strong>Duplicate question numbers:</strong> ${duplicates}</div>
        <div><strong>Missing logical questions:</strong> ${missing}</div>
        <div><strong>Inactive review rows:</strong> ${inactive}</div>
        <div><strong>Exam Setting:</strong> ${esc(settingText)}</div>
        <div><strong>Exam readiness:</strong> ${report.examReady?'READY':'Not ready'}</div>
        ${settingIssues}
      </div>`;
    return report;
  }

  async function verifyContext(context,{automatic=false}={}){
    if (!context?.identity?.examYear || !trim(context.identity.paper)) return null;
    if (!cloudTeacherReady()){
      state.message = 'Cloud Teacher mode is required for post-import integrity verification.';
      state.messageKind = 'incorrect';
      render();
      return null;
    }

    state.running = true;
    state.message = automatic ? 'Import finished. Verifying actual database state…' : 'Verifying actual database state…';
    state.messageKind = 'try';
    render();

    try {
      const rows = await refreshTeacherIfNeeded(context.identity,context.expected);
      const settings = await loadExamSettings(context.identity);
      const report = buildIntegrityReport({
        identity:context.identity,
        expected:context.expected,
        rows,
        examSettings:settings.rows,
        settingsError:settings.error,
        strictActiveState:!!context.strictActiveState
      });
      state.lastReport = report;
      state.message = '';
      state.messageKind = report.integrityPass ? 'correct' : 'incorrect';
      return report;
    } catch (error){
      state.message = String(error?.message || error || 'Post-import integrity verification failed.');
      state.messageKind = 'incorrect';
      return null;
    } finally {
      state.running = false;
      render();
    }
  }

  async function verifyCurrentPaper(){
    const context = contextFromCurrentPackage({strictActiveState:false});
    if (!context){
      state.message = 'Preview a paper package first so A6 knows what the database should contain.';
      state.messageKind = 'try';
      render();
      return null;
    }
    return verifyContext(context,{automatic:false});
  }

  function captureBeforeA5Import(){
    const context = contextFromCurrentPackage({strictActiveState:true});
    if (context) state.pendingContext = context;
  }

  function maybeAutoVerify(){
    if (state.running || !state.pendingContext) return;
    const status = typeof document !== 'undefined' ? document.getElementById('v51a5-import-status') : null;
    const text = status?.textContent || '';
    if (!/imported successfully/i.test(text)) return;
    const context = state.pendingContext;
    if (!context.token || state.consumedToken === context.token) return;
    state.consumedToken = context.token;
    state.pendingContext = null;
    verifyContext(context,{automatic:true});
  }

  function wire(){
    if (typeof document === 'undefined') return;
    if (!ensurePanel()) return;
    document.getElementById('v51a6-verify-paper')?.addEventListener('click',verifyCurrentPaper);
    document.getElementById('v51a5-import-paper')?.addEventListener('click',captureBeforeA5Import,true);

    const a5Status = document.getElementById('v51a5-import-status');
    if (a5Status && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(() => window.requestAnimationFrame(() => { render(); maybeAutoVerify(); }));
      observer.observe(a5Status,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    for (const id of ['v51a4-package-report','import-summary']){
      const node = document.getElementById(id);
      if (node && typeof MutationObserver !== 'undefined'){
        const observer = new MutationObserver(() => window.requestAnimationFrame(render));
        observer.observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      }
    }
    render();
  }

  const api = Object.freeze({
    logicalQuestionNumber,
    packageExpectations,
    rowsForPaper,
    auditPaperRows,
    buildIntegrityReport,
    contextFromCurrentPackage,
    verifyCurrentPaper,
    verifyContext,
    render
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51PostImportIntegrity',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
