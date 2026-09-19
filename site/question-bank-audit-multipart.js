/* V5.1B2D — Teacher-only correction audit history viewer.
   Read-only UI. History is written by the database trigger, never by this module. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51QuestionChangeHistoryInstalled) return;
  if (typeof window !== 'undefined') window.__v51QuestionChangeHistoryInstalled = true;

  let busy = false;
  let lastQuestionId = '';

  const FIELD_LABELS = Object.freeze({
    year_level:'Year level', strand:'Strand', topic:'Topic', subtopic:'Subtopic', skill:'Skill', difficulty:'Difficulty', marks:'Marks',
    exam_year:'Exam year', paper:'Paper', question_number:'Question number', source_type:'Source type', source:'Source', question_text:'Question text',
    answer:'Answer', accepted_answers:'Accepted answers', hint:'Hint', explanation:'Explanation', image_url:'Image', active:'Active',
    response_type:'Response type', response_config:'Response config', parent_question_number:'Parent question', part_label:'Part label',
    part_order:'Part order', group_prompt:'Group prompt', review_status:'Review status', review_note:'Review note'
  });

  const trim = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function selectedIdsFromUi(){
    if (typeof document === 'undefined') return new Set();
    return new Set([...document.querySelectorAll('.v51b2a-select:checked')]
      .map(box=>String(box.dataset.id || box.closest('.qcard')?.dataset?.v51b2aId || ''))
      .filter(Boolean));
  }

  function selectedRows(rows=currentQuestions(), ids=selectedIdsFromUi()){
    return rows.filter(row=>ids.has(String(row.id)));
  }

  function questionLabel(row){
    const exam = [row?.exam_year,row?.paper,row?.question_number ? `Q${row.question_number}` : ''].filter(Boolean).join(' ');
    return exam || trim(row?.question_text).slice(0,80) || String(row?.id || 'Question');
  }

  function fieldLabel(field){ return FIELD_LABELS[field] || String(field || '').replace(/_/g,' '); }

  function formatValue(value){
    if (value === null || value === undefined || value === '') return '∅';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object'){
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v51b2d-question-history');
    if (panel) return panel;
    const reviewPanel = document.getElementById('v51b2c-review-workflow');
    const metadataPanel = document.getElementById('v51b2b-bulk-metadata');
    const statusPanel = document.getElementById('v51b2a-bulk-status');
    const anchor = reviewPanel || metadataPanel || statusPanel;
    if (!anchor) return null;

    panel = document.createElement('section');
    panel.id = 'v51b2d-question-history';
    panel.className = 'info';
    panel.style.marginBottom = '12px';
    panel.innerHTML = `
      <div class="header" style="align-items:center;gap:10px">
        <div>
          <strong>V5.1B2D — Correction audit history</strong>
          <div class="help">Database-enforced, read-only history. Select exactly one question to inspect field-by-field changes.</div>
        </div>
        <button id="v51b2d-load" class="outline" type="button" disabled>Load history</button>
      </div>
      <div id="v51b2d-selection" class="help" style="margin-top:8px">Select one question to view its history.</div>
      <div id="v51b2d-history-root" style="display:grid;gap:8px;margin-top:10px"></div>
      <div id="v51b2d-feedback" class="feedback hidden" role="status" aria-live="polite"></div>`;
    anchor.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function setFeedback(kind,message){
    const root = document.getElementById('v51b2d-feedback');
    if (!root) return;
    root.className = `feedback ${kind}`;
    root.textContent = message;
  }

  function clearFeedback(){
    const root = document.getElementById('v51b2d-feedback');
    if (!root) return;
    root.className = 'feedback hidden';
    root.textContent = '';
  }

  function renderSelectionState(){
    ensurePanel();
    const rows = selectedRows();
    const info = document.getElementById('v51b2d-selection');
    const btn = document.getElementById('v51b2d-load');
    if (!info || !btn) return rows;
    btn.disabled = busy || rows.length !== 1 || !cloudTeacherReady();
    if (!rows.length) info.textContent = 'Select one question to view its history.';
    else if (rows.length > 1) info.textContent = `${rows.length} selected · choose exactly one question for audit history.`;
    else info.textContent = `Selected: ${questionLabel(rows[0])}`;
    if (rows.length !== 1){
      lastQuestionId = '';
      const root = document.getElementById('v51b2d-history-root');
      if (root) root.innerHTML = '';
    }
    return rows;
  }

  function renderEntry(entry){
    const when = entry?.changed_at ? new Date(entry.changed_at) : null;
    const timestamp = when && !Number.isNaN(when.getTime()) ? when.toLocaleString() : trim(entry?.changed_at) || 'Unknown time';
    const actor = entry?.changed_by ? 'Authenticated teacher' : 'System/service';
    const fields = Array.isArray(entry?.changed_fields) ? entry.changed_fields : Object.keys(entry?.changes || {});
    const rows = fields.map(field=>{
      const pair = entry?.changes?.[field] || {};
      return `<div style="display:grid;grid-template-columns:minmax(120px,0.7fr) minmax(0,1fr) 24px minmax(0,1fr);gap:6px;align-items:start">
        <strong>${esc(fieldLabel(field))}</strong>
        <span>${esc(formatValue(pair.old))}</span><span>→</span><span>${esc(formatValue(pair.new))}</span>
      </div>`;
    }).join('');
    return `<article class="info" style="margin:0">
      <div><strong>${esc(timestamp)}</strong> · ${esc(actor)} · ${fields.length} field${fields.length===1?'':'s'}</div>
      <div style="display:grid;gap:4px;margin-top:7px">${rows || '<span class="help">No tracked fields.</span>'}</div>
    </article>`;
  }

  function renderHistory(payload){
    const root = document.getElementById('v51b2d-history-root');
    if (!root) return;
    const history = Array.isArray(payload?.history) ? payload.history : [];
    if (!history.length){
      root.innerHTML = '<div class="help">No recorded corrections yet for this question. B2D records changes made after the audit trigger was installed.</div>';
      return;
    }
    root.innerHTML = `<div class="help">${history.length} recorded change${history.length===1?'':'s'} · newest first</div>${history.map(renderEntry).join('')}`;
  }

  async function loadSelectedHistory(){
    if (busy) return;
    const rows = selectedRows();
    if (rows.length !== 1){ setFeedback('error','Select exactly one question.'); return; }
    if (!cloudTeacherReady()){ setFeedback('error','Cloud Teacher connection is required.'); return; }
    busy = true;
    clearFeedback();
    renderSelectionState();
    const question = rows[0];
    try {
      const {data,error} = await cloud.rpc('get_question_change_history_v51b2d',{p_question_id:question.id,p_limit:50});
      if (error) throw error;
      lastQuestionId = String(question.id);
      renderHistory(data || {});
      setFeedback('success',`Loaded audit history for ${questionLabel(question)}.`);
    } catch (error){
      setFeedback('error',error?.message || String(error));
    } finally {
      busy = false;
      renderSelectionState();
    }
  }

  function bind(){
    ensurePanel();
    const btn = document.getElementById('v51b2d-load');
    if (btn && !btn.dataset.bound){
      btn.dataset.bound = '1';
      btn.addEventListener('click',loadSelectedHistory);
    }
    if (!document.documentElement.dataset.v51b2dSelectionBound){
      document.documentElement.dataset.v51b2dSelectionBound = '1';
      document.addEventListener('change',event=>{
        if (event.target?.matches?.('.v51b2a-select')) window.setTimeout(renderSelectionState,0);
      },true);
      document.addEventListener('click',event=>{
        if (event.target?.closest?.('#v51b2a-select-all,#v51b2a-clear')) window.setTimeout(renderSelectionState,0);
      },true);
    }
  }

  function refreshLifecycle(){
    if (typeof document === 'undefined') return [];
    bind();
    return renderSelectionState();
  }

  function installObserver(){
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    if (document.documentElement.dataset.v51b2dObserver) return;
    document.documentElement.dataset.v51b2dObserver = '1';
    const observer = new MutationObserver(()=>window.requestAnimationFrame(()=>{
      bind();
      renderSelectionState();
    }));
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function install(){
    if (typeof document === 'undefined') return;
    bind();
    renderSelectionState();
    installObserver();
  }

  if (typeof window !== 'undefined'){
    window.V51QuestionChangeHistory = Object.freeze({
      fieldLabel, formatValue, selectedIdsFromUi, selectedRows, questionLabel, loadSelectedHistory, renderHistory, refreshLifecycle
    });
  }

  if (typeof document !== 'undefined'){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
})();

/* V5.1B2E — Multipart Question Management.
   Inspects sibling consistency and uses a teacher-only RPC for safe group-wide prompt/order corrections.
   Answers, marks, question text, exam identity, response configuration, images and active status are never changed here. */
