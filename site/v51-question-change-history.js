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
      fieldLabel, formatValue, selectedIdsFromUi, selectedRows, questionLabel, loadSelectedHistory, renderHistory
    });
  }

  if (typeof document !== 'undefined'){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
})();
