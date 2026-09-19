/* V5.2B.1 — Teacher Question Bank performance hotfix.
   Keeps the full teacherQuestions dataset in memory for established teacher tools, but
   avoids building the complete Question Bank DOM while that tab is hidden and renders
   only one 50-row page for normal browsing. Ordinary manual bulk selection stays on the
   current 50-row page; explicit Select all filtered / Select set actions still expand the
   full matching scope so established bulk/review tools retain whole-scope behavior.
   Legacy Question Bank follow-up refreshes are captured, deduplicated and staggered so
   the first card page can paint before QA/review/library decoration completes.
   No database, grading, student-delivery, Exam Setting or Storage behavior changes. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PAGE_SIZE = 50;
  const FILTER_IDS = new Set([
    'question-search','question-year','question-strand','question-exam-year','question-paper','question-status',
    'v51b1-qa-filter','v51b1-source-filter','v51b2c-review-filter'
  ]);
  const state = {
    page:1,
    selectionMode:false,
    expandingForExplicitSelection:false,
    pending:true,
    renderScheduled:false,
    renderGeneration:0,
    postRenderScheduled:false,
    lastFilteredCount:0,
    lastTotalCount:0
  };

  const trim = value => String(value ?? '').trim();
  const lower = value => trim(value).toLowerCase();

  function normalizeReviewStatus(value){
    const status = lower(value);
    return status === 'needs_review' || status === 'reviewed' ? status : 'none';
  }

  function baseRowMatches(row,filters={}){
    const year = filters.year ?? 'all';
    const strand = filters.strand ?? 'all';
    const exam = lower(filters.exam);
    const paper = lower(filters.paper);
    const status = filters.status ?? 'all';
    const search = lower(filters.search);
    const statusOk = status === 'all'
      || (status === 'active' && row?.active !== false)
      || (status === 'inactive' && row?.active === false);
    if (year !== 'all' && String(row?.year_level) !== String(year)) return false;
    if (strand !== 'all' && String(row?.strand) !== String(strand)) return false;
    if (exam && !lower(row?.exam_year).includes(exam)) return false;
    if (paper && !lower(row?.paper).includes(paper)) return false;
    if (!statusOk) return false;
    if (!search) return true;
    const hay = [
      row?.question_text,row?.topic,row?.subtopic,row?.skill,row?.exam_year,row?.paper,row?.question_number,
      row?.question_number ? `q${row.question_number}` : '',row?.source_type,row?.source,row?.answer,
      row?.parent_question_number,row?.part_label,row?.group_prompt
    ].map(value=>String(value ?? '')).join(' ').toLowerCase();
    return hay.includes(search);
  }

  function paginateRows(rows,page=1,pageSize=PAGE_SIZE,renderAll=false){
    const list = Array.from(rows || []);
    const size = Math.max(1,Number(pageSize) || PAGE_SIZE);
    if (renderAll){
      return Object.freeze({
        rows:Object.freeze(list.slice()),
        page:1,
        pageSize:size,
        total:list.length,
        totalPages:1,
        start:list.length ? 1 : 0,
        end:list.length,
        renderAll:true
      });
    }
    const totalPages = Math.max(1,Math.ceil(list.length/size));
    const safePage = Math.min(totalPages,Math.max(1,Number(page) || 1));
    const from = (safePage-1)*size;
    const pageRows = list.slice(from,from+size);
    return Object.freeze({
      rows:Object.freeze(pageRows),
      page:safePage,
      pageSize:size,
      total:list.length,
      totalPages,
      start:pageRows.length ? from+1 : 0,
      end:from+pageRows.length,
      renderAll:false
    });
  }

  function currentQuestions(){
    try { if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)) return teacherQuestions; } catch {}
    return [];
  }

  function bulkSelectionCount(rows=currentQuestions()){
    try {
      const selected = ROOT.V51QuestionBankBulkStatus?.buildPlan?.(rows,undefined,false)?.selected;
      return Array.isArray(selected) ? selected.length : 0;
    } catch { return 0; }
  }

  function panelActive(){
    if (typeof document === 'undefined') return false;
    const teacher = document.getElementById('teacher');
    const panel = document.getElementById('questions-panel');
    return !!teacher?.classList?.contains('active') && !!panel?.classList?.contains('active');
  }

  function filterSpec(){
    const value = (id,fallback='') => document.getElementById(id)?.value ?? fallback;
    return {
      search:value('question-search',''),
      year:value('question-year','all'),
      strand:value('question-strand','all'),
      exam:value('question-exam-year',''),
      paper:value('question-paper',''),
      status:value('question-status','all'),
      qa:value('v51b1-qa-filter','all'),
      source:value('v51b1-source-filter','all'),
      review:value('v51b2c-review-filter','all')
    };
  }

  function filteredRows(rows=currentQuestions(),filters=typeof document!=='undefined'?filterSpec():{}){
    const list = Array.from(rows || []);
    const qa = ROOT.V51QuestionBankQA;
    let context = null;
    if (qa?.buildQaContext && (filters.qa !== 'all' || filters.source !== 'all')){
      try { context = qa.buildQaContext(list); } catch {}
    }
    return list.filter(row=>{
      if (!baseRowMatches(row,filters)) return false;
      if ((filters.qa !== 'all' || filters.source !== 'all') && qa?.matchesQaFilter){
        try { if (!qa.matchesQaFilter(row,filters.qa,filters.source,context)) return false; } catch {}
      }
      if (filters.review && filters.review !== 'all' && normalizeReviewStatus(row?.review_status) !== filters.review) return false;
      return true;
    });
  }

  function ensurePager(){
    if (typeof document === 'undefined') return null;
    let root = document.getElementById('v52b1-question-pagination');
    if (root) return root;
    const count = document.getElementById('question-bank-count');
    if (!count) return null;
    root = document.createElement('section');
    root.id = 'v52b1-question-pagination';
    root.className = 'info';
    root.style.marginBottom = '12px';
    count.insertAdjacentElement('afterend',root);
    return root;
  }

  function renderPager(page,totalRows){
    const root = ensurePager();
    if (!root) return;
    if (state.selectionMode){
      root.innerHTML = `<div><strong>Full-scope bulk selection</strong> · all ${page.total} matching row${page.total===1?'':'s'} are rendered for Select all filtered / Select set.</div><div class="help" style="margin-top:5px">Clear the selection to return to ${PAGE_SIZE}-row paging.</div>`;
      return;
    }
    const selected = bulkSelectionCount();
    const manualLocked = selected > 0;
    root.innerHTML = `
      <div class="toolbar" style="justify-content:space-between;gap:8px">
        <button id="v52b1-page-prev" class="outline" type="button" ${page.page<=1 || manualLocked?'disabled':''}>← Previous</button>
        <span><strong>Page ${page.page} of ${page.totalPages}</strong> · up to ${PAGE_SIZE} cards per page${manualLocked?` · ${selected} selected`:''}</span>
        <button id="v52b1-page-next" class="outline" type="button" ${page.page>=page.totalPages || manualLocked?'disabled':''}>Next →</button>
      </div>
      <div class="help" style="margin-top:5px">${manualLocked
        ? `${selected} question${selected===1?' is':'s are'} selected on this page. Clear selection to change page, or use Select all filtered to select the whole current filter without paging.`
        : `${page.total} matching question${page.total===1?'':'s'} from ${totalRows} loaded. Only this page is built in the browser; QA and management decorations finish in a coordinated background pass.`}</div>`;
    root.querySelector('#v52b1-page-prev')?.addEventListener('click',()=>{
      if (bulkSelectionCount()) return;
      state.page=Math.max(1,page.page-1);
      try { renderQuestions(); } catch {}
      document.getElementById('question-bank-count')?.scrollIntoView?.({behavior:'smooth',block:'start'});
    });
    root.querySelector('#v52b1-page-next')?.addEventListener('click',()=>{
      if (bulkSelectionCount()) return;
      state.page=Math.min(page.totalPages,page.page+1);
      try { renderQuestions(); } catch {}
      document.getElementById('question-bank-count')?.scrollIntoView?.({behavior:'smooth',block:'start'});
    });
  }

  function withQuestionSubset(rows,fn){
    let original = null;
    let swapped = false;
    try {
      if (typeof teacherQuestions !== 'undefined' && Array.isArray(teacherQuestions)){
        original = teacherQuestions;
        teacherQuestions = Array.from(rows || []);
        swapped = true;
      }
      return fn();
    } finally {
      if (swapped) teacherQuestions = original;
    }
  }

  function callbackSource(callback){
    try { return Function.prototype.toString.call(callback); } catch { return ''; }
  }

  function refreshCallbackKind(callback){
    if (typeof callback !== 'function') return '';
    const name = callback.name || '';
    const source = callbackSource(callback);
    if (name === 'renderSummary') return 'bulk-status';
    if (name === 'renderAll') return 'review';
    if (name === 'render' && source.includes('buildQaContext')) return 'qa';
    if (name === 'render' && source.includes('buildSetSummaries')) return 'topical-library';
    if (source.includes('applyFocusedCards') && source.includes('render()')) return 'topical-library';
    return '';
  }

  function captureLegacyRefreshes(fn){
    const nativeRaf = ROOT.requestAnimationFrame;
    if (typeof nativeRaf !== 'function') return {result:fn(),captured:[]};
    const captured = [];
    ROOT.requestAnimationFrame = function(callback){
      const kind = refreshCallbackKind(callback);
      if (kind){
        captured.push({kind,callback});
        return -captured.length;
      }
      return nativeRaf.call(ROOT,callback);
    };
    try {
      return {result:fn(),captured};
    } finally {
      ROOT.requestAnimationFrame = nativeRaf;
    }
  }

  function dedupeRefreshes(items){
    const byKind = new Map();
    for (const item of items || []) if (item?.kind && typeof item.callback === 'function') byKind.set(item.kind,item.callback);
    return [...byKind.entries()].map(([kind,callback])=>({kind,callback}));
  }

  function runWhenIdle(callback,delay=0){
    ROOT.setTimeout?.(()=>{
      if (typeof ROOT.requestIdleCallback === 'function'){
        ROOT.requestIdleCallback(()=>callback(),{timeout:450});
      } else {
        callback();
      }
    },delay);
  }

  function schedulePostRenderRefreshes(captured,generation){
    const queue = dedupeRefreshes(captured);
    const order = ['bulk-status','qa','review','topical-library'];
    queue.sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind));

    const safeRun = callback => {
      if (generation !== state.renderGeneration || !panelActive()) return;
      try { callback(); } catch (error){ console.warn('Question Bank background refresh skipped:',error); }
    };

    queue.forEach((item,index)=>{
      if (item.kind === 'bulk-status'){
        ROOT.requestAnimationFrame?.(()=>safeRun(item.callback));
      } else {
        runWhenIdle(()=>safeRun(item.callback),20 + index*24);
      }
    });

    // These modules previously depended on broad/card MutationObservers. The observer
    // gate suppresses those cascades, so refresh them exactly once after the page cards exist.
    runWhenIdle(()=>safeRun(()=>ROOT.V52TopicalActivationGuard?.decorate?.()),70);
    runWhenIdle(()=>safeRun(()=>ROOT.V51MultipartQuestionManagement?.renderGroup?.()),95);
    runWhenIdle(()=>safeRun(()=>ROOT.V51QuestionChangeHistory?.refreshLifecycle?.()),120);
  }

  function updateCount(page,totalRows){
    const count = typeof document!=='undefined' ? document.getElementById('question-bank-count') : null;
    if (!count) return;
    const focus = document.getElementById('v52b-focus');
    if (focus && !focus.classList.contains('hidden')) return;
    if (state.selectionMode){
      count.textContent = `Showing all ${page.total} matching questions of ${totalRows} loaded · full-scope bulk selection`;
    } else if (!page.total){
      count.textContent = `Showing 0 matching questions of ${totalRows} loaded`;
    } else {
      const selected = bulkSelectionCount();
      count.textContent = `Showing ${page.start}–${page.end} of ${page.total} matching questions · ${totalRows} loaded${selected?` · ${selected} selected · page locked`:''}`;
    }
  }

  function scheduleCount(page,totalRows){
    ROOT.requestAnimationFrame?.(()=>ROOT.requestAnimationFrame?.(()=>updateCount(page,totalRows)));
  }

  function optimizedRender(previous,args){
    if (!panelActive()){
      state.pending = true;
      return {deferred:true,page:state.page};
    }
    const allRows = currentQuestions();
    if (state.selectionMode && !state.expandingForExplicitSelection && bulkSelectionCount(allRows) === 0){
      state.selectionMode=false;
      state.page=1;
    }
    const matching = filteredRows(allRows);
    const page = paginateRows(matching,state.page,PAGE_SIZE,state.selectionMode);
    state.page = page.page;
    state.lastFilteredCount = matching.length;
    state.lastTotalCount = allRows.length;
    const generation = ++state.renderGeneration;

    let captured = [];
    let result;
    const execution = withQuestionSubset(page.rows,()=>captureLegacyRefreshes(()=>previous.apply(ROOT,args)));
    if (execution && Object.prototype.hasOwnProperty.call(execution,'result')){
      result = execution.result;
      captured = execution.captured || [];
    } else {
      result = execution;
    }

    renderPager(page,allRows.length);
    updateCount(page,allRows.length);
    scheduleCount(page,allRows.length);
    schedulePostRenderRefreshes(captured,generation);
    state.pending = false;
    return {result,page,totalRows:allRows.length,matchingRows:matching.length,deferred:false,capturedRefreshes:captured.length};
  }

  function scheduleRender(resetPage=false){
    if (resetPage) state.page=1;
    if (state.renderScheduled) return;
    state.renderScheduled=true;
    ROOT.requestAnimationFrame?.(()=>{
      state.renderScheduled=false;
      try { if (typeof renderQuestions==='function') renderQuestions(); } catch {}
    });
  }

  function overrideBaseFilterHandlers(){
    if (typeof document === 'undefined') return;
    ['question-search','question-exam-year','question-paper'].forEach(id=>{
      const node=document.getElementById(id);
      if (node) node.oninput=()=>scheduleRender(true);
    });
    ['question-year','question-strand','question-status'].forEach(id=>{
      const node=document.getElementById(id);
      if (node) node.onchange=()=>scheduleRender(true);
    });
  }

  function beginExplicitSelectionExpansion(){
    state.selectionMode=true;
    state.expandingForExplicitSelection=true;
    state.page=1;
    ROOT.setTimeout?.(()=>{
      state.expandingForExplicitSelection=false;
      scheduleRender(false);
    },80);
  }

  function installInteractionGuards(){
    if (typeof document === 'undefined') return;

    document.addEventListener('click',event=>{
      const tab=event.target?.closest?.('.tab[data-panel]');
      if (tab?.dataset?.panel === 'questions-panel'){
        ROOT.requestAnimationFrame?.(()=>scheduleRender(false));
      }

      if (event.target?.closest?.('#v51b2a-select-visible')){
        beginExplicitSelectionExpansion();
        // Expand synchronously before the established B2A handler reads visible card IDs.
        try { if (panelActive() && typeof renderQuestions==='function') renderQuestions(); } catch {}
      }
      if (event.target?.closest?.('.v52b-select')){
        // V5.2B Select set calls renderQuestions after it resets the filters. Render all matching
        // rows for that explicit bulk action so every row in the set can receive a checkbox.
        beginExplicitSelectionExpansion();
      }
      if (event.target?.closest?.('#v51b2a-clear-selection')){
        ROOT.setTimeout?.(()=>{
          state.selectionMode=false;
          state.expandingForExplicitSelection=false;
          state.page=1;
          scheduleRender(false);
        },0);
      }
    },true);

    document.addEventListener('change',event=>{
      const target=event.target;
      if (target?.classList?.contains('v51b2a-select')){
        ROOT.requestAnimationFrame?.(()=>{
          const checked=document.querySelectorAll('#questions-cards .v51b2a-select:checked').length;
          if (!checked && state.selectionMode){
            state.selectionMode=false;
            state.expandingForExplicitSelection=false;
            state.page=1;
          }
          // Ordinary checkbox selection remains on the current 50-card page. A lightweight
          // re-render updates the pager lock and restores checkbox state from B2A's canonical set.
          scheduleRender(false);
        });
        return;
      }
      if (FILTER_IDS.has(target?.id)) scheduleRender(true);
    },true);

    document.addEventListener('input',event=>{
      if (FILTER_IDS.has(event.target?.id)) scheduleRender(true);
    },true);
  }

  function install(){
    if (typeof document === 'undefined' || ROOT.__v52b1QuestionBankPerformanceInstalled) return;
    const previous = typeof renderQuestions === 'function' ? renderQuestions : null;
    if (!previous) return;
    ROOT.__v52b1QuestionBankPerformanceInstalled=true;
    renderQuestions=function(){ return optimizedRender(previous,arguments); };
    ensurePager();
    overrideBaseFilterHandlers();
    installInteractionGuards();
    // Do not eagerly render here. Teacher login/refresh can populate teacherQuestions while
    // Analytics or another tab is active; the first Question Bank tab open performs the render.
  }

  const api=Object.freeze({
    PAGE_SIZE,normalizeReviewStatus,baseRowMatches,paginateRows,filteredRows,panelActive,bulkSelectionCount,
    refreshCallbackKind,dedupeRefreshes
  });
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined'){
    Object.defineProperty(window,'V52B1QuestionBankPerformance',{value:api,writable:false,configurable:false});
    if (typeof document!=='undefined'){
      if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
      else install();
    }
  }
})();
