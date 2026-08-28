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
