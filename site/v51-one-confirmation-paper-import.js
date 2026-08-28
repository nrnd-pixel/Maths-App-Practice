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
    const blockers = [];
    if (!packageReady) blockers.push('Run a clean V5.1A4 package preview first');
    if (counts.invalid) blockers.push(`${counts.invalid} CSV row${counts.invalid===1?' needs':'s need'} attention`);
    if (!counts.ready && counts.total) blockers.push('No new valid rows are ready to import');
    if (!counts.total) blockers.push('No CSV preview rows are loaded');
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
      identity:paperIdentity(rows),
      blockers
    };
  }

  function paperLabel(identity={}){
    const parts = [];
    if (identity.examYear) parts.push(String(identity.examYear));
    if (identity.paper) parts.push(identity.paper);
    return parts.join(' ') || 'this paper package';
  }

  function confirmationText(plan){
    const rows = Number(plan?.counts?.ready || 0);
    const images = Number(plan?.imagesToUpload || 0);
    const label = paperLabel(plan?.identity || {});
    return [
      `Import ${label} now?`,
      '',
      `${rows} new question row${rows===1?'':'s'} will be added${images ? ` after uploading ${images} matched image${images===1?'':'s'}` : ''}.`,
      'This writes to the configured Supabase question bank. Existing duplicates remain skipped.',
      'No Exam Setting will be created or enabled automatically.'
    ].join('\n');
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
      <p class="muted" style="margin:7px 0 10px">After A4 reports a clean package, one confirmation runs the existing image-upload and question-import stages in order.</p>
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
      status.className = 'feedback correct';
      status.textContent = `${plan.counts.ready} new row${plan.counts.ready===1?'':'s'} ready${plan.imagesToUpload?` • ${plan.imagesToUpload} image${plan.imagesToUpload===1?'':'s'} will be uploaded first`:''}.`;
    } else {
      status.className = 'help';
      status.textContent = plan.blockers[0] || 'Run Preview Package first.';
    }

    button.disabled = !plan.ready;
    button.textContent = plan.alreadyImported ? 'Already Imported' : `Import Paper${plan.ready ? ` (${plan.counts.ready})` : ''}`;
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
      state.message = `${plan.counts.ready} new question row${plan.counts.ready===1?'':'s'} imported successfully${uploadedCount?` after uploading ${uploadedCount} image${uploadedCount===1?'':'s'}`:''}.${importResult.refreshed?'':' Question-bank refresh is still catching up; use Refresh if needed.'}`;
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
    for (const id of ['v51a4-package-report','import-summary','v51a2-bulk-image-panel']){
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
