/* V5.2A — Topical Exercise Foundation.
   Extends the established V5.1 Question Bank/import pipeline so digitised topical
   exercise sets can be staged safely without changing student delivery yet.

   Safety boundary: V5.2A topical rows MUST remain inactive. The current Practice
   question RPC intentionally stays unchanged until a dedicated topical student
   library is introduced in a later V5.2 slice. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const TOPICAL_SOURCE_TYPE = 'topical_exercise';
  const DEFAULT_SOURCE = 'Teacher question bank';
  const state = { pendingAudit:null };

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const compact = value => norm(value).replace(/[^a-z0-9]+/g,'');
  const isTopical = row => norm(row?.source_type) === TOPICAL_SOURCE_TYPE;
  const hasText = value => trim(value).length > 0;

  const baseValidation = typeof ROOT.questionValidationErrors === 'function'
    ? ROOT.questionValidationErrors
    : null;
  const baseFingerprint = typeof ROOT.questionFingerprint === 'function'
    ? ROOT.questionFingerprint
    : null;
  const baseMultipartErrors = typeof ROOT.multipartImportErrors === 'function'
    ? ROOT.multipartImportErrors
    : null;

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

  function topicalFingerprint(row){
    const year = Number(row?.year_level) || '';
    const source = compact(row?.source);
    const qno = compact(row?.question_number);
    if (source && qno) return `topical|${year}|${source}|${qno}`;
    return `topical-text|${year}|${source}|${compact(row?.question_text)}`;
  }

  function questionFingerprintV52(row){
    if (isTopical(row)) return topicalFingerprint(row);
    return baseFingerprint ? baseFingerprint(row) : `text|${row?.year_level || ''}|${compact(row?.question_text)}`;
  }

  function topicalValidationErrors(row){
    if (!isTopical(row)) return baseValidation ? baseValidation(row) : [];

    const removeLegacy = new Set([
      'Source type must be teacher, past_paper or practice',
      'Exam year must be a whole number from 2000 to 2100',
      'Paper is required when exam metadata is used',
      'Multipart questions require complete exam metadata'
    ]);
    const errors = (baseValidation ? baseValidation(row) : []).filter(error => !removeLegacy.has(error));

    if (!hasText(row?.source)) errors.push('Topical exercise source/set name is required');
    if (!hasText(row?.question_number)) errors.push('Topical exercise question number is required');
    if (row?.exam_year !== null && row?.exam_year !== undefined && trim(row.exam_year) !== ''){
      errors.push('Topical exercise rows must not use exam year metadata');
    }
    if (hasText(row?.paper)) errors.push('Topical exercise rows must not use exam paper metadata');
    if (row?.active !== false){
      errors.push('Topical exercise rows must remain inactive until the student topical library is released');
    }

    return [...new Set(errors)];
  }

  function sameTopicalGroup(a,b){
    return isTopical(a)
      && isTopical(b)
      && Number(a?.year_level) === Number(b?.year_level)
      && norm(a?.source) === norm(b?.source)
      && norm(a?.parent_question_number) === norm(b?.parent_question_number);
  }

  function multipartImportErrorsV52(row,rows){
    if (!isTopical(row)) return baseMultipartErrors ? baseMultipartErrors(row,rows) : [];
    if (!hasText(row?.parent_question_number) || topicalValidationErrors(row).length) return [];

    const candidates = [...currentTeacherQuestions(), ...Array.from(rows || [])];
    const fingerprint = questionFingerprintV52(row);
    const siblings = candidates.filter(value =>
      value !== row
      && sameTopicalGroup(value,row)
      && questionFingerprintV52(value) !== fingerprint
    );
    const errors = [];

    if (siblings.some(value => Number(value?.part_order) === Number(row?.part_order))){
      errors.push(`Part order ${row.part_order} is already used in this topical multipart group`);
    }
    if (siblings.some(value => norm(value?.part_label) === norm(row?.part_label))){
      errors.push(`Part label ${row.part_label} is already used in this topical multipart group`);
    }
    const prompts = new Set([row,...siblings].map(value => trim(value?.group_prompt)).filter(Boolean));
    if (prompts.size > 1) errors.push('Topical multipart siblings must use the same group prompt');
    return errors;
  }

  function logicalQuestionNumber(row){
    const parent = trim(row?.parent_question_number).replace(/^q\s*/i,'');
    if (parent) return parent;
    const raw = trim(row?.question_number).replace(/^q\s*/i,'');
    const multipart = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
    return multipart ? multipart[1] : raw;
  }

  function buildPackageAudit(rows=currentImportRows()){
    const list = Array.from(rows || []);
    const topical = list.filter(isTopical);
    if (!topical.length) return null;

    const issues = [];
    const sourceTypes = new Set(list.map(row => norm(row?.source_type)).filter(Boolean));
    const sources = new Set(topical.map(row => norm(row?.source)).filter(Boolean));
    const years = new Set(topical.map(row => Number(row?.year_level)).filter(Number.isFinite));
    const invalidRows = topical.filter(row => row?._valid === false || topicalValidationErrors(row).length);
    const activeRows = topical.filter(row => row?.active !== false);
    const examMetadataRows = topical.filter(row =>
      (row?.exam_year !== null && row?.exam_year !== undefined && trim(row.exam_year) !== '') || hasText(row?.paper)
    );

    if (sourceTypes.size !== 1 || !sourceTypes.has(TOPICAL_SOURCE_TYPE)){
      issues.push('A V5.2A topical package must contain topical_exercise rows only');
    }
    if (sources.size !== 1) issues.push('A topical package must use exactly one Source/set name');
    if (years.size !== 1) issues.push('A topical package must target exactly one year level');
    if (activeRows.length) issues.push('Every topical row must be inactive during V5.2A staging');
    if (examMetadataRows.length) issues.push('Topical rows must not contain exam year or paper metadata');
    if (invalidRows.length) issues.push(`${invalidRows.length} topical row${invalidRows.length===1?'':'s'} still need validation fixes`);

    const fingerprints = topical.map(questionFingerprintV52).filter(Boolean);
    const counts = new Map();
    fingerprints.forEach(value => counts.set(value,(counts.get(value) || 0) + 1));
    const duplicateFingerprints = [...counts.entries()].filter(([,count]) => count > 1).map(([value]) => value);
    if (duplicateFingerprints.length) issues.push(`${duplicateFingerprints.length} duplicate topical question identit${duplicateFingerprints.length===1?'y':'ies'} found in this package`);

    const logical = new Set(topical.map(logicalQuestionNumber).filter(Boolean));
    const topics = new Set(topical.map(row => trim(row?.topic)).filter(Boolean));
    const imageReferences = new Set(topical.map(row => trim(row?.image_url)).filter(Boolean));
    const marks = topical.reduce((total,row) => total + (Number.isFinite(Number(row?.marks)) ? Number(row.marks) : 0),0);
    const source = trim(topical[0]?.source);
    const yearLevel = Number(topical[0]?.year_level) || null;

    return Object.freeze({
      ready:issues.length === 0,
      issues,
      physicalRows:topical.length,
      logicalQuestions:logical.size,
      marks,
      topics:[...topics],
      imageReferences:imageReferences.size,
      source,
      yearLevel,
      fingerprints:[...new Set(fingerprints)],
      activeRows:activeRows.length,
      studentExposure:'off'
    });
  }

  function buildPostImportAudit(context=state.pendingAudit,questions=currentTeacherQuestions()){
    if (!context?.source || !context?.yearLevel) return null;
    const matches = Array.from(questions || []).filter(row =>
      isTopical(row)
      && Number(row?.year_level) === Number(context.yearLevel)
      && norm(row?.source) === norm(context.source)
    );
    const fingerprints = new Set(matches.map(questionFingerprintV52));
    const missing = Array.from(context.fingerprints || []).filter(value => !fingerprints.has(value));
    const activeRows = matches.filter(row => row?.active !== false);
    return Object.freeze({
      pass:missing.length === 0 && activeRows.length === 0,
      matchedRows:matches.length,
      missing,
      activeRows:activeRows.length,
      source:context.source,
      yearLevel:context.yearLevel
    });
  }

  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v52a-topical-foundation-audit');
    if (panel) return panel;
    const anchor = document.getElementById('v51a5-import-panel') || document.getElementById('import-summary');
    if (!anchor) return null;
    panel = document.createElement('div');
    panel.id = 'v52a-topical-foundation-audit';
    panel.className = 'info hidden';
    panel.style.marginTop = '12px';
    if (anchor.id === 'import-summary') anchor.insertAdjacentElement('afterend',panel);
    else anchor.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function render(){
    const panel = ensurePanel();
    if (!panel) return null;
    const audit = buildPackageAudit();

    if (audit){
      panel.classList.remove('hidden');
      panel.innerHTML = `
        <strong>V5.2A Topical Exercise Foundation</strong>
        <div style="margin-top:7px">
          <strong>${audit.ready?'✅ Topical package is safe to stage':'⚠ Topical package needs attention'}</strong><br>
          Year ${esc(audit.yearLevel || '—')} · ${esc(audit.source || 'Set name missing')}<br>
          ${audit.physicalRows} row${audit.physicalRows===1?'':'s'} · ${audit.logicalQuestions} logical question${audit.logicalQuestions===1?'':'s'} · ${audit.marks} marks · ${audit.imageReferences} image reference${audit.imageReferences===1?'':'s'}<br>
          <strong>Student exposure: OFF</strong> — topical rows must remain inactive in V5.2A.<br>
          <span class="muted">Paper 1/2 profile rules do not apply to topical sets; the existing V5.1 validation, image matching and import safeguards still apply.</span>
          ${audit.issues.length ? `<div style="margin-top:7px">⚠ ${audit.issues.map(esc).join('<br>⚠ ')}</div>` : ''}
        </div>`;
      return audit;
    }

    const post = buildPostImportAudit();
    if (post){
      panel.classList.remove('hidden');
      panel.innerHTML = `
        <strong>V5.2A Topical Import Verification</strong>
        <div style="margin-top:7px">
          <strong>${post.pass?'✅ Staged safely':'⚠ Verification still catching up or needs attention'}</strong><br>
          Year ${esc(post.yearLevel)} · ${esc(post.source)} · ${post.matchedRows} matching bank row${post.matchedRows===1?'':'s'}<br>
          ${post.missing.length ? `${post.missing.length} expected row identit${post.missing.length===1?'y':'ies'} not yet visible in the refreshed Question Bank.<br>` : ''}
          ${post.activeRows ? `⚠ ${post.activeRows} topical row${post.activeRows===1?' is':'s are'} active; V5.2A requires student exposure to remain OFF.` : '<strong>Student exposure: OFF</strong> — all matching topical rows are inactive.'}
        </div>`;
      return post;
    }

    panel.classList.add('hidden');
    panel.innerHTML = '';
    return null;
  }

  function syncEditor(){
    if (typeof document === 'undefined') return;
    const type = document.getElementById('qe-source-type');
    const active = document.getElementById('qe-active');
    const examYear = document.getElementById('qe-exam-year');
    const paper = document.getElementById('qe-paper');
    const source = document.getElementById('qe-source');
    const help = document.getElementById('v52a-topical-source-help');
    const topical = type?.value === TOPICAL_SOURCE_TYPE;
    if (help) help.classList.toggle('hidden',!topical);
    if (!topical) return;
    if (active) active.value = 'false';
    if (examYear) examYear.value = '';
    if (paper) paper.value = '';
    if (source){
      if (!trim(source.value) || source.value === DEFAULT_SOURCE) source.value = '';
      source.placeholder = 'e.g. Fractions Topical Exercise 2';
    }
  }

  function extendEditor(){
    if (typeof document === 'undefined') return;
    const select = document.getElementById('qe-source-type');
    if (!select) return;
    if (![...select.options].some(option => option.value === TOPICAL_SOURCE_TYPE)){
      const option = document.createElement('option');
      option.value = TOPICAL_SOURCE_TYPE;
      option.textContent = 'Topical exercise';
      select.appendChild(option);
    }
    if (!document.getElementById('v52a-topical-source-help')){
      const help = document.createElement('span');
      help.id = 'v52a-topical-source-help';
      help.className = 'help hidden';
      help.textContent = 'V5.2A stages topical sets safely: give the set a Source name and keep every row inactive until the dedicated student topical library is released.';
      select.insertAdjacentElement('afterend',help);
    }
    select.addEventListener('change',syncEditor);
    const editor = document.getElementById('question-editor');
    if (editor && typeof MutationObserver !== 'undefined'){
      new MutationObserver(() => ROOT.requestAnimationFrame?.(syncEditor)).observe(editor,{attributes:true,attributeFilter:['class']});
    }
    syncEditor();
  }

  function guardTopicalImport(event){
    const audit = buildPackageAudit();
    if (!audit) return;
    if (!audit.ready){
      event.preventDefault();
      event.stopImmediatePropagation();
      render();
      if (typeof ROOT.alert === 'function') ROOT.alert(`Topical package import blocked. ${audit.issues[0] || 'Resolve the V5.2A audit first.'}`);
      return;
    }
    state.pendingAudit = Object.freeze({
      source:audit.source,
      yearLevel:audit.yearLevel,
      fingerprints:[...audit.fingerprints]
    });
    ROOT.setTimeout?.(render,500);
    ROOT.setTimeout?.(render,1500);
    ROOT.setTimeout?.(render,3000);
  }

  function wire(){
    if (typeof document === 'undefined') return;
    extendEditor();
    ensurePanel();
    document.getElementById('import-btn')?.addEventListener('click',guardTopicalImport,true);
    document.getElementById('v51a5-import-paper')?.addEventListener('click',guardTopicalImport,true);
    document.getElementById('clear-import')?.addEventListener('click',() => { state.pendingAudit = null; render(); },true);

    for (const id of ['import-summary','v51a4-package-report','v51a5-import-panel']){
      const node = document.getElementById(id);
      if (node && typeof MutationObserver !== 'undefined'){
        new MutationObserver(() => ROOT.requestAnimationFrame?.(render)).observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      }
    }
    render();
  }

  const api = Object.freeze({
    TOPICAL_SOURCE_TYPE,
    isTopical,
    topicalFingerprint,
    questionFingerprint:questionFingerprintV52,
    validationErrors:topicalValidationErrors,
    multipartImportErrors:multipartImportErrorsV52,
    logicalQuestionNumber,
    buildPackageAudit,
    buildPostImportAudit,
    render
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof window !== 'undefined'){
    window.questionValidationErrors = topicalValidationErrors;
    window.questionFingerprint = questionFingerprintV52;
    window.multipartImportErrors = multipartImportErrorsV52;
    Object.defineProperty(window,'V52TopicalExerciseFoundation',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();