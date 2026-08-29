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
