/* V5.2B — Teacher Topical Exercise Library & Management.
   Groups staged topical_exercise rows into teacher-visible sets, summarizes set health,
   lets teachers focus/select a whole set for the existing V5.1 QA/review tools, and
   provides a guarded set rename. Student delivery remains unchanged and V5.2A keeps
   topical rows inactive until the later student Topical Practice library is released. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const TOPICAL_SOURCE_TYPE = 'topical_exercise';
  const state = {focusedKey:'',busy:false,message:'',messageKind:'help'};

  const trim = value => String(value ?? '').trim();
  const norm = value => trim(value).toLowerCase().replace(/\s+/g,' ');
  const compact = value => norm(value).replace(/[^a-z0-9]+/g,'');
  const isTopical = row => norm(row?.source_type) === TOPICAL_SOURCE_TYPE;
  const reviewState = row => ['needs_review','reviewed'].includes(norm(row?.review_status)) ? norm(row.review_status) : 'none';
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function cloudTeacherReady(){
    try { return !!(cloudReady && teacherUser && cloud); } catch { return false; }
  }

  function logicalQuestionNumber(row){
    const parent = trim(row?.parent_question_number).replace(/^q\s*/i,'');
    if (parent) return parent;
    const raw = trim(row?.question_number).replace(/^q\s*/i,'');
    const multipart = raw.match(/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i);
    return multipart ? multipart[1] : raw;
  }

  function setKey(row){
    if (!isTopical(row)) return '';
    const year = Number(row?.year_level);
    const source = norm(row?.source);
    return Number.isFinite(year) && year > 0 && source ? `${year}|${source}` : '';
  }

  function imageReferenceIssue(value){
    try { return ROOT.V51QuestionBankQA?.imageReferenceIssue?.(value) || ''; } catch {}
    const image = trim(value);
    if (!image) return '';
    if (/^https:\/\//i.test(image) || /^\/?images\//i.test(image)) return '';
    if (/^http:\/\//i.test(image)) return 'Insecure HTTP image URL';
    return 'Unresolved image path';
  }

  function rowMetadataIssues(row){
    const issues = [];
    if (!Number.isFinite(Number(row?.year_level)) || Number(row.year_level) <= 0) issues.push('year level');
    if (!trim(row?.source)) issues.push('set name');
    if (!trim(row?.question_number)) issues.push('question number');
    if (!trim(row?.strand)) issues.push('strand');
    if (!trim(row?.topic)) issues.push('topic');
    if (!trim(row?.skill)) issues.push('skill');
    if (!trim(row?.question_text)) issues.push('question text');
    const marks = Number(row?.marks);
    if (!Number.isFinite(marks) || marks <= 0) issues.push('marks');
    const type = norm(row?.response_type || 'text');
    if (!['drawing','manual'].includes(type) && !trim(row?.answer)) issues.push('answer');
    if ((row?.exam_year !== null && row?.exam_year !== undefined && trim(row.exam_year) !== '') || trim(row?.paper)) issues.push('exam metadata');
    return issues;
  }

  function multipartIssueIds(rows){
    const flagged = new Set();
    const groups = new Map();
    for (const row of rows || []){
      const id = String(row?.id ?? '');
      const parent = trim(row?.parent_question_number);
      const qno = trim(row?.question_number).replace(/^q\s*/i,'');
      if (!parent){
        if (/^(\d+)\s*(?:\(([a-z])\)|([a-z]))$/i.test(qno)) flagged.add(id);
        continue;
      }
      const key = norm(parent);
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
      if (!trim(row?.part_label) || !Number.isInteger(Number(row?.part_order)) || Number(row.part_order) < 1) flagged.add(id);
    }
    for (const list of groups.values()){
      if (list.length < 2) list.forEach(row => flagged.add(String(row.id ?? '')));
      const orders = new Map(), labels = new Map(), prompts = new Set();
      for (const row of list){
        const order = String(Number(row.part_order) || '');
        const label = norm(row.part_label);
        orders.set(order,(orders.get(order)||0)+1);
        labels.set(label,(labels.get(label)||0)+1);
        const prompt = trim(row.group_prompt);
        if (prompt) prompts.add(prompt);
      }
      const bad = [...orders.values()].some(n=>n>1) || [...labels.values()].some(n=>n>1) || prompts.size > 1;
      if (bad) list.forEach(row => flagged.add(String(row.id ?? '')));
    }
    return flagged;
  }

  function duplicateQuestionIds(rows){
    const byNumber = new Map();
    for (const row of rows || []){
      const qno = compact(row?.question_number);
      if (!qno) continue;
      if (!byNumber.has(qno)) byNumber.set(qno,[]);
      byNumber.get(qno).push(row);
    }
    const ids = new Set();
    for (const list of byNumber.values()) if (list.length > 1) list.forEach(row => ids.add(String(row.id ?? '')));
    return ids;
  }

  function summarizeSet(key,rows){
    const list = Array.from(rows || []);
    const first = list[0] || {};
    const logical = new Set(list.map(logicalQuestionNumber).filter(Boolean));
    const imageRows = list.filter(row => trim(row?.image_url));
    const imageIssues = list.filter(row => imageReferenceIssue(row?.image_url));
    const metadataIssues = list.filter(row => rowMetadataIssues(row).length);
    const multipartIds = multipartIssueIds(list);
    const duplicateIds = duplicateQuestionIds(list);
    const activeRows = list.filter(row => row?.active !== false);
    const needsReview = list.filter(row => reviewState(row) === 'needs_review');
    const reviewed = list.filter(row => reviewState(row) === 'reviewed');
    const marks = list.reduce((sum,row) => sum + (Number.isFinite(Number(row?.marks)) ? Number(row.marks) : 0),0);
    const issueIds = new Set([
      ...metadataIssues.map(row=>String(row.id ?? '')),
      ...imageIssues.map(row=>String(row.id ?? '')),
      ...multipartIds,
      ...duplicateIds
    ]);
    let status = 'staged';
    if (activeRows.length || issueIds.size) status = 'attention';
    else if (needsReview.length) status = 'needs_review';
    else if (reviewed.length === list.length && list.length) status = 'reviewed';
    return Object.freeze({
      key,
      source:trim(first.source),
      yearLevel:Number(first.year_level) || null,
      rows:Object.freeze(list.slice()),
      rowIds:Object.freeze(list.map(row=>String(row.id ?? '')).filter(Boolean)),
      physicalRows:list.length,
      logicalQuestions:logical.size,
      marks,
      imageRows:imageRows.length,
      imageIssueRows:imageIssues.length,
      metadataIssueRows:metadataIssues.length,
      multipartIssueRows:multipartIds.size,
      duplicateRows:duplicateIds.size,
      issueRows:issueIds.size,
      activeRows:activeRows.length,
      needsReview:needsReview.length,
      reviewed:reviewed.length,
      noReviewState:list.length-needsReview.length-reviewed.length,
      status,
      studentExposure:'off'
    });
  }

  function buildSetSummaries(rows=currentQuestions()){
    const groups = new Map();
    for (const row of rows || []){
      const key = setKey(row);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(row);
    }
    return Object.freeze([...groups.entries()].map(([key,list])=>summarizeSet(key,list))
      .sort((a,b)=>Number(a.yearLevel)-Number(b.yearLevel) || a.source.localeCompare(b.source,undefined,{numeric:true,sensitivity:'base'})));
  }

  function libraryStats(sets=buildSetSummaries()){
    return Object.freeze({
      sets:sets.length,
      rows:sets.reduce((n,set)=>n+set.physicalRows,0),
      logicalQuestions:sets.reduce((n,set)=>n+set.logicalQuestions,0),
      marks:sets.reduce((n,set)=>n+set.marks,0),
      needsReview:sets.filter(set=>set.status==='needs_review').length,
      attention:sets.filter(set=>set.status==='attention').length,
      reviewed:sets.filter(set=>set.status==='reviewed').length,
      staged:sets.filter(set=>set.status==='staged').length
    });
  }

  function renamePlan(rows=currentQuestions(),key,newName){
    const sets = buildSetSummaries(rows);
    const set = sets.find(item=>item.key===key) || null;
    const clean = trim(newName).replace(/\s+/g,' ');
    const blockers = [];
    if (!set) blockers.push('Topical set could not be found.');
    if (!clean) blockers.push('Set name cannot be blank.');
    if (clean.length > 120) blockers.push('Set name must be 120 characters or fewer.');
    if (set && norm(clean) === norm(set.source)) blockers.push('Enter a different set name.');
    if (set?.activeRows) blockers.push('Deactivate every row in this topical set before renaming it.');
    if (set && clean){
      const collision = sets.find(item=>item.key!==key && Number(item.yearLevel)===Number(set.yearLevel) && norm(item.source)===norm(clean));
      if (collision) blockers.push(`Year ${set.yearLevel} already has a topical set named “${clean}”.`);
    }
    return Object.freeze({
      set,
      newName:clean,
      ids:Object.freeze(set ? set.rowIds.slice() : []),
      newKey:set && clean ? `${set.yearLevel}|${norm(clean)}` : '',
      blockers:Object.freeze([...new Set(blockers)]),
      canRun:!!set && !!clean && blockers.length===0
    });
  }

  function statusLabel(status){
    if (status === 'attention') return '⚠ Attention';
    if (status === 'needs_review') return '🟠 Needs review';
    if (status === 'reviewed') return '✅ Reviewed';
    return '🔒 Staged';
  }

  function ensurePanel(){
    if (typeof document === 'undefined') return null;
    let panel = document.getElementById('v52b-topical-library');
    if (panel) return panel;
    const anchor = document.getElementById('v51b1-question-bank-qa') || document.getElementById('question-bank-count');
    if (!anchor) return null;
    panel = document.createElement('section');
    panel.id = 'v52b-topical-library';
    panel.className = 'info';
    panel.style.marginBottom = '12px';
    panel.innerHTML = `
      <div class="header" style="align-items:center;gap:10px">
        <div>
          <strong>V5.2B — Topical Exercise Library</strong>
          <div class="help">Teacher-only set management over staged topical questions. Student exposure remains OFF.</div>
        </div>
        <button id="v52b-refresh" class="outline" type="button">Refresh library</button>
      </div>
      <div id="v52b-summary" class="pills" style="margin-top:10px"></div>
      <div class="filtergrid" style="margin-top:10px">
        <select id="v52b-year" aria-label="Topical set year filter"><option value="all">All year levels</option></select>
        <select id="v52b-status" aria-label="Topical set status filter"><option value="all">All set states</option><option value="staged">Staged</option><option value="needs_review">Needs review</option><option value="reviewed">Reviewed</option><option value="attention">Attention</option></select>
        <input id="v52b-search" type="search" placeholder="Search topical set name" aria-label="Search topical sets">
      </div>
      <div id="v52b-focus" class="help hidden" style="margin-top:10px"></div>
      <div id="v52b-cards" style="display:grid;gap:10px;margin-top:10px"></div>
      <div id="v52b-feedback" class="feedback hidden" role="status" aria-live="polite"></div>`;
    if (anchor.id === 'v51b1-question-bank-qa') anchor.insertAdjacentElement('afterend',panel);
    else anchor.insertAdjacentElement('beforebegin',panel);
    return panel;
  }

  function syncYearOptions(sets){
    const select = document.getElementById('v52b-year');
    if (!select) return;
    const current = select.value || 'all';
    const years = [...new Set(sets.map(set=>Number(set.yearLevel)).filter(Boolean))].sort((a,b)=>a-b);
    select.innerHTML = '<option value="all">All year levels</option>'+years.map(year=>`<option value="${year}">Year ${year}</option>`).join('');
    select.value = current==='all' || years.includes(Number(current)) ? current : 'all';
  }

  function filteredSets(sets){
    if (typeof document === 'undefined') return sets;
    const year = document.getElementById('v52b-year')?.value || 'all';
    const status = document.getElementById('v52b-status')?.value || 'all';
    const search = norm(document.getElementById('v52b-search')?.value || '');
    return sets.filter(set =>
      (year==='all' || Number(set.yearLevel)===Number(year))
      && (status==='all' || set.status===status)
      && (!search || norm(set.source).includes(search))
    );
  }

  function renderCard(set){
    const issueText = set.status==='attention'
      ? [`${set.activeRows} active`,`${set.metadataIssueRows} metadata`,`${set.imageIssueRows} image`,`${set.multipartIssueRows} multipart`,`${set.duplicateRows} duplicate`].filter(text=>!text.startsWith('0 ')).join(' · ')
      : set.needsReview ? `${set.needsReview} question${set.needsReview===1?'':'s'} need review`
      : set.reviewed===set.physicalRows && set.physicalRows ? 'All rows reviewed' : 'Ready for teacher review';
    return `<article class="qcard v52b-set-card" data-v52b-key="${esc(set.key)}" style="margin:0">
      <div class="qcard-head">
        <div>
          <div class="pills"><span class="tag">Year ${esc(set.yearLevel)}</span><span class="tag">${esc(statusLabel(set.status))}</span><span class="tag">Student exposure OFF</span></div>
          <h3 style="margin:8px 0 4px">${esc(set.source)}</h3>
          <div class="muted">${esc(set.physicalRows)} row${set.physicalRows===1?'':'s'} · ${esc(set.logicalQuestions)} logical question${set.logicalQuestions===1?'':'s'} · ${esc(set.marks)} marks · ${esc(set.imageRows)} image${set.imageRows===1?'':'s'}</div>
        </div>
      </div>
      <div class="help" style="margin-top:8px">${esc(issueText)}</div>
      <div class="pills" style="margin-top:8px"><span class="tag">${esc(set.reviewed)} reviewed</span><span class="tag">${esc(set.needsReview)} needs review</span><span class="tag">${esc(set.noReviewState)} not reviewed</span></div>
      <div class="buttons" style="margin-top:10px">
        <button class="outline v52b-view" type="button" data-key="${esc(set.key)}">View questions</button>
        <button class="secondary v52b-select" type="button" data-key="${esc(set.key)}">Select set</button>
        <button class="outline v52b-rename" type="button" data-key="${esc(set.key)}" ${set.activeRows?'disabled':''}>Rename set</button>
      </div>
    </article>`;
  }

  function setFeedback(kind,message){
    state.messageKind=kind; state.message=message;
    const root=document.getElementById('v52b-feedback');
    if (!root) return;
    root.className=`feedback ${kind}`;
    root.innerHTML=message;
  }

  function clearFeedback(){
    state.message='';
    const root=document.getElementById('v52b-feedback');
    if (!root) return;
    root.className='feedback hidden'; root.innerHTML='';
  }

  function resetQuestionFiltersForSet(set){
    const values = [
      ['question-year',String(set.yearLevel)],['question-search',''],['question-exam-year',''],['question-paper',''],
      ['question-status','all'],['v51b1-source-filter','topical'],['v51b1-qa-filter','all'],['v51b2c-review-filter','all']
    ];
    for (const [id,value] of values){ const el=document.getElementById(id); if (el) el.value=value; }
    const strand=document.getElementById('question-strand');
    if (strand && [...strand.options].some(option=>option.value==='all')) strand.value='all';
  }

  function applyFocusedCards(rows=currentQuestions()){
    if (!state.focusedKey || typeof document === 'undefined') return 0;
    const set=buildSetSummaries(rows).find(item=>item.key===state.focusedKey);
    if (!set){ state.focusedKey=''; return 0; }
    const ids=new Set(set.rowIds);
    let visible=0;
    document.querySelectorAll('#questions-cards .qcard').forEach(card=>{
      const id=card.dataset.v51b2aId || card.querySelector('.v51b2a-select')?.dataset?.id || card.querySelector('[data-id]')?.dataset?.id || '';
      const show=ids.has(String(id));
      card.classList.toggle('hidden',!show);
      if (show) visible++;
    });
    const count=document.getElementById('question-bank-count');
    if (count) count.textContent=`Showing ${visible} question row${visible===1?'':'s'} from Year ${set.yearLevel} · ${set.source}`;
    const focus=document.getElementById('v52b-focus');
    if (focus){ focus.classList.remove('hidden'); focus.innerHTML=`Focused on <strong>Year ${esc(set.yearLevel)} · ${esc(set.source)}</strong>. <button id="v52b-clear-focus" class="outline" type="button" style="margin-left:8px">Clear set focus</button>`; document.getElementById('v52b-clear-focus')?.addEventListener('click',clearFocus,{once:true}); }
    return visible;
  }

  function viewSet(key){
    const set=buildSetSummaries().find(item=>item.key===key);
    if (!set) return false;
    state.focusedKey=key;
    resetQuestionFiltersForSet(set);
    try { if (typeof renderQuestions==='function') renderQuestions(); } catch {}
    ROOT.requestAnimationFrame?.(()=>applyFocusedCards());
    document.getElementById('question-bank-count')?.scrollIntoView?.({behavior:'smooth',block:'start'});
    return true;
  }

  function clearFocus(){
    state.focusedKey='';
    const focus=document.getElementById('v52b-focus'); if (focus){focus.classList.add('hidden');focus.innerHTML='';}
    try { if (typeof renderQuestions==='function') renderQuestions(); } catch {}
    ROOT.requestAnimationFrame?.(()=>render());
  }

  function selectSet(key){
    if (!viewSet(key)) return 0;
    const set=buildSetSummaries().find(item=>item.key===key);
    if (!set) return 0;
    const ids=new Set(set.rowIds);
    ROOT.requestAnimationFrame?.(()=>{
      let selected=0;
      document.querySelectorAll('#questions-cards .v51b2a-select').forEach(box=>{
        const id=String(box.dataset.id || box.closest('.qcard')?.dataset?.v51b2aId || '');
        const should=ids.has(id);
        if (box.checked!==should){ box.checked=should; box.dispatchEvent(new Event('change',{bubbles:true})); }
        if (should) selected++;
      });
      setFeedback('correct',`${selected} row${selected===1?'':'s'} selected from ${esc(set.source)}. Use the existing bulk metadata/review tools below for question-level management.`);
      document.getElementById('v51b2a-bulk-status')?.scrollIntoView?.({behavior:'smooth',block:'start'});
    });
    return set.rowIds.length;
  }

  async function renameSet(key){
    if (state.busy) return false;
    const set=buildSetSummaries().find(item=>item.key===key);
    if (!set){ setFeedback('incorrect','Topical set could not be found.'); return false; }
    if (!cloudTeacherReady()){ setFeedback('incorrect','Renaming a topical set requires Cloud Teacher mode.'); return false; }
    const entered=ROOT.prompt?.('Rename topical exercise set:',set.source);
    if (entered===null || entered===undefined) return false;
    const plan=renamePlan(currentQuestions(),key,entered);
    if (!plan.canRun){ setFeedback('incorrect',esc(plan.blockers[0] || 'This topical set cannot be renamed.')); return false; }
    const approved=ROOT.confirm?.(`Rename Year ${set.yearLevel} topical set?\n\n${set.source}\n→ ${plan.newName}\n\n${plan.ids.length} question row${plan.ids.length===1?'':'s'} will update. Active status, answers, marks, review state, images and student delivery will not change.`);
    if (!approved) return false;
    state.busy=true; render(); setFeedback('try',`Renaming ${esc(set.source)}…`);
    let error=null;
    try { ({error}=await cloud.from('questions').update({source:plan.newName}).in('id',plan.ids)); } catch (err){ error=err; }
    if (error){ state.busy=false; setFeedback('incorrect',esc(error.message || String(error))); render(); return false; }
    state.focusedKey=plan.newKey;
    try { await loadTeacher(); } catch (err){ console.warn('Question Bank refresh failed after topical set rename:',err); }
    state.busy=false; render(); setFeedback('correct',`Topical set renamed to <strong>${esc(plan.newName)}</strong>. Student exposure remains OFF.`);
    return true;
  }

  function render(){
    if (typeof document === 'undefined') return null;
    const panel=ensurePanel(); if (!panel) return null;
    const sets=buildSetSummaries(); syncYearOptions(sets);
    const stats=libraryStats(sets);
    const summary=document.getElementById('v52b-summary');
    if (summary) summary.innerHTML=[`${stats.sets} sets`,`${stats.rows} rows`,`${stats.logicalQuestions} logical questions`,`${stats.marks} marks`,`${stats.staged} staged`,`${stats.needsReview} needs review`,`${stats.reviewed} reviewed`,`${stats.attention} attention`].map(text=>`<span class="tag">${esc(text)}</span>`).join('');
    const visible=filteredSets(sets);
    const cards=document.getElementById('v52b-cards');
    if (cards) cards.innerHTML=visible.length ? visible.map(renderCard).join('') : sets.length ? '<div class="empty">No topical sets match these filters.</div>' : '<div class="empty"><strong>No topical exercise sets are staged yet.</strong><br>Import a validated <code>topical_exercise</code> package through Bulk Import Questions. V5.2A will keep every imported row inactive.</div>';
    cards?.querySelectorAll('.v52b-view').forEach(button=>button.addEventListener('click',()=>viewSet(button.dataset.key)));
    cards?.querySelectorAll('.v52b-select').forEach(button=>button.addEventListener('click',()=>selectSet(button.dataset.key)));
    cards?.querySelectorAll('.v52b-rename').forEach(button=>button.addEventListener('click',()=>renameSet(button.dataset.key)));
    if (state.focusedKey) ROOT.requestAnimationFrame?.(()=>applyFocusedCards());
    if (state.message){ const feedback=document.getElementById('v52b-feedback'); if (feedback){feedback.className=`feedback ${state.messageKind}`;feedback.innerHTML=state.message;} }
    return {sets,visible,stats,focusedKey:state.focusedKey};
  }

  function wire(){
    if (typeof document === 'undefined') return;
    if (!ensurePanel()) return;
    document.getElementById('v52b-refresh')?.addEventListener('click',()=>{clearFeedback();render();});
    document.getElementById('v52b-year')?.addEventListener('change',render);
    document.getElementById('v52b-status')?.addEventListener('change',render);
    document.getElementById('v52b-search')?.addEventListener('input',render);

    const previousRender=typeof renderQuestions==='function' ? renderQuestions : null;
    if (previousRender && !ROOT.__v52bTopicalLibraryRenderWrapped){
      ROOT.__v52bTopicalLibraryRenderWrapped=true;
      renderQuestions=function(){ const result=previousRender.apply(this,arguments); ROOT.requestAnimationFrame?.(()=>{render();applyFocusedCards();}); return result; };
    }
    render();
  }

  const api=Object.freeze({isTopical,logicalQuestionNumber,setKey,rowMetadataIssues,multipartIssueIds,duplicateQuestionIds,summarizeSet,buildSetSummaries,libraryStats,renamePlan,statusLabel,viewSet,selectSet,render});
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V52TeacherTopicalLibrary',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire,{once:true}); else wire();
    }
  }
})();
