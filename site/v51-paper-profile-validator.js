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
