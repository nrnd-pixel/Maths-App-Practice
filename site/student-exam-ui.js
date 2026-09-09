/* Phase 4 — V51 topology-preserving consolidated owner.
   Historical sections are retained byte-for-byte and execute in the
   accepted order at the same loader boundary. */

/* ---- historical owner: v51-student-exam-paper-library.js ---- */
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

/* ---- historical owner: v51-student-exam-resume-progress.js ---- */
/* V5.1C2 — Student Exam Resume & Progress Clarity.
   Presentation-only layer over the existing recoverable Exam Mode snapshot.
   Reads the current device's saved in-progress attempt to make resume state visible.
   It does not create, save, submit, resume, grade or mutate any attempt. */
(() => {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__v51StudentExamResumeProgressInstalled) return;
  window.__v51StudentExamResumeProgressInstalled = true;

  const ROOT_ID = 'v51c2-exam-resume-status';
  const STYLE_ID = 'v51c2-exam-resume-style';
  const ACTIVE_ATTEMPTS_KEY = 'mathV32F1ActiveAttempts';
  let renderQueued = false;

  function esc(value){
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
      #${ROOT_ID}{margin-top:12px}
      #${ROOT_ID}.hidden{display:none!important}
      #${ROOT_ID} .v51c2-resume-card{border:1px solid color-mix(in srgb,var(--primary) 46%,var(--border));background:color-mix(in srgb,var(--soft) 42%,var(--card));border-radius:16px;padding:14px;display:grid;gap:11px}
      #${ROOT_ID} .v51c2-resume-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
      #${ROOT_ID} .v51c2-resume-title{font-size:17px;font-weight:850;line-height:1.35;margin-top:5px}
      #${ROOT_ID} .v51c2-count{font-weight:850;color:var(--primary);white-space:nowrap}
      #${ROOT_ID} .v51c2-progress{height:10px;background:var(--border);border-radius:999px;overflow:hidden}
      #${ROOT_ID} .v51c2-progress>span{display:block;height:100%;background:var(--primary);border-radius:inherit}
      #${ROOT_ID} .v51c2-meta{display:flex;gap:6px;flex-wrap:wrap}
      #${ROOT_ID} .v51c2-help{font-size:12px;color:var(--muted);line-height:1.5;font-weight:600}
      #${ROOT_ID} .v51c2-deadline{color:var(--warn)}
      @media(max-width:700px){
        #${ROOT_ID} .v51c2-resume-card{padding:13px}
      }
    `;
    document.head.appendChild(style);
  }

  function readActiveAttempts(){
    try {
      const parsed = JSON.parse(localStorage.getItem(ACTIVE_ATTEMPTS_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }

  function fallbackNormalize(value){
    return String(value ?? '').trim().toLowerCase().replace(/,/g,'').replace(/°/g,'').replace(/\s+/g,'');
  }

  function identityKey(studentId,studentName,year,examYear,paper){
    try {
      if (typeof attemptIdentityKey === 'function'){
        return attemptIdentityKey(studentId,studentName,year,examYear,paper);
      }
    } catch {}
    return `${fallbackNormalize(studentId || studentName)}|${Number(year)}|${Number(examYear)}|${fallbackNormalize(paper)}`;
  }

  function examModeVisible(){
    const yearWrap = document.getElementById('exam-year-wrap');
    return !!yearWrap && !yearWrap.classList.contains('hidden');
  }

  function currentSelection(){
    const studentId = String(document.getElementById('student-id')?.value || '').trim();
    const studentName = String(document.getElementById('student-name')?.value || '').trim();
    const year = Number(document.getElementById('year-level')?.value || 6);
    const examYear = Number(document.getElementById('exam-year')?.value || 0);
    const paper = String(document.getElementById('exam-paper')?.value || '').trim();
    if ((!studentId && !studentName) || !examYear || !paper) return null;
    return {studentId,studentName,year,examYear,paper};
  }

  function currentAttemptSnapshot(){
    const selection = currentSelection();
    if (!selection) return null;
    const key = identityKey(selection.studentId,selection.studentName,selection.year,selection.examYear,selection.paper);
    const snapshot = readActiveAttempts()[key] || null;
    if (!snapshot || (snapshot.status && snapshot.status !== 'in_progress')) return null;
    return {key,selection,snapshot};
  }

  function safeDate(value){
    const ms = Date.parse(value || '');
    return Number.isFinite(ms) ? ms : null;
  }

  function savedLabel(value){
    const ms = safeDate(value);
    if (ms == null) return 'Saved on this device';
    const when = new Date(ms);
    const sameDay = new Date().toDateString() === when.toDateString();
    return sameDay
      ? `Saved ${when.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`
      : `Saved ${when.toLocaleDateString([], {day:'numeric',month:'short'})}`;
  }

  function timerState(snapshot,now=Date.now()){
    const deadline = safeDate(snapshot?.deadlineAt);
    if (deadline != null){
      const remaining = deadline - now;
      if (remaining <= 0) return {label:'Saved deadline reached',expired:true};
      const minutes = Math.max(1,Math.ceil(remaining/60000));
      return {label:`${minutes} min remaining`,expired:false};
    }
    if (Number(snapshot?.durationMinutes) > 0) return {label:'Timed attempt',expired:false};
    return {label:'No timer',expired:false};
  }

  function resumeSummary(snapshot,now=Date.now()){
    const total = Math.max(0,Number(snapshot?.questionCount)||0);
    const answered = Math.min(total || Number.MAX_SAFE_INTEGER,Math.max(0,Number(snapshot?.answeredItems)||0));
    const flags = Array.isArray(snapshot?.flags) ? snapshot.flags.length : 0;
    const current = total ? Math.min(total,Math.max(1,(Number(snapshot?.index)||0)+1)) : Math.max(1,(Number(snapshot?.index)||0)+1);
    const percent = total ? Math.round((answered/total)*100) : 0;
    return {
      total,
      answered,
      flags,
      current,
      percent,
      saved:savedLabel(snapshot?.lastSavedAt),
      timer:timerState(snapshot,now)
    };
  }

  function ensureRoot(){
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    const library = document.getElementById('v51c1-exam-paper-library');
    const note = document.getElementById('exam-paper-note');
    if (!library && !note) return null;
    root = document.createElement('section');
    root.id = ROOT_ID;
    root.className = 'hidden';
    root.setAttribute('aria-label','Saved exam progress');
    if (library) library.insertAdjacentElement('afterend',root);
    else note.insertAdjacentElement('beforebegin',root);
    return root;
  }

  function setStartButtonState(attempt){
    const button = document.getElementById('start-btn');
    if (!button || !examModeVisible()) return;
    if (!attempt){
      button.textContent = 'Start Exam';
      button.removeAttribute('aria-label');
      return;
    }
    const summary = resumeSummary(attempt.snapshot);
    const action = summary.timer.expired ? 'Recover Exam' : 'Continue Exam';
    button.textContent = action;
    button.setAttribute('aria-label',`${action}: ${attempt.selection.examYear} ${attempt.selection.paper}`);
  }

  function renderResumeStatus(){
    injectStyles();
    const root = ensureRoot();
    if (!root) return false;

    const visible = examModeVisible();
    const attempt = visible ? currentAttemptSnapshot() : null;
    root.classList.toggle('hidden',!visible || !attempt);
    setStartButtonState(attempt);

    if (!visible || !attempt){
      root.innerHTML = '';
      return true;
    }

    const {selection,snapshot} = attempt;
    const summary = resumeSummary(snapshot);
    const timerClass = summary.timer.expired ? ' v51c2-deadline' : '';
    const countText = summary.total ? `${summary.answered}/${summary.total} answered` : `${summary.answered} answered`;

    root.innerHTML = `
      <div class="v51c2-resume-card" role="status" aria-live="polite">
        <div class="v51c2-resume-head">
          <div>
            <span class="tag status-active">↻ Resume available</span>
            <div class="v51c2-resume-title">Continue ${esc(selection.examYear)} · ${esc(selection.paper)}</div>
          </div>
          <span class="v51c2-count">${esc(countText)}</span>
        </div>
        ${summary.total ? `<div class="v51c2-progress" role="progressbar" aria-label="Exam questions answered" aria-valuemin="0" aria-valuemax="${esc(summary.total)}" aria-valuenow="${esc(summary.answered)}"><span style="width:${esc(summary.percent)}%"></span></div>` : ''}
        <div class="v51c2-meta">
          <span class="tag">${esc(summary.saved)}</span>
          <span class="tag">Question ${esc(summary.current)}${summary.total?` of ${esc(summary.total)}`:''}</span>
          <span class="tag">${esc(summary.flags)} flagged</span>
          <span class="tag${timerClass}">${esc(summary.timer.label)}</span>
        </div>
        <div class="v51c2-help">This device has recovery details for the unfinished paper. Continue using the normal Exam Mode button; the existing secure resume and autosave checks still apply.</div>
      </div>`;
    return true;
  }

  function scheduleRender(){
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(()=>{
      renderQueued = false;
      renderResumeStatus();
    },0);
  }

  function wire(){
    injectStyles();
    ensureRoot();
    ['student-id','student-name','year-level','exam-year','exam-paper'].forEach(id=>{
      const node = document.getElementById(id);
      node?.addEventListener('input',scheduleRender);
      node?.addEventListener('change',scheduleRender);
    });
    document.getElementById('practice-mode-btn')?.addEventListener('click',scheduleRender);
    document.getElementById('exam-mode-btn')?.addEventListener('click',scheduleRender);
    window.addEventListener('storage',event=>{
      if (event.key === ACTIVE_ATTEMPTS_KEY) scheduleRender();
    });

    const library = document.getElementById('v51c1-exam-paper-library');
    if (library) new MutationObserver(scheduleRender).observe(library,{childList:true,subtree:true,attributes:true});
    const yearWrap = document.getElementById('exam-year-wrap');
    if (yearWrap) new MutationObserver(scheduleRender).observe(yearWrap,{attributes:true,attributeFilter:['class']});

    // The Exam engine writes local recovery state in the same tab. Storage events do not
    // fire back into that same tab, so refresh immediately when an unfinished Exam returns
    // to the start screen instead of waiting for another selector change or the timer poll.
    const startScreen = document.getElementById('start');
    if (startScreen) new MutationObserver(scheduleRender).observe(startScreen,{attributes:true,attributeFilter:['class']});

    // Registered-student verification updates identity fields programmatically. Observe the
    // existing access-status surface as an additional presentation-only refresh signal.
    const accessNote = document.getElementById('student-access-note');
    if (accessNote) new MutationObserver(scheduleRender).observe(accessNote,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});

    window.addEventListener('pageshow',scheduleRender);
    window.addEventListener('focus',scheduleRender);
    document.addEventListener('visibilitychange',()=>{
      if (!document.hidden) scheduleRender();
    });

    setInterval(scheduleRender,60000);
    scheduleRender();
  }

  window.V51StudentExamResumeProgress = Object.freeze({
    readActiveAttempts,
    identityKey,
    currentAttemptSnapshot,
    timerState,
    resumeSummary,
    renderResumeStatus
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
})();
