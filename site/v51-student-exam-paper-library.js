/* V5.1C1 — Student Exam Paper Library.
   Student-facing presentation layer over the existing secure Exam Mode selectors.
   It reads only the already-loaded available-paper metadata, keeps the existing
   exam-year/paper controls as the source of truth, and does not change grading,
   access control, publication rules, attempt creation or question loading. */
(() => {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__v51StudentExamPaperLibraryInstalled) return;
  window.__v51StudentExamPaperLibraryInstalled = true;

  const ROOT_ID = 'v51c1-exam-paper-library';
  const STYLE_ID = 'v51c1-exam-paper-library-style';
  let renderQueued = false;

  function html(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}{grid-column:1/-1;margin-top:2px}
      #${ROOT_ID}.hidden{display:none!important}
      #${ROOT_ID} .v51c1-library-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px}
      #${ROOT_ID} .v51c1-library-head h3{margin:0 0 4px;font-size:18px}
      #${ROOT_ID} .v51c1-library-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${ROOT_ID} .v51c1-paper-card{width:100%;min-height:0;text-align:left;border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:16px;padding:14px;display:grid;gap:9px;box-shadow:none}
      #${ROOT_ID} .v51c1-paper-card:hover{border-color:color-mix(in srgb,var(--primary) 55%,var(--border))}
      #${ROOT_ID} .v51c1-paper-card:focus-visible{outline:3px solid color-mix(in srgb,var(--primary) 25%,transparent);outline-offset:2px}
      #${ROOT_ID} .v51c1-paper-card.selected{border-color:var(--primary);background:color-mix(in srgb,var(--soft) 62%,var(--card));box-shadow:0 0 0 1px var(--primary)}
      #${ROOT_ID} .v51c1-paper-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      #${ROOT_ID} .v51c1-paper-title{font-size:17px;font-weight:850;line-height:1.3}
      #${ROOT_ID} .v51c1-paper-meta{display:flex;gap:6px;flex-wrap:wrap}
      #${ROOT_ID} .v51c1-paper-rule{color:var(--muted);font-size:12px;line-height:1.45;font-weight:650}
      #${ROOT_ID} .v51c1-selected-mark{font-size:12px;font-weight:850;color:var(--primary);white-space:nowrap}
      #exam-year-wrap.v51c1-library-source,
      #exam-paper-wrap.v51c1-library-source{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
      @media(max-width:700px){
        #${ROOT_ID} .v51c1-library-grid{grid-template-columns:1fr}
        #${ROOT_ID} .v51c1-paper-card{padding:13px}
      }
    `;
    document.head.appendChild(style);
  }

  function sourceRows(){
    try { return Array.isArray(examMetaRows) ? examMetaRows : []; }
    catch { return []; }
  }

  function currentSetting(yearLevel,examYear,paper){
    try {
      return typeof settingFor === 'function'
        ? (settingFor(yearLevel,examYear,paper) || {})
        : {};
    } catch { return {}; }
  }

  function releaseLabel(rule){
    if (rule === 'after_manual_review') return 'Answers after teacher review';
    if (rule === 'never') return 'Answers not released';
    return 'Answers after submission';
  }

  function groupedPapers(){
    const yearLevel = Number(document.getElementById('year-level')?.value || 6);
    const groups = new Map();
    sourceRows().forEach(row => {
      const examYear = Number(row?.exam_year || 0);
      const paper = String(row?.paper || '').trim();
      if (!examYear || !paper) return;
      const key = `${examYear}|${paper.toLowerCase()}`;
      if (!groups.has(key)) groups.set(key,{examYear,paper,rows:[]});
      groups.get(key).rows.push(row);
    });

    return [...groups.values()].map(group => {
      const logical = new Set(group.rows.map(row => row?.parent_question_number
        ? `g:${String(row.parent_question_number).trim()}`
        : `q:${String(row?.question_number ?? row?.id ?? '').trim()}`));
      const marks = group.rows.reduce((sum,row)=>sum+(Number(row?.marks)||0),0);
      const setting = currentSetting(yearLevel,group.examYear,group.paper);
      return {
        ...group,
        logicalQuestions:logical.size,
        marks,
        duration:Number(setting?.duration_minutes)||null,
        releaseRule:String(setting?.answer_release_rule || 'immediate')
      };
    }).sort((a,b)=>b.examYear-a.examYear || a.paper.localeCompare(b.paper,undefined,{numeric:true}));
  }

  function ensureRoot(){
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    const note = document.getElementById('exam-paper-note');
    const paperWrap = document.getElementById('exam-paper-wrap');
    if (!note && !paperWrap) return null;
    root = document.createElement('section');
    root.id = ROOT_ID;
    root.className = 'hidden';
    root.setAttribute('aria-label','Available exam papers');
    (note || paperWrap).insertAdjacentElement('beforebegin',root);
    return root;
  }

  function examModeVisible(){
    const yearWrap = document.getElementById('exam-year-wrap');
    return !!yearWrap && !yearWrap.classList.contains('hidden');
  }

  function selectPaper(examYear,paper){
    const yearSelect = document.getElementById('exam-year');
    const paperSelect = document.getElementById('exam-paper');
    if (!yearSelect || !paperSelect) return;

    yearSelect.value = String(examYear);
    try {
      if (typeof fillExamPapers === 'function') fillExamPapers(paper);
      else yearSelect.dispatchEvent(new Event('change',{bubbles:true}));
    } catch {
      yearSelect.dispatchEvent(new Event('change',{bubbles:true}));
    }

    paperSelect.value = paper;
    try {
      if (typeof updateExamPaperNote === 'function') updateExamPaperNote();
      else paperSelect.dispatchEvent(new Event('change',{bubbles:true}));
    } catch {
      paperSelect.dispatchEvent(new Event('change',{bubbles:true}));
    }
    renderLibrary();
  }

  function renderLibrary(){
    injectStyles();
    const root = ensureRoot();
    if (!root) return false;

    const papers = groupedPapers();
    const yearWrap = document.getElementById('exam-year-wrap');
    const paperWrap = document.getElementById('exam-paper-wrap');
    const selectedYear = Number(document.getElementById('exam-year')?.value || 0);
    const selectedPaper = String(document.getElementById('exam-paper')?.value || '').trim();
    const visible = examModeVisible();

    root.classList.toggle('hidden',!visible);
    yearWrap?.classList.toggle('v51c1-library-source',visible && papers.length>0);
    paperWrap?.classList.toggle('v51c1-library-source',visible && papers.length>0);

    if (!papers.length){
      root.innerHTML = visible
        ? '<div class="info"><strong>No exam papers are available right now.</strong><br>Your teacher can publish a paper when it is ready.</div>'
        : '';
      return true;
    }

    root.innerHTML = `
      <div class="v51c1-library-head">
        <div>
          <h3>Choose a past paper</h3>
          <div class="help">Only papers currently available for your year are shown.</div>
        </div>
        <span class="tag">${papers.length} available</span>
      </div>
      <div class="v51c1-library-grid">
        ${papers.map(item => {
          const selected = item.examYear===selectedYear && item.paper===selectedPaper;
          const timer = item.duration ? `${item.duration} min` : 'No timer';
          return `<button type="button" class="v51c1-paper-card${selected?' selected':''}" data-exam-year="${html(item.examYear)}" data-paper="${html(item.paper)}" aria-pressed="${selected?'true':'false'}">
            <span class="v51c1-paper-top">
              <span class="v51c1-paper-title">${html(item.examYear)} · ${html(item.paper)}</span>
              <span class="v51c1-selected-mark">${selected?'✓ Selected':'Choose'}</span>
            </span>
            <span class="v51c1-paper-meta">
              <span class="tag">${html(item.logicalQuestions)} questions</span>
              <span class="tag">${html(item.marks)} marks</span>
              <span class="tag">${html(timer)}</span>
            </span>
            <span class="v51c1-paper-rule">${html(releaseLabel(item.releaseRule))}</span>
          </button>`;
        }).join('')}
      </div>`;

    root.querySelectorAll('.v51c1-paper-card').forEach(button => {
      button.addEventListener('click',()=>selectPaper(Number(button.dataset.examYear),button.dataset.paper || ''));
    });
    return true;
  }

  function scheduleRender(){
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(()=>{
      renderQueued = false;
      renderLibrary();
    },0);
  }

  function wrapFunction(name,after){
    try {
      const previous = window[name];
      if (typeof previous !== 'function' || previous.__v51c1Wrapped) return false;
      const wrapped = async function(...args){
        const result = await previous.apply(this,args);
        after();
        return result;
      };
      wrapped.__v51c1Wrapped = true;
      window[name] = wrapped;
      return true;
    } catch { return false; }
  }

  function wire(){
    injectStyles();
    ensureRoot();
    wrapFunction('loadExamOptions',scheduleRender);
    wrapFunction('updateExamPaperNote',scheduleRender);
    document.getElementById('year-level')?.addEventListener('change',scheduleRender);
    document.getElementById('exam-year')?.addEventListener('change',scheduleRender);
    document.getElementById('exam-paper')?.addEventListener('change',scheduleRender);
    document.getElementById('practice-mode-btn')?.addEventListener('click',scheduleRender);
    document.getElementById('exam-mode-btn')?.addEventListener('click',scheduleRender);

    const yearWrap = document.getElementById('exam-year-wrap');
    if (yearWrap){
      new MutationObserver(scheduleRender).observe(yearWrap,{attributes:true,attributeFilter:['class']});
    }
    scheduleRender();
  }

  window.V51StudentExamPaperLibrary = Object.freeze({
    groupedPapers,
    renderLibrary,
    selectPaper,
    releaseLabel
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
