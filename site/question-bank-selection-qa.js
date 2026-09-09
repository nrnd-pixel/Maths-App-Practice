/* Phase 4 — V51 topology-preserving consolidated owner.
   Historical sections are retained byte-for-byte and execute in the
   accepted order at the same loader boundary. */

/* ---- historical owner: v51-question-bank-qa.js ---- */
/* V5.1B1 — Question Bank QA & completeness indicators.
   Read-only teacher overlay. Adds paper-profile summaries, QA flags and filters without
   modifying question rows, Storage objects, Exam Settings or student data. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51QuestionBankQaInstalled) return;
  if (typeof window !== 'undefined') window.__v51QuestionBankQaInstalled = true;

  const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g,' ');
  const trim = value => String(value ?? '').trim();
  const PAPER_PROFILES = Object.freeze({
    paper1:Object.freeze({key:'paper1',label:'Paper 1',expectedLogicalQuestions:40,expectedMarks:90}),
    paper2:Object.freeze({key:'paper2',label:'Paper 2',expectedLogicalQuestions:30,expectedMarks:90})
  });

  function paperProfile(value){
    try {
      const existing = window.V51PaperProfileValidator?.paperProfile?.(value);
      if (existing) return existing;
    } catch {}
    const text = norm(value).replace(/[._-]+/g,' ');
    if (/^(?:paper\s*)?1$/.test(text) || /^p\s*1$/.test(text)) return PAPER_PROFILES.paper1;
    if (/^(?:paper\s*)?2$/.test(text) || /^p\s*2$/.test(text)) return PAPER_PROFILES.paper2;
    return null;
  }

  function logicalQuestionNumber(row){
    try {
      const existing = window.V51PaperProfileValidator?.logicalQuestionNumber?.(row);
      if (existing !== undefined && existing !== null) return trim(existing);
    } catch {}
    const parent = trim(row?.parent_question_number);
    if (parent) return parent.replace(/^q\s*/i,'').trim();
    const raw = trim(row?.question_number).replace(/^q\s*/i,'');
    const multipart = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
    return multipart ? multipart[1] : raw;
  }

  function looksLikeMultipartNumber(value){
    return /^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i.test(trim(value).replace(/^q\s*/i,''));
  }

  function paperKey(row){
    const profile = paperProfile(row?.paper);
    if (!profile || !Number.isFinite(Number(row?.exam_year))) return '';
    return `${Number(row.year_level)||''}|${Number(row.exam_year)}|${profile.key}`;
  }

  function examIdentity(row){
    const year = Number(row?.exam_year);
    const paper = norm(row?.paper);
    const number = norm(row?.question_number).replace(/^q\s*/,'');
    if (!Number.isFinite(year) || !paper || !number) return '';
    return `${year}|${paper}|${number}`;
  }

  function activePastPaper(row){
    return !!row && row.active !== false && norm(row.source_type) === 'past_paper'
      && Number.isFinite(Number(row.exam_year)) && !!paperProfile(row.paper)
      && !!trim(row.question_number);
  }

  function auditPaperProfiles(rows){
    const groups = new Map();
    for (const row of rows || []){
      if (!activePastPaper(row)) continue;
      const key = paperKey(row);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
    }

    const results = [];
    for (const [key,list] of groups){
      const first = list[0] || {};
      const profile = paperProfile(first.paper);
      const logicalMarks = new Map();
      let totalMarks = 0;
      let ungroupedMultipartRows = 0;
      for (const row of list){
        const marks = Number(row.marks);
        const safeMarks = Number.isFinite(marks) ? marks : 0;
        totalMarks += safeMarks;
        const logical = logicalQuestionNumber(row);
        if (logical) logicalMarks.set(logical,(logicalMarks.get(logical)||0)+safeMarks);
        if (!trim(row.parent_question_number) && looksLikeMultipartNumber(row.question_number)) ungroupedMultipartRows += 1;
      }
      const logicalQuestions = logicalMarks.size;
      let status = 'pass';
      if (logicalQuestions < profile.expectedLogicalQuestions || totalMarks < profile.expectedMarks) status = 'incomplete';
      if (logicalQuestions > profile.expectedLogicalQuestions || totalMarks > profile.expectedMarks || ungroupedMultipartRows) status = 'attention';
      results.push(Object.freeze({
        key,
        yearLevel:Number(first.year_level)||null,
        examYear:Number(first.exam_year)||null,
        paper:profile.label,
        physicalRows:list.length,
        logicalQuestions,
        expectedLogicalQuestions:profile.expectedLogicalQuestions,
        totalMarks,
        expectedMarks:profile.expectedMarks,
        ungroupedMultipartRows,
        status
      }));
    }
    return Object.freeze(results.sort((a,b)=>b.examYear-a.examYear || a.paper.localeCompare(b.paper,undefined,{numeric:true})));
  }

  function duplicateIdentityIds(rows){
    const groups = new Map();
    for (const row of rows || []){
      const key = examIdentity(row);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
    }
    const flagged = new Set();
    for (const list of groups.values()){
      if (list.length > 1) list.forEach(row => flagged.add(String(row.id ?? '')));
    }
    return flagged;
  }

  function multipartIssueIds(rows){
    const flagged = new Set();
    const groups = new Map();
    for (const row of rows || []){
      const id = String(row?.id ?? '');
      const parent = trim(row?.parent_question_number);
      if (!parent){
        if (looksLikeMultipartNumber(row?.question_number)) flagged.add(id);
        continue;
      }
      const key = `${Number(row.year_level)||''}|${Number(row.exam_year)||''}|${norm(row.paper)}|${norm(parent)}`;
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
      if (!trim(row.part_label) || !Number.isInteger(Number(row.part_order)) || Number(row.part_order)<1) flagged.add(id);
    }
    for (const list of groups.values()){
      if (list.length < 2) list.forEach(row=>flagged.add(String(row.id ?? '')));
      const orderCounts = new Map(), labelCounts = new Map(), prompts = new Set(), years = new Set();
      for (const row of list){
        const order = String(Number(row.part_order)||'');
        const label = norm(row.part_label);
        orderCounts.set(order,(orderCounts.get(order)||0)+1);
        labelCounts.set(label,(labelCounts.get(label)||0)+1);
        const prompt = trim(row.group_prompt);
        if (prompt) prompts.add(prompt);
        years.add(Number(row.year_level)||0);
      }
      const groupBad = [...orderCounts.values()].some(n=>n>1)
        || [...labelCounts.values()].some(n=>n>1)
        || prompts.size>1 || years.size>1;
      if (groupBad) list.forEach(row=>flagged.add(String(row.id ?? '')));
    }
    return flagged;
  }

  function metadataIssues(row){
    const issues = [];
    if (!Number.isFinite(Number(row?.year_level)) || Number(row.year_level)<=0) issues.push('year level');
    if (!trim(row?.strand)) issues.push('strand');
    if (!trim(row?.topic)) issues.push('topic');
    if (!trim(row?.skill)) issues.push('skill');
    if (!trim(row?.question_text)) issues.push('question text');
    const marks = Number(row?.marks);
    if (!Number.isFinite(marks) || marks<=0) issues.push('marks');
    const responseType = norm(row?.response_type || 'text');
    if (!['drawing','manual'].includes(responseType) && !trim(row?.answer)) issues.push('answer');
    if (norm(row?.source_type) === 'past_paper'){
      if (!Number.isFinite(Number(row?.exam_year))) issues.push('exam year');
      if (!trim(row?.paper)) issues.push('paper');
      if (!trim(row?.question_number)) issues.push('question number');
    }
    return issues;
  }

  function imageReferenceKind(value){
    const imageUrl = trim(value);
    if (!imageUrl) return 'none';
    if (/^https:\/\//i.test(imageUrl)) return 'https';
    if (/^\/?images\//i.test(imageUrl)) return 'app_static';
    if (/^http:\/\//i.test(imageUrl)) return 'http';
    return 'unresolved';
  }

  function imageReferenceIssue(value){
    const kind = imageReferenceKind(value);
    if (kind === 'http') return 'Insecure HTTP image URL';
    if (kind === 'unresolved') return 'Unresolved image path';
    return '';
  }

  function buildQaContext(rows){
    const list = Array.from(rows || []);
    const profiles = auditPaperProfiles(list);
    return Object.freeze({
      rows:list,
      profiles,
      profileByKey:new Map(profiles.map(item=>[item.key,item])),
      duplicateIds:duplicateIdentityIds(list),
      multipartIds:multipartIssueIds(list)
    });
  }

  function qaFlags(row,context=buildQaContext([row])){
    const flags = [];
    const id = String(row?.id ?? '');
    if (row?.active === false) flags.push({key:'inactive',label:'Inactive'});
    const metadata = metadataIssues(row);
    if (metadata.length) flags.push({key:'metadata',label:`Metadata: ${metadata.join(', ')}`});
    const imageIssue = imageReferenceIssue(row?.image_url);
    if (imageIssue) flags.push({key:'image',label:imageIssue});
    if (context.duplicateIds?.has(id)) flags.push({key:'duplicate',label:'Duplicate exam identifier'});
    if (context.multipartIds?.has(id)) flags.push({key:'multipart',label:'Multipart structure'});
    return flags;
  }

  function sourceCategory(row){
    const raw = norm(row?.source_type);
    if (raw === 'past_paper') return 'past_paper';
    if (raw === 'topical' || raw === 'topical_exercise') return 'topical';
    if (raw === 'practice') return 'practice';
    if (raw === 'teacher') return 'teacher';
    return raw || 'other';
  }

  function matchesQaFilter(row,qaValue='all',sourceValue='all',context){
    if (sourceValue !== 'all' && sourceCategory(row) !== sourceValue) return false;
    if (qaValue === 'all') return true;
    const keys = new Set(qaFlags(row,context).map(flag=>flag.key));
    if (qaValue === 'flagged') return keys.size>0;
    if (qaValue === 'clean') return keys.size===0;
    if (qaValue === 'paper_issue'){
      const profile = context?.profileByKey?.get(paperKey(row));
      return !!profile && profile.status !== 'pass';
    }
    return keys.has(qaValue);
  }

  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function ensureControls(){
    if (typeof document === 'undefined') return null;
    const count = document.getElementById('question-bank-count');
    if (!count) return null;
    let panel = document.getElementById('v51b1-question-bank-qa');
    if (!panel){
      panel = document.createElement('section');
      panel.id = 'v51b1-question-bank-qa';
      panel.className = 'info';
      panel.style.marginBottom = '12px';
      panel.innerHTML = `
        <div class="header" style="align-items:center;gap:10px">
          <div><strong>V5.1B1 — Question Bank QA</strong><div class="help">Read-only completeness and structure checks across the loaded question bank.</div></div>
          <button id="v51b1-refresh-qa" class="outline" type="button">Refresh QA</button>
        </div>
        <div id="v51b1-qa-summary" class="pills" style="margin-top:10px"></div>
        <div id="v51b1-paper-profiles" style="display:grid;gap:6px;margin-top:10px"></div>`;
      count.insertAdjacentElement('beforebegin',panel);
    }

    if (!document.getElementById('v51b1-qa-filter')){
      const filterGrid = document.getElementById('question-status')?.closest('.filtergrid') || document.getElementById('question-status')?.parentElement;
      if (filterGrid){
        const qa = document.createElement('select');
        qa.id = 'v51b1-qa-filter';
        qa.setAttribute('aria-label','Question QA filter');
        qa.innerHTML = '<option value="all">All QA states</option><option value="flagged">Needs QA</option><option value="clean">No QA flags</option><option value="inactive">Inactive</option><option value="paper_issue">Paper profile issue</option><option value="metadata">Metadata issue</option><option value="image">Image path issue</option><option value="duplicate">Duplicate identifier</option><option value="multipart">Multipart issue</option>';
        filterGrid.appendChild(qa);
        const source = document.createElement('select');
        source.id = 'v51b1-source-filter';
        source.setAttribute('aria-label','Question source type filter');
        source.innerHTML = '<option value="all">All source types</option><option value="past_paper">Past papers</option><option value="topical">Topical exercises</option><option value="practice">Practice</option><option value="teacher">Teacher-created</option>';
        filterGrid.appendChild(source);
      }
    }
    return panel;
  }

  function summaryStats(rows,context){
    let flagged=0,inactive=0,metadata=0,image=0,duplicate=0,multipart=0;
    for (const row of rows){
      const keys = new Set(qaFlags(row,context).map(flag=>flag.key));
      if (keys.size) flagged++;
      if (keys.has('inactive')) inactive++;
      if (keys.has('metadata')) metadata++;
      if (keys.has('image')) image++;
      if (keys.has('duplicate')) duplicate++;
      if (keys.has('multipart')) multipart++;
    }
    const pass=context.profiles.filter(p=>p.status==='pass').length, issues=context.profiles.length-pass;
    return {total:rows.length,flagged,inactive,metadata,image,duplicate,multipart,paperPass:pass,paperIssues:issues};
  }

  function renderSummary(rows,context){
    const stats = summaryStats(rows,context);
    const root = document.getElementById('v51b1-qa-summary');
    if (root) root.innerHTML = [
      `${stats.total} questions`,`${stats.flagged} flagged`,`${stats.inactive} inactive`,`${stats.metadata} metadata`,
      `${stats.image} image path`,`${stats.duplicate} duplicate ID`,`${stats.multipart} multipart`,
      `${stats.paperPass} paper PASS`,`${stats.paperIssues} paper issues`
    ].map(text=>`<span class="tag">${esc(text)}</span>`).join('');
    const profiles = document.getElementById('v51b1-paper-profiles');
    if (profiles){
      profiles.innerHTML = context.profiles.length ? context.profiles.map(item=>{
        const icon=item.status==='pass'?'✅':item.status==='incomplete'?'🟠':'⚠';
        return `<div><strong>${icon} ${esc(item.examYear)} ${esc(item.paper)}</strong> — ${esc(item.logicalQuestions)}/${esc(item.expectedLogicalQuestions)} logical · ${esc(item.totalMarks)}/${esc(item.expectedMarks)} marks · ${esc(item.physicalRows)} active rows</div>`;
      }).join('') : '<span class="muted">No active Paper 1/2 profiles found.</span>';
    }
    return stats;
  }

  function applyCardQa(rows,context){
    const qaValue = document.getElementById('v51b1-qa-filter')?.value || 'all';
    const sourceValue = document.getElementById('v51b1-source-filter')?.value || 'all';
    let visible = 0;
    const cards = Array.from(document.querySelectorAll('#questions-cards .qcard'));
    for (const card of cards){
      const id = card.querySelector('.edit-q')?.dataset?.id || card.querySelector('[data-id]')?.dataset?.id;
      const row = rows.find(item=>String(item.id)===String(id));
      if (!row) continue;
      const flags = qaFlags(row,context);
      let chipRoot = card.querySelector('.v51b1-qa-chips');
      if (!chipRoot){
        chipRoot = document.createElement('div');
        chipRoot.className = 'qcard-meta v51b1-qa-chips';
        chipRoot.style.marginTop = '7px';
        const detail = card.querySelector('.qcard-detail');
        if (detail) detail.insertAdjacentElement('beforebegin',chipRoot); else card.appendChild(chipRoot);
      }
      chipRoot.innerHTML = flags.map(flag=>`<span class="tag ${flag.key==='inactive'?'status-inactive':''}" title="${esc(flag.label)}">QA: ${esc(flag.label)}</span>`).join('');
      chipRoot.classList.toggle('hidden',flags.length===0);
      const show = matchesQaFilter(row,qaValue,sourceValue,context);
      card.classList.toggle('hidden',!show);
      if (show) visible++;
    }
    const count = document.getElementById('question-bank-count');
    if (count && (qaValue!=='all' || sourceValue!=='all')) count.textContent = `Showing ${visible} QA-filtered questions of ${cards.length} currently displayed`;
    return visible;
  }

  function render(){
    if (typeof document === 'undefined') return null;
    if (!ensureControls()) return null;
    const rows = currentQuestions();
    const context = buildQaContext(rows);
    renderSummary(rows,context);
    const visible = applyCardQa(rows,context);
    return {context,visible,stats:summaryStats(rows,context)};
  }

  function wire(){
    if (typeof document === 'undefined') return;
    if (!ensureControls()) return;
    const originalRender = typeof renderQuestions === 'function' ? renderQuestions : null;
    if (originalRender && !window.__v51QuestionBankQaRenderWrapped){
      window.__v51QuestionBankQaRenderWrapped = true;
      renderQuestions = function(){
        const result = originalRender.apply(this,arguments);
        window.requestAnimationFrame(()=>render());
        return result;
      };
    }
    document.getElementById('v51b1-qa-filter')?.addEventListener('change',render);
    document.getElementById('v51b1-source-filter')?.addEventListener('change',render);
    document.getElementById('v51b1-refresh-qa')?.addEventListener('click',render);
    const cards = document.getElementById('questions-cards');
    if (cards && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(()=>window.requestAnimationFrame(render));
      observer.observe(cards,{childList:true});
    }
    render();
  }

  const api = Object.freeze({
    paperProfile,logicalQuestionNumber,paperKey,examIdentity,auditPaperProfiles,duplicateIdentityIds,
    multipartIssueIds,metadataIssues,imageReferenceKind,imageReferenceIssue,buildQaContext,qaFlags,
    sourceCategory,matchesQaFilter,summaryStats,render
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51QuestionBankQA',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();

/* ---- historical owner: v51-question-bank-bulk-status.js ---- */
/* V5.1B2A — Safe bulk activate/deactivate for Question Bank.
   Adds selection and one-confirmation status updates. No deletes, metadata edits,
   Storage writes, Exam Setting changes or student-data changes. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51QuestionBankBulkStatusInstalled) return;
  if (typeof window !== 'undefined') window.__v51QuestionBankBulkStatusInstalled = true;

  const selectedIds = new Set();
  let busy = false;

  const trim = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function qaApi(){
    try { return window.V51QuestionBankQA || null; } catch { return null; }
  }

  function qaContext(rows=currentQuestions()){
    const qa = qaApi();
    try { return qa?.buildQaContext?.(rows) || null; } catch { return null; }
  }

  function directActivationBlockers(row,context){
    const qa = qaApi();
    if (!qa?.qaFlags) return [];
    const blockedKeys = new Set(['metadata','image','duplicate','multipart']);
    return qa.qaFlags(row,context).filter(flag => blockedKeys.has(flag.key));
  }

  function paperIssueFor(row,context){
    const qa = qaApi();
    if (!qa?.paperKey || !context?.profileByKey) return null;
    const key = qa.paperKey(row);
    if (!key) return null;
    const profile = context.profileByKey.get(key);
    return profile && profile.status !== 'pass' ? profile : null;
  }

  function buildPlan(rows=currentQuestions(),ids=selectedIds,targetActive=true,context=qaContext(rows)){
    const selected = rows.filter(row => ids.has(String(row.id)));
    const changing = selected.filter(row => targetActive ? row.active === false : row.active !== false);
    const blockers = [];
    const paperIssues = new Map();

    if (targetActive){
      for (const row of changing){
        const flags = directActivationBlockers(row,context);
        if (flags.length) blockers.push({row,flags});
        const profile = paperIssueFor(row,context);
        if (profile) paperIssues.set(profile.key,profile);
      }
    }

    return Object.freeze({
      targetActive:!!targetActive,
      selected:Object.freeze(selected.slice()),
      changing:Object.freeze(changing.slice()),
      blockers:Object.freeze(blockers.slice()),
      paperIssues:Object.freeze([...paperIssues.values()]),
      canRun:changing.length > 0 && (!targetActive || blockers.length === 0)
    });
  }

  function visibleCardIds(){
    if (typeof document === 'undefined') return [];
    return [...document.querySelectorAll('#questions-cards .qcard:not(.hidden)')]
      .map(card => card.dataset.v51b2aId || card.querySelector('[data-id]')?.dataset?.id || '')
      .filter(Boolean);
  }

  function selectedRows(rows=currentQuestions()){
    return rows.filter(row => selectedIds.has(String(row.id)));
  }

  function cleanSelection(rows=currentQuestions()){
    const valid = new Set(rows.map(row => String(row.id)));
    for (const id of [...selectedIds]) if (!valid.has(id)) selectedIds.delete(id);
  }

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v51b2a-bulk-status');
    if (panel) return panel;

    const qaPanel = document.getElementById('v51b1-question-bank-qa');
    const count = document.getElementById('question-bank-count');
    if (!qaPanel && !count) return null;

    panel = document.createElement('section');
    panel.id = 'v51b2a-bulk-status';
    panel.className = 'info';
    panel.style.marginBottom = '12px';
    panel.innerHTML = `
      <div class="header" style="align-items:center;gap:10px">
        <div>
          <strong>V5.1B2A — Bulk question status</strong>
          <div class="help">Select questions, then activate or deactivate them with one confirmation. Activation is blocked for direct QA issues.</div>
        </div>
        <button id="v51b2a-clear-selection" class="outline" type="button">Clear selection</button>
      </div>
      <div class="toolbar" style="margin-top:10px">
        <button id="v51b2a-select-visible" class="outline" type="button">Select all filtered</button>
        <button id="v51b2a-activate" class="primary" type="button">Activate selected</button>
        <button id="v51b2a-deactivate" class="warning" type="button">Deactivate selected</button>
      </div>
      <div id="v51b2a-summary" class="help" style="margin-top:10px">0 selected</div>
      <div id="v51b2a-feedback" class="feedback hidden" role="status" aria-live="polite"></div>`;

    if (qaPanel) qaPanel.insertAdjacentElement('afterend',panel);
    else count.insertAdjacentElement('beforebegin',panel);
    return panel;
  }

  function ensureCardCheckbox(card,row){
    if (!card || !row) return;
    const id = String(row.id);
    card.dataset.v51b2aId = id;
    let wrap = card.querySelector('.v51b2a-select-wrap');
    if (!wrap){
      wrap = document.createElement('label');
      wrap.className = 'v51b2a-select-wrap checkline';
      wrap.style.marginBottom = '8px';
      wrap.style.width = 'fit-content';
      wrap.innerHTML = `<input class="v51b2a-select" type="checkbox" aria-label="Select question"> <span>Select</span>`;
      const head = card.querySelector('.qcard-head');
      if (head) card.insertBefore(wrap,head); else card.prepend(wrap);
      const box = wrap.querySelector('.v51b2a-select');
      box.addEventListener('change',()=>{
        if (box.checked) selectedIds.add(id); else selectedIds.delete(id);
        renderSummary();
      });
    }
    const box = wrap.querySelector('.v51b2a-select');
    if (box){
      box.checked = selectedIds.has(id);
      box.dataset.id = id;
    }
  }

  function decorateCards(rows=currentQuestions()){
    if (typeof document === 'undefined') return;
    const byId = new Map(rows.map(row => [String(row.id),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const id = card.querySelector('.edit-q')?.dataset?.id || card.querySelector('[data-id]')?.dataset?.id || card.dataset.v51b2aId;
      const row = byId.get(String(id));
      if (row) ensureCardCheckbox(card,row);
    });
  }

  function setFeedback(kind,message){
    const root = document.getElementById('v51b2a-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.innerHTML = message;
  }

  function clearFeedback(){
    const root = document.getElementById('v51b2a-feedback');
    if (!root) return;
    root.className = 'feedback hidden';
    root.innerHTML = '';
  }

  function renderSummary(){
    const panel = ensurePanel();
    if (!panel) return null;
    const rows = currentQuestions();
    cleanSelection(rows);
    decorateCards(rows);

    const context = qaContext(rows);
    const activate = buildPlan(rows,selectedIds,true,context);
    const deactivate = buildPlan(rows,selectedIds,false,context);
    const count = selectedIds.size;
    const visible = visibleCardIds().length;
    const summary = document.getElementById('v51b2a-summary');
    const activateBtn = document.getElementById('v51b2a-activate');
    const deactivateBtn = document.getElementById('v51b2a-deactivate');
    const clearBtn = document.getElementById('v51b2a-clear-selection');
    const selectBtn = document.getElementById('v51b2a-select-visible');
    const cloudReadyNow = cloudTeacherReady();

    const details = [`${count} selected`,`${visible} currently visible`];
    if (activate.blockers.length) details.push(`${activate.blockers.length} activation blocker${activate.blockers.length===1?'':'s'}`);
    if (activate.paperIssues.length) details.push(`${activate.paperIssues.length} paper-readiness warning${activate.paperIssues.length===1?'':'s'}`);
    if (!cloudReadyNow) details.push('bulk writes require Cloud Teacher');
    if (summary) summary.textContent = details.join(' • ');

    if (activateBtn){
      activateBtn.disabled = busy || !cloudReadyNow || !activate.canRun;
      activateBtn.textContent = activate.changing.length ? `Activate ${activate.changing.length}` : 'Activate selected';
    }
    if (deactivateBtn){
      deactivateBtn.disabled = busy || !cloudReadyNow || !deactivate.canRun;
      deactivateBtn.textContent = deactivate.changing.length ? `Deactivate ${deactivate.changing.length}` : 'Deactivate selected';
    }
    if (clearBtn) clearBtn.disabled = busy || count === 0;
    if (selectBtn) selectBtn.disabled = busy || visible === 0;

    return {activate,deactivate,count,visible,cloudReady:cloudReadyNow};
  }

  function selectAllFiltered(){
    for (const id of visibleCardIds()) selectedIds.add(String(id));
    clearFeedback();
    renderSummary();
  }

  function clearSelection(){
    selectedIds.clear();
    clearFeedback();
    renderSummary();
  }

  function confirmationText(plan){
    const action = plan.targetActive ? 'activate' : 'deactivate';
    const lines = [
      `${action[0].toUpperCase()+action.slice(1)} ${plan.changing.length} question${plan.changing.length===1?'':'s'}?`,
      '',
      `Only the questions.active status will change. No questions will be deleted.`
    ];
    if (plan.targetActive && plan.paperIssues.length){
      lines.push('',`${plan.paperIssues.length} affected paper profile${plan.paperIssues.length===1?' is':'s are'} currently incomplete/attention. Activation may change exam readiness; no Exam Setting will be created or enabled.`);
    }
    lines.push('','This writes to the configured Supabase question bank.');
    return lines.join('\n');
  }

  async function runBulk(targetActive){
    if (busy) return;
    const rows = currentQuestions();
    const context = qaContext(rows);
    const plan = buildPlan(rows,selectedIds,targetActive,context);

    if (!cloudTeacherReady()){
      setFeedback('incorrect','Bulk status changes require Cloud Teacher mode.');
      return;
    }
    if (!plan.changing.length){
      setFeedback('try',`No selected questions need to be ${targetActive?'activated':'deactivated'}.`);
      return;
    }
    if (targetActive && plan.blockers.length){
      const examples = plan.blockers.slice(0,5).map(item=>{
        const q = item.row;
        const label = [q.exam_year,q.paper,q.question_number?`Q${q.question_number}`:''].filter(Boolean).join(' ')
          || trim(q.question_text).slice(0,50) || String(q.id);
        return `${esc(label)} — ${esc(item.flags.map(flag=>flag.label).join(', '))}`;
      });
      setFeedback('incorrect',`<strong>Activation blocked for ${plan.blockers.length} question${plan.blockers.length===1?'':'s'}.</strong><br>${examples.join('<br>')}${plan.blockers.length>5?'<br>…':''}`);
      return;
    }

    if (!window.confirm(confirmationText(plan))) return;

    busy = true;
    renderSummary();
    setFeedback('try',`${targetActive?'Activating':'Deactivating'} ${plan.changing.length} question${plan.changing.length===1?'':'s'}…`);

    const ids = plan.changing.map(row => row.id);
    let error = null;
    try {
      ({error} = await cloud.from('questions').update({active:!!targetActive}).in('id',ids));
    } catch (err){
      error = err;
    }

    if (error){
      busy = false;
      setFeedback('incorrect',esc(error.message || String(error)));
      renderSummary();
      return;
    }

    selectedIds.clear();
    try { await loadTeacher(); } catch (err){ console.warn('Question Bank refresh failed after bulk status update:',err); }
    busy = false;
    setFeedback('correct',`${plan.changing.length} question${plan.changing.length===1?'':'s'} ${targetActive?'activated':'deactivated'} successfully.`);
    window.requestAnimationFrame(()=>renderSummary());
  }

  function wire(){
    if (typeof document === 'undefined') return;
    if (!ensurePanel()) return;

    document.getElementById('v51b2a-select-visible')?.addEventListener('click',selectAllFiltered);
    document.getElementById('v51b2a-clear-selection')?.addEventListener('click',clearSelection);
    document.getElementById('v51b2a-activate')?.addEventListener('click',()=>runBulk(true));
    document.getElementById('v51b2a-deactivate')?.addEventListener('click',()=>runBulk(false));

    ['question-search','question-year','question-strand','question-exam-year','question-paper','question-status','v51b1-qa-filter','v51b1-source-filter']
      .forEach(id=>document.getElementById(id)?.addEventListener('change',()=>window.requestAnimationFrame(renderSummary)));
    document.getElementById('question-search')?.addEventListener('input',()=>window.requestAnimationFrame(renderSummary));
    document.getElementById('question-exam-year')?.addEventListener('input',()=>window.requestAnimationFrame(renderSummary));
    document.getElementById('question-paper')?.addEventListener('input',()=>window.requestAnimationFrame(renderSummary));

    const previousRender = typeof renderQuestions === 'function' ? renderQuestions : null;
    if (previousRender && !window.__v51QuestionBankBulkStatusRenderWrapped){
      window.__v51QuestionBankBulkStatusRenderWrapped = true;
      renderQuestions = function(){
        const result = previousRender.apply(this,arguments);
        window.requestAnimationFrame(renderSummary);
        return result;
      };
    }

    const cards = document.getElementById('questions-cards');
    if (cards && typeof MutationObserver !== 'undefined'){
      const observer = new MutationObserver(()=>window.requestAnimationFrame(renderSummary));
      observer.observe(cards,{childList:true});
    }
    renderSummary();
  }

  const api = Object.freeze({
    directActivationBlockers,
    buildPlan,
    confirmationText,
    visibleCardIds,
    selectAllFiltered,
    clearSelection,
    renderSummary
  });

  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'V51QuestionBankBulkStatus',{value:api,writable:false,configurable:false});
    if (typeof document !== 'undefined'){
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
      else wire();
    }
  }
})();
