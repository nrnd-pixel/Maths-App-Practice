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