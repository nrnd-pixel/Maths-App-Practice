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