(() => {
  'use strict';

  if (typeof window !== 'undefined' && window.__v51MultipartQuestionManagementInstalled) return;
  if (typeof window !== 'undefined') window.__v51MultipartQuestionManagementInstalled = true;

  let busy = false;
  let promptDirty = false;

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function selectedIdsFromUi(){
    if (typeof document === 'undefined') return new Set();
    return new Set([...document.querySelectorAll('.v51b2a-select:checked')]
      .map(box=>String(box.dataset.id || box.closest('.qcard')?.dataset?.v51b2aId || ''))
      .filter(Boolean));
  }

  function selectedRows(rows=currentQuestions(),ids=selectedIdsFromUi()){
    return rows.filter(row=>ids.has(String(row.id)));
  }

  function groupKey(row){
    const parent = norm(row?.parent_question_number);
    if (!parent) return '';
    return `${Number(row?.year_level)||''}|${Number(row?.exam_year)||''}|${norm(row?.paper)}|${parent}`;
  }

  function cleanPartLabel(value){
    return norm(value).replace(/^\((.+)\)$/,'$1');
  }

  function expectedOrderForLabel(value){
    const label = cleanPartLabel(value);
    if (!/^[a-z]$/.test(label)) return null;
    return label.charCodeAt(0) - 96;
  }

  function normalizedQuestionNumber(value){
    return norm(value).replace(/^q\s*/,'').replace(/\s+/g,'');
  }

  function buildMultipartGroups(rows=currentQuestions()){
    const groups = new Map();
    for (const row of rows || []){
      const key = groupKey(row);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
    }
    return [...groups.entries()].map(([key,list])=>analyzeGroup(list,key));
  }

  function analyzeGroup(rows,key=groupKey(rows?.[0])){
    const list = Array.from(rows || []);
    const first = list[0] || {};
    const labels = list.map(row=>cleanPartLabel(row.part_label));
    const orders = list.map(row=>Number(row.part_order));
    const prompts = new Set(list.map(row=>trim(row.group_prompt)));
    const labelCounts = new Map();
    const orderCounts = new Map();
    labels.forEach(label=>labelCounts.set(label,(labelCounts.get(label)||0)+1));
    orders.forEach(order=>orderCounts.set(String(order),(orderCounts.get(String(order))||0)+1));

    const issues = [];
    const warnings = [];
    if (list.length < 2) issues.push('Multipart group has fewer than two sibling rows.');
    if (labels.some(label=>!label)) issues.push('One or more parts are missing a part label.');
    if ([...labelCounts.entries()].some(([label,count])=>label && count>1)) issues.push('Duplicate part labels detected.');
    if (orders.some(order=>!Number.isInteger(order) || order<1)) issues.push('One or more parts have an invalid part order.');
    if ([...orderCounts.values()].some(count=>count>1)) issues.push('Duplicate part-order values detected.');

    const validOrders = orders.filter(order=>Number.isInteger(order) && order>0).sort((a,b)=>a-b);
    if (validOrders.length===list.length && validOrders.some((order,index)=>order!==index+1)) issues.push('Part order is not contiguous from 1.');
    if (prompts.size>1) issues.push('Sibling group prompts are inconsistent.');

    const parent = trim(first.parent_question_number);
    for (const row of list){
      const label = cleanPartLabel(row.part_label);
      if (!parent || !label) continue;
      const expectedNumber = normalizedQuestionNumber(`${parent}(${label})`);
      if (normalizedQuestionNumber(row.question_number) !== expectedNumber){
        issues.push('Question number and part label are inconsistent.');
        break;
      }
    }

    const activeStates = new Set(list.map(row=>row.active===false?'inactive':'active'));
    if (activeStates.size>1) warnings.push('Sibling parts have mixed active/inactive status.');
    const reviewStates = new Set(list.map(row=>norm(row.review_status)||'none'));
    if (reviewStates.size>1) warnings.push('Sibling parts have mixed review states.');

    const expectedOrders = labels.map(expectedOrderForLabel);
    const uniqueExpected = new Set(expectedOrders.filter(Number.isInteger));
    const safeNormalize = expectedOrders.length===list.length
      && expectedOrders.every(Number.isInteger)
      && uniqueExpected.size===list.length
      && Math.min(...expectedOrders)===1
      && Math.max(...expectedOrders)===list.length;
    const normalizationNeeded = safeNormalize && list.some((row,index)=>Number(row.part_order)!==expectedOrders[index]);

    const sortedRows = list.slice().sort((a,b)=>{
      const ao=Number(a.part_order), bo=Number(b.part_order);
      if (Number.isFinite(ao) && Number.isFinite(bo) && ao!==bo) return ao-bo;
      return cleanPartLabel(a.part_label).localeCompare(cleanPartLabel(b.part_label),undefined,{numeric:true});
    });

    return Object.freeze({
      key,
      yearLevel:Number(first.year_level)||null,
      examYear:Number(first.exam_year)||null,
      paper:trim(first.paper),
      parentQuestionNumber:parent,
      rows:Object.freeze(sortedRows),
      siblingCount:list.length,
      activeCount:list.filter(row=>row.active!==false).length,
      needsReviewCount:list.filter(row=>norm(row.review_status)==='needs_review').length,
      totalMarks:list.reduce((sum,row)=>sum+(Number(row.marks)||0),0),
      prompts:Object.freeze([...prompts]),
      sharedPrompt:prompts.size===1 ? [...prompts][0] : '',
      issues:Object.freeze([...new Set(issues)]),
      warnings:Object.freeze([...new Set(warnings)]),
      safeNormalize,
      normalizationNeeded
    });
  }

  function selectedGroup(rows=currentQuestions(),ids=selectedIdsFromUi()){
    const selected = rows.filter(row=>ids.has(String(row.id)));
    if (!selected.length) return {selected,group:null,message:'Select one multipart question to inspect its sibling group.'};
    const keys = new Set(selected.map(groupKey).filter(Boolean));
    if (selected.some(row=>!groupKey(row))) return {selected,group:null,message:'The selection includes a question that is not part of a multipart group.'};
    if (keys.size!==1) return {selected,group:null,message:'Select questions from only one multipart group at a time.'};
    const key=[...keys][0];
    const siblings=rows.filter(row=>groupKey(row)===key);
    return {selected,group:analyzeGroup(siblings,key),message:''};
  }

  function groupLabel(group){
    if (!group) return 'Multipart group';
    return [group.examYear,group.paper,group.parentQuestionNumber?`Q${group.parentQuestionNumber}`:''].filter(Boolean).join(' ');
  }

  function allGroupStats(rows=currentQuestions()){
    const groups=buildMultipartGroups(rows);
    return {
      groups,
      total:groups.length,
      structuralIssues:groups.filter(group=>group.issues.length).length,
      warnings:groups.filter(group=>group.warnings.length).length
    };
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel=document.getElementById('v51b2e-multipart-management');
    if (panel) return panel;
    const history=document.getElementById('v51b2d-question-history');
    const review=document.getElementById('v51b2c-review-workflow');
    const anchor=history||review||document.getElementById('v51b2b-bulk-metadata')||document.getElementById('v51b2a-bulk-status');
    if (!anchor) return null;

    panel=document.createElement('section');
    panel.id='v51b2e-multipart-management';
    panel.className='info';
    panel.style.marginBottom='12px';
    panel.innerHTML=`
      <div class="header" style="align-items:center;gap:10px">
        <div>
          <strong>V5.1B2E — Multipart question management</strong>
          <div class="help">Select one multipart question to inspect all sibling parts. Safe group-wide corrections are audit-logged by B2D.</div>
        </div>
        <button id="v51b2e-refresh" class="outline" type="button">Refresh group</button>
      </div>
      <div id="v51b2e-global-stats" class="pills" style="margin-top:10px"></div>
      <div id="v51b2e-selection" class="help" style="margin-top:10px">Select one multipart question.</div>
      <div id="v51b2e-group-root" class="hidden" style="margin-top:10px"></div>
      <div id="v51b2e-editor" class="hidden" style="margin-top:10px">
        <label><strong>Shared group prompt</strong>
          <textarea id="v51b2e-group-prompt" rows="3" placeholder="Shared prompt shown with every sibling part"></textarea>
        </label>
        <div class="toolbar" style="margin-top:8px">
          <button id="v51b2e-preview-prompt" class="outline" type="button">Preview shared prompt</button>
          <button id="v51b2e-apply-prompt" class="primary" type="button">Apply shared prompt</button>
          <button id="v51b2e-normalize-order" class="outline" type="button">Normalize part order</button>
        </div>
        <div id="v51b2e-preview" class="info hidden" style="margin-top:8px"></div>
      </div>
      <div id="v51b2e-feedback" class="feedback hidden" role="status" aria-live="polite"></div>`;
    anchor.insertAdjacentElement('afterend',panel);
    return panel;
  }

  function decorateCards(rows=currentQuestions()){
    if (typeof document==='undefined') return;
    const groups=new Map(buildMultipartGroups(rows).map(group=>[group.key,group]));
    const byId=new Map(rows.map(row=>[String(row.id),row]));
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const id=card.dataset.v51b2aId||card.querySelector('.v51b2a-select')?.dataset?.id||card.querySelector('[data-id]')?.dataset?.id||'';
      const row=byId.get(String(id));
      let badge=card.querySelector('.v51b2e-multipart-badge');
      if (!row || !groupKey(row)) { badge?.remove(); return; }
      const group=groups.get(groupKey(row));
      if (!group) return;
      if (!badge){
        badge=document.createElement('div');
        badge.className='v51b2e-multipart-badge help';
        badge.style.margin='4px 0 8px';
        const head=card.querySelector('.qcard-head');
        if (head) head.insertAdjacentElement('afterend',badge); else card.prepend(badge);
      }
      const status=group.issues.length?'⚠':group.warnings.length?'◐':'✓';
      badge.textContent=`${status} Multipart Q${group.parentQuestionNumber} · part ${cleanPartLabel(row.part_label)||'?'} of ${group.siblingCount}`;
    });
  }

  function setFeedback(kind,message){
    const root=document.getElementById('v51b2e-feedback');
    if (!root) return;
    root.className=`feedback ${kind}`;
    root.innerHTML=message;
  }

  function clearFeedback(){
    const root=document.getElementById('v51b2e-feedback');
    if (!root) return;
    root.className='feedback hidden';
    root.innerHTML='';
  }

  function renderGroup(){
    if (!ensurePanel()) return null;
    const rows=currentQuestions();
    decorateCards(rows);
    const stats=allGroupStats(rows);
    const statsRoot=document.getElementById('v51b2e-global-stats');
    if (statsRoot) statsRoot.innerHTML=[
      `${stats.total} multipart group${stats.total===1?'':'s'}`,
      `${stats.structuralIssues} structural issue${stats.structuralIssues===1?'':'s'}`,
      `${stats.warnings} mixed-state warning${stats.warnings===1?'':'s'}`
    ].map(text=>`<span class="pill">${esc(text)}</span>`).join('');

    const selection=selectedGroup(rows);
    const selectionRoot=document.getElementById('v51b2e-selection');
    const groupRoot=document.getElementById('v51b2e-group-root');
    const editor=document.getElementById('v51b2e-editor');
    const prompt=document.getElementById('v51b2e-group-prompt');
    const apply=document.getElementById('v51b2e-apply-prompt');
    const preview=document.getElementById('v51b2e-preview-prompt');
    const normalize=document.getElementById('v51b2e-normalize-order');

    if (!selection.group){
      if (selectionRoot) selectionRoot.textContent=selection.message;
      groupRoot?.classList.add('hidden');
      editor?.classList.add('hidden');
      if (apply) apply.disabled=true;
      if (preview) preview.disabled=true;
      if (normalize) normalize.disabled=true;
      return selection;
    }

    const group=selection.group;
    if (selectionRoot) selectionRoot.textContent=`${groupLabel(group)} · ${group.siblingCount} parts · ${group.totalMarks} marks · ${group.activeCount} active`;
    if (groupRoot){
      groupRoot.className='info';
      const issueHtml=group.issues.length?`<div style="color:var(--danger)"><strong>Structural attention</strong><br>${group.issues.map(esc).join('<br>')}</div>`:'<div><strong>✓ Structure clean</strong></div>';
      const warningHtml=group.warnings.length?`<div class="muted"><strong>Warnings</strong><br>${group.warnings.map(esc).join('<br>')}</div>`:'';
      const parts=group.rows.map(row=>{
        const label=cleanPartLabel(row.part_label)||'?';
        const state=row.active===false?'Inactive':'Active';
        const review=norm(row.review_status)==='needs_review'?' · Needs review':'';
        return `<div style="padding:7px 0;border-top:1px solid var(--border)"><strong>(${esc(label)})</strong> order ${esc(row.part_order)} · ${esc(row.marks)} mark${Number(row.marks)===1?'':'s'} · ${esc(state+review)}<br><span class="muted">${esc(trim(row.question_text).slice(0,140))}</span></div>`;
      }).join('');
      groupRoot.innerHTML=`<strong>${esc(groupLabel(group))}</strong><br><span class="muted">Shared prompt: ${esc(group.sharedPrompt || (group.prompts.length>1?'— inconsistent —':'— none —'))}</span><div style="margin-top:8px">${issueHtml}${warningHtml}${parts}</div>`;
    }
    editor?.classList.remove('hidden');
    if (prompt && !promptDirty) prompt.value=group.sharedPrompt;
    const ready=cloudTeacherReady();
    if (apply) apply.disabled=busy||!ready;
    if (preview) preview.disabled=busy;
    if (normalize){
      normalize.disabled=busy||!ready||!group.safeNormalize||!group.normalizationNeeded;
      normalize.textContent=group.normalizationNeeded?'Normalize part order':'Part order already normalized';
    }
    return selection;
  }

  function previewPrompt(){
    const selection=renderGroup();
    const root=document.getElementById('v51b2e-preview');
    if (!root || !selection?.group) return;
    const group=selection.group;
    const value=document.getElementById('v51b2e-group-prompt')?.value ?? '';
    const changing=group.rows.filter(row=>String(row.group_prompt ?? '')!==String(value));
    root.className='info';
    root.innerHTML=changing.length
      ? `<strong>${changing.length} sibling row${changing.length===1?'':'s'} will change</strong><br>Shared group prompt → ${esc(value || '— cleared —')}<br><span class="muted">No answers, marks, question text, exam identity, response configuration, images or active status will change.</span>`
      : '<strong>No sibling rows need this prompt change.</strong>';
  }

  async function runAction(action){
    if (busy) return;
    const selection=selectedGroup(currentQuestions());
    const group=selection.group;
    if (!group){ setFeedback('try',selection.message); return; }
    if (!cloudTeacherReady()){ setFeedback('incorrect','Multipart corrections require Cloud Teacher mode.'); return; }

    const promptValue=document.getElementById('v51b2e-group-prompt')?.value ?? '';
    if (action==='set_group_prompt'){
      const changing=group.rows.filter(row=>String(row.group_prompt ?? '')!==String(promptValue));
      if (!changing.length){ setFeedback('try','Every sibling already has this shared group prompt.'); return; }
      previewPrompt();
      const activeNote=group.activeCount?`\n\n${group.activeCount} sibling part${group.activeCount===1?' is':'s are'} active, so the corrected shared prompt becomes student-visible immediately.`:'';
      if (!window.confirm(`Apply this shared group prompt to all ${group.siblingCount} sibling parts of ${groupLabel(group)}?\n\nOnly group_prompt will change. B2D will record each changed sibling in correction history.${activeNote}`)) return;
    } else {
      if (!group.safeNormalize){ setFeedback('incorrect','Part order cannot be normalized safely because labels are missing, duplicated or not contiguous from (a).'); return; }
      if (!group.normalizationNeeded){ setFeedback('try','Part order is already normalized.'); return; }
      if (!window.confirm(`Normalize part_order for ${groupLabel(group)} from the unique part labels?\n\nOnly part_order will change. B2D will record each changed sibling in correction history.`)) return;
    }

    busy=true;
    clearFeedback();
    renderGroup();
    let data=null, error=null;
    try {
      ({data,error}=await cloud.rpc('manage_multipart_group_v51b2e',{
        p_question_id:group.rows[0].id,
        p_action:action,
        p_group_prompt:action==='set_group_prompt'?promptValue:null,
        p_confirm:true
      }));
    } catch (err){ error=err; }

    if (error){
      busy=false;
      setFeedback('incorrect',esc(error.message||String(error)));
      renderGroup();
      return;
    }

    try { await loadTeacher(); } catch (err){ console.warn('Question Bank refresh failed after multipart correction:',err); }
    busy=false;
    promptDirty=false;
    renderGroup();
    const changed=Number(data?.changed_rows)||0;
    setFeedback('correct',`${esc(groupLabel(group))}: ${changed} sibling row${changed===1?'':'s'} updated successfully. Correction history was captured by B2D.`);
  }

  function wire(){
    if (typeof document==='undefined') return;
    if (!ensurePanel()) return;
    document.getElementById('v51b2e-refresh')?.addEventListener('click',()=>{ promptDirty=false; clearFeedback(); renderGroup(); });
    document.getElementById('v51b2e-group-prompt')?.addEventListener('input',()=>{ promptDirty=true; document.getElementById('v51b2e-preview')?.classList.add('hidden'); });
    document.getElementById('v51b2e-preview-prompt')?.addEventListener('click',previewPrompt);
    document.getElementById('v51b2e-apply-prompt')?.addEventListener('click',()=>runAction('set_group_prompt'));
    document.getElementById('v51b2e-normalize-order')?.addEventListener('click',()=>runAction('normalize_part_order'));
    document.addEventListener('change',event=>{
      if (event.target?.classList?.contains('v51b2a-select')) { promptDirty=false; clearFeedback(); window.requestAnimationFrame(renderGroup); }
    });
    const cards=document.getElementById('questions-cards');
    if (cards && typeof MutationObserver!=='undefined') new MutationObserver(()=>window.requestAnimationFrame(renderGroup)).observe(cards,{childList:true,subtree:true});
    renderGroup();
  }

  const api=Object.freeze({
    groupKey, cleanPartLabel, expectedOrderForLabel, buildMultipartGroups, analyzeGroup,
    selectedGroup, allGroupStats, renderGroup, previewPrompt
  });
  if (typeof window!=='undefined') window.V51MultipartQuestionManagement=api;

  if (typeof document!=='undefined'){
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
    else wire();
  }
})();
